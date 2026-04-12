import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Package, Zap, Shield, BarChart3, Users,
  CheckCircle, AlertTriangle, Clock, ArrowUpRight, FileText,
  MessageCircle, Headphones, PhoneCall, ShieldCheck, GraduationCap,
  Calendar, Layers
} from "lucide-react";

const API = "/api";

const ICON_MAP: Record<string, any> = {
  MessageCircle, Headphones, PhoneCall, ShieldCheck, GraduationCap,
  Package, BarChart3, Calendar, Shield, Zap,
};

const MODELO_CONFIG: Record<string, { label: string; icon: any; cor: string }> = {
  full: { label: "Full", icon: Shield, cor: "#8B5CF6" },
  pacote: { label: "Pacote", icon: Package, cor: "#F59E0B" },
  por_demanda: { label: "Por Demanda", icon: Zap, cor: "#22C55E" },
};

function ModulosTab() {
  const { data: modulos, isLoading } = useQuery({
    queryKey: ["comercial-modulos"],
    queryFn: async () => { const r = await fetch(`${API}/comercial/modulos`); return r.json(); },
  });

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}</div>;

  const categorias = ["core", "comunicacao", "operacional", "avancado", "premium"];
  const catLabels: Record<string, string> = { core: "Core", comunicacao: "Comunicacao", operacional: "Operacional", avancado: "Avancado", premium: "Premium" };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Catalogo de modulos disponiveis para venda. Cada clinica contrata os modulos que precisa.</p>
      {categorias.map(cat => {
        const items = (modulos || []).filter((m: any) => m.categoria === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{catLabels[cat]}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((m: any) => {
                const Icon = ICON_MAP[m.icone] || Layers;
                return (
                  <Card key={m.id} className="bg-card border-border/50 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.cor || "#6B7280" }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" style={{ color: m.cor }} />
                          <CardTitle className="text-sm font-semibold">{m.nome}</CardTitle>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">{catLabels[m.categoria]}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">{m.descricao}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Mensal</span>
                          <span className="text-lg font-bold" style={{ color: m.cor }}>R$ {parseFloat(m.precoMensal).toFixed(0)}</span>
                        </div>
                        {m.precoPorDemanda && (
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block">Por demanda</span>
                            <span className="text-sm font-semibold text-muted-foreground">R$ {parseFloat(m.precoPorDemanda).toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                      {m.funcionalidades && (
                        <div className="flex flex-wrap gap-1">
                          {(m.funcionalidades as string[]).map((f: string) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 bg-muted/30 rounded text-muted-foreground">{f}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContratosTab() {
  const { unidadeSelecionada } = useClinic();
  const { data: contratos, isLoading } = useQuery({
    queryKey: ["comercial-contratos", unidadeSelecionada],
    queryFn: async () => {
      const params = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";
      const r = await fetch(`${API}/comercial/contratos${params}`);
      return r.json();
    },
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Contratos ativos com clinicas do ecossistema. Cada contrato define o modelo de cobranca e modulos contratados.</p>
      {(contratos || []).map((c: any) => {
        const modeloCfg = MODELO_CONFIG[c.modeloCobranca] || MODELO_CONFIG.por_demanda;
        const ModeloIcon = modeloCfg.icon;
        return (
          <Card key={c.id} className="bg-card border-border/50 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: c.unidadeCor || "#6B7280" }} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.unidadeCor }} />
                  <CardTitle className="text-base font-semibold">{c.unidadeNome}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded font-semibold ${c.status === "ativo" ? "bg-green-500/10 text-green-400" : c.status === "trial" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted/30 rounded border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <ModeloIcon className="w-4 h-4" style={{ color: modeloCfg.cor }} />
                    <span className="text-[10px] text-muted-foreground uppercase">Modelo</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: modeloCfg.cor }}>{modeloCfg.label}</span>
                </div>
                <div className="p-3 bg-muted/30 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Modulos</span>
                  <span className="text-xl font-bold">{c.totalModulos}</span>
                </div>
                <div className="p-3 bg-muted/30 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                    {c.modeloCobranca === "full" ? "Mensalidade" : c.modeloCobranca === "pacote" ? "Creditos" : "Onboarding"}
                  </span>
                  <span className="text-sm font-bold">
                    {c.modeloCobranca === "full" ? `R$ ${parseFloat(c.valorMensalFixo || 0).toFixed(0)}` :
                     c.modeloCobranca === "pacote" ? `${c.creditosUsados}/${c.creditosDemandas}` :
                     `R$ ${parseFloat(c.valorOnboarding || 0).toFixed(0)}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.modulos.map((m: any) => {
                  const Icon = ICON_MAP[m.icone] || Layers;
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded border border-border/50">
                      <Icon className="w-3 h-3" style={{ color: m.cor }} />
                      <span className="text-[11px] font-medium">{m.nome}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FaturamentoTab() {
  const { unidadeSelecionada } = useClinic();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["comercial-dashboard", mes, ano, unidadeSelecionada],
    queryFn: async () => {
      let params = `?mes=${mes}&ano=${ano}`;
      if (unidadeSelecionada) params += `&unidadeId=${unidadeSelecionada}`;
      const r = await fetch(`${API}/comercial/dashboard-financeiro${params}`);
      return r.json();
    },
  });

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>;

  const resumo = data?.resumo || {};
  const porClinica = data?.porClinica || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
            <DollarSign className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tighter text-green-400">R$ {(resumo.receitaMes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado ano: R$ {(resumo.receitaAcumulada || 0).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Consultores</CardTitle>
            <Users className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tighter text-orange-400">R$ {(resumo.custoMes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Comissoes + bonus pagos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Liquido</CardTitle>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tighter text-emerald-400">R$ {(resumo.lucroMes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado: R$ {(resumo.lucroAcumulado || 0).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem de Lucro</CardTitle>
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tighter text-blue-400">{resumo.margemLucro || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{resumo.contratosAtivos || 0} contratos ativos</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold">Receita por Clinica</h3>
      <div className="space-y-3">
        {porClinica.map((c: any) => {
          const modeloCfg = MODELO_CONFIG[c.modeloCobranca] || MODELO_CONFIG.por_demanda;
          const ModeloIcon = modeloCfg.icon;
          const maxReceita = Math.max(...porClinica.map((x: any) => x.receita), 1);
          const pctBar = Math.round((c.receita / maxReceita) * 100);
          return (
            <Card key={c.unidadeId} className="bg-card border-border/50 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: c.unidadeCor }} />
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.unidadeCor }} />
                    <span className="text-sm font-semibold">{c.unidadeNome}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ backgroundColor: `${modeloCfg.cor}15` }}>
                      <ModeloIcon className="w-3 h-3" style={{ color: modeloCfg.cor }} />
                      <span className="text-[10px] font-medium" style={{ color: modeloCfg.cor }}>{modeloCfg.label}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${c.status === "faturado" ? "bg-blue-500/10 text-blue-400" : c.status === "pago" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Receita</span>
                    <span className="text-lg font-bold text-green-400">R$ {c.receita.toLocaleString("pt-BR")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Custo</span>
                    <span className="text-sm font-semibold text-orange-400">R$ {c.custo.toLocaleString("pt-BR")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Lucro</span>
                    <span className="text-sm font-bold text-emerald-400">R$ {c.lucro.toLocaleString("pt-BR")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Demandas</span>
                    <span className="text-sm font-bold">{c.demandas}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctBar}%`, backgroundColor: c.unidadeCor }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data?.porModelo && (
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Distribuicao por Modelo de Cobranca</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.porModelo).map(([key, count]) => {
                const cfg = MODELO_CONFIG[key];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <div key={key} className="p-4 bg-muted/30 rounded border border-border/50 text-center">
                    <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: cfg.cor }} />
                    <p className="text-2xl font-bold" style={{ color: cfg.cor }}>{count as number}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ComercialPage() {
  const [tab, setTab] = useState<"faturamento" | "modulos" | "contratos">("faturamento");

  const tabs = [
    { key: "faturamento" as const, label: "Faturamento", icon: DollarSign },
    { key: "contratos" as const, label: "Contratos", icon: FileText },
    { key: "modulos" as const, label: "Modulos", icon: Layers },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Comercial</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestao de modulos, contratos e faturamento do ecossistema</p>
        </div>

        <div className="flex gap-1 bg-muted/30 p-1 rounded">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${tab === t.key ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "faturamento" && <FaturamentoTab />}
        {tab === "contratos" && <ContratosTab />}
        {tab === "modulos" && <ModulosTab />}
      </div>
    </Layout>
  );
}
