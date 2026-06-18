# MAPA DE ARQUITETURA — FRONT-END PAWARDS (nível "átomo")

> Destinatario: **Paxter** (ex-"Dr. Replit Manager"; novo nome do agente porque o
> sistema dele passou a se chamar **Paxter**).
> Autor: **Dr. Replit Pawards** (agente do repositorio Integrative-Health-Engine).
> Data: **18/06/2026** (dd/mm/aaaa).
> Objetivo: dar a um agente LLM (LLM = Large Language Model = modelo de linguagem
> grande, tipo de inteligencia artificial que le e escreve texto/codigo) o
> entendimento COMPLETO da nossa arquitetura de front-end (front-end = a camada
> visual que roda no navegador), no nivel mais fino possivel, para que ele
> consiga: (1) analisar de forma independente o nosso layout; (2) propor o que
> importar; (3) ajudar a construir PRIMEIRO um painel de operacao por um HUMANO
> de uma clinica — caso real: **Instituto Padua**.

---

## 0. GLOSSARIO — toda sigla explicada (ler primeiro)

| Sigla / termo            | Significado por extenso (o que e na pratica)                                                  |
|--------------------------|-----------------------------------------------------------------------------------------------|
| LLM                      | Large Language Model — modelo de linguagem; agente de IA que le e gera texto e codigo          |
| UI                       | User Interface — interface do usuario; o que aparece na tela                                   |
| API                      | Application Programming Interface — porta de comunicacao entre front-end e servidor            |
| OpenAPI                  | Padrao que descreve a API num arquivo unico; dele geramos codigo automatico                    |
| Orval                    | Ferramenta que LE o OpenAPI e GERA os hooks de chamada da API no front                         |
| ORM                      | Object Relational Mapping — camada que conversa com o banco de dados via objetos (usamos Drizzle)|
| JWT                      | JSON Web Token — cracha digital assinado que prova quem esta logado                            |
| 2FA                      | Two-Factor Authentication — segundo fator de login (alem da senha)                             |
| RBAC                     | Role Based Access Control — controle de acesso por perfil (aqui o campo e `perfil`, nunca `role`)|
| KPI                      | Key Performance Indicator — indicador-chave (numero de destaque no painel)                     |
| SaaS                     | Software as a Service — software vendido como servico na nuvem                                 |
| CSS                      | Cascading Style Sheets — linguagem de estilo visual (cores, espacos, fontes)                   |
| DOM                      | Document Object Model — a arvore de elementos da pagina no navegador                           |
| HMR                      | Hot Module Replacement — recarga a quente; troca o codigo na tela sem dar refresh              |
| localStorage            | Memoria do navegador que guarda preferencias mesmo apos fechar a aba                           |
| token (de design)        | Valor reutilizavel de estilo (uma cor, uma fonte) com nome semantico                           |
| PENUMBRA                 | Nome do nosso sistema de design (a "moeda" com 2 faces: CLARO e ESCURO)                        |
| face                     | Uma das 2 variantes do PENUMBRA: CLARO (Paper Ciano) ou ESCURO (Navy Ciano)                    |
| shell / casca            | O esqueleto fixo da tela (faixas, menus) dentro do qual o conteudo muda                        |
| shadcn/ui                | Biblioteca de componentes prontos (Card, Button, Dialog) — usamos so em telas legadas          |
| tenant                   | Inquilino — aqui = unidade/clinica; filtro de tenant = isolar dados por unidade                |

---

## 1. O QUE E O SISTEMA (em um bloco)

| Campo                | Conteudo                                                                                  |
|----------------------|-------------------------------------------------------------------------------------------|
| Nome do produto      | **Pawards** (repositorio GitHub: `caio-padua/Integrative-Health-Engine`)                   |
| Tipo                 | SaaS de gestao para clinica medica integrativa multiunidade                                |
| Coracao funcional    | Anamnese dispara um "motor clinico" que sugere exames, formulas, injetaveis, protocolos    |
| Publico desta missao | Operacao por HUMANO de uma clinica real: **Instituto Padua** (unidade 15, dados reais)     |
| Lingua               | Tudo em portugues do Brasil (PT-BR); datas dd/mm/aaaa; decimal com virgula                 |
| Disciplina visual    | Sistema de design **PENUMBRA**, 2 faces em paralelo (CLARO e ESCURO)                       |

Regra de ouro do dono (Caio, CEO): nomes sempre completos e semanticos, nunca
abreviados; o campo de perfil chama-se **`perfil`** (jamais `role`); zero emoji em
texto tecnico; canto reto (border-radius 0 = quina sem arredondamento); fonte
JetBrains Mono.

---

## 2. FORMA DO MONOREPO (monorepo = um repositorio com varios apps)

Blueprint da arvore (-> = "contem / leva a"):

`raiz` -> `artifacts/` (apps publicaveis) + `lib/` (bibliotecas compartilhadas) + `docs/` (documentos) + `pnpm-workspace.yaml`

| Pasta                         | O que e                                                                          |
|-------------------------------|----------------------------------------------------------------------------------|
| `artifacts/clinica-motor`     | **FRONT-END web** (React + Vite) — o foco deste mapa                              |
| `artifacts/api-server`        | **BACK-END** (servidor Express) — serve a API em `/api`                           |
| `artifacts/mockup-sandbox`    | Bancada de prototipos (preview de componentes no canvas)                          |
| `lib/*`                       | Bibliotecas compartilhadas (ex.: cliente da API gerado, schema do banco)         |
| `docs/`                       | Documentacao (incluindo ESTA carta, em `docs/dr-replit/PARA_PAXTER/`)             |

Contrato primeiro (contract-first): a verdade da API mora no OpenAPI; o Orval
gera os hooks e os schemas Zod (Zod = biblioteca que valida formato de dados).
Comando de geracao: `pnpm --filter @workspace/api-spec run codegen`.

---

## 3. ENTRADA E ROTEAMENTO (como a tela liga e troca de pagina)

Blueprint do boot (boot = ligar o app):

`src/main.tsx` -> renderiza `<App />` -> `src/App.tsx` monta os Providers -> `<Router/>` (wouter) -> casa a URL com a pagina

| Item                  | Caminho real                         | Papel                                                              |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|
| Ponto de entrada      | `artifacts/clinica-motor/src/main.tsx` | Inicia o React e injeta o `<App/>` no DOM                          |
| Raiz da aplicacao     | `artifacts/clinica-motor/src/App.tsx`  | Empilha Providers (QueryClient, Tooltip, Auth, Clinic, 2FA, Sessao)|
| Roteador              | biblioteca `wouter` (`Switch`, `Route`)| Casa o caminho da URL com o componente de pagina                  |

Rotas-amostra (a lista completa esta em `src/App.tsx`):

| Caminho (URL)                      | Pagina renderizada      | Para que serve                          |
|------------------------------------|-------------------------|-----------------------------------------|
| `/`                                | Login                   | Entrada                                  |
| `/inicio`                          | InicioClinico           | Home do operador da clinica              |
| `/pacientes`                       | Pacientes               | Lista principal de pacientes             |
| `/pacientes/:id/cockpit`           | PacienteCockpitPage     | Painel tatico do paciente                |
| `/atendimento/exames/:pacienteId`  | ExamesDashboardMedico   | Dashboard de exames (5 zonas)            |
| `/financeiro`                      | FinanceiroPage          | Modulo financeiro                        |
| `/anamnese`                        | Anamneses               | Lista de anamneses                       |
| `/craniotomia`                     | CraniotomiaPage         | Tela densa do motor (grafos/matrizes)    |

---

## 4. A CASCA (SHELL) — `src/components/LayoutPawards.tsx`

E o esqueleto fixo onde TODA pagina vive. Contrato publico (assinatura da funcao):

`<LayoutPawards face="claro" | "escuro" children={conteudo} />`

- `face` (opcional, default `"escuro"`) escolhe a face PENUMBRA.
- `children` e o conteudo da pagina (o miolo que troca por rota).
- Importante: a face efetiva = override do usuario (localStorage `pwx.face`) OU a
  prop `face`. O usuario pode trocar a face no topo, e a escolha persiste.

Anatomia em 3 faixas horizontais (faixa = barra de cima a baixo da largura toda):

| Faixa | Nome              | Conteudo                                                                         |
|-------|-------------------|----------------------------------------------------------------------------------|
| 1     | Topo (identidade) | Logo; seletor Local/Global; niveis 1·2·3; troca de face Claro/Escuro; busca ⌘K; operador |
| 2     | Trilha            | Breadcrumb (migalha de navegacao) + KPIs ao vivo (agenda/alertas)                |
| 3     | Paciente          | Contexto do paciente ativo + abas de navegacao rapida                            |

Menus laterais (e as "teclinhas" de recolher/expandir que o CEO pediu em 18/06/2026):

| Lado    | Componente interno  | Comportamento                                                                 |
|---------|---------------------|-------------------------------------------------------------------------------|
| Esquerdo| `SidebarL2`         | 2 modos: `getNavEnxuto` (dia a dia) e `getNavGroups` (avancado). Botao ◂ recolhe pro nivel 1; tarja "MENU" reabre (clique ou teclado). |
| Direito | `PainelContextoL2`  | Painel de contexto. Header tem botao ▸ (recolher); colapsado vira tarja clicavel com ◂ (expandir). |

Estado e persistencia (localStorage = memoria do navegador):

| Chave localStorage | Guarda                                                |
|--------------------|-------------------------------------------------------|
| `pwx.face`         | Face escolhida (claro/escuro)                         |
| `pwx.nivel`        | Nivel de visualizacao / densidade da sidebar (1·2·3)  |
| `pwx.right`        | Painel direito recolhido ou nao                       |
| `pwx.modoMenu`     | Menu enxuto ou completo                                |

Atalhos de teclado: `[` recolhe/expande o menu esquerdo; `]` o painel direito;
`1` `2` `3` trocam o nivel de visualizacao. As teclinhas visiveis ESPELHAM esses
atalhos (regra nova da skill: "teclinha visivel obrigatoria", o atalho de teclado
complementa, nunca substitui).

---

## 5. TOKENS E AS DUAS FACES (a "moeda" PENUMBRA)

Token de design = um valor de estilo reutilizavel com nome semantico (ex.: a cor
de fundo, a fonte). Tudo se monta a partir dos tokens, nunca com hex solto.

| Arquivo                                   | O que exporta                                                          |
|-------------------------------------------|------------------------------------------------------------------------|
| `src/pages/craniotomia-shared.ts`         | `PW` (cores da face ESCURA Navy), `MONO` (JetBrains Mono), `inputStyle`, `labelStyle`, `getNavGroups`, e o tipo `PWPalette` |
| `src/pages/penumbra-claro.ts`             | Tokens e estilos da face CLARA (Paper Ciano)                           |
| `src/lib/pawards-tokens.ts`               | Objeto `PAWARDS` com paletas, sombras (glow), e raios de borda         |

As 2 faces, lado a lado (esta e a essencia do "uma skill, duas faces EM PARALELO"):

| Face    | Apelido       | Fundo        | Neon principal | Detalhe        | Uso recomendado                          |
|---------|---------------|--------------|----------------|----------------|------------------------------------------|
| CLARO   | Paper Ciano   | papel claro  | ciano profundo | sepia          | telas que serao IMPRESSAS / leitura longa|
| ESCURO  | Navy Ciano    | navy escuro  | ciano neon     | ouro           | operacao / cockpit / dia a dia na tela   |

Regras inegociaveis de toda tela PENUMBRA (valem nas 2 faces):
- border-radius 0 (quina reta em tudo);
- JetBrains Mono (fonte) universal para dados; PT-BR em toda label;
- zero emoji; retangulo-dentro-retangulo (paineis aninhados);
- cor de dominio so no item ATIVO; um unico elemento "vivo" por tela;
- hover "luz por tras" (brilho aparece atras do elemento ao passar o mouse).

---

## 6. GLOBAL vs LOCAL (multiunidade — o ponto que o CEO destacou)

Conceito: a clinica tem varias unidades. O operador pode estar travado numa
unidade (LOCAL) ou, se o perfil permitir, ver tudo (GLOBAL).

| Item                 | Caminho / valor real                                                  |
|----------------------|------------------------------------------------------------------------|
| Provider (contexto)  | `src/contexts/ClinicContext.tsx`                                       |
| Hook de consumo      | `useClinic()` — entrega `unidadeSelecionada` (um ID, ou `null` = Global)|
| Persistencia         | localStorage `pawards.unidade.selecionada.v1`                          |
| Quem pode ir Global  | perfis tipo `consultoria_master`; perfis operacionais ficam na unidade |
| Como a pagina usa    | injeta `unidadeId` no filtro das queries (ex.: `useListarPacientes({ unidadeId })`) |

Blueprint do fluxo de escopo:

`usuario escolhe unidade no topo` -> `ClinicContext guarda unidadeSelecionada` -> `pagina le useClinic()` -> `query manda ?unidadeId` -> `back-end filtra por tenant (fail-closed)`

Seguranca: rotas clinicas usam filtro de tenant estrito no servidor (fail-closed
= se a permissao nao bate, NEGA por padrao), para evitar um usuario ver dados de
outra unidade.

---

## 7. CAMADA DE DADOS NO FRONT (como a tela fala com o servidor)

| Item                 | Caminho real                          | Papel                                                  |
|----------------------|---------------------------------------|--------------------------------------------------------|
| Hooks da API         | importados de `@workspace/api-client-react` | Gerados pelo Orval a partir do OpenAPI; chamam a API   |
| Fetch central        | `src/lib/api-fetch.ts` (`apiFetch`)   | Injeta o JWT (`pawards.auth.token`); trata 401 e 403   |
| PDF autenticado      | `abrirPdfAutenticado(url)`            | Baixa o PDF com JWT e abre via Blob (sem vazar token)  |
| Cache/estado servidor| React Query (`@tanstack/react-query`) | Guarda e revalida os dados vindos da API               |

401 = nao autenticado (sessao expirou) -> manda relogar. 403 = proibido (aqui,
2FA expirado) -> dispara o modal de reverificacao de 2FA.

---

## 8. INVENTARIO DE PAGINAS (PENUMBRA pronto vs legado shadcn)

Sincero (anti-fantasia): nem toda tela ja segue PENUMBRA. Estado real:

| Grupo                                  | Estado de design                                  |
|----------------------------------------|---------------------------------------------------|
| `pages/anamnese/`                      | PENUMBRA (inline + CSS injetado)                  |
| `pages/followup/`                      | PENUMBRA (tokens craniotomia-shared)              |
| `pages/governanca/`                    | PENUMBRA (matrizes densas) — bom gabarito         |
| `pages/craniotomia.tsx`                | PENUMBRA (apice do design; grafos/matrizes)       |
| `pages/catalogo/`                      | PENUMBRA (Btn/Chip/SearchBar)                     |
| `pages/laboratorio-validacao.tsx`      | PENUMBRA (gabarito de reescrita recente)          |
| `pages/pacientes/index.tsx`            | HIBRIDO (shadcn Card/Table/Dialog com bordas neon)|
| `pages/financeiro/index.tsx`           | HIBRIDO (componentes `ui/` shadcn)                |
| `pages/atendimento/exames/[id].tsx`    | HIBRIDO (Recharts + Tailwind)                     |
| ~19 telas claras legadas               | AINDA shadcn/claro dentro da casca navy           |

Divida tecnica conhecida: o conteudo interno de varias telas claras nao segue a
face; a casca ja e PENUMBRA, mas o miolo precisa de reescrita tela a tela. O CEO
ja sabe e aceitou que "nao da pra corrigir tudo agora".

---

## 9. COMPONENTES REUTILIZAVEIS (`src/components/`)

| Componente                       | Papel                                                        |
|----------------------------------|--------------------------------------------------------------|
| `LayoutPawards.tsx`              | A casca principal (3 faixas + 2 menus)                       |
| `CommandPalette.tsx`            | Busca global por teclado (⌘K)                                |
| `TopProgressBar.tsx`            | Barra de carregamento no topo                               |
| `Reverificacao2faProvider.tsx`  | Modal que intercepta para renovar o 2FA                     |
| `sinaptico/`                    | Barras de progresso e blocos tecnicos expansiveis           |
| `ui/`                           | ~50 componentes atomicos shadcn customizados (tema dark/gold)|

---

## 10. A SKILL DE DESIGN (o que Paxter deve clonar)

A skill PENUMBRA vive em `.agents/skills/penumbra-design-system/` e — confirmado
em 18/06/2026 — **NAO esta no .gitignore**: ela VAI pro GitHub e pode ser clonada.

| Arquivo da skill                         | Conteudo                                              |
|------------------------------------------|------------------------------------------------------|
| `SKILL.md`                               | Indice; "uma skill, duas faces em paralelo"; como importar |
| `reference/01-cognicao-caio.md`          | Como o CEO pensa (TDAH/Asperger/TOC) e o formato dele |
| `reference/02-principios-fundadores.md`  | Os principios P01–P20                                 |
| `reference/03-tokens-cores.md`           | Tokens das 2 faces (CLARO e ESCURO)                   |
| `reference/04-anatomia-layout.md`        | Anatomia (3 faixas + 2 paineis + teclinha obrigatoria)|
| `reference/05-checklist-anti-padroes.md` | Checklist anti-ectoplasma (o que nunca fazer)         |
| `reference/06-linha-do-tempo.md`         | Historia das decisoes de design                       |

---

## 11. PROPOSTA DE REORGANIZACAO ("melhor dos 2 mundos") — opcoes A/B/C

Conclusao primeiro: NAO refatorei o codigo-fonte agora (mover arquivos quebra
imports e pode derrubar o app — risco alto, decisao do CEO). Fiz a parte
reversivel (documentar e empacotar). Abaixo as 3 opcoes para combinar o bom do
Pawards com o bom do Paxter:

| Opcao | O que e                                                                                  | Risco  | Recomendo |
|-------|------------------------------------------------------------------------------------------|--------|-----------|
| A     | Paxter ADOTA nossa skill PENUMBRA + nossa casca LayoutPawards como base e adapta a tela dele | Baixo  | **DEFAULT**|
| B     | Fundir as 2 skills numa so e Paxter reescreve a tela dele sobre a nossa casca             | Medio  |           |
| C     | Refatoracao estrutural grande (extrair a casca e os tokens para uma `lib/` compartilhada entre os 2 sistemas) | Alto   |           |

Premissa assumida: o objetivo imediato e UM painel de operacao humana para o
Instituto Padua, entao a Opcao A entrega valor mais rapido e e reversivel; a
Opcao C fica como evolucao depois que o painel provar valor.

---

## RESUMO EM 1 LINHA

Este mapa entrega, em nivel atomo e linguagem de LLM, toda a arquitetura
front-end do Pawards (entrada, casca de 3 faixas, tokens das 2 faces, global vs
local, camada de dados e inventario de telas) para o Paxter analisar e ajudar a
construir o painel de operacao humana do Instituto Padua.
