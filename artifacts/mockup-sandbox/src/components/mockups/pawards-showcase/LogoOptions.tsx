export function LogoOptions() {
  const logos = [
    { src: "/__mockup/images/logo_pawards_01_shield.png", name: "01 - SHIELD", desc: "Escudo protetor com cruz medica" },
    { src: "/__mockup/images/logo_pawards_02_pulse.png", name: "02 - PULSE", desc: "Linha de batimento cardiaco" },
    { src: "/__mockup/images/logo_pawards_03_molecular.png", name: "03 - MOLECULAR", desc: "Elementos moleculares / ciencia" },
    { src: "/__mockup/images/logo_pawards_04_stethoscope.png", name: "04 - STETHOSCOPE", desc: "Estetoscopio dourado classico" },
    { src: "/__mockup/images/logo_pawards_05_progress.png", name: "05 - PROGRESS", desc: "Seta ascendente / crescimento" },
    { src: "/__mockup/images/logo_pawards_06_pw_mark.png", name: "06 - PW MARK", desc: "Monograma P+W compacto" },
  ];

  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", padding: 32, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#c8a96e", fontSize: 28, fontWeight: 700, letterSpacing: 3, margin: 0 }}>
          PAWARDS — 6 OPCOES DE LOGO
        </h1>
        <p style={{ color: "#8899aa", fontSize: 14, marginTop: 8 }}>
          Escolha o conceito que melhor representa o sistema
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 1100, margin: "0 auto" }}>
        {logos.map((logo, i) => (
          <div key={i} style={{
            background: "#111d33",
            borderRadius: 12,
            border: "1px solid #1e3050",
            padding: 20,
            textAlign: "center",
            transition: "border-color 0.3s",
          }}>
            <div style={{
              background: "#0d1a2e",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 140,
            }}>
              <img src={logo.src} alt={logo.name} style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ color: "#c8a96e", fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
              {logo.name}
            </div>
            <div style={{ color: "#7788aa", fontSize: 12, marginTop: 6 }}>
              {logo.desc}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 32,
        background: "#111d33",
        borderRadius: 12,
        border: "1px solid #c8a96e33",
        padding: 20,
        textAlign: "center",
      }}>
        <div style={{ color: "#c8a96e", fontSize: 14, fontWeight: 600 }}>
          O logo escolhido sera aplicado em:
        </div>
        <div style={{ color: "#7788aa", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
          Header dos PDFs (RAS, Receitas, Laudos) &bull; Tela do Sistema &bull; E-mails &bull; WhatsApp
        </div>
      </div>
    </div>
  );
}
