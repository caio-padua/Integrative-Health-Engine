import { PAWARDS, fmtBRL } from "@/lib/pawards-tokens";

interface RankingItem {
  id: number;
  nome: string;
  nick?: string;
  fat_realizado_mes: number | string;
  fat_meta_mensal: number | string;
  fat_minimo_mensal: number | string;
  fat_maximo_mensal: number | string;
  pct_meta: number | string | null;
  consultas_mes?: number;
  receitas_fama_mes?: number;
}

interface Props {
  items: RankingItem[];
}

function bandColor(pct: number) {
  if (pct >= 90) return "#0A84FF";
  if (pct >= 67) return "#34C759";
  if (pct >= 50) return "#FF9F0A";
  if (pct >= 33) return "#FFD60A";
  return "#FF3B30";
}

export function RankingClinicas({ items }: Props) {
  return (
    <div
      style={{
        background: PAWARDS.colors.bg.panel,
        borderRadius: PAWARDS.radii.panel,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: PAWARDS.shadows.panel,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 10, letterSpacing: "0.12em",
          color: PAWARDS.colors.text.tertiary, fontWeight: 600, marginBottom: 18,
          textTransform: "uppercase",
        }}
      >
        Ranking de clínicas — faturamento do mês
      </div>

      {items.length === 0 && (
        <div style={{ color: PAWARDS.colors.text.muted, fontSize: 13 }}>
          Sem clínicas com meta cadastrada.
        </div>
      )}

      {items.map((c, i) => {
        const pct = Number(c.pct_meta ?? 0);
        const realizado = Number(c.fat_realizado_mes);
        const meta = Number(c.fat_meta_mensal);
        const min = Number(c.fat_minimo_mensal);
        const max = Number(c.fat_maximo_mensal);
        const color = bandColor(pct);
        return (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 110px 60px",
              alignItems: "center",
              gap: 14, marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 13, fontWeight: 700,
                color: i === 0 ? PAWARDS.colors.gold[500] : PAWARDS.colors.text.tertiary,
              }}
            >
              #{i + 1}
            </div>

            <div>
              <div
                style={{
                  fontSize: 13, fontWeight: 600,
                  color: PAWARDS.colors.text.primary, marginBottom: 5,
                  letterSpacing: 0.2,
                }}
              >
                {c.nick || c.nome}
              </div>

              {/* barra com marcadores mín/meta/máx */}
              <div style={{ position: "relative", height: 8 }}>
                <div
                  style={{
                    position: "absolute", inset: 0, borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
                <div
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${Math.min(pct, 100)}%`,
                    background: color, borderRadius: 999,
                    boxShadow: `0 0 8px ${color}55`,
                    transition: "width 1s ease",
                  }}
                />
                {/* marker mín */}
                {meta > 0 && min > 0 && (
                  <div
                    title={`Mín ${fmtBRL(min, { compact: true })}`}
                    style={{
                      position: "absolute",
                      left: `${Math.min((min / Math.max(max, meta)) * 100, 100)}%`,
                      top: -2, bottom: -2, width: 1.5,
                      background: "rgba(255,255,255,0.35)",
                    }}
                  />
                )}
                {/* marker meta */}
                {meta > 0 && (
                  <div
                    title={`Meta ${fmtBRL(meta, { compact: true })}`}
                    style={{
                      position: "absolute",
                      left: `${Math.min((meta / Math.max(max, meta)) * 100, 100)}%`,
                      top: -3, bottom: -3, width: 2,
                      background: PAWARDS.colors.gold[500],
                      boxShadow: `0 0 4px ${PAWARDS.colors.gold[500]}`,
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 10, color: PAWARDS.colors.text.muted, marginTop: 4,
                }}
              >
                <span>mín {fmtBRL(min, { compact: true })}</span>
                <span style={{ color: PAWARDS.colors.gold[300] }}>
                  meta {fmtBRL(meta, { compact: true })}
                </span>
                <span>máx {fmtBRL(max, { compact: true })}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: PAWARDS.colors.text.secondary,
                textAlign: "right",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {fmtBRL(realizado, { compact: true })}
            </div>
            <div
              style={{
                fontSize: 12,
                color,
                textAlign: "right",
                fontWeight: 700,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {pct.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
