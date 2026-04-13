import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  examesBaseTable,
  blocosTable,
  sintomasTable,
  cirurgiasTable,
  injetaveisTable,
  endovenososTable,
  implantesTable,
  formulasTable,
  doencasTable,
  dietasTable,
} from "@workspace/db";
import {
  GRADE_CODES,
  GRADE_NAMES,
} from "../services/semanticCodeEngine";

const router = Router();

const NOMENCLATURA_RULES = {
  formato: "B1 B2 B3 B4 SEQ",
  descricao: "Sistema de codificação semântica Dr. Manus — 5 campos separados por espaço",
  campos: [
    {
      campo: "B1",
      nome: "Tipo do Item",
      tamanho: 4,
      descricao: "Identifica a categoria macro do item clínico",
      valores: [
        { codigo: "EXAM", descricao: "Exame laboratorial ou de imagem" },
        { codigo: "INJE", descricao: "Injetável intramuscular" },
        { codigo: "IMPL", descricao: "Implante subcutâneo" },
        { codigo: "ENDO", descricao: "Endovenoso (IV)" },
        { codigo: "FORM", descricao: "Fórmula manipulada" },
        { codigo: "DOEN", descricao: "Doença / condição clínica" },
        { codigo: "SINT", descricao: "Sintoma relatado" },
        { codigo: "CIRU", descricao: "Cirurgia / procedimento" },
        { codigo: "DIET", descricao: "Dieta / protocolo alimentar" },
        { codigo: "BLCO", descricao: "Bloco agrupador de exames" },
      ],
    },
    {
      campo: "B2",
      nome: "Bloco (Abreviação)",
      tamanho: 4,
      descricao: "Abreviação de 4 caracteres do bloco ao qual o item pertence (ex: TIRE = Tireoide, ONCO = Oncológico)",
      regra: "Derivado automaticamente do nome do bloco. Primeiros 4 caracteres significativos em maiúsculas.",
    },
    {
      campo: "B3",
      nome: "Grade do Bloco",
      tamanho: 4,
      descricao: "Nível de complexidade do exame dentro do bloco",
      valores: Object.entries(GRADE_CODES).map(([nome, codigo]) => ({
        codigo,
        descricao: nome,
      })),
    },
    {
      campo: "B4",
      nome: "Item (Mnemônico)",
      tamanho: 4,
      descricao: "Abreviação mnemônica do item específico (ex: CALC = Calcitonina, INSU = Insulina)",
      regra: "4 caracteres alfanuméricos derivados do nome do item. Único dentro do bloco+grade.",
    },
    {
      campo: "SEQ",
      nome: "Sequencial",
      tamanho: 4,
      descricao: "Número sequencial de 4 dígitos para diferenciar itens com mesmo B1+B2+B3+B4",
      regra: "Inicia em 0001 e incrementa automaticamente.",
    },
  ],
  exemplos: [
    {
      codigo: "EXAM TIRE GBAS T3LV 0001",
      explicacao: "Exame → Bloco Tireoide → Grade Básica → T3 Livre → Sequencial 1",
    },
    {
      codigo: "INJE HORM SGRD TSTO 0001",
      explicacao: "Injetável → Bloco Hormonal → Sem Grade → Testosterona → Sequencial 1",
    },
    {
      codigo: "IMPL SUBC SGRD GEST 0001",
      explicacao: "Implante → Subcutâneo → Sem Grade → Gestrinona → Sequencial 1",
    },
  ],
  autoAplicacao: "Ao cadastrar um novo item em qualquer catálogo (exame, injetável, implante, etc.), o sistema gera automaticamente o código semântico usando as regras B1-B2-B3-B4-SEQ.",
};

router.get("/seguranca/base-dados", async (_req: Request, res: Response) => {
  try {
    const [
      examesTotal,
      examesComCodigo,
      blocosTotal,
      blocosComCodigo,
      injetaveisTotal,
      injetaveisComCodigo,
      endovenososTotal,
      endovenososComCodigo,
      implantesTotal,
      implantesComCodigo,
      formulasTotal,
      formulasComCodigo,
      doencasTotal,
      doencasComCodigo,
      sintomasTotal,
      sintomasComCodigo,
      cirurgiasTotal,
      cirurgiasComCodigo,
      dietasTotal,
      dietasComCodigo,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(examesBaseTable),
      db.select({ count: sql<number>`count(*)` }).from(examesBaseTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(blocosTable),
      db.select({ count: sql<number>`count(*)` }).from(blocosTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(injetaveisTable),
      db.select({ count: sql<number>`count(*)` }).from(injetaveisTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(endovenososTable),
      db.select({ count: sql<number>`count(*)` }).from(endovenososTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(implantesTable),
      db.select({ count: sql<number>`count(*)` }).from(implantesTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(formulasTable),
      db.select({ count: sql<number>`count(*)` }).from(formulasTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(doencasTable),
      db.select({ count: sql<number>`count(*)` }).from(doencasTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(sintomasTable),
      db.select({ count: sql<number>`count(*)` }).from(sintomasTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(cirurgiasTable),
      db.select({ count: sql<number>`count(*)` }).from(cirurgiasTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
      db.select({ count: sql<number>`count(*)` }).from(dietasTable),
      db.select({ count: sql<number>`count(*)` }).from(dietasTable).where(sql`codigo_semantico IS NOT NULL AND TRIM(codigo_semantico) <> ''`),
    ]);

    const tabelas = [
      { tabela: "Exames", icone: "microscope", total: Number(examesTotal[0].count), comCodigo: Number(examesComCodigo[0].count) },
      { tabela: "Blocos", icone: "layers", total: Number(blocosTotal[0].count), comCodigo: Number(blocosComCodigo[0].count) },
      { tabela: "Injetáveis", icone: "syringe", total: Number(injetaveisTotal[0].count), comCodigo: Number(injetaveisComCodigo[0].count) },
      { tabela: "Endovenosos", icone: "droplets", total: Number(endovenososTotal[0].count), comCodigo: Number(endovenososComCodigo[0].count) },
      { tabela: "Implantes", icone: "circle-dot", total: Number(implantesTotal[0].count), comCodigo: Number(implantesComCodigo[0].count) },
      { tabela: "Fórmulas", icone: "flask-conical", total: Number(formulasTotal[0].count), comCodigo: Number(formulasComCodigo[0].count) },
      { tabela: "Doenças", icone: "brain", total: Number(doencasTotal[0].count), comCodigo: Number(doencasComCodigo[0].count) },
      { tabela: "Sintomas", icone: "thermometer", total: Number(sintomasTotal[0].count), comCodigo: Number(sintomasComCodigo[0].count) },
      { tabela: "Cirurgias", icone: "scissors", total: Number(cirurgiasTotal[0].count), comCodigo: Number(cirurgiasComCodigo[0].count) },
      { tabela: "Dietas", icone: "apple", total: Number(dietasTotal[0].count), comCodigo: Number(dietasComCodigo[0].count) },
    ];

    const totalGeral = tabelas.reduce((acc, t) => acc + t.total, 0);
    const totalComCodigo = tabelas.reduce((acc, t) => acc + t.comCodigo, 0);
    const cobertura = totalGeral > 0 ? Math.round((totalComCodigo / totalGeral) * 100) : 0;

    res.json({
      resumo: {
        totalItens: totalGeral,
        totalComCodigo,
        totalSemCodigo: totalGeral - totalComCodigo,
        coberturaPct: cobertura,
      },
      tabelas,
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/seguranca/regras-nomenclatura", async (_req: Request, res: Response) => {
  try {
    const blocos = await db
      .select({
        nomeBloco: blocosTable.nomeBloco,
        codigoBloco: blocosTable.codigoBloco,
        codigoSemantico: blocosTable.codigoSemantico,
        tipoMacro: blocosTable.tipoMacro,
      })
      .from(blocosTable)
      .where(sql`codigo_semantico IS NOT NULL`);

    const grades = Object.entries(GRADE_CODES).map(([nome, codigo]) => ({
      nome,
      codigo,
      nomeExibicao: GRADE_NAMES[codigo] || nome,
    }));

    res.json({
      regras: NOMENCLATURA_RULES,
      blocosAtivos: blocos,
      gradesDisponiveis: grades,
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

router.get("/seguranca/itens-sem-codigo", async (_req: Request, res: Response) => {
  try {
    const isNullOrEmpty = sql`(codigo_semantico IS NULL OR TRIM(codigo_semantico) = '')`;
    const itens: Array<{ id: number; nome: string; tipo: string }> = [];

    const r1 = await db.select({ id: examesBaseTable.id, nome: examesBaseTable.nomeExame }).from(examesBaseTable).where(isNullOrEmpty);
    r1.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "EXAM" }));

    const r2 = await db.select({ id: injetaveisTable.id, nome: injetaveisTable.nomeExibicao }).from(injetaveisTable).where(isNullOrEmpty);
    r2.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "INJE" }));

    const r3 = await db.select({ id: implantesTable.id, nome: implantesTable.nomeImplante }).from(implantesTable).where(isNullOrEmpty);
    r3.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "IMPL" }));

    const r4 = await db.select({ id: endovenososTable.id, nome: endovenososTable.nomeExibicao }).from(endovenososTable).where(isNullOrEmpty);
    r4.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "ENDO" }));

    const r5 = await db.select({ id: formulasTable.id, nome: formulasTable.identificador }).from(formulasTable).where(isNullOrEmpty);
    r5.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "FORM" }));

    const r6 = await db.select({ id: doencasTable.id, nome: doencasTable.nomeDoenca }).from(doencasTable).where(isNullOrEmpty);
    r6.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "DOEN" }));

    const r7 = await db.select({ id: dietasTable.id, nome: dietasTable.modeloDieta }).from(dietasTable).where(isNullOrEmpty);
    r7.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "DIET" }));

    const r8 = await db.select({ id: sintomasTable.id, nome: sintomasTable.nomeSintoma }).from(sintomasTable).where(isNullOrEmpty);
    r8.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "SINT" }));

    const r9 = await db.select({ id: cirurgiasTable.id, nome: cirurgiasTable.nomeCirurgia }).from(cirurgiasTable).where(isNullOrEmpty);
    r9.forEach(i => itens.push({ id: i.id, nome: i.nome, tipo: "CIRU" }));

    res.json({
      total: itens.length,
      itens,
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
