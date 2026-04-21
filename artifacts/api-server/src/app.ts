import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { tenantContextMiddleware } from "./middlewares/tenantContext";
import { requireAuth } from "./middlewares/requireAuth";
import { logger } from "./lib/logger";

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

app.use("/api", requireAuth, tenantContextMiddleware, router);

export default app;
