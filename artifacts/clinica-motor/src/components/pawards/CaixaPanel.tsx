import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { PAWARDS, fmtBRL } from "@/lib/pawards-tokens";

export interface CaixaPonto {
  data: string;
  entradas: string | number;
  saidas: string | number;
}

export interface CaixaData {
  pontos: CaixaPonto[];
  total_entradas: number;
  total_saidas: number;
  saldo: number;
}

interface Props {
  data: CaixaData | null;
}

export function CaixaPanel({ data }: Props) {
  const pontos = (data?.pontos ?? []).map((p) => ({
    data: new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    entradas: Number(p.entradas),
    saidas: Number(p.saidas),
  }));

  const saldoColor =
    (data?.saldo ?? 0) >= 0 ? PAWARDS.colors.status.good : PAWARDS.colors.status.critical;

  return (
    <div
      style={{
        background: PAWARDS.colors.bg.panel,
        borderRadius: PAWARDS.radii.panel,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: PAWARDS.shadows.panel,
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: PAWARDS.colors.text.tertiary,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Fluxo de caixa · 30 dias
        </div>
        <div
          style={{
            fontSize: 11,
            color: saldoColor,
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          saldo {fmtBRL(data?.saldo ?? 0, { compact: true })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
          fontSize: 11,
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(48,209,88,0.06)",
            border: `1px solid ${PAWARDS.colors.status.good}33`,
          }}
        >
          <div style={{ color: PAWARDS.colors.text.muted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Entradas
          </div>
          <div
            style={{
              color: PAWARDS.colors.status.good,
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {fmtBRL(data?.total_entradas ?? 0, { compact: true })}
          </div>
        </div>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(255,159,10,0.05)",
            border: `1px solid ${PAWARDS.colors.status.mid}33`,
          }}
        >
          <div style={{ color: PAWARDS.colors.text.muted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Saídas estim.
          </div>
          <div
            style={{
              color: PAWARDS.colors.status.mid,
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {fmtBRL(data?.total_saidas ?? 0, { compact: true })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 200 }}>
        <ResponsiveContainer>
          <BarChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="data"
              stroke={PAWARDS.colors.text.muted}
              fontSize={10}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={PAWARDS.colors.text.muted}
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: PAWARDS.colors.bg[800],
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: PAWARDS.colors.text.primary,
                fontSize: 12,
              }}
              formatter={(v: any) => fmtBRL(v, { compact: true })}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: PAWARDS.colors.text.tertiary }} iconSize={8} />
            <Bar dataKey="entradas" name="Entradas" fill={PAWARDS.colors.status.good} radius={[3, 3, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill={PAWARDS.colors.status.mid} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
