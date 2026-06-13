/**
 * juridico.ts — motor PURO de transmutacao juridica do Pactor.
 *
 * Kaizen-first: NAO recria texto legal. Os textos reais vivem na tabela
 * termos_juridicos do PAWARDS (IHE). Este motor PUXA esses textos (recebidos
 * por parametro), aplica placeholders com os dados do tratamento + financeiro,
 * e monta o documento final.
 *
 * Tipos de documento: RAS_PREMIUM, RAS_SIMPLES, RAS_JURIDICO,
 * CONTRATO_COMPLETO, DISTRATO.
 *
 * DISTRATO e categoria 9 NOVA (decisao do cacique + Dr. Claude, 13/06/2026):
 * este motor monta apenas o ESQUELETO com placeholders e marcadores
 * [REVISAR COM ADVOGADO]. NUNCA inventa clausula legal definitiva. O texto
 * final do distrato passa por advogado antes de uso com paciente.
 *
 * Fail-closed: placeholder sem valor vira marcador visivel [FALTA: chave],
 * nunca preenchimento silencioso.
 *
 * Sem PDF/UI/banco — 100% testavel.
 */

export type CategoriaJuridica =
  | "lgpd"
  | "privacidade"
  | "nao_garantia"
  | "tcle_global"
  | "consentimento_especifico"
  | "imagem"
  | "aceite_digital"
  | "ciencia_financeira"
  | "distrato";

/** Ordem canonica das categorias no contrato completo. */
export const CATEGORIAS_JURIDICAS: CategoriaJuridica[] = [
  "lgpd",
  "privacidade",
  "nao_garantia",
  "tcle_global",
  "consentimento_especifico",
  "imagem",
  "aceite_digital",
  "ciencia_financeira",
  "distrato",
];

export type TipoDocumento =
  | "RAS_PREMIUM"
  | "RAS_SIMPLES"
  | "RAS_JURIDICO"
  | "CONTRATO_COMPLETO"
  | "DISTRATO";

export interface TermoJuridico {
  categoria: CategoriaJuridica;
  titulo: string;
  textoCompleto: string;
  versao: number;
  ativo?: boolean;
  riscosEspecificos?: string[];
}

export interface ItemTratamento {
  nome: string;
  dose?: string;
  via?: string;
  sessoes?: number;
  frequencia?: string;
  justificativa?: string;
}

export interface DadosPaciente {
  nome: string;
  codigo: string;
}

export interface DadosFinanceiro {
  totalItens: number;
  honorarios: number;
  total: number;
  cenario?: string;
  parcelas?: string;
}

export interface ContextoTransmutacao {
  paciente: DadosPaciente;
  tratamento: ItemTratamento[];
  financeiro: DadosFinanceiro;
  dataEmissao?: string;
  unidade?: string;
}

export interface DocumentoMontado {
  tipo: TipoDocumento;
  titulo: string;
  corpo: string;
  categoriasUsadas: CategoriaJuridica[];
  requerRevisaoAdvogado: boolean;
  placeholdersNaoResolvidos: string[];
  avisos: string[];
}

/** Categorias que entram no RAS Juridico (ligadas ao tratamento e ao financeiro). */
export const CATEGORIAS_RAS_JURIDICO: CategoriaJuridica[] = [
  "tcle_global",
  "consentimento_especifico",
  "nao_garantia",
  "ciencia_financeira",
];

/** Esqueleto do DISTRATO — categoria 9 nova. Placeholders + revisao de advogado. */
export const DISTRATO_ESQUELETO = [
  "INSTRUMENTO DE DISTRATO / RESCISAO DE TRATAMENTO",
  "",
  "PACIENTE: {{paciente.nome}} ({{paciente.codigo}})",
  "UNIDADE: {{unidade}}",
  "DATA: {{data.emissao}}",
  "",
  "1. OBJETO",
  "1.1. Rescisao do tratamento abaixo descrito, a pedido do paciente durante a vigencia.",
  "",
  "2. TRATAMENTO EM CURSO",
  "{{tratamento.itens}}",
  "",
  "3. SITUACAO FINANCEIRA",
  "3.1. Total do tratamento: {{financeiro.total}}",
  "3.2. Condicao contratada: {{financeiro.cenario}} ({{financeiro.parcelas}})",
  "",
  "4. CLAUSULA DE RESCISAO",
  "4.1. [REVISAR COM ADVOGADO] — condicoes de rescisao, valores devidos e retencoes.",
  "",
  "5. QUITACAO E EFEITOS",
  "5.1. [REVISAR COM ADVOGADO] — termos de quitacao apos a rescisao.",
  "",
  "OBS: ESTE DOCUMENTO E UM ESQUELETO. O TEXTO LEGAL DEFINITIVO DEVE SER",
  "REVISADO POR ADVOGADO ANTES DE USO COM PACIENTE.",
].join("\n");

/** Formata numero como Real brasileiro, deterministico (sem depender de locale). */
export function formatarBRL(valor: number | string): string {
  let n = Number(valor) || 0;
  if (!Number.isFinite(n)) n = 0;
  const inteiro = Math.abs(n);
  const s = inteiro
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + "R$ " + s;
}

/** Soma defensiva das sessoes de uma lista de itens. */
export function somarSessoes(itens: ItemTratamento[] | null | undefined): number {
  const lista = itens || [];
  let t = 0;
  for (let i = 0; i < lista.length; i++) t += Number(lista[i].sessoes) || 0;
  return t;
}

/** Renderiza o bloco de itens do tratamento como texto (detalhado ou condensado). */
export function formatarTratamento(
  itens: ItemTratamento[] | null | undefined,
  detalhado: boolean,
): string {
  const lista = itens || [];
  if (lista.length === 0) return "[FALTA: tratamento.itens]";
  const linhas: string[] = [];
  for (let i = 0; i < lista.length; i++) {
    const it = lista[i];
    const dose = it.dose ? " " + it.dose : "";
    const via = it.via ? " | Via: " + it.via : "";
    const sessoes = it.sessoes != null ? " | Sessoes: " + it.sessoes : "";
    if (detalhado) {
      const freq = it.frequencia ? " | Frequencia: " + it.frequencia : "";
      linhas.push("- " + it.nome + dose + via + sessoes + freq);
      if (it.justificativa) linhas.push("  JUSTIFICATIVA: " + it.justificativa);
    } else {
      linhas.push("- " + it.nome + via + sessoes);
    }
  }
  return linhas.join("\n");
}

/** Monta o mapa de placeholders a partir do contexto. */
export function montarMapaPlaceholders(
  ctx: ContextoTransmutacao,
  detalhado: boolean,
): Record<string, string> {
  const fin = ctx.financeiro;
  return {
    "paciente.nome": ctx.paciente?.nome || "",
    "paciente.codigo": ctx.paciente?.codigo || "",
    "tratamento.itens": formatarTratamento(ctx.tratamento, detalhado),
    "tratamento.totalSessoes": String(somarSessoes(ctx.tratamento)),
    "financeiro.totalItens": formatarBRL(fin?.totalItens ?? 0),
    "financeiro.honorarios": formatarBRL(fin?.honorarios ?? 0),
    "financeiro.total": formatarBRL(fin?.total ?? 0),
    "financeiro.cenario": fin?.cenario || "",
    "financeiro.parcelas": fin?.parcelas || "",
    "data.emissao": ctx.dataEmissao || "",
    unidade: ctx.unidade || "",
  };
}

export interface ResultadoPlaceholders {
  texto: string;
  naoResolvidos: string[];
}

/**
 * Substitui {{chave}} pelo valor do mapa. Fail-closed: chave ausente ou vazia
 * vira marcador visivel [FALTA: chave] e entra na lista naoResolvidos.
 */
export function aplicarPlaceholders(
  texto: string,
  mapa: Record<string, string>,
): ResultadoPlaceholders {
  const naoResolvidos: string[] = [];
  const out = String(texto || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, chave: string) => {
    const v = mapa[chave];
    if (v == null || v === "") {
      if (naoResolvidos.indexOf(chave) === -1) naoResolvidos.push(chave);
      return "[FALTA: " + chave + "]";
    }
    return v;
  });
  return { texto: out, naoResolvidos };
}

/** Filtra termos ativos por categoria, na ordem das categorias pedidas. */
export function filtrarTermos(
  termos: TermoJuridico[] | null | undefined,
  categorias: CategoriaJuridica[],
): TermoJuridico[] {
  const lista = termos || [];
  const out: TermoJuridico[] = [];
  for (let c = 0; c < categorias.length; c++) {
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].ativo === false) continue;
      if (lista[i].categoria === categorias[c]) out.push(lista[i]);
    }
  }
  return out;
}

/**
 * Escolhe o termo VIGENTE de uma categoria: o ativo de maior versao.
 * Deterministico — evita usar texto desatualizado quando ha varias versoes.
 */
export function escolherVigente(
  termos: TermoJuridico[] | null | undefined,
  categoria: CategoriaJuridica,
): TermoJuridico | null {
  const lista = termos || [];
  let melhor: TermoJuridico | null = null;
  for (let i = 0; i < lista.length; i++) {
    const t = lista[i];
    if (t.ativo === false) continue;
    if (t.categoria !== categoria) continue;
    if (melhor === null || (Number(t.versao) || 0) > (Number(melhor.versao) || 0)) melhor = t;
  }
  return melhor;
}

function montarRas(ctx: ContextoTransmutacao, premium: boolean): { corpo: string; nao: string[] } {
  const mapa = montarMapaPlaceholders(ctx, premium);
  const linhas: string[] = [
    "RELATORIO DE ATENDIMENTO E SUGESTAO — " + (premium ? "PREMIUM" : "SIMPLES"),
    "PACIENTE: {{paciente.nome}} ({{paciente.codigo}})",
    "",
    "{{tratamento.itens}}",
  ];
  if (premium) {
    linhas.push(
      "",
      "RESUMO FINANCEIRO",
      "Itens do tratamento: {{financeiro.totalItens}}",
      "Honorarios / aplicacoes: {{financeiro.honorarios}}",
      "Total geral: {{financeiro.total}}",
    );
  }
  const res = aplicarPlaceholders(linhas.join("\n"), mapa);
  return { corpo: res.texto, nao: res.naoResolvidos };
}

function montarPorCategorias(
  termos: TermoJuridico[] | null | undefined,
  categorias: CategoriaJuridica[],
  ctx: ContextoTransmutacao,
  injetarTratamento: boolean,
): { corpo: string; usadas: CategoriaJuridica[]; nao: string[] } {
  const mapa = montarMapaPlaceholders(ctx, true);
  const blocos: string[] = [];
  const usadas: CategoriaJuridica[] = [];
  const naoTodos: string[] = [];

  if (injetarTratamento) {
    const cab = aplicarPlaceholders(
      [
        "PACIENTE: {{paciente.nome}} ({{paciente.codigo}})",
        "",
        "TRATAMENTO:",
        "{{tratamento.itens}}",
        "",
        "FINANCEIRO: total {{financeiro.total}} — {{financeiro.cenario}} ({{financeiro.parcelas}})",
      ].join("\n"),
      mapa,
    );
    blocos.push(cab.texto);
    for (const k of cab.naoResolvidos) if (naoTodos.indexOf(k) === -1) naoTodos.push(k);
  }

  // Uma categoria = um termo vigente (maior versao ativa), na ordem pedida.
  for (let c = 0; c < categorias.length; c++) {
    const t = escolherVigente(termos, categorias[c]);
    if (t === null) continue;
    const res = aplicarPlaceholders(t.titulo + "\n\n" + t.textoCompleto, mapa);
    blocos.push(res.texto);
    if (usadas.indexOf(t.categoria) === -1) usadas.push(t.categoria);
    for (const k of res.naoResolvidos) if (naoTodos.indexOf(k) === -1) naoTodos.push(k);
  }
  return { corpo: blocos.join("\n\n---\n\n"), usadas, nao: naoTodos };
}

/**
 * Monta um documento juridico do Pactor a partir dos termos reais (puxados do
 * termos_juridicos do IHE) e do contexto do tratamento.
 */
export function montarDocumento(
  tipo: TipoDocumento,
  termos: TermoJuridico[] | null | undefined,
  ctx: ContextoTransmutacao,
): DocumentoMontado {
  const avisos: string[] = [];

  if (tipo === "RAS_PREMIUM" || tipo === "RAS_SIMPLES") {
    const r = montarRas(ctx, tipo === "RAS_PREMIUM");
    return {
      tipo,
      titulo: "RAS " + (tipo === "RAS_PREMIUM" ? "Premium" : "Simples"),
      corpo: r.corpo,
      categoriasUsadas: [],
      requerRevisaoAdvogado: false,
      placeholdersNaoResolvidos: r.nao,
      avisos,
    };
  }

  if (tipo === "RAS_JURIDICO") {
    const r = montarPorCategorias(termos, CATEGORIAS_RAS_JURIDICO, ctx, true);
    if (r.usadas.length === 0) avisos.push("Nenhum termo juridico encontrado para o RAS Juridico.");
    return {
      tipo,
      titulo: "RAS Juridico",
      corpo: r.corpo,
      categoriasUsadas: r.usadas,
      requerRevisaoAdvogado: false,
      placeholdersNaoResolvidos: r.nao,
      avisos,
    };
  }

  if (tipo === "CONTRATO_COMPLETO") {
    const base = CATEGORIAS_JURIDICAS.filter((c) => c !== "distrato");
    const r = montarPorCategorias(termos, base, ctx, true);
    if (r.usadas.length === 0) avisos.push("Nenhum termo juridico encontrado para o contrato.");
    return {
      tipo,
      titulo: "Contrato Completo",
      corpo: r.corpo,
      categoriasUsadas: r.usadas,
      requerRevisaoAdvogado: false,
      placeholdersNaoResolvidos: r.nao,
      avisos,
    };
  }

  // DISTRATO — categoria 9 nova. Usa termo distrato se ja existir (revisado),
  // senao monta o esqueleto. Sempre exige revisao de advogado.
  const mapa = montarMapaPlaceholders(ctx, true);
  const distratoVigente = escolherVigente(termos, "distrato");
  const base =
    distratoVigente !== null
      ? distratoVigente.titulo + "\n\n" + distratoVigente.textoCompleto
      : DISTRATO_ESQUELETO;
  if (distratoVigente === null) {
    avisos.push("Distrato sem termo cadastrado: usando esqueleto. Texto legal deve ser revisado por advogado.");
  }
  const res = aplicarPlaceholders(base, mapa);
  return {
    tipo: "DISTRATO",
    titulo: "Distrato",
    corpo: res.texto,
    categoriasUsadas: ["distrato"],
    requerRevisaoAdvogado: true,
    placeholdersNaoResolvidos: res.naoResolvidos,
    avisos,
  };
}
