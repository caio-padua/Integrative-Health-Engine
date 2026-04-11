import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";
import { pacientesTable } from "./pacientes";

export const eventosClinicosTable = pgTable("eventos_clinicos", {
  id: serial("id").primaryKey(),
  tipo: text("tipo", {
    enum: [
      "CONFIGURACAO_ALTERADA",
      "VALIDACAO_CASCATA",
      "SOBERANIA_TOGGLE",
      "CONFIANCA_DELEGADA",
      "FILA_PRECEPTOR",
      "HOMOLOGACAO",
      "DEVOLUCAO",
      "ESCALA_ALTERADA",
      "LOGIN",
      "ACAO_CLINICA",
    ],
  }).notNull(),
  descricao: text("descricao").notNull(),
  usuarioId: integer("usuario_id").references(() => usuariosTable.id),
  pacienteId: integer("paciente_id").references(() => pacientesTable.id),
  entidadeTipo: text("entidade_tipo"),
  entidadeId: integer("entidade_id"),
  metadados: text("metadados"),
  ip: text("ip"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventoClinicoSchema = createInsertSchema(eventosClinicosTable).omit({ id: true, criadoEm: true });
export type InsertEventoClinico = z.infer<typeof insertEventoClinicoSchema>;
export type EventoClinico = typeof eventosClinicosTable.$inferSelect;

export const soberaniaConfigTable = pgTable("soberania_config", {
  id: serial("id").primaryKey(),
  validacaoSupremaAtiva: boolean("validacao_suprema_ativa").notNull().default(true),
  prazoHomologacaoHoras: integer("prazo_homologacao_horas").notNull().default(48),
  alteradoPorId: integer("alterado_por_id").notNull().references(() => usuariosTable.id),
  motivo: text("motivo", { enum: ["VIAGEM", "FERIAS", "CONFIANCA", "EMERGENCIA", "OUTRO"] }).notNull(),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSoberaniaConfigSchema = createInsertSchema(soberaniaConfigTable).omit({ id: true, criadoEm: true });
export type InsertSoberaniaConfig = z.infer<typeof insertSoberaniaConfigSchema>;
export type SoberaniaConfig = typeof soberaniaConfigTable.$inferSelect;

export const profissionalConfiancaTable = pgTable("profissional_confianca", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").notNull().references(() => usuariosTable.id),
  confiancaDelegada: boolean("confianca_delegada").notNull().default(false),
  delegadoPorId: integer("delegado_por_id").notNull().references(() => usuariosTable.id),
  observacao: text("observacao"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfissionalConfiancaSchema = createInsertSchema(profissionalConfiancaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertProfissionalConfianca = z.infer<typeof insertProfissionalConfiancaSchema>;
export type ProfissionalConfianca = typeof profissionalConfiancaTable.$inferSelect;

export const filaPreceptorTable = pgTable("fila_preceptor", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull(),
  tipoCaso: text("tipo_caso", { enum: ["PROTOCOLO", "PRESCRICAO", "EXAME", "FORMULA", "INJETAVEL", "IMPLANTE"] }).notNull(),
  assistenteId: integer("assistente_id").notNull().references(() => usuariosTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  supervisorValidouId: integer("supervisor_validou_id").references(() => usuariosTable.id),
  supervisorValidouEm: timestamp("supervisor_validou_em", { withTimezone: true }),
  observacaoSupervisor: text("observacao_supervisor"),
  status: text("status", { enum: ["AGUARDANDO", "HOMOLOGADO", "DEVOLVIDO", "VENCIDO"] }).notNull().default("AGUARDANDO"),
  prazoHomologacao: timestamp("prazo_homologacao", { withTimezone: true }),
  homologadoPorId: integer("homologado_por_id").references(() => usuariosTable.id),
  homologadoEm: timestamp("homologado_em", { withTimezone: true }),
  observacaoDiretor: text("observacao_diretor"),
  motivoDevolucao: text("motivo_devolucao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilaPreceptorSchema = createInsertSchema(filaPreceptorTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFilaPreceptor = z.infer<typeof insertFilaPreceptorSchema>;
export type FilaPreceptor = typeof filaPreceptorTable.$inferSelect;
