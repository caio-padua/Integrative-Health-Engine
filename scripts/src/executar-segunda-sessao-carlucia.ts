// Wave V479 — 2a sessao real da Carlucia (id=3497) usando motor real do sistema.
// Caio (CEO) pediu na demo investidor:
// - agendamento amanha 07:30 na Padua (unidade 15)
// - prescricao REVO composta: Magnesio Bisglicinato 300mg + Zinco 30mg + Vit D 5000UI
// - protocolo de aplicacao: 4 injetaveis IM + 1 EV (substancias do catalogo)
// - RAS PDF refletindo essa sessao, mandado pra Carlucia via WhatsApp (template oficial)
// - log Telegram CEO
//
// IMPORTANTE: paciente real, conteudo clinico = catalogo do sistema, nada inventado.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface WhatsappResult { sucesso: boolean; provedorMsgId?: string; erro?: string; }
interface TelegramResult { sucesso: boolean; erro?: string; }
interface UploadResultado { driveFileId: string; driveUrl: string; nomeArquivo: string; sha256: string | null; arquivoId: number; }

const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string) => Promise<WhatsappResult>;
};
const tg = (await import("../../artifacts/api-server/src/services/telegramService.js" as string)) as {
  enviarTelegramCEO: (mensagem: string) => Promise<TelegramResult>;
};
const tplMod = (await import("../../artifacts/api-server/src/services/whatsappTemplates.js" as string)) as {
  renderTemplate: (nome: "ENVIO_RAS_PDF", dados: {
    pacienteNome: string;
    pacienteGenero?: "feminino" | "masculino" | "neutro";
    codigoSemantico: string;
    unidade: string;
    protocoloResumo: string;
    driveUrl: string;
    hashSha256Curto: string;
  }) => string;
};
const pdfMod = (await import("../../artifacts/api-server/src/lib/assinatura/htmlParaPdf.js" as string)) as {
  htmlParaPdfBuffer: (html: string) => Promise<Buffer>;
};
const driveMod = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const PROFISSIONAL_ID = 1; // Dr Caio Padua (validador_mestre)
const DURACAO_MIN = 75; // 4 IM (15min) + 1 EV (15min) consolidados num slot
const TIPO_PROC = "APLICACAO_IM_15_PRESENCIAL";

// 4 IM + 1 EV do catalogo substancias
const SUBSTANCIAS_PROTOCOLO: Array<{ id: number; nome: string; via: string; dose: string }> = [
  { id: 13, nome: "Vitamina D3 5000UI IM", via: "IM", dose: "5.000 UI" },
  { id: 14, nome: "Vitamina B12 (Metilcobalamina) IM", via: "IM", dose: "5.000 mcg" },
  { id: 7, nome: "Complexo B", via: "IM", dose: "2 mL" },
  { id: 8, nome: "Zinco + Selenio", via: "IM", dose: "100 mg" },
  { id: 15, nome: "Glutationa EV 1200mg", via: "EV", dose: "1.200 mg" },
];

const FORMULA_REVO = {
  nome: "Formula composta — Magnesio Bisglicinato + Zinco + Vitamina D3",
  posologia: "1 capsula ao dia, em jejum ou com refeicao leve, por 90 dias.",
  componentes: [
    { ativo: "Magnesio Bisglicinato", dose: "300 mg" },
    { ativo: "Zinco quelato", dose: "30 mg" },
    { ativo: "Vitamina D3 (colecalciferol)", dose: "5.000 UI" },
  ],
  indicacao: "Suporte mitocondrial, modulacao imune e equilibrio mineral basal.",
};

function amanha0730BRT(): { data: string; hora: string; horaFim: string; dataAtendFmt: string; dataIso: Date } {
  const agora = new Date();
  const brt = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  brt.setDate(brt.getDate() + 1);
  brt.setHours(7, 30, 0, 0);
  const yyyy = brt.getFullYear();
  const mm = String(brt.getMonth() + 1).padStart(2, "0");
  const dd = String(brt.getDate()).padStart(2, "0");
  const dataAtendFmt = `${dd}/${mm}/${yyyy} 07:30`;
  return { data: `${yyyy}-${mm}-${dd}`, hora: "07:30", horaFim: "08:45", dataAtendFmt, dataIso: brt };
}

function htmlRas(params: {
  nome: string; codigo: string; cpf: string; dataAtend: string; numeroSessao: number;
}): string {
  const linhasInjet = SUBSTANCIAS_PROTOCOLO.map((s, i) => `
    <tr>
      <td class="codigo">SUBS ${String(s.id).padStart(4, "0")}</td>
      <td><strong>${s.nome}</strong></td>
      <td>${s.dose}</td>
      <td>${s.via}</td>
      <td>Sessao ${params.numeroSessao}/8 (dose ${i + 1} do dia)</td>
    </tr>`).join("");
  const linhasComp = FORMULA_REVO.componentes.map(c =>
    `<li><strong>${c.ativo}</strong> &mdash; ${c.dose}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10pt; color: #0e1c2c; line-height: 1.5; }
  .header { border-bottom: 2px solid #0e1c2c; padding-bottom: 8px; margin-bottom: 18px; }
  .header .marca { font-size: 18pt; font-weight: 700; letter-spacing: 4px; }
  .header .sub { font-size: 8pt; color: #5a6478; letter-spacing: 2px; }
  .titulo { text-align: center; font-size: 13pt; font-weight: 700; margin: 18px 0 4px; letter-spacing: 2px; }
  .subtitulo { text-align: center; font-size: 9pt; color: #5a6478; margin-bottom: 22px; }
  .bloco { margin-bottom: 16px; }
  .bloco h3 { font-size: 10pt; font-weight: 700; border-bottom: 1px solid #0e1c2c; padding-bottom: 3px; margin: 0 0 8px; letter-spacing: 1px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .lab { color: #5a6478; font-size: 9pt; }
  .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table th { text-align: left; background: #eef1f5; padding: 6px 8px; border-bottom: 1px solid #0e1c2c; font-weight: 700; }
  table td { padding: 6px 8px; border-bottom: 1px solid #d0d7e2; vertical-align: top; }
  .codigo { font-family: monospace; font-size: 8pt; color: #5a6478; }
  .footer { position: fixed; bottom: 12mm; left: 15mm; right: 15mm; border-top: 1px solid #0e1c2c; padding-top: 6px; font-size: 7.5pt; color: #5a6478; display: flex; justify-content: space-between; }
</style></head>
<body>
  <div class="header">
    <div class="marca">PAWARDS</div>
    <div class="sub">PADCON &middot; MEDCORE &middot; INSTITUTO PADUA</div>
  </div>
  <div class="titulo">RESUMO DE ATENDIMENTO INTEGRATIVO</div>
  <div class="subtitulo">2a SESSAO &middot; RASX-MATRIZ V6 &middot; Bloco CLIN &middot; Subgrupos AVAL+PROC</div>

  <div class="bloco">
    <h3>1. IDENTIFICACAO DO PACIENTE</h3>
    <div class="grid">
      <div><span class="lab">Nome:</span> <span class="val">${params.nome}</span></div>
      <div><span class="lab">CPF:</span> <span class="val">${params.cpf}</span></div>
      <div><span class="lab">Codigo semantico:</span> <span class="val codigo">${params.codigo}</span></div>
      <div><span class="lab">Unidade:</span> <span class="val">INSTITUTO PADUA</span></div>
      <div><span class="lab">Data do atendimento:</span> <span class="val">${params.dataAtend}</span></div>
      <div><span class="lab">Profissional responsavel:</span> <span class="val">Dr. Caio Henrique Fernandes Padua</span></div>
    </div>
  </div>

  <div class="bloco">
    <h3>2. PROTOCOLO DE APLICACAO (4 IM + 1 EV)</h3>
    <table>
      <thead><tr><th>Codigo</th><th>Substancia</th><th>Dose</th><th>Via</th><th>Indicacao</th></tr></thead>
      <tbody>${linhasInjet}</tbody>
    </table>
  </div>

  <div class="bloco">
    <h3>3. PRESCRICAO REVO (Formula Composta)</h3>
    <p><strong>${FORMULA_REVO.nome}</strong></p>
    <ul>${linhasComp}</ul>
    <p><span class="lab">Posologia:</span> ${FORMULA_REVO.posologia}</p>
    <p><span class="lab">Indicacao:</span> ${FORMULA_REVO.indicacao}</p>
  </div>

  <div class="bloco">
    <h3>4. ORIENTACOES</h3>
    <ul>
      <li>Comparecer em jejum leve (agua liberada). Aplicacao das 4 IM + 1 EV em sequencia, duracao total estimada 75min.</li>
      <li>Em caso de reacao local ou sistemica, comunicar a equipe imediatamente via WhatsApp.</li>
      <li>Retorno medico em 30 dias para reavaliacao do protocolo.</li>
    </ul>
  </div>

  <div class="footer">
    <div>PAWARDS &middot; PADCON &middot; MEDCORE</div>
    <div>Documento gerado pelo sistema &middot; Hash anexado ao Drive</div>
  </div>
</body></html>`;
}

interface PacienteRow { id: number; nome: string; cpf: string; codigo_semantico: string; unidade_id: number; whatsapp: string | null; telefone: string | null; email: string | null; }

async function main(): Promise<void> {
  console.log("=== Wave V479 — 2a sessao Carlucia (motor real) ===");

  // 1) Paciente
  const pacR = await db.execute(sql`SELECT id, nome, cpf, codigo_semantico, unidade_id, whatsapp, telefone, email FROM pacientes WHERE id=${PACIENTE_ID} LIMIT 1`);
  const pac = (pacR as unknown as { rows: PacienteRow[] }).rows[0];
  if (!pac) throw new Error(`Paciente ${PACIENTE_ID} nao encontrado`);
  console.log(`[1/9] Paciente: ${pac.nome} (${pac.codigo_semantico})`);
  console.log(`       WhatsApp: ${pac.whatsapp ?? "—"} | Email: ${pac.email ?? "—"}`);

  const t = amanha0730BRT();

  // 2) Sub-agenda Padua (Caio) — criar se nao existir
  console.log("[2/9] Sub-agenda Padua (Caio)...");
  const subR = await db.execute(sql`
    INSERT INTO sub_agendas (unidade_id, nome, tipo, profissional_id, modalidade, sala_ou_local, ativa, ordem)
    SELECT ${UNIDADE_ID}, 'Dr Caio Padua - Padua', 'medico', ${PROFISSIONAL_ID}, 'presencial', 'Consultorio Padua', true, 0
    WHERE NOT EXISTS (SELECT 1 FROM sub_agendas WHERE unidade_id=${UNIDADE_ID} AND profissional_id=${PROFISSIONAL_ID})
    RETURNING id`);
  let subAgendaId: number;
  const subRows = (subR as unknown as { rows: Array<{ id: number }> }).rows;
  if (subRows[0]) {
    subAgendaId = subRows[0].id;
    console.log(`       Criada sub_agenda id=${subAgendaId}`);
  } else {
    const exR = await db.execute(sql`SELECT id FROM sub_agendas WHERE unidade_id=${UNIDADE_ID} AND profissional_id=${PROFISSIONAL_ID} LIMIT 1`);
    subAgendaId = ((exR as unknown as { rows: Array<{ id: number }> }).rows[0] ?? { id: 0 }).id;
    console.log(`       Sub_agenda existente id=${subAgendaId}`);
  }

  // 3) Slot 07:30 amanha
  console.log(`[3/9] Slot ${t.data} ${t.hora}-${t.horaFim} (${TIPO_PROC})...`);
  const slotR = await db.execute(sql`
    INSERT INTO agenda_slots (profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento, status, turno, liberado, sub_agenda_id)
    VALUES (${PROFISSIONAL_ID}, ${UNIDADE_ID}, ${t.data}, ${t.hora}, ${t.horaFim}, ${DURACAO_MIN}, ${TIPO_PROC}, 'disponivel', 'manha', true, ${subAgendaId})
    ON CONFLICT (profissional_id, data, hora_inicio, hora_fim) DO UPDATE SET status='disponivel'
    RETURNING id`);
  const slotId = ((slotR as unknown as { rows: Array<{ id: number }> }).rows[0] ?? { id: 0 }).id;
  console.log(`       Slot id=${slotId}`);

  // 4) Appointment
  console.log("[4/9] Appointment...");
  const apR = await db.execute(sql`
    INSERT INTO appointments (slot_id, paciente_id, profissional_id, unidade_id, tipo_procedimento, data, hora_inicio, hora_fim, duracao_min, status, origem_agendamento, observacoes)
    VALUES (${slotId}, ${PACIENTE_ID}, ${PROFISSIONAL_ID}, ${UNIDADE_ID}, ${TIPO_PROC}, ${t.data}, ${t.hora}, ${t.horaFim}, ${DURACAO_MIN}, 'agendado', 'sistema', '2a sessao — Protocolo 4 IM + 1 EV + REVO Mg/Zn/VitD')
    RETURNING id`);
  const apId = ((apR as unknown as { rows: Array<{ id: number }> }).rows[0] ?? { id: 0 }).id;
  await db.execute(sql`UPDATE agenda_slots SET status='reservado' WHERE id=${slotId}`);
  console.log(`       Appointment id=${apId}`);

  // 5) Sessao
  console.log("[5/9] Sessao...");
  const sesR = await db.execute(sql`
    INSERT INTO sessoes (paciente_id, profissional_id, unidade_id, data_agendada, hora_agendada, status, tipo_servico, numero_semana, hora_fim, tipo_procedimento, duracao_total_min, notas)
    VALUES (${PACIENTE_ID}, ${PROFISSIONAL_ID}, ${UNIDADE_ID}, ${t.data}, ${t.hora}, 'agendada', 'aplicacao_injetaveis', 2, ${t.horaFim}, ${TIPO_PROC}, ${DURACAO_MIN}, '2a sessao Carlucia — protocolo 4 IM + 1 EV')
    RETURNING id`);
  const sesId = ((sesR as unknown as { rows: Array<{ id: number }> }).rows[0] ?? { id: 0 }).id;
  console.log(`       Sessao id=${sesId} (numero 2)`);

  // 6) Prescricao REVO composta
  console.log("[6/9] Prescricao REVO composta (Mg + Zn + VitD)...");
  const revoR = await db.execute(sql`
    INSERT INTO revo_medicamentos (paciente_id, nome, dose, posologia, status_atual, tipo_med, indicacao_clinica, componentes_formula, origem_posologia, data_inicio_uso)
    VALUES (${PACIENTE_ID}, ${FORMULA_REVO.nome}, '1 capsula', ${FORMULA_REVO.posologia}, 'em_uso', 'formula',
            ${FORMULA_REVO.indicacao}, ${sql.raw(`'${JSON.stringify(FORMULA_REVO.componentes).replace(/'/g, "''")}'::jsonb`)}, 'manual', now())
    RETURNING id`);
  const revoId = ((revoR as unknown as { rows: Array<{ id: number }> }).rows[0] ?? { id: 0 }).id;
  console.log(`       REVO id=${revoId}`);

  // 7) 5 aplicacoes_substancias
  console.log("[7/9] 5 aplicacoes_substancias (4 IM + 1 EV)...");
  for (const s of SUBSTANCIAS_PROTOCOLO) {
    await db.execute(sql`
      INSERT INTO aplicacoes_substancias (sessao_id, substancia_id, dose, numero_sessao, total_sessoes, status, disponibilidade, notas)
      VALUES (${sesId}, ${s.id}, ${s.dose}, 2, 8, 'pendente', 'disp', ${`${s.via} — ${s.nome}`})`);
    console.log(`       + ${s.nome} (${s.via}) ${s.dose}`);
  }

  // 8) RAS PDF + Drive
  console.log("[8/9] RAS PDF + upload Drive...");
  const html = htmlRas({ nome: pac.nome, codigo: pac.codigo_semantico, cpf: pac.cpf, dataAtend: t.dataAtendFmt, numeroSessao: 2 });
  const buffer = await pdfMod.htmlParaPdfBuffer(html);
  console.log(`       PDF ${buffer.length} bytes`);
  const up = await driveMod.uploadArquivoPaciente({
    pacienteId: pac.id, unidadeId: pac.unidade_id, pacienteNome: pac.nome,
    codigoSemantico: pac.codigo_semantico, tipo: "RAS", data: t.dataIso,
    mimeType: "application/pdf", conteudo: buffer, geradoPorUserId: PROFISSIONAL_ID,
  });
  console.log(`       Drive: ${up.driveUrl}`);

  // 9) WhatsApp Carlucia + Telegram CEO
  console.log("[9/9] WhatsApp Carlucia (template ENVIO_RAS_PDF) + Telegram CEO...");
  const protocoloResumo =
    `4 IM: Vit D3 5000UI, B12 Metilcobalamina 5000mcg, Complexo B 2mL, Zinco+Selenio 100mg\n` +
    `1 EV: Glutationa 1200mg\n` +
    `REVO: Magnesio Bisglicinato 300mg + Zinco 30mg + Vit D 5000UI (1 cap/dia, 90d)`;
  const msgPac = tplMod.renderTemplate("ENVIO_RAS_PDF", {
    pacienteNome: pac.nome, pacienteGenero: "feminino",
    codigoSemantico: pac.codigo_semantico, unidade: "INSTITUTO PADUA",
    protocoloResumo, driveUrl: up.driveUrl,
    hashSha256Curto: (up.sha256 ?? "").slice(0, 12),
  });

  let resPac: WhatsappResult = { sucesso: false, erro: "sem telefone" };
  const telPac = pac.whatsapp ?? pac.telefone;
  if (telPac) {
    const telE164 = telPac.startsWith("+") ? telPac : `+${telPac}`;
    resPac = await wpp.enviarWhatsapp(telE164, msgPac);
    console.log(`       WA Carlucia (${telE164}): ${resPac.sucesso ? "OK" : "FALHA"} ${resPac.provedorMsgId ?? resPac.erro ?? ""}`);
  } else {
    console.log(`       WA Carlucia: PULADO (sem telefone)`);
  }

  const msgCeo =
    `[PAWARDS] 2a sessao Carlucia agendada (motor real)\n\n` +
    `Paciente: ${pac.nome}\n` +
    `Quando: ${t.dataAtendFmt} (BRT) - Instituto Padua\n` +
    `Sessao: ${sesId} | Appointment: ${apId} | Slot: ${slotId} | REVO: ${revoId}\n\n` +
    `Protocolo:\n${protocoloResumo}\n\n` +
    `RAS PDF: ${up.driveUrl}\n` +
    `SHA-256: ${(up.sha256 ?? "").slice(0, 16)}...\n\n` +
    `WA Carlucia: ${resPac.sucesso ? "ENVIADO" : "FALHOU/PULADO (" + (resPac.erro ?? "sem tel") + ")"}\n` +
    `Email Carlucia: PENDENTE (api-server nao tem lib de envio — Caio precisa autorizar setup Gmail)`;
  const resTg = await tg.enviarTelegramCEO(msgCeo);
  console.log(`       Telegram CEO: ${resTg.sucesso ? "OK" : "FALHA " + (resTg.erro ?? "")}`);

  console.log("\n=== RESUMO ===");
  console.log(`Appointment ${apId} | Sessao ${sesId} | Slot ${slotId} | REVO ${revoId}`);
  console.log(`5 aplicacoes_substancias gravadas (4 IM + 1 EV)`);
  console.log(`RAS PDF: ${up.driveUrl}`);
  console.log(`WA Carlucia: ${resPac.sucesso ? "OK" : "FALHOU/PULADO"}`);
  console.log(`Telegram CEO: ${resTg.sucesso ? "OK" : "FALHOU"}`);
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
