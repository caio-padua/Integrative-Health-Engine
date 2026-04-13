import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Pencil, Trash2, X, Save, Search, Mail, Phone, Crown } from "lucide-react";

const BASE = import.meta.env.BASE_URL || "/clinica-motor/";

interface Consultoria {
  id: number;
  nome: string;
  cnpj: string | null;
  responsavel: string;
  email: string | null;
  telefone: string | null;
  plano: string;
  maxUnidades: string;
  ativa: boolean;
  criadoEm: string;
}

const EMPTY: Omit<Consultoria, "id" | "criadoEm"> = {
  nome: "", cnpj: "", responsavel: "", email: "", telefone: "", plano: "starter", maxUnidades: "3", ativa: true,
};

const PLANO_CORES: Record<string, string> = {
  starter: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  professional: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export default function ConsultoriasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Consultoria | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading } = useQuery<Consultoria[]>({
    queryKey: ["consultorias"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/consultorias`);
      return r.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE}api/consultorias/${d.id}` : `${BASE}api/consultorias`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultorias"] }); toast({ title: "Consultoria salva" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/consultorias/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultorias"] }); toast({ title: "Consultoria excluida" }); },
  });

  function open(d?: Consultoria) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const filtered = (data || []).filter(d =>
    `${d.nome} ${d.responsavel} ${d.cnpj || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building className="h-8 w-8 text-cyan-400" />
              Consultorias
            </h1>
            <p className="text-muted-foreground mt-1">Empresas de consultoria vinculadas — {filtered.length} registros</p>
          </div>
          <Button onClick={() => open()} className="gap-2"><Plus className="w-4 h-4" /> Nova Consultoria</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar consultoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {(editing || creating) && (
          <Card className="border-cyan-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editing ? "Editar Consultoria" : "Nova Consultoria"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Nome *</label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Responsavel *</label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">CNPJ</label><Input value={form.cnpj || ""} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Email</label><Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Telefone</label><Input value={form.telefone || ""} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Plano</label>
                  <select value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Max Unidades</label><Input type="number" value={form.maxUnidades} onChange={e => setForm({ ...form, maxUnidades: e.target.value })} /></div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.ativa} onChange={e => setForm({ ...form, ativa: e.target.checked })} className="w-4 h-4" />
                    Ativa
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => save.mutate(form)} disabled={!form.nome || !form.responsavel} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
                <Button variant="outline" onClick={close} className="gap-2"><X className="w-4 h-4" /> Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(c => (
              <Card key={c.id} className={`${!c.ativa ? "opacity-50" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{c.nome}</h3>
                        <Badge variant="outline" className={PLANO_CORES[c.plano] || ""}><Crown className="w-3 h-3 mr-1" />{c.plano.toUpperCase()}</Badge>
                        {!c.ativa && <Badge variant="secondary">INATIVA</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" />{c.responsavel}</span>
                        {c.cnpj && <span className="font-mono text-xs">{c.cnpj}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
                        {c.telefone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.telefone}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Max {c.maxUnidades} unidades</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => open(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir consultoria?")) del.mutate(c.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma consultoria encontrada</CardContent></Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
