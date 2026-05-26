import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

const NIVEIS = [
  { label: "🏛 PAWARDS", cor: p.gold },
  { label: "ADMIN", cor: p.cyan },
  { label: "PLATAFORMA", cor: p.cyan },
  { label: "AUDITORIA", cor: p.gold, atual: true },
];

export function Chrome2BreadcrumbTopo() {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: p.mono, color: p.ink }}>
      {/* HEADER GLOBAL FINO */}
      <div
        style={{
          background: p.navy,
          borderBottom: `1px solid ${p.border}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, color: p.gold }}>PAWARDS MEDCORE</div>
        <div style={{ fontSize: 10, color: p.inkDim }}>
          CAIO R. · <b style={{ color: p.gold }}>CEO</b> · 26/MAI/2026
        </div>
      </div>

      {/* BREADCRUMB ÂNCORA — faixa fina 40px */}
      <div
        style={{
          background: p.navyPanel,
          borderBottom: `2px solid ${p.gold}`,
          padding: "0 24px",
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 0,
          position: "sticky",
          top: 38,
          zIndex: 19,
        }}
      >
        {NIVEIS.map((n, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                color: n.cor,
                padding: "4px 10px",
                fontWeight: n.atual ? 700 : 400,
                borderBottom: n.atual ? `2px solid ${p.gold}` : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {n.label}
            </span>
            {i < NIVEIS.length - 1 && (
              <span style={{ color: p.inkMute, fontSize: 12, padding: "0 4px" }}>/</span>
            )}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 9, color: p.inkMute, letterSpacing: 1.2 }}>
          ░ CADA NÍVEL CLICÁVEL = SOBE 1 ANDAR
        </span>
      </div>

      <MioloAuditoriaExemplo />
    </div>
  );
}
