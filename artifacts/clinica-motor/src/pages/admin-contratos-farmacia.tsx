// PARMAVAULT-TSUNAMI Wave 5 · Frente A1
// /admin/contratos-farmacia — UI master-only pra Caio cadastrar
// pares UNIDADE x FARMACIA_PARMAVAULT manualmente (decisão Dr. Claude:
// vazia + cadastrar primeiro, semear depois).
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { RefreshCw, Plus, Power, Edit2, Save, X } from "lucide-react";

type Contrato = {
  id: number;
  unidade_id: number;
  unidade_nome: string;
  unidade_nick: string | null;
  farmacia_id: number;
  farmacia_nome: string;
  farmacia_cnpj: string;
  tipo_relacao: string;
  ativo: boolean;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  observacoes: string | null;
  criado_em: string;
};

type Options = {
  unidades: { id: number; nome: string; nick: string | null }[];
  farmacias: { id: number; nome_fantasia: string; cnpj: string }[];
  tipos_relacao: string[];
};

const NAVY = "#020406";
const GOLD = "#C89B3C";

export default function AdminContratosFarmacia() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [opts, setOpts] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [msg, setMsg] = useState("");

  // Form de criação
  const [showForm, setShowForm] = useState(false);
  const [fUnidade, setFUnidade] = useState("");
  const [fFarmacia, setFFarmacia] = useState("");
  const [fTipo, setFTipo] = useState("parceira");
  const [fInicio, setFInicio] = useState("");
  const [fFim, setFFim] = useState("");
  const [fObs, setFObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/contratos-farmacia?incluir_inativos=${incluirInativos}`, { credentials: "include" }),
        fetch(`/api/admin/contratos-farmacia/options`, { credentials: "include" }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (!r1.ok || !j1.ok) throw new Error(j1.error || "erro lista");
      if (!r2.ok || !j2.ok) throw new Error(j2.error || "erro options");
      setContratos(j1.contratos || []);
      setOpts({
        unidades: j2.unidades || [],
        farmacias: j2.farmacias || [],
        tipos_relacao: j2.tipos_relacao || ["parceira"],
      });
    } catch (e) {
      setMsg(`Erro ao carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [incluirInativos]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!fUnidade || !fFarmacia) {
      setMsg("Selecione unidade e farmácia.");
      return;
    }
    setSalvando(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/contratos-farmacia`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidade_id: Number(fUnidade),
          farmacia_id: Number(fFarmacia),
          tipo_relacao: fTipo,
          vigencia_inicio: fInicio || undefined,
          vigencia_fim: fFim || undefined,
          observacoes: fObs || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro criar");
      setMsg(`Contrato #${j.contrato.id} criado.`);
      setShowForm(false);
      setFUnidade(""); setFFarmacia(""); setFTipo("parceira");
      setFInicio(""); setFFim(""); setFObs("");
      await carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAtivo(c: Contrato) {
    setMsg("");
    try {
      const r = await fetch(`/api/admin/contratos-farmacia/${c.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !c.ativo }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`Contrato #${c.id} ${j.contrato.ativo ? "ativado" : "desativado"}.`);
      await carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    }
  }

  return (
    <Layout>
      <div style={{ background: NAVY, minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", color: "#E8E5DA" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, color: GOLD, margin: 0, fontFamily: "Georgia, serif" }}>
                Contratos UNIDADE × FARMÁCIA PARMAVAULT
              </h1>
              <p style={{ marginTop: 6, color: "#9A9282", fontSize: 14 }}>
                Wave 5 frente A · cadastre os pares vigentes pra habilitar validação CNPJ na emissão.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIncluirInativos((v) => !v)}
                className="px-3 py-2 rounded border text-sm"
                style={{ borderColor: "#3A352A", background: "transparent", color: "#E8E5DA" }}
              >
                {incluirInativos ? "Ocultar inativos" : "Mostrar inativos"}
              </button>
              <button
                onClick={() => void carregar()}
                className="px-3 py-2 rounded border text-sm flex items-center gap-2"
                style={{ borderColor: "#3A352A", background: "transparent", color: "#E8E5DA" }}
              >
                <RefreshCw size={14} /> Atualizar
              </button>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="px-4 py-2 rounded text-sm flex items-center gap-2 font-semibold"
                style={{ background: GOLD, color: NAVY }}
              >
                <Plus size={16} /> {showForm ? "Cancelar" : "Novo contrato"}
              </button>
            </div>
          </div>

          {msg && (
            <div style={{ background: "#1a1610", border: `1px solid ${GOLD}`, padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              {msg}
            </div>
          )}

          {showForm && opts && (
            <div style={{ background: "#0a0d12", border: `1px solid #3A352A`, padding: 20, borderRadius: 8, marginBottom: 24 }}>
              <h2 style={{ color: GOLD, fontSize: 16, marginTop: 0, marginBottom: 16 }}>Cadastrar novo contrato</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Unidade *</label>
                  <select value={fUnidade} onChange={(e) => setFUnidade(e.target.value)} style={selStyle}>
                    <option value="">— selecione —</option>
                    {opts.unidades.map((u) => (
                      <option key={u.id} value={u.id}>{u.nick || u.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Farmácia Parmavault *</label>
                  <select value={fFarmacia} onChange={(e) => setFFarmacia(e.target.value)} style={selStyle}>
                    <option value="">— selecione —</option>
                    {opts.farmacias.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome_fantasia} ({f.cnpj})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Tipo de relação</label>
                  <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={selStyle}>
                    {opts.tipos_relacao.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div></div>
                <div>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Vigência início</label>
                  <input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} style={selStyle} placeholder="hoje" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Vigência fim (vazio = sem fim)</label>
                  <input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} style={selStyle} />
                </div>
                <div style={{ gridColumn: "1 / 3" }}>
                  <label style={{ fontSize: 12, color: "#9A9282", display: "block", marginBottom: 4 }}>Observações</label>
                  <textarea value={fObs} onChange={(e) => setFObs(e.target.value)} rows={2} style={{ ...selStyle, resize: "vertical" }} />
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded text-sm flex items-center gap-2"
                        style={{ background: "transparent", border: "1px solid #3A352A", color: "#E8E5DA" }}>
                  <X size={14} /> Cancelar
                </button>
                <button onClick={() => void criar()} disabled={salvando} className="px-4 py-2 rounded text-sm flex items-center gap-2 font-semibold"
                        style={{ background: GOLD, color: NAVY, opacity: salvando ? 0.6 : 1 }}>
                  <Save size={14} /> {salvando ? "Salvando..." : "Salvar contrato"}
                </button>
              </div>
            </div>
          )}

          <div style={{ background: "#0a0d12", border: "1px solid #2a2418", borderRadius: 8, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9A9282" }}>Carregando...</div>
            ) : contratos.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9A9282" }}>
                Nenhum contrato cadastrado{incluirInativos ? "" : " ativo"}. Use o botão "Novo contrato" pra começar.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ background: "#1a1610", color: GOLD }}>
                  <tr>
                    <th style={th}>Unidade</th>
                    <th style={th}>Farmácia</th>
                    <th style={th}>CNPJ</th>
                    <th style={th}>Tipo</th>
                    <th style={th}>Vigência</th>
                    <th style={th}>Status</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #2a2418", opacity: c.ativo ? 1 : 0.5 }}>
                      <td style={td}>{c.unidade_nick || c.unidade_nome}</td>
                      <td style={td}>{c.farmacia_nome}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{c.farmacia_cnpj}</td>
                      <td style={td}>{c.tipo_relacao}</td>
                      <td style={td}>
                        {c.vigencia_inicio?.slice(0, 10)} → {c.vigencia_fim ? c.vigencia_fim.slice(0, 10) : "∞"}
                      </td>
                      <td style={td}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11,
                          background: c.ativo ? "rgba(50,180,90,0.15)" : "rgba(180,50,50,0.15)",
                          color: c.ativo ? "#7adb9a" : "#dba0a0",
                          border: c.ativo ? "1px solid rgba(50,180,90,0.4)" : "1px solid rgba(180,50,50,0.4)" }}>
                          {c.ativo ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => void toggleAtivo(c)}
                                className="px-2 py-1 rounded text-xs flex items-center gap-1"
                                style={{ background: "transparent", border: "1px solid #3A352A", color: "#E8E5DA" }}>
                          <Power size={12} /> {c.ativo ? "Desativar" : "Reativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const selStyle: React.CSSProperties = {
  width: "100%",
  background: "#020406",
  border: "1px solid #3A352A",
  color: "#E8E5DA",
  padding: "8px 10px",
  borderRadius: 4,
  fontSize: 13,
};
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px" };
