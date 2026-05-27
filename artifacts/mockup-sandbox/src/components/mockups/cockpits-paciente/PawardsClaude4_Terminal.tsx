import { LayoutPawardsClaude, type PerfilPawards } from "./_pawardsClaude";

/* PAWARDS · TERMINAL · hiperfoco IDE, cyan vivo, densidade máxima */
const PERFIL: PerfilPawards = {
  id: "terminal",
  nome: "TERMINAL",
  desc: "Hiperfoco IDE · cyan vivo · zero decoração",
  bg: "#000000",
  bg2: "#080808",
  bg3: "#101010",
  bg4: "#181818",
  border: "#2A2A2A",
  borderAccent: "#5EE6E655",
  t1: "#5EE6E6",
  t2: "#3aa0a0",
  t3: "#1f6060",
  accent: "#5EE6E6",
  accent2: "#A0F0F0",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#FF6044",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5EE6E6", "#FFA3C8", "#7cc4a0", "#FF6044"],
  hasGlow: true,
  filter: "none",
};

export default function PawardsClaude4_Terminal() {
  return <LayoutPawardsClaude perfil={PERFIL} />;
}
