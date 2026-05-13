-- ============================================================================
-- Migration 051 · Task #136 — LGPD export como arquivo permanente no Drive
-- ============================================================================
--
-- Origem: Task #136 (`.local/tasks/task-136.md`).
--
-- Problema: a v1 do export LGPD (Wave 13 F4) embutia o JSON inteiro como
-- `data:application/json;base64,...` em `unidades.lgpd_export_url`. Pra
-- demos e clínicas pequenas (<1k pacientes) funciona; pra clínicas grandes
-- (Pádua: 4.278 pacientes + auditoria longa) o data: URL fica gigante e
-- infla a coluna inteira (TOAST overflow, replicação lenta, dump pesado).
--
-- Solução: o JSON passa a ser gravado como arquivo permanente no Drive da
-- clínica (pasta "EXPORTS LGPD" sibling de CLIENTES [CLINICA] dentro da
-- pasta da empresa). `lgpd_export_url` guarda só a URL http(s) canônica
-- do arquivo Drive (`webViewLink`). Adicionamos:
--   - `lgpd_export_sha256` — hash SHA-256 do JSON pra prova jurídica de
--     integridade (re-baixar o arquivo, recalcular sha256 → comparar).
--   - `lgpd_export_tamanho_bytes` — tamanho original do JSON em bytes.
--   - `lgpd_export_drive_file_id` — file id no Drive (recuperação se a
--     URL pública mudar; redundância barata).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Idempotente: re-run = no-op.
--
-- Compat: a v1 ainda funciona — o executor (lib/recorrencia/exclusaoCarencia
-- Executor.ts) só checa `lgpd_export_url IS NOT NULL`, não inspeciona o
-- formato. Exports já gravados como data:URL continuam aceitos pra exclusão.
-- ============================================================================

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lgpd_export_sha256        text,
  ADD COLUMN IF NOT EXISTS lgpd_export_tamanho_bytes integer,
  ADD COLUMN IF NOT EXISTS lgpd_export_drive_file_id text;

COMMENT ON COLUMN unidades.lgpd_export_sha256 IS
  'SHA-256 hex do JSON gerado em /exclusao/exportar-lgpd. Prova jurídica de integridade do arquivo no Drive.';
COMMENT ON COLUMN unidades.lgpd_export_tamanho_bytes IS
  'Tamanho em bytes do JSON original (antes de upload). Auditoria + sanity check.';
COMMENT ON COLUMN unidades.lgpd_export_drive_file_id IS
  'File ID do export LGPD no Google Drive (redundância: se webViewLink mudar, recuperamos pelo ID).';
