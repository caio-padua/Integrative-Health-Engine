// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Frente A · Helper validador
// validarContratoFarmaciaUnidade(unidade_id, farmacia_id)
// → { valido, motivo, contrato? }
//
// Idempotente, defensivo, log estruturado. Modo B (warning, nao bloqueia)
// — callers DEVEM mostrar aviso na UI mas podem prosseguir. Em A2 vira
// hook real na emissao de prescricao + gravacao de parmavault_receitas.
// ════════════════════════════════════════════════════════════════════

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type ContratoVigente = {
  id: number;
  unidade_id: number;
  farmacia_id: number;
  tipo_relacao: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  observacoes: string | null;
};

export type ResultadoValidacao =
  | { valido: true;  contrato: ContratoVigente; motivo: "ok" }
  | { valido: false; motivo: "sem_contrato_vigente" | "contrato_inativo" | "fora_vigencia" | "id_invalido" | "erro_interno" };

export async function validarContratoFarmaciaUnidade(
  unidade_id: number,
  farmacia_id: number,
): Promise<ResultadoValidacao> {
  if (!unidade_id || unidade_id <= 0 || !farmacia_id || farmacia_id <= 0) {
    return { valido: false, motivo: "id_invalido" };
  }

  try {
    const r = await db.execute(sql`
      SELECT id, unidade_id, farmacia_id, tipo_relacao, ativo,
             vigencia_inicio, vigencia_fim, observacoes
      FROM farmacias_unidades_contrato
      WHERE unidade_id  = ${unidade_id}
        AND farmacia_id = ${farmacia_id}
      ORDER BY ativo DESC, vigencia_inicio DESC
      LIMIT 1
    `);

    if (r.rows.length === 0) {
      return { valido: false, motivo: "sem_contrato_vigente" };
    }

    const c: any = r.rows[0];
    if (c.ativo !== true) {
      return { valido: false, motivo: "contrato_inativo" };
    }

    // Vigência: today >= vigencia_inicio E (vigencia_fim NULL OU today <= vigencia_fim)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(c.vigencia_inicio);
    if (hoje < inicio) {
      return { valido: false, motivo: "fora_vigencia" };
    }
    if (c.vigencia_fim) {
      const fim = new Date(c.vigencia_fim);
      if (hoje > fim) {
        return { valido: false, motivo: "fora_vigencia" };
      }
    }

    return {
      valido: true,
      motivo: "ok",
      contrato: {
        id: Number(c.id),
        unidade_id: Number(c.unidade_id),
        farmacia_id: Number(c.farmacia_id),
        tipo_relacao: String(c.tipo_relacao),
        vigencia_inicio: String(c.vigencia_inicio),
        vigencia_fim: c.vigencia_fim ? String(c.vigencia_fim) : null,
        observacoes: c.observacoes ? String(c.observacoes) : null,
      },
    };
  } catch (err) {
    // Defensivo: nunca lança — modo B é warning, não bloqueio.
    // A2 vai logar via lib/log; aqui só fallback silencioso.
    return { valido: false, motivo: "erro_interno" };
  }
}
