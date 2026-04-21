import { PAWARDS, fmtBRL } from "@/lib/pawards-tokens";

export interface AlertasData {
  clinicas_abaixo_minimo: Array<{
    id: number;
    unidade: string;
    minimo: string | number;
    realizado: string | number;
    pct_minimo: string | number | null;
  }>;
  kpis_fora_faixa: Array<{
    id: number;
    unidade: string;
    valor: string | number;
    limite: string | number;
    kpi: string;
    label: string;
    unidade_medida?: string;
  }>;
  pendencias: Array<{
    id: number;
    modulo: string;
    criticidade: string;
    titulo: string;
  }>;
  total: number;
}

interface Props {
  data: AlertasData | null;
}

function critColor(c: string) {
  switch (c) {
    case "critica": return PAWARDS.colors.status.critical;
    case "alta":    return PAWARDS.colors.status.mid;
    case "media":   return PAWARDS.colors.status.warning;
    default:        return PAWARDS.colors.text.tertiary;
  }
}

function Linha({
  cor,
  titulo,
  detalhe,
  metrica,
}: {
  cor: string;
  titulo: string;
  detalhe: string;
  metrica: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        borderLeft: `3px solid ${cor}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: PAWARDS.colors.text.primary,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {titulo}
        </div>
        <div
          style={{
            fontSize: 10,
            color: PAWARDS.colors.text.muted,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {detalhe}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
          fontWeight: 700,
          color: cor,
        }}
      >
        {metrica}
      </div>
    </div>
  );
}

function Secao({ titulo, children, count }: { titulo: string; children: React.ReactNode; count: number }) {
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          color: PAWARDS.colors.text.muted,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {titulo} · {count}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

export function AlertasPanel({ data }: Props) {
  const total = data?.total ?? 0;
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
          marginBottom: 14,
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
          Alertas
        </div>
        <div
          style={{
            fontSize: 11,
            color: total > 0 ? PAWARDS.colors.status.critical : PAWARDS.colors.status.good,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {total > 0 ? `${total} ativos` : "tudo ok"}
        </div>
      </div>

      <div style={{ overflowY: "auto", maxHeight: 320, paddingRight: 4 }}>
        {total === 0 && (
          <div style={{ color: PAWARDS.colors.text.muted, fontSize: 12 }}>
            Nenhum alerta no momento.
          </div>
        )}

        <Secao titulo="Clínicas abaixo do mínimo" count={data?.clinicas_abaixo_minimo.length ?? 0}>
          {data?.clinicas_abaixo_minimo.map((c) => (
            <Linha
              key={`min-${c.id}`}
              cor={PAWARDS.colors.status.critical}
              titulo={c.unidade}
              detalhe={`realizado ${fmtBRL(c.realizado, { compact: true })} de ${fmtBRL(c.minimo, { compact: true })} mín`}
              metrica={`${Number(c.pct_minimo ?? 0).toFixed(0)}%`}
            />
          ))}
        </Secao>

        <Secao titulo="KPIs fora da faixa" count={data?.kpis_fora_faixa.length ?? 0}>
          {data?.kpis_fora_faixa.map((k, i) => (
            <Linha
              key={`kpi-${k.kpi}-${k.id}-${i}`}
              cor={PAWARDS.colors.status.mid}
              titulo={`${k.unidade} · ${k.label}`}
              detalhe={`limite mínimo ${k.limite}${k.unidade_medida ? ` ${k.unidade_medida}` : ""}`}
              metrica={`${k.valor}${k.unidade_medida ? ` ${k.unidade_medida}` : ""}`}
            />
          ))}
        </Secao>

        <Secao titulo="Pendências operacionais" count={data?.pendencias.length ?? 0}>
          {data?.pendencias.map((p) => (
            <Linha
              key={`pen-${p.id}`}
              cor={critColor(p.criticidade)}
              titulo={p.titulo}
              detalhe={`${p.modulo}`}
              metrica={p.criticidade}
            />
          ))}
        </Secao>
      </div>
    </div>
  );
}
