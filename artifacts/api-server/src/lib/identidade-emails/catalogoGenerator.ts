export const CARGOS = ['medico','gestao','supervisao','enfermagem','consultoria','administrativo','financeiro','ouvidoria'] as const;
export const MODOS = ['local','remote'] as const;
export const HIERARQUIAS = ['alpha','beta'] as const;
export const DOMAIN = 'padwards.com.br';

export type Cargo = typeof CARGOS[number];
export type Modo = typeof MODOS[number];
export type Hierarquia = typeof HIERARQUIAS[number];

export const BASE_USERS_BY_CARGO: Record<Cargo, string> = {
  medico: 'medico@padwards.com.br',
  gestao: 'gestao@padwards.com.br',
  supervisao: 'supervisao@padwards.com.br',
  enfermagem: 'enfermagem@padwards.com.br',
  consultoria: 'consultoria@padwards.com.br',
  administrativo: 'administrativo@padwards.com.br',
  financeiro: 'financeiro@padwards.com.br',
  ouvidoria: 'ouvidoria@padwards.com.br',
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
  google_target_user: string;
}

export function generateClinicEmailCatalog(unidadeId: number, clinicSlug: string): CatalogRow[] {
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
          google_target_user: BASE_USERS_BY_CARGO[cargo],
        });
      }
    }
  }
  return rows;
}
