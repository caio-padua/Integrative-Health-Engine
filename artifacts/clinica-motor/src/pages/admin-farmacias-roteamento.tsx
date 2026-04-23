// PARMAVAULT-TSUNAMI Wave 5 · Onda 3 · UI regras de roteamento
// /admin/farmacias-roteamento — master-only
// - Tabela editavel por farmacia (regras + cotas + tipos de bloco)
// - Painel simulador: dispara POST preview pra ver qual farmacia o
//   roteador escolheria dado {unidade, tipo_bloco, override}
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { RefreshCw, Save, Wand2 } from "lucide-react";

type Farmacia = {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
  nivel_exclusividade: string;
  disponivel_manual: boolean;
  acionavel_por_criterio: boolean;
  cota_pct_max: string | number | null;
  cota_receitas_max_mes: number | null;
  prioridade: number;
  aceita_blocos_tipos: string[];
  observacoes_roteamento: string | null;
  qtd_emissoes_mes: number;
  pct_atual_mes: number;
  contratos_ativos: number;
};

type Resultado = {
  ok: boolean;
  regra_aplicada: string;
  contrato_unidade_ok: boolean;
  farmacia_escolhida: any;
  alternativas: any[];
  rejeitadas: any[];
  contexto: any;
};

const NAVY = "#020406";
const GOLD = "#C89B3C";
const NIVEIS = ["parceira","preferencial","exclusiva","piloto","backup"] as const;

export default function AdminFarmaciasRoteamento() {
  const [list, setList] = useState<Farmacia[]>([]);
  const [anoMes, setAnoMes] = useState<string>("");
  const [totalPool, setTotalPool] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Record<number, Partial<Farmacia>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  // Simulador
  const [unidades, setUnidades] = useState<{ id: number; nome: string; nick: string | null }[]>([]);
  const [simUni, setSimUni] = useState<string>("");
  const [simTipo, setSimTipo] = useState<string>("");
  const [simOverride, setSimOverride] = useState<string>("");
  const [simResult, setSimResult] = useState<Resultado | null>(null);
  const [simulating, setSimulating] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true); setMsg("");
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/farmacias-roteamento`, { credentials: "include" }),
        fetch(`/api/admin/contratos-farmacia/options`, { credentials: "include" }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (!r1.ok || !j1.ok) throw new Error(j1.error || "erro lista");
      if (!r2.ok || !j2.ok) throw new Error(j2.error || "erro options");
      setList(j1.farmacias || []);
      setAnoMes(j1.ano_mes || "");
      setTotalPool(Number(j1.total_emissoes_pool || 0));
      setUnidades(j2.unidades || []);
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function patch(id: number, k: keyof Farmacia, v: any) {
    setEditing((s) => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));
  }
  function valOr(f: Farmacia, k: keyof Farmacia): any {
    const e = editing[f.id];
    if (e && k in e) return (e as any)[k];
    return (f as any)[k];
  }

  async function salvar(f: Farmacia) {
    const e = editing[f.id]; if (!e) return;
    setSavingId(f.id); setMsg("");
    try {
      const body: any = { ...e };
      if (typeof body.aceita_blocos_tipos === "string") {
        body.aceita_blocos_tipos = body.aceita_blocos_tipos
          .split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      const r = await fetch(`/api/admin/farmacias-roteamento/${f.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`Farmácia #${f.id} (${f.nome_fantasia}) salva.`);
      setEditing((s) => { const c = { ...s }; delete c[f.id]; return c; });
      await carregar();
    } catch (er) {
      setMsg(`Erro ao salvar: ${String(er)}`);
    } finally { setSavingId(null); }
  }

  async function simular() {
    if (!simUni) { setMsg("Selecione unidade pra simular."); return; }
    setSimulating(true); setSimResult(null); setMsg("");
    try {
      const r = await fetch(`/api/admin/farmacias-roteamento/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidade_id: Number(simUni),
          tipo_bloco: simTipo || undefined,
          override_farmacia_id: simOverride ? Number(simOverride) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setSimResult(j.resultado);
    } catch (er) {
      setMsg(`Erro simulação: ${String(er)}`);
    } finally { setSimulating(false); }
  }

  return (
    <Layout>
      <div style={{ background: NAVY, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", color: "#E8E5DA" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, color: GOLD, margin: 0, fontFamily: "Georgia, serif" }}>
                Roteamento PARMAVAULT — Regras & Cotas
              </h1>
              <p style={{ marginTop: 6, color: "#9A9282", fontSize: 13 }}>
                Wave 5 onda 2-3 · pool {list.length} farmácias · mês {anoMes} · {totalPool} emissões no pool
              </p>
            </div>
            <button onClick={() => void carregar()}
              className="px-3 py-2 rounded border text-sm flex items-center gap-2"
              style={{ borderColor: "#3A352A", background: "transparent", color: "#E8E5DA" }}>
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {msg && (
            <div style={{ background: "#1a1610", border: `1px solid ${GOLD}`, padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              {msg}
            </div>
          )}

          {/* ─── Simulador ─── */}
          <div style={{ background: "#0a0d12", border: `1px solid ${GOLD}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <h2 style={{ color: GOLD, fontSize: 16, marginTop: 0, marginBottom: 16 }}>
              Simulador de roteamento (preview, não persiste)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={lbl}>Unidade</label>
                <select value={simUni} onChange={(e) => setSimUni(e.target.value)} style={inp}>
                  <option value="">— selecione —</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nick || u.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tipo de bloco (opcional)</label>
                <input value={simTipo} onChange={(e) => setSimTipo(e.target.value)}
                  placeholder="formula_oral / injetavel / topico / implante" style={inp} />
              </div>
              <div>
                <label style={lbl}>Override manual (opcional)</label>
                <select value={simOverride} onChange={(e) => setSimOverride(e.target.value)} style={inp}>
                  <option value="">— sem override —</option>
                  {list.filter((f) => f.ativo).map((f) => (
                    <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => void simular()} disabled={simulating}
                className="px-4 py-2 rounded text-sm flex items-center gap-2 font-semibold"
                style={{ background: GOLD, color: NAVY, opacity: simulating ? 0.6 : 1 }}>
                <Wand2 size={14} /> {simulating ? "Simulando..." : "Simular"}
              </button>
            </div>

            {simResult && (
              <div style={{ marginTop: 16, padding: 14, background: "#020406", border: "1px solid #3A352A", borderRadius: 6, fontSize: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ color: "#9A9282", fontSize: 11 }}>REGRA APLICADA</div>
                    <div style={{ color: GOLD, fontWeight: 600, fontSize: 14 }}>{simResult.regra_aplicada}</div>
                  </div>
                  <div>
                    <div style={{ color: "#9A9282", fontSize: 11 }}>CONTRATO UNIDADE</div>
                    <div style={{ color: simResult.contrato_unidade_ok ? "#7adb9a" : "#dba0a0", fontWeight: 600 }}>
                      {simResult.contrato_unidade_ok ? "OK" : "AUSENTE"}
                    </div>
                  </div>
                </div>
                {simResult.farmacia_escolhida ? (
                  <div style={{ marginTop: 12, padding: 10, background: "rgba(200,155,60,0.1)", border: `1px solid ${GOLD}`, borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: "#9A9282" }}>FARMÁCIA ESCOLHIDA</div>
                    <div style={{ fontSize: 16, color: GOLD, fontWeight: 600 }}>
                      {simResult.farmacia_escolhida.nome_fantasia}
                    </div>
                    <div style={{ fontSize: 12, color: "#E8E5DA", marginTop: 4 }}>
                      Nível: {simResult.farmacia_escolhida.nivel_exclusividade} · Prioridade: {simResult.farmacia_escolhida.prioridade}
                      · Mês atual: {simResult.farmacia_escolhida.qtd_emissoes_mes} ({simResult.farmacia_escolhida.pct_atual_mes}%)
                      · Capacidade restante: {simResult.farmacia_escolhida.capacidade_restante}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, color: "#dba0a0" }}>Nenhuma farmácia atende os critérios.</div>
                )}
                {simResult.alternativas.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: "#9A9282" }}>ALTERNATIVAS</div>
                    {simResult.alternativas.map((a) => (
                      <div key={a.id} style={{ fontSize: 12, marginTop: 4 }}>
                        • {a.nome_fantasia} (prio {a.prioridade}, restante {a.capacidade_restante})
                      </div>
                    ))}
                  </div>
                )}
                {simResult.rejeitadas.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 11, color: "#9A9282", cursor: "pointer" }}>
                      REJEITADAS ({simResult.rejeitadas.length})
                    </summary>
                    {simResult.rejeitadas.map((a) => (
                      <div key={a.id} style={{ fontSize: 12, marginTop: 4, color: "#dba0a0" }}>
                        • {a.nome_fantasia} — {a.motivo_eliminacao}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            )}
          </div>

          {/* ─── Tabela editável de farmácias ─── */}
          <div style={{ background: "#0a0d12", border: "1px solid #2a2418", borderRadius: 8, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9A9282" }}>Carregando...</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ background: "#1a1610", color: GOLD }}>
                  <tr>
                    <th style={th}>Farmácia</th>
                    <th style={th}>Nível</th>
                    <th style={th}>Prio</th>
                    <th style={th}>Manual</th>
                    <th style={th}>Critério</th>
                    <th style={th}>Cota %</th>
                    <th style={th}>Cota Abs</th>
                    <th style={th}>Aceita Blocos (csv)</th>
                    <th style={th}>Mês {anoMes}</th>
                    <th style={th}>Contratos</th>
                    <th style={th}>Ativo</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => {
                    const dirty = !!editing[f.id];
                    const aceita = valOr(f, "aceita_blocos_tipos");
                    const aceitaStr = Array.isArray(aceita) ? aceita.join(",") : aceita;
                    return (
                      <tr key={f.id} style={{ borderTop: "1px solid #2a2418", background: dirty ? "rgba(200,155,60,0.05)" : "transparent" }}>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{f.nome_fantasia}</div>
                          <div style={{ fontSize: 10, color: "#9A9282" }}>{f.cidade}/{f.estado}</div>
                        </td>
                        <td style={td}>
                          <select value={valOr(f, "nivel_exclusividade")} onChange={(e) => patch(f.id, "nivel_exclusividade", e.target.value)} style={inpSm}>
                            {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td style={td}>
                          <input type="number" value={valOr(f, "prioridade")} onChange={(e) => patch(f.id, "prioridade", Number(e.target.value))} style={{ ...inpSm, width: 60 }} />
                        </td>
                        <td style={td}>
                          <input type="checkbox" checked={Boolean(valOr(f, "disponivel_manual"))} onChange={(e) => patch(f.id, "disponivel_manual", e.target.checked)} />
                        </td>
                        <td style={td}>
                          <input type="checkbox" checked={Boolean(valOr(f, "acionavel_por_criterio"))} onChange={(e) => patch(f.id, "acionavel_por_criterio", e.target.checked)} />
                        </td>
                        <td style={td}>
                          <input type="number" step="0.5" value={valOr(f, "cota_pct_max") ?? ""} onChange={(e) => patch(f.id, "cota_pct_max", e.target.value === "" ? null : Number(e.target.value))} placeholder="∞" style={{ ...inpSm, width: 70 }} />
                        </td>
                        <td style={td}>
                          <input type="number" value={valOr(f, "cota_receitas_max_mes") ?? ""} onChange={(e) => patch(f.id, "cota_receitas_max_mes", e.target.value === "" ? null : Number(e.target.value))} placeholder="∞" style={{ ...inpSm, width: 70 }} />
                        </td>
                        <td style={td}>
                          <input value={aceitaStr ?? ""} onChange={(e) => patch(f.id, "aceita_blocos_tipos" as any, e.target.value)} placeholder="vazio = todos" style={{ ...inpSm, width: 200 }} />
                        </td>
                        <td style={td}>{f.qtd_emissoes_mes} ({f.pct_atual_mes}%)</td>
                        <td style={td}>{f.contratos_ativos}</td>
                        <td style={td}>
                          <input type="checkbox" checked={Boolean(valOr(f, "ativo"))} onChange={(e) => patch(f.id, "ativo", e.target.checked)} />
                        </td>
                        <td style={td}>
                          {dirty && (
                            <button onClick={() => void salvar(f)} disabled={savingId === f.id}
                              className="px-2 py-1 rounded text-xs flex items-center gap-1"
                              style={{ background: GOLD, color: NAVY, fontWeight: 600 }}>
                              <Save size={11} /> {savingId === f.id ? "..." : "Salvar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, color: "#9A9282", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", background: "#020406", border: "1px solid #3A352A", color: "#E8E5DA", padding: "8px 10px", borderRadius: 4, fontSize: 13 };
const inpSm: React.CSSProperties = { background: "#020406", border: "1px solid #3A352A", color: "#E8E5DA", padding: "4px 6px", borderRadius: 3, fontSize: 12 };
const th: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "middle" };
