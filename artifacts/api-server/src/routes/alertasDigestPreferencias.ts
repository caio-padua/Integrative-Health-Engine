/**
 * Task #239 — CRUD admin das preferencias por destinatario do digest diario.
 *
 * Endpoints (todos exclusivos do Caio = validador_mestre estrito):
 *   - GET    /admin/alertas-digest-preferencias           lista (envs + persistidas)
 *   - PUT    /admin/alertas-digest-preferencias           upsert por email
 *   - DELETE /admin/alertas-digest-preferencias/:email    remove (= volta ao default "tudo")
 *
 * GET retorna a uniao entre os emails configurados em ENV
 * (CEO_EMAIL + ALERTAS_DIGEST_GESTORES) e os emails que ja tem linha
 * persistida — o Caio enxerga "tudo que recebe digest hoje" num lugar so.
 */

import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";

const router = Router();

interface PrefRow {
  destinatario_email: string;
  nome: string | null;
  recebe_clinicas: boolean;
  recebe_kpis: boolean;
  recebe_pendencias: boolean;
  observacao: string | null;
  atualizado_em: string;
}

function destinatariosDoEnv(): string[] {
  const set = new Set<string>();
  const ceo = (process.env["CEO_EMAIL"] || "ceo@pawards.com.br").trim().toLowerCase();
  if (ceo.includes("@")) set.add(ceo);
  const extras = (process.env["ALERTAS_DIGEST_GESTORES"] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.includes("@"));
  for (const e of extras) set.add(e);
  return Array.from(set);
}

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

router.get(
  "/admin/alertas-digest-preferencias",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    try {
      const persistidas = await pool.query<PrefRow>(
        `SELECT lower(destinatario_email) AS destinatario_email,
                nome, recebe_clinicas, recebe_kpis, recebe_pendencias,
                observacao, atualizado_em
           FROM alertas_digest_preferencias
          ORDER BY destinatario_email ASC`,
      );

      const byEmail = new Map<string, PrefRow>();
      for (const r of persistidas.rows) byEmail.set(r.destinatario_email, r);

      const envEmails = destinatariosDoEnv();
      for (const e of envEmails) {
        if (!byEmail.has(e)) {
          byEmail.set(e, {
            destinatario_email: e,
            nome: null,
            recebe_clinicas: true,
            recebe_kpis: true,
            recebe_pendencias: true,
            observacao: null,
            atualizado_em: "",
          });
        }
      }

      const linhas = Array.from(byEmail.values()).map((r) => ({
        destinatarioEmail: r.destinatario_email,
        nome: r.nome,
        recebeClinicas: !!r.recebe_clinicas,
        recebeKpis: !!r.recebe_kpis,
        recebePendencias: !!r.recebe_pendencias,
        observacao: r.observacao,
        atualizadoEm: r.atualizado_em || null,
        configuradoEnv: envEmails.includes(r.destinatario_email),
        persistido: !!r.atualizado_em,
      }));

      res.json({ ok: true, preferencias: linhas });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

router.put(
  "/admin/alertas-digest-preferencias",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const email = isEmail(body.destinatarioEmail)
      ? String(body.destinatarioEmail).trim().toLowerCase()
      : null;
    if (!email) {
      res.status(400).json({ ok: false, error: "destinatarioEmail invalido" });
      return;
    }
    const recebeClinicas = body.recebeClinicas !== false;
    const recebeKpis = body.recebeKpis !== false;
    const recebePendencias = body.recebePendencias !== false;
    const nome = typeof body.nome === "string" ? body.nome.trim().slice(0, 200) : null;
    const observacao = typeof body.observacao === "string" ? body.observacao.trim().slice(0, 500) : null;

    if (!recebeClinicas && !recebeKpis && !recebePendencias) {
      res.status(400).json({
        ok: false,
        error: "Pelo menos um bloco precisa estar ativo (clinicas, KPIs ou pendencias).",
      });
      return;
    }

    try {
      const r = await pool.query<PrefRow>(
        `INSERT INTO alertas_digest_preferencias
           (destinatario_email, nome, recebe_clinicas, recebe_kpis,
            recebe_pendencias, observacao, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (lower(destinatario_email)) DO UPDATE
           SET nome              = EXCLUDED.nome,
               recebe_clinicas   = EXCLUDED.recebe_clinicas,
               recebe_kpis       = EXCLUDED.recebe_kpis,
               recebe_pendencias = EXCLUDED.recebe_pendencias,
               observacao        = EXCLUDED.observacao,
               atualizado_em     = NOW()
         RETURNING lower(destinatario_email) AS destinatario_email, nome,
                   recebe_clinicas, recebe_kpis, recebe_pendencias,
                   observacao, atualizado_em`,
        [email, nome, recebeClinicas, recebeKpis, recebePendencias, observacao],
      );
      const row = r.rows[0]!;
      res.json({
        ok: true,
        preferencia: {
          destinatarioEmail: row.destinatario_email,
          nome: row.nome,
          recebeClinicas: !!row.recebe_clinicas,
          recebeKpis: !!row.recebe_kpis,
          recebePendencias: !!row.recebe_pendencias,
          observacao: row.observacao,
          atualizadoEm: row.atualizado_em,
        },
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

router.delete(
  "/admin/alertas-digest-preferencias/:email",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    const email = String(req.params["email"] ?? "").trim().toLowerCase();
    if (!isEmail(email)) {
      res.status(400).json({ ok: false, error: "email invalido" });
      return;
    }
    try {
      const r = await pool.query(
        `DELETE FROM alertas_digest_preferencias
          WHERE lower(destinatario_email) = $1`,
        [email],
      );
      res.json({ ok: true, removidas: r.rowCount ?? 0 });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

export default router;
