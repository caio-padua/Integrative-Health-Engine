# PROPOSTA — Craniotomia como "Prancheta de Loteamento" (16/06/2026)

Autor: Dr. Replit Pawards. Decisao registrada ANTES do codigo (anti-ectoplasma).

## 1. Conclusao primeiro

| Item | Decisao |
|---|---|
| O que muda | A Craniotomia deixa de ser so tabela com codigos digitados e ganha uma PRANCHETA visual de loteamento |
| Metafora (palavra do CEO) | Cada coluna = um loteamento; cada item real = uma casa; o CEO habita casas e ve as sinapses se ligando |
| Dor resolvida | "como vou saber todos os codigos?" — o CEO NUNCA digita codigo; clica na casa real e o codigo entra sozinho |
| Macro x micro | Macro = todas as sinapses como linhas finas; micro = ao selecionar um no, as linhas dele acendem + inspector |
| Dados | 100% reais: 19 perguntas (questionario_master), 457 itens (itens_terapeuticos), 37 sinapses (regras_motor) |
| Seguranca | Escrita continua so para platform_owner/CEO (gate ja aplicado); leitura para logado |

## 2. Blueprint do fluxo de criar sinapse (sem digitar codigo)

`Escolher pergunta (lista real) -> nomear gatilho (ex. FADIGA) -> clicar na casa real (ex. exame TSH) -> sinapse gravada`

## 3. Anatomia da tela (faces PENUMBRA Navy Ciano)

| Faixa | Conteudo |
|---|---|
| Cabecalho | Titulo + escopo GLOBAL + alternador [PRANCHETA][TABELA] + botao Nova sinapse |
| KPIs | Total / Ativas / Pausadas / por segmento (tabular-nums) |
| Prancheta | 6 colunas: ANAMNESE (SE) + EXAMES + FORMULAS + INJETAVEIS + IMPLANTES + PROTOCOLOS |
| Casas | so as habitadas por padrao (anti-ruido K1); busca por coluna traz casas disponiveis |
| Sinapses | camada SVG: linha fina = repouso; linha acesa = no selecionado (K2) |
| Inspector | no selecionado -> detalhe + editar + pausar + prioridade |

## 4. Regras de ferro respeitadas

1. Quina 90 (border-radius 0), JetBrains Mono, PT-BR, zero emoji, tabular-nums.
2. Retangulo dentro de retangulo; linha vertical 16px; neon = identidade, hover = luz por tras.
3. K1 pulso unico (so o no ativo respira). Cores so dos tokens das faces (sem hex inventado).

## 5. Opcoes consideradas

| Opcao | Descricao | Veredito |
|---|---|---|
| A | So repaginar a tabela em PENUMBRA | Rejeitada — nao surpreende, ainda exige digitar codigo |
| B (escolhida) | Prancheta de loteamento visual + tabela como modo alternativo | Default — realiza a visao do CEO e mantem a tabela solida |
| C | Editor de grafo livre arrastar-soltar com lib pesada | Adiada — risco/peso alto; B entrega o valor com solidez |

## RESUMO EM 1 LINHA
A Craniotomia vira uma prancheta de loteamento onde o CEO habita casas reais com um clique e ve as sinapses se ligarem em macro e micro, sem nunca digitar um codigo.
