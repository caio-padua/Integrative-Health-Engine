// Wave V482 — RACJ Carlucia: caminho VALIDADO (termos_assinados presencial,
// 155 registros em 31 pacientes em producao, ultimo 15/abr/2026).
//
// Registra 9 termos juridicos relevantes pra sessao 39 (fcrlula manipulada
// + IM Vit D3 + IM B12 + IM CompB + IM Zn/Se + EV Glutationa):
//   1 LGPD, 2 Privacidade, 3 Nao-Garantia, 4 TCLE Global,
//   5 CFOR (formula manipulada), 6 CIMU (intramuscular),
//   7 CEND (endovenosa), 12 Aceite Digital, 13 Ciencia Financeira
//
// Grava texto_no_momento_assinatura COMPLETO (LGPD/CFM) + meio_assinatura
// 'presencial' + profissional_responsavel Dr. Caio + data_assinatura.
// Gera PDF RACJ consolidado (PDFKit institucional) + upload Drive.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import PDFDocument from "pdfkit";

interface WhatsappResult { sucesso: boolean; provedorMsgId?: string; erro?: string; }
interface TelegramResult { sucesso: boolean; erro?: string; }
interface UploadResultado { driveFileId: string; driveUrl: string; nomeArquivo: string; sha256: string | null; arquivoId: number; }

const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string) => Promise<WhatsappResult>;
};
const tg = (await import("../../artifacts/api-server/src/services/telegramService.js" as string)) as {
  enviarTelegramCEO: (mensagem: string) => Promise<TelegramResult>;
};
const driveMod = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const PROFISSIONAL_ID = 1;
const PROFISSIONAL_NOME = "Dr. Caio Henrique Fernandes Padua";
const DATA = "2026-05-19";
const TERMOS_IDS = [1, 2, 3, 4, 5, 6, 7, 12, 13];

interface PacRow { id: number; nome: string; cpf: string; codigo_semantico: string; whatsapp: string | null; telefone: string | null; data_nascimento: string | null; genero: string; }
interface UniRow { id: number; nome: string; endereco: string | null; bairro: string | null; cep: string | null; cidade: string | null; estado: string | null; }
interface TermoRow { id: number; bloco: string; subgrupo: string; categoria: string; titulo: string; texto_completo: string; versao: number; }

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

function gerarPdfRacj(opts: {
  paciente: PacRow;
  unidade: UniRow;
  termos: TermoRow[];
  dataAssinatura: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 50, left: 50, right: 50 }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = 595;
    const AZUL = "#1a3a52";
    const DOURADO = "#b8893d";
    const CINZA = "#444";
    const CINZA_CLARO = "#888";

    // ===== CAPA =====
    doc.rect(0, 0, W, 28).fill(AZUL);
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#fff").text("RACJ — REGISTRO DE ACEITE E CONSENTIMENTO JURIDICO", 50, 9, { width: 495 });

    doc.rect(0, 28, W, 70).fill(AZUL);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#fff").text("RACJ", 50, 42, { width: 360 });
    doc.fontSize(9).font("Helvetica").fillColor(DOURADO).text("Registro de Aceite e Consentimento Juridico", 50, 64);
    doc.fontSize(8).font("Helvetica").fillColor("#fff").text("PADCON UNIVERSAL  •  Manifesto Blueprint v2.0", 50, 78);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DOURADO).text("PAWARDS", 445, 42, { width: 100, align: "right" });
    doc.fontSize(6).font("Helvetica").fillColor("#fff").text("Sistema de Gestao Clinica Integrativa", 445, 54, { width: 100, align: "right" });
    doc.fontSize(7).font("Helvetica").fillColor("#fff").text("INSTITUTO PADUA", 445, 66, { width: 100, align: "right" });

    let y = 120;
    doc.fontSize(11).font("Helvetica-Bold").fillColor(AZUL).text("IDENTIFICACAO DA PARTE SIGNATARIA", 50, y);
    y += 18;
    doc.fontSize(9).font("Helvetica").fillColor(CINZA);
    const idadeMs = opts.paciente.data_nascimento ? Date.now() - new Date(opts.paciente.data_nascimento).getTime() : 0;
    const idade = idadeMs ? Math.floor(idadeMs / 31557600000) + " anos" : "-";
    const linhasIdent = [
      `Nome completo: ${opts.paciente.nome}`,
      `CPF: ${opts.paciente.cpf || "-"}    Idade: ${idade}    Genero: ${opts.paciente.genero}`,
      `Codigo semantico interno: ${opts.paciente.codigo_semantico}`,
      `Clinica: ${opts.unidade.nome}`,
      `Endereco: ${opts.unidade.endereco ?? ""} - ${opts.unidade.bairro ?? ""} - ${opts.unidade.cidade ?? ""}/${opts.unidade.estado ?? ""} - CEP ${opts.unidade.cep ?? ""}`,
      `Medico responsavel: ${PROFISSIONAL_NOME}`,
      `Data de assinatura: ${new Date(opts.dataAssinatura + "T00:00:00").toLocaleDateString("pt-BR")}`,
      `Meio de assinatura: PRESENCIAL`,
    ];
    for (const l of linhasIdent) {
      doc.text(l, 50, y, { width: 495 });
      y += 13;
    }

    y += 10;
    doc.fontSize(11).font("Helvetica-Bold").fillColor(AZUL).text("INDICE DE TERMOS ASSINADOS", 50, y);
    y += 18;
    doc.fontSize(8).font("Helvetica").fillColor(CINZA);
    opts.termos.forEach((t, i) => {
      doc.text(`${String(i + 1).padStart(2, "0")}. [${t.bloco}.${t.subgrupo} v${t.versao}] ${t.titulo}`, 50, y, { width: 495 });
      y += 12;
    });

    // ===== CADERNOS POR TERMO =====
    for (const t of opts.termos) {
      doc.addPage();
      doc.rect(0, 0, W, 22).fill(AZUL);
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#fff").text(`${t.bloco}.${t.subgrupo} - ${t.categoria.toUpperCase()}  •  versao ${t.versao}`, 50, 7, { width: 495 });

      doc.fontSize(11).font("Helvetica-Bold").fillColor(AZUL).text(t.titulo, 50, 40, { width: 495 });
      doc.fontSize(8).font("Helvetica-Oblique").fillColor(CINZA_CLARO).text(`Texto integral conforme cadastrado em termos_juridicos.id=${t.id} no momento da assinatura.`, 50, 70, { width: 495 });
      doc.fontSize(9).font("Helvetica").fillColor(CINZA).text(t.texto_completo, 50, 95, { width: 495, align: "justify", lineGap: 2 });

      // assinatura
      let yA = doc.y + 25;
      if (yA > 720) { doc.addPage(); yA = 80; }
      doc.moveTo(60, yA).lineTo(280, yA).stroke(CINZA);
      doc.moveTo(320, yA).lineTo(540, yA).stroke(CINZA);
      doc.fontSize(7).font("Helvetica").fillColor(CINZA_CLARO).text(`${opts.paciente.nome} (paciente) - CPF ${opts.paciente.cpf}`, 60, yA + 4, { width: 220 });
      doc.fontSize(7).font("Helvetica").fillColor(CINZA_CLARO).text(`${PROFISSIONAL_NOME} (medico responsavel)`, 320, yA + 4, { width: 220 });
      doc.fontSize(7).font("Helvetica-Bold").fillColor(DOURADO).text(`Assinado presencialmente em ${new Date(opts.dataAssinatura + "T00:00:00").toLocaleDateString("pt-BR")} - sessao 39 - Instituto Padua`, 50, yA + 22, { width: 495, align: "center" });
    }

    // footer todas paginas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(6).font("Helvetica").fillColor(CINZA_CLARO).text(
        `RACJ - ${opts.paciente.codigo_semantico} - pagina ${i + 1} de ${range.count}  •  PAWARDS Instituto Padua  •  Manifesto Blueprint v2.0`,
        50, 820, { width: 495, align: "center" },
      );
    }

    doc.end();
  });
}

async function main() {
  console.log("=== Wave V482 — RACJ Carlucia (caminho validado presencial) ===");

  const pac = ((await db.execute(sql`SELECT id,nome,cpf,codigo_semantico,whatsapp,telefone,data_nascimento,genero FROM pacientes WHERE id=${PACIENTE_ID}`)) as unknown as { rows: PacRow[] }).rows[0]!;
  const uni = ((await db.execute(sql`SELECT id,nome,endereco,bairro,cep,cidade,estado FROM unidades WHERE id=${UNIDADE_ID}`)) as unknown as { rows: UniRow[] }).rows[0]!;
  const termos = ((await db.execute(sql`SELECT id,bloco,subgrupo,categoria,titulo,texto_completo,versao FROM termos_juridicos WHERE id IN (1,2,3,4,5,6,7,12,13) AND ativo=true ORDER BY id`)) as unknown as { rows: TermoRow[] }).rows;

  if (termos.length !== TERMOS_IDS.length) {
    throw new Error(`Esperava ${TERMOS_IDS.length} termos, recebi ${termos.length}`);
  }

  // ====================================================================
  // ETAPA 1 — Gravar 9 termos_assinados (idempotente)
  // ====================================================================
  await etapa("1.gravar_termos_assinados", async () => {
    const ja = ((await db.execute(sql`SELECT count(*)::int AS n FROM termos_assinados WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0;
    if (ja > 0) return { detalhe: `${ja} termos ja registrados, pulando` };

    for (const t of termos) {
      await db.execute(sql`
        INSERT INTO termos_assinados (paciente_id, termo_id, versao_assinada, titulo_termo, texto_no_momento_assinatura, meio_assinatura, profissional_responsavel, observacao, data_assinatura)
        VALUES (${PACIENTE_ID}, ${t.id}, ${t.versao}, ${t.titulo}, ${t.texto_completo}, 'presencial', ${PROFISSIONAL_NOME}, ${'Sessao 39 - 19/mai/2026 07:30 - Instituto Padua'}, ${DATA + ' 07:30:00-03'}::timestamptz)
      `);
    }
    return { detalhe: `${termos.length} termos gravados (LGPD + Privacidade + Nao-Garantia + TCLE Global + CFOR + CIMU + CEND + Aceite Digital + Ciencia Financeira)` };
  });

  // ====================================================================
  // ETAPA 2 — Gerar PDF RACJ consolidado + upload Drive
  // ====================================================================
  const upload = await etapa<UploadResultado>("2.gerar_pdf_racj_consolidado", async () => {
    const buffer = await gerarPdfRacj({ paciente: pac, unidade: uni, termos, dataAssinatura: DATA });
    console.log(`     PDF RACJ Consolidado: ${buffer.byteLength} bytes (${termos.length} cadernos juridicos)`);

    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RACJ",
      data: new Date(DATA + "T00:00:00"),
      identificador: "sessao-39",
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: 39,
      referenciaTabela: "sessoes",
      metadataExtra: { wave: "V482", caderno: "RACJ", termos_assinados: termos.map(t => ({ id: t.id, versao: t.versao, categoria: t.categoria })), meio: "presencial" },
    });
    return { detalhe: `${buffer.byteLength}b -> ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // ETAPA 3 — WhatsApp Carlucia
  // ====================================================================
  const tel = pac.whatsapp || pac.telefone;
  if (tel && upload) {
    await etapa("3.wpp_racj_carlucia", async () => {
      const primeiro = pac.nome.split(" ")[0] || pac.nome;
      const corpo = [
        `Ola ${primeiro},`,
        "",
        "Segue copia do seu *RACJ - Registro de Aceite e Consentimento Juridico* assinado presencialmente hoje no Instituto Padua:",
        "",
        `*${termos.length} termos juridicos consolidados:*`,
        "- Consentimento LGPD (Lei 13.709/2018)",
        "- Politica de Privacidade e Sigilo Medico (CFM)",
        "- Termo de Nao-Garantia de Resultados",
        "- TCLE Global do Protocolo Terapeutico",
        "- Consentimento Especifico - Formulas Manipuladas (CFOR)",
        "- Consentimento Especifico - Aplicacao Intramuscular (CIMU)",
        "- Consentimento Especifico - Aplicacao Endovenosa (CEND)",
        "- Aceite Digital e Validade Juridica",
        "- Ciencia Financeira e Aceitacao Comercial",
        "",
        `PDF oficial: ${upload.driveUrl}`,
        `Verificacao SHA-256: ${(upload.sha256 || "").slice(0, 12)}`,
        "",
        "Guarde este documento - tem validade juridica plena (registro presencial).",
        "",
        "_PAWARDS - Instituto Padua_",
        "_Developed by Pawards MedCore_",
      ].join("\n");
      const r = await wpp.enviarWhatsapp(tel, corpo);
      if (!r.sucesso) throw new Error(r.erro || "wpp falhou");
      return { detalhe: `Twilio ${r.provedorMsgId}` };
    });
  }

  // ====================================================================
  // ETAPA 4 — Telegram CEO
  // ====================================================================
  const linhas: string[] = [
    "*Wave V482 — RACJ Carlucia (caminho validado)*",
    "",
    "Caminho usado: termos_assinados presencial (mesmo fluxo dos 155 registros existentes em 31 pacientes).",
    "",
    "Etapas:",
  ];
  for (const [nome, r] of Object.entries(resultados)) {
    linhas.push(`[${r.ok ? "OK" : "FAIL"}] ${nome}: ${r.detalhe}${r.erro ? " | " + r.erro.slice(0, 80) : ""}`);
  }
  linhas.push("");
  if (upload) linhas.push(`RACJ Consolidado: ${upload.driveUrl}`);
  linhas.push("");
  linhas.push(`9 termos gravados em termos_assinados (paciente_id=${PACIENTE_ID}):`);
  linhas.push("LGPD + Privacidade + Nao-Garantia + TCLE Global + CFOR + CIMU + CEND + Aceite Digital + Ciencia Financeira");
  linhas.push("");
  linhas.push("ZapSign ICP-Brasil continua pendente (precisa MEDICO_EMAIL + signatario configurado).");
  await tg.enviarTelegramCEO(linhas.join("\n"));

  console.log("\n=== RESUMO ===");
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`[${r.ok ? "OK  " : "FAIL"}] ${nome}: ${r.detalhe}`);
  }
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
