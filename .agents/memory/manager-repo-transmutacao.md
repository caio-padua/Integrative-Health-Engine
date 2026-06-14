---
name: Manager (Protocolo-Manager) — modelo de dados e gaps para a transmutação
description: O que o repo público caio-padua/Protocolo-Manager tem e o que falta para receber o export do IHE (transmutação chupa-cabra).
---

Repo PÚBLICO `caio-padua/Protocolo-Manager`, branch única `main`. Monorepo pnpm igual ao IHE (lib/db Drizzle, artifacts/api-server Express, artifacts/padcom frontend). Catálogo de fórmulas de farmácia NÃO está no banco — está HARDCODED no frontend `artifacts/padcom/src/pages/prescricao/data.ts` (~843 linhas, ~70 fórmulas com body em texto). O banco guarda prescrição EMITIDA, não o catálogo-mestre.

Tabelas Drizzle (lib/db/src/schema): clients, substances, professionals, locations, protocols(+items), sessions(+substance_applications), ras, ras_evolutivo, stock, payments, validation_codes, nursing_assessments, task_cards, client_ratings, pharmacies, prescriptions(+prescription_items+recipes), sncr(ranges+log), dispatch.

Mapeamento dos 6 domínios da Onda 1:
- fórmula de farmácia / manipulada única: SIM (prescriptions/prescription_items/recipes; item livre).
- blend: PARCIAL — só TEXTO no nome/body da fórmula em data.ts; sem estrutura de ativos (IHE tem formula_blend com 63 ativos estruturados).
- injetável IM/EV/SC: PARCIAL — modelo de SESSÃO IV (substances.procedureType default 'iv' + protocols/sessions/substance_applications); via é texto livre, não distingue IM/EV/SC forte.
- implante: NÃO EXISTE (sem tabela, sem categoria).
- pedido de exames: QUASE NÃO — só clients.examRequestsFolderId (pasta Drive) + ras_evolutivo.examReminderSent (flag); sem entidade/catálogo de exames; sem rota de exames.

GAPS para receber a transmutação:
1. SEM IMPORTADOR (chupa-cabra): nenhum script/seed/migration/rota que leia JSON externo. Maior bloqueio.
2. Sem depósito do catálogo no banco (fórmulas vivem no frontend).
3. Blend estruturado inexistente; implante inexistente; pedido de exames inexistente.
4. De-para de campos IHE↔Manager (codigo_semantico/codigo_padcom, posologia) precisa ser criado.
5. RISCO paciente: clients.cpf é NOT NULL UNIQUE → REJEITA a base do IHE (há paciente sem CPF e CPF repetido mãe/filha). Precisa afrouxar + de-dup inteligente (ver ras-import-duplicatas).

O que é BOM e NÃO pode regredir (Onda 1.b):
- SNCR talão REAL com range (sncr_ranges/sncr_log) — superior ao SNCR sintético "WL-" do IHE.
- Fluxo ANVISA (cor) + Drive + dispatch_log (envio à farmácia).
- Motor de sessões IV (protocols/sessions/substance_applications).
- RAS + RAS evolutivo + códigos de validação (alert color, progresso, aderência).
- Integrações Google Calendar/Drive/Email já ligadas.

Ponte de comunicação: não dá pra falar com o agente Manager direto; a "transmutação a 3" passa pelo Caio relê/cola mensagens entre os dois repls. Eu leio o repo do Manager via GitHub raw; entrego specs em docs/dr-replit/PARA_MANAGER e publico no raw.
