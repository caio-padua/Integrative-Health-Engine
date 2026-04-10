import { Router } from "express";
import { db } from "@workspace/db";
import {
  avaliacoesClienteTable, insertAvaliacaoClienteSchema,
  pacientesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq, desc, and, avg } from "drizzle-orm";

const router = Router();

router.get("/avaliacoes-cliente", async (req, res) => {
  const { pacienteId, profissionalId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(avaliacoesClienteTable.pacienteId, Number(pacienteId)));
  if (profissionalId) conditions.push(eq(avaliacoesClienteTable.profissionalId, Number(profissionalId)));

  const result = await db
    .select({
      avaliacao: avaliacoesClienteTable,
      pacienteNome: pacientesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(avaliacoesClienteTable)
    .leftJoin(pacientesTable, eq(avaliacoesClienteTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(avaliacoesClienteTable.profissionalId, usuariosTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(avaliacoesClienteTable.criadoEm));

  res.json(result);
});

router.get("/avaliacoes-cliente/ranking", async (_req, res) => {
  const result = await db
    .select({
      profissionalId: avaliacoesClienteTable.profissionalId,
      profissionalNome: usuariosTable.nome,
      mediaNota: avg(avaliacoesClienteTable.nota),
    })
    .from(avaliacoesClienteTable)
    .leftJoin(usuariosTable, eq(avaliacoesClienteTable.profissionalId, usuariosTable.id))
    .groupBy(avaliacoesClienteTable.profissionalId, usuariosTable.nome)
    .orderBy(desc(avg(avaliacoesClienteTable.nota)));

  res.json(result);
});

router.post("/avaliacoes-cliente", async (req, res) => {
  const parsed = insertAvaliacaoClienteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  if (parsed.data.nota < 0 || parsed.data.nota > 5) {
    res.status(400).json({ error: "Nota deve ser entre 0 e 5" });
    return;
  }

  const [created] = await db.insert(avaliacoesClienteTable).values(parsed.data).returning();
  res.status(201).json(created);
});

export default router;
