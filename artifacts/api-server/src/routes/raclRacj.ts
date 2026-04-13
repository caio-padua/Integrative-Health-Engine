import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventoStartTable, cadernosDocumentaisTable,
  pacientesTable, tratamentosTable,
  SIGLA_LABELS,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { resolverCadernos, type ModalidadesAtivas } from "../lib/motor-toggles";

const router = Router();

router.get("/ras/cadernos/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const cadernos = await db.select().from(cadernosDocumentaisTable)
    .where(eq(cadernosDocumentaisTable.pacienteId, pacienteId))
    .orderBy(cadernosDocumentaisTable.familia, cadernosDocumentaisTable.sigla);

  const racl = cadernos.filter(c => c.familia === "RACL");
  const racj = cadernos.filter(c => c.familia === "RACJ");

  res.json({ cadernos, racl, racj, total: cadernos.length });
});

router.get("/ras/cadernos/:pacienteId/:tratamentoId", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  const tratamentoId = Number(req.params.tratamentoId);

  const cadernos = await db.select().from(cadernosDocumentaisTable)
    .where(and(
      eq(cadernosDocumentaisTable.pacienteId, pacienteId),
      eq(cadernosDocumentaisTable.tratamentoId, tratamentoId),
    ))
    .orderBy(cadernosDocumentaisTable.familia, cadernosDocumentaisTable.sigla);

  res.json({
    cadernos,
    racl: cadernos.filter(c => c.familia === "RACL"),
    racj: cadernos.filter(c => c.familia === "RACJ"),
    total: cadernos.length,
  });
});

router.post("/ras/resolver-cadernos", async (req, res): Promise<void> => {
  const modalidades = req.body as ModalidadesAtivas;
  const cadernos = resolverCadernos(modalidades);
  res.json({
    cadernos,
    racl: cadernos.filter(c => c.familia === "RACL"),
    racj: cadernos.filter(c => c.familia === "RACJ"),
    totalRACL: cadernos.filter(c => c.familia === "RACL").length,
    totalRACJ: cadernos.filter(c => c.familia === "RACJ").length,
    total: cadernos.length,
  });
});

router.post("/ras/evento-start", async (req, res): Promise<void> => {
  const { pacienteId, tratamentoId, modalidades, medicoResponsavelId, unidadeId, observacoes } = req.body;

  if (!pacienteId || !tratamentoId) {
    res.status(400).json({ error: "pacienteId e tratamentoId sao obrigatorios" });
    return;
  }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

  const [tratamento] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, tratamentoId));
  if (!tratamento) { res.status(404).json({ error: "Tratamento nao encontrado" }); return; }

  const existente = await db.select().from(eventoStartTable)
    .where(and(
      eq(eventoStartTable.pacienteId, pacienteId),
      eq(eventoStartTable.tratamentoId, tratamentoId),
    ))
    .limit(1);

  if (existente.length > 0) {
    res.status(409).json({
      error: "Evento START ja existe para este paciente/tratamento",
      eventoExistente: existente[0],
    });
    return;
  }

  const mods: ModalidadesAtivas = modalidades || {
    injetavelIM: false,
    injetavelEV: false,
    implante: false,
    formula: false,
    protocolo: false,
    exame: false,
    dieta: false,
    psicologia: false,
  };

  const cadernosResolvidos = resolverCadernos(mods);
  const raclSiglas = cadernosResolvidos.filter(c => c.familia === "RACL").map(c => c.sigla);
  const racjSiglas = cadernosResolvidos.filter(c => c.familia === "RACJ").map(c => c.sigla);

  const snapshotCadastro = {
    nome: paciente.nome,
    cpf: paciente.cpf,
    dataNascimento: paciente.dataNascimento,
    telefone: paciente.telefone,
    email: paciente.email,
    planoAcompanhamento: paciente.planoAcompanhamento,
    googleDriveFolderId: paciente.googleDriveFolderId,
    tratamentoNome: tratamento.nome,
    tratamentoStatus: tratamento.status,
    dataInicio: tratamento.dataInicio,
    capturadoEm: new Date().toISOString(),
  };

  const [evento] = await db.insert(eventoStartTable).values({
    pacienteId,
    tratamentoId,
    unidadeId: unidadeId || tratamento.unidadeId,
    medicoResponsavelId: medicoResponsavelId || tratamento.medicoId,
    snapshotCadastro,
    modalidadesAtivas: mods,
    cadernosRaclGerados: raclSiglas,
    cadernosRacjGerados: racjSiglas,
    statusEvento: "processando",
    observacoes,
  }).returning();

  const cadernosParaInserir = cadernosResolvidos.map(c => ({
    pacienteId,
    tratamentoId,
    eventoStartId: evento.id,
    familia: c.familia as "RACL" | "RACJ",
    sigla: c.sigla,
    descricao: c.descricao,
    status: "pendente" as const,
    driveSubpasta: c.familia === "RACJ" ? "JURIDICO" : "PROTOCOLOS",
    emitidoUmaVez: c.familia === "RACJ",
  }));

  if (cadernosParaInserir.length > 0) {
    await db.insert(cadernosDocumentaisTable).values(cadernosParaInserir);
  }

  await db.update(eventoStartTable)
    .set({ statusEvento: "concluido" })
    .where(eq(eventoStartTable.id, evento.id));

  const cadernosCriados = await db.select().from(cadernosDocumentaisTable)
    .where(eq(cadernosDocumentaisTable.eventoStartId, evento.id))
    .orderBy(cadernosDocumentaisTable.familia, cadernosDocumentaisTable.sigla);

  res.status(201).json({
    evento: { ...evento, statusEvento: "concluido" },
    cadernos: cadernosCriados,
    resumo: {
      totalRACL: raclSiglas.length,
      totalRACJ: racjSiglas.length,
      siglasRACL: raclSiglas,
      siglasRACJ: racjSiglas,
    },
  });
});

router.get("/ras/evento-start/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const eventos = await db.select().from(eventoStartTable)
    .where(eq(eventoStartTable.pacienteId, pacienteId))
    .orderBy(desc(eventoStartTable.criadoEm));

  res.json({ eventos });
});

router.get("/ras/siglas-referencia", async (_req, res): Promise<void> => {
  res.json({
    SIGLA_LABELS,
    familias: ["RACL", "RACJ"],
    descricao: {
      RACL: "Registro de Acompanhamento Clinico — documentos de evolucao, substancias, progresso. Prazeroso para o paciente.",
      RACJ: "Registro de Acompanhamento Juridico — consentimentos, termos, riscos, financeiro. Emitido 1x no START.",
    },
  });
});

export default router;
