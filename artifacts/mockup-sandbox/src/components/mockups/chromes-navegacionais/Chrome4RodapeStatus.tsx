import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

export function Chrome4RodapeStatus() {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: p.mono, color: p.ink, paddingBottom: 32 }}>
      {/* HEADER MÍNIMO — só pra contexto, foco é o rodapé */}
      <div
        style={{
          background: p.navy,
          borderBottom: `1px solid ${p.border}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, color: p.gold }}>PAWARDS MEDCORE</div>
        <div style={{ fontSize: 10, color: p.inkDim }}>26/MAI/2026 · 09:14</div>
      </div>

      <MioloAuditoriaExemplo />

      {/* RODAPÉ STATUS WINDOWS-CLÁSSICO — sticky bottom */}
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
        <span style={{ marginLeft: "auto", color: p.inkMute, display: "flex", alignItems: "center", gap: 12 }}>
          <span>● 2FA OK (4h restantes)</span>
          <span style={{ color: p.cyan, border: `1px solid ${p.cyan}40`, padding: "2px 8px", letterSpacing: 1 }}>
            ⌘← VOLTAR
          </span>
        </span>
      </div>
    </div>
  );
}
