import { pgTable, serial, integer, text, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { unidadesTable } from "./unidades";
import { whatsappMensagensLogTable } from "./whatsappConfig";

export type PrescricaoPeriodoTipo = "tomar" | "nao_tomar";

export interface PrescricaoFormulaJson {
  nome: string;
  ativoPrincipal?: string;
  dose?: string;
  horario?: string;
  observacaoRefeicao?: string;
  posologia?: string;
}

export interface PrescricaoPeriodoJson {
  nome: string;
  tipo: PrescricaoPeriodoTipo;
  formulas: PrescricaoFormulaJson[];
}

export const prescricoesLembreteTable = pgTable("prescricoes_lembrete", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  ativo: boolean("ativo").notNull().default(true),
  periodos: jsonb("periodos").notNull().$type<PrescricaoPeriodoJson[]>().default([]),
  horariosEnvio: jsonb("horarios_envio").notNull().$type<string[]>().default([]),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const prescricaoLembreteEnviosTable = pgTable(
  "prescricao_lembrete_envios",
  {
    id: serial("id").primaryKey(),
    prescricaoLembreteId: integer("prescricao_lembrete_id")
      .notNull()
      .references(() => prescricoesLembreteTable.id, { onDelete: "cascade" }),
    pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
    unidadeId: integer("unidade_id").references(() => unidadesTable.id),
    janela: text("janela").notNull(),
    status: text("status", { enum: ["PENDENTE", "ENVIADO", "FALHOU"] }).notNull(),
    erro: text("erro"),
    whatsappLogId: integer("whatsapp_log_id").references(() => whatsappMensagensLogTable.id),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    janelaUnq: uniqueIndex("prescricao_lembrete_envios_janela_unq").on(t.prescricaoLembreteId, t.janela),
  }),
);

export const insertPrescricaoLembreteSchema = createInsertSchema(prescricoesLembreteTable).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});
export type InsertPrescricaoLembrete = z.infer<typeof insertPrescricaoLembreteSchema>;
export type PrescricaoLembrete = typeof prescricoesLembreteTable.$inferSelect;

export const insertPrescricaoLembreteEnvioSchema = createInsertSchema(prescricaoLembreteEnviosTable).omit({
  id: true,
  enviadoEm: true,
});
export type InsertPrescricaoLembreteEnvio = z.infer<typeof insertPrescricaoLembreteEnvioSchema>;
export type PrescricaoLembreteEnvio = typeof prescricaoLembreteEnviosTable.$inferSelect;
