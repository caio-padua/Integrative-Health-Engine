// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B1 (A2 light)
// verificarUnidadeTemContrato(unidade_id) → { temContrato, qtd, mensagem }
//
// Caminho P aprovado pelo Caio + Dr. Claude: warning é POR UNIDADE
// (nao por farmacia especifica), porque o codigo de emissao atual
// nao atribui farmacias_parmavault.id por receita. Wave 6 vai trocar.
//
// Uso: chamado dentro de emitirPrescricao ANTES de comecar a gerar
// PDFs. Resultado entra no campo `alertas` da resposta. Modo B —
// nunca bloqueia, so avisa.
// ════════════════════════════════════════════════════════════════════
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type ResultadoUnidadeContrato = {
  temContrato: boolean;
  qtd: number;
  mensagem: string;
};

export async function verificarUnidadeTemContrato(
  unidade_id: number | null | undefined,
): Promise<ResultadoUnidadeContrato> {
  if (!unidade_id || unidade_id <= 0) {
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Prescrição sem unidade vinculada — não foi possível verificar contratos com farmácias parceiras.",
    };
  }

  try {
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS qtd
      FROM farmacias_unidades_contrato
      WHERE unidade_id = ${unidade_id}
        AND ativo = true
        AND vigencia_inicio <= CURRENT_DATE
        AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
    `);
    const qtd = Number((r.rows[0] as any)?.qtd ?? 0);
    if (qtd > 0) {
      return { temContrato: true, qtd, mensagem: "" };
    }
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Esta unidade não tem contrato vigente com nenhuma farmácia parceira. Confirma emissão?",
    };
  } catch {
    // Defensivo: warning nunca bloqueia, falha vira aviso silencioso.
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Não foi possível verificar contratos vigentes (erro interno) — emissão prossegue.",
    };
  }
}

/**
 * Grava em parmavault_emissao_warnings o evento detectado, pra
 * relatorio CEO ver quantas emissoes saem sem contrato.
 */
export async function registrarWarningEmissao(args: {
  prescricao_id: number;
  unidade_id: number | null;
  motivo: "sem_contrato_unidade" | "unidade_nao_vinculada" | "erro_verificacao";
  detectado_por_usuario_id?: number | null;
  observacoes?: string | null;
}): Promise<number | null> {
  try {
    const r = await db.execute(sql`
      INSERT INTO parmavault_emissao_warnings
        (prescricao_id, unidade_id, motivo, detectado_por_usuario_id, observacoes)
      VALUES (
        ${args.prescricao_id},
        ${args.unidade_id ?? null},
        ${args.motivo},
        ${args.detectado_por_usuario_id ?? null},
        ${args.observacoes ?? null}
      )
      RETURNING id
    `);
    return Number((r.rows[0] as any)?.id ?? 0) || null;
  } catch {
    return null;
  }
}
