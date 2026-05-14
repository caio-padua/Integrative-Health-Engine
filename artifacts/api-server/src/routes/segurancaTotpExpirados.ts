/**
 * Task #160 — Painel CEO · Bloqueios 2FA expirados por dia
 *
 * GET /api/admin/seguranca/totp-bloqueios-expirados
 *   Auth: requireAuth + requireRole('admin','consultoria_master','validador_mestre')
 *   Query: ?dias=30 (default 30, max 180)
 *   Retorna:
 *     {
 *       dias: number,
 *       serie: [{ dia, totalRemovidas, ticksExecutados, ultimaEm }],
 *       hoje:  { dia, totalRemovidas, ticksExecutados } | null,
 *       mediaHistorica: number,        // media diaria dos `dias` (excl. hoje)
 *       desvioPadrao:   number,        // populacional, mesmo recorte
 *       anomalia: {
 *         hojeAcimaDaMedia: boolean,
 *         razaoVsMedia:     number,    // hoje / media (0 se media=0)
 *         zScoreHoje:       number,    // (hoje - media) / desvio (0 se sigma=0)
 *         flag: 'NORMAL' | 'ATENCAO' | 'ANOMALIA'
 *       }
 *     }
 *
 * Fonte: tabela `totp_rate_limit_limpezas_diarias` (Migration 052),
 * alimentada pelo worker `limpezaTotpRateLimit` (Task #151) a cada tick.
 */
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

interface LinhaSerie {
  dia: string;
  totalRemovidas: number;
  ticksExecutados: number;
  ultimaEm: string | null;
}

router.get(
  "/admin/seguranca/totp-bloqueios-expirados",
  requireAuth,
  requireRole("admin", "consultoria_master", "validador_mestre"),
  async (req: Request, res: Response) => {
    try {
      const diasRaw = Number(req.query["dias"] ?? 30);
      const dias = Number.isFinite(diasRaw)
        ? Math.min(180, Math.max(1, Math.trunc(diasRaw)))
        : 30;

      const r: any = await db.execute(sql`
        SELECT dia_brt::text          AS dia,
               total_removidas        AS total_removidas,
               ticks_executados       AS ticks_executados,
               ultima_em::text        AS ultima_em
          FROM totp_rate_limit_limpezas_diarias
         WHERE dia_brt >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date
                           - (${dias - 1} || ' days')::interval)
         ORDER BY dia_brt DESC
      `);
      const rows = (r.rows ?? r) as Array<{
        dia: string;
        total_removidas: number | string;
        ticks_executados: number | string;
        ultima_em: string | null;
      }>;

      const serie: LinhaSerie[] = rows.map((row) => ({
        dia: row.dia,
        totalRemovidas: Number(row.total_removidas ?? 0),
        ticksExecutados: Number(row.ticks_executados ?? 0),
        ultimaEm: row.ultima_em ?? null,
      }));

      const hojeIso = await db.execute(sql`
        SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS hoje
      `);
      const hojeStr = String(
        ((hojeIso.rows ?? hojeIso) as Array<{ hoje: string }>)[0]?.hoje ?? "",
      );
      const hoje = serie.find((l) => l.dia === hojeStr) ?? null;

      const historico = serie.filter((l) => l.dia !== hojeStr);
      const media =
        historico.length > 0
          ? historico.reduce((acc, l) => acc + l.totalRemovidas, 0) /
            historico.length
          : 0;
      const variancia =
        historico.length > 0
          ? historico.reduce(
              (acc, l) => acc + (l.totalRemovidas - media) ** 2,
              0,
            ) / historico.length
          : 0;
      const desvio = Math.sqrt(variancia);

      const hojeTotal = hoje?.totalRemovidas ?? 0;
      const razaoVsMedia = media > 0 ? hojeTotal / media : 0;
      const zScoreHoje = desvio > 0 ? (hojeTotal - media) / desvio : 0;

      // Heuristica conservadora pra flag — evita falso-positivo em volume
      // baixo (hoje so vira ANOMALIA se passou de 10 remocoes E ficou >= 3
      // sigmas acima da media OU pelo menos 3x a media).
      let flag: "NORMAL" | "ATENCAO" | "ANOMALIA" = "NORMAL";
      if (hojeTotal >= 10 && (zScoreHoje >= 3 || razaoVsMedia >= 3)) {
        flag = "ANOMALIA";
      } else if (hojeTotal >= 5 && (zScoreHoje >= 2 || razaoVsMedia >= 2)) {
        flag = "ATENCAO";
      }

      res.json({
        dias,
        serie,
        hoje,
        mediaHistorica: Number(media.toFixed(2)),
        desvioPadrao: Number(desvio.toFixed(2)),
        anomalia: {
          hojeAcimaDaMedia: hojeTotal > media,
          razaoVsMedia: Number(razaoVsMedia.toFixed(2)),
          zScoreHoje: Number(zScoreHoje.toFixed(2)),
          flag,
        },
      });
    } catch (e) {
      const msg = (e as Error).message;
      req.log?.error(
        { err: msg },
        "[seguranca/totp-bloqueios-expirados] erro",
      );
      res.status(500).json({ erro: msg });
    }
  },
);

export default router;
