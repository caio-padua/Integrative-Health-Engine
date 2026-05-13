import app from "./app";
import { logger } from "./lib/logger";
import { iniciarWorkerRecorrencia } from "./lib/recorrencia/motorPlanos";
import { iniciarWorkerLembretesPrescricao } from "./services/prescricaoLembreteService";
import { iniciarWorkerCobrancaMensal } from "./lib/recorrencia/cobrancaMensal";
import { iniciarWorkerNotifAssinatura } from "./lib/recorrencia/notifAssinatura";
import { iniciarWorkerParqStatusUpdate } from "./lib/recorrencia/parqStatusUpdate";
import { iniciarWorkerPdfRetryUpload } from "./lib/recorrencia/pdfRetryUpload";
import { iniciarWorkerPdfRetryUploadResumoDiario } from "./lib/recorrencia/pdfRetryUploadResumoDiario";
import { iniciarWorkerVerificarPdfsCofre } from "./lib/recorrencia/verificarPdfsCofre";
import { iniciarWorkerAlertaAssinaturasCEO } from "./lib/recorrencia/alertaAssinaturasCEO";
import { iniciarWorkerAlertaKillSwitchEmailsCEO } from "./lib/recorrencia/alertaKillSwitchEmailsCEO";
import { iniciarWorkerRelatorioDiarioCEO } from "./lib/recorrencia/relatorioDiarioCEO";
import { iniciarWorkerCarenciaLgpd2fa } from "./lib/recorrencia/carenciaLgpd2fa";
import { iniciarWorkerExclusaoCarencia } from "./lib/recorrencia/exclusaoCarenciaExecutor";
import { iniciarWorkerLimpezaTotpRateLimit } from "./lib/recorrencia/limpezaTotpRateLimit";
import { iniciarWorkerAvisoExpiracao2faOwner } from "./lib/recorrencia/avisoExpiracao2faOwner";
import { iniciarWorkerAlertaBruteForceRetryEnvio } from "./lib/recorrencia/alertaBruteForceRetryEnvio";

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
  iniciarWorkerPdfRetryUpload();
  iniciarWorkerPdfRetryUploadResumoDiario();
  iniciarWorkerVerificarPdfsCofre();
  iniciarWorkerAlertaAssinaturasCEO();
  iniciarWorkerAlertaKillSwitchEmailsCEO();
  iniciarWorkerRelatorioDiarioCEO();
  iniciarWorkerCarenciaLgpd2fa();
  iniciarWorkerExclusaoCarencia();
  iniciarWorkerLimpezaTotpRateLimit();
  iniciarWorkerAvisoExpiracao2faOwner();
  iniciarWorkerAlertaBruteForceRetryEnvio();
});
