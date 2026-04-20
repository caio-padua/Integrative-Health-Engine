#!/usr/bin/env bash
# Regenera o MOEDOR INDUSTRIAL completo pra Claude Opus
# Uso: bash scripts/gerar-moedor.sh
set +e
OUT="exports/MOEDOR_INDUSTRIAL_OPUS.md"
echo "🍖 Gerando MOEDOR em $OUT..."
{
  echo "# 🍖 MOEDOR INDUSTRIAL — Pacote Total PADCON pra Opus Devorar"
  echo "**Gerado em:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Single-click context bomb.** Tudo que o Opus precisa em um arquivo."
  echo ""
  echo "## 1. 🧠 replit.md"
  echo '```markdown'; cat replit.md 2>/dev/null || echo "(sem replit.md)"; echo '```'
  echo ""
  echo "## 2. 📊 Schema completo (psql \\dt + \\d das tabelas críticas)"
  echo '```sql'
  psql "$DATABASE_URL" -c "\dt" 2>/dev/null
  for t in unidades pacientes appointments notas_fiscais_emitidas provedores_pagamento provedores_nfe unidade_gateway_credenciais unidade_nfe_credenciais nota_fiscal_eventos modulos_padcon eventos_cobraveis assinatura_padcon faturamento_padcon; do
    echo ""; echo "-- TABELA $t"; psql "$DATABASE_URL" -c "\d $t" 2>/dev/null
  done
  echo '```'
  echo ""
  echo "## 3. 🌱 Seeds vivos"
  echo '```sql'
  echo "-- Unidades:"; psql "$DATABASE_URL" -c "SELECT id, nome, cor, cnpj, logotipo_url FROM unidades ORDER BY id" 2>/dev/null
  echo "-- Provedores pagamento:"; psql "$DATABASE_URL" -c "SELECT codigo, nome_exibicao, status_integracao FROM provedores_pagamento" 2>/dev/null
  echo "-- Provedores NFe:"; psql "$DATABASE_URL" -c "SELECT codigo, nome_exibicao, recomendado FROM provedores_nfe" 2>/dev/null
  echo "-- Modulos PADCON:"; psql "$DATABASE_URL" -c "SELECT id, codigo, nome, valor_mensal FROM modulos_padcon ORDER BY id" 2>/dev/null
  echo "-- Eventos cobraveis:"; psql "$DATABASE_URL" -c "SELECT id, codigo, nome, valor_unitario FROM eventos_cobraveis ORDER BY id" 2>/dev/null
  echo '```'
  echo ""
  echo "## 4. 🔧 Backend NOVOS (WD#1+#3+#4+#5+#6)"
  for f in \
    artifacts/api-server/src/lib/crypto/credenciais.ts \
    artifacts/api-server/src/lib/nfe/adapters/types.ts \
    artifacts/api-server/src/lib/nfe/adapters/focus.ts \
    artifacts/api-server/src/lib/nfe/adapters/enotas.ts \
    artifacts/api-server/src/lib/recorrencia/cobrancaMensal.ts \
    artifacts/api-server/src/middlewares/requireAdminToken.ts \
    artifacts/api-server/src/routes/painelNfe.ts \
    artifacts/api-server/src/routes/credenciaisProvedores.ts \
    artifacts/api-server/src/routes/monetizacaoPadcon.ts \
    artifacts/api-server/src/routes/drivePawards.ts; do
    if [ -f "$f" ]; then
      echo ""; echo "### $f"; echo '```typescript'; cat "$f"; echo '```'
    fi
  done
  echo ""
  echo "## 5. 🎨 Frontend NOVOS"
  for f in \
    artifacts/clinica-motor/src/pages/painel-nfe.tsx \
    artifacts/clinica-motor/src/pages/gateways-pagamento.tsx \
    artifacts/clinica-motor/src/pages/credenciais-nfe.tsx \
    artifacts/clinica-motor/src/pages/monetizar.tsx; do
    if [ -f "$f" ]; then
      echo ""; echo "### $f"; echo '```tsx'; cat "$f"; echo '```'
    fi
  done
  echo ""
  echo "## 6. 📜 Git log (últimos 30)"
  echo '```'
  git log --oneline -30
  echo '```'
  echo ""
  echo "## 7. 🚨 REGRAS DE FERRO"
  echo "- **NUNCA db:push** — drift de 32 tabelas / 31 FKs em unidades.id"
  echo "- SEMPRE ALTER/CREATE direto via psql"
  echo "- NUNCA renomear coluna existente (só ADD)"
  echo "- Naming: \`perfil\` nunca \`role\`, \`auditoria_cascata\` nunca \`aud_cascata\`"
  echo "- Multi-tenant: toda nova tabela com dados clínicos precisa unidade_id FK"
  echo "- requireAdminToken em todo POST/PUT/DELETE/PATCH sensível"
  echo "- Cifragem: SESSION_SECRET + scrypt + AES-256-GCM"
} > "$OUT"
LINHAS=$(wc -l < "$OUT")
KB=$(du -k "$OUT" | cut -f1)
echo "✅ Gerado: $LINHAS linhas, ${KB}KB"
echo "📄 Arquivo: $OUT"
