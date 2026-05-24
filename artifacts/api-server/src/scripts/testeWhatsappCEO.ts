/**
 * TESTE WHATSAPP CEO — disparo único pra validar canal Twilio Sandbox.
 * Roda: tsx artifacts/api-server/src/scripts/testeWhatsappCEO.ts
 */
import { pool } from "@workspace/db";
import { enviarWhatsapp } from "../services/whatsappService";

const TELEFONE_CEO = "+5511977154000";

async function main() {
  const msg =
    `Olá, Caio! Aqui é o canal WhatsApp do PAWARDS via Twilio.\n\n` +
    `Se você está lendo isso, a integração funcionou: credenciais OK, ` +
    `roteamento OK, log no banco OK.\n\n` +
    `Próximo passo: aprovar número próprio no Meta pra sair do Sandbox.\n\n` +
    `Equipe PAWARDS · Motor Clínico`;

  console.log("[teste-whatsapp-ceo] Disparando pra", TELEFONE_CEO);
  const r = await enviarWhatsapp(TELEFONE_CEO, msg);
  console.log(`[teste-whatsapp-ceo] Resultado: ${r.sucesso ? "ENVIADO ✓" : "FALHOU ✗"}`);
  if (r.erro) console.log(`[teste-whatsapp-ceo] Erro: ${r.erro}`);
  if (r.provedorMsgId) console.log(`[teste-whatsapp-ceo] MsgId Twilio: ${r.provedorMsgId}`);
  await pool.end();
  process.exit(r.sucesso ? 0 : 1);
}

main().catch(async (err) => {
  console.error("[teste-whatsapp-ceo] ERRO:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
