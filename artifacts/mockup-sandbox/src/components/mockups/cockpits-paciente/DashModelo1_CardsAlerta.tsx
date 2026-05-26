import { DashShell, DADOS } from "./_dashShell";
import { p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 1 · CARDS DE ALERTA (estilo kanban/Trello)
 *
 * Filosofia: cada demanda = um cartão clicável com borda colorida por severidade.
 * Layout: 3 colunas largas — ALERTAS CRÍTICOS | DEMANDAS DO DIA | AGENDA AO VIVO.
 * Cores: vermelho/dourado/ciano/verde por categoria. Zero texto branco corrido.
 */

export function DashModelo1_CardsAlerta() {
  return (
    <DashShell modeloNome="MODELO 1 · CARDS DE ALERTA">
      {/* Faixa KPI superior com mini-bolhas coloridas */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8,
        padding: "14px 22px 0",
      }}>
        {DADOS.KPIS.map(k => (
          <div key={k.lab} className="pwd-kpi" style={{
            borderTop: `3px solid ${k.cor}`, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{k.lab}</div>
            <div style={{ fontSize: 22, color: k.cor, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", textShadow: `0 0 10px ${k.cor}66` }}>{k.v}</div>
            <div style={{ fontSize: 10, color: p.inkDim, marginTop: 4, letterSpacing: ls.suave, lineHeight: 1.4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 3 colunas kanban */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
        padding: "16px 22px 22px",
      }}>
        {/* COLUNA 1 · ALERTAS CRÍTICOS */}
        <Coluna titulo="ALERTAS CRÍTICOS DO MOTOR" cor="#FF9A9A" badge="3 AGORA">
          {DADOS.ALERTAS_CRITICOS.map((a, i) => (
            <div key={i} className="pwd-card-alerta" style={{ color: a.cor }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte }}>{a.contexto}</span>
              </div>
              <div style={{ fontSize: 13, color: p.ink, letterSpacing: ls.forte, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: p.cyan, letterSpacing: ls.suave, marginBottom: 10 }}>{a.paciente}</div>
              <button className="pwd-btn" style={{ fontSize: 10, padding: "6px 12px", width: "100%" }}>{a.acao}</button>
            </div>
          ))}
        </Coluna>

        {/* COLUNA 2 · DEMANDAS OPERACIONAIS */}
        <Coluna titulo="DEMANDAS OPERACIONAIS" cor={p.gold} badge="23 ITENS · 5 CRÍTICOS">
          {DADOS.FILAS.map((f, i) => (
            <div key={i} className="pwd-card-alerta" style={{ color: f.cor }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: f.cor, letterSpacing: ls.forte, fontWeight: 700, textShadow: `0 0 6px ${f.cor}66` }}>{f.titulo}</span>
                <span style={{ fontSize: 22, color: f.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{f.n}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: p.inkDim, letterSpacing: ls.forte, marginTop: 4 }}>
                <span>MAIS ANTIGO · <span style={{ color: f.cor }}>{f.acaoMax}</span></span>
                <span style={{ color: p.gold }}>ABRIR FILA ▸</span>
              </div>
            </div>
          ))}
        </Coluna>

        {/* COLUNA 3 · AGENDA AO VIVO */}
        <Coluna titulo="AGENDA AO VIVO · HOJE" cor={p.cyan} badge="5 SESSÕES">
          {DADOS.AGENDA.map((s, i) => {
            const stCor = s.st === "EM CURSO" ? p.gold : "#5FE6CC";
            return (
              <div key={i} className="pwd-card-alerta" style={{ color: stCor }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: p.gold, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.dh.replace("HOJE · ", "")}</span>
                  <span className="pwd-tag" style={{ color: stCor, borderColor: stCor }}>{s.st}</span>
                </div>
                <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, letterSpacing: ls.suave, marginBottom: 2 }}>{s.pac}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: p.inkDim, letterSpacing: ls.forte, marginTop: 4 }}>
                  <span style={{ color: pasteis.admin.neon }}>{s.tipo}</span>
                  <span>{s.sala}</span>
                </div>
              </div>
            );
          })}
        </Coluna>
      </div>
    </DashShell>
  );
}

function Coluna({ titulo, cor, badge, children }: { titulo: string; cor: string; badge: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: p.navyDeep, border: `1px solid ${p.border}`, borderTop: `3px solid ${cor}`,
      padding: 14, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.4)`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${p.borderSoft}` }}>
        <span style={{ fontSize: 11, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, textShadow: `0 0 8px ${cor}55` }}>{titulo}</span>
        <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{badge}</span>
      </div>
      {children}
    </section>
  );
}
