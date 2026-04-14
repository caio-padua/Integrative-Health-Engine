export function ShieldD() {
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 32 }}>
      <svg width="160" height="180" viewBox="0 0 160 180">
        <defs>
          <linearGradient id="shieldDgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0c060" />
            <stop offset="30%" stopColor="#c8a96e" />
            <stop offset="70%" stopColor="#0a2647" />
            <stop offset="100%" stopColor="#081c38" />
          </linearGradient>
          <linearGradient id="shieldDstroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c868" />
            <stop offset="100%" stopColor="#b8943e" />
          </linearGradient>
        </defs>
        <path d="M80 8 L148 35 L148 95 Q148 145 80 172 Q12 145 12 95 L12 35 Z" fill="url(#shieldDgrad)" stroke="url(#shieldDstroke)" strokeWidth="2" />
        <path d="M80 16 L142 40 L142 93 Q142 140 80 164 Q18 140 18 93 L18 40 Z" fill="none" stroke="#ffffff15" strokeWidth="1" />
        <text x="80" y="70" textAnchor="middle" fill="white" fontSize="40" fontWeight="800" fontFamily="'Inter', sans-serif" letterSpacing="2">P</text>
        <text x="80" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="400" fontFamily="'Inter', sans-serif" letterSpacing="4" opacity="0.8">AWARDS</text>
        <line x1="50" y1="94" x2="110" y2="94" stroke="white" strokeWidth="0.5" opacity="0.3" />
        <rect x="70" y="102" width="20" height="20" rx="2" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1="76" y1="102" x2="76" y2="122" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="84" y1="102" x2="84" y2="122" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="70" y1="109" x2="90" y2="109" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="70" y1="115" x2="90" y2="115" stroke="white" strokeWidth="1" opacity="0.5" />
        <circle cx="45" cy="60" r="2" fill="#c8a96e" opacity="0.3" />
        <circle cx="115" cy="60" r="2" fill="#c8a96e" opacity="0.3" />
        <circle cx="40" cy="85" r="1.5" fill="#c8a96e" opacity="0.2" />
        <circle cx="120" cy="85" r="1.5" fill="#c8a96e" opacity="0.2" />
      </svg>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(90deg, #e8c868, #c8a96e, #b8943e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 5,
        }}>PAWARDS</div>
        <div style={{ color: "#4d6080", fontSize: 9, letterSpacing: 2, marginTop: 4 }}>SISTEMA DE GESTAO SAUDE</div>
      </div>
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 13, fontWeight: 700 }}>D — GRADIENTE MODERNO</div>
        <div style={{ color: "#5566aa", fontSize: 10, marginTop: 4, maxWidth: 280, lineHeight: 1.5 }}>
          Escudo com gradiente dourado→navy (topo para base). P branco sobre fundo misto. Cruz medica estilizada. Pontos decorativos laterais. Texto gradiente.
        </div>
      </div>
    </div>
  );
}
