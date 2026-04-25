// PAWARDS MEDCORE · Wave 9 PARQ · Worker daily de atualização de status
// Roda a cada hora, mas só executa lógica pesada às 03:00 BRT (06:00 UTC).
// Funções:
//   1. Detecta visitas atrasadas (último data_realizada > 75 dias) → marca farmacia em_correcao
//   2. Detecta planos Kaizen vencidos sem evidência → suspende acordo
//   3. Recalcula status (gold/silver/bronze) baseado em média últimas 3 visitas
//   4. Registra mudanças em parq_historico_status
//
// Auditável: cada mudança grava motivo + run_id no campo motivo.
// Nomes de tabelas conferem com migration 030 aplicada em produção.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const TICK_MS = 60 * 60 * 1000; // 1 hora
const HORA_EXEC_BRT = 3; // 03:00 BRT (Brasilia, UTC-3)
const PRAZO_VISITA_DIAS = 75; // bimestral = 60d + tolerancia 15d

let executandoAgora = false;
let ultimoRunISO: string | null = null;

function nowBrtHour(): number {
  // Brasilia eh UTC-3 sempre (sem DST desde 2019)
  const utcH = new Date().getUTCHours();
  return (utcH - 3 + 24) % 24;
}

async function upsertStatusFarmacia(
  farmaciaId: number,
  novoStatus: string,
  motivo: string,
  score: number | null,
): Promise<boolean> {
  // Pega status anterior (pra log de historico)
  const atual: any = await db.execute(sql`
    SELECT status FROM parq_status_farmacia WHERE farmacia_id = ${farmaciaId}
  `);
  const linha = (atual.rows ?? atual)[0];
  const anterior: string | null = linha?.status ?? null;

  // Se já está no novo status, não faz nada
  if (anterior === novoStatus) return false;

  // Não rebaixa farmacia denunciada/suspensa via worker
  if (anterior === "denunciada" || anterior === "suspensa") return false;

  // Upsert status_farmacia
  await db.execute(sql`
    INSERT INTO parq_status_farmacia (farmacia_id, status, score_ultima_auditoria, updated_at)
    VALUES (${farmaciaId}, ${novoStatus}::parq_farmacia_status, ${score}, NOW())
    ON CONFLICT (farmacia_id) DO UPDATE SET
      status = EXCLUDED.status,
      score_ultima_auditoria = COALESCE(EXCLUDED.score_ultima_auditoria, parq_status_farmacia.score_ultima_auditoria),
      updated_at = NOW()
  `);

  // Insere historico
  await db.execute(sql`
    INSERT INTO parq_historico_status
      (farmacia_id, status_anterior, status_novo, motivo, mudado_em, mudado_por)
    VALUES (
      ${farmaciaId},
      ${anterior}::parq_farmacia_status,
      ${novoStatus}::parq_farmacia_status,
      ${motivo},
      NOW(),
      NULL
    )
  `);
  return true;
}

async function rodarLogicaCompleta(runId: string) {
  const stats = {
    visitas_atrasadas: 0,
    planos_vencidos: 0,
    acordos_suspensos: 0,
    status_recalculados: 0,
    erros: 0 as number,
  };

  // Conjunto de farmacias travadas em estado corretivo neste run.
  // O passo 3 (recalculo de tier) NAO pode promover farmacias que acabaram de
  // ser marcadas em_correcao/suspensa neste mesmo ciclo - protege a regra de
  // negocio "atraso/plano vencido vence recalculo automatico no mesmo run".
  const farmaciasTravadasNesteRun = new Set<number>();

  try {
    // ─── 1. Visitas atrasadas (último data_realizada > 75 dias) ───
    const atrRows: any = await db.execute(sql`
      SELECT DISTINCT pa.farmacia_id
      FROM parq_acordos pa
      WHERE pa.status = 'vigente'
        AND NOT EXISTS (
          SELECT 1 FROM parq_visitas_bimestrais vk
          WHERE vk.acordo_id = pa.id
            AND vk.data_realizada IS NOT NULL
            AND vk.data_realizada > NOW() - INTERVAL '${sql.raw(String(PRAZO_VISITA_DIAS))} days'
        )
    `);
    const farmaciasAtrasadas = (atrRows.rows ?? atrRows) as Array<any>;
    stats.visitas_atrasadas = farmaciasAtrasadas.length;

    for (const f of farmaciasAtrasadas) {
      try {
        const mudou = await upsertStatusFarmacia(
          f.farmacia_id,
          "em_correcao",
          `Visita Kaizen atrasada (worker daily ${runId})`,
          null,
        );
        // Trava ESTA farmacia contra o passo 3, INDEPENDENTE de mudou ou nao.
        // Mesmo se ja estava em_correcao, nao queremos que recalculo a promova.
        farmaciasTravadasNesteRun.add(Number(f.farmacia_id));
      } catch (e) {
        stats.erros += 1;
        console.error(`[parqStatus] erro marcar em_correcao farmacia=${f.farmacia_id}:`, (e as Error).message);
      }
    }

    // ─── 2. Planos Kaizen vencidos sem evidência → suspende acordo ───
    const venRows: any = await db.execute(sql`
      SELECT pk.id AS plano_id, pk.visita_id, vk.acordo_id, vk.farmacia_id
      FROM parq_planos_acao_kaizen pk
      JOIN parq_visitas_bimestrais vk ON vk.id = pk.visita_id
      JOIN parq_acordos pa ON pa.id = vk.acordo_id
      WHERE pk.status = 'aberto'
        AND pk.prazo_limite < NOW()
        AND pk.evidencia_conclusao_url IS NULL
        AND pa.status = 'vigente'
    `);
    const planosVencidos = (venRows.rows ?? venRows) as Array<any>;
    stats.planos_vencidos = planosVencidos.length;

    for (const p of planosVencidos) {
      try {
        await db.execute(sql`
          UPDATE parq_planos_acao_kaizen
          SET status = 'expirado'::parq_plano_status
          WHERE id = ${p.plano_id}
        `);
        await db.execute(sql`
          UPDATE parq_acordos
          SET status = 'suspenso'::parq_status_acordo,
              updated_at = NOW()
          WHERE id = ${p.acordo_id} AND status = 'vigente'
        `);
        await upsertStatusFarmacia(
          p.farmacia_id,
          "suspensa",
          `Acordo suspenso por plano vencido (worker ${runId})`,
          null,
        );
        // Trava ESTA farmacia contra o passo 3 (suspensa por plano vencido tem
        // precedencia sobre recalculo automatico de tier).
        farmaciasTravadasNesteRun.add(Number(p.farmacia_id));
        stats.acordos_suspensos += 1;
      } catch (e) {
        stats.erros += 1;
        console.error(`[parqStatus] erro suspender acordo=${p.acordo_id}:`, (e as Error).message);
      }
    }

    // ─── 3. Recalcular status (gold/silver/bronze) últimas 3 visitas ───
    const recRows: any = await db.execute(sql`
      SELECT pa.farmacia_id, AVG(sub.score_geral) AS media3
      FROM parq_acordos pa
      JOIN LATERAL (
        SELECT score_geral FROM parq_visitas_bimestrais
        WHERE acordo_id = pa.id AND data_realizada IS NOT NULL AND score_geral IS NOT NULL
        ORDER BY data_realizada DESC LIMIT 3
      ) sub ON true
      WHERE pa.status = 'vigente'
      GROUP BY pa.farmacia_id
      HAVING COUNT(*) >= 1
    `);
    const recs = (recRows.rows ?? recRows) as Array<any>;
    for (const r of recs) {
      const farmaciaId = Number(r.farmacia_id);
      // Precedencia operacional: farmacias travadas no passo 1 ou 2 (atraso ou
      // plano vencido) NAO podem ser promovidas pelo recalculo automatico no
      // mesmo run. Aguardam novo ciclo Kaizen pra sair do estado corretivo.
      if (farmaciasTravadasNesteRun.has(farmaciaId)) {
        continue;
      }
      const m = Number(r.media3 ?? 0);
      const novoStatus =
        m >= 4.5 ? "gold" :
        m >= 3.5 ? "silver" :
        m >= 2.5 ? "bronze" :
        "em_correcao";
      try {
        const mudou = await upsertStatusFarmacia(
          farmaciaId,
          novoStatus,
          `Recalculo automatico bimestral (worker ${runId}) score=${m.toFixed(2)}`,
          m,
        );
        if (mudou) stats.status_recalculados += 1;
      } catch (e) {
        stats.erros += 1;
        console.error(`[parqStatus] erro recalc farmacia=${farmaciaId}:`, (e as Error).message);
      }
    }
  } catch (e) {
    stats.erros += 1;
    console.error("[parqStatus] erro fatal:", (e as Error).message);
  }

  console.log(
    `[parqStatus ${runId}] OK | visitas_atrasadas=${stats.visitas_atrasadas} planos_vencidos=${stats.planos_vencidos} suspensos=${stats.acordos_suspensos} recalc=${stats.status_recalculados} erros=${stats.erros}`,
  );
  return stats;
}

export function iniciarWorkerParqStatusUpdate() {
  console.log(
    `[parqStatus] Worker daily iniciado (tick ${TICK_MS / 60000}min, exec ${HORA_EXEC_BRT}:00 BRT)`,
  );

  setInterval(() => {
    void (async () => {
      if (executandoAgora) return;
      const horaBrt = nowBrtHour();
      const hojeISO = new Date().toISOString().slice(0, 10);

      // Só roda 1x por dia, na hora alvo
      if (horaBrt !== HORA_EXEC_BRT) return;
      if (ultimoRunISO === hojeISO) return;

      executandoAgora = true;
      const runId = `run_${hojeISO}_${Date.now()}`;

      // ─── Lock distribuido via Postgres advisory lock ───
      // Garante que mesmo em cluster (multiplas instancias do api-server)
      // apenas UMA execute o ciclo diario. ID arbitrario fixo 30303030 reservado
      // pra Wave 9 PARQ (nao colide com locks de outros workers).
      // Se outro pod ja pegou, simplesmente saimos sem rodar.
      const PARQ_ADVISORY_LOCK_ID = 30303030;
      let lockAdquirido = false;
      try {
        const lockRes: any = await db.execute(
          sql`SELECT pg_try_advisory_lock(${PARQ_ADVISORY_LOCK_ID}) AS got`,
        );
        const linhaLock = (lockRes.rows ?? lockRes)[0];
        lockAdquirido = Boolean(linhaLock?.got);

        if (!lockAdquirido) {
          console.log(`[parqStatus ${runId}] lock distribuido nao adquirido, outro pod ja esta rodando`);
          return;
        }

        await rodarLogicaCompleta(runId);
        ultimoRunISO = hojeISO;
      } catch (e) {
        console.error(`[parqStatus ${runId}] erro fatal:`, (e as Error).message);
      } finally {
        if (lockAdquirido) {
          try {
            await db.execute(sql`SELECT pg_advisory_unlock(${PARQ_ADVISORY_LOCK_ID})`);
          } catch (e) {
            console.error(`[parqStatus ${runId}] erro release lock:`, (e as Error).message);
          }
        }
        executandoAgora = false;
      }
    })();
  }, TICK_MS);
}

// Exporta lógica pra teste manual / endpoint admin
export async function rodarParqStatusUpdateAgora(): Promise<any> {
  const runId = `manual_${Date.now()}`;
  return rodarLogicaCompleta(runId);
}
