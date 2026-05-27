import { LayoutPawardsClaude, type PerfilPawards } from "./_pawardsClaude";

/* PAWARDS · RELOJOARIA · gold dominante, hover neon, densidade Claude */
const PERFIL: PerfilPawards = {
  id: "relojoaria",
  nome: "RELOJOARIA",
  desc: "Swiss precision · navy + gold · glow neon",
  bg: "#000204",
  bg2: "#0A1628",
  bg3: "#0F1E36",
  bg4: "#172238",
  border: "#1A2D4F",
  borderAccent: "#C89B3C55",
  t1: "#E8EEF7",
  t2: "#9FB0C9",
  t3: "#6B7E9E",
  accent: "#C89B3C",
  accent2: "#e6c572",
  ok: "#7cc4a0",
  warn: "#e0b062",
  danger: "#d08a8a",
  doms: ["#C89B3C", "#9CC2EA", "#5FE6CC", "#A89DFF", "#FFD27A", "#FFA3C8", "#7cc4a0", "#d08a8a"],
  hasGlow: true,
  filter: "none",
};

export default function PawardsClaude1_Relojoaria() {
  return <LayoutPawardsClaude perfil={PERFIL} />;
}
