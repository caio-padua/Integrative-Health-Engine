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

type RegistroTentativas = {
  count: number;
  reseteEm: number;
  janelaInicioEm: number;
};

const tentativasPorUsuario = new Map<number, RegistroTentativas>();

/**
 * Resultado da tentativa errada. `transicaoParaBloqueio` e true APENAS na
 * chamada que faz o contador atingir TENTATIVAS_MAX pela primeira vez na
 * janela atual — usado pelos callers pra disparar o alerta CEO 1 unica vez
 * por bloqueio (Task #143, requisito "nao spammar").
 */
export type TentativaErradaResultado = {
  count: number;
  bloqueado: boolean;
  transicaoParaBloqueio: boolean;
  janelaInicioEm: Date;
};

export function registrarTentativaErradaTotp(usuarioId: number): TentativaErradaResultado {
  const agora = Date.now();
  const atual = tentativasPorUsuario.get(usuarioId);
  let registro: RegistroTentativas;
  if (!atual || atual.reseteEm < agora) {
    registro = { count: 1, reseteEm: agora + JANELA_MS, janelaInicioEm: agora };
    tentativasPorUsuario.set(usuarioId, registro);
  } else {
    atual.count += 1;
    registro = atual;
  }
  const bloqueado = registro.count >= TENTATIVAS_MAX;
  const transicaoParaBloqueio = registro.count === TENTATIVAS_MAX;
  return {
    count: registro.count,
    bloqueado,
    transicaoParaBloqueio,
    janelaInicioEm: new Date(registro.janelaInicioEm),
  };
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

/**
 * Devolve o inicio da janela ativa de rate-limit pro usuario, ou null se
 * nao ha janela ativa. Usado pelo alerta CEO pra carimbar o evento com a
 * mesma chave de idempotencia do UNIQUE em alertas_ceo_seguranca.
 */
export function getJanelaInicioTotp(usuarioId: number): Date | null {
  const atual = tentativasPorUsuario.get(usuarioId);
  if (!atual) return null;
  if (atual.reseteEm < Date.now()) return null;
  return new Date(atual.janelaInicioEm);
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
