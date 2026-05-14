-- ============================================================================
-- Migration 068 · Task #274 — Tipo novo de alerta de seguranca:
-- WHATSAPP_CEO_INSTAVEL (rajada de falhas no canal WhatsApp do CEO).
-- ============================================================================
--
-- Contexto:
--   A Task #166 garantiu que falhas isoladas no envio do WhatsApp NUNCA
--   derrubam o login (canal email continua funcionando paralelo).
--   Efeito colateral perigoso: se Twilio/Gupshup ficar fora do ar por
--   horas, o CEO simplesmente para de receber alertas WhatsApp em
--   silencio — porque o canal email continua chegando e ninguem percebe
--   que metade dos avisos criticos nao chega no celular dele. Hoje so
--   descobririamos depois de revisar manualmente
--   `alertas_ceo_seguranca.notif_wpp_falhas` versus `notif_wpp_enviados`.
--
--   Esta migration habilita um cao-de-guarda PROATIVO (worker
--   `whatsappCeoInstavel` Task #274): a cada tick varre as linhas
--   recentes de `alertas_ceo_seguranca` numa janela em horas, soma
--   `notif_wpp_enviados` + `notif_wpp_falhas` e dispara UM alerta
--   quando a taxa de falhas >= LIMIAR_PERCENT (default 50%) e o numero
--   de tentativas total >= MIN_TENTATIVAS (default 5). Idempotencia
--   diaria por PRIMARY KEY (dia_brt) — mesmo rodando 24x no dia, o Caio
--   recebe APENAS 1 aviso "canal WPP CEO instavel" por dia, evitando
--   tsunami enquanto o provedor continua quebrado.
--
-- Diferenca pra alertas pre-existentes:
--   - 2FA_BRUTE_FORCE (Task #143) — alguem tentando arrombar conta.
--   - 2FA_LOGIN_RECUPERACAO (Task #222) — login feito via fluxo de
--     recuperacao de 2FA.
--   - DESTINATARIO_AVISO_QUEBRADO (Task #267) — UM destinatario
--     especifico (email ou tel cadastrado em clinica) com streak de
--     falha em eventos kill-switch.
--   - WHATSAPP_CEO_INSTAVEL (esta) — saude AGREGADA do canal WhatsApp
--     do CEO ao longo de uma janela: NAO eh sobre 1 destinatario nem
--     sobre 1 alerta isolado, eh sobre o provedor estar derrubando
--     muitas mensagens seguidas.
--
-- Aditivo + idempotente (REGRA FERRO Caio mantida — sem db:push, sem
-- DROP de tabela ou de coluna existente, defaults preservam linhas
-- pre-existentes). Invariantes Wave 9 INTOCADOS.
-- REGRA NAMING Caio: nomes semanticos completos sem abreviacao.
-- ============================================================================

-- 1) Estende o CHECK de tipo. Migrations 046 → 055 → 067 ja restringiam
-- aos tipos pre-existentes; aqui adicionamos o quarto. IMPORTANTE:
-- preservar TODOS os tipos historicos no novo CHECK, esquecer um quebra
-- INSERTs pre-existentes em producao.
ALTER TABLE alertas_ceo_seguranca
  DROP CONSTRAINT IF EXISTS alertas_ceo_seguranca_tipo_check;

ALTER TABLE alertas_ceo_seguranca
  ADD CONSTRAINT alertas_ceo_seguranca_tipo_check
  CHECK (tipo IN (
    '2FA_BRUTE_FORCE',
    '2FA_LOGIN_RECUPERACAO',
    'DESTINATARIO_AVISO_QUEBRADO',
    'WHATSAPP_CEO_INSTAVEL'
  ));

COMMENT ON CONSTRAINT alertas_ceo_seguranca_tipo_check ON alertas_ceo_seguranca IS
  'Task #274 - Estende o CHECK das Migrations 046 (Task #143), 055 (Task #222) '
  'e 067 (Task #267) pra aceitar tambem WHATSAPP_CEO_INSTAVEL (worker '
  'whatsappCeoInstavel detectou taxa de falhas WhatsApp >= LIMIAR_PERCENT '
  'na janela observada). Quando aparecer um quinto tipo, adicionar aqui '
  '(sem drop de dados).';

-- 2) Tabela de idempotencia diaria do aviso. Mesma forma da
-- `webhook_assinatura_silencio_alertas` (migration 060): PK em dia_brt
-- + ON CONFLICT DO NOTHING garante 1 disparo por dia mesmo quando o
-- worker roda 30min em 30min.
CREATE TABLE IF NOT EXISTS whatsapp_ceo_instavel_alertas (
  dia_brt                       DATE PRIMARY KEY,
  janela_horas                  INTEGER NOT NULL,
  total_tentativas              INTEGER NOT NULL,
  total_falhas                  INTEGER NOT NULL,
  percentual_falhas             NUMERIC(5,2) NOT NULL,
  limiar_percent                NUMERIC(5,2) NOT NULL,
  alerta_seguranca_id           BIGINT REFERENCES alertas_ceo_seguranca(id),
  notificado_em                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE whatsapp_ceo_instavel_alertas IS
  'Task #274 - Marcador de idempotencia diaria do aviso "canal WhatsApp do '
  'CEO instavel" (rajada de falhas no provedor Twilio/Gupshup). 1 linha por '
  'dia (BRT). O worker whatsappCeoInstavel insere ON CONFLICT DO NOTHING; '
  'se ja existe, NAO re-dispara o aviso no mesmo dia, evitando tsunami '
  'enquanto o provedor continua quebrado.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.janela_horas IS
  'Janela em horas configurada via env WHATSAPP_CEO_INSTAVEL_JANELA_HORAS '
  'no instante do disparo (default 6h). Persistida pra rastreabilidade — '
  'se mudarmos a config, o historico mantem o valor que valia naquele dia.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.total_tentativas IS
  'Soma de notif_wpp_enviados + notif_wpp_falhas das linhas de '
  'alertas_ceo_seguranca criadas DENTRO da janela. Eh o denominador da '
  'taxa de falha — guardado pra auditoria conseguir reproduzir o calculo.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.total_falhas IS
  'Soma de notif_wpp_falhas das linhas observadas. Numerador da taxa.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.percentual_falhas IS
  'total_falhas / total_tentativas * 100, arredondado a 2 casas. Quando '
  '>= limiar_percent E total_tentativas >= minimo configurado, dispara.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.limiar_percent IS
  'Limiar (%) configurado via env WHATSAPP_CEO_INSTAVEL_LIMIAR_PERCENT '
  'no instante do disparo (default 50%). Persistido pra rastreabilidade.';

COMMENT ON COLUMN whatsapp_ceo_instavel_alertas.alerta_seguranca_id IS
  'FK pra linha gerada em alertas_ceo_seguranca (tipo=WHATSAPP_CEO_INSTAVEL) '
  'no mesmo tick. NULL apenas se o INSERT do alerta falhou apos a reserva '
  'da idempotencia (cenario raro, sem rollback porque a transacao envelopa '
  'os dois INSERTs — ver worker).';
