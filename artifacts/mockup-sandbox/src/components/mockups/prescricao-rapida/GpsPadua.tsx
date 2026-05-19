import { useMemo, useState } from "react";
import {
  tk, CATALOGO, SELECIONADAS_INICIAIS, PACIENTE, VITAIS, PATOLOGIAS,
  VIA_META, FREQUENCIAS,
  type Substancia, type Via, type Frequencia, type Ancora,
} from "./_tokens";

type Modo = "PILHA" | "TIMELINE" | "GPS";

const VIAS_ORDEM: Via[] = ["EV", "IM", "SC", "VO", "IMP", "PRC"];
const TOTAL_SESSOES = 8;
const SESSAO_ATUAL = 3;

const ANCORAS: { v: Ancora; lbl: string }[] = [
  { v: "sem-ancora", lbl: "—" },
  { v: "primeira",   lbl: "1ª" },
  { v: "S01", lbl: "S01" }, { v: "S02", lbl: "S02" }, { v: "S03", lbl: "S03" },
  { v: "S04", lbl: "S04" }, { v: "S05", lbl: "S05" }, { v: "S06", lbl: "S06" },
  { v: "S07", lbl: "S07" }, { v: "S08", lbl: "S08" },
  { v: "penultima", lbl: "PEN" }, { v: "ultima", lbl: "ÚLT" },
];

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sessoesAtivas(s: Substancia): boolean[] {
  const arr = new Array(TOTAL_SESSOES).fill(false);
  if (s.ancora === "ultima")    { arr[TOTAL_SESSOES - 1] = true; return arr; }
  if (s.ancora === "penultima") { arr[TOTAL_SESSOES - 2] = true; return arr; }
  if (s.ancora && s.ancora.startsWith("S")) {
    const idx = parseInt(s.ancora.slice(1), 10) - 1;
    if (idx >= 0 && idx < TOTAL_SESSOES) arr[idx] = true;
    return arr;
  }
  if (s.via === "VO" || s.via === "IMP" || s.frequencia === "diária" || s.frequencia === "2×/dia") {
    for (let i = 0; i < TOTAL_SESSOES; i++) arr[i] = true;
    return arr;
  }
  if (s.frequencia === "única") { arr[0] = true; return arr; }
  if (s.frequencia === "mensal") { arr[0] = true; arr[4] = true; return arr; }
  if (s.frequencia === "quinzenal") { arr[0] = true; arr[2] = true; arr[4] = true; arr[6] = true; return arr; }
  const cap = Math.min(s.sessoes, TOTAL_SESSOES);
  for (let i = 0; i < cap; i++) arr[i] = true;
  return arr;
}

// ───────────────────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────────────────

export function GpsPadua() {
  const [modo, setModo] = useState<Modo>("GPS");
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hoverItem, setHoverItem] = useState<string | null>(null);

  const porVia = useMemo(() => {
    const m: Record<Via, Substancia[]> = { EV: [], IM: [], SC: [], VO: [], IMP: [], PRC: [] };
    sel.forEach(s => m[s.via].push(s));
    return m;
  }, [sel]);

  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);

  const update = (id: string, patch: Partial<Substancia>) =>
    setSel(sel.map(s => s.id === id ? { ...s, ...patch } : s));
  const remove = (id: string) => setSel(sel.filter(s => s.id !== id));

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: 16, display: "flex", flexDirection: "column", gap: 12,
      fontSize: 11,
    }}>
      <Topo modo={modo} setModo={setModo} totalSubs={sel.length} totalGeral={total} />

      {(modo === "PILHA" || modo === "GPS") && (
        <Pilha porVia={porVia} update={update} remove={remove}
          hoverItem={hoverItem} setHoverItem={setHoverItem}
          addItem={(s) => setSel([...sel, { ...s }])} sel={sel} />
      )}

      {(modo === "TIMELINE" || modo === "GPS") && (
        <Timeline sel={sel} hoverItem={hoverItem} setHoverItem={setHoverItem} update={update} />
      )}

      <ActionBar total={total} sel={sel} porVia={porVia} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Topo: paciente compacto + KPIs + toggle de modo
// ───────────────────────────────────────────────────────────────────────

function Topo({ modo, setModo, totalSubs, totalGeral }: {
  modo: Modo; setModo: (m: Modo) => void; totalSubs: number; totalGeral: number;
}) {
  return (
    <header style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 20, alignItems: "center",
      background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: "10px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, background: tk.bg, color: tk.accent,
          fontFamily: tk.mono, fontSize: 13, fontWeight: 700,
          display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`,
        }}>{PACIENTE.iniciais}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{PACIENTE.nome}</div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
            ID {PACIENTE.id} · {PACIENTE.idade}a · CPF {PACIENTE.cpf}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginLeft: 8 }}>
          <span style={{
            fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1,
            padding: "2px 6px", color: tk.warn, background: tk.via.IM.soft, border: `1px solid ${tk.via.IM.line}`,
            textAlign: "center",
          }}>PLANO {PACIENTE.plano}</span>
          <span style={{
            fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1,
            padding: "2px 6px", color: tk.ok, background: tk.via.EV.soft, border: `1px solid ${tk.via.EV.line}`,
            textAlign: "center",
          }}>SESSÃO {PACIENTE.sessao}</span>
        </div>
      </div>

      {/* Vitais + Patologias inline */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {VITAIS.map(v => (
          <div key={v.label} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
            background: tk.bg, borderLeft: `2px solid ${v.status === "alerta" ? tk.warn : tk.ok}`,
          }}>
            <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>{v.label}</span>
            <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: v.status === "alerta" ? tk.warn : tk.ink }}>{v.valor}</span>
          </div>
        ))}
        <span style={{ width: 1, height: 24, background: tk.border }} />
        {PATOLOGIAS.map(p => (
          <div key={p.nome} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.status === "alerta" ? tk.warn : tk.ok }} />
            <span style={{ fontSize: 10, color: tk.ink }}>{p.nome}</span>
          </div>
        ))}
      </div>

      {/* KPI compacto */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Kpi lbl="ITENS"     val={String(totalSubs).padStart(2, "0")} cor={tk.accent} />
        <Kpi lbl="PROTOCOLO" val={brl(totalGeral)}                    cor={tk.accent} />
      </div>

      {/* Toggle modo Motor-Clínico style */}
      <div style={{ display: "flex", border: `1px solid ${tk.border}` }}>
        {(["PILHA", "TIMELINE", "GPS"] as Modo[]).map(m => {
          const ativo = modo === m;
          return (
            <button key={m}
              onClick={() => setModo(m)}
              style={{
                fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: "8px 14px", cursor: "pointer",
                background: ativo ? tk.accent : tk.bg,
                color: ativo ? tk.bg : tk.inkMuted,
                border: "none", borderRight: m !== "GPS" ? `1px solid ${tk.border}` : "none",
                ...(ativo ? { boxShadow: `0 0 12px ${tk.accentGlow}` } : {}),
              }}>{m}</button>
          );
        })}
      </div>
    </header>
  );
}

function Kpi({ lbl, val, cor }: { lbl: string; val: string; cor: string }) {
  return (
    <div style={{ background: tk.bg, padding: "6px 10px", borderLeft: `3px solid ${cor}` }}>
      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>{lbl}</div>
      <div style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: cor, marginTop: 1 }}>{val}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Modo PILHA: 6 colunas por via
// ───────────────────────────────────────────────────────────────────────

function Pilha({ porVia, update, remove, hoverItem, setHoverItem, addItem, sel }: {
  porVia: Record<Via, Substancia[]>;
  update: (id: string, patch: Partial<Substancia>) => void;
  remove: (id: string) => void;
  hoverItem: string | null;
  setHoverItem: (id: string | null) => void;
  addItem: (s: Substancia) => void;
  sel: Substancia[];
}) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
      {VIAS_ORDEM.map(v => {
        const c = tk.via[v];
        const meta = VIA_META[v];
        const itens = porVia[v];
        const cands = CATALOGO.filter(s => s.via === v && !sel.find(x => x.id === s.id));
        const subtotal = itens.reduce((a, s) => a + s.preco * s.sessoes, 0);
        return (
          <div key={v} style={{
            background: tk.bgAlt, border: `1px solid ${tk.border}`,
            borderTop: `3px solid ${c.dot}`,
            display: "flex", flexDirection: "column", minHeight: 360,
          }}>
            {/* Header coluna */}
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.border}`, background: c.soft }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: c.dot, letterSpacing: 1.5 }}>{v}</span>
                <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{itens.length} ITENS</span>
              </div>
              <div style={{ fontSize: 10, color: tk.ink, marginTop: 1 }}>{meta.titulo}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 1 }}>{meta.sub}</div>
            </div>

            {/* Selecionadas com CONTROLES INLINE */}
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {itens.map(s => {
                const h = hoverItem === s.id;
                return (
                  <div key={s.id}
                    onMouseEnter={() => setHoverItem(s.id)}
                    onMouseLeave={() => setHoverItem(null)}
                    style={{
                      background: tk.bg, padding: 8,
                      border: `1px solid ${tk.border}`, borderLeft: `3px solid ${c.dot}`,
                      transition: "all 0.12s",
                      ...(h ? { outline: `1px solid ${c.dot}`, outlineOffset: "-1px", boxShadow: `0 0 10px ${c.line}` } : {}),
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25 }}>{s.nome}</div>
                        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>{s.dose}</div>
                      </div>
                      <button onClick={() => remove(s.id)} style={{
                        background: "transparent", color: tk.inkSubtle, border: "none",
                        fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1,
                      }}>×</button>
                    </div>

                    {/* Controles em linha */}
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 6, marginTop: 6 }}>
                      <Mini label="SESSÕES">
                        <input type="number" min={1} max={30} value={s.sessoes}
                          onChange={(e) => update(s.id, { sessoes: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                          style={inpBase} />
                      </Mini>
                      <Mini label="FREQ.">
                        <select value={s.frequencia}
                          onChange={(e) => update(s.id, { frequencia: e.target.value as Frequencia })}
                          style={inpBase}>
                          {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </Mini>
                      <Mini label="ÂNCORA" full>
                        <select value={s.ancora || "sem-ancora"}
                          onChange={(e) => update(s.id, { ancora: e.target.value as Ancora })}
                          style={inpBase}>
                          {ANCORAS.map(a => <option key={a.v} value={a.v}>{a.lbl === "—" ? "sem âncora" : a.lbl}</option>)}
                        </select>
                      </Mini>
                    </div>

                    {/* Mini-timeline da própria substância */}
                    <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
                      {sessoesAtivas(s).map((on, i) => {
                        const passada = i + 1 < SESSAO_ATUAL;
                        return (
                          <span key={i} title={`S${String(i + 1).padStart(2, "0")}`}
                            style={{
                              flex: 1, height: 6,
                              background: on ? (passada ? c.line : c.dot) : tk.bgSoft,
                            }} />
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
                        {s.sessoes}× {brl(s.preco)}
                      </span>
                      <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot }}>
                        {brl(s.preco * s.sessoes)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {itens.length === 0 && (
                <div style={{
                  border: `1px dashed ${tk.borderStrong}`, padding: 12, textAlign: "center",
                  fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1,
                }}>SEM ITENS</div>
              )}
            </div>

            {/* Sugestões + subtotal */}
            {cands.length > 0 && (
              <div style={{ padding: 8, borderTop: `1px solid ${tk.border}` }}>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>
                  + ADICIONAR
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {cands.slice(0, 3).map(s => (
                    <button key={s.id}
                      onClick={() => addItem(s)}
                      onMouseEnter={(e) => { e.currentTarget.style.outline = `1px solid ${c.dot}`; e.currentTarget.style.boxShadow = `0 0 6px ${c.line}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4,
                        padding: "4px 6px", background: tk.bg, color: tk.ink, border: "none",
                        outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
                        cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                      }}>
                      <span style={{ fontSize: 10, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</span>
                      <span style={{ fontFamily: tk.mono, fontSize: 9, color: c.dot, flexShrink: 0 }}>+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              padding: "6px 10px", borderTop: `1px solid ${tk.border}`,
              background: tk.bgSoft, display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>SUBTOTAL</span>
              <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: c.dot }}>{brl(subtotal)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

const inpBase: React.CSSProperties = {
  background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`,
  padding: "3px 6px", fontFamily: tk.mono, fontSize: 10, outline: "none",
  width: "100%", boxSizing: "border-box",
};

function Mini({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label style={{
      display: "flex", flexDirection: "column", gap: 2,
      gridColumn: full ? "1 / -1" : "auto",
    }}>
      <span style={{ fontFamily: tk.mono, fontSize: 7, color: tk.inkSubtle, letterSpacing: 1.2 }}>{label}</span>
      {children}
    </label>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Modo TIMELINE: grid linha × coluna
// ───────────────────────────────────────────────────────────────────────

function Timeline({ sel, hoverItem, setHoverItem, update }: {
  sel: Substancia[];
  hoverItem: string | null;
  setHoverItem: (id: string | null) => void;
  update: (id: string, patch: Partial<Substancia>) => void;
}) {
  return (
    <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
          TIMELINE · CICLO 1 · {TOTAL_SESSOES} SESSÕES · SESSÃO ATUAL = S0{SESSAO_ATUAL}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {VIAS_ORDEM.map(v => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, background: tk.via[v].dot }} />
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Régua */}
      <div style={{
        display: "grid", gridTemplateColumns: `220px repeat(${TOTAL_SESSOES}, 1fr) 90px 80px`,
        gap: 3, marginBottom: 6,
      }}>
        <div />
        {Array.from({ length: TOTAL_SESSOES }).map((_, i) => {
          const n = i + 1;
          const atual = n === SESSAO_ATUAL;
          const passada = n < SESSAO_ATUAL;
          return (
            <div key={n} style={{
              textAlign: "center", fontFamily: tk.mono, fontSize: 9, padding: "4px 0",
              fontWeight: atual ? 700 : 500,
              color: atual ? tk.bg : passada ? tk.inkSubtle : tk.inkMuted,
              background: atual ? tk.accent : passada ? tk.bgSoft : tk.bg,
              border: `1px solid ${atual ? tk.accent : tk.border}`, letterSpacing: 1,
            }}>S{String(n).padStart(2, "0")}</div>
          );
        })}
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1, textAlign: "right", padding: "4px 0" }}>ÂNCORA</div>
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1, textAlign: "right", padding: "4px 0" }}>SUBTOTAL</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {sel.map(s => {
          const c = tk.via[s.via];
          const ocup = sessoesAtivas(s);
          const h = hoverItem === s.id;
          return (
            <div key={s.id}
              onMouseEnter={() => setHoverItem(s.id)}
              onMouseLeave={() => setHoverItem(null)}
              style={{
                display: "grid", gridTemplateColumns: `220px repeat(${TOTAL_SESSOES}, 1fr) 90px 80px`,
                gap: 3, alignItems: "center",
                background: h ? tk.bgSoft : tk.bg,
                padding: "4px 6px", border: `1px solid ${h ? c.dot : tk.border}`,
                borderLeft: `3px solid ${c.dot}`, transition: "all 0.12s",
                ...(h ? { boxShadow: `0 0 10px ${c.line}` } : {}),
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                <span style={{
                  fontFamily: tk.mono, fontSize: 8, fontWeight: 700, color: c.dot,
                  background: c.soft, padding: "2px 4px", border: `1px solid ${c.line}`,
                  minWidth: 26, textAlign: "center", flexShrink: 0,
                }}>{s.via}</span>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nome}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted }}>{s.dose} · {s.frequencia}</div>
                </div>
              </div>
              {ocup.map((on, i) => {
                const n = i + 1;
                const passada = n < SESSAO_ATUAL;
                return (
                  <div key={i} style={{
                    height: 22, position: "relative",
                    background: on ? (passada ? c.line : c.dot) : tk.bgAlt,
                    border: `1px solid ${tk.border}`,
                  }}>
                    {on && passada && (
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: tk.mono, fontSize: 9, color: tk.bg, fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                );
              })}
              <select
                value={s.ancora || "sem-ancora"}
                onChange={(e) => update(s.id, { ancora: e.target.value as Ancora })}
                style={{ ...inpBase, padding: "3px 4px", fontSize: 9 }}>
                {ANCORAS.map(a => <option key={a.v} value={a.v}>{a.lbl === "—" ? "sem âncora" : a.lbl}</option>)}
              </select>
              <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: c.dot, textAlign: "right" }}>
                {brl(s.preco * s.sessoes)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Action bar fixa rodapé
// ───────────────────────────────────────────────────────────────────────

function ActionBar({ total, sel, porVia }: {
  total: number; sel: Substancia[]; porVia: Record<Via, Substancia[]>;
}) {
  return (
    <footer style={{
      marginTop: "auto", background: tk.bgAlt, border: `1px solid ${tk.border}`,
      padding: "10px 16px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center",
    }}>
      <div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>TOTAL CONSOLIDADO</div>
        <div style={{ fontFamily: tk.mono, fontSize: 22, fontWeight: 700, color: tk.accent, lineHeight: 1.1 }}>{brl(total)}</div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
          {sel.length} substâncias · ciclo 1 de 8 sessões
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {VIAS_ORDEM.map(v => {
          const c = tk.via[v];
          const n = porVia[v].length;
          const sub = porVia[v].reduce((a, s) => a + s.preco * s.sessoes, 0);
          return (
            <div key={v} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 10px",
              background: tk.bg, borderLeft: `2px solid ${c.dot}`, opacity: n === 0 ? 0.4 : 1,
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot, letterSpacing: 1 }}>{v}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>{n}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ink }}>{brl(sub)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { lbl: "Cancelar",          cor: tk.inkSubtle, primary: false },
          { lbl: "Salvar Rascunho",   cor: tk.ink,       primary: false },
          { lbl: "Validar Médico →",  cor: tk.warn,      primary: false },
          { lbl: "Emitir Protocolo →", cor: tk.accent,    primary: true },
        ].map(b => (
          <button key={b.lbl} style={{
            fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            padding: "9px 14px", cursor: "pointer", color: b.primary ? tk.bg : b.cor,
            background: b.primary ? b.cor : "transparent",
            border: `1px solid ${b.cor}`, textTransform: "uppercase" as const,
            ...(b.primary ? { boxShadow: `0 0 12px ${tk.accentGlow}` } : {}),
          }}>{b.lbl}</button>
        ))}
      </div>
    </footer>
  );
}
