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
  ShieldCheck
} from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["validador_mestre"] },
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
    { name: "Permissoes", path: "/permissoes", icon: ShieldCheck, roles: ["validador_mestre"] },
    { name: "Configuracoes", path: "/configuracoes", icon: Settings, roles: ["validador_mestre"] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.perfil));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Activity className="text-primary mr-2" />
          <span className="font-bold text-lg text-sidebar-foreground tracking-tight">Motor Clínico</span>
        </div>
        <div className="p-4 border-b border-border">
          <div className="text-sm font-medium text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-xs text-sidebar-foreground/60 capitalize">{user.perfil.replace('_', ' ')}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path} className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={logout}>
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
