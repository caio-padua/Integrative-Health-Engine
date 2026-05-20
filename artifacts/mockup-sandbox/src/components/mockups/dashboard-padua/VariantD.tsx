import { DashboardBase, type DashTheme } from "./_DashboardBase";

const themeD: DashTheme = {
  name: "Bloomberg Rubi",
  subtitle: "terminal executivo",
  bg: "#0A0A0F", bgAlt: "#15131A", bgDeep: "#050508",
  ink: "#F0EBED", inkDim: "#B8A8B0", inkMute: "#7A6B75",
  line: "#2A1E26", lineSoft: "#181016",
  accent: "#E14B6A", accentDeep: "#8B2840",
  ok: "#9DCCA0", warn: "#E8B070", danger: "#FF4787",
  neonPrim: "#FF4787", neonSec: "#E14B6A", neonTer: "#FFB347",
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, sans-serif',
  gaugeStyle: "ring",
  barStyle: "segmented",
};

export function VariantD() { return <DashboardBase theme={themeD} />; }
