// Banner sináptico universal — Caio (CEO) TDAH-friendly.
// Plugue no topo de qualquer dashboard premium e ele renderiza:
//   • 1 a 4 relógios percentuais (donut SVG com glow)
//   • N barras horizontais animadas
//   • Layout deep navy #0B1220 + JetBrains Mono uppercase + border-left neon
// Render condicional: só pinta sessão que tiver dado.

import type { ReactNode } from "react";
import { RelogioPercentual } from "./RelogioPercentual";
import { BarraSinaptica } from "./BarraSinaptica";

export interface RelogioConfig {
  label: string;
  sublabel?: string;
  valor: number;
  total?: number;
  cor?: string;
  formato?: "percentual" | "absoluto";
}

export interface BarraConfig {
  label: string;
  valor: number;
  total: number;
  cor?: string;
  sufixo?: string;
  destaque?: string;
}

export interface PainelSinapticoBannerProps {
  titulo: string;
  subtitulo?: string;
  relogios?: RelogioConfig[];
  barras?: BarraConfig[];
  acoes?: ReactNode;
  corAcento?: string;
}

const tk = {
  bg: "#0B1220",
  bgSoft: "#101B2E",
  border: "#1F2D49",
  ink: "#E8EEF7",
  inkMuted: "#9AA9C2",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export function PainelSinapticoBanner({
  titulo,
  subtitulo,
  relogios = [],
  barras = [],
  acoes,
  corAcento = "#5EE6E6",
}: PainelSinapticoBannerProps) {
  const temRelogios = relogios.length > 0;
  const temBarras = barras.length > 0;
  if (!temRelogios && !temBarras) return null;

  return (
    <div
      style={{
        background: tk.bg,
        border: `1px solid ${tk.border}`,
        borderLeft: `3px solid ${corAcento}`,
        padding: 20,
        marginBottom: 24,
        fontFamily: tk.mono,
        color: tk.ink,
      }}
      data-testid="painel-sinaptico-banner"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: corAcento,
              marginBottom: 4,
            }}
          >
            {titulo}
          </div>
          {subtitulo && (
            <div style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1 }}>
              {subtitulo}
            </div>
          )}
        </div>
        {acoes && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{acoes}</div>}
      </div>

      {temRelogios && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`,
            gap: 12,
            marginBottom: temBarras ? 20 : 0,
          }}
        >
          {relogios.map((r, i) => (
            <div
              key={i}
              style={{
                background: tk.bgSoft,
                border: `1px solid ${tk.border}`,
                padding: 12,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <RelogioPercentual
                label={r.label}
                sublabel={r.sublabel}
                valor={r.valor}
                total={r.total ?? 100}
                cor={r.cor ?? corAcento}
                tamanho={108}
                formato={r.formato ?? "percentual"}
              />
            </div>
          ))}
        </div>
      )}

      {temBarras && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {barras.map((b, i) => (
            <BarraSinaptica
              key={i}
              label={b.label}
              valor={b.valor}
              total={b.total}
              cor={b.cor ?? corAcento}
              sufixo={b.sufixo}
              destaque={b.destaque}
            />
          ))}
        </div>
      )}
    </div>
  );
}
