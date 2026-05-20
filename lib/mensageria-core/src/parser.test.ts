import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInline } from "./parser.js";

test("parseInline reconhece bold/italic/underline/strike/mono", () => {
  const t = parseInline("foo *neg* _ita_ __sub__ ~tach~ `mono` end");
  assert.equal(t.filter(x => x.tipo === "bold")[0].texto, "neg");
  assert.equal(t.filter(x => x.tipo === "italic")[0].texto, "ita");
  assert.equal(t.filter(x => x.tipo === "underline")[0].texto, "sub");
  assert.equal(t.filter(x => x.tipo === "strike")[0].texto, "tach");
  assert.equal(t.filter(x => x.tipo === "mono")[0].texto, "mono");
});

test("parseInline marcador não fechado degrada pra texto (sem bold)", () => {
  const t = parseInline("foo *neg sem fechamento");
  assert.ok(t.every(x => x.tipo === "text"));
  assert.equal(t.map(x => x.texto).join(""), "foo *neg sem fechamento");
});
