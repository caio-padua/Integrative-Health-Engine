// ============================================================================
// ADAPTADOR — liga a funcao juiza pura (avaliarDelegacao) ao BANCO REAL.
// ----------------------------------------------------------------------------
// Le as 4 flags reais da tabela `usuarios` (pode_validar / pode_assinar /
// pode_bypass / nunca_opera) e monta o objeto Perfil que o motor consome.
// E AQUI que o motor deixa de ser "exemplo" e passa a decidir com o dado
// real do CEO: em producao o Caio edita essas flags por clique, e a funcao
// juiza obedece sem nenhuma regra hardcoded de perfil.
// ============================================================================

import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Perfil } from "./avaliarDelegacao";

/**
 * Carrega o Perfil de governanca de um usuario a partir do banco real.
 * Retorna null se o usuario nao existir (o chamador trata como fail-closed).
 */
export async function carregarPerfilGovernanca(
  usuarioId: number,
): Promise<Perfil | null> {
  const linhas = await db
    .select({
      perfil: usuariosTable.perfil,
      podeValidar: usuariosTable.podeValidar,
      podeAssinar: usuariosTable.podeAssinar,
      podeBypass: usuariosTable.podeBypass,
      nuncaOpera: usuariosTable.nuncaOpera,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, usuarioId))
    .limit(1);

  const u = linhas[0];
  if (!u) return null;

  return {
    codigoPerfil: u.perfil,
    podeValidar: u.podeValidar,
    podeAssinar: u.podeAssinar,
    podeBypass: u.podeBypass,
    nuncaOpera: u.nuncaOpera,
  };
}
