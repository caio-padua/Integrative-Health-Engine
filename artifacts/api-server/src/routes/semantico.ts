import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { eq, sql, and, like } from "drizzle-orm";
import {
  examesBaseTable,
  blocosTable,
  sintomasTable,
  cirurgiasTable,
  dicionarioGrausTable,
} from "@workspace/db";
import {
  generateSemanticCode,
  getSemanticCodeRules,
  parseSemanticCode,
  buildSemanticCode,
  GRADE_CODES,
  GRADE_NAMES,
} from "../services/semanticCodeEngine";

const router = Router();

router.get("/regras", (_req: Request, res: Response) => {
  res.json(getSemanticCodeRules());
});

router.get("/blocos", async (_req: Request, res: Response) => {
  try {
    const blocos = await db
      .select()
      .from(blocosTable)
      .where(eq(blocosTable.ativo, true))
      .orderBy(blocosTable.codigoBloco);

    res.json(blocos);
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/blocos/:blocoId/grades", async (req: Request, res: Response) => {
  try {
    const { blocoId } = req.params;
    const bloco = await db.select().from(blocosTable).where(eq(blocosTable.codigoBloco, blocoId));

    if (bloco.length === 0) {
      return res.status(404).json({ erro: "Bloco não encontrado" });
    }

    const exames = await db
      .select()
      .from(examesBaseTable)
      .where(eq(examesBaseTable.blocoOficial, bloco[0].nomeBloco));

    const gradeMap: Record<string, any[]> = {};
    for (const e of exames) {
      const grade = e.grauDoBloco || "SEM GRADE";
      if (!gradeMap[grade]) gradeMap[grade] = [];
      gradeMap[grade].push({
        id: e.id,
        codigoSemantico: e.codigoSemantico,
        nomeExame: e.nomeExame,
        b4: e.b4,
      });
    }

    res.json({
      bloco: bloco[0],
      grades: Object.entries(gradeMap).map(([nome, exames]) => ({
        nome,
        codigo: GRADE_CODES[nome] || nome,
        totalExames: exames.length,
        exames,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/graus", async (_req: Request, res: Response) => {
  try {
    const graus = await db.select().from(dicionarioGrausTable);
    res.json(graus);
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

const TIPOS_VALIDOS = ["EXAM", "INJE", "IMPL", "ENDO", "FORM", "DOEN", "SINT", "CIRU", "DIET", "BLCO"];
const GRADES_VALIDAS = Object.keys(GRADE_CODES);

router.post("/gerar-codigo", async (req: Request, res: Response) => {
  try {
    const { tipo, blocoAbrev, gradeNome, itemAbrev } = req.body;

    if (!tipo || !blocoAbrev || !gradeNome || !itemAbrev) {
      return res.status(400).json({
        erro: "Campos obrigatórios: tipo, blocoAbrev, gradeNome, itemAbrev",
      });
    }

    const tipoUpper = tipo.toUpperCase();
    if (!TIPOS_VALIDOS.includes(tipoUpper)) {
      return res.status(400).json({
        erro: `Tipo inválido: ${tipo}. Valores aceitos: ${TIPOS_VALIDOS.join(", ")}`,
      });
    }

    if (!GRADES_VALIDAS.includes(gradeNome) && !Object.values(GRADE_CODES).includes(gradeNome.toUpperCase())) {
      return res.status(400).json({
        erro: `Grade inválida: ${gradeNome}. Valores aceitos: ${GRADES_VALIDAS.join(", ")}`,
      });
    }

    if (blocoAbrev.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(blocoAbrev)) {
      return res.status(400).json({
        erro: "blocoAbrev deve ter exatamente 4 caracteres alfanuméricos",
      });
    }

    if (itemAbrev.length < 1 || itemAbrev.length > 4 || !/^[A-Za-z0-9]+$/.test(itemAbrev)) {
      return res.status(400).json({
        erro: "itemAbrev deve ter 1-4 caracteres alfanuméricos",
      });
    }

    const result = await generateSemanticCode(tipoUpper as any, blocoAbrev, gradeNome, itemAbrev);
    res.json({
      codigoGerado: result.code,
      partes: result.parts,
      regra: `${result.parts.b1} (tipo) + ${result.parts.b2} (bloco) + ${result.parts.b3} (grade) + ${result.parts.b4} (item) + ${result.parts.seq} (seq)`,
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/motor-sugestao/:codigoExame", async (req: Request, res: Response) => {
  try {
    const { codigoExame } = req.params;

    const exame = await db
      .select()
      .from(examesBaseTable)
      .where(
        sql`codigo_semantico = ${codigoExame} OR codigo_exame = ${codigoExame}`,
      );

    if (exame.length === 0) {
      return res.status(404).json({ erro: "Exame não encontrado" });
    }

    const e = exame[0];
    const blocoNome = e.blocoOficial;
    const gradeNome = e.grauDoBloco;

    if (!blocoNome || !gradeNome) {
      return res.status(400).json({ erro: "Exame sem bloco ou grade definidos" });
    }

    const examesDaGrade = await db
      .select()
      .from(examesBaseTable)
      .where(
        and(
          eq(examesBaseTable.blocoOficial, blocoNome),
          eq(examesBaseTable.grauDoBloco, gradeNome),
          eq(examesBaseTable.ativo, true),
        ),
      );

    const bloco = await db
      .select()
      .from(blocosTable)
      .where(eq(blocosTable.nomeBloco, blocoNome));

    res.json({
      exameSolicitado: {
        id: e.id,
        codigoSemantico: e.codigoSemantico,
        nomeExame: e.nomeExame,
        bloco: blocoNome,
        grade: gradeNome,
      },
      regra: `Motor sugere TODOS os exames da ${gradeNome} do ${blocoNome}`,
      bloco: bloco.length > 0
        ? {
            codigoBloco: bloco[0].codigoBloco,
            codigoSemantico: bloco[0].codigoSemantico,
            tipoMacro: bloco[0].tipoMacro,
          }
        : null,
      totalSugeridos: examesDaGrade.length,
      examesSugeridos: examesDaGrade.map((ex) => ({
        id: ex.id,
        codigoSemantico: ex.codigoSemantico,
        nomeExame: ex.nomeExame,
        b4: ex.b4,
        selecionado: true,
      })),
      acaoMedico: "Validar: manter todos, excluir específicos, ou adicionar manuais",
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/sintomas", async (_req: Request, res: Response) => {
  try {
    const sintomas = await db.select().from(sintomasTable).where(eq(sintomasTable.ativo, true));
    res.json(sintomas);
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/cirurgias", async (_req: Request, res: Response) => {
  try {
    const cirurgias = await db.select().from(cirurgiasTable).where(eq(cirurgiasTable.ativo, true));
    res.json(cirurgias);
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
