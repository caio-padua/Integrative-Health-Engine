import { PAWARDS, getBand } from "@/lib/pawards-tokens";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  meta?: number;
  realizado?: number;
  delta?: string;
  deltaPositive?: boolean;
  digital?: boolean;
  hint?: string;
}

export function KpiCard({ label, value, meta, realizado, delta, deltaPositive, digital, hint }: KpiCardProps) {
  const pct =
    meta && realizado !== undefined && meta > 0 ? Math.round((realizado / meta) * 100) : null;
  const band = pct !== null ? getBand(pct) : null;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0B1018 0%, #06090F 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: PAWARDS.radii.panel,
        boxShadow: PAWARDS.shadows.panel,
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
        minHeight: 120,
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "40%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: 10, letterSpacing: "0.12em",
          color: PAWARDS.colors.text.muted,
          fontWeight: 600, marginBottom: 8, textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: digital ? 30 : 28, fontWeight: 700,
          color: digital ? PAWARDS.colors.digital.amber : PAWARDS.colors.text.primary,
          letterSpacing: digital ? "0.04em" : "-0.02em",
          lineHeight: 1,
          textShadow: digital ? `0 0 12px ${PAWARDS.colors.digital.amber}55` : "none",
          fontFamily: digital ? "ui-monospace, SFMono-Regular, monospace" : "inherit",
          marginBottom: 10,
        }}
      >
        {value}
      </div>

      {pct !== null && band && (
        <>
          <div
            style={{
              height: 6, borderRadius: 999, overflow: "hidden",
              background: "rgba(255,255,255,0.06)", marginBottom: 6,
            }}
          >
            <div
              style={{
                width: `${Math.min(pct, 100)}%`,
                height: "100%",
                background: band.color,
                boxShadow: `0 0 8px ${band.glow}`,
                borderRadius: 999,
                transition: "width 0.8s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary }}>
            {pct}% da meta
            {delta && (
              <span
                style={{
                  color: deltaPositive ? PAWARDS.colors.status.good : PAWARDS.colors.status.critical,
                  marginLeft: 8,
                }}
              >
                {delta}
              </span>
            )}
          </div>
        </>
      )}

      {hint && !pct && (
        <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}
