-- 079_unificacao_questionario_tipo_evento.sql
-- Wave Dashboard Local + Pulso Diário (21/mai/2026)
-- Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md (P006)
--
-- Unifica o catálogo de questionário num só (questionario_master) com
-- flag `aplicavel_em` indicando em quais contextos cada pergunta aparece.
-- Antes existiam catálogos divergentes (anamnese inicial × acompanhamento)
-- com 80%+ de overlap em texto, gerando duplicidade e drift semântico.
--
-- IMPORTANTE (regra Caio 21/mai): a fonte de verdade adicional pra
-- perguntas vem da planilha de cadastro do Drive (`ficha_cadastral_sheet_id`
-- em pacientes). Próxima task: garantir que TODAS as perguntas do cadastro
-- Drive estejam em questionario_master marcadas com aplicavel_em='INICIAL'
-- (mais ACOMPANHAMENTO quando faz sentido — sintomas, hábitos). NÃO REMOVER
-- nada existente, só ADICIONAR o que falta. Vira P009 em
-- docs/dr-replit/03_PERGUNTAS_PRO_DR_CLAUDE.md (aguardando export da planilha).
--
-- Aditiva, sem DROP, sem RENAME, idempotente.

ALTER TABLE questionario_master
  ADD COLUMN IF NOT EXISTS aplicavel_em TEXT[]
  DEFAULT ARRAY['INICIAL', 'ACOMPANHAMENTO'];

ALTER TABLE questionario_respostas
  ADD COLUMN IF NOT EXISTS tipo_evento TEXT
  DEFAULT 'ACOMPANHAMENTO';

-- CHECK constraint adicionada separadamente pra ser idempotente (ADD
-- CONSTRAINT IF NOT EXISTS não existe em Postgres < 9.6; usamos DO block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questionario_respostas_tipo_evento_check'
  ) THEN
    ALTER TABLE questionario_respostas
      ADD CONSTRAINT questionario_respostas_tipo_evento_check
      CHECK (tipo_evento IN ('INICIAL', 'ACOMPANHAMENTO', 'TRIAGEM'));
  END IF;
END $$;

COMMENT ON COLUMN questionario_master.aplicavel_em IS
  'Contextos onde a pergunta aparece. Valores válidos: INICIAL (anamnese de entrada), ACOMPANHAMENTO (consultas de retorno + portal Pulso Diário), TRIAGEM (pré-cadastro). Default cobre INICIAL+ACOMPANHAMENTO.';

COMMENT ON COLUMN questionario_respostas.tipo_evento IS
  'Em qual contexto esta resposta específica foi colhida. Filtragem temporal do dashboard usa esta coluna pra separar snapshot inicial × série temporal de acompanhamento.';

-- Backfill conservador: respostas existentes ganham 'ACOMPANHAMENTO'
-- por default. A PRIMEIRA resposta de cada paciente (data mais antiga
-- por paciente_id) reclassifica pra 'INICIAL'. Sem WHERE = roda em
-- tudo, mas só uma vez (idempotente porque CTE usa MIN data).
WITH primeira_resposta AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY paciente_id ORDER BY criado_em ASC NULLS LAST) AS rn
    FROM questionario_respostas
  ) t WHERE rn = 1
)
UPDATE questionario_respostas qr
SET tipo_evento = 'INICIAL'
FROM primeira_resposta pr
WHERE qr.id = pr.id
  AND qr.tipo_evento = 'ACOMPANHAMENTO';
