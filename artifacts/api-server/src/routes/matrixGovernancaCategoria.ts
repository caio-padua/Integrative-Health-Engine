import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/matrix-governanca-categoria", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        m.categoria,
        m.ativo,
        m.atualizado_em,
        m.atualizado_por
      FROM unidades u
      JOIN matrix_governanca_categoria m ON m.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY u.id, m.categoria
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/matrix-governanca-categoria/:unidadeId/:categoria", async (req, res): Promise<void> => {
  const { unidadeId, categoria } = req.params;
  const { ativo, usuario } = req.body ?? {};
  if (typeof ativo !== "boolean") {
    res.status(400).json({ error: "ativo (boolean) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      UPDATE matrix_governanca_categoria
      SET ativo = ${ativo},
          atualizado_em = NOW(),
          atualizado_por = ${usuario ?? "caio"}
      WHERE unidade_id = ${parseInt(unidadeId, 10)} AND categoria = ${categoria}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
