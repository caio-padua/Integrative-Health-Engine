// Zoho Mail Admin API adapter (PROVIDER PRINCIPAL — decisao Caio + Dr. Claude 20.04.26).
// Doc: https://www.zoho.com/mail/help/api/
//   - OAuth refresh: https://accounts.zoho.com/oauth/v2/token
//   - List accounts: GET /api/organization/{zoid}/accounts
//   - Create alias:  POST /api/organization/{zoid}/accounts/{accountId}/emailAlias
//   - Delete alias:  DELETE /api/organization/{zoid}/accounts/{accountId}/emailAlias/{aliasId}
//
// CAVEAT IMPORTANTE: Zoho limita a 30 aliases por conta-base.
// Como cada cargo tem 4 aliases por clinica (local/remote x alpha/beta),
// 1 conta-base por cargo aguenta no maximo 7-8 clinicas (28-32 aliases).
// O sistema deve detectar isso e sugerir criar conta-base secundaria
// (ex: administrativo2@padwards.com.br) quando passar de 28.

import type {
  EmailProvisionProvider,
  ProvisionAliasInput,
  ProvisionAliasResult,
} from './types.js';
import { EmailProviderNotConfiguredError } from './types.js';

const ZOHO_ALIAS_LIMIT_PER_ACCOUNT = 30;
const ZOHO_ALIAS_WARNING_THRESHOLD = 28;

interface ZohoTokenCache { token: string; expiresAt: number; }
let tokenCache: ZohoTokenCache | null = null;

const accountIdCache = new Map<string, string>();

function envs() {
  return {
    clientId: process.env.ZOHO_OAUTH_CLIENT_ID,
    clientSecret: process.env.ZOHO_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_OAUTH_REFRESH_TOKEN,
    orgId: process.env.ZOHO_ORG_ID,
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://mail.zoho.com',
    accountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.com',
  };
}

function isConfigured(): boolean {
  const e = envs();
  return !!(e.clientId && e.clientSecret && e.refreshToken && e.orgId);
}

function missingEnvVars(): string[] {
  const e = envs();
  const missing: string[] = [];
  if (!e.clientId) missing.push('ZOHO_OAUTH_CLIENT_ID');
  if (!e.clientSecret) missing.push('ZOHO_OAUTH_CLIENT_SECRET');
  if (!e.refreshToken) missing.push('ZOHO_OAUTH_REFRESH_TOKEN');
  if (!e.orgId) missing.push('ZOHO_ORG_ID');
  return missing;
}

function setupSteps(): string[] {
  return [
    "1. Contratar Zoho Mail Lite (~US$1/usuario/mes) e verificar o dominio padwards.com.br",
    "2. Configurar registros MX, SPF, DKIM e DMARC apontando para Zoho",
    "3. Criar 8 contas-base no Zoho: medico@, gestao@, supervisao@, enfermagem@, consultoria@, administrativo@, financeiro@, ouvidoria@padwards.com.br",
    "4. Criar 'Self Client' em https://api-console.zoho.com (tipo Server-based) com escopo ZohoMail.organization.accounts.UPDATE",
    "5. Gerar refresh_token via grant_type=authorization_code (uso unico) - guardar com seguranca",
    "6. Pegar o ZOID (organization ID) em Mail Admin Console > Settings > General",
    "7. Setar 4 secrets no Replit: ZOHO_OAUTH_CLIENT_ID, ZOHO_OAUTH_CLIENT_SECRET, ZOHO_OAUTH_REFRESH_TOKEN, ZOHO_ORG_ID",
    "8. (Opcional) ZOHO_API_DOMAIN se for regiao .eu/.in (default: https://mail.zoho.com)",
  ];
}

async function getAccessToken(): Promise<string> {
  if (!isConfigured()) {
    throw new EmailProviderNotConfiguredError('zoho', missingEnvVars(), setupSteps());
  }
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;
  const e = envs();
  const url = new URL(`${e.accountsDomain}/oauth/v2/token`);
  url.searchParams.set('refresh_token', e.refreshToken!);
  url.searchParams.set('client_id', e.clientId!);
  url.searchParams.set('client_secret', e.clientSecret!);
  url.searchParams.set('grant_type', 'refresh_token');
  const r = await fetch(url.toString(), { method: 'POST' });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Zoho OAuth refresh falhou (${r.status}): ${txt}`);
  }
  const data = await r.json() as any;
  if (!data.access_token) throw new Error(`Zoho OAuth: access_token ausente. Resposta: ${JSON.stringify(data)}`);
  tokenCache = {
    token: data.access_token,
    expiresAt: now + ((data.expires_in || 3600) * 1000),
  };
  return tokenCache.token;
}

async function zohoFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const e = envs();
  const r = await fetch(`${e.apiDomain}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await r.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  if (!r.ok || (body && body.status && body.status.code && body.status.code >= 400)) {
    throw new Error(`Zoho API ${path} falhou (${r.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function getAccountIdByEmail(mailbox: string): Promise<string> {
  if (accountIdCache.has(mailbox)) return accountIdCache.get(mailbox)!;
  const e = envs();
  const data = await zohoFetch(`/api/organization/${e.orgId}/accounts`);
  const accounts: any[] = data?.data ?? [];
  const acc = accounts.find((a) => (a.primaryEmailAddress || a.mailboxAddress || a.emailId) === mailbox);
  if (!acc) {
    throw new Error(`Conta-base "${mailbox}" nao encontrada no Zoho. Crie a conta no Zoho Mail Admin Console primeiro.`);
  }
  const accountId = String(acc.accountId || acc.zoid || acc.id);
  accountIdCache.set(mailbox, accountId);
  return accountId;
}

async function countAliasesForAccount(accountId: string): Promise<number> {
  const e = envs();
  try {
    const data = await zohoFetch(`/api/organization/${e.orgId}/accounts/${accountId}/emailAlias`);
    const aliases: any[] = data?.data ?? [];
    return aliases.length;
  } catch {
    return 0;
  }
}

async function provisionAlias(input: ProvisionAliasInput): Promise<ProvisionAliasResult> {
  const accountId = await getAccountIdByEmail(input.targetMailbox);
  const currentCount = await countAliasesForAccount(accountId);
  if (currentCount >= ZOHO_ALIAS_LIMIT_PER_ACCOUNT) {
    throw new Error(
      `LIMITE ZOHO ATINGIDO: a conta-base ${input.targetMailbox} ja tem ${currentCount} aliases (max=${ZOHO_ALIAS_LIMIT_PER_ACCOUNT}). ` +
      `Crie uma conta secundaria (ex: ${input.cargo}2@padwards.com.br) e atualize o mapeamento BASE_USERS_BY_CARGO.`
    );
  }
  const e = envs();
  const body = await zohoFetch(`/api/organization/${e.orgId}/accounts/${accountId}/emailAlias`, {
    method: 'POST',
    body: JSON.stringify({ emailId: input.aliasEmail }),
  });
  const externalId = body?.data?.aliasId || body?.data?.id || null;
  const warning = (currentCount + 1) >= ZOHO_ALIAS_WARNING_THRESHOLD
    ? ` AVISO: ${currentCount + 1}/${ZOHO_ALIAS_LIMIT_PER_ACCOUNT} aliases na conta-base. Prepare conta secundaria.`
    : '';
  return {
    success: true,
    provider: 'zoho',
    email: input.aliasEmail,
    externalId: externalId ? String(externalId) : null,
    message: `Alias criado no Zoho.${warning}`,
  };
}

async function removeAlias(input: ProvisionAliasInput & { externalId?: string | null }): Promise<ProvisionAliasResult> {
  const accountId = await getAccountIdByEmail(input.targetMailbox);
  const e = envs();
  if (input.externalId) {
    await zohoFetch(`/api/organization/${e.orgId}/accounts/${accountId}/emailAlias/${input.externalId}`, {
      method: 'DELETE',
    });
  } else {
    const data = await zohoFetch(`/api/organization/${e.orgId}/accounts/${accountId}/emailAlias`);
    const aliases: any[] = data?.data ?? [];
    const found = aliases.find((a) => (a.emailId || a.alias) === input.aliasEmail);
    if (!found) {
      return { success: true, provider: 'zoho', email: input.aliasEmail, message: 'Alias nao existia no Zoho (idempotente).' };
    }
    const aliasId = found.aliasId || found.id;
    await zohoFetch(`/api/organization/${e.orgId}/accounts/${accountId}/emailAlias/${aliasId}`, {
      method: 'DELETE',
    });
  }
  return { success: true, provider: 'zoho', email: input.aliasEmail, message: 'Alias removido do Zoho.' };
}

export const zohoAdapter: EmailProvisionProvider = {
  name: 'zoho',
  isConfigured,
  missingEnvVars,
  setupSteps,
  provisionAlias,
  removeAlias,
};
