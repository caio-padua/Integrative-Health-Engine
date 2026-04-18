/**
 * Rotas REST do modulo Assinatura Digital.
 * Expoe as 5 operacoes basicas + 2 webhooks (clicksign/zapsign).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../lib/assinatura/service";
import type { ProvedorCodigo } from "../lib/assinatura/types";

const router: IRouter = Router();

/** GET /api/assinaturas/config — toggles + provedores + textos */
router.get("/assinaturas/config", async (_req: Request, res: Response) => {
  const [toggles, provedores, textos] = await Promise.all([
    db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`),
    db.execute(sql`SELECT codigo, nome, prioridade, is_principal, is_failover, recomendado_pelo_manifesto, status_integracao FROM provedores_assinatura_digital ORDER BY prioridade`),
    db.execute(sql`SELECT codigo, canal, momento, assunto FROM assinatura_textos_institucionais WHERE ativo = true ORDER BY codigo`),
  ]);
  res.json({
    toggles: ((toggles as unknown as { rows?: unknown[] }).rows || [])[0],
    provedores: (provedores as unknown as { rows?: unknown[] }).rows || [],
    textos: (textos as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** GET /api/assinaturas/templates — catalogo de templates */
router.get("/assinaturas/templates", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT id, codigo, nome_exibicao, tipo_documento, categoria, exige_medico, exige_testemunhas, exige_clinica, ativo FROM assinatura_templates ORDER BY id`);
  res.json({ templates: (r as unknown as { rows?: unknown[] }).rows || [] });
});

/** GET /api/assinaturas/testemunhas — lista testemunhas + pares */
router.get("/assinaturas/testemunhas", async (_req: Request, res: Response) => {
  const [testemunhas, pares] = await Promise.all([
    db.execute(sql`SELECT id, nome_completo, cargo, par_preferencial, ordem_assinatura, ativa FROM assinatura_testemunhas ORDER BY id`),
    db.execute(sql`SELECT p.id, p.nome_par, p.uso_padrao, ta.nome_completo as testemunha_a, tb.nome_completo as testemunha_b
                   FROM assinatura_pares_testemunhas p
                   JOIN assinatura_testemunhas ta ON ta.id = p.testemunha_a_id
                   JOIN assinatura_testemunhas tb ON tb.id = p.testemunha_b_id
                   ORDER BY p.id`),
  ]);
  res.json({
    testemunhas: (testemunhas as unknown as { rows?: unknown[] }).rows || [],
    pares: (pares as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** PATCH /api/assinaturas/toggles — atualiza singleton */
router.patch("/assinaturas/toggles", async (req: Request, res: Response) => {
  const allowed = [
    "provedor_principal_codigo", "provedor_failover_codigo", "failover_automatico",
    "exigir_assinatura_medico", "exigir_testemunhas", "modo_testemunhas", "par_fixo_id",
    "enviar_por_email", "enviar_por_whatsapp", "arquivar_no_drive",
  ];
  const updates: string[] = [];
  const body = req.body as Record<string, unknown>;
  for (const k of allowed) {
    if (k in body) updates.push(`${k} = ${typeof body[k] === "string" ? `'${(body[k] as string).replace(/'/g, "''")}'` : body[k]}`);
  }
  if (updates.length === 0) { res.status(400).json({ error: "Nenhum campo valido enviado" }); return; }
  await db.execute(sql.raw(`UPDATE assinatura_toggles_admin SET ${updates.join(", ")}, atualizado_em = now() WHERE id = 1`));
  const r = await db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`);
  res.json({ ok: true, toggles: ((r as unknown as { rows?: unknown[] }).rows || [])[0] });
});

/** POST /api/assinaturas/enviar — orquestra hidratacao + envio + persistencia */
router.post("/assinaturas/enviar", async (req: Request, res: Response) => {
  try {
    const { pacienteId, templateCodigo, procedimento, valorOrcamento, riscos, forcarProvedor, canais } = req.body as Record<string, unknown>;
    if (!pacienteId || !templateCodigo) { res.status(400).json({ error: "pacienteId e templateCodigo obrigatorios" }); return; }
    const result = await assinaturaService.enviar({
      pacienteId: Number(pacienteId), templateCodigo: String(templateCodigo),
      procedimento: procedimento as string | undefined, valorOrcamento: valorOrcamento as string | undefined, riscos: riscos as string | undefined,
      forcarProvedor: forcarProvedor as ProvedorCodigo | undefined, canais: canais as ("EMAIL" | "WHATSAPP" | "DRIVE")[] | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas/:id — status atual (pull live no provedor se ainda nao concluido) */
router.get("/assinaturas/:id", async (req: Request, res: Response) => {
  try {
    const status = await assinaturaService.consultarStatus(Number(req.params["id"]));
    const detalhes = await db.execute(sql`
      SELECT s.id, s.paciente_id, p.nome as paciente_nome, t.codigo as template, s.provedor_codigo, s.status, s.criado_em, s.concluido_em, s.pdf_assinado_url, s.canais_distribuir, s.metadata
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t ON t.id = s.template_id
      LEFT JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.id = ${Number(req.params["id"])}
    `);
    const sigs = await db.execute(sql`SELECT papel, nome, email, ordem, status, link_assinatura, assinado_em FROM assinatura_signatarios WHERE solicitacao_id = ${Number(req.params["id"])} ORDER BY ordem`);
    const notifs = await db.execute(sql`SELECT canal, momento, destinatario, status, tentativas, enviado_em FROM assinatura_notificacoes WHERE solicitacao_id = ${Number(req.params["id"])} ORDER BY id`);
    res.json({
      live: status,
      solicitacao: ((detalhes as unknown as { rows?: unknown[] }).rows || [])[0],
      signatarios: (sigs as unknown as { rows?: unknown[] }).rows || [],
      notificacoes: (notifs as unknown as { rows?: unknown[] }).rows || [],
    });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas — lista (filtros opcionais paciente_id, status) */
router.get("/assinaturas", async (req: Request, res: Response) => {
  const filtros: string[] = ["1=1"];
  if (req.query["paciente_id"]) filtros.push(`paciente_id = ${Number(req.query["paciente_id"])}`);
  if (req.query["status"]) filtros.push(`status = '${String(req.query["status"]).replace(/'/g, "")}'`);
  const r = await db.execute(sql.raw(`
    SELECT id, paciente_id, template_id, provedor_codigo, status, criado_em, concluido_em
    FROM assinatura_solicitacoes WHERE ${filtros.join(" AND ")} ORDER BY id DESC LIMIT 100
  `));
  res.json({ solicitacoes: (r as unknown as { rows?: unknown[] }).rows || [] });
});

export default router;
