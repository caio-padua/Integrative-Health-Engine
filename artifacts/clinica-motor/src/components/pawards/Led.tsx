interface LedProps {
  state: "online" | "warning" | "critical" | "excellent" | "offline" | "syncing";
  label: string;
  size?: number;
}

const LED_MAP: Record<LedProps["state"], { color: string; glow: string }> = {
  online: { color: "#30D158", glow: "rgba(48,209,88,0.9)" },
  warning: { color: "#FFD60A", glow: "rgba(255,214,10,0.85)" },
  critical: { color: "#FF453A", glow: "rgba(255,69,58,0.85)" },
  excellent: { color: "#0A84FF", glow: "rgba(10,132,255,0.85)" },
  offline: { color: "#8E8E93", glow: "rgba(142,142,147,0.5)" },
  syncing: { color: "#5AC8FA", glow: "rgba(90,200,250,0.85)" },
};

export function Led({ state, label, size = 10 }: LedProps) {
  const c = LED_MAP[state];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: c.color,
          boxShadow: `0 0 4px ${c.glow}, 0 0 10px ${c.glow}55, 0 0 18px ${c.glow}22`,
          position: "relative", flexShrink: 0,
          animation: state === "syncing" ? "pawardsPulse 1.6s ease-in-out infinite" : undefined,
        }}
      >
        <div
          style={{
            position: "absolute", inset: "18%", borderRadius: "50%",
            background: "rgba(255,255,255,0.55)", filter: "blur(1px)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10, letterSpacing: "0.08em", fontWeight: 600,
          color: "#AAB4C3", textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes pawardsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
