import {
  SIGLAS_RACL, SIGLAS_RACJ, SIGLA_LABELS,
  type FamiliaDocumental
} from "@workspace/db/schema";

export interface ModalidadesAtivas {
  injetavelIM: boolean;
  injetavelEV: boolean;
  implante: boolean;
  formula: boolean;
  protocolo: boolean;
  exame: boolean;
  dieta: boolean;
  psicologia: boolean;
}

export interface CadernoResolucao {
  familia: FamiliaDocumental;
  sigla: string;
  descricao: string;
  obrigatorio: boolean;
  condicao: string;
}

const RACL_SEMPRE: string[] = ["CMST", "RDOC", "EVOL"];
const RACJ_SEMPRE: string[] = ["CMST", "LGPD", "RPAC", "NGAR", "CGLO"];

const RACL_CONDICIONAL: Record<string, (m: ModalidadesAtivas) => boolean> = {
  MCLI: () => true,
  MPRO: () => true,
  DSUB: (m) => m.injetavelIM || m.injetavelEV || m.implante || m.formula,
  DMOD: (m) => (m.injetavelIM ? 1 : 0) + (m.injetavelEV ? 1 : 0) + (m.implante ? 1 : 0) + (m.formula ? 1 : 0) >= 2,
  ROPR: (m) => m.injetavelIM || m.injetavelEV || m.implante,
  RPOS: (m) => m.injetavelEV || m.implante,
  JORN: () => false,
  FTRA: () => false,
};

const RACJ_CONDICIONAL: Record<string, (m: ModalidadesAtivas) => boolean> = {
  CFIN: () => true,
  COPE: () => true,
  CREM: () => false,
  CIMP: (m) => m.implante,
  CIMU: (m) => m.injetavelIM,
  CEND: (m) => m.injetavelEV,
  CFORM: (m) => m.formula,
  CCOMB: (m) => {
    const count = (m.injetavelIM ? 1 : 0) + (m.injetavelEV ? 1 : 0) + (m.implante ? 1 : 0) + (m.formula ? 1 : 0);
    return count >= 3;
  },
  RISC: (m) => m.injetavelEV || m.implante,
  TPOS: (m) => m.injetavelEV || m.implante,
  TFIN: () => true,
  IMAG: () => false,
};

/**
 * resolverCadernos
 *
 * @param modalidades  Toggles grossos por modalidade (injetavelIM/EV, implante,
 *                     formula...) — dirigem CIMU/CEND/CIMP/CFORM etc.
 * @param consentimentosSubstancias  (ADITIVO 18/06/2026) Siglas de consentimento
 *                     (CINC/CPEP/CLIP/...) derivadas das SUBSTANCIAS prescritas
 *                     (substancias.consentimento_sigla). Necessario porque
 *                     peptideos/incretinas/lipoliticos sao todos subcutaneos e
 *                     NAO se distinguem por modalidade — quem decide o caderno e
 *                     a substancia. Cada sigla unica e valida vira um caderno
 *                     RACJ obrigatorio. Parametro opcional: chamadores antigos
 *                     que passam so modalidades continuam com o comportamento
 *                     anterior, sem regressao.
 */
export function resolverCadernos(
  modalidades: ModalidadesAtivas,
  consentimentosSubstancias: string[] = [],
): CadernoResolucao[] {
  const resultado: CadernoResolucao[] = [];
  const jaAdicionado = new Set<string>();

  for (const sigla of RACL_SEMPRE) {
    const key = `RACL:${sigla}`;
    if (!jaAdicionado.has(key)) {
      resultado.push({
        familia: "RACL",
        sigla,
        descricao: SIGLA_LABELS[sigla] || sigla,
        obrigatorio: true,
        condicao: "SEMPRE",
      });
      jaAdicionado.add(key);
    }
  }

  for (const [sigla, condicaoFn] of Object.entries(RACL_CONDICIONAL)) {
    const key = `RACL:${sigla}`;
    if (!jaAdicionado.has(key) && condicaoFn(modalidades)) {
      resultado.push({
        familia: "RACL",
        sigla,
        descricao: SIGLA_LABELS[sigla] || sigla,
        obrigatorio: false,
        condicao: `Modalidade ativa`,
      });
      jaAdicionado.add(key);
    }
  }

  for (const sigla of RACJ_SEMPRE) {
    const key = `RACJ:${sigla}`;
    if (!jaAdicionado.has(key)) {
      resultado.push({
        familia: "RACJ",
        sigla,
        descricao: SIGLA_LABELS[sigla] || sigla,
        obrigatorio: true,
        condicao: "SEMPRE (emitido 1x no START)",
      });
      jaAdicionado.add(key);
    }
  }

  for (const [sigla, condicaoFn] of Object.entries(RACJ_CONDICIONAL)) {
    const key = `RACJ:${sigla}`;
    if (!jaAdicionado.has(key) && condicaoFn(modalidades)) {
      resultado.push({
        familia: "RACJ",
        sigla,
        descricao: SIGLA_LABELS[sigla] || sigla,
        obrigatorio: false,
        condicao: `Modalidade ativa (emitido 1x no START)`,
      });
      jaAdicionado.add(key);
    }
  }

  // Consentimentos dirigidos por SUBSTANCIA prescrita (ADITIVO 18/06/2026).
  // CINC/CPEP/CLIP (e quaisquer outras siglas RACJ ligadas a substancia) sao
  // emitidos com base em substancias.consentimento_sigla, pois sao subcutaneos
  // e nao se distinguem por modalidade. Cada sigla unica/valida vira caderno
  // RACJ obrigatorio. Dedup compartilha o mesmo Set jaAdicionado das condicoes.
  const siglasValidasRACJ = new Set<string>(SIGLAS_RACJ as readonly string[]);
  for (const siglaBruta of consentimentosSubstancias) {
    const sigla = (siglaBruta || "").trim().toUpperCase();
    if (!sigla || !siglasValidasRACJ.has(sigla)) continue;
    const key = `RACJ:${sigla}`;
    if (jaAdicionado.has(key)) continue;
    resultado.push({
      familia: "RACJ",
      sigla,
      descricao: SIGLA_LABELS[sigla] || sigla,
      obrigatorio: true,
      condicao: "Substancia prescrita exige consentimento especifico (emitido 1x no START)",
    });
    jaAdicionado.add(key);
  }

  return resultado;
}

export function resolverCadernosRACL(
  modalidades: ModalidadesAtivas,
  consentimentosSubstancias: string[] = [],
): CadernoResolucao[] {
  return resolverCadernos(modalidades, consentimentosSubstancias).filter(c => c.familia === "RACL");
}

export function resolverCadernosRACJ(
  modalidades: ModalidadesAtivas,
  consentimentosSubstancias: string[] = [],
): CadernoResolucao[] {
  return resolverCadernos(modalidades, consentimentosSubstancias).filter(c => c.familia === "RACJ");
}
