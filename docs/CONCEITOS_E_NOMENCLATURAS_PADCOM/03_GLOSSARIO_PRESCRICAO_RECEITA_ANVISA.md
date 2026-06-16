# 03 — Glossario: Prescricao, Receita, Anvisa e SNCR

> Fonte: Planilha "Glossario de Conceitos Pawards 26.06.02" (CEO valida).
> Inclui as CORRECOES que o CEO ja escreveu na planilha (marcadas como [CEO]).

---

## 1. Conceitos base (vocabulario travado)

| Termo | Definicao oficial |
|---|---|

| Termo | O que e |
|---|---|
| Prescricao | Ato e documento clinico completo: o que o medico decide (itens + periodo + dose + posologia + mensagem). E o guarda-chuva: 1 prescricao vira N receitas |
| Receita | Documento gerado A PARTIR da prescricao, ja formatado pra farmacia/paciente |
| Receita Farmacia Manipulacao | Receita de formula manipulada sob medida (magistral / blend) |
| Receita Farmacia Drogaria | Receita de remedio industrializado, comprado pronto na drogaria |
| Blend | Mistura de varios ativos numa formula unica manipulada (sinergia + personalizacao + praticidade) |
| Ativo (materia-prima) | Cada substancia individual dentro de uma receita; pode ser controlado ou nao |
| Controlado | ATRIBUTO (sim/nao) de um ativo, nao um tipo separado; quando sim, dispara o receituario especial Anvisa |
| Via de Administracao | Como o item entra no corpo (oral, sublingual, topica, injetavel); e propriedade do item, nunca coluna |
| Dose | Quantidade do ativo por administracao; NUNCA confundir com capsula (50mg pode ser 2 capsulas de 25mg) |

Anvisa = Agencia Nacional de Vigilancia Sanitaria (orgao federal que regula medicamento no Brasil).

---

## 2. Posologia, Tomada e Frequencia (CORRECOES do CEO)

Este bloco e o que mais gerava erro. O CEO travou assim:

| Termo | Definicao TRAVADA pelo CEO |
|---|---|

| Termo | Definicao final [CEO] |
|---|---|
| Posologia | Instrucao completa = dose + VIA DE ADMINISTRACAO + frequencia + periodo + observacao (a via e obrigatoria, nao esquecer) |
| Frequencia | Se o tratamento sera REPETIDO apos o termino (intervalo de repeticao), e NAO as vezes que usa no dia |
| Tomada | Como o paciente ingere no dia: quantidade de doses (capsulas, comprimidos, ampolas, frascos, creme) por momento; pode ser 2 ampolas de manha e 1 a tarde |
| Periodo do dia | Janela do dia (JE jejum, MM meio da manha, AL almoco, NO noite...) |

Frase de chamada: frequencia = repete depois que acaba (em dias); tomada = quantas doses por momento do dia. Nunca trocar os dois.

---

## 3. Tipos de receita Anvisa (CORRECAO: nao existe verde nem lilas)

| Cor / tipo | Para que serve |
|---|---|

| Receituario | Uso |
|---|---|
| Branco Comum (simples / magistral) | Medicamento de venda livre ou prescricao simples; fica com o paciente, nao retem |
| Branca de Controle Especial (2 vias) | Antidepressivo, anticonvulsivante, anabolizante; 1a via farmacia, 2a paciente |
| Branca Especial (retinoides / talidomida) | Alto risco de malformacao fetal; termo de responsabilidade + notificacao |
| Azul (B1 e B2) | Psicotropicos (B1) e anorexigenos/inibidores de apetite (B2); fica retida |
| Amarela (A1, A2, A3) | Entorpecentes e psicotropicos potentes; retem receita + notificacao |

[CEO] Verde e Lilas NAO existem no padrao oficial Anvisa — remover de qualquer lista do sistema.

---

## 4. Destinos de dispensacao (nova nomenclatura aaaaa.bbbbb pedida pelo CEO)

[CEO] Padronizar a sigla com 5 letras + ponto + 5 letras pra ficar legivel:

| Sigla nova | Significado |
|---|---|

| Codigo | Destino |
|---|---|
| farma.manip | Farmacia de manipulacao |
| farma.droga | Drogaria / farmacia de rua (industrializado) |
| farma.labor | Farmacia de laboratorios de injetaveis (quando o CEO liberar compra direta do fornecedor) |

Observacao: este quadro de destinos com a regra `aaaaa.bbbbb` e uma MELHORIA NOVA pedida pelo CEO (ainda a implementar).

---

## 5. Desmembramento e SNCR

| Termo | Definicao |
|---|---|

| Termo | O que e |
|---|---|
| Desmembramento (Regra 14) | Ato do sistema de quebrar 1 prescricao em N receitas separadas por cor/destino/legalidade |
| Isolamento do Controlado | Gerar uma receita SO com o ativo controlado, exigida por lei mesmo quando ele esta num blend |
| SNCR | Sistema Nacional de Controle de Receituarios (numeracao) |

Regra de ouro SNCR [CEO]: o sistema NUNCA bloqueia a emissao; se faltar numeracao, ele ALERTA e emite a receita SEM a numeracao. O sistema permite cadastrar o intervalo (faixa) de numeracao por tipo de receita.

---

RESUMO EM 1 LINHA: prescricao e o guarda-chuva que vira N receitas; posologia inclui a via obrigatoria; frequencia e repeticao apos o termino (nao vezes/dia); nao existe receita verde nem lilas; e o SNCR so alerta, nunca bloqueia.
