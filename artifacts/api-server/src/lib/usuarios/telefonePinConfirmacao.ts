/**
 * Task #244 — Confirmacao por PIN antes de gravar o WhatsApp do CEO.
 *
 * Antes desta task a tela /plataforma/perfil aceitava qualquer numero
 * que passasse na mascara/E.164 e gravava direto em `usuarios.telefone`.
 * Se o CEO digitasse errado, os alertas criticos doc_signed/doc_refused
 * (Task #36) iam silenciosamente pra outra pessoa. Esta lib implementa
 * o fluxo: gera um PIN de 6 digitos, manda pelo proprio canal WhatsApp
 * que esta sendo cadastrado, e so persiste o `telefone` quando o usuario
 * digita o PIN de volta na UI. Se o numero estiver errado, o PIN nunca
 * chega e nada e gravado.
 *
 * Politica:
 *   - PIN expira em 10min (`PIN_EXPIRA_MS`).
 *   - Rate-limit: max 3 disparos por usuario por janela de 1h
 *     (`MAX_DISPAROS_POR_HORA`).
 *   - Tentativas: max 5 PINs errados consumidos antes de invalidar a
 *     pendencia (defesa contra brute-force de 6 digitos).
 *   - Substituir o numero pendente reaproveita o slot do usuario
 *     (UNIQUE em usuario_id), mas NAO zera o rate-limit (envios
 *     ficam logados em `usuarios_telefone_pin_envios`).
 *
 * Migracao: `057_usuarios_telefone_pin_confirmacao.sql`.
 */
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { enviarComTemplateHsm } from "../../services/whatsappService";
import { logger } from "../logger";

export const PIN_EXPIRA_MS = 10 * 60 * 1000;
export const MAX_DISPAROS_POR_HORA = 3;
export const MAX_TENTATIVAS_PIN = 5;

export interface IniciarPinResultadoOk {
  ok: true;
  expiraEm: string;
  telefoneE164: string;
}
export interface IniciarPinResultadoErro {
  ok: false;
  erro: string;
  rateLimit?: boolean;
  proximoEnvioEm?: string;
}
export type IniciarPinResultado = IniciarPinResultadoOk | IniciarPinResultadoErro;

export interface ConfirmarPinResultadoOk {
  ok: true;
  telefoneE164: string;
}
export interface ConfirmarPinResultadoErro {
  ok: false;
  erro: string;
  expirado?: boolean;
  excedeuTentativas?: boolean;
  tentativasRestantes?: number;
}
export type ConfirmarPinResultado = ConfirmarPinResultadoOk | ConfirmarPinResultadoErro;

function gerarPin6Digitos(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function validarE164Br(telefone: string): boolean {
  // +55 + DDD (2) + 9 + 8 digitos = 14 chars com '+', ou 13 digitos puros
  return /^\+55\d{11}$/.test(telefone);
}

async function contagemEnviosUltimaHora(usuarioId: number): Promise<number> {
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS n
      FROM usuarios_telefone_pin_envios
     WHERE usuario_id = ${usuarioId}
       AND enviado_em > now() - interval '1 hour'
  `);
  return Number((r.rows[0] as { n?: number } | undefined)?.n ?? 0);
}

async function proximoEnvioPermitidoEm(usuarioId: number): Promise<string | null> {
  const r = await db.execute(sql`
    SELECT enviado_em
      FROM usuarios_telefone_pin_envios
     WHERE usuario_id = ${usuarioId}
       AND enviado_em > now() - interval '1 hour'
     ORDER BY enviado_em ASC
     LIMIT 1
  `);
  const row = r.rows[0] as { enviado_em?: Date | string } | undefined;
  if (!row?.enviado_em) return null;
  const dt = row.enviado_em instanceof Date ? row.enviado_em : new Date(String(row.enviado_em));
  return new Date(dt.getTime() + 60 * 60 * 1000).toISOString();
}

/**
 * Inicia a confirmacao de um novo telefone:
 *   - valida formato E.164 BR
 *   - aplica rate-limit (3 disparos/1h por usuario)
 *   - gera PIN, hashea, grava pendencia (substituindo qualquer anterior)
 *   - dispara WhatsApp pelo proprio numero novo
 */
export async function iniciarConfirmacaoTelefonePin(
  usuarioId: number,
  telefoneE164: string,
  unidadeId?: number,
): Promise<IniciarPinResultado> {
  if (!validarE164Br(telefoneE164)) {
    return { ok: false, erro: "Telefone invalido (esperado +55DDD9XXXXXXXX)." };
  }

  const enviosUltimaHora = await contagemEnviosUltimaHora(usuarioId);
  if (enviosUltimaHora >= MAX_DISPAROS_POR_HORA) {
    const proximo = await proximoEnvioPermitidoEm(usuarioId);
    return {
      ok: false,
      erro: `Limite de ${MAX_DISPAROS_POR_HORA} envios de PIN por hora atingido. Tente de novo mais tarde.`,
      rateLimit: true,
      ...(proximo ? { proximoEnvioEm: proximo } : {}),
    };
  }

  const pin = gerarPin6Digitos();
  const pinHash = await bcrypt.hash(pin, 10);
  const expiraEm = new Date(Date.now() + PIN_EXPIRA_MS);

  await db.execute(sql`
    INSERT INTO usuarios_telefone_pin_pendente
      (usuario_id, telefone_e164, pin_hash, expira_em, tentativas, consumido_em)
    VALUES
      (${usuarioId}, ${telefoneE164}, ${pinHash}, ${expiraEm.toISOString()}, 0, NULL)
    ON CONFLICT (usuario_id) DO UPDATE
      SET telefone_e164 = EXCLUDED.telefone_e164,
          pin_hash      = EXCLUDED.pin_hash,
          criado_em     = now(),
          expira_em     = EXCLUDED.expira_em,
          tentativas    = 0,
          consumido_em  = NULL
  `);

  // E.164 -> numero puro (sem '+') que o whatsappService.formatarTelefone
  // espera (ele prefixa '55' se faltar; nosso input ja vem com 55).
  const telSemMais = telefoneE164.replace(/^\+/, "");

  // Texto livre como FALLBACK apenas. O caminho preferido e HSM
  // aprovado pelo Meta (`CONFIRMACAO_TELEFONE_CEO_PIN`), porque numero
  // novo pode estar fora da janela de 24h e Twilio/Gupshup bloqueiam
  // texto livre silenciosamente nesse caso. Se a config WhatsApp ativa
  // tiver `metadados.hsmTemplates.CONFIRMACAO_TELEFONE_CEO_PIN`
  // configurado, o envio sai por HSM (entrega garantida fora da janela).
  // Caso contrario, cai pro texto livre — funciona quando a clinica ja
  // tem janela aberta com o numero (caso comum em demo/dev).
  const mensagemFallback =
    `PAWARDS - Codigo de confirmacao\n\n` +
    `Seu PIN: ${pin}\n\n` +
    `Use este codigo na tela /plataforma/perfil pra confirmar este ` +
    `numero como o WhatsApp oficial do CEO. O PIN expira em 10 minutos.\n\n` +
    `Se voce nao pediu este codigo, ignore esta mensagem.`;

  const envio = await enviarComTemplateHsm(
    telSemMais,
    "CONFIRMACAO_TELEFONE_CEO_PIN",
    { pin, validade_min: "10" },
    {
      ...(unidadeId !== undefined ? { unidadeId } : {}),
      mensagemFallback,
    },
  );

  await db.execute(sql`
    INSERT INTO usuarios_telefone_pin_envios
      (usuario_id, telefone_e164, sucesso, erro_detalhes)
    VALUES
      (${usuarioId}, ${telefoneE164}, ${envio.sucesso}, ${envio.erro ?? null})
  `);

  if (!envio.sucesso) {
    logger.warn(
      { usuarioId, erro: envio.erro },
      "[telefone-pin] falha ao enviar PIN via WhatsApp",
    );
    return {
      ok: false,
      erro:
        "Falha ao enviar o PIN pelo WhatsApp. Confira o numero ou se o canal " +
        "WhatsApp da plataforma esta configurado e ativo.",
    };
  }

  return { ok: true, expiraEm: expiraEm.toISOString(), telefoneE164 };
}

interface PendenciaRow {
  id: number;
  telefone_e164: string;
  pin_hash: string;
  expira_em: Date | string;
  tentativas: number;
  consumido_em: Date | string | null;
}

/**
 * Confirma o PIN. Se OK, persiste `usuarios.telefone` E marca a
 * pendencia como consumida (mesma transacao). Retorna o E.164 final.
 */
export async function confirmarTelefonePin(
  usuarioId: number,
  pinDigitado: string,
): Promise<ConfirmarPinResultado> {
  const pin = String(pinDigitado ?? "").trim();
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, erro: "PIN deve ter 6 digitos numericos." };
  }

  const r = await db.execute(sql`
    SELECT id, telefone_e164, pin_hash, expira_em, tentativas, consumido_em
      FROM usuarios_telefone_pin_pendente
     WHERE usuario_id = ${usuarioId}
     LIMIT 1
  `);
  const row = r.rows[0] as unknown as PendenciaRow | undefined;
  if (!row || row.consumido_em) {
    return { ok: false, erro: "Nenhuma confirmacao de telefone pendente. Comece de novo." };
  }
  const expira = row.expira_em instanceof Date ? row.expira_em : new Date(String(row.expira_em));
  if (expira.getTime() <= Date.now()) {
    return { ok: false, erro: "PIN expirou (validade de 10min). Pedimos um novo PIN.", expirado: true };
  }
  if (row.tentativas >= MAX_TENTATIVAS_PIN) {
    return {
      ok: false,
      erro: "Excedeu o numero maximo de tentativas. Pedimos um novo PIN.",
      excedeuTentativas: true,
    };
  }

  const ok = await bcrypt.compare(pin, row.pin_hash);
  if (!ok) {
    await db.execute(sql`
      UPDATE usuarios_telefone_pin_pendente
         SET tentativas = tentativas + 1
       WHERE id = ${row.id}
    `);
    const restantes = Math.max(0, MAX_TENTATIVAS_PIN - (row.tentativas + 1));
    return { ok: false, erro: "PIN incorreto.", tentativasRestantes: restantes };
  }

  // PIN correto. Persiste o telefone E consome a pendencia na MESMA
  // transacao — atomicidade forte evita o estado inconsistente "telefone
  // gravado mas pendencia ainda valida" (que reabriria janela pra um
  // PIN ja usado e tornaria o /confirmar nao-idempotente).
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE usuarios
         SET telefone = ${row.telefone_e164}
       WHERE id = ${usuarioId}
    `);
    await tx.execute(sql`
      UPDATE usuarios_telefone_pin_pendente
         SET consumido_em = now()
       WHERE id = ${row.id}
    `);
  });

  return { ok: true, telefoneE164: row.telefone_e164 };
}

/**
 * Cancela a pendencia ativa (usuario desistiu do numero novo). Nao mexe
 * em `usuarios.telefone` — o numero antigo continua valendo.
 */
export async function cancelarConfirmacaoTelefonePin(usuarioId: number): Promise<void> {
  await db.execute(sql`
    DELETE FROM usuarios_telefone_pin_pendente
     WHERE usuario_id = ${usuarioId}
  `);
}

/**
 * Snapshot da pendencia ativa (pra UI saber se ja tem PIN aguardando).
 */
export interface StatusPendenciaPin {
  ativa: boolean;
  telefoneE164?: string;
  expiraEm?: string;
  tentativas?: number;
  tentativasRestantes?: number;
  expirada?: boolean;
}

export async function obterStatusPendenciaPin(
  usuarioId: number,
): Promise<StatusPendenciaPin> {
  const r = await db.execute(sql`
    SELECT telefone_e164, expira_em, tentativas, consumido_em
      FROM usuarios_telefone_pin_pendente
     WHERE usuario_id = ${usuarioId}
     LIMIT 1
  `);
  const row = r.rows[0] as
    | { telefone_e164: string; expira_em: Date | string; tentativas: number; consumido_em: Date | string | null }
    | undefined;
  if (!row || row.consumido_em) return { ativa: false };
  const expira = row.expira_em instanceof Date ? row.expira_em : new Date(String(row.expira_em));
  const expirada = expira.getTime() <= Date.now();
  return {
    ativa: !expirada,
    telefoneE164: row.telefone_e164,
    expiraEm: expira.toISOString(),
    tentativas: row.tentativas,
    tentativasRestantes: Math.max(0, MAX_TENTATIVAS_PIN - row.tentativas),
    expirada,
  };
}
