import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadArtifactConfigs, scanFile, helperFileExports, emitHelperWarnings, type ArtifactConfig } from "./check-api-fetch.js";

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

test("helperFileExports detecta export function apiFetch", () => {
  assert.equal(helperFileExports(`export function apiFetch() {}`, "apiFetch"), true);
  assert.equal(helperFileExports(`export async function apiFetch() {}`, "apiFetch"), true);
});

test("helperFileExports detecta export const apiFetch", () => {
  assert.equal(helperFileExports(`export const apiFetch = () => {}`, "apiFetch"), true);
});

test("helperFileExports detecta re-export pelo nome exportado, nao pelo importado", () => {
  assert.equal(helperFileExports(`export { apiFetch } from "./impl";`, "apiFetch"), true);
  assert.equal(helperFileExports(`export { foo, impl as apiFetch } from "./impl";`, "apiFetch"), true);
  // "apiFetch as apiFetch2" exporta apiFetch2, NAO apiFetch
  assert.equal(helperFileExports(`export { apiFetch as apiFetch2 } from "./impl";`, "apiFetch"), false);
});

test("helperFileExports ignora export type (type-only nao e runtime)", () => {
  assert.equal(helperFileExports(`export type { apiFetch } from "./impl";`, "apiFetch"), false);
});

test("helperFileExports ignora exports comentados (linha e bloco)", () => {
  assert.equal(helperFileExports(`// export function apiFetch() {}`, "apiFetch"), false);
  assert.equal(helperFileExports(`/* export function apiFetch() {} */`, "apiFetch"), false);
  assert.equal(helperFileExports(`/* export { apiFetch } from "./impl"; */`, "apiFetch"), false);
});

test("helperFileExports retorna false quando arquivo nao exporta a funcao", () => {
  assert.equal(helperFileExports(``, "apiFetch"), false);
  assert.equal(helperFileExports(`function apiFetch() {}`, "apiFetch"), false);
  assert.equal(helperFileExports(`const apiFetch = () => {}`, "apiFetch"), false);
  assert.equal(helperFileExports(`export function outraCoisa() {}`, "apiFetch"), false);
});

test("helperFileExports respeita helperFn customizado (nao hardcoded apiFetch)", () => {
  assert.equal(helperFileExports(`export function authedFetch() {}`, "authedFetch"), true);
  assert.equal(helperFileExports(`export function apiFetch() {}`, "authedFetch"), false);
});

test("clinica-motor (helper presente com export) NAO marca helperExportMissing", () => {
  const cfgs = loadArtifactConfigs();
  const cm = cfgs.find((c) => c.name === "clinica-motor");
  assert.ok(cm);
  assert.ok(!cm!.helperExportMissing, "clinica-motor exporta apiFetch, helperExportMissing deve ser falsy");
});

function makeRecorder() {
  const warns: string[] = [];
  const errors: string[] = [];
  return {
    warns,
    errors,
    out: {
      warn: (m: string) => warns.push(m),
      error: (m: string) => errors.push(m),
    },
  };
}

const baseCfg = (overrides: Partial<ArtifactConfig> & { name: string }): ArtifactConfig => ({
  root: "/tmp/x/src",
  helperImport: "./lib/api-fetch",
  helperFn: "apiFetch",
  allowlist: [],
  helperExpectedPath: "/tmp/x/src/lib/api-fetch.ts",
  ...overrides,
});

test("emitHelperWarnings: helper presente sem export -> AVISO claro", () => {
  const rec = makeRecorder();
  const cfg = baseCfg({ name: "novo-front", helperExportMissing: true });
  const { helperMissingHardFail } = emitHelperWarnings([cfg], [], rec.out);
  assert.equal(helperMissingHardFail, false);
  assert.equal(rec.errors.length, 0);
  assert.equal(rec.warns.length, 1);
  assert.match(rec.warns[0], /AVISO/);
  assert.match(rec.warns[0], /novo-front/);
  assert.match(rec.warns[0], /nao exporta apiFetch/);
  assert.match(rec.warns[0], /api-fetch\.ts/);
});

test("emitHelperWarnings: helper presente com export correto -> SILENCIO", () => {
  const rec = makeRecorder();
  const cfg = baseCfg({ name: "ok-front", helperExportMissing: false });
  const { helperMissingHardFail } = emitHelperWarnings([cfg], [], rec.out);
  assert.equal(helperMissingHardFail, false);
  assert.equal(rec.warns.length, 0);
  assert.equal(rec.errors.length, 0);
});

test("emitHelperWarnings: helper ausente sem violacoes -> AVISO Task #108", () => {
  const rec = makeRecorder();
  const cfg = baseCfg({ name: "vazio-front", helperMissing: true });
  const { helperMissingHardFail } = emitHelperWarnings([cfg], [], rec.out);
  assert.equal(helperMissingHardFail, false);
  assert.equal(rec.warns.length, 1);
  assert.match(rec.warns[0], /Task #108/);
});

test("emitHelperWarnings: helper ausente COM violacoes -> ERRO hard fail", () => {
  const rec = makeRecorder();
  const cfg = baseCfg({ name: "ruim-front", helperMissing: true });
  const violations = [{ artifact: "ruim-front", file: "/x.tsx", line: 1, col: 1, text: "fetch('/api/x')" }];
  const { helperMissingHardFail } = emitHelperWarnings([cfg], violations, rec.out);
  assert.equal(helperMissingHardFail, true);
  assert.equal(rec.errors.length, 1);
  assert.match(rec.errors[0], /ERRO/);
  assert.match(rec.errors[0], /1 chamada/);
});
