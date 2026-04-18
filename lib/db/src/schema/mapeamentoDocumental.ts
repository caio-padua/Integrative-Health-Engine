import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const STATUS_REIFICACAO = [
  "DORMENTE",
  "CLASSIFICADO",
  "EXTRAIDO",
  "MAPEADO",
  "ENCARNADO",
  "VALIDADO",
  "FALHOU",
] as const;
export type StatusReificacao = typeof STATUS_REIFICACAO[number];

export const mapeamentoDocumentalTable = pgTable(
  "mapeamento_documental",
  {
    id: serial("id").primaryKey(),
    documentoReferenciaId: integer("documento_referencia_id").notNull(),
    classificacao: text("classificacao").notNull(),
    tabelaDestino: text("tabela_destino").notNull(),
    chunksExtraidos: integer("chunks_extraidos").notNull().default(0),
    linhasInseridas: integer("linhas_inseridas").notNull().default(0),
    linhasAtualizadas: integer("linhas_atualizadas").notNull().default(0),
    status: text("status", { enum: STATUS_REIFICACAO }).notNull().default("DORMENTE"),
    detalhes: jsonb("detalhes").notNull().default({}),
    erro: text("erro"),
    executadoEm: timestamp("executado_em", { withTimezone: true }).notNull().defaultNow(),
    autorReificacao: text("autor_reificacao").notNull().default("DR_REPLIT_REIFICATION_ENGINE_V1"),
  },
  (t) => ({
    docIdx: index("map_doc_doc_idx").on(t.documentoReferenciaId),
    tabIdx: index("map_doc_tab_idx").on(t.tabelaDestino),
    statusIdx: index("map_doc_status_idx").on(t.status),
  }),
);

export type MapeamentoDocumental = typeof mapeamentoDocumentalTable.$inferSelect;
