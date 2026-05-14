-- 059 — Task #252 · Aviso de "worker do resumo diario silencioso".
--
-- Contexto: a task #58 + migration 039 criaram o worker
-- `pdfRetryUploadResumoDiario` que insere 1 linha por dia em
-- `pdf_upload_resumo_diario`. A tela `/admin/uploads-pdf-resumo` (task #70)
-- mostra esse historico — mas se o tick agendado cair em silencio (cluster
-- mata o setInterval, env var some, lock distribuido vaza), o Caio so
-- descobre quando ABRIR a tela e notar o gap.
--
-- Esta migration habilita um aviso PROATIVO:
--   1. Amplia o CHECK de `momento` em `assinatura_notificacoes` pra aceitar
--      'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO'.
--   2. Cria texto institucional `UPLOAD_PDF_RESUMO_DIARIO_SILENCIO` (canal
--      EMAIL por convencao da chave; o corpo eh reaproveitado pelo WhatsApp).
--   3. Cria tabela `pdf_upload_resumo_diario_silencio_alertas` com PK em
--      `dia_brt` pra idempotencia: o tick auxiliar insere
--      `ON CONFLICT DO NOTHING`, garantindo que mesmo rodando varias vezes
--      no mesmo dia (tick a cada 60min), o Caio recebe APENAS 1 aviso de
--      silencio por dia — evita tsunami se o worker continuar caido.
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
--   - migration 051 adicionou UPLOAD_PDF_AGUARDANDO_WEBHOOK
--   - migration 059 (esta) adiciona UPLOAD_PDF_RESUMO_DIARIO_SILENCIO
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
    'UPLOAD_PDF_AGUARDANDO_WEBHOOK'::text,
    'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO'::text
  ]));

CREATE TABLE IF NOT EXISTS pdf_upload_resumo_diario_silencio_alertas (
  dia_brt                       DATE PRIMARY KEY,
  dias_sem_resumo               INTEGER NOT NULL,
  total_esgotados_pendentes     INTEGER NOT NULL,
  ultima_entrada_em             TIMESTAMPTZ NULL,
  notificado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdf_upload_resumo_diario_silencio_alertas IS
  'Task #252 — marcador de idempotencia diaria do aviso "resumo diario de PDFs nao foi disparado ha N dias". 1 linha por dia (BRT). Tick auxiliar do worker pdfRetryUploadResumoDiario insere ON CONFLICT DO NOTHING; se ja existe, NAO re-dispara o aviso no mesmo dia.';

COMMENT ON COLUMN pdf_upload_resumo_diario_silencio_alertas.dias_sem_resumo IS
  'Quantos dias completos passaram desde a ultima entrada em pdf_upload_resumo_diario quando o aviso disparou. NULL na origem = nunca rodou; convertido pra valor alto na decisao.';

COMMENT ON COLUMN pdf_upload_resumo_diario_silencio_alertas.ultima_entrada_em IS
  'Timestamp da ultima linha vista em pdf_upload_resumo_diario.notificado_em no instante do disparo (ou NULL se a tabela nunca teve linha).';

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO',
  'EMAIL',
  'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO',
  '[CEO] PAWARDS · Worker do resumo diario de PDFs travados parou ha {DIAS} dias',
  'Bom dia, Caio.' || E'\n\n' ||
  'Aviso proativo de saude do sistema: o worker `pdfRetryUploadResumoDiario` (task #58) NAO escreveu nenhuma linha em `pdf_upload_resumo_diario` nas ultimas {DIAS} dias.' || E'\n\n' ||
  'No mesmo periodo, ja existem {TOTAL_ESGOTADOS} contrato(s) com upload de PDF assinado esgotado nas ultimas 24h — ou seja, o gatilho do worker DEVERIA ter disparado e nao disparou. Sinal forte de que o tick agendado (08:00 BRT) caiu em silencio: cluster matou o setInterval, env var sumiu, lock distribuido vazou ou container reiniciou no horario do tick.' || E'\n\n' ||
  'Risco: enquanto o worker estiver mudo, voce so vai descobrir contratos sem PDF no cofre quando alguem abrir a tela `/admin/uploads-pdf-resumo`. LGPD art. 16 + CFM 1.821/2007 exigem retencao de 20 anos do PDF — gap de cofre = risco juridico cumulativo.' || E'\n\n' ||
  'Acao sugerida: 1) checar se o processo do api-server esta vivo; 2) checar logs do worker `pdfRetryUploadResumoDiario` em busca de excecoes; 3) rodar manualmente via endpoint admin pra confirmar que o codigo ainda funciona.' || E'\n\n' ||
  'Ultima entrada vista em pdf_upload_resumo_diario: {ULTIMA_ENTRADA}.' || E'\n\n' ||
  '— PAWARDS MEDCORE · aviso automatico Task #252',
  'MANIFESTO ASSINATURA DIGITAL secao 10',
  true,
  'Worker resumo diario PDF silencioso'
)
ON CONFLICT (codigo) DO NOTHING;
