/**
 * Guard temporario para todos os endpoints /admin/*.
 * Onda 6.3 (code review CRITICAL): rotas admin estavam expostas. Ate o
 * follow-up "Auth + tenant isolation sistemico" ser executado, exigimos
 * o header `X-Admin-Token` igual ao secret `ADMIN_TOKEN`.
 *
 * Se ADMIN_TOKEN nao esta setado (caso dev local sem secret), bloqueamos
 * com 503 e mensagem orientando o operador. Fail-closed.
 */
import type { Request, Response, NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env["ADMIN_TOKEN"];
  if (!expected) {
    res.status(503).json({ error: "ADMIN_TOKEN nao configurado no servidor (defina o secret para liberar /admin/*)" });
    return;
  }
  const provided = req.header("X-Admin-Token") || "";
  if (provided !== expected) {
    res.status(401).json({ error: "X-Admin-Token invalido" });
    return;
  }
  next();
}
