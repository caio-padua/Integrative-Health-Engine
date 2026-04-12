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
