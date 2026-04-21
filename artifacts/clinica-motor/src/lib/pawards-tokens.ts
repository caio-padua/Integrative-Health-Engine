// PAWARDS MEDCORE — design tokens.
// Visual: dark navy + ouro escovado. Fonte: Inter / monospace digital amber.

export const PAWARDS = {
  colors: {
    bg: {
      950: "#020406",
      925: "#04070B",
      900: "#05070B",
      850: "#0A0F17",
      800: "#101720",
      panel: "#0B1018",
      panelAlt: "#101720",
    },
    gold: {
      100: "#F7E7B2",
      300: "#E5C160",
      500: "#C89B3C",
      700: "#A97822",
      bright: "#E2C470",
    },
    text: {
      primary: "#F5F7FA",
      secondary: "#AAB4C3",
      tertiary: "#7F8A99",
      muted: "#5E6773",
    },
    status: {
      critical: "#FF3B30",
      low: "#FFD60A",
      mid: "#FF9F0A",
      good: "#34C759",
      excellent: "#0A84FF",
      offline: "#FF453A",
      warning: "#FFB340",
      online: "#30D158",
      syncing: "#5AC8FA",
    },
    digital: {
      green: "#8FFF6A",
      amber: "#FFC948",
      red: "#FF6D57",
      blue: "#67B5FF",
      white: "#F3F8FF",
    },
  },
  shadows: {
    panel:
      "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.42), 0 12px 28px rgba(0,0,0,0.42)",
    blackPiano:
      "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 18px rgba(0,0,0,0.28), 0 10px 24px rgba(0,0,0,0.48)",
    glowGold: "0 0 18px rgba(200,155,60,0.20)",
    glowGreen: "0 0 16px rgba(52,199,89,0.24)",
    glowBlue: "0 0 16px rgba(10,132,255,0.22)",
    glowRed: "0 0 14px rgba(255,59,48,0.20)",
  },
  radii: { panel: "18px", panelSm: "14px", pill: "999px" },
} as const;

export const STATUS_BANDS = {
  critical: { color: "#FF3B30", glow: "rgba(255,59,48,0.22)", label: "CRÍTICO", min: 0, max: 32 },
  low: { color: "#FFD60A", glow: "rgba(255,214,10,0.18)", label: "INFERIOR", min: 33, max: 49 },
  mid: { color: "#FF9F0A", glow: "rgba(255,159,10,0.20)", label: "MÉDIO", min: 50, max: 66 },
  good: { color: "#34C759", glow: "rgba(52,199,89,0.20)", label: "SUPERIOR", min: 67, max: 89 },
  excellent: { color: "#0A84FF", glow: "rgba(10,132,255,0.20)", label: "EXCELENTE", min: 90, max: 9999 },
} as const;

export type Band = (typeof STATUS_BANDS)[keyof typeof STATUS_BANDS];

export function getBand(value: number): Band {
  return (
    Object.values(STATUS_BANDS).find((b) => value >= b.min && value <= b.max) ??
    STATUS_BANDS.mid
  );
}

export function fmtBRL(v: number | string | null | undefined, opts?: { compact?: boolean }) {
  const n = Number(v ?? 0);
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
    return `R$ ${n.toFixed(0)}`;
  }
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function fmtInt(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR");
}

export function fmtPct(v: number | string | null | undefined, decimals = 0) {
  return `${Number(v ?? 0).toFixed(decimals)}%`;
}
