/**
 * PARMASUPRA-FECHAMENTO · F4 / WD14 · Worker assinatura notificações
 * + DRIVE-TSUNAMI Wave 1 (22/abr/2026): canal DRIVE plugado real.
 *
 * Consumidor da fila `assinatura_notificacoes` (status PENDENTE) que o
 * `lib/assinatura/service.ts` já enfileirava sem consumer.
 *
 * Comportamento por canal:
 *  - EMAIL    : envia via Gmail integration real (lib/google-gmail.ts).
 *  - WHATSAPP : envia via lib/services/whatsappService.ts (Twilio/Gupshup
 *               conforme config ativa em whatsapp_config).
 *  - DRIVE    : parseia `drive://paciente/<id>`, garante folder do paciente
 *               (auto-provision se preciso), faz upload na subpasta ASSINATURAS.
 *               Se anexo_url for http(s), baixa o binário e usa como conteúdo;
 *               senão usa `corpo` como texto/markdown (registro de evento).
 *
 * Retry exponencial: tentativa 1 → +10min, 2 → +1h, 3 → FALHA permanente.
 * Idempotente: tick pega só PENDENTE com proxima_tentativa_em <= now().
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { enviarWhatsapp } from "../../services/whatsappService";
import {
  getOrCreateClientFolder,
  uploadToClientSubfolder,
  formatFileName,
} from "../google-drive";
import { wrapEmailMedcore, type MomentoNotif } from "./notifTemplate";

const TICK_MS = 5 * 60 * 1000; // 5 min
const MAX_TENTATIVAS = 3;
const RETRY_BACKOFF_MIN = [10, 60]; // após tentativa 1 → +10min, após 2 → +1h
const BATCH_LIMIT = 50;

type NotifRow = {
  id: number;
  canal: string;
  momento: string;
  destinatario: string;
  assunto: string | null;
  corpo: string | null;
  anexo_url: string | null;
  tentativas: number;
  // joined from assinatura_solicitacoes + pacientes
  paciente_id: number | null;
  paciente_nome: string | null;
  paciente_opt_out_email: boolean | null;
  paciente_opt_out_whatsapp: boolean | null;
  unidade_nick: string | null;
};

type NotifConfig = {
  quiet_inicio: string; // 'HH:MM:SS'
  quiet_fim: string;
  tz: string;
  habilitar_quiet_hours: boolean;
};

type ProcResult =
  | { status: "ENVIADO"; resposta?: any }
  | { status: "FALHA"; erro: string }
  | { status: "PULADO_QUIET"; reagendar_para: Date }
  | { status: "PULADO_OPTOUT"; canal: string };

/** Lê config global (id=1) com cache de 60s. */
let _cfgCache: { at: number; cfg: NotifConfig } | null = null;
async function getNotifConfig(): Promise<NotifConfig> {
  if (_cfgCache && Date.now() - _cfgCache.at < 60_000) return _cfgCache.cfg;
  const r: any = await db.execute(sql`
    SELECT quiet_inicio::text AS quiet_inicio,
           quiet_fim::text    AS quiet_fim,
           tz, habilitar_quiet_hours
    FROM notif_config WHERE id = 1
  `);
  const row = (r.rows ?? r)[0];
  const cfg: NotifConfig = row ?? {
    quiet_inicio: "22:00:00",
    quiet_fim: "07:00:00",
    tz: "America/Sao_Paulo",
    habilitar_quiet_hours: true,
  };
  _cfgCache = { at: Date.now(), cfg };
  return cfg;
}

/** Invalida cache da config (chamado quando admin atualiza via endpoint). */
export function invalidarCacheNotifConfig(): void {
  _cfgCache = null;
}

/** Hora local em America/Sao_Paulo (ou tz da config) — formato HH:MM:SS. */
function horaLocal(tz: string, base: Date = new Date()): { h: number; m: number; s: number; iso: string } {
  // Intl gives us hh:mm:ss in target tz reliably.
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
  return { h, m, s, iso: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

function parseHHMMSS(s: string): { h: number; m: number; s: number } {
  const [hh = "0", mm = "0", ss = "0"] = String(s ?? "").split(":");
  return { h: Number(hh), m: Number(mm), s: Number(ss) };
}

/** Retorna true se `agora` está dentro do intervalo [inicio, fim). Considera wrap (22→07). */
function dentroDoQuiet(agora: { h: number; m: number; s: number }, inicio: { h: number; m: number; s: number }, fim: { h: number; m: number; s: number }): boolean {
  const a = agora.h * 3600 + agora.m * 60 + agora.s;
  const i = inicio.h * 3600 + inicio.m * 60 + inicio.s;
  const f = fim.h * 3600 + fim.m * 60 + fim.s;
  if (i === f) return false;
  if (i < f) return a >= i && a < f; // janela mesma data
  return a >= i || a < f; // wrap (ex.: 22h → 07h)
}

/**
 * Calcula próxima Date (UTC) em que `quiet_fim` ocorre no tz dado.
 * Estratégia simples: se hora local agora < fim → hoje; senão → amanhã. Ajusta diferença em ms.
 */
function calcProximoQuietFim(cfg: NotifConfig, base: Date = new Date()): Date {
  const fim = parseHHMMSS(cfg.quiet_fim);
  const agora = horaLocal(cfg.tz, base);
  const segAgora = agora.h * 3600 + agora.m * 60 + agora.s;
  const segFim = fim.h * 3600 + fim.m * 60 + fim.s;
  const deltaSeg = segFim > segAgora ? segFim - segAgora : 24 * 3600 - segAgora + segFim;
  return new Date(base.getTime() + deltaSeg * 1000 + 60_000); // +1min folga
}

/** Sanitiza email/header — remove CRLF (anti-injection). */
function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

/** Codifica RFC 5322 minimal (assunto base64-UTF8 + corpo HTML base64). */
function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const fromAddr = "clinica.padua.agenda@gmail.com";
  const parts = [
    `From: PAWARDS - Instituto Padua <${fromAddr}>`,
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

/** Processa uma única notificação. Defensivo: nunca lança. */
export async function processarNotificacao(row: NotifRow): Promise<ProcResult> {
  try {
    const canal = String(row.canal).toUpperCase();

    if (canal === "EMAIL") {
      // Gmail real via integration google-mail (token gerenciado pelo Replit
      // via REPLIT_CONNECTORS_HOSTNAME). Erro vira FALHA estruturada com
      // mensagem do provedor — retry exponencial pega de novo no próximo tick.
      // Wave 2: corpo agora é embrulhado no template branded MEDCORE (navy+gold).
      const dest = sanitizeHeader(row.destinatario);
      if (!dest || !dest.includes("@")) {
        return { status: "FALHA", erro: `email_invalido:${dest}` };
      }
      const assunto = row.assunto || "Notificação PAWARDS";
      const corpo = row.corpo || "";
      const optOutUrl = row.paciente_id
        ? `${process.env.PUBLIC_APP_URL || ""}/opt-out?paciente=${row.paciente_id}&canal=email`
        : undefined;
      const htmlBody = wrapEmailMedcore({
        subject: assunto,
        bodyHtmlOrText: corpo,
        momento: (row.momento as MomentoNotif) || undefined,
        pacienteNome: row.paciente_nome || undefined,
        unidadeNick: row.unidade_nick || undefined,
        optOutUrl,
      });

      const gmail = await getGmailClient();
      const raw = buildEmailRaw(dest, assunto, htmlBody);
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });
      return {
        status: "ENVIADO",
        resposta: { provider: "google-mail", id: res.data?.id, threadId: res.data?.threadId, branded: true },
      };
    }

    if (canal === "WHATSAPP") {
      // WhatsApp via lib/services/whatsappService — usa config ativa em
      // whatsapp_config (TWILIO ou GUPSHUP, decidido pelo provedor da row).
      const dest = sanitizeHeader(row.destinatario);
      if (!dest) return { status: "FALHA", erro: "whatsapp_destinatario_vazio" };
      const corpo = row.corpo || row.assunto || "";
      if (!corpo) return { status: "FALHA", erro: "whatsapp_corpo_vazio" };

      const r = await enviarWhatsapp(dest, corpo);
      if (r.sucesso) {
        return {
          status: "ENVIADO",
          resposta: { provider: "whatsapp", msgId: r.provedorMsgId, logId: r.logId },
        };
      }
      return { status: "FALHA", erro: `whatsapp:${r.erro ?? "desconhecido"}` };
    }

    if (canal === "DRIVE") {
      // DRIVE-TSUNAMI Wave 1 plug real:
      // 1. Parse `drive://paciente/<id>` (formato emitido pelo service.ts).
      // 2. Busca paciente; se sem google_drive_folder_id, auto-provision via
      //    getOrCreateClientFolder (cria root CLINICA PADUA + pasta paciente
      //    + 21 subpastas) e persiste o id em pacientes.
      // 3. Conteúdo do upload:
      //    - Se anexo_url for http(s), baixa o binário e usa como Buffer.
      //    - Senão, gera um TXT com o `corpo` (registro textual do evento,
      //      útil enquanto o gerador de PDF assinado real não foi plugado).
      // 4. Upload na subpasta ASSINATURAS com filename padronizado
      //    formatFileName(hoje, "ASSINATURA", paciente_nome, momento).
      const dest = sanitizeHeader(row.destinatario);
      const m = /^drive:\/\/paciente\/(\d+)$/.exec(dest);
      if (!m) return { status: "FALHA", erro: `drive_destinatario_invalido:${dest}` };
      const pacienteId = Number(m[1]);
      if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
        return { status: "FALHA", erro: `drive_paciente_id_invalido:${dest}` };
      }

      // Busca paciente
      const pq: any = await db.execute(sql`
        SELECT id, nome, cpf, google_drive_folder_id
        FROM pacientes
        WHERE id = ${pacienteId}
        LIMIT 1
      `);
      const prow = (pq.rows ?? pq)[0];
      if (!prow) return { status: "FALHA", erro: `drive_paciente_nao_encontrado:${pacienteId}` };

      const pacienteNome: string = String(prow.nome ?? "PACIENTE SEM NOME");
      const pacienteCpf: string = String(prow.cpf ?? "SEM-CPF");
      let folderId: string | null = prow.google_drive_folder_id ?? null;

      // Auto-provision se preciso
      if (!folderId) {
        const f = await getOrCreateClientFolder(pacienteNome, pacienteCpf);
        folderId = f.folderId;
        await db.execute(sql`
          UPDATE pacientes SET google_drive_folder_id = ${folderId} WHERE id = ${pacienteId}
        `);
      }

      // Decide conteúdo
      let content: Buffer;
      let mimeType: string;
      let extra: string;
      const anexo = (row.anexo_url ?? "").trim();
      if (anexo && /^https?:\/\//i.test(anexo)) {
        const r = await fetch(anexo);
        if (!r.ok) return { status: "FALHA", erro: `drive_download_falhou:${r.status}` };
        const ab = await r.arrayBuffer();
        content = Buffer.from(ab);
        mimeType = r.headers.get("content-type") || "application/octet-stream";
        extra = "ANEXO";
      } else {
        const txt = row.corpo || row.assunto || "(notificação sem corpo)";
        content = Buffer.from(txt, "utf8");
        mimeType = "text/plain; charset=utf-8";
        extra = String(row.momento ?? "EVENTO");
      }

      const fileName = formatFileName(new Date(), "ASSINATURA", pacienteNome, extra);
      const up = await uploadToClientSubfolder({
        clientFolderId: folderId!,
        subfolder: "ASSINATURAS",
        fileName,
        mimeType,
        content,
      });

      return {
        status: "ENVIADO",
        resposta: {
          provider: "google-drive",
          fileId: up.fileId,
          fileUrl: up.fileUrl,
          subfolderId: up.subfolderId,
          folderId,
          paciente_id: pacienteId,
        },
      };
    }

    return { status: "FALHA", erro: `canal_desconhecido:${canal}` };
  } catch (e) {
    return { status: "FALHA", erro: `excecao:${(e as Error).message}` };
  }
}

/** Roda 1 tick: pega até BATCH_LIMIT notificações elegíveis e processa.
 *  Wave 2 (MENSAGERIA-TSUNAMI):
 *    - SELECT faz JOIN com assinatura_solicitacoes + pacientes + unidades
 *      para obter paciente_nome, opt-out flags e nick da unidade.
 *    - Pre-check global: quiet hours (config id=1) → marca PULADO_QUIET e
 *      reagenda pra próximo quiet_fim, sem incrementar tentativas.
 *    - Pre-check por canal: opt-out do paciente → marca PULADO_OPTOUT (terminal).
 *    - Canal EMAIL agora aplica template branded MEDCORE (navy+gold).
 */
export async function tickNotifAssinatura(): Promise<{
  processadas: number;
  enviadas: number;
  retry_agendado: number;
  falha_permanente: number;
  pulado_quiet: number;
  pulado_optout: number;
}> {
  const cfg = await getNotifConfig();
  const agora = new Date();
  const inQuiet =
    cfg.habilitar_quiet_hours &&
    dentroDoQuiet(horaLocal(cfg.tz, agora), parseHHMMSS(cfg.quiet_inicio), parseHHMMSS(cfg.quiet_fim));

  const r: any = await db.execute(sql`
    SELECT n.id, n.canal, n.momento, n.destinatario, n.assunto, n.corpo,
           n.anexo_url, n.tentativas,
           s.paciente_id,
           p.nome AS paciente_nome,
           p.notif_opt_out_email AS paciente_opt_out_email,
           p.notif_opt_out_whatsapp AS paciente_opt_out_whatsapp,
           u.nick AS unidade_nick
    FROM assinatura_notificacoes n
    LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
    LEFT JOIN pacientes p ON p.id = s.paciente_id
    LEFT JOIN unidades u ON u.id = p.unidade_id
    WHERE n.status IN ('PENDENTE', 'PULADO_QUIET')
      AND (n.proxima_tentativa_em IS NULL OR n.proxima_tentativa_em <= now())
    ORDER BY n.id ASC
    LIMIT ${BATCH_LIMIT}
  `);
  const rows: NotifRow[] = (r.rows ?? r) as NotifRow[];

  let processadas = 0;
  let enviadas = 0;
  let retry_agendado = 0;
  let falha_permanente = 0;
  let pulado_quiet = 0;
  let pulado_optout = 0;

  for (const row of rows) {
    processadas++;
    const canal = String(row.canal).toUpperCase();

    // --- Pre-check 1: opt-out por paciente (terminal, não conta tentativa) ---
    const optedOut =
      (canal === "EMAIL" && row.paciente_opt_out_email === true) ||
      (canal === "WHATSAPP" && row.paciente_opt_out_whatsapp === true);
    if (optedOut) {
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'PULADO_OPTOUT',
            erro = ${`paciente_opt_out:${canal.toLowerCase()}`},
            enviado_em = now()
        WHERE id = ${row.id}
      `);
      pulado_optout++;
      continue;
    }

    // --- Pre-check 2: quiet hours global (não-terminal, reagenda) ---
    // Aplica só pra canais que tocam o paciente (EMAIL/WHATSAPP); DRIVE roda 24/7.
    if (inQuiet && (canal === "EMAIL" || canal === "WHATSAPP")) {
      const reagendar = calcProximoQuietFim(cfg, agora);
      // Status PULADO_QUIET é não-terminal: o tick aceita PULADO_QUIET no SELECT,
      // então quando proxima_tentativa_em chegar, será reprocessado.
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'PULADO_QUIET',
            proxima_tentativa_em = ${reagendar.toISOString()}::timestamptz,
            erro = ${`quiet_hours:${cfg.quiet_inicio}-${cfg.quiet_fim} ${cfg.tz}`}
        WHERE id = ${row.id}
      `);
      pulado_quiet++;
      continue;
    }

    // --- Processamento normal ---
    const result = await processarNotificacao(row);
    const novasTentativas = (Number(row.tentativas) || 0) + 1;

    if (result.status === "ENVIADO") {
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'ENVIADO',
            enviado_em = now(),
            tentativas = ${novasTentativas},
            erro = NULL,
            resposta_provedor = ${JSON.stringify(result.resposta ?? {})}::jsonb
        WHERE id = ${row.id}
      `);
      enviadas++;
      continue;
    }

    // FALHA — decide retry vs permanente
    const erroMsg = "erro" in result ? result.erro : `status_inesperado:${(result as any).status}`;
    if (novasTentativas >= MAX_TENTATIVAS) {
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'FALHA',
            tentativas = ${novasTentativas},
            erro = ${erroMsg}
        WHERE id = ${row.id}
      `);
      falha_permanente++;
    } else {
      const backoffMin =
        RETRY_BACKOFF_MIN[novasTentativas - 1] ??
        RETRY_BACKOFF_MIN[RETRY_BACKOFF_MIN.length - 1] ?? 60;
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET tentativas = ${novasTentativas},
            erro = ${erroMsg},
            proxima_tentativa_em = now() + (${backoffMin} || ' minutes')::interval
        WHERE id = ${row.id}
      `);
      retry_agendado++;
    }
  }

  return { processadas, enviadas, retry_agendado, falha_permanente, pulado_quiet, pulado_optout };
}

let workerStarted = false;

export function iniciarWorkerNotifAssinatura(): void {
  if (workerStarted) return;
  workerStarted = true;

  console.log(
    `[notifAssinatura] WD14 worker iniciado (tick ${TICK_MS / 60000}min, max ${MAX_TENTATIVAS} tentativas, backoff ${RETRY_BACKOFF_MIN.join("/")}min)`
  );

  const tick = async () => {
    try {
      const r = await tickNotifAssinatura();
      if (r.processadas > 0) {
        console.log(
          `[notifAssinatura] tick: ${r.processadas} processadas · ${r.enviadas} enviadas · ${r.retry_agendado} retry · ${r.falha_permanente} falha-perm`
        );
      }
    } catch (e) {
      console.error("[notifAssinatura] erro no tick:", (e as Error).message);
    }
  };

  setTimeout(tick, 20 * 1000);
  setInterval(tick, TICK_MS).unref();
}
