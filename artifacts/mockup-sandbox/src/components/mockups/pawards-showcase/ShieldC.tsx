export function ShieldC() {
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 32 }}>
      <svg width="160" height="180" viewBox="0 0 160 180">
        <defs>
          <linearGradient id="shieldCbg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2847" />
            <stop offset="100%" stopColor="#091a33" />
          </linearGradient>
          <linearGradient id="shieldCgold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c868" />
            <stop offset="40%" stopColor="#c8a96e" />
            <stop offset="100%" stopColor="#a88a4e" />
          </linearGradient>
        </defs>
        <path d="M80 8 L148 35 L148 95 Q148 145 80 172 Q12 145 12 95 L12 35 Z" fill="url(#shieldCbg)" stroke="url(#shieldCgold)" strokeWidth="2.5" />
        <line x1="80" y1="30" x2="80" y2="55" stroke="#c8a96e" strokeWidth="1" opacity="0.4" />
        <line x1="80" y1="125" x2="80" y2="155" stroke="#c8a96e" strokeWidth="1" opacity="0.4" />
        <text x="80" y="82" textAnchor="middle" fill="#c8a96e" fontSize="44" fontWeight="700" fontFamily="'Inter', sans-serif">P</text>
        <text x="80" y="100" textAnchor="middle" fill="#c8a96e" fontSize="10" fontWeight="600" fontFamily="'Inter', sans-serif" letterSpacing="4" opacity="0.7">AWARDS</text>
        <line x1="40" y1="110" x2="120" y2="110" stroke="#c8a96e" strokeWidth="0.5" opacity="0.3" />
        <rect x="62" y="116" width="36" height="12" rx="6" fill="none" stroke="#c8a96e" strokeWidth="1" opacity="0.5" />
        <line x1="74" y1="119" x2="74" y2="125" stroke="#c8a96e" strokeWidth="1" opacity="0.5" />
        <line x1="80" y1="118" x2="80" y2="126" stroke="#c8a96e" strokeWidth="1" opacity="0.5" />
        <line x1="86" y1="119" x2="86" y2="125" stroke="#c8a96e" strokeWidth="1" opacity="0.5" />
      </svg>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 24, fontWeight: 700, letterSpacing: 5 }}>PAWARDS</div>
        <div style={{ color: "#4d6080", fontSize: 9, letterSpacing: 2, marginTop: 4 }}>SISTEMA DE GESTAO SAUDE</div>
      </div>
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ color: "#c8a96e", fontSize: 13, fontWeight: 700 }}>C — PREMIUM NAVY</div>
        <div style={{ color: "#5566aa", fontSize: 10, marginTop: 4, maxWidth: 280, lineHeight: 1.5 }}>
          Escudo preenchido azul navy com borda dourada grossa. P + "AWARDS" dentro do escudo. Detalhes de pulso medico na base. Sofisticado.
        </div>
      </div>
    </div>
  );
}
