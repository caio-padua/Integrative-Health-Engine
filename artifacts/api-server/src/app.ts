import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { tenantContextMiddleware } from "./middlewares/tenantContext";
import { requireAuth } from "./middlewares/requireAuth";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Stripe webhook precisa do raw body para validar assinatura — DEVE vir antes do express.json
app.use(
  "/api/payments/webhooks/stripe",
  express.raw({ type: "application/json" }),
);
// Webhooks Clicksign + ZapSign tambem usam raw body para HMAC SHA-256
app.use("/api/webhooks/assinatura/clicksign", express.raw({ type: "*/*" }));
app.use("/api/webhooks/assinatura/zapsign",   express.raw({ type: "*/*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// =============================================================================
// /__claude_db.json — endpoint PÚBLICO read-only para validacao do Dr. Claude.
// Expoe apenas contagens agregadas + 20 nomes de blocos de prescricao.
// SEM autenticacao por design — nao retorna PII de paciente.
// =============================================================================
app.get(["/__claude_db.json", "/api/__claude_db.json"], async (_req, res) => {
  try {
    const [
      formulaBlend,
      blocoTemplate,
      blocosLista,
      magistraisFama,
      pacientes,
      auditores,
      anastomosesAbertas,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM formula_blend`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM bloco_template`),
      db.execute(sql`SELECT titulo_apelido, via_administracao, tipo_bloco FROM bloco_template ORDER BY id LIMIT 20`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM substancias WHERE farmacia_padrao = 'FAMA'`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM pacientes`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM auditores`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM anastomoses_pendentes WHERE status = 'aberta'`),
    ]);

    res.json({
      validador: "Dr. Claude · Sonnet 4.6",
      gerado_em: new Date().toISOString(),
      banco: "PAWARDS MEDCORE · live",
      contagens: {
        formula_blend: Number((formulaBlend.rows?.[0] as any)?.n ?? 0),
        bloco_template: Number((blocoTemplate.rows?.[0] as any)?.n ?? 0),
        substancias_magistrais_fama: Number((magistraisFama.rows?.[0] as any)?.n ?? 0),
        pacientes: Number((pacientes.rows?.[0] as any)?.n ?? 0),
        auditores: Number((auditores.rows?.[0] as any)?.n ?? 0),
        anastomoses_pendentes_abertas: Number((anastomosesAbertas.rows?.[0] as any)?.n ?? 0),
      },
      blocos_prescricao_amostra: (blocosLista.rows ?? []).map((r: any) => ({
        nome: r.titulo_apelido,
        via_administracao: r.via_administracao,
        tipo: r.tipo_bloco,
      })),
    });
  } catch (err) {
    console.error("[__claude_db.json]", err);
    res.status(500).json({ error: "Erro ao consultar banco", detalhe: String(err) });
  }
});

app.use("/api", requireAuth, tenantContextMiddleware, router);

export default app;
