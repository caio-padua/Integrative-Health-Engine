import { Router } from "express";
import { db } from "@workspace/db";
import { substanciasTable, insertSubstanciaSchema } from "@workspace/db/schema";
import { eq, ilike, sql } from "drizzle-orm";

const router = Router();

router.get("/substancias", async (req, res) => {
  const { search, categoria, via } = req.query;
  let query = db.select().from(substanciasTable);

  const conditions: any[] = [];
  if (search) conditions.push(ilike(substanciasTable.nome, `%${search}%`));
  if (categoria) conditions.push(eq(substanciasTable.categoria, String(categoria)));
  if (via) conditions.push(eq(substanciasTable.via, String(via)));

  let result;
  if (conditions.length > 0) {
    result = await query.where(sql`${sql.join(conditions, sql` AND `)}`);
  } else {
    result = await query;
  }
  res.json(result);
});

router.post("/substancias", async (req, res) => {
  const parsed = insertSubstanciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [created] = await db.insert(substanciasTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.get("/substancias/:id", async (req, res) => {
  const [sub] = await db.select().from(substanciasTable).where(eq(substanciasTable.id, Number(req.params.id)));
  if (!sub) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(sub);
});

router.put("/substancias/:id", async (req, res) => {
  const [updated] = await db.update(substanciasTable).set(req.body).where(eq(substanciasTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

router.patch("/substancias/:id", async (req, res) => {
  const allowedFields = [
    "nome", "abreviacao", "codigoSemantico", "categoria", "categoriaDetalhada", "cor",
    "dosePadrao", "unidadeDose", "via", "duracaoMinutos", "precoReferencia",
    "maxSessoesPorSemana", "intervaloDias", "estoqueQuantidade", "estoqueUnidade",
    "descricao", "funcaoPrincipal", "efeitosPercebidos", "tempoParaEfeito",
    "classificacaoEstrelas", "efeitosSistemasCorporais", "beneficioLongevidade",
    "impactoQualidadeVida", "beneficioSono", "beneficioEnergia", "beneficioLibido",
    "performanceFisica", "forcaMuscular", "clarezaMental", "peleCabeloUnhas",
    "suporteImunologico", "contraindicacoes", "evidenciaCientifica", "notas",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
  const [updated] = await db.update(substanciasTable).set(updates).where(eq(substanciasTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

router.delete("/substancias/:id", async (req, res) => {
  const [deleted] = await db.delete(substanciasTable).where(eq(substanciasTable.id, Number(req.params.id))).returning();
  if (!deleted) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json({ message: "Substancia removida" });
});

export default router;
