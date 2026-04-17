import { useState } from "react";

const ALERT_STATES = [
  { key: "ok",      label: "ESTÁVEL",    color: "#00FF88", glow: "#00FF88", shadow: "0 0 8px #00FF88, 0 0 20px #00FF8866, 0 0 40px #00FF8833", ring: "#00FF8844" },
  { key: "atencao", label: "ATENÇÃO",    color: "#FFD700", glow: "#FFD700", shadow: "0 0 8px #FFD700, 0 0 20px #FFD70066, 0 0 40px #FFD70033", ring: "#FFD70044" },
  { key: "alerta",  label: "ALERTA",     color: "#BF5FFF", glow: "#BF5FFF", shadow: "0 0 8px #BF5FFF, 0 0 20px #BF5FFF66, 0 0 40px #BF5FFF33", ring: "#BF5FFF44" },
  { key: "critico", label: "CRÍTICO",    color: "#FF3B3B", glow: "#FF3B3B", shadow: "0 0 8px #FF3B3B, 0 0 20px #FF3B3B66, 0 0 40px #FF3B3B33", ring: "#FF3B3B44" },
];

const PATIENTS = [
  { id: "P001", nome: "Fernanda M. Costa",    proc: "INFU EV — NAD⁺",        status: "ok",      hora: "09:00", unidade: "Pádua — Vila Formosa" },
  { id: "P002", nome: "Roberto A. Lima",       proc: "IM — Complexo B",        status: "atencao", hora: "09:30", unidade: "Pádua — Tatuapé" },
  { id: "P003", nome: "Mariana S. Rocha",      proc: "IMPL — Testosterona",    status: "alerta",  hora: "10:00", unidade: "Pádua — Vila Formosa" },
  { id: "P004", nome: "Dr. Caio H. Pádua",    proc: "CPRE — Consulta",        status: "ok",      hora: "10:30", unidade: "Instituto Pádua" },
  { id: "P005", nome: "Cristina P. Mendes",    proc: "EXAM — Densitometria",   status: "critico", hora: "11:00", unidade: "Pádua — Moema" },
];

function Sinaleiro({ status, size = 28 }: { status: string; size?: number }) {
  const st = ALERT_STATES.find(s => s.key === status) || ALERT_STATES[0];
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <div style={{
        width: size, height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${st.color}EE, ${st.color}88 50%, #1a1208 80%)`,
        boxShadow: `${st.shadow}, inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.6)`,
        border: `2px solid #8B7340`,
        outline: `1px solid #3a2d1a`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: "18%", left: "22%",
          width: "30%", height: "20%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.55)",
          filter: "blur(1px)",
          transform: "rotate(-30deg)",
        }} />
        <div style={{
          position: "absolute",
          bottom: "12%", right: "15%",
          width: "15%", height: "10%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          filter: "blur(0.5px)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        inset: -4,
        borderRadius: "50%",
        boxShadow: `0 0 12px ${st.ring}`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

function VeiaGeometrica({ x1, y1, x2, y2, color, width = 1, opacity = 0.7 }: any) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={width}
      opacity={opacity}
      filter="url(#ledGlow)"
    />
  );
}

function SaharaBackground({ alertColor }: { alertColor: string }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ledGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="veia1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0" />
          <stop offset="30%" stopColor="#E8C96A" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#C9A84C" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="veiaAlert" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={alertColor} stopOpacity="0" />
          <stop offset="50%" stopColor={alertColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={alertColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="100%" height="100%" fill="#0A0A0F" />
      <rect width="100%" height="100%" fill="url(#stoneTex)" opacity="0.03" />

      <VeiaGeometrica x1="0" y1="120" x2="1400" y2="90"   color="url(#veia1)" width={1.5} opacity={0.6} />
      <VeiaGeometrica x1="200" y1="0" x2="180" y2="900"   color="#B8922A" width={0.8} opacity={0.5} />
      <VeiaGeometrica x1="580" y1="0" x2="600" y2="900"   color="#C9A84C" width={0.6} opacity={0.4} />
      <VeiaGeometrica x1="0" y1="300" x2="1400" y2="340"  color="#A07828" width={1} opacity={0.35} />
      <VeiaGeometrica x1="900" y1="0" x2="880" y2="900"   color="#D4AA50" width={1.2} opacity={0.5} />
      <VeiaGeometrica x1="1100" y1="0" x2="1120" y2="900" color="#B89030" width={0.7} opacity={0.3} />
      <VeiaGeometrica x1="0" y1="600" x2="1400" y2="570"  color="#C9A84C" width={0.9} opacity={0.4} />
      <VeiaGeometrica x1="0" y1="200" x2="600" y2="900"   color="#9A7020" width={0.6} opacity={0.25} />
      <VeiaGeometrica x1="800" y1="0" x2="1400" y2="500"  color="#C9A84C" width={0.8} opacity={0.3} />
      <VeiaGeometrica x1="0" y1="450" x2="900" y2="200"   color="#E8C96A" width={1.4} opacity={0.55} />

      <line x1="0" y1="120" x2="1400" y2="90"
        stroke={alertColor} strokeWidth={1}
        opacity={0.3} filter="url(#ledGlowStrong)" />
      <line x1="0" y1="450" x2="900" y2="200"
        stroke={alertColor} strokeWidth={0.8}
        opacity={0.25} filter="url(#ledGlowStrong)" />
    </svg>
  );
}

function PatientRow({ patient, onSelect, selected }: any) {
  const st = ALERT_STATES.find(s => s.key === patient.status) || ALERT_STATES[0];
  return (
    <div
      onClick={() => onSelect(patient)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        marginBottom: 4,
        background: selected
          ? `linear-gradient(90deg, ${st.color}11 0%, transparent 100%)`
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? st.color + "44" : "#2a2010"}`,
        borderLeft: `3px solid ${st.color}`,
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: selected ? `inset 0 0 20px ${st.color}09, 0 0 8px ${st.color}22` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: st.color,
          boxShadow: `0 0 8px ${st.color}, 0 0 15px ${st.color}88`,
        }} />
      )}
      <Sinaleiro status={patient.status} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#E8E0CC", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", fontFamily: "monospace" }}>
          {patient.nome}
        </div>
        <div style={{ color: "#8A7A50", fontSize: 11, marginTop: 2, letterSpacing: "0.04em" }}>
          {patient.proc} · {patient.unidade}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: "#C9A84C", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
          {patient.hora}
        </div>
        <div style={{
          fontSize: 10, letterSpacing: "0.1em", marginTop: 3,
          color: st.color, textShadow: `0 0 6px ${st.color}`,
          fontFamily: "monospace",
        }}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

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
          ? "linear-gradient(145deg, #1a1208, #2a1f0a)"
          : "linear-gradient(145deg, #3d2e10, #2a1f0a, #1a1208)",
        border: `1px solid ${active ? color : "#5a4520"}`,
        borderTop: `1px solid ${pressed ? "#1a1208" : "#7a6030"}`,
        borderLeft: `1px solid ${pressed ? "#1a1208" : "#7a6030"}`,
        color: active ? color : "#8A7A50",
        padding: "8px 18px",
        fontSize: 11,
        fontFamily: "monospace",
        letterSpacing: "0.12em",
        fontWeight: 700,
        cursor: "pointer",
        textTransform: "uppercase" as any,
        transform: pressed ? "translateY(1px)" : "translateY(0)",
        boxShadow: pressed
          ? "inset 1px 1px 3px rgba(0,0,0,0.8)"
          : active
            ? `2px 2px 6px rgba(0,0,0,0.8), -1px -1px 3px rgba(255,200,80,0.1), 0 0 10px ${color}33`
            : "2px 2px 6px rgba(0,0,0,0.8), -1px -1px 3px rgba(255,200,80,0.08)",
        textShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.08s",
        minWidth: 80,
      }}
    >
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
      {label}
    </button>
  );
}

export default function SaharaNoirPanel() {
  const [selected, setSelected] = useState<any>(PATIENTS[0]);
  const [filtro, setFiltro] = useState("todos");

  const alertPrincipal = selected
    ? (ALERT_STATES.find(s => s.key === selected.status) || ALERT_STATES[0])
    : ALERT_STATES[0];

  const filtered = filtro === "todos"
    ? PATIENTS
    : PATIENTS.filter(p => p.status === filtro);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0F",
      fontFamily: "'Helvetica Neue', sans-serif",
      display: "flex", flexDirection: "column",
      color: "#E8E0CC",
      position: "relative",
      overflow: "hidden",
    }}>
      <SaharaBackground alertColor={alertPrincipal.color} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>

        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid #2a2010",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(10,10,15,0.85)",
          boxShadow: `0 1px 0 #3a2d1a, 0 0 20px rgba(201,168,76,0.08)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #C9A84C, #8B5E0A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#0A0A0F",
              clipPath: "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)",
            }}>Ⓟ</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", color: "#C9A84C", textTransform: "uppercase" }}>
                PAWARDS
              </div>
              <div style={{ fontSize: 9, color: "#5a4a28", letterSpacing: "0.3em", marginTop: 1 }}>
                MEDCORE · SISTEMA CLÍNICO INTELIGENTE
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Sinaleiro status={st.key} size={18} />
                <span style={{ fontSize: 9, color: "#5a4a28", letterSpacing: "0.08em" }}>
                  {PATIENTS.filter(p => p.status === st.key).length}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 20, background: "#2a2010", margin: "0 6px" }} />
            <div style={{
              fontSize: 11, color: "#8A7A50", fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}>
              16.04.2026 · 09:04
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          <div style={{
            width: 340, flexShrink: 0,
            borderRight: "1px solid #2a2010",
            display: "flex", flexDirection: "column",
            background: "rgba(10,10,15,0.7)",
          }}>
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid #2a2010",
              display: "flex", gap: 4, flexWrap: "wrap" as any,
            }}>
              {["todos", "ok", "atencao", "alerta", "critico"].map(f => {
                const st = f === "todos" ? null : ALERT_STATES.find(s => s.key === f);
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    style={{
                      padding: "4px 10px", fontSize: 9,
                      background: filtro === f ? (st ? st.color + "22" : "#2a2010") : "transparent",
                      border: `1px solid ${filtro === f ? (st ? st.color + "66" : "#4a3820") : "#2a2010"}`,
                      color: filtro === f ? (st ? st.color : "#C9A84C") : "#5a4a28",
                      cursor: "pointer", letterSpacing: "0.1em",
                      fontFamily: "monospace", textTransform: "uppercase" as any,
                      textShadow: filtro === f && st ? `0 0 6px ${st.color}` : "none",
                    }}
                  >
                    {f === "todos" ? "TODOS" : f.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, overflowY: "auto" as any, padding: "8px" }}>
              {filtered.map(p => (
                <PatientRow
                  key={p.id}
                  patient={p}
                  onSelect={setSelected}
                  selected={selected?.id === p.id}
                />
              ))}
            </div>

            <div style={{ padding: "10px 14px", borderTop: "1px solid #2a2010", display: "flex", gap: 6 }}>
              <BotaoEscovado label="+ Novo" icon="⊕" />
              <BotaoEscovado label="Sync" icon="↻" color="#8A7A50" />
            </div>
          </div>

          <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" as any }}>
            {selected ? (
              <div>
                <div style={{
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${alertPrincipal.color}33`,
                  borderTop: `2px solid ${alertPrincipal.color}`,
                  marginBottom: 16,
                  position: "relative",
                  boxShadow: `0 0 30px ${alertPrincipal.color}0A`,
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: alertPrincipal.color,
                    boxShadow: `0 0 10px ${alertPrincipal.color}, 0 0 20px ${alertPrincipal.color}88`,
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <Sinaleiro status={selected.status} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#E8E0CC", letterSpacing: "0.03em" }}>
                        {selected.nome}
                      </div>
                      <div style={{ color: "#8A7A50", fontSize: 12, marginTop: 4, letterSpacing: "0.05em" }}>
                        {selected.id} · {selected.unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 22, fontWeight: 900, fontFamily: "monospace",
                        color: alertPrincipal.color,
                        textShadow: `0 0 10px ${alertPrincipal.color}`,
                      }}>
                        {selected.hora}
                      </div>
                      <div style={{
                        fontSize: 11, letterSpacing: "0.15em",
                        color: alertPrincipal.color, opacity: 0.8,
                      }}>
                        {alertPrincipal.label}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "PROCEDIMENTO", valor: selected.proc, icon: "◈" },
                    { label: "STATUS ATUAL", valor: alertPrincipal.label, icon: "◉", destaque: true },
                    { label: "UNIDADE", valor: selected.unidade, icon: "◎" },
                    { label: "HORÁRIO", valor: selected.hora, icon: "◷" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid #2a2010",
                      borderLeft: item.destaque ? `3px solid ${alertPrincipal.color}` : "1px solid #2a2010",
                      boxShadow: item.destaque ? `0 0 15px ${alertPrincipal.color}0D` : "none",
                    }}>
                      <div style={{ fontSize: 9, color: "#5a4a28", letterSpacing: "0.2em", marginBottom: 6 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: item.destaque ? alertPrincipal.color : "#C9A84C",
                        textShadow: item.destaque ? `0 0 8px ${alertPrincipal.color}` : "none",
                        fontFamily: "monospace",
                      }}>
                        {item.valor}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as any }}>
                  <BotaoEscovado label="Visualizar RAS" icon="▶" color="#C9A84C" active />
                  <BotaoEscovado label="Remarcar" icon="↺" />
                  <BotaoEscovado label="Validar Código" icon="◈" />
                  <BotaoEscovado label="Upload Exame" icon="↑" />
                </div>

                <div style={{
                  marginTop: 20, padding: "10px 14px",
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid #1a1208",
                  borderBottom: `1px solid ${alertPrincipal.color}22`,
                }}>
                  <div style={{
                    fontSize: 9, color: "#3a2d18", letterSpacing: "0.25em", marginBottom: 8,
                  }}>
                    ◈ LINHA DE ATIVIDADE
                  </div>
                  {[
                    { t: "09:02", ev: "Check-in realizado", dot: "#00FF88" },
                    { t: "09:00", ev: "Procedimento iniciado", dot: "#C9A84C" },
                    { t: "08:45", ev: "Triagem completa", dot: "#8A7A50" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 5 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.dot,
                        boxShadow: `0 0 4px ${item.dot}`,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: "#5a4a28", fontSize: 10, fontFamily: "monospace", width: 38 }}>
                        {item.t}
                      </span>
                      <span style={{ color: "#8A7A50", fontSize: 11 }}>{item.ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#3a2d18" }}>
                Selecione um paciente
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: "8px 24px",
          borderTop: "1px solid #2a2010",
          background: "rgba(10,10,15,0.9)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 9, color: "#3a2d18", letterSpacing: "0.2em" }}>
            PAWARDS MEDCORE · INSTITUTO PÁDUA · RASX-MATRIZ V6
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: st.color,
                  boxShadow: `0 0 5px ${st.color}, 0 0 10px ${st.color}88`,
                }} />
                <span style={{ fontSize: 9, color: "#3a2d18", letterSpacing: "0.08em" }}>
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
