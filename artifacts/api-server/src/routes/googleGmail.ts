import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, unidadesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendPreSessionEmail, sendPostSessionEmail } from "../lib/google-gmail.js";

const router = Router();

router.post("/google-gmail/pre-session/:sessaoId", async (req, res) => {
  try {
    const sessaoId = Number(req.params.sessaoId);

    const [sessaoData] = await db
      .select({
        sessao: sessoesTable,
        pacienteNome: pacientesTable.nome,
        pacienteEmail: pacientesTable.email,
        unidadeNome: unidadesTable.nome,
        unidadeEndereco: unidadesTable.endereco,
        unidadeBairro: unidadesTable.bairro,
        unidadeCep: unidadesTable.cep,
        profissionalNome: usuariosTable.nome,
      })
      .from(sessoesTable)
      .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
      .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
      .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
      .where(eq(sessoesTable.id, sessaoId));

    if (!sessaoData) {
      res.status(404).json({ error: "Sessao nao encontrada" });
      return;
    }

    const toEmail = req.body.email || sessaoData.pacienteEmail;
    if (!toEmail) {
      res.status(400).json({ error: "Email do paciente nao encontrado. Envie 'email' no body." });
      return;
    }

    const aplicacoes = await db
      .select({
        aplicacao: aplicacoesSubstanciasTable,
        substanciaNome: substanciasTable.nome,
        substanciaVia: substanciasTable.via,
      })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

    const enderecoParts = [
      sessaoData.unidadeEndereco,
      sessaoData.unidadeBairro,
      sessaoData.unidadeCep,
    ].filter(Boolean);

    const result = await sendPreSessionEmail(toEmail, {
      pacienteNome: sessaoData.pacienteNome || 'PACIENTE',
      data: sessaoData.sessao.dataAgendada,
      hora: sessaoData.sessao.horaAgendada,
      unidade: sessaoData.unidadeNome || 'CLINICA',
      endereco: enderecoParts.join(' - ') || undefined,
      tipoProcedimento: sessaoData.sessao.tipoProcedimento || 'CONSULTA',
      duracaoMin: sessaoData.sessao.duracaoTotalMin || 60,
      substancias: aplicacoes.map(a => ({
        nome: a.substanciaNome || '',
        via: a.substanciaVia || '',
        dose: a.aplicacao.dose || '',
      })),
    });

    res.json({ success: true, messageId: result.id, sentTo: toEmail });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/google-gmail/post-session/:sessaoId", async (req, res) => {
  try {
    const sessaoId = Number(req.params.sessaoId);

    const [sessaoData] = await db
      .select({
        sessao: sessoesTable,
        pacienteNome: pacientesTable.nome,
        pacienteEmail: pacientesTable.email,
      })
      .from(sessoesTable)
      .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
      .where(eq(sessoesTable.id, sessaoId));

    if (!sessaoData) {
      res.status(404).json({ error: "Sessao nao encontrada" });
      return;
    }

    const toEmail = req.body.email || sessaoData.pacienteEmail;
    if (!toEmail) {
      res.status(400).json({ error: "Email do paciente nao encontrado" });
      return;
    }

    const aplicacoes = await db
      .select({
        aplicacao: aplicacoesSubstanciasTable,
        substanciaNome: substanciasTable.nome,
        substanciaVia: substanciasTable.via,
      })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

    const result = await sendPostSessionEmail(toEmail, {
      pacienteNome: sessaoData.pacienteNome || 'PACIENTE',
      data: sessaoData.sessao.dataAgendada,
      tipoProcedimento: sessaoData.sessao.tipoProcedimento || 'CONSULTA',
      substancias: aplicacoes.map(a => ({
        nome: a.substanciaNome || '',
        via: a.substanciaVia || '',
        dose: a.aplicacao.dose || '',
        status: a.aplicacao.status || 'disp',
      })),
    });

    res.json({ success: true, messageId: result.id, sentTo: toEmail });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
