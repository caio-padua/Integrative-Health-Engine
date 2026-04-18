import type { Request, Response, NextFunction } from "express";

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env["ADMIN_TOKEN"];
  if (!expected) {
    return res.status(503).json({ error: "ADMIN_TOKEN nao configurado no servidor" });
  }
  const provided = req.header("x-admin-token");
  if (!provided || provided !== expected) {
    return res.status(403).json({ error: "Token administrativo invalido ou ausente" });
  }
  next();
}
