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
  helperExportMissing?: boolean;
  helperBodyEmpty?: boolean;
  helperAuthHintsMissing?: boolean;
  helperExpectedPath?: string;
};

const AUTH_HINT_RE = /\b(Authorization|Bearer|getPawardsToken|PAWARDS_TOKEN_KEY)\b/;

// Heuristica complementar a helperFunctionBodyOk (Task #115): apos confirmar
// que o helper exporta a funcao e o corpo nao e no-op, ainda da pra alguem
// escrever um corpo "valido" tipo `return fetch(input, init)` cru, sem ler
// token nem injetar Authorization. Esse check garante que o ARQUIVO inteiro
// do helper menciona pelo menos uma das pistas esperadas de auth. Olhamos o
// arquivo (e nao so o corpo) porque o token costuma ser lido via helper
// auxiliar (`getPawardsToken`) declarado fora da funcao apiFetch.
export function helperFileHasAuthHints(src: string): boolean {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  return AUTH_HINT_RE.test(stripped);
}

export function helperFileExports(src: string, fnName: string): boolean {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = new RegExp(
    `\\bexport\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${escaped}\\b`,
  );
  if (named.test(stripped)) return true;
  // Re-exports: export { foo, bar as baz } from "..."
  // Pula `export type { ... }` (type-only nao e export de runtime).
  const reexportRe = /\bexport\s+(type\s+)?\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = reexportRe.exec(stripped)) !== null) {
    if (m[1]) continue;
    const parts = m[2]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
      const exportedName = asMatch
        ? asMatch[2]
        : part.match(/^\w+$/)?.[0];
      if (exportedName === fnName) return true;
    }
  }
  return false;
}

function extractBalancedBraces(src: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1);
}

// Pula um par balanceado de delimitadores (ex.: parens da lista de parametros,
// que podem conter `{}` em valores default tipo `init = {}`). Retorna o indice
// imediatamente apos o delimitador de fechamento, ou -1 se nao casar.
function skipBalanced(
  src: string,
  openIdx: number,
  open: string,
  close: string,
): number {
  if (src[openIdx] !== open) return -1;
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function bodyHasFetchOrReturn(body: string): boolean {
  return /\bfetch\s*\(/.test(body) || /\breturn\b/.test(body);
}

// Heuristica complementar ao helperFileExports: confere que o corpo da
// funcao exportada nao e um no-op silencioso (ex.: `export function apiFetch() {}`).
// Retorna true quando:
//   - a funcao nao e definida diretamente neste arquivo (so re-export) — nao da
//     pra inspecionar sem seguir o import, entao nao alarma;
//   - o corpo contem `fetch(` ou `return` (heuristica suficiente pra Task #114);
//   - e uma arrow sem chaves (ex.: `() => fetch(...)`), que sempre retorna implicito.
// Retorna false quando o corpo esta visivelmente vazio / sem fetch nem return.
export function helperFunctionBodyOk(src: string, fnName: string): boolean {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Funcao declarada: `export [async] function NAME (...) [: ReturnType] { ... }`
  const fnDeclRe = new RegExp(
    `\\bexport\\s+(?:async\\s+)?function\\s+${escaped}\\s*\\(`,
  );
  const declMatch = fnDeclRe.exec(stripped);
  if (declMatch) {
    const parenStart = stripped.indexOf("(", declMatch.index);
    const afterParens = skipBalanced(stripped, parenStart, "(", ")");
    if (afterParens < 0) return true;
    const braceIdx = stripped.indexOf("{", afterParens);
    if (braceIdx < 0) return true;
    const body = extractBalancedBraces(stripped, braceIdx);
    return bodyHasFetchOrReturn(body);
  }

  const constRe = new RegExp(
    `\\bexport\\s+(?:const|let|var)\\s+${escaped}\\b\\s*(?::[^=]+)?=\\s*`,
  );
  const constMatch = constRe.exec(stripped);
  if (constMatch) {
    let pos = constMatch.index + constMatch[0].length;
    // Pula `async` opcional.
    const asyncMatch = stripped.slice(pos).match(/^async\s+/);
    if (asyncMatch) pos += asyncMatch[0].length;
    // Caso 1: `function ...` expression.
    if (/^function\b/.test(stripped.slice(pos))) {
      const parenStart = stripped.indexOf("(", pos);
      const afterParens = skipBalanced(stripped, parenStart, "(", ")");
      if (afterParens < 0) return true;
      const braceIdx = stripped.indexOf("{", afterParens);
      if (braceIdx < 0) return true;
      const body = extractBalancedBraces(stripped, braceIdx);
      return bodyHasFetchOrReturn(body);
    }
    // Caso 2: arrow function — params (parens balanceados ou ident unico) + `=>`.
    let afterParams = -1;
    if (stripped[pos] === "(") {
      afterParams = skipBalanced(stripped, pos, "(", ")");
    } else {
      const identMatch = stripped.slice(pos).match(/^[A-Za-z_$][\w$]*/);
      if (identMatch) afterParams = pos + identMatch[0].length;
    }
    if (afterParams > 0) {
      // Pula return type opcional `: ...` ate o `=>`, se houver.
      const tail = stripped.slice(afterParams);
      const arrowMatch = tail.match(/^(\s*(?::[^=]*?)?\s*)=>\s*/);
      if (arrowMatch) {
        const afterArrow = afterParams + arrowMatch[0].length;
        if (stripped[afterArrow] === "{") {
          const body = extractBalancedBraces(stripped, afterArrow);
          return bodyHasFetchOrReturn(body);
        }
        // arrow expression body — sempre retorna algo implicitamente.
        return true;
      }
    }
    // Atribuicao a outro identificador / chamada — nao da pra inspecionar.
    return true;
  }

  // So re-export — sem corpo pra inspecionar.
  return true;
}

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
    const helperFn = "apiFetch";
    const helperCandidate = join(src, "lib/api-fetch.ts");
    const helperMissing = !existsSync(helperCandidate);
    let helperExportMissing = false;
    let helperBodyEmpty = false;
    let helperAuthHintsMissing = false;
    if (!helperMissing) {
      const helperSrc = readFileSync(helperCandidate, "utf8");
      helperExportMissing = !helperFileExports(helperSrc, helperFn);
      if (!helperExportMissing) {
        helperBodyEmpty = !helperFunctionBodyOk(helperSrc, helperFn);
        if (!helperBodyEmpty) {
          helperAuthHintsMissing = !helperFileHasAuthHints(helperSrc);
        }
      }
    }
    found.push({
      name: entry,
      root: src,
      helperImport: "./lib/api-fetch",
      helperFn,
      allowlist: helperMissing ? [] : [helperCandidate],
      helperMissing,
      helperExportMissing,
      helperBodyEmpty,
      helperAuthHintsMissing,
      helperExpectedPath: helperCandidate,
    });
  }
  return found;
}

// Normaliza qualquer ArtifactConfig (explicito OU auto-descoberto) com a
// mesma logica de inspecao do helper: arquivo presente? exporta a funcao?
// corpo nao e no-op? Os explicit configs ja vem com allowlist apontando pro
// helper, entao basta ler esse arquivo e popular helperMissing/
// helperExportMissing/helperBodyEmpty + helperExpectedPath. Sem isso, o
// clinica-motor nunca dispararia o aviso da Task #114, mesmo que alguem
// esvaziasse o corpo de apiFetch.
function normalizeHelperFlags(cfg: ArtifactConfig): ArtifactConfig {
  // Configs auto-descobertos ja vem com tudo populado.
  if (typeof cfg.helperMissing === "boolean") return cfg;
  const helperPath = cfg.allowlist[0];
  if (!helperPath) return cfg;
  const helperMissing = !existsSync(helperPath);
  let helperExportMissing = false;
  let helperBodyEmpty = false;
  let helperAuthHintsMissing = false;
  if (!helperMissing) {
    const helperSrc = readFileSync(helperPath, "utf8");
    helperExportMissing = !helperFileExports(helperSrc, cfg.helperFn);
    if (!helperExportMissing) {
      helperBodyEmpty = !helperFunctionBodyOk(helperSrc, cfg.helperFn);
      if (!helperBodyEmpty) {
        helperAuthHintsMissing = !helperFileHasAuthHints(helperSrc);
      }
    }
  }
  return {
    ...cfg,
    helperMissing,
    helperExportMissing,
    helperBodyEmpty,
    helperAuthHintsMissing,
    helperExpectedPath: cfg.helperExpectedPath ?? helperPath,
  };
}

export function loadArtifactConfigs(): ArtifactConfig[] {
  return [
    ...EXPLICIT_CONFIGS.map(normalizeHelperFlags),
    ...discoverArtifacts(),
  ];
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

export function emitHelperWarnings(
  configs: ArtifactConfig[],
  violations: Violation[],
  out: { warn: (msg: string) => void; error: (msg: string) => void } = {
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
  },
): { helperMissingHardFail: boolean } {
  const missingHelper = configs.filter((c) => c.helperMissing);
  const exportMissingHelper = configs.filter(
    (c) => !c.helperMissing && c.helperExportMissing,
  );
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
      out.error(
        `[check-api-fetch] ERRO: artifact "${cfg.name}" (kind=web) nao tem helper autenticado em ${expected} e ja faz ${violCount} chamada(s) crua(s) a /api. Crie o helper (export ${cfg.helperFn}) e use-o em vez de fetch().`,
      );
    } else {
      out.warn(
        `[check-api-fetch] AVISO: artifact "${cfg.name}" (kind=web) foi descoberto sem helper autenticado em ${expected}. Crie o arquivo exportando ${cfg.helperFn} antes de fazer chamadas a /api, senao o frontend nasce vulneravel a 401 silencioso (ver Task #108).`,
      );
    }
  }
  for (const cfg of exportMissingHelper) {
    const expected = cfg.helperExpectedPath
      ? relative(process.cwd(), cfg.helperExpectedPath)
      : `${cfg.name}/src/lib/api-fetch.ts`;
    out.warn(
      `[check-api-fetch] AVISO: artifact "${cfg.name}" (kind=web) tem o arquivo ${expected}, mas ele nao exporta ${cfg.helperFn}. Adicione \`export function ${cfg.helperFn}\` (ou \`export const ${cfg.helperFn}\`) — sem isso, importar ${cfg.helperFn} no resto do codigo resolve para undefined e o frontend nasce vulneravel a 401 silencioso (ver Task #108/#113).`,
    );
  }
  const bodyEmptyHelper = configs.filter(
    (c) => !c.helperMissing && !c.helperExportMissing && c.helperBodyEmpty,
  );
  for (const cfg of bodyEmptyHelper) {
    const expected = cfg.helperExpectedPath
      ? relative(process.cwd(), cfg.helperExpectedPath)
      : `${cfg.name}/src/lib/api-fetch.ts`;
    out.warn(
      `[check-api-fetch] AVISO: artifact "${cfg.name}" (kind=web) exporta ${cfg.helperFn} em ${expected}, mas o corpo da funcao nao chama \`fetch(\` nem tem \`return\` — parece um no-op. Em runtime as chamadas viram silencio (sem request, sem resposta) e o frontend nasce vulneravel a 401 silencioso (ver Task #108/#113/#114). Implemente o corpo da funcao chamando fetch e retornando a Response.`,
    );
  }
  const authHintsMissingHelper = configs.filter(
    (c) =>
      !c.helperMissing &&
      !c.helperExportMissing &&
      !c.helperBodyEmpty &&
      c.helperAuthHintsMissing,
  );
  for (const cfg of authHintsMissingHelper) {
    const expected = cfg.helperExpectedPath
      ? relative(process.cwd(), cfg.helperExpectedPath)
      : `${cfg.name}/src/lib/api-fetch.ts`;
    out.warn(
      `[check-api-fetch] AVISO: artifact "${cfg.name}" (kind=web) tem ${cfg.helperFn} em ${expected} com corpo nao vazio, mas o arquivo nao menciona nenhuma das pistas esperadas de auth (Authorization, Bearer, getPawardsToken ou PAWARDS_TOKEN_KEY). O helper pode estar fazendo fetch cru sem injetar o JWT, deixando o frontend vulneravel a 401 silencioso (ver Task #108/#113/#114/#115). Confira que ${cfg.helperFn} le o token do localStorage e seta o header Authorization: Bearer.`,
    );
  }
  return { helperMissingHardFail };
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-api-fetch.ts");

if (isMain) {
  const { configs, violations } = scanAll();
  const { helperMissingHardFail } = emitHelperWarnings(configs, violations);
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
