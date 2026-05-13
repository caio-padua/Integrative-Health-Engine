import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const ROOT = resolve(REPO_ROOT, "artifacts/clinica-motor/src");
const ALLOWLIST = new Set([resolve(ROOT, "lib/api-fetch.ts")]);

const FETCH_CALL_RE = /\bfetch\s*\(/g;
const API_IN_ARG_RE =
  /^\s*(?:`[^`]*\/api\b|"[^"]*\/api\b|'[^']*\/api\b)/;

type Violation = { file: string; line: number; col: number; text: string };

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

export function scanFile(file: string, src: string): Violation[] {
  const violations: Violation[] = [];
  FETCH_CALL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FETCH_CALL_RE.exec(src)) !== null) {
    const callStart = m.index;
    // Reject method-style calls like .fetch( or obj?.fetch(
    const before = src
      .slice(Math.max(0, callStart - 2), callStart)
      .replace(/\s+$/, "");
    if (before.endsWith(".") || before.endsWith("?.")) continue;
    const argStart = m.index + m[0].length;
    // Look ahead, skipping whitespace/newlines, at the first argument expression.
    const tail = src.slice(argStart);
    if (API_IN_ARG_RE.test(tail.replace(/^\s+/, ""))) {
      const { line, col } = lineColFromIndex(src, callStart);
      const lineText = src.split("\n")[line - 1] ?? "";
      violations.push({ file, line, col, text: lineText.trim() });
    }
  }
  return violations;
}

function scanAll(): Violation[] {
  const violations: Violation[] = [];
  for (const file of walk(ROOT)) {
    if (ALLOWLIST.has(file)) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("fetch(") && !/fetch\s*\(/.test(src)) continue;
    violations.push(...scanFile(file, src));
  }
  return violations;
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-api-fetch.ts");

if (isMain) {
  const violations = scanAll();
  if (violations.length > 0) {
    console.error(
      "\n[check-api-fetch] Chamadas cruas a fetch('/api/...') detectadas.\n" +
        "Use apiFetch de @/lib/api-fetch para garantir Authorization automatico.\n",
    );
    for (const v of violations) {
      console.error(
        `  ${relative(process.cwd(), v.file)}:${v.line}:${v.col}  ${v.text}`,
      );
    }
    console.error(
      `\nTotal: ${violations.length} violacao(oes). Substitua por apiFetch.\n`,
    );
    process.exit(1);
  }
  console.log(
    "[check-api-fetch] OK — nenhuma chamada crua a /api encontrada.",
  );
}
