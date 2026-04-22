import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import {
  RefreshCw, TrendingUp, TrendingDown, Award, AlertTriangle,
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
// HELPERS UI (cor, formato BR)
// ════════════════════════════════════════════════════════════════════
const COR_HEX: Record<Cor | "ouro" | "verde" | "amarelo" | "vermelho", string> = {
  excelente: "#10b981", ouro: "#C89B3C",
  bom:       "#3b82f6", verde: "#10b981",
  atencao:   "#f59e0b", amarelo: "#f59e0b",
  critico:   "#ef4444", vermelho: "#ef4444",
  neutro:    "#71717a",
};

const COR_BG: Record<Cor, string> = {
  excelente: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  bom:       "bg-blue-500/20 text-blue-300 border-blue-500/40",
  atencao:   "bg-amber-500/20 text-amber-300 border-amber-500/40",
  critico:   "bg-red-500/20 text-red-300 border-red-500/40",
  neutro:    "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

const fmtBRL = (n: number) => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const fmtBRLcurto = (n: number) => {
  if (n >= 1e6) return "R$ " + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "R$ " + (n / 1e3).toFixed(0) + "k";
  return fmtBRL(n);
};
const fmtPct = (n: number | null) => n === null ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

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
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={18} className="text-amber-400" />
        <h3 className="text-amber-400 font-semibold">Faturamento por clínica · {periodoA} vs {periodoB}</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="nome" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={fmtBRLcurto} />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 6 }}
            formatter={(v: any) => fmtBRL(Number(v))}
          />
          <Legend wrapperStyle={{ color: "#a1a1aa" }} />
          <Bar dataKey={periodoA} fill="#71717a" />
          <Bar dataKey={periodoB} fill="#C89B3C" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 2 · MatrizComparativoClinicas (heatmap por percentil)
// ════════════════════════════════════════════════════════════════════
function MatrizComparativoClinicas({ matriz, anoMes, onClick }: { matriz: MatrizItem[]; anoMes: string; onClick: (id: number) => void }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Grid size={18} className="text-amber-400" />
        <h3 className="text-amber-400 font-semibold">Matriz de performance · {anoMes}</h3>
        <span className="text-xs text-zinc-500 ml-2">(clique numa clínica pra ver tendência)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {matriz.map(m => {
          const cor = COR_HEX[m.heatmap_cor];
          return (
            <button
              key={m.unidade_id}
              onClick={() => onClick(m.unidade_id)}
              style={{ borderLeftColor: cor, borderLeftWidth: 4 }}
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
                  <div className="text-amber-300 font-mono font-bold">{fmtBRLcurto(m.faturamento_brl)}</div>
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
              <div className="text-[9px] text-zinc-600 mt-2 italic">origem: {m.origem}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 3 · TendenciaLineChart (drill-down de 1 unidade, com pico/vale)
// ════════════════════════════════════════════════════════════════════
function TendenciaLineChart({ tendencia, nomeClinica }: { tendencia: TendenciaResp | null; nomeClinica: string }) {
  if (!tendencia) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
        <LineIcon size={32} className="mx-auto mb-2 opacity-50" />
        Clique numa clínica acima pra ver a tendência dela.
      </div>
    );
  }
  const data = tendencia.pontos.map(p => ({
    mes: p.ano_mes, fat: p.faturamento_brl, eh_pico: p.eh_pico, eh_vale: p.eh_vale,
  }));
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-amber-400 font-semibold flex items-center gap-2">
            <LineIcon size={18} /> Tendência · {nomeClinica}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">{tendencia.narrativa}</p>
        </div>
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
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 6 }}
            formatter={(v: any) => fmtBRL(Number(v))}
          />
          <Line type="monotone" dataKey="fat" stroke="#C89B3C" strokeWidth={2} dot={{ r: 4 }} />
          {tendencia.pico && <ReferenceDot x={tendencia.pico.ano_mes} y={tendencia.pico.valor} r={7} fill="#10b981" stroke="#fff" label={{ value: "PICO", position: "top", fill: "#10b981", fontSize: 10 }} />}
          {tendencia.vale && <ReferenceDot x={tendencia.vale.ano_mes} y={tendencia.vale.valor} r={7} fill="#ef4444" stroke="#fff" label={{ value: "VALE", position: "bottom", fill: "#ef4444", fontSize: 10 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPONENTE 4 · SparklineVariacao (mini gráfico inline pra tabela)
// ════════════════════════════════════════════════════════════════════
function SparklineVariacao({ pontos, cor }: { pontos: SparkPonto[]; cor: Cor }) {
  if (!pontos || pontos.length === 0) return <div className="text-xs text-zinc-600">—</div>;
  const ordenados = [...pontos].sort((a, b) => a.ano_mes.localeCompare(b.ano_mes));
  return (
    <div style={{ width: 80, height: 30 }}>
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
    if (!m) return;
    setUnidadeFoco({ id: unidadeId, nome: m.nome });
    const r = await fetch(`/api/admin/analytics/tendencia-produto?unidade_id=${unidadeId}&meses=12`, { credentials: "include" });
    if (r.ok) setTendencia(await r.json());
  }

  if (loading) return <Layout><div className="p-8 text-zinc-500">Carregando analytics...</div></Layout>;
  if (!crescimento) return <Layout><div className="p-8 text-red-400">Erro ao carregar dados.</div></Layout>;

  const c = crescimento.consolidado;
  const Icon = c.variacao_pct === null ? Minus : c.variacao_pct >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Layout>
      <BotaoImprimirFlutuante titulo={`Analytics Multiplanar · ${crescimento.periodo_a} → ${crescimento.periodo_b}`} />
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <BarChart3 size={28} /> Analytics Multiplanar — Dashboard CEO
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Filosofia Mike Tyson × Éder Jofre: o que importa é a EVOLUÇÃO, não o número absoluto.
              Nenhum número aparece sem variação % + cor + mini-gráfico.
            </p>
          </div>
          <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
            <RefreshCw size={16} /> Recarregar
          </button>
        </header>

        {/* SEÇÃO 1 · CONSOLIDADO + SELETOR DE PERÍODO */}
        <section className={`rounded-lg p-5 border ${COR_BG[c.cor]}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase opacity-80 font-mono">Consolidado · {crescimento.periodo_a} → {crescimento.periodo_b}</div>
              <div className="text-3xl font-bold mt-1 flex items-center gap-2">
                <Icon size={28} />
                {fmtBRL(c.faturamento_b)}
              </div>
              <div className="text-sm opacity-80 mt-1">
                anterior: {fmtBRL(c.faturamento_a)}
                · variação: <b>{fmtBRL(c.variacao_abs_brl)}</b>
                · <b>{fmtPct(c.variacao_pct)}</b>
              </div>
            </div>
            <div className="text-right text-xs opacity-70 max-w-md">
              Cor por threshold: ≥+10% excelente · 0~10 bom · -10~0 atenção · {"<"}-10 crítico
            </div>
          </div>
        </section>

        {/* SEÇÃO 2 · BARRAS COMPARATIVAS */}
        <CrescimentoBarChart ranking={crescimento.ranking} periodoA={crescimento.periodo_a} periodoB={crescimento.periodo_b} />

        {/* SEÇÃO 3 · MATRIZ HEATMAP */}
        <MatrizComparativoClinicas matriz={matriz} anoMes={matrizMes} onClick={clicarClinica} />

        {/* SEÇÃO 4 · TENDÊNCIA DRILL-DOWN */}
        <TendenciaLineChart tendencia={tendencia} nomeClinica={unidadeFoco?.nome ?? ""} />

        {/* SEÇÃO 5 · TABELA RANKING COM SPARKLINES */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <h3 className="text-amber-400 font-semibold">Ranking detalhado · sparklines de evolução</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Clínica</th>
                <th className="text-right px-3 py-2">Faturamento {crescimento.periodo_a}</th>
                <th className="text-right px-3 py-2">Faturamento {crescimento.periodo_b}</th>
                <th className="text-center px-3 py-2">Variação</th>
                <th className="text-center px-3 py-2">Sparkline</th>
                <th className="text-center px-3 py-2">Receitas {fmtPct(crescimento.ranking[0]?.receitas.variacao_pct ?? null).slice(0,1) || "Δ"}</th>
                <th className="text-center px-3 py-2">Pacientes Δ</th>
              </tr>
            </thead>
            <tbody>
              {crescimento.ranking.map((r, idx) => (
                <tr key={r.unidade_id} className="border-t border-zinc-800 hover:bg-zinc-800/30 cursor-pointer" onClick={() => void clicarClinica(r.unidade_id)}>
                  <td className="px-3 py-2 text-zinc-500 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-zinc-100">{r.nome}</div>
                    <div className="text-[10px] text-zinc-500">{r.tipo_unidade}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{fmtBRLcurto(r.faturamento.periodo_a)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtBRLcurto(r.faturamento.periodo_b)}</td>
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

        <div className="text-xs text-zinc-500 space-y-1 pt-4">
          <div>• <b className="text-amber-400">REGRA-OURO</b>: nenhum número absoluto isolado. Cada métrica vem com (anterior · atual · variação_abs · variação_pct · cor · sparkline).</div>
          <div>• <b className="text-emerald-400">VERDE/EXCELENTE</b> ≥ +10% · <b className="text-blue-400">AZUL/BOM</b> 0~10% · <b className="text-amber-400">AMARELO/ATENÇÃO</b> -10~0% · <b className="text-red-400">VERMELHO/CRÍTICO</b> &lt; -10%</div>
          <div>• Clique em qualquer card da matriz ou linha do ranking pra ver a tendência de 12 meses dessa clínica com pico e vale marcados.</div>
          <div>• Dados de mar/2026 pra trás são sintéticos pro analytics (origem='sintetico_seed'). Abril/2026 é real (origem='real_query').</div>
        </div>
      </div>
    </Layout>
  );
}
