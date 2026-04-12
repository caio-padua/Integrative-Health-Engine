import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
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
  Send
} from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "painel-comando", "governanca", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao"
    ],
    consultor_campo: [
      "delegacao", "pacientes", "anamnese", "followup", "agenda",
      "task-cards", "filas", "avaliacao-enfermagem", "estoque"
    ],
    clinica_medico: [
      "anamnese", "validacao", "pacientes", "itens-terapeuticos",
      "pedidos-exame", "agenda", "ras", "ras-evolutivo", "followup", "delegacao"
    ],
    clinica_enfermeira: [
      "anamnese", "filas", "pacientes", "followup", "agenda",
      "estoque", "avaliacao-enfermagem", "task-cards", "delegacao"
    ],
    clinica_admin: [
      "anamnese", "filas", "pacientes", "followup", "agenda",
      "estoque", "avaliacao-enfermagem", "task-cards", "financeiro", "delegacao"
    ],
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, slug: "dashboard" },
    { name: "Painel de Comando", path: "/painel-comando", icon: Radar, slug: "painel-comando" },
    { name: "Governanca", path: "/governanca", icon: Shield, slug: "governanca" },
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
    { name: "Substancias", path: "/substancias", icon: FlaskConical, slug: "substancias" },
    { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, slug: "agenda" },
    { name: "RAS", path: "/ras", icon: FileCheck, slug: "ras" },
    { name: "Codigos Validacao", path: "/codigos-validacao", icon: KeyRound, slug: "codigos-validacao" },
    { name: "Estoque", path: "/estoque", icon: Package, slug: "estoque" },
    { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, slug: "avaliacao-enfermagem" },
    { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, slug: "task-cards" },
    { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, slug: "ras-evolutivo" },
    { name: "Catalogo PADCOM", path: "/catalogo", icon: Database, slug: "catalogo" },
    { name: "Permissoes", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
    { name: "Seguranca", path: "/seguranca", icon: Lock, slug: "seguranca" },
    { name: "Delegacao", path: "/delegacao", icon: Send, slug: "delegacao" },
    { name: "Configuracoes", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
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
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight uppercase">Motor Clínico</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">PADCOM V15.2</span>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace('_', ' ')}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.path);
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
                {item.name}
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
