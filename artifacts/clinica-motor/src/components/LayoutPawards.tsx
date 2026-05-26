/**
 * LayoutPawards.tsx
 *
 * Layout oficial PAWARDS — aprovado por Caio no canvas (mockup L2ComE4).
 *
 * ARQUITETURA:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  E4 strip 1: PINS rápidos + ⌘K + alertas + unidade + perfil   │ sticky
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  E4 strip 2: Cockpit mega-header (contexto + 3 KPIs)          │ sticky
 *   ├──────┬─────────────────────────────────────┬──────────────────┤
 *   │ L2:  │  L2: trabalho central (children)    │ L2: contexto     │
 *   │ menu │                                     │ (colapsável)     │
 *   └──────┴─────────────────────────────────────┴──────────────────┘
 *
 * Construído a partir de LayoutTripleFocus + chrome E4 do mockup oficial.
 * Reusa hooks reais (useAuth, useClinic, useSound) e CommandPalette/TopProgressBar.
 */

import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useObterPaciente,
  getObterPacienteQueryKey,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Users, ClipboardList, Stethoscope, FlaskConical, FileText, ListChecks,
  CreditCard, FileSignature, TrendingUp, Receipt, Wallet,
  CalendarClock, CalendarDays, Calendar,
  BookOpen, Beaker, Pill, BadgeAlert,
  Building2, Settings, ShieldCheck, GitBranch, Activity,
  Command as CommandIcon, Bell, ChevronLeft, ChevronRight, LogOut, Diamond, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSound } from "@/hooks/useSound";
import { CommandPalette } from "./CommandPalette";
import { TopProgressBar } from "./TopProgressBar";
import { Platform2faFooterIndicator } from "@/lib/Platform2faFooterIndicator";

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — aprovado por Caio (deep navy + neon ciano + dourado)
// ═══════════════════════════════════════════════════════════════════════
const PW = {
  navyDeep: "#050d1a",
  navy: "#0a1628",
  navyPanel: "#0f1e36",
  bg3: "#1e3a5f",
  border: "#1a2d4f",
  text: "#e6eaf2",
  textMute: "#94a3b8",
  textDim: "#64748b",
  gold: "#facc15",
  goldDeep: "#D4AF37",
  cyan: "#00d4ff",
  neon: "#5EE6E6",
  orange: "#fb923c",
  green: "#34d399",
  red: "#f87171",
  brand: "#a78bfa",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
} as const;

// ═══════════════════════════════════════════════════════════════════════
// MENU L2 — rotas REAIS do App.tsx (sem links quebrados)
// ═══════════════════════════════════════════════════════════════════════
type NavItem = { label: string; href: string; icon: typeof Users };
type NavGroup = { id: string; label: string; color: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "clinica", label: "CLÍNICA & PACIENTES", color: PW.cyan,
    items: [
      { label: "Pacientes", href: "/pacientes", icon: Users },
      { label: "Anamnese", href: "/anamnese", icon: ClipboardList },
      { label: "Cockpit", href: "/cockpit", icon: Stethoscope },
      { label: "Prescrição Rápida", href: "/prescricao-rapida", icon: Pill },
      { label: "Validação", href: "/validacao", icon: ShieldCheck },
      { label: "Filas", href: "/filas", icon: ListChecks },
      { label: "Follow-up", href: "/followup", icon: Activity },
    ],
  },
  {
    id: "agenda", label: "AGENDA & MOTOR", color: PW.brand,
    items: [
      { label: "Agenda Semanal", href: "/agenda", icon: CalendarClock },
      { label: "Agenda Motor", href: "/agenda-motor", icon: Calendar },
      { label: "Agendas", href: "/agendas", icon: CalendarDays },
    ],
  },
  {
    id: "financeiro", label: "FINANCEIRO", color: PW.green,
    items: [
      { label: "Financeiro", href: "/financeiro", icon: TrendingUp },
      { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", icon: Wallet },
      { label: "NF-e", href: "/painel-nfe", icon: Receipt },
      { label: "Gateways", href: "/gateways-pagamento", icon: CreditCard },
      { label: "Assinaturas Timeline", href: "/assinaturas/timeline", icon: FileSignature },
    ],
  },
  {
    id: "catalogo", label: "CATÁLOGO CLÍNICO", color: PW.orange,
    items: [
      { label: "Catálogo", href: "/catalogo", icon: BookOpen },
      { label: "Substâncias", href: "/substancias", icon: Beaker },
      { label: "Itens Terapêuticos", href: "/itens-terapeuticos", icon: FlaskConical },
      { label: "Protocolos", href: "/protocolos", icon: FileText },
      { label: "Códigos Semânticos", href: "/codigos-semanticos", icon: GitBranch },
    ],
  },
  {
    id: "sistema", label: "SISTEMA", color: PW.textMute,
    items: [
      { label: "Unidades", href: "/unidades", icon: Building2 },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "Permissões", href: "/permissoes", icon: ShieldCheck },
      { label: "Fluxos", href: "/fluxos", icon: GitBranch },
      { label: "Sessões", href: "/sessoes", icon: Activity },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// CSS INLINE — injetado uma vez
// ═══════════════════════════════════════════════════════════════════════
const STYLE_TAG_ID = "pw-layout-pawards-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    :root {
      --pwx-navy: ${PW.navy};
      --pwx-navy-deep: ${PW.navyDeep};
      --pwx-navy-panel: ${PW.navyPanel};
      --pwx-border: ${PW.border};
      --pwx-text: ${PW.text};
      --pwx-text-mute: ${PW.textMute};
      --pwx-gold: ${PW.gold};
      --pwx-cyan: ${PW.cyan};
      --pwx-neon: ${PW.neon};
      --pwx-mono: ${PW.mono};
    }
    .pwx-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 14px 7px 20px;
      font-family: var(--pwx-mono);
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.5px; text-transform: uppercase;
      color: #cbd5e1;
      background: transparent;
      border-left: 3px solid transparent;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.12s ease;
      width: 100%; text-align: left;
      text-decoration: none;
    }
    .pwx-btn:hover {
      background: #0e2540;
      border-left-color: color-mix(in srgb, var(--cor) 70%, transparent);
      color: var(--cor);
    }
    .pwx-btn.active {
      background: #0e2540;
      border-left-color: var(--cor);
      color: var(--cor);
      font-weight: 800;
    }
    .pwx-section {
      padding: 4px 14px;
      font-family: var(--pwx-mono);
      font-size: 9px;
      letter-spacing: 1.5px;
      color: var(--cor);
      border-bottom: 1px solid color-mix(in srgb, var(--cor) 25%, transparent);
      margin: 14px 0 4px;
    }
    .pwx-pin {
      border: 1px solid var(--cor);
      background: color-mix(in srgb, var(--cor) 8%, transparent);
      padding: 6px 14px;
      font-family: var(--pwx-mono);
      text-align: center;
      min-width: 86px;
      cursor: pointer;
      text-decoration: none;
      display: block;
      transition: all 0.15s ease;
    }
    .pwx-pin:hover {
      background: color-mix(in srgb, var(--cor) 18%, transparent);
      box-shadow: 0 0 14px color-mix(in srgb, var(--cor) 35%, transparent);
    }
    .pwx-scroll::-webkit-scrollbar { width: 6px; }
    .pwx-scroll::-webkit-scrollbar-track { background: transparent; }
    .pwx-scroll::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--pwx-neon) 25%, transparent);
      border-radius: 0;
    }
    .pwx-scroll::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--pwx-neon) 50%, transparent);
    }
    .pwx-cockpit-btn {
      margin: 0 14px 12px;
      padding: 10px;
      border: 1px solid var(--pwx-cyan);
      background: color-mix(in srgb, var(--pwx-cyan) 8%, transparent);
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      display: block;
      font-family: var(--pwx-mono);
      transition: all 0.15s ease;
    }
    .pwx-cockpit-btn:hover {
      background: color-mix(in srgb, var(--pwx-cyan) 16%, transparent);
      box-shadow: 0 0 14px color-mix(in srgb, var(--pwx-cyan) 35%, transparent);
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// E4 STRIP 1 — PINS + utilitários + unidade + perfil
// ═══════════════════════════════════════════════════════════════════════
function StripPins() {
  const { user, logout } = useAuth();
  const { nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();
  const sound = useSound();

  const openCmdK = () => {
    sound.open();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  const pins: { label: string; sub: string; href: string; color: string }[] = [
    { label: "PRESC", sub: "receita", href: "/prescricao-rapida", color: PW.cyan },
    { label: "ANAME", sub: "form", href: "/anamnese/nova", color: PW.green },
    { label: "PACIEN", sub: "pessoa", href: "/pacientes", color: PW.orange },
    { label: "AGENDA", sub: "horário", href: "/agenda-motor", color: PW.brand },
  ];

  const iniciais = (user?.nome || "??")
    .split(" ")
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      data-testid="pwx-strip-pins"
      style={{
        background: PW.navy,
        borderBottom: `1px solid ${PW.border}`,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontFamily: PW.mono,
          fontSize: 13,
          color: PW.gold,
          letterSpacing: 3,
          fontWeight: 900,
          textDecoration: "none",
          marginRight: 8,
        }}
        data-testid="pwx-logo"
      >
        ◇ PAWARDS
      </Link>

      <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
        {pins.map((p) => (
          <Link
            key={p.label}
            href={p.href}
            className="pwx-pin"
            style={{ ["--cor" as any]: p.color } as React.CSSProperties}
            data-testid={`pwx-pin-${p.label.toLowerCase()}`}
            onClick={() => sound.tap()}
          >
            <div style={{ fontSize: 10, color: p.color, letterSpacing: 1, fontWeight: 700 }}>{p.label}</div>
            <div style={{ fontSize: 9, color: "#fff", marginTop: 2 }}>{p.sub}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, marginLeft: "auto", fontSize: 10, color: PW.textMute, alignItems: "center" }}>
        <button
          onClick={openCmdK}
          data-testid="pwx-cmdk"
          style={{
            background: PW.navyDeep,
            border: `1px solid ${PW.border}`,
            color: PW.textMute,
            fontFamily: PW.mono,
            fontSize: 10,
            padding: "5px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            letterSpacing: 1,
          }}
        >
          <Search size={11} /> BUSCAR <span style={{ color: PW.textDim }}>⌘K</span>
        </button>

        <Link
          href="/filas"
          data-testid="pwx-alertas"
          style={{ display: "flex", alignItems: "center", gap: 4, color: PW.red, textDecoration: "none", fontFamily: PW.mono }}
        >
          <Bell size={12} /> 3
        </Link>

        <div style={{ textAlign: "right", fontFamily: PW.mono }}>
          <div style={{ fontSize: 8, color: PW.textDim, letterSpacing: 1 }}>
            {isTodasClinicas ? "GLOBAL" : "UNIDADE"}
          </div>
          <div style={{ fontSize: 10, color: corUnidadeSelecionada || PW.cyan, fontWeight: 700, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nomeUnidadeSelecionada || "Todas Clínicas"}
          </div>
        </div>

        <Link
          href="/plataforma/perfil"
          data-testid="pwx-perfil"
          title={user?.nome || "Perfil"}
          style={{
            width: 28,
            height: 28,
            border: `1px solid ${PW.cyan}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: PW.cyan,
            fontFamily: PW.mono,
            fontSize: 10,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {iniciais}
        </Link>

        <button
          onClick={() => logout()}
          title="Sair"
          data-testid="pwx-logout"
          style={{ background: "transparent", border: "none", color: PW.textMute, cursor: "pointer", padding: 4 }}
        >
          <LogOut size={12} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// E4 STRIP 2 — Cockpit mega-header (contextual)
// ═══════════════════════════════════════════════════════════════════════
function StripCockpit() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, modoLabel, unidadeSelecionada } = useClinic();

  // Extrai ID do paciente se rota /pacientes/:id...
  const matchPaciente = location.match(/^\/pacientes\/(\d+)/);
  const pacienteId = matchPaciente ? matchPaciente[1] : null;
  const pacienteIdNum = pacienteId ? Number(pacienteId) : 0;

  // ────────────── KPIs REAIS (Task #483) ──────────────
  // KPI AGENDA: conta sessões agendadas para HOJE (endpoint /api/agenda/semanal
  // com janela = hoje..hoje). Respeita unidade selecionada quando aplicável.
  // Importante: usar data LOCAL do navegador (não UTC). toISOString() devolve
  // UTC e perto da meia-noite (≈21h-03h BRT) puxaria o dia errado, fazendo o
  // KPI mostrar agenda de amanhã/ontem (architect review Task #483).
  const hoje = useMemo(() => {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }, []);
  const { data: agendaHoje } = useQuery({
    queryKey: ["layout-pawards", "agenda-hoje", hoje, unidadeSelecionada ?? null],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({ dataFrom: hoje, dataTo: hoje });
      if (unidadeSelecionada) params.set("unidadeId", String(unidadeSelecionada));
      const res = await apiFetch(`/api/agenda/semanal?${params.toString()}`);
      if (!res.ok) throw new Error("falha ao carregar agenda");
      const json = await res.json();
      // resposta pode vir como { dias: { '2026-05-26': [...] } } ou similar — defensivo.
      const dias = json?.dias ?? json?.porDia ?? json ?? {};
      const lista = (dias && typeof dias === "object" && dias[hoje]) || [];
      return Array.isArray(lista) ? lista.length : 0;
    },
  });

  // KPI ALERTAS: endpoint leve já existente (contagem de alertas CEO não lidos).
  // Retorna 403 pra perfis sem permissão — nesse caso ficamos com "—".
  const { data: alertasContagem } = useQuery({
    queryKey: ["layout-pawards", "alertas-contagem"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch(`/api/plataforma/alertas-seguranca/contagem`);
      if (!res.ok) return null; // 403/401 → "—"
      const json = await res.json();
      return typeof json?.total === "number" ? json.total : null;
    },
  });

  // Nome real do paciente quando rota /pacientes/:id.
  const { data: pacienteData, isLoading: pacienteCarregando } = useObterPaciente(pacienteIdNum, {
    query: {
      enabled: !!user && pacienteIdNum > 0,
      queryKey: getObterPacienteQueryKey(pacienteIdNum),
    },
  });

  // Decide o título contextual
  let titulo = "PAWARDS · PAINEL DA CLÍNICA";
  let subtitulo = nomeUnidadeSelecionada || "Todas as Clínicas";
  let label = isTodasClinicas ? "✦ VISÃO GLOBAL · CONSULTORIA" : "✦ COCKPIT · PAINEL LOCAL";

  if (pacienteId) {
    label = "✦ COCKPIT · PAINEL TÁTICO DO PACIENTE";
    // Loading state breve enquanto o nome real chega — evita flash do
    // "PACIENTE #id" pra usuários com rede rápida (architect review).
    titulo = pacienteData?.nome
      ? pacienteData.nome.toUpperCase()
      : pacienteCarregando
        ? "···"
        : `PACIENTE #${pacienteId}`;
    subtitulo = "Ficha completa · trajetória integrativa";
  } else if (location === "/agenda" || location === "/agenda-motor" || location.startsWith("/agenda")) {
    label = "✦ AGENDA · MOTOR OPERACIONAL";
    titulo = "AGENDA DO DIA";
    subtitulo = nomeUnidadeSelecionada || "Todas as Clínicas";
  } else if (location.startsWith("/financeiro") || location === "/painel-nfe") {
    label = "✦ FINANCEIRO · COCKPIT DE RECEITAS";
    titulo = "PAINEL FINANCEIRO";
  } else if (location.startsWith("/pacientes")) {
    label = "✦ CLÍNICA · LISTA DE PACIENTES";
    titulo = "PACIENTES";
  } else if (location === "/dashboard") {
    label = "✦ COCKPIT · " + (modoLabel?.toUpperCase() || "PAINEL");
    titulo = "DASHBOARD";
  }

  return (
    <div
      data-testid="pwx-strip-cockpit"
      style={{
        background: PW.navy,
        borderBottom: `2px solid ${PW.gold}`,
        padding: "14px 24px",
        position: "sticky",
        top: 41,
        zIndex: 19,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        fontFamily: PW.mono,
      }}
    >
      <div>
        <div style={{ fontSize: 10, color: PW.gold, letterSpacing: 3, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 18, color: "#fff", marginTop: 2, fontWeight: 600, letterSpacing: 1 }}>{titulo}</div>
        <div style={{ fontSize: 10, color: corUnidadeSelecionada || PW.textMute, marginTop: 2 }}>{subtitulo}</div>
      </div>
      <div style={{ display: "flex", gap: 18, fontFamily: PW.mono, fontSize: 11 }}>
        <KpiCockpit
          label="AGENDA"
          valor={typeof agendaHoje === "number" ? String(agendaHoje) : "—"}
          cor={PW.cyan}
          title="Sessões agendadas hoje (na unidade selecionada)"
        />
        <KpiCockpit
          label="ALERTAS"
          valor={typeof alertasContagem === "number" ? String(alertasContagem) : "—"}
          cor={
            typeof alertasContagem === "number"
              ? alertasContagem > 0
                ? PW.red
                : PW.textDim
              : PW.textMute
          }
          title="Alertas de segurança não lidos"
        />
        <KpiCockpit
          label="POTENCIAL"
          valor="—"
          cor={PW.green}
          title="Em apuração — fonte agregada não definida ainda"
        />
      </div>
    </div>
  );
}

function KpiCockpit({ label, valor, cor, title }: { label: string; valor: string; cor: string; title?: string }) {
  return (
    <div title={title} style={{ textAlign: "center", padding: "4px 14px", borderLeft: `1px solid ${PW.border}` }}>
      <div style={{ fontSize: 8, color: PW.textDim, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 18, color: cor, fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// L2 — Sidebar esquerda
// ═══════════════════════════════════════════════════════════════════════
function SidebarL2({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();
  const sound = useSound();
  const width = collapsed ? 64 : 230;
  const [search, setSearch] = useState("");

  const matchesSearch = (item: NavItem) =>
    !search || item.label.toLowerCase().includes(search.toLowerCase());

  return (
    <aside
      data-testid="pwx-sidebar"
      className="pwx-scroll"
      style={{
        width,
        minWidth: width,
        background: PW.navy,
        borderRight: `1px solid ${PW.border}`,
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
        fontFamily: PW.mono,
      }}
    >
      <Link
        href="/cockpit"
        className="pwx-cockpit-btn"
        data-testid="pwx-cockpit-btn"
        onClick={() => sound.open()}
      >
        <Diamond size={collapsed ? 16 : 18} style={{ color: PW.cyan, display: "inline-block" }} />
        {!collapsed && (
          <>
            <div style={{ fontSize: 10, color: PW.cyan, letterSpacing: 2, marginTop: 4, fontWeight: 700 }}>$ COCKPIT</div>
            <div style={{ fontSize: 9, color: PW.textMute, marginTop: 2 }}>ABRIR PACIENTE</div>
          </>
        )}
      </Link>

      {!collapsed && (
        <div style={{ padding: "0 14px 10px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar menu..."
            data-testid="pwx-menu-search"
            style={{
              width: "100%",
              background: PW.navyDeep,
              border: `1px solid ${PW.border}`,
              color: "#fff",
              padding: "6px 10px",
              fontFamily: PW.mono,
              fontSize: 11,
              borderRadius: 0,
              outline: "none",
            }}
          />
        </div>
      )}

      <nav style={{ flex: 1, paddingBottom: 16 }}>
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(matchesSearch);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.id} style={{ marginBottom: 6 }}>
              {!collapsed && (
                <div className="pwx-section" style={{ ["--cor" as any]: group.color } as React.CSSProperties}>
                  § {group.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location === item.href ||
                  (item.href !== "/" && location.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`pwx-btn ${active ? "active" : ""}`}
                    style={{ ["--cor" as any]: group.color } as React.CSSProperties}
                    data-testid={`pwx-nav-${item.href.replace(/\//g, "-")}`}
                    title={item.label}
                    onClick={() => sound.tap()}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 8, borderTop: `1px solid ${PW.border}` }}>
        <Platform2faFooterIndicator />
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// L2 — Painel direito (contexto)
// ═══════════════════════════════════════════════════════════════════════
function PainelContextoL2({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();

  const conteudo = useMemo(() => {
    if (location.startsWith("/pacientes/") && /\d/.test(location)) return <ContextoPacienteAtivo />;
    if (location.startsWith("/pacientes") || location.startsWith("/cockpit")) return <ContextoListaPacientes />;
    if (location.startsWith("/agenda")) return <ContextoAgenda />;
    if (location.startsWith("/financeiro") || location === "/painel-nfe") return <ContextoFinanceiro />;
    return <ContextoPadrao />;
  }, [location]);

  if (collapsed) {
    return (
      <aside
        data-testid="pwx-context-collapsed"
        style={{
          width: 40,
          background: PW.navy,
          borderLeft: `1px solid ${PW.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: PW.cyan,
            writingMode: "vertical-rl",
            letterSpacing: 3,
            marginTop: 10,
            fontFamily: PW.mono,
          }}
        >
          ◆ CONTEXTO
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="pwx-context-panel"
      className="pwx-scroll"
      style={{
        width: 320,
        minWidth: 320,
        background: PW.navy,
        borderLeft: `1px solid ${PW.border}`,
        overflowY: "auto",
        padding: 18,
        fontFamily: PW.mono,
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 9, color: PW.cyan, letterSpacing: 2, marginBottom: 14, fontWeight: 800 }}>
        ◆ PAINEL CONTEXTO
      </div>
      {conteudo}
    </aside>
  );
}

function ContextoSecao({ titulo, cor, children }: { titulo: string; cor: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, color: cor, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>{titulo}</div>
      {children}
    </div>
  );
}

function ContextoItem({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return (
    <div style={{ fontSize: 10, color: danger ? "#fca5a5" : "#cbd5e1", padding: "3px 0", lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function ContextoPacienteAtivo() {
  return (
    <>
      <div
        style={{
          border: `1px solid ${PW.border}`,
          borderLeft: `3px solid ${PW.cyan}`,
          padding: 12,
          marginBottom: 16,
          background: PW.navyPanel,
        }}
      >
        <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>PACIENTE ATIVO</div>
        <div style={{ fontSize: 10, color: PW.textMute, marginTop: 4 }}>Carregando dados clínicos...</div>
      </div>
      <ContextoSecao titulo="ÚLTIMAS AÇÕES" cor={PW.orange}>
        <ContextoItem>• Pulso Diário registrado</ContextoItem>
        <ContextoItem>• Exames adicionados</ContextoItem>
        <ContextoItem>• Fórmula prescrita</ContextoItem>
      </ContextoSecao>
      <ContextoSecao titulo="ATALHOS" cor={PW.cyan}>
        <BotaoContexto>+ NOVA RECEITA</BotaoContexto>
        <BotaoContexto>+ PEDIR EXAME</BotaoContexto>
        <BotaoContexto>+ ENVIAR MENSAGEM</BotaoContexto>
      </ContextoSecao>
    </>
  );
}

function ContextoListaPacientes() {
  return (
    <>
      <ContextoSecao titulo="ATALHOS DE LISTA" cor={PW.cyan}>
        <BotaoContexto>+ NOVO PACIENTE</BotaoContexto>
        <BotaoContexto>+ IMPORTAR LOTE</BotaoContexto>
      </ContextoSecao>
      <ContextoSecao titulo="FILTROS RÁPIDOS" cor={PW.brand}>
        <ContextoItem>• Ativos</ContextoItem>
        <ContextoItem>• Sem anamnese</ContextoItem>
        <ContextoItem>• Pendência clínica</ContextoItem>
      </ContextoSecao>
    </>
  );
}

function ContextoAgenda() {
  return (
    <>
      <ContextoSecao titulo="PRÓXIMOS HORÁRIOS" cor={PW.cyan}>
        <ContextoItem>09:00 · Sala 1</ContextoItem>
        <ContextoItem>10:30 · Sala 2</ContextoItem>
        <ContextoItem>13:00 · Sala 1</ContextoItem>
      </ContextoSecao>
      <ContextoSecao titulo="ATALHOS" cor={PW.brand}>
        <BotaoContexto>+ NOVO AGENDAMENTO</BotaoContexto>
        <BotaoContexto>BLOQUEAR HORÁRIO</BotaoContexto>
      </ContextoSecao>
    </>
  );
}

function ContextoFinanceiro() {
  return (
    <>
      <ContextoSecao titulo="RESUMO DO MÊS" cor={PW.gold}>
        <ContextoItem>Receita estimada · em apuração</ContextoItem>
        <ContextoItem>Contratos ativos</ContextoItem>
      </ContextoSecao>
      <ContextoSecao titulo="ATALHOS" cor={PW.green}>
        <BotaoContexto>+ NOVA COBRANÇA</BotaoContexto>
        <BotaoContexto>EXPORTAR EXTRATO</BotaoContexto>
      </ContextoSecao>
    </>
  );
}

function ContextoPadrao() {
  return (
    <ContextoSecao titulo="DICA" cor={PW.textMute}>
      <ContextoItem>Pressione ⌘K pra buscar qualquer comando, paciente ou tela.</ContextoItem>
      <ContextoItem>Use [ pra colapsar o menu e ] pra colapsar este painel.</ContextoItem>
    </ContextoSecao>
  );
}

function BotaoContexto({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: PW.cyan,
        padding: "5px 10px",
        border: `1px solid ${PW.cyan}30`,
        marginBottom: 4,
        cursor: "pointer",
        fontFamily: PW.mono,
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export function LayoutPawards({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pwx.sidebar") === "collapsed"
  );
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pwx.right") === "collapsed"
  );

  useEffect(() => { injectStyles(); }, []);

  // Atalhos [ ]
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "[") {
        e.preventDefault();
        setSidebarCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem("pwx.sidebar", next ? "collapsed" : "expanded");
          return next;
        });
      }
      if (e.key === "]") {
        e.preventDefault();
        setRightCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem("pwx.right", next ? "collapsed" : "expanded");
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!user) return <>{children}</>;

  return (
    <div
      data-testid="pwx-layout-root"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: PW.navyDeep,
        color: PW.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <TopProgressBar />
      <CommandPalette />

      <StripPins />
      <StripCockpit />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <SidebarL2 collapsed={sidebarCollapsed} />

        <main
          data-testid="pwx-main"
          className="pwx-scroll"
          style={{
            flex: 1,
            overflow: "auto",
            background: PW.navyDeep,
            position: "relative",
            minWidth: 0,
          }}
        >
          {children}
        </main>

        <PainelContextoL2 collapsed={rightCollapsed} />
      </div>
    </div>
  );
}

export default LayoutPawards;
