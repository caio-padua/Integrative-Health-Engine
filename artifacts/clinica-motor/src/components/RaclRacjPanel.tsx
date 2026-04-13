import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Play, BookOpen, Scale, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Send, Archive, Loader2, RefreshCw,
  Eye, RotateCcw
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";
const apiBase = `${window.location.origin}${BASE_URL}api`.replace(/\/+/g, "/").replace(":/", "://");

interface Caderno {
  id: number;
  pacienteId: number;
  tratamentoId: number;
  eventoStartId: number | null;
  familia: "RACL" | "RACJ";
  sigla: string;
  descricao: string | null;
  versao: number;
  status: string;
  driveFileId: string | null;
  driveFileName: string | null;
  driveSubpasta: string | null;
  sessaoOrigemId: number | null;
  metadados: any;
  geradoEm: string | null;
  assinadoEm: string | null;
  enviadoEm: string | null;
  emitidoUmaVez: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

interface EventoStart {
  id: number;
  pacienteId: number;
  tratamentoId: number;
  snapshotCadastro: any;
  modalidadesAtivas: any;
  cadernosRaclGerados: string[];
  cadernosRacjGerados: string[];
  statusEvento: string;
  juridicoEmitido: boolean;
  juridicoEmitidoEm: string | null;
  observacoes: string | null;
  criadoEm: string;
}

interface Tratamento {
  id: number;
  nome: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  gerado: { label: "Gerado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: FileText },
  assinado: { label: "Assinado", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  enviado: { label: "Enviado", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Send },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground border-border", icon: Archive },
  erro: { label: "Erro", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
};

const MODALIDADE_LABELS: Record<string, string> = {
  injetavelIM: "Injetavel IM",
  injetavelEV: "Endovenoso EV",
  implante: "Implante SC",
  formula: "Formula Oral",
  protocolo: "Protocolo",
  exame: "Exame",
  dieta: "Dieta",
  psicologia: "Psicologia",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} text-[10px] gap-1`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function RaclRacjPanel({ pacienteId }: { pacienteId: number }) {
  const { toast } = useToast();
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [eventos, setEventos] = useState<EventoStart[]>([]);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [startingEvent, setStartingEvent] = useState(false);
  const [selectedTratamento, setSelectedTratamento] = useState<number | null>(null);
  const [modalidades, setModalidades] = useState({
    injetavelIM: false,
    injetavelEV: false,
    implante: false,
    formula: false,
    protocolo: false,
    exame: false,
    dieta: false,
    psicologia: false,
  });
  const [previewCadernos, setPreviewCadernos] = useState<any[]>([]);
  const [raclExpanded, setRaclExpanded] = useState(true);
  const [racjExpanded, setRacjExpanded] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cadernosRes, eventosRes, tratRes] = await Promise.all([
        fetch(`${apiBase}/ras/cadernos/${pacienteId}`),
        fetch(`${apiBase}/ras/evento-start/${pacienteId}`),
        fetch(`${apiBase}/tratamentos?pacienteId=${pacienteId}`),
      ]);
      if (cadernosRes.ok) {
        const data = await cadernosRes.json();
        setCadernos(data.cadernos || []);
      }
      if (eventosRes.ok) {
        const data = await eventosRes.json();
        setEventos(data.eventos || []);
      }
      if (tratRes.ok) {
        const data = await tratRes.json();
        setTratamentos(Array.isArray(data) ? data : data.tratamentos || []);
      }
    } catch {
      toast({ title: "Erro ao carregar dados RACL/RACJ", variant: "destructive" });
    }
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/ras/resolver-cadernos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalidades),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCadernos(data.cadernos || []);
      }
    } catch {}
  }, [modalidades]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleStartEvent = async () => {
    if (!selectedTratamento) {
      toast({ title: "Selecione um tratamento", variant: "destructive" });
      return;
    }
    setStartingEvent(true);
    try {
      const res = await fetch(`${apiBase}/ras/evento-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tratamentoId: selectedTratamento,
          modalidades,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Evento START criado! ${data.resumo?.totalRACL || 0} RACL + ${data.resumo?.totalRACJ || 0} RACJ cadernos gerados.` });
        setStartDialogOpen(false);
        setModalidades({ injetavelIM: false, injetavelEV: false, implante: false, formula: false, protocolo: false, exame: false, dieta: false, psicologia: false });
        setSelectedTratamento(null);
        fetchData();
      } else {
        toast({ title: data.error || "Erro ao criar evento START", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
    setStartingEvent(false);
  };

  const handleStatusUpdate = async (cadernoId: number, novoStatus: string) => {
    setUpdatingStatus(cadernoId);
    try {
      const res = await fetch(`${apiBase}/ras/cadernos/${cadernoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (res.ok) {
        toast({ title: `Status atualizado para ${novoStatus.toUpperCase()}` });
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Erro ao atualizar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
    setUpdatingStatus(null);
  };

  const racl = cadernos.filter(c => c.familia === "RACL");
  const racj = cadernos.filter(c => c.familia === "RACJ");
  const ultimoEvento = eventos[0] || null;
  const hasEventoStart = eventos.length > 0;

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Cadernos Documentais RACL / RACJ</h2>
          <Badge variant="outline" className="text-[10px]">{cadernos.length} cadernos</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setStartDialogOpen(true)}>
            <Play className="w-3 h-3 mr-1" /> Novo Evento START
          </Button>
        </div>
      </div>

      {ultimoEvento && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${ultimoEvento.statusEvento === "concluido" ? "bg-green-500" : ultimoEvento.statusEvento === "erro" ? "bg-red-500" : "bg-yellow-500"}`} />
                <span className="text-sm font-medium">Ultimo START</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(ultimoEvento.criadoEm).toLocaleDateString("pt-BR")} {new Date(ultimoEvento.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {ultimoEvento.cadernosRaclGerados?.length || 0} RACL
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400">
                  <Scale className="w-3 h-3 mr-1" />
                  {ultimoEvento.cadernosRacjGerados?.length || 0} RACJ
                </Badge>
                {ultimoEvento.juridicoEmitido && (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400">
                    Juridico Emitido
                  </Badge>
                )}
              </div>
            </div>
            {ultimoEvento.observacoes && (
              <p className="text-xs text-muted-foreground mt-2 pl-5">{ultimoEvento.observacoes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!hasEventoStart && cadernos.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-1">Nenhum evento START registrado para este paciente.</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              O evento START cria o snapshot do cadastro e gera os cadernos documentais (RACL clinico + RACJ juridico) com base nas modalidades ativas do tratamento.
            </p>
            <Button onClick={() => setStartDialogOpen(true)}>
              <Play className="w-4 h-4 mr-2" /> Iniciar Evento START
            </Button>
          </CardContent>
        </Card>
      )}

      {racl.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setRaclExpanded(!raclExpanded)}>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {raclExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>RACL — Cadernos Clinicos</span>
                <Badge variant="outline" className="text-[10px] ml-2">{racl.length}</Badge>
              </div>
              <span className="text-[10px] text-muted-foreground font-normal">Evolucao continua por sessao/retorno</span>
            </CardTitle>
          </CardHeader>
          {raclExpanded && (
            <CardContent className="pt-0">
              <div className="divide-y divide-border/30">
                {racl.map(c => (
                  <CadernoRow
                    key={c.id}
                    caderno={c}
                    onStatusUpdate={handleStatusUpdate}
                    updating={updatingStatus === c.id}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {racj.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setRacjExpanded(!racjExpanded)}>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {racjExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Scale className="w-4 h-4 text-amber-400" />
                <span>RACJ — Cadernos Juridicos</span>
                <Badge variant="outline" className="text-[10px] ml-2">{racj.length}</Badge>
              </div>
              <span className="text-[10px] text-muted-foreground font-normal">Emitido 1x no START — imutavel</span>
            </CardTitle>
          </CardHeader>
          {racjExpanded && (
            <CardContent className="pt-0">
              <div className="divide-y divide-border/30">
                {racj.map(c => (
                  <CadernoRow
                    key={c.id}
                    caderno={c}
                    onStatusUpdate={handleStatusUpdate}
                    updating={updatingStatus === c.id}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Iniciar Evento START
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Tratamento Vinculado</label>
              {tratamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum tratamento encontrado para este paciente.</p>
              ) : (
                <div className="space-y-2">
                  {tratamentos.map((t: Tratamento) => (
                    <div
                      key={t.id}
                      className={`p-3 border cursor-pointer transition-colors ${selectedTratamento === t.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
                      onClick={() => setSelectedTratamento(t.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.nome}</span>
                        <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Modalidades Ativas</label>
              <p className="text-xs text-muted-foreground mb-3">
                Selecione as modalidades terapeuticas ativas. O motor de toggles determinara quais cadernos RACL e RACJ serao gerados.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(MODALIDADE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-2 border border-border/30 bg-muted/5">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={(modalidades as any)[key]}
                      onCheckedChange={(v) => setModalidades(prev => ({ ...prev, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {previewCadernos.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Preview — {previewCadernos.filter(c => c.familia === "RACL").length} RACL + {previewCadernos.filter(c => c.familia === "RACJ").length} RACJ = {previewCadernos.length} cadernos
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {previewCadernos.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-muted/10">
                      {c.familia === "RACL" ? (
                        <BookOpen className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      ) : (
                        <Scale className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground w-16">{c.familia} {c.sigla}</span>
                      <span className="flex-1">{c.descricao}</span>
                      {c.obrigatorio && <Badge variant="outline" className="text-[8px] px-1">SEMPRE</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleStartEvent}
              disabled={startingEvent || !selectedTratamento}
            >
              {startingEvent ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando START...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Disparar Evento START</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pendente: ["gerado"],
  gerado: ["assinado", "pendente"],
  assinado: ["enviado", "gerado"],
  enviado: ["arquivado"],
  arquivado: [],
  erro: ["pendente"],
};

function CadernoRow({ caderno, onStatusUpdate, updating }: {
  caderno: Caderno;
  onStatusUpdate: (id: number, status: string) => void;
  updating: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const nextStatuses = STATUS_TRANSITIONS[caderno.status] || [];

  return (
    <div className="flex items-center justify-between py-2.5 px-1 group hover:bg-muted/5 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="font-mono text-[10px] text-muted-foreground w-10 flex-shrink-0">
          {caderno.sigla}
        </span>
        <span className="text-sm truncate">{caderno.descricao || caderno.sigla}</span>
        {caderno.emitidoUmaVez && (
          <span className="text-[9px] text-amber-400/60">1x</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={caderno.status} />

        {caderno.versao > 1 && (
          <span className="text-[9px] text-muted-foreground">v{caderno.versao}</span>
        )}

        {caderno.driveFileId && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
            <a href={`https://drive.google.com/file/d/${caderno.driveFileId}`} target="_blank" rel="noopener noreferrer">
              <Eye className="w-3 h-3" />
            </a>
          </Button>
        )}

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowActions(!showActions)}
            disabled={nextStatuses.length === 0 || updating}
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          </Button>
          {showActions && nextStatuses.length > 0 && (
            <div className="absolute right-0 top-7 z-10 bg-card border border-border shadow-lg p-1 min-w-[120px]">
              {nextStatuses.map(s => (
                <button
                  key={s}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-muted/20 transition-colors flex items-center gap-2"
                  onClick={() => { onStatusUpdate(caderno.id, s); setShowActions(false); }}
                >
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
