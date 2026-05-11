-- Migration 033 — Wave 10 Fase B Dia 2 (11/mai/2026)
-- Sujeira detectada no disparo real Caminho B: constraint papel_check da Wave 10 F1
-- não foi atualizado pra incluir os papéis novos CLINICA_ECNPJ e FARMACIA_ECNPJ
-- usados pelos use cases F3.A (enviarPARQ) e F3.C (enviarOrcamentoFarmaceutico).
-- Resultado: ZapSign criou envelope (cobrou R$ 0,50) mas INSERT do signatário
-- farmácia falhou (status 'check constraint violado'), deixando estado parcial.
-- Aditivo: DROP+ADD constraint com mesmo nome (única tabela com 1 linha PACIENTE
-- válido em ambos os universos — sem perda). REGRA FERRO mantida: nenhum drop de
-- coluna, nenhuma perda de dado. Comentário registra histórico v1 → v2.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assinatura_signatarios_papel_check'
  ) THEN
    ALTER TABLE assinatura_signatarios
      DROP CONSTRAINT assinatura_signatarios_papel_check;
  END IF;
END $$;

ALTER TABLE assinatura_signatarios
  ADD CONSTRAINT assinatura_signatarios_papel_check
  CHECK (papel = ANY (ARRAY[
    'PACIENTE'::text,
    'MEDICO'::text,
    'CLINICA'::text,
    'CLINICA_ECNPJ'::text,
    'FARMACIA_ECNPJ'::text,
    'TESTEMUNHA'::text,
    'RESPONSAVEL_LEGAL'::text
  ]));

COMMENT ON CONSTRAINT assinatura_signatarios_papel_check
  ON assinatura_signatarios IS
  'v2 (Wave 10 F033): adicionados CLINICA_ECNPJ e FARMACIA_ECNPJ pra suportar use cases F3.A enviarPARQ + F3.C enviarOrcamentoFarmaceutico. v1 (Wave 10 F031) só tinha PACIENTE/MEDICO/CLINICA/TESTEMUNHA/RESPONSAVEL_LEGAL — bloqueava farmácia ICP-Brasil.';
