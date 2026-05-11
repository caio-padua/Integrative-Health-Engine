-- 038 — Task #50 · Aviso ao CEO quando upload do PDF assinado esgota retries.
--
-- Depois da task #39 o worker `lib/recorrencia/pdfRetryUpload.ts` tenta ate
-- 5x (1min/5min/15min/1h/6h) baixar o PDF assinado e gravar no bucket. Se
-- exceder, o evento ficava parado em `assinatura_webhook_eventos` sem
-- ninguem ser avisado — risco juridico real (LGPD/CFM exigem retencao
-- 20 anos do PDF).
--
-- Esta migration habilita o disparo de notificacao operacional pro CEO
-- (validador_mestre) via fila `assinatura_notificacoes`:
--   1. Amplia o CHECK de `momento` pra aceitar 'UPLOAD_PDF_ESGOTADO'.
--   2. Adiciona coluna `webhook_evento_id` (FK opcional) ligando a
--      notificacao ao evento que esgotou — base pra idempotencia.
--   3. Cria indice UNIQUE parcial garantindo 1 alerta por
--      (evento, canal, destinatario) — mesmo que o worker reprocesse o
--      ciclo, nao spamma o CEO.
--   4. Cadastra texto institucional `UPLOAD_PDF_ESGOTADO` (canal EMAIL
--      por convencao da chave; o corpo serve tambem ao WhatsApp).
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
    'UPLOAD_PDF_ESGOTADO'::text
  ]));

ALTER TABLE assinatura_notificacoes
  ADD COLUMN IF NOT EXISTS webhook_evento_id INTEGER
  REFERENCES assinatura_webhook_eventos(id) ON DELETE SET NULL;

-- Alertas operacionais pro CEO de retry esgotado podem nao ter solicitacao
-- vinculada (ex.: envelope_id ausente no payload, ou solicitacao deletada
-- antes do worker terminar). Pra garantir que o alerta SEMPRE chegue, a
-- coluna passa a aceitar NULL. Linhas paciente-facing pre-existentes
-- continuam preenchidas (FK preservada quando presente). Aditivo, nao
-- destrutivo — apenas afrouxa NOT NULL pra cobrir o caso operacional.
ALTER TABLE assinatura_notificacoes
  ALTER COLUMN solicitacao_id DROP NOT NULL;

COMMENT ON COLUMN assinatura_notificacoes.webhook_evento_id IS
  'Task #50 — quando momento=UPLOAD_PDF_ESGOTADO, referencia o evento de webhook cujo retry de upload no bucket esgotou (assinatura_webhook_eventos.id). Usado pra idempotencia via indice UNIQUE parcial.';

CREATE UNIQUE INDEX IF NOT EXISTS assin_notif_upload_esgotado_uq
  ON assinatura_notificacoes (webhook_evento_id, canal, destinatario)
  WHERE momento = 'UPLOAD_PDF_ESGOTADO' AND webhook_evento_id IS NOT NULL;

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'UPLOAD_PDF_ESGOTADO',
  'EMAIL',
  'UPLOAD_PDF_ESGOTADO',
  '[CEO] PAWARDS · PDF assinado nao subiu ao cofre · acao manual',
  'Atencao: o sistema tentou 5 vezes (1min, 5min, 15min, 1h, 6h) baixar o PDF assinado e gravar no cofre (Object Storage) e nao conseguiu. O evento ficou parado em `assinatura_webhook_eventos` aguardando inspecao manual.' || E'\n\n' ||
  'Risco: LGPD art. 16 + CFM 1.821/2007 exigem retencao de 20 anos do PDF assinado. Sem o arquivo no cofre, a defensibilidade juridica do contrato fica comprometida.' || E'\n\n' ||
  'Acao sugerida: abrir a tela de detalhe da assinatura e tentar reupload manual, ou inspecionar o erro_processamento do evento.',
  'MANIFESTO ASSINATURA DIGITAL secao 10',
  true,
  'PDF assinado nao subiu ao cofre'
)
ON CONFLICT (codigo) DO NOTHING;
