// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Onda 2 · Roteador automático
// rotearFarmaciaParaReceita() — cascata de regras Caio:
//   1. override_farmacia_id (médico escolheu na mão)
//   2. contrato vigente unidade↔farmácia (Wave 5 frente A1)
//   3. exclusividade (se há exclusiva no pool, só ela)
//   4. ativo + acionavel_por_criterio
//   5. tipo_bloco em aceita_blocos_tipos (vazio = aceita tudo)
//   6. cota_pct_max (vs métricas mês corrente)
//   7. cota_receitas_max_mes (vs métricas mês corrente)
//   8. ordena por prioridade ASC, capacidade restante DESC
//
// Defensivo: nunca lança. Sempre retorna estrutura completa pro caller
// decidir (modo B warning, não bloqueia).
// ════════════════════════════════════════════════════════════════════

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type FarmaciaCandidata = {
  id: number;
  nome_fantasia: string;
  nivel_exclusividade: string;
  prioridade: number;
  cota_pct_max: number | null;
  cota_receitas_max_mes: number | null;
  qtd_emissoes_mes: number;
  pct_atual_mes: number;        // % do total emitido pelo pool no mês
  capacidade_restante: number;  // qtd ainda permitida no mês (null cota = MAX_SAFE)
  motivo_eliminacao: string | null;
};

export type ResultadoRoteamento = {
  ok: boolean;
  regra_aplicada:
    | "manual_override"
    | "exclusividade"
    | "cascata_criterios"
    | "sem_contrato_unidade"
    | "sem_candidata"
    | "id_invalido"
    | "erro_interno";
  contrato_unidade_ok: boolean;
  farmacia_escolhida: FarmaciaCandidata | null;
  alternativas: FarmaciaCandidata[];
  rejeitadas: FarmaciaCandidata[];
  contexto: {
    unidade_id: number;
    tipo_bloco: string | null;
    override_farmacia_id: number | null;
    ano_mes: string;
    total_emissoes_mes_pool: number;
  };
};

export type ParamsRoteamento = {
  unidade_id: number;
  tipo_bloco?: string | null;
  override_farmacia_id?: number | null;
  valor_estimado?: number | null;  // reservado pra A2 (gravar parmavault_receitas)
};

function anoMesAtual(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export async function rotearFarmaciaParaReceita(
  p: ParamsRoteamento,
): Promise<ResultadoRoteamento> {
  const ano_mes = anoMesAtual();
  const ctxBase = {
    unidade_id: Number(p.unidade_id),
    tipo_bloco: p.tipo_bloco ? String(p.tipo_bloco) : null,
    override_farmacia_id: p.override_farmacia_id ? Number(p.override_farmacia_id) : null,
    ano_mes,
    total_emissoes_mes_pool: 0,
  };

  if (!ctxBase.unidade_id || ctxBase.unidade_id <= 0) {
    return { ok: false, regra_aplicada: "id_invalido", contrato_unidade_ok: false,
             farmacia_escolhida: null, alternativas: [], rejeitadas: [], contexto: ctxBase };
  }

  try {
    // ─── Passo 1+2: contratos vigentes + métricas mês corrente
    // (JOIN único, sem IN array — evita problema de cast em drizzle)
    const rows = await db.execute(sql`
      SELECT fp.id, fp.nome_fantasia, fp.nivel_exclusividade, fp.prioridade,
             fp.cota_pct_max, fp.cota_receitas_max_mes,
             fp.acionavel_por_criterio, fp.disponivel_manual, fp.ativo,
             fp.aceita_blocos_tipos,
             COALESCE(femm.qtd_emissoes, 0) AS qtd_emissoes_mes
      FROM farmacias_unidades_contrato fuc
      JOIN farmacias_parmavault fp ON fp.id = fuc.farmacia_id
      LEFT JOIN farmacias_emissao_metricas_mes femm
        ON femm.farmacia_id = fp.id AND femm.ano_mes = ${ano_mes}
      WHERE fuc.unidade_id = ${ctxBase.unidade_id}
        AND fuc.ativo = TRUE
        AND CURRENT_DATE >= fuc.vigencia_inicio
        AND (fuc.vigencia_fim IS NULL OR CURRENT_DATE <= fuc.vigencia_fim)
    `);

    if (rows.rows.length === 0) {
      return { ok: false, regra_aplicada: "sem_contrato_unidade", contrato_unidade_ok: false,
               farmacia_escolhida: null, alternativas: [], rejeitadas: [], contexto: ctxBase };
    }

    const contratos = { rows: rows.rows };
    let totalPool = 0;
    for (const m of rows.rows as any[]) totalPool += Number(m.qtd_emissoes_mes || 0);
    const ctx = { ...ctxBase, total_emissoes_mes_pool: totalPool };

    // ─── Passo 3: monta candidatas com métricas + capacidade ─────
    const candidatas: FarmaciaCandidata[] = contratos.rows.map((r: any) => {
      const qtd = Number(r.qtd_emissoes_mes || 0);
      const pct = totalPool > 0 ? (qtd / totalPool) * 100 : 0;
      const cotaPct = r.cota_pct_max != null ? Number(r.cota_pct_max) : null;
      const cotaAbs = r.cota_receitas_max_mes != null ? Number(r.cota_receitas_max_mes) : null;
      const capPorAbs = cotaAbs != null ? Math.max(0, cotaAbs - qtd) : Number.MAX_SAFE_INTEGER;
      // capacidade por % é estimada: se cotaPct=20% e total=10, cota deixa 2 emissões; já tem 1 → resta 1
      const capPorPct = cotaPct != null && totalPool > 0
        ? Math.max(0, Math.floor((cotaPct / 100) * (totalPool + 1)) - qtd)
        : Number.MAX_SAFE_INTEGER;
      return {
        id: Number(r.id),
        nome_fantasia: String(r.nome_fantasia),
        nivel_exclusividade: String(r.nivel_exclusividade || "parceira"),
        prioridade: Number(r.prioridade ?? 100),
        cota_pct_max: cotaPct,
        cota_receitas_max_mes: cotaAbs,
        qtd_emissoes_mes: qtd,
        pct_atual_mes: Number(pct.toFixed(2)),
        capacidade_restante: Math.min(capPorAbs, capPorPct),
        motivo_eliminacao: null,
        // campos auxiliares (não tipados) usados pelos filtros
        ...(({} as any) && { _ativo: r.ativo, _acionavel: r.acionavel_por_criterio,
                              _aceita: r.aceita_blocos_tipos || [] }),
      } as any;
    });

    // ─── Passo 4: override manual (só vale se está no contrato) ────
    if (ctx.override_farmacia_id) {
      const escolhida = candidatas.find((c) => c.id === ctx.override_farmacia_id);
      if (escolhida) {
        return {
          ok: true, regra_aplicada: "manual_override", contrato_unidade_ok: true,
          farmacia_escolhida: escolhida,
          alternativas: candidatas.filter((c) => c.id !== escolhida.id).slice(0, 3),
          rejeitadas: [], contexto: ctx,
        };
      }
      // override inválido — segue cascata mas marca rejeitada
    }

    // ─── Passo 5: filtros em cascata (com motivo de eliminação) ────
    const rejeitadas: FarmaciaCandidata[] = [];
    let pool = candidatas.filter((c: any) => {
      if (!c._ativo) { c.motivo_eliminacao = "farmacia_inativa"; rejeitadas.push(c); return false; }
      if (!c._acionavel) { c.motivo_eliminacao = "nao_acionavel_por_criterio"; rejeitadas.push(c); return false; }
      return true;
    });

    // Exclusividade: se alguma é exclusiva, só ela passa
    const exclusivas = pool.filter((c) => c.nivel_exclusividade === "exclusiva");
    let regra: ResultadoRoteamento["regra_aplicada"] = "cascata_criterios";
    if (exclusivas.length > 0) {
      const naoExcl = pool.filter((c) => c.nivel_exclusividade !== "exclusiva");
      naoExcl.forEach((c) => { c.motivo_eliminacao = "preempcao_por_exclusiva"; rejeitadas.push(c); });
      pool = exclusivas;
      regra = "exclusividade";
    }

    // Tipo de bloco
    if (ctx.tipo_bloco) {
      pool = pool.filter((c: any) => {
        const aceita: string[] = c._aceita || [];
        if (aceita.length === 0) return true; // vazio = aceita tudo
        if (aceita.includes(ctx.tipo_bloco!)) return true;
        c.motivo_eliminacao = `nao_aceita_bloco_${ctx.tipo_bloco}`;
        rejeitadas.push(c);
        return false;
      });
    }

    // Cota %
    pool = pool.filter((c) => {
      if (c.cota_pct_max == null) return true;
      if (c.pct_atual_mes < c.cota_pct_max) return true;
      c.motivo_eliminacao = `cota_pct_estourada_${c.pct_atual_mes}_de_${c.cota_pct_max}`;
      rejeitadas.push(c);
      return false;
    });

    // Cota absoluta
    pool = pool.filter((c) => {
      if (c.cota_receitas_max_mes == null) return true;
      if (c.qtd_emissoes_mes < c.cota_receitas_max_mes) return true;
      c.motivo_eliminacao = `cota_abs_estourada_${c.qtd_emissoes_mes}_de_${c.cota_receitas_max_mes}`;
      rejeitadas.push(c);
      return false;
    });

    if (pool.length === 0) {
      return { ok: false, regra_aplicada: "sem_candidata", contrato_unidade_ok: true,
               farmacia_escolhida: null, alternativas: [], rejeitadas, contexto: ctx };
    }

    // Ordena: prioridade ASC, capacidade restante DESC
    pool.sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      return b.capacidade_restante - a.capacidade_restante;
    });

    const escolhida = pool[0];
    const alternativas = pool.slice(1, 4);

    // Limpa campos auxiliares do payload de saída
    [escolhida, ...alternativas, ...rejeitadas].forEach((c: any) => {
      delete c._ativo; delete c._acionavel; delete c._aceita;
    });

    return {
      ok: true, regra_aplicada: regra, contrato_unidade_ok: true,
      farmacia_escolhida: escolhida, alternativas, rejeitadas, contexto: ctx,
    };
  } catch (err) {
    console.error("[rotearFarmaciaParaReceita] erro:", err);
    return { ok: false, regra_aplicada: "erro_interno", contrato_unidade_ok: false,
             farmacia_escolhida: null, alternativas: [], rejeitadas: [], contexto: ctxBase };
  }
}
