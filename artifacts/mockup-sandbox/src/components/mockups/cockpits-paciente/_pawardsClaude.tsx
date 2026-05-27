import { useState, useEffect } from "react";

/* ════════════════════════════════════════════════════════════════════
   LAYOUT PAWARDS · DISPOSIÇÃO INSPIRADA NO MOCK DO CLAUDE (27/mai)
   ────────────────────────────────────────────────────────────────────
   Caio pediu: pegar PROPORÇÕES/TAMANHOS/DISPOSIÇÃO do mock externo,
   MANTER nossa paleta (navy/gold/cyan/pasteis), MANTER hover neon
   já validado (box-shadow externo, miolo limpo, quina 90°).
   Fonte +1px em cada camada (Claude usava 10/8/7 — usamos 11/9/8).
   ════════════════════════════════════════════════════════════════════ */

const font = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

export type PerfilPawards = {
  id: string;
  nome: string;
  desc: string;
  bg: string;
  bg2: string;
  bg3: string;
  bg4: string;
  border: string;
  borderAccent: string;
  t1: string;
  t2: string;
  t3: string;
  accent: string;
  accent2: string;
  ok: string;
  warn: string;
  danger: string;
  doms: string[];
  hasGlow: boolean;
  filter: string;
};

const DOMINIOS = [
  { k: "DASHB", l: "DASHBOARD", sub: "operação" },
  { k: "PACTS", l: "PACIENTES", sub: "87" },
  { k: "AGEND", l: "AGENDA", sub: "5" },
  { k: "PRESC", l: "PRESCRIÇÃO", sub: "6" },
  { k: "FATUR", l: "FATURAMENTO", sub: "41K" },
  { k: "MOTOR", l: "MOTOR V4", sub: "142" },
  { k: "EQUIP", l: "EQUIPE", sub: "4" },
  { k: "AUDIT", l: "AUDITORIA", sub: "3" },
];

const KPIS = [
  { l: "SESSÕES", v: "18", sub: "12 ok · 4 curso · 2 falta" },
  { l: "RECEITA", v: "R$ 41.820", sub: "meta 38K · +10%" },
  { l: "ADERÊNCIA", v: "87%", sub: "obj 80% · +5pt" },
  { l: "FILA", v: "23", sub: "5 críticos" },
  { l: "MOTOR", v: "142", sub: "3 alertas" },
  { l: "FALTAS", v: "2", sub: "re-agendar" },
];

const ALERTAS = [
  { sev: "CRÍTICO", t: "INTERAÇÃO NAD+ × ATORVASTATINA", pac: "Graco Souza Pádua", cta: "REVISAR PROTOCOLO", ctx: "11:30 · 16min" },
  { sev: "URGENTE", t: "CORTISOL 8H BAIXO", pac: "Camila Toledo", cta: "REAVALIAR DHEA", ctx: "Lab 2d" },
  { sev: "URGENTE", t: "TSH LIMÍTROFE 4.8", pac: "Lucas Vargas", cta: "AGENDAR T4L", ctx: "Reflex pend." },
];

const DMD_ITENS = [
  { dom: 1, tt: "CADASTRO INCOMPLETO", n: 3, s: "PENDENTE" },
  { dom: 2, tt: "CONFIRMAÇÕES HOJE", n: 12, s: "EM CURSO" },
  { dom: 3, tt: "RECEITAS A ASSINAR", n: 2, s: "PENDENTE" },
  { dom: 4, tt: "NF PENDENTES", n: 5, s: "ATRASADO" },
];

function Gauge({ valor, max, label, cor, t, size = 68 }: { valor: number; max: number; label: string; cor: string; t: PerfilPawards; size?: number }) {
  const pct = Math.round((valor / max) * 100);
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const sweep = circ * 0.75;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border} strokeWidth="4"
          strokeDasharray={`${sweep} ${circ - sweep}`} transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth="4"
          strokeDasharray={`${(sweep * pct) / 100} ${circ}`} transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ filter: t.hasGlow ? `drop-shadow(0 0 4px ${cor}aa)` : "none", transition: "all 0.6s" }} />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: t.t1, fontSize: size * 0.24, fontWeight: 700, fontFamily: font }}>{pct}%</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: -4 }}>
        <span style={{ fontSize: 8, color: t.t3, fontFamily: font }}>{valor}/{max}</span>
        <span style={{ fontSize: 8, color: cor, fontWeight: 700, fontFamily: font }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 8, color: t.t3, fontFamily: font, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Spark({ data, cor, t, w = 88, h = 22 }: { data: number[]; cor: string; t: PerfilPawards; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5"
        style={{ filter: t.hasGlow ? `drop-shadow(0 0 3px ${cor}88)` : "none" }} />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.4" fill={cor}
        style={{ filter: t.hasGlow ? `drop-shadow(0 0 4px ${cor})` : "none" }} />
    </svg>
  );
}

export function LayoutPawardsClaude({ perfil: t }: { perfil: PerfilPawards }) {
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

  const kpiC = [t.accent, t.doms[0], t.ok, t.warn, t.doms[5], t.danger];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "[") { e.preventDefault(); setMenuOpen((p) => !p); }
      if (e.key === "]") { e.preventDefault(); setCtxOpen((p) => !p); }
      if (e.key === "1") setOpeOpen((p) => !p);
      if (e.key === "2") setAltOpen((p) => !p);
      if (e.key === "3") setDmdOpen((p) => !p);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const glow = (cor: string, i = 10) => (t.hasGlow ? `0 0 ${i}px ${cor}44` : "none");
  const glowHov = (cor: string) => (t.hasGlow ? `0 0 18px 2px ${cor}77` : `0 0 4px ${cor}44`);

  const BH = ({ sigla, titulo, cor, extra, open, toggle }: { sigla: string; titulo: string; cor: string; extra?: string; open: boolean; toggle: () => void }) => (
    <div onClick={toggle} style={{
      padding: "7px 14px", background: t.bg3, borderBottom: `1px solid ${t.border}`,
      borderLeft: `3px solid ${cor}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      transition: "background 0.15s",
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bg4; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bg3; }}
    >
      <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, padding: "2px 7px", background: `${cor}22`, color: cor, letterSpacing: 1 }}>{sigla}</span>
      <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.08em", flex: 1 }}>{titulo}</span>
      {extra && <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: cor }}>{extra}</span>}
      <span style={{ fontFamily: font, fontSize: 10, color: t.t3 }}>{open ? "FECHAR" : "ABRIR"}</span>
    </div>
  );

  return (
    <div style={{ background: t.bg, minHeight: 720, fontFamily: font, color: t.t1, filter: t.filter, display: "flex", flexDirection: "column" }}>

      {/* FAIXA 1 · TOPO */}
      <div style={{ height: 48, background: t.bg, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <button onClick={() => setLocal(true)} style={{
          padding: "4px 12px", border: `1px solid ${local ? t.ok : t.border}`,
          background: local ? `${t.ok}18` : "transparent", color: local ? t.ok : t.t3,
          fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          boxShadow: local ? glow(t.ok) : "none", transition: "all 0.2s",
        }}>LOCAL</button>
        <button onClick={() => setLocal(false)} style={{
          padding: "4px 12px", border: `1px solid ${!local ? t.doms[1] : t.border}`,
          background: !local ? `${t.doms[1]}18` : "transparent", color: !local ? t.doms[1] : t.t3,
          fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s",
        }}>GLOBAL</button>
        <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
          {["1", "2", "3"].map((n) => (
            <button key={n} style={{
              width: 24, height: 24, border: `1px solid ${n === "3" ? t.warn : t.border}`,
              background: n === "3" ? `${t.warn}22` : "transparent", color: n === "3" ? t.warn : t.t3,
              fontFamily: font, fontSize: 10, fontWeight: 700, cursor: "pointer",
            }}>{n}</button>
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: 220, marginLeft: 8, padding: "4px 10px", background: t.bg2, border: `1px solid ${t.border}`, display: "flex", gap: 6, alignItems: "center", transition: "border-color 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; if (t.hasGlow) (e.currentTarget as HTMLElement).style.boxShadow = glow(t.accent, 6); }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <span style={{ color: t.accent, fontSize: 10 }}>⌕</span>
          <span style={{ color: t.t3, fontSize: 10 }}>buscar</span>
          <span style={{ marginLeft: "auto", color: t.t3, fontSize: 8, padding: "0 4px", border: `1px solid ${t.border}` }}>⌘K</span>
        </div>
        <span style={{ marginLeft: "auto", color: t.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "4px 10px", border: `1px solid ${t.accent}55`, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${t.accent}18`; (e.currentTarget as HTMLElement).style.boxShadow = glow(t.accent); }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >CAIO REGISTER</span>
        <span style={{ fontSize: 9, color: t.t2, padding: "3px 7px", border: `1px solid ${t.border}` }}>MÉDICO</span>
        <span style={{ fontSize: 9, color: t.warn, padding: "3px 7px", border: `1px solid ${t.warn}44`, cursor: "pointer" }}>CONFIG</span>
        <span style={{ fontSize: 9, color: t.danger, padding: "3px 7px", border: `1px solid ${t.danger}44`, cursor: "pointer" }}>SAIR</span>
      </div>

      {/* FAIXA 2 · BREADCRUMB */}
      <div style={{ height: 30, background: t.bg, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${t.borderAccent}`, fontSize: 9, letterSpacing: "0.12em", color: t.t1, flexShrink: 0 }}>
        {["PAWARDS", "PÁDUA MATRIZ", "DASHBOARD GLOBAL"].map((x, i, a) => (
          <span key={i}>
            <span style={{ padding: "2px 6px", cursor: "pointer", transition: "color 0.1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.t1; }}
            >{x}</span>
            {i < a.length - 1 && <span style={{ color: t.t3, margin: "0 3px" }}>▸</span>}
          </span>
        ))}
        <span style={{ background: t.accent, color: t.bg, padding: "2px 8px", fontWeight: 700, marginLeft: 6, fontSize: 9 }}>{t.nome}</span>
      </div>

      {/* FAIXA 3 · PACIENTE ATIVO */}
      <div style={{ height: 32, background: t.bg2, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: t.ok, fontWeight: 700, letterSpacing: 1, padding: "2px 5px", border: `1px solid ${t.ok}55` }}>ATIVO</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: 1 }}>GRACO SOUZA PÁDUA</span>
        <span style={{ fontSize: 9, color: t.t2 }}>34A · M</span>
        <span style={{ fontSize: 9, color: t.t3 }}>HAS · DM2</span>
        <span style={{ fontSize: 9, color: t.warn, marginLeft: "auto" }}>SESSÃO 11:30 · 16MIN</span>
      </div>

      {/* CORPO */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* MENU LATERAL */}
        <div style={{ width: menuOpen ? 144 : 40, background: t.bg, borderRight: `1px solid ${t.border}`, padding: "6px 0", transition: "width 0.2s", flexShrink: 0, overflowY: "auto" }}>
          <div onClick={() => setMenuOpen((p) => !p)} style={{ padding: "4px 8px", textAlign: "center", cursor: "pointer", color: t.t3, fontSize: 9, marginBottom: 4 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.t3; }}
          >{menuOpen ? "[" : "]"}</div>
          {DOMINIOS.map((d, i) => {
            const cor = t.doms[i];
            const act = i === actDom;
            const hov = i === hovM;
            return (
              <div key={d.k} onClick={() => setActDom(i)} onMouseEnter={() => setHovM(i)} onMouseLeave={() => setHovM(-1)}
                style={{
                  padding: menuOpen ? "7px 10px" : "7px 2px",
                  display: "flex", alignItems: "center", gap: 6,
                  borderLeft: `3px solid ${act ? cor : hov ? `${cor}88` : "transparent"}`,
                  background: act ? `${cor}14` : t.bg,
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: hov && t.hasGlow
                    ? `0 0 16px 1px ${cor}66, 0 0 6px 0 ${cor}99`
                    : act && t.hasGlow ? `inset 0 0 10px ${cor}1a` : "none",
                }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: act || hov ? cor : t.t2, letterSpacing: 1, minWidth: menuOpen ? 38 : "auto", textShadow: hov && t.hasGlow ? `0 0 8px ${cor}` : "none" }}>{d.k}</span>
                {menuOpen && (
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span style={{ fontSize: 9, color: act || hov ? t.t1 : t.t2, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{d.l}</span>
                    <span style={{ fontSize: 8, color: t.t3, whiteSpace: "nowrap" }}>{d.sub}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CONTEÚDO CENTRAL */}
        <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>

          {/* BLOCO OPE */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2, marginBottom: 8 }}>
            <BH sigla="OPE" titulo="OPERAÇÃO HOJE · 27/MAI/2026 · QUI · 11:14" cor={t.doms[0]} extra="EM CURSO" open={opeOpen} toggle={() => setOpeOpen((p) => !p)} />
            {opeOpen && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: t.border, padding: 1 }}>
                  {KPIS.map((k, i) => (
                    <div key={i} onMouseEnter={() => setHovK(i)} onMouseLeave={() => setHovK(-1)}
                      style={{
                        background: hovK === i ? `${kpiC[i]}10` : t.bg2,
                        padding: "10px 8px", textAlign: "center", transition: "all 0.15s", cursor: "default",
                        boxShadow: hovK === i ? glowHov(kpiC[i]) : "none",
                      }}>
                      <div style={{ fontSize: 9, color: t.t1, letterSpacing: "0.14em", fontWeight: 700 }}>{k.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: kpiC[i], fontVariantNumeric: "tabular-nums", marginTop: 3, textShadow: t.hasGlow ? `0 0 8px ${kpiC[i]}44` : "none" }}>{k.v}</div>
                      <div style={{ fontSize: 9, color: t.t2, marginTop: 3 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 14px", borderTop: `1px solid ${t.border}`, flexWrap: "wrap", gap: 6 }}>
                  <Gauge valor={18} max={24} label="SESSÕES" cor={t.accent} t={t} />
                  <Gauge valor={87} max={100} label="ADERÊNCIA" cor={t.ok} t={t} />
                  <Gauge valor={41820} max={50000} label="RECEITA" cor={t.doms[0]} t={t} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>SONO 7d</span>
                      <Spark data={[6, 7, 7, 8, 7, 8, 9]} cor={t.accent} t={t} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, width: 16, textAlign: "right" }}>9</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>ENERGIA</span>
                      <Spark data={[5, 6, 7, 7, 8, 8, 8]} cor={t.ok} t={t} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, width: 16, textAlign: "right" }}>8</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>FOCO</span>
                      <Spark data={[7, 7, 8, 8, 7, 9, 8]} cor={t.accent2} t={t} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.accent2, width: 16, textAlign: "right" }}>8</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO ALT */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2, marginBottom: 8 }}>
            <BH sigla="ALT" titulo="ALERTAS CRÍTICOS DO MOTOR" cor={t.danger} extra="3 AGORA" open={altOpen} toggle={() => setAltOpen((p) => !p)} />
            {altOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 12px" }}>
                {ALERTAS.map((a, i) => {
                  const sc = a.sev === "CRÍTICO" ? t.danger : t.warn;
                  const hov = hovA === i;
                  return (
                    <div key={i} onMouseEnter={() => setHovA(i)} onMouseLeave={() => setHovA(-1)}
                      style={{
                        border: `1px solid ${sc}${hov ? "99" : "55"}`, background: t.bg2,
                        padding: "10px 12px", transition: "all 0.15s", cursor: "pointer",
                        boxShadow: hov ? glowHov(sc) : "none", transform: hov ? "translateY(-1px)" : "none",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", border: `1px solid ${sc}66`, color: sc, letterSpacing: 1 }}>{a.sev}</span>
                        <span style={{ fontSize: 8, color: t.t3 }}>{a.ctx}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.04em", marginBottom: 4, lineHeight: 1.3 }}>{a.t}</div>
                      <div style={{ fontSize: 10, color: sc, marginBottom: 8 }}>{a.pac}</div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: sc, padding: "6px 0",
                        borderTop: `1px solid ${sc}33`, textAlign: "center", letterSpacing: 1,
                        background: hov ? `${sc}18` : "transparent", transition: "all 0.15s",
                      }}>{a.cta}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BLOCO DMD */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
            <BH sigla="DMD" titulo="DEMANDAS OPERACIONAIS · POR DOMÍNIO" cor={t.doms[6]} extra="23 ITENS" open={dmdOpen} toggle={() => setDmdOpen((p) => !p)} />
            {dmdOpen && DMD_ITENS.map((d, i) => {
              const dc = t.doms[d.dom];
              const hov = hovD === i;
              return (
                <div key={i} onMouseEnter={() => setHovD(i)} onMouseLeave={() => setHovD(-1)}
                  style={{
                    padding: "8px 12px", borderBottom: `1px solid ${t.border}44`,
                    display: "flex", alignItems: "center", gap: 8,
                    borderLeft: `3px solid ${hov ? dc : "transparent"}`,
                    background: t.bg2,
                    boxShadow: hov && t.hasGlow ? `0 0 14px 1px ${dc}55` : "none",
                    transition: "all 0.15s", cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: dc, width: 44, letterSpacing: 1 }}>{DOMINIOS[d.dom]?.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.t1, letterSpacing: "0.04em", flex: 1 }}>{d.tt}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: dc, fontVariantNumeric: "tabular-nums", textShadow: t.hasGlow ? `0 0 6px ${dc}44` : "none" }}>{d.n}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: d.s === "ATRASADO" ? t.danger : d.s === "PENDENTE" ? t.warn : t.ok, letterSpacing: 1, padding: "2px 6px", border: `1px solid ${d.s === "ATRASADO" ? t.danger : d.s === "PENDENTE" ? t.warn : t.ok}44` }}>{d.s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PAINEL CONTEXTO */}
        {ctxOpen ? (
          <div style={{ width: 200, background: t.bg, borderLeft: `1px solid ${t.border}`, padding: "8px 10px", flexShrink: 0, overflowY: "auto" }}>
            <div onClick={() => setCtxOpen(false)} style={{ fontSize: 8, color: t.accent, letterSpacing: 2, fontWeight: 700, marginBottom: 10, borderLeft: `2px solid ${t.accent}`, paddingLeft: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>CONTEXTO</span><span style={{ color: t.t3 }}>]</span>
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 6 }}>AGENDA RESTANTE</div>
              {["14:00 · Camila T.", "15:30 · Lucas V.", "17:00 · Ana B."].map((x, i) => (
                <div key={i} style={{ fontSize: 10, color: t.t1, marginBottom: 4, padding: "3px 6px", borderLeft: "2px solid transparent", cursor: "pointer", transition: "all 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = t.accent; (e.currentTarget as HTMLElement).style.color = t.accent; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; (e.currentTarget as HTMLElement).style.color = t.t1; }}
                >{x}</div>
              ))}
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 6 }}>ATALHOS</div>
              {["+ RECEITA", "+ EXAME", "+ MENSAGEM"].map((x, i) => (
                <div key={i} style={{ fontSize: 9, color: t.accent2, padding: "4px 6px", cursor: "pointer", borderLeft: "2px solid transparent", transition: "all 0.1s", marginBottom: 2 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = t.accent2; (e.currentTarget as HTMLElement).style.background = `${t.accent2}14`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >{x}</div>
              ))}
            </div>
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 4 }}>TECLADO</div>
              {[["[", "menu"], ["1", "OPE"], ["2", "ALT"], ["3", "DMD"], ["]", "ctx"]].map(([k, v], i) => (
                <div key={i} style={{ fontSize: 8, color: t.t3, marginBottom: 2, display: "flex", gap: 6 }}>
                  <span style={{ color: t.accent, fontWeight: 700, width: 12 }}>{k}</span>{v}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div onClick={() => setCtxOpen(true)} style={{ width: 20, background: t.bg, borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", writingMode: "vertical-rl", fontSize: 8, color: t.t3, letterSpacing: 2 }}>]</div>
        )}
      </div>
    </div>
  );
}
