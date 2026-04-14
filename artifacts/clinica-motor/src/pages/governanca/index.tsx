import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
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
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  TestTube,
  MessageSquare,
  Check,
  CheckCheck,
  X,
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

interface ExamesSemaforoGeral {
  semaforo: "VERDE" | "AMARELO" | "VERMELHO";
  total: number;
  verdes: number;
  amarelos: number;
  vermelhos: number;
}

interface ExamePaciente {
  id: number;
  nome_exame: string;
  categoria: string | null;
  valor: number;
  unidade: string | null;
  valor_minimo: number;
  valor_maximo: number;
  terco: number | null;
  classificacao_automatica: string | null;
  classificacao_manual: string | null;
  tendencia: string | null;
  delta_percentual: number | null;
  formula_vigente: string | null;
  data_coleta: string | null;
  laboratorio: string | null;
  criado_em: string;
  corFinal: string;
}

interface DashboardExamesPaciente {
  pacienteId: number;
  semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO";
  resumo: { verdes: number; amarelos: number; vermelhos: number; total: number };
  exames: ExamePaciente[];
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

const corDeBarra: Record<string, string> = {
  VERDE: "bg-emerald-500",
  AMARELO: "bg-amber-500",
  VERMELHO: "bg-red-500",
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
  onClick,
}: {
  titulo: string;
  valor: number;
  status: "VERDE" | "AMARELO" | "VERMELHO";
  descricao: string;
  icon: typeof Shield;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border ${corDeFundo[status]} rounded-none ${onClick ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <div className="flex items-center gap-1">
          {onClick && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          <Icon className={`w-5 h-5 ${corDeTexto[status]}`} />
        </div>
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

function TendenciaIcon({ tendencia, delta }: { tendencia: string | null; delta: number | null }) {
  if (!tendencia || tendencia === "ESTAVEL") {
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
  if (tendencia === "SUBINDO") {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <TrendingUp className="w-4 h-4" />
        {delta !== null && <span>+{delta}%</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-sky-400">
      <TrendingDown className="w-4 h-4" />
      {delta !== null && <span>{delta}%</span>}
    </span>
  );
}

function BarraVisualTerco({ valor, min, max, cor }: { valor: number; min: number; max: number; cor: string }) {
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, valor));
  const percent = range > 0 ? ((clamped - min) / range) * 100 : 50;

  return (
    <div className="relative w-full h-3 bg-zinc-800 rounded-none border border-border">
      <div className="absolute top-0 left-[33%] w-px h-full bg-zinc-600" />
      <div className="absolute top-0 left-[66%] w-px h-full bg-zinc-600" />
      <div
        className={`absolute top-0 left-0 h-full ${corDeBarra[cor] || "bg-zinc-500"} transition-all duration-500`}
        style={{ width: `${percent}%` }}
      />
      <div
        className="absolute top-[-2px] w-2 h-[calc(100%+4px)] bg-white/80 rounded-none"
        style={{ left: `calc(${percent}% - 4px)` }}
      />
    </div>
  );
}

function SubDashboardExames({
  pacienteId,
  aberto,
  onFechar,
}: {
  pacienteId: number;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<DashboardExamesPaciente | null>(null);
  const [exameExpandido, setExameExpandido] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (aberto && pacienteId > 0) {
      setCarregando(true);
      fetchApi<DashboardExamesPaciente>(`/pacientes/${pacienteId}/exames/dashboard`)
        .then(setDados)
        .catch(console.error)
        .finally(() => setCarregando(false));
    }
  }, [aberto, pacienteId]);

  if (!aberto) return null;

  return (
    <Card className="rounded-none border-border border-t-2 border-t-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TestTube className="w-4 h-4 text-primary" />
            Exames do Paciente #{pacienteId} — Sub-Dashboard
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onFechar} className="rounded-none">
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {carregando && (
          <div className="text-center py-6 text-muted-foreground text-sm animate-pulse">
            Carregando exames...
          </div>
        )}

        {!carregando && dados && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-card border border-border rounded-none">
              <div className={`w-4 h-4 rounded-full ${corDeSemaforo[dados.semaforoGeral]}`} />
              <span className={`text-sm font-bold ${corDeTexto[dados.semaforoGeral]}`}>
                {dados.semaforoGeral === "VERDE" ? "Todos exames normais" : dados.semaforoGeral === "AMARELO" ? "Exames requerem atencao" : "Exames criticos detectados"}
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400">{dados.resumo.verdes} verdes</span>
                <span className="text-amber-400">{dados.resumo.amarelos} amarelos</span>
                <span className="text-red-400">{dados.resumo.vermelhos} vermelhos</span>
              </div>
            </div>

            <div className="space-y-1">
              {dados.exames.map((exame) => {
                const expandido = exameExpandido === exame.nome_exame;
                return (
                  <div key={exame.id} className="border border-border rounded-none">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => setExameExpandido(expandido ? null : exame.nome_exame)}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${corDeSemaforo[exame.corFinal]}`} />
                      <span className="text-sm font-medium text-foreground flex-1">{exame.nome_exame}</span>
                      <span className="text-sm font-bold text-foreground">{exame.valor}</span>
                      <span className="text-xs text-muted-foreground">{exame.unidade}</span>
                      <TendenciaIcon tendencia={exame.tendencia} delta={exame.delta_percentual} />
                      {expandido ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    </button>

                    {expandido && (
                      <div className="px-3 pb-3 pt-1 bg-muted/10 border-t border-border space-y-3">
                        <BarraVisualTerco
                          valor={exame.valor}
                          min={exame.valor_minimo}
                          max={exame.valor_maximo}
                          cor={exame.corFinal}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Min: {exame.valor_minimo}</span>
                          <span className="text-[10px]">T1 | T2 | T3</span>
                          <span>Max: {exame.valor_maximo}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Categoria:</span>{" "}
                            <span className="text-foreground">{exame.categoria || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Laboratorio:</span>{" "}
                            <span className="text-foreground">{exame.laboratorio || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data Coleta:</span>{" "}
                            <span className="text-foreground">{exame.data_coleta || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Terco:</span>{" "}
                            <span className={`font-bold ${corDeTexto[exame.corFinal]}`}>
                              {exame.terco === 1 ? "Inferior" : exame.terco === 2 ? "Medio" : exame.terco === 3 ? "Superior" : exame.terco === 0 ? "Abaixo min" : exame.terco === 4 ? "Acima max" : "—"}
                            </span>
                          </div>
                          {exame.formula_vigente && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Formula Vigente:</span>{" "}
                              <span className="text-foreground font-mono text-[11px]">{exame.formula_vigente}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {dados.exames.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum exame registrado para este paciente
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Governanca() {
  const { user } = useAuth();
  const { unidadeSelecionada } = useClinic();
  const [painel, setPainel] = useState<PainelData | null>(null);
  const [semaforo, setSemaforo] = useState<SemaforoData | null>(null);
  const [timeline, setTimeline] = useState<EventoTimeline[]>([]);
  const [filaStats, setFilaStats] = useState<FilaStats | null>(null);
  const [examesSemaforo, setExamesSemaforo] = useState<ExamesSemaforoGeral | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [subDashboardPacienteId, setSubDashboardPacienteId] = useState<number>(0);
  const [subDashboardAberto, setSubDashboardAberto] = useState(false);
  const [pacienteIdInput, setPacienteIdInput] = useState("");
  const [whatsappMensagens, setWhatsappMensagens] = useState<{
    id: number;
    telefoneDestino: string;
    templateNome: string | null;
    mensagem: string;
    status: string;
    provedor: string;
    erroDetalhes: string | null;
    criadoEm: string;
  }[]>([]);

  const carregarDados = async () => {
    setCarregando(true);
    const uf = unidadeSelecionada ? `unidadeId=${unidadeSelecionada}` : "";
    const q = (base: string) => base.includes("?") ? `${base}&${uf}` : `${base}?${uf}`;
    try {
      const [painelRes, semaforoRes, timelineRes, filaRes, examesRes, whatsappRes] = await Promise.all([
        fetchApi<PainelData>(uf ? q("/governanca/painel") : "/governanca/painel"),
        fetchApi<SemaforoData>(uf ? q("/governanca/semaforo") : "/governanca/semaforo"),
        fetchApi<{ eventos: EventoTimeline[] }>(uf ? q("/governanca/timeline?limite=15") : "/governanca/timeline?limite=15"),
        fetchApi<FilaStats>(uf ? q("/fila-preceptor/stats") : "/fila-preceptor/stats"),
        fetchApi<ExamesSemaforoGeral>(uf ? q("/exames/semaforo-geral") : "/exames/semaforo-geral"),
        fetchApi<typeof whatsappMensagens>(uf ? q("/whatsapp/mensagens?limite=10") : "/whatsapp/mensagens?limite=10").catch(() => []),
      ]);
      setPainel(painelRes);
      setSemaforo(semaforoRes);
      setTimeline(timelineRes.eventos);
      setFilaStats(filaRes);
      setExamesSemaforo(examesRes);
      setWhatsappMensagens(whatsappRes);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      console.error("Erro ao carregar governanca:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user) carregarDados();
  }, [user, unidadeSelecionada]);

  useEffect(() => {
    if (!user) return;
    const intervalo = setInterval(carregarDados, 60000);
    return () => clearInterval(intervalo);
  }, [user, unidadeSelecionada]);

  const abrirSubDashboardExames = () => {
    const id = parseInt(pacienteIdInput, 10);
    if (id > 0) {
      setSubDashboardPacienteId(id);
      setSubDashboardAberto(true);
    }
  };

  if (!user) return null;

  const examesKpiStatus: "VERDE" | "AMARELO" | "VERMELHO" = examesSemaforo?.semaforo || "VERDE";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Governanca Clinica</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Painel de soberania operacional — Pawards
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

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <SemaforoGrande status={semaforo?.semaforo || painel?.statusGeral || "VERDE"} />
            {semaforo && (
              <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                {semaforo.descricao}
              </p>
            )}
          </div>

          <div className="lg:col-span-4 grid gap-4 md:grid-cols-4">
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
            <KpiCard
              titulo="Exames Inteligentes"
              valor={examesSemaforo?.total || 0}
              status={examesKpiStatus}
              descricao={`${examesSemaforo?.verdes || 0}V ${examesSemaforo?.amarelos || 0}A ${examesSemaforo?.vermelhos || 0}R`}
              icon={TestTube}
            />
          </div>
        </div>

        <Card className="rounded-none border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              Consulta Rapida — Exames por Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="ID do Paciente"
                value={pacienteIdInput}
                onChange={(e) => setPacienteIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && abrirSubDashboardExames()}
                className="w-40 px-3 py-2 bg-background border border-border rounded-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={abrirSubDashboardExames}
                className="rounded-none border-border"
                disabled={!pacienteIdInput || parseInt(pacienteIdInput, 10) <= 0}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Ver Exames
              </Button>
              {subDashboardAberto && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSubDashboardAberto(false)}
                  className="rounded-none"
                >
                  Fechar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <SubDashboardExames
          pacienteId={subDashboardPacienteId}
          aberto={subDashboardAberto}
          onFechar={() => setSubDashboardAberto(false)}
        />

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

        <Card className="rounded-none border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              WhatsApp — Status de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {whatsappMensagens.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma mensagem WhatsApp enviada recentemente
              </div>
            ) : (
              <div className="space-y-2">
                {whatsappMensagens.map((msg) => {
                  const statusConfig: Record<string, { icon: typeof Check; cor: string; label: string }> = {
                    PENDENTE: { icon: Clock, cor: "text-muted-foreground", label: "Pendente" },
                    ENVIADO: { icon: Check, cor: "text-muted-foreground", label: "Enviado" },
                    ENTREGUE: { icon: CheckCheck, cor: "text-muted-foreground", label: "Entregue" },
                    LIDO: { icon: CheckCheck, cor: "text-blue-400", label: "Lido" },
                    FALHOU: { icon: X, cor: "text-red-400", label: "Falhou" },
                  };
                  const cfg = statusConfig[msg.status] || statusConfig.PENDENTE;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={msg.id} className="flex items-center gap-3 px-3 py-2 bg-card/50 border border-border">
                      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.cor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{msg.telefoneDestino}</span>
                          {msg.templateNome && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">{msg.templateNome}</span>
                          )}
                          <span className={`text-[10px] font-semibold ${cfg.cor}`}>{cfg.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.mensagem}</p>
                        {msg.erroDetalhes && (
                          <p className="text-[10px] text-red-400 mt-0.5">{msg.erroDetalhes}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(msg.criadoEm).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
