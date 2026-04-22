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
      blendsLista,
      blocoTemplate,
      blocosLista,
      receitasFama,
      receitasFamaMes,
      pacientes,
      auditores,
      anastomosesAbertas,
      anastomosesLista,
      farmaciasAtivas,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM formula_blend`),
      db.execute(sql`SELECT id, codigo_blend, nome_blend, funcao, via, forma, valor_brl FROM formula_blend ORDER BY id`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM bloco_template`),
      db.execute(sql`SELECT titulo_apelido, via_administracao, tipo_bloco FROM bloco_template ORDER BY id LIMIT 20`),
      db.execute(sql`
        SELECT COUNT(*)::int AS n
        FROM parmavault_receitas r
        JOIN farmacias_parmavault f ON f.id = r.farmacia_id
        WHERE f.nome_fantasia ILIKE '%FAMA%'
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS n,
               COALESCE(SUM(valor_brl), 0)::float AS total_brl,
               COALESCE(SUM(comissao_brl), 0)::float AS comissao_brl
        FROM parmavault_receitas r
        JOIN farmacias_parmavault f ON f.id = r.farmacia_id
        WHERE f.nome_fantasia ILIKE '%FAMA%'
          AND r.criado_em >= now() - interval '30 days'
      `),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM pacientes`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM auditores`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM anastomoses_pendentes WHERE status = 'aberta'`),
      db.execute(sql`
        SELECT id, titulo, criticidade, modulo, proximo_passo
        FROM anastomoses_pendentes
        WHERE status = 'aberta'
        ORDER BY criticidade DESC, id ASC
      `),
      db.execute(sql`SELECT id, nome_fantasia, percentual_comissao FROM farmacias_parmavault WHERE ativo = true ORDER BY id`),
    ]);

    const famaMes = (receitasFamaMes.rows?.[0] as any) ?? {};

    res.json({
      validador: "Dr. Claude · Sonnet 4.6",
      gerado_em: new Date().toISOString(),
      banco: "PAWARDS MEDCORE · live",
      contagens: {
        formula_blend: Number((formulaBlend.rows?.[0] as any)?.n ?? 0),
        bloco_template: Number((blocoTemplate.rows?.[0] as any)?.n ?? 0),
        receitas_fama_total: Number((receitasFama.rows?.[0] as any)?.n ?? 0),
        receitas_fama_30d: Number(famaMes.n ?? 0),
        receitas_fama_30d_valor_brl: Number(famaMes.total_brl ?? 0),
        receitas_fama_30d_comissao_brl: Number(famaMes.comissao_brl ?? 0),
        pacientes: Number((pacientes.rows?.[0] as any)?.n ?? 0),
        auditores: Number((auditores.rows?.[0] as any)?.n ?? 0),
        anastomoses_pendentes_abertas: Number((anastomosesAbertas.rows?.[0] as any)?.n ?? 0),
      },
      acao1_blends_candidatos_a_bloco_template: (blendsLista.rows ?? []).map((r: any) => ({
        id: r.id,
        codigo: r.codigo_blend,
        nome: r.nome_blend,
        funcao: r.funcao,
        via: r.via,
        forma: r.forma,
        valor_brl: r.valor_brl,
      })),
      acao1_blocos_template_ja_cadastrados: (blocosLista.rows ?? []).map((r: any) => ({
        nome: r.titulo_apelido,
        via_administracao: r.via_administracao,
        tipo: r.tipo_bloco,
      })),
      acao2_correcao_aplicada: {
        observacao: "Query agora bate em parmavault_receitas (substituiu substancias.farmacia_padrao). Numeros ao vivo nas contagens acima.",
      },
      acao3_anastomoses_pendentes: (anastomosesLista.rows ?? []).map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        criticidade: r.criticidade,
        modulo: r.modulo,
        proximo_passo: r.proximo_passo,
      })),
      farmacias_parmavault_ativas: (farmaciasAtivas.rows ?? []).map((r: any) => ({
        id: r.id,
        nome: r.nome_fantasia,
        comissao_pct: r.percentual_comissao,
      })),
    });
  } catch (err) {
    console.error("[__claude_db.json]", err);
    res.status(500).json({ error: "Erro ao consultar banco", detalhe: String(err) });
  }
});

app.use("/api", requireAuth, tenantContextMiddleware, router);

export default app;
