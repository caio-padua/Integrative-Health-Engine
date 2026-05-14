import {
  parsePosologia,
  formatarPosologiaLinhas,
  type PosologiaEstruturada,
} from "@workspace/posologia";

/**
 * Renderiza a posologia em blocos visualmente distintos no PDF — Task #240.
 *
 * Quando o parser interpreta o texto e identifica `fases` (escalonamento por
 * semanas), `ciclo` (uso intermitente on/off), `tomadas` (manhã/tarde/noite
 * com quantidades distintas) ou `quantidadeRange` (faixa min–max por
 * tomada), cada estrutura ganha sua própria linha indentada abaixo da
 * frase base. Quando `interpretado=false`, mantém o fallback em raw
 * (uma única linha com o texto original).
 *
 * O helper usa o estado de fonte/cor já configurado pelo chamador — assim
 * cada PDF (rasxPdf, rasxMotorPdf, docsPdf) preserva seu próprio
 * tipo/cor sem precisar de parâmetros extras.
 *
 * @param doc      documento PDFKit em curso
 * @param entrada  ou texto bruto, ou estrutura já parseada (cache do banco)
 * @param x        coluna esquerda da frase base
 * @param y        topo do bloco
 * @param width    largura disponível (para wrap)
 * @param opts.indent indent dos blocos extras (default 14px)
 * @param opts.lineGap espaço vertical entre linhas (default 2px)
 * @returns y final após desenhar todos os blocos
 */
export function desenharPosologiaBlocos(
  doc: PDFKit.PDFDocument,
  entrada: string | null | undefined | PosologiaEstruturada,
  x: number,
  y: number,
  width: number,
  opts: { indent?: number; lineGap?: number; prefixoBase?: string } = {},
): number {
  const indent = opts.indent ?? 14;
  const lineGap = opts.lineGap ?? 2;
  const prefixo = opts.prefixoBase ?? "";

  const estrutura =
    typeof entrada === "string" || entrada === null || entrada === undefined
      ? parsePosologia(entrada ?? "")
      : entrada;

  // Sem texto algum — devolve traço pra manter alinhamento.
  if (!estrutura.raw) {
    doc.text(`${prefixo}—`, x, y, { width });
    return y + doc.heightOfString("—", { width }) + lineGap;
  }

  const linhas = formatarPosologiaLinhas(estrutura);
  const baseTexto = `${prefixo}${linhas.fraseBase}`;
  doc.text(baseTexto, x, y, { width });
  let cursor = y + doc.heightOfString(baseTexto, { width }) + lineGap;

  const xExtra = x + indent;
  const widthExtra = Math.max(40, width - indent);

  if (linhas.quantidadeRange) {
    const t = `• ${linhas.quantidadeRange}`;
    doc.text(t, xExtra, cursor, { width: widthExtra });
    cursor += doc.heightOfString(t, { width: widthExtra }) + lineGap;
  }

  if (linhas.tomadas && linhas.tomadas.length > 0) {
    for (const linha of linhas.tomadas) {
      const t = `• ${linha}`;
      doc.text(t, xExtra, cursor, { width: widthExtra });
      cursor += doc.heightOfString(t, { width: widthExtra }) + lineGap;
    }
  }

  if (linhas.ciclo) {
    const t = `• ${linhas.ciclo}`;
    doc.text(t, xExtra, cursor, { width: widthExtra });
    cursor += doc.heightOfString(t, { width: widthExtra }) + lineGap;
  }

  if (linhas.fases && linhas.fases.length > 0) {
    const titulo = "• Escalonamento:";
    doc.text(titulo, xExtra, cursor, { width: widthExtra });
    cursor += doc.heightOfString(titulo, { width: widthExtra }) + lineGap;
    const xFase = xExtra + indent;
    const widthFase = Math.max(40, widthExtra - indent);
    for (const fase of linhas.fases) {
      doc.text(fase, xFase, cursor, { width: widthFase });
      cursor += doc.heightOfString(fase, { width: widthFase }) + lineGap;
    }
  }

  return cursor;
}
