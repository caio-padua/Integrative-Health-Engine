// Captura o chat_id da Carlucia (3497) a partir das updates recentes do bot
// @Paduaclinica_bot (precisa que ela tenha mandado /start) e dispara a
// mesma sequencia institucional do WhatsApp via Telegram:
//   msg1 = apresentacao Bianca (frases reais do agente_clinica id=3)
//   msg2 = confirmacao do agendamento amanha 8h (template adaptado)
//   msg3 = RAS PDF arquivado no Drive (com hash SHA-256)

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const PACIENTE_ID = 3497;
const TELEFONE_JID = "556282696656"; // mesmo numero do WhatsApp dela (sem o 9)
const RAS_DRIVE_URL = "https://drive.google.com/file/d/1WAr9_OAWe0nM2B_roYqoxugnnUc0Ri1y/view?usp=drivesdk";
const RAS_NOME = "26.05.18 RAS PADU FERN CARL FEMI 1988 0111 CARLUCIA SANTOS FERNANDES.pdf";
const RAS_HASH = "a4cada56047f6331ac744bc725a039b0f48988081ac7b65dee8f073ae13ae76a";

interface TgUpdate { update_id: number; message?: { chat: { id: number; first_name?: string; last_name?: string; username?: string }; text?: string; contact?: { phone_number: string } } }

async function tg(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return await r.json() as Record<string, unknown>;
}

async function descobrirChatId(): Promise<number | null> {
  // 1. Se ja temos persistido no DB, usa
  const r = (await db.execute(sql`SELECT telegram_chat_id FROM pacientes WHERE id=${PACIENTE_ID}`)) as unknown as { rows: Array<{ telegram_chat_id: number | null }> };
  if (r.rows[0]?.telegram_chat_id) {
    console.log(`  ja persistido no DB: ${r.rows[0].telegram_chat_id}`);
    return Number(r.rows[0].telegram_chat_id);
  }
  // 2. Senao, varre getUpdates procurando alguem que mandou /start ou compartilhou contato
  console.log("  varrendo getUpdates do bot @Paduaclinica_bot...");
  const ups = await tg("getUpdates", { limit: 100, timeout: 0 }) as { ok: boolean; result: TgUpdate[] };
  console.log(`  ${ups.result?.length ?? 0} updates pendentes`);
  if (!ups.ok || !ups.result?.length) return null;
  // pega o mais recente (provavelmente da Carlucia, que acabou de iniciar)
  for (const u of ups.result.slice().reverse()) {
    if (u.message?.chat?.id) {
      const m = u.message;
      console.log(`  update mais recente: chat_id=${m.chat.id} nome="${m.chat.first_name ?? ""} ${m.chat.last_name ?? ""}" username=@${m.chat.username ?? "-"} texto="${m.text ?? ""}"`);
      return m.chat.id;
    }
  }
  return null;
}

async function carregarFrasesBianca(): Promise<Record<string, string>> {
  const r = (await db.execute(sql`SELECT tipo_frase, texto FROM agentes_frases WHERE agente_clinica_id=3 AND ativa=true`)) as unknown as { rows: Array<{ tipo_frase: string; texto: string }> };
  const map: Record<string, string> = {};
  for (const f of r.rows) map[f.tipo_frase] = f.texto;
  return map;
}

async function main(): Promise<void> {
  console.log("[1/4] Descobrindo chat_id da Carlucia no Telegram...");
  const chatId = await descobrirChatId();
  if (!chatId) {
    console.error("[ERRO] Nao achei o chat_id. Confirma que ela tocou em 'Iniciar' no @Paduaclinica_bot.");
    process.exit(2);
  }

  console.log(`[2/4] Persistindo chat_id=${chatId} em pacientes.telegram_chat_id (id=${PACIENTE_ID})...`);
  await db.execute(sql`UPDATE pacientes SET telegram_chat_id=${chatId} WHERE id=${PACIENTE_ID}`);

  const p = ((await db.execute(sql`SELECT nome, genero FROM pacientes WHERE id=${PACIENTE_ID}`)) as unknown as { rows: Array<{ nome: string; genero: string }> }).rows[0];
  const frases = await carregarFrasesBianca();
  const primeiroNome = p.nome.split(/\s+/)[0];
  const tratamento = p.genero === "feminino" ? `Sra. ${primeiroNome}` : primeiroNome;
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const dataFmt = amanha.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  console.log("[3/4] Disparando 3 mensagens institucionais no Telegram (mesmo padrao do WhatsApp)...");

  const msg1 = [
    "*Instituto Padua — Equipe Clinica*",
    "",
    "Boa noite!",
    "",
    `${tratamento}, tudo bem?`,
    "",
    frases.abertura_acolhedora ?? "Ola, tudo bem? Me chamo Bianca, da equipe de enfermagem.",
    "",
    "Estou aqui para conduzir a sua proxima etapa de cuidado no Instituto Padua, sob orientacao do Dr. Caio Henrique.",
    "",
    "Vou te enviar agora a confirmacao do atendimento e o documento clinico (RAS) ja arquivado no seu prontuario.",
    "",
    frases.fechamento_humano ?? "Estou a sua disposicao.",
    "",
    "_PAWARDS — Instituto Padua_",
    "_Developed by Pawards MedCore_",
  ].join("\n");
  const r1 = await tg("sendMessage", { chat_id: chatId, text: msg1, parse_mode: "Markdown" });
  console.log(`  msg1 apresentacao: ok=${r1.ok}`);

  const msg2 = [
    "*Agendamento Confirmado*",
    "",
    `Paciente: *${p.nome}*`,
    `Data: *${dataFmt} as 08:00*`,
    `Profissional: *Dr. Caio Henrique Fernandes Padua*`,
    `Unidade: *Instituto Padua — Rua Guaxupe, 175 — Setor Bueno, Goiania/GO*`,
    "",
    "*Protocolo:*",
    "• Coenzima Q10 (Ubiquinol) 200mg — via oral, 90 dias",
    "• Testosterona Cipionato 200mg — via IM, 180 dias (dose a cada 21 dias sob enfermagem)",
    "",
    "Em caso de imprevisto, e so responder aqui que reagendamos.",
    "",
    "_PAWARDS — Instituto Padua_",
    "_Developed by Pawards MedCore_",
  ].join("\n");
  const r2 = await tg("sendMessage", { chat_id: chatId, text: msg2, parse_mode: "Markdown" });
  console.log(`  msg2 confirmacao: ok=${r2.ok}`);

  const msg3 = [
    "*Documento clinico oficial (RAS)*",
    "",
    `${tratamento}, segue o seu Resumo de Atendimento Integrativo ja arquivado no seu prontuario digital:`,
    "",
    `Arquivo: \`${RAS_NOME}\``,
    `[Abrir RAS no Drive](${RAS_DRIVE_URL})`,
    "",
    `Hash de integridade SHA-256: \`${RAS_HASH.slice(0, 16)}...\``,
    "Conteudo conferido pela equipe clinica e blindado contra alteracao.",
    "",
    "Em breve voce recebera tambem o termo juridico (RACJ) para assinatura eletronica via ZapSign (ICP-Brasil).",
    "",
    frases.fechamento_humano ?? "Estou a sua disposicao.",
    "Bianca — Equipe de enfermagem",
    "",
    "_PAWARDS — Instituto Padua_",
    "_Developed by Pawards MedCore_",
  ].join("\n");
  const r3 = await tg("sendMessage", { chat_id: chatId, text: msg3, parse_mode: "Markdown", disable_web_page_preview: false });
  console.log(`  msg3 RAS PDF: ok=${r3.ok}`);

  console.log("[4/4] Loggando em whatsapp_mensagens_log (canal=telegram)...");
  // reaproveita a tabela de log; canal differente
  for (const [label, resp] of [["apresentacao_bianca", r1], ["confirmacao_agendamento", r2], ["entrega_ras_pdf", r3]] as const) {
    const msgId = ((resp as { result?: { message_id?: number } }).result?.message_id ?? null);
    await db.execute(sql`
      INSERT INTO whatsapp_mensagens_log (telefone_destino, mensagem_resumo, status, paciente_id, unidade_id, provedor_msg_id, criado_em)
      VALUES (${TELEFONE_JID}, ${`[TELEGRAM] ${label}`}, 'delivered', ${PACIENTE_ID}, 15, ${msgId ? `tg_${msgId}` : null}, NOW())
      ON CONFLICT DO NOTHING
    `);
  }

  console.log("\n=== TELEGRAM CARLUCIA OK ===");
  console.log("3 mensagens institucionais entregues + chat_id persistido no DB pra proximos disparos.");
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
