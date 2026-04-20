import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { AlertTriangle, Activity, Syringe, MessageSquareWarning, CalendarClock, FileText, DollarSign, Mountain } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function DashboardLocalPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();

  const competencia = new Date().toISOString().slice(0, 7);
  const { data: faturamento } = useQuery<any>({
    queryKey: ["faturamento-live-local", competencia, unidadeSelecionada],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 15000,
    enabled: !isTodasClinicas,
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

  const cards = [
    { titulo: "Pacientes com demanda atrasada", valor: "—", icon: AlertTriangle, cor: "#C0392B" },
    { titulo: "Em atendimento agora", valor: "—", icon: Activity, cor: "#27AE60" },
    { titulo: "Atrasos de aplicação semanal", valor: "—", icon: Syringe, cor: "#E67E22" },
    { titulo: "Reclamações da unidade", valor: "—", icon: MessageSquareWarning, cor: "#8E44AD" },
    { titulo: "Reagendamentos pendentes", valor: "—", icon: CalendarClock, cor: "#2980B9" },
    { titulo: "Log de atividades local", valor: "—", icon: FileText, cor: "#5C7C8A" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corUnidadeSelecionada || "#999" }} />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">⛰️ {nomeUnidadeSelecionada}</h1>
          <p className="text-xs text-muted-foreground">Dashboard Local · visão da clínica selecionada</p>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow" data-testid={`local-card-${i}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: c.cor }}>{c.valor}</div>
                </div>
                <Icon className="w-6 h-6 opacity-60" style={{ color: c.cor }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Em breve · ligando ao banco real</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
