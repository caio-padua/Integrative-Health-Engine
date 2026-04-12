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
  Lock
} from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["validador_mestre"] },
    { name: "Governanca", path: "/governanca", icon: Shield, roles: ["validador_mestre", "medico_tecnico"] },
    { name: "Anamnese", path: "/anamnese", icon: ClipboardList, roles: ["enfermeira", "validador_enfermeiro", "medico_tecnico", "validador_mestre"] },
    { name: "Validação", path: "/validacao", icon: CheckSquare, roles: ["validador_enfermeiro", "medico_tecnico", "validador_mestre"] },
    { name: "Filas", path: "/filas", icon: ListOrdered, roles: ["enfermeira", "validador_enfermeiro", "validador_mestre"] },
    { name: "Pacientes", path: "/pacientes", icon: Users, roles: ["enfermeira", "validador_mestre"] },
    { name: "Itens Terapêuticos", path: "/itens-terapeuticos", icon: Pill, roles: ["medico_tecnico", "validador_mestre"] },
    { name: "Protocolos", path: "/protocolos", icon: BookOpen, roles: ["medico_tecnico", "validador_mestre"] },
    { name: "Follow-up", path: "/followup", icon: CalendarClock, roles: ["enfermeira", "validador_enfermeiro", "validador_mestre"] },
    { name: "Financeiro", path: "/financeiro", icon: CreditCard, roles: ["validador_mestre"] },
    { name: "Unidades", path: "/unidades", icon: Building2, roles: ["validador_mestre"] },
    { name: "Fluxos Aprovacao", path: "/fluxos", icon: GitBranch, roles: ["validador_mestre", "medico_tecnico"] },
    { name: "Pedidos de Exame", path: "/pedidos-exame", icon: FileText, roles: ["medico_tecnico", "validador_mestre"] },
    { name: "Substancias", path: "/substancias", icon: FlaskConical, roles: ["medico_tecnico", "validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, roles: ["medico_tecnico", "validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "RAS", path: "/ras", icon: FileCheck, roles: ["medico_tecnico", "validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "Codigos Validacao", path: "/codigos-validacao", icon: KeyRound, roles: ["medico_tecnico", "validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "Estoque", path: "/estoque", icon: Package, roles: ["validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, roles: ["enfermeira", "validador_enfermeiro", "validador_mestre"] },
    { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, roles: ["enfermeira", "validador_enfermeiro", "medico_tecnico", "validador_mestre"] },
    { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, roles: ["medico_tecnico", "validador_mestre", "enfermeira", "validador_enfermeiro"] },
    { name: "Catalogo PADCOM", path: "/catalogo", icon: Database, roles: ["medico_tecnico", "validador_mestre"] },
    { name: "Permissoes", path: "/permissoes", icon: ShieldCheck, roles: ["validador_mestre"] },
    { name: "Seguranca", path: "/seguranca", icon: Lock, roles: ["validador_mestre"] },
    { name: "Configuracoes", path: "/configuracoes", icon: Settings, roles: ["validador_mestre"] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.perfil));

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
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
