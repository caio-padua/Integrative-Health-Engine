import { pgTable, serial, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itensTerapeuticosTable = pgTable("itens_terapeuticos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria", { enum: ["formula", "injetavel_im", "injetavel_ev", "implante", "exame", "protocolo"] }).notNull(),
  subCategoria: text("sub_categoria"),
  codigoPadcom: text("codigo_padcom"),
  blocoId: text("bloco_id"),
  grau: text("grau"),
  viaUso: text("via_uso"),
  frequenciaBase: text("frequencia_base"),
  composicao: text("composicao"),
  posologia: text("posologia"),
  areaSemantica: text("area_semantica"),
  disponivel: boolean("disponivel").notNull().default(true),
  exigeValidacaoHumana: boolean("exige_validacao_humana").notNull().default(false),
  preco: real("preco"),
  tags: text("tags").array(),
  unidadeId: integer("unidade_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertItemTerapeuticoSchema = createInsertSchema(itensTerapeuticosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertItemTerapeutico = z.infer<typeof insertItemTerapeuticoSchema>;
export type ItemTerapeutico = typeof itensTerapeuticosTable.$inferSelect;
