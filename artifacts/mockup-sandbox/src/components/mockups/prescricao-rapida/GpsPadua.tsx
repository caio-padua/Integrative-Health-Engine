import { useMemo, useState } from "react";
import {
  tk, CATALOGO, CATEGORIAS, SELECIONADAS_INICIAIS, PACIENTE, VITAIS, PATOLOGIAS,
  VIA_META, FREQUENCIAS, HORARIOS_PADRAO,
} from "./_tokens";
import { horarioParaPeriodo, PERIODOS_DIA } from "./_mensageria";
import { CENARIOS, exemploCartaFuturoPapai, type CenarioId, type MatrizCartaEncantamento } from "./_teatro";
import {
  type Substancia, type Via, type Categoria, type Frequencia, type Ancora, type ComponenteBlend,
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

export function GpsPadua({ embutido = false }: { embutido?: boolean } = {}) {
  const [modo, setModo] = useState<Modo>("GPS");
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const [colMin, setColMin] = useState<Record<Via, boolean>>({
    EV: false, IM: false, SC: false, VO: false, IMP: true, PRC: true,
  });
  const [editandoFormula, setEditandoFormula] = useState<string | null>("blend-vo");
  // Lifted: carta de encantamento persiste mesmo ao fechar/abrir o EditorBlend
  const [carta, setCarta] = useState<MatrizCartaEncantamento>(exemploCartaFuturoPapai());

  const porVia = useMemo(() => {
    const m: Record<Via, Substancia[]> = { EV: [], IM: [], SC: [], VO: [], IMP: [], PRC: [] };
    sel.forEach(s => m[s.via].push(s));
    return m;
  }, [sel]);

  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);

  const update = (id: string, patch: Partial<Substancia>) =>
    setSel(sel.map(s => s.id === id ? { ...s, ...patch } : s));
  const remove = (id: string) => setSel(sel.filter(s => s.id !== id));
  const toggleCol = (v: Via) => setColMin({ ...colMin, [v]: !colMin[v] });

  const formulaAberta = editandoFormula ? sel.find(s => s.id === editandoFormula) : null;

  return (
    <div style={{
      minHeight: embutido ? undefined : "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: embutido ? 0 : 16, display: "flex", flexDirection: "column", gap: 12,
      fontSize: 11,
    }}>
      {!embutido && <Topo modo={modo} setModo={setModo} totalSubs={sel.length} totalGeral={total} />}
      {embutido && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", border: `1px solid ${tk.border}` }}>
            {(["PILHA", "TIMELINE", "GPS"] as Modo[]).map(m => {
              const ativo = modo === m;
              return (
                <button key={m} onClick={() => setModo(m)} style={{
                  fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  padding: "6px 12px", cursor: "pointer",
                  background: ativo ? tk.accent : tk.bg, color: ativo ? tk.bg : tk.inkMuted,
                  border: "none", borderRight: m !== "GPS" ? `1px solid ${tk.border}` : "none",
                }}>{m}</button>
              );
            })}
          </div>
        </div>
      )}

      {(modo === "PILHA" || modo === "GPS") && (
        <Pilha porVia={porVia} update={update} remove={remove}
          hoverItem={hoverItem} setHoverItem={setHoverItem}
          addItem={(s) => setSel([...sel, { ...s }])} sel={sel}
          colMin={colMin} toggleCol={toggleCol}
          editandoFormula={editandoFormula} setEditandoFormula={setEditandoFormula} />
      )}

      {(modo === "PILHA" || modo === "GPS") && formulaAberta && (
        <EditorBlend
          formula={formulaAberta}
          update={(patch) => update(formulaAberta.id, patch)}
          onClose={() => setEditandoFormula(null)}
          carta={carta} setCarta={setCarta} />
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

      {/* Título do painel (não-pessoal) + toggle de modo Motor-Clínico style */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <span style={{
          fontFamily: tk.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tk.accent,
        }}>GPS CLÍNICO</span>
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

function Pilha({ porVia, update, remove, hoverItem, setHoverItem, addItem, sel,
  colMin, toggleCol, editandoFormula, setEditandoFormula }: {
  porVia: Record<Via, Substancia[]>;
  update: (id: string, patch: Partial<Substancia>) => void;
  remove: (id: string) => void;
  hoverItem: string | null;
  setHoverItem: (id: string | null) => void;
  addItem: (s: Substancia) => void;
  sel: Substancia[];
  colMin: Record<Via, boolean>;
  toggleCol: (v: Via) => void;
  editandoFormula: string | null;
  setEditandoFormula: (id: string | null) => void;
}) {
  // Grid dinâmico: colunas min ocupam 60px, colunas max ocupam fração
  const cols = VIAS_ORDEM.map(v => colMin[v] ? "60px" : "1fr").join(" ");

  return (
    <section style={{ display: "grid", gridTemplateColumns: cols, gap: 8, transition: "all 0.2s" }}>
      {VIAS_ORDEM.map(v => {
        const c = tk.via[v];
        const meta = VIA_META[v];
        const itens = porVia[v];
        const minimizada = colMin[v];

        if (minimizada) {
          // Coluna colapsada: sigla vertical + contador + botão ↕
          return (
            <div key={v}
              onClick={() => toggleCol(v)}
              style={{
                background: tk.bgAlt, border: `1px solid ${tk.border}`,
                borderTop: `3px solid ${c.dot}`, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", minHeight: 360, transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.soft; e.currentTarget.style.boxShadow = `0 0 8px ${c.line}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tk.bgAlt; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ fontFamily: tk.mono, fontSize: 12, color: c.dot }}>↕</div>
              <div style={{
                writingMode: "vertical-rl", transform: "rotate(180deg)",
                fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: c.dot, letterSpacing: 3,
              }}>{v} · {meta.titulo}</div>
              <div style={{
                fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot,
                padding: "3px 6px", background: c.soft, border: `1px solid ${c.line}`,
              }}>{itens.length}</div>
            </div>
          );
        }

        const cands = CATALOGO.filter(s => s.via === v && !sel.find(x => x.id === s.id));
        const subtotal = itens.reduce((a, s) => a + s.preco * s.sessoes, 0);

        return (
          <div key={v} style={{
            background: tk.bgAlt, border: `1px solid ${tk.border}`,
            borderTop: `3px solid ${c.dot}`,
            display: "flex", flexDirection: "column", minHeight: 360,
          }}>
            {/* Header coluna com botão min */}
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.border}`, background: c.soft }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: c.dot, letterSpacing: 1.5 }}>{v}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{itens.length} ITENS</span>
                  <button onClick={() => toggleCol(v)}
                    title="Minimizar coluna"
                    style={{
                      background: "transparent", border: `1px solid ${c.line}`, color: c.dot,
                      fontFamily: tk.mono, fontSize: 10, cursor: "pointer", padding: "1px 5px", lineHeight: 1,
                    }}>↕</button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: tk.ink, marginTop: 1 }}>{meta.titulo}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 1 }}>{meta.sub}</div>
            </div>

            {/* Selecionadas com CONTROLES INLINE */}
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {itens.map(s => {
                const h = hoverItem === s.id;
                const ehFormula = !!s.componentes;
                const aberta = editandoFormula === s.id;
                return (
                  <div key={s.id}
                    onMouseEnter={() => setHoverItem(s.id)}
                    onMouseLeave={() => setHoverItem(null)}
                    style={{
                      background: tk.bg, padding: 8,
                      border: `1px solid ${aberta ? c.dot : tk.border}`, borderLeft: `3px solid ${c.dot}`,
                      transition: "all 0.12s",
                      ...(h || aberta ? { outline: `1px solid ${c.dot}`, outlineOffset: "-1px", boxShadow: `0 0 10px ${c.line}` } : {}),
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25 }}>{s.nome}</div>
                        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
                          {s.dose}{ehFormula ? ` · ${s.componentes!.length} subst.` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {ehFormula && (
                          <button
                            onClick={() => setEditandoFormula(aberta ? null : s.id)}
                            title={aberta ? "Fechar editor de blend" : "Abrir editor de blend (3º andar)"}
                            style={{
                              background: aberta ? c.dot : "transparent", color: aberta ? tk.bg : c.dot,
                              border: `1px solid ${c.dot}`, fontFamily: tk.mono, fontSize: 8, fontWeight: 700,
                              cursor: "pointer", padding: "1px 5px", letterSpacing: 1, lineHeight: 1.4,
                            }}>⚙ BLEND</button>
                        )}
                        <button onClick={() => remove(s.id)} style={{
                          background: "transparent", color: tk.inkSubtle, border: "none",
                          fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1,
                        }}>×</button>
                      </div>
                    </div>

                    {/* Posologia campo-a-campo · tudo alinhado à linha imaginária esquerda */}
                    <div style={{
                      marginTop: 8, display: "flex", flexDirection: "column", gap: 5,
                      paddingLeft: 8, borderLeft: `1px solid ${c.line}`,
                    }}>
                      <Campo label="DOSE">
                        <input value={s.dose}
                          onChange={(e) => update(s.id, { dose: e.target.value })}
                          style={inpBase} />
                      </Campo>
                      <Campo label="VIA">
                        <select value={s.via}
                          onChange={(e) => update(s.id, { via: e.target.value as Via })}
                          style={inpBase}>
                          {(Object.keys(VIA_META) as Via[]).map(vv => (
                            <option key={vv} value={vv}>{vv} · {VIA_META[vv].titulo}</option>
                          ))}
                        </select>
                      </Campo>
                      <Campo label="FREQ.">
                        <select value={s.frequencia}
                          onChange={(e) => update(s.id, { frequencia: e.target.value as Frequencia })}
                          style={inpBase}>
                          {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </Campo>
                      <Campo label="PERÍODO">
                        <select value={s.periodo || ""}
                          onChange={(e) => update(s.id, { periodo: e.target.value || undefined })}
                          style={inpBase}>
                          <option value="">AUTO · pelos horários</option>
                          {PERIODOS_DIA.map(p => (
                            <option key={p.sigla} value={p.sigla}>{p.sigla} · {p.nome}</option>
                          ))}
                        </select>
                      </Campo>
                      <Campo label="SESSÕES">
                        <input type="number" min={1} max={30} value={s.sessoes}
                          onChange={(e) => update(s.id, { sessoes: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                          style={inpBase} />
                      </Campo>
                      <Campo label="ÂNCORA">
                        <select value={s.ancora || "sem-ancora"}
                          onChange={(e) => update(s.id, { ancora: e.target.value as Ancora })}
                          style={inpBase}>
                          {ANCORAS.map(a => <option key={a.v} value={a.v}>{a.lbl === "—" ? "sem âncora" : a.lbl}</option>)}
                        </select>
                      </Campo>
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

            {/* Funil VIA → CATEGORIA → ATIVO · lista completa + busca */}
            <PainelAdicionar cor={c.dot} corLine={c.line} cands={cands} addItem={addItem} />

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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "64px 1fr", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.2,
        textAlign: "left", whiteSpace: "nowrap",
      }}>{label}</span>
      {children}
    </label>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Painel + ADICIONAR · funil VIA → CATEGORIA → ATIVO (lista completa + busca)
// ───────────────────────────────────────────────────────────────────────
function PainelAdicionar({ cor, corLine, cands, addItem }: {
  cor: string; corLine: string; cands: Substancia[]; addItem: (s: Substancia) => void;
}) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<Categoria | null>(null);

  const categorias = useMemo(
    () => CATEGORIAS.filter(k => cands.some(s => s.categoria === k)),
    [cands],
  );
  const q = busca.trim().toLowerCase();
  const filtrados = cands.filter(s =>
    (!cat || s.categoria === cat) &&
    (!q || s.nome.toLowerCase().includes(q) || (s.detalhe || "").toLowerCase().includes(q)),
  );

  if (cands.length === 0) return null;

  const chip = (ativo: boolean): React.CSSProperties => ({
    fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
    padding: "3px 7px", cursor: "pointer", whiteSpace: "nowrap",
    background: ativo ? cor : tk.bg, color: ativo ? tk.bg : tk.inkMuted,
    border: `1px solid ${ativo ? cor : tk.border}`, transition: "all 0.12s",
  });

  return (
    <div style={{ padding: 8, borderTop: `1px solid ${tk.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>+ ADICIONAR</span>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>{filtrados.length}/{cands.length}</span>
      </div>

      {/* busca textual */}
      <input value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="buscar ativo…"
        style={{ ...inpBase, fontSize: 10, padding: "4px 7px", marginBottom: 6 }} />

      {/* nível 2 · categorias terapêuticas */}
      {categorias.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          <button onClick={() => setCat(null)} style={chip(cat === null)}>TODAS</button>
          {categorias.map(k => (
            <button key={k} onClick={() => setCat(cat === k ? null : k)} style={chip(cat === k)}>{k}</button>
          ))}
        </div>
      )}

      {/* nível 3 · lista completa rolável (sem teto) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 168, overflowY: "auto" }}>
        {filtrados.map(s => (
          <button key={s.id}
            onClick={() => addItem(s)}
            onMouseEnter={(e) => { e.currentTarget.style.outline = `1px solid ${cor}`; e.currentTarget.style.boxShadow = `0 0 6px ${corLine}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
            style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 4, alignItems: "center",
              padding: "4px 6px", background: tk.bg, color: tk.ink, border: "none",
              outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
              cursor: "pointer", textAlign: "left", transition: "all 0.12s",
            }}>
            <span style={{ overflow: "hidden" }}>
              <span style={{ display: "block", fontSize: 10, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</span>
              <span style={{ display: "block", fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>{s.categoria || "—"} · {s.dose}</span>
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: cor, flexShrink: 0 }}>+</span>
          </button>
        ))}
        {filtrados.length === 0 && (
          <div style={{
            border: `1px dashed ${tk.borderStrong}`, padding: 8, textAlign: "center",
            fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1,
          }}>NADA ENCONTRADO</div>
        )}
      </div>
    </div>
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

// ───────────────────────────────────────────────────────────────────────
// 3º ANDAR · Editor de Blend (fórmula magistral expandida)
// ───────────────────────────────────────────────────────────────────────

function EditorBlend({ formula, update, onClose, carta, setCarta }: {
  formula: Substancia;
  update: (patch: Partial<Substancia>) => void;
  onClose: () => void;
  carta: MatrizCartaEncantamento;
  setCarta: (c: MatrizCartaEncantamento) => void;
}) {
  const c = tk.via[formula.via];
  const componentes = formula.componentes || [];
  const horarios = formula.horarios || [];
  const [customH, setCustomH] = useState("");

  const setComp = (idx: number, patch: Partial<ComponenteBlend>) => {
    const novo = componentes.map((c, i) => i === idx ? { ...c, ...patch } : c);
    update({ componentes: novo });
  };
  const addComp = () => {
    const novo = [...componentes, { id: `c${Date.now()}`, nome: "", dose: "" }];
    update({ componentes: novo });
  };
  const removeComp = (idx: number) => {
    update({ componentes: componentes.filter((_, i) => i !== idx) });
  };
  const toggleHorario = (h: string) => {
    const novo = horarios.includes(h) ? horarios.filter(x => x !== h) : [...horarios, h];
    update({ horarios: novo });
  };
  const addCustomH = () => {
    if (!customH.trim() || horarios.includes(customH.trim())) return;
    update({ horarios: [...horarios, customH.trim()] });
    setCustomH("");
  };

  const dosesDia = horarios.length;
  const dosesPeriodo = dosesDia * formula.sessoes;

  return (
    <section style={{
      background: tk.bgAlt, border: `1px solid ${c.dot}`,
      borderLeft: `4px solid ${c.dot}`, padding: 0,
      boxShadow: `0 0 16px ${c.line}`,
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", background: c.soft, borderBottom: `1px solid ${tk.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 2 }}>3º ANDAR · EDITOR DE BLEND</span>
          <span style={{
            fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: c.dot,
            padding: "2px 6px", background: tk.bg, border: `1px solid ${c.line}`, letterSpacing: 1,
          }}>{formula.via} · {formula.nome}</span>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
            {formula.detalhe} · {formula.sessoes} {formula.frequencia === "diária" ? "dias" : "ciclos"}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "transparent", color: tk.inkMuted, border: `1px solid ${tk.border}`,
          fontFamily: tk.mono, fontSize: 9, cursor: "pointer", padding: "3px 8px", letterSpacing: 1,
        }}>FECHAR ×</button>
      </div>

      {/* Conteúdo em 2 colunas: substâncias do blend + horários */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, padding: 14 }}>

        {/* COLUNA 1 · substâncias do blend (linhas editáveis) */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              SUBSTÂNCIAS DO BLEND · {componentes.length} linhas
            </span>
            <button onClick={addComp} style={{
              background: "transparent", color: c.dot, border: `1px solid ${c.line}`,
              fontFamily: tk.mono, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "3px 8px", letterSpacing: 1,
            }}>+ LINHA</button>
          </div>

          {/* Cabeçalho da tabela de componentes */}
          <div style={{
            display: "grid", gridTemplateColumns: "28px 1fr 100px 22px", gap: 6,
            padding: "4px 0", borderBottom: `1px solid ${tk.border}`,
            fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5,
          }}>
            <span>#</span><span>SUBSTÂNCIA</span><span>DOSE</span><span></span>
          </div>

          {/* Linhas editáveis */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {componentes.map((comp, i) => (
              <div key={comp.id} style={{
                display: "grid", gridTemplateColumns: "28px 1fr 100px 22px", gap: 6,
                padding: "4px 0", borderBottom: `1px dashed ${tk.border}`, alignItems: "center",
              }}>
                <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, textAlign: "center" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input value={comp.nome}
                  onChange={(e) => setComp(i, { nome: e.target.value })}
                  placeholder="Nome da substância"
                  style={{ ...inpBase, fontSize: 11, fontFamily: tk.sans }} />
                <input value={comp.dose}
                  onChange={(e) => setComp(i, { dose: e.target.value })}
                  placeholder="ex: 25 mg"
                  style={{ ...inpBase, textAlign: "right" }} />
                <button onClick={() => removeComp(i)} style={{
                  background: "transparent", color: tk.inkSubtle, border: "none",
                  fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0,
                }}>×</button>
              </div>
            ))}
            {componentes.length === 0 && (
              <div style={{
                border: `1px dashed ${tk.borderStrong}`, padding: 14, textAlign: "center",
                fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1, marginTop: 6,
              }}>NENHUMA SUBSTÂNCIA · CLIQUE EM “+ LINHA”</div>
            )}
          </div>

          {/* Última linha fixa: VIA DE ADMINISTRAÇÃO */}
          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: tk.bg, border: `1px solid ${c.dot}`, borderLeft: `3px solid ${c.dot}`,
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
          }}>
            <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              VIA DE ADMINISTRAÇÃO
            </span>
            <select value={formula.via}
              onChange={(e) => update({ via: e.target.value as Via })}
              style={{ ...inpBase, fontSize: 11, fontWeight: 700, color: c.dot }}>
              {(Object.keys(VIA_META) as Via[]).map(v => (
                <option key={v} value={v}>{v} · {VIA_META[v].titulo}</option>
              ))}
            </select>
            <span style={{
              fontFamily: tk.mono, fontSize: 9, color: c.dot,
              padding: "3px 8px", background: c.soft, border: `1px solid ${c.line}`, letterSpacing: 1,
            }}>{VIA_META[formula.via].sub}</span>
          </div>
        </div>

        {/* COLUNA 2 · horários TDAH/TOC-friendly */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              HORÁRIOS DE TOMADA · dentro do período
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: c.dot }}>
              {dosesDia} dose{dosesDia !== 1 ? "s" : ""}/dia
            </span>
          </div>

          {/* Chips de horário padrão */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {HORARIOS_PADRAO.map(h => {
              const on = horarios.includes(h);
              return (
                <button key={h} onClick={() => toggleHorario(h)}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.borderColor = c.dot; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.borderColor = tk.border; }}
                  style={{
                    fontFamily: tk.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1,
                    padding: "6px 10px", cursor: "pointer",
                    background: on ? c.dot : tk.bg, color: on ? tk.bg : tk.ink,
                    border: `1px solid ${on ? c.dot : tk.border}`, transition: "all 0.12s",
                    ...(on ? { boxShadow: `0 0 8px ${c.line}` } : {}),
                  }}>{h}</button>
              );
            })}
          </div>

          {/* Horários custom (fora do padrão) */}
          {horarios.filter(h => !HORARIOS_PADRAO.includes(h as any)).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>CUSTOM ATIVOS</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {horarios.filter(h => !HORARIOS_PADRAO.includes(h as any)).map(h => (
                  <button key={h} onClick={() => toggleHorario(h)}
                    style={{
                      fontFamily: tk.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1,
                      padding: "6px 10px", cursor: "pointer",
                      background: c.dot, color: tk.bg, border: `1px solid ${c.dot}`,
                      boxShadow: `0 0 8px ${c.line}`,
                    }}>{h} ×</button>
                ))}
              </div>
            </div>
          )}

          {/* Input livre pra horário custom */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <input value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustomH(); }}
              placeholder="ex: 11h30, 23h, em jejum…"
              style={{ ...inpBase, flex: 1, fontSize: 10, padding: "5px 8px" }} />
            <button onClick={addCustomH} style={{
              background: "transparent", color: c.dot, border: `1px solid ${c.line}`,
              fontFamily: tk.mono, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "0 12px", letterSpacing: 1,
            }}>+ ADD</button>
          </div>

          {/* Resumo do esquema */}
          <div style={{
            padding: 10, background: tk.bg, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${c.dot}`,
          }}>
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>
              ESQUEMA RESULTANTE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>DOSES/DIA</div>
                <div style={{ fontFamily: tk.mono, fontSize: 16, fontWeight: 700, color: c.dot }}>{dosesDia}</div>
              </div>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>TOTAL NO PERÍODO</div>
                <div style={{ fontFamily: tk.mono, fontSize: 16, fontWeight: 700, color: c.dot }}>{dosesPeriodo}</div>
              </div>
            </div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 8, lineHeight: 1.5 }}>
              <span style={{ color: c.dot }}>→</span> {dosesDia === 0 ? "(selecione ao menos 1 horário)" :
                `${horarios.sort().join(" · ")} durante ${formula.sessoes} ${formula.frequencia === "diária" ? "dias" : "ciclos"}`}
            </div>
          </div>

          {/* MOTOR DE MENSAGERIA · 1 disparo por período */}
          <MapeamentoMensageria horarios={horarios} corVia={c.dot} />

          {/* CARTA DE ENCANTAMENTO · matriz períodos × cenários (estado lifted no GpsPadua) */}
          <CartaEncantamentoMatriz horarios={horarios} carta={carta} setCarta={setCarta} />
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Mapeamento horários → períodos cronobiológicos (Beatriz · WhatsApp)
// ───────────────────────────────────────────────────────────────────────
function MapeamentoMensageria({ horarios, corVia }: { horarios: string[]; corVia: string }) {
  const grupos = new Map<string, { p: typeof PERIODOS_DIA[number]; horarios: string[] }>();
  for (const h of horarios) {
    const p = horarioParaPeriodo(h);
    if (!p) continue;
    if (!grupos.has(p.sigla)) grupos.set(p.sigla, { p, horarios: [] });
    grupos.get(p.sigla)!.horarios.push(h);
  }
  const lista = Array.from(grupos.values()).sort((a, b) => a.p.janela_inicio.localeCompare(b.p.janela_inicio));

  return (
    <div style={{ marginTop: 8, padding: 10, background: tk.bg, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>
          ▶ MOTOR DE MENSAGERIA · whatsapp via Beatriz Romanov
        </span>
        <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.accent }}>
          {lista.length} mensagem{lista.length !== 1 ? "s" : ""}/dia
        </span>
      </div>
      {lista.length === 0 ? (
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
          (selecione horários pra ver quais períodos disparam)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {lista.map(g => (
            <div key={g.p.sigla} style={{
              display: "grid", gridTemplateColumns: "auto 28px auto 1fr auto", gap: 6,
              alignItems: "center", padding: "3px 6px",
              background: tk.bgAlt, borderLeft: `2px solid ${g.p.cor_primary}`,
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: g.p.cor_primary, letterSpacing: 1 }}>{g.p.sigla}</span>
              <span style={{ fontSize: 12 }}>{g.p.emoji}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{g.p.nome}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.ink }}>{g.horarios.join(" + ")}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: g.p.cor_primary, padding: "1px 5px", border: `1px solid ${g.p.cor_primary}55`, letterSpacing: 1 }}>1 PING</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 6, lineHeight: 1.4 }}>
        regra: múltiplos horários no mesmo período = <span style={{ color: corVia }}>1 única mensagem</span> listando todas as fórmulas. paciente empresário não é incomodado a toda hora.
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// CARTA DE ENCANTAMENTO · matriz períodos × cenários (toggle por paciente)
// Conceito Caio 19/05: 1 placeholder {CARTA_ENCANTAMENTO} no template do teatro,
// mas controlado AQUI no GPS por matriz pra evitar "pesadelo de repetição".
// ───────────────────────────────────────────────────────────────────────
function CartaEncantamentoMatriz({ horarios, carta, setCarta }: {
  horarios: string[];
  carta: MatrizCartaEncantamento;
  setCarta: (c: MatrizCartaEncantamento) => void;
}) {
  const { ativo, texto, dataInicio, dataFim, matriz } = carta;
  const setAtivo = (v: boolean) => setCarta({ ...carta, ativo: v });
  const setTexto = (v: string) => setCarta({ ...carta, texto: v });
  const setDataInicio = (v: string) => setCarta({ ...carta, dataInicio: v });
  const setDataFim = (v: string) => setCarta({ ...carta, dataFim: v });

  // só mostra períodos que têm dose marcada (foco TDAH)
  const periodosUtilizados = useMemo(() => {
    const set = new Set<string>();
    for (const h of horarios) { const p = horarioParaPeriodo(h); if (p) set.add(p.sigla); }
    return PERIODOS_DIA.filter(p => set.has(p.sigla));
  }, [horarios]);

  function toggle(sigla: string, cen: CenarioId) {
    setCarta({
      ...carta,
      matriz: { ...matriz, [sigla]: { ...matriz[sigla], [cen]: !matriz[sigla][cen] } },
    });
  }

  const totalDisparos = useMemo(() => {
    let n = 0;
    for (const p of Object.values(matriz)) for (const v of Object.values(p)) if (v) n++;
    return n;
  }, [matriz]);

  return (
    <div style={{ marginTop: 8, padding: 10, background: tk.bg, border: `1px solid #E8A5D855`, borderLeft: `3px solid #E8A5D8` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#E8A5D8", letterSpacing: 1.5 }}>
          ✨ CARTA DE ENCANTAMENTO · placeholder {`{CARTA_ENCANTAMENTO}`} injetado por matriz
        </span>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: tk.mono, fontSize: 9, color: tk.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} style={{ accentColor: "#E8A5D8" }} />
          {ativo ? "ATIVA" : "DESLIGADA"}
        </label>
      </div>

      <textarea value={texto} onChange={e => setTexto(e.target.value)} disabled={!ativo} placeholder='ex: "o dia da grande bênção está chegando 👶"'
        style={{
          width: "100%", minHeight: 50, background: tk.bgAlt, color: tk.ink,
          border: `1px solid ${ativo ? "#E8A5D855" : tk.border}`, padding: 8,
          fontFamily: "Georgia, serif", fontSize: 11, fontStyle: "italic", resize: "vertical",
          opacity: ativo ? 1 : 0.4, outline: "none",
        }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>JANELA · DATA INÍCIO</span>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={!ativo}
            style={{ background: tk.bgAlt, color: tk.ink, border: `1px solid ${tk.border}`, padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, opacity: ativo ? 1 : 0.4 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>JANELA · DATA FIM</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} disabled={!ativo}
            style={{ background: tk.bgAlt, color: tk.ink, border: `1px solid ${tk.border}`, padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, opacity: ativo ? 1 : 0.4 }} />
        </label>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>
          ▶ MATRIZ DE INJEÇÃO · marque ONDE a frase deve aparecer (períodos × cenários). Total: <strong style={{ color: "#E8A5D8" }}>{totalDisparos}</strong> injeções/dia
        </div>
        {periodosUtilizados.length === 0 ? (
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, padding: 6 }}>
            (marque horários acima pra liberar a matriz)
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: tk.mono, fontSize: 8, opacity: ativo ? 1 : 0.4 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px", color: tk.inkSubtle, borderBottom: `1px solid ${tk.border}`, letterSpacing: 1 }}>PERÍODO</th>
                  {CENARIOS.map(c => (
                    <th key={c.id} style={{ textAlign: "center", padding: "4px 6px", color: c.cor_primary, borderBottom: `1px solid ${tk.border}`, fontSize: 8, letterSpacing: 1 }}>
                      {c.emoji}<br />{c.nome.split(" ")[0].toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodosUtilizados.map(p => (
                  <tr key={p.sigla}>
                    <td style={{ padding: "5px 6px", color: tk.ink, borderBottom: `1px solid ${tk.border}`, borderLeft: `2px solid ${p.cor_primary}` }}>
                      <strong style={{ color: p.cor_primary }}>{p.sigla}</strong> {p.emoji} {p.nome} <span style={{ color: tk.inkSubtle }}>{p.janela_inicio}</span>
                    </td>
                    {CENARIOS.map(c => (
                      <td key={c.id} style={{ padding: "5px 6px", textAlign: "center", borderBottom: `1px solid ${tk.border}` }}>
                        <input type="checkbox" checked={matriz[p.sigla]?.[c.id] ?? false}
                          onChange={() => ativo && toggle(p.sigla, c.id)} disabled={!ativo}
                          aria-label={`Injetar carta de encantamento no período ${p.sigla} (${p.nome}) para cenário ${c.nome}`}
                          style={{ accentColor: c.cor_primary, cursor: ativo ? "pointer" : "not-allowed" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 8, lineHeight: 1.4 }}>
        <span style={{ color: "#E8A5D8" }}>regra Caio (19/05):</span> a carta encanta sem cansar. marque só os cruzamentos
        certos pra evitar repetir a mesma frase 9× ao dia. salvo em <code style={{ color: tk.accent }}>pacientes.carta_encantamento</code> (jsonb).
      </div>
    </div>
  );
}
