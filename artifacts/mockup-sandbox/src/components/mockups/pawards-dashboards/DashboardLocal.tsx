export function DashboardLocal() {
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
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.3, color: inkMute, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, color: ink, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: accent, marginTop: 3 }}>{sub}</div>
    </div>
  );

  const Acao = (titulo: string, motivo: string, urgencia: "danger" | "warn") => {
    const c = urgencia === "danger" ? danger : warn;
    return (
      <div
        style={{
          background: navyDeep,
          border: `1px solid ${border}`,
          borderLeft: `3px solid ${c}`,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: c, letterSpacing: 1.5, marginBottom: 4 }}>
            ▸ {urgencia === "danger" ? "AGORA" : "EM 1H"}
          </div>
          <div style={{ fontSize: 13, color: ink }}>{titulo}</div>
          <div style={{ fontSize: 10, color: inkDim, marginTop: 3 }}>{motivo}</div>
        </div>
        <span
          style={{
            fontSize: 10,
            color: c,
            border: `1px solid ${c}`,
            padding: "5px 12px",
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          ABRIR ▸
        </span>
      </div>
    );
  };

  const FilaItem = (label: string, total: number, vermelhos: number) => (
    <div
      style={{
        background: navyPanel,
        border: `1px solid ${border}`,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 9, color: inkMute, letterSpacing: 1.3 }}>{label}</div>
        <div style={{ fontSize: 22, color: ink, marginTop: 3 }}>{total}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        {vermelhos > 0 ? (
          <>
            <div style={{ fontSize: 10, color: danger, letterSpacing: 1.2 }}>● SLA</div>
            <div style={{ fontSize: 13, color: danger, marginTop: 2 }}>{vermelhos}</div>
            <div style={{ fontSize: 9, color: inkMute, marginTop: 2 }}>just. obrig.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, color: ok, letterSpacing: 1.2 }}>● OK</div>
            <div style={{ fontSize: 13, color: ok, marginTop: 2 }}>0</div>
          </>
        )}
      </div>
    </div>
  );

  /** Conteúdo do dashboard (compartilhado entre as 2 variantes do header) */
  const DashboardBody = () => (
    <div style={{ padding: "16px 18px" }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {Kpi("PAC. DO DIA", "23", "8 confirmados", cyan)}
        {Kpi("PRÓX. CONSULTA", "10:30", "Luciano R.", cyan)}
        {Kpi("ANAMNESE PEND.", "7", "2 paradas >24h", warn)}
        {Kpi("VALID. PEND.", "3", "Dra. Mariana", cyan)}
        {Kpi("SLA UNIDADE", "2", "vermelhos", danger)}
      </div>

      {/* AÇÕES AGORA */}
      <div style={{ fontSize: 9, letterSpacing: 1.8, color: inkMute, marginBottom: 8 }}>
        ░ AÇÕES QUE PRECISAM DE VOCÊ AGORA
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {Acao(
          "Validar protocolo Luciano R. (RASX REVO)",
          "anamnese fechou às 22h41 ontem · paciente confirmou 10:30",
          "danger",
        )}
        {Acao(
          "Justificar SLA estourado — Fila Validação",
          "2 itens >48h · justificativa obrigatória pra desbloquear",
          "warn",
        )}
      </div>

      {/* FILAS */}
      <div style={{ fontSize: 9, letterSpacing: 1.8, color: inkMute, marginBottom: 8 }}>
        ░ FILAS OPERACIONAIS DA UNIDADE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {FilaItem("ANAMNESE", 7, 0)}
        {FilaItem("VALIDAÇÃO", 3, 2)}
        {FilaItem("PROCEDIMENTOS", 5, 0)}
        {FilaItem("FOLLOW-UP", 12, 0)}
        {FilaItem("PAGAMENTOS", 4, 0)}
      </div>
    </div>
  );

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
        {/* TÍTULO DO MOCKUP */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: gold,
            marginBottom: 6,
          }}
        >
          ░ DASHBOARD LOCAL — DUAS VARIANTES LADO A LADO
        </div>
        <h1
          style={{
            fontSize: 18,
            margin: "0 0 18px 0",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: ink,
          }}
        >
          O QUE O MÉDICO VÊ QUANDO ABRE UMA UNIDADE
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* ═══════════ VARIANTE A — PERFIL CEO ═══════════ */}
          <div style={{ border: `1px solid ${gold}`, background: navyPanel }}>
            <div
              style={{
                background: gold,
                color: navy,
                padding: "6px 14px",
                fontSize: 10,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              VARIANTE A · PERFIL CEO (VÊ TUDO)
            </div>

            {/* Header com switcher */}
            <div
              style={{
                background: navyDeep,
                borderBottom: `1px solid ${border}`,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: gold }}>
                    PAWARDS MEDCORE
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: ink,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginTop: 2,
                    }}
                  >
                    Unidade Pádua
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    border: `1px solid ${gold}`,
                  }}
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: 10,
                      color: inkDim,
                      letterSpacing: 1.3,
                      cursor: "pointer",
                    }}
                  >
                    ◂ GLOBAL
                  </div>
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: 10,
                      color: navy,
                      background: gold,
                      letterSpacing: 1.3,
                      fontWeight: 700,
                      borderLeft: `1px solid ${gold}`,
                    }}
                  >
                    LOCAL
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: inkDim }}>
                PERFIL: <b style={{ color: gold }}>CEO</b>
              </div>
            </div>

            <DashboardBody />
          </div>

          {/* ═══════════ VARIANTE B — MÉDICO DONO LOCAL ═══════════ */}
          <div style={{ border: `1px solid ${cyan}`, background: navyPanel }}>
            <div
              style={{
                background: cyan,
                color: navy,
                padding: "6px 14px",
                fontSize: 10,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              VARIANTE B · PERFIL MÉDICO DONO LOCAL (SEM VESTÍGIO DO GLOBAL)
            </div>

            {/* Header SEM switcher, SEM seta, SEM nada que sugira nível acima */}
            <div
              style={{
                background: navyDeep,
                borderBottom: `1px solid ${border}`,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: cyan }}>
                  PAWARDS MEDCORE
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: ink,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginTop: 2,
                  }}
                >
                  Unidade Pádua
                </div>
              </div>
              <div style={{ fontSize: 10, color: inkDim }}>
                PERFIL: <b style={{ color: cyan }}>MÉDICO RESPONSÁVEL</b>
              </div>
            </div>

            <DashboardBody />
          </div>
        </div>

        {/* NOTA DE VISIBILIDADE */}
        <div
          style={{
            marginTop: 20,
            background: navyDeep,
            border: `1px solid ${border}`,
            borderLeft: `3px solid ${danger}`,
            padding: "14px 18px",
            fontSize: 11,
            color: inkDim,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: danger,
              marginBottom: 6,
            }}
          >
            ░ REGRA DE VISIBILIDADE — INEGOCIÁVEL
          </div>
          A variante B (médico dono local) <b style={{ color: ink }}>não tem</b> switcher, seta, breadcrumb,
          tooltip, link de rodapé ou qualquer texto que insinue a existência de uma visão Global. A
          informação sobre a existência da visão Global é, ela própria, <b style={{ color: ink }}>restrita
          ao perfil CEO</b>.
        </div>
      </div>
    </div>
  );
}
