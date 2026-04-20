// Adapter Google Workspace Admin SDK — provisionamento de aliases.
// Se ENV nao estiver setada, retorna erro 412 claro (mesmo padrao adapters NFe).

export class GoogleWorkspaceNotConfiguredError extends Error {
  status = 412;
  constructor() {
    super('Google Workspace nao configurado. Faltam variaveis: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_ADMIN_IMPERSONATION_EMAIL');
    this.name = 'GoogleWorkspaceNotConfiguredError';
  }
}

export function isGoogleWorkspaceConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_ADMIN_IMPERSONATION_EMAIL
  );
}

async function getDirectoryClient(): Promise<any> {
  if (!isGoogleWorkspaceConfigured()) throw new GoogleWorkspaceNotConfiguredError();
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.alias'],
    clientOptions: { subject: process.env.GOOGLE_ADMIN_IMPERSONATION_EMAIL },
  });
  return google.admin({ version: 'directory_v1', auth: auth as any });
}

export async function createGoogleAlias(userKey: string, aliasEmail: string): Promise<void> {
  const admin = await getDirectoryClient();
  await admin.users.aliases.insert({
    userKey,
    requestBody: { alias: aliasEmail },
  });
}

export async function deleteGoogleAlias(userKey: string, aliasEmail: string): Promise<void> {
  const admin = await getDirectoryClient();
  await admin.users.aliases.delete({ userKey, alias: aliasEmail });
}
