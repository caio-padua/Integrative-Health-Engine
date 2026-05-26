export const palette = {
  navy: "#020406",
  navyDeep: "#000204",
  navyPanel: "#0a1628",
  navyPanelAlt: "#0f1e36",
  navyTopBar: "#0e1b30",
  border: "#1a2d4f",
  borderSoft: "#172238",
  gold: "#C89B3C",
  goldSoft: "#e6c572",
  goldDeep: "#8a6a26",
  cyan: "#5ee6e6",
  cyanDim: "#3aa0a0",
  ink: "#e8eef7",
  inkDim: "#9fb0c9",
  inkMute: "#6b7e9e",
  ok: "#7cc4a0",
  warn: "#e0b062",
  danger: "#d08a8a",
};

export const pasteis = {
  admin: { pastel: "#6B5BD6", neon: "#A89DFF", glow: "rgba(168,157,255,0.45)", soft: "rgba(168,157,255,0.08)", softBorder: "rgba(168,157,255,0.28)" },
  clinica: { pastel: "#2FA38F", neon: "#5FE6CC", glow: "rgba(95,230,204,0.45)", soft: "rgba(95,230,204,0.08)", softBorder: "rgba(95,230,204,0.28)" },
  financeiro: { pastel: "#C89B3C", neon: "#FFD27A", glow: "rgba(255,210,122,0.45)", soft: "rgba(255,210,122,0.08)", softBorder: "rgba(255,210,122,0.28)" },
  catalogos: { pastel: "#B0688C", neon: "#FFA3C8", glow: "rgba(255,163,200,0.45)", soft: "rgba(255,163,200,0.08)", softBorder: "rgba(255,163,200,0.28)" },
  sistema: { pastel: "#5E7A99", neon: "#9CC2EA", glow: "rgba(156,194,234,0.45)", soft: "rgba(156,194,234,0.08)", softBorder: "rgba(156,194,234,0.28)" },
} as const;

export type GrupoChave = keyof typeof pasteis;

export const fontes = {
  jetbrains: { familia: "'JetBrains Mono', ui-monospace, monospace", rotulo: "JETBRAINS MONO", carater: "MONO TÉCNICA · A ATUAL" },
  ibmplex:   { familia: "'IBM Plex Mono', ui-monospace, monospace", rotulo: "IBM PLEX MONO",   carater: "MONO INSTITUCIONAL · IBM CORPORATE" },
  space:     { familia: "'Space Grotesk', system-ui, sans-serif",    rotulo: "SPACE GROTESK",   carater: "SANS GEOMÉTRICA · RESPIRA MAIS" },
  inter:     { familia: "'Inter', system-ui, sans-serif",             rotulo: "INTER",            carater: "SANS UI MODERNA · PADRÃO INDÚSTRIA" },
  serif:     { familia: "'Source Serif 4', 'EB Garamond', serif",     rotulo: "SOURCE SERIF 4",   carater: "SERIF CLÁSSICA · DOCUMENTO JURÍDICO" },
} as const;

export type FonteChave = keyof typeof fontes;

/**
 * Pulse do submenu ativo.
 * Opção (c) afinada: pulsa com COR DO PAI (pertencimento) + HALO DOURADO sobreposto
 * (vínculo com o padrão universal "você-está-aqui").
 * Animar box-shadow + background-color, NUNCA opacity (perde contraste TOC-friendly).
 */
export const pulseCss = `
@keyframes pawards-respira {
  0% {
    box-shadow:
      0 0 8px var(--respira-cor-fraca),
      0 0 4px rgba(200,155,60,0.30),
      inset 0 0 0 1px var(--respira-cor-forte);
    background-color: var(--respira-fundo-min);
  }
  50% {
    box-shadow:
      0 0 24px var(--respira-cor-forte),
      0 0 14px rgba(200,155,60,0.70),
      inset 0 0 0 1px var(--respira-cor-forte);
    background-color: var(--respira-fundo-max);
  }
  100% {
    box-shadow:
      0 0 8px var(--respira-cor-fraca),
      0 0 4px rgba(200,155,60,0.30),
      inset 0 0 0 1px var(--respira-cor-forte);
    background-color: var(--respira-fundo-min);
  }
}
.pawards-respira { animation: pawards-respira 6s ease-in-out infinite; }

@keyframes pawards-piscar-suave {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
.pawards-piscar { animation: pawards-piscar-suave 4s ease-in-out infinite; }
`;
