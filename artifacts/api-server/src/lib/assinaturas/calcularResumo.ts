/**
 * Wave 10.6 · Helper compartilhado de calculo do resumo de assinaturas (7d
 * vs janela anterior, com cor semantica).
 *
 * Extraido de routes/assinaturas.ts (`GET /assinaturas/resumo-hoje`) pra que
 * o worker `alertaAssinaturasCEO` use exatamente o mesmo calculo do banner —
 * sem essa garantia, o alerta dispararia em criterio diferente do que o CEO
 * ve na tela.
 *
 * Ler resumo do dia inteiro em America/Sao_Paulo (mesma TZ do banner).
 *
 * Aceita filtro opcional por `unidadeId` (Task #43): assinatura_solicitacoes
 * nao tem unidade_id direta, derivamos via JOIN pacientes.unidade_id. Quando
 * `unidadeId` e null/undefined: agregado da rede inteira (uso default do
 * worker `alertaCEO` e do banner sem filtro).
 */
import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";

export type Cor = "excelente" | "bom" | "atencao" | "critico" | "neutro";

export interface SerieDia {
  dia: string;
  enviadas: number;
  assinadas: number;
  rejeitadas: number;
}

export interface Resumo24h {
  enviadas: number;
  assinadas: number;
  rejeitadas: number;
  pendentes: number;
}

export interface ResumoAssinaturas {
  // Janela 24h (compat retro Task #35)
  janela24h: Resumo24h;
  // Serie 7 dias (D-6..hoje, BRT)
  serie7d: SerieDia[];
  // Totais agregados 7d e janela anterior 7d (D-13..D-7)
  enviadas7d: number;
  assinadas7d: number;
  rejeitadas7d: number;
  enviadasPrev: number;
  assinadasPrev: number;
  rejeitadasPrev: number;
  variacaoEnviadasPct: number | null;
  variacaoAssinadasPct: number | null;
  variacaoRejeitadasPct: number | null;
  taxaConversao: number | null;
  taxaConversaoPrev: number | null;
  variacaoConversaoPp: number | null;
  corEnviadas: Cor;
  corAssinadas: Cor;
  corRejeitadas: Cor;
  corConversao: Cor;
}

export function variacaoPct(atual: number, prev: number): number | null {
  if (prev === 0) return atual === 0 ? 0 : null;
  return Math.round(((atual - prev) / prev) * 1000) / 10;
}

// Polaridade "subir = bom".
export function semanticoCor(pct: number | null): Cor {
  if (pct === null) return "neutro";
  if (pct >= 10) return "excelente";
  if (pct >= 0) return "bom";
  if (pct >= -10) return "atencao";
  return "critico";
}

// Polaridade invertida pra rejeicoes: subir = ruim.
export function corRejeicao(pct: number | null): Cor {
  if (pct === null) return "neutro";
  if (pct <= -10) return "excelente";
  if (pct <= 0) return "bom";
  if (pct <= 10) return "atencao";
  return "critico";
}

export interface CalcularResumoOpts {
  /** Quando definido, filtra solicitacoes por pacientes.unidade_id. */
  unidadeId?: number | null;
}

export async function calcularResumoAssinaturas(
  opts: CalcularResumoOpts = {},
): Promise<ResumoAssinaturas> {
  const unidadeId = opts.unidadeId ?? null;
  // Filtro JOIN parcial reusado nas 3 queries. sql template segura
  // interpolacao numerica via ${}.
  const filtroUnidadeJoin: SQL = unidadeId !== null
    ? sql`JOIN pacientes p_filt ON p_filt.id = s.paciente_id AND p_filt.unidade_id = ${unidadeId}`
    : sql``;

  // Janela 24h (compat retro com banner CEO Task #35)
  const r24: any = await db.execute(sql`
    WITH janela AS (
      SELECT s.* FROM assinatura_solicitacoes s
      ${filtroUnidadeJoin}
      WHERE s.criado_em >= now() - interval '24 hours'
         OR s.concluido_em >= now() - interval '24 hours'
    )
    SELECT
      COUNT(*) FILTER (WHERE criado_em >= now() - interval '24 hours')::int            AS enviadas,
      COUNT(*) FILTER (WHERE status = 'CONCLUIDO' AND concluido_em >= now() - interval '24 hours')::int AS assinadas,
      COUNT(*) FILTER (WHERE status = 'REJEITADO' AND criado_em >= now() - interval '24 hours')::int    AS rejeitadas,
      COUNT(*) FILTER (WHERE status IN ('ENVIADO','CRIADO') AND criado_em >= now() - interval '24 hours')::int AS pendentes
    FROM janela
  `);
  const row24 = ((r24.rows ?? r24)[0] || {}) as Record<string, unknown>;
  const janela24h: Resumo24h = {
    enviadas: Number(row24["enviadas"] || 0),
    assinadas: Number(row24["assinadas"] || 0),
    rejeitadas: Number(row24["rejeitadas"] || 0),
    pendentes: Number(row24["pendentes"] || 0),
  };

  const serieR: any = await db.execute(sql`
    WITH dias AS (
      SELECT generate_series(
        date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '6 days',
        date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo'),
        interval '1 day'
      )::date AS dia
    ), solic AS (
      SELECT s.* FROM assinatura_solicitacoes s
      ${filtroUnidadeJoin}
    )
    SELECT
      to_char(d.dia, 'YYYY-MM-DD') AS dia,
      COUNT(s.*) FILTER (WHERE (s.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS enviadas,
      COUNT(s.*) FILTER (WHERE s.status = 'CONCLUIDO' AND (s.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS assinadas,
      COUNT(s.*) FILTER (WHERE s.status = 'REJEITADO' AND (s.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS rejeitadas
    FROM dias d
    LEFT JOIN solic s
      ON (s.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia
      OR (s.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia
    GROUP BY d.dia
    ORDER BY d.dia
  `);
  const serieRows = (serieR.rows ?? serieR) as Array<Record<string, unknown>>;
  const serie7d: SerieDia[] = serieRows.map((r) => ({
    dia: String(r["dia"]),
    enviadas: Number(r["enviadas"] || 0),
    assinadas: Number(r["assinadas"] || 0),
    rejeitadas: Number(r["rejeitadas"] || 0),
  }));
  const enviadas7d = serie7d.reduce((a, r) => a + r.enviadas, 0);
  const assinadas7d = serie7d.reduce((a, r) => a + r.assinadas, 0);
  const rejeitadas7d = serie7d.reduce((a, r) => a + r.rejeitadas, 0);

  const prevR: any = await db.execute(sql`
    WITH ref AS (
      SELECT date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje
    ), solic AS (
      SELECT s.* FROM assinatura_solicitacoes s
      ${filtroUnidadeJoin}
    )
    SELECT
      COUNT(*) FILTER (WHERE (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS enviadas_prev,
      COUNT(*) FILTER (WHERE status = 'CONCLUIDO' AND (concluido_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS assinadas_prev,
      COUNT(*) FILTER (WHERE status = 'REJEITADO' AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS rejeitadas_prev
    FROM solic
  `);
  const prev = ((prevR.rows ?? prevR)[0] || {}) as Record<string, unknown>;
  const enviadasPrev = Number(prev["enviadas_prev"] || 0);
  const assinadasPrev = Number(prev["assinadas_prev"] || 0);
  const rejeitadasPrev = Number(prev["rejeitadas_prev"] || 0);

  const variacaoEnviadasPct = variacaoPct(enviadas7d, enviadasPrev);
  const variacaoAssinadasPct = variacaoPct(assinadas7d, assinadasPrev);
  const variacaoRejeitadasPct = variacaoPct(rejeitadas7d, rejeitadasPrev);

  const taxaConversao = enviadas7d > 0 ? Math.round((assinadas7d / enviadas7d) * 1000) / 10 : null;
  const taxaConversaoPrev = enviadasPrev > 0 ? Math.round((assinadasPrev / enviadasPrev) * 1000) / 10 : null;
  const variacaoConversaoPp =
    taxaConversao !== null && taxaConversaoPrev !== null
      ? Math.round((taxaConversao - taxaConversaoPrev) * 10) / 10
      : null;

  return {
    janela24h, serie7d,
    enviadas7d, assinadas7d, rejeitadas7d,
    enviadasPrev, assinadasPrev, rejeitadasPrev,
    variacaoEnviadasPct, variacaoAssinadasPct, variacaoRejeitadasPct,
    taxaConversao, taxaConversaoPrev, variacaoConversaoPp,
    corEnviadas: semanticoCor(variacaoEnviadasPct),
    corAssinadas: semanticoCor(variacaoAssinadasPct),
    corRejeitadas: corRejeicao(variacaoRejeitadasPct),
    corConversao: semanticoCor(variacaoConversaoPp),
  };
}
