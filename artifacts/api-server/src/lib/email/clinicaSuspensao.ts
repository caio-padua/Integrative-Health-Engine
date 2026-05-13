import { db, usuariosTable, unidadesTable, type Unidade } from "@workspace/db";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";

const FROM_LABEL = "PAWARDS - Plataforma";
const FROM_ADDR =
  process.env.PAWARDS_EMAIL_FROM || "clinica.padua.agenda@gmail.com";

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function coletarDestinatarios(unidadeId: number, unidade: Unidade): Promise<string[]> {
  const set = new Set<string>();
  const camposUnidade: Array<string | null | undefined> = [
    unidade.emailGeral,
    unidade.emailFinanceiro01,
    unidade.emailOuvidoria01,
    unidade.emailSupervisor01,
    unidade.emailSupervisor02,
  ];
  for (const e of camposUnidade) {
    if (e && e.includes("@")) set.add(e.trim().toLowerCase());
  }
  // Responsaveis: usuarios ATIVOS da unidade que (a) sao tenant_admin/platform_owner
  // por perfil_plataforma OU (b) tem perfil administrativo legado
  // (validador_mestre / consultoria_master) — cobre as duas convencoes
  // que coexistem no projeto.
  const responsaveis = await db
    .select({ email: usuariosTable.email })
    .from(usuariosTable)
    .where(
      and(
        eq(usuariosTable.unidadeId, unidadeId),
        eq(usuariosTable.ativo, true),
        isNotNull(usuariosTable.email),
        or(
          inArray(usuariosTable.perfilPlataforma, ["tenant_admin", "platform_owner"]),
          eq(usuariosTable.perfil, "validador_mestre"),
          eq(usuariosTable.escopo, "consultoria_master"),
        ),
      ),
    );
  for (const r of responsaveis) {
    if (r.email && r.email.includes("@")) set.add(r.email.trim().toLowerCase());
  }
  return Array.from(set);
}

function htmlSuspensao(opts: {
  unidadeNome: string;
  motivo: string;
  suspensoEm: Date;
  contatoRecurso: string;
}): string {
  const { unidadeNome, motivo, suspensoEm, contatoRecurso } = opts;
  return `
<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#7d1d2e; border-bottom: 2px solid #7d1d2e; padding-bottom:8px;">Clinica suspensa na plataforma PAWARDS</h2>
  <p>Prezado(a) responsavel,</p>
  <p>A clinica <strong>${escapeHtml(unidadeNome)}</strong> foi <strong>suspensa</strong> na plataforma PAWARDS em <strong>${escapeHtml(dataPtBr(suspensoEm))}</strong>.</p>
  <p style="background:#f5f1e8; padding:12px; border-left:4px solid #7d1d2e;"><strong>Motivo registrado:</strong><br/>${escapeHtml(motivo)}</p>
  <p>Enquanto a suspensao estiver ativa, <strong>nenhum usuario da clinica conseguira fazer login</strong>. As rotinas operacionais (agenda, prescricoes, faturamento) ficam pausadas.</p>
  <p><strong>Para recurso ou esclarecimentos:</strong> entre em contato com ${escapeHtml(contatoRecurso)}.</p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Esta mensagem foi enviada automaticamente pelo motor de governanca PAWARDS. Os detalhes da acao foram registrados na auditoria_kill_switch para fins juridicos.</p>
</body></html>`;
}

function htmlReativacao(opts: {
  unidadeNome: string;
  motivo: string;
  reativadoEm: Date;
}): string {
  const { unidadeNome, motivo, reativadoEm } = opts;
  return `
<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#3a7d44; border-bottom: 2px solid #3a7d44; padding-bottom:8px;">Clinica reativada na plataforma PAWARDS</h2>
  <p>Prezado(a) responsavel,</p>
  <p>A clinica <strong>${escapeHtml(unidadeNome)}</strong> foi <strong>reativada</strong> na plataforma PAWARDS em <strong>${escapeHtml(dataPtBr(reativadoEm))}</strong>.</p>
  <p style="background:#eef7ef; padding:12px; border-left:4px solid #3a7d44;"><strong>Justificativa registrada:</strong><br/>${escapeHtml(motivo)}</p>
  <p>Os logins voltaram a funcionar normalmente. As rotinas operacionais ja podem ser retomadas.</p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Esta mensagem foi enviada automaticamente pelo motor de governanca PAWARDS. A reativacao foi registrada na auditoria_kill_switch.</p>
</body></html>`;
}

async function enviarParaTodos(
  destinatarios: string[],
  subject: string,
  html: string,
): Promise<{ enviados: number; falhas: number }> {
  if (destinatarios.length === 0) return { enviados: 0, falhas: 0 };
  let enviados = 0;
  let falhas = 0;
  let gmail;
  try {
    gmail = await getGmailClient();
  } catch (err) {
    logger.error({ err }, "[clinicaSuspensao] gmail client indisponivel");
    return { enviados: 0, falhas: destinatarios.length };
  }
  for (const to of destinatarios) {
    try {
      const raw = buildRaw(to, subject, html);
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      enviados++;
    } catch (err) {
      falhas++;
      logger.warn({ err, to }, "[clinicaSuspensao] falha ao enviar email");
    }
  }
  return { enviados, falhas };
}

const CONTATO_RECURSO_PADRAO =
  process.env.PAWARDS_CONTATO_RECURSO ||
  "o CEO da PAWARDS (Dr. Caio) pelo canal oficial da consultoria";

export async function enviarEmailSuspensao(opts: {
  unidadeId: number;
  unidade: Unidade;
  motivo: string;
  suspensoEm: Date;
}): Promise<{ destinatarios: string[]; enviados: number; falhas: number }> {
  const destinatarios = await coletarDestinatarios(opts.unidadeId, opts.unidade);
  const html = htmlSuspensao({
    unidadeNome: opts.unidade.nome,
    motivo: opts.motivo,
    suspensoEm: opts.suspensoEm,
    contatoRecurso: CONTATO_RECURSO_PADRAO,
  });
  const subject = `[PAWARDS] Clinica ${opts.unidade.nome} foi suspensa`;
  const { enviados, falhas } = await enviarParaTodos(destinatarios, subject, html);
  return { destinatarios, enviados, falhas };
}

export async function enviarEmailReativacao(opts: {
  unidadeId: number;
  unidade: Unidade;
  motivo: string;
  reativadoEm: Date;
}): Promise<{ destinatarios: string[]; enviados: number; falhas: number }> {
  const destinatarios = await coletarDestinatarios(opts.unidadeId, opts.unidade);
  const html = htmlReativacao({
    unidadeNome: opts.unidade.nome,
    motivo: opts.motivo,
    reativadoEm: opts.reativadoEm,
  });
  const subject = `[PAWARDS] Clinica ${opts.unidade.nome} foi reativada`;
  const { enviados, falhas } = await enviarParaTodos(destinatarios, subject, html);
  return { destinatarios, enviados, falhas };
}

/**
 * Task #132 — Helper reutilizavel pelas rotas do portal_paciente.
 * Busca status da unidade do paciente; se SUSPENSO, retorna o payload
 * amigavel (mesmo formato do bloqueioLoginSuspenso usado pelos
 * funcionarios na Task #126). Retorna null se a clinica esta ativa
 * ou o paciente nao tem unidadeId.
 */
export async function checarUnidadeSuspensaParaPortal(
  unidadeId: number | null | undefined,
): Promise<ReturnType<typeof bloqueioLoginSuspenso> | null> {
  if (!unidadeId) return null;
  const [unidade] = await db
    .select({
      nome: unidadesTable.nome,
      status: unidadesTable.status,
      suspensoEm: unidadesTable.suspensoEm,
      suspensaoMotivo: unidadesTable.suspensaoMotivo,
    })
    .from(unidadesTable)
    .where(eq(unidadesTable.id, unidadeId));
  if (!unidade || unidade.status !== "SUSPENSO") return null;
  return bloqueioLoginSuspenso(unidade);
}

export function bloqueioLoginSuspenso(unidade: {
  nome: string;
  status: string | null;
  suspensoEm: Date | null;
  suspensaoMotivo: string | null;
}): {
  codigo: string;
  error: string;
  suspensoEm: string | null;
  motivo: string;
  unidadeNome: string;
  contatoRecurso: string;
} {
  const dataLegivel = dataPtBr(unidade.suspensoEm);
  // motivo SEMPRE retornado como string nao-nula (UI nao precisa tratar null).
  const motivo = unidade.suspensaoMotivo || "(motivo nao registrado)";
  return {
    codigo: "CLINICA_SUSPENSA",
    error: `Clinica "${unidade.nome}" suspensa em ${dataLegivel} por: ${motivo}. Para recurso, fale com ${CONTATO_RECURSO_PADRAO}.`,
    suspensoEm: unidade.suspensoEm ? unidade.suspensoEm.toISOString() : null,
    motivo,
    unidadeNome: unidade.nome,
    contatoRecurso: CONTATO_RECURSO_PADRAO,
  };
}
