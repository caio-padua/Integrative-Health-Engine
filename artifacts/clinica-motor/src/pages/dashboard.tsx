import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useObterResumoDashboard, 
  useObterMetricasMotor, 
  useObterAtividadeRecente, 
  useObterResumoFilas,
  getObterResumoDashboardQueryKey,
  getObterMetricasMotorQueryKey,
  getObterAtividadeRecenteQueryKey,
  getObterResumoFilasQueryKey
} from "@workspace/api-client-react";
import { Activity, Users, ClipboardList, CheckSquare, TrendingUp, AlertTriangle, Clock, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api";

export default function Dashboard() {
  const { user } = useAuth();
  const { isTodasClinicas, escopo, unidadeSelecionada, nomeUnidadeSelecionada } = useClinic();

  const { data: dashboard, isLoading: loadingDash } = useObterResumoDashboard({
    query: { enabled: !!user, queryKey: getObterResumoDashboardQueryKey() }
  });

  const { data: metricas, isLoading: loadingMetricas } = useObterMetricasMotor({
    query: { enabled: !!user, queryKey: getObterMetricasMotorQueryKey() }
  });

  const { data: atividade, isLoading: loadingAtiv } = useObterAtividadeRecente(undefined, {
    query: { enabled: !!user, queryKey: getObterAtividadeRecenteQueryKey() }
  });

  const { data: filas, isLoading: loadingFilas } = useObterResumoFilas({
    query: { enabled: !!user, queryKey: getObterResumoFilasQueryKey() }
  });

  const { data: consultoria, isLoading: loadingConsultoria } = useQuery({
    queryKey: ["dashboard-consultoria"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard/consultoria`);
      if (!res.ok) throw new Error("Erro ao carregar consultoria");
      return res.json();
    },
    enabled: !!user && isTodasClinicas && escopo === "consultoria_master",
  });

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, loading }: any) => (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <div className="text-3xl font-bold tracking-tighter" data-testid={`stat-${title}`}>{value}</div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (isTodasClinicas && escopo === "consultoria_master") {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel da Consultoria</h1>
              <p className="text-sm text-muted-foreground mt-1">Visão consolidada de todas as clínicas</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Modo Consultoria
            </div>
          </div>

          {loadingConsultoria ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : consultoria ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Clínicas Ativas" value={consultoria.totalGeral.clinicas} icon={Building2} colorClass="text-blue-500" loading={false} />
                <StatCard title="Total Pacientes" value={consultoria.totalGeral.pacientes} icon={Users} colorClass="text-green-500" loading={false} />
                <StatCard title="Delegações Pendentes" value={consultoria.totalGeral.delegacoesPendentes} icon={ClipboardList} colorClass="text-orange-500" loading={false} />
                <StatCard title="Taxa Resolução Geral" value={`${consultoria.totalGeral.taxaResolucaoGeral}%`} icon={TrendingUp} colorClass="text-emerald-500" loading={false} />
              </div>

              {consultoria.totalGeral.delegacoesAtrasadas > 0 && (
                <Card className="bg-red-950/30 border-red-500/30">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-400">
                      {consultoria.totalGeral.delegacoesAtrasadas} delegações atrasadas no total
                    </span>
                  </CardContent>
                </Card>
              )}

              <h2 className="text-lg font-semibold text-foreground">Saúde por Clínica</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {consultoria.porClinica.map((c: any) => (
                  <Card key={c.unidadeId} className="bg-card border-border/50 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: c.unidadeCor || "#6B7280" }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.unidadeCor || "#6B7280" }} />
                        <CardTitle className="text-sm font-semibold">{c.unidadeNome}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Pacientes</div>
                          <div className="text-xl font-bold">{c.totalPacientes}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Resolução</div>
                          <div className="text-xl font-bold flex items-center gap-1">
                            {c.taxaResolucao}%
                            {c.taxaResolucao >= 70 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">{c.delegacoes.pendentes} pendentes</span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{c.delegacoes.emAndamento} em andamento</span>
                        {c.delegacoes.atrasadas > 0 && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded">{c.delegacoes.atrasadas} atrasadas</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${c.taxaResolucao}%`, backgroundColor: c.unidadeCor || "#6B7280" }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle>Delegações por Clínica</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultoria.porClinica} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="unidadeNome" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                      <Bar dataKey="delegacoes.total" name="Total" radius={[4, 4, 0, 0]}>
                        {consultoria.porClinica.map((c: any, i: number) => (
                          <Cell key={`cell-${i}`} fill={c.unidadeCor || "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral do Motor</h1>
            {unidadeSelecionada && <p className="text-sm text-muted-foreground mt-1">{nomeUnidadeSelecionada}</p>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            {unidadeSelecionada ? "Modo Operação" : "Sistema Operante"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Pacientes Ativos" 
            value={dashboard?.totalPacientes || 0} 
            icon={Users} 
            colorClass="text-blue-500" 
            loading={loadingDash} 
          />
          <StatCard 
            title="Anamneses Pendentes" 
            value={dashboard?.anamnesesPendentes || 0} 
            icon={ClipboardList} 
            colorClass="text-orange-500" 
            loading={loadingDash} 
          />
          <StatCard 
            title="Aguardando Validação" 
            value={dashboard?.sugestoesPendentesValidacao || 0} 
            icon={CheckSquare} 
            colorClass="text-red-500" 
            loading={loadingDash} 
            subtitle="Sugestões do motor"
          />
          <StatCard 
            title="Taxa de Validação" 
            value={`${metricas?.taxaValidacao || 0}%`} 
            icon={TrendingUp} 
            colorClass="text-green-500" 
            loading={loadingMetricas} 
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 bg-card border-border/50">
            <CardHeader>
              <CardTitle>Sugestões por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="pl-0 h-[300px]">
              {loadingMetricas ? (
                <div className="h-full flex items-center justify-center"><Activity className="animate-spin text-primary" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricas?.sugestoesPorTipo || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="tipo" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6'}} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {metricas?.sugestoesPorTipo?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 bg-card border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle>Filas Operacionais</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loadingFilas ? (
                 <div className="space-y-4">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
               </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="text-orange-500 w-5 h-5" />
                      <span className="font-medium">Anamnese</span>
                    </div>
                    <span className="text-xl font-bold">{filas?.anamnese || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="text-red-500 w-5 h-5" />
                      <span className="font-medium">Validação</span>
                    </div>
                    <span className="text-xl font-bold">{filas?.validacao || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Activity className="text-blue-500 w-5 h-5" />
                      <span className="font-medium">Procedimento</span>
                    </div>
                    <span className="text-xl font-bold">{filas?.procedimento || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-500/50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="text-red-500 w-5 h-5" />
                      <span className="font-medium text-red-500">Urgências Totais</span>
                    </div>
                    <span className="text-xl font-bold text-red-500">{filas?.totalUrgente || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAtiv ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {atividade?.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 hover:bg-muted/30 transition-colors rounded-lg">
                    <div className="mt-1 p-2 bg-primary/10 rounded-full">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.pacienteNome && <span className="mr-2">Paciente: {item.pacienteNome}</span>}
                        {item.usuarioNome && <span>Por: {item.usuarioNome}</span>}
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {new Date(item.criadoEm).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
