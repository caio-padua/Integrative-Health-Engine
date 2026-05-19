import { useState, useRef, useEffect } from "react";
import { tk, CATALOGO, SELECIONADAS_INICIAIS, PACIENTE, type Substancia } from "./_tokens";

function Brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ATALHOS = [
  { tecla: "⌘ K", acao: "FOCO NO COMANDO" },
  { tecla: "↑ ↓", acao: "NAVEGAR" },
  { tecla: "↵",   acao: "ADICIONAR" },
  { tecla: "⌫",   acao: "REMOVER ÚLTIMO" },
  { tecla: "⌘ ↵", acao: "EMITIR" },
  { tecla: "esc", acao: "CANCELAR" },
];

export function ComandoTeclado() {
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const sugestoes = CATALOGO
    .filter(s => !sel.find(x => x.id === s.id))
    .filter(s => !q || s.nome.toLowerCase().includes(q.toLowerCase()) || s.via.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6);

  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, sugestoes.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && sugestoes[cursor]) {
      e.preventDefault();
      setSel([...sel, sugestoes[cursor]]);
      setQ("");
      setCursor(0);
    }
    if (e.key === "Backspace" && q === "" && sel.length > 0) {
      e.preventDefault();
      setSel(sel.slice(0, -1));
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.mono, padding: 32,
      display: "flex", flexDirection: "column", gap: 24,
    }}>
      {/* HEADER MÍNIMO */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 10, color: tk.inkSubtle, letterSpacing: 2 }}>
            PAWARDS · PRESCRIÇÃO RÁPIDA · MODO COMANDO
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: tk.ink, marginTop: 4, letterSpacing: 0.5 }}>
            {PACIENTE.nome.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: tk.inkMuted, marginTop: 2 }}>
            ID {PACIENTE.id} · {PACIENTE.idade}a · CPF {PACIENTE.cpf} · sessão {PACIENTE.sessao}
          </div>
        </div>
        <div style={{ fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5, textAlign: "right" }}>
          <div>{new Date().toLocaleDateString("pt-BR")} · 14:32</div>
          <div style={{ marginTop: 2 }}>SESSÃO ATIVA · #3497</div>
        </div>
      </header>

      {/* CAMPO DE COMANDO PROTAGONISTA */}
      <div style={{
        background: tk.bgAlt, border: `1px solid ${tk.accent}`,
        boxShadow: `0 0 0 1px ${tk.accent}, 0 0 24px ${tk.accentGlow}`,
        padding: "18px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: tk.accent, fontSize: 18, fontWeight: 700 }}>›</span>
          <input
            ref={ref}
            value={q}
            onChange={e => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKey}
            placeholder="digite substância · via · dose · ex: nad ev 500"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: tk.ink, fontFamily: tk.mono, fontSize: 18, letterSpacing: 0.5,
            }}
          />
          <span style={{
            fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5,
            border: `1px solid ${tk.border}`, padding: "3px 6px",
          }}>⌘ K</span>
        </div>

        {/* SUGESTÕES INLINE */}
        {sugestoes.length > 0 && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${tk.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {sugestoes.map((s, i) => {
              const c = tk.via[s.via];
              const ativo = i === cursor;
              return (
                <div key={s.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => { setSel([...sel, s]); setQ(""); setCursor(0); ref.current?.focus(); }}
                  style={{
                    display: "grid", gridTemplateColumns: "auto 40px 1fr auto auto", gap: 12,
                    padding: "8px 10px", cursor: "pointer", alignItems: "center",
                    background: ativo ? tk.bgSoft : "transparent",
                    borderLeft: `2px solid ${ativo ? c.dot : "transparent"}`,
                    transition: "all 0.1s",
                  }}>
                  <span style={{ fontSize: 10, color: ativo ? c.dot : tk.inkSubtle, width: 12 }}>{ativo ? "›" : " "}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: c.dot, background: c.soft,
                    padding: "2px 6px", border: `1px solid ${c.line}`, textAlign: "center" as const,
                  }}>{s.via}</span>
                  <span style={{ fontSize: 13, color: tk.ink, fontFamily: tk.sans }}>{s.nome}</span>
                  <span style={{ fontSize: 10, color: tk.inkMuted }}>{s.dose}</span>
                  <span style={{ fontSize: 10, color: tk.accent }}>{Brl(s.preco)}/sessão</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LISTA SELECIONADAS */}
      <section>
        <div style={{ fontSize: 9, color: tk.inkSubtle, letterSpacing: 2, marginBottom: 10 }}>
          PROTOCOLO · {sel.length} {sel.length === 1 ? "ITEM" : "ITENS"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sel.map((s, i) => {
            const c = tk.via[s.via];
            return (
              <div key={s.id}
                onMouseEnter={(e) => { e.currentTarget.style.background = tk.bgSoft; e.currentTarget.style.outline = `1px solid ${c.dot}`; e.currentTarget.style.boxShadow = `0 0 12px ${c.line}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = tk.bgAlt; e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
                style={{
                  display: "grid", gridTemplateColumns: "32px 50px 1fr auto auto 60px 100px 32px",
                  gap: 12, alignItems: "center", padding: "10px 14px",
                  background: tk.bgAlt, outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
                  borderLeft: `3px solid ${c.dot}`,
                  transition: "all 0.15s", cursor: "pointer",
                }}>
                <span style={{ fontSize: 10, color: tk.inkSubtle }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: c.dot, background: c.soft,
                  padding: "3px 8px", border: `1px solid ${c.line}`, textAlign: "center" as const,
                }}>{s.via}</span>
                <div>
                  <div style={{ fontSize: 13, color: tk.ink, fontFamily: tk.sans, fontWeight: 500 }}>{s.nome}</div>
                  {s.detalhe && <div style={{ fontSize: 9, color: tk.inkSubtle, marginTop: 1 }}>{s.detalhe}</div>}
                </div>
                <span style={{ fontSize: 11, color: tk.inkMuted }}>{s.dose}</span>
                <span style={{ fontSize: 10, color: tk.inkSubtle, letterSpacing: 1 }}>{s.frequencia.toUpperCase()}</span>
                <span style={{ fontSize: 10, color: tk.inkMuted, textAlign: "center" as const }}>{s.sessoes}×</span>
                <span style={{ fontSize: 12, color: c.dot, fontWeight: 700, textAlign: "right" as const }}>
                  {Brl(s.preco * s.sessoes)}
                </span>
                <button onClick={() => setSel(sel.filter(x => x.id !== s.id))} style={{
                  background: "transparent", color: tk.inkSubtle, border: "none",
                  fontSize: 14, cursor: "pointer", fontFamily: tk.mono,
                }}>×</button>
              </div>
            );
          })}
          {sel.length === 0 && (
            <div style={{
              border: `1px dashed ${tk.borderStrong}`, padding: 32, textAlign: "center",
              fontSize: 11, color: tk.inkSubtle, letterSpacing: 1.5,
            }}>
              · protocolo vazio · use o campo acima ↑
            </div>
          )}
        </div>
      </section>

      {/* TOTAL + ATALHOS */}
      <footer style={{
        marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${tk.border}`,
        display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {ATALHOS.map(a => (
            <div key={a.acao} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 9, color: tk.inkMuted, padding: "3px 6px",
                border: `1px solid ${tk.border}`, background: tk.bgAlt, minWidth: 28, textAlign: "center" as const,
              }}>{a.tecla}</span>
              <span style={{ fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.2 }}>{a.acao}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>TOTAL</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: tk.accent }}>{Brl(total)}</div>
          </div>
          <button style={{
            fontFamily: tk.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            padding: "12px 20px", cursor: "pointer", color: tk.bg, background: tk.accent,
            border: `1px solid ${tk.accent}`, textTransform: "uppercase" as const,
            boxShadow: `0 0 16px ${tk.accentGlow}`,
          }}>EMITIR ⌘↵</button>
        </div>
      </footer>
    </div>
  );
}
