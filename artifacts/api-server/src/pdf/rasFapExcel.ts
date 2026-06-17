/**
 * RAS FAP — versao EXCEL (.xlsx) fiel ao mesmo modelo do PDF.
 *
 * RAS   = Registro de Administracao de Substancias.
 * XLSX  = formato de planilha do Excel.
 *
 * Reproduz: cabecalho PAWARDS/PADCON, bloco do paciente, matriz do protocolo
 * (substancias x aplicacoes x frequencia x inicio) e a GRADE de aplicacoes
 * (1 linha por data de visita, contador N/total por substancia).
 *
 * Reusa o motor de grade `montarGrade` do gerador PDF (mesma logica clinica).
 */
import ExcelJS from "exceljs";
import { type DadosRasFap, type SubstanciaFap, montarGrade } from "./rasFap";

function fmtData(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtMoeda(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

const NAVY = "FF0A2540";
const CIANO_BG = "FFE6F4F8";
const LABEL_INK = "FF475569";
const BORDER = "FF7C8BA1";

function borda(): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style: "thin", color: { argb: BORDER } };
  return { top: s, left: s, bottom: s, right: s };
}

export async function gerarRasFapExcel(dados: DadosRasFap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PAWARDS — Clinical Intelligence System";
  wb.created = new Date();
  const ws = wb.addWorksheet("RAS", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    views: [{ showGridLines: false }],
  });

  const subs: SubstanciaFap[] = dados.substancias;
  const COLS_FIXAS = ["SEM.", "DATA AGEND.", "HORA", "CIENCIA / RUBRICA PACIENTE", "RUBRICA ENF.", "DATA EFETIVA", "OBS."];
  const nFix = COLS_FIXAS.length;
  const totalCols = nFix + subs.length;

  // larguras
  const larguras = [6, 13, 7, 26, 14, 13, 13];
  larguras.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let i = 0; i < subs.length; i++) ws.getColumn(nFix + 1 + i).width = 16;

  const lastColLetter = ws.getColumn(totalCols).letter;
  let r = 1;

  // --- Cabecalho ---
  ws.mergeCells(`A${r}:C${r}`);
  const tit = ws.getCell(`A${r}`);
  tit.value = "RAS";
  tit.font = { name: "Arial", size: 22, bold: true, color: { argb: NAVY } };
  tit.alignment = { vertical: "middle" };
  ws.mergeCells(`D${r}:${ws.getColumn(nFix).letter}${r}`);
  const sub = ws.getCell(`D${r}`);
  sub.value = "REGISTRO DE ADMINISTRACAO DE SUBSTANCIAS";
  sub.font = { name: "Arial", size: 11, bold: true };
  sub.alignment = { vertical: "middle" };
  ws.mergeCells(`${ws.getColumn(nFix + 1).letter}${r}:${lastColLetter}${r}`);
  const brand = ws.getCell(`${ws.getColumn(nFix + 1).letter}${r}`);
  brand.value = "PAWARDS · Clinical Intelligence System    |    PADCON · Advanced Systems Architecture";
  brand.font = { name: "Arial", size: 8, bold: true, color: { argb: NAVY } };
  brand.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  ws.getRow(r).height = 30;
  r += 2;

  // --- Paciente (2 colunas de pares label/valor) ---
  const meta = Math.ceil(totalCols / 2);
  const pares: [string, string][][] = [
    [
      ["NOME", dados.nome],
      ["CPF", dados.cpf || ""],
      ["CELULAR", dados.celular || ""],
      ["MEDICO RESPONSAVEL", dados.medicoResponsavel],
      ["PROTOCOLO", dados.protocoloNumero || ""],
    ],
    [
      ["IDADE", dados.idade || ""],
      ["ENFERMEIRA", dados.enfermeira],
      ["UNIDADE", dados.unidade],
      ["DATA ATENDIMENTO", fmtData(dados.dataAtendimento)],
      ["VALOR TRATAMENTO", fmtMoeda(dados.valorTratamento || 0)],
    ],
  ];
  const colEsqLabel = 1;
  const colEsqVal = 2;
  const colDirLabel = meta + 1;
  const colDirVal = meta + 2;
  for (let i = 0; i < 5; i++) {
    const rowIdx = r + i;
    const setPair = (cLabel: number, cVal: number, valEnd: number, par: [string, string]) => {
      const lc = ws.getCell(rowIdx, cLabel);
      lc.value = par[0];
      lc.font = { name: "Arial", size: 7, bold: true, color: { argb: LABEL_INK } };
      lc.alignment = { vertical: "middle" };
      ws.mergeCells(rowIdx, cVal, rowIdx, valEnd);
      const vc = ws.getCell(rowIdx, cVal);
      vc.value = par[1];
      vc.font = { name: "Arial", size: 9, bold: true };
      vc.alignment = { vertical: "middle" };
    };
    setPair(colEsqLabel, colEsqVal, meta, pares[0][i]);
    setPair(colDirLabel, colDirVal, totalCols, pares[1][i]);
  }
  // moldura do bloco paciente
  for (let rr = r; rr < r + 5; rr++) {
    for (let cc = 1; cc <= totalCols; cc++) ws.getCell(rr, cc).border = borda();
  }
  r += 6;

  // --- Protocolo (matriz) ---
  const protoTitle = ws.getCell(r, 1);
  protoTitle.value = "PROTOCOLO";
  protoTitle.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF0E7490" } };
  r += 1;

  const protoRows: { label: string; valor: (s: SubstanciaFap) => string; destaque?: boolean }[] = [
    { label: "SUBSTANCIAS", valor: (s) => `${s.nome}${s.dose ? " " + s.dose : ""}`, destaque: true },
    { label: "APLICACOES", valor: (s) => String(s.sessoes) },
    { label: "FREQUENCIA", valor: (s) => `${s.frequenciaDias} / ${s.frequenciaDias} DIAS` },
    { label: "INICIO DA APLICACAO DA SUBSTANCIA", valor: (s) => fmtData(s.inicio) },
  ];
  for (const pr of protoRows) {
    ws.mergeCells(r, 1, r, nFix);
    const lc = ws.getCell(r, 1);
    lc.value = pr.label;
    lc.font = { name: "Arial", size: 7.5, bold: true, color: { argb: LABEL_INK } };
    lc.alignment = { vertical: "middle" };
    lc.border = borda();
    subs.forEach((s, i) => {
      const c = ws.getCell(r, nFix + 1 + i);
      c.value = pr.valor(s);
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      c.border = borda();
      if (pr.destaque) {
        c.font = { name: "Arial", size: 8, bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      } else {
        c.font = { name: "Arial", size: 8, bold: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CIANO_BG } };
      }
    });
    ws.getRow(r).height = 16;
    r += 1;
  }
  r += 1;

  // --- Grade ---
  const headRow = r;
  COLS_FIXAS.forEach((label, i) => {
    const c = ws.getCell(headRow, i + 1);
    c.value = label;
    c.font = { name: "Arial", size: 6.5, bold: true, color: { argb: LABEL_INK } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CIANO_BG } };
    c.border = borda();
  });
  subs.forEach((s, i) => {
    const c = ws.getCell(headRow, nFix + 1 + i);
    c.value = `${s.nome}${s.dose ? " " + s.dose : ""} — SESSAO`;
    c.font = { name: "Arial", size: 6.5, bold: true, color: { argb: NAVY } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CIANO_BG } };
    c.border = borda();
  });
  ws.getRow(headRow).height = 26;
  r += 1;

  const grade = montarGrade(subs, 20);
  for (const ln of grade) {
    const vals: (string | number)[] = [ln.numero, ln.data ? fmtData(ln.data) : "", "", "", "", "", ""];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v;
      c.font = { name: "Arial", size: 8, bold: i === 0 };
      c.alignment = { vertical: "middle", horizontal: i <= 1 ? "center" : "left" };
      c.border = borda();
    });
    subs.forEach((s, i) => {
      const c = ws.getCell(r, nFix + 1 + i);
      c.value = ln.contadores[i] ?? "";
      c.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0E7490" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.border = borda();
    });
    ws.getRow(r).height = 16;
    r += 1;
  }
  r += 2;

  // --- Assinaturas ---
  const sigs = ["ASSINATURA DO PACIENTE", "MEDICO RESPONSAVEL", "CARIMBO", "ENFERMAGEM RESPONSAVEL", "CARIMBO"];
  sigs.forEach((label, i) => {
    const col = 1 + i * 2;
    const cEnd = Math.min(col + 1, totalCols);
    ws.mergeCells(r, col, r, cEnd);
    const c = ws.getCell(r, col);
    c.value = "____________________";
    c.alignment = { horizontal: "center" };
    const lc = ws.getCell(r + 1, col);
    ws.mergeCells(r + 1, col, r + 1, cEnd);
    lc.value = label;
    lc.font = { name: "Arial", size: 6.5, color: { argb: LABEL_INK } };
    lc.alignment = { horizontal: "center" };
  });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
