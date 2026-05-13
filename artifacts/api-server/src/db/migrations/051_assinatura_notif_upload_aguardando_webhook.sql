-- 051 — Task #67 · Aviso ao CEO quando upload de PDF assinado fica preso
-- aguardando o ZapSign reentregar o webhook (sem auditoria/manifesto).
--
-- Contexto: a task #39 entregou o worker `lib/recorrencia/pdfRetryUpload.ts`
-- que retenta o upload do PDF assinado pro bucket. Em alguns fluxos o
-- download + upload do PDF dao certo, mas a auditoria (manifesto SHA-256)
-- ainda nao existe — o worker entao grava o sentinel
-- `pdf_upload_falhou_sem_manifesto: aguardando webhook reentregar` e PARA
-- de retentar (porque so o webhook ZapSign eh dono da gravacao do
-- manifesto). A task #50 cobre o caminho `esgotado` (5 retries falharam),
-- mas se o ZapSign nunca reentregar, esse evento morre silenciosamente
-- sem ninguem ser avisado. O Caio so descobre se abrir a tela
-- /assinaturas/uploads-falhos no grupo `aguardando_webhook`.
--
-- Esta migration:
--   1. Amplia o CHECK de `momento` em `assinatura_notificacoes` pra aceitar
--      'UPLOAD_PDF_AGUARDANDO_WEBHOOK' (mantem todos os momentos
--      pre-existentes das migrations 038/039/049).
--   2. Cria indice UNIQUE parcial garantindo 1 alerta por
--      (evento, canal, destinatario) — mesmo que o worker reprocesse o
--      ciclo, nao spamma o CEO.
--   3. Cadastra texto institucional `UPLOAD_PDF_AGUARDANDO_WEBHOOK` (canal
--      EMAIL por convencao da chave; o corpo serve tambem ao WhatsApp).
--
-- Aditivo + idempotente (REGRA FERRO mantida — sem db:push, sem DROP de
-- tabela ou de coluna existente, defaults preservam linhas pre-existentes).

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_momento_check;

-- IMPORTANTE: o ARRAY abaixo deve preservar TODOS os momentos validos
-- adicionados por migrations anteriores. Em particular:
--   - migration 038 adicionou UPLOAD_PDF_ESGOTADO
--   - migration 039 adicionou UPLOAD_PDF_RESUMO_DIARIO
--   - migration 049 adicionou UPLOAD_PDF_RESET_TEIMOSO
-- Esquecer qualquer um deles invalida fluxos pre-existentes (CHECK
-- constraint violation no insert) e quebra workers em producao.
ALTER TABLE assinatura_notificacoes
  ADD CONSTRAINT assinatura_notificacoes_momento_check
  CHECK (momento = ANY (ARRAY[
    'ENVIO_INICIAL'::text,
    'POS_ASSINATURA'::text,
    'LEMBRETE'::text,
    'UPLOAD_PDF_ESGOTADO'::text,
    'UPLOAD_PDF_RESUMO_DIARIO'::text,
    'UPLOAD_PDF_RESET_TEIMOSO'::text,
    'UPLOAD_PDF_AGUARDANDO_WEBHOOK'::text
  ]));

CREATE UNIQUE INDEX IF NOT EXISTS assin_notif_upload_aguardando_webhook_uq
  ON assinatura_notificacoes (webhook_evento_id, canal, destinatario)
  WHERE momento = 'UPLOAD_PDF_AGUARDANDO_WEBHOOK' AND webhook_evento_id IS NOT NULL;

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'UPLOAD_PDF_AGUARDANDO_WEBHOOK',
  'EMAIL',
  'UPLOAD_PDF_AGUARDANDO_WEBHOOK',
  '[CEO] PAWARDS · upload de PDF preso aguardando ZapSign reentregar webhook',
  'Atencao: o upload do PDF assinado pro cofre (Object Storage) deu certo, mas a auditoria (manifesto SHA-256) ainda nao foi gravada porque o webhook ZapSign de "documento assinado" nao chegou. O worker `pdfRetryUpload` PAROU de retentar esse evento (so o webhook eh dono da gravacao do manifesto) e o evento esta aguardando o ZapSign reentregar ha mais de 24 horas.' || E'\n\n' ||
  'Risco: LGPD art. 16 + CFM 1.821/2007 exigem retencao de 20 anos do PDF assinado COM manifesto. Sem o manifesto a defensibilidade juridica do contrato fica comprometida — o arquivo no cofre vira orfao.' || E'\n\n' ||
  'Acao sugerida: abrir a tela /assinaturas/uploads-falhos (grupo "aguardando_webhook"), conferir se o ZapSign mostra o documento como assinado e, se sim, reenviar manualmente o webhook pelo painel ZapSign — ou baixar o PDF + manifesto manualmente.',
  'MANIFESTO ASSINATURA DIGITAL secao 10',
  true,
  'PDF preso aguardando webhook ZapSign'
)
ON CONFLICT (codigo) DO NOTHING;
