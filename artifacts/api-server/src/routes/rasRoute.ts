import { Router } from "express";
import { db } from "@workspace/db";
import {
  rasTable, insertRasSchema, sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, usuariosTable, unidadesTable,
  codigosValidacaoTable, insertCodigoValidacaoSchema,
  estoqueItensTable, insertEstoqueItemSchema,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { gerarPdfRAS } from "../pdf/gerarRAS";

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

router.get("/ras/pdf/paciente/:pacienteId", async (req, res) => {
  try {
    const pacienteId = Number(req.params.pacienteId);
    const protocoloId = req.query.protocoloId ? Number(req.query.protocoloId) : undefined;

    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
    if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }

    const sessConditions: any[] = [eq(sessoesTable.pacienteId, pacienteId)];
    if (protocoloId) sessConditions.push(eq(sessoesTable.protocoloId, protocoloId));

    const sessoes = await db
      .select({
        sessao: sessoesTable,
        profissionalNome: usuariosTable.nome,
        profissionalCrm: usuariosTable.crm,
        unidadeNome: unidadesTable.nome,
        unidadeEndereco: unidadesTable.endereco,
      })
      .from(sessoesTable)
      .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
      .where(and(...sessConditions))
      .orderBy(sessoesTable.numeroSemana);

    if (sessoes.length === 0) {
      res.status(404).json({ error: "Nenhuma sessao encontrada para este paciente" });
      return;
    }

    const sessaoIds = sessoes.map((s) => s.sessao.id);
    const aplicacoesBySessao: Record<number, Array<{
      aplicacao: typeof aplicacoesSubstanciasTable.$inferSelect;
      substancia: typeof substanciasTable.$inferSelect | null;
    }>> = {};

    for (const sessaoId of sessaoIds) {
      const apps = await db
        .select({
          aplicacao: aplicacoesSubstanciasTable,
          substancia: substanciasTable,
        })
        .from(aplicacoesSubstanciasTable)
        .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
        .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));
      aplicacoesBySessao[sessaoId] = apps;
    }

    const substanciaMap = new Map<number, any>();
    for (const sessaoApps of Object.values(aplicacoesBySessao)) {
      for (const app of sessaoApps) {
        if (app.substancia && !substanciaMap.has(app.substancia.id)) {
          substanciaMap.set(app.substancia.id, app.substancia);
        }
      }
    }

    const substanciaList = Array.from(substanciaMap.values());
    const substanciaIndexMap = new Map<number, number>();
    substanciaList.forEach((s, i) => substanciaIndexMap.set(s.id, i));

    const firstSessao = sessoes[0];
    const medicoNome = firstSessao.profissionalNome || "N/A";
    const medicoCrm = firstSessao.profissionalCrm || "";

    const enfermeiraNome = req.query.enfermeira ? String(req.query.enfermeira) : "N/A";

    const substanciasRAS = substanciaList.map((sub) => {
      const firstApp = Object.values(aplicacoesBySessao)
        .flat()
        .find((a) => a.substancia?.id === sub.id);

      const totalSessoes = firstApp?.aplicacao.totalSessoes || sub.maxSessoesPorSemana || 10;
      const firstSessaoWithSub = sessoes.find((s) => {
        const apps = aplicacoesBySessao[s.sessao.id] || [];
        return apps.some((a) => a.substancia?.id === sub.id);
      });

      return {
        nome: sub.nome,
        abreviacao: sub.abreviacao || sub.nome.substring(0, 6),
        qtde: totalSessoes,
        frequenciaDias: sub.intervaloDias || 7,
        dataInicio: firstSessaoWithSub?.sessao.dataAgendada || sessoes[0].sessao.dataAgendada,
        via: sub.via,
        cor: sub.cor || "#3B82F6",
        dosePadrao: sub.dosePadrao || "",
        categoria: sub.categoria || "",
        descricao: sub.descricao || "",
        funcaoPrincipal: sub.funcaoPrincipal || "",
        efeitosPercebidos: sub.efeitosPercebidos || "",
        tempoParaEfeito: sub.tempoParaEfeito || "",
        beneficioLongevidade: sub.beneficioLongevidade || "",
        impactoQualidadeVida: sub.impactoQualidadeVida || "",
        beneficioSono: sub.beneficioSono || "",
        beneficioEnergia: sub.beneficioEnergia || "",
        beneficioLibido: sub.beneficioLibido || "",
        performanceFisica: sub.performanceFisica || "",
        forcaMuscular: sub.forcaMuscular || "",
        clarezaMental: sub.clarezaMental || "",
        peleCabeloUnhas: sub.peleCabeloUnhas || "",
        suporteImunologico: sub.suporteImunologico || "",
        contraindicacoes: sub.contraindicacoes || "",
        evidenciaCientifica: sub.evidenciaCientifica || "",
        efeitosSistemasCorporais: (sub.efeitosSistemasCorporais as Record<string, number>) || {},
      };
    });

    const marcacoes = [];
    for (let i = 0; i < 20; i++) {
      const sessao = sessoes[i];
      const marcacao: any = {
        numero: i + 1,
        dataPrevista: "",
        dataEfetiva: "",
        statusPorSubstancia: [],
      };

      if (sessao) {
        marcacao.dataPrevista = sessao.sessao.dataAgendada;
        if (sessao.sessao.status === "concluida" || sessao.sessao.status === "parcial") {
          marcacao.dataEfetiva = sessao.sessao.dataAgendada;
        }

        const apps = aplicacoesBySessao[sessao.sessao.id] || [];
        apps.forEach((app) => {
          if (app.substancia) {
            const idx = substanciaIndexMap.get(app.substancia.id);
            if (idx !== undefined) {
              marcacao.statusPorSubstancia.push({
                substanciaIndex: idx,
                numeroSessao: app.aplicacao.numeroSessao,
                totalSessoes: app.aplicacao.totalSessoes,
                status: app.aplicacao.status,
              });
            }
          }
        });
      } else {
        const baseDate = new Date(sessoes[0].sessao.dataAgendada);
        const predictedDate = new Date(baseDate);
        predictedDate.setDate(predictedDate.getDate() + i * 7);
        marcacao.dataPrevista = predictedDate.toISOString().split("T")[0];
      }

      marcacoes.push(marcacao);
    }

    const idade = paciente.dataNascimento
      ? Math.floor((Date.now() - new Date(paciente.dataNascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const dadosRAS = {
      nomePaciente: paciente.nome,
      cpfPaciente: paciente.cpf || "",
      celularPaciente: paciente.celular || "",
      idadePaciente: idade,
      medicoResponsavel: medicoNome,
      crmMedico: medicoCrm,
      enfermeira: enfermeiraNome,
      agenda: firstSessao.unidadeNome || "N/A",
      unidadeEndereco: firstSessao.unidadeEndereco || "",
      dataAtendimento: sessoes[0].sessao.dataAgendada,
      substancias: substanciasRAS,
      marcacoes,
      nomeProtocolo: "",
    };

    const pdfBuffer = await gerarPdfRAS(dadosRAS);

    const nomeArquivo = `RAS_${paciente.nome.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nomeArquivo}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar RAS PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF do RAS", details: err.message });
  }
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
