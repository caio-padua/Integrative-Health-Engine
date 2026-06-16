---
name: Fluxo clínico E2E é REAL e operável via API
description: Sequência de endpoints que opera um paciente de ponta a ponta sem mock, e o que cada passo grava.
---

# Fluxo clínico ponta-a-ponta (verificado ao vivo 16/06/2026)

Todo o caminho é REAL (grava em tabela), não há ectoplasma nas rotas abaixo.

**Recipe (BASE=http://localhost:80/api, dev-login pega JWT):**
1. `POST /anamnese {pacienteId}` → grava em `anamneses`.
2. `PUT /anamnese/:id {respostasClincias,respostasPreferencias,respostasFinanceiras}` (campo tem typo "Clincias").
3. `POST /anamnese/:id/ativar-motor` → casa `regras_motor` (palavraChave substring vs sinais Q010/Q012/Q013/Q014 + Q030/Q031/Q032/Q033 + Q041 perfil) e grava em **`sugestoes_clinicas`** (NÃO "sugestoes"); seta anamnese.status concluida.
4. `POST /protocolos` → grava `protocolos`.
5. RAS PDF: `GET /ras/pdf/paciente/:pacienteId` nasce de **sessões + aplicacoes_substancias** (NÃO da anamnese). Sem sessão → 404. `POST /ras {sessaoId}` persiste registro.
6. `POST /agenda-motor/book {slotId,pacienteId}` → `appointments` + ocupa slot + sync Google por default (opt-out `syncGoogleCalendar:false`). Re-sync manual: `POST /agenda-motor/sync-gcal {appointmentId}`.

**Filtros do motor:** perfil BASICO bloqueia protocolo/implante; injetavel só se Q031/Q032=SIM; implante só se Q033=SIM. Dedupe por segmento+codigoReferencia.

**Why:** CEO precisa de prova de que o sistema OPERA de verdade; confirmado gerando 10 sugestões reais (5 exame/3 formula/1 injetavel/1 protocolo) + evento Google Calendar real.
**How to apply:** Para demonstrar "operar como médico", usar registro de TESTE do Caio (paciente id 44, CPF fictício) e NÃO o prontuário real (id 3459, unidade 15) — evita sujar histórico clínico real.
