import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Plus, Pencil, Trash2, X, Save, Search, Building2, Calendar, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE = import.meta.env.BASE_URL || "/clinica-motor/";

interface Contrato {
  id: number;
  unidadeId: number;
  unidadeNome?: string;
  consultoriaId: number | null;
  modeloCobranca: string;
  valorMensalFixo: string | null;
  creditosDemandas: number | null;
  creditosUsados: number;
  valorOnboarding: string | null;
  onboardingPago: boolean;
  status: string;
  dataInicio: string;
  dataFim: string | null;
  observacoes: string | null;
}

const EMPTY: Partial<Contrato> = {
  unidadeId: 0, consultoriaId: null, modeloCobranca: "por_demanda", valorMensalFixo: "",
  creditosDemandas: null, valorOnboarding: "", onboardingPago: false, status: "trial", dataFim: null, observacoes: "",
};

const STATUS_CORES: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-400 border-green-500/30",
  trial: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  suspenso: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/30",
};

const MODELO_LABELS: Record<string, string> = {
  full: "Full Service",
  pacote: "Pacote",
  por_demanda: "Por Demanda",
};

export default function ContratosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading } = useQuery<{ contratos: Contrato[] }>({
    queryKey: ["contratos"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/contratos`);
      return r.json();
    },
  });

  const unidadesQ = useQuery<any[]>({
    queryKey: ["unidades-list"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/unidades`);
      const j = await r.json();
      return j.unidades || j;
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE}api/contratos/${d.id}` : `${BASE}api/contratos`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contratos"] }); toast({ title: "Contrato salvo" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/contratos/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contratos"] }); toast({ title: "Contrato excluido" }); },
  });

  function open(d?: Contrato) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const contratos = data?.contratos || [];
  const filtered = contratos.filter((c: any) =>
    `${c.unidadeNome || ""} ${c.modeloCobranca} ${c.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const unidades = unidadesQ.data || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSignature className="h-8 w-8 text-amber-400" />
              Contratos
            </h1>
            <p className="text-muted-foreground mt-1">Contratos de clinicas e modelos de cobranca — {filtered.length} contratos</p>
          </div>
          <Button onClick={() => open()} className="gap-2"><Plus className="w-4 h-4" /> Novo Contrato</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar contrato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {(editing || creating) && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editing ? "Editar Contrato" : "Novo Contrato"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Unidade *</label>
                  <select value={form.unidadeId || ""} onChange={e => setForm({ ...form, unidadeId: Number(e.target.value) })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="">Selecionar...</option>
                    {unidades.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Modelo Cobranca</label>
                  <select value={form.modeloCobranca} onChange={e => setForm({ ...form, modeloCobranca: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="full">Full Service</option><option value="pacote">Pacote</option><option value="por_demanda">Por Demanda</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border bg-background text-sm text-foreground">
                    <option value="trial">Trial</option><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option><option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Valor Mensal Fixo</label><Input type="number" step="0.01" value={form.valorMensalFixo || ""} onChange={e => setForm({ ...form, valorMensalFixo: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Creditos Demandas</label><Input type="number" value={form.creditosDemandas || ""} onChange={e => setForm({ ...form, creditosDemandas: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><label className="text-xs text-muted-foreground">Valor Onboarding</label><Input type="number" step="0.01" value={form.valorOnboarding || ""} onChange={e => setForm({ ...form, valorOnboarding: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Data Fim</label><Input type="date" value={form.dataFim ? form.dataFim.slice(0, 10) : ""} onChange={e => setForm({ ...form, dataFim: e.target.value || null })} /></div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.onboardingPago} onChange={e => setForm({ ...form, onboardingPago: e.target.checked })} className="w-4 h-4" />
                    Onboarding Pago
                  </label>
                </div>
                <div className="col-span-2 md:col-span-3"><label className="text-xs text-muted-foreground">Observacoes</label><Input value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => save.mutate(form)} disabled={!form.unidadeId} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
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
                    <TableHead>Unidade</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Creditos</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead className="w-24">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />{c.unidadeNome || `Unidade #${c.unidadeId}`}</TableCell>
                      <TableCell><Badge variant="outline">{MODELO_LABELS[c.modeloCobranca] || c.modeloCobranca}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_CORES[c.status] || ""}>{c.status.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-sm">{c.valorMensalFixo ? <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {parseFloat(c.valorMensalFixo).toFixed(2)}</span> : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.creditosDemandas != null ? `${c.creditosUsados}/${c.creditosDemandas}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => open(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir contrato?")) del.mutate(c.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum contrato encontrado</TableCell></TableRow>
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
