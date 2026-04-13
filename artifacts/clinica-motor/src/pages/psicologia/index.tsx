import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE = import.meta.env.BASE_URL || "/clinica-motor/";

interface Psicologia {
  id: number;
  codigoPsicologia: string;
  condicaoPrincipal: string;
  sinaisChave: string | null;
  indicacaoInicial: string | null;
  encaminhamento: string | null;
  status: string;
}

const EMPTY: Omit<Psicologia, "id"> = {
  codigoPsicologia: "", condicaoPrincipal: "", sinaisChave: "", indicacaoInicial: "", encaminhamento: "", status: "ATIVO",
};

export default function PsicologiaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Psicologia | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading } = useQuery<Psicologia[]>({
    queryKey: ["psicologia"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/catalogo/psicologia`);
      return r.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE}api/catalogo/psicologia/${d.id}` : `${BASE}api/catalogo/psicologia`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["psicologia"] }); toast({ title: "Protocolo salvo" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/catalogo/psicologia/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["psicologia"] }); toast({ title: "Protocolo excluido" }); },
  });

  function open(d?: Psicologia) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const filtered = (data || []).filter(d =>
    `${d.codigoPsicologia} ${d.condicaoPrincipal} ${d.sinaisChave || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Brain className="h-8 w-8 text-purple-400" />
              Psicologia
            </h1>
            <p className="text-muted-foreground mt-1">Protocolos psicologicos e encaminhamentos — {filtered.length} registros</p>
          </div>
          <Button onClick={() => open()} className="gap-2"><Plus className="w-4 h-4" /> Novo Protocolo</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar protocolo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {(editing || creating) && (
          <Card className="border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editing ? "Editar Protocolo" : "Novo Protocolo"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Codigo *</label><Input value={form.codigoPsicologia} onChange={e => setForm({ ...form, codigoPsicologia: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Condicao Principal *</label><Input value={form.condicaoPrincipal} onChange={e => setForm({ ...form, condicaoPrincipal: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Sinais Chave</label><Input value={form.sinaisChave || ""} onChange={e => setForm({ ...form, sinaisChave: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Indicacao Inicial</label><Input value={form.indicacaoInicial || ""} onChange={e => setForm({ ...form, indicacaoInicial: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Encaminhamento</label><Input value={form.encaminhamento || ""} onChange={e => setForm({ ...form, encaminhamento: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => save.mutate(form)} disabled={!form.codigoPsicologia || !form.condicaoPrincipal} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
                <Button variant="outline" onClick={close} className="gap-2"><X className="w-4 h-4" /> Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Condicao Principal</TableHead>
                    <TableHead>Sinais Chave</TableHead>
                    <TableHead>Indicacao</TableHead>
                    <TableHead>Encaminhamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.codigoPsicologia}</TableCell>
                      <TableCell className="font-medium text-sm">{d.condicaoPrincipal}</TableCell>
                      <TableCell className="text-xs max-w-40 truncate text-muted-foreground">{d.sinaisChave || "—"}</TableCell>
                      <TableCell className="text-xs max-w-40 truncate">{d.indicacaoInicial || "—"}</TableCell>
                      <TableCell className="text-xs max-w-40 truncate">{d.encaminhamento || "—"}</TableCell>
                      <TableCell><Badge variant={d.status === "ATIVO" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => open(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(d.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum protocolo encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
