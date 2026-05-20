// Demo end-to-end Carlucia Santos Fernandes (paciente real Padua id=3497).
// Sequencia: WhatsApp confirmacao -> WhatsApp pro CEO.
// RAS PDF + Drive sao etapa 2 (script separado se der tempo).

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
interface EnvioResult {
  sucesso: boolean;
  erro?: string;
  provedorMsgId?: string;
  logId?: number;
}

const mod = await import("../../artifacts/api-server/src/services/whatsappService.js" as string) as {
  enviarWhatsapp: (telefone: string, mensagem: string, opts?: Record<string, unknown>) => Promise<EnvioResult>;
};
const enviar = mod.enviarWhatsapp;

async function main(): Promise<void> {
  const pacRes = await db.execute(sql`SELECT id, nome, whatsapp, codigo_semantico FROM pacientes WHERE id=3497 LIMIT 1`);
  const pac = (pacRes as { rows: Array<{ id: number; nome: string; whatsapp: string; codigo_semantico: string }> }).rows[0];
  if (!pac) throw new Error("Carlucia (id=3497) nao encontrada");

  const ceoRes = await db.execute(sql`SELECT id, nome, telefone FROM usuarios WHERE id=1 LIMIT 1`);
  const ceo = (ceoRes as { rows: Array<{ id: number; nome: string; telefone: string }> }).rows[0];

  const dataAmanha = new Date();
  dataAmanha.setDate(dataAmanha.getDate() + 1);
  dataAmanha.setHours(8, 0, 0, 0);
  const dataFmt = dataAmanha.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // 1. WhatsApp pra Carlucia
  const msgPac = `Ola ${pac.nome.split(" ")[0]}, sua consulta esta CONFIRMADA:\n\n` +
    `Data: ${dataFmt}\n` +
    `Local: Instituto Padua - Rua Guaxupe\n` +
    `Profissional: Dr. Caio Henrique Fernandes Padua + equipe de enfermagem\n` +
    `Protocolo discutido: Coenzima Q10 + Testosterona\n\n` +
    `Codigo do prontuario: ${pac.codigo_semantico}\n\n` +
    `Em caso de necessidade de reagendamento, responda esta mensagem.\n\n` +
    `PAWARDS - PADCON - MEDCORE`;

  console.log(`[1/2] Disparando WhatsApp pra ${pac.nome} (+${pac.whatsapp})...`);
  const r1 = await enviar(`+${pac.whatsapp}`, msgPac);
  console.log("  Resultado:", JSON.stringify(r1));
  if (!r1.sucesso) {
    console.error("  [FALHA] WhatsApp paciente nao enviado. Abortando.");
    process.exit(1);
  }

  // 2. WhatsApp pro CEO
  const msgCeo = `[PAWARDS] Nova consulta criada via sistema:\n\n` +
    `Paciente: ${pac.nome}\n` +
    `Codigo: ${pac.codigo_semantico}\n` +
    `Data: ${dataFmt}\n` +
    `Local: Instituto Padua - Rua Guaxupe\n` +
    `Protocolo: Coenzima Q10 + Testosterona\n\n` +
    `Confirmacao WhatsApp paciente: enviada (msgId ${r1.provedorMsgId})\n` +
    `RAS PDF + Drive: proximo passo`;

  console.log(`[2/2] Disparando WhatsApp pro CEO ${ceo.nome} (${ceo.telefone})...`);
  const r2 = await enviar(ceo.telefone, msgCeo);
  console.log("  Resultado:", JSON.stringify(r2));

  console.log("\n=== RESUMO ===");
  console.log(`Carlucia: ${r1.sucesso ? "OK" : "FALHA"} (msgId ${r1.provedorMsgId ?? "-"})`);
  console.log(`CEO: ${r2.sucesso ? "OK" : "FALHA"} (msgId ${r2.provedorMsgId ?? "-"})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
