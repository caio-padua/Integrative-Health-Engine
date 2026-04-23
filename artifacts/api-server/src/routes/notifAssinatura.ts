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
import { tickNotifAssinatura, invalidarCacheNotifConfig } from "../lib/recorrencia/notifAssinatura";
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

export default router;
