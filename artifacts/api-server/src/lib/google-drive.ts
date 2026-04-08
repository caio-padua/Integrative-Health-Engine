import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
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

async function findOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
  const query = parentId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

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

export async function getOrCreateClientFolder(clientName: string, clientCpf: string): Promise<{ folderId: string; folderUrl: string }> {
  const drive = await getDriveClient();

  const rootFolderId = await findOrCreateFolder(drive, CLINICA_ROOT_FOLDER);

  const clientFolderName = `${clientName.toUpperCase()} - CPF ${clientCpf}`;
  const clientFolderId = await findOrCreateFolder(drive, clientFolderName, rootFolderId);

  return {
    folderId: clientFolderId,
    folderUrl: `https://drive.google.com/drive/folders/${clientFolderId}`,
  };
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

export async function listClientFiles(folderId: string): Promise<any[]> {
  const drive = await getDriveClient();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
  });

  return res.data.files || [];
}
