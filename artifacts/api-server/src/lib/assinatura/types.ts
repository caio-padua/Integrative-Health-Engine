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
  | "CLINICA_ECNPJ"
  | "FARMACIA_ECNPJ"
  | "TESTEMUNHA"
  | "RESPONSAVEL_LEGAL";

/**
 * Modalidades de autenticacao Lei 14.063/2020 art. 4o:
 *  - simples:           toque + nome digitado
 *  - avancada:          toque + token WhatsApp/Email + IP + geo + hash
 *  - qualificada:       ICP-Brasil A1/A3 (e-CPF medico)
 *  - qualificada_ecnpj: ICP-Brasil e-CNPJ (clinica/farmacia bilateral PARQ)
 *
 * Mapeamento padrao por papel (override possivel via Signatario.authMode):
 *   PACIENTE         -> avancada           (toque + token WhatsApp)
 *   MEDICO           -> qualificada        (e-CPF ICP-Brasil A1/A3)
 *   CLINICA_ECNPJ    -> qualificada_ecnpj  (e-CNPJ ICP-Brasil)
 *   FARMACIA_ECNPJ   -> qualificada_ecnpj  (e-CNPJ ICP-Brasil)
 *   CLINICA          -> simples            (operacional, sem ICP)
 *   TESTEMUNHA       -> simples
 *   RESPONSAVEL_LEGAL-> avancada
 *
 * REGRA FERRO: paciente NUNCA recebe ICP-Brasil (UX trava idoso).
 */
export type AuthMode = "simples" | "avancada" | "qualificada" | "qualificada_ecnpj";

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
  /** Override do auth_mode default por papel (ZapSign). */
  authMode?: AuthMode;
}

export interface PayloadEnvelope {
  templateCodigo: string;
  /**
   * Conteudo do documento. Se for HTML/texto, sera convertido a base64 PDF
   * pelo adapter. Se for buffer PDF cru, passe via {@link pdfBase64} e deixe
   * este campo como string vazia ou marcador.
   */
  conteudoHtml: string;
  /** PDF ja renderizado em base64. Se presente, sobrepoe conteudoHtml. */
  pdfBase64?: string;
  hashOriginal: string;
  signatarios: Signatario[];
  /**
   * ID externo PAWARDS estavel (ex: "parq-1234-1761512000"). Persistido em
   * assinatura_solicitacoes.zapsign_external_id e enviado ao ZapSign como
   * external_id pra reconciliar webhook -> DB sem ambiguidade.
   */
  externalId?: string;
  /** Acionar envio automatico via WhatsApp (ZapSign R$ 0,50/disparo). */
  enviarWhatsappAutomatico?: boolean;
  /**
   * Sequenciamento de assinaturas. true = ordem ativa (signatario seguinte so
   * recebe link apos anterior assinar). false = paralelo. Default false.
   */
  ordemAssinaturaAtiva?: boolean;
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
