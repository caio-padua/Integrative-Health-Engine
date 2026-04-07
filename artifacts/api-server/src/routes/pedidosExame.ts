import { Router } from "express";
import { db } from "@workspace/db";
import { pedidosExameTable, examesBaseTable } from "@workspace/db";
import { sql, eq, inArray } from "drizzle-orm";
import { gerarPdfSolicitacao, gerarPdfJustificativa } from "../pdf/gerarPedidoExame";

const router = Router();

router.get("/", async (req, res) => {
  const { pacienteId, status, medicoId } = req.query;
  let query = db.select().from(pedidosExameTable).orderBy(sql`criado_em DESC`);

  const rows = await query;
  let filtered = rows;
  if (pacienteId) filtered = filtered.filter(r => r.pacienteId === Number(pacienteId));
  if (status) filtered = filtered.filter(r => r.status === status);
  if (medicoId) filtered = filtered.filter(r => r.medicoId === Number(medicoId));

  res.json(filtered);
});

router.get("/:id", async (req, res) => {
  const rows = await db.select().from(pedidosExameTable)
    .where(eq(pedidosExameTable.id, Number(req.params.id)));
  if (rows.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });
  res.json(rows[0]);
});

router.post("/", async (req, res) => {
  const { pacienteId, medicoId, unidadeId, examesCodigos, hipoteseDiagnostica, cidPrincipal, observacaoMedica } = req.body;

  if (!pacienteId || !medicoId || !examesCodigos?.length) {
    return res.status(400).json({ error: "pacienteId, medicoId e examesCodigos sao obrigatorios" });
  }

  const examesBase = await db.select().from(examesBaseTable)
    .where(inArray(examesBaseTable.codigoExame, examesCodigos));

  const examesMap = new Map(examesBase.map(e => [e.codigoExame, e]));

  const examesPedido = examesCodigos.map((codigo: string) => {
    const base = examesMap.get(codigo);
    return {
      codigoExame: codigo,
      nomeExame: base?.nomeExame || codigo,
      blocoOficial: base?.blocoOficial || null,
      grauDoBloco: base?.grauDoBloco || null,
      corpoPedido: base?.corpoPedido || `SOLICITO ${base?.nomeExame || codigo}`,
      preparo: base?.preparo || null,
      hd: base?.hd1 || hipoteseDiagnostica || null,
      cid: base?.cid1 || cidPrincipal || null,
    };
  });

  const [pedido] = await db.insert(pedidosExameTable).values({
    pacienteId: Number(pacienteId),
    medicoId: Number(medicoId),
    unidadeId: unidadeId ? Number(unidadeId) : null,
    exames: examesPedido,
    hipoteseDiagnostica: hipoteseDiagnostica || null,
    cidPrincipal: cidPrincipal || null,
    observacaoMedica: observacaoMedica || null,
    status: "RASCUNHO",
    incluirJustificativa: false,
  }).returning();

  res.status(201).json(pedido);
});

router.get("/:id/previa-justificativas", async (req, res) => {
  const rows = await db.select().from(pedidosExameTable)
    .where(eq(pedidosExameTable.id, Number(req.params.id)));
  if (rows.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });

  const pedido = rows[0];
  const examesList = pedido.exames as Array<{ codigoExame: string; nomeExame: string }>;
  const codigos = examesList.map(e => e.codigoExame);

  const examesBase = await db.select().from(examesBaseTable)
    .where(inArray(examesBaseTable.codigoExame, codigos));

  const baseMap = new Map(examesBase.map(e => [e.codigoExame, e]));

  const previas = examesList.map(exame => {
    const base = baseMap.get(exame.codigoExame);
    return {
      codigoExame: exame.codigoExame,
      nomeExame: exame.nomeExame,
      justificativas: {
        objetiva: base?.justificativaObjetiva || "Justificativa nao disponivel",
        narrativa: base?.justificativaNarrativa || "Justificativa nao disponivel",
        robusta: base?.justificativaRobusta || "Justificativa nao disponivel",
      },
    };
  });

  res.json({ pedidoId: pedido.id, exames: previas });
});

router.post("/:id/validar", async (req, res) => {
  const { incluirJustificativa, tipoJustificativa, validadoPor, hipoteseDiagnostica, cidPrincipal } = req.body;

  const rows = await db.select().from(pedidosExameTable)
    .where(eq(pedidosExameTable.id, Number(req.params.id)));
  if (rows.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });

  if (!validadoPor) {
    return res.status(400).json({ error: "validadoPor e obrigatorio" });
  }

  const updates: Record<string, any> = {
    status: "VALIDADO",
    validadoEm: new Date(),
    validadoPor: Number(validadoPor),
    incluirJustificativa: !!incluirJustificativa,
  };

  if (incluirJustificativa && tipoJustificativa) {
    updates.tipoJustificativa = tipoJustificativa;
  }
  if (hipoteseDiagnostica) updates.hipoteseDiagnostica = hipoteseDiagnostica;
  if (cidPrincipal) updates.cidPrincipal = cidPrincipal;

  const [updated] = await db.update(pedidosExameTable)
    .set(updates)
    .where(eq(pedidosExameTable.id, Number(req.params.id)))
    .returning();

  res.json(updated);
});

router.get("/:id/pdf/solicitacao", async (req, res) => {
  try {
    const rows = await db.select().from(pedidosExameTable)
      .where(eq(pedidosExameTable.id, Number(req.params.id)));
    if (rows.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });

    const pedido = rows[0];

    const medicoRows = await db.execute(sql`SELECT nome, email FROM usuarios WHERE id = ${pedido.medicoId}`);
    const pacienteRows = await db.execute(sql`SELECT nome, cpf, data_nascimento FROM pacientes WHERE id = ${pedido.pacienteId}`);
    const unidadeRows = pedido.unidadeId
      ? await db.execute(sql`SELECT nome, endereco, cidade, estado FROM unidades WHERE id = ${pedido.unidadeId}`)
      : [];

    const medicoData = (medicoRows as any)?.[0] || {};
    const pacienteData = (pacienteRows as any)?.[0] || {};
    const unidadeData = (unidadeRows as any)?.[0] || null;

    const examesList = pedido.exames as Array<{
      nomeExame: string; corpoPedido: string; preparo: string | null; hd: string | null; cid: string | null;
    }>;

    const nomeEmpresa = unidadeData?.nome || "CLINICA INTEGRATIVA PADUA";
    const enderecoEmpresa = unidadeData
      ? `${unidadeData.endereco || ""} - ${unidadeData.cidade || ""} / ${unidadeData.estado || ""}`
      : "";

    const dataNasc = pacienteData?.data_nascimento
      ? new Date(pacienteData.data_nascimento).toLocaleDateString("pt-BR")
      : "";

    const pdfBuffer = await gerarPdfSolicitacao({
      nomeEmpresa,
      enderecoEmpresa,
      nomeMedico: medicoData?.nome || "Dr.",
      crm: "CRM-SP 000000",
      nomePaciente: pacienteData?.nome || "Paciente",
      cpfPaciente: pacienteData?.cpf || "",
      dataNascimento: dataNasc,
      exames: examesList,
      hipoteseDiagnostica: pedido.hipoteseDiagnostica,
      cidPrincipal: pedido.cidPrincipal,
      observacao: pedido.observacaoMedica,
      data: new Date().toLocaleDateString("pt-BR"),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="solicitacao_exames_${pedido.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar PDF solicitacao:", err);
    res.status(500).json({ error: "Erro ao gerar PDF", detail: err.message });
  }
});

router.get("/:id/pdf/justificativa", async (req, res) => {
  try {
  const rows = await db.select().from(pedidosExameTable)
    .where(eq(pedidosExameTable.id, Number(req.params.id)));
  if (rows.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });

  const pedido = rows[0];

  if (!pedido.incluirJustificativa) {
    return res.status(400).json({ error: "Este pedido nao inclui justificativa" });
  }

  const medicoRows = await db.execute(sql`SELECT nome FROM usuarios WHERE id = ${pedido.medicoId}`);
  const pacienteRows = await db.execute(sql`SELECT nome, cpf FROM pacientes WHERE id = ${pedido.pacienteId}`);
  const unidadeRows = pedido.unidadeId
    ? await db.execute(sql`SELECT nome, endereco, cidade, estado FROM unidades WHERE id = ${pedido.unidadeId}`)
    : [];

  const medicoData = (medicoRows as any)?.[0] || {};
  const pacienteData = (pacienteRows as any)?.[0] || {};
  const unidadeData = (unidadeRows as any)?.[0] || null;

  const examesList = pedido.exames as Array<{ codigoExame: string; nomeExame: string }>;
  const codigos = examesList.map(e => e.codigoExame);

  const examesBase = await db.select().from(examesBaseTable)
    .where(inArray(examesBaseTable.codigoExame, codigos));
  const baseMap = new Map(examesBase.map(e => [e.codigoExame, e]));

  const tipo = pedido.tipoJustificativa || "objetiva";
  const examesJust = examesList.map(exame => {
    const base = baseMap.get(exame.codigoExame);
    let just = "";
    if (tipo === "robusta") just = base?.justificativaRobusta || "";
    else if (tipo === "narrativa") just = base?.justificativaNarrativa || "";
    else just = base?.justificativaObjetiva || "";
    return { nomeExame: exame.nomeExame, justificativa: just || "Justificativa nao disponivel" };
  });

  const nomeEmpresa = unidadeData?.nome || "CLINICA INTEGRATIVA PADUA";
  const enderecoEmpresa = unidadeData
    ? `${unidadeData.endereco || ""} - ${unidadeData.cidade || ""} / ${unidadeData.estado || ""}`
    : "";

  const pdfBuffer = await gerarPdfJustificativa({
    nomeEmpresa,
    enderecoEmpresa,
    nomeMedico: medicoData?.nome || "Dr.",
    crm: "CRM-SP 000000",
    nomePaciente: pacienteData?.nome || "Paciente",
    cpfPaciente: pacienteData?.cpf || "",
    exames: examesJust,
    tipoJustificativa: tipo,
    data: new Date().toLocaleDateString("pt-BR"),
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="justificativa_exames_${pedido.id}.pdf"`);
  res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar PDF justificativa:", err);
    res.status(500).json({ error: "Erro ao gerar PDF", detail: err.message });
  }
});

export default router;
