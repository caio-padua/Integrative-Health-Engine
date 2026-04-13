import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { tratamentosTable } from "./tratamentos";
import { eventoStartTable } from "./eventoStart";

export const FAMILIAS_DOCUMENTAIS = ["RACL", "RACJ"] as const;
export type FamiliaDocumental = typeof FAMILIAS_DOCUMENTAIS[number];

export const SIGLAS_RACL = [
  "CMST", "MCLI", "MPRO", "DSUB", "DMOD",
  "RDOC", "ROPR", "RPOS", "EVOL", "JORN", "FTRA",
] as const;

export const SIGLAS_RACJ = [
  "CMST", "CFIN", "COPE", "CREM", "CGLO",
  "CIMP", "CIMU", "CEND", "CFORM", "CCOMB",
  "LGPD", "RPAC", "RISC", "TPOS", "TFIN",
  "IMAG", "NGAR",
] as const;

export const TODAS_SIGLAS = [...new Set([...SIGLAS_RACL, ...SIGLAS_RACJ])] as const;

export const SIGLA_LABELS: Record<string, string> = {
  CMST: "Cadastro Mestre",
  MCLI: "Manifesto Clinico",
  MPRO: "Mapa de Procedimentos",
  DSUB: "Descritivo de Substancias",
  DMOD: "Descritivo de Modalidades",
  RDOC: "RAS Documental",
  ROPR: "RAS Operacional",
  RPOS: "RAS Pos-Procedimento",
  EVOL: "Evolucao Clinica",
  JORN: "Jornada do Paciente",
  FTRA: "Fechamento do Tratamento",
  CFIN: "Contrato Financeiro",
  COPE: "Consentimento Operacional",
  CREM: "Consentimento Remoto",
  CGLO: "Consentimento Global",
  CIMP: "Consentimento Implante",
  CIMU: "Consentimento IM",
  CEND: "Consentimento Endovenoso",
  CFORM: "Consentimento Formula",
  CCOMB: "Consentimento Combinado",
  LGPD: "Termo LGPD",
  RPAC: "Riscos do Paciente",
  RISC: "Declaracao de Riscos",
  TPOS: "Termo Pos-Procedimento",
  TFIN: "Termo Financeiro",
  IMAG: "Termo de Imagem",
  NGAR: "Termo Nao-Garantia",
};

export const cadernosDocumentaisTable = pgTable("cadernos_documentais", {
  id: serial("id").primaryKey(),

  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tratamentoId: integer("tratamento_id").notNull().references(() => tratamentosTable.id),
  eventoStartId: integer("evento_start_id").references(() => eventoStartTable.id),

  familia: text("familia", { enum: ["RACL", "RACJ"] }).notNull(),
  sigla: text("sigla").notNull(),
  descricao: text("descricao"),

  versao: integer("versao").notNull().default(1),

  status: text("status", {
    enum: ["pendente", "gerado", "assinado", "enviado", "arquivado", "erro"]
  }).notNull().default("pendente"),

  driveFileId: text("drive_file_id"),
  driveFileName: text("drive_file_name"),
  driveSubpasta: text("drive_subpasta"),

  sessaoOrigemId: integer("sessao_origem_id"),

  metadados: jsonb("metadados").default({}),

  geradoEm: timestamp("gerado_em", { withTimezone: true }),
  assinadoEm: timestamp("assinado_em", { withTimezone: true }),
  enviadoEm: timestamp("enviado_em", { withTimezone: true }),

  emitidoUmaVez: boolean("emitido_uma_vez").notNull().default(false),

  origem: text("origem").default("PADCOM_V15.2"),
  versaoSchema: text("versao_schema").default("1.0"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCadernoDocumentalSchema = createInsertSchema(cadernosDocumentaisTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertCadernoDocumental = z.infer<typeof insertCadernoDocumentalSchema>;
export type CadernoDocumental = typeof cadernosDocumentaisTable.$inferSelect;
