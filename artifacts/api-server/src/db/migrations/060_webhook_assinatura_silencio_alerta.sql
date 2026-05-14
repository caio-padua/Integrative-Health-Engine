-- 060 — Task #256 · Aviso de "webhook ZapSign silenciosamente quebrado".
--
-- Contexto: a Task #129 documentou em
-- `docs/operacoes/zapsign-webhooks-trocar-dominio.md` que quando o
-- dominio Replit muda, a URL configurada no painel ZapSign aponta pra
-- um endpoint que nao existe mais. Resultado: o webhook para de chegar
-- silenciosamente, NENHUMA linha nova entra em `auditoria_assinaturas`,
-- e a fila de assinaturas pendentes infla sem ninguem perceber. Hoje
-- so descobrimos quando alguem repara que a tabela esta vazia ou que
-- o paciente nao recebe nada.
--
-- Esta migration habilita um aviso PROATIVO (cao-de-guarda):
--   1. Amplia o CHECK de `momento` em `assinatura_notificacoes` pra
--      aceitar 'WEBHOOK_ASSINATURA_SILENCIO'.
--   2. Cria texto institucional `WEBHOOK_ASSINATURA_SILENCIO` (canal
--      EMAIL por convencao da chave; o corpo eh reaproveitado pelo
--      WhatsApp).
--   3. Cria tabela `webhook_assinatura_silencio_alertas` com PK em
--      `dia_brt` pra idempotencia: o tick insere
--      `ON CONFLICT DO NOTHING`, garantindo que mesmo rodando varias
--      vezes no mesmo dia (tick a cada 60min), o Caio recebe APENAS
--      1 aviso de silencio por dia — evita tsunami enquanto o webhook
--      continua quebrado.
--
-- Diferenca pra Task #252 (`pdf_upload_resumo_diario_silencio`):
--   aquela vigia silencio do PROPRIO worker do resumo diario; esta
--   vigia silencio do WEBHOOK ZAPSIGN (chegada externa). Sao gatilhos
--   complementares, ambos disparam pra fila assinatura_notificacoes
--   com is_sistema_ceo=true.
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
--   - migration 059 adicionou UPLOAD_PDF_RESUMO_DIARIO_SILENCIO
--   - migration 060 (esta) adiciona WEBHOOK_ASSINATURA_SILENCIO
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
    'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO'::text,
    'WEBHOOK_ASSINATURA_SILENCIO'::text
  ]));

CREATE TABLE IF NOT EXISTS webhook_assinatura_silencio_alertas (
  dia_brt                       DATE PRIMARY KEY,
  horas_janela                  INTEGER NOT NULL,
  pendentes_no_periodo          INTEGER NOT NULL,
  ultima_auditoria_em           TIMESTAMPTZ NULL,
  notificado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE webhook_assinatura_silencio_alertas IS
  'Task #256 — marcador de idempotencia diaria do aviso "webhook ZapSign silenciosamente quebrado". 1 linha por dia (BRT). O worker `webhookAssinaturaSilencio` insere ON CONFLICT DO NOTHING; se ja existe, NAO re-dispara o aviso no mesmo dia, evitando tsunami enquanto o problema persiste.';

COMMENT ON COLUMN webhook_assinatura_silencio_alertas.horas_janela IS
  'Janela em horas configurada via env WEBHOOK_ASSINATURA_SILENCIO_HORAS no instante do disparo (default 24h). Persistida pra rastreabilidade — se mudarmos a config, o historico mantem o valor que valia naquele dia.';

COMMENT ON COLUMN webhook_assinatura_silencio_alertas.pendentes_no_periodo IS
  'Quantas solicitacoes de assinatura estavam em status PENDENTE/ENVIADO/PROCESSANDO no periodo da janela (criadas dentro da janela). Se este numero for >0 E auditoria_assinaturas estiver muda no mesmo periodo, eh sinal forte de webhook quebrado.';

COMMENT ON COLUMN webhook_assinatura_silencio_alertas.ultima_auditoria_em IS
  'Timestamp da ultima linha vista em auditoria_assinaturas.criado_em no instante do disparo (ou NULL se a tabela nunca teve linha). Util pro CEO saber ha quanto tempo exatamente o silencio comecou.';

INSERT INTO assinatura_textos_institucionais
  (codigo, canal, momento, assunto, corpo, fonte_manifesto, ativo, titulo_curto)
VALUES (
  'WEBHOOK_ASSINATURA_SILENCIO',
  'EMAIL',
  'WEBHOOK_ASSINATURA_SILENCIO',
  '[CEO] PAWARDS · Webhook ZapSign silencioso ha {HORAS}h ({PENDENTES} pendentes acumuladas)',
  'Bom dia, Caio.' || E'\n\n' ||
  'Aviso proativo de saude do sistema: NENHUMA linha nova foi gravada em `auditoria_assinaturas` nas ultimas {HORAS} horas.' || E'\n\n' ||
  'No mesmo periodo existem {PENDENTES} solicitacao(oes) de assinatura criadas e ainda em status PENDENTE/ENVIADO/PROCESSANDO — ou seja, deveriam estar gerando callbacks ZapSign que nao estao chegando. Sinal forte de que o webhook esta silenciosamente quebrado.' || E'\n\n' ||
  'Causa mais comum (ver runbook `docs/operacoes/zapsign-webhooks-trocar-dominio.md`, Task #129): a URL configurada no painel ZapSign aponta pra um dominio Replit que mudou. O ZapSign continua entregando POSTs, mas chegam num endpoint que nao existe mais — falha em silencio sem retorno pro emissor.' || E'\n\n' ||
  'Risco: enquanto o webhook estiver mudo, contratos assinados pelos pacientes NUNCA viram CONCLUIDO no nosso lado, o PDF assinado nunca eh baixado pro cofre, e a comissao do consultor nao calcula. Cada hora parada = mais clientes sem visibilidade.' || E'\n\n' ||
  'Acao sugerida: 1) abrir o painel ZapSign e conferir a URL do webhook em Configuracoes > Integracoes; 2) atualizar pra `https://${PAINEL_DOMINIO_ATUAL}/api/webhooks/assinatura/zapsign`; 3) pedir reentrega manual dos eventos pendentes via fila admin.' || E'\n\n' ||
  'Ultima auditoria vista em `auditoria_assinaturas`: {ULTIMA_AUDITORIA}.' || E'\n\n' ||
  '— PAWARDS MEDCORE · aviso automatico Task #256',
  'MANIFESTO ASSINATURA DIGITAL secao 11',
  true,
  'Webhook ZapSign silencioso'
)
ON CONFLICT (codigo) DO NOTHING;
