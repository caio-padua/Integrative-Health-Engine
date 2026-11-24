# Craniotomia: pacote de transferência para Manager e Gemini

## 1. Objetivo e limites

1.1 Reproduzir no Manager a **Craniotomia V4 — Split-View**, conservando os três seletores superiores, as caixas de marcação, o grafo, a matriz-espelho e os painéis recolhíveis.

1.2 Este pacote entrega fontes originais e instruções de integração; **não instala nem altera o Manager**.

1.3 A identificação foi feita pela descrição do usuário e conferida em captura da tela original em 23/11/2026.

1.4 A tela V4 é um protótipo visual com dados demonstrativos, chamados de `mock` no código.

1.5 A tela operacional `/craniotomia` é diferente: possui PRANCHETA e TABELA, lê regras reais e permite criar, editar e pausar regras.

1.6 A solução solicitada é **visual da V4 + integração real adaptada ao Manager**, não substituir a V4 pela prancheta mais recente.

1.7 O pacote não é uma cópia inicializável de todo o repositório e não contém banco de clientes, credenciais ou infraestrutura completa.

## 2. Ordem de leitura

| Ordem | Arquivo ou pasta | Finalidade |
|---|---|---|
| 1 | `PROMPT_GEMINI.txt` | Instrução pronta para acompanhar o pacote. |
| 2 | `MANUAL_REPRODUCAO.md` | Anatomia, eventos, geometria, estados e limitações. |
| 3 | `CONTRATO_INTEGRACAO.md` | Como ligar visual, regras, catálogo, anamnese e sugestões. |
| 4 | `CHECKLIST_ACEITE.md` | Critérios verificáveis de conclusão. |
| 5 | `referencia/referencia-craniotomia-v4.jpg` | Captura real, não desenho aproximado. |
| 6 | `originais/artifacts/mockup-sandbox/src/components/mockups/craniotomia/` | Fontes visuais originais, incluindo variantes para consulta. |
| 7 | `originais/artifacts/clinica-motor/src/pages/craniotomia*` | Editor real e prancheta de catálogo. |
| 8 | `originais/artifacts/api-server/src/routes/` | Regras e ativação existentes, com defeitos documentados. |
| 9 | `auditoria/` | Relatório anterior, exportações de regras e testes isolados. |
| 10 | `MANIFESTO.json` e `DEPENDENCIAS.json` | Integridade das cópias e dependências externas/locais. |

## 3. O que copiar e o que não copiar cegamente

| Categoria | Orientação |
|---|---|
| Visual principal | Partir de `CraniotomiaV4.tsx`, `_group.css` e `_mockData.ts`, mantendo os dois últimos ao lado do componente durante a reprodução visual. |
| Dados demonstrativos | Usar somente na demonstração isolada e identificada; jamais inserir no banco clínico. |
| Banco e rotas | Adaptar ao modelo, autenticação e autorização do Manager, após ler os arquivos completos. |
| Catálogo | Resolver códigos para itens reais existentes no destino; não presumir que os mesmos identificadores numéricos existem. |
| Dependências | Reutilizar as do projeto de destino; `workspace:*` e `catalog:` são convenções deste monorepositório, não versões instaláveis fora dele. |
| Layout externo | Manter a navegação do Manager; não importar toda a aplicação PAWARDS para obter uma única tela. |
| Aparência | Não redesenhar a tela em relevo tridimensional por iniciativa própria; o pedido é reproduzir a Craniotomia apresentada. |
| Auditoria anterior | Retrato do ambiente de desenvolvimento em 23/11/2026, não laudo de produção do Manager. |

## 4. Endereços de referência

Base de desenvolvimento:
`https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev`

| Tela | Caminho |
|---|---|
| **Principal: V4 com três modos e laterais recolhíveis** | `/__mockup/preview/craniotomia/CraniotomiaV4` |
| Grafo simples, variante secundária | `/__mockup/preview/craniotomia/GrafoSinapses` |
| Matriz densa, variante secundária | `/__mockup/preview/craniotomia/MatrizDensa` |
| Editor real, aparência diferente | `/craniotomia` |
| Anamneses | `/anamnese` |
| Nova anamnese | `/anamnese/nova` |
| Detalhe de anamnese | `/anamnese/:id` — substituir por identificador autorizado. |
| Validação clínica | `/validacao` |
| Itens terapêuticos | `/itens-terapeuticos` |
| Catálogo | `/catalogo` |
| Questionário mestre | `/questionario-master` |

São endereços de desenvolvimento e podem exigir ambiente ativo e autenticação.
Não utilizar o antigo endereço `/mockup-canvas/craniotomia/GrafoSinapses`, que retornou página não encontrada na auditoria.

## 5. Entrega ao outro projeto

Extrair o pacote completo e começar por `PROMPT_GEMINI.txt`.
O arquivo textual consolidado, entregue separadamente, serve quando o Gemini não consegue explorar o ZIP.
O consolidado contém os documentos e fontes textuais, mas não incorpora a fotografia como imagem.
Anexar também a captura quando for necessário conferir fidelidade visual.

Nenhum envio ao GitHub foi realizado como parte deste pacote.
Os documentos estão no repositório local em `docs/dr-replit/CRANIOTOMIA_TRANSFERENCIA/`.
A existência local não prova publicação remota.

**RESUMO EM 1 LINHA:** Copiar a V4 para preservar o visual e adaptar conscientemente o motor real, sem transformar demonstração em funcionamento clínico fictício.
