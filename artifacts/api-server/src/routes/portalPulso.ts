/**
 * portalPulso.ts — Portal web público do Pulso Diário (Fase 1, B1).
 *
 * Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md (P002)
 *
 * Rotas SEM JWT — autorização é o próprio token na URL (nanoid 12 chars
 * com TTL, gerado pelo médico). Liberado em middlewares/requireAuth.ts
 * via PUBLIC_PREFIXES `/portal-paciente/pulso/`.
 *
 * Mobile-first. Submit grava com origem='PACIENTE' pra distinguir dos
 * registros feitos pelo profissional no dashboard.
 */

import { Router } from "express";
import { z } from "zod/v4";
import {
  validarTokenPortalPulso,
  registrarPulsoDiario,
  type EntradaPulsoDiario,
} from "../services/pulsoDiarioService";
import { rateLimitPortalPulso } from "../middlewares/rateLimitPortalPulso";

const router = Router();

// Rate limit in-memory por IP — 30 req/min. Defesa contra brute-force
// no token nanoid(12). Ressalva crítica do architect (21/mai/2026).
router.use("/portal-paciente/pulso", rateLimitPortalPulso);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const EntradaPortalSchema: z.ZodType<EntradaPulsoDiario> = z.discriminatedUnion(
  "tipo",
  [
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
      bem_estar: z.boolean().optional(),
      aderencia: z.string().max(50).optional(),
      sente_resultado: z.string().max(255).optional(),
      efeito_colateral_1: z.string().max(255).optional(),
      observacao: z.string().max(1000).optional(),
    }),
  ],
);

/**
 * GET /portal-paciente/pulso/:token
 *
 * Retorna metadados mínimos para o paciente renderizar o formulário.
 * NUNCA devolve dados de outros pacientes ou histórico — só nome e
 * status do token. O histórico fica no Dashboard Local (acesso médico).
 */
router.get("/portal-paciente/pulso/:token", async (req, res): Promise<void> => {
  const token = String(req.params["token"] ?? "");
  const sess = await validarTokenPortalPulso(token);
  if (!sess) {
    res.status(404).json({ erro: "Link inválido ou expirado" });
    return;
  }
  res.json({
    paciente: { nome: sess.nome },
    indicadores: [
      "sono",
      "energia",
      "disposicao",
      "foco",
      "libido",
      "forca",
      "emagrecimento",
      "estresse",
      "humor",
    ],
    sinais_vitais_aceitos: ["PA_SIS", "PA_DIA", "FC", "GLICEMIA", "PESO", "CINTURA"],
  });
});

/**
 * POST /portal-paciente/pulso/:token
 *
 * Submete uma entrada. Re-valida o token a cada POST — token expirado
 * entre GET e POST recusa o registro.
 */
router.post("/portal-paciente/pulso/:token", async (req, res): Promise<void> => {
  const token = String(req.params["token"] ?? "");
  const sess = await validarTokenPortalPulso(token);
  if (!sess) {
    res.status(404).json({ erro: "Link inválido ou expirado" });
    return;
  }
  const parsed = EntradaPortalSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ erro: "Payload inválido", detalhes: parsed.error.issues });
    return;
  }
  try {
    const out = await registrarPulsoDiario(sess.pacienteId, parsed.data, "PACIENTE");
    res.status(201).json({ ok: true, tabela: out.tabela });
  } catch (err) {
    req.log?.error?.({ err, pacienteId: sess.pacienteId }, "[portal-pulso] erro");
    res.status(500).json({ erro: "Erro ao gravar entrada" });
  }
});

export default router;
