import { useMemo } from "react";

interface RelogioPercentualProps {
  valor: number;
  total?: number;
  label: string;
  sublabel?: string;
  cor?: string;
  tamanho?: number;
  formato?: "percentual" | "absoluto";
}

export function RelogioPercentual({
  valor,
  total = 100,
  label,
  sublabel,
  cor = "#5EE6E6",
  tamanho = 96,
  formato = "percentual",
}: RelogioPercentualProps) {
  const pct = useMemo(() => {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, (valor / total) * 100));
  }, [valor, total]);

  const raio = (tamanho - 12) / 2;
  const circ = 2 * Math.PI * raio;
  const offset = circ - (pct / 100) * circ;
  const centro = tamanho / 2;

  return (
    <div className="flex flex-col items-center gap-1.5" data-testid={`relogio-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="relative" style={{ width: tamanho, height: tamanho }}>
        <svg width={tamanho} height={tamanho} className="-rotate-90">
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 6px ${cor}44)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold leading-none"
            style={{ color: cor, fontSize: tamanho * 0.22 }}
          >
            {formato === "percentual" ? `${Math.round(pct)}%` : valor.toLocaleString("pt-BR")}
          </span>
          {sublabel && (
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-center max-w-[120px]">
        {label}
      </span>
    </div>
  );
}
