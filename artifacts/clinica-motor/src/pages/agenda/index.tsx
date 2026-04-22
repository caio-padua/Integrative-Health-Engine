import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  Building2, CheckCircle2, Circle, XCircle, AlertCircle,
  Syringe, MapPin, MoreVertical, Heart, FileDown,
  MessageSquare, CalendarSync, ClipboardCheck, KeyRound,
  Download, CheckCheck, X, Pencil
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; borderColor: string; bgClass: string }> = {
  agendada: { label: "Agendada", color: "text-blue-400", icon: Circle, borderColor: "border-l-blue-400", bgClass: "" },
  confirmada: { label: "Confirmada", color: "text-emerald-400", icon: CheckCircle2, borderColor: "border-l-emerald-400", bgClass: "" },
  em_andamento: { label: "Em Andamento", color: "text-amber-400", icon: AlertCircle, borderColor: "border-l-amber-400", bgClass: "bg-amber-500/5" },
  parcial: { label: "Parcial", color: "text-orange-400", icon: AlertCircle, borderColor: "border-l-orange-400", bgClass: "bg-orange-500/5" },
  concluida: { label: "Concluida", color: "text-green-400", icon: CheckCircle2, borderColor: "border-l-green-400", bgClass: "bg-green-500/5" },
  cancelada: { label: "Cancelada", color: "text-red-400/60", icon: XCircle, borderColor: "border-l-red-400/60", bgClass: "opacity-50" },
  nao_compareceu: { label: "Falta", color: "text-red-400", icon: XCircle, borderColor: "border-l-red-400", bgClass: "opacity-60 bg-red-500/5" },
};

const PILL_STATUS: Record<string, { dot: string; ring: string; label: string }> = {
  aplicada: { dot: "bg-blue-500", ring: "ring-2 ring-blue-400/50", label: "APLICADA" },
  nao_aplicada: { dot: "bg-red-500", ring: "", label: "N/A" },
  pendente_disp: { dot: "bg-yellow-500", ring: "", label: "DISP" },
  pendente_prox: { dot: "bg-amber-800", ring: "", label: "PROX" },
};

function getWeekRange(date: Date): { from: string; to: string; days: Date[] } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return { from: days[0].toISOString().split("T")[0], to: days[6].toISOString().split("T")[0], days };
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface AplicacaoSessao {
  aplicacao: {
    id: number; sessaoId: number; substanciaId: number;
    dose: string | null; status: string; disponibilidade: string;
    numeroSessao: number; totalSessoes: number;
    notas: string | null; aplicadoEm: string | null;
  };
  substanciaNome: string | null; substanciaCor: string | null;
  substanciaVia: string | null; substanciaDuracao: number | null;
}

interface SessaoAgenda {
  sessao: {
    id: number; pacienteId: number; unidadeId: number | null;
    profissionalId: number | null; dataAgendada: string;
    horaAgendada: string | null; horaFim: string | null;
    status: string; tipoServico: string;
    tipoProcedimento: string | null; duracaoTotalMin: number | null;
    notas: string | null; numeroSemana: number;
  };
  pacienteNome: string | null; pacienteCpf: string | null;
  unidadeNome: string | null; unidadeCor: string | null;
  unidadeEndereco: string | null; unidadeBairro: string | null;
  unidadeCidade: string | null; unidadeEstado: string | null;
  unidadeCep: string | null; profissionalNome: string | null;
  aplicacoes: AplicacaoSessao[];
  tipoProcedimentoCalc: string | null;
  duracaoTotalCalc: number | null; horaFimCalc: string | null;
}

interface AgendaResponse {
  dataFrom: string; dataTo: string;
  dias: Record<string, SessaoAgenda[]>;
}

function SubstancePill({ ap, sessaoId, onConfirm }: {
  ap: AplicacaoSessao; sessaoId: number;
  onConfirm: (sessaoId: number, substanciaId: number, confirmado: boolean) => void;
}) {
  const status = ap.aplicacao.status;
  const disp = ap.aplicacao.disponibilidade;
  const pillKey = status === "aplicada" ? "aplicada"
    : status === "nao_aplicada" ? "nao_aplicada"
    : disp === "disp" ? "pendente_disp"
    : "pendente_prox";

  const cfg = PILL_STATUS[pillKey];
  const canConfirm = status === "pendente" && disp === "disp";

  return (
    <div className="flex items-center gap-1.5 group">
      <div
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] border border-border/60 bg-card/50 transition-all"
        style={{ borderLeftColor: ap.substanciaCor || "#888", borderLeftWidth: 3 }}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.ring}`} />
        <span className="font-medium truncate max-w-[80px]">{ap.substanciaNome}</span>
        <span className="text-muted-foreground font-mono text-[9px]">
          {ap.aplicacao.numeroSessao}/{ap.aplicacao.totalSessoes}
        </span>
        {status === "aplicada" && <CheckCheck className="h-3 w-3 text-blue-400" />}
      </div>
      {canConfirm && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-0.5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400"
            onClick={(e) => { e.stopPropagation(); onConfirm(sessaoId, ap.aplicacao.substanciaId, true); }}
            title="Confirmar aplicacao"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-0.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400"
            onClick={(e) => { e.stopPropagation(); onConfirm(sessaoId, ap.aplicacao.substanciaId, false); }}
            title="Nao aplicada"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function SessaoCard({ sessao, onConfirm, onEdit }: {
  sessao: SessaoAgenda;
  onConfirm: (sessaoId: number, substanciaId: number, confirmado: boolean) => void;
  onEdit: (s: SessaoAgenda) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[sessao.sessao.status] || STATUS_CONFIG.agendada;
  const StatusIcon = config.icon;
  const { toast } = useToast();

  const tipoProcedimento = sessao.tipoProcedimentoCalc || sessao.sessao.tipoProcedimento || null;
  const duracaoMin = sessao.duracaoTotalCalc ?? sessao.sessao.duracaoTotalMin ?? null;
  const horaFim = sessao.horaFimCalc || sessao.sessao.horaFim || null;

  const today = new Date().toISOString().split("T")[0];
  const isToday = sessao.sessao.dataAgendada === today;

  const handleIcsDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/sessoes/${sessao.sessao.id}/ics`, "_blank");
  };

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sessoes/${sessao.sessao.id}/whatsapp-lembrete`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch { toast({ title: "Erro ao gerar link WhatsApp", variant: "destructive" }); }
  };

  const handleSyncCalendar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/google-calendar/sync-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Sincronizado com Google Calendar" });
    } catch { toast({ title: "Erro ao sincronizar", variant: "destructive" }); }
  };

  const handlePreEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/google-gmail/pre-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Email pre-sessao enviado" });
    } catch { toast({ title: "Erro ao enviar email", variant: "destructive" }); }
  };

  const handlePostEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/google-gmail/post-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Email pos-sessao enviado" });
    } catch { toast({ title: "Erro ao enviar email", variant: "destructive" }); }
  };

  return (
    <div
      className={`border border-border/60 p-3 cursor-pointer transition-all hover:border-border group/card border-l-[3px] ${config.borderColor} ${config.bgClass} ${isToday ? "shadow-md shadow-primary/10 border-primary/30" : ""}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {sessao.sessao.horaAgendada && (
              <span className="text-xs font-mono font-bold text-foreground">
                {sessao.sessao.horaAgendada.substring(0, 5)}
                {horaFim && <span className="text-muted-foreground font-normal"> - {horaFim}</span>}
              </span>
            )}
            {isToday && <Badge className="text-[8px] px-1 py-0 bg-primary/20 text-primary border-primary/30">HOJE</Badge>}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5">{sessao.pacienteNome || "Cliente"}</div>
          {sessao.pacienteCpf && (
            <div className="text-[10px] text-muted-foreground font-mono">{sessao.pacienteCpf}</div>
          )}

          {tipoProcedimento && (
            <div className="mt-1 text-[9px] font-bold tracking-wider text-primary uppercase">
              {tipoProcedimento}
              {duracaoMin ? <span className="text-muted-foreground font-normal ml-1">({duracaoMin}min)</span> : null}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
              <StatusIcon className="h-3 w-3 mr-0.5" />
              {config.label}
            </Badge>
            {sessao.sessao.tipoServico === "homecare" && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-teal-400 border-teal-400/30">
                <Heart className="h-2.5 w-2.5 mr-0.5" />NURSE CARE
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {sessao.unidadeCor && (
            <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: sessao.unidadeCor }} title={sessao.unidadeNome || ""} />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleSyncCalendar}>
                <CalendarSync className="h-4 w-4 mr-2" />Sincronizar Google Agenda
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleIcsDownload}>
                <Download className="h-4 w-4 mr-2" />Baixar ICS
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePreEmail}>
                <MessageSquare className="h-4 w-4 mr-2" />Email Pre-Sessao
              </DropdownMenuItem>
              {sessao.sessao.status === "concluida" && (
                <DropdownMenuItem onClick={handlePostEmail}>
                  <FileDown className="h-4 w-4 mr-2" />Email Pos-Sessao (RAS)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleWhatsApp}>
                <MessageSquare className="h-4 w-4 mr-2" />Lembrete WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(sessao); }}>
                <Pencil className="h-4 w-4 mr-2" />Editar Sessao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {sessao.aplicacoes && sessao.aplicacoes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {sessao.aplicacoes.map((ap) => (
            <SubstancePill key={ap.aplicacao.id} ap={ap} sessaoId={sessao.sessao.id} onConfirm={onConfirm} />
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-2 border-t border-border/30 space-y-1.5">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {sessao.profissionalNome && (
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{sessao.profissionalNome}</span>
            )}
            {sessao.unidadeNome && (
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{sessao.unidadeNome}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Marcacao {sessao.sessao.numeroSemana}</span>
          </div>
          {sessao.unidadeEndereco && (
            <div className="mt-1 text-[10px] text-muted-foreground/70 flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{sessao.unidadeEndereco}{sessao.unidadeBairro ? `, ${sessao.unidadeBairro}` : ""}{sessao.unidadeCep ? ` - ${sessao.unidadeCep}` : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgendaSemanal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const week = useMemo(() => getWeekRange(currentDate), [currentDate]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingSessao, setEditingSessao] = useState<SessaoAgenda | null>(null);
  const [editSessaoForm, setEditSessaoForm] = useState<any>({});
  const [editSessaoSaving, setEditSessaoSaving] = useState(false);

  const openEditSessao = (s: SessaoAgenda) => {
    setEditSessaoForm({
      status: s.sessao.status,
      dataAgendada: s.sessao.dataAgendada,
      horaAgendada: s.sessao.horaAgendada || "",
      notas: s.sessao.notas || "",
      tipoServico: s.sessao.tipoServico || "presencial",
    });
    setEditingSessao(s);
  };

  const saveEditSessao = async () => {
    if (!editingSessao) return;
    setEditSessaoSaving(true);
    try {
      const res = await fetch(`/api/sessoes/${editingSessao.sessao.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSessaoForm),
      });
      if (res.ok) {
        toast({ title: "Sessao atualizada" });
        queryClient.invalidateQueries({ queryKey: ["agenda-semanal"] });
        setEditingSessao(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setEditSessaoSaving(false);
  };

  const { data, isLoading } = useQuery<AgendaResponse>({
    queryKey: ["agenda-semanal", week.from, week.to],
    queryFn: async () => {
      const res = await fetch(`/api/agenda/semanal?dataFrom=${week.from}&dataTo=${week.to}`);
      if (!res.ok) throw new Error("Erro ao carregar agenda");
      return res.json();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ sessaoId, substanciaId, confirmado }: { sessaoId: number; substanciaId: number; confirmado: boolean }) => {
      const res = await fetch(`/api/sessoes/${sessaoId}/confirmar-substancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substanciaId, confirmado }),
      });
      if (!res.ok) throw new Error("Erro ao confirmar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-semanal"] });
      toast({ title: "Substancia atualizada" });
    },
    onError: () => toast({ title: "Erro ao confirmar substancia", variant: "destructive" }),
  });

  const handleConfirm = (sessaoId: number, substanciaId: number, confirmado: boolean) => {
    confirmMutation.mutate({ sessaoId, substanciaId, confirmado });
  };

  const goWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const totalSessoes = data ? Object.values(data.dias).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const today = new Date().toISOString().split("T")[0];

  const handleIcsSemana = () => {
    window.open(`/api/sessoes/ics-semana?dataFrom=${week.from}&dataTo=${week.to}`, "_blank");
  };

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Agenda Semanal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {week.from.split("-").reverse().join("/")} a {week.to.split("-").reverse().join("/")} — {totalSessoes} sessoes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleIcsSemana} className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />ICS Semana
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1" />Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {week.days.map((day, idx) => {
              const dateStr = day.toISOString().split("T")[0];
              const sessoesDia = data?.dias[dateStr] || [];
              const isToday = dateStr === today;
              const isWeekend = idx >= 5;

              return (
                <div key={dateStr} className="min-h-[180px]">
                  <div className={`text-center py-1.5 border-b-2 ${
                    isToday ? "bg-primary/20 text-primary border-primary" :
                    isWeekend ? "bg-muted/30 text-muted-foreground border-border/50" :
                    "bg-card border-border/50"
                  }`}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest">
                      {DIAS_SEMANA_CURTO[day.getDay()]}
                    </div>
                    <div className={`text-base font-bold ${isToday ? "text-primary" : ""}`}>
                      {formatDate(day)}
                    </div>
                    {sessoesDia.length > 0 && (
                      <div className="text-[9px] mt-0.5 text-muted-foreground">
                        {sessoesDia.length} sessao{sessoesDia.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 pt-1.5">
                    {sessoesDia.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/30">
                        <Calendar className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-[9px]">Sem sessoes</span>
                      </div>
                    ) : (
                      sessoesDia.map((s) => <SessaoCard key={s.sessao.id} sessao={s} onConfirm={handleConfirm} onEdit={openEditSessao} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/50 pt-3">
          <span className="font-semibold uppercase tracking-wider mr-1">Status:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={key} className={`flex items-center gap-0.5 ${cfg.color}`}>
                <Icon className="h-3 w-3" />{cfg.label}
              </span>
            );
          })}
          <span className="ml-2 font-semibold uppercase tracking-wider">Pills:</span>
          {Object.entries(PILL_STATUS).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-0.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
          ))}
        </div>

        {editingSessao && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingSessao(null)}>
            <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Editar Sessao</h3>
                <button onClick={() => setEditingSessao(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="text-sm text-muted-foreground">Paciente: <strong>{editingSessao.pacienteNome}</strong></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
                  <Select value={editSessaoForm.status} onValueChange={v => setEditSessaoForm({...editSessaoForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tipo Servico</label>
                  <Select value={editSessaoForm.tipoServico} onValueChange={v => setEditSessaoForm({...editSessaoForm, tipoServico: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="homecare">Homecare</SelectItem>
                      <SelectItem value="teleconsulta">Teleconsulta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Data</label>
                  <Input type="date" value={editSessaoForm.dataAgendada} onChange={e => setEditSessaoForm({...editSessaoForm, dataAgendada: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Hora</label>
                  <Input type="time" value={editSessaoForm.horaAgendada?.substring(0, 5) || ""} onChange={e => setEditSessaoForm({...editSessaoForm, horaAgendada: e.target.value ? e.target.value + ":00" : null})} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Notas</label>
                  <Textarea value={editSessaoForm.notas} onChange={e => setEditSessaoForm({...editSessaoForm, notas: e.target.value})} rows={3} />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button className="flex-1 text-xs h-9" onClick={saveEditSessao} disabled={editSessaoSaving}>
                  {editSessaoSaving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setEditingSessao(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
