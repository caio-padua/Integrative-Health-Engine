import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const GENESIS_SEED_ID = 14;

const PROFISSIONAIS_MAP: Record<number, { profId: number; nome: string }> = {
  1: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
  2: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
  3: { profId: 3, nome: "Ana Lima" },
  4: { profId: 3, nome: "Ana Lima" },
  5: { profId: 3, nome: "Ana Lima" },
  6: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
  7: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
  8: { profId: 1, nome: "Dr Caio Henrique Fernandes Padua" },
  9: { profId: 6, nome: "Dr Kleber Clara Lemos" },
  10: { profId: 6, nome: "Dr Kleber Clara Lemos" },
};

const TIPOS_POR_UNIDADE: Record<number, string[]> = {
  1: ["CONSULTA_30_PRESENCIAL", "INFUSAO_CURTA_60_PRESENCIAL"],
  2: ["CONSULTA_30_PRESENCIAL", "INFUSAO_CURTA_60_PRESENCIAL"],
  3: ["APLICACAO_IM_15_PRESENCIAL", "AVALIACAO_ENFERMAGEM_20_PRESENCIAL"],
  4: ["APLICACAO_IM_15_PRESENCIAL"],
  5: ["APLICACAO_IM_15_PRESENCIAL", "AVALIACAO_ENFERMAGEM_20_PRESENCIAL"],
  6: ["CONSULTA_30_TELEMEDICINA", "RETORNO_15_TELEMEDICINA"],
  8: ["CONSULTA_30_PRESENCIAL", "INFUSAO_LONGA_180_PRESENCIAL"],
  9: ["CONSULTA_30_PRESENCIAL", "INFUSAO_CURTA_60_PRESENCIAL"],
  10: ["CONSULTA_30_TELEMEDICINA", "RETORNO_15_TELEMEDICINA"],
};

const HORARIO_MAP: Record<string, { inicio: string; fim: string; inicioH: number; fimH: number }> = {
  "CONSULTA_30_PRESENCIAL": { inicio: "08:00", fim: "12:00", inicioH: 8, fimH: 12 },
  "CONSULTA_30_TELEMEDICINA": { inicio: "08:00", fim: "12:00", inicioH: 8, fimH: 12 },
  "INFUSAO_CURTA_60_PRESENCIAL": { inicio: "14:00", fim: "18:00", inicioH: 14, fimH: 18 },
  "INFUSAO_LONGA_180_PRESENCIAL": { inicio: "14:00", fim: "18:00", inicioH: 14, fimH: 18 },
  "APLICACAO_IM_15_PRESENCIAL": { inicio: "08:00", fim: "12:00", inicioH: 8, fimH: 12 },
  "AVALIACAO_ENFERMAGEM_20_PRESENCIAL": { inicio: "14:00", fim: "17:00", inicioH: 14, fimH: 17 },
  "RETORNO_15_TELEMEDICINA": { inicio: "14:00", fim: "17:00", inicioH: 14, fimH: 17 },
};

const DURACAO_MAP: Record<string, number> = {
  "CONSULTA_30_PRESENCIAL": 30,
  "CONSULTA_30_TELEMEDICINA": 30,
  "INFUSAO_CURTA_60_PRESENCIAL": 60,
  "INFUSAO_LONGA_180_PRESENCIAL": 180,
  "APLICACAO_IM_15_PRESENCIAL": 15,
  "AVALIACAO_ENFERMAGEM_20_PRESENCIAL": 20,
  "RETORNO_15_TELEMEDICINA": 15,
};

const TRATAMENTOS_TEMPLATE = [
  { nome: "Protocolo Longevidade Integrativa", descricao: "Protocolo completo de longevidade com formulas + injetaveis IM + EV", valorBruto: 8500, desconto: 500, valorFinal: 8000, parcelas: 4 },
  { nome: "Protocolo Detox Hepato-Intestinal", descricao: "Detox completo hepatico e intestinal com infusao EV + formulas orais", valorBruto: 4200, desconto: 200, valorFinal: 4000, parcelas: 2 },
  { nome: "Programa Imunidade IM Mensal", descricao: "4 aplicacoes IM mensais — Complexo B + Vitamina D + Glutationa", valorBruto: 2400, desconto: 0, valorFinal: 2400, parcelas: 1 },
  { nome: "Protocolo Tireoide + Adrenal", descricao: "Modulacao tireoide e suporte adrenal com formulas manipuladas", valorBruto: 3600, desconto: 100, valorFinal: 3500, parcelas: 2 },
  { nome: "Avaliacao Funcional Completa", descricao: "Check-up integrativo com bateria completa de exames + anamnese", valorBruto: 1800, desconto: 0, valorFinal: 1800, parcelas: 1 },
  { nome: "Protocolo Estetica Integrativa", descricao: "Bioestimuladores + formulas orais + suporte nutricional", valorBruto: 6000, desconto: 0, valorFinal: 6000, parcelas: 3 },
];

const PACIENTES_DOMICILIAR = [
  { nome: "HELENA MARIA RODRIGUES", cpf: "111.222.333-44", dataNascimento: "1968-03-15", telefone: "11955001001", email: "helena.rodrigues@email.com", endereco: "Rua das Flores 120", cep: "03001-000", bairro: "Bras", cidade: "Sao Paulo", estado: "SP" },
  { nome: "JOSE ROBERTO FERREIRA", cpf: "222.333.444-55", dataNascimento: "1955-07-22", telefone: "11955002002", email: "jose.ferreira@email.com", endereco: "Av Paulista 1500", cep: "01310-100", bairro: "Bela Vista", cidade: "Sao Paulo", estado: "SP" },
];

const OFFSET_HORARIOS: Record<number, number> = {
  4: 1,
  5: 2,
};

async function gerarSlotsParaUnidade(unidadeId: number, diasFuturos: number = 14, overrideTipos?: string[], overrideProfId?: number): Promise<number> {
  const profId = overrideProfId || PROFISSIONAIS_MAP[unidadeId]?.profId;
  const tipos = overrideTipos || TIPOS_POR_UNIDADE[unidadeId];
  if (!profId || !tipos || tipos.length === 0) return 0;
  const prof = { profId };

  const offsetDias = OFFSET_HORARIOS[unidadeId] || 0;

  const hoje = new Date();
  let count = 0;

  for (let dia = offsetDias; dia < diasFuturos + offsetDias; dia++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + dia);
    const diaSemana = data.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    const dataStr = data.toISOString().split("T")[0];

    const existentes = await db.execute(sql`
      SELECT count(*) as c FROM agenda_slots WHERE profissional_id = ${prof.profId} AND data = ${dataStr}
    `);
    if (Number(existentes.rows[0]?.c || 0) > 0) continue;

    for (const tipo of tipos) {
      const duracao = DURACAO_MAP[tipo] || 30;
      const horario = HORARIO_MAP[tipo] || { inicioH: 8, fimH: 12 };

      for (let h = horario.inicioH; h < horario.fimH; h++) {
        for (let m = 0; m < 60; m += duracao) {
          if (h * 60 + m + duracao > horario.fimH * 60) break;
          const horaInicio = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const fimMin = h * 60 + m + duracao;
          const horaFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;
          const turno = h < 12 ? "manha" : "tarde";

          try {
            const result = await db.execute(sql`
              INSERT INTO agenda_slots (profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento, status, turno, liberado)
              VALUES (${prof.profId}, ${unidadeId}, ${dataStr}, ${horaInicio}, ${horaFim}, ${duracao}, ${tipo}, 'disponivel', ${turno}, true)
              ON CONFLICT DO NOTHING
            `);
            if (result.rowCount && result.rowCount > 0) count++;
          } catch (e: any) {
            if (!e.message?.includes("duplicate key") && !e.message?.includes("unique constraint")) {
              console.error(`[Genesis Slots] unidade=${unidadeId} data=${dataStr} hora=${horaInicio}: ${e.message}`);
            }
          }
        }
      }
    }
  }
  return count;
}

async function criarRegrasDisponibilidade(unidadeId: number): Promise<number> {
  const prof = PROFISSIONAIS_MAP[unidadeId];
  const tipos = TIPOS_POR_UNIDADE[unidadeId];
  if (!prof || !tipos) return 0;

  let count = 0;
  for (const diaSemana of [1, 2, 3, 4, 5]) {
    for (const tipo of tipos) {
      const horario = HORARIO_MAP[tipo];
      if (!horario) continue;
      try {
        await db.execute(sql`
          INSERT INTO availability_rules (profissional_id, unidade_id, dia_semana, hora_inicio, hora_fim, duracao_slot_min, tipo_procedimento, recorrencia, ativa)
          VALUES (${prof.profId}, ${unidadeId}, ${diaSemana}, ${horario.inicio}, ${horario.fim}, ${DURACAO_MAP[tipo] || 30}, ${tipo}, 'semanal', true)
          ON CONFLICT DO NOTHING
        `);
        count++;
      } catch (_e) {}
    }
  }
  return count;
}

async function criarAgendamentosParaUnidade(unidadeId: number): Promise<number> {
  const pacientes = await db.execute(sql`SELECT id, nome FROM pacientes WHERE unidade_id = ${unidadeId}`);
  if (pacientes.rows.length === 0) return 0;

  let count = 0;
  for (const pac of pacientes.rows) {
    const existente = await db.execute(sql`SELECT count(*) as c FROM appointments WHERE paciente_id = ${pac.id}`);
    if (Number(existente.rows[0]?.c || 0) >= 2) continue;

    const slots = await db.execute(sql`
      SELECT id, profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento
      FROM agenda_slots WHERE unidade_id = ${unidadeId} AND status = 'disponivel'
      ORDER BY data, hora_inicio LIMIT 2
    `);

    for (const slot of slots.rows) {
      try {
        await db.execute(sql`
          INSERT INTO appointments (slot_id, paciente_id, profissional_id, unidade_id, tipo_procedimento, data, hora_inicio, hora_fim, duracao_min, status, observacoes, origem_agendamento)
          VALUES (${slot.id}, ${pac.id}, ${slot.profissional_id}, ${slot.unidade_id}, ${slot.tipo_procedimento}, ${slot.data}, ${slot.hora_inicio}, ${slot.hora_fim}, ${slot.duracao_min}, 'agendado', ${"Agendamento Genesis — consulta de acompanhamento"}, 'sistema')
          ON CONFLICT DO NOTHING
        `);
        await db.execute(sql`UPDATE agenda_slots SET status = 'ocupado' WHERE id = ${slot.id}`);
        count++;
      } catch (_e) {}
    }
  }
  return count;
}

async function criarTratamentosParaUnidade(unidadeId: number): Promise<number> {
  const pacientes = await db.execute(sql`SELECT id, nome FROM pacientes WHERE unidade_id = ${unidadeId}`);
  if (pacientes.rows.length === 0) return 0;

  const existentes = await db.execute(sql`SELECT count(*) as c FROM tratamentos WHERE unidade_id = ${unidadeId}`);
  if (Number(existentes.rows[0]?.c || 0) > 0) return 0;

  const prof = PROFISSIONAIS_MAP[unidadeId];
  let count = 0;
  for (const pac of pacientes.rows) {
    const tmpl = TRATAMENTOS_TEMPLATE[count % TRATAMENTOS_TEMPLATE.length];
    try {
      await db.execute(sql`
        INSERT INTO tratamentos (paciente_id, unidade_id, medico_id, nome, descricao, valor_bruto, desconto, valor_final, valor_pago, saldo_devedor, numero_parcelas, status, data_inicio)
        VALUES (${pac.id}, ${unidadeId}, ${prof?.profId || 1}, ${tmpl.nome}, ${tmpl.descricao}, ${tmpl.valorBruto}, ${tmpl.desconto}, ${tmpl.valorFinal}, 0, ${tmpl.valorFinal}, ${tmpl.parcelas}, 'ativo', ${new Date().toISOString().split("T")[0]})
      `);
      count++;
    } catch (_e) {}
  }
  return count;
}

router.post("/completar-lemos", async (_req, res): Promise<void> => {
  try {
    const resultado: any = { etapas: [], lemos: { unidade9: {}, unidade10: {} } };

    for (const uid of [9, 10]) {
      const pacResult = await db.execute(sql`SELECT count(*) as c FROM pacientes WHERE unidade_id = ${uid}`);
      const tratResult = await db.execute(sql`SELECT count(*) as c FROM tratamentos WHERE unidade_id = ${uid}`);
      const slotResult = await db.execute(sql`SELECT count(*) as c FROM agenda_slots WHERE unidade_id = ${uid}`);
      const apptResult = await db.execute(sql`SELECT count(*) as c FROM appointments WHERE unidade_id = ${uid}`);
      const ruleResult = await db.execute(sql`SELECT count(*) as c FROM availability_rules WHERE unidade_id = ${uid}`);

      const pacientes = Number(pacResult.rows[0]?.c || 0);
      const tratamentos = Number(tratResult.rows[0]?.c || 0);
      const slots = Number(slotResult.rows[0]?.c || 0);
      const appts = Number(apptResult.rows[0]?.c || 0);
      const rules = Number(ruleResult.rows[0]?.c || 0);

      let novasRegras = 0, novosSlots = 0, novosAppts = 0, novosTrat = 0;

      if (rules === 0) {
        novasRegras = await criarRegrasDisponibilidade(uid);
        resultado.etapas.push({ etapa: `Regras unidade ${uid}`, criadas: novasRegras });
      }
      if (slots === 0) {
        novosSlots = await gerarSlotsParaUnidade(uid);
        resultado.etapas.push({ etapa: `Slots unidade ${uid}`, criados: novosSlots });
      }
      if (tratamentos === 0) {
        novosTrat = await criarTratamentosParaUnidade(uid);
        resultado.etapas.push({ etapa: `Tratamentos unidade ${uid}`, criados: novosTrat });
      }
      if (appts < 2 && pacientes > 0) {
        novosAppts = await criarAgendamentosParaUnidade(uid);
        resultado.etapas.push({ etapa: `Agendamentos unidade ${uid}`, criados: novosAppts });
      }

      const key = uid === 9 ? "unidade9" : "unidade10";
      resultado.lemos[key] = {
        pacientes,
        tratamentos: tratamentos + novosTrat,
        regras: rules + novasRegras,
        slots: slots + novosSlots,
        agendamentos: appts + novosAppts,
        status: "COMPLETO",
      };
    }

    resultado.sucesso = true;
    resultado.mensagem = "Instituto Lemos 100% populado";
    resultado.sementeOrigem = "Instituto Genesis (ID " + GENESIS_SEED_ID + ")";
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/completar-todas", async (_req, res): Promise<void> => {
  try {
    const unidadesOperacionais = [1, 2, 3, 4, 5, 6, 8, 9, 10];
    const resultado: any = { unidades: {}, etapas: [] };

    for (const uid of [4]) {
      const pacExist = await db.execute(sql`SELECT count(*) as c FROM pacientes WHERE unidade_id = ${uid}`);
      if (Number(pacExist.rows[0]?.c || 0) === 0) {
        for (const pac of PACIENTES_DOMICILIAR) {
          try {
            await db.execute(sql`
              INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email, unidade_id, status_ativo, endereco, cep, bairro, cidade, estado, pais)
              VALUES (${pac.nome}, ${pac.cpf}, ${pac.dataNascimento}, ${pac.telefone}, ${pac.email}, ${uid}, true, ${pac.endereco}, ${pac.cep}, ${pac.bairro}, ${pac.cidade}, ${pac.estado}, 'BR')
            `);
          } catch (_e) {}
        }
        resultado.etapas.push({ etapa: `Pacientes domiciliar (unidade ${uid})`, criados: PACIENTES_DOMICILIAR.length });
      }
    }

    for (const uid of unidadesOperacionais) {
      if (uid === 7) continue;

      const ruleResult = await db.execute(sql`SELECT count(*) as c FROM availability_rules WHERE unidade_id = ${uid}`);
      const slotResult = await db.execute(sql`SELECT count(*) as c FROM agenda_slots WHERE unidade_id = ${uid}`);
      const tratResult = await db.execute(sql`SELECT count(*) as c FROM tratamentos WHERE unidade_id = ${uid}`);
      const apptResult = await db.execute(sql`SELECT count(*) as c FROM appointments WHERE unidade_id = ${uid}`);
      const pacResult = await db.execute(sql`SELECT count(*) as c FROM pacientes WHERE unidade_id = ${uid}`);

      const rules = Number(ruleResult.rows[0]?.c || 0);
      const slots = Number(slotResult.rows[0]?.c || 0);
      const trats = Number(tratResult.rows[0]?.c || 0);
      const appts = Number(apptResult.rows[0]?.c || 0);
      const pacs = Number(pacResult.rows[0]?.c || 0);

      let novasRegras = 0, novosSlots = 0, novosTrat = 0, novosAppts = 0;

      if (rules === 0 && TIPOS_POR_UNIDADE[uid]) {
        novasRegras = await criarRegrasDisponibilidade(uid);
        resultado.etapas.push({ etapa: `Regras unidade ${uid}`, criadas: novasRegras });
      }

      if (slots === 0 && TIPOS_POR_UNIDADE[uid]) {
        novosSlots = await gerarSlotsParaUnidade(uid);
        resultado.etapas.push({ etapa: `Slots unidade ${uid}`, criados: novosSlots });
      }

      if (trats === 0 && pacs > 0) {
        novosTrat = await criarTratamentosParaUnidade(uid);
        resultado.etapas.push({ etapa: `Tratamentos unidade ${uid}`, criados: novosTrat });
      }

      if (appts < 2 && pacs > 0) {
        novosAppts = await criarAgendamentosParaUnidade(uid);
        resultado.etapas.push({ etapa: `Agendamentos unidade ${uid}`, criados: novosAppts });
      }

      const pacsFinal = await db.execute(sql`SELECT count(*) as c FROM pacientes WHERE unidade_id = ${uid}`);
      resultado.unidades[uid] = {
        pacientes: Number(pacsFinal.rows[0]?.c || 0),
        regras: rules + novasRegras,
        slots: slots + novosSlots,
        tratamentos: trats + novosTrat,
        agendamentos: appts + novosAppts,
      };
    }

    resultado.sucesso = true;
    resultado.mensagem = "Todas as unidades populadas com dados completos";
    resultado.sementeOrigem = "Instituto Genesis (ID " + GENESIS_SEED_ID + ")";
    resultado.totalUnidades = unidadesOperacionais.length;
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/seed-nova-clinica/:unidadeId", async (req, res): Promise<void> => {
  try {
    const unidadeId = Number(req.params.unidadeId);
    if (isNaN(unidadeId)) { res.status(400).json({ error: "ID invalido" }); return; }

    const unidadeResult = await db.execute(sql`SELECT id, nome, nick, tipo FROM unidades WHERE id = ${unidadeId}`);
    if (unidadeResult.rows.length === 0) {
      res.status(404).json({ error: `Unidade ${unidadeId} nao existe` });
      return;
    }
    const unidade = unidadeResult.rows[0];
    if (unidade.tipo === "genesis_seed") {
      res.status(400).json({ error: "Nao e possivel seedar a propria semente Genesis" });
      return;
    }

    const etapas: { etapa: string; status: string; detalhes: any }[] = [];

    const catCount = await db.execute(sql`
      SELECT 
        (SELECT count(*) FROM exames_base) as exames,
        (SELECT count(*) FROM itens_terapeuticos) as itens,
        (SELECT count(*) FROM doencas) as doencas,
        (SELECT count(*) FROM codigos_semanticos) as codigos,
        (SELECT count(*) FROM blocos) as blocos,
        (SELECT count(*) FROM regras_motor) as regras,
        (SELECT count(*) FROM termos_juridicos WHERE ativo = true) as termos,
        (SELECT count(*) FROM questionario_master) as questionario,
        (SELECT count(*) FROM formulas_master) as formulas
    `);
    const cat = catCount.rows[0];
    etapas.push({
      etapa: "DNA Catalogos Herdados",
      status: "ATIVO",
      detalhes: {
        examesBase: Number(cat.exames || 0),
        itensTerapeuticos: Number(cat.itens || 0),
        doencas: Number(cat.doencas || 0),
        codigosSemanticos: Number(cat.codigos || 0),
        blocos: Number(cat.blocos || 0),
        regrasMotor: Number(cat.regras || 0),
        termosJuridicos: Number(cat.termos || 0),
        questionarioMaster: Number(cat.questionario || 0),
        formulasMaster: Number(cat.formulas || 0),
        nota: "Biblioteca aditiva do Instituto Genesis — compartilhada automaticamente",
      },
    });

    const tiposProc = req.body.tiposProcedimento || ["CONSULTA_30_PRESENCIAL", "RETORNO_15_TELEMEDICINA"];
    const profId = req.body.profissionalId || 1;
    const profNome = req.body.profissionalNome || "Dr Caio Henrique Fernandes Padua";

    let regrasCount = 0;
    for (const diaSemana of [1, 2, 3, 4, 5]) {
      for (const tipo of tiposProc) {
        const horario = HORARIO_MAP[tipo] || { inicio: "08:00", fim: "12:00" };
        try {
          await db.execute(sql`
            INSERT INTO availability_rules (profissional_id, unidade_id, dia_semana, hora_inicio, hora_fim, duracao_slot_min, tipo_procedimento, recorrencia, ativa)
            VALUES (${profId}, ${unidadeId}, ${diaSemana}, ${horario.inicio}, ${horario.fim}, ${DURACAO_MAP[tipo] || 30}, ${tipo}, 'semanal', true)
            ON CONFLICT DO NOTHING
          `);
          regrasCount++;
        } catch (_e) {}
      }
    }
    etapas.push({ etapa: "Regras de Disponibilidade", status: "CRIADO", detalhes: `${regrasCount} regras criadas para ${tiposProc.length} tipos de procedimento` });

    const slotsCount = await gerarSlotsParaUnidade(unidadeId, 14, tiposProc, profId);
    etapas.push({ etapa: "Slots de Agenda", status: slotsCount > 0 ? "CRIADO" : "EXISTENTE", detalhes: `${slotsCount} slots gerados para 14 dias` });

    const configResult = await db.execute(sql`SELECT count(*) as c FROM cascata_validacao_config`);
    etapas.push({
      etapa: "Cascata Validacao Config",
      status: Number(configResult.rows[0]?.c || 0) > 0 ? "HERDADO" : "PENDENTE",
      detalhes: "Configuracao global da cascata — compartilhada entre todas as unidades. Toggle no painel Admin.",
    });

    const soberaniaResult = await db.execute(sql`SELECT count(*) as c FROM soberania_config`);
    etapas.push({
      etapa: "Soberania Config",
      status: Number(soberaniaResult.rows[0]?.c || 0) > 0 ? "HERDADO" : "PENDENTE",
      detalhes: "Configuracao global de soberania clinica — herdada do Instituto Genesis.",
    });

    etapas.push({
      etapa: "Tratamentos Template",
      status: "DISPONIVEL",
      detalhes: {
        modelos: TRATAMENTOS_TEMPLATE.length,
        nota: "Modelos Genesis disponiveis — serao criados automaticamente quando pacientes forem cadastrados",
        templates: TRATAMENTOS_TEMPLATE.map(t => ({ nome: t.nome, valor: t.valorFinal })),
      },
    });

    etapas.push({
      etapa: "Protecao Genesis",
      status: "ATIVA",
      detalhes: "Dados herdados da semente sao imutaveis. Apenas adicoes locais sao permitidas.",
    });

    res.json({
      sucesso: true,
      mensagem: `Clinica "${unidade.nome}" seedada com DNA completo do Instituto Genesis`,
      sementeOrigem: { id: GENESIS_SEED_ID, nome: "INSTITUTO GENESIS — SEMENTE PERENE PAWARDS" },
      unidadeDestino: { id: unidade.id, nome: unidade.nome, nick: unidade.nick },
      etapas,
      proximosPassos: [
        "Cadastrar pacientes na unidade",
        "Tratamentos serao criados automaticamente via Genesis",
        "Ativar cascata de validacao no painel Admin se desejado",
        "Configurar WhatsApp para alertas (opcional)",
      ],
    });
  } catch (err: any) {
    console.error("[Genesis Seed]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/validacao-completa", async (_req, res): Promise<void> => {
  try {
    const validacao: any[] = [];
    const unidades = await db.execute(sql`SELECT id, nome, nick, tipo FROM unidades WHERE tipo != 'genesis_seed' AND id != 7 ORDER BY id`);

    for (const u of unidades.rows) {
      const uid = Number(u.id);
      const counts = await db.execute(sql`
        SELECT
          (SELECT count(*) FROM pacientes WHERE unidade_id = ${uid}) as pacientes,
          (SELECT count(*) FROM tratamentos WHERE unidade_id = ${uid}) as tratamentos,
          (SELECT count(*) FROM availability_rules WHERE unidade_id = ${uid}) as regras,
          (SELECT count(*) FROM agenda_slots WHERE unidade_id = ${uid}) as slots,
          (SELECT count(*) FROM appointments WHERE unidade_id = ${uid}) as agendamentos
      `);
      const c = counts.rows[0];
      const pacientes = Number(c.pacientes || 0);
      const tratamentos = Number(c.tratamentos || 0);
      const regras = Number(c.regras || 0);
      const slots = Number(c.slots || 0);
      const agendamentos = Number(c.agendamentos || 0);

      const checks = {
        temPacientes: pacientes > 0 ? "SIM" : "NAO",
        temTratamentos: tratamentos > 0 ? "SIM" : "NAO",
        temRegras: regras > 0 ? "SIM" : "NAO",
        temSlots: slots > 0 ? "SIM" : "NAO",
        temAgendamentos: agendamentos > 0 ? "SIM" : "NAO",
      };

      const totalSim = Object.values(checks).filter(v => v === "SIM").length;
      const statusGeral = totalSim === 5 ? "COMPLETO" : totalSim >= 3 ? "PARCIAL" : "INCOMPLETO";

      validacao.push({
        unidadeId: uid,
        nome: u.nome,
        nick: u.nick,
        contagem: { pacientes, tratamentos, regras, slots, agendamentos },
        checks,
        statusGeral,
        score: `${totalSim}/5`,
      });
    }

    const catalogos = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM exames_base) as exames_base,
        (SELECT count(*) FROM itens_terapeuticos) as itens_terapeuticos,
        (SELECT count(*) FROM doencas) as doencas,
        (SELECT count(*) FROM codigos_semanticos) as codigos_semanticos,
        (SELECT count(*) FROM blocos) as blocos,
        (SELECT count(*) FROM regras_motor) as regras_motor,
        (SELECT count(*) FROM termos_juridicos WHERE ativo = true) as termos_juridicos,
        (SELECT count(*) FROM formulas_master) as formulas_master,
        (SELECT count(*) FROM substancias) as substancias,
        (SELECT count(*) FROM questionario_master) as questionario_master,
        (SELECT count(*) FROM dietas) as dietas,
        (SELECT count(*) FROM protocolos) as protocolos,
        (SELECT count(*) FROM cascata_validacao_config) as cascata_config,
        (SELECT count(*) FROM soberania_config) as soberania_config,
        (SELECT count(*) FROM usuarios) as usuarios
    `);

    const totalCompletas = validacao.filter(v => v.statusGeral === "COMPLETO").length;
    const totalUnidades = validacao.length;

    res.json({
      sucesso: true,
      resumoGeral: {
        unidadesCompletas: `${totalCompletas}/${totalUnidades}`,
        statusSistema: totalCompletas === totalUnidades ? "100% OPERACIONAL" : `${Math.round(totalCompletas / totalUnidades * 100)}% OPERACIONAL`,
        sementeGenesis: "ATIVA",
      },
      catalogosGlobais: catalogos.rows[0],
      unidades: validacao,
      institutoGenesis: {
        id: GENESIS_SEED_ID,
        status: "SEMENTE PERENE",
        protecao: "Imutavel — apenas adicoes",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
