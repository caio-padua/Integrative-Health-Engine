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
  const { status, dataAgendada, horaAgendada, notas, profissionalId } = req.body;
  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (dataAgendada !== undefined) updates.dataAgendada = dataAgendada;
  if (horaAgendada !== undefined) updates.horaAgendada = horaAgendada;
  if (notas !== undefined) updates.notas = notas;
  if (profissionalId !== undefined) updates.profissionalId = profissionalId;

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

export default router;
