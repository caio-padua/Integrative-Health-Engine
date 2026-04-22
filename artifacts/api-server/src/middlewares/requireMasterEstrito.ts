import type { Request, Response, NextFunction } from "express";

/**
 * Guard EXCLUSIVO de Dr. Caio (validador_mestre) — sem bypass de ADMIN_TOKEN.
 *
 * Defesa em profundidade: aplicar APOS requireRole nas rotas que sao visao
 * CEO real (analytics, gestao financeira de clinicas, edicao de precos).
 *
 * Motivacao (Code Review Architect 22/abr/2026):
 *   requireRole("validador_mestre") aceita ADMIN_TOKEN como bypass administrativo.
 *   Esse bypass eh aceitavel pra rotas operacionais admin, mas vaza pra visoes
 *   estrategicas onde so o CEO pode operar.
 */
export function requireMasterEstrito(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const perfil = (req as any).user?.perfil;
  if (perfil !== "validador_mestre") {
    res.status(403).json({
      error: "Acesso restrito ao Dr. Caio (perfil validador_mestre exclusivo)",
    });
    return;
  }
  next();
}
