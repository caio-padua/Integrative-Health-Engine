// ═══════════════════════════════════════════════════════════════════════
// 🔤 PARSER INLINE · texto markdown WA-canônico → tokens InlineToken[]
// Núcleo da gramática: ``` ` __ * _ ~ . Não faz nesting recursivo.
// Marcadores não fechados degradam pra texto puro.
// ═══════════════════════════════════════════════════════════════════════
import type { InlineToken } from "./types.js";

export function parseInline(s: string): InlineToken[] {
  const out: InlineToken[] = [];
  let i = 0;
  const len = s.length;
  while (i < len) {
    if (s.startsWith("```", i)) {
      const end = s.indexOf("```", i + 3);
      if (end !== -1) { out.push({ tipo: "mono", texto: s.slice(i + 3, end) }); i = end + 3; continue; }
    }
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end !== -1 && end - i > 1) { out.push({ tipo: "mono", texto: s.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if (s.startsWith("__", i)) {
      const end = s.indexOf("__", i + 2);
      if (end !== -1) { out.push({ tipo: "underline", texto: s.slice(i + 2, end) }); i = end + 2; continue; }
    }
    if (s[i] === "*") {
      const end = s.indexOf("*", i + 1);
      if (end !== -1 && end - i > 1 && s[i + 1] !== " " && s[i + 1] !== "\n") {
        out.push({ tipo: "bold", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    if (s[i] === "_") {
      const end = s.indexOf("_", i + 1);
      if (end !== -1 && end - i > 1 && s[i + 1] !== " " && s[i + 1] !== "\n") {
        out.push({ tipo: "italic", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    if (s[i] === "~") {
      const end = s.indexOf("~", i + 1);
      if (end !== -1 && end - i > 1) {
        out.push({ tipo: "strike", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    let j = i + 1;
    while (j < len && !"*_~`".includes(s[j])) j++;
    out.push({ tipo: "text", texto: s.slice(i, j) });
    i = j;
  }
  return out;
}
