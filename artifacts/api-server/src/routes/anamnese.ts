import { Router } from "express";
import { db, anamnesesTable, pacientesTable, sugestoesTable, itensTerapeuticosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarAnamneseBody, AtualizarAnamneseBody } from "@workspace/api-zod";

const router = Router();

router.get("/anamnese", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;

  const anamneses = await db
    .select({
      id: anamnesesTable.id,
      pacienteId: anamnesesTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      status: anamnesesTable.status,
      respostasClincias: anamnesesTable.respostasClincias,
      respostasFinanceiras: anamnesesTable.respostasFinanceiras,
      respostasPreferencias: anamnesesTable.respostasPreferencias,
      sinaisSemanticos: anamnesesTable.sinaisSemanticos,
      motorAtivadoEm: anamnesesTable.motorAtivadoEm,
      criadoEm: anamnesesTable.criadoEm,
      atualizadoEm: anamnesesTable.atualizadoEm,
    })
    .from(anamnesesTable)
    .leftJoin(pacientesTable, eq(anamnesesTable.pacienteId, pacientesTable.id));

  let result = anamneses;
  if (pacienteId) result = result.filter(a => a.pacienteId === pacienteId);
  if (status) result = result.filter(a => a.status === status);

  res.json(result);
});

router.post("/anamnese", async (req, res): Promise<void> => {
  const parsed = CriarAnamneseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [anamnese] = await db.insert(anamnesesTable).values(parsed.data).returning();
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, anamnese.pacienteId));
  res.status(201).json({ ...anamnese, pacienteNome: paciente?.nome });
});

router.get("/anamnese/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [anamnese] = await db
    .select({
      id: anamnesesTable.id,
      pacienteId: anamnesesTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      status: anamnesesTable.status,
      respostasClincias: anamnesesTable.respostasClincias,
      respostasFinanceiras: anamnesesTable.respostasFinanceiras,
      respostasPreferencias: anamnesesTable.respostasPreferencias,
      sinaisSemanticos: anamnesesTable.sinaisSemanticos,
      motorAtivadoEm: anamnesesTable.motorAtivadoEm,
      criadoEm: anamnesesTable.criadoEm,
      atualizadoEm: anamnesesTable.atualizadoEm,
    })
    .from(anamnesesTable)
    .leftJoin(pacientesTable, eq(anamnesesTable.pacienteId, pacientesTable.id))
    .where(eq(anamnesesTable.id, id));
  if (!anamnese) { res.status(404).json({ error: "Anamnese não encontrada" }); return; }
  res.json(anamnese);
});

router.put("/anamnese/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = AtualizarAnamneseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [anamnese] = await db.update(anamnesesTable).set(parsed.data).where(eq(anamnesesTable.id, id)).returning();
  if (!anamnese) { res.status(404).json({ error: "Anamnese não encontrada" }); return; }
  res.json(anamnese);
});

// Motor Clínico — geração de sugestões com base nos sinais semânticos
router.post("/anamnese/:id/ativar-motor", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [anamnese] = await db.select().from(anamnesesTable).where(eq(anamnesesTable.id, id));
  if (!anamnese) { res.status(404).json({ error: "Anamnese não encontrada" }); return; }

  // Gerar sinais semânticos com base nas respostas
  const sinais: string[] = [];
  const respostas = (anamnese.respostasClincias as Record<string, unknown>) || {};

  if (respostas.fadiga) sinais.push("fadiga_cronica");
  if (respostas.insonia) sinais.push("disturbio_sono");
  if (respostas.ansiedade) sinais.push("ansiedade");
  if (respostas.tdah) sinais.push("tdah");
  if (respostas.hormonal) sinais.push("desequilibrio_hormonal");
  if (respostas.imunidade) sinais.push("baixa_imunidade");
  if (respostas.emagrecimento) sinais.push("programa_emagrecimento");
  if (respostas.performance) sinais.push("performance_cognitiva");
  if (sinais.length === 0) sinais.push("avaliacao_geral", "bem_estar");

  // Buscar itens terapêuticos disponíveis
  const itensDisponiveis = await db
    .select()
    .from(itensTerapeuticosTable)
    .where(eq(itensTerapeuticosTable.disponivel, true));

  // Gerar sugestões automáticas baseadas nos sinais
  const sugestoesDados: Array<{
    anamneseId: number;
    pacienteId: number;
    tipo: "exame" | "formula" | "injetavel_im" | "injetavel_ev" | "implante" | "protocolo";
    itemTerapeuticoId?: number;
    itemNome: string;
    itemDescricao?: string;
    justificativa: string;
    prioridade: "baixa" | "media" | "alta" | "urgente";
  }> = [];

  for (const sinal of sinais) {
    const itensRelacionados = itensDisponiveis.filter(item => {
      const tags = item.tags || [];
      return tags.some(tag =>
        tag.toLowerCase().includes(sinal.toLowerCase().replace(/_/g, " ")) ||
        sinal.toLowerCase().includes(tag.toLowerCase().replace(/ /g, "_"))
      );
    });

    if (itensRelacionados.length > 0) {
      const item = itensRelacionados[0];
      sugestoesDados.push({
        anamneseId: id,
        pacienteId: anamnese.pacienteId,
        tipo: item.categoria as "exame" | "formula" | "injetavel_im" | "injetavel_ev" | "implante" | "protocolo",
        itemTerapeuticoId: item.id,
        itemNome: item.nome,
        itemDescricao: item.descricao || undefined,
        justificativa: `Indicado com base no sinal semântico: ${sinal.replace(/_/g, " ")}`,
        prioridade: "media",
      });
    }
  }

  // Se não gerou sugestões, sugerir avaliação geral
  if (sugestoesDados.length === 0 && itensDisponiveis.length > 0) {
    const exame = itensDisponiveis.find(i => i.categoria === "exame");
    if (exame) {
      sugestoesDados.push({
        anamneseId: id,
        pacienteId: anamnese.pacienteId,
        tipo: "exame",
        itemTerapeuticoId: exame.id,
        itemNome: exame.nome,
        justificativa: "Avaliação inicial completa recomendada",
        prioridade: "media",
      });
    }
  }

  let sugestoesGeradas: typeof sugestoesDados = [];
  if (sugestoesDados.length > 0) {
    sugestoesGeradas = await db.insert(sugestoesTable).values(sugestoesDados).returning() as typeof sugestoesDados;
  }

  // Atualizar anamnese com sinais e timestamp
  await db.update(anamnesesTable).set({
    sinaisSemanticos: sinais,
    motorAtivadoEm: new Date(),
    status: "concluida",
  }).where(eq(anamnesesTable.id, id));

  res.json({
    anamneseId: id,
    sinaisSemanticos: sinais,
    sugestoesGeradas,
    totalSugestoes: sugestoesGeradas.length,
  });
});

export default router;
