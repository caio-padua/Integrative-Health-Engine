import { useState, useEffect } from "react";

const font = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

// ══════════════════════════════════════════════════════════════
// 6 TEMAS PENSADOS COMO OPERADOR NEURODIVERGENTE
// ══════════════════════════════════════════════════════════════
//
// FILOSOFIA DE CADA UM:
//
// T1 RELOJOARIA: Swiss watchmaking. Cada numero no lugar exato.
//    TOC ama porque tudo esta milimetricamente alinhado.
//    Fundo escuro quente (nao frio), dourado envelhecido, gauges.
//
// T2 AQUARIO: Deep sea. Cores que comprovadamente reduzem cortisol.
//    TDAH acalma porque o ambiente e imersivo sem ser estimulante.
//    Azuis profundos, verdes agua, bioluminescencia sutil.
//
// T3 PERGAMINHO: Documento antigo digitalizado. Papel envelhecido.
//    Asperger 1 sente conforto porque parece um livro de referencia.
//    Tons sepia, tipografia de livro medico, bordas de moldura.
//
// T4 TERMINAL: IDE / Bloomberg terminal. Texto puro, zero decoracao.
//    Hiperfoco mode. Informacao crua, teclado-first, zero mouse.
//    Verde fosforo em fundo preto, cursor piscante, density maxima.
//
// T5 GRAFITE: Lapide de marmore cinza com detalhes em cobre.
//    Elegancia silenciosa. Nada brilha, nada pulsa, nada grita.
//    Cinzas quentes, cobre sutil, tipografia espacada.
//
// T6 VITRAL: Inspirado em vitrais de catedrais. Fundo escuro com
//    paineis de cor translucida. Cada dominio e um vitral diferente.
//    Mistico mas funcional. Profundidade sem confusao.

const TEMAS = {
  relojoaria: {
    id: "relojoaria", nome: "RELOJOARIA", desc: "Swiss precision. Cada numero no lugar exato.",
    bg: "#0C0A08", bg2: "#161210", bg3: "#1E1A16", bg4: "#2A2420",
    border: "#3A3228", borderAccent: "#C89B3C44",
    t1: "#F0E8D8", t2: "#B8A890", t3: "#7A6E60",
    accent: "#C89B3C", accent2: "#8B7355", glow: "#C89B3C",
    ok: "#7CA07C", warn: "#C8A050", danger: "#A06060",
    doms: ["#D4AA40","#7090B0","#60A898","#9080B8","#70A080","#C07090","#9088C0","#B07070"],
    hasGlow: true, filter: "contrast(1.08) saturate(0.95)",
  },
  aquario: {
    id: "aquario", nome: "AQUARIO", desc: "Deep sea. Cores que reduzem cortisol.",
    bg: "#020C14", bg2: "#061824", bg3: "#0A2030", bg4: "#0E2838",
    border: "#1A3848", borderAccent: "#2A9D8F44",
    t1: "#D0E8E8", t2: "#80B0B8", t3: "#507880",
    accent: "#2A9D8F", accent2: "#5BB8AE", glow: "#2A9D8F",
    ok: "#4AAA8A", warn: "#C8A860", danger: "#B06868",
    doms: ["#C8A860","#5090C8","#2A9D8F","#8878B8","#4AAA8A","#C87098","#7878C0","#C07070"],
    hasGlow: true, filter: "saturate(0.92) brightness(1.02)",
  },
  pergaminho: {
    id: "pergaminho", nome: "PERGAMINHO", desc: "Livro medico antigo. Conforto de referencia.",
    bg: "#F8F2E8", bg2: "#FFFBF4", bg3: "#F0E8DA", bg4: "#E8DCC8",
    border: "#D0C4AE", borderAccent: "#8A6A2844",
    t1: "#2A2018", t2: "#5A4E3E", t3: "#8A7E6E",
    accent: "#6A4A20", accent2: "#8B6B3B", glow: "#6A4A20",
    ok: "#4A7A4A", warn: "#A07A20", danger: "#8A3030",
    doms: ["#A07A20","#3A6A9A","#2A7A6A","#6A5A8A","#4A7A4A","#9A4A6A","#6A5A9A","#9A4A4A"],
    hasGlow: false, filter: "none",
  },
  terminal: {
    id: "terminal", nome: "TERMINAL", desc: "IDE mode. Hiperfoco. Zero decoracao.",
    bg: "#0A0A0A", bg2: "#111111", bg3: "#1A1A1A", bg4: "#222222",
    border: "#2A2A2A", borderAccent: "#33FF6644",
    t1: "#33FF66", t2: "#22AA44", t3: "#117733",
    accent: "#33FF66", accent2: "#66FFAA", glow: "#33FF66",
    ok: "#33FF66", warn: "#FFCC33", danger: "#FF4444",
    doms: ["#FFCC33","#44AAFF","#33FFAA","#AA88FF","#33FF66","#FF66AA","#8888FF","#FF6644"],
    hasGlow: true, filter: "none",
  },
  grafite: {
    id: "grafite", nome: "GRAFITE", desc: "Marmore cinza + cobre. Elegancia silenciosa.",
    bg: "#18181B", bg2: "#1E1E22", bg3: "#26262A", bg4: "#2E2E34",
    border: "#3A3A42", borderAccent: "#B8845044",
    t1: "#E4E0DC", t2: "#A09890", t3: "#6A6260",
    accent: "#B88450", accent2: "#D0A070", glow: "#B88450",
    ok: "#6AAA80", warn: "#C8A050", danger: "#B06060",
    doms: ["#C8A050","#6888A8","#5A9888","#8A78A8","#6AAA80","#B06080","#8078B0","#B06868"],
    hasGlow: false, filter: "contrast(1.06)",
  },
  vitral: {
    id: "vitral", nome: "VITRAL", desc: "Vitrais de catedral. Profundidade mistica.",
    bg: "#080610", bg2: "#0E0C18", bg3: "#161222", bg4: "#1E182C",
    border: "#2A2240", borderAccent: "#B8A0F044",
    t1: "#E8E0F8", t2: "#A898C0", t3: "#6A6088",
    accent: "#B8A0F0", accent2: "#D0C0FF", glow: "#B8A0F0",
    ok: "#70C0A0", warn: "#E0B060", danger: "#D08080",
    doms: ["#E0C070","#70A0E0","#60D0B0","#B8A0F0","#70C0A0","#E080A8","#A090E0","#E08888"],
    hasGlow: true, filter: "saturate(1.05) brightness(0.98)",
  },
};

const DOMINIOS = [
  { k: "DASHB", l: "DASHBOARD", sub: "operacao" },
  { k: "PACTS", l: "PACIENTES", sub: "87" },
  { k: "AGEND", l: "AGENDA", sub: "5" },
  { k: "PRESC", l: "PRESCRICAO", sub: "6" },
  { k: "FATUR", l: "FATURAMENTO", sub: "41K" },
  { k: "MOTOR", l: "MOTOR V4", sub: "142" },
  { k: "EQUIP", l: "EQUIPE", sub: "4" },
  { k: "AUDIT", l: "AUDITORIA", sub: "3" },
];

const KPIS = [
  { l: "SESSOES", v: "18", sub: "12 ok 4 curso 2 falta", i: 0 },
  { l: "RECEITA", v: "R$ 41.820", sub: "meta 38K +10%", i: 1 },
  { l: "ADERENCIA", v: "87%", sub: "obj 80% +5pt", i: 2 },
  { l: "FILA", v: "23", sub: "5 criticos", i: 3 },
  { l: "MOTOR", v: "142", sub: "3 alertas", i: 4 },
  { l: "FALTAS", v: "2", sub: "re-agendar", i: 5 },
];

const ALERTAS = [
  { sev: "CRITICO", t: "INTERACAO NAD+ x ATORVASTATINA", pac: "Graco Souza Padua", cta: "REVISAR", ctx: "11:30 16min" },
  { sev: "URGENTE", t: "CORTISOL 8H BAIXO", pac: "Camila Toledo", cta: "REAVALIAR", ctx: "Lab 2d" },
  { sev: "URGENTE", t: "TSH LIMITROFE 4.8", pac: "Lucas Vargas", cta: "AGENDAR LAB", ctx: "T4L pend" },
];

// ── Gauge SVG (relogio com porcentagem) ──
function Gauge({ valor, max, label, cor, size = 64, t }) {
  const pct = Math.round((valor / max) * 100);
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const sweep = circ * 0.75;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.border} strokeWidth="4"
          strokeDasharray={`${sweep} ${circ-sweep}`} transform={`rotate(135 ${size/2} ${size/2})`} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cor} strokeWidth="4"
          strokeDasharray={`${sweep*pct/100} ${circ}`} transform={`rotate(135 ${size/2} ${size/2})`}
          style={{ filter: t.hasGlow ? `drop-shadow(0 0 4px ${cor}88)` : "none", transition: "all 0.6s" }} />
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: t.t1, fontSize: size*0.22, fontWeight: 700, fontFamily: font }}>{pct}%</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: -4 }}>
        <span style={{ fontSize: 7, color: t.t3, fontFamily: font }}>{valor}/{max}</span>
        <span style={{ fontSize: 7, color: cor, fontWeight: 700, fontFamily: font }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 7, color: t.t3, fontFamily: font, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Sparkline ──
function Spark({ data, cor, w = 80, h = 20, t }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - ((v-min)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5"
        style={{ filter: t.hasGlow ? `drop-shadow(0 0 3px ${cor}66)` : "none" }} />
      <circle cx={w} cy={h - ((data[data.length-1]-min)/range)*h} r="2" fill={cor}
        style={{ filter: t.hasGlow ? `drop-shadow(0 0 4px ${cor})` : "none" }} />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// LAYOUT UNICO ADAPTAVEL POR TEMA
// ══════════════════════════════════════════════════════════════
function Layout({ temaId }) {
  const t = TEMAS[temaId];
  const [actDom, setActDom] = useState(0);
  const [menuOpen, setMenuOpen] = useState(true);
  const [ctxOpen, setCtxOpen] = useState(true);
  const [opeOpen, setOpeOpen] = useState(true);
  const [altOpen, setAltOpen] = useState(true);
  const [dmdOpen, setDmdOpen] = useState(true);
  const [hovK, setHovK] = useState(-1);
  const [hovA, setHovA] = useState(-1);
  const [hovM, setHovM] = useState(-1);
  const [hovD, setHovD] = useState(-1);
  const [local, setLocal] = useState(true);

  const isTerminal = temaId === "terminal";
  const isPergaminho = temaId === "pergaminho";
  const kpiC = [t.accent, t.doms[0], t.ok, t.warn, t.doms[5], t.danger];

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "[") { e.preventDefault(); setMenuOpen(p => !p); }
      if (e.key === "]") { e.preventDefault(); setCtxOpen(p => !p); }
      if (e.key === "1") setOpeOpen(p => !p);
      if (e.key === "2") setAltOpen(p => !p);
      if (e.key === "3") setDmdOpen(p => !p);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const glow = (cor, i = 10) => t.hasGlow ? `0 0 ${i}px ${cor}44` : "none";
  const glowHov = (cor) => t.hasGlow ? `0 0 16px ${cor}55, inset 0 0 8px ${cor}18` : `0 0 4px ${cor}33`;

  // Header de bloco
  const BH = ({ sigla, titulo, cor, extra, open, toggle }) => (
    <div onClick={toggle} style={{
      padding: "6px 12px", background: t.bg3, borderBottom: `1px solid ${t.border}`,
      borderLeft: `3px solid ${cor}`, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = t.bg4}
      onMouseLeave={e => e.currentTarget.style.background = t.bg3}
    >
      <span style={{ fontFamily: font, fontSize: 9, fontWeight: 700, padding: "1px 6px", background: `${cor}22`, color: cor, letterSpacing: 1 }}>{sigla}</span>
      <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: t.t1, letterSpacing: "0.08em", flex: 1 }}>{titulo}</span>
      {extra && <span style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: cor }}>{extra}</span>}
      <span style={{ fontFamily: font, fontSize: 9, color: t.t3 }}>{open ? "FECHAR" : "ABRIR"}</span>
    </div>
  );

  return (
    <div style={{ background: t.bg, minHeight: 600, fontFamily: font, color: t.t1, filter: t.filter, display: "flex", flexDirection: "column" }}>

      {/* FAIXA 1 */}
      <div style={{ height: 44, background: t.bg, display: "flex", alignItems: "center", padding: "0 14px", gap: 6, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <button onClick={() => setLocal(true)} style={{
          padding: "3px 10px", border: `1px solid ${local ? t.ok : t.border}`,
          background: local ? `${t.ok}18` : "transparent", color: local ? t.ok : t.t3,
          fontFamily: font, fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          boxShadow: local ? glow(t.ok) : "none", transition: "all 0.2s",
        }}>LOCAL</button>
        <button onClick={() => setLocal(false)} style={{
          padding: "3px 10px", border: `1px solid ${!local ? t.doms[1] : t.border}`,
          background: !local ? `${t.doms[1]}18` : "transparent", color: !local ? t.doms[1] : t.t3,
          fontFamily: font, fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s",
        }}>GLOBAL</button>
        <div style={{ flex: 1, maxWidth: 180, padding: "3px 8px", background: t.bg2, border: `1px solid ${t.border}`, display: "flex", gap: 4, transition: "border-color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; if (t.hasGlow) e.currentTarget.style.boxShadow = glow(t.accent, 6); }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = "none"; }}
        >
          <span style={{ color: t.accent, fontSize: 9 }}>&#9906;</span>
          <span style={{ color: t.t3, fontSize: 9 }}>buscar</span>
          <span style={{ marginLeft: "auto", color: t.t3, fontSize: 7, padding: "0 3px", border: `1px solid ${t.border}` }}>Ctrl+K</span>
        </div>
        <span style={{ marginLeft: "auto", color: t.accent, fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", border: `1px solid ${t.accent}44`, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={e => { e.target.style.background = `${t.accent}15`; e.target.style.boxShadow = glow(t.accent); }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.boxShadow = "none"; }}
        >CAIO REGISTER</span>
        <span style={{ fontSize: 8, color: t.t2, padding: "2px 6px", border: `1px solid ${t.border}` }}>MEDICO</span>
      </div>

      {/* FAIXA 2: BREADCRUMB */}
      <div style={{ height: 28, background: t.bg, display: "flex", alignItems: "center", padding: "0 14px", borderBottom: `1px solid ${t.borderAccent}`, fontSize: 8, letterSpacing: "0.12em", color: t.t1, flexShrink: 0 }}>
        {["PAWARDS","PADUA MATRIZ","DASHBOARD"].map((x, i, a) => (
          <span key={i}>
            <span style={{ padding: "1px 5px", cursor: "pointer", transition: "color 0.1s" }}
              onMouseEnter={e => { e.target.style.color = t.accent; }}
              onMouseLeave={e => { e.target.style.color = t.t1; }}
            >{x}</span>
            {i < a.length-1 && <span style={{ color: t.t3, margin: "0 3px" }}>&#9656;</span>}
          </span>
        ))}
        <span style={{ background: t.accent, color: t.bg, padding: "1px 6px", fontWeight: 700, marginLeft: 4, fontSize: 8 }}>{t.nome}</span>
      </div>

      {/* FAIXA 3: PACIENTE ATIVO + DOM TABS */}
      <div style={{ height: 30, background: t.bg2, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 7, color: t.ok, fontWeight: 700, letterSpacing: 1, padding: "1px 4px", border: `1px solid ${t.ok}44` }}>ATIVO</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, letterSpacing: 1 }}>GRACO SOUZA PADUA</span>
        <span style={{ fontSize: 8, color: t.t2 }}>34A M</span>
        <span style={{ fontSize: 8, color: t.t3 }}>HAS DM2</span>
        <span style={{ fontSize: 8, color: t.warn, marginLeft: "auto" }}>11:30 16MIN</span>
      </div>

      {/* CORPO */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* MENU */}
        <div style={{ width: menuOpen ? 130 : 36, background: t.bg, borderRight: `1px solid ${t.border}`, padding: "4px 0", transition: "width 0.2s", flexShrink: 0, overflowY: "auto" }}>
          <div onClick={() => setMenuOpen(p => !p)} style={{ padding: "3px 6px", textAlign: "center", cursor: "pointer", color: t.t3, fontSize: 8, marginBottom: 2 }}
            onMouseEnter={e => e.target.style.color = t.accent}
            onMouseLeave={e => e.target.style.color = t.t3}
          >{menuOpen ? "[" : "]"}</div>
          {DOMINIOS.map((d, i) => {
            const cor = t.doms[i]; const act = i === actDom; const hov = i === hovM;
            return (
              <div key={d.k} onClick={() => setActDom(i)} onMouseEnter={() => setHovM(i)} onMouseLeave={() => setHovM(-1)}
                style={{
                  padding: menuOpen ? "5px 8px" : "5px 2px", display: "flex", alignItems: "center", gap: 4,
                  borderLeft: `3px solid ${act ? cor : hov ? `${cor}88` : "transparent"}`,
                  background: act ? `${cor}12` : hov ? `${cor}08` : "transparent",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: act && t.hasGlow ? `inset 0 0 8px ${cor}18` : hov && t.hasGlow ? `0 0 8px ${cor}15` : "none",
                }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: act || hov ? cor : t.t2, letterSpacing: 1, minWidth: menuOpen ? 36 : "auto" }}>{d.k}</span>
                {menuOpen && <span style={{ fontSize: 7, color: t.t3, overflow: "hidden", whiteSpace: "nowrap" }}>{d.sub}</span>}
              </div>
            );
          })}
        </div>

        {/* CONTEUDO CENTRAL */}
        <div style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>

          {/* BLOCO OPE */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2, marginBottom: 6 }}>
            <BH sigla="OPE" titulo="OPERACAO HOJE 27/MAI/2026 QUI 11:14" cor={t.doms[0]} extra="EM CURSO" open={opeOpen} toggle={() => setOpeOpen(p => !p)} />
            {opeOpen && (
              <div>
                {/* KPIs Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: t.border, padding: 1 }}>
                  {KPIS.map((k, i) => (
                    <div key={i} onMouseEnter={() => setHovK(i)} onMouseLeave={() => setHovK(-1)}
                      style={{
                        background: hovK === i ? `${kpiC[i]}08` : t.bg2,
                        padding: "8px 6px", textAlign: "center", transition: "all 0.15s", cursor: "default",
                        boxShadow: hovK === i ? glowHov(kpiC[i]) : "none",
                      }}>
                      <div style={{ fontSize: 8, color: t.t1, letterSpacing: "0.14em", fontWeight: 700 }}>{k.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: kpiC[i], fontVariantNumeric: "tabular-nums", marginTop: 2,
                        textShadow: t.hasGlow ? `0 0 8px ${kpiC[i]}33` : "none" }}>{k.v}</div>
                      <div style={{ fontSize: 8, color: t.t2, marginTop: 2 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Gauges + Sparklines row */}
                <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 12px", borderTop: `1px solid ${t.border}`, flexWrap: "wrap", gap: 4 }}>
                  <Gauge valor={18} max={24} label="SESSOES" cor={t.accent} t={t} />
                  <Gauge valor={87} max={100} label="ADERENCIA" cor={t.ok} t={t} />
                  <Gauge valor={41820} max={50000} label="RECEITA" cor={t.doms[0]} t={t} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 7, color: t.t3, width: 40, textAlign: "right" }}>SONO</span>
                      <Spark data={[6,7,7,8,7,8,9]} cor={t.accent} t={t} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.accent, width: 16, textAlign: "right" }}>9</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 7, color: t.t3, width: 40, textAlign: "right" }}>ENERGIA</span>
                      <Spark data={[5,6,7,7,8,8,8]} cor={t.ok} t={t} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.ok, width: 16, textAlign: "right" }}>8</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 7, color: t.t3, width: 40, textAlign: "right" }}>FOCO</span>
                      <Spark data={[7,7,8,8,7,9,8]} cor={t.accent2} t={t} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.accent2, width: 16, textAlign: "right" }}>8</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO ALT */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2, marginBottom: 6 }}>
            <BH sigla="ALT" titulo="ALERTAS CRITICOS MOTOR" cor={t.danger} extra="3 AGORA" open={altOpen} toggle={() => setAltOpen(p => !p)} />
            {altOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "6px 10px" }}>
                {ALERTAS.map((a, i) => {
                  const sc = a.sev === "CRITICO" ? t.danger : t.warn;
                  const hov = hovA === i;
                  return (
                    <div key={i} onMouseEnter={() => setHovA(i)} onMouseLeave={() => setHovA(-1)}
                      style={{
                        border: `1px solid ${sc}${hov ? "88" : "44"}`, background: `${sc}06`,
                        padding: "8px 10px", transition: "all 0.15s", cursor: "pointer",
                        boxShadow: hov ? glowHov(sc) : "none", transform: hov ? "translateY(-1px)" : "none",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 6px", border: `1px solid ${sc}55`, color: sc, letterSpacing: 1 }}>{a.sev}</span>
                        <span style={{ fontSize: 7, color: t.t3 }}>{a.ctx}</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.t1, letterSpacing: "0.04em", marginBottom: 3, lineHeight: 1.3 }}>{a.t}</div>
                      <div style={{ fontSize: 9, color: sc, marginBottom: 6 }}>{a.pac}</div>
                      <div style={{
                        fontSize: 8, fontWeight: 700, color: sc, padding: "5px 0",
                        borderTop: `1px solid ${sc}22`, textAlign: "center", letterSpacing: 1,
                        background: hov ? `${sc}15` : "transparent", transition: "all 0.15s",
                      }}>{a.cta}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BLOCO DMD */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
            <BH sigla="DMD" titulo="DEMANDAS OPERACIONAIS" cor={t.doms[6]} extra="23 ITENS" open={dmdOpen} toggle={() => setDmdOpen(p => !p)} />
            {dmdOpen && [
              { dom: 1, tt: "CADASTRO INCOMPLETO", n: 3, s: "PENDENTE" },
              { dom: 2, tt: "CONFIRMACOES HOJE", n: 12, s: "EM CURSO" },
              { dom: 3, tt: "RECEITAS ASSINAR", n: 2, s: "PENDENTE" },
              { dom: 4, tt: "NF PENDENTES", n: 5, s: "ATRASADO" },
            ].map((d, i) => {
              const dc = t.doms[d.dom]; const hov = hovD === i;
              return (
                <div key={i} onMouseEnter={() => setHovD(i)} onMouseLeave={() => setHovD(-1)}
                  style={{
                    padding: "6px 10px", borderBottom: `1px solid ${t.border}22`,
                    display: "flex", alignItems: "center", gap: 6,
                    borderLeft: `3px solid ${hov ? dc : "transparent"}`,
                    background: hov ? `${dc}08` : "transparent",
                    boxShadow: hov && t.hasGlow ? `0 0 10px ${dc}18` : "none",
                    transition: "all 0.12s", cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: dc, width: 36 }}>{DOMINIOS[d.dom]?.k}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.t1, letterSpacing: "0.04em", flex: 1 }}>{d.tt}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: dc, fontVariantNumeric: "tabular-nums",
                    textShadow: t.hasGlow ? `0 0 6px ${dc}33` : "none" }}>{d.n}</span>
                  <span style={{ fontSize: 7, fontWeight: 700, color: d.s === "ATRASADO" ? t.danger : d.s === "PENDENTE" ? t.warn : t.ok, letterSpacing: 1 }}>{d.s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PAINEL CONTEXTO */}
        {ctxOpen ? (
          <div style={{ width: 180, background: t.bg, borderLeft: `1px solid ${t.border}`, padding: "6px 8px", flexShrink: 0, overflowY: "auto" }}>
            <div onClick={() => setCtxOpen(false)} style={{ fontSize: 7, color: t.accent, letterSpacing: 2, fontWeight: 700, marginBottom: 8, borderLeft: `2px solid ${t.accent}`, paddingLeft: 6, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>CONTEXTO</span><span style={{ color: t.t3 }}>]</span>
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "6px 8px", marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: t.t3, letterSpacing: 1, marginBottom: 4 }}>AGENDA RESTANTE</div>
              {["14:00 Camila T.", "15:30 Lucas V.", "17:00 Ana B."].map((x, i) => (
                <div key={i} style={{ fontSize: 9, color: t.t1, marginBottom: 3, padding: "2px 4px", borderLeft: `2px solid transparent`, cursor: "pointer", transition: "all 0.1s" }}
                  onMouseEnter={e => { e.target.style.borderLeftColor = t.accent; e.target.style.color = t.accent; }}
                  onMouseLeave={e => { e.target.style.borderLeftColor = "transparent"; e.target.style.color = t.t1; }}
                >{x}</div>
              ))}
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "6px 8px", marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: t.t3, letterSpacing: 1, marginBottom: 4 }}>ATALHOS</div>
              {["+ RECEITA", "+ EXAME", "+ MENSAGEM"].map((x, i) => (
                <div key={i} style={{ fontSize: 8, color: t.accent2, padding: "3px 4px", cursor: "pointer", borderLeft: `2px solid transparent`, transition: "all 0.1s", marginBottom: 1 }}
                  onMouseEnter={e => { e.target.style.borderLeftColor = t.accent2; e.target.style.background = `${t.accent2}10`; }}
                  onMouseLeave={e => { e.target.style.borderLeftColor = "transparent"; e.target.style.background = "transparent"; }}
                >{x}</div>
              ))}
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "6px 8px" }}>
              <div style={{ fontSize: 7, color: t.t3, letterSpacing: 1, marginBottom: 3 }}>TECLADO</div>
              {[["[","menu"],["1","OPE"],["2","ALT"],["3","DMD"],["]","ctx"]].map(([k, v], i) => (
                <div key={i} style={{ fontSize: 7, color: t.t3, marginBottom: 1, display: "flex", gap: 4 }}>
                  <span style={{ color: t.accent, fontWeight: 700, width: 10 }}>{k}</span>{v}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div onClick={() => setCtxOpen(true)} style={{ width: 18, background: t.bg, borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", writingMode: "vertical-rl", fontSize: 7, color: t.t3, letterSpacing: 2 }}>]</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SELETOR PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [tema, setTema] = useState("relojoaria");
  const temas = Object.values(TEMAS);

  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      <div style={{ background: "#000", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1A2D4F", flexWrap: "wrap" }}>
        <span style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: "#C89B3C", letterSpacing: 3 }}>PAWARDS</span>
        <span style={{ fontFamily: font, fontSize: 7, color: "#6B7E9E", letterSpacing: 2 }}>6 TEMAS INTERATIVOS</span>
        <div style={{ display: "flex", gap: 2, marginLeft: "auto", flexWrap: "wrap" }}>
          {temas.map(t => (
            <button key={t.id} onClick={() => setTema(t.id)} style={{
              padding: "4px 10px", fontFamily: font, fontSize: 8, fontWeight: 700,
              letterSpacing: 1, cursor: "pointer", border: "none",
              background: tema === t.id ? t.bg2 : "transparent",
              color: tema === t.id ? t.accent : "#6B7E9E",
              borderBottom: `2px solid ${tema === t.id ? t.accent : "transparent"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 6, height: 6, background: t.accent, display: "inline-block" }} />
                {t.nome}
              </div>
              <div style={{ fontSize: 6, color: "#6B7E9E", fontWeight: 400, marginTop: 1 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <Layout temaId={tema} />
      <div style={{ padding: "4px 12px", borderTop: "1px solid #1A2D4F", background: "#000", textAlign: "center" }}>
        <span style={{ fontFamily: font, fontSize: 6, color: "#6B7E9E", letterSpacing: 2 }}>
          CLIQUE BLOCOS P/ EXPANDIR | MENU E CONTEXTO COLAPSAVEIS | ATALHOS [ ] 1 2 3 | HOVER EM TUDO | GAUGES + SPARKLINES
        </span>
      </div>
    </div>
  );
}
