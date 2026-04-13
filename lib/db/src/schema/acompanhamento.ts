import { pgTable, serial, text, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";
import { unidadesTable } from "./unidades";

export const PLANOS_ACOMPANHAMENTO = {
  diamante: {
    nome: "Diamante",
    cor: "#B9F2FF",
    slaRespostaHoras: 4,
    ligacaoDiaria: true,
    atendimentoSemanalOnline: true,
    followupAtivo: true,
    prioridade: 1,
    descricao: "Acompanhamento VIP máximo: ligação diária, resposta em 4h, atendimento semanal online, follow-up ativo contínuo",
  },
  ouro: {
    nome: "Ouro",
    cor: "#FFD700",
    slaRespostaHoras: 12,
    ligacaoDiaria: false,
    atendimentoSemanalOnline: true,
    followupAtivo: true,
    prioridade: 2,
    descricao: "Acompanhamento premium: resposta em 12h, atendimento semanal online, follow-up ativo semanal",
  },
  prata: {
    nome: "Prata",
    cor: "#C0C0C0",
    slaRespostaHoras: 24,
    ligacaoDiaria: false,
    atendimentoSemanalOnline: false,
    followupAtivo: true,
    prioridade: 3,
    descricao: "Acompanhamento padrão: resposta em 24h, follow-up quinzenal, sem atendimento semanal online",
  },
  cobre: {
    nome: "Cobre",
    cor: "#B87333",
    slaRespostaHoras: 72,
    ligacaoDiaria: false,
    atendimentoSemanalOnline: false,
    followupAtivo: false,
    prioridade: 4,
    descricao: "Acompanhamento básico: orientações apenas em consulta presencial/online agendada, sem follow-up ativo",
  },
} as const;

export type PlanoAcompanhamento = keyof typeof PLANOS_ACOMPANHAMENTO;

export const demandasServicoTable = pgTable("demandas_servico", {
  id: serial("id").primaryKey(),
  consultorId: integer("consultor_id").notNull().references(() => usuariosTable.id),
  pacienteId: integer("paciente_id").references(() => pacientesTable.id),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  tipo: text("tipo", {
    enum: ["resposta_paciente", "ligacao_followup", "orientacao_equipe", "treinamento", "revisao_prontuario", "avaliacao_presencial", "relatorio", "outro"]
  }).notNull(),
  complexidade: text("complexidade", { enum: ["verde", "amarela", "vermelha"] }).notNull().default("verde"),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tempoGastoMin: integer("tempo_gasto_min"),
  status: text("status", { enum: ["aberta", "em_atendimento", "concluida", "cancelada"] }).notNull().default("aberta"),
  planoOrigem: text("plano_origem", { enum: ["diamante", "ouro", "prata", "cobre"] }),
  delegacaoId: integer("delegacao_id"),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDemandaServicoSchema = createInsertSchema(demandasServicoTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertDemandaServico = z.infer<typeof insertDemandaServicoSchema>;
export type DemandaServico = typeof demandasServicoTable.$inferSelect;

export const CUSTO_POR_COMPLEXIDADE = {
  verde: { label: "Simples", multiplicador: 1.0, corHex: "#22C55E" },
  amarela: { label: "Moderada", multiplicador: 1.5, corHex: "#EAB308" },
  vermelha: { label: "Complexa", multiplicador: 2.5, corHex: "#EF4444" },
} as const;

export const REMUNERACAO_CONSULTOR = {
  salarioFixo: 1412.00,
  comissaoPorComplexidade: {
    verde: 15.00,
    amarela: 25.00,
    vermelha: 50.00,
  },
  metaMensal: 40,
  faixasMeta: [
    { pct: 25, bonus: 0.05, label: "Bronze", cor: "#B87333", descricao: "Atingiu 25% da meta" },
    { pct: 50, bonus: 0.10, label: "Prata", cor: "#C0C0C0", descricao: "Atingiu 50% da meta" },
    { pct: 75, bonus: 0.20, label: "Ouro", cor: "#FFD700", descricao: "Atingiu 75% da meta" },
    { pct: 100, bonus: 0.35, label: "Diamante", cor: "#B9F2FF", descricao: "Meta completa! Bônus máximo" },
  ],
} as const;

export const metasConsultorTable = pgTable("metas_consultor", {
  id: serial("id").primaryKey(),
  consultorId: integer("consultor_id").notNull().references(() => usuariosTable.id),
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  metaDemandas: integer("meta_demandas").notNull().default(40),
  demandasConcluidas: integer("demandas_concluidas").notNull().default(0),
  comissaoAcumulada: numeric("comissao_acumulada", { precision: 10, scale: 2 }).notNull().default("0"),
  bonusFaixa: numeric("bonus_faixa", { precision: 10, scale: 2 }).notNull().default("0"),
  totalBruto: numeric("total_bruto", { precision: 10, scale: 2 }).notNull().default("0"),
  faixaAtingida: text("faixa_atingida", { enum: ["nenhuma", "bronze", "prata", "ouro", "diamante"] }).notNull().default("nenhuma"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
