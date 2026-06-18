/**
 * LayoutPawards.tsx
 *
 * Casca oficial PAWARDS — agora portada do layout-referência "CARA"
 * (PenumbraClara2_PaperCiano, aprovado por Caio no canvas em 18/06/2026).
 *
 * O QUE MUDOU NESTA VERSÃO (Opção B do CEO):
 *   A chrome (moldura) virou a do CARA: 3 faixas horizontais + menu lateral
 *   com níveis 1·2·3 + painel de contexto. TODA a lógica real foi preservada
 *   (login, troca de unidade, rotas, dados, busca ⌘K, 2FA, som).
 *
 * ARQUITETURA (3 faixas):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ FAIXA 1 · TOPO: logo · LOCAL/GLOBAL · níveis · CLARO/ESCURO ·        │
 *   │          busca ENTIDADES · busca EVENTOS · operador · som · sair     │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │ FAIXA 2 · TRILHA (breadcrumb) + KPIs reais (agenda/alertas)         │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │ FAIXA 3 · PACIENTE ATIVO + abas (ou atalhos quando sem paciente)    │
 *   ├──────┬─────────────────────────────────────┬───────────────────────┤
 *   │ menu │  trabalho central (children)        │ contexto (colapsável) │
 *   └──────┴─────────────────────────────────────┴───────────────────────┘
 *
 * Contrato público inalterado: <LayoutPawards face? children>. As 97 telas
 * que usam <Layout> continuam funcionando sem tocar em nada.
 *
 * Hooks reais reusados: useAuth, useClinic, useSound, CommandPalette,
 * TopProgressBar, Platform2faFooterIndicator, useObterPaciente.
 */

import { ReactNode, useState, useEffect, useMemo, createContext, useContext } from "react";
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
  BookOpen, Beaker, Pill,
  Building2, Settings, ShieldCheck, GitBranch, Activity,
  Bell, LogOut, Search, Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSound } from "@/hooks/useSound";
import { CommandPalette } from "./CommandPalette";
import { TopProgressBar } from "./TopProgressBar";
import { Platform2faFooterIndicator } from "@/lib/Platform2faFooterIndicator";

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — face ESCURA (PENUMBRA Navy Ciano) — aprovado por Caio.
// doms[] = 8 cores de domínio (mesmo array do perfil do canvas).
// ═══════════════════════════════════════════════════════════════════════
const PW = {
  navyDeep: "#020A14",
  navy: "#061824",
  navyPanel: "#0A2030",
  bg3: "#0E2838",
  border: "#1A3848",
  text: "#D8EEEE",
  textMute: "#88B8BE",
  textDim: "#557A82",
  gold: "#FFD27A",
  goldDeep: "#D4AF37",
  cyan: "#5FE6CC",
  neon: "#5ee6e6",
  orange: "#FFD27A",
  green: "#7cc4a0",
  red: "#d08a8a",
  brand: "#A89DFF",
  doms: ["#FFD27A", "#9CC2EA", "#5FE6CC", "#A89DFF", "#5ee6e6", "#FFA3C8", "#7cc4a0", "#d08a8a"],
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
} as const;

export type PWPalette = typeof PW;
export type PawardsFace = "escuro" | "claro";

// PENUMBRA face CLARA "Paper Ciano" — mesmas chaves de PW, valores do
// PERFIL_PAPER_CIANO aprovado por Caio. NAO inventar hex novo.
const PW_CLARO: PWPalette = {
  navyDeep: "#EEF2F4",
  navy: "#F8FBFC",
  navyPanel: "#E2E8EC",
  bg3: "#D2DCE0",
  border: "#B8C4CA",
  text: "#0F1A1F",
  textMute: "#3F5258",
  textDim: "#6E8088",
  gold: "#9C6E16",
  goldDeep: "#7A5612",
  cyan: "#1E7A6E",
  neon: "#2A9D8F",
  orange: "#9C6E16",
  green: "#3F6E3F",
  red: "#8A2A2A",
  brand: "#5A4A82",
  doms: ["#9C6E16", "#2E5C92", "#1E7A6E", "#5A4A82", "#2A9D8F", "#8A3F5C", "#3F6E3F", "#8A3F3F"],
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
};

const PW_ESCURO = PW;

// Contexto da face ativa. Default = escuro (comportamento atual inalterado).
const FaceContext = createContext<PWPalette>(PW_ESCURO);
function useFace() { return useContext(FaceContext); }

// Nível de visualização (1·2·3) compartilhado entre faixa 1 e menu lateral.
type NivelViz = 1 | 2 | 3;

// ═══════════════════════════════════════════════════════════════════════
// MENU L2 — rotas REAIS do App.tsx (sem links quebrados)
// ═══════════════════════════════════════════════════════════════════════
type NavItem = { label: string; href: string; icon: typeof Users };
type NavGroup = { id: string; label: string; color: string; items: NavItem[] };

function getNavGroups(PW: PWPalette): NavGroup[] {
  return [
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
}

// ═══════════════════════════════════════════════════════════════════════
// MENU ENXUTO — "Modo Clínico" do dia a dia (PT-BR, sem siglas).
// É o menu padrão ao logar. O botão "Modo avançado" no rodapé da sidebar
// revela o menu completo (getNavGroups) sem mexer em nenhuma rota.
// ═══════════════════════════════════════════════════════════════════════
function getNavEnxuto(PW: PWPalette): NavGroup[] {
  return [
    {
      id: "diaadia", label: "DIA A DIA", color: PW.cyan,
      items: [
        { label: "Início", href: "/inicio", icon: Home },
        { label: "Pacientes", href: "/pacientes", icon: Users },
        { label: "Atendimento", href: "/cockpit", icon: Stethoscope },
        { label: "Agenda", href: "/agenda", icon: CalendarClock },
        { label: "Pendências", href: "/filas", icon: ListChecks },
        { label: "Validação", href: "/validacao", icon: ShieldCheck },
        { label: "Acompanhamentos", href: "/followup", icon: Activity },
        { label: "Prescrição Rápida", href: "/prescricao-rapida", icon: Pill },
      ],
    },
  ];
}

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
    .pwx-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .pwx-scroll::-webkit-scrollbar-track { background: transparent; }
    .pwx-scroll::-webkit-scrollbar-thumb {
      background: var(--pwx-neon-30, rgba(94,230,230,0.25));
      border-radius: 0;
    }
    .pwx-scroll::-webkit-scrollbar-thumb:hover {
      background: var(--pwx-neon-50, rgba(94,230,230,0.5));
    }
    /* Elemento de chrome com hover "luz por trás" (neon nos 4 lados) */
    .pwx-elem {
      transition: background .15s, color .15s, border-color .15s, box-shadow .15s;
      position: relative;
    }
    .pwx-elem:hover {
      border-color: var(--cor, currentColor) !important;
      box-shadow:
        0 0 0 1px var(--cor, currentColor),
        0 0 8px 2px color-mix(in srgb, var(--cor, #5ee6e6) 32%, transparent);
      z-index: 2;
    }
    /* Item de menu (cartão com borda + accent à esquerda) */
    .pwx-menucard {
      transition: background .15s, color .15s, border-color .15s, box-shadow .15s;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 3px 8px;
      padding: 7px 10px;
      border: 1px solid var(--card-border);
      border-left: 4px solid var(--card-accent);
      background: var(--card-bg);
      cursor: pointer;
      font-family: var(--pwx-mono);
    }
    .pwx-menucard:hover {
      border-color: var(--cor) !important;
      box-shadow: 0 0 0 1px var(--cor), 0 0 10px 2px color-mix(in srgb, var(--cor) 30%, transparent);
      z-index: 2;
    }
  `;
  document.head.appendChild(style);
}

// Formata o nome do operador: primeiro nome + iniciais dos meios + sobrenome.
// Ex.: "Caio Henrique Fernandes Pádua" → "CAIO H. F. PÁDUA".
function formatarOperador(nomeCompleto?: string | null): string {
  const partes = (nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "OPERADOR";
  if (partes.length === 1) return partes[0].toUpperCase();
  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  const meios = partes.slice(1, -1).map((m) => `${m[0].toUpperCase()}.`);
  return [primeiro, ...meios, ultimo].join(" ").toUpperCase();
}

function iniciaisDe(nome?: string | null): string {
  return (nome || "??")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function calcularIdade(nasc?: string | null): number | null {
  if (!nasc) return null;
  const d = new Date(nasc);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const idade = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return idade >= 0 && idade < 140 ? idade : null;
}

// Deriva rótulo/título contextual a partir da rota atual.
function tituloDaRota(location: string, isTodasClinicas: boolean, modoLabel?: string): {
  label: string; titulo: string; cor: (PW: PWPalette) => string;
} {
  if (location.startsWith("/pacientes/") && /\d/.test(location)) {
    return { label: "PACIENTE", titulo: "FICHA DO PACIENTE", cor: (p) => p.cyan };
  }
  if (location.startsWith("/agenda")) {
    return { label: "AGENDA", titulo: "AGENDA DO DIA", cor: (p) => p.brand };
  }
  if (location.startsWith("/financeiro") || location === "/painel-nfe") {
    return { label: "FINANCEIRO", titulo: "PAINEL FINANCEIRO", cor: (p) => p.green };
  }
  if (location.startsWith("/pacientes")) {
    return { label: "PACIENTES", titulo: "LISTA DE PACIENTES", cor: (p) => p.cyan };
  }
  if (location.startsWith("/catalogo") || location.startsWith("/substancias") || location.startsWith("/itens-terapeuticos")) {
    return { label: "CATÁLOGO", titulo: "CATÁLOGO CLÍNICO", cor: (p) => p.orange };
  }
  if (location === "/dashboard") {
    return { label: "COCKPIT", titulo: "DASHBOARD", cor: (p) => p.gold };
  }
  return {
    label: isTodasClinicas ? "VISÃO GLOBAL" : "PAINEL LOCAL",
    titulo: (modoLabel || "PAINEL DA CLÍNICA").toUpperCase(),
    cor: (p) => p.gold,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// FAIXA 1 · TOPO — ferramentas (portado do CARA, ligado à lógica real)
// ═══════════════════════════════════════════════════════════════════════
function FaixaTopo({ face, setFace, nivelViz, setNivelViz }: {
  face: PawardsFace;
  setFace: (f: PawardsFace) => void;
  nivelViz: NivelViz;
  setNivelViz: (n: NivelViz) => void;
}) {
  const PW = useFace();
  const { user, logout } = useAuth();
  const {
    unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis,
    nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, escopo,
  } = useClinic();
  const sound = useSound();

  // GATE DE ESCOPO (controle de acesso): só perfis com escopo de consultoria
  // podem alternar para "Visão Global" / trocar de unidade. Perfil operacional
  // (unidade única) fica TRAVADO na própria unidade — sem botão GLOBAL, sem
  // setUnidadeSelecionada(null). Espelha a regra do ClinicContext e evita
  // elevação de escopo pela interface (broken access control).
  const podeVerGlobal = escopo === "consultoria_master" || escopo === "consultor_campo";
  const podeTrocarUnidade = podeVerGlobal || unidadesDisponiveis.length > 1;

  const abrirBusca = () => {
    sound.open();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  // LOCAL → entra numa unidade real (Instituto Pádua 15 se houver, senão a 1ª).
  const entrarLocal = () => {
    if (!isTodasClinicas) return;
    const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
    const alvo = padua || unidadesDisponiveis[0];
    if (alvo) setUnidadeSelecionada(alvo.unidadeId);
  };

  const operador = formatarOperador(user?.nome);
  const perfilLabel = ((user as any)?.perfil || "").toString().toUpperCase();

  const seg = (ativo: boolean, cor: string): React.CSSProperties => ({
    height: 26, padding: "0 11px",
    border: `1px solid ${ativo ? cor : PW.border}`,
    background: ativo ? `${cor}1f` : "transparent",
    color: ativo ? cor : PW.textDim,
    fontFamily: PW.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    ["--cor" as any]: cor,
  });

  return (
    <div
      data-testid="pwx-strip-pins"
      style={{
        height: 42, background: PW.navy, borderBottom: `1px solid ${PW.border}`,
        display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
        position: "sticky", top: 0, zIndex: 21, flexShrink: 0, fontFamily: PW.mono,
      }}
    >
      <Link
        href="/inicio"
        data-testid="pwx-logo"
        style={{
          fontFamily: PW.mono, fontSize: 13, color: PW.gold, letterSpacing: 3,
          fontWeight: 900, textDecoration: "none", marginRight: 4, whiteSpace: "nowrap",
        }}
      >
        ◇ PAWARDS
      </Link>

      {/* LOCAL / GLOBAL — troca de unidade real, só para quem tem escopo.
          Perfil operacional (sem podeVerGlobal) vê apenas a unidade fixa. */}
      {podeVerGlobal ? (
        <>
          <button className="pwx-elem" style={seg(!isTodasClinicas, PW.cyan)} onClick={entrarLocal} title="Focar numa unidade">
            LOCAL
          </button>
          <button className="pwx-elem" style={seg(isTodasClinicas, PW.doms[1])} onClick={() => setUnidadeSelecionada(null)} title="Ver todas as clínicas">
            GLOBAL
          </button>
        </>
      ) : (
        <span
          title="Sua unidade"
          style={{
            height: 26, padding: "0 11px", border: `1px solid ${corUnidadeSelecionada || PW.cyan}`,
            background: `${corUnidadeSelecionada || PW.cyan}1f`, color: corUnidadeSelecionada || PW.cyan,
            fontFamily: PW.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            display: "flex", alignItems: "center", maxWidth: 220, overflow: "hidden",
            whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}
        >
          {(nomeUnidadeSelecionada || "MINHA CLÍNICA").toUpperCase()}
        </span>
      )}

      {/* Seletor de unidade (só quando LOCAL e o perfil pode trocar) */}
      {podeTrocarUnidade && !isTodasClinicas && unidadesDisponiveis.length > 1 && (
        <select
          value={unidadeSelecionada ?? ""}
          onChange={(e) => setUnidadeSelecionada(Number(e.target.value))}
          className="pwx-elem"
          title="Trocar de unidade"
          style={{
            height: 26, background: PW.navyPanel, border: `1px solid ${corUnidadeSelecionada || PW.border}`,
            color: corUnidadeSelecionada || PW.text, fontFamily: PW.mono, fontSize: 10,
            padding: "0 6px", cursor: "pointer", maxWidth: 180, ["--cor" as any]: corUnidadeSelecionada || PW.cyan,
          }}
        >
          {unidadesDisponiveis.map((u) => (
            <option key={u.unidadeId} value={u.unidadeId}>{u.unidadeNome}</option>
          ))}
        </select>
      )}

      {/* NÍVEIS 1·2·3 — densidade do menu lateral */}
      <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
        {([1, 2, 3] as const).map((n) => {
          const act = nivelViz === n;
          return (
            <button
              key={n}
              onClick={() => setNivelViz(n)}
              className="pwx-elem"
              title={n === 1 ? "Nível 1 · menu recolhido" : n === 2 ? "Nível 2 · só ícones" : "Nível 3 · menu completo"}
              style={{
                width: 26, height: 26, border: `1px solid ${act ? PW.gold : PW.border}`,
                background: act ? `${PW.gold}22` : "transparent", color: act ? PW.gold : PW.textDim,
                fontFamily: PW.mono, fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", ["--cor" as any]: PW.gold,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* CLARO / ESCURO — troca de face em tempo real */}
      <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
        <button className="pwx-elem" style={seg(face === "claro", PW.neon)} onClick={() => setFace("claro")} title="Modo claro · papel">
          CLARO
        </button>
        <button className="pwx-elem" style={seg(face === "escuro", PW.neon)} onClick={() => setFace("escuro")} title="Modo escuro · tinta">
          ESCURO
        </button>
      </div>

      {/* BUSCA A · ENTIDADES — abre a busca real (⌘K) */}
      <button
        className="pwx-elem"
        data-testid="pwx-cmdk"
        onClick={abrirBusca}
        title="Buscar paciente, receita, fatura (⌘K)"
        style={{
          height: 26, padding: "0 10px", background: PW.navyPanel, border: `1px solid ${PW.border}`,
          display: "flex", gap: 6, alignItems: "center", cursor: "text", marginLeft: 8,
          flex: 1, minWidth: 150, maxWidth: 300, ["--cor" as any]: PW.cyan,
        }}
      >
        <Search size={11} style={{ color: PW.cyan }} />
        <span style={{ color: PW.cyan, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>ENTIDADES</span>
        <span style={{ flex: 1, textAlign: "left", color: PW.textDim, fontSize: 10, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          paciente · CPF · receita...
        </span>
        <span style={{ color: PW.textDim, fontSize: 9 }}>⌘K</span>
      </button>

      {/* BUSCA B · EVENTOS — abre a mesma busca real (⌘K) */}
      <button
        className="pwx-elem"
        onClick={abrirBusca}
        title="Buscar mensagem, alerta, log (⌘K)"
        style={{
          height: 26, padding: "0 10px", background: PW.navyPanel, border: `1px solid ${PW.border}`,
          display: "flex", gap: 6, alignItems: "center", cursor: "text",
          flex: 1, minWidth: 130, maxWidth: 250, ["--cor" as any]: PW.gold,
        }}
      >
        <Search size={11} style={{ color: PW.gold }} />
        <span style={{ color: PW.gold, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>EVENTOS</span>
        <span style={{ flex: 1, textAlign: "left", color: PW.textDim, fontSize: 10, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          msg · alerta · notif...
        </span>
      </button>

      {/* CLUSTER OPERADOR — encostado à direita */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <Link
          href="/filas"
          data-testid="pwx-alertas"
          title="Pendências e alertas"
          className="pwx-elem"
          style={{
            height: 26, padding: "0 8px", display: "flex", alignItems: "center", gap: 4,
            color: PW.red, textDecoration: "none", border: `1px solid ${PW.red}55`,
            fontFamily: PW.mono, fontSize: 10, fontWeight: 700, ["--cor" as any]: PW.red,
          }}
        >
          <Bell size={12} /> 3
        </Link>

        <Link
          href="/plataforma/perfil"
          data-testid="pwx-perfil"
          title={user?.nome || "Perfil"}
          className="pwx-elem"
          style={{
            height: 26, padding: "0 10px", border: `1px solid ${PW.cyan}66`, color: PW.cyan,
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 7, ["--cor" as any]: PW.cyan,
          }}
        >
          <span>{operador}</span>
          {perfilLabel && (
            <span style={{ color: PW.textMute, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, paddingLeft: 7, borderLeft: `1px solid ${PW.cyan}44` }}>
              {perfilLabel}
            </span>
          )}
        </Link>

        <div style={{ width: 1, height: 16, background: PW.border }} />

        {/* SOM · ON/MUDO — toggle real */}
        <button
          onClick={() => sound.toggle()}
          className="pwx-elem"
          title={sound.enabled ? "Som ativo · clique para silenciar" : "Som mudo · clique para ativar"}
          style={{
            height: 26, padding: "0 9px", border: `1px solid ${sound.enabled ? PW.green : PW.border}`,
            background: sound.enabled ? `${PW.green}14` : "transparent", color: sound.enabled ? PW.green : PW.textDim,
            fontFamily: PW.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5, ["--cor" as any]: sound.enabled ? PW.green : PW.textDim,
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1, textDecoration: sound.enabled ? "none" : "line-through" }}>♪</span>
          <span>{sound.enabled ? "SOM" : "MUDO"}</span>
        </button>

        <Link
          href="/configuracoes"
          className="pwx-elem"
          title="Configurações"
          style={{
            height: 26, padding: "0 9px", fontSize: 10, color: PW.gold, border: `1px solid ${PW.gold}55`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5, letterSpacing: 1, fontWeight: 700,
            textDecoration: "none", ["--cor" as any]: PW.gold,
          }}
        >
          <Settings size={11} /> CONFIG
        </Link>

        <button
          onClick={() => logout()}
          data-testid="pwx-logout"
          className="pwx-elem"
          title="Sair"
          style={{
            height: 26, padding: "0 9px", fontSize: 10, color: PW.red, border: `1px solid ${PW.red}55`,
            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            letterSpacing: 1, fontWeight: 700, fontFamily: PW.mono, ["--cor" as any]: PW.red,
          }}
        >
          <LogOut size={11} /> SAIR
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FAIXA 2 · TRILHA (breadcrumb) + KPIs reais
// ═══════════════════════════════════════════════════════════════════════
function FaixaTrilha() {
  const PW = useFace();
  const { user } = useAuth();
  const [location] = useLocation();
  const { nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, unidadeSelecionada, modoLabel } = useClinic();

  const ctx = tituloDaRota(location, isTodasClinicas, modoLabel);
  const corCtx = ctx.cor(PW);

  // KPI AGENDA — sessões agendadas para HOJE (data local, não UTC).
  const hoje = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
      const dias = json?.dias ?? json?.porDia ?? json ?? {};
      const lista = (dias && typeof dias === "object" && dias[hoje]) || [];
      return Array.isArray(lista) ? lista.length : 0;
    },
  });

  // KPI ALERTAS — contagem de alertas de segurança não lidos (403 → "—").
  const { data: alertasContagem } = useQuery({
    queryKey: ["layout-pawards", "alertas-contagem"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch(`/api/plataforma/alertas-seguranca/contagem`);
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json?.total === "number" ? json.total : null;
    },
  });

  const trilha = ["PAWARDS", (nomeUnidadeSelecionada || "TODAS AS CLÍNICAS").toUpperCase()];

  return (
    <div
      data-testid="pwx-strip-cockpit"
      style={{
        height: 40, background: PW.navy, borderBottom: `1px solid ${PW.border}`,
        display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0,
        position: "sticky", top: 42, zIndex: 20, fontFamily: PW.mono,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 10, letterSpacing: 1.2, color: PW.text }}>
        {trilha.map((x, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center" }}>
            <span className="pwx-elem" style={{ padding: "2px 6px", cursor: "default", ["--cor" as any]: PW.cyan }}>{x}</span>
            <span style={{ color: PW.textDim, margin: "0 3px" }}>▸</span>
          </span>
        ))}
        <span
          className="pwx-elem"
          style={{
            background: "transparent", color: corCtx, border: `1px solid ${corCtx}`,
            padding: "2px 8px", fontWeight: 700, fontSize: 10, letterSpacing: 1, ["--cor" as any]: corCtx,
          }}
        >
          {ctx.label}
        </span>
      </div>

      {/* KPIs reais à direita */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 0, fontFamily: PW.mono }}>
        <KpiTopo label="AGENDA" valor={typeof agendaHoje === "number" ? String(agendaHoje) : "—"} cor={PW.cyan} title="Sessões agendadas hoje" />
        <KpiTopo
          label="ALERTAS"
          valor={typeof alertasContagem === "number" ? String(alertasContagem) : "—"}
          cor={typeof alertasContagem === "number" ? (alertasContagem > 0 ? PW.red : PW.textDim) : PW.textMute}
          title="Alertas de segurança não lidos"
        />
        <KpiTopo label="POTENCIAL" valor="—" cor={PW.green} title="Em apuração — fonte agregada não definida ainda" />
      </div>
    </div>
  );
}

function KpiTopo({ label, valor, cor, title }: { label: string; valor: string; cor: string; title?: string }) {
  const PW = useFace();
  return (
    <div title={title} style={{ textAlign: "center", padding: "0 14px", borderLeft: `1px solid ${PW.border}` }}>
      <div style={{ fontSize: 8, color: PW.textDim, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 15, color: cor, fontWeight: 700, lineHeight: 1.1 }}>{valor}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FAIXA 3 · PACIENTE ATIVO + abas (ou atalhos quando sem paciente)
// ═══════════════════════════════════════════════════════════════════════
function FaixaPaciente() {
  const PW = useFace();
  const { user } = useAuth();
  const [location] = useLocation();

  const matchPaciente = location.match(/^\/pacientes\/(\d+)/);
  const pacienteIdNum = matchPaciente ? Number(matchPaciente[1]) : 0;

  const { data: pacienteData, isLoading } = useObterPaciente(pacienteIdNum, {
    query: {
      enabled: !!user && pacienteIdNum > 0,
      queryKey: getObterPacienteQueryKey(pacienteIdNum),
    },
  });

  const temPaciente = pacienteIdNum > 0;
  const idade = calcularIdade((pacienteData as any)?.dataNascimento);
  const sexo = (pacienteData as any)?.sexo as string | undefined;

  const abas: { label: string; href: string; cor: string }[] = [
    { label: "PACIENTE", href: temPaciente ? `/pacientes/${pacienteIdNum}` : "/pacientes", cor: PW.doms[2] },
    { label: "AGENDA", href: "/agenda", cor: PW.doms[1] },
    { label: "PRESCRIÇÃO", href: "/prescricao-rapida", cor: PW.doms[0] },
    { label: "FATURAMENTO", href: "/financeiro", cor: PW.doms[6] },
  ];

  const pins: { label: string; sub: string; href: string; cor: string }[] = [
    { label: "PRESC", sub: "receita", href: "/prescricao-rapida", cor: PW.cyan },
    { label: "ANAME", sub: "form", href: "/anamnese/nova", cor: PW.green },
    { label: "PACIEN", sub: "pessoa", href: "/pacientes", cor: PW.orange },
    { label: "AGENDA", sub: "horário", href: "/agenda-motor", cor: PW.brand },
  ];

  return (
    <div
      style={{
        height: 42, background: PW.navy, borderBottom: `2px solid ${PW.gold}`,
        display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0,
        position: "sticky", top: 82, zIndex: 19, fontFamily: PW.mono,
      }}
    >
      {temPaciente ? (
        <>
          <span style={{ fontSize: 10, color: PW.green, fontWeight: 700, letterSpacing: 1, padding: "2px 6px", border: `1px solid ${PW.green}66` }}>
            ATIVO
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: PW.cyan, letterSpacing: 1 }}>
            {(pacienteData as any)?.nome ? String((pacienteData as any).nome).toUpperCase() : isLoading ? "···" : `PACIENTE #${pacienteIdNum}`}
          </span>
          {(idade !== null || sexo) && (
            <span style={{ fontSize: 10, color: PW.textMute }}>
              {[idade !== null ? `${idade}A` : null, sexo ? sexo.toUpperCase() : null].filter(Boolean).join(" · ")}
            </span>
          )}
          <div style={{ display: "flex", gap: 4, marginLeft: 14 }}>
            {abas.map((aba) => {
              const act = location === aba.href || (aba.label === "PACIENTE" && temPaciente && location.startsWith(`/pacientes/${pacienteIdNum}`));
              return (
                <Link
                  key={aba.label}
                  href={aba.href}
                  className="pwx-elem"
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 9px",
                    border: `1px solid ${act ? aba.cor : PW.border}`, color: act ? aba.cor : PW.textMute,
                    background: act ? `${aba.cor}14` : "transparent", cursor: "pointer", textDecoration: "none",
                    ["--cor" as any]: aba.cor,
                  }}
                >
                  {aba.label}
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <span style={{ fontSize: 9, color: PW.textDim, letterSpacing: 2, fontWeight: 700 }}>ATALHOS RÁPIDOS</span>
          <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
            {pins.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="pwx-elem"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1,
                  padding: "3px 12px", border: `1px solid ${p.cor}`, background: `${p.cor}12`,
                  textDecoration: "none", cursor: "pointer", ["--cor" as any]: p.cor,
                }}
              >
                <span style={{ fontSize: 10, color: p.cor, letterSpacing: 1, fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontSize: 8, color: PW.textMute }}>{p.sub}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// L2 — Menu lateral (níveis 1·2·3) — rotas reais + modo enxuto/avançado
// ═══════════════════════════════════════════════════════════════════════
function SidebarL2({ nivelViz, setNivelViz }: { nivelViz: NivelViz; setNivelViz: (n: NivelViz) => void }) {
  const PW = useFace();
  const [location] = useLocation();
  const sound = useSound();
  const [search, setSearch] = useState("");
  const [menuModo, setMenuModo] = useState<"enxuto" | "avancado">(
    () => (typeof window !== "undefined" && localStorage.getItem("pwx.menu.modo") === "avancado") ? "avancado" : "enxuto"
  );
  const grupos = menuModo === "enxuto" ? getNavEnxuto(PW) : getNavGroups(PW);

  const alternarModo = () => {
    setMenuModo((prev) => {
      const next = prev === "enxuto" ? "avancado" : "enxuto";
      try { localStorage.setItem("pwx.menu.modo", next); } catch { /* ignore */ }
      return next;
    });
  };

  const matchesSearch = (item: NavItem) =>
    !search || item.label.toLowerCase().includes(search.toLowerCase());

  // NÍVEL 1 · menu recolhido → barra fina vertical clicável pra reabrir.
  if (nivelViz === 1) {
    return (
      <div
        onClick={() => setNivelViz(3)}
        className="pwx-elem"
        data-testid="pwx-sidebar"
        style={{
          width: 22, background: PW.navy, borderRight: `1px solid ${PW.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8,
          cursor: "pointer", writingMode: "vertical-rl", fontSize: 10, color: PW.cyan,
          letterSpacing: 4, fontWeight: 900, flexShrink: 0, ["--cor" as any]: PW.cyan,
        }}
        title="Reabrir menu"
      >
        MENU
      </div>
    );
  }

  const compacto = nivelViz === 2;
  const width = compacto ? 66 : 232;

  return (
    <aside
      data-testid="pwx-sidebar"
      className="pwx-scroll"
      style={{
        width, minWidth: width, background: PW.navy, borderRight: `1px solid ${PW.border}`,
        overflowY: "auto", overflowX: "hidden", transition: "width 0.2s ease",
        display: "flex", flexDirection: "column", padding: "10px 0", fontFamily: PW.mono, flexShrink: 0,
      }}
    >
      <Link
        href="/cockpit"
        data-testid="pwx-cockpit-btn"
        onClick={() => sound.open()}
        className="pwx-elem"
        style={{
          margin: "0 8px 10px", padding: compacto ? "8px 4px" : "10px",
          border: `1px solid ${PW.cyan}`, background: `${PW.cyan}14`, textAlign: "center",
          textDecoration: "none", display: "block", ["--cor" as any]: PW.cyan,
        }}
      >
        <div style={{ fontSize: 10, color: PW.cyan, letterSpacing: 2, fontWeight: 700 }}>◆ {compacto ? "" : "COCKPIT"}</div>
        {!compacto && <div style={{ fontSize: 9, color: PW.textMute, marginTop: 2 }}>ABRIR PACIENTE</div>}
      </Link>

      {!compacto && (
        <div style={{ padding: "0 8px 10px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar menu..."
            data-testid="pwx-menu-search"
            style={{
              width: "100%", background: PW.navyDeep, border: `1px solid ${PW.border}`, color: PW.text,
              padding: "6px 10px", fontFamily: PW.mono, fontSize: 11, borderRadius: 0, outline: "none",
            }}
          />
        </div>
      )}

      <nav style={{ flex: 1, paddingBottom: 12 }}>
        {grupos.map((group) => {
          const visibleItems = group.items.filter(matchesSearch);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.id} style={{ marginBottom: 6 }}>
              {!compacto && (
                <div style={{
                  padding: "4px 12px", fontSize: 9, letterSpacing: 1.5, color: group.color,
                  borderBottom: `1px solid ${group.color}40`, margin: "12px 8px 4px",
                }}>
                  § {group.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="pwx-menucard"
                    data-testid={`pwx-nav-${item.href.replace(/\//g, "-")}`}
                    title={item.label}
                    onClick={() => sound.tap()}
                    style={{
                      justifyContent: compacto ? "center" : "flex-start",
                      ["--cor" as any]: group.color,
                      ["--card-border" as any]: active ? group.color : PW.border,
                      ["--card-accent" as any]: active ? group.color : `${group.color}44`,
                      ["--card-bg" as any]: active ? `${group.color}18` : PW.navyPanel,
                      color: active ? group.color : PW.textMute,
                      fontSize: 11, fontWeight: active ? 800 : 600,
                    }}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    {!compacto && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {!compacto && (
        <button
          onClick={alternarModo}
          data-testid="pwx-menu-modo"
          title={menuModo === "enxuto" ? "Mostrar todos os menus do sistema (modo avançado)" : "Voltar ao menu simples do dia a dia"}
          style={{
            margin: "0 8px 10px", padding: "8px 10px", background: "transparent",
            border: `1px solid ${PW.border}`, color: PW.textMute, fontFamily: PW.mono, fontSize: 10,
            letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderRadius: 0, textAlign: "center",
          }}
        >
          {menuModo === "enxuto" ? "Modo avançado →" : "← Modo simples"}
        </button>
      )}

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
  const PW = useFace();
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
          width: 40, background: PW.navy, borderLeft: `1px solid ${PW.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 9, color: PW.cyan, writingMode: "vertical-rl", letterSpacing: 3, marginTop: 10, fontFamily: PW.mono }}>
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
        width: 320, minWidth: 320, background: PW.navy, borderLeft: `1px solid ${PW.border}`,
        overflowY: "auto", padding: 18, fontFamily: PW.mono, flexShrink: 0,
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
  const PW = useFace();
  return (
    <div style={{ fontSize: 10, color: danger ? PW.red : PW.textMute, padding: "3px 0", lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function ContextoPacienteAtivo() {
  const PW = useFace();
  return (
    <>
      <div
        style={{
          border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.cyan}`,
          padding: 12, marginBottom: 16, background: PW.navyPanel,
        }}
      >
        <div style={{ fontSize: 13, color: PW.text, fontWeight: 600 }}>PACIENTE ATIVO</div>
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
  const PW = useFace();
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
  const PW = useFace();
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
  const PW = useFace();
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
  const PW = useFace();
  return (
    <ContextoSecao titulo="DICA" cor={PW.textMute}>
      <ContextoItem>Pressione ⌘K pra buscar qualquer comando, paciente ou tela.</ContextoItem>
      <ContextoItem>Use as teclas 1·2·3 pra mudar o nível do menu e ] pra colapsar este painel.</ContextoItem>
    </ContextoSecao>
  );
}

function BotaoContexto({ children }: { children: ReactNode }) {
  const PW = useFace();
  return (
    <div
      className="pwx-elem"
      style={{
        fontSize: 10, color: PW.cyan, padding: "5px 10px", border: `1px solid ${PW.cyan}30`,
        marginBottom: 4, cursor: "pointer", fontFamily: PW.mono, letterSpacing: 0.5, ["--cor" as any]: PW.cyan,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — contrato inalterado { children, face }
// ═══════════════════════════════════════════════════════════════════════
export function LayoutPawards({ children, face = "escuro" }: { children: ReactNode; face?: PawardsFace }) {
  const { user } = useAuth();

  // Face efetiva: a escolha do usuário (CLARO/ESCURO no topo) sobrepõe a prop
  // da tela; se nunca escolheu nada, vale a prop que a tela passou.
  const [faceOverride, setFaceOverride] = useState<PawardsFace | null>(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem("pwx.face");
    return v === "claro" || v === "escuro" ? v : null;
  });
  const faceEfetiva: PawardsFace = faceOverride ?? face;
  const PW = faceEfetiva === "claro" ? PW_CLARO : PW_ESCURO;
  const aplicarFace = (f: PawardsFace) => {
    try { localStorage.setItem("pwx.face", f); } catch { /* ignore */ }
    setFaceOverride(f);
  };

  // Nível de visualização do menu (1·2·3), persistido.
  const [nivelViz, setNivelVizState] = useState<NivelViz>(() => {
    if (typeof window === "undefined") return 3;
    const v = Number(localStorage.getItem("pwx.nivel"));
    return v === 1 || v === 2 ? (v as NivelViz) : 3;
  });
  const setNivelViz = (n: NivelViz) => {
    try { localStorage.setItem("pwx.nivel", String(n)); } catch { /* ignore */ }
    setNivelVizState(n);
  };

  const [rightCollapsed, setRightCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pwx.right") === "collapsed"
  );

  useEffect(() => { injectStyles(); }, []);

  // Atalhos: 1·2·3 = nível do menu · [ alterna recolhido · ] alterna contexto
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        setNivelViz(Number(e.key) as NivelViz);
      }
      if (e.key === "[") {
        e.preventDefault();
        setNivelVizState((prev) => {
          const next: NivelViz = prev === 1 ? 3 : 1;
          try { localStorage.setItem("pwx.nivel", String(next)); } catch { /* ignore */ }
          return next;
        });
      }
      if (e.key === "]") {
        e.preventDefault();
        setRightCollapsed((prev) => {
          const next = !prev;
          try { localStorage.setItem("pwx.right", next ? "collapsed" : "expanded"); } catch { /* ignore */ }
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!user) return <>{children}</>;

  return (
    <FaceContext.Provider value={PW}>
      <div
        data-testid="pwx-layout-root"
        style={{
          height: "100vh", display: "flex", flexDirection: "column",
          background: PW.navyDeep, color: PW.text, fontFamily: PW.mono,
          ["--pwx-mono" as any]: PW.mono,
          ["--pwx-neon-30" as any]: `${PW.neon}40`,
          ["--pwx-neon-50" as any]: `${PW.neon}80`,
        }}
      >
        <TopProgressBar />
        <CommandPalette />

        <FaixaTopo face={faceEfetiva} setFace={aplicarFace} nivelViz={nivelViz} setNivelViz={setNivelViz} />
        <FaixaTrilha />
        <FaixaPaciente />

        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <SidebarL2 nivelViz={nivelViz} setNivelViz={setNivelViz} />

          <main
            data-testid="pwx-main"
            className="pwx-scroll"
            style={{ flex: 1, overflow: "auto", background: PW.navyDeep, position: "relative", minWidth: 0 }}
          >
            {children}
          </main>

          <PainelContextoL2 collapsed={rightCollapsed} />
        </div>
      </div>
    </FaceContext.Provider>
  );
}

export default LayoutPawards;
