// Classificacao multi-eixo de ativos/materias-primas (proposta 26.06.04).
// Eixo 1 NATUREZA e exclusivo e define a COR (decisao D002=Sim).
// Cores reusam as familias da skill PENUMBRA (2 faces: claro = saturado para
// fundo claro / texto branco; escuro = pastel para fundo escuro navy).
// Eficacia REUSA classificacao_estrelas (D003=A) — nao ha eixo proprio aqui.

export type NaturezaAtivo =
  | "Fitoterapico"
  | "Hormonio"
  | "Sintetico"
  | "Nutraceutico"
  | "Mineral/Aminoacido";

export interface NaturezaMeta {
  label: string;
  corClaro: string;
  corEscuro: string;
}

export const NATUREZAS_ATIVO: Record<NaturezaAtivo, NaturezaMeta> = {
  Fitoterapico: { label: "Fitoterápico", corClaro: "#3F6E3F", corEscuro: "#7CC4A0" },
  Hormonio: { label: "Hormônio", corClaro: "#5A4A82", corEscuro: "#A89DFF" },
  Sintetico: { label: "Sintético", corClaro: "#2E5C92", corEscuro: "#9CC2EA" },
  Nutraceutico: { label: "Nutracêutico", corClaro: "#9C6E16", corEscuro: "#FFD27A" },
  "Mineral/Aminoacido": { label: "Mineral/Aminoácido", corClaro: "#1E7A6E", corEscuro: "#5FE6CC" },
};

export const NATUREZA_KEYS = Object.keys(NATUREZAS_ATIVO) as NaturezaAtivo[];

/** Cor da natureza. face="claro" para fundo claro (texto branco), "escuro" para navy. */
export function corDaNatureza(
  natureza?: string | null,
  face: "claro" | "escuro" = "claro",
): string | null {
  if (!natureza) return null;
  const meta = NATUREZAS_ATIVO[natureza as NaturezaAtivo];
  if (!meta) return null;
  return face === "claro" ? meta.corClaro : meta.corEscuro;
}

export function labelDaNatureza(natureza?: string | null): string | null {
  if (!natureza) return null;
  return NATUREZAS_ATIVO[natureza as NaturezaAtivo]?.label ?? natureza;
}

// Eixo 2 — Funcao Objetivo (MULTI). Sugestoes do anexo, EDITAVEIS (D004=B).
export const FUNCOES_OBJETIVO_SUGERIDAS = [
  "Modulador Hormonal",
  "Adaptogeno",
  "Termogenico/Lipolitico",
  "Neurotransmissor/Precursor",
  "Despigmentante/Antienvelhecimento",
];

// Eixo 3 — Finalidade do tratamento (MULTI). Sugestoes do anexo, EDITAVEIS.
export const FINALIDADES_SUGERIDAS = [
  "Preventiva/Profilatica",
  "Curativa",
  "Paliativa/Suporte",
  "Estetica",
];

// Unidade compartilhada da faixa de dose (min/media/max). D006=A — um seletor.
export const UNIDADES_DOSE = ["mg", "mcg", "g", "mL", "UI", "gotas", "unidade", "%"];

// Procedencia do dado (origem_dado). SEED_RASCUNHO exige validacao medica.
export const ORIGEM_DADO_LABELS: Record<string, string> = {
  OPERADOR: "Cadastrado pelo operador",
  SEED_RASCUNHO: "Rascunho (validar)",
  PLANILHA: "Importado de planilha",
  VALIDADO_MEDICO: "Validado pelo médico",
};
