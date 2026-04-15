import { Router } from "express";
import { db } from "@workspace/db";
import { termosJuridicosTable, termosAssinadosTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/termos-juridicos", async (_req, res): Promise<void> => {
  const termos = await db.select().from(termosJuridicosTable)
    .where(eq(termosJuridicosTable.ativo, true))
    .orderBy(termosJuridicosTable.bloco, termosJuridicosTable.subgrupo);
  res.json(termos);
});

router.get("/termos-juridicos/todos", async (_req, res): Promise<void> => {
  const termos = await db.select().from(termosJuridicosTable)
    .orderBy(termosJuridicosTable.bloco, termosJuridicosTable.subgrupo);
  res.json(termos);
});

router.get("/termos-juridicos/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }
  const [termo] = await db.select().from(termosJuridicosTable).where(eq(termosJuridicosTable.id, id));
  if (!termo) { res.status(404).json({ error: "Termo nao encontrado" }); return; }
  res.json(termo);
});

router.get("/termos-juridicos/bloco/:bloco", async (req, res): Promise<void> => {
  const bloco = req.params.bloco.toUpperCase();
  const termos = await db.select().from(termosJuridicosTable)
    .where(and(eq(termosJuridicosTable.bloco, bloco), eq(termosJuridicosTable.ativo, true)));
  res.json(termos);
});

router.get("/termos-juridicos/consentimento/:codigo", async (req, res): Promise<void> => {
  const codigo = req.params.codigo.toUpperCase();
  const termos = await db.select().from(termosJuridicosTable)
    .where(and(eq(termosJuridicosTable.consentimento, codigo), eq(termosJuridicosTable.ativo, true)));
  res.json(termos);
});

router.post("/termos-juridicos", async (req, res): Promise<void> => {
  const { bloco, subgrupo, consentimento, titulo, textoCompleto, categoria, riscosEspecificos, metadados } = req.body;
  if (!bloco || !subgrupo || !titulo || !textoCompleto || !categoria) {
    res.status(400).json({ error: "bloco, subgrupo, titulo, textoCompleto e categoria sao obrigatorios" });
    return;
  }
  const [termo] = await db.insert(termosJuridicosTable).values({
    bloco, subgrupo, consentimento: consentimento || null,
    titulo, textoCompleto, categoria,
    riscosEspecificos: riscosEspecificos || [],
    metadados: metadados || {},
  }).returning();
  res.status(201).json(termo);
});

router.put("/termos-juridicos/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalido" }); return; }

  const [existing] = await db.select().from(termosJuridicosTable).where(eq(termosJuridicosTable.id, id));
  if (!existing) { res.status(404).json({ error: "Termo nao encontrado" }); return; }

  const allowedFields = ["titulo", "textoCompleto", "categoria", "riscosEspecificos", "metadados", "ativo"];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (req.body.textoCompleto && req.body.textoCompleto !== existing.textoCompleto) {
    updates.versao = existing.versao + 1;
  }

  updates.atualizadoEm = new Date();

  const [updated] = await db.update(termosJuridicosTable)
    .set(updates)
    .where(eq(termosJuridicosTable.id, id))
    .returning();
  res.json(updated);
});

router.post("/termos-juridicos/:termoId/assinar", async (req, res): Promise<void> => {
  const termoId = Number(req.params.termoId);
  if (isNaN(termoId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const { pacienteId, meioAssinatura, profissionalResponsavel, observacao } = req.body;
  if (!pacienteId) { res.status(400).json({ error: "pacienteId e obrigatorio" }); return; }

  const [termo] = await db.select().from(termosJuridicosTable).where(eq(termosJuridicosTable.id, termoId));
  if (!termo) { res.status(404).json({ error: "Termo nao encontrado" }); return; }

  const [assinatura] = await db.insert(termosAssinadosTable).values({
    pacienteId: Number(pacienteId),
    termoId,
    versaoAssinada: termo.versao,
    tituloTermo: termo.titulo,
    textoNoMomentoAssinatura: termo.textoCompleto,
    meioAssinatura: meioAssinatura || "presencial",
    profissionalResponsavel: profissionalResponsavel || null,
    observacao: observacao || null,
  }).returning();

  res.status(201).json({
    assinatura,
    mensagem: `Termo "${termo.titulo}" v${termo.versao} assinado pelo paciente ${pacienteId}`,
  });
});

router.get("/termos-juridicos/assinaturas/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = Number(req.params.pacienteId);
  if (isNaN(pacienteId)) { res.status(400).json({ error: "ID invalido" }); return; }

  const assinaturas = await db.select().from(termosAssinadosTable)
    .where(eq(termosAssinadosTable.pacienteId, pacienteId))
    .orderBy(desc(termosAssinadosTable.dataAssinatura));
  res.json(assinaturas);
});

router.post("/termos-juridicos/seed", async (_req, res): Promise<void> => {
  const existing = await db.select().from(termosJuridicosTable);
  if (existing.length > 0) {
    res.json({ mensagem: "Seed ja executado", total: existing.length });
    return;
  }

  const termosSeed = [
    {
      bloco: "JURI", subgrupo: "JURI.BASE", consentimento: null,
      titulo: "Consentimento LGPD — Lei Geral de Protecao de Dados",
      categoria: "lgpd" as const,
      textoCompleto: "Autorizo o Instituto Padua (PADUCCIA CLINICA MEDICA LTDA, CNPJ 63.865.940/0001-63) a coletar, armazenar, processar e utilizar meus dados pessoais e dados sensiveis de saude exclusivamente para fins de: prestacao de servicos medicos e acompanhamento clinico; elaboracao de prontuario eletronico e relatorios clinicos (RASX/REVO); comunicacao via WhatsApp e email para fins clinicos e agendamento; armazenamento em nuvem (Google Drive) com acesso restrito ao medico responsavel; geracao de PDFs clinicos, evolutivos e juridicos para uso exclusivo do paciente e equipe medica. Os dados serao mantidos pelo prazo minimo de 20 anos conforme Resolucao CFM 1.821/2007. O titular pode solicitar acesso, correcao, anonimizacao ou eliminacao dos dados (quando permitido por lei) a qualquer momento.",
      riscosEspecificos: [],
    },
    {
      bloco: "JURI", subgrupo: "JURI.BASE", consentimento: null,
      titulo: "Politica de Privacidade e Sigilo Medico",
      categoria: "privacidade" as const,
      textoCompleto: "O Instituto Padua e o profissional responsavel comprometem-se a manter sigilo absoluto sobre todas as informacoes clinicas conforme art. 73 do Codigo de Etica Medica e art. 154 do Codigo Penal. Nao compartilhar dados com terceiros sem autorizacao expressa, exceto quando exigido por lei ou ordem judicial.",
      riscosEspecificos: [],
    },
    {
      bloco: "JURI", subgrupo: "JURI.BASE", consentimento: null,
      titulo: "Termo de Nao-Garantia de Resultados",
      categoria: "nao_garantia" as const,
      textoCompleto: "A Medicina nao e uma ciencia exata. Resultados variam conforme caracteristicas individuais, adesao ao tratamento, fatores geneticos, ambientais e comportamentais. O medico se compromete a empregar os melhores recursos disponiveis, baseados em evidencias cientificas.",
      riscosEspecificos: [],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: null,
      titulo: "Termo de Consentimento Livre e Esclarecido (TCLE Global)",
      categoria: "tcle_global" as const,
      textoCompleto: "Declaro que fui informado(a) pelo profissional responsavel sobre meu quadro clinico, incluindo diagnosticos, prognosticos, riscos e alternativas terapeuticas. Autorizo a realizacao dos procedimentos necessarios, incluindo solicitacao de exames complementares, ajuste de posologia e substituicao terapeutica, conforme evolucao clinica.",
      riscosEspecificos: [],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CFOR",
      titulo: "Consentimento Especifico — Formulas Manipuladas (CFOR)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas das formulas manipuladas prescritas.",
      riscosEspecificos: [
        "Variacao individual na absorcao e resposta as formulas manipuladas",
        "Interacoes medicamentosas entre componentes da formula",
        "Necessidade de ajuste de dosagem conforme resposta clinica",
        "Possiveis efeitos gastrointestinais transitoveis",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CIMU",
      titulo: "Consentimento Especifico — Injetaveis Intramusculares (CIMU)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas dos injetaveis intramusculares prescritos.",
      riscosEspecificos: [
        "Dor local no ponto de aplicacao",
        "Formacao de hematoma ou nodulo no local",
        "Necessidade de monitoramento clinico apos aplicacao",
        "Variacao individual na absorcao intramuscular",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CEND",
      titulo: "Consentimento Especifico — Injetaveis Endovenosos (CEND)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas dos injetaveis endovenosos prescritos.",
      riscosEspecificos: [
        "Risco de reacao imediata durante infusao endovenosa",
        "Necessidade de ambiente controlado e supervisionado",
        "Possibilidade de flebite ou infiltracao no acesso venoso",
        "Protocolo de seguranca com observacao pos-infusao",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CIMP",
      titulo: "Consentimento Especifico — Implantes (CIMP)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas dos implantes hormonais/terapeuticos.",
      riscosEspecificos: [
        "Efeitos sistemicos do implante hormonal/terapeutico",
        "Necessidade de exames previos e acompanhamento",
        "Nao reversao imediata apos implantacao",
        "Possivel necessidade de remocao cirurgica",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CEIN",
      titulo: "Consentimento Especifico — Estetica Invasiva (CEIN)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas dos procedimentos esteticos invasivos.",
      riscosEspecificos: [
        "Possibilidade de assimetria nos resultados",
        "Risco de hematoma, edema ou equimose",
        "Resultado variavel conforme resposta individual",
        "Necessidade de sessoes complementares",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.CONS", consentimento: "CETE",
      titulo: "Consentimento Especifico — Estetica por Tecnologia (CETE)",
      categoria: "consentimento_especifico" as const,
      textoCompleto: "Declaro estar ciente dos riscos e caracteristicas especificas dos procedimentos esteticos por tecnologia.",
      riscosEspecificos: [
        "Risco de queimadura por energia termica ou luminosa",
        "Sensibilidade ao fototipo do paciente",
        "Possibilidade de hiperpigmentacao ou hipopigmentacao",
        "Necessidade de cuidados pos-procedimento rigorosos",
      ],
    },
    {
      bloco: "JURI", subgrupo: "JURI.IMAG", consentimento: null,
      titulo: "Autorizacao de Uso de Imagem",
      categoria: "imagem" as const,
      textoCompleto: "Autorizo / nao autorizo (riscar o que nao se aplica) o uso de minha imagem (fotografias e videos) para fins de: documentacao clinica e prontuario medico; apresentacao em congressos e eventos cientificos (sem identificacao); material educativo (sem identificacao); divulgacao institucional (com identificacao — requer autorizacao separada). A autorizacao pode ser revogada a qualquer momento, sem prejuizo do tratamento.",
      riscosEspecificos: [],
    },
    {
      bloco: "JURI", subgrupo: "JURI.DIGI", consentimento: null,
      titulo: "Termo de Aceite Digital e Assinatura",
      categoria: "aceite_digital" as const,
      textoCompleto: "Declaro que tomei ciencia de todos os termos, consentimentos e documentos apresentados. A assinatura digital tem validade juridica conforme MP 2.200-2/2001 e Lei 14.063/2020.",
      riscosEspecificos: [],
    },
    {
      bloco: "FINA", subgrupo: "FINA.CIEN", consentimento: null,
      titulo: "Termo de Ciencia Financeira",
      categoria: "ciencia_financeira" as const,
      textoCompleto: "Declaro estar ciente dos valores, condicoes de pagamento e politica financeira para o tratamento proposto. Compreendo que ajustes no protocolo podem alterar os valores. Fui informado(a) sobre as formas de pagamento disponiveis. Estou ciente da politica de cancelamento e reembolso. Compreendo que a inadimplencia pode resultar em suspensao do tratamento.",
      riscosEspecificos: [],
    },
  ];

  const inserted = await db.insert(termosJuridicosTable).values(termosSeed).returning();

  res.status(201).json({
    sucesso: true,
    mensagem: `Seed concluido: ${inserted.length} termos juridicos criados`,
    total: inserted.length,
    termos: inserted.map(t => ({ id: t.id, titulo: t.titulo, bloco: t.bloco, subgrupo: t.subgrupo, consentimento: t.consentimento, versao: t.versao })),
  });
});

export default router;
