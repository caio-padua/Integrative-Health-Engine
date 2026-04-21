// Admin — Parâmetros de Referência (PAWARDS).
// Rota: /admin/parametros-referencia
// Tabela editável dos KPIs (financeiro, clínico, exames). Override por unidade
// ou edição global; botão "voltar pro global" remove o override.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PAWARDS } from "@/lib/pawards-tokens";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "/api";

interface Parametro {
  codigo: string;
  label: string;
  tipo: string;
  periodo: string | null;
  unidade_medida: string | null;
  observacao: string | null;
  faixa_critica_max: string | number | null;
  faixa_baixa_max: string | number | null;
  faixa_media_max: string | number | null;
  faixa_superior_max: string | number | null;
  sobrescrito_unidade: boolean;
  sobrescrito_em: string | null;
}

interface Unidade { id: number; nome: string; nick?: string | null }

type FaixaKey = "faixa_critica_max" | "faixa_baixa_max" | "faixa_media_max" | "faixa_superior_max";

interface ParametroPutBody {
  faixa_critica_max: number | null;
  faixa_baixa_max: number | null;
  faixa_media_max: number | null;
  faixa_superior_max: number | null;
  observacao?: string | null;
}

type EditEntry = Partial<Record<FaixaKey | "observacao", string>>;

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("padcon_admin_token") : null;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h["x-admin-token"] = t;
  return h;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: authHeaders(), ...init });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body}`);
  }
  return res.json() as Promise<T>;
}

const TIPO_LABEL: Record<string, string> = {
  financeiro: "FINANCEIRO",
  clinico: "CLÍNICO",
  exame: "EXAMES",
  exames: "EXAMES",
  operacional: "OPERACIONAL",
};

const FAIXAS: FaixaKey[] = ["faixa_critica_max", "faixa_baixa_max", "faixa_media_max", "faixa_superior_max"];

export default function ParametrosReferenciaAdmin() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditEntry>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = unidadeId ? `?unidade_id=${unidadeId}` : "";
      const data = await api<Parametro[]>(`/painel-pawards/parametros-referencia${qs}`);
      setParametros(data);
      setEditing({});
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api<Unidade[]>("/unidades").then(setUnidades).catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [unidadeId]);

  const grupos = useMemo(() => {
    const map: Record<string, Parametro[]> = {};
    for (const p of parametros) {
      const k = p.tipo || "outros";
      (map[k] ||= []).push(p);
    }
    return map;
  }, [parametros]);

  const setField = (codigo: string, field: FaixaKey | "observacao", value: string) => {
    setEditing((prev) => ({ ...prev, [codigo]: { ...prev[codigo], [field]: value } }));
  };

  const valueFor = (p: Parametro, field: FaixaKey): string => {
    const e = editing[p.codigo]?.[field];
    if (e !== undefined) return e;
    const v = p[field];
    return v === null || v === undefined ? "" : String(v);
  };

  const dirty = (codigo: string) => !!editing[codigo] && Object.keys(editing[codigo]).length > 0;

  const salvar = async (p: Parametro) => {
    setSaving(p.codigo); setMsg(null); setError(null);
    try {
      const e = editing[p.codigo] ?? {};
      const body: ParametroPutBody = {
        faixa_critica_max: null,
        faixa_baixa_max: null,
        faixa_media_max: null,
        faixa_superior_max: null,
      };
      for (const k of FAIXAS) {
        const raw = e[k] ?? (p[k] === null || p[k] === undefined ? "" : String(p[k]));
        body[k] = raw === "" ? null : Number(raw);
      }
      if (e.observacao !== undefined) body.observacao = e.observacao;
      const qs = unidadeId ? `?unidade_id=${unidadeId}` : "";
      await api(`/painel-pawards/parametros-referencia/${encodeURIComponent(p.codigo)}${qs}`, {
        method: "PUT", body: JSON.stringify(body),
      });
      setMsg(`Salvo: ${p.label} (${unidadeId ? "override de unidade" : "global"})`);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(null); }
  };

  const voltarGlobal = async (p: Parametro) => {
    if (!unidadeId) return;
    if (!confirm(`Remover override de "${p.label}" e voltar pro valor global?`)) return;
    setSaving(p.codigo); setMsg(null); setError(null);
    try {
      await api(`/painel-pawards/parametros-referencia/${encodeURIComponent(p.codigo)}/unidade/${unidadeId}`, {
        method: "DELETE",
      });
      setMsg(`Override removido: ${p.label}`);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(null); }
  };

  return (
    <div style={{ background: PAWARDS.colors.bg[950], minHeight: "100vh", color: PAWARDS.colors.text.primary, padding: 24 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: PAWARDS.colors.gold[300] }}>PAWARDS · ADMIN</div>
          <h1 style={{ fontSize: 26, margin: "4px 0 0", letterSpacing: 1 }}>PARÂMETROS DE REFERÊNCIA</h1>
          <div style={{ fontSize: 12, color: PAWARDS.colors.text.tertiary, marginTop: 4 }}>
            Faixas (crítica · inferior · média · superior) usadas pelos KPIs do painel.
            {unidadeId
              ? " Edição cria override só pra unidade selecionada."
              : " Edição altera o valor global (master)."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, letterSpacing: 1 }}>ESCOPO</label>
          <select
            value={unidadeId ?? ""}
            onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : null)}
            style={inputStyle}
          >
            <option value="">— GLOBAL (todas as unidades) —</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nick || u.nome}</option>
            ))}
          </select>
        </div>
      </header>

      {error && <Banner kind="error">{error}</Banner>}
      {msg && <Banner kind="ok">{msg}</Banner>}
      {loading && <div style={{ color: PAWARDS.colors.text.tertiary }}>Carregando...</div>}

      {Object.entries(grupos).map(([tipo, lista]) => (
        <section key={tipo} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, letterSpacing: 3, color: PAWARDS.colors.gold[300], margin: "0 0 8px" }}>
            {TIPO_LABEL[tipo] ?? tipo.toUpperCase()}
          </h2>
          <div style={panelStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: PAWARDS.colors.text.tertiary, fontSize: 10, letterSpacing: 1.5, textAlign: "left" }}>
                  <th style={th}>KPI</th>
                  <th style={th}>UNIDADE</th>
                  <th style={th}>PERÍODO</th>
                  <th style={{ ...th, textAlign: "right" }}>CRÍTICA ≤</th>
                  <th style={{ ...th, textAlign: "right" }}>INFERIOR ≤</th>
                  <th style={{ ...th, textAlign: "right" }}>MÉDIA ≤</th>
                  <th style={{ ...th, textAlign: "right" }}>SUPERIOR ≤</th>
                  <th style={th}>ESCOPO</th>
                  <th style={{ ...th, textAlign: "right" }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.codigo} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={td}>
                      <div style={{ color: PAWARDS.colors.text.primary }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: PAWARDS.colors.text.muted, marginTop: 2 }}>{p.codigo}</div>
                    </td>
                    <td style={{ ...td, color: PAWARDS.colors.text.secondary }}>{p.unidade_medida ?? "—"}</td>
                    <td style={{ ...td, color: PAWARDS.colors.text.secondary }}>{p.periodo ?? "—"}</td>
                    {FAIXAS.map((k) => (
                      <td key={k} style={{ ...td, textAlign: "right" }}>
                        <input
                          type="number"
                          step="any"
                          value={valueFor(p, k)}
                          onChange={(ev) => setField(p.codigo, k, ev.target.value)}
                          style={cellInputStyle}
                        />
                      </td>
                    ))}
                    <td style={td}>
                      {p.sobrescrito_unidade ? (
                        <span style={badge("override")}>OVERRIDE</span>
                      ) : (
                        <span style={badge("global")}>GLOBAL</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => salvar(p)}
                        disabled={!dirty(p.codigo) || saving === p.codigo}
                        style={btnPrimary(dirty(p.codigo) && saving !== p.codigo)}
                      >
                        {saving === p.codigo ? "..." : unidadeId ? "Salvar override" : "Salvar global"}
                      </button>
                      {unidadeId && p.sobrescrito_unidade && (
                        <button
                          onClick={() => voltarGlobal(p)}
                          disabled={saving === p.codigo}
                          style={{ ...btnSecondary, marginLeft: 8 }}
                        >
                          Voltar pro global
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr><td colSpan={9} style={{ ...td, color: PAWARDS.colors.text.muted, textAlign: "center", padding: 24 }}>Nenhum parâmetro nesse grupo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: PAWARDS.colors.bg[850],
  color: PAWARDS.colors.text.primary,
  border: `1px solid ${PAWARDS.colors.gold[700]}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  minWidth: 240,
};

const cellInputStyle: CSSProperties = {
  background: PAWARDS.colors.bg[900],
  color: PAWARDS.colors.text.primary,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: 110,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const panelStyle: CSSProperties = {
  background: PAWARDS.colors.bg.panel,
  borderRadius: PAWARDS.radii.panel,
  boxShadow: PAWARDS.shadows.panel,
  border: `1px solid rgba(200,155,60,0.10)`,
  padding: 16,
  overflowX: "auto",
};

const th: CSSProperties = { padding: "6px 10px", fontWeight: 600 };
const td: CSSProperties = { padding: "10px", verticalAlign: "middle" };

const btnPrimary = (active: boolean): CSSProperties => ({
  background: active ? PAWARDS.colors.gold[500] : "rgba(200,155,60,0.18)",
  color: active ? PAWARDS.colors.bg[950] : PAWARDS.colors.text.tertiary,
  border: `1px solid ${PAWARDS.colors.gold[700]}`,
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: active ? "pointer" : "not-allowed",
  letterSpacing: 0.5,
});

const btnSecondary: CSSProperties = {
  background: "transparent",
  color: PAWARDS.colors.text.secondary,
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const badge = (kind: "override" | "global"): CSSProperties => ({
  display: "inline-block",
  fontSize: 10,
  letterSpacing: 1.5,
  padding: "3px 8px",
  borderRadius: 999,
  background: kind === "override" ? "rgba(200,155,60,0.16)" : "rgba(255,255,255,0.05)",
  color: kind === "override" ? PAWARDS.colors.gold[300] : PAWARDS.colors.text.tertiary,
  border: `1px solid ${kind === "override" ? PAWARDS.colors.gold[700] : "rgba(255,255,255,0.08)"}`,
});

function Banner({ kind, children }: { kind: "ok" | "error"; children: ReactNode }) {
  const isOk = kind === "ok";
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
      background: isOk ? "rgba(52,199,89,0.10)" : "rgba(255,59,48,0.10)",
      border: `1px solid ${isOk ? "rgba(52,199,89,0.4)" : "rgba(255,59,48,0.4)"}`,
      color: isOk ? PAWARDS.colors.status.good : PAWARDS.colors.status.critical,
    }}>{children}</div>
  );
}
