// ══════════════════════════════════════════════════════════════════════
// PENUMBRA face CLARA "Paper Ciano" — tokens compartilhados para as telas
// operacionais em modo claro. Espelha as CHAVES de craniotomia-shared (face
// escura) para permitir troca de import sem reescrever o corpo das telas.
//
// Valores = PERFIL_PAPER_CIANO (mockup-sandbox/.../_perfisPenumbra.ts),
// aprovado por Caio (27/05/2026). NAO inventar hex novo.
// ══════════════════════════════════════════════════════════════════════
import type { CSSProperties } from "react";

export const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

// PENUMBRA Paper Ciano (claro)
export const PW = {
  bg: "#EEF2F4",
  bg2: "#F8FBFC",
  bg3: "#E2E8EC",
  bg4: "#D2DCE0",
  border: "#B8C4CA",
  borderNeon: "rgba(30,122,110,0.40)",
  ciano: "#1E7A6E",
  cianoGlow: "rgba(30,122,110,0.28)",
  gold: "#9C6E16",
  text: "#0F1A1F",
  t2: "#3F5258",
  muted: "#6E8088",
  ok: "#1E7A6E",
  warn: "#9C6E16",
  danger: "#8A2A2A",
  rosa: "#8A3F5C",
  azul: "#2E5C92",
  verde: "#3F6E3F",
  lilas: "#5A4A82",
} as const;

export const inputStyle: CSSProperties = {
  width: "100%",
  background: PW.bg2,
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
