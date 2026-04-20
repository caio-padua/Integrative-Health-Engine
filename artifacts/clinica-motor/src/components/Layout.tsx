import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLembretesFalhasContagem } from "@/hooks/useLembretesFalhasContagem";
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckSquare, 
  ListOrdered, 
  Users, 
  Pill, 
  BookOpen, 
  CalendarClock, 
  CreditCard, 
  Building2, 
  Settings,
  LogOut,
  Activity,
  GitBranch,
  ShieldCheck,
  Database,
  FileText,
  FlaskConical,
  CalendarDays,
  Hash,
  FileCheck,
  KeyRound,
  Package,
  ClipboardCheck,
  AlertTriangle,
  BarChart3,
  Star,
  Upload,
  Shield,
  Lock,
  Radar,
  Send,
  ChevronDown,
  Globe,
  Diamond,
  DollarSign,
  TrendingUp,
  Scale,
  Grid3X3,
  UserCheck,
  Bot,
  Apple,
  Brain,
  ClipboardList as ClipboardListIcon,
  Building,
  FileSignature,
  BellRing,
  MessageSquareText
} from "lucide-react";
import { Button } from "./ui/button";

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

  return (
    <div ref={ref} className="px-3 py-2 border-b border-border relative">
      <button
        onClick={() => canSwitch && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded ${canSwitch ? "hover:bg-sidebar-accent/50 cursor-pointer" : "cursor-default"}`}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corUnidadeSelecionada || "hsl(210, 45%, 65%)" }} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-sidebar-foreground truncate block">{nomeUnidadeSelecionada}</span>
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: isTodasClinicas ? "hsl(210, 45%, 65%)" : corUnidadeSelecionada || "#6B7280" }}>
            {isTodasClinicas ? "Visao Global" : "Visao Local"}
          </span>
        </div>
        {canSwitch && <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
          {(escopo === "consultoria_master" || escopo === "consultor_campo") && (
            <button
              onClick={() => { setUnidadeSelecionada(null); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${isTodasClinicas ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground"}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Todas as Clínicas
            </button>
          )}
          {unidadesDisponiveis.map(u => (
            <button
              key={u.unidadeId}
              onClick={() => { setUnidadeSelecionada(u.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${unidadeSelecionada === u.unidadeId ? "bg-primary/10 font-semibold" : "text-sidebar-foreground"}`}
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

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { unidadeSelecionada } = useClinic();
  const { total: falhasLembrete } = useLembretesFalhasContagem(unidadeSelecionada);

  if (!user) return <>{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "painel-comando", "governanca", "justificativas", "matriz-analitica",
      "agenda-motor", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao", "colaboradores", "agentes-virtuais", "acompanhamento", "comissao", "comercial",
      "dietas", "psicologia", "questionario-master", "consultorias", "contratos", "lembretes-falhas", "mensagens", "exames", "inundacao", "blueprint", "agendas"
    ],
    consultor_campo: [
      "delegacao", "colaboradores", "pacientes", "anamnese", "followup", "agenda",
      "task-cards", "filas", "avaliacao-enfermagem", "estoque", "acompanhamento", "comissao",
      "justificativas", "lembretes-falhas"
    ],
    clinica_medico: [
      "anamnese", "validacao", "pacientes", "itens-terapeuticos",
      "pedidos-exame", "agenda", "ras", "ras-evolutivo", "followup", "delegacao", "colaboradores",
      "lembretes-falhas"
    ],
    clinica_enfermeira: [
      "anamnese", "filas", "pacientes", "followup", "agenda",
      "estoque", "avaliacao-enfermagem", "task-cards", "delegacao", "colaboradores",
      "lembretes-falhas"
    ],
    clinica_admin: [
      "anamnese", "filas", "pacientes", "followup", "agenda",
      "estoque", "avaliacao-enfermagem", "task-cards", "financeiro", "delegacao", "colaboradores",
      "lembretes-falhas"
    ],
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, slug: "dashboard" },
    { name: "Painel de Comando", path: "/painel-comando", icon: Radar, slug: "painel-comando" },
    { name: "Governanca", path: "/governanca", icon: Shield, slug: "governanca" },
    { name: "SLA Justificativas", path: "/justificativas", icon: Scale, slug: "justificativas" },
    { name: "Matriz Analitica", path: "/matriz-analitica", icon: Grid3X3, slug: "matriz-analitica" },
    { name: "Motor de Agenda", path: "/agenda-motor", icon: CalendarDays, slug: "agenda-motor" },
    { name: "Anamnese", path: "/anamnese", icon: ClipboardList, slug: "anamnese" },
    { name: "Validação", path: "/validacao", icon: CheckSquare, slug: "validacao" },
    { name: "Filas", path: "/filas", icon: ListOrdered, slug: "filas" },
    { name: "Pacientes", path: "/pacientes", icon: Users, slug: "pacientes" },
    { name: "Itens Terapêuticos", path: "/itens-terapeuticos", icon: Pill, slug: "itens-terapeuticos" },
    { name: "Protocolos", path: "/protocolos", icon: BookOpen, slug: "protocolos" },
    { name: "Follow-up", path: "/followup", icon: CalendarClock, slug: "followup" },
    { name: "Financeiro", path: "/financeiro", icon: CreditCard, slug: "financeiro" },
    { name: "Unidades", path: "/unidades", icon: Building2, slug: "unidades" },
    { name: "Fluxos Aprovacao", path: "/fluxos", icon: GitBranch, slug: "fluxos" },
    { name: "Pedidos de Exame", path: "/pedidos-exame", icon: FileText, slug: "pedidos-exame" },
    { name: "Exames (Catalogo)", path: "/exames", icon: FlaskConical, slug: "exames" },
    { name: "Substancias", path: "/substancias", icon: FlaskConical, slug: "substancias" },
    { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, slug: "agenda" },
    { name: "RAS", path: "/ras", icon: FileCheck, slug: "ras" },
    { name: "Codigos Validacao", path: "/codigos-validacao", icon: KeyRound, slug: "codigos-validacao" },
    { name: "Estoque", path: "/estoque", icon: Package, slug: "estoque" },
    { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, slug: "avaliacao-enfermagem" },
    { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, slug: "task-cards" },
    { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, slug: "ras-evolutivo" },
    { name: "Catalogo Pawards", path: "/catalogo", icon: Database, slug: "catalogo" },
    { name: "Permissoes", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
    { name: "Seguranca", path: "/seguranca", icon: Lock, slug: "seguranca" },
    { name: "Delegacao", path: "/delegacao", icon: Send, slug: "delegacao" },
    { name: "Colaboradores & RH", path: "/colaboradores", icon: UserCheck, slug: "colaboradores" },
    { name: "Agentes Virtuais", path: "/agentes-virtuais", icon: Bot, slug: "agentes-virtuais" },
    { name: "Lembretes Falhas", path: "/lembretes-falhas", icon: BellRing, slug: "lembretes-falhas" },
    { name: "Mensagens", path: "/mensagens", icon: MessageSquareText, slug: "mensagens" },
    { name: "Acompanhamento", path: "/acompanhamento", icon: Diamond, slug: "acompanhamento" },
    { name: "Comissao & Metas", path: "/comissao", icon: DollarSign, slug: "comissao" },
    { name: "Comercial", path: "/comercial", icon: TrendingUp, slug: "comercial" },
    { name: "Dietas", path: "/dietas", icon: Apple, slug: "dietas" },
    { name: "Psicologia", path: "/psicologia", icon: Brain, slug: "psicologia" },
    { name: "Questionario Master", path: "/questionario-master", icon: ClipboardListIcon, slug: "questionario-master" },
    { name: "Consultorias", path: "/consultorias", icon: Building, slug: "consultorias" },
    { name: "Contratos", path: "/contratos", icon: FileSignature, slug: "contratos" },
    { name: "Configuracoes", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
    { name: "💧 Inundação Genesis", path: "/inundacao", icon: Database, slug: "inundacao" },
    { name: "🏛️ Blueprint Arquitetura", path: "/blueprint", icon: Building, slug: "blueprint" },
    { name: "📅 Agendas Profissionais", path: "/agendas", icon: CalendarDays, slug: "agendas" },
  ];

  const escopo = (user as any).escopo || "consultoria_master";
  const modulosPermitidos = VISIBILIDADE_POR_ESCOPO[escopo] || VISIBILIDADE_POR_ESCOPO.consultoria_master;
  const allowedItems = menuItems.filter(item => modulosPermitidos.includes(item.slug));
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
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace('_', ' ')}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
        </div>
        <ClinicSwitcher />
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2 text-[13px] transition-colors border-l-2 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-primary'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-transparent'
                }`}
              >
                <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.slug === "lembretes-falhas" && falhasLembrete > 0 ? (
                  <span
                    data-testid="badge-lembretes-falhas"
                    className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none"
                  >
                    {falhasLembrete > 99 ? "99+" : falhasLembrete}
                  </span>
                ) : null}
              </Link>
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
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
