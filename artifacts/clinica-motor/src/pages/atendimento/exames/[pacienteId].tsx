// EXAMES-2 · Modo Médico (denso, atalhos teclado, todos os pirulitos)
// /atendimento/exames/:pacienteId
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Activity, AlertTriangle, ShieldAlert, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Search, FlaskConical, Eye, Maximize2,
  Stethoscope, Sparkles, ChevronRight, Filter, RefreshCw, Heart,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { PAWARDS } from "@/lib/pawards-tokens";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

// ---------- tipos ----------
type Cor = "VERDE" | "AMARELO" | "ALERTA" | "VERMELHO";
type Sparkline = Array<{ data: string; valor: number }>;

type ExameDash = {
  id: number;
  nome_exame: string;
  categoria: string | null;
  unidade: string | null;
  codigo_semantico_v4: string | null;
  prg_codigo: string | null;
  analito_grupo: string | null;
  valor: number;
  data_coleta: string | null;
  laboratorio: string | null;
  faixa_critica_max: number | null;
  faixa_baixa_max: number | null;
  faixa_media_max: number | null;
  faixa_superior_max: number | null;
  valor_minimo_lab: number | null;
  valor_maximo_lab: number | null;
  direcao_favoravel: "SUPERIOR" | "INFERIOR" | "MEDIO";
  zona_idx: number;
  zona_slug: string;
  nome_zona: string;
  cor_final: Cor;
  posicao_pct: number;
  observacao_clinica: string | null;
  tendencia: string | null;
  delta_percentual: number | null;
  sparkline: Sparkline;
};

type DashResp = {
  pacienteId: number;
  semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO";
  resumo: { verdes: number; amarelos: number; alertas: number; vermelhos: number; total: number };
  exames: ExameDash[];
  meta: { zonas_oficiais: string[]; cores: string[]; nomenclatura_caio: string };
};

// ---------- helpers ----------
const COR_HEX: Record<Cor, string> = {
  VERDE: PAWARDS.colors.status.good,
  AMARELO: PAWARDS.colors.status.mid,
  ALERTA: PAWARDS.colors.status.warning,
  VERMELHO: PAWARDS.colors.status.critical,
};
const COR_BG: Record<Cor, string> = {
  VERDE: "rgba(52,199,89,0.12)",
  AMARELO: "rgba(255,159,10,0.12)",
  ALERTA: "rgba(255,179,64,0.14)",
  VERMELHO: "rgba(255,59,48,0.14)",
};

function fmtData(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}
function fmtValor(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
}

// Régua 5 zonas com bolinha indicando posição
function ReguaZonas({ exame }: { exame: ExameDash }) {
  // Stops em %: 0 (faixa_critica_max) | 33 (baixa) | 66 (media) | 100 (superior)
  // Adiciona zonas extras de alerta antes de 0% e atenção depois de 100% (fora visual)
  const stops = [
    { pct: 0, label: "min" },
    { pct: 33.33, label: "" },
    { pct: 66.66, label: "" },
    { pct: 100, label: "max" },
  ];
  const pos = Math.max(-5, Math.min(105, exame.posicao_pct));
  const cor = COR_HEX[exame.cor_final];

  // Cor de fundo de cada terço conforme direção
  const dir = exame.direcao_favoravel;
  const bgInf = dir === "INFERIOR" ? PAWARDS.colors.status.good : dir === "SUPERIOR" ? PAWARDS.colors.status.mid : PAWARDS.colors.gold[500];
  const bgMed = PAWARDS.colors.gold[700];
  const bgSup = dir === "SUPERIOR" ? PAWARDS.colors.status.good : dir === "INFERIOR" ? PAWARDS.colors.status.warning : PAWARDS.colors.gold[500];

  return (
    <div className="relative w-full">
      <div className="flex w-full h-2.5 rounded-full overflow-hidden">
        <div className="flex-1" style={{ background: bgInf, opacity: 0.6 }} />
        <div className="flex-1" style={{ background: bgMed, opacity: 0.5 }} />
        <div className="flex-1" style={{ background: bgSup, opacity: 0.6 }} />
      </div>
      {/* Marcadores 0/33/66/100 */}
      {stops.map((s, i) => (
        <div key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${s.pct}%` }}>
          <div className="w-px h-3.5" style={{ background: "rgba(255,255,255,0.25)" }} />
          {s.label && (
            <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: PAWARDS.colors.text.muted }}>
              {s.label}
            </div>
          )}
        </div>
      ))}
      {/* Bolinha indicador */}
      <div
        className="absolute -top-1 -translate-x-1/2 transition-all duration-700"
        style={{ left: `${pos}%` }}
      >
        <div
          className="w-4 h-4 rounded-full ring-2 ring-white/20 shadow-lg"
          style={{ background: cor, boxShadow: `0 0 12px ${cor}` }}
        />
      </div>
    </div>
  );
}

// Mini sparkline 6 meses
function MiniSparkline({ data, cor }: { data: Sparkline; cor: string }) {
  if (!data || data.length < 2) {
    return <div className="text-[10px]" style={{ color: PAWARDS.colors.text.muted }}>sem histórico</div>;
  }
  return (
    <div style={{ width: "100%", height: 36 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={2} dot={false} />
          <Tooltip
            contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11 }}
            labelFormatter={fmtData}
            formatter={(v: number) => [fmtValor(v), "Valor"]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Velocímetro radial pequeno (modo médico)
function VelocimetroMini({ pct, cor }: { pct: number; cor: string }) {
  const data = [{ name: "v", value: Math.max(0, Math.min(100, pct)), fill: cor }];
  return (
    <div style={{ width: 56, height: 56 }} className="relative">
      <ResponsiveContainer>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color: cor }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function TendenciaIcone({ delta }: { delta: number | null }) {
  if (delta == null) return <Minus className="w-3.5 h-3.5" style={{ color: PAWARDS.colors.text.muted }} />;
  if (delta > 1) return <TrendingUp className="w-3.5 h-3.5" style={{ color: PAWARDS.colors.status.warning }} />;
  if (delta < -1) return <TrendingDown className="w-3.5 h-3.5" style={{ color: PAWARDS.colors.status.good }} />;
  return <Minus className="w-3.5 h-3.5" style={{ color: PAWARDS.colors.text.tertiary }} />;
}

// ---------- página ----------
export default function ExamesDashboardMedico() {
  const [, params] = useRoute("/atendimento/exames/:pacienteId");
  const pacienteId = params?.pacienteId ? Number(params.pacienteId) : 0;
  const [, setLocation] = useLocation();

  const [dash, setDash] = useState<DashResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [ordenar, setOrdenar] = useState<"prioridade" | "nome" | "data">("prioridade");
  const [exameFoco, setExameFoco] = useState<ExameDash | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const carregar = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/pacientes/${pacienteId}/exames/dashboard`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setDash(j);
      setErro(null);
    } catch (e: any) {
      setErro(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => { carregar(); }, [carregar, refreshKey]);

  // Atalhos teclado: V = vitrine | R = refresh | / = busca | ESC = fecha modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "v" || e.key === "V") setLocation(`/atendimento/exames/${pacienteId}/vitrine`);
      if (e.key === "r" || e.key === "R") setRefreshKey(k => k + 1);
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("busca-exame")?.focus();
      }
      if (e.key === "Escape") setExameFoco(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pacienteId, setLocation]);

  const exames = dash?.exames || [];
  const categorias = useMemo(() => {
    const s = new Set<string>();
    exames.forEach(e => e.categoria && s.add(e.categoria));
    return Array.from(s).sort();
  }, [exames]);

  const filtrados = useMemo(() => {
    let arr = [...exames];
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      arr = arr.filter(e =>
        e.nome_exame.toLowerCase().includes(q) ||
        (e.codigo_semantico_v4 || "").toLowerCase().includes(q),
      );
    }
    if (filtroCategoria !== "todas") {
      arr = arr.filter(e => e.categoria === filtroCategoria);
    }
    if (ordenar === "nome") arr.sort((a, b) => a.nome_exame.localeCompare(b.nome_exame));
    else if (ordenar === "data") arr.sort((a, b) => (b.data_coleta || "").localeCompare(a.data_coleta || ""));
    else {
      // prioridade: vermelho > alerta > amarelo > verde
      const peso: Record<Cor, number> = { VERMELHO: 0, ALERTA: 1, AMARELO: 2, VERDE: 3 };
      arr.sort((a, b) => peso[a.cor_final] - peso[b.cor_final]);
    }
    return arr;
  }, [exames, busca, filtroCategoria, ordenar]);

  const resumo = dash?.resumo || { verdes: 0, amarelos: 0, alertas: 0, vermelhos: 0, total: 0 };

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: PAWARDS.colors.bg[950], color: PAWARDS.colors.text.primary }}>
        {/* HEADER */}
        <div className="sticky top-0 z-20 border-b backdrop-blur-md"
          style={{ background: "rgba(2,4,6,0.85)", borderColor: PAWARDS.colors.gold[700] }}>
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
            <Link href={`/pacientes/${pacienteId}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                <ArrowLeft className="w-4 h-4 mr-1" /> Paciente
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" style={{ color: PAWARDS.colors.gold[500] }} />
                <h1 className="text-lg font-bold tracking-tight">EXAMES — Painel Clínico 5 Zonas</h1>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: PAWARDS.colors.gold[700], color: PAWARDS.colors.gold[300] }}>
                  Paciente #{pacienteId}
                </Badge>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: PAWARDS.colors.text.tertiary }}>
                Modo médico · atalhos: <kbd className="px-1 rounded bg-white/10">V</kbd> vitrine ·{" "}
                <kbd className="px-1 rounded bg-white/10">/</kbd> busca ·{" "}
                <kbd className="px-1 rounded bg-white/10">R</kbd> recarrega
              </div>
            </div>

            {/* Semáforo Geral grande */}
            {dash && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg border"
                style={{ background: COR_BG[dash.semaforoGeral as Cor], borderColor: COR_HEX[dash.semaforoGeral as Cor] }}>
                <Heart className="w-5 h-5" style={{ color: COR_HEX[dash.semaforoGeral as Cor] }} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Estado Geral</div>
                  <div className="text-sm font-bold" style={{ color: COR_HEX[dash.semaforoGeral as Cor] }}>
                    {dash.semaforoGeral}
                  </div>
                </div>
              </div>
            )}

            <Button
              size="sm"
              className="font-bold"
              style={{ background: PAWARDS.colors.gold[500], color: PAWARDS.colors.bg[950] }}
              onClick={() => setLocation(`/atendimento/exames/${pacienteId}/vitrine`)}
            >
              <Maximize2 className="w-4 h-4 mr-1" /> Modo Vitrine
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {/* KPIs topo: 4 contadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Excelente", n: resumo.verdes, cor: COR_HEX.VERDE, icon: CheckCircle2 },
              { label: "Aceitável", n: resumo.amarelos, cor: COR_HEX.AMARELO, icon: Activity },
              { label: "Alerta/Atenção", n: resumo.alertas, cor: COR_HEX.ALERTA, icon: ShieldAlert },
              { label: "Crítico (limite)", n: resumo.vermelhos, cor: COR_HEX.VERMELHO, icon: AlertTriangle },
            ].map((k, i) => (
              <div key={i} className="rounded-lg border p-4 flex items-center gap-3"
                style={{ background: PAWARDS.colors.bg.panel, borderColor: k.cor + "55" }}>
                <k.icon className="w-7 h-7" style={{ color: k.cor }} />
                <div>
                  <div className="text-3xl font-bold tabular-nums" style={{ color: k.cor }}>{k.n}</div>
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: PAWARDS.colors.text.secondary }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: PAWARDS.colors.text.muted }} />
              <Input
                id="busca-exame"
                placeholder="Buscar por nome ou código V4…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
                style={{ background: PAWARDS.colors.bg.panel, borderColor: PAWARDS.colors.gold[700] }}
              />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[180px]" style={{ background: PAWARDS.colors.bg.panel }}>
                <Filter className="w-4 h-4 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ordenar} onValueChange={(v: any) => setOrdenar(v)}>
              <SelectTrigger className="w-[170px]" style={{ background: PAWARDS.colors.bg.panel }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridade">⚡ Prioridade clínica</SelectItem>
                <SelectItem value="nome">A→Z</SelectItem>
                <SelectItem value="data">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs" style={{ color: PAWARDS.colors.text.tertiary }}>
              {filtrados.length} de {exames.length} exames
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <Card className="mb-4 border-red-500/50">
              <CardContent className="p-4 text-sm text-red-400">
                Erro ao carregar dashboard: {erro}
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && !dash && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg h-48 animate-pulse" style={{ background: PAWARDS.colors.bg.panel }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filtrados.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center" style={{ color: PAWARDS.colors.text.tertiary }}>
                <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Nenhum exame encontrado pra este filtro.
              </CardContent>
            </Card>
          )}

          {/* GRID DE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrados.map(ex => {
              const cor = COR_HEX[ex.cor_final];
              return (
                <div
                  key={ex.id}
                  className="rounded-lg border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${PAWARDS.colors.bg.panel} 0%, ${PAWARDS.colors.bg[850]} 100%)`,
                    borderColor: cor + "44",
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3)`,
                  }}
                  onClick={() => setExameFoco(ex)}
                >
                  {/* Header card */}
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm font-bold uppercase tracking-tight truncate">{ex.nome_exame}</h3>
                        {ex.codigo_semantico_v4 && (
                          <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: PAWARDS.colors.gold[500] }} />
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: PAWARDS.colors.text.muted }}>
                        {ex.categoria || ex.analito_grupo || "—"} · {fmtData(ex.data_coleta)}
                      </div>
                    </div>
                    <Badge
                      className="text-[10px] font-bold flex-shrink-0"
                      style={{ background: cor + "22", color: cor, border: `1px solid ${cor}55` }}
                    >
                      {ex.nome_zona}
                    </Badge>
                  </div>

                  {/* Valor + Velocímetro */}
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-3xl font-bold tabular-nums" style={{ color: cor }}>
                        {fmtValor(ex.valor)}
                        <span className="text-xs ml-1" style={{ color: PAWARDS.colors.text.tertiary }}>
                          {ex.unidade}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TendenciaIcone delta={ex.delta_percentual} />
                        <span className="text-[10px]" style={{ color: PAWARDS.colors.text.secondary }}>
                          {ex.delta_percentual != null ? `${ex.delta_percentual > 0 ? "+" : ""}${ex.delta_percentual.toFixed(1)}%` : "1ª medição"}
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: PAWARDS.colors.text.muted }}>
                          ref: {fmtValor(ex.valor_minimo_lab ?? 0)}–{fmtValor(ex.valor_maximo_lab ?? 0)}
                        </span>
                      </div>
                    </div>
                    <VelocimetroMini pct={ex.posicao_pct} cor={cor} />
                  </div>

                  {/* Régua 5 zonas */}
                  <div className="px-4 pb-1 pt-3">
                    <ReguaZonas exame={ex} />
                  </div>

                  {/* Sparkline 6m */}
                  <div className="px-4 pb-3 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-wider" style={{ color: PAWARDS.colors.text.muted }}>
                        Histórico 6 meses
                      </span>
                      <span className="text-[9px]" style={{ color: PAWARDS.colors.text.muted }}>
                        {ex.sparkline.length} pontos
                      </span>
                    </div>
                    <MiniSparkline data={ex.sparkline} cor={cor} />
                  </div>

                  {/* Footer ações */}
                  <div className="px-4 pb-3 flex items-center justify-between border-t pt-2"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[10px]" style={{ color: PAWARDS.colors.text.muted }}>
                      {ex.direcao_favoravel === "SUPERIOR" ? "↑ ALTO bom" : ex.direcao_favoravel === "INFERIOR" ? "↓ BAIXO bom" : "↔ MÉDIO bom"}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                      <Stethoscope className="w-3 h-3" /> Script <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL: foco em 1 exame com script clínico completo */}
        <Dialog open={!!exameFoco} onOpenChange={o => !o && setExameFoco(null)}>
          <DialogContent className="max-w-2xl" style={{ background: PAWARDS.colors.bg[900], borderColor: PAWARDS.colors.gold[700] }}>
            {exameFoco && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" style={{ color: PAWARDS.colors.gold[500] }} />
                    {exameFoco.nome_exame}
                    <Badge className="ml-auto" style={{ background: COR_HEX[exameFoco.cor_final] + "22", color: COR_HEX[exameFoco.cor_final] }}>
                      {exameFoco.nome_zona}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded border" style={{ borderColor: PAWARDS.colors.gold[700] + "44" }}>
                      <div className="text-[10px] uppercase opacity-60">Valor</div>
                      <div className="text-2xl font-bold" style={{ color: COR_HEX[exameFoco.cor_final] }}>
                        {fmtValor(exameFoco.valor)} <span className="text-xs">{exameFoco.unidade}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: PAWARDS.colors.gold[700] + "44" }}>
                      <div className="text-[10px] uppercase opacity-60">Posição na faixa</div>
                      <div className="text-2xl font-bold" style={{ color: PAWARDS.colors.gold[300] }}>{Math.round(exameFoco.posicao_pct)}%</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: PAWARDS.colors.gold[700] + "44" }}>
                      <div className="text-[10px] uppercase opacity-60">Tendência</div>
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        <TendenciaIcone delta={exameFoco.delta_percentual} />
                        {exameFoco.delta_percentual != null ? `${exameFoco.delta_percentual > 0 ? "+" : ""}${exameFoco.delta_percentual.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <ReguaZonas exame={exameFoco} />
                  </div>
                  <div style={{ height: 140 }}>
                    <MiniSparkline data={exameFoco.sparkline} cor={COR_HEX[exameFoco.cor_final]} />
                  </div>
                  {exameFoco.observacao_clinica && (
                    <div className="p-4 rounded border-l-4" style={{ borderColor: PAWARDS.colors.gold[500], background: "rgba(200,155,60,0.06)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: PAWARDS.colors.gold[300] }}>
                        Script Clínico
                      </div>
                      <div className="text-sm leading-relaxed" style={{ color: PAWARDS.colors.text.primary }}>
                        {exameFoco.observacao_clinica}
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] grid grid-cols-2 gap-2" style={{ color: PAWARDS.colors.text.muted }}>
                    <div>Código V4: {exameFoco.codigo_semantico_v4 || "—"}</div>
                    <div>PRG: {exameFoco.prg_codigo || "—"}</div>
                    <div>Lab: {exameFoco.laboratorio || "—"}</div>
                    <div>Coletado: {fmtData(exameFoco.data_coleta)}</div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
