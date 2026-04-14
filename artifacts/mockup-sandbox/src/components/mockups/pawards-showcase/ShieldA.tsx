export function ShieldA() {
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 32 }}>
      <svg width="160" height="180" viewBox="0 0 160 180">
        <defs>
          <linearGradient id="shieldA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4a853" />
            <stop offset="50%" stopColor="#c8a96e" />
            <stop offset="100%" stopColor="#b8943e" />
          </linearGradient>
          <linearGradient id="innerA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a2647" />
            <stop offset="100%" stopColor="#144272" />
          </linearGradient>
        </defs>
        <path d="M80 8 L148 35 L148 95 Q148 145 80 172 Q12 145 12 95 L12 35 Z" fill="url(#shieldA)" />
        <path d="M80 18 L140 42 L140 93 Q140 138 80 162 Q20 138 20 93 L20 42 Z" fill="url(#innerA)" />
        <text x="80" y="78" textAnchor="middle" fill="#c8a96e" fontSize="48" fontWeight="800" fontFamily="'Inter', sans-serif" letterSpacing="3">P</text>
        <line x1="55" y1="92" x2="105" y2="92" stroke="#c8a96e" strokeWidth="1.5" opacity="0.6" />
        <rect x="74" y="100" width="12" height="28" rx="2" fill="none" stroke="#c8a96e" strokeWidth="1.5" />
        <rect x="68" y="108" width="24" height="12" rx="2" fill="none" stroke="#c8a96e" strokeWidth="1.5" />
      </svg>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 24, fontWeight: 800, letterSpacing: 4 }}>PAWARDS</div>
        <div style={{ color: "#7788aa", fontSize: 10, letterSpacing: 2, marginTop: 4 }}>SISTEMA DE GESTAO SAUDE</div>
      </div>
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 13, fontWeight: 700 }}>A — CLASSICO DOURADO</div>
        <div style={{ color: "#5566aa", fontSize: 10, marginTop: 4, maxWidth: 280, lineHeight: 1.5 }}>
          Escudo dourado solido com P central e cruz medica. Fundo azul navy. Aspecto tradicional e confiavel.
        </div>
      </div>
    </div>
  );
}
