import { Router } from "express";
import { z } from "zod";
import { parsePosologia, formatarPosologiaEstruturada } from "@workspace/posologia";

const router = Router();

const inputSchema = z.object({
  texto: z.string().max(2000),
  contexto: z
    .object({
      categoria: z
        .enum([
          "formula",
          "injetavel_im",
          "injetavel_ev",
          "implante",
          "exame",
          "protocolo",
          "revo_medicamento",
          "revo_formula",
        ])
        .optional(),
      viaPadrao: z
        .enum([
          "oral",
          "sublingual",
          "intramuscular",
          "endovenosa",
          "subcutanea",
          "topica",
          "nasal",
          "retal",
          "vaginal",
          "ocular",
          "implante",
        ])
        .optional(),
    })
    .optional(),
});

/**
 * POST /api/posologia/parse
 * Endpoint público (autenticado pelo middleware global) usado pela RevoPanel
 * para mostrar preview da estrutura interpretada enquanto o médico digita.
 * Função pura — não escreve em banco. Reflexo do shipping de migration 034.
 */
router.post("/posologia/parse", (req, res): void => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "payload inválido", detalhes: parsed.error.flatten() });
    return;
  }
  const estrutura = parsePosologia(parsed.data.texto, parsed.data.contexto);
  res.json({
    estrutura,
    fraseCanonica: formatarPosologiaEstruturada(estrutura),
  });
});

export default router;
