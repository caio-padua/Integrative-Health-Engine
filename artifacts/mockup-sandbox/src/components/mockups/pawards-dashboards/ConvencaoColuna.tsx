export function ConvencaoColuna() {
  const navy = "#0a1628";
  const navyPanel = "#0f1e36";
  const border = "#1a2d4f";
  const gold = "#e6c572";
  const cyan = "#5ee6e6";
  const ink = "#e8eef7";
  const inkDim = "#9fb0c9";
  const mono = "'JetBrains Mono', ui-monospace, monospace";

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
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          background: navyPanel,
          border: `1px solid ${border}`,
          borderLeft: `3px solid ${gold}`,
          padding: "28px 36px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: gold,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          ░ CONVENÇÃO PERMANENTE ░ CANVAS PAWARDS MEDCORE
        </div>
        <h1
          style={{
            fontSize: 22,
            margin: "0 0 18px 0",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            color: ink,
          }}
        >
          MOCKUPS EM COLUNA VERTICAL ÚNICA
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            fontSize: 12,
            lineHeight: 1.7,
            color: inkDim,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: cyan,
                letterSpacing: 1.5,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              ▸ REGRA
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Todo mockup novo entra <b style={{ color: ink }}>empilhado abaixo</b> do último.</li>
              <li>Mesma <b style={{ color: ink }}>coluna</b>, mesma <b style={{ color: ink }}>largura</b>, mesmo <b style={{ color: ink }}>gap vertical</b>.</li>
              <li>Sem mockups soltos pelas laterais.</li>
              <li>Leitura sempre de <b style={{ color: ink }}>cima pra baixo</b>.</li>
            </ul>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                color: cyan,
                letterSpacing: 1.5,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              ▸ ORDEM ATUAL
            </div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Login Pawards Medcore <span style={{ color: gold }}>(aprovado — não tocar)</span></li>
              <li>Dashboard Global — visão CEO</li>
              <li>Dashboard Local — variantes CEO e médico</li>
            </ol>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: `1px solid ${border}`,
            fontSize: 11,
            color: inkDim,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>IDENTIDADE — DEEP NAVY · JETBRAINS MONO · 0PX BORDER-RADIUS · ACENTO DOURADO + CIANO NEON</span>
          <span style={{ color: gold }}>v1 · 2026-05-26</span>
        </div>
      </div>
    </div>
  );
}
