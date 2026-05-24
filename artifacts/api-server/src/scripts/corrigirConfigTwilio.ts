/**
 * Sobrescreve whatsapp_config #4 com credenciais corretas do env.
 * Roda: tsx artifacts/api-server/src/scripts/corrigirConfigTwilio.ts
 */
import { db, pool, whatsappConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encryptCredential } from "../services/credentialEncryption";

async function main() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID/AUTH_TOKEN ausentes no env");
  if (!sid.startsWith("AC")) throw new Error(`TWILIO_ACCOUNT_SID invalido (precisa comecar com AC): ${sid.slice(0, 6)}...`);

  await db.update(whatsappConfigTable)
    .set({
      accountSid: encryptCredential(sid),
      authToken: encryptCredential(token),
      numeroRemetente: "+14155238886",
      provedor: "TWILIO",
      ativo: true,
    })
    .where(eq(whatsappConfigTable.id, 4));

  console.log("[corrigir-config] whatsapp_config #4 atualizado com SID/token do env");
  await pool.end();
}

main().catch(async (err) => {
  console.error("[corrigir-config] ERRO:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
