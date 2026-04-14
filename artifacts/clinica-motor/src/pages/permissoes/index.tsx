import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Check, X, Plus, Pencil, Trash2, Save } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface PerfilPermissao {
  id: number;
  perfil: string;
  escopo: string;
  podeEditarQuestionario: boolean;
  podeValidar: boolean;
  podeBypass: boolean;
  podeEmitirNf: boolean;
  podeVerDadosOutrasEmpresas: boolean;
  observacao: string | null;
  ativo: boolean;
}

const EMPTY: Partial<PerfilPermissao> = {
  perfil: "", escopo: "", podeEditarQuestionario: false,
  podeValidar: false, podeBypass: false, podeEmitirNf: false,
  podeVerDadosOutrasEmpresas: false, observacao: "", ativo: true,
};

const ESCOPO_CORES: Record<string, string> = {
  "OPERACIONAL": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "EXECUCAO ASSISTENCIAL": "bg-green-500/10 text-green-400 border-green-500/30",
  "CLINICO": "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "CLINICO + GESTAO": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "GOVERNANCA CENTRAL": "bg-primary/20 text-primary border-primary/30",
  "RECEBIMENTO": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "EMISSAO": "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

function BoolCell({ val }: { val: boolean }) {
  return val ? (
    <span className="flex justify-center"><Check className="w-4 h-4 text-green-500" /></span>
  ) : (
    <span className="flex justify-center"><X className="w-4 h-4 text-muted-foreground/30" /></span>
  );
}

export default function PermissoesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<PerfilPermissao | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data, isLoading, isError } = useQuery<{ perfis: PerfilPermissao[]; total: number }>({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/permissoes`);
      if (!res.ok) throw new Error("Erro ao carregar permissoes");
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const url = d.id ? `${BASE_URL}api/permissoes/${d.id}` : `${BASE_URL}api/permissoes`;
      const r = await fetch(url, { method: d.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissoes"] }); toast({ title: "Perfil salvo" }); close(); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE_URL}api/permissoes/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissoes"] }); toast({ title: "Perfil excluido" }); },
  });

  function open(d?: PerfilPermissao) {
    if (d) { setEditing(d); setForm({ ...d }); setCreating(false); }
    else { setEditing(null); setForm({ ...EMPTY }); setCreating(true); }
  }
  function close() { setEditing(null); setCreating(false); setForm({ ...EMPTY }); }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-primary" />
              Perfis e Permissoes
            </h1>
            <p className="text-muted-foreground mt-1">
              Mapa de permissoes por perfil de usuario — Pawards.
            </p>
          </div>
          <Button onClick={() => open()}>
            <Plus className="w-4 h-4 mr-1" /> Novo Perfil
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Erro ao carregar perfis de permissao.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && data && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {data.total} Perfis Configurados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Perfil</TableHead>
                      <TableHead className="min-w-[200px]">Escopo</TableHead>
                      <TableHead className="text-center">Editar Quest.</TableHead>
                      <TableHead className="text-center">Validar</TableHead>
                      <TableHead className="text-center">Bypass</TableHead>
                      <TableHead className="text-center">Emitir NF</TableHead>
                      <TableHead className="text-center">Ver Outras Unidades</TableHead>
                      <TableHead>Observacao</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.perfis.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><span className="font-semibold text-sm">{p.perfil}</span></TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${ESCOPO_CORES[p.escopo] || "bg-muted text-muted-foreground"}`}>
                            {p.escopo}
                          </span>
                        </TableCell>
                        <TableCell className="text-center"><BoolCell val={p.podeEditarQuestionario} /></TableCell>
                        <TableCell className="text-center"><BoolCell val={p.podeValidar} /></TableCell>
                        <TableCell className="text-center"><BoolCell val={p.podeBypass} /></TableCell>
                        <TableCell className="text-center"><BoolCell val={p.podeEmitirNf} /></TableCell>
                        <TableCell className="text-center"><BoolCell val={p.podeVerDadosOutrasEmpresas} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.observacao || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => open(p)} className="p-1 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            <button onClick={() => { if (confirm("Excluir perfil?")) del.mutate(p.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {(editing || creating) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={close}>
          <div className="bg-card rounded-lg p-6 w-full max-w-lg space-y-4 border shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editing ? "Editar Perfil" : "Novo Perfil"}</h3>
              <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Perfil</label>
                <Input value={form.perfil || ""} onChange={e => setForm({ ...form, perfil: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Escopo</label>
                <Input value={form.escopo || ""} onChange={e => setForm({ ...form, escopo: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Observacao</label>
                <Input value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><Switch checked={form.podeEditarQuestionario ?? false} onCheckedChange={v => setForm({ ...form, podeEditarQuestionario: v })} /> Editar Questionario</label>
              <label className="flex items-center gap-2"><Switch checked={form.podeValidar ?? false} onCheckedChange={v => setForm({ ...form, podeValidar: v })} /> Validar</label>
              <label className="flex items-center gap-2"><Switch checked={form.podeBypass ?? false} onCheckedChange={v => setForm({ ...form, podeBypass: v })} /> Bypass</label>
              <label className="flex items-center gap-2"><Switch checked={form.podeEmitirNf ?? false} onCheckedChange={v => setForm({ ...form, podeEmitirNf: v })} /> Emitir NF</label>
              <label className="flex items-center gap-2"><Switch checked={form.podeVerDadosOutrasEmpresas ?? false} onCheckedChange={v => setForm({ ...form, podeVerDadosOutrasEmpresas: v })} /> Ver Outras Unidades</label>
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
