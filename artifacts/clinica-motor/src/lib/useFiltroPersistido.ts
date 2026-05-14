// Task #216 — hook generico pra "memoria de filtros por usuario com URL
// ganhando do storage". Extraido do padrao inline que vivia em
// `assinaturas-timeline.tsx` (Task #88 + Task #90) pra ser reaproveitado
// em outras telas (pacientes, fila operacional, lista de RAS, etc.).
//
// Contrato:
//   - Estado inicial: se a URL traz `paramUrl`, parseia e usa esse valor
//     (link compartilhavel SEMPRE vence). Caso contrario, usa `defaultValue`.
//   - Setter: atualiza state + URL (`replaceState`) + localStorage por-usuario.
//     Quando `serialize(valor)` retorna string vazia, o param e removido da URL
//     mas a string vazia E gravada no storage — isso sinaliza "limpo
//     explicitamente" (= nao restaurar valor antigo na proxima visita).
//   - Hidratacao: quando `uid` fica disponivel, le o storage e aplica SE a URL
//     nao tem `paramUrl` (granular: link compartilhavel preserva so os campos
//     que ele traz). String vazia salva passa pelo `parse` -> equivale a default,
//     entao o efeito e "nao restaura nada".
//   - Chave de storage: `pawards.<scope>.<nome>.<uid>` (mesmo formato dos
//     callsites originais, pra preservar a memoria ja gravada na conta dos
//     usuarios — Caio, Contador, etc.).
//
// O hook e propositalmente generico em `T` pra suportar tanto valores
// primitivos (number, string, enum) quanto compostos (lista de ordenacoes).
// As funcoes `parse` e `serialize` sao a unica ponte entre tipo e string.
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseFiltroPersistidoOpts<T> {
  /** Escopo da tela. Vira parte da chave: `pawards.<scope>.<nome>.<uid>`. */
  scope: string;
  /** Nome curto do filtro (ex: "filtro_unidade_id", "ordenar_por"). */
  nome: string;
  /** ID do usuario logado. Sem ele, nao persiste nem hidrata. */
  uid: number | string | null | undefined;
  /**
   * Nome do query-param na URL. Se omitido, o filtro NAO e espelhado na URL
   * (so localStorage) — usado pra preferencias puramente locais.
   */
  paramUrl?: string;
  /** Valor inicial quando nao ha URL nem storage. */
  defaultValue: T;
  /**
   * Le um valor cru (URL ou storage) e devolve o tipo. Deve ser tolerante
   * (string vazia / formato invalido -> defaultValue ou equivalente).
   */
  parse: (raw: string) => T;
  /**
   * Serializa o valor pra string. Retornar "" sinaliza "default/limpo" —
   * remove o param da URL e grava string vazia no storage.
   */
  serialize: (val: T) => string;
}

function chaveStorage(scope: string, nome: string, uid: number | string | null | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.${scope}.${nome}.${uid}`;
}

function lerUrlParam(paramUrl: string | undefined): string | null {
  if (!paramUrl || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(paramUrl);
}

export function useFiltroPersistido<T>(
  opts: UseFiltroPersistidoOpts<T>,
): [T, (next: T) => void] {
  const { scope, nome, uid, paramUrl, defaultValue, parse, serialize } = opts;

  // Refs pra deps estaveis no setter/effect (evita refazer callbacks a cada
  // render quando o consumidor passa parse/serialize inline).
  const parseRef = useRef(parse);
  const serializeRef = useRef(serialize);
  parseRef.current = parse;
  serializeRef.current = serialize;

  const [valor, setValorState] = useState<T>(() => {
    const raw = lerUrlParam(paramUrl);
    if (raw !== null) return parse(raw);
    return defaultValue;
  });

  const setValor = useCallback((next: T) => {
    setValorState(next);
    const str = serializeRef.current(next);
    if (paramUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (str) url.searchParams.set(paramUrl, str);
      else url.searchParams.delete(paramUrl);
      window.history.replaceState({}, "", url.toString());
    }
    const k = chaveStorage(scope, nome, uid);
    if (k && typeof window !== "undefined") {
      try { window.localStorage.setItem(k, str); } catch { /* ignore */ }
    }
  }, [scope, nome, uid, paramUrl]);

  // Hidratacao: roda quando uid fica disponivel (login / troca de conta).
  // URL tem prioridade — se ja tem o param, nao sobrescreve com storage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (uid === undefined || uid === null) return;
    if (paramUrl && lerUrlParam(paramUrl) !== null) return;
    const k = chaveStorage(scope, nome, uid);
    if (!k) return;
    try {
      const raw = window.localStorage.getItem(k);
      if (raw === null) return;
      const proximo = parseRef.current(raw);
      // Comparacao via serialize garante igualdade estrutural (T pode ser
      // array/objeto cuja referencia muda mas o conteudo nao).
      const atualStr = serializeRef.current(valor);
      const proxStr = serializeRef.current(proximo);
      if (proxStr !== atualStr) setValor(proximo);
    } catch { /* ignore */ }
    // Roda so quando o uid muda — `valor` e referenciado via closure mas o
    // efeito so dispara na hidratacao inicial / troca de conta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, scope, nome, paramUrl]);

  return [valor, setValor];
}
