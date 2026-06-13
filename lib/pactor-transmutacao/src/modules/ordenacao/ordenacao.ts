/**
 * ordenacao.ts — ordem por categoria das substancias, SO na geracao do RAS.
 *
 * Transmutado de docs/dr-replit/ras-kaizen-v8/OrdenacaoCategoriaRas.gs.
 * Decisao do CEO (11/06/2026, opcao A): o RAS sai organizado por categoria;
 * a TABELA/COCKPIT continuam como o cliente digitou (nada muda na origem).
 *
 * Logica PURA: opera so sobre o array em memoria. O catalogo (que no Apps
 * Script era o global CATALOGO_SUBSTANCIAS) entra por parametro — no Pactor
 * vem do banco. normalizeHeader_ vira normalizarNomeParaMatch (reusa
 * removerAcentos da Onda A).
 *
 * Ordem travada pelo CEO (1..7): antioxidante, vitamina (inclui COMPLEXO VIT.),
 * hormonio, esteroide, peptideo, mineral, demais.
 */

import { removerAcentos } from "../padronizacao/padronizacao.ts";

export interface SubstanciaCatalogoCategoria {
  nome: string;
  categoria?: string;
}

export interface SubstanciaOrdenavel {
  nome?: string;
  categoria?: string;
}

export function rankCategoria(categoria: string | null | undefined): number {
  const c = String(categoria || "").toUpperCase();
  if (c.indexOf("ANTIOX") !== -1) return 1;
  if (c.indexOf("COMPLEXO VIT") !== -1 || c.indexOf("VITAMIN") !== -1) return 2;
  if (c.indexOf("HORMON") !== -1) return 3;
  if (c.indexOf("ESTEROID") !== -1) return 4;
  if (c.indexOf("PEPTID") !== -1) return 5;
  if (c.indexOf("MINERAL") !== -1) return 6;
  return 7;
}

export function normalizarNomeParaMatch(nome: string | null | undefined): string {
  return removerAcentos(String(nome == null ? "" : nome))
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function categoriaCatalogo(
  nome: string | null | undefined,
  catalogo: SubstanciaCatalogoCategoria[] | null | undefined,
): string {
  const alvo = normalizarNomeParaMatch(nome);
  if (!alvo) return "";
  const cat = catalogo || [];
  for (let j = 0; j < cat.length; j++) {
    const catNome = normalizarNomeParaMatch(cat[j].nome);
    if (!catNome) continue;
    if (alvo.indexOf(catNome) !== -1 || catNome.indexOf(alvo) !== -1) {
      return String(cat[j].categoria || "");
    }
  }
  return "";
}

export function categoriaParaOrdenar(
  s: SubstanciaOrdenavel | null | undefined,
  catalogo?: SubstanciaCatalogoCategoria[] | null,
): string {
  if (s && s.categoria) return s.categoria;
  return categoriaCatalogo(s ? s.nome : "", catalogo);
}

export function ordenarSubstancias<T extends SubstanciaOrdenavel>(
  subs: T[] | null | undefined,
  catalogo?: SubstanciaCatalogoCategoria[] | null,
): T[] {
  const arr = (subs || []).slice();
  return arr
    .map((s, i) => ({ s, i, r: rankCategoria(categoriaParaOrdenar(s, catalogo)) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.s);
}
