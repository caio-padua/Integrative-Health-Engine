/**
 * 🧬 MENSAGERIA-CORE · rotas REST que consomem o RNA mensageiro
 *
 * Estas rotas demonstram que a mesma gramática usada no Teatro Mensageria
 * (mockup-sandbox canvas) está **literalmente** rodando no backend real,
 * sem cópia de código.
 *
 *   GET  /api/mensageria/canais        → matriz de capacidades por canal
 *   POST /api/mensageria/adaptar       → texto canônico → formato do canal
 *   POST /api/mensageria/proveniencia  → template → linhas (placeholder → tabela.coluna)
 *   GET  /api/mensageria/catalogo/:chave → SELECT do template canônico
 *   PUT  /api/mensageria/catalogo/:chave → UPSERT do template editado
 *                                          (valida via parseInline antes de salvar)
 *
 * Wave RNA mensageiro (19/mai/2026) — Caio (CEO) + Dr. Replit.
 */
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  CANAIS,
  type Canal,
  adaptarParaCanal,
  parseInline,
  tracarProveniencia,
} from "@workspace/mensageria-core";

const router = Router();

const CANAIS_VALIDOS: Canal[] = ["whatsapp", "telegram_mv2", "telegram_html"];
function isCanal(x: unknown): x is Canal {
  return typeof x === "string" && (CANAIS_VALIDOS as string[]).includes(x);
}

// ─── 1) matriz de capacidades ──────────────────────────────────────────
router.get("/canais", (_req, res) => {
  res.json(CANAIS);
});

// ─── 2) adaptar texto canônico para canal ──────────────────────────────
router.post("/adaptar", (req, res) => {
  const { texto, canal } = req.body ?? {};
  if (typeof texto !== "string") {
    res.status(400).json({ error: "texto deve ser string" });
    return;
  }
  if (!isCanal(canal)) {
    res.status(400).json({ error: `canal inválido. use: ${CANAIS_VALIDOS.join(", ")}` });
    return;
  }
  res.json({ canal, texto_canonico: texto, texto_adaptado: adaptarParaCanal(texto, canal) });
});

// ─── 3) rastrear proveniência ──────────────────────────────────────────
router.post("/proveniencia", (req, res) => {
  const { template, valores } = req.body ?? {};
  if (typeof template !== "string") {
    res.status(400).json({ error: "template deve ser string" });
    return;
  }
  const valoresMap: Record<string, string> =
    valores && typeof valores === "object" ? valores : {};
  const linhas = tracarProveniencia(template, (chave) => valoresMap[chave] ?? "");
  res.json({ linhas });
});

// ─── 4) SELECT template canônico (mensagens_catalogo) ──────────────────
router.get("/catalogo/:chave", async (req, res) => {
  const chave = req.params.chave;
  const result = await db.execute(
    sql`SELECT id, categoria, chave, ordem, conteudo, ativo, atualizado_em
        FROM mensagens_catalogo
        WHERE chave = ${chave} AND ativo = true
        LIMIT 1`
  );
  const rows = (result as any).rows ?? result;
  if (!rows || rows.length === 0) {
    res.status(404).json({ error: "template não encontrado", chave });
    return;
  }
  res.json(rows[0]);
});

// ─── 5) UPSERT template editado · valida via parseInline ───────────────
router.put("/catalogo/:chave", async (req, res) => {
  const chave = req.params.chave;
  const { categoria, conteudo, ordem } = req.body ?? {};
  if (typeof categoria !== "string" || typeof conteudo !== "string") {
    res.status(400).json({ error: "categoria e conteudo (string) são obrigatórios" });
    return;
  }
  // Valida gramática inline canônica antes de aceitar UPSERT
  try {
    parseInline(conteudo);
  } catch (e: any) {
    res.status(422).json({ error: "gramática inline inválida", detalhe: e?.message });
    return;
  }
  const payload = JSON.stringify({ texto: conteudo });
  const result = await db.execute(
    sql`INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo, ativo, atualizado_em)
        VALUES (${categoria}, ${chave}, ${ordem ?? 0}, ${payload}::jsonb, true, now())
        ON CONFLICT (categoria, chave) DO UPDATE
          SET conteudo = EXCLUDED.conteudo,
              ordem    = EXCLUDED.ordem,
              ativo    = true,
              atualizado_em = now()
        RETURNING id, categoria, chave, ordem, conteudo, atualizado_em`
  );
  const rows = (result as any).rows ?? result;
  res.json(rows[0] ?? { ok: true });
});

export default router;
