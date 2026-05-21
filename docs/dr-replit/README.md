# 📡 docs/dr-replit/ — Braço de Volta (Dr. Replit → Dr. Claude)

> Pasta-espelho de `docs/dr-claude/`. Aqui o **Dr. Replit (agente de execução
> no Replit)** escreve. O Dr. Claude (arquiteto externo) **lê via raw GitHub**.

## 🤝 Protocolo de Comunicação Bidirecional

```
┌─────────────────┐    docs/dr-claude/    ┌──────────────────┐
│   DR. CLAUDE    │ ─────── ida ────────> │   DR. REPLIT     │
│  (arquiteto +   │                       │   (executor +    │
│   auditor)      │ <───── volta ───────  │   runtime + DB)  │
└─────────────────┘    docs/dr-replit/    └──────────────────┘
                            │
                            ▼
                  GitHub raw (feat/dominio-pawards)
                  caio-padua/Integrative-Health-Engine
                            │
                            ▼
                  Caio = correio: PUSH pelo painel
                  Replit Git a cada Onda fechada
```

## 📂 Estrutura

| # | Arquivo | Quem escreve | Pra quê |
|---|---------|--------------|---------|
| 0 | [`00_ESTADO_ATUAL_DASHBOARD_CLIENTE.md`](./00_ESTADO_ATUAL_DASHBOARD_CLIENTE.md) | Dr. Replit | Snapshot vivo do que JÁ existe no código relacionado a Dashboard do Cliente, Pulso Diário, Titulação Medicamentosa e Exames Evolução. Inclui raw URLs reais. **LER PRIMEIRO.** |
| 1 | [`01_RESPOSTAS_AO_DR_CLAUDE.md`](./01_RESPOSTAS_AO_DR_CLAUDE.md) | Dr. Replit | Append-only. Cada decisão/pergunta do Dr. Claude vira aqui uma resposta com link pro commit. |
| 2 | [`02_DESVIOS_DA_SPEC.md`](./02_DESVIOS_DA_SPEC.md) | Dr. Replit | Quando eu implemento diferente da spec, justifico aqui. Dr. Claude audita. |
| 3 | [`03_PERGUNTAS_PRO_DR_CLAUDE.md`](./03_PERGUNTAS_PRO_DR_CLAUDE.md) | Dr. Replit | Dúvidas que precisam de decisão do arquiteto antes de eu codar. Numeradas P001, P002… |

## 🌳 Raw URLs base

| Branch | URL raw base |
|--------|--------------|
| `feat/dominio-pawards` (ativo) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/` |
| `main` (canônico) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/main/` |

## ⚙️ Regras

- **Dr. Replit NUNCA edita arquivos em `docs/dr-claude/`** (são domínio exclusivo do arquiteto). Só lê.
- **Dr. Claude NUNCA edita arquivos em `docs/dr-replit/`** (são append-only do executor). Só lê.
- **Push é manual via painel Replit Git** — sandbox bloqueia `git push`. Dr. Replit avisa "🔔 PUSH NECESSÁRIO" no chat ao fechar uma Onda.
- **Linguagem técnica permitida** entre os dois agentes. Quando Caio (CEO leigo) precisa entender, traduz-se em analogias no chat — não nos docs.

## 🗂️ Decisões consolidadas vivem em `docs/dr-claude/`

Quando Dr. Claude responde uma `P###` daqui, ele atualiza `docs/dr-claude/01_DECISOES_TOMADAS_*` (append-only) e referencia o número da pergunta. Dr. Replit lê e marca a `P###` como RESOLVIDA neste lado.
