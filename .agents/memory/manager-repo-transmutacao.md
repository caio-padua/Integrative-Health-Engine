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

IMPORT RODADO (15/06/2026) — verdade pós-execução: depósito do Manager bateu EXATO com o IHE (formulas 54, injetaveis 305, implantes 32, itens 457). PORÉM as telas de atendimento do Manager leem da tabela operacional `substances` (214: 165 IM + 16 EV + 33 implante), NÃO das tabelas-depósito catalogo_*. Logo importar ≠ aparecer na tela: falta ESPELHAR depósito→substances (305 injetaveis + 32 implantes). Exames: o Manager disse "não importado" — IMPRECISO; os 228 itens categoria=exame JÁ entraram no depósito dentro dos 457; o que NÃO foi enviado é a estrutura rica dedicada do IHE (exames_base=280 + analitos_catalogo=304). Endovenosos: IHE tem tabela dedicada `endovenosos`=63 (11 soros + 52 componentes), separada dos 305 injetaveis IM/SC; ficou de fora do run, export gerado em endovenosos_export_26.06.15.json. Pacientes: IHE=5.416 (CPF=4.169) vs Manager recebeu 5.268 → gap de 148, provável rejeição por dedup/constraint clients.cpf no lado dele. Breakdown itens_terapeuticos (coluna é `categoria`, não `tipo`): exame 228, injetavel_im 162, implante 32, formula 13, protocolo 11, injetavel_ev 11.

DIVISÃO DO TRABALHO (decidida 15/06/2026): EU (Pawards/IHE) escrevo o "braço" pronto (código) e o Manager só puxa, encaixa e RODA — porque a escrita no banco/execução TEM que ser no repl dele (banco e código dele, inalcançáveis daqui). Braço entregue em `docs/dr-replit/PARA_MANAGER/codigo/` (publicado no raw branch ver-l2-dr-claude): `schema_catalogo_ihe.ts` (7 tabelas-depósito aditivas), `clients_PATCH.md` (afrouxar cpf/email/phone + 4 colunas aditivas), `importar_transmutacao_ihe.ts` (importador idempotente via tsx que baixa os 2 JSON do raw), `README_TRANSPLANTE.md` (4 passos). Formato fiel ao Manager: Drizzle + `drizzle-kit push` (sem SQL) + script `tsx` em `@workspace/scripts`. Idempotência: catálogo por upsert (codigo_padcom/codigo_semantico/sigla/codigo_blend), paciente por codigoOrigemIhe + regra de-dup 6.3.
