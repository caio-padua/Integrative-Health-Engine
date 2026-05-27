import { LayoutPawardsPenumbra, type PerfilPenumbra } from "./_pawardsPenumbra";

/* PAPEL claro azulado · accent teal escuro com glow ciano visível */
const PERFIL: PerfilPenumbra = {
  id: "cla-paper-ciano",
  nome: "PENUMBRA PAPEL CIANO",
  desc: "Claro azulado · accent teal escuro · respiração ciano",
  modoClaro: true,
  bg: "#EEF2F4",
  bg2: "#F8FBFC",
  bg3: "#E2E8EC",
  bg4: "#D2DCE0",
  border: "#B8C4CA",
  borderAccent: "#2A8A7C77",
  t1: "#0F1A1F",
  t2: "#3F5258",
  t3: "#6E8088",
  accent: "#1E7A6E",
  accent2: "#2A9D8F",
  accentGlow: "rgba(30,122,110,0.45)",
  ok: "#1E7A6E",
  warn: "#9C6E16",
  danger: "#8A2A2A",
  doms: ["#9C6E16", "#2E5C92", "#1E7A6E", "#5A4A82", "#2A9D8F", "#8A3F5C", "#3F6E3F", "#8A3F3F"],
};

export default function PenumbraClara2_PaperCiano() {
  return <LayoutPawardsPenumbra perfil={PERFIL} />;
}
