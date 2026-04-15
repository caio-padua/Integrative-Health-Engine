import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { pacientesTable } from "./pacientes";

export const termosJuridicosTable = pgTable("termos_juridicos", {
  id: serial("id").primaryKey(),
  bloco: text("bloco").notNull(),
  subgrupo: text("subgrupo").notNull(),
  consentimento: text("consentimento"),
  titulo: text("titulo").notNull(),
  textoCompleto: text("texto_completo").notNull(),
  versao: integer("versao").notNull().default(1),
  ativo: boolean("ativo").notNull().default(true),
  categoria: text("categoria", {
    enum: ["lgpd", "privacidade", "nao_garantia", "tcle_global", "consentimento_especifico", "imagem", "aceite_digital", "ciencia_financeira"],
  }).notNull(),
  riscosEspecificos: jsonb("riscos_especificos").default([]),
  metadados: jsonb("metadados").default({}),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const termosAssinadosTable = pgTable("termos_assinados", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  termoId: integer("termo_id").notNull().references(() => termosJuridicosTable.id),
  versaoAssinada: integer("versao_assinada").notNull(),
  tituloTermo: text("titulo_termo").notNull(),
  textoNoMomentoAssinatura: text("texto_no_momento_assinatura").notNull(),
  meioAssinatura: text("meio_assinatura", {
    enum: ["presencial", "digital_doxite", "digital_pawards", "whatsapp"],
  }).notNull().default("presencial"),
  profissionalResponsavel: text("profissional_responsavel"),
  observacao: text("observacao"),
  dataAssinatura: timestamp("data_assinatura", { withTimezone: true }).notNull().defaultNow(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});
