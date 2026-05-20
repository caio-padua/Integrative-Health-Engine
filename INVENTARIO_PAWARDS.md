# INVENTÁRIO PAWARDS — Mapa REAL do Sistema (transmutação anti-walking-dead)

> **Levantado por Dr. Replit em 2026-04-23, em resposta ao pedido do Caio:**
> *"Consegue estudar tudo? E redistribuir os códigos / abrir as barragens / fazer todas
> as anastomoses... sem walking dead, entende?"*
>
> Documento blindado. Vive ao lado de `MANIFESTO_DR_REPLIT.md` e `replit.md`.

---

## 0. Volumetria geral

| Métrica | Valor atual no banco (snapshot 2026-05-19, com diff vs 2026-04-23 quando relevante) |
|---|---|
| Tabelas totais | **304** (era 264 em 2026-04-23; +40 nas Waves V13/V25/V46/V72 + Cadastro Pádua + Sprint 1 Motor V4 + auditoria/agentes) |
| Tabelas com 0 linhas (esqueleto) | **~50** (vazias por motivos válidos OU walking dead) |
| Pacientes | 1.557 |
| Anamneses | 39 |
| Prescrições | 203 |
| Blocos | 62 |
| Fórmulas | 54 |
| Eventos clínicos | 19 |
| Exames evolução | 17 |
| **Receitas PARMAVAULT** | **8.728** ← ⚠️ POTENCIAL ESTIMADO de fichas históricas (NÃO é caixa). Ver disclaimer abaixo. |
| Farmácias parceiras | 8 |
| Parâmetros referência global (PRG) | 80 (67/67 EXAME mapeados V4) |
| Analitos catálogo | 304 |
| Códigos semânticos V4 | 521 |

**Conclusão de volumetria:** o sistema *tem sangue de verdade* na parte clínica
(pacientes/exames/PRGs). O PARMAVAULT tem **esqueleto** com 8.728 fichas
migradas de planilha histórica (ver disclaimer abaixo — **NÃO é caixa real**).
O resto está em vários estados — alguns esqueleto vazio aguardando ativação,
outros zumbis a sepultar.

---

## ⚠️ DISCLAIMER PARMAVAULT (regra de ferro 2026-05-13)

Caio (CEO) explicitou em 13/mai/2026: os números **"8.728 receitas"** e
**"R$ 2.736.536,10"** que aparecem em painéis PARMAVAULT, briefings e neste
inventário **NÃO são receitas emitidas pelo sistema nem caixa real**. São
**projeção de potencial** calculada a partir das fichas históricas migradas
de planilhas (Wave 9 PARQ + Wave Cadastro Pádua, 13/mai). Caio ainda **NÃO
emitiu nenhuma receita produtiva pelo sistema** — toda a contagem
`parmavault_receitas` vem de backfill, não de emissão real.

**Regra:** sempre que precisar citar esses números, escrever
"potencial estimado a partir de fichas históricas". Triggers do banco que
protegem essas linhas continuam invariantes técnicas e **não devem ser
dropados**. Espelhado em `replit.md` (seção homônima) e em
`docs/dr-claude/00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md`.

---

## 1. WAVE 5 PARMAVAULT — Status REAL revisitado (correção do replit.md)

> *"O esqueleto está construído, mas o sangue não corre."*

| Bloco | Brief Dr. Claude | replit.md dizia | Estado REAL no banco/código | Diagnóstico |
|---|---|---|---|---|
| **B0** Migrations 021+022 (4 tabelas + comissao_estimada NULL) | ✅ | ✅ feito | ✅ **REAL** — 4 tabelas + FKs + indexes presentes | OK |
| **B1** Hook A2 warning emissão sem contrato | ✅ | ✅ feito | ⚠️ **PARCIAL (2026-05-19: duplicidade RESOLVIDA — ver §6)** — `verificarUnidadeTemContrato` agora é ÚNICA implementação em `lib/contratos/verificarUnidadeTemContrato.ts`; `lib/contratoFarmacia.ts` foi REMOVIDO; chamado em `emitirPrescricaoService.ts:136`. **MAS `parmavault_emissao_warnings` = 0 linhas**, e `farmacias_unidades_contrato = 0` (sem nenhum contrato cadastrado, então TODA emissão deveria estar disparando warning — silêncio suspeito) | **Verificar se hook efetivamente roda (duplicidade já matada)** |
| **B2** Endpoint POST recalcular comissão das 8.728 fichas (potencial histórico — ver disclaimer) | ✅ | ✅ feito, "8725/8725" | ❌ **WALKING DEAD CONFIRMADO** — endpoint `comissao-estimada/recalcular` **NÃO EXISTE**; as 8.728 receitas (potencial histórico) TODAS com `comissao_estimada = 0` | **Criar endpoint + rodar** |
| **B3** Hook nova emissão calcula comissão | ✅ | ✅ feito | ❌ **WALKING DEAD CONFIRMADO** — zero trigger SQL em `parmavault_receitas`, zero hook TS encontrado | **Criar trigger SQL OU hook TS** |
| **B4** Portal CSV + manual master | ✅ | ✅ feito | ⚠️ **PARCIAL** — endpoints `POST/GET /admin/parmavault/declaracoes` provavelmente existem em `parmavaultReconciliacao.ts` MAS `parmavault_declaracoes_farmacia = 0` (nunca foi chamado) | **Validar end-to-end com 1 declaração teste** |
| **B5** Painel CEO Previsto×Declarado×Recebido×Gap | ✅ | ✅ feito | ⚠️ **PARCIAL** — página `admin-parmavault-reconciliacao.tsx` existe + endpoint `matriz` no router; mas painel renderiza COM DADOS VAZIOS hoje (porque B2/B3/B4 não rodaram) | **Validar após B2/B3/B4** |
| **B6** PDF + Excel exportável | ✅ | ✅ feito | ⚠️ **PARCIAL** — `relatoriosPdf.ts` montado em `index.ts:201`, tabela `parmavault_relatorios_gerados` existe MAS = 0 linhas (nunca gerou) | **Gerar 1 PDF + 1 Excel teste** |
| **B7** Wrap-up | pendente | pendente | ❌ **pendente** | **Após B2-B6 reais** |

### Fluxo de transmutação (anti-walking-dead) — proposta concreta

1. ~~**Matar duplicidade B1**~~ — ✅ **RESOLVIDO 2026-05-19** (ver §6): `lib/contratoFarmacia.ts` já foi removido, só sobrou `lib/contratos/verificarUnidadeTemContrato.ts`. Passo concluído antes da Wave Dr. Replit, sem ação adicional.
2. **Criar endpoint B2** `POST /api/admin/parmavault/comissao-estimada/recalcular` (idempotente, master-only) + rodar nas 8.728 fichas (potencial histórico) → preencher `comissao_estimada` real.
3. **Criar trigger B3** `BEFORE INSERT ON parmavault_receitas` que calcula comissão estimada com a mesma fórmula do B2 (ou hook TS na rota que insere — o que o Caio achar menos invasivo).
4. **Smoke teste B1** — emitir 1 prescrição teste em unidade sem contrato → verificar warning vai pra `parmavault_emissao_warnings` → ROLLBACK.
5. **Smoke teste B4** — postar 1 declaração manual + 1 CSV pequeno → verificar linhas em `parmavault_declaracoes_farmacia` → cleanup.
6. **Smoke teste B5** — abrir painel CEO no navegador → checar matriz preenchida.
7. **Smoke teste B6** — gerar 1 relatório PDF + 1 Excel → checar `parmavault_relatorios_gerados` += 1.
8. **B7 wrap-up** — atualizar replit.md com VERDADE pós-transmutação + commit duplo + SHA pinado pra Dr. Claude.

**Tempo estimado:** 2 a 3 horas em autonomia. Tudo aditivo, zero `db:push`, conforme regra ferro.

---

## 2. Mapeamento dos 9 módulos PAWARDS oficiais (docs Caio)

> Os documentos PAWARDS Master / Elite 300% / Full 100% / Elite 500-1000% definem 9 módulos.
> **Hoje, no código real, só PARMAVAULT está nominado.** O resto vive com nomes técnicos
> genéricos. Esta tabela mostra **onde cada módulo já existe disfarçado**.

### MEDCORE — anamnese · prontuário · prescrições · protocolos · consultas
- **Tabelas:** `pacientes` (1557), `anamneses` (39), `prescricoes` (203), `blocos` (62), `formulas` (54), `protocolos`, `bloco_template`, `bloco_template_dose`, `bloco_template_semana`, `eventos_clinicos` (19)
- **Rotas backend:** `pacientes.ts`, `anamnese.ts`, `prescricoes.ts`, `blocos.ts`, `protocolos.ts`, `formulaBlend.ts`, `dashboard.ts`, `motorClinico.ts`, `cavaloClinical.ts`
- **Páginas frontend:** `pages/pacientes/*`, `pages/anamnese/*`, `pages/dashboard.tsx`, `pages/dashboard-local.tsx`, `pages/protocolos/*`, `pages/itens-terapeuticos/*`
- **Status:** ✅ vivo, com sangue real. Falta nominação como "MEDCORE" no UI.

### PARMAVAULT — receitas · integração farmácia · comissões · recorrência ✅ NOMINADO
- **Tabelas:** `parmavault_receitas` (8.728 — ⚠️ potencial histórico, ver disclaimer), `farmacias_parmavault` (8), `farmacias_unidades_contrato` (0), `parmavault_emissao_warnings` (0), `parmavault_declaracoes_farmacia` (0), `parmavault_repasses` (0), `parmavault_relatorios_gerados` (0), `farmacias_emissao_metricas_mes`, `farmacias_parceiras`, `comissoes_config`, `commission_events`, `comissao` (rota), `remedios_farmacia`, `remedios_farmacia_componentes`
- **Rotas:** `parmavaultReconciliacao.ts`, `contratosFarmacia.ts`, `relatoriosPdf.ts`, `comissao.ts`
- **Páginas:** `admin-parmavault-reconciliacao.tsx`, `farmacias-parmavault.tsx`, `admin-contratos-farmacia.tsx`, `admin-farmacias-roteamento.tsx`, `comissao.tsx`
- **Status:** ⚠️ esqueleto pronto, sangue NÃO corre ainda — as 8.728 "receitas" são potencial histórico migrado, não emissão real (ver disclaimer no topo); ver §1 acima.

### PAREXAM — OCR · padronização · conversão unidades · 5 zonas
- **Tabelas:** `parametros_referencia_global` (80, 67/67 mapeados V4), `analitos_catalogo` (304), `codigos_semanticos` (521), `analitos_referencia_laboratorio`, `analitos_validacoes_log`, `exames_evolucao` (17), `exames_base`, `arquivos_exames`, `direcao_favoravel_exame`, `mapa_bloco_exame`
- **Rotas:** `examesInteligente.ts`, `exames.ts`, `pedidosExame.ts`, `direcaoExame.ts`, `laboratorioIntegrativo.ts`, `codigosSemanticos.ts`, `semantico.ts`, `seedSemantico.ts`
- **Páginas:** `exames.tsx`, `pacientes/exames-grafico.tsx`, `atendimento/exames/[pacienteId].tsx` (modo médico, novo), `atendimento/exames/[pacienteId]/vitrine.tsx` (vitrine paciente, novo), `pedidos-exame/*`, `codigos-semanticos/*`, `laboratorio-validacao.tsx`
- **Status:** ✅ MUITO vivo. Acabou de receber upgrade EXAMES-2 (5 zonas + nomes próprios + frontend dual). Falta nominação "PAREXAM".

### PAWTRACK — questionário diário · aderência
- **Tabelas:** `paciente_otp` (1), `monitoramento_sinais_vitais`, `mapa_aderencia_celular`, `feedback_pacientes`, `estado_saude_paciente`
- **Rotas:** `questionarioPaciente.ts`, `monitoramentoPaciente.ts`, `whatsapp.ts`
- **Páginas:** `pacientes/questionario.tsx`, `pacientes/monitoramento.tsx`, `padcom/*`, `lembretes-falhas.tsx`, `questionario-master.tsx`
- **Status:** ⚠️ rotas existem mas **NENHUMA tabela de questionário com volume** — `questionario_paciente` nem existe; o sistema parece estar usando outro nome ou está zumbi. **CAVADA RECOMENDADA.**

### PAWVISION — modo consulta · apresentação ao paciente · narrativa clínica
- **Tabelas:** sem tabela específica (consome de PAREXAM + MEDCORE)
- **Rotas:** parcial em `dashboard.ts`, `motorClinico.ts`
- **Páginas:** `atendimento/exames/[pacienteId]/vitrine.tsx` (NOVA, modo paciente fullscreen) ← **primeiro PAWVISION real do sistema**
- **Status:** 🌱 acabou de nascer com EXAMES-2 vitrine. Nominação faltando.

### PAWLEVEL — gamificação · ranking · pontos · metas
- **Tabelas:** **nenhuma encontrada** (`gamificacao`, `pontos_paciente`, `ranking` não existem)
- **Rotas:** **nenhuma**
- **Páginas:** **nenhuma**
- **Status:** ❌ **NÃO EXISTE no sistema atual.** Documento Caio prevê, código não tem. Ou foi descartado, ou aguarda Wave futura.

### PADTEAM — equipe · tarefas · SLA · auditoria
- **Tabelas:** `colaboradores` (rota), `delegacoes`, `agentes_clinica`, `agentes_personalidade`, `agentes_regras`, `agentes_motor_escrita`, `agentes_versionamento`, `agentes_identidade`, `agentes_frases`, `auditores`, `auditor_eventos_drive`, `auditor_visibilidade_regras`, `auditor_areas_atuacao`, `auditor_mensagens`, `auditoria_cascata`, `cascata_validacao_config`, `disciplinary_events`, `fila_preceptor`, `filas_operacionais`, `task_cards`, `sla`
- **Rotas:** `colaboradores.ts`, `delegacao.ts`, `agentesVirtuais.ts`, `auditores.ts`, `auditoriaCascata.ts`, `permissoesDelegadas.ts`, `taskCards.ts`, `sla.ts`, `filas.ts`, `comercial.ts`, `comercialAdmin.ts`
- **Páginas:** `colaboradores.tsx`, `delegacao/*`, `agentes-virtuais.tsx`, `task-cards/*`, `filas/*`, `permissoes/*`, `comercial.tsx`, `admin-comercial.tsx`, `admin-permissoes-delegadas.tsx`
- **Status:** ✅ EXTENSO, talvez maior módulo do sistema. Falta nominação "PADTEAM".

### PADLEGEX — contratos · termos · consentimentos · cláusulas
- **Tabelas:** `contrato_clinica`, `assinaturas_digitais`, `assinatura_solicitacoes`, `assinatura_signatarios`, `assinatura_testemunhas`, `assinatura_pares_testemunhas`, `assinatura_notificacoes`, `assinatura_drive_estrutura`, `assinatura_textos_institucionais`, `assinatura_toggles_admin`, `assinatura_templates`, `assinatura_webhook_eventos`, `juridico_termos_bloqueados`, `termosJuridicos.ts`
- **Rotas:** `assinaturas.ts`, `assinaturaCRUD.ts`, `assinaturasWebhook.ts`, `notifAssinatura.ts`, `termosJuridicos.ts`, `contratosFarmacia.ts`, `contratosRoute.ts`, `juridicoNotaFiscal.ts`
- **Páginas:** `contratos/*`, `admin-contratos-farmacia.tsx`
- **Status:** ✅ vivo, robusto. Nominação faltando.

### PARASCLIN — evolução clínica · administração de substâncias · segurança
- **Tabelas:** `eventos_clinicos` (19), `aplicacoes_substancias`, `linha_medicacao_evento`, `monitoramento_sinais_vitais`, `linfonodos_paciente`, `acompanhamento_cavalo`, `acompanhamento_formula`, `evento_start`, `eventos_saida_operacionais`, `endovenosos`, `injetaveis`, `implantes`, `cirurgias`, `avaliacao_enfermagem`, `dietas`, `estoque_itens`
- **Rotas:** `substancias.ts`, `acompanhamento.ts`, `avaliacaoEnfermagem.ts`, `eventos*` (em outras rotas)
- **Páginas:** `acompanhamento.tsx`, `avaliacao-enfermagem/*`, `substancias` (subroute), `dietas/*`, `estoque/*`
- **Status:** ✅ vivo. Nominação faltando.

---

## 3. ANASTOMOSES FALTANTES (barragens fechadas)

São pontos onde 2 módulos PAWARDS deveriam conversar em produção e hoje **não conversam**
(ou conversam capengando):

| # | Origem → Destino | Anastomose esperada | Estado hoje |
|---|---|---|---|
| 1 | **MEDCORE → PARMAVAULT** | Toda nova prescrição com bloco-fórmula deve disparar (a) cálculo `comissao_estimada` em `parmavault_receitas`, (b) warning `parmavault_emissao_warnings` se contrato ausente | ⚠️ B1 parcial (warning não acionou em 0 inserts), B2/B3 zumbis (8.728 fichas potencial histórico com comissao=0) |
| 2 | **PAREXAM → PAWVISION** | Resultado de exame com classificação 5 zonas deve aparecer no modo vitrine paciente | ✅ **acabou de ser criada** com EXAMES-2 (`/atendimento/exames/:id/vitrine`) |
| 3 | **PAWTRACK → MEDCORE** | Resposta do questionário diário deve gerar `eventos_clinicos` ou alimentar `mapa_aderencia_celular` que entra na anamnese da próxima consulta | ❌ não vejo o link; PAWTRACK schema parece zumbi/nominação errada |
| 4 | **PARMAVAULT → PADTEAM** | Cobrança não-paga ou comissão atrasada deve gerar `task_cards` automático pra equipe | ❌ não vejo |
| 5 | **PAREXAM → MEDCORE prescrições** | Exame em zona ALERTA/ATENÇÃO deve sugerir bloco-protocolo na próxima prescrição (motor de cruzamento dos docs Caio) | ❌ existe `motor_decisao_clinica` tabela mas vazia (0 linhas) — esqueleto puro |
| 6 | **PADLEGEX → toda emissão** | Toda prescrição/atendimento deve checar consentimento ativo do paciente (LGPD + termo terapêutico) | ⚠️ existe assinaturas mas validação na hora da emissão não confirmada |
| 7 | **MEDCORE → PARASCLIN** | Toda fórmula prescrita com endovenoso/injetável deve criar `aplicacoes_substancias` agendadas | ⚠️ tabelas existem, ligação não confirmada |

---

## 4. WALKING DEAD candidatos (sepultar com aprovação Caio)

### Walking dead **CONFIRMADO**:
- ~~`validarContratoFarmaciaUnidade` duplicada~~ — **RESOLVIDO 2026-05-19**: `lib/contratoFarmacia.ts` foi REMOVIDO; só sobrou `lib/contratos/verificarUnidadeTemContrato.ts`, usada em `emitirPrescricaoService.ts:136`. Ver §6.
- `motor_decisao_clinica` (tabela vazia, sem rota visível) — provável esqueleto não-implementado.
- `anastomoses_pendentes` (tabela vazia) — usar OU sepultar; ironicamente é a metáfora do Caio.

### **Falsos positivos de zumbi (ALÍVIO):**
- ❌ ZERO página frontend órfã — App.tsx importa todas (regex anterior estava errada).
- ❌ ZERO rota backend órfã — todas em `routes/index.ts`.

### Esqueleto LEGÍTIMO (vazio mas válido — aguarda primeiro INSERT):
- 50+ tabelas vazias do banco, a maioria são features que aguardam ativação (PAWLEVEL, PAWTRACK, motor_decisao_clinica) ou fluxos pouco usados ainda (cobranças, agentes virtuais).
- Decisão sobre cada uma: **caso a caso, com Caio.** Não sepultar de afogadilho.

---

## 5. RECOMENDAÇÃO de PRÓXIMOS PASSOS (Caio decide)

### Opção A — TRANSMUTAÇÃO Wave 5 (foco: abrir as barragens já construídas)
- Tempo: 2-3h
- Faz: B2 endpoint + roda nas 8.728 fichas potencial / B3 trigger / smoke B1 / smoke B4 / smoke B5 / smoke B6 / B7 wrap-up
- Risco: zero (tudo aditivo, idempotente, com smoke teste)
- Benefício: **Wave 5 deixa de ser walking dead, vira sangue corrente**, painel CEO reúne dados reais, PDF gera de verdade pra reunião com farmácia

### Opção B — REDISTRIBUIÇÃO PAWARDS (foco: nominar os 9 módulos no código)
- Tempo: 4-6h (renomear pastas, atualizar imports, criar `src/modules/{medcore,parmavault,parexam,...}`, sem mudar comportamento)
- Faz: refactoring físico organizando código pelos 9 módulos oficiais Caio
- Risco: médio (muito import pra atualizar, possível regressão)
- Benefício: cosmético/organização, ajuda manutenção futura, mas **não muda funcionalidade**

### Opção C — ANASTOMOSES FALTANTES (foco: ligar os módulos)
- Tempo: 6-8h (PAWTRACK→MEDCORE + PARMAVAULT→PADTEAM + PAREXAM→protocolos)
- Faz: implementar de fato as 5 anastomoses faltantes da §3
- Risco: maior, mexe em fluxo
- Benefício: sistema vira **organismo único** ao invés de tabelas isoladas

### Opção D — APENAS ESTUDO (entregar este documento e parar)
- Tempo: 0
- Faz: nada além deste inventário
- Caio decide o que vem depois com cabeça fria

**Minha recomendação técnica (Dr. Replit):** Opção A primeiro. Transmuta Wave 5 que está
a 1 passo de funcionar. Depois Opção C nas 1-2 anastomoses mais críticas (PAWTRACK→MEDCORE
e PAREXAM→protocolos). Opção B fica pra depois — é cosmético comparado às barragens fechadas.

---

> **Próximo passo:** aguardo decisão Caio. Sem inventar moda. Sem walking dead.

---

## 6. Estado real Stripe / Asaas / Resend / Supabase + investigação duplicidade contrato farmácia

> **Atualização Dr. Replit 2026-05-19 (pós Wave consertar workflow `test` / Task #166).**
> Caio pediu confirmação explícita destes 4 pontos antes de fechar a wave.

### (a) Disclaimer PARMAVAULT → ver bloco no topo do documento (logo após §0).

### (b) Estado Stripe / Asaas / Resend / Supabase

| Serviço | Estado no código real (2026-05-19) | Secret configurada? | Ação recomendada |
|---|---|---|---|
| **Stripe** | Citado em `replit.md` como adapter pattern. **Não auditado nesta wave** — fora do escopo da Task #166. | Não checado | Auditar em wave dedicada de pagamentos. |
| **Asaas** | Citado em `replit.md` como adapter pattern. Secret `ASAAS_API_KEY` **NÃO configurada** (listada em `<missing_secrets>`). | ❌ ausente | Caio decide se quer ativar Asaas agora ou adiar. |
| **Resend** | **ZERO** referências reais a Resend (transactional email). As 3 ocorrências da string "resend" em `artifacts/api-server/src/routes/assinaturas.ts`, `artifacts/api-server/src/lib/assinatura/adapters.ts` e `artifacts/clinica-motor/src/pages/assinaturas-uploads-falhos.tsx` são todas URLs ZapSign `/resend-webhooks/` (POST pra reentregar webhook caído), **NÃO** o provedor Resend.com. | ❌ não usado | Nenhuma — Resend.com não é dependência do sistema. |
| **Supabase** | **ZERO** referências em todo o monorepo (`rg -lni supabase artifacts/ scripts/ lib/`). | ❌ não usado | Nenhuma — Supabase não é dependência do sistema. |

**Conclusão:** Resend e Supabase NÃO existem como integrações reais; eram
falsos positivos em conversas anteriores. Asaas tem placeholder no código
mas secret ausente. Stripe não foi auditado (escopo).

### (c) Investigação duplicidade `validarContratoFarmaciaUnidade`

**Resultado: NÃO HÁ duplicidade.** A inspeção `rg -n "validarContratoFarmaciaUnidade|verificarUnidadeTemContrato" artifacts/api-server/src --type ts` em 2026-05-19 mostrou:

```
artifacts/api-server/src/lib/contratos/verificarUnidadeTemContrato.ts:22:  export async function verificarUnidadeTemContrato(...)
artifacts/api-server/src/services/emitirPrescricaoService.ts:21:  verificarUnidadeTemContrato,
artifacts/api-server/src/services/emitirPrescricaoService.ts:23:} from "../lib/contratos/verificarUnidadeTemContrato";
artifacts/api-server/src/services/emitirPrescricaoService.ts:136:  const checkContrato = await verificarUnidadeTemContrato(prescricao.unidade_id ?? null);
```

O arquivo `artifacts/api-server/src/lib/contratoFarmacia.ts` **não existe
mais** (foi removido em algum wave entre 2026-04-23 e hoje). Só sobrou a
implementação canônica em `lib/contratos/verificarUnidadeTemContrato.ts`,
usada num único call-site (`emitirPrescricaoService.ts:136`). §1 B1 e §4
foram atualizados acima refletindo essa resolução.

### (d) Mudança 264 → 304 tabelas

Confirmado por `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'` em 2026-05-19: **304 tabelas**, vs 264 do snapshot original (2026-04-23). Delta de +40. §0 atualizado. **Origem provável das +40:** Migration 040/042 (campos Cadastro Pádua), Migration 072 (ponte aditiva V13→V4), tabelas de retenção/auditoria do Painel PAWARDS (V232), envelope/webhook ZapSign (Wave 10 + V479-V483), `painel_pawards_auditoria`, `agentes_*`, `auditor_*`. Auditoria fina por tabela é trabalho fora do escopo da Task #166 — pode virar wave própria se Caio quiser.

---

## 7. Wave Dr. Replit (consertar workflow `test` / Task #166) — fechamento 2026-05-19

**Resultado:** ✅ workflow `test` agora 100% verde (150/150 passando, era 148/150).

**Causa raiz dos 2 testes vermelhos:** contaminação de DB compartilhado. A
suite `alertaBruteForceTotp.test.ts` (suite "canal WhatsApp defensivo")
assumia que só o validador criado pelo próprio teste tinha telefone
cadastrado entre os usuários elegíveis (`perfil_plataforma=platform_owner
OR perfil=validador_mestre AND ativo=true`). Mas em prod o id=1 (Dr Caio
Padua) é validador_mestre + platform_owner ATIVO + telefone real
`5511977154000` cadastrado pela Wave V46 — entrava no resultado da query
do helper e contaminava 2 asserts:

- `(a-strict)` esperava `wppCalls.length === 1`, recebia 2 (Caio + validador de teste).
- `(c) fallback CEO_WHATSAPP` esperava `5511999991111` mas recebia `5511977154000` (telefone real do Caio "vencia" o fallback).

**Fix aplicado (sem mexer em comportamento de produção):** seguindo o
padrão já estabelecido no helper (`_setGmailClientFactoryParaTestes`,
`_setEnviarWhatsappParaTestes`), adicionei um terceiro seam de injeção
`_setResolverDestinatariosParaTestes`. A query SQL de destinatários foi
encapsulada em uma função (`resolverDestinatariosOwnersReal`), e a suite
Task #166 injeta um resolvedor fake que ainda CONSULTA o DB (respeita
`UPDATE telefone=NULL` que o teste (c) faz) mas restringe o universo aos
2 usuários criados pela própria suite (`validadorAtivoId` +
`validadorComTelefoneId`). Em produção, o comportamento é idêntico ao
anterior — a função real é chamada via injetor default.

Arquivos tocados:
- `artifacts/api-server/src/lib/auth/alertaBruteForceTotp.ts` (+~30 linhas: seam + extração da query)
- `artifacts/api-server/src/lib/auth/alertaBruteForceTotp.test.ts` (+~20 linhas: import do seam + uso no `before`/`after` da suite Task #166)

**Por que essa abordagem:** alternativas consideradas e rejeitadas —
(i) UPDATE+restore de telefones reais no DB compartilhado é arriscado
(se o teste crashar entre `before` e `after`, o WhatsApp do CEO fica mudo
em prod); (ii) mockar via `node:test` mock de módulo é mais frágil entre
versões. O seam segue padrão já presente, é 100% aditivo e isolado.
