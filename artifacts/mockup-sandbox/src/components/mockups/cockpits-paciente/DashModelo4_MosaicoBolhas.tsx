import { DashShell, DADOS, VERDE_DOS } from "./_dashShell";
import { p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 4 · MOSAICO DE BOLHAS DE DEMANDAS
 *
 * Filosofia: bolhas grandes coloridas com contagem central, escaneáveis de longe.
 * Inspirado no primeiro dashboard "que ele gostou" — quadros de alerta tipo bolha.
 * Hover faz a bolha pulsar/respirar. Click abre detalhe.
 */

export function DashModelo4_MosaicoBolhas() {
  return (
    <DashShell modeloNome="MODELO 4 · MOSAICO DE BOLHAS">
      <div style={{ padding: "14px 22px 22px" }}>

        {/* Header KPI compacto */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
          {DADOS.KPIS.map(k => (
            <div key={k.lab} className="pwd-kpi" style={{ padding: "11px 13px", borderTop: `2px solid ${k.cor}` }}>
              <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{k.lab}</div>
              <div style={{ fontSize: 20, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, textShadow: `0 0 8px ${k.cor}66` }}>{k.v}</div>
              <div style={{ fontSize: 10, color: p.inkDim, marginTop: 4, letterSpacing: ls.suave }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* GRID 4 BOLHAS GRANDES · DEMANDAS DO DIA */}
        <Secao titulo="DEMANDAS OPERACIONAIS · CLIQUE PRA ABRIR" cor={p.gold} badge="23 ITENS · 5 CRÍTICOS">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {DADOS.FILAS.map((f, i) => (
              <div key={i} className="pwd-bolha" style={{ color: f.cor }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>DOMÍNIO</span>
                  <span className="pwd-tag" style={{ color: VERDE_DOS, borderColor: VERDE_DOS, fontSize: 9 }}>SLA OK</span>
                </div>
                <div style={{ fontSize: 64, color: f.cor, fontWeight: 700, lineHeight: 1, textAlign: "center", fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${f.cor}, 0 0 48px ${f.cor}66`, marginBottom: 8 }}>{f.n}</div>
                <div style={{ fontSize: 11, color: f.cor, fontWeight: 700, letterSpacing: ls.forte, textAlign: "center", textShadow: `0 0 6px ${f.cor}55`, marginBottom: 8 }}>{f.titulo}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 9, color: p.inkDim, letterSpacing: ls.forte }}>MAIS ANTIGO</span>
                  <span style={{ fontSize: 9, color: f.cor, letterSpacing: ls.forte, fontWeight: 700 }}>{f.acaoMax}</span>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* GRID 3 BOLHAS · ALERTAS DO MOTOR */}
        <div style={{ marginTop: 16 }}>
          <Secao titulo="ALERTAS CRÍTICOS DO MOTOR" cor="#FF9A9A" badge="3 AGORA · AÇÃO REQUERIDA">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {DADOS.ALERTAS_CRITICOS.map((a, i) => (
                <div key={i} className="pwd-bolha" style={{ color: a.cor, aspectRatio: "1.8/1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                    <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{a.contexto}</span>
                  </div>
                  <div style={{ fontSize: 14, color: p.ink, fontWeight: 700, letterSpacing: ls.forte, lineHeight: 1.3, marginBottom: 6, textShadow: `0 0 6px ${a.cor}44` }}>{a.titulo}</div>
                  <div style={{ fontSize: 11, color: p.cyan, letterSpacing: ls.suave, fontWeight: 700, marginBottom: 12 }}>{a.paciente}</div>
                  <button className="pwd-btn" style={{ fontSize: 10, padding: "7px 12px", width: "100%" }}>{a.acao}</button>
                </div>
              ))}
            </div>
          </Secao>
        </div>

        {/* GRID 7 BOLHAS PEQUENAS · CHECKPOINTS */}
        <div style={{ marginTop: 16 }}>
          <Secao titulo="CHECKPOINTS · LINHA DO TEMPO" cor="#FFA3C8" badge="7 DISPAROS PROGRAMADOS">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
              {DADOS.CHECKPOINTS.map((c, i) => {
                const canalCor = c.canal === "WHATSAPP" ? "#5FE6CC" : c.canal === "EMAIL" ? p.cyan : c.canal === "TELEFONE" ? "#FFA3C8" : p.gold;
                return (
                  <div key={i} className="pwd-bolha" style={{ color: canalCor, aspectRatio: "1/1.1", padding: 12 }}>
                    <div style={{ fontSize: 18, color: p.gold, fontWeight: 700, textAlign: "center", letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 8, textShadow: "0 0 8px rgba(245,201,122,0.6)" }}>{c.tempo}</div>
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <span className="pwd-tag" style={{ color: canalCor, borderColor: canalCor, fontSize: 9 }}>{c.canal}</span>
                    </div>
                    <div style={{ fontSize: 10, color: p.ink, lineHeight: 1.4, textAlign: "center", letterSpacing: ls.suave, marginBottom: 6, fontWeight: 500 }}>{c.acao}</div>
                    <div style={{ fontSize: 9, color: p.cyan, textAlign: "center", letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: 700 }}>{c.resp}</div>
                  </div>
                );
              })}
            </div>
          </Secao>
        </div>

        {/* AGENDA EM TIMELINE HORIZONTAL DE BOLHAS */}
        <div style={{ marginTop: 16 }}>
          <Secao titulo="AGENDA HOJE · TIMELINE DE SESSÕES" cor={pasteis.admin.neon} badge="5 · 11:14 AGORA">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {DADOS.AGENDA.map((s, i) => {
                const stCor = s.st === "EM CURSO" ? p.gold : "#5FE6CC";
                return (
                  <div key={i} className="pwd-bolha" style={{ color: stCor, aspectRatio: "1.4/1", padding: 12 }}>
                    <div style={{ fontSize: 20, color: p.gold, fontWeight: 700, textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 6, textShadow: "0 0 10px rgba(245,201,122,0.6)" }}>{s.dh.replace("HOJE · ", "")}</div>
                    <div style={{ fontSize: 11, color: p.ink, textAlign: "center", fontWeight: 700, letterSpacing: ls.suave, marginBottom: 4 }}>{s.pac}</div>
                    <div style={{ fontSize: 10, color: pasteis.admin.neon, textAlign: "center", letterSpacing: ls.forte, fontWeight: 700, marginBottom: 8 }}>{s.tipo}</div>
                    <div style={{ textAlign: "center" }}>
                      <span className="pwd-tag" style={{ color: stCor, borderColor: stCor, fontSize: 9 }}>{s.st}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Secao>
        </div>
      </div>
    </DashShell>
  );
}

function Secao({ titulo, cor, badge, children }: { titulo: string; cor: string; badge: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${cor}` }}>
        <span style={{ fontSize: 12, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, textShadow: `0 0 8px ${cor}55` }}>{titulo}</span>
        <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{badge}</span>
      </div>
      {children}
    </section>
  );
}
