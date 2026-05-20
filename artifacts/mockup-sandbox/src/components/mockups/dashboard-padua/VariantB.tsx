import { DashboardBase, type DashTheme } from "./_DashboardBase";

const themeB: DashTheme = {
  name: "Concierge Dourado",
  subtitle: "acabamento Rolex",
  bg: "#14110C", bgAlt: "#1F1A12", bgDeep: "#0A0805",
  ink: "#F4ECDB", inkDim: "#C2B49A", inkMute: "#8B7E65",
  line: "#3A2F1E", lineSoft: "#26200F",
  accent: "#D4AF37", accentDeep: "#8B6B14",
  ok: "#A8BF8E", warn: "#E6B873", danger: "#C97C5E",
  neonPrim: "#FFD27A", neonSec: "#E6A14D", neonTer: "#FFF1B8",
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, sans-serif',
  gaugeStyle: "fan",
  barStyle: "smooth",
};

export function VariantB() { return <DashboardBase theme={themeB} />; }
