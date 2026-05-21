import { useState, useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, Cell, Scatter,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Check } from "lucide-react";

const BLACK = "#000000";
const PANEL = "#0A0A0A";
const HAIRLINE = "#1A1A1A";
const GOLD = "#D4AF37";
const CYAN = "#5EE6E6";
const INK = "#E5E7EB";
const MUTED = "#9CA3AF";
const VERDE = "#10B981";
const AMARELO = "#F59E0B";
const VERMELHO = "#EF4444";

type Ponto = { data: string; valor: number; classificacao: "VERDE" | "AMARELO" | "VERMELHO" };
type Exame = {
  nome: string;
  unidade: string;
  min: number;
  max: number;
  categoria: string;
  pontos: Ponto[];
  narrativa: string;
};

const DAYANA: Exame[] = [
  {
    nome: "Ferritina",
    unidade: "ng/mL",
    min: 30, max: 300,
    categoria: "FERRO",
    pontos: [
      { data: "15/jan", valor: 45, classificacao: "VERDE" },
      { data: "20/fev", valor: 22, classificacao: "AMARELO" },
      { data: "05/abr", valor: 8,  classificacao: "VERMELHO" },
    ],
    narrativa: "Queda acelerada — anemia ferropriva instalando. Indicar reposição EV.",
  },
  {
    nome: "Vitamina D (25-OH)",
    unidade: "ng/mL",
    min: 30, max: 100,
    categoria: "HORMÔNIOS",
    pontos: [
      { data: "15/jan", valor: 18, classificacao: "VERMELHO" },
      { data: "20/fev", valor: 32, classificacao: "VERDE" },
      { data: "05/abr", valor: 58, classificacao: "VERDE" },
    ],
    narrativa: "Reposição funcionando — saiu do vermelho em 2 meses. Manter dose atual.",
  },
  {
    nome: "TSH",
    unidade: "mUI/L",
    min: 0.4, max: 4.5,
    categoria: "HORMÔNIOS",
    pontos: [
      { data: "15/jan", valor: 6.2, classificacao: "VERMELHO" },
      { data: "20/fev", valor: 4.8, classificacao: "AMARELO" },
      { data: "05/abr", valor: 3.1, classificacao: "VERDE" },
    ],
    narrativa: "Hipotireoidismo subclínico controlando. Reavaliar em 90 dias.",
  },
  {
    nome: "Triglicerídeos",
    unidade: "mg/dL",
    min: 0, max: 150,
    categoria: "LIPÍDICO",
    pontos: [
      { data: "15/jan", valor: 188, classificacao: "VERMELHO" },
      { data: "20/fev", valor: 162, classificacao: "AMARELO" },
      { data: "05/abr", valor: 140, classificacao: "VERDE" },
    ],
    narrativa: "Saiu do vermelho com dieta + ômega. Continuar protocolo.",
  },
  {
    nome: "Colesterol Total",
    unidade: "mg/dL",
    min: 100, max: 200,
    categoria: "LIPÍDICO",
    pontos: [
      { data: "15/jan", valor: 210, classificacao: "VERMELHO" },
      { data: "20/fev", valor: 225, classificacao: "VERMELHO" },
      { data: "11/abr", valor: 235, classificacao: "VERMELHO" },
    ],
    narrativa: "Subindo — revisar estatina e adesão à dieta low-carb.",
  },
  {
    nome: "Hemoglobina",
    unidade: "g/dL",
    min: 12, max: 17,
    categoria: "SANGUE",
    pontos: [
      { data: "15/jan", valor: 11.8, classificacao: "AMARELO" },
      { data: "20/fev", valor: 12.1, classificacao: "VERDE" },
      { data: "11/abr", valor: 12.5, classificacao: "VERDE" },
    ],
    narrativa: "Reagindo positivamente à reposição de ferro EV.",
  },
];

const corClassif = (c: string) =>
  c === "VERDE" ? VERDE : c === "AMARELO" ? AMARELO : VERMELHO;

const tendencia = (pontos: Ponto[]) => {
  if (pontos.length < 2) return { dir: "estavel" as const, delta: 0 };
  const primeiro = pontos[0].valor;
  const ultimo = pontos[pontos.length - 1].valor;
  const delta = ((ultimo - primeiro) / primeiro) * 100;
  if (Math.abs(delta) < 3) return { dir: "estavel" as const, delta };
  return { dir: delta > 0 ? ("subindo" as const) : ("descendo" as const), delta };
};

function GraficoExame({ exame }: { exame: Exame }) {
  const t = tendencia(exame.pontos);
  const yMin = Math.min(exame.min, ...exame.pontos.map(p => p.valor)) * 0.85;
  const yMax = Math.max(exame.max, ...exame.pontos.map(p => p.valor)) * 1.1;
  const ultimo = exame.pontos[exame.pontos.length - 1];
  const TIcon = t.dir === "subindo" ? TrendingUp : t.dir === "descendo" ? TrendingDown : Minus;
  const tCor = ultimo.classificacao === "VERDE" ? VERDE : ultimo.classificacao === "AMARELO" ? AMARELO : VERMELHO;

  return (
    <div
      className="flex flex-col"
      style={{
        background: PANEL,
        borderTop: `2px solid ${corClassif(ultimo.classificacao)}`,
        borderLeft: `1px solid ${HAIRLINE}`,
        borderRight: `1px solid ${HAIRLINE}`,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {exame.categoria}
            </span>
            <span
              className="w-1 h-1 rotate-45"
              style={{ background: GOLD }}
            />
            <span
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {exame.unidade}
            </span>
          </div>
          <h3
            className="text-[15px] font-bold uppercase tracking-[0.1em] mt-1"
            style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {exame.nome}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Último
            </div>
            <div
              className="text-[22px] font-bold leading-none mt-0.5"
              style={{ color: tCor, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {ultimo.valor}
            </div>
          </div>
          <div
            className="flex items-center justify-center w-9 h-9"
            style={{ background: `${tCor}1A`, border: `1px solid ${tCor}66` }}
          >
            <TIcon className="w-4 h-4" style={{ color: tCor }} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="px-2 py-3" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={exame.pontos} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={HAIRLINE} vertical={false} />

            {/* Zona NORMAL (verde) */}
            <ReferenceArea y1={exame.min} y2={exame.max} fill={VERDE} fillOpacity={0.06} stroke="none" />
            <ReferenceLine y={exame.min} stroke={`${VERDE}66`} strokeDasharray="3 3" />
            <ReferenceLine y={exame.max} stroke={`${VERDE}66`} strokeDasharray="3 3" />

            <XAxis
              dataKey="data"
              stroke={MUTED}
              tick={{ fill: MUTED, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={{ stroke: HAIRLINE }}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke={MUTED}
              tick={{ fill: MUTED, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={{ stroke: HAIRLINE }}
              width={52}
              tickFormatter={(v: number) => {
                if (Math.abs(v) >= 100) return Math.round(v).toString();
                if (Math.abs(v) >= 10) return v.toFixed(0);
                return v.toFixed(1);
              }}
            />
            <Tooltip
              contentStyle={{
                background: BLACK,
                border: `1px solid ${GOLD}`,
                borderRadius: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: INK,
              }}
              cursor={{ stroke: CYAN, strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={CYAN}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter dataKey="valor" isAnimationActive={false}>
              {exame.pontos.map((p, i) => (
                <Cell key={i} fill={corClassif(p.classificacao)} stroke={INK} strokeWidth={1.5} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* NARRATIVA + REF RANGE */}
      <div className="px-4 py-3 flex items-start gap-3" style={{ borderTop: `1px solid ${HAIRLINE}`, background: BLACK }}>
        <div
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center"
          style={{ background: `${tCor}1A`, border: `1px solid ${tCor}66` }}
        >
          {ultimo.classificacao === "VERMELHO"
            ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: tCor }} strokeWidth={2} />
            : ultimo.classificacao === "AMARELO"
              ? <Activity className="w-3.5 h-3.5" style={{ color: tCor }} strokeWidth={2} />
              : <Check className="w-3.5 h-3.5" style={{ color: tCor }} strokeWidth={2.4} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] uppercase tracking-[0.3em] font-bold"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Ref. {exame.min}–{exame.max} {exame.unidade}
            </span>
            <span style={{ color: HAIRLINE }}>|</span>
            <span
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: t.delta >= 0 ? VERDE : VERMELHO, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Δ {t.delta > 0 ? "+" : ""}{t.delta.toFixed(1)}%
            </span>
          </div>
          <p
            className="text-[11.5px] leading-snug italic"
            style={{ color: INK, fontFamily: "Georgia, serif" }}
          >
            {exame.narrativa}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PreviewExamesGrafico() {
  const [filtro, setFiltro] = useState<"TODOS" | "VERDE" | "AMARELO" | "VERMELHO">("TODOS");
  const exames = useMemo(() => {
    if (filtro === "TODOS") return DAYANA;
    return DAYANA.filter(e => e.pontos[e.pontos.length - 1].classificacao === filtro);
  }, [filtro]);

  const stats = useMemo(() => ({
    total: DAYANA.length,
    verde: DAYANA.filter(e => e.pontos[e.pontos.length - 1].classificacao === "VERDE").length,
    amarelo: DAYANA.filter(e => e.pontos[e.pontos.length - 1].classificacao === "AMARELO").length,
    vermelho: DAYANA.filter(e => e.pontos[e.pontos.length - 1].classificacao === "VERMELHO").length,
  }), []);

  return (
    <div className="min-h-screen" style={{ background: BLACK, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* HEADER PACIENTE */}
      <header
        className="px-8 py-5 flex items-center justify-between"
        style={{ background: PANEL, borderBottom: `1px solid ${GOLD}33` }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center text-[18px] font-bold"
            style={{ background: `${GOLD}1A`, border: `1px solid ${GOLD}66`, color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
          >
            DL
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.35em] font-bold"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Paciente · ID 1
            </div>
            <h1
              className="text-[18px] font-bold uppercase tracking-[0.1em] mt-0.5"
              style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Dayana Ludman Alves Caldas da Silva
            </h1>
            <div
              className="text-[10px] uppercase tracking-[0.25em] mt-0.5"
              style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Pádua · Feminino · 1997
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Linha do Tempo
            </div>
            <div
              className="text-[12px] font-bold uppercase tracking-[0.2em]"
              style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
            >
              15/jan/26 → 11/abr/26
            </div>
          </div>
          <div className="w-px h-10" style={{ background: HAIRLINE }} />
          <div
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ background: GOLD, color: BLACK, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Gerar PDF
          </div>
        </div>
      </header>

      {/* RESUMO + FILTROS */}
      <div
        className="grid grid-cols-4 px-8 py-4 gap-px"
        style={{ background: HAIRLINE, borderBottom: `1px solid ${HAIRLINE}` }}
      >
        {[
          { label: "Exames acompanhados", val: stats.total, cor: GOLD, k: "TODOS" as const },
          { label: "Em zona ideal", val: stats.verde, cor: VERDE, k: "VERDE" as const },
          { label: "Em atenção", val: stats.amarelo, cor: AMARELO, k: "AMARELO" as const },
          { label: "Críticos", val: stats.vermelho, cor: VERMELHO, k: "VERMELHO" as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFiltro(s.k)}
            className="flex items-center gap-4 px-5 py-3 text-left transition-all"
            style={{
              background: filtro === s.k ? `${s.cor}14` : PANEL,
              borderLeft: `3px solid ${filtro === s.k ? s.cor : "transparent"}`,
            }}
          >
            <div
              className="text-[32px] font-bold leading-none"
              style={{ color: s.cor, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {s.val}
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-bold"
              style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* GRID DE EXAMES — 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-8">
        {exames.map(e => (
          <GraficoExame key={e.nome} exame={e} />
        ))}
      </div>

      {/* RODAPÉ */}
      <footer
        className="px-8 py-4 flex items-center justify-between"
        style={{ background: PANEL, borderTop: `1px solid ${GOLD}33` }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.35em] font-bold"
          style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Pawards MedCore<sup>®</sup> <span style={{ color: MUTED }}>· Clinical Intelligence System</span>
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Preview · Dados Demonstrativos
        </span>
      </footer>
    </div>
  );
}
