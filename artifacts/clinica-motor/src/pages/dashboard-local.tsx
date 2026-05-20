import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import {
  AlertTriangle, Activity, Syringe, MessageSquareWarning,
  CalendarClock, FileText, DollarSign, Mountain, ShieldAlert,
  Bell, Gauge, TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import { apiFetch } from "@/lib/api-fetch";
import {
  RelogioPercentual,
  BarraSinaptica,
  BlocoExpansivel,
} from "@/components/sinaptico";

interface MetricasJanela {
  desde: string;
  ENVIADO: number;
  FALHOU: number;
  PENDENTE: number;
  total: number;
}
interface LembreteMetricas {
  unidadeId: number | null;
  geradoEm: string;
  janelas: { ultimas24h: MetricasJanela; ultimos7d: MetricasJanela };
}

const JANELA_VAZIA: MetricasJanela = {
  desde: "",
  ENVIADO: 0,
  FALHOU: 0,
  PENDENTE: 0,
  total: 0,
};

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function authedFetch(url: string) {
  return apiFetch(url).then((r) => r.json());
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

  const { data: lembreteMetricas, isLoading: loadingLembretes } = useQuery<LembreteMetricas>({
    queryKey: ["lembrete-metricas", unidadeSelecionada],
    queryFn: () => authedFetch(`/api/prescricoes-lembrete/metricas?unidadeId=${unidadeSelecionada}`),
    refetchInterval: 60000,
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

  // Wave Sináptica — guards defensivos pra evitar crash quando API responde shape vazio/erro
  const janela24h: MetricasJanela = lembreteMetricas?.janelas?.ultimas24h ?? JANELA_VAZIA;
  const janela7d: MetricasJanela = lembreteMetricas?.janelas?.ultimos7d ?? JANELA_VAZIA;

  const taxaEntrega24h = janela24h.total > 0
    ? Math.round((janela24h.ENVIADO / janela24h.total) * 100)
    : 0;
  const taxaEntrega7d = janela7d.total > 0
    ? Math.round((janela7d.ENVIADO / janela7d.total) * 100)
    : 0;

  // Saúde geral do motor — composição: peso 50% entrega 24h + 30% entrega 7d + 20% (100 - %alertas)
  const totalCards = cards.reduce((acc, c) => acc + Number(c.valor ?? 0), 0);
  const pctSemAlerta = totalCards > 0
    ? Math.max(0, 100 - Math.round((alertasCriticos / totalCards) * 100))
    : 100;
  const saudeMotor = Math.round(taxaEntrega24h * 0.5 + taxaEntrega7d * 0.3 + pctSemAlerta * 0.2);
  const corSaude = saudeMotor >= 80 ? "#27AE60" : saudeMotor >= 50 ? "#E67E22" : "#C0392B";

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

      {/* SINAPSE 1 — Relógios sinápticos: visão tátil em 3 segundos */}
      <Card
        className="p-5"
        style={{
          borderLeft: `3px solid ${corSaude}`,
          background: `linear-gradient(135deg, ${corSaude}08 0%, transparent 60%)`,
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <RelogioPercentual
            valor={saudeMotor}
            label="Saúde do Motor"
            sublabel="composto"
            cor={corSaude}
            tamanho={110}
          />
          <RelogioPercentual
            valor={taxaEntrega24h}
            label="Entrega WhatsApp 24h"
            sublabel={`${janela24h.ENVIADO}/${janela24h.total || "—"}`}
            cor="#5EE6E6"
          />
          <RelogioPercentual
            valor={taxaEntrega7d}
            label="Entrega 7 dias"
            sublabel={`${janela7d.ENVIADO}/${janela7d.total || "—"}`}
            cor="#2980B9"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-[#B8941F]" />
              <div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">PADCON · {competencia}</div>
                <div className="text-xl font-mono font-bold text-[#B8941F]">{fmt(totalLocal)}</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-center">
              {fmt(meuFat?.total_modulos)} mód · {fmt(meuFat?.total_eventos)} ev
            </div>
          </div>
        </div>
      </Card>

      {errorLocal && (
        <Card className="p-4 border-red-500/40 bg-red-500/5 text-sm text-red-400">
          ⚠️ Falha ao sincronizar dados locais — tentando novamente em 30s.
        </Card>
      )}

      {/* SINAPSE 2 — Bloco expansível: lembretes (corrigido o crash do undefined) */}
      <BlocoExpansivel
        titulo="Lembretes de Prescrição"
        subtitulo="Saúde do motor de WhatsApp · janelas 24h e 7 dias"
        icone={<Bell className="w-4 h-4" />}
        cor="#5EE6E6"
        badge={loadingLembretes ? "..." : `${janela24h.total + janela7d.total} envios`}
        conteudoExpandido={
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <RelogioPercentual valor={taxaEntrega24h} label="Taxa entrega 24h" cor="#5EE6E6" tamanho={140} />
              <RelogioPercentual valor={taxaEntrega7d} label="Taxa entrega 7d" cor="#2980B9" tamanho={140} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { titulo: "Últimas 24 horas", j: janela24h, cor: "#5EE6E6" },
                { titulo: "Últimos 7 dias", j: janela7d, cor: "#2980B9" },
              ].map(({ titulo, j, cor }) => (
                <div key={titulo} className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold" style={{ color: cor }}>{titulo}</h4>
                  <BarraSinaptica label="Entregues" valor={j.ENVIADO} total={Math.max(1, j.total)} cor="#27AE60" destaque={String(j.total)} />
                  <BarraSinaptica label="Pendentes" valor={j.PENDENTE} total={Math.max(1, j.total)} cor="#E67E22" destaque={String(j.total)} />
                  <BarraSinaptica label="Falharam" valor={j.FALHOU} total={Math.max(1, j.total)} cor="#C0392B" destaque={String(j.total)} />
                </div>
              ))}
            </div>
            <Link href="/prescricoes-lembrete" className="block text-center text-xs text-[#5EE6E6] hover:underline pt-2 border-t border-white/[0.05]">
              Abrir painel completo de lembretes →
            </Link>
          </div>
        }
      >
        {loadingLembretes ? (
          <div className="text-xs text-muted-foreground py-2">Carregando métricas...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[
              { titulo: "Últimas 24h", j: janela24h, cor: "#5EE6E6" },
              { titulo: "Últimos 7 dias", j: janela7d, cor: "#2980B9" },
            ].map(({ titulo, j, cor }) => (
              <div key={titulo} className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{titulo}</div>
                <BarraSinaptica label="Entregues" valor={j.ENVIADO} total={Math.max(1, j.total)} cor="#27AE60" destaque={String(j.total)} />
                <BarraSinaptica label="Pendentes" valor={j.PENDENTE} total={Math.max(1, j.total)} cor="#E67E22" destaque={String(j.total)} />
                <BarraSinaptica label="Falharam" valor={j.FALHOU} total={Math.max(1, j.total)} cor="#C0392B" destaque={String(j.total)} />
              </div>
            ))}
          </div>
        )}
      </BlocoExpansivel>

      {/* SINAPSE 3 — Bloco expansível: filas operacionais */}
      <BlocoExpansivel
        titulo="Filas Operacionais"
        subtitulo="Demandas vivas dentro da clínica"
        icone={<Gauge className="w-4 h-4" />}
        cor="#2980B9"
        badge={`${totalCards} ativos`}
        conteudoExpandido={
          <div className="space-y-3">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-l-2" style={{ borderColor: c.cor }}>
                <c.icon className="w-5 h-5" style={{ color: c.cor }} />
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                  <BarraSinaptica
                    label="participação na carga total"
                    valor={Number(c.valor ?? 0)}
                    total={Math.max(1, totalCards)}
                    cor={c.cor}
                    sufixo="itens"
                  />
                </div>
                <div className="text-2xl font-mono font-bold" style={{ color: c.cor }}>
                  {Number(c.valor ?? 0).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {cards.map((c, i) => {
            const Icon = c.icon;
            const valorRender = loadingLocal ? "—" : Number(c.valor ?? 0).toLocaleString("pt-BR");
            return (
              <Card
                key={i}
                className="p-3 hover:shadow-md transition-all hover:scale-[1.02] cursor-default"
                style={{ borderLeft: `2px solid ${c.cor}` }}
                data-testid={`local-card-${i}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                    <div className="text-2xl font-mono font-bold mt-1" style={{ color: c.cor }}>{valorRender}</div>
                  </div>
                  <Icon className="w-5 h-5 opacity-60" style={{ color: c.cor }} />
                </div>
              </Card>
            );
          })}
        </div>
      </BlocoExpansivel>
    </div>
  );
}
