import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { iniciarAdesao, executarEventosVencidos, recalcularScoresRiscoAbandono } from "../lib/recorrencia/motorPlanos";
import { requireAdminToken } from "../middlewares/requireAdminToken";

const router = Router();

router.get("/planos-templates", async (_req: Request, res: Response) => {
  try {
    const tpls: any = await db.execute(sql`SELECT * FROM planos_terapeuticos_template WHERE ativo = true ORDER BY duracao_meses`);
    const fases: any = await db.execute(sql`SELECT * FROM fases_plano_template ORDER BY template_id, ordem`);
    const fasesArr = (fases.rows ?? fases) as Array<any>;
    const tplsArr = (tpls.rows ?? tpls) as Array<any>;
    const out = tplsArr.map((t) => ({ ...t, fases: fasesArr.filter((f) => f.template_id === t.id) }));
    res.json({ templates: out });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/planos/adesoes", async (req: Request, res: Response) => {
  try {
    const { paciente_id, template_id, unidade_id, data_inicio } = req.body || {};
    if (!paciente_id || !template_id) return res.status(400).json({ error: "paciente_id e template_id obrigatorios" });
    const r = await iniciarAdesao({
      pacienteId: Number(paciente_id),
      templateId: Number(template_id),
      unidadeId: unidade_id != null ? Number(unidade_id) : null,
      dataInicio: data_inicio ? new Date(data_inicio) : undefined,
    });
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/planos/adesoes", async (req: Request, res: Response) => {
  try {
    const pacienteId = req.query["paciente_id"] ? Number(req.query["paciente_id"]) : null;
    const status = typeof req.query["status"] === "string" ? req.query["status"] : null;
    let rows: any;
    if (pacienteId && status) {
      rows = await db.execute(sql`SELECT * FROM adesoes_plano WHERE paciente_id = ${pacienteId} AND status = ${status} ORDER BY criado_em DESC`);
    } else if (pacienteId) {
      rows = await db.execute(sql`SELECT * FROM adesoes_plano WHERE paciente_id = ${pacienteId} ORDER BY criado_em DESC`);
    } else if (status) {
      rows = await db.execute(sql`SELECT * FROM adesoes_plano WHERE status = ${status} ORDER BY criado_em DESC LIMIT 200`);
    } else {
      rows = await db.execute(sql`SELECT * FROM adesoes_plano ORDER BY criado_em DESC LIMIT 200`);
    }
    res.json({ adesoes: (rows.rows ?? rows) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/planos/adesoes/:id/eventos", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const rows: any = await db.execute(sql`SELECT * FROM eventos_programados WHERE adesao_id = ${id} ORDER BY agendado_para`);
    res.json({ eventos: (rows.rows ?? rows) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/planos/admin/executar-pendentes", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const r = await executarEventosVencidos(100);
    res.json(r);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/planos/admin/recalcular-scores", requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const riscos = await recalcularScoresRiscoAbandono();
    res.json({ pacientes_em_risco: riscos.length, top10: riscos.slice(0, 10) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/planos/inteligencia/risco-abandono", async (_req: Request, res: Response) => {
  try {
    const rows: any = await db.execute(sql`
      SELECT a.id as adesao_id, a.paciente_id, p.nome as paciente_nome, t.codigo as plano_codigo,
             a.score_risco_abandono, a.fase_atual_codigo, a.ultimo_atendimento_em, a.total_eventos_pendentes
      FROM adesoes_plano a
      JOIN pacientes p ON p.id = a.paciente_id
      JOIN planos_terapeuticos_template t ON t.id = a.template_id
      WHERE a.status = 'ATIVO' AND a.score_risco_abandono >= 7
      ORDER BY a.score_risco_abandono DESC, a.ultimo_atendimento_em ASC NULLS FIRST
      LIMIT 100
    `);
    res.json({ pacientes: (rows.rows ?? rows) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

export default router;
