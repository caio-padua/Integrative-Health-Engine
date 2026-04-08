import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  Building2, CheckCircle2, Circle, XCircle, AlertCircle,
  Syringe, MapPin
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  agendada: { label: "Agendada", color: "text-blue-700", icon: Circle, bgColor: "bg-blue-50 border-blue-200" },
  confirmada: { label: "Confirmada", color: "text-emerald-700", icon: CheckCircle2, bgColor: "bg-emerald-50 border-emerald-200" },
  em_andamento: { label: "Em Andamento", color: "text-amber-700", icon: AlertCircle, bgColor: "bg-amber-50 border-amber-200" },
  parcial: { label: "Parcial", color: "text-orange-700", icon: AlertCircle, bgColor: "bg-orange-50 border-orange-200" },
  concluida: { label: "Concluida", color: "text-green-700", icon: CheckCircle2, bgColor: "bg-green-50 border-green-200" },
  cancelada: { label: "Cancelada", color: "text-red-700", icon: XCircle, bgColor: "bg-red-50 border-red-200" },
  nao_compareceu: { label: "Nao Compareceu", color: "text-gray-700", icon: XCircle, bgColor: "bg-gray-50 border-gray-200" },
};

function getWeekRange(date: Date): { from: string; to: string; days: Date[] } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }

  const from = days[0].toISOString().split("T")[0];
  const to = days[6].toISOString().split("T")[0];
  return { from, to, days };
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface AplicacaoSessao {
  aplicacao: {
    id: number;
    sessaoId: number;
    substanciaId: number;
    dose: string | null;
    status: string;
    disponibilidade: string;
    numeroSessao: number;
    totalSessoes: number;
    notas: string | null;
    aplicadoEm: string | null;
  };
  substanciaNome: string | null;
  substanciaCor: string | null;
  substanciaVia: string | null;
  substanciaDuracao: number | null;
}

interface SessaoAgenda {
  sessao: {
    id: number;
    pacienteId: number;
    unidadeId: number | null;
    profissionalId: number | null;
    dataAgendada: string;
    horaAgendada: string | null;
    horaFim: string | null;
    status: string;
    tipoServico: string;
    tipoProcedimento: string | null;
    duracaoTotalMin: number | null;
    notas: string | null;
    numeroSemana: number;
  };
  pacienteNome: string | null;
  pacienteCpf: string | null;
  unidadeNome: string | null;
  unidadeCor: string | null;
  unidadeEndereco: string | null;
  unidadeBairro: string | null;
  unidadeCidade: string | null;
  unidadeEstado: string | null;
  unidadeCep: string | null;
  profissionalNome: string | null;
  aplicacoes: AplicacaoSessao[];
  tipoProcedimentoCalc: string | null;
  duracaoTotalCalc: number | null;
  horaFimCalc: string | null;
}

interface AgendaResponse {
  dataFrom: string;
  dataTo: string;
  dias: Record<string, SessaoAgenda[]>;
}

const VIA_LABELS: Record<string, string> = {
  iv: "EV", ev: "EV", im: "IM", implant: "IMPL", oral: "ORAL", topico: "TOP",
};

function SessaoCard({ sessao }: { sessao: SessaoAgenda }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[sessao.sessao.status] || STATUS_CONFIG.agendada;
  const StatusIcon = config.icon;

  const totalSubstancias = sessao.aplicacoes?.length || 0;
  const aplicadas = sessao.aplicacoes?.filter(a => a.aplicacao.status === "aplicada").length || 0;

  const tipoProcedimento = sessao.tipoProcedimentoCalc || sessao.sessao.tipoProcedimento || null;
  const duracaoMin = sessao.duracaoTotalCalc ?? sessao.sessao.duracaoTotalMin ?? null;
  const horaFim = sessao.horaFimCalc || sessao.sessao.horaFim || null;

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${config.bgColor}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {sessao.sessao.horaAgendada && (
              <span className="text-xs font-mono font-bold text-foreground">
                {sessao.sessao.horaAgendada.substring(0, 5)}
                {horaFim && (
                  <span className="text-muted-foreground font-normal"> - {horaFim}</span>
                )}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5">{sessao.pacienteNome || "Paciente"}</div>

          {tipoProcedimento && (
            <div className="mt-1 text-[9px] font-bold tracking-wider text-primary uppercase">
              {tipoProcedimento}
            </div>
          )}

          {duracaoMin !== null && duracaoMin > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono font-semibold">{duracaoMin} min</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {totalSubstancias > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Syringe className="h-3 w-3" />
                {aplicadas}/{totalSubstancias}
              </span>
            )}
          </div>
        </div>
        {sessao.unidadeCor && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: sessao.unidadeCor }}
            title={sessao.unidadeNome || ""}
          />
        )}
      </div>

      {expanded && sessao.aplicacoes && sessao.aplicacoes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
          {tipoProcedimento && (
            <div className="bg-primary/10 rounded-md px-2 py-1.5 mb-2">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {tipoProcedimento}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {sessao.sessao.horaAgendada?.substring(0, 5)} → {horaFim || "?"} ({duracaoMin} min)
              </div>
            </div>
          )}
          {sessao.aplicacoes.map((ap) => {
            const apStatus = ap.aplicacao.status;
            const viaLabel = VIA_LABELS[ap.substanciaVia || ""] || ap.substanciaVia?.toUpperCase() || "";
            return (
              <div key={ap.aplicacao.id} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ap.substanciaCor || "#888" }}
                />
                <span className="flex-1 truncate">{ap.substanciaNome || "Substancia"}</span>
                {viaLabel && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                    {viaLabel}
                  </Badge>
                )}
                {ap.aplicacao.dose && (
                  <span className="text-muted-foreground">{ap.aplicacao.dose}</span>
                )}
                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                  apStatus === "aplicada" ? "text-green-700 bg-green-50" :
                  apStatus === "nao_aplicada" ? "text-red-700 bg-red-50" :
                  "text-gray-500"
                }`}>
                  {apStatus === "aplicada" ? "OK" : apStatus === "nao_aplicada" ? "N/A" : "Pendente"}
                </Badge>
              </div>
            );
          })}
          <div className="flex items-center gap-3 mt-2 pt-1 text-[10px] text-muted-foreground">
            {sessao.profissionalNome && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {sessao.profissionalNome}
              </span>
            )}
            {sessao.unidadeNome && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {sessao.unidadeNome}
              </span>
            )}
            {sessao.sessao.numeroSemana && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Semana {sessao.sessao.numeroSemana}
              </span>
            )}
          </div>

          {sessao.unidadeEndereco && (
            <div className="mt-2 pt-2 border-t border-border/40 text-[10px] leading-relaxed uppercase">
              <div className="flex items-center gap-1 text-muted-foreground font-semibold mb-0.5">
                <MapPin className="h-3 w-3" />
                <span>ENDERECO</span>
              </div>
              <div className="text-foreground/80 pl-4">
                <div>{sessao.unidadeEndereco.toUpperCase()}</div>
                {sessao.unidadeBairro && <div>{sessao.unidadeBairro.toUpperCase()}</div>}
                {sessao.unidadeCep && <div>{sessao.unidadeCep}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgendaSemanal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const week = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const { data, isLoading } = useQuery<AgendaResponse>({
    queryKey: ["agenda-semanal", week.from, week.to],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/agenda/semanal?dataFrom=${week.from}&dataTo=${week.to}`);
      if (!res.ok) throw new Error("Erro ao carregar agenda");
      return res.json();
    },
  });

  const goWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const totalSessoes = data ? Object.values(data.dias).reduce((sum, arr) => sum + arr.length, 0) : 0;

  const today = new Date().toISOString().split("T")[0];

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda Semanal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {week.from} a {week.to} - {totalSessoes} sessoes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              <Calendar className="h-4 w-4 mr-1" />
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => goWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {week.days.map((day, idx) => {
              const dateStr = day.toISOString().split("T")[0];
              const sessoesDia = data?.dias[dateStr] || [];
              const isToday = dateStr === today;
              const isWeekend = idx >= 5;

              return (
                <div key={dateStr} className="min-h-[200px]">
                  <div className={`text-center py-2 rounded-t-lg border-b-2 ${
                    isToday ? "bg-primary text-primary-foreground border-primary" :
                    isWeekend ? "bg-muted/60 text-muted-foreground border-muted" :
                    "bg-muted/30 border-border"
                  }`}>
                    <div className="text-xs font-medium uppercase tracking-wide">
                      {DIAS_SEMANA_CURTO[day.getDay()]}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? "" : "text-foreground"}`}>
                      {formatDate(day)}
                    </div>
                    {sessoesDia.length > 0 && (
                      <div className="text-[10px] mt-0.5 opacity-70">
                        {sessoesDia.length} sessao{sessoesDia.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    {sessoesDia.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/40">
                        <Calendar className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-[10px]">Sem sessoes</span>
                      </div>
                    ) : (
                      sessoesDia.map((s) => (
                        <SessaoCard key={s.sessao.id} sessao={s} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
          <span className="font-medium">Legenda:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={key} className={`flex items-center gap-1 ${cfg.color}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
