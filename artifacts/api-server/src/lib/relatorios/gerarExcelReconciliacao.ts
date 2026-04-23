// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B6 · Excel reconciliacao (3 abas)
// 1) Resumo Mensal  2) Detalhe por Receita  3) Repasses Registrados
//
// Usa xlsx (ja instalado no api-server, mais leve que exceljs).
// ════════════════════════════════════════════════════════════════════
import * as XLSX from "xlsx";
import { iniciaisPaciente } from "./iniciaisLgpd.js";

export type DadosExcelReconciliacao = {
  farmacia: { id: number; nome: string; percentual_comissao: number };
  periodo: { inicio: string; fim: string };
  protocolo: string;
  serie_mensal: Array<{
    mes: string;
    qtd_receitas: number;
    previsto: number;
    declarado: number;
    recebido: number;
    gap: number;
  }>;
  receitas: Array<{
    id: number;
    numero_receita?: string | null;
    data: string;
    paciente_nome: string | null;
    valor_formula: number | null;
    comissao_devida: number | null;
    declarado: boolean;
    pago: boolean;
  }>;
  repasses: Array<{
    ano_mes: string;
    valor_repasse: number;
    data_recebido: string;
    evidencia_texto?: string | null;
  }>;
};

export function gerarExcelReconciliacao(d: DadosExcelReconciliacao): Buffer {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Reconciliação ${d.farmacia.nome} ${d.periodo.inicio}-${d.periodo.fim}`,
    Author: "PAWARDS MEDCORE",
    Company: "PAWARDS MEDCORE",
    CreatedDate: new Date(),
  };

  // ─── Aba 1: Resumo Mensal ───
  const aba1Header = [
    ["PAWARDS MEDCORE — Relatório de Reconciliação PARMAVAULT"],
    [`Farmácia: ${d.farmacia.nome}`, `% Comissão: ${Number(d.farmacia.percentual_comissao).toFixed(2)}%`],
    [`Período: ${d.periodo.inicio} a ${d.periodo.fim}`, `Protocolo: ${d.protocolo}`],
    [],
    ["Mês", "Qtd Receitas", "Previsto (R$)", "Declarado (R$)", "Recebido (R$)", "GAP (R$)", "GAP (%)"],
  ];
  const aba1Rows = d.serie_mensal.map((m) => [
    m.mes,
    m.qtd_receitas,
    Number(m.previsto || 0),
    Number(m.declarado || 0),
    Number(m.recebido || 0),
    Number(m.gap || 0),
    m.previsto > 0 ? +((m.gap / m.previsto) * 100).toFixed(2) : 0,
  ]);
  // Total
  const tot = d.serie_mensal.reduce(
    (acc, m) => ({
      qtd: acc.qtd + Number(m.qtd_receitas || 0),
      prev: acc.prev + Number(m.previsto || 0),
      decl: acc.decl + Number(m.declarado || 0),
      rec: acc.rec + Number(m.recebido || 0),
      gap: acc.gap + Number(m.gap || 0),
    }),
    { qtd: 0, prev: 0, decl: 0, rec: 0, gap: 0 },
  );
  aba1Rows.push([
    "TOTAL",
    tot.qtd,
    tot.prev,
    tot.decl,
    tot.rec,
    tot.gap,
    tot.prev > 0 ? +((tot.gap / tot.prev) * 100).toFixed(2) : 0,
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([...aba1Header, ...aba1Rows]);
  ws1["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo Mensal");

  // ─── Aba 2: Detalhe por Receita ───
  const aba2Header = [
    ["DETALHE POR RECEITA — Pacientes em iniciais (LGPD)"],
    [`Farmácia: ${d.farmacia.nome}`, `Protocolo: ${d.protocolo}`],
    [],
    ["Receita ID", "Nº Receita", "Data", "Paciente (iniciais)", "Valor Fórmula (R$)", "Comissão Devida (R$)", "Declarado", "Pago", "Status"],
  ];
  const aba2Rows = d.receitas.map((r) => [
    r.id,
    r.numero_receita ?? "",
    r.data,
    iniciaisPaciente(r.paciente_nome),
    Number(r.valor_formula || 0),
    Number(r.comissao_devida || 0),
    r.declarado ? "Sim" : "Não",
    r.pago ? "Sim" : "Não",
    r.pago ? "Pago" : r.declarado ? "Declarado" : "Pendente",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...aba2Header, ...aba2Rows]);
  ws2["!cols"] = [
    { wch: 10 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Detalhe por Receita");

  // ─── Aba 3: Repasses Registrados ───
  const aba3Header = [
    ["REPASSES REGISTRADOS — entradas reais de dinheiro"],
    [`Farmácia: ${d.farmacia.nome}`, `Protocolo: ${d.protocolo}`],
    [],
    ["Ano-Mês", "Valor Repasse (R$)", "Data Recebido", "Evidência"],
  ];
  const aba3Rows = d.repasses.map((rp) => [
    rp.ano_mes,
    Number(rp.valor_repasse || 0),
    rp.data_recebido,
    rp.evidencia_texto ?? "",
  ]);
  const totalRepasses = d.repasses.reduce((s, r) => s + Number(r.valor_repasse || 0), 0);
  aba3Rows.push(["TOTAL", totalRepasses, "", ""]);
  const ws3 = XLSX.utils.aoa_to_sheet([...aba3Header, ...aba3Rows]);
  ws3["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Repasses Registrados");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf as Buffer;
}
