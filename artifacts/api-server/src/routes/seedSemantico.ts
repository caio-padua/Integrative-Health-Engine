import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  examesBaseTable,
  blocosTable,
  injetaveisTable,
  endovenososTable,
  implantesTable,
  formulasTable,
  doencasTable,
  dietasTable,
  sintomasTable,
  cirurgiasTable,
  dicionarioGrausTable,
} from "@workspace/db";
import * as fs from "fs";
import * as path from "path";

const router = Router();

interface SeedResult {
  blocos: { total: number; atualizados: number; inseridos: number };
  exames: { total: number; atualizados: number; inseridos: number; naoEncontrados: string[] };
  injetaveis: { total: number; atualizados: number };
  implantes: { total: number; atualizados: number };
  endovenosos: { total: number; atualizados: number };
  formulas: { total: number; atualizados: number };
  doencas: { total: number; atualizados: number };
  sintomas: { total: number; inseridos: number };
  cirurgias: { total: number; inseridos: number };
  dietas: { total: number; atualizados: number };
  graus: { total: number };
}

router.post("/executar", async (_req: Request, res: Response) => {
  try {
    const jsonPath = path.resolve(
      process.cwd(),
      "../..",
      "attached_assets/CODIGO_BLOCOS_SEMANTICOS_1775956870450.json",
    );

    let jsonData: any;
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      jsonData = JSON.parse(raw);
    } catch {
      const altPath = path.resolve(
        process.cwd(),
        "attached_assets/CODIGO_BLOCOS_SEMANTICOS_1775956870450.json",
      );
      const raw = fs.readFileSync(altPath, "utf8");
      jsonData = JSON.parse(raw);
    }

    const result: SeedResult = {
      blocos: { total: 0, atualizados: 0, inseridos: 0 },
      exames: { total: 0, atualizados: 0, inseridos: 0, naoEncontrados: [] },
      injetaveis: { total: 0, atualizados: 0 },
      implantes: { total: 0, atualizados: 0 },
      endovenosos: { total: 0, atualizados: 0 },
      formulas: { total: 0, atualizados: 0 },
      doencas: { total: 0, atualizados: 0 },
      sintomas: { total: 0, inseridos: 0 },
      cirurgias: { total: 0, inseridos: 0 },
      dietas: { total: 0, atualizados: 0 },
      graus: { total: 0 },
    };

    const graus = [
      { grau: "GRADE BASICA", descricao: "Exames essenciais de rastreio", quandoUsar: "Check-up básico, primeira consulta" },
      { grau: "GRADE INTERMEDIARIA", descricao: "Aprofundamento diagnóstico", quandoUsar: "Quando grade básica indica alterações" },
      { grau: "GRADE AMPLIADA", descricao: "Investigação avançada", quandoUsar: "Condições complexas, múltiplos eixos" },
      { grau: "GRADE SOFISTICADA", descricao: "Exames especializados de alta complexidade", quandoUsar: "Investigação rara, genética, biomarcadores avançados" },
      { grau: "SEM GRADE", descricao: "Exames de imagem e procedimentos", quandoUsar: "Blocos sem classificação por grade (imagem, endoscopia)" },
    ];

    for (const g of graus) {
      const existing = await db.select().from(dicionarioGrausTable).where(eq(dicionarioGrausTable.grau, g.grau));
      if (existing.length === 0) {
        await db.insert(dicionarioGrausTable).values(g);
      } else {
        await db.update(dicionarioGrausTable).set(g).where(eq(dicionarioGrausTable.grau, g.grau));
      }
      result.graus.total++;
    }

    for (const bloco of jsonData.blocos) {
      result.blocos.total++;
      const seqNum = bloco.codigo_novo.split(" ").pop() || "0001";
      const blocoId = `BLK${seqNum.padStart(3, "0")}`;
      const existing = await db.select().from(blocosTable).where(eq(blocosTable.codigoBloco, blocoId));

      const gradesList = bloco.usa_grade === "SIM"
        ? ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA", "GRADE SOFISTICADA"]
        : ["SEM GRADE"];

      const updateData = {
        codigoSemantico: bloco.codigo_novo,
        b1: "BLCO",
        b2: bloco.codigo_novo.split(" ")[1] || "",
        b3: bloco.codigo_novo.split(" ")[2] || "",
        b4: bloco.codigo_novo.split(" ")[3] || "",
        seq: seqNum,
        nomeBloco: bloco.nome_real,
        usaGrade: bloco.usa_grade === "SIM",
        tipoMacro: bloco.tipo_macro,
        totalItensMapeados: parseInt(bloco.total_itens) || 0,
        grausDisponiveis: gradesList,
      };

      if (existing.length > 0) {
        await db.update(blocosTable).set(updateData).where(eq(blocosTable.codigoBloco, blocoId));
        result.blocos.atualizados++;
      } else {
        await db.insert(blocosTable).values({ ...updateData, codigoBloco: blocoId });
        result.blocos.inseridos++;
      }
    }

    const allExames = await db.select().from(examesBaseTable);
    const examesByBlocoNome = new Map<string, typeof allExames[0]>();
    const examesByCodSem = new Map<string, typeof allExames[0]>();
    const examesByName = new Map<string, typeof allExames[0][]>();
    for (const e of allExames) {
      const blocoKey = `${(e.blocoOficial || "").toUpperCase().trim()}::${e.nomeExame.toUpperCase().trim()}`;
      examesByBlocoNome.set(blocoKey, e);
      if (e.codigoSemantico) {
        examesByCodSem.set(e.codigoSemantico, e);
      }
      const nameKey = e.nomeExame.toUpperCase().trim();
      if (!examesByName.has(nameKey)) {
        examesByName.set(nameKey, []);
      }
      examesByName.get(nameKey)!.push(e);
    }
    const usedIds = new Set<number>();

    for (const exam of jsonData.exames) {
      result.exames.total++;
      const blocoKey = `${exam.bloco_nome.toUpperCase().trim()}::${exam.nome_exame.toUpperCase().trim()}`;
      const nameKey = exam.nome_exame.toUpperCase().trim();

      let existing = examesByCodSem.get(exam.codigo_novo)
        || examesByBlocoNome.get(blocoKey);

      if (!existing) {
        const nameMatches = examesByName.get(nameKey) || [];
        existing = nameMatches.find(e => !usedIds.has(e.id));
      }

      const updateData = {
        codigoSemantico: exam.codigo_novo,
        b1: exam.b1,
        b2: exam.b2,
        b3: exam.b3,
        b4: exam.b4,
        seq: exam.seq,
        blocoOficial: exam.bloco_nome,
        grauDoBloco: exam.grade_exclusiva,
        usaGrade: exam.grade_exclusiva !== "SEM GRADE" ? "SIM" : "NAO",
      };

      if (existing && !usedIds.has(existing.id)) {
        await db.update(examesBaseTable).set(updateData).where(eq(examesBaseTable.id, existing.id));
        result.exames.atualizados++;
        usedIds.add(existing.id);
      } else {
        const codeKey = exam.codigo_novo.replace(/\s+/g, "");
        const existsCode = await db.select().from(examesBaseTable).where(eq(examesBaseTable.codigoExame, codeKey));
        if (existsCode.length === 0) {
          await db.insert(examesBaseTable).values({
            codigoExame: codeKey,
            ...updateData,
            grupoPrincipal: exam.bloco_nome,
            nomeExame: exam.nome_exame,
            ativo: true,
          });
          result.exames.inseridos++;
          result.exames.naoEncontrados.push(`${exam.nome_exame} (${exam.bloco_nome})`);
        } else {
          await db.update(examesBaseTable).set(updateData).where(eq(examesBaseTable.codigoExame, codeKey));
          result.exames.atualizados++;
        }
      }
    }

    const allInjetaveis = await db.select().from(injetaveisTable);
    const injetaveisByNome = new Map<string, typeof allInjetaveis[0]>();
    for (const inj of allInjetaveis) {
      injetaveisByNome.set(inj.nomeExibicao.toUpperCase().trim(), inj);
      injetaveisByNome.set(inj.nomeAmpola.toUpperCase().trim(), inj);
    }

    for (const inj of jsonData.injetaveis) {
      result.injetaveis.total++;
      const code = inj.codigo_novo;

      await db.execute(sql`
        UPDATE injetaveis SET
          codigo_semantico = ${code},
          b1 = ${inj.b1},
          b2 = ${inj.b2},
          b3 = ${inj.b3},
          b4 = ${inj.b4},
          seq = ${inj.seq},
          substancia_base = ${inj.substancia_base || null}
        WHERE UPPER(TRIM(nome_exibicao)) = ${inj.nome_real.toUpperCase().trim()}
          OR UPPER(TRIM(nome_ampola)) = ${inj.nome_real.toUpperCase().trim()}
          OR codigo_padcom = ${inj.codigo_antigo || "---"}
      `);
      result.injetaveis.atualizados++;
    }

    const allImplantes = await db.select().from(implantesTable);
    for (const imp of jsonData.implantes) {
      result.implantes.total++;
      const code = imp.codigo_novo;

      await db.execute(sql`
        UPDATE implantes SET
          codigo_semantico = ${code},
          b1 = ${imp.b1},
          b2 = ${imp.b2},
          b3 = ${imp.b3},
          b4 = ${imp.b4},
          seq = ${imp.seq}
        WHERE UPPER(TRIM(nome_implante)) = ${imp.nome_real.toUpperCase().trim()}
          OR UPPER(TRIM(substancia_ativa)) LIKE ${"%" + (imp.substancia_base || "---").toUpperCase() + "%"}
          OR codigo_padcom = ${imp.codigo_antigo || "---"}
      `);
      result.implantes.atualizados++;
    }

    for (const endo of jsonData.endovenosos) {
      result.endovenosos.total++;
      const code = endo.codigo_novo;

      await db.execute(sql`
        UPDATE endovenosos SET
          codigo_semantico = ${code},
          b1 = ${endo.b1},
          b2 = ${endo.b2},
          b3 = ${endo.b3},
          b4 = ${endo.b4},
          seq = ${endo.seq}
        WHERE UPPER(TRIM(nome_soro)) = ${endo.nome_real.toUpperCase().trim()}
          OR UPPER(TRIM(nome_exibicao)) = ${endo.nome_real.toUpperCase().trim()}
          OR codigo_padcom = ${endo.codigo_antigo || "---"}
      `);
      result.endovenosos.atualizados++;
    }

    for (const form of jsonData.formulas) {
      result.formulas.total++;
      const code = form.codigo_novo;

      await db.execute(sql`
        UPDATE formulas SET
          codigo_semantico = ${code},
          b1 = ${form.b1},
          b2 = ${form.b2},
          b3 = ${form.b3},
          b4 = ${form.b4},
          seq = ${form.seq}
        WHERE UPPER(TRIM(identificador)) = ${form.nome_real.toUpperCase().trim()}
          OR UPPER(TRIM(conteudo)) LIKE ${"%" + form.nome_real.toUpperCase().substring(0, 20) + "%"}
          OR codigo_padcom = ${form.codigo_antigo || "---"}
      `);
      result.formulas.atualizados++;
    }

    for (const doenca of jsonData.doencas) {
      result.doencas.total++;
      const code = doenca.codigo_novo;

      await db.execute(sql`
        UPDATE doencas SET
          codigo_semantico = ${code},
          b1 = ${doenca.b1},
          b2 = ${doenca.b2},
          b3 = ${doenca.b3},
          b4 = ${doenca.b4},
          seq = ${doenca.seq},
          eixo = ${doenca.eixo || null},
          blocos_motor = ${doenca.blocos_motor || null},
          codigo_legado = ${doenca.codigo_legado || null},
          codigo_v14 = ${doenca.codigo_v14 || null}
        WHERE UPPER(TRIM(nome_doenca)) = ${doenca.nome_real.toUpperCase().trim()}
          OR codigo_doenca = ${doenca.codigo_legado || "---"}
      `);
      result.doencas.atualizados++;
    }

    for (const sintoma of jsonData.sintomas) {
      result.sintomas.total++;
      const existing = await db
        .select()
        .from(sintomasTable)
        .where(eq(sintomasTable.codigoSemantico, sintoma.codigo_novo));

      if (existing.length === 0) {
        await db.insert(sintomasTable).values({
          codigoSemantico: sintoma.codigo_novo,
          nomeSintoma: sintoma.nome_real,
          b1: sintoma.b1,
          b2: sintoma.b2,
          b3: sintoma.b3,
          b4: sintoma.b4,
          seq: sintoma.seq,
        });
        result.sintomas.inseridos++;
      }
    }

    for (const cirurgia of jsonData.cirurgias) {
      result.cirurgias.total++;
      const existing = await db
        .select()
        .from(cirurgiasTable)
        .where(eq(cirurgiasTable.codigoSemantico, cirurgia.codigo_novo));

      if (existing.length === 0) {
        await db.insert(cirurgiasTable).values({
          codigoSemantico: cirurgia.codigo_novo,
          nomeCirurgia: cirurgia.nome_real,
          b1: cirurgia.b1,
          b2: cirurgia.b2,
          b3: cirurgia.b3,
          b4: cirurgia.b4,
          seq: cirurgia.seq,
        });
        result.cirurgias.inseridos++;
      }
    }

    for (const dieta of jsonData.dietas) {
      result.dietas.total++;
      const code = dieta.codigo_novo;

      await db.execute(sql`
        UPDATE dietas SET
          codigo_semantico = ${code},
          b1 = ${dieta.b1},
          b2 = ${dieta.b2},
          b3 = ${dieta.b3},
          b4 = ${dieta.b4},
          seq = ${dieta.seq}
        WHERE UPPER(TRIM(modelo_dieta)) LIKE ${"%" + dieta.nome_real.toUpperCase().substring(0, 15) + "%"}
          OR codigo_dieta = ${dieta.codigo_novo.replace(/\s+/g, "")}
      `);
      result.dietas.atualizados++;
    }

    res.json({
      sucesso: true,
      mensagem: "Códigos semânticos do Dr. Manus aplicados com sucesso!",
      resultado: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro no seed semântico:", error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      stack: error.stack,
    });
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const [examesTotal] = await db.select({ count: sql`count(*)` }).from(examesBaseTable);
    const [examesComCodigo] = await db
      .select({ count: sql`count(*)` })
      .from(examesBaseTable)
      .where(sql`codigo_semantico IS NOT NULL`);

    const [blocosTotal] = await db.select({ count: sql`count(*)` }).from(blocosTable);
    const [blocosComCodigo] = await db
      .select({ count: sql`count(*)` })
      .from(blocosTable)
      .where(sql`codigo_semantico IS NOT NULL`);

    const [injetaveisTotal] = await db.select({ count: sql`count(*)` }).from(injetaveisTable);
    const [injetaveisComCodigo] = await db
      .select({ count: sql`count(*)` })
      .from(injetaveisTable)
      .where(sql`codigo_semantico IS NOT NULL`);

    const [implantesTotal] = await db.select({ count: sql`count(*)` }).from(implantesTable);
    const [implantesComCodigo] = await db
      .select({ count: sql`count(*)` })
      .from(implantesTable)
      .where(sql`codigo_semantico IS NOT NULL`);

    const [sintomasTotal] = await db.select({ count: sql`count(*)` }).from(sintomasTable);
    const [cirurgiasTotal] = await db.select({ count: sql`count(*)` }).from(cirurgiasTable);

    res.json({
      exames: {
        total: Number(examesTotal.count),
        comCodigoSemantico: Number(examesComCodigo.count),
        percentual: Math.round((Number(examesComCodigo.count) / Number(examesTotal.count)) * 100),
      },
      blocos: {
        total: Number(blocosTotal.count),
        comCodigoSemantico: Number(blocosComCodigo.count),
      },
      injetaveis: {
        total: Number(injetaveisTotal.count),
        comCodigoSemantico: Number(injetaveisComCodigo.count),
      },
      implantes: {
        total: Number(implantesTotal.count),
        comCodigoSemantico: Number(implantesComCodigo.count),
      },
      sintomas: { total: Number(sintomasTotal.count) },
      cirurgias: { total: Number(cirurgiasTotal.count) },
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/exames-por-bloco/:blocoId", async (req: Request, res: Response) => {
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

    const porGrade: Record<string, any[]> = {};
    for (const e of exames) {
      const grade = e.grauDoBloco || "SEM GRADE";
      if (!porGrade[grade]) porGrade[grade] = [];
      porGrade[grade].push({
        id: e.id,
        codigoSemantico: e.codigoSemantico,
        codigoExame: e.codigoExame,
        nomeExame: e.nomeExame,
        b1: e.b1,
        b2: e.b2,
        b3: e.b3,
        b4: e.b4,
        seq: e.seq,
      });
    }

    res.json({
      bloco: {
        id: bloco[0].id,
        codigoBloco: bloco[0].codigoBloco,
        codigoSemantico: bloco[0].codigoSemantico,
        nomeBloco: bloco[0].nomeBloco,
        usaGrade: bloco[0].usaGrade,
        tipoMacro: bloco[0].tipoMacro,
        totalExames: exames.length,
      },
      examesPorGrade: porGrade,
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
