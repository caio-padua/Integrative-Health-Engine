import { DashShell, DADOS } from "./_dashShell";
import { BlocoCockpit, p, ls, fonte, pasteis } from "./_pecasCockpit";

/**
 * MODELO 1 · SANFONA · CARDS DE ALERTA EMPILHADOS
 *
 * Fusão aprovada pelo CEO:
 *  · Mantém a vibe "cards de alerta" do Modelo 1 (cartões coloridos clicáveis)
 *  · MAS empilha os 3 grupos verticalmente como BlocoCockpit (minimiza/maximiza)
 *  · Cada bloco abre/fecha independente · ▾ FECHAR / ▸ EXPANDIR no canto
 *  · Faixa superior v4 com operador retângulo-dentro-retângulo
 */

export function DashModelo1_Sanfona() {
  return (
    <DashShell modeloNome="MODELO 1 · SANFONA · CARDS DE ALERTA">

      {/* ═══════════ BLOCO KPI · sempre visível ═══════════ */}
      <BlocoCockpit sigla="OPE" titulo="OPERAÇÃO HOJE · 27/MAI/2026 · QUINTA · 11:14 BRT" cor={p.cyan} status="EM CURSO">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {DADOS.KPIS.map(k => (
            <div key={k.lab} className="pwd-kpi" style={{ padding: "12px 14px", borderTop: `3px solid ${k.cor}` }}>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6 }}>{k.lab}</div>
              <div style={{ fontSize: 24, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte, lineHeight: 1, textShadow: `0 0 10px ${k.cor}66`, marginBottom: 6 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: p.inkDim, letterSpacing: ls.suave, lineHeight: 1.4 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 1 · ALERTAS CRÍTICOS DO MOTOR ═══════════ */}
      <BlocoCockpit sigla="ALT" titulo="ALERTAS CRÍTICOS DO MOTOR · AÇÃO REQUERIDA" cor="#FF9A9A" status="3 AGORA" statusCor="#FF9A9A">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {DADOS.ALERTAS_CRITICOS.map((a, i) => (
            <div key={i} className="pwd-card-alerta" style={{ color: a.cor, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="pwd-tag" style={{ color: a.cor, borderColor: a.cor }}>{a.sev}</span>
                <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>{a.contexto}</span>
              </div>
              <div style={{ fontSize: 13, color: p.ink, letterSpacing: ls.forte, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, fontFamily: fonte.familia }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: p.cyan, letterSpacing: ls.suave, marginBottom: 10, fontWeight: 700 }}>{a.paciente}</div>
              <button className="pwd-btn" style={{ fontSize: 10, padding: "6px 12px", width: "100%" }}>{a.acao}</button>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 2 · DEMANDAS OPERACIONAIS ═══════════ */}
      <BlocoCockpit sigla="DMD" titulo="DEMANDAS OPERACIONAIS · POR DOMÍNIO" cor={p.gold} status="23 ITENS · 5 CRÍTICOS" statusCor={p.gold}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {DADOS.FILAS.map((f, i) => (
            <div key={i} className="pwd-card-alerta" style={{ color: f.cor, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: f.cor, letterSpacing: ls.forte, fontWeight: 700, textShadow: `0 0 6px ${f.cor}66`, fontFamily: fonte.familia }}>{f.titulo}</span>
                <span style={{ fontSize: 26, color: f.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", textShadow: `0 0 10px ${f.cor}88` }}>{f.n}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: p.inkDim, letterSpacing: ls.forte, marginTop: 4, fontFamily: fonte.familia }}>
                <span>MAIS ANTIGO · <span style={{ color: f.cor }}>{f.acaoMax}</span></span>
                <span style={{ color: p.gold, fontWeight: 700 }}>ABRIR FILA ▸</span>
              </div>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 3 · AGENDA AO VIVO ═══════════ */}
      <BlocoCockpit sigla="AGD" titulo="AGENDA AO VIVO · HOJE" cor={p.cyan} status="5 SESSÕES · 11:14 AGORA" statusCor={p.gold}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {DADOS.AGENDA.map((s, i) => {
            const stCor = s.st === "EM CURSO" ? p.gold : "#5FE6CC";
            return (
              <div key={i} className="pwd-card-alerta" style={{ color: stCor, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: p.gold, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums", fontFamily: fonte.familia }}>{s.dh.replace("HOJE · ", "")}</span>
                  <span className="pwd-tag" style={{ color: stCor, borderColor: stCor }}>{s.st}</span>
                </div>
                <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, letterSpacing: ls.suave, marginBottom: 4, fontFamily: fonte.familia }}>{s.pac}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: p.inkDim, letterSpacing: ls.forte, marginTop: 4, fontFamily: fonte.familia }}>
                  <span style={{ color: pasteis.admin.neon, fontWeight: 700 }}>{s.tipo}</span>
                  <span>{s.sala}</span>
                </div>
                <div style={{ fontSize: 10, color: p.cyan, letterSpacing: ls.forte, fontWeight: 700, marginTop: 4, fontFamily: fonte.familia }}>{s.resp}</div>
              </div>
            );
          })}
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 4 · CHECKPOINTS FOLLOW-UP ═══════════ */}
      <BlocoCockpit sigla="FUP" titulo="CHECKPOINTS · LINHA DO TEMPO" cor="#FFA3C8" status="7 DISPAROS · 142 TOTAL" statusCor="#FFA3C8">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {DADOS.CHECKPOINTS.map((c, i) => {
            const canalCor = c.canal === "WHATSAPP" ? "#5FE6CC" : c.canal === "EMAIL" ? p.cyan : c.canal === "TELEFONE" ? "#FFA3C8" : p.gold;
            const sevCor = c.sev === "alta" ? "#FF9A9A" : c.sev === "media" ? "#F5C97A" : "#5FE6CC";
            return (
              <div key={i} className="pwd-card-alerta" style={{ color: sevCor, marginBottom: 0 }}>
                <div style={{ fontSize: 16, color: p.gold, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", marginBottom: 6, fontFamily: fonte.familia }}>{c.tempo}</div>
                <div style={{ marginBottom: 6 }}>
                  <span className="pwd-tag" style={{ color: canalCor, borderColor: canalCor }}>{c.canal}</span>
                </div>
                <div style={{ fontSize: 11, color: p.ink, letterSpacing: ls.suave, lineHeight: 1.4, marginBottom: 6, fontWeight: 500 }}>{c.acao}</div>
                <div style={{ fontSize: 10, color: p.cyan, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia }}>{c.resp}</div>
              </div>
            );
          })}
        </div>
      </BlocoCockpit>
    </DashShell>
  );
}
