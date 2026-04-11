import { Router } from "express";
import { db } from "@workspace/db";
import {
  alertaPacienteTable,
  insertAlertaPacienteSchema,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/alerta-paciente", async (req, res) => {
  try {
    const parsed = insertAlertaPacienteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const alerta = await db.insert(alertaPacienteTable).values(parsed.data).returning();
    res.status(201).json(alerta[0]);
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/alerta-paciente", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const conditions = [];
    if (status) {
      conditions.push(eq(alertaPacienteTable.status, status as any));
    }
    const alertas = await db
      .select()
      .from(alertaPacienteTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alertaPacienteTable.criadoEm));
    res.json(alertas);
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/alertas", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const alertas = await db
      .select()
      .from(alertaPacienteTable)
      .where(eq(alertaPacienteTable.pacienteId, pacienteId))
      .orderBy(desc(alertaPacienteTable.criadoEm));
    res.json(alertas);
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.patch("/alerta-paciente/:id/responder", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });

    const { responsavelId, respostaAssistente, contatoTelefone } = req.body;
    if (!respostaAssistente) {
      return res.status(400).json({ erro: "respostaAssistente obrigatória" });
    }

    const atualizado = await db
      .update(alertaPacienteTable)
      .set({
        responsavelId,
        respostaAssistente,
        contatoTelefone: contatoTelefone || false,
        status: "RESPONDIDO",
        dataResposta: new Date(),
      })
      .where(eq(alertaPacienteTable.id, id))
      .returning();

    if (atualizado.length === 0) return res.status(404).json({ erro: "Alerta não encontrado" });
    res.json(atualizado[0]);
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.patch("/alerta-paciente/:id/fechar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ erro: "ID inválido" });

    const atualizado = await db
      .update(alertaPacienteTable)
      .set({ status: "FECHADO" })
      .where(eq(alertaPacienteTable.id, id))
      .returning();

    if (atualizado.length === 0) return res.status(404).json({ erro: "Alerta não encontrado" });
    res.json(atualizado[0]);
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/alerta-paciente/stats", async (req, res) => {
  try {
    const stats = await db
      .select({
        status: alertaPacienteTable.status,
        total: sql<number>`count(*)::int`,
      })
      .from(alertaPacienteTable)
      .groupBy(alertaPacienteTable.status);

    const porGravidade = await db
      .select({
        gravidade: alertaPacienteTable.gravidade,
        total: sql<number>`count(*)::int`,
      })
      .from(alertaPacienteTable)
      .where(eq(alertaPacienteTable.status, "ABERTO"))
      .groupBy(alertaPacienteTable.gravidade);

    res.json({ porStatus: stats, abertoPorGravidade: porGravidade });
  } catch (err: any) {
    console.error("Erro alerta paciente:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
