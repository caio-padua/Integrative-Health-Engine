# Contrato de integração: visual V4, editor real e motor clínico

## 1. Separação obrigatória

```text
PLANO DE CONFIGURAÇÃO
V4 → adaptador de apresentação → serviço de regras → regras_motor
                              ↘ catálogo de perguntas e itens

PLANO DE EXECUÇÃO CLÍNICA
Anamnese salva → motor → regras ativas + catálogo → sugestões pendentes
                                                   ↓
                                            validação profissional
                                                   ↓
                                  prescrição/pedido: ponte própria a verificar
```

API significa interface de programação de aplicações.
Todas as rotas abaixo são referências do projeto de origem, não afirmações sobre o Manager.
O destinatário precisa inspecionar o Manager antes de criar qualquer tabela ou rota duplicada.
A nomenclatura de pessoa atendida no Manager deve ser “cliente”.
Os nomes legados de tabelas nos arquivos originais não são uma ordem para renomear o banco do destino.

## 2. Endereços do serviço atual

| Método e endereço | Entrada | Resultado e cautela |
|---|---|---|
| GET `/api/motor-clinico/regras` | Filtros opcionais `segmento`, `ativo`. | Lista de regras com nome e categoria do item. |
| GET `/api/motor-clinico/loteamento` | Sem corpo. | `{perguntas, itens}` para criar vínculos com catálogo real. |
| POST `/api/motor-clinico/regras` | Objeto de criação abaixo. | Insere regra; exige proprietário da plataforma no código atual. |
| PATCH `/api/motor-clinico/regras/:id` | Subconjunto dos campos de criação. | Atualiza regra; `{ativo:"NAO"}` pausa. |
| POST `/api/anamnese/:id/ativar-motor` | Identificador válido no endereço. | Executa contra anamnese salva e insere sugestões; não usar para simulação. |
| GET `/api/motor-clinico/sugestoes` | Conforme implementação incluída. | Consulta sugestões. |
| POST `/api/motor-clinico/sugestoes/:id/validar` | Contrato original incluído no material de referência. | Atualiza validação; não cria prescrição por si só. |
| POST `/api/motor-clinico/sync-catalogo` | Operação administrativa. | Reconstrói catálogo e desvincula referências; **não executar para importar a tela**. |

Não existe rota de exclusão de regra nas rotas examinadas.
Não existe rota de simulação sem escrita nas rotas examinadas.
Não existe rota de histórico completo de revisão da regra nessas fontes.
Criar essas capacidades no destino demanda implementação explícita, não simplesmente conectar um botão.

## 3. Criação de regra

Exemplo de estrutura, **não comando para execução automática**:

```json
{
  "regraId": "IDENTIFICADOR_GERADO_PELO_DESTINO",
  "perguntaId": "Q012",
  "palavraChave": "FADIGA",
  "segmento": "exame",
  "codigoReferencia": "CODIGO_REAL_SELECIONADO_NO_CATALOGO",
  "blocoReferencia": null,
  "prioridade": "media",
  "observacao": null,
  "ativo": "SIM"
}
```

`segmento`: exame, formula, injetavel, implante ou protocolo.
`prioridade`: baixa, media, alta ou urgente.
`ativo`: SIM ou NAO.
Campos de texto opcionais não vazios aceitam nulo conforme o validador original.
O retorno acrescenta identificador numérico e data de criação.
A listagem acrescenta `itemNome` e `itemCategoria`.

No banco original, `regraId` não tem restrição de unicidade declarada no esquema incluído.
Não confiar em “próximo número” calculado exclusivamente no navegador para concorrência.
Na implementação de destino, definir identificador e proteção contra duplicação no servidor.

## 4. Adaptador entre os modelos

| Visual V4 | Fonte real possível | Regra de adaptação |
|---|---|---|
| `id` | `Regra.id` | Identificador da regra, não do item. |
| `sinal` | `palavraChave` | Acrescentar pergunta e operador como metadados explícitos. |
| `fenotipo` | `itemNome` | Ausência precisa ser erro de vínculo visível, não nome inventado. |
| `tipo` | `segmento` | exame→EXAM, formula→FORM, injetavel→INJE, implante→IMPL, protocolo→PROT. |
| `estado` | `ativo` | SIM→ATIVO e NAO→PAUSADO; bloqueado/aguarda validação exigem modelo adicional. |
| `codigoV4` | Sem equivalente completo | Não chamar código do destino de código da regra sem rótulo correto. |
| `b1` | Classificação de pergunta validada | Não deduzir por prefixos MRE/MRF; são identificadores legados. |
| `b2` | Agrupamento semântico explícito | Palavra-chave pode servir como rótulo inicial, não como ontologia clínica validada. |
| `peso` | Sem equivalente | Não converter prioridade em peso clínico arbitrário. |
| `governanca` | Permissões e política do destino | Não mapear toda regra para AUTO. |
| `requerValidacao` | Política clínica real | Não inferir apenas do tipo de item. |
| `ultimaEdicao` | Histórico de alteração real | `criadoEm` é criação, não última edição. |
| `hits30d` | Eventos de execução reais | Não calcular da quantidade de regras nem usar número fixo. |

O retorno atual do loteamento informa pergunta, bloco e identificador.
O `bloco` não necessariamente é um dos dez códigos visuais da V4.
Construir uma correspondência revisada e mostrar “não classificado” enquanto não existir.
Usar um tipo de apresentação que aceite ausência de peso, histórico e governança.
Não forçar o tipo demonstrativo `Sinapse` preenchendo campos ausentes com valores fictícios.

## 5. O que aproveitar do editor operacional

`craniotomia.tsx` possui consulta, formulário de criação/edição, mutações, mensagens de falha e atualização da consulta `["motor-regras"]`.
`craniotomia-loteamento.tsx` contém a seleção de pergunta e item real.
`craniotomia-shared.ts` contém tipos de regras, perguntas, itens e funções de chave.

Na prancheta:

1. Selecionar um gatilho arma pergunta e palavra-chave.
2. Selecionar uma casa real identifica segmento e `codigoPadcom`.
3. O código do item vira `codigoReferencia` da regra.
4. A interface impede clique repetido enquanto a criação está pendente.
5. A interface também detecta vínculo equivalente já carregado.
6. Após gravação confirmada, a consulta é invalidada para reler o banco.

Essas proteções de interface não substituem idempotência no servidor.
Idempotência significa repetir a mesma operação sem criar efeitos duplicados.
O original usa chave de origem `SE::perguntaId::palavraChave` e chave de destino `EN::segmento::codigo`.
A prancheta mede caixas reais com `getBoundingClientRect` e redesenha curvas após atualização, rolagem e mudança de tamanho.
Essa geometria é alternativa útil para corrigir sobreposição na V4 sem trocar sua composição visual.

## 6. Como a ativação atual realmente funciona

O arquivo `anamnese.ts` contém o tratador completo.
O relatório de auditoria incluído detalha cada uma das 37 regras e os 20 cenários isolados.

| Etapa | Comportamento observado no código auditado |
|---|---|
| Entrada | Lê uma anamnese salva pelo identificador. |
| Sinais | Q010 queixa, Q012 sintomas, Q013 doenças, Q014 história familiar. |
| Normalização | Letras maiúsculas; não resolve acentos, negação ou sujeito. |
| Correspondência | `sinal.includes(palavraChave) || palavraChave.includes(sinal)`. |
| Preferências | Q030 somente exames, Q032 injetáveis e Q033 implantes. |
| Financeiro | Q041; perfil básico limita alguns segmentos. |
| Regras | Somente `ativo="SIM"`. |
| Destino | Código da regra procura item terapêutico disponível. |
| Duplicação interna | Remove repetições de segmento+código dentro da mesma execução. |
| Ausência de resultado | Pode gerar painel básico de exames como alternativa automática. |
| Persistência | Insere sugestões e depois atualiza a anamnese, separadamente. |

O campo JSON original é grafado `respostasClincias`; preservar ao ler o legado ou fazer migração explícita.
O motor não aplica a pergunta da regra de forma geral, embora a interface sugira uma ligação pergunta→ação.
Os 37 registros auditados têm valores MRE/MRF/MRI/MRP em `perguntaId`, em vez de perguntas Qxxx.
Não transportar esse defeito para o Manager.

## 7. Defeitos que a integração não pode esconder

| Achado da auditoria | Consequência |
|---|---|
| “NEGA FADIGA” contém FADIGA | Ativação indevida sem compreensão de negação. |
| DIABETES somente na família | Pode tratar o dado como sinal clínico do próprio cliente. |
| LUPUS e LÚPUS | Resultados diferentes pela ausência de normalização de acentos. |
| Fragmento FAD | Pode corresponder a FADIGA pela comparação bidirecional. |
| Q031 rejeita fórmulas | Preferência não é aplicada pelo motor auditado. |
| Doença marcada NEGADO | O estado do objeto não é considerado. |
| Alergias | Não são usadas pelo tratador para bloquear sugestão. |
| Vitamina C | Observação endovenosa diverge da categoria intramuscular do item resolvido. |
| Reativação | Insere sugestões novamente; não há proteção entre execuções. |
| Botão de ativação | Tela envia `{data:{anamneseId:id}}`, mas cliente gerado espera `{id}`. |
| Mapas ricos | Tabelas de mapa de anamnese e decisão existem, mas não são usadas nessa ativação. |
| Segurança clínica | Rotas analisadas precisam de revisão de escopo e validação profissional no destino. |

Esses são achados do projeto de origem, não uma acusação sobre o Manager.
O destinatário deve conferir quais já estão resolvidos no seu próprio motor.
Não transportar o código do motor em bloco para “fazer funcionar rapidamente”.

## 8. Modelo de integração recomendado, ainda não implementado neste pacote

8.1 Separar apresentação, consulta de regras e execução clínica.

8.2 Exigir pergunta canônica, operador de comparação, resposta afirmada e contexto do sujeito.

8.3 Registrar versão da regra e evidência da resposta que gerou cada sugestão.

8.4 Aplicar preferências, restrições clínicas e autorização antes da geração.

8.5 Executar inserção e atualização relacionadas em uma transação.

8.6 Criar proteção de repetição por anamnese, versão de execução e destino.

8.7 Separar SIMULAÇÃO sem escrita de ATIVAÇÃO clínica com escrita.

8.8 Na simulação, apresentar regras ativadas, rejeitadas e motivos; não criar sugestões clínicas.

8.9 Validar escopo de unidade e permissão no servidor, não somente ocultar botão.

8.10 Tratar regra global como recurso distinto de informação clínica local.

8.11 Fazer validação profissional antes de prescrever e verificar a ponte com pedidos e protocolos.

8.12 Não habilitar exclusão definitiva até haver política de histórico, referências e recuperação.

## 9. Sequência de execução no Manager

| Etapa | Entrega verificável |
|---|---|
| 1 | Inspeção do projeto de destino, identificação do motor existente e correspondências documentadas. |
| 2 | Reprodução visual isolada da V4 com sinalização de demonstração. |
| 3 | Adaptador de leitura com regras e catálogo reais, sem operações clínicas. |
| 4 | Criação, edição e pausa autorizadas, confirmadas por releitura após recarregar. |
| 5 | Simulação sem escrita, somente se implementada e testada. |
| 6 | Integração clínica com validação, proteção de repetição e segurança. |
| 7 | Evidência visual e funcional; publicação de alterações no repositório autorizado. |

Executar em fila, sem disparar agentes paralelos nem alterações não relacionadas.
Não tocar no cálculo de orçamento, autenticação global ou cadastro de clientes só para portar esta tela.
Não executar importação automática de regras clínicas sem revisão dos códigos e significados.

**RESUMO EM 1 LINHA:** A aparência é copiável; a ligação clínica exige um adaptador explícito e correções verificadas, não a substituição de dados demonstrativos por uma lista qualquer.
