import { Router } from "express";
import {
  db, sugestoesTable, pacientesTable, itensTerapeuticosTable, usuariosTable,
  injetaveisTable, endovenososTable, implantesTable, formulasTable,
  protocolosMasterTable, examesBaseTable, regrasMotorTable,
  questionarioMasterTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { ValidarSugestaoBody, CriarItemTerapeuticoBody, ToggleItemTerapeuticoBody } from "@workspace/api-zod";
import { requirePlataforma } from "../middlewares/requirePlataforma";

const router = Router();

// ══════════════════════════════════════════════════════════════════════
// CRANIOTOMIA — leitura e escrita REAL do grafo de regras do motor.
// `regras_motor` e GLOBAL (escopo Genesis, sem unidade_id): cada regra =
// uma sinapse "SE (pergunta + palavra-chave da anamnese) ENTAO (item
// terapeutico do segmento)". Alterar aqui propaga a todas as unidades que
// herdam do Genesis. Antes (ate 16/06/2026) a tela Craniotomia era um
// iframe de mockup com dados estaticos; estas rotas a tornam persistente.
// ══════════════════════════════════════════════════════════════════════

const SEGMENTOS = ["exame", "formula", "injetavel", "implante", "protocolo"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;

const CriarRegraMotorBody = z.object({
  regraId: z.string().min(1, "regraId obrigatorio"),
  perguntaId: z.string().min(1, "perguntaId obrigatorio"),
  palavraChave: z.string().min(1, "palavraChave obrigatoria"),
  segmento: z.enum(SEGMENTOS),
  codigoReferencia: z.string().trim().min(1).nullish(),
  blocoReferencia: z.string().trim().min(1).nullish(),
  prioridade: z.enum(PRIORIDADES).default("media"),
  observacao: z.string().trim().min(1).nullish(),
  ativo: z.enum(["SIM", "NAO"]).default("SIM"),
});

const AtualizarRegraMotorBody = CriarRegraMotorBody.partial();

// GET — lista o grafo completo de sinapses (regras) com o nome do item
// terapeutico de destino. NAO usa JOIN: como `codigo_padcom` nao tem
// unicidade garantida em `itens_terapeuticos`, um leftJoin multiplicaria a
// MESMA regra em N linhas (inflando KPIs e a tabela da Craniotomia). Em vez
// disso, monta um mapa codigo_padcom -> item (primeira ocorrencia = item
// canonico) e cola o nome em memoria, de forma deterministica (1 regra = 1
// linha). Filtros `segmento`/`ativo` sao validados e aplicados no SQL.
router.get("/motor-clinico/regras", async (req, res): Promise<void> => {
  const segmentoQuery = req.query.segmento as string | undefined;
  const ativoQuery = req.query.ativo as string | undefined;

  const condicoes = [];
  if (segmentoQuery && (SEGMENTOS as readonly string[]).includes(segmentoQuery)) {
    condicoes.push(eq(regrasMotorTable.segmento, segmentoQuery as (typeof SEGMENTOS)[number]));
  }
  if (ativoQuery === "SIM" || ativoQuery === "NAO") {
    condicoes.push(eq(regrasMotorTable.ativo, ativoQuery));
  }

  const regras = await db
    .select({
      id: regrasMotorTable.id,
      regraId: regrasMotorTable.regraId,
      perguntaId: regrasMotorTable.perguntaId,
      palavraChave: regrasMotorTable.palavraChave,
      segmento: regrasMotorTable.segmento,
      codigoReferencia: regrasMotorTable.codigoReferencia,
      blocoReferencia: regrasMotorTable.blocoReferencia,
      prioridade: regrasMotorTable.prioridade,
      observacao: regrasMotorTable.observacao,
      ativo: regrasMotorTable.ativo,
      criadoEm: regrasMotorTable.criadoEm,
    })
    .from(regrasMotorTable)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(regrasMotorTable.perguntaId, regrasMotorTable.regraId);

  const itens = await db
    .select({
      codigoPadcom: itensTerapeuticosTable.codigoPadcom,
      nome: itensTerapeuticosTable.nome,
      categoria: itensTerapeuticosTable.categoria,
    })
    .from(itensTerapeuticosTable);

  const mapaItem = new Map<string, { nome: string; categoria: string }>();
  for (const it of itens) {
    if (it.codigoPadcom && !mapaItem.has(it.codigoPadcom)) {
      mapaItem.set(it.codigoPadcom, { nome: it.nome, categoria: it.categoria });
    }
  }

  const result = regras.map((r) => {
    const item = r.codigoReferencia ? mapaItem.get(r.codigoReferencia) : undefined;
    return { ...r, itemNome: item?.nome ?? null, itemCategoria: item?.categoria ?? null };
  });

  res.json(result);
});

// POST — cria uma nova sinapse (regra) e persiste no banco.
// GATE: escrita numa tabela GLOBAL (Genesis) que propaga a TODAS as unidades
// => exige platform_owner (perfil "admin" do ADMIN_TOKEN tambem passa). Um
// usuario de clinica (tenant_user/tenant_admin) NAO altera o motor global.
router.post("/motor-clinico/regras", requirePlataforma("platform_owner"), async (req, res): Promise<void> => {
  const parsed = CriarRegraMotorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [regra] = await db.insert(regrasMotorTable).values(parsed.data).returning();
  res.status(201).json(regra);
});

// PATCH — atualiza campos de uma sinapse existente (inclui ligar/desligar
// via `ativo`). Aceita atualizacao parcial: so grava o que veio no corpo.
router.patch("/motor-clinico/regras/:id", requirePlataforma("platform_owner"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }
  const parsed = AtualizarRegraMotorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "nenhum campo para atualizar" });
    return;
  }
  const [regra] = await db
    .update(regrasMotorTable)
    .set(parsed.data)
    .where(eq(regrasMotorTable.id, id))
    .returning();
  if (!regra) {
    res.status(404).json({ error: "Regra nao encontrada" });
    return;
  }
  res.json(regra);
});

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
      composicao: string | null; posologia: string | null;
      posologiaEstruturada: import("@workspace/posologia").PosologiaEstruturada | null;
      areaSemantica: string | null;
      disponivel: boolean; exigeValidacaoHumana: boolean; preco: number | null;
      tags: string[] | null;
    }> = [];

    // Parser puro de posologia: produz estrutura JSONB normalizada para
    // PDFs (gerarReceitaPdf / rasxMotorPdf) e preview RevoPanel. Sempre devolve
    // raw + interpretado=false como fallback quando o texto não casa nenhuma regra.
    const { parsePosologia } = await import("@workspace/posologia");
    function estruturar(
      texto: string | null,
      categoria: "injetavel_im" | "injetavel_ev" | "implante" | "formula" | "protocolo" | "exame",
    ) {
      if (!texto) return null;
      return parsePosologia(texto, { categoria });
    }

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
        posologiaEstruturada: estruturar(a.dosagem ? `${a.dosagem}${a.volume ? ` / ${a.volume}` : ""}` : null, "injetavel_im"),
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
        posologiaEstruturada: estruturar(s.dosagem ? `${s.dosagem}${s.volume ? ` / ${s.volume}` : ""}` : null, "injetavel_ev"),
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
        posologiaEstruturada: estruturar(i.dosagem ? `${i.dosagem} ${i.unidade || ""} — ${i.doseRecomendada || ""} pellets`.trim() : null, "implante"),
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
        posologiaEstruturada: estruturar(poso.length > 0 ? poso.join("; ") : null, "formula"),
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
        posologiaEstruturada: null,
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
        posologiaEstruturada: null,
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

// GET — "loteamento": catalogo cru para a prancheta visual da Craniotomia.
// Devolve as PERGUNTAS da anamnese (gatilhos possiveis = lado "SE") e os
// ITENS terapeuticos (casas disponiveis = lado "ENTAO"), com o segmento ja
// normalizado (injetavel_im / injetavel_ev -> injetavel) para casar 1:1 com
// o vocabulario de `regras_motor`. Tela liga SE -> ENTAO sem digitar codigo:
// o codigo_padcom da casa clicada vira o codigo_referencia da sinapse.
router.get("/motor-clinico/loteamento", async (_req, res): Promise<void> => {
  const [perguntas, itens] = await Promise.all([
    db
      .select({
        id: questionarioMasterTable.id,
        perguntaId: questionarioMasterTable.perguntaId,
        bloco: questionarioMasterTable.bloco,
        pergunta: questionarioMasterTable.pergunta,
      })
      .from(questionarioMasterTable)
      .orderBy(questionarioMasterTable.bloco, questionarioMasterTable.perguntaId),
    db
      .select({
        id: itensTerapeuticosTable.id,
        codigoPadcom: itensTerapeuticosTable.codigoPadcom,
        nome: itensTerapeuticosTable.nome,
        categoria: itensTerapeuticosTable.categoria,
        disponivel: itensTerapeuticosTable.disponivel,
      })
      .from(itensTerapeuticosTable)
      .orderBy(itensTerapeuticosTable.nome),
  ]);

  const normalizarSegmento = (cat: string): string =>
    cat === "injetavel_im" || cat === "injetavel_ev" ? "injetavel" : cat;

  res.json({
    perguntas,
    itens: itens.map((i) => ({
      id: i.id,
      codigoPadcom: i.codigoPadcom,
      nome: i.nome,
      categoria: i.categoria,
      segmento: normalizarSegmento(i.categoria),
      disponivel: i.disponivel,
    })),
  });
});

export default router;
