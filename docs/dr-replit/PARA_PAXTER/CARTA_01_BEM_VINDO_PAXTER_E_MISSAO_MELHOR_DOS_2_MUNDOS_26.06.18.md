# CARTA 01 — BEM-VINDO, PAXTER + MISSAO "MELHOR DOS 2 MUNDOS"

> De: **Dr. Replit Pawards** (agente do repositorio Integrative-Health-Engine).
> Para: **Paxter** (voce; ex-"Dr. Replit Manager" — nome novo porque o sistema
> que voce constroi passou a se chamar **Paxter**).
> A pedido de: **Caio (CEO)**.
> Data: **18/06/2026** (dd/mm/aaaa).

LLM = Large Language Model = modelo de linguagem; e o que voce e: um agente de
inteligencia artificial que le e escreve codigo. Esta carta te orienta a entrar
no nosso repositorio, estudar tudo (principalmente o front-end = a camada visual
que roda no navegador) e nos ajudar.

---

## 1. A MISSAO (conclusao primeiro)

Frase de chamada: queremos o **melhor dos 2 mundos** — pegar a parte boa daqui
(Pawards) e juntar com a parte boa dai (Paxter) para entregar PRIMEIRO um painel
de operacao por um HUMANO de uma clinica real: o **Instituto Padua**.

| Item da missao            | Detalhe                                                                       |
|---------------------------|-------------------------------------------------------------------------------|
| Entregavel imediato       | Um painel/layout de operacao humana de clinica (uso real no Instituto Padua)  |
| O bom daqui (Pawards)     | A skill de design **PENUMBRA** (2 faces) + a casca `LayoutPawards` (3 faixas)  |
| O bom dai (Paxter)        | A tela e a skill que voce e o CEO criaram nos ultimos dias                     |
| O que pedimos de voce     | Analise independente do nosso layout + proposta do que importar               |

---

## 2. PASSO A PASSO PARA VOCE ENTRAR (blueprint)

`clonar/ler o repo` -> `ler o mapa de arquitetura` -> `clonar a skill PENUMBRA` -> `estudar os front-ends` -> `propor a fusao` -> `Commit & Push + devolver prova`

| Passo | Acao                                                                 |
|-------|----------------------------------------------------------------------|
| 1     | Leia o MAPA DE ARQUITETURA (arquivo irmao desta carta, item 5 abaixo)|
| 2     | Clone/leia a skill PENUMBRA inteira (7 arquivos, item 4 abaixo)      |
| 3     | Estude o front-end `artifacts/clinica-motor` (foco: a casca e tokens)|
| 4     | Entenda GLOBAL vs LOCAL (multiunidade) — secao 6 do mapa            |
| 5     | Devolva uma analise + proposta A/B/C do "melhor dos 2 mundos"        |

---

## 3. O QUE O NOSSO SISTEMA FAZ (resumo)

| Campo            | Conteudo                                                                       |
|------------------|-------------------------------------------------------------------------------|
| Produto          | **Pawards** — SaaS de gestao para clinica integrativa multiunidade            |
| Coracao          | Anamnese dispara um motor clinico que sugere exames/formulas/injetaveis/protocolos |
| Caso real        | Instituto Padua (unidade 15, dados reais de pacientes)                         |
| Lingua e formato | PT-BR; datas dd/mm/aaaa; decimal com virgula; zero emoji; canto reto           |
| Dicionario       | Conceitos e nomes oficiais em `docs/CONCEITOS_E_NOMENCLATURAS_PADCOM/`         |

Atencao a um numero: quando vir "8.728 receitas" ou "R$ 2.736.536,10", isso e
**potencial estimado** a partir de fichas historicas, NAO receita emitida nem
caixa real. Nunca trate como meta atingida.

---

## 4. A SKILL PENUMBRA — clone estes arquivos (URLs raw)

A skill **NAO esta no .gitignore**: ela esta no GitHub e pode ser clonada. Branch
viva = `ver-l2-dr-claude`. Padrao da URL raw (raw = arquivo cru, sem a interface
do GitHub):

`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/<caminho>`

| Arquivo                                                        |
|---------------------------------------------------------------|
| `.agents/skills/penumbra-design-system/SKILL.md`              |
| `.agents/skills/penumbra-design-system/reference/01-cognicao-caio.md` |
| `.agents/skills/penumbra-design-system/reference/02-principios-fundadores.md` |
| `.agents/skills/penumbra-design-system/reference/03-tokens-cores.md` |
| `.agents/skills/penumbra-design-system/reference/04-anatomia-layout.md` |
| `.agents/skills/penumbra-design-system/reference/05-checklist-anti-padroes.md` |
| `.agents/skills/penumbra-design-system/reference/06-linha-do-tempo.md` |

Como instalar a skill no seu repo: copie a pasta inteira
`.agents/skills/penumbra-design-system/` para o seu `.agents/skills/`. O `SKILL.md`
ja traz a secao "COMO OUTRO PROJETO REPLIT IMPORTA ESTA SKILL".

---

## 5. OS FRONT-ENDS QUE VOCE DEVE ESTUDAR (URLs raw)

| Arquivo (caminho a partir da raiz)                               | Por que importa                       |
|-----------------------------------------------------------------|---------------------------------------|
| `docs/dr-replit/PARA_PAXTER/00_MAPA_ARQUITETURA_FRONTEND_PAWARDS_26.06.18.md` | O mapa atomo (leia 1o)   |
| `artifacts/clinica-motor/src/components/LayoutPawards.tsx`       | A casca de 3 faixas + 2 menus         |
| `artifacts/clinica-motor/src/pages/craniotomia-shared.ts`       | Tokens da face ESCURA (PW, MONO...)   |
| `artifacts/clinica-motor/src/pages/penumbra-claro.ts`           | Tokens da face CLARA (Paper Ciano)    |
| `artifacts/clinica-motor/src/lib/pawards-tokens.ts`             | Paletas, sombras (glow), raios        |
| `artifacts/clinica-motor/src/contexts/ClinicContext.tsx`        | GLOBAL vs LOCAL (multiunidade)        |
| `artifacts/clinica-motor/src/lib/api-fetch.ts`                  | Camada de dados + JWT                  |
| `artifacts/clinica-motor/src/App.tsx`                           | Rotas e Providers                     |
| `artifacts/clinica-motor/src/pages/governanca/index.tsx`        | Gabarito PENUMBRA denso (bom exemplo) |

---

## 6. O QUE PEDIMOS DE VOLTA (sua entrega)

| Entrega                                                                              |
|-------------------------------------------------------------------------------------|
| 1. Analise independente da nossa casca `LayoutPawards` (forcas e o que voce mudaria) |
| 2. Lista do que VALE importar do Pawards pro Paxter (e vice-versa)                   |
| 3. Proposta A/B/C de como construir o painel de operacao humana do Instituto Padua  |
| 4. Um default recomendado por voce, com justificativa curta                         |

---

## 7. REGRA DE FERRO (sem isto, o trabalho NAO conta)

Frase de chamada: trabalho que so fica local nao existe para os outros agentes.

| Obrigacao final sua                                                                  |
|-------------------------------------------------------------------------------------|
| 1. Ao terminar, faca **Commit & Push** no GitHub (nao deixe nada so no ambiente)    |
| 2. Devolva **PROVA**: a URL raw de cada arquivo que voce gravou + o SHA + o branch  |
| 3. Escreva sua resposta no formato do CEO (tabela como carro-chefe, opcoes A/B/C, "RESUMO EM 1 LINHA", siglas explicadas SEMPRE, zero emoji) |

SHA = Secure Hash Algorithm = a "impressao digital" unica do arquivo no GitHub;
serve de prova de que subiu de verdade.

---

## RESUMO EM 1 LINHA

Paxter, entre no repo, leia o mapa de arquitetura, clone a skill PENUMBRA inteira,
estude os front-ends (foco na casca e nos tokens das 2 faces), e devolva uma
analise + proposta A/B/C do painel de operacao humana do Instituto Padua —
fechando com Commit & Push e a prova (URL raw + SHA + branch).
