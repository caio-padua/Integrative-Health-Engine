import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const consultoriasTable = pgTable("consultorias", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  responsavel: text("responsavel").notNull(),
  email: text("email"),
  telefone: text("telefone"),
  plano: text("plano", { enum: ["starter", "professional", "enterprise"] }).notNull().default("starter"),
  maxUnidades: text("max_unidades").notNull().default("3"),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConsultoriaSchema = createInsertSchema(consultoriasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertConsultoria = z.infer<typeof insertConsultoriaSchema>;
export type Consultoria = typeof consultoriasTable.$inferSelect;

export const VISIBILIDADE_POR_ESCOPO = {
  consultoria_master: [
    "dashboard", "painel-comando", "governanca", "anamnese", "validacao",
    "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
    "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
    "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
    "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
    "configuracoes", "delegacao"
  ],
  clinica_medico: [
    "anamnese", "validacao", "pacientes", "itens-terapeuticos",
    "pedidos-exame", "agenda", "ras", "ras-evolutivo", "followup"
  ],
  clinica_enfermeira: [
    "anamnese", "filas", "pacientes", "followup", "agenda",
    "estoque", "avaliacao-enfermagem", "task-cards"
  ],
  clinica_admin: [
    "anamnese", "filas", "pacientes", "followup", "agenda",
    "estoque", "avaliacao-enfermagem", "task-cards", "financeiro"
  ],
} as const;

export type EscopoVisibilidade = keyof typeof VISIBILIDADE_POR_ESCOPO;
