# Proposta · Receitas Clínicas + Vias de Administração (mockup GpsPadua)

> Data: 02/06/2026
> Origem: pedido Caio (chat) — print `image_1780414527722.png`
> Status: APROVADO o núcleo (1-4); PENDENTE decisão (5)

## 1. Contexto

1.1. Caio apontou que o quadro "SL · SUBLINGUAL" NÃO deve existir como coluna.
1.2. Sublingual é apenas uma VIA DE ADMINISTRAÇÃO dentro das fórmulas manipuladas.
1.3. O quadro hoje chamado "VO · VIA ORAL" deve virar "RECEITAS CLÍNICAS".
1.4. É onde o Caio receita as fórmulas: blend, remédios de farmácia, fórmulas unitárias.

## 2. Decisão de modelo (núcleo aprovado)

2.1. Remover a coluna SL inteira (tipo Via, VIA_META, cores, ordem, agrupamento).
2.2. Renomear coluna VO: título "RECEITAS CLÍNICAS", subtítulo "fórmulas manipuladas".
2.3. Desacoplar VIA: a coluna continua sendo o agrupador; a via de administração
     passa a ser uma propriedade da fórmula (`viaAdministracao`), via dropdown.
2.4. Itens sublinguais do catálogo migram para a coluna Receitas Clínicas com
     `viaAdministracao = "Sublingual"` (nada é perdido).

## 3. Vias de administração (dropdown da fórmula)

3.1. Oral, Sublingual, Tópica, Transdérmica, Vaginal, Retal, Nasal, Otológica,
     Oftálmica, Intramuscular, Subcutânea, Endovenosa.
3.2. Default = Oral quando não definido.

## 4. Regras inegociáveis mantidas

4.1. Zero emoji em texto técnico, JetBrains Mono, 0px radius, PT-BR.
4.2. "DOSE" nunca "cápsula/comprimido".

## 5. PENDENTE — decisão do Caio (tipos de fórmula + encaminhar)

5.1. Tipos de fórmula (blend / remédio de farmácia / fórmula unitária) e o fluxo
     "encaminhar" são uma camada a mais.
5.2. Opção A (recomendada): nesta onda só entrego o núcleo (1-4); tipos+encaminhar
     viram a próxima proposta dedicada.
5.3. Opção B: já adiciono um seletor TIPO DE FÓRMULA (3 tipos) sem fluxo de envio.
5.4. Opção C: núcleo + tipos + botão "Encaminhar" (Drive/WhatsApp/E-mail) placeholder.
5.5. Default recomendado: A.
