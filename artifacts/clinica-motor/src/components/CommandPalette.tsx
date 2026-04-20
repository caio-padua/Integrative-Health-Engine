import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, ClipboardList, CheckSquare, ListOrdered, Stethoscope,
  CalendarDays, CalendarClock, MessageSquareText, AtSign, Pill, BookOpen,
  CreditCard, Package, Building2, Settings, FileText, Heart, GitBranch,
  ShieldCheck, FlaskConical, FileCheck, Sparkles,
} from "lucide-react";
import { useSound } from "@/hooks/useSound";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: any;
  path: string;
  keywords?: string;
};

const COMANDOS: Cmd[] = [
  // ── Núcleo Clínico ──
  { id: "nav:dashboard",           label: "Dashboard",                    hint: "Visão geral",        group: "Núcleo Clínico",  icon: LayoutDashboard, path: "/dashboard",          keywords: "home início painel" },
  { id: "nav:pacientes",           label: "Pacientes",                    hint: "Cadastro completo",  group: "Núcleo Clínico",  icon: Users,           path: "/pacientes",          keywords: "paciente cliente" },
  { id: "nav:anamnese",            label: "Anamneses",                    hint: "Listagem",           group: "Núcleo Clínico",  icon: ClipboardList,   path: "/anamnese",           keywords: "questionário entrevista" },
  { id: "nav:anamnese-nova",       label: "Nova Anamnese",                hint: "Criar",              group: "Núcleo Clínico",  icon: Sparkles,        path: "/anamnese/nova",      keywords: "nova anamnese criar" },
  { id: "nav:validacao",           label: "Validação",                    hint: "Aprovar protocolos", group: "Núcleo Clínico",  icon: CheckSquare,     path: "/validacao",          keywords: "aprovar revisar" },
  { id: "nav:filas",               label: "Filas",                        hint: "Workflow ativo",     group: "Núcleo Clínico",  icon: ListOrdered,     path: "/filas",              keywords: "fila workflow tarefa" },
  { id: "nav:sessoes",             label: "Sessões Clínicas",             hint: "Atendimentos",       group: "Núcleo Clínico",  icon: Stethoscope,     path: "/sessoes",            keywords: "sessão atendimento consulta" },

  // ── Agenda & Comunicação ──
  { id: "nav:agenda",              label: "Agenda Semanal",               hint: "7 dias",             group: "Agenda & Comunicação", icon: CalendarDays,     path: "/agenda",        keywords: "agenda semana horário" },
  { id: "nav:followup",            label: "Follow-up",                    hint: "Próximos contatos",  group: "Agenda & Comunicação", icon: CalendarClock,    path: "/followup",      keywords: "retorno acompanhar" },
  { id: "nav:mensagens",           label: "Mensageria",                   hint: "Catálogo Opus",      group: "Agenda & Comunicação", icon: MessageSquareText, path: "/mensagens",    keywords: "mensagem whatsapp opus" },
  { id: "nav:identidade-emails",   label: "Identidade de E-mails",        hint: "@padwards.com.br",   group: "Agenda & Comunicação", icon: AtSign,           path: "/identidade-emails", keywords: "email zoho aliases" },

  // ── Catálogo & Estoque ──
  { id: "nav:itens-terapeuticos",  label: "Itens Terapêuticos",           hint: "Insumos",            group: "Catálogo & Estoque", icon: Pill,         path: "/itens-terapeuticos", keywords: "item insumo" },
  { id: "nav:protocolos",          label: "Protocolos",                   hint: "Receitas-padrão",    group: "Catálogo & Estoque", icon: BookOpen,     path: "/protocolos",         keywords: "protocolo receita" },
  { id: "nav:catalogo",            label: "Catálogo",                     hint: "Substâncias",        group: "Catálogo & Estoque", icon: BookOpen,     path: "/catalogo",           keywords: "substância produto" },
  { id: "nav:estoque",             label: "Estoque",                      hint: "Inventário",         group: "Catálogo & Estoque", icon: Package,      path: "/estoque",            keywords: "estoque inventário" },

  // ── Financeiro & Fiscal ──
  { id: "nav:financeiro",          label: "Financeiro",                   hint: "Faturamento",        group: "Financeiro & Fiscal", icon: CreditCard,  path: "/financeiro",         keywords: "dinheiro caixa cobrança" },
  { id: "nav:painel-nfe",          label: "Painel NFe",                   hint: "Notas fiscais",      group: "Financeiro & Fiscal", icon: FileText,    path: "/painel-nfe",         keywords: "nfe nota fiscal" },
  { id: "nav:gateways",            label: "Gateways de Pagamento",        hint: "Mercado Pago, Pagar.me", group: "Financeiro & Fiscal", icon: CreditCard, path: "/gateways-pagamento", keywords: "gateway pagamento" },
  { id: "nav:credenciais-nfe",     label: "Credenciais NFe & Logo",       hint: "Certificado",        group: "Financeiro & Fiscal", icon: FileCheck,   path: "/credenciais-nfe",    keywords: "certificado pfx logo" },

  // ── Administração ──
  { id: "nav:unidades",            label: "Unidades",                     hint: "Clínicas",           group: "Administração", icon: Building2,        path: "/unidades",        keywords: "clínica unidade tenant" },
  { id: "nav:configuracoes",       label: "Configurações",                hint: "Sistema",            group: "Administração", icon: Settings,         path: "/configuracoes",   keywords: "configuração settings" },
  { id: "nav:fluxos",              label: "Fluxos",                       hint: "Automação",          group: "Administração", icon: GitBranch,        path: "/fluxos",          keywords: "fluxo workflow automação" },
  { id: "nav:permissoes",          label: "Permissões",                   hint: "RBAC",               group: "Administração", icon: ShieldCheck,      path: "/permissoes",      keywords: "permissão rbac perfil" },
  { id: "nav:laboratorio",         label: "Laboratório (Validação)",      hint: "Exames",             group: "Administração", icon: FlaskConical,     path: "/laboratorio/validacao", keywords: "laboratório exame validação" },
  { id: "nav:monetizar",           label: "Monetizar PADCON",             hint: "Eventos pay-per-use", group: "Administração", icon: Heart,           path: "/monetizar",       keywords: "dinheiro pay event monetização" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const sound = useSound();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          const novo = !v;
          if (novo) sound.open();
          return novo;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sound]);

  const grupos = COMANDOS.reduce<Record<string, Cmd[]>>((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group].push(c);
    return acc;
  }, {});

  const executar = (cmd: Cmd) => {
    sound.select();
    navigate(cmd.path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (v) sound.open(); }}>
      <CommandInput placeholder="Buscar comando, página, paciente… (Cmd/Ctrl+K)" />
      <CommandList className="max-h-[480px]">
        <CommandEmpty>Nada encontrado. Tente outra palavra.</CommandEmpty>
        {Object.entries(grupos).map(([grupo, items], idx) => (
          <div key={grupo}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={grupo}>
              {items.map((cmd) => {
                const I = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.hint ?? ""} ${cmd.keywords ?? ""}`}
                    onSelect={() => executar(cmd)}
                    className="cursor-pointer"
                  >
                    <I className="w-4 h-4 mr-2 text-[#1F4E5F]" />
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.hint && <span className="text-xs text-stone-400">{cmd.hint}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
      <div className="border-t border-stone-200 px-3 py-2 text-[10px] text-stone-400 flex items-center justify-between">
        <span>↵ executar · ↑↓ navegar · Esc fechar</span>
        <span className="font-mono">{COMANDOS.length} comandos</span>
      </div>
    </CommandDialog>
  );
}
