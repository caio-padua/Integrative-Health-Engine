// ============================================================================
// GOVERNANCA DA DELEGACAO — funcao juiza unica, pura, deterministica, fail-closed
// ----------------------------------------------------------------------------
// CANON eleito (Opcao A do item 6, 16/06/2026): nucleo de decisao UNICO,
// portado da entrega do Dr. Claude (orquestrador) e plugado nas flags REAIS
// do nosso schema `usuarios` (pode_validar / pode_assinar / pode_bypass /
// nunca_opera). E ADITIVO: NAO substitui os porteiros existentes
// (requireAuth, requireRole, requireMasterEstrito, requireDelegacao); serve
// como a regra central, testavel, que eles podem chamar para decidir UM ato.
// Nomes em portugues (Art. 27). Zero efeito colateral: nao le banco, nao grava.
// ============================================================================

export type Acao =
  | "validar"
  | "assinar"
  | "recusar_item"
  | "recusar_grade"
  | "ativar_desativar"
  | "delegar";

export type Modo = "medico_no_comando" | "delegado_humano" | "modo_automatico";

export interface Perfil {
  codigoPerfil: string;
  podeValidar: boolean;
  podeAssinar: boolean;
  podeBypass: boolean;
  nuncaOpera: boolean;
}

export interface PedidoDelegacao {
  origem: Perfil;
  destino: Perfil;
  acao: Acao;
  modo: Modo;
}

export interface ResultadoDelegacao {
  permitido: boolean;
  motivo: string;
  exigeAuditoria: boolean;
}

function flagExigida(acao: Acao): "podeValidar" | "podeAssinar" | null {
  switch (acao) {
    case "assinar":
      return "podeAssinar";
    case "validar":
    case "recusar_item":
    case "recusar_grade":
    case "ativar_desativar":
      return "podeValidar";
    case "delegar":
      return null;
  }
}

/**
 * Decide se um ato delegado e permitido. Ordem das regras (fail-closed):
 *  R1 trava permanente (nunca_opera no destino) vence tudo;
 *  R2 modo automatico exige pode_bypass na origem;
 *  R3 delegacao humana exige pode_validar na origem (autoridade p/ delegar);
 *  R4 acao 'delegar' exige pode_validar na origem;
 *  R5 a flag do ato (pode_validar / pode_assinar) deve existir no destino.
 * Toda decisao — permitida OU negada — exige auditoria.
 */
export function avaliarDelegacao(p: PedidoDelegacao): ResultadoDelegacao {
  const aud = { exigeAuditoria: true as const };

  if (p.destino.nuncaOpera) {
    return {
      permitido: false,
      motivo: `destino '${p.destino.codigoPerfil}' tem nunca_opera (restricao permanente)`,
      ...aud,
    };
  }

  if (p.modo === "modo_automatico" && !p.origem.podeBypass) {
    return {
      permitido: false,
      motivo: `modo automatico exige pode_bypass na origem '${p.origem.codigoPerfil}'`,
      ...aud,
    };
  }

  if (p.modo === "delegado_humano" && !p.origem.podeValidar) {
    return {
      permitido: false,
      motivo: `origem '${p.origem.codigoPerfil}' nao tem autoridade para delegar (pode_validar=false)`,
      ...aud,
    };
  }

  if (p.acao === "delegar" && !p.origem.podeValidar) {
    return {
      permitido: false,
      motivo: `origem '${p.origem.codigoPerfil}' nao pode delegar (pode_validar=false)`,
      ...aud,
    };
  }

  const flag = flagExigida(p.acao);
  if (flag && !p.destino[flag]) {
    return {
      permitido: false,
      motivo: `destino '${p.destino.codigoPerfil}' nao tem ${
        flag === "podeAssinar" ? "pode_assinar" : "pode_validar"
      } para '${p.acao}'`,
      ...aud,
    };
  }

  return {
    permitido: true,
    motivo: `ok: '${p.acao}' autorizada em modo '${p.modo}'`,
    ...aud,
  };
}
