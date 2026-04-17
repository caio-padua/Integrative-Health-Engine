import { useState, useRef } from "react";

/* ════════════════════════════════════════════════════════════════
   PADUA ATELIER — Premium Light, TDAH-Friendly, Multi-Layer
   Inspirado em: Linear · Stripe Dashboard · Vercel · Apple HIG
   ════════════════════════════════════════════════════════════════ */

/* ──────── PALETA CLARA ──────── */
const C = {
  /* fundos */
  bg:         "#F7F4EC",  /* marfim quente */
  bgAlt:      "#EFEBE0",  /* marfim mais saturado para grid */
  surface:    "#FFFFFF",
  surfaceAlt: "#FBF9F2",
  /* dourado */
  gold:       "#B8924A",
  goldDark:   "#8A6D33",
  goldLight:  "#D9B870",
  goldFaint:  "#F4EBD0",
  /* texto */
  text:       "#1A1A2E",
  textSub:    "#5A5A6E",
  textDim:    "#8A8A9A",
  textFaint:  "#B0B0BE",
  /* bordas */
  border:     "#E5DFD0",
  borderStrong:"#D4CCB6",
  /* ink (cinza escuro frio) */
  ink:        "#0F1320",
  inkSub:     "#2C3142",
};

/* ──────── STATUS DIAGNÓSTICO ──────── */
type DiagStatus = "diagnosticado" | "potencial" | "investigacao" | "descartado";
interface DiagOption {
  key: DiagStatus; label: string; color: string; soft: string; bg: string;
}
const DIAG: DiagOption[] = [
  { key: "diagnosticado", label: "DIAGNOSTICADO", color: "#00945C", soft: "#00945C22", bg: "#E8F7F0" },
  { key: "potencial",     label: "POTENCIAL",      color: "#D97706", soft: "#D9770622", bg: "#FEF3E0" },
  { key: "investigacao",  label: "INVESTIGAÇÃO",   color: "#3B5BDB", soft: "#3B5BDB22", bg: "#E8EEFB" },
  { key: "descartado",    label: "DESCARTADO",     color: "#C0392B", soft: "#C0392B22", bg: "#FCEBE8" },
];

/* ──────── DADOS MOCK ──────── */
interface Doenca {
  id: string; nome: string; cid: string; status: DiagStatus;
  gravidade: "leve" | "moderado" | "grave"; data: string;
  evolucao: number[]; min: number; max: number; atual: number; unidade: string;
}
const DOENCAS_INIT: Doenca[] = [
  { id: "D001", nome: "Hipotireoidismo Subclínico", cid: "E03.9", status: "diagnosticado",
    gravidade: "moderado", data: "12/03/2026",
    evolucao: [3.8, 4.2, 4.5, 4.9, 5.3, 5.1, 4.8, 4.5, 4.2, 4.0, 3.9, 3.8],
    min: 0.4, max: 4.5, atual: 3.8, unidade: "mUI/L (TSH)" },
  { id: "D002", nome: "Resistência Insulínica",     cid: "E88.8", status: "potencial",
    gravidade: "leve", data: "15/03/2026",
    evolucao: [2.1, 2.3, 2.5, 2.8, 3.1, 3.0, 2.9, 2.7, 2.6, 2.5, 2.4, 2.3],
    min: 0.5, max: 2.5, atual: 2.3, unidade: "HOMA-IR" },
  { id: "D003", nome: "Deficiência de Vitamina D",  cid: "E55.9", status: "diagnosticado",
    gravidade: "leve", data: "10/01/2026",
    evolucao: [18, 22, 26, 31, 35, 38, 42, 46, 49, 52, 55, 58],
    min: 30, max: 100, atual: 58, unidade: "ng/mL (25-OH)" },
  { id: "D004", nome: "Dislipidemia Mista",         cid: "E78.2", status: "investigacao",
    gravidade: "moderado", data: "20/03/2026",
    evolucao: [220, 215, 210, 205, 200, 198, 195, 192, 190, 188, 186, 184],
    min: 0, max: 190, atual: 184, unidade: "mg/dL (LDL)" },
  { id: "D005", nome: "Síndrome Metabólica",        cid: "E88.8", status: "potencial",
    gravidade: "grave", data: "22/03/2026",
    evolucao: [3, 3, 4, 4, 5, 5, 4, 4, 3, 3, 3, 3],
    min: 0, max: 2, atual: 3, unidade: "Critérios NCEP" },
  { id: "D006", nome: "Esteatose Hepática Grau I",  cid: "K76.0", status: "descartado",
    gravidade: "leve", data: "05/02/2026",
    evolucao: [42, 38, 35, 32, 30, 28, 26, 24, 23, 22, 21, 20],
    min: 0, max: 40, atual: 20, unidade: "ALT (U/L)" },
];

const PACIENTE = {
  nome: "Dr. Caio Henrique Pádua", id: "P044", cpf: "•••.•••.•••-14",
  unidade: "Instituto Pádua · Vila Mariana", idade: 38, sexo: "M",
  peso: 78.4, altura: 1.78, imc: 24.7, prontuario: "Ma13-2026-044",
};

/* ════════════════════════════════════════════════════════
   COMPONENTES BASE
   ════════════════════════════════════════════════════════ */

/* ─── Card com elevação interativa ─── */
function ElevatedCard({
  children, padding = 18, hover = true, active = false,
  accent, style = {}, onClick,
}: {
  children: React.ReactNode; padding?: number; hover?: boolean; active?: boolean;
  accent?: string; style?: React.CSSProperties; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const lift = pressed ? 0 : hovered && hover ? -2 : 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => onClick && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${active ? C.gold : hovered ? C.borderStrong : C.border}`,
        borderRadius: 8,
        padding,
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        transform: `translateY(${lift}px)`,
        transition: "transform 0.18s cubic-bezier(0.2,0.7,0.3,1), border-color 0.18s, box-shadow 0.18s",
        boxShadow: active
          ? `0 0 0 1px ${C.gold}, 0 6px 18px ${C.gold}25, 0 2px 6px rgba(15,19,32,0.06)`
          : hovered && hover
          ? `0 8px 22px rgba(15,19,32,0.10), 0 2px 6px rgba(15,19,32,0.06)`
          : `0 1px 3px rgba(15,19,32,0.05), 0 1px 2px rgba(15,19,32,0.03)`,
        ...style,
      }}
    >
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
          background: accent, borderRadius: "8px 0 0 8px",
        }} />
      )}
      {children}
    </div>
  );
}

/* ─── Logo Selo P ─── */
function LogoP({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, position: "relative", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
        borderRadius: 6,
        boxShadow: `0 2px 6px rgba(184,146,74,0.35), inset 0 1px 0 rgba(255,255,255,0.4)`,
      }} />
      <div style={{
        position: "absolute", inset: 1.5, borderRadius: 5,
        border: `0.5px solid rgba(255,255,255,0.55)`,
        background: `linear-gradient(160deg, ${C.goldLight}55 0%, transparent 60%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5, fontWeight: 900, color: "#FFF8E7",
        fontFamily: "'Playfair Display', Georgia, serif",
        textShadow: `0 1px 2px rgba(0,0,0,0.3)`,
      }}>P</div>
    </div>
  );
}

/* ─── Botão de Ajuda (vídeo/áudio explicativo em PIP) ─── */
function HelpButton({ titulo, descricao }: { titulo: string; descricao: string }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Ajuda em vídeo e áudio"
        style={{
          width: 22, height: 22, borderRadius: "50%",
          border: `1px solid ${C.gold}`,
          background: `linear-gradient(135deg, ${C.goldFaint}, ${C.surface})`,
          color: C.goldDark, fontSize: 12, fontWeight: 700,
          fontFamily: "'Georgia', serif", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 1px 3px rgba(184,146,74,0.25)`,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 3px ${C.gold}33, 0 2px 5px rgba(184,146,74,0.4)`;
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 1px 3px rgba(184,146,74,0.25)`;
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ?
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,19,32,0.55)",
            backdropFilter: "blur(4px)", zIndex: 9000,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480, background: C.surface, borderRadius: 12,
              border: `1px solid ${C.border}`,
              boxShadow: `0 24px 60px rgba(15,19,32,0.35), 0 0 0 1px ${C.gold}55`,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#FF5C5C",
                  boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.1)`,
                }} />
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>
                  Tutorial PIP · {titulo}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent", border: "none",
                  color: C.textSub, fontSize: 18, cursor: "pointer",
                  padding: 0, width: 22, height: 22, lineHeight: "22px",
                }}
              >×</button>
            </div>

            {/* Player Vídeo */}
            <div style={{
              aspectRatio: "16/9", background: `linear-gradient(135deg, ${C.ink} 0%, ${C.inkSub} 100%)`,
              position: "relative", display: "flex",
              alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {/* Fundo decorativo */}
              <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
                <defs>
                  <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill={C.goldLight} />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>

              {/* Botão Play */}
              <button
                onClick={() => setPlaying(p => !p)}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 100%)`,
                  border: `2px solid ${C.goldFaint}`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px rgba(184,146,74,0.45), 0 0 0 8px rgba(184,146,74,0.18)`,
                  color: C.ink, fontSize: 28, paddingLeft: playing ? 0 : 6,
                  transition: "transform 0.12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {playing ? "❙❙" : "▶"}
              </button>

              {/* Timestamp */}
              <div style={{
                position: "absolute", bottom: 12, left: 16,
                fontSize: 10, color: C.goldLight, fontFamily: "monospace",
                background: "rgba(0,0,0,0.45)", padding: "3px 8px", borderRadius: 3,
              }}>
                {playing ? "00:14 / 02:38" : "00:00 / 02:38"}
              </div>

              {/* Áudio bars decorativos */}
              {playing && (
                <div style={{
                  position: "absolute", bottom: 12, right: 16,
                  display: "flex", gap: 2, alignItems: "flex-end", height: 16,
                }}>
                  {[0.6, 0.9, 0.4, 0.8, 0.5, 0.7].map((h, i) => (
                    <div key={i} style={{
                      width: 2, height: `${h * 100}%`,
                      background: C.goldLight,
                      animation: `pulse 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div style={{ padding: "14px 18px" }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: C.text,
                fontFamily: "'Playfair Display', Georgia, serif",
                marginBottom: 6,
              }}>
                {titulo}
              </div>
              <div style={{ fontSize: 11.5, color: C.textSub, lineHeight: 1.55 }}>
                {descricao}
              </div>

              <div style={{
                marginTop: 12, paddingTop: 10,
                borderTop: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace" }}>
                  ▸ Vídeo + Áudio sincronizado · narrado por Dr. Caio
                </div>
                <button style={{
                  fontSize: 10, padding: "5px 10px",
                  border: `1px solid ${C.gold}`, background: C.goldFaint,
                  color: C.goldDark, fontWeight: 700, cursor: "pointer",
                  borderRadius: 4, fontFamily: "'Georgia', serif",
                  letterSpacing: "0.08em",
                }}>
                  ABRIR EM TELA CHEIA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%{opacity:0.4}100%{opacity:1}}`}</style>
    </>
  );
}

/* ─── Botão de Status (muda cor ao clicar) ─── */
function StatusButton({ option, active, onClick }: {
  option: DiagOption; active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, padding: "10px 12px",
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.10em",
        fontFamily: "'Inter', system-ui, sans-serif",
        textTransform: "uppercase",
        cursor: "pointer", borderRadius: 6,
        border: `1px solid ${active ? option.color : hovered ? C.borderStrong : C.border}`,
        background: active ? option.bg : hovered ? C.surfaceAlt : C.surface,
        color: active ? option.color : C.textSub,
        transition: "all 0.18s cubic-bezier(0.2,0.7,0.3,1)",
        boxShadow: active
          ? `0 0 0 3px ${option.soft}, 0 4px 12px ${option.color}22, inset 0 -2px 0 ${option.color}`
          : hovered ? `0 2px 6px rgba(15,19,32,0.08)` : "none",
        transform: active ? "translateY(0)" : hovered ? "translateY(-1px)" : "translateY(0)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        position: "relative",
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: active ? option.color : C.borderStrong,
        boxShadow: active ? `0 0 8px ${option.color}88` : "none",
      }} />
      {option.label}
    </button>
  );
}

/* ─── Sparkline com min/max/atual ─── */
function Sparkline({ data, min, max, color, width = 280, height = 80 }: {
  data: number[]; min: number; max: number; color: string;
  width?: number; height?: number;
}) {
  const dMin = Math.min(...data, min);
  const dMax = Math.max(...data, max);
  const range = dMax - dMin || 1;
  const pad = 6;
  const W = width - pad * 2;
  const H = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * W;
    const y = pad + H - ((v - dMin) / range) * H;
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1][0]} ${pad + H} L ${pad} ${pad + H} Z`;

  const yMin = pad + H - ((min - dMin) / range) * H;
  const yMax = pad + H - ((max - dMin) / range) * H;
  const lastPt = points[points.length - 1];

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Linha de máximo (referência) */}
      <line x1={pad} y1={yMax} x2={width - pad} y2={yMax}
        stroke={C.textFaint} strokeWidth="1" strokeDasharray="3 3" />
      <text x={width - pad - 2} y={yMax - 3} fontSize="8.5" fill={C.textDim}
        textAnchor="end" fontFamily="monospace">MAX {max}</text>

      {/* Linha de mínimo (referência) */}
      <line x1={pad} y1={yMin} x2={width - pad} y2={yMin}
        stroke={C.textFaint} strokeWidth="1" strokeDasharray="3 3" />
      <text x={width - pad - 2} y={yMin + 10} fontSize="8.5" fill={C.textDim}
        textAnchor="end" fontFamily="monospace">MIN {min}</text>

      {/* Área */}
      <path d={areaPath} fill={`url(#grad-${color.slice(1)})`} />

      {/* Curva */}
      <path d={path} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Pontos */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3.5 : 1.5}
          fill={i === points.length - 1 ? color : C.surface}
          stroke={color} strokeWidth={i === points.length - 1 ? 2 : 1} />
      ))}

      {/* Valor atual destacado */}
      <text x={lastPt[0]} y={lastPt[1] - 8} fontSize="10" fill={color}
        fontWeight="700" textAnchor="middle" fontFamily="monospace">
        {data[data.length - 1]}
      </text>
    </svg>
  );
}

/* ─── Barra horizontal min/atual/max ─── */
function RangeBar({ label, value, min, max, color, ideal }: {
  label: string; value: number; min: number; max: number; color: string;
  ideal?: [number, number];
}) {
  const range = max - min;
  const valuePct = ((value - min) / range) * 100;
  const idealStart = ideal ? ((ideal[0] - min) / range) * 100 : 0;
  const idealEnd = ideal ? ((ideal[1] - min) / range) * 100 : 100;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: 5, alignItems: "baseline",
      }}>
        <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: color, fontFamily: "monospace", fontWeight: 700 }}>
          {value}
        </span>
      </div>
      <div style={{
        position: "relative", height: 8, borderRadius: 4,
        background: C.bgAlt, overflow: "hidden",
        border: `1px solid ${C.border}`,
      }}>
        {/* Faixa ideal */}
        {ideal && (
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${idealStart}%`, width: `${idealEnd - idealStart}%`,
            background: `linear-gradient(90deg, ${color}25, ${color}15)`,
            borderLeft: `1px dashed ${color}66`,
            borderRight: `1px dashed ${color}66`,
          }} />
        )}
        {/* Marcador atual */}
        <div style={{
          position: "absolute", top: -2, bottom: -2,
          left: `calc(${valuePct}% - 2px)`, width: 4,
          background: color, borderRadius: 2,
          boxShadow: `0 0 0 2px ${C.surface}, 0 0 6px ${color}88`,
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 2, fontSize: 8.5, color: C.textDim, fontFamily: "monospace",
      }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/* ─── Gravidade Badge ─── */
function GravidadeBadge({ nivel }: { nivel: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    leve:     { color: "#00945C", bg: "#E8F7F0", label: "LEVE" },
    moderado: { color: "#D97706", bg: "#FEF3E0", label: "MODERADO" },
    grave:    { color: "#C0392B", bg: "#FCEBE8", label: "GRAVE" },
  };
  const c = config[nivel] || config.leve;
  return (
    <span style={{
      padding: "2px 8px", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.10em", color: c.color, background: c.bg,
      border: `1px solid ${c.color}33`, borderRadius: 3,
      fontFamily: "'Inter', sans-serif",
    }}>
      {c.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function PaduaAtelierPanel() {
  const [doencas, setDoencas] = useState<Doenca[]>(DOENCAS_INIT);
  const [selectedId, setSelectedId] = useState("D001");
  const sel = doencas.find(d => d.id === selectedId) || doencas[0];
  const diagAtual = DIAG.find(d => d.key === sel.status) || DIAG[0];

  const changeStatus = (s: DiagStatus) => {
    setDoencas(prev => prev.map(d => d.id === selectedId ? { ...d, status: s } : d));
  };

  const cont = {
    diagnosticado: doencas.filter(d => d.status === "diagnosticado").length,
    potencial:     doencas.filter(d => d.status === "potencial").length,
    investigacao:  doencas.filter(d => d.status === "investigacao").length,
    descartado:    doencas.filter(d => d.status === "descartado").length,
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: C.text, display: "flex", flexDirection: "column",
    }}>

      {/* ═══════════ HEADER ═══════════ */}
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: `0 1px 3px rgba(15,19,32,0.04)`,
      }}>
        {/* Logo + Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LogoP size={36} />
          <div>
            <div style={{
              fontSize: 16, fontWeight: 800, letterSpacing: "0.18em",
              color: C.text, fontFamily: "'Playfair Display', Georgia, serif",
            }}>
              PAWARDS
            </div>
            <div style={{ fontSize: 9.5, color: C.textDim, letterSpacing: "0.18em" }}>
              ATELIER · INSTITUTO PÁDUA · RASX V6
            </div>
          </div>

          <div style={{
            height: 22, width: 1, background: C.border, margin: "0 14px",
          }} />

          <nav style={{ display: "flex", gap: 4, fontSize: 12 }}>
            {["Dashboard", "Pacientes", "Anamnese", "Acompanhamento", "Exames", "Relatórios"].map((item, i) => (
              <button key={item} style={{
                padding: "6px 12px", borderRadius: 4,
                background: i === 1 ? C.goldFaint : "transparent",
                border: i === 1 ? `1px solid ${C.gold}66` : "1px solid transparent",
                color: i === 1 ? C.goldDark : C.textSub,
                fontWeight: i === 1 ? 700 : 500, cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 11.5,
              }}>{item}</button>
            ))}
          </nav>
        </div>

        {/* Contadores + Usuário */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {DIAG.map(opt => (
              <div key={opt.key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 4,
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: opt.color,
                  boxShadow: `0 0 0 2px ${opt.bg}`,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 800, color: opt.color,
                  fontFamily: "monospace",
                }}>{cont[opt.key]}</span>
              </div>
            ))}
          </div>

          <div style={{
            width: 1, height: 24, background: C.border,
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>Dr. Caio Pádua</div>
              <div style={{ fontSize: 9, color: C.textDim }}>CRM 153.402-SP</div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.surface, fontWeight: 800, fontSize: 12,
              boxShadow: `0 2px 5px rgba(184,146,74,0.35)`,
            }}>CP</div>
          </div>
        </div>
      </header>

      {/* ═══════════ BREADCRUMB / TÍTULO ═══════════ */}
      <div style={{
        padding: "16px 28px 0", display: "flex",
        justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div>
          <div style={{
            fontSize: 10, color: C.textDim, letterSpacing: "0.15em",
            marginBottom: 4, display: "flex", alignItems: "center", gap: 6,
          }}>
            PACIENTES <span style={{ color: C.goldDark }}>›</span> {PACIENTE.nome.toUpperCase()} <span style={{ color: C.goldDark }}>›</span> HIPÓTESES DIAGNÓSTICAS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: C.text,
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0, letterSpacing: "-0.01em",
            }}>
              Painel Clínico Integrativo
            </h1>
            <HelpButton
              titulo="Como navegar no Painel Clínico"
              descricao="Aprenda em 2:38 minutos como usar o painel: alterar status diagnóstico, interpretar gráficos de evolução, cruzar marcadores em matriz multi-camadas e exportar relatórios. Vídeo narrado com áudio sincronizado."
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 600,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.textSub, borderRadius: 5, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>EXPORTAR PDF</button>
          <button style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 700,
            background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
            border: `1px solid ${C.goldDark}`, color: C.surface,
            borderRadius: 5, cursor: "pointer", letterSpacing: "0.04em",
            fontFamily: "'Inter', sans-serif",
            boxShadow: `0 2px 5px rgba(184,146,74,0.35)`,
          }}>+ NOVA HIPÓTESE</button>
        </div>
      </div>

      {/* ═══════════ GRID PRINCIPAL ═══════════ */}
      <main style={{
        display: "grid", gridTemplateColumns: "320px 1fr 320px",
        gap: 16, padding: "16px 28px", flex: 1,
      }}>

        {/* ────── COLUNA ESQUERDA: PACIENTE + LISTA ────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Card Paciente */}
          <ElevatedCard accent={C.gold}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 10,
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace",
              }}>PACIENTE ATIVO</div>
              <HelpButton
                titulo="Cartão do Paciente"
                descricao="Aqui aparecem dados rápidos: nome, idade, IMC, prontuário Ma13. Clique no nome para abrir o registro completo."
              />
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: C.text,
              fontFamily: "'Playfair Display', Georgia, serif",
              lineHeight: 1.25, marginBottom: 8,
            }}>{PACIENTE.nome}</div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
              fontSize: 10.5, color: C.textSub, marginBottom: 10,
            }}>
              <div><strong style={{ color: C.text }}>{PACIENTE.idade}</strong> anos · {PACIENTE.sexo}</div>
              <div>IMC <strong style={{ color: C.text }}>{PACIENTE.imc}</strong></div>
              <div>Peso <strong style={{ color: C.text }}>{PACIENTE.peso}</strong>kg</div>
              <div>Altura <strong style={{ color: C.text }}>{PACIENTE.altura}</strong>m</div>
            </div>

            <div style={{
              padding: "8px 10px", background: C.surfaceAlt,
              border: `1px solid ${C.border}`, borderRadius: 4,
              fontSize: 9.5, color: C.textDim, fontFamily: "monospace",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>ID {PACIENTE.id}</span>
              <span>{PACIENTE.prontuario}</span>
            </div>
            <div style={{
              fontSize: 10, color: C.goldDark, marginTop: 8,
              letterSpacing: "0.05em",
            }}>📍 {PACIENTE.unidade}</div>
          </ElevatedCard>

          {/* Lista Doenças */}
          <ElevatedCard padding={0} hover={false}>
            <div style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: C.surfaceAlt,
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace", fontWeight: 700,
              }}>HIPÓTESES · {doencas.length}</div>
              <HelpButton
                titulo="Lista de Hipóteses"
                descricao="Cada item é uma hipótese diagnóstica. A barra colorida à esquerda indica o status atual. Clique para abrir os detalhes e o gráfico de evolução."
              />
            </div>

            <div style={{ maxHeight: 540, overflowY: "auto" }}>
              {doencas.map(d => {
                const opt = DIAG.find(o => o.key === d.status) || DIAG[0];
                const active = d.id === selectedId;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = C.surfaceAlt;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = C.surface;
                    }}
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer", position: "relative",
                      background: active ? opt.bg : C.surface,
                      transition: "background 0.15s",
                      display: "flex", alignItems: "center", gap: 10,
                      borderLeft: `3px solid ${active ? opt.color : "transparent"}`,
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: opt.color, flexShrink: 0,
                      boxShadow: `0 0 0 2px ${C.surface}, 0 0 0 3px ${opt.color}33`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: C.text,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{d.nome}</div>
                      <div style={{
                        fontSize: 9.5, color: C.textDim, fontFamily: "monospace",
                        marginTop: 2,
                      }}>{d.cid} · {d.data}</div>
                    </div>
                    <div style={{
                      fontSize: 8.5, color: opt.color, fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}>{opt.label.slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </ElevatedCard>
        </div>

        {/* ────── COLUNA CENTRAL: DETALHE + GRÁFICO + STATUS ────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header da doença */}
          <ElevatedCard accent={diagAtual.color}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 9, padding: "2px 8px",
                    background: diagAtual.bg, color: diagAtual.color,
                    border: `1px solid ${diagAtual.color}44`, borderRadius: 3,
                    fontWeight: 700, letterSpacing: "0.1em",
                    fontFamily: "monospace",
                  }}>{diagAtual.label}</span>
                  <GravidadeBadge nivel={sel.gravidade} />
                  <span style={{
                    fontSize: 10, color: C.textDim, fontFamily: "monospace",
                  }}>CID {sel.cid}</span>
                </div>
                <h2 style={{
                  fontSize: 22, fontWeight: 700, margin: 0, color: C.text,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "-0.01em",
                }}>{sel.nome}</h2>
                <div style={{
                  fontSize: 11, color: C.textSub, marginTop: 4,
                }}>Registrado em {sel.data} · Última atualização há 2h</div>
              </div>
              <HelpButton
                titulo={`Sobre ${sel.nome}`}
                descricao={`Vídeo explicativo sobre ${sel.nome}: critérios diagnósticos, marcadores laboratoriais, condutas terapêuticas integrativas e protocolo Pádua RASX V6.`}
              />
            </div>
          </ElevatedCard>

          {/* Botões de Status */}
          <ElevatedCard hover={false}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 10,
            }}>
              <div style={{
                fontSize: 9.5, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace", fontWeight: 700,
              }}>CLASSIFICAÇÃO · CLIQUE PARA ALTERAR</div>
              <HelpButton
                titulo="Alterar status diagnóstico"
                descricao="Cada hipótese pode ser classificada em 4 estados. A mudança é registrada no log e dispara workflows automáticos (ex: solicitar exames complementares se POTENCIAL → INVESTIGAÇÃO)."
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {DIAG.map(opt => (
                <StatusButton key={opt.key} option={opt}
                  active={sel.status === opt.key}
                  onClick={() => changeStatus(opt.key)} />
              ))}
            </div>
          </ElevatedCard>

          {/* Gráfico Evolução */}
          <ElevatedCard>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 12,
            }}>
              <div>
                <div style={{
                  fontSize: 9.5, color: C.textDim, letterSpacing: "0.15em",
                  fontFamily: "monospace", fontWeight: 700, marginBottom: 4,
                }}>EVOLUÇÃO · 12 MESES</div>
                <div style={{
                  fontSize: 14, color: C.text, fontWeight: 700,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}>{sel.unidade}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: 24, fontWeight: 800, color: diagAtual.color,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    lineHeight: 1,
                  }}>{sel.atual}</div>
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>VALOR ATUAL</div>
                </div>
                <HelpButton
                  titulo="Gráfico de Evolução"
                  descricao="Curva mostra os últimos 12 meses. Linhas tracejadas indicam MIN e MAX de referência. Faixa colorida = ideal. Clique nos pontos para detalhes do exame."
                />
              </div>
            </div>

            <div style={{
              padding: "8px 4px",
              background: C.surfaceAlt, borderRadius: 6,
              border: `1px solid ${C.border}`,
            }}>
              <Sparkline data={sel.evolucao} min={sel.min} max={sel.max}
                color={diagAtual.color} width={530} height={140} />
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10, marginTop: 14,
            }}>
              {[
                { label: "MÉDIA 12M",   v: (sel.evolucao.reduce((a,b)=>a+b,0)/sel.evolucao.length).toFixed(1) },
                { label: "MIN PERÍODO", v: Math.min(...sel.evolucao).toFixed(1) },
                { label: "MAX PERÍODO", v: Math.max(...sel.evolucao).toFixed(1) },
                { label: "TENDÊNCIA",   v: sel.evolucao[11] < sel.evolucao[0] ? "↓ DECRESC." : "↑ CRESC." },
              ].map((m) => (
                <div key={m.label} style={{
                  padding: "8px 10px", background: C.surfaceAlt,
                  border: `1px solid ${C.border}`, borderRadius: 5,
                }}>
                  <div style={{
                    fontSize: 8.5, color: C.textDim, letterSpacing: "0.1em",
                    fontFamily: "monospace", marginBottom: 3,
                  }}>{m.label}</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: C.text,
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>{m.v}</div>
                </div>
              ))}
            </div>
          </ElevatedCard>

          {/* Marcadores Laboratoriais (barras horizontais) */}
          <ElevatedCard>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12,
            }}>
              <div style={{
                fontSize: 9.5, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace", fontWeight: 700,
              }}>MARCADORES LABORATORIAIS RELACIONADOS</div>
              <HelpButton
                titulo="Marcadores Laboratoriais"
                descricao="Barras horizontais mostram cada marcador relativo ao seu range. A faixa colorida = ideal terapêutico. Marcador atual destacado em ponto colorido."
              />
            </div>
            {[
              { label: "TSH",            v: 3.8,   min: 0,    max: 10,   color: "#3B5BDB", ideal: [0.4, 4.5] as [number, number] },
              { label: "T4 Livre",       v: 1.2,   min: 0,    max: 3,    color: "#00945C", ideal: [0.8, 1.8] as [number, number] },
              { label: "Anti-TPO",       v: 145,   min: 0,    max: 500,  color: "#D97706", ideal: [0, 35] as [number, number] },
              { label: "Vitamina D",     v: 58,    min: 0,    max: 100,  color: "#00945C", ideal: [40, 80] as [number, number] },
            ].map(m => (
              <RangeBar key={m.label} {...m} />
            ))}
          </ElevatedCard>
        </div>

        {/* ────── COLUNA DIREITA: MATRIZ MULTI-CAMADAS ────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Matriz de Cruzamento */}
          <ElevatedCard padding={0}>
            <div style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace", fontWeight: 700,
              }}>MATRIZ DE CRUZAMENTO</div>
              <HelpButton
                titulo="Matriz Multi-Camadas RASX"
                descricao="Cruza Sintomas × Sistemas × Marcadores. Cada célula é uma intersecção semântica. Quanto mais saturada a cor, maior a correlação. Clique para drill-down a nível de pixel."
              />
            </div>

            <div style={{ padding: "10px 12px" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)",
                gap: 2, fontSize: 8.5, fontFamily: "monospace",
              }}>
                <div></div>
                {["END", "MET", "IMU", "INF", "NEU"].map(s => (
                  <div key={s} style={{
                    textAlign: "center", color: C.goldDark,
                    fontWeight: 700, padding: "4px 0", letterSpacing: "0.05em",
                  }}>{s}</div>
                ))}

                {["TSH", "GLI", "VIT", "FER", "COR", "PCR"].map((row, ri) => (
                  <>
                    <div key={`l-${row}`} style={{
                      color: C.text, fontWeight: 700, paddingRight: 4,
                      display: "flex", alignItems: "center",
                    }}>{row}</div>
                    {[0,1,2,3,4].map(ci => {
                      const intensity = Math.abs(Math.sin(ri * 1.7 + ci * 0.9));
                      const isHigh = intensity > 0.7;
                      const isMid = intensity > 0.4;
                      const color = isHigh ? "#C0392B" : isMid ? "#D97706" : "#00945C";
                      return (
                        <div key={`${row}-${ci}`} title={`${row} × col ${ci+1}: ${(intensity*100).toFixed(0)}%`}
                          style={{
                            aspectRatio: "1", borderRadius: 3,
                            background: `${color}${isHigh ? "AA" : isMid ? "55" : "22"}`,
                            border: `1px solid ${color}66`, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: isHigh ? "#FFF" : color, fontWeight: 700,
                            fontSize: 9, transition: "transform 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.15)";
                            e.currentTarget.style.zIndex = "10";
                            e.currentTarget.style.position = "relative";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          {(intensity * 10).toFixed(0)}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>

              {/* Legenda */}
              <div style={{
                marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between",
                fontSize: 8.5, fontFamily: "monospace", color: C.textDim,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: "#00945C55", borderRadius: 2 }} />
                  BAIXA
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: "#D9770688", borderRadius: 2 }} />
                  MÉDIA
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: "#C0392BCC", borderRadius: 2 }} />
                  ALTA
                </span>
              </div>
            </div>
          </ElevatedCard>

          {/* Linha do tempo / Eventos */}
          <ElevatedCard>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12,
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, letterSpacing: "0.15em",
                fontFamily: "monospace", fontWeight: 700,
              }}>EVENTOS RECENTES</div>
              <HelpButton
                titulo="Linha do Tempo Clínica"
                descricao="Cronologia de eventos: exames, condutas, mudanças de status. Cada cor representa um tipo de evento (laboratorial, conduta, status, etc)."
              />
            </div>

            {[
              { d: "Hoje · 14:32",  e: "Status alterado: POTENCIAL → DIAGNOSTICADO", c: "#3B5BDB", t: "STATUS" },
              { d: "Ontem · 09:15", e: "Exame TSH liberado: 3.8 mUI/L (queda)",     c: "#00945C", t: "EXAME" },
              { d: "12/03 · 11:20", e: "Nova prescrição: Levotiroxina 50mcg",       c: "#D97706", t: "CONDUTA" },
              { d: "10/03 · 16:45", e: "Anamnese completa registrada",              c: "#3B5BDB", t: "ANAMN" },
              { d: "05/03 · 10:00", e: "Consulta de retorno · Dr. Caio",            c: "#8A6D33", t: "CONS" },
            ].map((ev, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, marginBottom: i < 4 ? 10 : 0,
                paddingBottom: i < 4 ? 10 : 0,
                borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 36, flexShrink: 0,
                  fontSize: 8, fontWeight: 800, color: ev.c,
                  fontFamily: "monospace", letterSpacing: "0.05em",
                  padding: "3px 0", textAlign: "center",
                  background: `${ev.c}15`, border: `1px solid ${ev.c}55`,
                  borderRadius: 3, height: "fit-content",
                }}>{ev.t}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 8.5, color: C.textDim, fontFamily: "monospace",
                    marginBottom: 3,
                  }}>{ev.d}</div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.4 }}>
                    {ev.e}
                  </div>
                </div>
              </div>
            ))}
          </ElevatedCard>

          {/* Quick Actions */}
          <ElevatedCard hover={false}>
            <div style={{
              fontSize: 9, color: C.textDim, letterSpacing: "0.15em",
              fontFamily: "monospace", fontWeight: 700, marginBottom: 10,
            }}>AÇÕES RÁPIDAS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { l: "Solicitar Exame", c: "#3B5BDB" },
                { l: "Nova Conduta",    c: "#00945C" },
                { l: "Anexar Documento",c: "#8A6D33" },
                { l: "Agendar Retorno", c: "#D97706" },
              ].map(a => (
                <button key={a.l} style={{
                  padding: "10px 8px", fontSize: 10.5, fontWeight: 600,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${a.c}`,
                  color: C.text, borderRadius: 4, cursor: "pointer",
                  textAlign: "left", fontFamily: "'Inter', sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.surfaceAlt;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = `0 3px 8px rgba(15,19,32,0.08)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.surface;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                  {a.l}
                </button>
              ))}
            </div>
          </ElevatedCard>
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{
        padding: "10px 28px",
        borderTop: `1px solid ${C.border}`, background: C.surface,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 9.5, color: C.textDim, fontFamily: "monospace",
        letterSpacing: "0.05em",
      }}>
        <div>PAWARDS ATELIER · v6.2 · Instituto Pádua · Paduccia Clínica Médica LTDA</div>
        <div style={{ display: "flex", gap: 14 }}>
          <span>● Conectado</span>
          <span>RASX-MATRIZ V6 ATIVO</span>
          <span>11 unidades · 138 tabelas</span>
        </div>
      </footer>
    </div>
  );
}
