# RESPOSTA — Pacote FUNIL DE CATEGORIA (VAI)

Data: 30/05/2026.
Status geral: CONCLUIDO.
Escopo: 5 martelos aprovados em opcao A + GPS CLINICO.

1. Resumo executivo
1.1 Os 5 martelos foram entregues na opcao A.
1.2 O prescritor agora se chama GPS CLINICO (sem nome de pessoa fisica).
1.3 Typecheck do pacote mockup-sandbox: VERDE.
1.4 Verificacao visual: GPS e Craniotomia renderizam sem erro de runtime.

2. T001 — Modelo de dados (categoria + catalogo)
2.1 Status: CONCLUIDO.
2.2 Campo categoria adicionado em Substancia.
2.3 Categorias terapeuticas definidas por via.
2.4 Catalogo expandido com mais ativos por categoria.
2.5 "Consulta Dr. Caio Padua" renomeada para "Consulta Clinica" (sem pessoa fisica).
2.6 Arquivo: prescricao-rapida/_tokens.ts.

3. T002 — Funil de categoria no "+ ADICIONAR" (2.1A + 2.2A)
3.1 Status: CONCLUIDO.
3.2 Removido o teto cands.slice(0,3) — lista completa com scroll.
3.3 Tres niveis: VIA (coluna) depois CATEGORIA (chips) depois ATIVO (lista).
3.4 Busca por texto dentro da via ("buscar ativo...").
3.5 Arquivo: prescricao-rapida/GpsPadua.tsx (componente Pilha).

4. T003 — Posologia campo-a-campo (2.3A)
4.1 Status: CONCLUIDO.
4.2 Campos alinhados a uma linha imaginaria a esquerda, com titulozinhos.
4.3 Padrao retangulo-dentro-retangulo, leitura TDAH-friendly.
4.4 Campos por item: DOSE, VIA (editavel), FREQ, PERIODO (dropdown 9 periodos), SESSOES, ANCORA.
4.5 PERIODO ligado a mensageria cronobiologica (disparo por janela).
4.6 Arquivo: prescricao-rapida/GpsPadua.tsx (controles do item + componente Campo).

5. T004 — Label GPS CLINICO
5.1 Status: CONCLUIDO com desvio registrado (ver item 9).
5.2 Adicionado o titulo nao-pessoal "GPS CLINICO" no header do painel, acima do toggle de modo.
5.3 Mantidos: rota, arquivo (GpsPadua.tsx) e o modo "GPS" do toggle (PILHA / TIMELINE / GPS).

6. T005 — Craniotomia por blocos (2.4A)
6.1 Status: CONCLUIDO.
6.2 Bloco = sinapses com a mesma origem (b1|b2).
6.3 Marcar 1 sinapse de um bloco sugere completar o bloco inteiro.
6.4 Validacao oferece COMPLETAR BLOCO ou REMOVER ISOLADO, com aviso cross-bloco.
6.5 Adicionados: KPI MARCADAS, coluna de checkbox na matriz, borda esquerda nas linhas marcadas, estado persistido.
6.6 Arquivos: craniotomia/CraniotomiaV4.tsx + craniotomia/_mockData.ts.

7. T006 — Indice do canvas (2.5A)
7.1 Status: CONCLUIDO.
7.2 Doc entregue: docs/dr-replit/INDICE_CANVAS_2026.05.30.md.
7.3 Conteudo: 111 componentes que existem no codigo versus board (atualmente VAZIO, 0 shapes).
7.4 Nada foi reorganizado no board (apenas indice de leitura).

8. T007 — Reporte final
8.1 Status: CONCLUIDO (este documento).

9. Desvios registrados (anti-ectoplasma)
9.1 D-T004: o board do canvas estava VAZIO (0 shapes), entao nao havia shape "GPS PADUA" para renomear.
9.2 D-T004 (resolucao): o label nao-pessoal "GPS CLINICO" foi materializado no header do componente, garantindo a entrega visivel pedida.
9.3 D-T004 (preservacao): o termo "GPS" do toggle foi mantido por ser nome de MODO, nao titulo pessoal.

10. Verificacao
10.1 Comando: pnpm --filter @workspace/mockup-sandbox run typecheck — VERDE.
10.2 Runtime: erro antigo "Campo is not defined" era anterior a definicao da funcao Campo; resolvido.
10.3 Screenshots conferidos: GPS CLINICO (funil + posologia) e Craniotomia V4 (blocos + MARCADAS).

11. Dividas e pendencias (fora deste pacote)
11.1 Repovoar o board do canvas e decisao do Caio (fora do escopo do indice).
11.2 Schema Drizzle de pacientes segue dessincronizado ~24 colunas (P008) — nao tocado aqui.
