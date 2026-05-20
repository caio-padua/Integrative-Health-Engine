// Seed da configuracao WhatsApp do CEO no Twilio Sandbox.
// Wave V46.1 — ponte ate a Meta validar o numero oficial.
//
// Pre-requisitos no ambiente (Replit Secrets):
//   - SESSION_SECRET            (ja existe — usado pela criptografia AES-256-GCM)
//   - TWILIO_ACCOUNT_SID        (Twilio Console → Account Info)
//   - TWILIO_AUTH_TOKEN         (Twilio Console → Account Info)
//   - DATABASE_URL              (ja existe)
//
// O numero remetente do Sandbox e fixo: +14155238886.
// O CEO ja precisa ter feito "join contain-stronger" no WhatsApp pra
// receber mensagens fora de template HSM (janela 24h).
//
// Comportamento idempotente: se ja existir uma config com
// numero_remetente=+14155238886, faz UPDATE das credenciais; senao INSERT.
//
// Rodar: pnpm --filter @workspace/scripts run seed-whatsapp-twilio-sandbox

import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { db, whatsappConfigTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const SANDBOX_NUMERO = "+14155238886";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function encryptCredential(plaintext: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET ausente — necessario pra criptografar credenciais.");
  const key = scryptSync(secret, "whatsapp-credentials-salt", 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

async function main(): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error("FALTAM secrets: TWILIO_ACCOUNT_SID e/ou TWILIO_AUTH_TOKEN.");
    console.error("Cadastre nos Replit Secrets e rode de novo.");
    process.exit(1);
  }
  if (!sid.startsWith("AC") || sid.length < 30) {
    console.error("TWILIO_ACCOUNT_SID parece invalido (deve comecar com 'AC' e ter ~34 chars).");
    process.exit(1);
  }

  const accountSidEnc = encryptCredential(sid);
  const authTokenEnc = encryptCredential(token);

  const existente = await db
    .select({ id: whatsappConfigTable.id })
    .from(whatsappConfigTable)
    .where(and(
      eq(whatsappConfigTable.provedor, "TWILIO"),
      eq(whatsappConfigTable.numeroRemetente, SANDBOX_NUMERO),
    ))
    .limit(1);

  if (existente.length > 0) {
    const id = existente[0].id;
    await db
      .update(whatsappConfigTable)
      .set({
        accountSid: accountSidEnc,
        authToken: authTokenEnc,
        ativo: true,
        nomeExibicao: "PADCOM Sandbox",
      })
      .where(eq(whatsappConfigTable.id, id));
    console.log(`[OK] Config WhatsApp Twilio Sandbox atualizada (id=${id}, numero=${SANDBOX_NUMERO}).`);
  } else {
    const [inserted] = await db
      .insert(whatsappConfigTable)
      .values({
        provedor: "TWILIO",
        accountSid: accountSidEnc,
        authToken: authTokenEnc,
        numeroRemetente: SANDBOX_NUMERO,
        nomeExibicao: "PADCOM Sandbox",
        ativo: true,
      })
      .returning({ id: whatsappConfigTable.id });
    console.log(`[OK] Config WhatsApp Twilio Sandbox criada (id=${inserted.id}, numero=${SANDBOX_NUMERO}).`);
  }

  console.log("");
  console.log("Proximo passo: POST /api/whatsapp/teste-ceo (logado como CEO) ou");
  console.log("clicar 'Testar canal CEO' no painel admin pra disparar a mensagem real.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
