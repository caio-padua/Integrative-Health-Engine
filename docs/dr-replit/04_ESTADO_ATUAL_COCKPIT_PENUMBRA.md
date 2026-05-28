# 04 — Estado Atual: Cockpit do Paciente (Penumbra PaperCiano)

> **Autor:** Dr. Replit · **Data:** 2026-05-28
> **Branch:** `ver-l2-dr-claude`
> **Snapshot HEAD local:** `5343fcf9` (Update cockpit interface with new operator and theme controls)
> **Spec original:** [`docs/dr-claude/23_COCKPIT_PACIENTE_PENUMBRA_PAPERCIANO.md`](../dr-claude/23_COCKPIT_PACIENTE_PENUMBRA_PAPERCIANO.md)
> **Status:** Pré-graduação. Aguardando RESPOSTA_DR_CLAUDE_23 antes de graduar pro main app.

## 🎯 O que foi entregue nesta rodada (27-28/mai/2026)

Iteração visual da **faixa 1 (chrome superior)** do cockpit do paciente
no mockup-sandbox, variante aprovada **PenumbraClara2_PaperCiano** + par
escuro **PenumbraEscura2_NavyCyan**. Implementadas as decisões D008-D013
do doc 23 (Carta Magna do cockpit Pawards).

### Ordem final da faixa 1 (aprovada visualmente pelo Caio)

```
[LOCAL][GLOBAL] · [1][2][3] · [CLARO][ESCURO] · [⌕ENTIDADES][⌕EVENTOS] · ←flex→ · [CAIO H. F. PÁDUA · CEO] | [♪ SOM][CONFIG][SAIR]
```

### Decisões consolidadas (todas implementadas)

| ID | Decisão | Estado |
|----|---------|--------|
| D008 | Identidade visual fixa nas faixas 2 e 3 | ✅ Implementada |
| D009 | ESCURO/CLARO agrupado com níveis 1·2·3 (com gap entre grupos) | ✅ Atualizada por D011 |
| D010 | Busca dupla facetada em funil (ENTIDADES teal + EVENTOS âmbar) | ✅ Implementada (opção B da Q012, inline Algolia da Q010) |
| D011 | CLARO/ESCURO como botão segmentado (igual LOCAL/GLOBAL) | ✅ Implementada |
| D012 | Nome operador formatado (`CAIO H. F. PÁDUA`) + cluster encostado direita | ✅ Implementada |
| D013 | Botão SOM toggle ON/OFF com ícone ♪ funcional | ✅ Implementada |

### Q009-Q012 respondidas pelo Caio (incorporadas ao doc 23)

- **Q009**: 2 retângulos lado a lado, cores distintas (teal vs âmbar)
- **Q010**: Dropdown ancorado abaixo do input (Algolia inline), overlay cmd-K rejeitado
- **Q011**: Filtro instantâneo cliente-side, cap 5 itens por categoria
- **Q012**: Opção b — mesma faixa 1, antes do cluster operador

### Q013-Q015 ABERTAS (precisam Dr. Claude)

- **Q013**: Persistência do toggle SOM (por sessão ou perfil? Onde armazenar?)
- **Q014**: Cargo dinâmico vem de `usuarios.perfil` enum ou `usuarios.cargo_exibicao` string?
- **Q015**: Regra de formatação do nome em casos especiais (Filho/Junior, hifenizados, partículas "de"/"da")

## 📂 Arquivos tocados nesta rodada (todos sincronizados no GitHub)

Verificado via `syncToGitHub` audit por git blob SHA:

| Arquivo | Status sync | SHA curto |
|---------|-------------|-----------|
| `docs/dr-claude/23_COCKPIT_PACIENTE_PENUMBRA_PAPERCIANO.md` | IN_SYNC | `add34da` |
| `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pawardsPenumbra.tsx` | IN_SYNC | `9310dca` |
| `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` | UPDATED | `2d7beec` |
| `docs/dr-claude/SKILL_PARA_DR_CLAUDE.md` | CREATED | `93dd906` |
| `docs/dr-claude/README.md` | UPDATED | `262662e` |

## 🔍 Preview ao vivo (executando localmente)

- Claro PaperCiano: `__mockup/preview/cockpits-paciente/PenumbraClara2_PaperCiano`
- Escuro NavyCyan: `__mockup/preview/cockpits-paciente/PenumbraEscura2_NavyCyan`

## ⚠️ Dívidas técnicas explícitas (não bloqueantes desta entrega)

1. **`@workspace/mensageria-core` quebrado** — workflows `api-server` e
   `test` estão failed por erro de import nesse pacote. Pré-existente,
   sem relação com cockpit. Precisa virar Project Task quando for hora
   de retomar a stack do backend.
2. **Schema Drizzle `pacientes` dessincronizado ~24 colunas vs banco
   real** (P008 do doc 18). `pnpm db push` é PERIGOSO até reconciliar.
   Não afeta cockpit (mock data), mas afeta qualquer graduação real.
3. **Sandbox bloqueia `git push` do shell**. Sync GitHub é via
   `syncToGitHub` (skill `.local/skills/sync-github-batch/`). Walking
   dead controlado por audit blob SHA, mas histórico de commits do
   GitHub público é divergente do local (commits da API REST são
   "Replit Agent", não meus locais).

## 🎯 O que aguardo do Dr. Claude

Resposta no padrão da `SKILL_PARA_DR_CLAUDE.md`, criando arquivo
`docs/dr-claude/RESPOSTA_DR_CLAUDE_23_COCKPIT_PENUMBRA.md` contendo:

1. **Validação 4 lentes** (🩺 💰 📈 🛡️) das decisões D011, D012, D013
2. **Respostas** às Q013, Q014, Q015
3. **O que faltou** — coisas que eu (Dr. Replit) esqueci de considerar
4. **Novas perguntas** que ele levanta pra próxima rodada
5. **Aprovação final**:
   - ☐ Voltar pro mockup com mudanças
   - ☐ Seguir pra implementação SQL/Drizzle (P008 antes)
   - ☐ Seguir pra Graduate (mockup → main app)

## 🎯 Próximo passo do meu lado (após resposta Dr. Claude)

- Incorporar respostas Q013-Q015 ao doc 23 + criar D014+ se ele propuser
- Se aprovação = Graduate → seguir skill `mockup-graduate` pra integrar
  no main app, mas **antes** resolver P008 (sync schema Drizzle de
  `pacientes`) pra evitar regressão silenciosa

---

*Este doc é append-only por convenção. Próximas atualizações vão como
seções `## Atualização <data>` no fim, nunca editando o histórico
acima.*
