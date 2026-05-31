# PROPOSTA — 3º Andar com tomadas + formato da prescrição (GPS Clínico)

Data: 31/05/2026
Tema: unificar dose por período no 3º andar (editor de blend), 2 modos de
visualização, inverter horário/período, observação por tomada, formato de
saída da prescrição, frequência em texto livre.
Status: AGUARDANDO validação do Caio (sim/não por regra). Anti-ectoplasma:
proposta antes do código.

---

## 0. Fato técnico de base

0.1 O 3º andar (editor de blend) JÁ está associado ao card GPS.
0.2 Eles compartilham o mesmo estado (mesma fórmula, mesmo `update`).
0.3 PORÉM usam modelos de dose diferentes hoje.
0.4 Card GPS: modelo de TOMADAS (período + horário + nº de doses).
0.5 3º andar: modelo de HORÁRIOS (cada horário marcado = 1 dose, sem nº).
0.6 Por isso no 3º andar você não consegue individualizar a dose ainda.
0.7 A correção central é unificar os dois no modelo de TOMADAS.

---

## R1. Individualizar a dose no 3º andar

1.1 Levar o modelo de TOMADAS (já no card GPS) pra dentro do 3º andar.
1.2 No 3º andar cada tomada terá: HORÁRIO + PERÍODO + nº de DOSES + OBS.
1.3 Total/dia e total no período recalculam a partir da soma das tomadas.
1.4 Default recomendado: SIM (unificar).

## R2. Dois modos de visualização no 3º andar (REGRA 7 V2 Kaizen)

2.1 Modo A — fórmula selecionada (1 por vez, como hoje).
2.2 Modo B — VER TODAS as fórmulas que você quer prescrever, empilhadas.
2.3 Toggle no topo do 3º andar alterna entre os dois.
2.4 Default recomendado: ter os DOIS modos com toggle.

## R3. Inverter ordem: HORÁRIO primeiro, quadradinho do período à direita

3.1 Hoje a linha é PERÍODO → HORÁRIO.
3.2 Passa a ser HORÁRIO → (quadradinho/seletor de) PERÍODO à direita.
3.3 Default recomendado: SIM (inverter).

## R4. Período se ajusta sozinho pelo horário

4.1 Ao digitar o HORÁRIO, o PERÍODO é derivado automaticamente.
4.2 Ex.: 05h → "Em Jejum"; 07h → "Início da Manhã"; 13h → "Antes do Almoço".
4.3 Default recomendado: SIM.

## R5. Sem hora → período vira selecionável

5.1 Se você NÃO colocar horário, o PERÍODO vira um dropdown manual.
5.2 Você escolhe o período na mão (9 períodos da mensageria).
5.3 Default recomendado: SIM.

## R6. Observação (Obs.) por tomada

6.1 Cada tomada ganha um campo de OBSERVAÇÃO próprio.
6.2 Regra: se a obs estiver vazia, NÃO aparece nada e segue pra próxima tomada.
6.3 Cada tomada ocupa UMA linha sozinha, empilhadas uma embaixo da outra.
6.4 Default recomendado: SIM.

## R7. Formato de saída na prescrição

7.1 Com horário:
    `2 Doses VO — Antes do Almoço — Sugestão às 13h`
    `Obs.: Com suco de limão`
    `1 Dose VO — Antes do Jantar — Sugestão às 20h`
    `Obs.: Não ingerir líquido às refeições`
7.2 Sem horário (período manual):
    `1 Dose VO — Antes do Café da Manhã`
7.3 Quantidade total por fórmula, em linha abaixo:
    `1 Dose VO — Antes do Café da Manhã`
    `Quantidade: 60 Doses`
7.4 Singular/plural automático: "1 Dose" vs "2 Doses".
7.5 Default recomendado: SIM (este formato).

## R8. Frequência em texto livre

8.1 Hoje a frequência é um dropdown de presets.
8.2 Passa a ser um campo de TEXTO LIVRE pra você personalizar.
8.3 Default recomendado: SIM (texto livre), mantendo presets só como sugestão.

---

## Pendências de validação (sim/não do Caio)

P1. R1 unificar dose por período no 3º andar — sim/não.
P2. R2 dois modos (selecionada + ver todas) — sim/não.
P3. R3 inverter horário↔período — sim/não.
P4. R4 período auto pelo horário — sim/não.
P5. R5 sem hora → período selecionável — sim/não.
P6. R6 observação por tomada (vazia some) — sim/não.
P7. R7 formato de saída da prescrição — sim/não.
P8. R8 frequência em texto livre — sim/não.
