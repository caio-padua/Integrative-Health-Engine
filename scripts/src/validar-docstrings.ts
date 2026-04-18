/**
 * AUTO-VALIDADOR DE DOCSTRINGS
 *
 * Funcao: percorre arquivos .ts criticos do PAWARDS e reporta quais
 *         funcoes NAO tem JSDoc com a triade obrigatoria:
 *         (1) o que faz, (2) por que existe, (3) exemplo pratico.
 *
 * Por que existe: garantir que toda funcao publica seja autoexplicativa
 *                 para o medico que ler o codigo (vc, Caio) entender em
 *                 20s o que cada bloco faz, sem precisar rastrear callsites.
 *
 * Exemplo pratico:
 *   $ pnpm --filter @workspace/scripts exec tsx src/validar-docstrings.ts
 *   → Imprime relatorio markdown:
 *
 *   ## artifacts/api-server/src/pdf/gerarPedidoExame.ts
 *   - L045 gerarPedidoExamePdf  ❌ sem JSDoc
 *   - L120 desenharCabecalho    ⚠️  JSDoc sem "Exemplo:"
 *   - L210 quebrarLinhas        ✅ ok
 *
 *   Total: 73 funcoes | Com JSDoc completo: 18 (24%) | Faltam: 55
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

// Arquivos críticos a auditar (escala incremental conforme reificação cresce)
const ALVOS = [
  "artifacts/api-server/src/pdf/gerarPedidoExame.ts",
  "artifacts/api-server/src/pdf/rasxPdf.ts",
  "artifacts/api-server/src/pdf/rasxMotorPdf.ts",
  "artifacts/api-server/src/pdf/docsPdf.ts",
  "artifacts/api-server/src/pdf/gerarRAS.ts",
  "artifacts/api-server/src/routes/payments.ts",
  "artifacts/api-server/src/routes/financeiro.ts",
  "artifacts/api-server/src/routes/rasxArqu.ts",
  "scripts/src/encarnar-natacha.ts",
  "scripts/src/encarnar-exames-pawards.ts",
  "scripts/src/reificacao.ts",
];

// Regex que detecta declaracoes de funcao publicas
const REGEX_FN = /^(export\s+)?(async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
const REGEX_CONST_FN = /^(export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(async\s+)?(\(|function)/;

interface Finding {
  arquivo: string;
  linha: number;
  funcao: string;
  status: "OK" | "SEM_JSDOC" | "JSDOC_SEM_EXEMPLO" | "JSDOC_SEM_PORQUE";
  bloco: string;
}

/**
 * Verifica se as N linhas anteriores ao indice formam um bloco JSDoc.
 *
 * Funcao: sobe ate achar `*\/` e checa se existe `\/**` correspondente.
 * Por que: JSDoc valido sempre fica imediatamente antes da funcao.
 * Exemplo: linhas[10] = "function foo()" → checa linhas[9..0] de baixo
 *          pra cima ate encontrar o bloco e retorna seu conteudo.
 */
function extrairJsdocPrevio(linhas: string[], idx: number): string | null {
  let i = idx - 1;
  // Pula linhas em branco
  while (i >= 0 && linhas[i].trim() === "") i--;
  if (i < 0 || !linhas[i].trimEnd().endsWith("*/")) return null;
  const fim = i;
  while (i >= 0 && !linhas[i].trimStart().startsWith("/**")) i--;
  if (i < 0) return null;
  return linhas.slice(i, fim + 1).join("\n");
}

/**
 * Classifica um JSDoc segundo a triade exigida.
 *
 * Funcao: detecta presenca de marcadores semanticos (Funcao:, Por que:, Exemplo:).
 * Por que: o padrao PAWARDS exige os 3 elementos para qualquer funcao publica.
 * Exemplo: "/** Funcao: X. Por que: Y. Exemplo: Z. *\/" → status="OK".
 */
function classificarJsdoc(jsdoc: string): Finding["status"] {
  const lower = jsdoc.toLowerCase();
  const temFuncao = /(funcao|função|funtion|@function|^\s*\*\s+[a-z])/im.test(jsdoc);
  const temPorque = /(por que|porque|por_que|@why|motivo|razao)/i.test(lower);
  const temExemplo = /(exemplo|@example|exemplo:|exemplo pratico|exemplo prático)/i.test(lower);
  if (temFuncao && temPorque && temExemplo) return "OK";
  if (temFuncao && temExemplo) return "JSDOC_SEM_PORQUE";
  if (temFuncao) return "JSDOC_SEM_EXEMPLO";
  return "JSDOC_SEM_EXEMPLO";
}

function auditar(arqRel: string): Finding[] {
  const abs = path.join(REPO_ROOT, arqRel);
  if (!fs.existsSync(abs)) return [];
  const linhas = fs.readFileSync(abs, "utf8").split("\n");
  const out: Finding[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const ln = linhas[i];
    const mFn = ln.match(REGEX_FN);
    const mConst = ln.match(REGEX_CONST_FN);
    const nome = mFn?.[3] || mConst?.[2];
    if (!nome) continue;
    // Ignora helpers internos minusculos sem export
    if (!ln.startsWith("export") && nome.startsWith("_")) continue;
    const jsdoc = extrairJsdocPrevio(linhas, i);
    const status: Finding["status"] = jsdoc ? classificarJsdoc(jsdoc) : "SEM_JSDOC";
    out.push({ arquivo: arqRel, linha: i + 1, funcao: nome, status, bloco: jsdoc?.substring(0, 80) || "" });
  }
  return out;
}

function emoji(s: Finding["status"]) {
  return s === "OK" ? "✅" : s === "JSDOC_SEM_EXEMPLO" ? "⚠️ sem exemplo" : s === "JSDOC_SEM_PORQUE" ? "⚠️ sem porque" : "❌ sem JSDoc";
}

function main() {
  console.log("# Relatorio de Auto-Validacao de Docstrings PAWARDS\n");
  console.log(`Data: ${new Date().toISOString()}\n`);

  const todos: Finding[] = [];
  for (const arq of ALVOS) {
    const findings = auditar(arq);
    if (findings.length === 0) continue;
    console.log(`\n## ${arq}`);
    for (const f of findings) {
      console.log(`- L${String(f.linha).padStart(4, "0")}  ${f.funcao.padEnd(35)} ${emoji(f.status)}`);
    }
    todos.push(...findings);
  }

  const total = todos.length;
  const ok = todos.filter(f => f.status === "OK").length;
  const semJsdoc = todos.filter(f => f.status === "SEM_JSDOC").length;
  const parciais = total - ok - semJsdoc;
  const pct = total === 0 ? 0 : Math.round((ok / total) * 100);

  console.log("\n## Sumario");
  console.log(`- Total de funcoes auditadas: **${total}**`);
  console.log(`- Com JSDoc completo (funcao + porque + exemplo): **${ok}** (${pct}%)`);
  console.log(`- Com JSDoc parcial: **${parciais}**`);
  console.log(`- Sem JSDoc nenhum: **${semJsdoc}**`);
  console.log(`\n${pct >= 80 ? "✅ Saudavel" : pct >= 50 ? "⚠️  Em construcao" : "🔴 Critico — priorizar documentacao"}`);

  process.exit(pct >= 80 ? 0 : 0); // nunca falha o build, so reporta
}

main();
