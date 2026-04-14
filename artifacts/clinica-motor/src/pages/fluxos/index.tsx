import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, CheckCircle2, AlertCircle, Lock, ChevronRight, Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface Etapa {
  id: number;
  codigoFluxo: string;
  tipoProcedimento: string;
  etapaOrdem: number;
  etapaNome: string;
  perfilResponsavel: string;
  requerido: boolean;
  condicional: boolean;
  regraCondicional: string | null;
  podeBypass: boolean;
  exigeJustificativa: boolean;
  bloqueiaSeoPendente: boolean;
  observacao: string | null;
  ativo: boolean;
}

const TIPO_CORES: Record<string, string> = {
  CONSULTA: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  INFUSAO: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  IMPLANTE: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Consulta",
  INFUSAO: "Infusao",
  IMPLANTE: "Implante",
};

const EMPTY: Partial<Etapa> = {
  codigoFluxo: "", tipoProcedimento: "CONSULTA", etapaOrdem: 1,
  etapaNome: "", perfilResponsavel: "", requerido: true, condicional: false,
  regraCondicional: "", podeBypass: false, exigeJustificativa: false,
  bloqueiaSeoPendente: false, observacao: "", ativo: true,
};

export default function FluxosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Etapa | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading, isError } = useQuery<{ fluxos: Record<string, Etapa[]>; total: number }>({
    queryKey: ["fluxos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/fluxos`);
      if (!res.ok) throw new Error("Erro ao carregar fluxos");
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE_URL}api/fluxos/${d.id}` : `${BASE_URL}api/fluxos`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fluxos"] }); toast({ title: "Etapa salva" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE_URL}api/fluxos/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fluxos"] }); toast({ title: "Etapa excluida" }); },
  });

  function open(d?: Etapa) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  const tipos = data ? Object.keys(data.fluxos) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitBranch className="h-8 w-8 text-primary" />
              Fluxos de Aprovacao
            </h1>
            <p className="text-muted-foreground mt-1">
              Etapas e responsaveis em cada fluxo de procedimento do Pawards V15.
            </p>
          </div>
          <Button onClick={() => open()}>
            <Plus className="w-4 h-4 mr-1" /> Nova Etapa
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        )}

        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Erro ao carregar fluxos de aprovacao.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && tipos.map((tipo) => {
          const etapas = data!.fluxos[tipo];
          return (
            <Card key={tipo} className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-md border ${TIPO_CORES[tipo] || "bg-muted text-muted-foreground"}`}>
                    {TIPO_LABELS[tipo] || tipo}
                  </span>
                  <span className="text-lg font-semibold">{etapas[0]?.codigoFluxo}</span>
                  <span className="text-sm text-muted-foreground font-normal ml-auto">
                    {etapas.length} etapas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {etapas.map((etapa, idx) => (
                    <div key={etapa.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {etapa.etapaOrdem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{etapa.etapaNome}</span>
                            {etapa.condicional && <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">Condicional</Badge>}
                            {!etapa.requerido && <Badge variant="outline" className="text-muted-foreground text-xs">Opcional</Badge>}
                            {etapa.podeBypass && <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">Pode Bypass</Badge>}
                            {etapa.exigeJustificativa && <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">Exige Justificativa</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              Responsavel: <span className="text-foreground font-medium">{etapa.perfilResponsavel}</span>
                            </span>
                            {etapa.regraCondicional && (
                              <span className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2 py-0.5 rounded">{etapa.regraCondicional}</span>
                            )}
                          </div>
                          {etapa.observacao && <p className="text-xs text-muted-foreground mt-0.5">{etapa.observacao}</p>}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button onClick={() => open(etapa)} className="p-1 hover:bg-muted rounded opacity-60 hover:opacity-100">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => { if (confirm("Excluir esta etapa?")) del.mutate(etapa.id); }} className="p-1 hover:bg-muted rounded opacity-60 hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                          {etapa.requerido ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-muted-foreground/50" />}
                          {etapa.bloqueiaSeoPendente && <Lock className="w-4 h-4 text-orange-400/70" title="Bloqueia se pendente" />}
                        </div>
                      </div>
                      {idx < etapas.length - 1 && (
                        <div className="flex items-center ml-4 my-1">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 rotate-90" />
                        </div>
                      )}
                      {idx < etapas.length - 1 && <Separator className="mt-2 opacity-20" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(editing || creating) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={close}>
          <div className="bg-card rounded-lg p-6 w-full max-w-lg space-y-4 border shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editing ? "Editar Etapa" : "Nova Etapa"}</h3>
              <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Codigo Fluxo</label>
                <Input value={form.codigoFluxo || ""} onChange={e => setForm({ ...form, codigoFluxo: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo Procedimento</label>
                <Select value={form.tipoProcedimento || "CONSULTA"} onValueChange={v => setForm({ ...form, tipoProcedimento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTA">Consulta</SelectItem>
                    <SelectItem value="INFUSAO">Infusao</SelectItem>
                    <SelectItem value="IMPLANTE">Implante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ordem</label>
                <Input type="number" value={form.etapaOrdem || 1} onChange={e => setForm({ ...form, etapaOrdem: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Perfil Responsavel</label>
                <Input value={form.perfilResponsavel || ""} onChange={e => setForm({ ...form, perfilResponsavel: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Nome Etapa</label>
                <Input value={form.etapaNome || ""} onChange={e => setForm({ ...form, etapaNome: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Regra Condicional</label>
                <Input value={form.regraCondicional || ""} onChange={e => setForm({ ...form, regraCondicional: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Observacao</label>
                <Input value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><Switch checked={form.requerido ?? true} onCheckedChange={v => setForm({ ...form, requerido: v })} /> Requerido</label>
              <label className="flex items-center gap-2"><Switch checked={form.condicional ?? false} onCheckedChange={v => setForm({ ...form, condicional: v })} /> Condicional</label>
              <label className="flex items-center gap-2"><Switch checked={form.podeBypass ?? false} onCheckedChange={v => setForm({ ...form, podeBypass: v })} /> Pode Bypass</label>
              <label className="flex items-center gap-2"><Switch checked={form.exigeJustificativa ?? false} onCheckedChange={v => setForm({ ...form, exigeJustificativa: v })} /> Exige Justificativa</label>
              <label className="flex items-center gap-2"><Switch checked={form.bloqueiaSeoPendente ?? false} onCheckedChange={v => setForm({ ...form, bloqueiaSeoPendente: v })} /> Bloqueia se Pendente</label>
            </div>
            <div className="flex justify-between">
              {editing && (
                <Button variant="destructive" size="sm" onClick={() => { if (confirm("Excluir?")) { del.mutate(editing.id); close(); } }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button onClick={() => save.mutate(editing ? { ...form, id: editing.id } : form)}>
                  <Save className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
