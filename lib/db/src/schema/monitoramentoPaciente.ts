import { pgTable, serial, text, integer, real, boolean, timestamp, date, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";

export const direcaoFavoravelExameTable = pgTable("direcao_favoravel_exame", {
  id: serial("id").primaryKey(),
  nomeExame: text("nome_exame").notNull().unique(),
  direcaoFavoravel: text("direcao_favoravel", { enum: ["SUBIR_BOM", "DESCER_BOM"] }).notNull(),
  grupoExame: text("grupo_exame"),
  descricao: text("descricao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDirecaoFavoravelExameSchema = createInsertSchema(direcaoFavoravelExameTable).omit({ id: true, criadoEm: true });
export type InsertDirecaoFavoravelExame = z.infer<typeof insertDirecaoFavoravelExameSchema>;
export type DirecaoFavoravelExame = typeof direcaoFavoravelExameTable.$inferSelect;

export const formulaBlendTable = pgTable("formula_blend", {
  id: serial("id").primaryKey(),
  codigoBlend: text("codigo_blend").notNull().unique(),
  nomeBlend: text("nome_blend").notNull(),
  funcao: text("funcao").notNull(),
  via: text("via", { enum: ["VO", "IM", "EV", "TOPICA", "SUBLINGUAL"] }).notNull().default("VO"),
  forma: text("forma", { enum: ["CAPSULA", "COMPRIMIDO", "LIQUIDO", "PO", "GEL", "CREME"] }).notNull().default("CAPSULA"),
  posologia: text("posologia").notNull(),
  duracao: text("duracao").notNull(),
  objetivo: text("objetivo").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFormulaBlendSchema = createInsertSchema(formulaBlendTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFormulaBlend = z.infer<typeof insertFormulaBlendSchema>;
export type FormulaBlend = typeof formulaBlendTable.$inferSelect;

export const formulaBlendAtivoTable = pgTable("formula_blend_ativo", {
  id: serial("id").primaryKey(),
  blendId: integer("blend_id").notNull().references(() => formulaBlendTable.id),
  ordem: integer("ordem").notNull(),
  componente: text("componente").notNull(),
  dosagem: real("dosagem").notNull(),
  unidade: text("unidade").notNull(),
  observacao: text("observacao"),
});

export const insertFormulaBlendAtivoSchema = createInsertSchema(formulaBlendAtivoTable).omit({ id: true });
export type InsertFormulaBlendAtivo = z.infer<typeof insertFormulaBlendAtivoSchema>;
export type FormulaBlendAtivo = typeof formulaBlendAtivoTable.$inferSelect;

export const registroSubstanciaUsoTable = pgTable("registro_substancia_uso", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  substanciaNome: text("substancia_nome").notNull(),
  tipo: text("tipo", { enum: ["BLEND", "MEDICACAO", "SUPLEMENTO", "INJETAVEL"] }).notNull(),
  via: text("via"),
  dose: text("dose"),
  frequencia: text("frequencia"),
  sessoesOuCiclo: text("sessoes_ou_ciclo"),
  dataInicio: date("data_inicio"),
  observacaoMedica: text("observacao_medica"),
  status: text("status", { enum: ["ATIVO", "PAUSADO", "CONCLUIDO", "CANCELADO"] }).notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_registro_substancia_paciente").on(table.pacienteId),
]);

export const insertRegistroSubstanciaUsoSchema = createInsertSchema(registroSubstanciaUsoTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertRegistroSubstanciaUso = z.infer<typeof insertRegistroSubstanciaUsoSchema>;
export type RegistroSubstanciaUso = typeof registroSubstanciaUsoTable.$inferSelect;

export const acompanhamentoFormulaTable = pgTable("acompanhamento_formula", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  codigoBlend: text("codigo_blend"),
  nomeBlend: text("nome_blend").notNull(),
  objetivo: text("objetivo"),
  dataPrescricao: date("data_prescricao"),
  dataInicio: date("data_inicio"),
  duracao: text("duracao"),
  aderencia: text("aderencia", { enum: ["ALTA", "MEDIA", "BAIXA"] }),
  bemEstar: boolean("bem_estar"),
  senteResultado: text("sente_resultado", { enum: ["SIM", "PARCIAL", "NAO"] }),
  efeitoColateral1: text("efeito_colateral_1"),
  efeitoColateral2: text("efeito_colateral_2"),
  observacao: text("observacao"),
  registradoPorId: integer("registrado_por_id").references(() => usuariosTable.id),
  origem: text("origem", { enum: ["PACIENTE", "PROFISSIONAL"] }).notNull().default("PACIENTE"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_acompanhamento_formula_paciente").on(table.pacienteId),
]);

export const insertAcompanhamentoFormulaSchema = createInsertSchema(acompanhamentoFormulaTable).omit({ id: true, criadoEm: true });
export type InsertAcompanhamentoFormula = z.infer<typeof insertAcompanhamentoFormulaSchema>;
export type AcompanhamentoFormula = typeof acompanhamentoFormulaTable.$inferSelect;

export const monitoramentoSinaisVitaisTable = pgTable("monitoramento_sinais_vitais", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  dataRegistro: date("data_registro").notNull(),
  indicador: text("indicador", {
    enum: ["PA_SISTOLICA", "PA_DIASTOLICA", "FREQUENCIA_CARDIACA", "GLICEMIA_JEJUM", "PESO", "CINTURA"]
  }).notNull(),
  hora1Valor: real("hora1_valor"),
  hora1Horario: text("hora1_horario"),
  hora2Valor: real("hora2_valor"),
  hora2Horario: text("hora2_horario"),
  hora3Valor: real("hora3_valor"),
  hora3Horario: text("hora3_horario"),
  hora4Valor: real("hora4_valor"),
  hora4Horario: text("hora4_horario"),
  hora5Valor: real("hora5_valor"),
  hora5Horario: text("hora5_horario"),
  hora6Valor: real("hora6_valor"),
  hora6Horario: text("hora6_horario"),
  origem: text("origem", { enum: ["PACIENTE", "PROFISSIONAL"] }).notNull().default("PACIENTE"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_sinais_vitais_paciente_data").on(table.pacienteId, table.dataRegistro),
]);

export const insertMonitoramentoSinaisVitaisSchema = createInsertSchema(monitoramentoSinaisVitaisTable).omit({ id: true, criadoEm: true });
export type InsertMonitoramentoSinaisVitais = z.infer<typeof insertMonitoramentoSinaisVitaisSchema>;
export type MonitoramentoSinaisVitais = typeof monitoramentoSinaisVitaisTable.$inferSelect;

export const trackingSintomasTable = pgTable("tracking_sintomas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  dataSemana: date("data_semana").notNull(),
  sono: real("sono"),
  energia: real("energia"),
  disposicao: real("disposicao"),
  atividadeFisica: real("atividade_fisica"),
  foco: real("foco"),
  concentracao: real("concentracao"),
  libido: real("libido"),
  forca: real("forca"),
  emagrecimento: real("emagrecimento"),
  hipertrofia: real("hipertrofia"),
  definicao: real("definicao"),
  resistencia: real("resistencia"),
  massaMagra: real("massa_magra"),
  estresse: real("estresse"),
  humor: real("humor"),
  origem: text("origem", { enum: ["PACIENTE", "PROFISSIONAL"] }).notNull().default("PACIENTE"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tracking_sintomas_paciente_semana").on(table.pacienteId, table.dataSemana),
]);

const sintomaRange = { minimum: 0, maximum: 10 };
export const insertTrackingSintomasSchema = createInsertSchema(trackingSintomasTable, {
  sono: z.number().min(0).max(10).optional().nullable(),
  energia: z.number().min(0).max(10).optional().nullable(),
  disposicao: z.number().min(0).max(10).optional().nullable(),
  atividadeFisica: z.number().min(0).max(10).optional().nullable(),
  foco: z.number().min(0).max(10).optional().nullable(),
  concentracao: z.number().min(0).max(10).optional().nullable(),
  libido: z.number().min(0).max(10).optional().nullable(),
  forca: z.number().min(0).max(10).optional().nullable(),
  emagrecimento: z.number().min(0).max(10).optional().nullable(),
  hipertrofia: z.number().min(0).max(10).optional().nullable(),
  definicao: z.number().min(0).max(10).optional().nullable(),
  resistencia: z.number().min(0).max(10).optional().nullable(),
  massaMagra: z.number().min(0).max(10).optional().nullable(),
  estresse: z.number().min(0).max(10).optional().nullable(),
  humor: z.number().min(0).max(10).optional().nullable(),
}).omit({ id: true, criadoEm: true });
export type InsertTrackingSintomas = z.infer<typeof insertTrackingSintomasSchema>;
export type TrackingSintomas = typeof trackingSintomasTable.$inferSelect;

export const alertaPacienteTable = pgTable("alerta_paciente", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tipoAlerta: text("tipo_alerta", {
    enum: [
      "PRESSAO_ALTA", "PRESSAO_BAIXA", "GLICEMIA_ALTA", "GLICEMIA_BAIXA",
      "EFEITO_COLATERAL", "DOR_AGUDA", "MAL_ESTAR", "DUVIDA_MEDICACAO",
      "ESQUECEU_DOSE", "OUTRO"
    ]
  }).notNull(),
  descricao: text("descricao"),
  gravidade: text("gravidade", { enum: ["LEVE", "MODERADO", "GRAVE"] }).notNull().default("LEVE"),
  status: text("status", { enum: ["ABERTO", "EM_ATENDIMENTO", "RESPONDIDO", "FECHADO"] }).notNull().default("ABERTO"),
  responsavelId: integer("responsavel_id").references(() => usuariosTable.id),
  respostaAssistente: text("resposta_assistente"),
  contatoTelefone: boolean("contato_telefone").default(false),
  dataResposta: timestamp("data_resposta", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_alerta_paciente_status").on(table.pacienteId, table.status),
]);

export const insertAlertaPacienteSchema = createInsertSchema(alertaPacienteTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertAlertaPaciente = z.infer<typeof insertAlertaPacienteSchema>;
export type AlertaPaciente = typeof alertaPacienteTable.$inferSelect;

export const INDICADORES_SINTOMAS = [
  "sono", "energia", "disposicao", "atividadeFisica", "foco",
  "concentracao", "libido", "forca", "emagrecimento", "hipertrofia",
  "definicao", "resistencia", "massaMagra", "estresse", "humor"
] as const;

export const INDICADORES_INVERTIDOS = ["estresse"] as const;

export function classificarSintoma(valor: number): "PREOCUPANTE" | "BAIXO" | "MEDIANO" | "OTIMO" {
  if (valor < 3) return "PREOCUPANTE";
  if (valor < 5) return "BAIXO";
  if (valor < 7) return "MEDIANO";
  return "OTIMO";
}

export function classificarSintomaInvertido(valor: number): "PREOCUPANTE" | "BAIXO" | "MEDIANO" | "OTIMO" {
  if (valor > 7) return "PREOCUPANTE";
  if (valor > 5) return "BAIXO";
  if (valor > 3) return "MEDIANO";
  return "OTIMO";
}

export function interpretarTendenciaExame(
  tendencia: "SUBINDO" | "DESCENDO" | "ESTAVEL",
  direcaoFavoravel: "SUBIR_BOM" | "DESCER_BOM"
): "MELHORA" | "PIORA" | "ESTAVEL" {
  if (tendencia === "ESTAVEL") return "ESTAVEL";
  if (direcaoFavoravel === "SUBIR_BOM") {
    return tendencia === "SUBINDO" ? "MELHORA" : "PIORA";
  }
  return tendencia === "DESCENDO" ? "MELHORA" : "PIORA";
}
