-- =============================================================================
-- Seed 008 — Onda ALAGAMENTO · 21/abr/2026 noite
-- Popula bloco_template + ativos + semana + dose a partir dos 12 formula_blend
-- proprietários do Dr. Caio.
-- IDEMPOTENTE: skip por titulo_apelido já existente; recria filhos se vazio.
-- ZERO ALTER, ZERO db:push — só INSERTs.
-- =============================================================================

DO $$
DECLARE
  rec RECORD;
  bloco_id INTEGER;
  semana_id INTEGER;
BEGIN
  -- Tabela temporária com o mapeamento dos 12 blends
  CREATE TEMP TABLE _seed_blocos (
    abrev          text,
    apelido        text,
    forma          text,
    ativos         text[],     -- nomes dos ativos
    doses_mg       numeric[],  -- doses em mg, mesma cardinalidade de ativos
    qtd_doses_dia  int,        -- doses totais por dia
    periodos       int[]       -- ids de periodos_dia (1=J, 2=IM, ..., 8=NF, 9=C)
  ) ON COMMIT DROP;

  INSERT INTO _seed_blocos VALUES
    ('SONO','Blend Sono Noite','CAPSULA',
      ARRAY['Magnésio Bisglicinato','L-Teanina','Melatonina','Camomila Extrato'],
      ARRAY[300,200,3,100], 1, ARRAY[8]),
    ('FOCO','Blend Foco Dia','CAPSULA',
      ARRAY['L-Tirosina','Cafeína Anidra','Bacopa Monnieri','Vitamina B6'],
      ARRAY[500,100,150,10], 2, ARRAY[2,3]),
    ('META','Blend Metabólico','CAPSULA',
      ARRAY['Berberina','Cromo Picolinato','Ácido Alfa-Lipóico','Inositol'],
      ARRAY[500,200,300,500], 2, ARRAY[2,4]),
    ('HEPA','Blend Hepático','CAPSULA',
      ARRAY['NAC','Cardo Mariano','Curcumina','Glutationa'],
      ARRAY[600,300,500,250], 1, ARRAY[1]),
    ('AOX','Antioxidante Master','CAPSULA',
      ARRAY['Resveratrol','Astaxantina','CoQ10','Vitamina C Lipossomal'],
      ARRAY[200,12,100,500], 1, ARRAY[4]),
    ('NEUR','Neuroprotetora','CAPSULA',
      ARRAY['Lion''s Mane','Ômega-3 EPA/DHA','Fosfatidilserina','Acetil-L-Carnitina'],
      ARRAY[1000,1000,100,500], 2, ARRAY[2,5]),
    ('HRMF','Suporte Hormonal Feminino','CAPSULA',
      ARRAY['Vitex Agnus','DIM','Maca Peruana','Vitamina B6'],
      ARRAY[400,200,500,25], 1, ARRAY[2]),
    ('IMUN','Imunomoduladora','LIQUIDO',
      ARRAY['Própolis Verde','Equinácea','Sabugueiro','Zinco Quelato'],
      ARRAY[30,20,100,15], 1, ARRAY[2]),
    ('DETO','Hepato-Detox','PO',
      ARRAY['Sulforafano','Brócolis Pó','Beterraba Pó','Espirulina'],
      ARRAY[100,2000,3000,1500], 1, ARRAY[1]),
    ('SLEP','Sono Reparador','CAPSULA',
      ARRAY['Glicina','GABA','5-HTP','Valeriana'],
      ARRAY[1000,500,100,300], 1, ARRAY[8]),
    ('MTBI','Metabólica Integrativa','CAPSULA',
      ARRAY['Berberina','Mioinositol','Magnésio Treonato','Vitamina D3'],
      ARRAY[500,1000,200,2000], 2, ARRAY[2,5]),
    ('HRMM','Suporte Hormonal Masculino','CAPSULA',
      ARRAY['Tongkat Ali','Zinco Quelato','Boro','Ashwagandha KSM-66'],
      ARRAY[400,30,3,600], 1, ARRAY[2]);

  FOR rec IN SELECT * FROM _seed_blocos LOOP
    -- pula se ja existe
    SELECT id INTO bloco_id FROM bloco_template WHERE titulo_apelido = rec.apelido LIMIT 1;
    IF bloco_id IS NULL THEN
      INSERT INTO bloco_template (
        titulo_categoria, titulo_abrev_principal, titulo_apelido,
        tipo_bloco, tipo_receita_id, via_administracao, forma_farmaceutica,
        veiculo_excipiente, apresentacao, qtd_doses, duracao_dias,
        favorito, contagem_uso, ativo, criado_em, atualizado_em
      ) VALUES (
        'FÓRMULA', rec.abrev, rec.apelido,
        'MANIPULADO_FARMACIA', 9, 'ORAL', rec.forma,
        CASE rec.forma WHEN 'CAPSULA' THEN 'cápsula vegetal qsp 500mg'
                       WHEN 'LIQUIDO' THEN 'solução hidroalcoólica 30ml'
                       WHEN 'PO' THEN 'sachê dose única 5g' END,
        rec.forma || ' magistral FAMA',
        30, 30,
        false, 0, true, now(), now()
      ) RETURNING id INTO bloco_id;

      -- ativos do bloco
      FOR i IN 1..array_length(rec.ativos, 1) LOOP
        INSERT INTO bloco_template_ativo (
          bloco_template_id, ordem, nome_ativo, dose_valor, dose_unidade,
          tipo_receita_anvisa_codigo, farmacia_padrao, controlado
        ) VALUES (
          bloco_id, i, rec.ativos[i], rec.doses_mg[i],
          CASE rec.forma WHEN 'LIQUIDO' THEN 'gotas' WHEN 'PO' THEN 'mg' ELSE 'mg' END,
          'MAGISTRAL', 'FAMA', false
        );
      END LOOP;

      -- semana 1 ativa (dose plena)
      INSERT INTO bloco_template_semana (bloco_template_id, numero_semana, ativa, observacao)
        VALUES (bloco_id, 1, true, 'Semana 1 — dose plena')
        RETURNING id INTO semana_id;

      -- doses por periodo na semana 1
      FOR i IN 1..array_length(rec.periodos, 1) LOOP
        INSERT INTO bloco_template_dose (semana_id, periodo_id, qtd_doses)
          VALUES (semana_id, rec.periodos[i], 1);
      END LOOP;

      RAISE NOTICE 'Bloco criado: % (id=%, ativos=%)',
        rec.apelido, bloco_id, array_length(rec.ativos, 1);
    ELSE
      RAISE NOTICE 'Bloco ja existe, pulando: % (id=%)', rec.apelido, bloco_id;
    END IF;
  END LOOP;
END $$;

-- Sumario final
SELECT
  (SELECT COUNT(*) FROM bloco_template) AS total_blocos,
  (SELECT COUNT(*) FROM bloco_template_ativo) AS total_ativos,
  (SELECT COUNT(*) FROM bloco_template_semana) AS total_semanas,
  (SELECT COUNT(*) FROM bloco_template_dose) AS total_doses;
