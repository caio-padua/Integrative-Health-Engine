import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadArtifactConfigs, scanFile } from "./check-api-fetch.js";

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

test("propaga nome do artifact nas violacoes", () => {
  const v = scanFile(FAKE, `fetch("/api/foo")`, "meu-artifact");
  assert.equal(v.length, 1);
  assert.equal(v[0].artifact, "meu-artifact");
});

test("loadArtifactConfigs inclui clinica-motor com helper apiFetch", () => {
  const cfgs = loadArtifactConfigs();
  const cm = cfgs.find((c) => c.name === "clinica-motor");
  assert.ok(cm, "clinica-motor deve estar configurado");
  assert.equal(cm!.helperFn, "apiFetch");
  assert.match(cm!.helperImport, /api-fetch/);
  assert.ok(cm!.allowlist.length > 0);
});

test("loadArtifactConfigs ignora artifacts backend (kind != web)", () => {
  const cfgs = loadArtifactConfigs();
  const names = cfgs.map((c) => c.name);
  assert.ok(!names.includes("api-server"), `api-server (kind=api) NAO deve ser auto-descoberto: ${names.join(",")}`);
  assert.ok(!names.includes("mockup-sandbox"), `mockup-sandbox (kind=design) NAO deve ser auto-descoberto: ${names.join(",")}`);
});

test("clinica-motor (helper presente) NAO marca helperMissing", () => {
  const cfgs = loadArtifactConfigs();
  const cm = cfgs.find((c) => c.name === "clinica-motor");
  assert.ok(cm);
  assert.ok(!cm!.helperMissing, "clinica-motor tem helper, helperMissing deve ser falsy");
});

test("artifacts auto-descobertos expoem helperMissing/helperExpectedPath", () => {
  const cfgs = loadArtifactConfigs();
  for (const cfg of cfgs) {
    if (cfg.name === "clinica-motor") continue;
    assert.equal(typeof cfg.helperMissing, "boolean", `${cfg.name} deve ter helperMissing booleano`);
    assert.ok(cfg.helperExpectedPath, `${cfg.name} deve expor helperExpectedPath para o aviso`);
    if (cfg.helperMissing) {
      assert.equal(cfg.allowlist.length, 0, `${cfg.name} sem helper deve ter allowlist vazia`);
    }
  }
});
