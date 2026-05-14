/**
 * Task #135 — Worker diario que avisa por email quando uma clinica esta
 * perto do vencimento da carencia LGPD de exclusao.
 *
 * Por que existe:
 *   Hoje a janela de 30 dias (status='EXCLUIDO_PENDENTE' +
 *   exclusao_carencia_ate) roda em silencio. O platform_owner tem que
 *   voltar manualmente em /plataforma/clinicas pra ver o countdown. Se
 *   ninguem olhar, o worker exclusaoCarenciaExecutor (Wave 13 F4) faz a
 *   exclusao automatica quando vencer — OU pior, recusa a exclusao
 *   silenciosamente porque nao tem lgpd_export_url. Email diario com
 *   janelas criticas (7d, 3d, 1d, vencido sem export) cobre esse buraco.
 *
 * Comportamento:
 *   - Tick interno: 1h. Lock distribuido pg_try_advisory_lock(13030247).
 *   - Janela funcional: 08:00-22:00 BRT (evita madrugada).
 *   - Pra cada unidade EXCLUIDO_PENDENTE com exclusao_carencia_ate setado:
 *       * dias_restantes = ceil((exclusao_carencia_ate - now()) / 1d)
 *       * Se dias_restantes IN (7, 3, 1)              -> AVISO_<N>D
 *       * Se exclusao_carencia_ate <= now()
 *           AND lgpd_export_url IS NULL                -> VENCIDO_SEM_EXPORT
 *         (worker exclusaoCarenciaExecutor recusa apagar nesse caso —
 *          alguem tem que rodar o export manualmente)
 *   - Destinatarios: mesma regra do email de suspensao
 *     (coletarDestinatarios) — emails institucionais da unidade +
 *     usuarios ATIVOS com perfil_plataforma IN ('platform_owner',
 *     'tenant_admin') OU perfil legado validador_mestre/consultoria_master.
 *   - Idempotencia: UNIQUE (unidade_id, tipo_aviso, dia_brt) na tabela
 *     notif_carencia_lgpd_clinica_envios (Migration 051). Re-run no mesmo
 *     dia BRT = no-op.
 *   - Defensivo: nunca lanca, log + segue. Falha de email registra
 *     status='ERRO'/'PARCIAL' mas mantem UNIQUE pra nao reentrar no mesmo
 *     dia (rerun manual no dia seguinte).
 */
import { db, unidadesTable, type Unidade } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";
import { coletarDestinatarios } from "../email/clinicaSuspensao";
import { enviarWhatsapp } from "../../services/whatsappService";

const TICK_MS = 60 * 60 * 1000; // 1h
// Familia 130302xx ja usada por Wave 13 F3/F4: 13030245 (carenciaLgpd2fa)
// e 13030246 (exclusaoCarenciaExecutor). Pegamos o proximo livre: 13030247.
const ADVISORY_LOCK_ID = 13030247;
const HORA_MIN_BRT = 8;
const HORA_MAX_BRT = 22;
const FROM_LABEL = "PAWARDS - Plataforma";
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";

// Task #258 — fallback igual aos workers Task #146 (avisoExpiracao2faOwner)
// e Task #194 (alertaBruteForceRetryEnvio) quando o platform_owner ainda
// nao tem `usuarios.telefone` cadastrado.
function ceoWhatsappEnv(): string {
  return process.env["CEO_WHATSAPP"] || "";
}

let executandoAgora = false;
let workerStarted = false;

type TipoAviso = "AVISO_7D" | "AVISO_3D" | "AVISO_1D" | "VENCIDO_SEM_EXPORT";

interface UnidadePendente {
  id: number;
  exclusao_carencia_ate: Date;
  lgpd_export_url: string | null;
}

function hojeBrtISO(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function horaBrt(): number {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.getUTCHours();
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailRaw(to: string, subject: string, html: string): string {
  const parts = [
    `From: ${FROM_LABEL} <${sanitizeHeader(FROM_ADDR)}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

function dataPtBr(d: Date | null | undefined): string {
  if (!d) return "data nao registrada";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function urlPlataformaClinicas(opts?: { gerarExportUnidadeId?: number }): string {
  const base =
    process.env["PUBLIC_APP_URL"] ||
    (process.env["REPLIT_DOMAINS"]
      ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]?.trim() ?? ""}`
      : "");
  // Task #259 — quando o aviso eh VENCIDO_SEM_EXPORT, anexamos
  // ?gerar_export=<id> pra que a tela /plataforma/clinicas role ate a
  // linha da unidade e abra direto o prompt de export LGPD, economizando
  // cliques no momento critico em que o exclusaoCarenciaExecutor esta
  // bloqueado esperando o lgpd_export_url ser populado.
  const id = opts?.gerarExportUnidadeId;
  const qs = id ? `?gerar_export=${encodeURIComponent(String(id))}` : "";
  return `${base}/plataforma/clinicas${qs}`;
}

function calcularDiasRestantes(carenciaAte: Date): number {
  const diffMs = carenciaAte.getTime() - Date.now();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function classificarAviso(opts: {
  diasRestantes: number;
  temExport: boolean;
}): TipoAviso | null {
  const { diasRestantes, temExport } = opts;
  if (diasRestantes <= 0 && !temExport) return "VENCIDO_SEM_EXPORT";
  if (diasRestantes === 7) return "AVISO_7D";
  if (diasRestantes === 3) return "AVISO_3D";
  if (diasRestantes === 1) return "AVISO_1D";
  return null;
}

function htmlAvisoCarencia(opts: {
  unidadeNome: string;
  tipo: TipoAviso;
  diasRestantes: number;
  carenciaAte: Date;
  temExport: boolean;
  url: string;
}): string {
  const { unidadeNome, tipo, diasRestantes, carenciaAte, temExport, url } = opts;
  const vencido = tipo === "VENCIDO_SEM_EXPORT";
  const cor = vencido ? "#7d1d2e" : diasRestantes <= 1 ? "#7d1d2e" : "#d97a3c";
  const titulo = vencido
    ? "Carencia LGPD VENCIDA — exclusao bloqueada (sem export)"
    : `Carencia LGPD da clinica vence em ${diasRestantes} dia(s)`;
  const intro = vencido
    ? `A carencia de 30 dias da clinica <strong>${escapeHtml(unidadeNome)}</strong>
       venceu em <strong>${escapeHtml(dataPtBr(carenciaAte))}</strong>, mas a
       exclusao automatica foi <strong>bloqueada</strong> porque a clinica nao
       tem export LGPD gerado (campo <code>lgpd_export_url</code> vazio).
       Enquanto isso nao for resolvido, a clinica fica em
       <code>EXCLUIDO_PENDENTE</code> indefinidamente.`
    : `A clinica <strong>${escapeHtml(unidadeNome)}</strong> esta agendada pra
       <strong>exclusao definitiva</strong> em
       <strong>${escapeHtml(dataPtBr(carenciaAte))}</strong>
       (faltam <strong>${diasRestantes} dia(s)</strong>). Apos esse prazo, o
       worker de carencia LGPD executa a exclusao automaticamente.`;
  const acoes = vencido
    ? `<ul>
         <li><strong>Gerar o export LGPD da clinica</strong> (acao manual no
             painel) — sem isso, o worker nao apaga.</li>
         <li>OU <strong>cancelar a exclusao agendada</strong> se houve
             reconsideracao.</li>
       </ul>`
    : `<ul>
         <li><strong>Cancelar a exclusao agendada</strong> se houve
             reconsideracao.</li>
         <li>OU <strong>gerar o export LGPD</strong> agora pra garantir que a
             exclusao automatica acontece no prazo${
               temExport
                 ? " (export ja gerado — exclusao seguira normalmente)"
                 : " (sem export, o worker recusa apagar)"
             }.</li>
       </ul>`;
  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#1a1a2e;background:#f5f5f5;padding:20px">
<div style="max-width:640px;margin:0 auto;background:#fff;padding:30px;border-left:4px solid ${cor}">
  <h2 style="margin:0 0 16px 0;color:${cor};border-bottom:2px solid ${cor};padding-bottom:8px">
    [PAWARDS] ${escapeHtml(titulo)}
  </h2>
  <p>Prezado(a) responsavel,</p>
  <p>${intro}</p>
  <p style="background:#f5f1e8;padding:12px;border-left:4px solid ${cor};margin:20px 0">
    <strong>Acoes possiveis:</strong>
    ${acoes}
  </p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(url)}"
       style="background:#3a4a5a;color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">
      Abrir painel /plataforma/clinicas
    </a>
  </p>
  <p style="font-size:12px;color:#666;margin-top:30px;border-top:1px solid #ddd;padding-top:8px">
    Este e um email automatico do motor de governanca PAWARDS (Task #135).
    Voce so recebe 1 aviso por janela critica (7d, 3d, 1d, vencido sem export)
    por dia BRT. Nao responda.
  </p>
</div>
</body></html>`;
}

function textoWhatsapp(opts: {
  unidadeNome: string;
  tipo: TipoAviso;
  diasRestantes: number;
  carenciaAte: Date;
  url: string;
}): string {
  const cabec =
    opts.tipo === "VENCIDO_SEM_EXPORT"
      ? `[PAWARDS] Carencia LGPD VENCIDA sem export — clinica ${opts.unidadeNome}`
      : `[PAWARDS] Carencia LGPD da clinica ${opts.unidadeNome} vence em ${opts.diasRestantes}d`;
  const corpo =
    opts.tipo === "VENCIDO_SEM_EXPORT"
      ? `Carencia venceu em ${dataPtBr(opts.carenciaAte)} sem export LGPD gerado — exclusao automatica BLOQUEADA. Gere o export ou cancele a exclusao.`
      : `Exclusao definitiva agendada pra ${dataPtBr(opts.carenciaAte)} (faltam ${opts.diasRestantes} dia(s)).`;
  return [cabec, "", corpo, "", `Painel: ${opts.url}`].join("\n");
}

/**
 * Task #258 — Resolve telefones do CEO (platform_owner / validador_mestre
 * com `usuarios.telefone` cadastrado), respeitando a preferencia de canal
 * `canais_aviso_carencia_lgpd` (Migration 061): so retorna telefone de
 * owner que mantem 'whatsapp' nessa coluna. Default DB
 * '{email,whatsapp}' garante comportamento opt-in pra owners legados.
 * Array vazio (owner desligou WhatsApp explicitamente) = MUDO pra esse
 * owner — mesmo padrao da Task #146/#159 (canais_aviso_2fa).
 *
 * Fallback CEO_WHATSAPP env var so dispara quando NENHUM owner com
 * preferencia ativa pra WhatsApp foi resolvido (ex: ambiente recem-bootado
 * sem usuarios cadastrados ainda). A env var em si eh tratada como
 * "opt-in operacional" (quem setou sabe o que esta fazendo).
 *
 * Mesma estrutura de `escalonarWhatsappCEO` em alertaBruteForceRetryEnvio
 * (Task #194), mas com gating de preferencia adicionado.
 */
async function resolverTelefonesCeo(): Promise<string[]> {
  const ownerRows: any = await db.execute(sql`
    SELECT telefone, canais_aviso_carencia_lgpd
      FROM usuarios
     WHERE ativo = true
       AND (perfil_plataforma = 'platform_owner' OR perfil = 'validador_mestre')
  `);
  const linhas: {
    telefone: string | null;
    canais_aviso_carencia_lgpd: string[] | null;
  }[] = ownerRows.rows ?? ownerRows;
  const set = new Set<string>();
  for (const r of linhas) {
    // Distincao critica (mesma da Task #146):
    //   - NULL/undefined (row de DB pre-Migration 061, improvavel ja que
    //     a coluna eh NOT NULL DEFAULT, mas defensivo) -> default
    //     ['email','whatsapp'] pra preservar a intencao da Task #258.
    //   - [] (array vazio explicito) -> MUDO; owner desligou WhatsApp
    //     pra este dominio conscientemente.
    const canais = Array.isArray(r.canais_aviso_carencia_lgpd)
      ? r.canais_aviso_carencia_lgpd
      : ["email", "whatsapp"];
    if (!canais.includes("whatsapp")) continue;
    const t = (r.telefone ?? "").replace(/\D/g, "");
    if (t.length >= 10) set.add(t);
  }
  if (set.size === 0) {
    const fallback = ceoWhatsappEnv().replace(/\D/g, "");
    if (fallback.length >= 10) set.add(fallback);
  }
  return Array.from(set);
}

function assuntoEmail(opts: {
  unidadeNome: string;
  tipo: TipoAviso;
  diasRestantes: number;
}): string {
  if (opts.tipo === "VENCIDO_SEM_EXPORT") {
    return `[PAWARDS] Carencia LGPD VENCIDA sem export — clinica ${opts.unidadeNome}`;
  }
  return `[PAWARDS] Carencia LGPD vence em ${opts.diasRestantes}d — clinica ${opts.unidadeNome}`;
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const hora = horaBrt();
    if (hora < HORA_MIN_BRT || hora >= HORA_MAX_BRT) return;

    const lockResult: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((lockResult.rows ?? lockResult)[0] || {}).got);
    if (!lockOk) return;

    const dia = hojeBrtISO();

    // Pega TODAS as EXCLUIDO_PENDENTE com carencia setada — a classificacao
    // de janela critica acontece em memoria (so 4 valores possiveis: 7, 3, 1
    // ou vencido_sem_export). Sem hot path porque o universo e <10 unidades
    // tipicamente.
    const result: any = await db.execute(sql`
      SELECT id, exclusao_carencia_ate, lgpd_export_url
        FROM unidades
       WHERE status = 'EXCLUIDO_PENDENTE'
         AND exclusao_carencia_ate IS NOT NULL
    `);
    const pendentes: UnidadePendente[] = result.rows ?? result;
    if (pendentes.length === 0) return;

    // Task #258 — Resolve telefones do CEO uma unica vez por tick (em vez
    // de N vezes por unidade pendente). Defensivo: erro na resolucao NAO
    // bloqueia o INSERT do email; cai no caminho "sem telefone resolvido"
    // (canal_whatsapp_ok=false + whatsapp_erro registrando o motivo).
    // Nota rebase Task #259: a chamada de `urlPlataformaClinicas()` saiu
    // daqui pra dentro do loop (precisa do unidadeId pro deeplink de
    // VENCIDO_SEM_EXPORT). O texto do WhatsApp usa o `url` per-unidade
    // calculado abaixo.
    let telefonesCeoTick: string[] = [];
    let erroResolucaoTelefones: string | null = null;
    try {
      telefonesCeoTick = await resolverTelefonesCeo();
    } catch (e: any) {
      erroResolucaoTelefones = (e?.message ?? String(e)).slice(0, 500);
      logger.warn(
        { err: erroResolucaoTelefones },
        "[aviso-vencimento-carencia-lgpd] falha ao resolver telefones do CEO; whatsapp pulado",
      );
    }

    for (const u of pendentes) {
      const carenciaAte = new Date(u.exclusao_carencia_ate);
      const diasRestantes = calcularDiasRestantes(carenciaAte);
      const temExport = Boolean(u.lgpd_export_url);
      const tipo = classificarAviso({ diasRestantes, temExport });
      if (!tipo) continue;
      // Task #259 — pra VENCIDO_SEM_EXPORT, link do email leva direto pra
      // tela com deeplink que abre o prompt de export LGPD da clinica.
      const url = urlPlataformaClinicas(
        tipo === "VENCIDO_SEM_EXPORT" ? { gerarExportUnidadeId: u.id } : undefined,
      );

      // Idempotencia: pula se ja enviou esse tipo_aviso pra essa unidade
      // hoje BRT. UNIQUE (unidade_id, tipo_aviso, dia_brt) garante isso no
      // INSERT, mas checamos antes pra evitar montar email + buscar
      // destinatarios a toa.
      const jaEnviado: any = await db.execute(sql`
        SELECT 1
          FROM notif_carencia_lgpd_clinica_envios
         WHERE unidade_id = ${u.id}
           AND tipo_aviso = ${tipo}
           AND dia_brt = ${dia}::date
         LIMIT 1
      `);
      if (((jaEnviado.rows ?? jaEnviado) as unknown[]).length > 0) continue;

      // Carrega a unidade completa pro coletarDestinatarios (precisa dos
      // emails institucionais).
      const [unidadeFull] = await db
        .select()
        .from(unidadesTable)
        .where(eq(unidadesTable.id, u.id));
      if (!unidadeFull) continue;
      const unidade: Unidade = unidadeFull;

      let destinatarios: string[] = [];
      try {
        destinatarios = await coletarDestinatarios(u.id, unidade);
      } catch (e: any) {
        logger.warn(
          { unidadeId: u.id, err: e?.message ?? String(e) },
          "[aviso-vencimento-carencia-lgpd] falha ao coletar destinatarios",
        );
      }

      const subject = assuntoEmail({
        unidadeNome: unidade.nome,
        tipo,
        diasRestantes,
      });
      const html = htmlAvisoCarencia({
        unidadeNome: unidade.nome,
        tipo,
        diasRestantes,
        carenciaAte,
        temExport,
        url,
      });

      let enviados = 0;
      let falhas = 0;
      let erroResumo: string | null = null;

      if (destinatarios.length > 0) {
        let gmail;
        try {
          gmail = await getGmailClient();
        } catch (e: any) {
          erroResumo = `gmail client indisponivel: ${e?.message ?? String(e)}`;
          falhas = destinatarios.length;
          logger.error(
            { unidadeId: u.id, err: erroResumo },
            "[aviso-vencimento-carencia-lgpd] gmail indisponivel",
          );
        }
        if (gmail) {
          for (const to of destinatarios) {
            try {
              const raw = buildEmailRaw(to, subject, html);
              await gmail.users.messages.send({
                userId: "me",
                requestBody: { raw },
              });
              enviados++;
            } catch (e: any) {
              falhas++;
              const msg = e?.message ?? String(e);
              if (!erroResumo) erroResumo = msg.slice(0, 500);
              logger.warn(
                { unidadeId: u.id, to, err: msg },
                "[aviso-vencimento-carencia-lgpd] falha ao enviar email",
              );
            }
          }
        }
      } else {
        erroResumo = "sem destinatarios resolvidos pra unidade";
        logger.warn(
          { unidadeId: u.id, nome: unidade.nome, tipo },
          "[aviso-vencimento-carencia-lgpd] nenhum destinatario — registrando ERRO",
        );
      }

      const status: "OK" | "ERRO" | "PARCIAL" =
        destinatarios.length === 0
          ? "ERRO"
          : falhas === 0
            ? "OK"
            : enviados === 0
              ? "ERRO"
              : "PARCIAL";

      // Task #258 — WhatsApp best-effort pro telefone do platform_owner
      // (mesmo padrao das Tasks #146 e #194). NUNCA bloqueia idempotencia
      // do email: a falha de WhatsApp so vira coluna de auditoria
      // (canal_whatsapp_ok / whatsapp_*). O UNIQUE
      // (unidade_id, tipo_aviso, dia_brt) continua valendo independente
      // do resultado WhatsApp.
      const telefonesCeo = telefonesCeoTick;
      let whatsappEnviados = 0;
      let whatsappFalhas = 0;
      let whatsappErroResumo: string | null = null;
      if (telefonesCeo.length === 0) {
        whatsappErroResumo =
          erroResolucaoTelefones !== null
            ? `falha ao resolver telefones do CEO: ${erroResolucaoTelefones}`
            : "sem telefone do CEO resolvido (usuarios.telefone vazio ou whatsapp desligado em canais_aviso_carencia_lgpd; CEO_WHATSAPP env nao setado)";
      } else {
        const texto = textoWhatsapp({
          unidadeNome: unidade.nome,
          tipo,
          diasRestantes,
          carenciaAte,
          url,
        });
        for (const tel of telefonesCeo) {
          try {
            const r = await enviarWhatsapp(tel, texto);
            if (r.sucesso) {
              whatsappEnviados++;
            } else {
              whatsappFalhas++;
              if (!whatsappErroResumo && r.erro) {
                whatsappErroResumo = String(r.erro).slice(0, 500);
              }
              logger.warn(
                { unidadeId: u.id, tel, erro: r.erro },
                "[aviso-vencimento-carencia-lgpd] whatsapp retornou falha",
              );
            }
          } catch (e: any) {
            whatsappFalhas++;
            const msg = e?.message ?? String(e);
            if (!whatsappErroResumo) whatsappErroResumo = msg.slice(0, 500);
            logger.warn(
              { unidadeId: u.id, tel, err: msg },
              "[aviso-vencimento-carencia-lgpd] excecao ao enviar whatsapp",
            );
          }
        }
      }
      const canalWhatsappOk =
        telefonesCeo.length > 0 && whatsappEnviados > 0;

      try {
        await db.execute(sql`
          INSERT INTO notif_carencia_lgpd_clinica_envios
            (unidade_id, dia_brt, tipo_aviso, dias_restantes,
             destinatarios, total_destinatarios, enviados, falhas,
             status, erro,
             whatsapp_destinatarios, whatsapp_total_destinatarios,
             whatsapp_enviados, whatsapp_falhas, whatsapp_erro,
             canal_whatsapp_ok)
          VALUES
            (${u.id}, ${dia}::date, ${tipo}, ${diasRestantes},
             ${destinatarios}::text[], ${destinatarios.length},
             ${enviados}, ${falhas}, ${status}, ${erroResumo},
             ${telefonesCeo}::text[], ${telefonesCeo.length},
             ${whatsappEnviados}, ${whatsappFalhas}, ${whatsappErroResumo},
             ${canalWhatsappOk})
          ON CONFLICT (unidade_id, tipo_aviso, dia_brt) DO NOTHING
        `);
      } catch (e: any) {
        logger.error(
          { unidadeId: u.id, tipo, err: e?.message ?? String(e) },
          "[aviso-vencimento-carencia-lgpd] falha ao registrar envio",
        );
      }

      logger.info(
        {
          unidadeId: u.id,
          nome: unidade.nome,
          tipo,
          diasRestantes,
          enviados,
          falhas,
          status,
          whatsappTotal: telefonesCeo.length,
          whatsappEnviados,
          whatsappFalhas,
          canalWhatsappOk,
        },
        "[aviso-vencimento-carencia-lgpd] aviso processado",
      );
    }
  } catch (e: any) {
    logger.error(
      { err: e?.message ?? String(e) },
      "[aviso-vencimento-carencia-lgpd] tick falhou",
    );
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch {
        // ignore
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerAvisoVencimentoCarenciaLgpd(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    { tickMs: TICK_MS },
    "[aviso-vencimento-carencia-lgpd] worker iniciado",
  );
  setTimeout(() => {
    void tick();
  }, 60_000);
  setInterval(() => {
    void tick();
  }, TICK_MS).unref();
}

/** Disparo manual pra testes / rerun manual. */
export async function rodarAvisoVencimentoCarenciaLgpdAgora(): Promise<void> {
  await tick();
}
