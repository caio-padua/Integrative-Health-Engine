-- 049 — Task #72 · Aviso ao CEO quando o mesmo upload de PDF assinado eh
-- resetado manualmente 3+ vezes e continua falhando.
--
-- Contexto: a task #57 entregou o reset manual via
-- POST /assinaturas/uploads-falhos/:eventoId/resetar, que zera
-- `tentativas_retry` e incrementa `resets_manuais_count`. Se o Caio aperta
-- "tentar de novo" 3+ vezes e o worker continua falhando, a causa raiz NAO
-- foi resolvida (bucket continua cheio, credencial ainda invalida) e
-- alguem precisa baixar o PDF do ZapSign manualmente. Sem este alerta o
-- CEO queima ciclos clicando em loop sem ninguem subir pra escalar.
--
-- Esta migration:
--   1. Amplia o CHECK de `momento` em `assinatura_notificacoes` pra aceitar
--      'UPLOAD_PDF_RESET_TEIMOSO' (mantem todos os momentos pre-existentes
--      da migration 038).
--   2. Cria indice UNIQUE parcial garantindo 1 alerta por
--      (evento, canal, destinatario) — mesmo que o worker reprocesse o
--      ciclo, ou o operador resete uma 4a/5a vez, nao spamma o CEO.
--   3. Cadastra texto institucional `UPLOAD_PDF_RESET_TEIMOSO` (canal EMAIL
--      por convencao da chave; o corpo serve tambem ao WhatsApp).
--
-- Aditivo + idempotente (REGRA FERRO mantida — sem db:push, sem DROP de
-- tabela ou de coluna existente, defaults preservam linhas pre-existentes).

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_momento_check;

-- IMPORTANTE: o ARRAY abaixo deve preservar TODOS os momentos validos
-- adicionados por migrations anteriores. Em particular:
--   - migration 038 adicionou UPLOAD_PDF_ESGOTADO
--   - migration 039 adicionou UPLOAD_PDF_RESUMO_DIARIO
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
    'UPLOAD_PDF_RESET_TEIMOSO'::text
  ]));

CREATE UNIQUE INDEX IF NOT EXISTS assin_notif_upload_reset_teimoso_uq
  ON assinatura_notificacoes (webhook_evento_id, canal, destinatario)
  WHERE momento = 'UPLOAD_PDF_RESET_TEIMOSO' AND webhook_evento_id IS NOT NULL;

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'UPLOAD_PDF_RESET_TEIMOSO',
  'EMAIL',
  'UPLOAD_PDF_RESET_TEIMOSO',
  '[CEO] PAWARDS · upload de PDF resetado 3+ vezes e continua falhando · escalar',
  'Atencao: o mesmo evento de webhook ja foi resetado manualmente 3 ou mais vezes pelo painel "tentar de novo" e o upload do PDF assinado pro cofre (Object Storage) voltou a falhar. Isso indica que a causa raiz NAO foi resolvida (bucket cheio, credencial revogada, rede ou problema do provedor).' || E'\n\n' ||
  'Risco: LGPD art. 16 + CFM 1.821/2007 exigem retencao de 20 anos do PDF assinado. Continuar clicando em "tentar de novo" sem corrigir a causa raiz so queima ciclos — o arquivo nunca vai subir.' || E'\n\n' ||
  'Acao sugerida: baixar o PDF assinado direto do ZapSign manualmente, anexar ao processo, e investigar a infraestrutura (bucket, credencial, sidecar) antes de tentar reset de novo.',
  'MANIFESTO ASSINATURA DIGITAL secao 10',
  true,
  'Reset de upload teimoso (3+ tentativas)'
)
ON CONFLICT (codigo) DO NOTHING;
