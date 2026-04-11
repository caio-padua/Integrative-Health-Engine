import { Router } from "express";
import {
  db, auditoriaCascataTable, cascataValidacaoConfigTable, usuariosTable,
  formatarAcaoAuditoria, eventosClinicosTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/auditoria-cascata", async (req, res): Promise<void> => {
  const { etapa, acao, limite } = req.query;
  const limit = limite ? parseInt(limite as string, 10) : 50;

  const conditions: any[] = [];
  if (etapa) conditions.push(eq(auditoriaCascataTable.etapa, String(etapa) as any));
  if (acao) conditions.push(eq(auditoriaCascataTable.acao, String(acao) as any));

  const registros = await db
    .select({
      id: auditoriaCascataTable.id,
      acao: auditoriaCascataTable.acao,
      etapa: auditoriaCascataTable.etapa,
      valorAnterior: auditoriaCascataTable.valorAnterior,
      valorNovo: auditoriaCascataTable.valorNovo,
      realizadoPorId: auditoriaCascataTable.realizadoPorId,
      usuarioNome: usuariosTable.nome,
      motivo: auditoriaCascataTable.motivo,
      realizadoEm: auditoriaCascataTable.realizadoEm,
    })
    .from(auditoriaCascataTable)
    .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditoriaCascataTable.realizadoEm))
    .limit(limit);

  const resultado = registros.map(r => ({
    ...r,
    acaoFormatada: formatarAcaoAuditoria(r as any),
  }));

  res.json(resultado);
});

router.post("/auditoria-cascata/toggle", async (req, res): Promise<void> => {
  const { etapa, novoValor, realizadoPorId, motivo } = req.body;

  if (!etapa || novoValor === undefined || !realizadoPorId) {
    res.status(400).json({ error: "etapa, novoValor e realizadoPorId sao obrigatorios" });
    return;
  }

  const [diretor] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, realizadoPorId), eq(usuariosTable.perfil, "validador_mestre")));

  if (!diretor) {
    res.status(403).json({ error: "Apenas validador_mestre pode alterar a cascata" });
    return;
  }

  const [configAtual] = await db.select().from(cascataValidacaoConfigTable).limit(1);

  const campoMap: Record<string, string> = {
    ENFERMEIRA03: "requerEnfermeira03",
    CONSULTOR03: "requerConsultor03",
    MEDICO03: "requerMedico03",
    MEDICO_SENIOR: "requerMedicoSenior",
  };

  const campo = campoMap[etapa];
  if (!campo) {
    res.status(400).json({ error: "etapa invalida" });
    return;
  }

  const valorAnterior = configAtual ? (configAtual as any)[campo] : null;

  if (configAtual) {
    await db
      .update(cascataValidacaoConfigTable)
      .set({ [campo]: novoValor, atualizadoPorId: realizadoPorId })
      .where(eq(cascataValidacaoConfigTable.id, configAtual.id));
  }

  const [auditoria] = await db
    .insert(auditoriaCascataTable)
    .values({
      acao: novoValor ? "LIGOU" : "DESLIGOU",
      etapa,
      valorAnterior,
      valorNovo: novoValor,
      realizadoPorId,
      motivo,
    })
    .returning();

  await db.insert(eventosClinicosTable).values({
    tipo: "CASCATA_ALTERADA" as any,
    descricao: `${novoValor ? "LIGOU" : "DESLIGOU"} ${etapa} — Motivo: ${motivo || "nao informado"}`,
    usuarioId: realizadoPorId,
  });

  res.status(201).json({ auditoria, mensagem: `${novoValor ? "LIGOU" : "DESLIGOU"} ${etapa}` });
});

router.get("/auditoria-cascata/stats", async (_req, res): Promise<void> => {
  const porAcao = await db
    .select({ acao: auditoriaCascataTable.acao, total: sql<number>`count(*)` })
    .from(auditoriaCascataTable)
    .groupBy(auditoriaCascataTable.acao);

  const porEtapa = await db
    .select({ etapa: auditoriaCascataTable.etapa, total: sql<number>`count(*)` })
    .from(auditoriaCascataTable)
    .groupBy(auditoriaCascataTable.etapa);

  const [ultima] = await db
    .select({
      acao: auditoriaCascataTable.acao,
      etapa: auditoriaCascataTable.etapa,
      usuarioNome: usuariosTable.nome,
      realizadoEm: auditoriaCascataTable.realizadoEm,
    })
    .from(auditoriaCascataTable)
    .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
    .orderBy(desc(auditoriaCascataTable.realizadoEm))
    .limit(1);

  res.json({ porAcao, porEtapa, ultimaAlteracao: ultima ?? null });
});

export default router;
