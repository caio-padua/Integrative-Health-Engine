-- 039 — Task #58 · Resumo diario consolidado de uploads de PDF esgotados.
--
-- Contexto: a task #50 (migration 038) ja dispara 1 alerta por evento esgotado
-- via fila `assinatura_notificacoes` momento='UPLOAD_PDF_ESGOTADO'. Em cenario
-- de degradacao em massa (bucket cai de madrugada e 50 webhooks chegam juntos),
-- isso vira 50 e-mails + 50 WhatsApps em sequencia — alerta-tsunami que afoga o
-- sinal no ruido.
--
-- Esta migration habilita um RESUMO DIARIO consolidado:
--   1. Amplia o CHECK de `momento` em `assinatura_notificacoes` pra aceitar
--      'UPLOAD_PDF_RESUMO_DIARIO'.
--   2. Cria texto institucional `UPLOAD_PDF_RESUMO_DIARIO` (canal EMAIL por
--      convencao da chave; o corpo eh reaproveitado pelo WhatsApp).
--   3. Cria tabela auxiliar `pdf_upload_resumo_diario` com PK em `dia_brt`
--      pra idempotencia: o worker insere `ON CONFLICT DO NOTHING`, garantindo
--      que mesmo rodando varias vezes no mesmo dia (ex.: tick horario), o
--      Caio recebe APENAS 1 resumo consolidado por dia.
--
-- Aditivo + idempotente (REGRA FERRO mantida — sem db:push, sem DROP de
-- tabela ou de coluna existente, defaults preservam linhas pre-existentes).

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_momento_check;

ALTER TABLE assinatura_notificacoes
  ADD CONSTRAINT assinatura_notificacoes_momento_check
  CHECK (momento = ANY (ARRAY[
    'ENVIO_INICIAL'::text,
    'POS_ASSINATURA'::text,
    'LEMBRETE'::text,
    'UPLOAD_PDF_ESGOTADO'::text,
    'UPLOAD_PDF_RESUMO_DIARIO'::text
  ]));

CREATE TABLE IF NOT EXISTS pdf_upload_resumo_diario (
  dia_brt          DATE PRIMARY KEY,
  total_esgotados  INTEGER NOT NULL,
  evento_ids       INTEGER[] NOT NULL,
  notificado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdf_upload_resumo_diario IS
  'Task #58 — marcador de idempotencia do resumo diario consolidado de uploads de PDF esgotados. 1 linha por dia (BRT). Worker insere ON CONFLICT DO NOTHING; se ja existe, NAO re-dispara o resumo no mesmo dia.';

COMMENT ON COLUMN pdf_upload_resumo_diario.evento_ids IS
  'IDs dos eventos `assinatura_webhook_eventos` listados no resumo daquele dia (auditoria + cross-reference rapida).';

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'UPLOAD_PDF_RESUMO_DIARIO',
  'EMAIL',
  'UPLOAD_PDF_RESUMO_DIARIO',
  '[CEO] PAWARDS · Resumo diario · {TOTAL} contratos com upload de PDF esgotado',
  'Bom dia, Caio.' || E'\n\n' ||
  'Resumo consolidado das ultimas 24h: {TOTAL} contratos esgotaram as 5 tentativas de upload do PDF assinado pro cofre (Object Storage) e ficaram parados pra inspecao manual.' || E'\n\n' ||
  'Risco: LGPD art. 16 + CFM 1.821/2007 exigem retencao de 20 anos do PDF assinado. Sem o arquivo no cofre, a defensibilidade juridica de cada contrato fica comprometida.' || E'\n\n' ||
  'Acao sugerida: priorizar inspecao do bucket (eventual queda de provedor) e tentar reupload manual nos contratos abaixo a partir da tela de detalhe da assinatura.' || E'\n\n' ||
  '--- contratos esgotados ---' || E'\n' ||
  '{LISTA}',
  'MANIFESTO ASSINATURA DIGITAL secao 10',
  true,
  'Resumo diario PDF nao subiu ao cofre'
)
ON CONFLICT (codigo) DO NOTHING;
