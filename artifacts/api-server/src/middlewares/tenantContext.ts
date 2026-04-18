import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        unidadeId: number | null;
        origem: "header" | "query" | "session" | "default";
      };
    }
  }
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerVal = req.header("x-unidade-id");
  const queryVal = typeof req.query["unidade_id"] === "string" ? req.query["unidade_id"] : undefined;
  const sessionVal = (req as any).session?.unidadeId;

  let unidadeId: number | null = null;
  let origem: "header" | "query" | "session" | "default" = "default";

  if (headerVal && !Number.isNaN(Number(headerVal))) { unidadeId = Number(headerVal); origem = "header"; }
  else if (queryVal && !Number.isNaN(Number(queryVal))) { unidadeId = Number(queryVal); origem = "query"; }
  else if (sessionVal != null && !Number.isNaN(Number(sessionVal))) { unidadeId = Number(sessionVal); origem = "session"; }

  req.tenantContext = { unidadeId, origem };
  next();
}
