interface BarraSinapticaProps {
  label: string;
  valor: number;
  total: number;
  cor?: string;
  sufixo?: string;
  destaque?: string;
}

export function BarraSinaptica({
  label,
  valor,
  total,
  cor = "#5EE6E6",
  sufixo,
  destaque,
}: BarraSinapticaProps) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;

  return (
    <div className="space-y-1" data-testid={`barra-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <span className="font-mono text-xs font-bold" style={{ color: cor }}>
          {valor.toLocaleString("pt-BR")}
          {sufixo && <span className="text-muted-foreground text-[10px] ml-1">{sufixo}</span>}
          {destaque && <span className="text-muted-foreground text-[10px] ml-1">/ {destaque}</span>}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 overflow-hidden relative">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: cor,
            boxShadow: `0 0 8px ${cor}66`,
          }}
        />
      </div>
    </div>
  );
}
