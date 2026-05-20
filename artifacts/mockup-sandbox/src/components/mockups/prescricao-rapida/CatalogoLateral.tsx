import { useState } from "react";
import { tk, CATALOGO, SELECIONADAS_INICIAIS, PACIENTE, PATOLOGIAS, VITAIS, type Substancia, type Via } from "./_tokens";

const neon = (cor: string) => ({
  outline: `1px solid ${cor}`,
  outlineOffset: "-1px",
  boxShadow: `0 0 0 1px ${cor}, 0 0 12px ${tk.accentGlow}`,
});

function ViaTag({ via }: { via: Via }) {
  const c = tk.via[via];
  return (
    <span style={{
      fontFamily: tk.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1,
      padding: "2px 6px", color: c.dot, background: c.soft, border: `1px solid ${c.line}`,
    }}>{via}</span>
  );
}

function Brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CatalogoLateral() {
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hover, setHover] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"INJ" | "FRM" | "PROT">("INJ");

  const catalogoFiltrado = CATALOGO.filter(s => {
    if (aba === "INJ" && !(s.via === "EV" || s.via === "IM" || s.via === "SC")) return false;
    if (aba === "FRM" && s.via !== "VO") return false;
    if (busca && !s.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return !sel.find(x => x.id === s.id);
  });

  const total = sel.reduce((acc, s) => acc + s.preco * s.sessoes, 0);
  const totalSessoes = Math.max(...sel.map(s => s.sessoes), 0);

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: 20, display: "grid",
      gridTemplateColumns: "260px 1fr 320px", gap: 16,
    }}>
      {/* PACIENTE FIXO */}
      <aside style={{ background: tk.bgAlt, border: `1px solid ${tk.border}` }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${tk.border}`, background: tk.bgSoft }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 44, height: 44, background: tk.bg, color: tk.accent,
              fontFamily: tk.mono, fontSize: 16, fontWeight: 700,
              display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`,
            }}>{PACIENTE.iniciais}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{PACIENTE.nome}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>
                ID {PACIENTE.id} · {PACIENTE.idade}a
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, padding: "2px 6px", background: tk.via.IM.soft, color: tk.warn, border: `1px solid ${tk.via.IM.line}` }}>PLANO {PACIENTE.plano}</span>
            <span style={{ fontFamily: tk.mono, fontSize: 9, padding: "2px 6px", background: tk.via.EV.soft, color: tk.ok, border: `1px solid ${tk.via.EV.line}` }}>SESSÃO {PACIENTE.sessao}</span>
          </div>
        </div>

        <div style={{ padding: 14, borderBottom: `1px solid ${tk.border}` }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 8 }}>SINAIS VITAIS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {VITAIS.map(v => (
              <div key={v.label} style={{
                background: tk.bg, padding: "6px 8px",
                borderLeft: `3px solid ${v.status === "alerta" ? tk.warn : tk.ok}`,
              }}>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>{v.label}</div>
                <div style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: v.status === "alerta" ? tk.warn : tk.ink }}>{v.valor}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 8 }}>PATOLOGIAS · {PATOLOGIAS.length} ATIVAS</div>
          {PATOLOGIAS.map(p => (
            <div key={p.nome} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
              background: tk.bg, marginBottom: 4, fontSize: 11,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.status === "alerta" ? tk.warn : tk.ok, flexShrink: 0 }} />
              <span style={{ flex: 1, color: tk.ink }}>{p.nome}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{p.valor}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* WORKSPACE PRINCIPAL */}
      <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* KPI STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { lbl: "PATOLOGIAS", val: "04", cor: tk.warn },
            { lbl: "PROCEDIMENTOS", val: String(sel.length).padStart(2, "0"), cor: tk.accent },
            { lbl: "SESSÃO ATUAL", val: PACIENTE.sessao, cor: tk.ok },
            { lbl: "TOTAL PROTOCOLO", val: Brl(total), cor: tk.accent },
          ].map(k => (
            <div key={k.lbl} style={{
              background: tk.bgAlt, border: `1px solid ${tk.border}`,
              padding: "10px 12px", borderLeft: `3px solid ${k.cor}`,
            }}>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>{k.lbl}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 18, fontWeight: 700, color: k.cor, marginTop: 2 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5 }}>PRESCRIÇÃO RÁPIDA · MODO ATALHO</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>Protocolo · Sessão {PACIENTE.sessao}</div>
          </div>
          <span style={{ fontFamily: tk.mono, fontSize: 9, padding: "3px 8px", color: tk.warn, background: tk.via.IM.soft, border: `1px solid ${tk.via.IM.line}`, letterSpacing: 1 }}>
            SEM ANAMNESE OBRIGATÓRIA
          </span>
        </div>

        {/* LISTA DE SUBSTÂNCIAS SELECIONADAS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sel.map(s => {
            const c = tk.via[s.via];
            const h = hover === s.id;
            return (
              <div key={s.id}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                style={{
                  background: tk.bgAlt, border: `1px solid ${tk.border}`,
                  borderLeft: `3px solid ${c.dot}`,
                  padding: "12px 14px", display: "grid",
                  gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
                  cursor: "pointer", transition: "all 0.15s",
                  ...(h ? neon(tk.accent) : {}),
                }}>
                <div style={{
                  fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: c.dot,
                  background: c.soft, padding: "6px 10px", border: `1px solid ${c.line}`,
                  minWidth: 38, textAlign: "center",
                }}>{s.via}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.nome}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, marginTop: 2 }}>
                    {s.dose} {s.detalhe ? "· " + s.detalhe : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {[`${s.sessoes} sessões`, s.frequencia, `${Brl(s.preco)}/sessão`].map(t => (
                      <span key={t} style={{ fontFamily: tk.mono, fontSize: 9, padding: "2px 6px", background: tk.bgSoft, color: tk.inkMuted }}>{t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSel(sel.filter(x => x.id !== s.id))} style={{
                  background: "transparent", color: tk.danger, border: `1px solid ${tk.danger}`,
                  fontFamily: tk.mono, fontSize: 11, padding: "4px 8px", cursor: "pointer",
                }}>×</button>
              </div>
            );
          })}
          <button style={{
            background: "transparent", color: tk.inkSubtle, border: `1px dashed ${tk.borderStrong}`,
            padding: 16, fontFamily: tk.mono, fontSize: 11, letterSpacing: 1, cursor: "pointer",
          }}>+ ADICIONAR SUBSTÂNCIA (clique no catálogo →)</button>
        </div>

        {/* ACTION BAR */}
        <div style={{
          marginTop: "auto", padding: "14px 0", borderTop: `1px solid ${tk.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1 }}>TOTAL ESTIMADO</div>
            <div style={{ fontFamily: tk.mono, fontSize: 22, fontWeight: 700, color: tk.accent }}>{Brl(total)}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 2 }}>
              {totalSessoes} sessões · {sel.length} substâncias
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
        </div>
      </main>

      {/* CATÁLOGO LATERAL DIREITO */}
      <aside style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 14, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 10 }}>CATÁLOGO DE SUBSTÂNCIAS</div>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar substância..."
          style={{
            background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`,
            padding: "8px 10px", fontSize: 12, fontFamily: tk.sans, outline: "none", marginBottom: 10,
          }}
        />
        <div style={{ display: "flex", marginBottom: 12 }}>
          {(["INJ", "FRM", "PROT"] as const).map(t => (
            <button key={t} onClick={() => setAba(t)} style={{
              flex: 1, padding: "6px 4px", fontFamily: tk.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: 1, cursor: "pointer",
              background: aba === t ? tk.accent : "transparent",
              color: aba === t ? tk.bg : tk.inkMuted,
              border: `1px solid ${aba === t ? tk.accent : tk.border}`,
              borderRight: t === "PROT" ? `1px solid ${aba === t ? tk.accent : tk.border}` : "none",
            }}>{t === "INJ" ? "Injetáveis" : t === "FRM" ? "Fórmulas" : "Protocolos"}</button>
          ))}
        </div>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {catalogoFiltrado.map(s => (
            <button key={s.id}
              onClick={() => setSel([...sel, s])}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, neon(tk.accent))}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { boxShadow: "none", outline: `1px solid ${tk.border}`, outlineOffset: "-1px" })}
              style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10,
                alignItems: "center", padding: "8px 10px",
                background: tk.bg, border: "none", color: tk.ink, cursor: "pointer",
                outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
                transition: "all 0.15s", textAlign: "left",
              }}>
              <ViaTag via={s.via} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{s.nome}</div>
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, marginTop: 1 }}>{s.dose}</div>
              </div>
              <span style={{ fontFamily: tk.mono, fontSize: 12, color: tk.accent }}>+</span>
            </button>
          ))}
          {catalogoFiltrado.length === 0 && (
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, textAlign: "center", padding: 20 }}>
              · sem resultados ·
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
