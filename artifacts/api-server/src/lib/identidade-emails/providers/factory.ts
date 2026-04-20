import type { EmailProvisionProvider, EmailProviderName } from './types.js';
import { zohoAdapter } from './zohoAdapter.js';
import { locawebAdapter } from './locawebAdapter.js';

export function getActiveProviderName(): EmailProviderName {
  const env = (process.env.EMAIL_PROVIDER || 'zoho').toLowerCase();
  if (env === 'zoho' || env === 'locaweb') return env;
  throw new Error(`EMAIL_PROVIDER invalido: "${env}". Use "zoho" ou "locaweb".`);
}

export function getEmailProvider(name?: EmailProviderName): EmailProvisionProvider {
  const target = name || getActiveProviderName();
  if (target === 'zoho') return zohoAdapter;
  if (target === 'locaweb') return locawebAdapter;
  throw new Error(`Provider nao suportado: ${target}`);
}

export const ALL_PROVIDERS: EmailProvisionProvider[] = [zohoAdapter, locawebAdapter];
