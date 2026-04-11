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

router.get("/pacientes/:id/exames/dashboard", async (req, res): Promise<void> => {
  try {
    const pacienteId = parseInt(req.params.id, 10);
    if (isNaN(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ erro: "ID do paciente invalido" });
      return;
    }

    const ultimosExames = await db.execute(sql`
      SELECT DISTINCT ON (nome_exame) 
        id, nome_exame, categoria, valor, unidade,
        valor_minimo, valor_maximo, terco,
        classificacao_automatica, classificacao_manual,
        tendencia, delta_percentual, formula_vigente,
        data_coleta, laboratorio, criado_em
      FROM exames_evolucao
      WHERE paciente_id = ${pacienteId}
      ORDER BY nome_exame, criado_em DESC
    `);

    const resumo = {
      verdes: 0,
      amarelos: 0,
      vermelhos: 0,
      total: 0,
    };

    const exames = (ultimosExames.rows as any[]).map((exame) => {
      const cor = exame.classificacao_manual || exame.classificacao_automatica || "VERDE";
      if (cor === "VERDE") resumo.verdes++;
      else if (cor === "AMARELO") resumo.amarelos++;
      else resumo.vermelhos++;
      resumo.total++;

      return {
        ...exame,
        corFinal: cor,
      };
    });

    let semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
    if (resumo.vermelhos > 0) semaforoGeral = "VERMELHO";
    else if (resumo.amarelos > 0) semaforoGeral = "AMARELO";

    res.json({
      pacienteId,
      semaforoGeral,
      resumo,
      exames,
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
