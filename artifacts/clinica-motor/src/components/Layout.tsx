import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import type { Usuario } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLembretesFalhasContagem } from "@/hooks/useLembretesFalhasContagem";
import {
  LayoutDashboard, ClipboardList, CheckSquare, ListOrdered, Users, Pill, BookOpen, CalendarClock, CreditCard,
  Building2, Settings, LogOut, GitBranch, ShieldCheck, Database, FileText, FlaskConical, CalendarDays,
  FileCheck, KeyRound, Package, ClipboardCheck, AlertTriangle, BarChart3, Shield, Lock, Radar, Send,
  ChevronDown, ChevronRight, Globe, Diamond, DollarSign, TrendingUp, Scale, Grid3X3, UserCheck, Bot, Apple, Brain,
  ClipboardList as ClipboardListIcon, Building, FileSignature, BellRing, MessageSquareText, Cloud, Mountain, Heart, MessageCircle, AtSign, Stethoscope,
  Volume2, VolumeX, Command as CommandIcon, Bell, Zap, ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { CommandPalette } from "./CommandPalette";
import { useSound } from "@/hooks/useSound";
import { Platform2faFooterIndicator } from "@/lib/Platform2faFooterIndicator";
import { Platform2faHeaderIndicator } from "@/lib/Platform2faHeaderIndicator";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { TopProgressBar } from "./TopProgressBar";

// Task #168 — campainha global de alertas de seguranca (2FA brute-force)
// pendentes. Polla o endpoint leve /contagem a cada 60s. Endpoint exige
// guardas + step-up; quando faltar, devolve 401/403 e o sino fica oculto
// (silencioso, mesmo padrao dos badges do painel-comando). Click abre a
// fila ja filtrada por nao-vistos.
function CampainhaAlertasSeguranca() {
  const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "/api";
  const [total, setTotal] = useState<number>(0);
  const sound = useSound();
  // Task #189 — snapshot anterior pra tocar "ding" suave SOMENTE em deltas
  // reais (subiu vs ultima leitura). Snapshot inicial = null nao toca, mesmo
  // padrao do toast em painel-comando.tsx (Task #164/#174). Respeita o toggle
  // global de som (useSound().enabled) e o mute especifico de seguranca
  // (localStorage "alertas_seguranca_som_mudo", Task #185).
  const totalRef = useRef<number | null>(null);
  // Ref pra manter o tap mais recente sem re-criar o interval quando o usuario
  // alterna o toggle global de som (sound.tap muda de identidade quando
  // sound.enabled muda; closure do interval ficaria stale sem este ref).
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => {
    let alive = true;
    const carregar = async () => {
      try {
        const r = await apiFetch(`${API_BASE}/plataforma/alertas-seguranca/contagem`, {
          credentials: "include",
        });
        if (!alive) return;
        // Reset pra null (nao 0) preserva semantica "primeiro carregamento
        // nao toca" apos re-auth/step-up — mesmo padrao do painel-comando.
        if (!r.ok) { setTotal(0); totalRef.current = null; return; }
        const d = await r.json();
        if (!alive) return;
        const novo = Number(d?.total ?? 0) || 0;
        const prev = totalRef.current;
        if (prev !== null && novo > prev) {
          let muted = false;
          try { muted = window.localStorage?.getItem("alertas_seguranca_som_mudo") === "1"; } catch { /* silencioso */ }
          if (!muted) soundRef.current.tap();
        }
        totalRef.current = novo;
        setTotal(novo);
      } catch { /* silencioso */ }
    };
    carregar();
    const id = setInterval(carregar, 60_000);
    const onMarcados = () => { carregar(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "alertas_seguranca_marcados_em") carregar();
    };
    window.addEventListener("alertas_seguranca_marcados", onMarcados);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("alertas_seguranca_marcados", onMarcados);
      window.removeEventListener("storage", onStorage);
    };
  }, [API_BASE]);

  if (total <= 0) return null;
  return (
    <button
      type="button"
      onClick={() => { window.location.href = "/plataforma/alertas-seguranca?apenas_nao_vistos=true"; }}
      className="relative inline-flex items-center justify-center w-8 h-8 hover:bg-sidebar-accent/50 transition-colors rounded-sm"
      title={`${total} alerta${total > 1 ? "s" : ""} de seguranca nao-visto${total > 1 ? "s" : ""} — abrir fila`}
      aria-label={`${total} alertas de seguranca nao-vistos`}
      data-testid="campainha-alertas-seguranca"
    >
      <Bell className="w-4 h-4 text-foreground" />
      <span
        className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none"
        data-testid="campainha-alertas-seguranca-badge"
      >
        {total > 99 ? "99+" : total}
      </span>
    </button>
  );
}

function ClinicSwitcher() {
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, escopo } = useClinic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canSwitch = escopo === "consultoria_master" || (escopo === "consultor_campo" && unidadesDisponiveis.length > 1);
  if (unidadesDisponiveis.length === 0) return null;

  // Pádua (15) e Genesis (14) sobem pro topo com destaque
  const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
  const genesis = unidadesDisponiveis.find((u) => u.unidadeId === 14);
  const outras = unidadesDisponiveis.filter((u) => u.unidadeId !== 14 && u.unidadeId !== 15);

  // TOP-LEVEL: 2 botões PILL grandes lado a lado — GLOBAL vs LOCAL.
  // Caio (Asperger/TDAH/TOC) pediu seletor mais visual e instantâneo.
  // Click "GLOBAL" zera unidadeSelecionada; click "LOCAL" abre dropdown
  // de unidades (ou usa a última selecionada se houver).
  const escolherLocal = () => {
    if (!canSwitch && unidadesDisponiveis.length === 1) {
      setUnidadeSelecionada(unidadesDisponiveis[0].unidadeId);
      return;
    }
    // Se já tá em local, abre dropdown pra trocar. Se tá em global,
    // muda pra última usada (ou Pádua como default) E abre dropdown.
    if (isTodasClinicas) {
      setUnidadeSelecionada(padua?.unidadeId ?? unidadesDisponiveis[0].unidadeId);
    }
    if (canSwitch) setOpen(true);
  };

  return (
    <div ref={ref} className="px-3 py-3 border-b border-border relative">
      {/* 2 botões PILL gigantes — GLOBAL | LOCAL.
          Ambos gateados por canSwitch: perfis sem permissão de trocar
          (ex: consultor_campo com 1 unidade) só veem visual mas não conseguem
          forçar mudança. Mantém invariante de acesso anterior ao redesign. */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Escopo de visualização da clínica">
        <button
          type="button"
          onClick={() => { if (canSwitch) { setUnidadeSelecionada(null); setOpen(false); } }}
          disabled={!canSwitch}
          aria-pressed={isTodasClinicas}
          aria-label="Visão global — todas as clínicas"
          className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 border-l-[3px] transition-all ${
            isTodasClinicas
              ? "bg-[#5B8DEF]/15 border-l-[#5B8DEF] text-[#A8C7FA] shadow-[inset_0_0_0_1px_rgba(91,141,239,0.3)]"
              : "border-l-transparent text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          data-testid="clinic-switcher-global"
          title={canSwitch ? "Ver TODAS as clínicas (consolidado)" : "Sem permissão para visão global"}
        >
          <Globe className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Global</span>
        </button>
        <button
          type="button"
          onClick={escolherLocal}
          aria-pressed={!isTodasClinicas}
          aria-label={`Visão local — ${isTodasClinicas ? "selecionar uma clínica" : nomeUnidadeSelecionada}`}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 border-l-[3px] transition-all ${
            !isTodasClinicas
              ? "text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(168,199,250,0.2)]"
              : "border-l-transparent text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
          }`}
          style={!isTodasClinicas ? { backgroundColor: `${corUnidadeSelecionada || "#A78B5F"}22`, borderLeftColor: corUnidadeSelecionada || "#A78B5F" } : undefined}
          data-testid="clinic-switcher-local"
          title="Ver apenas UMA clínica"
        >
          <Mountain className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Local</span>
        </button>
      </div>
      {/* Nome da clínica selecionada — bem grande, fácil de bater o olho */}
      <div className="mt-2 flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isTodasClinicas ? "#5B8DEF" : (corUnidadeSelecionada || "#6B7280") }} />
        <span className="text-[13px] font-semibold text-sidebar-foreground truncate flex-1">
          {isTodasClinicas ? "Todas as Clínicas" : (unidadeSelecionada === 15 ? `⭐ ${nomeUnidadeSelecionada}` : unidadeSelecionada === 14 ? `🧬 ${nomeUnidadeSelecionada}` : nomeUnidadeSelecionada)}
        </span>
        {canSwitch && !isTodasClinicas && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:text-foreground"
            title="Trocar clínica"
            aria-label="Trocar clínica selecionada"
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {(escopo === "consultoria_master" || escopo === "consultor_campo") && (
            <button
              onClick={() => { setUnidadeSelecionada(null); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${isTodasClinicas ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground"}`}
              data-testid="clinic-option-todas"
            >
              <Globe className="w-3.5 h-3.5" />
              Todas as Clínicas
            </button>
          )}
          {padua && (
            <button
              key={padua.unidadeId}
              onClick={() => { setUnidadeSelecionada(padua.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#B8941F]/10 transition-colors border-l-2 ${unidadeSelecionada === padua.unidadeId ? "bg-[#B8941F]/15 font-semibold border-l-[#B8941F]" : "border-l-[#B8941F]/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-padua"
            >
              <span className="text-base">⭐</span>
              <span className="font-medium">{padua.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-[#B8941F] uppercase font-bold">PRINCIPAL</span>
            </button>
          )}
          {genesis && (
            <button
              key={genesis.unidadeId}
              onClick={() => { setUnidadeSelecionada(genesis.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-purple-500/10 transition-colors border-l-2 ${unidadeSelecionada === genesis.unidadeId ? "bg-purple-500/15 font-semibold border-l-purple-500" : "border-l-purple-500/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-genesis"
            >
              <span className="text-base">🧬</span>
              <span className="font-medium">{genesis.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-purple-500 uppercase font-bold">COFRE</span>
            </button>
          )}
          {(padua || genesis) && outras.length > 0 && <div className="my-1 mx-3 border-t border-border" />}
          {outras.map((u) => (
            <button
              key={u.unidadeId}
              onClick={() => { setUnidadeSelecionada(u.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${unidadeSelecionada === u.unidadeId ? "bg-primary/10 font-semibold" : "text-sidebar-foreground"}`}
              data-testid={`clinic-option-${u.unidadeId}`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: u.unidadeCor || "#6B7280" }} />
              {u.unidadeNome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Item = { name: string; path: string; icon: any; slug: string };
type Grupo = { id: string; nome: string; icon: any; cor?: string; items: Item[] };

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis } = useClinic();
  const { total: falhasLembrete } = useLembretesFalhasContagem(unidadeSelecionada);
  // Task #157: hook compartilhado pra abrir o modal TOTP de step-up
  // direto do indicador do rodape (botao "Renovar"). Mesma instancia
  // (`openStepUp` + `modal`) ja usada pelo Platform2faExpiryBanner —
  // aqui o modal vive no Layout pra ficar disponivel sempre que o
  // platform_owner estiver navegando em /plataforma/*.
  const { openStepUp: openStepUp2fa, modal: modalStepUp2fa } = usePlatformStepUp();
  const queryClient = useQueryClient();
  const navRef = useRef<HTMLElement>(null);

  // Default Pádua APENAS na primeira sessão (não anula escolha "Todas as Clínicas")
  useEffect(() => {
    const jaInicializou = localStorage.getItem("padua_default_aplicado");
    if (!jaInicializou && unidadeSelecionada === null && unidadesDisponiveis.length > 0) {
      const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
      if (padua) {
        setUnidadeSelecionada(15);
        localStorage.setItem("padua_default_aplicado", "1");
      }
    }
  }, [unidadesDisponiveis, unidadeSelecionada, setUnidadeSelecionada]);

  const sound = useSound();

  if (!user) return <><TopProgressBar />{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "dashboard-local", "monetizar", "demandas-resolucao",
      "painel-comando", "governanca", "justificativas", "matriz-analitica", "identidade-visual",
      "agenda-motor", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao", "colaboradores", "agentes-virtuais", "acompanhamento", "comissao", "comercial",
      "dietas", "psicologia", "questionario-master", "consultorias", "contratos", "lembretes-falhas", "mensagens",
      "exames", "inundacao", "blueprint", "agendas", "governanca-matrix",
      "painel-nfe", "gateways-pagamento", "credenciais-nfe", "identidade-emails",
      "craniotomia", "galeria-mockups",
    ],
    consultor_campo: [
      "delegacao", "colaboradores", "pacientes", "anamnese", "followup", "agenda",
      "task-cards", "filas", "avaliacao-enfermagem", "estoque", "acompanhamento", "comissao",
      "justificativas", "lembretes-falhas", "dashboard-local", "demandas-resolucao",
    ],
    clinica_medico: ["anamnese","validacao","pacientes","itens-terapeuticos","pedidos-exame","agenda","ras","ras-evolutivo","followup","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_enfermeira: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_admin: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","financeiro","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
  };

  const grupos: Grupo[] = [
    {
      id: "global",
      nome: "DASHBOARD GLOBAL",
      icon: Cloud,
      cor: "#1F4E5F",
      items: [
        { name: "Visão Geral", path: "/dashboard", icon: LayoutDashboard, slug: "dashboard" },
        { name: "Painel de Comando", path: "/painel-comando", icon: Radar, slug: "painel-comando" },
        { name: "💰 Monetizar PADCON", path: "/monetizar", icon: Heart, slug: "monetizar" },
        { name: "🛡️ Matrix Governança", path: "/governanca-matrix", icon: Shield, slug: "governanca-matrix" },
        { name: "Governança Geral", path: "/governanca", icon: Shield, slug: "governanca" },
        { name: "SLA Justificativas", path: "/justificativas", icon: Scale, slug: "justificativas" },
        { name: "Matriz Analítica", path: "/matriz-analitica", icon: Grid3X3, slug: "matriz-analitica" },
        { name: "🏛️ Blueprint Arquitetura", path: "/blueprint", icon: Building, slug: "blueprint" },
        { name: "💧 Inundação Genesis", path: "/inundacao", icon: Database, slug: "inundacao" },
        { name: "🧠 Craniotomia (Motor)", path: "/craniotomia", icon: Brain, slug: "craniotomia" },
        { name: "🖼️ Galeria de Mockups", path: "/galeria-mockups", icon: Grid3X3, slug: "galeria-mockups" },
      ],
    },
    {
      id: "local",
      nome: "DASHBOARD LOCAL",
      icon: Mountain,
      cor: "#A78B5F",
      items: [
        { name: "⛰️ Visão da Clínica", path: "/dashboard-local", icon: Mountain, slug: "dashboard-local" },
        { name: "🏷️ Demandas Resolução", path: "/demandas-resolucao", icon: MessageCircle, slug: "demandas-resolucao" },
        { name: "Lembretes & Falhas", path: "/lembretes-falhas", icon: BellRing, slug: "lembretes-falhas" },
        { name: "Prescrições (Lembretes)", path: "/prescricoes-lembrete", icon: BellRing, slug: "prescricoes-lembrete" },
        { name: "Mensagens", path: "/mensagens", icon: MessageSquareText, slug: "mensagens" },
        { name: "Acompanhamento", path: "/acompanhamento", icon: Diamond, slug: "acompanhamento" },
      ],
    },
    {
      id: "agendas",
      nome: "AGENDAS & MOTOR",
      icon: CalendarDays,
      cor: "#5C7C8A",
      items: [
        { name: "🏔️ Matriz de Agenda", path: "/agendas", icon: CalendarDays, slug: "agendas" },
        { name: "Motor de Agenda", path: "/agenda-motor", icon: CalendarDays, slug: "agenda-motor" },
        { name: "Sessões Clínicas", path: "/sessoes", icon: Stethoscope, slug: "sessoes" },
        { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, slug: "agenda" },
        { name: "Follow-up", path: "/followup", icon: CalendarClock, slug: "followup" },
      ],
    },
    {
      id: "pacientes",
      nome: "CLÍNICA & PACIENTES",
      icon: Users,
      cor: "#7B6450",
      items: [
        { name: "Anamnese", path: "/anamnese", icon: ClipboardList, slug: "anamnese" },
        { name: "Validação", path: "/validacao", icon: CheckSquare, slug: "validacao" },
        { name: "Filas", path: "/filas", icon: ListOrdered, slug: "filas" },
        { name: "Pacientes", path: "/pacientes", icon: Users, slug: "pacientes" },
        { name: "Prescrição Rápida", path: "/prescricao-rapida", icon: FileText, slug: "prescricao-rapida" },
        { name: "Pedidos de Exame", path: "/pedidos-exame", icon: FileText, slug: "pedidos-exame" },
        { name: "RAS", path: "/ras", icon: FileCheck, slug: "ras" },
        { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, slug: "ras-evolutivo" },
        { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, slug: "avaliacao-enfermagem" },
        { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, slug: "task-cards" },
        { name: "Dietas", path: "/dietas", icon: Apple, slug: "dietas" },
        { name: "Psicologia", path: "/psicologia", icon: Brain, slug: "psicologia" },
      ],
    },
    {
      id: "catalogos",
      nome: "CATÁLOGOS GLOBAIS",
      icon: Database,
      cor: "#B8941F",
      items: [
        { name: "Catalogo Pawards", path: "/catalogo", icon: Database, slug: "catalogo" },
        { name: "Itens Terapêuticos", path: "/itens-terapeuticos", icon: Pill, slug: "itens-terapeuticos" },
        { name: "Protocolos", path: "/protocolos", icon: BookOpen, slug: "protocolos" },
        { name: "Substâncias", path: "/substancias", icon: FlaskConical, slug: "substancias" },
        { name: "Exames (Catálogo)", path: "/exames", icon: FlaskConical, slug: "exames" },
        { name: "Estoque", path: "/estoque", icon: Package, slug: "estoque" },
        { name: "Códigos Validação", path: "/codigos-validacao", icon: KeyRound, slug: "codigos-validacao" },
        { name: "Questionário Master", path: "/questionario-master", icon: ClipboardListIcon, slug: "questionario-master" },
      ],
    },
    {
      id: "estrutura",
      nome: "ESTRUTURA & RH",
      icon: Building,
      cor: "#1F4E5F",
      items: [
        { name: "Unidades", path: "/unidades", icon: Building2, slug: "unidades" },
        { name: "Consultorias", path: "/consultorias", icon: Building, slug: "consultorias" },
        { name: "Contratos", path: "/contratos", icon: FileSignature, slug: "contratos" },
        { name: "Colaboradores & RH", path: "/colaboradores", icon: UserCheck, slug: "colaboradores" },
        { name: "Delegação", path: "/delegacao", icon: Send, slug: "delegacao" },
        { name: "Agentes Virtuais", path: "/agentes-virtuais", icon: Bot, slug: "agentes-virtuais" },
        { name: "Comissão & Metas", path: "/comissao", icon: DollarSign, slug: "comissao" },
        { name: "Comercial", path: "/comercial", icon: TrendingUp, slug: "comercial" },
        { name: "Financeiro", path: "/financeiro", icon: CreditCard, slug: "financeiro" },
        { name: "Contas a Pagar", path: "/financeiro/contas-a-pagar", icon: CreditCard, slug: "financeiro" },
        { name: "DASH NFe", path: "/painel-nfe", icon: FileText, slug: "painel-nfe" },
        { name: "Gateways Pagto", path: "/gateways-pagamento", icon: CreditCard, slug: "gateways-pagamento" },
        { name: "Credenciais NFe & Logo", path: "/credenciais-nfe", icon: KeyRound, slug: "credenciais-nfe" },
        { name: "Identidade de E-mails", path: "/identidade-emails", icon: AtSign, slug: "identidade-emails" },
        { name: "Identidade Visual", path: "/identidade-visual", icon: Diamond, slug: "identidade-visual" },
        { name: "Fluxos Aprovação", path: "/fluxos", icon: GitBranch, slug: "fluxos" },
        { name: "Permissões", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
        { name: "Segurança", path: "/seguranca", icon: Lock, slug: "seguranca" },
        { name: "Configurações", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
      ],
    },
  ];

  const escopo = (user as any).escopo || "consultoria_master";
  const modulosPermitidos = VISIBILIDADE_POR_ESCOPO[escopo] || VISIBILIDADE_POR_ESCOPO.consultoria_master;

  // Resolve nome da tela atual procurando match no menu (mais específico
  // primeiro). Fallback usa o último segmento da URL formatado. Centraliza
  // a lógica pra header e footer mostrarem o mesmo título.
  const resolverTituloTela = (path: string): string => {
    let melhorMatch: { item: Item; tamanho: number } | null = null;
    for (const g of grupos) {
      for (const item of g.items) {
        if (path === item.path || path.startsWith(item.path + "/")) {
          if (!melhorMatch || item.path.length > melhorMatch.tamanho) {
            melhorMatch = { item, tamanho: item.path.length };
          }
        }
      }
    }
    if (melhorMatch) {
      // remove emojis decorativos do nome de menu pro header ficar limpo
      return melhorMatch.item.name.replace(/^[^\p{L}\p{N}]+/u, "").trim();
    }
    // fallback: pega último segmento e formata
    const seg = path.split("/").filter(Boolean).pop() || "início";
    return seg.replace(/-/g, " ").toUpperCase();
  };
  const tituloTela = resolverTituloTela(location);
  // raiz não tem pra onde voltar — esconde a setinha em /, /dashboard,
  // /painel-comando (telas-raiz típicas).
  const ehRaiz = location === "/" || location === "/dashboard" || location === "/painel-comando";
  const escopoLabel = escopo === "consultoria_master" ? "Master" : escopo === "consultor_campo" ? "Consultor" : escopo.replace("clinica_", "").replace("_", " ");

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <TopProgressBar />
      <aside className="w-72 border-r border-border bg-sidebar flex flex-col h-screen flex-shrink-0">
        <div className="h-24 flex items-center px-5 border-b border-border gap-3">
          <div
            aria-label="Símbolo PAWARDS"
            title="PAWARDS MEDCORE"
            style={{
              width: 58,
              height: 68,
              background: "#D4AF37",
              WebkitMaskImage: `url(${import.meta.env.BASE_URL}logo-dp.png)`,
              maskImage: `url(${import.meta.env.BASE_URL}logo-dp.png)`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              flexShrink: 0,
              filter: "drop-shadow(0 0 8px rgba(212,175,55,0.45))",
            }}
            data-testid="sidebar-symbol-d"
          />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-base text-sidebar-foreground tracking-tight uppercase">Pawards</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Developed by Pawards MedCore</span>
          </div>
          <CampainhaAlertasSeguranca />
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace("_", " ")}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
          <button
            onClick={() => { sound.open(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })); }}
            className="mt-2 w-full flex items-center justify-between gap-2 px-2 py-1 border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition-colors group"
            data-testid="hint-cmdk"
            title="Buscar comandos (Cmd/Ctrl + K)"
          >
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-sidebar-foreground transition-colors">
              <CommandIcon className="w-3 h-3" />
              Buscar
            </span>
            <kbd className="text-[9px] font-mono text-muted-foreground border border-sidebar-border px-1 py-0.5">⌘K</kbd>
          </button>
        </div>
        <ClinicSwitcher />

        {/* ⚡ PINS — atalhos fixos pras 4 ações que o Caio mais usa.
            Grade 2x2 de botões grandes com ícone+nome. Sempre visíveis,
            não dependem de grupo colapsado. Foco TDAH: bate o olho e clica. */}
        {(() => {
          const PINS: Array<{ slug: string; name: string; path: string; icon: any; cor: string }> = [
            { slug: "prescricao-rapida", name: "Prescrição", path: "/prescricao-rapida", icon: Zap, cor: "#5B8DEF" },
            { slug: "anamnese", name: "Anamnese", path: "/anamnese", icon: ClipboardList, cor: "#7BC79E" },
            { slug: "pacientes", name: "Pacientes", path: "/pacientes", icon: Users, cor: "#F5B946" },
            { slug: "agenda", name: "Agenda", path: "/agenda", icon: CalendarDays, cor: "#E07A5F" },
          ].filter((p) => modulosPermitidos.includes(p.slug));
          if (PINS.length === 0) return null;
          return (
            <div className="px-3 py-3 border-b border-border">
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#5B8DEF]" /> Atalhos
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PINS.map((p) => {
                  const Icon = p.icon;
                  const isActive = location === p.path || location.startsWith(p.path + "/");
                  return (
                    <Link
                      key={p.slug}
                      href={p.path}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 border-l-[3px] transition-all ${
                        isActive
                          ? "text-sidebar-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                      }`}
                      style={isActive
                        ? { backgroundColor: `${p.cor}22`, borderLeftColor: p.cor, boxShadow: `inset 0 0 0 1px ${p.cor}55` }
                        : { borderLeftColor: `${p.cor}55` }}
                      data-testid={`pin-${p.slug}`}
                      title={p.name}
                    >
                      <Icon className="w-5 h-5" style={{ color: p.cor }} />
                      <span className="text-[10px] uppercase tracking-wider font-bold leading-none">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 🩺 COCKPIT — atalho destacado pro painel tático do paciente.
            Vive embaixo dos PINS com tamanho maior e cor única (ciano neon
            da mensageria), pra Caio bater o olho e abrir o modo
            "painel de guerra" do paciente sem precisar caçar no menu. */}
        {modulosPermitidos.includes("pacientes") && (
          <div className="px-3 py-3 border-b border-border">
            <Link
              href="/cockpit"
              className={`group relative flex items-center gap-3 px-3 py-3 border-l-[3px] transition-all overflow-hidden ${
                // Wave Cockpit Premium 20/mai/2026: agora aponta pra /cockpit
                // (página dedicada de seletor), não mais pra /pacientes?modo=
                // cockpit (lista genérica). Destaque ativa quando estiver no
                // seletor OU no path-based /pacientes/:id/cockpit, mantendo
                // coerência visual da jornada.
                (typeof window !== "undefined" && (location === "/cockpit" || location.includes("/cockpit")))
                  ? "bg-[#5EE6E6]/15 text-sidebar-foreground"
                  : "hover:bg-[#5EE6E6]/8 text-sidebar-foreground/85 hover:text-sidebar-foreground"
              }`}
              style={{ borderLeftColor: "#5EE6E6", boxShadow: "inset 0 0 0 1px rgba(94,230,230,0.35)" }}
              data-testid="atalho-cockpit"
              title="Modo COCKPIT — painel tático do paciente"
            >
              <span
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(94,230,230,0.18)", color: "#5EE6E6" }}
              >
                <Stethoscope className="w-5 h-5" />
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold leading-none" style={{ color: "#5EE6E6" }}>
                  Painel Tático
                </span>
                <span className="text-[13px] font-bold uppercase tracking-wider leading-tight mt-0.5">
                  Cockpit Paciente
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5EE6E6] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-hide py-2 px-3">
          {/* MENU ESTILO PATRIUM + COMPARTIMENTAÇÃO COLORIDA:
              - Header de grupo: só texto uppercase tracking-wide na cor do grupo
              - Faixa vertical fina à esquerda na cor do grupo, delimitando todos
                os items do bloco visualmente
              - Items respiráveis: ícone fino + label, cantos arredondados,
                hover sutil
              - Item ativo: fundo cheio na cor do grupo + texto contraste +
                pulso neon lento (4s) na cor do grupo */}
          {grupos.map((g) => {
            const items = g.items.filter((i) => modulosPermitidos.includes(i.slug));
            if (items.length === 0) return null;
            const cor = g.cor ?? "#888";
            return (
              <div key={g.id} className="mb-4" data-testid={`grupo-${g.id}`}>
                {/* HEADER limpo do grupo (estilo Patrium) */}
                <div
                  className="text-[10px] uppercase tracking-[0.18em] font-bold mb-1.5 px-2"
                  style={{ color: cor }}
                  data-testid={`grupo-header-${g.id}`}
                >
                  {g.nome}
                </div>
                {/* BLOCO de items com faixa colorida vertical à esquerda */}
                <div
                  className="pl-2"
                  style={{ borderLeft: `2px solid ${cor}55` }}
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path || location.startsWith(item.path + "/");
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`group flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] rounded-md transition-all leading-tight ${
                          isActive
                            ? "pulso-neon-menu font-semibold"
                            : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                        }`}
                        style={isActive
                          ? ({
                              backgroundColor: cor,
                              color: "#0B1220",
                              ["--cor-neon" as string]: cor,
                              ["--cor-neon-fraca" as string]: `${cor}20`,
                              ["--cor-neon-forte" as string]: `${cor}55`,
                            } as React.CSSProperties)
                          : undefined}
                        data-testid={`menu-${item.slug}`}
                      >
                        <Icon
                          className="h-4 w-4 flex-shrink-0"
                          style={isActive ? { color: "#0B1220" } : { color: `${cor}CC` }}
                        />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.slug === "lembretes-falhas" && falhasLembrete > 0 ? (
                          <span data-testid="badge-lembretes-falhas"
                            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none animate-pulse">
                            {falhasLembrete > 99 ? "99+" : falhasLembrete}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border space-y-1">
          {(location.startsWith("/plataforma") ||
            // Task #264: validador_mestre / medico_validador tambem precisam
            // do indicador permanente quando navegando nas telas onde 2FA
            // recente eh exigido (assinatura de prescricoes, validacao de
            // exames, libera RASX). O proprio indicador faz o gate de perfil
            // — aqui so abrimos o portao de location pra essas rotas extras.
            location.startsWith("/assinaturas") ||
            location.startsWith("/validacao") ||
            location.startsWith("/laboratorio/validacao")) && (
            <Platform2faFooterIndicator
              onRenovar={() =>
                openStepUp2fa(() => {
                  // Task #157: apos sucesso, invalida /usuarios/perfil-atual
                  // pra refrescar `ultimoLogin2faEm` e o indicador re-renderizar
                  // sozinho com a nova janela de 8h. Mesmo padrao do banner #130.
                  void queryClient.invalidateQueries({
                    queryKey: ["/usuarios/perfil-atual"],
                  });
                })
              }
            />
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs"
            onClick={() => { sound.tap(); sound.toggle(); }}
            data-testid="toggle-som"
            title={sound.enabled ? "Som curatorial ligado · clique pra silenciar" : "Som curatorial silenciado · clique pra ligar"}
          >
            {sound.enabled
              ? <Volume2 className="mr-3 h-4 w-4" />
              : <VolumeX className="mr-3 h-4 w-4" />}
            {sound.enabled ? "Som ligado" : "Som silenciado"}
          </Button>
          {(() => {
            // Task #122 — perfilPlataforma so eh exposto via /perfil-atual
            // (estende Usuario do api-client com campo opcional). Tipagem
            // local pra evitar `any` espalhado pelo Layout.
            const perfilPlataforma = (user as Usuario & {
              perfilPlataforma?: "platform_owner" | "tenant_admin" | "tenant_user" | null;
            } | null)?.perfilPlataforma;
            return perfilPlataforma === "platform_owner" || perfilPlataforma === "tenant_admin";
          })() && (
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs"
              onClick={() => setLocation("/perfil/seguranca-2fa")}
              data-testid="link-perfil-seguranca-2fa"
              title="Configurar verificacao em duas etapas (2FA TOTP)"
            >
              <Lock className="mr-3 h-4 w-4" />
              Seguranca · 2FA
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs" onClick={logout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER GLOBAL — setinha de voltar (top-left, padrão navegador) +
            título da tela centralizado. Aparece em todas as telas exceto
            raiz. Decisão Caio 21/mai/2026: top-left é melhor que bottom-left
            porque é onde o olho já procura por instinto (browser nativo). */}
        <div
          className="h-11 flex items-center px-3 border-b"
          style={{
            background: "#0B1220",
            borderColor: "#1F2937",
          }}
        >
          <div className="flex-1 flex items-center min-w-0">
            {!ehRaiz && (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) window.history.back();
                  else setLocation("/dashboard");
                }}
                className="flex items-center gap-1.5 px-2 py-1 border-l-[3px] hover:bg-white/5 transition-colors"
                style={{ borderLeftColor: "#5EE6E6", color: "#5EE6E6", borderRadius: 0 }}
                title="Voltar pra tela anterior"
                aria-label="Voltar pra tela anterior"
                data-testid="btn-voltar-global"
              >
                <ArrowLeft className="w-4 h-4" />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  Voltar
                </span>
              </button>
            )}
          </div>
          <div
            className="flex-1 text-center text-[11px] font-bold uppercase tracking-[0.25em] truncate px-2"
            style={{ color: "#E5E7EB", fontFamily: "JetBrains Mono, monospace" }}
            data-testid="titulo-tela-global"
          >
            {tituloTela}
          </div>
          <div className="flex-1 flex items-center justify-end gap-3">
            {(() => {
              // Task #269: indicador 2FA segue só pra platform_owner em /plataforma/*
              const perfilPlataforma = (user as Usuario & {
                perfilPlataforma?: "platform_owner" | "tenant_admin" | "tenant_user" | null;
              } | null)?.perfilPlataforma;
              if (!location.startsWith("/plataforma") || perfilPlataforma !== "platform_owner") return null;
              return (
                <Platform2faHeaderIndicator
                  onRenovar={() =>
                    openStepUp2fa(() => {
                      void queryClient.invalidateQueries({ queryKey: ["/usuarios/perfil-atual"] });
                    })
                  }
                />
              );
            })()}
            {/* LOGO institucional no canto superior direito — pedido Caio
                21/mai/2026. Versão dourada PAWARDS MEDCORE, vai pra raiz
                ao clicar (atalho casa). border-l ciano pra alinhar com a
                gramática visual do header (borda colorida = ação). */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 pl-3 pr-2 py-1 border-l-[3px] hover:bg-white/5 transition-colors"
              style={{ borderLeftColor: "#D4AF37" }}
              title="PAWARDS MEDCORE — voltar pra Visão Geral"
              data-testid="logo-header-global"
            >
              <div
                aria-label="Símbolo PAWARDS"
                style={{
                  width: 38,
                  height: 44,
                  background: "#D4AF37",
                  WebkitMaskImage: `url(${import.meta.env.BASE_URL}logo-dp.png)`,
                  maskImage: `url(${import.meta.env.BASE_URL}logo-dp.png)`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 6px rgba(212,175,55,0.4))",
                }}
              />
              <div className="flex flex-col leading-tight">
                <span
                  className="font-bold uppercase"
                  style={{
                    color: "#D4AF37",
                    fontSize: 13,
                    letterSpacing: "0.22em",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  PAWARDS<sup style={{ fontSize: 9, color: "#D4AF37" }}>®</sup>
                </span>
                <span
                  className="uppercase italic"
                  style={{
                    color: "#9CA3AF",
                    fontSize: 9,
                    letterSpacing: "0.28em",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  Clinical Intelligence System
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>

        {/* RODAPÉ INSTITUCIONAL — operador (esq) | tela (centro) |
            Pawards® + PADCON com mensagens (dir). Global, 100% das telas
            autenticadas. JetBrains Mono UPPERCASE, deep navy, neon ciano
            como sotaque nas barras laterais. */}
        <footer
          className="h-16 flex items-stretch border-t text-[12px] uppercase tracking-[0.18em]"
          style={{
            background: "#0B1220",
            borderColor: "#1F2937",
            color: "#9CA3AF",
            fontFamily: "JetBrains Mono, monospace",
          }}
          data-testid="rodape-global"
        >
          {/* Esquerda: operador */}
          <div
            className="flex-1 flex items-center gap-2.5 px-5 border-l-[3px] min-w-0"
            style={{ borderLeftColor: "#5EE6E6" }}
          >
            <UserCheck className="w-5 h-5 flex-shrink-0" style={{ color: "#5EE6E6" }} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[14px] truncate leading-tight" style={{ color: "#E5E7EB", letterSpacing: "0.12em" }} data-testid="rodape-operador">
                {user.nome}
              </span>
              <span className="text-[11px] tracking-widest truncate leading-tight" style={{ color: "#9CA3AF" }}>
                {user.perfil.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Centro: nome da tela */}
          <div
            className="flex-1 flex items-center justify-center px-3 border-x truncate"
            style={{ borderColor: "#1F2937" }}
          >
            <span className="font-bold text-[15px] truncate" style={{ color: "#D4AF37", letterSpacing: "0.22em" }} data-testid="rodape-tela">
              {tituloTela}
            </span>
          </div>

          {/* Direita: PAWARDS® · mensagem · PADCON · mensagem */}
          <div
            className="flex-1 flex items-center justify-end gap-4 px-5 border-r-[3px]"
            style={{ borderRightColor: "#5EE6E6" }}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[14px]" style={{ color: "#D4AF37", letterSpacing: "0.16em" }}>PAWARDS MedCore</span>
              <sup className="text-[10px]" style={{ color: "#D4AF37" }}>®</sup>
              <span className="hidden md:inline text-[11px] italic normal-case" style={{ color: "#9CA3AF", letterSpacing: "0.18em" }}>
                Clinical Intelligence System
              </span>
            </span>
            <span style={{ color: "#1F2937" }}>|</span>
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[14px]" style={{ color: "#D4AF37", letterSpacing: "0.16em" }}>PADCON Platform</span>
              <sup className="text-[10px]" style={{ color: "#D4AF37" }}>®</sup>
              <span className="hidden md:inline text-[11px] italic normal-case" style={{ color: "#9CA3AF", letterSpacing: "0.18em" }}>
                Advanced Systems Architecture
              </span>
            </span>
          </div>
        </footer>
      </main>
      <CommandPalette />
      {/* Task #157: modal TOTP de step-up compartilhado — disparado pelo
          botao "Renovar" do Platform2faFooterIndicator (ou pelo fluxo
          reativo, caso outras telas adotem o hook depois). */}
      {modalStepUp2fa}
    </div>
  );
}
