// EXAMES-2 · Modo Vitrine Paciente (fullscreen, fonte XL, animado, linguagem humana)
// /atendimento/exames/:pacienteId/vitrine
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Play, Pause, Heart, Sparkles,
  TrendingUp, TrendingDown, Minus, FlaskConical, Volume2,
} from "lucide-react";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, Tooltip,
} from "recharts";
import { PAWARDS } from "@/lib/pawards-tokens";
import { Button } from "@/components/ui/button";

type Cor = "VERDE" | "AMARELO" | "ALERTA" | "VERMELHO";
type Sparkline = Array<{ data: string; valor: number }>;
type ExameDash = {
  id: number;
  nome_exame: string;
  unidade: string | null;
  valor: number;
  data_coleta: string | null;
  faixa_critica_max: number | null;
  faixa_superior_max: number | null;
  valor_minimo_lab: number | null;
  valor_maximo_lab: number | null;
  direcao_favoravel: "SUPERIOR" | "INFERIOR" | "MEDIO";
  zona_idx: number;
  nome_zona: string;
  cor_final: Cor;
  posicao_pct: number;
  observacao_clinica: string | null;
  delta_percentual: number | null;
  sparkline: Sparkline;
  categoria: string | null;
  analito_grupo: string | null;
};
type DashResp = {
  pacienteId: number;
  semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO";
  resumo: { verdes: number; amarelos: number; alertas: number; vermelhos: number; total: number };
  exames: ExameDash[];
};

const COR_HEX: Record<Cor, string> = {
  VERDE: PAWARDS.colors.status.good,
  AMARELO: PAWARDS.colors.status.mid,
  ALERTA: PAWARDS.colors.status.warning,
  VERMELHO: PAWARDS.colors.status.critical,
};

// Tradução humana sem jargão por nome de zona + direção
function traduzirHumano(ex: ExameDash): { titulo: string; subtitulo: string; emoji: string } {
  const n = ex.nome_exame;
  const z = ex.nome_zona.toUpperCase();
  if (z === "EXCELENTE") return { titulo: `Seu ${n} está ÓTIMO`, subtitulo: "Continue assim. Esse resultado mostra equilíbrio.", emoji: "✨" };
  if (z === "ACEITAVEL" || z === "ACEITÁVEL") return { titulo: `Seu ${n} está dentro da média`, subtitulo: "Tem espaço pra melhorar, mas nada urgente.", emoji: "👍" };
  if (z === "RUIM") return { titulo: `Seu ${n} pode melhorar`, subtitulo: "O Dr. Caio vai propor ajustes pra te trazer pra zona ótima.", emoji: "🎯" };
  if (z === "ALERTA") return { titulo: `Seu ${n} chamou atenção`, subtitulo: "Está abaixo do mínimo de referência. Vamos conversar sobre isso.", emoji: "🔔" };
  if (z === "ATENCAO" || z === "ATENÇÃO") return { titulo: `Seu ${n} chamou atenção`, subtitulo: "Está acima do máximo de referência. Vamos conversar sobre isso.", emoji: "🔔" };
  return { titulo: n, subtitulo: "", emoji: "•" };
}

function fmtData(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtValor(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
}

// Velocímetro XL (semicírculo)
function VelocimetroXL({ pct, cor }: { pct: number; cor: string }) {
  const data = [{ name: "v", value: Math.max(0, Math.min(100, pct)), fill: cor }];
  return (
    <div className="relative" style={{ width: 280, height: 280 }}>
      <ResponsiveContainer>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "rgba(255,255,255,0.05)" }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-6xl font-black tabular-nums" style={{ color: cor, textShadow: `0 0 30px ${cor}88` }}>
          {Math.round(pct)}
        </div>
        <div className="text-sm uppercase tracking-widest mt-1" style={{ color: PAWARDS.colors.text.secondary }}>
          posição na faixa
        </div>
      </div>
    </div>
  );
}

// Régua horizontal grande com bolinha animada
function ReguaXL({ ex }: { ex: ExameDash }) {
  const dir = ex.direcao_favoravel;
  const bgInf = dir === "INFERIOR" ? PAWARDS.colors.status.good : dir === "SUPERIOR" ? PAWARDS.colors.status.mid : PAWARDS.colors.gold[500];
  const bgMed = PAWARDS.colors.gold[700];
  const bgSup = dir === "SUPERIOR" ? PAWARDS.colors.status.good : dir === "INFERIOR" ? PAWARDS.colors.status.warning : PAWARDS.colors.gold[500];
  const cor = COR_HEX[ex.cor_final];
  const pos = Math.max(-3, Math.min(103, ex.posicao_pct));

  return (
    <div className="w-full">
      <div className="relative w-full">
        <div className="flex w-full h-6 rounded-full overflow-hidden">
          <div className="flex-1" style={{ background: bgInf, opacity: 0.7 }} />
          <div className="flex-1" style={{ background: bgMed, opacity: 0.5 }} />
          <div className="flex-1" style={{ background: bgSup, opacity: 0.7 }} />
        </div>
        {/* Marcadores 0/33/66/100 */}
        {[0, 33.33, 66.66, 100].map((p, i) => (
          <div key={i} className="absolute top-0 -translate-x-1/2 w-px h-7" style={{ left: `${p}%`, background: "rgba(255,255,255,0.3)" }} />
        ))}
        {/* Bolinha indicador */}
        <motion.div
          className="absolute -top-2 -translate-x-1/2"
          initial={{ scale: 0, left: "50%" }}
          animate={{ scale: 1, left: `${pos}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.3 }}
        >
          <div className="w-10 h-10 rounded-full ring-4 ring-white/20"
            style={{ background: cor, boxShadow: `0 0 30px ${cor}, 0 0 60px ${cor}66` }} />
        </motion.div>
      </div>
      <div className="flex justify-between mt-3 text-xs uppercase tracking-widest" style={{ color: PAWARDS.colors.text.muted }}>
        <span>↓ {fmtValor(ex.valor_minimo_lab ?? 0)}</span>
        <span>{fmtValor(ex.valor_maximo_lab ?? 0)} ↑</span>
      </div>
    </div>
  );
}

function SparklineXL({ data, cor }: { data: Sparkline; cor: string }) {
  if (!data || data.length < 2) return null;
  return (
    <div style={{ width: "100%", height: 100 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="valor" stroke={cor} strokeWidth={3} fill="url(#g)" />
          <Tooltip
            contentStyle={{ background: "#0B1018", border: `1px solid ${cor}`, fontSize: 12 }}
            labelFormatter={fmtData} formatter={(v: number) => [fmtValor(v), "Valor"]}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ExamesVitrinePaciente() {
  const [, params] = useRoute("/atendimento/exames/:pacienteId/vitrine");
  const pacienteId = params?.pacienteId ? Number(params.pacienteId) : 0;
  const [, setLocation] = useLocation();

  const [dash, setDash] = useState<DashResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;
    setLoading(true);
    fetch(`/api/pacientes/${pacienteId}/exames/dashboard`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { setDash(j); setErro(null); })
      .catch(e => setErro(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [pacienteId]);

  // Ordem de prioridade: alerta primeiro pra paciente saber o que importa
  const exames = useMemo(() => {
    if (!dash) return [];
    const peso: Record<Cor, number> = { VERMELHO: 0, ALERTA: 1, AMARELO: 2, VERDE: 3 };
    return [...dash.exames].sort((a, b) => peso[a.cor_final] - peso[b.cor_final]);
  }, [dash]);

  const ex = exames[idx];

  const proximo = useCallback(() => setIdx(i => (exames.length ? (i + 1) % exames.length : 0)), [exames.length]);
  const anterior = useCallback(() => setIdx(i => (exames.length ? (i - 1 + exames.length) % exames.length : 0)), [exames.length]);

  // Autoplay 8s
  useEffect(() => {
    if (!autoplay || exames.length < 2) return;
    const t = setInterval(proximo, 8000);
    return () => clearInterval(t);
  }, [autoplay, proximo, exames.length, idx]);

  // Atalhos: ←/→ navega, espaço pause, ESC sai
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") proximo();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === " ") { e.preventDefault(); setAutoplay(v => !v); }
      if (e.key === "Escape") setLocation(`/atendimento/exames/${pacienteId}`);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [proximo, anterior, pacienteId, setLocation]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: PAWARDS.colors.bg[950] }}>
        <div className="animate-pulse text-2xl" style={{ color: PAWARDS.colors.gold[500] }}>Carregando seus exames…</div>
      </div>
    );
  }
  if (erro) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: PAWARDS.colors.bg[950] }}>
        <div className="text-xl text-red-400">Erro: {erro}</div>
        <Button onClick={() => setLocation(`/atendimento/exames/${pacienteId}`)}>Voltar</Button>
      </div>
    );
  }
  if (!ex) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: PAWARDS.colors.bg[950], color: PAWARDS.colors.text.primary }}>
        <FlaskConical className="w-16 h-16 opacity-30" />
        <div className="text-2xl">Sem exames cadastrados ainda.</div>
        <Button onClick={() => setLocation(`/atendimento/exames/${pacienteId}`)}>Voltar</Button>
      </div>
    );
  }

  const cor = COR_HEX[ex.cor_final];
  const trad = traduzirHumano(ex);
  const semGeral = dash?.semaforoGeral || "VERDE";
  const corGeral = COR_HEX[semGeral as Cor];

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col"
      style={{
        background: `radial-gradient(ellipse at top, ${PAWARDS.colors.bg[850]} 0%, ${PAWARDS.colors.bg[950]} 60%)`,
        color: PAWARDS.colors.text.primary,
      }}
    >
      {/* HEADER MINIMAL */}
      <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: PAWARDS.colors.gold[700] + "33" }}>
        <div className="flex items-center gap-3">
          <Sparkles className="w-7 h-7" style={{ color: PAWARDS.colors.gold[500] }} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: PAWARDS.colors.text.tertiary }}>
              PAWARDS MEDCORE
            </div>
            <div className="text-xl font-bold" style={{ color: PAWARDS.colors.gold[300] }}>
              Seus Exames · Vitrine Paciente
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-2 rounded-full"
          style={{ background: corGeral + "15", border: `2px solid ${corGeral}55` }}>
          <Heart className="w-5 h-5" style={{ color: corGeral }} />
          <div className="text-sm font-bold uppercase tracking-wider" style={{ color: corGeral }}>
            Estado Geral: {semGeral}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => setLocation(`/atendimento/exames/${pacienteId}`)}
          className="text-sm"
        >
          <X className="w-5 h-5 mr-1" /> Sair (ESC)
        </Button>
      </div>

      {/* CORPO */}
      <div className="flex-1 overflow-hidden flex items-center justify-center px-8 py-6 relative">
        {/* Botão anterior */}
        <button
          onClick={anterior}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-10"
          style={{ background: PAWARDS.colors.bg.panel, border: `2px solid ${PAWARDS.colors.gold[700]}` }}
        >
          <ChevronLeft className="w-7 h-7" style={{ color: PAWARDS.colors.gold[300] }} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {/* COLUNA ESQUERDA: velocímetro + valor */}
            <div className="flex flex-col items-center gap-4">
              <VelocimetroXL pct={ex.posicao_pct} cor={cor} />
              <div className="text-center">
                <div className="text-7xl font-black tabular-nums" style={{ color: cor, textShadow: `0 0 40px ${cor}55` }}>
                  {fmtValor(ex.valor)}
                </div>
                <div className="text-xl mt-1" style={{ color: PAWARDS.colors.text.secondary }}>
                  {ex.unidade || ""}
                </div>
              </div>
              <div
                className="px-8 py-3 rounded-full text-2xl font-black uppercase tracking-wider"
                style={{ background: cor + "22", color: cor, border: `2px solid ${cor}` }}
              >
                {trad.emoji} {ex.nome_zona}
              </div>
            </div>

            {/* COLUNA DIREITA: nome do exame + tradução humana + régua + sparkline */}
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: PAWARDS.colors.text.tertiary }}>
                  {ex.categoria || ex.analito_grupo || "Exame"}
                </div>
                <h2 className="text-5xl font-black leading-tight" style={{ color: PAWARDS.colors.text.primary }}>
                  {ex.nome_exame}
                </h2>
                <div className="text-sm mt-2" style={{ color: PAWARDS.colors.text.muted }}>
                  Coletado em {fmtData(ex.data_coleta)}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl border-l-4"
                style={{ borderColor: cor, background: `linear-gradient(135deg, ${cor}11 0%, transparent 100%)` }}
              >
                <div className="text-3xl font-bold mb-2" style={{ color: cor }}>{trad.titulo}</div>
                <div className="text-lg" style={{ color: PAWARDS.colors.text.secondary }}>{trad.subtitulo}</div>
              </motion.div>

              <div>
                <div className="text-xs uppercase tracking-widest mb-3" style={{ color: PAWARDS.colors.text.tertiary }}>
                  Onde você está na faixa de referência
                </div>
                <ReguaXL ex={ex} />
              </div>

              {ex.sparkline.length >= 2 && (
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2 flex items-center justify-between" style={{ color: PAWARDS.colors.text.tertiary }}>
                    <span>Sua evolução nos últimos 6 meses</span>
                    {ex.delta_percentual != null && (
                      <span className="flex items-center gap-1 text-base font-bold" style={{ color: cor }}>
                        {ex.delta_percentual > 1 ? <TrendingUp className="w-4 h-4" /> :
                          ex.delta_percentual < -1 ? <TrendingDown className="w-4 h-4" /> :
                            <Minus className="w-4 h-4" />}
                        {ex.delta_percentual > 0 ? "+" : ""}{ex.delta_percentual.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <SparklineXL data={ex.sparkline} cor={cor} />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={proximo}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-10"
          style={{ background: PAWARDS.colors.bg.panel, border: `2px solid ${PAWARDS.colors.gold[700]}` }}
        >
          <ChevronRight className="w-7 h-7" style={{ color: PAWARDS.colors.gold[300] }} />
        </button>
      </div>

      {/* FOOTER: progresso + autoplay */}
      <div className="border-t px-8 py-4 flex items-center justify-between gap-6"
        style={{ borderColor: PAWARDS.colors.gold[700] + "33", background: "rgba(0,0,0,0.3)" }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAutoplay(v => !v)}>
            {autoplay ? <><Pause className="w-4 h-4 mr-1" /> Pausar</> : <><Play className="w-4 h-4 mr-1" /> Auto</>}
          </Button>
          <span className="text-xs" style={{ color: PAWARDS.colors.text.muted }}>
            ← → navega · ESPAÇO pausa · ESC sai
          </span>
        </div>

        {/* Pirulitos: 1 bolinha por exame, brilha o ativo */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-2xl">
          {exames.map((e, i) => {
            const c = COR_HEX[e.cor_final];
            return (
              <button
                key={e.id}
                onClick={() => setIdx(i)}
                className="transition-all hover:scale-125"
                title={e.nome_exame}
                style={{
                  width: i === idx ? 24 : 10,
                  height: 10,
                  borderRadius: 999,
                  background: c,
                  opacity: i === idx ? 1 : 0.45,
                  boxShadow: i === idx ? `0 0 12px ${c}` : "none",
                }}
              />
            );
          })}
        </div>

        <div className="text-sm tabular-nums" style={{ color: PAWARDS.colors.text.secondary }}>
          {idx + 1} <span style={{ color: PAWARDS.colors.text.muted }}>/ {exames.length}</span>
        </div>
      </div>
    </div>
  );
}
