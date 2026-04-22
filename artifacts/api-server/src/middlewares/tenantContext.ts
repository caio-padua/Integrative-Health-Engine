import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        unidadeId: number | null;
        origem: "session" | "default";
      };
    }
  }
}

// HARDENED 22/abr/2026 (anastomose #5 do Dr. Claude):
// JWT é a ÚNICA fonte de verdade pra unidade_id.
// Removido: x-unidade-id (header) e ?unidade_id= (query).
// Motivo: cross-tenant attack — qualquer cliente podia setar header e ler outra clinica.
export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.tenantContext = {
    unidadeId: req.user?.unidadeId ?? null,
    origem: req.user?.unidadeId != null ? "session" : "default",
  };
  next();
}
