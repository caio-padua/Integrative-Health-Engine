import { Router } from "express";
import { db } from "@workspace/db";
import {
  formulaBlendTable,
  formulaBlendAtivoTable,
  registroSubstanciaUsoTable,
  insertFormulaBlendSchema,
  insertFormulaBlendAtivoSchema,
  insertRegistroSubstanciaUsoSchema,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/formula-blend", async (_req, res) => {
  try {
    const blends = await db.select().from(formulaBlendTable).orderBy(desc(formulaBlendTable.criadoEm));
    const result = [];
    for (const blend of blends) {
      const ativos = await db
        .select()
        .from(formulaBlendAtivoTable)
        .where(eq(formulaBlendAtivoTable.blendId, blend.id))
        .orderBy(formulaBlendAtivoTable.ordem);
      result.push({ ...blend, ativos });
    }
    res.json(result);
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/formula-blend", async (req, res) => {
  try {
    const { ativos, ...blendData } = req.body;
    const parsed = insertFormulaBlendSchema.safeParse(blendData);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }

    const blend = await db.insert(formulaBlendTable).values(parsed.data).returning();
    const blendId = blend[0].id;

    const ativosInseridos = [];
    if (Array.isArray(ativos)) {
      for (const ativo of ativos) {
        const parsedAtivo = insertFormulaBlendAtivoSchema.safeParse({ ...ativo, blendId });
        if (parsedAtivo.success) {
          const r = await db.insert(formulaBlendAtivoTable).values(parsedAtivo.data).returning();
          ativosInseridos.push(r[0]);
        }
      }
    }

    res.status(201).json({ ...blend[0], ativos: ativosInseridos });
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/formula-blend/seed-v22", async (_req, res) => {
  try {
    const blendsV22 = [
      {
        codigoBlend: "FORM_SONO_BLND_ORAL_001",
        nomeBlend: "BLEND SONO NOITE",
        funcao: "SONO RESTAURACAO",
        via: "VO" as const,
        forma: "CAPSULA" as const,
        posologia: "1 CAPSULA 1 HORA ANTES DE DORMIR",
        duracao: "30 DIAS",
        objetivo: "MELHORAR SONO E RECUPERACAO",
        ativos: [
          { ordem: 1, componente: "L TRIPTOFANO", dosagem: 150, unidade: "MG" },
          { ordem: 2, componente: "L TEANINA", dosagem: 200, unidade: "MG" },
          { ordem: 3, componente: "MAGNESIO BISGLICINATO", dosagem: 200, unidade: "MG" },
          { ordem: 4, componente: "PASSIFLORA", dosagem: 200, unidade: "MG" },
          { ordem: 5, componente: "GABA", dosagem: 150, unidade: "MG" },
          { ordem: 6, componente: "APIGENINA", dosagem: 35, unidade: "MG" },
          { ordem: 7, componente: "MELATONINA", dosagem: 1, unidade: "MG" },
        ],
      },
      {
        codigoBlend: "FORM_FOCO_BLND_ORAL_002",
        nomeBlend: "BLEND FOCO DIA",
        funcao: "FOCO E ENERGIA",
        via: "VO" as const,
        forma: "CAPSULA" as const,
        posologia: "1 CAPSULA AO ACORDAR",
        duracao: "30 DIAS",
        objetivo: "MELHORAR FOCO ENERGIA E PRODUTIVIDADE",
        ativos: [
          { ordem: 1, componente: "TIROSINA", dosagem: 300, unidade: "MG" },
          { ordem: 2, componente: "RHODIOLA", dosagem: 150, unidade: "MG" },
          { ordem: 3, componente: "MUCUNA", dosagem: 200, unidade: "MG" },
          { ordem: 4, componente: "PQQ", dosagem: 5, unidade: "MG" },
          { ordem: 5, componente: "NADH", dosagem: 10, unidade: "MG" },
          { ordem: 6, componente: "COENZIMA Q10", dosagem: 100, unidade: "MG" },
        ],
      },
      {
        codigoBlend: "FORM_META_BLND_ORAL_003",
        nomeBlend: "BLEND METABOLICO",
        funcao: "METABOLICO EMAGRECIMENTO",
        via: "VO" as const,
        forma: "CAPSULA" as const,
        posologia: "1 CAPSULA 30 MIN ANTES DO ALMOCO E JANTAR",
        duracao: "60 DIAS",
        objetivo: "AJUDAR SACIEDADE E SENSIBILIDADE INSULINICA",
        ativos: [
          { ordem: 1, componente: "PICOLINATO DE CROMO", dosagem: 500, unidade: "MCG" },
          { ordem: 2, componente: "CURCUMA LONGA", dosagem: 300, unidade: "MG" },
          { ordem: 3, componente: "FASEOLAMINA", dosagem: 300, unidade: "MG" },
          { ordem: 4, componente: "ORLISTATE", dosagem: 100, unidade: "MG" },
          { ordem: 5, componente: "CASCARA SAGRADA", dosagem: 200, unidade: "MG" },
        ],
      },
      {
        codigoBlend: "FORM_HEPA_BLND_ORAL_004",
        nomeBlend: "BLEND HEPATICO",
        funcao: "SUPORTE HEPATICO",
        via: "VO" as const,
        forma: "CAPSULA" as const,
        posologia: "1 CAPSULA NO ALMOCO E 1 CAPSULA NO JANTAR",
        duracao: "60 DIAS",
        objetivo: "DESINFLAMAR E PROTEGER FIGADO",
        ativos: [
          { ordem: 1, componente: "NAC", dosagem: 600, unidade: "MG" },
          { ordem: 2, componente: "SILIMARINA", dosagem: 250, unidade: "MG" },
          { ordem: 3, componente: "ACIDO ALFA LIPOICO", dosagem: 200, unidade: "MG" },
          { ordem: 4, componente: "COLINA", dosagem: 300, unidade: "MG" },
          { ordem: 5, componente: "INOSITOL", dosagem: 300, unidade: "MG" },
          { ordem: 6, componente: "TUDCA", dosagem: 250, unidade: "MG" },
        ],
      },
    ];

    let inseridos = 0;
    for (const { ativos, ...blendData } of blendsV22) {
      try {
        const blend = await db.insert(formulaBlendTable).values(blendData).returning();
        const blendId = blend[0].id;
        for (const ativo of ativos) {
          await db.insert(formulaBlendAtivoTable).values({ ...ativo, blendId, observacao: "ATIVO DO BLEND" });
        }
        inseridos++;
      } catch {
        // already exists
      }
    }
    res.json({ total: blendsV22.length, inseridos });
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/substancias-uso", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const registros = await db
      .select()
      .from(registroSubstanciaUsoTable)
      .where(eq(registroSubstanciaUsoTable.pacienteId, pacienteId))
      .orderBy(desc(registroSubstanciaUsoTable.criadoEm));
    res.json(registros);
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/registro-substancia-uso", async (req, res) => {
  try {
    const parsed = insertRegistroSubstanciaUsoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const registro = await db.insert(registroSubstanciaUsoTable).values(parsed.data).returning();
    res.status(201).json(registro[0]);
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.patch("/registro-substancia-uso/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });
    const { status } = req.body;
    if (!["ATIVO", "PAUSADO", "CONCLUIDO", "CANCELADO"].includes(status)) {
      return res.status(400).json({ erro: "Status inválido" });
    }
    const atualizado = await db
      .update(registroSubstanciaUsoTable)
      .set({ status })
      .where(eq(registroSubstanciaUsoTable.id, id))
      .returning();
    if (atualizado.length === 0) return res.status(404).json({ erro: "Registro não encontrado" });
    res.json(atualizado[0]);
  } catch (err: any) {
    console.error("Erro formula blend:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
