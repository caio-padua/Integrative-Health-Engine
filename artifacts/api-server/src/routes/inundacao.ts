import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/inundacao/status", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT u.id, u.nome,
      u.dono_nome,
      u.autoliberacao,
      (SELECT count(*)::int FROM pacientes p WHERE p.unidade_id=u.id) AS pacientes,
      (SELECT count(*)::int FROM cadernos_documentais c JOIN pacientes p ON p.id=c.paciente_id WHERE p.unidade_id=u.id) AS cadernos,
      (SELECT count(*)::int FROM cadernos_documentais c JOIN pacientes p ON p.id=c.paciente_id WHERE p.unidade_id=u.id AND c.familia='RACL') AS racl,
      (SELECT count(*)::int FROM cadernos_documentais c JOIN pacientes p ON p.id=c.paciente_id WHERE p.unidade_id=u.id AND c.familia='RACJ') AS racj,
      (SELECT count(*)::int FROM arquivos_exames a JOIN pacientes p ON p.id=a.paciente_id WHERE p.unidade_id=u.id) AS exames
    FROM unidades u ORDER BY u.id
  `);

  const totals = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM cadernos_documentais) AS total_cadernos,
      (SELECT count(*)::int FROM cadernos_documentais WHERE status='gerado') AS gerados,
      (SELECT count(*)::int FROM cadernos_documentais WHERE status='pendente') AS pendentes,
      (SELECT count(*)::int FROM arquivos_exames) AS total_exames,
      (SELECT count(*)::int FROM arquivos_exames WHERE status='ANASTOMOSE_PRONTA') AS anastomose_pronta,
      (SELECT count(*)::int FROM tratamentos) AS total_tratamentos,
      (SELECT count(*)::int FROM unidades) AS total_unidades
  `);

  res.json({
    unidades: rows.rows,
    totals: totals.rows[0] ?? {},
  });
});

router.post("/inundacao/disparar", async (_req, res) => {
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE cadernos_documentais
      SET status='gerado', gerado_em=now(),
          metadados = COALESCE(metadados,'{}'::jsonb) || jsonb_build_object(
            'gerado_por','RIO_CAUDALOSO_GENESIS',
            'autorizado_por','admin_global_caio',
            'data_inundacao', now()::text)
      WHERE status='pendente'
    `);

    await tx.execute(sql`
      INSERT INTO tratamentos (paciente_id, nome, status, criado_em)
      SELECT p.id, 'STUB_INUNDACAO', 'ativo', now()
      FROM pacientes p
      WHERE NOT EXISTS (SELECT 1 FROM tratamentos t WHERE t.paciente_id=p.id)
    `);

    const cadernos = await tx.execute(sql`
      WITH templates AS (SELECT DISTINCT sigla, familia FROM cadernos_documentais WHERE origem LIKE 'PADCOM%')
      INSERT INTO cadernos_documentais
        (paciente_id, tratamento_id, familia, sigla, descricao, status,
         gerado_em, emitido_uma_vez, origem, versao_schema, metadados)
      SELECT p.id,
        (SELECT t.id FROM tratamentos t WHERE t.paciente_id=p.id ORDER BY t.id LIMIT 1),
        tpl.familia, tpl.sigla,
        'Caderno '||tpl.sigla||' — Inundação Total → '||u.nome,
        'gerado', now(), false, 'PADCOM_V15.2_RIO', '1.0',
        jsonb_build_object('gerado_por','RIO_CAUDALOSO_GENESIS',
          'autorizado_por','admin_global_caio',
          'unidade_destino', u.id, 'familia', tpl.familia,
          'data_inundacao', now()::text)
      FROM pacientes p JOIN unidades u ON u.id=p.unidade_id CROSS JOIN templates tpl
      WHERE NOT EXISTS (SELECT 1 FROM cadernos_documentais c WHERE c.paciente_id=p.id AND c.sigla=tpl.sigla)
      RETURNING id
    `);

    const exames = await tx.execute(sql`
      INSERT INTO arquivos_exames
        (paciente_id, tipo, nome_exame, status, origem, criado_em, processado_com_ocr, valores_extraidos)
      SELECT pe.paciente_id, 'LABORATORIAL',
        COALESCE(item.value->>'nome', item.value->>'codigo', 'EXAME_'||pe.id),
        'ANASTOMOSE_PRONTA', 'INUNDACAO_GENESIS', now(), true,
        jsonb_build_object('gerado_por','RIO_CAUDALOSO_GENESIS','pedido_exame_id', pe.id,
          'cid_principal', pe.cid_principal, 'hipotese', pe.hipotese_diagnostica,
          'anastomose_semantica', true, 'item_original', item.value)
      FROM pedidos_exame pe, jsonb_array_elements(
        CASE jsonb_typeof(pe.exames) WHEN 'array' THEN pe.exames ELSE '[]'::jsonb END) item
      WHERE NOT EXISTS (SELECT 1 FROM arquivos_exames a
        WHERE a.paciente_id=pe.paciente_id
          AND a.valores_extraidos->>'pedido_exame_id'=pe.id::text
          AND a.nome_exame = COALESCE(item.value->>'nome', item.value->>'codigo', 'EXAME_'||pe.id))
      RETURNING id
    `);

    return { novosCadernos: cadernos.rows.length, novosExames: exames.rows.length };
  });

  res.json({ ok: true, ...result, mensagem: "Inundação Genesis disparada com sucesso" });
});

router.post("/inundacao/dono", async (req, res) => {
  const { unidadeId, donoNome, autoliberacao } = req.body;
  if (!unidadeId || !donoNome) {
    res.status(400).json({ error: "unidadeId e donoNome obrigatórios" });
    return;
  }
  await db.execute(sql`
    UPDATE unidades
    SET dono_nome=${donoNome},
        autoliberacao=${autoliberacao ?? true}
    WHERE id=${unidadeId}
  `);
  res.json({ ok: true });
});

export default router;
