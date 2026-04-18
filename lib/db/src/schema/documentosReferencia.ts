import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CATEGORIAS_DOC_REF = [
  "MANIFESTO",
  "JURIDICO",
  "AGENTES",
  "FORMULAS",
  "ARQUITETURA",
  "RAS_EVOLUCAO",
  "IMPEDIMENTOS",
  "RECEITA_MODELO",
  "OUTROS",
] as const;
export type CategoriaDocRef = typeof CATEGORIAS_DOC_REF[number];

export const TIPOS_ORIGEM_DOC_REF = ["docx", "pdf", "xlsx", "md", "txt", "html"] as const;
export type TipoOrigemDocRef = typeof TIPOS_ORIGEM_DOC_REF[number];

export const AUTORIA_DOC_REF = [
  "DR_CLAUDE",
  "DR_MANUS",
  "DR_CHATGPT",
  "DR_REPLIT",
  "INSTITUTO_PADUA",
  "DESCONHECIDA",
] as const;
export type AutoriaDocRef = typeof AUTORIA_DOC_REF[number];

export const documentosReferenciaTable = pgTable(
  "documentos_referencia",
  {
    id: serial("id").primaryKey(),
    codigo: text("codigo").notNull().unique(),
    titulo: text("titulo").notNull(),
    categoria: text("categoria", { enum: CATEGORIAS_DOC_REF }).notNull(),
    tipoOrigem: text("tipo_origem", { enum: TIPOS_ORIGEM_DOC_REF }).notNull(),
    autoria: text("autoria", { enum: AUTORIA_DOC_REF }).notNull().default("DESCONHECIDA"),
    nomeArquivoOriginal: text("nome_arquivo_original").notNull(),
    conteudoCompleto: text("conteudo_completo").notNull(),
    bytes: integer("bytes").notNull(),
    tags: text("tags").array().notNull().default([]),
    metadados: jsonb("metadados").notNull().default({}),
    versao: integer("versao").notNull().default(1),
    b1: text("b1"),
    b2: text("b2"),
    b3: text("b3"),
    b4: text("b4"),
    seq: text("seq"),
    varianteAutor: text("variante_autor"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    catIdx: index("doc_ref_categoria_idx").on(t.categoria),
    autorIdx: index("doc_ref_autoria_idx").on(t.autoria),
  }),
);

export const insertDocumentoReferenciaSchema = createInsertSchema(documentosReferenciaTable).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});
export type InsertDocumentoReferencia = z.infer<typeof insertDocumentoReferenciaSchema>;
export type DocumentoReferencia = typeof documentosReferenciaTable.$inferSelect;
