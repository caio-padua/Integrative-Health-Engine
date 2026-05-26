import { DashShell, DADOS } from "./_dashShell";
import { p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 2 · COLUNAS DENSAS (estilo tabela financeira / Bloomberg)
 *
 * Filosofia: TUDO em colunas verticais estritas, cada campo na sua coluna.
 * Tempo, canal, ação, paciente, responsável — cada um EMPILHADO verticalmente.
 * Header de coluna fixo, alinhamento decimal nas datas/horas.
 * Texto colorido por categoria. Zero prosa.
 */

export function DashModelo2_ColunasDensas() {
  const canalCor = (c: string) => c === "WHATSAPP" ? "#5FE6CC" : c === "EMAIL" ? p.cyan : c === "TELEFONE" ? "#FFA3C8" : p.gold;
  return (
    <DashShell modeloNome="MODELO 2 · COLUNAS DENSAS">
      <div style={{ padding: "14px 22px 22px" }}>

        {/* KPI cabeçalho em coluna */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, marginBottom: 16, border: `1px solid ${p.border}`, background: p.navyDeep, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.4)" }}>
          {DADOS.KPIS.map((k, i) => (
            <div key={k.lab} style={{
              padding: "12px 14px",
              borderLeft: i === 0 ? "none" : `1px solid ${p.borderSoft}`,
              borderTop: `2px solid ${k.cor}`,
              display: "flex", flexDirection: "column", alignItems: "flex-start",
            }}>
              <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, marginBottom: 6 }}>{k.lab}</div>
              <div style={{ fontSize: 22, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte, lineHeight: 1, textShadow: `0 0 8px ${k.cor}55`, marginBottom: 6 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave, fontFamily: fonte.familia }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* GRID 2 colunas grandes */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>

          {/* ESQUERDA · CHECKPOINTS em colunas estritas */}
          <Bloco titulo="CHECKPOINTS PROGRAMADOS · 142 DISPAROS" cor="#FFA3C8" badge="3 PENDÊNCIAS HOJE">
            <div style={{ display: "grid", gridTemplateColumns: "90px 120px 1fr 110px 50px", background: p.navyPanelAlt, padding: "10px 12px", borderBottom: `1px solid ${p.gold}` }}>
              <ColHead>TEMPO</ColHead>
              <ColHead>CANAL</ColHead>
              <ColHead>AÇÃO</ColHead>
              <ColHead align="right">RESPONSÁVEL</ColHead>
              <ColHead align="right">SEV</ColHead>
            </div>
            {DADOS.CHECKPOINTS.map((c, i) => {
              const sevCor = c.sev === "alta" ? "#FF9A9A" : c.sev === "media" ? "#F5C97A" : p.inkMute;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "90px 120px 1fr 110px 50px",
                  padding: "11px 12px",
                  borderBottom: `1px solid ${p.borderSoft}`,
                  alignItems: "center",
                  transition: "background 120ms",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(51,255,102,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ color: p.gold, fontFamily: fonte.familia, fontSize: 12, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{c.tempo}</div>
                  <div><span className="pwd-tag" style={{ color: canalCor(c.canal), borderColor: canalCor(c.canal) }}>{c.canal}</span></div>
                  <div style={{ color: p.ink, fontSize: 12, letterSpacing: ls.suave, lineHeight: 1.4 }}>{c.acao}</div>
                  <div style={{ color: p.cyan, fontSize: 11, letterSpacing: ls.forte, fontFamily: fonte.familia, textAlign: "right" }}>{c.resp}</div>
                  <div style={{ textAlign: "right" }}><span style={{ display: "inline-block", width: 10, height: 10, background: sevCor, boxShadow: `0 0 8px ${sevCor}` }} /></div>
                </div>
              );
            })}
          </Bloco>

          {/* DIREITA · FILAS empilhadas em colunas */}
          <Bloco titulo="FILA OPERACIONAL · POR DOMÍNIO" cor="#F5C97A" badge="23 · 5 CRÍTICOS">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 90px", background: p.navyPanelAlt, padding: "10px 12px", borderBottom: `1px solid ${p.gold}` }}>
              <ColHead>DOMÍNIO</ColHead>
              <ColHead align="right">QTD</ColHead>
              <ColHead align="right">MAIS ANT.</ColHead>
              <ColHead align="right">SLA</ColHead>
            </div>
            {DADOS.FILAS.map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 60px 80px 90px",
                padding: "13px 12px", borderBottom: `1px solid ${p.borderSoft}`, alignItems: "center",
                transition: "background 120ms",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(51,255,102,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ color: f.cor, fontSize: 12, fontWeight: 700, letterSpacing: ls.forte, textShadow: `0 0 6px ${f.cor}55` }}>{f.titulo}</div>
                <div style={{ color: f.cor, fontSize: 18, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{f.n}</div>
                <div style={{ color: p.inkDim, fontSize: 11, textAlign: "right", letterSpacing: ls.forte, fontFamily: fonte.familia }}>{f.acaoMax}</div>
                <div style={{ textAlign: "right" }}><span className="pwd-tag" style={{ color: "#5FE6CC", borderColor: "#5FE6CC" }}>OK</span></div>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: "14px 12px 0", borderTop: `1px solid ${p.gold}` }}>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, marginBottom: 10 }}>ALERTAS CRÍTICOS DO MOTOR</div>
              {DADOS.ALERTAS_CRITICOS.map((a, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: 10,
                  padding: "8px 0", borderBottom: i < DADOS.ALERTAS_CRITICOS.length - 1 ? `1px solid ${p.borderSoft}` : "none",
                  alignItems: "center",
                }}>
                  <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                  <div>
                    <div style={{ fontSize: 11, color: p.ink, letterSpacing: ls.suave, fontWeight: 700 }}>{a.titulo}</div>
                    <div style={{ fontSize: 10, color: p.cyan, marginTop: 2 }}>{a.paciente}</div>
                  </div>
                  <button className="pwd-btn" style={{ fontSize: 9, padding: "5px 8px" }}>ABRIR</button>
                </div>
              ))}
            </div>
          </Bloco>
        </div>

        {/* AGENDA em coluna densa */}
        <div style={{ marginTop: 14 }}>
          <Bloco titulo="AGENDA HOJE · LINHA DO TEMPO" cor={pasteis.admin.neon} badge="5 SESSÕES · 11:14 AGORA">
            <div style={{ display: "grid", gridTemplateColumns: "100px 80px 1fr 1fr 140px 130px 110px", background: p.navyPanelAlt, padding: "10px 12px", borderBottom: `1px solid ${p.gold}` }}>
              <ColHead>HORA</ColHead><ColHead>SESSÃO</ColHead><ColHead>PACIENTE</ColHead><ColHead>SALA</ColHead><ColHead>TIPO</ColHead><ColHead>RESPONSÁVEL</ColHead><ColHead align="right">STATUS</ColHead>
            </div>
            {DADOS.AGENDA.map((s, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "100px 80px 1fr 1fr 140px 130px 110px",
                padding: "11px 12px", borderBottom: `1px solid ${p.borderSoft}`, alignItems: "center",
                transition: "background 120ms",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(51,255,102,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ color: p.gold, fontSize: 12, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{s.dh.replace("HOJE · ", "")}</div>
                <div><span className="pwd-tag" style={{ color: p.gold, borderColor: p.gold }}>{s.sn}</span></div>
                <div style={{ color: p.ink, fontSize: 12, letterSpacing: ls.suave }}>{s.pac}</div>
                <div style={{ color: p.inkDim, fontSize: 11, letterSpacing: ls.suave }}>{s.sala}</div>
                <div style={{ color: pasteis.admin.neon, fontSize: 11, letterSpacing: ls.forte, fontWeight: 700 }}>{s.tipo}</div>
                <div style={{ color: p.cyan, fontSize: 11, letterSpacing: ls.forte }}>{s.resp}</div>
                <div style={{ textAlign: "right" }}>
                  <span className="pwd-tag" style={{
                    color: s.st === "EM CURSO" ? p.gold : "#5FE6CC",
                    borderColor: s.st === "EM CURSO" ? p.gold : "#5FE6CC",
                  }}>{s.st}</span>
                </div>
              </div>
            ))}
          </Bloco>
        </div>
      </div>
    </DashShell>
  );
}

function Bloco({ titulo, cor, badge, children }: { titulo: string; cor: string; badge: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: p.navyDeep, border: `1px solid ${p.border}`, borderLeft: `3px solid ${cor}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 14px", background: p.navyPanelAlt, borderBottom: `1px solid ${p.border}` }}>
        <span style={{ fontSize: 11, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, textShadow: `0 0 8px ${cor}55` }}>{titulo}</span>
        <span className="pwd-tag" style={{ color: p.gold, borderColor: `${p.gold}55` }}>{badge}</span>
      </div>
      {children}
    </section>
  );
}

function ColHead({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: 700, textAlign: align ?? "left" }}>{children}</div>;
}
