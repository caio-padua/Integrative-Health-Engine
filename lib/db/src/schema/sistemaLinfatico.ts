/**
 * 💧 SISTEMA LINFÁTICO PAWARDS — Engrenagem central de aderência
 * ──────────────────────────────────────────────────────────────
 * Não-aderência NÃO é emergência. É insumo de análise.
 * O sangue arterial corre rápido (prescrição que chega).
 * O sangue venoso traz sintoma (anamnese, exames).
 * A LINFA agrega ruído regional — só estoura quando o gânglio incha de verdade.
 *
 * Engrenagens irmãs:
 *   🔬 mapa_aderencia_celular  — heatmap período × substância (detecta período evitado)
 *   🦋 casulo_eventos          — pipeline Ovo→Lagarta→Casulo→Borboleta
 *   🥩 queixas_cards           — Filé Mastigado para humano + agente Claude
 *   📞 roteiros_chamada        — biblioteca editável de scripts
 *
 * Cunhado por: Dr. Caio — abril/2026
 */
import { pgTable, serial, text, integer, boolean, timestamp, date, jsonb, numeric, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * 💧 LINFONODO DO PACIENTE — 1 score 0-100 atualizado 1×/noite (03h)
 * Carência de 7 dias para paciente novo (modo "🌱 em adaptação").
 * Janela rolling de 7 dias. Sem cálculo em tempo real.
 */
export const linfonodosPacienteTable = pgTable("linfonodos_paciente", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().unique(),
  unidadeId: integer("unidade_id"),
  aderenciaScore: numeric("aderencia_score", { precision: 5, scale: 2 }).notNull().default("100"),
  zona: text("zona").notNull().default("verde"),
  emCarencia: boolean("em_carencia").notNull().default(true),
  carenciaAte: date("carencia_ate"),
  tendencia: text("tendencia"),
  ultimaMsgCarinhosa: timestamp("ultima_msg_carinhosa", { withTimezone: true }),
  ultimaAtualizacao: timestamp("ultima_atualizacao", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

/**
 * 🔬 MAPA CELULAR — heatmap período × substância (14 dias rolling)
 * Detecta período EVITADO: célula < 30% enquanto global > 70%.
 * É o cérebro que acende quando o paciente "para de tomar à noite e não conta".
 */
export const mapaAderenciaCelularTable = pgTable("mapa_aderencia_celular", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull(),
  substanciaTipo: text("substancia_tipo").notNull(),
  substanciaId: integer("substancia_id").notNull(),
  substanciaNome: text("substancia_nome").notNull(),
  periodo: text("periodo").notNull(),
  esperados14d: integer("esperados_14d").notNull().default(0),
  respondidos14d: integer("respondidos_14d").notNull().default(0),
  aderenciaCelular: numeric("aderencia_celular", { precision: 5, scale: 2 }).notNull().default("100"),
  periodoEvitado: boolean("periodo_evitado").notNull().default(false),
  primeiraEvidenciaEvite: timestamp("primeira_evidencia_evite", { withTimezone: true }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unicoPorCelula: uniqueIndex("mapa_aderencia_unico_celula").on(t.pacienteId, t.substanciaTipo, t.substanciaId, t.periodo),
}));

/**
 * 🦋 CASULO — pipeline de transmutação
 * 🥚 OVO       → linfa caiu pra Amarelo (silencioso)
 * 🐛 LAGARTA   → 1sem amarelo OU 1d laranja (robô manda msg carinhosa)
 * 🛡️ CASULO    → 3d seguidos laranja (cria queixa Filé Mastigado)
 * 🦋 BORBOLETA → 48h sem ação no card (escala pro supervisor)
 * 95% morre como ovo. Só 5% vira borboleta.
 */
export const casuloEventosTable = pgTable("casulo_eventos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull(),
  unidadeId: integer("unidade_id"),
  estagio: text("estagio").notNull().default("OVO"),
  motivo: text("motivo").notNull(),
  scoreNoMomento: numeric("score_no_momento", { precision: 5, scale: 2 }),
  zonaNoMomento: text("zona_no_momento"),
  celulaEvitada: jsonb("celula_evitada"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  promovidoLagartaEm: timestamp("promovido_lagarta_em", { withTimezone: true }),
  promovidoCasuloEm: timestamp("promovido_casulo_em", { withTimezone: true }),
  promovidoBorboletaEm: timestamp("promovido_borboleta_em", { withTimezone: true }),
  resolvidoEm: timestamp("resolvido_em", { withTimezone: true }),
  resolucao: text("resolucao"),
  cardId: integer("card_id"),
  trelloCardUrl: text("trello_card_url"),
  metadata: jsonb("metadata"),
});

/**
 * 🥩 CARD FILÉ MASTIGADO — formato padrão de toda demanda gerada
 * Nunca número solto. Sempre: diagnóstico + prescrição + roteiro com
 * linha de entrada, perguntas cardinais, investigação, NUNCA DIZER, linha de saída.
 * O agente Claude lê e sabe falar. O humano lê e não improvisa.
 */
export const queixasCardsTable = pgTable("queixas_cards", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull(),
  unidadeId: integer("unidade_id"),
  casuloEventoId: integer("casulo_evento_id").references(() => casuloEventosTable.id),
  cor: text("cor").notNull().default("amarela"),
  prioridade: text("prioridade").notNull().default("baixa"),
  tituloCurto: text("titulo_curto").notNull(),
  diagnosticoPadrao: text("diagnostico_padrao").notNull(),
  hipoteseClinica: text("hipotese_clinica"),
  prescricaoSnapshot: jsonb("prescricao_snapshot"),
  roteiroChamada: jsonb("roteiro_chamada"),
  consultorDesignadoId: integer("consultor_designado_id"),
  status: text("status").notNull().default("aberta"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  primeiraAcaoEm: timestamp("primeira_acao_em", { withTimezone: true }),
  resolvidoEm: timestamp("resolvido_em", { withTimezone: true }),
  resolucao: text("resolucao"),
  trelloCardId: text("trello_card_id"),
  trelloCardUrl: text("trello_card_url"),
  tentativasContato: integer("tentativas_contato").notNull().default(0),
});

/**
 * 📞 ROTEIROS DE CHAMADA — biblioteca editável (Dr. Caio edita texto, ninguém recompila)
 * Cada situação clínica tem seu script: período evitado, score em queda,
 * paciente novo silencioso, falta consulta, exame alterado.
 * Slots dinâmicos {{nome}}, {{prescricao}}, {{periodo}} são preenchidos pelo gerador.
 */
export const roteirosChamadaTable = pgTable("roteiros_chamada", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titulo: text("titulo").notNull(),
  situacaoDisparo: text("situacao_disparo").notNull(),
  linhaEntrada: text("linha_entrada").notNull(),
  perguntasCardinais: jsonb("perguntas_cardinais").notNull(),
  investigacao: text("investigacao"),
  nuncaDizer: jsonb("nunca_dizer"),
  linhaSaida: text("linha_saida").notNull(),
  acoesPosChamada: jsonb("acoes_pos_chamada"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type LinfonodoPaciente = typeof linfonodosPacienteTable.$inferSelect;
export type MapaAderenciaCelular = typeof mapaAderenciaCelularTable.$inferSelect;
export type CasuloEvento = typeof casuloEventosTable.$inferSelect;
export type QueixaCard = typeof queixasCardsTable.$inferSelect;
export type RoteiroChamada = typeof roteirosChamadaTable.$inferSelect;

export const ZONAS_LINFA = ["verde", "amarelo", "laranja"] as const;
export const ESTAGIOS_CASULO = ["OVO", "LAGARTA", "CASULO", "BORBOLETA", "RESOLVIDO"] as const;
export const CORES_QUEIXA = ["amarela", "laranja", "vermelha"] as const;
