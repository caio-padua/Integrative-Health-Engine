import { Router } from "express";
import {
  db, examesEvolucaoTable, classificarExame,
  pacientesTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";

const router = Router();

router.post("/exames/receber", async (req, res): Promise<void> => {
  try {
    const {
      pacienteId, nomeExame, categoria, valor, unidade,
      valorMinimo, valorMaximo, dataColeta, laboratorio,
      registradoPorId, formulaVigente, justificativaPrescricao,
    } = req.body;

    if (!pacienteId || !nomeExame || valor === undefined || valor === null) {
      res.status(400).json({ erro: "Campos obrigatorios: pacienteId, nomeExame, valor" });
      return;
    }

    const numValor = Number(valor);
    const numMin = Number(valorMinimo);
    const numMax = Number(valorMaximo);

    if (!Number.isFinite(numValor) || !Number.isFinite(numMin) || !Number.isFinite(numMax)) {
      res.status(400).json({ erro: "valor, valorMinimo e valorMaximo devem ser numeros validos" });
      return;
    }

    if (numMin >= numMax) {
      res.status(400).json({ erro: "valorMinimo deve ser menor que valorMaximo" });
      return;
    }

    const paciente = await db.select({ id: pacientesTable.id }).from(pacientesTable).where(eq(pacientesTable.id, pacienteId)).limit(1);
    if (paciente.length === 0) {
      res.status(404).json({ erro: "Paciente nao encontrado" });
      return;
    }

    const exameAnterior = await db
      .select({ valor: examesEvolucaoTable.valor })
      .from(examesEvolucaoTable)
      .where(
        and(
          eq(examesEvolucaoTable.pacienteId, pacienteId),
          eq(examesEvolucaoTable.nomeExame, nomeExame),
        ),
      )
      .orderBy(desc(examesEvolucaoTable.criadoEm))
      .limit(1);

    const valorAnterior = exameAnterior[0]?.valor ?? undefined;
    const resultado = classificarExame(numValor, numMin, numMax, valorAnterior ?? undefined);

    const [novoExame] = await db.insert(examesEvolucaoTable).values({
      pacienteId,
      nomeExame,
      categoria,
      valor: numValor,
      unidade,
      valorMinimo: numMin,
      valorMaximo: numMax,
      terco: resultado.terco,
      classificacaoAutomatica: resultado.classificacao,
      tendencia: resultado.tendencia,
      deltaPercentual: resultado.deltaPercentual,
      dataColeta: dataColeta || new Date().toISOString().split("T")[0],
      laboratorio,
      registradoPorId,
      formulaVigente,
      justificativaPrescricao,
      origem: "OPERACIONAL",
    }).returning();

    res.status(201).json({
      exame: novoExame,
      classificacao: resultado,
      mensagem: `Exame ${nomeExame} registrado. Classificacao: ${resultado.classificacao} (terco ${resultado.terco}). Tendencia: ${resultado.tendencia}${resultado.deltaPercentual !== null ? ` (${resultado.deltaPercentual > 0 ? "+" : ""}${resultado.deltaPercentual}%)` : ""}`,
    });
  } catch (err: any) {
    console.error("Erro ao receber exame:", err);
    res.status(500).json({ erro: "Erro interno ao registrar exame" });
  }
});

router.get("/pacientes/:id/exames/evolucao", async (req, res): Promise<void> => {
  try {
    const pacienteId = parseInt(req.params.id, 10);
    if (isNaN(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ erro: "ID do paciente invalido" });
      return;
    }

    const nomeExame = req.query.exame as string;
    const meses = parseInt((req.query.meses as string) || "6", 10);

    if (!nomeExame) {
      res.status(400).json({ erro: "Parametro obrigatorio: ?exame=nome_do_exame" });
      return;
    }

    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);

    const evolucao = await db
      .select()
      .from(examesEvolucaoTable)
      .where(
        and(
          eq(examesEvolucaoTable.pacienteId, pacienteId),
          eq(examesEvolucaoTable.nomeExame, nomeExame),
          sql`${examesEvolucaoTable.criadoEm} >= ${dataLimite}`,
        ),
      )
      .orderBy(examesEvolucaoTable.criadoEm);

    res.json({
      pacienteId,
      exame: nomeExame,
      periodoMeses: meses,
      total: evolucao.length,
      evolucao,
    });
  } catch (err: any) {
    console.error("Erro ao buscar evolucao:", err);
    res.status(500).json({ erro: "Erro interno ao buscar evolucao" });
  }
});

// ============================================================
// EXAMES-2 — 5 zonas + nomes proprios Caio + sparkline 6m + script clinico
// 0=ALERTA(<min), 1=terco_inf, 2=terco_med, 3=terco_sup, 4=ATENCAO(>max)
// terco_excelente do analitos_catalogo decide a inversao SUPERIOR/INFERIOR/MEDIO
// ============================================================

type DirecaoFav = "SUPERIOR" | "INFERIOR" | "MEDIO";
type ZonaSlug = "alerta" | "inferior" | "medio" | "superior" | "atencao";
type CorSemaforo = "VERMELHO" | "AMARELO" | "VERDE" | "ALERTA";

function calcularZonaIdx(valor: number, fxCrit: number, fxBaixa: number, fxMedia: number, fxSup: number): number {
  if (!Number.isFinite(valor)) return 2;
  if (valor < fxCrit) return 0;
  if (valor <= fxBaixa) return 1;
  if (valor <= fxMedia) return 2;
  if (valor <= fxSup) return 3;
  return 4;
}

function zonaSlug(idx: number): ZonaSlug {
  return (["alerta", "inferior", "medio", "superior", "atencao"] as ZonaSlug[])[idx] ?? "medio";
}

function corPorZonaDirecao(idx: number, direcao: DirecaoFav): CorSemaforo {
  // 0=ALERTA(<min) e 4=ATENCAO(>max) sempre semantica neutra de aviso
  if (idx === 0) return "VERMELHO"; // alerta
  if (idx === 4) return "VERMELHO"; // atencao
  if (direcao === "SUPERIOR") {
    if (idx === 3) return "VERDE";
    if (idx === 2) return "VERDE"; // dourado/aceitavel mapeia a verde no semaforo do agregado
    if (idx === 1) return "AMARELO";
  }
  if (direcao === "INFERIOR") {
    if (idx === 1) return "VERDE";
    if (idx === 2) return "VERDE";
    if (idx === 3) return "ALERTA"; // terco superior quando alto e ruim => semantica neutra
  }
  if (direcao === "MEDIO") {
    if (idx === 2) return "VERDE";
    if (idx === 1 || idx === 3) return "AMARELO";
  }
  return "AMARELO";
}

function nomeZonaPorIdx(
  idx: number,
  direcao: DirecaoFav,
  nomes: { excelente: string; aceitavel: string; ruim: string; alerta: string; atencao: string },
): string {
  if (idx === 0) return nomes.alerta;   // ALERTA neutro
  if (idx === 4) return nomes.atencao;  // ATENCAO neutro
  if (idx === 2) return nomes.aceitavel;
  if (direcao === "SUPERIOR") {
    if (idx === 3) return nomes.excelente;
    if (idx === 1) return nomes.ruim;
  }
  if (direcao === "INFERIOR") {
    if (idx === 1) return nomes.excelente;
    if (idx === 3) return nomes.ruim;
  }
  if (direcao === "MEDIO") {
    if (idx === 1 || idx === 3) return nomes.ruim;
  }
  return nomes.aceitavel;
}

function calcularPosicaoPct(valor: number, fxCrit: number, fxSup: number): number {
  if (!Number.isFinite(valor) || fxSup <= fxCrit) return 50;
  const pct = ((valor - fxCrit) / (fxSup - fxCrit)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

router.get("/pacientes/:id/exames/dashboard", async (req, res): Promise<void> => {
  try {
    const pacienteId = parseInt(req.params.id, 10);
    if (isNaN(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ erro: "ID do paciente invalido" });
      return;
    }

    // Ultimo valor por nome_exame + JOIN com PRG (faixas) e analitos_catalogo (nomes/script)
    const ultimosExames = await db.execute(sql`
      SELECT DISTINCT ON (ee.nome_exame)
        ee.id, ee.nome_exame, ee.categoria, ee.valor, ee.unidade,
        ee.valor_minimo, ee.valor_maximo, ee.terco,
        ee.classificacao_automatica, ee.classificacao_manual,
        ee.tendencia, ee.delta_percentual, ee.formula_vigente,
        ee.data_coleta, ee.laboratorio, ee.criado_em,
        prg.codigo               AS prg_codigo,
        prg.label                AS prg_label,
        prg.faixa_critica_max,
        prg.faixa_baixa_max,
        prg.faixa_media_max,
        prg.faixa_superior_max,
        prg.codigo_semantico_v4,
        ac.terco_excelente,
        ac.observacao_clinica,
        ac.grupo                 AS analito_grupo,
        ac.nome_zona_excelente,
        ac.nome_zona_aceitavel,
        ac.nome_zona_ruim,
        ac.nome_zona_alerta,
        ac.nome_zona_atencao
      FROM exames_evolucao ee
      LEFT JOIN parametros_referencia_global prg
        ON prg.tipo='EXAME'
       AND UPPER(unaccent(prg.label)) = UPPER(unaccent(ee.nome_exame))
      LEFT JOIN analitos_catalogo ac
        ON ac.codigo_semantico_v4 IS NOT NULL
       AND ac.codigo_semantico_v4 = prg.codigo_semantico_v4
      WHERE ee.paciente_id = ${pacienteId}
      ORDER BY ee.nome_exame, ee.criado_em DESC
    `);

    // Sparkline 6 meses por exame (em uma query agregada)
    const sparklineRaw = await db.execute(sql`
      SELECT nome_exame, data_coleta::text AS data, valor::float AS valor
      FROM exames_evolucao
      WHERE paciente_id = ${pacienteId}
        AND data_coleta >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY nome_exame, data_coleta ASC
    `);
    const sparkMap = new Map<string, Array<{ data: string; valor: number }>>();
    for (const r of sparklineRaw.rows as any[]) {
      if (!sparkMap.has(r.nome_exame)) sparkMap.set(r.nome_exame, []);
      sparkMap.get(r.nome_exame)!.push({ data: r.data, valor: Number(r.valor) });
    }

    const resumo = { verdes: 0, amarelos: 0, alertas: 0, vermelhos: 0, total: 0 };

    const exames = (ultimosExames.rows as any[]).map((exame) => {
      const valor = Number(exame.valor);
      const fxCrit = exame.faixa_critica_max != null ? Number(exame.faixa_critica_max) : Number(exame.valor_minimo);
      const fxSup  = exame.faixa_superior_max != null ? Number(exame.faixa_superior_max) : Number(exame.valor_maximo);
      const fxBaixa = exame.faixa_baixa_max != null ? Number(exame.faixa_baixa_max) : (fxCrit + (fxSup - fxCrit) / 3);
      const fxMedia = exame.faixa_media_max != null ? Number(exame.faixa_media_max) : (fxCrit + 2 * (fxSup - fxCrit) / 3);

      const direcao: DirecaoFav = (exame.terco_excelente as DirecaoFav) || "SUPERIOR";

      const temFaixas = Number.isFinite(fxCrit) && Number.isFinite(fxBaixa) && Number.isFinite(fxMedia) && Number.isFinite(fxSup);
      const zonaIdx = temFaixas ? calcularZonaIdx(valor, fxCrit, fxBaixa, fxMedia, fxSup) : 2;
      const slug = zonaSlug(zonaIdx);
      const cor: CorSemaforo = exame.classificacao_manual || (temFaixas ? corPorZonaDirecao(zonaIdx, direcao) : "AMARELO");

      const nomes = {
        excelente: exame.nome_zona_excelente || "EXCELENTE",
        aceitavel: exame.nome_zona_aceitavel || "ACEITAVEL",
        ruim:      exame.nome_zona_ruim      || "RUIM",
        alerta:    exame.nome_zona_alerta    || "ALERTA",
        atencao:   exame.nome_zona_atencao   || "ATENCAO",
      };
      const nomeZona = nomeZonaPorIdx(zonaIdx, direcao, nomes);

      const posicaoPct = temFaixas ? calcularPosicaoPct(valor, fxCrit, fxSup) : 50;

      // Contadores agregados
      if (cor === "VERDE") resumo.verdes++;
      else if (cor === "AMARELO") resumo.amarelos++;
      else if (cor === "ALERTA") resumo.alertas++;
      else resumo.vermelhos++;
      resumo.total++;

      return {
        // Identidade
        id: exame.id,
        nome_exame: exame.nome_exame,
        categoria: exame.categoria,
        unidade: exame.unidade,
        codigo_semantico_v4: exame.codigo_semantico_v4 || null,
        prg_codigo: exame.prg_codigo || null,
        analito_grupo: exame.analito_grupo || null,
        // Medicao
        valor,
        data_coleta: exame.data_coleta,
        laboratorio: exame.laboratorio,
        // 5 faixas (oficiais Caio)
        faixa_critica_max: temFaixas ? fxCrit : null,
        faixa_baixa_max:   temFaixas ? fxBaixa : null,
        faixa_media_max:   temFaixas ? fxMedia : null,
        faixa_superior_max: temFaixas ? fxSup : null,
        valor_minimo_lab: exame.valor_minimo,
        valor_maximo_lab: exame.valor_maximo,
        // Classificacao
        direcao_favoravel: direcao,
        zona_idx: zonaIdx,            // 0..4
        zona_slug: slug,              // alerta/inferior/medio/superior/atencao
        nome_zona: nomeZona,          // EXCELENTE/ACEITAVEL/RUIM/ALERTA/ATENCAO (editavel)
        cor_final: cor,               // VERDE/AMARELO/ALERTA/VERMELHO
        posicao_pct: posicaoPct,      // 0..100 pra regua visual
        // Script clinico (modo medico)
        observacao_clinica: exame.observacao_clinica || null,
        // Tendencia
        tendencia: exame.tendencia,
        delta_percentual: exame.delta_percentual != null ? Number(exame.delta_percentual) : null,
        // Sparkline 6m
        sparkline: sparkMap.get(exame.nome_exame) || [],
        // Compatibilidade reversa
        corFinal: cor === "ALERTA" ? "AMARELO" : cor,
        terco: exame.terco,
        classificacao_automatica: exame.classificacao_automatica,
        classificacao_manual: exame.classificacao_manual,
      };
    });

    let semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
    if (resumo.vermelhos > 0) semaforoGeral = "VERMELHO";
    else if (resumo.alertas > 0 || resumo.amarelos > 0) semaforoGeral = "AMARELO";

    res.json({
      pacienteId,
      semaforoGeral,
      resumo,
      exames,
      meta: {
        zonas_oficiais: ["alerta", "inferior", "medio", "superior", "atencao"],
        cores: ["VERMELHO", "AMARELO", "VERDE", "ALERTA"],
        nomenclatura_caio: "ALERTA = abaixo limite (neutro). ATENCAO = acima limite (neutro). EXCELENTE/ACEITAVEL/RUIM editaveis em analitos_catalogo.",
      },
    });
  } catch (err: any) {
    console.error("Erro ao gerar dashboard exames:", err);
    res.status(500).json({ erro: "Erro interno ao gerar dashboard de exames" });
  }
});

router.post("/exames/:id/classificacao-manual", async (req, res): Promise<void> => {
  try {
    const exameId = parseInt(req.params.id, 10);
    if (isNaN(exameId) || exameId <= 0) {
      res.status(400).json({ erro: "ID do exame invalido" });
      return;
    }

    const { classificacao, justificativa } = req.body;

    if (!classificacao || !["VERDE", "AMARELO", "VERMELHO"].includes(classificacao)) {
      res.status(400).json({ erro: "Classificacao deve ser VERDE, AMARELO ou VERMELHO" });
      return;
    }

    const existente = await db.select({ id: examesEvolucaoTable.id }).from(examesEvolucaoTable).where(eq(examesEvolucaoTable.id, exameId)).limit(1);
    if (existente.length === 0) {
      res.status(404).json({ erro: "Exame nao encontrado" });
      return;
    }

    const [atualizado] = await db
      .update(examesEvolucaoTable)
      .set({
        classificacaoManual: classificacao,
        justificativaPrescricao: justificativa || null,
      })
      .where(eq(examesEvolucaoTable.id, exameId))
      .returning();

    res.json({
      exame: atualizado,
      mensagem: `Classificacao manual definida como ${classificacao}`,
    });
  } catch (err: any) {
    console.error("Erro ao classificar exame:", err);
    res.status(500).json({ erro: "Erro interno ao classificar exame" });
  }
});

router.get("/exames/semaforo-geral", async (_req, res): Promise<void> => {
  try {
    const contagem = await db.execute(sql`
      SELECT 
        COALESCE(classificacao_manual, classificacao_automatica, 'VERDE') as cor,
        COUNT(*) as total
      FROM exames_evolucao
      WHERE classificacao_automatica IS NOT NULL
      GROUP BY COALESCE(classificacao_manual, classificacao_automatica, 'VERDE')
    `);

    const resultado: Record<string, number> = { VERDE: 0, AMARELO: 0, VERMELHO: 0 };
    for (const row of contagem.rows as any[]) {
      resultado[row.cor] = Number(row.total);
    }

    const total = resultado.VERDE + resultado.AMARELO + resultado.VERMELHO;
    let semaforo: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
    if (resultado.VERMELHO > 0) semaforo = "VERMELHO";
    else if (resultado.AMARELO > 0) semaforo = "AMARELO";

    res.json({
      semaforo,
      total,
      verdes: resultado.VERDE,
      amarelos: resultado.AMARELO,
      vermelhos: resultado.VERMELHO,
    });
  } catch (err: any) {
    console.error("Erro ao buscar semaforo geral:", err);
    res.status(500).json({ erro: "Erro interno ao buscar semaforo" });
  }
});

export default router;
