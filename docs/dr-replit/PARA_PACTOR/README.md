# PARA_PACTOR — Doca de especificações do Pactor

1. O QUE É ESTA PASTA

1.1. Doca exclusiva do Pactor dentro do IHE, criada por decisão do cacique.
1.2. Aqui moram as ESPECIFICAÇÕES e decisões por módulo (legíveis via raw pelo Dr. Claude).

2. ONDE MORA CADA COISA (regra de ferro)

2.1. Lógica pura (TypeScript, rodável e testável): `lib/pactor-transmutacao`.
2.2. Especificações e decisões por módulo: esta pasta (`docs/dr-replit/PARA_PACTOR`).
2.3. Telas em React: repositório próprio do Dr. Replit Pactor, puxando lógica da lib e specs daqui.

3. MOTIVO DA SEPARAÇÃO

3.1. O `.ts` precisa rodar testes; se ficar dentro de `docs/` sai dos globs do monorepo e quebra.
3.2. Por isso a lógica fica na lib e a doc fica aqui.

4. SUB-PASTAS

4.1. `padronizacao/` — normalização de nomes, doses, vias (ONDA A aprovada).
4.2. `protocolos/` — montagem dos protocolos e itens do RAS.
4.3. `orcamento/` — cenários, parcelas, descontos e totais.
4.4. `agenda/` — lançamento e regras de agendamento das sessões.
4.5. `enfermagem/` — aplicação com PIN e rubrica (fase posterior ao caixa).
4.6. `juridico/` — RAS Jurídico e Distrato (estrutura com placeholders; texto vai ao advogado).

RESUMO EM 1 LINHA: especificação aqui, lógica na lib `pactor-transmutacao`, telas no repo do Dr. Replit Pactor.
