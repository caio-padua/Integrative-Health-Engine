export function PdfHeaderFooter() {
  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#0a1628", fontSize: 18, fontWeight: 700, margin: 0 }}>
          LAYOUT DO PDF — COMO FICA HOJE
        </h2>
        <p style={{ color: "#666", fontSize: 12 }}>Header PAWARDS + Footer PADCON + Selo RASX-MATRIZ</p>
      </div>

      <div style={{
        background: "white",
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        overflow: "hidden",
        maxWidth: 580,
        margin: "0 auto",
        border: "1px solid #ddd",
      }}>
        {/* HEADER */}
        <div style={{
          background: "linear-gradient(135deg, #0a2647 0%, #144272 60%, #205295 100%)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>INSTITUTO PADUA</div>
            <div style={{ color: "#aabbcc", fontSize: 9 }}>PADUCCIA CLINICA MEDICA LTDA - EPP</div>
            <div style={{ color: "#8899aa", fontSize: 8 }}>CNPJ 63.865.940/0001-63</div>
            <div style={{ color: "#8899aa", fontSize: 8 }}>Rua Guaxupe, 327 - Vila Formosa, SP</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#c8a96e", fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>PAWARDS</div>
            <div style={{ color: "white", fontSize: 8 }}>Sistema de Gestao Saude</div>
            <div style={{
              marginTop: 6,
              background: "#c8a96e22",
              borderRadius: 4,
              padding: "2px 8px",
              border: "1px solid #c8a96e44",
            }}>
              <span style={{ color: "#c8a96e", fontSize: 8, fontWeight: 600 }}>LOGO AQUI</span>
            </div>
          </div>
        </div>

        {/* BODY (exemplo) */}
        <div style={{ padding: "16px 20px", minHeight: 420 }}>
          <div style={{
            background: "#0a264710",
            borderLeft: "3px solid #0a2647",
            padding: "8px 12px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0a2647" }}>RACL HMED — Medicamentos em Uso</div>
          </div>

          <div style={{
            background: "#f8f9fa",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
            fontSize: 10,
            color: "#333",
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Paciente: NATACHA CALDEIRAO GOMES</div>
            <div>CPF: 234.567.890-12 | DN: 19/03/1990</div>
          </div>

          <table style={{ width: "100%", fontSize: 8, borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ background: "#0a2647", color: "white" }}>
                <th style={{ padding: "4px 6px", textAlign: "left" }}>MEDICAMENTO</th>
                <th style={{ padding: "4px 6px", textAlign: "left" }}>POSOLOGIA</th>
                <th style={{ padding: "4px 6px", textAlign: "left" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Escitalopram 10mg", "1x/dia manha", "Em uso"],
                ["Clonazepam 0,5mg", "Desmame concluido", "Suspenso"],
                ["Metformina 500mg", "2x/dia", "Em reducao"],
                ["Levotiroxina 50mcg", "Jejum 30min antes", "Em uso"],
                ["Vitamina D3 10.000UI", "1x/semana", "Em uso"],
              ].map(([med, pos, status], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#f8f9fa" : "white" }}>
                  <td style={{ padding: "3px 6px", fontSize: 8 }}>{med}</td>
                  <td style={{ padding: "3px 6px", fontSize: 8 }}>{pos}</td>
                  <td style={{ padding: "3px 6px", fontSize: 8, color: status === "Suspenso" ? "#dc3545" : status === "Em reducao" ? "#fd7e14" : "#28a745" }}>{status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, textAlign: "center", color: "#999", fontSize: 8 }}>
            ... (mais 20 medicamentos na pagina seguinte) ...
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          borderTop: "1px solid #ddd",
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fafafa",
        }}>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "center", flex: 2 }}>
            <div style={{ color: "#999", fontSize: 8, fontStyle: "italic" }}>
              PADCON - Tecnologia e Desenvolvimento
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              border: "1px solid #c8a96e88",
              borderRadius: 3,
              padding: "2px 6px",
              background: "#c8a96e11",
            }}>
              <div style={{ color: "#c8a96e", fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>RASX-MATRIZ</div>
            </div>
          </div>
        </div>
      </div>

      {/* LEGENDA */}
      <div style={{ maxWidth: 580, margin: "16px auto 0", display: "flex", gap: 12, justifyContent: "center" }}>
        {[
          { label: "PAWARDS", color: "#c8a96e", desc: "Dourado, topo direito" },
          { label: "PADCON", color: "#999", desc: "Discreto, rodape centro" },
          { label: "RASX-MATRIZ", color: "#c8a96e", desc: "Selo pequeno, canto inf. dir." },
        ].map((item, i) => (
          <div key={i} style={{
            background: "white",
            borderRadius: 6,
            padding: "6px 12px",
            border: `1px solid ${item.color}44`,
            textAlign: "center",
          }}>
            <div style={{ color: item.color, fontSize: 11, fontWeight: 700 }}>{item.label}</div>
            <div style={{ color: "#888", fontSize: 9 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
