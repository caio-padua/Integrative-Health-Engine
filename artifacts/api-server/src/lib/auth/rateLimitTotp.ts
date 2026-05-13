/**
 * Rate-limit pra tentativas erradas de codigo TOTP por usuario.
 * Compartilhado entre o login 2FA (POST /usuarios/login/2fa-verificar) e
 * o step-up do painel (POST /api/plataforma/2fa/step-up — Task #131).
 *
 * Limite: 5 tentativas erradas em janela deslizante de 5min por usuarioId.
 * Apos acerto, chamar resetTentativasTotp(usuarioId) pra zerar o contador.
 *
 * Task #143 — registrarTentativaErradaTotp() devolve metadata
 * (`transicaoParaBloqueio`, `janelaInicioEm`) pros callers dispararem o
 * alerta CEO 1 unica vez por bloqueio (sem spammar). getJanelaInicioTotp()
 * expoe o inicio da janela ativa pra idempotencia do alerta.
 *
 * Task #144 — contador agora vive na tabela `totp_rate_limit_tentativas`
 * (migration 046) em vez de um Map em memoria do processo. Isso garante:
 *   1) sobrevive a reinicio do servidor (atacante nao reseta derrubando-o)
 *   2) compartilhado entre replicas (multi-instancia consistente)
 *   3) TTL de 5min representado pela coluna `reseta_em`.
 *
 * Tests usam um store in-memory injetavel via `_setTotpRateLimitStoreParaTestes`
 * pra nao depender do Postgres. Em producao o default e o pgStore.
 */
import { pool } from "@workspace/db";

const TENTATIVAS_MAX = 5;
const JANELA_MS = 5 * 60 * 1000;

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

export interface TotpRateLimitStore {
  registrarTentativaErrada(usuarioId: number): Promise<TentativaErradaResultado>;
  estaBloqueado(usuarioId: number): Promise<boolean>;
  getJanelaInicio(usuarioId: number): Promise<Date | null>;
  reset(usuarioId: number): Promise<void>;
  resetTodos(): Promise<void>;
}

/**
 * Store padrao: persiste em `totp_rate_limit_tentativas` (migration 046).
 * Usa SQL bruto via `pool` pra evitar mais um schema Drizzle so pra isso.
 *
 * `janela_inicio_em` e derivada como `reseta_em - JANELA_MS` (a coluna
 * `reseta_em` e setada como `now() + JANELA_MS` na 1a tentativa da janela).
 */
const pgStore: TotpRateLimitStore = {
  async registrarTentativaErrada(
    usuarioId: number,
  ): Promise<TentativaErradaResultado> {
    // UPSERT que rotaciona a janela: se a linha existente ja expirou,
    // reabre com contador=1 e nova reseta_em; senao incrementa o contador
    // mantendo a reseta_em original (janela deslizante a partir do 1o erro).
    const { rows } = await pool.query<{ contador: number; reseta_em: Date }>(
      `INSERT INTO totp_rate_limit_tentativas
         (usuario_id, contador, reseta_em, atualizado_em)
       VALUES ($1, 1, now() + ($2::bigint || ' milliseconds')::interval, now())
       ON CONFLICT (usuario_id) DO UPDATE SET
         contador = CASE
           WHEN totp_rate_limit_tentativas.reseta_em < now() THEN 1
           ELSE totp_rate_limit_tentativas.contador + 1
         END,
         reseta_em = CASE
           WHEN totp_rate_limit_tentativas.reseta_em < now()
             THEN now() + ($2::bigint || ' milliseconds')::interval
           ELSE totp_rate_limit_tentativas.reseta_em
         END,
         atualizado_em = now()
       RETURNING contador, reseta_em`,
      [usuarioId, JANELA_MS],
    );
    const linha = rows[0]!;
    const count = Number(linha.contador);
    const resetaEmMs = new Date(linha.reseta_em).getTime();
    const janelaInicioEm = new Date(resetaEmMs - JANELA_MS);
    return {
      count,
      bloqueado: count >= TENTATIVAS_MAX,
      transicaoParaBloqueio: count === TENTATIVAS_MAX,
      janelaInicioEm,
    };
  },

  async estaBloqueado(usuarioId: number): Promise<boolean> {
    const { rows } = await pool.query<{ contador: number; expirada: boolean }>(
      `SELECT contador, (reseta_em < now()) AS expirada
         FROM totp_rate_limit_tentativas
        WHERE usuario_id = $1`,
      [usuarioId],
    );
    if (rows.length === 0) return false;
    const linha = rows[0]!;
    if (linha.expirada) {
      // Limpeza preguicosa pra nao acumular linhas expiradas indefinidamente.
      await pool.query(
        `DELETE FROM totp_rate_limit_tentativas
          WHERE usuario_id = $1 AND reseta_em < now()`,
        [usuarioId],
      );
      return false;
    }
    return Number(linha.contador) >= TENTATIVAS_MAX;
  },

  async getJanelaInicio(usuarioId: number): Promise<Date | null> {
    const { rows } = await pool.query<{ reseta_em: Date; expirada: boolean }>(
      `SELECT reseta_em, (reseta_em < now()) AS expirada
         FROM totp_rate_limit_tentativas
        WHERE usuario_id = $1`,
      [usuarioId],
    );
    if (rows.length === 0) return null;
    const linha = rows[0]!;
    if (linha.expirada) return null;
    return new Date(new Date(linha.reseta_em).getTime() - JANELA_MS);
  },

  async reset(usuarioId: number): Promise<void> {
    await pool.query(
      `DELETE FROM totp_rate_limit_tentativas WHERE usuario_id = $1`,
      [usuarioId],
    );
  },

  async resetTodos(): Promise<void> {
    await pool.query(`DELETE FROM totp_rate_limit_tentativas`);
  },
};

/**
 * Store in-memory pra testes unitarios (sem Postgres). Comportamento
 * identico ao pgStore: janela deslizante a partir do 1o erro, expira
 * ao chegar em reseteEm.
 */
type RegistroMem = { count: number; reseteEm: number; janelaInicioEm: number };

export function criarStoreInMemoryTotp(): TotpRateLimitStore {
  const tentativas = new Map<number, RegistroMem>();
  return {
    async registrarTentativaErrada(
      usuarioId: number,
    ): Promise<TentativaErradaResultado> {
      const agora = Date.now();
      const atual = tentativas.get(usuarioId);
      let registro: RegistroMem;
      if (!atual || atual.reseteEm < agora) {
        registro = {
          count: 1,
          reseteEm: agora + JANELA_MS,
          janelaInicioEm: agora,
        };
        tentativas.set(usuarioId, registro);
      } else {
        atual.count += 1;
        registro = atual;
      }
      return {
        count: registro.count,
        bloqueado: registro.count >= TENTATIVAS_MAX,
        transicaoParaBloqueio: registro.count === TENTATIVAS_MAX,
        janelaInicioEm: new Date(registro.janelaInicioEm),
      };
    },
    async estaBloqueado(usuarioId: number): Promise<boolean> {
      const atual = tentativas.get(usuarioId);
      if (!atual) return false;
      if (atual.reseteEm < Date.now()) {
        tentativas.delete(usuarioId);
        return false;
      }
      return atual.count >= TENTATIVAS_MAX;
    },
    async getJanelaInicio(usuarioId: number): Promise<Date | null> {
      const atual = tentativas.get(usuarioId);
      if (!atual) return null;
      if (atual.reseteEm < Date.now()) return null;
      return new Date(atual.janelaInicioEm);
    },
    async reset(usuarioId: number): Promise<void> {
      tentativas.delete(usuarioId);
    },
    async resetTodos(): Promise<void> {
      tentativas.clear();
    },
  };
}

let storeAtivo: TotpRateLimitStore = pgStore;

function garantirAmbienteDeTeste(nomeFn: string): void {
  // Hard guard pos code-review: helpers test-only nao podem ser chamados
  // em producao. Aceita NODE_ENV=test ou a presenca de NODE_TEST_CONTEXT
  // (setado pelo `node --test`/`tsx --test`).
  const ehTeste =
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined;
  if (!ehTeste) {
    throw new Error(
      `[rateLimitTotp] ${nomeFn} so pode ser chamado em ambiente de teste ` +
        "(NODE_ENV=test ou node --test). Chamada em producao bloqueada.",
    );
  }
}

/** Apenas pra testes — troca o store ativo (ex.: in-memory). */
export function _setTotpRateLimitStoreParaTestes(
  store: TotpRateLimitStore,
): void {
  garantirAmbienteDeTeste("_setTotpRateLimitStoreParaTestes");
  storeAtivo = store;
}

export function registrarTentativaErradaTotp(
  usuarioId: number,
): Promise<TentativaErradaResultado> {
  return storeAtivo.registrarTentativaErrada(usuarioId);
}

export function estaBloqueadoTotp(usuarioId: number): Promise<boolean> {
  return storeAtivo.estaBloqueado(usuarioId);
}

/**
 * Devolve o inicio da janela ativa de rate-limit pro usuario, ou null se
 * nao ha janela ativa. Usado pelo alerta CEO pra carimbar o evento com a
 * mesma chave de idempotencia do UNIQUE em alertas_ceo_seguranca.
 */
export function getJanelaInicioTotp(usuarioId: number): Promise<Date | null> {
  return storeAtivo.getJanelaInicio(usuarioId);
}

export function resetTentativasTotp(usuarioId: number): Promise<void> {
  return storeAtivo.reset(usuarioId);
}

/** Apenas pra testes — nunca chamar em codigo de produto. */
export function _resetTodasTentativasTotp(): Promise<void> {
  garantirAmbienteDeTeste("_resetTodasTentativasTotp");
  return storeAtivo.resetTodos();
}

export const TOTP_TENTATIVAS_MAX = TENTATIVAS_MAX;
export const TOTP_JANELA_MS = JANELA_MS;
