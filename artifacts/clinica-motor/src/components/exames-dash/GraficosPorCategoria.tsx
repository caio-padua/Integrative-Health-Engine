// GraficosPorCategoria — grid de mini-gráficos, um por categoria de exames,
// mostrando a distribuição daquela categoria nas 5 zonas oficiais.
// Pra apresentação ao paciente em telão (modo vitrine compatível).
import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from "recharts";
import { PAWARDS } from "@/lib/pawards-tokens";
import { ZONA_META, zonaIdxParaSlug } from "./FiltroZonasButtons";

interface ExameMin {
  id: number;
  nome_exame: string;
  categoria: string | null;
  analito_grupo: string | null;
  zona_idx: number;
  direcao_favoravel?: string;
}

const ZONA_ORDEM: Array<keyof typeof ZONA_META> = ["ABAIXO_MIN", "INFERIOR", "MEDIO", "SUPERIOR", "ACIMA_MAX"];

function nomeCategoria(ex: ExameMin): string {
  return ex.categoria || ex.analito_grupo || "SEM CATEGORIA";
}

// Cada exame tem seu próprio `direcao_favoravel` (SUPERIOR/MEDIO/INFERIOR).
// "Fora do ideal" = zona_idx do exame diferente da zona ideal DELE,
// não do primeiro exame da categoria (categorias misturam direções,
// ex: lipidograma tem HDL alto-bom e LDL baixo-bom).
function ehAlterado(ex: ExameMin): boolean {
  const ideal = (ex.direcao_favoravel || "MEDIO").toUpperCase();
  const idealIdx = ideal === "SUPERIOR" ? 3 : ideal === "INFERIOR" ? 1 : 2;
  return ex.zona_idx !== idealIdx;
}

export default function GraficosPorCategoria({ exames }: { exames: ExameMin[] }) {
  const agrupados = useMemo(() => {
    const map = new Map<string, ExameMin[]>();
    for (const ex of exames) {
      const cat = nomeCategoria(ex);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(ex);
    }
    return Array.from(map.entries())
      .map(([categoria, lista]) => {
        const cont: Record<string, number> = { ABAIXO_MIN: 0, INFERIOR: 0, MEDIO: 0, SUPERIOR: 0, ACIMA_MAX: 0 };
        for (const ex of lista) cont[zonaIdxParaSlug(ex.zona_idx)]++;
        const data = ZONA_ORDEM.map((slug) => ({
          zona: ZONA_META[slug].curto,
          slug,
          n: cont[slug],
          cor: ZONA_META[slug].cor,
        }));
        const alterados = lista.filter(ehAlterado).length;
        return { categoria, data, total: lista.length, alterados, lista };
      })
      .sort((a, b) => b.alterados - a.alterados || b.total - a.total);
  }, [exames]);

  if (agrupados.length === 0) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: PAWARDS.colors.text.tertiary }}>
        Sem categorias pra mostrar.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {agrupados.map(({ categoria, data, total, alterados }) => {
        const semaforo =
          alterados === 0
            ? PAWARDS.colors.status.good
            : alterados / total > 0.4
            ? PAWARDS.colors.status.critical
            : PAWARDS.colors.status.warning;
        return (
          <div
            key={categoria}
            className="border"
            style={{
              background: PAWARDS.colors.bg.panel,
              borderColor: semaforo + "55",
              borderRadius: 0,
            }}
            data-testid={`card-categoria-${categoria}`}
          >
            <div
              className="px-3 py-2 flex items-center justify-between gap-2 border-b"
              style={{ borderColor: PAWARDS.colors.gold[700] + "22" }}
            >
              <div className="min-w-0">
                <div
                  className="text-[11px] uppercase tracking-wider font-bold truncate"
                  style={{ color: PAWARDS.colors.text.primary, fontFamily: "JetBrains Mono, monospace" }}
                >
                  {categoria}
                </div>
                <div className="text-[10px]" style={{ color: PAWARDS.colors.text.tertiary }}>
                  {total} exames · {alterados} fora do ideal
                </div>
              </div>
              <div
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider tabular-nums"
                style={{
                  background: semaforo + "22",
                  color: semaforo,
                  border: `1px solid ${semaforo}55`,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {Math.round((alterados / total) * 100)}%
              </div>
            </div>
            <div style={{ width: "100%", height: 130 }} className="px-1 py-2">
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                  <XAxis dataKey="zona" tick={{ fontSize: 9, fill: PAWARDS.colors.text.muted }} interval={0} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0B1018", border: `1px solid ${PAWARDS.colors.gold[700]}`, fontSize: 10, borderRadius: 0 }}
                    cursor={{ fill: "#ffffff08" }}
                    formatter={(v: number) => [v, "Exames"]}
                  />
                  <Bar dataKey="n">
                    {data.map((d) => (
                      <Cell key={d.slug} fill={d.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
