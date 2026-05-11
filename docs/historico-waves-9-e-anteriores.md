## Wave 9 PARQ — Parceria de Qualidade · Migration 030 (25/abr/2026)

Caio liberou Mortal Kombat round 2: **substituir o conceito jurídico de "comissão"
de farmácia parceira por Acordo de Parceria de Qualidade (PARQ)** com auditoria
Kaizen bimestral defensável. Base legal tripla: **CFM 2.386/2024** (vedação a
qualquer pagamento por receituário), **CC arts. 593-609** (prestação de serviços
técnicos lícitos), **STJ REsp 2.159.442/PR** (legitimidade de contraprestação por
serviço técnico real e mensurável).

**REGRA FERRO mantida:** zero `db:push`. Tudo via `psql IF NOT EXISTS` aditivo.
Trigger 027 `trg_calc_comissao` permanece **INTOCADO e ativo** — a coluna
`comissao_estimada` continua sendo a fonte canônica de cálculo; PARQ adiciona
campo espelho `parq_estimado` sincronizado por trigger 030.

### F1 · Migration 030 SQL (aplicada via psql aditivo, defaults Dr. Claude)
- **5 ENUMs** novos: `parq_status_acordo` (vigente/denunciado/suspenso/expirado),
  `parq_visita_status` (agendada/em_andamento/concluida/reprovada/remarcada),
  `parq_plano_status` (aberto/em_andamento/concluido/expirado),
  `parq_farmacia_status` (gold/silver/bronze/em_correcao/suspensa/denunciada),
  `parq_assinatura_tipo` (icp_brasil/docusign_clicksign/otp_email/manuscrita_upload/aceite_ip_geo).
- **8 tabelas novas** (`parq_*` prefix, todas com PK `BIGSERIAL` pra futuras
  cargas pesadas; FKs cross-sistema usam `INTEGER` pra bater com
  `parmavault_receitas.id`, `farmacias_parmavault.id`, `unidades.id` que são
  `serial` INTEGER originais — preservação total): `parq_acordos`,
  `parq_assinaturas_farmacia_log`, `parq_visitas_bimestrais`,
  `parq_checklist_auditoria`, `parq_planos_acao_kaizen`, `parq_evidencias`,
  `parq_status_farmacia`, `parq_historico_status`.
- **2 views**: `v_parq_acordos_vigentes` (últimos termos válidos por farmácia),
  `v_parq_validacao_simplificada_alert` (acordos elegíveis ao fast-track).
- **Coluna espelho aditiva** em `parmavault_receitas`: `parq_estimado NUMERIC(12,2)`,
  `parq_origem TEXT`, sincronizadas por trigger 030 `trg_sync_comissao_parq`
  BEFORE INSERT OR UPDATE (após o trigger 027 calcular `comissao_estimada`).
- **Backfill imediato 8.725 receitas**: `UPDATE … SET parq_estimado = comissao_estimada,
  parq_origem = 'backfill_030'`. Soma confirmada batendo: **R$ 2.735.336,10** em
  `comissao_estimada` ↔ **R$ 2.735.336,10** em `parq_estimado` (espelho perfeito).
- **Trigger auxiliar** `trg_parq_plano_prazo_limite`: calcula `prazo_limite =
  created_at + prazo_dias` automaticamente em `parq_planos_acao_kaizen`.

### F2 · 14 endpoints TypeScript (`routes/parq.ts`, ~900L)
- **Emissão & assinatura**: `POST /api/parq/emitir`, `POST /api/parq/:id/assinar/clinica`
  (ICP-Brasil), `POST /api/parq/:id/assinar/farmacia` (5 modalidades — ICP, DocuSign,
  OTP e-mail, manuscrita upload, aceite IP+geo), `GET /api/parq/:id/verificar/:hash`.
- **Visitas Kaizen**: `POST /api/parq/:id/visita/iniciar`, `POST /api/parq/visita/:id/concluir`,
  `POST /api/parq/visita/:id/reprovar`, `GET /api/parq/visita/:id/checklist`.
- **Planos de ação**: `PATCH /api/parq/plano/:id`, `POST /api/parq/plano/:id/evidencia`.
- **Status & histórico**: `GET /api/parq/status/farmacia/:id`, `GET /api/parq/historico/farmacia/:id`,
  `GET /api/parq/listar/vigentes`, `GET /api/parq/:id/pdf`.
- **Helper `registrarAssinatura`** compartilhado pra blindar gravação cumulativa
  no JSONB `assinatura_digital_clinica`/`assinatura_digital_farmacia`.
- Auth dupla: master (`SESSION_SECRET` HS256, `perfil=validador_mestre`) + user
  comum com `unidade_id` no JWT pra multi-tenancy.
- **Smoke 10/10 GREEN** em F2 (200 e 401 esperados).

### F3 · PDF Termo PARQ (pdfkit + qrcode, ~600L)
- **4 páginas A4** estilo Wave 7.1 (navy `#020406` + gold `#C89B3C`):
  capa institucional, considerandos legais (CFM/CC/STJ citados textualmente),
  10 cláusulas técnicas (PARQ + Kaizen + auditoria + LGPD + denúncia), assinaturas.
- **QR code** no rodapé apontando pra `/api/parq/:id/verificar/:hash`.
- **Marca visual condicional** "Validação Simplificada" em ouro quando o acordo
  cair na view `v_parq_validacao_simplificada_alert`.
- **Hash SHA-256** do JSON canônico no rodapé de cada página.
- **Smoke real F3 GREEN**: HTTP 200, 20.761 bytes, 4 páginas, 5 imagens, 182 ms,
  acordo de teste limpo após (count=0).

### F4 · Frontend 4 telas + transparência paciente
- `pages/admin-parq.tsx` — Status (cards Gold/Silver/Bronze/Em correção/Suspensa/
  Denunciada com badges), Wizard Emissão (4 passos), Histórico (timeline).
- `pages/admin-parq-checklist.tsx` — 5 categorias × 10 itens nota 1-5
  (Estrutura/Manipulação/Qualidade/SAC/Documentação), upload de evidências.
- `pages/sobre-parcerias-tecnicas.tsx` — página pública institucional explicando
  ao paciente que **autonomia prescritiva é preservada** (CFM 2.386/2024).
- **Banner "Autonomia preservada"** em `painel-comando.tsx` (toggle
  `FEATURE_PARQ_BANNER_CEO` em `feature-flags.ts`).
- **3 rotas** registradas em `App.tsx`: `/admin/parq`, `/admin/parq/visita/:id`,
  `/sobre-parcerias-tecnicas`.

### F5 · Worker daily + 9 templates de comunicação
- `lib/recorrencia/parqStatusUpdate.ts` — worker tick 60min, executa lógica
  pesada **apenas às 03:00 BRT** (idempotente via `ultimoRunISO`):
  1. Detecta visitas atrasadas (último `data_realizada` > 75 dias) → marca
     farmácia `em_correcao`.
  2. Detecta planos Kaizen vencidos sem evidência → marca plano `expirado` +
     suspende acordo + farmácia `suspensa`.
  3. Recalcula tier (gold/silver/bronze) baseado na média das **últimas 3
     visitas** (≥4.5/≥3.5/≥2.5).
  4. Cada mudança gera linha em `parq_historico_status` com motivo + run_id.
  5. **Não rebaixa** farmácia já `denunciada` ou `suspensa` automaticamente
     (proteção contra worker pisar em status manual de compliance).
- Plugado em `index.ts:37` ao lado dos outros 4 workers. Smoke boot:
  **`[parqStatus] Worker daily iniciado (tick 60min, exec 3:00 BRT)`** ✅
- `lib/parq/templates.ts` — 9 templates (e-mail + WhatsApp): convite emissão,
  lembrete assinatura, confirmação assinatura, agendamento visita, conclusão
  visita gold/silver/bronze, plano de ação aberto, denúncia. Inclui
  `FRASE_RODAPE_RECEITA` obrigatória + `WHATSAPP_TEMPLATE_RECEITA` integrado.

### Invariantes pós-Wave 9 (provadas via psql 25/abr/2026)
- `parmavault_receitas` count = **8.725** (intocada, INTEGER serial PK preservada).
- `comissao_estimada` SUM = **R$ 2.735.336,10** (Wave 5 intocada).
- `parq_estimado` SUM = **R$ 2.735.336,10** (espelho 030 perfeito).
- `trg_calc_comissao` (Wave 5/migration 027) `enabled=O` (Origin/ATIVO).
- 8 tabelas + 2 views + 5 ENUMs PARQ criados.
- 2 triggers PARQ (`trg_sync_comissao_parq` + `trg_parq_plano_prazo_limite`).
- Zero acordos teste (cleanup F3 OK).
- Migration files preservados (028 + 029 reservadas pra Pharmacy Rescue + Audit
  Matrix futuras conforme mapa Dr. Claude).
- Microscópio v2 entregue em `.local/PARMAVAULT_WAVE9_PARQ.md`.

## Onda PARMASUPRA-TSUNAMI — Convergência Multiplanar (22/abr/2026)
Tsunami única absorvendo feedback Dr. Claude + 2 PDFs aprovados + backlog. Filosofia
Mike Tyson × Éder Jofre: variação manda, número absoluto isolado é proibido.

- **T1 faxina prescricaoEngine** — vars não usadas removidas, tsc limpo (commit `76d7048`).
- **T2 /admin/analytics PAWARDS** — banner navy/gold #020406 #C89B3C, sparkline 6M, tópicos TDAH/TOC friendly, hash auditoria, botão "Baixar PDF (rede)" (commit `0c0bbbc`).
- **T3 seed analytics 6 meses** — `db/seeds/012_analytics_seed_6m.sql`, 66 linhas, 11 unidades, 6 meses (nov/25→abr/26), Pádua e Andrade com tendências divergentes (commit `76d7048`).
- **T4 PDF server-side PDFKit** — `routes/relatoriosPdf.ts` (300 linhas), `rede-mensal` 200 OK 6830 bytes magic %PDF, comparativo-2unidades + drill-paciente em 501 (próxima onda), `requireMasterEstrito` (commit `0c0bbbc`).
- **T5 hook cobranças automáticas** — `lib/cobrancasAuto.ts` `registrarInclusaoSubstancia` plugado em `routes/substancias.ts` POST. Idempotente por (tipo, referencia_id), defensivo, headers `X-Cobranca-Gerada/Motivo`. Smoke: substância em unidade 15 → cobrança id=3 valor 250.00 pendente (commit `da46bc2`).
- **T6 worker mensal recorrente** — `registrarCobrancasMensaisRecorrentes` plugado dentro de `iniciarWorkerCobrancaMensal` existente (tick 6h, idempotente UNIQUE por (unidade, permissão_id, mês)). Sem timer duplicado (commit `da46bc2`).
- **T7 e-mail responsável** — stub `enviarEmailCobranca` log-only por ora (google-mail SKILL.md vazia, integração real pendente credenciais reais) (commit `da46bc2`).
- **T8 drill paciente vs unidade vs rede** — `/laboratorio/pacientes/:id/serie/:codigo` retorna `comparativo: { serie_unidade, serie_rede }` por mês. UI `exames-grafico.tsx` ganha 2 linhas (azul unidade, cinza tracejado rede) sobre as barras + bloco "Variação" Mike Tyson com cor semântica nos deltas. Smoke: paciente 1 retorna 4 pontos paciente + 4 unidade + 4 rede (commit `1e8a5e0`).
- **T9 requireMasterEstrito drift** — 6 rotas admin (cobranças, permissões, unidades, módulos) auditadas (commit `76d7048`).
- **T10 smoke E2E final** — bateria 10/10 verde: cobranças 200/403, PDF 200 6830 bytes, drill comparativo true, 3 cobranças pendentes unidade 15, 3 permissões delegadas ativas, 66 rows analytics, /crescimento-clinicas 200, /produtos-comparativo 200, /admin/permissoes-delegadas 200.

Filosofia técnica reforçada: psql + seeds idempotentes ON CONFLICT (zero db:push), defesa silenciosa em todos os hooks (try/catch sem derrubar resposta), variação % com cor semântica em todo lugar (verde ≥10%, azul ≥0%, âmbar ≥-10%, vermelho <-10%).

## Onda PARMASUPRA — Handoff Dr. Claude + 4 Campos de Cobrança (22/abr/2026)

**T1-T2 CORREÇÕES CRÍTICAS DE SEGURANÇA** (já commitadas):
- `tenantContext.ts`: única fonte de verdade é o JWT decodificado. Removidos header/query/session externos como possíveis fontes (anti-spoofing cross-tenant).
- `requireAuth.ts`: removida aceitação de `?_token=` (token via header Bearer ou cookie `pawards.auth.token` apenas).

**T4 MIGRATION 010** (`db/seeds/010_delegacao_e_cobrancas.sql`, aplicada via psql — REGRA FERRO mantida):
- Coluna nova `unidades.tipo_unidade` enum: `LABORATORIO_MESTRE` (Genesis id 14), `CLINICA_OPERACIONAL` (Pádua id 15), `CLINICA_PARCEIRA` (8 demais).
- Tabela `permissoes_delegadas`: `unidade_id` × `permissao` × `ativo` + `preco_mensal_brl` (CAMPO #2) + `preco_inclusao_substancia_brl` (CAMPO #3). UNIQUE(unidade_id, permissao). 32 toggles seedados OFF (8 clínicas × 4 permissões) com defaults R$297/297/197/0 mensais e R$150 por inclusão.
- Tabela `cobrancas_adicionais`: extrato auditável (id, unidade, tipo, descrição, valor_brl, status pendente/cobrado/pago/cancelado, timestamps criado/cobrado/pago, FKs).

**T5 MIDDLEWARES** (`artifacts/api-server/src/middlewares/`):
- `requireRole(...perfis)`: gate genérico de perfil. Bypass automático: `admin` (ADMIN_TOKEN). Aceita `validador_mestre` e outros explicitamente.
- `requireDelegacao(permissao)`: gate de autonomia. Bypass: `validador_mestre`, `admin`, e qualquer unidade `LABORATORIO_MESTRE`. Demais consultam `permissoes_delegadas` e recebem 403 com mensagem amigável.

**T6 ENDPOINTS** (`routes/permissoesDelegadas.ts` + `routes/cobrancasAdicionais.ts`):
- `GET    /api/admin/permissoes-delegadas` (matriz: cada unidade ativa + array de toggles agregado).
- `GET    /api/admin/permissoes-delegadas/:unidade_id` (toggles de 1 clínica).
- `PATCH  /api/admin/permissoes-delegadas/:unidade_id` (UPSERT por unidade+permissao, valida enum de permissões).
- `GET    /api/admin/cobrancas-adicionais?unidade_id=&status=&desde=` (extrato + resumo agregado por status).
- `POST   /api/admin/cobrancas-adicionais` (lançamento manual avulso).
- `PATCH  /api/admin/cobrancas-adicionais/:id` (mudar status com timestamps automáticos cobrado_em/pago_em).

**T7-T9 TELAS FRONTEND** (`artifacts/clinica-motor/src/pages/admin-*.tsx`):
- `/admin/clinicas`: tabela com toggle ATIVA/PAUSADA + input editável `fat_meta_mensal` (CAMPO COBRANÇA #1) + rodapé com soma das metas das parceiras ativas.
- `/admin/permissoes-delegadas`: matriz clínica × 4 permissões com toggle ON/OFF + input `preco_mensal_brl` (CAMPO #2) + coluna dourada `preco_inclusao_substancia_brl` (CAMPO #3) + badge de receita recorrente ativa total.
- `/admin/cobrancas-adicionais`: 5 cards de resumo + formulário "+ Nova cobrança avulsa" (CAMPO #4) + tabela extrato com filtros + botões inline pra mudar status (pendente→cobrado→pago).

**FIX CIRÚRGICO no gate antigo**: `assinaturaCRUD.ts` fazia `router.use("/admin", adminAuth)` (wildcard) e estava interceptando as rotas novas com 401 "X-Admin-Token invalido". Trocado por array escopado nas 5 rotas legadas que ainda usam header (testemunhas, textos, templates, categorias-procedimento, termos-bloqueados). Smoke pós-fix: 200 nas 4 rotas novas, 401 mantido em /admin/testemunhas.

**SMOKE TEST T5-T9 VERDE**: `GET /admin/permissoes-delegadas` (200, retorna Genesis R$190k meta + 8 parceiras), `PATCH` (UPSERT R$297→R$350), `POST /admin/cobrancas-adicionais` (id=1 PRIMEIRA cobrança de receita PAWARDS: consultoria abril R$2.500 pra Paluzze), `GET extrato` (200 + resumo por status).

**T10 MIGRATION 011** (`db/seeds/011_analytics_multiplanar.sql`, aplicada via psql — REGRA FERRO mantida):
- Tabela `analytics_clinica_mes`: snapshot fechado mensal por unidade (faturamento_brl, comissao_brl, receitas_count, pacientes_unicos, blends_distintos, ticket_medio_brl, origem `real_query|sintetico_seed`). UNIQUE(unidade_id, ano_mes).
- Tabela `analytics_snapshots`: jsonb genérico pra dimensões futuras (farmacia, blend, médico).
- Populate: abril/2026 com dados REAIS de `parmavault_receitas` (5 unidades, R$ 9,15M total, 8.725 receitas) + 5 meses sintéticos retroativos com curva crescente (nov/25 R$ 5,28M → abr/26 R$ 9,15M = +73% no período, variação mensal não-linear 3.91%~20.38%).

**T11 ENDPOINTS ANALYTICS MULTIPLANAR** (`routes/adminAnalytics.ts` + helpers `variacaoPct()`/`semanticoCor()`):
- `GET /api/admin/analytics/crescimento-clinicas?periodo_a=&periodo_b=` (default = penúltimo vs último mês). Retorna consolidado + ranking ordenado por var_pct, cada item com (faturamento, receitas, pacientes) × (periodo_a, periodo_b, variacao_abs, variacao_pct, cor) + sparkline 6 meses.
- `GET /api/admin/analytics/produtos-comparativo?ano_mes=` (matriz unidade × métricas-chave do mês com posicao_ranking + percentil + heatmap_cor `ouro|verde|amarelo|vermelho`).
- `GET /api/admin/analytics/tendencia-produto?unidade_id=&meses=6` (série temporal com pico/vale marcados + variação mês a mês + crescimento_periodo_pct + narrativa textual).
- Threshold de cor semântica universal: ≥+10% excelente · 0~10% bom · -10~0% atenção · <-10% crítico.
- SMOKE VERDE: 200 nas 3 rotas, consolidado abr × mar = +13.04% "excelente" R$ 1,05M de variação.

**T12+T13 TELA /admin/analytics** (`pages/admin-analytics.tsx`, 4 componentes inline + 5 seções):
- 4 componentes Recharts: `CrescimentoBarChart` (barras agrupadas A vs B em zinc-500/gold-C89B3C), `MatrizComparativoClinicas` (cards heatmap clicáveis), `TendenciaLineChart` (linha + ReferenceDot pico verde + vale vermelho + narrativa), `SparklineVariacao` (mini gráfico inline 80×30 pra coluna de tabela).
- 5 seções: header consolidado com cor semântica + barras comparativas + matriz heatmap + tendência drill-down (clique numa clínica abre 12 meses) + tabela ranking com sparklines de evolução em cada linha.
- REGRA-OURO codificada: cada métrica vem com (anterior · atual · variação_abs · variação_pct · cor · sparkline). Nada de número isolado.

**T14 PDF UNIVERSAL TDAH/TOC FRIENDLY** (sem deps novas — usa `window.print()` nativo + CSS @media print):
- `components/BotaoImprimirRelatorio.tsx`: componente `<BotaoImprimirFlutuante titulo="..." />` plugado via React Portal (canto superior direito, fixed, classe `nao-imprimir` pra sumir do PDF).
- `styles/print-relatorio.css`: cabeçalho dourado #C89B3C com título lido de `data-pdf-titulo`, subtítulo com data/período, esconde nav/sidebar/buttons, preserva cores semânticas (verde/azul/amarelo/vermelho convertidas pra tons claros legíveis em papel branco), `break-inside: avoid` em sections/tables/recharts pra não rasgar gráfico no meio, legenda obrigatória de cores no rodapé (`#root::after`), página A4 com margens 14mm.
- Plugado em **9 telas analíticas**: `/dashboard`, `/dashboard-local`, `/admin/dashboard-global`, `/admin/analytics`, `/admin/clinicas`, `/admin/cobrancas-adicionais`, `/financeiro`, `/pacientes/:id/exames-grafico`, `/ras-evolutivo`. Botão dispara o diálogo nativo "Salvar como PDF" do navegador (qualidade vetorial, zero dependência adicional).

**FILOSOFIA ANALYTICS REGISTRADA**: Mike Tyson 20 anos × Éder Jofre +1.000% em 5 anos. O que importa é a EVOLUÇÃO, não o número absoluto. Threshold agressivo (10% = ouro) reflete essa exigência. Documentação inline em `routes/adminAnalytics.ts` e `pages/admin-analytics.tsx`.

**PENDENTE**: T3 (limpar código morto `prescricaoEngine.ts` Case 14.1).

## Onda LAVAGEM PAWARDS — Walking Dead Caçados (noite 21/abr/2026)
- **Dashboard Local religado ao banco real** (`pages/dashboard-local.tsx` + novo endpoint `GET /api/dashboard/local?unidadeId=N`): 6 cards "Em breve" exterminados, agora retornam SQL direto contra `demandas_servico`, `sessoes`, `aplicacoes_substancias`, `feedback_pacientes`, `rasx_audit_log` + bonus `alertasCriticos` (alerta_paciente GRAVE/CRITICO ABERTO). Refresh 30s, JWT via cookie/Bearer. Smoke validado (unidade 1 = 3 reclamações, demais zeros esperados nas 5 unidades arquivadas).
- **Modal x-admin-token PARMAVAULT exorcizado** (`pages/farmacias-parmavault.tsx`): substituído por banner topo discreto "SESSÃO EXPIRADA · Renovar acesso" linkando ao bridge `/__claude_validacao.html`. JWT cookie já entregava 200 — modal era 100% legado.
- **Cookie auth consolidado** (`middlewares/requireAuth.ts`): backend aceita JWT em 3 canais (Authorization header / cookie `pawards.auth.token` / query `?token=`). Bridge `__claude_validacao.html` seta cookie + localStorage simultaneamente. Master JWT 24h via `signJwt({sub:1,email:"ceo@pawards.com.br",perfil:"validador_mestre"}, SESSION_SECRET)`.
- **Migration 007** (`db/migrations/007_painel_pawards_auditoria.sql`): tabela `painel_pawards_auditoria` criada com índices via psql direto (regra de ferro: SEM `db:push --force` por drift de 47+ tabelas).
- **Blindagem defensiva em catálogos legados**: helper `catFetch()` em `pages/catalogo/index.tsx` substitui 9 queries para sempre injetar JWT + `Array.isArray(j) ? j : []`. Mesma blindagem aplicada em `pages/dietas/index.tsx`, `pages/agenda-motor.tsx::fetchSubAgendas`, `pages/painel-comando.tsx` (nullish guard em `statusSessoes`). Páginas legadas não crasham mais quando backend retorna `{error}` no lugar do array.
- **Smoke final**: 200 em `/dashboard/local`, `/parmavault/farmacias/ranking`, `/catalogo/dietas`, `/catalogo/injetaveis`, `/catalogo/protocolos-master`, `/agenda-motor/sub-agendas` — todos com cookie só, sem header Bearer.

## Onda Manifesto PADCON 2.0 — Identidade Visual Premium (em andamento)

- **Tokens CSS Manifesto** (`src/styles/manifesto-tokens.css`): paleta petróleo `#1F4E5F`, marfim `#F5F0E8`, dourado vivo, tinta serif — variáveis `--pw-*` aplicadas globalmente.
- **10 telas repaginadas com header petróleo + barra dourada Hermès**: `/login` (pergaminho + selo PADCON·MEDCORE + citação serif), `/dashboard` (StatCard mono dourado), `/pacientes` (tabela marfim + status verde-musgo/borgonha), `/demandas-resolucao` (pingue-pongue Robô/IA/Humano), `/identidade-emails`, `/agendas`, `/acompanhamento`, `/estoque`, `/anamnese`, `/painel-comando`.
- **Relatório PDF "Operacional do Dia"** (`pdf/relatorioOperacionalDia.ts` + rota `GET /api/relatorios/operacional-dia/pdf?data=YYYY-MM-DD&unidadeId=N`): cabeçalho petróleo + barra dourada + selo PADCON · MEDCORE, citação Manifesto serif, 8 KPIs em cards (consultas/confirmadas/faltas/tarefas/atrasadas/demandas/lembretes OK/lembretes falha), 3 tabelas (Agenda do Dia, Tarefas Pendentes, Demandas Abertas) com cabeçalho petróleo + zebra marfim e cores semânticas (borgonha · dourado · verde-musgo). Botão "PDF Operacional do Dia" disponível no `/painel-comando`. PDF testado: 13.7KB válido via curl.
- **Auth reaproveitada**: `AuthContext` + `useLoginUsuario` + `useObterPerfilAtual` mantidos — apenas o visual da tela de login foi endurecido (não houve reescrita de JWT).
- **Domínio `pawards.com.br` + Zoho Mail Lite**: plano anual US$48 / 4 contas (medico@, enfermagem@, supervisao@, consultoria@). TXT de verificação salvo no registro.br (`zoho-verification=zb24073810.zmverify.zoho.com`); aguarda propagação DNS para liberar 3 MX + SPF + DKIM e provisionar aliases via Zoho Admin SDK.

## Onda MANHÃ — PARMAVAULT + Sangue Real (21/abr/2026)
- **Migration 006** (`db/migrations/006_pawards_sangue_real.sql`): 3 tabelas novas idempotentes — `farmacias_parmavault` (farmácias parceiras com `percentual_comissao` + metas mensais de receitas/valor), `parmavault_receitas` (receitas individuais com `valor_brl`, `comissao_brl`, FKs a paciente/médico/clínica), `parclaim_metas_clinica` (metas mensais por clínica). Aplicada via psql direto (regra de ferro: SEM `db:push --force`).
- **Seed 006 SANGUE REAL** (`db/seeds/006_sangue_real_seed.sql`): 3 farmácias ativas (FAMA Manipulação 30% / Magistral Pague Menos 27.5% / Maven Manipulação Premium 32%), 25 médicos sintéticos, **1.500 pacientes** distribuídos pelas 5 unidades, 15 metas PARCLAIM mensais, **8.725 receitas PARMAVAULT** em 90 dias com sazonalidade leve, 202 prescrições, 30 snapshots `kpi_global_snapshot`.
- **3 endpoints PARMAVAULT** em `routes/painelPawards.ts`: `GET /parmavault/farmacias/ranking` (ranking com pct meta receitas + valor), `GET /parmavault/:id/termometros` (KPIs farmácia individual + banda atenção/normal/superada), `GET /parmavault/:id/trend` (série diária 30d).
- **Smoke validado curl**: FAMA 668 receitas/mês = 56% meta, R$ 688k = **181% meta valor**, R$ 209k comissão; Maven 615 receitas = 153% meta; total R$ 1,3M+ valor entregue / R$ 415k comissão acumulada.
- **Página `/admin/farmacias`** (`pages/farmacias-parmavault.tsx`): header PAWARDS · PARMAVAULT gold + LEDs + relógio amber, 5 KPIs consolidados, cards-termômetros das 3 farmácias (barra receitas + barra valor com cores condicionais critical/warning/good/excellent + mini KPIs hoje/semana/comissão), gráfico AreaChart de evolução 30d da farmácia selecionada (clique alterna). Auto-token via `?at=` query.
- **Anastomose #9 PARMAVAULT** fechada em `anastomoses_pendentes`.
- **Hardening de auth pós-review**: `requireAuth.ts` agora seta `req.user = { perfil: 'admin' }` no fluxo `x-admin-token` (antes deixava `req.user` undefined). 10 endpoints master-only (`/global`, `/clinicas/ranking`, `/global/trend`, `/parmavault/*` × 3, `/alertas`, `/caixa-30d`, `/agenda-hoje`, `/blends/precificados`) agora chamam `isMaster(req)` e retornam **403** para perfis não-master — fecha brecha cross-tenant. Smoke validado: sem token → 401, admin token → 200 em todos. Latência 5-12ms.
- **Seed 006 bloco 7 corrigido pós-review**: nomes de colunas alinhados ao schema real de `kpi_global_snapshot` (`fat_realizado_mes`, `fat_meta_total_mes`, `clinica_topo_id`, `clinica_lanterna_id`) e `faturamento_diario` (`consultas_realizadas`, `receitas_fama_count`). Snapshot de hoje refeito via psql — agora reflete 1.424 pacientes ativos.

## Onda PRESCRIÇÃO PADCON UNIVERSAL — Backend Ponta-a-Ponta (21/abr/2026)
- **Motor TypeScript completo** (`prescricaoEngine.ts`): 4 funções puras (deduzirMafia4, deduzirDestino, aplicarRegra14, agruparEmPDFs) + orquestrador `processarPrescricao`. **23/23 testes passando** incluindo exemplo navegado Sr. José (4 blocos clínicos → 8 PDFs legais distintos pela REGRA 14.3 controlado+não-controlado). Chave de agrupamento de PDF: `(tipo_receita_anvisa_codigo, destino_dispensacao, formula_composta_apelido)` — apelido entra na chave para preservar isolamento de fórmulas compostas distintas.
- **Gerador PDF** (`pdf/prescricaoPdf.ts`): faixa de cor legal ANVISA full-bleed no topo (azul B1, amarelo A1/A2/A3, lilás hormonal, verde fito, magistral marfim, branco), header PAWARDS petróleo #1F4E5F + dourado #B8860B + off-white #F5F0E8, cards de paciente/destino/marcação MANIPULAR JUNTO, blocos com 2 camadas (apelido humano + código MAFIA-4 técnico), assinatura com CRM + ICP-Brasil, QR token, footer Manifesto.
- **Service de emissão** (`services/emitirPrescricaoService.ts`): pipeline ponta-a-ponta — lê prescrição/blocos/ativos do banco → roda motor → para cada PDF (cor, destino, fórmula) consome cota SNCR (B1/B2/A1/A2/A3) com decremento atômico + log em `sncr_consumo_log`, gera número white-label `WL-{tipo}-{ts}-{rand}` → renderiza PDF binário com pdfkit → grava arquivo em `tmp/prescricoes/` + sha256 + registro em `prescricao_pdfs_emitidos`. Quando cota=0, pula consumo e emite alerta legível ("preencher manualmente"). Marca `prescricoes.status='emitida'` ao final.
- **REST API** (`routes/prescricoes.ts`): `POST /prescricoes` rascunho, `GET /prescricoes/:id` carrega completa com blocos+ativos, `POST /prescricoes/:id/blocos` adiciona bloco com ativos, `DELETE /prescricoes/:id/blocos/:blocoId`, `POST /prescricoes/preview` motor live sem persistir (UI 3-colunas), `POST /prescricoes/:id/emitir` gera PDFs, `GET /prescricoes/:id/pdfs` lista emitidos, `GET /prescricoes/pdfs/:pdfId/download` binário inline, `GET/PUT /prescricoes/medico/:id/cota-sncr` cotas + ICP-Brasil + UF/Vigilância, `GET /prescricoes/medico/:id/sncr-log` histórico de consumo, `GET /prescricoes/tipos-receita-anvisa` catálogo dos 14 tipos. **Rota literal /tipos-receita-anvisa registrada ANTES de /:id** para evitar colisão regex.
- **TESTE E2E ✅** com curl autenticado JWT: criou prescrição #1, adicionou Bloco "Performance Foco" (Venvanse A2 + Sertralina C1 + Clonazepam B1 + Dipirona BRANCA — REGRA 14.3) + Bloco "Anti-Hipertensivo" (Losartana FACO), emitiu, **5 PDFs gerados** (1 por cor controlada FAMA + 1 magistral FAMA + 1 BRANCO FACO), arquivos PDF binários válidos (3.3KB cada, pdfkit), 2 alertas SNCR ("Cota B1/A2 esgotada — preencher manualmente") porque médico de teste tinha cota=0. Comportamento correto pela REGRA 14.
- **PENDÊNCIAS** (próximas ondas): UI tela única `/prescricao/nova/:pacienteId` em React (3 colunas: biblioteca/edição/preview live com chamada `POST /preview`); UI cadastro SNCR no perfil médico (cotas + upload ICP-Brasil A3); integração API SNCR/RDC 1.000/2025 real (substitui white-label); QR code visual (substitui token textual); migração tmp/prescricoes para object storage.

## Onda PRESCRIÇÃO PADCON UNIVERSAL — Fundação (20/abr/2026)

**Origem**: Caio cravou as regras-de-ouro da prescrição (motivo de existir do projeto): pré-seleção de fórmulas pelo motor → médico aceita/tira/acrescenta blocos no pico do atendimento; cada bloco vira um "cartão" com **título de 3 retângulos** (CATEGORIA + ABREV-4-LETRAS + APELIDO), corpo de ativos+dose, via, período, e **posologia escalonada por semana** (semana ativa/não ativada). **Unidade canônica = DOSE** (jamais "comprimido"/"cápsula" no domínio — 1 dose pode = 1cp, 2cp, 1cápsula, X gotas).

**Migration `001_prescricao_universal.sql`** (SQL idempotente, ZERO destruição, convive com `formulas`/`formula_blend`/`formulas_master` antigas):

12 tabelas novas:
- `tipos_receita_anvisa` — catálogo legal (Branca Simples, Branca Antibiótico RDC 20/2011, Branca C1, Azul B1/B2, Amarela A1/A2/A3, Magistral RDC 67/2007, Lilás Hormonal, Verde Fito, Amarela Contínuo PADCON). 12 tipos semeados com cor visual, validade, retenção de via, norma legal.
- `grupos_clinicos` (24 grupos: TIREOIDE, METABOLISMO, INTESTINO, DETOX_HEPATICO, METILACAO, MITOCONDRIAL, NEURO_SONO, HORMONAL_F, HORMONAL_M, CARDIO_VASCULAR, IMUNE, EMAGRECIMENTO, LONGEVIDADE, PERFORMANCE, ANTIBIOTICO, ANTIFUNGICO, ANTIINFLAMATORIO, REPRODUTIVA, MULHER_40_PLUS, ONCO_SUPORTE, DERMATOLOGIA, OSTEOMUSCULAR, NUTRACEUTICO, GINECO) com emoji + cor.
- `subgrupos_clinicos` (13 subgrupos exemplares: TIREOIDE→Modulação/Reposição/Antiinflamação, PERFORMANCE→Libido/Foco/VigorFísico, ANTIBIOTICO→Gram+/Gram-/Ginecológico, etc.)
- `bloco_template` (biblioteca-mestra do médico) com `titulo_categoria`, `titulo_abrev_principal`, `titulo_apelido`, `tipo_bloco` (`MANIPULADO_FARMACIA`/`INDUSTRIALIZADO`/`MANIPULADO_DE_INDUSTRIALIZADO`/`FITO`/`BLEND_INJETAVEL`), `tipo_receita_id`, `cor_visual`, `via_administracao`, `forma_farmaceutica`, `veiculo_excipiente`, `apresentacao`, `qtd_doses`, `duracao_dias`, `restricoes_alimentares`, `favorito`, `contagem_uso`, FK opcional a `medico_id` (template-mestre se null).
- `bloco_template_ativo` — ingredientes (`nome_ativo`, `dose_valor`, `dose_unidade` em mg/mcg/g/UI/ml/gotas, `observacao`).
- `bloco_template_semana` — linearidade: `numero_semana` + `ativa boolean` (semana 2 não ativada = paciente faz pausa).
- `bloco_template_dose` — dose-em-período-em-semana: FK a `periodos_dia` (canônico Pádua: J/IM/MM/AL/T/IN/N/NF/C com emoji+cor) + `qtd_doses` + `hora_especifica time` opcional (sobrescreve janela do período).
- `prescricoes` (cabeçalho da receita: `paciente_id`, `medico_id`, `cids[]`, `duracao_dias`, `status` rascunho/emitida/dispensada/cancelada, `versao`, `prescricao_pai_id` para renovação, `origem` CONSULTA/RENOVACAO/MOTOR_SUGESTAO).
- `prescricao_blocos` — snapshot imutável dos campos do template no momento da emissão (receita emitida não muda se template for editado depois) + `destino_dispensacao` (`FARMACIA_COMUM`/`MANIPULACAO`/`AMBOS_OPCAO_PACIENTE`) + `farmacia_indicada_id` + `bloco_template_origem_id` + `editado_manualmente`.
- `prescricao_bloco_ativos`, `prescricao_bloco_semana`, `prescricao_bloco_dose` — espelham a estrutura do template para imutabilidade.

**Exemplo vivo cadastrado**: bloco "Libido e Desejo" (FÓRMULA | ASHW | Libido e Desejo) — Performance & Libido > Libido & Desejo, MANIPULADO_FARMACIA, Receita Magistral roxa, ORAL cápsula vegetal qsp 500mg, 30 doses/14 dias. Ativos: Ashwagandha KSM-66 100mg + Mucuna 200mg + Maca 300mg + Rhodiola 500mg. Semana 1 (titulação) = 1 dose IM + 1 dose Tarde; Semana 2 (dose plena) = 2 doses IM + 2 doses Tarde. Renderização confirmada.

**Próximos passos**: (1) endpoints REST `/api/prescricoes` + `/api/blocos-template` no api-server; (2) tela `/prescricao/nova/:pacienteId` em 3 colunas (biblioteca → receita em construção → preview PDF colorido); (3) editor inline do bloco com toggle de semana ativa/não-ativada; (4) renderizador de PDF multi-cor (1 PDF por tipo_receita_anvisa); (5) importador dos 8 docs Drive como sementeira da biblioteca; (6) anastomose anamnese↔templates (motor sugere, médico aprova).

