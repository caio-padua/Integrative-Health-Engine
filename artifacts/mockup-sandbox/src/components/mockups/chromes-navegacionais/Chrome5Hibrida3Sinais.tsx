import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

const ICONES = [
  { icone: "▢", label: "ADMIN", ativo: true, cor: p.gold },
  { icone: "✚", label: "CLÍNICA", cor: p.cyan },
  { icone: "$", label: "FINANCEIRO", cor: p.cyan },
  { icone: "☰", label: "CATÁLOGOS", cor: p.cyan },
  { icone: "⚙", label: "SISTEMA", cor: p.cyan },
];

const NIVEIS = [
  { label: "🏛 PAWARDS", cor: p.gold },
  { label: "ADMIN", cor: p.cyan },
  { label: "PLATAFORMA", cor: p.cyan },
  { label: "AUDITORIA", cor: p.gold, atual: true },
];

export function Chrome5Hibrida3Sinais() {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: p.mono, color: p.ink, paddingBottom: 32, display: "grid", gridTemplateColumns: "72px 1fr" }}>
      {/* SIDEBAR MINI — só ícones */}
      <aside
        style={{
          background: p.navy,
          borderRight: `1px solid ${p.border}`,
          padding: "12px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: p.gold,
            letterSpacing: 1.5,
            marginBottom: 8,
            textAlign: "center",
            padding: "4px 0",
            borderBottom: `1px solid ${p.border}`,
            width: "100%",
          }}
        >
          PW
        </div>
        {ICONES.map((it) => (
          <div
            key={it.label}
            style={{
              padding: "8px 4px",
              textAlign: "center",
              background: it.ativo ? `${p.gold}18` : "transparent",
              borderLeft: it.ativo ? `3px solid ${p.gold}` : "3px solid transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 18, color: it.cor, fontWeight: it.ativo ? 700 : 400 }}>{it.icone}</div>
            <div style={{ fontSize: 7, color: it.ativo ? it.cor : p.inkMute, letterSpacing: 0.5, marginTop: 2, wordBreak: "break-word" }}>
              {it.label}
            </div>
          </div>
        ))}
      </aside>

      {/* CONTEÚDO + BREADCRUMB */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* HEADER FINO */}
        <div
          style={{
            background: p.navy,
            borderBottom: `1px solid ${p.border}`,
            padding: "8px 20px",
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
            CAIO R. · <b style={{ color: p.gold }}>CEO</b>
          </div>
        </div>

        {/* BREADCRUMB FAIXA */}
        <div
          style={{
            background: p.navyPanel,
            borderBottom: `1px solid ${p.gold}`,
            padding: "0 20px",
            height: 36,
            display: "flex",
            alignItems: "center",
            position: "sticky",
            top: 34,
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
                  padding: "4px 8px",
                  fontWeight: n.atual ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {n.label}
              </span>
              {i < NIVEIS.length - 1 && (
                <span style={{ color: p.inkMute, fontSize: 12, padding: "0 2px" }}>/</span>
              )}
            </span>
          ))}
        </div>

        <main style={{ overflowY: "auto" }}>
          <MioloAuditoriaExemplo />
        </main>
      </div>

      {/* RODAPÉ STATUS */}
      <div
        style={{
          background: p.navy,
          borderTop: `2px solid ${p.gold}`,
          padding: "0 16px",
          height: 32,
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          color: p.inkDim,
          letterSpacing: 0.5,
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          gap: 16,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: p.cyan }}>◆</span>
          UNIDADE: <b style={{ color: p.ink }}>PÁDUA</b>
        </span>
        <span style={{ color: p.inkMute }}>·</span>
        <span>
          PERFIL: <b style={{ color: p.gold }}>CEO</b>
        </span>
        <span style={{ color: p.inkMute }}>·</span>
        <span>
          QUADRO:{" "}
          <span style={{ color: p.cyan }}>ADMIN</span>
          <span style={{ color: p.inkMute }}> / </span>
          <span style={{ color: p.cyan }}>PLATAFORMA</span>
          <span style={{ color: p.inkMute }}> / </span>
          <b style={{ color: p.gold }}>AUDITORIA</b>
        </span>
        <span style={{ marginLeft: "auto", color: p.inkMute }}>
          ░ 3-SINAIS · sidebar + breadcrumb + rodapé
        </span>
      </div>
    </div>
  );
}
