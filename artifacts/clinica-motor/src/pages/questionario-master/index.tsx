import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE = import.meta.env.BASE_URL || "/clinica-motor/";

interface Pergunta {
  id: number;
  bloco: string;
  perguntaId: string;
  pergunta: string;
  tipoResposta: string | null;
  obrigatorio: string | null;
  exemplo: string | null;
  observacao: string | null;
}

const EMPTY: Omit<Pergunta, "id"> = {
  bloco: "", perguntaId: "", pergunta: "", tipoResposta: "", obrigatorio: "SIM", exemplo: "", observacao: "",
};

const BLOCO_CORES: Record<string, string> = {
  IDENTIFICACAO: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  HISTORICO: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  HABITOS: "bg-green-500/10 text-green-400 border-green-500/30",
  QUEIXA: "bg-red-500/10 text-red-400 border-red-500/30",
  MEDICAMENTOS: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  EXAMES: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  OBJETIVOS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

export default function QuestionarioMasterPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Pergunta | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading } = useQuery<Pergunta[]>({
    queryKey: ["questionario-master"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/catalogo/questionario`);
      return r.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE}api/catalogo/questionario/${d.id}` : `${BASE}api/catalogo/questionario`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["questionario-master"] }); toast({ title: "Pergunta salva" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/catalogo/questionario/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["questionario-master"] }); toast({ title: "Pergunta excluida" }); },
  });

  function open(d?: Pergunta) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const filtered = (data || []).filter(d =>
    `${d.bloco} ${d.perguntaId} ${d.pergunta}`.toLowerCase().includes(search.toLowerCase())
  );

  const blocos = [...new Set(filtered.map(f => f.bloco))];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Questionario Master
            </h1>
            <p className="text-muted-foreground mt-1">Perguntas base para anamnese e triagem — {filtered.length} perguntas em {blocos.length} blocos</p>
          </div>
          <Button onClick={() => open()} className="gap-2"><Plus className="w-4 h-4" /> Nova Pergunta</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pergunta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {(editing || creating) && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editing ? "Editar Pergunta" : "Nova Pergunta"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Bloco *</label><Input value={form.bloco} onChange={e => setForm({ ...form, bloco: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">ID Pergunta *</label><Input value={form.perguntaId} onChange={e => setForm({ ...form, perguntaId: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Tipo Resposta</label><Input value={form.tipoResposta || ""} onChange={e => setForm({ ...form, tipoResposta: e.target.value })} /></div>
                <div className="col-span-2"><label className="text-xs text-muted-foreground">Pergunta *</label><Input value={form.pergunta} onChange={e => setForm({ ...form, pergunta: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Obrigatorio</label>
                  <select value={form.obrigatorio || "SIM"} onChange={e => setForm({ ...form, obrigatorio: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="SIM">SIM</option><option value="NAO">NAO</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="text-xs text-muted-foreground">Exemplo</label><Input value={form.exemplo || ""} onChange={e => setForm({ ...form, exemplo: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Observacao</label><Input value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => save.mutate(form)} disabled={!form.bloco || !form.perguntaId || !form.pergunta} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
                <Button variant="outline" onClick={close} className="gap-2"><X className="w-4 h-4" /> Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : blocos.map(bloco => (
          <Card key={bloco}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className={BLOCO_CORES[bloco] || ""}>{bloco}</Badge>
                <span className="text-muted-foreground text-sm font-normal">({filtered.filter(f => f.bloco === bloco).length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">ID</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="w-28">Tipo</TableHead>
                    <TableHead className="w-20">Obrig.</TableHead>
                    <TableHead className="w-24">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter(f => f.bloco === bloco).map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.perguntaId}</TableCell>
                      <TableCell className="text-sm">{d.pergunta}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.tipoResposta || "—"}</TableCell>
                      <TableCell><Badge variant={d.obrigatorio === "SIM" ? "default" : "secondary"} className="text-[10px]">{d.obrigatorio || "—"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => open(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(d.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma pergunta encontrada</CardContent></Card>
        )}
      </div>
    </Layout>
  );
}
