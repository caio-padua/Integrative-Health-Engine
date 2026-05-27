import { LayoutPawardsClaude, type PerfilPawards } from "./_pawardsClaude";

/* PAWARDS · PERGAMINHO · fundo claro, sem glow, conforto de livro médico */
const PERFIL: PerfilPawards = {
  id: "pergaminho",
  nome: "PERGAMINHO",
  desc: "Livro médico · fundo claro · sem glow",
  bg: "#F8F2E8",
  bg2: "#FFFBF4",
  bg3: "#F0E8DA",
  bg4: "#E8DCC8",
  border: "#D0C4AE",
  borderAccent: "#8A6A2855",
  t1: "#2A2018",
  t2: "#5A4E3E",
  t3: "#8A7E6E",
  accent: "#8a6a26",
  accent2: "#a0822f",
  ok: "#4A7A4A",
  warn: "#A07A20",
  danger: "#8A3030",
  doms: ["#A07A20", "#3A6A9A", "#2A7A6A", "#6A5A8A", "#4A7A4A", "#9A4A6A", "#6A5A9A", "#9A4A4A"],
  hasGlow: false,
  filter: "none",
};

export default function PawardsClaude3_Pergaminho() {
  return <LayoutPawardsClaude perfil={PERFIL} />;
}
