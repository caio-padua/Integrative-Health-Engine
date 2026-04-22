import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

/**
 * Gate de autonomia delegada.
 *
 * Bypass automatico:
 *  - perfil 'validador_mestre' (Dr. Caio CEO) — sempre passa
 *  - perfil 'admin' (ADMIN_TOKEN) — sempre passa
 *  - LABORATORIO_MESTRE (Genesis) — sempre passa, ela cria sem precisar de toggle
 *
 * Para CLINICA_PARCEIRA: consulta permissoes_delegadas. Se ativo=true → libera.
 * Se nao tem ou ativo=false → 403 com mensagem amigavel pro dono da clinica.
 *
 * Uso:
 *   router.post('/substancias',
 *     requireAuth,
 *     requireDelegacao('incluir_substancia_nova'),
 *     async (req, res) => { ... }
 *   );
 */
export function requireDelegacao(permissao: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const perfil = (req.user as any)?.perfil ?? "";
    const unidadeId = (req.user as any)?.unidadeId;

    if (perfil === "validador_mestre" || perfil === "admin") { next(); return; }

    if (unidadeId == null) {
      res.status(403).json({ error: "Sem unidade vinculada — nao pode operar." });
      return;
    }

    // Genesis (LABORATORIO_MESTRE) bypassa qualquer toggle
    const tipoResult = await db.execute(sql`
      SELECT tipo_unidade FROM unidades WHERE id = ${unidadeId} LIMIT 1
    `);
    const tipoUnidade = (tipoResult.rows[0] as any)?.tipo_unidade;
    if (tipoUnidade === "LABORATORIO_MESTRE") { next(); return; }

    const result = await db.execute(sql`
      SELECT ativo FROM permissoes_delegadas
      WHERE unidade_id = ${unidadeId} AND permissao = ${permissao} AND ativo = true
      LIMIT 1
    `);

    if (result.rows.length > 0) { next(); return; }

    res.status(403).json({
      error: "Autonomia nao delegada para esta unidade.",
      permissao,
      contato: "Solicite ao Dr. Caio a ativacao deste modulo no painel /admin/permissoes-delegadas",
    });
  };
}
