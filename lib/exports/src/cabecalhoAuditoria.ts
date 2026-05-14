/**
 * @workspace/exports — cabeçalho de auditoria compartilhado pra exports
 * (CSV/XLSX) do sistema PAWARDS.
 *
 * Origem: extração da Task #86 (timeline de assinaturas), generalizada na
 * Task #207 pra outros endpoints de export (matriz analítica, padcom, etc).
 *
 * Fecha o ciclo de auditoria do contador/advogado: ao abrir o arquivo
 * exportado eles veem imediatamente quais filtros estavam ativos, qual
 * ordenação foi aplicada, total de linhas, se houve truncamento e quando
 * o arquivo foi gerado — sem precisar voltar pra tela.
 */

/** Item genérico de metadado pra exportar como linha CSV ou linha de aba "Metadados". */
export interface ItemMetadadoExport {
  /** Rótulo human-readable (ex: "Unidade", "Status", "Ordenado por"). */
  campo: string;
  /** Valor já formatado pra leitura (ex: "todas", "ENVIADO|CONCLUIDO"). */
  valor: string;
}

/** Configuração da linha-resumo CSV / aba "Metadados" XLSX. */
export interface ConfigCabecalhoAuditoria {
  /**
   * Identificação do export (ex: "timeline assinaturas", "matriz analítica").
   * Vai compor a linha "# PAWARDS · {origem} · ..." do CSV e a linha
   * "Origem" da aba Metadados.
   */
  origem: string;
  /**
   * Itens de metadado na ordem em que devem aparecer (filtros aplicados,
   * ordenação, datas, total de linhas, etc).
   */
  itens: ItemMetadadoExport[];
  /** Quando true, anexa "Truncado=sim (cap N)" ao final. */
  truncado?: boolean;
  /** Limite aplicado, usado quando truncado=true pra compor o aviso. */
  limite?: number;
  /** Timestamp do export. Default = new Date(). */
  exportadoEm?: Date;
}

/** Escapa um valor pra célula CSV (aspas duplas + duplicação de aspas internas). */
function escaparCsv(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/**
 * Gera a linha-resumo CSV (única linha iniciada com "#") pra ser inserida
 * ANTES do header do arquivo. Convenção de comentário aceita por
 * contadores; envolta em aspas duplas pra Excel/LibreOffice não tentarem
 * dividir em colunas.
 *
 * Exemplo de saída:
 *   "# PAWARDS · timeline assinaturas · unidade=todas · status=todos · ..."
 */
export function gerarLinhaResumoCsv(config: ConfigCabecalhoAuditoria): string {
  const partes: string[] = [];
  for (const { campo, valor } of config.itens) {
    // normaliza chave: minúsculas, espaços/acentos viram underscore
    const chave = campo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    partes.push(`${chave}=${valor}`);
  }
  if (config.truncado) {
    partes.push(`truncado=sim (cap ${config.limite ?? "?"})`);
  } else {
    partes.push("truncado=nao");
  }
  const exportadoEm = (config.exportadoEm ?? new Date()).toISOString();
  partes.push(`exportado_em=${exportadoEm}`);
  return escaparCsv(`# PAWARDS · ${config.origem} · ${partes.join(" · ")}`);
}

/**
 * Linhas tabulares pra aba "Metadados" do XLSX. Cada item é um par
 * [campo, valor] pronto pra `ws.addRow({ campo, valor })`.
 *
 * Formato fixo: 1 linha "Origem" + N linhas dos itens recebidos +
 * (opcional) "Truncado" + "Exportado em".
 */
export function gerarLinhasMetadadosXlsx(
  config: ConfigCabecalhoAuditoria,
): Array<[string, string]> {
  const linhas: Array<[string, string]> = [
    ["Origem", `PAWARDS · ${config.origem}`],
  ];
  for (const { campo, valor } of config.itens) {
    linhas.push([campo, valor]);
  }
  if (config.truncado !== undefined) {
    linhas.push([
      "Truncado",
      config.truncado ? `sim (cap ${config.limite ?? "?"})` : "nao",
    ]);
  }
  if (config.limite !== undefined) {
    linhas.push(["Limite aplicado", String(config.limite)]);
  }
  const exportadoEm = (config.exportadoEm ?? new Date()).toISOString();
  linhas.push(["Exportado em", exportadoEm]);
  return linhas;
}

/**
 * Interface mínima de Worksheet (subset do ExcelJS) pra evitar
 * acoplamento direto. Permite que o lib não precise importar exceljs
 * como dependência hard — quem chama injeta o worksheet já criado.
 */
export interface WorksheetMetadadosLike {
  columns: Array<{ header: string; key: string; width?: number }>;
  addRow(data: Record<string, unknown>): { number: number };
  getRow(n: number): {
    font?: unknown;
    fill?: unknown;
    alignment?: unknown;
    height?: number;
  };
}

/**
 * Popula uma worksheet "Metadados" já criada (via ExcelJS ou compatível)
 * com colunas Campo/Valor + estilo institucional navy/gold no header +
 * as linhas geradas por `gerarLinhasMetadadosXlsx`.
 *
 * Idempotente em relação a `columns`: se o worksheet já tem colunas, não
 * sobrescreve.
 */
export function popularAbaMetadadosXlsx(
  ws: WorksheetMetadadosLike,
  config: ConfigCabecalhoAuditoria,
): void {
  if (!ws.columns || ws.columns.length === 0) {
    ws.columns = [
      { header: "Campo", key: "campo", width: 24 },
      { header: "Valor", key: "valor", width: 80 },
    ];
  }
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFC89B3C" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF020406" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  const sanitizarTexto = (v: string): string => {
    if (v.length > 0 && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
    return v;
  };
  for (const [campo, valor] of gerarLinhasMetadadosXlsx(config)) {
    ws.addRow({ campo: sanitizarTexto(campo), valor: sanitizarTexto(valor) });
  }
}
