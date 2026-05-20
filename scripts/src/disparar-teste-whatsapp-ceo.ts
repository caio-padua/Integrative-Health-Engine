// Disparo manual de teste pro WhatsApp do CEO via Twilio Sandbox.
// Bypassa a rota HTTP (que exige sessao admin) e chama enviarWhatsapp
// direto. Use SO em ambiente controlado pra fechamento de canal.
//
// Comando: pnpm --filter @workspace/scripts run disparar-teste-whatsapp-ceo

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main(): Promise<void> {
  const res = await db.execute(sql`SELECT id, nome, telefone FROM usuarios WHERE id=1 LIMIT 1`);
  const row = (res as { rows: Array<{ id: number; nome: string; telefone: string | null }> }).rows[0];
  if (!row || !row.telefone) {
    console.error("CEO sem telefone cadastrado.");
    process.exit(1);
  }

  const { enviarWhatsapp } = await import("../../artifacts/api-server/src/services/whatsappService.js" as string) as {
    enviarWhatsapp: (telefone: string, mensagem: string, opts?: Record<string, unknown>) => Promise<{ sucesso: boolean; erro?: string; messageId?: string }>;
  };

  const mensagem = `[PAWARDS] Teste de canal CEO via Twilio Sandbox. Se voce esta lendo, o canal WhatsApp esta funcional. Hora: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`;

  console.log(`Disparando WhatsApp pro CEO ${row.nome} (${row.telefone})...`);
  const r = await enviarWhatsapp(row.telefone, mensagem);
  console.log("Resultado:", JSON.stringify(r, null, 2));
  process.exit(r.sucesso ? 0 : 1);
}

main().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
