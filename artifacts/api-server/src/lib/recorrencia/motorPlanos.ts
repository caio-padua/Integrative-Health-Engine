import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type IniciarAdesaoInput = {
  pacienteId: number;
  templateId: number;
  unidadeId?: number | null;
  dataInicio?: Date;
};

export async function iniciarAdesao(input: IniciarAdesaoInput) {
  const dataInicio = input.dataInicio ?? new Date();

  // IDEMPOTENCIA: se ja existe adesao ATIVA para o mesmo paciente+template, retorna a existente.
  const existRows: any = await db.execute(sql`
    SELECT * FROM adesoes_plano
    WHERE paciente_id = ${input.pacienteId} AND template_id = ${input.templateId} AND status = 'ATIVO'
    LIMIT 1
  `);
  const existente = (existRows.rows ?? existRows)[0];
  if (existente) {
    return { adesao: existente, total_eventos_programados: existente.total_eventos_pendentes ?? 0, ja_existia: true };
  }

  const tplRows: any = await db.execute(
    sql`SELECT * FROM planos_terapeuticos_template WHERE id = ${input.templateId} AND ativo = true`,
  );
  const tpl = (tplRows.rows ?? tplRows)[0];
  if (!tpl) throw new Error(`Template ${input.templateId} nao encontrado ou inativo`);

  const fasesRows: any = await db.execute(
    sql`SELECT * FROM fases_plano_template WHERE template_id = ${input.templateId} ORDER BY ordem`,
  );
  const fases = (fasesRows.rows ?? fasesRows) as Array<any>;
  if (fases.length === 0) throw new Error("Template sem fases");

  const totalDias = fases.reduce((s, f) => s + Number(f.duracao_dias || 0), 0);
  const dataFim = new Date(dataInicio.getTime() + totalDias * 86400000);

  const adesaoRows: any = await db.execute(sql`
    INSERT INTO adesoes_plano (paciente_id, template_id, unidade_id, data_inicio, data_prevista_fim, fase_atual_codigo, status)
    VALUES (${input.pacienteId}, ${input.templateId}, ${input.unidadeId ?? null}, ${dataInicio.toISOString().slice(0, 10)}, ${dataFim.toISOString().slice(0, 10)}, ${fases[0].codigo}, 'ATIVO')
    RETURNING *
  `);
  const adesao = (adesaoRows.rows ?? adesaoRows)[0];

  let cursor = new Date(dataInicio);
  let totalEventos = 0;
  for (const fase of fases) {
    const acoes: string[] = Array.isArray(fase.acoes_esperadas) ? fase.acoes_esperadas : [];
    const meio = new Date(cursor.getTime() + (Number(fase.duracao_dias) / 2) * 86400000);
    const fim = new Date(cursor.getTime() + Number(fase.duracao_dias) * 86400000);
    for (const acao of acoes) {
      const quando = acao === "RAS_INICIAL" ? cursor : acao === "RENOVACAO_AVISO" ? new Date(fim.getTime() - 7 * 86400000) : meio;
      await db.execute(sql`
        INSERT INTO eventos_programados (adesao_id, paciente_id, unidade_id, tipo_evento, agendado_para, payload, status)
        VALUES (${adesao.id}, ${input.pacienteId}, ${input.unidadeId ?? null}, ${acao}, ${quando.toISOString()}, ${JSON.stringify({ fase_codigo: fase.codigo, fase_nome: fase.nome })}, 'PENDENTE')
      `);
      totalEventos += 1;
    }
    cursor = fim;
  }

  await db.execute(sql`UPDATE adesoes_plano SET total_eventos_pendentes = ${totalEventos} WHERE id = ${adesao.id}`);
  return { adesao, total_eventos_programados: totalEventos };
}

export async function executarEventosVencidos(limit = 50) {
  // CLAIM ATOMICO: marca eventos como PROCESSANDO num UPDATE...RETURNING dentro de CTE
  // Garante que nenhum outro worker (ou execucao manual via endpoint) pegue o mesmo evento.
  const claimRows: any = await db.execute(sql`
    WITH alvo AS (
      SELECT id FROM eventos_programados
      WHERE status = 'PENDENTE' AND agendado_para <= now()
      ORDER BY agendado_para ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE eventos_programados e
    SET status = 'PROCESSANDO', tentativas = e.tentativas + 1
    FROM alvo
    WHERE e.id = alvo.id
    RETURNING e.*
  `);
  const eventos = (claimRows.rows ?? claimRows) as Array<any>;
  let executados = 0;
  for (const ev of eventos) {
    try {
      const log = `[${ev.tipo_evento}] paciente_id=${ev.paciente_id} adesao_id=${ev.adesao_id} payload=${JSON.stringify(ev.payload || {})}`;
      console.log("[motorPlanos]", log);
      await db.execute(sql`
        UPDATE eventos_programados
        SET status = 'EXECUTADO', executado_em = now(), resultado_log = ${log}
        WHERE id = ${ev.id}
      `);
      await db.execute(sql`
        UPDATE adesoes_plano SET total_eventos_pendentes = GREATEST(total_eventos_pendentes - 1, 0), atualizado_em = now()
        WHERE id = ${ev.adesao_id}
      `);
      executados += 1;
    } catch (e) {
      try {
        const novaTentativa = Number(ev.tentativas) + 1;
        const novoStatus = novaTentativa >= 3 ? "FALHOU" : "PENDENTE";
        await db.execute(sql`
          UPDATE eventos_programados
          SET status = ${novoStatus}, resultado_log = ${"ERRO tentativa " + novaTentativa + ": " + (e as Error).message}
          WHERE id = ${ev.id}
        `);
      } catch (inner) {
        console.error("[motorPlanos] falha ao registrar erro do evento", ev.id, (inner as Error).message);
      }
    }
  }
  return { executados, total_lote: eventos.length };
}

export async function recalcularScoresRiscoAbandono() {
  await db.execute(sql`
    UPDATE adesoes_plano a SET score_risco_abandono = LEAST(10, GREATEST(0,
      CASE
        WHEN a.ultimo_atendimento_em IS NULL AND a.criado_em < now() - INTERVAL '30 days' THEN 8
        WHEN a.ultimo_atendimento_em < now() - INTERVAL '60 days' THEN 9
        WHEN a.ultimo_atendimento_em < now() - INTERVAL '30 days' THEN 6
        WHEN a.total_eventos_pendentes > 5 THEN 7
        ELSE 2
      END
    )), atualizado_em = now()
    WHERE status = 'ATIVO'
  `);
  const rows: any = await db.execute(sql`
    SELECT id, paciente_id, score_risco_abandono FROM adesoes_plano
    WHERE status = 'ATIVO' AND score_risco_abandono >= 7
    ORDER BY score_risco_abandono DESC
  `);
  return (rows.rows ?? rows) as Array<any>;
}

let workerStarted = false;
export function iniciarWorkerRecorrencia() {
  if (workerStarted) return;
  workerStarted = true;
  const intervalMs = 5 * 60 * 1000;
  console.log("[motorPlanos] Worker de recorrencia iniciado (intervalo " + intervalMs / 1000 + "s)");
  setInterval(async () => {
    try {
      const r = await executarEventosVencidos(50);
      if (r.executados > 0) console.log(`[motorPlanos] tick - ${r.executados}/${r.total_lote} eventos executados`);
    } catch (e) {
      console.error("[motorPlanos] erro no tick:", (e as Error).message);
    }
  }, intervalMs).unref();
  setInterval(async () => {
    try {
      const riscos = await recalcularScoresRiscoAbandono();
      if (riscos.length > 0) console.log(`[motorPlanos] ${riscos.length} pacientes com risco abandono >= 7`);
    } catch (e) {
      console.error("[motorPlanos] erro ao recalcular scores:", (e as Error).message);
    }
  }, 60 * 60 * 1000).unref();
}
