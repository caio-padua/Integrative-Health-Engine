import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import {
  AlertTriangle, Activity, Syringe, MessageSquareWarning,
  CalendarClock, FileText, DollarSign, Mountain, ShieldAlert,
} from "lucide-react";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const TOKEN_KEY = "pawards.auth.token";
function authedFetch(url: string) {
  const jwt = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const headers: Record<string, string> = {};
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  return fetch(url, { credentials: "include", headers }).then((r) => r.json());
}

export default function DashboardLocalPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();
  const competencia = new Date().toISOString().slice(0, 7);

  const { data: faturamento } = useQuery<any>({
    queryKey: ["faturamento-live-local", competencia, unidadeSelecionada],
    queryFn: () => authedFetch(`/api/ledger/faturamento-live?competencia=${competencia}`),
    refetchInterval: 15000,
    enabled: !isTodasClinicas,
  });

  const { data: local, isLoading: loadingLocal, error: errorLocal } = useQuery<any>({
    queryKey: ["dashboard-local", unidadeSelecionada],
    queryFn: () => authedFetch(`/api/dashboard/local?unidadeId=${unidadeSelecionada}`),
    refetchInterval: 30000,
    enabled: !isTodasClinicas && !!unidadeSelecionada,
  });

  if (isTodasClinicas) {
    return (
      <Card className="p-6 text-center">
        <Mountain className="w-12 h-12 mx-auto text-[#1F4E5F]/40 mb-3" />
        <h2 className="text-lg font-bold text-[#1F4E5F]">Selecione uma clínica no canto superior esquerdo</h2>
        <p className="text-sm text-muted-foreground mt-1">O Dashboard Local mostra o que está acontecendo dentro da unidade escolhida.</p>
      </Card>
    );
  }

  const meuFat = faturamento?.totaisPorUnidade?.find((t: any) => t.unidade_id === unidadeSelecionada);
  const totalLocal = Number(meuFat?.total_eventos ?? 0) + Number(meuFat?.total_modulos ?? 0);

  const cardsRef = local?.cards ?? {};
  const cards = [
    { titulo: "Pacientes com demanda atrasada", valor: cardsRef.demandasAtrasadas, icon: AlertTriangle, cor: "#C0392B" },
    { titulo: "Em atendimento agora", valor: cardsRef.emAtendimentoAgora, icon: Activity, cor: "#27AE60" },
    { titulo: "Atrasos de aplicação semanal", valor: cardsRef.atrasosAplicacaoSemana, icon: Syringe, cor: "#E67E22" },
    { titulo: "Reclamações últimos 30d", valor: cardsRef.reclamacoes30d, icon: MessageSquareWarning, cor: "#8E44AD" },
    { titulo: "Reagendamentos pendentes", valor: cardsRef.reagendamentosPendentes, icon: CalendarClock, cor: "#2980B9" },
    { titulo: "Atividade local 24h", valor: cardsRef.atividadeLocal24h, icon: FileText, cor: "#5C7C8A" },
  ];

  const alertasCriticos = Number(local?.alertasCriticos ?? 0);
  const ultimaAtualizacao = local?.atualizadoEm ? new Date(local.atualizadoEm) : null;

  return (
    <div className="space-y-4">
      <BotaoImprimirFlutuante titulo={`Dashboard Local · ${nomeUnidadeSelecionada ?? ""}`} />
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corUnidadeSelecionada || "#999" }} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">⛰️ {nomeUnidadeSelecionada}</h1>
          <p className="text-xs text-muted-foreground">
            Dashboard Local · visão da clínica selecionada
            {ultimaAtualizacao && ` · atualizado às ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`}
          </p>
        </div>
        {alertasCriticos > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/40 rounded-md" data-testid="badge-alertas-criticos">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-500">{alertasCriticos} alerta{alertasCriticos !== 1 ? "s" : ""} crítico{alertasCriticos !== 1 ? "s" : ""}</span>
          </div>
        )}
      </header>

      <Card className="p-4 bg-gradient-to-r from-[#B8941F]/10 to-transparent">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-[#B8941F]" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Consumo PADCON · {competencia}</div>
            <div className="text-3xl font-mono font-bold text-[#1F4E5F]">{fmt(totalLocal)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Módulos: {fmt(meuFat?.total_modulos)} · Eventos: {fmt(meuFat?.total_eventos)}
            </div>
          </div>
        </div>
      </Card>

      {errorLocal && (
        <Card className="p-4 border-red-500/40 bg-red-500/5 text-sm text-red-400">
          ⚠️ Falha ao sincronizar dados locais — tentando novamente em 30s.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const valorRender = loadingLocal ? "—" : Number(c.valor ?? 0).toLocaleString("pt-BR");
          return (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow" data-testid={`local-card-${i}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: c.cor }}>{valorRender}</div>
                </div>
                <Icon className="w-6 h-6 opacity-60" style={{ color: c.cor }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {loadingLocal ? "Carregando..." : "Dados ao vivo · refresh a cada 30s"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
