export function SistemaHeader() {
  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* TOP BAR */}
      <div style={{
        background: "linear-gradient(135deg, #0a2647 0%, #144272 60%, #205295 100%)",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "#c8a96e22",
            border: "1px solid #c8a96e44",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c8a96e",
            fontSize: 12,
            fontWeight: 700,
          }}>
            PW
          </div>
          <div>
            <div style={{ color: "#c8a96e", fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>PAWARDS</div>
            <div style={{ color: "#8899aa", fontSize: 9 }}>Sistema de Gestao Saude</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: "#aabbcc", fontSize: 11 }}>Dr. Caio Padua</div>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#1e3a5f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c8a96e",
            fontSize: 12,
            fontWeight: 700,
          }}>CP</div>
        </div>
      </div>

      {/* NAV */}
      <div style={{
        background: "#0d1f3c",
        padding: "0 24px",
        display: "flex",
        gap: 0,
      }}>
        {["Dashboard", "Pacientes", "Prontuario", "Exames", "RAS", "Receitas"].map((item, i) => (
          <div key={item} style={{
            padding: "10px 16px",
            fontSize: 11,
            color: i === 0 ? "#c8a96e" : "#7788aa",
            fontWeight: i === 0 ? 700 : 400,
            borderBottom: i === 0 ? "2px solid #c8a96e" : "2px solid transparent",
            cursor: "pointer",
          }}>
            {item}
          </div>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div style={{ padding: 24 }}>
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0a2647", marginBottom: 16 }}>
            Dashboard
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Pacientes", value: "127", color: "#0a2647" },
              { label: "Consultas Hoje", value: "8", color: "#28a745" },
              { label: "PDFs Gerados", value: "342", color: "#c8a96e" },
            ].map((card, i) => (
              <div key={i} style={{
                background: "#f8f9fa",
                borderRadius: 8,
                padding: 16,
                textAlign: "center",
                borderLeft: `3px solid ${card.color}`,
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20,
            padding: 12,
            background: "#f0f4f8",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0a2647" }}>Proxima consulta: Natacha Caldeirao</div>
              <div style={{ fontSize: 9, color: "#666" }}>Hoje, 08:00 — AGENDA GERAL</div>
            </div>
            <div style={{
              background: "#0a2647",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
            }}>Abrir Prontuario</div>
          </div>
        </div>

        {/* FOOTER DISCRETO */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <div style={{ color: "#bbb", fontSize: 9, fontStyle: "italic" }}>
            PADCON - Tecnologia e Desenvolvimento
          </div>
        </div>
      </div>
    </div>
  );
}
