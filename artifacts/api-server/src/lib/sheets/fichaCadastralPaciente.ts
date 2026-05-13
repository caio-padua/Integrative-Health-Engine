/**
 * Ficha Cadastral do paciente — Google Sheets gerado em DADOS PESSOAIS.
 *
 * Wave Cadastro Pádua — 13/mai/2026 madrugada (Caio)
 * Modelo de referência: planilha "Cadastro Mestre Unificado de Pacientes"
 *   (id 1uR0jIx1rIQE3346EUQZhy52gDkrtslH91NGeIPF7QxY)
 *
 * Esta versão (v1) cria o esqueleto:
 *   - Aba 1 "Cadastro Mestre" — 29 colunas, cabeçalho verde, dados do paciente
 *   - Aba 2 "Legenda e Instruções" — texto explicativo
 *   - Auto-resize de colunas
 *   - Freeze pane (linha 3)
 *   - Bordas full
 *   - Cores por grupo de coluna (cadastro / clínico básico / contato / endereço / familiar)
 *
 * v2 (próxima onda) — formatação 1:1 do print, abas extras, watcher de update.
 */
import { google } from "googleapis";
import { getAccessToken } from "../google-drive";

// ============================================================================
// COLUNAS DA FICHA CADASTRAL — alinhadas com print Caio (29 colunas)
// ============================================================================
export const COLUNAS_FICHA = [
  "Código",            // A — id paciente
  "Status",            // B
  "Nome",              // C
  "Nome Social",       // D
  "CPF",               // E
  "RG",                // F
  "Data de Nascimento",// G
  "Sexo",              // H
  "Estado Civil",      // I
  "Escolaridade",      // J
  "Celular",           // K
  "WhatsApp",          // L
  "Telefone",          // M
  "E-mail",            // N
  "Instagram",         // O
  "CEP",               // P
  "Endereço",          // Q
  "Número",            // R
  "Complemento",       // S
  "Bairro",            // T
  "Cidade",            // U
  "Estado",            // V
  "Profissão",         // W
  "Plano de Saúde",    // X
  "Número do Plano",   // Y
  "Mãe",               // Z
  "Pai",               // AA
  "Cônjuge",           // AB
  "Profissional Responsável", // AC
  "Como nos Conheceu", // AD
  "Observações",       // AE
  "Datas",             // AF — criado_em / atualizado_em
] as const;

// Cores por grupo de coluna (decalque do print Caio)
// Índices 0-based (col A=0)
const GRUPOS_COR: Array<{ start: number; end: number; cor: { red: number; green: number; blue: number } }> = [
  { start: 0,  end: 2,  cor: { red: 0.85, green: 0.92, blue: 0.97 } }, // Código/Status — azul claro
  { start: 2,  end: 6,  cor: { red: 0.79, green: 0.87, blue: 0.94 } }, // Identidade — azul
  { start: 6,  end: 10, cor: { red: 0.83, green: 0.92, blue: 0.83 } }, // Clínico básico — verde claro
  { start: 10, end: 15, cor: { red: 0.92, green: 0.83, blue: 0.94 } }, // Contato — roxo claro
  { start: 15, end: 22, cor: { red: 1.00, green: 0.95, blue: 0.80 } }, // Endereço — amarelo
  { start: 22, end: 25, cor: { red: 0.78, green: 0.91, blue: 0.94 } }, // Profissão/plano — ciano
  { start: 25, end: 28, cor: { red: 0.96, green: 0.80, blue: 0.83 } }, // Família — rosa
  { start: 28, end: 32, cor: { red: 0.93, green: 0.93, blue: 0.93 } }, // Operacional — cinza
];

const VERDE_HEADER = { red: 0.42, green: 0.66, blue: 0.31 }; // #6aa84f
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

export interface PacienteFicha {
  id: number;
  status_ativo: boolean;
  nome: string;
  nome_social: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | Date | null;
  genero: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  telefone: string | null;          // celular principal
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
  return [
    String(p.id),
    p.status_ativo ? "ATIVO" : "INATIVO",
    p.nome ?? "",
    p.nome_social ?? "",
    p.cpf ?? "",
    p.rg ?? "",
    fmtData(p.data_nascimento),
    p.genero ?? "",
    p.estado_civil ?? "",
    p.escolaridade ?? "",
    p.telefone ?? "",
    p.whatsapp ?? "",
    p.telefone_fixo ?? "",
    p.email ?? "",
    p.instagram ?? "",
    p.cep ?? "",
    p.endereco ?? "",
    p.numero_endereco ?? "",
    p.complemento ?? "",
    p.bairro ?? "",
    p.cidade ?? "",
    p.estado ?? "",
    p.profissao ?? "",
    p.plano_saude ?? "",
    p.numero_plano ?? "",
    p.nome_mae ?? "",
    p.nome_pai ?? "",
    p.nome_conjuge ?? "",
    p.profissional_responsavel ?? "",
    p.como_nos_conheceu ?? "",
    p.observacoes ?? "",
    `Criado: ${fmtData(p.criado_em)} | Atualizado: ${fmtData(p.atualizado_em)}`,
  ];
}

/**
 * Cria (idempotente) a planilha FICHA CADASTRAL do paciente dentro da
 * subpasta DADOS PESSOAIS (que precisa existir — chame criarArvoreCompletaPaciente
 * antes ou rely no cache `drive_subpastas`).
 *
 * Retorna spreadsheetId + URL.
 */
export async function criarFichaCadastralPaciente(opts: {
  paciente: PacienteFicha;
  dadosPessoaisFolderId: string;
  fileName: string; // ex: "ADAUTO DE LIMA FRAGA - FICHA CADASTRAL"
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string; jaExistia: boolean }> {
  const { paciente, dadosPessoaisFolderId, fileName } = opts;
  const drive = await getDrive();
  const sheets = await getSheets();

  // Idempotência: se já existe ficha pra esse paciente na pasta, devolve
  const existing = await drive.files.list({
    q: `'${dadosPessoaisFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name='${fileName.replace(/'/g, "\\'")}' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  if (existing.data.files && existing.data.files.length > 0) {
    const sid = existing.data.files[0].id!;
    return {
      spreadsheetId: sid,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit`,
      jaExistia: true,
    };
  }

  // 1. cria spreadsheet com 2 abas
  const create = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: fileName, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
      sheets: [
        { properties: { title: "Cadastro Mestre", gridProperties: { rowCount: 200, columnCount: COLUNAS_FICHA.length } } },
        { properties: { title: "Legenda e Instruções", gridProperties: { rowCount: 60, columnCount: 6 } } },
      ],
    },
  });
  const spreadsheetId = create.data.spreadsheetId!;
  const sheetIdMestre = create.data.sheets![0].properties!.sheetId!;
  const sheetIdLegenda = create.data.sheets![1].properties!.sheetId!;

  // 2. move pra pasta DADOS PESSOAIS
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: dadosPessoaisFolderId,
    removeParents: "root",
    fields: "id, parents",
  });

  // 3. popula valores
  const linhaPaciente = montarLinhaPaciente(paciente);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "Cadastro Mestre!A3", values: [COLUNAS_FICHA as readonly string[] as string[]] },
        { range: "Cadastro Mestre!A4", values: [linhaPaciente] },
        {
          range: "Legenda e Instruções!A1",
          values: [
            ["FICHA CADASTRAL DO PACIENTE — Wave Cadastro Pádua"],
            [""],
            ["Esta planilha é gerada automaticamente pelo sistema PAWARDS no momento do cadastro do paciente."],
            ["A aba 'Cadastro Mestre' contém os 29 campos canônicos da ficha."],
            [""],
            ["Atualização: este arquivo reflete o cadastro no momento da criação. Atualizações futuras"],
            ["serão sincronizadas pelo watcher (Wave 4 — próxima onda)."],
            [""],
            ["GRUPOS DE COLUNA (por cor):"],
            ["• Azul claro: Código + Status"],
            ["• Azul: Identidade (Nome, Nome Social, CPF, RG)"],
            ["• Verde claro: Clínico básico (Nascimento, Sexo, Estado Civil, Escolaridade)"],
            ["• Roxo claro: Contato (Celular, WhatsApp, Telefone, E-mail, Instagram)"],
            ["• Amarelo: Endereço (CEP até Estado)"],
            ["• Ciano: Profissão e Plano de Saúde"],
            ["• Rosa: Familiares (Mãe, Pai, Cônjuge)"],
            ["• Cinza: Operacional (Profissional, Origem, Observações, Datas)"],
            [""],
            [`Paciente: ${paciente.nome}  |  Código interno: ${paciente.id}  |  Gerado: ${new Date().toLocaleString("pt-BR")}`],
          ],
        },
      ],
    },
  });

  // 4. formatação visual (cores, bordas, freeze, autoresize, header bold)
  const formatRequests: any[] = [];

  // 4.1 cabeçalho linha 3 (verde escuro + fonte branca + bold + center)
  formatRequests.push({
    repeatCell: {
      range: { sheetId: sheetIdMestre, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: COLUNAS_FICHA.length },
      cell: {
        userEnteredFormat: {
          backgroundColor: VERDE_HEADER,
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontFamily: "Roboto", fontSize: 11 },
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          wrapStrategy: "WRAP",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
    },
  });

  // 4.2 cores por grupo de coluna na linha de DADOS (linha 4)
  for (const grp of GRUPOS_COR) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId: sheetIdMestre, startRowIndex: 3, endRowIndex: 4, startColumnIndex: grp.start, endColumnIndex: grp.end },
        cell: { userEnteredFormat: { backgroundColor: grp.cor, textFormat: { fontFamily: "Roboto", fontSize: 10 } } },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    });
  }

  // 4.3 bordas full no bloco header+dados
  formatRequests.push({
    updateBorders: {
      range: { sheetId: sheetIdMestre, startRowIndex: 2, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: COLUNAS_FICHA.length },
      top:    { style: "SOLID", color: PRETO, width: 1 },
      bottom: { style: "SOLID", color: PRETO, width: 1 },
      left:   { style: "SOLID", color: PRETO, width: 1 },
      right:  { style: "SOLID", color: PRETO, width: 1 },
      innerHorizontal: { style: "SOLID", color: PRETO, width: 1 },
      innerVertical:   { style: "SOLID", color: PRETO, width: 1 },
    },
  });

  // 4.4 freeze pane: linha 3 (cabeçalho)
  formatRequests.push({
    updateSheetProperties: {
      properties: { sheetId: sheetIdMestre, gridProperties: { frozenRowCount: 3 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // 4.5 altura da linha cabeçalho 32px
  formatRequests.push({
    updateDimensionProperties: {
      range: { sheetId: sheetIdMestre, dimension: "ROWS", startIndex: 2, endIndex: 3 },
      properties: { pixelSize: 32 },
      fields: "pixelSize",
    },
  });

  // 4.6 auto-resize TODAS as colunas (cresce até caber o maior valor)
  formatRequests.push({
    autoResizeDimensions: {
      dimensions: { sheetId: sheetIdMestre, dimension: "COLUMNS", startIndex: 0, endIndex: COLUNAS_FICHA.length },
    },
  });

  // 4.7 título grande na aba Legenda
  formatRequests.push({
    repeatCell: {
      range: { sheetId: sheetIdLegenda, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14, fontFamily: "Roboto" } } },
      fields: "userEnteredFormat.textFormat",
    },
  });
  formatRequests.push({
    autoResizeDimensions: {
      dimensions: { sheetId: sheetIdLegenda, dimension: "COLUMNS", startIndex: 0, endIndex: 6 },
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests },
  });

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    jaExistia: false,
  };
}
