import { PAWARDS, getBand } from "@/lib/pawards-tokens";

interface GaugeProps {
  size?: number;
  value: number; // 0..100
  label: string;
  unit?: string;
  color?: string;
  display?: string;
}

export function Gauge({ size = 164, value, label, unit = "%", color, display }: GaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const band = getBand(Math.round(pct));
  const arcColor = color ?? band.color;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.08;
  const startAngle = -220;
  const endAngle = 40;
  const totalDeg = endAngle - startAngle;
  const valueDeg = startAngle + totalDeg * (pct / 100);

  function polarToXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arc(startA: number, endA: number, radius: number) {
    const s = polarToXY(startA, radius);
    const e = polarToXY(endA, radius);
    const large = endA - startA > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const needleEnd = polarToXY(valueDeg, r * 0.78);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arc(startAngle, endAngle, r)} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} strokeLinecap="round" />
        <path d={arc(startAngle, valueDeg, r)} fill="none"
          stroke={arcColor} strokeWidth={strokeW} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${band.glow})`, transition: "stroke-dasharray 0.8s ease" }} />
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y}
          stroke={PAWARDS.colors.text.primary} strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={size * 0.045}
          fill={PAWARDS.colors.bg[800]} stroke={arcColor} strokeWidth={1.5} />
        <text x={cx} y={cy + size * 0.13} textAnchor="middle"
          fill={PAWARDS.colors.text.primary} fontSize={size * 0.16} fontWeight={700}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          {display ?? Math.round(pct)}
        </text>
        <text x={cx} y={cy + size * 0.24} textAnchor="middle"
          fill={PAWARDS.colors.text.muted} fontSize={size * 0.08}>
          {unit}
        </text>
      </svg>
      <div
        style={{
          fontSize: 11, letterSpacing: "0.08em", fontWeight: 600,
          color: PAWARDS.colors.text.tertiary, textTransform: "uppercase", marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
