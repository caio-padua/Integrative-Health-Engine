// Regenera demo Carlucia (apt 151) usando RECURSOS REAIS do sistema:
//   - createCalendarEvent + buildEventDescription (titulo rico, endereco,
//     procedimentos, status, substancias, legenda, Maps/Waze)
//   - renderTemplate(...) com 5 templates oficiais do sistema, incluindo
//     APRESENTACAO_INICIAL_PACIENTE, ENVIO_RACJ_ASSINATURA, CONFIRMACAO_AGENDAMENTO,
//     ENVIO_RAS_PDF, LEMBRETE_SESSAO.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const gcal = (await import("../../artifacts/api-server/src/lib/google-calendar.js" as string)) as {
  createCalendarEvent: (d: Record<string, unknown>) => Promise<{ id: string; htmlLink: string }>;
  getCalendarClient: () => Promise<{ events: { delete: (a: Record<string, unknown>) => Promise<unknown> } }>;
};
const wppTpl = (await import("../../artifacts/api-server/src/services/whatsappTemplates.js" as string)) as {
  renderTemplate: (n: string, d: Record<string, unknown>) => string;
};
const wppSvc = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarComTemplate: (telefone: string, templateNome: string, dados: Record<string, unknown>, options?: { unidadeId?: number; alertaNotificacaoId?: number }) => Promise<{ sucesso: boolean; provedorMsgId?: string; erro?: string; logId?: number }>;
};

const APT_ID = 151;
const PAC_ID = 3497;
const WPP    = "5562982696656"; // Carlucia
const UNI_ID = 15;

async function main(): Promise<void> {
  // 1. Pega estado atual
  const q = (await db.execute(sql`
    SELECT a.id, a.google_event_id, a.google_calendar_id, a.data::text AS data,
           a.hora_inicio::text AS hi, a.hora_fim::text AS hf,
           a.tipo_procedimento, a.duracao_min,
           p.nome AS paciente_nome, p.cpf, p.codigo_semantico,
           u.nome AS unidade_nome, u.endereco, u.bairro, u.cep, u.cidade, u.estado
    FROM appointments a
    JOIN pacientes p ON p.id = a.paciente_id
    JOIN unidades  u ON u.id = a.unidade_id
    WHERE a.id = ${APT_ID}
  `)) as unknown as { rows: Array<Record<string, string>> };
  const a = q.rows[0];
  if (!a) throw new Error("apt 151 nao encontrado");

  console.log(`[+] Apt ${APT_ID}: ${a.paciente_nome} (${a.codigo_semantico})`);
  console.log(`    ${a.data} ${a.hi}-${a.hf}  ${a.tipo_procedimento} ${a.duracao_min}min`);
  console.log(`    Unidade: ${a.unidade_nome} — ${a.endereco}, ${a.bairro}, ${a.cidade}-${a.estado}`);
  console.log(`    Evento Calendar atual: ${a.google_event_id ?? "NONE"}`);

  // 2. Deleta evento antigo do Calendar
  if (a.google_event_id) {
    try {
      const cal = await gcal.getCalendarClient();
      await cal.events.delete({ calendarId: a.google_calendar_id || "primary", eventId: a.google_event_id });
      console.log(`[+] Evento antigo ${a.google_event_id} deletado do Calendar`);
    } catch (e: unknown) {
      console.warn(`    aviso: nao deletou (pode ja estar removido): ${(e as Error).message}`);
    }
  }

  // 3. Cria evento novo via funcao oficial — com SUBSTANCIAS + ENDERECO populados
  const substancias = [
    { nome: "Coenzima Q10",            dose: "200mg",                via: "vo",  status: "DISP", nestaSessao: true },
    { nome: "Testosterona Cipionato",  dose: "200mg",                via: "im",  status: "DISP", nestaSessao: true },
  ];
  const ev = await gcal.createCalendarEvent({
    sessaoId: APT_ID,
    pacienteNome:     a.paciente_nome,
    pacienteCpf:      a.cpf,
    profissionalNome: "Dr Caio Henrique Fernandes Padua",
    tipoProcedimento: a.tipo_procedimento,
    duracaoMin:       Number(a.duracao_min),
    dataAgendada:     a.data,
    horaAgendada:     a.hi.slice(0, 5),
    horaFim:          a.hf.slice(0, 5),
    calendarId:       "primary",
    numeroMarcacao:   1,
    totalMarcacoes:   1,
    unidadeNome:      a.unidade_nome,
    substancias,
    endereco: { rua: a.endereco, bairro: a.bairro, cep: a.cep, cidade: a.cidade, estado: a.estado },
  });
  console.log(`[+] Evento NOVO criado: ${ev.id}`);
  console.log(`    ${ev.htmlLink}`);

  // 4. Persiste novo google_event_id
  await db.execute(sql`
    UPDATE appointments SET google_event_id = ${ev.id}, google_calendar_id = 'primary', atualizado_em = NOW() WHERE id = ${APT_ID}
  `);
  console.log(`[+] appointments.google_event_id atualizado pra ${ev.id}`);

  // 5. Reenvia WhatsApp via TEMPLATES OFICIAIS do sistema
  const dataBr = a.data.split("-").reverse().join("/"); // 19/05/2026
  const horaBr = a.hi.slice(0, 5);

  const envios: Array<{ tpl: string; dados: Record<string, unknown> }> = [
    {
      tpl: "APRESENTACAO_INICIAL_PACIENTE",
      dados: {
        pacienteNome: a.paciente_nome,
        pacienteGenero: "feminino",
        unidade: a.unidade_nome,
        enfermeiraNome: "Bianca Dias",
        medicoNome: "Dr Caio Henrique Fernandes Padua",
        primeiraConsultaData: dataBr,
        primeiraConsultaHora: horaBr,
      },
    },
    {
      tpl: "ENVIO_RACJ_ASSINATURA",
      dados: {
        pacienteNome: a.paciente_nome,
        pacienteGenero: "feminino",
        unidade: a.unidade_nome,
        termoTitulo: "Termo de Consentimento Juridico (RACJ) — Medicina Integrativa",
        termoVersao: "v3.2",
        zapsignUrl: "https://app.zapsign.com.br/verificar/" + ev.id.slice(0, 24),
        validadeDias: 7,
      },
    },
    {
      tpl: "CONFIRMACAO_AGENDAMENTO",
      dados: {
        pacienteNome: a.paciente_nome,
        data: dataBr,
        hora: horaBr,
        unidade: `${a.unidade_nome} — ${a.endereco}, ${a.bairro}, ${a.cidade}-${a.estado}`,
        procedimento: "Consulta Extensa (60 min) — Dr Caio + Enf. Bianca",
      },
    },
    {
      tpl: "ENVIO_RAS_PDF",
      dados: {
        pacienteNome: a.paciente_nome,
        pacienteGenero: "feminino",
        codigoSemantico: a.codigo_semantico,
        unidade: a.unidade_nome,
        protocoloResumo: "- Coenzima Q10 200mg, via oral, 1x ao dia\n- Testosterona Cipionato 200mg IM, a cada 21 dias",
        driveUrl: `https://drive.google.com/file/d/preview-${ev.id.slice(0, 16)}/view`,
        hashSha256Curto: ev.id.slice(0, 12),
      },
    },
    {
      tpl: "LEMBRETE_SESSAO",
      dados: {
        pacienteNome: a.paciente_nome,
        data: dataBr,
        hora: horaBr,
        unidade: `${a.unidade_nome} — ${a.endereco}`,
      },
    },
  ];

  console.log(`\n[+] Disparando ${envios.length} mensagens via renderTemplate oficial:`);
  let ok = 0, fail = 0;
  for (const e of envios) {
    const preview = wppTpl.renderTemplate(e.tpl, e.dados).split("\n").slice(0, 3).join(" | ");
    console.log(`    -> ${e.tpl}: ${preview.slice(0, 110)}...`);
    const r = await wppSvc.enviarComTemplate(WPP, e.tpl, e.dados, { unidadeId: UNI_ID });
    if (r.sucesso) { ok++; console.log(`       OK sid=${r.provedorMsgId} log=${r.logId}`); }
    else           { fail++; console.log(`       FAIL ${r.erro ?? "?"}`); }
    await new Promise(res => setTimeout(res, 800));
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`  Calendar: evento novo ${ev.id}`);
  console.log(`  WhatsApp via templates: ${ok} ok / ${fail} fail`);
  process.exit(0);
}

main().catch((e) => { console.error("[ERRO]", e); process.exit(1); });
