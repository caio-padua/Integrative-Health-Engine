// Admin — Metas de Faturamento por unidade (PAWARDS).
// Rota: /admin/metas-faturamento
// Lista clínicas com fat_minimo / fat_meta / fat_maximo / % comissão magistral
// editáveis em linha. Salva via PATCH /painel-pawards/metas-faturamento/:id
// (backend aceita PATCH e PUT, mesmo handler).

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PAWARDS, fmtBRL } from "@/lib/pawards-tokens";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "/api";

interface Unidade {
  id: number;
  nome: string;
  nick?: string | null;
  slug?: string | null;
  fat_minimo_mensal: string | number | null;
  fat_maximo_mensal: string | number | null;
  fat_meta_mensal: string | number | null;
  percentual_comissao_magistral: string | number | null;
}

type EditableField =
  | "fat_minimo_mensal"
  | "fat_maximo_mensal"
  | "fat_meta_mensal"
  | "percentual_comissao_magistral";

type EditMap = Record<number, Partial<Record<EditableField, string>>>;

interface MetasPatchBody {
  fat_minimo_mensal?: number | null;
  fat_maximo_mensal?: number | null;
  fat_meta_mensal?: number | null;
  percentual_comissao_magistral?: number | null;
}

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

const FIELDS: { k: EditableField; label: string }[] = [
  { k: "fat_minimo_mensal", label: "MÍNIMO (R$)" },
  { k: "fat_meta_mensal", label: "META (R$)" },
  { k: "fat_maximo_mensal", label: "MÁXIMO (R$)" },
  { k: "percentual_comissao_magistral", label: "% COMISSÃO MAG." },
];

export default function MetasFaturamentoAdmin() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditMap>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await api<Unidade[]>("/unidades");
      setUnidades(data);
      setEdit({});
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const total = useMemo(() => {
    return unidades.reduce(
      (acc, u) => {
        acc.meta += Number(u.fat_meta_mensal ?? 0);
        acc.min += Number(u.fat_minimo_mensal ?? 0);
        acc.max += Number(u.fat_maximo_mensal ?? 0);
        return acc;
      },
      { meta: 0, min: 0, max: 0 }
    );
  }, [unidades]);

  const setField = (id: number, k: EditableField, value: string) => {
    setEdit((prev) => ({ ...prev, [id]: { ...prev[id], [k]: value } }));
  };

  const valueFor = (u: Unidade, k: EditableField): string => {
    const e = edit[u.id]?.[k];
    if (e !== undefined) return e;
    const v = u[k];
    return v === null || v === undefined ? "" : String(v);
  };

  const dirty = (id: number) => !!edit[id] && Object.keys(edit[id]).length > 0;

  const salvar = async (u: Unidade) => {
    setSaving(u.id); setMsg(null); setError(null);
    try {
      const e = edit[u.id] ?? {};
      const body: MetasPatchBody = {};
      for (const { k } of FIELDS) {
        const raw = e[k];
        if (raw !== undefined) {
          body[k] = raw === "" ? null : Number(raw);
        }
      }
      const updated = await api<Unidade>(`/painel-pawards/metas-faturamento/${u.id}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      setEdit((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      setMsg(`Salvo: ${u.nick || u.nome}`);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(null); }
  };

  const lista = unidades.filter((u) => {
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return (u.nome || "").toLowerCase().includes(f) || (u.nick || "").toLowerCase().includes(f);
  });

  return (
    <div style={{ background: PAWARDS.colors.bg[950], minHeight: "100vh", color: PAWARDS.colors.text.primary, padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: PAWARDS.colors.gold[300] }}>PAWARDS · ADMIN</div>
          <h1 style={{ fontSize: 26, margin: "4px 0 0", letterSpacing: 1 }}>METAS DE FATURAMENTO</h1>
          <div style={{ fontSize: 12, color: PAWARDS.colors.text.tertiary, marginTop: 4 }}>
            Mínimo · Meta · Máximo mensal e % de comissão magistral por clínica.
          </div>
        </div>
        <input
          placeholder="Filtrar clínica..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={searchStyle}
        />
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <Totalizer label="META TOTAL/MÊS" value={fmtBRL(total.meta)} />
        <Totalizer label="MÍNIMO TOTAL/MÊS" value={fmtBRL(total.min)} />
        <Totalizer label="MÁXIMO TOTAL/MÊS" value={fmtBRL(total.max)} />
      </div>

      {error && <Banner kind="error">{error}</Banner>}
      {msg && <Banner kind="ok">{msg}</Banner>}
      {loading && <div style={{ color: PAWARDS.colors.text.tertiary }}>Carregando...</div>}

      <div style={panelStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: PAWARDS.colors.text.tertiary, fontSize: 10, letterSpacing: 1.5, textAlign: "left" }}>
              <th style={th}>CLÍNICA</th>
              {FIELDS.map((f) => <th key={f.k} style={{ ...th, textAlign: "right" }}>{f.label}</th>)}
              <th style={{ ...th, textAlign: "right" }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={td}>
                  <div style={{ color: PAWARDS.colors.text.primary }}>{u.nick || u.nome}</div>
                  <div style={{ fontSize: 10, color: PAWARDS.colors.text.muted, marginTop: 2 }}>#{u.id} · {u.slug ?? "—"}</div>
                </td>
                {FIELDS.map((f) => (
                  <td key={f.k} style={{ ...td, textAlign: "right" }}>
                    <input
                      type="number"
                      step="any"
                      value={valueFor(u, f.k)}
                      onChange={(ev) => setField(u.id, f.k, ev.target.value)}
                      style={cellInputStyle}
                    />
                  </td>
                ))}
                <td style={{ ...td, textAlign: "right" }}>
                  <button
                    onClick={() => salvar(u)}
                    disabled={!dirty(u.id) || saving === u.id}
                    style={btnPrimary(dirty(u.id) && saving !== u.id)}
                  >
                    {saving === u.id ? "..." : "Salvar"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && lista.length === 0 && (
              <tr><td colSpan={FIELDS.length + 2} style={{ ...td, color: PAWARDS.colors.text.muted, textAlign: "center", padding: 24 }}>Nenhuma clínica encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const searchStyle: CSSProperties = {
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
  width: 140,
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

function Totalizer({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: PAWARDS.colors.bg.panel,
      borderRadius: PAWARDS.radii.panelSm,
      border: `1px solid rgba(200,155,60,0.10)`,
      padding: "12px 16px",
      boxShadow: PAWARDS.shadows.panel,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: PAWARDS.colors.text.tertiary }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: PAWARDS.colors.gold[300], marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

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
