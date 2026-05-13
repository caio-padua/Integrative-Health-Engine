# Wave 13 F1 — Foundation Schema RBAC + Kill-Switch + 2FA TOTP

> **Aplicado**: 2026-05-13 (sessão "C" do plano A→B→C autonomia 3h Caio)
> **Origem da decisão**: Caio "sim sim sim" em D7 (01/mai/2026 22:48) →
> `02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` linha 129+
> **Status**: ✅ MERGED no banco de produção do Repl
> **Estado**: F1 fechado · F2/F3/F4 ainda 🟡 PENDENTE

## O que foi feito (escopo F1 apenas — foundation, sem efeito visível)

Migration 044 (`044_wave13_rbac_killswitch_2fa.sql`) aplicada via psql
aditivo IF NOT EXISTS, regra ferro respeitada. **Nenhum middleware foi
ativado** — F1 só prepara o terreno. O comportamento de produção é
idêntico ao de antes (smoke healthz 200, orçamentos/relatório CEO 401).

### Estende `usuarios`
- `perfil_plataforma text NOT NULL DEFAULT 'tenant_user'`
  CHECK ('platform_owner' | 'tenant_admin' | 'tenant_user')
- `totp_secret_cifrado text` (vazio até F3)
- `totp_ativado_em timestamptz`
- `ultimo_login_2fa_em timestamptz`
- **Índice UNIQUE PARCIAL** `uq_platform_owner_unico` garantindo 1 só
  PLATFORM_OWNER ATIVO no sistema todo (defesa em profundidade).

### Estende `unidades`
- `status text NOT NULL DEFAULT 'ATIVO'`
  CHECK ('ATIVO' | 'SUSPENSO' | 'EXCLUIDO_PENDENTE' | 'EXCLUIDO')
- `suspenso_em`, `suspenso_por_usuario_id` (FK), `suspensao_motivo`
- `exclusao_carencia_ate timestamptz` (LGPD art. 16, 30 dias)
- `lgpd_export_url`, `lgpd_export_em`
- Índice `ix_unidades_status`

### Cria `auditoria_kill_switch`
- 8 ações: SUSPENDER, REASSUMIR, EXPORTAR_LGPD, EXCLUIR_AGENDAR,
  EXCLUIR_EXECUTAR, EXCLUIR_CANCELAR, PROMOVER_ADMIN, REBAIXAR_ADMIN
- Captura `ip` + `user_agent` + `metadata jsonb`
- 2 índices (`ix_aud_kill_unidade`, `ix_aud_kill_executor`)

### Promove Caio a PLATFORM_OWNER
- `usuarios.id=1` (`ceo@pawards.com.br`, perfil clínico legado
  `validador_mestre`) recebeu `perfil_plataforma='platform_owner'`.
- `perfil` clínico **NÃO foi alterado** — `perfil_plataforma` é uma
  dimensão ortogonal que NÃO substitui o perfil clínico legado.

## Decisões de naming (regra ferro Caio respeitada)

A fonte do mini-RFC propunha `papel` (palavra portuguesa pra "role").
**Renomeei para `perfil_plataforma`** por 3 motivos:

1. Regra absoluta Caio: campo SEMPRE chamado `perfil`, NUNCA `role` nem
   `papel` (porque `role` se confunde visualmente com termos de
   roteamento backend). `papel` viola a mesma regra por motivo análogo.
2. Convenção lowercase já usada nos 5 perfis legados
   (`medico`, `enfermeira`, `medico_tecnico`, `validador_mestre`,
   `validador_enfermeiro`) — mantida (`platform_owner` etc.).
3. Por ser DIMENSÃO ORTOGONAL ao `perfil` clínico legado, o sufixo
   `_plataforma` deixa explícito que não substitui o campo legado.

## Smoke pós-aplicação (todos VERDES)

| Verificação | Resultado |
|---|---|
| Migration aplicada com 0 erros | ✅ |
| Re-run = idempotente (UPDATE 0) | ✅ |
| 1 platform_owner (Caio), 30 tenant_user | ✅ |
| 17 unidades em status='ATIVO' | ✅ |
| Tabela `auditoria_kill_switch` vazia (correto, sem ações ainda) | ✅ |
| Tentativa de criar 2º owner | ✅ falhou com `unique_violation` |
| Invariantes Wave 9 (8.728 receitas + R$ 2.736.536,10 + 6 triggers) | ✅ |
| Invariantes Wave 10 (9 solic + 1 audit assinatura) | ✅ |
| Invariante Blindagem CEO (1 relatório do dia) | ✅ |
| API healthz 200 + rotas Wave 10 401 sem auth | ✅ |

## O que falta (PENDENTE — espera nova rodada de plano com OK Caio)

### F2 — Middleware enforcement (`requireRole` hierárquico)
- Estender `requireRole.ts` para aceitar gradiente
  `(perfilMinimo: 'platform_owner'|'tenant_admin'|'tenant_user', opts?)`
- Tenant isolation: TENANT_ADMIN/TENANT_USER só vê próprio `unidade_id`
- 2FA gate: PLATFORM_OWNER em ações críticas exige reauth ≤12h
- Retro-compat: rotas atuais usando `requireRole('validador_mestre')`
  continuam funcionando (não muda assinatura, só adiciona overload novo).

### F3 — Endpoints kill-switch + 2FA TOTP
- `POST /platform/tenants/:id/suspender` (+ `/reassumir`)
- `POST /platform/tenants/:id/exportar-lgpd` (ZIP)
- `POST /platform/tenants/:id/excluir-agendar` (+ `/excluir-executar`)
- `POST /platform/2fa/totp/enrollment` (gera secret + QR code)
- `POST /platform/2fa/totp/verify` (valida código 6 dígitos)
- Lib `otpauth` ou `speakeasy` (TOTP RFC 6238)

### F4 — Frontend painel platform owner
- `/platform/tenants` (lista + status badges)
- `/platform/audit/kill-switch` (timeline ações destrutivas)
- `/platform/2fa-setup` (QR code + 6 dígitos confirmação)

## Pra Dr. Claude refinar/contestar nesta rodada

1. **Tom dos enums**: lowercase (`platform_owner`) vs UPPERCASE
   (`PLATFORM_OWNER`)? Optei lowercase pra harmonizar com `perfil`
   legado, mas o `unidades.status` ficou UPPERCASE (`ATIVO`) por
   alinhamento com convenção dos status de receita/assinatura
   (`EMITIDA`, `ASSINADO`, etc.). Inconsistência aceitável ou
   normalizar?
2. **2FA escopo**: F3 enforça 2FA só em PLATFORM_OWNER ou também em
   TENANT_ADMIN com toggle por tenant? Mini-RFC original sugeriu
   "toggle por tenant" — mantém ou simplifica MVP só Caio?
3. **Carência LGPD**: 30 dias (`exclusao_carencia_ate`) é certinho ou
   queremos 15 dias mais agressivo / 90 dias mais defensivo?
4. **Promoção/rebaixamento**: registro em `auditoria_kill_switch`
   com `acao='PROMOVER_ADMIN'/'REBAIXAR_ADMIN'` — esquema OK ou Dr.
   Claude prefere tabela separada de mudanças de perfil?

## Migration aditiva contadora

- Wave 9 (027/028/029/030): mantém receitas + comissão + triggers
- Wave 10 (031/032/034-039): mantém ZapSign + auditoria assinaturas
- Wave Cadastro Pádua (040/041/042): mantém pacientes + fichas
- Wave Blindagem CEO (043): mantém relatório diário
- **Wave 13 F1 (044): foundation RBAC sem efeito comportamental ainda**

