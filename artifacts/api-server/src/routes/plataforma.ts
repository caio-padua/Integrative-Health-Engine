import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usuariosTable, unidadesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requirePlataforma } from "../middlewares/requirePlataforma";
import type { JwtPayload } from "../lib/auth/jwt";
import {
  enviarEmailSuspensao,
  enviarEmailReativacao,
} from "../lib/email/clinicaSuspensao";

type AuthedRequest = Request & {
  user?: JwtPayload & { perfil?: string; perfilPlataforma?: string };
};

const router = Router();

const JANELA_2FA_HORAS = 8;

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

// Middleware: exige 2FA recente (<JANELA_2FA_HORAS) do platform_owner.
// Sem bypass por perfil legado (admin) — o atalho admin nao passa por
// 2FA real, entao quebraria o requisito do Task #119. Em DEV permite
// PLATFORM_BYPASS_2FA=1 SOMENTE pra rodar a UI offline (NODE_ENV gate).
function require2faRecente(
  req: Request, res: Response, next: NextFunction,
): void {
  const u = (req as AuthedRequest).user;
  if (!u) {
    res.status(401).json({ error: "Autenticacao necessaria" });
    return;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PLATFORM_BYPASS_2FA === "1"
  ) {
    next();
    return;
  }
  void (async () => {
    try {
      const userId = Number(u.sub);
      if (!Number.isInteger(userId) || userId <= 0) {
        res.status(401).json({ error: "Token sem identidade valida" });
        return;
      }
      const [row] = await db
        .select({ ultimo: usuariosTable.ultimoLogin2faEm })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, userId));
      const ultimo = row?.ultimo ? new Date(row.ultimo) : null;
      const limite = Date.now() - JANELA_2FA_HORAS * 60 * 60 * 1000;
      if (!ultimo || ultimo.getTime() < limite) {
        res.status(403).json({
          error: `Acao sensivel exige 2FA recente (<${JANELA_2FA_HORAS}h). Refaca o login com TOTP.`,
          codigo: "2FA_EXPIRADO",
          janela_horas: JANELA_2FA_HORAS,
          ultimo_2fa_em: ultimo?.toISOString() ?? null,
        });
        return;
      }
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao validar 2FA";
      res.status(500).json({ error: msg });
    }
  })();
}

const guardas = [
  requirePlataforma("platform_owner"),
  requirePlatformOwnerEstrito,
  require2faRecente,
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
      metadata: { status_anterior: unidade.status, nome: unidade.nome },
    });
  });
  req.log?.info({ unidadeId: id, motivo }, "[plataforma] clinica suspensa");

  // Aviso por email — fora da transacao (falha de email NAO desfaz suspensao,
  // ja que a auditoria ja foi gravada e o status no DB e a fonte da verdade).
  let emailRes = { destinatarios: [] as string[], enviados: 0, falhas: 0 };
  try {
    emailRes = await enviarEmailSuspensao({
      unidadeId: id,
      unidade: { ...unidade, status: "SUSPENSO", suspensaoMotivo: motivo, suspensoEm: new Date() },
      motivo,
      suspensoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...emailRes }, "[plataforma] email suspensao enviado");
  } catch (err) {
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar email de suspensao");
  }

  res.json({ ok: true, email: emailRes });
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
  try {
    emailRes = await enviarEmailReativacao({
      unidadeId: id,
      unidade: { ...unidade, status: "ATIVO", suspensaoMotivo: null, suspensoEm: null },
      motivo,
      reativadoEm: new Date(),
    });
    req.log?.info({ unidadeId: id, ...emailRes }, "[plataforma] email reativacao enviado");
  } catch (err) {
    req.log?.warn({ err, unidadeId: id }, "[plataforma] falha ao enviar email de reativacao");
  }

  res.json({ ok: true, email: emailRes });
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
    const dataUrl =
      "data:application/json;base64," + Buffer.from(json, "utf8").toString("base64");

    const actor = getActor(req);
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE unidades
           SET lgpd_export_url = ${dataUrl},
               lgpd_export_em = now()
         WHERE id = ${id}
      `);
      await registrarAuditoria(tx, {
        acao: "EXPORTAR_LGPD", unidadeId: id, executadoPorUsuarioId: actor.userId,
        motivo, ip: actor.ip, ua: actor.ua,
        metadata: {
          nome: unidade.nome,
          tamanho_bytes: Buffer.byteLength(json, "utf8"),
          contagens: counts.rows[0] ?? {},
        },
      });
    });
    req.log?.info(
      { unidadeId: id, bytes: Buffer.byteLength(json, "utf8") },
      "[plataforma] export LGPD gerado",
    );
    res.json({
      ok: true,
      lgpd_export_url: dataUrl,
      lgpd_export_em: new Date().toISOString(),
      tamanho_bytes: Buffer.byteLength(json, "utf8"),
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
