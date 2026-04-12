import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, Target, TrendingUp, Award, Users,
  Zap, CheckCircle, Clock, ChevronRight, Trophy
} from "lucide-react";

const API = "/api";

const FAIXAS = [
  { pct: 25, label: "Bronze", cor: "#B87333", corBg: "rgba(184,115,51,0.12)" },
  { pct: 50, label: "Prata", cor: "#C0C0C0", corBg: "rgba(192,192,192,0.12)" },
  { pct: 75, label: "Ouro", cor: "#FFD700", corBg: "rgba(255,215,0,0.12)" },
  { pct: 100, label: "Diamante", cor: "#B9F2FF", corBg: "rgba(185,242,255,0.12)" },
];

function ProgressBar({ pct, faixaAtingida }: { pct: number; faixaAtingida: string }) {
  const faixaCor = FAIXAS.find(f => f.label.toLowerCase() === faixaAtingida)?.cor || "#6B7280";
  return (
    <div className="relative w-full">
      <div className="flex justify-between mb-1">
        {FAIXAS.map(f => (
          <div key={f.pct} className="flex flex-col items-center" style={{ width: "24%" }}>
            <span className="text-[9px] font-semibold" style={{ color: pct >= f.pct ? f.cor : "#6B7280" }}>
              {f.label}
            </span>
            <span className="text-[9px] text-muted-foreground">{f.pct}%</span>
          </div>
        ))}
      </div>
      <div className="h-3 bg-muted/50 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: faixaCor }}
        />
        {FAIXAS.map(f => (
          <div
            key={f.pct}
            className="absolute top-0 bottom-0 w-0.5 bg-background/50"
            style={{ left: `${f.pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ConsultorView({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["comissao-consultor", userId],
    queryFn: () => fetch(`${API}/comissao/consultor/${userId}`).then(r => r.json()),
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  if (!data) return <p className="text-muted-foreground">Dados indisponiveis</p>;

  const faixaCfg = FAIXAS.find(f => f.label.toLowerCase() === data.faixaAtingida);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 relative overflow-hidden">
        {faixaCfg && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: faixaCfg.cor }} />}
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Remuneracao Estimada</p>
              <p className="text-4xl font-bold text-primary">
                R$ {data.totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fixo R$ {data.salarioFixo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + Comissao R$ {data.comissaoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + Bonus R$ {data.bonusValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              {faixaCfg && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6" style={{ color: faixaCfg.cor }} />
                  <span className="text-lg font-bold" style={{ color: faixaCfg.cor }}>Faixa {faixaCfg.label}</span>
                </div>
              )}
              {!faixaCfg && <span className="text-sm text-muted-foreground">Sem faixa atingida</span>}
              <p className="text-xs text-muted-foreground mt-1">Bonus: +{data.bonusPct}% sobre comissoes</p>
            </div>
          </div>

          <ProgressBar pct={data.pctMeta} faixaAtingida={data.faixaAtingida} />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {data.totalConcluidas} de {data.metaMensal} demandas concluidas ({data.pctMeta}%)
            </span>
            {data.proximaFaixa && (
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: FAIXAS.find(f => f.label === data.proximaFaixa.label)?.cor || "#6B7280" }}>
                <ChevronRight className="w-3 h-3" />
                Faltam {data.proximaFaixa.faltam} para {data.proximaFaixa.label} (+{Math.round(data.proximaFaixa.bonus * 100)}%)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Salario Fixo</span>
            </div>
            <p className="text-xl font-bold">R$ {data.salarioFixo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Comissao Base</span>
            </div>
            <p className="text-xl font-bold text-green-400">R$ {data.comissaoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Bonus Meta</span>
            </div>
            <p className="text-xl font-bold text-amber-400">R$ {data.bonusValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-muted-foreground">+{data.bonusPct}% sobre comissoes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Tempo Trabalhado</span>
            </div>
            <p className="text-xl font-bold">{Math.round((data.tempoTotalMin || 0) / 60)}h {(data.tempoTotalMin || 0) % 60}min</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Comissao por Complexidade</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {(["verde", "amarela", "vermelha"] as const).map(c => {
              const det = data.detalheComplexidade?.[c];
              const cores = { verde: { bg: "bg-green-500/10", text: "text-green-400", dot: "#22C55E", label: "Simples", comissao: "R$ 15" }, amarela: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "#EAB308", label: "Moderada", comissao: "R$ 25" }, vermelha: { bg: "bg-red-500/10", text: "text-red-400", dot: "#EF4444", label: "Complexa", comissao: "R$ 50" } };
              const cc = cores[c];
              return (
                <div key={c} className={`p-4 rounded border border-border/50 ${cc.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cc.dot }} />
                    <span className={`text-sm font-medium ${cc.text}`}>{cc.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{det?.qtd ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">{cc.comissao}/demanda</p>
                    </div>
                    <p className={`text-lg font-bold ${cc.text}`}>
                      R$ {(det?.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-muted/20">
        <CardHeader><CardTitle className="text-base">Tabela de Metas & Bonus</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            {FAIXAS.map(f => {
              const atingida = data.pctMeta >= f.pct;
              const demandasNecessarias = Math.ceil((f.pct / 100) * data.metaMensal);
              return (
                <div
                  key={f.pct}
                  className={`p-3 rounded border transition-all ${atingida ? "border-2" : "border-border/30 opacity-60"}`}
                  style={{ borderColor: atingida ? f.cor : undefined, backgroundColor: atingida ? f.corBg : undefined }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {atingida && <CheckCircle className="w-4 h-4" style={{ color: f.cor }} />}
                    <span className="text-sm font-semibold" style={{ color: atingida ? f.cor : "#6B7280" }}>{f.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{demandasNecessarias} demandas ({f.pct}%)</p>
                  <p className="text-xs font-medium mt-1" style={{ color: f.cor }}>+{Math.round(FAIXAS.find(fx => fx.label === f.label)!.pct === 25 ? 5 : f.pct === 50 ? 10 : f.pct === 75 ? 20 : 35)}% bonus</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GestorView() {
  const { data, isLoading } = useQuery({
    queryKey: ["comissao-gestor"],
    queryFn: () => fetch(`${API}/comissao/painel-gestor`).then(r => r.json()),
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  if (!data) return <p className="text-muted-foreground">Dados indisponiveis</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Consultores Ativos</span>
            </div>
            <p className="text-2xl font-bold">{data.resumo?.totalConsultores || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Demandas Concluidas</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{data.resumo?.totalDemandas || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Comissao Total</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">R$ {(data.resumo?.comissaoTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Custo Total Bruto</span>
            </div>
            <p className="text-2xl font-bold">R$ {(data.resumo?.custoTotalBruto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" />Ranking de Consultores</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.consultores?.map((c: any, idx: number) => {
              const faixaCfg = FAIXAS.find(f => f.label.toLowerCase() === c.faixaAtingida);
              return (
                <div key={c.consultor.id} className="p-4 bg-muted/30 rounded border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{c.consultor.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {faixaCfg && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: faixaCfg.corBg, color: faixaCfg.cor }}>
                              {faixaCfg.label}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {c.totalConcluidas}/{c.metaMensal} demandas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        R$ {c.totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Fixo + R$ {c.comissaoBase.toLocaleString("pt-BR")} comissao + R$ {c.bonusValor.toLocaleString("pt-BR")} bonus
                      </p>
                    </div>
                  </div>

                  <ProgressBar pct={c.pctMeta} faixaAtingida={c.faixaAtingida} />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">{c.verdes} verdes</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{c.amarelas} amarelas</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{c.vermelhas} vermelhas</span>
                    </div>
                    <div className="flex gap-2">
                      {c.clinicasAtendidas?.map((cl: any) => (
                        <div key={cl.id} className="flex items-center gap-1">
                          {cl.cor && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cl.cor }} />}
                          <span className="text-[10px] text-muted-foreground">{cl.nome?.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!data.consultores || data.consultores.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum consultor de campo cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-muted/20">
        <CardHeader><CardTitle className="text-base">Configuracao de Remuneracao</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comissao por Demanda</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between p-2 bg-green-500/5 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Simples (verde)</span>
                  </div>
                  <span className="text-sm font-bold text-green-400">R$ {data.config?.comissaoPorComplexidade?.verde || 15}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-500/5 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Moderada (amarela)</span>
                  </div>
                  <span className="text-sm font-bold text-yellow-400">R$ {data.config?.comissaoPorComplexidade?.amarela || 25}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-500/5 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Complexa (vermelha)</span>
                  </div>
                  <span className="text-sm font-bold text-red-400">R$ {data.config?.comissaoPorComplexidade?.vermelha || 50}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faixas de Bonus</h4>
              <div className="space-y-1">
                {FAIXAS.map(f => (
                  <div key={f.pct} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: `${f.cor}08` }}>
                    <span className="text-sm" style={{ color: f.cor }}>{f.label} ({f.pct}%)</span>
                    <span className="text-sm font-bold" style={{ color: f.cor }}>+{f.pct === 25 ? 5 : f.pct === 50 ? 10 : f.pct === 75 ? 20 : 35}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-primary/5 rounded border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong>Salario fixo:</strong> R$ {data.config?.salarioFixo?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "1.412,00"} | <strong>Meta mensal:</strong> {data.config?.metaMensal || 40} demandas | <strong>Modelo:</strong> Fixo + Comissao por resolubilidade + Bonus por meta atingida
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComissaoPage() {
  const { user } = useAuth();
  const escopo = (user as any)?.escopo || "consultoria_master";
  const isGestor = escopo === "consultoria_master";
  const [view, setView] = useState<"minha" | "equipe">(isGestor ? "equipe" : "minha");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comissao & Metas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isGestor ? "Gestao de remuneracao e metas dos consultores" : "Sua remuneracao, comissoes e progresso nas metas"}
            </p>
          </div>
        </div>

        {isGestor && (
          <div className="flex gap-1 bg-muted/30 p-1 rounded">
            <button
              onClick={() => setView("equipe")}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${view === "equipe" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="w-4 h-4" />
              Painel da Equipe
            </button>
            <button
              onClick={() => setView("minha")}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${view === "minha" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <DollarSign className="w-4 h-4" />
              Minha Comissao
            </button>
          </div>
        )}

        {view === "equipe" && isGestor ? (
          <GestorView />
        ) : (
          <ConsultorView userId={(user as any)?.id || 0} />
        )}
      </div>
    </Layout>
  );
}
