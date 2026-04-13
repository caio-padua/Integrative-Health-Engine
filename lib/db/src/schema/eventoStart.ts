import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { tratamentosTable } from "./tratamentos";
import { usuariosTable } from "./usuarios";
import { unidadesTable } from "./unidades";

export const eventoStartTable = pgTable("evento_start", {
  id: serial("id").primaryKey(),

  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tratamentoId: integer("tratamento_id").notNull().references(() => tratamentosTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  medicoResponsavelId: integer("medico_responsavel_id").references(() => usuariosTable.id),

  snapshotCadastro: jsonb("snapshot_cadastro").notNull().default({}),

  modalidadesAtivas: jsonb("modalidades_ativas").notNull().default([]),

  cadernosRaclGerados: jsonb("cadernos_racl_gerados").notNull().default([]),
  cadernosRacjGerados: jsonb("cadernos_racj_gerados").notNull().default([]),

  pastaProtocolosId: text("pasta_protocolos_id"),
  pastaJuridicoId: text("pasta_juridico_id"),

  statusEvento: text("status_evento", {
    enum: ["pendente", "processando", "concluido", "erro"]
  }).notNull().default("pendente"),

  juridicoEmitido: boolean("juridico_emitido").notNull().default(false),
  juridicoEmitidoEm: timestamp("juridico_emitido_em", { withTimezone: true }),

  observacoes: text("observacoes"),

  origem: text("origem").default("PADCOM_V15.2"),
  versaoSchema: text("versao_schema").default("1.0"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEventoStartSchema = createInsertSchema(eventoStartTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertEventoStart = z.infer<typeof insertEventoStartSchema>;
export type EventoStart = typeof eventoStartTable.$inferSelect;
