import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronDown, ChevronRight, Syringe, Droplets, CircleDot, FlaskConical, Stethoscope, Brain, Microscope, Pencil, X, Trash2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia e na Governanca). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO } from "../craniotomia-shared";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

async function catFetch(url: string): Promise<any[]> {
  try {
    const res = await apiFetch(url);
    const j = await res.json();
    if (!Array.isArray(j)) {
      console.warn("[catFetch] resposta não-array:", url, j);
      return [];
    }
    return j;
  } catch (err) {
    console.error("[catFetch] erro:", url, err);
    return [];
  }
}

async function apiPut(url: string, data: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || `Erro ${res.status}` }; }
    return { ok: true };
  } catch { return { ok: false, error: "Erro de conexao" }; }
}

async function apiPost(url: string, data: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || `Erro ${res.status}` }; }
    return { ok: true };
  } catch { return { ok: false, error: "Erro de conexao" }; }
}

async function apiDelete(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || `Erro ${res.status}` }; }
    return { ok: true };
  } catch { return { ok: false, error: "Erro de conexao" }; }
}

type TabKey = "injetaveis" | "endovenosos" | "implantes" | "formulas" | "protocolos" | "exames" | "doencas";

const TABS: { key: TabKey; label: string; icon: typeof Syringe }[] = [
  { key: "injetaveis", label: "Injetaveis IM", icon: Syringe },
  { key: "endovenosos", label: "Endovenosos", icon: Droplets },
  { key: "implantes", label: "Implantes", icon: CircleDot },
  { key: "formulas", label: "Formulas", icon: FlaskConical },
  { key: "protocolos", label: "Protocolos", icon: Stethoscope },
  { key: "exames", label: "Exames", icon: Microscope },
  { key: "doencas", label: "Doencas", icon: Brain },
];

// ── CSS PENUMBRA: hover "luz por tras", reveal de pincel, foco neon ──────────
const CAT_CSS = `
@keyframes catSpin { to { transform: rotate(360deg); } }
.cat-acc { transition: border-color .25s, box-shadow .25s; }
.cat-acc:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.cat-head { transition: background .15s; cursor: pointer; }
.cat-head:hover { background: ${PW.bg3}; }
.cat-row { transition: background .15s; }
.cat-row:hover { background: ${PW.bg3}; }
.cat-card { transition: border-color .25s, box-shadow .25s; }
.cat-card:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 30px -12px ${PW.cianoGlow}; }
.cat-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.cat-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.cat-btn:disabled { opacity: .45; cursor: not-allowed; }
.cat-icon-btn { transition: opacity .15s, border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.cat-icon-btn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 14px -6px ${PW.cianoGlow}; }
.cat-input { transition: border-color .2s, box-shadow .2s; }
.cat-input:focus { border-color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; outline: none; }
.cat-tab { transition: color .2s, border-color .2s; cursor: pointer; }
.cat-tab:hover { color: ${PW.text}; }
.cat-pencil { opacity: 0; }
.cat-rowgroup:hover .cat-pencil { opacity: 1; }
`;

// ── Estilos compartilhados ──────────────────────────────────────────────────
const accStyle: CSSProperties = {
  background: PW.bg2,
  border: `1px solid ${PW.border}`,
  borderLeft: `3px solid ${PW.ciano}`,
  borderRadius: 0,
};
const headBtnStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  borderRadius: 0,
  color: PW.text,
  fontFamily: MONO,
  textAlign: "left",
};
const iconBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 4,
  background: "transparent",
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.muted,
};
const thStyle: CSSProperties = {
  padding: "8px 16px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: PW.muted,
  textAlign: "left",
  fontFamily: MONO,
};
const tdStyle: CSSProperties = {
  padding: "10px 16px",
  fontSize: 13,
  color: PW.text,
  fontFamily: MONO,
};

function Chip({ children, variant = "outline" }: { children: ReactNode; variant?: "outline" | "secondary" | "default" | "destructive" }) {
  const map = {
    outline: { bg: "transparent", color: PW.t2, border: PW.border },
    secondary: { bg: PW.bg3, color: PW.t2, border: PW.border },
    default: { bg: "rgba(95,230,204,0.12)", color: PW.ciano, border: PW.ciano },
    destructive: { bg: "rgba(208,138,138,0.12)", color: PW.danger, border: PW.danger },
  }[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: map.color,
        border: `1px solid ${map.border}`,
        background: map.bg,
        borderRadius: 0,
        fontFamily: MONO,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "destructive";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const map = {
    primary: { bg: "rgba(95,230,204,0.12)", color: PW.ciano, border: PW.ciano },
    outline: { bg: PW.bg2, color: PW.t2, border: PW.border },
    destructive: { bg: "rgba(208,138,138,0.12)", color: PW.danger, border: PW.danger },
  }[variant];
  return (
    <button
      className="cat-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 14px",
        background: map.bg,
        border: `1px solid ${map.border}`,
        borderRadius: 0,
        color: map.color,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: MONO,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: PW.muted }} />
      <input
        className="cat-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: PW.bg3,
          border: `1px solid ${PW.border}`,
          borderRadius: 0,
          color: PW.text,
          padding: "9px 12px 9px 34px",
          fontSize: 13,
          fontFamily: MONO,
          outline: "none",
        }}
      />
    </div>
  );
}

function PencilBtn({ onClick, reveal = false }: { onClick: (e: any) => void; reveal?: boolean }) {
  return (
    <button onClick={onClick} className={`cat-icon-btn${reveal ? " cat-pencil" : ""}`} style={iconBtnStyle}>
      <Pencil style={{ width: 13, height: 13 }} />
    </button>
  );
}

function Carregando() {
  return <div style={{ textAlign: "center", padding: "32px 0", color: PW.muted, fontSize: 13, fontFamily: MONO }}>Carregando...</div>;
}

function EditModal({ item, fields, onClose, onSave, onDelete, title }: {
  item: any;
  fields: { key: string; label: string; type?: string; options?: string[] }[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
  title: string;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const f: Record<string, any> = {};
    fields.forEach(field => { f[field.key] = item[field.key] ?? ""; });
    return f;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const fieldInputStyle: CSSProperties = {
    width: "100%",
    background: PW.bg3,
    border: `1px solid ${PW.border}`,
    borderRadius: 0,
    padding: "8px 10px",
    fontSize: 12,
    color: PW.text,
    fontFamily: MONO,
    outline: "none",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(2,10,20,0.80)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderTop: `3px solid ${PW.ciano}`, borderRadius: 0, width: "100%", maxWidth: 672, maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PW.t2, margin: 0, fontFamily: MONO }}>{title}</h3>
          <button onClick={onClose} className="cat-icon-btn" style={iconBtnStyle}><X style={{ width: 14, height: 14 }} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16 }}>
          {fields.map(field => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: field.type === "textarea" ? "span 2" : undefined }}>
              <label style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: PW.muted, fontFamily: MONO }}>{field.label}</label>
              {field.type === "textarea" ? (
                <textarea className="cat-input" value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  rows={2} style={{ ...fieldInputStyle, resize: "none" }} />
              ) : field.options ? (
                <select className="cat-input" value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  style={fieldInputStyle}>
                  {field.options.map(o => <option key={o} value={o} style={{ background: PW.bg2, color: PW.text }}>{o}</option>)}
                </select>
              ) : (
                <input className="cat-input" type={field.type || "text"} value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  style={fieldInputStyle} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, padding: 16, borderTop: `1px solid ${PW.border}` }}>
          <Btn variant="primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? "Salvando..." : "Salvar Alteracoes"}</Btn>
          <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
          {onDelete && (
            <Btn variant="destructive" onClick={onDelete}><Trash2 style={{ width: 13, height: 13 }} /> Excluir</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function InjetaveisTab() {
  const [search, setSearch] = useState("");
  const [expandedEixo, setExpandedEixo] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-injetaveis"],
    queryFn: () => catFetch(`/api/catalogo/injetaveis`),
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeExibicao?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixoIntegrativo?.toLowerCase().includes(search.toLowerCase()) ||
    i.palavraChaveMotor?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((i: any) => { const eixo = i.eixoIntegrativo || "SEM EIXO"; if (!grouped[eixo]) grouped[eixo] = []; grouped[eixo].push(i); });

  const INJ_FIELDS = [
    { key: "codigoPadcom", label: "Codigo Pawards" },
    { key: "nomeExibicao", label: "Nome Exibicao" },
    { key: "nomeAmpola", label: "Nome Ampola" },
    { key: "substanciaBase", label: "Substancia Base" },
    { key: "dosagem", label: "Dosagem" },
    { key: "volume", label: "Volume" },
    { key: "via", label: "Via", options: ["IM", "SC", "EV", "ID"] },
    { key: "valorUnidade", label: "Valor Unitario" },
    { key: "classificacao", label: "Classificacao" },
    { key: "eixoIntegrativo", label: "Eixo Integrativo" },
    { key: "palavraChaveMotor", label: "Palavra-Chave Motor" },
    { key: "statusCadastro", label: "Status", options: ["ATIVO", "INATIVO", "PENDENTE"] },
    { key: "observacao", label: "Observacao", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/injetaveis/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/injetaveis`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] }); toast({ title: "Injetavel criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este injetavel?")) return;
    const r = await apiDelete(`/api/catalogo/injetaveis/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar por codigo, nome, eixo ou palavra-chave..." value={search} onChange={setSearch} />
        <Chip variant="outline">{filtered.length} itens</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Novo Injetavel</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([eixo, items]) => (
          <div key={eixo} className="cat-acc" style={accStyle}>
            <button onClick={() => setExpandedEixo(expandedEixo === eixo ? null : eixo)} className="cat-head" style={headBtnStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {expandedEixo === eixo ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.text }}>{eixo}</span>
                <Chip variant="secondary">{items.length}</Chip>
              </div>
            </button>
            {expandedEixo === eixo && (
              <div style={{ borderTop: `1px solid ${PW.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: PW.bg3 }}>
                    <th style={thStyle}>Codigo</th>
                    <th style={thStyle}>Nome</th>
                    <th style={thStyle}>Dosagem</th>
                    <th style={thStyle}>Via</th>
                    <th style={thStyle}>Valor</th>
                    <th style={thStyle}>Motor</th>
                    <th style={{ ...thStyle, width: 32 }}></th>
                  </tr></thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="cat-row cat-rowgroup" style={{ borderTop: `1px solid ${PW.border}` }}>
                        <td style={{ ...tdStyle, fontSize: 12, color: PW.ciano }}>{item.codigoPadcom}</td>
                        <td style={{ ...tdStyle, color: PW.text }}>{item.nomeExibicao}</td>
                        <td style={{ ...tdStyle, color: PW.t2 }}>{item.dosagem} {item.volume ? `/ ${item.volume}` : ""}</td>
                        <td style={tdStyle}><Chip variant="outline">{item.via}</Chip></td>
                        <td style={{ ...tdStyle, color: PW.t2 }}>{item.valorUnidade}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: PW.muted }}>{item.palavraChaveMotor}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <PencilBtn reveal onClick={() => setEditing(item)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Injetavel IM" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} fields={INJ_FIELDS} />
      )}
      {creating && (
        <EditModal item={{statusCadastro: "ATIVO", via: "IM"}} title="Novo Injetavel IM" onClose={() => setCreating(false)} onSave={handleCreate} fields={INJ_FIELDS} />
      )}
    </div>
  );
}

function EndovenososTab() {
  const [search, setSearch] = useState("");
  const [expandedSoro, setExpandedSoro] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-endovenosos"],
    queryFn: () => catFetch(`/api/catalogo/endovenosos`),
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeSoro?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixoIntegrativo?.toLowerCase().includes(search.toLowerCase())
  );

  const soros: Record<string, { principal: any; componentes: any[] }> = {};
  filtered.forEach((i: any) => {
    if (i.tipoLinha === "SORO") {
      if (!soros[i.codigoPadcom]) soros[i.codigoPadcom] = { principal: i, componentes: [] };
      else soros[i.codigoPadcom].principal = i;
    } else if (i.tipoLinha === "COMPONENTE") {
      if (!soros[i.codigoPadcom]) soros[i.codigoPadcom] = { principal: null, componentes: [] };
      soros[i.codigoPadcom].componentes.push(i);
    }
  });

  const ENDO_FIELDS = [
    { key: "codigoPadcom", label: "Codigo Pawards" },
    { key: "nomeExibicao", label: "Nome Exibicao" },
    { key: "nomeSoro", label: "Nome Soro" },
    { key: "substanciaBase", label: "Substancia Base" },
    { key: "dosagem", label: "Dosagem" },
    { key: "volume", label: "Volume" },
    { key: "via", label: "Via" },
    { key: "valorUnidade", label: "Valor Unitario" },
    { key: "frequenciaPadrao", label: "Frequencia Padrao" },
    { key: "tipoLinha", label: "Tipo Linha", options: ["SORO", "COMPONENTE"] },
    { key: "eixoIntegrativo", label: "Eixo Integrativo" },
    { key: "palavraChaveMotor", label: "Palavra-Chave Motor" },
    { key: "statusCadastro", label: "Status", options: ["ATIVO", "INATIVO", "PENDENTE"] },
    { key: "observacao", label: "Observacao", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/endovenosos/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/endovenosos`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] }); toast({ title: "Endovenoso criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este endovenoso?")) return;
    const r = await apiDelete(`/api/catalogo/endovenosos/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar soro por codigo, nome ou eixo..." value={search} onChange={setSearch} />
        <Chip variant="outline">{Object.keys(soros).length} soros</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Novo Endovenoso</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(soros).map(([codigo, { principal, componentes }]) => (
          <div key={codigo} className="cat-acc" style={accStyle}>
            <button onClick={() => setExpandedSoro(expandedSoro === codigo ? null : codigo)} className="cat-head cat-rowgroup" style={headBtnStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  {expandedSoro === codigo ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
                  <span style={{ fontSize: 12, color: PW.ciano, fontFamily: MONO }}>{codigo}</span>
                  <Chip variant="secondary">{principal?.eixoIntegrativo}</Chip>
                </div>
                <div style={{ marginLeft: 28, fontWeight: 700, color: PW.text }}>{principal?.nomeSoro || componentes[0]?.nomeSoro}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{principal?.valorUnidade}</div>
                  <div style={{ fontSize: 11, color: PW.muted }}>{principal?.frequenciaPadrao}</div>
                </div>
                {principal && (
                  <PencilBtn reveal onClick={(e: any) => { e.stopPropagation(); setEditing(principal); }} />
                )}
              </div>
            </button>
            {expandedSoro === codigo && componentes.length > 0 && (
              <div style={{ borderTop: `1px solid ${PW.border}`, background: PW.bg, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: PW.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO }}>Composicao</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {componentes.map((c: any) => (
                    <div key={c.id} className="cat-rowgroup" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, paddingLeft: 16, borderLeft: `2px solid ${PW.border}`, color: PW.text }}>
                      <span>{c.nomeExibicao} — <span style={{ color: PW.muted }}>{c.dosagem}</span></span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: PW.muted }}>{c.valorUnidade}</span>
                        <PencilBtn reveal onClick={() => setEditing(c)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Endovenoso" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} fields={ENDO_FIELDS} />
      )}
      {creating && (
        <EditModal item={{statusCadastro: "ATIVO", tipoLinha: "SORO", via: "EV"}} title="Novo Endovenoso" onClose={() => setCreating(false)} onSave={handleCreate} fields={ENDO_FIELDS} />
      )}
    </div>
  );
}

function ImplantesTab() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-implantes"],
    queryFn: () => catFetch(`/api/catalogo/implantes`),
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeImplante?.toLowerCase().includes(search.toLowerCase()) ||
    i.substanciaAtiva?.toLowerCase().includes(search.toLowerCase()) ||
    i.indicacao?.toLowerCase().includes(search.toLowerCase())
  );

  const IMPL_FIELDS = [
    { key: "codigoPadcom", label: "Codigo Pawards" },
    { key: "nomeImplante", label: "Nome Implante" },
    { key: "substanciaAtiva", label: "Substancia Ativa" },
    { key: "dosagem", label: "Dosagem" },
    { key: "unidade", label: "Unidade" },
    { key: "via", label: "Via" },
    { key: "trocarte", label: "Trocarte" },
    { key: "liberacaoDiaria", label: "Liberacao Diaria" },
    { key: "doseRecomendada", label: "Dose Recomendada" },
    { key: "tempoAcao", label: "Tempo Acao" },
    { key: "valorUnidade", label: "Valor Unitario" },
    { key: "origemValor", label: "Origem Valor" },
    { key: "indicacao", label: "Indicacao", type: "textarea" },
    { key: "statusCadastro", label: "Status", options: ["ATIVO", "INATIVO", "PENDENTE"] },
    { key: "observacao", label: "Observacao", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/implantes/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/implantes`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] }); toast({ title: "Implante criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este implante?")) return;
    const r = await apiDelete(`/api/catalogo/implantes/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar implante por codigo, nome, substancia ou indicacao..." value={search} onChange={setSearch} />
        <Chip variant="outline">{filtered.length} implantes</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Novo Implante</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((item: any) => (
          <div key={item.id} className="cat-card cat-rowgroup" style={{ ...accStyle, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: PW.ciano, fontFamily: MONO }}>{item.codigoPadcom}</span>
                  <Chip variant="secondary">{item.via}</Chip>
                  <Chip variant="outline">{item.trocarte}</Chip>
                </div>
                <div style={{ fontWeight: 700, color: PW.text }}>{item.nomeImplante}</div>
                <div style={{ fontSize: 13, color: PW.t2, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Substancia:</span> {item.substanciaAtiva} — {item.dosagem} {item.unidade}</div>
                <div style={{ fontSize: 13, color: PW.t2 }}><span style={{ fontWeight: 700 }}>Liberacao:</span> {item.liberacaoDiaria} | <span style={{ fontWeight: 700 }}>Dose:</span> {item.doseRecomendada} pellets | <span style={{ fontWeight: 700 }}>Duracao:</span> {item.tempoAcao}</div>
                <div style={{ fontSize: 13, color: PW.t2, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Indicacao:</span> {item.indicacao}</div>
                {item.observacao && <div style={{ fontSize: 11, color: PW.muted, marginTop: 4, fontStyle: "italic" }}>{item.observacao}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0, marginLeft: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: PW.text, fontFamily: MONO }}>{item.valorUnidade}</div>
                  <div style={{ fontSize: 11, color: PW.muted }}>{item.origemValor}</div>
                </div>
                <PencilBtn reveal onClick={() => setEditing(item)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Implante" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} fields={IMPL_FIELDS} />
      )}
      {creating && (
        <EditModal item={{statusCadastro: "ATIVO", via: "SC"}} title="Novo Implante" onClose={() => setCreating(false)} onSave={handleCreate} fields={IMPL_FIELDS} />
      )}
    </div>
  );
}

function FormulasTab() {
  const [search, setSearch] = useState("");
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-formulas"],
    queryFn: () => catFetch(`/api/catalogo/formulas`),
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.conteudo?.toLowerCase().includes(search.toLowerCase()) ||
    i.area?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, { titulo: any; componentes: any[] }> = {};
  filtered.forEach((i: any) => {
    if (!grouped[i.codigoPadcom]) grouped[i.codigoPadcom] = { titulo: null, componentes: [] };
    if (i.tipoLinha === "FORMULA") grouped[i.codigoPadcom].titulo = i;
    else grouped[i.codigoPadcom].componentes.push(i);
  });

  const FORM_FIELDS = [
    { key: "codigoPadcom", label: "Codigo Pawards" },
    { key: "identificador", label: "Identificador" },
    { key: "conteudo", label: "Conteudo", type: "textarea" },
    { key: "area", label: "Area" },
    { key: "funcao", label: "Funcao" },
    { key: "tipoLinha", label: "Tipo Linha" },
    { key: "valorUnidade", label: "Valor Unitario" },
    { key: "status", label: "Status", options: ["ATIVO", "INATIVO"] },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/formulas/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/formulas`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] }); toast({ title: "Formula criada" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir esta formula?")) return;
    const r = await apiDelete(`/api/catalogo/formulas/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar formula por codigo, nome ou area..." value={search} onChange={setSearch} />
        <Chip variant="outline">{Object.keys(grouped).length} formulas</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Nova Formula</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(grouped).map(([codigo, { titulo, componentes }]) => {
          const substancias = componentes.filter(c => c.identificador?.startsWith("SUBS"));
          const via = componentes.find(c => c.identificador === "VIA");
          const apre = componentes.find(c => c.identificador === "APRE");
          const poso = componentes.find(c => c.identificador?.startsWith("POSO"));
          const obs = componentes.find(c => c.identificador === "OBS");
          return (
            <div key={codigo} className="cat-acc" style={accStyle}>
              <button onClick={() => setExpandedFormula(expandedFormula === codigo ? null : codigo)} className="cat-head cat-rowgroup" style={headBtnStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    {expandedFormula === codigo ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
                    <span style={{ fontSize: 12, color: PW.ciano, fontFamily: MONO }}>{codigo}</span>
                    {titulo?.area && <Chip variant="secondary">{titulo.area}</Chip>}
                    {titulo?.funcao && <Chip variant="outline">{titulo.funcao}</Chip>}
                  </div>
                  <div style={{ marginLeft: 28, fontWeight: 700, color: PW.text }}>{titulo?.conteudo || codigo}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{titulo?.valorUnidade}</div>
                  {titulo && (
                    <PencilBtn reveal onClick={(e: any) => { e.stopPropagation(); setEditing(titulo); }} />
                  )}
                </div>
              </button>
              {expandedFormula === codigo && (
                <div style={{ borderTop: `1px solid ${PW.border}`, background: PW.bg, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {substancias.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: PW.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO }}>Composicao</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {substancias.map((s: any) => (
                          <div key={s.id} className="cat-rowgroup" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, paddingLeft: 16, borderLeft: `2px solid ${PW.border}`, color: PW.text }}>
                            <span>{s.conteudo}</span>
                            <PencilBtn reveal onClick={() => setEditing(s)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", columnGap: 24, rowGap: 4, fontSize: 13, color: PW.text }}>
                    {via && <span><span style={{ fontWeight: 700, color: PW.muted }}>Via:</span> {via.conteudo}</span>}
                    {apre && <span><span style={{ fontWeight: 700, color: PW.muted }}>Apresentacao:</span> {apre.conteudo}</span>}
                    {poso && <span><span style={{ fontWeight: 700, color: PW.muted }}>Posologia:</span> {poso.conteudo}</span>}
                  </div>
                  {obs && <div style={{ fontSize: 11, color: PW.muted, fontStyle: "italic" }}>{obs.conteudo}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Formula" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} fields={FORM_FIELDS} />
      )}
      {creating && (
        <EditModal item={{status: "ATIVO", tipoLinha: "FORMULA", identificador: "TITL"}} title="Nova Formula" onClose={() => setCreating(false)} onSave={handleCreate} fields={FORM_FIELDS} />
      )}
    </div>
  );
}

function ProtocolosTab() {
  const [expandedProto, setExpandedProto] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-protocolos"],
    queryFn: () => catFetch(`/api/catalogo/protocolos-master`),
  });

  const PROTO_FIELDS = [
    { key: "codigoProtocolo", label: "Codigo Protocolo" },
    { key: "nome", label: "Nome" },
    { key: "area", label: "Area" },
    { key: "objetivo", label: "Objetivo", type: "textarea" },
    { key: "modoOferta", label: "Modo Oferta" },
    { key: "valorExames", label: "Valor Exames" },
    { key: "valorFormulas", label: "Valor Formulas" },
    { key: "valorInjetaveis", label: "Valor Injetaveis" },
    { key: "valorImplantes", label: "Valor Implantes" },
    { key: "valorTotal", label: "Valor Total" },
    { key: "status", label: "Status", options: ["ATIVO", "INATIVO"] },
    { key: "observacao", label: "Observacao", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/protocolos-master/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/protocolos-master`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] }); toast({ title: "Protocolo criado" });
  };
  const handleDeleteProto = async () => {
    if (!confirm("Excluir este protocolo?")) return;
    const r = await apiDelete(`/api/catalogo/protocolos-master/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] });
  };

  if (isLoading) return <Carregando />;

  const cellBox: CSSProperties = { border: `1px solid ${PW.border}`, borderRadius: 0, padding: 8, textAlign: "center" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Chip variant="outline">{data.length} protocolos</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Novo Protocolo</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {data.map((p: any) => (
          <div key={p.id} className="cat-acc" style={accStyle}>
            <button onClick={() => setExpandedProto(expandedProto === p.codigoProtocolo ? null : p.codigoProtocolo)} className="cat-head cat-rowgroup" style={headBtnStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  {expandedProto === p.codigoProtocolo ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
                  <span style={{ fontSize: 12, color: PW.ciano, fontFamily: MONO }}>{p.codigoProtocolo}</span>
                  <Chip variant="secondary">{p.area}</Chip>
                  <Chip variant="outline">{p.modoOferta}</Chip>
                </div>
                <div style={{ marginLeft: 28, fontWeight: 700, color: PW.text }}>{p.nome}</div>
                <div style={{ marginLeft: 28, fontSize: 13, color: PW.t2 }}>{p.objetivo}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: PW.text, fontFamily: MONO }}>{p.valorTotal}</div>
                  <div style={{ fontSize: 11, color: PW.muted }}>total estimado</div>
                </div>
                <PencilBtn reveal onClick={(e: any) => { e.stopPropagation(); setEditing(p); }} />
              </div>
            </button>
            {expandedProto === p.codigoProtocolo && (
              <div style={{ borderTop: `1px solid ${PW.border}`, background: PW.bg, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 13 }}>
                  <div style={cellBox}><div style={{ fontSize: 11, color: PW.muted, marginBottom: 4 }}>Exames</div><div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{p.valorExames}</div></div>
                  <div style={cellBox}><div style={{ fontSize: 11, color: PW.muted, marginBottom: 4 }}>Formulas</div><div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{p.valorFormulas}</div></div>
                  <div style={cellBox}><div style={{ fontSize: 11, color: PW.muted, marginBottom: 4 }}>Injetaveis</div><div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{p.valorInjetaveis}</div></div>
                  <div style={cellBox}><div style={{ fontSize: 11, color: PW.muted, marginBottom: 4 }}>Implantes</div><div style={{ fontWeight: 700, color: PW.text, fontFamily: MONO }}>{p.valorImplantes}</div></div>
                </div>
                {p.fases?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: PW.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO }}>Fases</div>
                    {p.fases.map((f: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, paddingLeft: 16, borderLeft: `2px solid ${PW.border}`, marginBottom: 4, color: PW.text }}>
                        <Chip variant="outline">{f.fase}</Chip>
                        <span>Dia {f.diaInicio} a {f.diaFim}</span>
                        <span style={{ color: PW.muted }}>— {f.marco}</span>
                      </div>
                    ))}
                  </div>
                )}
                {p.acoes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: PW.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO }}>Acoes</div>
                    {p.acoes.map((a: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, paddingLeft: 16, borderLeft: `2px solid ${PW.ciano}`, marginBottom: 4, color: PW.text }}>
                        <Chip variant="secondary">{a.tipoAcao}</Chip>
                        <span style={{ fontSize: 11, fontFamily: MONO, color: PW.t2 }}>{a.codigoReferencia}</span>
                        {a.obrigatorio === "SIM" && <Chip variant="destructive">Obrigatorio</Chip>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Protocolo" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDeleteProto} fields={PROTO_FIELDS} />
      )}
      {creating && (
        <EditModal item={{status: "ATIVO", modoOferta: "SESSAO"}} title="Novo Protocolo" onClose={() => setCreating(false)} onSave={handleCreate} fields={PROTO_FIELDS} />
      )}
    </div>
  );
}

function ExamesTab() {
  const [search, setSearch] = useState("");
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-exames-base"],
    queryFn: () => catFetch(`/api/catalogo/exames-base`),
  });

  const filtered = data.filter((e: any) =>
    !search || e.codigoExame?.toLowerCase().includes(search.toLowerCase()) ||
    e.nomeExame?.toLowerCase().includes(search.toLowerCase()) ||
    e.grupoPrincipal?.toLowerCase().includes(search.toLowerCase()) ||
    e.blocoOficial?.toLowerCase().includes(search.toLowerCase()) ||
    e.modalidade?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((e: any) => { const g = e.grupoPrincipal || "OUTROS"; if (!grouped[g]) grouped[g] = []; grouped[g].push(e); });

  const EXAME_FIELDS = [
    { key: "codigoExame", label: "Codigo Exame" },
    { key: "nomeExame", label: "Nome Exame" },
    { key: "modalidade", label: "Modalidade" },
    { key: "materialOuSetor", label: "Material / Setor" },
    { key: "grupoPrincipal", label: "Grupo Principal" },
    { key: "subgrupo", label: "Subgrupo" },
    { key: "blocoOficial", label: "Bloco Oficial" },
    { key: "grauDoBloco", label: "Grau" },
    { key: "prioridade", label: "Prioridade", options: ["ALTA", "MEDIA", "BAIXA", "ROTINA"] },
    { key: "preparo", label: "Preparo", type: "textarea" },
    { key: "justificativaObjetiva", label: "Justificativa Objetiva", type: "textarea" },
    { key: "justificativaNarrativa", label: "Justificativa Narrativa", type: "textarea" },
    { key: "hipoteseDiagnostica1", label: "Hipotese Diagnostica 1" },
    { key: "cid1", label: "CID 1" },
    { key: "sexoAplicavel", label: "Sexo Aplicavel", options: ["AMBOS", "MASCULINO", "FEMININO"] },
    { key: "observacaoClinica", label: "Observacao Clinica", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/exames-base/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/exames-base`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] }); toast({ title: "Exame criado" });
  };
  const handleDeleteExame = async () => {
    if (!confirm("Excluir este exame?")) return;
    const r = await apiDelete(`/api/catalogo/exames-base/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar exame por codigo, nome, grupo, bloco ou modalidade..." value={search} onChange={setSearch} />
        <Chip variant="outline">{filtered.length} exames</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Novo Exame</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo} className="cat-acc" style={accStyle}>
            <button onClick={() => setExpandedGrupo(expandedGrupo === grupo ? null : grupo)} className="cat-head" style={headBtnStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {expandedGrupo === grupo ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.text }}>{grupo}</span>
                <Chip variant="secondary">{items.length}</Chip>
              </div>
            </button>
            {expandedGrupo === grupo && (
              <div style={{ borderTop: `1px solid ${PW.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: PW.bg3 }}>
                    <th style={thStyle}>Codigo</th>
                    <th style={thStyle}>Nome</th>
                    <th style={thStyle}>Modalidade</th>
                    <th style={thStyle}>Bloco</th>
                    <th style={thStyle}>Grau</th>
                    <th style={thStyle}>Prioridade</th>
                    <th style={{ ...thStyle, width: 32 }}></th>
                  </tr></thead>
                  <tbody>
                    {items.map((ex: any) => (
                      <tr key={ex.id} className="cat-row cat-rowgroup" style={{ borderTop: `1px solid ${PW.border}` }}>
                        <td style={{ ...tdStyle, fontSize: 12, color: PW.ciano }}>{ex.codigoExame}</td>
                        <td style={{ ...tdStyle, color: PW.text }}>{ex.nomeExame}</td>
                        <td style={tdStyle}><Chip variant="outline">{ex.modalidade}</Chip></td>
                        <td style={{ ...tdStyle, fontSize: 11, color: PW.muted }}>{ex.blocoOficial}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: PW.muted }}>{ex.grauDoBloco}</td>
                        <td style={tdStyle}><Chip variant={ex.prioridade === "ALTA" ? "destructive" : "secondary"}>{ex.prioridade}</Chip></td>
                        <td style={{ padding: "10px 8px" }}>
                          <PencilBtn reveal onClick={() => setEditing(ex)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Exame" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDeleteExame} fields={EXAME_FIELDS} />
      )}
      {creating && (
        <EditModal item={{prioridade: "ROTINA", sexoAplicavel: "AMBOS"}} title="Novo Exame" onClose={() => setCreating(false)} onSave={handleCreate} fields={EXAME_FIELDS} />
      )}
    </div>
  );
}

function DoencasTab() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-doencas"],
    queryFn: () => catFetch(`/api/catalogo/doencas`),
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoDoenca?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeDoenca?.toLowerCase().includes(search.toLowerCase()) ||
    i.grupo?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixo?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((i: any) => { const g = i.grupo || "OUTROS"; if (!grouped[g]) grouped[g] = []; grouped[g].push(i); });

  const DOENCA_FIELDS = [
    { key: "codigoDoenca", label: "Codigo Doenca" },
    { key: "nomeDoenca", label: "Nome Doenca" },
    { key: "grupo", label: "Grupo" },
    { key: "eixo", label: "Eixo" },
    { key: "blocoMotor", label: "Bloco Motor" },
    { key: "cid10", label: "CID-10" },
    { key: "observacao", label: "Observacao", type: "textarea" },
  ];

  const handleSave = async (form: any) => {
    const r = await apiPut(`/api/catalogo/doencas/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`/api/catalogo/doencas`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] }); toast({ title: "Doenca criada" });
  };
  const handleDeleteDoenca = async () => {
    if (!confirm("Excluir esta doenca?")) return;
    const r = await apiDelete(`/api/catalogo/doencas/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] });
  };

  if (isLoading) return <Carregando />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <SearchBar placeholder="Buscar doenca por codigo, nome, grupo ou eixo..." value={search} onChange={setSearch} />
        <Chip variant="outline">{filtered.length} doencas</Chip>
        <Btn variant="primary" onClick={() => setCreating(true)}><Plus style={{ width: 14, height: 14 }} /> Nova Doenca</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: PW.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4, fontFamily: MONO }}>{grupo}</h3>
            <div className="cat-acc" style={accStyle}>
              {items.map((d: any, idx: number) => (
                <div key={d.id} className="cat-row cat-rowgroup" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: idx === 0 ? "none" : `1px solid ${PW.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: PW.ciano, width: 160, fontFamily: MONO }}>{d.codigoDoenca}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: PW.text }}>{d.nomeDoenca}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Chip variant="outline">{d.eixo}</Chip>
                    <span style={{ fontSize: 11, color: PW.muted, fontFamily: MONO }}>{d.blocoMotor}</span>
                    <PencilBtn reveal onClick={() => setEditing(d)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <EditModal item={editing} title="Editar Doenca" onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDeleteDoenca} fields={DOENCA_FIELDS} />
      )}
      {creating && (
        <EditModal item={{}} title="Nova Doenca" onClose={() => setCreating(false)} onSave={handleCreate} fields={DOENCA_FIELDS} />
      )}
    </div>
  );
}

export default function CatalogoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("injetaveis");

  const { data: resumo } = useQuery({
    queryKey: ["catalogo-resumo"],
    queryFn: () => catFetch(`/api/catalogo/resumo`),
  });

  const { data: examesCount } = useQuery({
    queryKey: ["catalogo-exames-count"],
    queryFn: async () => (await catFetch(`/api/catalogo/exames-base`)).length,
  });

  const tabCounts: Record<TabKey, number> = {
    injetaveis: resumo?.injetaveis ?? 0, endovenosos: resumo?.endovenosos ?? 0,
    implantes: resumo?.implantes ?? 0, formulas: resumo?.formulas ?? 0,
    protocolos: resumo?.protocolos ?? 0, exames: examesCount ?? 0, doencas: resumo?.doencas ?? 0,
  };

  return (
    <Layout>
      <style>{CAT_CSS}</style>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: PW.text, margin: 0, fontFamily: MONO }}>Catalogo Pawards</h1>
        <p style={{ color: PW.muted, marginTop: 4, fontSize: 13 }}>Base completa de itens terapeuticos, protocolos e regras do motor clinico</p>
        {resumo?.total && <div style={{ marginTop: 8, fontSize: 13, color: PW.muted, fontFamily: MONO }}>{resumo.total} registros no total</div>}
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${PW.border}`, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const ativo = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="cat-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${ativo ? PW.ciano : "transparent"}`,
                borderRadius: 0,
                color: ativo ? PW.ciano : PW.muted,
                whiteSpace: "nowrap",
                fontFamily: MONO,
                textShadow: ativo ? `0 0 12px ${PW.cianoGlow}` : "none",
              }}>
              <Icon style={{ width: 16, height: 16 }} />
              {tab.label}
              <Chip variant={ativo ? "default" : "secondary"}>{tabCounts[tab.key]}</Chip>
            </button>
          );
        })}
      </div>

      {activeTab === "injetaveis" && <InjetaveisTab />}
      {activeTab === "endovenosos" && <EndovenososTab />}
      {activeTab === "implantes" && <ImplantesTab />}
      {activeTab === "formulas" && <FormulasTab />}
      {activeTab === "protocolos" && <ProtocolosTab />}
      {activeTab === "exames" && <ExamesTab />}
      {activeTab === "doencas" && <DoencasTab />}
    </Layout>
  );
}
