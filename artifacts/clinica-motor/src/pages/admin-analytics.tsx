import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import {
  RefreshCw, TrendingUp, TrendingDown, Award, AlertTriangle, FileDown,
  BarChart3, LineChart as LineIcon, Grid, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, LineChart, Line, ReferenceDot,
} from "recharts";

// ════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════
type Cor = "excelente" | "bom" | "atencao" | "critico" | "neutro";
type SparkPonto = { ano_mes: string; fat: number };

type RankingItem = {
  unidade_id: number; nome: string; tipo_unidade: string;
  faturamento: { periodo_a: number; periodo_b: number; variacao_abs_brl: number; variacao_pct: number | null; cor: Cor };
  receitas:    { periodo_a: number; periodo_b: number; variacao_abs: number;     variacao_pct: number | null; cor: Cor };
  pacientes:   { periodo_a: number; periodo_b: number; variacao_abs: number;     variacao_pct: number | null; cor: Cor };
  sparkline_faturamento: SparkPonto[];
};

type CrescimentoResp = {
  periodo_a: string; periodo_b: string;
  consolidado: { faturamento_a: number; faturamento_b: number; variacao_abs_brl: number; variacao_pct: number | null; cor: Cor };
  ranking: RankingItem[];
};

type MatrizItem = {
  unidade_id: number; nome: string; tipo_unidade: string;
  faturamento_brl: number; comissao_brl: number; receitas_count: number;
  pacientes_unicos: number; ticket_medio_brl: number;
  posicao_ranking: number; percentil: number;
  heatmap_cor: "ouro" | "verde" | "amarelo" | "vermelho";
  origem: string;
};

type TendenciaPonto = {
  ano_mes: string; faturamento_brl: number; receitas_count: number;
  pacientes_unicos: number; ticket_medio_brl: number;
  variacao_pct: number | null; eh_pico: boolean; eh_vale: boolean;
};

type TendenciaResp = {
  unidade_id: number; pontos: TendenciaPonto[];
  pico: { ano_mes: string; valor: number } | null;
  vale: { ano_mes: string; valor: number } | null;
  crescimento_periodo_pct: number | null;
  crescimento_periodo_cor: Cor;
  narrativa: string;
};

// ════════════════════════════════════════════════════════════════════
// PALETA PAWARDS (alinhada aos 2 PDFs aprovados)
// ════════════════════════════════════════════════════════════════════
const NAVY = "#020406";
const NAVY_SOFT = "#0a1420";
const GOLD = "#C89B3C";
const GOLD_SOFT = "#8a6a25";

const COR_HEX: Record<Cor | "ouro" | "verde" | "amarelo" | "vermelho", string> = {
  excelente: "#2f8f4a", ouro: GOLD,
  bom:       "#3274b8", verde: "#2f8f4a",
  atencao:   "#c98a1f", amarelo: "#c98a1f",
  critico:   "#b53030", vermelho: "#b53030",
  neutro:    "#71717a",
};

const COR_BG: Record<Cor, string> = {
  excelente: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  bom:       "bg-blue-500/15 text-blue-300 border-blue-500/40",
  atencao:   "bg-amber-500/15 text-amber-300 border-amber-500/40",
  critico:   "bg-red-500/15 text-red-300 border-red-500/40",
  neutro:    "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
};

const COR_LABEL: Record<Cor, string> = {
  excelente: "EXCELENTE",
  bom:       "BOM",
  atencao:   "ATENÇÃO",
  critico:   "CRÍTICO",
  neutro:    "NEUTRO",
};

const fmtBRL = (n: number) => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const fmtBRLcurto = (n: number) => {
  if (n >= 1e6) return "R$ " + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "R$ " + (n / 1e3).toFixed(0) + "k";
  return fmtBRL(n);
};
const fmtPct = (n: number | null) => n === null ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

// ════════════════════════════════════════════════════════════════════
// COMPONENTES VISUAIS auxiliares (banner, secao, topico, legenda)
// ════════════════════════════════════════════════════════════════════
function BannerPawards({ titulo, periodo, hash }: { titulo: string; periodo: string; hash: string }) {
  return (
    <div style={{ backgroundColor: NAVY }} className="relative overflow-hidden rounded-lg border border-amber-700/40">
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />
      <div className="px-6 py-5 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-bold tracking-[0.2em]" style={{ color: GOLD }}>
            PAWARDS  MEDCORE
          </div>
          <div className="text-[10px] mt-0.5 text-amber-100/60">
            Sistema de Excelência Médica · Dr. Caio Pádua · ceo@pawards.com.br
          </div>
          <h1 className="text-xl font-bold text-amber-50 mt-3">{titulo}</h1>
          <div className="text-[11px] mt-1 font-mono text-amber-200/70 tracking-wider">
            PERÍODO: {periodo}
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-amber-100/40 max-w-[240px]">
          DOCUMENTO AUDITÁVEL<br />
          hash: {hash}
        </div>
      </div>
    </div>
  );
}

function CartaoSecao({ icone, titulo, children, descricao }: { icone: React.ReactNode; titulo: string; children: React.ReactNode; descricao?: string }) {
  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
      <header className="px-5 py-3 border-b border-zinc-800 flex items-start gap-3" style={{ backgroundColor: NAVY_SOFT }}>
        <div className="mt-0.5" style={{ color: GOLD }}>{icone}</div>
        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: GOLD }}>{titulo}</h3>
          {descricao && <p className="text-[11px] text-amber-100/50 mt-0.5">{descricao}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Topico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[12px] font-bold mb-1" style={{ color: GOLD }}>— {titulo}</div>
      <div className="text-[12px] text-zinc-300 leading-relaxed pl-3 border-l border-zinc-800">{children}</div>
    </div>
  );
}

function LegendaSemantica() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-[10px] text-zinc-500 pt-2 border-t border-zinc-800 mt-4">
      <span className="font-bold" style={{ color: GOLD }}>LEGENDA SEMÂNTICA:</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_HEX.excelente }} /> EXCELENTE ≥ +10%</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_HEX.bom }} /> BOM 0% a +10%</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_HEX.atencao }} /> ATENÇÃO -10% a 0%</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_HEX.critico }} /> CRÍTICO &lt; -10%</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 1 · CrescimentoBarChart (barras agrupadas A vs B)
// ════════════════════════════════════════════════════════════════════
function CrescimentoBarChart({ ranking, periodoA, periodoB }: { ranking: RankingItem[]; periodoA: string; periodoB: string }) {
  const data = ranking.map(r => ({
    nome: r.nome.replace(/INSTITUTO\s+/i, "").slice(0, 14),
    [periodoA]: r.faturamento.periodo_a,
    [periodoB]: r.faturamento.periodo_b,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="nome" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={fmtBRLcurto} />
        <Tooltip
          contentStyle={{ backgroundColor: NAVY_SOFT, border: `1px solid ${GOLD_SOFT}`, borderRadius: 6 }}
          formatter={(v: any) => fmtBRL(Number(v))}
        />
        <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }} />
        <Bar dataKey={periodoA} fill="#71717a" />
        <Bar dataKey={periodoB} fill={GOLD} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 2 · MatrizComparativoClinicas (heatmap por percentil)
// ════════════════════════════════════════════════════════════════════
function MatrizComparativoClinicas({ matriz, onClick }: { matriz: MatrizItem[]; onClick: (id: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {matriz.map(m => {
        const cor = COR_HEX[m.heatmap_cor];
        return (
          <button
            key={m.unidade_id}
            onClick={() => onClick(m.unidade_id)}
            style={{ borderLeftColor: cor, borderLeftWidth: 4, backgroundColor: cor + "08" }}
            className="text-left bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 rounded p-3 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-zinc-100 text-sm">{m.nome}</div>
                <div className="text-[10px] text-zinc-500">{m.tipo_unidade} · #{m.posicao_ranking} no ranking</div>
              </div>
              <span style={{ backgroundColor: cor + "33", color: cor }} className="text-[10px] font-mono px-2 py-0.5 rounded">
                P{m.percentil}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-zinc-500">Faturamento</div>
                <div className="font-mono font-bold" style={{ color: GOLD }}>{fmtBRLcurto(m.faturamento_brl)}</div>
              </div>
              <div>
                <div className="text-zinc-500">Receitas</div>
                <div className="text-zinc-300 font-mono">{m.receitas_count}</div>
              </div>
              <div>
                <div className="text-zinc-500">Pacientes</div>
                <div className="text-zinc-300 font-mono">{m.pacientes_unicos}</div>
              </div>
              <div>
                <div className="text-zinc-500">Ticket médio</div>
                <div className="text-zinc-300 font-mono">{fmtBRLcurto(m.ticket_medio_brl)}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 3 · TendenciaLineChart (drill-down de 1 unidade)
// ════════════════════════════════════════════════════════════════════
function TendenciaLineChart({ tendencia, nomeClinica }: { tendencia: TendenciaResp | null; nomeClinica: string }) {
  if (!tendencia) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <LineIcon size={32} className="mx-auto mb-2 opacity-50" />
        Clique numa clínica acima pra ver a tendência dela.
      </div>
    );
  }
  const data = tendencia.pontos.map(p => ({ mes: p.ano_mes, fat: p.faturamento_brl }));
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-300 italic flex-1">{tendencia.narrativa}</p>
        <span className={`px-3 py-1 rounded text-xs font-mono border ${COR_BG[tendencia.crescimento_periodo_cor]}`}>
          Período: {fmtPct(tendencia.crescimento_periodo_pct)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="mes" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={fmtBRLcurto} />
          <Tooltip
            contentStyle={{ backgroundColor: NAVY_SOFT, border: `1px solid ${GOLD_SOFT}`, borderRadius: 6 }}
            formatter={(v: any) => fmtBRL(Number(v))}
          />
          <Line type="monotone" dataKey="fat" stroke={GOLD} strokeWidth={2} dot={{ r: 4 }} />
          {tendencia.pico && <ReferenceDot x={tendencia.pico.ano_mes} y={tendencia.pico.valor} r={7} fill={COR_HEX.excelente} stroke="#fff" label={{ value: "PICO", position: "top", fill: COR_HEX.excelente, fontSize: 10 }} />}
          {tendencia.vale && <ReferenceDot x={tendencia.vale.ano_mes} y={tendencia.vale.valor} r={7} fill={COR_HEX.critico} stroke="#fff" label={{ value: "VALE", position: "bottom", fill: COR_HEX.critico, fontSize: 10 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 4 · SparklineVariacao (mini grafico inline)
// ════════════════════════════════════════════════════════════════════
function SparklineVariacao({ pontos, cor, w = 80, h = 30 }: { pontos: SparkPonto[]; cor: Cor; w?: number; h?: number }) {
  if (!pontos || pontos.length === 0) return <div className="text-xs text-zinc-600">—</div>;
  const ordenados = [...pontos].sort((a, b) => a.ano_mes.localeCompare(b.ano_mes));
  return (
    <div style={{ width: w, height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={ordenados}>
          <Line type="monotone" dataKey="fat" stroke={COR_HEX[cor]} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL · /admin/analytics
// ════════════════════════════════════════════════════════════════════
export default function AdminAnalytics() {
  const [crescimento, setCrescimento] = useState<CrescimentoResp | null>(null);
  const [matriz, setMatriz] = useState<MatrizItem[]>([]);
  const [matrizMes, setMatrizMes] = useState<string>("");
  const [tendencia, setTendencia] = useState<TendenciaResp | null>(null);
  const [unidadeFoco, setUnidadeFoco] = useState<{ id: number; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/admin/analytics/crescimento-clinicas", { credentials: "include" }),
      fetch("/api/admin/analytics/produtos-comparativo", { credentials: "include" }),
    ]);
    if (r1.ok) setCrescimento(await r1.json());
    if (r2.ok) {
      const data = await r2.json();
      setMatriz(data.matriz ?? []);
      setMatrizMes(data.ano_mes ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function clicarClinica(unidadeId: number) {
    const m = matriz.find(x => x.unidade_id === unidadeId);
    const nome = m?.nome ?? crescimento?.ranking.find(r => r.unidade_id === unidadeId)?.nome ?? "";
    setUnidadeFoco({ id: unidadeId, nome });
    const r = await fetch(`/api/admin/analytics/tendencia-produto?unidade_id=${unidadeId}&meses=12`, { credentials: "include" });
    if (r.ok) setTendencia(await r.json());
  }

  async function baixarPdfRedeMensal() {
    if (!crescimento) return;
    setBaixandoPdf(true);
    try {
      const url = `/api/admin/relatorios/rede-mensal.pdf?periodo_a=${crescimento.periodo_a}&periodo_b=${crescimento.periodo_b}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) {
        // fallback: usa window.print (que ja eh disparado pelo BotaoImprimirFlutuante)
        window.print();
        return;
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pawards_rede_mensal_${crescimento.periodo_b}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBaixandoPdf(false);
    }
  }

  // Hash de auditoria deterministico baseado em payload (defensivo se faltar dado)
  const hashAuditoria = useMemo(() => {
    const seed = JSON.stringify({
      pa: crescimento?.periodo_a,
      pb: crescimento?.periodo_b,
      consol: crescimento?.consolidado,
      matrizMes,
      qtdUnidades: crescimento?.ranking.length,
    });
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16).padStart(8, "0") + "-" + (crescimento?.periodo_b ?? "0000-00").replace("-", "");
  }, [crescimento, matrizMes]);

  if (loading) return <Layout><div className="p-8 text-zinc-500">Carregando analytics...</div></Layout>;
  if (!crescimento) return <Layout><div className="p-8 text-red-400">Erro ao carregar dados.</div></Layout>;

  const c = crescimento.consolidado;
  const Icon = c.variacao_pct === null ? Minus : c.variacao_pct >= 0 ? ArrowUpRight : ArrowDownRight;
  const sparkAgg = crescimento.ranking
    .flatMap(r => r.sparkline_faturamento ?? [])
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.ano_mes] = (acc[p.ano_mes] ?? 0) + p.fat;
      return acc;
    }, {});
  const sparkConsolArr: SparkPonto[] = Object.entries(sparkAgg)
    .map(([ano_mes, fat]) => ({ ano_mes, fat }))
    .sort((a, b) => a.ano_mes.localeCompare(b.ano_mes));

  const liderCrescimento = [...crescimento.ranking].sort((a, b) =>
    (b.faturamento.variacao_pct ?? -999) - (a.faturamento.variacao_pct ?? -999)
  )[0];
  const piorCrescimento = [...crescimento.ranking].sort((a, b) =>
    (a.faturamento.variacao_pct ?? 999) - (b.faturamento.variacao_pct ?? 999)
  )[0];

  return (
    <Layout>
      <BotaoImprimirFlutuante titulo={`Analytics Multiplanar · ${crescimento.periodo_a} → ${crescimento.periodo_b}`} />
      <div className="p-6 max-w-[1600px] mx-auto space-y-5">

        {/* BANNER PAWARDS (igual cabecalho dos PDFs aprovados) */}
        <BannerPawards
          titulo="Analytics Multiplanar — Dashboard CEO"
          periodo={`${crescimento.periodo_a} → ${crescimento.periodo_b}`}
          hash={hashAuditoria}
        />

        {/* Acoes (recarregar + baixar PDF server-side) */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400 max-w-2xl">
            Filosofia <b className="text-amber-300">Mike Tyson × Éder Jofre</b>: o que importa é a <b>EVOLUÇÃO</b>,
            não o número absoluto. Nenhum número aparece sem variação % + cor + mini-gráfico.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void baixarPdfRedeMensal()}
              disabled={baixandoPdf}
              className="px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: GOLD, color: NAVY }}
              data-testid="button-baixar-pdf-rede"
            >
              <FileDown size={14} /> {baixandoPdf ? "Gerando…" : "Baixar PDF (rede)"}
            </button>
            <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-2">
              <RefreshCw size={14} /> Recarregar
            </button>
          </div>
        </div>

        {/* SECAO 1 · CONSOLIDADO + SPARKLINE 6M */}
        <CartaoSecao
          icone={<Award size={18} />}
          titulo="Consolidado da rede"
          descricao={`${crescimento.periodo_a} → ${crescimento.periodo_b} · KPI principal NUNCA isolado`}
        >
          <div className={`rounded-lg p-5 border ${COR_BG[c.cor]}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-3xl font-bold mt-1 flex items-center gap-2">
                  <Icon size={28} />
                  {fmtBRL(c.faturamento_b)}
                </div>
                <div className="text-sm opacity-80 mt-1">
                  anterior: <b>{fmtBRL(c.faturamento_a)}</b>
                  · variação: <b>{fmtBRL(c.variacao_abs_brl)}</b>
                  · <b>{fmtPct(c.variacao_pct)}</b>
                  · status: <b>{COR_LABEL[c.cor]}</b>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase opacity-80 font-mono mb-1 text-right">tendência 6M</div>
                <SparklineVariacao pontos={sparkConsolArr} cor={c.cor} w={180} h={50} />
              </div>
            </div>
          </div>
          <Topico titulo="O que esse número está te dizendo">
            A rede saiu de <b style={{ color: GOLD }}>{fmtBRL(c.faturamento_a)}</b> em {crescimento.periodo_a} para
            <b style={{ color: GOLD }}> {fmtBRL(c.faturamento_b)}</b> em {crescimento.periodo_b}, variação
            <b style={{ color: COR_HEX[c.cor] }}> {fmtPct(c.variacao_pct)}</b>. A tendência 6M mostra a
            direção do golpe — o eixo é a EVOLUÇÃO, não o número absoluto.
          </Topico>
          <LegendaSemantica />
        </CartaoSecao>

        {/* SECAO 2 · BARRAS COMPARATIVAS */}
        <CartaoSecao
          icone={<BarChart3 size={18} />}
          titulo={`Faturamento por clínica · ${crescimento.periodo_a} vs ${crescimento.periodo_b}`}
          descricao="Cada clínica tem 2 barras: cinza = período anterior, dourada = período atual"
        >
          <CrescimentoBarChart ranking={crescimento.ranking} periodoA={crescimento.periodo_a} periodoB={crescimento.periodo_b} />
          <Topico titulo={`Líder de crescimento: ${liderCrescimento?.nome ?? "—"}`}>
            {liderCrescimento && (
              <>
                Saiu de <b>{fmtBRL(liderCrescimento.faturamento.periodo_a)}</b> para
                <b> {fmtBRL(liderCrescimento.faturamento.periodo_b)}</b>, variação
                <b style={{ color: COR_HEX[liderCrescimento.faturamento.cor] }}> {fmtPct(liderCrescimento.faturamento.variacao_pct)}</b>
                ({COR_LABEL[liderCrescimento.faturamento.cor]}).
                {(liderCrescimento.faturamento.variacao_pct ?? 0) >= 10 &&
                  " Estilo Éder Jofre: golpes precisos, crescimento consistente."}
              </>
            )}
          </Topico>
          <Topico titulo={`Maior atenção: ${piorCrescimento?.nome ?? "—"}`}>
            {piorCrescimento && (
              <>
                Saiu de <b>{fmtBRL(piorCrescimento.faturamento.periodo_a)}</b> para
                <b> {fmtBRL(piorCrescimento.faturamento.periodo_b)}</b>, variação
                <b style={{ color: COR_HEX[piorCrescimento.faturamento.cor] }}> {fmtPct(piorCrescimento.faturamento.variacao_pct)}</b>
                ({COR_LABEL[piorCrescimento.faturamento.cor]}).
                {(piorCrescimento.faturamento.variacao_pct ?? 0) < -10 &&
                  " Recomendação: chamar gestor da unidade antes de virar problema estrutural."}
              </>
            )}
          </Topico>
        </CartaoSecao>

        {/* SECAO 3 · MATRIZ HEATMAP */}
        <CartaoSecao
          icone={<Grid size={18} />}
          titulo={`Matriz de performance · ${matrizMes}`}
          descricao="Cards coloridos por percentil. Clique em qualquer um para abrir o drill-down de 12 meses."
        >
          <MatrizComparativoClinicas matriz={matriz} onClick={clicarClinica} />
          <Topico titulo="Como ler esta matriz">
            Cada card é uma clínica posicionada por <b>percentil</b> (P0 a P100) dentro do mês {matrizMes}.
            <b style={{ color: COR_HEX.ouro }}> Ouro</b> = top 10%,
            <b style={{ color: COR_HEX.verde }}> Verde</b> = top 50%,
            <b style={{ color: COR_HEX.amarelo }}> Amarelo</b> = bottom 50%,
            <b style={{ color: COR_HEX.vermelho }}> Vermelho</b> = bottom 10%. O bloco lateral colorido é
            o sinal visual rápido — útil para varredura TDAH/TOC sem precisar ler todos os números.
          </Topico>
        </CartaoSecao>

        {/* SECAO 4 · TENDENCIA DRILL-DOWN */}
        <CartaoSecao
          icone={<LineIcon size={18} />}
          titulo={`Tendência 12M · ${unidadeFoco?.nome ?? "selecione uma clínica"}`}
          descricao="Linha temporal com pico (verde) e vale (vermelho) marcados automaticamente"
        >
          <TendenciaLineChart tendencia={tendencia} nomeClinica={unidadeFoco?.nome ?? ""} />
          {tendencia && (
            <Topico titulo="Como interpretar pico e vale">
              O ponto <b style={{ color: COR_HEX.excelente }}>verde PICO</b> mostra o melhor mês da série — referência
              de teto possível. O <b style={{ color: COR_HEX.critico }}>vermelho VALE</b> mostra o pior — referência
              de fundo do poço. A diferença entre eles é a <b>amplitude operacional</b> da clínica:
              quanto maior, mais oscilante o negócio. Clínicas amplitude pequena = previsíveis = menor risco.
            </Topico>
          )}
        </CartaoSecao>

        {/* SECAO 5 · TABELA RANKING COM SPARKLINES */}
        <CartaoSecao
          icone={<Award size={18} />}
          titulo="Ranking detalhado · sparklines de evolução 6M"
          descricao="Tabela exaustiva. Clique numa linha pra abrir o drill-down acima."
        >
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-300">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Clínica</th>
                  <th className="text-right px-3 py-2">{crescimento.periodo_a}</th>
                  <th className="text-right px-3 py-2">{crescimento.periodo_b}</th>
                  <th className="text-center px-3 py-2">Variação</th>
                  <th className="text-center px-3 py-2">Tendência 6M</th>
                  <th className="text-center px-3 py-2">Receitas Δ</th>
                  <th className="text-center px-3 py-2">Pacientes Δ</th>
                </tr>
              </thead>
              <tbody>
                {crescimento.ranking.map((r, idx) => (
                  <tr key={r.unidade_id} className="border-t border-zinc-800 hover:bg-zinc-800/30 cursor-pointer" onClick={() => void clicarClinica(r.unidade_id)} data-testid={`row-ranking-${r.unidade_id}`}>
                    <td className="px-3 py-2 text-zinc-500 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-zinc-100">{r.nome}</div>
                      <div className="text-[10px] text-zinc-500">{r.tipo_unidade}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400">{fmtBRLcurto(r.faturamento.periodo_a)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: GOLD }}>{fmtBRLcurto(r.faturamento.periodo_b)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${COR_BG[r.faturamento.cor]}`}>
                        {fmtPct(r.faturamento.variacao_pct)}
                      </span>
                      <div className="text-[10px] text-zinc-500 mt-1">{fmtBRLcurto(r.faturamento.variacao_abs_brl)}</div>
                    </td>
                    <td className="px-3 py-2"><div className="flex justify-center"><SparklineVariacao pontos={r.sparkline_faturamento} cor={r.faturamento.cor} /></div></td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${COR_BG[r.receitas.cor]}`}>
                        {fmtPct(r.receitas.variacao_pct)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${COR_BG[r.pacientes.cor]}`}>
                        {fmtPct(r.pacientes.variacao_pct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CartaoSecao>

        {/* RODAPE */}
        <footer className="text-[10px] text-zinc-500 pt-4 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <b style={{ color: GOLD }}>PAWARDS MEDCORE</b> · Documento auditável · hash: <span className="font-mono">{hashAuditoria}</span>
          </div>
          <div>
            <b style={{ color: GOLD }}>REGRA-OURO</b>: nenhum número absoluto isolado · sempre acompanhado de variação_abs · variação_pct · cor · sparkline
          </div>
        </footer>
      </div>
    </Layout>
  );
}
