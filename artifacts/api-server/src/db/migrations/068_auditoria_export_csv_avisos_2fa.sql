-- Task #276 - Registrar quem baixou o CSV de avisos 2FA na auditoria.
--
-- O export GET /api/plataforma/seguranca/avisos-2fa.csv (Task #169) carrega
-- dados sensiveis (emails do CEO/owners, timestamps de login 2FA, status dos
-- canais de aviso) e nao deixava trilha de quem baixou. LGPD pede "quem viu
-- o que e quando" — entao essa migration so amplia o CHECK de
-- `auditoria_kill_switch.acao` pra aceitar a nova acao
-- `EXPORT_CSV_AVISOS_2FA`. A escrita em si fica na rota.
--
-- Aditiva (so DROP+ADD do CHECK) e idempotente. Nao mexe em dados nem
-- adiciona/remove colunas. Re-run = no-op.

ALTER TABLE auditoria_kill_switch DROP CONSTRAINT IF EXISTS auditoria_kill_switch_acao_check;
ALTER TABLE auditoria_kill_switch ADD CONSTRAINT auditoria_kill_switch_acao_check
  CHECK (acao IN (
    'SUSPENDER','REASSUMIR','EXPORTAR_LGPD',
    'EXCLUIR_AGENDAR','EXCLUIR_EXECUTAR','EXCLUIR_CANCELAR',
    'PROMOVER_ADMIN','REBAIXAR_ADMIN',
    'FORCAR_LOGOUT',
    'EXPORT_CSV_AVISOS_2FA'
  ));
