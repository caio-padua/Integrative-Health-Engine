/**
 * Task #123 — Codigos de recuperacao 2FA.
 *
 * Geramos N codigos no formato XXXX-XXXX (8 chars base32 Crockford-ish:
 * sem 0/O/1/I/L pra reduzir confusao visual) durante a ativacao do 2FA.
 * O usuario ve UMA UNICA VEZ; persistimos so o hash bcrypt + flag de uso.
 *
 * No login com 2FA, se o codigo enviado nao bate com o TOTP, tentamos
 * casar com algum codigo de recuperacao ainda nao usado. Match consome
 * (marca `usadoEm`). Lista nao e drasticamente reduzida — mantemos os
 * usados marcados pra auditoria/UI ("3 de 10 restantes").
 */
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

/** Total de codigos gerados na ativacao (padrao industria: Google=10, GitHub=16). */
export const CODIGOS_RECUPERACAO_TOTAL = 10;

/** Charset sem 0/O/1/I/L pra evitar erro de transcricao manual. */
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export interface CodigoRecuperacaoArmazenado {
  hash: string;
  usadoEm: string | null;
}

function gerarBlocoCodigo(tamanho: number): string {
  let s = "";
  for (let i = 0; i < tamanho; i++) {
    s += CHARSET[randomInt(0, CHARSET.length)];
  }
  return s;
}

/**
 * Normaliza um codigo digitado pelo usuario pra forma canonica de comparacao:
 * uppercase + remove tudo que nao for char do CHARSET (espacos, hifens, etc).
 * Isso aceita "abcd-1234", "ABCD 1234", "ABCD1234" como o mesmo codigo.
 */
export function normalizarCodigoRecuperacao(entrada: string): string {
  const upper = (entrada ?? "").toUpperCase();
  let limpo = "";
  for (const ch of upper) {
    if (CHARSET.includes(ch)) limpo += ch;
  }
  return limpo;
}

/** Heuristica leve pra distinguir codigo recuperacao (>=8 chars alfa) de TOTP (6 digitos). */
export function pareceCodigoRecuperacao(entrada: string): boolean {
  const norm = normalizarCodigoRecuperacao(entrada);
  // TOTP e 6 digitos puros — codigo recuperacao tem 8 chars com letras.
  if (norm.length < 8) return false;
  return /[A-Z]/.test(norm);
}

/**
 * Gera N codigos novos. Devolve o par (planos, armazenaveis):
 *  - `planos`: o que sera mostrado UMA UNICA VEZ pro usuario (formato XXXX-XXXX)
 *  - `armazenaveis`: array bcrypt-hashed pra persistir em `codigos_recuperacao_2fa`
 */
export async function gerarCodigosRecuperacao(
  total: number = CODIGOS_RECUPERACAO_TOTAL,
): Promise<{ planos: string[]; armazenaveis: CodigoRecuperacaoArmazenado[] }> {
  const planos: string[] = [];
  const armazenaveis: CodigoRecuperacaoArmazenado[] = [];
  for (let i = 0; i < total; i++) {
    const bruto = gerarBlocoCodigo(8);
    const formatado = `${bruto.slice(0, 4)}-${bruto.slice(4)}`;
    planos.push(formatado);
    const hash = await bcrypt.hash(bruto, 10);
    armazenaveis.push({ hash, usadoEm: null });
  }
  return { planos, armazenaveis };
}

/**
 * Tenta casar `codigoEntrada` com algum codigo armazenado ainda nao usado.
 * Retorna a lista atualizada (com `usadoEm` setado se houve match) e um
 * flag `consumido`. Se nada bater, devolve a lista original e false.
 *
 * Faz comparacao bcrypt em todos os codigos nao usados pra evitar timing
 * attack — nao para no primeiro match (custo bcrypt domina o tempo).
 */
export async function tentarConsumirCodigoRecuperacao(
  armazenados: CodigoRecuperacaoArmazenado[],
  codigoEntrada: string,
): Promise<{ atualizados: CodigoRecuperacaoArmazenado[]; consumido: boolean }> {
  const candidato = normalizarCodigoRecuperacao(codigoEntrada);
  if (candidato.length === 0) {
    return { atualizados: armazenados, consumido: false };
  }
  let indiceMatch = -1;
  for (let i = 0; i < armazenados.length; i++) {
    const item = armazenados[i]!;
    if (item.usadoEm) continue;
    const ok = await bcrypt.compare(candidato, item.hash);
    if (ok && indiceMatch === -1) {
      indiceMatch = i;
      // nao da break — gasta o mesmo tempo nos demais pra mitigar timing
    }
  }
  if (indiceMatch === -1) {
    return { atualizados: armazenados, consumido: false };
  }
  const atualizados = armazenados.map((item, i) =>
    i === indiceMatch ? { ...item, usadoEm: new Date().toISOString() } : item,
  );
  return { atualizados, consumido: true };
}

/** Conta quantos codigos ainda nao foram usados (mostrado na UI). */
export function contarCodigosRestantes(
  armazenados: CodigoRecuperacaoArmazenado[] | null | undefined,
): number {
  if (!Array.isArray(armazenados)) return 0;
  return armazenados.filter((c) => c && !c.usadoEm).length;
}
