import { LayoutPawardsPenumbra, type PerfilPenumbra } from "./_pawardsPenumbra";

/* PAPEL claro · gold deep âmbar com glow visível mesmo em fundo claro */
const PERFIL: PerfilPenumbra = {
  id: "cla-papel-gold",
  nome: "PENUMBRA PAPEL GOLD",
  desc: "Claro papel · accent gold âmbar · respiração visível",
  modoClaro: true,
  bg: "#F4EFE5",
  bg2: "#FBF7EE",
  bg3: "#EEE6D4",
  bg4: "#E2D6BC",
  border: "#CFC1A4",
  borderAccent: "#8A6A2877",
  t1: "#1F1810",
  t2: "#52473A",
  t3: "#8A7E6E",
  accent: "#8a6a26",
  accent2: "#a0822f",
  accentGlow: "rgba(138,106,38,0.45)",
  ok: "#3F6E3F",
  warn: "#9C6E16",
  danger: "#8A2A2A",
  doms: ["#9C6E16", "#2E5C92", "#1E6E5C", "#5A4A82", "#3F6E3F", "#8A3F5C", "#5A4A92", "#8A3F3F"],
};

export default function PenumbraClara1_PapelGold() {
  return <LayoutPawardsPenumbra perfil={PERFIL} />;
}
