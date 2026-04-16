import { useState } from "react";

/* ─── Alertas ─── */
const ALERT_STATES = [
  { key: "ok",      label: "ESTÁVEL",  color: "#00966A", glow: "#00BB80" },
  { key: "atencao", label: "ATENÇÃO",  color: "#B8860B", glow: "#D4A017" },
  { key: "alerta",  label: "ALERTA",   color: "#6B21A8", glow: "#9333EA" },
  { key: "critico", label: "CRÍTICO",  color: "#B91C1C", glow: "#EF4444" },
];

const PATIENTS = [
  { id: "P001", nome: "Fernanda M. Costa",  proc: "INFU EV — NAD⁺",       status: "ok",      hora: "09:00", unidade: "Pádua — Vila Formosa" },
  { id: "P002", nome: "Roberto A. Lima",     proc: "IM — Complexo B",       status: "atencao", hora: "09:30", unidade: "Pádua — Tatuapé"       },
  { id: "P003", nome: "Mariana S. Rocha",    proc: "IMPL — Testosterona",   status: "alerta",  hora: "10:00", unidade: "Pádua — Vila Formosa" },
  { id: "P004", nome: "Dr. Caio H. Pádua",  proc: "CPRE — Consulta",       status: "ok",      hora: "10:30", unidade: "Instituto Pádua"       },
  { id: "P005", nome: "Cristina P. Mendes",  proc: "EXAM — Densitometria",  status: "critico", hora: "11:00", unidade: "Pádua — Moema"          },
];

/* ════════════════════════════════════════════
   TEMAS — 3 propostas de pedra lisa empilhada
   ════════════════════════════════════════════ */
const TEMAS = {

  /* 1 — QUARTZ BLANC: branco quente, blocos lisos, luxo Tiffany */
  quartz: {
    nome: "① QUARTZ BLANC",
    bg:          "#F0EDE8",   // base — branco pedra quente
    layer1:      "#EAE7E2",   // camada 1 (header/footer)
    layer2:      "#E4E1DC",   // camada 2 (painel lateral)
    layer3:      "#DEDAD4",   // camada 3 (cards)
    layer4:      "#D8D5CF",   // camada 4 (cards internos)
    border:      "rgba(160,155,145,0.30)",
    borderStrong:"rgba(140,135,125,0.45)",
    textPrimary: "#1C1814",
    textSub:     "#6A5E50",
    textDim:     "#9A8E80",
    gold:        "#8B6010",
    goldBright:  "#A07020",
    shadow:      "rgba(0,0,0,0.09)",
    shadowDeep:  "rgba(0,0,0,0.16)",
  },

  /* 2 — GRIS PERLE: cinza pérola neutro, Chanel */
  perle: {
    nome: "② GRIS PERLE",
    bg:          "#DDDBD6",
    layer1:      "#D5D3CE",
    layer2:      "#CDCBC6",
    layer3:      "#C5C3BE",
    layer4:      "#BDBBB6",
    border:      "rgba(130,128,122,0.28)",
    borderStrong:"rgba(110,108,102,0.42)",
    textPrimary: "#18160F",
    textSub:     "#5A5248",
    textDim:     "#888078",
    gold:        "#7A5208",
    goldBright:  "#946018",
    shadow:      "rgba(0,0,0,0.10)",
    shadowDeep:  "rgba(0,0,0,0.18)",
  },

  /* 3 — GLACIER: grafite claro — versão iluminada do original */
  glacier: {
    nome: "③ GLACIER",
    bg:          "#3A3A52",
    layer1:      "#32324A",
    layer2:      "#2E2E46",
    layer3:      "#424260",
    layer4:      "#4A4A6A",
    border:      "rgba(120,115,160,0.28)",
    borderStrong:"rgba(140,135,180,0.40)",
    textPrimary: "#F0EEF8",
    textSub:     "#A8A0C0",
    textDim:     "#706880",
    gold:        "#C9A84C",
    goldBright:  "#E0C06A",
    shadow:      "rgba(0,0,0,0.28)",
    shadowDeep:  "rgba(0,0,0,0.45)",
  },
};

type TemaKey = keyof typeof TEMAS;

/* ─── Sinaleiro Tiffany: anel fosco + hemisfera de vidro ─── */
function Sinaleiro({ status, size = 28, tema }: { status: string; size?: number; tema: any }) {
  const st = ALERT_STATES.find(s => s.key === status) || ALERT_STATES[0];
  const isClaro = tema.bg > "#888";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Aro externo fosco — estilo joalheria Tiffany */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: isClaro
          ? "linear-gradient(145deg, #E0DCd6 0%, #C8C4BE 40%, #B8B4AE 60%, #D0CCC6 100%)"
          : "linear-gradient(145deg, #5A5870 0%, #3A3850 40%, #2A2840 60%, #4A4860 100%)",
        boxShadow: isClaro
          ? "0 2px 5px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.12)"
          : "0 2px 5px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.4)",
      }} />

      {/* Cavidade interna — profundidade */}
      <div style={{
        position: "absolute", inset: Math.max(2.5, size * 0.09), borderRadius: "50%",
        background: isClaro ? "#1A1410" : "#0A0A18",
        boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8)",
      }} />

      {/* Hemisfera de vidro — luz concentrada */}
      <div style={{
        position: "absolute",
        inset: Math.max(3.5, size * 0.12),
        borderRadius: "50%",
        background: `radial-gradient(circle at 50% 62%, ${st.glow} 0%, ${st.color} 35%, ${st.color}55 58%, transparent 76%)`,
        boxShadow: `inset 0 0 ${size * 0.28}px ${st.color}99`,
      }} />

      {/* Reflexo de vidro — cúpula clara nítida */}
      <div style={{
        position: "absolute",
        top: "12%", left: "20%",
        width: "44%", height: "27%",
        borderRadius: "50%",
        background: "linear-gradient(155deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.30) 55%, transparent 100%)",
        filter: "blur(0.2px)",
        transform: "rotate(-18deg)",
        pointerEvents: "none",
      }} />

      {/* Micro-reflexo */}
      <div style={{
        position: "absolute", bottom: "20%", right: "20%",
        width: "13%", height: "8%", borderRadius: "50%",
        background: "rgba(255,255,255,0.22)", pointerEvents: "none",
      }} />

      {/* Halo de cor — contido */}
      <div style={{
        position: "absolute", inset: -2, borderRadius: "50%",
        border: `1px solid ${st.color}44`,
        boxShadow: `0 0 4px ${st.color}33`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Bloco de pedra lisa — o elemento base de cada camada ─── */
function Bloco({ children, layer, tema, style = {}, shadow = true }: any) {
  const bg = (tema as any)[layer] || tema.layer3;
  return (
    <div style={{
      background: bg,
      boxShadow: shadow ? [
        `inset 0 1px 0 rgba(255,255,255,${tema.bg > "#888" ? "0.55" : "0.08"})`,
        `0 1px 0 ${tema.border}`,
        shadow === "deep"
          ? `0 4px 12px ${tema.shadowDeep}, 0 1px 3px ${tema.shadow}`
          : `0 2px 6px ${tema.shadow}`,
      ].join(", ") : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Botão de filtro — bloco em alto relevo ─── */
function BotaoFiltro({ label, ativo, cor, onClick, tema }: any) {
  const [hovered, setHovered] = useState(false);
  const isClaro = tema.bg > "#888";
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
        transition: "all 0.13s", border: "none", borderRadius: 2,
        background: ativo
          ? `${cor}${isClaro ? "20" : "28"}`
          : hovered ? tema.layer4 : tema.layer3,
        color: ativo ? cor : hovered ? tema.textSub : tema.textDim,
        boxShadow: ativo
          ? [
            `inset 0 0 0 1.5px ${cor}66`,
            `0 1px 3px ${tema.shadow}`,
            `0 0 6px ${cor}22`,
          ].join(", ")
          : hovered
          ? [
            `0 3px 0 ${tema.shadowDeep}`,
            `0 3px 6px ${tema.shadow}`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.55" : "0.10"})`,
            `inset 0 0 0 1px ${tema.border}`,
          ].join(", ")
          : [
            `0 2px 0 ${tema.shadow}`,
            `0 2px 4px ${tema.shadow}`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.45" : "0.07"})`,
            `inset 0 0 0 1px ${tema.border}`,
          ].join(", "),
        transform: ativo ? "translateY(2px)" : "translateY(0)",
        textShadow: ativo && cor ? `0 0 5px ${cor}66` : "none",
        minWidth: 52,
      }}
    >
      {label}
    </button>
  );
}

/* ─── Linha de paciente — bloco sobre bloco ─── */
function PatientRow({ patient, onSelect, selected, tema }: any) {
  const st = ALERT_STATES.find(s => s.key === patient.status) || ALERT_STATES[0];
  const [hovered, setHovered] = useState(false);
  const isClaro = tema.bg > "#888";

  return (
    <div
      onClick={() => onSelect(patient)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 14px 11px 16px",
        marginBottom: 3, borderRadius: 2,
        cursor: "pointer", transition: "all 0.13s",
        background: selected ? tema.layer4 : hovered ? tema.layer3 : tema.layer2,
        boxShadow: selected
          ? [
            `inset 4px 0 0 ${st.color}`,
            `inset 0 1px 0 ${st.color}55`,
            `inset -1px 0 0 ${tema.borderStrong}`,
            `inset 0 -1px 0 ${st.color}44`,
            `0 2px 8px ${tema.shadowDeep}`,
            `0 0 8px ${st.color}14`,
          ].join(", ")
          : hovered
          ? [
            `inset 3px 0 0 ${st.color}88`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.45" : "0.08"})`,
            `inset -1px 0 0 ${tema.border}`,
            `inset 0 -1px 0 ${tema.border}`,
            `0 2px 6px ${tema.shadow}`,
          ].join(", ")
          : [
            `inset 3px 0 0 ${st.color}44`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.35" : "0.05"})`,
            `inset -1px 0 0 ${tema.border}`,
            `inset 0 -1px 0 ${tema.border}`,
          ].join(", "),
      }}
    >
      <Sinaleiro status={patient.status} size={22} tema={tema} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: selected ? tema.textPrimary : tema.textSub,
          fontSize: 12.5, fontWeight: 600,
          letterSpacing: "0.025em", fontFamily: "monospace",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {patient.nome}
        </div>
        <div style={{ color: tema.textDim, fontSize: 10.5, marginTop: 2 }}>
          {patient.proc} · {patient.unidade}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: tema.goldBright, fontSize: 11.5, fontFamily: "monospace", fontWeight: 700 }}>
          {patient.hora}
        </div>
        <div style={{
          fontSize: 9.5, letterSpacing: "0.1em", marginTop: 3,
          color: st.color, textShadow: `0 0 4px ${st.glow}66`,
          fontFamily: "monospace", fontWeight: 700,
        }}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

/* ─── Botão de ação — bloco 3D alto relevo ─── */
function BotaoAcao({ label, icon, color, onClick, active, tema }: any) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isClaro = tema.bg > "#888";
  const cor = color || tema.goldBright;

  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); setHovered(false); }}
      onMouseEnter={() => setHovered(true)}
      onClick={onClick}
      style={{
        background: pressed ? tema.layer2 : active ? tema.layer4 : hovered ? tema.layer3 : tema.layer3,
        color: active ? cor : hovered ? tema.textSub : tema.textDim,
        padding: "8px 18px",
        fontSize: 10.5, fontFamily: "monospace",
        letterSpacing: "0.1em", fontWeight: 700,
        cursor: "pointer", textTransform: "uppercase" as any,
        border: "none", borderRadius: 3,
        boxShadow: pressed
          ? [
            `inset 2px 2px 5px ${tema.shadowDeep}`,
            `inset -1px -1px 2px rgba(255,255,255,${isClaro ? "0.5" : "0.05"})`,
            `inset 0 0 0 1px ${tema.borderStrong}`,
            `0 1px 0 rgba(255,255,255,${isClaro ? "0.4" : "0.04"})`,
          ].join(", ")
          : active
          ? [
            `0 4px 0 ${tema.shadowDeep}`,
            `0 5px 10px ${tema.shadow}`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.6" : "0.12"})`,
            `inset 0 0 0 1px ${cor}44`,
            `0 0 7px ${cor}33`,
          ].join(", ")
          : [
            `0 4px 0 ${tema.shadowDeep}`,
            `0 5px 9px ${tema.shadow}`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.55" : "0.09"})`,
            `inset 0 0 0 1px ${tema.border}`,
          ].join(", "),
        transform: pressed ? "translateY(3px)" : "translateY(0)",
        textShadow: active ? `0 0 5px ${cor}77` : "none",
        transition: "all 0.07s", minWidth: 72,
      }}
    >
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
      {label}
    </button>
  );
}

/* ══════════════════════════════════
   PAINEL PRINCIPAL
   ══════════════════════════════════ */
export default function SaharaNoirPanel() {
  const [temaKey, setTemaKey] = useState<TemaKey>("quartz");
  const [selected, setSelected] = useState<any>(PATIENTS[0]);
  const [filtro, setFiltro] = useState("todos");

  const tema = TEMAS[temaKey];
  const alertPrincipal = selected
    ? (ALERT_STATES.find(s => s.key === selected.status) || ALERT_STATES[0])
    : ALERT_STATES[0];
  const filtered = filtro === "todos" ? PATIENTS : PATIENTS.filter(p => p.status === filtro);
  const isClaro = tema.bg > "#888";

  return (
    <div style={{
      minHeight: "100vh",
      background: tema.bg,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column",
      color: tema.textPrimary,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* ── Seletor de tema ── */}
        <div style={{
          background: tema.layer1,
          padding: "6px 22px",
          display: "flex", gap: 6, alignItems: "center",
          boxShadow: `0 1px 0 ${tema.borderStrong}, inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.5" : "0.07"})`,
        }}>
          <span style={{ fontSize: 9, color: tema.textDim, letterSpacing: "0.15em", marginRight: 4 }}>
            TEMA:
          </span>
          {(Object.keys(TEMAS) as TemaKey[]).map(k => (
            <button
              key={k}
              onClick={() => setTemaKey(k)}
              style={{
                padding: "4px 12px", fontSize: 9, fontFamily: "monospace",
                letterSpacing: "0.1em", textTransform: "uppercase" as any,
                cursor: "pointer", border: "none", borderRadius: 2,
                background: temaKey === k ? tema.goldBright : tema.layer3,
                color: temaKey === k ? (isClaro ? "#fff" : "#0A0A18") : tema.textDim,
                fontWeight: temaKey === k ? 700 : 400,
                boxShadow: temaKey === k
                  ? `0 2px 0 ${tema.shadowDeep}, 0 2px 6px ${tema.shadow}`
                  : `0 2px 0 ${tema.shadow}, inset 0 0 0 1px ${tema.border}`,
                transform: temaKey === k ? "translateY(1px)" : "translateY(0)",
                transition: "all 0.1s",
              }}
            >
              {TEMAS[k].nome}
            </button>
          ))}
        </div>

        {/* ── Header ── */}
        <Bloco layer="layer1" tema={tema} style={{
          padding: "12px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: [
            `0 1px 0 ${tema.borderStrong}`,
            `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.50" : "0.08"})`,
            `0 2px 8px ${tema.shadow}`,
          ].join(", "),
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 33, height: 33, flexShrink: 0,
              background: `linear-gradient(135deg, ${tema.goldBright} 0%, ${tema.gold} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900,
              color: isClaro ? "#fff" : "#0A0A18",
              clipPath: "polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)",
            }}>Ⓟ</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: tema.gold }}>
                PAWARDS
              </div>
              <div style={{ fontSize: 8.5, color: tema.textDim, letterSpacing: "0.28em", marginTop: 1 }}>
                MEDCORE · SISTEMA CLÍNICO INTELIGENTE
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Sinaleiro status={st.key} size={17} tema={tema} />
                <span style={{ fontSize: 10, color: tema.textSub, fontFamily: "monospace", fontWeight: 600 }}>
                  {PATIENTS.filter(p => p.status === st.key).length}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 18, background: tema.borderStrong, margin: "0 4px" }} />
            <div style={{ fontSize: 10.5, color: tema.textSub, fontFamily: "monospace", letterSpacing: "0.08em" }}>
              16.04.2026 · 09:04
            </div>
          </div>
        </Bloco>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Painel esquerdo ── */}
          <Bloco layer="layer2" tema={tema} shadow={false} style={{
            width: 338, flexShrink: 0,
            display: "flex", flexDirection: "column",
            boxShadow: `inset -1px 0 0 ${tema.borderStrong}`,
          }}>
            {/* Filtros */}
            <div style={{
              padding: "10px 12px",
              display: "flex", gap: 5, flexWrap: "wrap" as any,
              alignItems: "center",
              boxShadow: `inset 0 -1px 0 ${tema.borderStrong}`,
            }}>
              <BotaoFiltro label="TODOS" ativo={filtro === "todos"} cor={tema.goldBright} onClick={() => setFiltro("todos")} tema={tema} />
              {ALERT_STATES.map(st => (
                <BotaoFiltro key={st.key} label={st.label} ativo={filtro === st.key} cor={st.color} onClick={() => setFiltro(st.key)} tema={tema} />
              ))}
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "8px" }}>
              {filtered.map(p => (
                <PatientRow key={p.id} patient={p} onSelect={setSelected} selected={selected?.id === p.id} tema={tema} />
              ))}
            </div>

            {/* Botões base */}
            <div style={{
              padding: "10px 12px", display: "flex", gap: 7,
              boxShadow: `inset 0 1px 0 ${tema.borderStrong}`,
            }}>
              <BotaoAcao label="+ Novo" icon="⊕" tema={tema} />
              <BotaoAcao label="Sync"   icon="↻" color={tema.textSub} tema={tema} />
            </div>
          </Bloco>

          {/* ── Painel direito ── */}
          <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto" as any, background: tema.bg }}>
            {selected ? (
              <div>
                {/* Card principal */}
                <Bloco layer="layer3" tema={tema} shadow="deep" style={{
                  padding: "15px 18px", marginBottom: 14, borderRadius: 3,
                  position: "relative",
                  boxShadow: [
                    `inset 0 3px 0 ${alertPrincipal.color}`,
                    `inset 1px 0 0 ${alertPrincipal.color}33`,
                    `inset -1px 0 0 ${tema.border}`,
                    `inset 0 -1px 0 ${tema.border}`,
                    `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.55" : "0.08"})`,
                    `0 4px 14px ${tema.shadowDeep}`,
                    `0 0 14px ${alertPrincipal.color}10`,
                  ].join(", "),
                }}>
                  {/* Linha neon superior */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: alertPrincipal.color,
                    boxShadow: `0 0 7px ${alertPrincipal.glow}BB, 0 0 14px ${alertPrincipal.glow}44`,
                    borderRadius: "3px 3px 0 0", pointerEvents: "none",
                  }} />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <Sinaleiro status={selected.status} size={40} tema={tema} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: tema.textPrimary, letterSpacing: "0.03em" }}>
                        {selected.nome}
                      </div>
                      <div style={{ color: tema.textSub, fontSize: 11.5, marginTop: 4, letterSpacing: "0.04em" }}>
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
                </Bloco>

                {/* Grid metadados */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "PROCEDIMENTO", valor: selected.proc,          icon: "◈", destaque: false },
                    { label: "STATUS ATUAL",  valor: alertPrincipal.label,  icon: "◉", destaque: true  },
                    { label: "UNIDADE",       valor: selected.unidade,      icon: "◎", destaque: false },
                    { label: "HORÁRIO",       valor: selected.hora,         icon: "◷", destaque: false },
                  ].map((item, i) => (
                    <Bloco key={i} layer="layer3" tema={tema} shadow="deep" style={{
                      padding: "12px 14px", borderRadius: 2,
                      boxShadow: item.destaque
                        ? [
                          `inset 4px 0 0 ${alertPrincipal.color}`,
                          `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.55" : "0.08"})`,
                          `inset -1px 0 0 ${tema.border}`,
                          `inset 0 -1px 0 ${tema.border}`,
                          `0 3px 10px ${tema.shadowDeep}`,
                          `0 0 10px ${alertPrincipal.color}12`,
                        ].join(", ")
                        : [
                          `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.50" : "0.07"})`,
                          `inset 0 0 0 1px ${tema.border}`,
                          `0 2px 8px ${tema.shadow}`,
                        ].join(", "),
                    }}>
                      <div style={{ fontSize: 9, color: tema.textDim, letterSpacing: "0.18em", marginBottom: 6 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, fontFamily: "monospace",
                        color: item.destaque ? alertPrincipal.color : tema.goldBright,
                        textShadow: item.destaque ? `0 0 5px ${alertPrincipal.glow}66` : "none",
                      }}>
                        {item.valor}
                      </div>
                    </Bloco>
                  ))}
                </div>

                {/* Botões de ação */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as any }}>
                  <BotaoAcao label="Visualizar RAS" icon="▶" color={tema.goldBright} active tema={tema} />
                  <BotaoAcao label="Remarcar"       icon="↺" tema={tema} />
                  <BotaoAcao label="Validar Código" icon="◈" tema={tema} />
                  <BotaoAcao label="Upload Exame"   icon="↑" tema={tema} />
                </div>

                {/* Linha de atividade */}
                <Bloco layer="layer3" tema={tema} shadow={true} style={{
                  marginTop: 18, padding: "10px 14px", borderRadius: 2,
                  boxShadow: [
                    `inset 0 0 0 1px ${tema.border}`,
                    `inset 0 -2px 0 ${alertPrincipal.color}22`,
                    `inset 0 1px 0 rgba(255,255,255,${isClaro ? "0.50" : "0.07"})`,
                    `0 2px 6px ${tema.shadow}`,
                  ].join(", "),
                }}>
                  <div style={{ fontSize: 9, color: tema.textDim, letterSpacing: "0.22em", marginBottom: 8 }}>
                    ◈ LINHA DE ATIVIDADE
                  </div>
                  {[
                    { t: "09:02", ev: "Check-in realizado",    dot: "#00966A" },
                    { t: "09:00", ev: "Procedimento iniciado", dot: tema.gold },
                    { t: "08:45", ev: "Triagem completa",      dot: tema.textDim },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.dot, boxShadow: `0 0 4px ${item.dot}AA`, flexShrink: 0,
                      }} />
                      <span style={{ color: tema.textDim, fontSize: 10, fontFamily: "monospace", width: 36 }}>
                        {item.t}
                      </span>
                      <span style={{ color: tema.textSub, fontSize: 11 }}>{item.ev}</span>
                    </div>
                  ))}
                </Bloco>
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: tema.textDim, letterSpacing: "0.1em",
              }}>
                Selecione um paciente
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <Bloco layer="layer1" tema={tema} style={{
          padding: "7px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: `inset 0 1px 0 ${tema.borderStrong}, 0 -1px 0 ${tema.border}`,
        }}>
          <div style={{ fontSize: 8.5, color: tema.textDim, letterSpacing: "0.18em" }}>
            PAWARDS MEDCORE · INSTITUTO PÁDUA · RASX-MATRIZ V6
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {ALERT_STATES.map(st => (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: st.color, boxShadow: `0 0 4px ${st.glow}AA`,
                }} />
                <span style={{ fontSize: 8.5, color: tema.textDim }}>{st.label}</span>
              </div>
            ))}
          </div>
        </Bloco>

      </div>
    </div>
  );
}
