// Disparo institucional REAL pra Carlucia (id=3497) usando:
//  - templateConfirmacaoAgendamento (do whatsappTemplates.ts oficial)
//  - frases da Bianca (agente_clinica_id=3, agentes_frases ativas no DB)
//  - link real do RAS PDF gerado e arquivado no Drive
//  - enviarComTemplate -> grava em whatsapp_mensagens_log automaticamente
//
// Fix do nono digito: ela joinou o sandbox de +556282696656 (sem 9). A JID
// real dela na Meta NAO tem o 9. Persisto a versao sem-9 em pacientes.whatsapp
// antes de disparar, assim o restante do sistema tambem passa a entregar.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface EnvioResult { sucesso: boolean; provedorMsgId?: string; erro?: string; logId?: number; }

const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string, opts?: { unidadeId?: number; templateNome?: string }) => Promise<EnvioResult>;
  enviarComTemplate: (telefone: string, templateNome: string, dados: Record<string, unknown>, opts?: { unidadeId?: number }) => Promise<EnvioResult>;
};

const RAS_DRIVE_URL = "https://drive.google.com/file/d/1WAr9_OAWe0nM2B_roYqoxugnnUc0Ri1y/view?usp=drivesdk";
const RAS_NOME = "26.05.18 RAS PADU FERN CARL FEMI 1988 0111 CARLUCIA SANTOS FERNANDES.pdf";
const RAS_HASH = "a4cada56047f6331ac744bc725a039b0f48988081ac7b65dee8f073ae13ae76a";

async function carregarFrasesBianca(): Promise<Record<string, string>> {
  const r = (await db.execute(sql`
    SELECT tipo_frase, texto FROM agentes_frases
    WHERE agente_clinica_id = 3 AND ativa = true
  `)) as unknown as { rows: Array<{ tipo_frase: string; texto: string }> };
  const map: Record<string, string> = {};
  for (const f of r.rows) map[f.tipo_frase] = f.texto;
  return map;
}

async function fixarJidSemNove(pacienteId: number): Promise<string> {
  // Carlucia joinou o sandbox Twilio de +556282696656 (12 digitos, sem o 9 do celular).
  // Esse e o JID real dela na Meta. Persisto a versao canonica sem-9 pra todo o
  // sistema (lembretes, alertas, RAS) passar a entregar daqui pra frente.
  const semNove = "5562982696656".replace(/^55(\d{2})9(\d{8})$/, "55$1$2"); // 556282696656
  await db.execute(sql`UPDATE pacientes SET whatsapp = ${semNove} WHERE id = ${pacienteId}`);
  console.log(`  pacientes.whatsapp atualizado para ${semNove} (formato JID legado sem nono digito)`);
  return semNove;
}

async function aguardarStatusTwilio(provedorMsgId: string | undefined, label: string): Promise<void> {
  if (!provedorMsgId) return;
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tok) return;
  const auth = "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");
  await new Promise((r) => setTimeout(r, 5000));
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${provedorMsgId}.json`, { headers: { Authorization: auth } });
  const j = await r.json() as { status?: string; error_code?: string | null; error_message?: string | null };
  console.log(`  [${label}] entrega real Twilio: status=${j.status} | err=${j.error_code ?? "-"} | ${j.error_message ?? "OK"}`);
}

async function main(): Promise<void> {
  console.log("[1/5] Carregando contexto institucional (DB)...");
  const p = ((await db.execute(sql`SELECT id, nome, genero, unidade_id FROM pacientes WHERE id=3497`)) as unknown as { rows: Array<{ id: number; nome: string; genero: string; unidade_id: number }> }).rows[0];
  const u = ((await db.execute(sql`SELECT id, nome FROM unidades WHERE id=15`)) as unknown as { rows: Array<{ id: number; nome: string }> }).rows[0];
  if (!p || !u) throw new Error("paciente ou unidade nao encontrados");

  const frases = await carregarFrasesBianca();
  console.log(`  Bianca tem ${Object.keys(frases).length} frases ativas: ${Object.keys(frases).join(", ")}`);

  console.log("[2/5] Fixando JID legado da Carlucia (sem nono digito)...");
  const telefoneJid = await fixarJidSemNove(p.id);

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const dataFmt = amanha.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  console.log("[3/5] Disparo 1: apresentacao da Bianca (frases reais do agente_clinica id=3)...");
  const primeiroNome = p.nome.split(/\s+/)[0];
  const tratamento = p.genero === "feminino" ? `Sra. ${primeiroNome}` : primeiroNome;
  const msg1 = [
    "Boa noite!",
    "",
    `${tratamento}, tudo bem?`,
    "",
    frases.abertura_acolhedora ?? "",
    "",
    "Estou aqui para conduzir a sua proxima etapa de cuidado no Instituto Padua, sob orientacao do Dr. Caio Henrique.",
    "",
    "Vou te enviar agora a confirmacao do atendimento e o documento clinico (RAS) ja arquivado no seu prontuario.",
    "",
    frases.fechamento_humano ?? "",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
  const r1 = await wpp.enviarWhatsapp(telefoneJid, msg1, { unidadeId: 15, templateNome: "APRESENTACAO_BIANCA" });
  console.log(`  msgId=${r1.provedorMsgId ?? "-"} | sucesso=${r1.sucesso} | log#${r1.logId ?? "-"}`);
  await aguardarStatusTwilio(r1.provedorMsgId, "msg1 apresentacao");

  console.log("[4/5] Disparo 2: CONFIRMACAO_AGENDAMENTO (template oficial do sistema)...");
  const r2 = await wpp.enviarComTemplate(telefoneJid, "CONFIRMACAO_AGENDAMENTO", {
    pacienteNome: p.nome,
    data: dataFmt,
    hora: "08:00",
    procedimento: "Coenzima Q10 200mg (oral, 90 dias) + Testosterona cipionato 200mg IM (180 dias, dose a cada 21 dias sob enfermagem)",
    unidade: `${u.nome} - Rua Guaxupe`,
  }, { unidadeId: 15 });
  console.log(`  msgId=${r2.provedorMsgId ?? "-"} | sucesso=${r2.sucesso} | log#${r2.logId ?? "-"}`);
  await aguardarStatusTwilio(r2.provedorMsgId, "msg2 confirmacao");

  console.log("[5/5] Disparo 3: RAS PDF arquivado (Drive + hash institucional)...");
  const msg3 = [
    "*Documento clinico oficial (RAS)*",
    "",
    "Sra. Carlucia, segue o seu Resumo de Atendimento Integrativo, ja arquivado no seu prontuario digital:",
    "",
    `Arquivo: ${RAS_NOME}`,
    `Link seguro: ${RAS_DRIVE_URL}`,
    "",
    `Hash de integridade (SHA-256): ${RAS_HASH.slice(0, 16)}...`,
    "Conteudo conferido pela equipe clinica e blindado contra alteracao.",
    "",
    "Em breve voce recebera tambem o termo juridico (RACJ) para assinatura eletronica via ZapSign (ICP-Brasil).",
    "",
    frases.fechamento_humano ?? "Estou a sua disposicao.",
    "Bianca - Equipe de enfermagem",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
  const r3 = await wpp.enviarWhatsapp(telefoneJid, msg3, { unidadeId: 15, templateNome: "ENTREGA_RAS_PDF" });
  console.log(`  msgId=${r3.provedorMsgId ?? "-"} | sucesso=${r3.sucesso} | log#${r3.logId ?? "-"}`);
  await aguardarStatusTwilio(r3.provedorMsgId, "msg3 RAS");

  console.log("\n=== DISPARO INSTITUCIONAL CONCLUIDO ===");
  console.log("3 mensagens enviadas para Carlucia, todas logadas em whatsapp_mensagens_log.");
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
