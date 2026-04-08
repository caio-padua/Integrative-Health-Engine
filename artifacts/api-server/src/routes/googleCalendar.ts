import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, unidadesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  createCalendarEvent,
  updateCalendarEventDescription,
  listCalendarEvents,
  listCalendars,
  buildEventDescription,
  determineCalendarRouting,
  type SessaoCalendarData,
} from "../lib/google-calendar.js";

const router = Router();

router.get("/google-calendar/calendars", async (_req, res) => {
  try {
    const calendars = await listCalendars();
    res.json(calendars.map(c => ({
      id: c.id,
      summary: c.summary,
      description: c.description,
      primary: c.primary,
      backgroundColor: c.backgroundColor,
    })));
  } catch (err: any) {
    console.error('[GoogleCalendar] listCalendars error:', err.message);
    res.status(500).json({ error: "Erro ao listar calendarios" });
  }
});

router.post("/google-calendar/sync-session/:sessaoId", async (req, res) => {
  try {
    const sessaoId = Number(req.params.sessaoId);

    const [sessaoData] = await db
      .select({
        sessao: sessoesTable,
        pacienteNome: pacientesTable.nome,
        pacienteEmail: pacientesTable.email,
        unidadeNome: unidadesTable.nome,
        unidadeCalendarId: unidadesTable.googleCalendarId,
        unidadeEndereco: unidadesTable.endereco,
        unidadeBairro: unidadesTable.bairro,
        unidadeCep: unidadesTable.cep,
        unidadeCidade: unidadesTable.cidade,
        unidadeEstado: unidadesTable.estado,
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

    const aplicacoes = await db
      .select({
        aplicacao: aplicacoesSubstanciasTable,
        substanciaNome: substanciasTable.nome,
        substanciaVia: substanciasTable.via,
      })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

    const substancias = aplicacoes.map(a => ({
      nome: a.substanciaNome || '',
      via: a.substanciaVia || '',
      dose: a.aplicacao.dose || '',
      status: a.aplicacao.status || 'disp',
    }));

    const calendarData: SessaoCalendarData = {
      sessaoId,
      pacienteNome: sessaoData.pacienteNome || 'SEM NOME',
      profissionalNome: sessaoData.profissionalNome || '',
      tipoProcedimento: sessaoData.sessao.tipoProcedimento || 'CONSULTA',
      duracaoMin: sessaoData.sessao.duracaoTotalMin || 60,
      dataAgendada: sessaoData.sessao.dataAgendada,
      horaAgendada: sessaoData.sessao.horaAgendada,
      horaFim: sessaoData.sessao.horaFim || sessaoData.sessao.horaAgendada,
      calendarId: sessaoData.unidadeCalendarId || 'primary',
      substancias,
      endereco: {
        rua: sessaoData.unidadeEndereco || undefined,
        bairro: sessaoData.unidadeBairro || undefined,
        cep: sessaoData.unidadeCep || undefined,
        cidade: sessaoData.unidadeCidade || undefined,
        estado: sessaoData.unidadeEstado || undefined,
      },
    };

    const event = await createCalendarEvent(calendarData);

    await db.update(sessoesTable).set({
      googleEventId: event.id,
    }).where(eq(sessoesTable.id, sessaoId));

    res.json({
      success: true,
      eventId: event.id,
      eventLink: event.htmlLink,
      calendarId: calendarData.calendarId,
      routing: determineCalendarRouting(substancias.map(s => s.via)),
    });
  } catch (err: any) {
    console.error('[GoogleCalendar] sync-session error:', err.message);
    res.status(500).json({ error: "Erro ao sincronizar sessao com Google Calendar" });
  }
});

router.post("/google-calendar/update-session/:sessaoId", async (req, res) => {
  try {
    const sessaoId = Number(req.params.sessaoId);

    const [sessaoData] = await db
      .select({
        sessao: sessoesTable,
        unidadeCalendarId: unidadesTable.googleCalendarId,
        unidadeEndereco: unidadesTable.endereco,
        unidadeBairro: unidadesTable.bairro,
        unidadeCep: unidadesTable.cep,
        unidadeCidade: unidadesTable.cidade,
        unidadeEstado: unidadesTable.estado,
      })
      .from(sessoesTable)
      .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
      .where(eq(sessoesTable.id, sessaoId));

    if (!sessaoData?.sessao.googleEventId) {
      res.status(400).json({ error: "Sessao sem evento Google Calendar vinculado" });
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

    const substancias = aplicacoes.map(a => ({
      nome: a.substanciaNome || '',
      via: a.substanciaVia || '',
      dose: a.aplicacao.dose || '',
      status: a.aplicacao.status || 'disp',
    }));

    const event = await updateCalendarEventDescription(
      sessaoData.unidadeCalendarId || 'primary',
      sessaoData.sessao.googleEventId,
      substancias,
      sessaoData.sessao.tipoProcedimento || 'CONSULTA',
      sessaoData.sessao.duracaoTotalMin || 60,
      {
        rua: sessaoData.unidadeEndereco || undefined,
        bairro: sessaoData.unidadeBairro || undefined,
        cep: sessaoData.unidadeCep || undefined,
        cidade: sessaoData.unidadeCidade || undefined,
        estado: sessaoData.unidadeEstado || undefined,
      },
    );

    res.json({ success: true, eventId: event.id });
  } catch (err: any) {
    console.error("[Google] Error:", err.message); res.status(500).json({ error: "Erro na integracao Google" });
  }
});

router.get("/google-calendar/events", async (req, res) => {
  try {
    const { calendarId, timeMin, timeMax } = req.query;
    if (!timeMin || !timeMax) {
      res.status(400).json({ error: "timeMin e timeMax obrigatorios" });
      return;
    }
    const events = await listCalendarEvents(
      String(calendarId || 'primary'),
      String(timeMin),
      String(timeMax)
    );
    res.json(events);
  } catch (err: any) {
    console.error("[Google] Error:", err.message); res.status(500).json({ error: "Erro na integracao Google" });
  }
});

export default router;
