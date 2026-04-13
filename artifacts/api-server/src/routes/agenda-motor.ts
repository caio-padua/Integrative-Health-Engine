import { Router } from "express";
import {
  db,
  availabilityRulesTable,
  agendaSlotsTable,
  slotLocksTable,
  appointmentsTable,
  appointmentReschedulesTable,
  agendaAuditEventsTable,
  agendaBlocksTable,
  pacientesTable,
  usuariosTable,
  unidadesTable,
  taskCardsTable,
  rasTable,
  smartReleaseConfigTable,
  subAgendasTable,
  TIPOS_PROCEDIMENTO,
} from "@workspace/db";
import { eq, and, sql, or, desc, gte, lte, inArray, between, isNull } from "drizzle-orm";
import { getCalendarClient } from "../lib/google-calendar";

const router = Router();

async function auditLog(entidadeTipo: string, entidadeId: number, acao: string, detalhes: any, usuarioId?: number) {
  await db.insert(agendaAuditEventsTable).values({ entidadeTipo, entidadeId, acao, detalhes, usuarioId: usuarioId || null });
}

router.get("/agenda-motor/sub-agendas", async (req, res) => {
  try {
    const { unidadeId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(subAgendasTable.unidadeId, Number(unidadeId)));

    const subs = await db
      .select({
        id: subAgendasTable.id,
        unidadeId: subAgendasTable.unidadeId,
        nome: subAgendasTable.nome,
        cor: subAgendasTable.cor,
        emoji: subAgendasTable.emoji,
        tipo: subAgendasTable.tipo,
        profissionalId: subAgendasTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        modalidade: subAgendasTable.modalidade,
        salaOuLocal: subAgendasTable.salaOuLocal,
        ativa: subAgendasTable.ativa,
        ordem: subAgendasTable.ordem,
      })
      .from(subAgendasTable)
      .leftJoin(usuariosTable, eq(subAgendasTable.profissionalId, usuariosTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(subAgendasTable.ordem, subAgendasTable.nome);

    res.json(subs);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/sub-agendas", async (req, res) => {
  try {
    const { unidadeId, nome, cor, emoji, tipo, profissionalId, modalidade, salaOuLocal, ordem } = req.body;
    if (!unidadeId || !nome) {
      res.status(400).json({ erro: "unidadeId e nome sao obrigatorios" });
      return;
    }
    const [created] = await db.insert(subAgendasTable).values({
      unidadeId: Number(unidadeId), nome, cor: cor || "#3B82F6",
      emoji: emoji || null, tipo: tipo || "medico",
      profissionalId: profissionalId ? Number(profissionalId) : null,
      modalidade: modalidade || "presencial",
      salaOuLocal: salaOuLocal || null,
      ordem: ordem || 0,
    }).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.put("/agenda-motor/sub-agendas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, cor, emoji, tipo, profissionalId, modalidade, salaOuLocal, ativa, ordem } = req.body;
    const updates: any = { atualizadoEm: new Date() };
    if (nome !== undefined) updates.nome = nome;
    if (cor !== undefined) updates.cor = cor;
    if (emoji !== undefined) updates.emoji = emoji;
    if (tipo !== undefined) updates.tipo = tipo;
    if (profissionalId !== undefined) updates.profissionalId = profissionalId ? Number(profissionalId) : null;
    if (modalidade !== undefined) updates.modalidade = modalidade;
    if (salaOuLocal !== undefined) updates.salaOuLocal = salaOuLocal;
    if (ativa !== undefined) updates.ativa = ativa;
    if (ordem !== undefined) updates.ordem = ordem;
    const [updated] = await db.update(subAgendasTable).set(updates).where(eq(subAgendasTable.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete("/agenda-motor/sub-agendas/:id", async (req, res) => {
  try {
    await db.delete(subAgendasTable).where(eq(subAgendasTable.id, Number(req.params.id)));
    res.json({ sucesso: true });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/sub-agendas/seed", async (req, res) => {
  try {
    const { unidadeId } = req.body;
    if (!unidadeId) { res.status(400).json({ erro: "unidadeId obrigatorio" }); return; }

    const existing = await db.select().from(subAgendasTable).where(eq(subAgendasTable.unidadeId, Number(unidadeId)));
    if (existing.length > 0) { res.json({ mensagem: "Subagendas ja existem", total: existing.length }); return; }

    const seeds = [
      { nome: "AGENDA MEDICO — DR. CAIO PRESENCIAL", cor: "#3B82F6", emoji: "🏥", tipo: "medico", modalidade: "presencial", salaOuLocal: "Sala 01", ordem: 1 },
      { nome: "AGENDA MEDICO — DR. CAIO ONLINE", cor: "#8B5CF6", emoji: "💻", tipo: "medico", modalidade: "online", salaOuLocal: "Telemedicina", ordem: 2 },
      { nome: "AGENDA ENFERMAGEM — PRESENCIAL", cor: "#10B981", emoji: "💉", tipo: "enfermagem", modalidade: "presencial", salaOuLocal: "Sala Infusão", ordem: 3 },
      { nome: "AGENDA ENFERMAGEM — DOMICILIAR", cor: "#F59E0B", emoji: "🏠", tipo: "enfermagem", modalidade: "domiciliar", salaOuLocal: "Nurse Care", ordem: 4 },
      { nome: "AGENDA ENFERMAGEM — AUDITORIA", cor: "#EF4444", emoji: "📋", tipo: "enfermagem", modalidade: "remoto", salaOuLocal: "Auditoria Remota", ordem: 5 },
      { nome: "AGENDA EXAMES — COLETA", cor: "#64748B", emoji: "🧪", tipo: "exames", modalidade: "presencial", salaOuLocal: "Sala Coleta", ordem: 6 },
    ];

    for (const s of seeds) {
      await db.insert(subAgendasTable).values({ ...s, unidadeId: Number(unidadeId) });
    }

    res.json({ sucesso: true, total: seeds.length, mensagem: "Subagendas criadas com sucesso" });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/tipos-procedimento", (_req, res) => {
  const tipos = Object.entries(TIPOS_PROCEDIMENTO).map(([key, val]) => ({
    codigo: key,
    ...val,
  }));
  res.json(tipos);
});

router.get("/agenda-motor/availability-rules", async (req, res) => {
  try {
    const { profissionalId, unidadeId } = req.query;
    const conditions: any[] = [];
    if (profissionalId) conditions.push(eq(availabilityRulesTable.profissionalId, Number(profissionalId)));
    if (unidadeId) conditions.push(eq(availabilityRulesTable.unidadeId, Number(unidadeId)));

    const rules = await db
      .select({
        id: availabilityRulesTable.id,
        profissionalId: availabilityRulesTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        unidadeId: availabilityRulesTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        diaSemana: availabilityRulesTable.diaSemana,
        horaInicio: availabilityRulesTable.horaInicio,
        horaFim: availabilityRulesTable.horaFim,
        duracaoSlotMin: availabilityRulesTable.duracaoSlotMin,
        tipoProcedimento: availabilityRulesTable.tipoProcedimento,
        recorrencia: availabilityRulesTable.recorrencia,
        ativa: availabilityRulesTable.ativa,
        observacoes: availabilityRulesTable.observacoes,
        criadoEm: availabilityRulesTable.criadoEm,
      })
      .from(availabilityRulesTable)
      .leftJoin(usuariosTable, eq(availabilityRulesTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(availabilityRulesTable.unidadeId, unidadesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(availabilityRulesTable.diaSemana, availabilityRulesTable.horaInicio);

    res.json(rules);
  } catch (err: any) {
    console.error("Erro availability-rules:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/availability-rules", async (req, res) => {
  try {
    const { profissionalId, unidadeId, diaSemana, horaInicio, horaFim, duracaoSlotMin, tipoProcedimento, recorrencia, observacoes } = req.body;

    if (!profissionalId || !unidadeId || diaSemana === undefined || !horaInicio || !horaFim) {
      res.status(400).json({ erro: "profissionalId, unidadeId, diaSemana, horaInicio e horaFim sao obrigatorios" });
      return;
    }

    const [inserted] = await db.insert(availabilityRulesTable).values({
      profissionalId: Number(profissionalId),
      unidadeId: Number(unidadeId),
      diaSemana: Number(diaSemana),
      horaInicio,
      horaFim,
      duracaoSlotMin: duracaoSlotMin || 30,
      tipoProcedimento: tipoProcedimento || "CONSULTA_30_PRESENCIAL",
      recorrencia: recorrencia || "semanal",
      observacoes: observacoes || null,
    }).returning();

    await auditLog("AVAILABILITY_RULE", inserted.id, "CRIADA", { ...inserted });
    res.json(inserted);
  } catch (err: any) {
    console.error("Erro criar availability-rule:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.patch("/agenda-motor/availability-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates: any = {};
    const fields = ["diaSemana", "horaInicio", "horaFim", "duracaoSlotMin", "tipoProcedimento", "recorrencia", "ativa", "observacoes"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    updates.atualizadoEm = new Date();

    const [updated] = await db.update(availabilityRulesTable).set(updates).where(eq(availabilityRulesTable.id, Number(id))).returning();
    await auditLog("AVAILABILITY_RULE", updated.id, "ATUALIZADA", updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete("/agenda-motor/availability-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(availabilityRulesTable).set({ ativa: false, atualizadoEm: new Date() }).where(eq(availabilityRulesTable.id, Number(id)));
    await auditLog("AVAILABILITY_RULE", Number(id), "DESATIVADA", {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

function generateTimeSlots(horaInicio: string, horaFim: string, duracaoMin: number): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [startH, startM] = horaInicio.split(":").map(Number);
  const [endH, endM] = horaFim.split(":").map(Number);
  let currentMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (currentMin + duracaoMin <= endMin) {
    const sH = Math.floor(currentMin / 60);
    const sM = currentMin % 60;
    const eH = Math.floor((currentMin + duracaoMin) / 60);
    const eM = (currentMin + duracaoMin) % 60;
    slots.push({
      start: `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
      end: `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`,
    });
    currentMin += duracaoMin;
  }
  return slots;
}

router.post("/agenda-motor/generate-slots", async (req, res) => {
  try {
    const { dataInicio, dataFim, profissionalId, unidadeId } = req.body;

    if (!dataInicio || !dataFim) {
      res.status(400).json({ erro: "dataInicio e dataFim sao obrigatorios" });
      return;
    }

    const conditions: any[] = [eq(availabilityRulesTable.ativa, true)];
    if (profissionalId) conditions.push(eq(availabilityRulesTable.profissionalId, Number(profissionalId)));
    if (unidadeId) conditions.push(eq(availabilityRulesTable.unidadeId, Number(unidadeId)));

    const rules = await db.select().from(availabilityRulesTable).where(and(...conditions));

    if (rules.length === 0) {
      res.json({ gerados: 0, mensagem: "Nenhuma regra de disponibilidade encontrada" });
      return;
    }

    const blocks = await db.select().from(agendaBlocksTable).where(
      and(gte(agendaBlocksTable.data, dataInicio), lte(agendaBlocksTable.data, dataFim))
    );

    const blockSet = new Set<string>();
    for (const b of blocks) {
      if (b.diaTodo) {
        blockSet.add(`${b.profissionalId}_${b.data}_ALL`);
      } else {
        blockSet.add(`${b.profissionalId}_${b.data}_${b.horaInicio}_${b.horaFim}`);
      }
    }

    let gerados = 0;
    let ignorados = 0;
    const startDate = new Date(dataInicio + "T00:00:00");
    const endDate = new Date(dataFim + "T00:00:00");

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);

      for (const rule of rules) {
        if (rule.diaSemana !== dayOfWeek) continue;

        if (blockSet.has(`${rule.profissionalId}_${dateStr}_ALL`)) continue;

        const timeSlots = generateTimeSlots(rule.horaInicio, rule.horaFim, rule.duracaoSlotMin);

        for (const ts of timeSlots) {
          const isBlocked = blocks.some(b =>
            b.profissionalId === rule.profissionalId &&
            b.data === dateStr &&
            !b.diaTodo &&
            b.horaInicio && b.horaFim &&
            ts.start >= b.horaInicio && ts.end <= b.horaFim
          );
          if (isBlocked) { ignorados++; continue; }

          try {
            await db.insert(agendaSlotsTable).values({
              profissionalId: rule.profissionalId,
              unidadeId: rule.unidadeId,
              subAgendaId: rule.subAgendaId || null,
              availabilityRuleId: rule.id,
              data: dateStr,
              horaInicio: ts.start,
              horaFim: ts.end,
              duracaoMin: rule.duracaoSlotMin,
              tipoProcedimento: rule.tipoProcedimento,
              status: "disponivel",
            }).onConflictDoNothing();
            gerados++;
          } catch {
            ignorados++;
          }
        }
      }
    }

    await auditLog("SLOT_GENERATION", 0, "GERADOS", { dataInicio, dataFim, gerados, ignorados });
    res.json({ gerados, ignorados, regras: rules.length });
  } catch (err: any) {
    console.error("Erro generate-slots:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/slots", async (req, res) => {
  try {
    const { data, dataInicio, dataFim, profissionalId, unidadeId, status, tipoProcedimento } = req.query;
    const conditions: any[] = [];

    if (data) {
      conditions.push(eq(agendaSlotsTable.data, data as string));
    } else if (dataInicio && dataFim) {
      conditions.push(gte(agendaSlotsTable.data, dataInicio as string));
      conditions.push(lte(agendaSlotsTable.data, dataFim as string));
    }
    if (profissionalId) conditions.push(eq(agendaSlotsTable.profissionalId, Number(profissionalId)));
    if (unidadeId) conditions.push(eq(agendaSlotsTable.unidadeId, Number(unidadeId)));
    if (status) conditions.push(eq(agendaSlotsTable.status, status as string));
    if (tipoProcedimento) conditions.push(eq(agendaSlotsTable.tipoProcedimento, tipoProcedimento as string));

    const slots = await db
      .select({
        id: agendaSlotsTable.id,
        profissionalId: agendaSlotsTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        unidadeId: agendaSlotsTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        data: agendaSlotsTable.data,
        horaInicio: agendaSlotsTable.horaInicio,
        horaFim: agendaSlotsTable.horaFim,
        duracaoMin: agendaSlotsTable.duracaoMin,
        tipoProcedimento: agendaSlotsTable.tipoProcedimento,
        status: agendaSlotsTable.status,
        bloqueadoMotivo: agendaSlotsTable.bloqueadoMotivo,
      })
      .from(agendaSlotsTable)
      .leftJoin(usuariosTable, eq(agendaSlotsTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(agendaSlotsTable.unidadeId, unidadesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(agendaSlotsTable.data, agendaSlotsTable.horaInicio);

    res.json(slots);
  } catch (err: any) {
    console.error("Erro slots:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/slots/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const [updated] = await db.update(agendaSlotsTable)
      .set({ status: "bloqueado", bloqueadoMotivo: motivo || "Bloqueado manualmente" })
      .where(eq(agendaSlotsTable.id, Number(id)))
      .returning();
    await auditLog("SLOT", updated.id, "BLOQUEADO", { motivo });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/slots/:id/unblock", async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await db.update(agendaSlotsTable)
      .set({ status: "disponivel", bloqueadoMotivo: null })
      .where(eq(agendaSlotsTable.id, Number(id)))
      .returning();
    await auditLog("SLOT", updated.id, "DESBLOQUEADO", {});
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/book", async (req, res) => {
  try {
    const { slotId, pacienteId, observacoes, origemAgendamento, syncGoogleCalendar } = req.body;

    if (!slotId || !pacienteId) {
      res.status(400).json({ erro: "slotId e pacienteId sao obrigatorios" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [slot] = await tx
        .select()
        .from(agendaSlotsTable)
        .where(eq(agendaSlotsTable.id, Number(slotId)))
        .for("update");

      if (!slot) {
        throw new Error("Slot nao encontrado");
      }

      if (slot.status !== "disponivel") {
        throw new Error(`Slot nao disponivel (status: ${slot.status})`);
      }

      if (slot.liberado === false) {
        throw new Error("Slot ainda nao liberado para agendamento (turno da tarde aguardando limiar)");
      }

      const existingLock = await tx
        .select()
        .from(slotLocksTable)
        .where(and(
          eq(slotLocksTable.slotId, slot.id),
          eq(slotLocksTable.released, false),
          gte(slotLocksTable.expiresAt, new Date())
        ));

      if (existingLock.length > 0) {
        throw new Error("Slot esta temporariamente bloqueado por outro usuario");
      }

      const conflictingAppointment = await tx
        .select()
        .from(appointmentsTable)
        .where(and(
          eq(appointmentsTable.profissionalId, slot.profissionalId),
          eq(appointmentsTable.data, slot.data),
          eq(appointmentsTable.horaInicio, slot.horaInicio),
          or(eq(appointmentsTable.status, "agendado"), eq(appointmentsTable.status, "confirmado"))
        ));

      if (conflictingAppointment.length > 0) {
        throw new Error("Ja existe agendamento neste horario");
      }

      const [appointment] = await tx.insert(appointmentsTable).values({
        slotId: slot.id,
        pacienteId: Number(pacienteId),
        profissionalId: slot.profissionalId,
        unidadeId: slot.unidadeId,
        tipoProcedimento: slot.tipoProcedimento,
        data: slot.data,
        horaInicio: slot.horaInicio,
        horaFim: slot.horaFim,
        duracaoMin: slot.duracaoMin,
        status: "agendado",
        observacoes: observacoes || null,
        origemAgendamento: origemAgendamento || "sistema",
      }).returning();

      await tx.update(agendaSlotsTable)
        .set({ status: "ocupado" })
        .where(eq(agendaSlotsTable.id, slot.id));

      return appointment;
    });

    await auditLog("APPOINTMENT", result.id, "AGENDADO", { slotId, pacienteId, data: result.data, hora: result.horaInicio });

    if (syncGoogleCalendar) {
      try {
        const googleEventId = await syncAppointmentToGoogleCalendar(result);
        if (googleEventId) {
          await db.update(appointmentsTable)
            .set({ googleEventId, atualizadoEm: new Date() })
            .where(eq(appointmentsTable.id, result.id));
          result.googleEventId = googleEventId;
        }
      } catch (gcErr) {
        console.error("Erro sync GCal (nao-bloqueante):", gcErr);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error("Erro booking:", err);
    if (err.message.includes("nao encontrado") || err.message.includes("nao disponivel") || err.message.includes("bloqueado") || err.message.includes("Ja existe")) {
      res.status(409).json({ erro: err.message });
    } else {
      res.status(500).json({ erro: err.message });
    }
  }
});

router.post("/agenda-motor/cancel", async (req, res) => {
  try {
    const { appointmentId, motivo } = req.body;

    if (!appointmentId) {
      res.status(400).json({ erro: "appointmentId e obrigatorio" });
      return;
    }

    await db.transaction(async (tx) => {
      const [appointment] = await tx
        .select()
        .from(appointmentsTable)
        .where(eq(appointmentsTable.id, Number(appointmentId)))
        .for("update");

      if (!appointment) throw new Error("Agendamento nao encontrado");
      if (appointment.status === "cancelado") throw new Error("Agendamento ja cancelado");

      await tx.update(appointmentsTable)
        .set({ status: "cancelado", observacoes: motivo ? `[CANCELADO] ${motivo}` : "[CANCELADO]", atualizadoEm: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));

      await tx.update(agendaSlotsTable)
        .set({ status: "disponivel" })
        .where(eq(agendaSlotsTable.id, appointment.slotId));

      if (appointment.googleEventId) {
        try {
          const calendar = await getCalendarClient();
          const calendarId = appointment.googleCalendarId || "primary";
          await calendar.events.delete({ calendarId, eventId: appointment.googleEventId });
        } catch (gcErr) {
          console.error("Erro deletar GCal event:", gcErr);
        }
      }
    });

    await auditLog("APPOINTMENT", Number(appointmentId), "CANCELADO", { motivo });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Erro cancel:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/reschedule", async (req, res) => {
  try {
    const { appointmentId, novoSlotId, motivo, reagendadoPorId, syncGoogleCalendar } = req.body;

    if (!appointmentId || !novoSlotId) {
      res.status(400).json({ erro: "appointmentId e novoSlotId sao obrigatorios" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [appointment] = await tx
        .select()
        .from(appointmentsTable)
        .where(eq(appointmentsTable.id, Number(appointmentId)))
        .for("update");

      if (!appointment) throw new Error("Agendamento nao encontrado");
      if (appointment.status === "cancelado") throw new Error("Agendamento cancelado nao pode ser reagendado");

      const [novoSlot] = await tx
        .select()
        .from(agendaSlotsTable)
        .where(eq(agendaSlotsTable.id, Number(novoSlotId)))
        .for("update");

      if (!novoSlot) throw new Error("Novo slot nao encontrado");
      if (novoSlot.status !== "disponivel") throw new Error(`Novo slot nao disponivel (status: ${novoSlot.status})`);

      await tx.insert(appointmentReschedulesTable).values({
        appointmentId: appointment.id,
        slotAnteriorId: appointment.slotId,
        slotNovoId: novoSlot.id,
        dataAnterior: appointment.data,
        horaAnterior: appointment.horaInicio,
        dataNova: novoSlot.data,
        horaNova: novoSlot.horaInicio,
        motivo: motivo || null,
        reagendadoPorId: reagendadoPorId ? Number(reagendadoPorId) : null,
        origemReagendamento: "sistema",
      });

      await tx.update(agendaSlotsTable)
        .set({ status: "disponivel" })
        .where(eq(agendaSlotsTable.id, appointment.slotId));

      await tx.update(agendaSlotsTable)
        .set({ status: "ocupado" })
        .where(eq(agendaSlotsTable.id, novoSlot.id));

      const [updated] = await tx.update(appointmentsTable)
        .set({
          slotId: novoSlot.id,
          data: novoSlot.data,
          horaInicio: novoSlot.horaInicio,
          horaFim: novoSlot.horaFim,
          duracaoMin: novoSlot.duracaoMin,
          atualizadoEm: new Date(),
        })
        .where(eq(appointmentsTable.id, appointment.id))
        .returning();

      return { appointment: updated, anterior: { data: appointment.data, hora: appointment.horaInicio }, novo: { data: novoSlot.data, hora: novoSlot.horaInicio } };
    });

    await auditLog("APPOINTMENT", Number(appointmentId), "REAGENDADO", { de: result.anterior, para: result.novo, motivo });

    if (syncGoogleCalendar && result.appointment.googleEventId) {
      try {
        const calendar = await getCalendarClient();
        const calendarId = result.appointment.googleCalendarId || "primary";
        await calendar.events.patch({
          calendarId,
          eventId: result.appointment.googleEventId,
          requestBody: {
            start: { dateTime: `${result.novo.data}T${result.novo.hora}:00`, timeZone: "America/Sao_Paulo" },
            end: { dateTime: `${result.novo.data}T${result.appointment.horaFim}:00`, timeZone: "America/Sao_Paulo" },
          },
        });
      } catch (gcErr) {
        console.error("Erro update GCal event:", gcErr);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error("Erro reschedule:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/appointments", async (req, res) => {
  try {
    const { data, dataInicio, dataFim, profissionalId, unidadeId, pacienteId, status } = req.query;
    const conditions: any[] = [];

    if (data) {
      conditions.push(eq(appointmentsTable.data, data as string));
    } else if (dataInicio && dataFim) {
      conditions.push(gte(appointmentsTable.data, dataInicio as string));
      conditions.push(lte(appointmentsTable.data, dataFim as string));
    }
    if (profissionalId) conditions.push(eq(appointmentsTable.profissionalId, Number(profissionalId)));
    if (unidadeId) conditions.push(eq(appointmentsTable.unidadeId, Number(unidadeId)));
    if (pacienteId) conditions.push(eq(appointmentsTable.pacienteId, Number(pacienteId)));
    if (status) {
      const statuses = (status as string).split(",");
      conditions.push(inArray(appointmentsTable.status, statuses));
    }

    const appointments = await db
      .select({
        id: appointmentsTable.id,
        slotId: appointmentsTable.slotId,
        pacienteId: appointmentsTable.pacienteId,
        pacienteNome: pacientesTable.nome,
        pacienteTelefone: pacientesTable.telefone,
        profissionalId: appointmentsTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        unidadeId: appointmentsTable.unidadeId,
        tipoProcedimento: appointmentsTable.tipoProcedimento,
        data: appointmentsTable.data,
        horaInicio: appointmentsTable.horaInicio,
        horaFim: appointmentsTable.horaFim,
        duracaoMin: appointmentsTable.duracaoMin,
        status: appointmentsTable.status,
        googleEventId: appointmentsTable.googleEventId,
        observacoes: appointmentsTable.observacoes,
        origemAgendamento: appointmentsTable.origemAgendamento,
        criadoEm: appointmentsTable.criadoEm,
      })
      .from(appointmentsTable)
      .leftJoin(pacientesTable, eq(appointmentsTable.pacienteId, pacientesTable.id))
      .leftJoin(usuariosTable, eq(appointmentsTable.profissionalId, usuariosTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(appointmentsTable.data, appointmentsTable.horaInicio);

    res.json(appointments);
  } catch (err: any) {
    console.error("Erro appointments:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/appointments/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const reschedules = await db.select().from(appointmentReschedulesTable)
      .where(eq(appointmentReschedulesTable.appointmentId, Number(id)))
      .orderBy(desc(appointmentReschedulesTable.criadoEm));
    res.json(reschedules);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/blocks", async (req, res) => {
  try {
    const { profissionalId, dataInicio, dataFim } = req.query;
    const conditions: any[] = [];
    if (profissionalId) conditions.push(eq(agendaBlocksTable.profissionalId, Number(profissionalId)));
    if (dataInicio) conditions.push(gte(agendaBlocksTable.data, dataInicio as string));
    if (dataFim) conditions.push(lte(agendaBlocksTable.data, dataFim as string));

    const blocks = await db.select().from(agendaBlocksTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(agendaBlocksTable.data);
    res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/blocks", async (req, res) => {
  try {
    const { profissionalId, unidadeId, data, horaInicio, horaFim, diaTodo, motivo } = req.body;

    if (!profissionalId || !data || !motivo) {
      res.status(400).json({ erro: "profissionalId, data e motivo sao obrigatorios" });
      return;
    }

    const [inserted] = await db.insert(agendaBlocksTable).values({
      profissionalId: Number(profissionalId),
      unidadeId: unidadeId ? Number(unidadeId) : null,
      data,
      horaInicio: diaTodo ? null : horaInicio,
      horaFim: diaTodo ? null : horaFim,
      diaTodo: diaTodo || false,
      motivo,
    }).returning();

    if (diaTodo || (horaInicio && horaFim)) {
      const slotConditions: any[] = [
        eq(agendaSlotsTable.profissionalId, Number(profissionalId)),
        eq(agendaSlotsTable.data, data),
        eq(agendaSlotsTable.status, "disponivel"),
      ];
      if (!diaTodo && horaInicio && horaFim) {
        slotConditions.push(gte(agendaSlotsTable.horaInicio, horaInicio));
        slotConditions.push(lte(agendaSlotsTable.horaFim, horaFim));
      }
      await db.update(agendaSlotsTable)
        .set({ status: "bloqueado", bloqueadoMotivo: motivo })
        .where(and(...slotConditions));
    }

    await auditLog("BLOCK", inserted.id, "CRIADO", { profissionalId, data, motivo });
    res.json(inserted);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete("/agenda-motor/blocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(agendaBlocksTable).where(eq(agendaBlocksTable.id, Number(id))).returning();
    if (deleted) {
      await auditLog("BLOCK", deleted.id, "REMOVIDO", {});
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/sync-gcal", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      res.status(400).json({ erro: "appointmentId e obrigatorio" });
      return;
    }

    const [appointment] = await db
      .select({
        id: appointmentsTable.id,
        pacienteNome: pacientesTable.nome,
        pacienteTelefone: pacientesTable.telefone,
        profissionalNome: usuariosTable.nome,
        unidadeNome: unidadesTable.nome,
        googleCalendarIdUnidade: unidadesTable.googleCalendarId,
        tipoProcedimento: appointmentsTable.tipoProcedimento,
        data: appointmentsTable.data,
        horaInicio: appointmentsTable.horaInicio,
        horaFim: appointmentsTable.horaFim,
        duracaoMin: appointmentsTable.duracaoMin,
        status: appointmentsTable.status,
        googleEventId: appointmentsTable.googleEventId,
        observacoes: appointmentsTable.observacoes,
      })
      .from(appointmentsTable)
      .leftJoin(pacientesTable, eq(appointmentsTable.pacienteId, pacientesTable.id))
      .leftJoin(usuariosTable, eq(appointmentsTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(appointmentsTable.unidadeId, unidadesTable.id))
      .where(eq(appointmentsTable.id, Number(appointmentId)));

    if (!appointment) {
      res.status(404).json({ erro: "Agendamento nao encontrado" });
      return;
    }

    const googleEventId = await syncAppointmentToGoogleCalendar(appointment);

    if (googleEventId) {
      await db.update(appointmentsTable)
        .set({ googleEventId, googleCalendarId: appointment.googleCalendarIdUnidade || "primary", atualizadoEm: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));
    }

    await auditLog("APPOINTMENT", appointment.id, "GCAL_SYNC", { googleEventId });
    res.json({ ok: true, googleEventId });
  } catch (err: any) {
    console.error("Erro sync-gcal:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/agenda-motor/pull-gcal", async (req, res) => {
  try {
    const { calendarId, dataInicio, dataFim, unidadeId, profissionalId } = req.body;

    if (!dataInicio || !dataFim) {
      res.status(400).json({ erro: "dataInicio e dataFim sao obrigatorios" });
      return;
    }

    const calendar = await getCalendarClient();
    const targetCalendarId = calendarId || "primary";

    const eventsResponse = await calendar.events.list({
      calendarId: targetCalendarId,
      timeMin: `${dataInicio}T00:00:00-03:00`,
      timeMax: `${dataFim}T23:59:59-03:00`,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = eventsResponse.data.items || [];

    const existingAppointments = await db
      .select({ googleEventId: appointmentsTable.googleEventId })
      .from(appointmentsTable)
      .where(and(
        gte(appointmentsTable.data, dataInicio),
        lte(appointmentsTable.data, dataFim),
      ));
    const existingEventIds = new Set(existingAppointments.map(a => a.googleEventId).filter(Boolean));

    let importados = 0;
    let ignorados = 0;

    for (const event of events) {
      if (!event.id || existingEventIds.has(event.id)) { ignorados++; continue; }
      if (!event.start?.dateTime) { ignorados++; continue; }

      const startDt = new Date(event.start.dateTime);
      const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startDt.getTime() + 30 * 60000);

      const eventData = startDt.toISOString().slice(0, 10);
      const eventHoraInicio = startDt.toTimeString().slice(0, 5);
      const eventHoraFim = endDt.toTimeString().slice(0, 5);
      const duracaoMin = Math.round((endDt.getTime() - startDt.getTime()) / 60000);

      await db.insert(appointmentsTable).values({
        slotId: 0,
        pacienteId: 0,
        profissionalId: profissionalId ? Number(profissionalId) : 0,
        unidadeId: unidadeId ? Number(unidadeId) : 0,
        tipoProcedimento: "CONSULTA_30_PRESENCIAL",
        data: eventData,
        horaInicio: eventHoraInicio,
        horaFim: eventHoraFim,
        duracaoMin,
        status: "agendado",
        googleEventId: event.id,
        googleCalendarId: targetCalendarId,
        observacoes: `[GCAL IMPORT] ${event.summary || "Sem titulo"}`,
        origemAgendamento: "google_calendar",
      });
      importados++;
    }

    await auditLog("GCAL_PULL", 0, "IMPORTADOS", { calendarId: targetCalendarId, dataInicio, dataFim, importados, ignorados });
    res.json({ importados, ignorados, totalEventos: events.length });
  } catch (err: any) {
    console.error("Erro pull-gcal:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get("/agenda-motor/weekly-view", async (req, res) => {
  try {
    const { dataInicio, profissionalId, unidadeId } = req.query;

    if (!dataInicio) {
      res.status(400).json({ erro: "dataInicio e obrigatorio" });
      return;
    }

    const start = new Date(dataInicio as string);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const dataFim = end.toISOString().slice(0, 10);

    const slotConditions: any[] = [
      gte(agendaSlotsTable.data, dataInicio as string),
      lte(agendaSlotsTable.data, dataFim),
    ];
    if (profissionalId) slotConditions.push(eq(agendaSlotsTable.profissionalId, Number(profissionalId)));
    if (unidadeId) slotConditions.push(eq(agendaSlotsTable.unidadeId, Number(unidadeId)));

    const slots = await db
      .select({
        id: agendaSlotsTable.id,
        profissionalId: agendaSlotsTable.profissionalId,
        subAgendaId: agendaSlotsTable.subAgendaId,
        data: agendaSlotsTable.data,
        horaInicio: agendaSlotsTable.horaInicio,
        horaFim: agendaSlotsTable.horaFim,
        duracaoMin: agendaSlotsTable.duracaoMin,
        tipoProcedimento: agendaSlotsTable.tipoProcedimento,
        status: agendaSlotsTable.status,
        turno: agendaSlotsTable.turno,
        liberado: agendaSlotsTable.liberado,
      })
      .from(agendaSlotsTable)
      .where(and(...slotConditions))
      .orderBy(agendaSlotsTable.data, agendaSlotsTable.horaInicio);

    const apptConditions: any[] = [
      gte(appointmentsTable.data, dataInicio as string),
      lte(appointmentsTable.data, dataFim),
      inArray(appointmentsTable.status, ["agendado", "confirmado", "em_andamento", "faltou", "realizado"]),
    ];
    if (profissionalId) apptConditions.push(eq(appointmentsTable.profissionalId, Number(profissionalId)));
    if (unidadeId) apptConditions.push(eq(appointmentsTable.unidadeId, Number(unidadeId)));

    const appointments = await db
      .select({
        id: appointmentsTable.id,
        slotId: appointmentsTable.slotId,
        pacienteId: appointmentsTable.pacienteId,
        pacienteNome: pacientesTable.nome,
        pacienteTelefone: pacientesTable.telefone,
        profissionalId: appointmentsTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        tipoProcedimento: appointmentsTable.tipoProcedimento,
        data: appointmentsTable.data,
        horaInicio: appointmentsTable.horaInicio,
        horaFim: appointmentsTable.horaFim,
        duracaoMin: appointmentsTable.duracaoMin,
        status: appointmentsTable.status,
        googleEventId: appointmentsTable.googleEventId,
        observacoes: appointmentsTable.observacoes,
        origemAgendamento: appointmentsTable.origemAgendamento,
      })
      .from(appointmentsTable)
      .leftJoin(pacientesTable, eq(appointmentsTable.pacienteId, pacientesTable.id))
      .leftJoin(usuariosTable, eq(appointmentsTable.profissionalId, usuariosTable.id))
      .where(and(...apptConditions))
      .orderBy(appointmentsTable.data, appointmentsTable.horaInicio);

    const days: Record<string, { data: string; diaSemana: number; slots: any[]; appointments: any[] }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      days[dateStr] = { data: dateStr, diaSemana: d.getDay(), slots: [], appointments: [] };
    }

    for (const slot of slots) {
      if (days[slot.data]) days[slot.data].slots.push(slot);
    }
    for (const appt of appointments) {
      if (days[appt.data]) days[appt.data].appointments.push(appt);
    }

    const summary = {
      totalSlots: slots.length,
      slotsDisponiveis: slots.filter(s => s.status === "disponivel").length,
      slotsOcupados: slots.filter(s => s.status === "ocupado").length,
      slotsBloqueados: slots.filter(s => s.status === "bloqueado").length,
      totalAppointments: appointments.length,
    };

    res.json({ dataInicio: dataInicio as string, dataFim, days: Object.values(days), summary });
  } catch (err: any) {
    console.error("Erro weekly-view:", err);
    res.status(500).json({ erro: err.message });
  }
});

async function syncAppointmentToGoogleCalendar(appointment: any): Promise<string | null> {
  try {
    const calendar = await getCalendarClient();
    const calendarId = appointment.googleCalendarIdUnidade || appointment.googleCalendarId || "primary";
    const tipoInfo = TIPOS_PROCEDIMENTO[appointment.tipoProcedimento as keyof typeof TIPOS_PROCEDIMENTO];

    const summary = `${appointment.pacienteNome || "Paciente"} - ${tipoInfo?.label || appointment.tipoProcedimento}`;
    const description = [
      `MOTOR CLINICO - AGENDAMENTO`,
      `Paciente: ${appointment.pacienteNome || "—"}`,
      `Telefone: ${appointment.pacienteTelefone || "—"}`,
      `Profissional: ${appointment.profissionalNome || "—"}`,
      `Unidade: ${appointment.unidadeNome || "—"}`,
      `Procedimento: ${tipoInfo?.label || appointment.tipoProcedimento}`,
      `Duracao: ${appointment.duracaoMin} min`,
      appointment.observacoes ? `Obs: ${appointment.observacoes}` : "",
    ].filter(Boolean).join("\n");

    if (appointment.googleEventId) {
      await calendar.events.patch({
        calendarId,
        eventId: appointment.googleEventId,
        requestBody: {
          summary,
          description,
          start: { dateTime: `${appointment.data}T${appointment.horaInicio}:00`, timeZone: "America/Sao_Paulo" },
          end: { dateTime: `${appointment.data}T${appointment.horaFim}:00`, timeZone: "America/Sao_Paulo" },
        },
      });
      return appointment.googleEventId;
    }

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${appointment.data}T${appointment.horaInicio}:00`, timeZone: "America/Sao_Paulo" },
        end: { dateTime: `${appointment.data}T${appointment.horaFim}:00`, timeZone: "America/Sao_Paulo" },
        colorId: tipoInfo ? getGCalColorId(appointment.tipoProcedimento) : undefined,
      },
    });

    return event.data.id || null;
  } catch (err) {
    console.error("Erro syncAppointmentToGoogleCalendar:", err);
    return null;
  }
}

function getGCalColorId(tipo: string): string {
  const map: Record<string, string> = {
    CONSULTA_30_PRESENCIAL: "1",
    CONSULTA_30_ONLINE: "3",
    CONSULTA_60_PRESENCIAL: "1",
    RETORNO_15_PRESENCIAL: "7",
    INFUSAO_CURTA_60_PRESENCIAL: "2",
    INFUSAO_MEDIA_120_PRESENCIAL: "5",
    INFUSAO_LONGA_180_PRESENCIAL: "11",
    INFUSAO_EXTRA_240_PRESENCIAL: "11",
    IMPLANTE_120_PRESENCIAL: "3",
    IM_15_PRESENCIAL: "10",
    AVALIACAO_ENF_30_PRESENCIAL: "6",
    EXAME_30_PRESENCIAL: "8",
  };
  return map[tipo] || "1";
}

router.get("/agenda-motor/smart-release-config", async (req, res) => {
  try {
    const { unidadeId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(smartReleaseConfigTable.unidadeId, Number(unidadeId)));

    const configs = await db
      .select({
        id: smartReleaseConfigTable.id,
        unidadeId: smartReleaseConfigTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        profissionalId: smartReleaseConfigTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        turnoManhaInicio: smartReleaseConfigTable.turnoManhaInicio,
        turnoManhaFim: smartReleaseConfigTable.turnoManhaFim,
        turnoTardeInicio: smartReleaseConfigTable.turnoTardeInicio,
        turnoTardeFim: smartReleaseConfigTable.turnoTardeFim,
        limiarLiberacaoPercent: smartReleaseConfigTable.limiarLiberacaoPercent,
        ativa: smartReleaseConfigTable.ativa,
      })
      .from(smartReleaseConfigTable)
      .leftJoin(unidadesTable, eq(smartReleaseConfigTable.unidadeId, unidadesTable.id))
      .leftJoin(usuariosTable, eq(smartReleaseConfigTable.profissionalId, usuariosTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/agenda-motor/smart-release-config", async (req, res) => {
  try {
    const { unidadeId, profissionalId, turnoManhaInicio, turnoManhaFim, turnoTardeInicio, turnoTardeFim, limiarLiberacaoPercent, ativa } = req.body;
    if (!unidadeId) {
      res.status(400).json({ error: "unidadeId obrigatorio" });
      return;
    }

    const [config] = await db.insert(smartReleaseConfigTable).values({
      unidadeId: Number(unidadeId),
      profissionalId: profissionalId ? Number(profissionalId) : null,
      turnoManhaInicio: turnoManhaInicio || "08:00",
      turnoManhaFim: turnoManhaFim || "12:00",
      turnoTardeInicio: turnoTardeInicio || "13:00",
      turnoTardeFim: turnoTardeFim || "18:00",
      limiarLiberacaoPercent: limiarLiberacaoPercent ?? 60,
      ativa: ativa !== false,
    }).returning();

    res.status(201).json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/agenda-motor/smart-release-config/:id", async (req, res) => {
  try {
    await db.delete(smartReleaseConfigTable).where(eq(smartReleaseConfigTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/agenda-motor/smart-release", async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.body;
    const hoje = new Date().toISOString().split("T")[0];
    const inicio = dataInicio || hoje;
    const fim = dataFim || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();

    const configs = await db.select().from(smartReleaseConfigTable).where(eq(smartReleaseConfigTable.ativa, true));

    if (configs.length === 0) {
      res.json({ mensagem: "Nenhuma configuracao de liberacao inteligente ativa", liberados: 0, detalhes: [] });
      return;
    }

    const resultados: any[] = [];

    for (const config of configs) {
      const slotConditions: any[] = [
        eq(agendaSlotsTable.unidadeId, config.unidadeId),
        gte(agendaSlotsTable.data, inicio),
        lte(agendaSlotsTable.data, fim),
      ];
      if (config.profissionalId) {
        slotConditions.push(eq(agendaSlotsTable.profissionalId, config.profissionalId));
      }

      const allSlots = await db.select().from(agendaSlotsTable).where(and(...slotConditions));

      const slotsPorDia: Record<string, typeof allSlots> = {};
      for (const s of allSlots) {
        if (!slotsPorDia[s.data]) slotsPorDia[s.data] = [];
        slotsPorDia[s.data].push(s);
      }

      for (const [dia, slots] of Object.entries(slotsPorDia)) {
        const slotsManha = slots.filter(s => s.horaInicio >= config.turnoManhaInicio && s.horaInicio < config.turnoManhaFim);
        const slotsTarde = slots.filter(s => s.horaInicio >= config.turnoTardeInicio && s.horaInicio < config.turnoTardeFim);

        for (const s of slotsManha) {
          if (!s.liberado) {
            await db.update(agendaSlotsTable).set({ liberado: true, turno: "manha" }).where(eq(agendaSlotsTable.id, s.id));
          } else if (s.turno !== "manha") {
            await db.update(agendaSlotsTable).set({ turno: "manha" }).where(eq(agendaSlotsTable.id, s.id));
          }
        }

        for (const s of slotsTarde) {
          if (s.turno !== "tarde") {
            await db.update(agendaSlotsTable).set({ turno: "tarde" }).where(eq(agendaSlotsTable.id, s.id));
          }
        }

        const manhaOcupados = slotsManha.filter(s => s.status === "ocupado").length;
        const manhaTotal = slotsManha.length;
        const percentOcupado = manhaTotal > 0 ? Math.round((manhaOcupados / manhaTotal) * 100) : 0;

        let tardeLiberados = 0;
        if (percentOcupado >= config.limiarLiberacaoPercent) {
          for (const s of slotsTarde) {
            if (!s.liberado) {
              await db.update(agendaSlotsTable).set({ liberado: true }).where(eq(agendaSlotsTable.id, s.id));
              tardeLiberados++;
            }
          }
        } else {
          for (const s of slotsTarde) {
            if (s.liberado && s.status === "disponivel") {
              await db.update(agendaSlotsTable).set({ liberado: false }).where(eq(agendaSlotsTable.id, s.id));
            }
          }
        }

        resultados.push({
          dia,
          unidadeId: config.unidadeId,
          profissionalId: config.profissionalId,
          manhaTotal,
          manhaOcupados,
          percentOcupado,
          limiar: config.limiarLiberacaoPercent,
          tardeLiberada: percentOcupado >= config.limiarLiberacaoPercent,
          tardeLiberados,
          tardeTotal: slotsTarde.length,
        });
      }
    }

    const totalLiberados = resultados.reduce((sum, r) => sum + r.tardeLiberados, 0);

    await auditLog("smart_release", 0, "liberacao_inteligente", { resultados, totalLiberados });

    res.json({
      mensagem: `Liberacao inteligente processada: ${totalLiberados} slot(s) de tarde liberados`,
      liberados: totalLiberados,
      detalhes: resultados,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/agenda-motor/slots-liberados", async (req, res) => {
  try {
    const { profissionalId, unidadeId, dataInicio, dataFim, tipoProcedimento } = req.query;

    const conditions: any[] = [
      eq(agendaSlotsTable.liberado, true),
      eq(agendaSlotsTable.status, "disponivel"),
    ];

    if (profissionalId) conditions.push(eq(agendaSlotsTable.profissionalId, Number(profissionalId)));
    if (unidadeId) conditions.push(eq(agendaSlotsTable.unidadeId, Number(unidadeId)));
    if (dataInicio) conditions.push(gte(agendaSlotsTable.data, String(dataInicio)));
    if (dataFim) conditions.push(lte(agendaSlotsTable.data, String(dataFim)));
    if (tipoProcedimento) conditions.push(eq(agendaSlotsTable.tipoProcedimento, String(tipoProcedimento)));

    const slots = await db
      .select({
        id: agendaSlotsTable.id,
        data: agendaSlotsTable.data,
        horaInicio: agendaSlotsTable.horaInicio,
        horaFim: agendaSlotsTable.horaFim,
        turno: agendaSlotsTable.turno,
        tipoProcedimento: agendaSlotsTable.tipoProcedimento,
        profissionalId: agendaSlotsTable.profissionalId,
        profissionalNome: usuariosTable.nome,
        unidadeId: agendaSlotsTable.unidadeId,
      })
      .from(agendaSlotsTable)
      .leftJoin(usuariosTable, eq(agendaSlotsTable.profissionalId, usuariosTable.id))
      .where(and(...conditions))
      .orderBy(agendaSlotsTable.data, agendaSlotsTable.horaInicio);

    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/agenda-motor/processar-faltas", async (req, res) => {
  try {
    const hoje = new Date().toISOString().split("T")[0];

    const agendamentosPassados = await db
      .select({
        id: appointmentsTable.id,
        slotId: appointmentsTable.slotId,
        pacienteId: appointmentsTable.pacienteId,
        profissionalId: appointmentsTable.profissionalId,
        unidadeId: appointmentsTable.unidadeId,
        tipoProcedimento: appointmentsTable.tipoProcedimento,
        data: appointmentsTable.data,
        horaInicio: appointmentsTable.horaInicio,
        horaFim: appointmentsTable.horaFim,
        duracaoMin: appointmentsTable.duracaoMin,
        status: appointmentsTable.status,
        pacienteNome: pacientesTable.nome,
        profissionalNome: usuariosTable.nome,
        unidadeNome: unidadesTable.nome,
      })
      .from(appointmentsTable)
      .leftJoin(pacientesTable, eq(appointmentsTable.pacienteId, pacientesTable.id))
      .leftJoin(usuariosTable, eq(appointmentsTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(appointmentsTable.unidadeId, unidadesTable.id))
      .where(
        and(
          inArray(appointmentsTable.status, ["agendado", "confirmado"]),
          lte(appointmentsTable.data, hoje)
        )
      );

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = ontem.toISOString().split("T")[0];
    const faltasProcessadas = agendamentosPassados.filter(a => a.data <= ontemStr);

    const resultados: any[] = [];

    for (const appt of faltasProcessadas) {
      await db.update(appointmentsTable).set({
        status: "faltou",
        motivoFalta: "Paciente nao compareceu - marcado automaticamente",
      }).where(eq(appointmentsTable.id, appt.id));

      await db.update(agendaSlotsTable).set({ status: "disponivel" }).where(eq(agendaSlotsTable.id, appt.slotId));

      await auditLog("appointment", appt.id, "faltou_automatico", {
        pacienteId: appt.pacienteId,
        data: appt.data,
        horaInicio: appt.horaInicio,
      });

      let autoReagendamentoId: number | null = null;
      try {
        const dataOriginal = new Date(appt.data + "T00:00:00");
        const proximaSemana = new Date(dataOriginal);
        proximaSemana.setDate(proximaSemana.getDate() + 7);
        const proximaSemanaStr = proximaSemana.toISOString().split("T")[0];

        const [slotProximaSemana] = await db
          .select()
          .from(agendaSlotsTable)
          .where(
            and(
              eq(agendaSlotsTable.profissionalId, appt.profissionalId),
              eq(agendaSlotsTable.data, proximaSemanaStr),
              eq(agendaSlotsTable.horaInicio, appt.horaInicio),
              eq(agendaSlotsTable.status, "disponivel")
            )
          )
          .limit(1);

        if (slotProximaSemana) {
          const [novoAgendamento] = await db.insert(appointmentsTable).values({
            slotId: slotProximaSemana.id,
            pacienteId: appt.pacienteId,
            profissionalId: appt.profissionalId,
            unidadeId: appt.unidadeId,
            tipoProcedimento: appt.tipoProcedimento,
            data: slotProximaSemana.data,
            horaInicio: slotProximaSemana.horaInicio,
            horaFim: slotProximaSemana.horaFim,
            duracaoMin: slotProximaSemana.duracaoMin,
            status: "agendado",
            origemAgendamento: "sistema_auto_falta",
            reagendamentoAutomaticoDeId: appt.id,
            observacoes: `Auto-reagendamento por falta em ${appt.data}`,
          }).returning();

          await db.update(agendaSlotsTable).set({ status: "ocupado" }).where(eq(agendaSlotsTable.id, slotProximaSemana.id));
          autoReagendamentoId = novoAgendamento.id;

          await auditLog("appointment", novoAgendamento.id, "auto_reagendamento_falta", {
            appointmentOriginalId: appt.id,
            dataOriginal: appt.data,
            dataNova: slotProximaSemana.data,
          });
        }
      } catch (autoErr: any) {
        console.error(`Erro ao auto-reagendar appointment ${appt.id}:`, autoErr.message);
      }

      try {
        await db.insert(taskCardsTable).values({
          pacienteId: appt.pacienteId,
          assignedRole: "enfermeira",
          titulo: `FALTA: ${appt.pacienteNome || "Paciente"} - ${appt.data}`,
          descricao: `Paciente ${appt.pacienteNome || ""} faltou ao agendamento de ${appt.tipoProcedimento} em ${appt.data} as ${appt.horaInicio} com ${appt.profissionalNome || "profissional"}. ${autoReagendamentoId ? "Auto-reagendado para proxima semana." : "Nao foi possivel reagendar automaticamente - sem slot disponivel."}`,
          prioridade: "alta",
          corAlerta: "vermelha",
          prazoHoras: 24,
          status: "pendente",
        });

        await db.insert(taskCardsTable).values({
          pacienteId: appt.pacienteId,
          assignedRole: "clinica_admin",
          titulo: `FALTA: ${appt.pacienteNome || "Paciente"} - ${appt.data}`,
          descricao: `Paciente ${appt.pacienteNome || ""} faltou ao agendamento de ${appt.tipoProcedimento} em ${appt.data} as ${appt.horaInicio}. ${autoReagendamentoId ? "Auto-reagendado para proxima semana." : "Reagendamento automatico indisponivel."}`,
          prioridade: "alta",
          corAlerta: "vermelha",
          prazoHoras: 48,
          status: "pendente",
        });
      } catch (cardErr: any) {
        console.error(`Erro ao criar task cards para appointment ${appt.id}:`, cardErr.message);
      }

      resultados.push({
        appointmentId: appt.id,
        paciente: appt.pacienteNome,
        data: appt.data,
        hora: appt.horaInicio,
        autoReagendamentoId,
        autoReagendado: !!autoReagendamentoId,
      });
    }

    res.json({
      processados: resultados.length,
      detalhes: resultados,
      mensagem: `${resultados.length} falta(s) processada(s)`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
