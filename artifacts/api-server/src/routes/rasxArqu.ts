import { Router } from "express";
import { db } from "@workspace/db";
import {
  revoSnapshotsTable, revoPatologiasTable, revoCurvasTable,
  revoOrgaosTable, revoMedicamentosTable, revoEventosMedicacaoTable,
  rasxAuditLogTable, revoProximaEtapaTable,
  pacientesTable, tratamentosTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { gerarRasxPdf } from "../pdf/rasxPdf";
import crypto from "crypto";

const router = Router();

async function gravarAudit(params: {
  pacienteId?: number; userId?: number; entidade: string; entidadeId?: number;
  acao: "criar" | "editar" | "excluir" | "override" | "gerar_pdf" | "validar";
  campo?: string; valorAnterior?: string; valorNovo?: string; justificativa?: string;
  metadados?: any;
}) {
  await db.insert(rasxAuditLogTable).values({
    pacienteId: params.pacienteId || null,
    userId: params.userId || null,
    entidade: params.entidade,
    entidadeId: params.entidadeId || null,
    acao: params.acao,
    campo: params.campo || null,
    valorAnterior: params.valorAnterior || null,
    valorNovo: params.valorNovo || null,
    justificativa: params.justificativa || null,
    metadados: params.metadados || {},
  });
}

router.post("/rasx/:pacienteId/evento-medicacao", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { medicamentoId, data, apresentacao, posologia, status, substituicaoNatural, leituraClinica } = req.body;
  if (!medicamentoId || !apresentacao) {
    res.status(400).json({ error: "medicamentoId e apresentacao sao obrigatorios" });
    return;
  }

  const [evento] = await db.insert(revoEventosMedicacaoTable).values({
    medicamentoId: Number(medicamentoId),
    pacienteId,
    data: data ? new Date(data) : new Date(),
    apresentacao,
    posologia: posologia || null,
    status: status || "ATIVO",
    substituicaoNatural: substituicaoNatural || null,
    leituraClinica: leituraClinica || null,
  }).returning();

  await gravarAudit({
    pacienteId, entidade: "evento_medicacao", entidadeId: evento.id, acao: "criar",
    valorNovo: `${apresentacao} - ${status}`,
  });

  res.status(201).json(evento);
});

router.get("/rasx/:pacienteId/eventos-medicacao", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const eventos = await db.select().from(revoEventosMedicacaoTable)
    .where(eq(revoEventosMedicacaoTable.pacienteId, pacienteId))
    .orderBy(asc(revoEventosMedicacaoTable.data));

  res.json(eventos);
});

router.get("/rasx/:pacienteId/eventos-medicacao/:medicamentoId", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  const medicamentoId = Number(req.params.medicamentoId);

  const eventos = await db.select().from(revoEventosMedicacaoTable)
    .where(and(
      eq(revoEventosMedicacaoTable.pacienteId, pacienteId),
      eq(revoEventosMedicacaoTable.medicamentoId, medicamentoId),
    ))
    .orderBy(asc(revoEventosMedicacaoTable.data));

  res.json(eventos);
});

router.put("/rasx/evento-medicacao/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const allowedFields = ["data", "apresentacao", "posologia", "status", "substituicaoNatural", "leituraClinica"];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nenhum campo valido" }); return; }

  const [updated] = await db.update(revoEventosMedicacaoTable)
    .set(updates)
    .where(eq(revoEventosMedicacaoTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Evento nao encontrado" }); return; }

  await gravarAudit({
    pacienteId: updated.pacienteId, entidade: "evento_medicacao", entidadeId: id, acao: "editar",
    valorNovo: JSON.stringify(req.body),
  });

  res.json(updated);
});

router.delete("/rasx/evento-medicacao/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [deleted] = await db.delete(revoEventosMedicacaoTable)
    .where(eq(revoEventosMedicacaoTable.id, id))
    .returning();

  if (deleted) {
    await gravarAudit({
      pacienteId: deleted.pacienteId, entidade: "evento_medicacao", entidadeId: id, acao: "excluir",
      valorAnterior: deleted.apresentacao,
    });
  }

  res.json({ ok: true });
});

router.post("/rasx/:pacienteId/proxima-etapa", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { tipo, descricao, dataPrevista, prioridade } = req.body;
  if (!tipo || !descricao) {
    res.status(400).json({ error: "tipo e descricao sao obrigatorios" });
    return;
  }

  const [etapa] = await db.insert(revoProximaEtapaTable).values({
    pacienteId,
    tipo,
    descricao,
    dataPrevista: dataPrevista ? new Date(dataPrevista) : null,
    prioridade: prioridade || "media",
  }).returning();

  await gravarAudit({ pacienteId, entidade: "proxima_etapa", entidadeId: etapa.id, acao: "criar", valorNovo: descricao });

  res.status(201).json(etapa);
});

router.get("/rasx/:pacienteId/proximas-etapas", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const etapas = await db.select().from(revoProximaEtapaTable)
    .where(eq(revoProximaEtapaTable.pacienteId, pacienteId))
    .orderBy(asc(revoProximaEtapaTable.dataPrevista));

  res.json(etapas);
});

router.put("/rasx/proxima-etapa/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const allowedFields = ["tipo", "descricao", "dataPrevista", "prioridade"];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nenhum campo valido" }); return; }

  const [updated] = await db.update(revoProximaEtapaTable)
    .set(updates)
    .where(eq(revoProximaEtapaTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Etapa nao encontrada" }); return; }
  res.json(updated);
});

router.put("/rasx/proxima-etapa/:id/concluir", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [updated] = await db.update(revoProximaEtapaTable)
    .set({ concluido: true, concluidoEm: new Date() })
    .where(eq(revoProximaEtapaTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Etapa nao encontrada" }); return; }
  await gravarAudit({ pacienteId: updated.pacienteId, entidade: "proxima_etapa", entidadeId: id, acao: "validar" });
  res.json(updated);
});

router.delete("/rasx/proxima-etapa/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(revoProximaEtapaTable).where(eq(revoProximaEtapaTable.id, id));
  res.json({ ok: true });
});

router.get("/rasx/:pacienteId/audit-log", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const logs = await db.select().from(rasxAuditLogTable)
    .where(eq(rasxAuditLogTable.pacienteId, pacienteId))
    .orderBy(desc(rasxAuditLogTable.criadoEm))
    .limit(200);

  res.json(logs);
});

router.get("/rasx/:pacienteId/arqu/documental", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const snapshots = await db.select().from(revoSnapshotsTable)
    .where(eq(revoSnapshotsTable.pacienteId, pacienteId));
  const patologias = await db.select().from(revoPatologiasTable)
    .where(eq(revoPatologiasTable.pacienteId, pacienteId));
  const orgaos = await db.select().from(revoOrgaosTable)
    .where(eq(revoOrgaosTable.pacienteId, pacienteId));
  const medicamentos = await db.select().from(revoMedicamentosTable)
    .where(eq(revoMedicamentosTable.pacienteId, pacienteId));
  const eventos = await db.select().from(revoEventosMedicacaoTable)
    .where(eq(revoEventosMedicacaoTable.pacienteId, pacienteId));
  const curvas = await db.select().from(revoCurvasTable)
    .where(eq(revoCurvasTable.pacienteId, pacienteId));
  const etapas = await db.select().from(revoProximaEtapaTable)
    .where(eq(revoProximaEtapaTable.pacienteId, pacienteId));

  const cadernos = [
    { codigo: "RACL HEST", titulo: "Estado Inicial de Saude", orientacao: "retrato", obrigatorio: true, presente: snapshots.some(s => s.tipo === "inicial") },
    { codigo: "RACL HPOT", titulo: "Patologias Potenciais", orientacao: "retrato", obrigatorio: true, presente: patologias.some(p => p.tipo === "potencial") },
    { codigo: "RACL HORG", titulo: "Orgaos e Sistemas Afetados", orientacao: "paisagem", obrigatorio: true, presente: orgaos.length > 0 },
    { codigo: "RACL HMED", titulo: "Medicamentos em Uso", orientacao: "paisagem", obrigatorio: true, presente: medicamentos.length > 0 },
    { codigo: "RACL HLIN", titulo: "Linha Temporal de Medicacao", orientacao: "paisagem", obrigatorio: true, presente: eventos.length > 0 },
    { codigo: "RACL HTRN", titulo: "Transicao Terapeutica", orientacao: "paisagem", obrigatorio: true, presente: medicamentos.some(m => m.substituicaoNatural) },
    { codigo: "RACL HEVO", titulo: "Evolucao Clinica Comparativa", orientacao: "paisagem", obrigatorio: true, presente: patologias.length > 0 },
    { codigo: "RACL HCUR", titulo: "Curvas Declinante e Ascendente", orientacao: "paisagem", obrigatorio: true, presente: curvas.length > 0 },
    { codigo: "RACL HATU", titulo: "Estado Atual de Saude", orientacao: "retrato", obrigatorio: true, presente: snapshots.some(s => s.tipo === "atual") || snapshots.length > 0 },
    { codigo: "RACL HPLA", titulo: "Proxima Etapa", orientacao: "retrato", obrigatorio: false, presente: etapas.length > 0 },
  ];

  res.json({
    pacienteId,
    temRevo: snapshots.length > 0,
    totalSnapshots: snapshots.length,
    totalPatologias: patologias.length,
    totalMedicamentos: medicamentos.length,
    totalEventosMedicacao: eventos.length,
    totalOrgaos: orgaos.length,
    totalCurvas: curvas.length,
    totalEtapas: etapas.length,
    cadernos,
    prontosParaPdf: cadernos.filter(c => c.presente).length,
    totalCadernos: cadernos.length,
    versao: "V5",
  });
});

router.get("/rasx/:pacienteId/arqu/pdf", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const snapshots = await db.select().from(revoSnapshotsTable)
    .where(eq(revoSnapshotsTable.pacienteId, pacienteId))
    .orderBy(desc(revoSnapshotsTable.dataSnapshot));
  const patologias = await db.select().from(revoPatologiasTable)
    .where(eq(revoPatologiasTable.pacienteId, pacienteId));
  const orgaos = await db.select().from(revoOrgaosTable)
    .where(eq(revoOrgaosTable.pacienteId, pacienteId));
  const medicamentos = await db.select().from(revoMedicamentosTable)
    .where(eq(revoMedicamentosTable.pacienteId, pacienteId));
  const eventos = await db.select().from(revoEventosMedicacaoTable)
    .where(eq(revoEventosMedicacaoTable.pacienteId, pacienteId))
    .orderBy(asc(revoEventosMedicacaoTable.data));
  const curvas = await db.select().from(revoCurvasTable)
    .where(eq(revoCurvasTable.pacienteId, pacienteId))
    .orderBy(asc(revoCurvasTable.dataRegistro));
  const etapas = await db.select().from(revoProximaEtapaTable)
    .where(eq(revoProximaEtapaTable.pacienteId, pacienteId));

  const snapshotInicial = snapshots.find(s => s.tipo === "inicial") || null;
  const snapshotAtual = snapshots.find(s => s.tipo === "atual") || snapshotInicial;

  const pdfData = {
    paciente: { nome: paciente.nome, cpf: paciente.cpf || undefined, dataNascimento: (paciente as any).dataNascimento?.toISOString?.() || undefined },
    medico: "Dr. Caio Henrique Fernandes Padua",
    unidade: "Instituto Padua",
    dataBase: new Date().toLocaleDateString("pt-BR"),
    snapshotInicial,
    snapshotAtual,
    patologias: {
      diagnosticadas: patologias.filter(p => p.tipo === "diagnosticada"),
      potenciais: patologias.filter(p => p.tipo === "potencial"),
    },
    orgaos,
    medicamentos,
    eventosMedicacao: eventos,
    curvas: {
      doenca: curvas.filter(c => c.tipoCurva === "doenca"),
      saude: curvas.filter(c => c.tipoCurva === "saude"),
    },
    proximasEtapas: etapas,
  };

  const pdfStream = gerarRasxPdf(pdfData);

  const hashData = JSON.stringify({ pacienteId, ts: Date.now(), patologias: patologias.length, meds: medicamentos.length });
  const hash = crypto.createHash("sha256").update(hashData).digest("hex").slice(0, 16);

  await gravarAudit({
    pacienteId, entidade: "rasx_pdf", acao: "gerar_pdf",
    hashDocumental: hash,
    metadados: { cadernos: 10, patologias: patologias.length, medicamentos: medicamentos.length },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="RASX_${paciente.nome.replace(/\s+/g, "_")}_${hash}.pdf"`);
  pdfStream.pipe(res);
});

router.post("/rasx/:pacienteId/auto-populate", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const existingSnaps = await db.select().from(revoSnapshotsTable)
    .where(eq(revoSnapshotsTable.pacienteId, pacienteId));
  if (existingSnaps.length > 0) {
    res.status(409).json({ error: "REVO ja iniciado para este paciente. Use /revo/update para atualizar." });
    return;
  }

  const { patologias, medicamentos, orgaos, observacoesMedicas, resumoClinico, fonte } = req.body;

  const [snapshot] = await db.insert(revoSnapshotsTable).values({
    pacienteId,
    tipo: "inicial",
    patologiasDiagnosticas: patologias?.diagnosticadas || [],
    patologiasPotenciais: patologias?.potenciais || [],
    orgaosAfetados: orgaos || [],
    medicamentos: medicamentos || [],
    observacoesMedicas: observacoesMedicas || null,
    resumoClinico: resumoClinico || null,
    origem: fonte || "ANAMNESE_AUTO",
  }).returning();

  let patCount = 0;
  if (patologias?.diagnosticadas?.length) {
    const rows = patologias.diagnosticadas.map((p: any) => ({
      pacienteId, snapshotId: snapshot.id, nome: p.nome,
      cid10: p.cid10 || null, tipo: "diagnosticada" as const,
      orgaoSistema: p.orgaoSistema || null,
      intensidadeInicial: p.intensidade || "moderada",
      intensidadeAtual: p.intensidade || "moderada",
      statusSemaforo: p.semaforo || "amarelo",
      medicacaoAtual: p.medicacao || null,
      medicacaoOriginal: p.medicacao || null,
      leituraClinica: p.leituraClinica || null,
    }));
    await db.insert(revoPatologiasTable).values(rows);
    patCount += rows.length;
  }

  let medCount = 0;
  if (medicamentos?.length) {
    for (const m of medicamentos) {
      const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
      const [med] = await db.insert(revoMedicamentosTable).values({
        pacienteId, nome: m.nome, dose: m.dose || null,
        medicamentoDoseInline: inline,
        posologia: m.posologia || null,
        motivoUso: m.motivoUso || null,
        tempoUso: m.tempoUso || null,
        statusAtual: "em_uso",
        dataInicioUso: m.dataInicioUso ? new Date(m.dataInicioUso) : new Date(),
        indicacaoClinica: m.indicacaoClinica || null,
      }).returning();

      await db.insert(revoEventosMedicacaoTable).values({
        medicamentoId: med.id, pacienteId,
        data: m.dataInicioUso ? new Date(m.dataInicioUso) : new Date(),
        apresentacao: inline,
        posologia: m.posologia || null,
        status: "ATIVO",
        leituraClinica: m.leituraClinica || "Uso ativo no inicio do tratamento.",
      });
      medCount++;
    }
  }

  if (orgaos?.length) {
    const rows = orgaos.map((o: any) => ({
      pacienteId, snapshotId: snapshot.id,
      orgaoSistema: o.orgaoSistema, intensidade: o.intensidade || "moderada",
      riscoPrognostico: o.riscoPrognostico || "moderado",
      patologiasRelacionadas: o.patologias || [],
      observacao: o.observacao || null,
    }));
    await db.insert(revoOrgaosTable).values(rows);
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

  await gravarAudit({
    pacienteId, entidade: "revo_auto_populate", acao: "criar",
    metadados: { fonte: fonte || "ANAMNESE_AUTO", patologias: patCount, medicamentos: medCount },
  });

  res.status(201).json({
    snapshot,
    mensagem: `REVO auto-populado: ${patCount} patologias, ${medCount} medicamentos, 6 curvas iniciais`,
    fonte: fonte || "ANAMNESE_AUTO",
  });
});

export { gravarAudit };
export default router;
