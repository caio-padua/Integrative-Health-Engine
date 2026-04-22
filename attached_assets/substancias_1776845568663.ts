import { Router } from "express";
import { db } from "@workspace/db";
import { substanciasTable, insertSubstanciaSchema } from "@workspace/db/schema";
import { eq, ilike, sql, isNull } from "drizzle-orm";
import { registrarInclusaoSubstancia } from "../lib/cobrancasAuto";

const router = Router();

/**
 * Campos editáveis via PATCH e PUT.
 * Inclui controlado + tipoReceitaAnvisaCodigo para permitir
 * atualização de classificação ANVISA quando a lei muda
 * (ex: Zolpidem passa a ser B1 — Dr. Caio atualiza aqui).
 * deletedAt e criadoEm são gerenciados pelo sistema, nunca pelo cliente.
 *
 * Fix Dr. Claude audit 22/abr/2026:
 *   - controlado e tipoReceitaAnvisaCodigo adicionados (Correção 1)
 *   - PUT passou a usar este mesmo filtro (Correção 2)
 *   - DELETE convertido para soft delete via deletedAt (Correção 3)
 */
const ALLOWED_FIELDS = [
  "nome", "abreviacao", "codigoSemantico", "categoria", "categoriaDetalhada", "cor",
  "dosePadrao", "unidadeDose", "via", "duracaoMinutos", "precoReferencia",
  "maxSessoesPorSemana", "intervaloDias", "estoqueQuantidade", "estoqueUnidade",
  "descricao", "funcaoPrincipal", "efeitosPercebidos", "tempoParaEfeito",
  "classificacaoEstrelas", "efeitosSistemasCorporais", "beneficioLongevidade",
  "impactoQualidadeVida", "beneficioSono", "beneficioEnergia", "beneficioLibido",
  "performanceFisica", "forcaMuscular", "clarezaMental", "peleCabeloUnhas",
  "suporteImunologico", "contraindicacoes", "evidenciaCientifica", "notas",
  "farmaciaPadrao",
  // CLASSIFICAÇÃO ANVISA — editável pelo CEO quando a lei muda
  "controlado",
  "tipoReceitaAnvisaCodigo",
] as const;

/** Filtra req.body mantendo só campos permitidos. */
function filtrarCampos(body: Record<string, any>): Record<string, any> {
  const updates: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  return updates;
}

// ─────────────────────────────────────────────
// GET /substancias — exclui soft-deleted
// ─────────────────────────────────────────────
router.get("/substancias", async (req, res) => {
  const { search, categoria, via } = req.query;

  const conditions: any[] = [isNull(substanciasTable.deletedAt)];
  if (search)    conditions.push(ilike(substanciasTable.nome, `%${search}%`));
  if (categoria) conditions.push(eq(substanciasTable.categoria, String(categoria)));
  if (via)       conditions.push(eq(substanciasTable.via, String(via)));

  const result = await db
    .select()
    .from(substanciasTable)
    .where(sql`${sql.join(conditions, sql` AND `)}`);

  res.json(result);
});

// ─────────────────────────────────────────────
// POST /substancias — cria + hook cobrança T5
// ─────────────────────────────────────────────
router.post("/substancias", async (req, res) => {
  const parsed = insertSubstanciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [created] = await db.insert(substanciasTable).values(parsed.data).returning();

  // T5 PARMASUPRA-TSUNAMI · hook cobrança automática de inclusão de substância.
  // Defensivo: nunca derruba a resposta principal.
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
    console.warn("[T5] hook cobrança substância falhou (silencioso):", String(e));
  }

  res.status(201).json(created);
});

// ─────────────────────────────────────────────
// GET /substancias/:id — exclui soft-deleted
// ─────────────────────────────────────────────
router.get("/substancias/:id", async (req, res) => {
  const [sub] = await db
    .select()
    .from(substanciasTable)
    .where(
      sql`${eq(substanciasTable.id, Number(req.params.id))} AND ${isNull(substanciasTable.deletedAt)}`
    );
  if (!sub) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(sub);
});

// ─────────────────────────────────────────────
// PUT /substancias/:id — CORREÇÃO 2: usa ALLOWED_FIELDS
// Antes: req.body direto (mass assignment vulnerability).
// Agora: filtra igual ao PATCH.
// ─────────────────────────────────────────────
router.put("/substancias/:id", async (req, res) => {
  const updates = filtrarCampos(req.body);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo permitido para atualizar" });
    return;
  }
  const [updated] = await db
    .update(substanciasTable)
    .set(updates)
    .where(
      sql`${eq(substanciasTable.id, Number(req.params.id))} AND ${isNull(substanciasTable.deletedAt)}`
    )
    .returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

// ─────────────────────────────────────────────
// PATCH /substancias/:id — CORREÇÃO 1: inclui controlado + tipoReceitaAnvisaCodigo
// ─────────────────────────────────────────────
router.patch("/substancias/:id", async (req, res) => {
  const updates = filtrarCampos(req.body);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db
    .update(substanciasTable)
    .set(updates)
    .where(
      sql`${eq(substanciasTable.id, Number(req.params.id))} AND ${isNull(substanciasTable.deletedAt)}`
    )
    .returning();
  if (!updated) { res.status(404).json({ error: "Substancia nao encontrada" }); return; }
  res.json(updated);
});

// ─────────────────────────────────────────────
// DELETE /substancias/:id — CORREÇÃO 3: soft delete via deletedAt
// Antes: db.delete() — apagava permanentemente, deixando FKs órfãs.
// Agora: seta deletedAt = now(). Dados históricos preservados.
// Para reativar: PATCH { deletedAt: null } via rota admin (CEO only).
// ─────────────────────────────────────────────
router.delete("/substancias/:id", async (req, res) => {
  const [deleted] = await db
    .update(substanciasTable)
    .set({ deletedAt: new Date() })
    .where(
      sql`${eq(substanciasTable.id, Number(req.params.id))} AND ${isNull(substanciasTable.deletedAt)}`
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Substancia nao encontrada ou ja desativada" });
    return;
  }
  res.json({
    message: "Substancia desativada (soft delete — dados preservados)",
    id: deleted.id,
    deletedAt: deleted.deletedAt,
  });
});

export default router;
