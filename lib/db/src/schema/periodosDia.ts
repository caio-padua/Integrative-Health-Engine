import { pgTable, serial, integer, text, time, timestamp } from "drizzle-orm/pg-core";

export const periodosDiaTable = pgTable("periodos_dia", {
  id: serial("id").primaryKey(),
  ordem: integer("ordem").notNull().unique(),
  sigla: text("sigla").notNull().unique(),
  nome: text("nome").notNull(),
  janelaInicio: time("janela_inicio").notNull(),
  janelaFim: time("janela_fim").notNull(),
  emoji: text("emoji"),
  corHex: text("cor_hex"),
  descricao: text("descricao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type PeriodoDia = typeof periodosDiaTable.$inferSelect;

export const PERIODOS_DIA_SIGLAS = ["J", "IM", "MM", "AL", "T", "IN", "N", "NF", "C"] as const;
export type SiglaPeriodoDia = typeof PERIODOS_DIA_SIGLAS[number];
