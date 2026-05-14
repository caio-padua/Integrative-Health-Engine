-- ============================================================================
-- Migration 061 · Task #261 — nome do arquivo do export LGPD
-- ============================================================================
--
-- Origem: Task #261 (botao "Verificar integridade" do export LGPD).
--
-- Falta na migration 051: o nome canonico do arquivo gerado no Drive
-- (`YY.MM.DD HHMMSS EXPORT LGPD [NICK].json`) so existia em memoria
-- (variavel `nomeArquivo` em `lib/arquivos/drive.ts`) e na auditoria
-- (`auditoria_kill_switch.metadata.nome_arquivo`). A tela do platform_owner
-- precisa exibir o nome ao lado do hash + tamanho + data pra prova juridica
-- ("este e o arquivo X gerado em Y, hash Z").
--
-- Adicionamos coluna text + persistimos no UPDATE do POST exportar-lgpd.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Idempotente: re-run = no-op. Linhas antigas ficam NULL (UI mostra "—").
-- ============================================================================

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lgpd_export_nome_arquivo text;

COMMENT ON COLUMN unidades.lgpd_export_nome_arquivo IS
  'Nome canonico do arquivo do export LGPD no Drive (YY.MM.DD HHMMSS EXPORT LGPD [NICK].json). Exibido na tela /plataforma/clinicas pra prova juridica.';
