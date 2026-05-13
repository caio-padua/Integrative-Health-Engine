import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const ARTIFACTS_DIR = resolve(REPO_ROOT, "artifacts");

export type ArtifactConfig = {
  name: string;
  root: string;
  helperImport: string;
  helperFn: string;
  allowlist: string[];
  helperMissing?: boolean;
  helperExpectedPath?: string;
};

const EXPLICIT_CONFIGS: ArtifactConfig[] = [
  {
    name: "clinica-motor",
    root: resolve(ARTIFACTS_DIR, "clinica-motor/src"),
    helperImport: "@/lib/api-fetch",
    helperFn: "apiFetch",
    allowlist: [resolve(ARTIFACTS_DIR, "clinica-motor/src/lib/api-fetch.ts")],
  },
];

function readArtifactKind(artifactDir: string): string | null {
  const tomlPath = join(artifactDir, ".replit-artifact/artifact.toml");
  if (!existsSync(tomlPath)) return null;
  const src = readFileSync(tomlPath, "utf8");
  const m = src.match(/^\s*kind\s*=\s*"([^"]+)"/m);
  return m ? m[1] : null;
}

function discoverArtifacts(): ArtifactConfig[] {
  const known = new Set(EXPLICIT_CONFIGS.map((c) => c.name));
  const found: ArtifactConfig[] = [];
  if (!existsSync(ARTIFACTS_DIR)) return found;
  for (const entry of readdirSync(ARTIFACTS_DIR)) {
    if (known.has(entry)) continue;
    const artifactDir = join(ARTIFACTS_DIR, entry);
    if (!statSync(artifactDir).isDirectory()) continue;
    // Apenas artifacts frontend (web) — backends fazem chamadas HTTP externas
    // legitimas que nao devem ser tratadas como fetch cru a /api.
    const kind = readArtifactKind(artifactDir);
    if (kind !== "web") continue;
    const src = join(artifactDir, "src");
    if (!existsSync(src) || !statSync(src).isDirectory()) continue;
    const helperCandidate = join(src, "lib/api-fetch.ts");
    const helperMissing = !existsSync(helperCandidate);
    found.push({
      name: entry,
      root: src,
      helperImport: "./lib/api-fetch",
      helperFn: "apiFetch",
      allowlist: helperMissing ? [] : [helperCandidate],
      helperMissing,
      helperExpectedPath: helperCandidate,
    });
  }
  return found;
}

export function loadArtifactConfigs(): ArtifactConfig[] {
  return [...EXPLICIT_CONFIGS, ...discoverArtifacts()];
}

const FETCH_CALL_RE = /\bfetch\s*\(/g;
const API_IN_ARG_RE =
  /^\s*(?:`[^`]*\/api\b|"[^"]*\/api\b|'[^']*\/api\b)/;

export type Violation = {
  artifact: string;
  file: string;
  line: number;
  col: number;
  text: string;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function lineColFromIndex(src: string, index: number): { line: number; col: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < index; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, col: index - lastNl };
}

export function scanFile(
  file: string,
  src: string,
  artifact = "",
): Violation[] {
  const violations: Violation[] = [];
  FETCH_CALL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FETCH_CALL_RE.exec(src)) !== null) {
    const callStart = m.index;
    const before = src
      .slice(Math.max(0, callStart - 2), callStart)
      .replace(/\s+$/, "");
    if (before.endsWith(".") || before.endsWith("?.")) continue;
    const argStart = m.index + m[0].length;
    const tail = src.slice(argStart);
    if (API_IN_ARG_RE.test(tail.replace(/^\s+/, ""))) {
      const { line, col } = lineColFromIndex(src, callStart);
      const lineText = src.split("\n")[line - 1] ?? "";
      violations.push({ artifact, file, line, col, text: lineText.trim() });
    }
  }
  return violations;
}

function scanArtifact(cfg: ArtifactConfig): Violation[] {
  const violations: Violation[] = [];
  if (!existsSync(cfg.root)) return violations;
  const allow = new Set(cfg.allowlist);
  for (const file of walk(cfg.root)) {
    if (allow.has(file)) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("fetch(") && !/fetch\s*\(/.test(src)) continue;
    violations.push(...scanFile(file, src, cfg.name));
  }
  return violations;
}

export function scanAll(
  configs: ArtifactConfig[] = loadArtifactConfigs(),
): { configs: ArtifactConfig[]; violations: Violation[] } {
  const violations: Violation[] = [];
  for (const cfg of configs) violations.push(...scanArtifact(cfg));
  return { configs, violations };
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-api-fetch.ts");

if (isMain) {
  const { configs, violations } = scanAll();
  const missingHelper = configs.filter((c) => c.helperMissing);
  const violationsByArtifactPre = new Map<string, number>();
  for (const v of violations) {
    violationsByArtifactPre.set(
      v.artifact,
      (violationsByArtifactPre.get(v.artifact) ?? 0) + 1,
    );
  }
  let helperMissingHardFail = false;
  for (const cfg of missingHelper) {
    const violCount = violationsByArtifactPre.get(cfg.name) ?? 0;
    const expected = cfg.helperExpectedPath
      ? relative(process.cwd(), cfg.helperExpectedPath)
      : `${cfg.name}/src/lib/api-fetch.ts`;
    if (violCount > 0) {
      helperMissingHardFail = true;
      console.error(
        `[check-api-fetch] ERRO: artifact "${cfg.name}" (kind=web) nao tem helper autenticado em ${expected} e ja faz ${violCount} chamada(s) crua(s) a /api. Crie o helper (export ${cfg.helperFn}) e use-o em vez de fetch().`,
      );
    } else {
      console.warn(
        `[check-api-fetch] AVISO: artifact "${cfg.name}" (kind=web) foi descoberto sem helper autenticado em ${expected}. Crie o arquivo exportando ${cfg.helperFn} antes de fazer chamadas a /api, senao o frontend nasce vulneravel a 401 silencioso (ver Task #108).`,
      );
    }
  }
  if (violations.length > 0) {
    console.error(
      "\n[check-api-fetch] Chamadas cruas a fetch('/api/...') detectadas.\n",
    );
    const byArtifact = new Map<string, Violation[]>();
    for (const v of violations) {
      const list = byArtifact.get(v.artifact) ?? [];
      list.push(v);
      byArtifact.set(v.artifact, list);
    }
    for (const [name, list] of byArtifact) {
      const cfg = configs.find((c) => c.name === name);
      const helperFn = cfg?.helperFn ?? "apiFetch";
      const helperImport = cfg?.helperImport ?? "<helper do artifact>";
      console.error(
        `Artifact "${name}": use ${helperFn} de ${helperImport} para garantir Authorization automatico.`,
      );
      for (const v of list) {
        console.error(
          `  ${relative(process.cwd(), v.file)}:${v.line}:${v.col}  ${v.text}`,
        );
      }
      console.error("");
    }
    console.error(
      `Total: ${violations.length} violacao(oes) em ${byArtifact.size} artifact(s).\n`,
    );
    process.exit(1);
  }
  if (helperMissingHardFail) {
    process.exit(1);
  }
  console.log(
    `[check-api-fetch] OK — nenhuma chamada crua a /api encontrada (${configs.length} artifact(s) verificado(s): ${configs.map((c) => c.name).join(", ")}).`,
  );
}
