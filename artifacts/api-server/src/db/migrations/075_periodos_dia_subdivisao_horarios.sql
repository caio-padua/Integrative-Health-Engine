-- Migration 075: Subdivisão Oficial dos Períodos do Dia (Caio 2026-05-19)
-- Data: 2026-05-19
-- Autor: Dr. Replit (validado por Caio · CEO Instituto Pádua)
--
-- CONTEXTO:
-- A tabela `periodos_dia` é fonte-de-verdade canônica usada por:
--   - prescricao_universal.periodo_id (FK)
--   - bloco_template_dose.periodo_id (FK)
--   - itens_terapeuticos (posologia estruturada)
--   - mensagens_catalogo (categoria=PERIODO) — eixos de mensageria do CEO
--   - remedios_farmacia.periodos_padrao (JSONB com siglas)
--   - suplementos_laboratorio.periodos_padrao (JSONB com siglas)
--
-- O que muda:
--   1) Subdivisão fina da TARDE (era genérico T 13:30-16:59 = 3h30, virou IT+MT)
--   2) Subdivisão fina da NOITE (era IN+N+NF mal distribuídos, virou NO+FN)
--   3) Sigla J → JE (jejum), T → IT (Início da Tarde), IN → MT (Meio da Tarde),
--      N → NO (Noite), NF → FN (Final da Noite), C → CE (Ceia).
--      IM, MM, AL permanecem inalterados.
--   4) Janelas redistribuídas pra cobrir 05:00–00:00 sem buracos nem sobreposição.
--      Madrugada (00:00–04:59) explicitamente vazia — paciente NÃO recebe lembrete dormindo.
--   5) JSONB `periodos_padrao` em remedios_farmacia e suplementos_laboratorio
--      é remapeado pra novas siglas, preservando dados clínicos existentes.
--
-- REGRA FERRO: aditivo + idempotente. Nenhum DROP. Apenas UPDATE de colunas existentes.
-- Os `id` (PKs) e o número de linhas (9) permanecem inalterados, então todas as FKs
-- continuam apontando pra mesma linha lógica.
--
-- SIGLAS ANTIGAS PRESERVADAS NO COMENTÁRIO PRA AUDITORIA E ROLLBACK:
--   J=Jejum → JE, IM=Início Manhã (mantém), MM=Meio Manhã (mantém), AL=Almoço (mantém),
--   T=Tarde → IT (Início da Tarde), IN=Início Noite → MT (Meio da Tarde),
--   N=Noite → NO (Noite), NF=Noite Final → FN (Final da Noite), C=Ceia → CE.

BEGIN;

-- ============================================================================
-- 1) UPDATE periodos_dia — sigla, nome, janela_inicio, janela_fim, descricao
-- ============================================================================

-- id 1: JE (antiga J · Jejum)
UPDATE periodos_dia SET
  sigla = 'JE',
  nome = 'Jejum',
  janela_inicio = '05:00:00',
  janela_fim    = '06:59:00',
  descricao = 'Jejum metabólico, antes do café — máxima biodisponibilidade'
WHERE sigla = 'J';

-- id 2: IM (Início da Manhã — janela ajustada)
UPDATE periodos_dia SET
  nome = 'Início da Manhã',
  janela_inicio = '07:00:00',
  janela_fim    = '08:59:00',
  descricao = 'Café da manhã + ativos matinais (pico de cortisol)'
WHERE sigla = 'IM';

-- id 3: MM (Meio da Manhã — janela ajustada)
UPDATE periodos_dia SET
  nome = 'Meio da Manhã',
  janela_inicio = '09:00:00',
  janela_fim    = '10:59:00',
  descricao = 'Lanche da manhã + foco produtivo pré-almoço'
WHERE sigla = 'MM';

-- id 4: AL (Almoço — janela ajustada)
UPDATE periodos_dia SET
  nome = 'Almoço',
  janela_inicio = '11:00:00',
  janela_fim    = '13:29:00',
  descricao = 'Almoço + janela de digestão ativa'
WHERE sigla = 'AL';

-- id 5: IT (antiga T · Início da Tarde)
UPDATE periodos_dia SET
  sigla = 'IT',
  nome = 'Início da Tarde',
  janela_inicio = '13:30:00',
  janela_fim    = '15:59:00',
  descricao = 'Pós-almoço · pico de sonolência cronobiológica, retomada de foco'
WHERE sigla = 'T';

-- id 6: MT (antiga IN · Meio da Tarde)
UPDATE periodos_dia SET
  sigla = 'MT',
  nome = 'Meio da Tarde',
  janela_inicio = '16:00:00',
  janela_fim    = '17:59:00',
  descricao = 'Lanche da tarde + ativos pré-jantar (transição luz→escuro)'
WHERE sigla = 'IN';

-- id 7: NO (antiga N · Noite)
UPDATE periodos_dia SET
  sigla = 'NO',
  nome = 'Noite',
  janela_inicio = '18:00:00',
  janela_fim    = '19:59:00',
  descricao = 'Jantar + relaxamento'
WHERE sigla = 'N';

-- id 8: FN (antiga NF · Final da Noite)
UPDATE periodos_dia SET
  sigla = 'FN',
  nome = 'Final da Noite',
  janela_inicio = '20:00:00',
  janela_fim    = '22:29:00',
  descricao = 'Pós-jantar · digestão + preparação pro sono (melatonina subindo)'
WHERE sigla = 'NF';

-- id 9: CE (antiga C · Ceia)
UPDATE periodos_dia SET
  sigla = 'CE',
  nome = 'Ceia',
  janela_inicio = '22:30:00',
  janela_fim    = '23:59:00',
  descricao = 'Última dose leve + ativos do sono profundo'
WHERE sigla = 'C';

-- ============================================================================
-- 2) Remap JSONB siglas antigas → novas em catálogos clínicos
-- ============================================================================
-- Estratégia: jsonb_agg com CASE sobre cada elemento do array.
-- Idempotente: se já estiver migrado, CASE cai no ELSE elem e nada muda.

UPDATE remedios_farmacia
SET periodos_padrao = (
  SELECT jsonb_agg(
    CASE elem #>> '{}'
      WHEN 'J'  THEN to_jsonb('JE'::text)
      WHEN 'T'  THEN to_jsonb('IT'::text)
      WHEN 'IN' THEN to_jsonb('MT'::text)
      WHEN 'N'  THEN to_jsonb('NO'::text)
      WHEN 'NF' THEN to_jsonb('FN'::text)
      WHEN 'C'  THEN to_jsonb('CE'::text)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0;

UPDATE suplementos_laboratorio
SET periodos_padrao = (
  SELECT jsonb_agg(
    CASE elem #>> '{}'
      WHEN 'J'  THEN to_jsonb('JE'::text)
      WHEN 'T'  THEN to_jsonb('IT'::text)
      WHEN 'IN' THEN to_jsonb('MT'::text)
      WHEN 'N'  THEN to_jsonb('NO'::text)
      WHEN 'NF' THEN to_jsonb('FN'::text)
      WHEN 'C'  THEN to_jsonb('CE'::text)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0;

-- formulas.periodos_padrao: tabela existe mas 0 linhas com dados (verificado pré-migração).
-- Aplicamos o UPDATE mesmo assim por defesa em profundidade.
UPDATE formulas
SET periodos_padrao = (
  SELECT jsonb_agg(
    CASE elem #>> '{}'
      WHEN 'J'  THEN to_jsonb('JE'::text)
      WHEN 'T'  THEN to_jsonb('IT'::text)
      WHEN 'IN' THEN to_jsonb('MT'::text)
      WHEN 'N'  THEN to_jsonb('NO'::text)
      WHEN 'NF' THEN to_jsonb('FN'::text)
      WHEN 'C'  THEN to_jsonb('CE'::text)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0;

-- ============================================================================
-- 3) Validação final dentro da transação
-- ============================================================================
DO $$
DECLARE
  v_count int;
  v_siglas text;
BEGIN
  SELECT COUNT(*), string_agg(sigla, ',' ORDER BY ordem)
    INTO v_count, v_siglas
    FROM periodos_dia;

  IF v_count <> 9 THEN
    RAISE EXCEPTION 'Migration 075 FALHOU: periodos_dia deveria ter 9 linhas, tem %', v_count;
  END IF;

  IF v_siglas <> 'JE,IM,MM,AL,IT,MT,NO,FN,CE' THEN
    RAISE EXCEPTION 'Migration 075 FALHOU: siglas esperadas JE,IM,MM,AL,IT,MT,NO,FN,CE — encontradas: %', v_siglas;
  END IF;

  RAISE NOTICE 'Migration 075 OK · 9 períodos canônicos · siglas: %', v_siglas;
END$$;

COMMIT;
