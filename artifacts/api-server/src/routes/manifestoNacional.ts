/**
 * Onda 6.5 - Endpoints de leitura do Manifesto Estrategico Nacional,
 * Niveis de Escala, Oportunidades de Entrada e Kaizen Melhorias.
 *
 * Caio: "Implante 100% e coloque kaizen em melhorias".
 * Tudo somente leitura - escrita via SQL/admin (nao expor mutacoes
 * desnecessariamente).
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/manifesto-nacional", async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`SELECT id, codigo, titulo, escopo, versao, conteudo_md, autor, criado_em FROM manifestos_estrategicos WHERE ativo = true ORDER BY criado_em DESC`);
    res.json({ manifestos: (r as any).rows || [] });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/niveis-escala-nacional", async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`SELECT * FROM niveis_escala_nacional WHERE ativo = true ORDER BY ordem`);
    res.json({ niveis: (r as any).rows || [] });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/oportunidades-entrada", async (req: Request, res: Response) => {
  try {
    const nivel = typeof req.query["nivel"] === "string" ? req.query["nivel"] : null;
    const r = nivel
      ? await db.execute(sql`SELECT * FROM oportunidades_entrada_nacional WHERE ativo = true AND nivel_codigo = ${nivel} ORDER BY ticket_estimado_brl`)
      : await db.execute(sql`SELECT * FROM oportunidades_entrada_nacional WHERE ativo = true ORDER BY nivel_codigo, ticket_estimado_brl`);
    res.json({ oportunidades: (r as any).rows || [] });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/kaizen-melhorias", async (req: Request, res: Response) => {
  try {
    const area = typeof req.query["area"] === "string" ? req.query["area"] : null;
    const status = typeof req.query["status"] === "string" ? req.query["status"] : null;
    let rows: any[] = [];
    if (area && status) {
      const r = await db.execute(sql`SELECT * FROM kaizen_melhorias WHERE area = ${area} AND status = ${status} ORDER BY prioridade DESC, identificada_em DESC`);
      rows = (r as any).rows || [];
    } else if (area) {
      const r = await db.execute(sql`SELECT * FROM kaizen_melhorias WHERE area = ${area} ORDER BY prioridade DESC, identificada_em DESC`);
      rows = (r as any).rows || [];
    } else if (status) {
      const r = await db.execute(sql`SELECT * FROM kaizen_melhorias WHERE status = ${status} ORDER BY prioridade DESC, identificada_em DESC`);
      rows = (r as any).rows || [];
    } else {
      const r = await db.execute(sql`SELECT * FROM kaizen_melhorias ORDER BY prioridade DESC, identificada_em DESC`);
      rows = (r as any).rows || [];
    }
    const resumo = await db.execute(sql`SELECT area, status, count(*)::int as total FROM kaizen_melhorias GROUP BY area, status`);
    res.json({ melhorias: rows, resumo: (resumo as any).rows || [] });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

export default router;
