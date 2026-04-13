import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { demandasServicoTable, usuariosTable, unidadesTable, REMUNERACAO_CONSULTOR } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function calcularComissao(demandas: any[]) {
  const { comissaoPorComplexidade, metaMensal, faixasMeta, salarioFixo } = REMUNERACAO_CONSULTOR;
  const concluidas = demandas.filter(d => d.status === "concluida");

  let comissaoBase = 0;
  let verdes = 0, amarelas = 0, vermelhas = 0;

  concluidas.forEach(d => {
    const val = comissaoPorComplexidade[d.complexidade as keyof typeof comissaoPorComplexidade] || 0;
    comissaoBase += val;
    if (d.complexidade === "verde") verdes++;
    if (d.complexidade === "amarela") amarelas++;
    if (d.complexidade === "vermelha") vermelhas++;
  });

  const totalConcluidas = concluidas.length;
  const pctMeta = metaMensal > 0 ? Math.round((totalConcluidas / metaMensal) * 100) : 0;

  let faixaAtingida = "nenhuma";
  let bonusPct = 0;
  for (const faixa of faixasMeta) {
    if (pctMeta >= faixa.pct) {
      faixaAtingida = faixa.label.toLowerCase();
      bonusPct = faixa.bonus;
    }
  }

  const bonusValor = comissaoBase * bonusPct;
  const totalBruto = salarioFixo + comissaoBase + bonusValor;

  const proximaFaixa = faixasMeta.find(f => pctMeta < f.pct);
  const demandasParaProxima = proximaFaixa
    ? Math.max(0, Math.ceil((proximaFaixa.pct / 100) * metaMensal) - totalConcluidas)
    : 0;

  return {
    salarioFixo,
    comissaoBase: Math.round(comissaoBase * 100) / 100,
    bonusPct: Math.round(bonusPct * 100),
    bonusValor: Math.round(bonusValor * 100) / 100,
    totalBruto: Math.round(totalBruto * 100) / 100,
    totalConcluidas,
    metaMensal,
    pctMeta: Math.min(pctMeta, 100),
    faixaAtingida,
    verdes,
    amarelas,
    vermelhas,
    proximaFaixa: proximaFaixa ? { ...proximaFaixa, faltam: demandasParaProxima } : null,
    detalheComplexidade: {
      verde: { qtd: verdes, valor: verdes * comissaoPorComplexidade.verde },
      amarela: { qtd: amarelas, valor: amarelas * comissaoPorComplexidade.amarela },
      vermelha: { qtd: vermelhas, valor: vermelhas * comissaoPorComplexidade.vermelha },
    },
  };
}

router.get("/comissao/consultor/:id", async (req: Request, res: Response) => {
  const consultorId = parseInt(req.params.id, 10);
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : new Date().getMonth() + 1;
  const ano = req.query.ano ? parseInt(req.query.ano as string, 10) : new Date().getFullYear();

  const [consultor] = await db.select({ id: usuariosTable.id, nome: usuariosTable.nome, escopo: usuariosTable.escopo })
    .from(usuariosTable).where(eq(usuariosTable.id, consultorId));

  if (!consultor) { res.status(404).json({ error: "Consultor nao encontrado" }); return; }

  const todasDemandas = await db.select().from(demandasServicoTable)
    .where(eq(demandasServicoTable.consultorId, consultorId));

  const demandasMes = todasDemandas.filter(d => {
    const dt = d.concluidaEm || d.criadoEm;
    if (!dt) return false;
    const date = new Date(dt);
    return date.getMonth() + 1 === mes && date.getFullYear() === ano;
  });

  const calc = calcularComissao(demandasMes);

  const totalAbertasMes = demandasMes.filter(d => d.status === "aberta").length;
  const emAtendimentoMes = demandasMes.filter(d => d.status === "em_atendimento").length;
  const tempoTotalMin = demandasMes.reduce((a, d) => a + (d.tempoGastoMin || 0), 0);

  res.json({
    consultor: { id: consultor.id, nome: consultor.nome, escopo: consultor.escopo },
    mes, ano,
    ...calc,
    abertas: totalAbertasMes,
    emAtendimento: emAtendimentoMes,
    tempoTotalMin,
    config: REMUNERACAO_CONSULTOR,
  });
});

router.get("/comissao/painel-gestor", async (req: Request, res: Response) => {
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : new Date().getMonth() + 1;
  const ano = req.query.ano ? parseInt(req.query.ano as string, 10) : new Date().getFullYear();
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const consultores = await db.select({ id: usuariosTable.id, nome: usuariosTable.nome, escopo: usuariosTable.escopo })
    .from(usuariosTable)
    .where(eq(usuariosTable.escopo, "consultor_campo"));

  let todasDemandas = await db.select().from(demandasServicoTable);
  if (unidadeId) todasDemandas = todasDemandas.filter(d => d.unidadeId === unidadeId);

  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, { nome: u.nome, cor: u.cor }]));

  const resultado = consultores.map(c => {
    const demandasConsultor = todasDemandas.filter(d => d.consultorId === c.id);
    const demandasMes = demandasConsultor.filter(d => {
      const dt = d.concluidaEm || d.criadoEm;
      if (!dt) return false;
      const date = new Date(dt);
      return date.getMonth() + 1 === mes && date.getFullYear() === ano;
    });

    const calc = calcularComissao(demandasMes);

    const clinicasAtendidas = new Set(demandasMes.map(d => d.unidadeId));
    const clinicasInfo = Array.from(clinicasAtendidas).map(uid => {
      const u = unidadeMap.get(uid);
      const demandasClinica = demandasMes.filter(d => d.unidadeId === uid && d.status === "concluida");
      return { id: uid, nome: u?.nome || "—", cor: u?.cor || null, demandas: demandasClinica.length };
    });

    return {
      consultor: { id: c.id, nome: c.nome },
      ...calc,
      clinicasAtendidas: clinicasInfo,
      tempoTotalMin: demandasMes.reduce((a, d) => a + (d.tempoGastoMin || 0), 0),
    };
  });

  resultado.sort((a, b) => b.totalConcluidas - a.totalConcluidas);

  const totalGeral = resultado.reduce((a, c) => a + c.totalBruto, 0);
  const comissaoGeral = resultado.reduce((a, c) => a + c.comissaoBase, 0);

  res.json({
    mes, ano,
    consultores: resultado,
    resumo: {
      totalConsultores: resultado.length,
      totalDemandas: resultado.reduce((a, c) => a + c.totalConcluidas, 0),
      custoTotalBruto: Math.round(totalGeral * 100) / 100,
      comissaoTotal: Math.round(comissaoGeral * 100) / 100,
    },
    config: REMUNERACAO_CONSULTOR,
  });
});

router.get("/comissao/config", async (_req: Request, res: Response) => {
  res.json(REMUNERACAO_CONSULTOR);
});

export default router;
