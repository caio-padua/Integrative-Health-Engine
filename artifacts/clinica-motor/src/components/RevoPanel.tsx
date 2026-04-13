import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Heart, Pill, ArrowDown, ArrowUp, Plus, Edit, Trash2,
  Loader2, RefreshCw, Zap, Brain, ChevronDown, ChevronRight, Save, X
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";
const apiBase = `${window.location.origin}${BASE_URL}api`.replace(/\/+/g, "/").replace(":/", "://");

const INTENSIDADE_COLORS: Record<string, string> = {
  leve: "bg-green-500/20 text-green-400",
  moderada: "bg-yellow-500/20 text-yellow-400",
  alta: "bg-orange-500/20 text-orange-400",
  critica: "bg-red-500/20 text-red-400",
  remissao: "bg-blue-500/20 text-blue-400",
  resolvida: "bg-emerald-500/20 text-emerald-400",
};

const STATUS_MED_COLORS: Record<string, string> = {
  em_uso: "bg-blue-500/20 text-blue-400",
  reduzido: "bg-yellow-500/20 text-yellow-400",
  suspenso: "bg-green-500/20 text-green-400",
  substituido: "bg-purple-500/20 text-purple-400",
};

const SEMAFORO_COLORS: Record<string, string> = {
  verde: "bg-green-500",
  amarelo: "bg-yellow-500",
  vermelho: "bg-red-500",
};

export default function RevoPanel({ pacienteId }: { pacienteId: number }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [patExpanded, setPatExpanded] = useState(true);
  const [medExpanded, setMedExpanded] = useState(true);
  const [orgExpanded, setOrgExpanded] = useState(true);

  const [newPat, setNewPat] = useState({ nome: "", cid10: "", orgaoSistema: "", intensidade: "moderada", medicacao: "", leituraClinica: "" });
  const [addingPat, setAddingPat] = useState(false);
  const [showNewPat, setShowNewPat] = useState(false);

  const [newMed, setNewMed] = useState({ nome: "", dose: "", motivoUso: "", tempoUso: "", criterioReducao: "" });
  const [addingMed, setAddingMed] = useState(false);
  const [showNewMed, setShowNewMed] = useState(false);

  const [editingPat, setEditingPat] = useState<any>(null);
  const [editingMed, setEditingMed] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/master`);
      if (res.ok) setData(await res.json());
    } catch {
      toast({ title: "Erro ao carregar REVO", variant: "destructive" });
    }
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patologias: { diagnosticadas: [], potenciais: [] },
          orgaos: [],
          medicamentos: [],
          resumoClinico: "Snapshot inicial do estado de saude",
        }),
      });
      if (res.ok) {
        toast({ title: "REVO START criado com sucesso!" });
        setStartDialogOpen(false);
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao iniciar REVO", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
    setStarting(false);
  };

  const handleAddPatologia = async () => {
    if (!newPat.nome.trim()) { toast({ title: "Nome da patologia e obrigatorio", variant: "destructive" }); return; }
    setAddingPat(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/patologia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: newPat.nome,
          cid10: newPat.cid10 || null,
          tipo: "diagnosticada",
          orgaoSistema: newPat.orgaoSistema || null,
          intensidadeInicial: newPat.intensidade,
          intensidadeAtual: newPat.intensidade,
          statusSemaforo: newPat.intensidade === "critica" ? "vermelho" : newPat.intensidade === "alta" ? "vermelho" : "amarelo",
          medicacaoAtual: newPat.medicacao || null,
          medicacaoOriginal: newPat.medicacao || null,
          leituraClinica: newPat.leituraClinica || null,
        }),
      });
      if (res.ok) {
        toast({ title: "Patologia adicionada" });
        setNewPat({ nome: "", cid10: "", orgaoSistema: "", intensidade: "moderada", medicacao: "", leituraClinica: "" });
        setShowNewPat(false);
        fetchData();
      }
    } catch { toast({ title: "Erro ao adicionar", variant: "destructive" }); }
    setAddingPat(false);
  };

  const handleUpdatePatologia = async () => {
    if (!editingPat) return;
    try {
      const res = await fetch(`${apiBase}/rasx/revo/patologia/${editingPat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intensidadeAtual: editingPat.intensidadeAtual,
          evolucaoPercentual: editingPat.evolucaoPercentual ? Number(editingPat.evolucaoPercentual) : null,
          statusSemaforo: editingPat.statusSemaforo,
          medicacaoAtual: editingPat.medicacaoAtual,
          substituicaoNatural: editingPat.substituicaoNatural,
          leituraClinica: editingPat.leituraClinica,
        }),
      });
      if (res.ok) {
        toast({ title: "Patologia atualizada" });
        setEditingPat(null);
        fetchData();
      }
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
  };

  const handleDeletePatologia = async (id: number) => {
    try {
      await fetch(`${apiBase}/rasx/revo/patologia/${id}`, { method: "DELETE" });
      toast({ title: "Patologia removida" });
      fetchData();
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const handleAddMedicamento = async () => {
    if (!newMed.nome.trim()) { toast({ title: "Nome do medicamento e obrigatorio", variant: "destructive" }); return; }
    setAddingMed(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/medicamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMed),
      });
      if (res.ok) {
        toast({ title: "Medicamento adicionado" });
        setNewMed({ nome: "", dose: "", motivoUso: "", tempoUso: "", criterioReducao: "" });
        setShowNewMed(false);
        fetchData();
      }
    } catch { toast({ title: "Erro ao adicionar", variant: "destructive" }); }
    setAddingMed(false);
  };

  const handleUpdateMedicamento = async () => {
    if (!editingMed) return;
    try {
      const res = await fetch(`${apiBase}/rasx/revo/medicamento/${editingMed.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusAtual: editingMed.statusAtual,
          substituicaoNatural: editingMed.substituicaoNatural,
          evidenciaMelhora: editingMed.evidenciaMelhora,
        }),
      });
      if (res.ok) {
        toast({ title: "Medicamento atualizado" });
        setEditingMed(null);
        fetchData();
      }
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
  };

  const handleDeleteMedicamento = async (id: number) => {
    try {
      await fetch(`${apiBase}/rasx/revo/medicamento/${id}`, { method: "DELETE" });
      toast({ title: "Medicamento removido" });
      fetchData();
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.temRevo) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-8 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-1">Nenhum registro REVO encontrado.</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            O RASX REVO acompanha a evolucao clinica integrativa do paciente: patologias, orgaos, medicamentos, substituicoes e curvas de saude.
          </p>
          <Button onClick={() => setStartDialogOpen(true)}>
            <Zap className="w-4 h-4 mr-2" /> Iniciar REVO
          </Button>
          <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar RASX REVO</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Isso cria o snapshot inicial do estado de saude do paciente. Patologias, orgaos e medicamentos podem ser adicionados depois.
              </p>
              <Button onClick={handleStart} disabled={starting} className="w-full mt-4">
                {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {starting ? "Criando..." : "Criar Snapshot Inicial"}
              </Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const patDiag = data.patologias?.diagnosticadas || [];
  const patPot = data.patologias?.potenciais || [];
  const meds = data.medicamentos || [];
  const orgaos = data.orgaos || [];
  const curvaDoenca = data.curvas?.doenca || [];
  const curvaSaude = data.curvas?.saude || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">RASX REVO — Estado Evolutivo de Saude</h2>
          <Badge variant="outline" className="text-[10px]">V2</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={Heart} label="Patologias" value={patDiag.length} color="text-red-400" />
        <MiniStat icon={Brain} label="Potenciais" value={patPot.length} color="text-yellow-400" />
        <MiniStat icon={Pill} label="Medicamentos" value={meds.length} color="text-blue-400" />
        <MiniStat icon={Activity} label="Orgaos" value={orgaos.length} color="text-purple-400" />
      </div>

      {(curvaDoenca.length > 0 || curvaSaude.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-red-400" /> Curva Declinante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {curvaDoenca.map((c: any, i: number) => (
                <CurvaBar key={i} label={c.indicador.replace(/_/g, " ")} valor={c.valor} color="bg-red-500" />
              ))}
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-green-400" /> Curva Ascendente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {curvaSaude.map((c: any, i: number) => (
                <CurvaBar key={i} label={c.indicador.replace(/_/g, " ")} valor={c.valor} color="bg-green-500" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setPatExpanded(!patExpanded)}>
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {patExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Heart className="w-4 h-4 text-red-400" />
              <span>Patologias</span>
              <Badge variant="outline" className="text-[10px] ml-2">{patDiag.length + patPot.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowNewPat(true); setPatExpanded(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Nova
            </Button>
          </CardTitle>
        </CardHeader>
        {patExpanded && (
          <CardContent className="pt-0">
            {showNewPat && (
              <div className="border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
                <p className="text-xs font-medium text-primary">Nova Patologia</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nome da patologia" value={newPat.nome} onChange={e => setNewPat(p => ({ ...p, nome: e.target.value }))} />
                  <Input placeholder="CID-10" value={newPat.cid10} onChange={e => setNewPat(p => ({ ...p, cid10: e.target.value }))} />
                  <Input placeholder="Orgao / Sistema" value={newPat.orgaoSistema} onChange={e => setNewPat(p => ({ ...p, orgaoSistema: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={newPat.intensidade} onValueChange={v => setNewPat(p => ({ ...p, intensidade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderada">Moderada</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Critica</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Medicacao atual" value={newPat.medicacao} onChange={e => setNewPat(p => ({ ...p, medicacao: e.target.value }))} />
                  <Input placeholder="Leitura clinica" value={newPat.leituraClinica} onChange={e => setNewPat(p => ({ ...p, leituraClinica: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewPat(false)}><X className="w-3 h-3 mr-1" /> Cancelar</Button>
                  <Button size="sm" onClick={handleAddPatologia} disabled={addingPat}>
                    {addingPat ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 px-1">Patologia</th>
                    <th className="text-left py-2 px-1">Orgao</th>
                    <th className="text-center py-2 px-1">Inicial</th>
                    <th className="text-center py-2 px-1">Atual</th>
                    <th className="text-left py-2 px-1">Medicacao</th>
                    <th className="text-left py-2 px-1">Substituicao</th>
                    <th className="text-left py-2 px-1">Leitura</th>
                    <th className="text-center py-2 px-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {patDiag.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-muted/5 group">
                      <td className="py-2 px-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${SEMAFORO_COLORS[p.statusSemaforo] || "bg-gray-500"}`} />
                          <span className="font-medium">{p.nome}</span>
                          {p.cid10 && <span className="text-[9px] text-muted-foreground">({p.cid10})</span>}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-muted-foreground">{p.orgaoSistema || "—"}</td>
                      <td className="py-2 px-1 text-center">
                        {p.intensidadeInicial && <Badge variant="outline" className={`text-[9px] ${INTENSIDADE_COLORS[p.intensidadeInicial] || ""}`}>{p.intensidadeInicial}</Badge>}
                      </td>
                      <td className="py-2 px-1 text-center">
                        {p.intensidadeAtual && <Badge variant="outline" className={`text-[9px] ${INTENSIDADE_COLORS[p.intensidadeAtual] || ""}`}>{p.intensidadeAtual}</Badge>}
                        {p.evolucaoPercentual != null && <span className="text-[9px] text-muted-foreground ml-1">{p.evolucaoPercentual}%</span>}
                      </td>
                      <td className="py-2 px-1 text-xs text-muted-foreground">{p.medicacaoAtual || "—"}</td>
                      <td className="py-2 px-1 text-xs text-muted-foreground">{p.substituicaoNatural || "—"}</td>
                      <td className="py-2 px-1 text-xs text-muted-foreground truncate max-w-[150px]">{p.leituraClinica || "—"}</td>
                      <td className="py-2 px-1">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingPat({ ...p })}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => handleDeletePatologia(p.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {patDiag.length === 0 && (
                    <tr><td colSpan={8} className="py-4 text-center text-muted-foreground text-xs">Nenhuma patologia registrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setMedExpanded(!medExpanded)}>
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {medExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Pill className="w-4 h-4 text-blue-400" />
              <span>Medicamentos e Transicao Terapeutica</span>
              <Badge variant="outline" className="text-[10px] ml-2">{meds.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowNewMed(true); setMedExpanded(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Novo
            </Button>
          </CardTitle>
        </CardHeader>
        {medExpanded && (
          <CardContent className="pt-0">
            {showNewMed && (
              <div className="border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
                <p className="text-xs font-medium text-primary">Novo Medicamento</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nome" value={newMed.nome} onChange={e => setNewMed(m => ({ ...m, nome: e.target.value }))} />
                  <Input placeholder="Dose" value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))} />
                  <Input placeholder="Motivo de uso" value={newMed.motivoUso} onChange={e => setNewMed(m => ({ ...m, motivoUso: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Tempo de uso" value={newMed.tempoUso} onChange={e => setNewMed(m => ({ ...m, tempoUso: e.target.value }))} />
                  <Input placeholder="Criterio de reducao" value={newMed.criterioReducao} onChange={e => setNewMed(m => ({ ...m, criterioReducao: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewMed(false)}><X className="w-3 h-3 mr-1" /> Cancelar</Button>
                  <Button size="sm" onClick={handleAddMedicamento} disabled={addingMed}>
                    {addingMed ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border/20">
              {meds.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 group hover:bg-muted/5">
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.nome}</span>
                        {m.dose && <span className="text-xs text-muted-foreground">{m.dose}</span>}
                        <Badge variant="outline" className={`text-[9px] ${STATUS_MED_COLORS[m.statusAtual] || ""}`}>
                          {(m.statusAtual || "em_uso").replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-[10px] text-muted-foreground mt-0.5">
                        {m.motivoUso && <span>Motivo: {m.motivoUso}</span>}
                        {m.tempoUso && <span>Tempo: {m.tempoUso}</span>}
                        {m.substituicaoNatural && <span className="text-green-400">Substituicao: {m.substituicaoNatural}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingMed({ ...m })}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => handleDeleteMedicamento(m.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {meds.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-4">Nenhum medicamento registrado</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {orgaos.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setOrgExpanded(!orgExpanded)}>
            <CardTitle className="flex items-center gap-2 text-base">
              {orgExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Orgaos e Sistemas Afetados</span>
              <Badge variant="outline" className="text-[10px] ml-2">{orgaos.length}</Badge>
            </CardTitle>
          </CardHeader>
          {orgExpanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {orgaos.map((o: any) => (
                  <div key={o.id} className="p-2 border border-border/30 bg-muted/5">
                    <p className="text-sm font-medium">{o.orgaoSistema}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={`text-[9px] ${INTENSIDADE_COLORS[o.intensidade] || ""}`}>{o.intensidade}</Badge>
                      <Badge variant="outline" className="text-[9px]">Risco: {o.riscoPrognostico}</Badge>
                    </div>
                    {o.observacao && <p className="text-[10px] text-muted-foreground mt-1">{o.observacao}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={!!editingPat} onOpenChange={() => setEditingPat(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Patologia — {editingPat?.nome}</DialogTitle>
          </DialogHeader>
          {editingPat && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Intensidade Atual</label>
                  <Select value={editingPat.intensidadeAtual || ""} onValueChange={v => setEditingPat((p: any) => ({ ...p, intensidadeAtual: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderada">Moderada</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Critica</SelectItem>
                      <SelectItem value="remissao">Remissao</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Semaforo</label>
                  <Select value={editingPat.statusSemaforo || ""} onValueChange={v => setEditingPat((p: any) => ({ ...p, statusSemaforo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verde">Verde</SelectItem>
                      <SelectItem value="amarelo">Amarelo</SelectItem>
                      <SelectItem value="vermelho">Vermelho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Evolucao %</label>
                <Input type="number" value={editingPat.evolucaoPercentual || ""} onChange={e => setEditingPat((p: any) => ({ ...p, evolucaoPercentual: e.target.value }))} placeholder="Ex: -30 (reducao 30%)" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Medicacao Atual</label>
                <Input value={editingPat.medicacaoAtual || ""} onChange={e => setEditingPat((p: any) => ({ ...p, medicacaoAtual: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Substituicao Natural</label>
                <Input value={editingPat.substituicaoNatural || ""} onChange={e => setEditingPat((p: any) => ({ ...p, substituicaoNatural: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Leitura Clinica</label>
                <Input value={editingPat.leituraClinica || ""} onChange={e => setEditingPat((p: any) => ({ ...p, leituraClinica: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleUpdatePatologia}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMed} onOpenChange={() => setEditingMed(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Medicamento — {editingMed?.nome}</DialogTitle>
          </DialogHeader>
          {editingMed && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Status Atual</label>
                <Select value={editingMed.statusAtual || ""} onValueChange={v => setEditingMed((m: any) => ({ ...m, statusAtual: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_uso">Em Uso</SelectItem>
                    <SelectItem value="reduzido">Reduzido</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="substituido">Substituido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Substituicao Natural</label>
                <Input value={editingMed.substituicaoNatural || ""} onChange={e => setEditingMed((m: any) => ({ ...m, substituicaoNatural: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Evidencia de Melhora</label>
                <Input value={editingMed.evidenciaMelhora || ""} onChange={e => setEditingMed((m: any) => ({ ...m, evidenciaMelhora: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleUpdateMedicamento}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CurvaBar({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-32 capitalize truncate">{label}</span>
      <div className="flex-1 h-3 bg-muted/20 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
      </div>
      <span className="text-[10px] font-mono w-8 text-right">{valor}%</span>
    </div>
  );
}
