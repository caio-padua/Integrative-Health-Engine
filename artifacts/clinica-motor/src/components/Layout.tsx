import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLembretesFalhasContagem } from "@/hooks/useLembretesFalhasContagem";
import {
  LayoutDashboard, ClipboardList, CheckSquare, ListOrdered, Users, Pill, BookOpen, CalendarClock, CreditCard,
  Building2, Settings, LogOut, GitBranch, ShieldCheck, Database, FileText, FlaskConical, CalendarDays,
  FileCheck, KeyRound, Package, ClipboardCheck, AlertTriangle, BarChart3, Shield, Lock, Radar, Send,
  ChevronDown, ChevronRight, Globe, Diamond, DollarSign, TrendingUp, Scale, Grid3X3, UserCheck, Bot, Apple, Brain,
  ClipboardList as ClipboardListIcon, Building, FileSignature, BellRing, MessageSquareText, Cloud, Mountain, Heart, MessageCircle, AtSign, Stethoscope,
} from "lucide-react";
import { Button } from "./ui/button";
import { CommandPalette } from "./CommandPalette";

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

  const decorarNome = (uid: number, nome: string) => {
    if (uid === 15) return `⭐ ${nome}`;
    if (uid === 14) return `🧬 ${nome}`;
    return nome;
  };

  return (
    <div ref={ref} className="px-3 py-2 border-b border-border relative">
      <button
        onClick={() => canSwitch && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded ${canSwitch ? "hover:bg-sidebar-accent/50 cursor-pointer" : "cursor-default"}`}
        data-testid="clinic-switcher-toggle"
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corUnidadeSelecionada || "hsl(210, 45%, 65%)" }} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-sidebar-foreground truncate block">
            {unidadeSelecionada ? decorarNome(unidadeSelecionada, nomeUnidadeSelecionada) : nomeUnidadeSelecionada}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: isTodasClinicas ? "hsl(210, 45%, 65%)" : corUnidadeSelecionada || "#6B7280" }}>
            {isTodasClinicas ? "Visao Global" : "Visao Local"}
          </span>
        </div>
        {canSwitch && <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
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
  const [location] = useLocation();
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis } = useClinic();
  const { total: falhasLembrete } = useLembretesFalhasContagem(unidadeSelecionada);

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

  // Estado de colapso por grupo (lembrar via localStorage) — DEVE vir antes do early return
  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("layout_grupos_colapsados") || "{}");
    } catch { return {}; }
  });
  const toggleGrupo = (id: string) => {
    setColapsados((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("layout_grupos_colapsados", JSON.stringify(next));
      return next;
    });
  };

  if (!user) return <>{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "dashboard-local", "monetizar", "demandas-resolucao",
      "painel-comando", "governanca", "justificativas", "matriz-analitica",
      "agenda-motor", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao", "colaboradores", "agentes-virtuais", "acompanhamento", "comissao", "comercial",
      "dietas", "psicologia", "questionario-master", "consultorias", "contratos", "lembretes-falhas", "mensagens",
      "exames", "inundacao", "blueprint", "agendas", "governanca-matrix",
      "painel-nfe", "gateways-pagamento", "credenciais-nfe", "identidade-emails",
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
        { name: "DASH NFe", path: "/painel-nfe", icon: FileText, slug: "painel-nfe" },
        { name: "Gateways Pagto", path: "/gateways-pagamento", icon: CreditCard, slug: "gateways-pagamento" },
        { name: "Credenciais NFe & Logo", path: "/credenciais-nfe", icon: KeyRound, slug: "credenciais-nfe" },
        { name: "Identidade de E-mails", path: "/identidade-emails", icon: AtSign, slug: "identidade-emails" },
        { name: "Fluxos Aprovação", path: "/fluxos", icon: GitBranch, slug: "fluxos" },
        { name: "Permissões", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
        { name: "Segurança", path: "/seguranca", icon: Lock, slug: "seguranca" },
        { name: "Configurações", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
      ],
    },
  ];

  const escopo = (user as any).escopo || "consultoria_master";
  const modulosPermitidos = VISIBILIDADE_POR_ESCOPO[escopo] || VISIBILIDADE_POR_ESCOPO.consultoria_master;
  const escopoLabel = escopo === "consultoria_master" ? "Master" : escopo === "consultor_campo" ? "Consultor" : escopo.replace("clinica_", "").replace("_", " ");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div className="w-9 h-9 flex items-center justify-center bg-white/90 border border-border mr-3 p-1">
            <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain invert-0" />
          </div>
          <div>
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight uppercase">Pawards</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Developed by Pawards MedCore</span>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace("_", " ")}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
        </div>
        <ClinicSwitcher />
        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {grupos.map((g) => {
            const items = g.items.filter((i) => modulosPermitidos.includes(i.slug));
            if (items.length === 0) return null;
            const colapsado = !!colapsados[g.id];
            const GIcon = g.icon;
            return (
              <div key={g.id} className="mb-1.5">
                <button
                  onClick={() => toggleGrupo(g.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`grupo-toggle-${g.id}`}
                >
                  <GIcon className="w-3 h-3" style={{ color: g.cor }} />
                  <span className="flex-1 text-left">{g.nome}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${colapsado ? "" : "rotate-90"}`} />
                </button>
                {!colapsado && (
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path || location.startsWith(item.path + "/");
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`flex items-center px-3 py-1.5 text-[12px] transition-colors border-l-2 ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-primary"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-transparent"
                          }`}
                          data-testid={`menu-${item.slug}`}
                        >
                          <Icon className="mr-2.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.slug === "lembretes-falhas" && falhasLembrete > 0 ? (
                            <span data-testid="badge-lembretes-falhas"
                              className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
                              {falhasLembrete > 99 ? "99+" : falhasLembrete}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs" onClick={logout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
