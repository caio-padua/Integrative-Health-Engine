/**
 * Endpoints para o modulo Juridico + Nota Fiscal blindada.
 * - Preview de descricao NF antes de emitir
 * - Emissao com tripla defesa
 * - Validar texto qualquer (uso interno - debug + UI admin)
 * - Listar termos proibidos para o painel admin
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { analisarTexto } from "../lib/juridico/sanitizer";
import { buildInvoiceDescription, emitirNotaFiscalBlindada } from "../lib/juridico/notaFiscal";

const router: IRouter = Router();

router.get("/juridico/termos-bloqueados", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT categoria, termo, match_tipo, motivo, ativo FROM juridico_termos_bloqueados ORDER BY categoria, termo`);
  res.json({ termos: (r as unknown as { rows?: unknown[] }).rows || [] });
});

router.post("/juridico/analisar-texto", async (req: Request, res: Response) => {
  const texto = String((req.body as { texto?: string })?.texto || "");
  const result = await analisarTexto(texto);
  res.json(result);
});

router.post("/notas-fiscais/preview", async (req: Request, res: Response) => {
  try {
    const { pacienteId, valor } = req.body as { pacienteId: number; valor: number };
    if (!pacienteId) { res.status(400).json({ error: "pacienteId obrigatorio" }); return; }
    const pac = await db.execute(sql`SELECT id, nome AS name, cpf FROM pacientes WHERE id = ${pacienteId} LIMIT 1`);
    const patient = ((pac as unknown as { rows?: Array<{ id: number; name: string; cpf: string | null }> }).rows || [])[0];
    if (!patient) { res.status(404).json({ error: "paciente nao encontrado" }); return; }
    const descricao = buildInvoiceDescription(patient, { date: new Date().toLocaleDateString("pt-BR"), valor: valor || 0 });
    const validacao = await analisarTexto(descricao);
    res.json({ descricao, validacao });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/notas-fiscais/emitir", async (req: Request, res: Response) => {
  try {
    const { pacienteId, appointmentId, valor, provedorCodigo } = req.body as { pacienteId: number; appointmentId?: number; valor: number; provedorCodigo?: string };
    if (!pacienteId || !valor) { res.status(400).json({ error: "pacienteId e valor obrigatorios" }); return; }
    const result = await emitirNotaFiscalBlindada({ pacienteId, appointmentId, valor, provedorCodigo });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/notas-fiscais", async (req: Request, res: Response) => {
  // Filtros parametrizados com sql tagged template - sem injection vector.
  const pacienteIdRaw = req.query["paciente_id"];
  const statusRaw = req.query["status"];
  const pacienteId = pacienteIdRaw !== undefined ? Number(pacienteIdRaw) : null;
  if (pacienteId !== null && !Number.isFinite(pacienteId)) { res.status(400).json({ error: "paciente_id invalido" }); return; }
  const STATUS_PERMITIDOS = new Set(["RASCUNHO", "EMITIDA", "CANCELADA", "ERRO"]);
  const status = typeof statusRaw === "string" && STATUS_PERMITIDOS.has(statusRaw) ? statusRaw : null;

  const r = await db.execute(sql`
    SELECT id, paciente_id, appointment_id, data_emissao, valor, status, provedor_codigo, criado_em
    FROM notas_fiscais_emitidas
    WHERE (${pacienteId}::int IS NULL OR paciente_id = ${pacienteId}::int)
      AND (${status}::text IS NULL OR status = ${status}::text)
    ORDER BY id DESC LIMIT 100
  `);
  res.json({ notas: (r as unknown as { rows?: unknown[] }).rows || [] });
});

export default router;
