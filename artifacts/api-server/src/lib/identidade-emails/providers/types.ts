// Tipos compartilhados entre todos os providers de email (Zoho, Locaweb, Google).

export type EmailProviderName = 'zoho' | 'locaweb' | 'google';

export interface ProvisionAliasInput {
  aliasEmail: string;          // ex: medico.local.alpha.padua@pawards.com.br
  targetMailbox: string;       // ex: medico@pawards.com.br
  cargo: string;
  clinicSlug: string;
}

export interface ProvisionAliasResult {
  success: boolean;
  provider: EmailProviderName;
  email: string;
  externalId?: string | null;  // id do alias no provider (Zoho retorna aliasId)
  message?: string;
}

export interface EmailProvisionProvider {
  name: EmailProviderName;
  isConfigured(): boolean;
  missingEnvVars(): string[];
  setupSteps(): string[];
  provisionAlias(input: ProvisionAliasInput): Promise<ProvisionAliasResult>;
  removeAlias(input: ProvisionAliasInput & { externalId?: string | null }): Promise<ProvisionAliasResult>;
}

export class EmailProviderNotConfiguredError extends Error {
  status = 412;
  faltam: string[];
  passos: string[];
  constructor(public providerName: EmailProviderName, faltam: string[], passos: string[]) {
    super(`Provider de email "${providerName}" nao configurado. Faltam: ${faltam.join(', ')}`);
    this.name = 'EmailProviderNotConfiguredError';
    this.faltam = faltam;
    this.passos = passos;
  }
}
