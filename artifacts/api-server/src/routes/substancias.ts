import { Router } from "express";
import { db } from "@workspace/db";
import { substanciasTable, insertSubstanciaSchema } from "@workspace/db/schema";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { registrarInclusaoSubstancia } from "../lib/cobrancasAuto";

const router = Router();

// PARMASUPRA-TSUNAMI WAVE-5 (Dr. Claude audit fix)
// Whitelist unica usada por PUT e PATCH para fechar mass assignment.
// Inclui controlado, tipoReceitaAnvisaCodigo e farmaciaPadrao para que
// a classificacao ANVISA possa ser atualizada quando a lei mudar.
const ALLOWED_FIELDS = [
  "nome", "abreviacao", "codigoSemantico", "categoria", "categoriaDetalhada", "cor",
  "dosePadrao", "unidadeDose", "via", "duracaoMinutos", "precoReferencia",
  "maxSessoesPorSemana", "intervaloDias", "estoqueQuantidade", "estoqueUnidade",
  "descricao", "funcaoPrincipal", "efeitosPercebidos", "tempoParaEfeito",
  "classificacaoEstrelas", "efeitosSistemasCorporais", "beneficioLongevidade",
  "impactoQualidadeVida", "beneficioSono", "beneficioEnergia", "beneficioLibido",
  "performanceFisica", "forcaMuscular", "clarezaMental", "peleCabeloUnhas",
  "suporteImunologico", "contraindicacoes", "evidenciaCientifica", "notas",
  "controlado", "tipoReceitaAnvisaCodigo", "farmaciaPadrao",
] as const;

function filtrarCamposPermitidos(body: any): Record<string, any> {
  const updates: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body?.[key] !== undefined) updates[key] = body[key];
  }
  return updates;
}

router.get("/substancias", async (req, res) => {
  const { search, categoria, via, incluir_removidas } = req.query;
  const conditions: any[] = [];

  // WAVE-5 fix: por padrao filtra soft-deleted; admin pode pedir explicitamente.
  if (incluir_removidas !== "true") {
    conditions.push(isNull(substanciasTable.deletedAt));
  }
  if (search) conditions.push(ilike(substanciasTable.nome, `%${search}%`));
  if (categoria) conditions.push(eq(substanciasTable.categoria, String(categoria)));
  if (via) conditions.push(eq(substanciasTable.via, String(via)));

  const result = conditions.length > 0
    ? await db.select().from(substanciasTable).where(and(...conditions))
    : await db.select().from(substanciasTable);
  res.json(result);
});

router.post("/substancias", async (req, res) => {
  const parsed = insertSubstanciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [created] = await db.insert(substanciasTable).values(parsed.data).returning();

  // T5 PARMASUPRA-TSUNAMI · hook cobranca automatica de inclusao de substancia
  // Defensivo: registrarInclusaoSubstancia trata todos os casos (sem unidade,
  // permissao inativa, ja cobrado, erro interno). Nunca derruba a resposta.
  try {
    const reqUser = (req as any).user;
    const unidadeOrigem =
      reqUser?.unidadeId ??
      (req.body?.unidade_origem ? Number(req.body.unidade_origem) : null);
    const userId = reqUser?.id ?? null;
    const r = await registrarInclusaoSubstancia(unidadeOrigem, created.id, userId);
    if (r.cobrado) res.setHeader("X-Cobranca-Gerada", String(r.cobranca_id));
    res.setHeader("X-Cobranca-Motivo", r.motivo);
  } catch (e) {
    console.warn("[T5] hook cobranca substancia falhou (silencioso):", String(e));
  }

  res.status(201).json(created);
});

router.get("/substancias/:id", async (req, res) => {
  const [sub] = await db.select().from(substanciasTable).where(
    and(
      eq(substanciasTable.id, Number(req.params.id)),
      isNull(substanciasTable.deletedAt),
    ),
  );
  if (!sub) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(sub);
});

router.put("/substancias/:id", async (req, res) => {
  // WAVE-5 fix: PUT agora usa o mesmo filtro do PATCH para fechar
  // a vulnerabilidade de mass assignment apontada pelo code review.
  const updates = filtrarCamposPermitidos(req.body);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo valido para atualizar" });
    return;
  }
  const [updated] = await db.update(substanciasTable)
    .set(updates)
    .where(and(
      eq(substanciasTable.id, Number(req.params.id)),
      isNull(substanciasTable.deletedAt),
    ))
    .returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

router.patch("/substancias/:id", async (req, res) => {
  const updates = filtrarCamposPermitidos(req.body);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db.update(substanciasTable)
    .set(updates)
    .where(and(
      eq(substanciasTable.id, Number(req.params.id)),
      isNull(substanciasTable.deletedAt),
    ))
    .returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

router.delete("/substancias/:id", async (req, res) => {
  // WAVE-5 fix: soft delete em vez de hard delete. Preserva integridade
  // referencial de prescricoes/aplicacoes/estoque historicos. Idempotente:
  // tentar deletar uma ja deletada retorna 404 (filtra deletedAt IS NULL).
  const [deleted] = await db.update(substanciasTable)
    .set({ deletedAt: sql`now()` })
    .where(and(
      eq(substanciasTable.id, Number(req.params.id)),
      isNull(substanciasTable.deletedAt),
    ))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json({ message: "Substancia removida (soft delete)", deletedAt: deleted.deletedAt });
});

export default router;
