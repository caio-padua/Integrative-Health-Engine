import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { documentosReferenciaTable, CATEGORIAS_DOC_REF, AUTORIA_DOC_REF } from "@workspace/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

const ListQuerySchema = z.object({
  categoria: z.enum(CATEGORIAS_DOC_REF).optional(),
  autoria: z.enum(AUTORIA_DOC_REF).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

router.get("/documentos-referencia", async (req, res) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Parâmetros inválidos", detalhes: parsed.error.flatten() });
  }
  const { categoria, autoria, q, limit } = parsed.data;
  const conds = [];
  if (categoria) conds.push(eq(documentosReferenciaTable.categoria, categoria));
  if (autoria) conds.push(eq(documentosReferenciaTable.autoria, autoria));
  if (q) conds.push(sql`(${documentosReferenciaTable.titulo} ILIKE ${"%" + q + "%"} OR ${documentosReferenciaTable.conteudoCompleto} ILIKE ${"%" + q + "%"})`);

  const rows = await db
    .select({
      id: documentosReferenciaTable.id,
      codigo: documentosReferenciaTable.codigo,
      titulo: documentosReferenciaTable.titulo,
      categoria: documentosReferenciaTable.categoria,
      autoria: documentosReferenciaTable.autoria,
      tipoOrigem: documentosReferenciaTable.tipoOrigem,
      bytes: documentosReferenciaTable.bytes,
      tags: documentosReferenciaTable.tags,
      versao: documentosReferenciaTable.versao,
      criadoEm: documentosReferenciaTable.criadoEm,
      atualizadoEm: documentosReferenciaTable.atualizadoEm,
    })
    .from(documentosReferenciaTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(documentosReferenciaTable.bytes))
    .limit(limit);

  // Totais respeitam os mesmos filtros aplicados ao items (coerência de contrato)
  const totalRow = await db
    .select({ total: sql<number>`COUNT(*)::int`, bytes: sql<number>`COALESCE(SUM(${documentosReferenciaTable.bytes}),0)::int` })
    .from(documentosReferenciaTable)
    .where(conds.length ? and(...conds) : undefined);
  res.json({ items: rows, total: totalRow[0]?.total ?? 0, totalBytes: totalRow[0]?.bytes ?? 0 });
});

router.get("/documentos-referencia/:codigo", async (req, res) => {
  const codigo = String(req.params.codigo || "").trim();
  if (!codigo) return res.status(400).json({ error: "codigo obrigatório" });
  const [row] = await db.select().from(documentosReferenciaTable).where(eq(documentosReferenciaTable.codigo, codigo)).limit(1);
  if (!row) return res.status(404).json({ error: "Documento não encontrado" });
  res.json(row);
});

router.get("/documentos-referencia/_meta/resumo", async (_req, res) => {
  const porCat = await db
    .select({
      categoria: documentosReferenciaTable.categoria,
      count: sql<number>`COUNT(*)::int`,
      bytes: sql<number>`SUM(${documentosReferenciaTable.bytes})::int`,
    })
    .from(documentosReferenciaTable)
    .groupBy(documentosReferenciaTable.categoria);
  const porAutor = await db
    .select({
      autoria: documentosReferenciaTable.autoria,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(documentosReferenciaTable)
    .groupBy(documentosReferenciaTable.autoria);
  res.json({ porCategoria: porCat, porAutoria: porAutor });
});

export default router;
