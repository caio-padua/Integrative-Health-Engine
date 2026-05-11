# Histórico Waves 5-8 PARMAVAULT-TSUNAMI · Mortal Kombat

> Conteúdo arquivado de `replit.md` em 11/mai/2026 durante Wave 10 trim.
> Autorizado pelo Caio. Mantém histórico completo das Waves 5/6/7/8.
> Wave 9 (PARQ) e Wave 10 (ZapSign) permanecem em `replit.md`.

## Wave 8 PARMAVAULT-MORTAL-KOMBAT · 5 ondas em ~3h sem perguntas (24/abr/2026)

Caio liberou autonomia total via Manifesto Dilúvio Planetário (PDF anexado): "5 ondas
em 5 horas, não pergunta nada, bate as 5 finalizações". Defaults TODAS pré-respondidas
pelo Dr. Claude no PDF. Régua dos 3 estados §7 do MANIFESTO aplicada — `✅ funcional
pleno` exige `psql` + smoke + idempotência provada.

### Onda 1 PARMAVAULT — Wave 5 promovida pra ✅ funcional pleno (SHA `7c198b1`)
- **Mata duplicado:** `lib/contratoFarmacia.ts` deletado (zero callers, órfão).
- **Endpoint refinado** `POST /admin/parmavault/comissao/recalcular`: fórmula agora
  `COALESCE(formula_blend.valor_max, valor_formula_real, valor_formula_estimado)`.
- **Migration 027** — trigger SQL `trg_calc_comissao` BEFORE INSERT em
  `parmavault_receitas` que preserva valores explícitos e calcula só quando NULL/0.
- **Smoke trigger:** `INSERT R$200 → comissao R$60 (30%)` com origem
  `trigger_insert_valor_formula_estimado`, ROLLBACK confirmado, zero contaminação.
- **Provas finais Wave 5:** 8.725 receitas, 8.725 com `comissao_estimada > 0`,
  total **R$ 2.735.336,10**. Idempotência: 0 receitas tocadas em 2ª chamada.
- **Verdade nova rica:** apenas 3 farmácias têm receitas reais (Maven 2973 / FAMA 2863 /
  Magistral 2889), as outras 5 cadastradas estão zeradas no período.

### Onda 2 PAREXAM — onda absorvida (já era ✅ funcional pleno)
- Verificação: endpoint `GET /api/pacientes/:id/exames/dashboard` existe + responde
  (auth obrigatório), página `[pacienteId].tsx` 565 linhas com cards/sparkline/régua,
  vitrine `[pacienteId]/vitrine.tsx` 420 linhas com framer-motion + RadialBarChart +
  autoplay 8s + atalhos ←/→/ESC, `analitos_catalogo` 304 entradas todas com
  `nome_zona_*` preenchidos. **Sem trabalho novo, apenas validação por leitura.**

### Onda 3 Wave 8 PDF — campos prazo+parcelas declarados em schema
- **Migration 023** aplicada (psql IF NOT EXISTS aditivo): adiciona
  `prazo_recebimento_dias integer` + `parcelas integer DEFAULT 1` em
  `parmavault_declaracoes_farmacia`. Comentários SQL nas colunas.
- **Exibição no PDF P2 deferida** via anastomose `PARMAVAULT_PDF_PRAZO` (criticidade
  `baixa`) — preserva layout Wave 7.1 testado em produção.

### Onda 4 Anastomoses formais — 2 deferimentos honestos registrados
- **Anastomose #10 PAREXAM_MEDCORE** (`media`): botão "Sugerir bloco MEDCORE" no
  dashboard de exames quando paciente está em zona ATENÇÃO/ALERTA/RUIM, usando
  `mapa_bloco_exame.codigo_padcom` ↔ `codigo_semantico_v4`.
- **Anastomose #11 PARMAVAULT_PDF_PRAZO** (`baixa`): exibir prazo+parcelas no
  rodapé P2 do PDF Reconciliação via agregação `mode()` no feeder.
- Total: 11 anastomoses cadastradas, 10 abertas, 1 fechada.

### Onda 5 Manifesto + replit.md
- **MANIFESTO §11 Protocolo Mortal Kombat** adicionado: pré-condições, regras de
  execução, decisões autônomas permitidas, proibições absolutas, lição Wave 8.
- **MANIFESTO §12 Assinaturas** (renumerado de §10).
- Esta entrada `replit.md` documenta tudo, push duplo `main` + `feat/dominio-pawards`.

### Régua dos 3 estados aplicada (§7 do MANIFESTO)
- `✅ funcional pleno` Wave 5 PARMAVAULT (provas em SHA `7c198b1`).
- `✅ funcional pleno` PAREXAM EXAMES-2 (provas em SHA `fdb677b` original).
- `📦 código existe` colunas prazo+parcelas no schema (migration 023 aplicada,
  exibição PDF deferida formal).

---

## Wave 7 PARMAVAULT-TSUNAMI · PDF LUXUOSO CLÁSSICO REFINADO (23/abr/2026)
Caio aprovou refazer o PDF de reconciliação combinando o cabeçalho luxuoso
estilo Dr. Cloud (modelo HTML+CSS anexado) com a organização de informações
em densidade alta + gráficos modernos no terço médio com legenda+explicação
abaixo. ZERO migration. ZERO db:push. Edita só `gerarPdfReconciliacao.ts`.

- **`gerarPdfReconciliacao.ts`** rewrite completo (754 linhas, era 496):
  - **Estética luxuosa sem TTF download:** Times-Bold builtin pdfkit
    para títulos serifados (aproxima Playfair Display) + Helvetica corpo +
    Courier mono para protocolo hash. Zero novas deps.
  - **NÃO usou `chartjs-node-canvas`** — exige libcairo binária pesada que
    quebra build. Gráfico nativo pdfkit refinado (grade pontilhada, eixo Y
    arredondado, valores no topo das barras, sombra sutil).
  - **PÁGINA 1 — CAPA INSTITUCIONAL:**
    - Cabeçalho navy 160px + faixa gold 5px (modelo Dr. Cloud).
    - Brand "PAWARDS MEDCORE" Times-Bold 30px gold characterSpacing 4.
    - "CONFIDENCIAL" canto direito + protocolo Courier.
    - Nome farmácia Times-Bold 32px + CNPJ.
    - **Grid 2×2 de 4 boxes informativos** com left-accent colorido:
      Período Auditado / % Comissão (snapshot imutável) / Previsto Total /
      GAP Total (vermelho se > 0, verde se = 0).
    - Box "FINALIDADE" fundo gold suave + texto institucional Times-Roman.
    - Box protocolo navy/gold no rodapé da capa.
  - **PÁGINA 2 — RESUMO EXECUTIVO (3 zonas):**
    - **Zona 1 (terço superior):** 4 KPI cards horizontais com left-accent
      colorido (PREVISTO=navy, DECLARADO=gold, RECEBIDO=verde, GAP=accent
      vermelho/verde). Valor Times-Bold 17px. GAP tem badge % com bg
      arredondado.
    - **Zona 2 (terço médio):** Gráfico de barras agrupado refinado.
      Grade horizontal pontilhada (5 níveis), eixo Y com valores
      abreviados (k/M) arredondados pra cima inteligentemente, 4 séries
      por mês (Previsto/Declarado/Recebido/GAP), sombra sutil sob barras,
      valores no topo das barras altas (>18px), labels mes "Mai/25",
      rótulo "VALOR (R$)" rotacionado no eixo Y.
    - **Zona 3 (terço inferior):** Legenda colorida com badges arredondados
      + texto explicativo Times-Roman justify + box impacto (RED_BG +
      borda RED se gap > 0, GREEN_BG se reconciliação completa).
  - **PÁGINA 3+ — TABELA DETALHADA:**
    - Header navy + faixa gold + título uppercase characterSpacing.
    - Colunas: # / DATA / PACIENTE (iniciais LGPD) / Nº RECEITA (Courier) /
      VALOR FÓRM. / COMISSÃO / STATUS.
    - Linhas zebradas (alterna fundo PANEL_BG).
    - Status colorido: PAGO=verde, DECLARADO=âmbar, PENDENTE=vermelho.
    - Page break automático com header continuação.
    - Linha TOTAL ao final (navy/gold) somando valores e comissões.
  - **RODAPÉ todas páginas:** barra navy 30px + accent gold left + texto
    Courier cinza centro + número página gold mono direita.
- **Smoke verde:**
  - Build TS limpo 1.45s.
  - PDF teste gerado com 6 receitas reais ficcionais FAMA: 9KB, zero
    runtime error, 3 páginas + tabela + rodapé fixo.
- **Decisões técnicas conscientes:**
  - Times-Bold builtin > download Playfair TTF (zero deps + funciona em
    qualquer ambiente PDFKit).
  - Sombra com `doc.opacity()` 0.3 + `#cbd5e1` (suporte nativo pdfkit).
  - `arredondarParaCima(maxV)` pra eixo Y limpo (1, 2, 2.5, 5, 10 × 10^n).
  - Margem global 0 + margem por página M=40 (controle pixel-perfect).
  - Mantida interface `DadosPdfReconciliacao` 100% compat com Wave 5.

## Wave 6 PARMAVAULT-TSUNAMI · STORAGE DRIVE + CSV ROBUSTO + HOOK EMISSÃO (23/abr/2026)
Wave 5 APROVADA pelo Dr. Claude com 2 observações de baixo risco. Wave 6
fecha as 2 + adiciona o B3 (hook operacional) deferido. 4h autonomia
aprovadas. Migration 022 + 3 blocos cirúrgicos + smoke 5/5.

- **Migration 022** (`022_wave6_parmavault_storage_e_hook.sql`) — psql
  IF NOT EXISTS aditivo, REGRA FERRO mantida:
  - `parmavault_relatorios_gerados`: ADD `pdf_drive_id`, `excel_drive_id`.
  - `parmavault_receitas`: ADD CONSTRAINT UNIQUE (`numero_receita`)
    via `DO $$` block (idempotente — só adiciona se não existir).
- **Bloco 1 · Storage Google Drive** — `routes/parmavaultReconciliacao.ts`:
  - Helper `uploadRelatorioParaDrive(farmaciaNome, protocolo, pdfBuf, excelBuf)`
    cria pasta root `PAWARDS_PARMAVAULT_RELATORIOS` no Drive +
    subpasta por farmácia (sanitizada `[^a-zA-Z0-9]+→_`) + sobe PDF/Excel
    via `uploadFileToDrive`.
  - **Defensivo:** try/catch — se Drive falha, retorna `null` e mantém
    arquivo só no disco como fallback. Emissão NUNCA derruba.
  - UPDATE `parmavault_relatorios_gerados`: `pdf_path`/`excel_path`
    apontam pra Drive URL quando upload OK; `pdf_drive_id`/`excel_drive_id`
    rastreiam o arquivo no Drive.
  - Rotas `/relatorios/:id/pdf` e `/excel`: se `drive_id` existe e
    `path` é HTTPS, **redirect 302** pra Drive (poupa banda do servidor);
    senão lê do disco como fallback.
- **Bloco 2 · CSV parser robusto** — `parseCsvLinha(linha)`:
  - Lida com vírgulas dentro de aspas (`"Pago via Pix, confirmado"`).
  - Lida com aspas duplas escapadas (`""interna""`).
  - Substitui o `split(",")` simples na rota `/declaracoes/csv`.
  - Sem nova dep — `papaparse` evitado, parser nativo de ~20 linhas.
  - Smoke unit: 3 casos passaram (vírgula em texto, sem aspas, escape interno).
- **Bloco 3 · Hook nova emissão (B3)** — `services/emitirPrescricaoService.ts`:
  - Dispara APÓS o `UPDATE prescricoes status='emitida'` (passo 5).
  - **1 receita por prescrição** (não 1 por PDF — múltiplas cores são da
    MESMA prescrição). Itera sobre `Set` único de `destino_dispensacao`.
  - Lookup de farmácia: `nome_fantasia ILIKE '${destino}%'` ordenado por
    `prioridade ASC, id ASC` (ex: `destino='FAMA'` → `FAMA Manipulação` id=4).
    Não usa `farmacias_unidades_contrato` porque hoje 0 unidades têm contrato.
  - INSERT em `parmavault_receitas`: `numero_receita = 'PRESC-{id}-{destino}'`
    + `valor_formula_real=NULL` + `comissao_estimada=NULL` (motor não calcula
    valor financeiro hoje; job retroativo preenche ou Caio declara).
  - `comissao_estimada_origem = 'hook_emissao_YYYY-MM-DD'`.
  - **`ON CONFLICT (numero_receita) DO NOTHING`** — re-emissão da mesma
    prescrição não duplica.
  - **`comissao_paga = FALSE` sempre** (REGRA FERRO: nunca automático).
  - **Defensivo total:** try/catch — falha silenciosa com `console.error`,
    PDF sai mesmo se hook quebra, SNCR já foi decrementado.
- **Smoke 5/5 verde:**
  1. Build TS limpo 1.7s.
  2. 4 endpoints retornam 401 sem cookie master.
  3. CSV parser passou 3 casos (vírgula/sem-aspas/escape interno).
  4. Migration 022: 2 colunas Drive presentes via `\d`.
  5. Constraint `parmavault_receitas_numero_receita_key` presente.

## Wave 5 PARMAVAULT-TSUNAMI · ONDA RECONCILIAÇÃO MVP — Caminho P (23/abr/2026)
Decisão Caio + Dr. Claude: Caminho P (light) executado agora; Caminho Q (introduzir
gravação operacional de `parmavault_receitas` em `emitirPrescricao`) fica para
**Wave 6** com brief próprio. Razão: PDF/Excel pra reunião presencial com farmácia
sai HOJE com os 8.725 históricos (2.735.336,10 em comissão estimada já calculada).

- **Migration 021** (`021_wave5_reconciliacao_parmavault.sql`) — psql IF NOT
  EXISTS aditivo, REGRA FERRO. 4 tabelas novas:
  - `parmavault_emissao_warnings` — log de avisos da A2 light.
  - `parmavault_declaracoes_farmacia` — declarações CSV/manual.
  - `parmavault_repasses` — entradas de $$ confirmadas pelo CEO.
  - `parmavault_relatorios_gerados` — snapshot imutável do PDF/Excel.
  - `parmavault_receitas`: `comissao_estimada` agora aceita NULL +
    colunas `comissao_estimada_origem` e `comissao_estimada_em` adicionadas.
- **B1 · A2 LIGHT (warning por unidade)** — `lib/contratos/verificarUnidadeTemContrato.ts`
  + hook em `services/emitirPrescricaoService.ts` (Modo B, não bloqueia):
  quando a unidade do médico não tem **nenhum** contrato vigente,
  adiciona "⚠️ Esta unidade não tem contrato vigente com nenhuma farmácia
  parceira. Confirma emissão?" no campo `alertas` da resposta + grava em
  `parmavault_emissao_warnings`. Defensivo: try/catch nunca quebra a emissão.
- **B2 · Job retroativo idempotente** — POST `/api/admin/parmavault/comissao/recalcular`
  (master-only). Fórmula: `COALESCE(NULLIF(valor_formula_real,0),
  NULLIF(valor_formula_estimado,0)) * (percentual_comissao/100)`. Se base
  vazia → grava `comissao_estimada=NULL` + `origem='sem_valor_base'` (não
  força zero). Smoke confirmou idempotência: 0 tocados no segundo run,
  porque o seed já preencheu todos os 8.725 com valores válidos.
- **B3 · Hook nova emissão** — DEFERIDO para Wave 6. Descoberta: o código
  atual de `emitirPrescricao` **não grava em `parmavault_receitas`** (todos
  os 8.725 vêm do seed `006_sangue_real_seed.sql`). Wave 6 vai introduzir
  a gravação operacional + roteador de farmácia + cálculo automático.
- **B4 · Portal CSV/manual master** — `routes/parmavaultReconciliacao.ts`:
  POST `/admin/parmavault/declaracoes` (manual), POST
  `/admin/parmavault/declaracoes/csv` (formato `receita_id,valor,data,obs`),
  GET lista. POST/GET `/admin/parmavault/repasses`. Sem login farmácia
  (decisão MVP).
- **B5 · Painel CEO** `/admin/parmavault-reconciliacao` — KPIs grandes
  (Previsto/Declarado/Recebido/GAP com cores), matriz farmácia × período
  (% comissão **editável inline** via PATCH `/admin/parmavault/farmacia/:id/percentual`),
  janela ajustável 1-24 meses, botão Recalcular comissões, modais de
  declaração manual + upload CSV + repasse, histórico de relatórios
  com download direto.
- **B6 · PDF + Excel** — POST `/admin/parmavault/relatorios/gerar` cria
  snapshot imutável (% comissão congelado no momento da geração) +
  retorna `pdf_url` e `excel_url`.
  - **PDF (pdfkit)** 3 páginas: capa navy/gold com protocolo SHA10,
    resumo executivo com grid 2×2 de KPIs + gráfico de barras agrupadas
    desenhado nativamente (Previsto/Declarado/Recebido + barra GAP vermelha
    por mês — sem `chartjs-node-canvas` pra evitar deps binárias),
    tabela detalhada por receita com **iniciais LGPD** (`Caio Padua → C.P.`)
    via `lib/relatorios/iniciaisLgpd.ts`. Rodapé fixo todas pgs com data +
    protocolo + paginação.
  - **Excel (xlsx)** 3 abas: Resumo Mensal (com TOTAL), Detalhe por Receita
    (LGPD), Repasses Registrados.
  - Endpoints `/admin/parmavault/relatorios/:id/pdf` (inline) e `/excel`
    (attachment) para download.
- **REGRAS FERRO de negócio gravadas no código:**
  - `comissao_paga` NUNCA automático (apenas manual via Wave 6 endpoint).
  - Snapshot de `percentual_comissao_snapshot` no PDF/Excel é IMUTÁVEL após
    geração (gravado em `parmavault_relatorios_gerados`).
  - Pacientes mostrados em iniciais nos PDFs/Excels (LGPD).
  - GAP vermelho > 0, verde = 0, sempre R$ + % juntos.
  - Sistema registra/mostra, NUNCA bloqueia (Modo B).
- **Smoke 4/4 verde**: (1) build limpo (1.5s, sem erro TS); (2) 4 tabelas da
  migration 021 todas presentes via `\dt`; (3) job retroativo idempotente
  (0 tocados confirmando que seed cobriu tudo); (4) auth gate 401 nos 3
  endpoints novos sem cookie master.
- **Rota frontend** `/admin/parmavault-reconciliacao` registrada em `App.tsx`.
- **Pendente Caio:** testar fluxo end-to-end logado como master e gerar
  primeiro PDF de reunião.

## Wave 5 PARMAVAULT-TSUNAMI · EM EXECUÇÃO (23/abr/2026)
Validação UNIDADE↔FARMÁCIA PARCEIRA. Decisões Dr. Claude: P1 = tabela
vazia + UI primeiro (Caio semeia 9 pares manualmente), P2 = modo B
warning visível (sem bloqueio duro 30 dias).

- **Frente A1 PLANTADA** — Tabela `farmacias_unidades_contrato` (id serial
  PK, unidade_id FK, farmacia_id FK, tipo_relacao, ativo, vigencia_inicio,
  vigencia_fim, observacoes, criado_em, atualizado_em, criado_por_usuario_id)
  + UNIQUE parcial `uniq_fuc_par_ativo (unidade_id, farmacia_id) WHERE
  ativo=true` (permite reativar pares inativos preservando histórico) +
  2 índices auxiliares (unidade+ativo, farmacia+ativo).
- **CRUD admin** `routes/contratosFarmacia.ts` em `/api/admin/contratos-farmacia`
  (GET lista joinada, GET /options dropdowns, POST cria, PATCH edita,
  DELETE soft) com auth dupla `requireRole("validador_mestre")` +
  `requireMasterEstrito` (mesmo padrão Wave 3).
- **Helper validador** `lib/contratoFarmacia.ts` exporta
  `validarContratoFarmaciaUnidade(unidade_id, farmacia_id)` retornando
  `{valido, motivo, contrato?}`. Defensivo (nunca lança), considera
  `ativo=true` E vigência (today >= inicio E (fim NULL OR today <= fim)).
  Pronto pra A2 chamar em modo warning não-bloqueante.
- **UI master** `pages/admin-contratos-farmacia.tsx` (rota
  `/admin/contratos-farmacia`) navy/gold, listagem joinada com unidade+
  farmácia+CNPJ+tipo+vigência+status, form de cadastro com dropdowns
  pré-carregados, toggle ativar/desativar, filtro mostrar inativos.
- **Migration 019** (psql aditiva, REGRA FERRO IF NOT EXISTS).
- **Smoke 6/6 verde**: (1) auth gate 401 nos 3 endpoints sem cookie;
  (2) INSERT direto OK; (3) UNIQUE parcial bloqueia duplicata ativa
  com erro `uniq_fuc_par_ativo`; (4) helper SQL retorna `valido=t` no par
  recém-criado; (5) soft delete + reinsert do mesmo par funciona
  (UNIQUE só impede ativos); (6) cleanup deixa tabela vazia (P1 Dr.
  Claude — Caio semeia manualmente).
- **Próximo**: Caio cadastra os 9 pares via UI, depois plantamos
  Frente A2 (hook warning na emissão).

### Wave 5 ondas 1-3 PLANTADAS (autonomia 3-4h, sem validação intermediária)
- **Migration 020** (psql aditiva IF NOT EXISTS) — estende
  `farmacias_parmavault` com 8 colunas de regras de roteamento
  (`nivel_exclusividade` parceira/preferencial/exclusiva/piloto/backup,
  `disponivel_manual`, `acionavel_por_criterio`, `cota_pct_max`,
  `cota_receitas_max_mes`, `prioridade`, `aceita_blocos_tipos text[]`,
  `observacoes_roteamento`) + CHECK constraints idempotentes + índice
  composto. Cria `farmacias_emissao_metricas_mes` (id, farmacia_id FK,
  ano_mes char(7), qtd_emissoes, valor_total) com UNIQUE
  (farmacia_id, ano_mes). **+5 farmácias novas no pool**: Galena
  Manipulação (preferencial, prio 50, formula_oral+topico),
  Pharmacore Premium (parceira, prio 80), Lemos Manipulação (backup,
  prio 200, cota 10%), Botica Magistral Premium (preferencial, prio 60,
  injetavel+implante), Essentia Pharma (piloto, prio 90, cota 15%).
  Pool total: **8 farmácias**.
- **Helper roteador** `lib/roteamentoFarmacia.ts` exporta
  `rotearFarmaciaParaReceita({unidade_id, tipo_bloco?, override_farmacia_id?})`
  com cascata: (1) override manual válido vence; (2) sem contrato vigente
  bloqueia; (3) exclusividade preemptiva; (4) filtra por
  `aceita_blocos_tipos`; (5) cota_pct_max (vs métricas mês); (6)
  cota_receitas_max_mes; (7) ordena por prioridade ASC + capacidade DESC.
  Defensivo (nunca lança), retorna `{ok, regra_aplicada, farmacia_escolhida,
  alternativas, rejeitadas, contexto}` com `motivo_eliminacao` em cada
  rejeitada pra debug.
- **3 endpoints novos** em `routes/contratosFarmacia.ts`:
  `GET /api/admin/farmacias-roteamento` (lista farmácias + regras +
  métricas mês), `PATCH /:id` (whitelist de campos editáveis),
  `POST /preview` (simula roteamento sem persistir). Auth dupla
  validador_mestre + master estrito.
- **UI master** `pages/admin-farmacias-roteamento.tsx` (rota
  `/admin/farmacias-roteamento`) navy/gold com **(a)** simulador
  interativo (dropdown unidade + tipo_bloco + override → mostra farmácia
  escolhida, regra aplicada, alternativas, rejeitadas com motivo);
  **(b)** tabela editável de farmácias com inline edit em todos os
  campos de regra (nível, prio, cotas, manual, critério, blocos
  aceitos, ativo) + botão Salvar por linha.
- **Smoke 7/7 verde**: (1) auth gate 401 nos 3 novos endpoints;
  (2) pool=8 farmácias confirmado; (3) sem contrato → `sem_contrato_unidade`;
  (4a) 3 contratos sem tipo → Galena prio 50 escolhida; (4b)
  tipo=injetavel → Botica Premium (Galena rejeitada por
  `nao_aceita_bloco_injetavel`); (4c) override=FAMA → regra
  `manual_override`; (5) exclusiva preempta 2 outras; (6) Galena com
  30 emissões em pool 40 (75%>25% cota) → rejeitada por
  `cota_pct_estourada`; (7) cleanup zerado.
- **Próximo (Onda 4)**: Caio cadastra contratos via
  `/admin/contratos-farmacia` + ajusta regras em
  `/admin/farmacias-roteamento` + simula cenários no preview. Depois
  plantamos hook de warning na emissão real (chama
  `rotearFarmaciaParaReceita` em `painelPawards.ts` → grava warning
  + sugestão na resposta) + relatório de quotas + alertas.

## Wave 3 FATURAMENTO-TSUNAMI · FECHADA (23/abr/2026)
Braço PACIENTE↔UNIDADE em produção — main + feat/dominio-pawards.

- **Frente A** — `enviarEmailCobranca` real (Gmail + wrapEmailMedcore navy/gold) +
  nova `enviarLembreteInadimplencia(pagamentoId)` em `lib/cobrancasAuto.ts`.
- **Frente B** — Webhook reconciliação real em `routes/payments.ts`: auditoria
  sempre primeiro em `pagamento_webhook_eventos`, reconciliação UPDATE
  `pagamentos` com fallback duplo (gateway+payment_id → external_ref +
  backfill defensivo), mapa paid→pago / failed→falhou / etc.
- **Frente C** — `GET /api/admin/inadimplencia` (com buckets aging ≤7/8-30/31-60/>60)
  + `POST /admin/inadimplencia/:pagamentoId/reenviar` + UI navy/gold em
  `pages/admin-inadimplencia.tsx` + rota `/admin/inadimplencia` no App.tsx.
  Auth: `requireRole("validador_mestre")` + `requireMasterEstrito` (defesa
  em profundidade).
- **Migration 016** (psql aditiva, IF NOT EXISTS) — `cobrancas_adicionais`
  +enviado_em/erro_envio/tentativas_envio/paciente_id; `pagamentos`
  +external_ref/gateway_name/gateway_payment_id (+2 índices); CREATE TABLE
  `pagamento_webhook_eventos` (auditoria idempotente).
- **Migration 017** (psql aditiva, dedupe webhook architect tech debt) — 2
  índices únicos parciais em `pagamento_webhook_eventos`:
  `uniq_pwe_gateway_pid_event` (WHERE gateway_payment_id IS NOT NULL) +
  `uniq_pwe_gateway_extref_event` (WHERE gateway_payment_id IS NULL).
  Handler usa INSERT...ON CONFLICT DO UPDATE RETURNING id (zero MAX, zero race).
- **Migration 018** (psql aditiva, fix observação Dr. Claude pre-Wave 5) —
  índice btree `ix_cob_lembrete_lookup` em `cobrancas_adicionais
  (referencia_tipo, referencia_id, tipo, criado_em DESC)` acelera pre-check.
  Em `enviarLembreteInadimplencia` substituído `ON CONFLICT DO NOTHING`
  silencioso (sem UNIQUE) por **idempotência semântica** com janela 5 min
  (SELECT pre-check antes do envio Gmail → retorna `lembrete_recente_ja_enviado`).
  Solução superior a UNIQUE rígido: permite reenvio legítimo dias depois.
- **Smoke regressivo** — `artifacts/api-server/scripts/smoke_wave3.sh`:
  6 cenários sem dependência externa (dedupe gateway_payment_id+external_ref,
  reconciliação com fallback+backfill, auth gate /admin/inadimplencia*).
  6/6 verde local, reproduzível em qualquer ambiente.
- **Frente E (handoff opcional)** — Smoke E2E real Asaas aguardando secret
  `ASAAS_API_KEY`. Pipeline e adapter (`payments/asaas.adapter.ts` 235L)
  prontos. Quando vier o secret: criar cobrança → simular pagamento no painel
  sandbox → ver webhook chegar → reconciliar status real.
- **Commits** (push duplo main + feat/dominio-pawards):
  `7b58eaf` (Wave 3 inicial) → `71b29fb` (architect fix identifier+auth) →
  `cd1bb3e` (dedupe migration 017) → `90bea64` (smoke regressivo).

---

## Wave 5 PARMAVAULT-TSUNAMI · MAPEAMENTO (23/abr/2026 · ATIVO)
**Próximo braço prioritário do Caio: UNIDADE↔FARMÁCIA PARCEIRA.**
Não confundir com Wave 3 (PACIENTE↔UNIDADE). Módulos vizinhos, domínios separados.

### Inventário operacional (banco real, não seed):
- `farmacias_parmavault` (3 farmácias com `meta_receitas_semana/mes`,
  `meta_valor_mes`, `percentual_comissao`) — **PARMAVAULT** = pipeline
- `parmavault_receitas` — **8.725 registros reais** (`farmacia_id`,
  `unidade_id`, `paciente_id`, `medico_id`, `prescricao_id`, `numero_receita`,
  `emitida_em`, `entregue_em`, `status`, `valor_formula_estimado`,
  `valor_formula_real`, `comissao_estimada`, `comissao_paga`, `blend_id`)
- `parclaim_metas_clinica` (15 metas: `unidade_id` × `farmacia_id` ×
  `receitas_minimas/meta_semana` + `valor_minimo/meta_semana`) — **PARCLAIM**
- `farmacias_parceiras` (5 do legado: `cnpj`, `comissao_percentual`,
  `modelo_integracao` portal/api, `capacidades` jsonb)
- Roteamento manual: `prescricao_blocos.farmacia_indicada_id` (FK → parceiras),
  `substancias.farmacia_padrao` (TEXT livre — DIRTY), `prescricao_bloco_ativos.farmacia_padrao` (TEXT livre)

### Backend já existente:
- `GET /parclaim/:unidade_id/previsao` (projeção comissão + fee 2.5%)
- `GET /parmavault/farmacias/ranking` (ranking master-only)
- `GET /parmavault/:farmacia_id/termometros` (KPI meta vs realizado)
- `GET /parmavault/:farmacia_id/trend` (série histórica)
- `GET /global` (KPI consolidado com `comissao_total_mes`)

### Frontend já existente:
- `pages/farmacias-parmavault.tsx` (dashboard)
- `pages/metas-faturamento.tsx` (definir metas PARCLAIM)
- `pages/admin-comercial.tsx` (config comissionamento)
- `components/pawards/KpiCard.tsx` (termômetros)

### GAPS explícitos vs as 3 validações do Caio:
- **A. Validação CNPJ unidade↔farmácia** — INEXISTENTE. Aceita `unidade_id`
  e `farmacia_id` independentes; nenhum guard verifica compatibilidade
  contratual (ex: farmácia X só atende unidade Y por contrato).
- **B. Roteamento por regra** — só manual (`farmacia_indicada_id`) ou texto
  livre. Falta: seleção prévia por contrato, intra-prescrição, e por volume
  ("atingiu R$X na farmácia A vai pra B").
- **C. Reconciliação estimado→real** — colunas existem (`valor_formula_estimado`,
  `valor_formula_real`, `comissao_estimada`, `comissao_paga`) mas
  `valor_real`/`comissao_paga` NÃO são populados automaticamente. Sem ciclo
  de fechamento.
- **D. Dirty data `farmacia_padrao` TEXT** — sem FK em `substancias` e
  `prescricao_bloco_ativos`. Risco de inconsistência ("Farmácia A" vs "Farma A").

### Régua de bom senso (CAIO 23/abr/2026):
A farmácia parceira é EMPRESA EXTERNA, parceria de confiança. **Proibido**
exigir que funcionário da farmácia alimente dashboard só pra Caio ter
visibilidade. Régua: (1) usar só o que a infra captura passivamente, (2)
oferecer ferramentas que sirvam aos DOIS lados (não vigilância unilateral),
(3) exigências quando houver são CONTRATUAIS, não operacionais cotidianas.

---

