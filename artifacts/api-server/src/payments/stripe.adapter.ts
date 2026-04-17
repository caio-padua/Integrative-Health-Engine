import type {
  PaymentGateway,
  PaymentResult,
  PaymentStatus,
  WebhookEvent,
  PatientPaymentInput,
  ClinicSubscriptionInput,
  GatewayName,
} from './types'
import Stripe from 'stripe'

let _stripe: Stripe | null = null
function stripeClient(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurado')
  _stripe = new Stripe(key)
  return _stripe
}
const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (stripeClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

function mapStatus(s: Stripe.PaymentIntent.Status | Stripe.Subscription.Status): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'pending',
    processing: 'processing',
    requires_capture: 'processing',
    succeeded: 'paid',
    canceled: 'cancelled',
    // Subscription statuses
    active: 'paid',
    past_due: 'failed',
    unpaid: 'failed',
    incomplete: 'pending',
    incomplete_expired: 'expired',
    trialing: 'pending',
    paused: 'cancelled',
  }
  return map[s] ?? 'pending'
}

async function upsertCustomer(
  name: string,
  email: string,
  metadata: Record<string, string>,
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id

  const customer = await stripe.customers.create({ name, email, metadata })
  return customer.id
}

// Mapa de plano+ciclo para Stripe Price ID (configure no dashboard Stripe)
function stripePriceId(plan: string, cycle: string): string {
  const key = `${plan}_${cycle}`.toUpperCase()
  const env = process.env[`STRIPE_PRICE_${key}`]
  if (!env) throw new Error(`Stripe Price ID não configurado: STRIPE_PRICE_${key}`)
  return env
}

export class StripeAdapter implements PaymentGateway {
  name: GatewayName = 'stripe'

  async createCharge(
    input: PatientPaymentInput | ClinicSubscriptionInput,
    amountCents: number,
  ): Promise<PaymentResult> {
    const name = 'patientName' in input ? input.patientName : input.clinicName
    const externalRef = 'patientId' in input
      ? (input as PatientPaymentInput).patientId
      : (input as ClinicSubscriptionInput).clinicId

    if (input.paymentMethod === 'pix') {
      // Stripe PIX via PaymentIntent + payment_method_types
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'brl',
        payment_method_types: ['pix'],
        pix_expire_after_seconds: 3600, // 1 hora
        metadata: { externalRef },
        receipt_email: input.email,
      })
      const confirmResult = await stripe.paymentIntents.confirm(pi.id)
      const pixDisplay = confirmResult.next_action?.pix_display_qr_code

      return {
        id: pi.id,
        status: mapStatus(pi.status),
        gateway: 'stripe',
        method: 'pix',
        amountCents,
        pixQrCode: pixDisplay?.image_url_svg,
        pixCopyPaste: pixDisplay?.data,
        externalRef,
        rawResponse: confirmResult,
      }
    }

    if (input.paymentMethod === 'boleto') {
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'brl',
        payment_method_types: ['boleto'],
        payment_method_data: {
          type: 'boleto',
          boleto: {
            tax_id: ('cpf' in input ? input.cpf : input.cpfCnpj).replace(/\D/g, ''),
          },
          billing_details: { name, email: input.email },
        },
        confirm: true,
        metadata: { externalRef },
      })
      const boleto = pi.next_action?.boleto_display_details

      return {
        id: pi.id,
        status: mapStatus(pi.status),
        gateway: 'stripe',
        method: 'boleto',
        amountCents,
        boletoUrl: boleto?.pdf,
        boletoBarcode: boleto?.number,
        boletoExpires: boleto?.expires_at
          ? new Date(boleto.expires_at * 1000).toISOString().slice(0, 10)
          : undefined,
        externalRef,
        rawResponse: pi,
      }
    }

    // Cartão de crédito
    if (!input.cardToken) throw new Error('cardToken obrigatório para credit_card no Stripe')

    const customerId = await upsertCustomer(name, input.email, { externalRef })
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: input.cardToken },
    })
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId })

    const installments = 'installments' in input ? (input as PatientPaymentInput).installments ?? 1 : 1

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'brl',
      customer: customerId,
      payment_method: paymentMethod.id,
      payment_method_options: {
        card: { installments: { enabled: true, plan: installments > 1
          ? { type: 'fixed_count', count: installments, interval: 'month' }
          : undefined,
        }},
      },
      confirm: true,
      metadata: { externalRef },
      receipt_email: input.email,
    })

    return {
      id: pi.id,
      status: mapStatus(pi.status),
      gateway: 'stripe',
      method: 'credit_card',
      amountCents,
      externalRef,
      rawResponse: pi,
    }
  }

  async createSubscription(input: ClinicSubscriptionInput): Promise<PaymentResult> {
    if (!input.cardToken) throw new Error('cardToken obrigatório para assinatura Stripe')

    const customerId = await upsertCustomer(input.clinicName, input.email, {
      clinicId: input.clinicId,
    })

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: input.cardToken },
    })
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId })
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    })

    const { SAAS_PRICES } = await import('./types')
    const amountCents = SAAS_PRICES[input.plan][input.billingCycle]

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId(input.plan, input.billingCycle) }],
      payment_settings: { payment_method_types: ['card'] },
      metadata: { clinicId: input.clinicId, plan: input.plan },
      expand: ['latest_invoice.payment_intent'],
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice
    const pi = invoice.payment_intent as Stripe.PaymentIntent

    return {
      id: pi?.id ?? subscription.id,
      status: mapStatus(subscription.status),
      gateway: 'stripe',
      method: 'credit_card',
      amountCents,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      externalRef: input.clinicId,
      rawResponse: subscription,
    }
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentId)
      return mapStatus(pi.status)
    } catch {
      const sub = await stripe.subscriptions.retrieve(paymentId)
      return mapStatus(sub.status)
    }
  }

  async cancel(paymentId: string): Promise<boolean> {
    try {
      await stripe.paymentIntents.cancel(paymentId)
      return true
    } catch {
      try {
        await stripe.subscriptions.cancel(paymentId)
        return true
      } catch {
        return false
      }
    }
  }

  parseWebhook(body: unknown, headers: Record<string, string>): WebhookEvent | null {
    const sig = headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        typeof body === 'string' ? body : JSON.stringify(body),
        sig,
        webhookSecret,
      )
    } catch {
      return null
    }

    const eventMap: Partial<Record<string, WebhookEvent['event']>> = {
      'payment_intent.succeeded': 'paid',
      'payment_intent.payment_failed': 'failed',
      'payment_intent.canceled': 'cancelled',
      'invoice.payment_succeeded': 'paid',
      'invoice.payment_failed': 'failed',
      'charge.refunded': 'refunded',
      'charge.dispute.created': 'chargeback',
    }

    const mapped = eventMap[event.type]
    if (!mapped) return null

    const obj = event.data.object as Record<string, unknown>

    return {
      gateway: 'stripe',
      event: mapped,
      paymentId: String(obj.id),
      externalRef: (obj.metadata as Record<string, string>)?.externalRef,
      amountCents: obj.amount ? Number(obj.amount) : undefined,
      rawPayload: event,
    }
  }
}
