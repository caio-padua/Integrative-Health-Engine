/**
 * LayoutTripleFocus.tsx
 *
 * Layout L2 "TRIPLE FOCUS" — proposta Dr. Claude (doc 20).
 *
 * ARQUITETURA EM 3 ZONAS FIXAS:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  TopBar 48px ultra-fina (KPIs + busca + perfil)                  │
 *   ├──────┬──────────────────────────────────────┬───────────────────┤
 *   │ 220  │  Área de trabalho central (children) │ Painel contexto   │
 *   │ Side │                                      │ 280px (colapsável)│
 *   └──────┴──────────────────────────────────────┴───────────────────┘
 *
 * Premissas técnicas (Dr. Replit, ler antes de integrar):
 * 1. Componente NOVO em paralelo ao Layout.tsx existente. Não substitui
 *    o atual — deixa o Caio testar via flag de feature antes de migrar.
 * 2. Reusa TODOS os hooks/contextos existentes (useAuth, useClinic,
 *    useLembretesFalhasContagem, useSound, usePlatformStepUp).
 * 3. CommandPalette, TopProgressBar, CampainhaAlertasSeguranca e
 *    Platform2faIndicator continuam montados — apenas reposicionados.
 * 4. CSS-in-JS inline pra não precisar criar nada no tailwind.config.
 *    Variáveis CSS no :root garantem que outros componentes possam
 *    referenciar (--pw-neon, --pw-gold, --pw-bg, etc).
 * 5. Sem `db:push`, sem alteração de schema. É só UI.
 *
 * Como integrar (Dr. Replit):
 * - PASSO 1: copiar este arquivo para
 *     artifacts/clinica-motor/src/components/LayoutTripleFocus.tsx
 * - PASSO 2: criar feature flag opcional em settings/perfil:
 *     localStorage `pawards.layout.variant` = "rail" | "triple-focus"
 * - PASSO 3: no entry point (App.tsx ou similar), trocar
 *     <Layout> por <LayoutTripleFocus> condicionalmente.
 * - PASSO 4: pedir code-review aqui antes de mergear.
 *
 * Decisões pendentes pro Dr. Replit comentar:
 * - O painel direito de contexto está harcoded com placeholders. Em
 *   prod, ele deveria observar a rota atual (useLocation) e renderizar
 *   conteúdo contextual (paciente ativo se /pacientes/:id, fila do dia
 *   se /agenda, etc). Sugiro criar um <PainelContexto /> que faz esse
 *   routing interno. Dr. Replit topa?
 * - Atalhos `]` (toggle painel direito) e `[` (toggle sidebar) precisam
 *   ser registrados num useKeyboardShortcut global. Dr. Replit prefere
 *   adicionar aqui ou criar hook compartilhado em /hooks?
 */

import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, ClipboardList, Stethoscope, FlaskConical, Pill, MessageSquareText,
  CreditCard, FileSignature, TrendingUp,
  CalendarClock, CalendarDays,
  Brain, GitBranch, BookOpen,
  Building2, Settings, ShieldCheck,
  Command as CommandIcon, Bell, ChevronLeft, ChevronRight, LogOut, Diamond,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSound } from "@/hooks/useSound";
import { CommandPalette } from "./CommandPalette";
import { TopProgressBar } from "./TopProgressBar";
import { Platform2faFooterIndicator } from "@/lib/Platform2faFooterIndicator";

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — single source of truth do layout L2
// ═══════════════════════════════════════════════════════════════════════
const PW = {
  bg: "#0B1220",
  bg2: "#132240",
  bg3: "#1e3a5f",
  text: "#e0e8f0",
  textMute: "#6b8ab0",
  textDim: "#4a6580",
  gold: "#D4AF37",
  neon: "#5EE6E6",
  danger: "#ef4444",
  warn: "#f59e0b",
  ok: "#22c55e",
  brand: "#a78bfa",
} as const;

// ═══════════════════════════════════════════════════════════════════════
// GRUPOS MACRO (6 grupos coloridos, regra Dr. Caio)
// ═══════════════════════════════════════════════════════════════════════
type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; badge?: number };
type NavGroup = { id: string; label: string; color: string; items: NavItem[]; perfilMinimo?: string[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "clinica", label: "CLÍNICA & PACIENTES", color: PW.neon,
    items: [
      { label: "Pacientes", href: "/pacientes", icon: Users },
      { label: "Anamnese", href: "/anamnese", icon: ClipboardList },
      { label: "Cockpit", href: "/cockpit", icon: Stethoscope },
      { label: "Exames", href: "/exames", icon: FlaskConical },
      { label: "Fórmulas", href: "/formulas", icon: Pill },
      { label: "Mensageria", href: "/mensageria", icon: MessageSquareText },
    ],
  },
  {
    id: "financeiro", label: "FINANCEIRO", color: PW.gold,
    items: [
      { label: "Receitas", href: "/financeiro/receitas", icon: TrendingUp },
      { label: "Assinaturas", href: "/financeiro/assinaturas", icon: FileSignature },
      { label: "Comissões", href: "/financeiro/comissoes", icon: CreditCard },
    ],
  },
  {
    id: "agenda", label: "AGENDA & MOTOR", color: PW.brand,
    items: [
      { label: "Agenda do dia", href: "/agenda", icon: CalendarClock },
      { label: "Calendário", href: "/calendario", icon: CalendarDays },
      { label: "Sinapses", href: "/motor/sinapses", icon: GitBranch },
      { label: "Craniotomia", href: "/motor/craniotomia", icon: Brain },
      { label: "Catálogo clínico", href: "/motor/catalogo", icon: BookOpen },
    ],
  },
  {
    id: "sistema", label: "SISTEMA", color: "#94a3b8",
    items: [
      { label: "Clínicas", href: "/sistema/clinicas", icon: Building2 },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "Segurança", href: "/seguranca", icon: ShieldCheck },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// CSS INLINE — injetado uma vez no <head>
// ═══════════════════════════════════════════════════════════════════════
const STYLE_TAG_ID = "pw-triple-focus-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    :root {
      --pw-bg: ${PW.bg};
      --pw-bg2: ${PW.bg2};
      --pw-bg3: ${PW.bg3};
      --pw-text: ${PW.text};
      --pw-text-mute: ${PW.textMute};
      --pw-text-dim: ${PW.textDim};
      --pw-gold: ${PW.gold};
      --pw-neon: ${PW.neon};
      --pw-brand: ${PW.brand};
      --pw-font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace;
    }
    .pw-tf-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      font-family: var(--pw-font-mono);
      font-size: 11px; font-weight: 600;
      letter-spacing: 1px; text-transform: uppercase;
      color: var(--pw-text);
      background: transparent;
      border-left: 3px solid transparent;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%; text-align: left;
      text-decoration: none;
    }
    .pw-tf-btn:hover {
      background: color-mix(in srgb, var(--cor) 11%, transparent);
      border-left-color: color-mix(in srgb, var(--cor) 70%, transparent);
      box-shadow: 0 0 14px color-mix(in srgb, var(--cor) 35%, transparent),
                  inset 0 0 8px color-mix(in srgb, var(--cor) 10%, transparent);
      color: var(--cor);
    }
    .pw-tf-btn.active {
      background: color-mix(in srgb, var(--cor) 18%, transparent);
      border-left-color: var(--cor);
      color: var(--cor);
      font-weight: 800;
      box-shadow: 0 0 18px color-mix(in srgb, var(--cor) 50%, transparent),
                  inset 0 0 10px color-mix(in srgb, var(--cor) 20%, transparent);
    }
    .pw-tf-section-label {
      font-family: var(--pw-font-mono);
      font-size: 9px; font-weight: 800;
      letter-spacing: 2px; text-transform: uppercase;
      padding: 6px 12px;
      border-left: 3px solid var(--cor);
      margin: 12px 0 4px;
    }
    .pw-tf-cockpit {
      display: block;
      padding: 14px 14px;
      margin: 12px;
      background: linear-gradient(135deg, var(--pw-bg3), var(--pw-bg2));
      border: 2px solid var(--pw-gold);
      box-shadow: 0 0 14px color-mix(in srgb, var(--pw-gold) 40%, transparent),
                  inset 0 0 8px color-mix(in srgb, var(--pw-gold) 12%, transparent);
      font-family: var(--pw-font-mono);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      color: var(--pw-gold);
    }
    .pw-tf-cockpit:hover {
      box-shadow: 0 0 28px color-mix(in srgb, var(--pw-neon) 60%, transparent),
                  inset 0 0 14px color-mix(in srgb, var(--pw-gold) 25%, transparent);
      transform: translateY(-1px);
    }
    .pw-tf-cockpit .label {
      font-size: 13px; font-weight: 900;
      letter-spacing: 3px; color: var(--pw-gold);
    }
    .pw-tf-cockpit .sub {
      font-size: 9px; color: var(--pw-neon);
      letter-spacing: 2px; margin-top: 4px;
    }
    .pw-tf-kpi {
      font-family: var(--pw-font-mono);
      font-size: 10px;
      color: var(--pw-text-mute);
      letter-spacing: 1px;
    }
    .pw-tf-kpi b {
      color: var(--pw-text);
      font-weight: 800;
      margin-left: 4px;
    }
    .pw-tf-scrollbar::-webkit-scrollbar { width: 6px; }
    .pw-tf-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .pw-tf-scrollbar::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--pw-neon) 25%, transparent);
      border-radius: 0;
    }
    .pw-tf-scrollbar::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--pw-neon) 45%, transparent);
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR ESQUERDA (220px) — navegação principal
// ═══════════════════════════════════════════════════════════════════════
function SidebarLeft({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();
  const sound = useSound();
  const width = collapsed ? 64 : 220;

  return (
    <aside
      data-testid="pw-tf-sidebar-left"
      className="pw-tf-scrollbar"
      style={{
        width,
        minWidth: width,
        background: PW.bg,
        borderRight: `1px solid ${PW.bg3}`,
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* COCKPIT — botão destacado dourado */}
      <Link
        href="/cockpit"
        className="pw-tf-cockpit"
        data-testid="pw-tf-cockpit-btn"
        onClick={() => sound.open()}
      >
        <Diamond size={collapsed ? 18 : 22} style={{ display: "inline-block", color: PW.gold }} />
        {!collapsed && (
          <>
            <div className="label" style={{ marginTop: 6 }}>COCKPIT</div>
            <div className="sub">ABRIR PACIENTE</div>
          </>
        )}
      </Link>

      {/* GRUPOS DE NAVEGAÇÃO */}
      <nav style={{ flex: 1, paddingBottom: 16 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div
                className="pw-tf-section-label"
                style={{
                  // @ts-ignore - CSS custom prop
                  "--cor": group.color,
                  color: group.color,
                } as React.CSSProperties}
              >
                § {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`pw-tf-btn ${active ? "active" : ""}`}
                  style={{
                    // @ts-ignore
                    "--cor": group.color,
                  } as React.CSSProperties}
                  data-testid={`pw-tf-nav-${item.href.replace(/\//g, "-")}`}
                  title={item.label}
                  onClick={() => sound.tap()}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                  {!collapsed && item.badge ? (
                    <span style={{
                      fontSize: 9, background: PW.danger, color: "#fff",
                      padding: "2px 6px", fontWeight: 800,
                    }}>{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Indicador 2FA no rodapé */}
      <div style={{ padding: 8, borderTop: `1px solid ${PW.bg3}` }}>
        <Platform2faFooterIndicator />
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOPBAR — 48px ultra-fina
// ═══════════════════════════════════════════════════════════════════════
function TopBar({
  sidebarCollapsed, onToggleSidebar,
  rightPanelCollapsed, onToggleRightPanel,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
}) {
  const { user, logout } = useAuth();
  const { nomeUnidadeSelecionada, corUnidadeSelecionada } = useClinic();
  const sound = useSound();
  const openCmdK = () => {
    sound.open();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  return (
    <header style={{
      height: 48,
      background: PW.bg,
      borderBottom: `1px solid ${PW.bg3}`,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      gap: 12,
      fontFamily: "var(--pw-font-mono)",
      flexShrink: 0,
    }}>
      {/* Logo + toggle sidebar */}
      <button
        onClick={onToggleSidebar}
        style={{
          background: "transparent", border: "none", color: PW.gold,
          fontSize: 14, fontWeight: 900, letterSpacing: 3, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
        }}
        data-testid="pw-tf-toggle-sidebar"
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        ◇ PAWARDS
      </button>

      {/* Unidade selecionada (clinic context) */}
      <div style={{
        padding: "4px 10px",
        background: PW.bg2,
        border: `1px solid ${corUnidadeSelecionada || PW.bg3}`,
        fontSize: 10, color: PW.text, letterSpacing: 1, fontWeight: 700,
      }}>
        {nomeUnidadeSelecionada || "TODAS CLÍNICAS"}
      </div>

      {/* KPIs micro */}
      <div style={{ display: "flex", gap: 12, marginLeft: 8 }}>
        <span className="pw-tf-kpi">AGENDA<b style={{ color: PW.neon }}>12</b></span>
        <span className="pw-tf-kpi">RECEITAS<b style={{ color: PW.gold }}>2.7M</b></span>
        <span className="pw-tf-kpi">ALERTAS<b style={{ color: PW.danger }}>3</b></span>
      </div>

      {/* Busca CmdK */}
      <button
        onClick={openCmdK}
        style={{
          marginLeft: "auto", padding: "5px 10px",
          background: PW.bg2, border: `1px solid ${PW.bg3}`,
          color: PW.textMute, fontFamily: "var(--pw-font-mono)",
          fontSize: 10, letterSpacing: 1, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}
        data-testid="pw-tf-cmdk"
      >
        <CommandIcon size={11} /> BUSCAR
        <span style={{ color: PW.textDim, marginLeft: 4 }}>⌘K</span>
      </button>

      {/* Perfil + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: `1px solid ${PW.bg3}` }}>
        <div style={{ fontSize: 10, color: PW.text, fontWeight: 700, letterSpacing: 1 }}>
          {user?.nome?.split(" ")?.[0]?.toUpperCase() || "USUÁRIO"}
        </div>
        <button
          onClick={() => logout()}
          style={{
            background: "transparent", border: "none", color: PW.textMute,
            cursor: "pointer", padding: 4,
          }}
          title="Sair"
          data-testid="pw-tf-logout"
        >
          <LogOut size={12} />
        </button>
      </div>

      {/* Toggle painel direito */}
      <button
        onClick={onToggleRightPanel}
        style={{
          background: "transparent", border: `1px solid ${PW.bg3}`,
          color: PW.textMute, padding: "4px 6px", cursor: "pointer",
        }}
        title={rightPanelCollapsed ? "Mostrar painel contexto" : "Ocultar painel contexto"}
        data-testid="pw-tf-toggle-right"
      >
        {rightPanelCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAINEL DIREITO (280px) — contexto sticky
// ═══════════════════════════════════════════════════════════════════════
function PainelContexto({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();

  // Decide o conteúdo baseado na rota atual.
  // Em produção, isso pode virar um router interno com componentes específicos.
  const conteudo = useMemo(() => {
    if (location.startsWith("/pacientes") || location.startsWith("/cockpit")) {
      return <ContextoPacienteAtivo />;
    }
    if (location.startsWith("/agenda") || location.startsWith("/calendario")) {
      return <ContextoAgenda />;
    }
    if (location.startsWith("/financeiro")) {
      return <ContextoFinanceiro />;
    }
    return <ContextoPadrao />;
  }, [location]);

  if (collapsed) {
    return (
      <aside style={{
        width: 40, background: PW.bg, borderLeft: `1px solid ${PW.bg3}`,
        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8,
      }}>
        <div style={{ fontSize: 9, color: PW.textDim, writingMode: "vertical-rl", letterSpacing: 3, marginTop: 12, fontFamily: "var(--pw-font-mono)" }}>
          CONTEXTO
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="pw-tf-context-panel"
      className="pw-tf-scrollbar"
      style={{
        width: 280, minWidth: 280,
        background: PW.bg, borderLeft: `1px solid ${PW.bg3}`,
        overflowY: "auto", padding: 14,
        fontFamily: "var(--pw-font-mono)",
      }}
    >
      <div style={{
        fontSize: 9, color: PW.gold, letterSpacing: 3,
        fontWeight: 800, marginBottom: 12, paddingBottom: 8,
        borderBottom: `1px solid ${PW.bg3}`,
      }}>◇ PAINEL CONTEXTO</div>
      {conteudo}
    </aside>
  );
}

function ContextoPacienteAtivo() {
  // TODO Dr. Replit: ligar ao paciente ativo via context/hook real.
  // Placeholder demonstrativo abaixo.
  return (
    <>
      <ContextoSecao titulo="PACIENTE ATIVO" cor={PW.gold}>
        <div style={{ fontSize: 12, fontWeight: 800, color: PW.text }}>LUCIANO PERSSINOTTO</div>
        <div style={{ fontSize: 10, color: PW.textMute, marginTop: 3 }}>51A · M · #PADC-2026-LUPE-001</div>
        <div style={{ fontSize: 10, color: PW.danger, marginTop: 6 }}>⚠ 3 ALERTAS CRÍTICOS</div>
      </ContextoSecao>

      <ContextoSecao titulo="ÚLTIMAS AÇÕES" cor={PW.neon}>
        <ContextoItem>Pulso Diário registrado · 21/mai 08h</ContextoItem>
        <ContextoItem>Exame TSH adicionado · 20/mai</ContextoItem>
        <ContextoItem>Fórmula F05 prescrita · 19/mai</ContextoItem>
      </ContextoSecao>

      <ContextoSecao titulo="ATALHOS" cor={PW.brand}>
        <BotaoContexto cor={PW.brand} testid="atalho-receita">+ Nova receita</BotaoContexto>
        <BotaoContexto cor={PW.brand} testid="atalho-exame">+ Pedir exame</BotaoContexto>
        <BotaoContexto cor={PW.brand} testid="atalho-msg">+ Enviar mensagem</BotaoContexto>
      </ContextoSecao>

      <ContextoSecao titulo="ALERTAS" cor={PW.danger}>
        <ContextoItem dangerLevel>⚠ PCR persistente alto (3 coletas)</ContextoItem>
        <ContextoItem dangerLevel>⚠ Adesão fórmula F05: 60%</ContextoItem>
        <ContextoItem dangerLevel>⚠ Exame Vit D pendente há 90 dias</ContextoItem>
      </ContextoSecao>
    </>
  );
}

function ContextoAgenda() {
  return (
    <>
      <ContextoSecao titulo="PRÓXIMOS HORÁRIOS" cor={PW.neon}>
        <ContextoItem>09:00 · Patrícia Mendes</ContextoItem>
        <ContextoItem>10:30 · Luciano Perssinotto</ContextoItem>
        <ContextoItem>13:00 · Carlos Soares</ContextoItem>
      </ContextoSecao>
      <ContextoSecao titulo="ATALHOS" cor={PW.brand}>
        <BotaoContexto cor={PW.brand} testid="agenda-novo">+ Novo agendamento</BotaoContexto>
      </ContextoSecao>
    </>
  );
}

function ContextoFinanceiro() {
  return (
    <ContextoSecao titulo="RESUMO DO MÊS" cor={PW.gold}>
      <div style={{ fontSize: 18, fontWeight: 900, color: PW.gold }}>R$ 2.73M</div>
      <div style={{ fontSize: 10, color: PW.textMute, marginTop: 4 }}>Comissão estimada acumulada</div>
    </ContextoSecao>
  );
}

function ContextoPadrao() {
  return (
    <ContextoSecao titulo="DICA" cor={PW.textMute}>
      <ContextoItem>Pressione ⌘K pra buscar qualquer comando, paciente ou tela.</ContextoItem>
    </ContextoSecao>
  );
}

function ContextoSecao({ titulo, cor, children }: { titulo: string; cor: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 9, color: cor, letterSpacing: 2, fontWeight: 800,
        marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${cor}`,
      }}>{titulo}</div>
      {children}
    </div>
  );
}

function ContextoItem({ children, dangerLevel }: { children: ReactNode; dangerLevel?: boolean }) {
  return (
    <div style={{
      fontSize: 10, color: dangerLevel ? "#fca5a5" : PW.text,
      marginBottom: 5, lineHeight: 1.5, paddingLeft: 10,
    }}>{children}</div>
  );
}

function BotaoContexto({ children, cor, testid }: { children: ReactNode; cor: string; testid: string }) {
  return (
    <button
      data-testid={`pw-tf-${testid}`}
      className="pw-tf-btn"
      style={{
        // @ts-ignore
        "--cor": cor,
        marginBottom: 4,
      } as React.CSSProperties}
    >{children}</button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — orquestra as 3 zonas
// ═══════════════════════════════════════════════════════════════════════
export function LayoutTripleFocus({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Estado persistente em localStorage para preferências do usuário.
  // Dr. Replit: se quiser, transformar em hook useSetting() padronizado.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pw.tf.sidebar") === "collapsed"
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pw.tf.right") === "collapsed"
  );

  // Injeta os estilos CSS no <head> uma única vez.
  useEffect(() => { injectStyles(); }, []);

  // Atalhos `[` (sidebar) e `]` (right panel).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignora se o foco está num input/textarea.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "[") {
        e.preventDefault();
        setSidebarCollapsed(prev => {
          const next = !prev;
          localStorage.setItem("pw.tf.sidebar", next ? "collapsed" : "expanded");
          return next;
        });
      }
      if (e.key === "]") {
        e.preventDefault();
        setRightPanelCollapsed(prev => {
          const next = !prev;
          localStorage.setItem("pw.tf.right", next ? "collapsed" : "expanded");
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Se o usuário ainda não está autenticado, não renderiza o layout
  // (mantém comportamento idêntico ao Layout.tsx atual).
  if (!user) return <>{children}</>;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: PW.bg,
      color: PW.text,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <TopProgressBar />
      <CommandPalette />

      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => {
          setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("pw.tf.sidebar", next ? "collapsed" : "expanded");
            return next;
          });
        }}
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleRightPanel={() => {
          setRightPanelCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("pw.tf.right", next ? "collapsed" : "expanded");
            return next;
          });
        }}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SidebarLeft collapsed={sidebarCollapsed} />

        <main
          style={{
            flex: 1,
            overflow: "auto",
            background: PW.bg,
            padding: 0,
            position: "relative",
          }}
          className="pw-tf-scrollbar"
          data-testid="pw-tf-main"
        >
          {children}
        </main>

        <PainelContexto collapsed={rightPanelCollapsed} />
      </div>
    </div>
  );
}

export default LayoutTripleFocus;
