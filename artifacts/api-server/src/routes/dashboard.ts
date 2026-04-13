import { Router } from "express";
import { db, pacientesTable, anamnesesTable, sugestoesTable, followupsTable, pagamentosTable, filasTable, sessoesTable, registroSubstanciaUsoTable, alertaPacienteTable, trackingSintomasTable, monitoramentoSinaisVitaisTable, unidadesTable, delegacoesTable, demandasServicoTable, CUSTO_POR_COMPLEXIDADE, REMUNERACAO_CONSULTOR, PLANOS_ACOMPANHAMENTO, consultorUnidadesTable, faturamentoMensalTable, contratoClinicaTable, usuariosTable } from "@workspace/db";
import { eq, and, gte, lt, sum, count, desc, sql, ne, inArray } from "drizzle-orm";

const router = Router();

router.get("/dashboard/resumo", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [totalPacientesResult] = await db.select({ count: count() }).from(pacientesTable);
  const [anamnesesPendentesResult] = await db.select({ count: count() }).from(anamnesesTable).where(eq(anamnesesTable.status, "pendente"));
  const [sugestoesPendentesResult] = await db.select({ count: count() }).from(sugestoesTable).where(eq(sugestoesTable.status, "pendente"));
  const [followupAtrasadosResult] = await db.select({ count: count() }).from(followupsTable).where(eq(followupsTable.status, "atrasado"));
  const [pagamentosPendentesResult] = await db.select({ count: count() }).from(pagamentosTable).where(eq(pagamentosTable.status, "pendente"));

  const pagamentosHoje = await db
    .select({ valor: pagamentosTable.valor })
    .from(pagamentosTable)
    .where(and(eq(pagamentosTable.status, "pago"), gte(pagamentosTable.paguEm, hoje), lt(pagamentosTable.paguEm, amanha)));

  const receitaHoje = pagamentosHoje.reduce((acc, p) => acc + (p.valor || 0), 0);

  const filaHoje = await db
    .select({ count: count() })
    .from(filasTable)
    .where(and(eq(filasTable.tipo, "procedimento"), gte(filasTable.criadoEm, hoje)));

  res.json({
    totalPacientes: totalPacientesResult.count,
    anamnesesPendentes: anamnesesPendentesResult.count,
    sugestoesPendentesValidacao: sugestoesPendentesResult.count,
    procedimentosHoje: filaHoje[0]?.count || 0,
    followupAtrasados: followupAtrasadosResult.count,
    pagamentosPendentes: pagamentosPendentesResult.count,
    receitaHoje,
    unidadeNome: unidadeId ? `Unidade ${unidadeId}` : "Todas as Unidades",
  });
});

router.get("/dashboard/metricas-motor", async (req, res): Promise<void> => {
  const periodo = (req.query.periodo as string) || "hoje";

  const todas = await db.select().from(sugestoesTable);
  const total = todas.length;
  const validadas = todas.filter(s => s.status === "validado").length;
  const rejeitadas = todas.filter(s => s.status === "rejeitado").length;
  const taxaValidacao = total > 0 ? Math.round((validadas / total) * 100) : 0;

  const tipos = ["exame", "formula", "injetavel_im", "injetavel_ev", "implante", "protocolo"];
  const sugestoesPorTipo = tipos.map(tipo => ({
    tipo,
    total: todas.filter(s => s.tipo === tipo).length,
    validadas: todas.filter(s => s.tipo === tipo && s.status === "validado").length,
  }));

  res.json({
    totalSugestoes: total,
    sugestoesValidadas: validadas,
    sugestoesRejeitadas: rejeitadas,
    taxaValidacao,
    sugestoesPorTipo,
    periodo,
  });
});

router.get("/dashboard/atividade-recente", async (req, res): Promise<void> => {
  const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 20;

  const sugestoes = await db.select().from(sugestoesTable).orderBy(sugestoesTable.criadoEm).limit(limite / 2);
  const anamneses = await db.select().from(anamnesesTable).orderBy(anamnesesTable.criadoEm).limit(limite / 2);

  const atividades = [
    ...sugestoes.map(s => ({
      id: s.id,
      tipo: "validacao" as const,
      descricao: `Sugestão de ${s.tipo} gerada: ${s.itemNome}`,
      pacienteNome: `Paciente ${s.pacienteId}`,
      usuarioNome: "Motor Clínico",
      criadoEm: s.criadoEm,
    })),
    ...anamneses.map(a => ({
      id: a.id + 10000,
      tipo: "anamnese" as const,
      descricao: `Anamnese ${a.status}`,
      pacienteNome: `Paciente ${a.pacienteId}`,
      usuarioNome: "Enfermeira",
      criadoEm: a.criadoEm,
    })),
  ].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()).slice(0, limite);

  res.json(atividades);
});

router.get("/dashboard/filas-resumo", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const filas = await db.select().from(filasTable);
  let filtradas = filas;
  if (unidadeId) filtradas = filtradas.filter(f => f.unidadeId === unidadeId);

  const anamnese = filtradas.filter(f => f.tipo === "anamnese").length;
  const validacao = filtradas.filter(f => f.tipo === "validacao").length;
  const procedimento = filtradas.filter(f => f.tipo === "procedimento").length;
  const followup = filtradas.filter(f => f.tipo === "followup").length;
  const pagamento = filtradas.filter(f => f.tipo === "pagamento").length;
  const totalUrgente = filtradas.filter(f => f.prioridade === "urgente").length;

  res.json({ anamnese, validacao, procedimento, followup, pagamento, totalUrgente });
});

router.get("/dashboard/comando", async (req, res): Promise<void> => {
  try {
    const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(inicioSemana.getDate() - 7);

    const allPacientes = await db.select({ id: pacientesTable.id, nome: pacientesTable.nome, unidadeId: pacientesTable.unidadeId }).from(pacientesTable);
    const pacientesFiltrados = unidadeId ? allPacientes.filter(p => p.unidadeId === unidadeId) : allPacientes;
    const pacienteIdsSet = new Set(pacientesFiltrados.map(p => p.id));

    let pacientesNomes: Record<number, string> = {};
    for (const p of pacientesFiltrados) {
      pacientesNomes[p.id] = p.nome;
    }

    const sessoesAllRaw = await db.select({
      id: sessoesTable.id,
      pacienteId: sessoesTable.pacienteId,
      status: sessoesTable.status,
      dataAgendada: sessoesTable.dataAgendada,
      tipoServico: sessoesTable.tipoServico,
      unidadeId: sessoesTable.unidadeId,
    }).from(sessoesTable);
    const sessoesAll = unidadeId ? sessoesAllRaw.filter(s => s.unidadeId === unidadeId) : sessoesAllRaw;

    const sessoesSemana = sessoesAll.filter(s => {
      const d = new Date(s.dataAgendada);
      return d >= inicioSemana && d <= hoje;
    });
    const sessoesHoje = sessoesAll.filter(s => {
      const d = new Date(s.dataAgendada);
      return d.toDateString() === hoje.toDateString();
    });
    const sessoesAmanha = sessoesAll.filter(s => {
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const d = new Date(s.dataAgendada);
      return d.toDateString() === amanha.toDateString();
    });
    const faltas = sessoesAll.filter(s => s.status === "faltou");
    const faltasSemana = faltas.filter(s => {
      const d = new Date(s.dataAgendada);
      return d >= inicioSemana;
    });

    const substUsoRaw = await db.select({
      id: registroSubstanciaUsoTable.id,
      pacienteId: registroSubstanciaUsoTable.pacienteId,
      substanciaNome: registroSubstanciaUsoTable.substanciaNome,
      tipo: registroSubstanciaUsoTable.tipo,
      dose: registroSubstanciaUsoTable.dose,
      status: registroSubstanciaUsoTable.status,
      dataInicio: registroSubstanciaUsoTable.dataInicio,
    }).from(registroSubstanciaUsoTable);
    const substUso = unidadeId ? substUsoRaw.filter(s => pacienteIdsSet.has(s.pacienteId)) : substUsoRaw;

    const substanciaMap: Record<string, { total: number; ativos: number; pausados: number; pacientes: string[] }> = {};
    for (const u of substUso) {
      if (!substanciaMap[u.substanciaNome]) {
        substanciaMap[u.substanciaNome] = { total: 0, ativos: 0, pausados: 0, pacientes: [] };
      }
      substanciaMap[u.substanciaNome].total++;
      if (u.status === "ATIVO") substanciaMap[u.substanciaNome].ativos++;
      if (u.status === "PAUSADO") substanciaMap[u.substanciaNome].pausados++;
      substanciaMap[u.substanciaNome].pacientes.push(String(u.pacienteId));
    }
    const substanciasResumo = Object.entries(substanciaMap).map(([nome, data]) => ({
      nome,
      ...data,
      pacientesUnicos: [...new Set(data.pacientes)].length,
    })).sort((a, b) => b.ativos - a.ativos);

    const alertasRaw = await db.select({
      id: alertaPacienteTable.id,
      pacienteId: alertaPacienteTable.pacienteId,
      tipoAlerta: alertaPacienteTable.tipoAlerta,
      descricao: alertaPacienteTable.descricao,
      gravidade: alertaPacienteTable.gravidade,
      status: alertaPacienteTable.status,
      criadoEm: alertaPacienteTable.criadoEm,
    }).from(alertaPacienteTable).orderBy(desc(alertaPacienteTable.criadoEm));
    const alertas = unidadeId ? alertasRaw.filter(a => pacienteIdsSet.has(a.pacienteId)) : alertasRaw;

    const alertasAbertos = alertas.filter(a => a.status === "ABERTO");
    const alertasGraves = alertasAbertos.filter(a => a.gravidade === "GRAVE");

    const faltasDetalhes = faltasSemana.map(s => ({
      pacienteId: s.pacienteId,
      pacienteNome: pacientesNomes[s.pacienteId!] || `Paciente ${s.pacienteId}`,
      data: s.dataAgendada,
      tipo: s.tipoServico,
    }));

    const alertasDetalhes = alertasAbertos.map(a => ({
      id: a.id,
      pacienteId: a.pacienteId,
      pacienteNome: pacientesNomes[a.pacienteId!] || `Paciente ${a.pacienteId}`,
      tipo: a.tipoAlerta,
      descricao: a.descricao,
      gravidade: a.gravidade,
      criadoEm: a.criadoEm,
    }));

    const sessoesUltimaSemana = sessoesSemana.map(s => ({
      pacienteId: s.pacienteId,
      pacienteNome: pacientesNomes[s.pacienteId!] || `Paciente ${s.pacienteId}`,
      status: s.status,
      data: s.dataAgendada,
      tipo: s.tipoServico,
    }));

    const statusSessoes = {
      total: sessoesAll.length,
      agendadas: sessoesAll.filter(s => s.status === "agendada").length,
      confirmadas: sessoesAll.filter(s => s.status === "confirmada").length,
      concluidas: sessoesAll.filter(s => s.status === "concluida").length,
      faltas: faltas.length,
      canceladas: sessoesAll.filter(s => s.status === "cancelada").length,
    };

    res.json({
      resumoGeral: {
        totalPacientes: pacientesFiltrados.length,
        sessoesHoje: sessoesHoje.length,
        sessoesAmanha: sessoesAmanha.length,
        sessoesSemana: sessoesSemana.length,
        faltasSemana: faltasSemana.length,
        alertasAbertos: alertasAbertos.length,
        alertasGraves: alertasGraves.length,
        substanciasEmUso: substUso.filter(s => s.status === "ATIVO").length,
      },
      statusSessoes,
      substanciasResumo,
      alertasDetalhes,
      faltasDetalhes,
      sessoesUltimaSemana,
    });
  } catch (err) {
    console.error("Erro dashboard comando:", err);
    res.status(500).json({ error: "Erro ao carregar painel de comando" });
  }
});

router.get("/dashboard/consultoria", async (req, res): Promise<void> => {
  try {
    const todasUnidades = await db.select().from(unidadesTable);
    const delegacoes = await db.select().from(delegacoesTable);
    const pacientes = await db.select().from(pacientesTable);

    const vinculosConsultor = await db.select({ unidadeId: consultorUnidadesTable.unidadeId }).from(consultorUnidadesTable);
    const idsConsultoria = new Set(vinculosConsultor.map(v => v.unidadeId));
    const unidades = todasUnidades.filter(u => idsConsultoria.has(u.id));

    const agora = new Date();
    const porClinica = unidades.map(u => {
      const delegacoesClinica = delegacoes.filter(d => d.unidadeId === u.id);
      const pacientesClinica = pacientes.filter(p => p.unidadeId === u.id);
      const pendentes = delegacoesClinica.filter(d => d.status === "pendente").length;
      const emAndamento = delegacoesClinica.filter(d => d.status === "em_andamento").length;
      const concluidas = delegacoesClinica.filter(d => d.status === "concluido").length;
      const atrasadas = delegacoesClinica.filter(d => {
        if (d.status === "atrasado") return true;
        if ((d.status === "pendente" || d.status === "em_andamento") && d.dataLimite && new Date(d.dataLimite) < agora) return true;
        return false;
      }).length;
      const total = delegacoesClinica.length;
      const taxaResolucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;

      return {
        unidadeId: u.id,
        unidadeNome: u.nome,
        unidadeCor: u.cor,
        totalPacientes: pacientesClinica.length,
        delegacoes: { total, pendentes, emAndamento, concluidas, atrasadas },
        taxaResolucao,
      };
    });

    const totalGeral = {
      clinicas: unidades.length,
      pacientes: pacientes.length,
      delegacoesTotal: delegacoes.length,
      delegacoesPendentes: delegacoes.filter(d => d.status === "pendente").length,
      delegacoesAtrasadas: delegacoes.filter(d => {
        if (d.status === "atrasado") return true;
        if ((d.status === "pendente" || d.status === "em_andamento") && d.dataLimite && new Date(d.dataLimite) < agora) return true;
        return false;
      }).length,
      delegacoesConcluidas: delegacoes.filter(d => d.status === "concluido").length,
      taxaResolucaoGeral: delegacoes.length > 0
        ? Math.round((delegacoes.filter(d => d.status === "concluido").length / delegacoes.length) * 100)
        : 0,
    };

    res.json({ totalGeral, porClinica });
  } catch (err) {
    console.error("Erro dashboard consultoria:", err);
    res.status(500).json({ error: "Erro ao carregar dashboard consultoria" });
  }
});

router.get("/dashboard/dono-clinica/:unidadeId", async (req, res): Promise<void> => {
  try {
    const unidadeId = parseInt(req.params.unidadeId, 10);

    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, unidadeId));
    if (!unidade) { res.status(404).json({ error: "Clinica nao encontrada" }); return; }

    const pacientes = await db.select().from(pacientesTable).where(eq(pacientesTable.unidadeId, unidadeId));
    const ativos = pacientes.filter(p => p.statusAtivo);
    const distribuicaoPlanos = {
      diamante: ativos.filter(p => p.planoAcompanhamento === "diamante").length,
      ouro: ativos.filter(p => p.planoAcompanhamento === "ouro").length,
      prata: ativos.filter(p => p.planoAcompanhamento === "prata").length,
      cobre: ativos.filter(p => !p.planoAcompanhamento || p.planoAcompanhamento === "cobre").length,
    };

    const delegacoes = await db.select().from(delegacoesTable).where(eq(delegacoesTable.unidadeId, unidadeId));
    const agora = new Date();
    const delegPendentes = delegacoes.filter(d => d.status === "pendente").length;
    const delegEmAndamento = delegacoes.filter(d => d.status === "em_andamento").length;
    const delegConcluidas = delegacoes.filter(d => d.status === "concluido").length;
    const delegAtrasadas = delegacoes.filter(d => {
      if (d.status === "atrasado") return true;
      if ((d.status === "pendente" || d.status === "em_andamento") && d.dataLimite && new Date(d.dataLimite) < agora) return true;
      return false;
    }).length;
    const taxaResolucao = delegacoes.length > 0 ? Math.round((delegConcluidas / delegacoes.length) * 100) : 0;

    const demandas = await db.select().from(demandasServicoTable).where(eq(demandasServicoTable.unidadeId, unidadeId));
    const demandasConcluidas = demandas.filter(d => d.status === "concluida");
    const demandasAbertas = demandas.filter(d => d.status === "aberta");
    const demandasEmAtendimento = demandas.filter(d => d.status === "em_atendimento");

    const custoBase = 50;
    const custoTotal = demandas.reduce((acc, d) => {
      const mult = CUSTO_POR_COMPLEXIDADE[d.complexidade as keyof typeof CUSTO_POR_COMPLEXIDADE]?.multiplicador || 1;
      return acc + (custoBase * mult);
    }, 0);

    const porComplexidade = {
      verde: demandas.filter(d => d.complexidade === "verde").length,
      amarela: demandas.filter(d => d.complexidade === "amarela").length,
      vermelha: demandas.filter(d => d.complexidade === "vermelha").length,
    };

    const tempoTotalMin = demandas.reduce((a, d) => a + (d.tempoGastoMin || 0), 0);

    const filas = await db.select().from(filasTable).where(eq(filasTable.unidadeId, unidadeId));
    const filasResumo = {
      anamnese: filas.filter(f => f.tipo === "anamnese").length,
      validacao: filas.filter(f => f.tipo === "validacao").length,
      procedimento: filas.filter(f => f.tipo === "procedimento").length,
      urgentes: filas.filter(f => f.prioridade === "urgente").length,
    };

    const anamneses = await db.select().from(anamnesesTable);
    const anamnesesClinica = anamneses.filter(a => {
      const pac = pacientes.find(p => p.id === a.pacienteId);
      return !!pac;
    });
    const anamnesesPendentes = anamnesesClinica.filter(a => a.status === "pendente").length;

    const demandasRecentes = demandas
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        titulo: d.titulo,
        complexidade: d.complexidade,
        status: d.status,
        tipo: d.tipo,
      }));

    res.json({
      clinica: { id: unidade.id, nome: unidade.nome, cor: unidade.cor },
      pacientes: {
        total: pacientes.length,
        ativos: ativos.length,
        distribuicaoPlanos,
      },
      delegacoes: {
        total: delegacoes.length,
        pendentes: delegPendentes,
        emAndamento: delegEmAndamento,
        concluidas: delegConcluidas,
        atrasadas: delegAtrasadas,
        taxaResolucao,
      },
      demandas: {
        total: demandas.length,
        abertas: demandasAbertas.length,
        emAtendimento: demandasEmAtendimento.length,
        concluidas: demandasConcluidas.length,
        porComplexidade,
        custoTotal: Math.round(custoTotal * 100) / 100,
        tempoTotalMin,
        recentes: demandasRecentes,
      },
      filas: filasResumo,
      anamnesesPendentes,
    });
  } catch (err) {
    console.error("Erro dashboard dono clinica:", err);
    res.status(500).json({ error: "Erro ao carregar dashboard dono clinica" });
  }
});

router.get("/dashboard/cockpit", async (req, res): Promise<void> => {
  try {
    const vinculosConsultor = await db.select({ unidadeId: consultorUnidadesTable.unidadeId }).from(consultorUnidadesTable);
    const idsConsultoria = new Set(vinculosConsultor.map(v => v.unidadeId));
    const todasUnidades = await db.select().from(unidadesTable);
    const unidades = todasUnidades.filter(u => idsConsultoria.has(u.id));
    const unidadeMap = new Map(unidades.map(u => [u.id, u]));

    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();

    const faturas = await db.select().from(faturamentoMensalTable);
    const faturasMes = faturas.filter(f => f.mes === mes && f.ano === ano);
    const receitaMes = faturasMes.reduce((a, f) => a + parseFloat(f.valorTotal as string), 0);
    const custoMes = faturasMes.reduce((a, f) => a + parseFloat(f.custoConsultores as string), 0);
    const lucroMes = faturasMes.reduce((a, f) => a + parseFloat(f.lucroEstimado as string), 0);
    const margemLucro = receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0;

    const contratos = await db.select().from(contratoClinicaTable);
    const contratosAtivos = contratos.filter(c => c.status === "ativo").length;

    const demandas = await db.select().from(demandasServicoTable);
    const demandasAbertas = demandas.filter(d => d.status === "aberta").length;
    const demandasEmAtendimento = demandas.filter(d => d.status === "em_atendimento").length;
    const demandasConcluidas = demandas.filter(d => d.status === "concluida").length;
    const demandasTotal = demandas.length;
    const porComplexidade = {
      verde: demandas.filter(d => d.complexidade === "verde").length,
      amarela: demandas.filter(d => d.complexidade === "amarela").length,
      vermelha: demandas.filter(d => d.complexidade === "vermelha").length,
    };

    const consultores = await db.select().from(usuariosTable).where(eq(usuariosTable.escopo, "consultor_campo"));
    const metaMensal = 40;
    const rankingConsultores = consultores.map(c => {
      const demandasConsultor = demandas.filter(d => d.consultorId === c.id && d.status === "concluida");
      const verdes = demandasConsultor.filter(d => d.complexidade === "verde").length;
      const amarelas = demandasConsultor.filter(d => d.complexidade === "amarela").length;
      const vermelhas = demandasConsultor.filter(d => d.complexidade === "vermelha").length;
      const total = demandasConsultor.length;
      const comissao = verdes * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.verde + amarelas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.amarela + vermelhas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.vermelha;
      const progressoMeta = Math.min(100, Math.round((total / metaMensal) * 100));

      return {
        id: c.id,
        nome: c.nome,
        total,
        verdes,
        amarelas,
        vermelhas,
        comissao,
        progressoMeta,
      };
    }).sort((a, b) => b.total - a.total);

    const delegacoes = await db.select().from(delegacoesTable);
    const agora = new Date();
    const delegAtrasadas = delegacoes.filter(d => {
      if (d.status === "atrasado") return true;
      if ((d.status === "pendente" || d.status === "em_andamento") && d.dataLimite && new Date(d.dataLimite) < agora) return true;
      return false;
    }).length;

    const pacientes = await db.select().from(pacientesTable);
    const pacientesAtivos = pacientes.filter(p => p.statusAtivo);
    const slaResumo = {
      diamante: pacientesAtivos.filter(p => p.planoAcompanhamento === "diamante").length,
      ouro: pacientesAtivos.filter(p => p.planoAcompanhamento === "ouro").length,
      prata: pacientesAtivos.filter(p => p.planoAcompanhamento === "prata").length,
      cobre: pacientesAtivos.filter(p => !p.planoAcompanhamento || p.planoAcompanhamento === "cobre").length,
    };

    const porClinicaFinanceiro = faturasMes.map(f => {
      const unidade = unidadeMap.get(f.unidadeId);
      const contrato = contratos.find(c => c.id === f.contratoId);
      return {
        unidadeId: f.unidadeId,
        nome: unidade?.nome || "Desconhecida",
        cor: unidade?.cor || "#6B7280",
        receita: parseFloat(f.valorTotal as string),
        lucro: parseFloat(f.lucroEstimado as string),
        modelo: contrato?.modeloCobranca || "por_demanda",
        demandas: f.totalDemandasVerdes + f.totalDemandasAmarelas + f.totalDemandasVermelhas,
      };
    });

    res.json({
      financeiro: {
        receitaMes: Math.round(receitaMes),
        custoMes: Math.round(custoMes),
        lucroMes: Math.round(lucroMes),
        margemLucro,
        contratosAtivos,
      },
      demandas: {
        total: demandasTotal,
        abertas: demandasAbertas,
        emAtendimento: demandasEmAtendimento,
        concluidas: demandasConcluidas,
        porComplexidade,
      },
      consultores: rankingConsultores,
      sla: slaResumo,
      delegacoesAtrasadas: delegAtrasadas,
      porClinicaFinanceiro,
      totalPacientes: pacientes.length,
      totalClinicas: unidades.length,
    });
  } catch (err) {
    console.error("Erro dashboard cockpit:", err);
    res.status(500).json({ error: "Erro ao carregar cockpit" });
  }
});

export default router;
