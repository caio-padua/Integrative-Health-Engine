import { pgTable, serial, integer, text, time, timestamp } from "drizzle-orm/pg-core";

export const periodosDiaTable = pgTable("periodos_dia", {
  id: serial("id").primaryKey(),
  ordem: integer("ordem").notNull().unique(),
  sigla: text("sigla").notNull().unique(),
  nome: text("nome").notNull(),
  janelaInicio: time("janela_inicio").notNull(),
  janelaFim: time("janela_fim").notNull(),
  emoji: text("emoji"),
  corHex: text("cor_hex"),
  descricao: text("descricao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type PeriodoDia = typeof periodosDiaTable.$inferSelect;

// Siglas canônicas oficiais (Caio 2026-05-19 · Migrations 075 + 076 + 077).
// Regra geral PAWARDS: SIGLAS SEMPRE EM MAIÚSCULAS.
// Histórico:
//   - antes 075: J/IM/MM/AL/T/IN/N/NF/C (maiúsculas, 1-2 letras).
//   - 075: subdivisão fina + padrão 2 letras maiúsculas JE/IM/MM/AL/IT/MT/NO/FN/CE.
//   - 076: experimento minúsculas (revertido).
//   - 077: volta definitiva pra MAIÚSCULAS.
export const PERIODOS_DIA_SIGLAS = ["JE", "IM", "MM", "AL", "IT", "MT", "NO", "FN", "CE"] as const;
export type SiglaPeriodoDia = typeof PERIODOS_DIA_SIGLAS[number];

// Metadata read-only dos 9 períodos canônicos pra clientes que precisam
// renderizar sem consultar o banco (mockups, validação Zod, defaults UI).
// Fonte-de-verdade continua sendo a tabela `periodos_dia` no banco.
export const PERIODOS_DIA_CANONICOS: ReadonlyArray<{
  ordem: number;
  sigla: SiglaPeriodoDia;
  nome: string;
  janelaInicio: string;
  janelaFim: string;
  emoji: string;
  corHex: string;
  descricao: string;
}> = [
  { ordem: 1, sigla: "JE", nome: "Jejum",           janelaInicio: "05:00", janelaFim: "06:59", emoji: "🌑", corHex: "#d4a574", descricao: "Jejum metabólico, antes do café — máxima biodisponibilidade" },
  { ordem: 2, sigla: "IM", nome: "Início da Manhã", janelaInicio: "07:00", janelaFim: "08:59", emoji: "🌅", corHex: "#f5b947", descricao: "Café da manhã + ativos matinais (pico de cortisol)" },
  { ordem: 3, sigla: "MM", nome: "Meio da Manhã",   janelaInicio: "09:00", janelaFim: "10:59", emoji: "☀️", corHex: "#f5d547", descricao: "Lanche da manhã + foco produtivo pré-almoço" },
  { ordem: 4, sigla: "AL", nome: "Almoço",          janelaInicio: "11:00", janelaFim: "13:29", emoji: "🍽️", corHex: "#f57a47", descricao: "Almoço + janela de digestão ativa" },
  { ordem: 5, sigla: "IT", nome: "Início da Tarde", janelaInicio: "13:30", janelaFim: "15:59", emoji: "🌤️", corHex: "#e87a47", descricao: "Pós-almoço · pico de sonolência cronobiológica, retomada de foco" },
  { ordem: 6, sigla: "MT", nome: "Meio da Tarde",   janelaInicio: "16:00", janelaFim: "17:59", emoji: "⛅", corHex: "#d9663d", descricao: "Lanche da tarde + ativos pré-jantar (transição luz→escuro)" },
  { ordem: 7, sigla: "NO", nome: "Noite",           janelaInicio: "18:00", janelaFim: "19:59", emoji: "🌆", corHex: "#7a6bd9", descricao: "Jantar + relaxamento" },
  { ordem: 8, sigla: "FN", nome: "Final da Noite",  janelaInicio: "20:00", janelaFim: "22:29", emoji: "🌙", corHex: "#6b5fb0", descricao: "Pós-jantar · digestão + preparação pro sono (melatonina subindo)" },
  { ordem: 9, sigla: "CE", nome: "Ceia",            janelaInicio: "22:30", janelaFim: "23:59", emoji: "🦉", corHex: "#5b4e9b", descricao: "Última dose leve + ativos do sono profundo" },
];
