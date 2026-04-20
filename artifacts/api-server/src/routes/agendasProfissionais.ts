import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/agendas-profissionais", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        a.id,
        a.unidade_id,
        u.nome AS unidade_nome,
        a.nome,
        a.profissional,
        a.modo,
        a.tipo,
        a.ordem,
        a.ativa
      FROM agendas_profissionais a
      JOIN unidades u ON u.id = a.unidade_id
      ORDER BY u.id, a.ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/agendas-profissionais/resumo", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        COUNT(DISTINCT a.id)::int AS total_agendas,
        COUNT(DISTINCT p.id)::int AS total_pacientes
      FROM unidades u
      LEFT JOIN agendas_profissionais a ON a.unidade_id = u.id
      LEFT JOIN pacientes p ON p.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
