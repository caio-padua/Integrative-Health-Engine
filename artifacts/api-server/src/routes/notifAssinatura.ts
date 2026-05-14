/**
 * PARMASUPRA-FECHAMENTO · F4 / WD14 · Endpoints admin do worker assinatura.
 * Wave 2 (MENSAGERIA-TSUNAMI) adicionou:
 *   - GET  /admin/notif-assinatura/list?status=&canal=&dia=&q=&page=&pageSize=
 *   - POST /admin/notif-assinatura/:id/reenviar
 *   - GET  /admin/notif-config
 *   - PUT  /admin/notif-config
 *   - GET  /admin/notif-assinatura/preview/:id  (renderiza template branded p/ debug)
 *
 * Rotas existentes:
 *   - POST /admin/notif-assinatura/tick
 *   - GET  /admin/notif-assinatura/status
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";
import { requireAuth } from "../middlewares/requireAuth";
import { tickNotifAssinatura, invalidarCacheNotifConfig, invalidarCacheCEOPrefs } from "../lib/recorrencia/notifAssinatura";
import { wrapEmailMedcore, type MomentoNotif } from "../lib/recorrencia/notifTemplate";

const router = Router();

router.post(
  "/admin/notif-assinatura/tick",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    try {
      const r = await tickNotifAssinatura();
      res.json({ ok: true, ...r });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

router.get(
  "/admin/notif-assinatura/status",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    const r: any = await db.execute(sql`
      SELECT status, count(*)::int AS n,
             max(criado_em) AS ultimo_criado_em,
             max(enviado_em) AS ultimo_enviado_em
      FROM assinatura_notificacoes
      GROUP BY status ORDER BY status
    `);
    res.json({ por_status: r.rows ?? r });
  }
);

/** Lista paginada com filtros — coração da página /admin/notificacoes. */
router.get(
  "/admin/notif-assinatura/list",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    try {
      const status = String(req.query.status || "").trim().toUpperCase();
      const canal = String(req.query.canal || "").trim().toUpperCase();
      const dia = String(req.query.dia || "").trim(); // YYYY-MM-DD
      const q = String(req.query.q || "").trim();
      const page = Math.max(1, Number(req.query.page || 1));
      const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize || 50)));
      const offset = (page - 1) * pageSize;

      const filtros: any[] = [];
      if (status) filtros.push(sql`n.status = ${status}`);
      if (canal) filtros.push(sql`n.canal = ${canal}`);
      if (dia) filtros.push(sql`date(n.criado_em AT TIME ZONE 'America/Sao_Paulo') = ${dia}::date`);
      if (q) {
        const like = `%${q}%`;
        filtros.push(sql`(n.destinatario ILIKE ${like} OR n.assunto ILIKE ${like} OR p.nome ILIKE ${like})`);
      }
      const where = filtros.length
        ? sql.join([sql`WHERE`, sql.join(filtros, sql` AND `)], sql` `)
        : sql``;

      const rowsRes: any = await db.execute(sql`
        SELECT n.id, n.canal, n.momento, n.destinatario, n.assunto,
               n.status, n.tentativas, n.criado_em, n.enviado_em,
               n.proxima_tentativa_em, n.erro,
               s.paciente_id, p.nome AS paciente_nome,
               u.nick AS unidade_nick
        FROM assinatura_notificacoes n
        LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
        LEFT JOIN pacientes p ON p.id = s.paciente_id
        LEFT JOIN unidades u ON u.id = p.unidade_id
        ${where}
        ORDER BY n.criado_em DESC, n.id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const totalRes: any = await db.execute(sql`
        SELECT count(*)::int AS total
        FROM assinatura_notificacoes n
        LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
        LEFT JOIN pacientes p ON p.id = s.paciente_id
        ${where}
      `);

      res.json({
        ok: true,
        page,
        pageSize,
        total: (totalRes.rows ?? totalRes)[0]?.total ?? 0,
        rows: rowsRes.rows ?? rowsRes,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

/** Reenfileira uma notificação: status PENDENTE, tentativas=0, próxima_tentativa=now. */
router.post(
  "/admin/notif-assinatura/:id/reenviar",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: "id_invalido" });
      }
      const r: any = await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'PENDENTE',
            tentativas = 0,
            proxima_tentativa_em = NULL,
            erro = NULL,
            enviado_em = NULL,
            resposta_provedor = NULL
        WHERE id = ${id}
        RETURNING id, canal, status
      `);
      const updated = (r.rows ?? r)[0];
      if (!updated) return res.status(404).json({ ok: false, error: "notificacao_nao_encontrada" });
      res.json({ ok: true, reenfileirada: updated });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

/** Lê config global de mensageria (quiet hours). */
router.get(
  "/admin/notif-config",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    try {
      const r: any = await db.execute(sql`
        SELECT id, quiet_inicio::text AS quiet_inicio,
               quiet_fim::text AS quiet_fim,
               tz, habilitar_quiet_hours, atualizado_em
        FROM notif_config WHERE id = 1
      `);
      res.json({ ok: true, config: (r.rows ?? r)[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

/** Atualiza config global de mensageria. */
router.put(
  "/admin/notif-config",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    try {
      const { quiet_inicio, quiet_fim, tz, habilitar_quiet_hours } = req.body ?? {};
      const reHora = /^\d{2}:\d{2}(:\d{2})?$/;
      if (quiet_inicio && !reHora.test(quiet_inicio)) return res.status(400).json({ ok: false, error: "quiet_inicio_invalido" });
      if (quiet_fim && !reHora.test(quiet_fim)) return res.status(400).json({ ok: false, error: "quiet_fim_invalido" });

      await db.execute(sql`
        UPDATE notif_config SET
          quiet_inicio = COALESCE(${quiet_inicio ?? null}::time, quiet_inicio),
          quiet_fim    = COALESCE(${quiet_fim ?? null}::time, quiet_fim),
          tz           = COALESCE(${tz ?? null}, tz),
          habilitar_quiet_hours = COALESCE(${habilitar_quiet_hours ?? null}, habilitar_quiet_hours),
          atualizado_em = NOW()
        WHERE id = 1
      `);
      invalidarCacheNotifConfig();
      const r: any = await db.execute(sql`SELECT id, quiet_inicio::text AS quiet_inicio, quiet_fim::text AS quiet_fim, tz, habilitar_quiet_hours, atualizado_em FROM notif_config WHERE id = 1`);
      res.json({ ok: true, config: (r.rows ?? r)[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

/** Renderiza HTML branded de uma notificação (debug visual do template). */
router.get(
  "/admin/notif-assinatura/preview/:id",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const r: any = await db.execute(sql`
        SELECT n.id, n.canal, n.momento, n.assunto, n.corpo,
               s.paciente_id, p.nome AS paciente_nome, u.nick AS unidade_nick
        FROM assinatura_notificacoes n
        LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
        LEFT JOIN pacientes p ON p.id = s.paciente_id
        LEFT JOIN unidades u ON u.id = p.unidade_id
        WHERE n.id = ${id}
      `);
      const row = (r.rows ?? r)[0];
      if (!row) return res.status(404).send("notificacao_nao_encontrada");
      const optOutUrl = row.paciente_id
        ? `${process.env.PUBLIC_APP_URL || ""}/opt-out?paciente=${row.paciente_id}&canal=email`
        : undefined;
      const html = wrapEmailMedcore({
        subject: row.assunto || "Notificação PAWARDS",
        bodyHtmlOrText: row.corpo || "(sem corpo)",
        momento: (row.momento as MomentoNotif) || undefined,
        pacienteNome: row.paciente_nome || undefined,
        unidadeNick: row.unidade_nick || undefined,
        optOutUrl,
      });
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e) {
      res.status(500).send((e as Error).message);
    }
  }
);

/**
 * Task #45 — Janelas de descanso proprias do CEO (por canal).
 *
 * GET /admin/ceo-notif-preferencias
 *   Retorna as 2 linhas (EMAIL/WHATSAPP) do CEO logado. Se inexistentes,
 *   devolve defaults (habilitar_quiet_hours=false → preserva semantica
 *   atual de "alerta CEO 24/7" enquanto nao configurado).
 *
 * PUT /admin/ceo-notif-preferencias
 *   Body: { canal, quiet_inicio, quiet_fim, tz, habilitar_quiet_hours,
 *           nunca_silenciar_recusa }
 *   Upsert por (usuario_id, canal). Invalida cache em memoria do worker.
 */
router.get(
  "/admin/ceo-notif-preferencias",
  requireAuth,
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId || usuarioId < 0) {
        res.status(400).json({ ok: false, error: "usuario_id_indisponivel" });
        return;
      }
      const r: any = await db.execute(sql`
        SELECT canal, quiet_inicio::text AS quiet_inicio,
               quiet_fim::text AS quiet_fim,
               tz, habilitar_quiet_hours, nunca_silenciar_recusa,
               atualizado_em
        FROM ceo_notif_preferencias
        WHERE usuario_id = ${usuarioId}
      `);
      const rows: any[] = r.rows ?? r ?? [];
      // Garante 2 linhas (EMAIL/WHATSAPP) na resposta — preenche default
      // quando o CEO ainda nao configurou aquele canal.
      const byCanal = new Map<string, any>();
      for (const row of rows) byCanal.set(row.canal, row);
      const preferencias = ["EMAIL", "WHATSAPP"].map((canal) =>
        byCanal.get(canal) ?? {
          canal,
          quiet_inicio: "22:00:00",
          quiet_fim: "07:00:00",
          tz: "America/Sao_Paulo",
          habilitar_quiet_hours: false,
          nunca_silenciar_recusa: true,
          atualizado_em: null,
        },
      );
      res.json({ ok: true, preferencias });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

router.put(
  "/admin/ceo-notif-preferencias",
  requireAuth,
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId || usuarioId < 0) {
        res.status(400).json({ ok: false, error: "usuario_id_indisponivel" });
        return;
      }
      const body = (req.body ?? {}) as {
        canal?: string;
        quiet_inicio?: string;
        quiet_fim?: string;
        tz?: string;
        habilitar_quiet_hours?: boolean;
      };
      const canal = String(body.canal || "").toUpperCase();
      if (canal !== "EMAIL" && canal !== "WHATSAPP") {
        res.status(400).json({ ok: false, error: "canal_invalido" });
        return;
      }
      const reHora = /^\d{2}:\d{2}(:\d{2})?$/;
      const quiet_inicio = body.quiet_inicio ?? "22:00:00";
      const quiet_fim = body.quiet_fim ?? "07:00:00";
      if (!reHora.test(quiet_inicio)) { res.status(400).json({ ok: false, error: "quiet_inicio_invalido" }); return; }
      if (!reHora.test(quiet_fim)) { res.status(400).json({ ok: false, error: "quiet_fim_invalido" }); return; }
      const tz = body.tz ?? "America/Sao_Paulo";
      // Task #45 hardening: tz precisa ser IANA valido — Intl.DateTimeFormat
      // levanta RangeError no worker se tz for invalido, o que abortaria o
      // tick. Validamos aqui via probe pra rejeitar entrada antes de persistir.
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
      } catch {
        res.status(400).json({ ok: false, error: "tz_invalido" });
        return;
      }
      const habilitar = body.habilitar_quiet_hours === true;
      // INVARIANTE Task #45: recusa sempre passa, hard-locked no worker.
      // Coluna `nunca_silenciar_recusa` permanece pra compat de schema mas
      // eh forcada como true aqui — nao expomos como configuravel pra nao
      // permitir um futuro "silenciar recusa" via API.

      await db.execute(sql`
        INSERT INTO ceo_notif_preferencias
          (usuario_id, canal, quiet_inicio, quiet_fim, tz,
           habilitar_quiet_hours, nunca_silenciar_recusa, atualizado_em)
        VALUES (${usuarioId}, ${canal}, ${quiet_inicio}::time, ${quiet_fim}::time,
                ${tz}, ${habilitar}, true, NOW())
        ON CONFLICT (usuario_id, canal) DO UPDATE SET
          quiet_inicio = EXCLUDED.quiet_inicio,
          quiet_fim    = EXCLUDED.quiet_fim,
          tz           = EXCLUDED.tz,
          habilitar_quiet_hours  = EXCLUDED.habilitar_quiet_hours,
          nunca_silenciar_recusa = true,
          atualizado_em = NOW()
      `);
      invalidarCacheCEOPrefs();
      const r: any = await db.execute(sql`
        SELECT canal, quiet_inicio::text AS quiet_inicio,
               quiet_fim::text AS quiet_fim,
               tz, habilitar_quiet_hours, nunca_silenciar_recusa, atualizado_em
        FROM ceo_notif_preferencias
        WHERE usuario_id = ${usuarioId} AND canal = ${canal}
      `);
      res.json({ ok: true, preferencia: (r.rows ?? r)[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

/**
 * Task #249 — Tela pro CEO ver alertas silenciados pela janela de descanso.
 *
 * GET /admin/ceo-notif-preferencias/silenciados
 *   Lista notificacoes do CEO logado que foram pulado pela janela propria
 *   de descanso (erro LIKE 'ceo_quiet_hours:%'). Filtra por destinatario
 *   = email do usuario logado pra evitar vazamento entre validador_mestres.
 *
 * POST /admin/ceo-notif-preferencias/silenciados/:id/liberar
 *   Forca reprocessamento imediato: zera proxima_tentativa_em e marca
 *   PENDENTE. Restrito a notificacoes silenciadas por ceo_quiet_hours
 *   pertencentes ao CEO logado (defesa contra liberar alerta de outro).
 */
router.get(
  "/admin/ceo-notif-preferencias/silenciados",
  requireAuth,
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId || usuarioId < 0) {
        res.status(400).json({ ok: false, error: "usuario_id_indisponivel" });
        return;
      }
      const limit = Math.min(200, Math.max(10, Number(req.query.limit || 100)));
      // Busca notifs onde:
      //  - is_sistema_ceo = true (alerta operacional pro CEO)
      //  - status = 'PULADO_QUIET' (nao-terminal, sera reprocessado)
      //  - erro comeca em 'ceo_quiet_hours:' (foi a janela do CEO, nao a global)
      //  - destinatario casa POR CANAL com o usuario logado:
      //      EMAIL    → lower(usuarios.email) = lower(destinatario)
      //      WHATSAPP → usuarios.telefone     = destinatario
      //    (defesa contra vazamento entre validador_mestres)
      const r: any = await db.execute(sql`
        SELECT n.id, n.canal, n.momento, n.destinatario,
               n.evento_ceo, n.criado_em, n.proxima_tentativa_em,
               n.erro, n.tentativas, n.assunto,
               s.paciente_id, p.nome AS paciente_nome,
               un.nick AS unidade_nick
        FROM assinatura_notificacoes n
        JOIN usuarios usr ON usr.id = ${usuarioId}
        LEFT JOIN assinatura_solicitacoes s ON s.id = n.solicitacao_id
        LEFT JOIN pacientes p ON p.id = s.paciente_id
        LEFT JOIN unidades un ON un.id = p.unidade_id
        WHERE n.is_sistema_ceo = true
          AND n.status = 'PULADO_QUIET'
          AND n.erro LIKE 'ceo_quiet_hours:%'
          AND (
            (n.canal = 'EMAIL'    AND usr.email IS NOT NULL
              AND lower(n.destinatario) = lower(usr.email))
            OR
            (n.canal = 'WHATSAPP' AND usr.telefone IS NOT NULL
              AND n.destinatario = usr.telefone)
          )
        ORDER BY n.proxima_tentativa_em ASC NULLS LAST, n.id DESC
        LIMIT ${limit}
      `);
      res.json({ ok: true, rows: r.rows ?? r ?? [] });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

router.post(
  "/admin/ceo-notif-preferencias/silenciados/:id/liberar",
  requireAuth,
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ ok: false, error: "id_invalido" });
        return;
      }
      const usuarioId = (req as any).user?.id;
      if (!usuarioId || usuarioId < 0) {
        res.status(400).json({ ok: false, error: "usuario_id_indisponivel" });
        return;
      }
      // Restringe a notificacoes do proprio CEO silenciadas pela janela
      // propria — match POR CANAL contra usuarios.email/usuarios.telefone:
      //   EMAIL    → lower(email) = lower(destinatario)
      //   WHATSAPP → telefone     = destinatario
      // Assim um validador_mestre nao consegue liberar alerta que
      // pertence a outro CEO ou que foi pulado por outro motivo.
      const r: any = await db.execute(sql`
        UPDATE assinatura_notificacoes n
        SET status = 'PENDENTE',
            proxima_tentativa_em = NULL,
            erro = NULL
        FROM usuarios usr
        WHERE n.id = ${id}
          AND usr.id = ${usuarioId}
          AND n.is_sistema_ceo = true
          AND n.status = 'PULADO_QUIET'
          AND n.erro LIKE 'ceo_quiet_hours:%'
          AND (
            (n.canal = 'EMAIL'    AND usr.email IS NOT NULL
              AND lower(n.destinatario) = lower(usr.email))
            OR
            (n.canal = 'WHATSAPP' AND usr.telefone IS NOT NULL
              AND n.destinatario = usr.telefone)
          )
        RETURNING n.id, n.canal, n.status
      `);
      const updated = (r.rows ?? r)[0];
      if (!updated) {
        res.status(404).json({ ok: false, error: "notificacao_nao_silenciada_ou_nao_pertence" });
        return;
      }
      res.json({ ok: true, liberada: updated });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  },
);

export default router;
