// Task #98 — extraido da timeline de assinaturas (Task #96) pra ficar
// reutilizavel em outras tabelas grandes (Pacientes, RAS, etc.).
//
// Padrao "Excel-like" de ordenacao multi-coluna:
//   - Clique simples: substitui a ordenacao pela coluna clicada (DESC).
//     Re-clicar a mesma coluna inverte (DESC -> ASC -> sem ordenacao).
//   - Shift+clique: appendiza a coluna como criterio secundario.
//     Re-Shift na mesma coluna inverte (DESC -> ASC -> remove deste grupo).
//   - Badge numerada (1, 2, 3...) so aparece quando ha 2+ colunas
//     ordenando, pra deixar claro qual e primaria e qual e secundaria.
//
// Os helpers aqui sao genericos em `Chave extends string`. A pagina
// consumidora define seu proprio enum de chaves (ex: "VALOR" | "CRIADO")
// e fornece o mapa Ordenacao -> token-de-URL (ex: VALOR_DESC -> "valor_desc").
// O backend revalida com whitelist propria (ver routes/assinaturas.ts e
// routes/pacientes.ts pra fragmentos SQL equivalentes).
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export type Ordenacao<K extends string> = `${K}_DESC` | `${K}_ASC`;

export function chaveDeOrdenacao<K extends string>(o: Ordenacao<K>): K {
  return o.replace(/_(DESC|ASC)$/, "") as K;
}

// Dedupe por coluna (mesmo criterio do backend) — primeira ocorrencia
// vence. Aplicado em todo lugar que cria lista (URL, storage, click).
export function dedupePorColuna<K extends string>(
  lista: Ordenacao<K>[],
  max: number,
): Ordenacao<K>[] {
  const seen = new Set<K>();
  const out: Ordenacao<K>[] = [];
  for (const o of lista) {
    const k = chaveDeOrdenacao(o);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
    if (out.length >= max) break;
  }
  return out;
}

export function parseOrdenacoesFromString<K extends string>(
  raw: string,
  urlToOrdenacao: Record<string, Ordenacao<K>>,
  max: number,
): Ordenacao<K>[] {
  if (!raw) return [];
  const lista: Ordenacao<K>[] = [];
  for (const bruto of raw.split(",")) {
    const t = bruto.trim().toLowerCase();
    const o = urlToOrdenacao[t];
    if (o) lista.push(o);
  }
  return dedupePorColuna(lista, max);
}

export function serializarOrdenacoes<K extends string>(
  lista: Ordenacao<K>[],
  ordenacaoToUrl: Record<Ordenacao<K>, string>,
): string {
  return lista.map((o) => ordenacaoToUrl[o]).join(",");
}

// Aplica regra de clique:
//   clique simples (shift=false):
//     - se a unica coluna ativa ja e essa em DESC -> vira ASC
//     - se a unica coluna ativa ja e essa em ASC -> volta pro padrao (lista vazia)
//     - caso contrario -> substitui a lista por [chave_DESC]
//   Shift+clique (shift=true):
//     - se a coluna nao esta na lista -> appendiza como _DESC
//     - se ja esta como _DESC -> inverte pra _ASC
//     - se ja esta como _ASC -> remove da lista
export function alternarOrdenacao<K extends string>(
  chave: K,
  shift: boolean,
  atual: Ordenacao<K>[],
): Ordenacao<K>[] {
  const desc = `${chave}_DESC` as Ordenacao<K>;
  const asc = `${chave}_ASC` as Ordenacao<K>;
  const idx = atual.findIndex((o) => chaveDeOrdenacao(o) === chave);
  if (shift) {
    if (idx === -1) return [...atual, desc];
    const cur = atual[idx]!;
    if (cur === desc) {
      const nova = [...atual];
      nova[idx] = asc;
      return nova;
    }
    // ASC -> remove deste grupo
    return atual.filter((_, i) => i !== idx);
  }
  // Clique simples
  if (atual.length === 1 && idx === 0) {
    const cur = atual[0]!;
    if (cur === desc) return [asc];
    return [];
  }
  return [desc];
}

// Componente de header de coluna clicavel. `align` controla justify
// do botao dentro da celula (right pra numeros, left/center pra texto/badge).
// `posicao` (1, 2, 3...) so aparece quando ha mais de uma coluna ordenando
// — pra ficar claro qual e a primaria e qual e secundaria, padrao Excel.
export function ColunaOrdenavel({
  label,
  ativaDesc,
  ativaAsc,
  posicao,
  onClick,
  testId,
  align = "left",
  corPadrao = "#020406",
  corAtiva = "#C89B3C",
}: {
  label: string;
  ativaDesc: boolean;
  ativaAsc: boolean;
  posicao?: number;
  onClick: (shift: boolean) => void;
  testId?: string;
  align?: "left" | "right" | "center";
  corPadrao?: string;
  corAtiva?: string;
}) {
  const ativa = ativaDesc || ativaAsc;
  const justify =
    align === "right"
      ? "justify-end"
      : align === "center"
      ? "justify-center"
      : "justify-start";
  const title = ativaDesc
    ? `${label}: maior/mais recente primeiro · clique p/ inverter · Shift+clique p/ adicionar como critério extra`
    : ativaAsc
    ? `${label}: menor/mais antigo primeiro · clique p/ voltar ao padrão · Shift+clique p/ remover deste grupo`
    : `Clique p/ ordenar por ${label} · Shift+clique p/ adicionar como critério secundário`;
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.shiftKey)}
      data-testid={testId}
      title={title}
      className={`inline-flex items-center gap-1 font-semibold cursor-pointer hover:opacity-70 w-full ${justify}`}
      style={{ color: ativa ? corAtiva : corPadrao }}
    >
      {label}
      {ativaDesc ? (
        <ArrowDown size={12} />
      ) : ativaAsc ? (
        <ArrowUp size={12} />
      ) : (
        <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
      )}
      {posicao !== undefined && posicao > 0 && (
        <span
          data-testid={testId ? `${testId}-posicao` : undefined}
          className="text-[10px] font-bold leading-none px-1 py-0.5 rounded"
          style={{ background: corAtiva, color: corPadrao }}
        >
          {posicao}
        </span>
      )}
    </button>
  );
}
