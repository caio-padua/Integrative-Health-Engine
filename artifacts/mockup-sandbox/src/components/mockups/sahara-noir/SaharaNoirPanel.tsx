import { useState } from "react";

/* ─── Paleta de alertas ─── */
const ALERT_STATES = [
  { key: "ok",      label: "ESTÁVEL",  color: "#00E87A", text: "#00FF88" },
  { key: "atencao", label: "ATENÇÃO",  color: "#FFD700", text: "#FFE033" },
  { key: "alerta",  label: "ALERTA",   color: "#C86FFF", text: "#D488FF" },
  { key: "critico", label: "CRÍTICO",  color: "#FF4444", text: "#FF6666" },
];

const PATIENTS = [
  { id: "P001", nome: "Fernanda M. Costa",  proc: "INFU EV — NAD⁺",       status: "ok",      hora: "09:00", unidade: "Pádua — Vila Formosa" },
  { id: "P002", nome: "Roberto A. Lima",     proc: "IM — Complexo B",       status: "atencao", hora: "09:30", unidade: "Pádua — Tatuapé" },
  { id: "P003", nome: "Mariana S. Rocha",    proc: "IMPL — Testosterona",   status: "alerta",  hora: "10:00", unidade: "Pádua — Vila Formosa" },
  { id: "P004", nome: "Dr. Caio H. Pádua",  proc: "CPRE — Consulta",       status: "ok",      hora: "10:30", unidade: "Instituto Pádua" },
  { id: "P005", nome: "Cristina P. Mendes",  proc: "EXAM — Densitometria",  status: "critico", hora: "11:00", unidade: "Pádua — Moema" },
];

/* ─── Cores do tema — Grafite Médio (mais legível) ─── */
const T = {
  bg:         "#252535",   // fundo principal — grafite médio
  panel:      "#1E1E2E",   // painéis e cards
  panelAlt:   "#2A2A3E",   // cards levemente mais claros
  border:     "#3E3E5A",   // bordas padrão visíveis
  borderDim:  "#2E2E46",   // bordas secundárias
  gold:       "#C9A84C",
  goldBright: "#E0C06A",
  textPrimary:"#F0EAD6",   // texto principal — creme claro bem legível
  textSub:    "#A09070",   // texto secundário — dourado-cinza
  textDim:    "#6A6080",   // texto terciário
};

/* ─── Sinaleiro: domo de vidro com borda dourada e luz concentrada ─── */
function Sinaleiro({ status, size = 28 }: { status: string; size?: number }) {
  const st = ALERT_STATES.find(s => s.key === status) || ALERT_STATES[0];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Anel externo de metal — borda dourada visível */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: "linear-gradient(145deg, #C9A84C 0%, #7a4e08 40%, #3a2a10 70%, #C9A84C 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 0 1px #0a0a1888",
      }} />

      {/* Aro interno de sombra (profundidade da cápsula) */}
      <div style={{
        position: "absolute", inset: 2.5,
        borderRadius: "50%",
        background: "#0A0A18",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.9)",
      }} />

      {/* Domo de vidro — luz concentrada no centro/baixo */}
      <div style={{
        position: "absolute",
        inset: 3.5,
        borderRadius: "50%",
        background: `radial-gradient(circle at 50% 65%, ${st.color} 0%, ${st.color}BB 20%, ${st.color}55 45%, rgba(15,15,25,0.9) 75%)`,
        boxShadow: `inset 0 0 ${size * 0.25}px ${st.color}99`,
      }} />

      {/* Reflexo de vidro superior — concentrado, nítido */}
      <div style={{
        position: "absolute",
        top: "12%", left: "22%",
        width: "42%", height: "26%",
        borderRadius: "50%",
        background: "linear-gradient(155deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.25) 55%, transparent 100%)",
        filter: "blur(0.3px)",
        transform: "rotate(-18deg)",
        pointerEvents: "none",
      }} />

      {/* Micro-reflexo secundário */}
      <div style={{
        position: "absolute",
        bottom: "20%", right: "20%",
        width: "14%", height: "9%",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.20)",
        pointerEvents: "none",
      }} />

      {/* Halo externo contido */}
      <div style={{
        position: "absolute",
        inset: -2,
        borderRadius: "50%",
        border: `1px solid ${st.color}66`,
        boxShadow: `0 0 5px ${st.color}55`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Fundo: grafite com veios dourados e reflexo especular ─── */
function SaharaBackground({ alertColor }: { alertColor: string }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="neonLine" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="1.0" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="especular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.05)" />
          <stop offset="30%"  stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="veia1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#C9A84C" stopOpacity="0" />
          <stop offset="35%"  stopColor="#C9A84C" stopOpacity="0.45" />
          <stop offset="65%"  stopColor="#C9A84C" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="veia2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#B8922A" stopOpacity="0" />
          <stop offset="40%"  stopColor="#B8922A" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#B8922A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="veiaAlert" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={alertColor} stopOpacity="0" />
          <stop offset="40%"  stopColor={alertColor} stopOpacity="0.55" />
          <stop offset="60%"  stopColor={alertColor} stopOpacity="0.55" />
          <stop offset="100%" stopColor={alertColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base grafite */}
      <rect width="100%" height="100%" fill={T.bg} />
      {/* Reflexo especular */}
      <rect width="100%" height="100%" fill="url(#especular)" />

      {/* Veios dourados */}
      <line x1="0" y1="115" x2="1400" y2="88"   stroke="url(#veia1)" strokeWidth="0.9" opacity="0.7" />
      <line x1="0" y1="445" x2="900"  y2="195"  stroke="url(#veia1)" strokeWidth="1.2" opacity="0.55" />
      <line x1="0" y1="610" x2="1400" y2="575"  stroke="url(#veia1)" strokeWidth="0.7" opacity="0.4" />
      <line x1="195" y1="0" x2="178" y2="900"   stroke="url(#veia2)" strokeWidth="0.8" opacity="0.45" />
      <line x1="575" y1="0" x2="598" y2="900"   stroke="url(#veia2)" strokeWidth="0.55" opacity="0.3" />
      <line x1="890" y1="0" x2="875" y2="900"   stroke="url(#veia2)" strokeWidth="1.0" opacity="0.4" />

      {/* Linha de alerta — neon linear contido */}
      <line x1="0" y1="115" x2="1400" y2="88"
        stroke={alertColor} strokeWidth="0.9"
        opacity="0.4" filter="url(#neonLine)" />
    </svg>
  );
}

/* ─── Botão de filtro — visível mesmo inativo ─── */
function BotaoFiltro({ label, ativo, cor, onClick }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "5px 11px",
        fontSize: 10,
        fontFamily: "monospace",
        letterSpacing: "0.09em",
        textTransform: "uppercase" as any,
        cursor: "pointer",
        fontWeight: ativo ? 700 : 500,
        transition: "all 0.15s",
        border: "none",
        /* Sempre visível: fundo e texto legíveis mesmo inativo */
        background: ativo
          ? cor ? `${cor}28` : "#3E3E5A"
          : hovered ? "#3A3A52" : "#2E2E44",
        color: ativo
          ? cor || T.goldBright
          : hovered ? T.textSub : "#8880A8",
        /* Alto relevo 3D estilo tecla — sempre presente */
        boxShadow: ativo
          ? `inset 0 0 0 1.5px ${cor || T.gold}88, inset 1px 1px 2px rgba(0,0,0,0.6), 0 0 6px ${cor || T.gold}44`
          : hovered
          ? "0 3px 0 #11111E, 0 3px 6px rgba(0,0,0,0.5), inset 0 0 0 1px #4E4E6A, inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 3px 0 #11111E, 0 3px 5px rgba(0,0,0,0.4), inset 0 0 0 1px #3E3E58, inset 0 1px 0 rgba(255,255,255,0.06)",
        transform: ativo ? "translateY(2px)" : "translateY(0)",
        textShadow: ativo && cor ? `0 0 6px ${cor}AA` : "none",
        borderRadius: 2,
        minWidth: 52,
      }}
    >
      {label}
    </button>
  );
}

/* ─── Linha de paciente — bordas neon legíveis e borda esquerda em negrito ─── */
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
        marginBottom: 4,
        position: "relative",
        cursor: "pointer",
        transition: "background 0.15s",
        background: selected
          ? `linear-gradient(90deg, ${st.color}18 0%, ${T.panelAlt} 100%)`
          : hovered ? T.panelAlt : T.panel,
        /* Bordas neon visíveis:
           Esquerda: grossa em negrito (4px) = barra de status
           Topo/baixo/direita: neon fino mas legível */
        boxShadow: selected
          ? `inset 4px 0 0 ${st.color}, inset 0 1px 0 ${st.color}88, inset -1px 0 0 ${st.color}55, inset 0 -1px 0 ${st.color}88, 0 0 10px ${st.color}18`
          : hovered
          ? `inset 3px 0 0 ${st.color}99, inset 0 1px 0 ${T.border}, inset -1px 0 0 ${T.border}, inset 0 -1px 0 ${T.border}`
          : `inset 3px 0 0 ${st.color}55, inset 0 1px 0 ${T.borderDim}, inset -1px 0 0 ${T.borderDim}, inset 0 -1px 0 ${T.borderDim}`,
        borderRadius: 1,
      }}
    >
      <Sinaleiro status={patient.status} size={22} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: selected ? T.textPrimary : "#D0C8B0",
          fontSize: 12.5, fontWeight: 600,
          letterSpacing: "0.025em", fontFamily: "monospace",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {patient.nome}
        </div>
        <div style={{ color: T.textDim, fontSize: 10.5, marginTop: 2, letterSpacing: "0.03em" }}>
          {patient.proc} · {patient.unidade}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: T.goldBright, fontSize: 11.5, fontFamily: "monospace", fontWeight: 700 }}>
          {patient.hora}
        </div>
        <div style={{
          fontSize: 9.5, letterSpacing: "0.1em", marginTop: 3,
          color: st.text,
          textShadow: `0 0 5px ${st.color}CC`,
          fontFamily: "monospace",
        }}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

/* ─── Botão de ação — tecla 3D alto relevo estilo teclado vintage ─── */
function BotaoAcao({ label, icon, color = T.gold, onClick, active }: any) {
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
        /* Corpo da tecla — gradiente que simula plástico/metal moldado */
        background: pressed
          ? `linear-gradient(160deg, #1A1A2E 0%, #22223A 100%)`
          : active
          ? `linear-gradient(160deg, #2E2840 0%, #3A3250 50%, #2A2440 100%)`
          : hovered
          ? `linear-gradient(160deg, #2E2E48 0%, #383856 50%, #28284A 100%)`
          : `linear-gradient(160deg, #2A2A44 0%, #343454 50%, #242440 100%)`,

        color: active ? color : hovered ? T.textSub : "#8A8AAA",
        padding: "8px 18px",
        fontSize: 10.5,
        fontFamily: "monospace",
        letterSpacing: "0.1em",
        fontWeight: 700,
        cursor: "pointer",
        textTransform: "uppercase" as any,
        border: "none",
        borderRadius: 3,

        /* Alto relevo 3D estilo teclado vintage:
           - Sombra inferior/direita escura = profundidade
           - Luz superior/esquerda = superfície elevada
           - Quando pressionado: inverte, afunda */
        boxShadow: pressed
          ? [
            "inset 2px 2px 4px rgba(0,0,0,0.85)",
            "inset -1px -1px 2px rgba(255,255,255,0.04)",
            `inset 0 0 0 1px ${active ? color + "55" : "#3A3A5844"}`,
            "0 1px 0 #0E0E1E",
          ].join(", ")
          : active
          ? [
            "0 4px 0 #0A0A1A",
            "0 5px 8px rgba(0,0,0,0.7)",
            "inset 0 1px 0 rgba(255,255,255,0.12)",
            "inset 1px 0 0 rgba(255,255,255,0.06)",
            `inset 0 0 0 1px ${color}55`,
            `0 0 8px ${color}44`,
          ].join(", ")
          : [
            "0 4px 0 #0A0A1A",
            "0 5px 8px rgba(0,0,0,0.6)",
            "inset 0 1px 0 rgba(255,255,255,0.10)",
            "inset 1px 0 0 rgba(255,255,255,0.05)",
            "inset 0 0 0 1px #3E3E5A55",
          ].join(", "),

        transform: pressed ? "translateY(3px)" : "translateY(0)",
        textShadow: active ? `0 0 6px ${color}BB` : "none",
        transition: "all 0.07s",
        minWidth: 72,
        position: "relative" as any,
        zIndex: pressed ? 0 : 1,
      }}
    >
      {icon && <span style={{ marginRight: 5, opacity: 0.9 }}>{icon}</span>}
      {label}
    </button>
  );
}

/* ─── Painel principal ─── */
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
      background: T.bg,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column",
      color: T.textPrimary,
      position: "relative",
      overflow: "hidden",
    }}>
      <SaharaBackground alertColor={alertPrincipal.color} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* ── Header ── */}
        <div style={{
          padding: "13px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(20,20,35,0.92)",
          boxShadow: `inset 0 -1px 0 ${T.border}, 0 0 0 0 transparent`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 34, height: 34,
              background: "linear-gradient(135deg, #C9A84C 0%, #7a4e08 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#080810",
              clipPath: "polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)",
              flexShrink: 0,
            }}>Ⓟ</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: T.goldBright }}>
                PAWARDS
              </div>
              <div style={{ fontSize: 8.5, color: T.textDim, letterSpacing: "0.28em", marginTop: 1 }}>
                MEDCORE · SISTEMA CLÍNICO INTELIGENTE
              </div>
            </div>
          </div>

          {/* Contadores de sinaleiros no header */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Sinaleiro status={st.key} size={17} />
                <span style={{ fontSize: 10, color: T.textSub, letterSpacing: "0.06em", fontFamily: "monospace", fontWeight: 600 }}>
                  {PATIENTS.filter(p => p.status === st.key).length}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
            <div style={{ fontSize: 10.5, color: T.textSub, fontFamily: "monospace", letterSpacing: "0.08em" }}>
              16.04.2026 · 09:04
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Painel esquerdo ── */}
          <div style={{
            width: 335, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "rgba(20,20,35,0.75)",
            boxShadow: `inset -1px 0 0 ${T.border}`,
          }}>
            {/* Botões de filtro — sempre visíveis */}
            <div style={{
              padding: "10px 12px",
              display: "flex", gap: 5, flexWrap: "wrap" as any,
              boxShadow: `inset 0 -1px 0 ${T.border}`,
              alignItems: "center",
            }}>
              <BotaoFiltro
                label="TODOS"
                ativo={filtro === "todos"}
                cor={T.goldBright}
                onClick={() => setFiltro("todos")}
              />
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

            {/* Lista de pacientes */}
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "8px 8px" }}>
              {filtered.map(p => (
                <PatientRow
                  key={p.id}
                  patient={p}
                  onSelect={setSelected}
                  selected={selected?.id === p.id}
                />
              ))}
            </div>

            {/* Botões base */}
            <div style={{
              padding: "10px 12px",
              display: "flex", gap: 7,
              boxShadow: `inset 0 1px 0 ${T.border}`,
            }}>
              <BotaoAcao label="+ Novo"  icon="⊕" />
              <BotaoAcao label="Sync"    icon="↻" color={T.textSub} />
            </div>
          </div>

          {/* ── Painel direito: detalhe ── */}
          <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto" as any }}>
            {selected ? (
              <div>
                {/* Card de detalhe principal */}
                <div style={{
                  padding: "15px 18px",
                  background: T.panel,
                  position: "relative",
                  marginBottom: 14,
                  borderRadius: 2,
                  boxShadow: [
                    `inset 0 3px 0 ${alertPrincipal.color}`,
                    `inset 1px 0 0 ${alertPrincipal.color}44`,
                    `inset -1px 0 0 ${T.border}`,
                    `inset 0 -1px 0 ${T.border}`,
                    `0 0 20px ${alertPrincipal.color}12`,
                    `0 4px 12px rgba(0,0,0,0.4)`,
                  ].join(", "),
                }}>
                  {/* Neon linear da borda superior */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: alertPrincipal.color,
                    boxShadow: `0 0 7px ${alertPrincipal.color}CC, 0 0 14px ${alertPrincipal.color}55`,
                    borderRadius: "2px 2px 0 0",
                    pointerEvents: "none",
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <Sinaleiro status={selected.status} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, letterSpacing: "0.03em" }}>
                        {selected.nome}
                      </div>
                      <div style={{ color: T.textSub, fontSize: 11.5, marginTop: 4, letterSpacing: "0.04em" }}>
                        {selected.id} · {selected.unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 22, fontWeight: 900, fontFamily: "monospace",
                        color: alertPrincipal.text,
                        textShadow: `0 0 8px ${alertPrincipal.color}BB`,
                      }}>
                        {selected.hora}
                      </div>
                      <div style={{
                        fontSize: 10.5, letterSpacing: "0.14em",
                        color: alertPrincipal.text, opacity: 0.9,
                        fontFamily: "monospace",
                      }}>
                        {alertPrincipal.label}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de metadados */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "PROCEDIMENTO", valor: selected.proc, icon: "◈", destaque: false },
                    { label: "STATUS ATUAL",  valor: alertPrincipal.label, icon: "◉", destaque: true },
                    { label: "UNIDADE",       valor: selected.unidade, icon: "◎", destaque: false },
                    { label: "HORÁRIO",       valor: selected.hora, icon: "◷", destaque: false },
                  ].map((item, i) => (
                    <div key={i} style={{
                      padding: "12px 14px",
                      background: T.panel,
                      borderRadius: 2,
                      boxShadow: item.destaque
                        ? [
                          `inset 4px 0 0 ${alertPrincipal.color}`,
                          `inset 0 1px 0 ${alertPrincipal.color}55`,
                          `inset -1px 0 0 ${T.border}`,
                          `inset 0 -1px 0 ${T.border}`,
                          `0 0 12px ${alertPrincipal.color}12`,
                          `0 2px 8px rgba(0,0,0,0.3)`,
                        ].join(", ")
                        : [
                          `inset 0 0 0 1px ${T.border}`,
                          `0 2px 6px rgba(0,0,0,0.25)`,
                        ].join(", "),
                    }}>
                      <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.18em", marginBottom: 6 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: item.destaque ? alertPrincipal.text : T.goldBright,
                        textShadow: item.destaque ? `0 0 6px ${alertPrincipal.color}AA` : "none",
                        fontFamily: "monospace",
                      }}>
                        {item.valor}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões de ação — 3D alto relevo */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as any }}>
                  <BotaoAcao label="Visualizar RAS"  icon="▶" color={T.goldBright} active />
                  <BotaoAcao label="Remarcar"        icon="↺" />
                  <BotaoAcao label="Validar Código"  icon="◈" />
                  <BotaoAcao label="Upload Exame"    icon="↑" />
                </div>

                {/* Linha de atividade */}
                <div style={{
                  marginTop: 18, padding: "10px 14px",
                  background: T.panel,
                  borderRadius: 2,
                  boxShadow: [
                    `inset 0 0 0 1px ${T.borderDim}`,
                    `inset 0 -2px 0 ${alertPrincipal.color}22`,
                    `0 2px 6px rgba(0,0,0,0.25)`,
                  ].join(", "),
                }}>
                  <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.22em", marginBottom: 8 }}>
                    ◈ LINHA DE ATIVIDADE
                  </div>
                  {[
                    { t: "09:02", ev: "Check-in realizado",    dot: "#00E87A" },
                    { t: "09:00", ev: "Procedimento iniciado", dot: T.gold },
                    { t: "08:45", ev: "Triagem completa",      dot: T.textDim },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.dot,
                        boxShadow: `0 0 4px ${item.dot}CC`,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: T.textDim, fontSize: 10, fontFamily: "monospace", width: 36 }}>
                        {item.t}
                      </span>
                      <span style={{ color: T.textSub, fontSize: 11 }}>{item.ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: T.textDim, letterSpacing: "0.1em",
              }}>
                Selecione um paciente
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "8px 22px",
          background: "rgba(14,14,25,0.95)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: `inset 0 1px 0 ${T.border}`,
        }}>
          <div style={{ fontSize: 8.5, color: T.textDim, letterSpacing: "0.18em" }}>
            PAWARDS MEDCORE · INSTITUTO PÁDUA · RASX-MATRIZ V6
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: st.color,
                  boxShadow: `0 0 4px ${st.color}CC`,
                }} />
                <span style={{ fontSize: 8.5, color: T.textDim, letterSpacing: "0.07em" }}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
