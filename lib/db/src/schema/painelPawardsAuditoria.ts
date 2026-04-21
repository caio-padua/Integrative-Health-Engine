import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const painelPawardsAuditoriaTable = pgTable(
  "painel_pawards_auditoria",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id"),
    email: text("email"),
    perfil: text("perfil"),
    metodo: text("metodo").notNull(),
    endpoint: text("endpoint").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    acessadoEm: timestamp("acessado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxAcessadoEm: index("idx_painel_pawards_auditoria_acessado_em").on(t.acessadoEm),
    idxUsuario: index("idx_painel_pawards_auditoria_usuario").on(t.usuarioId),
  })
);

export const insertPainelPawardsAuditoriaSchema = createInsertSchema(painelPawardsAuditoriaTable).omit({
  id: true,
  acessadoEm: true,
});
export type InsertPainelPawardsAuditoria = z.infer<typeof insertPainelPawardsAuditoriaSchema>;
export type PainelPawardsAuditoria = typeof painelPawardsAuditoriaTable.$inferSelect;
