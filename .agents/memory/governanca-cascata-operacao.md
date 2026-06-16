---
name: Governanca cascata — operacao e teste ao vivo
description: Como operar/testar a cascata de governanca do IHE e armadilhas de credenciais no sandbox de execucao.
---

# Governanca cascata — operacao e teste ao vivo

## Pre-requisito operacional (nao obvio)
Cada unidade precisa de PELO MENOS UM operador com acesso a unidade pra cascata rodar.
A unidade 15 (Instituto Padua) tinha pacientes reais mas ZERO usuarios — a cascata
nunca poderia abrir/validar la. Solucao: provisionar um `medico_tecnico` (flags certas:
pode_validar=t, pode_assinar=t, nunca_opera=f) com `unidade_id` da clinica.

**Por que:** a funcao juiza so olha as flags do usuario; o perfil `medico_tecnico` ja
nasce com validar+assinar e nunca_opera=f, entao UM operador desses fecha as 4 etapas
(ENFERMEIRA03→CONSULTOR03→MEDICO03→MEDICO_SENIOR), pois assinar a ultima vira selo VERDE.

## Invariante de banco: UM unico platform_owner
Existe `uq_platform_owner_unico` (unique em perfil_plataforma='platform_owner').
So pode haver UM owner em todo o sistema = o CEO real (id 1). Nao da pra criar
owner-espelho pra teste. Tambem existe `chk_tenant_admin_requer_unidade_id`.

## Credenciais no sandbox de code_execution (armadilha)
- `process.env` é undefined no sandbox.
- `viewEnvVars()` retorna `{envVars, secrets, runtimeManaged}`, mas `secrets` lista
  apenas os NOMES — os VALORES nao vem. Logo NAO da pra mintar JWT (precisa do
  SESSION_SECRET pra HMAC-SHA256).
- **Como obter um JWT pra testar:** logar via API `POST /api/usuarios/login`
  (precisa de um usuario com senha conhecida). O login auto-upgrada senha plaintext
  pra bcrypt no 1o acesso. Pra provar regras de OUTRO usuario (ex: nunca_opera do CEO,
  acesso cross-unidade), crie usuarios-espelho com a flag desejada e logue como eles.

## "Ectoplasmas" do Item 6 NAO sao mock — sao tabelas com gatilho proprio
Erro de premissa comum: achar que tabela com count(0) = ectoplasma/mock. As 4
tabelas-alvo do Item 6 TODAS tem gravador real no codigo; estao vazias so porque
o gatilho real de cada uma ainda nao rodou:
- `auditoria_cascata`: audita MUDANCA DE CONFIG da cascata, NAO decisao. Coluna
  `acao` e enum ['LIGOU','DESLIGOU','ALTEROU'] e `valor_anterior/valor_novo` sao
  BOOLEAN (o flag requer_* que mudou). Gravador: `POST /auditoria-cascata/toggle`
  (so validador_mestre). Forcar decisao da juiza aqui (como o T002 pedia ao pe da
  letra) seria ERRADO: o enum nem aceita "AUTORIZOU/NEGOU". Decisao de etapa vai
  pra `eventos_clinicos` (tipo VALIDACAO_CASCATA) — e isso esta CORRETO.
- `validacoes_humanas_agente`: validacao humana de execucao de agente de IA
  (routes/agentesVirtuais.ts). Outro subsistema (Carta Magna PADCOM).
- `padcom_validacoes_cascata`: cascata PROPRIA do produto PADCOM (UUID varchar,
  sessao_id, certificado_digital; routes/padcom.ts, CRUD completo). Outro produto.
- `auditoria_kill_switch`: auditoria do kill-switch (desligar/religar unidade) —
  apelidada `ln` em todo o codigo (routes/plataforma.ts + workers de recorrencia +
  alerta email CEO). Gatilho = acao de kill-switch numa unidade (destrutivo; NAO
  exercitar em unidade real so pra encher tabela).

**Por que importa:** antes de "exterminar ectoplasma" recriando, cheque se a tabela
ja tem writer. Se tem, encher = exercitar o controle real (ex: toggle de config),
nao escrever codigo novo. count(0) prova "ainda nao usado", nao "mock".

## Kill-switch (suspender/reativar unidade) — como e protegido e como provar
- Endpoints: `POST /api/plataforma/clinicas/:id/suspender` e `.../reativar` (motivo>=8).
  Guardas (plataforma.ts ~ln72): requirePlataforma('platform_owner') + requirePlatform
  OwnerEstrito (perfilPlataforma==='platform_owner' LITERAL, sem atalho admin) +
  require2faRecente(). => So o CEO (unico platform_owner) com 2FA recente dispara.
  No sandbox NAO da pra disparar via HTTP (nao forjar JWT, nao passar 2FA) — e correto.
- Writer: `registrarAuditoria(exec, {...})` faz INSERT em `auditoria_kill_switch`
  (colunas: acao, unidade_id, executado_por_usuario_id, motivo, ip, user_agent,
  metadata jsonb NOT NULL; motivo tambem entra no metadata). Enum acao: SUSPENDER,
  REASSUMIR, EXPORTAR_LGPD, EXCLUIR_*, PROMOVER/REBAIXAR_ADMIN, FORCAR_LOGOUT,
  EXPORT_CSV_AVISOS_2FA. Genesis (genesis_seed, id 14) nao pode ser suspenso.
- Provar vivo SEM ser o CEO: (1) provar 403/401 do guarda com user comum/sem token;
  (2) exercitar a transacao fiel (UPDATE unidades status + INSERT auditoria_kill_switch
  SUSPENDER, depois REASSUMIR) numa UNIDADE DE TESTE DESCARTAVEL (criar uma nova; nunca
  14/15), atribuindo a um usuario de teste (nunca ao CEO id 1 — anti-fantasia).

## Subsistema IA/LLM (agentes virtuais) — "oco": cerebro+musculos, falta a sinapse
- Configs (cerebro) populadas via seed: agentes_clinica, agentes_personalidade
  (formalidade/empatia/autoridade/calor_humano 0-10), agentes_motor_escrita.
- Schema de acao/validacao (musculos) existe mas VAZIO e SEM inserter no runtime:
  execucao_agente, memorias_contextuais_agente, validacoes_humanas_agente (fila
  human-in-the-loop: tipo_validacao, status_validacao aguardando/aprovado/rejeitado/
  corrigido, pergunta_ao_humano/resposta_humano, validado_por_id).
- Falta a "sinapse": um service (ex agenteEngine) que carrega as 3 configs, monta o
  system prompt e chama o LLM, disparado da entrada (routes/whatsapp.ts inbound /
  sessoes). Hoje NENHUMA rota chama LLM. agentesVirtuais.ts e 100% CRUD+seed+stats.
- LLM disponivel SEM key do usuario via Replit AI Integrations (skills ai-integrations-
  anthropic/openai/gemini). => "pre-pronto" = configs seedadas + fila pronta + proxy LLM
  disponivel + 1 ponto de plug documentado. NAO escrever scaffold morto (=ectoplasma).
- NUNCA encher validacoes_humanas_agente/execucao_agente a forca: sem execucao real de
  agente, seria fabricar atividade que nao houve (fantasia proibida pelo CEO).

## Seguranca confirmada (read do codigo)
- `config.ativa` so e lida no `abrir` do motor (recusa abrir se desativada). NAO gateia
  nenhuma outra rota. `abrir` so e chamado pelo endpoint manual (sem auto-trigger).
  `requireGovernanca` existe mas NAO esta plugado em nenhuma rota (dormente/aditivo).
  Ativar a config so LIGA o recurso de cascata — seguro.
- Isolamento de tenant (`resolverFiltroTenant`): platform_owner/admin veem tudo (usam
  `?unidadeId=` pra refinar); tenant com unidade no JWT tem a unidade FORCADA (ignora
  query param) — fecha IDOR. selo de paciente de outra unidade volta CINZA vazio
  (anti-enumeracao) e validar cross-unidade da 403 "Paciente pertence a outra unidade".
