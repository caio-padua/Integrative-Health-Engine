import { Router, Request, Response } from "express";
import { db, modulosSistemaTable, contratoClinicaTable, modulosContratadosTable, faturamentoMensalTable, demandasServicoTable, unidadesTable, consultorUnidadesTable, CATALOGO_MODULOS, PRECO_DEMANDA_CLINICA, REMUNERACAO_CONSULTOR, MODELOS_COBRANCA } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/comercial/modulos", async (req: Request, res: Response) => {
  const modulos = await db.select().from(modulosSistemaTable).orderBy(modulosSistemaTable.ordem);
  res.json(modulos);
});

router.get("/comercial/contratos", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let contratos = await db.select().from(contratoClinicaTable);
  if (unidadeId) contratos = contratos.filter(c => c.unidadeId === unidadeId);

  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, u]));

  const modulosContratados = await db.select().from(modulosContratadosTable);
  const todosModulos = await db.select().from(modulosSistemaTable);
  const moduloMap = new Map(todosModulos.map(m => [m.id, m]));

  const resultado = contratos.map(c => {
    const unidade = unidadeMap.get(c.unidadeId);
    const mods = modulosContratados
      .filter(mc => mc.contratoId === c.id && mc.ativo)
      .map(mc => {
        const modulo = moduloMap.get(mc.moduloId);
        return modulo ? { ...modulo, valorCustomizado: mc.valorCustomizado } : null;
      })
      .filter(Boolean);

    return {
      ...c,
      unidadeNome: unidade?.nome || "Desconhecida",
      unidadeCor: unidade?.cor || "#6B7280",
      modulos: mods,
      totalModulos: mods.length,
    };
  });

  res.json(resultado);
});

router.get("/comercial/faturamento", async (req: Request, res: Response) => {
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : new Date().getMonth() + 1;
  const ano = req.query.ano ? parseInt(req.query.ano as string, 10) : new Date().getFullYear();
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let faturas = await db.select().from(faturamentoMensalTable);
  faturas = faturas.filter(f => f.mes === mes && f.ano === ano);
  if (unidadeId) faturas = faturas.filter(f => f.unidadeId === unidadeId);

  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, u]));

  const resultado = faturas.map(f => {
    const unidade = unidadeMap.get(f.unidadeId);
    return {
      ...f,
      unidadeNome: unidade?.nome || "Desconhecida",
      unidadeCor: unidade?.cor || "#6B7280",
    };
  });

  const totais = {
    receita: resultado.reduce((a, f) => a + parseFloat(f.valorTotal as string), 0),
    custoConsultores: resultado.reduce((a, f) => a + parseFloat(f.custoConsultores as string), 0),
    lucro: resultado.reduce((a, f) => a + parseFloat(f.lucroEstimado as string), 0),
    totalDemandas: resultado.reduce((a, f) => a + f.totalDemandasVerdes + f.totalDemandasAmarelas + f.totalDemandasVermelhas, 0),
    faturasAbertas: resultado.filter(f => f.status === "aberto" || f.status === "faturado").length,
    faturasPagas: resultado.filter(f => f.status === "pago").length,
    faturasAtrasadas: resultado.filter(f => f.status === "atrasado").length,
  };

  res.json({ faturas: resultado, totais, mes, ano });
});

router.post("/comercial/gerar-faturamento", async (req: Request, res: Response) => {
  const mes = req.body.mes || new Date().getMonth() + 1;
  const ano = req.body.ano || new Date().getFullYear();

  const contratos = await db.select().from(contratoClinicaTable).where(eq(contratoClinicaTable.status, "ativo"));
  const todasDemandas = await db.select().from(demandasServicoTable);
  const modulosContratados = await db.select().from(modulosContratadosTable);
  const todosModulos = await db.select().from(modulosSistemaTable);
  const moduloMap = new Map(todosModulos.map(m => [m.id, m]));

  const faturasCriadas: any[] = [];

  for (const contrato of contratos) {
    const existing = await db.select().from(faturamentoMensalTable)
      .where(and(
        eq(faturamentoMensalTable.contratoId, contrato.id),
        eq(faturamentoMensalTable.mes, mes),
        eq(faturamentoMensalTable.ano, ano),
      ));
    if (existing.length > 0) continue;

    const demandasClinica = todasDemandas.filter(d => {
      if (d.unidadeId !== contrato.unidadeId) return false;
      if (d.status !== "concluida") return false;
      const dt = d.concluidaEm || d.criadoEm;
      if (!dt) return false;
      const date = new Date(dt);
      return date.getMonth() + 1 === mes && date.getFullYear() === ano;
    });

    const verdes = demandasClinica.filter(d => d.complexidade === "verde").length;
    const amarelas = demandasClinica.filter(d => d.complexidade === "amarela").length;
    const vermelhas = demandasClinica.filter(d => d.complexidade === "vermelha").length;

    let valorDemandas = 0;
    if (contrato.modeloCobranca === "por_demanda") {
      valorDemandas = (verdes * PRECO_DEMANDA_CLINICA.verde) +
        (amarelas * PRECO_DEMANDA_CLINICA.amarela) +
        (vermelhas * PRECO_DEMANDA_CLINICA.vermelha);
    } else if (contrato.modeloCobranca === "pacote") {
      const totalDemandas = verdes + amarelas + vermelhas;
      const excedentes = Math.max(0, totalDemandas - (contrato.creditosDemandas || 0));
      valorDemandas = (excedentes * PRECO_DEMANDA_CLINICA.verde);
    }

    const modsContrato = modulosContratados.filter(mc => mc.contratoId === contrato.id && mc.ativo);
    let valorModulos = 0;
    if (contrato.modeloCobranca === "full") {
      valorModulos = parseFloat(contrato.valorMensalFixo as string) || 0;
    } else {
      for (const mc of modsContrato) {
        const modulo = moduloMap.get(mc.moduloId);
        if (modulo) {
          const val = mc.valorCustomizado ? parseFloat(mc.valorCustomizado as string) : parseFloat(modulo.precoMensal as string);
          valorModulos += val;
        }
      }
    }

    const custoConsultores = (verdes * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.verde) +
      (amarelas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.amarela) +
      (vermelhas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.vermelha);

    const valorTotal = valorDemandas + valorModulos;
    const lucroEstimado = valorTotal - custoConsultores;

    const vencimento = new Date(ano, mes, 10);

    const [fatura] = await db.insert(faturamentoMensalTable).values({
      contratoId: contrato.id,
      unidadeId: contrato.unidadeId,
      mes,
      ano,
      valorModulos: valorModulos.toFixed(2),
      valorDemandas: valorDemandas.toFixed(2),
      totalDemandasVerdes: verdes,
      totalDemandasAmarelas: amarelas,
      totalDemandasVermelhas: vermelhas,
      valorTotal: valorTotal.toFixed(2),
      custoConsultores: custoConsultores.toFixed(2),
      lucroEstimado: lucroEstimado.toFixed(2),
      status: "faturado",
      dataVencimento: vencimento,
    }).returning();

    faturasCriadas.push(fatura);
  }

  res.json({ message: `${faturasCriadas.length} faturas geradas para ${mes}/${ano}`, faturas: faturasCriadas });
});

router.get("/comercial/dashboard-financeiro", async (req: Request, res: Response) => {
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : new Date().getMonth() + 1;
  const ano = req.query.ano ? parseInt(req.query.ano as string, 10) : new Date().getFullYear();

  const faturas = await db.select().from(faturamentoMensalTable);
  const faturasMes = faturas.filter(f => f.mes === mes && f.ano === ano);

  const contratos = await db.select().from(contratoClinicaTable);
  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, u]));

  const receitaTotal = faturasMes.reduce((a, f) => a + parseFloat(f.valorTotal as string), 0);
  const custoTotal = faturasMes.reduce((a, f) => a + parseFloat(f.custoConsultores as string), 0);
  const lucroTotal = faturasMes.reduce((a, f) => a + parseFloat(f.lucroEstimado as string), 0);
  const margemLucro = receitaTotal > 0 ? Math.round((lucroTotal / receitaTotal) * 100) : 0;

  const contratosAtivos = contratos.filter(c => c.status === "ativo").length;
  const contratosTrial = contratos.filter(c => c.status === "trial").length;

  const porClinica = faturasMes.map(f => {
    const unidade = unidadeMap.get(f.unidadeId);
    const contrato = contratos.find(c => c.id === f.contratoId);
    return {
      unidadeId: f.unidadeId,
      unidadeNome: unidade?.nome || "Desconhecida",
      unidadeCor: unidade?.cor || "#6B7280",
      receita: parseFloat(f.valorTotal as string),
      custo: parseFloat(f.custoConsultores as string),
      lucro: parseFloat(f.lucroEstimado as string),
      demandas: f.totalDemandasVerdes + f.totalDemandasAmarelas + f.totalDemandasVermelhas,
      modeloCobranca: contrato?.modeloCobranca || "por_demanda",
      status: f.status,
    };
  });

  const receitaAcumulada = faturas.filter(f => f.ano === ano).reduce((a, f) => a + parseFloat(f.valorTotal as string), 0);
  const lucroAcumulado = faturas.filter(f => f.ano === ano).reduce((a, f) => a + parseFloat(f.lucroEstimado as string), 0);

  const porModelo = {
    full: contratos.filter(c => c.modeloCobranca === "full" && c.status === "ativo").length,
    pacote: contratos.filter(c => c.modeloCobranca === "pacote" && c.status === "ativo").length,
    por_demanda: contratos.filter(c => c.modeloCobranca === "por_demanda" && c.status === "ativo").length,
  };

  res.json({
    resumo: {
      receitaMes: receitaTotal,
      custoMes: custoTotal,
      lucroMes: lucroTotal,
      margemLucro,
      contratosAtivos,
      contratosTrial,
      receitaAcumulada,
      lucroAcumulado,
    },
    porClinica,
    porModelo,
    mes,
    ano,
    config: { precoDemanda: PRECO_DEMANDA_CLINICA, modelosCobranca: MODELOS_COBRANCA },
  });
});

router.post("/comercial/seed", async (req: Request, res: Response) => {
  try {
    const existingModulos = await db.select().from(modulosSistemaTable);
    if (existingModulos.length === 0) {
      for (const m of CATALOGO_MODULOS) {
        await db.insert(modulosSistemaTable).values({
          codigo: m.codigo,
          nome: m.nome,
          descricao: m.descricao,
          categoria: m.categoria,
          precoMensal: m.precoMensal,
          precoPorDemanda: m.precoPorDemanda,
          icone: m.icone,
          cor: m.cor,
          funcionalidades: m.funcionalidades as any,
          ordem: m.ordem,
        });
      }
    }

    const modulos = await db.select().from(modulosSistemaTable);
    const moduloByCode = new Map(modulos.map(m => [m.codigo, m]));

    const vinculos = await db.selectDistinct({ unidadeId: consultorUnidadesTable.unidadeId }).from(consultorUnidadesTable);
    const clinicaIds = vinculos.map(v => v.unidadeId);

    const existingContratos = await db.select().from(contratoClinicaTable);
    if (existingContratos.length === 0 && clinicaIds.length > 0) {
      const configs = [
        { unidadeId: clinicaIds[0], modelo: "por_demanda" as const, valorFixo: null, creditos: null, onboarding: "2500.00", moduloCodes: ["MSG_WHATSAPP", "CONSULTOR_REMOTO", "FOLLOWUP_ATIVO", "VALIDACAO_MOTOR"] },
        { unidadeId: clinicaIds[1], modelo: "full" as const, valorFixo: "3500.00", creditos: null, onboarding: "3000.00", moduloCodes: ["MSG_WHATSAPP", "CONSULTOR_REMOTO", "FOLLOWUP_ATIVO", "VALIDACAO_MOTOR", "TREINAMENTO_EQUIPE", "RELATORIOS_BI"] },
        { unidadeId: clinicaIds[2], modelo: "pacote" as const, valorFixo: null, creditos: 30, onboarding: "2000.00", moduloCodes: ["MSG_WHATSAPP", "FOLLOWUP_ATIVO", "GESTAO_ESTOQUE"] },
      ];

      for (const cfg of configs) {
        if (!cfg.unidadeId) continue;
        const [contrato] = await db.insert(contratoClinicaTable).values({
          unidadeId: cfg.unidadeId,
          modeloCobranca: cfg.modelo,
          valorMensalFixo: cfg.valorFixo,
          creditosDemandas: cfg.creditos,
          valorOnboarding: cfg.onboarding,
          onboardingPago: true,
          status: "ativo",
        }).returning();

        for (const code of cfg.moduloCodes) {
          const modulo = moduloByCode.get(code);
          if (modulo) {
            await db.insert(modulosContratadosTable).values({
              contratoId: contrato.id,
              moduloId: modulo.id,
            });
          }
        }
      }
    }

    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();
    const contratosAtivos = await db.select().from(contratoClinicaTable).where(eq(contratoClinicaTable.status, "ativo"));
    const existingFaturas = await db.select().from(faturamentoMensalTable);
    const faturasMesAtual = existingFaturas.filter(f => f.mes === mes && f.ano === ano);

    if (faturasMesAtual.length === 0 && contratosAtivos.length > 0) {
      const todasDemandas = await db.select().from(demandasServicoTable);
      const modulosContratadosList = await db.select().from(modulosContratadosTable);

      for (const contrato of contratosAtivos) {
        const demandasClinica = todasDemandas.filter(d => d.unidadeId === contrato.unidadeId && d.status === "concluida");
        const verdes = demandasClinica.filter(d => d.complexidade === "verde").length;
        const amarelas = demandasClinica.filter(d => d.complexidade === "amarela").length;
        const vermelhas = demandasClinica.filter(d => d.complexidade === "vermelha").length;

        let valorDemandas = 0;
        if (contrato.modeloCobranca === "por_demanda") {
          valorDemandas = (verdes * PRECO_DEMANDA_CLINICA.verde) + (amarelas * PRECO_DEMANDA_CLINICA.amarela) + (vermelhas * PRECO_DEMANDA_CLINICA.vermelha);
        } else if (contrato.modeloCobranca === "pacote") {
          const excedentes = Math.max(0, (verdes + amarelas + vermelhas) - (contrato.creditosDemandas || 0));
          valorDemandas = excedentes * PRECO_DEMANDA_CLINICA.verde;
        }

        let valorModulos = 0;
        if (contrato.modeloCobranca === "full") {
          valorModulos = parseFloat(contrato.valorMensalFixo as string) || 0;
        } else {
          const modsContrato = modulosContratadosList.filter(mc => mc.contratoId === contrato.id && mc.ativo);
          for (const mc of modsContrato) {
            const modulo = modulos.find(m => m.id === mc.moduloId);
            if (modulo) valorModulos += parseFloat(modulo.precoMensal as string);
          }
        }

        const custoConsultores = (verdes * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.verde) + (amarelas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.amarela) + (vermelhas * REMUNERACAO_CONSULTOR.comissaoPorComplexidade.vermelha);
        const valorTotal = valorDemandas + valorModulos;
        const lucro = valorTotal - custoConsultores;

        await db.insert(faturamentoMensalTable).values({
          contratoId: contrato.id,
          unidadeId: contrato.unidadeId,
          mes,
          ano,
          valorModulos: valorModulos.toFixed(2),
          valorDemandas: valorDemandas.toFixed(2),
          totalDemandasVerdes: verdes,
          totalDemandasAmarelas: amarelas,
          totalDemandasVermelhas: vermelhas,
          valorTotal: valorTotal.toFixed(2),
          custoConsultores: custoConsultores.toFixed(2),
          lucroEstimado: lucro.toFixed(2),
          status: "faturado",
          dataVencimento: new Date(ano, mes, 10),
        });
      }
    }

    res.json({ message: "Seed comercial concluido", modulos: modulos.length, contratos: contratosAtivos.length });
  } catch (err) {
    console.error("Erro seed comercial:", err);
    res.status(500).json({ error: "Erro ao executar seed comercial" });
  }
});

export default router;
