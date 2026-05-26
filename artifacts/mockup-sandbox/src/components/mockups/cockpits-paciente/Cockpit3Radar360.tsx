import { CockpitShell, HeaderPaciente, BlocoCockpit, Radar, Donut, Heatmap24x7, KpiMini, Sparkline, ChipStatus, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";

/**
 * COCKPIT 3 · RADAR 360°
 * Visão 360° do paciente. Linguagens: radar de sintomas, heatmap circadiano,
 * donuts de adesão, sparklines de exames laboratoriais ao longo do tempo.
 */
export function Cockpit3Radar360() {
  return (
    <CockpitShell>
      <HeaderPaciente />

      {/* ═══ BLOCO 1: RADAR DE SINTOMAS + DONUTS ═══ */}
      <BlocoCockpit sigla="RDR" titulo="RADAR DE SINTOMAS · ANTES × DEPOIS · 8 SEMANAS" cor="#FFA3C8" status="MELHORA +24PT" statusCor="#5FE6CC">
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
          <div style={{ position: "relative", background: p.navyDeep, padding: 12, border: `1px solid ${p.border}` }}>
            <Radar
              valores={[70, 60, 75, 45, 65, 55]}
              labels={["FADIGA", "SONO", "LIBIDO", "HUMOR", "DISP.AM", "FOCO"]}
              cor="#FF9A9A"
            />
            <div style={{ position: "absolute", inset: 12, pointerEvents: "none" }}>
              <Radar
                valores={[35, 30, 40, 25, 30, 28]}
                labels={["", "", "", "", "", ""]}
                cor="#5FE6CC"
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 12 }}>
              ░ POLÍGONO VERMELHO = ANTES (S0) &nbsp; · &nbsp; POLÍGONO VERDE = AGORA (S8)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Donut pct={78} cor="#5FE6CC" label="ADESÃO GERAL" sub="11 sessões / 14" />
              <Donut pct={92} cor={p.gold}  label="POSOLOGIA OK" sub="só 3 esquecimentos" />
              <Donut pct={64} cor={p.cyan}  label="CONFIANÇA AB" sub="modelo MOTOR V4" />
            </div>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 2: HEATMAP CIRCADIANO ═══ */}
      <BlocoCockpit sigla="HMP" titulo="HEATMAP CIRCADIANO · QUANDO O PACIENTE TOMA A MEDICAÇÃO" cor={p.cyan} status="PADRÃO ESTÁVEL">
        <div style={{ background: p.navyDeep, padding: 16, border: `1px solid ${p.border}`, overflow: "auto" }}>
          <Heatmap24x7
            matriz={[
              [0,0,0,0,0,0,2,4,3,1,0,0,1,0,0,0,1,1,2,3,4,2,1,0],
              [0,0,0,0,0,0,3,5,4,1,0,0,2,1,0,0,1,2,3,4,5,3,1,0],
              [0,0,0,0,0,0,2,4,3,1,0,0,1,0,1,0,1,1,2,3,4,2,1,0],
              [0,0,0,0,0,0,3,5,4,0,0,1,1,0,0,0,1,2,3,4,5,3,2,0],
              [0,0,0,0,0,0,2,4,3,1,0,0,1,1,0,0,1,1,2,3,4,2,1,0],
              [0,0,0,0,0,0,3,5,4,1,0,0,2,0,0,0,1,2,3,4,5,3,1,0],
              [0,0,0,0,0,0,1,3,2,0,0,0,1,0,0,0,0,1,2,3,3,2,1,0],
            ]}
            cor={p.cyan}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 10, fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>
            <span>░ ZERO</span>
            <span style={{ color: p.cyan }}>▒ 1-3 TOMADAS</span>
            <span style={{ color: p.cyan, fontWeight: 700 }}>▓ 4-5 TOMADAS</span>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 3: EXAMES LABORATORIAIS EVOLUÇÃO ═══ */}
      <BlocoCockpit sigla="LAB" titulo="EXAMES LABORATORIAIS · EVOLUÇÃO 12M" cor={corBloco.evidencia} status="6 EXAMES · 4 EM ALERTA">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { ex: "VITAMINA D 25-OH", v: "32 ng/mL",  ref: "30-100",  ok: true,  spark: [18, 22, 26, 28, 30, 31, 32], cor: "#5FE6CC" },
            { ex: "TESTOSTERONA TOTAL", v: "420 ng/dL", ref: "300-1000", ok: true, spark: [380, 390, 400, 410, 420, 425, 420], cor: "#5FE6CC" },
            { ex: "CORTISOL 8H", v: "9 µg/dL", ref: "10-20", ok: false, spark: [12, 11, 10, 9, 9, 9, 9], cor: "#FF9A9A" },
            { ex: "TSH", v: "3.8 µUI/mL", ref: "0.4-4.0", ok: false, spark: [2.5, 2.8, 3.0, 3.2, 3.5, 3.7, 3.8], cor: "#F5C97A" },
            { ex: "HEMOGLOBINA GLICADA", v: "5.4 %", ref: "<5.7", ok: true, spark: [5.8, 5.7, 5.6, 5.5, 5.5, 5.4, 5.4], cor: "#5FE6CC" },
            { ex: "FERRITINA", v: "85 ng/mL", ref: "30-400", ok: false, spark: [40, 50, 60, 70, 75, 82, 85], cor: "#F5C97A" },
          ].map((e) => (
            <div key={e.ex} style={{ background: p.navyDeep, borderLeft: `3px solid ${e.cor}`, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>{e.ex}</div>
                <ChipStatus texto={e.ok ? "OK" : "ALERTA"} cor={e.cor} />
              </div>
              <div style={{ fontSize: 18, color: e.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte }}>{e.v}</div>
              <div style={{ fontSize: 8, color: p.inkDim, letterSpacing: ls.suave, marginBottom: 6 }}>REF · {e.ref}</div>
              <Sparkline data={e.spark} cor={e.cor} w={240} h={28} />
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 4: KPIs FINANCEIRO/CLÍNICO ═══ */}
      <BlocoCockpit sigla="KPI" titulo="INDICADORES DE JORNADA · 12M" cor={p.gold} status="OBJETIVO 80% · ATINGIDO 78%">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <KpiMini label="LTV PACIENTE"    valor="R$ 38.420" sub="11 ciclos"     cor={p.gold}     barra={78} />
          <KpiMini label="NPS REGISTRADO"  valor="9 / 10"    sub="média 8.6"     cor="#5FE6CC"   barra={90} />
          <KpiMini label="TAXA RECOMPRA"   valor="92%"       sub="11 de 12"      cor={p.cyan}     barra={92} />
          <KpiMini label="DIAS NO CICLO"   valor="42"        sub="meta 56"       cor="#FFA3C8"    barra={75} />
        </div>
      </BlocoCockpit>
    </CockpitShell>
  );
}
