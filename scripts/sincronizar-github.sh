#!/usr/bin/env bash
# sincronizar-github.sh
# Forca o GitHub (caio-padua/Integrative-Health-Engine) a ficar identico ao Replit.
# Uso, no Shell da Replit: bash scripts/sincronizar-github.sh
# O que faz: limpa trava orfa, commita pendencias, empurra a branch e confirma.

set -uo pipefail

BRANCH="ver-l2-dr-claude"
RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"

# 1. Remove a trava orfa do ref de rastreamento (resto de push anterior), se existir.
rm -f ".git/refs/remotes/github/${BRANCH}.lock" 2>/dev/null || true

# 2. Garante que o remote 'github' existe.
if ! git remote | grep -qx "github"; then
  echo "ERRO: remote 'github' nao configurado. Configure no painel Git da Replit antes."
  exit 1
fi

# 3. Commita qualquer pendencia (so se houver mudanca real).
git add -A
if ! git diff --cached --quiet; then
  git commit -m "sync github $(date '+%d/%m/%Y %H:%M')"
  echo "Commit criado com as pendencias."
else
  echo "Nada novo para commitar."
fi

# 4. Empurra para o GitHub (token nunca aparece na tela).
git push github "HEAD:${BRANCH}" 2>&1 | sed -E 's/gho_[A-Za-z0-9_]+/***TOKEN_OCULTO***/g' || true

# 5. Confirma comparando local x remoto (fonte da verdade, nao confia no exit code).
LOCAL="$(git rev-parse HEAD)"
REMOTO="$(git ls-remote github "${BRANCH}" 2>/dev/null | awk '{print $1}')"
echo "----------------------------------------"
if [ "${LOCAL}" = "${REMOTO}" ]; then
  echo "OK: GitHub esta IGUAL ao Replit em ${LOCAL:0:8}"
else
  echo "ATENCAO: divergente. Local=${LOCAL:0:8} Remoto=${REMOTO:0:8}"
fi
echo "Raw base para Dr. Claude / Dr. Code:"
echo "https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/${BRANCH}/"
