-- Migration 042 — Wave Cadastro Pádua
-- Aplicada em 2026-05-13 (psql aditivo, REGRA FERRO: zero db:push)
--
-- Trigger BEFORE INSERT/UPDATE em `pacientes` que recalcula
-- `codigo_semantico` automaticamente quando dados crucias mudam:
--   - nome, genero, data_nascimento, cpf, unidade_id
--
-- Decisão Caio (13/mai/2026): se faltar dado crucial no cadastro, o
-- usuário pode continuar mesmo assim — o código fica COM "X" no lugar
-- da peça faltante (ex: PADU-SILV-JOAO-NINF-XXXX-XXXX). Quando o dado
-- for completado depois (UPDATE), o trigger recalcula sozinho.
--
-- Replica a lógica TS de `lib/arquivos/codigoSemantico.ts`:
--   formato: SLUGCLINICA SOBR NOME SEXO AAAA DDDD (separador = espaço)
--   - 4 letras iniciais do slug da clínica (unidades.slug_codigo_semantico)
--   - 4 primeiras letras do último sobrenome (pulando partículas)
--   - 4 primeiras letras do primeiro nome
--   - sexo MASC/FEMI/OUTR/NINF
--   - ano nascimento 4 dígitos ou XXXX
--   - 4 últimos dígitos do CPF ou XXXX
--   - peças < 4 letras → completa com X

-- ---------------------------------------------------------------------------
-- Função pura: limpa string (remove acento, vira maiúscula, só A-Z 0-9 espaço)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_limpar_texto(s text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r text;
BEGIN
  IF s IS NULL THEN RETURN ''; END IF;
  -- remove diacríticos via translate (sem depender de extensão unaccent)
  r := translate(
    upper(s),
    'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝŸáàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
    'AAAAAAEEEEIIIIOOOOOUUUUCNYYAAAAAAEEEEIIIIOOOOOUUUUCNYY'
  );
  r := regexp_replace(r, '[^A-Z0-9 ]', ' ', 'g');
  r := regexp_replace(r, '\s+', ' ', 'g');
  RETURN trim(r);
END;
$$;

-- ---------------------------------------------------------------------------
-- Função pura: completa com X até n caracteres ou trunca
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_completar_x(s text, n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF s IS NULL OR length(s) = 0 THEN RETURN repeat('X', n); END IF;
  IF length(s) >= n THEN RETURN substr(s, 1, n); END IF;
  RETURN s || repeat('X', n - length(s));
END;
$$;

-- ---------------------------------------------------------------------------
-- Função pura: extrai primeiro nome e último sobrenome (pulando partículas)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_dividir_nome(nome_completo text)
RETURNS TABLE(primeiro text, ultimo text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  limpo text;
  palavras text[];
  particulas text[] := ARRAY['DA','DE','DO','DAS','DOS','E','DI','DU','DELLA','DEL','DELLE','DELLI','VAN','VON','LA','LE'];
  i integer;
BEGIN
  limpo := pawards_limpar_texto(nome_completo);
  IF limpo = '' THEN
    RETURN QUERY SELECT 'XXXX'::text, 'XXXX'::text;
    RETURN;
  END IF;
  palavras := string_to_array(limpo, ' ');
  IF array_length(palavras, 1) = 1 THEN
    RETURN QUERY SELECT palavras[1], palavras[1];
    RETURN;
  END IF;
  primeiro := palavras[1];
  ultimo := '';
  FOR i IN REVERSE array_length(palavras, 1) .. 2 LOOP
    IF NOT (palavras[i] = ANY(particulas)) THEN
      ultimo := palavras[i];
      EXIT;
    END IF;
  END LOOP;
  IF ultimo = '' THEN
    ultimo := palavras[array_length(palavras, 1)];
  END IF;
  RETURN QUERY SELECT primeiro, ultimo;
END;
$$;

-- ---------------------------------------------------------------------------
-- Função pura: mapeia sexo → MASC/FEMI/OUTR/NINF
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_mapear_sexo(s text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u text;
BEGIN
  IF s IS NULL OR length(trim(s)) = 0 THEN RETURN 'NINF'; END IF;
  u := upper(trim(s));
  IF u LIKE 'M%' THEN RETURN 'MASC'; END IF;
  IF u LIKE 'F%' THEN RETURN 'FEMI'; END IF;
  IF u IN ('OUTRO','OUTR','O') THEN RETURN 'OUTR'; END IF;
  RETURN 'NINF';
END;
$$;

-- ---------------------------------------------------------------------------
-- Função principal: gera o código semântico completo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_gerar_codigo_semantico(
  slug_clinica text,
  nome_completo text,
  sexo text,
  data_nasc date,
  cpf text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug4 text;
  divisao record;
  sobr4 text;
  nome4 text;
  sexo4 text;
  ano4 text;
  cpf4 text;
  cpf_digitos text;
BEGIN
  slug4 := pawards_completar_x(regexp_replace(pawards_limpar_texto(slug_clinica), '\s', '', 'g'), 4);
  SELECT * INTO divisao FROM pawards_dividir_nome(nome_completo);
  sobr4 := pawards_completar_x(divisao.ultimo, 4);
  nome4 := pawards_completar_x(divisao.primeiro, 4);
  sexo4 := pawards_mapear_sexo(sexo);

  IF data_nasc IS NULL THEN
    ano4 := 'XXXX';
  ELSE
    ano4 := to_char(data_nasc, 'YYYY');
  END IF;

  IF cpf IS NULL THEN
    cpf4 := 'XXXX';
  ELSE
    cpf_digitos := regexp_replace(cpf, '\D', '', 'g');
    IF length(cpf_digitos) < 4 THEN
      cpf4 := 'XXXX';
    ELSE
      cpf4 := right(cpf_digitos, 4);
    END IF;
  END IF;

  RETURN slug4 || ' ' || sobr4 || ' ' || nome4 || ' ' || sexo4 || ' ' || ano4 || ' ' || cpf4;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger function: chama o gerador puxando o slug da unidade
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pawards_trg_recalcular_codigo_semantico()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  slug text;
BEGIN
  -- Recalcula apenas em INSERT, ou em UPDATE quando algum campo crucial mudou
  IF TG_OP = 'UPDATE' THEN
    IF NEW.nome IS NOT DISTINCT FROM OLD.nome
       AND NEW.genero IS NOT DISTINCT FROM OLD.genero
       AND NEW.data_nascimento IS NOT DISTINCT FROM OLD.data_nascimento
       AND NEW.cpf IS NOT DISTINCT FROM OLD.cpf
       AND NEW.unidade_id IS NOT DISTINCT FROM OLD.unidade_id THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT slug_codigo_semantico INTO slug FROM unidades WHERE id = NEW.unidade_id;
  IF slug IS NULL THEN slug := 'XXXX'; END IF;

  NEW.codigo_semantico := pawards_gerar_codigo_semantico(
    slug,
    NEW.nome,
    NEW.genero,
    NEW.data_nascimento,
    NEW.cpf
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger BEFORE INSERT/UPDATE em pacientes (idempotente: drop + create)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pacientes_codigo_semantico ON pacientes;
CREATE TRIGGER trg_pacientes_codigo_semantico
  BEFORE INSERT OR UPDATE OF nome, genero, data_nascimento, cpf, unidade_id
  ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION pawards_trg_recalcular_codigo_semantico();
