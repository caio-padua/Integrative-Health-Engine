export function RasHmed() {
  const meds = [
    { med: "Escitalopram 10mg", pos: "1cp manha", ind: "Depressao/Ansiedade", st: "Em uso", sub: "L-Triptofano + SAMe", ev: "Estabilidade emocional" },
    { med: "Clonazepam 0,5mg", pos: "Desmame 12 sem", ind: "Insonia/Ansiedade", st: "Suspenso", sub: "Melatonina + Teanina", ev: "Desmame concluido" },
    { med: "Metformina 500mg", pos: "2x/dia", ind: "Resistencia insulinica", st: "Em reducao", sub: "Berberina 500mg", ev: "RI normalizada" },
    { med: "Levotiroxina 50mcg", pos: "Jejum 30min", ind: "Hipotireoidismo", st: "Em uso", sub: "Selenio + Zinco", ev: "TSH normalizado" },
    { med: "Vitamina D3 10.000UI", pos: "1x/semana", ind: "Deficiencia vit D", st: "Em uso", sub: "-", ev: "25(OH)D > 40" },
    { med: "Omega-3 EPA/DHA", pos: "2cp almoco", ind: "Inflamacao/Lipideos", st: "Em uso", sub: "-", ev: "PCR reduzida" },
    { med: "Berberina 500mg", pos: "2x/dia", ind: "RI + Disbiose", st: "Em uso", sub: "-", ev: "Glicemia normalizada" },
    { med: "Formula Neuroprotetora", pos: "1cp/dia", ind: "Neuroprotetor", st: "Em uso", sub: "-", ev: "Cognicao melhorada" },
    { med: "Formula Tiroidiana", pos: "1cp manha", ind: "Suporte tiroide", st: "Em uso", sub: "-", ev: "T3/T4 otimizados" },
    { med: "Formula Anti-Aging", pos: "1cp noite", ind: "Longevidade", st: "Em uso", sub: "-", ev: "Marcadores OK" },
  ];

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ color: "#0a1628", fontSize: 18, fontWeight: 700, margin: 0 }}>
          RAS — RACL HMED (PAISAGEM)
        </h2>
        <p style={{ color: "#666", fontSize: 12 }}>Tabela de Medicamentos em Uso com paginacao automatica</p>
      </div>

      <div style={{
        background: "white",
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        overflow: "hidden",
        border: "1px solid #ddd",
      }}>
        {/* HEADER */}
        <div style={{
          background: "linear-gradient(135deg, #0a2647 0%, #144272 60%, #205295 100%)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ color: "white", fontSize: 11, fontWeight: 700 }}>INSTITUTO PADUA</div>
            <div style={{ color: "#8899aa", fontSize: 7 }}>PADUCCIA CLINICA MEDICA LTDA - EPP</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700 }}>Medicamentos em Uso</div>
            <div style={{ color: "#c8a96e", fontSize: 9, fontWeight: 600 }}>RACL HMED</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#c8a96e", fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>PAWARDS</div>
            <div style={{ color: "white", fontSize: 7 }}>Sistema de Gestao Saude</div>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ padding: "12px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 8, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0a2647" }}>
                {["MEDICAMENTO + DOSE", "POSOLOGIA", "INDICACAO", "STATUS", "SUBSTITUICAO NATURAL", "EVIDENCIA"].map((h) => (
                  <th key={h} style={{ color: "white", padding: "5px 6px", textAlign: "left", fontSize: 7, fontWeight: 700, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meds.map((m, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#f8f9fa" : "white" }}>
                  <td style={{ padding: "4px 6px", fontWeight: 600, fontSize: 8 }}>{m.med}</td>
                  <td style={{ padding: "4px 6px", fontSize: 8 }}>{m.pos}</td>
                  <td style={{ padding: "4px 6px", fontSize: 8 }}>{m.ind}</td>
                  <td style={{ padding: "4px 6px", fontSize: 8, fontWeight: 600, color: m.st === "Suspenso" ? "#dc3545" : m.st === "Em reducao" ? "#fd7e14" : "#28a745" }}>{m.st}</td>
                  <td style={{ padding: "4px 6px", fontSize: 8 }}>{m.sub}</td>
                  <td style={{ padding: "4px 6px", fontSize: 8 }}>{m.ev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div style={{
          borderTop: "1px solid #ddd",
          padding: "6px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fafafa",
        }}>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "center", flex: 2 }}>
            <div style={{ color: "#999", fontSize: 7, fontStyle: "italic" }}>PADCON - Tecnologia e Desenvolvimento</div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              border: "1px solid #c8a96e88",
              borderRadius: 3,
              padding: "2px 5px",
              background: "#c8a96e11",
            }}>
              <div style={{ color: "#c8a96e", fontSize: 6, fontWeight: 700, letterSpacing: 1 }}>RASX-MATRIZ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
