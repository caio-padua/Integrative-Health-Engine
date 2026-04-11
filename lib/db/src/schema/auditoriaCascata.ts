import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";

export const auditoriaCascataTable = pgTable("auditoria_cascata", {
  id: serial("id").primaryKey(),
  acao: text("acao", { enum: ["LIGOU", "DESLIGOU", "ALTEROU"] }).notNull(),
  etapa: text("etapa", { enum: ["ENFERMEIRA03", "CONSULTOR03", "MEDICO03", "MEDICO_SENIOR"] }),
  valorAnterior: boolean("valor_anterior"),
  valorNovo: boolean("valor_novo"),
  realizadoPorId: integer("realizado_por_id").notNull().references(() => usuariosTable.id),
  motivo: text("motivo"),
  realizadoEm: timestamp("realizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditoriaCascataSchema = createInsertSchema(auditoriaCascataTable).omit({ id: true, realizadoEm: true });
export type InsertAuditoriaCascata = z.infer<typeof insertAuditoriaCascataSchema>;
export type AuditoriaCascata = typeof auditoriaCascataTable.$inferSelect;

export function formatarAcaoAuditoria(registro: AuditoriaCascata): string {
  const descricaoAcao = registro.acao === "LIGOU" ? "LIGOU" : registro.acao === "DESLIGOU" ? "DESLIGOU" : "ALTEROU";
  return `${descricaoAcao} ${registro.etapa ?? "GERAL"}`;
}
