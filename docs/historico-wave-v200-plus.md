# Histórico — Waves Cadastro Pádua, V25, V46, V72, V232, V256, V479-V483

> Movido do `replit.md` em 18/mai/2026 pra manter o overview principal enxuto.
> Estas waves estão fechadas; consultar aqui pra contexto histórico.

## Wave Cadastro Pádua — 4.278 pacientes (13/mai/2026)

Importação completa do Instituto Pádua (`unidade_id=15`) a partir da
planilha Google Sheets (`SHEET_ID=1uR0jIx1rIQE3346EUQZhy52gDkrtslH91NGeIPF7QxY`,
tab "Cadastro Mestre"). Estrutura nova de Drive hierárquica + código semântico
interno + nomenclatura padrão de arquivos.

### Resultado
- **3.872 inseridos + 20 atualizados + 386 pulados sem telefone, 0 erros**
- 3.847 pacientes Pádua com `codigo_semantico` (ex: `PADU-AGRA-ABHI-MASC-1979-9801`)
- Coverage: 2.600 com CPF · 3.847 com tel · 3.792 com WhatsApp · 3.222 com data nascimento
- Idempotência confirmada via `(unidade_id, codigo_externo)` → re-run = `UPDATE` no-op
- Invariantes Wave 9 PRESERVADAS: 8.728 receitas, R$ 2.736.536,10 comissão (potencial estimado), 5 triggers ATIVOS

### Migration 040 (`040_pacientes_codigo_semantico.sql`, psql aditivo)
Adiciona em `pacientes`: `codigo_externo`, `codigo_semantico`,
`drive_subpastas jsonb`, `telefone_fixo`, `whatsapp`. Cria tabelas
`arquivos_paciente` (registry de arquivos no Drive) e `importacoes_lote`
(rastreabilidade de batches).

### Libs novas
- `lib/format/canonico.ts` — canonicaliza CPF/tel/email/CEP
- `lib/arquivos/codigoSemantico.ts` — gera `SLUGCLINICA-SOBR-NOME-SEXO-AAAA-DDDD`
- `lib/arquivos/catalogo.ts` — 7 categorias macro
- `lib/arquivos/registry.ts` — persiste arquivo no DB + Drive
- `lib/arquivos/drive.ts` — estrutura PAWARDS > GESTAO CLINICA > EMPRESAS >
  [CLINICA] > CLIENTES [CLINICA] > [paciente] > [categoria] (lazy-create)

### Migration 042 — auto-completar dados cadastrais
5 funções PL/pgSQL (`fn_padcon_calcular_idade`, `fn_padcon_classificar_faixa_etaria`,
`fn_padcon_inferir_sexo_por_nome`, `fn_padcon_inferir_estado_civil_por_idade`,
`fn_padcon_inferir_profissao_padrao`) + trigger `trg_padcon_completar_dados`
BEFORE INSERT/UPDATE em `pacientes`. POST `/pacientes` retorna
`avisoCadastroIncompleto` quando faltam campos críticos.

## Wave V25 PADCOM Demo — Luciano Carvalho (13/mai/2026)

Peça de demonstração executiva: planilha Google Sheets V25 PADCOM
populada com dados clinicamente plausíveis (claramente marcada
"DEMONSTRAÇÃO") para o paciente Luciano Carvalho Torraga Dos Santos
(id=4587, masc, 38 anos, código `PADU SANT LUCI MASC 1988 6873`).

### Estrutura V25 PADCOM
14 abas: CADASTRO, RESUMO EXECUTIVO, CARDIOVASCULAR (6 exames),
METABÓLICO (7), VITAMINAS_MINERAIS (6), AUTOIMUNE (4), ONCOLÓGICO (3),
NEURO_PSI (5), GASTRO_HEPÁTICO (5), RENAL (5), MUSCULO_ESQUELÉTICO (5),
BLENDS (20 slots × 5 ativos), CIRURGIAS, PARÂMETROS.

### Classificação por terços (cores institucionais)
- PREOCUPANTE / ALERTA → `#7d1d2e`
- BAIXO / ALTO → `#d97a3c`
- MEDIANO → `#e8c547`
- OTIMO → `#3a7d44`

### Lib + Script
- `artifacts/api-server/src/lib/sheets/fichaV25Padcom.ts`
- `scripts/src/gerar-v25-luciano.ts` — CLI `pnpm --filter @workspace/scripts run gerar-v25-luciano`

## Wave Backfill Posologia Estruturada — Task #40 (13/mai/2026)

Backfill único da coluna `posologia_estruturada` (jsonb, migration 034) nos
registros históricos de `itens_terapeuticos` e `revo_medicamentos`.

### Resultado (snapshot 13/mai/2026)
- itens_terapeuticos: 167/167 (100,0%)
- revo_medicamentos: 92/92 (100,0%)
- Geral: 259/259 interpretado, 0% fallback
- Re-execução idempotente (0 linhas pendentes)

## Wave V46 — WhatsApp do CEO ativado (13/mai/2026)

Tela `/plataforma/perfil` agora permite cadastrar o telefone celular do CEO
(validador_mestre) com máscara BR + validação E.164. Gravado em
`usuarios.telefone` formato `+55DDD9XXXXXXXX` via `PUT /api/usuarios/:id`.
`GET /api/usuarios/perfil-atual` retorna `telefone` pra hidratar a tela.
Canal WhatsApp do CEO em assinatura digital depende deste cadastro.

## Wave V72 — Sprint 1 Motor V4 (17/mai/2026)

Migration 072 (`072_regras_motor_codigo_referencia_v4.sql`, aditivo) destrava
o Sprint 1 do plano consolidado. Ponte aditiva V13 (autoritativo) → V4
(formato `B1 B2 B3 B4 SEQ`). Caminho B do Dr. Claude: V13 nunca removido.

### Estado pos-migration
- 37 regras_motor com `codigo_referencia` (V13) intactas
- 0 regras com `codigo_referencia_v4` (preenchido nos Sprints 4 e 5)
- Índice condicional `ix_regras_motor_codigo_referencia_v4 WHERE codigo_referencia_v4 IS NOT NULL`

### Próximos sprints
2: alias formulas_master · 3: UPSERT 81 fórmulas · 4: Bridge V13→V4 · 5: UPSERT ~80 regras · 6: hardening matching · A.5: `mapearSinaisParaCodigo()` · 7: ativar regras · 8: Craniotomia UI MVP

## Wave V232 — Retenção automática auditoria Painel PAWARDS (14/mai/2026)

Migration 056 cria `painel_pawards_auditoria_limpezas`. Worker em
`lib/recorrencia/limpezaAuditoriaPainelPawards.ts` (tick 24h, lock
`pg_try_advisory_lock(15102320)`). `DELETE FROM painel_pawards_auditoria
WHERE acessado_em < now() - N months`. N via env
`PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES` (default 12).

## Wave V256 — Cão-de-guarda webhook ZapSign silencioso (14/mai/2026)

Migration 060 cria `webhook_assinatura_silencio_alertas` + amplia CHECK de
`assinatura_notificacoes.momento`. Worker
`lib/recorrencia/webhookAssinaturaSilencio.ts` (tick 60min, lock 30303033).
Função pura `decidirSilencioWebhook()`: dispara quando há pendentes na
janela E (webhook nunca recebeu OU gap ≥ horasJanela). Janela default
24h via `WEBHOOK_ASSINATURA_SILENCIO_HORAS`. Enfileira via
`assinatura_notificacoes` (`is_sistema_ceo=true`, bypass opt-out).

## Waves V479 a V483 — Demo investidora Carlúcia (18/mai/2026)

Sequência de pipelines pra a sessão 39 da Carlúcia (id=3497, Pádua) em
19/mai 07:30, executados sob pressão por reclamações progressivas do CEO.

### V479: regerar-ras-oficial-carlucia.ts
Rodou `gerarPdfRAS` (18.036b, 4 páginas). Primeira tentativa de RAS oficial.

### V480: pipeline-oficial-carlucia.ts (6/6 verde)
Snapshot REVO (inicial+atual genéricos), `createCalendarEvent`
(evento `gtv4lv65s515s4qkd676iaeodo`, calendário primary pois Pádua tem
`google_calendar_id` vazio), persist event_id em appt+sessão,
`gerarRasxPdf` COMPLETO (9.345b — saiu oco), upload Drive
`1JcJ7cKHwuY3d7dL1giskEbAs62i5w5_o`, `APRESENTACAO_INICIAL_PACIENTE` +
`ENVIO_RAS_PDF` via Twilio.

### V481: pipeline-receita-rasx-cheio-carlucia.ts (5/5 verde)
**Resposta à reclamação do CEO ("11 folhas ocas + receita sem designer combinado").**
- Populou REVO mínimo plausível pra Carlúcia: 6 patologias diagnosticadas/potenciais,
  4 órgãos/sistemas, 6 curvas (3 saúde + 3 doença D1/D2/D3), 3 eventos
  medicação, 3 próximas etapas. Todos marcados `[DEMONSTRACAO clinicamente plausivel]`.
- Receita manipulada via `gerarPrescricaoPdf` (Manifesto Blueprint v2.0,
  azul-petróleo + dourado, faixa MAGISTRAL, camada humana/técnica, SHA-256 + QR):
  "Composto Equilíbrio - Mg Bisglicinato 300mg + Zn 30mg + Vit D3 5000UI",
  3.766b, Drive `1UG4IcvjAQcU9ZPaLp-LCDHmfVerAplRw`. Farmácia roteada
  Galena Manipulação (SP, id=7 em `farmacias_parmavault`).
- RAS Completo CHEIO regerado: 26.353b (vs 9.345b oco anterior), 11 cadernos
  populados, Drive `1LP3P92rhgggfZ9NiynD8qd7pIWkAomAy`.
- 2 WhatsApp Carlúcia (receita + RAS cheio) + Telegram CEO.

### V482: pipeline-racj-carlucia.ts (3/3 verde)
**Resposta à pergunta do CEO ("RACJ jurídico não tem nada validado?").**
- Gravou 9 termos em `termos_assinados` (caminho já validado em produção:
  155 registros em 31 pacientes, último 15/abr): LGPD + Privacidade +
  Não-Garantia + TCLE Global + CFOR + CIMU + CEND + Aceite Digital +
  Ciência Financeira. `meio_assinatura='presencial'`, profissional Dr. Caio.
- Novo gerador `gerarPdfRacj` (Manifesto Blueprint v2.0 institucional)
  produz PDF consolidado: 67.541b com índice + 1 caderno por termo +
  texto integral justificado + linhas de assinatura. Drive
  `19vGADTHb_gYEUdnqlUDF7j3ui7Kl8CRF`.
- Tipo `RACJ` adicionado em `lib/arquivos/catalogo.ts` (subcategoria
  "05 JURIDICO / TERMOS", requerIdentificador=true).

### V483: disparar-zapsign-carlucia.ts
**Envelope ZapSign REAL** via `assinaturaService.enviar` (template
`TCLE_PADRAO_V1`, provedor zapsign). `ZAPSIGN_API_TOKEN` presente, envelope
não-mock. Solicitação id=257, envelope `8f0eb530-71e6-4525-8750-07876d9331f6`.
PDF nome padrão `[2026-05-18] [TCLE] [CARLUCIA SANTOS FERNANDES] [ZAPSIGN] [PENDENTE_ASSINATURA].pdf`.
Link de assinatura do paciente enviado via WhatsApp (`SM80dd7290...`).
Webhook ZapSign monitora — quando paciente assinar, `doc_signed` dispara
notificação automática pro CEO (Wave V46 + service.ts).

### Dívidas conscientes pós-V483
- Dados REVO da Carlúcia são `[DEMONSTRACAO]` — substituir por exames reais
  quando anexados (arquivar via `arquivadoEm`).
- ZapSign webhook URL precisa estar atualizada no painel ZapSign apontando
  pro domínio Replit atual (Wave V256 já vigia silêncio).
