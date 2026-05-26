import { DashShell, DADOS, VERDE_DOS } from "./_dashShell";
import { p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 5 · BRIEFING EXECUTIVO (estilo jornal/dossiê matinal)
 *
 * Filosofia: layout editorial tipo "briefing das 8h do CEO".
 * Seções nomeadas com manchetes coloridas, dados em colunas com hierarquia jornalística.
 * Tudo escaneável em ordem de prioridade: O QUE QUEIMA AGORA → DEMANDAS → PROGRAMAÇÃO.
 */

export function DashModelo5_BriefingExecutivo() {
  return (
    <DashShell modeloNome="MODELO 5 · BRIEFING EXECUTIVO">
      <div style={{ padding: "14px 22px 22px" }}>

        {/* MANCHETE · resumo executivo */}
        <div style={{
          background: "linear-gradient(180deg, " + p.navyPanel + " 0%, " + p.navyDeep + " 100%)",
          border: `1px solid ${p.gold}`, borderLeft: `4px solid ${p.gold}`,
          padding: "16px 20px", marginBottom: 16,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px ${p.gold}22, 0 2px 8px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, marginBottom: 4 }}>BRIEFING MATINAL</div>
              <div style={{ fontSize: 22, color: p.gold, fontWeight: 700, letterSpacing: ls.forte, fontFamily: fonte.familia, textShadow: "0 0 10px rgba(245,201,122,0.6)" }}>27/MAI · QUI</div>
              <div style={{ fontSize: 11, color: p.inkDim, letterSpacing: ls.suave, marginTop: 2 }}>edição 11:14 BRT · ciclo #14</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
              {DADOS.KPIS.map(k => (
                <div key={k.lab}>
                  <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 3 }}>{k.lab}</div>
                  <div style={{ fontSize: 20, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, textShadow: `0 0 8px ${k.cor}55` }}>{k.v}</div>
                  <div style={{ fontSize: 9, color: p.inkDim, marginTop: 2, letterSpacing: ls.suave }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>STATUS GERAL</div>
              <div className="pwd-tag" style={{ color: VERDE_DOS, borderColor: VERDE_DOS, fontSize: 14, padding: "6px 14px" }}>OPERANDO</div>
            </div>
          </div>
        </div>

        {/* 3 COLUNAS EDITORIAIS */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>

          {/* COLUNA 1 · O QUE QUEIMA AGORA (alertas críticos do motor) */}
          <ColunaEditorial titulo="O QUE QUEIMA AGORA" cor="#FF9A9A" subtitulo="alertas críticos do motor v4">
            {DADOS.ALERTAS_CRITICOS.map((a, i) => (
              <article key={i} style={{
                padding: "12px 0",
                borderTop: i > 0 ? `1px solid ${p.borderSoft}` : "none",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                  <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{a.contexto}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 14, color: p.ink, fontWeight: 700, letterSpacing: ls.forte, lineHeight: 1.3, fontFamily: fonte.familia }}>{a.titulo}</h3>
                <div style={{ fontSize: 11, color: p.cyan, letterSpacing: ls.suave, marginTop: 4, marginBottom: 8, fontWeight: 700 }}>{a.paciente}</div>
                <button className="pwd-btn" style={{ fontSize: 10, padding: "6px 12px" }}>{a.acao}</button>
              </article>
            ))}
          </ColunaEditorial>

          {/* COLUNA 2 · DEMANDAS DO TIME */}
          <ColunaEditorial titulo="DEMANDAS DO TIME" cor={p.gold} subtitulo="23 itens · 5 críticos">
            {DADOS.FILAS.map((f, i) => (
              <article key={i} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                gap: 12, padding: "12px 0", alignItems: "center",
                borderTop: i > 0 ? `1px solid ${p.borderSoft}` : "none",
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 12, color: f.cor, fontWeight: 700, letterSpacing: ls.forte, fontFamily: fonte.familia, textShadow: `0 0 6px ${f.cor}55` }}>{f.titulo}</h3>
                  <div style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave, marginTop: 3 }}>mais antigo · <span style={{ color: f.cor }}>{f.acaoMax}</span></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, color: f.cor, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 10px ${f.cor}88` }}>{f.n}</div>
                  <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginTop: 2 }}>itens</div>
                </div>
              </article>
            ))}
          </ColunaEditorial>

          {/* COLUNA 3 · ACONTECE HOJE */}
          <ColunaEditorial titulo="ACONTECE HOJE" cor={pasteis.admin.neon} subtitulo="5 sessões · 11:14 agora">
            {DADOS.AGENDA.map((s, i) => {
              const stCor = s.st === "EM CURSO" ? p.gold : "#5FE6CC";
              return (
                <article key={i} style={{
                  display: "grid", gridTemplateColumns: "60px 1fr auto",
                  gap: 10, padding: "10px 0", alignItems: "center",
                  borderTop: i > 0 ? `1px solid ${p.borderSoft}` : "none",
                }}>
                  <div style={{ fontSize: 14, color: p.gold, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{s.dh.replace("HOJE · ", "")}</div>
                  <div>
                    <div style={{ fontSize: 11, color: p.ink, fontWeight: 700, letterSpacing: ls.suave }}>{s.pac}</div>
                    <div style={{ fontSize: 10, color: pasteis.admin.neon, letterSpacing: ls.forte, marginTop: 2, fontWeight: 700 }}>{s.tipo} · <span style={{ color: p.inkDim }}>{s.sala}</span></div>
                  </div>
                  <span className="pwd-tag" style={{ color: stCor, borderColor: stCor }}>{s.st}</span>
                </article>
              );
            })}
          </ColunaEditorial>
        </div>

        {/* RODAPÉ · CHECKPOINTS COMO "AGENDA EDITORIAL" em 7 colunas */}
        <section style={{ marginTop: 16, background: p.navyDeep, border: `1px solid ${p.border}`, borderLeft: `4px solid #FFA3C8`, padding: "16px 20px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, color: "#FFA3C8", fontWeight: 700, letterSpacing: ls.forte, fontFamily: fonte.familia, textShadow: "0 0 8px rgba(255,163,200,0.55)" }}>PRÓXIMOS DISPAROS · FOLLOW-UP</h2>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginTop: 2 }}>142 checkpoints programados nos próximos 90 dias</div>
            </div>
            <span className="pwd-tag" style={{ color: p.gold, borderColor: p.gold }}>VER TODOS · 142 ▸</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
            {DADOS.CHECKPOINTS.map((c, i) => {
              const canalCor = c.canal === "WHATSAPP" ? "#5FE6CC" : c.canal === "EMAIL" ? p.cyan : c.canal === "TELEFONE" ? "#FFA3C8" : p.gold;
              return (
                <div key={i} style={{
                  borderLeft: `2px solid ${canalCor}`, paddingLeft: 10,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <span style={{ fontSize: 14, color: p.gold, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{c.tempo}</span>
                  <span className="pwd-tag" style={{ color: canalCor, borderColor: canalCor, alignSelf: "flex-start" }}>{c.canal}</span>
                  <span style={{ fontSize: 11, color: p.ink, letterSpacing: ls.suave, lineHeight: 1.4, fontWeight: 500 }}>{c.acao}</span>
                  <span style={{ fontSize: 10, color: p.cyan, letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: 700, marginTop: "auto" }}>{c.resp}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashShell>
  );
}

function ColunaEditorial({ titulo, cor, subtitulo, children }: { titulo: string; cor: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: p.navyDeep, border: `1px solid ${p.border}`, borderTop: `4px solid ${cor}`,
      padding: "14px 16px",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
    }}>
      <header style={{ marginBottom: 8, paddingBottom: 10, borderBottom: `1px solid ${cor}55` }}>
        <h2 style={{ margin: 0, fontSize: 13, color: cor, fontWeight: 700, letterSpacing: ls.forte, fontFamily: fonte.familia, textShadow: `0 0 8px ${cor}66` }}>{titulo}</h2>
        <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, marginTop: 3 }}>{subtitulo}</div>
      </header>
      {children}
    </section>
  );
}
