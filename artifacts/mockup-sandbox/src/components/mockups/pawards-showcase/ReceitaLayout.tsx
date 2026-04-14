export function ReceitaLayout() {
  const meds = [
    { nome: "Escitalopram 10mg", pos: "1cp manha", cat: "Remedio" },
    { nome: "Clonazepam 0,5mg", pos: "Desmame concluido", cat: "Suspenso" },
    { nome: "Metformina 500mg", pos: "1cp almoco + 1cp jantar", cat: "Remedio" },
    { nome: "Levotiroxina 50mcg", pos: "Jejum 30min antes cafe", cat: "Remedio" },
    { nome: "Vitamina D3 10.000UI", pos: "1x/semana", cat: "Remedio" },
    { nome: "Omega-3 EPA/DHA", pos: "2cp almoco", cat: "Remedio" },
    { nome: "Berberina 500mg", pos: "1cp almoco + 1cp jantar", cat: "Remedio" },
    { nome: "Formula Neuroprotetora", pos: "1cp/dia apos almoco", cat: "Formula" },
    { nome: "Formula Tiroidiana", pos: "1cp manha jejum", cat: "Formula" },
    { nome: "Formula Anti-Aging", pos: "1cp noite", cat: "Formula" },
  ];

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ color: "#0a1628", fontSize: 18, fontWeight: 700, margin: 0 }}>
          RECEITA MEDICA — LAYOUT ATUAL
        </h2>
        <p style={{ color: "#666", fontSize: 12 }}>Com paginacao automatica (25+ meds)</p>
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
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700 }}>INSTITUTO PADUA</div>
            <div style={{ color: "#8899aa", fontSize: 8 }}>PADUCCIA CLINICA MEDICA LTDA - EPP</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#c8a96e", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>PAWARDS</div>
            <div style={{ color: "white", fontSize: 7 }}>Sistema de Gestao Saude</div>
          </div>
        </div>

        {/* TITULO */}
        <div style={{
          textAlign: "center",
          padding: "10px 20px",
          borderBottom: "2px solid #0a2647",
          background: "#f0f4f8",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2647", letterSpacing: 1 }}>RECEITA MEDICA</div>
        </div>

        {/* PACIENTE */}
        <div style={{ padding: "8px 20px", background: "#fafafa", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 10, color: "#333" }}>
            <b>Paciente:</b> NATACHA CALDEIRAO GOMES | <b>CPF:</b> 234.567.890-12
          </div>
        </div>

        {/* MEDICAMENTOS */}
        <div style={{ padding: "12px 20px" }}>
          {meds.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 0",
              borderBottom: i < meds.length - 1 ? "1px solid #f0f0f0" : "none",
            }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: m.cat === "Formula" ? "#c8a96e22" : m.cat === "Suspenso" ? "#dc354522" : "#0a264722",
                color: m.cat === "Formula" ? "#c8a96e" : m.cat === "Suspenso" ? "#dc3545" : "#0a2647",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                marginRight: 8,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: m.cat === "Suspenso" ? "#dc3545" : "#222" }}>
                  {m.nome}
                  {m.cat === "Formula" && (
                    <span style={{ marginLeft: 6, fontSize: 7, background: "#c8a96e22", color: "#c8a96e", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>FORMULA</span>
                  )}
                  {m.cat === "Suspenso" && (
                    <span style={{ marginLeft: 6, fontSize: 7, background: "#dc354522", color: "#dc3545", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>SUSPENSO</span>
                  )}
                </div>
                <div style={{ fontSize: 8, color: "#666", marginTop: 1 }}>{m.pos}</div>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 12,
            padding: 8,
            background: "#e8f4fd",
            borderRadius: 4,
            textAlign: "center",
            fontSize: 9,
            color: "#0a2647",
          }}>
            Pagina 1 de 2 — continua na proxima pagina com mais 15 medicamentos
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          borderTop: "1px solid #ddd",
          padding: "6px 20px",
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
              padding: "2px 6px",
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
