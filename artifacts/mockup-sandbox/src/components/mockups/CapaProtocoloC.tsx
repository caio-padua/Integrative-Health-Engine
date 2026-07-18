/**
 * CAP-03 · CAPA DE PROTOCOLO — RADAR SVG DE CATEGORIAS TERAPÊUTICAS
 * Gráfico radar (teia de aranha) mostrando cobertura por categoria
 * SVG = Scalable Vector Graphics (gráfico vetorial embutido no HTML)
 */
export default function CapaProtocoloC() {
  const N = "#0F2940";
  const NM = "#1F3A5F";
  const AU = "#C7A646";
  const CIANO = "#06B6D4"; // ciano PENUMBRA

  // Dados do radar (valor 0-100 por categoria)
  const categorias = [
    { label: "NEURO",    val: 88 },
    { label: "HORMONAL", val: 72 },
    { label: "METAB.",   val: 80 },
    { label: "IMUNO",    val: 65 },
    { label: "LONGEVID.", val: 90 },
    { label: "ESTÉTICA", val: 45 },
  ];

  const n = categorias.length;
  const cx = 120, cy = 120, r = 95;

  function polar(i: number, v: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (v / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }

  function labelPos(i: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = r + 18;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }

  // Grade concêntrica
  const grades = [25, 50, 75, 100];

  function polyPoints(v: number) {
    return Array.from({ length: n }, (_, i) => polar(i, v))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  }

  const dataPoints = categorias.map((c, i) => polar(i, c.val));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const substancias = [
    { nome: "Fosfatidilserina 200mg", cat: "NEURO",    prog: 88 },
    { nome: "Berberina HCl 500mg",   cat: "METAB.",   prog: 80 },
    { nome: "Vitamina D3 10.000UI",  cat: "IMUNO",    prog: 65 },
    { nome: "Semaglutida 0,25mg",    cat: "HORMONAL", prog: 72 },
    { nome: "Resveratrol 250mg",     cat: "LONGEVID.",prog: 90 },
  ];

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: 32, fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>CAP-03 · Capa com Radar SVG de Categorias Terapêuticas</div>
      </div>

      <div style={{ width: 595, minHeight: 842, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.14)", position: "relative" }}>

        {/* HEADER */}
        <div style={{ background: N, padding: "18px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: "white", fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>INSTITUTO PÁDUA</div>
              <div style={{ color: "#8BA3C7", fontSize: 7.5, marginTop: 3 }}>CNPJ 63.865.940/0001-63 · RUA GUAXUPÉ, 327 — VILA FORMOSA — SP</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: AU, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>PAWARDS</div>
              <div style={{ color: CIANO, fontSize: 8, marginTop: 2, fontWeight: 600 }}>PROTOCOLO TERAPÊUTICO INTEGRADO</div>
            </div>
          </div>
        </div>

        {/* FAIXA CIANO */}
        <div style={{ background: CIANO, height: 3 }} />

        {/* CORPO PRINCIPAL — RADAR + DADOS */}
        <div style={{ padding: "18px 28px", display: "flex", gap: 20 }}>

          {/* COLUNA ESQUERDA — Gráfico Radar SVG */}
          <div style={{ flex: 0, flexBasis: 260, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              Cobertura Terapêutica por Categoria
            </div>
            <svg width={260} height={260} viewBox="-20 -20 280 280">
              {/* Grade */}
              {grades.map((g) => (
                <polygon key={g} points={polyPoints(g)}
                  fill="none" stroke="#dce4ef" strokeWidth={0.8} />
              ))}
              {/* Eixos */}
              {categorias.map((_, i) => {
                const pt = polar(i, 100);
                return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="#dce4ef" strokeWidth={0.8} />;
              })}
              {/* Dados */}
              <path d={dataPath} fill={`${CIANO}33`} stroke={CIANO} strokeWidth={1.5} />
              {dataPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill={CIANO} />
              ))}
              {/* Labels */}
              {categorias.map((c, i) => {
                const lp = labelPos(i);
                return (
                  <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fontWeight={700} fill={N} fontFamily="monospace">
                    {c.label}
                  </text>
                );
              })}
              {/* Valores */}
              {categorias.map((c, i) => {
                const dp = dataPoints[i];
                return (
                  <text key={i} x={dp.x} y={dp.y - 7} textAnchor="middle"
                    fontSize={7} fontWeight={700} fill={CIANO} fontFamily="monospace">
                    {c.val}%
                  </text>
                );
              })}
            </svg>

            {/* Legenda do radar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6 }}>
              {categorias.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: CIANO + "55", border: `1px solid ${CIANO}` }} />
                  <span style={{ fontSize: 7, color: N }}>{c.label} {c.val}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA DIREITA — Paciente + Substâncias */}
          <div style={{ flex: 1 }}>
            {/* Paciente */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Paciente</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: N }}>MARIA A. SANTOS FERREIRA</div>
              <div style={{ fontSize: 8, color: "#666", marginTop: 4, lineHeight: 1.8 }}>
                CPF 234.567.890-12<br />
                NASC. 19/03/1978 · 48 ANOS<br />
                CRM MÉDICO: 123.456 · DR. PÁDUA
              </div>
            </div>

            {/* Substâncias com mini-barra */}
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Substâncias</div>
              {substancias.map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 8, fontWeight: 600, color: N }}>{s.nome}</span>
                    <span style={{ fontSize: 7, color: CIANO, fontWeight: 700 }}>{s.prog}%</span>
                  </div>
                  <div style={{ height: 5, background: "#f0f2f5", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${s.prog}%`, height: "100%", background: `linear-gradient(90deg, ${CIANO}, ${AU})` }} />
                  </div>
                  <div style={{ fontSize: 6.5, color: "#aaa", marginTop: 2 }}>{s.cat}</div>
                </div>
              ))}
            </div>

            {/* Numerais do protocolo */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { l: "EMISSÃO", v: "17/07/2026" },
                { l: "VALIDADE", v: "90 DIAS" },
                { l: "Nº RAS", v: "2026-07-0047" },
                { l: "RETORNO", v: "16/10/2026" },
              ].map((i, idx) => (
                <div key={idx} style={{ background: "#f5f7fa", border: "1px solid #dce4ef", padding: "8px 10px" }}>
                  <div style={{ fontSize: 6.5, color: "#aaa", letterSpacing: 1, textTransform: "uppercase" }}>{i.l}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: N, marginTop: 2 }}>{i.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEÇÃO FARMÁCIA */}
        <div style={{ margin: "0 28px 16px", border: `1px solid ${CIANO}55` }}>
          <div style={{ background: NM, padding: "5px 12px" }}>
            <span style={{ color: CIANO, fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Farmácia de Dispensação Vinculada</span>
          </div>
          <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfd" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: N }}>FARMÁCIA MODELO — MANIPULAÇÃO</div>
              <div style={{ fontSize: 7.5, color: "#666" }}>Av. Paulista, 1.000 — Bela Vista — São Paulo — SP · CNPJ 00.000.000/0001-00</div>
            </div>
            <div style={{ background: `${AU}22`, border: `1px solid ${AU}`, padding: "4px 10px" }}>
              <div style={{ fontSize: 7, color: AU, fontWeight: 700 }}>FÓRMULAS MAGISTRAIS</div>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <div style={{ background: CIANO, height: 3 }} />
          <div style={{ background: N, padding: "6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#8BA3C7", fontSize: 7 }}>INSTITUTO PÁDUA · Medicina Integrativa e Longevidade</div>
            <div style={{ color: AU, fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>PAWARDS® · PADCON®</div>
          </div>
        </div>
      </div>
    </div>
  );
}
