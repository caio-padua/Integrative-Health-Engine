import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

export function Chrome3HeaderPlaca() {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: p.mono, color: p.ink }}>
      {/* HEADER PLACA HOSPITAL — 2 linhas grandes */}
      <div
        style={{
          background: p.navy,
          borderBottom: `3px solid ${p.gold}`,
          padding: "18px 32px 22px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* LINHA 1 — quadro PAI */}
          <div
            style={{
              fontSize: 11,
              letterSpacing: 3,
              color: p.cyan,
              textTransform: "uppercase",
              borderLeft: `3px solid ${p.cyan}`,
              paddingLeft: 10,
              marginBottom: 8,
            }}
          >
            ◂ PLATAFORMA — MASTER
          </div>
          {/* LINHA 2 — cômodo atual em fonte grande */}
          <div
            style={{
              fontSize: 34,
              letterSpacing: 4,
              color: p.gold,
              textTransform: "uppercase",
              fontWeight: 700,
              borderLeft: `3px solid ${p.gold}`,
              paddingLeft: 10,
              lineHeight: 1,
            }}
          >
            AUDITORIA
          </div>
          <div style={{ fontSize: 10, color: p.inkMute, marginTop: 8, paddingLeft: 13, letterSpacing: 1.5 }}>
            ░ SALA · KILL-SWITCH · IMUTÁVEL · LGPD/CFM
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: p.gold }}>PAWARDS MEDCORE</div>
          <div style={{ fontSize: 11, color: p.ink, marginTop: 4 }}>CAIO R.</div>
          <div style={{ fontSize: 10, color: p.inkDim, marginTop: 2 }}>
            PERFIL <b style={{ color: p.gold }}>CEO</b>
          </div>
        </div>
      </div>

      <MioloAuditoriaExemplo />
    </div>
  );
}
