import { CockpitShell, HeaderPaciente, BlocoCockpit, KpiMini, Donut, ChipStatus, Sparkline, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";

/**
 * COCKPIT 5 · CIRCADIANO TÁTICO
 * Dia-a-dia do paciente: linha do tempo 24h horizontal, posologia visual,
 * aderência por janela, eventos. Pra acompanhamento real.
 */
export function Cockpit5Circadiano() {
  const horas = Array.from({ length: 24 }, (_, i) => i);
  const tomadas = [
    { hora: 7,  med: "VITAMINA D3",      cor: p.gold,        status: "OK" },
    { hora: 8,  med: "DHEA + RESVERATROL", cor: pasteis.admin.neon, status: "OK" },
    { hora: 12, med: "FÓRMULA BLAND",    cor: "#FFA3C8",     status: "ATRASO 2H" },
    { hora: 18, med: "MAGNÉSIO",         cor: p.cyan,        status: "OK" },
    { hora: 22, med: "MELATONINA",       cor: "#A89DFF",     status: "OK" },
  ];

  return (
    <CockpitShell>
      <HeaderPaciente />

      {/* ═══ BLOCO 1: HOJE · 24H HORIZONTAL ═══ */}
      <BlocoCockpit sigla="24H" titulo="HOJE · 26/MAI/2026 · QUARTA" cor={p.cyan} status="5 TOMADAS · 4 OK · 1 ATRASO" statusCor="#F5C97A">
        <div style={{ background: p.navyDeep, padding: "16px 12px", border: `1px solid ${p.border}`, position: "relative", overflow: "hidden" }}>
          {/* Régua 24h */}
          <div style={{ display: "flex", borderBottom: `1px solid ${p.border}`, paddingBottom: 6, marginBottom: 12 }}>
            {horas.map((h) => (
              <div key={h} style={{ flex: 1, textAlign: "center", fontSize: 8, color: h % 6 === 0 ? p.gold : p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: h % 6 === 0 ? 700 : 500 }}>
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
          {/* Trilha de tomadas */}
          <div style={{ position: "relative", height: 80 }}>
            {/* Faixas circadianas */}
            <div style={{ position: "absolute", left: `${(0 / 24) * 100}%`,  width: `${(6 / 24) * 100}%`,  top: 0, bottom: 0, background: "rgba(168,157,255,0.06)" }} />
            <div style={{ position: "absolute", left: `${(6 / 24) * 100}%`,  width: `${(12 / 24) * 100}%`, top: 0, bottom: 0, background: "rgba(255,210,122,0.05)" }} />
            <div style={{ position: "absolute", left: `${(18 / 24) * 100}%`, width: `${(6 / 24) * 100}%`,  top: 0, bottom: 0, background: "rgba(168,157,255,0.06)" }} />
            {/* Linha do agora */}
            <div className="pawards-piscar" style={{ position: "absolute", left: `${(11.2 / 24) * 100}%`, top: 0, bottom: -8, width: 2, background: p.gold, boxShadow: `0 0 10px ${p.gold}` }}>
              <div style={{ position: "absolute", top: -12, left: -22, fontSize: 8, color: p.gold, letterSpacing: ls.forte, fontWeight: 700, whiteSpace: "nowrap" }}>AGORA · 11:12</div>
            </div>
            {/* Tomadas */}
            {tomadas.map((t, i) => (
              <div key={i} style={{ position: "absolute", left: `${(t.hora / 24) * 100}%`, top: 14, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 26, height: 26, background: t.cor, borderRadius: "50%", boxShadow: `0 0 12px ${t.cor}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.navyDeep, fontSize: 10, fontWeight: 700, fontFamily: fonte.familia }}>
                  {t.status === "OK" ? "✓" : "!"}
                </div>
                <div style={{ fontSize: 8, color: t.cor, letterSpacing: ls.forte, fontWeight: 700, whiteSpace: "nowrap", fontFamily: fonte.familia, textAlign: "center" }}>
                  {t.med}<br /><span style={{ color: p.inkMute, fontWeight: 500 }}>{String(t.hora).padStart(2, "0")}:00 · {t.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 14, fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "rgba(168,157,255,0.4)", marginRight: 4, verticalAlign: "middle" }} />NOITE</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "rgba(255,210,122,0.4)", marginRight: 4, verticalAlign: "middle" }} />DIA</span>
            <span style={{ marginLeft: "auto", color: p.gold, fontWeight: 700 }}>● AGORA · 11:12</span>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 2: ADERÊNCIA POR JANELA · 7 DIAS ═══ */}
      <BlocoCockpit sigla="ADR" titulo="ADERÊNCIA POR JANELA · ÚLTIMOS 7 DIAS" cor="#5FE6CC" status="MÉDIA 88%">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Donut pct={94} cor="#5FE6CC" label="MANHÃ · 06-12H"  sub="32 de 34 doses" />
          <Donut pct={86} cor={p.gold}  label="TARDE · 12-18H"  sub="24 de 28 doses" />
          <Donut pct={92} cor={p.cyan}  label="NOITE · 18-24H"  sub="11 de 12 doses" />
          <Donut pct={78} cor="#FFA3C8" label="MADRUGADA · 00-06H" sub="adicional ad-hoc" />
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 3: AGENDA SEMANAL VISUAL ═══ */}
      <BlocoCockpit sigla="SEM" titulo="AGENDA SEMANAL · 8 SEMANAS · POSOLOGIA" cor={pasteis.admin.neon} status="SEM 3 DE 8" statusCor={pasteis.admin.neon}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: fonte.familia }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>MEDICAÇÃO</th>
              {["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"].map((d) => (
                <th key={d} style={{ padding: "6px", color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { med: "NAD+ ENDOVENOSO",      dias: [0, 0, 1, 0, 0, 0, 0], cor: "#5FE6CC" },
              { med: "CoQ10 + PQQ IM",       dias: [1, 0, 0, 1, 0, 0, 0], cor: p.gold },
              { med: "VITAMINA D3 5000UI",   dias: [1, 1, 1, 1, 1, 1, 1], cor: pasteis.admin.neon },
              { med: "DHEA 25mg",            dias: [1, 1, 1, 1, 1, 1, 1], cor: pasteis.admin.neon },
              { med: "MAGNÉSIO BISGLIC.",    dias: [1, 1, 1, 1, 1, 1, 1], cor: p.cyan },
              { med: "MELATONINA 3mg",       dias: [1, 1, 1, 1, 1, 1, 1], cor: "#A89DFF" },
              { med: "FÓRMULA BLAND",        dias: [1, 1, 1, 1, 1, 0, 0], cor: "#FFA3C8" },
            ].map((row) => (
              <tr key={row.med} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                <td style={{ padding: "8px", color: p.ink, letterSpacing: ls.suave, fontWeight: 600 }}>{row.med}</td>
                {row.dias.map((d, i) => (
                  <td key={i} style={{ padding: "4px", textAlign: "center" }}>
                    {d ? (
                      <div style={{ background: row.cor, color: p.navyDeep, padding: "4px 0", fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, boxShadow: `0 0 4px ${row.cor}` }}>●</div>
                    ) : (
                      <div style={{ color: p.inkMute, padding: "4px 0", fontSize: 9 }}>—</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </BlocoCockpit>

      {/* ═══ BLOCO 4: EVENTOS RECENTES ═══ */}
      <BlocoCockpit sigla="EVT" titulo="EVENTOS RECENTES · 14 DIAS" cor={p.gold} status="3 NOVOS HOJE">
        <div style={{ position: "relative", paddingLeft: 16 }}>
          <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 2, background: p.gold, opacity: 0.4 }} />
          {[
            { hora: "11:12", t: "ATRASO POSOLOGIA",       det: "Fórmula Bland — 2h após o horário previsto",     cor: "#F5C97A" },
            { hora: "08:00", t: "TOMADA REGISTRADA",      det: "DHEA + Resveratrol — janela manhã",               cor: "#5FE6CC" },
            { hora: "07:00", t: "TOMADA REGISTRADA",      det: "Vitamina D3 — janela manhã",                      cor: "#5FE6CC" },
            { hora: "ONTEM 22:14", t: "TOMADA REGISTRADA", det: "Melatonina — janela noite",                       cor: "#5FE6CC" },
            { hora: "ONTEM 14:30", t: "SESSÃO PRESENCIAL", det: "Aplicação NAD+ EV — Dr. Marco · 45min",          cor: p.cyan },
            { hora: "25/MAI 09:00", t: "EXAME LABORATORIAL", det: "Cortisol 8h coletado — resultado em 48h",      cor: pasteis.admin.neon },
            { hora: "24/MAI 16:00", t: "AJUSTE PRESCRIÇÃO", det: "+ CoQ10 IM (queixa fadiga +1pt) — Dr. Marco",   cor: "#FFA3C8" },
          ].map((e, i) => (
            <div key={i} style={{ position: "relative", padding: "10px 0 10px 18px" }}>
              <span style={{ position: "absolute", left: -16, top: 14, width: 12, height: 12, background: e.cor, boxShadow: `0 0 8px ${e.cor}` }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, fontVariantNumeric: "tabular-nums", minWidth: 110 }}>{e.hora}</span>
                <span style={{ fontSize: 11, color: e.cor, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia }}>{e.t}</span>
                <span style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave, fontStyle: "italic" }}>{e.det}</span>
              </div>
            </div>
          ))}
        </div>
      </BlocoCockpit>
    </CockpitShell>
  );
}
