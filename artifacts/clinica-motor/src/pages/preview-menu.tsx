import {
  LayoutDashboard, Radar, Heart, Shield, Scale, Grid3X3, Building, Database,
  Mountain, MessageCircle, BellRing, MessageSquareText, Diamond,
  CalendarDays, Stethoscope, CalendarClock,
  Users, ClipboardList, FileSignature, Pill, FlaskConical, ClipboardCheck,
  Zap, Cloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAVY = "#0B1220";
const NAVY_SOFT = "#11192C";
const GOLD = "#D4AF37";
const CYAN = "#5EE6E6";
const TEXT_SOFT = "rgba(230,230,235,0.85)";
const TEXT_MUTED = "rgba(180,185,200,0.55)";

type Item = { name: string; icon: LucideIcon; ativo?: boolean; badge?: number };
type Grupo = { id: string; nome: string; icon: LucideIcon; cor: string; items: Item[] };

const GRUPOS: Grupo[] = [
  {
    id: "global", nome: "DASHBOARD GLOBAL", icon: Cloud, cor: "#1F4E5F",
    items: [
      { name: "Visão Geral", icon: LayoutDashboard, ativo: true },
      { name: "Painel de Comando", icon: Radar },
      { name: "💰 Monetizar PADCON", icon: Heart },
      { name: "🛡️ Matrix Governança", icon: Shield },
      { name: "Governança Geral", icon: Shield },
      { name: "SLA Justificativas", icon: Scale },
      { name: "Matriz Analítica", icon: Grid3X3 },
      { name: "🏛️ Blueprint Arquitetura", icon: Building },
      { name: "💧 Inundação Genesis", icon: Database },
    ],
  },
  {
    id: "local", nome: "DASHBOARD LOCAL", icon: Mountain, cor: "#A78B5F",
    items: [
      { name: "⛰️ Visão da Clínica", icon: Mountain },
      { name: "🏷️ Demandas Resolução", icon: MessageCircle },
      { name: "Lembretes & Falhas", icon: BellRing, badge: 12 },
      { name: "Prescrições (Lembretes)", icon: BellRing },
      { name: "Mensagens", icon: MessageSquareText },
      { name: "Acompanhamento", icon: Diamond },
    ],
  },
  {
    id: "agendas", nome: "AGENDAS & MOTOR", icon: CalendarDays, cor: "#5C7C8A",
    items: [
      { name: "🏔️ Matriz de Agenda", icon: CalendarDays },
      { name: "Motor de Agenda", icon: CalendarDays },
      { name: "Sessões Clínicas", icon: Stethoscope },
      { name: "Agenda Semanal", icon: CalendarDays },
      { name: "Follow-up", icon: CalendarClock },
    ],
  },
  {
    id: "pacientes", nome: "CLÍNICA & PACIENTES", icon: Users, cor: "#7B6450",
    items: [
      { name: "Pacientes", icon: Users },
      { name: "Anamnese", icon: ClipboardList },
      { name: "Validação Médica", icon: FileSignature },
      { name: "Itens Terapêuticos", icon: Pill },
      { name: "Pedidos de Exame", icon: FlaskConical },
      { name: "Avaliação Enfermagem", icon: ClipboardCheck },
    ],
  },
];

const ATALHOS = [
  { name: "Prescrição", cor: "#5B8DEF", icon: Zap },
  { name: "Anamnese", cor: "#7BC79E", icon: ClipboardList },
  { name: "Pacientes", cor: "#F5B946", icon: Users },
  { name: "Agenda", cor: "#E07A5F", icon: CalendarDays },
];

export default function PreviewMenu() {
  return (
    <div
      style={{
        background: NAVY,
        minHeight: "100vh",
        padding: "40px 24px",
        fontFamily: "'JetBrains Mono', monospace",
        color: TEXT_SOFT,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* CABEÇALHO ANTES/DEPOIS */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, fontWeight: 700 }}>
            PAWARDS MEDCORE® · CLINICAL INTELLIGENCE SYSTEM
          </div>
          <h1
            style={{
              fontSize: 28,
              letterSpacing: "0.15em",
              color: "#fff",
              fontWeight: 700,
              margin: "8px 0 4px",
              textTransform: "uppercase",
            }}
          >
            Menu Lateral — Hierarquia Visual TDAH/TOC Friendly
          </h1>
          <div style={{ fontSize: 12, color: TEXT_MUTED, letterSpacing: "0.1em" }}>
            FAIXA COLORIDA POR GRUPO · TRILHA CONTÍNUA · ÍCONES COLORIDOS · 0PX RADIUS · SEM DROPDOWN
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32 }}>
          {/* COLUNA 1 — SIDEBAR REAL EM ESCALA */}
          <div
            style={{
              background: NAVY_SOFT,
              border: `1px solid rgba(255,255,255,0.08)`,
              padding: "12px 4px",
              alignSelf: "start",
            }}
          >
            {/* ATALHOS 2x2 */}
            <div style={{ padding: "0 12px 12px", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ fontSize: 9, color: TEXT_MUTED, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={12} color="#5B8DEF" /> ATALHOS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ATALHOS.map((a) => (
                  <div
                    key={a.name}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "10px 4px",
                      borderLeft: `3px solid ${a.cor}55`,
                      background: "transparent",
                    }}
                  >
                    <a.icon size={20} color={a.cor} />
                    <span style={{ fontSize: 10, letterSpacing: "0.1em", fontWeight: 700, color: TEXT_SOFT }}>
                      {a.name.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* COCKPIT */}
            <div style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px",
                  borderLeft: `3px solid ${CYAN}`,
                  boxShadow: `inset 0 0 0 1px rgba(94,230,230,0.35)`,
                }}
              >
                <div style={{ width: 40, height: 40, background: "rgba(94,230,230,0.18)", color: CYAN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Stethoscope size={20} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 9, color: CYAN, letterSpacing: "0.2em", fontWeight: 700 }}>PAINEL TÁTICO</span>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 700, letterSpacing: "0.05em" }}>COCKPIT PACIENTE</span>
                </div>
              </div>
            </div>

            {/* GRUPOS */}
            <div style={{ padding: "8px 4px" }}>
              {GRUPOS.map((g, idx) => {
                const numero = String(idx + 1).padStart(2, "0");
                const GIcon = g.icon;
                return (
                  <div key={g.id} style={{ marginBottom: 16 }}>
                    {/* HEADER faixa larga com gradiente */}
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        paddingRight: 8, marginBottom: 4,
                        borderLeft: `5px solid ${g.cor}`,
                        background: `linear-gradient(90deg, ${g.cor}33 0%, ${g.cor}10 60%, transparent 100%)`,
                      }}
                    >
                      <div style={{ width: 28, height: 28, background: g.cor, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <GIcon size={16} />
                      </div>
                      <span style={{ fontSize: 10, color: g.cor, fontWeight: 700, letterSpacing: "0.15em" }}>{numero}</span>
                      <span style={{ flex: 1, fontSize: 11, color: g.cor, fontWeight: 700, letterSpacing: "0.18em" }}>
                        {g.nome}
                      </span>
                      <span style={{ fontSize: 10, color: g.cor, fontWeight: 700, padding: "2px 6px", background: `${g.cor}22` }}>
                        {g.items.length}
                      </span>
                    </div>
                    {/* TRILHA + items */}
                    <div style={{ borderLeft: `2px solid ${g.cor}55`, marginLeft: 13 }}>
                      {g.items.map((it) => (
                        <div
                          key={it.name}
                          style={{
                            display: "flex", alignItems: "center", padding: "8px 12px",
                            fontSize: 13, color: it.ativo ? "#fff" : TEXT_SOFT,
                            fontWeight: it.ativo ? 600 : 400,
                            background: it.ativo ? "rgba(255,255,255,0.05)" : "transparent",
                            borderLeft: `3px solid ${it.ativo ? g.cor : "transparent"}`,
                            marginLeft: -2,
                            boxShadow: it.ativo ? `inset 4px 0 0 ${g.cor}` : undefined,
                          }}
                        >
                          <it.icon size={18} color={it.ativo ? g.cor : `${g.cor}DD`} style={{ marginRight: 10, flexShrink: 0 }} />
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                          {it.badge && (
                            <span style={{ marginLeft: 8, minWidth: 20, height: 20, padding: "0 6px", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              {it.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 2 — ANOTAÇÕES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { num: "01", titulo: "FAIXA LARGA COM GRADIENTE NA COR DO GRUPO", desc: "Quadrado sólido com ícone (28×28) + número TOC + nome em alto contraste + badge de contagem. Bate o olho e identifica o grupo." },
              { num: "02", titulo: "TRILHA VERTICAL CONTÍNUA", desc: "Linha de 2px na cor do grupo (~33% opacity) desce ao longo de TODOS os items. Amarra visualmente a fileira inteira ao grupo." },
              { num: "03", titulo: "ÍCONES SEMPRE COLORIDOS PELO GRUPO", desc: "Antes: ícones monocromáticos brancos (todos iguais). Agora: cada item carrega a cor do grupo, mesmo inativo. Distingue grupos sem precisar ler o texto." },
              { num: "04", titulo: "ITEM ATIVO TRIPLO REFORÇO", desc: "Fundo destacado + barra esquerda grossa na cor + ícone em cor cheia + texto bold branco. Você sempre sabe onde está." },
              { num: "05", titulo: "BADGES CRÍTICOS PRESERVADOS", desc: "Lembretes & Falhas continua com badge vermelho pulsante quando há pendência. Indicador independente da hierarquia visual." },
              { num: "06", titulo: "ATALHOS + COCKPIT NO TOPO", desc: "Grade 2×2 de pinos (Prescrição/Anamnese/Pacientes/Agenda) + botão Cockpit ciano. Acesso 1-clique pras 5 ações mais usadas, sem precisar buscar nos grupos." },
            ].map((bloco) => (
              <div
                key={bloco.num}
                style={{
                  background: NAVY_SOFT,
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderLeft: `3px solid ${GOLD}`,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: "0.1em" }}>{bloco.num}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.12em" }}>{bloco.titulo}</span>
                </div>
                <div style={{ fontSize: 12.5, color: TEXT_SOFT, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {bloco.desc}
                </div>
              </div>
            ))}

            <div
              style={{
                background: "rgba(212,175,55,0.08)",
                border: `1px solid ${GOLD}`,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 6 }}>
                PALETA OFICIAL DOS GRUPOS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                {GRUPOS.map((g) => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, background: g.cor, flexShrink: 0 }} />
                    <span style={{ color: TEXT_SOFT, letterSpacing: "0.05em" }}>{g.nome}</span>
                    <span style={{ color: TEXT_MUTED, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>{g.cor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, textAlign: "center", fontSize: 10, color: TEXT_MUTED, letterSpacing: "0.2em" }}>
          PADCON PLATFORM® · ADVANCED SYSTEMS ARCHITECTURE · PREVIEW · MENU TDAH/TOC FRIENDLY
        </div>
      </div>
    </div>
  );
}
