import { Router } from "express";
import { db } from "@workspace/db";
import {
  rasTable, insertRasSchema, sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, usuariosTable, unidadesTable,
  codigosValidacaoTable, insertCodigoValidacaoSchema,
  estoqueItensTable, insertEstoqueItemSchema,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/ras", async (req, res) => {
  const { pacienteId, protocoloId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(rasTable.pacienteId, Number(pacienteId)));
  if (protocoloId) conditions.push(eq(rasTable.protocoloId, Number(protocoloId)));

  const result = await db
    .select()
    .from(rasTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(rasTable.criadoEm));

  res.json(result);
});

router.post("/ras", async (req, res) => {
  const { sessaoId, observacoes } = req.body;
  if (!sessaoId) { res.status(400).json({ error: "sessaoId obrigatorio" }); return; }

  const [sessao] = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      profissionalNome: usuariosTable.nome,
      profissionalCrm: usuariosTable.crm,
      unidadeNome: unidadesTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .where(eq(sessoesTable.id, Number(sessaoId)));

  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const aplicacoes = await db
    .select({
      aplicacao: aplicacoesSubstanciasTable,
      substanciaNome: substanciasTable.nome,
    })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(sessaoId)));

  const substanciasRas = aplicacoes.map(a => ({
    substanciaNome: a.substanciaNome,
    dose: a.aplicacao.dose,
    numeroSessao: a.aplicacao.numeroSessao,
    totalSessoes: a.aplicacao.totalSessoes,
    status: a.aplicacao.status,
  }));

  const [created] = await db.insert(rasTable).values({
    sessaoId: Number(sessaoId),
    protocoloId: sessao.sessao.protocoloId,
    pacienteId: sessao.sessao.pacienteId,
    nomePaciente: sessao.pacienteNome || "N/A",
    cpfPaciente: sessao.pacienteCpf || "N/A",
    nomeProfissional: sessao.profissionalNome || "N/A",
    crmProfissional: sessao.profissionalCrm,
    unidade: sessao.unidadeNome || "N/A",
    dataServico: sessao.sessao.dataAgendada,
    tipoServico: sessao.sessao.tipoServico,
    substancias: substanciasRas,
    observacoes: observacoes || null,
  }).returning();

  res.status(201).json(created);
});

router.get("/ras/:id", async (req, res) => {
  const [ras] = await db.select().from(rasTable).where(eq(rasTable.id, Number(req.params.id)));
  if (!ras) { res.status(404).json({ error: "RAS nao encontrado" }); return; }
  res.json(ras);
});

function gerarCodigo6(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.post("/codigos-validacao", async (req, res) => {
  const { sessaoId, pacienteId } = req.body;
  if (!sessaoId || !pacienteId) {
    res.status(400).json({ error: "sessaoId e pacienteId obrigatorios" });
    return;
  }
  const codigo = gerarCodigo6();
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000);

  const [created] = await db.insert(codigosValidacaoTable).values({
    sessaoId: Number(sessaoId),
    pacienteId: Number(pacienteId),
    codigo,
    expiraEm,
  }).returning();

  res.status(201).json(created);
});

router.post("/codigos-validacao/verificar", async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) { res.status(400).json({ error: "Codigo obrigatorio" }); return; }

  const [found] = await db
    .select()
    .from(codigosValidacaoTable)
    .where(eq(codigosValidacaoTable.codigo, String(codigo).toUpperCase()));

  if (!found) { res.status(404).json({ error: "Codigo nao encontrado", valido: false }); return; }
  if (found.usado) { res.status(400).json({ error: "Codigo ja utilizado", valido: false }); return; }
  if (new Date() > found.expiraEm) { res.status(400).json({ error: "Codigo expirado", valido: false }); return; }

  await db.update(codigosValidacaoTable).set({ usado: true, usadoEm: new Date() }).where(eq(codigosValidacaoTable.id, found.id));

  res.json({ valido: true, sessaoId: found.sessaoId, pacienteId: found.pacienteId });
});

router.get("/codigos-validacao", async (req, res) => {
  const { sessaoId } = req.query;
  const conditions: any[] = [];
  if (sessaoId) conditions.push(eq(codigosValidacaoTable.sessaoId, Number(sessaoId)));
  const result = await db.select().from(codigosValidacaoTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(codigosValidacaoTable.criadoEm));
  res.json(result);
});

router.get("/estoque", async (req, res) => {
  const result = await db
    .select({
      item: estoqueItensTable,
      substanciaNome: substanciasTable.nome,
      substanciaCor: substanciasTable.cor,
    })
    .from(estoqueItensTable)
    .leftJoin(substanciasTable, eq(estoqueItensTable.substanciaId, substanciasTable.id));
  res.json(result);
});

router.post("/estoque", async (req, res) => {
  const parsed = insertEstoqueItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(estoqueItensTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.put("/estoque/:id", async (req, res) => {
  const [updated] = await db.update(estoqueItensTable).set(req.body).where(eq(estoqueItensTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Item nao encontrado" }); return; }
  res.json(updated);
});

export default router;
