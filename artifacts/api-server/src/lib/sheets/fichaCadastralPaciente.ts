/**
 * Ficha Cadastral do paciente — Google Sheets gerado em 01 CADASTRO/DADOS PESSOAIS.
 *
 * Wave Cadastro Pádua — 13/mai/2026 (Caio madrugada — v2 visual fixado)
 * Modelo de referência: planilha "Cadastro Mestre Unificado de Pacientes"
 *   (id 1uR0jIx1rIQE3346EUQZhy52gDkrtslH91NGeIPF7QxY)
 *
 * Decisões Caio v2 (13/mai pós-demo):
 *   - 2 abas: "CADASTRO" + "LEGENDAS" (nomes em maiúsculo)
 *   - TUDO em MAIUSCULO SEM ACENTO (cabeçalhos + valores)
 *   - Cores por grupo VAO NO CABECALHO (linha 3), não nos dados
 *   - Linha de DADOS (linha 4) fica branca
 *   - Aba LEGENDAS contém SOMENTE a explicação das cores
 *
 * v2.1 (13/mai noite — joiazinha TDAH): adicionada 3ª aba RESUMO CLINICO
 *   com 4 painéis (PATOLOGIAS / EXAMES RECENTES / RECEITAS ATIVAS /
 *   ULTIMA ANAMNESE). Populada via DadosClinicos opcional. Sem dados =
 *   placeholder "AGUARDANDO PRIMEIRA CONSULTA" estilizado.
 *
 * v3 próxima onda: 22 abas V25 PADCOM completas (depende validação Dr. Claude)
 */
import { google } from "googleapis";
import { getAccessToken } from "../google-drive";

// ============================================================================
// HELPERS — maiúsculo sem acento
// ============================================================================
function semAcento(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

// ============================================================================
// COLUNAS DA FICHA CADASTRAL — 33 colunas (v2.2: + CODIGO SEMANTICO CLIENTE)
// ============================================================================
export const COLUNAS_FICHA = [
  "CODIGO",
  "CODIGO SEMANTICO CLIENTE",
  "STATUS",
  "NOME",
  "NOME SOCIAL",
  "CPF",
  "RG",
  "DATA DE NASCIMENTO",
  "SEXO",
  "ESTADO CIVIL",
  "ESCOLARIDADE",
  "CELULAR",
  "WHATSAPP",
  "TELEFONE",
  "E-MAIL",
  "INSTAGRAM",
  "CEP",
  "ENDERECO",
  "NUMERO",
  "COMPLEMENTO",
  "BAIRRO",
  "CIDADE",
  "ESTADO",
  "PROFISSAO",
  "PLANO DE SAUDE",
  "NUMERO DO PLANO",
  "MAE",
  "PAI",
  "CONJUGE",
  "PROFISSIONAL RESPONSAVEL",
  "COMO NOS CONHECEU",
  "OBSERVACOES",
  "DATAS",
];

// ============================================================================
// GRUPOS DE COR — pintam o CABECALHO, não os dados
// (decalque do print "Cadastro Mestre Unificado" — aba LEGENDA)
// ============================================================================
interface GrupoCor {
  start: number; // col index 0-based (inclusive)
  end: number;   // col index 0-based (exclusive)
  cor: { red: number; green: number; blue: number };
  rotulo: string; // pra aba LEGENDAS
  campos: string; // descrição dos campos
}

const GRUPOS_COR: GrupoCor[] = [
  { start: 0,  end: 3,  cor: { red: 0.85, green: 0.92, blue: 0.97 }, rotulo: "AZUL CLARO", campos: "CODIGO, CODIGO SEMANTICO CLIENTE, STATUS" },
  { start: 3,  end: 7,  cor: { red: 0.79, green: 0.87, blue: 0.94 }, rotulo: "AZUL",       campos: "NOME, NOME SOCIAL, CPF, RG" },
  { start: 7,  end: 11, cor: { red: 0.83, green: 0.92, blue: 0.83 }, rotulo: "VERDE CLARO", campos: "DATA DE NASCIMENTO, SEXO, ESTADO CIVIL, ESCOLARIDADE" },
  { start: 11, end: 16, cor: { red: 0.92, green: 0.83, blue: 0.94 }, rotulo: "ROXO CLARO",  campos: "CELULAR, WHATSAPP, TELEFONE, E-MAIL, INSTAGRAM" },
  { start: 16, end: 23, cor: { red: 1.00, green: 0.95, blue: 0.80 }, rotulo: "AMARELO",     campos: "CEP, ENDERECO, NUMERO, COMPLEMENTO, BAIRRO, CIDADE, ESTADO" },
  { start: 23, end: 26, cor: { red: 0.78, green: 0.91, blue: 0.94 }, rotulo: "CIANO",       campos: "PROFISSAO, PLANO DE SAUDE, NUMERO DO PLANO" },
  { start: 26, end: 29, cor: { red: 0.96, green: 0.80, blue: 0.83 }, rotulo: "ROSA",        campos: "MAE, PAI, CONJUGE" },
  { start: 29, end: 33, cor: { red: 0.93, green: 0.93, blue: 0.93 }, rotulo: "CINZA",       campos: "PROFISSIONAL RESPONSAVEL, COMO NOS CONHECEU, OBSERVACOES, DATAS" },
];

const PRETO = { red: 0, green: 0, blue: 0 };

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
// RESUMO CLÍNICO (joiazinha v2.1) — 4 painéis populados do DB
// ============================================================================
export interface DadosClinicos {
  patologias?: Array<{ nome: string; cid10?: string | null; status?: string | null; intensidade?: string | null }>;
  examesRecentes?: Array<{ nome: string; data?: string | Date | null; resultado?: string | null }>;
  receitasAtivas?: Array<{ numero?: string | null; emitidaEm?: string | Date | null; status?: string | null; valor?: number | null }>;
  ultimaAnamnese?: { criadoEm?: string | Date | null; status?: string | null; sinaisSemanticos?: string[] | null } | null;
}

const COR_PAINEL_PATOLOGIAS = { red: 0.96, green: 0.80, blue: 0.83 }; // rosa
const COR_PAINEL_EXAMES     = { red: 0.83, green: 0.92, blue: 0.83 }; // verde claro
const COR_PAINEL_RECEITAS   = { red: 1.00, green: 0.95, blue: 0.80 }; // amarelo
const COR_PAINEL_ANAMNESE   = { red: 0.79, green: 0.87, blue: 0.94 }; // azul

export interface PacienteFicha {
  id: number;
  codigo_semantico: string | null;
  status_ativo: boolean;
  nome: string;
  nome_social: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | Date | null;
  genero: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  telefone: string | null;
  whatsapp: string | null;
  telefone_fixo: string | null;
  email: string | null;
  instagram: string | null;
  cep: string | null;
  endereco: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  profissao: string | null;
  plano_saude: string | null;
  numero_plano: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  nome_conjuge: string | null;
  profissional_responsavel: string | null;
  como_nos_conheceu: string | null;
  observacoes: string | null;
  criado_em: string | Date | null;
  atualizado_em: string | Date | null;
}

function fmtData(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

export function montarLinhaPaciente(p: PacienteFicha): string[] {
  // todos os valores em MAIUSCULO SEM ACENTO
  const v = (s: string | null | undefined) => semAcento(s ?? "");
  return [
    String(p.id),
    v(p.codigo_semantico),
    p.status_ativo ? "ATIVO" : "INATIVO",
    v(p.nome),
    v(p.nome_social),
    v(p.cpf),
    v(p.rg),
    fmtData(p.data_nascimento),
    v(p.genero),
    v(p.estado_civil),
    v(p.escolaridade),
    v(p.telefone),
    v(p.whatsapp),
    v(p.telefone_fixo),
    v(p.email),
    v(p.instagram),
    v(p.cep),
    v(p.endereco),
    v(p.numero_endereco),
    v(p.complemento),
    v(p.bairro),
    v(p.cidade),
    v(p.estado),
    v(p.profissao),
    v(p.plano_saude),
    v(p.numero_plano),
    v(p.nome_mae),
    v(p.nome_pai),
    v(p.nome_conjuge),
    v(p.profissional_responsavel),
    v(p.como_nos_conheceu),
    v(p.observacoes),
    `CRIADO: ${fmtData(p.criado_em)} | ATUALIZADO: ${fmtData(p.atualizado_em)}`,
  ];
}

/**
 * Cria (idempotente, com forceRecreate opcional) a planilha FICHA CADASTRAL.
 */
export async function criarFichaCadastralPaciente(opts: {
  paciente: PacienteFicha;
  dadosPessoaisFolderId: string;
  fileName: string;
  forceRecreate?: boolean;
  dadosClinicos?: DadosClinicos;
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string; jaExistia: boolean }> {
  const { paciente, dadosPessoaisFolderId, fileName, forceRecreate, dadosClinicos } = opts;
  const drive = await getDrive();
  const sheets = await getSheets();

  // Idempotência (com escape correto de aspa simples)
  const fileNameSafe = fileName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${dadosPessoaisFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name='${fileNameSafe}' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  if (existing.data.files && existing.data.files.length > 0) {
    if (forceRecreate) {
      for (const f of existing.data.files) {
        try { await drive.files.delete({ fileId: f.id! }); } catch {}
      }
    } else {
      const sid = existing.data.files[0].id!;
      return {
        spreadsheetId: sid,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit`,
        jaExistia: true,
      };
    }
  }

  // 1. cria spreadsheet com 3 abas — CADASTRO, RESUMO CLINICO, LEGENDAS
  const create = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: fileName, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
      sheets: [
        { properties: { title: "CADASTRO", gridProperties: { rowCount: 200, columnCount: COLUNAS_FICHA.length } } },
        { properties: { title: "RESUMO CLINICO", gridProperties: { rowCount: 100, columnCount: 6 } } },
        { properties: { title: "LEGENDAS", gridProperties: { rowCount: 60, columnCount: 4 } } },
      ],
    },
  });
  const spreadsheetId = create.data.spreadsheetId!;
  const sheetIdCadastro = create.data.sheets![0].properties!.sheetId!;
  const sheetIdResumo   = create.data.sheets![1].properties!.sheetId!;
  const sheetIdLegendas = create.data.sheets![2].properties!.sheetId!;

  // 2. move pra DADOS PESSOAIS
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: dadosPessoaisFolderId,
    removeParents: "root",
    fields: "id, parents",
  });

  // 3. valores
  const linhaPaciente = montarLinhaPaciente(paciente);
  const linhasLegendas: string[][] = [
    ["LEGENDA DAS CORES"],
    [],
    ["COR", "GRUPO", "CAMPOS"],
    ...GRUPOS_COR.map((g) => ["", g.rotulo, g.campos]),
  ];

  // RESUMO CLINICO — montagem dos 4 painéis com tracking de linhas pra formatação
  const dc = dadosClinicos ?? {};
  const PLACEHOLDER = "AGUARDANDO PRIMEIRA CONSULTA";
  const resumoLinhas: string[][] = [];
  const paineis: Array<{ titulo: string; cor: { red: number; green: number; blue: number }; rowTituloIdx: number; rowDadosStart: number; rowDadosEnd: number }> = [];

  resumoLinhas.push([`RESUMO CLINICO — ${semAcento(paciente.nome)}`]);
  resumoLinhas.push([]);

  function abrirPainel(titulo: string, cor: { red: number; green: number; blue: number }, cabecalho: string[]) {
    const rowTitulo = resumoLinhas.length;
    resumoLinhas.push([titulo]);
    resumoLinhas.push(cabecalho);
    return { rowTitulo, rowDadosStart: resumoLinhas.length };
  }
  function fecharPainel(p: { titulo: string; cor: { red: number; green: number; blue: number }; rowTitulo: number; rowDadosStart: number }, vazio: boolean) {
    if (vazio) resumoLinhas.push([PLACEHOLDER]);
    paineis.push({ titulo: p.titulo, cor: p.cor, rowTituloIdx: p.rowTitulo, rowDadosStart: p.rowDadosStart, rowDadosEnd: resumoLinhas.length });
    resumoLinhas.push([]);
  }

  // Painel 1 — PATOLOGIAS
  {
    const p = abrirPainel("PATOLOGIAS", COR_PAINEL_PATOLOGIAS, ["NOME", "CID-10", "STATUS", "INTENSIDADE"]);
    const rows = dc.patologias ?? [];
    for (const r of rows) {
      resumoLinhas.push([semAcento(r.nome ?? ""), semAcento(r.cid10 ?? ""), semAcento(r.status ?? ""), semAcento(r.intensidade ?? "")]);
    }
    fecharPainel({ titulo: "PATOLOGIAS", cor: COR_PAINEL_PATOLOGIAS, ...p }, rows.length === 0);
  }

  // Painel 2 — EXAMES RECENTES
  {
    const p = abrirPainel("EXAMES RECENTES", COR_PAINEL_EXAMES, ["NOME", "DATA", "RESULTADO"]);
    const rows = dc.examesRecentes ?? [];
    for (const r of rows) {
      resumoLinhas.push([semAcento(r.nome ?? ""), fmtData(r.data ?? null), semAcento(r.resultado ?? "")]);
    }
    fecharPainel({ titulo: "EXAMES RECENTES", cor: COR_PAINEL_EXAMES, ...p }, rows.length === 0);
  }

  // Painel 3 — RECEITAS ATIVAS
  {
    const p = abrirPainel("RECEITAS ATIVAS", COR_PAINEL_RECEITAS, ["NUMERO", "EMITIDA EM", "STATUS", "VALOR R$"]);
    const rows = dc.receitasAtivas ?? [];
    for (const r of rows) {
      resumoLinhas.push([
        semAcento(r.numero ?? ""),
        fmtData(r.emitidaEm ?? null),
        semAcento(r.status ?? ""),
        r.valor != null ? r.valor.toFixed(2).replace(".", ",") : "",
      ]);
    }
    fecharPainel({ titulo: "RECEITAS ATIVAS", cor: COR_PAINEL_RECEITAS, ...p }, rows.length === 0);
  }

  // Painel 4 — ULTIMA ANAMNESE
  {
    const p = abrirPainel("ULTIMA ANAMNESE", COR_PAINEL_ANAMNESE, ["DATA", "STATUS", "SINAIS SEMANTICOS"]);
    const a = dc.ultimaAnamnese;
    if (a) {
      resumoLinhas.push([
        fmtData(a.criadoEm ?? null),
        semAcento(a.status ?? ""),
        semAcento((a.sinaisSemanticos ?? []).join(", ")),
      ]);
    }
    fecharPainel({ titulo: "ULTIMA ANAMNESE", cor: COR_PAINEL_ANAMNESE, ...p }, !a);
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "CADASTRO!A3", values: [COLUNAS_FICHA] },
        { range: "CADASTRO!A4", values: [linhaPaciente] },
        { range: "RESUMO CLINICO!A1", values: resumoLinhas },
        { range: "LEGENDAS!A1", values: linhasLegendas },
      ],
    },
  });

  // 4. formatação visual
  const reqs: any[] = [];

  // 4.1 CABECALHO (linha 3) — cores POR GRUPO + bold + center
  reqs.push({
    repeatCell: {
      range: { sheetId: sheetIdCadastro, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: COLUNAS_FICHA.length },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, fontFamily: "Roboto", fontSize: 11 },
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          wrapStrategy: "WRAP",
        },
      },
      fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
    },
  });
  for (const g of GRUPOS_COR) {
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetIdCadastro, startRowIndex: 2, endRowIndex: 3, startColumnIndex: g.start, endColumnIndex: g.end },
        cell: { userEnteredFormat: { backgroundColor: g.cor } },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  }

  // 4.2 LINHA DE DADOS (linha 4) — branca, fonte normal
  reqs.push({
    repeatCell: {
      range: { sheetId: sheetIdCadastro, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: COLUNAS_FICHA.length },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 1, blue: 1 },
          textFormat: { fontFamily: "Roboto", fontSize: 10 },
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
    },
  });

  // 4.3 bordas full
  reqs.push({
    updateBorders: {
      range: { sheetId: sheetIdCadastro, startRowIndex: 2, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: COLUNAS_FICHA.length },
      top: { style: "SOLID", color: PRETO, width: 1 },
      bottom: { style: "SOLID", color: PRETO, width: 1 },
      left: { style: "SOLID", color: PRETO, width: 1 },
      right: { style: "SOLID", color: PRETO, width: 1 },
      innerHorizontal: { style: "SOLID", color: PRETO, width: 1 },
      innerVertical: { style: "SOLID", color: PRETO, width: 1 },
    },
  });

  // 4.4 freeze linha 3
  reqs.push({
    updateSheetProperties: {
      properties: { sheetId: sheetIdCadastro, gridProperties: { frozenRowCount: 3 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // 4.5 altura cabeçalho 36px
  reqs.push({
    updateDimensionProperties: {
      range: { sheetId: sheetIdCadastro, dimension: "ROWS", startIndex: 2, endIndex: 3 },
      properties: { pixelSize: 36 },
      fields: "pixelSize",
    },
  });

  // 4.6 auto-resize todas as colunas (cresce até caber)
  reqs.push({
    autoResizeDimensions: {
      dimensions: { sheetId: sheetIdCadastro, dimension: "COLUMNS", startIndex: 0, endIndex: COLUNAS_FICHA.length },
    },
  });

  // 4.6.1 RESUMO CLINICO — título grande linha 1
  reqs.push({
    repeatCell: {
      range: { sheetId: sheetIdResumo, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
      cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14, fontFamily: "Roboto" }, backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE" } },
      fields: "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment)",
    },
  });
  reqs.push({
    mergeCells: { range: { sheetId: sheetIdResumo, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: "MERGE_ALL" },
  });
  reqs.push({
    updateDimensionProperties: { range: { sheetId: sheetIdResumo, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 40 }, fields: "pixelSize" },
  });

  // 4.6.2 painéis: título colorido (merge) + cabeçalho cinza-claro + bordas
  for (const painel of paineis) {
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetIdResumo, startRowIndex: painel.rowTituloIdx, endRowIndex: painel.rowTituloIdx + 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { backgroundColor: painel.cor, textFormat: { bold: true, fontSize: 12, fontFamily: "Roboto" }, horizontalAlignment: "LEFT", verticalAlignment: "MIDDLE", padding: { left: 8 } } },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)",
      },
    });
    reqs.push({
      mergeCells: { range: { sheetId: sheetIdResumo, startRowIndex: painel.rowTituloIdx, endRowIndex: painel.rowTituloIdx + 1, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: "MERGE_ALL" },
    });
    reqs.push({
      updateDimensionProperties: { range: { sheetId: sheetIdResumo, dimension: "ROWS", startIndex: painel.rowTituloIdx, endIndex: painel.rowTituloIdx + 1 }, properties: { pixelSize: 28 }, fields: "pixelSize" },
    });
    const rowCab = painel.rowTituloIdx + 1;
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetIdResumo, startRowIndex: rowCab, endRowIndex: rowCab + 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, textFormat: { bold: true, fontSize: 10, fontFamily: "Roboto" }, horizontalAlignment: "LEFT" } },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    });
    reqs.push({
      updateBorders: {
        range: { sheetId: sheetIdResumo, startRowIndex: painel.rowTituloIdx, endRowIndex: painel.rowDadosEnd, startColumnIndex: 0, endColumnIndex: 6 },
        top: { style: "SOLID", color: PRETO, width: 1 },
        bottom: { style: "SOLID", color: PRETO, width: 1 },
        left: { style: "SOLID", color: PRETO, width: 1 },
        right: { style: "SOLID", color: PRETO, width: 1 },
        innerHorizontal: { style: "SOLID", color: { red: 0.7, green: 0.7, blue: 0.7 }, width: 1 },
      },
    });
  }
  reqs.push({
    updateSheetProperties: { properties: { sheetId: sheetIdResumo, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" },
  });
  reqs.push({
    autoResizeDimensions: { dimensions: { sheetId: sheetIdResumo, dimension: "COLUMNS", startIndex: 0, endIndex: 6 } },
  });

  // 4.7 LEGENDAS: título grande + linhas com a cor real preenchendo a coluna A
  reqs.push({
    repeatCell: {
      range: { sheetId: sheetIdLegendas, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14, fontFamily: "Roboto" } } },
      fields: "userEnteredFormat.textFormat",
    },
  });
  reqs.push({
    repeatCell: {
      range: { sheetId: sheetIdLegendas, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3 },
      cell: { userEnteredFormat: { textFormat: { bold: true, fontFamily: "Roboto", fontSize: 11 }, backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 } } },
      fields: "userEnteredFormat(textFormat,backgroundColor)",
    },
  });
  // pintar coluna A de cada linha de grupo (linhas 4..11) com a cor do grupo
  GRUPOS_COR.forEach((g, idx) => {
    const row = 3 + idx; // 0-based
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetIdLegendas, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { backgroundColor: g.cor } },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  });
  reqs.push({
    autoResizeDimensions: {
      dimensions: { sheetId: sheetIdLegendas, dimension: "COLUMNS", startIndex: 0, endIndex: 3 },
    },
  });
  // largura mínima da coluna A da legenda (40px) pra mostrar a cor
  reqs.push({
    updateDimensionProperties: {
      range: { sheetId: sheetIdLegendas, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 60 },
      fields: "pixelSize",
    },
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs } });

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    jaExistia: false,
  };
}
