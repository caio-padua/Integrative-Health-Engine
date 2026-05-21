/**
 * pulsoDiario.ts — Endpoints autenticados do Dashboard Local
 *
 * Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md
 *
 * Rotas:
 *   GET  /pacientes/:id/pulso-diario?de=&ate=
 *   POST /pacientes/:id/pulso-diario          { tipo, ... }
 *   POST /pacientes/:id/pulso-diario/gerar-token   { ttlDias? }
 *
 * Tenant guard: o GET de paciente já passou pelo resolverFiltroTenant em
 * /pacientes/:id (rota principal). Aqui validamos novamente pra fechar
 * IDOR — médico de unidade A não pode ler/escrever pulso de paciente de
 * unidade B só porque adivinhou o ID na URL.
 */

import { Router } from "express";
import { db, pacientesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { resolverFiltroTenant } from "../lib/auth/filtroTenant";
import {
  buscarPulsoDiario,
  registrarPulsoDiario,
  gerarTokenPortalPulso,
  type EntradaPulsoDiario,
} from "../services/pulsoDiarioService";

const router = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const EntradaSchema: z.ZodType<EntradaPulsoDiario> = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("sintoma"),
    data_semana: z.string().regex(ISO_DATE).optional(),
    sono: z.number().min(0).max(10).optional(),
    energia: z.number().min(0).max(10).optional(),
    disposicao: z.number().min(0).max(10).optional(),
    foco: z.number().min(0).max(10).optional(),
    libido: z.number().min(0).max(10).optional(),
    forca: z.number().min(0).max(10).optional(),
    emagrecimento: z.number().min(0).max(10).optional(),
    estresse: z.number().min(0).max(10).optional(),
    humor: z.number().min(0).max(10).optional(),
  }),
  z.object({
    tipo: z.literal("sinal_vital"),
    data_registro: z.string().regex(ISO_DATE).optional(),
    indicador: z.string().min(1).max(50),
    leituras: z
      .array(z.object({ horario: z.string().max(10), valor: z.number() }))
      .min(1)
      .max(6),
  }),
  z.object({
    tipo: z.literal("formula"),
    codigo_blend: z.string().max(100).optional(),
    nome_blend: z.string().max(255).optional(),
    data_inicio: z.string().regex(ISO_DATE).optional(),
    aderencia: z.string().max(50).optional(),
    bem_estar: z.boolean().optional(),
    sente_resultado: z.string().max(255).optional(),
    efeito_colateral_1: z.string().max(255).optional(),
    observacao: z.string().max(1000).optional(),
  }),
]);

/**
 * Helper: verifica que paciente existe E que o usuário autenticado tem
 * permissão de ler a unidade desse paciente. Espelha o padrão usado em
 * routes/pacientes.ts (bug #4 hardening pelo architect).
 */
async function autorizarAcessoPaciente(
  req: import("express").Request,
  pacienteId: number,
): Promise<{ ok: true } | { ok: false; status: number; erro: string }> {
  const { unidadeId, isPlatformOwner } = resolverFiltroTenant(req);
  const r = await db
    .select({ id: pacientesTable.id, unidadeId: pacientesTable.unidadeId })
    .from(pacientesTable)
    .where(eq(pacientesTable.id, pacienteId))
    .limit(1);
  const p = r[0];
  if (!p) return { ok: false, status: 404, erro: "Paciente não encontrado" };
  if (isPlatformOwner) return { ok: true };
  if (unidadeId !== null && p.unidadeId !== unidadeId) {
    return { ok: false, status: 403, erro: "Paciente pertence a outra unidade" };
  }
  return { ok: true };
}

router.get("/pacientes/:id/pulso-diario", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params["id"]);
  if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
    res.status(400).json({ erro: "ID de paciente inválido" });
    return;
  }
  const auth = await autorizarAcessoPaciente(req, pacienteId);
  if (!auth.ok) {
    res.status(auth.status).json({ erro: auth.erro });
    return;
  }
  const de = typeof req.query["de"] === "string" && ISO_DATE.test(req.query["de"])
    ? req.query["de"]
    : undefined;
  const ate = typeof req.query["ate"] === "string" && ISO_DATE.test(req.query["ate"])
    ? req.query["ate"]
    : undefined;
  try {
    const dto = await buscarPulsoDiario(pacienteId, de, ate);
    res.json(dto);
  } catch (err) {
    req.log?.error?.({ err, pacienteId }, "[pulso-diario] erro ao buscar");
    res.status(500).json({ erro: "Erro ao consultar Pulso Diário" });
  }
});

router.post("/pacientes/:id/pulso-diario", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params["id"]);
  if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
    res.status(400).json({ erro: "ID de paciente inválido" });
    return;
  }
  const auth = await autorizarAcessoPaciente(req, pacienteId);
  if (!auth.ok) {
    res.status(auth.status).json({ erro: auth.erro });
    return;
  }
  const parsed = EntradaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Payload inválido", detalhes: parsed.error.issues });
    return;
  }
  try {
    const out = await registrarPulsoDiario(pacienteId, parsed.data, "PROFISSIONAL");
    res.status(201).json(out);
  } catch (err) {
    req.log?.error?.({ err, pacienteId }, "[pulso-diario] erro ao gravar");
    res.status(500).json({ erro: "Erro ao gravar Pulso Diário" });
  }
});

const TokenBodySchema = z.object({
  ttlDias: z.number().int().min(1).max(365).optional(),
});

router.post(
  "/pacientes/:id/pulso-diario/gerar-token",
  async (req, res): Promise<void> => {
    const pacienteId = Number(req.params["id"]);
    if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ erro: "ID de paciente inválido" });
      return;
    }
    const auth = await autorizarAcessoPaciente(req, pacienteId);
    if (!auth.ok) {
      res.status(auth.status).json({ erro: auth.erro });
      return;
    }
    const parsed = TokenBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ erro: "Payload inválido", detalhes: parsed.error.issues });
      return;
    }
    try {
      const out = await gerarTokenPortalPulso(pacienteId, parsed.data.ttlDias);
      res.status(201).json({
        ...out,
        url_relativa: `/portal-paciente/pulso/${out.token}`,
      });
    } catch (err) {
      req.log?.error?.({ err, pacienteId }, "[pulso-diario] erro ao gerar token");
      res.status(500).json({ erro: "Erro ao gerar token do portal" });
    }
  },
);

// Helper auxiliar pra silenciar warning de import não usado (and/sql usados
// em routes vizinhas se este arquivo for estendido; mantidos aqui por
// consistência com o padrão de routes/pacientes.ts).
void and;
void sql;

export default router;
