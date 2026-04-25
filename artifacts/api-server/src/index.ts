import app from "./app";
import { logger } from "./lib/logger";
import { iniciarWorkerRecorrencia } from "./lib/recorrencia/motorPlanos";
import { iniciarWorkerLembretesPrescricao } from "./services/prescricaoLembreteService";
import { iniciarWorkerCobrancaMensal } from "./lib/recorrencia/cobrancaMensal";
import { iniciarWorkerNotifAssinatura } from "./lib/recorrencia/notifAssinatura";
import { iniciarWorkerParqStatusUpdate } from "./lib/recorrencia/parqStatusUpdate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  iniciarWorkerRecorrencia();
  iniciarWorkerLembretesPrescricao();
  iniciarWorkerCobrancaMensal();
  iniciarWorkerNotifAssinatura();
  iniciarWorkerParqStatusUpdate();
});
