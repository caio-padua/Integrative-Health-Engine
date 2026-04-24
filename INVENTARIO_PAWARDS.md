# INVENTÁRIO PAWARDS — Mapa REAL do Sistema (transmutação anti-walking-dead)

> **Levantado por Dr. Replit em 2026-04-23, em resposta ao pedido do Caio:**
> *"Consegue estudar tudo? E redistribuir os códigos / abrir as barragens / fazer todas
> as anastomoses... sem walking dead, entende?"*
>
> Documento blindado. Vive ao lado de `MANIFESTO_DR_REPLIT.md` e `replit.md`.

---

## 0. Volumetria geral

| Métrica | Valor real (banco em 2026-04-23) |
|---|---|
| Tabelas totais | **264** |
| Tabelas com 0 linhas (esqueleto) | **~50** (vazias por motivos válidos OU walking dead) |
| Pacientes | 1.557 |
| Anamneses | 39 |
| Prescrições | 203 |
| Blocos | 62 |
| Fórmulas | 54 |
| Eventos clínicos | 19 |
| Exames evolução | 17 |
| **Receitas PARMAVAULT** | **8.725** ← coração financeiro real |
| Farmácias parceiras | 8 |
| Parâmetros referência global (PRG) | 80 (67/67 EXAME mapeados V4) |
| Analitos catálogo | 304 |
| Códigos semânticos V4 | 521 |

**Conclusão de volumetria:** o sistema *tem sangue de verdade* na parte clínica
(pacientes/exames/PRGs) e no PARMAVAULT (8.725 receitas). O resto está em vários
estados — alguns esqueleto vazio aguardando ativação, outros zumbis a sepultar.

---

## 1. WAVE 5 PARMAVAULT — Status REAL revisitado (correção do replit.md)

> *"O esqueleto está construído, mas o sangue não corre."*

| Bloco | Brief Dr. Claude | replit.md dizia | Estado REAL no banco/código | Diagnóstico |
|---|---|---|---|---|
| **B0** Migrations 021+022 (4 tabelas + comissao_estimada NULL) | ✅ | ✅ feito | ✅ **REAL** — 4 tabelas + FKs + indexes presentes | OK |
| **B1** Hook A2 warning emissão sem contrato | ✅ | ✅ feito | ⚠️ **PARCIAL** — `validarContratoFarmaciaUnidade` existe **2x duplicado** (`lib/contratoFarmacia.ts` + `lib/contratos/verificarUnidadeTemContrato.ts`); chamado em `emitirPrescricaoService.ts:132`; **MAS `parmavault_emissao_warnings` = 0 linhas**, e `farmacias_unidades_contrato = 0` (sem nenhum contrato cadastrado, então TODA emissão deveria estar disparando warning — silêncio suspeito) | **Verificar se hook efetivamente roda + matar duplicidade** |
| **B2** Endpoint POST recalcular comissão dos 8725 | ✅ | ✅ feito, "8725/8725" | ❌ **WALKING DEAD CONFIRMADO** — endpoint `comissao-estimada/recalcular` **NÃO EXISTE**; 8725 receitas TODAS com `comissao_estimada = 0` | **Criar endpoint + rodar** |
| **B3** Hook nova emissão calcula comissão | ✅ | ✅ feito | ❌ **WALKING DEAD CONFIRMADO** — zero trigger SQL em `parmavault_receitas`, zero hook TS encontrado | **Criar trigger SQL OU hook TS** |
| **B4** Portal CSV + manual master | ✅ | ✅ feito | ⚠️ **PARCIAL** — endpoints `POST/GET /admin/parmavault/declaracoes` provavelmente existem em `parmavaultReconciliacao.ts` MAS `parmavault_declaracoes_farmacia = 0` (nunca foi chamado) | **Validar end-to-end com 1 declaração teste** |
| **B5** Painel CEO Previsto×Declarado×Recebido×Gap | ✅ | ✅ feito | ⚠️ **PARCIAL** — página `admin-parmavault-reconciliacao.tsx` existe + endpoint `matriz` no router; mas painel renderiza COM DADOS VAZIOS hoje (porque B2/B3/B4 não rodaram) | **Validar após B2/B3/B4** |
| **B6** PDF + Excel exportável | ✅ | ✅ feito | ⚠️ **PARCIAL** — `relatoriosPdf.ts` montado em `index.ts:201`, tabela `parmavault_relatorios_gerados` existe MAS = 0 linhas (nunca gerou) | **Gerar 1 PDF + 1 Excel teste** |
| **B7** Wrap-up | pendente | pendente | ❌ **pendente** | **Após B2-B6 reais** |

### Fluxo de transmutação (anti-walking-dead) — proposta concreta

1. **Matar duplicidade B1** — escolher 1 das 2 impls de `validarContratoFarmaciaUnidade`, deletar a outra, importar a sobrevivente em todos os calls.
2. **Criar endpoint B2** `POST /api/admin/parmavault/comissao-estimada/recalcular` (idempotente, master-only) + rodar nos 8725 → preencher `comissao_estimada` real.
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
- **Tabelas:** `parmavault_receitas` (8725), `farmacias_parmavault` (8), `farmacias_unidades_contrato` (0), `parmavault_emissao_warnings` (0), `parmavault_declaracoes_farmacia` (0), `parmavault_repasses` (0), `parmavault_relatorios_gerados` (0), `farmacias_emissao_metricas_mes`, `farmacias_parceiras`, `comissoes_config`, `commission_events`, `comissao` (rota), `remedios_farmacia`, `remedios_farmacia_componentes`
- **Rotas:** `parmavaultReconciliacao.ts`, `contratosFarmacia.ts`, `relatoriosPdf.ts`, `comissao.ts`
- **Páginas:** `admin-parmavault-reconciliacao.tsx`, `farmacias-parmavault.tsx`, `admin-contratos-farmacia.tsx`, `admin-farmacias-roteamento.tsx`, `comissao.tsx`
- **Status:** ⚠️ esqueleto pronto, sangue só nas 8725 receitas; ver §1 acima.

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
| 1 | **MEDCORE → PARMAVAULT** | Toda nova prescrição com bloco-fórmula deve disparar (a) cálculo `comissao_estimada` em `parmavault_receitas`, (b) warning `parmavault_emissao_warnings` se contrato ausente | ⚠️ B1 parcial (warning não acionou em 0 inserts), B2/B3 zumbis (8725 receitas com comissao=0) |
| 2 | **PAREXAM → PAWVISION** | Resultado de exame com classificação 5 zonas deve aparecer no modo vitrine paciente | ✅ **acabou de ser criada** com EXAMES-2 (`/atendimento/exames/:id/vitrine`) |
| 3 | **PAWTRACK → MEDCORE** | Resposta do questionário diário deve gerar `eventos_clinicos` ou alimentar `mapa_aderencia_celular` que entra na anamnese da próxima consulta | ❌ não vejo o link; PAWTRACK schema parece zumbi/nominação errada |
| 4 | **PARMAVAULT → PADTEAM** | Cobrança não-paga ou comissão atrasada deve gerar `task_cards` automático pra equipe | ❌ não vejo |
| 5 | **PAREXAM → MEDCORE prescrições** | Exame em zona ALERTA/ATENÇÃO deve sugerir bloco-protocolo na próxima prescrição (motor de cruzamento dos docs Caio) | ❌ existe `motor_decisao_clinica` tabela mas vazia (0 linhas) — esqueleto puro |
| 6 | **PADLEGEX → toda emissão** | Toda prescrição/atendimento deve checar consentimento ativo do paciente (LGPD + termo terapêutico) | ⚠️ existe assinaturas mas validação na hora da emissão não confirmada |
| 7 | **MEDCORE → PARASCLIN** | Toda fórmula prescrita com endovenoso/injetável deve criar `aplicacoes_substancias` agendadas | ⚠️ tabelas existem, ligação não confirmada |

---

## 4. WALKING DEAD candidatos (sepultar com aprovação Caio)

### Walking dead **CONFIRMADO**:
- `validarContratoFarmaciaUnidade` está **duplicada** em `lib/contratoFarmacia.ts` + `lib/contratos/verificarUnidadeTemContrato.ts`. **Matar uma.**
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
- Faz: B2 endpoint + roda 8725 / B3 trigger / smoke B1 / smoke B4 / smoke B5 / smoke B6 / B7 wrap-up
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
