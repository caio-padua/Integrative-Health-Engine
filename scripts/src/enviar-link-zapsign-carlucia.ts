// Wave V483.1 — enviar pra Carlucia o link de assinatura ZapSign real
// (solicitacao 257, envelope 8f0eb530-71e6-4525-8750-07876d9331f6).

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string) => Promise<{ sucesso: boolean; provedorMsgId?: string; erro?: string }>;
};

async function main() {
  const sol = ((await db.execute(sql`SELECT id, signatarios_snapshot, metadata FROM assinatura_solicitacoes WHERE id=257`)) as unknown as { rows: Array<{ id: number; signatarios_snapshot: unknown; metadata: { linksAssinatura?: Array<{ email: string; url: string }> } }> }).rows[0]!;
  const pac = ((await db.execute(sql`SELECT nome, whatsapp, telefone FROM pacientes WHERE id=3497`)) as unknown as { rows: Array<{ nome: string; whatsapp: string | null; telefone: string | null }> }).rows[0]!;
  const sigs = ((await db.execute(sql`SELECT papel, nome, email, link_assinatura FROM assinatura_signatarios WHERE solicitacao_id=257`)) as unknown as { rows: Array<{ papel: string; nome: string; email: string | null; link_assinatura: string | null }> }).rows;

  const tel = pac.whatsapp || pac.telefone!;
  const linkPaciente = sigs.find(s => s.papel === "PACIENTE")?.link_assinatura || sol.metadata?.linksAssinatura?.[0]?.url;
  if (!linkPaciente) throw new Error("link de assinatura do paciente nao encontrado");

  const primeiro = pac.nome.split(" ")[0] || pac.nome;
  const corpo = [
    `Ola ${primeiro},`,
    "",
    "Segue tambem o link para assinatura *eletronica oficial* do seu TCLE (Termo de Consentimento Livre e Esclarecido) via ZapSign:",
    "",
    linkPaciente,
    "",
    "Esta assinatura tem validade juridica plena (Lei 14.063/2020) e fica registrada com IP, geolocalizacao, hash do documento e timestamp.",
    "",
    "Voce ja recebeu mais cedo a copia em PDF do RACJ presencial (caminho institucional do Instituto Padua) com os 9 termos consolidados.",
    "",
    "_PAWARDS - Instituto Padua_",
    "_Developed by Pawards MedCore_",
  ].join("\n");

  const r = await wpp.enviarWhatsapp(tel, corpo);
  console.log("[wpp]", r);
  if (!r.sucesso) process.exit(1);
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
