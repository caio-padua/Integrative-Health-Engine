# 21 — BRIEFING DE INTEGRAÇÃO: Layout Triple Focus

> **De:** Dr. Claude · **Para:** Dr. Replit · **Data:** 2026-05-21
> **Branch:** `feat/dominio-pawards`
> **Depende de:** doc 20 (5 propostas de layout)
> **Decisão Caio:** Layout 2 (Triple Focus) aprovado

---

## ENTREGA

Componente pronto: `artifacts/clinica-motor/src/components/LayoutTripleFocus.tsx`
(~580 linhas, sem dependências novas, sem mudanças de schema).

Dr. Replit, esta entrega é para você **revisar e integrar** — não estou
mandando código autoritativo, estou tentando reduzir o seu tempo de
implementação ao máximo. O Caio precisa que a gente trabalhe alinhado.
Se algo no código não se encaixa com convenções do projeto que você
conhece melhor que eu, **ajuste**. Se discordar de alguma decisão,
**registre** em `docs/dr-replit/02_DESVIOS_DA_SPEC.md` e segue.

---

## O QUE ESTÁ INCLUÍDO

1. **`LayoutTripleFocus`** — componente principal que substitui
   `Layout.tsx` (mesma assinatura: recebe `children`).
2. **`SidebarLeft`** — 220px / 64px colapsável, com COCKPIT destacado
   no topo, 4 grupos coloridos com faixa lateral.
3. **`TopBar`** — 48px ultra-fina com KPIs, busca CmdK, perfil, logout.
4. **`PainelContexto`** — 280px à direita, sticky, conteúdo contextual
   por rota (paciente ativo, agenda, financeiro, default).
5. **CSS-in-JS via `<style>` injetado** no `<head>` uma única vez.
6. **Atalhos** `[` (toggle sidebar) e `]` (toggle painel direito) com
   persistência em localStorage.
7. **Compatibilidade total** com hooks existentes: `useAuth`,
   `useClinic`, `useSound`, `CommandPalette`, `TopProgressBar`,
   `Platform2faFooterIndicator`.

---

## O QUE EU **NÃO** FIZ (você decide como fazer)

### 1. Plugar paciente ativo real no painel de contexto

O `ContextoPacienteAtivo` está com placeholder fixo
("LUCIANO PERSSINOTTO"). Você precisa:

- Criar um `PacienteAtivoContext` ou usar o context que já existe
  (se houver). Não encontrei no repo um context global de paciente.
- Quando a rota é `/pacientes/:id` ou `/cockpit/:id`, o painel direito
  deve mostrar o paciente real (nome, idade, patologias, alertas).
- Sugestão: criar hook `usePacienteAtivo()` que lê o `:id` da rota
  via wouter e busca `useObterPacientePorId` (se existir nessa lib).

**Decisão pendente Q1:** ok criar `PacienteAtivoContext` ou prefere
outro padrão (URL params puros, query state, etc.)?

### 2. Plugar dados reais de KPIs na TopBar

Os 3 KPIs (`AGENDA 12`, `RECEITAS 2.7M`, `ALERTAS 3`) estão hardcoded.
Você sabe melhor que eu onde estão as queries dessas métricas.
Sugestão: criar `useKPIsTopBar()` que retorna `{ agendaHoje, receitasMes, alertasTotal }`
chamando os endpoints já existentes.

**Decisão pendente Q2:** preferência por React Query, SWR ou outra
biblioteca que já está no projeto?

### 3. Migração da `ClinicSwitcher` complexa

O Layout.tsx atual tem uma `ClinicSwitcher` (linhas 106-261) bem
elaborada com popover, lista de unidades, troca de escopo. Eu
**não migrei** — coloquei só um chip simples no topbar mostrando
o nome da unidade selecionada.

**Decisão pendente Q3:** opções:
- (A) Mantenho o chip simples e o `useClinic()` é trocado em outro lugar (settings)
- (B) Você migra o `ClinicSwitcher` completo para o topbar do Triple Focus
- (C) Move para o painel direito como uma seção fixa "UNIDADE"
- Minha sugestão: (C). Painel direito tem espaço, fica sempre visível,
  reduz peso visual do topbar.

### 4. Adaptação dos grupos da sidebar

Eu defini 4 grupos (CLÍNICA, FINANCEIRO, AGENDA & MOTOR, SISTEMA).
O briefing mencionou 6 grupos macro no topbar — o Layout.tsx atual
parece ter ~10 grupos. **Você sabe melhor** quais rotas existem
de verdade hoje. Ajustar `NAV_GROUPS` no topo do arquivo.

**Decisão pendente Q4:** quer que eu releia o `Layout.tsx` atual
linha por linha e te entregue um `NAV_GROUPS` espelhando 1:1 a
estrutura real? Posso fazer se quiser, mas você consegue fazer
em 10 minutos olhando o arquivo.

### 5. Feature flag para rollout gradual

Sugestão: criar a flag em `settings/perfil`:
```typescript
const layoutVariant =
  localStorage.getItem("pawards.layout.variant") || "rail";

// No App.tsx ou wrapper:
const LayoutComponent =
  layoutVariant === "triple-focus" ? LayoutTripleFocus : Layout;

return <LayoutComponent>{routes}</LayoutComponent>;
```

Caio ativa pra ele primeiro, valida em PROD por 2-3 dias, depois
você troca o default e remove o `Layout.tsx` antigo numa task de
limpeza.

---

## PONTOS DE CODE-REVIEW QUE PEÇO QUE VOCÊ OLHE

1. **CSS-in-JS via `<style>` injetado.** Eu fiz isso pra não tocar
   no `tailwind.config`. Se você prefere extrair pra CSS Modules
   ou Tailwind plugin, é totalmente válido — ajusta sem cerimônia.

2. **`localStorage` direto** em vez de `useSetting()` ou similar.
   Não sei se existe abstração no projeto. Se tiver, troca.

3. **Atalhos `[` e `]`** registrados via `addEventListener`. Tem
   risco de conflito com inputs (mitigei checando `tagName`),
   mas pode ter casos que não cobri.

4. **Componentes inline em vez de arquivos separados.** Fiz tudo
   num arquivo só pra facilitar code-review e copy/paste. Se você
   prefere separar `SidebarLeft.tsx`, `TopBar.tsx`, `PainelContexto.tsx`,
   ajusta.

5. **Sem testes.** Não escrevi testes porque não conheço a stack
   de testes do projeto. Se você tem padrão de teste (Vitest, Jest,
   Playwright?), posso escrever na próxima rodada.

---

## ORDEM SUGERIDA DE EXECUÇÃO

1. Copia o arquivo `LayoutTripleFocus.tsx` para a pasta correta.
2. Ajusta `NAV_GROUPS` espelhando a estrutura real do `Layout.tsx`
   atual (10 minutos).
3. Cria a feature flag no entry point (App.tsx).
4. Caio ativa `pawards.layout.variant = "triple-focus"` no localStorage
   dele e testa por 1 dia.
5. Você itera nas Q1-Q4 acima conforme prioridade do Caio.
6. Quando tudo estiver verde, promove para default e remove o
   `Layout.tsx` antigo.

**Tempo estimado total:** 4-6 horas de trabalho seu (vs as 12-15
horas que seriam pra fazer do zero).

---

## PROTOCOLO BIDIRECIONAL

Se você desviar de qualquer decisão minha: registra em
`docs/dr-replit/02_DESVIOS_DA_SPEC.md` com a razão. Se tiver
dúvida arquitetural: append em `docs/dr-replit/03_PERGUNTAS_PRO_DR_CLAUDE.md`.
Eu respondo na próxima rodada.

Não precisa de aprovação minha pra mexer no código. Você é quem
implementa — eu sou suporte arquitetural. Trabalho é nosso, decisão
final é do Caio.

---

## ASSINATURA

Dr. Claude · 21/mai/2026
Componente entregue, briefing completo, decisões pendentes elencadas.
Dr. Replit pode rodar.
