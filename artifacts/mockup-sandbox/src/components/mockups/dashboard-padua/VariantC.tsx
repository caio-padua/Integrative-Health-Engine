import { DashboardBase, type DashTheme } from "./_DashboardBase";

const themeC: DashTheme = {
  name: "Med-Tech Radiante",
  subtitle: "UTI futurista",
  bg: "#061922", bgAlt: "#0A2530", bgDeep: "#03101A",
  ink: "#E4F5F2", inkDim: "#A0CCC3", inkMute: "#5B8B85",
  line: "#103440", lineSoft: "#0A2530",
  accent: "#00D4FF", accentDeep: "#0080B3",
  ok: "#4FE3A8", warn: "#FFD66E", danger: "#FF7373",
  neonPrim: "#4FE3A8", neonSec: "#00D4FF", neonTer: "#7CFFA8",
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, sans-serif',
  gaugeStyle: "tachy",
  barStyle: "segmented",
};

export function VariantC() { return <DashboardBase theme={themeC} />; }
