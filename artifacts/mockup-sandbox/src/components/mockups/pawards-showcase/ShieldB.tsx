export function ShieldB() {
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 32 }}>
      <svg width="160" height="180" viewBox="0 0 160 180">
        <defs>
          <linearGradient id="shieldB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8a96e" />
            <stop offset="100%" stopColor="#a8894e" />
          </linearGradient>
        </defs>
        <path d="M80 8 L148 35 L148 95 Q148 145 80 172 Q12 145 12 95 L12 35 Z" fill="none" stroke="url(#shieldB)" strokeWidth="3" />
        <path d="M80 20 L140 43 L140 93 Q140 138 80 162 Q20 138 20 93 L20 43 Z" fill="none" stroke="#c8a96e" strokeWidth="1" opacity="0.3" />
        <text x="80" y="85" textAnchor="middle" fill="#c8a96e" fontSize="56" fontWeight="300" fontFamily="'Inter', sans-serif" letterSpacing="2">P</text>
        <circle cx="80" cy="130" r="3" fill="#c8a96e" opacity="0.5" />
      </svg>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 24, fontWeight: 300, letterSpacing: 8 }}>PAWARDS</div>
        <div style={{ color: "#556688", fontSize: 9, letterSpacing: 3, marginTop: 6 }}>SISTEMA DE GESTAO SAUDE</div>
      </div>
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 13, fontWeight: 700 }}>B — MINIMALISTA</div>
        <div style={{ color: "#5566aa", fontSize: 10, marginTop: 4, maxWidth: 280, lineHeight: 1.5 }}>
          Escudo apenas contorno fino dourado. P leve (light weight). Elegante, moderno, limpo. Ideal para fundo escuro e claro.
        </div>
      </div>
    </div>
  );
}
