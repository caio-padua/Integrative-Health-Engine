export function DashboardGlobal() {
  const navy = "#0a1628";
  const navyDeep = "#050d1a";
  const navyPanel = "#0f1e36";
  const border = "#1a2d4f";
  const borderSoft = "#172238";
  const gold = "#e6c572";
  const cyan = "#5ee6e6";
  const ink = "#e8eef7";
  const inkDim = "#9fb0c9";
  const inkMute = "#6b7e9e";
  const ok = "#7cc4a0";
  const warn = "#e0b062";
  const danger = "#d08a8a";
  const mono = "'JetBrains Mono', ui-monospace, monospace";

  const Kpi = (label: string, value: string, sub: string, accent: string = cyan) => (
    <div
      style={{
        background: navyPanel,
        border: `1px solid ${border}`,
        borderTop: `2px solid ${accent}`,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.4,
          color: inkMute,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          color: ink,
          marginTop: 6,
          letterSpacing: 0.5,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: accent, marginTop: 4 }}>{sub}</div>
    </div>
  );

  const SemaforoCell = (
    valor: number,
    cor: "ok" | "warn" | "danger" | "mute",
  ) => {
    const c =
      cor === "ok"
        ? ok
        : cor === "warn"
          ? warn
          : cor === "danger"
            ? danger
            : inkMute;
    return (
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${borderSoft}`,
          textAlign: "center",
          color: c,
          fontFamily: mono,
          fontSize: 12,
        }}
      >
        <span style={{ marginRight: 6 }}>●</span>
        {valor}
      </td>
    );
  };

  const unidades = [
    { nome: "PÁDUA", pac: 412, anam: 18, val: 7, sla: { v: 2, c: "warn" as const }, rec: "R$ 84.200" },
    { nome: "GENESIS", pac: 296, anam: 11, val: 3, sla: { v: 0, c: "ok" as const }, rec: "R$ 51.700" },
    { nome: "ATELIER NORTE", pac: 188, anam: 9, val: 5, sla: { v: 4, c: "danger" as const }, rec: "R$ 38.100" },
    { nome: "ATELIER SUL", pac: 134, anam: 4, val: 1, sla: { v: 1, c: "warn" as const }, rec: "R$ 22.900" },
  ];

  const filas = [
    { nome: "ANAMNESE", total: 42, padua: 18, gen: 11, n: 9, s: 4 },
    { nome: "VALIDAÇÃO", total: 16, padua: 7, gen: 3, n: 5, s: 1 },
    { nome: "PROCEDIMENTOS", total: 28, padua: 12, gen: 8, n: 5, s: 3 },
    { nome: "FOLLOW-UP", total: 73, padua: 31, gen: 22, n: 14, s: 6 },
    { nome: "PAGAMENTOS", total: 19, padua: 9, gen: 4, n: 4, s: 2 },
  ];

  return (
    <div
      style={{
        background: navy,
        minHeight: "100vh",
        padding: 40,
        fontFamily: mono,
        color: ink,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* HEADER + SWITCHER */}
        <div
          style={{
            background: navyDeep,
            border: `1px solid ${border}`,
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: gold }}>
                PAWARDS MEDCORE
              </div>
              <div
                style={{
                  fontSize: 16,
                  letterSpacing: 1,
                  color: ink,
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Painel CEO — Visão Global
              </div>
            </div>
            {/* SWITCHER GLOBAL / LOCAL */}
            <div
              style={{
                display: "flex",
                border: `1px solid ${gold}`,
                background: navyPanel,
              }}
            >
              <div
                style={{
                  padding: "8px 18px",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: navy,
                  background: gold,
                  fontWeight: 700,
                }}
              >
                ◆ GLOBAL
              </div>
              <div
                style={{
                  padding: "8px 18px",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: inkDim,
                  borderLeft: `1px solid ${gold}`,
                  cursor: "pointer",
                }}
              >
                LOCAL ▾
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: inkDim }}>
            <span>PERFIL: <b style={{ color: gold }}>CEO</b></span>
            <span>ESCOPO: <b style={{ color: ink }}>4 UNIDADES</b></span>
            <span>26/MAI/2026 · 09:14 BRT</span>
          </div>
        </div>

        {/* KPIs CONSOLIDADOS */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: inkMute,
              marginBottom: 8,
            }}
          >
            ░ KPIs CONSOLIDADOS — TODAS AS UNIDADES
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
            }}
          >
            {Kpi("PACIENTES ATIVOS", "1.030", "+12 esta semana", cyan)}
            {Kpi("ANAMNESES NA FILA", "42", "8 paradas >24h", warn)}
            {Kpi("VALIDAÇÕES PENDENTES", "16", "3 médicos online", cyan)}
            {Kpi("SLA ESTOURADO", "7", "Atenção: Norte", danger)}
            {Kpi("RECEITA POTENCIAL", "R$ 196.9K", "estimado · não-pago", gold)}
          </div>
          <div style={{ fontSize: 9, color: inkMute, marginTop: 6, fontStyle: "italic" }}>
            * "Receita potencial" = estimativa a partir de fichas históricas. Não é caixa real.
          </div>
        </div>

        {/* GRID UNIDADES */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: inkMute,
              marginBottom: 8,
            }}
          >
            ░ UNIDADES — COMPARATIVO + SEMÁFORO SLA
          </div>
          <div
            style={{
              background: navyPanel,
              border: `1px solid ${border}`,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: mono,
                fontSize: 12,
                color: ink,
              }}
            >
              <thead>
                <tr style={{ background: navyDeep }}>
                  {["UNIDADE", "PACIENTES", "ANAMNESE", "VALIDAÇÃO", "SLA", "RECEITA POT.", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: h === "UNIDADE" ? "left" : "center",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: inkMute,
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unidades.map((u) => (
                  <tr key={u.nome}>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${borderSoft}`,
                        color: ink,
                      }}
                    >
                      <span style={{ color: cyan, marginRight: 8 }}>◆</span>
                      {u.nome}
                    </td>
                    {SemaforoCell(u.pac, "mute")}
                    {SemaforoCell(u.anam, "warn")}
                    {SemaforoCell(u.val, "warn")}
                    {SemaforoCell(u.sla.v, u.sla.c)}
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${borderSoft}`,
                        textAlign: "center",
                        color: gold,
                      }}
                    >
                      {u.rec}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${borderSoft}`,
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: cyan,
                          border: `1px solid ${cyan}`,
                          padding: "3px 10px",
                          letterSpacing: 1,
                          cursor: "pointer",
                        }}
                      >
                        ENTRAR ▸
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FILAS AGREGADAS */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: inkMute,
              marginBottom: 8,
            }}
          >
            ░ FILAS OPERACIONAIS AGREGADAS (POR UNIDADE)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
            }}
          >
            {filas.map((f) => (
              <div
                key={f.nome}
                style={{
                  background: navyPanel,
                  border: `1px solid ${border}`,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    color: inkMute,
                  }}
                >
                  {f.nome}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: ink,
                    marginTop: 4,
                  }}
                >
                  {f.total}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: inkDim,
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  <div>PÁDUA <span style={{ color: ink, float: "right" }}>{f.padua}</span></div>
                  <div>GENESIS <span style={{ color: ink, float: "right" }}>{f.gen}</span></div>
                  <div>NORTE <span style={{ color: ink, float: "right" }}>{f.n}</span></div>
                  <div>SUL <span style={{ color: ink, float: "right" }}>{f.s}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
