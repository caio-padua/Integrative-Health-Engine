import { Router } from "express";
import { db } from "@workspace/db";
import {
  tratamentosTable, pacientesTable, termosJuridicosTable, termosAssinadosTable,
  unidadesTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const GENESIS_SEED_ID = 14;
const GENESIS_TIPO = "genesis_seed";

const TRATAMENTOS_GENESIS = [
  { nome: "Protocolo Longevidade Integrativa", descricao: "Protocolo completo de longevidade com formulas + injetaveis IM + EV", valorBruto: 8500, desconto: 500, valorFinal: 8000, numeroParcelas: 4, status: "ativo" as const },
  { nome: "Protocolo Detox Hepato-Intestinal", descricao: "Detox completo hepatico e intestinal com infusao EV + formulas orais", valorBruto: 4200, desconto: 200, valorFinal: 4000, numeroParcelas: 2, status: "ativo" as const },
  { nome: "Programa Imunidade IM Mensal", descricao: "4 aplicacoes IM mensais — Complexo B + Vitamina D + Glutationa", valorBruto: 2400, desconto: 0, valorFinal: 2400, numeroParcelas: 1, status: "ativo" as const },
  { nome: "Protocolo Tireoide + Adrenal", descricao: "Modulacao tireoide e suporte adrenal com formulas manipuladas", valorBruto: 3600, desconto: 100, valorFinal: 3500, numeroParcelas: 2, status: "ativo" as const },
  { nome: "Avaliacao Funcional Completa", descricao: "Check-up integrativo com bateria completa de exames + anamnese", valorBruto: 1800, desconto: 0, valorFinal: 1800, numeroParcelas: 1, status: "ativo" as const },
  { nome: "Protocolo Estetica Integrativa", descricao: "Bioestimuladores + formulas orais + suporte nutricional", valorBruto: 6000, desconto: 0, valorFinal: 6000, numeroParcelas: 3, status: "ativo" as const },
];

const DNA_CATALOGOS = {
  examesBase: 246, formulas: 54, injetaveisIM: 305, endovenosos: 63,
  implantes: 32, doencas: 49, protocolosMaster: 11, dietas: 48,
  psicologia: 5, questionario: 19, mapaAnamnese: 19, motorDecisao: 19,
  regrasInjetaveis: 26, regrasEndovenosos: 13, regrasImplantes: 25,
  regrasTriagem: 8, recorrencia: 3, matrizRastreio: 231,
};

const DNA_RASX = {
  blocos: 5, subgrupos: 20, eventos: 7, classes: 6, consentimentos: 6,
};

router.get("/info", async (_req, res): Promise<void> => {
  try {
    const [genesis] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, GENESIS_SEED_ID));
    if (!genesis) {
      res.status(404).json({ error: "Instituto Genesis nao encontrado no banco" });
      return;
    }
    const termos = await db.select().from(termosJuridicosTable).where(eq(termosJuridicosTable.ativo, true));
    res.json({
      institutoGenesis: {
        id: genesis.id,
        nome: genesis.nome,
        nick: genesis.nick,
        tipo: genesis.tipo,
        cor: genesis.cor,
        protecao: "Semente perene — nao pode ser excluida, apenas receber adicoes",
      },
      dna: {
        catalogos: DNA_CATALOGOS,
        totalItens: Object.values(DNA_CATALOGOS).reduce((a, b) => a + b, 0),
        motorRASX: DNA_RASX,
        termosJuridicos: termos.length,
        tratamentosTemplate: TRATAMENTOS_GENESIS.length,
      },
      regra: "Catalogos aditivos — novas entradas propagam automaticamente para todas as clinicas. Remocoes sao manuais por clinica. Dados operacionais (pacientes, tratamentos, agenda) sao unicos por unidade.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/colonizar/:unidadeId", async (req, res): Promise<void> => {
  try {
    const unidadeId = Number(req.params.unidadeId);
    if (isNaN(unidadeId)) { res.status(400).json({ error: "ID invalido" }); return; }

    const [genesis] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, GENESIS_SEED_ID));
    if (!genesis) { res.status(500).json({ error: "Instituto Genesis nao encontrado" }); return; }

    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, unidadeId));
    if (!unidade) { res.status(404).json({ error: `Unidade ${unidadeId} nao existe` }); return; }
    if (unidade.tipo === GENESIS_TIPO) {
      res.status(400).json({ error: "Nao e possivel colonizar a propria semente Genesis" });
      return;
    }

    const etapas: { etapa: string; status: string; detalhes: any }[] = [];

    const termosExistentes = await db.select().from(termosJuridicosTable)
      .where(eq(termosJuridicosTable.ativo, true));
    etapas.push({
      etapa: "Termos Juridicos",
      status: "HERDADO",
      detalhes: `${termosExistentes.length} termos ativos compartilhados — herdados da semente Genesis`,
    });

    etapas.push({
      etapa: "Catalogos Compartilhados",
      status: "HERDADO",
      detalhes: {
        ...DNA_CATALOGOS,
        totalItens: Object.values(DNA_CATALOGOS).reduce((a, b) => a + b, 0),
        nota: "Biblioteca aditiva herdada do Instituto Genesis — remocoes manuais por clinica",
      },
    });

    etapas.push({
      etapa: "Motor RASX-MATRIZ V6",
      status: "HERDADO",
      detalhes: {
        ...DNA_RASX,
        nota: "Motor semantico completo herdado da semente Genesis",
      },
    });

    etapas.push({
      etapa: "Tratamentos Template",
      status: "DISPONIVEL",
      detalhes: `${TRATAMENTOS_GENESIS.length} modelos de tratamento disponiveis para novos pacientes`,
    });

    const pacientesDaUnidade = await db.select().from(pacientesTable)
      .where(eq(pacientesTable.unidadeId, unidadeId));
    const tratamentosDaUnidade = await db.select().from(tratamentosTable)
      .where(eq(tratamentosTable.unidadeId, unidadeId));

    etapas.push({
      etapa: "Dados Operacionais",
      status: pacientesDaUnidade.length > 0 ? "ATIVO" : "VAZIO",
      detalhes: {
        pacientes: pacientesDaUnidade.length,
        tratamentos: tratamentosDaUnidade.length,
        nota: pacientesDaUnidade.length > 0
          ? "Unidade ja possui dados operacionais proprios"
          : "Unidade pronta para receber pacientes — DNA Genesis ativo",
      },
    });

    etapas.push({
      etapa: "Protecao Genesis",
      status: "ATIVA",
      detalhes: "Dados herdados da semente sao imutaveis. Apenas adicoes locais sao permitidas. Remocoes de catalogo sao por clinica, nunca na semente.",
    });

    res.json({
      sucesso: true,
      mensagem: `Clinica "${unidade.nome}" colonizada com DNA do Instituto Genesis`,
      sementeOrigem: { id: genesis.id, nome: genesis.nome, nick: genesis.nick },
      unidadeDestino: { id: unidade.id, nome: unidade.nome, nick: unidade.nick },
      etapas,
    });
  } catch (err: any) {
    console.error("[Genesis Colonizar]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/popular-lemos", async (_req, res): Promise<void> => {
  try {
    const pacientesLemos = await db.select().from(pacientesTable)
      .where(sql`${pacientesTable.unidadeId} IN (9, 10)`);

    if (pacientesLemos.length === 0) {
      res.json({ erro: "Nenhum paciente encontrado no Instituto Lemos" });
      return;
    }

    const tratamentosExistentes = await db.select().from(tratamentosTable)
      .where(sql`${tratamentosTable.unidadeId} IN (9, 10)`);

    if (tratamentosExistentes.length > 0) {
      res.json({ mensagem: "Lemos ja possui tratamentos", total: tratamentosExistentes.length });
      return;
    }

    const novosTratamentos = [];
    for (const pac of pacientesLemos) {
      const template = TRATAMENTOS_GENESIS[Math.floor(Math.random() * TRATAMENTOS_GENESIS.length)];
      const [trat] = await db.insert(tratamentosTable).values({
        pacienteId: pac.id,
        unidadeId: pac.unidadeId!,
        medicoId: 6,
        nome: template.nome,
        descricao: template.descricao,
        valorBruto: template.valorBruto.toString(),
        desconto: template.desconto.toString(),
        valorFinal: template.valorFinal.toString(),
        valorPago: "0",
        saldoDevedor: template.valorFinal.toString(),
        numeroParcelas: template.numeroParcelas,
        status: template.status,
        dataInicio: new Date().toISOString().split("T")[0],
      }).returning();
      novosTratamentos.push({ id: trat.id, paciente: pac.nome, unidade: pac.unidadeId, tratamento: template.nome });
    }

    res.json({
      sucesso: true,
      mensagem: `${novosTratamentos.length} tratamentos criados para Instituto Lemos`,
      sementeOrigem: "Instituto Genesis (ID " + GENESIS_SEED_ID + ")",
      tratamentos: novosTratamentos,
    });
  } catch (err: any) {
    console.error("[Genesis Lemos]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/popular-agendas", async (_req, res): Promise<void> => {
  try {
    const unidadesAlvo = [2, 3, 4, 5, 6, 8, 9, 10];

    const profissionaisMap: Record<number, { profId: number; nome: string }> = {
      2: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
      3: { profId: 3, nome: "Ana Lima" },
      4: { profId: 3, nome: "Ana Lima" },
      5: { profId: 3, nome: "Ana Lima" },
      6: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
      8: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
      9: { profId: 6, nome: "Dr Kleber Clara Lemos" },
      10: { profId: 6, nome: "Dr Kleber Clara Lemos" },
    };

    const tiposPorUnidade: Record<number, string[]> = {
      2: ["CONSULTA_30_PRESENCIAL", "INFUSAO_CURTA_60_PRESENCIAL"],
      3: ["APLICACAO_IM_15_PRESENCIAL", "AVALIACAO_ENFERMAGEM_20_PRESENCIAL"],
      4: ["APLICACAO_IM_15_PRESENCIAL"],
      5: ["APLICACAO_IM_15_PRESENCIAL", "AVALIACAO_ENFERMAGEM_20_PRESENCIAL"],
      6: ["CONSULTA_30_TELEMEDICINA", "RETORNO_15_TELEMEDICINA"],
      8: ["CONSULTA_30_PRESENCIAL", "INFUSAO_LONGA_180_PRESENCIAL"],
      9: ["CONSULTA_30_PRESENCIAL", "INFUSAO_CURTA_60_PRESENCIAL"],
      10: ["CONSULTA_30_TELEMEDICINA", "RETORNO_15_TELEMEDICINA"],
    };

    const diasSemana = [1, 2, 3, 4, 5];
    const resultados: any[] = [];

    for (const unidadeId of unidadesAlvo) {
      const prof = profissionaisMap[unidadeId];
      const tipos = tiposPorUnidade[unidadeId];

      for (const diaSemana of diasSemana) {
        for (const tipo of tipos) {
          const horarioMap: Record<string, { inicio: string; fim: string }> = {
            "CONSULTA_30_PRESENCIAL": { inicio: "08:00", fim: "12:00" },
            "CONSULTA_30_TELEMEDICINA": { inicio: "08:00", fim: "12:00" },
            "INFUSAO_CURTA_60_PRESENCIAL": { inicio: "14:00", fim: "18:00" },
            "INFUSAO_LONGA_180_PRESENCIAL": { inicio: "14:00", fim: "18:00" },
            "APLICACAO_IM_15_PRESENCIAL": { inicio: "08:00", fim: "12:00" },
            "AVALIACAO_ENFERMAGEM_20_PRESENCIAL": { inicio: "14:00", fim: "17:00" },
            "RETORNO_15_TELEMEDICINA": { inicio: "14:00", fim: "17:00" },
          };
          const h = horarioMap[tipo] || { inicio: "08:00", fim: "12:00" };

          try {
            await db.execute(sql`
              INSERT INTO availability_rules (profissional_id, unidade_id, dia_semana, hora_inicio, hora_fim, duracao_slot_min, tipo_procedimento, recorrencia, ativa)
              VALUES (${prof.profId}, ${unidadeId}, ${diaSemana}, ${h.inicio}, ${h.fim}, 30, ${tipo}, 'semanal', true)
              ON CONFLICT DO NOTHING
            `);
          } catch (e: any) {}
        }
      }
      resultados.push({ unidade: unidadeId, profissional: prof.nome, tipos });
    }

    const hoje = new Date();
    const slotsGerados: any[] = [];
    for (let dia = 0; dia < 14; dia++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() + dia);
      const diaSemana = data.getDay();
      if (diaSemana === 0 || diaSemana === 6) continue;

      for (const unidadeId of unidadesAlvo) {
        const prof = profissionaisMap[unidadeId];
        const tipos = tiposPorUnidade[unidadeId];
        const dataStr = data.toISOString().split("T")[0];

        for (const tipo of tipos) {
          const duracaoMap: Record<string, number> = {
            "CONSULTA_30_PRESENCIAL": 30, "CONSULTA_30_TELEMEDICINA": 30,
            "INFUSAO_CURTA_60_PRESENCIAL": 60, "INFUSAO_LONGA_180_PRESENCIAL": 180,
            "APLICACAO_IM_15_PRESENCIAL": 15, "AVALIACAO_ENFERMAGEM_20_PRESENCIAL": 20,
            "RETORNO_15_TELEMEDICINA": 15,
          };
          const horarioMap: Record<string, { inicio: number; fim: number }> = {
            "CONSULTA_30_PRESENCIAL": { inicio: 8, fim: 12 },
            "CONSULTA_30_TELEMEDICINA": { inicio: 8, fim: 12 },
            "INFUSAO_CURTA_60_PRESENCIAL": { inicio: 14, fim: 18 },
            "INFUSAO_LONGA_180_PRESENCIAL": { inicio: 14, fim: 18 },
            "APLICACAO_IM_15_PRESENCIAL": { inicio: 8, fim: 12 },
            "AVALIACAO_ENFERMAGEM_20_PRESENCIAL": { inicio: 14, fim: 17 },
            "RETORNO_15_TELEMEDICINA": { inicio: 14, fim: 17 },
          };
          const duracao = duracaoMap[tipo] || 30;
          const horario = horarioMap[tipo] || { inicio: 8, fim: 12 };

          for (let h = horario.inicio; h < horario.fim; h++) {
            for (let m = 0; m < 60; m += duracao) {
              if (h * 60 + m + duracao > horario.fim * 60) break;
              const horaInicio = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
              const fimMin = h * 60 + m + duracao;
              const horaFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

              try {
                await db.execute(sql`
                  INSERT INTO agenda_slots (profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento, status, turno, liberado)
                  VALUES (${prof.profId}, ${unidadeId}, ${dataStr}, ${horaInicio}, ${horaFim}, ${duracao}, ${tipo}, 'disponivel', ${h < 12 ? 'manha' : 'tarde'}, true)
                  ON CONFLICT DO NOTHING
                `);
                slotsGerados.push({ unidade: unidadeId, data: dataStr, hora: horaInicio });
              } catch (e: any) {}
            }
          }
        }
      }
    }

    const pacientesComAgenda = await db.select().from(pacientesTable)
      .where(sql`${pacientesTable.unidadeId} IN (2,3,4,5,6,8,9,10)`);

    let agendamentosCount = 0;
    for (const pac of pacientesComAgenda) {
      const slotsDisp = await db.execute(sql`
        SELECT id, profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento
        FROM agenda_slots
        WHERE unidade_id = ${pac.unidadeId} AND status = 'disponivel'
        ORDER BY data, hora_inicio
        LIMIT 2
      `);

      for (const slot of slotsDisp.rows) {
        try {
          await db.execute(sql`
            INSERT INTO appointments (slot_id, paciente_id, profissional_id, unidade_id, tipo_procedimento, data, hora_inicio, hora_fim, duracao_min, status, observacoes)
            VALUES (${slot.id}, ${pac.id}, ${slot.profissional_id}, ${slot.unidade_id}, ${slot.tipo_procedimento}, ${slot.data}, ${slot.hora_inicio}, ${slot.hora_fim}, ${slot.duracao_min}, 'agendado', ${"Agendamento Genesis — consulta de acompanhamento"})
            ON CONFLICT DO NOTHING
          `);
          await db.execute(sql`UPDATE agenda_slots SET status = 'ocupado' WHERE id = ${slot.id}`);
          agendamentosCount++;
        } catch (e: any) {}
      }
    }

    res.json({
      sucesso: true,
      sementeOrigem: "Instituto Genesis (ID " + GENESIS_SEED_ID + ")",
      regrasDisponibilidade: resultados,
      slotsGerados: slotsGerados.length,
      agendamentosCriados: agendamentosCount,
      unidadesPopuladas: unidadesAlvo,
    });
  } catch (err: any) {
    console.error("[Genesis Agendas]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/assinar-termos-todos", async (_req, res): Promise<void> => {
  try {
    const termos = await db.select().from(termosJuridicosTable)
      .where(eq(termosJuridicosTable.ativo, true));
    const pacientes = await db.select().from(pacientesTable);

    const assinaturasExistentes = await db.select().from(termosAssinadosTable);
    const chaveExistente = new Set(assinaturasExistentes.map(a => `${a.pacienteId}-${a.termoId}`));

    let count = 0;
    for (const pac of pacientes) {
      const termosBase = termos.filter(t => t.subgrupo === "JURI.BASE" || t.subgrupo === "JURI.DIGI" || t.subgrupo === "JURI.IMAG");
      for (const termo of termosBase) {
        const chave = `${pac.id}-${termo.id}`;
        if (chaveExistente.has(chave)) continue;
        await db.insert(termosAssinadosTable).values({
          pacienteId: pac.id,
          termoId: termo.id,
          versaoAssinada: termo.versao,
          tituloTermo: termo.titulo,
          textoNoMomentoAssinatura: termo.textoCompleto,
          meioAssinatura: "aceite_digital",
          profissionalResponsavel: "Dr. Caio Henrique Fernandes Padua",
        });
        count++;
      }
    }

    res.json({
      sucesso: true,
      mensagem: `${count} assinaturas de termos criadas para ${pacientes.length} pacientes`,
      sementeOrigem: "Instituto Genesis (ID " + GENESIS_SEED_ID + ")",
      termosBase: termos.filter(t => t.subgrupo === "JURI.BASE" || t.subgrupo === "JURI.DIGI" || t.subgrupo === "JURI.IMAG").length,
      totalPacientes: pacientes.length,
    });
  } catch (err: any) {
    console.error("[Genesis Termos]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", async (_req, res): Promise<void> => {
  try {
    const [genesis] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, GENESIS_SEED_ID));
    const pacientes = await db.select().from(pacientesTable);
    const tratamentos = await db.select().from(tratamentosTable);
    const termos = await db.select().from(termosJuridicosTable).where(eq(termosJuridicosTable.ativo, true));
    const assinaturas = await db.select().from(termosAssinadosTable);

    const slotsResult = await db.execute(sql`SELECT unidade_id, COUNT(*) as total FROM agenda_slots GROUP BY unidade_id ORDER BY unidade_id`);
    const apptResult = await db.execute(sql`SELECT unidade_id, COUNT(*) as total FROM appointments GROUP BY unidade_id ORDER BY unidade_id`);
    const rulesResult = await db.execute(sql`SELECT unidade_id, COUNT(*) as total FROM availability_rules GROUP BY unidade_id ORDER BY unidade_id`);

    const pacByUnit: Record<number, number> = {};
    pacientes.forEach(p => { const u = p.unidadeId || 0; pacByUnit[u] = (pacByUnit[u] || 0) + 1; });
    const tratByUnit: Record<number, number> = {};
    tratamentos.forEach(t => { const u = t.unidadeId || 0; tratByUnit[u] = (tratByUnit[u] || 0) + 1; });

    res.json({
      institutoGenesis: genesis ? {
        id: genesis.id,
        nome: genesis.nome,
        nick: genesis.nick,
        tipo: genesis.tipo,
        protecao: "Semente perene — imutavel, apenas adicoes",
      } : null,
      dna: {
        catalogos: DNA_CATALOGOS,
        totalItensCatalogo: Object.values(DNA_CATALOGOS).reduce((a, b) => a + b, 0),
        motorRASX: DNA_RASX,
      },
      pacientes: { total: pacientes.length, porUnidade: pacByUnit },
      tratamentos: { total: tratamentos.length, porUnidade: tratByUnit },
      termos: { total: termos.length, assinaturas: assinaturas.length },
      agenda: {
        regrasDisponibilidade: rulesResult.rows,
        slotsPorUnidade: slotsResult.rows,
        agendamentosPorUnidade: apptResult.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
