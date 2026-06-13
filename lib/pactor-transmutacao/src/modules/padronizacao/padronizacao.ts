/**
 * padronizacao.ts — motor PURO de padronizacao de nomes de substancia.
 *
 * Transmutado de docs/dr-replit/ras-kaizen-v8/Padronizacao.gs (Apps Script)
 * para TypeScript puro, destino: Pactor (artifacts/padcom/src/modules/padronizacao/).
 * Sem Sheet/UI/banco — 100% testavel.
 *
 * Regra de ouro: a IDENTIDADE da substancia e NOME + DOSE juntos
 *   ("Coenzima Q10 100mg"); doses diferentes = itens diferentes do catalogo.
 * Fail-closed: sem correspondencia segura retorna null, nunca chuta dose.
 */

export const ACRONIMOS_SUBSTANCIA: Record<string, number> = {
  NAC: 1, DMSA: 1, HCG: 1, DHEA: 1, PQQ: 1, ADEK: 1, NAD: 1, DMAE: 1,
  EV: 1, IM: 1, SC: 1, UI: 1,
  AOD: 1, PT: 1, CJC: 1, BPC: 1, TB: 1, GLOW: 1, MOTS: 1, GHK: 1,
};

export interface ItemCatalogo {
  nome: string;
  dosagem: string;
}

export interface Apelido {
  de: string;
  para: string;
  status?: string;
}

export interface ApelidoIndexado {
  para: string;
  status: string;
}

export type ViaResolucao = "APELIDO" | "CATALOGO";

export interface ResolucaoSubstancia {
  canonico: string;
  nome: string;
  dosagem: string;
  via: ViaResolucao;
}

export interface Ocorrencia {
  aba: string;
  linha: number;
  texto: string;
}

export interface ItemPlanoVarredura {
  aba: string;
  linha: number;
  de: string;
  para: string;
  status: "OK" | "SEM_CORRESPONDENCIA";
  via: string;
  mudou: boolean;
}

export function removerAcentos(valor: string | null | undefined): string {
  return String(valor == null ? "" : valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tituloPalavra(palavra: string): string {
  if (!palavra) return "";
  return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
}

export function ehTokenCodigo(palavra: string): boolean {
  return /[0-9]/.test(palavra) || palavra.indexOf("+") >= 0;
}

export function normalizarTokenBase(palavra: string): string {
  if (!palavra) return "";
  if (ehTokenCodigo(palavra)) return palavra.toUpperCase();
  if (palavra.length === 1) return palavra.toUpperCase();
  if (ACRONIMOS_SUBSTANCIA[palavra.toUpperCase()]) return palavra.toUpperCase();
  return tituloPalavra(palavra);
}

export function normalizarPalavra(palavra: string): string {
  if (!palavra) return "";
  if (ehTokenCodigo(palavra)) return palavra.toUpperCase();
  if (palavra.length === 1) return palavra.toUpperCase();
  if (ACRONIMOS_SUBSTANCIA[palavra.toUpperCase()]) return palavra.toUpperCase();
  if (palavra.indexOf("-") >= 0) {
    return palavra.split("-").map(normalizarTokenBase).join("-");
  }
  return tituloPalavra(palavra);
}

export function padronizarNomeSubstancia(nome: string): string {
  const limpo = removerAcentos(nome).replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  return limpo.split(" ").map(normalizarPalavra).join(" ");
}

export function padronizarDosagem(dosagem: string): string {
  const limpo = removerAcentos(dosagem).replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  const m = limpo.match(/^([0-9][0-9.,]*)\s*(mcg|mg|kg|ml|ui|g|l)$/i);
  if (m) return m[1] + m[2].toLowerCase();
  return limpo.toLowerCase();
}

export function montarNomeCanonico(nome: string, dosagem: string): string {
  const n = padronizarNomeSubstancia(nome);
  const d = padronizarDosagem(dosagem);
  return d ? `${n} ${d}` : n;
}

export function chaveBusca(valor: string): string {
  return removerAcentos(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extrairDoseLivre(texto: string): string {
  const s = removerAcentos(texto).toLowerCase();
  const m = s.match(/([0-9][0-9.,]*)\s*(mcg|mg|kg|ml|ui|g|l)(?![a-z])/);
  return m ? m[1] + m[2] : "";
}

export function indexarApelidos(
  apelidos: Apelido[] | null | undefined,
): Record<string, ApelidoIndexado> {
  const idx: Record<string, ApelidoIndexado> = {};
  const lista = apelidos || [];
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    const chave = chaveBusca(a.de);
    let status = String(a.status == null ? "ATIVO" : a.status).trim().toUpperCase();
    if (!status) status = "ATIVO";
    if (chave) idx[chave] = { para: a.para || "", status };
  }
  return idx;
}

export function acharPorCanonico(
  para: string,
  catalogo: ItemCatalogo[] | null | undefined,
): ItemCatalogo | null {
  const alvo = chaveBusca(para);
  if (!alvo) return null;
  const cat = catalogo || [];
  for (let i = 0; i < cat.length; i++) {
    if (chaveBusca(montarNomeCanonico(cat[i].nome, cat[i].dosagem)) === alvo) {
      return cat[i];
    }
  }
  return null;
}

export function resolverSubstanciaCanonica(
  textoLivre: string,
  catalogo: ItemCatalogo[] | null | undefined,
  apelidos?: Apelido[] | null,
): ResolucaoSubstancia | null {
  const alvo = chaveBusca(textoLivre);
  if (!alvo) return null;
  const cat = catalogo || [];

  const idx = indexarApelidos(apelidos);
  if (idx[alvo]) {
    const ap = idx[alvo];
    if (ap.status !== "ATIVO" || !ap.para) return null;
    const alvoCat = acharPorCanonico(ap.para, cat);
    if (!alvoCat) return null;
    return {
      canonico: montarNomeCanonico(alvoCat.nome, alvoCat.dosagem),
      nome: alvoCat.nome,
      dosagem: alvoCat.dosagem,
      via: "APELIDO",
    };
  }

  const alvoComEspaco = alvo + " ";
  let melhorComprimento = -1;
  for (let i = 0; i < cat.length; i++) {
    const k = chaveBusca(cat[i].nome);
    if (!k) continue;
    if ((alvo === k || alvoComEspaco.indexOf(k + " ") === 0) && k.length > melhorComprimento) {
      melhorComprimento = k.length;
    }
  }
  if (melhorComprimento < 0) return null;

  const candidatos: ItemCatalogo[] = [];
  for (let j = 0; j < cat.length; j++) {
    const kj = chaveBusca(cat[j].nome);
    if ((alvo === kj || alvoComEspaco.indexOf(kj + " ") === 0) && kj.length === melhorComprimento) {
      candidatos.push(cat[j]);
    }
  }

  let escolhido: ItemCatalogo | null = null;
  const dose = extrairDoseLivre(textoLivre);
  if (candidatos.length === 1) {
    if (dose && padronizarDosagem(candidatos[0].dosagem) !== dose) return null;
    escolhido = candidatos[0];
  } else if (dose) {
    const bate = candidatos.filter((c) => padronizarDosagem(c.dosagem) === dose);
    if (bate.length === 1) escolhido = bate[0];
  }
  if (!escolhido) return null;

  return {
    canonico: montarNomeCanonico(escolhido.nome, escolhido.dosagem),
    nome: escolhido.nome,
    dosagem: escolhido.dosagem,
    via: "CATALOGO",
  };
}

export function planejarVarredura(
  ocorrencias: Ocorrencia[] | null | undefined,
  catalogo: ItemCatalogo[] | null | undefined,
  apelidos?: Apelido[] | null,
): ItemPlanoVarredura[] {
  const out: ItemPlanoVarredura[] = [];
  const lista = ocorrencias || [];
  for (let i = 0; i < lista.length; i++) {
    const o = lista[i];
    const r = resolverSubstanciaCanonica(o.texto, catalogo, apelidos);
    out.push({
      aba: o.aba,
      linha: o.linha,
      de: o.texto,
      para: r ? r.canonico : o.texto,
      status: r ? "OK" : "SEM_CORRESPONDENCIA",
      via: r ? r.via : "",
      mudou: r ? r.canonico !== o.texto : false,
    });
  }
  return out;
}
