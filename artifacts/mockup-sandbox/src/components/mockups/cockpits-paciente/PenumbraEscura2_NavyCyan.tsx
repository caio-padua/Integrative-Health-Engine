import { LayoutPawardsPenumbra, type PerfilPenumbra } from "./_pawardsPenumbra";

const PERFIL: PerfilPenumbra = {
  id: "esc-navy-cyan",
  nome: "PENUMBRA NAVY CIANO",
  desc: "Escuro navy · accent ciano clínica · respiração pulsátil",
  modoClaro: false,
  bg: "#020A14",
  bg2: "#061824",
  bg3: "#0A2030",
  bg4: "#0E2838",
  border: "#1A3848",
  borderAccent: "#5FE6CC66",
  t1: "#D8EEEE",
  t2: "#88B8BE",
  t3: "#557A82",
  accent: "#5FE6CC",
  accent2: "#5ee6e6",
  accentGlow: "rgba(95,230,204,0.55)",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#d08a8a",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5ee6e6", "#FFA3C8", "#7cc4a0", "#d08a8a"],
};

export default function PenumbraEscura2_NavyCyan() {
  return <LayoutPawardsPenumbra perfil={PERFIL} />;
}
