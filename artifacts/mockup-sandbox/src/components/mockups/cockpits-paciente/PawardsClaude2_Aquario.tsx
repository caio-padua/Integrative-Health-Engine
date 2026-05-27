import { LayoutPawardsClaude, type PerfilPawards } from "./_pawardsClaude";

/* PAWARDS · AQUÁRIO · cyan/clínica dominante, ar maior, glow forte */
const PERFIL: PerfilPawards = {
  id: "aquario",
  nome: "AQUÁRIO",
  desc: "Deep sea · cyan dominante · respiração maior",
  bg: "#020A14",
  bg2: "#061824",
  bg3: "#0A2030",
  bg4: "#0E2838",
  border: "#1A3848",
  borderAccent: "#5FE6CC44",
  t1: "#D0E8E8",
  t2: "#80B0B8",
  t3: "#507880",
  accent: "#5FE6CC",
  accent2: "#5ee6e6",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#d08a8a",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5ee6e6", "#FFA3C8", "#7cc4a0", "#d08a8a"],
  hasGlow: true,
  filter: "saturate(0.95)",
};

export default function PawardsClaude2_Aquario() {
  return <LayoutPawardsClaude perfil={PERFIL} />;
}
