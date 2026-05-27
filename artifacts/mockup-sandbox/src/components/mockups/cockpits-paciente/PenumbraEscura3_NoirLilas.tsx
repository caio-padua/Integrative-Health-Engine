import { LayoutPawardsPenumbra, type PerfilPenumbra } from "./_pawardsPenumbra";

const PERFIL: PerfilPenumbra = {
  id: "esc-noir-lilas",
  nome: "PENUMBRA NOIR LILÁS",
  desc: "Escuro noir · accent admin lilás · respiração pulsátil",
  modoClaro: false,
  bg: "#080610",
  bg2: "#0E0C18",
  bg3: "#161222",
  bg4: "#1E182C",
  border: "#2A2240",
  borderAccent: "#A89DFF66",
  t1: "#E8E0F8",
  t2: "#A898C0",
  t3: "#6A6088",
  accent: "#A89DFF",
  accent2: "#C8B8FF",
  accentGlow: "rgba(168,157,255,0.55)",
  ok: "#5FE6CC",
  warn: "#FFD27A",
  danger: "#FFA3C8",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5EE6E6", "#FFA3C8", "#C8B8FF", "#FF6088"],
};

export default function PenumbraEscura3_NoirLilas() {
  return <LayoutPawardsPenumbra perfil={PERFIL} />;
}
