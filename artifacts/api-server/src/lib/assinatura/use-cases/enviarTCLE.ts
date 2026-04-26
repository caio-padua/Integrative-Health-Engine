/**
 * Use-case Familia 1 (TCLE) — Wave 10 F3.B Round 5.
 *
 * Envia TCLE_PADRAO_V1 (id=1) ao paciente via ZapSign avancada
 * (assinaturaTela-tokenWhatsApp) — Lei 14.063 art. 4 II + STJ REsp 2.159.442/PR
 * + CFM 1.821/2007 + LGPD art. 11.
 *
 * Reusa assinaturaService.enviar() — papel "PACIENTE" mapeia automaticamente
 * pra AuthMode "avancada" via mapPapelToAuthMode() em adapters.ts. Nao precisa
 * passar zapsign_auth_method manual: o adapter ZapSign converte
 * "avancada" -> "assinaturaTela-tokenWhatsApp" sozinho.
 *
 * Idempotente: TCLE eh "matricula no programa" — assina 1x na vida do paciente.
 * Se ja existe assinatura_solicitacoes em status ENVIADO/CONCLUIDO pra
 * (paciente_id, template_id=1), retorna a existente sem reenviar (nem desperdicar
 * credito ZapSign).
 *
 * REGRA FERRO Wave 10 #14 (Manifesto PADCON Parte 6): paciente NUNCA em ICP —
 * sempre avancada. Esta rota nao aceita override de auth_method.
 *
 * Early-fail (incorpora aprendizado Round 4 item 3): valida existencia paciente
 * + canal de contato + nome ANTES de qualquer round-trip de hidratacao/template
 * /ZapSign — falha cedo, sem desperdicar CPU nem credito.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../service";

const TCLE_TEMPLATE_CODIGO = "TCLE_PADRAO_V1";
const TCLE_TEMPLATE_ID = 1;

export interface EnviarTCLEInput {
  pacienteId: number;
}

export interface EnviarTCLEResultado {
  ok: boolean;
  pacienteId: number;
  templateCodigo: string;
  templateId: number;
  solicitacaoId: number;
  envelopeId: string;
  signatarioLink: string | null;
  reaproveitado: boolean;
}

interface PacienteValidacaoRow {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
}

interface SolicitacaoExistenteRow {
  id: number;
  provedor_envelope_id: string;
  status: string;
  metadata: { linksAssinatura?: Array<{ email: string; url: string }> } | null;
}

async function carregarPacienteValidacao(id: number): Promise<PacienteValidacaoRow> {
  const r = await db.execute(sql`
    SELECT id, nome, email, telefone
    FROM pacientes WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: PacienteValidacaoRow[] }).rows || [])[0];
  if (!row) throw new Error(`TCLE: paciente ${id} nao encontrado`);
  return row;
}

async function buscarSolicitacaoExistente(pacienteId: number): Promise<SolicitacaoExistenteRow | null> {
  const r = await db.execute(sql`
    SELECT id, provedor_envelope_id, status, metadata
    FROM assinatura_solicitacoes
    WHERE paciente_id = ${pacienteId}
      AND template_id = ${TCLE_TEMPLATE_ID}
      AND status IN ('ENVIADO', 'CONCLUIDO')
    ORDER BY enviado_em DESC
    LIMIT 1
  `);
  const row = ((r as unknown as { rows?: SolicitacaoExistenteRow[] }).rows || [])[0];
  return row || null;
}

export async function enviarTCLE(input: EnviarTCLEInput): Promise<EnviarTCLEResultado> {
  // Early-fail #1: existencia. Falha aqui evita carregar template/toggles inutilmente.
  const paciente = await carregarPacienteValidacao(input.pacienteId);

  // Early-fail #2: ZapSign avancada exige ao menos 1 canal pra disparar token
  // WhatsApp/email. Sem canal = solicitacao impossivel — para antes de tudo.
  if (!paciente.telefone && !paciente.email) {
    throw new Error(
      `TCLE paciente ${paciente.id}: sem email NEM telefone. ` +
      `ZapSign avancada exige ao menos 1 canal pra disparar token de assinatura.`,
    );
  }

  // Early-fail #3: nome valido (>= 3 chars). ZapSign rejeita signatario sem nome real.
  if (!paciente.nome || paciente.nome.trim().length < 3) {
    throw new Error(`TCLE paciente ${paciente.id}: nome invalido (< 3 chars).`);
  }

  // Idempotencia: TCLE_PADRAO_V1 = matricula no programa (1x por paciente).
  // Se ja existe ENVIADO ou CONCLUIDO, devolve existente sem reenviar.
  // Versionamento futuro (V2, V3) cria template_codigo novo — esta query
  // continua valida porque o template_id muda.
  const existente = await buscarSolicitacaoExistente(paciente.id);
  if (existente) {
    const link = existente.metadata?.linksAssinatura?.[0]?.url || null;
    return {
      ok: true,
      pacienteId: paciente.id,
      templateCodigo: TCLE_TEMPLATE_CODIGO,
      templateId: TCLE_TEMPLATE_ID,
      solicitacaoId: existente.id,
      envelopeId: existente.provedor_envelope_id,
      signatarioLink: link,
      reaproveitado: true,
    };
  }

  // Envio real. assinaturaService.enviar() entrega tudo:
  //   - mapPapelToAuthMode("PACIENTE") -> "avancada" -> "assinaturaTela-tokenWhatsApp"
  //   - hidratacao TCLE_PADRAO_V1 com NOME_PACIENTE / CPF_PACIENTE / etc
  //   - persistencia em assinatura_solicitacoes + signatarios + notificacoes
  //   - failover automatico (ZapSign principal + Clicksign reserva, se toggle ON)
  const r = await assinaturaService.enviar({
    pacienteId: paciente.id,
    templateCodigo: TCLE_TEMPLATE_CODIGO,
  });

  const link = r.signatarios.find((s) => s.papel === "PACIENTE")?.link ?? null;

  return {
    ok: true,
    pacienteId: paciente.id,
    templateCodigo: TCLE_TEMPLATE_CODIGO,
    templateId: TCLE_TEMPLATE_ID,
    solicitacaoId: r.solicitacaoId,
    envelopeId: r.envelopeId,
    signatarioLink: link,
    reaproveitado: false,
  };
}
