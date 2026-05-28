# RESPOSTA DR. CLAUDE 23 — Validação Skill Penumbra + Mapeamento Tela a Tela

> Lido em: 2026-05-28
> Branch: `ver-l2-dr-claude` commit `4d2d343`
> Ref: doc 23 + `_pawardsPenumbra.tsx` + `_perfisPenumbra.ts`

---

## 1. PARECER SOBRE A SKILL

A skill está excelente. Os 2 perfis (PAPER CIANO claro + NAVY CIANO escuro)
estão bem construídos. O código do `_pawardsPenumbra.tsx` implementa
corretamente: respiração só no selecionado (não no hover), cor do bloco
ativo tinge a faixa inteira, borda 5px, alto-relevo 3D, LEDs de vidro,
3 níveis de visualização, alinhamento 16px unificado.

### O que valido sem ressalvas:
- Estrutura `PerfilPenumbra` com tipagem completa
- 8 domínios com cores distintas
- Busca dupla facetada (entidades teal + eventos âmbar)
- PULSO timeline com ícones por tipo (MSG/EXM/AGD/RXC/FIN)
- KPIs, alertas com severidade, demandas por domínio
- Nível de vis 1/2/3 controlando o que aparece

### 3 ajustes que sugiro:

**A1 — Contraste do PAPER CIANO em projetor.**
O `t3: "#6E8088"` (labels secundários) sobre `bg: "#EEF2F4"` dá
contraste 3.2:1 — passa WCAG AA para texto grande mas falha para
texto pequeno (<14px). Sugiro escurecer para `#5A6E78` (4.5:1).

**A2 — Cores dos domínios no modo claro precisam de mais separação.**
`doms[4]` (MOTOR `#2A9D8F`) e `doms[0]` (DASHB `#9C6E16`) funcionam,
mas `doms[2]` (AGENDA `#1E7A6E`) e accent (`#1E7A6E`) são idênticos.
Quando AGENDA está ativo, não dá pra distinguir do accent geral.
Sugiro AGENDA `#0E6A60` (mais escuro) ou `#2A8A7A` (mais claro).

**A3 — O perfil NAVY CIANO usa `ok: "#5FE6CC"` igual ao `accent`.**
Quando um KPI está "OK", a cor é a mesma do accent geral — perde
significado semântico. Sugiro `ok: "#7CC4A0"` (verde mais quente,
já definido na Carta Magna original).

---

## 2. MAPEAMENTO TELA A TELA — COMO APLICAR A SKILL

O sistema tem ~50 páginas reais + ~30 mockups. Abaixo, cada tela
mapeada para os tokens do perfil Penumbra. O Dr. Replit aplica
substituindo os hex hardcoded por referências ao perfil ativo.

### PRIORIDADE P0 — Telas de operação diária (aplicar PRIMEIRO)

| # | Tela | Rota | Tokens principais | Observação |
|---|------|------|-------------------|------------|
| 1 | **Prescrição Rápida** | `/prescricao-rapida` | bg, bg2 (cards), accent (botões), ok/warn/danger (status), doms[3] (borda PRESC) | Hoje usa paleta hardcoded `tk = {...}`. Substituir por perfil ativo. |
| 2 | **Cockpit do Paciente** | `/cockpit` | TODOS os tokens — é a tela referência da skill | Já implementado no mockup. Graduar para rota real. |
| 3 | **Lista de Pacientes** | `/pacientes` | bg, bg2 (linhas), t1/t2 (nome/detalhes), accent (hover), doms[1] (borda PACTS) | Tabela com hover neon, filtros pill. |
| 4 | **Agenda** | `/agenda` | bg, bg2 (slots), accent (horário ativo), ok (confirmado), warn (pendente), danger (falta), doms[2] (borda AGEND) | Grid de horários. |
| 5 | **Exames Evolução** | `/atendimento/exames/:id` | bg, bg2 (cards), 5 cores de terço (P001-P005 fixas, NÃO mudam por perfil), t1/t2 (labels) | Chips de terço mantém cores fixas (semânticas). |

### PRIORIDADE P1 — Telas frequentes

| # | Tela | Rota | Tokens | Obs |
|---|------|------|--------|-----|
| 6 | Anamnese | `/anamnese` | bg, bg2, accent (roller), ok (completo), t1/t2 | Roller de categorias |
| 7 | Fórmulas/Catálogo | `/catalogo` | bg, bg2, doms[3] (PRESC), accent (busca) | Autocomplete |
| 8 | RAS Digital | `/pacientes/:id/ras` (futuro) | bg, bg2, ok/warn (status sessão), doms[1] (PACTS) | Timeline de sessões |
| 9 | Mensageria | (rota a definir) | bg, bg2, accent (WhatsApp), doms[5] (MOTOR) | Catálogo mensagens |
| 10 | Financeiro | (rotas admin-*) | bg, bg2, doms[4] (FATUR), gold (valores R$) | NFs, cobranças |

### PRIORIDADE P2 — Telas administrativas

| # | Tela | Rota | Tokens | Obs |
|---|------|------|--------|-----|
| 11 | Colaboradores | `/colaboradores` | bg, bg2, doms[6] (EQUIP) | Lista simples |
| 12 | Auditoria/LGPD | rotas admin-* | bg, bg2, doms[7] (AUDIT), danger (alertas) | Logs |
| 13 | Config/Perfil | `/plataforma/perfil` | bg, bg2, accent (toggle layout) | Toggle claro/escuro AQUI |
| 14 | Segurança/2FA | `/seguranca` | bg, bg2, danger (crítico), ok (ativo) | Status 2FA |
| 15 | Motor/Sinapses | `/craniotomia` | bg, bg2, doms[5] (MOTOR), todas as cores de dom | Grafo + matriz |

### REGRAS INVARIANTES (não mudam por perfil)

| Elemento | Cor FIXA | Motivo |
|----------|----------|--------|
| Chips de terço P001-P005 | `#EF4444 #F59E0B #22C55E #3B82F6 #7C3AED` | Semântica médica — daltonismo requer cores fixas |
| Tags ANVISA de receita | Cores definidas por regulação | Legal |
| WhatsApp verde | `#25D366` | Marca registrada |
| Danger sempre vermelho | `danger` do perfil | Mesmo em modo claro, vermelho = perigo |

---

## 3. COMO O TOGGLE CLARO/ESCURO FUNCIONA

```
Usuário clica toggle em /plataforma/perfil
  → localStorage salva: pawards.tema = "cla-paper-ciano" | "esc-navy-cyan"
  → App.tsx lê localStorage e injeta o perfil ativo no contexto
  → Cada componente usa tokens do perfil (p.bg, p.t1, p.accent, etc.)
  → Telas que já usam _pawardsPenumbra.tsx adaptam automaticamente
  → Telas que ainda usam hex hardcoded precisam ser migradas (lista acima)
```

### Ordem de migração sugerida para o Dr. Replit:

1. Criar `ThemeContext.tsx` que exporta o perfil ativo
2. Substituir `const tk = {...}` de `prescricao-rapida.tsx` por `useTheme()`
3. Fazer o mesmo em cada tela P0 (5 telas, ~2h cada)
4. Depois P1 (5 telas, ~1h cada)
5. Depois P2 (5 telas, ~30min cada — são mais simples)

**Estimativa total: ~20h de migração, dividido em 3-4 dias.**

---

## 4. SOBRE A PLANILHA

A planilha `PAWARDS_LINHA_PRODUCAO_v3.csv` está pronta. O Claude Code
pode subir via Google Sheets API (clasp está instalado). Instrução
para o Claude Code abaixo.

---

## ASSINATURA

Dr. Claude · 28/mai/2026
Skill validada com 3 ajustes menores (A1-A3).
Mapeamento de 15 telas entregue com prioridade P0/P1/P2.
Ordem de migração definida.
