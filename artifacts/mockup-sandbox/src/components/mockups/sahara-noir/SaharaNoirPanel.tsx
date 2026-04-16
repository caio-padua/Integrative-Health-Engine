import { useState } from "react";

/* ─── Alertas ─── */
const ALERT_STATES = [
  { key: "ok",      label: "ESTÁVEL",  color: "#00A85A", glow: "#00CC6A", light: "#E8FFF3" },
  { key: "atencao", label: "ATENÇÃO",  color: "#C4900A", glow: "#F0B020", light: "#FFFBE8" },
  { key: "alerta",  label: "ALERTA",   color: "#7B2FD4", glow: "#A855F7", light: "#F5EEFF" },
  { key: "critico", label: "CRÍTICO",  color: "#CC1B1B", glow: "#EF4444", light: "#FFF0F0" },
];

const PATIENTS = [
  { id: "P001", nome: "Fernanda M. Costa",  proc: "INFU EV — NAD⁺",       status: "ok",      hora: "09:00", unidade: "Pádua — Vila Formosa" },
  { id: "P002", nome: "Roberto A. Lima",     proc: "IM — Complexo B",       status: "atencao", hora: "09:30", unidade: "Pádua — Tatuapé"       },
  { id: "P003", nome: "Mariana S. Rocha",    proc: "IMPL — Testosterona",   status: "alerta",  hora: "10:00", unidade: "Pádua — Vila Formosa" },
  { id: "P004", nome: "Dr. Caio H. Pádua",  proc: "CPRE — Consulta",       status: "ok",      hora: "10:30", unidade: "Instituto Pádua"       },
  { id: "P005", nome: "Cristina P. Mendes",  proc: "EXAM — Densitometria",  status: "critico", hora: "11:00", unidade: "Pádua — Moema"          },
];

/* ─── Sinaleiro: domo de vidro com borda dourada ─── */
function Sinaleiro({ status, size = 28 }: { status: string; size?: number }) {
  const st = ALERT_STATES.find(s => s.key === status) || ALERT_STATES[0];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Anel de metal dourado */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "linear-gradient(145deg, #D4A843 0%, #8B6010 40%, #3A2808 70%, #C9A84C 100%)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.12)",
      }} />
      {/* Cavidade interna escura */}
      <div style={{
        position: "absolute", inset: 2.5, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 70%, #1A0A0A, #0A0A0A)",
      }} />
      {/* Luz concentrada da cor */}
      <div style={{
        position: "absolute", inset: 3.5, borderRadius: "50%",
        background: `radial-gradient(circle at 50% 65%, ${st.glow} 0%, ${st.color} 30%, ${st.color}44 58%, transparent 78%)`,
        boxShadow: `inset 0 0 ${size * 0.3}px ${st.color}88`,
      }} />
      {/* Reflexo de vidro — cúpula */}
      <div style={{
        position: "absolute", top: "11%", left: "21%",
        width: "44%", height: "27%", borderRadius: "50%",
        background: "linear-gradient(155deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.28) 55%, transparent 100%)",
        filter: "blur(0.25px)", transform: "rotate(-18deg)", pointerEvents: "none",
      }} />
      {/* Mini reflexo */}
      <div style={{
        position: "absolute", bottom: "19%", right: "19%",
        width: "14%", height: "9%", borderRadius: "50%",
        background: "rgba(255,255,255,0.22)", pointerEvents: "none",
      }} />
      {/* Halo externo contido */}
      <div style={{
        position: "absolute", inset: -2, borderRadius: "50%",
        border: `1px solid ${st.color}55`,
        boxShadow: `0 0 5px ${st.color}44`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Mármore Statuario — fundo branco com veias diagonais cinza ─── */
function StatuarioBackground({ alertColor }: { alertColor: string }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Filtro de veia suave */}
        <filter id="veiaSuave" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Neon de alerta contido */}
        <filter id="neonAlert" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradientes das veias — cinza Statuario */}
        <linearGradient id="vD1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#B0AEA8" stopOpacity="0" />
          <stop offset="20%"  stopColor="#8A8880" stopOpacity="0.55" />
          <stop offset="50%"  stopColor="#9A9890" stopOpacity="0.4" />
          <stop offset="80%"  stopColor="#7A7870" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#9A9890" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vD2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#C8C6C0" stopOpacity="0" />
          <stop offset="30%"  stopColor="#A8A6A0" stopOpacity="0.35" />
          <stop offset="60%"  stopColor="#C0BEB8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#B0AEA8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vD3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5A5850" stopOpacity="0" />
          <stop offset="40%"  stopColor="#6A6860" stopOpacity="0.45" />
          <stop offset="70%"  stopColor="#5A5850" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7A7870" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vD4" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#D0CEC8" stopOpacity="0" />
          <stop offset="35%"  stopColor="#B8B6B0" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C0BEB8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={alertColor} stopOpacity="0" />
          <stop offset="40%"  stopColor={alertColor} stopOpacity="0.35" />
          <stop offset="60%"  stopColor={alertColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={alertColor} stopOpacity="0" />
        </linearGradient>

        {/* Gradiente de luz especular — vidro polido */}
        <linearGradient id="vidroLuz" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* ── BASE: Branco Statuario ── */}
      <rect width="100%" height="100%" fill="#F2F0EC" />

      {/* ── VEIAS DIAGONAIS — estilo Statuario real ── */}
      {/* Veia principal diagonal grossa */}
      <path
        d="M -50 900 Q 200 650 400 500 Q 600 350 900 150 Q 1050 60 1400 -50"
        stroke="url(#vD3)" strokeWidth="4" fill="none" opacity="0.55" filter="url(#veiaSuave)"
      />
      {/* Veia paralela secundária */}
      <path
        d="M -50 750 Q 150 580 320 420 Q 520 240 800 80 Q 1000 -10 1300 -50"
        stroke="url(#vD1)" strokeWidth="2" fill="none" opacity="0.5" filter="url(#veiaSuave)"
      />
      {/* Veia fina acompanhante */}
      <path
        d="M -50 820 Q 180 640 380 490 Q 570 340 860 130 Q 1100 20 1400 -30"
        stroke="url(#vD2)" strokeWidth="1" fill="none" opacity="0.35"
      />

      {/* Grupo de veias no canto superior direito */}
      <path
        d="M 900 -50 Q 1050 100 1150 250 Q 1280 420 1450 600"
        stroke="url(#vD1)" strokeWidth="3" fill="none" opacity="0.45" filter="url(#veiaSuave)"
      />
      <path
        d="M 980 -50 Q 1120 120 1220 280 Q 1350 460 1450 680"
        stroke="url(#vD2)" strokeWidth="1.2" fill="none" opacity="0.3"
      />

      {/* Veias finas transversais delicadas */}
      <path
        d="M -50 200 Q 300 280 600 240 Q 900 200 1400 320"
        stroke="url(#vD4)" strokeWidth="0.8" fill="none" opacity="0.28"
      />
      <path
        d="M -50 550 Q 400 480 700 510 Q 1000 540 1400 450"
        stroke="url(#vD4)" strokeWidth="0.6" fill="none" opacity="0.22"
      />

      {/* Veia característica do Statuario — diagonal longa escura */}
      <path
        d="M 100 900 Q 350 720 550 560 Q 750 400 950 220 Q 1150 60 1350 -50"
        stroke="url(#vD3)" strokeWidth="1.5" fill="none" opacity="0.4"
      />

      {/* ── EFEITO VIDRO: reflexo especular no topo-esquerda ── */}
      <rect width="100%" height="100%" fill="url(#vidroLuz)" opacity="0.6" />

      {/* Linha de alerta sutil */}
      <path
        d="M -50 900 Q 200 650 400 500 Q 600 350 900 150 Q 1050 60 1400 -50"
        stroke={alertColor} strokeWidth="1.5" fill="none"
        opacity="0.25" filter="url(#neonAlert)"
      />
    </svg>
  );
}

/* ─── Botão de filtro — glassmorphism sobre mármore ─── */
function BotaoFiltro({ label, ativo, cor, onClick }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "5px 11px",
        fontSize: 10, fontFamily: "monospace",
        letterSpacing: "0.09em", textTransform: "uppercase" as any,
        cursor: "pointer", fontWeight: ativo ? 700 : 500,
        transition: "all 0.15s", border: "none", borderRadius: 3,
        background: ativo
          ? cor ? `${cor}22` : "rgba(201,168,76,0.18)"
          : hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.38)",
        color: ativo ? (cor || "#8B6010") : hovered ? "#3A3028" : "#6A5C48",
        boxShadow: ativo
          ? `inset 0 0 0 1.5px ${cor || "#C9A84C"}88, 0 1px 3px rgba(0,0,0,0.15), 0 0 7px ${cor || "#C9A84C"}33`
          : hovered
          ? "0 3px 0 rgba(0,0,0,0.18), 0 3px 7px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.9)"
          : "0 3px 0 rgba(0,0,0,0.14), 0 3px 5px rgba(0,0,0,0.09), inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.8)",
        backdropFilter: "blur(8px)",
        transform: ativo ? "translateY(2px)" : "translateY(0)",
        textShadow: ativo && cor ? `0 0 5px ${cor}88` : "none",
        minWidth: 52,
      }}
    >
      {label}
    </button>
  );
}

/* ─── Linha de paciente sobre mármore com vidro ─── */
function PatientRow({ patient, onSelect, selected }: any) {
  const st = ALERT_STATES.find(s => s.key === patient.status) || ALERT_STATES[0];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(patient)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 14px 11px 16px",
        marginBottom: 4, borderRadius: 3,
        position: "relative", cursor: "pointer",
        transition: "all 0.15s",
        backdropFilter: "blur(12px)",
        background: selected
          ? `rgba(255,255,255,0.68)`
          : hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.38)",
        /* Bordas: esquerda = barra em negrito, resto = neon sutil */
        boxShadow: selected
          ? [
            `inset 4px 0 0 ${st.color}`,
            `inset 0 1.5px 0 ${st.color}66`,
            `inset -1px 0 0 ${st.color}44`,
            `inset 0 -1.5px 0 ${st.color}66`,
            `0 0 10px ${st.color}22`,
            `0 3px 10px rgba(0,0,0,0.12)`,
          ].join(", ")
          : hovered
          ? [
            `inset 3px 0 0 ${st.color}99`,
            `inset 0 1px 0 rgba(255,255,255,0.8)`,
            `inset -1px 0 0 rgba(200,198,192,0.5)`,
            `inset 0 -1px 0 rgba(200,198,192,0.4)`,
            `0 2px 8px rgba(0,0,0,0.09)`,
          ].join(", ")
          : [
            `inset 3px 0 0 ${st.color}55`,
            `inset 0 1px 0 rgba(255,255,255,0.7)`,
            `inset -1px 0 0 rgba(200,198,192,0.35)`,
            `inset 0 -1px 0 rgba(200,198,192,0.3)`,
          ].join(", "),
      }}
    >
      <Sinaleiro status={patient.status} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: selected ? "#1A1510" : "#2A2018",
          fontSize: 12.5, fontWeight: 600,
          letterSpacing: "0.025em", fontFamily: "monospace",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {patient.nome}
        </div>
        <div style={{ color: "#7A6A50", fontSize: 10.5, marginTop: 2, letterSpacing: "0.03em" }}>
          {patient.proc} · {patient.unidade}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: "#8B6010", fontSize: 11.5, fontFamily: "monospace", fontWeight: 700 }}>
          {patient.hora}
        </div>
        <div style={{
          fontSize: 9.5, letterSpacing: "0.1em", marginTop: 3,
          color: st.color, textShadow: `0 0 4px ${st.glow}88`,
          fontFamily: "monospace", fontWeight: 700,
        }}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

/* ─── Botão de ação — vidro 3D alto relevo ─── */
function BotaoAcao({ label, icon, color = "#8B6010", onClick, active }: any) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); setHovered(false); }}
      onMouseEnter={() => setHovered(true)}
      onClick={onClick}
      style={{
        background: pressed
          ? "rgba(200,198,190,0.55)"
          : active
          ? "rgba(255,255,255,0.72)"
          : hovered ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.50)",
        backdropFilter: "blur(10px)",
        color: active ? color : hovered ? "#3A2A10" : "#5A4A30",
        padding: "8px 18px",
        fontSize: 10.5, fontFamily: "monospace",
        letterSpacing: "0.1em", fontWeight: 700,
        cursor: "pointer", textTransform: "uppercase" as any,
        border: "none", borderRadius: 3,
        boxShadow: pressed
          ? [
            "inset 2px 2px 5px rgba(0,0,0,0.18)",
            "inset -1px -1px 2px rgba(255,255,255,0.6)",
            `inset 0 0 0 1px ${active ? color + "44" : "rgba(180,175,165,0.5)"}`,
            "0 1px 0 rgba(255,255,255,0.5)",
          ].join(", ")
          : active
          ? [
            "0 4px 0 rgba(0,0,0,0.18)",
            "0 5px 10px rgba(0,0,0,0.14)",
            "inset 0 1px 0 rgba(255,255,255,0.95)",
            "inset 1px 0 0 rgba(255,255,255,0.7)",
            `inset 0 0 0 1px ${color}55`,
            `0 0 8px ${color}33`,
          ].join(", ")
          : [
            "0 4px 0 rgba(0,0,0,0.14)",
            "0 5px 9px rgba(0,0,0,0.10)",
            "inset 0 1px 0 rgba(255,255,255,0.90)",
            "inset 1px 0 0 rgba(255,255,255,0.65)",
            "inset 0 0 0 1px rgba(180,175,165,0.45)",
          ].join(", "),
        transform: pressed ? "translateY(3px)" : "translateY(0)",
        textShadow: active ? `0 0 5px ${color}88` : "none",
        transition: "all 0.07s", minWidth: 72,
      }}
    >
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
      {label}
    </button>
  );
}

/* ─── Painel de vidro — glassmorphism ─── */
function GlassPanel({ children, style = {} }: any) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.52)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: [
        "inset 0 1px 0 rgba(255,255,255,0.85)",
        "inset 1px 0 0 rgba(255,255,255,0.6)",
        "0 4px 20px rgba(0,0,0,0.08)",
        "0 1px 3px rgba(0,0,0,0.06)",
      ].join(", "),
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── PAINEL PRINCIPAL ─── */
export default function SaharaNoirPanel() {
  const [selected, setSelected] = useState<any>(PATIENTS[0]);
  const [filtro, setFiltro] = useState("todos");

  const alertPrincipal = selected
    ? (ALERT_STATES.find(s => s.key === selected.status) || ALERT_STATES[0])
    : ALERT_STATES[0];

  const filtered = filtro === "todos" ? PATIENTS : PATIENTS.filter(p => p.status === filtro);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F2F0EC",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column",
      color: "#1E1810",
      position: "relative", overflow: "hidden",
    }}>
      <StatuarioBackground alertColor={alertPrincipal.glow} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* ── Header vidro ── */}
        <GlassPanel style={{
          padding: "13px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: [
            "inset 0 -1px 0 rgba(180,175,165,0.4)",
            "inset 0 1px 0 rgba(255,255,255,0.9)",
            "0 4px 20px rgba(0,0,0,0.07)",
          ].join(", "),
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 34, height: 34, flexShrink: 0,
              background: "linear-gradient(135deg, #C9A84C 0%, #7a4e08 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#fff",
              clipPath: "polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)",
            }}>Ⓟ</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "#8B6010" }}>
                PAWARDS
              </div>
              <div style={{ fontSize: 8.5, color: "#9A8060", letterSpacing: "0.28em", marginTop: 1 }}>
                MEDCORE · SISTEMA CLÍNICO INTELIGENTE
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Sinaleiro status={st.key} size={17} />
                <span style={{ fontSize: 10, color: "#6A5A40", fontFamily: "monospace", fontWeight: 600 }}>
                  {PATIENTS.filter(p => p.status === st.key).length}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 18, background: "rgba(160,150,130,0.35)", margin: "0 4px" }} />
            <div style={{ fontSize: 10.5, color: "#7A6A50", fontFamily: "monospace", letterSpacing: "0.08em" }}>
              16.04.2026 · 09:04
            </div>
          </div>
        </GlassPanel>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Painel esquerdo ── */}
          <div style={{
            width: 338, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(14px)",
            boxShadow: "inset -1px 0 0 rgba(180,175,165,0.38)",
          }}>
            {/* Filtros */}
            <div style={{
              padding: "10px 12px",
              display: "flex", gap: 5, flexWrap: "wrap" as any,
              alignItems: "center",
              boxShadow: "inset 0 -1px 0 rgba(180,175,165,0.35)",
            }}>
              <BotaoFiltro label="TODOS" ativo={filtro === "todos"} cor="#8B6010" onClick={() => setFiltro("todos")} />
              {ALERT_STATES.map(st => (
                <BotaoFiltro
                  key={st.key}
                  label={st.label}
                  ativo={filtro === st.key}
                  cor={st.color}
                  onClick={() => setFiltro(st.key)}
                />
              ))}
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "8px" }}>
              {filtered.map(p => (
                <PatientRow key={p.id} patient={p} onSelect={setSelected} selected={selected?.id === p.id} />
              ))}
            </div>

            {/* Botões base */}
            <div style={{
              padding: "10px 12px", display: "flex", gap: 7,
              boxShadow: "inset 0 1px 0 rgba(180,175,165,0.35)",
            }}>
              <BotaoAcao label="+ Novo" icon="⊕" />
              <BotaoAcao label="Sync"   icon="↻" color="#7A6A50" />
            </div>
          </div>

          {/* ── Painel direito: detalhe ── */}
          <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto" as any }}>
            {selected ? (
              <div>
                {/* Card principal */}
                <GlassPanel style={{
                  padding: "15px 18px",
                  marginBottom: 14, borderRadius: 4,
                  position: "relative",
                  boxShadow: [
                    `inset 0 3px 0 ${alertPrincipal.color}`,
                    `inset 1px 0 0 ${alertPrincipal.color}33`,
                    "inset -1px 0 0 rgba(200,195,185,0.45)",
                    "inset 0 -1px 0 rgba(200,195,185,0.45)",
                    `0 0 20px ${alertPrincipal.color}14`,
                    "0 6px 20px rgba(0,0,0,0.10)",
                    "inset 0 1px 0 rgba(255,255,255,0.95)",
                  ].join(", "),
                }}>
                  {/* Neon borda superior */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: alertPrincipal.color,
                    boxShadow: `0 0 7px ${alertPrincipal.glow}BB, 0 0 14px ${alertPrincipal.glow}44`,
                    borderRadius: "4px 4px 0 0", pointerEvents: "none",
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <Sinaleiro status={selected.status} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1510", letterSpacing: "0.03em" }}>
                        {selected.nome}
                      </div>
                      <div style={{ color: "#7A6A50", fontSize: 11.5, marginTop: 4, letterSpacing: "0.04em" }}>
                        {selected.id} · {selected.unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 22, fontWeight: 900, fontFamily: "monospace",
                        color: alertPrincipal.color,
                        textShadow: `0 0 8px ${alertPrincipal.glow}88`,
                      }}>
                        {selected.hora}
                      </div>
                      <div style={{
                        fontSize: 10.5, letterSpacing: "0.14em",
                        color: alertPrincipal.color, fontFamily: "monospace", fontWeight: 700,
                      }}>
                        {alertPrincipal.label}
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Grid metadados */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "PROCEDIMENTO", valor: selected.proc,       icon: "◈", destaque: false },
                    { label: "STATUS ATUAL",  valor: alertPrincipal.label, icon: "◉", destaque: true  },
                    { label: "UNIDADE",       valor: selected.unidade,    icon: "◎", destaque: false },
                    { label: "HORÁRIO",       valor: selected.hora,       icon: "◷", destaque: false },
                  ].map((item, i) => (
                    <GlassPanel key={i} style={{
                      padding: "12px 14px", borderRadius: 3,
                      boxShadow: item.destaque
                        ? [
                          `inset 4px 0 0 ${alertPrincipal.color}`,
                          `inset 0 1.5px 0 ${alertPrincipal.color}44`,
                          "inset -1px 0 0 rgba(200,195,185,0.4)",
                          "inset 0 -1.5px 0 rgba(200,195,185,0.4)",
                          `0 0 12px ${alertPrincipal.color}14`,
                          "0 3px 10px rgba(0,0,0,0.09)",
                          "inset 0 1px 0 rgba(255,255,255,0.95)",
                        ].join(", ")
                        : [
                          "inset 0 0 0 1px rgba(195,190,180,0.4)",
                          "0 3px 8px rgba(0,0,0,0.07)",
                          "inset 0 1px 0 rgba(255,255,255,0.9)",
                        ].join(", "),
                    }}>
                      <div style={{ fontSize: 9, color: "#9A8A68", letterSpacing: "0.18em", marginBottom: 6 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, fontFamily: "monospace",
                        color: item.destaque ? alertPrincipal.color : "#8B6010",
                        textShadow: item.destaque ? `0 0 5px ${alertPrincipal.glow}66` : "none",
                      }}>
                        {item.valor}
                      </div>
                    </GlassPanel>
                  ))}
                </div>

                {/* Botões de ação */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as any }}>
                  <BotaoAcao label="Visualizar RAS"  icon="▶" color="#8B6010" active />
                  <BotaoAcao label="Remarcar"        icon="↺" />
                  <BotaoAcao label="Validar Código"  icon="◈" />
                  <BotaoAcao label="Upload Exame"    icon="↑" />
                </div>

                {/* Linha de atividade */}
                <GlassPanel style={{
                  marginTop: 18, padding: "10px 14px", borderRadius: 3,
                  boxShadow: [
                    "inset 0 0 0 1px rgba(195,190,180,0.38)",
                    `inset 0 -2px 0 ${alertPrincipal.color}22`,
                    "0 2px 8px rgba(0,0,0,0.06)",
                    "inset 0 1px 0 rgba(255,255,255,0.9)",
                  ].join(", "),
                }}>
                  <div style={{ fontSize: 9, color: "#9A8A68", letterSpacing: "0.22em", marginBottom: 8 }}>
                    ◈ LINHA DE ATIVIDADE
                  </div>
                  {[
                    { t: "09:02", ev: "Check-in realizado",    dot: "#00A85A" },
                    { t: "09:00", ev: "Procedimento iniciado", dot: "#C4900A" },
                    { t: "08:45", ev: "Triagem completa",      dot: "#A09070" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.dot, boxShadow: `0 0 4px ${item.dot}AA`, flexShrink: 0,
                      }} />
                      <span style={{ color: "#9A8A68", fontSize: 10, fontFamily: "monospace", width: 36 }}>
                        {item.t}
                      </span>
                      <span style={{ color: "#5A4A30", fontSize: 11 }}>{item.ev}</span>
                    </div>
                  ))}
                </GlassPanel>
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: "#9A8A70", letterSpacing: "0.1em",
              }}>
                Selecione um paciente
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <GlassPanel style={{
          padding: "8px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(255,255,255,0.62)",
          boxShadow: [
            "inset 0 1px 0 rgba(180,175,165,0.4)",
            "0 -2px 10px rgba(0,0,0,0.05)",
          ].join(", "),
        }}>
          <div style={{ fontSize: 8.5, color: "#9A8A68", letterSpacing: "0.18em" }}>
            PAWARDS MEDCORE · INSTITUTO PÁDUA · RASX-MATRIZ V6
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: st.color, boxShadow: `0 0 4px ${st.glow}AA`,
                }} />
                <span style={{ fontSize: 8.5, color: "#7A6A50", letterSpacing: "0.07em" }}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
