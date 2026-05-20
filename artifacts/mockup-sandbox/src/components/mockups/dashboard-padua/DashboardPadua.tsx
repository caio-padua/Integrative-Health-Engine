import { useState } from "react";

const tk = {
  bg: "#0B1220",
  bgAlt: "#111B2E",
  bgDeep: "#070D18",
  ink: "#E8EEF7",
  inkDim: "#9FB0C9",
  inkMute: "#6B7E9E",
  line: "#1E2A44",
  lineSoft: "#172238",
  accent: "#7AA2F7",
  accentDeep: "#3A5BB0",
  ok: "#7CC4A0",
  warn: "#E0B062",
  danger: "#D08A8A",
  neonCyan: "#5EE6E6",
  neonViolet: "#B58CF0",
  neonGold: "#E6C572",
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: '"Inter", system-ui, -apple-system, sans-serif',
};

const NEON_KEYFRAMES = `
@keyframes pw-pulse-glow {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
@keyframes pw-rotate-slow {
  from { transform: rotate(0deg); } to { transform: rotate(360deg); }
}
.pw-tile {
  position: relative;
  background: ${tk.bgAlt};
  border: 1px solid ${tk.line};
  padding: 16px 18px;
  transition: border-color 180ms ease, box-shadow 220ms ease, transform 180ms ease, background 180ms ease;
  cursor: pointer;
}
.pw-tile::before {
  content: "";
  position: absolute; inset: 0;
  pointer-events: none;
  box-shadow: 0 0 0 0 transparent inset;
  transition: box-shadow 220ms ease;
}
.pw-tile:hover {
  border-color: var(--pw-neon, ${tk.neonCyan});
  background: linear-gradient(180deg, ${tk.bgAlt} 0%, ${tk.bgDeep} 100%);
  box-shadow: 0 0 0 1px var(--pw-neon, ${tk.neonCyan}),
              0 0 18px -2px var(--pw-neon-soft, rgba(94,230,230,0.35)),
              0 0 40px -10px var(--pw-neon-soft, rgba(94,230,230,0.25));
  transform: translateY(-1px);
}
.pw-tile:hover .pw-tile-corner { color: var(--pw-neon, ${tk.neonCyan}); }
.pw-tile:hover .pw-tile-value { color: ${tk.ink}; text-shadow: 0 0 12px var(--pw-neon-soft, rgba(94,230,230,0.5)); }
.pw-lupa {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border: 1px solid ${tk.line};
  color: ${tk.inkMute};
  background: transparent;
  cursor: pointer;
  transition: all 180ms ease;
  font-size: 11px;
}
.pw-lupa:hover {
  border-color: ${tk.neonCyan};
  color: ${tk.neonCyan};
  box-shadow: 0 0 10px -2px rgba(94,230,230,0.55);
}
.pw-lupa.open {
  background: ${tk.neonCyan};
  color: ${tk.bg};
  border-color: ${tk.neonCyan};
}
.pw-bar3d {
  position: relative;
  height: 22px;
  background: ${tk.bgDeep};
  border: 1px solid ${tk.line};
  overflow: hidden;
}
.pw-bar3d-fill {
  height: 100%;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--pw-bar-color, ${tk.accent}) 92%, white 8%) 0%,
    var(--pw-bar-color, ${tk.accent}) 45%,
    color-mix(in srgb, var(--pw-bar-color, ${tk.accent}) 80%, black 20%) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.18),
    inset 0 -2px 4px rgba(0,0,0,0.35),
    0 0 12px -2px var(--pw-bar-glow, rgba(122,162,247,0.4));
  position: relative;
}
.pw-bar3d-fill::after {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(135deg,
    transparent 0, transparent 4px,
    rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px);
}
`;

function Gauge({ value, label, color, size = 130 }: { value: number; label: string; color: string; size?: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.45" />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r={r} stroke={tk.lineSoft} strokeWidth="6" fill="none" />
          <circle cx="60" cy="60" r={r} stroke={`url(#g-${label})`} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="butt"
            filter={`url(#glow-${label})`} />
          {/* tick marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * 2 * Math.PI;
            const x1 = 60 + Math.cos(a) * 58;
            const y1 = 60 + Math.sin(a) * 58;
            const x2 = 60 + Math.cos(a) * (i % 6 === 0 ? 53 : 55);
            const y2 = 60 + Math.sin(a) * (i % 6 === 0 ? 53 : 55);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tk.inkMute} strokeWidth={i % 6 === 0 ? 1.2 : 0.6} opacity={i % 6 === 0 ? 0.7 : 0.3} />;
          })}
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          <div style={{ fontFamily: tk.mono, fontSize: 22, color: tk.ink, fontWeight: 500, letterSpacing: -0.5 }}>
            {value}<span style={{ fontSize: 12, color: tk.inkMute }}>%</span>
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMute, letterSpacing: 1.5, marginTop: 2 }}>
            {label.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, color, w = 80, h = 22 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} opacity="0.95" />
      <polyline fill={color} fillOpacity="0.12" stroke="none"
        points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

type LupaKey = "instituto" | "receita" | "ranking" | "sla";

function NeonTile({
  neon, accent, label, value, hint, trend, lupaKey, openLupa, setOpenLupa, lupaPanel,
}: {
  neon: string; accent: string; label: string; value: string; hint: string;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 1.6, textTransform: "uppercase" }}>
            {label}
          </div>
          <div className="pw-tile-value" style={{
            fontFamily: tk.mono, fontSize: 28, color: tk.ink, fontWeight: 500,
            lineHeight: 1.1, marginTop: 6, transition: "all 180ms ease",
          }}>{value}</div>
          <div style={{ fontFamily: tk.sans, fontSize: 11, color: tk.inkDim, marginTop: 4 }}>{hint}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button
            className={`pw-lupa ${isOpen ? "open" : ""}`}
            onClick={(e) => { e.stopPropagation(); setOpenLupa(isOpen ? null : lupaKey); }}
            title="abrir detalhes"
          >⌕</button>
          <div className="pw-tile-corner" style={{
            fontFamily: tk.mono, fontSize: 9, color: tk.inkMute, letterSpacing: 1, transition: "color 180ms ease",
          }}>◢</div>
        </div>
      </div>
      {trend && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${tk.lineSoft}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Sparkline data={trend} color={neon} />
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: neon, letterSpacing: 0.5 }}>
            {trend[trend.length - 1] > trend[0] ? "▲" : "▼"} {Math.abs(Math.round((trend[trend.length - 1] - trend[0]) / trend[0] * 100))}%
          </div>
        </div>
      )}
      {isOpen && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: `1px solid ${neon}55`,
          background: `linear-gradient(180deg, ${neon}08 0%, transparent 100%)`,
          marginLeft: -18, marginRight: -18, marginBottom: -16,
          padding: "12px 18px 16px",
          animation: "pw-pulse-glow 1.4s ease-in-out infinite",
        }}>
          {lupaPanel}
        </div>
      )}
    </div>
  );
}

function Bar3D({ label, value, max, color, glow, sigla }: {
  label: string; value: number; max: number; color: string; glow: string; sigla: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 40px", gap: 12, alignItems: "center", padding: "6px 0" }}>
      <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkDim, letterSpacing: 1.2 }}>{sigla}</div>
      <div className="pw-bar3d" style={{ ["--pw-bar-color" as any]: color, ["--pw-bar-glow" as any]: glow }}>
        <div className="pw-bar3d-fill" style={{ width: `${pct}%` }} />
        <div style={{
          position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
          fontFamily: tk.mono, fontSize: 11, color: tk.ink, textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          letterSpacing: 0.5,
        }}>{label}</div>
      </div>
      <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.ink, textAlign: "right" }}>
        {value.toLocaleString("pt-BR")}
      </div>
      <div style={{ fontFamily: tk.mono, fontSize: 10, color, textAlign: "right" }}>{pct}%</div>
    </div>
  );
}

export function DashboardPadua() {
  const [openLupa, setOpenLupa] = useState<LupaKey | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: tk.bg, color: tk.ink, fontFamily: tk.sans }}>
      <style>{NEON_KEYFRAMES}</style>

      {/* HEADER */}
      <div style={{
        borderBottom: `1px solid ${tk.line}`,
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(180deg, ${tk.bgAlt} 0%, ${tk.bg} 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonCyan, letterSpacing: 2,
            padding: "3px 8px", border: `1px solid ${tk.neonCyan}55`,
            boxShadow: `0 0 8px -2px ${tk.neonCyan}55`,
          }}>PAWARDS · COCKPIT</div>
          <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkDim, letterSpacing: 1.2 }}>
            DASHBOARD GLOBAL · VISÃO CEO
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ok }}>
            ● ONLINE · 3 unidades · 184 sessões abertas
          </span>
          <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkMute, letterSpacing: 1 }}>
            CAIO · 19/05/26 · 22:54
          </span>
        </div>
      </div>

      {/* TITLE */}
      <div style={{ padding: "18px 24px 12px" }}>
        <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 2 }}>
          COCKPIT · OPERAÇÃO TEMPO REAL
        </div>
        <div style={{ fontFamily: tk.sans, fontSize: 26, fontWeight: 500, color: tk.ink, marginTop: 4 }}>
          Sorriso Pádua <span style={{ color: tk.neonCyan, fontSize: 14, marginLeft: 8 }}>· lente de porcelana</span>
        </div>
        <div style={{ fontFamily: tk.sans, fontSize: 12, color: tk.inkDim, marginTop: 2 }}>
          passe o mouse pra acender · clique na ⌕ pra abrir cada painel
        </div>
      </div>

      {/* GAUGES ROW — relógios cockpit */}
      <div style={{
        margin: "0 24px",
        padding: "18px 18px",
        background: `radial-gradient(ellipse at top, ${tk.bgAlt} 0%, ${tk.bg} 80%)`,
        border: `1px solid ${tk.line}`,
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 12,
        alignItems: "center",
      }}>
        <Gauge value={94} label="Aderência" color={tk.ok} />
        <Gauge value={78} label="Validação" color={tk.accent} />
        <Gauge value={62} label="Faturado" color={tk.neonGold} />
        <Gauge value={41} label="Followup" color={tk.warn} />
        <Gauge value={88} label="Agenda" color={tk.neonCyan} />
        <Gauge value={23} label="SLA Crít." color={tk.danger} />
      </div>

      {/* KPI TILES com hover neon + lupinhas */}
      <div style={{
        margin: "16px 24px 0",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}>
        <NeonTile
          neon={tk.neonCyan} accent={tk.accentDeep}
          label="INSTITUTO PÁDUA"
          value="3.877"
          hint="pacientes reais · 8 agendas ativas"
          trend={[3210, 3340, 3501, 3622, 3741, 3820, 3877]}
          lupaKey="instituto"
          openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonCyan, letterSpacing: 1.5 }}>
                ÚLT. 7 DIAS · NOVOS CADASTROS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {[12, 18, 9, 24, 31, 22, 36].map((n, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: tk.mono, fontSize: 13, color: tk.ink }}>{n}</div>
                    <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMute, marginTop: 2 }}>
                      {["SEG","TER","QUA","QUI","SEX","SAB","DOM"][i]}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: tk.sans, fontSize: 11, color: tk.inkDim, marginTop: 4 }}>
                origem dominante: <span style={{ color: tk.ink }}>indicação direta (62%)</span>
              </div>
            </div>
          }
        />
        <NeonTile
          neon={tk.neonGold} accent={tk.warn}
          label="POT. RECEITA"
          value="R$ 2,73M"
          hint="fichas históricas · estimativa"
          trend={[1.8, 2.0, 2.15, 2.3, 2.48, 2.61, 2.73]}
          lupaKey="receita"
          openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonGold, letterSpacing: 1.5 }}>
                DECOMPOSIÇÃO POR VIA TERAPÊUTICA
              </div>
              <Bar3D sigla="IM" label="Injetáveis Musculares" value={840000} max={1000000} color={tk.accent} glow="rgba(122,162,247,0.5)" />
              <Bar3D sigla="EV" label="Endovenoso" value={620000} max={1000000} color={tk.neonCyan} glow="rgba(94,230,230,0.5)" />
              <Bar3D sigla="VO" label="Via Oral" value={510000} max={1000000} color={tk.ok} glow="rgba(124,196,160,0.5)" />
              <Bar3D sigla="IMP" label="Implantes" value={380000} max={1000000} color={tk.neonViolet} glow="rgba(181,140,240,0.5)" />
              <Bar3D sigla="PRC" label="Procedimentos" value={310000} max={1000000} color={tk.neonGold} glow="rgba(230,197,114,0.5)" />
              <div style={{ fontFamily: tk.sans, fontSize: 10, color: tk.inkMute, marginTop: 4, fontStyle: "italic" }}>
                ⚠ projeção de fichas históricas — não é caixa realizado
              </div>
            </div>
          }
        />
        <NeonTile
          neon={tk.neonViolet} accent={tk.accentDeep}
          label="DEMANDAS ABERTAS"
          value="47"
          hint="14 vencidas · 33 no prazo"
          trend={[28, 32, 30, 38, 42, 45, 47]}
          lupaKey="ranking"
          openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonViolet, letterSpacing: 1.5 }}>
                TOP COLABORADORES · MÊS
              </div>
              {[
                { nome: "Maria Silva Fisioterapeuta", pts: 605, pct: 92 },
                { nome: "João Andrade Médico", pts: 488, pct: 74 },
                { nome: "Ana Beatriz Enfermeira", pts: 412, pct: 63 },
                { nome: "Luciana Recepção", pts: 287, pct: 44 },
              ].map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr 60px 50px", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonViolet }}>{i + 1}º</div>
                  <div style={{ fontFamily: tk.sans, fontSize: 11, color: tk.ink }}>{r.nome}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkDim, textAlign: "right" }}>R$ {r.pts}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.neonViolet, textAlign: "right" }}>{r.pct}%</div>
                </div>
              ))}
            </div>
          }
        />
        <NeonTile
          neon={tk.danger} accent={tk.danger}
          label="SLA CRÍTICO"
          value="12"
          hint="delegações vencidas · ação CEO"
          trend={[8, 10, 9, 11, 13, 12, 12]}
          lupaKey="sla"
          openLupa={openLupa} setOpenLupa={setOpenLupa}
          lupaPanel={
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.danger, letterSpacing: 1.5 }}>
                PLANOS · VIOLAÇÕES SLA
              </div>
              {[
                { plano: "Diamante", sla: "SLA 4h", viol: 5, pct: 8 },
                { plano: "Ouro", sla: "SLA 12h", viol: 4, pct: 12 },
                { plano: "Prata", sla: "SLA 24h", viol: 2, pct: 4 },
                { plano: "Bronze", sla: "SLA 48h", viol: 1, pct: 2 },
              ].map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 40px 50px", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: tk.sans, fontSize: 11, color: tk.ink }}>{s.plano}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute }}>{s.sla}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.danger, textAlign: "right" }}>{s.viol}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.danger, textAlign: "right" }}>{s.pct}%</div>
                </div>
              ))}
              <div style={{ marginTop: 6, padding: 6, background: `${tk.danger}15`, border: `1px solid ${tk.danger}55`,
                fontFamily: tk.mono, fontSize: 10, color: tk.danger, letterSpacing: 0.5 }}>
                ⚠ ESCALAR PRO CAIO · 5 itens DIAMANTE {">"} 4h
              </div>
            </div>
          }
        />
      </div>

      {/* PIPELINE BLOCK · barras 3D principal */}
      <div style={{
        margin: "16px 24px 0",
        background: tk.bgAlt,
        border: `1px solid ${tk.line}`,
        borderLeft: `3px solid ${tk.neonCyan}`,
        padding: "18px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 2 }}>
              PIPELINE OPERACIONAL
            </div>
            <div style={{ fontFamily: tk.sans, fontSize: 16, color: tk.ink, marginTop: 2 }}>
              Sessões da semana · por via terapêutica
            </div>
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.neonCyan }}>
            Σ 1.847 sessões · meta 2.000
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Bar3D sigla="EV"  label="Endovenoso (soro / quelação / vitamina)"  value={487} max={600} color={tk.neonCyan}   glow="rgba(94,230,230,0.5)" />
          <Bar3D sigla="IM"  label="Intramuscular (B12 / hormônio / antibió.)" value={392} max={600} color={tk.accent}     glow="rgba(122,162,247,0.5)" />
          <Bar3D sigla="SC"  label="Subcutâneo (semaglutida / GH)"             value={284} max={600} color={tk.neonViolet} glow="rgba(181,140,240,0.5)" />
          <Bar3D sigla="VO"  label="Via Oral (cápsula / sublingual)"           value={341} max={600} color={tk.ok}         glow="rgba(124,196,160,0.5)" />
          <Bar3D sigla="IMP" label="Implante hormonal subcutâneo"              value={198} max={600} color={tk.neonGold}   glow="rgba(230,197,114,0.5)" />
          <Bar3D sigla="PRC" label="Procedimentos estéticos"                   value={145} max={600} color={tk.warn}       glow="rgba(224,176,98,0.5)" />
        </div>
      </div>

      {/* BOTTOM — duas colunas: ranking + alertas */}
      <div style={{ margin: "16px 24px 24px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <div className="pw-tile" style={{
          ["--pw-neon" as any]: tk.neonViolet,
          ["--pw-neon-soft" as any]: tk.neonViolet + "55",
          borderLeft: `3px solid ${tk.neonViolet}`,
          padding: "16px 20px",
          cursor: "default",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 2 }}>PIPELINE DEMANDAS</div>
              <div style={{ fontFamily: tk.sans, fontSize: 15, color: tk.ink, marginTop: 2 }}>Trello-style · escopo unidade</div>
            </div>
            <button className="pw-lupa">⌕</button>
          </div>
          {[
            { label: "Abertas",        n: 12, color: tk.warn,        pct: 26 },
            { label: "Em Atendimento", n: 18, color: tk.accent,      pct: 38 },
            { label: "Aguard. Médico", n: 9,  color: tk.neonViolet,  pct: 19 },
            { label: "Concluídas",     n: 47, color: tk.ok,          pct: 100 },
          ].map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 1fr 50px", gap: 12, alignItems: "center", padding: "6px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                <span style={{ fontFamily: tk.sans, fontSize: 12, color: tk.ink }}>{d.label}</span>
              </div>
              <div className="pw-bar3d" style={{ ["--pw-bar-color" as any]: d.color, ["--pw-bar-glow" as any]: d.color + "88", height: 14 }}>
                <div className="pw-bar3d-fill" style={{ width: `${d.pct}%` }} />
              </div>
              <div style={{ fontFamily: tk.mono, fontSize: 13, color: tk.ink, textAlign: "right" }}>{d.n}</div>
            </div>
          ))}
        </div>

        <div className="pw-tile" style={{
          ["--pw-neon" as any]: tk.warn,
          ["--pw-neon-soft" as any]: tk.warn + "55",
          borderLeft: `3px solid ${tk.warn}`,
          padding: "16px 20px",
          cursor: "default",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 2 }}>ALERTAS CEO</div>
              <div style={{ fontFamily: tk.sans, fontSize: 15, color: tk.ink, marginTop: 2 }}>Mensageria · últ. 24h</div>
            </div>
            <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.warn }}>● 7</span>
          </div>
          {[
            { t: "ZapSign cão-de-guarda", msg: "envelope 8f0eb530 sem retorno > 60min", h: "22:14", lvl: tk.warn },
            { t: "WhatsApp CEO",          msg: "Twilio entregue · Caio leu 21:42",       h: "21:42", lvl: tk.ok },
            { t: "Backfill posologia",    msg: "259/259 · 100% concluído",               h: "20:18", lvl: tk.ok },
            { t: "Pádua receita #3497",   msg: "Galena recebeu via Drive · OK",          h: "19:30", lvl: tk.accent },
          ].map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "8px 1fr 50px", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px dashed ${tk.lineSoft}` : "none" }}>
              <span style={{ width: 8, height: 8, marginTop: 4, background: a.lvl, boxShadow: `0 0 6px ${a.lvl}` }} />
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 10, color: a.lvl, letterSpacing: 1, textTransform: "uppercase" }}>{a.t}</div>
                <div style={{ fontFamily: tk.sans, fontSize: 12, color: tk.inkDim, marginTop: 2 }}>{a.msg}</div>
              </div>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, textAlign: "right" }}>{a.h}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
