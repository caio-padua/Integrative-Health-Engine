import express, { Request, Response, NextFunction } from 'express'
import { paymentService, availableGateways, isGatewayAvailable } from '../payments/payment.service'
import type { GatewayName, PatientPaymentInput, ClinicSubscriptionInput } from '../payments/types'

const router = express.Router()

// ─── Middleware de validação de gateway ──────────────────────────────────────

function requireGateway(req: Request, res: Response, next: NextFunction) {
  const gateway = req.params.gateway as GatewayName
  const valid: GatewayName[] = ['asaas', 'mercadopago', 'stripe', 'infinitpay']
  if (!valid.includes(gateway)) {
    res.status(400).json({ error: `Gateway inválido: ${gateway}` })
    return
  }
  if (!isGatewayAvailable(gateway)) {
    res.status(503).json({ error: `Gateway não configurado: ${gateway}` })
    return
  }
  next()
}

// ─── Info ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/payments/gateways
 * Retorna gateways disponíveis e preços para o front montar o checkout.
 */
router.get('/gateways', (_req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PROTOCOL_PRICES, SAAS_PRICES } = require('../payments/types')
  res.json({
    available: availableGateways(),
    protocolPrices: PROTOCOL_PRICES,  // em centavos
    saasPrices: SAAS_PRICES,
  })
})

// ─── B2C — Cobrança de paciente ───────────────────────────────────────────────

/**
 * POST /api/payments/patient
 * Body: PatientPaymentInput
 *
 * Criado após o paciente visualizar seu score e escolher o plano.
 * Retorna PaymentResult com QR Code PIX, URL do boleto ou status do cartão.
 */
router.post('/patient', async (req: Request, res: Response) => {
  try {
    const input = req.body as PatientPaymentInput
    if (!input.patientId || !input.tier || !input.gateway || !input.paymentMethod) {
      res.status(400).json({ error: 'Campos obrigatórios: patientId, tier, gateway, paymentMethod' })
      return
    }
    if (!isGatewayAvailable(input.gateway)) {
      res.status(503).json({ error: `Gateway não disponível: ${input.gateway}` })
      return
    }
    const result = await paymentService.chargePatient(input)
    res.json(result)
  } catch (err) {
    console.error('[payment/patient]', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// ─── B2B — Assinatura de clínica ──────────────────────────────────────────────

/**
 * POST /api/payments/clinic/subscribe
 * Body: ClinicSubscriptionInput
 *
 * Criado durante onboarding da clínica no painel admin.
 */
router.post('/clinic/subscribe', async (req: Request, res: Response) => {
  try {
    const input = req.body as ClinicSubscriptionInput
    if (!input.clinicId || !input.plan || !input.gateway || !input.billingCycle) {
      res.status(400).json({
        error: 'Campos obrigatórios: clinicId, plan, gateway, billingCycle',
      })
      return
    }
    if (!isGatewayAvailable(input.gateway)) {
      res.status(503).json({ error: `Gateway não disponível: ${input.gateway}` })
      return
    }
    const result = await paymentService.subscribeClinic(input)
    res.json(result)
  } catch (err) {
    console.error('[payment/clinic/subscribe]', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// ─── Status de cobrança ───────────────────────────────────────────────────────

/**
 * GET /api/payments/:gateway/:paymentId/status
 */
router.get(
  '/:gateway/:paymentId/status',
  requireGateway,
  async (req: Request, res: Response) => {
    try {
      const { gateway, paymentId } = req.params
      const status = await paymentService.getStatus(gateway as GatewayName, paymentId)
      res.json({ gateway, paymentId, status })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Cancelamento ─────────────────────────────────────────────────────────────

/**
 * POST /api/payments/:gateway/:paymentId/cancel
 */
router.post(
  '/:gateway/:paymentId/cancel',
  requireGateway,
  async (req: Request, res: Response) => {
    try {
      const { gateway, paymentId } = req.params
      const ok = await paymentService.cancel(gateway as GatewayName, paymentId)
      res.json({ ok })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/:gateway
 *
 * Cada gateway tem sua rota separada para facilitar validação de assinatura.
 * Stripe exige body como raw Buffer (não parse JSON antes).
 */
router.post(
  '/webhooks/:gateway',
  requireGateway,
  async (req: Request, res: Response) => {
    const gateway = req.params.gateway as GatewayName

    // Stripe precisa do body raw para verificar assinatura
    // (configure express.raw({ type: 'application/json' }) ANTES do router para /api/webhooks/stripe)
    const body = gateway === 'stripe' ? req.body.toString('utf8') : req.body
    const headers = req.headers as Record<string, string>

    const event = paymentService.parseWebhook(gateway, body, headers)

    if (!event) {
      // Retorna 200 para o gateway não retentar (payload não reconhecido é ok)
      res.status(200).json({ ignored: true })
      return
    }

    try {
      // Para Mercado Pago, o status vem numa segunda consulta
      let finalStatus = event.event
      if (gateway === 'mercadopago' && event.paymentId) {
        const s = await paymentService.getStatus('mercadopago', event.paymentId)
        const statusMap: Record<string, typeof event.event> = {
          paid: 'paid', failed: 'failed', cancelled: 'cancelled',
          refunded: 'refunded', expired: 'expired',
        }
        finalStatus = statusMap[s] ?? event.event
      }

      // ── Aqui você dispara a lógica de negócio ──────────────────────────────
      // Exemplos:
      //   1. Paciente pagou → atualiza funil para PAGO, libera protocolo
      //   2. Clínica pagou → ativa plano
      //   3. Falhou → notifica pelo WhatsApp / CRM
      // Substitua por chamada ao seu repositório real:
      console.log('[webhook]', gateway, finalStatus, event.paymentId, event.externalRef)
      // await db.payments.updateStatus(event.paymentId, finalStatus)
      // await funnelService.onPayment(event.externalRef, finalStatus)

      res.status(200).json({ received: true, event: finalStatus })
    } catch (err) {
      console.error('[webhook error]', gateway, err)
      // Retorna 500 para o gateway retentar
      res.status(500).json({ error: (err as Error).message })
    }
  },
)

export default router
