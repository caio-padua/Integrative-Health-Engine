import { useState } from "react";
import { tk, CATALOGO, SELECIONADAS_INICIAIS, PACIENTE, type Substancia, type Via } from "./_tokens";

const TOTAL_SESSOES = 8;
const SESSAO_ATUAL = 3;

function Brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ocupacaoSessoes(s: Substancia): boolean[] {
  const arr = new Array(TOTAL_SESSOES).fill(false);
  if (s.via === "VO") {
    for (let i = 0; i < TOTAL_SESSOES; i++) arr[i] = true;
    return arr;
  }
  if (s.id === "vitd-im") {
    arr[0] = true;
    return arr;
  }
  for (let i = 0; i < Math.min(s.sessoes, TOTAL_SESSOES); i++) arr[i] = true;
  return arr;
}

export function TimelineSessoes() {
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);
  const naoSelecionadas = CATALOGO.filter(c => !sel.find(s => s.id === c.id));

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: 20, display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5 }}>
            PRESCRIÇÃO RÁPIDA · TIMELINE DE SESSÕES
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <div style={{
              width: 36, height: 36, background: tk.bgAlt, color: tk.accent,
              fontFamily: tk.mono, fontSize: 12, fontWeight: 700,
              display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`,
            }}>{PACIENTE.iniciais}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{PACIENTE.nome}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>
                ID {PACIENTE.id} · sessão {SESSAO_ATUAL}/{TOTAL_SESSOES} · ciclo 1
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {(["EV", "IM", "VO"] as Via[]).map(v => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: tk.via[v].dot }} />
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, letterSpacing: 1 }}>{v}</span>
            </div>
          ))}
        </div>
      </header>

      {/* TIMELINE */}
      <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 18 }}>
        {/* RÉGUA SESSÕES */}
        <div style={{
          display: "grid", gridTemplateColumns: `260px repeat(${TOTAL_SESSOES}, 1fr) 80px`,
          gap: 4, alignItems: "center", marginBottom: 12,
        }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
            SUBSTÂNCIA
          </div>
          {Array.from({ length: TOTAL_SESSOES }).map((_, i) => {
            const n = i + 1;
            const passada = n < SESSAO_ATUAL;
            const atual = n === SESSAO_ATUAL;
            return (
              <div key={n} style={{
                textAlign: "center", fontFamily: tk.mono, fontSize: 10, padding: "6px 0",
                fontWeight: atual ? 700 : 500,
                color: atual ? tk.bg : passada ? tk.inkSubtle : tk.inkMuted,
                background: atual ? tk.accent : passada ? tk.bgSoft : tk.bg,
                border: `1px solid ${atual ? tk.accent : tk.border}`,
                letterSpacing: 1,
              }}>
                S{String(n).padStart(2, "0")}
              </div>
            );
          })}
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, textAlign: "right" }}>
            TOTAL
          </div>
        </div>

        {/* LINHAS SUBSTÂNCIAS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sel.map(s => {
            const c = tk.via[s.via];
            const ocup = ocupacaoSessoes(s);
            const subtotal = s.preco * s.sessoes;
            const h = hoverId === s.id;
            return (
              <div key={s.id}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  display: "grid", gridTemplateColumns: `260px repeat(${TOTAL_SESSOES}, 1fr) 80px`,
                  gap: 4, alignItems: "center",
                  background: h ? tk.bgSoft : tk.bg,
                  padding: "6px 8px", border: `1px solid ${h ? c.dot : tk.border}`,
                  borderLeft: `3px solid ${c.dot}`,
                  transition: "all 0.15s",
                  ...(h ? { boxShadow: `0 0 12px ${c.line}` } : {}),
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: c.dot,
                    background: c.soft, padding: "2px 6px", border: `1px solid ${c.line}`,
                    minWidth: 26, textAlign: "center",
                  }}>{s.via}</span>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nome}</div>
                    <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{s.dose}</div>
                  </div>
                </div>
                {ocup.map((on, i) => {
                  const n = i + 1;
                  const passada = n < SESSAO_ATUAL;
                  const cellKey = `${s.id}-${i}`;
                  const hc = hoverCell === cellKey;
                  return (
                    <div key={i}
                      onMouseEnter={() => setHoverCell(cellKey)}
                      onMouseLeave={() => setHoverCell(null)}
                      style={{
                        height: 28, cursor: "pointer", position: "relative",
                        background: on ? (passada ? c.line : c.dot) : tk.bgAlt,
                        border: `1px solid ${hc ? tk.accent : tk.border}`,
                        ...(hc ? { boxShadow: `0 0 8px ${tk.accentGlow}` } : {}),
                        transition: "all 0.15s",
                      }}>
                      {on && passada && (
                        <span style={{
                          position: "absolute", inset: 0, display: "grid", placeItems: "center",
                          fontFamily: tk.mono, fontSize: 10, color: tk.bg, fontWeight: 700,
                        }}>✓</span>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontFamily: tk.mono, fontSize: 12, fontWeight: 700, color: c.dot }}>{Brl(subtotal)}</span>
                  <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>{s.sessoes}× {Brl(s.preco)}</span>
                </div>
              </div>
            );
          })}
          {/* Linha "+ adicionar" */}
          <button style={{
            display: "grid", gridTemplateColumns: `260px 1fr 80px`, gap: 4, alignItems: "center",
            background: "transparent", border: `1px dashed ${tk.borderStrong}`,
            padding: 12, fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle,
            letterSpacing: 1, cursor: "pointer", textAlign: "left",
          }}>
            <span>+ ADICIONAR SUBSTÂNCIA</span>
            <span style={{ textAlign: "center" }}>arrastar da paleta abaixo · ou clicar</span>
            <span />
          </button>
        </div>
      </section>

      {/* PALETA INFERIOR */}
      <section>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 8 }}>
          PALETA · {naoSelecionadas.length} DISPONÍVEIS
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {naoSelecionadas.map(s => {
            const c = tk.via[s.via];
            return (
              <button key={s.id}
                onClick={() => setSel([...sel, s])}
                onMouseEnter={(e) => { e.currentTarget.style.outline = `1px solid ${c.dot}`; e.currentTarget.style.boxShadow = `0 0 8px ${c.line}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  background: tk.bgAlt, color: tk.ink, border: "none",
                  outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
                  borderLeft: `3px solid ${c.dot}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                <span style={{
                  fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: c.dot,
                  background: c.soft, padding: "1px 5px", border: `1px solid ${c.line}`,
                }}>{s.via}</span>
                <span style={{ fontSize: 11 }}>{s.nome}</span>
                <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{s.dose}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ACTION BAR */}
      <footer style={{
        marginTop: "auto", background: tk.bgAlt, border: `1px solid ${tk.border}`,
        padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1 }}>
            CICLO 1 · {TOTAL_SESSOES} SESSÕES · {sel.length} SUBSTÂNCIAS
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 22, fontWeight: 700, color: tk.accent, marginTop: 2 }}>
            {Brl(total)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { lbl: "Cancelar", cor: tk.inkSubtle, primary: false },
            { lbl: "Salvar Rascunho", cor: tk.ink, primary: false },
            { lbl: "Emitir Protocolo →", cor: tk.accent, primary: true },
          ].map(b => (
            <button key={b.lbl} style={{
              fontFamily: tk.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1,
              padding: "10px 18px", cursor: "pointer", color: b.primary ? tk.bg : b.cor,
              background: b.primary ? b.cor : "transparent",
              border: `1px solid ${b.cor}`, textTransform: "uppercase" as const,
            }}>{b.lbl}</button>
          ))}
        </div>
      </footer>
    </div>
  );
}
