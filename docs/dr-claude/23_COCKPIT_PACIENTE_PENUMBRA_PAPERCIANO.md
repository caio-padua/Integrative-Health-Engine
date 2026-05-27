# 23 · Cockpit do Paciente — Variante PENUMBRA PAPER CIANO (aprovada Caio)

> **Status**: Mockup aprovado visualmente pelo Caio em **27/mai/2026**.
> **Branch GitHub**: `ver-l2-dr-claude`.
> **Próximo passo bloqueado por Dr. Claude**: opinar na arquitetura antes
> de a) cruzar com SQL real, b) graduar mockup pra rota `/pacientes/:id/cockpit`.

---

## 0 · Resumo executivo pro Dr. Claude

Caio rodou ~2 dias iterando 6 variantes de cockpit do paciente (3 claras
+ 3 escuras) na pasta `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/`.
Aprovou **PENUMBRA PAPER CIANO** (clara, accent teal escuro, glow ciano)
como base canônica, com par escuro **PENUMBRA NAVY CIANO**.

O cockpit é a **tela única do dia-a-dia** do médico e do CEO. Tudo que
um paciente precisa acontece aqui: operação do dia (sessões, receita,
aderência, fila, motor, faltas), alertas críticos do motor clínico,
demandas operacionais por domínio, agenda restante, atalhos, timeline
do paciente (PULSO). Sem trocar de tela.

---

## 1 · Decisões tomadas nessa rodada (7)

### D001 — Layout em 3 faixas horizontais + corpo + 2 painéis laterais

```
┌───────────────────────────────────────────────────────────────────┐
│ FAIXA 1 · LOCAL/GLOBAL · níveis 1·2·3 · busca · CAIO REGISTER · ESCURO · MÉDICO · CONFIG · SAIR │
├───────────────────────────────────────────────────────────────────┤
│ FAIXA 2 · BREADCRUMB · PAWARDS ▸ PÁDUA MATRIZ ▸ DASHBOARD GLOBAL · [OPE] │
├───────────────────────────────────────────────────────────────────┤
│ FAIXA 3 · ATIVO · GRACO SOUZA PÁDUA 34A · M · HAS DM2 · [PACIENTE][AGENDA][PRESCRIÇÃO][FATURAMENTO] · SESSÃO 11:30 16MIN │
├──────┬─────────────────────────────────────────────┬──────┬──────┤
│ MENU │ CORPO · OPE · ALT · DMD (blocos)             │ CTX  │ PUL  │
│      │                                              │      │      │
└──────┴─────────────────────────────────────────────┴──────┴──────┘
```

Faixas 2 e 3 **tingem com a cor do bloco ativo** (OPE=dourado,
ALT=vermelho, DMD=verde-musgo) — pista visual periférica do que está
em foco sem desviar o olho.

### D002 — Menu lateral com 3 níveis de visualização

- **Nível 1**: coluna de 18px com palavra `MENU` escrita na vertical
  (writing-mode: vertical-rl), fontWeight 900, letterSpacing 4,
  encostada no topo (paddingTop 4) próximo às 3 faixas. Clica e
  expande pro nível 2.
- **Nível 2**: 66px, só códigos (`DASHB`, `PACTS`, `AGEND`...) em
  quadradinhos com borda completa, faixa colorida 4px ancorada à
  esquerda + nick uppercase.
- **Nível 3**: 172px, código + rótulo + sub + submenus indentados.
  Submenus do nível 3 têm **pseudo-element `::before` formando L de
  90°** no canto superior esquerdo (border-left + border-bottom 2px),
  conectando à faixa colorida do item pai.

### D003 — Blocos OPE / ALT / DMD minimizáveis

3 blocos verticais no corpo, cada um com:
- header colorido (LED status + tag + título + contador + botão `▾/▸`)
- borda-esquerda 5px na cor do domínio (OPE=dourado, ALT=vermelho, DMD=verde-musgo)
- conteúdo render-condicional via `Set<string>` `minimizados`

Clica no `▾` → vira `▸` e some o conteúdo, fica só o header.
Atalhos: `q/w/e` ativa bloco OPE/ALT/DMD.

### D004 — Tabs PACIENTE/AGENDA/PRESCRIÇÃO/FATURAMENTO na faixa 3

Tabs no meio da faixa 3 com **correspondência visual ao menu lateral**:
clica em `PRESCRIÇÃO` na faixa 3 → acende `PRESC` no menu lateral (via
`setActDom(3)`). Bidirecional: cor de cada tab puxa do `t.doms[idx]`.

Estilo: borda + texto colorido + fundo transparente, **igual** aos
botões da faixa 1 (LOCAL/GLOBAL/níveis). Sem fundo pintado.

### D005 — Painéis CONTEXTO + PULSO colapsáveis (extrema direita)

2 colunas de 200px à direita, com headers `CONTEXTO` (dourado) e
`PULSO` (ciano) em fontWeight 900 / fontSize 11 / letterSpacing 3.
Quando colapsadas viram tarjas de 18px com a palavra escrita na
vertical, encostada no topo, sem símbolos misturados.

- **CONTEXTO** = agenda restante do dia + atalhos (+RECEITA / +EXAME / +MENSAGEM) + dicionário de teclado.
- **PULSO** = timeline do paciente (MSG / EXM / AGD / RXC / FIN) com LED de status e timestamp relativo.

### D006 — Toggle CLARO ↔ ESCURO

Botão `ESCURO` / `CLARO` na faixa 1 (entre CAIO REGISTER e MÉDICO).
Recebe `perfilPar?: PerfilPenumbra` opcional e alterna `t` internamente.
PaperCiano ↔ NavyCyan pareados. Justificativa: UI vai rodar em
consultório (claro, dia) e sala de procedimento (escuro, foco). Os
outros 4 perfis (PapelGold↔NavyGold, PaperLilás↔NoirLilás) ficam pra
quando aprovarmos os pares.

### D007 — Hover neon envolvendo os 4 lados

Toda classe `.${SID}-elem` tem hover com `box-shadow` externo nos 4
lados:

```css
box-shadow:
  0 0 0 1px var(--ppen-cor),         /* aro 1px */
  0 0 8px 2px var(--ppen-cor-soft),  /* halo médio */
  0 0 18px 4px var(--ppen-cor-soft); /* halo externo */
z-index: 2;
```

Miolo limpo, quina 90° preservada (nada de border-radius). Mantém a
estética "documento jurídico bem formatado" do Caio.

---

## 2 · Raw URLs GitHub (branch `ver-l2-dr-claude`)

> Substitua `ver-l2-dr-claude` por `main` quando essa branch fizer
> merge.

| Arquivo | Função | Raw URL |
|---------|--------|---------|
| Layout base do cockpit | Componente reutilizado pelas 6 variantes | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pawardsPenumbra.tsx |
| Perfis de tema pareados | PERFIL_PAPER_CIANO ↔ PERFIL_NAVY_CIANO | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_perfisPenumbra.ts |
| Variante CLARA aprovada | PenumbraClara2_PaperCiano (default) | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraClara2_PaperCiano.tsx |
| Variante ESCURA pareada | PenumbraEscura2_NavyCyan (toggle) | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraEscura2_NavyCyan.tsx |

---

## 3 · Invariantes inegociáveis (regra ferro do Caio)

1. **Zero emojis** na UI.
2. **0px border-radius** em qualquer elemento.
3. **JetBrains Mono** em 100% do texto.
4. **PT-BR** sempre — nunca EN.
5. **Retângulo dentro de retângulo** (sem cards arredondados, sem
   pílulas).
6. Paleta: navy / gold / cyan / pasteis.
7. Naming sem abreviação obscura, sem `role` (usar `perfil`),
   prefixos `pode_` `nunca_` `requer_`.
8. Hover neon vem **de TRÁS** (box-shadow externo), miolo limpo, quina
   90°.
9. Alinhamento padrão 16px (LINHA_ESQ) na esquerda das 3 faixas.
10. Nenhum dado mockado pode virar "número real" sem o Caio aprovar
    explicitamente (regra dos 8.728 receitas).

---

## 4 · Perguntas pendentes pra Dr. Claude

### Q001 — Arquitetura do cockpit como tela única
O cockpit reúne **6 fluxos diferentes** numa só tela (operação,
alertas, demandas, contexto, pulso, navegação). Isso é arquitetura
sustentável pro Pawards, ou em algum momento vai precisar virar
multi-tela? Se sim, qual o gatilho (ex: > N alertas, > N demandas)?

### Q002 — Hierarquia OPE > ALT > DMD
Hoje OPE (operação) está no topo, ALT no meio, DMD em baixo. Faz
sentido essa ordem pro fluxo do médico clinicando? Ou ALT (alertas
críticos) deveria estar no topo porque é o que pode matar o paciente?

### Q003 — Fonte dos KPIs operacionais (SESSÕES, RECEITA, ADERÊNCIA, FILA, MOTOR, FALTAS)
Quais tabelas reais alimentam cada um desses 6 KPIs? Hoje estão
mockados (`18 / R$ 41.820 / 87% / 23 / 142 / 2`). Preciso saber
quais SELECTs rodar antes de fase 2 (SQL contra código).

### Q004 — Alertas críticos do motor (CRÍTICO / URGENTE)
Os 3 alertas mockados (NAD+ × Atorvastatina, Cortisol 8h baixo,
TSH limítrofe 4.8) deveriam vir de `alerta_paciente` ou de uma
view materializada de regras_motor cruzadas com últimos exames?
Existe regra de **deduplicação** se o mesmo alerta dispara várias
vezes no dia?

### Q005 — Demandas operacionais por domínio (DMD)
Os 4 mockados (CADASTRO INCOMPLETO 3, CONFIRMAÇÕES HOJE 12,
RECEITAS A ASSINAR 2, NF PENDENTES 5) são agregados de **fila
unificada** ou de filas separadas por domínio? Existe priorização
(SLA) entre eles?

### Q006 — Tabs faixa 3 vs menu lateral
Hoje tabs (PACIENTE/AGENDA/PRESCRIÇÃO/FATURAMENTO) **acendem** o
menu lateral. Deveriam **navegar** pra páginas separadas ou ficar
como **drawers laterais** sobre o cockpit? Caio preferiu não trocar
de tela, mas quero validar a arquitetura.

### Q007 — Toggle CLARO ↔ ESCURO persistente
Hoje o toggle é state local (`useState`). Deveria persistir em
`usuarios.preferencias.tema` ou em localStorage? Ou puxar do
horário (claro de dia, escuro de noite, automático)?

### Q008 — Outros 4 perfis (PapelGold, PaperLilás, NavyGold, NoirLilás)
Caio aprovou PaperCiano + NavyCyan. Os outros 4 sobram. Devo:
a) Manter como referências históricas no mockup-sandbox.
b) Pareá-los (PapelGold↔NavyGold, PaperLilás↔NoirLilás) e habilitar
   toggle entre os 3 pares.
c) Deletar.

---

## 5 · Próximos passos propostos (Dr. Replit)

1. **Aguardar Q001-Q008 respondidas** por Dr. Claude.
2. **Fase 2 · SQL contra código**: rodar SELECTs em
   `tracking_sintomas`, `alerta_paciente`, `monitoramento_sinais_vitais`,
   `agenda`, `ras`, `faturamento` cruzando com mocks do cockpit pra
   mapear gap.
3. **Fase 3 · Graduate mockup**: usar skill `mockup-graduate` pra
   levar PaperCiano + NavyCyan pra rota real `/pacientes/:id/cockpit`
   (artifact `clinica-motor`, hoje atrás de stub).

---

_Atualizado em 2026-05-27 por Dr. Replit (agente Replit)._
