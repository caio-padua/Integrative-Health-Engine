import { Router } from "express";
import { db } from "@workspace/db";
import {
  monitoramentoSinaisVitaisTable,
  trackingSintomasTable,
  acompanhamentoFormulaTable,
  insertMonitoramentoSinaisVitaisSchema,
  insertTrackingSintomasSchema,
  insertAcompanhamentoFormulaSchema,
  INDICADORES_SINTOMAS,
  INDICADORES_INVERTIDOS,
  classificarSintoma,
  classificarSintomaInvertido,
} from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const router = Router();

router.post("/monitoramento/sinais-vitais", async (req, res) => {
  try {
    const parsed = insertMonitoramentoSinaisVitaisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const registro = await db.insert(monitoramentoSinaisVitaisTable).values(parsed.data).returning();
    res.status(201).json(registro[0]);
  } catch (err: any) {
    console.error("Erro sinais vitais:", err);
    res.status(500).json({ erro: "Erro interno ao registrar sinais vitais" });
  }
});

router.post("/monitoramento/sinais-vitais/lote", async (req, res) => {
  try {
    const { pacienteId, dataRegistro, indicadores } = req.body;
    if (!pacienteId || !dataRegistro || !Array.isArray(indicadores)) {
      return res.status(400).json({ erro: "pacienteId, dataRegistro e indicadores[] obrigatórios" });
    }
    const registros = [];
    for (const ind of indicadores) {
      const parsed = insertMonitoramentoSinaisVitaisSchema.safeParse({
        pacienteId,
        dataRegistro,
        ...ind,
      });
      if (parsed.success) {
        const r = await db.insert(monitoramentoSinaisVitaisTable).values(parsed.data).returning();
        registros.push(r[0]);
      }
    }
    res.status(201).json({ inseridos: registros.length, registros });
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/sinais-vitais", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const registros = await db
      .select()
      .from(monitoramentoSinaisVitaisTable)
      .where(eq(monitoramentoSinaisVitaisTable.pacienteId, pacienteId))
      .orderBy(desc(monitoramentoSinaisVitaisTable.dataRegistro), asc(monitoramentoSinaisVitaisTable.indicador));

    const porData: Record<string, any> = {};
    for (const r of registros) {
      const data = r.dataRegistro;
      if (!porData[data]) porData[data] = { data, indicadores: {} };
      porData[data].indicadores[r.indicador] = {
        hora1: { valor: r.hora1Valor, horario: r.hora1Horario },
        hora2: { valor: r.hora2Valor, horario: r.hora2Horario },
        hora3: { valor: r.hora3Valor, horario: r.hora3Horario },
        hora4: { valor: r.hora4Valor, horario: r.hora4Horario },
        hora5: { valor: r.hora5Valor, horario: r.hora5Horario },
        hora6: { valor: r.hora6Valor, horario: r.hora6Horario },
      };
    }
    res.json(Object.values(porData));
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/monitoramento/tracking-sintomas", async (req, res) => {
  try {
    const parsed = insertTrackingSintomasSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const registro = await db.insert(trackingSintomasTable).values(parsed.data).returning();
    res.status(201).json(registro[0]);
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/tracking-sintomas", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const registros = await db
      .select()
      .from(trackingSintomasTable)
      .where(eq(trackingSintomasTable.pacienteId, pacienteId))
      .orderBy(asc(trackingSintomasTable.dataSemana));

    const comClassificacao = registros.map((r) => {
      const classificacoes: Record<string, string> = {};
      for (const ind of INDICADORES_SINTOMAS) {
        const valor = r[ind as keyof typeof r] as number | null;
        if (valor !== null && valor !== undefined) {
          classificacoes[ind] = (INDICADORES_INVERTIDOS as readonly string[]).includes(ind)
            ? classificarSintomaInvertido(valor)
            : classificarSintoma(valor);
        }
      }
      return { ...r, classificacoes };
    });
    res.json(comClassificacao);
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/sintomas-grafico", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const registros = await db
      .select()
      .from(trackingSintomasTable)
      .where(eq(trackingSintomasTable.pacienteId, pacienteId))
      .orderBy(asc(trackingSintomasTable.dataSemana));

    if (registros.length === 0) return res.json({ series: [], resumo: [] });

    const ultimo = registros[registros.length - 1];
    const resumo = INDICADORES_SINTOMAS.map((ind) => {
      const valor = ultimo[ind as keyof typeof ultimo] as number | null;
      const isInvertido = (INDICADORES_INVERTIDOS as readonly string[]).includes(ind);
      return {
        indicador: ind,
        atual: valor,
        limiteInferior: 5,
        limiteSuperior: 8,
        classificacao: valor !== null ? (isInvertido ? classificarSintomaInvertido(valor) : classificarSintoma(valor)) : null,
        invertido: isInvertido,
      };
    });

    const series = registros.map((r) => {
      const ponto: Record<string, any> = { data: r.dataSemana };
      for (const ind of INDICADORES_SINTOMAS) {
        ponto[ind] = r[ind as keyof typeof r];
      }
      return ponto;
    });

    res.json({ series, resumo });
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/monitoramento/acompanhamento-formula", async (req, res) => {
  try {
    const parsed = insertAcompanhamentoFormulaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const registro = await db.insert(acompanhamentoFormulaTable).values(parsed.data).returning();
    res.status(201).json(registro[0]);
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.get("/pacientes/:pacienteId/acompanhamento-formulas", async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    if (isNaN(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });

    const registros = await db
      .select()
      .from(acompanhamentoFormulaTable)
      .where(eq(acompanhamentoFormulaTable.pacienteId, pacienteId))
      .orderBy(desc(acompanhamentoFormulaTable.criadoEm));
    res.json(registros);
  } catch (err: any) {
    console.error("Erro monitoramento:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
