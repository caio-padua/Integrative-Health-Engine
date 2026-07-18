# CARTA-MISSAO — MESA ARQUITETURAL PARXIS / REPLIT IHE

> De: Manus AI, arquiteto relator
> Para: Dr. Replit IHE, guardiao do repositorio Integrative-Health-Engine
> Presidente e arbitro: Dr. Caio Henrique Fernandes Padua
> Mesa: PAC-20260718-001
> Tipo: INVESTIGATION
> Estado: APRESENTACAO AUTORIZADA PELO CEO — SOMENTE INVESTIGACAO, ZERO CODIGO
> Convencao: ASCII simples para comunicacao entre agentes.

---

## CONCLUSAO PRIMEIRO

O CEO deseja transformar o Parxis Manager em um SaaS multi-tenant modular e quer que o IHE participe da arquitetura como sistema primo, fonte de experiencia, motores e conhecimento — sem fundir bancos nem criar dependencia operacional perigosa. Manus preparou uma hipotese de fronteiras. Sua missao NAO e implementar nem defender o desenho atual por inercia. Sua missao e confrontar a proposta com o IHE REAL e mostrar o que pode ser reutilizado, o que deve permanecer independente e onde ha duplicidade ou risco.

Esta carta NAO autoriza codigo, migration, seed, alteracao de banco, segredo, configuracao, tela, rota, commit funcional, push ou deploy. A unica escrita permitida nesta rodada e o parecer Markdown solicitado abaixo.

## LEITURA OBRIGATORIA, NESTA ORDEM

1. `docs/mesa-parxis/00_BRIEFING-CEO.md`
2. `docs/mesa-parxis/01-fronteiras-manager-ihe-saas.md`
3. `docs/mesa-parxis/02-protocolo-mesa-arquitetural.md`
4. `docs/mesa-parxis/03-especificacao-parxis-saas-v1.md`
5. `docs/mesa-parxis/04-matriz-decisoes.md`
6. `docs/mesa-parxis/manifest.sha256`
7. `MANIFESTO_DR_REPLIT.md`
8. `HANDOFF_MANUS.md`
9. `replit.md`
10. `docs/dr-claude/README.md`

Confirme o `sha256` antes do parecer. Se o hash falhar, pare e registre `PACOTE_DIVERGENTE`.

## OBJETIVO DA SUA ANALISE

Determinar como o IHE pode colaborar com o Parxis SaaS sem virar uma segunda fonte de verdade para clinicas, contratos ou identidades do Manager, e sem permitir que o Manager replique motores consolidados de forma divergente.

## PERGUNTAS QUE O IHE DEVE RESPONDER

| ID | Pergunta |
|---|---|
| I01 | Quais entidades de `unidades`, `usuarios`, consultorias, modulos, contratos e faturamento estao realmente em uso, e quais sao estrutura aspiracional ou parcial? |
| I02 | O dominio comercial atual do IHE representa venda/licenciamento real, governanca interna ou prototipo? Quais invariantes devem ser preservados? |
| I03 | Quais tabelas, engines, catalogos e fluxos sao consolidados e NAO devem ser transplantados para o Manager? |
| I04 | Que conceitos do IHE podem servir como padrao para o Control Plane do Parxis sem copiar schema ou divida tecnica? |
| I05 | Quais conteudos clinicos podem ser publicados como `CatalogRelease.v1`, sem PII, com versao, hash, vigencia e autoria? |
| I06 | Como o IHE correlacionaria uma `unidade` a uma `empresa` do Manager sem compartilhar PK, senha, token ou banco? |
| I07 | Existe algum fluxo do IHE que dependa hoje do Manager ou vice-versa e que contradiga a independencia proposta? |
| I08 | O IHE precisa participar online de uma operacao clinica do Manager? Se sim, prove por que; se nao, proponha contrato assincrono e fallback. |
| I09 | Que evidencias e padroes do IHE ajudam a validar o Gate 0 de tenant, identidade, auditoria e prova de fluxo? |
| I10 | A fronteira proposta deve ser aprovada, aprovada com ressalvas ou rejeitada? Qual alternativa minima voce recomenda? |

## EVIDENCIAS MINIMAS

O parecer deve conter, sem revelar valores sensiveis:

1. Mapa de `unidades`, `usuarios`, perfis, escopos, consultorias e tenancy real.
2. Mapa de `modulos_sistema`, `contrato_clinica`, `modulos_contratados`, `faturamento_mensal` e rotas/telas consumidoras.
3. Indicacao objetiva do que esta funcional, parcial, sem consumidor ou apenas documentado.
4. Lista de motores e catalogos consolidados candidatos a interface versionada.
5. Contratos externos ja existentes entre IHE e Manager, incluindo direcao, autenticacao, idempotencia e fallback.
6. Decisoes do CEO e ADRs que a proposta precisa preservar.
7. Recomendacao `APROVAR`, `APROVAR_COM_RESSALVAS` ou `REJEITAR` para cada item D01-D14 da matriz.

## LINHAS VERMELHAS

1. Nao tocar em banco, runtime, secrets, deploy ou integracoes.
2. Nao corrigir achado durante a investigacao; apenas registrar evidencia, impacto e prioridade.
3. Nao presumir a arquitetura do Manager. Pergunte na rodada R2 se faltar evidencia do primo.
4. Nao propor banco compartilhado, FK entre repositorios ou leitura direta de tabela do primo.
5. Nao compartilhar hash de senha, JWT interno, token de sessao ou prontuario.
6. Nao transformar o IHE em dependencia online obrigatoria para abrir prontuario ou executar protocolo no Manager.
7. Nao autorizar construcao. O CEO decide em etapa separada.
8. Nao incluir dado clinico identificavel no parecer.

## FORMATO E LOCAL DA RESPOSTA

Crie somente:

`docs/mesa-parxis/respostas/PAC-20260718-001-ihe-r1.md`

Use exatamente o formato R1 definido em `docs/mesa-parxis/02-protocolo-mesa-arquitetural.md`, incluindo evidencias, ressalvas, menor Gate 0 e a declaracao final `SEM_CODIGO`.

Ao concluir, responda ao CEO em Densidade B com:

1. status do parecer;
2. tres riscos mais importantes;
3. recomendacao final;
4. caminho do arquivo;
5. `RESUMO EM 1 LINHA`.

## DEFINICAO DE PRONTO

| Criterio | Evidencia esperada |
|---|---|
| Pacote verificado | Hash conferido |
| Estado real investigado | Arquivos, linhas, consultas somente leitura e testes citados |
| Comercial classificado | Funcional, parcial, zumbi ou conceitual |
| Interfaces propostas | Dono, consumidor, payload, versao, idempotencia e fallback |
| D01-D14 julgados | Classificacao e justificativa para cada decisao |
| Resposta salva | Arquivo no caminho exato |
| Nenhuma implementacao | Diff limitado ao parecer Markdown |

## RESUMO EM 1 LINHA

Dr. Replit IHE: confronte a arquitetura com o IHE real, separe ativos reutilizaveis de acoplamentos perigosos, responda com evidencia e nao altere nada alem do parecer.
