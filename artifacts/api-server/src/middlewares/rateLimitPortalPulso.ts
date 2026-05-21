/**
 * rateLimitPortalPulso.ts — Rate limit in-memory por IP pras rotas
 * públicas do Pulso Diário (sem JWT).
 *
 * Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md (P002)
 * Ressalva architect (21/mai/2026): "CRÍTICO. Não foi identificado um
 * rate limit específico para as rotas /portal-paciente/pulso/:token
 * (GET/POST). Como estas rotas são públicas, um atacante pode tentar
 * brute-force no token nanoid(12) sem restrições."
 *
 * Estratégia:
 *   - Map<ip, { tentativas, janelaInicio }>. Janela rolante de 60s.
 *   - 30 requisições/IP/minuto. Acima disso → 429.
 *   - Limpeza preguiçosa: cada chamada que renova janela apaga seu próprio
 *     contador. GC explícito a cada 1000 IPs distintos pra evitar leak.
 *   - In-memory é OK pra Fase 1 (1 réplica). Multi-réplica → migrar pra
 *     Postgres como o `rateLimitTotp.ts` (Task #144).
 *
 * Calibração de 30 req/min:
 *   - Paciente real: 1-5 requests por dia. 30/min é folga absurda.
 *   - Brute-force 12 chars base64url = 62^12 ≈ 3e21 espaço. A 30 req/min
 *     levaria ~2 trilhões de anos pra varrer. Bloqueio efetivo.
 */

import type { Request, Response, NextFunction } from "express";

interface ContadorIp {
  tentativas: number;
  janelaInicio: number;
}

const JANELA_MS = 60 * 1000;
const LIMITE_POR_JANELA = 30;
const GC_THRESHOLD_IPS = 1000;

const contadores = new Map<string, ContadorIp>();

function gcContadoresAntigos(): void {
  const agora = Date.now();
  for (const [ip, c] of contadores.entries()) {
    if (agora - c.janelaInicio > JANELA_MS * 2) {
      contadores.delete(ip);
    }
  }
}

export function rateLimitPortalPulso(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Express 5 já decodifica X-Forwarded-For via trust proxy quando
  // configurado; req.ip cobre os dois casos.
  const ip = req.ip ?? req.socket.remoteAddress ?? "desconhecido";
  const agora = Date.now();
  const c = contadores.get(ip);

  if (!c || agora - c.janelaInicio > JANELA_MS) {
    contadores.set(ip, { tentativas: 1, janelaInicio: agora });
    if (contadores.size > GC_THRESHOLD_IPS) gcContadoresAntigos();
    next();
    return;
  }

  if (c.tentativas >= LIMITE_POR_JANELA) {
    const restanteMs = JANELA_MS - (agora - c.janelaInicio);
    res.setHeader("Retry-After", Math.ceil(restanteMs / 1000).toString());
    res.status(429).json({
      erro: "Muitas tentativas. Tente novamente em alguns segundos.",
    });
    return;
  }

  c.tentativas += 1;
  next();
}
