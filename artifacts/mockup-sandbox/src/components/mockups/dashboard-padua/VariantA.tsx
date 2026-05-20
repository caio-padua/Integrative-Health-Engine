import { DashboardBase, type DashTheme } from "./_DashboardBase";

const themeA: DashTheme = {
  name: "Cockpit Neon",
  subtitle: "lente de porcelana",
  bg: "#0B1220", bgAlt: "#111B2E", bgDeep: "#070D18",
  ink: "#E8EEF7", inkDim: "#9FB0C9", inkMute: "#6B7E9E",
  line: "#1E2A44", lineSoft: "#172238",
  accent: "#7AA2F7", accentDeep: "#3A5BB0",
  ok: "#7CC4A0", warn: "#E0B062", danger: "#D08A8A",
  neonPrim: "#5EE6E6", neonSec: "#B58CF0", neonTer: "#E6C572",
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, sans-serif',
  gaugeStyle: "ring",
  barStyle: "hashed",
};

export function VariantA() { return <DashboardBase theme={themeA} />; }
