import {
  db,
  prescricoesLembreteTable,
  prescricaoLembreteEnviosTable,
  pacientesTable,
  unidadesTable,
  usuariosTable,
  alertasNotificacaoTable,
  criarAlerta,
  type PrescricaoLembrete,
  type PrescricaoPeriodoJson,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { enviarComTemplate } from "./whatsappService";
import {
  cumprimentoPorHora,
  tratamentoPorGenero,
  type Genero,
  type LembretePrescricaoDados,
} from "./whatsappTemplates";

export interface ExecutarLembretesOptions {
  now?: Date;
  toleranciaMinutos?: number;
}

export interface LembreteEnvioResult {
  prescricaoId: number;
  pacienteId: number;
  unidadeId: number | null;
  janela: string;
  sucesso: boolean;
  jaEnviado?: boolean;
  erro?: string;
  whatsappLogId?: number;
}

export interface ExecutarLembretesResult {
  examinados: number;
  enviados: number;
  falhas: number;
  pulados: number;
  detalhes: LembreteEnvioResult[];
}

interface LocalParts {
  data: string;
  horaMin: number;
}

/**
 * Calcula HH:MM (em minutos) e a data YYYY-MM-DD em uma timezone arbitraria.
 */
export function partsParaTimezone(now: Date, timezone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const data = `${get("year")}-${get("month")}-${get("day")}`;
  const hh = parseInt(get("hour"), 10);
  const mm = parseInt(get("minute"), 10);
  // Intl pode retornar "24" para meia-noite em alguns locales
  const horaMin = (hh % 24) * 60 + mm;
  return { data, horaMin };
}

function parseHorario(horario: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return h * 60 + mn;
}

function janelaKey(data: string, horario: string): string {
  return `${data} ${horario.trim()}`;
}

/**
 * Identifica qual horario configurado esta dentro da janela de envio.
 *
 * Regra: dispara apenas SE `horaMinAgora >= alvo` e `horaMinAgora - alvo <= tolerancia`.
 * Ou seja, o lembrete sai no horario marcado ou ate `tolerancia` minutos depois,
 * nunca antes. Isso garante que o paciente nunca receba o lembrete adiantado
 * e que, se o worker perder um tick, ainda recupere dentro da tolerancia.
 */
export function horarioDentroDaJanela(
  horarios: string[],
  horaMinAgora: number,
  toleranciaMinutos: number,
): string | null {
  for (const horario of horarios) {
    const alvo = parseHorario(horario);
    if (alvo == null) continue;
    const delta = horaMinAgora - alvo;
    if (delta >= 0 && delta <= toleranciaMinutos) {
      return horario.trim();
    }
  }
  return null;
}

function tentarPartsParaTimezone(now: Date, timezone: string): LocalParts | null {
  try {
    return partsParaTimezone(now, timezone);
  } catch {
    return null;
  }
}

interface PrescricaoComContexto {
  prescricao: PrescricaoLembrete;
  pacienteNome: string;
  pacienteTelefone: string;
  pacienteGenero: Genero;
  unidadeId: number | null;
  unidadeTimezone: string;
}

async function carregarPrescricoesAtivas(): Promise<PrescricaoComContexto[]> {
  const rows = await db
    .select({
      prescricao: prescricoesLembreteTable,
      pacienteNome: pacientesTable.nome,
      pacienteTelefone: pacientesTable.telefone,
      pacienteGenero: pacientesTable.genero,
      pacienteUnidadeId: pacientesTable.unidadeId,
      unidadeTimezone: unidadesTable.timezone,
      unidadeIdResolvida: unidadesTable.id,
    })
    .from(prescricoesLembreteTable)
    .innerJoin(pacientesTable, eq(pacientesTable.id, prescricoesLembreteTable.pacienteId))
    .innerJoin(
      unidadesTable,
      sql`${unidadesTable.id} = COALESCE(${prescricoesLembreteTable.unidadeId}, ${pacientesTable.unidadeId})`,
    )
    .where(
      and(
        eq(prescricoesLembreteTable.ativo, true),
        eq(pacientesTable.statusAtivo, true),
      ),
    );

  return rows.map((r) => ({
    prescricao: r.prescricao,
    pacienteNome: r.pacienteNome,
    pacienteTelefone: r.pacienteTelefone,
    pacienteGenero: (r.pacienteGenero ?? "nao_informado") as Genero,
    unidadeId: r.unidadeIdResolvida,
    unidadeTimezone: r.unidadeTimezone || "America/Sao_Paulo",
  }));
}

function montarSaudacaoLocal(ctx: PrescricaoComContexto, horaLocalMin: number): string {
  const cumprimento = cumprimentoPorHora(Math.floor(horaLocalMin / 60));
  const tratamento = tratamentoPorGenero(ctx.pacienteGenero, ctx.pacienteNome);
  return `${cumprimento}\n\n${tratamento}, tudo bem?`;
}

function montarDadosTemplate(
  ctx: PrescricaoComContexto,
  agora: Date,
  horaLocalMin: number,
): LembretePrescricaoDados {
  return {
    pacienteNome: ctx.pacienteNome,
    pacienteGenero: ctx.pacienteGenero,
    agora,
    saudacao: montarSaudacaoLocal(ctx, horaLocalMin),
    periodos: (ctx.prescricao.periodos ?? []) as PrescricaoPeriodoJson[],
  };
}

export async function executarLembretesPrescricao(
  options: ExecutarLembretesOptions = {},
): Promise<ExecutarLembretesResult> {
  const now = options.now ?? new Date();
  const tolerancia = options.toleranciaMinutos ?? 5;

  const prescricoes = await carregarPrescricoesAtivas();
  const detalhes: LembreteEnvioResult[] = [];
  let enviados = 0;
  let falhas = 0;
  let pulados = 0;

  for (const ctx of prescricoes) {
    const horarios = Array.isArray(ctx.prescricao.horariosEnvio)
      ? ctx.prescricao.horariosEnvio
      : [];
    if (horarios.length === 0) {
      pulados += 1;
      continue;
    }

    const local = tentarPartsParaTimezone(now, ctx.unidadeTimezone);
    if (!local) {
      console.error(
        `[lembretePrescricao] timezone invalida na unidade (prescricao=${ctx.prescricao.id}, tz=${ctx.unidadeTimezone}) — pulando`,
      );
      pulados += 1;
      continue;
    }
    const horarioMatch = horarioDentroDaJanela(horarios, local.horaMin, tolerancia);
    if (!horarioMatch) {
      pulados += 1;
      continue;
    }

    const janela = janelaKey(local.data, horarioMatch);

    // Idempotencia: tenta inserir um marcador PENDENTE antes de disparar.
    // Se a unique (prescricao_lembrete_id, janela) bater, pulamos.
    // Status final (ENVIADO ou FALHOU) so e gravado APOS a tentativa real.
    const claimRows = await db
      .insert(prescricaoLembreteEnviosTable)
      .values({
        prescricaoLembreteId: ctx.prescricao.id,
        pacienteId: ctx.prescricao.pacienteId,
        unidadeId: ctx.unidadeId ?? null,
        janela,
        status: "PENDENTE",
      })
      .onConflictDoNothing({
        target: [
          prescricaoLembreteEnviosTable.prescricaoLembreteId,
          prescricaoLembreteEnviosTable.janela,
        ],
      })
      .returning({ id: prescricaoLembreteEnviosTable.id });
    const claim = claimRows[0];
    if (!claim) {
      detalhes.push({
        prescricaoId: ctx.prescricao.id,
        pacienteId: ctx.prescricao.pacienteId,
        unidadeId: ctx.unidadeId,
        janela,
        sucesso: true,
        jaEnviado: true,
      });
      pulados += 1;
      continue;
    }

    const envioId = claim.id;

    // Envia (saudacao calculada com hora local da unidade)
    const dados = montarDadosTemplate(ctx, now, local.horaMin);
    let resultado: Awaited<ReturnType<typeof enviarComTemplate>>;
    try {
      resultado = await enviarComTemplate(
        ctx.pacienteTelefone,
        "LEMBRETE_PRESCRICAO_REVO",
        dados,
        { unidadeId: ctx.unidadeId ?? undefined },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado = { sucesso: false, erro: msg };
    }

    if (resultado.sucesso) {
      enviados += 1;
      await db
        .update(prescricaoLembreteEnviosTable)
        .set({ status: "ENVIADO", whatsappLogId: resultado.logId ?? null, erro: null })
        .where(eq(prescricaoLembreteEnviosTable.id, envioId));
      detalhes.push({
        prescricaoId: ctx.prescricao.id,
        pacienteId: ctx.prescricao.pacienteId,
        unidadeId: ctx.unidadeId,
        janela,
        sucesso: true,
        whatsappLogId: resultado.logId,
      });
    } else {
      falhas += 1;
      const erroMsg = resultado.erro ?? "erro desconhecido";
      await db
        .update(prescricaoLembreteEnviosTable)
        .set({ status: "FALHOU", whatsappLogId: resultado.logId ?? null, erro: erroMsg })
        .where(eq(prescricaoLembreteEnviosTable.id, envioId));
      console.error(
        `[lembretePrescricao] FALHA paciente=${ctx.prescricao.pacienteId} prescricao=${ctx.prescricao.id} janela=${janela}: ${erroMsg}`,
      );
      // Best-effort: alerta a equipe da unidade. Falha aqui nao deve quebrar o tick.
      try {
        await emitirAlertasFalha({
          unidadeId: ctx.unidadeId,
          pacienteId: ctx.prescricao.pacienteId,
          pacienteNome: ctx.pacienteNome,
          janela,
          erroMsg,
        });
      } catch (e) {
        console.error(
          `[lembretePrescricao] erro ao emitir alertas de falha:`,
          (e as Error).message,
        );
      }
      detalhes.push({
        prescricaoId: ctx.prescricao.id,
        pacienteId: ctx.prescricao.pacienteId,
        unidadeId: ctx.unidadeId,
        janela,
        sucesso: false,
        erro: erroMsg,
        whatsappLogId: resultado.logId,
      });
    }
  }

  return { examinados: prescricoes.length, enviados, falhas, pulados, detalhes };
}

interface EmitirAlertasFalhaArgs {
  unidadeId: number | null;
  pacienteId: number;
  pacienteNome: string;
  janela: string;
  erroMsg: string;
}

/**
 * Cria um alerta SISTEMA para cada usuario ativo da unidade do paciente,
 * notificando a equipe (recepcao/enfermagem/admin clinica) que o lembrete
 * de prescricao falhou ao ser enviado.
 *
 * Sem destinatario na unidade: nao gera alerta (apenas log no servidor).
 */
async function emitirAlertasFalha(args: EmitirAlertasFalhaArgs): Promise<void> {
  const { unidadeId, pacienteId, pacienteNome, janela, erroMsg } = args;
  if (!unidadeId) {
    console.warn(
      `[lembretePrescricao] paciente=${pacienteId} sem unidade resolvida — alerta nao emitido`,
    );
    return;
  }

  const destinatarios = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(
      and(
        eq(usuariosTable.unidadeId, unidadeId),
        eq(usuariosTable.ativo, true),
        inArray(usuariosTable.escopo, [
          "clinica_admin",
          "clinica_enfermeira",
          "clinica_medico",
        ]),
      ),
    );

  if (destinatarios.length === 0) {
    console.warn(
      `[lembretePrescricao] unidade=${unidadeId} sem usuarios elegiveis para receber alerta de falha`,
    );
    return;
  }

  const mensagem =
    `Falha ao enviar lembrete de prescricao para ${pacienteNome} ` +
    `(paciente #${pacienteId}, janela ${janela}). Motivo: ${erroMsg}`;
  const linkAcao = `/pacientes/${pacienteId}`;

  const valores = destinatarios.map((d) =>
    ({
      ...criarAlerta(
        "LEMBRETE_PRESCRICAO_FALHOU",
        d.id,
        mensagem,
        linkAcao,
        48,
        "SISTEMA",
      ),
    }),
  );

  await db.insert(alertasNotificacaoTable).values(valores);
}

let workerStarted = false;

export function iniciarWorkerLembretesPrescricao(intervalMs = 60 * 1000): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[lembretePrescricao] Worker iniciado (intervalo ${intervalMs / 1000}s, tolerancia 5 min)`,
  );
  setInterval(async () => {
    try {
      const r = await executarLembretesPrescricao();
      if (r.enviados > 0 || r.falhas > 0) {
        console.log(
          `[lembretePrescricao] tick - examinados=${r.examinados} enviados=${r.enviados} falhas=${r.falhas} pulados=${r.pulados}`,
        );
      }
    } catch (e) {
      console.error("[lembretePrescricao] erro no tick:", (e as Error).message);
    }
  }, intervalMs).unref();
}
