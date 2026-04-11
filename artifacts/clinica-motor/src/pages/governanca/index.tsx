import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileCheck,
  Bell,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface KpiData {
  valor: number;
  status: "VERDE" | "AMARELO" | "VERMELHO";
  descricao: string;
}

interface PainelData {
  statusGeral: "VERDE" | "AMARELO" | "VERMELHO";
  kpis: {
    filaPendente: KpiData;
    validacoesPendentes: KpiData;
    alertasAbertos: KpiData;
  };
  timestamp: string;
}

interface SemaforoData {
  semaforo: "VERDE" | "AMARELO" | "VERMELHO";
  filasCriticas: number;
  filasAtencao: number;
  descricao: string;
}

interface EventoTimeline {
  id: number;
  tipo: string;
  descricao: string;
  usuarioNome: string | null;
  pacienteId: number | null;
  criadoEm: string;
}

interface FilaStats {
  porStatus: { status: string; total: number }[];
  expirados: number;
}

const corDeFundo: Record<string, string> = {
  VERDE: "bg-emerald-500/15 border-emerald-500/40",
  AMARELO: "bg-amber-500/15 border-amber-500/40",
  VERMELHO: "bg-red-500/15 border-red-500/40",
};

const corDeTexto: Record<string, string> = {
  VERDE: "text-emerald-400",
  AMARELO: "text-amber-400",
  VERMELHO: "text-red-400",
};

const corDeSemaforo: Record<string, string> = {
  VERDE: "bg-emerald-500 shadow-emerald-500/50",
  AMARELO: "bg-amber-500 shadow-amber-500/50",
  VERMELHO: "bg-red-500 shadow-red-500/50",
};

const corDeSemaforoApagado: Record<string, string> = {
  VERDE: "bg-emerald-900/30",
  AMARELO: "bg-amber-900/30",
  VERMELHO: "bg-red-900/30",
};

const baseUrl = import.meta.env.BASE_URL || "/";
const apiBase = `${baseUrl}api`.replace(/\/\//g, "/");

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

function SemaforoGrande({ status }: { status: "VERDE" | "AMARELO" | "VERMELHO" }) {
  const luzes: ("VERMELHO" | "AMARELO" | "VERDE")[] = ["VERMELHO", "AMARELO", "VERDE"];
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-none">
      <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
        Estado da Clinica
      </span>
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-border rounded-none">
        {luzes.map((cor) => (
          <div
            key={cor}
            className={`w-14 h-14 rounded-full transition-all duration-500 ${
              status === cor
                ? `${corDeSemaforo[cor]} shadow-lg animate-pulse`
                : corDeSemaforoApagado[cor]
            }`}
          />
        ))}
      </div>
      <span className={`text-sm font-bold tracking-wide uppercase ${corDeTexto[status]}`}>
        {status === "VERDE" ? "Operacao Normal" : status === "AMARELO" ? "Atencao Necessaria" : "Intervencao Urgente"}
      </span>
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  status,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: number;
  status: "VERDE" | "AMARELO" | "VERMELHO";
  descricao: string;
  icon: typeof Shield;
}) {
  return (
    <Card className={`border ${corDeFundo[status]} rounded-none`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icon className={`w-5 h-5 ${corDeTexto[status]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold tracking-tighter ${corDeTexto[status]}`}>{valor}</div>
        <p className="text-xs text-muted-foreground mt-2">{descricao}</p>
      </CardContent>
    </Card>
  );
}

function TimelineEventos({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum evento clinico registrado ainda
      </div>
    );
  }

  const iconeEvento: Record<string, typeof Activity> = {
    ANAMNESE: FileCheck,
    VALIDACAO: CheckCircle2,
    ALERTA: AlertTriangle,
    SESSAO: Activity,
    FILA: Users,
  };

  return (
    <div className="space-y-1">
      {eventos.map((evento) => {
        const Icon = iconeEvento[evento.tipo] || Activity;
        const data = new Date(evento.criadoEm);
        const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        return (
          <div key={evento.id} className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 transition-colors border-l-2 border-border">
            <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{evento.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {evento.usuarioNome && <span>{evento.usuarioNome} — </span>}
                {dataFormatada} {horaFormatada}
              </p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground font-mono uppercase">
              {evento.tipo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FilaPreceptorStats({ stats }: { stats: FilaStats | null }) {
  if (!stats) return null;

  const statusMap: Record<string, { label: string; cor: string; icon: typeof Clock }> = {
    AGUARDANDO: { label: "Aguardando", cor: "text-amber-400", icon: Clock },
    HOMOLOGADO: { label: "Homologado", cor: "text-emerald-400", icon: CheckCircle2 },
    REJEITADO: { label: "Rejeitado", cor: "text-red-400", icon: XCircle },
  };

  return (
    <div className="space-y-3">
      {stats.porStatus.map((item) => {
        const config = statusMap[item.status] || { label: item.status, cor: "text-muted-foreground", icon: Activity };
        const Icon = config.icon;
        return (
          <div key={item.status} className="flex items-center justify-between px-3 py-2 border-l-2 border-border">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.cor}`} />
              <span className="text-sm text-foreground">{config.label}</span>
            </div>
            <span className={`text-lg font-bold ${config.cor}`}>{Number(item.total)}</span>
          </div>
        );
      })}
      {stats.expirados > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-l-2 border-red-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-semibold">Prazo Expirado</span>
          </div>
          <span className="text-lg font-bold text-red-400">{stats.expirados}</span>
        </div>
      )}
    </div>
  );
}

export default function Governanca() {
  const { user } = useAuth();
  const [painel, setPainel] = useState<PainelData | null>(null);
  const [semaforo, setSemaforo] = useState<SemaforoData | null>(null);
  const [timeline, setTimeline] = useState<EventoTimeline[]>([]);
  const [filaStats, setFilaStats] = useState<FilaStats | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [painelRes, semaforoRes, timelineRes, filaRes] = await Promise.all([
        fetchApi<PainelData>("/governanca/painel"),
        fetchApi<SemaforoData>("/governanca/semaforo"),
        fetchApi<{ eventos: EventoTimeline[] }>("/governanca/timeline?limite=15"),
        fetchApi<FilaStats>("/fila-preceptor/stats"),
      ]);
      setPainel(painelRes);
      setSemaforo(semaforoRes);
      setTimeline(timelineRes.eventos);
      setFilaStats(filaRes);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      console.error("Erro ao carregar governanca:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user) carregarDados();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const intervalo = setInterval(carregarDados, 60000);
    return () => clearInterval(intervalo);
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Governanca Clinica</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Painel de soberania operacional — PADCOM V15.2
            </p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaAtualizacao && (
              <span className="text-xs text-muted-foreground">
                Atualizado: {ultimaAtualizacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={carregando}
              className="rounded-none border-border"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SemaforoGrande status={semaforo?.semaforo || painel?.statusGeral || "VERDE"} />
            {semaforo && (
              <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                {semaforo.descricao}
              </p>
            )}
          </div>

          <div className="lg:col-span-3 grid gap-4 md:grid-cols-3">
            {painel && (
              <>
                <KpiCard
                  titulo="Fila do Preceptor"
                  valor={painel.kpis.filaPendente.valor}
                  status={painel.kpis.filaPendente.status}
                  descricao={painel.kpis.filaPendente.descricao}
                  icon={Users}
                />
                <KpiCard
                  titulo="Validacoes Cascata"
                  valor={painel.kpis.validacoesPendentes.valor}
                  status={painel.kpis.validacoesPendentes.status}
                  descricao={painel.kpis.validacoesPendentes.descricao}
                  icon={FileCheck}
                />
                <KpiCard
                  titulo="Alertas Abertos"
                  valor={painel.kpis.alertasAbertos.valor}
                  status={painel.kpis.alertasAbertos.status}
                  descricao={painel.kpis.alertasAbertos.descricao}
                  icon={Bell}
                />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-none border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Timeline de Eventos Clinicos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-3 max-h-[400px] overflow-y-auto">
              <TimelineEventos eventos={timeline} />
            </CardContent>
          </Card>

          <Card className="rounded-none border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Fila do Preceptor — Estatisticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FilaPreceptorStats stats={filaStats} />
              {filaStats && filaStats.porStatus.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum item na fila do preceptor
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
