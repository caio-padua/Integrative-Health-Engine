import { strict as assert } from "node:assert";
import { test } from "node:test";
import { scanFile } from "./check-api-fetch.js";

const FAKE = "/fake/file.tsx";

test("detects single-line fetch with /api string", () => {
  const v = scanFile(FAKE, `fetch("/api/foo")`);
  assert.equal(v.length, 1);
});

test("detects fetch with template literal /api", () => {
  const v = scanFile(FAKE, "fetch(`/api/${id}`)");
  assert.equal(v.length, 1);
});

test("detects fetch with absolute URL containing /api", () => {
  const v = scanFile(FAKE, `fetch("https://x.com/api/foo")`);
  assert.equal(v.length, 1);
});

test("detects MULTILINE fetch with /api on next line", () => {
  const src = `const r = fetch(\n  "/api/foo",\n  { method: "GET" }\n);`;
  const v = scanFile(FAKE, src);
  assert.equal(v.length, 1);
  assert.equal(v[0].line, 1);
});

test("detects multiline fetch with template literal", () => {
  const src = "fetch(\n  `/api/${id}`\n)";
  const v = scanFile(FAKE, src);
  assert.equal(v.length, 1);
});

test("ignores apiFetch calls", () => {
  const v = scanFile(FAKE, `apiFetch("/api/foo")`);
  assert.equal(v.length, 0);
});

test("ignores method-style .fetch( calls", () => {
  const v = scanFile(FAKE, `obj.fetch("/api/foo"); obj?.fetch("/api/bar")`);
  assert.equal(v.length, 0);
});

test("ignores fetch to non-/api URLs", () => {
  const v = scanFile(FAKE, `fetch("https://example.com/data.json")`);
  assert.equal(v.length, 0);
});

test("ignores fetch with variable arg (no literal)", () => {
  const v = scanFile(FAKE, `fetch(url)`);
  assert.equal(v.length, 0);
});

test("detects multiple violations in one file", () => {
  const src = `fetch("/api/a")\nfetch(\n  "/api/b"\n)\napiFetch("/api/c")`;
  const v = scanFile(FAKE, src);
  assert.equal(v.length, 2);
});
