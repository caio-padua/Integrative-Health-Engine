/**
 * CRUD para o painel admin do modulo Assinatura + Juridico.
 * Caio (Onda 6.3): "quero que seja editado os 4 testemunhas, o texto, e como
 * placeholder vai estar integrado com a NF". Tudo editavel pelo painel.
 *
 * Defesa em profundidade:
 *  (1) middleware adminAuth (header X-Admin-Token) - guard fail-closed
 *  (2) sanitizer TS exigirTextoLimpo em todo campo que vai para o paciente
 *  (3) triggers SQL trg_assin_templates_validar / trg_nfe_validar (PG-side)
 *
 * Sem sql.raw - todos os updates parametrizados pelo sql tagged template.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { invalidarCache, exigirTextoLimpo } from "../lib/juridico/sanitizer";
import { adminAuth } from "../middleware/adminAuth";
import { invalidarCacheCategorias } from "../lib/juridico/notaFiscal";

const router: IRouter = Router();
// FIX 22/abr/2026 (Onda PARMASUPRA): trocar gate generico /admin/* por gate
// escopado SO nas rotas deste router. O wildcard /admin estava interceptando
// /admin/permissoes-delegadas e /admin/cobrancas-adicionais (rotas novas com
// requireAuth + requireRole proprios, fluxo JWT). Mantemos fail-closed nas
// rotas antigas que ainda dependem do header X-Admin-Token.
router.use([
  "/admin/testemunhas",
  "/admin/textos",
  "/admin/templates",
  "/admin/categorias-procedimento",
  "/admin/termos-bloqueados",
], adminAuth);

function rows<T>(r: unknown): T[] {
  return (r as { rows?: T[] }).rows || [];
}
function emptyPatch(b: Record<string, unknown> | undefined): boolean {
  return !b || Object.keys(b).filter((k) => b[k] !== undefined).length === 0;
}

// =====================================================================
// TESTEMUNHAS - 4 cadastradas, 2 selecionadas por solicitacao
// =====================================================================

router.get("/admin/testemunhas", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT id, nome_completo, cpf, cargo, email, telefone, ativa, par_preferencial, ordem_assinatura, observacoes FROM assinatura_testemunhas ORDER BY ordem_assinatura, id`);
  res.json({ testemunhas: rows(r) });
});

router.patch("/admin/testemunhas/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const b = req.body as Record<string, unknown>;
  if (emptyPatch(b)) { res.status(400).json({ error: "body vazio - nada para atualizar" }); return; }
  // Texto livre passa pelo sanitizer (nome/cargo/obs aparecem em documentos assinados)
  try {
    for (const f of ["nome_completo", "cargo", "observacoes"] as const) {
      const v = b[f];
      if (typeof v === "string" && v.trim()) await exigirTextoLimpo(v, `testemunha.${f}`);
    }
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }

  const r = await db.execute(sql`
    UPDATE assinatura_testemunhas SET
      nome_completo     = COALESCE(${b["nome_completo"] ?? null}::text, nome_completo),
      cpf               = COALESCE(${b["cpf"] ?? null}::text, cpf),
      cargo             = COALESCE(${b["cargo"] ?? null}::text, cargo),
      email             = COALESCE(${b["email"] ?? null}::text, email),
      telefone          = COALESCE(${b["telefone"] ?? null}::text, telefone),
      ativa             = COALESCE(${b["ativa"] ?? null}::bool, ativa),
      par_preferencial  = COALESCE(${b["par_preferencial"] ?? null}::text, par_preferencial),
      ordem_assinatura  = COALESCE(${b["ordem_assinatura"] ?? null}::int, ordem_assinatura),
      observacoes       = COALESCE(${b["observacoes"] ?? null}::text, observacoes)
    WHERE id = ${id}
    RETURNING *
  `);
  const row = rows(r)[0];
  if (!row) { res.status(404).json({ error: `testemunha id=${id} nao encontrada` }); return; }
  res.json({ testemunha: row });
});

router.post("/admin/testemunhas", async (req: Request, res: Response) => {
  const b = req.body as { nome_completo: string; cpf: string; cargo?: string; email?: string; telefone?: string; par_preferencial?: string; ordem_assinatura?: number };
  if (!b.nome_completo || !b.cpf) { res.status(400).json({ error: "nome_completo e cpf obrigatorios" }); return; }
  try {
    await exigirTextoLimpo(b.nome_completo, "testemunha.nome_completo");
    if (b.cargo) await exigirTextoLimpo(b.cargo, "testemunha.cargo");
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }
  const r = await db.execute(sql`
    INSERT INTO assinatura_testemunhas (nome_completo, cpf, cargo, email, telefone, par_preferencial, ordem_assinatura, ativa)
    VALUES (${b.nome_completo}, ${b.cpf}, ${b.cargo ?? null}, ${b.email ?? null}, ${b.telefone ?? null}, ${b.par_preferencial ?? null}, ${b.ordem_assinatura ?? 0}, true)
    RETURNING *
  `);
  res.json({ testemunha: rows(r)[0] });
});

// =====================================================================
// TEXTOS INSTITUCIONAIS
// =====================================================================

router.get("/admin/textos", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT codigo, canal, momento, assunto, corpo, fonte_manifesto FROM assinatura_textos_institucionais ORDER BY codigo`);
  res.json({ textos: rows(r) });
});

router.patch("/admin/textos/:codigo", async (req: Request, res: Response) => {
  const codigo = String(req.params["codigo"]);
  const b = req.body as { assunto?: string; corpo?: string };
  if (emptyPatch(b as unknown as Record<string, unknown>)) { res.status(400).json({ error: "body vazio - nada para atualizar" }); return; }
  try {
    if (b.corpo) await exigirTextoLimpo(b.corpo, `texto ${codigo}`);
    if (b.assunto) await exigirTextoLimpo(b.assunto, `assunto ${codigo}`);
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }
  const r = await db.execute(sql`
    UPDATE assinatura_textos_institucionais
    SET assunto = COALESCE(${b.assunto ?? null}::text, assunto),
        corpo   = COALESCE(${b.corpo ?? null}::text, corpo)
    WHERE codigo = ${codigo}
    RETURNING codigo, assunto, corpo
  `);
  const row = rows(r)[0];
  if (!row) { res.status(404).json({ error: `texto ${codigo} nao encontrado` }); return; }
  res.json({ texto: row });
});

// =====================================================================
// TEMPLATES (TCLE / contrato / orcamento)
// =====================================================================

router.patch("/admin/templates/:codigo", async (req: Request, res: Response) => {
  const codigo = String(req.params["codigo"]);
  const b = req.body as { conteudo_html?: string; placeholders?: string[]; titulo?: string };
  if (emptyPatch(b as unknown as Record<string, unknown>)) { res.status(400).json({ error: "body vazio - nada para atualizar" }); return; }
  try {
    if (b.conteudo_html) await exigirTextoLimpo(b.conteudo_html, `template ${codigo}`);
    if (b.titulo) await exigirTextoLimpo(b.titulo, `template ${codigo}.titulo`);
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }
  const r = await db.execute(sql`
    UPDATE assinatura_templates
    SET conteudo_html = COALESCE(${b.conteudo_html ?? null}::text, conteudo_html),
        placeholders  = COALESCE(${b.placeholders ?? null}::text[], placeholders),
        titulo        = COALESCE(${b.titulo ?? null}::text, titulo),
        atualizado_em = now()
    WHERE codigo = ${codigo}
    RETURNING codigo, titulo, placeholders
  `);
  const row = rows(r)[0];
  if (!row) { res.status(404).json({ error: `template ${codigo} nao encontrado` }); return; }
  res.json({ template: row });
});

// =====================================================================
// CATEGORIAS DE PROCEDIMENTO (frases por situacao para NF)
// =====================================================================

router.get("/admin/categorias-procedimento", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT codigo, rotulo, ordem, frase_nota_fiscal, frase_acolhimento, frase_convite, ativo, fonte_manifesto FROM procedimento_categorias_nf ORDER BY ordem, id`);
  res.json({ categorias: rows(r) });
});

router.patch("/admin/categorias-procedimento/:codigo", async (req: Request, res: Response) => {
  const codigo = String(req.params["codigo"]);
  const b = req.body as { rotulo?: string; frase_nota_fiscal?: string; frase_acolhimento?: string; frase_convite?: string; ativo?: boolean };
  if (emptyPatch(b as unknown as Record<string, unknown>)) { res.status(400).json({ error: "body vazio - nada para atualizar" }); return; }
  try {
    for (const f of ["frase_nota_fiscal", "frase_acolhimento", "frase_convite"] as const) {
      const v = b[f];
      if (v) await exigirTextoLimpo(v, `categoria ${codigo}.${f}`);
    }
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }
  const r = await db.execute(sql`
    UPDATE procedimento_categorias_nf
    SET rotulo            = COALESCE(${b.rotulo ?? null}::text, rotulo),
        frase_nota_fiscal = COALESCE(${b.frase_nota_fiscal ?? null}::text, frase_nota_fiscal),
        frase_acolhimento = COALESCE(${b.frase_acolhimento ?? null}::text, frase_acolhimento),
        frase_convite     = COALESCE(${b.frase_convite ?? null}::text, frase_convite),
        ativo             = COALESCE(${b.ativo ?? null}::bool, ativo),
        atualizado_em     = now()
    WHERE codigo = ${codigo}
    RETURNING *
  `);
  const row = rows(r)[0];
  if (!row) { res.status(404).json({ error: `categoria ${codigo} nao encontrada` }); return; }
  invalidarCacheCategorias();
  res.json({ categoria: row });
});

// =====================================================================
// CATALOGO JURIDICO
// =====================================================================

router.post("/admin/termos-bloqueados", async (req: Request, res: Response) => {
  const b = req.body as { categoria: string; termo: string; match_tipo?: string; motivo: string };
  if (!b.categoria || !b.termo || !b.motivo) { res.status(400).json({ error: "categoria, termo e motivo obrigatorios" }); return; }
  const r = await db.execute(sql`
    INSERT INTO juridico_termos_bloqueados (categoria, termo, match_tipo, motivo)
    VALUES (${b.categoria}, ${b.termo}, ${b.match_tipo ?? "CONTAINS"}, ${b.motivo})
    ON CONFLICT (categoria, termo) DO UPDATE SET motivo = EXCLUDED.motivo, ativo = true
    RETURNING *
  `);
  invalidarCache();
  res.json({ termo: rows(r)[0] });
});

router.patch("/admin/termos-bloqueados/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const b = req.body as { ativo?: boolean; motivo?: string };
  if (emptyPatch(b as unknown as Record<string, unknown>)) { res.status(400).json({ error: "body vazio" }); return; }
  const r = await db.execute(sql`
    UPDATE juridico_termos_bloqueados
    SET ativo  = COALESCE(${b.ativo ?? null}::bool, ativo),
        motivo = COALESCE(${b.motivo ?? null}::text, motivo)
    WHERE id = ${id}
    RETURNING *
  `);
  const row = rows(r)[0];
  if (!row) { res.status(404).json({ error: `termo id=${id} nao encontrado` }); return; }
  invalidarCache();
  res.json({ termo: row });
});

export default router;
