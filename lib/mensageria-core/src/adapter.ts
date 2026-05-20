// ═══════════════════════════════════════════════════════════════════════
// 🔄 ADAPTER · texto canônico → formato do canal alvo
// Token-aware: escapa caracteres reservados APENAS em segmentos de
// texto (não nos marcadores), evitando Telegram MarkdownV2 400-error.
// ═══════════════════════════════════════════════════════════════════════
import type { Canal, InlineToken } from "./types.js";
import { CANAIS } from "./canais.js";
import { parseInline } from "./parser.js";

// MarkdownV2 — todos os reservados que devem ser escapados em TEXTO fora de marcadores
// ref: https://core.telegram.org/bots/api#markdownv2-style
const MV2_RESERVADOS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
function escMv2Texto(s: string): string { return s.replace(MV2_RESERVADOS, "\\$1"); }
// dentro de code/pre só `\` e `` ` `` precisam escape
function escMv2Code(s: string): string { return s.replace(/([`\\])/g, "\\$1"); }
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTokenWaWrap(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return t.texto;
    case "bold":      return `*${t.texto}*`;
    case "italic":    return `_${t.texto}_`;
    case "strike":    return `~${t.texto}~`;
    case "mono":      return `\`${t.texto}\``;
    case "underline": return t.texto; // WA não suporta → degrade
  }
}
function renderTokenMv2(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return escMv2Texto(t.texto);
    case "bold":      return `*${escMv2Texto(t.texto)}*`;
    case "italic":    return `_${escMv2Texto(t.texto)}_`;
    case "underline": return `__${escMv2Texto(t.texto)}__`;
    case "strike":    return `~${escMv2Texto(t.texto)}~`;
    case "mono":      return `\`${escMv2Code(t.texto)}\``;
  }
}
function renderTokenHtml(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return escHtml(t.texto);
    case "bold":      return `<b>${escHtml(t.texto)}</b>`;
    case "italic":    return `<i>${escHtml(t.texto)}</i>`;
    case "underline": return `<u>${escHtml(t.texto)}</u>`;
    case "strike":    return `<s>${escHtml(t.texto)}</s>`;
    case "mono":      return `<code>${escHtml(t.texto)}</code>`;
  }
}

export function adaptarParaCanal(texto: string, canal: Canal): string {
  const linhas = texto.split("\n");
  const render = canal === "telegram_mv2" ? renderTokenMv2
              : canal === "telegram_html" ? renderTokenHtml
              : renderTokenWaWrap;
  return linhas.map(l => parseInline(l).map(render).join("")).join("\n");
}

// Token degradado para render UI por canal: se canal não suporta o
// recurso, vira "text" puro para refletir a aparência REAL no destino.
export function tokenParaCanal(t: InlineToken, canal: Canal): InlineToken {
  const cap = CANAIS[canal].suporta;
  if (t.tipo === "bold"      && !cap.negrito)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "italic"    && !cap.italico)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "underline" && !cap.sublinhado) return { tipo: "text", texto: t.texto };
  if (t.tipo === "strike"    && !cap.tachado)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "mono"      && !cap.mono)       return { tipo: "text", texto: t.texto };
  return t;
}
