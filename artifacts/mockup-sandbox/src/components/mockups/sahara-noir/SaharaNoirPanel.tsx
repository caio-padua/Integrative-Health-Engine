import { useState } from "react";

/* ══════════════════════════════════════════════
   NERO REGALE — Neoclássico + Neon Médico
   ══════════════════════════════════════════════ */

/* ─── Paleta ─── */
const C = {
  bg:        "#0C0C1E",
  panel:     "#101028",
  card:      "#141434",
  cardHover: "#1A1A40",
  cardActive:"#1E1E4A",
  gold:      "#C9A84C",
  goldDim:   "#8B6E2F",
  goldLight: "#E8D08A",
  border:    "#C9A84C",
  borderDim: "#7A5E2A",
  borderFaint:"#3A2E1A",
  text:      "#F0EAD6",
  textSub:   "#B0A888",
  textDim:   "#6A6050",
  navy:      "#0C0C1E",
};

/* ─── Status de diagnóstico ─── */
type DiagStatus = "diagnosticado" | "potencial" | "investigacao" | "descartado";

interface DiagOption {
  key: DiagStatus;
  label: string;
  color: string;
  neon: string;
  neonSoft: string;
}

const DIAG_OPTIONS: DiagOption[] = [
  { key: "diagnosticado", label: "DIAGNOSTICADO",  color: "#00E87A", neon: "#00FF88", neonSoft: "#00FF8833" },
  { key: "potencial",     label: "POTENCIAL",       color: "#FFD700", neon: "#FFE044", neonSoft: "#FFD70033" },
  { key: "investigacao",  label: "INVESTIGAÇÃO",    color: "#7B8CFF", neon: "#8899FF", neonSoft: "#7B8CFF33" },
  { key: "descartado",    label: "DESCARTADO",      color: "#FF4466", neon: "#FF5577", neonSoft: "#FF446633" },
];

/* ─── Dados mock ─── */
interface Doenca {
  id: string;
  nome: string;
  cid: string;
  status: DiagStatus;
  gravidade: "leve" | "moderado" | "grave";
  dataRegistro: string;
}

const DOENCAS_INIT: Doenca[] = [
  { id: "D001", nome: "Hipotireoidismo",          cid: "E03.9", status: "diagnosticado", gravidade: "moderado", dataRegistro: "12/03/2026" },
  { id: "D002", nome: "Resistência Insulínica",   cid: "E88.8", status: "potencial",     gravidade: "leve",     dataRegistro: "15/03/2026" },
  { id: "D003", nome: "Deficiência de Vitamina D", cid: "E55.9", status: "diagnosticado", gravidade: "leve",     dataRegistro: "10/01/2026" },
  { id: "D004", nome: "Dislipidemia Mista",        cid: "E78.2", status: "investigacao",  gravidade: "moderado", dataRegistro: "20/03/2026" },
  { id: "D005", nome: "Síndrome Metabólica",       cid: "E88.8", status: "potencial",     gravidade: "grave",    dataRegistro: "22/03/2026" },
  { id: "D006", nome: "Esteatose Hepática",        cid: "K76.0", status: "descartado",    gravidade: "leve",     dataRegistro: "05/02/2026" },
];

const PACIENTE = {
  nome: "Dr. Caio Henrique Pádua",
  id: "P044",
  cpf: "•••.•••.•••-14",
  unidade: "Instituto Pádua",
};

/* ─── Sinaleiro Regale: anel dourado sólido + hemisfera neon ─── */
function SinalRegale({ color, neon, size = 20 }: { color: string; neon: string; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Anel dourado sólido — joalheria */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `linear-gradient(145deg, ${C.goldLight} 0%, ${C.gold} 35%, ${C.goldDim} 65%, ${C.gold} 100%)`,
        boxShadow: `0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 ${C.goldLight}88`,
      }} />
      {/* Cavidade escura */}
      <div style={{
        position: "absolute", inset: 2.5, borderRadius: "50%",
        background: "#050510",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.9)",
      }} />
      {/* Hemisfera neon */}
      <div style={{
        position: "absolute", inset: 3.5, borderRadius: "50%",
        background: `radial-gradient(circle at 50% 60%, ${neon} 0%, ${color}CC 30%, ${color}55 55%, transparent 78%)`,
        boxShadow: `inset 0 0 ${size * 0.3}px ${color}88`,
      }} />
      {/* Reflexo de vidro */}
      <div style={{
        position: "absolute", top: "12%", left: "20%",
        width: "42%", height: "26%", borderRadius: "50%",
        background: "linear-gradient(155deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 55%, transparent 100%)",
        filter: "blur(0.2px)", transform: "rotate(-18deg)", pointerEvents: "none",
      }} />
      {/* Micro reflexo */}
      <div style={{
        position: "absolute", bottom: "18%", right: "18%",
        width: "13%", height: "8%", borderRadius: "50%",
        background: "rgba(255,255,255,0.20)", pointerEvents: "none",
      }} />
      {/* Halo neon contido */}
      <div style={{
        position: "absolute", inset: -2, borderRadius: "50%",
        boxShadow: `0 0 6px ${color}55, 0 0 2px ${color}33`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Moldura dourada — envoltório clássico ─── */
function GoldFrame({ children, style = {}, glow, active = true }: {
  children: React.ReactNode; style?: React.CSSProperties; glow?: string; active?: boolean;
}) {
  return (
    <div style={{
      border: `1.5px solid ${active ? C.gold : C.borderDim}`,
      background: C.card,
      position: "relative",
      boxShadow: [
        `inset 0 1px 0 ${C.gold}15`,
        `0 2px 8px rgba(0,0,0,0.5)`,
        glow ? `0 0 12px ${glow}` : "",
      ].filter(Boolean).join(","),
      ...style,
    }}>
      {/* Ornamento de canto — neoclássico */}
      <div style={{
        position: "absolute", top: -1, left: -1, width: 8, height: 8,
        borderTop: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: -1, right: -1, width: 8, height: 8,
        borderTop: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -1, left: -1, width: 8, height: 8,
        borderBottom: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -1, right: -1, width: 8, height: 8,
        borderBottom: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}`,
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

/* ─── Botão de Status Neon — muda de cor ao clicar ─── */
function NeonStatusBtn({ option, active, onClick }: {
  option: DiagOption; active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: "7px 16px",
        fontSize: 10.5,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        border: `1.5px solid ${active ? option.color : C.borderDim}`,
        borderRadius: 2,
        transition: "all 0.18s",
        background: active
          ? `linear-gradient(135deg, ${option.color}18 0%, transparent 100%)`
          : hovered ? C.cardHover : C.card,
        color: active ? option.neon : hovered ? C.textSub : C.textDim,
        boxShadow: active
          ? [
            `0 0 10px ${option.neonSoft}`,
            `0 0 20px ${option.color}18`,
            `inset 0 0 12px ${option.color}0D`,
            `0 3px 0 rgba(0,0,0,0.4)`,
          ].join(",")
          : hovered
          ? `0 3px 0 rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3), inset 0 0 0 0.5px ${C.borderDim}`
          : `0 2px 0 rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.25)`,
        textShadow: active ? `0 0 8px ${option.neon}CC, 0 0 20px ${option.color}55` : "none",
        transform: active ? "translateY(1px)" : hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <SinalRegale color={option.color} neon={option.neon} size={14} />
        <span>{option.label}</span>
      </div>
      {/* Barra neon inferior */}
      {active && (
        <div style={{
          position: "absolute", bottom: -1, left: 6, right: 6, height: 2,
          background: option.color,
          boxShadow: `0 0 6px ${option.neon}, 0 0 12px ${option.color}88`,
          borderRadius: 1,
        }} />
      )}
    </button>
  );
}

/* ─── Divider dourado neoclássico ─── */
function GoldDivider({ width = "100%" }: { width?: string }) {
  return (
    <div style={{
      width, height: 1, margin: "12px 0",
      background: `linear-gradient(90deg, transparent 0%, ${C.gold}66 20%, ${C.gold} 50%, ${C.gold}66 80%, transparent 100%)`,
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
        width: 7, height: 7, borderRadius: "50%",
        border: `1.5px solid ${C.gold}`,
        background: C.navy,
      }} />
    </div>
  );
}

/* ─── Gravidade Badge ─── */
function GravidadeBadge({ nivel }: { nivel: string }) {
  const cor = nivel === "grave" ? "#FF4466" : nivel === "moderado" ? "#FFD700" : "#00E87A";
  const neon = nivel === "grave" ? "#FF5577" : nivel === "moderado" ? "#FFE044" : "#00FF88";
  return (
    <span style={{
      padding: "2px 10px",
      fontSize: 9,
      fontFamily: "'Georgia', serif",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: neon,
      border: `1px solid ${cor}55`,
      background: `${cor}12`,
      textShadow: `0 0 6px ${cor}88`,
      boxShadow: `0 0 6px ${cor}22`,
    }}>
      {nivel}
    </span>
  );
}

/* ═══════════════════════════════════
   COMPONENTE PRINCIPAL — NERO REGALE
   ═══════════════════════════════════ */
export default function SaharaNoirPanel() {
  const [doencas, setDoencas] = useState<Doenca[]>(DOENCAS_INIT);
  const [selectedId, setSelectedId] = useState<string>("D001");

  const selectedDoenca = doencas.find(d => d.id === selectedId) || doencas[0];
  const diagAtual = DIAG_OPTIONS.find(o => o.key === selectedDoenca.status) || DIAG_OPTIONS[0];

  const changeStatus = (novoStatus: DiagStatus) => {
    setDoencas(prev => prev.map(d =>
      d.id === selectedId ? { ...d, status: novoStatus } : d
    ));
  };

  const contadores = {
    diagnosticado: doencas.filter(d => d.status === "diagnosticado").length,
    potencial:     doencas.filter(d => d.status === "potencial").length,
    investigacao:  doencas.filter(d => d.status === "investigacao").length,
    descartado:    doencas.filter(d => d.status === "descartado").length,
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: C.text, display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── HEADER NEOCLÁSSICO ── */}
      <div style={{
        padding: "14px 28px",
        background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg} 100%)`,
        borderBottom: `2px solid ${C.gold}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: `0 0 20px ${C.gold}15`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Logo octogonal */}
          <div style={{
            width: 40, height: 40,
            background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDim} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            clipPath: "polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)",
            boxShadow: `0 3px 8px rgba(0,0,0,0.6)`,
          }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.navy, fontFamily: "'Georgia', serif" }}>P</span>
          </div>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 700, letterSpacing: "0.35em", color: C.gold,
              textShadow: `0 0 12px ${C.gold}44`,
            }}>
              PAWARDS
            </div>
            <div style={{ fontSize: 9, color: C.goldDim, letterSpacing: "0.35em", marginTop: 2 }}>
              INSTITUTO PÁDUA · RASX-MATRIZ V6
            </div>
          </div>
        </div>

        {/* Contadores neon */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {DIAG_OPTIONS.map(opt => (
            <div key={opt.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SinalRegale color={opt.color} neon={opt.neon} size={16} />
              <span style={{
                fontSize: 14, fontWeight: 900, fontFamily: "monospace",
                color: opt.neon, textShadow: `0 0 6px ${opt.color}66`,
              }}>
                {contadores[opt.key]}
              </span>
              <span style={{ fontSize: 8, color: C.textDim, letterSpacing: "0.08em" }}>
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── PAINEL ESQUERDO: Paciente + Lista de Doenças ── */}
        <div style={{
          width: 380, flexShrink: 0, display: "flex", flexDirection: "column",
          borderRight: `1.5px solid ${C.gold}`,
          background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg} 100%)`,
        }}>
          {/* Card do paciente */}
          <div style={{ padding: "16px" }}>
            <GoldFrame style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: C.goldDim, letterSpacing: "0.2em", marginBottom: 8 }}>
                ◈ PACIENTE ATIVO
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.goldLight, letterSpacing: "0.04em" }}>
                {PACIENTE.nome}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>
                  ID: {PACIENTE.id}
                </span>
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>
                  CPF: {PACIENTE.cpf}
                </span>
              </div>
              <div style={{ fontSize: 10, color: C.goldDim, marginTop: 4 }}>
                {PACIENTE.unidade}
              </div>
            </GoldFrame>
          </div>

          <GoldDivider />

          {/* Lista de doenças */}
          <div style={{
            padding: "0 16px 4px",
            fontSize: 9, color: C.goldDim, letterSpacing: "0.2em",
          }}>
            ◈ HIPÓTESES DIAGNÓSTICAS ({doencas.length})
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {doencas.map(d => {
              const opt = DIAG_OPTIONS.find(o => o.key === d.status) || DIAG_OPTIONS[0];
              const sel = d.id === selectedId;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", marginBottom: 4,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: `1px solid ${sel ? opt.color : C.borderDim}`,
                    background: sel ? C.cardActive : C.card,
                    boxShadow: sel
                      ? `inset 4px 0 0 ${opt.color}, 0 0 10px ${opt.neonSoft}, 0 2px 6px rgba(0,0,0,0.4)`
                      : `inset 3px 0 0 ${opt.color}44, 0 1px 3px rgba(0,0,0,0.3)`,
                  }}
                >
                  <SinalRegale color={opt.color} neon={opt.neon} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: sel ? C.text : C.textSub,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {d.nome}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", marginTop: 2 }}>
                      CID: {d.cid} · {d.dataRegistro}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 8, letterSpacing: "0.1em",
                    color: opt.neon,
                    textShadow: `0 0 5px ${opt.color}88`,
                    fontWeight: 700,
                  }}>
                    {opt.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PAINEL DIREITO: Detalhe da Doença ── */}
        <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto" }}>

          {/* Título da doença com moldura dourada */}
          <GoldFrame glow={diagAtual.neonSoft} style={{ padding: "18px 22px", marginBottom: 20 }}>
            {/* Barra neon superior */}
            <div style={{
              position: "absolute", top: -1, left: 12, right: 12, height: 2,
              background: `linear-gradient(90deg, transparent, ${diagAtual.color}, transparent)`,
              boxShadow: `0 0 8px ${diagAtual.neon}BB, 0 0 16px ${diagAtual.color}44`,
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <SinalRegale color={diagAtual.color} neon={diagAtual.neon} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: C.goldLight,
                  letterSpacing: "0.04em",
                }}>
                  {selectedDoenca.nome}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: 13, fontFamily: "monospace", fontWeight: 700,
                    color: C.gold, border: `1px solid ${C.gold}55`,
                    padding: "2px 10px", background: `${C.gold}0D`,
                  }}>
                    CID: {selectedDoenca.cid}
                  </span>
                  <GravidadeBadge nivel={selectedDoenca.gravidade} />
                  <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>
                    {selectedDoenca.dataRegistro}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 12, letterSpacing: "0.15em", fontWeight: 700,
                  color: diagAtual.neon,
                  textShadow: `0 0 10px ${diagAtual.neon}CC, 0 0 24px ${diagAtual.color}55`,
                }}>
                  {diagAtual.label}
                </div>
              </div>
            </div>
          </GoldFrame>

          <GoldDivider />

          {/* ── BOTÕES DE STATUS NEON — clique para mudar ── */}
          <div style={{
            fontSize: 9, color: C.goldDim, letterSpacing: "0.2em", marginBottom: 10,
          }}>
            ◈ CLASSIFICAÇÃO DIAGNÓSTICA — CLIQUE PARA ALTERAR
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {DIAG_OPTIONS.map(opt => (
              <NeonStatusBtn
                key={opt.key}
                option={opt}
                active={selectedDoenca.status === opt.key}
                onClick={() => changeStatus(opt.key)}
              />
            ))}
          </div>

          {/* ── Cards de informação em grid com moldura ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {[
              { label: "DOENÇA", valor: selectedDoenca.nome, icon: "◈" },
              { label: "CID-10", valor: selectedDoenca.cid, icon: "◉" },
              { label: "GRAVIDADE", valor: selectedDoenca.gravidade.toUpperCase(), icon: "◎" },
              { label: "DATA DE REGISTRO", valor: selectedDoenca.dataRegistro, icon: "◷" },
            ].map((item, i) => (
              <GoldFrame key={i} style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 9, color: C.goldDim, letterSpacing: "0.18em", marginBottom: 6 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, fontFamily: "monospace",
                  color: C.goldLight,
                }}>
                  {item.valor}
                </div>
              </GoldFrame>
            ))}
          </div>

          {/* ── Evolução / Notas ── */}
          <GoldFrame glow={`${C.gold}18`} style={{ padding: "14px 18px" }}>
            <div style={{
              fontSize: 9, color: C.goldDim, letterSpacing: "0.22em", marginBottom: 10,
            }}>
              ◈ EVOLUÇÃO CLÍNICA
            </div>
            {[
              { data: "22/03/2026", nota: "Iniciado protocolo de investigação metabólica completa.", cor: "#7B8CFF" },
              { data: "15/03/2026", nota: "Exames laboratoriais confirmam padrão de resistência insulínica.", cor: "#FFD700" },
              { data: "10/01/2026", nota: "Suplementação com Vitamina D3 50.000 UI/semana.", cor: "#00E87A" },
            ].map((ev, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                marginBottom: 10, paddingBottom: 10,
                borderBottom: i < 2 ? `1px solid ${C.borderFaint}` : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 4,
                  background: ev.cor, flexShrink: 0,
                  boxShadow: `0 0 6px ${ev.cor}88, 0 0 2px ${ev.cor}`,
                  border: `1px solid ${C.gold}66`,
                }} />
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: C.gold, marginBottom: 3 }}>
                    {ev.data}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>
                    {ev.nota}
                  </div>
                </div>
              </div>
            ))}
          </GoldFrame>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: "8px 28px",
        borderTop: `1.5px solid ${C.gold}`,
        background: C.panel,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: `0 0 12px ${C.gold}12`,
      }}>
        <div style={{ fontSize: 8.5, color: C.goldDim, letterSpacing: "0.2em" }}>
          PAWARDS MEDCORE · INSTITUTO PÁDUA · NERO REGALE V1
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {DIAG_OPTIONS.map(opt => (
            <div key={opt.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <SinalRegale color={opt.color} neon={opt.neon} size={8} />
              <span style={{ fontSize: 8, color: C.textDim }}>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
