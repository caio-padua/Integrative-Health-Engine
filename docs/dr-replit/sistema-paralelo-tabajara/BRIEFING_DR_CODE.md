# BRIEFING PRO DR. CODE — auditoria das coordenadas de teste (RAS KAIZEN v8)

De: Dr. Replit. Para: Dr. Code. Data: 12/06/2026.

## 1. Contexto em 3 linhas

1.1 O app da enfermagem (RAS-FAP) registra aplicacoes com PIN do paciente,
gravando a verdade em `aplicacoes.json` no Drive (nao em coluna nova).

1.2 Os testes puros rodam no ambiente do Dr. Replit; a integracao
(Planilha/Drive/Cache) so roda no Apps Script.

1.3 O CEO quer robustez e o minimo de trabalho manual.

## 2. O limite que voce precisa saber

2.1 Voce, Dr. Code, NAO executa Apps Script (nem eu).

2.2 Logo seu papel aqui e AUDITAR, nao rodar: ler o codigo e as coordenadas
via raw e dizer se a estrategia de teste e suficiente e onde estao os buracos.

2.3 A execucao viva e por 1 clique do CEO ou pelo gatilho automatico.

## 3. O que eu PRECISO que voce audite

3.1 Cobertura: as coordenadas em `COORDENADAS_DE_TESTE.md` cobrem os riscos
reais do fluxo (autorizacao, PIN, pertencimento de substancia, idempotencia,
LGPD/nao-vazamento de CPF)? O que falta?

3.2 Seguranca da sonda: confirme que `runSondaEnfermagem()` realmente NAO
escreve em dado real (so leitura na planilha; escrita apenas em paciente
ficticio auto-limpo; cache do paciente real limpo no `finally`).

3.3 Caminho read-only: confirme que `lerSetAplicadasCliente_` (agora usando
`acharPastaClienteSeExistir_`) nao cria mais pasta ao so carregar/visualizar,
e que `registrarAplicacao_`/`gerarRasFapPdf_` seguem criando quando precisam.

3.4 Gatilho: `GatilhoSonda.gs` instala/remove de forma idempotente e nao
duplica triggers? O email vai pro dono certo?

3.5 Regra de ferro: algum emoji, `role`, abreviacao ou PII vazada nos artefatos?

## 4. URLs raw (branch ver-l2-dr-claude)

Base: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

- `docs/dr-replit/sistema-paralelo-tabajara/COORDENADAS_DE_TESTE.md`
- `docs/dr-replit/ras-kaizen-v8/TesteEnfermagem.gs`
- `docs/dr-replit/ras-kaizen-v8/GatilhoSonda.gs`
- `docs/dr-replit/ras-kaizen-v8/AppEnfermagemRasFap.gs`
- `docs/dr-replit/ras-kaizen-v8/tests/test_app_enfermagem.mjs`

## 5. Formato da resposta que eu espero

5.1 Veredito por item de 3 (PASS/FAIL + 1 linha de porque).

5.2 Lista priorizada de buracos de cobertura (alto -> baixo).

5.3 Se recomendar a Opcao de fabricar paciente ficticio na planilha pra
cobrir PDF+email, diga os cuidados minimos (backup, marcador, remocao).
