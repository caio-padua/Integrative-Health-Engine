export function L2ComE4() {
  const navy = "#0a1628";
  const navyDeep = "#050d1a";
  const navyPanel = "#0f1e36";
  const border = "#1a2d4f";
  const cyan = "#00d4ff";
  const yellow = "#facc15";
  const orange = "#fb923c";
  const green = "#34d399";
  const red = "#f87171";
  const mono = "'JetBrains Mono', ui-monospace, monospace";

  const pin = (label: string, sub: string, color: string) => (
    <div
      key={label}
      style={{
        border: `1px solid ${color}`,
        background: `${color}10`,
        padding: "6px 14px",
        fontFamily: mono,
        textAlign: "center",
        minWidth: 86,
      }}
    >
      <div style={{ fontSize: 10, color, letterSpacing: 1, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#fff", marginTop: 2 }}>{sub}</div>
    </div>
  );

  const menuItem = (label: string, active = false) => (
    <div
      key={label}
      style={{
        padding: "7px 14px 7px 24px",
        fontFamily: mono,
        fontSize: 11,
        color: active ? cyan : "#cbd5e1",
        background: active ? "#0e2540" : "transparent",
        borderLeft: active ? `3px solid ${cyan}` : "3px solid transparent",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      <span style={{ color: active ? cyan : "#64748b", marginRight: 8 }}>♦</span>
      {label}
    </div>
  );

  const menuSection = (title: string, color: string, items: { label: string; active?: boolean }[]) => (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          padding: "4px 14px",
          fontFamily: mono,
          fontSize: 9,
          letterSpacing: 1.5,
          color,
          borderBottom: `1px solid ${color}40`,
          marginBottom: 4,
        }}
      >
        § {title}
      </div>
      {items.map((it) => menuItem(it.label, it.active))}
    </div>
  );

  return (
    <div style={{ background: navyDeep, minHeight: "100vh", color: "#fff", fontFamily: mono }}>
      {/* FAIXA E4 — PINS sticky no topo */}
      <div
        style={{
          background: navy,
          borderBottom: `1px solid ${border}`,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 9, color: yellow, letterSpacing: 2, marginRight: 8 }}>
          ◆ L2+E4 OFICIAL — chrome fixo no topo, conteúdo rola embaixo
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {pin("PRESC", "rx", cyan)}
          {pin("ANAME", "form", green)}
          {pin("PACIEN", "pessoa", orange)}
          {pin("AGENDA", "horário", "#a78bfa")}
        </div>
        <div style={{ display: "flex", gap: 14, marginLeft: 18, fontSize: 10, color: "#94a3b8" }}>
          <span>⌘K</span>
          <span style={{ color: red }}>🔔 3</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: "#64748b" }}>GLOBAL</div>
            <div style={{ fontSize: 10, color: cyan }}>Todas Clínicas</div>
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${cyan}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: cyan,
              fontSize: 10,
            }}
          >
            CP
          </div>
        </div>
      </div>

      {/* FAIXA E4 — Cockpit mega-header sticky */}
      <div
        style={{
          background: navy,
          borderBottom: `2px solid ${yellow}`,
          padding: "14px 24px",
          position: "sticky",
          top: 41,
          zIndex: 19,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: yellow, letterSpacing: 3, fontWeight: 700 }}>
            ✦ COCKPIT · PAINEL TÁTICO
          </div>
          <div style={{ fontSize: 18, color: "#fff", marginTop: 2, fontWeight: 600 }}>
            LUCIANO PERSSINOTTO · 51A · MASC
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontFamily: mono, fontSize: 11 }}>
          <div style={{ textAlign: "center", padding: "4px 14px", borderLeft: `1px solid ${border}` }}>
            <div style={{ fontSize: 8, color: "#64748b", letterSpacing: 1 }}>AGENDA</div>
            <div style={{ fontSize: 18, color: cyan, fontWeight: 700 }}>12</div>
          </div>
          <div style={{ textAlign: "center", padding: "4px 14px", borderLeft: `1px solid ${border}` }}>
            <div style={{ fontSize: 8, color: "#64748b", letterSpacing: 1 }}>ALERTAS</div>
            <div style={{ fontSize: 18, color: red, fontWeight: 700 }}>3</div>
          </div>
          <div style={{ textAlign: "center", padding: "4px 14px", borderLeft: `1px solid ${border}` }}>
            <div style={{ fontSize: 8, color: "#64748b", letterSpacing: 1 }}>POTENCIAL</div>
            <div style={{ fontSize: 18, color: green, fontWeight: 700 }}>R$ 2,7K</div>
          </div>
        </div>
      </div>

      {/* L2 — 3 colunas: menu / trabalho / contexto */}
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 320px", minHeight: 700 }}>
        {/* COLUNA ESQUERDA — Menu (L2) */}
        <aside style={{ background: navy, borderRight: `1px solid ${border}`, padding: "16px 0" }}>
          <div
            style={{
              margin: "0 14px 12px",
              padding: 10,
              border: `1px solid ${cyan}`,
              background: `${cyan}08`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 9, color: cyan, letterSpacing: 2 }}>$ COCKPIT</div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>ABRIR PACIENTE</div>
          </div>
          <div style={{ padding: "0 14px 10px" }}>
            <input
              placeholder="Pesquisar..."
              style={{
                width: "100%",
                background: navyDeep,
                border: `1px solid ${border}`,
                color: "#fff",
                padding: "6px 10px",
                fontFamily: mono,
                fontSize: 11,
              }}
            />
          </div>
          {menuSection("OPERACIONAL", orange, [
            { label: "Visão Geral" },
            { label: "Pacientes", active: true },
            { label: "Anamnese" },
            { label: "Cockpit" },
            { label: "Exames" },
            { label: "Fórmulas" },
            { label: "Mensageria" },
          ])}
          {menuSection("FINANCEIRO", green, [
            { label: "Receitas" },
            { label: "Assinaturas" },
            { label: "Comissões" },
          ])}
          {menuSection("CONFIGURAÇÃO", "#a78bfa", [
            { label: "Unidades" },
            { label: "Colaboradores" },
            { label: "Perfis" },
            { label: "Catálogos" },
          ])}
        </aside>

        {/* COLUNA CENTRAL — Working area (L2 Triple Focus) */}
        <main style={{ background: navyDeep, padding: 22 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1.5, marginBottom: 4 }}>
            CLÍNICA › PACIENTES › LUCIANO P.
          </div>
          <h1 style={{ fontSize: 20, color: "#fff", letterSpacing: 1, margin: "0 0 18px" }}>
            DASHBOARD DO PACIENTE
          </h1>

          <div
            style={{
              border: `1px solid ${border}`,
              borderLeft: `3px solid ${cyan}`,
              background: navyPanel,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 9, color: cyan, letterSpacing: 2, marginBottom: 12 }}>
              ▸ TRABALHO PRINCIPAL · sem distrações laterais
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {["EXAMES PENDENTES (4)", "PROTOCOLOS ATIVOS (2)", "ALERTAS CLÍNICOS (3)", "RECEITAS EMITIDAS (8)"].map(
                (t, i) => (
                  <div
                    key={t}
                    style={{
                      border: `1px solid ${border}`,
                      background: navy,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1.5 }}>CARD {i + 1}</div>
                    <div style={{ fontSize: 13, color: "#fff", marginTop: 4 }}>{t}</div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Bloco "validado — não muda" */}
          <div
            style={{
              border: `1px dashed ${green}`,
              background: `${green}08`,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 9, color: green, letterSpacing: 2 }}>
              ✓ ÁREA INTOCADA · Grafo Sinapses · Craniotomia V4 · Terços · GPS Pádua
            </div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 6 }}>
              Tudo que você já validou continua igual no miolo. O chrome novo (PINS + Cockpit + menu) só ENVOLVE.
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${border}`,
              background: navyPanel,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 9, color: orange, letterSpacing: 2, marginBottom: 8 }}>
              ▸ TERÇOS — preview compacto (clica e abre tela inteira já validada)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {[
                ["TODAS", 18, "#fff"],
                ["ABAIXO", 4, red],
                ["INFERIOR", 5, orange],
                ["MÉDIO", 5, yellow],
                ["SUPERIOR", 2, green],
              ].map(([t, n, c]) => (
                <div
                  key={t as string}
                  style={{ border: `1px solid ${c as string}`, padding: 8, textAlign: "center" }}
                >
                  <div style={{ fontSize: 9, color: c as string, letterSpacing: 1 }}>{t}</div>
                  <div style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>{n as number}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* COLUNA DIREITA — Painel Contexto (L2) */}
        <aside style={{ background: navy, borderLeft: `1px solid ${border}`, padding: 18 }}>
          <div style={{ fontSize: 9, color: cyan, letterSpacing: 2, marginBottom: 10 }}>
            ◆ PAINEL CONTEXTO
          </div>

          <div
            style={{
              border: `1px solid ${border}`,
              borderLeft: `3px solid ${cyan}`,
              padding: 12,
              marginBottom: 16,
              background: navyPanel,
            }}
          >
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>LUCIANO PERSSINOTTO</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>51A · MASC · 1965</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              HAS · DM2 · HASHIMOTO · 3 ALERTAS
            </div>
          </div>

          <div style={{ fontSize: 9, color: orange, letterSpacing: 1.5, marginBottom: 6 }}>
            ÚLTIMAS AÇÕES
          </div>
          {[
            "Pulso Diário registrado",
            "Exame TSH adicionado",
            "Fórmula F05 prescrita",
          ].map((a) => (
            <div key={a} style={{ fontSize: 10, color: "#cbd5e1", padding: "3px 0" }}>
              • {a}
            </div>
          ))}

          <div style={{ fontSize: 9, color: cyan, letterSpacing: 1.5, marginTop: 14, marginBottom: 6 }}>
            ATALHOS
          </div>
          {["+ RECEITA", "+ EXAME", "+ MENSAGEM"].map((s) => (
            <div
              key={s}
              style={{
                fontSize: 10,
                color: cyan,
                padding: "4px 8px",
                border: `1px solid ${cyan}30`,
                marginBottom: 4,
                cursor: "pointer",
              }}
            >
              {s}
            </div>
          ))}

          <div style={{ fontSize: 9, color: red, letterSpacing: 1.5, marginTop: 14, marginBottom: 6 }}>
            ⚠ ALERTAS
          </div>
          <div style={{ fontSize: 10, color: "#fca5a5", padding: "3px 0" }}>⚠ PCR persistente</div>
          <div style={{ fontSize: 10, color: "#fca5a5", padding: "3px 0" }}>⚠ Adesão fórmula 60%</div>
        </aside>
      </div>
    </div>
  );
}
