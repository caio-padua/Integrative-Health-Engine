// ══════════════════════════════════════════════════════════════════════
// CRANIOTOMIA — tokens, tipos e estilos compartilhados entre a pagina
// (craniotomia.tsx) e a prancheta de loteamento (craniotomia-loteamento.tsx).
//
// Paleta = PENUMBRA face ESCURA "Navy Ciano" (valores reais dos tokens
// aprovados; ver .agents/skills/penumbra-design-system/reference/03). Nao
// inventar hex novo: tudo abaixo e copia dos tokens da face.
// ══════════════════════════════════════════════════════════════════════
import type { CSSProperties } from "react";

export const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

// PENUMBRA Navy Ciano
export const PW = {
  bg: "#020A14",
  bg2: "#061824",
  bg3: "#0A2030",
  bg4: "#0E2838",
  border: "#1A3848",
  borderNeon: "rgba(95,230,204,0.40)",
  ciano: "#5FE6CC",
  cianoGlow: "rgba(95,230,204,0.55)",
  gold: "#FFD27A",
  text: "#D8EEEE",
  t2: "#88B8BE",
  muted: "#557A82",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#D08A8A",
  rosa: "#FFA3C8",
} as const;

export type Segmento = "exame" | "formula" | "injetavel" | "implante" | "protocolo";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export const SEGMENTOS: Segmento[] = ["exame", "formula", "injetavel", "implante", "protocolo"];
export const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  exame: "EXAMES",
  formula: "FORMULAS",
  injetavel: "INJETAVEIS",
  implante: "IMPLANTES",
  protocolo: "PROTOCOLOS",
};

// Cores de dominio (pasteis-neon da face escura, ordem afinada por familia).
export const SEGMENTO_COR: Record<Segmento, string> = {
  exame: "#9CC2EA", // azul
  formula: "#7CC4A0", // verde
  injetavel: "#A89DFF", // lilas
  implante: "#FFD27A", // dourado
  protocolo: "#FFA3C8", // rosa
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "BAIXA",
  media: "MEDIA",
  alta: "ALTA",
  urgente: "URGENTE",
};

export const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: PW.muted,
  media: PW.ciano,
  alta: PW.warn,
  urgente: PW.danger,
};

// Uma sinapse persistida (linha de regras_motor).
export interface Regra {
  id: number;
  regraId: string;
  perguntaId: string;
  palavraChave: string;
  segmento: Segmento;
  codigoReferencia: string | null;
  blocoReferencia: string | null;
  prioridade: Prioridade;
  observacao: string | null;
  ativo: string; // "SIM" | "NAO"
  criadoEm: string;
  itemNome: string | null;
  itemCategoria: string | null;
}

// Pergunta de anamnese (loteamento ANAMNESE / lado SE).
export interface Pergunta {
  id: number;
  perguntaId: string;
  bloco: string;
  pergunta: string;
}

// Casa disponivel num loteamento (item terapeutico / lado ENTAO).
export interface ItemLote {
  id: number;
  codigoPadcom: string | null;
  nome: string;
  categoria: string;
  segmento: Segmento;
  disponivel: boolean;
}

export interface Loteamento {
  perguntas: Pergunta[];
  itens: ItemLote[];
}

export const inputStyle: CSSProperties = {
  width: "100%",
  background: PW.bg3,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.text,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: MONO,
  outline: "none",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: PW.muted,
  marginBottom: 4,
  fontWeight: 700,
};

// Nome do segmento de uma sinapse pode vir como "injetavel" (ja normalizado).
export function rotuloSegmento(s: Segmento): string {
  return SEGMENTO_LABEL[s] ?? String(s).toUpperCase();
}

// Chave estavel de um no SE (gatilho): pergunta + palavra-chave.
export function chaveSe(perguntaId: string, palavraChave: string): string {
  return `SE::${perguntaId}::${palavraChave}`.toUpperCase();
}

// Chave estavel de um no ENTAO (casa): segmento + codigo do item.
export function chaveEntao(segmento: Segmento, codigo: string): string {
  return `EN::${segmento}::${codigo}`.toUpperCase();
}
