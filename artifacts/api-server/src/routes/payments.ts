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

      // ── FATURAMENTO-TSUNAMI Wave 3 · Reconciliação real + auditoria ──
      // 1. Audita evento bruto em pagamento_webhook_eventos (idempotente).
      // 2. Localiza pagamento por gateway+payment_id OU external_ref.
      // 3. Atualiza status (mapeando finalStatus → 'pago'|'pendente'|'cancelado'|'falhou').
      const statusMapDb: Record<string, string> = {
        paid: 'pago', failed: 'falhou', cancelled: 'cancelado',
        refunded: 'cancelado', expired: 'cancelado', pending: 'pendente',
      }
      const statusDb = statusMapDb[finalStatus] || 'pendente'

      const { db } = await import('@workspace/db')
      const { sql } = await import('drizzle-orm')

      // Audita primeiro (sempre) — antes de qualquer falha de update.
      await db.execute(sql`
        INSERT INTO pagamento_webhook_eventos
          (gateway, gateway_payment_id, external_ref, event_type, status_aplicado, payload_json)
        VALUES
          (${gateway}, ${event.paymentId ?? null}, ${event.externalRef ?? null},
           ${finalStatus}, ${statusDb}, ${JSON.stringify(event)}::jsonb)
      `)

      // Reconcilia: prioriza gateway_payment_id, fallback external_ref.
      let updated = 0
      if (event.paymentId) {
        const r = await db.execute(sql`
          UPDATE pagamentos
          SET status        = ${statusDb},
              gateway_name  = COALESCE(gateway_name, ${gateway}),
              pagu_em       = CASE WHEN ${statusDb} = 'pago' THEN now() ELSE pagu_em END,
              atualizado_em = now()
          WHERE gateway_name = ${gateway} AND gateway_payment_id = ${event.paymentId}
        `)
        updated = (r as any).rowCount ?? 0
      }
      if (updated === 0 && event.externalRef) {
        const r2 = await db.execute(sql`
          UPDATE pagamentos
          SET status             = ${statusDb},
              gateway_name       = COALESCE(gateway_name, ${gateway}),
              gateway_payment_id = COALESCE(gateway_payment_id, ${event.paymentId ?? null}),
              pagu_em            = CASE WHEN ${statusDb} = 'pago' THEN now() ELSE pagu_em END,
              atualizado_em      = now()
          WHERE external_ref = ${event.externalRef}
        `)
        updated = (r2 as any).rowCount ?? 0
      }

      await db.execute(sql`
        UPDATE pagamento_webhook_eventos
        SET processado_em = now()
        WHERE id = (SELECT MAX(id) FROM pagamento_webhook_eventos
                    WHERE gateway = ${gateway}
                      AND COALESCE(gateway_payment_id,'') = COALESCE(${event.paymentId ?? null},'')
                      AND COALESCE(external_ref,'')      = COALESCE(${event.externalRef ?? null},''))
      `)

      console.log('[webhook]', gateway, finalStatus, event.paymentId, event.externalRef, 'updated=', updated)

      res.status(200).json({ received: true, event: finalStatus, status_db: statusDb, updated })
    } catch (err) {
      console.error('[webhook error]', gateway, err)
      // Retorna 500 para o gateway retentar
      res.status(500).json({ error: (err as Error).message })
    }
  },
)

export default router
