import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutPawards } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";

const fmt = (v: any) =>
  v == null
    ? "—"
    : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COR: Record<string, string> = {
  pendente:      "#FFD27A",
  pago:          "#5FE6CC",
  inadimplente:  "#d08a8a",
  cancelado:     "#88B8BE",
};

function fmtData(v: any) {
  if (!v) return "—";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AdminCobrancasPage() {
  const hoje = new Date();
  const competenciaAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [competencia, setCompetencia] = useState(competenciaAtual);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["cobrancas-modulos", competencia],
    queryFn: () =>
      apiFetch(`/api/cobrancas-modulos?competencia=${competencia}`, { credentials: "include" }).then((r) => r.json()),
  });

  const totalPago = data.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const totalPendente = data.filter((r) => r.status === "pendente").reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const totalInadimplente = data.filter((r) => r.status === "inadimplente").reduce((s, r) => s + Number(r.valor ?? 0), 0);

  return (
    <LayoutPawards>
      <div style={{ padding: "24px 28px", fontFamily: "'JetBrains Mono', monospace" }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#5FE6CC", textTransform: "uppercase", margin: 0 }}>
            COBRANÇAS MENSAIS DE MÓDULOS
          </h1>
          <p style={{ fontSize: 11, color: "#88B8BE", margin: "4px 0 0" }}>
            Registros da tabela cobrancas_mensais_modulos — cobrança por empresa e módulo ativo.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "#88B8BE", letterSpacing: 1 }}>COMPETÊNCIA</label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            style={{
              background: "#0A2030", border: "1px solid #1A3848", color: "#D8EEEE",
              padding: "4px 10px", fontSize: 11, fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 10, color: "#88B8BE" }}>{data.length} registros</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "PAGO", valor: totalPago, cor: "#5FE6CC" },
            { label: "PENDENTE", valor: totalPendente, cor: "#FFD27A" },
            { label: "INADIMPLENTE", valor: totalInadimplente, cor: "#d08a8a" },
          ].map((card) => (
            <div key={card.label} style={{ background: "#0A2030", border: `1px solid ${card.cor}40`, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: card.cor, textTransform: "uppercase" }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.cor, marginTop: 4 }}>{fmt(card.valor)}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ color: "#88B8BE", fontSize: 12 }}>Carregando cobranças...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#0A2030" }}>
                  {["Empresa", "Módulo", "Competência", "Valor", "Status", "Vencimento", "Pago em"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", color: "#88B8BE", borderBottom: "1px solid #1A3848", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#88B8BE" }}>
                      Nenhuma cobrança nesta competência.
                    </td>
                  </tr>
                ) : data.map((row, idx) => {
                  const cor = STATUS_COR[row.status] ?? "#88B8BE";
                  return (
                    <tr key={row.id} style={{ background: idx % 2 === 0 ? "#061824" : "#0A2030" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#D8EEEE" }}>{row.empresa_nome}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848" }}>
                        <span style={{ color: "#FFD27A", fontWeight: 700 }}>{row.modulo_codigo}</span>
                        {" "}<span style={{ color: "#88B8BE" }}>{row.modulo_nome}</span>
                      </td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#88B8BE" }}>{row.competencia_mes}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#5FE6CC", fontWeight: 700 }}>{fmt(row.valor)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848" }}>
                        <span style={{ color: cor, border: `1px solid ${cor}55`, padding: "2px 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#88B8BE" }}>{fmtData(row.vencimento)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#7cc4a0" }}>{fmtData(row.pago_em)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LayoutPawards>
  );
}
