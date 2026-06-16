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

## Seguranca confirmada (read do codigo)
- `config.ativa` so e lida no `abrir` do motor (recusa abrir se desativada). NAO gateia
  nenhuma outra rota. `abrir` so e chamado pelo endpoint manual (sem auto-trigger).
  `requireGovernanca` existe mas NAO esta plugado em nenhuma rota (dormente/aditivo).
  Ativar a config so LIGA o recurso de cascata — seguro.
- Isolamento de tenant (`resolverFiltroTenant`): platform_owner/admin veem tudo (usam
  `?unidadeId=` pra refinar); tenant com unidade no JWT tem a unidade FORCADA (ignora
  query param) — fecha IDOR. selo de paciente de outra unidade volta CINZA vazio
  (anti-enumeracao) e validar cross-unidade da 403 "Paciente pertence a outra unidade".
