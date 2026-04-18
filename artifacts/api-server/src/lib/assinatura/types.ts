/**
 * Tipos do modulo de Assinatura Digital PAU ARTS.
 * Espelham as tabelas do banco. Mantidos em arquivo unico para evitar
 * dispersao semantica - quem precisa de assinatura importa daqui.
 */

export type ProvedorCodigo =
  | "clicksign"
  | "zapsign"
  | "dock"
  | "d4sign"
  | "autentique"
  | "icp_a1_local";

export type SolicitacaoStatus =
  | "RASCUNHO"
  | "HIDRATADO"
  | "ENVIADO"
  | "PARCIAL"
  | "CONCLUIDO"
  | "REJEITADO"
  | "EXPIRADO"
  | "FALHA";

export type PapelSignatario =
  | "PACIENTE"
  | "MEDICO"
  | "CLINICA"
  | "TESTEMUNHA"
  | "RESPONSAVEL_LEGAL";

export type CanalDistribuicao = "EMAIL" | "WHATSAPP" | "DRIVE";

export type MomentoNotificacao =
  | "ENVIO_INICIAL"
  | "POS_ASSINATURA"
  | "LEMBRETE";

export interface Signatario {
  papel: PapelSignatario;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  ordem: number;
}

export interface PayloadEnvelope {
  templateCodigo: string;
  conteudoHtml: string;
  hashOriginal: string;
  signatarios: Signatario[];
  metadata: Record<string, unknown>;
}

export interface ResultadoEnvio {
  envelopeId: string;
  linksAssinatura: Array<{ email: string; url: string }>;
  rawProvider: unknown;
}

export interface StatusDocumento {
  status: SolicitacaoStatus;
  signatariosStatus: Array<{ email: string; assinado: boolean; assinadoEm?: string }>;
  pdfAssinadoUrl?: string;
}

export interface EventoWebhook {
  eventId: string;
  eventType: string;
  envelopeId?: string;
  signatureValid: boolean;
  payload: Record<string, unknown>;
}

/** Interface unica que TODOS os provedores implementam (manifesto sec.9). */
export interface SignatureProviderAdapter {
  readonly codigo: ProvedorCodigo;
  isConfigured(): boolean;
  createDocumentEnvelope(payload: PayloadEnvelope): Promise<ResultadoEnvio>;
  sendForSignature(envelopeId: string): Promise<void>;
  getDocumentStatus(envelopeId: string): Promise<StatusDocumento>;
  handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<EventoWebhook>;
  downloadSignedArtifact(envelopeId: string): Promise<Buffer>;
}
