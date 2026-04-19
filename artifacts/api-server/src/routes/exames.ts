/**
 * 🧪 EXAMES — Rio dos Analitos, Terços e Anastomose Semântica
 *
 * Aqui o mar de exames se organiza em três correntezas:
 *   1) BLOCOS / FASES  — onde cada exame mora no calendário (mapa_bloco_exame)
 *   2) TERÇOS          — onde cada analito é feliz (analitos_catalogo + ref. lab)
 *   3) ANASTOMOSE      — como um analito alterado disparA sintomas, blocos e
 *                        perfis de risco (matriz_rastreio)
 *
 * Irmãs: examesInteligente.ts (motor IA), direcaoExame.ts (sobe/desce favorável),
 * pedidosExame.ts (operacional). Cunhado por Dr. Caio · base PADCOM v15.x.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/exames/catalogo", async (req, res) => {
  try {
    const { bloco, terco, grupo, q } = req.query as Record<string, string>;
    const result = await db.execute(sql`
      SELECT
        ac.codigo,
        ac.nome,
        ac.grupo,
        ac.unidade_padrao_integrativa AS unidade,
        ac.terco_excelente,
        ac.observacao_clinica,
        ac.origem_referencia,
        ac.ativo,
        df.direcao_favoravel,
        (SELECT json_agg(json_build_object(
            'laboratorio', r.laboratorio,
            'sexo', r.sexo,
            'min', r.valor_min_ref,
            'max', r.valor_max_ref,
            'unidade', r.unidade_origem,
            'idadeMin', r.faixa_etaria_min,
            'idadeMax', r.faixa_etaria_max
         ))
         FROM analitos_referencia_laboratorio r
         WHERE r.analito_codigo = ac.codigo) AS faixas,
        (SELECT json_agg(DISTINCT jsonb_build_object(
            'blocoId', m.bloco_id,
            'nomeBloco', m.nome_bloco,
            'grau', m.grau,
            'ordem', m.ordem_no_bloco
         ))
         FROM mapa_bloco_exame m
         WHERE UPPER(m.nome_exame) = UPPER(ac.nome)
            OR UPPER(m.codigo_padcom) = UPPER(ac.codigo)) AS blocos
      FROM analitos_catalogo ac
      LEFT JOIN direcao_favoravel_exame df
             ON UPPER(df.nome_exame) = UPPER(ac.nome)
      WHERE ac.ativo = true
        ${terco ? sql`AND ac.terco_excelente = ${terco}` : sql``}
        ${grupo ? sql`AND ac.grupo = ${grupo}` : sql``}
        ${q ? sql`AND (ac.nome ILIKE ${'%' + q + '%'} OR ac.codigo ILIKE ${'%' + q + '%'})` : sql``}
      ORDER BY ac.grupo, ac.nome
    `);
    let rows = (result as any).rows ?? result;
    if (bloco) {
      rows = rows.filter((r: any) =>
        Array.isArray(r.blocos) && r.blocos.some((b: any) => b.blocoId === bloco)
      );
    }
    res.json({ total: rows.length, analitos: rows });
  } catch (err: any) {
    console.error("Erro exames/catalogo:", err);
    res.status(500).json({ erro: "Erro interno", detalhe: err.message });
  }
});

router.get("/exames/blocos", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        bloco_id,
        nome_bloco,
        grau,
        count(*) AS total_exames,
        json_agg(DISTINCT nome_exame ORDER BY nome_exame) AS exames
      FROM mapa_bloco_exame
      WHERE ativo = true
      GROUP BY bloco_id, nome_bloco, grau
      ORDER BY bloco_id, grau
    `);
    const rows = (result as any).rows ?? result;
    res.json({ total: rows.length, blocos: rows });
  } catch (err: any) {
    console.error("Erro exames/blocos:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/exames/anastomose/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const analito = await db.execute(sql`
      SELECT * FROM analitos_catalogo WHERE UPPER(codigo) = UPPER(${codigo}) LIMIT 1
    `);
    const a = ((analito as any).rows ?? analito)[0];
    if (!a) return res.status(404).json({ erro: "Analito nao encontrado" });

    const matriz = await db.execute(sql`
      SELECT
        codigo_exame, nome_exame, bloco_oficial, grau_do_bloco,
        sexo_aplicavel, frequencia_protocolo_padua,
        tipo_indicacao, gatilho_por_sintoma, prioridade,
        exame_de_rastreio, perfil_de_risco
      FROM matriz_rastreio
      WHERE UPPER(codigo_exame) = UPPER(${codigo})
         OR UPPER(nome_exame) = UPPER(${a.nome})
    `);

    const base = await db.execute(sql`
      SELECT
        codigo_exame, nome_exame, grupo_principal, subgrupo,
        gatilho_por_sintoma, gatilho_por_doenca,
        gatilho_por_historico_familiar, gatilho_por_check_up,
        perfil_de_risco, justificativa_objetiva, justificativa_narrativa,
        hd_1, cid_1, hd_2, cid_2, hd_3, cid_3
      FROM exames_base
      WHERE UPPER(codigo_exame) = UPPER(${codigo})
         OR UPPER(nome_exame) = UPPER(${a.nome})
      LIMIT 1
    `);

    res.json({
      analito: a,
      matrizRastreio: (matriz as any).rows ?? matriz,
      exameBase: (((base as any).rows ?? base)[0]) || null,
    });
  } catch (err: any) {
    console.error("Erro exames/anastomose:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.put("/exames/catalogo/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { terco_excelente, observacao_clinica, unidade_padrao_integrativa, ativo } = req.body;
    await db.execute(sql`
      UPDATE analitos_catalogo
      SET
        terco_excelente = COALESCE(${terco_excelente}, terco_excelente),
        observacao_clinica = COALESCE(${observacao_clinica}, observacao_clinica),
        unidade_padrao_integrativa = COALESCE(${unidade_padrao_integrativa}, unidade_padrao_integrativa),
        ativo = COALESCE(${ativo}, ativo)
      WHERE UPPER(codigo) = UPPER(${codigo})
    `);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Erro exames/catalogo PUT:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
