/**
 * 💧 MENSAGENS — CRUD do Catálogo Editável de Comunicação WhatsApp
 *
 * Rio narrativo: este módulo é a fonte de todos os textos que a Beatriz Romanov dispara.
 * Cada bloco editável (período, dia, semana, fala do Dr. Caio, versículo, elogio) vive
 * em mensagens_catalogo, separado por categoria + chave + jsonb conteúdo.
 *
 * Irmãs: alertas.ts (envio), whatsappService.ts (transporte), pacientes (destinatário).
 * Cunhado por Dr. Caio · Sistema PADCON · Beatriz Romanov.
 */
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router = Router();

router.get("/mensagens-catalogo", async (_req, res) => {
  const rows = await db.execute(
    sql`SELECT id, categoria, chave, ordem, conteudo, ativo
        FROM mensagens_catalogo
        WHERE ativo = true
        ORDER BY categoria, ordem, chave`
  );
  const grouped: Record<string, any[]> = {};
  for (const r of (rows as any).rows ?? rows) {
    const cat = (r as any).categoria;
    (grouped[cat] ||= []).push(r);
  }
  res.json(grouped);
});

router.put("/mensagens-catalogo/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { conteudo } = req.body;
  if (!conteudo) {
    res.status(400).json({ error: "conteudo é obrigatório" });
    return;
  }
  await db.execute(
    sql`UPDATE mensagens_catalogo
        SET conteudo = ${JSON.stringify(conteudo)}::jsonb,
            atualizado_em = now()
        WHERE id = ${id}`
  );
  res.json({ ok: true });
});

router.post("/mensagens-catalogo", async (req, res) => {
  const { categoria, chave, ordem, conteudo } = req.body;
  if (!categoria || !chave || !conteudo) {
    res.status(400).json({ error: "categoria, chave e conteudo obrigatórios" });
    return;
  }
  const result = await db.execute(
    sql`INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo)
        VALUES (${categoria}, ${chave}, ${ordem ?? 0}, ${JSON.stringify(conteudo)}::jsonb)
        ON CONFLICT (categoria, chave) DO UPDATE
          SET conteudo = EXCLUDED.conteudo, atualizado_em = now()
        RETURNING *`
  );
  res.json((result as any).rows?.[0] ?? result);
});

router.delete("/mensagens-catalogo/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.execute(
    sql`UPDATE mensagens_catalogo SET ativo = false WHERE id = ${id}`
  );
  res.json({ ok: true });
});

export default router;
