/**
 * Task #146 · Worker periodico que avisa o platform_owner por email +
 * WhatsApp quando a janela de 8h do 2FA esta para expirar (~15min antes).
 *
 * Por que existe:
 *   O banner discreto da Task #130 (Platform2faExpiryBanner.tsx) so aparece
 *   se o owner tiver uma aba do /plataforma/* aberta. Quando ele esta longe
 *   do navegador (almoco, reuniao, fora do escritorio), nao ve o aviso e
 *   volta com a janela ja expirada — descobrindo via 403 no meio de uma
 *   acao destrutiva. Email/WhatsApp cobre esse buraco com antecedencia real.
 *
 * Comportamento:
 *   - Tick 5min (lock distribuido pg_try_advisory_lock(30303034)).
 *   - Varre `usuarios` com perfil_plataforma='platform_owner' AND ativo=true
 *     AND ultimo_login_2fa_em ENTRE (now-8h) e (now-7h45min) — janela de
 *     15min (a antecedencia inteira do task) que cobre 3 ticks consecutivos
 *     sem buraco. A idempotencia por sessao (ultimo_aviso_2fa_em <
 *     ultimo_login_2fa_em) garante que so 1 envio sai por janela de 8h
 *     mesmo com a janela varrida sendo larga.
 *   - Idempotencia por janela ativa: so envia se ultimo_aviso_2fa_em IS NULL
 *     OR ultimo_aviso_2fa_em < ultimo_login_2fa_em (1 aviso por janela 8h).
 *   - Email obrigatorio (Gmail), WhatsApp best-effort (so se CEO_WHATSAPP
 *     env var existir — owner pode ainda nao ter cadastrado celular).
 *   - Defensivo: nunca lanca, log + segue. Mesmo se email falhar, gravamos
 *     ultimo_aviso_2fa_em pra evitar reentrar e spammar — o banner in-app
 *     continua sendo o fallback se ele abrir o painel.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";
import { enviarWhatsapp } from "../../services/whatsappService";
import { enviarTelegramCEO, temConfigTelegram } from "../../services/telegramService";

const TICK_MS = 5 * 60 * 1000; // 5min
// IDs ja em uso na familia 30303xxx: 30303030 (parqStatus), 30303031
// (alertaCEO + verificarPdfsCofre — colisao pre-existente, nao deste task),
// 30303032 (relatorioDiarioCEO + pdfRetryUploadResumoDiario), 30303033
// (alertaKillSwitchEmailsCEO). Pegamos o proximo livre: 30303034.
const ADVISORY_LOCK_ID = 30303034;
const JANELA_2FA_MIN = 8 * 60; // 480min = 8h
const ANTECEDENCIA_MIN = 15; // avisar ~15min antes
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";
const CEO_WHATSAPP = process.env["CEO_WHATSAPP"] || "";

let executandoAgora = false;
let workerStarted = false;

interface OwnerCandidato {
  id: number;
  nome: string;
  email: string;
  ultimo_login_2fa_em: Date;
  // Task #159 — preferencia de canais por owner. Default DB: ['email','whatsapp'].
  // Array vazio = mudo (so o banner in-app da Task #130 avisa).
  canais_aviso_2fa: string[];
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const parts = [
    `From: PAWARDS - Seguranca Plataforma <${FROM_ADDR}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function urlPlataforma(): string {
  const base =
    process.env["PUBLIC_APP_URL"] ||
    (process.env["REPLIT_DOMAINS"]
      ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]?.trim() ?? ""}`
      : "");
  return `${base}/plataforma`;
}

function montarHtml(opts: {
  nome: string;
  minutosRestantes: number;
  url: string;
}): string {
  return `<!DOCTYPE html>
<html><body style="font-family:JetBrains Mono,monospace;color:#1a1a1a;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;border-left:4px solid #d97a3c">
  <h2 style="margin:0 0 16px 0;color:#d97a3c">[PAWARDS] Seu 2FA do painel /plataforma expira em ~${opts.minutosRestantes}min</h2>
  <p>Ola ${escapeHtml(opts.nome)},</p>
  <p>A janela de 8h do seu 2FA esta prestes a expirar. Se voce esta no meio
  de algo (suspensao de unidade, exclusao, promocao de admin) ou pretende
  voltar pro painel logo, renove agora pra nao ser interrompido.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(opts.url)}"
       style="background:#3a4a5a;color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">
      Renovar 2FA agora
    </a>
  </p>
  <p style="color:#666;font-size:12px;margin-top:30px">Este e um email automatico
  do motor de seguranca PAWARDS (Task #146). Voce so recebe 1 aviso por
  sessao de 8h. Nao responda.</p>
</div>
</body></html>`;
}

function montarTextoWhatsapp(opts: { minutosRestantes: number; url: string }): string {
  return [
    `[PAWARDS] Seu 2FA do painel /plataforma expira em ~${opts.minutosRestantes}min.`,
    `Renove agora em: ${opts.url}`,
  ].join("\n");
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const lockResult: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((lockResult.rows ?? lockResult)[0] || {}).got);
    if (!lockOk) return;

    // Sweep: marca como renovado os avisos cujo owner relogou 2FA dentro
    // da janela (ultimo_login_2fa_em do usuario > aviso_em e <= expira_em
    // da linha do historico). Roda antes de enviar avisos novos pra
    // manter o historico consistente sem worker dedicado. Task #158.
    try {
      await db.execute(sql`
        UPDATE historico_avisos_2fa_owner h
           SET renovado_em = u.ultimo_login_2fa_em
          FROM usuarios u
         WHERE h.usuario_id = u.id
           AND h.renovado_em IS NULL
           AND u.ultimo_login_2fa_em IS NOT NULL
           AND u.ultimo_login_2fa_em > h.aviso_em
           AND u.ultimo_login_2fa_em <= h.expira_em
      `);
    } catch (e: any) {
      logger.warn(
        { err: e?.message ?? String(e) },
        "[aviso-2fa-owner] sweep renovacao falhou",
      );
    }

    // Janela: ultimo_login_2fa_em entre (now - 8h) e (now - 7h45min) —
    // exatamente os 15min de antecedencia pedidos pelo task. Cobre 3 ticks
    // consecutivos de 5min sem buraco. A idempotencia por sessao
    // (ultimo_aviso_2fa_em < ultimo_login_2fa_em) garante 1 unico envio
    // por janela de 8h mesmo varrendo intervalo largo.
    const minMin = JANELA_2FA_MIN - ANTECEDENCIA_MIN; // 465min = 7h45
    const maxMin = JANELA_2FA_MIN;                    // 480min = 8h

    const candidatosResult: any = await db.execute(sql`
      SELECT id, nome, email, ultimo_login_2fa_em, canais_aviso_2fa
        FROM usuarios
       WHERE perfil_plataforma = 'platform_owner'
         AND ativo = true
         AND ultimo_login_2fa_em IS NOT NULL
         AND email IS NOT NULL AND email <> ''
         AND ultimo_login_2fa_em <= now() - INTERVAL '${sql.raw(String(minMin))} minutes'
         AND ultimo_login_2fa_em >  now() - INTERVAL '${sql.raw(String(maxMin))} minutes'
         AND (
           ultimo_aviso_2fa_em IS NULL
           OR ultimo_aviso_2fa_em < ultimo_login_2fa_em
         )
    `);
    const candidatos: OwnerCandidato[] =
      candidatosResult.rows ?? candidatosResult;

    if (candidatos.length === 0) return;

    logger.info(
      { total: candidatos.length },
      "[aviso-2fa-owner] enviando avisos de expiracao",
    );

    const url = urlPlataforma();

    for (const c of candidatos) {
      const ultimoMs = new Date(c.ultimo_login_2fa_em).getTime();
      const expiraMs = ultimoMs + JANELA_2FA_MIN * 60_000;
      const minutosRestantes = Math.max(
        1,
        Math.round((expiraMs - Date.now()) / 60_000),
      );
      let emailOk = false;
      let whatsappOk = false;
      let telegramOk = false;

      // Task #159 — owner pode desligar canais individualmente.
      // Distincao critica:
      //   - NULL/undefined (row legada pre-Migration 048) -> default
      //     ['email','whatsapp'] pra preservar comportamento da Task #146.
      //   - [] (array vazio explicito) -> MUDO. Owner desligou ambos
      //     conscientemente; so o banner in-app da Task #130 avisa.
      // Task #172 — terceiro canal "telegram" (opt-in, default OFF
      // mesmo em row legada pra evitar disparar pra owner que nao
      // configurou bot ainda).
      const canais = Array.isArray(c.canais_aviso_2fa)
        ? c.canais_aviso_2fa
        : ["email", "whatsapp"];
      const querEmail = canais.includes("email");
      const querWhatsapp = canais.includes("whatsapp");
      const querTelegram = canais.includes("telegram");

      // Email — alvo principal (so se o owner ainda quiser receber por email).
      if (querEmail) try {
        const gmail = await getGmailClient();
        const html = montarHtml({
          nome: c.nome,
          minutosRestantes,
          url,
        });
        const subject = `[PAWARDS] 2FA do painel expira em ~${minutosRestantes}min`;
        const raw = buildEmailRaw(c.email, subject, html);
        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });
        emailOk = true;
      } catch (e: any) {
        logger.warn(
          { usuarioId: c.id, err: e?.message ?? String(e) },
          "[aviso-2fa-owner] falha ao enviar email",
        );
      }

      // WhatsApp — best-effort (so se CEO_WHATSAPP estiver setado E o owner
      // mantiver o canal "whatsapp" em canais_aviso_2fa — Task #159).
      if (CEO_WHATSAPP && querWhatsapp) {
        try {
          const r = await enviarWhatsapp(
            CEO_WHATSAPP,
            montarTextoWhatsapp({ minutosRestantes, url }),
          );
          whatsappOk = Boolean(r.sucesso);
          if (!r.sucesso) {
            logger.warn(
              { usuarioId: c.id, erro: r.erro },
              "[aviso-2fa-owner] whatsapp retornou falha",
            );
          }
        } catch (e: any) {
          logger.warn(
            { usuarioId: c.id, err: e?.message ?? String(e) },
            "[aviso-2fa-owner] erro whatsapp",
          );
        }
      }

      // Telegram — best-effort (so se TELEGRAM_BOT_TOKEN +
      // CEO_TELEGRAM_CHAT_ID estiverem setados E o owner tiver marcado
      // "telegram" em canais_aviso_2fa — Task #172).
      if (querTelegram && temConfigTelegram()) {
        const r = await enviarTelegramCEO(
          montarTextoWhatsapp({ minutosRestantes, url }),
        );
        telegramOk = Boolean(r.sucesso);
        if (!r.sucesso) {
          logger.warn(
            { usuarioId: c.id, erro: r.erro },
            "[aviso-2fa-owner] telegram retornou falha",
          );
        }
      }

      // Idempotencia: marca o owner mesmo se email/whatsapp/telegram falharam.
      // Caso contrario o proximo tick re-tenta e gera spam. O banner
      // in-app permanece como fallback caso ele abra o painel.
      try {
        await db.execute(sql`
          UPDATE usuarios
             SET ultimo_aviso_2fa_em = now()
           WHERE id = ${c.id}
        `);
      } catch (e: any) {
        logger.error(
          { usuarioId: c.id, err: e?.message ?? String(e) },
          "[aviso-2fa-owner] falha ao gravar ultimo_aviso_2fa_em",
        );
      }

      // Historico (Task #158): 1 linha por (usuario, ultimo_login_2fa_em).
      // ON CONFLICT no-op garante idempotencia caso o sweep ja tenha entrado
      // (nao deveria, mas defensivo). Renovado_em sera preenchido por sweep
      // futuro quando o owner relogar dentro da janela.
      try {
        const expiraIso = new Date(expiraMs).toISOString();
        const ultimoIso = new Date(ultimoMs).toISOString();
        await db.execute(sql`
          INSERT INTO historico_avisos_2fa_owner
            (usuario_id, ultimo_login_2fa_em, aviso_em, expira_em,
             canal_email_ok, canal_whatsapp_ok, canal_telegram_ok)
          VALUES
            (${c.id}, ${ultimoIso}::timestamptz, now(),
             ${expiraIso}::timestamptz, ${emailOk}, ${whatsappOk}, ${telegramOk})
          ON CONFLICT (usuario_id, ultimo_login_2fa_em) DO NOTHING
        `);
      } catch (e: any) {
        logger.warn(
          { usuarioId: c.id, err: e?.message ?? String(e) },
          "[aviso-2fa-owner] falha ao registrar historico",
        );
      }
    }
    // Task #170 — alerta de segunda ordem por fadiga (3+ expirados consecutivos
    // em 7d). Roda dentro do mesmo lock do tick principal pra reaproveitar
    // exclusao mutua e garantir que o sweep de renovacao acima ja atualizou
    // os streaks antes da deteccao. Defensivo: nao lanca, log + segue.
    try {
      await detectarFadigaAvisos2fa();
    } catch (e: any) {
      logger.error(
        { err: e?.message ?? String(e) },
        "[aviso-2fa-owner][fadiga] deteccao falhou",
      );
    }
  } catch (e: any) {
    logger.error(
      { err: e?.message ?? String(e) },
      "[aviso-2fa-owner] tick falhou",
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

export function iniciarWorkerAvisoExpiracao2faOwner(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    { tickMs: TICK_MS, antecedenciaMin: ANTECEDENCIA_MIN },
    "[aviso-2fa-owner] worker iniciado",
  );
  setTimeout(() => {
    void tick();
  }, 45_000);
  setInterval(() => {
    void tick();
  }, TICK_MS).unref();
}

// ============================================================================
// Task #170 — Alerta de SEGUNDA ORDEM por fadiga de avisos 2FA.
//
// Por que existe:
//   A Task #146 (este mesmo worker) avisa o owner quando a janela de 8h ta
//   pra expirar. A Task #158 (Migration 048) registra cada aviso e marca
//   `renovado_em` quando o owner relogou dentro da janela. Quando o owner
//   deixa 3+ avisos consecutivos expirarem na mesma janela de 7 dias, e
//   sinal de fadiga de aviso (banner ignorado, email no spam) ou perda de
//   canal (WhatsApp sem internet, Telegram silenciado). Disparar 1 alerta
//   agregado de segunda ordem ("voce ignorou 3 avisos seguidos") aumenta
//   a chance de recuperacao do habito antes da proxima acao destrutiva.
//
// Idempotencia:
//   `alertas_fadiga_avisos_2fa_owner` tem UNIQUE(usuario_id, anchor_em)
//   onde anchor_em = MIN aviso_em do streak trailing de expirados sem
//   renovacao no historico INTEIRO do owner (sem truncar pela janela de
//   N dias). A janela de N dias e usada SO pra elegibilidade ("tem pelo
//   menos MIN expirados recentes?"), nao pra computar o anchor — caso
//   contrario um streak longo de >N dias deslizaria o anchor a cada novo
//   aviso expirado, gerando re-alertas (bug detectado em code review).
//
//   Enquanto o streak nao for quebrado por uma renovacao, o anchor
//   permanece igual e o INSERT cai no ON CONFLICT — nao spamma. Quando
//   o owner relogar (renovado_em preenchido pelo sweep no inicio do
//   tick), o streak quebra; o proximo expirado inicia novo streak com
//   novo anchor.
// ============================================================================

const FADIGA_MIN_EXPIRADOS = Number(
  process.env["FADIGA_AVISO_2FA_MIN_EXPIRADOS"] ?? 3,
);
const FADIGA_JANELA_DIAS = Number(
  process.env["FADIGA_AVISO_2FA_JANELA_DIAS"] ?? 7,
);

interface FadigaCandidato {
  usuario_id: number;
  nome: string;
  email: string;
  qtd_expirados: number;
  anchor_em: Date;
  mais_recente_em: Date;
}

/**
 * Linha do historico relevante pra computacao do streak. Exportada pra
 * cobertura unitaria (vide avisoExpiracao2faOwner.test.ts).
 */
export interface HistoricoLinhaFadiga {
  aviso_em: Date;
  renovado_em: Date | null;
  expira_em: Date;
}

/**
 * Resultado puro da deteccao de streak. `anchor_em` e MIN aviso_em do
 * streak trailing inteiro (sem truncar pela janela). `qtd_na_janela` e
 * usado pra elegibilidade. `qtd_total` documenta o tamanho real do
 * streak (pode ser maior que qtd_na_janela em streaks longos).
 */
export interface StreakFadiga {
  qtd_total: number;
  qtd_na_janela: number;
  anchor_em: Date;
  mais_recente_em: Date;
}

/**
 * Funcao PURA: dado o historico desc-ordenado por aviso_em de UM owner,
 * retorna o streak trailing de expirados sem renovacao + contagem dentro
 * da janela. Retorna null se nao ha streak (mais recente ja foi renovado
 * ou ainda nao expirou).
 *
 * Algoritmo:
 *   1. Caminha do mais recente pro mais antigo, parando na 1a "quebra"
 *      (renovado_em != NULL OU expira_em > agora).
 *   2. Todas as linhas antes da quebra que sao expiradas-sem-renovacao
 *      formam o streak trailing.
 *   3. anchor_em = MIN aviso_em do streak (NAO truncado pela janela —
 *      caso contrario streaks longos deslizariam o anchor e re-alertariam).
 *   4. qtd_na_janela = qtas linhas do streak tem aviso_em >= agora-janela.
 *
 * Por que extraido como funcao pura: testavel em isolamento (sem DB) e
 * documenta o algoritmo de forma inequivoca pro reviewer/futuros mantenedores.
 */
export function computarStreakFadiga(
  historicoDescByAvisoEm: HistoricoLinhaFadiga[],
  opts: { agora: Date; janelaDias: number },
): StreakFadiga | null {
  const limiteJanelaMs =
    opts.agora.getTime() - opts.janelaDias * 24 * 60 * 60 * 1000;
  const agoraMs = opts.agora.getTime();
  const streak: HistoricoLinhaFadiga[] = [];
  for (const h of historicoDescByAvisoEm) {
    const expirado = h.expira_em.getTime() <= agoraMs;
    const renovado = h.renovado_em !== null;
    if (renovado || !expirado) break; // 1a quebra do trailing
    streak.push(h);
  }
  if (streak.length === 0) return null;
  let anchorMs = Infinity;
  let recenteMs = -Infinity;
  let qtdNaJanela = 0;
  for (const h of streak) {
    const ms = h.aviso_em.getTime();
    if (ms < anchorMs) anchorMs = ms;
    if (ms > recenteMs) recenteMs = ms;
    if (ms >= limiteJanelaMs) qtdNaJanela += 1;
  }
  return {
    qtd_total: streak.length,
    qtd_na_janela: qtdNaJanela,
    anchor_em: new Date(anchorMs),
    mais_recente_em: new Date(recenteMs),
  };
}

function montarHtmlFadiga(opts: {
  nome: string;
  qtd: number;
  janelaDias: number;
  url: string;
}): string {
  return `<!DOCTYPE html>
<html><body style="font-family:JetBrains Mono,monospace;color:#1a1a1a;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;border-left:4px solid #7d1d2e">
  <h2 style="margin:0 0 16px 0;color:#7d1d2e">[PAWARDS] Voce ignorou ${opts.qtd} avisos de 2FA seguidos</h2>
  <p>Ola ${escapeHtml(opts.nome)},</p>
  <p>Detectamos que <strong>${opts.qtd} avisos consecutivos</strong> de
  expiracao do seu 2FA do painel /plataforma expiraram sem renovacao nos
  ultimos ${opts.janelaDias} dias.</p>
  <p>Isso pode indicar:</p>
  <ul>
    <li>Email caindo no spam ou ignorado</li>
    <li>WhatsApp sem internet ou numero desatualizado</li>
    <li>Telegram silenciado</li>
    <li>Banner in-app passando despercebido</li>
  </ul>
  <p>Confira seus canais de aviso (email/WhatsApp/Telegram) em
  <code>/plataforma/perfil</code> e o historico completo abaixo.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(opts.url)}/avisos-2fa"
       style="background:#7d1d2e;color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">
      Ver historico de avisos 2FA
    </a>
  </p>
  <p style="color:#666;font-size:12px;margin-top:30px">Este e um alerta de
  segunda ordem do motor de seguranca PAWARDS (Task #170). Voce so recebe
  este alerta 1 vez por sequencia ininterrupta de avisos expirados — quando
  voce relogar 2FA dentro da janela, o contador zera. Nao responda.</p>
</div>
</body></html>`;
}


async function buscarCandidatosFadiga(): Promise<FadigaCandidato[]> {
  // Busca historico INTEIRO (sem truncar pela janela) de cada owner que
  // tem ao menos 1 expirado-sem-renovacao na janela — pre-filtro barato pra
  // limitar a varredura a owners com atividade recente. A computacao do
  // streak (anchor + qtd) e feita em JS via computarStreakFadiga() pra
  // evitar o bug de "anchor deslizante" caso o streak ultrapasse a janela.
  const linhasResult: any = await db.execute(sql`
    SELECT
      h.usuario_id,
      u.nome,
      u.email,
      h.aviso_em,
      h.renovado_em,
      h.expira_em
    FROM historico_avisos_2fa_owner h
    JOIN usuarios u ON u.id = h.usuario_id
    WHERE u.perfil_plataforma = 'platform_owner'
      AND u.ativo = true
      AND u.email IS NOT NULL AND u.email <> ''
      AND EXISTS (
        SELECT 1 FROM historico_avisos_2fa_owner h2
         WHERE h2.usuario_id = h.usuario_id
           AND h2.renovado_em IS NULL
           AND h2.expira_em <= now()
           AND h2.aviso_em >= now() - INTERVAL '${sql.raw(String(FADIGA_JANELA_DIAS))} days'
      )
    ORDER BY h.usuario_id, h.aviso_em DESC
  `);

  type Linha = {
    usuario_id: number;
    nome: string;
    email: string;
    aviso_em: string | Date;
    renovado_em: string | Date | null;
    expira_em: string | Date;
  };
  const linhas: Linha[] = linhasResult.rows ?? linhasResult;
  if (linhas.length === 0) return [];

  // Agrupa por owner mantendo ordem desc por aviso_em.
  const porOwner = new Map<
    number,
    { nome: string; email: string; hist: HistoricoLinhaFadiga[] }
  >();
  for (const l of linhas) {
    let bucket = porOwner.get(l.usuario_id);
    if (!bucket) {
      bucket = { nome: l.nome, email: l.email, hist: [] };
      porOwner.set(l.usuario_id, bucket);
    }
    bucket.hist.push({
      aviso_em: l.aviso_em instanceof Date ? l.aviso_em : new Date(l.aviso_em),
      renovado_em:
        l.renovado_em === null
          ? null
          : l.renovado_em instanceof Date
            ? l.renovado_em
            : new Date(l.renovado_em),
      expira_em:
        l.expira_em instanceof Date ? l.expira_em : new Date(l.expira_em),
    });
  }

  // Filtra anchors ja alertados (idempotencia entre ticks/pods). O INSERT
  // ON CONFLICT abaixo e a defesa final, mas evitar enviar email pra
  // depois descartar o INSERT economiza chamada a Gmail.
  const ownerIds = Array.from(porOwner.keys());
  const anchorsResult: any = await db.execute(sql`
    SELECT usuario_id, anchor_em
      FROM alertas_fadiga_avisos_2fa_owner
     WHERE usuario_id = ANY(${ownerIds}::int[])
  `);
  const jaAlertados = new Set<string>();
  for (const r of (anchorsResult.rows ?? anchorsResult) as Array<{
    usuario_id: number;
    anchor_em: string | Date;
  }>) {
    const ts =
      r.anchor_em instanceof Date
        ? r.anchor_em.getTime()
        : new Date(r.anchor_em).getTime();
    jaAlertados.add(`${r.usuario_id}|${ts}`);
  }

  const agora = new Date();
  const candidatos: FadigaCandidato[] = [];
  for (const [usuario_id, bucket] of porOwner) {
    const streak = computarStreakFadiga(bucket.hist, {
      agora,
      janelaDias: FADIGA_JANELA_DIAS,
    });
    if (!streak) continue;
    if (streak.qtd_na_janela < FADIGA_MIN_EXPIRADOS) continue;
    const chave = `${usuario_id}|${streak.anchor_em.getTime()}`;
    if (jaAlertados.has(chave)) continue;
    candidatos.push({
      usuario_id,
      nome: bucket.nome,
      email: bucket.email,
      qtd_expirados: streak.qtd_total,
      anchor_em: streak.anchor_em,
      mais_recente_em: streak.mais_recente_em,
    });
  }
  return candidatos;
}

async function detectarFadigaAvisos2fa(): Promise<void> {
  let candidatos: FadigaCandidato[];
  try {
    candidatos = await buscarCandidatosFadiga();
  } catch (e: any) {
    logger.error(
      { err: e?.message ?? String(e) },
      "[aviso-2fa-owner][fadiga] busca de candidatos falhou",
    );
    return;
  }
  if (candidatos.length === 0) return;

  logger.info(
    { total: candidatos.length, minExpirados: FADIGA_MIN_EXPIRADOS, janelaDias: FADIGA_JANELA_DIAS },
    "[aviso-2fa-owner][fadiga] alertas de segunda ordem detectados",
  );

  const url = urlPlataforma();

  for (const c of candidatos) {
    // INSERT idempotente PRIMEIRO. Se outro tick / outra instancia ja
    // alertou pra este streak (anchor_em), o RETURNING vem vazio e
    // pulamos o envio — sem spam mesmo entre pods.
    let inseriuId: number | null = null;
    try {
      const ins: any = await db.execute(sql`
        INSERT INTO alertas_fadiga_avisos_2fa_owner
          (usuario_id, anchor_em, qtd_expirados, mais_recente_em, janela_dias)
        VALUES
          (${c.usuario_id},
           ${new Date(c.anchor_em).toISOString()}::timestamptz,
           ${c.qtd_expirados},
           ${new Date(c.mais_recente_em).toISOString()}::timestamptz,
           ${FADIGA_JANELA_DIAS})
        ON CONFLICT (usuario_id, anchor_em) DO NOTHING
        RETURNING id
      `);
      const linha = (ins.rows ?? ins)[0];
      if (!linha) continue;
      inseriuId = Number(linha.id);
    } catch (e: any) {
      logger.error(
        { usuarioId: c.usuario_id, err: e?.message ?? String(e) },
        "[aviso-2fa-owner][fadiga] falha ao inserir registro de alerta",
      );
      continue;
    }

    // Email — alvo unico do alerta de fadiga. O canal in-app/banner ja
    // foi a 1a linha de defesa e nao funcionou; WhatsApp/Telegram tambem
    // ja foram tentados nos avisos individuais e provavelmente sao parte
    // do problema (canal silenciado). Email pra inbox principal e a
    // melhor aposta de recuperacao.
    let emailOk = false;
    try {
      const gmail = await getGmailClient();
      const html = montarHtmlFadiga({
        nome: c.nome,
        qtd: c.qtd_expirados,
        janelaDias: FADIGA_JANELA_DIAS,
        url,
      });
      const subject = `[PAWARDS] Voce ignorou ${c.qtd_expirados} avisos de 2FA seguidos`;
      const raw = buildEmailRaw(c.email, subject, html);
      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });
      emailOk = true;
    } catch (e: any) {
      logger.warn(
        { usuarioId: c.usuario_id, err: e?.message ?? String(e) },
        "[aviso-2fa-owner][fadiga] falha ao enviar email",
      );
    }

    if (emailOk && inseriuId !== null) {
      try {
        await db.execute(sql`
          UPDATE alertas_fadiga_avisos_2fa_owner
             SET email_ok = true
           WHERE id = ${inseriuId}
        `);
      } catch (e: any) {
        logger.warn(
          { id: inseriuId, err: e?.message ?? String(e) },
          "[aviso-2fa-owner][fadiga] falha ao marcar email_ok",
        );
      }
    }
  }
}

/** Disparo manual pra testes. */
export async function rodarAvisoExpiracao2faOwnerAgora(): Promise<void> {
  await tick();
}

/** Disparo manual do detector de fadiga (Task #170) pra testes. */
export async function rodarDeteccaoFadigaAvisos2faAgora(): Promise<void> {
  await detectarFadigaAvisos2fa();
}
