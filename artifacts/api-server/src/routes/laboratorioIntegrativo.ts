import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { classificarAnalito, classificarLote, type ResultadoAnalitoInput } from "../lib/laboratorio/motorClassificacaoIntegrativa";

const router = Router();

router.patch("/laboratorio/analitos/:codigo", async (req: Request, res: Response) => {
  try {
    const codigo = String(req.params["codigo"]);
    const { terco_excelente, observacao_clinica, origem_referencia, validado_por } = req.body || {};
    if (terco_excelente && !["SUPERIOR", "INFERIOR", "MEDIO"].includes(String(terco_excelente))) {
      return res.status(400).json({ error: "terco_excelente deve ser SUPERIOR, INFERIOR ou MEDIO" });
    }
    const sets: any[] = [];
    if (terco_excelente)     sets.push(sql`terco_excelente = ${String(terco_excelente)}`);
    if (observacao_clinica != null) sets.push(sql`observacao_clinica = ${String(observacao_clinica)}`);
    if (origem_referencia != null)  sets.push(sql`origem_referencia = ${String(origem_referencia)}`);
    if (sets.length === 0) return res.status(400).json({ error: "nada para atualizar" });
    const setClause = sql.join(sets, sql`, `);
    const r: any = await db.execute(sql`UPDATE analitos_catalogo SET ${setClause} WHERE codigo = ${codigo} RETURNING *`);
    const row = (r.rows ?? r)[0];
    if (!row) return res.status(404).json({ error: "analito nao encontrado" });
    // Audit trail simples
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analitos_validacoes_log (
        id SERIAL PRIMARY KEY,
        analito_codigo TEXT NOT NULL,
        validado_por TEXT,
        terco_excelente_anterior TEXT,
        terco_excelente_novo TEXT,
        observacao_nova TEXT,
        origem_nova TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      INSERT INTO analitos_validacoes_log (analito_codigo, validado_por, terco_excelente_novo, observacao_nova, origem_nova)
      VALUES (${codigo}, ${validado_por ? String(validado_por) : null}, ${terco_excelente ? String(terco_excelente) : null}, ${observacao_clinica != null ? String(observacao_clinica) : null}, ${origem_referencia != null ? String(origem_referencia) : null})
    `);
    res.json({ atualizado: true, analito: row });
  } catch (e) {
    console.error("patch analito erro:", e);
    res.status(500).json({ error: "erro ao atualizar analito" });
  }
});

router.get("/laboratorio/analitos/:codigo/historico-validacoes", async (req: Request, res: Response) => {
  try {
    const codigo = String(req.params["codigo"]);
    const r: any = await db.execute(sql`
      SELECT * FROM analitos_validacoes_log WHERE analito_codigo = ${codigo} ORDER BY criado_em DESC LIMIT 50
    `).catch(() => ({ rows: [] }));
    res.json({ codigo, validacoes: (r.rows ?? r ?? []) });
  } catch (e) { res.status(500).json({ error: "erro" }); }
});

router.get("/laboratorio/analitos", async (_req: Request, res: Response) => {
  try {
    const rows: any = await db.execute(sql`SELECT * FROM analitos_catalogo WHERE ativo = true ORDER BY grupo, nome`);
    res.json({ analitos: (rows.rows ?? rows) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/laboratorio/analitos/:codigo/referencias", async (req: Request, res: Response) => {
  try {
    const codigo = String(req.params["codigo"]);
    const rows: any = await db.execute(sql`SELECT * FROM analitos_referencia_laboratorio WHERE analito_codigo = ${codigo} ORDER BY laboratorio, sexo`);
    res.json({ codigo, referencias: (rows.rows ?? rows) });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/laboratorio/classificar", async (req: Request, res: Response) => {
  try {
    const { analito_codigo, valor, unidade, laboratorio, sexo, idade_anos } = req.body || {};
    if (!analito_codigo || valor == null || !unidade) {
      return res.status(400).json({ error: "analito_codigo, valor e unidade sao obrigatorios" });
    }
    const r = await classificarAnalito({
      analitoCodigo: String(analito_codigo),
      valorOriginal: Number(valor),
      unidadeOriginal: String(unidade),
      laboratorio: laboratorio ? String(laboratorio) : undefined,
      sexo: sexo as "M" | "F" | "AMBOS" | undefined,
      idadeAnos: idade_anos != null ? Number(idade_anos) : undefined,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/laboratorio/classificar-lote", async (req: Request, res: Response) => {
  try {
    const itens = req.body?.itens;
    if (!Array.isArray(itens)) return res.status(400).json({ error: "itens deve ser array" });
    const inputs: ResultadoAnalitoInput[] = itens.map((i: any) => ({
      analitoCodigo: String(i.analito_codigo),
      valorOriginal: Number(i.valor),
      unidadeOriginal: String(i.unidade),
      laboratorio: i.laboratorio ? String(i.laboratorio) : undefined,
      sexo: i.sexo,
      idadeAnos: i.idade_anos != null ? Number(i.idade_anos) : undefined,
    }));
    const resultados = await classificarLote(inputs);
    res.json({ total: resultados.length, resultados });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/laboratorio/exames/registrar", async (req: Request, res: Response) => {
  try {
    const { paciente_id, laboratorio, data_coleta, sexo, idade_anos, itens } = req.body || {};
    if (!paciente_id || !Array.isArray(itens)) {
      return res.status(400).json({ error: "paciente_id e itens (array) obrigatorios" });
    }
    const pid = Number(paciente_id);
    if (!Number.isFinite(pid) || pid <= 0) return res.status(400).json({ error: "paciente_id invalido" });
    // Tenant guard: se contexto definido, paciente precisa pertencer a essa unidade
    const ctxUnidade = (req as any).tenantContext?.unidadeId;
    if (ctxUnidade != null) {
      const pac: any = await db.execute(sql`SELECT unidade_id FROM pacientes WHERE id = ${pid}`);
      const pacRow = (pac.rows ?? pac)[0];
      if (!pacRow) return res.status(404).json({ error: "paciente nao encontrado" });
      if (Number(pacRow.unidade_id) !== Number(ctxUnidade)) {
        return res.status(403).json({ error: "paciente nao pertence a esta unidade" });
      }
    }
    const inputs: ResultadoAnalitoInput[] = itens.map((i: any) => ({
      analitoCodigo: String(i.analito_codigo),
      valorOriginal: Number(i.valor),
      unidadeOriginal: String(i.unidade),
      laboratorio: laboratorio ? String(laboratorio) : undefined,
      sexo,
      idadeAnos: idade_anos != null ? Number(idade_anos) : undefined,
    }));
    const classificados = await classificarLote(inputs);
    const dataColeta = data_coleta ?? new Date().toISOString().slice(0, 10);

    const persistidos: any[] = [];
    for (const r of classificados) {
      if ("erro" in r) { persistidos.push(r); continue; }
      const tercoNum = r.terco_atual === "INFERIOR" ? 1 : r.terco_atual === "MEDIO" ? 2 : r.terco_atual === "SUPERIOR" ? 3 : r.terco_atual === "ABAIXO" ? 0 : 4;
      const ins: any = await db.execute(sql`
        INSERT INTO exames_evolucao (paciente_id, nome_exame, categoria, valor, unidade, valor_minimo, valor_maximo, classificacao, data_coleta, laboratorio, origem, terco, classificacao_automatica)
        VALUES (${Number(paciente_id)}, ${r.analito_nome}, ${r.grupo}, ${r.valor_normalizado}, ${r.unidade_padrao}, ${r.valor_min_ref}, ${r.valor_max_ref}, ${r.classificacao}, ${dataColeta}, ${r.laboratorio_usado}, 'OPERACIONAL_AUTO', ${tercoNum}, ${r.classificacao})
        RETURNING id
      `);
      persistidos.push({ id: (ins.rows ?? ins)[0]?.id, ...r });
    }
    res.status(201).json({ paciente_id, total: persistidos.length, registros: persistidos });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/laboratorio/pacientes/:id/historico", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "id invalido" });
    const ctxUnidade = (req as any).tenantContext?.unidadeId;
    if (ctxUnidade != null) {
      const pac: any = await db.execute(sql`SELECT unidade_id FROM pacientes WHERE id = ${id}`);
      const pacRow = (pac.rows ?? pac)[0];
      if (!pacRow) return res.status(404).json({ error: "paciente nao encontrado" });
      if (Number(pacRow.unidade_id) !== Number(ctxUnidade)) {
        return res.status(403).json({ error: "paciente nao pertence a esta unidade" });
      }
    }
    const rows: any = await db.execute(sql`
      SELECT id, nome_exame, categoria, valor, unidade, valor_minimo, valor_maximo, classificacao, data_coleta, laboratorio, terco
      FROM exames_evolucao WHERE paciente_id = ${id}
      ORDER BY data_coleta DESC NULLS LAST, criado_em DESC LIMIT 200
    `);
    res.json({ paciente_id: id, historico: (rows.rows ?? rows) });
  } catch (e) {
    console.error("historico erro:", e);
    res.status(500).json({ error: "erro interno ao buscar historico" });
  }
});

// Serie temporal de um analito do paciente (para grafico de barras)
router.get("/laboratorio/pacientes/:id/serie/:codigo", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const codigo = String(req.params["codigo"]);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "id invalido" });

    const ctxUnidade = (req as any).tenantContext?.unidadeId;
    if (ctxUnidade != null) {
      const pac: any = await db.execute(sql`SELECT unidade_id FROM pacientes WHERE id = ${id}`);
      const pacRow = (pac.rows ?? pac)[0];
      if (!pacRow) return res.status(404).json({ error: "paciente nao encontrado" });
      if (Number(pacRow.unidade_id) !== Number(ctxUnidade)) return res.status(403).json({ error: "fora da unidade" });
    }

    const cat: any = await db.execute(sql`SELECT * FROM analitos_catalogo WHERE codigo = ${codigo}`);
    const catRow = (cat.rows ?? cat)[0];
    if (!catRow) return res.status(404).json({ error: "analito nao catalogado" });

    const rows: any = await db.execute(sql`
      SELECT id, valor, unidade, valor_minimo, valor_maximo, classificacao, data_coleta, laboratorio, terco
      FROM exames_evolucao
      WHERE paciente_id = ${id} AND nome_exame = ${catRow.nome}
      ORDER BY data_coleta ASC NULLS LAST, criado_em ASC
    `);
    const serie = (rows.rows ?? rows);

    // Gancho de venda: se ultimo resultado for CRITICO/ALERTA, sugerir produto
    const ultimo = serie[serie.length - 1];
    const sugestaoVenda: any = null;
    let venda: any = sugestaoVenda;
    if (ultimo) {
      const c = String(ultimo.classificacao || "");
      if (c === "CRITICO" || c === "ALERTA") {
        const sugestoesProtocolos: Record<string, { titulo: string; produto: string; valor_estimado: number }> = {
          VITAMINA_D:           { titulo: "Reposicao Vitamina D injetavel", produto: "Protocolo Vit D 600.000UI IM + manutencao oral", valor_estimado: 480 },
          ZINCO:                { titulo: "Reposicao Zinco quelado",        produto: "Zinco 30mg + Picolinato 12 semanas",                valor_estimado: 220 },
          MAGNESIO:             { titulo: "Reposicao Magnesio",             produto: "Magnesio Dimalato + Glicinato 90 dias",              valor_estimado: 280 },
          B12:                  { titulo: "Pulso B12",                      produto: "Hidroxocobalamina IM 5x + manutencao SL",            valor_estimado: 320 },
          TESTOSTERONA_TOTAL:   { titulo: "Avaliacao TRT integrativa",      produto: "Consulta especifica + protocolo otimizacao",         valor_estimado: 950 },
          SHBG:                 { titulo: "Modular SHBG",                   produto: "Protocolo aromatase + suporte hepatico",             valor_estimado: 540 },
          PCR_ULTRA:            { titulo: "Anti-inflamatorio sistemico",    produto: "Protocolo PCR-down 90 dias",                         valor_estimado: 680 },
          HOMOCISTEINA:         { titulo: "Metilacao",                      produto: "Metilfolato + B12 metilada + B6 P5P",                valor_estimado: 380 },
          INSULINA:             { titulo: "Sensibilizacao insulinica",      produto: "Berberina + Inositol + jejum guiado",                valor_estimado: 460 },
          TSH:                  { titulo: "Suporte tireoidiano",            produto: "Selenio + Iodo + L-tirosina (avaliacao)",            valor_estimado: 340 },
          FERRITINA:            { titulo: "Reposicao Ferro otimizada",      produto: "Ferro bisglicinato + cofatores",                     valor_estimado: 290 },
        };
        const s = sugestoesProtocolos[codigo];
        if (s) venda = { ...s, motivo: `Ultimo resultado ${c} em ${catRow.nome}` };
      }
    }

    // T8 PARMASUPRA-TSUNAMI · drill-down evolutivo paciente vs media unidade vs media rede.
    // Filosofia Mike Tyson: numero do paciente NUNCA isolado — sempre comparado com pares.
    // Defensivo: se queries de media falharem, segue com [] e nao derruba a resposta.
    let serieUnidade: Array<{ mes: string; valor_medio: number; n_pacientes: number }> = [];
    let serieRede: Array<{ mes: string; valor_medio: number; n_pacientes: number }> = [];
    let pacienteUnidadeId: number | null = null;
    try {
      const pac: any = await db.execute(sql`SELECT unidade_id FROM pacientes WHERE id = ${id}`);
      pacienteUnidadeId = Number((pac.rows ?? pac)[0]?.unidade_id ?? 0) || null;
      if (pacienteUnidadeId) {
        const u: any = await db.execute(sql`
          SELECT TO_CHAR(ee.data_coleta, 'YYYY-MM') AS mes,
                 ROUND(AVG(ee.valor)::numeric, 4)::float AS valor_medio,
                 COUNT(DISTINCT ee.paciente_id)::int AS n_pacientes
          FROM exames_evolucao ee
          JOIN pacientes p ON p.id = ee.paciente_id
          WHERE ee.nome_exame = ${catRow.nome}
            AND p.unidade_id = ${pacienteUnidadeId}
            AND ee.data_coleta IS NOT NULL
            AND ee.valor IS NOT NULL
          GROUP BY mes ORDER BY mes ASC
        `);
        serieUnidade = (u.rows ?? u);
      }
      const r: any = await db.execute(sql`
        SELECT TO_CHAR(ee.data_coleta, 'YYYY-MM') AS mes,
               ROUND(AVG(ee.valor)::numeric, 4)::float AS valor_medio,
               COUNT(DISTINCT ee.paciente_id)::int AS n_pacientes
        FROM exames_evolucao ee
        WHERE ee.nome_exame = ${catRow.nome}
          AND ee.data_coleta IS NOT NULL
          AND ee.valor IS NOT NULL
        GROUP BY mes ORDER BY mes ASC
      `);
      serieRede = (r.rows ?? r);
    } catch (compErr) {
      console.warn("[T8] medias unidade/rede falharam (silencioso):", String(compErr));
    }

    res.json({
      paciente_id: id,
      analito: {
        codigo: catRow.codigo,
        nome: catRow.nome,
        grupo: catRow.grupo,
        unidade_padrao: catRow.unidade_padrao_integrativa,
        terco_excelente: catRow.terco_excelente,
        observacao_clinica: catRow.observacao_clinica,
      },
      serie,
      // T8: comparativo evolutivo (Mike Tyson — variacao manda, nunca numero isolado).
      comparativo: {
        unidade_id: pacienteUnidadeId,
        serie_unidade: serieUnidade,
        serie_rede: serieRede,
      },
      sugestao_venda: venda,
    });
  } catch (e) {
    console.error("serie erro:", e);
    res.status(500).json({ error: "erro ao montar serie" });
  }
});

router.get("/inventario-wd", async (_req: Request, res: Response) => {
  try {
    const rows: any = await db.execute(sql`SELECT * FROM wd_operacionais_inventario ORDER BY prioridade DESC, codigo`);
    const lista = (rows.rows ?? rows);
    const total = lista.length;
    const ressuscitados = lista.filter((w: any) => w.status === 'RESSUSCITADO').length;
    const parciais = lista.filter((w: any) => w.status === 'PARCIAL').length;
    const pendentes = lista.filter((w: any) => w.status === 'PENDENTE').length;
    res.json({
      sumario: {
        total, ressuscitados, parciais, pendentes,
        percentual_ressuscitado: Math.round((ressuscitados / total) * 1000) / 10,
      },
      wds: lista,
    });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

export default router;
