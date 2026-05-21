// FiltroZonasButtons — 6 botões pra filtrar exames pelas 5 zonas oficiais.
// Nomenclatura firmada por Caio (Wave Exames 5 Zonas):
//   0 ABAIXO_MIN (vermelho)  · abaixo do valor_minimo do laboratório
//   1 INFERIOR   (cor dinâmica) · terço inferior do range [min..max]
//   2 MEDIO      (amarelo/azul) · terço médio
//   3 SUPERIOR   (cor dinâmica) · terço superior
//   4 ACIMA_MAX  (vermelho)  · acima do valor_maximo do laboratório
import { Button } from "@/components/ui/button";
import { PAWARDS } from "@/lib/pawards-tokens";
import { AlertTriangle, ShieldAlert, ArrowDown, Minus, ArrowUp } from "lucide-react";

export type ZonaSlug = "TODAS" | "ABAIXO_MIN" | "INFERIOR" | "MEDIO" | "SUPERIOR" | "ACIMA_MAX" | "FORA_DO_IDEAL";

export const ZONA_META: Record<Exclude<ZonaSlug, "TODAS" | "FORA_DO_IDEAL">, {
  idx: number;
  label: string;
  curto: string;
  cor: string;
  icon: typeof AlertTriangle;
}> = {
  ABAIXO_MIN: { idx: 0, label: "Abaixo do mínimo", curto: "ABAIXO_MIN", cor: PAWARDS.colors.status.critical, icon: AlertTriangle },
  INFERIOR:   { idx: 1, label: "Terço Inferior",   curto: "INFERIOR",   cor: PAWARDS.colors.status.warning,  icon: ArrowDown },
  MEDIO:      { idx: 2, label: "Terço Médio",      curto: "MÉDIO",      cor: PAWARDS.colors.status.low,      icon: Minus },
  SUPERIOR:   { idx: 3, label: "Terço Superior",   curto: "SUPERIOR",   cor: PAWARDS.colors.status.good,     icon: ArrowUp },
  ACIMA_MAX:  { idx: 4, label: "Acima do máximo",  curto: "ACIMA_MAX",  cor: PAWARDS.colors.status.critical, icon: ShieldAlert },
};

export function zonaIdxParaSlug(idx: number): Exclude<ZonaSlug, "TODAS" | "FORA_DO_IDEAL"> {
  const map: Array<Exclude<ZonaSlug, "TODAS" | "FORA_DO_IDEAL">> = ["ABAIXO_MIN", "INFERIOR", "MEDIO", "SUPERIOR", "ACIMA_MAX"];
  return map[Math.max(0, Math.min(4, idx))] ?? "MEDIO";
}

export interface ContagemZonas {
  TODAS: number;
  ABAIXO_MIN: number;
  INFERIOR: number;
  MEDIO: number;
  SUPERIOR: number;
  ACIMA_MAX: number;
  FORA_DO_IDEAL: number;
}

export function contarZonas(
  exames: Array<{ zona_idx: number; direcao_favoravel?: string }>,
): ContagemZonas {
  const c: ContagemZonas = { TODAS: 0, ABAIXO_MIN: 0, INFERIOR: 0, MEDIO: 0, SUPERIOR: 0, ACIMA_MAX: 0, FORA_DO_IDEAL: 0 };
  for (const ex of exames) {
    c.TODAS++;
    const slug = zonaIdxParaSlug(ex.zona_idx);
    c[slug]++;
    const tercoIdeal = (ex.direcao_favoravel || "MEDIO").toUpperCase();
    const slugIdeal =
      tercoIdeal === "SUPERIOR" ? "SUPERIOR" :
      tercoIdeal === "INFERIOR" ? "INFERIOR" : "MEDIO";
    if (slug !== slugIdeal) c.FORA_DO_IDEAL++;
  }
  return c;
}

interface Props {
  zonaSelecionada: ZonaSlug;
  onChange: (z: ZonaSlug) => void;
  contagem: ContagemZonas;
}

export default function FiltroZonasButtons({ zonaSelecionada, onChange, contagem }: Props) {
  const ordem: ZonaSlug[] = ["TODAS", "ABAIXO_MIN", "INFERIOR", "MEDIO", "SUPERIOR", "ACIMA_MAX", "FORA_DO_IDEAL"];
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span
        className="text-[10px] uppercase tracking-wider mr-1"
        style={{ color: PAWARDS.colors.text.muted, fontFamily: "JetBrains Mono, monospace" }}
      >
        Zonas
      </span>
      {ordem.map((slug) => {
        const ativa = slug === zonaSelecionada;
        const meta = slug === "TODAS"
          ? { label: "TODAS", curto: "TODAS", cor: PAWARDS.colors.gold[500], icon: null as any }
          : slug === "FORA_DO_IDEAL"
          ? { label: "Fora do ideal", curto: "FORA DO IDEAL", cor: PAWARDS.colors.status.warning, icon: AlertTriangle }
          : ZONA_META[slug as Exclude<ZonaSlug, "TODAS" | "FORA_DO_IDEAL">];
        const Icon = (meta as any).icon;
        const n = contagem[slug];
        return (
          <Button
            key={slug}
            size="sm"
            variant="ghost"
            onClick={() => onChange(slug)}
            className="h-9 px-3 gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              borderRadius: 0,
              background: ativa ? meta.cor + "22" : "transparent",
              color: ativa ? meta.cor : PAWARDS.colors.text.secondary,
              border: `1px solid ${ativa ? meta.cor : meta.cor + "33"}`,
              boxShadow: ativa ? `inset 0 0 0 1px ${meta.cor}66, 0 0 8px ${meta.cor}33` : "none",
            }}
            data-testid={`btn-zona-${slug}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{meta.curto}</span>
            <span
              className="tabular-nums ml-1 px-1.5 py-0 rounded-none border"
              style={{
                background: meta.cor + (ativa ? "33" : "11"),
                borderColor: meta.cor + "55",
                color: meta.cor,
                fontSize: 10,
              }}
            >
              {n}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
