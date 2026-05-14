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
import { logger } from "../logger";

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
  // Task #36: alerta operacional pro CEO bypassa opt-out e quiet hours.
  is_sistema_ceo: boolean | null;
  // Task #45: discrimina ASSINADO vs REJEITADO pra aplicar quiet hours
  // proprias do CEO (so silencia ASSINADO; REJEITADO sempre passa).
  evento_ceo: string | null;
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

/**
 * Task #45 — Janelas de descanso proprias do CEO (ceo_notif_preferencias).
 *
 * Indexado por (destinatario, canal) — `destinatario` casa com email/telefone
 * em `usuarios` filtrando perfil='validador_mestre'. Cache 60s, mesmo padrao
 * do quiet hours global. Defensivo: se nao houver linha, devolve null e o
 * worker entende como "sem preferencia → envia 24/7" (preserva semantica
 * Wave 10 onde alertas CEO sempre passavam).
 */
type CEOPref = {
  quiet_inicio: string;
  quiet_fim: string;
  tz: string;
  habilitar_quiet_hours: boolean;
  nunca_silenciar_recusa: boolean;
};

let _ceoPrefsCache: { at: number; map: Map<string, CEOPref> } | null = null;

async function getCEOPref(destinatario: string, canal: string): Promise<CEOPref | null> {
  const key = `${canal}::${destinatario.trim().toLowerCase()}`;
  if (_ceoPrefsCache && Date.now() - _ceoPrefsCache.at < 60_000) {
    return _ceoPrefsCache.map.get(key) ?? null;
  }
  const r: any = await db.execute(sql`
    SELECT u.email, u.telefone, p.canal,
           p.quiet_inicio::text AS quiet_inicio,
           p.quiet_fim::text    AS quiet_fim,
           p.tz, p.habilitar_quiet_hours, p.nunca_silenciar_recusa
    FROM ceo_notif_preferencias p
    JOIN usuarios u ON u.id = p.usuario_id
    WHERE u.perfil = 'validador_mestre' AND u.ativo = true
  `);
  const rows: Array<{
    email: string | null;
    telefone: string | null;
    canal: string;
    quiet_inicio: string;
    quiet_fim: string;
    tz: string;
    habilitar_quiet_hours: boolean;
    nunca_silenciar_recusa: boolean;
  }> = (r.rows ?? r) ?? [];
  const map = new Map<string, CEOPref>();
  for (const row of rows) {
    const dest = (row.canal === "EMAIL" ? row.email : row.telefone) || "";
    if (!dest) continue;
    map.set(`${row.canal}::${dest.trim().toLowerCase()}`, {
      quiet_inicio: row.quiet_inicio,
      quiet_fim: row.quiet_fim,
      tz: row.tz,
      habilitar_quiet_hours: row.habilitar_quiet_hours,
      nunca_silenciar_recusa: row.nunca_silenciar_recusa,
    });
  }
  _ceoPrefsCache = { at: Date.now(), map };
  return map.get(key) ?? null;
}

export function invalidarCacheCEOPrefs(): void {
  _ceoPrefsCache = null;
}

/** Calcula proximo quiet_fim a partir das prefs do CEO (paralelo a calcProximoQuietFim global). */
function calcProximoQuietFimCEO(pref: CEOPref, base: Date = new Date()): Date {
  const fim = parseHHMMSS(pref.quiet_fim);
  const agora = horaLocal(pref.tz, base);
  const segAgora = agora.h * 3600 + agora.m * 60 + agora.s;
  const segFim = fim.h * 3600 + fim.m * 60 + fim.s;
  const deltaSeg = segFim > segAgora ? segFim - segAgora : 24 * 3600 - segAgora + segFim;
  return new Date(base.getTime() + deltaSeg * 1000 + 60_000);
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

      // Task #245 — passa templateNome=CEO_ASSINATURA pra envios do
      // canal CEO (is_sistema_ceo=true). Vira marcador deterministico em
      // whatsapp_mensagens_log.template_nome usado pela rota
      // /api/usuarios/me/ultimo-whatsapp-ceo pra filtrar logs do CEO sem
      // depender de matching textual no corpo.
      const r = await enviarWhatsapp(dest, corpo, {
        templateNome: row.is_sistema_ceo === true ? "CEO_ASSINATURA" : undefined,
      });
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
// Mutex em memoria: previne re-entrancia quando o webhook ZapSign chama
// tickNotifAssinatura() em fire-and-forget enquanto o setInterval normal
// ja esta executando o tick anterior. Combinado com claim atomico via
// UPDATE ... RETURNING (status='PROCESSANDO'), garante zero duplicacao
// mesmo em multi-instancia (FOR UPDATE SKIP LOCKED no SELECT interno).
//
// `_rerunPendente` garante "tempo real" mesmo quando o webhook chega no
// meio de um tick: ao inves de descartar a chamada concorrente, marca
// flag e o tick em execucao re-roda no finally ate drenar tudo. Sem
// isso, alertas CEO enfileirados durante a janela do tick atual
// esperariam o proximo intervalo de 5min.
let _tickEmAndamento = false;
let _rerunPendente = false;

export async function tickNotifAssinatura(): Promise<{
  processadas: number;
  enviadas: number;
  retry_agendado: number;
  falha_permanente: number;
  pulado_quiet: number;
  pulado_optout: number;
}> {
  if (_tickEmAndamento) {
    _rerunPendente = true;
    return { processadas: 0, enviadas: 0, retry_agendado: 0, falha_permanente: 0, pulado_quiet: 0, pulado_optout: 0 };
  }
  _tickEmAndamento = true;
  try {
  const cfg = await getNotifConfig();
  const agora = new Date();
  const inQuiet =
    cfg.habilitar_quiet_hours &&
    dentroDoQuiet(horaLocal(cfg.tz, agora), parseHHMMSS(cfg.quiet_inicio), parseHHMMSS(cfg.quiet_fim));

  // Recovery: linhas PROCESSANDO com `processando_em` ha mais de 10 min sao
  // consideradas orfas (crash de processo entre claim e UPDATE final). Volta
  // pra PENDENTE pra serem reprocessadas no proximo tick. Usa `processando_em`
  // (NAO `criado_em`) pra nao ressetar retries legitimos de linhas antigas.
  await db.execute(sql`
    UPDATE assinatura_notificacoes
    SET status = 'PENDENTE',
        processando_em = NULL
    WHERE status = 'PROCESSANDO'
      AND processando_em IS NOT NULL
      AND processando_em < now() - interval '10 minutes'
  `);

  // Claim atomico: UPDATE ... RETURNING marca as linhas como PROCESSANDO
  // dentro de uma unica transacao implicita. SKIP LOCKED no CTE interno
  // garante que dois ticks concorrentes (multi-process) nao reivindiquem
  // a mesma linha. Inclui PULADO_QUIET pra reprocessar quando a janela
  // libera.
  const r: any = await db.execute(sql`
    WITH alvos AS (
      SELECT id FROM assinatura_notificacoes
      WHERE status IN ('PENDENTE', 'PULADO_QUIET')
        AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= now())
      ORDER BY is_sistema_ceo DESC, id ASC
      LIMIT ${BATCH_LIMIT}
      FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
      UPDATE assinatura_notificacoes n
      SET status = 'PROCESSANDO',
          processando_em = now()
      FROM alvos
      WHERE n.id = alvos.id
      RETURNING n.id, n.canal, n.momento, n.destinatario, n.assunto, n.corpo,
                n.anexo_url, n.tentativas, n.is_sistema_ceo, n.evento_ceo, n.solicitacao_id
    )
    SELECT c.id, c.canal, c.momento, c.destinatario, c.assunto, c.corpo,
           c.anexo_url, c.tentativas, c.is_sistema_ceo, c.evento_ceo,
           s.paciente_id,
           p.nome AS paciente_nome,
           p.notif_opt_out_email AS paciente_opt_out_email,
           p.notif_opt_out_whatsapp AS paciente_opt_out_whatsapp,
           u.nick AS unidade_nick
    FROM claimed c
    LEFT JOIN assinatura_solicitacoes s ON s.id = c.solicitacao_id
    LEFT JOIN pacientes p ON p.id = s.paciente_id
    LEFT JOIN unidades u ON u.id = p.unidade_id
    ORDER BY c.is_sistema_ceo DESC, c.id ASC
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
    const isSistemaCEO = row.is_sistema_ceo === true;

    // --- Pre-check 1: opt-out por paciente (terminal, não conta tentativa) ---
    // Task #36: alerta operacional pro CEO bypassa opt-out — destinatario nao
    // eh paciente, e o flag opt-out herdado da JOIN nao se aplica.
    const optedOut =
      !isSistemaCEO && (
        (canal === "EMAIL" && row.paciente_opt_out_email === true) ||
        (canal === "WHATSAPP" && row.paciente_opt_out_whatsapp === true)
      );
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
    // Task #36: alerta sistema pro CEO ignora quiet hours globais — agora
    //           a decisao eh delegada pra ceo_notif_preferencias (Task #45).
    if (!isSistemaCEO && inQuiet && (canal === "EMAIL" || canal === "WHATSAPP")) {
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

    // --- Pre-check 2b (Task #45): quiet hours proprias do CEO ---
    // Aplica APENAS quando is_sistema_ceo=true e canal eh EMAIL/WHATSAPP.
    // INVARIANTE: recusas (evento_ceo='REJEITADO') SEMPRE passam, sem
    // condicional — eh requisito da Task #45 ("recusas sempre passam,
    // independente do horario"). Hard-locked no worker, nao configuravel.
    // Sem prefs cadastradas, o alerta CEO continua passando 24/7
    // (preserva Wave 10).
    const eventoCeo = (row.evento_ceo || "").toUpperCase();
    const ehRecusa = eventoCeo === "REJEITADO";
    if (isSistemaCEO && !ehRecusa && (canal === "EMAIL" || canal === "WHATSAPP")) {
      try {
        const pref = await getCEOPref(row.destinatario, canal);
        if (pref && pref.habilitar_quiet_hours) {
          const inQuietCEO = dentroDoQuiet(
            horaLocal(pref.tz, agora),
            parseHHMMSS(pref.quiet_inicio),
            parseHHMMSS(pref.quiet_fim),
          );
          if (inQuietCEO) {
            const reagendar = calcProximoQuietFimCEO(pref, agora);
            await db.execute(sql`
              UPDATE assinatura_notificacoes
              SET status = 'PULADO_QUIET',
                  proxima_tentativa_em = ${reagendar.toISOString()}::timestamptz,
                  erro = ${`ceo_quiet_hours:${pref.quiet_inicio}-${pref.quiet_fim} ${pref.tz} (evento=${eventoCeo || "?"})`}
              WHERE id = ${row.id}
            `);
            pulado_quiet++;
            continue;
          }
        }
      } catch (e) {
        // Defensivo: se a pref do CEO estiver malformada (tz invalido, etc),
        // nao deixa o tick inteiro abortar. Loga e segue pro envio normal —
        // alerta CEO 24/7 (preserva semantica Wave 10) eh fallback seguro.
        logger.warn(
          { err: String((e as Error).message), notifId: row.id, canal },
          "ceo_quiet_pref_falhou_fallback_envio",
        );
      }
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
      // Volta status pra PENDENTE pra o claim do proximo tick reivindicar
      // novamente quando proxima_tentativa_em chegar.
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'PENDENTE',
            tentativas = ${novasTentativas},
            erro = ${erroMsg},
            proxima_tentativa_em = now() + (${backoffMin} || ' minutes')::interval
        WHERE id = ${row.id}
      `);
      retry_agendado++;
    }
  }

  return { processadas, enviadas, retry_agendado, falha_permanente, pulado_quiet, pulado_optout };
  } finally {
    _tickEmAndamento = false;
    if (_rerunPendente) {
      _rerunPendente = false;
      // Re-roda em background pra drenar enfileirados que chegaram durante
      // a janela do tick atual (ex: webhook CEO disparado mid-tick).
      void tickNotifAssinatura();
    }
  }
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
