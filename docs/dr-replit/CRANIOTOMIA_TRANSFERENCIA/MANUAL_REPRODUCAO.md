# Manual técnico de reprodução fiel da Craniotomia V4

## 1. Fonte de verdade

O componente principal é `artifacts/mockup-sandbox/src/components/mockups/craniotomia/CraniotomiaV4.tsx`.
Ele exporta `CraniotomiaV4` por nome, não como exportação padrão.
Os únicos módulos locais importados diretamente por ele são `_group.css` e `_mockData.ts`.
As bibliotecas externas diretamente importadas são React e `lucide-react`.
As classes utilitárias dependem do Tailwind CSS, sistema de estilos utilitários.
O projeto original usa React 19.1.0, Tailwind ^4.1.14, Vite ^7.3.0 e lucide-react ^0.545.0, conforme o catálogo de dependências.
O pacote inclui os arquivos de configuração originais como referência, não como substitutos automáticos dos arquivos do Manager.

Para a reprodução visual isolada, importar `{ CraniotomiaV4 }` e renderizar `<CraniotomiaV4 />`.
Manter os caminhos relativos dos arquivos adjacentes.
Garantir que o compilador do Tailwind examine o diretório em que esses arquivos foram colocados.
Copiar somente o componente, sem compilar suas classes, produzirá uma tela desconfigurada.
No Tailwind de versão diferente, conferir classes arbitrárias, variáveis de cor e variantes em vez de trocar a biblioteca inteira sem necessidade.

## 2. Anatomia exata

```text
┌────────────────────────────────────────────────────────────────────────┐
│ CRANIOTOMIA   [VISUALIZAÇÃO] [EDIÇÃO] [SIMULAÇÃO]   BUSCA  ? NOVA SINAPSE│
│ TOTAL ATIVAS PAUSADAS BLOQ VALID HITS 30D MARCADAS     FILTROS POR BLOCO│
├───────┬──────────────────────────────────────────────┬─────────────────┤
│LEGENDA│ ORIGENS       GRAFO DE CONEXÕES      DESTINOS │ INSPETOR        │
│64/24px│ caixas    curvas por sinapse         caixas  │320px inicial    │
│       ├──────── divisor arrastável de 6px ───────────┤220–560px aberto │
│       │ [GRAFO] [50/50] [MATRIZ]                     │24px recolhido   │
│       │ MATRIZ-ESPELHO: caixas de seleção e linhas   │dados da seleção │
├───────┴──────────────────────────────────────────────┴─────────────────┤
│ LEGENDA DE ESTADOS                                    ATALHOS V E S ? │
└────────────────────────────────────────────────────────────────────────┘
```

| Elemento | Implementação e medidas |
|---|---|
| Raiz | `craniotomia-root`, coluna flexível, largura total, fonte-base de 11 pixels, conteúdo excedente oculto. |
| Cabeçalho | Duas faixas; primeira com título, modos e busca; segunda com contadores e filtros. |
| Três retângulos | `ModoBtn`: VISUALIZAÇÃO, EDIÇÃO, SIMULAÇÃO; seleção exclusiva em `modo`. |
| Busca | Caixa de largura `w-56`; busca em subcategoria, ação, código e sinal. |
| Legenda esquerda | 64 pixels aberta, 24 recolhida; botão com seta no próprio painel. |
| Região central | Grafo acima e matriz abaixo, compartilhando filtros e seleção. |
| Origem | Coluna de 220 pixels, cor do bloco na faixa lateral da caixa. |
| Destino | Coluna de 240 pixels, ícone e cor do tipo de ação. |
| Divisor horizontal | 6 pixels; arraste vertical define a proporção. |
| Divisor do inspetor | 4 pixels; arraste horizontal altera a largura. |
| Inspetor direito | 320 pixels inicial, limites de 220 e 560; recolhido ocupa 24. |
| Rodapé | 28 pixels; legenda de estados, cor/espessura e atalhos. |
| Histórico | Janela de 640 pixels, altura máxima de 85% da janela; conteúdo demonstrativo. |

Os “três retângulos” são os três modos superiores.
Há ainda três comandos menores no divisor: GRAFO, 50/50 e MATRIZ.
A “sanfona” corresponde aos painéis recolhíveis e ao divisor horizontal; são mecanismos diferentes, não um único componente de acordeão.

## 3. Estado e persistência no navegador

O auxiliar `usePersisted` lê e grava JSON no `localStorage`, armazenamento local do navegador.
Falhas de acesso são ignoradas no original.
Não confundir persistência de preferência visual com gravação de regra no servidor.

| Estado | Chave original | Inicial | Papel |
|---|---|---|---|
| Modo | `crn-v4-modo` | VISUALIZACAO | Seleção do modo superior. |
| Busca | `crn-v4-search` | Vazia | Filtragem textual. |
| Blocos | `crn-v4-filtroB1` | Lista vazia | Seleção múltipla dos blocos de origem. |
| Seleção | `crn-v4-selected` | Nula | Sinapse exibida no inspetor. |
| Divisão | `crn-v4-split-pct` | 50 | Percentual do centro destinado ao grafo. |
| Largura direita | `crn-v4-inspector-w` | 320 | Largura do inspetor. |
| Recolher esquerda | `crn-v4-legend-collapsed` | Falso | Minimização da legenda. |
| Recolher direita | `crn-v4-inspector-collapsed` | Falso | Minimização do inspetor. |
| Marcações | `crn-v4-marcadas` | Lista vazia | Sinapses marcadas na matriz. |

Estados transitórios: `hoveredId`, `isolatedNode`, `showShortcuts`, `showHistory`, `ctxMenu`.
No Manager, usar um prefixo próprio para evitar colisão com outra tela.
Validar limites e valores recuperados do armazenamento.
Não guardar respostas clínicas ou informações identificáveis nessa persistência visual.

## 4. Grafo: agrupamento e desenho

4.1 A lista `SINAPSES` é filtrada por bloco, vizinhança isolada e texto.

4.2 Cada origem é agrupada pela chave `b1 + "|" + b2`.

4.3 Cada destino é agrupado pela chave `tipo + "|" + fenotipo`.

4.4 As origens são ordenadas por bloco e subcategoria; os destinos por tipo e nome.

4.5 O campo `count` mostra quantas sinapses daquele agrupamento permaneceram no filtro.

4.6 Para a posição vertical de um nó, usa-se `((indice + 0.5) / total) * 100`.

4.7 A camada SVG, gráficos vetoriais escaláveis, ocupa o espaço entre as colunas laterais.

4.8 A curva cúbica de Bézier é `M 0 y1 C 50 y1, 50 y2, 100 y2`, em uma área lógica de 100 por 100.

4.9 `preserveAspectRatio="none"` permite esticar a geometria; `vectorEffect="non-scaling-stroke"` preserva a espessura visual.

| Propriedade | Regra original |
|---|---|
| Espessura | `1.25 + peso * 2.5`; ao selecionar/apontar, acrescenta 2 pixels. |
| Opacidade | 0,85 sem foco; 1 na conexão focada; 0,18 nas outras quando há foco. |
| Ativo | Cor do bloco de origem, linha contínua. |
| Pausado | Cinza, linha contínua. |
| Bloqueado | Cor de bloqueio, traço `6 4`. |
| Aguarda validação | Cor de validação, traço `2 3`. |
| Transição | 70 milissegundos para opacidade, espessura e filtro. |
| Seleção | Clique na curva define `selectedId`. |
| Foco | Entrada e saída do ponteiro alteram `hoveredId`. |
| Vizinhança | Duplo clique em uma caixa isola origem ou destino. |
| Menu | Clique direito em linha ou curva abre menu contextual. |

A V4 agrupa destinos pelo nome; uma integração robusta deve usar identificador estável ou segmento+código para não fundir itens homônimos.
Essa adaptação não deve mudar a aparência solicitada.

## 5. Matriz-espelho e caixas de seleção

| Coluna | Campo |
|---|---|
| Marcação | Presença do identificador em `marcadasArr`. |
| BLOCO | `b1`. |
| CÓDIGO V4 | `codigoV4`. |
| SINAL DE ANAMNESE | `sinal`. |
| TIPO | `tipo`, ícone e rótulo correspondentes. |
| AÇÃO / FENÓTIPO | `fenotipo`. |
| PESO | `peso`, número e barra. |
| ESTADO | `estado`. |
| GOV | `governanca`, classificação de autorização. |
| HITS | `hits30d`, ocorrências demonstrativas. |
| ÚLT. ED. | `ultimaEdicao`. |

Clique na linha seleciona a sinapse e atualiza o inspetor.
A linha selecionada é deslocada para a área visível por `scrollIntoView`.
A caixa de marcação interrompe a propagação do clique para não selecionar a linha acidentalmente.
Selecionar uma linha e marcar uma sinapse são ações distintas.

Um bloco é o conjunto com a mesma chave `b1|b2`.
Se apenas parte desse conjunto estiver marcada, aparece “Bloco incompleto”.
“COMPLETAR BLOCO” marca todos os membros.
“REMOVER ISOLADO” retira as marcações daquele conjunto.
“LIMPAR MARCADAS” esvazia a seleção de trabalho.
Essa lógica percorre `SINAPSES` inteira, não apenas as linhas filtradas.
No original, nada disso cria um protocolo clínico.

## 6. Painéis, expansão e atalhos

| Comando | Efeito original |
|---|---|
| Arrastar divisor horizontal | Ajusta o percentual do grafo entre 15 e 85. |
| GRAFO | Alterna entre 80 e 50% para o grafo. |
| MATRIZ | Alterna entre 20 e 50% para o grafo, ampliando a matriz. |
| 50/50 | Restaura divisão igual. |
| Seta esquerda | Alterna legenda entre 64 e 24 pixels. |
| Seta direita | Alterna inspetor entre largura escolhida e 24 pixels. |
| Arrastar lateral direita | Ajusta largura entre 220 e 560 pixels. |
| V | Seleciona VISUALIZAÇÃO. |
| E | Seleciona EDIÇÃO. |
| S | Seleciona SIMULAÇÃO. |
| ? | Mostra ou oculta ajuda de atalhos. |
| Escape | Fecha ajuda, histórico, menu e isolamento de vizinhança. |

Escape não limpa todas as preferências nem todas as marcações.
Os atalhos ignoram campos de entrada e áreas de texto no original.
Os arrastes usam eventos de mouse, não garantem suporte a toque.
Para produção, preservar aparência e acrescentar interação acessível por teclado e ponteiro.

## 7. Tipografia, cores e fidelidade

`_group.css` contém os valores exatos da V4 e aplica cantos retos a todos os descendentes.
A fonte principal é JetBrains Mono.
Os títulos usam IBM Plex Serif na versão histórica.
As fontes vêm de Google Fonts por importação de folha de estilos; não estão embutidas no ZIP.
Quando o ambiente não permite acesso externo, hospedar fontes licenciadas no próprio projeto.

| Grupo | Valores-base históricos |
|---|---|
| Fundo | `#0b1426`. |
| Painel | `#0f1b30`. |
| Linha alternada | `#131f36` e `#0d1729`. |
| Texto principal | `#e6ecf5`. |
| Texto secundário | `#8a98b3`. |
| Texto discreto | `#5b6a87`. |
| Borda | `#1e2c47`. |
| Destaque | `#93b8e8`; forte `#5b8dd1`. |

Os dez blocos são sintomas, diagnósticos, cirurgias, histórico familiar, hábitos, saúde sexual, psíquico, profissional, sinais vitais e história da doença atual.
Os códigos e respectivas cores estão completos em `_mockData.ts` e `_group.css`.
Os tipos de destino são fórmula, injetável, implante, exame e protocolo.

A paleta da V4 histórica não é idêntica à paleta Navy Ciano da tela operacional.
Para atender “exatamente essa tela”, conservar a referência histórica nessa reprodução.
Não aplicar automaticamente os tokens da prancheta operacional nem redesenhar o Manager inteiro.

## 8. Recursos demonstrativos: não confundir com implementação

| Elemento | Situação original |
|---|---|
| Filtros, seleção, divisores e recolhimento | Funcionam localmente no navegador. |
| Caixa de marcação | Altera estado local; não gera prescrição. |
| Troca de modo | Altera modo e disponibilidade visual de botões. |
| NOVA SINAPSE | Não possui ação de persistência na V4. |
| EDITAR, PAUSAR, EXCLUIR, DUPLICAR | Botões demonstrativos sem as operações reais correspondentes na V4. |
| SIMULAÇÃO | Não executa um simulador clínico; é seleção visual de modo. |
| Histórico | Abre janela, mas eventos, gráfico e taxa de 78% são sintéticos. |
| Identificadores PAC-... | Gerados artificialmente, não clientes anonimizados reais. |
| Contagem HITS 30D | Vem dos dados estáticos, não de observabilidade clínica. |
| Peso e governança | Existem no modelo visual; não existem equivalentes completos no contrato real atual. |

Não oferecer “Excluir” ou “Simular” como operação concluída sem contrato e comportamento implementados.
Em produção, campos sem fonte devem mostrar “não disponível”, não valores de demonstração.

## 9. Limitações visuais verificadas

A captura de 1600 por 1000 pixels mostra sobreposição de caixas no grafo quando todos os nós estão presentes.
A distribuição percentual vertical não reserva uma altura mínima por caixa.
Isso é defeito existente, não um detalhe a imitar.
Conservar a composição e adotar altura mínima por nó com rolagem sincronizada ou redução explícita do conjunto visível.
A região das curvas deve usar a mesma geometria das caixas após essa adaptação.

O código também concatena transparências hexadecimais a alguns valores `var(--cor)`, formando expressões de cor inválidas em certos usos.
Para produção, usar cor resolvida, `color-mix` ou canais separados, mantendo o resultado visual pretendido.

Dentro do layout do Manager, dar uma altura definida à área disponível e usar `min-height: 0` nos descendentes flexíveis.
Não somar `100vh` ao cabeçalho externo e produzir duas barras de rolagem.
Em celular, conservar acesso aos três modos e transformar o inspetor em painel recolhível acessível, sem ocultar funcionalidades.
Fidelidade de aparência não obriga reproduzir sobreposição, falta de acessibilidade ou botão sem ação.

**RESUMO EM 1 LINHA:** O visual completo está nas fontes originais; o manual identifica exatamente seus eventos, medidas e o que ainda não é funcional no servidor.
