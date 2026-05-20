import { useState } from "react";
import { tk, CATALOGO, SELECIONADAS_INICIAIS, PACIENTE, type Substancia, type Via } from "./_tokens";

const VIAS: { via: Via; titulo: string; sub: string }[] = [
  { via: "EV", titulo: "ENDOVENOSO", sub: "infusão · acesso periférico" },
  { via: "IM", titulo: "INTRAMUSCULAR", sub: "glúteo · superior externo" },
  { via: "VO", titulo: "VIA ORAL", sub: "magistral · uso contínuo" },
];

function Brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PilhaPorVia() {
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hover, setHover] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);

  const porVia = (v: Via) => sel.filter(s => s.via === v);
  const candidatos = (v: Via) => CATALOGO.filter(s => s.via === v && !sel.find(x => x.id === s.id));
  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: 20, display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* TOP — paciente compacto */}
      <header style={{
        background: tk.bgAlt, border: `1px solid ${tk.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 38, height: 38, background: tk.bg, color: tk.accent,
          fontFamily: tk.mono, fontSize: 13, fontWeight: 700,
          display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`,
        }}>{PACIENTE.iniciais}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{PACIENTE.nome}</div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>
            ID {PACIENTE.id} · {PACIENTE.idade}a · CPF {PACIENTE.cpf} · Sessão {PACIENTE.sessao}
          </div>
        </div>
        <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5, textTransform: "uppercase" as const }}>
          Prescrição Rápida · Pilha por Via
        </div>
      </header>

      {/* 3 COLUNAS POR VIA */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, flex: 1 }}>
        {VIAS.map(({ via, titulo, sub }) => {
          const c = tk.via[via];
          const itens = porVia(via);
          const cands = candidatos(via);
          const subtotal = itens.reduce((a, s) => a + s.preco * s.sessoes, 0);
          return (
            <section key={via} style={{
              background: tk.bgAlt, border: `1px solid ${tk.border}`,
              borderTop: `3px solid ${c.dot}`,
              display: "flex", flexDirection: "column",
            }}>
              {/* HEADER COLUNA */}
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${tk.border}`, background: c.soft }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontFamily: tk.mono, fontSize: 14, fontWeight: 700, color: c.dot, letterSpacing: 1.5 }}>
                    {via}
                  </div>
                  <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, letterSpacing: 1 }}>
                    {itens.length} ITENS
                  </div>
                </div>
                <div style={{ fontSize: 11, color: tk.ink, marginTop: 2 }}>{titulo}</div>
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, marginTop: 1 }}>{sub}</div>
              </div>

              {/* SELECIONADAS */}
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {itens.map(s => {
                  const h = hover === s.id;
                  return (
                    <div key={s.id}
                      onMouseEnter={() => setHover(s.id)}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        background: tk.bg, padding: "10px 12px",
                        border: `1px solid ${tk.border}`, borderLeft: `3px solid ${c.dot}`,
                        cursor: "pointer", transition: "all 0.15s",
                        ...(h ? { outline: `1px solid ${c.dot}`, outlineOffset: "-1px", boxShadow: `0 0 12px ${c.line}` } : {}),
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{s.nome}</div>
                        <button onClick={() => setSel(sel.filter(x => x.id !== s.id))} style={{
                          background: "transparent", color: tk.inkSubtle, border: "none",
                          fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0,
                        }}>×</button>
                      </div>
                      <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 2 }}>
                        {s.dose} · {s.frequencia}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {Array.from({ length: s.sessoes }).slice(0, 8).map((_, i) => (
                            <span key={i} style={{
                              width: 6, height: 12, background: i < 3 ? c.dot : tk.borderStrong,
                            }} />
                          ))}
                          {s.sessoes > 8 && (
                            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, marginLeft: 4 }}>+{s.sessoes - 8}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: tk.mono, fontSize: 11, color: c.dot, fontWeight: 600 }}>
                          {Brl(s.preco * s.sessoes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {itens.length === 0 && (
                  <div style={{
                    border: `1px dashed ${tk.borderStrong}`, padding: 20, textAlign: "center",
                    fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1,
                  }}>
                    SEM ITENS NESTA VIA
                  </div>
                )}
              </div>

              {/* CANDIDATOS — sugestões rápidas */}
              <div style={{ padding: "0 12px 12px", marginTop: "auto" }}>
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, margin: "8px 0" }}>
                  + ADICIONAR
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {cands.slice(0, 4).map(s => (
                    <button key={s.id}
                      onMouseDown={() => setArrastando(s.id)}
                      onMouseUp={() => setArrastando(null)}
                      onClick={() => setSel([...sel, s])}
                      onMouseEnter={(e) => { e.currentTarget.style.outline = `1px solid ${c.dot}`; e.currentTarget.style.boxShadow = `0 0 8px ${c.line}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 10px", background: tk.bg, color: tk.ink,
                        border: "none", outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}>
                      <span style={{ fontSize: 11 }}>{s.nome}</span>
                      <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>{s.dose}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FOOTER COLUNA */}
              <div style={{
                padding: "10px 14px", borderTop: `1px solid ${tk.border}`,
                background: tk.bgSoft, display: "flex", justifyContent: "space-between",
              }}>
                <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1 }}>SUBTOTAL</span>
                <span style={{ fontFamily: tk.mono, fontSize: 12, fontWeight: 700, color: c.dot }}>{Brl(subtotal)}</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* ACTION BAR */}
      <footer style={{
        background: tk.bgAlt, border: `1px solid ${tk.border}`,
        padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1 }}>TOTAL CONSOLIDADO</div>
            <div style={{ fontFamily: tk.mono, fontSize: 22, fontWeight: 700, color: tk.accent }}>{Brl(total)}</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {VIAS.map(({ via }) => {
              const c = tk.via[via];
              const n = porVia(via).length;
              return (
                <div key={via} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: c.dot, borderRadius: "50%" }} />
                  <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>{via} · {n}</span>
                </div>
              );
            })}
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
