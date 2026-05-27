import { LayoutPawardsPenumbra, type PerfilPenumbra } from "./_pawardsPenumbra";

/* PAPEL claro lilás · accent admin escuro com glow violeta visível */
const PERFIL: PerfilPenumbra = {
  id: "cla-paper-lilas",
  nome: "PENUMBRA PAPEL LILÁS",
  desc: "Claro lilás · accent violeta · respiração admin",
  modoClaro: true,
  bg: "#EFEDF6",
  bg2: "#F8F6FC",
  bg3: "#E2DEEE",
  bg4: "#D0CAE0",
  border: "#B4ABCC",
  borderAccent: "#5B47B077",
  t1: "#161028",
  t2: "#453A66",
  t3: "#766A92",
  accent: "#5B47B0",
  accent2: "#7A66C8",
  accentGlow: "rgba(91,71,176,0.45)",
  ok: "#2E7A52",
  warn: "#9C6E16",
  danger: "#A23A6A",
  doms: ["#9C6E16", "#2E5C92", "#2E7A6A", "#5B47B0", "#3F6E3F", "#A23A6A", "#7A66C8", "#8A3F3F"],
};

export default function PenumbraClara3_PaperLilas() {
  return <LayoutPawardsPenumbra perfil={PERFIL} />;
}
