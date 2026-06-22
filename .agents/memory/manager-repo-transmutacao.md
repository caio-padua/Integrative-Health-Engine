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

PACOTE EXAMES (CARTA_04, 15/06/2026) — exame no IHE tem DUAS subdivisões: (1) GRADE DE BLOCOS = `bloco_oficial`/`grau_do_bloco`/`ordem_no_bloco` (1 oficial por exame) + ponte MUITOS-PARA-MUITOS `mapa_bloco_exame` (mesmo exame em vários blocos navegáveis; BASE INTEGRATIVA tem 44 na ponte vs 15 oficiais → ponte é TABELA, não coluna); (2) AGRUPAMENTO CLÍNICO = `grupo_principal`(30) + `subgrupo`(43). Ganchos do motor de anamnese JÁ existem em exames_base e vão no transplante: `gatilho_por_sintoma/doenca/historico_familiar/check_up` + `tipo_indicacao` + `hd_1/cid_1`. Decisão de transmutação: tipar ~50 colunas navegáveis + coluna `payload_ihe` jsonb (linha IHE inteira, rede de segurança, nada se perde) + coluna `gancho_anamnese_ref` TEXT nullable RESERVADA (elo futuro com motor de anamnese local sem nova migration). Braço entregue: `codigo/schema_exames_endovenosos_ihe.ts` (5 tabelas: catalogo_exames 280, catalogo_analitos 304, catalogo_exame_blocos 409 ponte, catalogo_exame_direcao 54, catalogo_endovenosos 63) + `codigo/importar_exames_endovenosos_ihe.ts` (upsert idempotente por id_ihe, baixa os 2 JSON do raw). Procedimentos no IHE NÃO têm catálogo dedicado: = implantes 32 + protocolos 11 (já nos 457) + aplicação de injetáveis/soros; "existir na tela" depende do ESPELHAMENTO depósito→substances. Exports: exames_export_26.06.15.json (4 coleções) + endovenosos_export_26.06.15.json (63).

DIVISÃO DO TRABALHO (decidida 15/06/2026): EU (Pawards/IHE) escrevo o "braço" pronto (código) e o Manager só puxa, encaixa e RODA — porque a escrita no banco/execução TEM que ser no repl dele (banco e código dele, inalcançáveis daqui). Braço entregue em `docs/dr-replit/PARA_MANAGER/codigo/` (publicado no raw branch ver-l2-dr-claude): `schema_catalogo_ihe.ts` (7 tabelas-depósito aditivas), `clients_PATCH.md` (afrouxar cpf/email/phone + 4 colunas aditivas), `importar_transmutacao_ihe.ts` (importador idempotente via tsx que baixa os 2 JSON do raw), `README_TRANSPLANTE.md` (4 passos). Formato fiel ao Manager: Drizzle + `drizzle-kit push` (sem SQL) + script `tsx` em `@workspace/scripts`. Idempotência: catálogo por upsert (codigo_padcom/codigo_semantico/sigla/codigo_blend), paciente por codigoOrigemIhe + regra de-dup 6.3.

ATUALIZACAO 22/06/2026 — REPO RENOMEADO p/ "PAXTER" e MUITO mais maduro (verificado lendo o codigo, nao supondo). CORRIGE pontos STALE acima:
- Catalogo NAO esta mais hardcoded no frontend: ha rotas reais catalogs.ts + substances.ts (catalogo no banco). O import da transmutacao pegou.
- clients.cpf agora e so `text("cpf")` — SEM NOT NULL, SEM UNIQUE. A trava que rejeitava a base do IHE/Padua CAIU; base ja pode entrar.
- MOTOR DE ANAMNESE REAL existe: artifacts/api-server/src/lib/motor-anamnese.ts (computeMotor): escore por bloco + grade global (faixas 1/7/15/25) + amarracoes pergunta->sintoma + pergunta->doenca + doenca.blocoMotor->exames (ate 40). Usado em rotas mega-anamnese.ts + anamnese-portal.ts. GAP CHAVE: sugere SO EXAME — grep por formula/injetavel/implante/protocolo no motor = VAZIO. Peca a "somar do Pawards" = amarracao multi-procedimento.
- Assinatura: Paxter assina ICP-Brasil NATIVO (lib/pdf-signer.ts: pdf-lib + node-forge + @signpdf, certificado A1 .pfx, PAdES, exige CERT_PASSWORD/CERT_PATH). NAO usa ZapSign (grep zapsign no repo = ZERO). Pedido do CEO "ICP-Brasil pronto no Paxter" JA atendido pelo caminho nativo.
- Motor de valores REAL: lib/budget-calc.ts (centavos, desconto por item escada de sessoes + bonus de carrinho + cenarios pagamento A/B/C + calculadora livre + teto). E preco de VENDA ao cliente; ponte custo-farmacia<->preco ainda a ligar.
- Integracoes reais confirmadas: Gmail (google-gmail+email-service), Drive, Calendar, WhatsApp(Twilio), SNCR(+alerts), ANVISA(anvisa-catalog), pharmacy-email, portal cliente.
- DIVIDA: professionals.role = `text("role").notNull().default("executor")` — VIOLA regra de ferro do CEO (nunca role, sempre perfil). Corrigir na fusao.
- DESIGN oposto: Paxter = 3D skeuomorfico (relevo/LED/dourado/navy, cantos arredondados, skill-layout-paxter); Pawards = PENUMBRA flat 0px JetBrains Mono. Decisao de marca pendente (recomendei vestir PENUMBRA).
- CEO quer OPERAR no Paxter ANTES do Pawards (1 clinica = Instituto Padua; Pawards multi grande demais p/ ele se localizar). Doc comparativo escrito em docs/dr-replit/PARA_PAXTER/03_ANALISE_RIGOROSA_PAWARDS_VS_PAXTER_26.06.22.md.
