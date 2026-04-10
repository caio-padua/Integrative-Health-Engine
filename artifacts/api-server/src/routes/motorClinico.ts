import { Router } from "express";
import {
  db, sugestoesTable, pacientesTable, itensTerapeuticosTable, usuariosTable,
  injetaveisTable, endovenososTable, implantesTable, formulasTable,
  protocolosMasterTable, examesBaseTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { ValidarSugestaoBody, CriarItemTerapeuticoBody, ToggleItemTerapeuticoBody } from "@workspace/api-zod";

const router = Router();

router.get("/motor-clinico/sugestoes", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const tipo = req.query.tipo as string | undefined;

  const sugestoes = await db
    .select({
      id: sugestoesTable.id,
      anamneseId: sugestoesTable.anamneseId,
      pacienteId: sugestoesTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      tipo: sugestoesTable.tipo,
      itemTerapeuticoId: sugestoesTable.itemTerapeuticoId,
      itemNome: sugestoesTable.itemNome,
      itemDescricao: sugestoesTable.itemDescricao,
      justificativa: sugestoesTable.justificativa,
      prioridade: sugestoesTable.prioridade,
      status: sugestoesTable.status,
      validadoPorId: sugestoesTable.validadoPorId,
      validadoPorNome: usuariosTable.nome,
      validadoEm: sugestoesTable.validadoEm,
      observacaoValidacao: sugestoesTable.observacaoValidacao,
      criadoEm: sugestoesTable.criadoEm,
    })
    .from(sugestoesTable)
    .leftJoin(pacientesTable, eq(sugestoesTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(sugestoesTable.validadoPorId, usuariosTable.id));

  let result = sugestoes;
  if (pacienteId) result = result.filter(s => s.pacienteId === pacienteId);
  if (status) result = result.filter(s => s.status === status);
  if (tipo) result = result.filter(s => s.tipo === tipo);

  res.json(result);
});

router.post("/motor-clinico/sugestoes/:id/validar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ValidarSugestaoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { acao, observacao, validadoPorId } = parsed.data;
  const novoStatus = acao === "validar" ? "validado" : "rejeitado";
  const [sugestao] = await db
    .update(sugestoesTable)
    .set({
      status: novoStatus,
      validadoPorId,
      observacaoValidacao: observacao,
      validadoEm: new Date(),
    })
    .where(eq(sugestoesTable.id, id))
    .returning();
  if (!sugestao) { res.status(404).json({ error: "Sugestão não encontrada" }); return; }
  res.json(sugestao);
});

router.get("/motor-clinico/itens-terapeuticos", async (req, res): Promise<void> => {
  const categoria = req.query.categoria as string | undefined;
  const disponivel = req.query.disponivel !== undefined ? req.query.disponivel === "true" : undefined;

  const itens = await db.select().from(itensTerapeuticosTable).orderBy(itensTerapeuticosTable.nome);
  let result = itens;
  if (categoria) result = result.filter(i => i.categoria === categoria);
  if (disponivel !== undefined) result = result.filter(i => i.disponivel === disponivel);

  res.json(result);
});

router.post("/motor-clinico/itens-terapeuticos", async (req, res): Promise<void> => {
  const parsed = CriarItemTerapeuticoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(itensTerapeuticosTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.patch("/motor-clinico/itens-terapeuticos/:id/toggle", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ToggleItemTerapeuticoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(itensTerapeuticosTable)
    .set({ disponivel: parsed.data.disponivel })
    .where(eq(itensTerapeuticosTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  res.json(item);
});

router.post("/motor-clinico/sync-catalogo", async (_req, res): Promise<void> => {
  try {
    const [inj, endo, impl, form, proto, exames] = await Promise.all([
      db.select().from(injetaveisTable),
      db.select().from(endovenososTable),
      db.select().from(implantesTable),
      db.select().from(formulasTable),
      db.select().from(protocolosMasterTable),
      db.select().from(examesBaseTable),
    ]);

    function parseBRL(v: string | null | undefined): number | null {
      if (!v) return null;
      const s = String(v).replace(/[^\d.,]/g, "");
      if (!s) return null;
      const hasDotAndComma = s.includes(".") && s.includes(",");
      let normalized: string;
      if (hasDotAndComma) {
        normalized = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        normalized = s.replace(",", ".");
      } else {
        normalized = s;
      }
      const n = parseFloat(normalized);
      return isNaN(n) ? null : n;
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE sugestoes_clinicas SET item_terapeutico_id = NULL WHERE item_terapeutico_id IS NOT NULL`);
      await tx.delete(itensTerapeuticosTable);

    const batch: Array<{
      nome: string; descricao: string | null; categoria: "injetavel_im" | "injetavel_ev" | "implante" | "formula" | "protocolo" | "exame";
      subCategoria: string | null; codigoPadcom: string | null; blocoId: string | null;
      grau: string | null; viaUso: string | null; frequenciaBase: string | null;
      composicao: string | null; posologia: string | null; areaSemantica: string | null;
      disponivel: boolean; exigeValidacaoHumana: boolean; preco: number | null;
      tags: string[] | null;
    }> = [];

    const injAmpolas = new Map<string, { ampola: typeof inj[0]; componentes: typeof inj }>();
    inj.forEach(i => {
      if (!injAmpolas.has(i.codigoPadcom)) injAmpolas.set(i.codigoPadcom, { ampola: i, componentes: [] });
      const entry = injAmpolas.get(i.codigoPadcom)!;
      if (i.tipoLinha === "AMPOLA") entry.ampola = i;
      else entry.componentes.push(i);
    });
    injAmpolas.forEach((entry, codigo) => {
      const a = entry.ampola;
      const comps = entry.componentes.map(c => c.nomeExibicao).filter(Boolean);
      batch.push({
        nome: a.nomeExibicao || a.nomeAmpola,
        descricao: a.observacao,
        categoria: "injetavel_im",
        subCategoria: a.classificacao,
        codigoPadcom: codigo,
        blocoId: null,
        grau: null,
        viaUso: a.via,
        frequenciaBase: null,
        composicao: comps.length > 0 ? comps.join(", ") : null,
        posologia: a.dosagem ? `${a.dosagem}${a.volume ? ` / ${a.volume}` : ""}` : null,
        areaSemantica: a.eixoIntegrativo,
        disponivel: a.ativo !== false,
        exigeValidacaoHumana: false,
        preco: parseBRL(a.valorUnidade),
        tags: a.palavraChaveMotor ? a.palavraChaveMotor.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : null,
      });
    });

    const endoSoros = new Map<string, { soro: typeof endo[0] | null; componentes: typeof endo }>();
    endo.forEach(i => {
      if (!endoSoros.has(i.codigoPadcom)) endoSoros.set(i.codigoPadcom, { soro: null, componentes: [] });
      const entry = endoSoros.get(i.codigoPadcom)!;
      if (i.tipoLinha === "SORO") entry.soro = i;
      else entry.componentes.push(i);
    });
    endoSoros.forEach((entry, codigo) => {
      const s = entry.soro || entry.componentes[0];
      if (!s) return;
      const comps = entry.componentes.map(c => `${c.nomeExibicao || ""} ${c.dosagem || ""}`.trim()).filter(Boolean);
      batch.push({
        nome: s.nomeExibicao || s.nomeSoro || codigo,
        descricao: s.observacao,
        categoria: "injetavel_ev",
        subCategoria: s.classificacao,
        codigoPadcom: codigo,
        blocoId: null,
        grau: null,
        viaUso: s.via,
        frequenciaBase: s.frequenciaPadrao,
        composicao: comps.length > 0 ? comps.join(", ") : null,
        posologia: s.dosagem ? `${s.dosagem}${s.volume ? ` / ${s.volume}` : ""}` : null,
        areaSemantica: s.eixoIntegrativo,
        disponivel: s.ativo !== false,
        exigeValidacaoHumana: false,
        preco: parseBRL(s.valorUnidade),
        tags: s.palavraChaveMotor ? s.palavraChaveMotor.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : null,
      });
    });

    impl.forEach(i => {
      batch.push({
        nome: i.nomeImplante,
        descricao: `${i.substanciaAtiva} — ${i.indicacao || ""}`.trim(),
        categoria: "implante",
        subCategoria: null,
        codigoPadcom: i.codigoPadcom,
        blocoId: null,
        grau: null,
        viaUso: i.via,
        frequenciaBase: i.tempoAcao,
        composicao: i.substanciaAtiva,
        posologia: i.dosagem ? `${i.dosagem} ${i.unidade || ""} — ${i.doseRecomendada || ""} pellets`.trim() : null,
        areaSemantica: null,
        disponivel: i.ativo !== false,
        exigeValidacaoHumana: false,
        preco: parseBRL(i.valorUnidade),
        tags: null,
      });
    });

    const formulaMap = new Map<string, { titulo: typeof form[0] | null; componentes: typeof form }>();
    form.forEach(f => {
      if (!formulaMap.has(f.codigoPadcom)) formulaMap.set(f.codigoPadcom, { titulo: null, componentes: [] });
      const entry = formulaMap.get(f.codigoPadcom)!;
      if (f.identificador === "TITL") entry.titulo = f;
      else entry.componentes.push(f);
    });
    formulaMap.forEach((entry, codigo) => {
      const t = entry.titulo;
      const subs = entry.componentes.filter(c => c.identificador?.startsWith("SUBS")).map(c => c.conteudo).filter(Boolean);
      const via = entry.componentes.find(c => c.identificador === "VIA");
      const poso = entry.componentes.filter(c => c.identificador?.startsWith("POSO")).map(c => c.conteudo).filter(Boolean);
      const obs = entry.componentes.find(c => c.identificador === "OBS");
      batch.push({
        nome: t?.conteudo || codigo,
        descricao: obs?.conteudo || null,
        categoria: "formula",
        subCategoria: t?.funcao || null,
        codigoPadcom: codigo,
        blocoId: null,
        grau: null,
        viaUso: via?.conteudo || null,
        frequenciaBase: null,
        composicao: subs.length > 0 ? subs.join(", ") : null,
        posologia: poso.length > 0 ? poso.join("; ") : null,
        areaSemantica: t?.area || null,
        disponivel: true,
        exigeValidacaoHumana: false,
        preco: parseBRL(t?.valorUnidade),
        tags: null,
      });
    });

    proto.forEach(p => {
      batch.push({
        nome: p.nome,
        descricao: p.objetivo,
        categoria: "protocolo",
        subCategoria: p.modoOferta,
        codigoPadcom: p.codigoProtocolo,
        blocoId: null,
        grau: null,
        viaUso: null,
        frequenciaBase: null,
        composicao: null,
        posologia: null,
        areaSemantica: p.area,
        disponivel: p.status === "ATIVO",
        exigeValidacaoHumana: false,
        preco: parseBRL(p.valorTotal),
        tags: null,
      });
    });

    exames.forEach(e => {
      batch.push({
        nome: e.nomeExame,
        descricao: e.legendaRapida || e.justificativaObjetiva || null,
        categoria: "exame",
        subCategoria: e.modalidade,
        codigoPadcom: e.codigoExame,
        blocoId: e.blocoOficial || null,
        grau: e.grauDoBloco || null,
        viaUso: e.materialOuSetor || null,
        frequenciaBase: e.frequenciaProtocoloPadua || null,
        composicao: null,
        posologia: null,
        areaSemantica: e.grupoPrincipal || null,
        disponivel: e.ativo !== false,
        exigeValidacaoHumana: e.exigeValidacaoHumana === "SIM",
        preco: null,
        tags: [e.finalidadePrincipal, e.finalidadeSecundaria].filter(Boolean) as string[],
      });
    });

    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      await tx.insert(itensTerapeuticosTable).values(chunk);
      inserted += chunk.length;
    }

    return inserted;
    });

    res.json({
      success: true,
      total: result,
      detalhes: {
        injetavel_im: inj.filter(i => i.tipoLinha === "AMPOLA").length || new Set(inj.map(i => i.codigoPadcom)).size,
        injetavel_ev: new Set(endo.map(i => i.codigoPadcom)).size,
        implante: impl.length,
        formula: new Set(form.map(f => f.codigoPadcom)).size,
        protocolo: proto.length,
        exame: exames.length,
      },
    });
  } catch (error: any) {
    console.error("Erro no sync-catalogo:", error);
    res.status(500).json({ error: "Falha na sincronizacao do catalogo" });
  }
});

export default router;
