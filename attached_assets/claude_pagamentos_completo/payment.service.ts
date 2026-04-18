import type {
  PaymentGateway,
  PaymentResult,
  PaymentStatus,
  GatewayName,
  PatientPaymentInput,
  ClinicSubscriptionInput,
  WebhookEvent,
} from './types'
import { AsaasAdapter } from './asaas.adapter'
import { MercadoPagoAdapter } from './mercadopago.adapter'
import { StripeAdapter } from './stripe.adapter'
import { InfinitPayAdapter } from './infinitpay.adapter'

// ─── Factory ──────────────────────────────────────────────────────────────────

const adapters: Record<GatewayName, PaymentGateway> = {
  asaas: new AsaasAdapter(),
  mercadopago: new MercadoPagoAdapter(),
  stripe: new StripeAdapter(),
  infinitpay: new InfinitPayAdapter(),
}

export function getGateway(name: GatewayName): PaymentGateway {
  const g = adapters[name]
  if (!g) throw new Error(`Gateway desconhecido: ${name}`)
  return g
}

// ─── Helpers de seleção automática de gateway ────────────────────────────────

/**
 * Retorna o gateway padrão configurado via env.
 * Útil quando a clínica/admin não selecionou explicitamente.
 */
export function defaultGateway(): GatewayName {
  const g = process.env.DEFAULT_GATEWAY as GatewayName | undefined
  if (g && adapters[g]) return g
  return 'asaas' // padrão para Brasil
}

/**
 * Verifica se um gateway está configurado (tem as envs necessárias).
 */
export function isGatewayAvailable(name: GatewayName): boolean {
  const checks: Record<GatewayName, () => boolean> = {
    asaas: () => !!process.env.ASAAS_API_KEY,
    mercadopago: () => !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    stripe: () => !!process.env.STRIPE_SECRET_KEY,
    infinitpay: () => !!(process.env.INFINITPAY_CLIENT_ID && process.env.INFINITPAY_CLIENT_SECRET),
  }
  return checks[name]?.() ?? false
}

export function availableGateways(): GatewayName[] {
  return (Object.keys(adapters) as GatewayName[]).filter(isGatewayAvailable)
}

// ─── PaymentService ───────────────────────────────────────────────────────────

export class PaymentService {
  /**
   * Cria cobrança B2C (paciente paga protocolo após anamnese).
   */
  async chargePatient(input: PatientPaymentInput): Promise<PaymentResult> {
    const { PROTOCOL_PRICES } = await import('./types')
    const amountCents = PROTOCOL_PRICES[input.tier]
    const gateway = getGateway(input.gateway)
    return gateway.createCharge(input, amountCents)
  }

  /**
   * Cria assinatura B2B (clínica assina plano SaaS).
   */
  async subscribeClinic(input: ClinicSubscriptionInput): Promise<PaymentResult> {
    const gateway = getGateway(input.gateway)
    return gateway.createSubscription(input)
  }

  /**
   * Consulta status de qualquer cobrança, em qualquer gateway.
   */
  async getStatus(gateway: GatewayName, paymentId: string): Promise<PaymentStatus> {
    return getGateway(gateway).getStatus(paymentId)
  }

  /**
   * Cancela cobrança ou assinatura.
   */
  async cancel(gateway: GatewayName, paymentId: string): Promise<boolean> {
    return getGateway(gateway).cancel(paymentId)
  }

  /**
   * Ponto de entrada único para webhooks de todos os gateways.
   * Retorna null se o payload não for reconhecido.
   */
  parseWebhook(
    gateway: GatewayName,
    body: unknown,
    headers: Record<string, string>,
  ): WebhookEvent | null {
    return getGateway(gateway).parseWebhook(body, headers)
  }
}

// Singleton para uso no Express
export const paymentService = new PaymentService()
