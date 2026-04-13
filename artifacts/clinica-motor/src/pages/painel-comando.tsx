import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Calendar, AlertTriangle, Pill, Activity,
  TrendingUp, Heart, Clock, XCircle, CheckCircle2,
  Flame, Eye, ChevronRight, Shield
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useClinic } from "@/contexts/ClinicContext";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SubstanciaResumo {
  nome: string;
  total: number;
  ativos: number;
  pausados: number;
  pacientesUnicos: number;
}

interface AlertaDetalhe {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  tipo: string;
  descricao: string;
  gravidade: string;
  criadoEm: string;
}

interface FaltaDetalhe {
  pacienteId: number;
  pacienteNome: string;
  data: string;
  tipo: string;
}

interface SessaoSemana {
  pacienteId: number;
  pacienteNome: string;
  status: string;
  data: string;
  tipo: string;
}

interface DashboardComando {
  resumoGeral: {
    totalPacientes: number;
    sessoesHoje: number;
    sessoesAmanha: number;
    sessoesSemana: number;
    faltasSemana: number;
    alertasAbertos: number;
    alertasGraves: number;
    substanciasEmUso: number;
  };
  statusSessoes: {
    total: number;
    agendadas: number;
    confirmadas: number;
    concluidas: number;
    faltas: number;
    canceladas: number;
  };
  substanciasResumo: SubstanciaResumo[];
  alertasDetalhes: AlertaDetalhe[];
  faltasDetalhes: FaltaDetalhe[];
  sessoesUltimaSemana: SessaoSemana[];
}

const GRAVIDADE_COLORS: Record<string, string> = {
  GRAVE: "bg-red-500/20 text-red-400 border-red-500/30",
  MODERADO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  LEVE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const TIPO_ALERTA_LABELS: Record<string, string> = {
  PRESSAO_ALTA: "Pressao Alta",
  GLICEMIA_ALTA: "Glicemia Alta",
  EFEITO_COLATERAL: "Efeito Colateral",
  MAL_ESTAR: "Mal-Estar",
  ALERGIA: "Alergia",
};

const STATUS_SESSAO_COLORS: Record<string, string> = {
  agendada: "bg-blue-500/20 text-blue-400",
  confirmada: "bg-emerald-500/20 text-emerald-400",
  concluida: "bg-green-500/20 text-green-400",
  faltou: "bg-red-500/20 text-red-400",
  cancelada: "bg-zinc-500/20 text-zinc-400",
  parcial: "bg-amber-500/20 text-amber-400",
};

function StatMini({ label, value, icon: Icon, color, pulse }: {
  label: string; value: number | string; icon: any; color: string; pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border/50 transition-all hover:border-border">
      <div className={`p-2.5 ${color} relative`}>
        <Icon className="w-5 h-5" />
        {pulse && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tighter">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function MicroMatriz({ title, icon: Icon, items, emptyText, renderItem }: {
  title: string;
  icon: any;
  items: any[];
  emptyText: string;
  renderItem: (item: any, i: number) => React.ReactNode;
}) {
  return (
    <Card className="bg-card border-border/50 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[400px] space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{emptyText}</div>
        ) : (
          items.map((item, i) => renderItem(item, i))
        )}
      </CardContent>
    </Card>
  );
}

export default function PainelComando() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();
  const [data, setData] = useState<DashboardComando | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubstancia, setSelectedSubstancia] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visao-geral");

  useEffect(() => {
    setLoading(true);
    const params = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";
    fetch(`${API_BASE}/dashboard/comando${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unidadeSelecionada]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-80" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Erro ao carregar painel de comando</div>
      </Layout>
    );
  }

  const { resumoGeral, statusSessoes, substanciasResumo, alertasDetalhes, faltasDetalhes, sessoesUltimaSemana } = data;

  const pieData = [
    { name: "Concluidas", value: statusSessoes.concluidas, fill: "#22c55e" },
    { name: "Agendadas", value: statusSessoes.agendadas, fill: "#3b82f6" },
    { name: "Confirmadas", value: statusSessoes.confirmadas, fill: "#10b981" },
    { name: "Faltas", value: statusSessoes.faltas, fill: "#ef4444" },
    { name: "Canceladas", value: statusSessoes.canceladas, fill: "#71717a" },
  ].filter(d => d.value > 0);

  const substBarData = substanciasResumo.slice(0, 8).map(s => ({
    nome: s.nome.length > 14 ? s.nome.slice(0, 14) + "..." : s.nome,
    full: s.nome,
    ativos: s.ativos,
    pausados: s.pausados,
    pacientes: s.pacientesUnicos,
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Painel de Comando
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTodasClinicas
                ? "Visao em tempo real de toda a operacao clinica"
                : <span>Operacao clinica — <span style={{ color: corUnidadeSelecionada || "#6B7280" }} className="font-medium">{nomeUnidadeSelecionada}</span></span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Atualizado agora
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatMini label="Pacientes Ativos" value={resumoGeral.totalPacientes} icon={Users} color="bg-blue-500/10 text-blue-400" />
          <StatMini label="Sessoes Hoje" value={resumoGeral.sessoesHoje} icon={Calendar} color="bg-emerald-500/10 text-emerald-400" />
          <StatMini
            label="Alertas Abertos"
            value={resumoGeral.alertasAbertos}
            icon={AlertTriangle}
            color="bg-red-500/10 text-red-400"
            pulse={resumoGeral.alertasGraves > 0}
          />
          <StatMini label="Substancias em Uso" value={resumoGeral.substanciasEmUso} icon={Pill} color="bg-purple-500/10 text-purple-400" />
        </div>

        {resumoGeral.alertasGraves > 0 && (
          <div className="bg-red-900/20 border border-red-500/40 p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-red-400 font-bold text-sm uppercase tracking-wide">
                {resumoGeral.alertasGraves} Alerta{resumoGeral.alertasGraves > 1 ? 's' : ''} Grave{resumoGeral.alertasGraves > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {alertasDetalhes.filter(a => a.gravidade === "GRAVE").map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs whitespace-nowrap">
                  <span className="font-semibold text-red-300">{a.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                  <span className="text-red-400/70">{TIPO_ALERTA_LABELS[a.tipo] || a.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="visao-geral" className="text-xs">Visao Geral</TabsTrigger>
            <TabsTrigger value="substancias" className="text-xs">Quem usa o que?</TabsTrigger>
            <TabsTrigger value="sessoes" className="text-xs">Sessoes da Semana</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">Alertas Clinicos</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-4 space-y-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              <StatMini label="Sessoes Amanha" value={resumoGeral.sessoesAmanha} icon={Clock} color="bg-sky-500/10 text-sky-400" />
              <StatMini label="Sessoes Semana" value={resumoGeral.sessoesSemana} icon={TrendingUp} color="bg-indigo-500/10 text-indigo-400" />
              <StatMini label="Faltas Semana" value={resumoGeral.faltasSemana} icon={XCircle} color="bg-orange-500/10 text-orange-400" />
              <StatMini label="Alertas Graves" value={resumoGeral.alertasGraves} icon={Flame} color="bg-red-500/10 text-red-400" />
              <StatMini label="Concluidas" value={statusSessoes.concluidas} icon={CheckCircle2} color="bg-green-500/10 text-green-400" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Status das Sessoes
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    Top Substancias (pacientes ativos)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={substBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" stroke="#888888" fontSize={11} />
                      <YAxis type="category" dataKey="nome" stroke="#888888" fontSize={10} width={110} tick={{ fill: '#9ca3af' }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        formatter={(value: any, name: string) => [value, name === 'ativos' ? 'Ativos' : 'Pausados']}
                      />
                      <Bar dataKey="ativos" fill="hsl(210, 45%, 65%)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="pausados" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MicroMatriz
                title="Faltas na Ultima Semana"
                icon={XCircle}
                items={faltasDetalhes}
                emptyText="Nenhuma falta registrada"
                renderItem={(f: FaltaDetalhe, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{f.pacienteNome.split(' ').slice(0, 3).join(' ')}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')} - {f.tipo}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              />

              <MicroMatriz
                title="Alertas Clinicos Abertos"
                icon={AlertTriangle}
                items={alertasDetalhes.slice(0, 6)}
                emptyText="Nenhum alerta aberto"
                renderItem={(a: AlertaDetalhe, i) => (
                  <div key={a.id} className={`flex items-start gap-3 p-3 border ${a.gravidade === 'GRAVE' ? 'bg-red-900/10 border-red-500/30' : 'bg-muted/30 border-border/40'} hover:bg-muted/50 transition-colors`}>
                    <div className={`mt-0.5 w-8 h-8 flex items-center justify-center ${a.gravidade === 'GRAVE' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                      {a.gravidade === 'GRAVE' ? <Flame className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{a.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                        <Badge className={`text-[9px] px-1.5 py-0 border ${GRAVIDADE_COLORS[a.gravidade]}`}>
                          {a.gravidade}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{a.descricao}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {TIPO_ALERTA_LABELS[a.tipo] || a.tipo} - {new Date(a.criadoEm).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="substancias" className="mt-4 space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {substanciasResumo.map(s => (
                <div
                  key={s.nome}
                  className={`p-4 bg-card border cursor-pointer transition-all ${
                    selectedSubstancia === s.nome ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'
                  }`}
                  onClick={() => setSelectedSubstancia(selectedSubstancia === s.nome ? null : s.nome)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">{s.nome}</span>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-emerald-400">{s.ativos}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Ativos</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-amber-400">{s.pausados}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Pausados</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-400">{s.pacientesUnicos}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Pacientes</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-muted/50 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(s.ativos / Math.max(s.total, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {selectedSubstancia && (
              <Card className="bg-card border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Detalhes: {selectedSubstancia}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const s = substanciasResumo.find(x => x.nome === selectedSubstancia);
                      if (!s) return null;
                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted/30 border border-border/40 text-center">
                            <div className="text-2xl font-bold text-foreground">{s.pacientesUnicos}</div>
                            <div className="text-[11px] uppercase tracking-wider">Pacientes Unicos</div>
                          </div>
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{s.ativos}</div>
                            <div className="text-[11px] uppercase tracking-wider text-emerald-400/70">Em Uso Ativo</div>
                          </div>
                          <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-center">
                            <div className="text-2xl font-bold text-amber-400">{s.pausados}</div>
                            <div className="text-[11px] uppercase tracking-wider text-amber-400/70">Pausados</div>
                          </div>
                          <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-center">
                            <div className="text-2xl font-bold text-blue-400">{Math.round((s.ativos / Math.max(s.total, 1)) * 100)}%</div>
                            <div className="text-[11px] uppercase tracking-wider text-blue-400/70">Taxa Adesao</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sessoes" className="mt-4 space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
              <StatMini label="Total" value={statusSessoes.total} icon={Calendar} color="bg-blue-500/10 text-blue-400" />
              <StatMini label="Agendadas" value={statusSessoes.agendadas} icon={Clock} color="bg-sky-500/10 text-sky-400" />
              <StatMini label="Concluidas" value={statusSessoes.concluidas} icon={CheckCircle2} color="bg-green-500/10 text-green-400" />
              <StatMini label="Faltas" value={statusSessoes.faltas} icon={XCircle} color="bg-red-500/10 text-red-400" />
              <StatMini label="Canceladas" value={statusSessoes.canceladas} icon={XCircle} color="bg-zinc-500/10 text-zinc-400" />
            </div>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Sessoes dos Ultimos 7 Dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 py-2">
                    <span>Paciente</span>
                    <span>Data</span>
                    <span>Tipo</span>
                    <span>Status</span>
                  </div>
                  {sessoesUltimaSemana.map((s, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                      <span className="text-sm font-medium truncate">{s.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                      <span className="text-xs text-muted-foreground">{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <Badge variant="outline" className="text-[10px] w-fit">{s.tipo}</Badge>
                      <Badge className={`text-[10px] w-fit ${STATUS_SESSAO_COLORS[s.status] || 'bg-muted'}`}>
                        {s.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4 space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 mb-4">
              <StatMini label="Total Abertos" value={resumoGeral.alertasAbertos} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
              <StatMini label="Graves" value={resumoGeral.alertasGraves} icon={Flame} color="bg-red-500/10 text-red-400" pulse={resumoGeral.alertasGraves > 0} />
              <StatMini label="Moderados" value={alertasDetalhes.filter(a => a.gravidade === "MODERADO").length} icon={Eye} color="bg-amber-500/10 text-amber-400" />
            </div>

            <div className="space-y-3">
              {alertasDetalhes.map(a => (
                <div key={a.id} className={`p-4 border transition-all ${
                  a.gravidade === 'GRAVE'
                    ? 'bg-red-900/15 border-red-500/40 hover:border-red-500/60'
                    : a.gravidade === 'MODERADO'
                    ? 'bg-amber-900/10 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-card border-border/50 hover:border-border'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 ${a.gravidade === 'GRAVE' ? 'bg-red-500/20' : a.gravidade === 'MODERADO' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                      {a.gravidade === 'GRAVE' ? <Flame className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{a.pacienteNome}</span>
                        <Badge className={`text-[10px] px-2 py-0 border ${GRAVIDADE_COLORS[a.gravidade]}`}>
                          {a.gravidade}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-2 py-0">
                          {TIPO_ALERTA_LABELS[a.tipo] || a.tipo}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.descricao}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-2">
                        Registrado em {new Date(a.criadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}