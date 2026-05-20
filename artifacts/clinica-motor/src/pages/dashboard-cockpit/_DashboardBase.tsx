import { useState } from "react";

export type DashTheme = {
  name: string;
  subtitle: string;
  bg: string; bgAlt: string; bgDeep: string;
  ink: string; inkDim: string; inkMute: string;
  line: string; lineSoft: string;
  accent: string; accentDeep: string;
  ok: string; warn: string; danger: string;
  neonPrim: string; neonSec: string; neonTer: string;
  mono: string; sans: string;
  gaugeStyle?: "ring" | "fan" | "tachy"; // visual variation
  barStyle?: "smooth" | "hashed" | "segmented";
};

const KEYFRAMES = (tk: DashTheme) => `
@keyframes pw-pulse-glow { 0%,100% { opacity:.85 } 50% { opacity:1 } }
.pw-tile {
  position: relative; background: ${tk.bgAlt}; border: 1px solid ${tk.line};
  padding: 14px 16px;
  transition: border-color 180ms ease, box-shadow 220ms ease, transform 180ms ease, background 180ms ease;
  cursor: pointer;
}
.pw-tile:hover {
  border-color: var(--pw-neon, ${tk.neonPrim});
  background: linear-gradient(180deg, ${tk.bgAlt} 0%, ${tk.bgDeep} 100%);
  box-shadow: 0 0 0 1px var(--pw-neon, ${tk.neonPrim}),
              0 0 16px -2px var(--pw-neon-soft, ${tk.neonPrim}55),
              0 0 36px -10px var(--pw-neon-soft, ${tk.neonPrim}55);
  transform: translateY(-1px);
}
.pw-tile:hover .pw-tile-corner { color: var(--pw-neon, ${tk.neonPrim}); }
.pw-tile:hover .pw-tile-value  { color: ${tk.ink}; text-shadow: 0 0 12px var(--pw-neon-soft, ${tk.neonPrim}88); }
.pw-lupa {
  display:inline-flex;align-items:center;justify-content:center;
  width:20px;height:20px;border:1px solid ${tk.line};color:${tk.inkMute};
  background:transparent;cursor:pointer;transition:all 180ms ease;font-size:10px;
}
.pw-lupa:hover { border-color:${tk.neonPrim};color:${tk.neonPrim};box-shadow:0 0 8px -2px ${tk.neonPrim}88; }
.pw-lupa.open { background:${tk.neonPrim};color:${tk.bg};border-color:${tk.neonPrim}; }
.pw-bar3d {
  position:relative;height:20px;background:${tk.bgDeep};border:1px solid ${tk.line};overflow:hidden;
}
.pw-bar3d-fill {
  height:100%;
  background:linear-gradient(180deg,
    color-mix(in srgb, var(--pw-bar-color, ${tk.accent}) 92%, white 8%) 0%,
    var(--pw-bar-color, ${tk.accent}) 45%,
    color-mix(in srgb, var(--pw-bar-color, ${tk.accent}) 78%, black 22%) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -2px 4px rgba(0,0,0,.4),
             0 0 12px -2px var(--pw-bar-glow, ${tk.accent}66);
  position:relative;
}
${tk.barStyle === "hashed" ? `
.pw-bar3d-fill::after { content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(135deg,transparent 0,transparent 4px,rgba(255,255,255,.05) 4px,rgba(255,255,255,.05) 5px); }
` : ""}
${tk.barStyle === "segmented" ? `
.pw-bar3d-fill::after { content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent 0,transparent 7px,rgba(0,0,0,.35) 7px,rgba(0,0,0,.35) 8px); }
` : ""}
${tk.barStyle === "smooth" ? `
.pw-bar3d-fill::after { content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 50%); }
` : ""}
`;

function Gauge({ value, label, color, tk, size = 110 }: { value: number; label: string; color: string; tk: DashTheme; size?: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const ticks = tk.gaugeStyle === "tachy" ? 32 : tk.gaugeStyle === "fan" ? 16 : 24;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.42" />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r={r} stroke={tk.lineSoft} strokeWidth={tk.gaugeStyle === "fan" ? 8 : 6} fill="none" />
          <circle cx="60" cy="60" r={r} stroke={`url(#g-${label})`} strokeWidth={tk.gaugeStyle === "fan" ? 8 : 6} fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap={tk.gaugeStyle === "tachy" ? "round" : "butt"}
            filter={`url(#glow-${label})`} />
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * 2 * Math.PI;
            const x1 = 60 + Math.cos(a) * 58;
            const y1 = 60 + Math.sin(a) * 58;
            const major = i % (ticks / 4) === 0;
            const x2 = 60 + Math.cos(a) * (major ? 52 : 55);
            const y2 = 60 + Math.sin(a) * (major ? 52 : 55);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tk.inkMute} strokeWidth={major ? 1.2 : 0.6} opacity={major ? 0.7 : 0.3} />;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: tk.mono, fontSize: 19, color: tk.ink, fontWeight: 500, letterSpacing: -0.5 }}>
            {value}<span style={{ fontSize: 10, color: tk.inkMute }}>%</span>
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 7, color: tk.inkMute, letterSpacing: 1.5, marginTop: 1 }}>
            {label.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, color, w = 70, h = 18 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} opacity="0.95" />
      <polyline fill={color} fillOpacity="0.14" stroke="none" points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

type LupaKey = "instituto" | "receita" | "ranking" | "sla";

function NeonTile({
  tk, neon, accent, label, value, hint, trend, lupaKey, openLupa, setOpenLupa, lupaPanel,
}: {
  tk: DashTheme; neon: string; accent: string; label: string; value: string; hint: string;
  trend?: number[]; lupaKey: LupaKey;
  openLupa: LupaKey | null; setOpenLupa: (k: LupaKey | null) => void;
  lupaPanel: React.ReactNode;
}) {
  const isOpen = openLupa === lupaKey;
  return (
    <div className="pw-tile" style={{
      ["--pw-neon" as any]: neon,
      ["--pw-neon-soft" as any]: neon + "55",
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</div>
          <div className="pw-tile-value" style={{
            fontFamily: tk.mono, fontSize: 22, color: tk.ink, fontWeight: 500, lineHeight: 1.1, marginTop: 5, transition: "all 180ms ease",
          }}>{value}</div>
          <div style={{ fontFamily: tk.sans, fontSize: 10, color: tk.inkDim, marginTop: 3 }}>{hint}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <button className={`pw-lupa ${isOpen ? "open" : ""}`}
            onClick={(e) => { e.stopPropagation(); setOpenLupa(isOpen ? null : lupaKey); }}
            title="abrir detalhes">⌕</button>
          <div className="pw-tile-corner" style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMute, letterSpacing: 1, transition: "color 180ms ease" }}>◢</div>
        </div>
      </div>
      {trend && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${tk.lineSoft}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Sparkline data={trend} color={neon} />
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: neon, letterSpacing: 0.5 }}>
            {trend[trend.length - 1] > trend[0] ? "▲" : "▼"} {Math.abs(Math.round((trend[trend.length - 1] - trend[0]) / trend[0] * 100))}%
          </div>
        </div>
      )}
      {isOpen && (
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${neon}55`,
          background: `linear-gradient(180deg, ${neon}0E 0%, transparent 100%)`,
          marginLeft: -16, marginRight: -16, marginBottom: -14,
          padding: "10px 16px 14px",
          animation: "pw-pulse-glow 1.4s ease-in-out infinite",
        }}>{lupaPanel}</div>
      )}
    </div>
  );
}

function Bar3D({ tk, label, value, max, color, glow, sigla }: { tk: DashTheme; label: string; value: number; max: number; color: string; glow: string; sigla: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px 36px", gap: 8, alignItems: "center", padding: "4px 0" }}>
      <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkDim, letterSpacing: 1.2 }}>{sigla}</div>
      <div className="pw-bar3d" style={{ ["--pw-bar-color" as any]: color, ["--pw-bar-glow" as any]: glow }}>
        <div className="pw-bar3d-fill" style={{ width: `${pct}%` }} />
        <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", fontFamily: tk.mono, fontSize: 10, color: tk.ink, textShadow: "0 1px 2px rgba(0,0,0,.7)", letterSpacing: 0.4 }}>{label}</div>
      </div>
      <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ink, textAlign: "right" }}>{value.toLocaleString("pt-BR")}</div>
      <div style={{ fontFamily: tk.mono, fontSize: 9, color, textAlign: "right" }}>{pct}%</div>
    </div>
  );
}

export function DashboardBase({ theme: tk }: { theme: DashTheme }) {
  const [openLupa, setOpenLupa] = useState<LupaKey | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: tk.bg, color: tk.ink, fontFamily: tk.sans }}>
      <style>{KEYFRAMES(tk)}</style>

      <div style={{
        borderBottom: `1px solid ${tk.line}`, padding: "12px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(180deg, ${tk.bgAlt} 0%, ${tk.bg} 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontFamily: tk.mono, fontSize: 9, color: tk.neonPrim, letterSpacing: 1.8,
            padding: "3px 7px", border: `1px solid ${tk.neonPrim}55`, boxShadow: `0 0 8px -2px ${tk.neonPrim}55`,
          }}>PAWARDS · {tk.name.toUpperCase()}</div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkDim, letterSpacing: 1 }}>DASHBOARD · CEO</div>
        </div>
        <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.ok }}>● ONLINE · 3u · 184 sessões</span>
      </div>

      <div style={{ padding: "12px 18px 8px" }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, letterSpacing: 1.8 }}>COCKPIT · TEMPO REAL</div>
        <div style={{ fontFamily: tk.sans, fontSize: 22, fontWeight: 500, color: tk.ink, marginTop: 3 }}>
          Sorriso Pádua <span style={{ color: tk.neonPrim, fontSize: 12, marginLeft: 6 }}>· {tk.subtitle}</span>
        </div>
      </div>

      <div style={{
        margin: "0 18px",
        padding: "14px 14px",
        background: `radial-gradient(ellipse at top, ${tk.bgAlt} 0%, ${tk.bg} 80%)`,
        border: `1px solid ${tk.line}`,
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, alignItems: "center",
      }}>
        <Gauge tk={tk} value={94} label="Aderência" color={tk.ok} />
        <Gauge tk={tk} value={78} label="Validação" color={tk.accent} />
        <Gauge tk={tk} value={62} label="Faturado"  color={tk.neonTer} />
        <Gauge tk={tk} value={41} label="Followup"  color={tk.warn} />
        <Gauge tk={tk} value={88} label="Agenda"    color={tk.neonPrim} />
        <Gauge tk={tk} value={23} label="SLA Crít." color={tk.danger} />
      </div>

      <div style={{ margin: "12px 18px 0", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <NeonTile tk={tk} neon={tk.neonPrim} accent={tk.accentDeep}
          label="INSTITUTO PÁDUA" value="3.877" hint="pacientes reais · 8 agendas"
          trend={[3210, 3340, 3501, 3622, 3741, 3820, 3877]}
          lupaKey="instituto" openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonPrim, letterSpacing: 1.4 }}>ÚLT. 7 DIAS · NOVOS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {[12, 18, 9, 24, 31, 22, 36].map((n, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.ink }}>{n}</div>
                    <div style={{ fontFamily: tk.mono, fontSize: 7, color: tk.inkMute, marginTop: 1 }}>
                      {["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          } />
        <NeonTile tk={tk} neon={tk.neonTer} accent={tk.warn}
          label="POT. RECEITA" value="R$ 2,73M" hint="fichas históricas · estimativa"
          trend={[1.8, 2.0, 2.15, 2.3, 2.48, 2.61, 2.73]}
          lupaKey="receita" openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonTer, letterSpacing: 1.4 }}>DECOMP. POR VIA</div>
              <Bar3D tk={tk} sigla="IM"  label="Intramusc."  value={840} max={1000} color={tk.accent}    glow={`${tk.accent}88`} />
              <Bar3D tk={tk} sigla="EV"  label="Endovenoso"  value={620} max={1000} color={tk.neonPrim}  glow={`${tk.neonPrim}88`} />
              <Bar3D tk={tk} sigla="VO"  label="Via Oral"    value={510} max={1000} color={tk.ok}        glow={`${tk.ok}88`} />
              <Bar3D tk={tk} sigla="IMP" label="Implante"    value={380} max={1000} color={tk.neonSec}   glow={`${tk.neonSec}88`} />
            </div>
          } />
        <NeonTile tk={tk} neon={tk.neonSec} accent={tk.accentDeep}
          label="DEMANDAS" value="47" hint="14 vencidas · 33 no prazo"
          trend={[28, 32, 30, 38, 42, 45, 47]}
          lupaKey="ranking" openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonSec, letterSpacing: 1.4 }}>TOP COLABORADORES</div>
              {[
                { n: "Maria Silva", p: 605, pct: 92 },
                { n: "João Andrade", p: 488, pct: 74 },
                { n: "Ana Beatriz", p: 412, pct: 63 },
              ].map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 50px 40px", gap: 6, alignItems: "center" }}>
                  <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonSec }}>{i + 1}º</div>
                  <div style={{ fontFamily: tk.sans, fontSize: 10, color: tk.ink }}>{r.n}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkDim, textAlign: "right" }}>R$ {r.p}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonSec, textAlign: "right" }}>{r.pct}%</div>
                </div>
              ))}
            </div>
          } />
        <NeonTile tk={tk} neon={tk.danger} accent={tk.danger}
          label="SLA CRÍTICO" value="12" hint="delegações vencidas · CEO"
          trend={[8, 10, 9, 11, 13, 12, 12]}
          lupaKey="sla" openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.danger, letterSpacing: 1.4 }}>VIOLAÇÕES SLA</div>
              {[
                { p: "Diamante", s: "4h", v: 5, pct: 8 },
                { p: "Ouro", s: "12h", v: 4, pct: 12 },
                { p: "Prata", s: "24h", v: 2, pct: 4 },
              ].map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 28px 36px", gap: 6, alignItems: "center" }}>
                  <div style={{ fontFamily: tk.sans, fontSize: 10, color: tk.ink }}>{s.p}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute }}>{s.s}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.danger, textAlign: "right" }}>{s.v}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.danger, textAlign: "right" }}>{s.pct}%</div>
                </div>
              ))}
              <div style={{ marginTop: 4, padding: 5, background: `${tk.danger}15`, border: `1px solid ${tk.danger}55`, fontFamily: tk.mono, fontSize: 9, color: tk.danger }}>
                ⚠ ESCALAR · 5 DIAMANTE {">"} 4h
              </div>
            </div>
          } />
      </div>

      <div style={{
        margin: "12px 18px 0", background: tk.bgAlt, border: `1px solid ${tk.line}`,
        borderLeft: `3px solid ${tk.neonPrim}`, padding: "14px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, letterSpacing: 1.8 }}>PIPELINE · VIA TERAPÊUTICA</div>
            <div style={{ fontFamily: tk.sans, fontSize: 13, color: tk.ink, marginTop: 2 }}>Sessões da semana</div>
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.neonPrim }}>Σ 1.847 · meta 2.000</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Bar3D tk={tk} sigla="EV"  label="Endovenoso"       value={487} max={600} color={tk.neonPrim} glow={`${tk.neonPrim}88`} />
          <Bar3D tk={tk} sigla="IM"  label="Intramuscular"    value={392} max={600} color={tk.accent}   glow={`${tk.accent}88`} />
          <Bar3D tk={tk} sigla="SC"  label="Subcutâneo"       value={284} max={600} color={tk.neonSec}  glow={`${tk.neonSec}88`} />
          <Bar3D tk={tk} sigla="VO"  label="Via Oral"         value={341} max={600} color={tk.ok}       glow={`${tk.ok}88`} />
          <Bar3D tk={tk} sigla="IMP" label="Implante"         value={198} max={600} color={tk.neonTer}  glow={`${tk.neonTer}88`} />
          <Bar3D tk={tk} sigla="PRC" label="Procedimentos"    value={145} max={600} color={tk.warn}     glow={`${tk.warn}88`} />
        </div>
      </div>

      <div style={{
        margin: "12px 18px 18px", background: tk.bgAlt, border: `1px solid ${tk.line}`,
        borderLeft: `3px solid ${tk.warn}`, padding: "14px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, letterSpacing: 1.8 }}>ALERTAS CEO · 24h</div>
          <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.warn }}>● 7</span>
        </div>
        {[
          { t: "ZapSign cão-de-guarda", m: "envelope 8f0eb530 sem retorno", h: "22:14", l: tk.warn },
          { t: "WhatsApp CEO", m: "Twilio entregue · Caio leu 21:42", h: "21:42", l: tk.ok },
          { t: "Backfill posologia", m: "259/259 · 100%", h: "20:18", l: tk.ok },
          { t: "Receita #3497", m: "Galena recebeu via Drive", h: "19:30", l: tk.accent },
        ].map((a, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "8px 1fr 44px", gap: 8, padding: "6px 0", borderBottom: i < 3 ? `1px dashed ${tk.lineSoft}` : "none" }}>
            <span style={{ width: 8, height: 8, marginTop: 3, background: a.l, boxShadow: `0 0 6px ${a.l}` }} />
            <div>
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: a.l, letterSpacing: 0.8, textTransform: "uppercase" }}>{a.t}</div>
              <div style={{ fontFamily: tk.sans, fontSize: 10, color: tk.inkDim, marginTop: 1 }}>{a.m}</div>
            </div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, textAlign: "right" }}>{a.h}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
