import { db, type Unidade } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { enviarComTemplateHsm } from "../../services/whatsappService";
import { logger } from "../logger";

const FROM_LABEL = "PAWARDS - Plataforma";
const FROM_ADDR =
  process.env.PAWARDS_EMAIL_FROM || "clinica.padua.agenda@gmail.com";

const CONTATO_RECURSO_PADRAO =
  process.env.PAWARDS_CONTATO_RECURSO ||
  "o CEO da PAWARDS (Dr. Caio) pelo canal oficial da consultoria";

// Janela default: avisa pacientes com consulta nos proximos 14 dias.
// Override via env (PAWARDS_AVISO_PACIENTES_DIAS). Pacientes com consulta
// alem desse horizonte vao saber pelo proprio portal (Task #132 ja cobre)
// — aqui o foco e o paciente que esperaria a consulta sem entender o
// silencio da clinica.
export const JANELA_DIAS_DEFAULT = Number(process.env.PAWARDS_AVISO_PACIENTES_DIAS || "14");
// Limites pra override manual da janela (Task #182). Acima de 90 dias o
// custo de WhatsApp/email explode sem ganho clinico real (paciente com
// consulta a 3 meses ja recebe aviso pelo portal — Task #132).
export const JANELA_DIAS_MIN = 1;
export const JANELA_DIAS_MAX = 90;

export function normalizarJanelaDias(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return JANELA_DIAS_DEFAULT;
  const inteiro = Math.floor(n);
  if (inteiro < JANELA_DIAS_MIN) return JANELA_DIAS_MIN;
  if (inteiro > JANELA_DIAS_MAX) return JANELA_DIAS_MAX;
  return inteiro;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataPtBr(d: Date | null | undefined): string {
  if (!d) return "data nao registrada";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function dataConsultaPtBr(dataIso: string, horaInicio: string): string {
  // appointmentsTable.data e text "YYYY-MM-DD"; horaInicio e "HH:MM".
  // Formata pra "DD/MM/YYYY as HH:MM" sem montar Date (evita TZ shift).
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return `${dataIso} as ${horaInicio}`;
  return `${m[3]}/${m[2]}/${m[1]} as ${horaInicio}`;
}

function telefoneValido(t: string | null | undefined): t is string {
  if (!t) return false;
  return t.replace(/\D/g, "").length >= 10;
}

function buildRaw(to: string, subject: string, html: string): string {
  const messageParts = [
    `From: ${FROM_LABEL} <${sanitizeHeader(FROM_ADDR)}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ];
  return Buffer.from(messageParts.join("\r\n")).toString("base64url");
}

function htmlPacienteReativacao(opts: {
  pacienteNome: string;
  unidadeNome: string;
  consultaQuando: string;
  reativadoEm: Date;
  contatoRecurso: string;
}): string {
  const { pacienteNome, unidadeNome, consultaQuando, reativadoEm, contatoRecurso } = opts;
  return `
<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#3a7d44; border-bottom: 2px solid #3a7d44; padding-bottom:8px;">A clinica voltou a operar</h2>
  <p>Ola, ${escapeHtml(pacienteNome)}.</p>
  <p>Boas noticias: a clinica <strong>${escapeHtml(unidadeNome)}</strong> voltou a operar na plataforma PAWARDS em <strong>${escapeHtml(dataPtBr(reativadoEm))}</strong>.</p>
  <p style="background:#eef5ee; padding:12px; border-left:4px solid #3a7d44;">Sua consulta que estava marcada para <strong>${escapeHtml(consultaQuando)}</strong> precisa ser remarcada. A equipe da clinica vai entrar em contato pra acertar uma nova data o quanto antes.</p>
  <p>Se preferir, voce tambem pode <strong>ligar pra clinica</strong> e adiantar a remarcacao.</p>
  <p><strong>Duvidas ou urgencia clinica?</strong> Fale com ${escapeHtml(contatoRecurso)}.</p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Mensagem automatica do motor de governanca PAWARDS. Obrigado pela paciencia.</p>
</body></html>`;
}

function mensagemWhatsappPacienteReativacao(opts: {
  pacienteNome: string;
  unidadeNome: string;
  consultaQuando: string;
  contatoRecurso: string;
}): string {
  return [
    `Ola, ${opts.pacienteNome}.`,
    "",
    `Boas noticias: a clinica *${opts.unidadeNome}* voltou a operar na plataforma PAWARDS.`,
    "",
    `Sua consulta que estava marcada para *${opts.consultaQuando}* precisa ser remarcada — a equipe vai entrar em contato pra acertar uma nova data.`,
    "",
    "Se preferir, voce tambem pode ligar pra clinica e adiantar a remarcacao.",
    "",
    `Duvidas ou urgencia clinica: ${opts.contatoRecurso}.`,
    "",
    "Mensagem automatica PAWARDS.",
  ].join("\n");
}

function htmlPaciente(opts: {
  pacienteNome: string;
  unidadeNome: string;
  consultaQuando: string;
  suspensoEm: Date;
  contatoRecurso: string;
}): string {
  const { pacienteNome, unidadeNome, consultaQuando, suspensoEm, contatoRecurso } = opts;
  return `
<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#7d1d2e; border-bottom: 2px solid #7d1d2e; padding-bottom:8px;">Sua consulta precisara ser remarcada</h2>
  <p>Ola, ${escapeHtml(pacienteNome)}.</p>
  <p>A clinica <strong>${escapeHtml(unidadeNome)}</strong> esta temporariamente <strong>suspensa</strong> na plataforma PAWARDS desde <strong>${escapeHtml(dataPtBr(suspensoEm))}</strong>.</p>
  <p style="background:#f5f1e8; padding:12px; border-left:4px solid #7d1d2e;"><strong>Sua consulta marcada para ${escapeHtml(consultaQuando)} nao podera acontecer</strong> enquanto a clinica estiver suspensa.</p>
  <p>Assim que a clinica voltar a operar, a equipe entrara em contato pra remarcar seu atendimento na primeira data disponivel.</p>
  <p><strong>Duvidas ou urgencia clinica?</strong> Fale com ${escapeHtml(contatoRecurso)}.</p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Mensagem automatica do motor de governanca PAWARDS. Pedimos desculpas pelo transtorno.</p>
</body></html>`;
}

function mensagemWhatsappPaciente(opts: {
  pacienteNome: string;
  unidadeNome: string;
  consultaQuando: string;
  contatoRecurso: string;
}): string {
  return [
    `Ola, ${opts.pacienteNome}.`,
    "",
    `A clinica *${opts.unidadeNome}* esta temporariamente suspensa na plataforma PAWARDS.`,
    "",
    `Sua consulta marcada para *${opts.consultaQuando}* nao podera acontecer enquanto a clinica estiver suspensa.`,
    "",
    "Assim que a clinica voltar a operar, a equipe vai entrar em contato pra remarcar.",
    "",
    `Duvidas ou urgencia clinica: ${opts.contatoRecurso}.`,
    "",
    "Mensagem automatica PAWARDS.",
  ].join("\n");
}

type ConsultaProxima = {
  pacienteId: number;
  pacienteNome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  data: string;
  horaInicio: string;
};

/**
 * Busca pacientes com consulta agendada/confirmada nos proximos `dias`
 * para a unidade. Considera apenas o PROXIMO atendimento de cada paciente
 * (DISTINCT ON paciente_id) — se o paciente tem 3 consultas marcadas
 * durante a janela, ele recebe UM aviso, citando a primeira.
 */
export async function buscarPacientesComConsultaProxima(
  unidadeId: number,
  dias: number,
): Promise<ConsultaProxima[]> {
  const hojeMs = Date.now();
  const hoje = new Date(hojeMs);
  const ate = new Date(hojeMs + dias * 24 * 60 * 60 * 1000);
  const isoHoje = hoje.toISOString().slice(0, 10);
  const isoAte = ate.toISOString().slice(0, 10);

  // Lemos via SQL bruto pra usar DISTINCT ON (proximo agendamento por
  // paciente). Drizzle nao expressa DISTINCT ON nativamente.
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (a.paciente_id)
      a.paciente_id,
      p.nome   AS paciente_nome,
      p.email  AS email,
      p.telefone AS telefone,
      p.whatsapp AS whatsapp,
      a.data,
      a.hora_inicio
    FROM appointments a
    INNER JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.unidade_id = ${unidadeId}
      AND a.status IN ('agendado', 'confirmado')
      AND a.data >= ${isoHoje}
      AND a.data <= ${isoAte}
    ORDER BY a.paciente_id, a.data ASC, a.hora_inicio ASC
  `);

  return rows.rows.map((r: Record<string, unknown>) => ({
    pacienteId: Number(r.paciente_id),
    pacienteNome: String(r.paciente_nome ?? ""),
    email: r.email ? String(r.email) : null,
    telefone: r.telefone ? String(r.telefone) : null,
    whatsapp: r.whatsapp ? String(r.whatsapp) : null,
    data: String(r.data),
    horaInicio: String(r.hora_inicio),
  }));
}

// Detalhe por paciente — gravado em metadata.avisos[].detalhes_pacientes
// pra que o reenvio (Task #183) possa pular quem ja recebeu com sucesso
// em alguma tentativa anterior. "Sucesso" = email OU whatsapp entregue
// (qualquer canal serve pra avisar o paciente).
export type DetalhePacienteAviso = {
  pacienteId: number;
  pacienteNome: string;
  emailTentado: boolean;
  emailSucesso: boolean;
  whatsappTentado: boolean;
  whatsappSucesso: boolean;
  semContato: boolean;
};

export type ResultadoAvisoPacientes = {
  pacientesAvisados: number;
  emailEnviados: number;
  emailFalhas: number;
  whatsappEnviados: number;
  whatsappFalhas: number;
  whatsappViaHsm: number;
  whatsappViaTextoLivre: number;
  pacientesSemContato: number;
  pacientesPulados: number;
  janelaDias: number;
  detalhesPacientes: DetalhePacienteAviso[];
};

/**
 * Task #139 — Quando uma unidade entra em SUSPENSO, dispara aviso pra
 * pacientes com consulta nos proximos N dias. Roda fora da transacao de
 * suspensao (best-effort), igual ao aviso pra responsaveis.
 *
 * Nao re-aciona se a clinica ja estava SUSPENSA — isso e responsabilidade
 * do caller (a rota so chama quando a transicao acontece).
 */
export async function avisarPacientesSuspensao(opts: {
  unidadeId: number;
  unidade: Unidade;
  suspensoEm: Date;
  janelaDias?: number;
  /**
   * Task #183 — IDs de pacientes pra PULAR (idempotencia do reenvio).
   * Quando o caller ja sabe que esses pacientes receberam o aviso com
   * sucesso em uma tentativa anterior, passa o set pra evitar spam.
   */
  pularPacienteIds?: ReadonlySet<number>;
}): Promise<ResultadoAvisoPacientes> {
  const dias = normalizarJanelaDias(opts.janelaDias ?? JANELA_DIAS_DEFAULT);
  const consultas = await buscarPacientesComConsultaProxima(opts.unidadeId, dias);
  const subject = `[PAWARDS] Sua consulta na ${opts.unidade.nome} precisara ser remarcada`;
  const pular = opts.pularPacienteIds ?? new Set<number>();

  const resultado: ResultadoAvisoPacientes = {
    pacientesAvisados: 0,
    emailEnviados: 0,
    emailFalhas: 0,
    whatsappEnviados: 0,
    whatsappFalhas: 0,
    whatsappViaHsm: 0,
    whatsappViaTextoLivre: 0,
    pacientesSemContato: 0,
    pacientesPulados: 0,
    janelaDias: dias,
    detalhesPacientes: [],
  };

  if (consultas.length === 0) return resultado;

  let gmail: Awaited<ReturnType<typeof getGmailClient>> | null = null;
  try {
    gmail = await getGmailClient();
  } catch (err) {
    logger.warn(
      { err, unidadeId: opts.unidadeId },
      "[avisarPacientesSuspensao] gmail client indisponivel — segue so com whatsapp",
    );
  }

  for (const c of consultas) {
    const consultaQuando = dataConsultaPtBr(c.data, c.horaInicio);
    const tem_email = !!(c.email && c.email.includes("@"));
    const telCanal = c.whatsapp || c.telefone;
    const tem_whatsapp = telefoneValido(telCanal);

    if (pular.has(c.pacienteId)) {
      resultado.pacientesPulados++;
      continue;
    }

    const detalhe: DetalhePacienteAviso = {
      pacienteId: c.pacienteId,
      pacienteNome: c.pacienteNome,
      emailTentado: false,
      emailSucesso: false,
      whatsappTentado: false,
      whatsappSucesso: false,
      semContato: false,
    };

    if (!tem_email && !tem_whatsapp) {
      resultado.pacientesSemContato++;
      detalhe.semContato = true;
      resultado.detalhesPacientes.push(detalhe);
      continue;
    }
    resultado.pacientesAvisados++;

    if (tem_email && gmail) {
      detalhe.emailTentado = true;
      try {
        const html = htmlPaciente({
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          suspensoEm: opts.suspensoEm,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        });
        const raw = buildRaw(c.email!, subject, html);
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        resultado.emailEnviados++;
        detalhe.emailSucesso = true;
      } catch (err) {
        resultado.emailFalhas++;
        logger.warn(
          { err, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
          "[avisarPacientesSuspensao] falha email",
        );
      }
    }

    if (tem_whatsapp) {
      detalhe.whatsappTentado = true;
      try {
        const mensagem = mensagemWhatsappPaciente({
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        });
        const variaveis: Record<string, string> = {
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        };
        const r = await enviarComTemplateHsm(
          telCanal!,
          "CLINICA_SUSPENSA_PACIENTE",
          variaveis,
          { unidadeId: opts.unidadeId, mensagemFallback: mensagem },
        );
        if (r.sucesso) {
          resultado.whatsappEnviados++;
          detalhe.whatsappSucesso = true;
          if (r.viaHsm) resultado.whatsappViaHsm++;
          if (r.usouFallback) resultado.whatsappViaTextoLivre++;
        } else {
          resultado.whatsappFalhas++;
          logger.warn(
            { erro: r.erro, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
            "[avisarPacientesSuspensao] whatsapp retornou falha",
          );
        }
      } catch (err) {
        resultado.whatsappFalhas++;
        logger.warn(
          { err, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
          "[avisarPacientesSuspensao] excecao whatsapp",
        );
      }
    }

    resultado.detalhesPacientes.push(detalhe);
  }

  return resultado;
}

/**
 * Busca pacientes que tinham consulta dentro da janela usada na suspensao,
 * incluindo datas que JA passaram (entre `suspensoEm` e hoje), pra atingir
 * o mesmo conjunto que recebeu o aviso de "consulta precisara ser
 * remarcada". DISTINCT ON garante UM aviso por paciente.
 */
async function buscarPacientesAvisadosNaSuspensao(
  unidadeId: number,
  suspensoEm: Date,
  janelaDias: number,
): Promise<ConsultaProxima[]> {
  const isoDe = suspensoEm.toISOString().slice(0, 10);
  const ate = new Date(suspensoEm.getTime() + janelaDias * 24 * 60 * 60 * 1000);
  const isoAte = ate.toISOString().slice(0, 10);

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (a.paciente_id)
      a.paciente_id,
      p.nome   AS paciente_nome,
      p.email  AS email,
      p.telefone AS telefone,
      p.whatsapp AS whatsapp,
      a.data,
      a.hora_inicio
    FROM appointments a
    INNER JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.unidade_id = ${unidadeId}
      AND a.status IN ('agendado', 'confirmado')
      AND a.data >= ${isoDe}
      AND a.data <= ${isoAte}
    ORDER BY a.paciente_id, a.data ASC, a.hora_inicio ASC
  `);

  return rows.rows.map((r: Record<string, unknown>) => ({
    pacienteId: Number(r.paciente_id),
    pacienteNome: String(r.paciente_nome ?? ""),
    email: r.email ? String(r.email) : null,
    telefone: r.telefone ? String(r.telefone) : null,
    whatsapp: r.whatsapp ? String(r.whatsapp) : null,
    data: String(r.data),
    horaInicio: String(r.hora_inicio),
  }));
}

/**
 * Task #184 — Quando uma unidade volta de SUSPENSO pra ATIVO via
 * `/reativar`, dispara aviso pros mesmos pacientes que receberam o aviso
 * de suspensao (Task #139): aqueles com consulta marcada na janela
 * iniciada em `suspensoEm`. Mensagem amigavel dizendo que a clinica
 * voltou e que a equipe vai remarcar (ou que o paciente pode ligar).
 *
 * Best-effort, igual aos demais avisos de reativacao. Caller decide se
 * dispara (deve ser so quando ha transicao SUSPENSO -> ATIVO real).
 *
 * `janelaDias` deve ser a mesma usada na suspensao original — caller
 * resolve lendo de `auditoria_kill_switch.metadata.avisos[].detalhes.janelaDias`.
 * Se nao houver registro, cai no default (`PAWARDS_AVISO_PACIENTES_DIAS`).
 */
export async function avisarPacientesReativacao(opts: {
  unidadeId: number;
  unidade: Unidade;
  reativadoEm: Date;
  suspensoEm: Date;
  janelaDias?: number;
}): Promise<ResultadoAvisoPacientes> {
  const dias = Math.max(1, Math.floor(opts.janelaDias ?? JANELA_DIAS_DEFAULT));
  const consultas = await buscarPacientesAvisadosNaSuspensao(
    opts.unidadeId,
    opts.suspensoEm,
    dias,
  );
  const subject = `[PAWARDS] A clinica ${opts.unidade.nome} voltou a operar`;

  const resultado: ResultadoAvisoPacientes = {
    pacientesAvisados: 0,
    emailEnviados: 0,
    emailFalhas: 0,
    whatsappEnviados: 0,
    whatsappFalhas: 0,
    whatsappViaHsm: 0,
    whatsappViaTextoLivre: 0,
    pacientesSemContato: 0,
    janelaDias: dias,
  };

  if (consultas.length === 0) return resultado;

  let gmail: Awaited<ReturnType<typeof getGmailClient>> | null = null;
  try {
    gmail = await getGmailClient();
  } catch (err) {
    logger.warn(
      { err, unidadeId: opts.unidadeId },
      "[avisarPacientesReativacao] gmail client indisponivel — segue so com whatsapp",
    );
  }

  for (const c of consultas) {
    const consultaQuando = dataConsultaPtBr(c.data, c.horaInicio);
    const tem_email = !!(c.email && c.email.includes("@"));
    const telCanal = c.whatsapp || c.telefone;
    const tem_whatsapp = telefoneValido(telCanal);

    if (!tem_email && !tem_whatsapp) {
      resultado.pacientesSemContato++;
      continue;
    }
    resultado.pacientesAvisados++;

    if (tem_email && gmail) {
      try {
        const html = htmlPacienteReativacao({
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          reativadoEm: opts.reativadoEm,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        });
        const raw = buildRaw(c.email!, subject, html);
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        resultado.emailEnviados++;
      } catch (err) {
        resultado.emailFalhas++;
        logger.warn(
          { err, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
          "[avisarPacientesReativacao] falha email",
        );
      }
    }

    if (tem_whatsapp) {
      try {
        const mensagem = mensagemWhatsappPacienteReativacao({
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        });
        const variaveis: Record<string, string> = {
          pacienteNome: c.pacienteNome,
          unidadeNome: opts.unidade.nome,
          consultaQuando,
          contatoRecurso: CONTATO_RECURSO_PADRAO,
        };
        const r = await enviarComTemplateHsm(
          telCanal!,
          "CLINICA_REATIVADA_PACIENTE",
          variaveis,
          { unidadeId: opts.unidadeId, mensagemFallback: mensagem },
        );
        if (r.sucesso) {
          resultado.whatsappEnviados++;
          if (r.viaHsm) resultado.whatsappViaHsm++;
          if (r.usouFallback) resultado.whatsappViaTextoLivre++;
        } else {
          resultado.whatsappFalhas++;
          logger.warn(
            { erro: r.erro, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
            "[avisarPacientesReativacao] whatsapp retornou falha",
          );
        }
      } catch (err) {
        resultado.whatsappFalhas++;
        logger.warn(
          { err, pacienteId: c.pacienteId, unidadeId: opts.unidadeId },
          "[avisarPacientesReativacao] excecao whatsapp",
        );
      }
    }
  }

  return resultado;
}
