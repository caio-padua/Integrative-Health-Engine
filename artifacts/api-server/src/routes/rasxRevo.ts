import { Router } from "express";
import { db } from "@workspace/db";
import {
  revoSnapshotsTable, revoPatologiasTable, revoCurvasTable,
  revoOrgaosTable, revoMedicamentosTable, revoEventosMedicacaoTable,
  revoProximaEtapaTable, rasxAuditLogTable,
  pacientesTable, tratamentosTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { parsePosologia } from "@workspace/posologia";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";

const router = Router();

/**
 * GET /api/rasx/posologia-origem-stats?unidadeId=X
 *
 * Task #242 — expoe a contagem de receitas (linhas em revo_medicamentos)
 * por origem da posologia (`parser` automatico vs `manual` validado pelo
 * medico). Permite Dr. Caio priorizar a fila de revisao por unidade.
 *
 * Sem `unidadeId` -> agrega rede inteira. Com `unidadeId` -> filtra via
 * pacientes.unidade_id. Devolve tambem top 10 pacientes com mais linhas
 * pendentes de validacao (origem='parser') pra abrir caminho ao prontuario.
 *
 * Master-only (mesma blindagem do admin-analytics).
 */
router.get("/rasx/posologia-origem-stats", requireMasterEstrito, async (req, res): Promise<void> => {
  const unidadeIdRaw = req.query.unidadeId;
  const unidadeId = unidadeIdRaw !== undefined && unidadeIdRaw !== "" ? Number(unidadeIdRaw) : null;
  if (unidadeId !== null && Number.isNaN(unidadeId)) {
    res.status(400).json({ error: "unidadeId invalido" });
    return;
  }

  const filtroUnidade = unidadeId !== null
    ? sql`AND p.unidade_id = ${unidadeId}`
    : sql``;

  const totaisRows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE m.origem_posologia = 'parser') AS parser,
      COUNT(*) FILTER (WHERE m.origem_posologia = 'manual') AS manual,
      COUNT(*) AS total
    FROM revo_medicamentos m
    JOIN pacientes p ON p.id = m.paciente_id
    WHERE m.posologia IS NOT NULL AND m.posologia <> ''
    ${filtroUnidade}
  `);
  const t = (totaisRows as any).rows?.[0] ?? (totaisRows as any)[0] ?? {};
  const parser = Number(t.parser ?? 0);
  const manual = Number(t.manual ?? 0);
  const total = Number(t.total ?? 0);

  const porPacienteRows = await db.execute(sql`
    SELECT
      p.id AS paciente_id,
      p.nome AS paciente_nome,
      p.unidade_id,
      COUNT(*) FILTER (WHERE m.origem_posologia = 'parser') AS parser,
      COUNT(*) FILTER (WHERE m.origem_posologia = 'manual') AS manual
    FROM revo_medicamentos m
    JOIN pacientes p ON p.id = m.paciente_id
    WHERE m.posologia IS NOT NULL AND m.posologia <> ''
    ${filtroUnidade}
    GROUP BY p.id, p.nome, p.unidade_id
    HAVING COUNT(*) FILTER (WHERE m.origem_posologia = 'parser') > 0
    ORDER BY COUNT(*) FILTER (WHERE m.origem_posologia = 'parser') DESC, p.nome ASC
    LIMIT 10
  `);
  const porPaciente = ((porPacienteRows as any).rows ?? (porPacienteRows as any) ?? []).map((r: any) => ({
    pacienteId: Number(r.paciente_id),
    pacienteNome: r.paciente_nome,
    unidadeId: Number(r.unidade_id),
    parser: Number(r.parser ?? 0),
    manual: Number(r.manual ?? 0),
  }));

  res.json({
    unidadeId,
    totais: { parser, manual, total },
    porPaciente,
  });
});

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
      posologia: m.posologia || null,
      posologiaEstruturada: m.posologia ? parsePosologia(m.posologia) : null,
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

  const allowed = ["nome","dose","medicamentoDoseInline","posologia","motivoUso","tempoUso","statusAtual","criterioReducao","substituicaoNatural","evidenciaMelhora","indicacaoClinica","tipoMed","componentesFormula","dataInicioUso","dataReducao","dataSuspensao"];
  const clean: any = {};
  for (const k of allowed) { if (req.body[k] !== undefined) clean[k] = req.body[k]; }

  // Task #41: confirma-ou-corrige. Se o frontend envia uma estrutura editada
  // pelo médico (`posologiaEstruturada` no body), gravamos ela como `manual`.
  // Caso contrário, caímos no parser automático e marcamos como `parser`.
  const estruturaManual = req.body.posologiaEstruturada;
  if (estruturaManual && typeof estruturaManual === "object") {
    clean.posologiaEstruturada = { ...estruturaManual, raw: clean.posologia ?? estruturaManual.raw ?? "", interpretado: true };
    clean.origemPosologia = "manual";
  } else if (typeof clean.posologia === "string" && clean.posologia.trim()) {
    clean.posologiaEstruturada = parsePosologia(clean.posologia);
    clean.origemPosologia = "parser";
  }

  const [med] = await db.insert(revoMedicamentosTable).values({
    pacienteId,
    ...clean,
  }).returning();

  res.status(201).json(med);
});

router.put("/rasx/revo/medicamento/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const patch: any = { ...req.body };
  // Task #41: idem POST — estrutura manual vinda do RevoPanel ganha precedência
  // sobre o parser automático e marca origem='manual'.
  if (patch.posologiaEstruturada && typeof patch.posologiaEstruturada === "object") {
    patch.posologiaEstruturada = { ...patch.posologiaEstruturada, raw: patch.posologia ?? patch.posologiaEstruturada.raw ?? "", interpretado: true };
    patch.origemPosologia = "manual";
  } else if (typeof patch.posologia === "string" && patch.posologia.trim()) {
    patch.posologiaEstruturada = parsePosologia(patch.posologia);
    patch.origemPosologia = "parser";
  }

  const [updated] = await db.update(revoMedicamentosTable)
    .set(patch)
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

router.post("/rasx/:pacienteId/revo/evento-medicacao", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }
  const { medicamentoId, data, apresentacao, posologia, status, substituicaoNatural, leituraClinica } = req.body;
  if (!medicamentoId || !data || !apresentacao || !status) { res.status(400).json({ error: "medicamentoId, data, apresentacao e status obrigatorios" }); return; }
  const [ev] = await db.insert(revoEventosMedicacaoTable).values({ medicamentoId, pacienteId, data: new Date(data), apresentacao, posologia, status, substituicaoNatural, leituraClinica }).returning();
  res.status(201).json(ev);
});

router.post("/rasx/:pacienteId/revo/proxima-etapa", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }
  const { tipo, descricao, dataPrevista, prioridade } = req.body;
  if (!tipo || !descricao) { res.status(400).json({ error: "tipo e descricao obrigatorios" }); return; }
  const [et] = await db.insert(revoProximaEtapaTable).values({ pacienteId, tipo, descricao, dataPrevista: dataPrevista ? new Date(dataPrevista) : null, prioridade: prioridade || "media" }).returning();
  res.status(201).json(et);
});

router.post("/rasx/revo/evento-medicacao", async (req, res): Promise<void> => {
  const { medicamentoId, pacienteId, data, apresentacao, posologia, status, substituicaoNatural, leituraClinica } = req.body;
  if (!medicamentoId || !pacienteId || !data || !apresentacao || !status) { res.status(400).json({ error: "medicamentoId, pacienteId, data, apresentacao e status obrigatorios" }); return; }
  const [ev] = await db.insert(revoEventosMedicacaoTable).values({ medicamentoId, pacienteId, data: new Date(data), apresentacao, posologia, status, substituicaoNatural, leituraClinica }).returning();
  res.status(201).json(ev);
});

export default router;
