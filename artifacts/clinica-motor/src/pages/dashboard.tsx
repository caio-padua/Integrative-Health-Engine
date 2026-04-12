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
import { Activity, Users, ClipboardList, CheckSquare, TrendingUp, AlertTriangle, Clock, Building2, ArrowUpRight, ArrowDownRight, Diamond, Award, Shield, Coins, FileText, DollarSign, Target, Zap, Search, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api";

const PLANO_CORES: Record<string, { cor: string; icon: any; label: string }> = {
  diamante: { cor: "#B9F2FF", icon: Diamond, label: "Diamante" },
  ouro: { cor: "#FFD700", icon: Award, label: "Ouro" },
  prata: { cor: "#C0C0C0", icon: Shield, label: "Prata" },
  cobre: { cor: "#B87333", icon: Coins, label: "Cobre" },
};

const COMPLEX_CORES: Record<string, { cor: string; label: string }> = {
  verde: { cor: "#22C55E", label: "Simples" },
  amarela: { cor: "#EAB308", label: "Moderada" },
  vermelha: { cor: "#EF4444", label: "Complexa" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { isTodasClinicas, escopo, unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, modoVisao, setUnidadeSelecionada } = useClinic();

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

  const { data: donoClinica, isLoading: loadingDono } = useQuery({
    queryKey: ["dashboard-dono-clinica", unidadeSelecionada],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard/dono-clinica/${unidadeSelecionada}`);
      if (!res.ok) throw new Error("Erro ao carregar dados da clinica");
      return res.json();
    },
    enabled: !!user && !!unidadeSelecionada && modoVisao === "dono_clinica",
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

  if (modoVisao === "dono_clinica" && unidadeSelecionada) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {escopo === "consultoria_master" && (
                <button
                  onClick={() => setUnidadeSelecionada(null)}
                  className="p-2 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  title="Voltar ao Dashboard Global"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: corUnidadeSelecionada || "#6B7280" }} />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Unidade</h1>
                <p className="text-sm mt-1" style={{ color: corUnidadeSelecionada || "#6B7280" }}>{nomeUnidadeSelecionada}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: corUnidadeSelecionada || "#6B7280" }}>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: corUnidadeSelecionada || "#6B7280" }}></span>
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: corUnidadeSelecionada || "#6B7280" }}></span>
              </span>
              Visao Local
            </div>
          </div>

          {loadingDono ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : donoClinica ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Pacientes Ativos" value={donoClinica.pacientes.ativos} icon={Users} colorClass="text-blue-500" loading={false} subtitle={`${donoClinica.pacientes.total} total`} />
                <StatCard title="Demandas Abertas" value={donoClinica.demandas.abertas} icon={FileText} colorClass="text-orange-500" loading={false} subtitle={`${donoClinica.demandas.total} total`} />
                <StatCard title="Taxa Resolucao" value={`${donoClinica.delegacoes.taxaResolucao}%`} icon={TrendingUp} colorClass="text-emerald-500" loading={false} subtitle={`${donoClinica.delegacoes.concluidas}/${donoClinica.delegacoes.total} delegacoes`} />
                <StatCard title="Custo Demandas" value={`R$ ${donoClinica.demandas.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} colorClass="text-amber-500" loading={false} subtitle={`${donoClinica.demandas.concluidas} concluidas`} />
              </div>

              {donoClinica.delegacoes.atrasadas > 0 && (
                <Card className="bg-red-950/30 border-red-500/30">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-400">
                      {donoClinica.delegacoes.atrasadas} delegacoes atrasadas nesta clinica
                    </span>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Diamond className="w-4 h-4 text-cyan-300" />Distribuicao de Planos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(donoClinica.pacientes.distribuicaoPlanos).map(([key, val]) => {
                        const cfg = PLANO_CORES[key];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" style={{ color: cfg.cor }} />
                              <span className="text-sm font-medium">{cfg.label}</span>
                            </div>
                            <span className="text-xl font-bold" style={{ color: cfg.cor }}>{val as number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-green-400" />Demandas por Complexidade</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(donoClinica.demandas.porComplexidade).map(([key, val]) => {
                        const cfg = COMPLEX_CORES[key];
                        if (!cfg) return null;
                        const total = donoClinica.demandas.total || 1;
                        const pct = Math.round(((val as number) / total) * 100);
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.cor }} />
                                <span className="text-sm">{cfg.label}</span>
                              </div>
                              <span className="text-sm font-bold">{val as number}</span>
                            </div>
                            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.cor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Tempo total investido</span>
                      <span className="text-sm font-bold">{Math.round(donoClinica.demandas.tempoTotalMin / 60)}h {donoClinica.demandas.tempoTotalMin % 60}min</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" />Delegacoes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-yellow-500/5 rounded border border-border/50 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{donoClinica.delegacoes.pendentes}</p>
                        <p className="text-[10px] text-muted-foreground">Pendentes</p>
                      </div>
                      <div className="p-3 bg-blue-500/5 rounded border border-border/50 text-center">
                        <p className="text-2xl font-bold text-blue-400">{donoClinica.delegacoes.emAndamento}</p>
                        <p className="text-[10px] text-muted-foreground">Em Andamento</p>
                      </div>
                      <div className="p-3 bg-green-500/5 rounded border border-border/50 text-center">
                        <p className="text-2xl font-bold text-green-400">{donoClinica.delegacoes.concluidas}</p>
                        <p className="text-[10px] text-muted-foreground">Concluidas</p>
                      </div>
                      <div className="p-3 bg-red-500/5 rounded border border-border/50 text-center">
                        <p className="text-2xl font-bold text-red-400">{donoClinica.delegacoes.atrasadas}</p>
                        <p className="text-[10px] text-muted-foreground">Atrasadas</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Taxa de resolucao</span>
                        <span className="text-sm font-bold">{donoClinica.delegacoes.taxaResolucao}%</span>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${donoClinica.delegacoes.taxaResolucao}%`, backgroundColor: corUnidadeSelecionada || "#6B7280" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-orange-400" />Filas Operacionais</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                        <span className="text-sm">Anamnese</span>
                        <span className="text-lg font-bold">{donoClinica.filas.anamnese}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                        <span className="text-sm">Validacao</span>
                        <span className="text-lg font-bold">{donoClinica.filas.validacao}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                        <span className="text-sm">Procedimento</span>
                        <span className="text-lg font-bold">{donoClinica.filas.procedimento}</span>
                      </div>
                      {donoClinica.filas.urgentes > 0 && (
                        <div className="flex items-center justify-between p-3 bg-red-900/20 rounded border border-red-500/50">
                          <span className="text-sm font-medium text-red-400">Urgencias</span>
                          <span className="text-lg font-bold text-red-400">{donoClinica.filas.urgentes}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{donoClinica.anamnesesPendentes} anamneses pendentes</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {donoClinica.demandas.recentes?.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base">Ultimas Demandas</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {donoClinica.demandas.recentes.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded border border-border/50">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COMPLEX_CORES[d.complexidade]?.cor || "#6B7280" }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{d.titulo}</span>
                            <span className="text-[10px] text-muted-foreground">{d.tipo.replace(/_/g, " ")}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${d.status === "concluida" ? "bg-green-500/10 text-green-400" : d.status === "aberta" ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}>
                            {d.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </Layout>
    );
  }

  if (isTodasClinicas && escopo === "consultoria_master") {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Global</h1>
              <p className="text-sm text-muted-foreground mt-1">Visao consolidada do ecossistema</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Visao Global
            </div>
          </div>

          {loadingConsultoria ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : consultoria ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Clinicas Ativas" value={consultoria.totalGeral.clinicas} icon={Building2} colorClass="text-blue-500" loading={false} />
                <StatCard title="Total Pacientes" value={consultoria.totalGeral.pacientes} icon={Users} colorClass="text-green-500" loading={false} />
                <StatCard title="Delegacoes Pendentes" value={consultoria.totalGeral.delegacoesPendentes} icon={ClipboardList} colorClass="text-orange-500" loading={false} />
                <StatCard title="Taxa Resolucao Geral" value={`${consultoria.totalGeral.taxaResolucaoGeral}%`} icon={TrendingUp} colorClass="text-emerald-500" loading={false} />
              </div>

              {consultoria.totalGeral.delegacoesAtrasadas > 0 && (
                <Card className="bg-red-950/30 border-red-500/30">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-400">
                      {consultoria.totalGeral.delegacoesAtrasadas} delegacoes atrasadas no total
                    </span>
                  </CardContent>
                </Card>
              )}

              <h2 className="text-lg font-semibold text-foreground">Clinicas do Ecossistema</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {consultoria.porClinica.map((c: any) => (
                  <Card
                    key={c.unidadeId}
                    className="bg-card border-border/50 relative overflow-hidden cursor-pointer hover:border-border transition-all hover:shadow-lg hover:shadow-black/20 group"
                    onClick={() => setUnidadeSelecionada(c.unidadeId)}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5" style={{ backgroundColor: c.unidadeCor || "#6B7280" }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.unidadeCor || "#6B7280" }} />
                          <CardTitle className="text-sm font-semibold">{c.unidadeNome}</CardTitle>
                        </div>
                        <Search className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Pacientes</div>
                          <div className="text-xl font-bold">{c.totalPacientes}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Resolucao</div>
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
                  <CardTitle>Delegacoes por Clinica</CardTitle>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Visao Geral do Motor</h1>
            {unidadeSelecionada && <p className="text-sm text-muted-foreground mt-1">{nomeUnidadeSelecionada}</p>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            {unidadeSelecionada ? "Modo Operacao" : "Sistema Operante"}
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
            title="Aguardando Validacao" 
            value={dashboard?.sugestoesPendentesValidacao || 0} 
            icon={CheckSquare} 
            colorClass="text-red-500" 
            loading={loadingDash} 
            subtitle="Sugestoes do motor"
          />
          <StatCard 
            title="Taxa de Validacao" 
            value={`${metricas?.taxaValidacao || 0}%`} 
            icon={TrendingUp} 
            colorClass="text-green-500" 
            loading={loadingMetricas} 
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 bg-card border-border/50">
            <CardHeader>
              <CardTitle>Sugestoes por Tipo</CardTitle>
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
                      {metricas?.sugestoesPorTipo?.map((_entry: any, index: number) => (
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
                      <span className="font-medium">Validacao</span>
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
                      <span className="font-medium text-red-500">Urgencias Totais</span>
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
