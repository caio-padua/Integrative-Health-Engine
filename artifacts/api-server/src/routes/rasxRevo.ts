import { Router } from "express";
import { db } from "@workspace/db";
import {
  revoSnapshotsTable, revoPatologiasTable, revoCurvasTable,
  revoOrgaosTable, revoMedicamentosTable, revoEventosMedicacaoTable,
  revoProximaEtapaTable, rasxAuditLogTable,
  pacientesTable, tratamentosTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const router = Router();

router.post("/rasx/:pacienteId/revo/start", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { tratamentoId, patologias, orgaos, medicamentos, estiloVida, observacoesMedicas, resumoClinico } = req.body;

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const [snapshot] = await db.insert(revoSnapshotsTable).values({
    pacienteId,
    tratamentoId: tratamentoId || null,
    tipo: "inicial",
    patologiasDiagnosticas: patologias?.diagnosticadas || [],
    patologiasPotenciais: patologias?.potenciais || [],
    orgaosAfetados: orgaos || [],
    medicamentos: medicamentos || [],
    estiloVida: estiloVida || {},
    observacoesMedicas,
    resumoClinico,
  }).returning();

  if (patologias?.diagnosticadas?.length) {
    const patRows = patologias.diagnosticadas.map((p: any) => ({
      pacienteId,
      snapshotId: snapshot.id,
      nome: p.nome,
      cid10: p.cid10 || null,
      tipo: "diagnosticada" as const,
      orgaoSistema: p.orgaoSistema || null,
      intensidadeInicial: p.intensidade || null,
      intensidadeAtual: p.intensidade || null,
      statusSemaforo: p.semaforo || "amarelo",
      medicacaoAtual: p.medicacao || null,
      medicacaoOriginal: p.medicacao || null,
      leituraClinica: p.leituraClinica || null,
    }));
    await db.insert(revoPatologiasTable).values(patRows);
  }

  if (patologias?.potenciais?.length) {
    const potRows = patologias.potenciais.map((p: any) => ({
      pacienteId,
      snapshotId: snapshot.id,
      nome: p.nome,
      cid10: p.cid10 || null,
      tipo: "potencial" as const,
      orgaoSistema: p.orgaoSistema || null,
      intensidadeInicial: p.intensidade || "leve",
      statusSemaforo: p.semaforo || "amarelo",
      leituraClinica: p.leituraClinica || null,
    }));
    await db.insert(revoPatologiasTable).values(potRows);
  }

  if (orgaos?.length) {
    const orgRows = orgaos.map((o: any) => ({
      pacienteId,
      snapshotId: snapshot.id,
      orgaoSistema: o.orgaoSistema,
      intensidade: o.intensidade || "moderada",
      riscoPrognostico: o.riscoPrognostico || "moderado",
      patologiasRelacionadas: o.patologias || [],
      observacao: o.observacao || null,
    }));
    await db.insert(revoOrgaosTable).values(orgRows);
  }

  if (medicamentos?.length) {
    const medRows = medicamentos.map((m: any) => ({
      pacienteId,
      nome: m.nome,
      dose: m.dose || null,
      motivoUso: m.motivoUso || null,
      tempoUso: m.tempoUso || null,
      statusAtual: "em_uso" as const,
      criterioReducao: m.criterioReducao || null,
    }));
    await db.insert(revoMedicamentosTable).values(medRows);
  }

  const curvasIniciais = [
    { pacienteId, tipoCurva: "doenca" as const, indicador: "inflamacao_sistemica", valor: 70 },
    { pacienteId, tipoCurva: "doenca" as const, indicador: "dependencia_medicamentosa", valor: 60 },
    { pacienteId, tipoCurva: "doenca" as const, indicador: "intensidade_sintomatica", valor: 65 },
    { pacienteId, tipoCurva: "saude" as const, indicador: "saude_funcional", valor: 30 },
    { pacienteId, tipoCurva: "saude" as const, indicador: "resposta_organica", valor: 35 },
    { pacienteId, tipoCurva: "saude" as const, indicador: "bem_estar_vitalidade", valor: 25 },
  ];
  await db.insert(revoCurvasTable).values(curvasIniciais);

  res.status(201).json({
    snapshot,
    mensagem: "REVO START criado com sucesso — snapshot inicial registrado",
  });
});

router.get("/rasx/:pacienteId/revo/master", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const snapshots = await db.select().from(revoSnapshotsTable)
    .where(eq(revoSnapshotsTable.pacienteId, pacienteId))
    .orderBy(desc(revoSnapshotsTable.dataSnapshot));

  const patologias = await db.select().from(revoPatologiasTable)
    .where(eq(revoPatologiasTable.pacienteId, pacienteId))
    .orderBy(revoPatologiasTable.nome);

  const orgaos = await db.select().from(revoOrgaosTable)
    .where(eq(revoOrgaosTable.pacienteId, pacienteId));

  const medicamentos = await db.select().from(revoMedicamentosTable)
    .where(eq(revoMedicamentosTable.pacienteId, pacienteId));

  const curvas = await db.select().from(revoCurvasTable)
    .where(eq(revoCurvasTable.pacienteId, pacienteId))
    .orderBy(asc(revoCurvasTable.dataRegistro));

  const eventosMedicacao = await db.select().from(revoEventosMedicacaoTable)
    .where(eq(revoEventosMedicacaoTable.pacienteId, pacienteId))
    .orderBy(asc(revoEventosMedicacaoTable.data));

  const proximasEtapas = await db.select().from(revoProximaEtapaTable)
    .where(eq(revoProximaEtapaTable.pacienteId, pacienteId))
    .orderBy(asc(revoProximaEtapaTable.dataPrevista));

  const snapshotInicial = snapshots.find(s => s.tipo === "inicial") || null;
  const snapshotAtual = snapshots.find(s => s.tipo === "atual") || snapshotInicial;

  const curvaDoenca = curvas.filter(c => c.tipoCurva === "doenca");
  const curvaSaude = curvas.filter(c => c.tipoCurva === "saude");

  res.json({
    paciente: { id: paciente.id, nome: paciente.nome, cpf: paciente.cpf },
    snapshots,
    snapshotInicial,
    snapshotAtual,
    patologias: {
      diagnosticadas: patologias.filter(p => p.tipo === "diagnosticada"),
      potenciais: patologias.filter(p => p.tipo === "potencial"),
      remissao: patologias.filter(p => p.tipo === "remissao"),
      resolvidas: patologias.filter(p => p.tipo === "resolvida"),
      total: patologias.length,
    },
    orgaos,
    medicamentos,
    eventosMedicacao,
    proximasEtapas,
    curvas: { doenca: curvaDoenca, saude: curvaSaude },
    temRevo: snapshots.length > 0,
    versao: "V5",
  });
});

router.post("/rasx/:pacienteId/revo/update", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { patologiasUpdate, medicamentosUpdate, curvasUpdate, observacoesMedicas, resumoClinico } = req.body;

  const [snapshotAtual] = await db.insert(revoSnapshotsTable).values({
    pacienteId,
    tipo: "atual",
    observacoesMedicas,
    resumoClinico,
  }).returning();

  if (patologiasUpdate?.length) {
    for (const p of patologiasUpdate) {
      if (p.id) {
        await db.update(revoPatologiasTable)
          .set({
            intensidadeAtual: p.intensidadeAtual,
            evolucaoPercentual: p.evolucaoPercentual,
            statusSemaforo: p.statusSemaforo,
            medicacaoAtual: p.medicacaoAtual,
            substituicaoNatural: p.substituicaoNatural,
            leituraClinica: p.leituraClinica,
            dataUltimaAvaliacao: new Date(),
          })
          .where(eq(revoPatologiasTable.id, p.id));
      }
    }
  }

  if (medicamentosUpdate?.length) {
    for (const m of medicamentosUpdate) {
      if (m.id) {
        await db.update(revoMedicamentosTable)
          .set({
            statusAtual: m.statusAtual,
            substituicaoNatural: m.substituicaoNatural,
            evidenciaMelhora: m.evidenciaMelhora,
          })
          .where(eq(revoMedicamentosTable.id, m.id));
      }
    }
  }

  if (curvasUpdate?.length) {
    const curvaRows = curvasUpdate.map((c: any) => ({
      pacienteId,
      tipoCurva: c.tipoCurva,
      indicador: c.indicador,
      valor: c.valor,
      observacao: c.observacao || null,
    }));
    await db.insert(revoCurvasTable).values(curvaRows);
  }

  res.json({
    snapshot: snapshotAtual,
    mensagem: "Estado atual atualizado com sucesso",
  });
});

router.post("/rasx/:pacienteId/revo/patologia", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [patologia] = await db.insert(revoPatologiasTable).values({
    pacienteId,
    ...req.body,
  }).returning();

  res.status(201).json(patologia);
});

router.put("/rasx/revo/patologia/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [updated] = await db.update(revoPatologiasTable)
    .set({ ...req.body, dataUltimaAvaliacao: new Date() })
    .where(eq(revoPatologiasTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Patologia nao encontrada" }); return; }
  res.json(updated);
});

router.delete("/rasx/revo/patologia/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  await db.delete(revoPatologiasTable).where(eq(revoPatologiasTable.id, id));
  res.json({ ok: true });
});

router.post("/rasx/:pacienteId/revo/medicamento", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [med] = await db.insert(revoMedicamentosTable).values({
    pacienteId,
    ...req.body,
  }).returning();

  res.status(201).json(med);
});

router.put("/rasx/revo/medicamento/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [updated] = await db.update(revoMedicamentosTable)
    .set(req.body)
    .where(eq(revoMedicamentosTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Medicamento nao encontrado" }); return; }
  res.json(updated);
});

router.delete("/rasx/revo/medicamento/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  await db.delete(revoMedicamentosTable).where(eq(revoMedicamentosTable.id, id));
  res.json({ ok: true });
});

router.post("/rasx/:pacienteId/revo/curva", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [curva] = await db.insert(revoCurvasTable).values({
    pacienteId,
    ...req.body,
  }).returning();

  res.status(201).json(curva);
});

router.post("/rasx/:pacienteId/revo/orgao", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [orgao] = await db.insert(revoOrgaosTable).values({
    pacienteId,
    ...req.body,
  }).returning();

  res.status(201).json(orgao);
});

router.put("/rasx/revo/orgao/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [updated] = await db.update(revoOrgaosTable)
    .set(req.body)
    .where(eq(revoOrgaosTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Orgao nao encontrado" }); return; }
  res.json(updated);
});

router.delete("/rasx/revo/orgao/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  await db.delete(revoOrgaosTable).where(eq(revoOrgaosTable.id, id));
  res.json({ ok: true });
});

router.post("/rasx/:pacienteId/revo/manual-override", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { campo, entidadeId, entidadeTipo, novoValor, justificativa } = req.body;

  if (!campo || !entidadeId || !entidadeTipo) {
    res.status(400).json({ error: "campo, entidadeId e entidadeTipo sao obrigatorios" });
    return;
  }

  const tabelas: Record<string, any> = {
    patologia: revoPatologiasTable,
    medicamento: revoMedicamentosTable,
    orgao: revoOrgaosTable,
  };

  const tabela = tabelas[entidadeTipo];
  if (!tabela) {
    res.status(400).json({ error: "entidadeTipo invalido. Use: patologia, medicamento, orgao" });
    return;
  }

  const [original] = await db.select().from(tabela).where(eq(tabela.id, entidadeId));
  const valorAnterior = original ? String((original as any)[campo] || "") : "";

  const [updated] = await db.update(tabela)
    .set({ [campo]: novoValor })
    .where(eq(tabela.id, entidadeId))
    .returning();

  await db.insert(rasxAuditLogTable).values({
    pacienteId,
    entidade: entidadeTipo,
    entidadeId,
    acao: "override",
    campo,
    valorAnterior,
    valorNovo: String(novoValor),
    justificativa: justificativa || null,
  });

  res.json({
    atualizado: updated,
    override: { campo, valor: novoValor, justificativa, executadoEm: new Date().toISOString() },
  });
});

export default router;
