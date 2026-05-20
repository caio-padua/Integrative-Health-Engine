// Criar evento REAL no Google Calendar pra Carlucia amanha 8h, usando o
// pipeline oficial do sistema (lib/google-calendar.ts: createCalendarEvent +
// buildEventDescription + buildEventSummary + getEventColor).
//
// Layout = exatamente o mesmo dos eventos visiveis no print do Caio:
// titulo "[NOME] CPF [XXX.XXX.XXX-XX] [CODIGO_SEMANTICO]", descricao com
// header "Developed by: Pawards MedCore", procedimentos, substancias, legenda
// e endereco com Google Maps + Waze.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const gc = (await import("../../artifacts/api-server/src/lib/google-calendar.js" as string)) as {
  createCalendarEvent: (data: Record<string, unknown>) => Promise<{ id: string; htmlLink: string; summary: string }>;
};

async function main(): Promise<void> {
  console.log("[1/3] Carregando contexto real (paciente + unidade)...");
  const p = ((await db.execute(sql`SELECT id, nome, cpf FROM pacientes WHERE id=3497`)) as unknown as { rows: Array<{ id: number; nome: string; cpf: string }> }).rows[0];
  const u = ((await db.execute(sql`SELECT id, nome, endereco FROM unidades WHERE id=15`)) as unknown as { rows: Array<{ id: number; nome: string; endereco: string | null }> }).rows[0];
  if (!p) throw new Error("Carlucia nao encontrada");
  if (!u) throw new Error("Unidade Padua nao encontrada");

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const yyyy = amanha.getFullYear();
  const mm = String(amanha.getMonth() + 1).padStart(2, "0");
  const dd = String(amanha.getDate()).padStart(2, "0");
  const dataAgendada = `${yyyy}-${mm}-${dd}`;

  console.log(`[2/3] Criando evento ${dataAgendada} 08:00-09:00 (calendar primary do Caio)...`);
  const evento = await gc.createCalendarEvent({
    sessaoId: 0,
    pacienteNome: p.nome,
    pacienteCpf: p.cpf,
    profissionalNome: "Dr. Caio Henrique Fernandes Padua",
    tipoProcedimento: "CONSULTA_60_PRESENCIAL",
    duracaoMin: 60,
    dataAgendada,
    horaAgendada: "08:00",
    horaFim: "09:00",
    calendarId: "primary",
    numeroMarcacao: 1,
    totalMarcacoes: 6,
    unidadeNome: u.nome,
    substancias: [
      { nome: "Coenzima Q10 (Ubiquinol)", dose: "200mg", via: "oral", status: "PROX", nestaSessao: false },
      { nome: "Testosterona Cipionato",   dose: "200mg", via: "im",   status: "PROX", nestaSessao: false },
    ],
    endereco: {
      rua: "Rua Guaxupe, 175",
      bairro: "Setor Bueno",
      cep: "74210-120",
      cidade: "Goiania",
      estado: "GO",
    },
  });

  console.log("[3/3] Evento criado:");
  console.log(`  ID:    ${evento.id}`);
  console.log(`  Titulo: ${evento.summary}`);
  console.log(`  Link:  ${evento.htmlLink}`);
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
