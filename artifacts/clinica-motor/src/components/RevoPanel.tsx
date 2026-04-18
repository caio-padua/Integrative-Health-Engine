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
  Loader2, RefreshCw, Zap, Brain, ChevronDown, ChevronRight, Save, X,
  Download, Clock, FileText, History, Target, CheckCircle2, AlertTriangle
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

  const [newMed, setNewMed] = useState({ tipoMed: "remedio" as "remedio"|"formula", nome: "", dose: "", posologia: "", motivoUso: "", tempoUso: "", criterioReducao: "", componentesFormula: [] as Array<{substancia:string;dosagem:string}> });
  const [addingMed, setAddingMed] = useState(false);
  const [showNewMed, setShowNewMed] = useState(false);
  const [newComponente, setNewComponente] = useState({ substancia: "", dosagem: "" });

  const [editingPat, setEditingPat] = useState<any>(null);
  const [editingMed, setEditingMed] = useState<any>(null);

  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [etapasExpanded, setEtapasExpanded] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [showNewEvento, setShowNewEvento] = useState(false);
  const [newEvento, setNewEvento] = useState({ medicamentoId: "", data: "", apresentacao: "", posologia: "", status: "ATIVO", substituicaoNatural: "", leituraClinica: "" });
  const [addingEvento, setAddingEvento] = useState(false);

  const [showNewEtapa, setShowNewEtapa] = useState(false);
  const [newEtapa, setNewEtapa] = useState({ tipo: "exame", descricao: "", dataPrevista: "", prioridade: "media" });
  const [addingEtapa, setAddingEtapa] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [tratamentoAtivo, setTratamentoAtivo] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/master`);
      if (res.ok) setData(await res.json());
      const tRes = await fetch(`${apiBase}/tratamentos?pacienteId=${pacienteId}`);
      if (tRes.ok) {
        const lista = await tRes.json();
        const ativo = (lista || []).find((t: any) => t.status !== "cancelado") || lista?.[0];
        if (ativo?.id) {
          const detRes = await fetch(`${apiBase}/financeiro/tratamentos/${ativo.id}`);
          if (detRes.ok) setTratamentoAtivo(await detRes.json());
        }
      }
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
    if (newMed.tipoMed === "formula" && newMed.componentesFormula.length === 0) { toast({ title: "Adicione pelo menos uma substancia na formula", variant: "destructive" }); return; }
    setAddingMed(true);
    try {
      const payload: any = {
        nome: newMed.nome,
        dose: newMed.dose,
        posologia: newMed.posologia,
        motivoUso: newMed.motivoUso,
        tempoUso: newMed.tempoUso,
        criterioReducao: newMed.criterioReducao,
        tipoMed: newMed.tipoMed,
        medicamentoDoseInline: newMed.tipoMed === "remedio" ? `${newMed.nome} ${newMed.dose}`.trim() : newMed.nome,
      };
      if (newMed.tipoMed === "formula") payload.componentesFormula = newMed.componentesFormula;
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/revo/medicamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: newMed.tipoMed === "formula" ? "Formula adicionada" : "Medicamento adicionado" });
        setNewMed({ tipoMed: "remedio", nome: "", dose: "", posologia: "", motivoUso: "", tempoUso: "", criterioReducao: "", componentesFormula: [] });
        setNewComponente({ substancia: "", dosagem: "" });
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

  const handleAddEvento = async () => {
    if (!newEvento.medicamentoId || !newEvento.apresentacao) { toast({ title: "Medicamento e apresentacao sao obrigatorios", variant: "destructive" }); return; }
    setAddingEvento(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/evento-medicacao`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvento, medicamentoId: Number(newEvento.medicamentoId) }),
      });
      if (res.ok) {
        toast({ title: "Evento de medicacao adicionado" });
        setShowNewEvento(false);
        setNewEvento({ medicamentoId: "", data: "", apresentacao: "", posologia: "", status: "ATIVO", substituicaoNatural: "", leituraClinica: "" });
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao adicionar evento", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setAddingEvento(false);
  };

  const handleDeleteEvento = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/rasx/evento-medicacao/${id}`, { method: "DELETE" });
      if (res.ok) { toast({ title: "Evento removido" }); fetchData(); }
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const handleAddEtapa = async () => {
    if (!newEtapa.descricao) { toast({ title: "Descricao obrigatoria", variant: "destructive" }); return; }
    setAddingEtapa(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/proxima-etapa`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEtapa),
      });
      if (res.ok) {
        toast({ title: "Proxima etapa adicionada" });
        setShowNewEtapa(false);
        setNewEtapa({ tipo: "exame", descricao: "", dataPrevista: "", prioridade: "media" });
        fetchData();
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setAddingEtapa(false);
  };

  const handleConcluirEtapa = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/rasx/proxima-etapa/${id}/concluir`, { method: "PUT" });
      if (res.ok) { toast({ title: "Etapa concluida" }); fetchData(); }
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const handleDeleteEtapa = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/rasx/proxima-etapa/${id}`, { method: "DELETE" });
      if (res.ok) { toast({ title: "Etapa removida" }); fetchData(); }
      else toast({ title: "Erro ao remover etapa", variant: "destructive" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/arqu/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `RASX_${data?.paciente?.nome || "paciente"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF RASX gerado com sucesso" });
      } else {
        toast({ title: "Erro ao gerar PDF", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setDownloadingPdf(false);
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${apiBase}/rasx/${pacienteId}/audit-log`);
      if (res.ok) setAuditLogs(await res.json());
    } catch {}
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
          <Badge variant="outline" className="text-[10px]">V5</Badge>
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

      {tratamentoAtivo?.itens?.length > 0 && (() => {
        const itens = tratamentoAtivo.itens;
        const linkados = itens.filter((i: any) => i.revoPatologiaId).length;
        const cobertura = Math.round((linkados / itens.length) * 100);
        const patById: Record<number, any> = {};
        for (const p of [...patDiag, ...patPot]) patById[p.id] = p;
        return (
          <Card className="bg-card border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <span className="text-amber-300">⛓</span>
                  <span>Anastomose Genótipo ↔ Fenótipo</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/40">
                    {tratamentoAtivo.nome}
                  </Badge>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-amber-300">{itens.length} itens</span>
                  <span className="text-green-400">{linkados} ligados</span>
                  <span className="text-muted-foreground">{cobertura}% cobertura</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] text-muted-foreground uppercase border-b border-border/30">
                    <tr>
                      <th className="text-left py-2 px-1">Item do Protocolo</th>
                      <th className="text-left py-2 px-1">Código (genótipo)</th>
                      <th className="text-left py-2 px-1">Trata Patologia (fenótipo)</th>
                      <th className="text-right py-2 px-1">Sessões</th>
                      <th className="text-right py-2 px-1">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it: any) => {
                      const pat = it.revoPatologiaId ? patById[it.revoPatologiaId] : null;
                      const tipoColor = it.tipo === "formula" ? "bg-purple-500/20 text-purple-300"
                        : it.tipo === "implante" ? "bg-pink-500/20 text-pink-300"
                        : "bg-blue-500/20 text-blue-300";
                      return (
                        <tr key={it.id} className="border-b border-border/10 hover:bg-muted/5">
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[9px] uppercase ${tipoColor}`}>{it.tipo}</Badge>
                              <span className="font-medium truncate max-w-[420px]" title={it.descricao}>{it.descricao}</span>
                            </div>
                          </td>
                          <td className="py-2 px-1">
                            {it.codigoSemantico ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded">
                                {it.codigoSemantico}
                              </span>
                            ) : <span className="text-red-400 text-[10px]">SEM CÓDIGO</span>}
                          </td>
                          <td className="py-2 px-1">
                            {pat ? (
                              <div className="flex items-center gap-2">
                                <span className="text-amber-300">→</span>
                                <span className={`w-2 h-2 rounded-full ${SEMAFORO_COLORS[pat.statusSemaforo] || "bg-gray-500"}`} />
                                <span className="font-medium">{pat.nome}</span>
                                {pat.cid10 && <span className="text-[9px] text-muted-foreground">({pat.cid10})</span>}
                                <span className="text-[9px] font-mono text-amber-300/70">{pat.codigoSemantico}</span>
                              </div>
                            ) : (
                              <span className="text-red-400 text-[10px]">— sem alvo clínico —</span>
                            )}
                          </td>
                          <td className="py-2 px-1 text-right text-muted-foreground">{it.numeroSessoes || "—"}</td>
                          <td className="py-2 px-1 text-right text-green-400">
                            {it.valorTotal ? `R$ ${Number(it.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`w-2 h-2 rounded-full ${SEMAFORO_COLORS[p.statusSemaforo] || "bg-gray-500"}`} />
                          <span className="font-medium">{p.nome}</span>
                          {p.cid10 && <span className="text-[9px] text-muted-foreground">({p.cid10})</span>}
                          {p.codigoSemantico ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded">
                              {p.codigoSemantico}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded">
                              SEM CÓDIGO
                            </span>
                          )}
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
              <div className="border border-primary/30 bg-primary/5 p-3 mb-3 space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium text-primary">Novo Medicamento</p>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => setNewMed(m => ({ ...m, tipoMed: "remedio", componentesFormula: [] }))}
                      className={`px-3 py-1 text-xs font-medium border ${newMed.tipoMed === "remedio" ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-border bg-muted/10 text-muted-foreground"}`}>
                      Remedio
                    </button>
                    <button onClick={() => setNewMed(m => ({ ...m, tipoMed: "formula" }))}
                      className={`px-3 py-1 text-xs font-medium border ${newMed.tipoMed === "formula" ? "border-purple-500 bg-purple-500/20 text-purple-400" : "border-border bg-muted/10 text-muted-foreground"}`}>
                      Formula
                    </button>
                  </div>
                </div>

                {newMed.tipoMed === "remedio" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Medicamento + dose (ex: Captopril 25mg)" value={newMed.nome} onChange={e => setNewMed(m => ({ ...m, nome: e.target.value }))} />
                      <Input placeholder="Posologia (ex: 1 comp 2x/dia)" value={newMed.posologia} onChange={e => setNewMed(m => ({ ...m, posologia: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Motivo de uso" value={newMed.motivoUso} onChange={e => setNewMed(m => ({ ...m, motivoUso: e.target.value }))} />
                      <Input placeholder="Tempo de uso" value={newMed.tempoUso} onChange={e => setNewMed(m => ({ ...m, tempoUso: e.target.value }))} />
                      <Input placeholder="Criterio de reducao" value={newMed.criterioReducao} onChange={e => setNewMed(m => ({ ...m, criterioReducao: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input placeholder="Nome da formula (ex: Formula Neuroprotetora)" value={newMed.nome} onChange={e => setNewMed(m => ({ ...m, nome: e.target.value }))} />
                    <Input placeholder="Posologia (ex: 2 caps 2x/dia)" value={newMed.posologia} onChange={e => setNewMed(m => ({ ...m, posologia: e.target.value }))} />
                    <div className="border border-purple-500/20 bg-purple-500/5 p-2 space-y-2">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Substancias da Formula</p>
                      {newMed.componentesFormula.length > 0 && (
                        <div className="space-y-1">
                          {newMed.componentesFormula.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs bg-purple-500/10 px-2 py-1">
                              <span className="font-medium text-purple-300">{c.substancia}</span>
                              <span className="text-muted-foreground">{c.dosagem}</span>
                              <button onClick={() => setNewMed(m => ({ ...m, componentesFormula: m.componentesFormula.filter((_, i) => i !== idx) }))}
                                className="ml-auto text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input placeholder="Substancia (ex: Glutationa)" className="flex-1" value={newComponente.substancia}
                          onChange={e => setNewComponente(c => ({ ...c, substancia: e.target.value }))} />
                        <Input placeholder="Dosagem (ex: 250mg)" className="w-32" value={newComponente.dosagem}
                          onChange={e => setNewComponente(c => ({ ...c, dosagem: e.target.value }))} />
                        <Button size="sm" variant="outline" className="shrink-0"
                          onClick={() => {
                            if (!newComponente.substancia.trim()) return;
                            setNewMed(m => ({ ...m, componentesFormula: [...m.componentesFormula, { ...newComponente }] }));
                            setNewComponente({ substancia: "", dosagem: "" });
                          }}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Motivo de uso" value={newMed.motivoUso} onChange={e => setNewMed(m => ({ ...m, motivoUso: e.target.value }))} />
                      <Input placeholder="Tempo de uso" value={newMed.tempoUso} onChange={e => setNewMed(m => ({ ...m, tempoUso: e.target.value }))} />
                      <Input placeholder="Criterio de reducao" value={newMed.criterioReducao} onChange={e => setNewMed(m => ({ ...m, criterioReducao: e.target.value }))} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewMed(false); setNewComponente({ substancia: "", dosagem: "" }); }}><X className="w-3 h-3 mr-1" /> Cancelar</Button>
                  <Button size="sm" onClick={handleAddMedicamento} disabled={addingMed}>
                    {addingMed ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} {newMed.tipoMed === "formula" ? "Adicionar Formula" : "Adicionar Remedio"}
                  </Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border/20">
              {meds.map((m: any) => (
                <div key={m.id} className="py-2.5 group hover:bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.tipoMed === "formula" && <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-400">FORMULA</Badge>}
                          <span className="font-medium text-sm">{m.medicamentoDoseInline || m.nome}</span>
                          {m.tipoMed !== "formula" && m.dose && <span className="text-xs text-muted-foreground">{m.dose}</span>}
                          <Badge variant="outline" className={`text-[9px] ${STATUS_MED_COLORS[m.statusAtual] || ""}`}>
                            {(m.statusAtual || "em_uso").replace("_", " ")}
                          </Badge>
                          {m.codigoSemantico ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded">
                              {m.codigoSemantico}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded">
                              SEM CÓDIGO
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-[10px] text-muted-foreground mt-0.5">
                          {m.posologia && <span className="text-blue-400">Posologia: {m.posologia}</span>}
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
                  {m.tipoMed === "formula" && m.componentesFormula && m.componentesFormula.length > 0 && (
                    <div className="ml-6 mt-1 flex flex-wrap gap-1">
                      {m.componentesFormula.map((c: any, idx: number) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {c.substancia} {c.dosagem}
                        </span>
                      ))}
                    </div>
                  )}
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

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setTimelineExpanded(!timelineExpanded)}>
          <CardTitle className="flex items-center gap-2 text-base">
            {timelineExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Clock className="w-4 h-4 text-yellow-400" />
            <span>Linha Temporal de Medicacao</span>
            <Badge variant="outline" className="text-[10px] ml-2">{data?.eventosMedicacao?.length || 0}</Badge>
            <Button size="sm" variant="outline" className="ml-auto" onClick={(e) => { e.stopPropagation(); setShowNewEvento(true); setTimelineExpanded(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Evento
            </Button>
          </CardTitle>
        </CardHeader>
        {timelineExpanded && (
          <CardContent className="pt-0 space-y-3">
            {showNewEvento && (
              <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                <p className="text-xs font-medium text-yellow-400">Novo Evento de Medicacao</p>
                <div className="grid grid-cols-3 gap-2">
                  <select value={newEvento.medicamentoId} onChange={e => setNewEvento(ev => ({ ...ev, medicamentoId: e.target.value }))}
                    className="bg-background border border-border px-2 py-1.5 text-sm">
                    <option value="">Selecione medicamento...</option>
                    {meds.map((m: any) => <option key={m.id} value={m.id}>{m.nome} {m.dose || ""}</option>)}
                  </select>
                  <Input type="date" value={newEvento.data} onChange={e => setNewEvento(ev => ({ ...ev, data: e.target.value }))} />
                  <Input placeholder="Apresentacao (ex: Caprio 25mg)" value={newEvento.apresentacao} onChange={e => setNewEvento(ev => ({ ...ev, apresentacao: e.target.value }))} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="Posologia" value={newEvento.posologia} onChange={e => setNewEvento(ev => ({ ...ev, posologia: e.target.value }))} />
                  <select value={newEvento.status} onChange={e => setNewEvento(ev => ({ ...ev, status: e.target.value }))}
                    className="bg-background border border-border px-2 py-1.5 text-sm">
                    <option value="ATIVO">Ativo</option>
                    <option value="REDUZIDO">Reduzido</option>
                    <option value="SUSPENSO">Suspenso</option>
                    <option value="SUBSTITUIDO">Substituido</option>
                  </select>
                  <Input placeholder="Substituicao natural" value={newEvento.substituicaoNatural} onChange={e => setNewEvento(ev => ({ ...ev, substituicaoNatural: e.target.value }))} />
                  <Input placeholder="Leitura clinica" value={newEvento.leituraClinica} onChange={e => setNewEvento(ev => ({ ...ev, leituraClinica: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewEvento(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddEvento} disabled={addingEvento}>
                    {addingEvento ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />} Adicionar
                  </Button>
                </div>
              </div>
            )}

            {(data?.eventosMedicacao || []).length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">Nenhum evento registrado. Adicione eventos para rastrear a cronologia de cada medicamento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-1.5 px-2 font-medium">DATA</th>
                      <th className="text-left py-1.5 px-2 font-medium">MEDICAMENTO</th>
                      <th className="text-left py-1.5 px-2 font-medium">POSOLOGIA</th>
                      <th className="text-left py-1.5 px-2 font-medium">EVENTO</th>
                      <th className="text-left py-1.5 px-2 font-medium">SUBSTITUICAO</th>
                      <th className="text-left py-1.5 px-2 font-medium">LEITURA CLINICA</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.eventosMedicacao || []).map((ev: any, i: number) => (
                      <tr key={ev.id} className={`border-b border-border/10 hover:bg-muted/5 group ${i % 2 === 0 ? "bg-muted/3" : ""}`}>
                        <td className="py-1.5 px-2 font-mono">{ev.data ? new Date(ev.data).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="py-1.5 px-2 font-medium">{ev.apresentacao}</td>
                        <td className="py-1.5 px-2">{ev.posologia || "—"}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="outline" className={`text-[9px] ${ev.status === "ATIVO" ? "text-blue-400" : ev.status === "REDUZIDO" ? "text-yellow-400" : ev.status === "SUSPENSO" ? "text-green-400" : "text-purple-400"}`}>
                            {ev.status}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-2 text-green-400">{ev.substituicaoNatural || "—"}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{ev.leituraClinica || "—"}</td>
                        <td className="py-1.5 px-1">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteEvento(ev.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setEtapasExpanded(!etapasExpanded)}>
          <CardTitle className="flex items-center gap-2 text-base">
            {etapasExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Target className="w-4 h-4 text-blue-400" />
            <span>Proxima Etapa</span>
            <Badge variant="outline" className="text-[10px] ml-2">{data?.proximasEtapas?.length || 0}</Badge>
            <Button size="sm" variant="outline" className="ml-auto" onClick={(e) => { e.stopPropagation(); setShowNewEtapa(true); setEtapasExpanded(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Etapa
            </Button>
          </CardTitle>
        </CardHeader>
        {etapasExpanded && (
          <CardContent className="pt-0 space-y-2">
            {showNewEtapa && (
              <div className="border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                <p className="text-xs font-medium text-blue-400">Nova Etapa</p>
                <div className="grid grid-cols-4 gap-2">
                  <select value={newEtapa.tipo} onChange={e => setNewEtapa(et => ({ ...et, tipo: e.target.value }))}
                    className="bg-background border border-border px-2 py-1.5 text-sm">
                    <option value="exame">Exame</option>
                    <option value="meta">Meta</option>
                    <option value="lembrete">Lembrete</option>
                    <option value="atencao">Atencao</option>
                  </select>
                  <Input placeholder="Descricao" className="col-span-2" value={newEtapa.descricao} onChange={e => setNewEtapa(et => ({ ...et, descricao: e.target.value }))} />
                  <Input type="date" value={newEtapa.dataPrevista} onChange={e => setNewEtapa(et => ({ ...et, dataPrevista: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewEtapa(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddEtapa} disabled={addingEtapa}>
                    {addingEtapa ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />} Adicionar
                  </Button>
                </div>
              </div>
            )}
            {(data?.proximasEtapas || []).length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">Nenhuma proxima etapa registrada.</p>
            ) : (
              <div className="divide-y divide-border/20">
                {(data?.proximasEtapas || []).map((et: any) => (
                  <div key={et.id} className="flex items-center justify-between py-2 group">
                    <div className="flex items-center gap-3">
                      {et.concluido ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{et.tipo}</Badge>
                          <span className={`text-sm ${et.concluido ? "line-through text-muted-foreground" : ""}`}>{et.descricao}</span>
                        </div>
                        {et.dataPrevista && <span className="text-[10px] text-muted-foreground">Previsto: {new Date(et.dataPrevista).toLocaleDateString("pt-BR")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!et.concluido && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-green-400 text-xs" onClick={() => handleConcluirEtapa(et.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => handleDeleteEtapa(et.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleDownloadPdf} disabled={downloadingPdf} className="flex-1">
          {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Gerar PDF RASX Completo
        </Button>
        <Button variant="outline" onClick={() => { setAuditExpanded(!auditExpanded); if (!auditExpanded) fetchAuditLogs(); }}>
          <History className="w-4 h-4 mr-2" /> Audit Log
        </Button>
      </div>

      {auditExpanded && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-orange-400" />
              Historico de Auditoria
              <Badge variant="outline" className="text-[10px] ml-2">{auditLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">Nenhum registro de auditoria.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-border/10 text-xs">
                    <span className="font-mono text-muted-foreground w-28 shrink-0">{new Date(log.criadoEm).toLocaleString("pt-BR")}</span>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${log.acao === "override" ? "text-orange-400" : log.acao === "gerar_pdf" ? "text-blue-400" : log.acao === "excluir" ? "text-red-400" : "text-green-400"}`}>
                      {log.acao}
                    </Badge>
                    <span className="text-muted-foreground">{log.entidade}</span>
                    {log.campo && <span>campo: <span className="font-medium">{log.campo}</span></span>}
                    {log.valorAnterior && <span className="text-red-400/60">{log.valorAnterior}</span>}
                    {log.valorNovo && <span className="text-green-400">→ {log.valorNovo}</span>}
                    {log.justificativa && <span className="text-yellow-400 italic">{log.justificativa}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
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
