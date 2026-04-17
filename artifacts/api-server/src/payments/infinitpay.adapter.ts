import type {
  PaymentGateway,
  PaymentResult,
  PaymentStatus,
  WebhookEvent,
  PatientPaymentInput,
  ClinicSubscriptionInput,
  GatewayName,
} from './types'

// InfinitPay usa OAuth2 — o token é gerado via client_credentials
// Docs: https://docs.infinitepay.io/

const BASE_URL = 'https://api.infinitepay.io/v2'

async function getToken(): Promise<string> {
  const res = await fetch('https://api.infinitepay.io/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.INFINITPAY_CLIENT_ID ?? '',
      client_secret: process.env.INFINITPAY_CLIENT_SECRET ?? '',
    }),
  })
  if (!res.ok) throw new Error('InfinitPay auth falhou')
  const data = await res.json()
  return data.access_token as string
}

async function ipRequest(path: string, method = 'GET', body?: unknown) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`InfinitPay ${method} ${path} → ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

function mapStatus(s: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    pending: 'pending',
    processing: 'processing',
    approved: 'paid',
    declined: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    chargeback: 'refunded',
  }
  return map[s] ?? 'pending'
}

export class InfinitPayAdapter implements PaymentGateway {
  name: GatewayName = 'infinitpay'

  async createCharge(
    input: PatientPaymentInput | ClinicSubscriptionInput,
    amountCents: number,
  ): Promise<PaymentResult> {
    const name = 'patientName' in input ? input.patientName : input.clinicName
    const cpfCnpj = 'cpf' in input ? input.cpf : input.cpfCnpj
    const externalRef = 'patientId' in input
      ? (input as PatientPaymentInput).patientId
      : (input as ClinicSubscriptionInput).clinicId

    if (input.paymentMethod === 'pix') {
      // InfinitPay: POST /charges com payment_method=pix
      const data = await ipRequest('/charges', 'POST', {
        amount: amountCents,
        currency: 'BRL',
        payment_method: 'pix',
        pix: { expiration_date: new Date(Date.now() + 3600_000).toISOString() },
        description: 'patientId' in input
          ? `Protocolo PADCOM ${(input as PatientPaymentInput).tier}`
          : `PADCOM ${(input as ClinicSubscriptionInput).plan}`,
        customer: { name, email: input.email, document: cpfCnpj.replace(/\D/g, '') },
        metadata: { external_reference: externalRef },
      })

      return {
        id: data.id,
        status: mapStatus(data.status),
        gateway: 'infinitpay',
        method: 'pix',
        amountCents,
        pixQrCode: data.pix?.qr_code_base64,
        pixCopyPaste: data.pix?.qr_code,
        externalRef,
        rawResponse: data,
      }
    }

    if (input.paymentMethod === 'credit_card') {
      if (!input.cardToken) throw new Error('cardToken obrigatório para credit_card no InfinitPay')
      const installments = 'installments' in input ? (input as PatientPaymentInput).installments ?? 1 : 1

      const data = await ipRequest('/charges', 'POST', {
        amount: amountCents,
        currency: 'BRL',
        payment_method: 'credit_card',
        card: { token: input.cardToken },
        installments,
        description: 'patientId' in input
          ? `Protocolo PADCOM ${(input as PatientPaymentInput).tier}`
          : `PADCOM ${(input as ClinicSubscriptionInput).plan}`,
        customer: { name, email: input.email, document: cpfCnpj.replace(/\D/g, '') },
        metadata: { external_reference: externalRef },
      })

      return {
        id: data.id,
        status: mapStatus(data.status),
        gateway: 'infinitpay',
        method: 'credit_card',
        amountCents,
        externalRef,
        rawResponse: data,
      }
    }

    throw new Error(`InfinitPay não suporta método: ${input.paymentMethod}`)
  }

  async createSubscription(input: ClinicSubscriptionInput): Promise<PaymentResult> {
    // InfinitPay não tem endpoint nativo de assinatura recorrente
    // Estratégia: cria cobrança + agenda webhook para renovação mensal via cron
    const { SAAS_PRICES } = await import('./types')
    const amountCents = SAAS_PRICES[input.plan][input.billingCycle]

    const charge = await this.createCharge(input, amountCents)
    return {
      ...charge,
      subscriptionId: `manual-${input.clinicId}`, // gerenciado pelo seu backend
    }
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const data = await ipRequest(`/charges/${paymentId}`)
    return mapStatus(data.status)
  }

  async cancel(paymentId: string): Promise<boolean> {
    try {
      await ipRequest(`/charges/${paymentId}/cancel`, 'POST')
      return true
    } catch {
      return false
    }
  }

  parseWebhook(body: unknown, headers: Record<string, string>): WebhookEvent | null {
    // InfinitPay: valida via shared secret no header X-InfinitPay-Signature
    const expectedSig = process.env.INFINITPAY_WEBHOOK_SECRET ?? ''
    const receivedSig = headers['x-infinitpay-signature'] ?? ''
    if (expectedSig && receivedSig !== expectedSig) return null

    const b = body as Record<string, unknown>
    if (!b?.event || !b?.data) return null

    const data = b.data as Record<string, unknown>
    const eventMap: Record<string, WebhookEvent['event']> = {
      'charge.approved': 'paid',
      'charge.declined': 'failed',
      'charge.cancelled': 'cancelled',
      'charge.refunded': 'refunded',
      'charge.chargeback': 'chargeback',
    }

    const mapped = eventMap[b.event as string]
    if (!mapped) return null

    return {
      gateway: 'infinitpay',
      event: mapped,
      paymentId: String(data.id),
      externalRef: (data.metadata as Record<string, string>)?.external_reference,
      amountCents: data.amount ? Number(data.amount) : undefined,
      rawPayload: body,
    }
  }
}
