-- =====================================================================
-- 004 — Atualizar identidade do CEO Dr. Caio
-- =====================================================================
-- Caio confirmou os valores corretos da sua conta:
--   email: ceo@pawards.com.br
--   nome:  Dr Caio Henrique Fernandes Padua  (corrige typo "PaduX")
--
-- Idempotente: roda quantas vezes quiser. Atualiza pelo id=1 (CEO fixo
-- do projeto) e tambem pelo email antigo, caso o id varie em algum
-- ambiente. PRESERVA o id serial e todas as FKs (auditor_mensagens.
-- ceo_usuario_id, sessoes, etc).
-- =====================================================================

UPDATE usuarios
   SET email = 'ceo@pawards.com.br',
       nome  = 'Dr Caio Henrique Fernandes Padua'
 WHERE id = 1
   AND (email <> 'ceo@pawards.com.br' OR nome <> 'Dr Caio Henrique Fernandes Padua');
