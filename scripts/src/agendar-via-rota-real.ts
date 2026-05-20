// Agendamento da Carlucia usando a ROTA REAL do sistema:
//   POST /api/agenda-motor/book  (mesma rota que a UI chama)
//
// Pre-requisitos minimos (insert via SQL, mesma estrutura que /generate-slots
// produziria em producao a partir de availability_rule + sub_agenda):
//   1. agendas_profissionais pra Dr. Caio na unidade 15 (Padua)
//   2. agenda_slots disponivel amanha 8h
// Depois disso, a rota /book faz: lock, transacao, insert appointment,
// auditLog, e sync GCal via syncAppointmentToGoogleCalendar (lib oficial).
//
// Tambem apaga o evento de teste criado direto pela lib (sem appointment no
// DB) pra nao ficar duplicado no calendario da Carlucia.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const gc = (await import("../../artifacts/api-server/src/lib/google-calendar.js" as string)) as {
  deleteCalendarEvent: (calendarId: string, eventId: string) => Promise<void>;
};
const jwtLib = (await import("../../artifacts/api-server/src/lib/auth/jwt.js" as string)) as {
  signJwt: (payload: Record<string, unknown>, ttlSeconds?: number) => string;
};

const CAIO_JWT = jwtLib.signJwt({
  sub: 1, email: "ceo@pawards.com.br", perfil: "validador_mestre",
  escopo: "consultoria_master", unidadeId: 1, consultoriaId: 1,
});

const API = "http://localhost:80";
const EVENTO_TESTE_ANTERIOR = "cc90nl4igqqjn9agnl9o2upsjs";

async function main(): Promise<void> {
  console.log("[1/5] Apagando evento de teste anterior (criado direto pela lib)...");
  try {
    await gc.deleteCalendarEvent("primary", EVENTO_TESTE_ANTERIOR);
    console.log("  removido.");
  } catch (e) {
    console.log(`  ja nao existia ou erro nao-critico: ${(e as Error).message}`);
  }

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const yyyy = amanha.getFullYear();
  const mm = String(amanha.getMonth() + 1).padStart(2, "0");
  const dd = String(amanha.getDate()).padStart(2, "0");
  const dataAgendada = `${yyyy}-${mm}-${dd}`;

  console.log("[2/5] Selecionando profissional (Caio = usuarios.id=1, FK de agenda_slots)...");
  const profissionalId = 1;
  console.log(`  profissional_id=${profissionalId}`);

  console.log("[3/5] Garantindo slot disponivel amanha 08:00-09:00...");
  const slotExistente = (await db.execute(sql`
    SELECT id, status FROM agenda_slots
    WHERE profissional_id = ${profissionalId} AND data = ${dataAgendada} AND hora_inicio = '08:00'
    LIMIT 1
  `)) as unknown as { rows: Array<{ id: number; status: string }> };
  let slotId: number;
  if (slotExistente.rows.length > 0) {
    slotId = slotExistente.rows[0].id;
    await db.execute(sql`UPDATE agenda_slots SET status='disponivel', liberado=true WHERE id=${slotId}`);
    console.log(`  ja existia: id=${slotId} (resetado para disponivel)`);
  } else {
    const ins = (await db.execute(sql`
      INSERT INTO agenda_slots (profissional_id, unidade_id, data, hora_inicio, hora_fim, duracao_min, tipo_procedimento, status, liberado, turno, criado_em)
      VALUES (${profissionalId}, 15, ${dataAgendada}, '08:00', '09:00', 60, 'CONSULTA_60_PRESENCIAL', 'disponivel', true, 'manha', NOW())
      RETURNING id
    `)) as unknown as { rows: Array<{ id: number }> };
    slotId = ins.rows[0].id;
    console.log(`  criado: id=${slotId}`);
  }

  console.log("[4/5] Limpando appointment anterior pra esse slot (idempotencia)...");
  await db.execute(sql`DELETE FROM appointments WHERE slot_id = ${slotId}`);

  console.log(`[5/5] POST ${API}/api/agenda-motor/book (rota real do sistema)...`);
  const resp = await fetch(`${API}/api/agenda-motor/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CAIO_JWT}` },
    body: JSON.stringify({
      slotId,
      pacienteId: 3497,
      observacoes: "Demo CEO 18/05 - apresentacao protocolo Coenzima Q10 (oral 90d) + Testosterona Cipionato 200mg IM (180d). Paciente: Carlucia Santos Fernandes (Padua).",
      origemAgendamento: "sistema",
      syncGoogleCalendar: true,
    }),
  });
  const body = await resp.json() as Record<string, unknown>;
  console.log(`  HTTP ${resp.status}`);
  console.log(`  appointmentId: ${body.id ?? "-"}`);
  console.log(`  googleEventId: ${body.googleEventId ?? "-"}`);
  console.log(`  data/hora:     ${body.data ?? "-"} ${body.horaInicio ?? "-"}`);
  console.log(`  status:        ${body.status ?? "-"}`);
  if (!resp.ok) {
    console.error("  resposta completa:", body);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
