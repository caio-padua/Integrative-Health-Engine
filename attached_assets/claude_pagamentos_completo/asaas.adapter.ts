import type {
  PaymentGateway,
  PaymentResult,
  PaymentStatus,
  WebhookEvent,
  PatientPaymentInput,
  ClinicSubscriptionInput,
  GatewayName,
} from './types'

const BASE_URL = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3'

async function asaasRequest(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY ?? '',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

// Garante que o cliente exista (cria se não existir)
async function upsertCustomer(name: string, email: string, cpfCnpj: string, phone?: string) {
  // Busca por CPF/CNPJ
  const list = await asaasRequest(`/customers?cpfCnpj=${cpfCnpj.replace(/\D/g, '')}`)
  if (list.data?.length > 0) return list.data[0].id as string

  const created = await asaasRequest('/customers', 'POST', {
    name,
    email,
    cpfCnpj: cpfCnpj.replace(/\D/g, ''),
    mobilePhone: phone?.replace(/\D/g, ''),
    notificationDisabled: false,
  })
  return created.id as string
}

function mapStatus(s: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    PENDING: 'pending',
    AWAITING_RISK_ANALYSIS: 'processing',
    APPROVED_BY_RISK_ANALYSIS: 'processing',
    PAYMENT_APPROVED: 'paid',
    CONFIRMED: 'paid',
    RECEIVED: 'paid',
    CREDIT_CARD_CAPTURE_REFUSED: 'failed',
    AWAITING_CHARGEBACK_REVERSAL: 'failed',
    DUNNING_REQUESTED: 'failed',
    DUNNING_RECEIVED: 'failed',
    OVERDUE: 'expired',
    REFUNDED: 'refunded',
    REFUND_REQUESTED: 'refunded',
    CHARGEBACK_REQUESTED: 'refunded',
    CHARGEBACK_DISPUTE: 'refunded',
    AWAITING_REFUND_REVERSAL: 'refunded',
    CANCELLED: 'cancelled',
  }
  return map[s] ?? 'pending'
}

function mapMethod(input: PatientPaymentInput | ClinicSubscriptionInput): string {
  const map: Record<string, string> = {
    pix: 'PIX',
    boleto: 'BOLETO',
    credit_card: 'CREDIT_CARD',
    debit_card: 'DEBIT_CARD',
  }
  return map[input.paymentMethod] ?? 'PIX'
}

export class AsaasAdapter implements PaymentGateway {
  name: GatewayName = 'asaas'

  async createCharge(
    input: PatientPaymentInput | ClinicSubscriptionInput,
    amountCents: number,
  ): Promise<PaymentResult> {
    const customerId = await upsertCustomer(
      'patientName' in input ? input.patientName : input.clinicName,
      input.email,
      'cpf' in input ? input.cpf : input.cpfCnpj,
      input.phone,
    )

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)

    const body: Record<string, unknown> = {
      customer: customerId,
      billingType: mapMethod(input),
      value: amountCents / 100,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: 'patientId' in input
        ? `Protocolo PADCOM — ${(input as PatientPaymentInput).tier}`
        : `Assinatura PADCOM ${(input as ClinicSubscriptionInput).plan}`,
      externalReference: 'patientId' in input
        ? (input as PatientPaymentInput).patientId
        : (input as ClinicSubscriptionInput).clinicId,
    }

    if (input.paymentMethod === 'credit_card' && input.cardToken) {
      body.creditCardToken = input.cardToken
      if ('installments' in input && (input as PatientPaymentInput).installments) {
        body.installmentCount = (input as PatientPaymentInput).installments
        body.installmentValue = amountCents / 100 / ((input as PatientPaymentInput).installments ?? 1)
        body.totalValue = amountCents / 100
      }
    }

    const data = await asaasRequest('/payments', 'POST', body)

    const result: PaymentResult = {
      id: data.id,
      status: mapStatus(data.status),
      gateway: 'asaas',
      method: input.paymentMethod,
      amountCents,
      externalRef: String(body.externalReference),
      rawResponse: data,
    }

    if (input.paymentMethod === 'pix') {
      const pixData = await asaasRequest(`/payments/${data.id}/pixQrCode`)
      result.pixQrCode = pixData.encodedImage
      result.pixCopyPaste = pixData.payload
    }

    if (input.paymentMethod === 'boleto') {
      result.boletoUrl = data.bankSlipUrl
      result.boletoBarcode = data.nossoNumero
      result.boletoExpires = dueDate.toISOString().slice(0, 10)
    }

    return result
  }

  async createSubscription(input: ClinicSubscriptionInput): Promise<PaymentResult> {
    const customerId = await upsertCustomer(
      input.clinicName,
      input.email,
      input.cpfCnpj,
      input.phone,
    )

    const { SAAS_PRICES } = await import('./types')
    const price = SAAS_PRICES[input.plan][input.billingCycle]

    const data = await asaasRequest('/subscriptions', 'POST', {
      customer: customerId,
      billingType: mapMethod(input),
      value: price / 100,
      nextDueDate: new Date().toISOString().slice(0, 10),
      cycle: input.billingCycle === 'monthly' ? 'MONTHLY' : 'YEARLY',
      description: `PADCOM ${input.plan} — ${input.billingCycle}`,
      externalReference: input.clinicId,
      ...(input.cardToken ? { creditCardToken: input.cardToken } : {}),
    })

    const result: PaymentResult = {
      id: data.id,
      status: 'pending',
      gateway: 'asaas',
      method: input.paymentMethod,
      amountCents: price,
      subscriptionId: data.id,
      externalRef: input.clinicId,
      rawResponse: data,
    }

    if (data.payments?.length) {
      const firstPayment = data.payments[0]
      if (input.paymentMethod === 'pix') {
        const pixData = await asaasRequest(`/payments/${firstPayment.id}/pixQrCode`)
        result.pixQrCode = pixData.encodedImage
        result.pixCopyPaste = pixData.payload
      }
      if (input.paymentMethod === 'boleto') {
        result.boletoUrl = firstPayment.bankSlipUrl
      }
    }

    return result
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const data = await asaasRequest(`/payments/${paymentId}`)
    return mapStatus(data.status)
  }

  async cancel(paymentId: string): Promise<boolean> {
    try {
      await asaasRequest(`/payments/${paymentId}`, 'DELETE')
      return true
    } catch {
      return false
    }
  }

  parseWebhook(body: unknown, _headers: Record<string, string>): WebhookEvent | null {
    const b = body as Record<string, unknown>
    if (!b?.event || !b?.payment) return null

    const payment = b.payment as Record<string, unknown>
    const eventMap: Record<string, WebhookEvent['event']> = {
      PAYMENT_RECEIVED: 'paid',
      PAYMENT_CONFIRMED: 'paid',
      PAYMENT_OVERDUE: 'expired',
      PAYMENT_DELETED: 'cancelled',
      PAYMENT_REFUNDED: 'refunded',
      PAYMENT_CHARGEBACK_REQUESTED: 'chargeback',
    }

    const mapped = eventMap[b.event as string]
    if (!mapped) return null

    return {
      gateway: 'asaas',
      event: mapped,
      paymentId: String(payment.id),
      externalRef: payment.externalReference ? String(payment.externalReference) : undefined,
      amountCents: payment.value ? Math.round((payment.value as number) * 100) : undefined,
      paidAt: payment.paymentDate as string | undefined,
      rawPayload: body,
    }
  }
}
