import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useObterPaciente,
  useListarPerguntasQuestionario,
  getListarPerguntasQuestionarioQueryKey,
  useListarRespostasQuestionario,
  getListarRespostasQuestionarioQueryKey,
  useCriarRespostaQuestionario,
  useAtualizarRespostaQuestionario,
  useListarEstadoSaude,
  getListarEstadoSaudeQueryKey,
  useCriarEstadoSaude,
  useAtualizarEstadoSaude,
} from "@workspace/api-client-react";
import {
  ClipboardList,
  HeartPulse,
  Plus,
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  History,
  Activity,
  Brain,
  Pill,
  Thermometer,
  Moon,
  Zap,
  Weight,
  Ruler,
  Gauge,
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  VALIDADO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  APROVADO: "bg-green-500/20 text-green-400 border-green-500/30",
  "STAND BY": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  ATIVO: "bg-green-500/20 text-green-400 border-green-500/30",
  HISTORICO: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const EVOLUCAO_COLORS: Record<string, { color: string; icon: typeof TrendingUp }> = {
  INICIAL: { color: "text-blue-400", icon: Activity },
  MELHORADO: { color: "text-green-400", icon: TrendingUp },
  ESTAVEL: { color: "text-yellow-400", icon: Minus },
  PIORADO: { color: "text-red-400", icon: TrendingDown },
  CURADO: { color: "text-emerald-400", icon: HeartPulse },
};

function ScaleInput({ label, value, onChange, icon: Icon, max = 10 }: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  icon: typeof Activity;
  max?: number;
}) {
  const getColor = (v: number) => {
    if (v <= 3) return "bg-green-500";
    if (v <= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        {value !== null && <span className="ml-auto font-mono font-bold text-foreground">{value}/{max}</span>}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-full h-6 rounded-sm transition-all ${
              value !== null && n <= value ? getColor(value) : "bg-muted/30 hover:bg-muted/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function NovoQuestionarioDialog({ pacienteId, perguntas }: {
  pacienteId: number;
  perguntas: Array<{ id: number; bloco: string; perguntaId: string; pergunta: string; tipoResposta?: string | null; obrigatorio?: string | null; exemplo?: string | null; observacao?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [observacoesMedico, setObservacoesMedico] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const criar = useCriarRespostaQuestionario();

  const blocos = useMemo(() => {
    const map = new Map<string, typeof perguntas>();
    perguntas.forEach((p) => {
      const arr = map.get(p.bloco) || [];
      arr.push(p);
      map.set(p.bloco, arr);
    });
    return Array.from(map.entries());
  }, [perguntas]);

  const [expandedBlocos, setExpandedBlocos] = useState<Set<string>>(new Set(blocos.map(([b]) => b)));

  const toggleBloco = (bloco: string) => {
    setExpandedBlocos((prev) => {
      const next = new Set(prev);
      if (next.has(bloco)) next.delete(bloco);
      else next.add(bloco);
      return next;
    });
  };

  const onSave = () => {
    if (!periodo) {
      toast({ title: "Periodo e obrigatorio", variant: "destructive" });
      return;
    }

    criar.mutate(
      { pacienteId, data: { periodo, respostas, observacoesMedico: observacoesMedico || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListarRespostasQuestionarioQueryKey(pacienteId) });
          setOpen(false);
          setRespostas({});
          setPeriodo("");
          setObservacoesMedico("");
          toast({ title: "Questionario salvo com sucesso" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Questionario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Novo Questionario de Saude
          </DialogTitle>
          <DialogDescription>Preencha as respostas do questionario do paciente para registrar o estado de saude atual.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Periodo</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INICIAL">Inicial (Primeiro Atendimento)</SelectItem>
                  <SelectItem value="RETORNO_30D">Retorno 30 dias</SelectItem>
                  <SelectItem value="RETORNO_60D">Retorno 60 dias</SelectItem>
                  <SelectItem value="RETORNO_90D">Retorno 90 dias</SelectItem>
                  <SelectItem value="RETORNO_6M">Retorno 6 meses</SelectItem>
                  <SelectItem value="RETORNO_12M">Retorno 12 meses</SelectItem>
                  <SelectItem value="ACOMPANHAMENTO">Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data</label>
              <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} disabled className="bg-muted/20" />
            </div>
          </div>

          {blocos.map(([bloco, pergs]) => (
            <Card key={bloco} className="bg-card border-border/50">
              <button
                type="button"
                onClick={() => toggleBloco(bloco)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedBlocos.has(bloco) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold text-sm uppercase tracking-wider">{bloco}</span>
                  <Badge variant="outline" className="text-xs">{pergs.length}</Badge>
                </div>
              </button>
              {expandedBlocos.has(bloco) && (
                <CardContent className="space-y-4 pt-0">
                  {pergs.map((p) => (
                    <div key={p.perguntaId} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono text-orange-400 mt-0.5">{p.perguntaId}</span>
                        <div className="flex-1">
                          <label className="text-sm font-medium">
                            {p.pergunta}
                            {p.obrigatorio === "SIM" && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {p.observacao && <p className="text-xs text-muted-foreground">{p.observacao}</p>}
                        </div>
                      </div>
                      {p.tipoResposta === "ESCALA_0_10" ? (
                        <div className="ml-14">
                          <ScaleInput
                            label=""
                            value={respostas[p.perguntaId] ? parseInt(respostas[p.perguntaId]) : null}
                            onChange={(v) => setRespostas((prev) => ({ ...prev, [p.perguntaId]: String(v) }))}
                            icon={Activity}
                          />
                        </div>
                      ) : p.tipoResposta === "SIM_NAO" ? (
                        <div className="ml-14 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={respostas[p.perguntaId] === "SIM" ? "default" : "outline"}
                            onClick={() => setRespostas((prev) => ({ ...prev, [p.perguntaId]: "SIM" }))}
                          >
                            Sim
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={respostas[p.perguntaId] === "NAO" ? "default" : "outline"}
                            onClick={() => setRespostas((prev) => ({ ...prev, [p.perguntaId]: "NAO" }))}
                          >
                            Nao
                          </Button>
                        </div>
                      ) : p.tipoResposta === "MULTIPLA_ESCOLHA" ? (
                        <div className="ml-14">
                          <Textarea
                            placeholder={p.exemplo || "Separe as opcoes por virgula"}
                            value={respostas[p.perguntaId] || ""}
                            onChange={(e) => setRespostas((prev) => ({ ...prev, [p.perguntaId]: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      ) : (
                        <div className="ml-14">
                          <Textarea
                            placeholder={p.exemplo || "Descreva aqui..."}
                            value={respostas[p.perguntaId] || ""}
                            onChange={(e) => setRespostas((prev) => ({ ...prev, [p.perguntaId]: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}

          <div>
            <label className="text-sm font-medium text-muted-foreground">Observacoes do Medico</label>
            <Textarea
              placeholder="Anotacoes clinicas sobre as respostas do paciente..."
              value={observacoesMedico}
              onChange={(e) => setObservacoesMedico(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={onSave} disabled={criar.isPending} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {criar.isPending ? "Salvando..." : "Salvar Questionario"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoEstadoSaudeDialog({ pacienteId, respostaId }: { pacienteId: number; respostaId?: number }) {
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [nivelEnergia, setNivelEnergia] = useState<number | null>(null);
  const [nivelDor, setNivelDor] = useState<number | null>(null);
  const [qualidadeSono, setQualidadeSono] = useState<number | null>(null);
  const [nivelEstresse, setNivelEstresse] = useState<number | null>(null);
  const [pesoKg, setPesoKg] = useState("");
  const [alturaM, setAlturaM] = useState("");
  const [pressaoArterial, setPressaoArterial] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [evolucao, setEvolucao] = useState("INICIAL");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const criar = useCriarEstadoSaude();

  const onSave = () => {
    if (!periodo || !condicoes) {
      toast({ title: "Periodo e condicoes atuais sao obrigatorios", variant: "destructive" });
      return;
    }

    const condicoesArr = condicoes.split(",").map((c) => c.trim()).filter(Boolean);
    const sintomasArr = sintomas.split(",").map((s) => s.trim()).filter(Boolean);
    const medsArr = medicamentos.split(",").map((m) => m.trim()).filter(Boolean);

    criar.mutate(
      {
        pacienteId,
        data: {
          questionarioRespostaId: respostaId,
          periodo,
          condicoesAtuais: { lista: condicoesArr },
          sintomasAtivos: sintomasArr.length > 0 ? { lista: sintomasArr } : undefined,
          medicamentosEmUso: medsArr.length > 0 ? { lista: medsArr } : undefined,
          nivelEnergia: nivelEnergia || undefined,
          nivelDor: nivelDor || undefined,
          qualidadeSono: qualidadeSono || undefined,
          nivelEstresse: nivelEstresse || undefined,
          pesoKg: pesoKg || undefined,
          alturaM: alturaM || undefined,
          pressaoArterial: pressaoArterial || undefined,
          observacoes: observacoes || undefined,
          evolucao,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListarEstadoSaudeQueryKey(pacienteId) });
          setOpen(false);
          toast({ title: "Estado de saude registrado" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HeartPulse className="w-4 h-4 mr-2" />
          Registrar Estado de Saude
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5" />
            Novo Registro de Estado de Saude
          </DialogTitle>
          <DialogDescription>Registre o estado de saude atual do paciente. O registro anterior sera movido para o historico automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Periodo</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INICIAL">Inicial</SelectItem>
                  <SelectItem value="RETORNO_30D">Retorno 30 dias</SelectItem>
                  <SelectItem value="RETORNO_60D">Retorno 60 dias</SelectItem>
                  <SelectItem value="RETORNO_90D">Retorno 90 dias</SelectItem>
                  <SelectItem value="RETORNO_6M">Retorno 6 meses</SelectItem>
                  <SelectItem value="RETORNO_12M">Retorno 12 meses</SelectItem>
                  <SelectItem value="ACOMPANHAMENTO">Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Evolucao</label>
              <Select value={evolucao} onValueChange={setEvolucao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INICIAL">Inicial</SelectItem>
                  <SelectItem value="MELHORADO">Melhorado</SelectItem>
                  <SelectItem value="ESTAVEL">Estavel</SelectItem>
                  <SelectItem value="PIORADO">Piorado</SelectItem>
                  <SelectItem value="CURADO">Curado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Condicoes Atuais *</label>
            <Textarea
              placeholder="Hipotireoidismo, Fadiga Cronica, Disbiose... (separar por virgula)"
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Sintomas Ativos</label>
            <Textarea
              placeholder="Cansaco, Dor de cabeca, Insonia... (separar por virgula)"
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Medicamentos em Uso</label>
            <Textarea
              placeholder="Levotiroxina 50mcg, Vitamina D 10.000UI... (separar por virgula)"
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores Subjetivos (1-10)</h4>
            <ScaleInput label="Nivel de Energia" value={nivelEnergia} onChange={setNivelEnergia} icon={Zap} />
            <ScaleInput label="Nivel de Dor" value={nivelDor} onChange={setNivelDor} icon={Thermometer} />
            <ScaleInput label="Qualidade do Sono" value={qualidadeSono} onChange={setQualidadeSono} icon={Moon} />
            <ScaleInput label="Nivel de Estresse" value={nivelEstresse} onChange={setNivelEstresse} icon={Brain} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Weight className="w-3 h-3" /> Peso (kg)
              </label>
              <Input placeholder="Ex: 72.5" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Altura (m)
              </label>
              <Input placeholder="Ex: 1.75" value={alturaM} onChange={(e) => setAlturaM(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Pressao Arterial
              </label>
              <Input placeholder="Ex: 120/80" value={pressaoArterial} onChange={(e) => setPressaoArterial(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Observacoes Clinicas</label>
            <Textarea
              placeholder="Notas adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={onSave} disabled={criar.isPending} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {criar.isPending ? "Salvando..." : "Registrar Estado de Saude"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatPeriodo(p: string) {
  const map: Record<string, string> = {
    INICIAL: "Inicial",
    RETORNO_30D: "Retorno 30 dias",
    RETORNO_60D: "Retorno 60 dias",
    RETORNO_90D: "Retorno 90 dias",
    RETORNO_6M: "Retorno 6 meses",
    RETORNO_12M: "Retorno 12 meses",
    ACOMPANHAMENTO: "Acompanhamento",
  };
  return map[p] || p;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function QuestionarioPaciente() {
  const [, params] = useRoute("/pacientes/:id/questionario");
  const pacienteId = parseInt(params?.id || "0");
  const { data: paciente, isLoading: loadingPaciente } = useObterPaciente(pacienteId, { query: { enabled: !!pacienteId } });
  const { data: perguntas, isLoading: loadingPerguntas } = useListarPerguntasQuestionario(pacienteId, { query: { enabled: !!pacienteId } });
  const { data: respostas, isLoading: loadingRespostas } = useListarRespostasQuestionario(pacienteId, { query: { enabled: !!pacienteId } });
  const { data: estados, isLoading: loadingEstados } = useListarEstadoSaude(pacienteId, { query: { enabled: !!pacienteId } });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const atualizarResposta = useAtualizarRespostaQuestionario();
  const atualizarEstado = useAtualizarEstadoSaude();

  const [expandedResposta, setExpandedResposta] = useState<number | null>(null);

  const isLoading = loadingPaciente || loadingPerguntas || loadingRespostas || loadingEstados;

  const estadoAtual = estados?.find((e: any) => e.status === "ATIVO");
  const estadosHistorico = estados?.filter((e: any) => e.status === "HISTORICO") || [];

  const updateStatus = (respostaId: number, newStatus: string) => {
    atualizarResposta.mutate(
      { pacienteId, id: respostaId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListarRespostasQuestionarioQueryKey(pacienteId) });
          toast({ title: `Status alterado para ${newStatus}` });
        },
      }
    );
  };

  const updateEstadoEvolucao = (estadoId: number, newEvolucao: string) => {
    atualizarEstado.mutate(
      { pacienteId, id: estadoId, data: { evolucao: newEvolucao } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListarEstadoSaudeQueryKey(pacienteId) });
          toast({ title: `Evolucao atualizada para ${newEvolucao}` });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/pacientes/${pacienteId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Questionario de Saude
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {paciente?.nome} — Historico de saude e questionarios preenchidos
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <NovoEstadoSaudeDialog pacienteId={pacienteId} />
                {perguntas && perguntas.length > 0 && (
                  <NovoQuestionarioDialog pacienteId={pacienteId} perguntas={perguntas} />
                )}
              </div>
            </div>

            <Tabs defaultValue="estado-saude" className="w-full">
              <TabsList className="bg-muted/30 border border-border/50">
                <TabsTrigger value="estado-saude" className="gap-2">
                  <HeartPulse className="w-4 h-4" />
                  Estado de Saude
                  {estados && <Badge variant="outline" className="ml-1 text-xs">{estados.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="questionarios" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Questionarios
                  {respostas && <Badge variant="outline" className="ml-1 text-xs">{respostas.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="evolucao" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Linha do Tempo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="estado-saude" className="space-y-4 mt-4">
                {estadoAtual ? (
                  <Card className="bg-card border-primary/30 border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <HeartPulse className="w-5 h-5 text-primary" />
                          Estado Atual
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[estadoAtual.status]}>
                            {estadoAtual.status}
                          </Badge>
                          {(() => {
                            const ev = EVOLUCAO_COLORS[estadoAtual.evolucao] || EVOLUCAO_COLORS.INICIAL;
                            const EvIcon = ev.icon;
                            return (
                              <Badge variant="outline" className={`${ev.color} border-current`}>
                                <EvIcon className="w-3 h-3 mr-1" />
                                {estadoAtual.evolucao}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(estadoAtual.dataAvaliacao)} — {formatPeriodo(estadoAtual.periodo)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Activity className="w-4 h-4 text-orange-400" />
                            Condicoes Atuais
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {((estadoAtual.condicoesAtuais as any)?.lista || []).map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                          </div>

                          {(estadoAtual.sintomasAtivos as any)?.lista?.length > 0 && (
                            <>
                              <h4 className="text-sm font-semibold flex items-center gap-1 mt-2">
                                <Thermometer className="w-4 h-4 text-red-400" />
                                Sintomas Ativos
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {((estadoAtual.sintomasAtivos as any)?.lista || []).map((s: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs text-red-400 border-red-400/30">{s}</Badge>
                                ))}
                              </div>
                            </>
                          )}

                          {(estadoAtual.medicamentosEmUso as any)?.lista?.length > 0 && (
                            <>
                              <h4 className="text-sm font-semibold flex items-center gap-1 mt-2">
                                <Pill className="w-4 h-4 text-blue-400" />
                                Medicamentos em Uso
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {((estadoAtual.medicamentosEmUso as any)?.lista || []).map((m: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs text-blue-400 border-blue-400/30">{m}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Indicadores</h4>
                          <div className="space-y-2">
                            {estadoAtual.nivelEnergia && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground"><Zap className="w-3 h-3" /> Energia</span>
                                <span className="font-mono font-bold">{estadoAtual.nivelEnergia}/10</span>
                              </div>
                            )}
                            {estadoAtual.nivelDor && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground"><Thermometer className="w-3 h-3" /> Dor</span>
                                <span className="font-mono font-bold">{estadoAtual.nivelDor}/10</span>
                              </div>
                            )}
                            {estadoAtual.qualidadeSono && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground"><Moon className="w-3 h-3" /> Sono</span>
                                <span className="font-mono font-bold">{estadoAtual.qualidadeSono}/10</span>
                              </div>
                            )}
                            {estadoAtual.nivelEstresse && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground"><Brain className="w-3 h-3" /> Estresse</span>
                                <span className="font-mono font-bold">{estadoAtual.nivelEstresse}/10</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 mt-3">
                            {estadoAtual.pesoKg && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Peso</span>
                                <span>{estadoAtual.pesoKg} kg</span>
                              </div>
                            )}
                            {estadoAtual.alturaM && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Altura</span>
                                <span>{estadoAtual.alturaM} m</span>
                              </div>
                            )}
                            {estadoAtual.pressaoArterial && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">PA</span>
                                <span>{estadoAtual.pressaoArterial}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <label className="text-xs text-muted-foreground">Alterar Evolucao:</label>
                            <Select value={estadoAtual.evolucao} onValueChange={(v) => updateEstadoEvolucao(estadoAtual.id, v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INICIAL">Inicial</SelectItem>
                                <SelectItem value="MELHORADO">Melhorado</SelectItem>
                                <SelectItem value="ESTAVEL">Estavel</SelectItem>
                                <SelectItem value="PIORADO">Piorado</SelectItem>
                                <SelectItem value="CURADO">Curado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {estadoAtual.observacoes && (
                        <div className="p-3 bg-muted/10 rounded-md border border-border/30">
                          <p className="text-sm text-muted-foreground">{estadoAtual.observacoes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <HeartPulse className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum estado de saude registrado.</p>
                      <p className="text-xs mt-1">Clique em "Registrar Estado de Saude" para criar o primeiro registro.</p>
                    </CardContent>
                  </Card>
                )}

                {estadosHistorico.length > 0 && (
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <History className="w-4 h-4" />
                        Historico de Estados Anteriores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {estadosHistorico.map((estado: any) => {
                        const ev = EVOLUCAO_COLORS[estado.evolucao] || EVOLUCAO_COLORS.INICIAL;
                        const EvIcon = ev.icon;
                        return (
                          <div key={estado.id} className="flex items-center gap-4 p-3 bg-muted/10 rounded-md border border-border/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{formatPeriodo(estado.periodo)}</span>
                                <Badge variant="outline" className={`text-xs ${ev.color} border-current`}>
                                  <EvIcon className="w-3 h-3 mr-1" />
                                  {estado.evolucao}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(estado.dataAvaliacao)}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {((estado.condicoesAtuais as any)?.lista || []).slice(0, 5).map((c: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                                ))}
                                {((estado.condicoesAtuais as any)?.lista || []).length > 5 && (
                                  <Badge variant="outline" className="text-xs">+{((estado.condicoesAtuais as any)?.lista || []).length - 5}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs text-muted-foreground space-y-1">
                              {estado.nivelEnergia && <div>Energia: {estado.nivelEnergia}/10</div>}
                              {estado.nivelDor && <div>Dor: {estado.nivelDor}/10</div>}
                              {estado.pesoKg && <div>Peso: {estado.pesoKg}kg</div>}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="questionarios" className="space-y-4 mt-4">
                {!respostas || respostas.length === 0 ? (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum questionario preenchido.</p>
                      <p className="text-xs mt-1">Clique em "Novo Questionario" para registrar o primeiro.</p>
                    </CardContent>
                  </Card>
                ) : (
                  respostas.map((resp: any) => (
                    <Card key={resp.id} className="bg-card border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedResposta(expandedResposta === resp.id ? null : resp.id)}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            {expandedResposta === resp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{formatPeriodo(resp.periodo)}</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(resp.dataPreenchimento)}
                            </span>
                            <Select
                              value={resp.status}
                              onValueChange={(v) => updateStatus(resp.id, v)}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                                <SelectItem value="VALIDADO">Validado</SelectItem>
                                <SelectItem value="APROVADO">Aprovado</SelectItem>
                                <SelectItem value="STAND BY">Stand By</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedResposta === resp.id && (
                        <CardContent className="space-y-2">
                          {Object.entries(resp.respostas as Record<string, string>).map(([key, val]) => {
                            const pergunta = perguntas?.find((p: any) => p.perguntaId === key);
                            return (
                              <div key={key} className="flex gap-3 py-1 border-b border-border/20 last:border-0">
                                <span className="text-xs font-mono text-orange-400 w-10 shrink-0">{key}</span>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">{pergunta?.pergunta || key}</p>
                                  <p className="text-sm font-medium">{val || "-"}</p>
                                </div>
                              </div>
                            );
                          })}
                          {resp.observacoesMedico && (
                            <div className="p-3 bg-muted/10 rounded-md mt-2">
                              <p className="text-xs text-muted-foreground">Observacoes do Medico:</p>
                              <p className="text-sm">{resp.observacoesMedico}</p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="evolucao" className="space-y-4 mt-4">
                {!estados || estados.length === 0 ? (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum registro de evolucao.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border/50" />
                    {estados.map((estado: any, idx: number) => {
                      const ev = EVOLUCAO_COLORS[estado.evolucao] || EVOLUCAO_COLORS.INICIAL;
                      const EvIcon = ev.icon;
                      return (
                        <div key={estado.id} className="relative flex gap-4 pb-6">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            idx === 0 ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/30"
                          }`}>
                            <EvIcon className={`w-5 h-5 ${ev.color}`} />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatPeriodo(estado.periodo)}</span>
                              <Badge variant="outline" className={`text-xs ${ev.color} border-current`}>
                                {estado.evolucao}
                              </Badge>
                              <Badge className={`text-xs ${STATUS_COLORS[estado.status]}`}>
                                {estado.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(estado.dataAvaliacao)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {((estado.condicoesAtuais as any)?.lista || []).map((c: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                              ))}
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {estado.nivelEnergia && <span>Energia: {estado.nivelEnergia}/10</span>}
                              {estado.nivelDor && <span>Dor: {estado.nivelDor}/10</span>}
                              {estado.qualidadeSono && <span>Sono: {estado.qualidadeSono}/10</span>}
                              {estado.pesoKg && <span>Peso: {estado.pesoKg}kg</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
