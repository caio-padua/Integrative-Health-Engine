import { Router } from "express";
import { db, pagamentosTable, pacientesTable, tratamentosTable, tratamentoItensTable, substanciasTable } from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";

const router = Router();

router.get("/financeiro/pagamentos", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
  const tratamentoId = req.query.tratamentoId ? parseInt(req.query.tratamentoId as string, 10) : undefined;

  const pagamentos = await db
    .select({
      id: pagamentosTable.id,
      pacienteId: pagamentosTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      tratamentoId: pagamentosTable.tratamentoId,
      valor: pagamentosTable.valor,
      status: pagamentosTable.status,
      formaPagamento: pagamentosTable.formaPagamento,
      descricao: pagamentosTable.descricao,
      parcela: pagamentosTable.parcela,
      totalParcelas: pagamentosTable.totalParcelas,
      observacao: pagamentosTable.observacao,
      unidadeId: pagamentosTable.unidadeId,
      criadoEm: pagamentosTable.criadoEm,
      paguEm: pagamentosTable.paguEm,
    })
    .from(pagamentosTable)
    .leftJoin(pacientesTable, eq(pagamentosTable.pacienteId, pacientesTable.id));

  let result = pagamentos;
  if (pacienteId) result = result.filter(p => p.pacienteId === pacienteId);
  if (status) result = result.filter(p => p.status === status);
  if (unidadeId) result = result.filter(p => p.unidadeId === unidadeId);
  if (tratamentoId) result = result.filter(p => p.tratamentoId === tratamentoId);

  res.json(result);
});

router.post("/financeiro/pagamentos", async (req, res): Promise<void> => {
  const { pacienteId, valor, formaPagamento, descricao, unidadeId, tratamentoId, parcela, totalParcelas, observacao } = req.body;
  if (!pacienteId || !valor || !formaPagamento || !unidadeId) {
    res.status(400).json({ error: "pacienteId, valor, formaPagamento e unidadeId são obrigatórios" });
    return;
  }
  const [pagamento] = await db.insert(pagamentosTable).values({
    pacienteId, valor, formaPagamento, descricao, unidadeId,
    tratamentoId: tratamentoId || null,
    parcela: parcela || null,
    totalParcelas: totalParcelas || null,
    observacao: observacao || null,
  }).returning();
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pagamento.pacienteId));
  res.status(201).json({ ...pagamento, pacienteNome: paciente?.nome });
});

router.post("/financeiro/pagamentos/:id/confirmar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [pagamento] = await db
    .update(pagamentosTable)
    .set({ status: "pago", paguEm: new Date() })
    .where(eq(pagamentosTable.id, id))
    .returning();
  if (!pagamento) { res.status(404).json({ error: "Pagamento não encontrado" }); return; }

  if (pagamento.tratamentoId) {
    await recalcularSaldoTratamento(pagamento.tratamentoId);
  }
  res.json(pagamento);
});

router.get("/financeiro/tratamentos", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;

  const tratamentos = await db
    .select({
      id: tratamentosTable.id,
      pacienteId: tratamentosTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      protocoloId: tratamentosTable.protocoloId,
      unidadeId: tratamentosTable.unidadeId,
      medicoId: tratamentosTable.medicoId,
      nome: tratamentosTable.nome,
      descricao: tratamentosTable.descricao,
      valorBruto: tratamentosTable.valorBruto,
      desconto: tratamentosTable.desconto,
      valorFinal: tratamentosTable.valorFinal,
      valorPago: tratamentosTable.valorPago,
      saldoDevedor: tratamentosTable.saldoDevedor,
      numeroParcelas: tratamentosTable.numeroParcelas,
      status: tratamentosTable.status,
      dataInicio: tratamentosTable.dataInicio,
      dataPrevisaoFim: tratamentosTable.dataPrevisaoFim,
      criadoEm: tratamentosTable.criadoEm,
    })
    .from(tratamentosTable)
    .leftJoin(pacientesTable, eq(tratamentosTable.pacienteId, pacientesTable.id));

  let result = tratamentos;
  if (pacienteId) result = result.filter(t => t.pacienteId === pacienteId);
  if (status) result = result.filter(t => t.status === status);

  res.json(result);
});

router.get("/financeiro/tratamentos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  const [tratamento] = await db
    .select({
      id: tratamentosTable.id,
      pacienteId: tratamentosTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      protocoloId: tratamentosTable.protocoloId,
      unidadeId: tratamentosTable.unidadeId,
      medicoId: tratamentosTable.medicoId,
      nome: tratamentosTable.nome,
      descricao: tratamentosTable.descricao,
      valorBruto: tratamentosTable.valorBruto,
      desconto: tratamentosTable.desconto,
      valorFinal: tratamentosTable.valorFinal,
      valorPago: tratamentosTable.valorPago,
      saldoDevedor: tratamentosTable.saldoDevedor,
      numeroParcelas: tratamentosTable.numeroParcelas,
      condicoesPagamento: tratamentosTable.condicoesPagamento,
      status: tratamentosTable.status,
      dataInicio: tratamentosTable.dataInicio,
      dataPrevisaoFim: tratamentosTable.dataPrevisaoFim,
      dataConclusao: tratamentosTable.dataConclusao,
      motivoDesistencia: tratamentosTable.motivoDesistencia,
      valorRetidoDesistencia: tratamentosTable.valorRetidoDesistencia,
      custosInsumos: tratamentosTable.custosInsumos,
      custoReservaTecnica: tratamentosTable.custoReservaTecnica,
      custoLogistica: tratamentosTable.custoLogistica,
      detalhesRetencao: tratamentosTable.detalhesRetencao,
      observacoes: tratamentosTable.observacoes,
      criadoEm: tratamentosTable.criadoEm,
      atualizadoEm: tratamentosTable.atualizadoEm,
    })
    .from(tratamentosTable)
    .leftJoin(pacientesTable, eq(tratamentosTable.pacienteId, pacientesTable.id))
    .where(eq(tratamentosTable.id, id));

  if (!tratamento) { res.status(404).json({ error: "Tratamento não encontrado" }); return; }

  const itens = await db
    .select({
      id: tratamentoItensTable.id,
      substanciaId: tratamentoItensTable.substanciaId,
      substanciaNome: substanciasTable.nome,
      descricao: tratamentoItensTable.descricao,
      tipo: tratamentoItensTable.tipo,
      quantidade: tratamentoItensTable.quantidade,
      valorUnitario: tratamentoItensTable.valorUnitario,
      valorTotal: tratamentoItensTable.valorTotal,
      numeroSessoes: tratamentoItensTable.numeroSessoes,
      via: tratamentoItensTable.via,
      observacoes: tratamentoItensTable.observacoes,
    })
    .from(tratamentoItensTable)
    .leftJoin(substanciasTable, eq(tratamentoItensTable.substanciaId, substanciasTable.id))
    .where(eq(tratamentoItensTable.tratamentoId, id));

  const pagamentos = await db
    .select()
    .from(pagamentosTable)
    .where(eq(pagamentosTable.tratamentoId, id));

  res.json({ ...tratamento, itens, pagamentos });
});

router.post("/financeiro/tratamentos", async (req, res): Promise<void> => {
  const { pacienteId, protocoloId, unidadeId, medicoId, nome, descricao,
    valorBruto, desconto, numeroParcelas, dataInicio, dataPrevisaoFim,
    condicoesPagamento, observacoes, itens } = req.body;

  if (!pacienteId || !nome) {
    res.status(400).json({ error: "pacienteId e nome são obrigatórios" });
    return;
  }

  const vBruto = valorBruto || 0;
  const vDesconto = desconto || 0;
  const vFinal = vBruto - vDesconto;

  const [tratamento] = await db.insert(tratamentosTable).values({
    pacienteId,
    protocoloId: protocoloId || null,
    unidadeId: unidadeId || null,
    medicoId: medicoId || null,
    nome,
    descricao: descricao || null,
    valorBruto: vBruto,
    desconto: vDesconto,
    valorFinal: vFinal,
    valorPago: 0,
    saldoDevedor: vFinal,
    numeroParcelas: numeroParcelas || 1,
    condicoesPagamento: condicoesPagamento || {},
    status: "ativo",
    dataInicio: dataInicio || new Date().toISOString().split("T")[0],
    dataPrevisaoFim: dataPrevisaoFim || null,
    observacoes: observacoes || null,
  }).returning();

  if (itens && Array.isArray(itens) && itens.length > 0) {
    const itensToInsert = itens.map((item: any) => ({
      tratamentoId: tratamento.id,
      substanciaId: item.substanciaId || null,
      descricao: item.descricao || item.nome || "Item",
      tipo: item.tipo || "substancia",
      quantidade: item.quantidade || 1,
      valorUnitario: item.valorUnitario || 0,
      valorTotal: (item.quantidade || 1) * (item.valorUnitario || 0),
      numeroSessoes: item.numeroSessoes || null,
      via: item.via || null,
      observacoes: item.observacoes || null,
    }));
    await db.insert(tratamentoItensTable).values(itensToInsert);
  }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, tratamento.pacienteId));
  res.status(201).json({ ...tratamento, pacienteNome: paciente?.nome });
});

router.put("/financeiro/tratamentos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { nome, descricao, valorBruto, desconto, numeroParcelas,
    dataPrevisaoFim, condicoesPagamento, observacoes, status } = req.body;

  const updates: any = {};
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (observacoes !== undefined) updates.observacoes = observacoes;
  if (numeroParcelas !== undefined) updates.numeroParcelas = numeroParcelas;
  if (dataPrevisaoFim !== undefined) updates.dataPrevisaoFim = dataPrevisaoFim;
  if (condicoesPagamento !== undefined) updates.condicoesPagamento = condicoesPagamento;
  if (status !== undefined) updates.status = status;

  if (valorBruto !== undefined || desconto !== undefined) {
    const [current] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, id));
    if (!current) { res.status(404).json({ error: "Tratamento não encontrado" }); return; }
    const vBruto = valorBruto !== undefined ? valorBruto : current.valorBruto;
    const vDesconto = desconto !== undefined ? desconto : current.desconto;
    const vFinal = vBruto - vDesconto;
    updates.valorBruto = vBruto;
    updates.desconto = vDesconto;
    updates.valorFinal = vFinal;
    updates.saldoDevedor = vFinal - (current.valorPago || 0);
  }

  const [tratamento] = await db.update(tratamentosTable).set(updates).where(eq(tratamentosTable.id, id)).returning();
  if (!tratamento) { res.status(404).json({ error: "Tratamento não encontrado" }); return; }
  res.json(tratamento);
});

router.post("/financeiro/tratamentos/:id/baixa", async (req, res): Promise<void> => {
  const tratamentoId = parseInt(req.params.id, 10);
  const { valor, formaPagamento, observacao, parcela } = req.body;

  if (!valor || valor <= 0 || !formaPagamento) {
    res.status(400).json({ error: "valor (positivo) e formaPagamento são obrigatórios" });
    return;
  }

  const [tratamento] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, tratamentoId));
  if (!tratamento) { res.status(404).json({ error: "Tratamento não encontrado" }); return; }
  if (tratamento.status === "cancelado" || tratamento.status === "desistencia") {
    res.status(400).json({ error: "Tratamento não está ativo para receber pagamentos" });
    return;
  }

  const saldoAtual = tratamento.saldoDevedor || 0;
  if (valor > saldoAtual * 1.01) {
    res.status(400).json({ error: `Valor excede o saldo devedor de R$ ${saldoAtual.toFixed(2)}` });
    return;
  }

  const pagamentosExistentes = await db.select().from(pagamentosTable)
    .where(and(eq(pagamentosTable.tratamentoId, tratamentoId), eq(pagamentosTable.status, "pago")));
  const numeroPagamento = pagamentosExistentes.length + 1;

  const [pagamento] = await db.insert(pagamentosTable).values({
    pacienteId: tratamento.pacienteId,
    tratamentoId,
    valor,
    formaPagamento,
    descricao: `Baixa parcial #${numeroPagamento} - ${tratamento.nome}`,
    parcela: parcela || numeroPagamento,
    totalParcelas: tratamento.numeroParcelas,
    observacao: observacao || null,
    unidadeId: tratamento.unidadeId || 1,
    status: "pago",
    paguEm: new Date(),
  }).returning();

  await recalcularSaldoTratamento(tratamentoId);

  const [updated] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, tratamentoId));
  res.status(201).json({ pagamento, tratamento: updated });
});

router.post("/financeiro/tratamentos/:id/desistencia", async (req, res): Promise<void> => {
  const tratamentoId = parseInt(req.params.id, 10);
  const { motivoDesistencia } = req.body;

  const [tratamento] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, tratamentoId));
  if (!tratamento) { res.status(404).json({ error: "Tratamento não encontrado" }); return; }

  const itens = await db.select().from(tratamentoItensTable).where(eq(tratamentoItensTable.tratamentoId, tratamentoId));

  const custosInsumos = itens
    .filter(i => i.tipo === "substancia" || i.tipo === "insumo")
    .reduce((sum, i) => sum + (i.valorTotal || 0), 0);
  const custoReservaTecnica = itens
    .filter(i => i.tipo === "reserva_tecnica" || i.tipo === "honorario_enfermagem")
    .reduce((sum, i) => sum + (i.valorTotal || 0), 0);
  const custoLogistica = itens
    .filter(i => i.tipo === "taxa_administrativa")
    .reduce((sum, i) => sum + (i.valorTotal || 0), 0);

  const valorRetido = custosInsumos + custoReservaTecnica + custoLogistica;
  const saldoDevedor = tratamento.saldoDevedor || 0;
  const valorADevolver = Math.max(0, (tratamento.valorPago || 0) - valorRetido);

  const detalhesRetencao = {
    custosInsumos,
    custoReservaTecnica,
    custoLogistica,
    valorRetidoTotal: valorRetido,
    valorPagoTotal: tratamento.valorPago,
    valorADevolver,
    saldoDevedorAnterior: saldoDevedor,
    dataDesistencia: new Date().toISOString(),
    itensRetidos: itens.map(i => ({
      descricao: i.descricao,
      tipo: i.tipo,
      valor: i.valorTotal,
    })),
  };

  const saldoRemanescente = Math.max(0, valorRetido - (tratamento.valorPago || 0));

  const [updated] = await db.update(tratamentosTable).set({
    status: "desistencia",
    motivoDesistencia: motivoDesistencia || "Desistência solicitada pelo paciente",
    valorRetidoDesistencia: valorRetido,
    custosInsumos,
    custoReservaTecnica,
    custoLogistica,
    detalhesRetencao,
    dataConclusao: new Date().toISOString().split("T")[0],
    saldoDevedor: saldoRemanescente,
  }).where(eq(tratamentosTable.id, tratamentoId)).returning();

  res.json({ tratamento: updated, detalhesRetencao });
});

router.get("/financeiro/resumo-paciente/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);

  const tratamentos = await db.select().from(tratamentosTable)
    .where(eq(tratamentosTable.pacienteId, pacienteId));

  const pagamentos = await db.select().from(pagamentosTable)
    .where(and(eq(pagamentosTable.pacienteId, pacienteId), eq(pagamentosTable.status, "pago")));

  const totalTratamentos = tratamentos.length;
  const tratamentosAtivos = tratamentos.filter(t => t.status === "ativo").length;
  const totalValorTratamentos = tratamentos.reduce((sum, t) => sum + (t.valorFinal || 0), 0);
  const totalPago = pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
  const totalPendente = tratamentos
    .filter(t => t.status === "ativo")
    .reduce((sum, t) => sum + (t.saldoDevedor || 0), 0);

  res.json({
    pacienteId,
    totalTratamentos,
    tratamentosAtivos,
    totalValorTratamentos,
    totalPago,
    totalPendente,
    tratamentos: tratamentos.map(t => ({
      id: t.id,
      nome: t.nome,
      status: t.status,
      valorFinal: t.valorFinal,
      valorPago: t.valorPago,
      saldoDevedor: t.saldoDevedor,
      dataInicio: t.dataInicio,
    })),
  });
});

router.get("/financeiro/dashboard", async (req, res): Promise<void> => {
  const allTratamentos = await db.select().from(tratamentosTable);
  const allPagamentos = await db.select().from(pagamentosTable);

  const totalRecebido = allPagamentos
    .filter(p => p.status === "pago")
    .reduce((sum, p) => sum + (p.valor || 0), 0);

  const totalPendente = allTratamentos
    .filter(t => t.status === "ativo")
    .reduce((sum, t) => sum + (t.saldoDevedor || 0), 0);

  const tratamentosAtivos = allTratamentos.filter(t => t.status === "ativo").length;
  const tratamentosConcluidos = allTratamentos.filter(t => t.status === "concluido").length;
  const desistencias = allTratamentos.filter(t => t.status === "desistencia").length;

  const inadimplencia = allTratamentos.filter(t => {
    if (t.status !== "ativo") return false;
    const saldo = t.saldoDevedor || 0;
    const final = t.valorFinal || 1;
    return saldo > 0 && (saldo / final) > 0.5;
  }).length;

  const pagamentosPorForma: Record<string, number> = {};
  allPagamentos.filter(p => p.status === "pago").forEach(p => {
    const forma = p.formaPagamento || "outro";
    pagamentosPorForma[forma] = (pagamentosPorForma[forma] || 0) + (p.valor || 0);
  });

  res.json({
    totalRecebido,
    totalPendente,
    tratamentosAtivos,
    tratamentosConcluidos,
    desistencias,
    inadimplencia,
    totalTratamentos: allTratamentos.length,
    pagamentosPorForma,
  });
});

async function recalcularSaldoTratamento(tratamentoId: number) {
  const pagamentos = await db.select().from(pagamentosTable)
    .where(and(eq(pagamentosTable.tratamentoId, tratamentoId), eq(pagamentosTable.status, "pago")));

  const totalPago = pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);

  const [tratamento] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, tratamentoId));
  if (!tratamento) return;

  const saldoDevedor = Math.max(0, (tratamento.valorFinal || 0) - totalPago);
  const novoStatus = saldoDevedor <= 0 && tratamento.status === "ativo" ? "concluido" : tratamento.status;

  await db.update(tratamentosTable).set({
    valorPago: totalPago,
    saldoDevedor,
    status: novoStatus,
    dataConclusao: novoStatus === "concluido" ? new Date().toISOString().split("T")[0] : tratamento.dataConclusao,
  }).where(eq(tratamentosTable.id, tratamentoId));
}

export default router;
