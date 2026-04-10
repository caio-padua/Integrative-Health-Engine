import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, unidadesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
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
        pacienteId: pacientesTable.id,
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
        substancia: substanciasTable,
      })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

    let isPrimeiraSessao = false;
    if (sessaoData.pacienteId) {
      const [countResult] = await db
        .select({ total: count() })
        .from(sessoesTable)
        .where(and(
          eq(sessoesTable.pacienteId, sessaoData.pacienteId),
          eq(sessoesTable.status, 'concluida')
        ));
      isPrimeiraSessao = (countResult?.total || 0) === 0;
    }

    const enderecoParts = [
      sessaoData.unidadeEndereco,
      sessaoData.unidadeBairro,
      sessaoData.unidadeCep,
    ].filter(Boolean);

    const substanciasBasicas = aplicacoes.map(a => ({
      nome: a.substancia?.nome || '',
      via: a.substancia?.via || '',
      dose: a.aplicacao.dose || '',
    }));

    const substanciasDetalhadas = isPrimeiraSessao ? aplicacoes.map(a => ({
      nome: a.substancia?.nome || '',
      via: a.substancia?.via || '',
      dose: a.aplicacao.dose || '',
      funcaoPrincipal: a.substancia?.funcaoPrincipal || undefined,
      efeitosPercebidos: a.substancia?.efeitosPercebidos || undefined,
      tempoParaEfeito: a.substancia?.tempoParaEfeito || undefined,
      beneficioEnergia: a.substancia?.beneficioEnergia || undefined,
      beneficioSono: a.substancia?.beneficioSono || undefined,
      clarezaMental: a.substancia?.clarezaMental || undefined,
      suporteImunologico: a.substancia?.suporteImunologico || undefined,
      contraindicacoes: a.substancia?.contraindicacoes || undefined,
    })) : undefined;

    const result = await sendPreSessionEmail(toEmail, {
      pacienteNome: sessaoData.pacienteNome || 'PACIENTE',
      data: sessaoData.sessao.dataAgendada,
      hora: sessaoData.sessao.horaAgendada,
      unidade: sessaoData.unidadeNome || 'CLINICA',
      endereco: enderecoParts.join(' - ') || undefined,
      tipoProcedimento: sessaoData.sessao.tipoProcedimento || 'CONSULTA',
      duracaoMin: sessaoData.sessao.duracaoTotalMin || 60,
      substancias: substanciasBasicas,
      isPrimeiraSessao,
      substanciasDetalhadas,
      medicoNome: sessaoData.profissionalNome || undefined,
    });

    res.json({ success: true, messageId: result.id, sentTo: toEmail, isPrimeiraSessao });
  } catch (err: any) {
    console.error("[Google] Error:", err.message); res.status(500).json({ error: "Erro na integracao Google" });
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
        pacienteId: pacientesTable.id,
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

    let sessaoNumero: number | undefined;
    let totalSessoes: number | undefined;
    let aderencia: number | undefined;

    if (sessaoData.pacienteId) {
      const allSessoes = await db
        .select({ id: sessoesTable.id, status: sessoesTable.status, dataAgendada: sessoesTable.dataAgendada })
        .from(sessoesTable)
        .where(eq(sessoesTable.pacienteId, sessaoData.pacienteId));

      totalSessoes = allSessoes.length;
      const concluidas = allSessoes.filter(s => s.status === 'concluida').length;
      const passadas = allSessoes.filter(s => {
        const d = new Date(s.dataAgendada);
        return d <= new Date();
      }).length;
      sessaoNumero = concluidas;
      aderencia = passadas > 0 ? Math.round((concluidas / passadas) * 100) : 100;

      const proximas = allSessoes
        .filter(s => new Date(s.dataAgendada) > new Date() && s.status !== 'concluida')
        .sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime());

      var proximaSessao = proximas.length > 0 ? proximas[0].dataAgendada : undefined;
    }

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
      sessaoNumero,
      totalSessoes,
      aderencia,
      proximaSessao,
    });

    res.json({ success: true, messageId: result.id, sentTo: toEmail });
  } catch (err: any) {
    console.error("[Google] Error:", err.message); res.status(500).json({ error: "Erro na integracao Google" });
  }
});

export default router;
