import type {
  PaymentGateway,
  PaymentResult,
  PaymentStatus,
  WebhookEvent,
  PatientPaymentInput,
  ClinicSubscriptionInput,
  GatewayName,
} from './types'

const BASE_URL = 'https://api.mercadopago.com'

async function mpRequest(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''}`,
      'X-Idempotency-Key': `padcom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`MP ${method} ${path} → ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

function mapStatus(s: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    pending: 'pending',
    in_process: 'processing',
    in_mediation: 'processing',
    approved: 'paid',
    rejected: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    charged_back: 'refunded',
  }
  return map[s] ?? 'pending'
}

function cpfToDoc(cpf: string) {
  return { type: 'CPF', number: cpf.replace(/\D/g, '') }
}

export class MercadoPagoAdapter implements PaymentGateway {
  name: GatewayName = 'mercadopago'

  async createCharge(
    input: PatientPaymentInput | ClinicSubscriptionInput,
    amountCents: number,
  ): Promise<PaymentResult> {
    const name = 'patientName' in input ? input.patientName : input.clinicName
    const cpfCnpj = 'cpf' in input ? input.cpf : input.cpfCnpj
    const externalRef = 'patientId' in input
      ? (input as PatientPaymentInput).patientId
      : (input as ClinicSubscriptionInput).clinicId

    const paymentMethodMap: Record<string, string> = {
      pix: 'pix',
      boleto: 'boleto',
      credit_card: 'credit_card',
      debit_card: 'debit_card',
    }

    const body: Record<string, unknown> = {
      transaction_amount: amountCents / 100,
      description: 'patientId' in input
        ? `Protocolo PADCOM — ${(input as PatientPaymentInput).tier}`
        : `PADCOM ${(input as ClinicSubscriptionInput).plan}`,
      payment_method_id: paymentMethodMap[input.paymentMethod],
      payer: {
        email: input.email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || name,
        identification: cpfToDoc(cpfCnpj),
        phone: input.phone ? { number: input.phone.replace(/\D/g, '') } : undefined,
      },
      external_reference: externalRef,
      notification_url: `${process.env.API_PUBLIC_URL}/webhooks/mercadopago`,
    }

    if (input.paymentMethod === 'credit_card') {
      body.token = input.cardToken
      const installments = 'installments' in input ? (input as PatientPaymentInput).installments ?? 1 : 1
      body.installments = installments
    }

    if (input.paymentMethod === 'boleto') {
      const exp = new Date()
      exp.setDate(exp.getDate() + 3)
      body.date_of_expiration = exp.toISOString()
    }

    const data = await mpRequest('/v1/payments', 'POST', body)

    const result: PaymentResult = {
      id: String(data.id),
      status: mapStatus(data.status),
      gateway: 'mercadopago',
      method: input.paymentMethod,
      amountCents,
      externalRef,
      rawResponse: data,
    }

    if (input.paymentMethod === 'pix' && data.point_of_interaction?.transaction_data) {
      result.pixQrCode = data.point_of_interaction.transaction_data.qr_code_base64
      result.pixCopyPaste = data.point_of_interaction.transaction_data.qr_code
    }

    if (input.paymentMethod === 'boleto' && data.transaction_details) {
      result.boletoUrl = data.transaction_details.external_resource_url
      result.boletoBarcode = data.barcode?.content
      result.boletoExpires = data.date_of_expiration?.slice(0, 10)
    }

    if (data.point_of_interaction?.transaction_data?.ticket_url) {
      result.checkoutUrl = data.point_of_interaction.transaction_data.ticket_url
    }

    return result
  }

  async createSubscription(input: ClinicSubscriptionInput): Promise<PaymentResult> {
    const { SAAS_PRICES } = await import('./types')
    const amountCents = SAAS_PRICES[input.plan][input.billingCycle]
    const name = input.clinicName

    // MP usa preapproval para assinaturas recorrentes
    const data = await mpRequest('/preapproval', 'POST', {
      back_url: `${process.env.FRONTEND_URL}/admin/billing`,
      reason: `PADCOM ${input.plan} — ${input.billingCycle}`,
      auto_recurring: {
        frequency: input.billingCycle === 'monthly' ? 1 : 12,
        frequency_type: 'months',
        transaction_amount: amountCents / 100,
        currency_id: 'BRL',
      },
      payer_email: input.email,
      external_reference: input.clinicId,
      notification_url: `${process.env.API_PUBLIC_URL}/webhooks/mercadopago`,
      ...(input.cardToken ? { card_token_id: input.cardToken } : {}),
    })

    return {
      id: data.id,
      status: data.status === 'authorized' ? 'paid' : 'pending',
      gateway: 'mercadopago',
      method: input.paymentMethod,
      amountCents,
      subscriptionId: data.id,
      checkoutUrl: data.init_point,
      externalRef: input.clinicId,
      rawResponse: data,
    }
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const data = await mpRequest(`/v1/payments/${paymentId}`)
    return mapStatus(data.status)
  }

  async cancel(paymentId: string): Promise<boolean> {
    try {
      await mpRequest(`/v1/payments/${paymentId}`, 'PUT', { status: 'cancelled' })
      return true
    } catch {
      return false
    }
  }

  parseWebhook(body: unknown, _headers: Record<string, string>): WebhookEvent | null {
    const b = body as Record<string, unknown>
    if (b?.type !== 'payment' || !b?.data) return null

    const eventMap: Record<string, WebhookEvent['event']> = {
      approved: 'paid',
      rejected: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      charged_back: 'chargeback',
    }

    // MP manda apenas o ID — precisamos buscar o status real
    const paymentId = String((b.data as Record<string, unknown>).id)
    // Retorna evento parcial; a rota de webhook chama getStatus() para completar
    return {
      gateway: 'mercadopago',
      event: 'paid', // será sobrescrito após getStatus()
      paymentId,
      rawPayload: body,
    }
  }
}
