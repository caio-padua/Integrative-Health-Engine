# PARECER SENIOR — CRONOGRAMA MESTRE 27 (anti-fantasia)

> Autor: Dr. Replit (programador senior)
> Data: 11/06/2026
> Decisao do CEO Caio: APROVADO via Caminho B (concordo COM emendas).
> Documento avaliado: docs/dr-claude/27 — CRONOGRAMA MESTRE PAWARDS.
> Validado contra: docs/dr-code/00_CARTA_ESTADO_REAL_DO_SISTEMA.md.
> Protocolo: anti-ectoplasma R4 (decisao vira .md antes do codigo).

---

## 1. VEREDITO

1.1. Concordo com a estrutura e a filosofia do cronograma 27.
1.2. E o primeiro plano que se recusa a criar tipo novo antes de provar
     o ciclo existente com dado vivo (principio esqueleto-vs-sangue).
1.3. Aprovado COM as 5 emendas abaixo (Caminho B).

## 2. EMENDAS DO SENIOR (vinculantes ao cronograma)

2.1. EMENDA 1 — P008 ausente e bloqueante.
- O 27 cria tabelas novas em M3/M4 mas nao trata o P008 (schema Drizzle de
  `pacientes` dessincronizado ~24 colunas vs banco real).
- Enquanto P008 viver, `db push` permanece PROIBIDO e toda migration e psql
  manual numerada.
- ACAO: P008 vira pre-requisito explicito do M3 (primeiro marco com schema novo).

2.2. EMENDA 2 — risco concreto no M1.1 (confirmado no codigo).
- `POST /motor-clinico/sync-catalogo` faz REBUILD: `UPDATE sugestoes_clinicas
  SET item_terapeutico_id = NULL` + delete + insert (motorClinico.ts ~linha 140).
- Rodar esse sync durante o M1 deixa as 16 sugestoes ORFAS (perdem o link de item).
- ACAO: validar as 3 sugestoes end-to-end ANTES de qualquer rebuild de catalogo,
  ou re-linkar apos. Nao chamar sync-catalogo no meio do M1.

2.3. EMENDA 3 — M1.2 governanca: gating nao-provado.
- Existe UI (`governanca-matrix.tsx`) e rotas, mas NAO certifiquei que os toggles
  GATEIAM a emissao real.
- ACAO: medir o backend de governanca antes de cravar a estimativa do M1.
- STATUS: nao-provado (nao otimista).

2.4. EMENDA 4 — M2.4 Telegram parte do zero na API.
- Hoje "telegram" so existe em `scripts/src/*` (disparos avulsos); nao ha rota
  na API.
- O 27 esta correto em listar como trabalho; reforco que e implementacao nova,
  nao plugar algo pronto.

2.5. EMENDA 5 — prazo de 12 semanas e meta, nao promessa.
- Todo o cronograma (M2..M6) depende do M1 fechar — algo que NUNCA aconteceu
  com dado real.
- ACAO: nao cravar datas firmes de M2 a M6 ate o M1 fechar de fato. Invoco R6
  (veto de estimativa do senior) condicionalmente sobre M1.

## 3. CONCORDANCIA SEM RESSALVA

3.1. M0.3 (primeira receita real em `/prescricao-rapida`) como teste de fumaca
     — rota e `farmaciasDisponiveis` existem; viavel e e o teste mais verdadeiro.
3.2. M0.1 (veredito do Caio sobre os 48 seeds de dieta) como bloqueador de M3.
3.3. M6.2 (Pellet/TCLE) reusa infra existente (assinaturas, PDFs, ZapSign).

## 4. BOTTOM LINE

4.1. O plano e honesto. Confio nele.
4.2. A unica coisa que prova se ele e real e o M1 fechar.
4.3. Foco recomendado: 100% em M0 + M1; tratar M2..M6 como hipotese ate la.

## 5. PROXIMO PASSO

5.1. Dr. Claude ajusta o 27 absorvendo as 5 emendas (P008 em M3; nota de
     sync-catalogo em M1; status nao-provado em M1.2/M2.4; prazo como meta).
5.2. Caio executa o MARCO 0 (3 itens humanos) — unico bloqueador agora.

---

Fim do parecer. Append-only. Atualizar quando o M1 fechar.
