import { Router } from "express";
import { db } from "@workspace/db";
import {
  direcaoFavoravelExameTable,
  insertDirecaoFavoravelExameSchema,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/direcao-favoravel-exame", async (_req, res) => {
  try {
    const registros = await db.select().from(direcaoFavoravelExameTable);
    res.json(registros);
  } catch (err: any) {
    console.error("Erro direcao exame:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/direcao-favoravel-exame", async (req, res) => {
  try {
    const parsed = insertDirecaoFavoravelExameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: parsed.error.issues });
    }
    const registro = await db.insert(direcaoFavoravelExameTable).values(parsed.data).returning();
    res.status(201).json(registro[0]);
  } catch (err: any) {
    if (err.message?.includes("unique")) {
      return res.status(409).json({ erro: "Exame já cadastrado" });
    }
    console.error("Erro direcao exame:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.post("/direcao-favoravel-exame/seed", async (_req, res) => {
  try {
    const examesV22 = [
      { nomeExame: "GLICOSE JEJUM", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "GLICEMICO", descricao: "Controle glicêmico basal" },
      { nomeExame: "HB A1C", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "GLICEMICO", descricao: "Média glicêmica 90 dias" },
      { nomeExame: "INSULINA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "GLICEMICO", descricao: "Pressão insulínica" },
      { nomeExame: "HOMA IR", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "GLICEMICO", descricao: "Resistência insulínica" },
      { nomeExame: "COLESTEROL TOTAL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "LIPIDICO", descricao: "Risco cardiometabólico" },
      { nomeExame: "HDL", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "LIPIDICO", descricao: "Proteção vascular" },
      { nomeExame: "LDL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "LIPIDICO", descricao: "Risco aterogênico" },
      { nomeExame: "VLDL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "LIPIDICO", descricao: "Partículas ricas em TG" },
      { nomeExame: "TRIGLICERIDEOS", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "LIPIDICO", descricao: "Carga triglicerídica" },
      { nomeExame: "TGO AST", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEPATICO", descricao: "Função hepática" },
      { nomeExame: "TGP ALT", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEPATICO", descricao: "Função hepática" },
      { nomeExame: "GGT", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEPATICO", descricao: "Função biliar" },
      { nomeExame: "FOSFATASE ALCALINA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEPATICO", descricao: "Função biliar" },
      { nomeExame: "BILIRRUBINA TOTAL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEPATICO", descricao: "Metabolismo hepático" },
      { nomeExame: "ALBUMINA", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HEPATICO", descricao: "Reserva hepática" },
      { nomeExame: "CREATININA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "RENAL", descricao: "Função renal" },
      { nomeExame: "UREIA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "RENAL", descricao: "Função renal" },
      { nomeExame: "ACIDO URICO", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "RENAL", descricao: "Metabolismo purínico" },
      { nomeExame: "TSH", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "TIREOIDE", descricao: "Comando tireoidiano" },
      { nomeExame: "T4 LIVRE", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "TIREOIDE", descricao: "Hormônio tireoidiano ativo" },
      { nomeExame: "T3 LIVRE", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "TIREOIDE", descricao: "Hormônio tireoidiano" },
      { nomeExame: "PCR ULTRA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "INFLAMATORIO", descricao: "Inflamação sistêmica" },
      { nomeExame: "HOMOCISTEINA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "INFLAMATORIO", descricao: "Metilação e endotélio" },
      { nomeExame: "TESTOSTERONA TOTAL", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HORMONIOS", descricao: "Reserva androgênica" },
      { nomeExame: "TESTOSTERONA LIVRE", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HORMONIOS", descricao: "Fração ativa androgênica" },
      { nomeExame: "ESTRADIOL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HORMONIOS", descricao: "Aromatização" },
      { nomeExame: "PROLACTINA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HORMONIOS", descricao: "Eixo gonadal" },
      { nomeExame: "LH", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HORMONIOS", descricao: "Comando gonadal" },
      { nomeExame: "FSH", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HORMONIOS", descricao: "Comando gonadal" },
      { nomeExame: "VITAMINA D 25 OH", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "VITAMINAS", descricao: "Reserva de vitamina D" },
      { nomeExame: "VITAMINA B12", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "VITAMINAS", descricao: "Reserva de B12" },
      { nomeExame: "FOLATO", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "VITAMINAS", descricao: "Metilação" },
      { nomeExame: "FERRITINA", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "MINERAIS", descricao: "Reserva de ferro" },
      { nomeExame: "FERRO SERICO", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "MINERAIS", descricao: "Ferro circulante" },
      { nomeExame: "MAGNESIO", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "MINERAIS", descricao: "Balance mineral" },
      { nomeExame: "ZINCO", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "MINERAIS", descricao: "Cofator enzimático" },
      { nomeExame: "SELENIO", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "ANTIOXIDANTES", descricao: "Sistema antioxidante" },
      { nomeExame: "COENZIMA Q10", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "ANTIOXIDANTES", descricao: "Reserva antioxidante" },
      { nomeExame: "HEMOGLOBINA", direcaoFavoravel: "SUBIR_BOM" as const, grupoExame: "HEMATOLOGIA", descricao: "Transporte de oxigênio" },
      { nomeExame: "HEMATOCRITO", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEMATOLOGIA", descricao: "Massa eritrocitária" },
      { nomeExame: "HEMACIAS", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "HEMATOLOGIA", descricao: "Série vermelha" },
      { nomeExame: "PSA TOTAL", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "ONCOLOGICOS", descricao: "Risco prostático" },
      { nomeExame: "CEA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "ONCOLOGICOS", descricao: "Marcador tumoral geral" },
      { nomeExame: "CA 19 9", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "ONCOLOGICOS", descricao: "Marcador pancreatobiliar" },
      { nomeExame: "ANTI TPO", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "AUTOIMUNES", descricao: "Autoimunidade tireoidiana" },
      { nomeExame: "ANTI TIREOGLOBULINA", direcaoFavoravel: "DESCER_BOM" as const, grupoExame: "AUTOIMUNES", descricao: "Autoimunidade tireoidiana" },
    ];

    let inseridos = 0;
    for (const exame of examesV22) {
      try {
        await db.insert(direcaoFavoravelExameTable).values(exame);
        inseridos++;
      } catch {
        // already exists
      }
    }
    res.json({ total: examesV22.length, inseridos, jaExistiam: examesV22.length - inseridos });
  } catch (err: any) {
    console.error("Erro direcao exame:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
