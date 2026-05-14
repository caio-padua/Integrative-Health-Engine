/**
 * Task #250 · Worker · Digest matinal de recusas pro CEO
 *
 * Consolida recusas (evento_ceo='REJEITADO') que cairam dentro da janela
 * de descanso do CEO (status='AGRUPADO_DIGEST', marcado pelo
 * notifAssinatura quando ceo_notif_preferencias.agrupar_recusas=TRUE)
 * num unico envio por (canal, destinatario) assim que a janela fecha.
 *
 * Tick: 10min. Lock distribuido: pg_try_advisory_lock(25025025).
 *
 * Estrategia:
 *  1. Lista usuarios validador_mestre ativos com prefs habilitar_quiet_hours
 *     E agrupar_recusas=TRUE (por canal).
 *  2. Pra cada (canal, destinatario), checa se AGORA esta FORA da janela
 *     do CEO. Se ainda estiver dentro, deixa pro proximo tick.
 *  3. Se fora da janela, busca todas as linhas AGRUPADO_DIGEST pendentes
 *     pra esse (canal, destinatario), monta UMA notificacao consolidada
 *     (PENDENTE) com o resumo das N recusas e marca as fontes como
 *     ENVIADO_AGRUPADO com resposta_provedor.digest_id apontando pro id
 *     consolidado (auditavel).
 *  4. O tick normal do notifAssinatura pega a linha consolidada na proxima
 *     rodada e envia via Gmail/WhatsApp normal.
 *
 * Defensivo: nunca lanca; falhas viram log + segue pro proximo grupo.
 * Idempotente: re-roda 100x sem efeito se nada mudou.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 10 * 60 * 1000; // 10 min
const ADVISORY_LOCK_ID = 25025025;
let _executando = false;
let _started = false;

function horaLocal(tz: string, base: Date = new Date()): { h: number; m: number; s: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(base);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const s = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  return { h, m, s };
}

function parseHHMMSS(s: string): { h: number; m: number; s: number } {
  const [hh = "0", mm = "0", ss = "0"] = String(s ?? "").split(":");
  return { h: Number(hh), m: Number(mm), s: Number(ss) };
}

function dentroDoQuiet(
  agora: { h: number; m: number; s: number },
  inicio: { h: number; m: number; s: number },
  fim: { h: number; m: number; s: number },
): boolean {
  const a = agora.h * 3600 + agora.m * 60 + agora.s;
  const i = inicio.h * 3600 + inicio.m * 60 + inicio.s;
  const f = fim.h * 3600 + fim.m * 60 + fim.s;
  if (i === f) return false;
  if (i < f) return a >= i && a < f;
  return a >= i || a < f;
}

type GrupoFonte = {
  id: number;
  solicitacao_id: number | null;
  assunto: string | null;
  corpo: string | null;
  criado_em: string;
  paciente_nome: string | null;
  template: string | null;
};

function montarCorpoDigest(canal: string, fontes: GrupoFonte[]): { assunto: string; corpo: string } {
  const n = fontes.length;
  const assunto = `[CEO] PAWARDS · Digest matinal · ${n} recusa${n > 1 ? "s" : ""} durante a janela de descanso`;
  const linhas: string[] = [
    `📋 ${n} contrato${n > 1 ? "s foram recusados" : " foi recusado"} durante a janela de descanso.`,
    "",
    "Resumo das recusas:",
    "",
  ];
  for (const f of fontes) {
    const quando = f.criado_em ? new Date(f.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
    const paciente = f.paciente_nome || "(sem paciente)";
    const tpl = f.template || "—";
    linhas.push(`• #${f.solicitacao_id ?? f.id} · ${quando}`);
    linhas.push(`  Paciente: ${paciente}`);
    linhas.push(`  Template: ${tpl}`);
    linhas.push("");
  }
  linhas.push("— PAWARDS · Digest CEO · agrupar_recusas=ON");
  // E-mail aceita newline; whatsapp tambem (renderiza como \n no Twilio).
  // wrapEmailMedcore ja converte \n em <br> via marked/html. Pra simplicidade
  // mantemos texto cru — o template branded faz o resto.
  return { assunto, corpo: linhas.join("\n") };
}

export interface TickDigestResult {
  grupos_avaliados: number;
  grupos_consolidados: number;
  notificacoes_consolidadas: number;
  pulado_dentro_janela: number;
  erros: number;
}

export async function tickDigestRecusasCEO(): Promise<TickDigestResult> {
  const agora = new Date();
  const out: TickDigestResult = {
    grupos_avaliados: 0,
    grupos_consolidados: 0,
    notificacoes_consolidadas: 0,
    pulado_dentro_janela: 0,
    erros: 0,
  };

  // Lista todas as prefs CEO ativas com agrupar_recusas=TRUE.
  const prefsRes: any = await db.execute(sql`
    SELECT u.id AS usuario_id, u.email, u.telefone, p.canal,
           p.quiet_inicio::text AS quiet_inicio,
           p.quiet_fim::text    AS quiet_fim,
           p.tz, p.habilitar_quiet_hours, p.agrupar_recusas
    FROM ceo_notif_preferencias p
    JOIN usuarios u ON u.id = p.usuario_id
    WHERE u.perfil = 'validador_mestre' AND u.ativo = true
      AND p.habilitar_quiet_hours = true
      AND p.agrupar_recusas = true
  `);
  const prefs: Array<{
    usuario_id: number;
    email: string | null;
    telefone: string | null;
    canal: string;
    quiet_inicio: string;
    quiet_fim: string;
    tz: string;
  }> = prefsRes.rows ?? prefsRes ?? [];

  for (const pref of prefs) {
    out.grupos_avaliados++;
    const dest = (pref.canal === "EMAIL" ? pref.email : pref.telefone) || "";
    if (!dest) continue;

    let inQuiet = false;
    try {
      inQuiet = dentroDoQuiet(
        horaLocal(pref.tz, agora),
        parseHHMMSS(pref.quiet_inicio),
        parseHHMMSS(pref.quiet_fim),
      );
    } catch (e) {
      logger.warn({ err: (e as Error).message, prefUsuario: pref.usuario_id, canal: pref.canal }, "digestRecusasCEO_tz_invalido");
      out.erros++;
      continue;
    }
    if (inQuiet) {
      out.pulado_dentro_janela++;
      continue;
    }

    // Busca fontes AGRUPADO_DIGEST pendentes pra esse (canal, destinatario).
    try {
      const fontesRes: any = await db.execute(sql`
        SELECT n.id, n.solicitacao_id, n.assunto, n.corpo,
               n.criado_em::text AS criado_em,
               p.nome AS paciente_nome,
               COALESCE(t.nome_exibicao, t.codigo) AS template
        FROM assinatura_notificacoes n
        LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
        LEFT JOIN pacientes p ON p.id = s.paciente_id
        LEFT JOIN assinatura_templates t ON t.id = s.template_id
        WHERE n.status = 'AGRUPADO_DIGEST'
          AND n.canal = ${pref.canal}
          AND lower(n.destinatario) = lower(${dest})
          AND n.is_sistema_ceo = true
        ORDER BY n.criado_em ASC, n.id ASC
        LIMIT 200
      `);
      const fontes: GrupoFonte[] = (fontesRes.rows ?? fontesRes ?? []) as GrupoFonte[];
      if (fontes.length === 0) continue;

      const { assunto, corpo } = montarCorpoDigest(pref.canal, fontes);
      // Insere a notificacao consolidada (PENDENTE) — o tick normal do
      // notifAssinatura envia. is_sistema_ceo=true mantem bypass de opt-out.
      // evento_ceo='REJEITADO' garante que se cair de novo numa janela
      // (raro: digest gerado com janela ja iniciando), o agrupamento se
      // repete coerente.
      const insRes: any = await db.execute(sql`
        INSERT INTO assinatura_notificacoes
          (solicitacao_id, canal, momento, destinatario, assunto, corpo,
           status, is_sistema_ceo, evento_ceo)
        VALUES
          (${fontes[0].solicitacao_id ?? null}, ${pref.canal},
           'POS_ASSINATURA', ${dest}, ${assunto}, ${corpo},
           'PENDENTE', true, 'REJEITADO')
        RETURNING id
      `);
      const digestId = Number(((insRes.rows ?? insRes)[0] || {}).id);

      // Marca todas as fontes como ENVIADO_AGRUPADO apontando pro digestId.
      const ids = fontes.map((f) => f.id);
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'ENVIADO_AGRUPADO',
            enviado_em = now(),
            erro = NULL,
            resposta_provedor = ${JSON.stringify({ agrupado_em_digest_id: digestId, total_no_digest: fontes.length })}::jsonb
        WHERE id = ANY(${ids}::int[])
      `);

      out.grupos_consolidados++;
      out.notificacoes_consolidadas += fontes.length;
      logger.info(
        { digestId, canal: pref.canal, destinatario: dest, fontes: fontes.length },
        "digestRecusasCEO_consolidado",
      );
    } catch (e) {
      out.erros++;
      logger.error(
        { err: (e as Error).message, canal: pref.canal, destinatario: dest },
        "digestRecusasCEO_erro_grupo",
      );
    }
  }

  return out;
}

async function tickComLock(): Promise<void> {
  if (_executando) return;
  _executando = true;
  let lockOk = false;
  try {
    const r: any = await db.execute(sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`);
    lockOk = Boolean(((r.rows ?? r)[0] || {}).got);
    if (!lockOk) return;
    const out = await tickDigestRecusasCEO();
    if (out.grupos_consolidados > 0 || out.erros > 0) {
      logger.info({ ...out }, "digestRecusasCEO_tick");
    }
  } catch (e) {
    logger.error({ err: (e as Error).message }, "digestRecusasCEO_tick_fatal");
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        logger.warn({ err: (e as Error).message }, "digestRecusasCEO_release_lock_falhou");
      }
    }
    _executando = false;
  }
}

export function iniciarWorkerDigestRecusasCEO(): void {
  if (_started) return;
  _started = true;
  logger.info({ tick_min: TICK_MS / 60000 }, "digestRecusasCEO_worker_iniciado");
  setTimeout(() => { void tickComLock(); }, 60 * 1000);
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}
