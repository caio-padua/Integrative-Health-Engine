// ─── Como integrar no seu api-server/index.ts existente ─────────────────────
//
// 1. Instale as dependências:
//    pnpm add stripe
//    (Asaas e Mercado Pago usam fetch nativo — sem SDK)
//    (InfinitPay usa fetch nativo — sem SDK)
//
// 2. Copie as pastas:
//    src/payments/        → dentro de artifacts/api-server/src/
//    src/payment.routes.ts → dentro de artifacts/api-server/src/
//    src/hooks/use-payment.ts → dentro de artifacts/padcom/src/hooks/
//    src/components/PaymentModal.tsx → dentro de artifacts/padcom/src/components/
//
// 3. No seu api-server/src/index.ts, adicione:

import express from 'express'
import paymentRoutes from './payment.routes'

const app = express()

// ── IMPORTANTE: Stripe precisa do raw body para validar assinatura de webhook ─
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }))

// ── Para todos os outros: parse JSON normal ───────────────────────────────────
app.use(express.json())

// ── Registra as rotas de pagamento ────────────────────────────────────────────
app.use('/api/payments', paymentRoutes)
app.use('/api/webhooks', paymentRoutes) // webhooks usam /api/webhooks/:gateway

app.listen(8080, () => console.log('API rodando na porta 8080'))

// ─── Como usar o PaymentModal no fluxo do paciente ───────────────────────────
//
// Em artifacts/padcom/src/pages/patient/summary.tsx, adicione:
//
// import { PaymentModal } from '@/components/PaymentModal'
// import { useState } from 'react'
//
// function SummaryPage() {
//   const [showPayment, setShowPayment] = useState(false)
//   const patient = useDraft() // ou seus dados reais
//   const band = getBand(score) // 'basico' | 'intermediario' | 'avancado' | 'full'
//
//   return (
//     <>
//       {/* ... resto do summary ... */}
//       <Button onClick={() => setShowPayment(true)}>
//         Contratar plano
//       </Button>
//
//       <PaymentModal
//         open={showPayment}
//         onClose={() => setShowPayment(false)}
//         onSuccess={() => { setShowPayment(false); navigate('/anamnese/obrigado') }}
//         mode="patient"
//         patientId={patient.id}
//         patientName={patient.answers.DADO_IDEN_NOME_001}
//         email={patient.answers.email}
//         cpf={patient.answers.cpf}
//         tier={band}
//       />
//     </>
//   )
// }
//
// ─── Como usar o PaymentModal no onboarding da clínica ───────────────────────
//
// import { PaymentModal } from '@/components/PaymentModal'
//
// <PaymentModal
//   open={showPayment}
//   onClose={() => setShowPayment(false)}
//   onSuccess={() => navigate('/admin')}
//   mode="clinic"
//   clinicId="cli_abc123"
//   clinicName="Clínica Exemplo"
//   email="contato@clinica.com.br"
//   cpfCnpj="12.345.678/0001-99"
//   plan="pro"
//   billingCycle="monthly"
// />
//
// ─── Webhooks — configure as URLs nos painéis de cada gateway ────────────────
//
// Asaas:        https://seu-app.replit.app/api/webhooks/asaas
// Mercado Pago: https://seu-app.replit.app/api/webhooks/mercadopago
// Stripe:       https://seu-app.replit.app/api/webhooks/stripe
// InfinitPay:   https://seu-app.replit.app/api/webhooks/infinitpay
//
// Todas as rotas retornam HTTP 200 para payloads não reconhecidos
// (evita retentativas desnecessárias dos gateways).
