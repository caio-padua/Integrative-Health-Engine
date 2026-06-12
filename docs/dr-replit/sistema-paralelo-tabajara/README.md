# sistema paralelo Tabajara — coordenadas de teste do RAS KAIZEN v8

Pasta criada em 12/06/2026 por Dr. Replit, a pedido do CEO.

Objetivo: guardar, versionado no GitHub, TODAS as coordenadas de teste do
sistema paralelo (RAS KAIZEN v8 — Apps Script), pra que o Dr. Code leia via
raw e faca a auditoria, e pra que a validacao viva rode com o MINIMO de
trabalho manual do CEO.

## 1. A verdade dura (anti-ectoplasma)

1.1 Nenhuma IA executa Apps Script — nem o Dr. Replit, nem o Dr. Code.

1.2 O Apps Script so roda dentro da conta Google do script (a sua).

1.3 Logo, "pedir ao Dr. Code pra validar no ambiente Apps Script" tem um
limite real: o Dr. Code AUDITA o codigo e as coordenadas (le via raw), mas
NAO consegue clicar/rodar nada no Apps Script.

1.4 Quem roda de verdade e o runtime do Apps Script — acionado por 1 clique
ou por um gatilho automatico (ver secao 4).

## 2. Quem roda o que (matriz)

| Camada | O que prova | Quem executa | Trabalho manual |
|---|---|---|---|
| Testes puros (`node`) | logica pura (PIN, rubrica, chave, bloqueio, autorizacao) | Dr. Replit no ambiente dele | zero |
| Sonda de integracao | Planilha + Drive + Cache ponta a ponta | runtime Apps Script (1 clique OU gatilho) | 1 clique, ou zero com gatilho |
| Auditoria de codigo/coordenadas | cobertura, buracos, riscos | Dr. Code via raw GitHub | zero |
| PDF + email reais | geracao/entrega ao paciente | so com paciente FICTICIO fabricado (pendente OK do CEO) | decisao do CEO |

## 3. Arquivos desta pasta

3.1 `COORDENADAS_DE_TESTE.md` — a grade completa: cada bateria, entrada,
resultado esperado, criterio de aprovacao.

3.2 `BRIEFING_DR_CODE.md` — o pedido formal e honesto pro Dr. Code (o que
auditar, o que ele NAO consegue fazer, e as URLs raw).

## 4. Estrategia pra ZERO trabalho manual recorrente

4.1 Botao no Panel "INSTALAR GATILHO DA SONDA (rodar sozinho todo dia + email)".

4.2 Voce clica UMA vez; a partir dai a sonda roda sozinha todo dia ~06h e te
manda o resultado (X OK / Y FALHA) por email.

4.3 Codigo: `../ras-kaizen-v8/GatilhoSonda.gs`
(`instalarGatilhoSondaEnfermagem` / `removerGatilhoSondaEnfermagem`).

4.4 Decisao registrada em
`../PROPOSTAS/2026-06-12_estrategia-validacao-sem-trabalho-manual.md`.

## 5. URLs raw (branch ver-l2-dr-claude)

Base: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

- `docs/dr-replit/sistema-paralelo-tabajara/COORDENADAS_DE_TESTE.md`
- `docs/dr-replit/sistema-paralelo-tabajara/BRIEFING_DR_CODE.md`
- `docs/dr-replit/ras-kaizen-v8/TesteEnfermagem.gs`
- `docs/dr-replit/ras-kaizen-v8/GatilhoSonda.gs`
- `docs/dr-replit/ras-kaizen-v8/AppEnfermagemRasFap.gs`
- `docs/dr-replit/ras-kaizen-v8/tests/test_app_enfermagem.mjs`
