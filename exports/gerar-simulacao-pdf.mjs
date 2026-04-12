import PDFDocument from "pdfkit";
import fs from "fs";

const doc = new PDFDocument({ size: "A4", margin: 50 });
const output = fs.createWriteStream("exports/Simulacao_Faturamento_PADCOM.pdf");
doc.pipe(output);

const COLORS = {
  navy: "#141B2D",
  primary: "#7BA7CC",
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
  white: "#FFFFFF",
  gray: "#94A3B8",
  darkGray: "#334155",
  lightBg: "#F8FAFC",
  emerald: "#10B981",
  gold: "#EAB308",
};

function drawHeader() {
  doc.rect(0, 0, doc.page.width, 120).fill(COLORS.navy);
  doc.fontSize(28).fillColor(COLORS.primary).text("PADCOM V15.2", 50, 30);
  doc.fontSize(11).fillColor(COLORS.gray).text("Motor Clinico — Consultoria Integrativa", 50, 62);
  doc.fontSize(18).fillColor(COLORS.white).text("Simulacao de Faturamento Mensal", 50, 85);
  doc.fontSize(9).fillColor(COLORS.gray).text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} | Documento confidencial`, 350, 95);
  doc.moveDown(2);
  doc.y = 140;
}

function sectionTitle(title, y) {
  const posY = y || doc.y;
  doc.rect(50, posY, doc.page.width - 100, 28).fill(COLORS.navy);
  doc.fontSize(13).fillColor(COLORS.primary).text(title, 60, posY + 7, { width: doc.page.width - 120 });
  doc.fillColor(COLORS.darkGray);
  doc.y = posY + 38;
}

function tableHeader(cols, widths, y) {
  const posY = y || doc.y;
  doc.rect(50, posY, doc.page.width - 100, 22).fill("#E2E8F0");
  let x = 60;
  cols.forEach((col, i) => {
    doc.fontSize(9).fillColor(COLORS.darkGray).font("Helvetica-Bold")
      .text(col, x, posY + 6, { width: widths[i], align: i === 0 ? "left" : "right" });
    x += widths[i];
  });
  doc.font("Helvetica");
  doc.y = posY + 24;
}

function tableRow(cols, widths, colors, bold) {
  const posY = doc.y;
  if (bold) {
    doc.rect(50, posY, doc.page.width - 100, 20).fill("#F1F5F9");
  }
  let x = 60;
  cols.forEach((col, i) => {
    const color = (colors && colors[i]) || COLORS.darkGray;
    if (bold) doc.font("Helvetica-Bold");
    doc.fontSize(9).fillColor(color)
      .text(col, x, posY + 5, { width: widths[i], align: i === 0 ? "left" : "right" });
    if (bold) doc.font("Helvetica");
    x += widths[i];
  });
  doc.y = posY + 20;
}

function kpiBox(x, y, w, label, value, color) {
  doc.rect(x, y, w, 50).lineWidth(1).strokeColor("#CBD5E1").stroke();
  doc.rect(x, y, 4, 50).fill(color);
  doc.fontSize(8).fillColor(COLORS.gray).text(label, x + 14, y + 8, { width: w - 20 });
  doc.fontSize(16).fillColor(color).font("Helvetica-Bold").text(value, x + 14, y + 24, { width: w - 20 });
  doc.font("Helvetica");
}

const R = (v) => `R$ ${v.toLocaleString("pt-BR")}`;

const clinicas = [
  {
    nome: "Clinica Bem Estar Alphaville",
    medico: "Dr. Ricardo Almeida",
    pacientes: 70,
    modelo: "Por Demanda",
    cor: COLORS.green,
    modulos: [
      { nome: "Mensagens WhatsApp", preco: 350 },
      { nome: "Follow-up Ativo", preco: 500 },
      { nome: "Agenda Inteligente", preco: 200 },
    ],
    demandas: { verde: 42, amarela: 18, vermelha: 10 },
  },
  {
    nome: "Clinica Saude Integral Campinas",
    medico: "Dra. Fernanda Costa",
    pacientes: 70,
    modelo: "Pacote 100 Creditos",
    cor: COLORS.orange,
    modulos: [
      { nome: "Mensagens WhatsApp", preco: 350 },
      { nome: "Consultor Remoto", preco: 1800 },
      { nome: "Follow-up Ativo", preco: 500 },
      { nome: "Validacao Motor", preco: 800 },
      { nome: "Agenda Inteligente", preco: 200 },
    ],
    pacoteValor: 5000,
    pacoteCreditos: 100,
    demandas: { verde: 63, amarela: 26, vermelha: 16 },
  },
  {
    nome: "Clinica Vitallis Centro SP",
    medico: "Dr. Marcos Ferreira",
    pacientes: 70,
    modelo: "Full (Mensalidade Fixa)",
    cor: COLORS.blue,
    modulos: [
      { nome: "Mensagens WhatsApp", preco: 350 },
      { nome: "Consultor Remoto", preco: 1800 },
      { nome: "Follow-up Ativo", preco: 500 },
      { nome: "Validacao Motor", preco: 800 },
      { nome: "Treinamento Equipe", preco: 400 },
      { nome: "Estoque Inteligente", preco: 250 },
      { nome: "Agenda Inteligente", preco: 200 },
    ],
    demandas: { verde: 50, amarela: 30, vermelha: 25 },
  },
];

function calcClinica(c) {
  const totalModulos = c.modulos.reduce((s, m) => s + m.preco, 0);
  const totalDemandas = c.demandas.verde + c.demandas.amarela + c.demandas.vermelha;
  const receitaDemandas = c.demandas.verde * 50 + c.demandas.amarela * 75 + c.demandas.vermelha * 125;
  const custoConsultor = 1412;
  const comissao = c.demandas.verde * 15 + c.demandas.amarela * 25 + c.demandas.vermelha * 50;
  const custoTotal = custoConsultor + comissao;

  let receita;
  if (c.modelo === "Por Demanda") {
    receita = totalModulos + receitaDemandas;
  } else if (c.modelo.startsWith("Pacote")) {
    const excedente = Math.max(0, totalDemandas - c.pacoteCreditos);
    const receitaExcedente = excedente * 75;
    receita = totalModulos + c.pacoteValor + receitaExcedente;
  } else {
    receita = totalModulos;
  }

  return { totalModulos, totalDemandas, receitaDemandas, custoConsultor, comissao, custoTotal, receita, lucro: receita - custoTotal };
}

drawHeader();

doc.fontSize(11).fillColor(COLORS.darkGray)
  .text("Premissas da Simulacao:", 50, doc.y);
doc.moveDown(0.3);
doc.fontSize(9).fillColor(COLORS.gray);
const premissas = [
  "3 clinicas sob consultoria PADCOM, cada uma com 1 medico titular",
  "70 pacientes ativos por clinica/mes (210 total no ecossistema)",
  "Cada paciente gera em media 1,5 demandas/mes de servico",
  "~105 demandas/mes por clinica | 315 demandas totais",
  "Precificacao para clinica: Verde R$50 | Amarela R$75 | Vermelha R$125",
  "Custo consultor: Salario R$1.412 + Comissao (Verde R$15 | Amarela R$25 | Vermelha R$50)",
  "1 consultor de campo alocado por clinica",
];
premissas.forEach((p) => {
  doc.text(`  •  ${p}`, 55, doc.y, { width: doc.page.width - 120 });
  doc.moveDown(0.15);
});
doc.moveDown(0.5);

let totalReceitaGeral = 0;
let totalCustoGeral = 0;

clinicas.forEach((c, idx) => {
  const calc = calcClinica(c);
  totalReceitaGeral += calc.receita;
  totalCustoGeral += calc.custoTotal;

  if (doc.y > 580) {
    doc.addPage();
  }

  sectionTitle(`${idx + 1}. ${c.nome}`);

  doc.fontSize(9).fillColor(COLORS.darkGray);
  doc.text(`Medico: ${c.medico}    |    Pacientes: ${c.pacientes}/mes    |    Modelo: `, 60, doc.y, { continued: true });
  doc.fillColor(c.cor).font("Helvetica-Bold").text(c.modelo);
  doc.font("Helvetica").fillColor(COLORS.darkGray);
  doc.moveDown(0.5);

  const w = [220, 80, 80, 115];
  tableHeader(["Modulo Contratado", "Categoria", "Mensal", ""], w);
  c.modulos.forEach((m) => {
    tableRow([m.nome, "Tecnologia", R(m.preco), ""], w);
  });
  tableRow(["TOTAL MODULOS", "", R(calc.totalModulos), ""], w, [COLORS.darkGray, null, COLORS.primary], true);
  doc.moveDown(0.3);

  const w2 = [120, 80, 80, 100, 115];
  tableHeader(["Complexidade", "Qtd", "Preco Unit.", "Receita", "Comissao Consultor"], w2);
  tableRow(["Verde (simples)", String(c.demandas.verde), "R$ 50", R(c.demandas.verde * 50), R(c.demandas.verde * 15)], w2, [COLORS.green]);
  tableRow(["Amarela (moderada)", String(c.demandas.amarela), "R$ 75", R(c.demandas.amarela * 75), R(c.demandas.amarela * 25)], w2, [COLORS.orange]);
  tableRow(["Vermelha (complexa)", String(c.demandas.vermelha), "R$ 125", R(c.demandas.vermelha * 125), R(c.demandas.vermelha * 50)], w2, [COLORS.red]);
  tableRow([
    `TOTAL (${calc.totalDemandas} demandas)`, "", "",
    R(calc.receitaDemandas),
    R(calc.comissao)
  ], w2, [COLORS.darkGray, null, null, COLORS.primary, COLORS.orange], true);
  doc.moveDown(0.5);

  const boxW = 120;
  const boxY = doc.y;
  const gap = 8;
  const startX = 55;
  kpiBox(startX, boxY, boxW, "RECEITA", R(calc.receita), COLORS.green);
  kpiBox(startX + boxW + gap, boxY, boxW, "CUSTO CONSULTOR", R(calc.custoTotal), COLORS.orange);
  kpiBox(startX + (boxW + gap) * 2, boxY, boxW, "LUCRO LIQUIDO", R(calc.lucro), COLORS.emerald);
  const margem = Math.round((calc.lucro / calc.receita) * 100);
  kpiBox(startX + (boxW + gap) * 3, boxY, boxW, "MARGEM", `${margem}%`, COLORS.blue);
  doc.y = boxY + 60;
  doc.moveDown(0.8);
});

doc.addPage();
drawHeader();

sectionTitle("RESUMO CONSOLIDADO — 3 CLINICAS");
doc.moveDown(0.3);

const totalLucro = totalReceitaGeral - totalCustoGeral;
const margemGeral = Math.round((totalLucro / totalReceitaGeral) * 100);

const bw = 120;
const bGap = 10;
const bY = doc.y;
const bStartX = 55;
kpiBox(bStartX, bY, bw, "RECEITA TOTAL/MES", R(totalReceitaGeral), COLORS.green);
kpiBox(bStartX + bw + bGap, bY, bw, "CUSTO TOTAL/MES", R(totalCustoGeral), COLORS.orange);
kpiBox(bStartX + (bw + bGap) * 2, bY, bw, "LUCRO LIQUIDO/MES", R(totalLucro), COLORS.emerald);
kpiBox(bStartX + (bw + bGap) * 3, bY, bw, "MARGEM GERAL", `${margemGeral}%`, COLORS.blue);
doc.y = bY + 70;

doc.moveDown(0.5);

const w3 = [180, 90, 80, 80, 80];
tableHeader(["Clinica", "Modelo", "Receita", "Custo", "Lucro"], w3);
clinicas.forEach((c) => {
  const calc = calcClinica(c);
  tableRow([c.nome, c.modelo.substring(0, 15), R(calc.receita), R(calc.custoTotal), R(calc.lucro)], w3,
    [COLORS.darkGray, c.cor, COLORS.green, COLORS.orange, COLORS.emerald]);
});
tableRow(["TOTAL ECOSSISTEMA", "", R(totalReceitaGeral), R(totalCustoGeral), R(totalLucro)], w3,
  [COLORS.darkGray, null, COLORS.green, COLORS.orange, COLORS.emerald], true);

doc.moveDown(1.5);
sectionTitle("PROJECAO ANUAL");
doc.moveDown(0.3);

const w4 = [200, 150, 150];
tableHeader(["Indicador", "Mensal", "Anual (12 meses)"], w4);
tableRow(["Receita Bruta", R(totalReceitaGeral), R(totalReceitaGeral * 12)], w4, [null, COLORS.green, COLORS.green]);
tableRow(["Custo Consultores", R(totalCustoGeral), R(totalCustoGeral * 12)], w4, [null, COLORS.orange, COLORS.orange]);
tableRow(["Lucro Liquido", R(totalLucro), R(totalLucro * 12)], w4, [null, COLORS.emerald, COLORS.emerald], true);
tableRow(["Margem de Lucro", `${margemGeral}%`, `${margemGeral}%`], w4, [null, COLORS.blue, COLORS.blue]);

doc.moveDown(1.5);
sectionTitle("ONBOARDING (RECEITA UNICA POR CLINICA)");
doc.moveDown(0.3);

const w5 = [200, 150, 150];
tableHeader(["Item", "Por Clinica", "3 Clinicas"], w5);
tableRow(["Setup + Treinamento Inicial", "R$ 2.500", "R$ 7.500"], w5, [null, COLORS.green, COLORS.green]);
tableRow(["Integracao de Sistemas", "R$ 1.500", "R$ 4.500"], w5);
tableRow(["Configuracao Motor Clinico", "R$ 1.000", "R$ 3.000"], w5);
tableRow(["TOTAL ONBOARDING", "R$ 5.000", "R$ 15.000"], w5, [null, COLORS.green, COLORS.green], true);

doc.moveDown(1.5);
sectionTitle("CATALOGO DE MODULOS PADCOM");
doc.moveDown(0.3);

const modulos = [
  ["Mensagens WhatsApp", "Comunicacao", "R$ 350", "R$ 15/demanda"],
  ["Consultor Remoto", "Operacional", "R$ 1.800", "R$ 80/demanda"],
  ["Follow-up Ativo", "Acompanhamento", "R$ 500", "R$ 20/demanda"],
  ["Validacao Motor", "Clinico", "R$ 800", "R$ 35/demanda"],
  ["Treinamento Equipe", "Educacional", "R$ 400", "R$ 25/sessao"],
  ["Estoque Inteligente", "Operacional", "R$ 250", "R$ 10/demanda"],
  ["Relatorios BI", "Analitico", "R$ 600", "R$ 30/relatorio"],
  ["Agenda Inteligente", "Tecnologia", "R$ 200", "R$ 8/demanda"],
];

const w6 = [160, 90, 90, 120];
tableHeader(["Modulo", "Categoria", "Mensal", "Preco Demanda"], w6);
modulos.forEach((m) => {
  tableRow(m, w6, [COLORS.primary]);
});

doc.moveDown(2);
doc.fontSize(8).fillColor(COLORS.gray)
  .text("Este documento e uma simulacao para fins de planejamento comercial.", 50, doc.y, { align: "center", width: doc.page.width - 100 });
doc.text("Valores podem variar conforme negociacao e perfil da clinica.", { align: "center", width: doc.page.width - 100 });
doc.text("PADCOM V15.2 — Motor Clinico | Documento Confidencial", { align: "center", width: doc.page.width - 100 });

doc.end();
output.on("finish", () => {
  console.log("PDF gerado com sucesso: exports/Simulacao_Faturamento_PADCOM.pdf");
});
