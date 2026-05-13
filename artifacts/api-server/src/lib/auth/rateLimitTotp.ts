/**
 * Rate-limit in-memory pra tentativas erradas de codigo TOTP por usuario.
 * Compartilhado entre o login 2FA (POST /usuarios/login/2fa-verificar) e
 * o step-up do painel (POST /api/plataforma/2fa/step-up — Task #131).
 *
 * Limite: 5 tentativas erradas em janela deslizante de 5min por usuarioId.
 * Apos acerto, chamar resetTentativasTotp(usuarioId) pra zerar o contador.
 *
 * Multi-instancia: estado e por processo. Quando rodarmos N replicas,
 * trocar pra Redis (TODO Wave 13 F4).
 */
const TENTATIVAS_MAX = 5;
const JANELA_MS = 5 * 60 * 1000;

const tentativasPorUsuario = new Map<number, { count: number; reseteEm: number }>();

export function registrarTentativaErradaTotp(usuarioId: number): void {
  const agora = Date.now();
  const atual = tentativasPorUsuario.get(usuarioId);
  if (!atual || atual.reseteEm < agora) {
    tentativasPorUsuario.set(usuarioId, { count: 1, reseteEm: agora + JANELA_MS });
    return;
  }
  atual.count += 1;
}

export function estaBloqueadoTotp(usuarioId: number): boolean {
  const atual = tentativasPorUsuario.get(usuarioId);
  if (!atual) return false;
  if (atual.reseteEm < Date.now()) {
    tentativasPorUsuario.delete(usuarioId);
    return false;
  }
  return atual.count >= TENTATIVAS_MAX;
}

export function resetTentativasTotp(usuarioId: number): void {
  tentativasPorUsuario.delete(usuarioId);
}

/** Apenas pra testes — nunca chamar em codigo de produto. */
export function _resetTodasTentativasTotp(): void {
  tentativasPorUsuario.clear();
}

export const TOTP_TENTATIVAS_MAX = TENTATIVAS_MAX;
export const TOTP_JANELA_MS = JANELA_MS;
