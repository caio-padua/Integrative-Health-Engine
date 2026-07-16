import { useQuery } from "@tanstack/react-query";
import { LayoutPawards } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";

const MODALIDADE_COR: Record<string, string> = {
  presencial: "#5FE6CC",
  online:     "#A89DFF",
  domiciliar: "#FFD27A",
  remoto:     "#A89DFF",
};

export default function AdminSubAgendasPage() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["sub-agendas-admin"],
    queryFn: () =>
      apiFetch("/api/sub-agendas-admin", { credentials: "include" }).then((r) => r.json()),
  });

  const porEmpresa = data.reduce<Record<string, any[]>>((acc, sa) => {
    const k = sa.empresa_nome ?? "Sem empresa";
    if (!acc[k]) acc[k] = [];
    acc[k].push(sa);
    return acc;
  }, {});

  return (
    <LayoutPawards>
      <div style={{ padding: "24px 28px", fontFamily: "'JetBrains Mono', monospace" }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#5FE6CC", textTransform: "uppercase", margin: 0 }}>
            SUB-AGENDAS (CAMADA B OPERACIONAL)
          </h1>
          <p style={{ fontSize: 11, color: "#88B8BE", margin: "4px 0 0" }}>
            Sub-agendas ativas por empresa — Camada B que vincula profissional real ao sistema de slots.
            Empresas sem sub-agenda têm regras de disponibilidade mas sem vínculo formal de Camada B.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total sub-agendas", valor: data.length, cor: "#5FE6CC" },
            { label: "Ativas", valor: data.filter((s) => s.ativa).length, cor: "#7cc4a0" },
            { label: "Empresas com Camada B", valor: Object.keys(porEmpresa).length, cor: "#FFD27A" },
          ].map((card) => (
            <div key={card.label} style={{ background: "#0A2030", border: `1px solid ${card.cor}40`, padding: "12px 16px", minWidth: 160 }}>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: card.cor, textTransform: "uppercase" }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: card.cor, marginTop: 2 }}>{card.valor}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ color: "#88B8BE", fontSize: 12 }}>Carregando sub-agendas...</div>
        ) : (
          Object.entries(porEmpresa).map(([empresa, subs]) => (
            <div key={empresa} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#FFD27A", textTransform: "uppercase", padding: "6px 12px", background: "#0A2030", borderLeft: "3px solid #FFD27A", marginBottom: 8 }}>
                § {empresa}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#061824" }}>
                    {["Nome", "Tipo", "Modalidade", "Sala / Local", "Profissional", "Slots", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#88B8BE", borderBottom: "1px solid #1A3848", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sa, idx) => {
                    const corModal = MODALIDADE_COR[sa.modalidade] ?? "#88B8BE";
                    return (
                      <tr key={sa.id} style={{ background: idx % 2 === 0 ? "#0A2030" : "#061824" }}>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#D8EEEE", fontWeight: 600 }}>
                          {sa.cor && <span style={{ display: "inline-block", width: 8, height: 8, background: sa.cor, marginRight: 6, verticalAlign: "middle" }} />}
                          {sa.nome}
                        </td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#88B8BE", textTransform: "uppercase", fontSize: 10 }}>{sa.tipo}</td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848" }}>
                          <span style={{ color: corModal, border: `1px solid ${corModal}44`, padding: "1px 5px", fontSize: 9, textTransform: "uppercase" }}>{sa.modalidade}</span>
                        </td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#88B8BE" }}>{sa.sala_ou_local ?? "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#D8EEEE" }}>{sa.profissional_nome ?? "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848", color: "#5FE6CC", fontWeight: 700 }}>{sa.total_slots ?? 0}</td>
                        <td style={{ padding: "8px 12px", borderBottom: "1px solid #1A3848" }}>
                          <span style={{ color: sa.ativa ? "#7cc4a0" : "#d08a8a", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>
                            {sa.ativa ? "ATIVA" : "INATIVA"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </LayoutPawards>
  );
}
