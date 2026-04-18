/**
 * Gerador de planilha Google Sheets do paciente - Onda 6.4.
 *
 * Caio: "O sistema esta gerando o arquivo planilha google sheets com aqueles
 * cabecalhos que definimos? Ele manda para pasta do cliente?"
 *
 * Cria 1 spreadsheet por paciente dentro da subpasta GPS, com 4 abas
 * fundamentais do GPS (Gerenciamento Personalizado de Saude) + RAS
 * (Relatorio Assistencial Sistemico):
 *
 *  - GPS_LINHA_VIDA    : evolucao longitudinal do paciente
 *  - RAS_RELATORIOS    : registro sistemico de cada atendimento
 *  - PROTOCOLOS        : tratamentos contratados / sessoes
 *  - FINANCEIRO_NF     : controle de notas fiscais emitidas
 */

import { google } from "googleapis";
import { getSubfolderId, formatFileName, getAccessToken, escapeDriveQuery } from "../google-drive";

const ABAS_GPS_RAS = {
  GPS_LINHA_VIDA: [
    "Data", "Tipo de Evento", "Categoria GPS", "Descricao Sistemica",
    "Marcadores Clinicos", "Conduta", "Proxima Acao", "Profissional",
  ],
  RAS_RELATORIOS: [
    "Data", "Numero RAS", "Atendimento", "Queixa Principal", "Avaliacao",
    "Conduta Sistemica", "Plano de Acao GPS", "Anexos Drive",
  ],
  PROTOCOLOS: [
    "Data Inicio", "Codigo Protocolo", "Categoria", "Descricao Generica",
    "Sessoes Planejadas", "Sessoes Realizadas", "Status", "Valor Acordado",
  ],
  FINANCEIRO_NF: [
    "Data Emissao", "Numero NF", "Categoria Procedimento", "Valor",
    "Hash Documento", "Status NF", "Link Drive", "Observacoes",
  ],
};

async function getSheetsClient() {
  const accessToken = await getAccessToken();
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

export async function criarPlanilhaGPS_RAS(opts: {
  pacienteNome: string;
  pacienteCpf: string;
  clientFolderId: string;
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = await getSheetsClient();
  const drive = await getDriveClient();

  const fileName = formatFileName(new Date(), "GPS-RAS", opts.pacienteNome);
  const gpsFolder = await getSubfolderId(opts.clientFolderId, "GPS");

  // Idempotencia: se ja existe spreadsheet GPS-RAS na pasta, nao cria duplicata
  // (closes code review finding 2.4 da Onda 6.4).
  const existing = await drive.files.list({
    q: `'${escapeDriveQuery(gpsFolder)}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name contains 'GPS-RAS' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (existing.data.files && existing.data.files.length > 0) {
    const sid = existing.data.files[0].id!;
    return { spreadsheetId: sid, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sid}/edit` };
  }

  // 1) cria spreadsheet com as 4 abas e cabecalhos
  const create = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: fileName, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
      sheets: Object.entries(ABAS_GPS_RAS).map(([title, headers], idx) => ({
        properties: { sheetId: idx, title, gridProperties: { rowCount: 500, columnCount: headers.length, frozenRowCount: 1 } },
        data: [{
          startRow: 0, startColumn: 0,
          rowData: [{ values: headers.map((h) => ({ userEnteredValue: { stringValue: h }, userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.12, green: 0.31, blue: 0.37 } } })) }],
        }],
      })),
    },
  });
  const spreadsheetId = create.data.spreadsheetId!;

  // 2) move para subpasta GPS do paciente
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: gpsFolder,
    removeParents: "root",
    fields: "id, parents",
  });

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export { ABAS_GPS_RAS };
