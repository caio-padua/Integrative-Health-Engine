import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePayment } from '@/hooks/use-payment'
import type { GatewayName, ProtocolTier, PaymentMethod } from '@/hooks/use-payment'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PatientCheckoutProps {
  mode: 'patient'
  patientId: string
  patientName: string
  email: string
  cpf: string
  phone?: string
  tier: ProtocolTier
}

interface ClinicCheckoutProps {
  mode: 'clinic'
  clinicId: string
  clinicName: string
  email: string
  cpfCnpj: string
  plan: 'starter' | 'pro' | 'enterprise'
  billingCycle: 'monthly' | 'annual'
}

type CheckoutProps = (PatientCheckoutProps | ClinicCheckoutProps) & {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GATEWAY_LABELS: Record<GatewayName, string> = {
  asaas: 'Asaas',
  mercadopago: 'Mercado Pago',
  stripe: 'Stripe',
  infinitpay: 'InfinitPay',
}

const GATEWAY_METHODS: Record<GatewayName, PaymentMethod[]> = {
  asaas: ['pix', 'boleto', 'credit_card'],
  mercadopago: ['pix', 'boleto', 'credit_card'],
  stripe: ['pix', 'boleto', 'credit_card'],
  infinitpay: ['pix', 'credit_card'],
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  boleto: 'Boleto bancário',
  credit_card: 'Cartão de crédito',
}

const TIER_LABELS: Record<ProtocolTier, { label: string; price: string }> = {
  basico:        { label: 'Plano Básico',        price: 'R$ 297,00' },
  intermediario: { label: 'Plano Intermediário',  price: 'R$ 597,00' },
  avancado:      { label: 'Plano Avançado',       price: 'R$ 997,00' },
  full:          { label: 'Plano Completo',        price: 'R$ 1.497,00' },
}

const PLAN_LABELS = {
  starter:    { label: 'Starter',    monthly: 'R$ 297,00/mês',  annual: 'R$ 267,00/mês' },
  pro:        { label: 'Pro',        monthly: 'R$ 597,00/mês',  annual: 'R$ 537,00/mês' },
  enterprise: { label: 'Enterprise', monthly: 'R$ 1.497,00/mês', annual: 'R$ 1.347,00/mês' },
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PixDisplay({ qrCode, copyPaste }: { qrCode?: string; copyPaste?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!copyPaste) return
    navigator.clipboard.writeText(copyPaste).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {qrCode && (
        <div className="rounded-lg border border-border p-3 bg-white">
          <img src={`data:image/svg+xml;base64,${qrCode}`} alt="QR Code PIX" className="w-48 h-48" onError={(e) => {
            // Tenta como PNG se SVG falhar
            (e.target as HTMLImageElement).src = `data:image/png;base64,${qrCode}`
          }} />
        </div>
      )}
      <p className="text-sm text-muted-foreground text-center">
        Escaneie o QR Code ou use o Pix Copia e Cola
      </p>
      {copyPaste && (
        <Button variant="outline" size="sm" onClick={copy} className="w-full font-mono text-xs">
          {copied ? 'Copiado!' : 'Copiar código Pix'}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">O pagamento é confirmado automaticamente em segundos.</p>
    </div>
  )
}

function BoletoDisplay({ url, barcode, expires }: { url?: string; barcode?: string; expires?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!barcode) return
    navigator.clipboard.writeText(barcode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {url && (
        <Button asChild className="w-full">
          <a href={url} target="_blank" rel="noopener noreferrer">Abrir boleto em PDF</a>
        </Button>
      )}
      {barcode && (
        <Button variant="outline" size="sm" onClick={copy} className="font-mono text-xs">
          {copied ? 'Copiado!' : 'Copiar código de barras'}
        </Button>
      )}
      {expires && (
        <p className="text-xs text-muted-foreground text-center">
          Vencimento: {new Date(expires).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}

function AwaitingPayment({ method, result }: { method: PaymentMethod; result: ReturnType<typeof usePayment>['result'] }) {
  if (!result) return null
  if (method === 'pix') return <PixDisplay qrCode={result.pixQrCode} copyPaste={result.pixCopyPaste} />
  if (method === 'boleto') return <BoletoDisplay url={result.boletoUrl} barcode={result.boletoBarcode} expires={result.boletoExpires} />
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Processando pagamento no cartão...</p>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function PaymentModal(props: CheckoutProps) {
  const { open, onClose, onSuccess, mode } = props

  const [selectedGateway, setSelectedGateway] = useState<GatewayName>('asaas')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix')
  const [installments, setInstallments] = useState(1)

  const { status, result, error, chargePatient, subscribeClinic, isLoading } = usePayment({
    onPaid: () => { onSuccess() },
  })

  const availableMethods = GATEWAY_METHODS[selectedGateway]

  function handleSelectGateway(g: GatewayName) {
    setSelectedGateway(g)
    const methods = GATEWAY_METHODS[g]
    if (!methods.includes(selectedMethod)) setSelectedMethod(methods[0])
  }

  async function handlePay() {
    if (mode === 'patient') {
      await chargePatient({
        patientId: props.patientId,
        patientName: props.patientName,
        email: props.email,
        cpf: props.cpf,
        phone: props.phone,
        tier: props.tier,
        gateway: selectedGateway,
        paymentMethod: selectedMethod,
        installments: selectedMethod === 'credit_card' ? installments : 1,
      })
    } else {
      await subscribeClinic({
        clinicId: props.clinicId,
        clinicName: props.clinicName,
        email: props.email,
        cpfCnpj: props.cpfCnpj,
        plan: props.plan,
        billingCycle: props.billingCycle,
        gateway: selectedGateway,
        paymentMethod: selectedMethod,
      })
    }
  }

  const priceLabel = mode === 'patient'
    ? TIER_LABELS[props.tier].price
    : PLAN_LABELS[props.plan][props.billingCycle]

  const titleLabel = mode === 'patient'
    ? TIER_LABELS[props.tier].label
    : `${PLAN_LABELS[props.plan].label} — ${props.billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">{titleLabel}</DialogTitle>
          <p className="text-2xl font-medium text-foreground pt-1">{priceLabel}</p>
        </DialogHeader>

        {status === 'idle' || status === 'loading' ? (
          <div className="flex flex-col gap-5">
            {/* Seleção de gateway */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Forma de recebimento</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(GATEWAY_LABELS) as GatewayName[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => handleSelectGateway(g)}
                    className={`text-sm rounded-md border px-3 py-2 text-left transition-colors
                      ${selectedGateway === g
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    {GATEWAY_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            {/* Seleção de método */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Método de pagamento</p>
              <div className="flex flex-col gap-2">
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`text-sm rounded-md border px-3 py-2.5 text-left transition-colors
                      ${selectedMethod === m
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Parcelamento (só cartão) */}
            {selectedMethod === 'credit_card' && mode === 'patient' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Parcelas</p>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  {[1, 2, 3, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? 'À vista' : `${n}x sem juros`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Button onClick={handlePay} disabled={isLoading} className="w-full">
              {isLoading ? 'Processando...' : `Pagar com ${METHOD_LABELS[selectedMethod]}`}
            </Button>
          </div>
        ) : status === 'awaiting_payment' ? (
          <AwaitingPayment method={selectedMethod} result={result} />
        ) : status === 'paid' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 text-xl">✓</span>
            </div>
            <p className="font-medium">Pagamento confirmado</p>
            <p className="text-sm text-muted-foreground text-center">
              Seu protocolo estará disponível em instantes.
            </p>
            <Button className="w-full mt-2" onClick={onSuccess}>Continuar</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-destructive">{error ?? 'Pagamento não concluído.'}</p>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
