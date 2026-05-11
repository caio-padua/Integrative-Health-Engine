-- Wave 10.5 · Task #38 · Worker daily de verificação dos PDFs assinados no cofre.
--
-- Adiciona 3 colunas auditáveis em `auditoria_assinaturas` que o worker
-- `lib/recorrencia/verificarPdfsCofre.ts` popula uma vez por dia (~03:30 BRT)
-- após percorrer as auditorias dos últimos 30 dias e confirmar via
-- `bucket.file().exists()` que cada `pdf_storage_key` ainda está no bucket
-- `assinaturas-pawards`.
--
-- REGRA FERRO mantida: tudo aditivo, IF NOT EXISTS, zero db:push, zero ALTER
-- destrutivo. Colunas nullable porque auditorias antigas (anteriores a esta
-- migration) ainda não foram verificadas — o próprio worker preenche no
-- primeiro tick que cobrir cada linha dentro da janela de 30 dias.
--
-- Defesa em profundidade do ciclo ZapSign → cofre: se um objeto for apagado
-- por engano ou um upload silencioso falhar (a falha hoje só fica em
-- `assinatura_webhook_eventos.erro_processamento`), ninguém percebe até uma
-- auditoria CFM/judicial tentar baixar o PDF — exatamente quando NÃO pode
-- faltar.

ALTER TABLE auditoria_assinaturas
  ADD COLUMN IF NOT EXISTS pdf_verificado_em   timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_verificado_ok   boolean,
  ADD COLUMN IF NOT EXISTS pdf_verificado_erro text;

-- Índice parcial: só interessa olhar linhas que têm PDF a verificar.
-- Ordem DESC porque o painel CEO (follow-up #47) listará as mais recentes
-- primeiro, e o worker usa pra detectar "quanto tempo desde a última
-- varredura" sem fazer seq scan na tabela inteira.
CREATE INDEX IF NOT EXISTS auditoria_assin_pdf_verif_idx
  ON auditoria_assinaturas (pdf_verificado_em DESC)
  WHERE pdf_storage_key IS NOT NULL;
