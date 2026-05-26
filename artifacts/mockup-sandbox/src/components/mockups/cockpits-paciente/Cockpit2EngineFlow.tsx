import { CockpitShell, HeaderPaciente, BlocoCockpit, Sankey, Sparkline, KpiMini, ChipStatus, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";

/**
 * COCKPIT 2 · ENGINE FLOW
 * Inspirado anexo 1+2 (curvas senoidais Sankey).
 * Mostra como anamnese → motor clínico → sugestões fluem visualmente.
 */
export function Cockpit2EngineFlow() {
  return (
    <CockpitShell>
      <HeaderPaciente />

      {/* ═══ BLOCO 1: SINAIS DE ENTRADA ═══ */}
      <BlocoCockpit sigla="IN" titulo="SINAIS DE ENTRADA · 6 SINTOMAS QUANTIFICADOS" cor={corBloco.anamnese} status="6 ATIVOS" statusCor="#FF9A9A">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {[
            { lab: "FADIGA",    v: 7, cor: "#FF9A9A", spark: [4, 5, 5, 6, 7, 7, 6, 7, 7, 8, 7] },
            { lab: "SONO",      v: 4, cor: "#F5C97A", spark: [6, 6, 5, 5, 4, 5, 4, 4, 3, 4, 4] },
            { lab: "LIBIDO",    v: 3, cor: "#FF9A9A", spark: [5, 4, 4, 3, 3, 3, 4, 3, 2, 3, 3] },
            { lab: "HUMOR",     v: 6, cor: "#F5C97A", spark: [5, 5, 6, 6, 7, 6, 6, 5, 6, 6, 6] },
            { lab: "DISP. AM",  v: 4, cor: "#F5C97A", spark: [6, 5, 5, 4, 4, 5, 4, 4, 4, 4, 4] },
            { lab: "FOCO",      v: 5, cor: "#F5C97A", spark: [6, 6, 5, 5, 5, 6, 5, 5, 5, 6, 5] },
          ].map((s) => (
            <div key={s.lab} style={{ background: p.navyDeep, borderTop: `2px solid ${s.cor}`, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{s.lab}</div>
              <div style={{ fontSize: 22, color: s.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte }}>{s.v}<span style={{ fontSize: 11, color: p.inkMute }}>/10</span></div>
              <div style={{ marginTop: 4 }}><Sparkline data={s.spark} cor={s.cor} w={160} h={26} /></div>
              <div style={{ fontSize: 8, color: p.inkDim, marginTop: 4, letterSpacing: ls.suave }}>11 sem · tendência</div>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 2: MOTOR CLÍNICO (SANKEY) ═══ */}
      <BlocoCockpit sigla="ENG" titulo="MOTOR CLÍNICO · SINTOMAS → SUBSTÂNCIAS SUGERIDAS" cor={corBloco.motor} status="42 ARESTAS" statusCor="#FFA3C8">
        <div style={{ background: p.navyDeep, padding: 16, border: `1px solid ${p.border}`, overflow: "auto" }}>
          <Sankey
            esquerda={[
              { label: "FADIGA",   n: 7 },
              { label: "SONO",     n: 4 },
              { label: "LIBIDO",   n: 3 },
              { label: "HUMOR",    n: 6 },
              { label: "DISP. AM", n: 4 },
              { label: "FOCO",     n: 5 },
            ]}
            direita={[
              { label: "NAD+ ENDOVENOSO · 1×SEM · R$ 2.700",          n: 9 },
              { label: "CoQ10 + PQQ IM · 1×SEM · R$ 1.450",           n: 7 },
              { label: "VITAMINA D3 5000UI VO · diário · R$ 180",     n: 6 },
              { label: "DHEA 25mg VO · diário · R$ 90",               n: 5 },
              { label: "RESVERATROL TRANS 150mg VO · diário · R$ 220",n: 4 },
              { label: "MAGNÉSIO BISGLIC. 300mg VO · noite · R$ 60",  n: 3 },
              { label: "MELATONINA 3mg VO · 22h · R$ 40",             n: 3 },
              { label: "TESTOSTERONA 50mg IM · 14d · R$ 380",         n: 4 },
            ]}
            cores={["#FF9A9A", "#5FE6CC", p.gold, "#A89DFF", "#FFA3C8", p.cyan]}
            w={1100} h={400}
          />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["MOTOR V4 · 26/MAI", "REGRAS APLICADAS · 17", "EVIDÊNCIA NÍVEL A · 5", "EVIDÊNCIA NÍVEL B · 12"].map((c) => (
            <ChipStatus key={c} texto={c} cor={p.cyan} />
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 3: TABELA DE INSPETOR ═══ */}
      <BlocoCockpit sigla="INS" titulo="INSPETOR · CADA ARESTA EXPLICADA" cor={corBloco.evidencia} status="MOSTRANDO 8 DE 42">
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", fontFamily: fonte.familia }}>
          <thead>
            <tr style={{ background: p.navyPanelAlt, borderTop: `1px solid ${p.gold}`, borderBottom: `1px solid ${p.gold}` }}>
              {["#", "DE", "PARA", "REGRA MOTOR", "FORÇA", "EVIDÊNCIA", "NÍVEL", "AÇÃO"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["#001", "FADIGA",  "NAD+ ENDOVENOSO",    "MOTOR-V4-FAD-NAD-001", 92, "Ross 2022", "A", "ACEITAR"],
              ["#002", "FADIGA",  "CoQ10 + PQQ",        "MOTOR-V4-FAD-COQ-007", 85, "Mortensen 2014", "A", "ACEITAR"],
              ["#003", "LIBIDO",  "TESTOSTERONA IM",    "MOTOR-V4-LIB-TES-002", 88, "Bhasin 2018", "A", "REVISAR"],
              ["#004", "SONO",    "MAGNÉSIO BISGLIC.",  "MOTOR-V4-SON-MAG-009", 71, "Abbasi 2012", "B", "ACEITAR"],
              ["#005", "SONO",    "MELATONINA",         "MOTOR-V4-SON-MEL-001", 79, "Ferracioli 2013", "B", "ACEITAR"],
              ["#006", "HUMOR",   "VITAMINA D3",        "MOTOR-V4-HUM-VD3-003", 64, "Anglin 2013", "B", "ACEITAR"],
              ["#007", "DISP.AM", "DHEA",               "MOTOR-V4-DIS-DHE-005", 58, "Genazzani 2010", "B", "REVISAR"],
              ["#008", "FOCO",    "RESVERATROL",        "MOTOR-V4-FOC-RES-002", 51, "Witte 2014", "C", "DESCARTAR"],
            ].map(([n, de, para, regra, forca, ev, nv, acao]) => (
              <tr key={n as string} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                <td style={{ padding: "7px 10px", color: p.gold, letterSpacing: ls.forte, fontWeight: 700 }}>{n}</td>
                <td style={{ padding: "7px 10px", color: "#FF9A9A", letterSpacing: ls.forte, fontWeight: 600 }}>◀ {de}</td>
                <td style={{ padding: "7px 10px", color: p.cyan, letterSpacing: ls.forte, fontWeight: 600 }}>▶ {para}</td>
                <td style={{ padding: "7px 10px", color: p.inkDim, fontVariantNumeric: "tabular-nums" }}>{regra}</td>
                <td style={{ padding: "7px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 60, height: 6, background: p.borderSoft }}>
                      <div style={{ width: `${forca}%`, height: "100%", background: p.gold, boxShadow: `0 0 4px ${p.gold}` }} />
                    </div>
                    <span style={{ fontSize: 9, color: p.gold, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{forca}%</span>
                  </div>
                </td>
                <td style={{ padding: "7px 10px", color: p.inkDim, fontStyle: "italic" }}>{ev}</td>
                <td style={{ padding: "7px 10px" }}>
                  <span style={{
                    padding: "2px 7px", background: nv === "A" ? "#5FE6CC22" : nv === "B" ? "#F5C97A22" : "#FF9A9A22",
                    color: nv === "A" ? "#5FE6CC" : nv === "B" ? "#F5C97A" : "#FF9A9A",
                    border: `1px solid ${nv === "A" ? "#5FE6CC" : nv === "B" ? "#F5C97A" : "#FF9A9A"}55`,
                    fontSize: 9, letterSpacing: ls.forte, fontWeight: 700,
                  }}>NÍVEL {nv}</span>
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <span style={{
                    color: acao === "ACEITAR" ? "#5FE6CC" : acao === "REVISAR" ? "#F5C97A" : "#FF9A9A",
                    fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, cursor: "pointer",
                  }}>{acao} ▸</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </BlocoCockpit>

      {/* ═══ BLOCO 4: RESUMO DE EMISSÃO ═══ */}
      <BlocoCockpit sigla="OUT" titulo="EMISSÃO FINAL · 6 ITENS PRÉ-APROVADOS PELO MÉDICO" cor={p.gold} status="AGUARDANDO ZAPSIGN">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <KpiMini label="VALOR TOTAL CICLO"   valor="R$ 16.510,00" sub="8 semanas"     cor={p.gold} />
          <KpiMini label="MARGEM ESTIMADA"     valor="R$ 9.420,00"  sub="57%"           cor="#5FE6CC" />
          <KpiMini label="ADESÃO PREVISTA"     valor="78%"          sub="modelo MOTOR"  cor={p.cyan}  barra={78} />
          <KpiMini label="MELHORA ESPERADA"    valor="+24pt"        sub="sintomas/10"   cor="#FFA3C8" barra={64} />
        </div>
      </BlocoCockpit>
    </CockpitShell>
  );
}
