// GraficosAnalitos — múltiplas visualizações do mesmo dataset de exames,
// alternáveis via botões. Todas usam a nomenclatura oficial das 5 zonas:
//   ABAIXO_MIN (0) · INFERIOR (1) · MÉDIO (2) · SUPERIOR (3) · ACIMA_MAX (4)
//
// Visualizações:
//   A) BARRAS_EMPILHADAS   — Categoria × Zonas (stacked bars)
//   B) PIZZA_ZONAS         — Distribuição global das 5 zonas
//   C) RADAR_CATEGORIAS    — % de exames fora do ideal por categoria
//   D) BARRAS_POR_ZONA     — Pra cada zona, quantos exames de cada categoria
//   E) BARRAS_ALTERADOS    — Apenas exames alterados (zonas 0,1,3,4) por categoria
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PAWARDS } from "@/lib/pawards-tokens";
import { BarChart3, PieChart as PieIcon, Radar as RadarIcon, Layers, AlertOctagon } from "lucide-react";
import { ZONA_META, zonaIdxParaSlug } from "./FiltroZonasButtons";

type Modo = "BARRAS_EMPILHADAS" | "PIZZA_ZONAS" | "RADAR_CATEGORIAS" | "BARRAS_POR_ZONA" | "BARRAS_ALTERADOS";

interface ExameMin {
  id: number;
  nome_exame: string;
  categoria: string | null;
  analito_grupo: string | null;
  zona_idx: number;
  direcao_favoravel?: string;
}

interface Props {
  exames: ExameMin[];
}

const ZONA_ORDEM: Array<keyof typeof ZONA_META> = ["ABAIXO_MIN", "INFERIOR", "MEDIO", "SUPERIOR", "ACIMA_MAX"];

const MODOS: Array<{ id: Modo; label: string; icon: typeof BarChart3; descricao: string }> = [
  { id: "BARRAS_EMPILHADAS", label: "Categoria × Zonas", icon: Layers, descricao: "Barras empilhadas — quantos exames de cada categoria caem em cada zona" },
  { id: "BARRAS_ALTERADOS",  label: "Alterados",         icon: AlertOctagon, descricao: "Apenas exames FORA do terço médio agrupados por categoria" },
  { id: "PIZZA_ZONAS",       label: "Pizza 5 zonas",     icon: PieIcon, descricao: "Distribuição global do paciente nas 5 zonas oficiais" },
  { id: "RADAR_CATEGORIAS",  label: "Radar",             icon: RadarIcon, descricao: "% fora do ideal por categoria — mostra quais sistemas precisam de atenção" },
  { id: "BARRAS_POR_ZONA",   label: "Por zona",          icon: BarChart3, descricao: "Cada zona ganha sua barra — quantos exames totais caíram nela" },
];

function nomeCategoria(ex: ExameMin): string {
  return ex.categoria || ex.analito_grupo || "SEM CATEGORIA";
}

function ehAlterado(ex: ExameMin): boolean {
  const ideal = (ex.direcao_favoravel || "MEDIO").toUpperCase();
  const idealIdx = ideal === "SUPERIOR" ? 3 : ideal === "INFERIOR" ? 1 : 2;
  return ex.zona_idx !== idealIdx;
}

export default function GraficosAnalitos({ exames }: Props) {
  const [modo, setModo] = useState<Modo>("BARRAS_EMPILHADAS");

  // Agregações
  const porCategoriaEZona = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const ex of exames) {
      const cat = nomeCategoria(ex);
      const slug = zonaIdxParaSlug(ex.zona_idx);
      if (!map.has(cat)) map.set(cat, { categoria: 0 as any, ABAIXO_MIN: 0, INFERIOR: 0, MEDIO: 0, SUPERIOR: 0, ACIMA_MAX: 0 } as any);
      const row: any = map.get(cat)!;
      row.categoria = cat;
      row[slug] = (row[slug] || 0) + 1;
    }
    return Array.from(map.values()).sort((a: any, b: any) => a.categoria.localeCompare(b.categoria));
  }, [exames]);

  const porZona = useMemo(() => {
    const cont: Record<string, number> = { ABAIXO_MIN: 0, INFERIOR: 0, MEDIO: 0, SUPERIOR: 0, ACIMA_MAX: 0 };
    for (const ex of exames) cont[zonaIdxParaSlug(ex.zona_idx)]++;
    return ZONA_ORDEM.map((slug) => ({
      zona: ZONA_META[slug].curto,
      slug,
      total: cont[slug],
      cor: ZONA_META[slug].cor,
    }));
  }, [exames]);

  const radarCategorias = useMemo(() => {
    const map = new Map<string, { total: number; alterados: number }>();
    for (const ex of exames) {
      const cat = nomeCategoria(ex);
      if (!map.has(cat)) map.set(cat, { total: 0, alterados: 0 });
      const r = map.get(cat)!;
      r.total++;
      if (ehAlterado(ex)) r.alterados++;
    }
    return Array.from(map.entries()).map(([categoria, v]) => ({
      categoria,
      pctAlterado: v.total ? Math.round((v.alterados / v.total) * 100) : 0,
      pctOk: v.total ? Math.round(((v.total - v.alterados) / v.total) * 100) : 0,
      total: v.total,
    }));
  }, [exames]);

  const alteradosPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const ex of exames) {
      if (!ehAlterado(ex)) continue;
      const cat = nomeCategoria(ex);
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([categoria, alterados]) => ({ categoria, alterados }))
      .sort((a, b) => b.alterados - a.alterados);
  }, [exames]);

  const totalExames = exames.length;
  const modoAtual = MODOS.find((m) => m.id === modo)!;

  return (
    <div
      className="border"
      style={{
        background: PAWARDS.colors.bg.panel,
        borderColor: PAWARDS.colors.gold[700] + "44",
        borderRadius: 0,
      }}
    >
      {/* Header com seletor de modo */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: PAWARDS.colors.gold[700] + "33" }}
      >
        <div className="flex-1 min-w-[200px]">
          <div
            className="text-[10px] uppercase tracking-wider"
            style={{ color: PAWARDS.colors.gold[300], fontFamily: "JetBrains Mono, monospace" }}
          >
            Painel de Gráficos · 5 Zonas Oficiais
          </div>
          <div className="text-xs mt-0.5" style={{ color: PAWARDS.colors.text.secondary }}>
            {modoAtual.descricao}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MODOS.map((m) => {
            const ativo = m.id === modo;
            return (
              <Button
                key={m.id}
                size="sm"
                variant="ghost"
                onClick={() => setModo(m.id)}
                className="h-8 px-2.5 gap-1.5 text-[10px] uppercase tracking-wider font-bold"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  borderRadius: 0,
                  background: ativo ? PAWARDS.colors.gold[500] + "22" : "transparent",
                  color: ativo ? PAWARDS.colors.gold[300] : PAWARDS.colors.text.secondary,
                  border: `1px solid ${ativo ? PAWARDS.colors.gold[500] : PAWARDS.colors.gold[700] + "33"}`,
                }}
                data-testid={`btn-grafico-${m.id}`}
              >
                <m.icon className="w-3 h-3" />
                {m.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Corpo do gráfico */}
      <div className="p-4">
        {totalExames === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: PAWARDS.colors.text.tertiary }}>
            Sem exames pra plotar.
          </div>
        ) : (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              {modo === "BARRAS_EMPILHADAS" ? (
                <BarChart data={porCategoriaEZona} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis
                    dataKey="categoria"
                    tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11, borderRadius: 0 }}
                    cursor={{ fill: "#ffffff08" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {ZONA_ORDEM.map((slug) => (
                    <Bar key={slug} dataKey={slug} stackId="z" fill={ZONA_META[slug].cor} name={ZONA_META[slug].curto} />
                  ))}
                </BarChart>
              ) : modo === "BARRAS_ALTERADOS" ? (
                <BarChart data={alteradosPorCategoria} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis
                    dataKey="categoria"
                    tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11, borderRadius: 0 }}
                    cursor={{ fill: "#ffffff08" }}
                    formatter={(v: number) => [v, "Exames fora do ideal"]}
                  />
                  <Bar dataKey="alterados" fill={PAWARDS.colors.status.warning} name="Fora do ideal" />
                </BarChart>
              ) : modo === "PIZZA_ZONAS" ? (
                <PieChart>
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11, borderRadius: 0 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Pie
                    data={porZona}
                    dataKey="total"
                    nameKey="zona"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    label={(e: any) => `${e.zona}: ${e.total}`}
                  >
                    {porZona.map((z) => (
                      <Cell key={z.slug} fill={z.cor} stroke={PAWARDS.colors.bg[950]} strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              ) : modo === "RADAR_CATEGORIAS" ? (
                <RadarChart data={radarCategorias}>
                  <PolarGrid stroke="#ffffff15" />
                  <PolarAngleAxis dataKey="categoria" tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: PAWARDS.colors.text.muted }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11, borderRadius: 0 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Radar
                    name="% No ideal"
                    dataKey="pctOk"
                    stroke={PAWARDS.colors.status.good}
                    fill={PAWARDS.colors.status.good}
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="% Fora do ideal"
                    dataKey="pctAlterado"
                    stroke={PAWARDS.colors.status.warning}
                    fill={PAWARDS.colors.status.warning}
                    fillOpacity={0.3}
                  />
                </RadarChart>
              ) : (
                <BarChart data={porZona} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis dataKey="zona" tick={{ fontSize: 11, fill: PAWARDS.colors.text.secondary }} />
                  <YAxis tick={{ fontSize: 10, fill: PAWARDS.colors.text.secondary }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 11, borderRadius: 0 }}
                    cursor={{ fill: "#ffffff08" }}
                    formatter={(v: number, _n: any, props: any) => [v, props.payload.zona]}
                  />
                  <Bar dataKey="total" name="Exames">
                    {porZona.map((z) => (
                      <Cell key={z.slug} fill={z.cor} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
