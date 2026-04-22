import { pgTable, serial, text, integer, real, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const substanciasTable = pgTable("substancias", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  abreviacao: text("abreviacao"),
  codigoSemantico: text("codigo_semantico"),
  categoria: text("categoria").notNull(),
  categoriaDetalhada: text("categoria_detalhada"),
  cor: text("cor").notNull().default("#3B82F6"),
  dosePadrao: text("dose_padrao"),
  unidadeDose: text("unidade_dose"),
  via: text("via").notNull().default("iv"),
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  precoReferencia: real("preco_referencia"),
  maxSessoesPorSemana: integer("max_sessoes_por_semana"),
  intervaloDias: integer("intervalo_dias"),
  estoqueQuantidade: real("estoque_quantidade").notNull().default(0),
  estoqueUnidade: text("estoque_unidade"),
  descricao: text("descricao"),
  funcaoPrincipal: text("funcao_principal"),
  efeitosPercebidos: text("efeitos_percebidos"),
  tempoParaEfeito: text("tempo_para_efeito"),
  classificacaoEstrelas: integer("classificacao_estrelas").notNull().default(5),
  efeitosSistemasCorporais: jsonb("efeitos_sistemas_corporais").default({}),
  beneficioLongevidade: text("beneficio_longevidade"),
  impactoQualidadeVida: text("impacto_qualidade_vida"),
  beneficioSono: text("beneficio_sono"),
  beneficioEnergia: text("beneficio_energia"),
  beneficioLibido: text("beneficio_libido"),
  performanceFisica: text("performance_fisica"),
  forcaMuscular: text("forca_muscular"),
  clarezaMental: text("clareza_mental"),
  peleCabeloUnhas: text("pele_cabelo_unhas"),
  suporteImunologico: text("suporte_imunologico"),
  contraindicacoes: text("contraindicacoes"),
  evidenciaCientifica: text("evidencia_cientifica"),
  notas: text("notas"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  controlado: boolean("controlado").notNull().default(false),
  tipoReceitaAnvisaCodigo: text("tipo_receita_anvisa_codigo"),
  farmaciaPadrao: text("farmacia_padrao"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertSubstanciaSchema = createInsertSchema(substanciasTable).omit({ id: true, criadoEm: true, deletedAt: true });
export type InsertSubstancia = z.infer<typeof insertSubstanciaSchema>;
export type Substancia = typeof substanciasTable.$inferSelect;
