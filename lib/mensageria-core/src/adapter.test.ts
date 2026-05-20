import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptarParaCanal, tokenParaCanal } from "./adapter.js";

test("adaptarParaCanal WA mantém canônico", () => {
  assert.equal(adaptarParaCanal("foo *neg* _ita_", "whatsapp"), "foo *neg* _ita_");
});

test("adaptarParaCanal HTML escapa < > & e converte marcadores", () => {
  const out = adaptarParaCanal("a *b* <perigo> _c_", "telegram_html");
  assert.equal(out, "a <b>b</b> &lt;perigo&gt; <i>c</i>");
});

test("adaptarParaCanal MV2 escapa reservados fora dos marcadores (sem 400)", () => {
  const out = adaptarParaCanal("Dose: 1 cápsula. (1º) — ok!", "telegram_mv2");
  // pontos, parênteses, exclamação, traço devem virar escapados
  assert.ok(out.includes("\\."));
  assert.ok(out.includes("\\("));
  assert.ok(out.includes("\\)"));
  assert.ok(out.includes("\\!"));
});

test("adaptarParaCanal MV2 preserva marcadores ao redor de texto escapado", () => {
  const out = adaptarParaCanal("_[1º ativo]_", "telegram_mv2");
  // marcador _ italico permanece, mas [ ] são escapados dentro
  assert.equal(out, "_\\[1º ativo\\]_");
});

test("tokenParaCanal degrada underline em WA pra text", () => {
  const t = tokenParaCanal({ tipo: "underline", texto: "x" }, "whatsapp");
  assert.equal(t.tipo, "text");
});
