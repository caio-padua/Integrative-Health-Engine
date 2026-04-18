import { useState, useCallback } from 'react'

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card'
export type GatewayName = 'asaas' | 'mercadopago' | 'stripe' | 'infinitpay'
export type ProtocolTier = 'basico' | 'intermediario' | 'avancado' | 'full'
export type PaymentStatus = 'idle' | 'loading' | 'awaiting_payment' | 'paid' | 'failed' | 'cancelled'

export interface PaymentResult {
  id: string
  status: string
  gateway: GatewayName
  method: PaymentMethod
  amountCents: number
  pixQrCode?: string
  pixCopyPaste?: string
  boletoUrl?: string
  boletoBarcode?: string
  boletoExpires?: string
  checkoutUrl?: string
  subscriptionId?: string
}

interface UsePaymentOptions {
  apiBase?: string
  onPaid?: (result: PaymentResult) => void
  onFailed?: (error: string) => void
}

interface PatientPayload {
  patientId: string
  patientName: string
  email: string
  cpf: string
  phone?: string
  tier: ProtocolTier
  gateway: GatewayName
  paymentMethod: PaymentMethod
  installments?: number
  cardToken?: string
}

interface ClinicPayload {
  clinicId: string
  clinicName: string
  email: string
  cpfCnpj: string
  phone?: string
  plan: 'starter' | 'pro' | 'enterprise'
  billingCycle: 'monthly' | 'annual'
  gateway: GatewayName
  paymentMethod: PaymentMethod
  cardToken?: string
}

export function usePayment(options: UsePaymentOptions = {}) {
  const { apiBase = '/api/payments', onPaid, onFailed } = options

  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollingTimer, setPollingTimer] = useState<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      setPollingTimer(null)
    }
  }, [pollingTimer])

  // Polling de status — útil para PIX e boleto (pagamento assíncrono)
  const startPolling = useCallback(
    (gateway: GatewayName, paymentId: string, intervalMs = 5000) => {
      const timer = setInterval(async () => {
        try {
          const res = await fetch(`${apiBase}/${gateway}/${paymentId}/status`)
          const data = await res.json()
          if (data.status === 'paid') {
            stopPolling()
            setStatus('paid')
            if (result) onPaid?.(result)
          } else if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'expired') {
            stopPolling()
            setStatus('failed')
            onFailed?.(data.status)
          }
        } catch {
          // falha silenciosa — tentativa na próxima iteração
        }
      }, intervalMs)
      setPollingTimer(timer)
    },
    [apiBase, onPaid, onFailed, result, stopPolling],
  )

  const chargePatient = useCallback(
    async (payload: PatientPayload) => {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch(`${apiBase}/patient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Erro ao processar pagamento')
        }
        const data: PaymentResult = await res.json()
        setResult(data)

        if (data.status === 'paid') {
          setStatus('paid')
          onPaid?.(data)
        } else {
          setStatus('awaiting_payment')
          // PIX e boleto: inicia polling
          if (payload.paymentMethod === 'pix' || payload.paymentMethod === 'boleto') {
            startPolling(payload.gateway, data.id)
          }
        }

        return data
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
        setStatus('failed')
        onFailed?.(msg)
        return null
      }
    },
    [apiBase, onPaid, onFailed, startPolling],
  )

  const subscribeClinic = useCallback(
    async (payload: ClinicPayload) => {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch(`${apiBase}/clinic/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Erro ao criar assinatura')
        }
        const data: PaymentResult = await res.json()
        setResult(data)
        setStatus(data.status === 'paid' ? 'paid' : 'awaiting_payment')

        if (data.status === 'paid') {
          onPaid?.(data)
        } else if (payload.paymentMethod === 'pix') {
          startPolling(payload.gateway, data.id)
        }

        return data
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
        setStatus('failed')
        onFailed?.(msg)
        return null
      }
    },
    [apiBase, onPaid, onFailed, startPolling],
  )

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [stopPolling])

  return {
    status,
    result,
    error,
    chargePatient,
    subscribeClinic,
    reset,
    stopPolling,
    isLoading: status === 'loading',
    isAwaitingPayment: status === 'awaiting_payment',
    isPaid: status === 'paid',
    isFailed: status === 'failed',
  }
}
