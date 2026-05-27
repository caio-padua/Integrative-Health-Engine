import { LayoutPawardsClaude, type PerfilPawards } from "./_pawardsClaude";

/* PAWARDS · VITRAL · admin/roxo dominante, pasteis saturados, glow místico */
const PERFIL: PerfilPawards = {
  id: "vitral",
  nome: "VITRAL",
  desc: "Vitral catedral · admin dominante · glow místico",
  bg: "#080610",
  bg2: "#0E0C18",
  bg3: "#161222",
  bg4: "#1E182C",
  border: "#2A2240",
  borderAccent: "#A89DFF55",
  t1: "#E8E0F8",
  t2: "#A898C0",
  t3: "#6A6088",
  accent: "#A89DFF",
  accent2: "#C8B8FF",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#FFA3C8",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5EE6E6", "#FFA3C8", "#C8B8FF", "#FF6088"],
  hasGlow: true,
  filter: "saturate(1.08)",
};

export default function PawardsClaude5_Vitral() {
  return <LayoutPawardsClaude perfil={PERFIL} />;
}
