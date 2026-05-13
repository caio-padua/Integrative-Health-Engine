/**
 * Ficha V25 PADCOM — planilha Google Sheets de demonstração executiva.
 *
 * Wave V25 PADCOM Demo (13/mai/2026 — Caio autonomia 3h, Dr. Claude orquestrando)
 *
 * 14 abas: CADASTRO + RESUMO EXECUTIVO + 9 grupos patológicos +
 * BLENDS (20×5) + CIRURGIAS + PARAMETROS (legenda).
 *
 * Cada exame tem 3 valores (D1/D2/D3) e classificação por terço:
 * PREOCUPANTE / BAIXO / MEDIANO / OTIMO / ALERTA — pintada na célula
 * com cores institucionais (vermelho-escuro / laranja / amarelo / verde).
 *
 * Os dados clínicos são SIMULADOS PLAUSÍVEIS (paciente sem prontuário real).
 * Header da aba CADASTRO marca claramente "DEMONSTRACAO".
 */
import { google } from "googleapis";
import { getAccessToken } from "../google-drive";

// ============================================================================
// CORES INSTITUCIONAIS POR CLASSIFICAÇÃO
// ============================================================================
export type Classificacao =
  | "PREOCUPANTE"
  | "BAIXO"
  | "MEDIANO"
  | "OTIMO"
  | "ALERTA";

const COR_CLASSIFICACAO: Record<Classificacao, { red: number; green: number; blue: number }> = {
  PREOCUPANTE: { red: 0.49, green: 0.11, blue: 0.18 }, // #7d1d2e
  ALERTA:      { red: 0.49, green: 0.11, blue: 0.18 }, // mesmo do preocupante
  BAIXO:       { red: 0.85, green: 0.48, blue: 0.24 }, // #d97a3c
  MEDIANO:     { red: 0.91, green: 0.77, blue: 0.28 }, // #e8c547
  OTIMO:       { red: 0.23, green: 0.49, blue: 0.27 }, // #3a7d44
};

const COR_CABECALHO_NAVY = { red: 0.06, green: 0.10, blue: 0.20 }; // #0f1933 navy
const COR_CABECALHO_GOLD = { red: 0.83, green: 0.69, blue: 0.22 }; // #d4b038 gold
const COR_BRANCA = { red: 1, green: 1, blue: 1 };
const COR_CINZA_LEVE = { red: 0.95, green: 0.95, blue: 0.95 };

// ============================================================================
// MODELO DE DADOS
// ============================================================================
export interface ExameEvolutivo {
  nome: string;
  unidade: string;
  refMin: number;
  refMax: number;
  /** Indica em qual terço da faixa o "ÓTIMO" cai. */
  tercoOtimo: "INFERIOR" | "MEDIO" | "SUPERIOR";
  d1: number;
  d2: number;
  d3: number;
}

export interface GrupoPatologico {
  codigo: string;
  titulo: string;
  exames: ExameEvolutivo[];
}

export interface BlendItem {
  numero: number;
  nome: string;
  ativos: string[]; // até 5
  posologia: string;
  inicioEm?: string;
  observacao?: string;
}

export interface Cirurgia {
  data: string;
  procedimento: string;
  cirurgiao?: string;
  hospital?: string;
  observacao?: string;
}

export interface PacienteV25 {
  id: number;
  nome: string;
  codigoSemantico?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface FichaV25Input {
  paciente: PacienteV25;
  datasAvaliativas: { d1: string; d2: string; d3: string }; // YYYY-MM-DD
  grupos: GrupoPatologico[];
  blends: BlendItem[];
  cirurgias: Cirurgia[];
  observacoesCEO?: string;
  /** Pasta destino no Drive. Se omitido, fica na raiz "Meu Drive". */
  driveFolderId?: string;
  fileName: string;
}

// ============================================================================
// HELPERS
// ============================================================================
function semAcento(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function fmtNumero(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2).replace(".", ",");
}

/**
 * Classifica valor em relação à faixa de referência por terço.
 * Acima do max → ALERTA. Abaixo do min → PREOCUPANTE.
 * Dentro: divide [min,max] em 3 terços, classifica conforme tercoOtimo.
 */
export function classificarPorTerco(
  valor: number,
  refMin: number,
  refMax: number,
  tercoOtimo: "INFERIOR" | "MEDIO" | "SUPERIOR",
): Classificacao {
  if (valor < refMin) return "PREOCUPANTE";
  if (valor > refMax) return "ALERTA";

  const range = refMax - refMin;
  const t1 = refMin + range / 3;
  const t2 = refMin + (2 * range) / 3;

  let pos: "INFERIOR" | "MEDIO" | "SUPERIOR";
  if (valor < t1) pos = "INFERIOR";
  else if (valor < t2) pos = "MEDIO";
  else pos = "SUPERIOR";

  if (pos === tercoOtimo) return "OTIMO";
  // adjacente ao ótimo = MEDIANO; oposto = BAIXO
  if (
    (tercoOtimo === "SUPERIOR" && pos === "MEDIO") ||
    (tercoOtimo === "INFERIOR" && pos === "MEDIO") ||
    (tercoOtimo === "MEDIO" && pos !== "MEDIO")
  ) {
    return "MEDIANO";
  }
  return "BAIXO";
}

async function getSheets() {
  const token = await getAccessToken();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: token });
  return google.sheets({ version: "v4", auth: oauth });
}

async function getDrive() {
  const token = await getAccessToken();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: token });
  return google.drive({ version: "v3", auth: oauth });
}

// ============================================================================
// MONTAGEM DAS ABAS
// ============================================================================
function montarAbaCadastro(
  paciente: PacienteV25,
  datas: { d1: string; d2: string; d3: string },
): string[][] {
  return [
    ["FICHA V25 PADCOM — DEMONSTRACAO"],
    [`Gerada em ${new Date().toISOString().substring(0, 10)} | Instituto Padua`],
    [],
    ["CAMPO", "VALOR"],
    ["NOME", semAcento(paciente.nome)],
    ["CODIGO SEMANTICO", semAcento(paciente.codigoSemantico ?? "")],
    ["ID INTERNO", String(paciente.id)],
    ["CPF", paciente.cpf ?? ""],
    ["SEXO", semAcento(paciente.sexo ?? "")],
    ["DATA DE NASCIMENTO", paciente.dataNascimento ?? ""],
    ["TELEFONE", paciente.telefone ?? ""],
    ["E-MAIL", paciente.email ?? ""],
    [],
    ["DATAS AVALIATIVAS", ""],
    ["D1 (BASELINE)", datas.d1],
    ["D2 (CONTROLE)", datas.d2],
    ["D3 (RECENTE)", datas.d3],
    [],
    ["AVISO", "DADOS CLINICOS SIMULADOS PARA FINS DE DEMONSTRACAO"],
  ];
}

function montarAbaResumo(
  grupos: GrupoPatologico[],
  datas: { d1: string; d2: string; d3: string },
): { values: string[][]; semaforo: Array<{ row: number; cor: Classificacao }> } {
  const rows: string[][] = [
    ["RESUMO EXECUTIVO — SEMAFORO POR EXAME"],
    [],
    ["GRUPO", "EXAME", `D1 (${datas.d1})`, `D2 (${datas.d2})`, `D3 (${datas.d3})`, "TENDENCIA"],
  ];
  const semaforo: Array<{ row: number; cor: Classificacao }> = [];

  for (const g of grupos) {
    for (const ex of g.exames) {
      const c1 = classificarPorTerco(ex.d1, ex.refMin, ex.refMax, ex.tercoOtimo);
      const c3 = classificarPorTerco(ex.d3, ex.refMin, ex.refMax, ex.tercoOtimo);
      const ordemQualidade: Classificacao[] = ["PREOCUPANTE", "ALERTA", "BAIXO", "MEDIANO", "OTIMO"];
      const tendencia =
        ordemQualidade.indexOf(c3) > ordemQualidade.indexOf(c1)
          ? "MELHOROU"
          : ordemQualidade.indexOf(c3) < ordemQualidade.indexOf(c1)
          ? "PIOROU"
          : "ESTAVEL";
      rows.push([
        g.codigo,
        ex.nome,
        `${fmtNumero(ex.d1)} ${ex.unidade}`,
        `${fmtNumero(ex.d2)} ${ex.unidade}`,
        `${fmtNumero(ex.d3)} ${ex.unidade}`,
        tendencia,
      ]);
      semaforo.push({ row: rows.length - 1, cor: c3 });
    }
  }
  return { values: rows, semaforo };
}

function montarAbaGrupo(
  g: GrupoPatologico,
  datas: { d1: string; d2: string; d3: string },
): { values: string[][]; pinturas: Array<{ row: number; col: number; cor: Classificacao }> } {
  const rows: string[][] = [
    [`${g.codigo} — ${semAcento(g.titulo)}`],
    [],
    [
      "EXAME",
      "UNIDADE",
      "REF. MIN",
      "REF. MAX",
      "TERCO ALVO",
      `D1 ${datas.d1}`,
      "CLASS. D1",
      `D2 ${datas.d2}`,
      "CLASS. D2",
      `D3 ${datas.d3}`,
      "CLASS. D3",
    ],
  ];
  const pinturas: Array<{ row: number; col: number; cor: Classificacao }> = [];

  for (const ex of g.exames) {
    const c1 = classificarPorTerco(ex.d1, ex.refMin, ex.refMax, ex.tercoOtimo);
    const c2 = classificarPorTerco(ex.d2, ex.refMin, ex.refMax, ex.tercoOtimo);
    const c3 = classificarPorTerco(ex.d3, ex.refMin, ex.refMax, ex.tercoOtimo);
    rows.push([
      semAcento(ex.nome),
      ex.unidade,
      fmtNumero(ex.refMin),
      fmtNumero(ex.refMax),
      ex.tercoOtimo,
      fmtNumero(ex.d1),
      c1,
      fmtNumero(ex.d2),
      c2,
      fmtNumero(ex.d3),
      c3,
    ]);
    const r = rows.length - 1;
    // Pinta colunas de classificação (6, 8, 10) e a célula do valor (5, 7, 9)
    pinturas.push({ row: r, col: 5, cor: c1 });
    pinturas.push({ row: r, col: 6, cor: c1 });
    pinturas.push({ row: r, col: 7, cor: c2 });
    pinturas.push({ row: r, col: 8, cor: c2 });
    pinturas.push({ row: r, col: 9, cor: c3 });
    pinturas.push({ row: r, col: 10, cor: c3 });
  }
  return { values: rows, pinturas };
}

function montarAbaBlends(blends: BlendItem[]): string[][] {
  const rows: string[][] = [
    ["BLENDS MANIPULADOS — 20 SLOTS"],
    [],
    ["#", "NOME DO BLEND", "ATIVO 1", "ATIVO 2", "ATIVO 3", "ATIVO 4", "ATIVO 5", "POSOLOGIA", "INICIO", "OBSERVACAO"],
  ];
  for (let i = 1; i <= 20; i++) {
    const b = blends.find((x) => x.numero === i);
    if (b) {
      rows.push([
        String(i),
        semAcento(b.nome),
        semAcento(b.ativos[0] ?? ""),
        semAcento(b.ativos[1] ?? ""),
        semAcento(b.ativos[2] ?? ""),
        semAcento(b.ativos[3] ?? ""),
        semAcento(b.ativos[4] ?? ""),
        b.posologia,
        b.inicioEm ?? "",
        semAcento(b.observacao ?? ""),
      ]);
    } else {
      rows.push([String(i), "", "", "", "", "", "", "", "", ""]);
    }
  }
  return rows;
}

function montarAbaCirurgias(cirurgias: Cirurgia[]): string[][] {
  const rows: string[][] = [
    ["CIRURGIAS — HISTORICO"],
    [],
    ["DATA", "PROCEDIMENTO", "CIRURGIAO", "HOSPITAL", "OBSERVACAO"],
  ];
  if (cirurgias.length === 0) {
    rows.push(["", "NENHUMA CIRURGIA REGISTRADA", "", "", ""]);
  } else {
    for (const c of cirurgias) {
      rows.push([c.data, semAcento(c.procedimento), semAcento(c.cirurgiao ?? ""), semAcento(c.hospital ?? ""), semAcento(c.observacao ?? "")]);
    }
  }
  return rows;
}

function montarAbaParametros(): { values: string[][]; pinturas: Array<{ row: number; col: number; cor: Classificacao }> } {
  const rows: string[][] = [
    ["PARAMETROS — LEGENDA DE CORES E ESCALA POR TERCOS"],
    [],
    ["CLASSIFICACAO", "COR", "SIGNIFICADO CLINICO"],
    ["PREOCUPANTE", "VERMELHO ESCURO", "ABAIXO DO MIN DE REFERENCIA — REQUER INTERVENCAO IMEDIATA"],
    ["ALERTA", "VERMELHO ESCURO", "ACIMA DO MAX DE REFERENCIA — REQUER REAVALIACAO E CONTROLE"],
    ["BAIXO", "LARANJA", "DENTRO DA REF MAS NO TERCO OPOSTO AO ALVO TERAPEUTICO"],
    ["MEDIANO", "AMARELO", "ZONA INTERMEDIARIA — ACOMPANHAR EVOLUCAO"],
    ["OTIMO", "VERDE", "TERCO ALVO TERAPEUTICO — META DO PROTOCOLO PADCON"],
    [],
    ["NOTA", "TERCO ALVO VARIA POR ANALITO (EX: TESTOSTERONA = SUPERIOR; SHBG = INFERIOR)"],
    [],
    ["DOCUMENTO ASSINADO POR PADCON — DEVELOPED AND SUPERVISED BY PADCON"],
  ];
  const pinturas: Array<{ row: number; col: number; cor: Classificacao }> = [
    { row: 3, col: 1, cor: "PREOCUPANTE" },
    { row: 4, col: 1, cor: "ALERTA" },
    { row: 5, col: 1, cor: "BAIXO" },
    { row: 6, col: 1, cor: "MEDIANO" },
    { row: 7, col: 1, cor: "OTIMO" },
  ];
  return { values: rows, pinturas };
}

// ============================================================================
// CRIA SPREADSHEET
// ============================================================================
export async function criarFichaV25Padcom(
  input: FichaV25Input,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = await getSheets();
  const drive = await getDrive();

  const abasDef = [
    "CADASTRO",
    "RESUMO EXECUTIVO",
    ...input.grupos.map((g) => g.codigo),
    "BLENDS",
    "CIRURGIAS",
    "PARAMETROS",
  ];

  // 1. Cria spreadsheet com todas as abas
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: input.fileName,
        locale: "pt_BR",
        timeZone: "America/Sao_Paulo",
      },
      sheets: abasDef.map((titulo) => ({
        properties: {
          title: titulo,
          gridProperties: { rowCount: 200, columnCount: 12 },
        },
      })),
    },
  });
  const spreadsheetId = created.data.spreadsheetId!;
  const sheetIdByTitle = new Map<string, number>();
  for (const s of created.data.sheets ?? []) {
    sheetIdByTitle.set(s.properties!.title!, s.properties!.sheetId!);
  }

  // 2. Move pra pasta Drive (se especificado)
  if (input.driveFolderId) {
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: input.driveFolderId,
      removeParents: "root",
      fields: "id, parents",
    });
  }

  // 3. Monta valores e batch update
  const cadastro = montarAbaCadastro(input.paciente, input.datasAvaliativas);
  const resumo = montarAbaResumo(input.grupos, input.datasAvaliativas);
  const grupos = input.grupos.map((g) => ({
    titulo: g.codigo,
    montado: montarAbaGrupo(g, input.datasAvaliativas),
  }));
  const blends = montarAbaBlends(input.blends);
  const cirurgias = montarAbaCirurgias(input.cirurgias);
  const parametros = montarAbaParametros();

  const data: Array<{ range: string; values: string[][] }> = [
    { range: "CADASTRO!A1", values: cadastro },
    { range: "'RESUMO EXECUTIVO'!A1", values: resumo.values },
    { range: "BLENDS!A1", values: blends },
    { range: "CIRURGIAS!A1", values: cirurgias },
    { range: "PARAMETROS!A1", values: parametros.values },
  ];
  for (const g of grupos) {
    data.push({ range: `'${g.titulo}'!A1`, values: g.montado.values });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });

  // 4. Formatação visual (cores semáforo, cabeçalhos navy, freeze rows)
  const reqs: any[] = [];

  // 4.a CADASTRO — header navy + linha aviso amarela
  const sidCad = sheetIdByTitle.get("CADASTRO")!;
  reqs.push({
    repeatCell: {
      range: { sheetId: sidCad, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 2 },
      cell: {
        userEnteredFormat: {
          backgroundColor: COR_CABECALHO_NAVY,
          textFormat: { bold: true, fontFamily: "JetBrains Mono", fontSize: 12, foregroundColor: COR_CABECALHO_GOLD },
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sidCad, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 },
      cell: {
        userEnteredFormat: {
          backgroundColor: COR_CABECALHO_GOLD,
          textFormat: { bold: true, fontFamily: "JetBrains Mono" },
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  // linha 18 = "AVISO ... DEMONSTRACAO" (1-indexed → row 17 0-based)
  reqs.push({
    repeatCell: {
      range: { sheetId: sidCad, startRowIndex: 17, endRowIndex: 18, startColumnIndex: 0, endColumnIndex: 2 },
      cell: {
        userEnteredFormat: {
          backgroundColor: COR_CLASSIFICACAO.MEDIANO,
          textFormat: { bold: true, fontFamily: "JetBrains Mono" },
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });

  // 4.b RESUMO EXECUTIVO — header + semáforo na coluna E (D3) e F (TENDENCIA)
  const sidRes = sheetIdByTitle.get("RESUMO EXECUTIVO")!;
  reqs.push({
    repeatCell: {
      range: { sheetId: sidRes, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_NAVY, textFormat: { bold: true, fontFamily: "JetBrains Mono", foregroundColor: COR_CABECALHO_GOLD } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sidRes, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 6 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_GOLD, textFormat: { bold: true, fontFamily: "JetBrains Mono" }, horizontalAlignment: "CENTER" } },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
    },
  });
  for (const s of resumo.semaforo) {
    reqs.push({
      repeatCell: {
        range: { sheetId: sidRes, startRowIndex: s.row, endRowIndex: s.row + 1, startColumnIndex: 4, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            backgroundColor: COR_CLASSIFICACAO[s.cor],
            textFormat: { bold: true, foregroundColor: s.cor === "OTIMO" || s.cor === "ALERTA" || s.cor === "PREOCUPANTE" ? COR_BRANCA : { red: 0.1, green: 0.1, blue: 0.1 } },
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    });
  }
  reqs.push({
    updateSheetProperties: {
      properties: { sheetId: sidRes, gridProperties: { frozenRowCount: 3 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // 4.c GRUPOS PATOLÓGICOS — header navy + cabeçalho gold + pinturas por terço
  for (const g of grupos) {
    const sid = sheetIdByTitle.get(g.titulo)!;
    reqs.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
        cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_NAVY, textFormat: { bold: true, fontFamily: "JetBrains Mono", foregroundColor: COR_CABECALHO_GOLD } } },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    });
    reqs.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 11 },
        cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_GOLD, textFormat: { bold: true, fontFamily: "JetBrains Mono" }, horizontalAlignment: "CENTER", wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)",
      },
    });
    for (const p of g.montado.pinturas) {
      reqs.push({
        repeatCell: {
          range: { sheetId: sid, startRowIndex: p.row, endRowIndex: p.row + 1, startColumnIndex: p.col, endColumnIndex: p.col + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: COR_CLASSIFICACAO[p.cor],
              textFormat: { bold: true, foregroundColor: p.cor === "OTIMO" || p.cor === "ALERTA" || p.cor === "PREOCUPANTE" ? COR_BRANCA : { red: 0.1, green: 0.1, blue: 0.1 } },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      });
    }
    reqs.push({
      updateSheetProperties: {
        properties: { sheetId: sid, gridProperties: { frozenRowCount: 3 } },
        fields: "gridProperties.frozenRowCount",
      },
    });
  }

  // 4.d BLENDS — header navy + cabeçalho gold + zebra
  const sidBl = sheetIdByTitle.get("BLENDS")!;
  reqs.push({
    repeatCell: {
      range: { sheetId: sidBl, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_NAVY, textFormat: { bold: true, fontFamily: "JetBrains Mono", foregroundColor: COR_CABECALHO_GOLD } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sidBl, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 10 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_GOLD, textFormat: { bold: true, fontFamily: "JetBrains Mono" }, horizontalAlignment: "CENTER" } },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
    },
  });
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      reqs.push({
        repeatCell: {
          range: { sheetId: sidBl, startRowIndex: 3 + i, endRowIndex: 4 + i, startColumnIndex: 0, endColumnIndex: 10 },
          cell: { userEnteredFormat: { backgroundColor: COR_CINZA_LEVE } },
          fields: "userEnteredFormat.backgroundColor",
        },
      });
    }
  }

  // 4.e CIRURGIAS — header
  const sidCir = sheetIdByTitle.get("CIRURGIAS")!;
  reqs.push({
    repeatCell: {
      range: { sheetId: sidCir, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_NAVY, textFormat: { bold: true, fontFamily: "JetBrains Mono", foregroundColor: COR_CABECALHO_GOLD } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sidCir, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_GOLD, textFormat: { bold: true, fontFamily: "JetBrains Mono" } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });

  // 4.f PARAMETROS — header + pinturas
  const sidPar = sheetIdByTitle.get("PARAMETROS")!;
  reqs.push({
    repeatCell: {
      range: { sheetId: sidPar, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_NAVY, textFormat: { bold: true, fontFamily: "JetBrains Mono", foregroundColor: COR_CABECALHO_GOLD } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sidPar, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { backgroundColor: COR_CABECALHO_GOLD, textFormat: { bold: true, fontFamily: "JetBrains Mono" } } },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  });
  for (const p of parametros.pinturas) {
    reqs.push({
      repeatCell: {
        range: { sheetId: sidPar, startRowIndex: p.row, endRowIndex: p.row + 1, startColumnIndex: p.col, endColumnIndex: p.col + 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: COR_CLASSIFICACAO[p.cor],
            textFormat: { bold: true, foregroundColor: p.cor === "OTIMO" || p.cor === "ALERTA" || p.cor === "PREOCUPANTE" ? COR_BRANCA : { red: 0.1, green: 0.1, blue: 0.1 } },
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    });
  }

  // 4.g auto-resize colunas em todas as abas
  for (const [, sid] of sheetIdByTitle) {
    reqs.push({
      autoResizeDimensions: {
        dimensions: { sheetId: sid, dimension: "COLUMNS", startIndex: 0, endIndex: 11 },
      },
    });
  }

  if (reqs.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs } });
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
