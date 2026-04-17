// ─── Tipos base de pagamento ─────────────────────────────────────────────────

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'debit_card'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired'

export type GatewayName = 'asaas' | 'mercadopago' | 'stripe' | 'infinitpay'

// ─── Contexto B2B: clínica assina plano SaaS ─────────────────────────────────

export type Saasplan = 'starter' | 'pro' | 'enterprise'

export interface ClinicSubscriptionInput {
  clinicId: string
  clinicName: string
  email: string
  cpfCnpj: string          // para emissão de NF / Asaas / MP
  phone?: string
  plan: Saasplan
  billingCycle: 'monthly' | 'annual'
  gateway: GatewayName
  paymentMethod: PaymentMethod
  cardToken?: string       // tokenizado no front — nunca o número bruto
}

export const SAAS_PRICES: Record<Saasplan, { monthly: number; annual: number }> = {
  starter:    { monthly: 29700,  annual: 26700  }, // centavos
  pro:        { monthly: 59700,  annual: 53700  },
  enterprise: { monthly: 149700, annual: 134700 },
}

// ─── Contexto B2C: paciente paga protocolo ────────────────────────────────────

export type ProtocolTier = 'basico' | 'intermediario' | 'avancado' | 'full'

export interface PatientPaymentInput {
  patientId: string
  patientName: string
  email: string
  cpf: string
  phone?: string
  tier: ProtocolTier
  installments?: number    // parcelamento no cartão (1–12)
  gateway: GatewayName
  paymentMethod: PaymentMethod
  cardToken?: string
}

export const PROTOCOL_PRICES: Record<ProtocolTier, number> = {
  basico:        29700,   // R$ 297
  intermediario: 59700,   // R$ 597
  avancado:      99700,   // R$ 997
  full:         149700,   // R$ 1.497
}

// ─── Saída unificada de qualquer gateway ─────────────────────────────────────

export interface PaymentResult {
  id: string               // ID do gateway
  status: PaymentStatus
  gateway: GatewayName
  method: PaymentMethod
  amountCents: number
  pixQrCode?: string       // base64 ou string SVG
  pixCopyPaste?: string    // "copia e cola"
  boletoUrl?: string
  boletoBarcode?: string
  boletoExpires?: string   // ISO date
  checkoutUrl?: string     // redirect para checkout hospedado
  subscriptionId?: string  // para recorrência
  invoiceId?: string
  externalRef?: string     // referência no seu sistema
  rawResponse?: unknown    // payload bruto para debug/audit
}

// ─── Interface do adapter ─────────────────────────────────────────────────────

export interface PaymentGateway {
  name: GatewayName
  /** Cria cobrança única (B2C ou primeira parcela B2B) */
  createCharge(input: PatientPaymentInput | ClinicSubscriptionInput, amountCents: number): Promise<PaymentResult>
  /** Cria assinatura recorrente (B2B) */
  createSubscription(input: ClinicSubscriptionInput): Promise<PaymentResult>
  /** Consulta status de uma cobrança */
  getStatus(paymentId: string): Promise<PaymentStatus>
  /** Cancela cobrança ou assinatura */
  cancel(paymentId: string): Promise<boolean>
  /** Valida e parseia webhook do gateway */
  parseWebhook(body: unknown, headers: Record<string, string>): WebhookEvent | null
}

export interface WebhookEvent {
  gateway: GatewayName
  event: 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'chargeback'
  paymentId: string
  externalRef?: string
  amountCents?: number
  paidAt?: string
  rawPayload: unknown
}
