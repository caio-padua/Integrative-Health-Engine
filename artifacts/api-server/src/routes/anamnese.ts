import { Router } from "express";
import { db, anamnesesTable, pacientesTable, sugestoesTable, itensTerapeuticosTable, regrasMotorTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarAnamneseBody, AtualizarAnamneseBody } from "@workspace/api-zod";

const router = Router();

// Retorna estrutura do questionario PADCOM V9
router.get("/anamnese/questionario", async (_req, res): Promise<void> => {
  res.json({
    versao: "PADCOM V9",
    blocos: [
      {
        bloco: "IDENTIFICACAO",
        perguntas: [
          { id: "Q001", pergunta: "Nome Completo", tipo: "texto", obrigatorio: true },
          { id: "Q002", pergunta: "CPF", tipo: "texto", obrigatorio: true },
        ],
      },
      {
        bloco: "CLINICO",
        perguntas: [
          { id: "Q010", pergunta: "Queixa Principal", tipo: "texto_longo", obrigatorio: true, placeholder: "Descreva sua principal queixa ou motivo da consulta" },
          { id: "Q011", pergunta: "Duracao da Queixa", tipo: "texto_curto", obrigatorio: true, placeholder: "Ex: 6 meses, 2 anos" },
          {
            id: "Q012",
            pergunta: "Sintomas Atuais",
            tipo: "multiselecao",
            obrigatorio: true,
            opcoes: [
              "FADIGA", "CONSTIPACAO", "INSONIA", "ANSIEDADE", "GANHO DE PESO",
              "QUEDA DE CABELO", "CANSACO", "IRRITABILIDADE", "DOR MUSCULAR",
              "BAIXA LIBIDO", "RETENCAO DE LIQUIDO", "SUDORESE NOTURNA",
              "FRIO NAS EXTREMIDADES", "DEPRESSAO", "DIFICULDADE DE CONCENTRACAO",
              "DORES DE CABECA", "DISTENSAO ABDOMINAL", "GASES", "REFLUXO",
            ],
          },
          {
            id: "Q013",
            pergunta: "Doencas Diagnosticadas",
            tipo: "multiselecao",
            obrigatorio: false,
            opcoes: [
              "HIPOTIREOIDISMO", "HIPERTIREOIDISMO", "HASHIMOTO", "DIABETES",
              "RESISTENCIA INSULINICA", "ENDOMETRIOSE", "SINDROME DO OVARIO POLICISTICO",
              "HIPERTENSAO", "COLESTEROL ALTO", "FIBROMIALGIA", "LUPUS",
              "ARTRITE REUMATOIDE", "DEPRESSAO", "ANSIEDADE GENERALIZADA",
              "TDAH", "DOENCA HEPATICA", "DOENCA RENAL", "OUTROS",
            ],
          },
          {
            id: "Q014",
            pergunta: "Historico Familiar",
            tipo: "multiselecao",
            obrigatorio: false,
            opcoes: [
              "DIABETES", "INFARTO", "AVC", "CANCER", "ALZHEIMER",
              "HIPOTIREOIDISMO", "DOENCA HEPATICA", "DOENCA RENAL", "OUTROS",
            ],
          },
          { id: "Q015", pergunta: "Cirurgias Previas", tipo: "texto_longo", obrigatorio: false, placeholder: "Descreva se houver" },
          { id: "Q016", pergunta: "Internacoes Previas", tipo: "texto_longo", obrigatorio: false, placeholder: "Descreva se houver" },
          { id: "Q017", pergunta: "Alergias ou Intolerancias", tipo: "texto_longo", obrigatorio: false, placeholder: "Ex: Lactose, Gluten, Antibioticos" },
        ],
      },
      {
        bloco: "PREFERENCIA",
        perguntas: [
          { id: "Q030", pergunta: "Deseja somente exames (sem prescricoes)?", tipo: "sim_nao", obrigatorio: true },
          { id: "Q031", pergunta: "Aceita formulas manipuladas?", tipo: "sim_nao", obrigatorio: true },
          { id: "Q032", pergunta: "Aceita protocolo injetavel (IM/EV)?", tipo: "sim_nao", obrigatorio: true },
          { id: "Q033", pergunta: "Aceita implante subdermal?", tipo: "sim_nao", obrigatorio: true },
        ],
      },
      {
        bloco: "FINANCEIRO",
        perguntas: [
          {
            id: "Q040",
            pergunta: "Modelo de Investimento Preferido",
            tipo: "lista",
            obrigatorio: true,
            opcoes: ["TOTAL", "PARCELADO", "MENSAL"],
          },
          {
            id: "Q041",
            pergunta: "Conforto Financeiro",
            tipo: "lista",
            obrigatorio: true,
            opcoes: [
              { valor: "BASICO", descricao: "Basico — priorizar etapas essenciais" },
              { valor: "INTERMEDIARIO", descricao: "Intermediario — combinar exames e formulas" },
              { valor: "PREMIUM", descricao: "Premium — protocolo completo" },
            ],
          },
        ],
      },
    ],
  });
});

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

// ─── Motor Clínico PADCOM V9 ────────────────────────────────────────────────
// POST /anamnese/:id/ativar-motor
// Aplica as regras PADCOM do banco (regras_motor) sobre as respostas Q010-Q033
// para gerar sugestões semanticamente vinculadas.
router.post("/anamnese/:id/ativar-motor", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [anamnese] = await db.select().from(anamnesesTable).where(eq(anamnesesTable.id, id));
  if (!anamnese) { res.status(404).json({ error: "Anamnese não encontrada" }); return; }

  const respostasClincias = (anamnese.respostasClincias as Record<string, unknown>) || {};
  const respostasPreferencias = (anamnese.respostasPreferencias as Record<string, unknown>) || {};
  const respostasFinanceiras = (anamnese.respostasFinanceiras as Record<string, unknown>) || {};

  // ── 1. Extrair sinais semânticos das respostas ──────────────────────────
  const sinais: string[] = [];

  const queixaPrincipal = (respostasClincias.Q010 as string || "").toUpperCase();
  if (queixaPrincipal) sinais.push(queixaPrincipal);

  const sintomas = respostasClincias.Q012 as string[] || [];
  sintomas.forEach(s => sinais.push(s.toUpperCase()));

  const doencas = respostasClincias.Q013 as string[] || [];
  doencas.forEach(d => sinais.push(d.toUpperCase()));

  const historicoFamiliar = respostasClincias.Q014 as string[] || [];
  historicoFamiliar.forEach(h => sinais.push(h.toUpperCase()));

  // Adicionar sinais de preferência como trigger para implantes/injetáveis
  const aceitaInjetavel = String(respostasPreferencias.Q032 || "NAO").toUpperCase();
  const aceitaImplante = String(respostasPreferencias.Q033 || "NAO").toUpperCase();
  const somentExames = String(respostasPreferencias.Q030 || "NAO").toUpperCase();

  if (aceitaInjetavel === "SIM") sinais.push("Q031_SIM");
  if (aceitaImplante === "SIM") sinais.push("Q033_SIM");

  // Adicionar perfil financeiro como sinal
  const perfilFinanceiro = String(respostasFinanceiras.Q041 || "BASICO").toUpperCase();

  if (sinais.length === 0) sinais.push("AVALIACAO_GERAL");

  // ── 2. Carregar regras PADCOM do banco ─────────────────────────────────
  const todasRegras = await db.select().from(regrasMotorTable).where(eq(regrasMotorTable.ativo, "SIM"));

  // ── 3. Filtrar regras que fazem match com os sinais ────────────────────
  const regrasAtivadas = todasRegras.filter(regra => {
    const palavraChave = regra.palavraChave.toUpperCase();
    // Verificar match direto em sintomas, doenças, histórico familiar
    const matchSinal = sinais.some(sinal =>
      sinal.includes(palavraChave) || palavraChave.includes(sinal)
    );
    // Verificar match por perguntaId (ex: Q031 -> SIM)
    const matchPerguntaId = regra.perguntaId === "Q030" && somentExames === (palavraChave) ||
      regra.perguntaId === "Q031" && aceitaInjetavel === palavraChave ||
      regra.perguntaId === "Q033" && aceitaImplante === palavraChave;

    return matchSinal || matchPerguntaId;
  });

  // ── 4. Filtrar segmentos por preferências ──────────────────────────────
  let regrasEfetivas = regrasAtivadas.filter(regra => {
    if (somentExames === "SIM" && regra.segmento !== "exame") return false;
    if (regra.segmento === "injetavel" && aceitaInjetavel !== "SIM") return false;
    if (regra.segmento === "implante" && aceitaImplante !== "SIM") return false;

    // Filtro por perfil financeiro
    if (perfilFinanceiro === "BASICO" && regra.segmento === "implante") return false;
    if (perfilFinanceiro === "BASICO" && regra.segmento === "protocolo") return false;

    return true;
  });

  // Evitar duplicatas de código referência
  const codigosVistos = new Set<string>();
  regrasEfetivas = regrasEfetivas.filter(r => {
    const key = `${r.segmento}:${r.codigoReferencia}`;
    if (codigosVistos.has(key)) return false;
    codigosVistos.add(key);
    return true;
  });

  // ── 5. Buscar itens terapêuticos pelo código PADCOM ────────────────────
  const itensDisponiveis = await db.select().from(itensTerapeuticosTable)
    .where(eq(itensTerapeuticosTable.disponivel, true));

  const findItemPorCodigo = (codigo: string | null) =>
    codigo ? itensDisponiveis.find(i => i.codigoPadcom === codigo) : null;

  // ── 6. Montar sugestões ────────────────────────────────────────────────
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

  for (const regra of regrasEfetivas) {
    const item = findItemPorCodigo(regra.codigoReferencia);

    // Mapear segmento -> tipo do enum
    let tipo: "exame" | "formula" | "injetavel_im" | "injetavel_ev" | "implante" | "protocolo" = "exame";
    if (regra.segmento === "formula") tipo = "formula";
    else if (regra.segmento === "injetavel") {
      // Determinar IM ou EV pelo item
      tipo = item?.categoria === "injetavel_ev" ? "injetavel_ev" : "injetavel_im";
    }
    else if (regra.segmento === "implante") tipo = "implante";
    else if (regra.segmento === "protocolo") tipo = "protocolo";

    sugestoesDados.push({
      anamneseId: id,
      pacienteId: anamnese.pacienteId,
      tipo,
      itemTerapeuticoId: item?.id,
      itemNome: item?.nome || regra.codigoReferencia || regra.palavraChave,
      itemDescricao: item?.descricao || regra.observacao || undefined,
      justificativa: `Regra ${regra.regraId} (${regra.perguntaId}): Sinal "${regra.palavraChave}" — ${regra.observacao || ""}`,
      prioridade: regra.prioridade as "baixa" | "media" | "alta" | "urgente",
    });
  }

  // Se não gerou nenhuma sugestão, sugerir bloco base integrative
  if (sugestoesDados.length === 0) {
    const bloco = itensDisponiveis.find(i => i.codigoPadcom === "EXAM BASE BASI 001");
    if (bloco) {
      sugestoesDados.push({
        anamneseId: id,
        pacienteId: anamnese.pacienteId,
        tipo: "exame",
        itemTerapeuticoId: bloco.id,
        itemNome: bloco.nome,
        itemDescricao: bloco.descricao || undefined,
        justificativa: "BLK001 - Avaliacao integrativa base recomendada para todos os pacientes novos.",
        prioridade: "media",
      });
    }
  }

  let sugestoesGeradas: typeof sugestoesDados = [];
  if (sugestoesDados.length > 0) {
    sugestoesGeradas = await db.insert(sugestoesTable).values(sugestoesDados).returning() as typeof sugestoesDados;
  }

  // ── 7. Atualizar anamnese ──────────────────────────────────────────────
  const sinaisUnicos = [...new Set(sinais)];
  await db.update(anamnesesTable).set({
    sinaisSemanticos: sinaisUnicos,
    motorAtivadoEm: new Date(),
    status: "concluida",
  }).where(eq(anamnesesTable.id, id));

  res.json({
    anamneseId: id,
    sinaisSemanticos: sinaisUnicos,
    regrasAtivadas: regrasEfetivas.length,
    perfilFinanceiro,
    somentExames: somentExames === "SIM",
    sugestoesGeradas,
    totalSugestoes: sugestoesGeradas.length,
  });
});

export default router;
