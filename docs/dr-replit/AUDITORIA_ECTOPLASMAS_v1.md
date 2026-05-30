# AUDITORIA DE ECTOPLASMAS v1 — Raio-X Completo

> **De:** Dr. Replit · **Para:** Caio + Dr. Claude
> **Data:** 2026-05-30
> **Método:** 3 varreduras cruzadas (governança · mockups×app · docs×código)
> **Escopo:** comparar TODO design validado contra o código vivo real.

---

## 0. RESPOSTA DIRETA AO CAIO

0.1 Você estava certo: **a B1 NÃO é o primeiro fantasma.**
0.2 O fantasma ANTERIOR e mais fundo é a **GOVERNANÇA**.
0.3 A B1 (MODO 3) **depende** da governança estar viva pra gatear.
0.4 Logo a ordem certa é: **graduar governança → depois B1.**

---

## 1. LEGENDA

- 🫀 VIVO — está no app real e funciona
- 🧬 MEIO-VIVO — existe parcial / versão pobre / só via iframe
- 👻 FANTASMA — só em mockup ou doc, não no app
- ⚓ ÂNCORA — fantasma fundacional do qual outros dependem

---

## 2. TABELA-MESTRA (todos os achados)

| # | Item | Status | Por quê |
|---|---|---|---|
| 1 | **Governança (toggles de bloqueio clínico)** | 👻⚓ SEMI-FANTASMA | viva pra COBRANÇA, morta pro BLOQUEIO. Emissão de receita NÃO lê os toggles |
| 2 | Mensageria rica / Teatro / GPS Pádua (a B1) | 🧬 MEIO-VIVO | form simples vivo; riqueza (período/dose/teatro) só no mockup |
| 3 | Carta de Encantamento | 👻 FANTASMA | só em `_teatro.ts` no sandbox. (doc 24: fica pra depois da B1) |
| 4 | Craniotomia (grafo de sinapses) | 👻 FANTASMA | a tela viva é só um **iframe** apontando pro mockup |
| 5 | Penumbra (tema claro/escuro) | 👻 FANTASMA | só no mockup; o app usa cores fixas, sem ThemeContext vivo |
| 6 | Exames Evolução tabela / Trajetória Integrativa | 🧬 MEIO-VIVO | motor de 5 terços vivo; a visualização final não está como tela |
| 7 | PADSITE portal clínicas | 👻 FANTASMA | só doc 15, marcado STANDBY. Sem código |
| 8 | Cockpit do paciente | 🫀 VIVO | alta fidelidade, GPS embutido, dados reais |
| 9 | PDF de receita (Template V8) | 🫀 VIVO | consolidou as variantes A/B/C/D, paridade total |
| 10 | Layout / tema Sahara Noir / menus | 🫀 VIVO | `LayoutPawards` + `LayoutTripleFocus` |
| 11 | 2FA / RBAC (doc 06) | 🫀 VIVO | TOTP + recovery + killswitch |
| 12 | Pulso Diário + portal paciente (doc 18) | 🫀 VIVO | rota `/portal-paciente/pulso/:token` + tela mobile |
| 13 | RAS import de planilha | 🫀 VIVO | origem IMPORT + scripts de ingestão |

---

## 3. O ECTOPLASMA-ÂNCORA: GOVERNANÇA (detalhe)

3.1 **O que está VIVO:**
   - `requireDelegacao.ts` lê `permissoes_delegadas` em runtime
   - incluir substância sem permissão → o sistema sabe e o Caio cobra
   - cobrança automática (dia 5) transforma toggle em dinheiro

3.2 **O que é FANTASMA:**
   - `governanca-matrix.tsx` liga/desliga categorias e SALVA no banco
   - MAS `emitirPrescricaoService.ts` **NÃO LÊ** esses toggles
   - resultado: o médico prescreve item de categoria "desligada" mesmo assim
   - o gate de contrato existe, mas em modo defensivo (só warning, não bloqueia)

3.3 **Por que isso é a âncora:**
   - você disse: MODO 3 da B1 depende dos toggles de governança
   - hoje os toggles não gateiam nada na emissão
   - então pra B1 funcionar de verdade, a emissão precisa LER a governança primeiro

3.4 **Tabelas envolvidas:** `matrix_governanca_categoria`, `permissoes_delegadas`, `unidade_modulos_ativos`

---

## 4. FILA DE GRADUAÇÃO (ordem corrigida — Caio bate o martelo)

> Regra do Caio: 1 fantasma por vez, virando vivo de verdade, marcado aqui.

1. ⚓ **GOVERNANÇA** — fazer a emissão LER os toggles (âncora da B1)
2. **B1** — prescrição rica + mensageria por período + 3 modos
3. **Carta de Encantamento** — opt-in, depois da B1 (doc 24 §2.4)
4. **Craniotomia** — migrar grafo do iframe pro core
5. **Exames Evolução / Trajetória** — visualização final
6. **Penumbra** — tema claro/escuro (lote, baixo risco)
7. **PADSITE** — só quando o Caio tirar do standby

---

## 5. O QUE NÃO É FANTASMA (pra te tranquilizar)

5.1 Cockpit, PDF V8, layout, 2FA, Pulso Diário, RAS import: **todos VIVOS.**
5.2 Ou seja: a fundação está de pé. Os fantasmas são features de riqueza, não o esqueleto.
5.3 Nenhum se perdeu. Todos rastreados aqui.

---

## 6. PRÓXIMO PASSO

6.1 Caio confirma a fila do item 4.
6.2 Dr. Replit grava 1 PROPOSTA por fantasma antes de codar (anti-ectoplasma).
6.3 Dr. Claude lê este raio-X e pode propor specs de graduação.
6.4 Cada graduação atualiza `05_LINHA_DE_PRODUCAO_ECTOPLASMAS.md` (👻 → 🫀).
