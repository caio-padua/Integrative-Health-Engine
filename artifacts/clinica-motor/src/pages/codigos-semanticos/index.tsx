import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Hash, FileText, Syringe, FlaskConical,
  Pill, TestTube, Stethoscope, ClipboardList,
  ChevronDown, ChevronRight, Tag, Pencil, X, Plus, Trash2, Save
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface CodigoSemantico {
  id: number;
  codigo: string;
  tipo: string;
  procedimentoOuSignificado: string;
  origemLida: string | null;
  grupoObs: string | null;
  prescricaoFormula: string | null;
  injetavelIM: string | null;
  injetavelEV: string | null;
  implante: string | null;
  exame: string | null;
  protocolo: string | null;
  dieta: string | null;
  ativo: boolean;
}

const EMPTY_FORM: Partial<CodigoSemantico> = {
  codigo: "", tipo: "exame/procedimento", procedimentoOuSignificado: "", origemLida: "",
  grupoObs: "", prescricaoFormula: "", injetavelIM: "", injetavelEV: "",
  implante: "", exame: "", protocolo: "", dieta: "", ativo: true,
};

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "exame/procedimento": { label: "Exame", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Stethoscope },
  "injetavel": { label: "Injetavel", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: Syringe },
  "formula": { label: "Formula", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: FlaskConical },
  "protocolo": { label: "Protocolo", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: ClipboardList },
  "doenca": { label: "Doenca", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: FileText },
  "doenca/procedimento": { label: "Doenca/Proc", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: FileText },
  "sintoma": { label: "Sintoma", color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: FileText },
  "cirurgia": { label: "Cirurgia", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: FileText },
  "pergunta anamnese": { label: "Anamnese", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: ClipboardList },
  "juridico": { label: "Juridico", color: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: FileText },
  "dieta": { label: "Dieta", color: "bg-lime-500/10 text-lime-400 border-lime-500/30", icon: FileText },
  "psicologia": { label: "Psicologia", color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: FileText },
  "recorrencia": { label: "Recorrencia", color: "bg-teal-500/10 text-teal-400 border-teal-500/30", icon: FileText },
  "pagamento": { label: "Pagamento", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: FileText },
  "fiscal/documento": { label: "Fiscal", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: FileText },
};

const TIPOS_LIST = Object.keys(TIPO_CONFIG);

const FORM_FIELDS = [
  { key: "codigo", label: "Codigo Pawards" },
  { key: "tipo", label: "Tipo", isSelect: true },
  { key: "procedimentoOuSignificado", label: "Descricao/Significado", full: true },
  { key: "origemLida", label: "Origem" },
  { key: "grupoObs", label: "Grupo/Obs" },
  { key: "prescricaoFormula", label: "Prescricao/Formula" },
  { key: "injetavelIM", label: "Injetavel IM" },
  { key: "injetavelEV", label: "Injetavel EV" },
  { key: "implante", label: "Implante" },
  { key: "exame", label: "Exame" },
  { key: "protocolo", label: "Protocolo" },
  { key: "dieta", label: "Dieta" },
];

function ProcedimentoTag({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs border ${color}`}>
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function CodigoRow({ item, onEdit }: { item: CodigoSemantico; onEdit: (item: CodigoSemantico) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = TIPO_CONFIG[item.tipo] || { label: item.tipo, color: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: Tag };
  const Icon = config.icon;
  const hasProcedimentos = item.prescricaoFormula || item.injetavelIM || item.injetavelEV || item.implante || item.exame || item.protocolo || item.dieta;

  return (
    <div className="border-b border-border/50 last:border-0 group">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="w-8 flex justify-center">
          {hasProcedimentos ? (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : <span className="w-4" />}
        </div>
        <div className="font-mono text-xs bg-muted px-2 py-1 min-w-[220px] text-foreground">{item.codigo}</div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 min-w-[80px] justify-center ${config.color}`}>
          <Icon className="h-3 w-3 mr-1" />{config.label}
        </Badge>
        <div className="flex-1 text-sm truncate">{item.procedimentoOuSignificado}</div>
        {item.grupoObs && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">{item.grupoObs}</Badge>}
        <div className="flex gap-1 flex-shrink-0">
          {item.exame && <div className="w-2 h-2 bg-blue-500" title="Exame" />}
          {item.prescricaoFormula && <div className="w-2 h-2 bg-purple-500" title="Formula" />}
          {item.injetavelIM && <div className="w-2 h-2 bg-green-500" title="IM" />}
          {item.injetavelEV && <div className="w-2 h-2 bg-sky-500" title="EV" />}
          {item.implante && <div className="w-2 h-2 bg-amber-500" title="Implante" />}
          {item.protocolo && <div className="w-2 h-2 bg-orange-500" title="Protocolo" />}
          {item.dieta && <div className="w-2 h-2 bg-lime-500" title="Dieta" />}
        </div>
        {!item.ativo && <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/30">INATIVO</Badge>}
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {expanded && hasProcedimentos && (
        <div className="pl-14 pr-4 pb-3 flex flex-wrap gap-2">
          {item.exame && <ProcedimentoTag label="Exame" value={item.exame} color="bg-blue-500/5 text-blue-400 border-blue-500/20" />}
          {item.prescricaoFormula && <ProcedimentoTag label="Prescricao" value={item.prescricaoFormula} color="bg-purple-500/5 text-purple-400 border-purple-500/20" />}
          {item.injetavelIM && <ProcedimentoTag label="IM" value={item.injetavelIM} color="bg-green-500/5 text-green-400 border-green-500/20" />}
          {item.injetavelEV && <ProcedimentoTag label="EV" value={item.injetavelEV} color="bg-sky-500/5 text-sky-400 border-sky-500/20" />}
          {item.implante && <ProcedimentoTag label="Implante" value={item.implante} color="bg-amber-500/5 text-amber-400 border-amber-500/20" />}
          {item.protocolo && <ProcedimentoTag label="Protocolo" value={item.protocolo} color="bg-orange-500/5 text-orange-400 border-orange-500/20" />}
          {item.dieta && <ProcedimentoTag label="Dieta" value={item.dieta} color="bg-lime-500/5 text-lime-400 border-lime-500/20" />}
          {item.origemLida && <span className="text-[10px] text-muted-foreground ml-auto self-end">Origem: {item.origemLida}</span>}
        </div>
      )}
    </div>
  );
}

export default function CodigosSemanticos() {
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [grupoFiltro, setGrupoFiltro] = useState("Todos");
  const [editing, setEditing] = useState<CodigoSemantico | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: metaData } = useQuery<{ tipos: string[]; grupos: string[] }>({
    queryKey: ["codigos-semanticos-tipos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/codigos-semanticos/tipos`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: codigos = [], isLoading } = useQuery<CodigoSemantico[]>({
    queryKey: ["codigos-semanticos", search, tipoFiltro, grupoFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tipoFiltro !== "Todos") params.set("tipo", tipoFiltro);
      if (grupoFiltro !== "Todos") params.set("grupo", grupoFiltro);
      const res = await fetch(`${BASE_URL}api/codigos-semanticos?${params}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE_URL}api/codigos-semanticos/${d.id}` : `${BASE_URL}api/codigos-semanticos`;
      const method = d.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Erro ao salvar"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codigos-semanticos"] });
      qc.invalidateQueries({ queryKey: ["codigos-semanticos-tipos"] });
      toast({ title: editing ? "Codigo atualizado" : "Codigo criado" });
      closeForm();
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE_URL}api/codigos-semanticos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codigos-semanticos"] });
      qc.invalidateQueries({ queryKey: ["codigos-semanticos-tipos"] });
      toast({ title: "Codigo excluido" });
      closeForm();
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  function openEdit(item: CodigoSemantico) {
    setEditing(item);
    setForm({ ...item });
    setCreating(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setCreating(true);
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setForm({ ...EMPTY_FORM });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirm(`Excluir o codigo "${editing.codigo}" permanentemente?`)) return;
    deleteMutation.mutate(editing.id);
  }

  const tipoCount = codigos.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const comProcedimentos = codigos.filter(
    c => c.exame || c.prescricaoFormula || c.injetavelIM || c.injetavelEV || c.implante || c.protocolo || c.dieta
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Hash className="h-8 w-8 text-primary" />
              Codigos Semanticos Pawards
            </h1>
            <p className="text-muted-foreground mt-1">
              Nomenclatura padronizada — {codigos.length} codigos / {comProcedimentos} com procedimentos
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Novo Codigo</Button>
        </div>

        {(editing || creating) && (
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold tracking-tight">{editing ? "Editar Codigo Semantico" : "Novo Codigo Semantico"}</h3>
                <button onClick={closeForm}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FORM_FIELDS.map(f => (
                  <div key={f.key} className={f.full ? "col-span-2 md:col-span-4" : ""}>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{f.label}</label>
                    {f.isSelect ? (
                      <select value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                        {TIPOS_LIST.map(t => <option key={t} value={t}>{TIPO_CONFIG[t]?.label || t}</option>)}
                      </select>
                    ) : (
                      <Input value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value || null })} />
                    )}
                  </div>
                ))}
                <div className="col-span-2 md:col-span-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.ativo ?? true} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                    <span className="text-sm font-medium">Codigo Ativo</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border mt-4">
                <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.codigo} className="gap-2">
                  <Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={closeForm}>Cancelar</Button>
                {editing && (
                  <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending} className="ml-auto gap-2">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por codigo ou descricao..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                {metaData?.grupos && (
                  <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}
                    className="border px-3 py-2 text-sm bg-background text-foreground">
                    <option value="Todos">Todos os Grupos</option>
                    {metaData.grupos.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant={tipoFiltro === "Todos" ? "default" : "outline"} size="sm" onClick={() => setTipoFiltro("Todos")} className="text-xs h-7">
                  Todos ({codigos.length})
                </Button>
                {metaData?.tipos?.map(tipo => {
                  const cfg = TIPO_CONFIG[tipo];
                  return (
                    <Button key={tipo} variant={tipoFiltro === tipo ? "default" : "outline"} size="sm" onClick={() => setTipoFiltro(tipo)} className="text-xs h-7">
                      {cfg?.label || tipo} {tipoCount[tipo] ? `(${tipoCount[tipo]})` : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 text-xs text-muted-foreground items-center">
          <span className="font-medium">Legenda:</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500" /> Exame</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500" /> Formula</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500" /> IM</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-sky-500" /> EV</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500" /> Implante</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500" /> Protocolo</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-lime-500" /> Dieta</span>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8"><div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse" />)}</div></CardContent></Card>
        ) : codigos.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Hash className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Nenhum codigo encontrado</h3>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie um novo codigo</p>
          </CardContent></Card>
        ) : (
          <Card>
            <div className="divide-y divide-border/30">
              <div className="flex items-center gap-3 p-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="w-8" />
                <div className="min-w-[220px]">Codigo</div>
                <div className="min-w-[80px] text-center">Tipo</div>
                <div className="flex-1">Descricao/Significado</div>
                <div>Grupo</div>
                <div className="w-[70px] text-center">Proc.</div>
              </div>
              {codigos.map(item => (
                <CodigoRow key={item.id} item={item} onEdit={openEdit} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
