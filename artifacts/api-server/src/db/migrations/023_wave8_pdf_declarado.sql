-- ════════════════════════════════════════════════════════════════════
-- Migration 023 — Wave 8 PARMAVAULT PDF
-- Adiciona campos prazo_recebimento_dias e parcelas em declarações.
--
-- Aprovado: Manifesto Dilúvio Planetário (Dr. Claude → Caio → Dr. Replit) Onda 3
-- REGRA FERRO: aditivo, idempotente, IF NOT EXISTS.
--
-- Uso: PDF de reunião com farmácia mostra prazo + parcelas no rodapé
--      de cada declaração + coluna "Declarado" na tabela página 3.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE parmavault_declaracoes_farmacia
    ADD COLUMN IF NOT EXISTS prazo_recebimento_dias integer,
    ADD COLUMN IF NOT EXISTS parcelas integer DEFAULT 1;

COMMENT ON COLUMN parmavault_declaracoes_farmacia.prazo_recebimento_dias IS
    'Prazo combinado entre clínica e farmácia para receber o repasse, em dias (ex: 30, 45, 60).';
COMMENT ON COLUMN parmavault_declaracoes_farmacia.parcelas IS
    'Número de parcelas que a farmácia paga o repasse (default 1 = à vista).';
