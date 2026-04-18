/**
 * Sanitizer juridico do PAU ARTS.
 * Le tabela juridico_termos_bloqueados e BLOQUEIA qualquer texto que contenha
 * medicamentos, substancias, dosagens ou protocolos especificos.
 *
 * Manifesto IMPLANTACAO secao 4 (Caio + Dr. Chat):
 * "evitar vinculo com venda de substancias" - documentos do medico devem
 * ser GENERICOS ("HONORARIOS MEDICOS / servicos especializados"), nunca
 * nomear droga, dose, via, forma farmaceutica ou protocolo.
 *
 * Defesa em profundidade: triggers SQL fazem a mesma validacao
 * (fn_validar_termos_juridicos / fn_validar_descricao_nf).
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface TermoProibido {
  categoria: string;
  termo: string;
  match_tipo: "CONTAINS" | "REGEX" | "EXACT";
  motivo: string;
}

let _cache: { termos: TermoProibido[]; ts: number } | null = null;
let _inflight: Promise<TermoProibido[]> | null = null;
const TTL_MS = 60_000;

async function carregarTermos(): Promise<TermoProibido[]> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.termos;
  // Lock por promessa em voo: chamadas concorrentes compartilham a mesma busca.
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const r = await db.execute(sql`SELECT categoria, termo, match_tipo, motivo FROM juridico_termos_bloqueados WHERE ativo = true`);
      const termos = ((r as unknown as { rows?: TermoProibido[] }).rows) || [];
      // Falha defensiva: se o catalogo voltar vazio com cache antigo presente,
      // mantemos o cache antigo (evita "abrir tudo" por blip de DB).
      if (termos.length === 0 && _cache && _cache.termos.length > 0) return _cache.termos;
      _cache = { termos, ts: Date.now() };
      return termos;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

/** Normaliza para defesa contra homoglifos/acentos: NFD + strip diacriticos. */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export interface ResultadoSanitizacao {
  ok: boolean;
  violacoes: Array<{ categoria: string; termo: string; motivo: string }>;
}

/**
 * Verifica se o texto contem qualquer termo proibido.
 * Retorna { ok: false, violacoes: [...] } - NAO lanca por padrao.
 */
export async function analisarTexto(texto: string): Promise<ResultadoSanitizacao> {
  if (!texto) return { ok: true, violacoes: [] };
  const baixo = normalizar(texto);
  const termos = await carregarTermos();
  const violacoes: ResultadoSanitizacao["violacoes"] = [];
  for (const t of termos) {
    let bate = false;
    const termoBaixo = normalizar(t.termo);
    if (t.match_tipo === "CONTAINS") {
      bate = baixo.includes(termoBaixo);
    } else if (t.match_tipo === "EXACT") {
      bate = new RegExp(`\\b${termoBaixo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(baixo);
    } else if (t.match_tipo === "REGEX") {
      try { bate = new RegExp(t.termo, "i").test(baixo); } catch { bate = false; }
    }
    if (bate) violacoes.push({ categoria: t.categoria, termo: t.termo, motivo: t.motivo });
  }
  return { ok: violacoes.length === 0, violacoes };
}

/**
 * Versao "throw on violation". Use antes de enviar QUALQUER texto
 * para o paciente (NF, TCLE, contrato, email, whatsapp).
 */
export async function exigirTextoLimpo(texto: string, contexto: string): Promise<void> {
  const r = await analisarTexto(texto);
  if (!r.ok) {
    const lista = r.violacoes.map((v) => `${v.categoria}:${v.termo}`).join(", ");
    throw new Error(`[JURIDICO_BLOQUEADO] ${contexto} contem termos proibidos: ${lista}. Manifesto IMPLANTACAO secao 4: documentos devem ser genericos para nao vincular Dr. Caio a venda de substancias.`);
  }
}

/** Forca recarga do cache (chamar apos UPDATE em juridico_termos_bloqueados). */
export function invalidarCache(): void { _cache = null; }
