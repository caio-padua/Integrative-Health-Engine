import { DashShell, DADOS, VERDE_DOS } from "./_dashShell";
import { p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 3 · STACK DE CHIPS EMPILHADOS
 *
 * Filosofia: cada item é uma CARTA com chips coloridos empilhados verticalmente.
 * Tempo, canal, ação, responsável — cada um vira sua própria linha de chip.
 * Texto sem prosa, tudo categorizado. Dá pra ler de relance.
 */

export function DashModelo3_StackChips() {
  return (
    <DashShell modeloNome="MODELO 3 · STACK DE CHIPS">
      <div style={{ padding: "14px 22px 22px" }}>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
          {DADOS.KPIS.map(k => (
            <div key={k.lab} className="pwd-kpi" style={{ padding: "12px 14px", borderTop: `3px solid ${k.cor}` }}>
              <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6 }}>{k.lab}</div>
              <div style={{ fontSize: 24, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, textShadow: `0 0 10px ${k.cor}66`, marginBottom: 6 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave, lineHeight: 1.4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* 2 colunas: CHECKPOINTS como stack | DEMANDAS+ALERTAS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* CHECKPOINTS COMO STACK CARDS */}
          <section style={{ background: p.navyDeep, border: `1px solid ${p.border}`, borderTop: `3px solid #FFA3C8`, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)" }}>
            <Cabecalho titulo="CHECKPOINTS · STACK POR DEMANDA" cor="#FFA3C8" badge="7 PROGRAMADOS" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {DADOS.CHECKPOINTS.map((c, i) => {
                const canalCor = c.canal === "WHATSAPP" ? "#5FE6CC" : c.canal === "EMAIL" ? p.cyan : c.canal === "TELEFONE" ? "#FFA3C8" : p.gold;
                const sevCor = c.sev === "alta" ? "#FF9A9A" : c.sev === "media" ? "#F5C97A" : "#5FE6CC";
                return (
                  <div key={i} className="pwd-kpi" style={{ padding: "10px 12px", borderLeft: `3px solid ${sevCor}` }}>
                    {/* Linha 1: tempo (chip dourado) */}
                    <div style={{ marginBottom: 6 }}>
                      <span className="pwd-tag" style={{ color: p.gold, borderColor: p.gold, fontSize: 11 }}>{c.tempo}</span>
                    </div>
                    {/* Linha 2: canal */}
                    <div style={{ marginBottom: 6 }}>
                      <span className="pwd-tag" style={{ color: canalCor, borderColor: canalCor }}>{c.canal}</span>
                    </div>
                    {/* Linha 3: ação (texto) */}
                    <div style={{ fontSize: 12, color: p.ink, letterSpacing: ls.suave, lineHeight: 1.4, marginBottom: 6, fontWeight: 500 }}>{c.acao}</div>
                    {/* Linha 4: responsável */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: p.cyan, letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: 700 }}>{c.resp}</span>
                      <span style={{ fontSize: 9, color: sevCor, letterSpacing: ls.forte, textShadow: `0 0 4px ${sevCor}` }}>SEV {c.sev.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DEMANDAS + ALERTAS */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Filas (mini cards stack) */}
            <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, borderTop: `3px solid #F5C97A`, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)" }}>
              <Cabecalho titulo="FILAS · STACK POR DOMÍNIO" cor="#F5C97A" badge="23 ITENS" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {DADOS.FILAS.map((f, i) => (
                  <div key={i} className="pwd-kpi" style={{ padding: "12px", borderLeft: `3px solid ${f.cor}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 28, color: f.cor, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 10px ${f.cor}88` }}>{f.n}</span>
                      <span className="pwd-tag" style={{ color: VERDE_DOS, borderColor: VERDE_DOS }}>OK</span>
                    </div>
                    <div style={{ fontSize: 10, color: f.cor, letterSpacing: ls.forte, fontWeight: 700, marginBottom: 6, textShadow: `0 0 6px ${f.cor}55` }}>{f.titulo}</div>
                    <div style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave }}>mais antigo · <span style={{ color: f.cor }}>{f.acaoMax}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertas críticos stack */}
            <div style={{ background: p.navyDeep, border: `1px solid #FF9A9A55`, borderTop: `3px solid #FF9A9A`, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 14px rgba(255,154,154,0.18)" }}>
              <Cabecalho titulo="ALERTAS CRÍTICOS DO MOTOR" cor="#FF9A9A" badge="3 AGORA" />
              {DADOS.ALERTAS_CRITICOS.map((a, i) => (
                <div key={i} className="pwd-kpi" style={{ padding: "10px 12px", borderLeft: `3px solid ${a.cor}`, marginBottom: i < DADOS.ALERTAS_CRITICOS.length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                    <span className="pwd-tag" style={{ color: p.cyan, borderColor: p.cyan }}>{a.paciente.toUpperCase()}</span>
                    <span className="pwd-tag" style={{ color: p.inkMute, borderColor: p.borderSoft, boxShadow: "none" }}>{a.contexto.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, letterSpacing: ls.suave, marginBottom: 8, lineHeight: 1.3 }}>{a.titulo}</div>
                  <button className="pwd-btn" style={{ fontSize: 10, padding: "6px 12px" }}>{a.acao}</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* AGENDA STACK HORIZONTAL */}
        <section style={{ marginTop: 14, background: p.navyDeep, border: `1px solid ${p.border}`, borderTop: `3px solid ${pasteis.admin.neon}`, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)" }}>
          <Cabecalho titulo="AGENDA HOJE · CARDS HORIZONTAIS" cor={pasteis.admin.neon} badge="5 · 11:14" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {DADOS.AGENDA.map((s, i) => {
              const stCor = s.st === "EM CURSO" ? p.gold : "#5FE6CC";
              return (
                <div key={i} className="pwd-kpi" style={{ padding: 12, borderTop: `3px solid ${stCor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: p.gold, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{s.dh.replace("HOJE · ", "")}</span>
                    <span className="pwd-tag" style={{ color: p.gold, borderColor: p.gold }}>{s.sn}</span>
                  </div>
                  <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, letterSpacing: ls.suave, marginBottom: 6 }}>{s.pac}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, color: pasteis.admin.neon, letterSpacing: ls.forte, fontWeight: 700 }}>{s.tipo}</span>
                    <span style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave }}>{s.sala}</span>
                    <span style={{ fontSize: 10, color: p.cyan, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{s.resp}</span>
                  </div>
                  <div style={{ marginTop: 8 }}><span className="pwd-tag" style={{ color: stCor, borderColor: stCor, width: "100%", display: "block", textAlign: "center" }}>{s.st}</span></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashShell>
  );
}

function Cabecalho({ titulo, cor, badge }: { titulo: string; cor: string; badge: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${p.borderSoft}` }}>
      <span style={{ fontSize: 11, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, textShadow: `0 0 8px ${cor}55` }}>{titulo}</span>
      <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{badge}</span>
    </div>
  );
}
