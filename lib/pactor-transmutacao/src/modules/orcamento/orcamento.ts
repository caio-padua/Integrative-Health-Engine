/**
 * orcamento.ts — motor PURO de orcamento.
 *
 * Transmutado de docs/dr-replit/ras-kaizen-v8/Orcamento.gs (Apps Script) para
 * TypeScript puro, destino: Pactor (artifacts/padcom/src/modules/orcamento/).
 * Sem Sheet/UI/banco — 100% testavel ao centavo.
 *
 * Parametros de desconto vem da planilha real do CEO (paciente Luciano, total
 * 15960): a vista 15% | entrada 50% com 10% | entrada 30% com 5% | calc livre.
 * Decisao clinica/comercial do CEO — NAO inventar outros parametros.
 */

export interface OrcamentoConfig {
  descAVistaPct: number;
  cenarioBEntradaPct: number;
  cenarioBDescPct: number;
  cenarioCEntradaPct: number;
  cenarioCDescPct: number;
  parcelasPadrao: number[];
  diasPorMes: number;
}

export const ORCAMENTO_CONFIG: OrcamentoConfig = {
  descAVistaPct: 15,
  cenarioBEntradaPct: 50,
  cenarioBDescPct: 10,
  cenarioCEntradaPct: 30,
  cenarioCDescPct: 5,
  parcelasPadrao: [1, 2, 3],
  diasPorMes: 30,
};

export interface ItemEscolhido {
  nome: string;
  dosagem?: string;
  sessoes?: number | null;
  incluir?: boolean;
}

export interface ItemCatalogoPreco {
  nome: string;
  dosagem?: string;
  via?: string;
  freqDias?: number;
  sessoes?: number;
  unit?: number;
  p3m?: number;
  p6m?: number;
  p12m?: number;
}

export interface ItemOrcamento {
  nome: string;
  dosagem: string;
  via: string;
  freqDias: number;
  sessoes: number;
  valorUnit: number;
  incluir: boolean;
  subtotal: number;
}

export interface FaixaPrecos {
  unit?: number;
  p3m?: number;
  p6m?: number;
  p12m?: number;
}

export interface CenarioAVista {
  valor: number;
  economia: number;
}

export interface CenarioEntrada {
  valorComDesconto: number;
  economia: number;
  entrada: number;
  saldo: number;
  parcelas: Record<number, number>;
}

export interface ParcelaComTaxa {
  totalComTaxa: number;
  valorParcela: number;
}

export type FormaPagamento = "avista" | "parcelado" | "entrada";

export interface LancamentoFinanceiro {
  paciente: string;
  valorTratamento: number;
  formaPagamento: string;
  valorEntrada: number;
  parcelas: number;
  valorParcela: number;
  receitaMensal: number;
  valorPago: number;
  valorPendente: number;
}

export function arredondar2(n: number | string): number {
  return Math.round((Number(n) + 1e-9) * 100) / 100;
}

export function calcularSubtotalItem(
  sessoes: number | string,
  valorUnit: number | string,
  incluir: boolean,
): number {
  if (!incluir) return 0;
  let s = Number(sessoes) || 0;
  let v = Number(valorUnit) || 0;
  if (s < 0) s = 0;
  if (v < 0) v = 0;
  return arredondar2(s * v);
}

export function calcularTotalOrcamento(
  itens: Array<{ sessoes: number | string; valorUnit: number | string; incluir: boolean }> | null | undefined,
): number {
  let t = 0;
  const lista = itens || [];
  for (let i = 0; i < lista.length; i++) {
    t += calcularSubtotalItem(lista[i].sessoes, lista[i].valorUnit, lista[i].incluir);
  }
  return arredondar2(t);
}

export function aplicarDesconto(total: number | string, descPct: number | string): number {
  const t = Number(total) || 0;
  let d = Number(descPct) || 0;
  if (d < 0) d = 0;
  if (d > 100) d = 100;
  return arredondar2(t * (1 - d / 100));
}

export function economiaDesconto(total: number | string, descPct: number | string): number {
  return arredondar2((Number(total) || 0) - aplicarDesconto(total, descPct));
}

export function cenarioAVista(total: number | string, descPct: number | string): CenarioAVista {
  return {
    valor: aplicarDesconto(total, descPct),
    economia: economiaDesconto(total, descPct),
  };
}

export function cenarioEntrada(
  total: number | string,
  descPct: number | string,
  entradaPct: number | string,
  listaParcelas?: number[] | null,
): CenarioEntrada {
  const valor = aplicarDesconto(total, descPct);
  let ep = Number(entradaPct) || 0;
  if (ep < 0) ep = 0;
  if (ep > 100) ep = 100;
  const ent = arredondar2(valor * (ep / 100));
  const saldo = arredondar2(valor - ent);
  const parc: Record<number, number> = {};
  const lp = listaParcelas || ORCAMENTO_CONFIG.parcelasPadrao;
  for (let i = 0; i < lp.length; i++) {
    let n = Number(lp[i]) || 1;
    if (n < 1) n = 1;
    parc[n] = arredondar2(saldo / n);
  }
  return {
    valorComDesconto: valor,
    economia: economiaDesconto(total, descPct),
    entrada: ent,
    saldo,
    parcelas: parc,
  };
}

export function parcelaComTaxa(
  saldo: number | string,
  parcelas: number | string,
  taxaPct: number | string,
): ParcelaComTaxa {
  let s = Number(saldo) || 0;
  if (s < 0) s = 0;
  let n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  let taxa = Number(taxaPct) || 0;
  if (taxa < 0) taxa = 0;
  const totalComTaxa = arredondar2(s * (1 + taxa / 100));
  return { totalComTaxa, valorParcela: arredondar2(totalComTaxa / n) };
}

export function receitaMensal(
  valor: number | string,
  forma: string,
  parcelas: number | string,
  entrada?: number | string,
): number {
  const v = Number(valor) || 0;
  let n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  if (forma === "avista") return arredondar2(v);
  if (forma === "entrada") {
    let saldo = arredondar2(v - (Number(entrada) || 0));
    if (saldo < 0) saldo = 0;
    return arredondar2(saldo / n);
  }
  return arredondar2(v / n);
}

export function mesesPrograma(
  itens: Array<{ sessoes?: number | string; freqDias?: number | string; incluir?: boolean }> | null | undefined,
): number {
  let maxDias = 0;
  const lista = itens || [];
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].incluir) continue;
    const s = Number(lista[i].sessoes) || 0;
    const f = Number(lista[i].freqDias) || 0;
    const dias = s > 0 && f > 0 ? (s - 1) * f : 0;
    if (dias > maxDias) maxDias = dias;
  }
  const meses = Math.ceil(maxDias / ORCAMENTO_CONFIG.diasPorMes);
  return meses < 1 ? 1 : meses;
}

export function chaveSubstancia(nome: string, dosagem: string): string {
  return (String(nome || "").trim() + "|" + String(dosagem || "").trim())
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function precoPorFaixaMeses(precos: FaixaPrecos | null | undefined, meses: number | string): number {
  const p = precos || {};
  const m = Number(meses) || 0;
  if (m >= 12 && Number(p.p12m)) return Number(p.p12m);
  if (m >= 6 && Number(p.p6m)) return Number(p.p6m);
  if (m >= 3 && Number(p.p3m)) return Number(p.p3m);
  return Number(p.unit) || 0;
}

export function montarItensOrcamento(
  escolhidas: ItemEscolhido[] | null | undefined,
  catalogo: ItemCatalogoPreco[] | null | undefined,
  mesesProgramaValor: number,
): ItemOrcamento[] {
  const idx: Record<string, ItemCatalogoPreco> = {};
  const cat = catalogo || [];
  for (let i = 0; i < cat.length; i++) {
    idx[chaveSubstancia(cat[i].nome, cat[i].dosagem || "")] = cat[i];
  }
  const itens: ItemOrcamento[] = [];
  const esc = escolhidas || [];
  for (let j = 0; j < esc.length; j++) {
    const e = esc[j];
    const c = idx[chaveSubstancia(e.nome, e.dosagem || "")] || {};
    const incluir = e.incluir !== false;
    const sessoes = e.sessoes != null ? e.sessoes : c.sessoes || 0;
    const valorUnit = precoPorFaixaMeses(
      { unit: c.unit, p3m: c.p3m, p6m: c.p6m, p12m: c.p12m },
      mesesProgramaValor,
    );
    itens.push({
      nome: e.nome,
      dosagem: e.dosagem || "",
      via: c.via || "",
      freqDias: Number(c.freqDias) || 0,
      sessoes: Number(sessoes) || 0,
      valorUnit: arredondar2(valorUnit),
      incluir,
      subtotal: calcularSubtotalItem(sessoes, valorUnit, incluir),
    });
  }
  return itens;
}

export function montarLancamentoFinanceiro(
  paciente: string,
  valorTratamento: number | string,
  forma: string,
  parcelas: number | string,
  entrada: number | string,
): LancamentoFinanceiro {
  const v = arredondar2(Number(valorTratamento) || 0);
  let ent = arredondar2(Number(entrada) || 0);
  if (ent < 0) ent = 0;
  if (ent > v) ent = v;
  const saldo = arredondar2(v - ent);
  let n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  return {
    paciente: String(paciente || "").trim(),
    valorTratamento: v,
    formaPagamento: String(forma || "").trim(),
    valorEntrada: forma === "avista" ? 0 : ent,
    parcelas: forma === "avista" ? 1 : n,
    valorParcela: forma === "avista" ? 0 : arredondar2(saldo / n),
    receitaMensal: receitaMensal(v, forma, n, ent),
    valorPago: 0,
    valorPendente: v,
  };
}
