import "./_group.css";
import { useState, useMemo } from "react";
import {
  Activity, AlertTriangle, ShieldAlert, ArrowDown, Minus, ArrowUp,
  TrendingUp, TrendingDown, Equal,
} from "lucide-react";

type Zona = "ABAIXO_MIN" | "INFERIOR" | "MEDIO" | "SUPERIOR" | "ACIMA_MAX";

const ZONA_META: Record<Zona, { label: string; curto: string; cor: string; bg: string; icon: typeof AlertTriangle }> = {
  ABAIXO_MIN: { label: "Abaixo do mínimo",  curto: "ABAIXO",   cor: "#dc2626", bg: "rgba(220,38,38,0.18)",   icon: AlertTriangle },
  INFERIOR:   { label: "Terço Inferior",    curto: "INFERIOR", cor: "#f59e0b", bg: "rgba(245,158,11,0.18)",  icon: ArrowDown },
  MEDIO:      { label: "Terço Médio",       curto: "MÉDIO",    cor: "#3b82f6", bg: "rgba(59,130,246,0.18)",  icon: Minus },
  SUPERIOR:   { label: "Terço Superior",    curto: "SUPERIOR", cor: "#22c55e", bg: "rgba(34,197,94,0.18)",   icon: ArrowUp },
  ACIMA_MAX:  { label: "Acima do máximo",   curto: "ACIMA",    cor: "#dc2626", bg: "rgba(220,38,38,0.18)",   icon: ShieldAlert },
};

type Exame = {
  codigo: string;
  nome: string;
  unidade: string;
  min: number;
  max: number;
  idealZona: Zona;
  vals: { data: string; valor: number }[];
};

const DATAS = ["10/JAN/26", "08/ABR/26", "15/MAI/26"];

const EXAMES: Exame[] = [
  { codigo: "VITD",  nome: "Vitamina D (25-OH)",     unidade: "ng/mL", min: 30,  max: 100,  idealZona: "SUPERIOR",
    vals: [{ data: DATAS[0], valor: 18 }, { data: DATAS[1], valor: 38 }, { data: DATAS[2], valor: 62 }] },
  { codigo: "B12",   nome: "Vitamina B12",            unidade: "pg/mL", min: 200, max: 900,  idealZona: "SUPERIOR",
    vals: [{ data: DATAS[0], valor: 180 }, { data: DATAS[1], valor: 420 }, { data: DATAS[2], valor: 780 }] },
  { codigo: "FER",   nome: "Ferritina",               unidade: "ng/mL", min: 30,  max: 300,  idealZona: "MEDIO",
    vals: [{ data: DATAS[0], valor: 12 }, { data: DATAS[1], valor: 95 }, { data: DATAS[2], valor: 145 }] },
  { codigo: "TSH",   nome: "TSH (Hormônio Tireoidiano)", unidade: "µUI/mL", min: 0.4, max: 4.0, idealZona: "INFERIOR",
    vals: [{ data: DATAS[0], valor: 5.8 }, { data: DATAS[1], valor: 2.6 }, { data: DATAS[2], valor: 1.4 }] },
  { codigo: "HGB",   nome: "Hemoglobina",             unidade: "g/dL",  min: 12,  max: 16,   idealZona: "MEDIO",
    vals: [{ data: DATAS[0], valor: 10.8 }, { data: DATAS[1], valor: 13.2 }, { data: DATAS[2], valor: 14.1 }] },
  { codigo: "GLI",   nome: "Glicemia em jejum",       unidade: "mg/dL", min: 70,  max: 99,   idealZona: "INFERIOR",
    vals: [{ data: DATAS[0], valor: 108 }, { data: DATAS[1], valor: 96 }, { data: DATAS[2], valor: 84 }] },
];

function classificar(valor: number, min: number, max: number): Zona {
  if (valor < min) return "ABAIXO_MIN";
  if (valor > max) return "ACIMA_MAX";
  const terco = (max - min) / 3;
  if (valor < min + terco) return "INFERIOR";
  if (valor < min + 2 * terco) return "MEDIO";
  return "SUPERIOR";
}

function tendencia(vals: Exame["vals"]): "SUBINDO" | "DESCENDO" | "ESTAVEL" {
  if (vals.length < 2) return "ESTAVEL";
  const ult = vals[vals.length - 1].valor;
  const ant = vals[vals.length - 2].valor;
  const diff = Math.abs(ult - ant) / Math.max(1, ant);
  if (diff < 0.05) return "ESTAVEL";
  return ult > ant ? "SUBINDO" : "DESCENDO";
}

export default function TercoTablePanel() {
  const [zonaFiltro, setZonaFiltro] = useState<Zona | "TODAS" | "FORA_IDEAL">("TODAS");
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { TODAS: 0, FORA_IDEAL: 0, ABAIXO_MIN: 0, INFERIOR: 0, MEDIO: 0, SUPERIOR: 0, ACIMA_MAX: 0 };
    EXAMES.forEach(ex => {
      ex.vals.forEach(v => {
        const z = classificar(v.valor, ex.min, ex.max);
        c.TODAS++;
        c[z]++;
        if (z !== ex.idealZona) c.FORA_IDEAL++;
      });
    });
    return c;
  }, []);

  const filtroAtivo = (z: Zona, ideal: Zona): boolean => {
    if (zonaFiltro === "TODAS") return true;
    if (zonaFiltro === "FORA_IDEAL") return z !== ideal;
    return z === zonaFiltro;
  };

  return (
    <div className="craniotomia-root min-h-screen w-full flex flex-col text-[11px] leading-tight overflow-hidden">
      {/* HEADER */}
      <header className="flex-none border-b border-[var(--crn-border)] bg-[var(--crn-bg-panel)] px-3 py-2">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[var(--crn-accent-strong)]" />
            <div className="flex flex-col">
              <h1 className="craniotomia-serif text-sm font-semibold tracking-wide text-white">
                TERÇOS · <span className="text-[var(--crn-fg-muted)] font-normal">3º painel da Craniotomia (mesma tela do grafo + matriz)</span>
              </h1>
              <span className="text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
                Paciente Dayana · 6 exames × 3 datas · 5 zonas oficiais Pawards · cores ↔ FiltroZonasButtons
              </span>
            </div>
          </div>
          <div className="text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
            {contagem.TODAS} medições · {contagem.FORA_IDEAL} fora do ideal
          </div>
        </div>

        {/* Filtros por zona */}
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider mr-1">Zonas:</span>
          {(["TODAS", "ABAIXO_MIN", "INFERIOR", "MEDIO", "SUPERIOR", "ACIMA_MAX", "FORA_IDEAL"] as const).map(slug => {
            const ativa = slug === zonaFiltro;
            const meta = slug === "TODAS"
              ? { curto: "TODAS", cor: "#D4AF37", icon: null as any }
              : slug === "FORA_IDEAL"
              ? { curto: "FORA DO IDEAL", cor: "#f59e0b", icon: AlertTriangle }
              : ZONA_META[slug];
            const Icon = (meta as any).icon;
            const n = contagem[slug];
            return (
              <button
                key={slug}
                onClick={() => setZonaFiltro(slug)}
                className="h-7 px-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: ativa ? meta.cor + "22" : "transparent",
                  color: ativa ? meta.cor : "var(--crn-fg-muted)",
                  border: `1px solid ${ativa ? meta.cor : meta.cor + "33"}`,
                  boxShadow: ativa ? `inset 0 0 0 1px ${meta.cor}66, 0 0 8px ${meta.cor}33` : "none",
                }}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{meta.curto}</span>
                <span
                  className="ml-1 px-1 border"
                  style={{
                    background: meta.cor + (ativa ? "33" : "11"),
                    borderColor: meta.cor + "55",
                    color: meta.cor,
                  }}
                >{n}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* TABELA TERÇOS HEATMAP */}
      <div className="flex-1 overflow-auto bg-[var(--crn-bg)]">
        <table className="w-full text-left whitespace-nowrap" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead className="sticky top-0 z-10 bg-[var(--crn-bg-panel)] shadow-[0_1px_0_var(--crn-border)] text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2 w-12 border-b border-[var(--crn-border)]">CÓD</th>
              <th className="px-2 py-2 w-[220px] border-b border-[var(--crn-border)]">EXAME</th>
              <th className="px-2 py-2 w-20 border-b border-[var(--crn-border)] text-center">REF.</th>
              <th className="px-2 py-2 w-20 border-b border-[var(--crn-border)] text-center">IDEAL</th>
              {DATAS.map(d => (
                <th key={d} className="px-2 py-2 w-[160px] border-b border-[var(--crn-border)] text-center">{d}</th>
              ))}
              <th className="px-2 py-2 w-20 border-b border-[var(--crn-border)] text-center">TENDÊNCIA</th>
              <th className="px-2 py-2 w-20 border-b border-[var(--crn-border)] text-center">DELTA</th>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {EXAMES.map((ex, idx) => {
              const bgClass = idx % 2 === 0 ? "bg-[var(--crn-bg-row)]" : "bg-[var(--crn-bg-row-alt)]";
              const trend = tendencia(ex.vals);
              const TrendIcon = trend === "SUBINDO" ? TrendingUp : trend === "DESCENDO" ? TrendingDown : Equal;
              const delta = ex.vals[ex.vals.length - 1].valor - ex.vals[0].valor;
              const idealMeta = ZONA_META[ex.idealZona];
              const IdealIcon = idealMeta.icon;
              return (
                <tr key={ex.codigo} className={bgClass}>
                  <td className="px-2 py-1.5 font-mono text-[var(--crn-accent)] font-bold border-b border-[var(--crn-border)]">{ex.codigo}</td>
                  <td className="px-2 py-1.5 border-b border-[var(--crn-border)]">
                    <div className="flex flex-col leading-tight">
                      <span className="text-[var(--crn-fg)] font-medium">{ex.nome}</span>
                      <span className="text-[8px] text-[var(--crn-fg-dim)]">{ex.unidade}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-[9px] text-[var(--crn-fg-muted)] border-b border-[var(--crn-border)]">
                    {ex.min}–{ex.max}
                  </td>
                  <td className="px-2 py-1.5 text-center border-b border-[var(--crn-border)]">
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold border"
                      style={{ color: idealMeta.cor, borderColor: idealMeta.cor + "66", background: idealMeta.bg }}
                      title={`Direção favorável: ${idealMeta.label}`}
                    >
                      <IdealIcon className="w-2.5 h-2.5" />
                      {idealMeta.curto}
                    </span>
                  </td>

                  {ex.vals.map((v, i) => {
                    const zona = classificar(v.valor, ex.min, ex.max);
                    const meta = ZONA_META[zona];
                    const Icon = meta.icon;
                    const foraIdeal = zona !== ex.idealZona;
                    const apagado = !filtroAtivo(zona, ex.idealZona);
                    const cellKey = `${ex.codigo}-${i}`;
                    const isHover = hoveredCell === cellKey;
                    return (
                      <td
                        key={i}
                        className="px-1.5 py-1.5 border-b border-[var(--crn-border)]"
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className="flex items-center justify-between gap-1 px-2 py-1 cursor-pointer transition-all"
                          style={{
                            background: meta.bg,
                            border: `1px solid ${meta.cor}${foraIdeal ? "" : "55"}`,
                            opacity: apagado ? 0.15 : 1,
                            boxShadow: isHover
                              ? `0 0 0 1px ${meta.cor}, 0 0 12px ${meta.cor}aa, inset 0 0 8px ${meta.cor}55`
                              : foraIdeal
                              ? `inset 0 0 0 1px ${meta.cor}88`
                              : "none",
                            transform: isHover ? "scale(1.02)" : "scale(1)",
                          }}
                          title={`${v.valor} ${ex.unidade} · ${meta.label}${foraIdeal ? " (fora do ideal)" : ""}`}
                        >
                          <div className="flex items-center gap-1">
                            <Icon className="w-3 h-3" style={{ color: meta.cor }} />
                            <span className="font-mono font-bold text-[10px]" style={{ color: meta.cor }}>
                              {v.valor}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: meta.cor, opacity: 0.7 }}>
                            {meta.curto}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-2 py-1.5 text-center border-b border-[var(--crn-border)]">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon
                        className="w-3.5 h-3.5"
                        style={{
                          color:
                            trend === "ESTAVEL" ? "var(--crn-fg-muted)"
                            : (trend === "SUBINDO") === (ex.idealZona === "SUPERIOR")
                              ? "var(--crn-estado-ativo)"
                              : "var(--crn-estado-bloqueado)",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-[10px] border-b border-[var(--crn-border)]">
                    <span style={{
                      color: delta > 0 ? "var(--crn-estado-ativo)" : delta < 0 ? "var(--crn-estado-bloqueado)" : "var(--crn-fg-muted)",
                    }}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER LEGENDA */}
      <footer className="flex-none h-7 border-t border-[var(--crn-border)] bg-[var(--crn-bg-panel)] flex items-center px-3 justify-between text-[9px] text-[var(--crn-fg-dim)]">
        <div className="flex items-center gap-3">
          {(Object.keys(ZONA_META) as Zona[]).map(z => {
            const m = ZONA_META[z];
            return (
              <span key={z} className="flex items-center gap-1">
                <div className="w-2 h-2" style={{ background: m.cor }} />
                <span>{m.label}</span>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-[var(--crn-estado-validacao)]" />
          <span>borda extra = valor fora do terço ideal · hover = halo elétrico (mesmo padrão do grafo)</span>
        </div>
      </footer>
    </div>
  );
}
