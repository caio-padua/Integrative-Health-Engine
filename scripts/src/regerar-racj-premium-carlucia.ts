// Wave V484 — Regerar RACJ Carlucia no padrao Manifesto Blueprint v2.0
// (Plano Dr. Claude 18/mai/2026): layout premium + Bloco Aplicavel por termo
// mostrando o tratamento real desta sessao (1 formula + 4 IM + 1 EV).
//
// NAO recria termos_assinados (ja persistidos pela Wave V482, hash auditado).
// Apenas regera o PDF consolidado + sobe novo no Drive (mesmo paciente,
// identificador 'sessao-39-premium' pra coexistir com a versao v1.5).

import PDFKit from "pdfkit"; // garante que pdfkit esta no resolver
void PDFKit;

interface UploadResultado { driveFileId: string; driveUrl: string; nomeArquivo: string; sha256: string | null; arquivoId: number; }
interface TermoRow { id: number; bloco: string; subgrupo: string; categoria: string; titulo: string; texto_completo: string; versao: number }

const carregar = (await import("../../artifacts/api-server/src/lib/clinica/carregarTratamentoSessao.js" as string)) as {
  carregarTratamentoSessao: (sessaoId: number, opts?: { profissionalId?: number }) => Promise<import("../../artifacts/api-server/src/lib/clinica/carregarTratamentoSessao.js").TratamentoSessao>;
};
const racj = (await import("../../artifacts/api-server/src/pdf/racjPdf.js" as string)) as {
  gerarPdfRacj: (d: import("../../artifacts/api-server/src/pdf/racjPdf.js").DadosRacjPdf) => NodeJS.ReadableStream & { pipe: unknown };
  streamParaBufferRacj: (s: NodeJS.ReadableStream) => Promise<Buffer>;
  tokenVerificacaoRacj: (p: number, s: number, d: string) => string;
};
const drive = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};
const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string) => Promise<{ sucesso: boolean; provedorMsgId?: string; erro?: string }>;
};
const tg = (await import("../../artifacts/api-server/src/services/telegramService.js" as string)) as {
  enviarTelegramCEO: (m: string) => Promise<{ sucesso: boolean; erro?: string }>;
};
const { db } = (await import("@workspace/db" as string)) as typeof import("@workspace/db");
const { sql } = (await import("drizzle-orm" as string)) as typeof import("drizzle-orm");

const SESSAO_ID = 39;
const DATA = "2026-05-19";
const TERMOS_IDS = [1, 2, 3, 4, 5, 6, 7, 12, 13];

function rows<T>(r: unknown): T[] { return ((r as { rows?: T[] }).rows) || []; }

async function main() {
  console.log("=== Wave V484 — RACJ Carlucia PREMIUM (Plano Dr. Claude) ===");

  const tratamento = await carregar.carregarTratamentoSessao(SESSAO_ID, { profissionalId: 1 });
  console.log(`[ok] tratamento carregado: ${tratamento.formulas.length}f + ${tratamento.aplicacoesIm.length}IM + ${tratamento.aplicacoesEv.length}EV`);

  const termos = rows<TermoRow>(await db.execute(sql`
    SELECT id, bloco, subgrupo, categoria, titulo, texto_completo, versao
    FROM termos_juridicos
    WHERE id IN (1,2,3,4,5,6,7,12,13) AND ativo = true
    ORDER BY id
  `));
  console.log(`[ok] ${termos.length} termos juridicos carregados`);

  const token = racj.tokenVerificacaoRacj(tratamento.paciente.id, SESSAO_ID, DATA);

  const stream = racj.gerarPdfRacj({
    tratamento,
    termos: termos.map(t => ({
      id: t.id, bloco: t.bloco, subgrupo: t.subgrupo, categoria: t.categoria,
      titulo: t.titulo, textoCompleto: t.texto_completo, versao: t.versao,
    })),
    dataAssinatura: DATA,
    meioAssinatura: "presencial",
    envelopeId: "8f0eb530-71e6-4525-8750-07876d9331f6",
    provedorAssinatura: "zapsign (envelope paralelo eletronico — solicitacao 257)",
    tokenVerificacao: token,
    observacaoSessao: "sessao 39 — Instituto Padua",
  });

  const buffer = await racj.streamParaBufferRacj(stream as unknown as NodeJS.ReadableStream);
  console.log(`[ok] PDF RACJ Premium gerado: ${buffer.byteLength} bytes`);

  const up = await drive.uploadArquivoPaciente({
    pacienteId: tratamento.paciente.id,
    unidadeId: tratamento.unidade.id,
    tipo: "RACJ",
    data: new Date(DATA + "T00:00:00"),
    identificador: "sessao-39-premium",
    codigoSemantico: tratamento.paciente.codigoSemantico,
    pacienteNome: tratamento.paciente.nome,
    conteudo: buffer,
    mimeType: "application/pdf",
    geradoPorUserId: tratamento.profissional.id,
    referenciaId: SESSAO_ID,
    referenciaTabela: "sessoes",
    metadataExtra: {
      wave: "V484",
      caderno: "RACJ_PREMIUM",
      plano_dr_claude: "Manifesto Blueprint v2.0",
      tratamento_resumo: {
        formulas: tratamento.formulas.length,
        aplicacoes_im: tratamento.aplicacoesIm.length,
        aplicacoes_ev: tratamento.aplicacoesEv.length,
      },
      termos_ids: TERMOS_IDS,
      token_verificacao: token,
    },
  });
  console.log(`[ok] upload Drive: ${up.driveUrl}`);

  const tel = tratamento.paciente.whatsapp || tratamento.paciente.telefone;
  if (tel) {
    const primeiro = tratamento.paciente.nome.split(" ")[0] || tratamento.paciente.nome;
    const corpo = [
      `Ola ${primeiro},`,
      "",
      "Atualizei seu *RACJ* com o layout institucional premium do Instituto Padua. Esta versao traz, em cada termo aplicavel, o detalhamento do seu plano terapeutico desta sessao:",
      "",
      `- ${tratamento.formulas.length} formula manipulada ativa`,
      `- ${tratamento.aplicacoesIm.length} aplicacoes intramusculares (IM) agendadas`,
      `- ${tratamento.aplicacoesEv.length} aplicacao endovenosa (EV)`,
      "",
      `PDF: ${up.driveUrl}`,
      `Verificacao: pawards.med.br/v/${token}`,
      "",
      "_PAWARDS - Instituto Padua_",
      "_Developed by Pawards MedCore_",
    ].join("\n");
    const r = await wpp.enviarWhatsapp(tel, corpo);
    console.log(`[wpp] ${r.sucesso ? "OK " + r.provedorMsgId : "FAIL " + r.erro}`);
  }

  await tg.enviarTelegramCEO([
    "*Wave V484 — RACJ Premium Carlucia (Plano Dr. Claude)*",
    "",
    `PDF: ${buffer.byteLength} bytes (anterior v1.5: 67.541b)`,
    `Drive: ${up.driveUrl}`,
    `Token verificacao: ${token}`,
    "",
    "Personalizacao por termo:",
    `- TCLE Global: sumario consolidado (${tratamento.formulas.length}f + ${tratamento.aplicacoesIm.length}IM + ${tratamento.aplicacoesEv.length}EV)`,
    `- CFOR: tabela formula manipulada (Mg + Zn + Vit D3)`,
    `- CIMU: tabela 4 aplicacoes IM (Vit D3, B12, CompB, Zn/Se)`,
    `- CEND: tabela aplicacao EV (Glutationa 1200mg)`,
    `- FINA: bloco financeiro referencial`,
    "- LGPD/Privacidade/NaoGarantia/AceiteDigital: genericos (selo, sem personalizacao)",
    "",
    "termos_assinados intactos (Wave V482, hash auditado nao mexido).",
  ].join("\n"));
  console.log("[telegram] CEO notificado.");
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
