# Pactor — Arquitetura do produto TypeScript (proposta)

> Autor: Dr. Replit IHE. Data: 13/06/2026.
> Regra anti-ectoplasma: este documento vem ANTES do codigo.
> Produto IRMAO e INDEPENDENTE do PAWARDS/IHE.

## 1. O que e o Pactor

1.1. Pactor e o RAS KAIZEN v8 (hoje em Google Apps Script) reescrito como
     produto TypeScript, com repositorio proprio e tela propria.

1.2. Hoje o RAS KAIZEN v8 faz: gera o RAS imprimivel, cockpit de protocolo,
     motor de agenda no Google Calendar e o App de Enfermagem (PIN + registro
     de aplicacao de sessao).

1.3. O espelho do codigo atual vive em `docs/dr-replit/ras-kaizen-v8/`.

## 2. Decisoes ja travadas pelo CEO (13/06/2026)

2.1. Repositorio EXCLUSIVO pro Pactor (produto independente).

2.2. Fonte de dados = Opcao A: o Pactor LE do sistema atual (IHE), verdade
     unica, zero duplicacao. NAO tera banco proprio de pacientes.

2.3. O que importar do Apps Script: o CODIGO (como referencia pra traduzir a
     logica pro TypeScript). NUNCA a planilha — os pacientes ja estao no banco
     do IHE (importacao de 13/06/2026: 202 pessoas, R$ 220.543,00).

2.4. Primeira tela do v1 = App de Enfermagem (a "cara" mais rapida de ver).

## 3. Premissas assumidas (reversiveis — corrigir se o CEO discordar)

3.1. O Pactor le do IHE via API REST autenticada (HTTP), NAO compartilhando a
     credencial do banco entre dois projetos.
     Motivo: nunca espalhar segredo de banco; a API ja valida unidade e perfil.

3.2. Stack do Pactor = React + Vite + TypeScript + Tailwind (mesma familia do
     IHE), design PENUMBRA face CLARA "Paper Ciano" (consultorio/dia).

3.3. O Pactor v1 e um app unico (nao um monorepo), pra o CEO criar o Repl,
     instalar e rodar rapido.

3.4. Autenticacao de servico: o Pactor usa um token proprio (a definir como
     segredo no Repl do Pactor) que o IHE reconhece. Detalhe na fase F1.

## 4. Como o Pactor le do IHE (verdade unica)

4.1. O IHE (este projeto, `artifacts/api-server`) ja expoe rotas REST sob `/api`.

4.2. Rotas que JA existem e servem ao App de Enfermagem:
     - `GET /pacientes?unidadeId=15` — lista pacientes da unidade.
     - `GET /pacientes/:id` — ficha do paciente.

4.3. Rotas que FALTAM (gap a construir no IHE, fase F2/F3):
     - listar as SESSOES a aplicar de um paciente (vem de `tratamento_itens`
       com `numero_sessoes`); hoje nao ha endpoint dedicado.
     - registrar a APLICACAO de uma sessao com verificacao de PIN; nao existe.

4.4. Consequencia da Opcao A: registrar aplicacao GRAVA de volta no IHE (senao
     nao seria verdade unica). Por isso os 2 endpoints novos moram no IHE, e o
     Pactor so consome.

## 5. Design (PENUMBRA)

5.1. App de Enfermagem e tela operacional simples: herda o NUCLEO PENUMBRA
     (quina 90, JetBrains Mono, PT-BR, zero emoji, retangulo-dentro-retangulo,
     hover "luz por tras", K1 pulso unico), mas NAO precisa das 3 faixas + 2
     paineis do perfil cockpit completo.

5.2. Face padrao: PENUMBRA CLARO (Paper Ciano), com toggle pra ESCURO (Navy
     Ciano) — a enfermagem trabalha de dia, mas a sala de procedimento pode
     pedir escuro.

5.3. Fonte de verdade dos tokens: a skill `penumbra-design-system` +
     `_design.ts` / `_pawardsPenumbra.tsx` do IHE como referencia.

## 6. Plano em fases (entrega incremental, sem retrabalho)

6.1. F0 — Esqueleto: estrutura do app Vite+TS, design PENUMBRA base, README de
     setup (como criar o Repl, instalar, rodar). Tela de Enfermagem com DADOS
     MOCK (o CEO "ve a cara" sem depender da API).

6.2. F1 — Conexao: cliente de API do IHE + autenticacao por token de servico;
     a tela passa a listar pacientes REAIS da unidade 15.

6.3. F2 — Sessoes: novo endpoint no IHE pra listar as sessoes a aplicar; a tela
     mostra a lista por paciente.

6.4. F3 — Registro com PIN: novo endpoint no IHE pra registrar aplicacao
     (idempotente, auditado); a tela registra com PIN do paciente.

6.5. F4 — RAS-FAP: gera o PDF versionado da ficha de aplicacao + entrega
     (espelhando o `AppEnfermagemRasFap.gs`).

## 7. O que vem do Apps Script (referencia pra traduzir)

7.1. `AppEnfermagemRasFap.gs` — logica do app de enfermagem (PIN, checagem de
     sessao aplicada, pastas CLIENTES, RAS-FAP). Funcoes puras ja testadas.

7.2. `AppEnfermagem.html` — referencia visual da tela atual (sera refeita em
     PENUMBRA, nao copiada).

## 8. O que ESTE documento NAO decide (fica pra confirmar com o CEO)

8.1. Nome final do repositorio do Pactor.

8.2. Se a agenda e o gerador de RAS tambem migram pro Pactor depois, ou ficam
     no Apps Script. (v1 e so Enfermagem.)

## RESUMO EM 1 LINHA

Pactor e o RAS KAIZEN v8 reescrito em TypeScript num repo proprio, lendo do IHE
como verdade unica via API; o v1 e o App de Enfermagem em design PENUMBRA, e o
plano vai de F0 (esqueleto com a "cara") a F4 (RAS-FAP), sem reimportar planilha.
