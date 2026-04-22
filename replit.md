# Pawards — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Pawards is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It aims to streamline operations, enhance patient care through data-driven suggestions, and improve administrative efficiency. The platform's core functionality includes patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables, implants, and treatment protocols. Key capabilities include TDAH-friendly dashboards with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management. The business vision is to provide an invisible operational consultancy service through a highly efficient and scalable platform, with a comprehensive monetization system for modules and services, targeting multi-unit clinics and consultancy companies.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

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

## Onda Blindagem JWT (concluída — 20/abr/2026)

Antes do domínio `pawards.com.br` entrar no ar com aliases reais, a API foi blindada com autenticação JWT real. A auth anterior emitia token fake (`token-{id}-{timestamp}`) e `/perfil-atual` ignorava o token e devolvia o primeiro `validador_mestre` — qualquer um com acesso à URL conseguia operar como Caio.

- **HS256 manual via `node:crypto`** (`api-server/src/lib/auth/jwt.ts`) — sem dependência nova; secret via `JWT_SECRET` ou `SESSION_SECRET`; TTL 8h; header fixo (resiste a `alg:none`); `timingSafeEqual` na verificação.
- **Middleware `requireAuth`** (`api-server/src/middlewares/requireAuth.ts`) montado globalmente em `/api/*` antes do router. Whitelist com **match exato** para rotas estáticas + **prefix com slash** para dinâmicas (evita bypass via `startsWith`). Públicas: `/healthz`, `/health`, `/usuarios/login`, `/portal/*` (paciente), `/padcom-sessoes`, `/padcom-questionarios`, `/padcom-bandas`, `/questionario-paciente`, webhooks de pagamento e assinatura.
- **`/usuarios/login` reescrito**: bcrypt compare (suporta hash `$2*` ou plaintext legacy com auto-upgrade após login bem-sucedido); emite JWT real com `{sub, email, perfil, escopo, unidadeId, consultoriaId}`.
- **`/usuarios/perfil-atual` reescrito**: lê `req.user.sub` do token e busca o usuário real (não mais hardcoded).
- **`PUT /usuarios/:id` endurecido**: campos editáveis split em `SELF_FIELDS` (próprio user) vs `ADMIN_ONLY_FIELDS` (perfil/escopo/permissões só admin); senha exige `senhaAtual` e só o próprio user pode trocar a sua; bcrypt hash sempre.
- **`POST /usuarios` e `DELETE /usuarios/:id`**: só admin (`validador_mestre`/`consultoria_master`); admin não pode se autodeletar.
- **Frontend** (`AuthContext.tsx` + `custom-fetch.ts`): token persistido em `localStorage` (`pawards.auth.token`); `setAuthTokenGetter` registrado no top-level do módulo (injeta `Authorization: Bearer` automaticamente); auto-logout em 401; `queryClient.clear()` no logout.
- **Pen-test interno (Dr. Claude checklist)**: 9/9 passaram — sem token = 401, JWT inválido = 401, JWT expirado = 401, traversal = 401, escalada de perfil bloqueada, senha de outro user bloqueada (403), delete cross-user bloqueado (403), criação de admin por não-admin bloqueada (403), próprio nome editável (200).
- **`SECURITY_DEBT.md` removido do root** (compromisso cumprido).
- **Deferido (próximas ondas)**: cross-tenant isolation total nos handlers (validar `unidadeId` do path bate com escopo do token); refresh token em HttpOnly cookie; access token de 15min ao invés de 8h; rota dedicada de "esqueci minha senha".

## Fix Worker Lembrete Prescrição (concluído)

- **Bug**: worker `[lembretePrescricao]` quebrava a cada 60s porque a tabela master `prescricoes_lembrete` não existia no banco (somente a tabela filha `prescricao_lembrete_envios` estava criada).
- **Correção**: criada a tabela `prescricoes_lembrete` via SQL puro com schema idêntico ao definido em `lib/db/src/schema/prescricoesLembrete.ts` — `id serial PRIMARY KEY`, `paciente_id`/`unidade_id` com FKs, `periodos` jsonb, `horarios_envio` jsonb, timestamps. Padrão de IDs preservado (todas as novas tabelas seguem `serial` consistente com o schema Drizzle).
- **Política de schema deste projeto**: alterações de schema são feitas via SQL puro (sem `db:push`) por causa de ~10 tabelas auxiliares operacionais com dados de produção que existem fora do schema Drizzle, conforme preferência absoluta do usuário ("never dropping tables with data").

## Onda 7 — Motor de Recorrência Programada + Blindagem Multi-Tenant (concluída)

- **4 tabelas novas**: `planos_terapeuticos_template`, `fases_plano_template`, `adesoes_plano`, `eventos_programados`.
- **3 templates canônicos seed**: PLANO_3M_INICIAL (R$ 2.700, 3 fases / 90 dias), PLANO_6M_CONTINUIDADE (R$ 5.400, 3 fases / 180 dias), PLANO_12M_TRANSFORMACAO (R$ 9.600, 6 fases / 365 dias). 12 fases totais com ações esperadas (RAS_INICIAL, AGENDAR_RETORNO, COBRAR_PARCELA, LEMBRETE_RETORNO, RAS_PROGRAMADO, RENOVACAO_AVISO).
- **Função `iniciarAdesao`** (`lib/recorrencia/motorPlanos.ts`): materializa automaticamente todos os eventos programados a partir das fases do template, distribuídos no tempo (RAS_INICIAL no início, RENOVACAO_AVISO 7 dias antes do fim, demais no meio de cada fase).
- **Worker scheduler interno**: `setInterval` 5 min executa eventos pendentes vencidos (`status=PENDENTE AND agendado_para<=now`), com retry até 3 tentativas → status FALHOU. `setInterval` 60 min recalcula score de risco de abandono.
- **Score risco abandono (0-10)**: heurística baseada em dias desde último atendimento + eventos pendentes acumulados. Score ≥ 7 entra na lista de reativação.
- **Middleware `tenantContextMiddleware`** (`middlewares/tenantContext.ts`): injeta `req.tenantContext.unidadeId` a partir de header `x-unidade-id`, query `unidade_id` ou session. Aplicado globalmente em `/api`.
- **6 endpoints REST**: `GET /api/planos-templates`, `POST /api/planos/adesoes`, `GET /api/planos/adesoes`, `GET /api/planos/adesoes/:id/eventos`, `POST /api/planos/admin/executar-pendentes`, `POST /api/planos/admin/recalcular-scores`, `GET /api/planos/inteligencia/risco-abandono`.
- **Cobertura V2 GPT** subiu de 53% → **80% COMPLETO** (12/15 tópicos). 3 Kaizens P10/P9 marcadas IMPLEMENTADAS.

## Onda 6.5 — Manifesto Estratégico Nacional + Kaizen + Escala Industrial (concluída)

- **4 tabelas novas**: `manifestos_estrategicos`, `niveis_escala_nacional`, `oportunidades_entrada_nacional`, `kaizen_melhorias`.
- **Manifesto Nacional V1** (escopo NACIONAL): propósito de vida (medicina integrativa acessível a todos), 3 vetores (escala, recorrência, proteção jurídica), filosofia Kaizen (PDCA, Gemba, 5 Porquês, Kanban, Heijunka, Poka-yoke), inspirações premiadas (Mayo Clinic, Cleveland, Linear, Stripe Atlas, Notion).
- **5 níveis da escada nacional**: CR_SOLO → EQUIPE_MEDICA → REDE_MULTI_CLINICA → FARMACIA_MANIPULACAO → INDUSTRIA_INJETAVEIS. Cada nível com requisitos, oportunidades, marcos-chave e métrica-alvo.
- **6 oportunidades de entrada com gancho neuromarketing**: vitamina D popular (R$ 450 trim.), Rhodiola injetável (R$ 980 mensal), parceria médica (R$ 3500/mês), franquia clínica (R$ 25k/mês), farmácia integrada (R$ 8k/mês), contrato SUS industrial (R$ 1,5M/ano).
- **18 melhorias Kaizen mapeadas** distribuídas em 7 áreas (CLINICO, JURIDICO, FARMACIA, INDUSTRIAL, COMERCIAL, EXPERIENCIA, GOVERNANCA), com impacto/esforço/prioridade/ciclo (PDCA, Gemba, Poka-yoke, Heijunka, 5_Porques) e origem-inspiração (Toyota, Mayo Clinic, Stripe Atlas, etc).
- **4 endpoints REST somente-leitura**: `GET /api/manifesto-nacional`, `GET /api/niveis-escala-nacional`, `GET /api/oportunidades-entrada?nivel=`, `GET /api/kaizen-melhorias?area=&status=` (com resumo agregado).

## Onda 6.4 — Auto-provision Drive + Anastomose Semântica GPS+RAS (concluída)

- **Subpastas Drive expandidas (16 → 20)**: adicionadas `NOTAS FISCAIS`, `ASSINATURAS`, `RAS`, `GPS` como pastas-padrão de todo paciente.
- **Hook `autoProvisionDriveAsync`** (`lib/pacientes/autoProvisionDrive.ts`): fire-and-forget no POST /pacientes; cria pasta raiz + 20 subpastas + planilha GPS+RAS sem bloquear o cadastro.
- **Planilha GPS+RAS** (`lib/sheets/planilhaPacienteGPS.ts`): Google Sheet com 4 abas — `GPS_LINHA_VIDA`, `RAS_RELATORIOS`, `PROTOCOLOS`, `FINANCEIRO_NF` — cabeçalhos bold em azul petróleo, arquivada na subpasta GPS.
- **Auto-upload NF Drive** (`lib/juridico/notaFiscalDrive.ts`): após `emitirNotaFiscalBlindada`, gera HTML fiscal e faz upload na subpasta NOTAS FISCAIS; persiste `drive_file_id`/`drive_file_url` em `notas_fiscais_emitidas`. Endpoint `POST /api/notas-fiscais/:id/reupload-drive` para recuperação manual.
- **Anastomose semântica GPS+RAS**: 7 categorias procedimento + 6 textos institucionais reescritos com siglas embutidas (GPS = Gerenciamento Personalizado de Saúde; RAS = Relatório Assistencial Sistêmico) em tom neuromarketing — "convite à mudança de vida", "assinatura da casa própria", acolhimento + segurança + decisão consciente. Coluna `titulo_curto` adicionada em `assinatura_textos_institucionais` para subjects/push.

## System Architecture

The system is built as a monorepo using `pnpm workspaces`, Node.js 24, and TypeScript 5.9. The frontend utilizes React, Vite, Tailwind CSS, and shadcn/ui, while the backend is powered by Express 5. PostgreSQL serves as the database, managed with Drizzle ORM and validated using Zod. API code generation is handled by Orval, charts by Recharts, and routing by Wouter.

Key architectural decisions and features include:

-   **UI/UX Design:** Emphasizes a classic, austere, and TDAH-friendly aesthetic with 0px border-radius, pastel blue primary color, deep navy background, and JetBrains Mono typography, resembling a well-formatted legal document.
-   **Access Control & Multi-unit Management:** Role-based access (e.g., `enfermeira`, `medico_tecnico`) and dynamic permissions with a matrix per profile. Supports full management and configuration of multiple clinic units and a multi-clinic consultancy model with `escopo`-based visibility.
-   **Clinical Engine:** Automates suggestions for therapeutic items based on semantic analysis of anamnesis, utilizing a Unified Therapeutic Items Catalog.
-   **Operational Workflow:** Manages workflows through operational queues (anamnesis, validation, procedures, follow-up, payments) and includes parameterized approval flows with conditional bypasses.
-   **Data Management & Auditability:** All new database schemas must include `origem`, `versaoSchema`, and `arquivadoEm` for auditability and LGPD compliance.
-   **Reporting & Dashboards:** Generates automated RAS (Registro de Atendimento em Saúde) PDFs. Features a TDAH-friendly dashboard with real-time operational queues and comprehensive global/unit KPIs.
-   **Monetization & Commission System:** Implements a "Motor Comercial" with three charging models (Full, Pacote, Por Demanda) and eight sellable modules, including a commission tracking system for consultants.
-   **Delegation System:** A Trello-style board with tasks, priorities, deadlines, and responsibilities, supporting Colaborador Scoring.
-   **SLA Management:** Unified SLA queue with a traffic light system for task cards and follow-ups, requiring mandatory justifications for overdue items with escalation procedures.
-   **Advanced Analytics:** A "Matriz Analítica Cross-Filter" for detailed cross-analysis of clinical data with dynamic facets and server-side pagination.
-   **Agenda Motor:** A comprehensive scheduling engine with transactional slot management, availability rules, appointment booking, rescheduling, and bidirectional Google Calendar synchronization. Includes "Sub-Agendas" for filtering.
-   **Patient Portal:** Allows patients to view appointments, self-reschedule, and manage their profile. Includes an automated "Faltou" (missed appointment) engine.
-   **Smart Slot Release:** Progressively releases appointment slots based on occupancy thresholds (e.g., morning slots released first, afternoon slots released when morning slots are 60% occupied).
-   **Bidirectional Trello Sync:** Synchronizes tasks and statuses between the internal delegation board and Trello.
-   **Team Management Module (Colaboradores & RH):** Provides full team management, including positions, members, task attempts, validations, commission events, and disciplinary events. Features identity cards with detailed information per role.
-   **Virtual Agents Module (Carta Magna PADCOM):** Manages AI agent provisioning, capabilities, execution logs, contextual memories, and human validation queues. Includes extensive configuration for agent personalities and writing engines (e.g., formality, empathy, tone, writing style rules).
-   **Clinic-Aware Filtering:** All major pages dynamically filter data based on the selected clinic using a `useClinic()` context and `?unidadeId` query parameters.
-   **Semantic Code Coverage:** 100% semantic code coverage for dietary plans using the `B1 B2 B3 B4 SEQ` format.
-   **Full CRUD Editing:** Complete Create/Read/Update/Delete functionality for all major entities including Catálogo (Injectables, Formulas, Implants, Protocols, Exams, Diseases), Users, Substances, Sub-Agendas, Units, Semantic Codes, Approval Flows, and Profiles/Permissions.
-   **New CRUD Pages:** Dedicated pages for Dietas, Psicologia protocols, Master Questionnaires, Consultancies, and Contracts, all with full CRUD functionality.
-   **RASX REVO — Dual-Mode Medications:** Supports both traditional "Remédio" and "Fórmula Magistral" (compounded formulas) with distinct data structures and PDF reporting.
-   **RASX-MATRIZ V6 — Semantic Motor Architecture:** A robust document generation engine structured with 5 Master Blocks (CLIN, JURI, FINA, ACOM, 4100), 20 Subgroups, 7 Events, 6 Procedure Classes, and 6 Specific Consents. Generates hashed, officially named PDFs with auditable logs and optional delivery via Drive, Email, or WhatsApp.
-   **Institutional PDF Layout:** Standardized header (PAWARDS + Nick) and footer (page number, institutional details, RASX-MATRIZ V6, Developed by Pawards MedCore) for all generated PDFs.
-   **DB-driven Legal Terms:** Manages legal terms (e.g., LGPD, consent forms) from the database, allowing for versioning and digital signing by patients, integrated into enriched RACJ PDFs.
-   **Instituto Genesis:** A protected, immutable "genesis_seed" unit (ID 14) that serves as a permanent template for colonizing new clinics with predefined catalogs, legal terms, and motor configurations. It allows for additive catalogs where new entries propagate automatically.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Drizzle ORM:** Database interaction layer.
-   **ViaCEP API:** Brazilian address lookup service.
-   **Google Calendar API:** Clinic schedule management.
-   **Google Drive API:** Structured document storage and source code backup.
-   **Gmail API:** Automated email sending.
-   **Orval:** OpenAPI-first code generation tool.
-   **Recharts:** JavaScript charting library.
-   **Trello API:** Task board synchronization (configurable via TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID).
-   **Twilio:** WhatsApp messaging service.
-   **Gupshup:** WhatsApp messaging service.
## Sistema de Pagamentos PADCON (Dr. Manus)

Integrado em 17/04/2026. Adapter pattern com 4 gateways (Asaas, Mercado Pago, Stripe, InfinitPay).

**Backend** (`artifacts/api-server/src/`):
- `payments/` — types, payment.service, 4 adapters
- `routes/payments.ts` — REST + webhooks (montado em `/api/payments`)
- `app.ts` — `express.raw` para `/api/payments/webhooks/stripe`

**Frontend** (`artifacts/clinica-motor/src/`):
- `hooks/use-payment.ts` — hook React (chargePatient, subscribeClinic, polling PIX)
- `components/PaymentModal.tsx` — modal universal B2C/B2B

**Endpoints:** GET /api/payments/gateways · POST /patient · POST /clinic/subscribe · GET/POST /:gateway/:id/status|cancel · POST /webhooks/:gateway

**Credenciais (todas opcionais — gateway só fica disponível se a env existir):**
ASAAS_API_KEY · MERCADOPAGO_ACCESS_TOKEN · STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET + 6 STRIPE_PRICE_*) · INFINITPAY_CLIENT_ID/SECRET/WEBHOOK_SECRET

**Webhooks (configurar nos painéis dos gateways):**
- Asaas: `/api/payments/webhooks/asaas`
- Mercado Pago: `/api/payments/webhooks/mercadopago`
- Stripe: `/api/payments/webhooks/stripe` (raw body validado)
- InfinitPay: `/api/payments/webhooks/infinitpay`

**Preços B2C (paciente, centavos):** básico 29700 · intermediário 59700 · avançado 99700 · full 149700
**Preços B2B (clínica, centavos):** starter 29700/mês ou 26700/mês anual · pro 59700/53700 · enterprise 149700/134700

## Reperfusão de Conteúdo (2026-04-17)
- **Tabela `documentos_referencia`** criada (lib/db/src/schema/documentosReferencia.ts) — armazena manifestos/arquitetura/jurídico/agentes de Dr. Claude/Manus/ChatGPT como fonte de verdade no banco. Categorias: MANIFESTO, JURIDICO, AGENTES, FORMULAS, ARQUITETURA, RAS_EVOLUCAO, IMPEDIMENTOS, RECEITA_MODELO, OUTROS.
- **Coluna `formula_blend.formula_id`** (FK → formulas, ON DELETE SET NULL, índice) — religa artéria estrutural fórmulas ↔ blend.
- **Script de ingestão**: `artifacts/api-server/src/scripts/ingest-documentos-referencia.ts` (mammoth p/ DOCX, pdf-parse@1.1.1 p/ PDF, sanitiza NUL byte). 36 documentos / 359KB ingeridos (18 Dr. Claude, 3 Dr. Replit, 15 desconhecida).
- **Endpoints REST** (`artifacts/api-server/src/routes/documentosReferencia.ts`): `GET /api/documentos-referencia` (lista, totals respeitam filtros), `GET /:codigo` (detalhe com conteúdo completo), `GET /_meta/resumo` (agregação por categoria/autoria).
- **Limitação conhecida**: `Ras_evolutivo_manus.pdf` (5.6MB) é PDF scanned-only (14 chars extraídos) — requer OCR futuro.
- **Caio**: nome agora `Dr Caio Henrique Fernandes PaduX`, senha `Padua4321X` (bcrypt atualizado).

## Anastomose Documental — Reificação Sistêmica (2026-04-18)

**Conceito**: encarnar 36 documentos dormentes em `documentos_referencia` (~360KB de texto de Dr. Claude/Manus/ChatGPT) nas tabelas vazias do banco — fim do "walking dead".

**Schema novo**: `mapeamento_documental` (lib/db/src/schema/mapeamentoDocumental.ts) — rastro auditável documento→tabela com status DORMENTE/CLASSIFICADO/EXTRAIDO/MAPEADO/ENCARNADO/VALIDADO/FALHOU.

**Motor de Reificação V1** (`scripts/src/reificacao.ts`, comando `pnpm --filter @workspace/scripts run reificacao`): classifica os 36 docs em 7 categorias e enriquece os 13 termos jurídicos com texto rebuscado baseado em CFM 1.931/2009, LGPD 13.709/2018, CDC, ANVISA RDC 67/2007, MP 2.200-2/2001 e Lei 14.063/2020.

**Resultado primeira execução** (output/reificacao/RELATORIO_REIFICACAO.md):
- 13 termos jurídicos: 3.246 → 56.482 chars (17.4x crescimento)
- Multiplicadores destaque: CFOR 51x, CIMP 49x, CEND 48x, CIMU 38x, CEIN 35x, CETE 30x
- Riscos catalogados como JSONB em `riscos_especificos` para 7 termos específicos por via
- 60 mapeamentos registrados, classificação: 21 JURIDICO_TCLE, 18 ARQUITETURA, 9 AGENTES, 6 RECEITA_TEMPLATE, 2 IMPEDIMENTOS, 2 MANIFESTO, 2 OUTROS

**Religação RACJ→Banco (Onda 2)**: `gerarRacjPdfFromBanco()` em `artifacts/api-server/src/pdf/rasxPdf.ts` substitui as 5 seções hardcoded (LGPD/CGLO/RISC/NGAR/PRIV) lendo TODOS os 13 termos ativos de `termos_juridicos` ordenados por `bloco` (JURI antes de FINA) e `id`. Resultado para Natacha: PDF passou de 5 → **42 páginas**, com 13 cadernos (LGPD, CGLO, NGAR, CFOR, CIMU, CEND, CIMP, CEIN, CETE, IMAG, AEAS, PRIV, FINA), cada termo com seu bloco de paciente, texto rebuscado de 3-7k chars, riscos JSONB catalogados em checkboxes e bloco de assinatura. Suporta placeholders `{{NOME_PACIENTE}}` e `{{CPF_PACIENTE}}` no texto do banco. Fallback para hardcoded se a query retornar vazio. Audit log marca `fonte: "termos_juridicos_db"`.

**Encarnação Receita Modelo Natacha** (`scripts/src/encarnar-natacha.ts`, doc 65): inseridas 9 doenças no catálogo (NATD-001..006 diagnosticadas + NATP-007..009 potenciais), 1 snapshot inicial em `estado_saude_paciente` para paciente_id=43 (condicoes_atuais, sintomas_ativos, medicamentos_em_uso em JSONB; níveis energia=3, dor=6, sono=2, estresse=7) e validação que as 3 fórmulas magistrais (Sono Reparador, Articular, Metabólica) já têm `componentes_formula` JSONB populados. Doc 65 marcado como ENCARNADO em `mapeamento_documental` apontando 3 tabelas-destino.

**Encarnação Motor de Exames PAWARDS (Onda 3)** (`scripts/src/encarnar-exames-pawards.ts`): reificação da "Planilha Geradora Exames Clinica V3" do Drive (TABELAS PLANILHAS EMPRESA, id `1P2QSPsGsdUPegpfZnXAUBxOh1Ahz91f8asKmcHg9DU8`) em duas tabelas:
- **`exames_base`**: UPSERT 34 exames (12 LABORATORIAL, 8 RESSONÂNCIA, 6 CARDIOLÓGICO, 3 USG, 2 TC, 2 ENDOSCOPIA, 1 OSTEOMETABÓLICO) com `hd_1/cid_1`, `hd_2/cid_2`, `hd_3/cid_3` (3 hipóteses diagnósticas + CIDs por exame) + 3 níveis de justificativa (`justificativa_objetiva` ~150c, `justificativa_narrativa` ~250c, `justificativa_robusta` ~400c). Total agora: **280 exames** com 254 já tendo as 3 justificativas.
- **`cid10`** (tabela nova, DDL inline): 66 CIDs únicos extraídos da planilha, classificados em 9 capítulos (IV Endócrinas, IX Circulatório, XIII Osteomuscular, XIV Geniturinário, XVIII Sintomas, XIX Lesões, XXI Fatores influenciam saúde, XI Digestivo, I Infecciosas) com `hd_associado_principal` cruzado.

**REGRA DOS 3 NÍVEIS DE JUSTIFICATIVA — não é aleatório, é robustez crescente:**
- `OBJETIVA` (curta) → convênio que não exige fundamentação
- `NARRATIVA` (média) → padrão de mercado, maioria dos planos
- `ROBUSTA` (longa) → plano exigente, auditoria, glosa frequente
O médico (ou o motor autônomo) escolhe o estilo em runtime via `pedidos_exame.tipo_justificativa`. O gerador `gerarPedidoExame.ts` já recebe esse parâmetro pronto.

**Onda 4 — Hidratação Semântica de Pagamentos + Tabelas Autoexplicativas + Auto-validação TS:**

1. **Tabela `niveis_justificativa`** (nova, autoexplicativa): 3 linhas (OBJETIVA/NARRATIVA/ROBUSTA) com colunas `funcao`, `porque_existe`, `quando_usar`, `exemplo_pratico`, `comprimento_alvo`. Agora o banco SE EXPLICA: qualquer rota pode dar SELECT e mostrar ao médico/admin o que cada nível significa, quando usar e um exemplo do texto gerado. Antes a regra estava só no replit.md.

2. **Tabela `provedores_pagamento`** (nova, autoexplicativa): 4 linhas (asaas/stripe/mercadopago/infinitpay) com mesma estrutura semântica + `metodos_suportados[]` + `fonte_adapter` + `status_integracao`. Documenta no banco POR QUE cada gateway existe (asaas=PIX brasileiro, stripe=internacional/SaaS B2B, mercadopago=público C/D + lotéricas, infinitpay=presencial/maquininha) e em que cenário ele é o certo.

3. **Stack COMPLETA do Claude baixada** → `attached_assets/claude_pagamentos_completo/` (11 arquivos, 64KB):
   - `types.ts` (3.9k) — interfaces `PaymentGateway`, `PaymentResult`, `WebhookEvent`, tipos `Saasplan` e `ProtocolTier`, mapas `SAAS_PRICES` e `PROTOCOL_PRICES`
   - `payment.service.ts` (3.7k) — service singleton com factory de adapters, `defaultGateway`, `isGatewayAvailable`, `chargePatient`, `subscribeClinic`, `getStatus`, `cancel`, `parseWebhook`
   - `payment.routes.ts` (7.5k) — rotas Express prontas
   - `4 adapters` (.adapter.ts) — asaas, stripe, mercadopago, **infinitpay** (este faltava nos baixados anteriores)
   - `use-payment.ts` (5.4k) — hook React pronto
   - `PaymentModal.tsx` (11.9k) — componente React de checkout com seletor de método
   - `INTEGRACAO.ts` (3.7k) — guia passo-a-passo de integração assinado pelo Claude
   - `.env.example` (2.6k) — todas as 12 envs necessárias documentadas (ASAAS_API_KEY, STRIPE_SECRET_KEY + 6 STRIPE_PRICE_*, MERCADOPAGO_ACCESS_TOKEN, INFINITPAY_CLIENT_ID/SECRET/WEBHOOK_SECRET, DEFAULT_GATEWAY, API_PUBLIC_URL)

4. **Modelo de negócio reificado em 2 tabelas autoexplicativas** (extraído dos `SAAS_PRICES` + `PROTOCOL_PRICES` do Claude):
   - **`protocolos_paciente_catalogo` (B2C)** — 4 tiers de protocolo que o paciente paga após anamnese: `basico` R$297/30d, `intermediario` R$597/90d, `avancado` R$997/180d, `full` R$1.497/365d. Cada linha tem função, porquê, quando_usar, exemplo_pratico (com paciente fictício real, ex. Natacha = Avancado) e JSONB `inclui` listando entregáveis.
   - **`planos_saas_catalogo` (B2B)** — 3 planos PADCOM que a clínica assina: `starter` R$297/mês (1 prof, 50 pac), `pro` R$597/mês (5 prof, 200 pac), `enterprise` R$1.497/mês (ilimitado, multi-unidade, white-label). Cada linha com mesmo padrão semântico + `preco_mensal_centavos`/`preco_anual_centavos`/`limite_pacientes`/`limite_profissionais`/`inclui` JSONB.

5. **Estado atual de pagamentos no código**: `routes/payments.ts` (192 linhas) já tem service multi-provedor com webhook signature + raw body. `routes/financeiro.ts` (464 linhas) já tem dashboard. Tabelas `pagamentos` (14 cols, 3 linhas) e `faturamento_mensal` (17 cols, 3 linhas) populadas. Próximo passo: mover os 4 adapters de `attached_assets/claude_pagamentos_completo/` para `artifacts/api-server/src/payments/` e refatorar `routes/payments.ts` para usar o `PaymentService` do Claude (que tem factory completa).

6. **Planilha PADCOM PAGAMENTOS FORNECEDORES** (Drive id `14ojtObTS81ey5YnNRj30o8Mo1vWX0cLOaKWdrvIWY4Y`) mapeada — 5 abas (README, Config, Fornecedores, Boletos, Dashboard). Para próxima onda: criar tabelas `fornecedores` + `boletos` (contas a pagar) + view `dashboard_fornecedores` espelhando essa planilha.

7. **Inventário de tabelas autoexplicativas (padrão PAWARDS):** o banco agora tem 4 catálogos com a triade `funcao` + `porque_existe` + `quando_usar` + `exemplo_pratico`:
   - `niveis_justificativa` (3 linhas) — OBJETIVA/NARRATIVA/ROBUSTA
   - `provedores_pagamento` (4 linhas) — asaas/stripe/mercadopago/infinitpay
   - `protocolos_paciente_catalogo` (4 linhas) — basico/intermediario/avancado/full (B2C)
   - `planos_saas_catalogo` (3 linhas) — starter/pro/enterprise (B2B)
   Esse padrão agora é regra: toda nova tabela de catálogo deve seguir essa estrutura mínima, garantindo que o banco SE EXPLIQUE sem depender de docs externas.

8. **Auto-validador de docstrings** (`scripts/src/validar-docstrings.ts`, novo): script que percorre 11 arquivos TS críticos, detecta cada `function`/`const = (...)` e classifica o JSDoc anterior em 4 estados (OK / SEM_JSDOC / JSDOC_SEM_EXEMPLO / JSDOC_SEM_PORQUE). Padrão obrigatório PAWARDS = triade **(Função, Por que existe, Exemplo prático)**. Execução: `pnpm --filter @workspace/scripts exec tsx src/validar-docstrings.ts`. **Estado inicial revelado: 99 funções, 0% com JSDoc completo, 97 sem nada — alvo crítico de documentação para próximas ondas.** As 6 funções dos scripts de encarnação (encarnar-natacha + encarnar-exames-pawards) já foram documentadas como exemplo do padrão.

**Onda GESTÃO CLÍNICA + AUDITORIA — 4 Auditores Virtuais:**
- **Migration 003**: 8 tabelas (`auditor_areas_atuacao`, `auditores`, `auditor_visibilidade_regras`, `auditor_mensagens`, `auditor_eventos_drive`, `anastomoses_pendentes`, `paciente_email_semanal`, `drive_anchors`) — todas serial PK.
- **4 auditores fictícios**: Arquio 🛡️ TÉCNICO (07h diário), Klara 🩺 CLÍNICO (18h diário, única LGPD-full), Vitrine 📈 LOCAL (seg 08h), Horizonte 🌐 GLOBAL (sex 17h).
- **28 regras de visibilidade LGPD-granular** (PACIENTES/PRESCRICOES/RAS/FINANCEIRO/EXAMES/DRIVE_EVENTOS/MARKETING × NENHUM/AGREGADO/ANONIMIZADO/IDENTIFICAVEL).
- **Hierarquia Drive**: `PAWARDS/GESTAO CLINICA/{Empresas/CNPJ, AUDITORIA/{- DASHBOARD, - ATIVA, - LEGADO}}`. Pastas criadas e ancoradas em `drive_anchors`. Planilha `AA.MM.DD - AUDITORIA` criada em `- ATIVA` com abas EVENTOS/DASHBOARD/CONFIG.
- **Rotas API** (`/api/auditores`, `/api/auditor-mensagens`, `/api/auditor-eventos`, `/api/anastomoses`): GET/POST/PATCH com botões `LI | DECIDIR | ADIAR`.
- **Template HTML e-mail semanal paciente** (A4, page-break-inside avoid, blocos RESUMO/PEDIMOS/INDICADORES).
- **18 stress tests** motor PADCON (entradas vazias, 50 ativos, REGRA 14.3 explosão FAMA, B2/A3, magistral solo, idempotência, Lilás/Verde, unicode).
- **Anastomoses críticas registradas**: `withTenantScope` global, watcher Drive Activity, scheduler 48h ATIVA→LEGADO, assinatura PAdES/ICP, posologia dinâmica PDF.
- **Nomenclatura ferro-fundida**: MAIÚSCULAS, sem acentos/hífen/underline, só espaços. Arquivos `AA.MM.DD - PALAVRA`.

**Onda 5 — Assinatura Digital + Mapa Fiscal/Gateways:**

1. **Tabela `provedores_assinatura_digital`** (nova, autoexplicativa, 6 linhas): catálogo dos 6 provedores cobertos pelo PAWARDS, com mesma tríade (`funcao` + `porque_existe` + `quando_usar` + `exemplo_pratico`) + colunas extras (`tipo_assinatura`, `evidencias_capturadas[]`, `valor_juridico`, `modelo_cobranca`):
   - `dock` — eletrônica avançada com KYC integrado (selfie + RG + biometria); para paciente Avancado/Full
   - `clicksign` — eletrônica avançada brasileira (default PADCOM); SMS/WhatsApp/email
   - `d4sign` — qualificada ICP-Brasil com A1/A3 nativo; obrigatória para receitas controladas (Portaria 344/98) e SNGPC
   - `zapsign` — eletrônica simples via WhatsApp; alto volume baixo custo (paciente Basico)
   - `autentique` — gratuita até 5 docs/mês; fallback para clinica Starter
   - `icp_a1_local` — assinatura local com certificado A1 já existente em `sub_agendas` (sem custo por documento, ideal para NFSe)

2. **Tabela `assinaturas_digitais`** (nova, registro forense central): cada linha é uma evidência jurídica reutilizável. Colunas: `paciente_id`, `usuario_id`, `documento_tipo` (TCLE/RECEITA/RAS/CONTRATO_SAAS/NFSE/PEDIDO_EXAME), `documento_id` (FK polimórfico), `documento_hash_sha256`, `provedor_codigo` FK, `status` (PENDENTE→ENVIADO→ABERTO→ASSINADO), `ip_origem` INET, `geolocalizacao` JSONB, `evidencias` JSONB ({selfie_url, biometria_score, foto_rg_url}), `manifesto_eventos` JSONB (log temporal: enviado/aberto/assinado), `pdf_assinado_url`, `certificado_subject` (CN ICP), `certificado_validade`. 5 índices (paciente, doc_polimórfico, status, provedor, hash). COMMENTs SQL semânticos nas colunas-chave.

3. **Inventário pré-existente do banco que já provê assinatura** (descoberto na varredura):
   - `termos_assinados` (data_assinatura, meio_assinatura, texto_no_momento_assinatura, versao_assinada) — JÁ EXISTIA
   - `termos_consentimento.exige_assinatura_escrita`
   - `cadernos_documentais.assinado_em`
   - `sub_agendas` com 7 colunas de certificado A1 (arquivo_url, cpf_cnpj, nome, senha, validade, requer_certificado_para_prescricao/protocolo)
   - `usuarios.pode_assinar`
   - `validacoes_cascata.assinatura_a1`
   - `padcom_competencias_regulatorias.exige_certificado_digital`
   - `rasx_audit_log.hash_documental` — hash SHA já provisionado
   - `ras.assinatura_paciente` + `ras.assinatura_profissional`
   A nova tabela `assinaturas_digitais` ATA tudo isso via `documento_tipo`+`documento_id`, sem destruir o legado.

4. **Manifesto fiscal extraído** (`PADCOM SAAS MOTOR CLINICO V14.3 — FISCAL GATEWAYS MAPA NF INCORPORADA`, Drive id `15olIby5ao0raV7vmqM7h3AfFJ8UgSSu-uA3z43hAIFM`): 12 abas, 6 críticas exportadas para `scripts/data/v14_3_fiscal_gateways_nf.json`:
   - **FISCAL MAPA OPERACIONAL** — 7 etapas do fluxo `pagamento_confirmado → emissao_NF` (entrada/processamento/saída/trava/ação_se_erro)
   - **FISCAL GATEWAYS** — tabela de tradução `(gateway, status_origem) → status_interno_padrao + gera_recibo + libera_NF + exige_revisao` para os 4 gateways
   - **FISCAL PROCEDIMENTOS** — catálogo de procedimentos com codigo_interno + categoria + texto_base_NF (ex: MC_CONS_001=consulta integrativa, MC_EXM_001=emissão de guias)
   - **FISCAL TEXTO NF** — regras condicionais para gerar texto da nota (R001..Rxx)
   - **FISCAL TESTES SEMANTICOS** — bateria de testes esperados para validar o motor fiscal
   - **FISCAL LEGENDA HUMANA** — dicionário humano de cada conceito
   Próxima onda: encarnar essas 6 abas em tabelas (`fiscal_mapa_etapas`, `fiscal_gateways_mapa`, `fiscal_procedimentos`, `fiscal_regras_texto_nf`).

5. **Manifesto SAAS Motor Clínico** (`DOCUMENTO MANIFESTO SAAS MOTOR CLINICO`, Drive id `19051p4CvLU8S2_nQSvZihU4LGjG8xy15KtuiOsAP1v0`) baixado em `attached_assets/MANIFESTO_SAAS_MOTOR_CLINICO.txt` (10.7KB). Documento de arquitetura assinado pelo Caio definindo: posicionamento institucional (Dr. Caio Henrique Fernandes Pádua / Instituto Pádua / Medicina Integrativa de Alta Performance), assinatura fixa "Developed and Supervised by PADCON", design editorial premium (preto profundo / off-white / dourado), regras de PDF documental + evolutivo, fluxo CAVALO ENTRADA (autônomo/operacional), e regras de bloqueio fiscal (NF só após pagamento concluído + assinatura aprovada).

6. **Inventário consolidado de tabelas autoexplicativas (5 catálogos PAWARDS):**
   - `niveis_justificativa` (3) — justificativa de exame
   - `provedores_pagamento` (4) — gateways
   - `protocolos_paciente_catalogo` (4) — B2C tiers
   - `planos_saas_catalogo` (3) — B2B planos
   - `provedores_assinatura_digital` (6) — Dock/Clicksign/D4Sign/ZapSign/Autentique/ICP-A1
   Total: **20 linhas semânticas** que documentam o produto inteiro só com SQL.

**Onda 6 — Módulo Assinatura Digital PAU ARTS (manifesto Caio integrado):**

Manifesto técnico oficial baixado: `attached_assets/sheet_assinatura/MANIFESTO_assinatura_digital.txt` (13.7KB, 13 seções). Drive id `15syeUGNZHZOPCCvM3FTcLtcfdZyS9JQh`. Decisão arquitetural do Caio: **Clicksign (principal) + ZapSign (failover)** com toggle administrativo, NÃO Dock. Hidratação semântica completa em **12 tabelas** + COMMENTs SQL em todas:

1. **`provedores_assinatura_digital` (6 linhas)** — adicionadas colunas `is_principal`, `is_failover`, `prioridade`, `recomendado_pelo_manifesto`. Clicksign=#1 principal, ZapSign=#2 failover, demais (Dock/D4Sign/Autentique/icp_a1_local) catalogados para casos específicos.
2. **`assinaturas_digitais`** — registro forense central já existente (Onda 5).
3. **`assinatura_toggles_admin` (1 linha singleton)** — *Seção 5 do manifesto*. Define provedor_principal_codigo, provedor_failover_codigo, failover_automatico, modo_testemunhas (ALEATORIO/PAR_FIXO/MANUAL), par_fixo_id FK, enviar_por_email, enviar_por_whatsapp, arquivar_no_drive, drive_pasta_raiz_id, nomenclatura_pdf_padrao = `[YYYY-MM-DD] [TIPO_DOC] [NOME_PACIENTE] [PROVEDOR] [STATUS].pdf`. Próprias tríades semânticas em colunas DEFAULT.
4. **`assinatura_testemunhas` (4 seed)** — *Seção 6*. CRUD interno (nome, cpf, cargo, email, ativa, par_preferencial, ordem_assinatura). Seed: Maria Alves Costa + João Pereira Santos (PAR A) + Ana Beatriz Mendes + Carlos Eduardo Lima (PAR B).
5. **`assinatura_pares_testemunhas` (2 seed)** — PAR INSTITUCIONAL A (uso_padrao=true) e PAR INSTITUCIONAL B.
6. **`assinatura_templates` (5 seed)** — *Seção 8 hidratação*. TCLE_PADRAO_V1, CONSENTIMENTO_PROCEDIMENTO_V1, CONTRATO_TRATAMENTO_V1, ORCAMENTO_FORMAL_V1, ADITIVO_CONTRATUAL_V1. Cada um com `conteudo_html` + `placeholders[]` (`{{NOME_PACIENTE}}`, `{{CPF_PACIENTE}}`, `{{TESTEMUNHA_1_NOME}}`, etc.) + flags `exige_medico/testemunhas/clinica` + `pasta_drive_destino`.
7. **`assinatura_solicitacoes`** — *Seção 9 document_requests*. Cada solicitação = 1 documento. Status RASCUNHO→HIDRATADO→ENVIADO→PARCIAL→CONCLUIDO. Guarda `dados_hidratacao` JSONB, URLs PDF original/assinado, hashes SHA-256, par_testemunhas_id, signatarios_snapshot JSONB, canais_distribuir TEXT[].
8. **`assinatura_signatarios`** — *Seção 9 document_signers*. Papel ENUM (PACIENTE/MEDICO/CLINICA/TESTEMUNHA/RESPONSAVEL_LEGAL), ordem, status individual, link_assinatura, ip_assinatura INET, evidencias JSONB.
9. **`assinatura_webhook_eventos`** — *Seção 12 boas práticas*. UNIQUE(provedor, event_id) garante idempotência. Campos `signature_header`, `signature_valida`, `processado`, `erro_processamento`. Índice parcial `WHERE processado=false` para fila pendente.
10. **`assinatura_notificacoes`** — *Seção 11 tripla redundância*. Canal (EMAIL/WHATSAPP/DRIVE) × momento (ENVIO_INICIAL/POS_ASSINATURA/LEMBRETE) × tentativas + retry. Status FINALIZADO só quando os 3 canais ativos confirmam.
11. **`assinatura_textos_institucionais` (4 seed)** — *Seção 10 tom estratégico*. Textos exatos aprovados pelo Caio (sutil/nobre/elegante): EMAIL_ENVIO_INICIAL ("INSTITUTO PADUA | DOCUMENTO DE ATENDIMENTO"), WHATSAPP_ENVIO_INICIAL, WHATSAPP_POS_ASSINATURA, MICROTEXTO_TELA_ASSINATURA. Regra: nunca reescrever textos pelo agente, sempre puxar daqui.
12. **`assinatura_drive_estrutura`** — *Seção 2*. Espelha estrutura `/CADASTRO /TERMOS /JURIDICO /ORCAMENTOS /CONTRATOS /ASSINADOS /LOGS` por paciente, guarda os IDs reais do Drive para roteamento direto.

**Inventário consolidado (5 ondas, 12 tabelas autoexplicativas + 12 COMMENTs SQL):**
- Catálogos: niveis_justificativa(3), provedores_pagamento(4), protocolos_paciente_catalogo(4), planos_saas_catalogo(3), provedores_assinatura_digital(6) = 20 linhas
- Módulo Assinatura: assinaturas_digitais, assinatura_toggles_admin, assinatura_testemunhas(4), assinatura_pares_testemunhas(2), assinatura_templates(5), assinatura_solicitacoes, assinatura_signatarios, assinatura_webhook_eventos, assinatura_notificacoes, assinatura_textos_institucionais(4), assinatura_drive_estrutura = 22 linhas seed adicionais

**Onda 6.1 — OSMOSE TÉCNICA implementada e testada (Caio: "deixa o texto pra depois"):**

A camada técnica completa subiu sem depender dos textos jurídicos finais — quando o Caio aprovar TCLE/contrato real, basta `UPDATE assinatura_templates SET conteudo_html = ...` sem tocar em código.

**5 arquivos novos** em `artifacts/api-server/src/`:
- `lib/assinatura/types.ts` — tipos centrais + interface `SignatureProviderAdapter` (manifesto §9)
- `lib/assinatura/adapters.ts` — `ClicksignAdapter` + `ZapsignAdapter` extends `BaseMockableAdapter`. Quando token ausente operam em **MODO_MOCK** (envelope sintético `MOCK-CLICKSIGN-uuid`), preservando toda a osmose. Trocar para fetch real é instantâneo: definir `CLICKSIGN_TOKEN` ou `ZAPSIGN_TOKEN`.
- `lib/assinatura/service.ts` — `AssinaturaService` orquestra: (1) carrega toggles, (2) hidrata template substituindo `{{NOME_PACIENTE}}` etc., (3) escolhe testemunhas por modo (ALEATORIO/PAR_FIXO), (4) tenta provedor principal → failover automático em caso de falha, (5) gera SHA-256 do conteúdo, (6) persiste solicitação + signatários + notificações pendentes (EMAIL+WHATSAPP), (7) retorna links de assinatura e nome PDF padronizado. `consultarStatus()` faz pull live no provedor + atualiza banco. `receberWebhook()` valida HMAC, garante idempotência via `INSERT ... ON CONFLICT (provedor, event_id) DO NOTHING`, atualiza solicitação para CONCLUIDO + grava `hash_assinado`, dispara notificações pós-assinatura (EMAIL+WHATSAPP+DRIVE).
- `routes/assinaturas.ts` — 6 endpoints REST: `GET /api/assinaturas/config`, `GET /api/assinaturas/templates`, `GET /api/assinaturas/testemunhas`, `PATCH /api/assinaturas/toggles`, `POST /api/assinaturas/enviar`, `GET /api/assinaturas/:id`, `GET /api/assinaturas` (lista com filtros).
- `routes/assinaturasWebhook.ts` — `POST /api/webhooks/assinatura/{clicksign,zapsign}` com raw body (configurado em `app.ts` ANTES do `express.json`, mesmo padrão do Stripe).

**Edits cirúrgicos:** `app.ts` (raw body para 2 paths webhook); `routes/index.ts` (registra 2 routers).

**Validação ponta-a-ponta executada:**
- ✅ TCLE enviado → solicitação 3, envelope mock, signatário paciente, link gerado, nome PDF padronizado `[2026-04-18] [TCLE] [PATRICIA OLIVEIRA ROCHA] [CLICKSIGN] [PENDENTE_ASSINATURA].pdf`
- ✅ Contrato com testemunhas obrigatórias gerou 3 signatários (paciente + 2 testemunhas do PAR INSTITUCIONAL A)
- ✅ Idempotência: mesmo `event_id` 2x retorna `{duplicado:true, eventoId:0}` sem reinserir
- ✅ Webhook `auto_close` (Clicksign) atualizou solicitação ENVIADO→CONCLUIDO, gravou `hash_assinado`, vinculou `solicitacao_id` ao evento e enfileirou as 3 notificações pós-assinatura (EMAIL+WHATSAPP+DRIVE)
- ✅ Failover funciona: se principal lançar, tenta failover automaticamente e marca `failoverAcionado=true`

**Onda 6.2 — KAIZEN JURÍDICO (2 manifestos novos do Caio: IMPLANTACAO ASSINATURA DIGITAL 1+2):**

Caio orientado pelo Dr. Chat: "reificar texto no corpo é bom MAS cuidado em especificar demais — pode prejudicar juridicamente". Os manifestos novos definem a **regra jurídica absoluta**: documentos do médico devem ser GENÉRICOS ("HONORÁRIOS MÉDICOS / serviços especializados"), nunca nomear medicamento, dose, substância ou protocolo, para evitar vínculo com venda de substâncias (proteção CRM/fiscal/jurídica).

**4 entregáveis novos:**

1. **`juridico_termos_bloqueados`** — catálogo com 32 termos seed em 4 categorias (MEDICAMENTO 10 / SUBSTANCIA_QUIMICA 14 / DOSAGEM 3 regex / PROTOCOLO_ESPECIFICO 5). Cobre fitoterapico, manipulado, capsula, cannabidiol, CBD, THC, naltrexona, cetamina, ozônio, regex `\d+\s*(mg|mcg|ml|g|UI|gotas?)\b`, "protocolo de", "posologia", etc.

2. **`notas_fiscais_emitidas`** + função TS `buildInvoiceDescription(patient, invoice)` — texto **EXATO** das seções 3 e 5 dos manifestos: `HONORARIOS MEDICOS / Paciente: X / CPF: Y / Referente a prestacao de servicos medicos especializados / Atendimento clinico individualizado / Consulta e acompanhamento evolutivo / Procedimentos terapeuticos realizados conforme avaliacao medica / Valores previamente acordados / Data: Z`. Persiste com `hash_descricao` SHA-256 imutável.

3. **TRIPLA DEFESA contra termo proibido:**
   - **Camada 1 — TS:** `lib/juridico/sanitizer.ts` (`analisarTexto` + `exigirTextoLimpo` que lança erro)
   - **Camada 2 — Trigger SQL `trg_assin_templates_validar`:** valida `assinatura_templates.conteudo_html` no INSERT/UPDATE → testado, bloqueia `cannabidiol`
   - **Camada 3 — Trigger SQL `trg_nfe_validar`:** valida `notas_fiscais_emitidas.descricao_blindada` → testado, bloqueia `naltrexona`

4. **Templates BLINDADOS** — todos os 5 templates (TCLE, CONSENTIMENTO, CONTRATO, ORÇAMENTO, ADITIVO) reescritos sem `{{PROCEDIMENTO}}`, `{{RISCOS}}`, `{{VALOR_ORCAMENTO}}` (placeholders perigosos removidos). Textos institucionais (email/whatsapp envio + pós-assinatura + 2 novos para NF) atualizados para versões NEUTRAS curtas das seções 6/7/8/9 dos manifestos novos.

**4 endpoints novos:**
- `GET  /api/juridico/termos-bloqueados` — catálogo para painel admin
- `POST /api/juridico/analisar-texto` — diagnóstico (qualquer string)
- `POST /api/notas-fiscais/preview` — pre-visualização de NF antes de emitir
- `POST /api/notas-fiscais/emitir` — emite NF blindada com tripla defesa
- `GET  /api/notas-fiscais` — lista filtrada

**Validação ponta-a-ponta da Onda 6.2:**
- ✅ Texto sujo `"Tratamento com cannabidiol 200mg em capsula sublingual"` → 5 violações detectadas (capsula, sublingual, cannabidiol, regex dosagem, "tratamento com")
- ✅ NF preview paciente 51 → texto blindado correto, validação `ok:true`
- ✅ NF id=2 emitida com hash `702dc4b14371…`
- ✅ TCLE blindado V1 enviado → solicitação 4, status ENVIADO, envelope mock, signatário com link
- ✅ Trigger SQL bloqueia UPDATE direto no banco (defesa em profundidade)

**Onda 6.3 — HIDRATAÇÃO SEMÂNTICA + CATEGORIAS DE PROCEDIMENTO + CRUD ADMIN (3 manifestos novos: IMPLANTACAO 3 + PACOTE_TEXTOS + core_module.ts):**

Caio (carta-branca, "não me valide nada"): "NF tem que ser **RELATIVA** aos procedimentos, não genérica igual pra todo mundo. Tom de empatia, neuromarketing, convite à melhoria de vida (assinatura da casa própria)."

**Princípio neurolinguístico (IMPLANTACAO 3 §2):** "O paciente não assina um documento. Ele formaliza uma decisão de evolução pessoal." Comunicação deve **acolher / simplificar / gerar segurança / convidar suavemente / finalizar com confiança.**

**1. Tabela `procedimento_categorias_nf`** com 7 categorias seed cobrindo todo o leque do consultório:
| Código | Frase NF (exemplo) |
|---|---|
| CONSULTA | "Atendimento clinico com avaliacao individualizada e escuta integrativa…" |
| EXAME | "Conducao de processo diagnostico individualizado…" |
| ACOMPANHAMENTO | "Conducao de plano terapeutico continuo e progressivo…" |
| PROCEDIMENTO_ENDOVENOSO | "Procedimento assistido com monitoramento clinico em ambiente controlado…" |
| PROCEDIMENTO_SUBCUTANEO | "Aplicacao terapeutica conforme indicacao clinica individualizada…" |
| PROCEDIMENTO_IMPLANTE | "Procedimento clinico ambulatorial conduzido em ambiente controlado…" |
| PROGRAMA_LONGITUDINAL | "Conducao de programa longitudinal de cuidado integrativo…" |

Cada categoria tem 3 textos (NF + acolhimento pós-assinatura + convite inicial), todos passando por sanitizer + triggers SQL. Padrão PAWARDS mantido (`porque_existe`, `quando_usar`, `exemplo_pratico`).

**2. `buildInvoiceDescription(patient, invoice, categoria)` V2** — texto base do manifesto IMPLANTACAO 3 §3 com placeholder `{{FRASE_CATEGORIA}}` interpolado. Sem categoria, cai no fallback genérico.

**3. CRUD admin completo** (`routes/assinaturaCRUD.ts`, 12 endpoints):
- `GET/PATCH/POST /admin/testemunhas` — 4 testemunhas totalmente editáveis (nome, cpf, cargo, email, telefone, par, ordem)
- `GET/PATCH /admin/textos/:codigo` — 6 textos institucionais (email/whatsapp envio + pós + NF)
- `PATCH /admin/templates/:codigo` — TCLE/contrato/orçamento etc.
- `GET/PATCH /admin/categorias-procedimento/:codigo` — frases NF/acolhimento/convite
- `POST/PATCH /admin/termos-bloqueados` — gerência do catálogo jurídico

**4. Tom neuromarketing** nos textos institucionais (atualizados conforme IMPLANTACAO 3 §6/7/8):
- E-mail envio: "Estamos avancando em mais uma etapa do seu acompanhamento"
- WhatsApp envio: "Estamos organizando uma etapa importante… Seguimos com voce."
- WhatsApp pós: "Encaminhamos uma copia para sua organizacao. Seguimos juntos."

**5. NF agora carrega `categoria_codigo`** (FK para o catálogo). 4 NFs emitidas no teste com categorias persistidas (id 10 CONSULTA, 11 EXAME, 12 IMPLANTE).

**6. Code review pós-Onda 6.3 fechou 6 findings (1 CRITICAL + 5 HIGH):**
- ✅ **CRITICAL — auth /admin/***: criado `middleware/adminAuth.ts` fail-closed (header `X-Admin-Token` validado contra secret `ADMIN_TOKEN`). 401 sem token, 503 se secret ausente.
- ✅ **HIGH — SQL injection PATCH testemunhas**: removido `sql.raw` com escape manual; agora usa `sql` tagged template com `COALESCE($x::tipo, coluna)` por campo.
- ✅ **HIGH — defesa em profundidade**: PATCH testemunhas/templates passa `nome_completo`/`cargo`/`observacoes`/`titulo` pelo `exigirTextoLimpo`. Triggers SQL existem (`trg_assin_templates_validar`, `trg_nfe_validar`).
- ✅ **HIGH — cache categorias NF**: TTL 60s em `notaFiscal.ts` (Map<codigo, CategoriaNF>); invalidado por PATCH em categoria.
- ✅ **HIGH — robustez CRUD**: PATCH agora retorna 404 quando registro não existe; 400 quando body vazio.
- ✅ **HIGH — compliance fiscal**: `frase_nota_fiscal` da CONSULTA reescrita removendo "escuta integrativa" (subjetivo); tom emocional fica restrito a `frase_acolhimento`/`frase_convite`.
- ✅ Secret `ADMIN_TOKEN` configurado em shared.

**Validação ponta-a-ponta da Onda 6.3:**
- ✅ 7 categorias listadas, todas validadas pelo sanitizer (NOTICE OK em cada uma)
- ✅ Preview ENDOVENOSO/SUBCUTÂNEO/PROGRAMA com frases distintas e adequadas
- ✅ Emissão de NF para CONSULTA/EXAME/IMPLANTE persiste com categoria + hash
- ✅ PATCH testemunha 3 mudou nome+cargo
- ✅ PATCH texto institucional aceita texto limpo, **bloqueia "200mg cannabidiol" com erro JSON 400** legível
- ✅ PATCH categoria altera frase NF, próxima emissão usa o novo texto
- ✅ Triple-defense intacta: sanitizer TS + triggers SQL `trg_assin_templates_validar` + `trg_nfe_validar`

**Pacote de manifestos baixado:** `attached_assets/sheet_assinatura/` agora contém os 4 manifestos do Caio (1, 2, 3, 4) + PACOTE_TEXTOS.docx + core_module.ts extraídos do ZIP IMPLANTACAO 4.

**Worker de envio real (ainda PENDING):** as notificações são gravadas em `assinatura_notificacoes` com status `PENDENTE`. Falta um cron/worker que liste pendentes, dispare via Gmail integration + WhatsApp (futuro Z-API/Twilio) + Google Drive upload, e marque `ENVIADO/ENTREGUE/FALHA`. A osmose já enfileira tudo corretamente, só falta o consumidor.

**Próxima onda — implementação:** [SUPERSEDED] feita acima.

**Arquitetura proposta — Motor Gerador de Exames Autônomo (próxima onda):**
Hoje o pedido é gerado pelo médico no consultório. O modelo PAWARDS prevê 3 canais de entrada para o paciente solicitar exame isolado:
1. **WhatsApp** (bot inbound) → triagem por questionário rápido → motor sugere painel ou paciente escolhe da lista
2. **Site responsivo** (URL pública) → catálogo navegável de exames com preços
3. **Rede social** (link patrocinado) → mesma jornada do site
Fluxo proposto:
`Paciente identifica → Vincula a sessão zze (ou cria sessão "exame_isolado") → Questionário motor (anamnese curta) → Motor sugere painel OU paciente seleciona avulso → Preview com 3 níveis de justificativa para escolha → Cobrança via Asaas (adapter já em attached_assets) → Geração assíncrona dos 2 PDFs (PEDIDO + JUSTIFICATIVA) → Entrega WhatsApp/Email`
Tabelas necessárias para implementar (próxima onda): `solicitacoes_exame_paciente` (canal_origem, sessao_id, valor, status_pagamento, tipo_justificativa_escolhida), `exame_precos` (codigo_exame, preco_particular, preco_convenio_X), `triagem_questionario_exame` (perguntas → mapeamento para sugestão de exames). Os 4 painéis-modelo da planilha (CHECK-UP METABÓLICO, VITAMÍNICO, CARDIOLÓGICO, COLUNA LOMBAR) viram seeds de `pacotes_exame`.

## REGRA DE OURO — Varredura Obrigatória Antes de Criar

**PROIBIDO** criar função, template, texto jurídico ou tabela sem antes varrer:
1. `artifacts/api-server/src/pdf/*.ts` — 10+ geradores PDF prontos (gerarReceitaPdf, gerarLaudoExamePdf, gerarRacjPdf, etc.)
2. Tabelas-mestre populadas: `agentes_motor_escrita` (100), `mapa_bloco_exame` (409), `regras_motor`, `padcom_competencias_regulatorias`, `termos_juridicos`, `termos_consentimento`
3. `documentos_referencia` (36 docs, ~360KB) — fonte de verdade arquitetural/jurídica/agentes
4. `mapeamento_documental` — confirmar se a tabela-destino já foi reificada

Antes de gerar texto novo: rode `SELECT * FROM mapeamento_documental WHERE tabela_destino='X'` e verifique se já há fonte documental classificada.

---

## Onda 7.5 — RESSURREIÇÃO DO WD DA SECRETÁRIA (Resgate Laboratorial Integrativo)

**Origem:** Caio descreveu a dor manual da secretária — recebia exame, renomeava, planilhava cada analito, tinha que saber a unidade de cada laboratório (Fleury usa ng/dL; outro usa nmol/L), converter, dividir a faixa em terços, e LEMBRAR para CADA exame qual terço era "excelente" (testosterona = superior; SHBG = inferior; potássio = médio). Mais pintar célula da cor certa por classificação. Coitadinha. **WD ressuscitado.**

**3 tabelas novas:**
- `analitos_catalogo` (14 analitos seed: testosterona, SHBG, vit D, zinco, potássio, ferritina, TSH, T4 livre, glicose, insulina, PCR-us, homocisteína, magnésio, B12) com coluna `terco_excelente` (SUPERIOR/INFERIOR/MEDIO)
- `analitos_referencia_laboratorio` (24 ranges seed: Fleury, Salomão Zoppi, Hermes Pardini, GENERICO, separados por sexo/idade)
- `unidades_conversao` (11 conversões: ng/mL↔ng/dL, mg/dL↔mg/L, nmol/L↔ng/dL com fator específico para testosterona, etc.)

**Motor `lib/laboratorio/motorClassificacaoIntegrativa.ts`:**
1. Recebe `{analitoCodigo, valor, unidade, laboratorio?, sexo?, idade?}`
2. Converte unidade para padrão da clínica
3. Busca referência (lab específico → GENERICO; sexo específico → AMBOS)
4. Divide faixa min-max em 3 terços
5. Posiciona valor (ABAIXO / INFERIOR / MEDIO / SUPERIOR / ACIMA)
6. Aplica regra integrativa do analito → classifica em **CRITICO/ALERTA/ACEITAVEL/EXCELENTE/AVALIAR**
7. Atribui **cor por classificação** (não por posição): VERMELHO/AMARELO/LARANJA/VERDE/AZUL — referência João Hipocondríaco (paciente referência fictício)

**6 endpoints REST testados ponta-a-ponta:**
- `GET /api/laboratorio/analitos`
- `GET /api/laboratorio/analitos/:codigo/referencias`
- `POST /api/laboratorio/classificar` (1 analito)
- `POST /api/laboratorio/classificar-lote`
- `POST /api/laboratorio/exames/registrar` (persiste em `exames_evolucao`)
- `GET /api/laboratorio/pacientes/:id/historico`
- `GET /api/inventario-wd` (ressurreição autodeclarada)

**Casos validados:**
- Testosterona 750 ng/dL Fleury homem 40a → SUPERIOR / EXCELENTE / VERDE ✅
- SHBG 60 nmol/L (acima máx, INVERTIDO) → ACIMA / **CRITICO** / VERMELHO ✅
- SHBG 18 nmol/L (terço inferior, INVERTIDO) → INFERIOR / **EXCELENTE** / VERDE ✅
- Vit D 18 ng/mL → ABAIXO / CRITICO / VERMELHO ✅
- Vit D 85 ng/mL → SUPERIOR / EXCELENTE / VERDE ✅
- Potássio 4.3 mEq/L (terço médio = excelente) → MEDIO / EXCELENTE / VERDE ✅
- Conversão Testosterona 26 nmol/L → 749.27 ng/dL → EXCELENTE (bug fator invertido encontrado e corrigido)

**Inventário WD operacionais (autoavaliação):**
Tabela `wd_operacionais_inventario` com 16 WDs catalogados. **10 ressuscitados (62.5%) / 6 pendentes:**
- ✅ WD01 Provisionar pasta Drive · ✅ WD02 Renomear NF · ✅ WD03 Assinatura digital · ✅ WD04 Notificar etapa
- ✅ WD05 Cobrar parcela · ✅ WD06 Lembrar retorno · ✅ WD07 Reativar paciente em risco
- ✅ WD08 Avisar renovação · ✅ WD09 Calcular comissão · ✅ WD10 **Receber exame e classificar (esta onda)**
- ⏳ WD11 Gerar receita · ⏳ WD12 Materializar 507 sessões · ⏳ WD13 Persistir RAS evolutivo
- ⏳ WD14 Worker assinatura notif · ⏳ WD15 Encarnar FISCAL · ⏳ WD16 OCR automático de PDF de exame

## PARMASUPRA-TSUNAMI WAVE-5 (Dr. Claude audit fix · 2026-04-22)
Auditoria ao vivo do Dr. Claude (Sonnet 4.6) sobre os 5 arquivos da TSUNAMI aprovou
4/5 como produção-ready (`requireMasterEstrito.ts`, `cobrancasAuto.ts`,
`adminAnalytics.ts`, `permissoesDelegadas.ts`). O único arquivo com gaps reais foi
`routes/substancias.ts`, com 3 problemas corrigidos nesta wave:

1. **PATCH `/substancias/:id` — `controlado` e `tipoReceitaAnvisaCodigo` ausentes
   do `allowedFields`**: impedia atualizar a classificação ANVISA quando a lei muda
   (ex.: Zolpidem virar B1). Adicionados ambos + `farmaciaPadrao` à whitelist única.
2. **PUT `/substancias/:id` — mass assignment via `req.body` direto**: qualquer
   usuário autenticado podia sobrescrever `id`, `criadoEm`, etc. Substituído por
   `filtrarCamposPermitidos(body)` usando a mesma whitelist do PATCH.
3. **DELETE `/substancias/:id` — hard delete deixava prescrições históricas
   órfãs**: convertido para soft delete via `deletedAt = now()`. GET / GET-:id /
   PUT / PATCH passaram a filtrar `isNull(deletedAt)`. Listagem aceita
   `?incluir_removidas=true` para auditoria.

**Migration 013** (`db/seeds/013_substancias_soft_delete.sql`) adiciona
`deleted_at timestamptz NULL` + índice parcial `WHERE deleted_at IS NULL`,
aplicado via `psql` (idempotente, aditivo, **sem `db:push`**, sem ALTER PK).
Schema Drizzle (`lib/db/src/schema/substancias.ts`) ganhou os 4 campos
(`controlado`, `tipoReceitaAnvisaCodigo`, `farmaciaPadrao`, `deletedAt`) que
existiam fisicamente na tabela mas estavam fora do mapping (drift fechado).

**Smoke E2E 10/10 verde**: POST cria, PATCH altera `controlado` e
`tipoReceitaAnvisaCodigo=B1`, PUT bloqueia mass assignment (id permanece 19
mesmo enviando `id:99999` no body), DELETE retorna `deletedAt` timestamp,
GET-:id pós-delete retorna 404, DELETE repetido é idempotente (404), listagem
padrão oculta a deletada, `?incluir_removidas=true` mostra, e psql confirma
linha física com `deleted_at IS NOT NULL`.

## PARMASUPRA-FECHAMENTO (Onda 22/abr/2026 · escolha "mais difícil e eficiente")

Fecha 100% dos débitos confessos da TSUNAMI + ressuscita WD14 numa onda só.
3 commits atômicos pushados em `feat/dominio-pawards` (`bed355c` → `8354fff` → `3029b24`).

### F1 — `routes/substancias.ts` híbrido Dr. Claude + extras locais
Substituído integralmente pela versão canônica que o Dr. Claude gerou na auditoria
de 22/abr (`attached_assets/substancias_1776845568663.ts`). Mantidos 2 extras da
versão WAVE-5: `?incluir_removidas=true` (auditoria) e `farmaciaPadrao` na whitelist.
Resposta do DELETE agora retorna `{message, id, deletedAt}`. Smoke ciclo
DELETE→deletedAt confirmado no DB.

### F2 — `routes/relatoriosPdf.ts` D1 comparativo-2unidades real (era 501)
`consultaComparativo2Unidades(uA, uB, periodoA, periodoB)` agrega
`analytics_clinica_mes` em 6 métricas (faturamento, comissão, receitas, pacientes
únicos, blends distintos, ticket médio). `renderComparativo2Unidades` desenha 2
colunas lado a lado, vencedor por variação % destacado em gold + placar final.
Smoke: `unidade_a=1&unidade_b=8&periodo_a=2026-03&periodo_b=2026-04` → 200, 6150
bytes, magic `%PDF`.

### F3 — `routes/relatoriosPdf.ts` D2 drill-paciente real (era 501)
`consultaDrillPaciente(pacienteId, analito)` reusa lógica T8 (paciente vs média
unidade vs média rede) agregada YYYY-MM. `renderDrillPaciente` desenha 3 blocos
Mike Tyson coloridos (delta paciente, vs unidade, vs rede) + tabela mês a mês com
3 séries alinhadas. Smoke: `paciente_id=1&analito=Vitamina D 25(OH)` → 200, 4964
bytes, magic `%PDF`.

### F4 — `lib/recorrencia/notifAssinatura.ts` worker WD14 ressuscitado
A fila `assinatura_notificacoes` ficou com 11 PENDENTE sem consumer desde T7.
Worker novo com tick de 5 min, batch 50, retry exponencial (10min → 1h → FALHA
permanente em 3 tentativas). Por canal:
- **EMAIL**: gate `process.env.GOOGLE_MAIL_REAL_OK`; sem credencial real, marca
  FALHA estruturada `google_mail_pendente_credenciais_real` e agenda retry.
- **WHATSAPP**: FALHA estruturada `whatsapp_provedor_pendente`.
- **DRIVE**: FALHA estruturada `drive_upload_pendente`.

Endpoint admin `POST /api/admin/notif-assinatura/tick` (requireMasterEstrito) para
smoke manual. Plug em `index.ts` ao lado de `iniciarWorkerCobrancaMensal`. Smoke:
o tick AUTO 20s pós-restart processou as 11/11 com `tentativas=1`, todas com
`erro` estruturado e `proxima_tentativa_em = +10min` (retry agendado).

### Handoff Dr. Claude (URLs raw branch `feat/dominio-pawards`)
- substancias.ts:           https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/substancias.ts
- relatoriosPdf.ts:         https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/relatoriosPdf.ts
- notifAssinatura.ts (lib): https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/recorrencia/notifAssinatura.ts
- notifAssinatura.ts (rota):https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/notifAssinatura.ts
- index.ts (plug worker):   https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/index.ts
