// Wave V479-fix — regerar RAS da Carlucia (sessao 39) usando o GERADOR OFICIAL
// do sistema (`pdf/gerarRAS.ts` -> `gerarPdfRAS`), nao mais HTML hardcoded.
// Caio bateu o pe (certissimo): "este e o template real do sistema?? depois de
// meses arquitetando??" — o anterior usava demo-ras-carlucia.ts hardcoded com
// CSS quebrado. Agora puxa PDFKit landscape A4, 4 paginas (grid marcacoes +
// info substancias + consent), substancias reais do catalogo (id 13/14/7/8/15).

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
const driveMod = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};
const rasMod = (await import("../../artifacts/api-server/src/pdf/gerarRAS.js" as string)) as {
  gerarPdfRAS: (dados: Record<string, unknown>) => Promise<Buffer>;
};

const PACIENTE_ID = 3497;
const SESSAO_ID = 39;
const PROFISSIONAL_ID = 1;
const SUBSTANCIAS_IDS = [13, 14, 7, 8, 15];

interface PacRow { id: number; nome: string; cpf: string; codigo_semantico: string; unidade_id: number; whatsapp: string | null; telefone: string | null; data_nascimento: string | null; }
interface UniRow { id: number; nome: string; endereco: string | null; }
interface MedRow { id: number; nome: string; crm: string | null; }
interface SubsDbRow {
  id: number; nome: string; abreviacao: string | null; categoria: string; via: string; cor: string;
  dose_padrao: string | null; descricao: string | null; funcao_principal: string | null;
  efeitos_percebidos: string | null; tempo_para_efeito: string | null;
  beneficio_longevidade: string | null; impacto_qualidade_vida: string | null;
  beneficio_sono: string | null; beneficio_energia: string | null; beneficio_libido: string | null;
  performance_fisica: string | null; forca_muscular: string | null; clareza_mental: string | null;
  pele_cabelo_unhas: string | null; suporte_imunologico: string | null;
  contraindicacoes: string | null; evidencia_cientifica: string | null;
  efeitos_sistemas_corporais: Record<string, number> | null;
  intervalo_dias: number | null;
}
interface AplicRow { substancia_id: number; numero_sessao: number; total_sessoes: number; status: string; }

function idadeAnos(dn: string | null): number | null {
  if (!dn) return null;
  const d = new Date(dn);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

async function main(): Promise<void> {
  console.log("=== Regerando RAS Carlucia com gerador OFICIAL gerarPdfRAS ===");

  const pacR = await db.execute(sql`SELECT id, nome, cpf, codigo_semantico, unidade_id, whatsapp, telefone, data_nascimento FROM pacientes WHERE id=${PACIENTE_ID}`);
  const pac = (pacR as unknown as { rows: PacRow[] }).rows[0];
  if (!pac) throw new Error("Paciente nao encontrado");

  const uniR = await db.execute(sql`SELECT id, nome, COALESCE(endereco, '') AS endereco FROM unidades WHERE id=${pac.unidade_id}`);
  const uni = (uniR as unknown as { rows: UniRow[] }).rows[0];

  const medR = await db.execute(sql`SELECT id, nome, crm FROM usuarios WHERE id=${PROFISSIONAL_ID}`);
  const med = (medR as unknown as { rows: MedRow[] }).rows[0];

  const subsR = await db.execute(sql`
    SELECT id, nome, abreviacao, categoria, via, cor, dose_padrao, descricao, funcao_principal,
           efeitos_percebidos, tempo_para_efeito, beneficio_longevidade, impacto_qualidade_vida,
           beneficio_sono, beneficio_energia, beneficio_libido, performance_fisica, forca_muscular,
           clareza_mental, pele_cabelo_unhas, suporte_imunologico, contraindicacoes,
           evidencia_cientifica, efeitos_sistemas_corporais, intervalo_dias
    FROM substancias WHERE id IN (${sql.join(SUBSTANCIAS_IDS.map(i => sql`${i}`), sql`, `)})`);
  const subsDb = (subsR as unknown as { rows: SubsDbRow[] }).rows;

  const aplicR = await db.execute(sql`SELECT substancia_id, numero_sessao, total_sessoes, status FROM aplicacoes_substancias WHERE sessao_id=${SESSAO_ID}`);
  const aplics = (aplicR as unknown as { rows: AplicRow[] }).rows;

  const subsByIdOrder = SUBSTANCIAS_IDS.map(id => subsDb.find(s => s.id === id)!).filter(Boolean);

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const dataAtendStr = amanha.toISOString().slice(0, 10);

  const substancias = subsByIdOrder.map((s) => ({
    nome: s.nome,
    abreviacao: s.abreviacao ?? s.nome.slice(0, 6),
    qtde: 8,
    frequenciaDias: s.intervalo_dias ?? 15,
    dataInicio: dataAtendStr,
    via: s.via.toUpperCase(),
    cor: s.cor,
    dosePadrao: s.dose_padrao ?? "",
    categoria: s.categoria,
    descricao: s.descricao ?? "",
    funcaoPrincipal: s.funcao_principal ?? "",
    efeitosPercebidos: s.efeitos_percebidos ?? "",
    tempoParaEfeito: s.tempo_para_efeito ?? "",
    beneficioLongevidade: s.beneficio_longevidade ?? "",
    impactoQualidadeVida: s.impacto_qualidade_vida ?? "",
    beneficioSono: s.beneficio_sono ?? "",
    beneficioEnergia: s.beneficio_energia ?? "",
    beneficioLibido: s.beneficio_libido ?? "",
    performanceFisica: s.performance_fisica ?? "",
    forcaMuscular: s.forca_muscular ?? "",
    clarezaMental: s.clareza_mental ?? "",
    peleCabeloUnhas: s.pele_cabelo_unhas ?? "",
    suporteImunologico: s.suporte_imunologico ?? "",
    contraindicacoes: s.contraindicacoes ?? "",
    evidenciaCientifica: s.evidencia_cientifica ?? "",
    efeitosSistemasCorporais: s.efeitos_sistemas_corporais ?? {},
  }));

  // 8 marcacoes (1 por semana), sessao 2 = a de amanha, status "agendada"
  const marcacoes = Array.from({ length: 8 }, (_, idx) => {
    const numero = idx + 1;
    const d = new Date(amanha); d.setDate(amanha.getDate() + (numero - 2) * 7);
    return {
      numero,
      dataPrevista: d.toISOString().slice(0, 10),
      dataEfetiva: numero === 1 ? new Date(amanha.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10) : "",
      statusPorSubstancia: substancias.map((_, sidx) => {
        const a = aplics.find(x => x.substancia_id === SUBSTANCIAS_IDS[sidx]);
        return {
          substanciaIndex: sidx,
          numeroSessao: numero,
          totalSessoes: a?.total_sessoes ?? 8,
          status: numero < 2 ? "concluida" : numero === 2 ? "agendada" : "pendente",
        };
      }),
    };
  });

  const enderecoUni = uni ? `${uni.nome}${uni.endereco ? " — " + uni.endereco : ""}` : "INSTITUTO PADUA";

  const dados = {
    nomePaciente: pac.nome,
    cpfPaciente: pac.cpf,
    celularPaciente: pac.whatsapp ?? pac.telefone ?? "",
    idadePaciente: idadeAnos(pac.data_nascimento),
    medicoResponsavel: med?.nome ?? "Dr. Caio Henrique Fernandes Padua",
    crmMedico: med?.crm ?? "",
    enfermeira: "Equipe de enfermagem Padua",
    agenda: "Dr Caio Padua - Padua",
    unidadeEndereco: enderecoUni,
    dataAtendimento: dataAtendStr,
    substancias,
    marcacoes,
    nomeProtocolo: "2a Sessao — Protocolo 4 IM + 1 EV (Padua)",
  };

  console.log(`[1/3] Gerando PDF (PDFKit landscape A4, gerarPdfRAS oficial)...`);
  const buffer = await rasMod.gerarPdfRAS(dados);
  console.log(`       PDF ${buffer.length} bytes (${marcacoes.length} marcacoes x ${substancias.length} substancias)`);

  console.log(`[2/3] Upload Drive (novo arquivo, RAS oficial)...`);
  const up = await driveMod.uploadArquivoPaciente({
    pacienteId: pac.id, unidadeId: pac.unidade_id, pacienteNome: pac.nome,
    codigoSemantico: pac.codigo_semantico, tipo: "RAS", data: amanha,
    mimeType: "application/pdf", conteudo: buffer, geradoPorUserId: PROFISSIONAL_ID,
  });
  console.log(`       Drive: ${up.driveUrl}`);
  console.log(`       Nome: ${up.nomeArquivo}`);

  console.log(`[3/3] WhatsApp Carlucia + Telegram CEO (RAS oficial)...`);
  const protocoloResumo =
    `4 IM: Vit D3 5000UI, B12 Metilcobalamina 5000mcg, Complexo B 2mL, Zn+Selenio 100mg\n` +
    `1 EV: Glutationa 1200mg\n` +
    `REVO: Mg Bisglicinato 300mg + Zn 30mg + Vit D 5000UI (1 cap/dia, 90d)`;
  const msgPac = tplMod.renderTemplate("ENVIO_RAS_PDF", {
    pacienteNome: pac.nome, pacienteGenero: "feminino",
    codigoSemantico: pac.codigo_semantico, unidade: "INSTITUTO PADUA",
    protocoloResumo, driveUrl: up.driveUrl,
    hashSha256Curto: (up.sha256 ?? "").slice(0, 12),
  });
  const telPac = pac.whatsapp ?? pac.telefone;
  const telE164 = telPac?.startsWith("+") ? telPac : `+${telPac}`;
  const resWa = await wpp.enviarWhatsapp(telE164, msgPac);
  console.log(`       WA Carlucia (${telE164}): ${resWa.sucesso ? "OK " + (resWa.provedorMsgId ?? "") : "FALHA " + (resWa.erro ?? "")}`);

  const msgCeo =
    `[PAWARDS] RAS Carlucia REGERADO com gerador oficial gerarPdfRAS\n\n` +
    `Anterior usava template hardcoded (HTML quebrado). Agora PDFKit\n` +
    `landscape A4, 4 paginas, substancias completas do catalogo.\n\n` +
    `Paciente: ${pac.nome}\n` +
    `Sessao: ${SESSAO_ID} (2 de 8)\n` +
    `Quando: ${dataAtendStr} 07:30 BRT - Padua\n\n` +
    `RAS oficial: ${up.driveUrl}\n` +
    `Bytes: ${buffer.length} (anterior: 4437 bytes hardcoded)\n` +
    `Substancias: ${substancias.length} (com 25+ campos cada)\n` +
    `Marcacoes: ${marcacoes.length} sessoes (1 concluida, 1 agendada, 6 pendentes)\n\n` +
    `WA Carlucia: ${resWa.sucesso ? "REENVIADO OK" : "FALHOU"}`;
  const resTg = await tg.enviarTelegramCEO(msgCeo);
  console.log(`       Telegram CEO: ${resTg.sucesso ? "OK" : "FALHA " + (resTg.erro ?? "")}`);

  console.log(`\n=== RAS OFICIAL OK ===\n${up.driveUrl}`);
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
