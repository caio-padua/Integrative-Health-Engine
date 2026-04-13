import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, insertSessaoSchema,
  aplicacoesSubstanciasTable, insertAplicacaoSubstanciaSchema,
  pacientesTable, substanciasTable, unidadesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createCalendarEvent, updateCalendarEventDescription, type SessaoCalendarData } from "../lib/google-calendar.js";

const router = Router();

const TEMPO_POR_TIPO: Record<string, number> = {
  im: 15,
  iv: 30,
  ev: 30,
  implant: 60,
  oral: 0,
  topico: 0,
  consulta: 60,
};

function calcularTipoProcedimento(vias: string[]): { descricao: string; duracaoMin: number } {
  const viasUnicas = new Set(vias.map(v => v?.toLowerCase() || ""));

  const temIM = viasUnicas.has("im");
  const temEV = viasUnicas.has("iv") || viasUnicas.has("ev");
  const temImplante = viasUnicas.has("implant");

  const partes: string[] = [];
  let duracaoMin = 0;

  if (temIM) {
    partes.push("APLICACAO INTRAMUSCULAR");
    duracaoMin += TEMPO_POR_TIPO.im;
  }
  if (temEV) {
    partes.push("APLICACAO ENDOVENOSA");
    duracaoMin += TEMPO_POR_TIPO.iv;
  }
  if (temImplante) {
    partes.push("IMPLANTE");
    duracaoMin += TEMPO_POR_TIPO.implant;
  }

  if (partes.length === 0) {
    return { descricao: "CONSULTA", duracaoMin: TEMPO_POR_TIPO.consulta };
  }

  if (partes.length === 1) {
    return { descricao: partes[0], duracaoMin };
  }

  const ultimaParte = partes.pop()!;
  return { descricao: partes.join(", ") + " E " + ultimaParte, duracaoMin };
}

function calcularHoraFim(horaInicio: string, duracaoMin: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMin = h * 60 + m + duracaoMin;
  const fh = Math.floor(totalMin / 60) % 24;
  const fm = totalMin % 60;
  return `${String(fh).padStart(2, "0")}:${String(fm).padStart(2, "0")}`;
}

async function recalcularSessao(sessaoId: number) {
  const aplicacoes = await db
    .select({ substanciaVia: substanciasTable.via })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

  const vias = aplicacoes.map(a => a.substanciaVia || "");
  const { descricao, duracaoMin } = calcularTipoProcedimento(vias);

  const [sessao] = await db.select().from(sessoesTable).where(eq(sessoesTable.id, sessaoId));
  if (!sessao) return null;

  const horaFim = calcularHoraFim(sessao.horaAgendada, duracaoMin);

  const [updated] = await db.update(sessoesTable).set({
    tipoProcedimento: descricao,
    duracaoTotalMin: duracaoMin,
    horaFim,
  }).where(eq(sessoesTable.id, sessaoId)).returning();

  return updated;
}

router.get("/sessoes", async (req, res) => {
  const { pacienteId, status, profissionalId, dataFrom, dataTo, unidadeId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(sessoesTable.pacienteId, Number(pacienteId)));
  if (status) conditions.push(eq(sessoesTable.status, String(status)));
  if (profissionalId) conditions.push(eq(sessoesTable.profissionalId, Number(profissionalId)));
  if (unidadeId) conditions.push(eq(sessoesTable.unidadeId, Number(unidadeId)));
  if (dataFrom) conditions.push(gte(sessoesTable.dataAgendada, String(dataFrom)));
  if (dataTo) conditions.push(lte(sessoesTable.dataAgendada, String(dataTo)));

  const result = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sessoesTable.dataAgendada, sessoesTable.horaAgendada);

  res.json(result);
});

router.post("/sessoes", async (req, res) => {
  const parsed = insertSessaoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(sessoesTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.get("/sessoes/:id", async (req, res) => {
  const [sessao] = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(eq(sessoesTable.id, Number(req.params.id)));

  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const aplicacoes = await db
    .select({
      aplicacao: aplicacoesSubstanciasTable,
      substanciaNome: substanciasTable.nome,
      substanciaCor: substanciasTable.cor,
      substanciaVia: substanciasTable.via,
      substanciaDuracao: substanciasTable.duracaoMinutos,
    })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)));

  res.json({ ...sessao, aplicacoes });
});

router.put("/sessoes/:id", async (req, res) => {
  const { status, dataAgendada, horaAgendada, notas, profissionalId, tipoServico } = req.body;
  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (dataAgendada !== undefined) updates.dataAgendada = dataAgendada;
  if (horaAgendada !== undefined) updates.horaAgendada = horaAgendada;
  if (notas !== undefined) updates.notas = notas;
  if (profissionalId !== undefined) updates.profissionalId = profissionalId;
  if (tipoServico !== undefined) updates.tipoServico = tipoServico;

  const [updated] = await db.update(sessoesTable).set(updates).where(eq(sessoesTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  if (horaAgendada !== undefined) {
    await recalcularSessao(updated.id);
  }

  res.json(updated);
});

router.post("/sessoes/:id/confirmar-substancia", async (req, res) => {
  const { substanciaId, confirmado, notas } = req.body;
  if (!substanciaId) { res.status(400).json({ error: "substanciaId obrigatorio" }); return; }

  const [aplicacao] = await db
    .select()
    .from(aplicacoesSubstanciasTable)
    .where(and(
      eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)),
      eq(aplicacoesSubstanciasTable.substanciaId, Number(substanciaId))
    ));

  if (!aplicacao) { res.status(404).json({ error: "Aplicacao nao encontrada" }); return; }

  const updates: Record<string, any> = {
    status: confirmado ? "aplicada" : "nao_aplicada",
  };
  if (confirmado) updates.aplicadoEm = new Date().toISOString();
  if (notas) updates.notas = notas;

  const [updated] = await db
    .update(aplicacoesSubstanciasTable)
    .set(updates)
    .where(eq(aplicacoesSubstanciasTable.id, aplicacao.id))
    .returning();

  const todasAplicacoes = await db
    .select()
    .from(aplicacoesSubstanciasTable)
    .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)));

  const todasConfirmadas = todasAplicacoes
    .filter(a => a.disponibilidade === "disp")
    .every(a => a.status === "aplicada" || a.status === "nao_aplicada");

  const algumAplicada = todasAplicacoes.some(a => a.status === "aplicada");

  if (todasConfirmadas) {
    await db.update(sessoesTable).set({ status: "concluida" }).where(eq(sessoesTable.id, Number(req.params.id)));
  } else if (algumAplicada) {
    await db.update(sessoesTable).set({ status: "parcial" }).where(eq(sessoesTable.id, Number(req.params.id)));
  }

  const [sessaoAtual] = await db
    .select({ googleEventId: sessoesTable.googleEventId, tipoProcedimento: sessoesTable.tipoProcedimento, duracaoTotalMin: sessoesTable.duracaoTotalMin, unidadeId: sessoesTable.unidadeId })
    .from(sessoesTable)
    .where(eq(sessoesTable.id, Number(req.params.id)));

  if (sessaoAtual?.googleEventId) {
    try {
      const [unidadeInfo] = await db.select({ calId: unidadesTable.googleCalendarId, nome: unidadesTable.nome, endereco: unidadesTable.endereco, bairro: unidadesTable.bairro, cep: unidadesTable.cep, cidade: unidadesTable.cidade, estado: unidadesTable.estado }).from(unidadesTable).where(eq(unidadesTable.id, sessaoAtual.unidadeId!));

      const [sessaoCompleta] = await db.select({ pacienteId: sessoesTable.pacienteId, numeroSemana: sessoesTable.numeroSemana }).from(sessoesTable).where(eq(sessoesTable.id, Number(req.params.id)));
      const [pacInfo] = sessaoCompleta?.pacienteId ? await db.select({ nome: pacientesTable.nome, cpf: pacientesTable.cpf }).from(pacientesTable).where(eq(pacientesTable.id, sessaoCompleta.pacienteId)) : [null];

      const todasAplic = await db
        .select({ aplicacao: aplicacoesSubstanciasTable, substanciaNome: substanciasTable.nome, substanciaVia: substanciasTable.via })
        .from(aplicacoesSubstanciasTable)
        .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
        .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)));

      await updateCalendarEventDescription(
        unidadeInfo?.calId || 'primary',
        sessaoAtual.googleEventId,
        todasAplic.map(a => ({ nome: a.substanciaNome || '', via: a.substanciaVia || '', dose: a.aplicacao.dose || '', status: a.aplicacao.status || 'disp' })),
        sessaoAtual.tipoProcedimento || 'CONSULTA',
        sessaoAtual.duracaoTotalMin || 60,
        { rua: unidadeInfo?.endereco || undefined, bairro: unidadeInfo?.bairro || undefined, cep: unidadeInfo?.cep || undefined, cidade: unidadeInfo?.cidade || undefined, estado: unidadeInfo?.estado || undefined },
        { pacienteNome: pacInfo?.nome || '', pacienteCpf: pacInfo?.cpf || undefined, numeroMarcacao: sessaoCompleta?.numeroSemana || undefined, unidadeNome: unidadeInfo?.nome || undefined }
      );
    } catch (e: any) { console.warn('[Calendar] Auto-update failed for sessao', req.params.id, e?.message); }
  }

  res.json(updated);
});

router.post("/sessoes/:id/adicionar-substancias", async (req, res) => {
  const { substancias } = req.body;
  if (!substancias || !Array.isArray(substancias)) {
    res.status(400).json({ error: "Array de substancias obrigatorio" });
    return;
  }
  const created = [];
  for (const sub of substancias) {
    const parsed = insertAplicacaoSubstanciaSchema.safeParse({
      ...sub,
      sessaoId: Number(req.params.id),
    });
    if (parsed.success) {
      const [item] = await db.insert(aplicacoesSubstanciasTable).values(parsed.data).returning();
      created.push(item);
    }
  }

  await recalcularSessao(Number(req.params.id));

  res.status(201).json(created);
});

router.post("/sessoes/:id/check-in", async (req, res) => {
  const sessaoId = Number(req.params.id);

  const [sessao] = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      unidadeNome: unidadesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(eq(sessoesTable.id, sessaoId));

  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  if (sessao.sessao.status === "cancelada") {
    res.status(400).json({ error: "Sessao cancelada nao pode fazer check-in", valido: false });
    return;
  }
  if (sessao.sessao.status === "concluida") {
    res.status(400).json({ error: "Sessao ja concluida", valido: false });
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

  if (aplicacoes.length === 0) {
    res.status(400).json({ error: "Sessao sem substancias vinculadas", valido: false });
    return;
  }

  const vias = aplicacoes.map(a => a.substanciaVia || "");
  const { descricao, duracaoMin } = calcularTipoProcedimento(vias);
  const horaFim = calcularHoraFim(sessao.sessao.horaAgendada, duracaoMin);

  await db.update(sessoesTable).set({
    status: "em_andamento",
    tipoProcedimento: descricao,
    duracaoTotalMin: duracaoMin,
    horaFim,
  }).where(eq(sessoesTable.id, sessaoId));

  res.json({
    valido: true,
    sessaoId,
    paciente: sessao.pacienteNome,
    unidade: sessao.unidadeNome,
    profissional: sessao.profissionalNome,
    tipoProcedimento: descricao,
    duracaoTotalMin: duracaoMin,
    horaInicio: sessao.sessao.horaAgendada,
    horaFim,
    substancias: aplicacoes.map(a => ({
      nome: a.substanciaNome,
      via: a.substanciaVia,
      dose: a.aplicacao.dose,
      status: a.aplicacao.status,
    })),
    validacaoSemântica: {
      tiposDetectados: [...new Set(vias)].filter(Boolean),
      regrasAplicadas: descricao,
      tempoCalculado: `${duracaoMin} minutos`,
      blocoAgenda: `${sessao.sessao.horaAgendada} - ${horaFim}`,
    },
  });
});

router.get("/sessoes/:id/validar-tempo", async (req, res) => {
  const sessaoId = Number(req.params.id);

  const aplicacoes = await db
    .select({ substanciaVia: substanciasTable.via, substanciaNome: substanciasTable.nome })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

  const [sessao] = await db.select().from(sessoesTable).where(eq(sessoesTable.id, sessaoId));
  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const vias = aplicacoes.map(a => a.substanciaVia || "");
  const { descricao, duracaoMin } = calcularTipoProcedimento(vias);
  const horaFimCalculada = calcularHoraFim(sessao.horaAgendada, duracaoMin);

  const tempoAtualCorreto = sessao.duracaoTotalMin === duracaoMin;

  res.json({
    sessaoId,
    horaInicio: sessao.horaAgendada,
    horaFimAtual: sessao.horaFim,
    horaFimCalculada,
    duracaoAtual: sessao.duracaoTotalMin,
    duracaoCalculada: duracaoMin,
    tipoProcedimentoAtual: sessao.tipoProcedimento,
    tipoProcedimentoCalculado: descricao,
    tempoCorreto: tempoAtualCorreto,
    substancias: aplicacoes.map(a => ({ nome: a.substanciaNome, via: a.substanciaVia })),
    regras: {
      "IM (intramuscular)": "15 minutos fixo",
      "EV/IV (endovenoso)": "30 minutos fixo",
      "IMPLANTE": "60 minutos fixo",
      "COMBINADO": "Soma dos tipos unicos",
    },
  });
});

router.get("/agenda/semanal", async (req, res) => {
  const { dataFrom, dataTo, unidadeId } = req.query;
  if (!dataFrom || !dataTo) {
    res.status(400).json({ error: "dataFrom e dataTo obrigatorios (YYYY-MM-DD)" });
    return;
  }
  const conditions: any[] = [
    gte(sessoesTable.dataAgendada, String(dataFrom)),
    lte(sessoesTable.dataAgendada, String(dataTo)),
  ];
  if (unidadeId) conditions.push(eq(sessoesTable.unidadeId, Number(unidadeId)));

  const sessoes = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      unidadeCor: unidadesTable.cor,
      unidadeEndereco: unidadesTable.endereco,
      unidadeBairro: unidadesTable.bairro,
      unidadeCidade: unidadesTable.cidade,
      unidadeEstado: unidadesTable.estado,
      unidadeCep: unidadesTable.cep,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(and(...conditions))
    .orderBy(sessoesTable.dataAgendada, sessoesTable.horaAgendada);

  const sessoesComAplicacoes = await Promise.all(
    sessoes.map(async (s) => {
      const aplicacoes = await db
        .select({
          aplicacao: aplicacoesSubstanciasTable,
          substanciaNome: substanciasTable.nome,
          substanciaCor: substanciasTable.cor,
          substanciaVia: substanciasTable.via,
          substanciaDuracao: substanciasTable.duracaoMinutos,
        })
        .from(aplicacoesSubstanciasTable)
        .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
        .where(eq(aplicacoesSubstanciasTable.sessaoId, s.sessao.id));

      const vias = aplicacoes.map(a => a.substanciaVia || "");
      const { descricao, duracaoMin } = calcularTipoProcedimento(vias);
      const horaFim = calcularHoraFim(s.sessao.horaAgendada, duracaoMin);

      return {
        ...s,
        aplicacoes,
        tipoProcedimentoCalc: descricao,
        duracaoTotalCalc: duracaoMin,
        horaFimCalc: horaFim,
      };
    })
  );

  const porDia: Record<string, typeof sessoesComAplicacoes> = {};
  for (const s of sessoesComAplicacoes) {
    const dia = s.sessao.dataAgendada;
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(s);
  }

  res.json({ dataFrom, dataTo, dias: porDia });
});

function buildIcsEvent(sessao: any, pacienteNome: string, pacienteCpf: string, unidadeNome: string, substancias: any[]): string {
  const date = (sessao.dataAgendada || "").replace(/-/g, "");
  const time = (sessao.horaAgendada || "09:00").replace(":", "") + "00";
  const durMin = sessao.duracaoTotalMin || 60;
  const [h, m] = (sessao.horaAgendada || "09:00").split(":").map(Number);
  const endTotal = h * 60 + m + durMin;
  const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, "0");
  const endM = String(endTotal % 60).padStart(2, "0");
  const endTime = `${endH}${endM}00`;

  const substList = substancias.map(s => {
    const st = s.status === "aplicada" ? "APLICADA" : s.disponibilidade === "disp" ? "DISP" : "PROX";
    return `${st} - ${s.nome} ${s.dose} (${s.numeroSessao}/${s.totalSessoes})`;
  }).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PADCOM//MotorClinico//PT",
    "BEGIN:VEVENT",
    `UID:padcom-sessao-${sessao.id}@motorclinico`,
    `DTSTART:${date}T${time}`,
    `DTEND:${date}T${endTime}`,
    `SUMMARY:${pacienteNome} - ${pacienteCpf || ""}`,
    `DESCRIPTION:Substancias:\\n${substList}`,
    `LOCATION:${unidadeNome || ""}`,
    `STATUS:${sessao.status === "concluida" ? "COMPLETED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

router.get("/sessoes/:id/ics", async (req, res) => {
  const sessaoId = Number(req.params.id);
  const [sessaoData] = await db
    .select({ sessao: sessoesTable, pacienteNome: pacientesTable.nome, pacienteCpf: pacientesTable.cpf, unidadeNome: unidadesTable.nome })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .where(eq(sessoesTable.id, sessaoId));

  if (!sessaoData) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const aplicacoes = await db
    .select({ substanciaNome: substanciasTable.nome, dose: aplicacoesSubstanciasTable.dose, status: aplicacoesSubstanciasTable.status, disponibilidade: aplicacoesSubstanciasTable.disponibilidade, numeroSessao: aplicacoesSubstanciasTable.numeroSessao, totalSessoes: aplicacoesSubstanciasTable.totalSessoes })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

  const substList = aplicacoes.map(a => ({ nome: a.substanciaNome || "", dose: a.dose, status: a.status, disponibilidade: a.disponibilidade, numeroSessao: a.numeroSessao, totalSessoes: a.totalSessoes }));

  const ics = buildIcsEvent(sessaoData.sessao, sessaoData.pacienteNome || "", sessaoData.pacienteCpf || "", sessaoData.unidadeNome || "", substList);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="sessao-${sessaoId}.ics"`);
  res.send(ics);
});

router.get("/sessoes/ics-semana", async (req, res) => {
  const { dataFrom, dataTo } = req.query;
  if (!dataFrom || !dataTo) { res.status(400).json({ error: "dataFrom e dataTo obrigatorios" }); return; }

  const sessoes = await db
    .select({ sessao: sessoesTable, pacienteNome: pacientesTable.nome, pacienteCpf: pacientesTable.cpf, unidadeNome: unidadesTable.nome })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .where(and(gte(sessoesTable.dataAgendada, String(dataFrom)), lte(sessoesTable.dataAgendada, String(dataTo))))
    .orderBy(sessoesTable.dataAgendada, sessoesTable.horaAgendada);

  let events = "";
  for (const s of sessoes) {
    const aplicacoes = await db
      .select({ substanciaNome: substanciasTable.nome, dose: aplicacoesSubstanciasTable.dose, status: aplicacoesSubstanciasTable.status, disponibilidade: aplicacoesSubstanciasTable.disponibilidade, numeroSessao: aplicacoesSubstanciasTable.numeroSessao, totalSessoes: aplicacoesSubstanciasTable.totalSessoes })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, s.sessao.id));

    const substList = aplicacoes.map(a => ({ nome: a.substanciaNome || "", dose: a.dose, status: a.status, disponibilidade: a.disponibilidade, numeroSessao: a.numeroSessao, totalSessoes: a.totalSessoes }));
    const icsContent = buildIcsEvent(s.sessao, s.pacienteNome || "", s.pacienteCpf || "", s.unidadeNome || "", substList);
    const eventBlock = icsContent.split("BEGIN:VEVENT")[1]?.split("END:VEVENT")[0];
    if (eventBlock) events += "BEGIN:VEVENT" + eventBlock + "END:VEVENT\r\n";
  }

  const fullIcs = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PADCOM//MotorClinico//PT\r\n${events}END:VCALENDAR`;

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="agenda-semana.ics"`);
  res.send(fullIcs);
});

router.get("/sessoes/:id/whatsapp-lembrete", async (req, res) => {
  const sessaoId = Number(req.params.id);
  const enviarApi = req.query.enviar === "true";

  const [sessaoData] = await db
    .select({ sessao: sessoesTable, pacienteNome: pacientesTable.nome, pacienteTelefone: pacientesTable.telefone, unidadeNome: unidadesTable.nome })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .where(eq(sessoesTable.id, sessaoId));

  if (!sessaoData) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const primeiroNome = (sessaoData.pacienteNome || "").split(" ")[0];
  const dataFormatada = (sessaoData.sessao.dataAgendada || "").split("-").reverse().join("/");
  const telefone = (sessaoData.pacienteTelefone || "").replace(/\D/g, "");
  const telefoneInt = telefone.startsWith("55") ? telefone : `55${telefone}`;

  const mensagem = `Bom dia, Sr(a). ${primeiroNome}!\n\nPassando para lembrar da sua sessão.\n\n💉 *${sessaoData.sessao.tipoProcedimento || "Sessão Agendada"}*\n\n🗓 *${dataFormatada}*\n🕐 *${sessaoData.sessao.horaAgendada || "Horário agendado"}*\n\n📍 ${sessaoData.unidadeNome || "Clínica Pádua"}\n\nPor gentileza, confirme sua presença\nrespondendo *SIM*.\n\nEstou à sua disposição para qualquer\ndúvida ou esclarecimento!\n\nMuito obrigada!\n\n*Dayana Ludman*\nAssistente Técnica`;

  const waUrl = `https://wa.me/${telefoneInt}?text=${encodeURIComponent(mensagem)}`;

  if (enviarApi && telefoneInt) {
    try {
      const { enviarWhatsapp } = await import("../services/whatsappService");
      const resultado = await enviarWhatsapp(telefoneInt, mensagem, {
        unidadeId: sessaoData.sessao.unidadeId ?? undefined,
        templateNome: "LEMBRETE_SESSAO",
      });
      res.json({ url: waUrl, mensagem, telefone: telefoneInt, envioApi: resultado });
      return;
    } catch { /* fallback to wa.me link */ }
  }

  res.json({ url: waUrl, mensagem, telefone: telefoneInt });
});

router.get("/sessoes/:id/whatsapp-codigo", async (req, res) => {
  const sessaoId = Number(req.params.id);
  const { codigo, enviar } = req.query;
  if (!codigo) { res.status(400).json({ error: "codigo obrigatorio" }); return; }

  const [sessaoData] = await db
    .select({ sessao: sessoesTable, pacienteNome: pacientesTable.nome, pacienteTelefone: pacientesTable.telefone })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .where(eq(sessoesTable.id, sessaoId));

  if (!sessaoData) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const primeiroNome = (sessaoData.pacienteNome || "").split(" ")[0];
  const dataFormatada = (sessaoData.sessao.dataAgendada || "").split("-").reverse().join("/");
  const telefone = (sessaoData.pacienteTelefone || "").replace(/\D/g, "");
  const telefoneInt = telefone.startsWith("55") ? telefone : `55${telefone}`;

  const mensagem = `Bom dia, Sr(a). ${primeiroNome}!\n\nSegue sua chave de validação\npara a sessão de hoje.\n\n🔑 *${codigo}*\n\n📋 *${sessaoData.sessao.tipoProcedimento || "Sessão"}*\n\n🗓 *${dataFormatada}*\n🕐 *${sessaoData.sessao.horaAgendada || "Horário agendado"}*\n\n📍 ${sessaoData.unidadeNome || "Clínica Pádua"}\n\nApresente esta chave à enfermeira\nno momento da aplicação.\n\nEstou à sua disposição para qualquer\ndúvida ou esclarecimento!\n\nMuito obrigada!\n\n*Dayana Ludman*\nAssistente Técnica`;

  const waUrl = `https://wa.me/${telefoneInt}?text=${encodeURIComponent(mensagem)}`;

  if (enviar === "true" && telefoneInt) {
    try {
      const { enviarWhatsapp } = await import("../services/whatsappService");
      const resultado = await enviarWhatsapp(telefoneInt, mensagem, {
        unidadeId: sessaoData.sessao.unidadeId ?? undefined,
        templateNome: "CODIGO_VALIDACAO",
      });
      res.json({ url: waUrl, mensagem, telefone: telefoneInt, envioApi: resultado });
      return;
    } catch { /* fallback to wa.me link */ }
  }

  res.json({ url: waUrl, mensagem, telefone: telefoneInt });
});

export default router;
