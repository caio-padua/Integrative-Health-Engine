import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

const CLINICA_ROOT_FOLDER = 'CLINICA PADUA - CLIENTES';

const CLIENT_SUBFOLDERS = [
  'CADASTRO',
  'PATOLOGIAS',
  'EXAMES',
  'AVALIACOES',
  'RECEITAS',
  'PROTOCOLOS',
  'FINANCEIRO',
  'CONTRATOS',
  'ATESTADOS',
  'LAUDOS',
  'TERMOS',
  'FOTO PERFIL',
  'IMAGENS',
  'PESQUISA',
  'OUVIDORIA',
  'JURIDICO',
] as const;

export type ClientSubfolder = typeof CLIENT_SUBFOLDERS[number];

const CADASTRO_SANDBOX = 'CADASTROS ANTIGOS';

export function escapeDriveQuery(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
  const safeName = escapeDriveQuery(folderName);
  const query = parentId
    ? `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return folder.data.id;
}

export function formatFileName(date: Date, tipo: string, pacienteNome: string, extra?: string): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const nome = pacienteNome.toUpperCase().trim();
  const tipoUpper = tipo.toUpperCase().trim();
  if (extra) {
    return `${yyyy}.${mm}.${dd} ${tipoUpper} ${extra.toUpperCase()} ${nome}`;
  }
  return `${yyyy}.${mm}.${dd} ${tipoUpper} ${nome}`;
}

export async function getOrCreateClientFolder(clientName: string, clientCpf: string): Promise<{
  folderId: string;
  folderUrl: string;
  subfolders: Record<string, string>;
}> {
  const drive = await getDriveClient();

  const rootFolderId = await findOrCreateFolder(drive, CLINICA_ROOT_FOLDER);

  const clientFolderName = `${clientName.toUpperCase()} - CPF ${clientCpf}`;
  const clientFolderId = await findOrCreateFolder(drive, clientFolderName, rootFolderId);

  const subfolders: Record<string, string> = {};
  for (const sub of CLIENT_SUBFOLDERS) {
    subfolders[sub] = await findOrCreateFolder(drive, sub, clientFolderId);
  }

  const cadastroFolderId = subfolders['CADASTRO'];
  subfolders[CADASTRO_SANDBOX] = await findOrCreateFolder(drive, CADASTRO_SANDBOX, cadastroFolderId);

  return {
    folderId: clientFolderId,
    folderUrl: `https://drive.google.com/drive/folders/${clientFolderId}`,
    subfolders,
  };
}

export async function getSubfolderId(
  clientFolderId: string,
  subfolder: ClientSubfolder
): Promise<string> {
  const drive = await getDriveClient();
  return findOrCreateFolder(drive, subfolder, clientFolderId);
}

export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = await getDriveClient();
  const { Readable } = await import('stream');

  const media = {
    mimeType,
    body: Readable.from(typeof content === 'string' ? Buffer.from(content) : content),
  };

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media,
    fields: 'id, webViewLink',
  });

  return {
    fileId: res.data.id,
    fileUrl: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

export async function uploadToClientSubfolder(opts: {
  clientFolderId: string;
  subfolder: ClientSubfolder;
  fileName: string;
  mimeType: string;
  content: Buffer | string;
}): Promise<{ fileId: string; fileUrl: string; subfolderId: string }> {
  const subfolderId = await getSubfolderId(opts.clientFolderId, opts.subfolder);
  const result = await uploadFileToDrive(subfolderId, opts.fileName, opts.mimeType, opts.content);
  return { ...result, subfolderId };
}

export async function sandboxCadastro(clientFolderId: string): Promise<{ movedCount: number }> {
  const drive = await getDriveClient();

  const cadastroId = await getSubfolderId(clientFolderId, 'CADASTRO');
  const sandboxId = await findOrCreateFolder(drive, CADASTRO_SANDBOX, cadastroId);

  const safeCadastroId = escapeDriveQuery(cadastroId);
  const res = await drive.files.list({
    q: `'${safeCadastroId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  const files = res.data.files || [];
  let movedCount = 0;

  for (const file of files) {
    await drive.files.update({
      fileId: file.id,
      addParents: sandboxId,
      removeParents: cadastroId,
      fields: 'id',
    });
    movedCount++;
  }

  return { movedCount };
}

export async function shareWithPatientAsViewer(
  clientFolderId: string,
  patientEmail: string
): Promise<{ permissionId: string }> {
  const drive = await getDriveClient();

  const res = await drive.permissions.create({
    fileId: clientFolderId,
    requestBody: {
      type: 'user',
      role: 'reader',
      emailAddress: patientEmail,
    },
    sendNotificationEmail: true,
    emailMessage: 'CLINICA PADUA - Sua pasta de documentos foi compartilhada com voce. Acesse para visualizar seus exames, protocolos e documentos.',
  });

  return { permissionId: res.data.id };
}

export async function listClientFiles(folderId: string): Promise<any[]> {
  const drive = await getDriveClient();

  const res = await drive.files.list({
    q: `'${escapeDriveQuery(folderId)}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
  });

  return res.data.files || [];
}

export async function listSubfolderContents(clientFolderId: string, subfolder: ClientSubfolder): Promise<any[]> {
  const subfolderId = await getSubfolderId(clientFolderId, subfolder);
  return listClientFiles(subfolderId);
}

export { CLIENT_SUBFOLDERS };
