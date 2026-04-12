import { pgTable, serial, text, integer, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unidadesTable } from "./unidades";
import { consultoriasTable } from "./consultorias";

export const MODELOS_COBRANCA = {
  full: {
    label: "Full (Mensalidade Fixa)",
    descricao: "Valor fixo mensal com acesso ilimitado aos modulos contratados",
    icone: "Shield",
    cor: "#8B5CF6",
  },
  pacote: {
    label: "Pacote (Creditos)",
    descricao: "Compra pacotes de demandas com desconto progressivo",
    icone: "Package",
    cor: "#F59E0B",
  },
  por_demanda: {
    label: "Por Demanda (Pay-per-use)",
    descricao: "Cobra por cada demanda resolvida, sem compromisso mensal",
    icone: "Zap",
    cor: "#22C55E",
  },
} as const;

export type ModeloCobranca = keyof typeof MODELOS_COBRANCA;

export const PRECO_DEMANDA_CLINICA = {
  verde: 50.00,
  amarela: 75.00,
  vermelha: 125.00,
} as const;

export const modulosSistemaTable = pgTable("modulos_sistema", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria", {
    enum: ["core", "comunicacao", "operacional", "avancado", "premium"]
  }).notNull().default("operacional"),
  precoMensal: numeric("preco_mensal", { precision: 10, scale: 2 }).notNull().default("0"),
  precoPorDemanda: numeric("preco_por_demanda", { precision: 10, scale: 2 }),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  icone: text("icone"),
  cor: text("cor"),
  funcionalidades: jsonb("funcionalidades").$type<string[]>(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModuloSistemaSchema = createInsertSchema(modulosSistemaTable).omit({ id: true, criadoEm: true });
export type InsertModuloSistema = z.infer<typeof insertModuloSistemaSchema>;
export type ModuloSistema = typeof modulosSistemaTable.$inferSelect;

export const contratoClinicaTable = pgTable("contrato_clinica", {
  id: serial("id").primaryKey(),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  consultoriaId: integer("consultoria_id").references(() => consultoriasTable.id),
  modeloCobranca: text("modelo_cobranca", { enum: ["full", "pacote", "por_demanda"] }).notNull().default("por_demanda"),
  valorMensalFixo: numeric("valor_mensal_fixo", { precision: 10, scale: 2 }),
  creditosDemandas: integer("creditos_demandas"),
  creditosUsados: integer("creditos_usados").notNull().default(0),
  valorOnboarding: numeric("valor_onboarding", { precision: 10, scale: 2 }),
  onboardingPago: boolean("onboarding_pago").notNull().default(false),
  status: text("status", { enum: ["ativo", "suspenso", "cancelado", "trial"] }).notNull().default("trial"),
  dataInicio: timestamp("data_inicio", { withTimezone: true }).notNull().defaultNow(),
  dataFim: timestamp("data_fim", { withTimezone: true }),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContratoClinicaSchema = createInsertSchema(contratoClinicaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertContratoClinica = z.infer<typeof insertContratoClinicaSchema>;
export type ContratoClinica = typeof contratoClinicaTable.$inferSelect;

export const modulosContratadosTable = pgTable("modulos_contratados", {
  id: serial("id").primaryKey(),
  contratoId: integer("contrato_id").notNull().references(() => contratoClinicaTable.id),
  moduloId: integer("modulo_id").notNull().references(() => modulosSistemaTable.id),
  ativo: boolean("ativo").notNull().default(true),
  valorCustomizado: numeric("valor_customizado", { precision: 10, scale: 2 }),
  ativadoEm: timestamp("ativado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModuloContratadoSchema = createInsertSchema(modulosContratadosTable).omit({ id: true, ativadoEm: true });
export type InsertModuloContratado = z.infer<typeof insertModuloContratadoSchema>;
export type ModuloContratado = typeof modulosContratadosTable.$inferSelect;

export const faturamentoMensalTable = pgTable("faturamento_mensal", {
  id: serial("id").primaryKey(),
  contratoId: integer("contrato_id").notNull().references(() => contratoClinicaTable.id),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  valorModulos: numeric("valor_modulos", { precision: 10, scale: 2 }).notNull().default("0"),
  valorDemandas: numeric("valor_demandas", { precision: 10, scale: 2 }).notNull().default("0"),
  totalDemandasVerdes: integer("total_demandas_verdes").notNull().default(0),
  totalDemandasAmarelas: integer("total_demandas_amarelas").notNull().default(0),
  totalDemandasVermelhas: integer("total_demandas_vermelhas").notNull().default(0),
  valorTotal: numeric("valor_total", { precision: 10, scale: 2 }).notNull().default("0"),
  custoConsultores: numeric("custo_consultores", { precision: 10, scale: 2 }).notNull().default("0"),
  lucroEstimado: numeric("lucro_estimado", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["aberto", "faturado", "pago", "atrasado", "cancelado"] }).notNull().default("aberto"),
  dataVencimento: timestamp("data_vencimento", { withTimezone: true }),
  dataPagamento: timestamp("data_pagamento", { withTimezone: true }),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFaturamentoMensalSchema = createInsertSchema(faturamentoMensalTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFaturamentoMensal = z.infer<typeof insertFaturamentoMensalSchema>;
export type FaturamentoMensal = typeof faturamentoMensalTable.$inferSelect;

export const CATALOGO_MODULOS = [
  {
    codigo: "MSG_WHATSAPP",
    nome: "Mensagens WhatsApp",
    descricao: "Envio automatizado de mensagens via WhatsApp para pacientes (lembretes, follow-up, orientacoes)",
    categoria: "comunicacao" as const,
    precoMensal: "350.00",
    precoPorDemanda: "5.00",
    icone: "MessageCircle",
    cor: "#25D366",
    funcionalidades: ["Lembretes automaticos", "Follow-up pos-consulta", "Orientacoes de preparo", "Confirmacao de agenda"],
    ordem: 1,
  },
  {
    codigo: "CONSULTOR_REMOTO",
    nome: "Consultor Remoto (Home Office)",
    descricao: "Consultor dedicado em home office para atender demandas da clinica remotamente",
    categoria: "premium" as const,
    precoMensal: "1800.00",
    precoPorDemanda: "45.00",
    icone: "Headphones",
    cor: "#8B5CF6",
    funcionalidades: ["Atendimento remoto", "Triagem de demandas", "Orientacao de equipe", "Relatorios semanais"],
    ordem: 2,
  },
  {
    codigo: "FOLLOWUP_ATIVO",
    nome: "Follow-up Ativo",
    descricao: "Acompanhamento proativo de pacientes com ligacoes, mensagens e monitoramento de adesao",
    categoria: "operacional" as const,
    precoMensal: "500.00",
    precoPorDemanda: "12.00",
    icone: "PhoneCall",
    cor: "#3B82F6",
    funcionalidades: ["Ligacao de follow-up", "Checagem de adesao", "Alerta de risco", "Relatorio de evolucao"],
    ordem: 3,
  },
  {
    codigo: "VALIDACAO_MOTOR",
    nome: "Motor de Validacao Clinica",
    descricao: "Sistema inteligente de sugestoes terapeuticas com validacao por profissional qualificado",
    categoria: "avancado" as const,
    precoMensal: "800.00",
    precoPorDemanda: "20.00",
    icone: "ShieldCheck",
    cor: "#EF4444",
    funcionalidades: ["Sugestoes automaticas", "Validacao farmaceutica", "Alertas de interacao", "Protocolos clinicos"],
    ordem: 4,
  },
  {
    codigo: "TREINAMENTO_EQUIPE",
    nome: "Treinamento de Equipe",
    descricao: "Capacitacao continua da equipe da clinica nos processos e protocolos PADCOM",
    categoria: "operacional" as const,
    precoMensal: "400.00",
    precoPorDemanda: "30.00",
    icone: "GraduationCap",
    cor: "#F59E0B",
    funcionalidades: ["Treinamento inicial", "Reciclagem mensal", "Material didatico", "Certificacao interna"],
    ordem: 5,
  },
  {
    codigo: "GESTAO_ESTOQUE",
    nome: "Gestao de Estoque",
    descricao: "Controle de estoque de insumos, substancias e materiais com alertas de reposicao",
    categoria: "operacional" as const,
    precoMensal: "250.00",
    precoPorDemanda: null,
    icone: "Package",
    cor: "#10B981",
    funcionalidades: ["Controle de lotes", "Alerta de validade", "Pedido automatico", "Relatorio de consumo"],
    ordem: 6,
  },
  {
    codigo: "RELATORIOS_BI",
    nome: "Relatorios e BI",
    descricao: "Dashboards avancados, relatorios gerenciais e business intelligence para tomada de decisao",
    categoria: "avancado" as const,
    precoMensal: "600.00",
    precoPorDemanda: null,
    icone: "BarChart3",
    cor: "#6366F1",
    funcionalidades: ["Dashboard personalizado", "Exportacao PDF", "KPIs automaticos", "Comparativo mensal"],
    ordem: 7,
  },
  {
    codigo: "AGENDA_INTELIGENTE",
    nome: "Agenda Inteligente",
    descricao: "Gestao de agenda com otimizacao de horarios, confirmacao automatica e lista de espera",
    categoria: "core" as const,
    precoMensal: "200.00",
    precoPorDemanda: null,
    icone: "Calendar",
    cor: "#EC4899",
    funcionalidades: ["Confirmacao automatica", "Lista de espera", "Otimizacao de horarios", "Integracao Google Calendar"],
    ordem: 8,
  },
] as const;
