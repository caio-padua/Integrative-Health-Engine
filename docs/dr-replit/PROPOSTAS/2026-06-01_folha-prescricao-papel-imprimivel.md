# Proposta — FOLHA do 3º andar vira prescrição em papel/PDF imprimível

Data: 01/06/2026
Componente: `prescricao-rapida/GpsPadua.tsx` (modo FOLHA do EditorBlend)
Pedido Caio: o 3º bloco (FOLHA) não pode parecer "tela digital"; tem que ser uma
prescrição em papel/PDF que possa inclusive ser impressa, reaproveitando os mockups
de prescrição existentes.

## 1. Decisão

1.1. A `FolhaConsolidada` deixa de usar a paleta escura (tk) e passa a renderizar uma **folha A4 branca**.

1.2. Estética inspirada nos mockups oficiais `pawards-showcase/ReceitaLayout` e `PdfHeaderFooter` (header navy INSTITUTO PÁDUA + PAWARDS dourado + rodapé PADCON/RASX-MATRIZ).

1.3. Mantém as regras inegociáveis: **0px radius**, **JetBrains Mono**, zero emoji, PT-BR, retângulo-dentro-retângulo.

## 2. Estrutura da folha

2.1. Cabeçalho institucional navy: à esquerda INSTITUTO PÁDUA + razão social + CNPJ + endereço; à direita PAWARDS (dourado) + "Sistema de Gestão em Saúde".

2.2. Faixa de título centralizada **PRESCRIÇÃO MÉDICA**.

2.3. Bloco do paciente: nome, ID, idade, CPF; à direita data de **EMISSÃO** (dd/mm/aaaa) + contagem de itens.

2.4. Corpo: cada item numerado com tag de via (cor de **tinta** sobre branco), nome+dose, ativos do blend (dose alinhada à direita) e posologia.

2.5. A posologia reaproveita a mesma lógica do app (`linhasPrescricao`) via novo `PosologiaPapel` em cores de tinta.

2.6. Área de **assinatura** ("Clínico Responsável" + carimbo/CRM) — sem nome de pessoa física (regra Pawards).

2.7. Rodapé institucional: PADCON ao centro + selo RASX-MATRIZ à direita.

## 3. Impressão

3.1. Botão **IMPRIMIR** (não imprime) dispara `window.print()`.

3.2. CSS `@media print` esconde tudo menos a folha (`#folha-papel`) e oculta `[data-no-print]`.

3.3. `@page { size: A4; margin: 14mm }`.

## 4. Cores de via (tinta sobre papel)

4.1. EV verde, IM âmbar, SC azul, VO roxo, IMP magenta, PRC ardósia — versões escurecidas das cores do tk (que são claras pra fundo escuro).
