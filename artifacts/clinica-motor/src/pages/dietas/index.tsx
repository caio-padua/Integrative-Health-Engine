import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Apple, Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE = import.meta.env.BASE_URL || "/clinica-motor/";

interface Dieta {
  id: number;
  codigoDieta: string;
  codigoSemantico: string | null;
  b1: string | null;
  b2: string | null;
  b3: string | null;
  b4: string | null;
  seq: string | null;
  modeloDieta: string;
  faixaCalorica: string | null;
  refeicao: string;
  opcao1: string | null;
  opcao2: string | null;
  opcao3: string | null;
  status: string;
}

const EMPTY: Omit<Dieta, "id"> = {
  codigoDieta: "", codigoSemantico: "", b1: "", b2: "", b3: "", b4: "", seq: "",
  modeloDieta: "", faixaCalorica: "", refeicao: "", opcao1: "", opcao2: "", opcao3: "", status: "ATIVO",
};

export default function DietasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Dieta | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading } = useQuery<Dieta[]>({
    queryKey: ["dietas"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/catalogo/dietas`);
      return r.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE}api/catalogo/dietas/${d.id}` : `${BASE}api/catalogo/dietas`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dietas"] }); toast({ title: "Dieta salva" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/catalogo/dietas/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dietas"] }); toast({ title: "Dieta excluida" }); },
  });

  function open(d?: Dieta) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const filtered = (data || []).filter(d =>
    `${d.codigoDieta} ${d.modeloDieta} ${d.refeicao} ${d.faixaCalorica}`.toLowerCase().includes(search.toLowerCase())
  );

  const MODELO_CORES: Record<string, string> = {
    LOW_CARB: "bg-green-500/10 text-green-400 border-green-500/30",
    CETOGENICA: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    MEDITERRANEA: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    PADRAO: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Apple className="h-8 w-8 text-green-400" />
              Dietas
            </h1>
            <p className="text-muted-foreground mt-1">Planos alimentares e opcoes por refeicao — {filtered.length} registros</p>
          </div>
          <Button onClick={() => open()} className="gap-2"><Plus className="w-4 h-4" /> Nova Dieta</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar dieta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {(editing || creating) && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editing ? "Editar Dieta" : "Nova Dieta"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs text-muted-foreground">Codigo Dieta *</label><Input value={form.codigoDieta} onChange={e => setForm({ ...form, codigoDieta: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Modelo Dieta *</label><Input value={form.modeloDieta} onChange={e => setForm({ ...form, modeloDieta: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Refeicao *</label><Input value={form.refeicao} onChange={e => setForm({ ...form, refeicao: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Faixa Calorica</label><Input value={form.faixaCalorica || ""} onChange={e => setForm({ ...form, faixaCalorica: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Codigo Semantico</label><Input value={form.codigoSemantico || ""} onChange={e => setForm({ ...form, codigoSemantico: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">B1</label><Input value={form.b1 || ""} onChange={e => setForm({ ...form, b1: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">B2</label><Input value={form.b2 || ""} onChange={e => setForm({ ...form, b2: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">B3</label><Input value={form.b3 || ""} onChange={e => setForm({ ...form, b3: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">B4</label><Input value={form.b4 || ""} onChange={e => setForm({ ...form, b4: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Seq</label><Input value={form.seq || ""} onChange={e => setForm({ ...form, seq: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Opcao 1</label><Input value={form.opcao1 || ""} onChange={e => setForm({ ...form, opcao1: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Opcao 2</label><Input value={form.opcao2 || ""} onChange={e => setForm({ ...form, opcao2: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Opcao 3</label><Input value={form.opcao3 || ""} onChange={e => setForm({ ...form, opcao3: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => save.mutate(form)} disabled={!form.codigoDieta || !form.modeloDieta || !form.refeicao} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
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
                    <TableHead>Modelo</TableHead>
                    <TableHead>Refeicao</TableHead>
                    <TableHead>Faixa Cal.</TableHead>
                    <TableHead>Opcao 1</TableHead>
                    <TableHead>Opcao 2</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.codigoDieta}</TableCell>
                      <TableCell><Badge variant="outline" className={MODELO_CORES[d.modeloDieta] || ""}>{d.modeloDieta}</Badge></TableCell>
                      <TableCell className="text-sm">{d.refeicao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.faixaCalorica || "—"}</TableCell>
                      <TableCell className="text-xs max-w-32 truncate">{d.opcao1 || "—"}</TableCell>
                      <TableCell className="text-xs max-w-32 truncate">{d.opcao2 || "—"}</TableCell>
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
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma dieta encontrada</TableCell></TableRow>
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
