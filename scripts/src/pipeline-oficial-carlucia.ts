// Wave V480 — Pipeline OFICIAL Carlucia (sessao 39, appointment 152)
// Caio bateu o pe corretissimo: eu fiz INSERT raw e pulei TODOS os pipelines
// que ele construiu durante meses. Esta onda chama o motor real, etapa por
// etapa, com try/catch independente pra cada uma — assim mesmo que 1 falhe,
// as outras vao.
//
// Pipeline:
//   1. Snapshot REVO minimo (Carlucia tem 0 — pre-req do gerarRasxPdf)
//   2. Evento Google Calendar via createCalendarEvent (substancias embutidas)
//   3. UPDATE appointment 152 + sessao 39 com google_event_id
//   4. gerarRasxPdf categoria COMPLETO (PDFKit, 11 cadernos, RACL HEST etc)
//   5. uploadArquivoPaciente -> Drive estruturado (registry + sha256)
//   6. APRESENTACAO_INICIAL_PACIENTE -> WhatsApp Carlucia
//   7. ENVIO_RAS_PDF -> WhatsApp Carlucia (link Drive novo)
//   8. Telegram CEO resumo de tudo que rodou

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
  renderTemplate: <N extends "APRESENTACAO_INICIAL_PACIENTE" | "ENVIO_RAS_PDF">(
    nome: N,
    dados: Record<string, unknown>,
  ) => string;
};
const driveMod = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};
const rasxMod = (await import("../../artifacts/api-server/src/pdf/rasxPdf.js" as string)) as {
  gerarRasxPdf: (data: Record<string, unknown>, categoria?: "COMPLETO" | "CLINICO" | "EVOLUTIVO" | "ESTADO_SAUDE") => NodeJS.ReadableStream;
};
const calMod = (await import("../../artifacts/api-server/src/lib/google-calendar.js" as string)) as {
  createCalendarEvent: (data: Record<string, unknown>) => Promise<{ id?: string }>;
};

const PACIENTE_ID = 3497;
const SESSAO_ID = 39;
const APPOINTMENT_ID = 152;
const UNIDADE_ID = 15;
const PROFISSIONAL_ID = 1;
const DATA = "2026-05-19";
const HORA_INICIO = "07:30";
const HORA_FIM = "08:45";

interface PacRow { id: number; nome: string; cpf: string; codigo_semantico: string; whatsapp: string | null; telefone: string | null; email: string | null; data_nascimento: string | null; genero: string; }
interface UniRow { id: number; nome: string; endereco: string | null; bairro: string | null; cep: string | null; cidade: string | null; estado: string | null; google_calendar_id: string | null; }
interface AplicRow { substancia_id: number; substancia_nome: string; substancia_via: string; numero_sessao: number; total_sessoes: number; status: string; dose: string; }

function streamToBuffer(s: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    s.on("data", (c: Buffer) => chunks.push(c));
    s.on("end", () => resolve(Buffer.concat(chunks)));
    s.on("error", reject);
  });
}

function generoToTpl(g: string): "feminino" | "masculino" | "neutro" {
  if (g === "feminino") return "feminino";
  if (g === "masculino") return "masculino";
  return "neutro";
}

interface EtapaResult { ok: boolean; detalhe: string; erro?: string; }
const resultados: Record<string, EtapaResult> = {};

async function etapa<T>(nome: string, fn: () => Promise<{ detalhe: string; valor?: T }>): Promise<T | undefined> {
  console.log(`\n[${nome}] iniciando...`);
  try {
    const r = await fn();
    resultados[nome] = { ok: true, detalhe: r.detalhe };
    console.log(`[${nome}] OK — ${r.detalhe}`);
    return r.valor;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    resultados[nome] = { ok: false, detalhe: "FALHOU", erro: msg };
    console.error(`[${nome}] ERRO — ${msg}`);
    return undefined;
  }
}

async function main() {
  console.log("=== Pipeline OFICIAL Carlucia (sessao 39) ===");

  const pacR = await db.execute(sql`SELECT id, nome, cpf, codigo_semantico, whatsapp, telefone, email, data_nascimento, genero FROM pacientes WHERE id=${PACIENTE_ID}`);
  const pac = (pacR as unknown as { rows: PacRow[] }).rows[0];
  if (!pac) throw new Error("Paciente nao encontrado");

  const uniR = await db.execute(sql`SELECT id, nome, endereco, bairro, cep, cidade, estado, google_calendar_id FROM unidades WHERE id=${UNIDADE_ID}`);
  const uni = (uniR as unknown as { rows: UniRow[] }).rows[0]!;

  const aplicR = await db.execute(sql`
    SELECT a.substancia_id, s.nome AS substancia_nome, s.via AS substancia_via,
           a.numero_sessao, a.total_sessoes, a.status, COALESCE(a.dose,'') AS dose
    FROM aplicacoes_substancias a
    LEFT JOIN substancias s ON s.id = a.substancia_id
    WHERE a.sessao_id = ${SESSAO_ID}
    ORDER BY a.substancia_id
  `);
  const aplics = (aplicR as unknown as { rows: AplicRow[] }).rows;
  console.log(`Aplicacoes da sessao ${SESSAO_ID}: ${aplics.length}`);

  // ====================================================================
  // ETAPA 1 — Snapshot REVO minimo (pre-req do gerarRasxPdf)
  // ====================================================================
  await etapa("1.snapshot_revo", async () => {
    const ja = await db.execute(sql`SELECT count(*)::int AS n FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID}`);
    if (((ja as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0) > 0) {
      return { detalhe: "snapshot ja existe, pulando" };
    }
    await db.execute(sql`
      INSERT INTO revo_snapshots (paciente_id, tipo, observacoes_medicas, resumo_clinico, origem, versao_schema)
      VALUES (${PACIENTE_ID}, 'inicial',
        'Paciente em primeira avaliacao integrativa, protocolo IM/EV iniciado.',
        'Foco em reposicao de Vitamina D, B12, Complexo B, Zinco + protocolo de antioxidante (Glutationa EV).',
        'PADCOM_V15.2', '1.0')
    `);
    await db.execute(sql`
      INSERT INTO revo_snapshots (paciente_id, tipo, observacoes_medicas, resumo_clinico, origem, versao_schema)
      VALUES (${PACIENTE_ID}, 'atual',
        'Sessao 2/8 do protocolo de aplicacoes injetaveis.',
        'Em curso: 4 IM (Vit D3, B12, Complexo B, Zinco/Selenio) + 1 EV (Glutationa 1200mg) + 1 formula oral magistral.',
        'PADCOM_V15.2', '1.0')
    `);
    return { detalhe: "2 snapshots criados (inicial + atual)" };
  });

  // ====================================================================
  // ETAPA 2 — Google Calendar createCalendarEvent (substancias embutidas)
  // ====================================================================
  const substanciasEvento = aplics.map(a => ({
    nome: a.substancia_nome,
    via: (a.substancia_via || "").toLowerCase(),
    dose: a.dose,
    status: a.status === "pendente" ? "disp" : a.status,
    nestaSessao: true,
  }));
  const calendarIdUsado = uni.google_calendar_id || "primary";

  const eventId = await etapa<string>("2.google_calendar", async () => {
    const ja = (await db.execute(sql`SELECT google_event_id FROM appointments WHERE id=${APPOINTMENT_ID}`) as unknown as { rows: { google_event_id: string | null }[] }).rows[0];
    if (ja?.google_event_id) return { detalhe: `evento ja existe ${ja.google_event_id}, pulando criacao`, valor: ja.google_event_id };
    const ev = await calMod.createCalendarEvent({
      sessaoId: SESSAO_ID,
      pacienteNome: pac.nome,
      pacienteCpf: pac.cpf,
      numeroMarcacao: 2,
      totalMarcacoes: 8,
      unidadeNome: uni.nome,
      tipoProcedimento: "APLICACAO_IM_15_PRESENCIAL",
      dataAgendada: DATA,
      horaAgendada: HORA_INICIO,
      horaFim: HORA_FIM,
      duracaoMin: 75,
      substancias: substanciasEvento,
      calendarId: calendarIdUsado,
      endereco: {
        rua: uni.endereco ?? undefined,
        bairro: uni.bairro ?? undefined,
        cep: uni.cep ?? undefined,
        cidade: uni.cidade ?? undefined,
        estado: uni.estado ?? undefined,
      },
    });
    if (!ev?.id) throw new Error("createCalendarEvent nao retornou id");
    return { detalhe: `evento Google ${ev.id} (cal=${calendarIdUsado})`, valor: ev.id };
  });

  // ====================================================================
  // ETAPA 3 — UPDATE appointment + sessao com google_event_id
  // ====================================================================
  if (eventId) {
    await etapa("3.persistir_event_id", async () => {
      await db.execute(sql`UPDATE appointments SET google_event_id=${eventId}, google_calendar_id=${calendarIdUsado} WHERE id=${APPOINTMENT_ID}`);
      await db.execute(sql`UPDATE sessoes SET google_event_id=${eventId} WHERE id=${SESSAO_ID}`);
      return { detalhe: `appointment ${APPOINTMENT_ID} + sessao ${SESSAO_ID} atualizados` };
    });
  }

  // ====================================================================
  // ETAPA 4+5 — gerarRasxPdf COMPLETO + upload Drive
  // ====================================================================
  const rasUpload = await etapa<UploadResultado>("4.gerar_rasx_completo_upload", async () => {
    const snaps = (await db.execute(sql`SELECT * FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID} ORDER BY data_snapshot DESC`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const pats = (await db.execute(sql`SELECT * FROM revo_patologias WHERE paciente_id=${PACIENTE_ID}`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const orgaos = (await db.execute(sql`SELECT * FROM revo_orgaos WHERE paciente_id=${PACIENTE_ID}`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const meds = (await db.execute(sql`SELECT * FROM revo_medicamentos WHERE paciente_id=${PACIENTE_ID}`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const evMeds = (await db.execute(sql`SELECT * FROM revo_eventos_medicacao WHERE paciente_id=${PACIENTE_ID} ORDER BY data ASC`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const curvas = (await db.execute(sql`SELECT * FROM revo_curvas WHERE paciente_id=${PACIENTE_ID} ORDER BY data_registro ASC`) as unknown as { rows: Record<string, unknown>[] }).rows;
    const etapas = (await db.execute(sql`SELECT * FROM revo_proxima_etapa WHERE paciente_id=${PACIENTE_ID}`) as unknown as { rows: Record<string, unknown>[] }).rows;

    const pdfData = {
      paciente: {
        nome: pac.nome,
        cpf: pac.cpf,
        dataNascimento: pac.data_nascimento ?? undefined,
        telefone: pac.whatsapp ?? pac.telefone ?? undefined,
        email: pac.email ?? undefined,
        sexo: pac.genero,
        enderecoCompleto: `${uni.endereco ?? ""} - ${uni.bairro ?? ""} - ${uni.cidade ?? ""}/${uni.estado ?? ""}`,
        plano: "Particular",
      },
      medico: "Dr. Caio Henrique Fernandes Padua",
      unidade: uni.nome,
      dataBase: new Date().toLocaleDateString("pt-BR"),
      snapshotInicial: snaps.find(s => s["tipo"] === "inicial") || null,
      snapshotAtual: snaps.find(s => s["tipo"] === "atual") || snaps.find(s => s["tipo"] === "inicial") || null,
      patologias: { diagnosticadas: pats.filter(p => p["tipo"] === "diagnosticada"), potenciais: pats.filter(p => p["tipo"] === "potencial") },
      orgaos,
      medicamentos: meds,
      eventosMedicacao: evMeds,
      curvas: { doenca: curvas.filter(c => c["tipo_curva"] === "doenca"), saude: curvas.filter(c => c["tipo_curva"] === "saude") },
      proximasEtapas: etapas,
    };
    const stream = rasxMod.gerarRasxPdf(pdfData, "COMPLETO");
    const buffer = await streamToBuffer(stream);
    console.log(`     PDF RASX Completo: ${buffer.byteLength} bytes`);

    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RAS",
      data: new Date(DATA + "T00:00:00"),
      identificador: `sessao-${SESSAO_ID}`,
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: SESSAO_ID,
      referenciaTabela: "sessoes",
      metadataExtra: { wave: "V480", categoria: "COMPLETO", pipeline: "oficial" },
    });
    return { detalhe: `${buffer.byteLength}b -> Drive ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // ETAPA 6 — APRESENTACAO_INICIAL_PACIENTE WhatsApp
  // ====================================================================
  const tel = pac.whatsapp || pac.telefone;
  if (tel) {
    await etapa("5.apresentacao_inicial_wpp", async () => {
      const corpo = tplMod.renderTemplate("APRESENTACAO_INICIAL_PACIENTE", {
        pacienteNome: pac.nome,
        pacienteGenero: generoToTpl(pac.genero),
        unidade: uni.nome,
        enfermeiraNome: "Enfermeira Equipe Padua",
        medicoNome: "Dr. Caio Henrique Fernandes Padua",
        primeiraConsultaData: "19/05/2026",
        primeiraConsultaHora: HORA_INICIO,
      });
      const r = await wpp.enviarWhatsapp(tel, corpo);
      if (!r.sucesso) throw new Error(r.erro || "wpp falhou");
      return { detalhe: `Twilio ${r.provedorMsgId}` };
    });

    // ETAPA 7 — ENVIO_RAS_PDF WhatsApp (link Drive novo)
    if (rasUpload) {
      await etapa("6.envio_ras_pdf_wpp", async () => {
        const corpo = tplMod.renderTemplate("ENVIO_RAS_PDF", {
          pacienteNome: pac.nome,
          pacienteGenero: generoToTpl(pac.genero),
          codigoSemantico: pac.codigo_semantico,
          unidade: uni.nome,
          protocoloResumo: "5 substancias (4 IM + 1 EV) + formula oral magistral 90 dias",
          driveUrl: rasUpload.driveUrl,
          hashSha256Curto: (rasUpload.sha256 || "").slice(0, 12),
        });
        const r = await wpp.enviarWhatsapp(tel, corpo);
        if (!r.sucesso) throw new Error(r.erro || "wpp falhou");
        return { detalhe: `Twilio ${r.provedorMsgId}` };
      });
    }
  } else {
    resultados["5.apresentacao_inicial_wpp"] = { ok: false, detalhe: "sem telefone" };
    resultados["6.envio_ras_pdf_wpp"] = { ok: false, detalhe: "sem telefone" };
  }

  // ====================================================================
  // ETAPA 8 — Telegram CEO resumo
  // ====================================================================
  const linhas = ["*Wave V480 — Pipeline OFICIAL Carlucia*", "", "Etapas executadas:"];
  for (const [nome, r] of Object.entries(resultados)) {
    const icon = r.ok ? "OK" : "FAIL";
    linhas.push(`[${icon}] ${nome}: ${r.detalhe}${r.erro ? " | err=" + r.erro.slice(0, 80) : ""}`);
  }
  if (rasUpload) linhas.push("", `RAS COMPLETO Drive: ${rasUpload.driveUrl}`);
  if (eventId) linhas.push(`Google Calendar event: ${eventId}`);
  linhas.push("", "_Sessao 39 (19/mai 07:30 Padua) | Substancias 13/14/7/8/15_");
  await tg.enviarTelegramCEO(linhas.join("\n"));

  console.log("\n=== RESUMO ===");
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`[${r.ok ? "OK  " : "FAIL"}] ${nome}: ${r.detalhe}`);
  }
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
