-- Migration 071 — Wave 13 TESTE_CANAL_CEO: adiciona o momento usado pelo
-- novo botao "Enviar teste pro CEO" na tela /plataforma/perfil. Sem esse
-- momento, a insercao em assinatura_notificacoes viola o CHECK existente
-- (assinatura_notificacoes_momento_check) e o disparo de teste falha.
--
-- Por que reutilizar a tabela assinatura_notificacoes:
--   Toda a observabilidade (status PENDENTE/PROCESSANDO/ENVIADO/FALHA,
--   resposta_provedor com SID Twilio, erro detalhado, tentativas) ja existe
--   ali e o painel CEO ja sabe ler. Criar tabela nova so pra teste seria
--   duplicar infra.
--
-- Idempotente: DROP/ADD do CHECK em transacao curta. ZERO impacto em
-- linhas existentes (todos os momentos antigos estao na nova lista).
--
-- Aplicado em: 2026-05-17 por Dr. Replit (Wave 13 — teste WhatsApp CEO)
-- Invariantes preservadas: triggers Wave 9 PARQ, 8.728 receitas potenciais.

BEGIN;

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_momento_check;

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
    'WEBHOOK_ASSINATURA_SILENCIO'::text,
    'TESTE_CANAL_CEO'::text
  ]));

-- Indice parcial pra leitura rapida do "ultimo teste do CEO" na UI sem
-- precisar varrer toda a tabela. ORDER BY criado_em DESC LIMIT 1.
CREATE INDEX IF NOT EXISTS assin_notif_teste_canal_ceo_ix
  ON assinatura_notificacoes (criado_em DESC)
  WHERE momento = 'TESTE_CANAL_CEO';

COMMIT;
