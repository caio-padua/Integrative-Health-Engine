import { useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

type Analito = {
  codigo: string; nome: string; grupo: string;
  unidade_padrao_integrativa: string; terco_excelente: string;
};

type SeriePonto = {
  id: number; valor: number; unidade: string;
  valor_minimo: number; valor_maximo: number;
  classificacao: string; data_coleta: string; laboratorio: string;
};

type MediaMensal = { mes: string; valor_medio: number; n_pacientes: number };

type SerieResp = {
  paciente_id: number;
  analito: { codigo: string; nome: string; grupo: string; unidade_padrao: string; terco_excelente: string; observacao_clinica?: string };
  serie: SeriePonto[];
  comparativo?: { unidade_id: number | null; serie_unidade: MediaMensal[]; serie_rede: MediaMensal[] };
  sugestao_venda: { titulo: string; produto: string; valor_estimado: number; motivo: string } | null;
};

// T8 PARMASUPRA-TSUNAMI · cor semantica de variacao (Mike Tyson — variacao manda).
function corVariacao(deltaPct: number): string {
  if (deltaPct >= 10) return "#2f8f4a";   // verde excelente
  if (deltaPct >= 0) return "#3274b8";    // azul bom
  if (deltaPct >= -10) return "#c98a1f";  // ambar atencao
  return "#b53030";                        // vermelho critico
}

const COR: Record<string, string> = {
  CRITICO: "#dc2626",     // VERMELHO
  ALERTA: "#facc15",      // AMARELO
  ACEITAVEL: "#fb923c",   // LARANJA
  EXCELENTE: "#16a34a",   // VERDE
  AVALIAR: "#2563eb",     // AZUL
  // Vocabulario antigo (compat):
  BAIXO: "#dc2626", PREOCUPANTE: "#dc2626",
  MEDIANO: "#fb923c", OTIMO: "#16a34a",
};

function formatarData(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function ExamesGrafico() {
  const [, params] = useRoute("/pacientes/:id/exames-grafico");
  const pacienteId = params?.id ? Number(params.id) : 0;

  const [analitos, setAnalitos] = useState<Analito[]>([]);
  const [analitoSelecionado, setAnalitoSelecionado] = useState<string>("VITAMINA_D");
  const [serie, setSerie] = useState<SerieResp | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/laboratorio/analitos`)
      .then(r => r.json())
      .then(j => setAnalitos(j.analitos || []))
      .catch(e => setErro(String(e)));
  }, []);

  useEffect(() => {
    if (!pacienteId || !analitoSelecionado) return;
    setCarregando(true); setErro(null);
    fetch(`/api/laboratorio/pacientes/${pacienteId}/serie/${analitoSelecionado}`)
      .then(r => r.json())
      .then(j => { if (j.error) setErro(j.error); else setSerie(j); })
      .catch(e => setErro(String(e)))
      .finally(() => setCarregando(false));
  }, [pacienteId, analitoSelecionado]);

  const dadosGrafico = useMemo(() => {
    if (!serie) return [];
    const mapaUnidade = new Map<string, number>();
    const mapaRede = new Map<string, number>();
    for (const m of serie.comparativo?.serie_unidade ?? []) mapaUnidade.set(m.mes, Number(m.valor_medio));
    for (const m of serie.comparativo?.serie_rede ?? []) mapaRede.set(m.mes, Number(m.valor_medio));
    return serie.serie.map(p => {
      const mes = p.data_coleta ? String(p.data_coleta).slice(0, 7) : null;
      return {
        data: formatarData(p.data_coleta),
        valor: Number(p.valor),
        media_unidade: mes && mapaUnidade.has(mes) ? mapaUnidade.get(mes)! : null,
        media_rede: mes && mapaRede.has(mes) ? mapaRede.get(mes)! : null,
        classificacao: p.classificacao,
        laboratorio: p.laboratorio,
        cor: COR[p.classificacao] ?? "#6b7280",
      };
    });
  }, [serie]);

  // T8 PARMASUPRA-TSUNAMI · resumo Mike Tyson: ultimo paciente vs ultima media unidade vs rede.
  const resumoMike = useMemo(() => {
    if (!serie || serie.serie.length === 0) return null;
    const ultimo = serie.serie[serie.serie.length - 1];
    const valorPaciente = Number(ultimo!.valor);
    const u = serie.comparativo?.serie_unidade ?? [];
    const r = serie.comparativo?.serie_rede ?? [];
    const mediaUnidade = u.length ? Number(u[u.length - 1]!.valor_medio) : null;
    const mediaRede = r.length ? Number(r[r.length - 1]!.valor_medio) : null;
    const deltaUnidade = mediaUnidade && mediaUnidade !== 0
      ? Math.round(((valorPaciente - mediaUnidade) / mediaUnidade) * 1000) / 10 : null;
    const deltaRede = mediaRede && mediaRede !== 0
      ? Math.round(((valorPaciente - mediaRede) / mediaRede) * 1000) / 10 : null;
    return { valorPaciente, mediaUnidade, mediaRede, deltaUnidade, deltaRede,
             nUnidade: u.length ? u[u.length - 1]!.n_pacientes : 0,
             nRede: r.length ? r[r.length - 1]!.n_pacientes : 0 };
  }, [serie]);

  const refMin = serie?.serie[0]?.valor_minimo;
  const refMax = serie?.serie[0]?.valor_maximo;
  const tercoExcelente = serie?.analito.terco_excelente;

  return (
    <Layout>
      <BotaoImprimirFlutuante titulo={`Linha do Tempo de Exames · Paciente #${pacienteId ?? ""}`} />
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href={`/pacientes/${pacienteId}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao paciente</Button>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "#1F4E5F" }}>
            Linha do tempo de exames
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" /> Selecione o analito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={analitoSelecionado} onValueChange={setAnalitoSelecionado}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Escolha um analito" />
              </SelectTrigger>
              <SelectContent>
                {analitos.map(a => (
                  <SelectItem key={a.codigo} value={a.codigo}>
                    {a.nome} <span className="text-muted-foreground text-xs ml-2">({a.grupo})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {erro && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-sm">Erro: {erro}</div>}
        {carregando && <div className="text-sm text-muted-foreground">Carregando...</div>}

        {serie && serie.serie.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <CardTitle style={{ color: "#1F4E5F" }}>
                  {serie.analito.nome}
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    Unidade padrão da clínica: <strong>{serie.analito.unidade_padrao}</strong>
                  </span>
                </CardTitle>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900">
                  Regra integrativa: terço {tercoExcelente?.toLowerCase()} = excelente
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer>
                  <ComposedChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                    <Tooltip
                      formatter={(v: any, _n, p: any) => [`${v} ${serie.analito.unidade_padrao}`, p?.payload?.classificacao]}
                      labelFormatter={(label: any, payload: any) => {
                        const lab = payload?.[0]?.payload?.laboratorio;
                        return lab ? `${label} • ${lab}` : String(label);
                      }}
                    />
                    <Legend />
                    {refMin != null && (
                      <ReferenceLine y={refMin} stroke="#dc2626" strokeDasharray="6 3" label={{ value: `Mín ref ${refMin}`, position: "left", fill: "#dc2626", fontSize: 11 }} />
                    )}
                    {refMax != null && (
                      <ReferenceLine y={refMax} stroke="#16a34a" strokeDasharray="6 3" label={{ value: `Máx ref ${refMax}`, position: "left", fill: "#16a34a", fontSize: 11 }} />
                    )}
                    <Bar dataKey="valor" name="Paciente" radius={[6, 6, 0, 0]}>
                      {dadosGrafico.map((d, i) => <Cell key={i} fill={d.cor} />)}
                    </Bar>
                    {/* T8: linhas de comparativo (Mike Tyson — paciente vs unidade vs rede) */}
                    <Line type="monotone" dataKey="media_unidade" name="Média da unidade"
                          stroke="#3274b8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="media_rede" name="Média da rede"
                          stroke="#6b7280" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {(["CRITICO","ALERTA","ACEITAVEL","EXCELENTE","AVALIAR"] as const).map(c => (
                  <div key={c} className="flex items-center gap-2 px-2 py-1 rounded border">
                    <span className="inline-block w-3 h-3 rounded" style={{ background: COR[c] }} />
                    {c}
                  </div>
                ))}
              </div>

              {/* T8 PARMASUPRA-TSUNAMI · resumo Mike Tyson (variacao manda, nunca numero isolado) */}
              {resumoMike && (resumoMike.deltaUnidade != null || resumoMike.deltaRede != null) && (
                <div className="mt-5 rounded-md border-2 p-3" style={{ borderColor: "#C89B3C", background: "#fffbf2" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#020406" }}>
                    Variação do paciente vs pares (último mês com dados)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Paciente (último)</div>
                      <div className="text-xl font-bold" style={{ color: "#020406" }}>
                        {resumoMike.valorPaciente} <span className="text-xs font-normal">{serie.analito.unidade_padrao}</span>
                      </div>
                    </div>
                    {resumoMike.deltaUnidade != null && resumoMike.mediaUnidade != null && (
                      <div>
                        <div className="text-xs text-muted-foreground">vs média da unidade ({resumoMike.nUnidade} pacientes)</div>
                        <div className="text-xl font-bold" style={{ color: corVariacao(resumoMike.deltaUnidade) }}>
                          {resumoMike.deltaUnidade >= 0 ? "+" : ""}{resumoMike.deltaUnidade}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">média {resumoMike.mediaUnidade}</div>
                      </div>
                    )}
                    {resumoMike.deltaRede != null && resumoMike.mediaRede != null && (
                      <div>
                        <div className="text-xs text-muted-foreground">vs média da rede ({resumoMike.nRede} pacientes)</div>
                        <div className="text-xl font-bold" style={{ color: corVariacao(resumoMike.deltaRede) }}>
                          {resumoMike.deltaRede >= 0 ? "+" : ""}{resumoMike.deltaRede}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">média {resumoMike.mediaRede}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 italic">
                    Verde ≥ +10% · Azul ≥ 0% · Âmbar ≥ -10% · Vermelho &lt; -10%. Para alguns analitos (ex: PCR, insulina) menor é melhor — interprete com clínica.
                  </div>
                </div>
              )}

              {serie.analito.observacao_clinica && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  {serie.analito.observacao_clinica}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {serie && serie.serie.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            Sem resultados deste analito para este paciente. Registre via <code>POST /api/laboratorio/exames/registrar</code>.
          </CardContent></Card>
        )}

        {serie?.sugestao_venda && (
          <Card className="border-2" style={{ borderColor: "#1F4E5F" }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#1F4E5F" }}>
                <ShoppingCart className="h-5 w-5" /> Indicação clínica + comercial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-muted-foreground">{serie.sugestao_venda.motivo}</div>
              </div>
              <div className="text-lg font-semibold" style={{ color: "#1F4E5F" }}>{serie.sugestao_venda.titulo}</div>
              <div className="text-sm">{serie.sugestao_venda.produto}</div>
              <div className="text-xl font-bold" style={{ color: "#C9A961" }}>
                R$ {serie.sugestao_venda.valor_estimado.toLocaleString("pt-BR")}
              </div>
              <div className="text-[10px] text-muted-foreground tracking-wider mt-3">
                Developed and Supervised by PADCON
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
