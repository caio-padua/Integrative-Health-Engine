/**
 * Task #267 — Worker: avisa o CEO quando um mesmo destinatario (email ou
 * telefone) falha em N tentativas consecutivas dentro do MESMO evento de
 * kill-switch (suspensao, reativacao, reenvio).
 *
 * Por que existe:
 *   Cada evento em `auditoria_kill_switch` carrega `metadata.avisos[]` com
 *   detalhes_email[] / detalhes_whatsapp[] por destinatario (Task #148 +
 *   #176). Quando o mesmo email da uma sequencia de `sucesso=false` (caixa
 *   cheia, conta deletada, dominio expirado) ou o mesmo telefone falha
 *   varias vezes (numero trocado, bloqueio do provedor), hoje so ficamos
 *   sabendo se alguem entra na auditoria por conta propria. Este worker
 *   transforma esse padrao em alerta proativo na fila de seguranca do CEO,
 *   reusando toda a infra existente (alertas_ceo_seguranca + painel
 *   /plataforma/alertas-seguranca da Task #152).
 *
 * Comportamento:
 *   - Tick 30min, lock distribuido `pg_try_advisory_lock(30303036)`.
 *     Familia 30303xxx em uso: 30, 31, 32, 33, 34, 35. Proximo livre: 36.
 *   - Varre `auditoria_kill_switch` dos ultimos JANELA_DIAS dias (default
 *     30) que tem `metadata->'avisos'` nao-vazio.
 *   - Pra cada evento, agrupa `detalhes_email[]` (canal=EMAIL) e
 *     `detalhes_whatsapp[]` (canal=WHATSAPP) por destinatario, percorre
 *     cronologicamente os avisos[] e mantem um streak: sucesso=true zera,
 *     sucesso=false incrementa. Se o streak atinge FALHAS_CONSECUTIVAS_MIN
 *     (default 3), o destinatario entra na lista pra alerta.
 *   - Idempotencia: antes do INSERT, faz SELECT pelo fingerprint
 *     (evento_id + canal + destinatario) — ja existindo, no-op. Diferente
 *     dos outros tipos, nao da pra contar so com UNIQUE
 *     (tipo, usuario_id, janela_inicio_em) porque dois destinatarios podem
 *     compartilhar usuario_id+timestamp do mesmo evento.
 *
 * Defensivo: nunca lanca; falha = log + segue.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 30 * 60 * 1000; // 30min
const PRIMEIRO_DISPARO_MS = 5 * 60 * 1000; // 5min apos boot
const ADVISORY_LOCK_ID = 30303036;

const FALHAS_CONSECUTIVAS_MIN = (() => {
  const v = Number(process.env["AVISO_DESTINATARIO_QUEBRADO_MIN"] ?? 3);
  return Number.isFinite(v) && v >= 2 ? Math.floor(v) : 3;
})();

const JANELA_DIAS = (() => {
  const v = Number(process.env["AVISO_DESTINATARIO_QUEBRADO_JANELA_DIAS"] ?? 30);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 30;
})();

let executandoAgora = false;
let workerStarted = false;

interface DetalheEmail {
  destinatario?: string;
  sucesso?: boolean;
  erro?: string | null;
}
interface DetalheWhatsapp {
  destinatario?: string;
  sucesso?: boolean;
  erro?: string | null;
}
interface AvisoRegistro {
  canal?: "EMAIL" | "WHATSAPP";
  em?: string;
  detalhes_email?: DetalheEmail[];
  detalhes_whatsapp?: DetalheWhatsapp[];
}
interface EventoKillSwitch {
  id: number;
  unidade_id: number;
  acao: string;
  executado_por_usuario_id: number;
  metadata: { avisos?: AvisoRegistro[] } | null;
  unidade_nome: string | null;
}

export interface DestinatarioQuebrado {
  eventoId: number;
  unidadeId: number;
  unidadeNome: string;
  acao: string;
  executadoPorUsuarioId: number;
  canal: "EMAIL" | "WHATSAPP";
  destinatario: string;
  falhasConsecutivas: number;
  ultimaFalhaEm: string;
}

/**
 * Funcao pura: dado UM evento kill-switch, devolve a lista de
 * destinatarios cujo streak de falhas consecutivas atinge o minimo.
 *
 * Exposta pra teste — sem dependencia de DB.
 */
export function detectarDestinatariosQuebrados(
  evento: EventoKillSwitch,
  minimoFalhas = FALHAS_CONSECUTIVAS_MIN,
): DestinatarioQuebrado[] {
  const avisos = evento.metadata?.avisos;
  if (!Array.isArray(avisos) || avisos.length === 0) return [];

  // Streak por (canal, destinatario). Guarda streak atual + timestamp da
  // ultima falha pra usar como fingerprint do alerta.
  type Estado = { streak: number; ultimaFalhaEm: string };
  const streaks = new Map<string, Estado>();
  const disparados = new Map<string, DestinatarioQuebrado>();

  for (const aviso of avisos) {
    const em = typeof aviso.em === "string" ? aviso.em : null;
    if (!em) continue;

    // Determina canal e detalhes a inspecionar. Por compat com registros
    // antigos (Task #148/#176) que so trazem agregados sem detalhes_*[],
    // pulamos avisos sem detalhes — nao da pra atribuir falha individual
    // quando o helper original nao registrou por destinatario.
    const detalhesEmail = Array.isArray(aviso.detalhes_email)
      ? aviso.detalhes_email
      : [];
    const detalhesWpp = Array.isArray(aviso.detalhes_whatsapp)
      ? aviso.detalhes_whatsapp
      : [];

    const processarLista = (
      lista: Array<DetalheEmail | DetalheWhatsapp>,
      canal: "EMAIL" | "WHATSAPP",
    ): void => {
      for (const d of lista) {
        const destBruto =
          typeof d.destinatario === "string" ? d.destinatario.trim() : "";
        if (!destBruto) continue;
        // Normaliza pra dedup: email lowercase, telefone so digitos.
        const destinatario =
          canal === "EMAIL"
            ? destBruto.toLowerCase()
            : destBruto.replace(/\D/g, "");
        if (!destinatario) continue;
        const chave = `${canal}::${destinatario}`;
        const sucesso = d.sucesso === true;
        if (sucesso) {
          // Sucesso reseta o streak — destinatario voltou a funcionar.
          streaks.delete(chave);
          continue;
        }
        const prev = streaks.get(chave);
        const streak = (prev?.streak ?? 0) + 1;
        streaks.set(chave, { streak, ultimaFalhaEm: em });
        if (streak >= minimoFalhas) {
          // Sobrescreve com o estado mais recente (streak crescente).
          // Garante uma unica entrada por (canal, destinatario) com a
          // contagem maxima atingida no evento.
          disparados.set(chave, {
            eventoId: evento.id,
            unidadeId: evento.unidade_id,
            unidadeNome: evento.unidade_nome ?? `unidade ${evento.unidade_id}`,
            acao: evento.acao,
            executadoPorUsuarioId: evento.executado_por_usuario_id,
            canal,
            destinatario,
            falhasConsecutivas: streak,
            ultimaFalhaEm: em,
          });
        }
      }
    };

    processarLista(detalhesEmail, "EMAIL");
    processarLista(detalhesWpp, "WHATSAPP");
  }

  return Array.from(disparados.values());
}

/**
 * Hash determinista FNV-1a 32-bit. Usado pra deslocar o
 * `janela_inicio_em` em microssegundos por (canal, destinatario) e evitar
 * colisao com a UNIQUE legada da migration 046
 * (tipo, usuario_id, janela_inicio_em) — dois destinatarios distintos
 * podem ter o MESMO `ultimaFalhaEm` no mesmo evento.
 *
 * O offset (0..999_999 microssegundos = ate ~1s) e indistinguivel na UI
 * mas garante linha unica por destinatario na fila. O indice parcial
 * UNIQUE (evento_id, canal, destinatario) da migration 067 e o garantidor
 * "real" de idempotencia; o offset apenas previne o falso positivo de
 * conflito na UNIQUE antiga.
 */
export function offsetMicrossegundosFingerprint(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1_000_000;
}

/**
 * Insere o alerta na fila. Retorna true se a linha foi efetivamente
 * inserida (RETURNING id devolveu linha), false se ja existia (qualquer
 * UNIQUE — partial fingerprint da migration 067 OU UNIQUE legada da 046
 * apos o offset deterministico, defesa em profundidade).
 *
 * Defensivo: nunca lanca; falha = log no caller + segue.
 */
async function inserirAlertaSeNovo(d: DestinatarioQuebrado): Promise<boolean> {
  const payload = {
    unidade_id: d.unidadeId,
    unidade_nome: d.unidadeNome,
    acao: d.acao,
    canal: d.canal,
    destinatario: d.destinatario,
    falhas_consecutivas: d.falhasConsecutivas,
    evento_id: d.eventoId,
    ultima_falha_em: d.ultimaFalhaEm,
  };
  const contexto = `${d.canal}:${d.acao}:unidade=${d.unidadeId}`;
  const offsetMicros = offsetMicrossegundosFingerprint(
    `${d.canal}:${d.destinatario}`,
  );

  // ON CONFLICT DO NOTHING SEM target captura QUALQUER unique violation
  // (a partial UNIQUE nova da migration 067 + a UNIQUE legada da 046).
  // RETURNING id distingue "inseriu" de "no-op", evitando metricas falsas.
  const res = await db.execute<{ id: number }>(sql`
    INSERT INTO alertas_ceo_seguranca
      (tipo, usuario_id, janela_inicio_em, contexto, payload)
    VALUES (
      'DESTINATARIO_AVISO_QUEBRADO',
      ${d.executadoPorUsuarioId},
      (${d.ultimaFalhaEm}::timestamptz + (${offsetMicros}::bigint || ' microseconds')::interval),
      ${contexto},
      ${JSON.stringify(payload)}::jsonb
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  return (res.rows ?? []).length > 0;
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  try {
    const lockRes = await db.execute<{ ok: boolean }>(sql`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS ok
    `);
    const ok = (lockRes.rows ?? [])[0]?.ok === true;
    if (!ok) return;
    try {
      const eventos = await db.execute<EventoKillSwitch & Record<string, unknown>>(sql`
        SELECT a.id, a.unidade_id, a.acao, a.executado_por_usuario_id,
               a.metadata, u.nome AS unidade_nome
          FROM auditoria_kill_switch a
          LEFT JOIN unidades u ON u.id = a.unidade_id
         WHERE a.criado_em >= now() - (${JANELA_DIAS}::int * INTERVAL '1 day')
           AND a.metadata ? 'avisos'
           AND jsonb_array_length(COALESCE(a.metadata->'avisos', '[]'::jsonb)) > 0
         ORDER BY a.criado_em DESC
      `);
      let inseridos = 0;
      let detectados = 0;
      for (const ev of eventos.rows ?? []) {
        const lista = detectarDestinatariosQuebrados(ev);
        detectados += lista.length;
        for (const d of lista) {
          try {
            const novo = await inserirAlertaSeNovo(d);
            if (novo) inseridos++;
          } catch (err) {
            logger.warn(
              { err, eventoId: d.eventoId, canal: d.canal },
              "[avisoDestinatarioQuebrado] falha ao inserir alerta (silenciada)",
            );
          }
        }
      }
      if (detectados > 0 || inseridos > 0) {
        logger.info(
          { eventos: eventos.rows?.length ?? 0, detectados, inseridos },
          "[avisoDestinatarioQuebrado] tick concluido",
        );
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
    }
  } catch (err) {
    logger.warn({ err }, "[avisoDestinatarioQuebrado] tick falhou (silenciada)");
  } finally {
    executandoAgora = false;
  }
}

export function iniciarWorkerAvisoDestinatarioQuebrado(): void {
  if (workerStarted) return;
  workerStarted = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), TICK_MS);
  }, PRIMEIRO_DISPARO_MS);
  logger.info(
    {
      tickMs: TICK_MS,
      janelaDias: JANELA_DIAS,
      minimoFalhas: FALHAS_CONSECUTIVAS_MIN,
    },
    "[avisoDestinatarioQuebrado] worker iniciado",
  );
}

export const _internoParaTestes = {
  tick,
  inserirAlertaSeNovo,
  ADVISORY_LOCK_ID,
  FALHAS_CONSECUTIVAS_MIN,
  JANELA_DIAS,
};
