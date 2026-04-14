import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronDown, ChevronRight, Syringe, Droplets, CircleDot, FlaskConical, Stethoscope, Brain, Microscope, Pencil, X, Trash2, Plus } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

async function apiPut(url: string, data: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || `Erro ${res.status}` }; }
    return { ok: true };
  } catch { return { ok: false, error: "Erro de conexao" }; }
}

async function apiPost(url: string, data: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || `Erro ${res.status}` }; }
    return { ok: true };
  } catch { return { ok: false, error: "Erro de conexao" }; }
}

async function apiDelete(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "DELETE" });
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(field => (
            <div key={field.key} className={`space-y-1 ${field.type === "textarea" ? "col-span-2" : ""}`}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  rows={2} className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none" />
              ) : field.options ? (
                <select value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={field.type || "text"} value={form[field.key] || ""} onChange={e => setForm({...form, [field.key]: e.target.value})}
                  className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button className="flex-1 text-xs h-9" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Alteracoes"}</Button>
          <Button variant="outline" className="text-xs h-9" onClick={onClose}>Cancelar</Button>
          {onDelete && (
            <Button variant="destructive" className="text-xs h-9 gap-1" onClick={onDelete}><Trash2 className="w-3 h-3" /> Excluir</Button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/injetaveis`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/injetaveis/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/injetaveis`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] }); toast({ title: "Injetavel criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este injetavel?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/injetaveis/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-injetaveis"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por codigo, nome, eixo ou palavra-chave..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} itens</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Novo Injetavel</Button>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([eixo, items]) => (
          <div key={eixo} className="border rounded-lg">
            <button onClick={() => setExpandedEixo(expandedEixo === eixo ? null : eixo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {expandedEixo === eixo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold text-sm uppercase tracking-wider">{eixo}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {expandedEixo === eixo && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 text-left">
                    <th className="px-4 py-2 font-medium text-muted-foreground">Codigo</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Dosagem</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Via</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Motor</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{item.codigoPadcom}</td>
                        <td className="px-4 py-2.5 font-medium">{item.nomeExibicao}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.dosagem} {item.volume ? `/ ${item.volume}` : ""}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{item.via}</Badge></td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.valorUnidade}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.palavraChaveMotor}</td>
                        <td className="px-2 py-2.5">
                          <button onClick={() => setEditing(item)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/endovenosos`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/endovenosos/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/endovenosos`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] }); toast({ title: "Endovenoso criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este endovenoso?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/endovenosos/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-endovenosos"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar soro por codigo, nome ou eixo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{Object.keys(soros).length} soros</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Novo Endovenoso</Button>
      </div>
      <div className="space-y-3">
        {Object.entries(soros).map(([codigo, { principal, componentes }]) => (
          <div key={codigo} className="border rounded-lg">
            <button onClick={() => setExpandedSoro(expandedSoro === codigo ? null : codigo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {expandedSoro === codigo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-mono text-xs text-primary font-medium">{codigo}</span>
                  <Badge variant="secondary" className="text-xs">{principal?.eixoIntegrativo}</Badge>
                </div>
                <div className="ml-7 font-semibold">{principal?.nomeSoro || componentes[0]?.nomeSoro}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">{principal?.valorUnidade}</div>
                  <div className="text-xs text-muted-foreground">{principal?.frequenciaPadrao}</div>
                </div>
                {principal && (
                  <button onClick={e => { e.stopPropagation(); setEditing(principal); }} className="p-1.5 hover:bg-muted rounded opacity-60 hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </button>
            {expandedSoro === codigo && componentes.length > 0 && (
              <div className="border-t bg-muted/10 px-4 py-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Composicao</div>
                <div className="space-y-1.5">
                  {componentes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm pl-4 border-l-2 border-primary/20 group">
                      <span>{c.nomeExibicao} — <span className="text-muted-foreground">{c.dosagem}</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{c.valorUnidade}</span>
                        <button onClick={() => setEditing(c)} className="opacity-0 group-hover:opacity-100 p-0.5">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/implantes`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/implantes/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/implantes`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] }); toast({ title: "Implante criado" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este implante?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/implantes/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-implantes"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar implante por codigo, nome, substancia ou indicacao..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} implantes</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Novo Implante</Button>
      </div>
      <div className="space-y-2">
        {filtered.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors group">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-primary font-medium">{item.codigoPadcom}</span>
                  <Badge variant="secondary" className="text-xs">{item.via}</Badge>
                  <Badge variant="outline" className="text-xs">{item.trocarte}</Badge>
                </div>
                <div className="font-semibold">{item.nomeImplante}</div>
                <div className="text-sm text-muted-foreground mt-1"><span className="font-medium">Substancia:</span> {item.substanciaAtiva} — {item.dosagem} {item.unidade}</div>
                <div className="text-sm text-muted-foreground"><span className="font-medium">Liberacao:</span> {item.liberacaoDiaria} | <span className="font-medium">Dose:</span> {item.doseRecomendada} pellets | <span className="font-medium">Duracao:</span> {item.tempoAcao}</div>
                <div className="text-sm text-muted-foreground mt-1"><span className="font-medium">Indicacao:</span> {item.indicacao}</div>
                {item.observacao && <div className="text-xs text-muted-foreground/70 mt-1 italic">{item.observacao}</div>}
              </div>
              <div className="flex items-start gap-3 shrink-0 ml-4">
                <div className="text-right">
                  <div className="font-medium text-lg">{item.valorUnidade}</div>
                  <div className="text-xs text-muted-foreground">{item.origemValor}</div>
                </div>
                <button onClick={() => setEditing(item)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/formulas`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/formulas/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/formulas`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] }); toast({ title: "Formula criada" });
  };
  const handleDelete = async () => {
    if (!confirm("Excluir esta formula?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/formulas/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-formulas"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar formula por codigo, nome ou area..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{Object.keys(grouped).length} formulas</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Nova Formula</Button>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).map(([codigo, { titulo, componentes }]) => {
          const substancias = componentes.filter(c => c.identificador?.startsWith("SUBS"));
          const via = componentes.find(c => c.identificador === "VIA");
          const apre = componentes.find(c => c.identificador === "APRE");
          const poso = componentes.find(c => c.identificador?.startsWith("POSO"));
          const obs = componentes.find(c => c.identificador === "OBS");
          return (
            <div key={codigo} className="border rounded-lg">
              <button onClick={() => setExpandedFormula(expandedFormula === codigo ? null : codigo)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    {expandedFormula === codigo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-mono text-xs text-primary font-medium">{codigo}</span>
                    {titulo?.area && <Badge variant="secondary" className="text-xs uppercase">{titulo.area}</Badge>}
                    {titulo?.funcao && <Badge variant="outline" className="text-xs uppercase">{titulo.funcao}</Badge>}
                  </div>
                  <div className="ml-7 font-semibold">{titulo?.conteudo || codigo}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium">{titulo?.valorUnidade}</div>
                  {titulo && (
                    <button onClick={e => { e.stopPropagation(); setEditing(titulo); }} className="p-1.5 hover:bg-muted rounded opacity-60 hover:opacity-100">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </button>
              {expandedFormula === codigo && (
                <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                  {substancias.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Composicao</div>
                      <div className="space-y-1">
                        {substancias.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-sm pl-4 border-l-2 border-primary/20 group">
                            <span>{s.conteudo}</span>
                            <button onClick={() => setEditing(s)} className="opacity-0 group-hover:opacity-100 p-0.5">
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {via && <span><span className="font-medium text-muted-foreground">Via:</span> {via.conteudo}</span>}
                    {apre && <span><span className="font-medium text-muted-foreground">Apresentacao:</span> {apre.conteudo}</span>}
                    {poso && <span><span className="font-medium text-muted-foreground">Posologia:</span> {poso.conteudo}</span>}
                  </div>
                  {obs && <div className="text-xs text-muted-foreground/70 italic">{obs.conteudo}</div>}
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/protocolos-master`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/protocolos-master/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/protocolos-master`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] }); toast({ title: "Protocolo criado" });
  };
  const handleDeleteProto = async () => {
    if (!confirm("Excluir este protocolo?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/protocolos-master/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-protocolos"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="outline" className="text-sm px-3 py-1.5">{data.length} protocolos</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Novo Protocolo</Button>
      </div>
      <div className="space-y-3 mt-4">
        {data.map((p: any) => (
          <div key={p.id} className="border rounded-lg">
            <button onClick={() => setExpandedProto(expandedProto === p.codigoProtocolo ? null : p.codigoProtocolo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {expandedProto === p.codigoProtocolo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-mono text-xs text-primary font-medium">{p.codigoProtocolo}</span>
                  <Badge variant="secondary" className="text-xs uppercase">{p.area}</Badge>
                  <Badge variant="outline" className="text-xs">{p.modoOferta}</Badge>
                </div>
                <div className="ml-7 font-semibold">{p.nome}</div>
                <div className="ml-7 text-sm text-muted-foreground">{p.objetivo}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium text-lg">{p.valorTotal}</div>
                  <div className="text-xs text-muted-foreground">total estimado</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setEditing(p); }} className="p-1.5 hover:bg-muted rounded opacity-60 hover:opacity-100">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </button>
            {expandedProto === p.codigoProtocolo && (
              <div className="border-t bg-muted/10 px-4 py-3 space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground mb-1">Exames</div><div className="font-medium">{p.valorExames}</div></div>
                  <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground mb-1">Formulas</div><div className="font-medium">{p.valorFormulas}</div></div>
                  <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground mb-1">Injetaveis</div><div className="font-medium">{p.valorInjetaveis}</div></div>
                  <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground mb-1">Implantes</div><div className="font-medium">{p.valorImplantes}</div></div>
                </div>
                {p.fases?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fases</div>
                    {p.fases.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm pl-4 border-l-2 border-primary/20 mb-1">
                        <Badge variant="outline" className="text-xs shrink-0">{f.fase}</Badge>
                        <span>Dia {f.diaInicio} a {f.diaFim}</span>
                        <span className="text-muted-foreground">— {f.marco}</span>
                      </div>
                    ))}
                  </div>
                )}
                {p.acoes?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Acoes</div>
                    {p.acoes.map((a: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm pl-4 border-l-2 border-blue-200 mb-1">
                        <Badge variant="secondary" className="text-xs shrink-0">{a.tipoAcao}</Badge>
                        <span className="font-mono text-xs">{a.codigoReferencia}</span>
                        {a.obrigatorio === "SIM" && <Badge variant="destructive" className="text-xs">Obrigatorio</Badge>}
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/exames-base`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/exames-base/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/exames-base`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] }); toast({ title: "Exame criado" });
  };
  const handleDeleteExame = async () => {
    if (!confirm("Excluir este exame?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/exames-base/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-exames-base"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar exame por codigo, nome, grupo, bloco ou modalidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} exames</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Novo Exame</Button>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo} className="border rounded-lg">
            <button onClick={() => setExpandedGrupo(expandedGrupo === grupo ? null : grupo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {expandedGrupo === grupo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold text-sm uppercase tracking-wider">{grupo}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {expandedGrupo === grupo && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 text-left">
                    <th className="px-4 py-2 font-medium text-muted-foreground">Codigo</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Modalidade</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Bloco</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Grau</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Prioridade</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {items.map((ex: any) => (
                      <tr key={ex.id} className="border-t hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{ex.codigoExame}</td>
                        <td className="px-4 py-2.5 font-medium">{ex.nomeExame}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{ex.modalidade}</Badge></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{ex.blocoOficial}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{ex.grauDoBloco}</td>
                        <td className="px-4 py-2.5"><Badge variant={ex.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-xs">{ex.prioridade}</Badge></td>
                        <td className="px-2 py-2.5">
                          <button onClick={() => setEditing(ex)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/doencas`); return res.json(); },
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
    const r = await apiPut(`${BASE_URL}api/catalogo/doencas/${editing.id}`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] });
  };
  const handleCreate = async (form: any) => {
    const r = await apiPost(`${BASE_URL}api/catalogo/doencas`, form);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setCreating(false); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] }); toast({ title: "Doenca criada" });
  };
  const handleDeleteDoenca = async () => {
    if (!confirm("Excluir esta doenca?")) return;
    const r = await apiDelete(`${BASE_URL}api/catalogo/doencas/${editing.id}`);
    if (!r.ok) { toast({ title: r.error, variant: "destructive" }); return; }
    setEditing(null); qc.invalidateQueries({ queryKey: ["catalogo-doencas"] });
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar doenca por codigo, nome, grupo ou eixo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} doencas</Badge>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Nova Doenca</Button>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{grupo}</h3>
            <div className="border rounded-lg divide-y">
              {items.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary font-medium w-40">{d.codigoDoenca}</span>
                    <span className="font-medium text-sm">{d.nomeDoenca}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{d.eixo}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{d.blocoMotor}</span>
                    <button onClick={() => setEditing(d)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
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
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/resumo`); return res.json(); },
  });

  const { data: examesCount } = useQuery({
    queryKey: ["catalogo-exames-count"],
    queryFn: async () => { const res = await fetch(`${BASE_URL}api/catalogo/exames-base`); const data = await res.json(); return data.length; },
  });

  const tabCounts: Record<TabKey, number> = {
    injetaveis: resumo?.injetaveis ?? 0, endovenosos: resumo?.endovenosos ?? 0,
    implantes: resumo?.implantes ?? 0, formulas: resumo?.formulas ?? 0,
    protocolos: resumo?.protocolos ?? 0, exames: examesCount ?? 0, doencas: resumo?.doencas ?? 0,
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Catalogo Pawards</h1>
        <p className="text-muted-foreground mt-1">Base completa de itens terapeuticos, protocolos e regras do motor clinico</p>
        {resumo?.total && <div className="mt-2 text-sm text-muted-foreground">{resumo.total} registros no total</div>}
      </div>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
              <Badge variant={activeTab === tab.key ? "default" : "secondary"} className="text-xs ml-1">{tabCounts[tab.key]}</Badge>
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
