import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Calendar, AlertTriangle, Pill, Activity,
  TrendingUp, Heart, Clock, XCircle, CheckCircle2,
  Flame, Eye, ChevronRight, Shield, FileDown,
  FileSignature, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from "recharts";
import { useClinic } from "@/contexts/ClinicContext";
import { FEATURE_PARQ_BANNER_CEO, FEATURE_ASSINATURAS_RESUMO_CEO } from "@/lib/feature-flags";

import { apiFetch } from "@/lib/api-fetch";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SubstanciaResumo {
  nome: string;
  total: number;
  ativos: number;
  pausados: number;
  pacientesUnicos: number;
}

interface AlertaDetalhe {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  tipo: string;
  descricao: string;
  gravidade: string;
  criadoEm: string;
}

interface FaltaDetalhe {
  pacienteId: number;
  pacienteNome: string;
  data: string;
  tipo: string;
}

interface SessaoSemana {
  pacienteId: number;
  pacienteNome: string;
  status: string;
  data: string;
  tipo: string;
}

interface DashboardComando {
  resumoGeral: {
    totalPacientes: number;
    sessoesHoje: number;
    sessoesAmanha: number;
    sessoesSemana: number;
    faltasSemana: number;
    alertasAbertos: number;
    alertasGraves: number;
    substanciasEmUso: number;
  };
  statusSessoes: {
    total: number;
    agendadas: number;
    confirmadas: number;
    concluidas: number;
    faltas: number;
    canceladas: number;
  };
  substanciasResumo: SubstanciaResumo[];
  alertasDetalhes: AlertaDetalhe[];
  faltasDetalhes: FaltaDetalhe[];
  sessoesUltimaSemana: SessaoSemana[];
}

// Task #37 — paleta semantica unificada com /admin/analytics (regra-ouro
// Mike Tyson × Eder Jofre: numero absoluto isolado proibido, sempre vem com
// variacao + cor).
type CorSemantica = "excelente" | "bom" | "atencao" | "critico" | "neutro";
const COR_SEMANTICA_HEX: Record<CorSemantica, string> = {
  excelente: "#2f8f4a",
  bom:       "#3b82f6",
  atencao:   "#d97706",
  critico:   "#b53030",
  neutro:    "#71717a",
};

// Task #174 — beep curto (~300ms) via Web Audio API pra alerta de novo
// bloqueio de 2FA. Mute via localStorage("alertas_seguranca_som_mudo" === "1").
// Usa AudioContext lazy (instancia no primeiro disparo) e fecha em seguida pra
// nao segurar recurso. Falha silenciosa quando o browser bloqueia o contexto
// por falta de gesto do usuario — toast visual continua funcionando.
//
// Task #192 — aceita um "tipo" pra mapear frequencia/duracao distintas, de
// forma que o CEO reconheca o tipo de alerta de seguranca so de ouvir, sem
// precisar olhar a tela. Mute global (mesma chave de localStorage) continua
// silenciando todos os tipos. Default = "bloqueio_2fa" pra preservar o som
// original (880Hz / 300ms) usado desde a Task #174.
type TipoAlertaSeguranca = "bloqueio_2fa" | "reset_suspeito";

const PERFIL_BEEP_SEGURANCA: Record<TipoAlertaSeguranca, { frequencia: number; duracaoSegundos: number }> = {
  // bloqueio_2fa — agudo curto (som original Task #174)
  bloqueio_2fa:   { frequencia: 880, duracaoSegundos: 0.30 },
  // reset_suspeito — grave longo, contraste claro com bloqueio_2fa
  reset_suspeito: { frequencia: 440, duracaoSegundos: 0.55 },
};

function tocarBeepSeguranca(tipo: TipoAlertaSeguranca = "bloqueio_2fa"): void {
  try {
    if (typeof window === "undefined") return;
    if (window.localStorage?.getItem("alertas_seguranca_som_mudo") === "1") return;
    const Ctor = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const perfil = PERFIL_BEEP_SEGURANCA[tipo] ?? PERFIL_BEEP_SEGURANCA.bloqueio_2fa;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(perfil.frequencia, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + perfil.duracaoSegundos);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + perfil.duracaoSegundos + 0.02);
    osc.onended = () => { ctx.close().catch(() => { /* silencioso */ }); };
  } catch { /* silencioso */ }
}

function fmtVarPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1)}%`;
}

// Task #188 — sparkline simples (24 pontos = 24h) pra mini-card de bloqueios 2FA.
// Aceita array generico de valores numericos. Reusa COR_SEMANTICA_HEX.
function MiniSparklineSimples({ valores, cor, width = 60, height = 18 }: {
  valores: number[];
  cor: CorSemantica;
  width?: number;
  height?: number;
}) {
  if (!valores || valores.length === 0) return null;
  const dados = valores.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados}>
          <Line type="monotone" dataKey="v" stroke={COR_SEMANTICA_HEX[cor]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniSparkline({ pontos, dataKey, cor }: {
  pontos: { dia: string; enviadas: number; assinadas: number; rejeitadas: number }[];
  dataKey: "enviadas" | "assinadas" | "rejeitadas";
  cor: CorSemantica;
}) {
  if (!pontos || pontos.length === 0) return null;
  return (
    <div style={{ width: 60, height: 18 }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pontos}>
          <Line type="monotone" dataKey={dataKey} stroke={COR_SEMANTICA_HEX[cor]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const GRAVIDADE_COLORS: Record<string, string> = {
  GRAVE: "bg-red-500/20 text-red-400 border-red-500/30",
  MODERADO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  LEVE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const TIPO_ALERTA_LABELS: Record<string, string> = {
  PRESSAO_ALTA: "Pressao Alta",
  GLICEMIA_ALTA: "Glicemia Alta",
  EFEITO_COLATERAL: "Efeito Colateral",
  MAL_ESTAR: "Mal-Estar",
  ALERGIA: "Alergia",
};

const STATUS_SESSAO_COLORS: Record<string, string> = {
  agendada: "bg-blue-500/20 text-blue-400",
  confirmada: "bg-emerald-500/20 text-emerald-400",
  concluida: "bg-green-500/20 text-green-400",
  faltou: "bg-red-500/20 text-red-400",
  cancelada: "bg-zinc-500/20 text-zinc-400",
  parcial: "bg-amber-500/20 text-amber-400",
};

function StatMini({ label, value, icon: Icon, color, pulse }: {
  label: string; value: number | string; icon: any; color: string; pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border/50 transition-all hover:border-border">
      <div className={`p-2.5 ${color} relative`}>
        <Icon className="w-5 h-5" />
        {pulse && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tighter">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function MicroMatriz({ title, icon: Icon, items, emptyText, renderItem }: {
  title: string;
  icon: any;
  items: any[];
  emptyText: string;
  renderItem: (item: any, i: number) => React.ReactNode;
}) {
  return (
    <Card className="bg-card border-border/50 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[400px] space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{emptyText}</div>
        ) : (
          items.map((item, i) => renderItem(item, i))
        )}
      </CardContent>
    </Card>
  );
}

export default function PainelComando() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();
  const [data, setData] = useState<DashboardComando | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubstancia, setSelectedSubstancia] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visao-geral");
  // Task #200 — contagem de uploads "teimosos" (resets_manuais_count >= 3 e
  // voltaram a falhar). Polling 5min, gate guardMaster (silencioso 401/403).
  const [uploadsTeimosos, setUploadsTeimosos] = useState<{
    total: number;
    eventos: Array<{
      id: number;
      sol_id: number | null;
      paciente_nome: string | null;
      unidade_nome: string | null;
      template_codigo: string | null;
      ultimo_reset_em: string | null;
      ultimo_reset_por: string | null;
      resets_manuais_count: number | null;
      erro_processamento: string | null;
    }>;
  } | null>(null);
  const [cofreAusentes, setCofreAusentes] = useState<{
    total: number;
    has_more?: boolean;
    ausentes: {
      id: number;
      signature_id: string;
      solicitacao_id: number;
      signer_name: string;
      signer_papel: string;
      storage_key: string;
      criado_em: string;
      pdf_verificado_em: string | null;
      pdf_verificado_erro: string | null;
    }[];
  } | null>(null);
  const [assinaturasResumo, setAssinaturasResumo] = useState<{
    enviadas: number; assinadas: number; rejeitadas: number; pendentes: number;
    serie_7d?: { dia: string; enviadas: number; assinadas: number; rejeitadas: number }[];
    totais_7d?: { enviadas: number; assinadas: number; rejeitadas: number };
    totais_prev_7d?: { enviadas: number; assinadas: number; rejeitadas: number };
    variacao_pct?: { enviadas: number | null; assinadas: number | null; rejeitadas: number | null };
    cor?: { enviadas: CorSemantica; assinadas: CorSemantica; rejeitadas: CorSemantica };
    taxa_conversao_pct?: number | null;
    taxa_conversao_prev_pct?: number | null;
    variacao_conversao_pp?: number | null;
    cor_conversao?: CorSemantica;
    // Task #43 — quebra por unidade clinica (top 10 por enviadas_7d desc)
    filtro_unidade_id?: number | null;
    por_unidade?: {
      unidade_id: number;
      unidade_nome: string;
      totais_7d: { enviadas: number; assinadas: number; rejeitadas: number };
      totais_prev_7d: { enviadas: number; assinadas: number; rejeitadas: number };
      variacao_pct: { enviadas: number | null; assinadas: number | null; rejeitadas: number | null };
      cor: { enviadas: CorSemantica; assinadas: CorSemantica; rejeitadas: CorSemantica };
      serie_7d: { dia: string; enviadas: number; assinadas: number; rejeitadas: number }[];
    }[];
  } | null>(null);
  const assinaturasRef = useRef<{ assinadas: number; rejeitadas: number } | null>(null);
  // Task #52 — contagem de alertas CEO nao-visualizados (Wave 10.6).
  // Exibido como badge dentro do banner de assinaturas + link pra fila dedicada.
  const [alertasCeoNaoVistos, setAlertasCeoNaoVistos] = useState<number>(0);
  // Task #161 — contagem de bloqueios de 2FA pendentes (alertas de seguranca).
  // Mesmo padrao de polling/badge do alertasCeoNaoVistos, mas link pra
  // /plataforma/alertas-seguranca. Endpoint exige step-up; quando faltar,
  // o fetch falha em 401/403 e o badge fica zerado (silencioso).
  const [alertasSegurancaNaoVistos, setAlertasSegurancaNaoVistos] = useState<number>(0);
  // Task #153 — banner inline com a lista de bloqueios pendentes pra o CEO
  // agir direto do painel (marcar como visto / abrir fila completa) sem
  // precisar abrir email nem navegar pra /plataforma/alertas-seguranca.
  // Mesmo fetch do badge (Task #161); apenas guarda a lista alem do total.
  const [alertasSegurancaLista, setAlertasSegurancaLista] = useState<Array<{
    id: number;
    tipo: string;
    usuario_id: number;
    ip: string | null;
    user_agent: string | null;
    contexto: string | null;
    janela_inicio_em: string;
    criado_em: string;
    usuario_nome: string | null;
    usuario_email: string | null;
  }>>([]);
  const [marcandoSegurancaId, setMarcandoSegurancaId] = useState<number | null>(null);
  // Task #164 — snapshot anterior do contador de bloqueios 2FA pra disparar
  // toast vermelho apenas em deltas reais (snapshot inicial = null, nao avisa).
  const alertasSegurancaRef = useRef<number | null>(null);
  // Task #185 — botao toggle pro mute do beep de seguranca (Task #174).
  // Antes so dava pra alternar via devtools (localStorage). Agora ha botao
  // visivel proximo ao badge, com persistencia + sync entre abas (storage event).
  const [somSegurancaMudo, setSomSegurancaMudo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage?.getItem("alertas_seguranca_som_mudo") === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key === "alertas_seguranca_som_mudo") {
        setSomSegurancaMudo(e.newValue === "1");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function alternarSomSeguranca() {
    try {
      const novo = !somSegurancaMudo;
      if (novo) window.localStorage?.setItem("alertas_seguranca_som_mudo", "1");
      else window.localStorage?.removeItem("alertas_seguranca_som_mudo");
      setSomSegurancaMudo(novo);
      toast({
        title: novo ? "🔕 som mudo" : "🔔 som ativo",
        description: novo
          ? "Beep de bloqueio 2FA silenciado."
          : "Beep de bloqueio 2FA reativado.",
        duration: 2000,
      });
    } catch { /* silencioso */ }
  }
  // Task #191 — atalho global Shift+M alterna o mute do beep de seguranca sem
  // precisar mover o mouse ate o cabecalho. Ignorado quando o foco esta em
  // input/textarea/contenteditable pra nao atrapalhar digitacao.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKeyDown(e: KeyboardEvent) {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "M" && e.key !== "m") return;
      const alvo = e.target as HTMLElement | null;
      if (alvo) {
        const tag = alvo.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (alvo.isContentEditable) return;
      }
      e.preventDefault();
      alternarSomSeguranca();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [somSegurancaMudo]);
  // Task #175 — tendencia de bloqueios 2FA nas ultimas 24h vs 24h anteriores.
  // Mini-card pequeno (Bloqueios 2FA 24h: N ▲/▼ vs ontem). Cor verde quando
  // tendencia caindo, vermelho quando subindo, neutro quando estavel/sem dado.
  const [bloqueios2faTendencia, setBloqueios2faTendencia] = useState<{
    total_janela: number;
    total_janela_anterior: number;
    variacao_pct: number | null;
    tendencia: "subindo" | "caindo" | "estavel";
    // Task #188 — serie horaria (24 buckets pra janela_horas=24) pra sparkline.
    serie_horaria: { hora: string; total: number }[];
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const params = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";
    apiFetch(`${API_BASE}/dashboard/comando${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unidadeSelecionada]);

  // Task #35 + Task #36 + Task #43 — resumo diario assinaturas pro Painel CEO.
  // Endpoint protegido por guardMaster: 401/403 sao silenciosos (banner so
  // aparece pra master). Polling 60s + delta vs ultimo snapshot dispara toast
  // quando uma assinatura nova for concluida ou recusada (Task #36).
  // Task #43 — propaga unidade selecionada como filtro; quando "todas as
  // clinicas", omite o param e o backend devolve agregado da rede.
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;

    let alive = true;
    const qs = unidadeSelecionada && !isTodasClinicas ? `?unidade_id=${unidadeSelecionada}` : "";
    // Reset snapshot ao trocar filtro pra evitar disparo espurio de toast
    // por causa de baseline diferente entre rede vs unidade.
    assinaturasRef.current = null;

    const carregar = async () => {
      try {
        const r = await apiFetch(`${API_BASE}/assinaturas/resumo-hoje${qs}`, { credentials: "include" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (!alive || !d) return;

        const prev = assinaturasRef.current;
        if (prev) {
          const novasAssinadas = (d.assinadas ?? 0) - prev.assinadas;
          const novasRejeitadas = (d.rejeitadas ?? 0) - prev.rejeitadas;
          if (novasAssinadas > 0) {
            toast({
              title: `✅ ${novasAssinadas} contrato${novasAssinadas > 1 ? "s" : ""} assinado${novasAssinadas > 1 ? "s" : ""}`,
              description: "Webhook ZapSign confirmou conclusão agora.",
              duration: 10000,
              action: (
                <ToastAction altText="Abrir timeline" onClick={() => { window.location.href = "/assinaturas/timeline"; }}>
                  Abrir timeline
                </ToastAction>
              ),
            });
          }
          if (novasRejeitadas > 0) {
            toast({
              title: `⛔ ${novasRejeitadas} contrato${novasRejeitadas > 1 ? "s" : ""} recusado${novasRejeitadas > 1 ? "s" : ""}`,
              description: "Webhook ZapSign sinalizou recusa do signatário.",
              variant: "destructive",
              duration: 15000,
              action: (
                <ToastAction altText="Abrir timeline" onClick={() => { window.location.href = "/assinaturas/timeline"; }}>
                  Abrir timeline
                </ToastAction>
              ),
            });
          }
        }
        assinaturasRef.current = { assinadas: d.assinadas ?? 0, rejeitadas: d.rejeitadas ?? 0 };
        setAssinaturasResumo(d);
      } catch { /* silencioso */ }
    };

    carregar();
    const id = setInterval(carregar, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [toast, unidadeSelecionada, isTodasClinicas]);

  // Task #47 — PDFs assinados ausentes do cofre (30d). Mesmo gate guardMaster:
  // 401/403 silenciosos, card so renderiza pra master autenticado. Polling 5min
  // (worker roda 1x/dia, nao precisa pressao no banco).
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;
    let alive = true;
    const carregar = async () => {
      try {
        const r = await apiFetch(`${API_BASE}/assinaturas/cofre/ausentes`, { credentials: "include" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (!alive || !d) return;
        setCofreAusentes({ total: d.total ?? 0, has_more: d.has_more ?? false, ausentes: d.ausentes ?? [] });
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 5 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Task #200 — uploads "teimosos" (3+ resets manuais que voltaram a falhar).
  // Reusa endpoint /assinaturas/uploads-falhos (master-only) e propaga filtro
  // de unidade pra alinhar com o resto do dashboard. Polling 2min: o worker
  // de retry roda a cada 5min, entao 2min cobre bem a janela de detec cao.
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;
    let alive = true;
    const qs = unidadeSelecionada && !isTodasClinicas ? `?unidadeId=${unidadeSelecionada}` : "";
    setUploadsTeimosos(null);
    const carregar = async () => {
      try {
        const r = await apiFetch(`${API_BASE}/assinaturas/uploads-falhos${qs}`, { credentials: "include" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (!alive || !d?.contagem) return;
        setUploadsTeimosos({
          total: d.contagem.teimosos ?? 0,
          eventos: d.grupos?.teimosos ?? [],
        });
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 2 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [unidadeSelecionada, isTodasClinicas]);

  // Task #52 — polling leve da fila de alertas CEO (mesmo guard do banner).
  // Conta apenas os nao-visualizados pra mostrar o badge no painel.
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;
    let alive = true;
    const carregar = async () => {
      try {
        const r = await apiFetch(`${API_BASE}/assinaturas/alertas-ceo?limit=200`, { credentials: "include" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (!alive) return;
        const nVistos = (d.alertas || []).filter((a: { visualizado_em: string | null }) => !a.visualizado_em).length;
        setAlertasCeoNaoVistos(nVistos);
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 60_000);
    // Task #61 — refresh imediato do badge quando a tela de fila marca
    // todos como vistos (mesma aba via CustomEvent + outras abas via storage).
    const onMarcados = () => { carregar(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "alertas_ceo_marcados_em") carregar();
    };
    window.addEventListener("alertas_ceo_marcados", onMarcados);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("alertas_ceo_marcados", onMarcados);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Task #175 — polling de tendencia de bloqueios 2FA nas ultimas 24h.
  // Mesmo gate/cadencia (60s) e mesmo padrao silencioso de 401/403 (zera).
  // Usa janela_horas=24 que devolve total_janela / total_janela_anterior /
  // variacao_pct / tendencia agregados (independente de apenas_nao_vistos).
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;
    let alive = true;
    const carregar = async () => {
      try {
        const r = await apiFetch(
          `${API_BASE}/plataforma/alertas-seguranca?janela_horas=24&limite=1`,
          { credentials: "include" },
        );
        if (!alive) return;
        if (!r.ok) {
          setBloqueios2faTendencia(null);
          return;
        }
        const d = await r.json();
        if (!alive || !d || d.total_janela === undefined) return;
        setBloqueios2faTendencia({
          total_janela: Number(d.total_janela ?? 0),
          total_janela_anterior: Number(d.total_janela_anterior ?? 0),
          variacao_pct:
            d.variacao_pct === null || d.variacao_pct === undefined
              ? null
              : Number(d.variacao_pct),
          tendencia: (d.tendencia ?? "estavel") as "subindo" | "caindo" | "estavel",
          serie_horaria: Array.isArray(d.serie_horaria)
            ? (d.serie_horaria as { hora: string; total: number | string }[]).map((p) => ({
                hora: String(p.hora ?? ""),
                total: Number(p.total ?? 0) || 0,
              }))
            : [],
        });
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 60_000);
    const onMarcados = () => { carregar(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "alertas_seguranca_marcados_em") carregar();
    };
    window.addEventListener("alertas_seguranca_marcados", onMarcados);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("alertas_seguranca_marcados", onMarcados);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Task #161 — polling leve de alertas de seguranca pendentes (2FA brute-force).
  // Mesma cadencia (60s) e mesmo padrao silencioso do badge alertas-ceo.
  // Endpoint /api/plataforma/alertas-seguranca exige guardas + step-up; quando
  // o usuario nao tiver, devolve 401/403 e o badge fica zerado.
  useEffect(() => {
    if (!FEATURE_ASSINATURAS_RESUMO_CEO) return;
    let alive = true;
    const carregar = async () => {
      try {
        const r = await apiFetch(
          `${API_BASE}/plataforma/alertas-seguranca?apenas_nao_vistos=true&limite=200`,
          { credentials: "include" },
        );
        if (!alive) return;
        if (!r.ok) {
          // 401/403 (sem step-up ou nao-master): zera o badge pra evitar
          // contagem stale apos expirar 2FA recente.
          setAlertasSegurancaNaoVistos(0);
          setAlertasSegurancaLista([]);
          // Reset do snapshot pra evitar disparo espurio quando o step-up
          // voltar (baseline precisa ser reestabelecido).
          alertasSegurancaRef.current = null;
          return;
        }
        const d = await r.json();
        if (!alive) return;
        const total = Number(d.total ?? (Array.isArray(d.alertas) ? d.alertas.length : 0)) || 0;
        // Task #164 — toast vermelho quando entrar bloqueio novo na fila.
        // Snapshot inicial (ref === null) nao dispara, mesmo padrao do
        // assinaturasRef. Disparo apenas em delta positivo.
        const prev = alertasSegurancaRef.current;
        if (prev !== null && total > prev) {
          const novos = total - prev;
          toast({
            title: `🚨 ${novos} novo${novos > 1 ? "s" : ""} bloqueio${novos > 1 ? "s" : ""} de 2FA`,
            description: "Possível tentativa de brute-force detectada agora.",
            variant: "destructive",
            duration: 15000,
            action: (
              <ToastAction
                altText="Abrir fila"
                onClick={() => { window.location.href = "/plataforma/alertas-seguranca"; }}
              >
                Abrir fila
              </ToastAction>
            ),
          });
          // Task #174 — beep curto (~300ms) junto com o toast vermelho pra
          // chamar atencao do CEO quando a aba estiver em segundo plano.
          // Mute opcional via localStorage("alertas_seguranca_som_mudo" === "1").
          // Falha silenciosa quando o browser bloqueia AudioContext (sem
          // gesto do usuario ainda) — toast visual continua funcionando.
          tocarBeepSeguranca();
        }
        alertasSegurancaRef.current = total;
        setAlertasSegurancaNaoVistos(total);
        // Task #153 — guarda a lista pra render inline no banner do painel.
        setAlertasSegurancaLista(Array.isArray(d.alertas) ? d.alertas : []);
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 60_000);
    // Task #165 — refresh imediato quando a tela /plataforma/alertas-seguranca
    // marca um alerta como visto (mesma aba via CustomEvent + outras abas via
    // storage event). Mesmo padrao do "alertas_ceo_marcados" (Task #61).
    const onMarcados = () => { carregar(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "alertas_seguranca_marcados_em") carregar();
    };
    window.addEventListener("alertas_seguranca_marcados", onMarcados);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("alertas_seguranca_marcados", onMarcados);
      window.removeEventListener("storage", onStorage);
    };
  }, [toast]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-80" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Erro ao carregar painel de comando</div>
      </Layout>
    );
  }

  const { resumoGeral, statusSessoes, substanciasResumo, alertasDetalhes, faltasDetalhes, sessoesUltimaSemana } = data;

  const ss = statusSessoes ?? { concluidas: 0, agendadas: 0, confirmadas: 0, faltas: 0, canceladas: 0 } as any;
  const pieData = [
    { name: "Concluidas", value: ss.concluidas ?? 0, fill: "#22c55e" },
    { name: "Agendadas", value: ss.agendadas ?? 0, fill: "#3b82f6" },
    { name: "Confirmadas", value: ss.confirmadas ?? 0, fill: "#10b981" },
    { name: "Faltas", value: ss.faltas ?? 0, fill: "#ef4444" },
    { name: "Canceladas", value: ss.canceladas ?? 0, fill: "#71717a" },
  ].filter(d => d.value > 0);

  const substBarData = substanciasResumo.slice(0, 8).map(s => ({
    nome: s.nome.length > 14 ? s.nome.slice(0, 14) + "..." : s.nome,
    full: s.nome,
    ativos: s.ativos,
    pausados: s.pausados,
    pacientes: s.pacientesUnicos,
  }));

  // Task #153 — marca um bloqueio como visto direto do banner do painel,
  // sem precisar abrir /plataforma/alertas-seguranca. Otimista: remove da
  // lista local antes da resposta + dispara o mesmo CustomEvent que a fila
  // dedicada (alertas_seguranca_marcados) pra refresh entre abas.
  async function marcarSegurancaComoVisto(id: number) {
    setMarcandoSegurancaId(id);
    try {
      const r = await apiFetch(
        `${API_BASE}/plataforma/alertas-seguranca/${id}/visualizar`,
        { method: "POST", credentials: "include" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast({
          title: "Falha ao marcar como visto",
          description: String((j as { error?: string }).error ?? r.statusText),
          variant: "destructive",
        });
        return;
      }
      setAlertasSegurancaLista((prev) => prev.filter((a) => a.id !== id));
      setAlertasSegurancaNaoVistos((n) => Math.max(0, n - 1));
      try {
        window.dispatchEvent(new CustomEvent("alertas_seguranca_marcados"));
        window.localStorage.setItem(
          "alertas_seguranca_marcados_em",
          String(Date.now()),
        );
      } catch { /* silencioso */ }
    } finally {
      setMarcandoSegurancaId(null);
    }
  }

  function formatarSegurancaData(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Wave 9 PARQ — Banner de autonomia preservada (não-fechável, link p/ admin) */}
        {/* Task #153 — banner inline com a fila de bloqueios 2FA pendentes.
            Antes o CEO so via o badge dentro do banner de assinaturas (Task
            #161); agora ve a lista completa direto no painel + pode marcar
            como visto sem trocar de pagina. Independe de assinaturasResumo
            pra nao sumir quando nao houver atividade de assinaturas. */}
        {alertasSegurancaLista.length > 0 && (
          <div
            className="border-l-4 border-[var(--pw-vermelho-escuro,#7d1d2e)] bg-[var(--pw-vermelho-escuro,#7d1d2e)]/5 px-4 py-3 rounded-sm"
            data-testid="banner-ceo-alertas-seguranca"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[var(--pw-vermelho-escuro,#b53030)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-vermelho-escuro,#b53030)] font-semibold flex items-center gap-2 flex-wrap">
                    <span>Bloqueios 2FA · pendentes de revisao</span>
                    <span
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold"
                      style={{ backgroundColor: COR_SEMANTICA_HEX.critico, color: "white" }}
                      data-testid="banner-alertas-seguranca-total"
                    >
                      {alertasSegurancaLista.length}
                      {" "}
                      sem ver
                    </span>
                  </div>
                  <a
                    href="/plataforma/alertas-seguranca"
                    className="text-[11px] underline text-[var(--pw-vermelho-escuro,#b53030)] hover:opacity-80"
                    data-testid="link-banner-alertas-seguranca-fila"
                  >
                    Abrir fila completa →
                  </a>
                </div>
                <ul className="mt-2 divide-y divide-[var(--pw-vermelho-escuro,#7d1d2e)]/15">
                  {alertasSegurancaLista.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="py-2 flex items-start justify-between gap-3 text-xs"
                      data-testid={`banner-alerta-seguranca-${a.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[var(--pw-tinta)]">
                          {a.usuario_nome ?? `Usuario #${a.usuario_id}`}
                          {a.usuario_email && (
                            <span className="font-normal text-muted-foreground ml-1">
                              ({a.usuario_email})
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>{formatarSegurancaData(a.janela_inicio_em ?? a.criado_em)}</span>
                          {a.contexto && <span>contexto: <code>{a.contexto}</code></span>}
                          {a.ip && <span>IP: <code>{a.ip}</code></span>}
                          {a.user_agent && (
                            <span className="truncate max-w-[18rem]" title={a.user_agent}>
                              UA: {a.user_agent}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void marcarSegurancaComoVisto(a.id)}
                        disabled={marcandoSegurancaId === a.id}
                        className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-bold border border-[var(--pw-vermelho-escuro,#b53030)]/40 text-[var(--pw-vermelho-escuro,#b53030)] hover:bg-[var(--pw-vermelho-escuro,#7d1d2e)]/10 disabled:opacity-50"
                        data-testid={`button-banner-marcar-visto-${a.id}`}
                      >
                        {marcandoSegurancaId === a.id ? "..." : "Marcar visto"}
                      </button>
                    </li>
                  ))}
                </ul>
                {alertasSegurancaLista.length > 5 && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    + {alertasSegurancaLista.length - 5} bloqueio
                    {alertasSegurancaLista.length - 5 > 1 ? "s" : ""} adicional
                    {alertasSegurancaLista.length - 5 > 1 ? "is" : ""}.
                    {" "}
                    <a
                      href="/plataforma/alertas-seguranca"
                      className="underline text-[var(--pw-vermelho-escuro,#b53030)]"
                    >
                      Ver tudo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Task #35 — resumo diario de assinaturas (24h), so renderiza com dados */}
        {FEATURE_ASSINATURAS_RESUMO_CEO && assinaturasResumo && (
          <a
            href="/assinaturas/timeline"
            className="block border-l-4 border-[var(--pw-dourado-vivo)] bg-[var(--pw-petroleo)]/5 hover:bg-[var(--pw-petroleo)]/10 transition-colors px-4 py-3 rounded-sm"
            data-testid="banner-ceo-assinaturas-resumo"
          >
            <div className="flex items-start gap-3">
              <FileSignature className="w-5 h-5 text-[var(--pw-dourado-vivo)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-dourado)] font-semibold flex items-center gap-2 flex-wrap">
                  <span>Assinaturas · ultimas 24h · tendencia 7d</span>
                  {/* Task #52 — badge contagem alertas CEO nao-visualizados */}
                  {alertasCeoNaoVistos > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = "/assinaturas/alertas-ceo";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = "/assinaturas/alertas-ceo";
                        }
                      }}
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: COR_SEMANTICA_HEX.atencao, color: "white" }}
                      title="Abrir fila de alertas do CEO"
                      data-testid="badge-alertas-ceo-nao-vistos"
                    >
                      {alertasCeoNaoVistos} alerta{alertasCeoNaoVistos > 1 ? "s" : ""} CEO sem ver
                    </span>
                  )}
                  {/* Task #161 — badge contagem alertas seguranca (2FA brute-force) pendentes */}
                  {alertasSegurancaNaoVistos > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = "/plataforma/alertas-seguranca";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = "/plataforma/alertas-seguranca";
                        }
                      }}
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: COR_SEMANTICA_HEX.critico, color: "white" }}
                      title="Abrir fila de alertas de seguranca (bloqueios de 2FA)"
                      data-testid="badge-alertas-seguranca-nao-vistos"
                    >
                      {alertasSegurancaNaoVistos} bloqueio{alertasSegurancaNaoVistos > 1 ? "s" : ""} 2FA pendente{alertasSegurancaNaoVistos > 1 ? "s" : ""}
                    </span>
                  )}
                  {/* Task #185 — toggle mute do beep de seguranca (Task #174). */}
                  {/* Visivel sempre pra deixar a opcao auto-explicativa, sem precisar abrir devtools. */}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); alternarSomSeguranca(); }}
                    className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold cursor-pointer hover:opacity-90 border"
                    style={{
                      backgroundColor: somSegurancaMudo ? COR_SEMANTICA_HEX.neutro : COR_SEMANTICA_HEX.bom,
                      color: "white",
                      borderColor: "transparent",
                    }}
                    title={somSegurancaMudo
                      ? "Som do alerta de bloqueio 2FA esta MUDO. Clique pra reativar. (atalho: Shift+M)"
                      : "Som do alerta de bloqueio 2FA esta ATIVO. Clique pra silenciar. (atalho: Shift+M)"}
                    aria-pressed={somSegurancaMudo}
                    data-testid="botao-toggle-som-alertas-seguranca"
                  >
                    {somSegurancaMudo ? "🔕 som mudo" : "🔔 som ativo"}
                  </button>
                  {assinaturasResumo.taxa_conversao_pct !== null && assinaturasResumo.taxa_conversao_pct !== undefined && (
                    <span
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold"
                      style={{
                        backgroundColor: `${COR_SEMANTICA_HEX[assinaturasResumo.cor_conversao || "neutro"]}22`,
                        color: COR_SEMANTICA_HEX[assinaturasResumo.cor_conversao || "neutro"],
                      }}
                      data-testid="banner-ceo-assinaturas-conversao"
                    >
                      conversao 7d: {assinaturasResumo.taxa_conversao_pct.toFixed(1)}%
                      {assinaturasResumo.variacao_conversao_pp !== null && assinaturasResumo.variacao_conversao_pp !== undefined && (
                        <span className="ml-1 opacity-80">
                          ({assinaturasResumo.variacao_conversao_pp > 0 ? "+" : ""}{assinaturasResumo.variacao_conversao_pp.toFixed(1)}pp)
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--pw-tinta)] mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2" data-testid="banner-ceo-assinaturas-enviadas">
                    {assinaturasResumo.serie_7d && (
                      <MiniSparkline pontos={assinaturasResumo.serie_7d} dataKey="enviadas" cor={assinaturasResumo.cor?.enviadas || "neutro"} />
                    )}
                    <div className="leading-tight">
                      <div><strong className="text-[var(--pw-petroleo)]">{assinaturasResumo.enviadas}</strong> enviadas <span className="text-[10px] text-zinc-500">24h</span></div>
                      <div className="text-[10px] text-zinc-500">
                        7d: {assinaturasResumo.totais_7d?.enviadas ?? 0} ·
                        <span style={{ color: COR_SEMANTICA_HEX[assinaturasResumo.cor?.enviadas || "neutro"] }}> {fmtVarPct(assinaturasResumo.variacao_pct?.enviadas)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" data-testid="banner-ceo-assinaturas-assinadas">
                    {assinaturasResumo.serie_7d && (
                      <MiniSparkline pontos={assinaturasResumo.serie_7d} dataKey="assinadas" cor={assinaturasResumo.cor?.assinadas || "neutro"} />
                    )}
                    <div className="leading-tight">
                      <div className="text-emerald-600"><strong>{assinaturasResumo.assinadas}</strong> assinadas <span className="text-[10px] text-zinc-500">24h</span></div>
                      <div className="text-[10px] text-zinc-500">
                        7d: {assinaturasResumo.totais_7d?.assinadas ?? 0} ·
                        <span style={{ color: COR_SEMANTICA_HEX[assinaturasResumo.cor?.assinadas || "neutro"] }}> {fmtVarPct(assinaturasResumo.variacao_pct?.assinadas)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" data-testid="banner-ceo-assinaturas-rejeitadas">
                    {assinaturasResumo.serie_7d && (
                      <MiniSparkline pontos={assinaturasResumo.serie_7d} dataKey="rejeitadas" cor={assinaturasResumo.cor?.rejeitadas || "neutro"} />
                    )}
                    <div className="leading-tight">
                      <div className="text-red-600"><strong>{assinaturasResumo.rejeitadas}</strong> rejeitadas <span className="text-[10px] text-zinc-500">24h</span></div>
                      <div className="text-[10px] text-zinc-500">
                        7d: {assinaturasResumo.totais_7d?.rejeitadas ?? 0} ·
                        <span style={{ color: COR_SEMANTICA_HEX[assinaturasResumo.cor?.rejeitadas || "neutro"] }}> {fmtVarPct(assinaturasResumo.variacao_pct?.rejeitadas)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" data-testid="banner-ceo-assinaturas-pendentes">
                    <div className="leading-tight">
                      <div className="text-amber-600"><strong>{assinaturasResumo.pendentes}</strong> pendentes <span className="text-[10px] text-zinc-500">24h</span></div>
                      <div className="text-[10px] text-zinc-500">aguardando assinatura</div>
                    </div>
                  </div>
                </div>

                {/* Task #43 — quebra por unidade clinica (top 10 por enviadas_7d) */}
                {assinaturasResumo.por_unidade && assinaturasResumo.por_unidade.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--pw-petroleo)]/15" data-testid="banner-ceo-assinaturas-por-unidade">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--pw-dourado)] font-semibold mb-1.5">
                      Tendencia 7d por clinica · rede toda
                      {assinaturasResumo.filtro_unidade_id && (
                        <span className="ml-2 normal-case tracking-normal text-[9px] text-zinc-500">
                          (cards 24h acima estao filtrados; tabela mantem a rede pra comparacao)
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]" data-testid="tabela-assinaturas-por-unidade">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-200/50">
                            <th className="py-1 pr-2 font-medium">Clinica</th>
                            <th className="py-1 pr-2 font-medium text-right">Enviadas 7d</th>
                            <th className="py-1 pr-2 font-medium">Tendencia</th>
                            <th className="py-1 pr-2 font-medium text-right">Assinadas 7d</th>
                            <th className="py-1 pr-2 font-medium text-right">Rejeitadas 7d</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assinaturasResumo.por_unidade.map((u) => (
                            <tr
                              key={u.unidade_id}
                              onClick={(e) => {
                                // Task #51 — clique na linha abre timeline filtrada por essa clinica.
                                // stopPropagation pra nao disparar o navigate do <a> wrapper externo.
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/assinaturas/timeline?unidade_id=${u.unidade_id}`;
                              }}
                              className="border-b border-zinc-100/60 last:border-0 hover:bg-[var(--pw-petroleo)]/10 cursor-pointer transition-colors"
                              data-testid={`linha-unidade-${u.unidade_id}`}
                              title={`Abrir timeline filtrada por ${u.unidade_nome}`}
                            >
                              <td className="py-1.5 pr-2 text-[var(--pw-petroleo)] font-medium truncate max-w-[180px]" title={u.unidade_nome}>
                                {u.unidade_nome.replace(/^INSTITUTO\s+/i, "")}
                              </td>
                              <td className="py-1.5 pr-2 text-right">
                                <strong>{u.totais_7d.enviadas}</strong>
                                <span className="ml-1 text-[10px]" style={{ color: COR_SEMANTICA_HEX[u.cor.enviadas] }}>
                                  {fmtVarPct(u.variacao_pct.enviadas)}
                                </span>
                              </td>
                              <td className="py-1.5 pr-2">
                                <MiniSparkline pontos={u.serie_7d} dataKey="enviadas" cor={u.cor.enviadas} />
                              </td>
                              <td className="py-1.5 pr-2 text-right text-emerald-700">
                                <strong>{u.totais_7d.assinadas}</strong>
                                <span className="ml-1 text-[10px]" style={{ color: COR_SEMANTICA_HEX[u.cor.assinadas] }}>
                                  {fmtVarPct(u.variacao_pct.assinadas)}
                                </span>
                              </td>
                              <td className="py-1.5 pr-2 text-right text-red-700">
                                <strong>{u.totais_7d.rejeitadas}</strong>
                                <span className="ml-1 text-[10px]" style={{ color: COR_SEMANTICA_HEX[u.cor.rejeitadas] }}>
                                  {fmtVarPct(u.variacao_pct.rejeitadas)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--pw-tinta)] flex-shrink-0 mt-1" />
            </div>
          </a>
        )}

        {/* Task #47 — PDFs assinados ausentes do cofre (30d). Verde 0, ambar 1-2,
            vermelho 3+. Cada linha clica e abre /assinaturas/:id (Wave 10 F5). */}
        {FEATURE_ASSINATURAS_RESUMO_CEO && cofreAusentes && (() => {
          const total = cofreAusentes.total;
          const cor: CorSemantica = total === 0 ? "excelente" : total <= 2 ? "atencao" : "critico";
          const corHex = COR_SEMANTICA_HEX[cor];
          return (
            <div
              className="border-l-4 px-4 py-3 rounded-sm bg-[var(--pw-petroleo)]/5"
              style={{ borderLeftColor: corHex }}
              data-testid="card-ceo-cofre-ausentes"
            >
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: corHex }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-dourado)] font-semibold flex items-center gap-2 flex-wrap">
                    <span>PDFs assinados ausentes do cofre · 30d</span>
                    <span
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold"
                      style={{ backgroundColor: `${corHex}22`, color: corHex }}
                      data-testid="card-ceo-cofre-ausentes-total"
                    >
                      {total === 0 ? "0 · cofre integro" : `${total} ausente${total > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {total === 0 ? (
                    <div className="text-xs text-[var(--pw-tinta)] mt-1.5">
                      Worker diario verificou todos os PDFs assinados dos ultimos 30 dias e estao no bucket. Defesa LGPD/CFM ok.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] text-[var(--pw-tinta)] mb-1">
                        Click pra abrir o detalhe da assinatura:
                      </div>
                      {cofreAusentes.ausentes.slice(0, 5).map((a) => (
                        <a
                          key={a.id}
                          href={`/assinaturas/${a.solicitacao_id}`}
                          className="block text-xs px-2 py-1.5 rounded-sm bg-white/40 hover:bg-white/70 border border-zinc-200/60 transition-colors"
                          data-testid={`card-ceo-cofre-ausente-${a.id}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-zinc-500">{a.signature_id.slice(0, 12)}…</span>
                            <span className="font-semibold text-[var(--pw-petroleo)]">{a.signer_name}</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{a.signer_papel}</span>
                            <span className="ml-auto text-[10px] text-zinc-500">
                              criado {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {a.pdf_verificado_erro && (
                            <div className="text-[10px] text-red-700 mt-0.5 truncate">erro: {a.pdf_verificado_erro}</div>
                          )}
                        </a>
                      ))}
                      {(cofreAusentes.ausentes.length > 5 || cofreAusentes.has_more) && (
                        <div className="text-[10px] text-zinc-500 italic">
                          exibindo {Math.min(5, cofreAusentes.ausentes.length)} de {cofreAusentes.total} ausente{cofreAusentes.total > 1 ? "s" : ""}
                          {cofreAusentes.has_more && " · lista truncada em 200, abrir timeline pra ver todas"}
                          {" · worker reverifica 1x/dia 03:30 BRT"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Task #200 — uploads "teimosos" (3+ resets manuais que voltaram a falhar).
            Verde 0, vermelho 1+. Clique abre /assinaturas/uploads-falhos com mesma
            unidade selecionada (filtro propagado pela ClinicContext). */}
        {FEATURE_ASSINATURAS_RESUMO_CEO && uploadsTeimosos && (() => {
          const total = uploadsTeimosos.total;
          const cor: CorSemantica = total === 0 ? "excelente" : "critico";
          const corHex = COR_SEMANTICA_HEX[cor];
          const eventos = uploadsTeimosos.eventos;
          return (
            <a
              href="/assinaturas/uploads-falhos"
              className="block border-l-4 px-4 py-3 rounded-sm bg-[var(--pw-petroleo)]/5 hover:bg-[var(--pw-petroleo)]/10 transition-colors"
              style={{ borderLeftColor: corHex }}
              data-testid="card-ceo-uploads-teimosos"
              title="Abrir fila de uploads de PDF assinado com falha"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: corHex }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-dourado)] font-semibold flex items-center gap-2 flex-wrap">
                    <span>Uploads teimosos · 3+ resets sem sucesso</span>
                    <span
                      className="normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-sm font-bold"
                      style={{ backgroundColor: `${corHex}22`, color: corHex }}
                      data-testid="card-ceo-uploads-teimosos-total"
                    >
                      {total === 0 ? "0 · sem teimoso" : `${total} upload${total > 1 ? "s" : ""} teimoso${total > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {total === 0 ? (
                    <div className="text-xs text-[var(--pw-tinta)] mt-1.5">
                      Nenhum evento de upload de PDF assinado foi resetado 3+ vezes
                      sem sucesso. Worker `pdfRetryUpload` esta dando conta do retry.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] text-[var(--pw-tinta)] mb-1">
                        Reset manual nao resolveu — precisa baixar do ZapSign na unha:
                      </div>
                      {eventos.slice(0, 5).map((e) => (
                        <div
                          key={e.id}
                          className="text-xs px-2 py-1.5 rounded-sm bg-white/40 border border-zinc-200/60"
                          data-testid={`card-ceo-upload-teimoso-${e.id}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-zinc-500">#{e.id}</span>
                            <span className="font-semibold text-[var(--pw-petroleo)]">
                              {e.paciente_nome || "(sem vinculo)"}
                            </span>
                            {e.template_codigo && (
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                {e.template_codigo}
                              </span>
                            )}
                            {e.unidade_nome && (
                              <span className="text-[10px] text-zinc-500">
                                · {e.unidade_nome.replace(/^INSTITUTO\s+/i, "")}
                              </span>
                            )}
                            <span
                              className="ml-auto text-[10px] font-bold"
                              style={{ color: corHex }}
                              title="Quantidade de resets manuais que falharam"
                            >
                              {e.resets_manuais_count ?? 0}× reset
                            </span>
                          </div>
                          {(e.ultimo_reset_em || e.ultimo_reset_por) && (
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              ultimo reset:{" "}
                              {e.ultimo_reset_em
                                ? new Date(e.ultimo_reset_em).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                              {e.ultimo_reset_por && ` por ${e.ultimo_reset_por}`}
                            </div>
                          )}
                          {e.erro_processamento && (
                            <div
                              className="text-[10px] text-red-700 mt-0.5 truncate"
                              title={e.erro_processamento}
                            >
                              ultima falha: {e.erro_processamento}
                            </div>
                          )}
                        </div>
                      ))}
                      {eventos.length > 5 && (
                        <div className="text-[10px] text-zinc-500 italic">
                          exibindo 5 de {total} · clique pra abrir a fila completa
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </a>
          );
        })()}

        {/* Task #175 — mini-card de tendencia de bloqueios 2FA (24h vs 24h anteriores).
            Verde caindo · vermelho subindo · neutro estavel. Clica e abre fila. */}
        {FEATURE_ASSINATURAS_RESUMO_CEO && bloqueios2faTendencia && (() => {
          const t = bloqueios2faTendencia;
          const cor: CorSemantica =
            t.tendencia === "subindo" ? "critico"
            : t.tendencia === "caindo" ? "excelente"
            : "neutro";
          const corHex = COR_SEMANTICA_HEX[cor];
          const seta = t.tendencia === "subindo" ? "▲" : t.tendencia === "caindo" ? "▼" : "▬";
          const delta = t.total_janela - t.total_janela_anterior;
          const deltaTxt = delta > 0 ? `+${delta}` : `${delta}`;
          return (
            <a
              href="/plataforma/alertas-seguranca"
              className="block border-l-4 px-4 py-2 rounded-sm bg-[var(--pw-petroleo)]/5 hover:bg-[var(--pw-petroleo)]/10 transition-colors"
              style={{ borderLeftColor: corHex }}
              data-testid="card-ceo-bloqueios-2fa-24h"
              title="Abrir fila de alertas de seguranca"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <Shield className="w-4 h-4 flex-shrink-0" style={{ color: corHex }} />
                <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-dourado)] font-semibold">
                  Bloqueios 2FA · 24h
                </span>
                <span
                  className="text-sm font-bold tracking-tight"
                  style={{ color: corHex }}
                  data-testid="card-ceo-bloqueios-2fa-24h-total"
                >
                  {t.total_janela}
                </span>
                {t.serie_horaria && t.serie_horaria.length > 0 && (
                  <span data-testid="card-ceo-bloqueios-2fa-24h-sparkline">
                    <MiniSparklineSimples
                      valores={t.serie_horaria.map((p) => p.total)}
                      cor={cor}
                    />
                  </span>
                )}
                <span className="text-[11px] text-[var(--pw-tinta)]" data-testid="card-ceo-bloqueios-2fa-24h-tendencia">
                  <span style={{ color: corHex }}>{seta}</span>{" "}
                  {deltaTxt} vs ontem ({t.total_janela_anterior})
                  {t.variacao_pct !== null && (
                    <span className="ml-1 opacity-80">· {fmtVarPct(t.variacao_pct)}</span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--pw-tinta)] ml-auto flex-shrink-0" />
              </div>
            </a>
          );
        })()}

        {FEATURE_PARQ_BANNER_CEO && (
        <a
          href="/admin/parq"
          className="block border-l-4 border-[var(--pw-dourado-vivo)] bg-[var(--pw-petroleo)]/5 hover:bg-[var(--pw-petroleo)]/10 transition-colors px-4 py-3 rounded-sm"
          data-testid="banner-ceo-parq"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--pw-dourado-vivo)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--pw-dourado)] font-semibold">
                Autonomia prescritiva preservada
              </div>
              <div className="text-xs text-[var(--pw-tinta)] mt-0.5">
                Parcerias de Qualidade Técnica (PARQ) ativas · auditoria Kaizen bimestral · zero comissão por indicação (CFM 2.386/2024 art. 27)
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--pw-tinta)] flex-shrink-0" />
          </div>
        </a>
        )}

        <div className="flex items-center justify-between">
          <div className="border-l-4 border-[var(--pw-dourado-vivo)] pl-5 py-1">
            <div className="text-[10px] tracking-[0.32em] text-[var(--pw-dourado)] uppercase mb-1">PADCON · Capítulo V</div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--pw-petroleo)] flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Painel de Comando
            </h1>
            <p className="text-sm text-[var(--pw-tinta)] mt-1">
              {isTodasClinicas
                ? "Visão em tempo real de toda a operação clínica"
                : <span>Operação clínica — <span style={{ color: corUnidadeSelecionada || "var(--pw-petroleo)" }} className="font-semibold">{nomeUnidadeSelecionada}</span></span>
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-none border-[var(--pw-petroleo)] text-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo)] hover:text-white"
              onClick={() => {
                const hoje = new Date().toISOString().slice(0, 10);
                const u = unidadeSelecionada ? `&unidadeId=${unidadeSelecionada}` : "";
                window.open(`/api/relatorios/operacional-dia/pdf?data=${hoje}${u}`, "_blank");
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF Operacional do Dia
            </Button>
            <div className="flex items-center gap-2 text-xs text-[var(--pw-tinta)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--pw-dourado-vivo)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--pw-dourado-vivo)]"></span>
              </span>
              Atualizado agora
            </div>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatMini label="Pacientes Ativos" value={resumoGeral.totalPacientes} icon={Users} color="bg-blue-500/10 text-blue-400" />
          <StatMini label="Sessoes Hoje" value={resumoGeral.sessoesHoje} icon={Calendar} color="bg-emerald-500/10 text-emerald-400" />
          <StatMini
            label="Alertas Abertos"
            value={resumoGeral.alertasAbertos}
            icon={AlertTriangle}
            color="bg-red-500/10 text-red-400"
            pulse={resumoGeral.alertasGraves > 0}
          />
          <StatMini label="Substancias em Uso" value={resumoGeral.substanciasEmUso} icon={Pill} color="bg-purple-500/10 text-purple-400" />
        </div>

        {resumoGeral.alertasGraves > 0 && (
          <div className="bg-red-900/20 border border-red-500/40 p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-red-400 font-bold text-sm uppercase tracking-wide">
                {resumoGeral.alertasGraves} Alerta{resumoGeral.alertasGraves > 1 ? 's' : ''} Grave{resumoGeral.alertasGraves > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {alertasDetalhes.filter(a => a.gravidade === "GRAVE").map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs whitespace-nowrap">
                  <span className="font-semibold text-red-300">{a.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                  <span className="text-red-400/70">{TIPO_ALERTA_LABELS[a.tipo] || a.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="visao-geral" className="text-xs">Visao Geral</TabsTrigger>
            <TabsTrigger value="substancias" className="text-xs">Quem usa o que?</TabsTrigger>
            <TabsTrigger value="sessoes" className="text-xs">Sessoes da Semana</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">Alertas Clinicos</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-4 space-y-6">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              <StatMini label="Sessoes Amanha" value={resumoGeral.sessoesAmanha} icon={Clock} color="bg-sky-500/10 text-sky-400" />
              <StatMini label="Sessoes Semana" value={resumoGeral.sessoesSemana} icon={TrendingUp} color="bg-indigo-500/10 text-indigo-400" />
              <StatMini label="Faltas Semana" value={resumoGeral.faltasSemana} icon={XCircle} color="bg-orange-500/10 text-orange-400" />
              <StatMini label="Alertas Graves" value={resumoGeral.alertasGraves} icon={Flame} color="bg-red-500/10 text-red-400" />
              <StatMini label="Concluidas" value={statusSessoes.concluidas} icon={CheckCircle2} color="bg-green-500/10 text-green-400" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Status das Sessoes
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    Top Substancias (pacientes ativos)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={substBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" stroke="#888888" fontSize={11} />
                      <YAxis type="category" dataKey="nome" stroke="#888888" fontSize={10} width={110} tick={{ fill: '#9ca3af' }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        formatter={(value: any, name: string) => [value, name === 'ativos' ? 'Ativos' : 'Pausados']}
                      />
                      <Bar dataKey="ativos" fill="hsl(210, 45%, 65%)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="pausados" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MicroMatriz
                title="Faltas na Ultima Semana"
                icon={XCircle}
                items={faltasDetalhes}
                emptyText="Nenhuma falta registrada"
                renderItem={(f: FaltaDetalhe, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{f.pacienteNome.split(' ').slice(0, 3).join(' ')}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')} - {f.tipo}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              />

              <MicroMatriz
                title="Alertas Clinicos Abertos"
                icon={AlertTriangle}
                items={alertasDetalhes.slice(0, 6)}
                emptyText="Nenhum alerta aberto"
                renderItem={(a: AlertaDetalhe, i) => (
                  <div key={a.id} className={`flex items-start gap-3 p-3 border ${a.gravidade === 'GRAVE' ? 'bg-red-900/10 border-red-500/30' : 'bg-muted/30 border-border/40'} hover:bg-muted/50 transition-colors`}>
                    <div className={`mt-0.5 w-8 h-8 flex items-center justify-center ${a.gravidade === 'GRAVE' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                      {a.gravidade === 'GRAVE' ? <Flame className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{a.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                        <Badge className={`text-[9px] px-1.5 py-0 border ${GRAVIDADE_COLORS[a.gravidade]}`}>
                          {a.gravidade}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{a.descricao}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {TIPO_ALERTA_LABELS[a.tipo] || a.tipo} - {new Date(a.criadoEm).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="substancias" className="mt-4 space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {substanciasResumo.map(s => (
                <div
                  key={s.nome}
                  className={`p-4 bg-card border cursor-pointer transition-all ${
                    selectedSubstancia === s.nome ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'
                  }`}
                  onClick={() => setSelectedSubstancia(selectedSubstancia === s.nome ? null : s.nome)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">{s.nome}</span>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-emerald-400">{s.ativos}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Ativos</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-amber-400">{s.pausados}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Pausados</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-400">{s.pacientesUnicos}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Pacientes</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-muted/50 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(s.ativos / Math.max(s.total, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {selectedSubstancia && (
              <Card className="bg-card border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Detalhes: {selectedSubstancia}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const s = substanciasResumo.find(x => x.nome === selectedSubstancia);
                      if (!s) return null;
                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted/30 border border-border/40 text-center">
                            <div className="text-2xl font-bold text-foreground">{s.pacientesUnicos}</div>
                            <div className="text-[11px] uppercase tracking-wider">Pacientes Unicos</div>
                          </div>
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{s.ativos}</div>
                            <div className="text-[11px] uppercase tracking-wider text-emerald-400/70">Em Uso Ativo</div>
                          </div>
                          <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-center">
                            <div className="text-2xl font-bold text-amber-400">{s.pausados}</div>
                            <div className="text-[11px] uppercase tracking-wider text-amber-400/70">Pausados</div>
                          </div>
                          <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-center">
                            <div className="text-2xl font-bold text-blue-400">{Math.round((s.ativos / Math.max(s.total, 1)) * 100)}%</div>
                            <div className="text-[11px] uppercase tracking-wider text-blue-400/70">Taxa Adesao</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sessoes" className="mt-4 space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
              <StatMini label="Total" value={statusSessoes.total} icon={Calendar} color="bg-blue-500/10 text-blue-400" />
              <StatMini label="Agendadas" value={statusSessoes.agendadas} icon={Clock} color="bg-sky-500/10 text-sky-400" />
              <StatMini label="Concluidas" value={statusSessoes.concluidas} icon={CheckCircle2} color="bg-green-500/10 text-green-400" />
              <StatMini label="Faltas" value={statusSessoes.faltas} icon={XCircle} color="bg-red-500/10 text-red-400" />
              <StatMini label="Canceladas" value={statusSessoes.canceladas} icon={XCircle} color="bg-zinc-500/10 text-zinc-400" />
            </div>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Sessoes dos Ultimos 7 Dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 py-2">
                    <span>Paciente</span>
                    <span>Data</span>
                    <span>Tipo</span>
                    <span>Status</span>
                  </div>
                  {sessoesUltimaSemana.map((s, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                      <span className="text-sm font-medium truncate">{s.pacienteNome.split(' ').slice(0, 2).join(' ')}</span>
                      <span className="text-xs text-muted-foreground">{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <Badge variant="outline" className="text-[10px] w-fit">{s.tipo}</Badge>
                      <Badge className={`text-[10px] w-fit ${STATUS_SESSAO_COLORS[s.status] || 'bg-muted'}`}>
                        {s.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4 space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 mb-4">
              <StatMini label="Total Abertos" value={resumoGeral.alertasAbertos} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
              <StatMini label="Graves" value={resumoGeral.alertasGraves} icon={Flame} color="bg-red-500/10 text-red-400" pulse={resumoGeral.alertasGraves > 0} />
              <StatMini label="Moderados" value={alertasDetalhes.filter(a => a.gravidade === "MODERADO").length} icon={Eye} color="bg-amber-500/10 text-amber-400" />
            </div>

            <div className="space-y-3">
              {alertasDetalhes.map(a => (
                <div key={a.id} className={`p-4 border transition-all ${
                  a.gravidade === 'GRAVE'
                    ? 'bg-red-900/15 border-red-500/40 hover:border-red-500/60'
                    : a.gravidade === 'MODERADO'
                    ? 'bg-amber-900/10 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-card border-border/50 hover:border-border'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 ${a.gravidade === 'GRAVE' ? 'bg-red-500/20' : a.gravidade === 'MODERADO' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                      {a.gravidade === 'GRAVE' ? <Flame className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{a.pacienteNome}</span>
                        <Badge className={`text-[10px] px-2 py-0 border ${GRAVIDADE_COLORS[a.gravidade]}`}>
                          {a.gravidade}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-2 py-0">
                          {TIPO_ALERTA_LABELS[a.tipo] || a.tipo}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.descricao}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-2">
                        Registrado em {new Date(a.criadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}