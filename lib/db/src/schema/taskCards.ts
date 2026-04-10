import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";

export const taskCardsTable = pgTable("task_cards", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id),
  pacienteId: integer("paciente_id").references(() => pacientesTable.id),
  assignedRole: text("assigned_role").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade").notNull().default("normal"),
  corAlerta: text("cor_alerta"),
  prazoHoras: integer("prazo_horas"),
  status: text("status").notNull().default("pendente"),
  concluidoEm: timestamp("concluido_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskCardSchema = createInsertSchema(taskCardsTable).omit({ id: true, criadoEm: true });
export type InsertTaskCard = z.infer<typeof insertTaskCardSchema>;
export type TaskCard = typeof taskCardsTable.$inferSelect;
