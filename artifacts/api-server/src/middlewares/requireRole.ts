import type { Request, Response, NextFunction } from "express";

/**
 * Gate de perfil. Aceita um ou mais perfis permitidos.
 * Se req.user nao tem o perfil correto, responde 403.
 *
 * Uso:
 *   router.get('/admin/algo', requireAuth, requireRole('validador_mestre'), ...)
 *   router.get('/admin/relatorio', requireAuth, requireRole('validador_mestre','consultoria_master'), ...)
 *
 * Bypass automatico: ADMIN_TOKEN (perfil 'admin') tem acesso a tudo.
 */
export function requireRole(...perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const perfilAtual = (req.user as any)?.perfil ?? "";
    if (perfilAtual === "admin") { next(); return; }
    if (perfisPermitidos.includes(perfilAtual)) { next(); return; }
    res.status(403).json({
      error: "Acesso negado: perfil insuficiente para esta operacao.",
      perfil_necessario: perfisPermitidos,
      perfil_atual: perfilAtual || "(nenhum)",
    });
  };
}
