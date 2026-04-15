import { Router } from "express";
import { db } from "@workspace/db";
import {
  revoSnapshotsTable, revoPatologiasTable, revoCurvasTable,
  revoOrgaosTable, revoMedicamentosTable, revoEventosMedicacaoTable,
  rasxAuditLogTable, revoProximaEtapaTable,
  pacientesTable, tratamentosTable, termosJuridicosTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { gerarRasxPdf, gerarRacjPdf, RAS_CATEGORIAS, type RasCategoria } from "../pdf/rasxPdf";
import {
  gerarFichaCadastroPdf, gerarReceitaPdf, gerarAtestadoPdf, gerarContratoPdf,
  gerarOrcamentoFinanceiroPdf, gerarLaudoExamePdf, gerarRelatorioPatologiasPdf,
  gerarTermoConsentimentoPdf,
} from "../pdf/docsPdf";
import { gerarMotorPdf, gerarMotorPdfConsolidado, setTermosDB } from "../pdf/rasxMotorPdf";
import { sendEmailWithPdf } from "../lib/google-gmail.js";
import { getOrCreateClientFolder, uploadToClientSubfolder } from "../lib/google-drive.js";
import { buildEmail, buildWhatsappFormal, type EmailOpts } from "../lib/email-templates";
import crypto from "crypto";
import {
  BlocoRAS, EventoRAS, type PayloadRAS, type LogRAS,
  resolverEvento, resolverClasseProcedimento, resolverBloco,
  resolverBlocosDoEvento, resolverSubgrupos, resolverConsentimento,
  resolverPastaDestino, resolverPastasDestino,
  montarPayloadRAS, gerarNomeArquivoRAS, gerarHashDocumental,
  buildLogRAS, getArquiteturaCompleta,
  BLOCO_LABELS, EVENTO_PIPELINE, CLASSE_LABELS, SUBGRUPO_LABELS,
} from "../lib/rasxEngine";

const VALID_EVENTOS = ["START", "POS_PROCEDIMENTO", "CONSULTA_MENSAL", "REVISAO_SEMESTRAL", "SOLICITACAO_JURIDICA", "SOLICITACAO_FINANCEIRA", "FECHAMENTO_LAUDO"] as const;
const VALID_CLASSES = ["FORM", "INJM", "INJV", "IMPL", "ESTI", "ESTT"] as const;

function validateMotorBody(body: any): { ok: true; data: { evento: string; classeProcedimento?: string; blocos?: string | string[]; drive?: boolean; email?: boolean | string; whatsapp?: boolean | string } } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") return { ok: false, errors: ["Body deve ser um objeto JSON"] };
  if (!body.evento || typeof body.evento !== "string") { errors.push("'evento' e obrigatorio (string)"); }
  else if (!(VALID_EVENTOS as readonly string[]).includes(body.evento)) { errors.push(`'evento' invalido. Opcoes: ${VALID_EVENTOS.join(", ")}`); }
  if (body.classeProcedimento !== undefined && !(VALID_CLASSES as readonly string[]).includes(body.classeProcedimento)) { errors.push(`'classeProcedimento' invalido. Opcoes: ${VALID_CLASSES.join(", ")}`); }
  if (body.blocos !== undefined) {
    if (typeof body.blocos === "string") { /* ok */ }
    else if (Array.isArray(body.blocos)) {
      const invalid = body.blocos.filter((b: any) => typeof b !== "string");
      if (invalid.length > 0) errors.push("'blocos' array deve conter apenas strings");
    } else { errors.push("'blocos' deve ser string ou array de strings"); }
  }
  if (body.drive !== undefined && typeof body.drive !== "boolean") { errors.push("'drive' deve ser boolean"); }
  if (body.email !== undefined && typeof body.email !== "boolean" && typeof body.email !== "string") { errors.push("'email' deve ser boolean ou string"); }
  if (body.whatsapp !== undefined && typeof body.whatsapp !== "boolean" && typeof body.whatsapp !== "string") { errors.push("'whatsapp' deve ser boolean ou string"); }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: body };
}

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

async function collectPdfData(pacienteId: number) {
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) return null;

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

  return {
    paciente,
    pdfData: {
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
    },
    patologias,
    medicamentos,
  };
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

router.get("/rasx/:pacienteId/arqu/categorias", async (_req, res): Promise<void> => {
  const cats = Object.entries(RAS_CATEGORIAS).map(([key, val]) => ({
    categoria: key,
    label: val.label,
    descricao: val.descricao,
    cadernos: val.cadernos,
    totalCadernos: val.cadernos.length,
  }));
  cats.push({
    categoria: "JURIDICO",
    label: "RAS Juridico",
    descricao: "Termos juridicos: LGPD, TCLE, riscos, nao-garantia, privacidade",
    cadernos: ["RACJ LGPD", "RACJ CGLO", "RACJ RISC", "RACJ NGAR", "RACJ PRIV"],
    totalCadernos: 5,
  });
  res.json({ categorias: cats, versao: "V5" });
});

router.get("/rasx/:pacienteId/arqu/pdf/:categoria", async (req, res): Promise<void> => {
  try {
  const pacienteId = Number(req.params.pacienteId);
  const categoriaParam = req.params.categoria.toUpperCase();
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  if (categoriaParam === "JURIDICO") {
    const collected = await collectPdfData(pacienteId);
    if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

    const racjData = {
      paciente: collected.pdfData.paciente,
      medico: collected.pdfData.medico,
      unidade: collected.pdfData.unidade,
      dataBase: collected.pdfData.dataBase,
      patologias: collected.patologias.map(p => p.nome),
      medicamentos: collected.medicamentos.map(m => m.medicamentoDoseInline || m.nome),
    };
    const pdfStream = gerarRacjPdf(racjData);

    const hash = crypto.createHash("sha256").update(JSON.stringify({ pacienteId, ts: Date.now(), tipo: "juridico" })).digest("hex").slice(0, 16);
    await gravarAudit({ pacienteId, entidade: "racj_pdf", acao: "gerar_pdf", metadados: { categoria: "JURIDICO", cadernos: 5 } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="RACJ_${collected.paciente.nome.replace(/\s+/g, "_")}_${hash}.pdf"`);
    pdfStream.pipe(res);
    return;
  }

  const categoriasValidas = Object.keys(RAS_CATEGORIAS);
  if (!categoriasValidas.includes(categoriaParam)) {
    res.status(400).json({ error: `Categoria invalida. Opcoes: ${categoriasValidas.join(", ")}, JURIDICO` });
    return;
  }

  const collected = await collectPdfData(pacienteId);
  if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const categoria = categoriaParam as RasCategoria;
  const pdfStream = gerarRasxPdf(collected.pdfData, categoria);

  const hash = crypto.createHash("sha256").update(JSON.stringify({ pacienteId, ts: Date.now(), categoria })).digest("hex").slice(0, 16);
  await gravarAudit({ pacienteId, entidade: "rasx_pdf", acao: "gerar_pdf", metadados: { categoria, cadernos: RAS_CATEGORIAS[categoria].cadernos.length } });

  const label = RAS_CATEGORIAS[categoria].label.replace(/\s+/g, "_");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="RASX_${label}_${collected.paciente.nome.replace(/\s+/g, "_")}_${hash}.pdf"`);
  pdfStream.pipe(res);
  } catch (err: any) {
    console.error("[RASX PDF Categoria] Erro:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao gerar PDF", detalhes: err.message });
  }
});

router.post("/rasx/:pacienteId/arqu/enviar", async (req, res): Promise<void> => {
  try {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { categorias, email, drive, whatsapp } = req.body;
  const validCats = [...Object.keys(RAS_CATEGORIAS), "JURIDICO"];
  const rawCats = Array.isArray(categorias) ? categorias : ["CLINICO", "JURIDICO"];
  const cats: string[] = rawCats.map((c: any) => String(c).toUpperCase()).filter((c: string) => validCats.includes(c));
  if (cats.length === 0) { res.status(400).json({ error: `Nenhuma categoria valida. Opcoes: ${validCats.join(", ")}` }); return; }

  const collected = await collectPdfData(pacienteId);
  if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const resultados: any[] = [];
  const pdfs: { categoria: string; buffer: Buffer; filename: string }[] = [];

  for (const cat of cats) {
    const catUpper = cat.toUpperCase();
    let pdfStream: NodeJS.ReadableStream;
    let filename: string;

    if (catUpper === "JURIDICO") {
      const racjData = {
        paciente: collected.pdfData.paciente,
        medico: collected.pdfData.medico,
        unidade: collected.pdfData.unidade,
        dataBase: collected.pdfData.dataBase,
        patologias: collected.patologias.map(p => p.nome),
        medicamentos: collected.medicamentos.map(m => m.medicamentoDoseInline || m.nome),
      };
      pdfStream = gerarRacjPdf(racjData);
      filename = `RACJ_${collected.paciente.nome.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    } else if (Object.keys(RAS_CATEGORIAS).includes(catUpper)) {
      pdfStream = gerarRasxPdf(collected.pdfData, catUpper as RasCategoria);
      const label = RAS_CATEGORIAS[catUpper as RasCategoria].label.replace(/\s+/g, "_");
      filename = `RASX_${label}_${collected.paciente.nome.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    } else {
      resultados.push({ categoria: catUpper, erro: "Categoria invalida" });
      continue;
    }

    const buffer = await streamToBuffer(pdfStream);
    pdfs.push({ categoria: catUpper, buffer, filename });

    await gravarAudit({ pacienteId, entidade: "rasx_pdf_envio", acao: "gerar_pdf", metadados: { categoria: catUpper, filename } });
  }

  if (drive) {
    try {
      let folderId = collected.paciente.googleDriveFolderId;
      if (!folderId) {
        const folder = await getOrCreateClientFolder(collected.paciente.nome, collected.paciente.cpf || "SEM-CPF");
        folderId = folder.folderId;
        await db.update(pacientesTable).set({ googleDriveFolderId: folderId }).where(eq(pacientesTable.id, pacienteId));
      }

      for (const pdf of pdfs) {
        const DRIVE_MAP: Record<string, string> = {
          JURIDICO: "JURIDICO",
          CLINICO: "PROTOCOLOS",
          EVOLUTIVO: "SEGUIMENTO",
          ESTADO_SAUDE: "SEGUIMENTO",
          COMPLETO: "LAUDOS",
        };
        const subfolder = DRIVE_MAP[pdf.categoria] || "LAUDOS";
        const result = await uploadToClientSubfolder({
          clientFolderId: folderId!,
          subfolder: subfolder as any,
          fileName: pdf.filename,
          mimeType: "application/pdf",
          content: pdf.buffer,
        });
        resultados.push({ categoria: pdf.categoria, drive: { sucesso: true, fileId: result.fileId, fileUrl: result.fileUrl, subfolder } });
      }
    } catch (err: any) {
      resultados.push({ drive: { sucesso: false, erro: err.message } });
    }
  }

  if (email) {
    const toEmail = typeof email === "string" ? email : (collected.paciente.email || null);
    if (!toEmail) {
      resultados.push({ email: { sucesso: false, erro: "Email do paciente nao encontrado" } });
    } else {
      try {
        const nick = typeof collected.pdfData.unidade === "object" ? (collected.pdfData.unidade as any)?.nick || "Instituto Padua" : "Instituto Padua";
        const medicoNome = typeof collected.pdfData.medico === "string" ? collected.pdfData.medico : "Dr. Caio Henrique Fernandes Padua";
        const substancias = collected.medicamentos.map(m => m.medicamentoDoseInline || m.nome);
        for (const pdf of pdfs) {
          const tipoDoc = pdf.categoria === "JURIDICO"
            ? "Termos Juridicos"
            : (RAS_CATEGORIAS[pdf.categoria as RasCategoria]?.label || pdf.categoria);
          const emailOpts: EmailOpts = {
            nick,
            medicoNome,
            tipoDocumento: tipoDoc,
            acao: "INFORMATIVO",
            pacienteNome: collected.paciente.nome,
            substancias: substancias.length > 0 ? substancias : undefined,
            unidadeNome: typeof collected.pdfData.unidade === "string" ? collected.pdfData.unidade : nick,
            endereco: "Rua Guaxupe, 327 - Vila Formosa, Sao Paulo - SP",
            whatsapp: "(11) 97715-4000",
            telefone: "(11) 97715-4000",
            emailContato: "clinica.padua.agenda@gmail.com",
          };
          const built = buildEmail(emailOpts);
          await sendEmailWithPdf(toEmail, built.subject, built.html, pdf.buffer, pdf.filename);
          resultados.push({ categoria: pdf.categoria, email: { sucesso: true, enviadoPara: toEmail, subject: built.subject } });
        }
      } catch (err: any) {
        resultados.push({ email: { sucesso: false, erro: err.message } });
      }
    }
  }

  if (whatsapp) {
    const nick = typeof collected.pdfData.unidade === "object" ? (collected.pdfData.unidade as any)?.nick || "Instituto Padua" : "Instituto Padua";
    const medicoNome = typeof collected.pdfData.medico === "string" ? collected.pdfData.medico : "Dr. Caio Henrique Fernandes Padua";
    const substancias = collected.medicamentos.map(m => m.medicamentoDoseInline || m.nome);
    const waOpts: EmailOpts = {
      nick,
      medicoNome,
      tipoDocumento: cats.map(c => c === "JURIDICO" ? "Termos Juridicos" : (RAS_CATEGORIAS[c as RasCategoria]?.label || c)).join(" + "),
      acao: "INFORMATIVO",
      pacienteNome: collected.paciente.nome,
      substancias: substancias.length > 0 ? substancias : undefined,
      unidadeNome: typeof collected.pdfData.unidade === "string" ? collected.pdfData.unidade : nick,
      endereco: "Rua Guaxupe, 327 - Vila Formosa, Sao Paulo - SP",
      whatsapp: "(11) 97715-4000",
      telefone: "(11) 97715-4000",
      emailContato: "clinica.padua.agenda@gmail.com",
    };
    const waMensagem = buildWhatsappFormal(waOpts);
    const telefone = (typeof whatsapp === "string" ? whatsapp : (collected.paciente.telefone || "")).replace(/\D/g, "");
    const telefoneInt = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const waUrl = telefone ? `https://wa.me/${telefoneInt}?text=${encodeURIComponent(waMensagem)}` : null;
    resultados.push({ whatsapp: { mensagem: waMensagem, waUrl, info: "PDFs enviados ao Drive. Use o link wa.me para enviar a mensagem pelo WhatsApp." } });
  }

  await gravarAudit({ pacienteId, entidade: "rasx_envio_completo", acao: "gerar_pdf", metadados: { categorias: cats, email: !!email, drive: !!drive, whatsapp: !!whatsapp, totalPdfs: pdfs.length } });

  res.json({
    sucesso: true,
    paciente: collected.paciente.nome,
    pdfsGerados: pdfs.map(p => ({ categoria: p.categoria, filename: p.filename, tamanho: `${(p.buffer.length / 1024).toFixed(1)} KB` })),
    resultados,
  });
  } catch (err: any) {
    console.error("[RASX Enviar] Erro:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao processar envio", detalhes: err.message });
  }
});

router.post("/rasx/:pacienteId/arqu/popular-drive", async (req, res): Promise<void> => {
  try {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const collected = await collectPdfData(pacienteId);
  if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  let folderId = collected.paciente.googleDriveFolderId;
  if (!folderId) {
    const folder = await getOrCreateClientFolder(collected.paciente.nome, collected.paciente.cpf || "SEM-CPF");
    folderId = folder.folderId;
    await db.update(pacientesTable).set({ googleDriveFolderId: folderId }).where(eq(pacientesTable.id, pacienteId));
  }

  const base = {
    paciente: collected.pdfData.paciente,
    medico: collected.pdfData.medico,
    unidade: collected.pdfData.unidade,
    dataBase: collected.pdfData.dataBase,
  };
  const nome = collected.paciente.nome.replace(/\s+/g, "_");
  const dt = new Date().toISOString().slice(0, 10);
  const uploads: { subfolder: string; filename: string; tamanho: string; fileUrl: string }[] = [];

  const upload = async (subfolder: string, filename: string, pdfStream: NodeJS.ReadableStream) => {
    const buffer = await streamToBuffer(pdfStream);
    const result = await uploadToClientSubfolder({
      clientFolderId: folderId!,
      subfolder: subfolder as any,
      fileName: filename,
      mimeType: "application/pdf",
      content: buffer,
    });
    uploads.push({ subfolder, filename, tamanho: `${(buffer.length / 1024).toFixed(1)} KB`, fileUrl: result.fileUrl });
  };

  await upload("CADASTRO", `Ficha_Cadastro_${nome}_${dt}.pdf`,
    gerarFichaCadastroPdf({ ...base, telefone: collected.paciente.telefone || undefined, email: collected.paciente.email || undefined }));

  await upload("PATOLOGIAS", `Relatorio_Patologias_${nome}_${dt}.pdf`,
    gerarRelatorioPatologiasPdf({ ...base, patologias: collected.patologias.map(p => ({
      nome: p.nome, orgao: p.orgaoSistema || "—", intensidade: p.intensidadeAtual || "—",
      semaforo: p.statusSemaforo || "amarelo", leitura: p.leituraClinica || "—",
    })) }));

  await upload("EXAMES", `Solicitacao_Exames_${nome}_${dt}.pdf`,
    gerarLaudoExamePdf({ ...base, exames: [
      { nome: "Hemograma Completo", justificativa: "Avaliacao hematologica e investigacao de processo inflamatorio/infeccioso" },
      { nome: "PCR Ultra-Sensivel", justificativa: "Marcador inflamatorio para acompanhamento de inflamacao cronica" },
      { nome: "TSH + T4 Livre", justificativa: "Funcao tireoidiana — fadiga cronica e metabolismo" },
      { nome: "Vitamina D (25-OH)", justificativa: "Avaliacao de status vitaminico — imunidade e funcao musculoesqueletica" },
      { nome: "Ferritina Serica", justificativa: "Reserva de ferro — correlacao com fadiga e anemia" },
      { nome: "Cortisol Salivar (4 tempos)", justificativa: "Avaliacao do eixo HPA — estresse cronico e ritmo circadiano" },
    ] }));

  const meds = collected.medicamentos.map(m => ({
    nome: m.medicamentoDoseInline || m.nome,
    posologia: m.posologia || "Conforme orientacao medica",
    uso: m.motivoUso || m.indicacaoClinica || "Tratamento clinico",
  }));
  if (meds.length > 0) {
    await upload("RECEITAS", `Receita_Medica_${nome}_${dt}.pdf`, gerarReceitaPdf({ ...base, medicamentos: meds }));
  }

  await upload("PROTOCOLOS", `RASX_RAS_Clinico_${nome}_${dt}.pdf`, gerarRasxPdf(collected.pdfData, "CLINICO"));

  await upload("FINANCEIRO", `Orcamento_${nome}_${dt}.pdf`,
    gerarOrcamentoFinanceiroPdf({ ...base, itens: [
      { descricao: "Consulta Integrativa — 30 min presencial", valor: 450.00 },
      { descricao: "Protocolo de Infusao Endovenosa", valor: 890.00 },
      { descricao: "Formula Magistral — manipulacao personalizada", valor: 320.00 },
      { descricao: "Exames laboratoriais complementares", valor: 580.00 },
      { descricao: "Acompanhamento evolutivo mensal", valor: 250.00 },
    ], total: 2490.00 }));

  await upload("CONTRATOS", `Contrato_Servicos_${nome}_${dt}.pdf`, gerarContratoPdf(base));

  await upload("ATESTADOS", `Atestado_Medico_${nome}_${dt}.pdf`,
    gerarAtestadoPdf({ ...base, motivo: "Consulta medica e realizacao de procedimentos clinicos", dias: 1, cid: "R53 — Mal-estar e fadiga" }));

  await upload("LAUDOS", `RASX_RAS_Completo_${nome}_${dt}.pdf`, gerarRasxPdf(collected.pdfData, "COMPLETO"));

  await upload("TERMOS", `Termo_Consentimento_Procedimento_${nome}_${dt}.pdf`,
    gerarTermoConsentimentoPdf({ ...base, procedimento: "Infusao endovenosa de micronutrientes e suplementacao integrativa" }));

  const racjData = {
    paciente: base.paciente, medico: base.medico, unidade: base.unidade, dataBase: base.dataBase,
    patologias: collected.patologias.map(p => p.nome),
    medicamentos: collected.medicamentos.map(m => m.medicamentoDoseInline || m.nome),
  };
  await upload("JURIDICO", `RACJ_Termos_Juridicos_${nome}_${dt}.pdf`, gerarRacjPdf(racjData));

  await upload("SEGUIMENTO", `RASX_RAS_Evolutivo_${nome}_${dt}.pdf`, gerarRasxPdf(collected.pdfData, "EVOLUTIVO"));

  await gravarAudit({
    pacienteId, entidade: "drive_popular_completo", acao: "gerar_pdf",
    metadados: { totalArquivos: uploads.length, subpastas: uploads.map(u => u.subfolder) },
  });

  res.json({
    sucesso: true,
    paciente: collected.paciente.nome,
    pastaRaiz: folderId,
    totalArquivos: uploads.length,
    arquivos: uploads,
  });
  } catch (err: any) {
    console.error("[RASX Popular Drive] Erro:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao popular Drive", detalhes: err.message });
  }
});

router.get("/rasx/arquitetura", async (_req, res): Promise<void> => {
  res.json(getArquiteturaCompleta());
});

router.post("/rasx/:pacienteId/motor", async (req, res): Promise<void> => {
  try {
    const pacienteId = Number(req.params.pacienteId);
    if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

    const validated = validateMotorBody(req.body);
    if (!validated.ok) {
      res.status(400).json({
        error: "Payload invalido",
        detalhes: validated.errors,
        opcoes: { eventos: [...VALID_EVENTOS], classes: [...VALID_CLASSES] },
      });
      return;
    }

    const { evento, classeProcedimento, blocos: blocosReq, drive, email, whatsapp } = validated.data;

    const eventoResolvido = resolverEvento(evento);
    const classeResolvida = resolverClasseProcedimento(classeProcedimento);

    const collected = await collectPdfData(pacienteId);
    if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

    const blocosDoEvento = blocosReq
      ? (Array.isArray(blocosReq) ? blocosReq : [blocosReq]).map((b: string) => resolverBloco(b))
      : resolverBlocosDoEvento(eventoResolvido);

    const termosAtivos = await db.select().from(termosJuridicosTable)
      .where(eq(termosJuridicosTable.ativo, true));
    setTermosDB(termosAtivos.map(t => ({
      id: t.id,
      bloco: t.bloco,
      subgrupo: t.subgrupo,
      consentimento: t.consentimento,
      titulo: t.titulo,
      textoCompleto: t.textoCompleto,
      categoria: t.categoria,
      riscosEspecificos: t.riscosEspecificos,
      versao: t.versao,
    })));

    const payloads: PayloadRAS[] = [];
    const pdfs: { bloco: BlocoRAS; payload: PayloadRAS; buffer: Buffer; nomeArquivo: string; pasta: string; log: LogRAS }[] = [];

    for (const bloco of blocosDoEvento) {
      const payloadRAS = montarPayloadRAS({
        pacienteId,
        nomePaciente: collected.paciente.nome,
        cpf: collected.paciente.cpf || undefined,
        evento: eventoResolvido,
        bloco,
        classeProcedimento: classeResolvida,
        medicamentos: collected.medicamentos.map(m => ({
          nome: m.medicamentoDoseInline || m.nome,
          posologia: m.posologia,
          dataInicio: m.dataInicioUso?.toISOString?.(),
          evento: m.statusAtual,
          substituicao: m.substituicaoNatural,
        })),
        patologias: collected.patologias.map(p => ({
          nome: p.nome,
          tipo: p.tipo,
          cid: p.cid10,
        })),
        orgaos: (collected.pdfData.orgaos || []).map((o: any) => ({
          nome: o.orgaoSistema,
          status: o.intensidade || "—",
        })),
        proximasEtapas: (collected.pdfData.proximasEtapas || []).map((e: any) => ({
          descricao: e.descricao,
          data: e.dataPrevista?.toISOString?.(),
        })),
        profissionalResponsavel: "Dr. Caio Henrique Fernandes Padua",
        crmProfissional: "CRM-SP 125475",
        nick: "INSTITUTO PADUA",
        unidade: "Instituto Padua — Vila Formosa",
        endereco: "Rua Guaxupe, 327 — Vila Formosa, Sao Paulo — SP",
        protocoloId: undefined,
      });

      payloads.push(payloadRAS);

      const pdfStream = gerarMotorPdf(payloadRAS);
      const buffer = await streamToBuffer(pdfStream);
      const nomeArquivo = gerarNomeArquivoRAS(payloadRAS);
      const pasta = resolverPastaDestino(bloco, eventoResolvido);

      const log = buildLogRAS({
        pacienteId,
        evento: eventoResolvido,
        bloco,
        subgrupos: payloadRAS.subgrupos,
        classeProcedimento: classeResolvida,
        arquivo: nomeArquivo,
        pasta,
        buffer,
      });

      pdfs.push({ bloco, payload: payloadRAS, buffer, nomeArquivo, pasta, log });
    }

    if (drive) {
      try {
        let folderId = collected.paciente.googleDriveFolderId;
        if (!folderId) {
          const folder = await getOrCreateClientFolder(collected.paciente.nome, collected.paciente.cpf || "SEM-CPF");
          folderId = folder.folderId;
          await db.update(pacientesTable).set({ googleDriveFolderId: folderId }).where(eq(pacientesTable.id, pacienteId));
        }

        for (const pdf of pdfs) {
          const result = await uploadToClientSubfolder({
            clientFolderId: folderId!,
            subfolder: pdf.pasta as any,
            fileName: `${pdf.nomeArquivo}.pdf`,
            mimeType: "application/pdf",
            content: pdf.buffer,
          });
          pdf.log.status = "enviado";
          (pdf.log as any).driveFileId = result.fileId;
          (pdf.log as any).driveFileUrl = result.fileUrl;
        }
      } catch (err: any) {
        console.error("[Motor Drive]", err.message);
      }
    }

    if (email) {
      const toEmail = typeof email === "string" ? email : (collected.paciente.email || null);
      if (toEmail) {
        try {
          for (const pdf of pdfs) {
            const emailOpts: EmailOpts = {
              nick: "INSTITUTO PADUA",
              medicoNome: "Dr. Caio Henrique Fernandes Padua",
              tipoDocumento: BLOCO_LABELS[pdf.bloco]?.nome || pdf.bloco,
              acao: "INFORMATIVO",
              pacienteNome: collected.paciente.nome,
              unidadeNome: "Instituto Padua",
              endereco: "Rua Guaxupe, 327 - Vila Formosa, Sao Paulo - SP",
              whatsapp: "(11) 97715-4000",
              telefone: "(11) 97715-4000",
              emailContato: "clinica.padua.agenda@gmail.com",
            };
            const built = buildEmail(emailOpts);
            await sendEmailWithPdf(toEmail, built.subject, built.html, pdf.buffer, `${pdf.nomeArquivo}.pdf`);
          }
        } catch (err: any) {
          console.error("[Motor Email]", err.message);
        }
      }
    }

    for (const pdf of pdfs) {
      await gravarAudit({
        pacienteId,
        entidade: "rasx_motor",
        acao: "gerar_pdf",
        metadados: {
          evento: eventoResolvido,
          bloco: pdf.bloco,
          subgrupos: pdf.payload.subgrupos,
          classeProcedimento: classeResolvida,
          arquivo: pdf.nomeArquivo,
          pasta: pdf.pasta,
          hash: pdf.log.hash,
          versao: pdf.log.versao,
          tamanhoBytes: pdf.log.tamanhoBytes,
          status: pdf.log.status,
        },
      });
    }

    let whatsappResult = null;
    if (whatsapp) {
      const telefone = (typeof whatsapp === "string" ? whatsapp : (collected.paciente.telefone || "")).replace(/\D/g, "");
      const telefoneInt = telefone.startsWith("55") ? telefone : `55${telefone}`;
      const waOpts: EmailOpts = {
        nick: "INSTITUTO PADUA",
        medicoNome: "Dr. Caio Henrique Fernandes Padua",
        tipoDocumento: pdfs.map(p => BLOCO_LABELS[p.bloco]?.nome || p.bloco).join(" + "),
        acao: "INFORMATIVO",
        pacienteNome: collected.paciente.nome,
        unidadeNome: "Instituto Padua",
        endereco: "Rua Guaxupe, 327 - Vila Formosa, Sao Paulo - SP",
        whatsapp: "(11) 97715-4000",
        telefone: "(11) 97715-4000",
        emailContato: "clinica.padua.agenda@gmail.com",
      };
      const waMensagem = buildWhatsappFormal(waOpts);
      const waUrl = telefone ? `https://wa.me/${telefoneInt}?text=${encodeURIComponent(waMensagem)}` : null;
      whatsappResult = { mensagem: waMensagem, waUrl };
    }

    res.json({
      sucesso: true,
      versao: "RASX-MATRIZ V6",
      paciente: collected.paciente.nome,
      evento: eventoResolvido,
      pipelineDescricao: EVENTO_PIPELINE[eventoResolvido]?.descricao,
      classeProcedimento: classeResolvida || null,
      consentimentoEspecifico: classeResolvida ? resolverConsentimento(classeResolvida) : null,
      blocos: pdfs.map(p => ({
        bloco: p.bloco,
        blocoNome: BLOCO_LABELS[p.bloco]?.nome,
        subgrupos: p.payload.subgrupos,
        subgruposDetalhes: p.payload.subgrupos.map(sg => ({ codigo: sg, ...(SUBGRUPO_LABELS[sg] || { nome: sg, funcao: "—" }) })),
        nomeArquivo: p.nomeArquivo,
        pasta: p.pasta,
        hash: p.log.hash,
        tamanho: `${(p.buffer.length / 1024).toFixed(1)} KB`,
        status: p.log.status,
      })),
      totalBlocos: pdfs.length,
      totalPaginas: pdfs.reduce((acc, p) => acc + p.payload.subgrupos.length, 0),
      whatsapp: whatsappResult,
    });
  } catch (err: any) {
    console.error("[RASX Motor] Erro:", err.message, err.stack);
    if (!res.headersSent) res.status(500).json({ error: "Erro no motor RASX", detalhes: err.message });
  }
});

router.get("/rasx/:pacienteId/motor/pdf/:bloco", async (req, res): Promise<void> => {
  try {
    const pacienteId = Number(req.params.pacienteId);
    const blocoParam = req.params.bloco.toUpperCase();
    if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

    const bloco = resolverBloco(blocoParam);
    const eventoParam = (req.query.evento as string) || "START";
    const eventoResolvido = resolverEvento(eventoParam);
    const classeParam = req.query.classe as string;
    const classeResolvida = resolverClasseProcedimento(classeParam);

    const collected = await collectPdfData(pacienteId);
    if (!collected) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

    const termosAtivos = await db.select().from(termosJuridicosTable)
      .where(eq(termosJuridicosTable.ativo, true));
    setTermosDB(termosAtivos.map(t => ({
      id: t.id, bloco: t.bloco, subgrupo: t.subgrupo, consentimento: t.consentimento,
      titulo: t.titulo, textoCompleto: t.textoCompleto, categoria: t.categoria,
      riscosEspecificos: t.riscosEspecificos, versao: t.versao,
    })));

    const payloadRAS = montarPayloadRAS({
      pacienteId,
      nomePaciente: collected.paciente.nome,
      cpf: collected.paciente.cpf || undefined,
      evento: eventoResolvido,
      bloco,
      classeProcedimento: classeResolvida,
      medicamentos: collected.medicamentos.map(m => ({
        nome: m.medicamentoDoseInline || m.nome,
        posologia: m.posologia,
        dataInicio: m.dataInicioUso?.toISOString?.(),
        evento: m.statusAtual,
        substituicao: m.substituicaoNatural,
      })),
      patologias: collected.patologias.map(p => ({
        nome: p.nome,
        tipo: p.tipo,
        cid: p.cid10,
      })),
      proximasEtapas: (collected.pdfData.proximasEtapas || []).map((e: any) => ({
        descricao: e.descricao,
        data: e.dataPrevista?.toISOString?.(),
      })),
      profissionalResponsavel: "Dr. Caio Henrique Fernandes Padua",
      crmProfissional: "CRM-SP 125475",
      nick: "INSTITUTO PADUA",
      unidade: "Instituto Padua — Vila Formosa",
    });

    const pdfStream = gerarMotorPdf(payloadRAS);
    const nomeArquivo = gerarNomeArquivoRAS(payloadRAS);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}.pdf"`);
    pdfStream.pipe(res);
  } catch (err: any) {
    console.error("[Motor PDF Bloco] Erro:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao gerar PDF do bloco", detalhes: err.message });
  }
});

export { gravarAudit };
export default router;
