import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usuariosTable } from "./usuarios";

/**
 * Task #202 — Registro de sessoes JWT ativas pra o dono e tenant_admin
 * conseguirem ver "onde minha conta esta logada" e revogar sessoes
 * individualmente (ex: perdi o celular, troquei de aparelho, suspeita
 * de hijack). Antes desta task, a unica forma de invalidar uma sessao
 * era forcar logout em massa via tokens_invalidos_apos (Task #154),
 * o que mata TODAS as sessoes ativas, inclusive a do proprio usuario
 * logado fazendo a operacao.
 *
 * Cada JWT emitido (login senha-only ou login pos-2FA) recebe um
 * `jti` (UUID v4) que vai como claim no token e fica gravado aqui
 * com user-agent + IP + datas. requireAuth checa por jti revogado
 * antes de aceitar qualquer Bearer.
 */
export const sessoesJwtTable = pgTable(
  "sessoes_jwt",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuariosTable.id, { onDelete: "cascade" }),
    // UUID v4 emitido no signJwt e ecoado de volta no claim `jti`.
    // UNIQUE pra que revogar sempre encontre exatamente uma linha.
    jti: text("jti").notNull().unique(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
    ultimoUsoEm: timestamp("ultimo_uso_em", { withTimezone: true }).notNull().defaultNow(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    // Quando preenchido: requireAuth rejeita o JWT correspondente.
    // Preenchido por DELETE /usuarios/sessoes-ativas/:id ou logout normal.
    revogadaEm: timestamp("revogada_em", { withTimezone: true }),
    revogadaMotivo: text("revogada_motivo"),
  },
  (t) => ({
    idxUsuario: index("idx_sessoes_jwt_usuario").on(t.usuarioId),
  }),
);

export type SessaoJwt = typeof sessoesJwtTable.$inferSelect;
