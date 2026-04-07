import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { unidadesTable } from "./unidades";

export const filasTable = pgTable("filas_operacionais", {
  id: serial("id").primaryKey(),
  tipo: text("tipo", { enum: ["anamnese", "validacao", "procedimento", "followup", "pagamento"] }).notNull(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta", "urgente"] }).notNull().default("media"),
  status: text("status").notNull().default("aguardando"),
  responsavelId: integer("responsavel_id"),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  prazo: timestamp("prazo", { withTimezone: true }),
  referenciaId: integer("referencia_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilaSchema = createInsertSchema(filasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFila = z.infer<typeof insertFilaSchema>;
export type Fila = typeof filasTable.$inferSelect;
