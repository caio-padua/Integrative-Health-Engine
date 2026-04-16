import { useState } from "react";

const ALERT_STATES = [
  { key: "ok",      label: "ESTÁVEL",  color: "#00FF88", dim: "#00CC6688" },
  { key: "atencao", label: "ATENÇÃO",  color: "#FFD700", dim: "#CCA90088" },
  { key: "alerta",  label: "ALERTA",   color: "#BF5FFF", dim: "#8833CC88" },
  { key: "critico", label: "CRÍTICO",  color: "#FF3B3B", dim: "#CC111188" },
];

const PATIENTS = [
  { id: "P001", nome: "Fernanda M. Costa",  proc: "INFU EV — NAD⁺",       status: "ok",      hora: "09:00", unidade: "Pádua — Vila Formosa" },
  { id: "P002", nome: "Roberto A. Lima",     proc: "IM — Complexo B",       status: "atencao", hora: "09:30", unidade: "Pádua — Tatuapé" },
  { id: "P003", nome: "Mariana S. Rocha",    proc: "IMPL — Testosterona",   status: "alerta",  hora: "10:00", unidade: "Pádua — Vila Formosa" },
  { id: "P004", nome: "Dr. Caio H. Pádua",  proc: "CPRE — Consulta",       status: "ok",      hora: "10:30", unidade: "Instituto Pádua" },
  { id: "P005", nome: "Cristina P. Mendes",  proc: "EXAM — Densitometria",  status: "critico", hora: "11:00", unidade: "Pádua — Moema" },
];

/* ─── Sinaleiro Industrial: vidro domo com luz concentrada ─── */
function Sinaleiro({ status, size = 28 }: { status: string; size?: number }) {
  const st = ALERT_STATES.find(s => s.key === status) || ALERT_STATES[0];
  const r = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Anel de metal escovado */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #4a3c20 0%, #2a2010 50%, #1a1408 100%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,200,80,0.15)",
      }} />

      {/* Domo de vidro — base escura transparente */}
      <div style={{
        position: "absolute",
        inset: 2,
        borderRadius: "50%",
        background: `radial-gradient(circle at 50% 60%, ${st.color}CC 0%, ${st.color}66 30%, ${st.color}22 55%, rgba(5,5,10,0.85) 80%)`,
        boxShadow: `inset 0 0 ${r * 0.6}px ${st.color}99`,
      }} />

      {/* Reflexo de vidro superior — concentrado, não difuso */}
      <div style={{
        position: "absolute",
        top: "10%", left: "20%",
        width: "45%", height: "28%",
        borderRadius: "50%",
        background: "linear-gradient(160deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)",
        filter: "blur(0.3px)",
        transform: "rotate(-20deg)",
        pointerEvents: "none",
      }} />

      {/* Ponto de reflexo secundário (canto inferior direito do vidro) */}
      <div style={{
        position: "absolute",
        bottom: "18%", right: "18%",
        width: "16%", height: "10%",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.22)",
        filter: "blur(0.4px)",
        pointerEvents: "none",
      }} />

      {/* Halo externo: contido, linear, não vazante */}
      <div style={{
        position: "absolute",
        inset: -2,
        borderRadius: "50%",
        border: `1px solid ${st.color}55`,
        boxShadow: `0 0 4px ${st.color}66`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Fundo: preto vidro polido com veios mínimos ─── */
function SaharaBackground({ alertColor }: { alertColor: string }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Glow linear e contido: stdDeviation baixo */}
        <filter id="neonLine" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Efeito de especular — vidro polido */}
        <linearGradient id="especular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.04)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.01)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Veias douradas — finas e discretas */}
        <linearGradient id="veia1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#C9A84C" stopOpacity="0" />
          <stop offset="35%"  stopColor="#C9A84C" stopOpacity="0.35" />
          <stop offset="65%"  stopColor="#C9A84C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="veia2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#B8922A" stopOpacity="0" />
          <stop offset="40%"  stopColor="#B8922A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#B8922A" stopOpacity="0" />
        </linearGradient>

        {/* Linha de alerta — linear, contida */}
        <linearGradient id="veiaAlert" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={alertColor} stopOpacity="0" />
          <stop offset="40%"  stopColor={alertColor} stopOpacity="0.5" />
          <stop offset="60%"  stopColor={alertColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={alertColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base preta */}
      <rect width="100%" height="100%" fill="#080810" />

      {/* Vidro polido: reflexo especular suave no topo */}
      <rect width="100%" height="100%" fill="url(#especular)" />

      {/* Veios dourados — discretos, quase imperceptíveis */}
      <line x1="0" y1="115" x2="1400" y2="88"   stroke="url(#veia1)" strokeWidth="0.8" opacity="0.5" />
      <line x1="0" y1="445" x2="900"  y2="195"   stroke="url(#veia1)" strokeWidth="1.1" opacity="0.4" />
      <line x1="0" y1="610" x2="1400" y2="575"  stroke="url(#veia1)" strokeWidth="0.6" opacity="0.3" />
      <line x1="195" y1="0" x2="178" y2="900"   stroke="url(#veia2)" strokeWidth="0.7" opacity="0.35" />
      <line x1="575" y1="0" x2="598" y2="900"   stroke="url(#veia2)" strokeWidth="0.5" opacity="0.22" />
      <line x1="890" y1="0" x2="875" y2="900"   stroke="url(#veia2)" strokeWidth="0.9" opacity="0.3" />

      {/* Linha de alerta: neon linear e contido, sem vazar */}
      <line x1="0" y1="115" x2="1400" y2="88"
        stroke={alertColor} strokeWidth="0.8"
        opacity="0.35" filter="url(#neonLine)" />
    </svg>
  );
}

/* ─── Card de paciente com bordas contíguas nas quinas ─── */
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
        padding: "11px 14px 11px 14px",
        marginBottom: 3,
        position: "relative",
        cursor: "pointer",
        transition: "background 0.18s",
        background: selected
          ? `linear-gradient(90deg, ${st.color}0E 0%, transparent 100%)`
          : hovered ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)",
      }}
    >
      {/* Borda: traçado completo contíguo nas quinas usando box-shadow em camadas */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        /* Borda esquerda intensa (neon) + restante fina e discreta */
        boxShadow: selected
          ? `inset 3px 0 0 ${st.color}, inset 0 1px 0 ${st.color}33, inset -1px 0 0 ${st.color}22, inset 0 -1px 0 ${st.color}33`
          : `inset 2px 0 0 ${st.color}55, inset 0 1px 0 #2a201066, inset -1px 0 0 #2a201044, inset 0 -1px 0 #2a201066`,
      }} />

      <Sinaleiro status={patient.status} size={22} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#DDD5BB", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.025em", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {patient.nome}
        </div>
        <div style={{ color: "#6a5c38", fontSize: 10.5, marginTop: 2, letterSpacing: "0.035em" }}>
          {patient.proc} · {patient.unidade}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: "#C9A84C", fontSize: 11.5, fontFamily: "monospace", fontWeight: 700 }}>
          {patient.hora}
        </div>
        <div style={{
          fontSize: 9.5, letterSpacing: "0.1em", marginTop: 3,
          color: st.color,
          /* Neon no texto: linear e contido */
          textShadow: `0 0 5px ${st.color}BB`,
          fontFamily: "monospace",
        }}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

/* ─── Botão escovado metálico 3D ─── */
function BotaoEscovado({ label, icon, color = "#C9A84C", onClick, active }: any) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: pressed
          ? "linear-gradient(145deg, #0f0d06, #1c1508)"
          : active
          ? "linear-gradient(145deg, #302410, #1f1808, #0f0d06)"
          : "linear-gradient(145deg, #2c2008, #1a1408, #0f0d06)",
        border: "none",
        outline: "none",
        color: active ? color : "#7a6a40",
        padding: "7px 16px",
        fontSize: 10.5,
        fontFamily: "monospace",
        letterSpacing: "0.1em",
        fontWeight: 700,
        cursor: "pointer",
        textTransform: "uppercase" as any,
        transform: pressed ? "translateY(1px)" : "translateY(0)",
        /* Bordas contíguas com box-shadow */
        boxShadow: pressed
          ? "inset 2px 2px 4px rgba(0,0,0,0.9), inset 0 0 0 1px #1a1208"
          : active
          ? `2px 2px 5px rgba(0,0,0,0.85), -1px -1px 2px rgba(255,200,80,0.12), inset 0 0 0 1px ${color}44, 0 0 6px ${color}33`
          : "2px 2px 5px rgba(0,0,0,0.85), -1px -1px 2px rgba(255,200,80,0.06), inset 0 0 0 1px #3a2d1044",
        textShadow: active ? `0 0 6px ${color}BB` : "none",
        transition: "all 0.07s",
        minWidth: 72,
      }}
    >
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
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
      background: "#080810",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column",
      color: "#E0D8C0",
      position: "relative",
      overflow: "hidden",
    }}>
      <SaharaBackground alertColor={alertPrincipal.color} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* ── Header ── */}
        <div style={{
          padding: "13px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(8,8,16,0.88)",
          boxShadow: "inset 0 -1px 0 #2a2010, 0 0 0 0 transparent",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 34, height: 34,
              background: "linear-gradient(135deg, #C9A84C 0%, #7a4e08 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#080810",
              clipPath: "polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)",
            }}>Ⓟ</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "#C9A84C" }}>
                PAWARDS
              </div>
              <div style={{ fontSize: 8.5, color: "#4a3c1c", letterSpacing: "0.28em", marginTop: 1 }}>
                MEDCORE · SISTEMA CLÍNICO INTELIGENTE
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Sinaleiro status={st.key} size={16} />
                <span style={{ fontSize: 9, color: "#4a3c1c", letterSpacing: "0.06em", fontFamily: "monospace" }}>
                  {PATIENTS.filter(p => p.status === st.key).length}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 18, background: "#2a2010", margin: "0 4px" }} />
            <div style={{ fontSize: 10.5, color: "#6a5c38", fontFamily: "monospace", letterSpacing: "0.08em" }}>
              16.04.2026 · 09:04
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Painel esquerdo: lista de pacientes ── */}
          <div style={{
            width: 330, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "rgba(8,8,16,0.6)",
            boxShadow: "inset -1px 0 0 #2a2010",
          }}>
            {/* Filtros */}
            <div style={{
              padding: "8px 12px",
              display: "flex", gap: 4, flexWrap: "wrap" as any,
              boxShadow: "inset 0 -1px 0 #2a2010",
            }}>
              {["todos", "ok", "atencao", "alerta", "critico"].map(f => {
                const st = f === "todos" ? null : ALERT_STATES.find(s => s.key === f);
                const ativo = filtro === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    style={{
                      padding: "3px 9px", fontSize: 9,
                      background: ativo ? (st ? `${st.color}18` : "#2a201055") : "transparent",
                      border: "none",
                      boxShadow: ativo
                        ? st
                          ? `inset 0 0 0 1px ${st.color}55`
                          : `inset 0 0 0 1px #4a3820`
                        : `inset 0 0 0 1px #2a2010`,
                      color: ativo ? (st ? st.color : "#C9A84C") : "#4a3c1c",
                      cursor: "pointer", letterSpacing: "0.1em",
                      fontFamily: "monospace", textTransform: "uppercase" as any,
                      textShadow: ativo && st ? `0 0 4px ${st.color}99` : "none",
                      transition: "all 0.12s",
                    }}
                  >
                    {f === "todos" ? "TODOS" : f.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "6px 6px" }}>
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
              padding: "9px 12px",
              display: "flex", gap: 6,
              boxShadow: "inset 0 1px 0 #2a2010",
            }}>
              <BotaoEscovado label="+ Novo"  icon="⊕" />
              <BotaoEscovado label="Sync"    icon="↻" color="#8A7A50" />
            </div>
          </div>

          {/* ── Painel direito: detalhe ── */}
          <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto" as any }}>
            {selected ? (
              <div>
                {/* Card de detalhe principal */}
                <div style={{
                  padding: "15px 18px",
                  background: "rgba(255,255,255,0.018)",
                  position: "relative",
                  marginBottom: 14,
                  /* Bordas contíguas: cima com cor de alerta, resto discreto */
                  boxShadow: `inset 0 2px 0 ${alertPrincipal.color}, inset 1px 0 0 ${alertPrincipal.color}22, inset -1px 0 0 #2a201055, inset 0 -1px 0 #2a201055, 0 0 20px ${alertPrincipal.color}08`,
                }}>
                  {/* Neon linear da borda superior — contido */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: alertPrincipal.color,
                    boxShadow: `0 0 6px ${alertPrincipal.color}BB, 0 0 12px ${alertPrincipal.color}44`,
                    pointerEvents: "none",
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <Sinaleiro status={selected.status} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#DDD5BB", letterSpacing: "0.03em" }}>
                        {selected.nome}
                      </div>
                      <div style={{ color: "#6a5c38", fontSize: 11.5, marginTop: 4, letterSpacing: "0.04em" }}>
                        {selected.id} · {selected.unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 21, fontWeight: 900, fontFamily: "monospace",
                        color: alertPrincipal.color,
                        textShadow: `0 0 7px ${alertPrincipal.color}BB`,
                      }}>
                        {selected.hora}
                      </div>
                      <div style={{
                        fontSize: 10, letterSpacing: "0.14em",
                        color: alertPrincipal.color, opacity: 0.85,
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
                      padding: "11px 14px",
                      background: "rgba(255,255,255,0.016)",
                      boxShadow: item.destaque
                        ? `inset 3px 0 0 ${alertPrincipal.color}, inset 0 1px 0 ${alertPrincipal.color}33, inset -1px 0 0 #2a201044, inset 0 -1px 0 #2a201044, 0 0 12px ${alertPrincipal.color}0A`
                        : "inset 0 0 0 1px #2a201055",
                    }}>
                      <div style={{ fontSize: 9, color: "#4a3c1c", letterSpacing: "0.18em", marginBottom: 5 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: item.destaque ? alertPrincipal.color : "#C9A84C",
                        textShadow: item.destaque ? `0 0 5px ${alertPrincipal.color}AA` : "none",
                        fontFamily: "monospace",
                      }}>
                        {item.valor}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as any }}>
                  <BotaoEscovado label="Visualizar RAS"  icon="▶" color="#C9A84C" active />
                  <BotaoEscovado label="Remarcar"        icon="↺" />
                  <BotaoEscovado label="Validar Código"  icon="◈" />
                  <BotaoEscovado label="Upload Exame"    icon="↑" />
                </div>

                {/* Linha de atividade */}
                <div style={{
                  marginTop: 18, padding: "9px 13px",
                  background: "rgba(255,255,255,0.012)",
                  boxShadow: `inset 0 0 0 1px #1a140844, inset 0 -1px 0 ${alertPrincipal.color}1A`,
                }}>
                  <div style={{ fontSize: 9, color: "#3a2d18", letterSpacing: "0.22em", marginBottom: 7 }}>
                    ◈ LINHA DE ATIVIDADE
                  </div>
                  {[
                    { t: "09:02", ev: "Check-in realizado",   dot: "#00FF88" },
                    { t: "09:00", ev: "Procedimento iniciado", dot: "#C9A84C" },
                    { t: "08:45", ev: "Triagem completa",      dot: "#6a5c38" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 5 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: item.dot,
                        boxShadow: `0 0 3px ${item.dot}BB`,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: "#4a3c1c", fontSize: 9.5, fontFamily: "monospace", width: 36 }}>
                        {item.t}
                      </span>
                      <span style={{ color: "#7a6a40", fontSize: 10.5 }}>{item.ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#3a2d18", letterSpacing: "0.1em" }}>
                Selecione um paciente
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "7px 22px",
          background: "rgba(8,8,16,0.92)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "inset 0 1px 0 #2a2010",
        }}>
          <div style={{ fontSize: 8.5, color: "#3a2d18", letterSpacing: "0.18em" }}>
            PAWARDS MEDCORE · INSTITUTO PÁDUA · RASX-MATRIZ V6
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: st.color,
                  boxShadow: `0 0 3px ${st.color}BB`,
                }} />
                <span style={{ fontSize: 8.5, color: "#3a2d18", letterSpacing: "0.07em" }}>
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
