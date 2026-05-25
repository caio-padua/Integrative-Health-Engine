export type Item = { label: string };
export type Group = { title: string; color: string; items: Item[] };

export const PINS = [
  { label: "Prescrição", icon: "✎" },
  { label: "Anamnese", icon: "≡" },
  { label: "Pacientes", icon: "◉" },
  { label: "Agenda", icon: "▦" },
];

export const GROUPS: Group[] = [
  {
    title: "DASHBOARD GLOBAL",
    color: "#5EE6E6",
    items: [
      { label: "Visão Geral" },
      { label: "Painel de Comando" },
      { label: "Som Ligado" },
      { label: "Segurança 2FA" },
      { label: "Sair" },
    ],
  },
  {
    title: "DASHBOARD LOCAL",
    color: "#22D3A6",
    items: [
      { label: "Pulso Diário" },
      { label: "Pacientes Ativos" },
      { label: "Atrasados" },
      { label: "Fila SLA" },
      { label: "Demandas Abertas" },
      { label: "Receita do Mês" },
    ],
  },
  {
    title: "AGENDAS & MOTOR",
    color: "#F59E0B",
    items: [
      { label: "Agenda Mestre" },
      { label: "Sub-Agendas" },
      { label: "Slots Disponíveis" },
      { label: "Motor Comercial" },
      { label: "Pagamentos" },
      { label: "Comissões" },
      { label: "Reagendamentos" },
    ],
  },
  {
    title: "CLÍNICA & PACIENTES",
    color: "#D4AF37",
    items: [
      { label: "Pacientes" },
      { label: "Anamnese" },
      { label: "Prescrição" },
      { label: "Cockpit Paciente" },
      { label: "Exames Evolução" },
      { label: "Protocolos Ativos" },
      { label: "Follow-up" },
      { label: "Termos LGPD" },
    ],
  },
  {
    title: "CATÁLOGOS GLOBAIS",
    color: "#A78BFA",
    items: [
      { label: "Fórmulas Magistrais" },
      { label: "Injetáveis" },
      { label: "Implantes" },
      { label: "Catálogo Exames" },
      { label: "Doenças" },
      { label: "Substâncias" },
      { label: "Códigos Semânticos" },
    ],
  },
  {
    title: "ESTRUTURA & RH",
    color: "#F87171",
    items: [
      { label: "Unidades" },
      { label: "Colaboradores" },
      { label: "Cargos" },
      { label: "Perfis & Permissões" },
      { label: "Auditoria" },
      { label: "Termos Legais" },
      { label: "Fluxos de Aprovação" },
      { label: "Agentes Virtuais" },
    ],
  },
];
