export const CARGOS = ['medico','gestao','supervisao','enfermagem','consultoria','administrativo','financeiro','ouvidoria'] as const;
export const MODOS = ['local','remoto'] as const;
export const HIERARQUIAS = ['alpha','beta'] as const;
export const DOMAIN = 'pawards.com.br';

export type Cargo = typeof CARGOS[number];
export type Modo = typeof MODOS[number];
export type Hierarquia = typeof HIERARQUIAS[number];

export const BASE_USERS_BY_CARGO: Record<Cargo, string> = {
  medico: 'medico@pawards.com.br',
  gestao: 'gestao@pawards.com.br',
  supervisao: 'supervisao@pawards.com.br',
  enfermagem: 'enfermagem@pawards.com.br',
  consultoria: 'consultoria@pawards.com.br',
  administrativo: 'administrativo@pawards.com.br',
  financeiro: 'financeiro@pawards.com.br',
  ouvidoria: 'ouvidoria@pawards.com.br',
};

export function slugifyClinicName(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\(arquivada\)\s*/i, '')
    .replace(/^instituto\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 32) || `clinica-${Date.now()}`;
}

export interface CatalogRow {
  unidade_id: number;
  cargo: Cargo;
  modo: Modo;
  hierarquia: Hierarquia;
  email: string;
  target_user_email: string;
  provider: 'zoho' | 'locaweb' | 'google';
}

export function generateClinicEmailCatalog(
  unidadeId: number,
  clinicSlug: string,
  provider: 'zoho' | 'locaweb' | 'google' = 'zoho'
): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const cargo of CARGOS) {
    for (const modo of MODOS) {
      for (const hierarquia of HIERARQUIAS) {
        rows.push({
          unidade_id: unidadeId,
          cargo,
          modo,
          hierarquia,
          email: `${cargo}.${modo}.${hierarquia}.${clinicSlug}@${DOMAIN}`,
          target_user_email: BASE_USERS_BY_CARGO[cargo],
          provider,
        });
      }
    }
  }
  return rows;
}
