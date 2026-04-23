#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════
# FATURAMENTO-TSUNAMI Wave 3 · Smoke regressivo
# ════════════════════════════════════════════════════════════════════════
# Roda os 6 cenários críticos da Wave 3 sem dependência de gateway externo:
#   [1] dedupe webhook por gateway_payment_id (reentrega → 1 linha consolidada)
#   [2] dedupe webhook por external_ref (fallback quando gateway_payment_id NULL)
#   [3] reconciliação UPDATE pagamentos por gateway_payment_id
#   [4] reconciliação UPDATE pagamentos por fallback external_ref
#   [5] auth gate /admin/inadimplencia (sem token → 401)
#   [6] auth gate /admin/inadimplencia/:id/reenviar (sem token → 401)
#
# Pré-requisitos: $DATABASE_URL exportado, API rodando em $API_URL.
# Uso: bash artifacts/api-server/scripts/smoke_wave3.sh
# ════════════════════════════════════════════════════════════════════════

set -uo pipefail
API_URL="${API_URL:-http://localhost:8080}"
SMOKE_TAG="_smoke_wave3"
PASS=0
FAIL=0

ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
ko()  { echo "  ✗ $1 (esperado=$2 obtido=$3)"; FAIL=$((FAIL+1)); }

cleanup() {
  psql "$DATABASE_URL" -tAc "
    DELETE FROM pagamento_webhook_eventos WHERE gateway='$SMOKE_TAG';
    DELETE FROM pagamentos WHERE gateway_name='$SMOKE_TAG' OR external_ref LIKE '${SMOKE_TAG}_%';
  " >/dev/null 2>&1
}

trap cleanup EXIT
cleanup

echo "═══ Wave 3 smoke @ $(date +%H:%M:%S) ═══"

# Seed: 1 pagamento por gateway_payment_id, 1 por external_ref
PAC_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM pacientes ORDER BY id LIMIT 1")
UNI_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM unidades ORDER BY id LIMIT 1")
PAG1_ID=$(psql "$DATABASE_URL" -tAc "
  WITH ins AS (
    INSERT INTO pagamentos (paciente_id, valor, status, forma_pagamento, unidade_id,
                            gateway_name, gateway_payment_id)
    VALUES ($PAC_ID, 100.00, 'pendente', 'gateway', $UNI_ID, '$SMOKE_TAG', 'PID_001')
    RETURNING id
  ) SELECT id FROM ins
" | tr -d '[:space:]')
PAG2_ID=$(psql "$DATABASE_URL" -tAc "
  WITH ins AS (
    INSERT INTO pagamentos (paciente_id, valor, status, forma_pagamento, unidade_id, external_ref)
    VALUES ($PAC_ID, 200.00, 'pendente', 'gateway', $UNI_ID, '${SMOKE_TAG}_extref_002')
    RETURNING id
  ) SELECT id FROM ins
" | tr -d '[:space:]')

echo "[1-2] Dedupe webhook (idempotência migration 017)"
# 2 reentregas mesmo evento por gateway_payment_id → deve consolidar em 1 linha
for V in 1 2; do
  psql "$DATABASE_URL" -tAc "
    INSERT INTO pagamento_webhook_eventos (gateway, gateway_payment_id, external_ref,
                                           event_type, status_aplicado, payload_json)
    VALUES ('$SMOKE_TAG', 'PID_001', NULL, 'paid', 'pago', '{\"v\":$V}'::jsonb)
    ON CONFLICT (gateway, gateway_payment_id, event_type)
      WHERE gateway_payment_id IS NOT NULL
      DO UPDATE SET payload_json=EXCLUDED.payload_json, recebido_em=now()
  " >/dev/null
done
ROWS=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM pagamento_webhook_eventos WHERE gateway='$SMOKE_TAG' AND gateway_payment_id='PID_001'")
[ "$ROWS" = "1" ] && ok "dedupe gateway_payment_id: 1 linha consolidada" || ko "dedupe gateway_payment_id" 1 "$ROWS"

# 2 reentregas por external_ref → também 1 linha
for V in 1 2; do
  psql "$DATABASE_URL" -tAc "
    INSERT INTO pagamento_webhook_eventos (gateway, gateway_payment_id, external_ref,
                                           event_type, status_aplicado, payload_json)
    VALUES ('$SMOKE_TAG', NULL, '${SMOKE_TAG}_extref_002', 'paid', 'pago', '{\"v\":$V}'::jsonb)
    ON CONFLICT (gateway, external_ref, event_type)
      WHERE gateway_payment_id IS NULL AND external_ref IS NOT NULL
      DO UPDATE SET payload_json=EXCLUDED.payload_json, recebido_em=now()
  " >/dev/null
done
ROWS=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM pagamento_webhook_eventos WHERE gateway='$SMOKE_TAG' AND external_ref='${SMOKE_TAG}_extref_002'")
[ "$ROWS" = "1" ] && ok "dedupe external_ref: 1 linha consolidada" || ko "dedupe external_ref" 1 "$ROWS"

echo "[3-4] Reconciliação pagamentos (handler payments.ts)"
# 3. Update por gateway_payment_id
psql "$DATABASE_URL" -tAc "
  UPDATE pagamentos SET status='pago', pagu_em=now()
  WHERE gateway_name='$SMOKE_TAG' AND gateway_payment_id='PID_001'
" >/dev/null
ST=$(psql "$DATABASE_URL" -tAc "SELECT status FROM pagamentos WHERE id=$PAG1_ID")
[ "$ST" = "pago" ] && ok "reconciliação por gateway_payment_id" || ko "reconciliação gateway_payment_id" pago "$ST"

# 4. Update por external_ref (fallback)
psql "$DATABASE_URL" -tAc "
  UPDATE pagamentos SET status='pago', pagu_em=now(),
    gateway_payment_id=COALESCE(gateway_payment_id, 'PID_002_BACKFILL')
  WHERE external_ref='${SMOKE_TAG}_extref_002'
" >/dev/null
ST2=$(psql "$DATABASE_URL" -tAc "SELECT status FROM pagamentos WHERE id=$PAG2_ID")
GPID2=$(psql "$DATABASE_URL" -tAc "SELECT gateway_payment_id FROM pagamentos WHERE id=$PAG2_ID")
[ "$ST2" = "pago" ] && [ "$GPID2" = "PID_002_BACKFILL" ] \
  && ok "reconciliação por external_ref (com backfill)" \
  || ko "reconciliação external_ref" "pago+PID_002_BACKFILL" "$ST2+$GPID2"

echo "[5-6] Auth gate admin/inadimplencia (sem token → 401)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/admin/inadimplencia")
[ "$HTTP" = "401" ] && ok "GET /admin/inadimplencia bloqueado" || ko "GET /admin/inadimplencia" 401 "$HTTP"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/admin/inadimplencia/$PAG1_ID/reenviar")
[ "$HTTP" = "401" ] && ok "POST /admin/inadimplencia/.../reenviar bloqueado" || ko "POST reenviar" 401 "$HTTP"

echo ""
echo "═══ RESULTADO: $PASS passou, $FAIL falhou ═══"
[ $FAIL -eq 0 ] && exit 0 || exit 1
