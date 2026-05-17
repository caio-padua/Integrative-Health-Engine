// Mock data compartilhado pelas 3 variantes da Craniotomia.
// 28 sinapses cobrindo todos os 10 blocos B1 da anamnese Pawards.
// Cada sinapse = uma regra do motor: SE (sinal anamnese) ENTAO (acao terapeutica).

export type B1 =
  | "QSNT" // sintomas
  | "QDGN" // diagnosticos
  | "QCIR" // cirurgias
  | "QFAM" // familiar
  | "QHAB" // habitos
  | "QSEX" // sexual
  | "QPSI" // psiquico
  | "QPRF" // profissional
  | "QVIT" // vitais
  | "QHDA"; // historia doenca atual

export type TipoFenotipo = "FORM" | "INJE" | "IMPL" | "EXAM" | "PROT";
export type Estado = "ATIVO" | "PAUSADO" | "BLOQUEADO" | "AGUARDA_VALIDACAO";

export const B1_LABEL: Record<B1, string> = {
  QSNT: "SINTOMAS",
  QDGN: "DIAGNOSTICOS",
  QCIR: "CIRURGIAS",
  QFAM: "HIST. FAMILIAR",
  QHAB: "HABITOS",
  QSEX: "SAUDE SEXUAL",
  QPSI: "PSIQUICO",
  QPRF: "PROFISSIONAL",
  QVIT: "SINAIS VITAIS",
  QHDA: "HIST. DOENCA ATUAL",
};

export const B1_COR: Record<B1, string> = {
  QSNT: "var(--crn-b1-qsnt)",
  QDGN: "var(--crn-b1-qdgn)",
  QCIR: "var(--crn-b1-qcir)",
  QFAM: "var(--crn-b1-qfam)",
  QHAB: "var(--crn-b1-qhab)",
  QSEX: "var(--crn-b1-qsex)",
  QPSI: "var(--crn-b1-qpsi)",
  QPRF: "var(--crn-b1-qprf)",
  QVIT: "var(--crn-b1-qvit)",
  QHDA: "var(--crn-b1-qhda)",
};

export const TIPO_LABEL: Record<TipoFenotipo, string> = {
  FORM: "FORMULA",
  INJE: "INJETAVEL",
  IMPL: "IMPLANTE",
  EXAM: "EXAME",
  PROT: "PROTOCOLO",
};

export const TIPO_COR: Record<TipoFenotipo, string> = {
  FORM: "var(--crn-tipo-form)",
  INJE: "var(--crn-tipo-inje)",
  IMPL: "var(--crn-tipo-impl)",
  EXAM: "var(--crn-tipo-exam)",
  PROT: "var(--crn-tipo-prot)",
};

export const ESTADO_COR: Record<Estado, string> = {
  ATIVO: "var(--crn-estado-ativo)",
  PAUSADO: "var(--crn-estado-pausado)",
  BLOQUEADO: "var(--crn-estado-bloqueado)",
  AGUARDA_VALIDACAO: "var(--crn-estado-validacao)",
};

export interface Sinapse {
  id: number;
  codigoV4: string; // B1 B2 B3 B4 SEQ
  b1: B1;
  b2: string; // subcategoria
  sinal: string; // o que o paciente reporta na anamnese
  tipo: TipoFenotipo;
  fenotipo: string; // nome do item terapeutico
  peso: number; // 0.0 - 1.0
  estado: Estado;
  requerValidacao: boolean;
  governanca: "AUTO" | "MEDICO" | "MEDICO_CHEFE";
  ultimaEdicao: string;
  hits30d: number; // quantos pacientes dispararam em 30d
}

export const SINAPSES: Sinapse[] = [
  { id: 1,  codigoV4: "QSNT FAD ENE BAI 001", b1: "QSNT", b2: "FADIGA",     sinal: "Cansaco persistente >3 meses",         tipo: "EXAM", fenotipo: "TSH + T4 livre + Ferritina",        peso: 0.92, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "12/mai/2026", hits30d: 47 },
  { id: 2,  codigoV4: "QSNT FAD ENE BAI 002", b1: "QSNT", b2: "FADIGA",     sinal: "Cansaco persistente >3 meses",         tipo: "FORM", fenotipo: "Coenzima Q10 200mg + L-Carnitina",  peso: 0.78, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "12/mai/2026", hits30d: 33 },
  { id: 3,  codigoV4: "QSNT DOR CAB CRO 003", b1: "QSNT", b2: "DOR CABECA", sinal: "Cefaleia tensional cronica",            tipo: "PROT", fenotipo: "Protocolo Magnesio Glicinato 4sem", peso: 0.85, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "08/mai/2026", hits30d: 21 },
  { id: 4,  codigoV4: "QSNT SON INS ALT 004", b1: "QSNT", b2: "INSONIA",    sinal: "Insonia inicial >2sem",                 tipo: "FORM", fenotipo: "Melatonina 3mg + Passiflora",       peso: 0.88, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "10/mai/2026", hits30d: 62 },
  { id: 5,  codigoV4: "QDGN MET DM2 CON 005", b1: "QDGN", b2: "METABOLICO", sinal: "Diabetes tipo 2 controlado",            tipo: "EXAM", fenotipo: "HbA1c + Glicemia jejum + HOMA-IR",  peso: 0.95, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "01/mai/2026", hits30d: 89 },
  { id: 6,  codigoV4: "QDGN MET DM2 CON 006", b1: "QDGN", b2: "METABOLICO", sinal: "Diabetes tipo 2 controlado",            tipo: "INJE", fenotipo: "Vitamina B12 1000mcg IM mensal",    peso: 0.71, estado: "AGUARDA_VALIDACAO", requerValidacao: true,  governanca: "MEDICO_CHEFE", ultimaEdicao: "13/mai/2026", hits30d: 12 },
  { id: 7,  codigoV4: "QDGN CAR HAS EST 007", b1: "QDGN", b2: "CARDIO",     sinal: "Hipertensao estagio I",                  tipo: "FORM", fenotipo: "Coenzima Q10 100mg + Magnesio",     peso: 0.82, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "05/mai/2026", hits30d: 41 },
  { id: 8,  codigoV4: "QDGN OST OPE FEM 008", b1: "QDGN", b2: "OSTEO",      sinal: "Osteopenia femea pos-menopausa",         tipo: "EXAM", fenotipo: "Densitometria + 25-OH-Vit D + PTH", peso: 0.93, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "29/abr/2026", hits30d: 28 },
  { id: 9,  codigoV4: "QCIR BAR GAS POS 009", b1: "QCIR", b2: "BARIATRICA", sinal: "Pos-bariatrica >12 meses",               tipo: "FORM", fenotipo: "Multivitaminico bariatrico full",   peso: 0.97, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "15/abr/2026", hits30d: 8  },
  { id: 10, codigoV4: "QCIR BAR GAS POS 010", b1: "QCIR", b2: "BARIATRICA", sinal: "Pos-bariatrica >12 meses",               tipo: "INJE", fenotipo: "B12 + Ferro sacarato trimestral",   peso: 0.89, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "15/abr/2026", hits30d: 8  },
  { id: 11, codigoV4: "QCIR TIR TOT REP 011", b1: "QCIR", b2: "TIREOIDE",   sinal: "Tireoidectomia total",                   tipo: "PROT", fenotipo: "Protocolo reposicao L-tiroxina TSH", peso: 0.99, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "20/abr/2026", hits30d: 5  },
  { id: 12, codigoV4: "QFAM ONC MAM MAT 012", b1: "QFAM", b2: "ONCOLOGIA",  sinal: "Mae com cancer mama <50a",               tipo: "EXAM", fenotipo: "BRCA1/2 + Mamografia anual",        peso: 0.96, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO_CHEFE", ultimaEdicao: "22/abr/2026", hits30d: 14 },
  { id: 13, codigoV4: "QFAM CAR INF PAI 013", b1: "QFAM", b2: "CARDIO",     sinal: "Pai IAM <55a",                           tipo: "EXAM", fenotipo: "Lp(a) + ApoB + Calcio coronario",   peso: 0.91, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "25/abr/2026", hits30d: 19 },
  { id: 14, codigoV4: "QHAB ALI ULT FRE 014", b1: "QHAB", b2: "ALIMENTAR",  sinal: "Ultraprocessados >3x/semana",            tipo: "PROT", fenotipo: "Protocolo educacao alimentar 12sem",peso: 0.65, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "30/abr/2026", hits30d: 73 },
  { id: 15, codigoV4: "QHAB ALC ALT SEM 015", b1: "QHAB", b2: "ALCOOL",     sinal: "Alcool >14 doses/semana",                tipo: "EXAM", fenotipo: "GGT + AST/ALT + CDT",                peso: 0.83, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "02/mai/2026", hits30d: 16 },
  { id: 16, codigoV4: "QHAB TAB ATU FUM 016", b1: "QHAB", b2: "TABAGISMO",  sinal: "Tabagismo ativo >10 mc.anos",            tipo: "EXAM", fenotipo: "TC torax baixa dose anual",          peso: 0.94, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "03/mai/2026", hits30d: 9  },
  { id: 17, codigoV4: "QSEX LIB MAS BAI 017", b1: "QSEX", b2: "LIBIDO",     sinal: "Libido baixa masculina >40a",            tipo: "EXAM", fenotipo: "Testosterona total + livre + SHBG", peso: 0.87, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "11/mai/2026", hits30d: 34 },
  { id: 18, codigoV4: "QSEX LIB MAS BAI 018", b1: "QSEX", b2: "LIBIDO",     sinal: "Libido baixa masculina >40a",            tipo: "IMPL", fenotipo: "Pellet testosterona (apos exame)",  peso: 0.62, estado: "BLOQUEADO",         requerValidacao: true,  governanca: "MEDICO_CHEFE", ultimaEdicao: "11/mai/2026", hits30d: 0  },
  { id: 19, codigoV4: "QSEX MEN SVA PER 019", b1: "QSEX", b2: "MENOPAUSA",  sinal: "Sintomas vasomotores perimenopausa",     tipo: "FORM", fenotipo: "Cimicifuga + Vitex agnus-castus",   peso: 0.74, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "07/mai/2026", hits30d: 22 },
  { id: 20, codigoV4: "QPSI ANS GEN CRO 020", b1: "QPSI", b2: "ANSIEDADE",  sinal: "Ansiedade generalizada cronica",          tipo: "FORM", fenotipo: "Ashwagandha 600mg + L-teanina",     peso: 0.81, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "09/mai/2026", hits30d: 55 },
  { id: 21, codigoV4: "QPSI DEP LEV INI 021", b1: "QPSI", b2: "DEPRESSAO",  sinal: "Humor deprimido leve recente",            tipo: "EXAM", fenotipo: "Vit D + B12 + Folato + Ferritina",  peso: 0.86, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "09/mai/2026", hits30d: 38 },
  { id: 22, codigoV4: "QPSI BUR ATU EXE 022", b1: "QPSI", b2: "BURNOUT",    sinal: "Burnout executivo ativo",                tipo: "PROT", fenotipo: "Protocolo adaptogenos 8sem + sono", peso: 0.76, estado: "AGUARDA_VALIDACAO", requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "13/mai/2026", hits30d: 11 },
  { id: 23, codigoV4: "QPRF EXP QUI IND 023", b1: "QPRF", b2: "EXPOSICAO",  sinal: "Exposicao a solventes industriais",       tipo: "EXAM", fenotipo: "Metais pesados + GGT + ALT",         peso: 0.79, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "27/abr/2026", hits30d: 4  },
  { id: 24, codigoV4: "QPRF TUR NOT FRE 024", b1: "QPRF", b2: "TURNO",      sinal: "Trabalho noturno frequente",              tipo: "FORM", fenotipo: "Melatonina circadiana + Vit D",     peso: 0.72, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "27/abr/2026", hits30d: 17 },
  { id: 25, codigoV4: "QVIT PRE SIS ALT 025", b1: "QVIT", b2: "PRESSAO",    sinal: "PA sistolica >140 mmHg consulta",         tipo: "EXAM", fenotipo: "MAPA 24h + Ecocardiograma",          peso: 0.90, estado: "ATIVO",             requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "06/mai/2026", hits30d: 31 },
  { id: 26, codigoV4: "QVIT IMC OBE GRA 026", b1: "QVIT", b2: "IMC",        sinal: "IMC >=30 obesidade grau I",               tipo: "PROT", fenotipo: "Protocolo perda peso integrativa",   peso: 0.84, estado: "ATIVO",             requerValidacao: true,  governanca: "MEDICO",       ultimaEdicao: "06/mai/2026", hits30d: 49 },
  { id: 27, codigoV4: "QHDA EME AGU DOR 027", b1: "QHDA", b2: "DOR AGUDA",  sinal: "Dor abdominal aguda >24h",                tipo: "PROT", fenotipo: "Encaminhar pronto-atend (bloqueio)", peso: 1.00, estado: "BLOQUEADO",         requerValidacao: true,  governanca: "MEDICO_CHEFE", ultimaEdicao: "01/mai/2026", hits30d: 0  },
  { id: 28, codigoV4: "QHDA INF VIA SUP 028", b1: "QHDA", b2: "INFECCAO",   sinal: "IVAS recorrente >3x/ano",                 tipo: "FORM", fenotipo: "Zinco quelado + Vit C + Echinacea", peso: 0.69, estado: "PAUSADO",           requerValidacao: false, governanca: "AUTO",         ultimaEdicao: "18/abr/2026", hits30d: 0  },
];

export const RESUMO = {
  total: SINAPSES.length,
  ativas: SINAPSES.filter((s) => s.estado === "ATIVO").length,
  pausadas: SINAPSES.filter((s) => s.estado === "PAUSADO").length,
  bloqueadas: SINAPSES.filter((s) => s.estado === "BLOQUEADO").length,
  aguardando: SINAPSES.filter((s) => s.estado === "AGUARDA_VALIDACAO").length,
  hitsTotal: SINAPSES.reduce((a, s) => a + s.hits30d, 0),
};
