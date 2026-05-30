# 05 — LINHA DE PRODUÇÃO · Raio-X dos Ectoplasmas

> **De:** Dr. Replit · **Para:** Caio (CEO) + Dr. Claude (mastermind)
> **Atualizado:** 2026-05-30
> **Propósito:** mapear TODO design validado por Caio e dizer, sem mentira,
> se ele está **VIVO** (no corpo real do sistema), **MEIO-VIVO** (lib extraída
> mas não plugada) ou **FANTASMA** (só existe em mockup/canvas/doc — limbo).

---

## 0. O PROBLEMA, em 1 frase

Caio validou processos ricos em conversas de dia inteiro. Muitos viraram
**mockup no canvas** (`mockup-sandbox`) ou **doc** (`docs/dr-claude`), mas
**nunca foram graduados** pro app real (`clinica-motor` + `api-server`).
São os "ectoplasmas": almas paralelas que, se não invocadas, se perdem.

**Boa notícia: nenhum se perdeu.** Estão todos rastreáveis. Este arquivo é o
mapa de resgate.

---

## 1. LEGENDA DE STATUS

| ícone | status | significado |
|---|---|---|
| 🫀 | VIVO | está no `clinica-motor` + `api-server`, operável pelo Caio hoje |
| 🧬 | MEIO-VIVO | virou `lib/*` compartilhada, mas o app real ainda não usa |
| 👻 | FANTASMA | só existe em `mockup-sandbox` (canvas) e/ou `docs/` — NÃO no app |
| 🔍 | A RAIO-X | precisa de verificação antes de cravar status |

---

## 2. ECTOPLASMA-MÃE — Mensageria Cronobiológica + Prescrição Rica

> Este é o caso que o Caio citou no áudio. Confirmado: é um FANTASMA.

| peça | onde vive | status |
|---|---|---|
| Gramática de mensagem (parse/adapter WhatsApp/Telegram) | `lib/mensageria-core` | 🧬 MEIO-VIVO |
| Teatro Mensageria (editor de template + placeholders) | `mockup-sandbox/.../prescricao-rapida/TeatroMensageriaPadua.tsx` | 👻 FANTASMA |
| GPS Pádua (editor rico: dose × período × horário) | `mockup-sandbox/.../prescricao-rapida/GpsPadua.tsx` | 👻 FANTASMA |
| Carta de Encantamento (matriz período × cenário) | `_teatro.ts` + doc 16 | 👻 FANTASMA |
| Disparo por janela cronobiológica (9 períodos, 1 msg/janela) | doc 16 (validado ao vivo 19/mai) | 👻 FANTASMA (só desenho) |
| Prescrição rápida REAL | `clinica-motor/src/pages/prescricao-rapida.tsx` | 🫀 VIVO (mas versão SIMPLES, sem nada acima) |

**Tradução:** o Ferrari (motor + mensageria rica) foi desenhado e está no
mockup. A tela que o Caio usa de verdade é a versão de fábrica básica.
**Graduar isto = a wave B1 que o Caio aprovou.**

---

## 3. CANDIDATOS A FANTASMA (a confirmar no raio-X)

Mockups no canvas que podem ou não ter equivalente vivo:

| mockup (`mockup-sandbox`) | equivalente no app? | status |
|---|---|---|
| `chromes-navegacionaispadua-atelier` | chrome/header das telas | 🔍 |
| `cockpits-pacientepawards-dashboards` | `clinica-motor/pages/cockpit` existe | 🔍 (verificar paridade) |
| `consultoriopawards-showcase` | `pages/consultorias` | 🔍 |
| `sahara-noir` (tema/paleta) | tema do app | 🔍 |
| `ReceitaVariante A/B/C/D` + `PdfVariante A/B/C/D` | PDF de receita real | 🔍 |
| `craniotomia*` (mockup) | `pages/craniotomia.tsx` existe | 🔍 (verificar versão V4 splitview) |
| `layout-oficial` / `menu-variants` | layout do app | 🔍 |
| `GoogleCalendarDemo` | agenda-motor (sync já vivo) | 🔍 |

> Próximo passo: rodar 1 raio-X por linha (comparar mockup × tela viva) e
> cravar 🫀/🧬/👻. Caio autorizou levar "dias e dias" pra fazer direito.

---

## 4. ESTRATÉGIA DE RESGATE (como invocar do limbo)

Existe um caminho conhecido e seguro pra "graduar" um fantasma do mockup pro
app real (sem reinventar):

1. **INVENTÁRIO** (este arquivo) — listar todo fantasma e sua origem.
2. **RAIO-X 1 a 1** — pra cada peça, comparar mockup × app e cravar status.
3. **SPEC DE GRADUAÇÃO** — pra cada fantasma escolhido, 1 spec curta
   (o que é, onde pluga, qual tabela/rota, critério de "vivo").
4. **GRADUAR** — portar o mockup pro `clinica-motor`/`api-server`,
   reusando as `lib/*` que já existem (ex: `mensageria-core`, `posologia`).
5. **MARCAR VIVO** — atualizar este arquivo: 👻 → 🫀.

**Regra de ouro:** fantasma só vira vivo quando o Caio consegue OPERAR no
app real. Mockup bonito no canvas não conta como vivo.

---

## 5. FILA DE GRADUAÇÃO (ordem proposta — Caio decide)

1. **B1 — Prescrição Rica + Mensageria Cronobiológica** (o ectoplasma-mãe)
2. Cockpit do Paciente (verificar paridade mockup × vivo)
3. Receita/PDF (escolher variante oficial A/B/C/D e graduar)
4. Craniotomia V4 splitview (se o mockup for além da `craniotomia.tsx` viva)
5. Demais chromes/temas (lote, baixo risco)

---

## 6. PARTICIPAÇÃO DO DR. CLAUDE

- Pasta dele (leitura via raw GitHub): `docs/dr-claude/`
- Pasta de respostas/desvios do Dr. Replit: `docs/dr-replit/`
- Este arquivo (`05_...`) é a ponte: Dr. Claude lê o raio-X e pode propor
  specs de graduação; Dr. Replit executa; Caio valida.

---

> **Compromisso:** este arquivo é APPEND/UPDATE, nunca apagado. É a memória
> anti-fantasma do projeto. Toda wave que graduar um ectoplasma atualiza a
> coluna de status aqui.
