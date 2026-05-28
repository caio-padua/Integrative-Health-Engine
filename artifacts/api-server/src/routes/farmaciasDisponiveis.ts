// ════════════════════════════════════════════════════════════════════
// /api/farmacias-disponiveis
// Endpoint consumido por /prescricao-rapida (clinica-motor) pra popular
// o dropdown FARMÁCIA DESTINO. Sem isto, o frontend mostra "(0 ativas)"
// mesmo com farmácias cadastradas no banco.
//
// Fonte de verdade: tabela farmacias_parmavault (ativo=true). NÃO usa
// farmacias_parceiras (legado de outra wave).
// ════════════════════════════════════════════════════════════════════

import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/farmacias-disponiveis", async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT id, nome_fantasia, cnpj
      FROM farmacias_parmavault
      WHERE ativo = true
      ORDER BY nome_fantasia
    `);
    res.json(r.rows ?? []);
  } catch (err) {
    res.status(500).json({ error: "Erro listando farmácias", detalhe: String(err) });
  }
});

export default router;
