/**
 * 📚 CATÁLOGO DE FARMÁCIA — Remédios industrializados, suplementos e seus Mazinhos
 * ──────────────────────────────────────────────────────────────────────────────
 * Cada item carrega não só o "como tomar" (via, dose, período, horário)
 * mas também os "como pode reagir" (efeitos colaterais 1-N).
 * Esses efeitos viram pista quando o paciente ABANDONA SILENCIOSAMENTE
 * uma substância em um período específico — o sistema cruza e direciona
 * a investigação no Card Filé Mastigado.
 *
 * Arquitetura irmã: 💧 linfonodos_paciente, 🔬 mapa_aderencia_celular
 * Cunhado por: Dr. Caio — abril/2026
 */
import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * 🩹 EFEITO COLATERAL ESTRUTURADO
 * Cada efeito carrega ordem + intensidade + texto.
 * Intensidades: primario · secundario · terciario · adicional (4º+)
 * Lido pelo Card Filé Mastigado para guiar a investigação SEM induzir resposta.
 */
export type EfeitoColateral = {
  ordem: number;
  intensidade: "primario" | "secundario" | "terciario" | "adicional";
  efeito: string;
};

export const remediosFarmaciaTable = pgTable("remedios_farmacia", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  marca: text("marca"),
  fabricante: text("fabricante"),
  classeTerapeutica: text("classe_terapeutica"),
  indicacao: text("indicacao"),
  formaFarmaceutica: text("forma_farmaceutica"),
  viaAdministracao: text("via_administracao"),
  apresentacao: text("apresentacao"),
  dosePadrao: text("dose_padrao"),
  posologiaPadrao: text("posologia_padrao"),
  periodosPadrao: jsonb("periodos_padrao").$type<string[] | null>(),
  efeitosColaterais: jsonb("efeitos_colaterais").$type<EfeitoColateral[] | null>(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const remediosFarmaciaComponentesTable = pgTable("remedios_farmacia_componentes", {
  id: serial("id").primaryKey(),
  remedioId: integer("remedio_id").notNull().references(() => remediosFarmaciaTable.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(1),
  principioAtivo: text("principio_ativo").notNull(),
  concentracao: text("concentracao").notNull(),
  unidade: text("unidade"),
  observacao: text("observacao"),
}, (t) => ({
  remedioOrdemUnique: uniqueIndex("remedios_farmacia_componentes_remedio_id_ordem_key").on(t.remedioId, t.ordem),
}));

export const suplementosLaboratorioTable = pgTable("suplementos_laboratorio", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  marca: text("marca"),
  categoria: text("categoria"),
  formaFarmaceutica: text("forma_farmaceutica"),
  viaAdministracao: text("via_administracao"),
  apresentacao: text("apresentacao"),
  dosePadrao: text("dose_padrao"),
  posologiaPadrao: text("posologia_padrao"),
  periodosPadrao: jsonb("periodos_padrao").$type<string[] | null>(),
  efeitosColaterais: jsonb("efeitos_colaterais").$type<EfeitoColateral[] | null>(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const suplementosLaboratorioComponentesTable = pgTable("suplementos_laboratorio_componentes", {
  id: serial("id").primaryKey(),
  suplementoId: integer("suplemento_id").notNull().references(() => suplementosLaboratorioTable.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(1),
  ingrediente: text("ingrediente").notNull(),
  quantidade: text("quantidade").notNull(),
  unidade: text("unidade"),
  observacao: text("observacao"),
}, (t) => ({
  suplementoOrdemUnique: uniqueIndex("suplementos_laboratorio_componentes_suplemento_id_ordem_key").on(t.suplementoId, t.ordem),
}));

export type RemedioFarmacia = typeof remediosFarmaciaTable.$inferSelect;
export type RemedioFarmaciaComponente = typeof remediosFarmaciaComponentesTable.$inferSelect;
export type SuplementoLaboratorio = typeof suplementosLaboratorioTable.$inferSelect;
export type SuplementoLaboratorioComponente = typeof suplementosLaboratorioComponentesTable.$inferSelect;

export const VIAS_ADMINISTRACAO = [
  "oral",
  "sublingual",
  "topica",
  "transdermica",
  "intranasal",
  "inalatoria",
  "subcutanea",
  "intramuscular",
  "intravenosa",
  "retal",
  "vaginal",
  "oftalmica",
  "otologica",
  "bucal",
] as const;
export type ViaAdministracao = typeof VIAS_ADMINISTRACAO[number];
