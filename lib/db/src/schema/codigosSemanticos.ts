import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const codigosSemanticosTable = pgTable("codigos_semanticos", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  tipo: text("tipo").notNull(),
  procedimentoOuSignificado: text("procedimento_ou_significado").notNull(),
  origemLida: text("origem_lida"),
  grupoObs: text("grupo_obs"),
  prescricaoFormula: text("prescricao_formula"),
  injetavelIM: text("injetavel_im"),
  injetavelEV: text("injetavel_ev"),
  implante: text("implante"),
  exame: text("exame"),
  protocolo: text("protocolo"),
  dieta: text("dieta"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCodigoSemanticoSchema = createInsertSchema(codigosSemanticosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertCodigoSemantico = z.infer<typeof insertCodigoSemanticoSchema>;
export type CodigoSemantico = typeof codigosSemanticosTable.$inferSelect;
