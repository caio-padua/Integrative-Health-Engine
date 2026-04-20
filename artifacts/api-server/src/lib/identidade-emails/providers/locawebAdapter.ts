// Locaweb Email adapter (PROVIDER ALTERNATIVO — para fase futura).
// A Locaweb tem painel admin e API REST limitada. Este adapter fica como stub
// ate que Caio decida migrar de provider. Mesma interface do zohoAdapter.

import type {
  EmailProvisionProvider,
  ProvisionAliasInput,
  ProvisionAliasResult,
} from './types.js';
import { EmailProviderNotConfiguredError } from './types.js';

function envs() {
  return {
    apiKey: process.env.LOCAWEB_API_KEY,
    apiSecret: process.env.LOCAWEB_API_SECRET,
    domain: process.env.LOCAWEB_DOMAIN,
  };
}

function isConfigured(): boolean {
  const e = envs();
  return !!(e.apiKey && e.apiSecret && e.domain);
}

function missingEnvVars(): string[] {
  const e = envs();
  const missing: string[] = [];
  if (!e.apiKey) missing.push('LOCAWEB_API_KEY');
  if (!e.apiSecret) missing.push('LOCAWEB_API_SECRET');
  if (!e.domain) missing.push('LOCAWEB_DOMAIN');
  return missing;
}

function setupSteps(): string[] {
  return [
    "1. Contratar Locaweb Email Pro (~R$5/conta/mes)",
    "2. Apontar MX/SPF/DKIM do dominio pawards.com.br para Locaweb",
    "3. Criar 8 contas-base via painel da Locaweb",
    "4. Solicitar acesso a API Locaweb (suporte tecnico) - automacao publica e limitada",
    "5. Setar secrets: LOCAWEB_API_KEY, LOCAWEB_API_SECRET, LOCAWEB_DOMAIN",
    "AVISO: implementacao real do provisionamento via Locaweb depende da API privada deles.",
  ];
}

async function provisionAlias(_input: ProvisionAliasInput): Promise<ProvisionAliasResult> {
  if (!isConfigured()) {
    throw new EmailProviderNotConfiguredError('locaweb', missingEnvVars(), setupSteps());
  }
  throw new Error('Locaweb adapter: implementacao real pendente. Use Zoho como provider principal.');
}

async function removeAlias(_input: ProvisionAliasInput): Promise<ProvisionAliasResult> {
  if (!isConfigured()) {
    throw new EmailProviderNotConfiguredError('locaweb', missingEnvVars(), setupSteps());
  }
  throw new Error('Locaweb adapter: implementacao real pendente.');
}

export const locawebAdapter: EmailProvisionProvider = {
  name: 'locaweb',
  isConfigured,
  missingEnvVars,
  setupSteps,
  provisionAlias,
  removeAlias,
};
