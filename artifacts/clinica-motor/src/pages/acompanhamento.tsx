import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Diamond, Award, Shield, Coins,
  BarChart3, Clock, Users, AlertTriangle,
  TrendingUp, CheckCircle, FileText, Phone
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const API = "/api";

const PLANO_CONFIG = {
  diamante: { nome: "Diamante", cor: "#B9F2FF", corBg: "rgba(185,242,255,0.12)", icon: Diamond, sla: "4h", desc: "Ligação diária + atendimento semanal online" },
  ouro: { nome: "Ouro", cor: "#FFD700", corBg: "rgba(255,215,0,0.10)", icon: Award, sla: "12h", desc: "Atendimento semanal online + follow-up ativo" },
  prata: { nome: "Prata", cor: "#C0C0C0", corBg: "rgba(192,192,192,0.10)", icon: Shield, sla: "24h", desc: "Follow-up quinzenal" },
  cobre: { nome: "Cobre", cor: "#B87333", corBg: "rgba(184,115,51,0.10)", icon: Coins, sla: "72h", desc: "Orientações apenas em consulta" },
} as const;

const COMPLEXIDADE = {
  verde: { label: "Simples", cor: "#22C55E", mult: "1x" },
  amarela: { label: "Moderada", cor: "#EAB308", mult: "1.5x" },
  vermelha: { label: "Complexa", cor: "#EF4444", mult: "2.5x" },
};

type TabType = "planos" | "demandas" | "faturamento";

export default function AcompanhamentoPage() {
  const [tab, setTab] = useState<TabType>("planos");
  const { unidadeSelecionada } = useClinic();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const qp = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";

  const { data: distribuicao, isLoading: loadDist } = useQuery({
    queryKey: ["acomp-dist"],
    queryFn: () => fetch(`${API}/acompanhamento/distribuicao`).then(r => r.json()),
  });

  const { data: resumoDemandas, isLoading: loadResumo } = useQuery({
    queryKey: ["demandas-resumo", unidadeSelecionada],
    queryFn: () => fetch(`${API}/demandas/resumo${qp}`).then(r => r.json()),
  });

  const { data: demandas, isLoading: loadDemandas } = useQuery({
    queryKey: ["demandas-list", unidadeSelecionada],
    queryFn: () => fetch(`${API}/demandas${qp}`).then(r => r.json()),
  });

  const updatePlano = useMutation({
    mutationFn: (args: { pacienteId: number; plano: string }) =>
      fetch(`${API}/acompanhamento/paciente/${args.pacienteId}/plano`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: args.plano }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acomp-dist"] });
      toast({ title: "Plano atualizado" });
    },
  });

  const tabs = [
    { id: "planos" as const, label: "Planos", icon: Diamond },
    { id: "demandas" as const, label: "Demandas de Serviço", icon: FileText },
    { id: "faturamento" as const, label: "Faturamento", icon: BarChart3 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Acompanhamento & Demandas</h1>
            <p className="text-sm text-muted-foreground mt-1">Planos de acompanhamento e rastreamento de serviços por demanda</p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted/30 p-1 rounded">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${tab === t.id ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "planos" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(PLANO_CONFIG) as [string, typeof PLANO_CONFIG["diamante"]][]).map(([key, p]) => {
                const Icon = p.icon;
                const count = distribuicao?.distribuicao?.[key] ?? 0;
                return (
                  <Card key={key} className="relative overflow-hidden border-border/50" style={{ backgroundColor: p.corBg }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: p.cor }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" style={{ color: p.cor }} />
                          <CardTitle className="text-sm font-semibold">{p.nome}</CardTitle>
                        </div>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          SLA: {p.sla}
                        </div>
                        <div>{p.desc}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Pacientes por Plano</CardTitle>
              </CardHeader>
              <CardContent>
                {loadDist ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {distribuicao?.pacientes?.map((p: any) => {
                      const plano = p.planoAcompanhamento || "cobre";
                      const cfg = PLANO_CONFIG[plano as keyof typeof PLANO_CONFIG];
                      const Icon = cfg.icon;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" style={{ color: cfg.cor }} />
                            <span className="text-sm font-medium">{p.nome}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: cfg.corBg, color: cfg.cor }}>
                              {cfg.nome}
                            </span>
                          </div>
                          <select
                            value={plano}
                            onChange={(e) => updatePlano.mutate({ pacienteId: p.id, plano: e.target.value })}
                            className="bg-muted border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="diamante">Diamante</option>
                            <option value="ouro">Ouro</option>
                            <option value="prata">Prata</option>
                            <option value="cobre">Cobre</option>
                          </select>
                        </div>
                      );
                    })}
                    {(!distribuicao?.pacientes || distribuicao.pacientes.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente ativo</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-6">
            {loadResumo ? (
              <div className="grid gap-4 md:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : resumoDemandas ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Demandas</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{resumoDemandas.total}</div></CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Abertas</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-orange-500">{resumoDemandas.abertas}</div></CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Concluídas</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-green-500">{resumoDemandas.concluidas}</div></CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tempo Total</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{Math.round((resumoDemandas.tempoTotalMin || 0) / 60)}h</div></CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(COMPLEXIDADE).map(([key, c]) => (
                    <Card key={key} className="bg-card border-border/50">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.cor }} />
                          <div>
                            <div className="text-sm font-medium">{c.label}</div>
                            <div className="text-[11px] text-muted-foreground">Multiplicador: {c.mult}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold">{resumoDemandas.porComplexidade?.[key] ?? 0}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : null}

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Lista de Demandas</CardTitle>
              </CardHeader>
              <CardContent>
                {loadDemandas ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {demandas?.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded border border-border/50">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COMPLEXIDADE[d.complexidade as keyof typeof COMPLEXIDADE]?.cor || "#6B7280" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.titulo}</div>
                          <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap">
                            <span>{d.consultorNome}</span>
                            {d.pacienteNome && <span>• {d.pacienteNome}</span>}
                            <span>• {d.tipo.replace(/_/g, " ")}</span>
                            {d.tempoGastoMin && <span>• {d.tempoGastoMin}min</span>}
                          </div>
                        </div>
                        {d.unidadeCor && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.unidadeCor }} title={d.unidadeNome} />}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${d.status === "concluida" ? "bg-green-500/10 text-green-400" : d.status === "aberta" ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {d.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                    {(!demandas || demandas.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma demanda registrada ainda</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "faturamento" && (
          <div className="space-y-6">
            {loadResumo ? (
              <Skeleton className="h-64 w-full" />
            ) : resumoDemandas ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Custo Estimado Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        R$ {(resumoDemandas.custoEstimado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Base R$50/demanda × multiplicador complexidade</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Demandas Concluídas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-500">{resumoDemandas.concluidas}</div>
                      <p className="text-[11px] text-muted-foreground mt-1">de {resumoDemandas.total} total</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Horas Trabalhadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{Math.round((resumoDemandas.tempoTotalMin || 0) / 60)}h</div>
                      <p className="text-[11px] text-muted-foreground mt-1">{resumoDemandas.tempoTotalMin || 0} minutos</p>
                    </CardContent>
                  </Card>
                </div>

                {resumoDemandas.porConsultor && Object.keys(resumoDemandas.porConsultor).length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-base">Produtividade por Consultor</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(resumoDemandas.porConsultor).map(([nome, data]: [string, any]) => (
                          <div key={nome} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                            <div>
                              <div className="text-sm font-medium">{nome}</div>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">{data.verdes} verdes</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{data.amarelas} amarelas</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{data.vermelhas} vermelhas</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{data.total}</div>
                              <div className="text-[11px] text-muted-foreground">{Math.round(data.tempoMin / 60)}h</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resumoDemandas.porUnidade && Object.keys(resumoDemandas.porUnidade).length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-base">Faturamento por Clínica</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(resumoDemandas.porUnidade).map(([nome, data]: [string, any]) => (
                          <div key={nome} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/50">
                            <div className="flex items-center gap-2">
                              {data.cor && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.cor }} />}
                              <span className="text-sm font-medium">{nome}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold">R$ {data.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                              <div className="text-[11px] text-muted-foreground">{data.total} demandas</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-base">Demandas por Plano de Origem</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-3">
                      {Object.entries(resumoDemandas.porPlano || {}).map(([key, val]) => {
                        const cfg = PLANO_CONFIG[key as keyof typeof PLANO_CONFIG];
                        return (
                          <div key={key} className="text-center p-3 bg-muted/30 rounded border border-border/50">
                            <div className="text-xl font-bold" style={{ color: cfg?.cor || "#6B7280" }}>{val as number}</div>
                            <div className="text-[11px] text-muted-foreground capitalize">{key === "sem_plano" ? "Sem Plano" : cfg?.nome || key}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
}
