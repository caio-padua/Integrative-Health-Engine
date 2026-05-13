import { db, usuariosTable, unidadesTable, type Unidade } from "@workspace/db";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { enviarComTemplateHsm } from "../../services/whatsappService";
import { logger } from "../logger";

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

const CONTATO_RECURSO_PADRAO =
  process.env.PAWARDS_CONTATO_RECURSO ||
  "o CEO da PAWARDS (Dr. Caio) pelo canal oficial da consultoria";

function telefoneValido(t: string | null | undefined): t is string {
  if (!t) return false;
  const digitos = t.replace(/\D/g, "");
  return digitos.length >= 10;
}

export async function coletarTelefonesResponsaveis(
  unidadeId: number,
  unidade: Unidade,
): Promise<string[]> {
  const set = new Set<string>();
  // 1) Telefone institucional da unidade (cobre clinicas que cadastraram
  //    o numero de plantao do responsavel diretamente na unidade).
  if (telefoneValido(unidade.telefone)) {
    set.add(unidade.telefone!.trim());
  }
  // 2) Mesma regra de "responsaveis" do email: tenant_admin / platform_owner
  //    pelo perfil_plataforma OU validador_mestre / consultoria_master pelos
  //    perfis legados. Coerente com `coletarDestinatarios` em clinicaSuspensao.ts.
  const responsaveis = await db
    .select({ telefone: usuariosTable.telefone })
    .from(usuariosTable)
    .where(
      and(
        eq(usuariosTable.unidadeId, unidadeId),
        eq(usuariosTable.ativo, true),
        isNotNull(usuariosTable.telefone),
        or(
          inArray(usuariosTable.perfilPlataforma, ["tenant_admin", "platform_owner"]),
          eq(usuariosTable.perfil, "validador_mestre"),
          eq(usuariosTable.escopo, "consultoria_master"),
        ),
      ),
    );
  for (const r of responsaveis) {
    if (telefoneValido(r.telefone)) set.add(r.telefone!.trim());
  }
  return Array.from(set);
}

function mensagemSuspensao(opts: {
  unidadeNome: string;
  motivo: string;
  suspensoEm: Date;
  contatoRecurso: string;
}): string {
  return [
    "*PAWARDS — Clinica suspensa*",
    "",
    `Clinica: *${opts.unidadeNome}*`,
    `Suspensa em: ${dataPtBr(opts.suspensoEm)}`,
    `Motivo: ${opts.motivo}`,
    "",
    "Enquanto a suspensao estiver ativa, nenhum usuario consegue fazer login. Agenda, prescricoes e faturamento ficam pausados.",
    "",
    `Para recurso: ${opts.contatoRecurso}.`,
    "",
    "Mensagem automatica do motor de governanca PAWARDS (registrada na auditoria_kill_switch).",
  ].join("\n");
}

function mensagemReativacao(opts: {
  unidadeNome: string;
  motivo: string;
  reativadoEm: Date;
}): string {
  return [
    "*PAWARDS — Clinica reativada*",
    "",
    `Clinica: *${opts.unidadeNome}*`,
    `Reativada em: ${dataPtBr(opts.reativadoEm)}`,
    `Justificativa: ${opts.motivo}`,
    "",
    "Os logins voltaram a funcionar normalmente. As rotinas operacionais ja podem ser retomadas.",
    "",
    "Mensagem automatica do motor de governanca PAWARDS (registrada na auditoria_kill_switch).",
  ].join("\n");
}

async function enviarParaTodos(
  destinatarios: string[],
  mensagemFallback: string,
  variaveis: Record<string, string>,
  unidadeId: number,
  templateNome: string,
): Promise<{ enviados: number; falhas: number; viaHsm: number; viaTextoLivre: number }> {
  if (destinatarios.length === 0) {
    return { enviados: 0, falhas: 0, viaHsm: 0, viaTextoLivre: 0 };
  }
  let enviados = 0;
  let falhas = 0;
  let viaHsm = 0;
  let viaTextoLivre = 0;
  for (const telefone of destinatarios) {
    try {
      const r = await enviarComTemplateHsm(telefone, templateNome, variaveis, {
        unidadeId,
        mensagemFallback,
      });
      if (r.sucesso) {
        enviados++;
        if (r.viaHsm) viaHsm++;
        if (r.usouFallback) viaTextoLivre++;
      } else {
        falhas++;
        logger.warn(
          { telefone, erro: r.erro, unidadeId, templateNome },
          "[clinicaSuspensaoWhatsapp] envio retornou falha (HSM e fallback)",
        );
      }
    } catch (err) {
      falhas++;
      logger.warn(
        { err, telefone, unidadeId, templateNome },
        "[clinicaSuspensaoWhatsapp] excecao ao enviar whatsapp",
      );
    }
  }
  return { enviados, falhas, viaHsm, viaTextoLivre };
}

export async function enviarWhatsappSuspensao(opts: {
  unidadeId: number;
  unidade: Unidade;
  motivo: string;
  suspensoEm: Date;
}): Promise<{
  destinatarios: string[];
  enviados: number;
  falhas: number;
  viaHsm: number;
  viaTextoLivre: number;
}> {
  const destinatarios = await coletarTelefonesResponsaveis(opts.unidadeId, opts.unidade);
  const mensagem = mensagemSuspensao({
    unidadeNome: opts.unidade.nome,
    motivo: opts.motivo,
    suspensoEm: opts.suspensoEm,
    contatoRecurso: CONTATO_RECURSO_PADRAO,
  });
  // Variaveis pro template HSM aprovado pelo Meta. A ordem real das
  // variaveis no template e definida em
  // `whatsapp_config.metadados.hsmTemplates.CLINICA_SUSPENSA.ordemVariaveis`
  // (ver docs/operacoes/whatsapp-hsm-clinica-suspensao.md).
  const variaveis: Record<string, string> = {
    unidadeNome: opts.unidade.nome,
    suspensoEm: dataPtBr(opts.suspensoEm),
    motivo: opts.motivo,
    contatoRecurso: CONTATO_RECURSO_PADRAO,
  };
  const { enviados, falhas, viaHsm, viaTextoLivre } = await enviarParaTodos(
    destinatarios,
    mensagem,
    variaveis,
    opts.unidadeId,
    "CLINICA_SUSPENSA",
  );
  return { destinatarios, enviados, falhas, viaHsm, viaTextoLivre };
}

export async function enviarWhatsappReativacao(opts: {
  unidadeId: number;
  unidade: Unidade;
  motivo: string;
  reativadoEm: Date;
}): Promise<{
  destinatarios: string[];
  enviados: number;
  falhas: number;
  viaHsm: number;
  viaTextoLivre: number;
}> {
  const destinatarios = await coletarTelefonesResponsaveis(opts.unidadeId, opts.unidade);
  const mensagem = mensagemReativacao({
    unidadeNome: opts.unidade.nome,
    motivo: opts.motivo,
    reativadoEm: opts.reativadoEm,
  });
  const variaveis: Record<string, string> = {
    unidadeNome: opts.unidade.nome,
    reativadoEm: dataPtBr(opts.reativadoEm),
    motivo: opts.motivo,
  };
  const { enviados, falhas, viaHsm, viaTextoLivre } = await enviarParaTodos(
    destinatarios,
    mensagem,
    variaveis,
    opts.unidadeId,
    "CLINICA_REATIVADA",
  );
  return { destinatarios, enviados, falhas, viaHsm, viaTextoLivre };
}
