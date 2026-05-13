import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usuariosTable, unidadesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requirePlataforma } from "../middlewares/requirePlataforma";
import { require2faRecente, JANELA_2FA_HORAS as JANELA_2FA_HORAS_SHARED } from "../middlewares/require2faRecente";
import { verificarCodigoTotp } from "../lib/auth/totp";
import {
  estaBloqueadoTotp,
  registrarTentativaErradaTotp,
  resetTentativasTotp,
  TOTP_TENTATIVAS_MAX,
} from "../lib/auth/rateLimitTotp";
import { dispararAlertaBruteForceTotp } from "../lib/auth/alertaBruteForceTotp";
import type { JwtPayload } from "../lib/auth/jwt";
import {
  enviarEmailSuspensao,
  enviarEmailReativacao,
  coletarDestinatarios,
} from "../lib/email/clinicaSuspensao";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import {
  enviarWhatsappSuspensao,
  enviarWhatsappReativacao,
  coletarTelefonesResponsaveis,
} from "../lib/whatsapp/clinicaSuspensaoWhatsapp";
import { avisarPacientesSuspensao } from "../lib/notificacoes/avisarPacientesSuspensao";
import { uploadExportLgpdUnidade } from "../lib/arquivos/drive";

type AuthedRequest = Request & {
  user?: JwtPayload & { perfil?: string; perfilPlataforma?: string };
};

const router = Router();

const JANELA_2FA_HORAS = JANELA_2FA_HORAS_SHARED;

// Hardening Task #119 (post code-review): platform_owner ESTRITO.
// `requirePlataforma('platform_owner')` aceita `perfil === 'admin'`
// como atalho legado (bypass do ADMIN_TOKEN herdado de Wave 10), o
// que e bom pra rotas operacionais mas inaceitavel pra kill-switch.
// Aqui exigimos `perfilPlataforma === 'platform_owner'` literal.
function requirePlatformOwnerEstrito(
  req: Request, res: Response, next: NextFunction,
): void {
  const u = (req as AuthedRequest).user;
  if (!u) {
    res.status(401).json({ error: "Autenticacao necessaria" });
    return;
  }
  if (u.perfilPlataforma !== "platform_owner") {
    res.status(403).json({
      error: "Acao restrita ao platform_owner (perfil_plataforma).",
      perfil_minimo: "platform_owner",
      perfil_atual: u.perfilPlataforma ?? null,
    });
    return;
  }
  next();
}

// Middleware `require2faRecente` movido pra ../middlewares/require2faRecente.ts
// pra ser reutilizavel em outras rotas destrutivas (Task #124).
const guardas = [
  requirePlataforma("platform_owner"),
  requirePlatformOwnerEstrito,
  require2faRecente(),
] as const;

function getActor(req: Request): { userId: number; ip: string; ua: string } {
  const u = (req as AuthedRequest).user;
  return {
    userId: Number(u?.sub ?? 0),
    ip: (req.ip || req.header("x-forwarded-for") || "").toString().slice(0, 200),
    ua: (req.header("user-agent") || "").slice(0, 500),
  };
}

type AcaoKillSwitch =
  | "SUSPENDER" | "REASSUMIR" | "EXPORTAR_LGPD"
  | "EXCLUIR_AGENDAR" | "EXCLUIR_EXECUTAR" | "EXCLUIR_CANCELAR"
  | "PROMOVER_ADMIN" | "REBAIXAR_ADMIN";

// Tipo do executor de SQL: aceita tanto `db` quanto a tx do `db.transaction`.
// Usamos `Pick` pra nao acoplar com a API completa do drizzle.
type SqlExecutor = Pick<typeof db, "execute">;

async function registrarAuditoria(
  exec: SqlExecutor,
  params: {
    acao: AcaoKillSwitch;
    unidadeId: number;
    executadoPorUsuarioId: number;
    motivo: string;
    ip: string;
    ua: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  // O `motivo` vai TANTO na coluna dedicada (busca rapida) QUANTO dentro
  // do metadata jsonb (auditoria juridica self-contained — Task #119
  // requer reason no metadata.jsonb explicitamente).
  const metadataCompleto = { ...params.metadata, motivo: params.motivo };
  await exec.execute(sql`
    INSERT INTO auditoria_kill_switch
      (acao, unidade_id, executado_por_usuario_id, motivo, ip, user_agent, metadata)
    VALUES
      (${params.acao}, ${params.unidadeId}, ${params.executadoPorUsuarioId},
       ${params.motivo}, ${params.ip}, ${params.ua},
       ${JSON.stringify(metadataCompleto)}::jsonb)
  `);
}

// ───────────────────────────── 2FA STEP-UP ─────────────────────────────
// POST /api/plataforma/2fa/step-up { codigo }
// Permite o platform_owner refazer o 2FA TOTP no proprio painel quando a
// janela de 8h expira no meio do uso (Task #125), sem precisar deslogar.
// NAO usa `require2faRecente` (seria circular). Usa as guards de perfil
// estrito + valida o codigo TOTP do usuario logado e atualiza
// `ultimo_login_2fa_em = now()`.
// codigo: exatamente 6 digitos numericos (alinha com verificarCodigoTotp,
// que rejeita qualquer coisa fora desse formato — evita erro confuso pra
// o usuario de "validacao OK no zod mas invalido no TOTP").
const StepUpBody = z.object({ codigo: z.string().regex(/^\d{6}$/, "codigo deve ter exatamente 6 digitos") });
router.post(
  "/plataforma/2fa/step-up",
  requirePlataforma("platform_owner"),
  requirePlatformOwnerEstrito,
  async (req, res): Promise<void> => {
    const u = (req as AuthedRequest).user;
    if (!u) { res.status(401).json({ error: "Autenticacao necessaria" }); return; }
    const parsed = StepUpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "codigo invalido (6-8 digitos)" });
      return;
    }
    const userId = Number(u.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: "Token sem identidade valida" });
      return;
    }
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, userId))
      .limit(1);
    if (!usuario || !usuario.totpSecretCifrado || !usuario.totpAtivadoEm) {
      res.status(409).json({
        error: "Usuario nao tem 2FA ativo. Faca o enrollment em /usuarios/2fa/iniciar.",
        codigo: "2FA_NAO_ATIVO",
      });
      return;
    }
    // Task #131 — rate-limit por usuario (5 tentativas erradas / 5min).
    // Helper compartilhado com login 2FA. Devolve 429 antes de gastar
    // CPU validando o codigo TOTP.
    if (await estaBloqueadoTotp(userId)) {
      req.log?.warn({ userId }, "[plataforma] 2fa step-up bloqueado por excesso de tentativas");
      res.status(429).json({
        error: "Muitas tentativas erradas. Aguarde 5 minutos e tente novamente.",
        codigo: "TOTP_RATE_LIMITED",
      });
      return;
    }
    if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
      const r = await registrarTentativaErradaTotp(userId);
      if (r.transicaoParaBloqueio) {
        // Task #143 — alerta CEO. Step-up vem do PROPRIO platform_owner,
        // entao um brute-force aqui significa session-hijack ativo na conta
        // dele mesmo. Helper e defensivo (nao lanca).
        void dispararAlertaBruteForceTotp({
          usuarioId: userId,
          ip: (req.ip || req.header("x-forwarded-for") || "").toString().slice(0, 200),
          userAgent: (req.header("user-agent") || "").slice(0, 500),
          janelaInicioEm: r.janelaInicioEm,
          contexto: "STEP_UP_PAINEL",
          tentativas: TOTP_TENTATIVAS_MAX,
        });
      }
      res.status(401).json({ error: "Codigo invalido.", codigo: "TOTP_INVALIDO" });
      return;
    }
    await resetTentativasTotp(userId);
    const agora = new Date();
    await db
      .update(usuariosTable)
      .set({ ultimoLogin2faEm: agora })
      .where(eq(usuariosTable.id, usuario.id));
    req.log?.info({ userId }, "[plataforma] 2fa step-up ok");
    res.json({ ok: true, ultimo_2fa_em: agora.toISOString() });
  },
);

// Anexa um registro de tentativa de aviso ao metadata.avisos[] do EVENTO
// MAIS RECENTE da acao indicada na unidade. Idempotente em estrutura: cada
// chamada faz append ao array, nunca sobrescreve. Se nao achar o evento
// (caso raro de race), apenas loga e segue — auditoria nunca bloqueia o
// fluxo principal.
type DetalheEnvioWhatsappAuditoria = {
  destinatario: string;
  sucesso: boolean;
  viaHsm: boolean;
  viaTextoLivre: boolean;
  erro: string | null;
};

type RegistroAviso = {
  tipo:
    | "SUSPENSAO"
    | "REATIVACAO"
    | "REENVIO_SUSPENSAO"
    | "REENVIO_REATIVACAO"
    | "SUSPENSAO_PACIENTES";
  // Canal de envio. Default "EMAIL" pra retrocompat com registros antigos
  // gravados antes da Task #176, quando so email era persistido na auditoria.
  canal?: "EMAIL" | "WHATSAPP";
  destinatarios: string[];
  enviados: number;
  falhas: number;
  erro: string | null;
  em: string;
  executado_por_usuario_id: number;
  detalhes?: Record<string, unknown>;
  // Campos especificos de WhatsApp (Task #176): pro CEO ver se o aviso saiu
  // pela "porta da frente" (template HSM aprovado, entrega garantida fora da
  // janela de 24h) ou "pela janela" (texto livre, entrega so dentro da janela).
  via_hsm?: number;
  via_texto_livre?: number;
  detalhes_whatsapp?: DetalheEnvioWhatsappAuditoria[];
};

async function anexarAvisoEmAuditoria(
  unidadeId: number,
  acao: AcaoKillSwitch,
  aviso: RegistroAviso,
  eventoIdEspecifico?: number,
): Promise<void> {
  try {
    const avisoJson = JSON.stringify(aviso);
    if (eventoIdEspecifico) {
      await db.execute(sql`
        UPDATE auditoria_kill_switch
           SET metadata = jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{avisos}',
                 COALESCE(metadata->'avisos', '[]'::jsonb) || ${avisoJson}::jsonb,
                 true
               )
         WHERE id = ${eventoIdEspecifico}
      `);
      return;
    }
    await db.execute(sql`
      UPDATE auditoria_kill_switch
         SET metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{avisos}',
               COALESCE(metadata->'avisos', '[]'::jsonb) || ${avisoJson}::jsonb,
               true
             )
       WHERE id = (
         SELECT id FROM auditoria_kill_switch
          WHERE unidade_id = ${unidadeId} AND acao = ${acao}
          ORDER BY criado_em DESC
          LIMIT 1
       )
    `);
  } catch (err) {
    logger.warn({ err, unidadeId, acao }, "[plataforma] falha ao anexar aviso em auditoria");
  }
}

// ───────────────────────────── CLINICAS ────────────────────────────────
// GET /api/plataforma/clinicas — lista todas (status + suspensao)
router.get("/plataforma/clinicas", ...guardas, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      u.id, u.nome, u.cidade, u.estado, u.cnpj, u.tipo, u.ativa,
      u.status, u.suspenso_em, u.suspenso_por_usuario_id, u.suspensao_motivo,
      u.exclusao_carencia_ate, u.lgpd_export_url, u.lgpd_export_em,
      sup.nome AS suspenso_por_nome
    FROM unidades u
    LEFT JOIN usuarios sup ON sup.id = u.suspenso_por_usuario_id
    ORDER BY u.id
  `);
  res.json(result.rows);
});

// GET /api/plataforma/clinicas/:id/destinatarios-aviso
// Pre-visualizacao Task #138: mostra a quem o aviso de suspensao chegaria
// (emails + whatsapps), reusando exatamente as MESMAS funcoes que o POST
// /suspender chama. Sem isso, o platform_owner suspende as cegas e so
// descobre depois quem foi avisado — pior, nao detecta o cenario em que
// nenhum responsavel tem telefone (clinica acorda offline sem aviso).
router.get(
  "/plataforma/clinicas/:id/destinatarios-aviso",
  ...guardas,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" });
      return;
    }
    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
    if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    const [emails, telefones] = await Promise.all([
      coletarDestinatarios(id, unidade),
      coletarTelefonesResponsaveis(id, unidade),
    ]);
    res.json({
      unidadeId: id,
      unidadeNome: unidade.nome,
      emails,
      telefones,
      whatsappVazio: telefones.length === 0,
    });
  },
);

// POST /api/plataforma/clinicas/:id/suspender { motivo }
router.post("/plataforma/clinicas/:id/suspender", ...guardas, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const motivo = String(req.body?.motivo ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "id invalido" }); return; }
  if (motivo.length < 8) { res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return; }

  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (unidade.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis nao pode ser suspenso" }); return;
  }

  const actor = getActor(req);
  // Task #139 — captura se a chamada e uma transicao real ou um re-POST
  // sobre clinica ja SUSPENSA. So a transicao real dispara aviso pra
  // pacientes (re-POST nao deve spammear).
  const transicaoEfetiva = unidade.status !== "SUSPENSO";
  // Transacao: UPDATE + auditoria juntos. Se a auditoria falhar a clinica
  // NAO pode ficar suspensa sem registro (compliance kill-switch).
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE unidades
         SET status = 'SUSPENSO',
             suspenso_em = now(),
             suspenso_por_usuario_id = ${actor.userId},
             suspensao_motivo = ${motivo},
             ativa = false
       WHERE id = ${id}
    `);
    await registrarAuditoria(tx, {
      acao: "SUSPENDER", unidadeId: id, executadoPorUsuarioId: actor.userId,
      motivo, ip: actor.ip, ua: actor.ua,
      metadata: {
        status_anterior: unidade.status,
        nome: unidade.nome,
        transicao_efetiva: transicaoEfetiva,
      },
    });
  });
  req.log?.info({ unidadeId: id, motivo, transicaoEfetiva }, "[plataforma] clinica suspensa");

  // Aviso por email — fora da transacao (falha de email NAO desfaz suspensao,
  // ja que a auditoria ja foi gravada e o status no DB e a fonte da verdade).
  // Persiste o resultado em metadata.avisos[] pra Task #134 (visibilidade
  // pro CEO de quem foi avisado, quem falhou e quando).
  let emailRes = { destinatarios: [] as string[], enviados: 0, falhas: 0 };
  let emailErro: string | null = null;
  try {
    emailRes = await enviarEmailSuspensao({
      unidadeId: id,
      unidade: { ...unidade, status: "SUSPENSO", suspensaoMotivo: motivo, suspensoEm: new Date() },
      motivo,
      suspensoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...emailRes }, "[plataforma] email suspensao enviado");
  } catch (err) {
    emailErro = err instanceof Error ? err.message : String(err);
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar email de suspensao");
  }
  await anexarAvisoEmAuditoria(id, "SUSPENDER", {
    tipo: "SUSPENSAO",
    canal: "EMAIL",
    destinatarios: emailRes.destinatarios,
    enviados: emailRes.enviados,
    falhas: emailRes.falhas,
    erro: emailErro,
    em: new Date().toISOString(),
    executado_por_usuario_id: actor.userId,
  });

  // Aviso por WhatsApp — best-effort, igual ao email. Suspensao paralisa
  // operacao inteira, entao o aviso precisa chegar no celular alem do email.
  let whatsappRes: {
    destinatarios: string[];
    enviados: number;
    falhas: number;
    viaHsm: number;
    viaTextoLivre: number;
    detalhes: DetalheEnvioWhatsappAuditoria[];
  } = {
    destinatarios: [],
    enviados: 0,
    falhas: 0,
    viaHsm: 0,
    viaTextoLivre: 0,
    detalhes: [],
  };
  let whatsappErro: string | null = null;
  try {
    whatsappRes = await enviarWhatsappSuspensao({
      unidadeId: id,
      unidade: { ...unidade, status: "SUSPENSO", suspensaoMotivo: motivo, suspensoEm: new Date() },
      motivo,
      suspensoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...whatsappRes }, "[plataforma] whatsapp suspensao enviado");
  } catch (err) {
    whatsappErro = err instanceof Error ? err.message : String(err);
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar whatsapp de suspensao");
  }
  // Task #176: persiste o registro do WhatsApp em auditoria_kill_switch.metadata.avisos[]
  // pro painel do CEO mostrar HSM x texto livre por destinatario.
  await anexarAvisoEmAuditoria(id, "SUSPENDER", {
    tipo: "SUSPENSAO",
    canal: "WHATSAPP",
    destinatarios: whatsappRes.destinatarios,
    enviados: whatsappRes.enviados,
    falhas: whatsappRes.falhas,
    erro: whatsappErro,
    em: new Date().toISOString(),
    executado_por_usuario_id: actor.userId,
    via_hsm: whatsappRes.viaHsm,
    via_texto_livre: whatsappRes.viaTextoLivre,
    detalhes_whatsapp: whatsappRes.detalhes,
  });

  // Task #139 — aviso pra pacientes com consulta marcada nos proximos
  // dias. SO dispara quando ha transicao real (clinica nao estava ja
  // SUSPENSA), pra evitar spammear pacientes em re-POST do endpoint.
  // Best-effort, fora da transacao. Resultado vai pra metadata.avisos[]
  // da auditoria pra que o platform_owner consiga ver no painel.
  let pacientesRes = {
    pacientesAvisados: 0,
    emailEnviados: 0,
    emailFalhas: 0,
    whatsappEnviados: 0,
    whatsappFalhas: 0,
    whatsappViaHsm: 0,
    whatsappViaTextoLivre: 0,
    pacientesSemContato: 0,
    janelaDias: 0,
  };
  let pacientesErro: string | null = null;
  if (transicaoEfetiva) {
    try {
      pacientesRes = await avisarPacientesSuspensao({
        unidadeId: id,
        unidade,
        suspensoEm: new Date(),
      });
      req.log?.info({ unidadeId: id, ...pacientesRes }, "[plataforma] aviso pacientes suspensao enviado");
    } catch (err) {
      pacientesErro = err instanceof Error ? err.message : String(err);
      req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao avisar pacientes da suspensao");
    }
    await anexarAvisoEmAuditoria(id, "SUSPENDER", {
      tipo: "SUSPENSAO_PACIENTES",
      destinatarios: [],
      enviados: pacientesRes.emailEnviados + pacientesRes.whatsappEnviados,
      falhas: pacientesRes.emailFalhas + pacientesRes.whatsappFalhas,
      erro: pacientesErro,
      em: new Date().toISOString(),
      executado_por_usuario_id: actor.userId,
      detalhes: { ...pacientesRes, transicao_efetiva: true },
    });
  } else {
    req.log?.info(
      { unidadeId: id },
      "[plataforma] suspensao re-postada em clinica ja SUSPENSA — aviso pra pacientes pulado",
    );
    await anexarAvisoEmAuditoria(id, "SUSPENDER", {
      tipo: "SUSPENSAO_PACIENTES",
      destinatarios: [],
      enviados: 0,
      falhas: 0,
      erro: null,
      em: new Date().toISOString(),
      executado_por_usuario_id: actor.userId,
      detalhes: {
        pulado: true,
        motivo_pulo: "clinica_ja_estava_suspensa",
        transicao_efetiva: false,
      },
    });
  }

  res.json({ ok: true, email: emailRes, whatsapp: whatsappRes, pacientes: pacientesRes });
});

// POST /api/plataforma/clinicas/:id/reativar { motivo }
router.post("/plataforma/clinicas/:id/reativar", ...guardas, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const motivo = String(req.body?.motivo ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "id invalido" }); return; }
  if (motivo.length < 8) { res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return; }

  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }

  const actor = getActor(req);
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE unidades
         SET status = 'ATIVO',
             suspenso_em = NULL,
             suspenso_por_usuario_id = NULL,
             suspensao_motivo = NULL,
             ativa = true
       WHERE id = ${id}
    `);
    await registrarAuditoria(tx, {
      acao: "REASSUMIR", unidadeId: id, executadoPorUsuarioId: actor.userId,
      motivo, ip: actor.ip, ua: actor.ua,
      metadata: { status_anterior: unidade.status, nome: unidade.nome },
    });
  });
  req.log?.info({ unidadeId: id, motivo }, "[plataforma] clinica reativada");

  let emailRes = { destinatarios: [] as string[], enviados: 0, falhas: 0 };
  let emailErro: string | null = null;
  try {
    emailRes = await enviarEmailReativacao({
      unidadeId: id,
      unidade: { ...unidade, status: "ATIVO", suspensaoMotivo: null, suspensoEm: null },
      motivo,
      reativadoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...emailRes }, "[plataforma] email reativacao enviado");
  } catch (err) {
    emailErro = err instanceof Error ? err.message : String(err);
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar email de reativacao");
  }
  await anexarAvisoEmAuditoria(id, "REASSUMIR", {
    tipo: "REATIVACAO",
    canal: "EMAIL",
    destinatarios: emailRes.destinatarios,
    enviados: emailRes.enviados,
    falhas: emailRes.falhas,
    erro: emailErro,
    em: new Date().toISOString(),
    executado_por_usuario_id: actor.userId,
  });

  let whatsappRes: {
    destinatarios: string[];
    enviados: number;
    falhas: number;
    viaHsm: number;
    viaTextoLivre: number;
    detalhes: DetalheEnvioWhatsappAuditoria[];
  } = {
    destinatarios: [],
    enviados: 0,
    falhas: 0,
    viaHsm: 0,
    viaTextoLivre: 0,
    detalhes: [],
  };
  let whatsappErro: string | null = null;
  try {
    whatsappRes = await enviarWhatsappReativacao({
      unidadeId: id,
      unidade: { ...unidade, status: "ATIVO", suspensaoMotivo: null, suspensoEm: null },
      motivo,
      reativadoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...whatsappRes }, "[plataforma] whatsapp reativacao enviado");
  } catch (err) {
    whatsappErro = err instanceof Error ? err.message : String(err);
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar whatsapp de reativacao");
  }
  await anexarAvisoEmAuditoria(id, "REASSUMIR", {
    tipo: "REATIVACAO",
    canal: "WHATSAPP",
    destinatarios: whatsappRes.destinatarios,
    enviados: whatsappRes.enviados,
    falhas: whatsappRes.falhas,
    erro: whatsappErro,
    em: new Date().toISOString(),
    executado_por_usuario_id: actor.userId,
    via_hsm: whatsappRes.viaHsm,
    via_texto_livre: whatsappRes.viaTextoLivre,
    detalhes_whatsapp: whatsappRes.detalhes,
  });

  res.json({ ok: true, email: emailRes, whatsapp: whatsappRes });
});

// ─────────────────────── EXCLUSAO COM CARENCIA LGPD ──────────────────
// Janela de carencia LGPD: 30 dias. Pode ser cancelada a qualquer momento
// dentro da janela. Worker `exclusaoCarenciaExecutor` executa quando vence.
const CARENCIA_LGPD_DIAS = 30;

// POST /api/plataforma/clinicas/:id/exclusao/agendar { motivo, confirmacao }
// `confirmacao` deve ser exatamente o nome da clinica (confirmacao dupla).
router.post(
  "/plataforma/clinicas/:id/exclusao/agendar",
  ...guardas,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const motivo = String(req.body?.motivo ?? "").trim();
    const confirmacao = String(req.body?.confirmacao ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" }); return;
    }
    if (motivo.length < 8) {
      res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return;
    }

    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
    if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    if (unidade.tipo === "genesis_seed") {
      res.status(403).json({ error: "Instituto Genesis nao pode ser excluido" }); return;
    }
    if (unidade.status === "EXCLUIDO") {
      res.status(409).json({ error: "Unidade ja foi excluida definitivamente" }); return;
    }
    if (unidade.status === "EXCLUIDO_PENDENTE") {
      res.status(409).json({
        error: "Exclusao ja agendada — cancele antes de reagendar",
        carencia_ate: unidade.exclusaoCarenciaAte,
      }); return;
    }
    if (confirmacao !== unidade.nome) {
      res.status(400).json({
        error: "Confirmacao dupla falhou — digite o nome exato da clinica",
        codigo: "CONFIRMACAO_INVALIDA",
      }); return;
    }

    const actor = getActor(req);
    const carenciaAte = new Date(Date.now() + CARENCIA_LGPD_DIAS * 24 * 60 * 60 * 1000);
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE unidades
           SET status = 'EXCLUIDO_PENDENTE',
               exclusao_carencia_ate = ${carenciaAte.toISOString()},
               suspenso_em = COALESCE(suspenso_em, now()),
               suspenso_por_usuario_id = ${actor.userId},
               suspensao_motivo = COALESCE(suspensao_motivo, ${motivo}),
               ativa = false
         WHERE id = ${id}
      `);
      await registrarAuditoria(tx, {
        acao: "EXCLUIR_AGENDAR", unidadeId: id, executadoPorUsuarioId: actor.userId,
        motivo, ip: actor.ip, ua: actor.ua,
        metadata: {
          status_anterior: unidade.status,
          nome: unidade.nome,
          carencia_dias: CARENCIA_LGPD_DIAS,
          carencia_ate: carenciaAte.toISOString(),
          confirmacao_dupla: true,
        },
      });
    });
    req.log?.info(
      { unidadeId: id, carenciaAte: carenciaAte.toISOString() },
      "[plataforma] exclusao agendada",
    );
    res.json({ ok: true, carencia_ate: carenciaAte.toISOString() });
  },
);

// POST /api/plataforma/clinicas/:id/exclusao/cancelar { motivo }
router.post(
  "/plataforma/clinicas/:id/exclusao/cancelar",
  ...guardas,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const motivo = String(req.body?.motivo ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" }); return;
    }
    if (motivo.length < 8) {
      res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return;
    }

    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
    if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    if (unidade.status !== "EXCLUIDO_PENDENTE") {
      res.status(409).json({
        error: "Unidade nao esta em periodo de carencia",
        status_atual: unidade.status,
      }); return;
    }

    const actor = getActor(req);
    await db.transaction(async (tx) => {
      // Cancelar carencia volta pra SUSPENSO (nao pra ATIVO automaticamente —
      // o owner decide se reativa em seguida via /reativar).
      await tx.execute(sql`
        UPDATE unidades
           SET status = 'SUSPENSO',
               exclusao_carencia_ate = NULL
         WHERE id = ${id}
      `);
      await registrarAuditoria(tx, {
        acao: "EXCLUIR_CANCELAR", unidadeId: id, executadoPorUsuarioId: actor.userId,
        motivo, ip: actor.ip, ua: actor.ua,
        metadata: {
          nome: unidade.nome,
          carencia_ate_cancelada: unidade.exclusaoCarenciaAte,
        },
      });
    });
    req.log?.info({ unidadeId: id }, "[plataforma] exclusao cancelada");
    res.json({ ok: true });
  },
);

// POST /api/plataforma/clinicas/:id/exclusao/exportar-lgpd { motivo }
// Gera snapshot JSON LGPD da clinica, embute como data: URL em
// `unidades.lgpd_export_url`. Necessario antes do worker executar a exclusao.
router.post(
  "/plataforma/clinicas/:id/exclusao/exportar-lgpd",
  ...guardas,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const motivo = String(req.body?.motivo ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" }); return;
    }
    if (motivo.length < 8) {
      res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return;
    }

    const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
    if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }

    // Coleta resumo LGPD: dados da unidade + counts de tabelas relacionadas.
    const counts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM pacientes WHERE unidade_id = ${id})::int AS pacientes,
        (SELECT COUNT(*) FROM usuarios WHERE unidade_id = ${id})::int AS usuarios,
        (SELECT COUNT(*) FROM auditoria_kill_switch WHERE unidade_id = ${id})::int AS auditoria_eventos
    `);
    const auditoria = await db.execute(sql`
      SELECT acao, motivo, criado_em, executado_por_usuario_id
        FROM auditoria_kill_switch
       WHERE unidade_id = ${id}
       ORDER BY criado_em DESC
       LIMIT 500
    `);

    const snapshot = {
      tipo: "EXPORT_LGPD_PAWARDS_V1",
      gerado_em: new Date().toISOString(),
      unidade: {
        id: unidade.id,
        nome: unidade.nome,
        cnpj: unidade.cnpj,
        cidade: unidade.cidade,
        estado: unidade.estado,
        tipo: unidade.tipo,
        status: unidade.status,
        criado_em: unidade.criadoEm,
        suspenso_em: unidade.suspensoEm,
        suspensao_motivo: unidade.suspensaoMotivo,
        exclusao_carencia_ate: unidade.exclusaoCarenciaAte,
      },
      contagens: counts.rows[0] ?? {},
      auditoria_kill_switch: auditoria.rows,
    };
    const json = JSON.stringify(snapshot, null, 2);

    // Task #136 — sobe pro Drive em vez de embutir como data:URL.
    // Se o upload falhar (Drive offline, unidade sem clientes_subfolder_id,
    // etc.) propagamos 502 — NÃO temos mais fallback pra data:URL porque o
    // problema da v1 era exatamente o blob gigante na coluna.
    let upload;
    try {
      upload = await uploadExportLgpdUnidade({
        unidadeId: id,
        unidadeNome: unidade.nome,
        nick: unidade.nick,
        json,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      req.log?.error({ err: msg, unidadeId: id }, "[plataforma] falha ao subir export LGPD pro Drive");
      res.status(502).json({ error: "Falha ao subir export LGPD pro Drive", detalhe: msg });
      return;
    }

    const actor = getActor(req);
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE unidades
           SET lgpd_export_url           = ${upload.driveUrl},
               lgpd_export_sha256        = ${upload.sha256},
               lgpd_export_tamanho_bytes = ${upload.tamanhoBytes},
               lgpd_export_drive_file_id = ${upload.driveFileId},
               lgpd_export_em            = now()
         WHERE id = ${id}
      `);
      await registrarAuditoria(tx, {
        acao: "EXPORTAR_LGPD", unidadeId: id, executadoPorUsuarioId: actor.userId,
        motivo, ip: actor.ip, ua: actor.ua,
        metadata: {
          nome: unidade.nome,
          tamanho_bytes: upload.tamanhoBytes,
          sha256: upload.sha256,
          drive_file_id: upload.driveFileId,
          drive_url: upload.driveUrl,
          nome_arquivo: upload.nomeArquivo,
          contagens: counts.rows[0] ?? {},
        },
      });
    });
    req.log?.info(
      {
        unidadeId: id,
        bytes: upload.tamanhoBytes,
        sha256: upload.sha256,
        driveFileId: upload.driveFileId,
      },
      "[plataforma] export LGPD gravado no Drive",
    );
    res.json({
      ok: true,
      lgpd_export_url: upload.driveUrl,
      lgpd_export_em: new Date().toISOString(),
      lgpd_export_sha256: upload.sha256,
      lgpd_export_drive_file_id: upload.driveFileId,
      tamanho_bytes: upload.tamanhoBytes,
      nome_arquivo: upload.nomeArquivo,
    });
  },
);

// ───────────────────────────── ADMINS ──────────────────────────────────
// GET /api/plataforma/admins — lista usuarios com perfil_plataforma
router.get("/plataforma/admins", ...guardas, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      us.id, us.nome, us.email, us.perfil, us.perfil_plataforma,
      us.ativo, us.unidade_id,
      un.nome AS unidade_nome
    FROM usuarios us
    LEFT JOIN unidades un ON un.id = us.unidade_id
    WHERE us.ativo = true
    ORDER BY
      CASE us.perfil_plataforma
        WHEN 'platform_owner' THEN 0
        WHEN 'tenant_admin'   THEN 1
        ELSE 2
      END,
      us.nome
  `);
  res.json(result.rows);
});

async function alterarPerfilPlataforma(
  req: Request, res: Response,
  novoPerfil: "tenant_admin" | "tenant_user",
  acao: "PROMOVER_ADMIN" | "REBAIXAR_ADMIN",
): Promise<void> {
  const userId = Number(req.params.userId);
  const motivo = String(req.body?.motivo ?? "").trim();
  if (!Number.isInteger(userId) || userId <= 0) { res.status(400).json({ error: "userId invalido" }); return; }
  if (motivo.length < 8) { res.status(400).json({ error: "motivo obrigatorio (>= 8 chars)" }); return; }

  const [alvo] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, userId));
  if (!alvo) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
  if (alvo.perfilPlataforma === "platform_owner") {
    res.status(403).json({ error: "platform_owner nao pode ser alterado por esta rota" });
    return;
  }
  if (alvo.perfilPlataforma === novoPerfil) {
    res.status(409).json({ error: `Usuario ja e ${novoPerfil}` });
    return;
  }

  // auditoria_kill_switch.unidade_id e NOT NULL e tem que apontar pra
  // unidade real do usuario alvo (precisao forense). Se o alvo nao tem
  // unidade, recusamos a operacao em vez de gravar fallback inventado.
  const unidadeAlvo = alvo.unidadeId;
  if (!unidadeAlvo) {
    res.status(409).json({
      error: "Usuario alvo nao tem unidade vinculada — atribua unidade antes de promover/rebaixar.",
      codigo: "UNIDADE_AUSENTE",
    });
    return;
  }

  const actor = getActor(req);
  await db.transaction(async (tx) => {
    await tx.update(usuariosTable)
      .set({ perfilPlataforma: novoPerfil })
      .where(eq(usuariosTable.id, userId));

    await registrarAuditoria(tx, {
      acao, unidadeId: Number(unidadeAlvo), executadoPorUsuarioId: actor.userId,
      motivo, ip: actor.ip, ua: actor.ua,
      metadata: {
        usuario_alvo_id: userId,
        usuario_alvo_nome: alvo.nome,
        usuario_alvo_email: alvo.email,
        perfil_anterior: alvo.perfilPlataforma,
        perfil_novo: novoPerfil,
      },
    });
  });
  req.log?.info({ userId, novoPerfil, motivo }, "[plataforma] perfil_plataforma alterado");
  res.json({ ok: true });
}

router.post("/plataforma/admins/:userId/promover", ...guardas, (req, res) =>
  alterarPerfilPlataforma(req, res, "tenant_admin", "PROMOVER_ADMIN"),
);
router.post("/plataforma/admins/:userId/rebaixar", ...guardas, (req, res) =>
  alterarPerfilPlataforma(req, res, "tenant_user", "REBAIXAR_ADMIN"),
);

// ────────────────────────── AVISOS DE SUSPENSAO ────────────────────────
// GET /api/plataforma/clinicas/:id/avisos — historico de envios de email
// (Task #134) pra cada evento SUSPENDER/REASSUMIR de uma clinica.
router.get(
  "/plataforma/clinicas/:id/avisos",
  ...guardas,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" }); return;
    }
    const result = await db.execute(sql`
      SELECT
        a.id, a.acao, a.criado_em, a.motivo,
        ex.nome AS executor_nome,
        COALESCE(a.metadata->'avisos', '[]'::jsonb) AS avisos
      FROM auditoria_kill_switch a
      LEFT JOIN usuarios ex ON ex.id = a.executado_por_usuario_id
      WHERE a.unidade_id = ${id}
        AND a.acao IN ('SUSPENDER', 'REASSUMIR')
      ORDER BY a.criado_em DESC
      LIMIT 100
    `);
    res.json(result.rows);
  },
);

// POST /api/plataforma/auditoria/:eventoId/reenviar-avisos
// Reenvia o email da suspensao/reativacao referenciada pelo evento de
// auditoria. Append em metadata.avisos[] do MESMO evento (rastreabilidade).
router.post(
  "/plataforma/auditoria/:eventoId/reenviar-avisos",
  ...guardas,
  async (req, res): Promise<void> => {
    const eventoId = Number(req.params.eventoId);
    if (!Number.isInteger(eventoId) || eventoId <= 0) {
      res.status(400).json({ error: "eventoId invalido" }); return;
    }
    const evRes = await db.execute(sql`
      SELECT id, acao, unidade_id, motivo, criado_em
        FROM auditoria_kill_switch
       WHERE id = ${eventoId}
       LIMIT 1
    `);
    const evento = evRes.rows[0] as
      | { id: number; acao: string; unidade_id: number; motivo: string | null; criado_em: string }
      | undefined;
    if (!evento) { res.status(404).json({ error: "Evento nao encontrado" }); return; }
    if (evento.acao !== "SUSPENDER" && evento.acao !== "REASSUMIR") {
      res.status(400).json({
        error: "Reenvio so suportado pra eventos SUSPENDER/REASSUMIR",
        acao_evento: evento.acao,
      });
      return;
    }
    const [unidade] = await db.select().from(unidadesTable)
      .where(eq(unidadesTable.id, evento.unidade_id));
    if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }

    const actor = getActor(req);
    const motivoOriginal = evento.motivo ?? "(motivo nao registrado)";
    let emailRes = { destinatarios: [] as string[], enviados: 0, falhas: 0 };
    let emailErro: string | null = null;
    try {
      if (evento.acao === "SUSPENDER") {
        emailRes = await enviarEmailSuspensao({
          unidadeId: evento.unidade_id,
          unidade,
          motivo: motivoOriginal,
          suspensoEm: new Date(evento.criado_em),
        });
      } else {
        emailRes = await enviarEmailReativacao({
          unidadeId: evento.unidade_id,
          unidade,
          motivo: motivoOriginal,
          reativadoEm: new Date(evento.criado_em),
        });
      }
      req.log?.info(
        { eventoId, ...emailRes },
        "[plataforma] reenvio de aviso executado",
      );
    } catch (err) {
      emailErro = err instanceof Error ? err.message : String(err);
      req.log?.warn({ err, eventoId }, "[plataforma] falha no reenvio de aviso");
    }
    await anexarAvisoEmAuditoria(
      evento.unidade_id,
      evento.acao as AcaoKillSwitch,
      {
        tipo: evento.acao === "SUSPENDER" ? "REENVIO_SUSPENSAO" : "REENVIO_REATIVACAO",
        destinatarios: emailRes.destinatarios,
        enviados: emailRes.enviados,
        falhas: emailRes.falhas,
        erro: emailErro,
        em: new Date().toISOString(),
        executado_por_usuario_id: actor.userId,
      },
      eventoId,
    );
    // Task #150 — marca alerta de email travado (Task #141) como visualizado
    // quando o Caio reenvia o aviso pelo painel (Task #134). Idempotente:
    // a clausula visualizado_em IS NULL evita sobrescrever timestamp anterior.
    if (emailErro === null) {
      await db.execute(sql`
        UPDATE alertas_ceo_killswitch_emails
           SET visualizado_em = NOW()
         WHERE evento_id = ${eventoId}
           AND visualizado_em IS NULL
      `);
    }
    res.json({ ok: true, email: emailRes, erro: emailErro });
  },
);

// ─────────────────────── ALERTAS SEGURANCA (Task #143) ─────────────────
// GET /api/plataforma/alertas-seguranca — fila de alertas de seguranca
// (atualmente: 2FA_BRUTE_FORCE). Junta nome/email do usuario alvo pra UI.
router.get("/plataforma/alertas-seguranca", ...guardas, async (req, res): Promise<void> => {
  const limite = Math.min(Number(req.query["limite"] ?? 100) || 100, 500);
  const apenasNaoVistos = String(req.query["apenas_nao_vistos"] ?? "") === "true";
  // Task #175 — filtro de janela temporal (horas). Quando informado:
  //   - Filtra rows da fila por criado_em >= now() - janela
  //   - Retorna agregados `total_janela` / `total_janela_anterior` /
  //     `variacao_pct` pra mini-card de tendencia no painel-comando.
  // Janela: inteiro 1..720h (30 dias). Fora do range = ignorado.
  const janelaRaw = req.query["janela_horas"];
  const janelaHoras =
    janelaRaw !== undefined && janelaRaw !== ""
      ? Math.max(1, Math.min(Number(janelaRaw) || 0, 720))
      : null;

  const filtroJanela = janelaHoras
    ? sql`a.criado_em >= now() - (${janelaHoras}::int * INTERVAL '1 hour')`
    : sql`true`;
  const filtroNaoVistos = apenasNaoVistos ? sql`a.visualizado_em IS NULL` : sql`true`;

  const result = await db.execute(sql`
    SELECT
      a.id, a.tipo, a.usuario_id, a.janela_inicio_em, a.ip, a.user_agent,
      a.contexto, a.payload, a.notif_email_enviados, a.notif_email_falhas,
      a.notif_destinatarios, a.visualizado_em, a.visualizado_por_usuario_id,
      a.criado_em,
      us.nome AS usuario_nome,
      us.email AS usuario_email
    FROM alertas_ceo_seguranca a
    LEFT JOIN usuarios us ON us.id = a.usuario_id
    WHERE ${filtroJanela} AND ${filtroNaoVistos}
    ORDER BY a.criado_em DESC
    LIMIT ${limite}
  `);

  const resposta: Record<string, unknown> = {
    alertas: result.rows,
    total: result.rows?.length ?? 0,
  };

  if (janelaHoras) {
    // Conta total absoluto na janela atual (sem o LIMIT) e na janela
    // anterior do mesmo tamanho. Ignora apenas_nao_vistos pra dar a
    // tendencia "real" de bloqueios criados na janela.
    const agg = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (
          WHERE a.criado_em >= now() - (${janelaHoras}::int * INTERVAL '1 hour')
        )::int AS total_janela,
        COUNT(*) FILTER (
          WHERE a.criado_em >= now() - (${janelaHoras * 2}::int * INTERVAL '1 hour')
            AND a.criado_em <  now() - (${janelaHoras}::int * INTERVAL '1 hour')
        )::int AS total_janela_anterior
      FROM alertas_ceo_seguranca a
      WHERE a.criado_em >= now() - (${janelaHoras * 2}::int * INTERVAL '1 hour')
    `);
    const row = (agg.rows?.[0] ?? {}) as {
      total_janela?: number;
      total_janela_anterior?: number;
    };
    const atual = Number(row.total_janela ?? 0);
    const anterior = Number(row.total_janela_anterior ?? 0);
    const variacaoPct =
      anterior === 0
        ? atual === 0
          ? 0
          : null
        : ((atual - anterior) / anterior) * 100;
    const tendencia: "subindo" | "caindo" | "estavel" =
      atual > anterior ? "subindo" : atual < anterior ? "caindo" : "estavel";
    resposta["janela_horas"] = janelaHoras;
    resposta["total_janela"] = atual;
    resposta["total_janela_anterior"] = anterior;
    resposta["variacao_pct"] = variacaoPct;
    resposta["tendencia"] = tendencia;
  }

  res.json(resposta);
});

// GET /api/plataforma/alertas-seguranca/contagem — endpoint leve (Task #168).
// Retorna apenas o total de alertas nao-visualizados pra alimentar o badge da
// campainha no header global sem precisar puxar a lista inteira (200 linhas
// + JOIN). Usado em polling de 60s, entao precisa ser o mais barato possivel.
router.get(
  "/plataforma/alertas-seguranca/contagem",
  ...guardas,
  async (_req, res): Promise<void> => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS total
        FROM alertas_ceo_seguranca
       WHERE visualizado_em IS NULL
    `);
    const total = Number((result.rows[0] as { total?: number } | undefined)?.total ?? 0) || 0;
    res.json({ total });
  },
);

// POST /api/plataforma/alertas-seguranca/:id/visualizar — marca como lido.
router.post("/plataforma/alertas-seguranca/:id/visualizar", ...guardas, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "id invalido" });
    return;
  }
  const u = (req as AuthedRequest).user;
  const userId = Number(u?.sub ?? 0);
  await db.execute(sql`
    UPDATE alertas_ceo_seguranca
       SET visualizado_em = COALESCE(visualizado_em, NOW()),
           visualizado_por_usuario_id = COALESCE(visualizado_por_usuario_id, ${userId})
     WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// ─────────────────── HISTORICO AVISOS 2FA OWNER (Task #158) ────────────
// GET /api/plataforma/seguranca/avisos-2fa — historico das ultimas N
// janelas de 2FA do platform_owner com timestamp do aviso enviado pelo
// worker (Task #146), expiracao calculada (login + 8h) e renovacao
// (proximo login 2FA dentro da janela). Permite ao owner auditar
// "quantas vezes fui avisado essa semana? quantas deixei expirar?".
router.get("/plataforma/seguranca/avisos-2fa", ...guardas, async (req, res): Promise<void> => {
  const limite = Math.min(Number(req.query["limite"] ?? 100) || 100, 500);
  const diasJanela = Math.min(Number(req.query["dias"] ?? 30) || 30, 180);
  const result = await db.execute(sql`
    SELECT
      h.id,
      h.usuario_id,
      h.ultimo_login_2fa_em,
      h.aviso_em,
      h.aviso_em  AS ultimo_aviso_2fa_em,
      h.expira_em,
      h.expira_em AS expirou_em,
      h.renovado_em,
      h.canal_email_ok,
      h.canal_whatsapp_ok,
      h.criado_em,
      u.nome  AS usuario_nome,
      u.email AS usuario_email,
      CASE
        WHEN h.renovado_em IS NOT NULL
          THEN EXTRACT(EPOCH FROM (h.renovado_em - h.aviso_em))::int
        ELSE NULL
      END AS renovado_em_segundos_apos_aviso,
      CASE
        WHEN h.renovado_em IS NOT NULL THEN 'renovado'
        WHEN h.expira_em <= now()      THEN 'expirou'
        ELSE 'em_andamento'
      END AS status
    FROM historico_avisos_2fa_owner h
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    WHERE h.aviso_em >= now() - (${diasJanela}::int * INTERVAL '1 day')
    ORDER BY h.aviso_em DESC
    LIMIT ${limite}
  `);

  const linhas = (result.rows ?? []) as Array<{
    renovado_em: string | null;
    expira_em: string;
    status: string;
  }>;
  const totalAvisos = linhas.length;
  const totalRenovados = linhas.filter((l) => l.status === "renovado").length;
  const totalExpirados = linhas.filter((l) => l.status === "expirou").length;
  const totalEmAndamento = linhas.filter(
    (l) => l.status === "em_andamento",
  ).length;
  // KPI principal: % de avisos que renderam renovacao. Considera apenas
  // janelas ja resolvidas (renovado ou expirou) — em_andamento ainda nao
  // tem desfecho. Retorna null se nada resolveu pra UI mostrar "—".
  const resolvidos = totalRenovados + totalExpirados;
  const percentualRenovacao =
    resolvidos > 0 ? Math.round((totalRenovados / resolvidos) * 1000) / 10 : null;

  res.json({
    avisos: result.rows ?? [],
    kpi: {
      total_avisos: totalAvisos,
      total_renovados: totalRenovados,
      total_expirados: totalExpirados,
      total_em_andamento: totalEmAndamento,
      percentual_renovacao: percentualRenovacao,
      dias_janela: diasJanela,
    },
  });
});

// ─────────────── HISTORICO ALERTAS KILLSWITCH EMAILS (Task #149) ───────
// GET /api/plataforma/alertas-killswitch-emails — timeline historica dos
// alertas disparados pelo worker `alertaKillSwitchEmailsCEO` (Task #141)
// quando os emails de SUSPENDER/REASSUMIR uma clinica falham. Permite ao
// CEO ver tendencia (ex: "Gmail caiu 3x essa semana, troca a credencial").
//
// Filtros opcionais:
//   - unidade_id (int): so alertas desta unidade
//   - motivo    (str): ERRO_NO_ENVIO | SEM_DESTINATARIO | FALHA_ACIMA_DO_THRESHOLD
//   - limite    (int 1..500, default 200)
router.get(
  "/plataforma/alertas-killswitch-emails",
  ...guardas,
  async (req, res): Promise<void> => {
    const limite = Math.max(1, Math.min(Number(req.query["limite"] ?? 200) || 200, 500));
    const unidadeIdRaw = req.query["unidade_id"];
    const unidadeId =
      unidadeIdRaw !== undefined && unidadeIdRaw !== ""
        ? Number(unidadeIdRaw)
        : null;
    const motivoRaw = String(req.query["motivo"] ?? "");
    const MOTIVOS_VALIDOS = new Set([
      "ERRO_NO_ENVIO",
      "SEM_DESTINATARIO",
      "FALHA_ACIMA_DO_THRESHOLD",
    ]);
    const motivo = MOTIVOS_VALIDOS.has(motivoRaw) ? motivoRaw : null;

    const filtroUnidade =
      unidadeId && Number.isInteger(unidadeId)
        ? sql`a.unidade_id = ${unidadeId}`
        : sql`true`;
    const filtroMotivo = motivo
      ? sql`a.motivo_alerta = ${motivo}`
      : sql`true`;

    const result = await db.execute(sql`
      SELECT
        a.id, a.evento_id, a.tentativa_idx, a.unidade_id, a.acao,
        a.tipo_aviso, a.destinatarios, a.enviados, a.falhas, a.erro,
        a.motivo_alerta, a.pct_falha, a.notif_email_ok, a.notif_wpp_ok,
        a.visualizado_em, a.criado_em,
        un.nome AS unidade_nome
      FROM alertas_ceo_killswitch_emails a
      LEFT JOIN unidades un ON un.id = a.unidade_id
      WHERE ${filtroUnidade} AND ${filtroMotivo}
      ORDER BY a.criado_em DESC
      LIMIT ${limite}
    `);
    res.json({
      alertas: result.rows ?? [],
      total: result.rows?.length ?? 0,
      filtro: { unidade_id: unidadeId, motivo },
    });
  },
);

// ──────────────────────────── AUDITORIA ────────────────────────────────
// GET /api/plataforma/auditoria — timeline cronologica das acoes sensiveis
router.get("/plataforma/auditoria", ...guardas, async (req, res): Promise<void> => {
  const limite = Math.min(Number(req.query.limite ?? 200) || 200, 1000);
  const result = await db.execute(sql`
    SELECT
      a.id, a.acao, a.unidade_id, a.executado_por_usuario_id,
      a.motivo, a.ip, a.user_agent, a.metadata, a.criado_em,
      un.nome AS unidade_nome,
      ex.nome AS executor_nome,
      ex.email AS executor_email
    FROM auditoria_kill_switch a
    LEFT JOIN unidades un ON un.id = a.unidade_id
    LEFT JOIN usuarios ex ON ex.id = a.executado_por_usuario_id
    ORDER BY a.criado_em DESC
    LIMIT ${limite}
  `);
  res.json(result.rows);
});

export default router;
