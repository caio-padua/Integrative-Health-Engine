import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { registrarCobrancasMensaisRecorrentes } from "../cobrancasAuto";

const COMPETENCIA_FORMAT = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const VENCIMENTO_DIA = 5;
const INADIMPLENCIA_GRACE_DIAS = 5;

export async function gerarCobrancasMensais(competenciaParam?: string) {
  const hoje = new Date();
  const competencia = competenciaParam ?? COMPETENCIA_FORMAT(hoje);
  const [ano, mes] = competencia.split("-").map((n) => parseInt(n, 10));
  const vencimento = new Date(Date.UTC(ano, (mes ?? 1) - 1, VENCIMENTO_DIA));

  const ativos = await db.execute(sql`
    SELECT
      uma.unidade_id,
      uma.modulo_id,
      COALESCE(uma.preco_personalizado, m.preco_mensal) AS valor
    FROM unidade_modulos_ativos uma
    JOIN modulos_padcon m ON m.id = uma.modulo_id
    JOIN unidades u ON u.id = uma.unidade_id
    WHERE uma.ativo = TRUE
      AND m.ativo = TRUE
      AND u.id NOT BETWEEN 1 AND 7
  `);

  let inseridas = 0;
  for (const row of ativos.rows as any[]) {
    const r = await db.execute(sql`
      INSERT INTO cobrancas_mensais_modulos (unidade_id, modulo_id, competencia_mes, valor, vencimento, status)
      VALUES (${row.unidade_id}, ${row.modulo_id}, ${competencia}, ${row.valor}, ${vencimento.toISOString().slice(0, 10)}, 'PENDENTE')
      ON CONFLICT (unidade_id, modulo_id, competencia_mes) DO NOTHING
      RETURNING id
    `);
    if (r.rows.length > 0) inseridas++;
  }
  return { competencia, vencimento: vencimento.toISOString().slice(0, 10), candidatas: ativos.rows.length, inseridas };
}

export async function marcarInadimplencia() {
  const r = await db.execute(sql`
    UPDATE cobrancas_mensais_modulos
    SET status = 'INADIMPLENTE',
        inadimplente_desde = COALESCE(inadimplente_desde, CURRENT_DATE)
    WHERE status = 'PENDENTE'
      AND vencimento < CURRENT_DATE - (${INADIMPLENCIA_GRACE_DIAS}::int)
    RETURNING id
  `);
  return { marcadas: r.rows.length };
}

let workerStarted = false;
export function iniciarWorkerCobrancaMensal() {
  if (workerStarted) return;
  workerStarted = true;

  const TICK_MS = 6 * 60 * 60 * 1000; // 6h: leve, idempotente
  console.log("[cobrancaMensal] Worker iniciado (tick " + TICK_MS / 1000 / 60 + "min, vencimento dia " + VENCIMENTO_DIA + ", grace " + INADIMPLENCIA_GRACE_DIAS + "d)");

  const tick = async () => {
    try {
      const ger = await gerarCobrancasMensais();
      if (ger.inseridas > 0) {
        console.log(`[cobrancaMensal] competencia ${ger.competencia}: ${ger.inseridas}/${ger.candidatas} cobrancas geradas`);
      }
      const inad = await marcarInadimplencia();
      if (inad.marcadas > 0) {
        console.log(`[cobrancaMensal] ${inad.marcadas} cobrancas marcadas como INADIMPLENTE`);
      }
      // T6 PARMASUPRA-TSUNAMI: cobrancas recorrentes de permissoes_delegadas
      // Idempotente por (unidade, permissao_id, mes) — seguro rodar todo tick.
      const recor = await registrarCobrancasMensaisRecorrentes();
      if (recor.geradas > 0 || recor.erros > 0) {
        console.log(`[cobrancaMensal] T6 permissoes_delegadas mes ${recor.mes}: ${recor.geradas} geradas, ${recor.ja_existentes} ja existentes, ${recor.erros} erros`);
      }
    } catch (e) {
      console.error("[cobrancaMensal] erro no tick:", (e as Error).message);
    }
  };

  setTimeout(tick, 30 * 1000);
  setInterval(tick, TICK_MS).unref();
}
