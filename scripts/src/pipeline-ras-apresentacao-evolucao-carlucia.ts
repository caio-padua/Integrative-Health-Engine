// Wave V485 — Dupla RAS Premium Craniotomia (Apresentacao Inicial + Evolucao 3a Semana)
// Demo investidora Carlucia 19/mai 07:30. Caio quer 2 PDFs:
//   PDF-1 APRESENTACAO INICIAL (D0): snapshot pre-tratamento, plano definido,
//     curvas D0 com valores doenca, 0 aplicacoes. KPI sem delta.
//   PDF-2 EVOLUCAO 3a SEMANA (D21): snapshot atual com 3 semanas, curvas D0/D7/D14/D21
//     mostrando declinio doenca + ascensao saude, ja 2/5 Vit D + 3/8 B12 aplicadas.
// Cenario ficticio (Caio definiu):
//   - Vit D3 megadose 600.000 UI IM, 5x 15/15 dias
//   - Vit B12 Metilcobalamina 2.500 mcg IM, 8x 7/7 dias
//   - 1 formula manipulada nova: "Composto Equilibrio Manha-Noite"
//     posologia "1 dose VO antes do cafe da manha + 1 dose VO antes do jantar"
// Estetica = Craniotomia V4: KPI pills horizontais, matriz densa dos 11 cadernos,
// header faixa unica, footer com legenda inline, font 6-8pt, padding 3px, zebra.
// Os dados ficticios sao passados in-memory (NAO sao persistidos) pra nao poluir
// o banco — o REVO real ja foi populado na V481 e e usado como base.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

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
const rasxMod = (await import("../../artifacts/api-server/src/pdf/rasxPdf.js" as string)) as {
  gerarRasxPdf: (
    data: Record<string, unknown>,
    categoria?: "COMPLETO" | "CLINICO" | "EVOLUTIVO" | "ESTADO_SAUDE",
  ) => NodeJS.ReadableStream;
};

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const PROFISSIONAL_ID = 1;
const SESSAO_ID = 39;
const DATA_DEMO = "2026-05-19";

interface PacRow { id: number; nome: string; cpf: string; codigo_semantico: string; whatsapp: string | null; telefone: string | null; email: string | null; data_nascimento: string | null; genero: string; }
interface UniRow { id: number; nome: string; endereco: string | null; bairro: string | null; cep: string | null; cidade: string | null; estado: string | null; }
interface MedRow { id: number; nome: string; crm: string | null; }

function streamToBuffer(s: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    s.on("data", (c: Buffer) => chunks.push(c));
    s.on("end", () => resolve(Buffer.concat(chunks)));
    s.on("error", reject);
  });
}

function sha12(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
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

// ============================================================================
// CENARIO FICTICIO — fonte de verdade unica (in-memory)
// ============================================================================
const POSOLOGIA_FORMULA = "1 dose VO antes do cafe da manha + 1 dose VO antes do jantar";

const MEDICAMENTOS_BASE = [
  // Formula manipulada nova
  {
    id: 9001,
    nome: "Formula Magistral — Composto Equilibrio Manha-Noite",
    medicamentoDoseInline: "Composto Equilibrio Manha-Noite — cap. magistral lote unico",
    dose: "1 cap dose-cafe + 1 cap dose-jantar",
    posologia: POSOLOGIA_FORMULA,
    posologiaEstruturada: null,
    origemPosologia: "manual",
    motivoUso: "Modulacao bioquimica matinal/noturna + suporte energia/sono",
    indicacaoClinica: "Reposicao integrativa em fase ataque (3 semanas) — protocolo Padua",
    statusAtual: "em_uso",
    tempoUso: "3 semanas",
    substituicaoNatural: "Substitui necessidade de polifarmacia diurna (3+ caps separadas)",
    evidenciaMelhora: "Sono mais profundo (relato paciente), energia matinal estavel",
    criterioReducao: "Apos 90 dias re-avaliar Vit D + cortisol salivar 4x",
    tipoMed: "formula",
    componentesFormula: [
      { substancia: "Magnesio Bisglicinato", dosagem: "300 mg/dose" },
      { substancia: "Zinco Quelato", dosagem: "30 mg/dose" },
      { substancia: "Selenometionina", dosagem: "200 mcg/dose" },
      { substancia: "Vitamina B6 P5P", dosagem: "25 mg/dose" },
      { substancia: "L-Teanina (dose-jantar)", dosagem: "150 mg/dose" },
      { substancia: "Inositol (dose-jantar)", dosagem: "500 mg/dose" },
    ],
  },
  // Vitamina D3 megadose 600.000 UI IM 5x 15/15
  {
    id: 9002,
    nome: "Vitamina D3 Megadose IM",
    medicamentoDoseInline: "Vitamina D3 Colecalciferol — 600.000 UI IM (megadose)",
    dose: "600.000 UI",
    posologia: "1 amp IM a cada 15 dias × 5 aplicacoes (total 75 dias)",
    posologiaEstruturada: null,
    origemPosologia: "manual",
    motivoUso: "Hipovitaminose D severa (18 ng/mL — abaixo 30 ng/mL institucional)",
    indicacaoClinica: "Reposicao acelerada via IM. Megadose por insuficiencia cronica documentada.",
    statusAtual: "em_uso",
    tempoUso: "3 semanas (2 de 5 aplicacoes feitas)",
    substituicaoNatural: "Exposicao solar 20min/dia + dieta rica em colecalciferol natural",
    evidenciaMelhora: "Reflexo serico esperado em 60 dias — re-checagem Vit D",
    criterioReducao: "Manter ate 5/5; pos-completar transitar p/ Vit D oral 2.000 UI/dia",
    tipoMed: "remedio",
    componentesFormula: null,
  },
  // Vitamina B12 Metilcobalamina 2.500 mcg IM 8x 7/7
  {
    id: 9003,
    nome: "Vitamina B12 Metilcobalamina IM",
    medicamentoDoseInline: "Vitamina B12 (Metilcobalamina) — 2.500 mcg IM",
    dose: "2.500 mcg",
    posologia: "1 amp IM a cada 7 dias × 8 aplicacoes (total 56 dias)",
    posologiaEstruturada: null,
    origemPosologia: "manual",
    motivoUso: "Deficiencia funcional B12 (240 pg/mL com homocisteina 14)",
    indicacaoClinica: "Forma metilada — by-pass MTHFR. Reposicao semanal x 8 sessoes.",
    statusAtual: "em_uso",
    tempoUso: "3 semanas (3 de 8 aplicacoes feitas)",
    substituicaoNatural: "B12 sublingual oral diaria pos-fase ataque",
    evidenciaMelhora: "Energia matinal +35% (escala subjetiva), cognicao +20%",
    criterioReducao: "Apos 8/8 transitar p/ B12 sublingual 1.000 mcg/dia",
    tipoMed: "remedio",
    componentesFormula: null,
  },
];

// Eventos medicacao timeline 3 semanas (D0 ate D21) — para PDF-2 EVOLUCAO
const EVENTOS_MED_D21 = [
  { medicamentoId: 9001, data: "2026-04-28", apresentacao: "Composto Equilibrio Manha-Noite", posologia: POSOLOGIA_FORMULA, status: "iniciado", substituicaoNatural: null, leituraClinica: "D0 — inicio formula magistral" },
  { medicamentoId: 9002, data: "2026-04-28", apresentacao: "Vitamina D3 600.000 UI IM (1/5)", posologia: "1 amp IM 15/15", status: "aplicado", substituicaoNatural: null, leituraClinica: "D0 — 1a aplicacao megadose" },
  { medicamentoId: 9003, data: "2026-04-28", apresentacao: "B12 Metilcobalamina 2.500 mcg IM (1/8)", posologia: "1 amp IM 7/7", status: "aplicado", substituicaoNatural: null, leituraClinica: "D0 — 1a aplicacao B12" },
  { medicamentoId: 9003, data: "2026-05-05", apresentacao: "B12 Metilcobalamina 2.500 mcg IM (2/8)", posologia: "1 amp IM 7/7", status: "aplicado", substituicaoNatural: null, leituraClinica: "D7 — 2a aplicacao B12" },
  { medicamentoId: 9002, data: "2026-05-13", apresentacao: "Vitamina D3 600.000 UI IM (2/5)", posologia: "1 amp IM 15/15", status: "aplicado", substituicaoNatural: null, leituraClinica: "D15 — 2a aplicacao megadose" },
  { medicamentoId: 9003, data: "2026-05-12", apresentacao: "B12 Metilcobalamina 2.500 mcg IM (3/8)", posologia: "1 amp IM 7/7", status: "aplicado", substituicaoNatural: null, leituraClinica: "D14 — 3a aplicacao B12" },
  { medicamentoId: 9001, data: "2026-05-15", apresentacao: "Formula Composto Equilibrio — adesao", posologia: POSOLOGIA_FORMULA, status: "adesao_verificada", substituicaoNatural: null, leituraClinica: "D17 — adesao 92% (relato paciente)" },
];

// Curvas D0 (somente inicio) — PDF-1
const CURVAS_D0 = {
  doenca: [
    { indicador: "Vitamina D 25(OH) abaixo da meta", valor: 82, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "B12 serica baixa (240 pg/mL)", valor: 75, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "Homocisteina elevada (14)", valor: 68, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "Cortisol noturno elevado (12 mcg/dL)", valor: 72, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "GGT limitrofe (38)", valor: 55, unidade: "%", data_registro: "2026-04-28" },
  ],
  saude: [
    { indicador: "Energia matinal subjetiva", valor: 30, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "Qualidade sono profundo", valor: 35, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "Capacidade cognitiva funcional", valor: 40, unidade: "%", data_registro: "2026-04-28" },
    { indicador: "Densidade ossea estimada", valor: 60, unidade: "%", data_registro: "2026-04-28" },
  ],
};

// Curvas D21 (3 semanas — declinio doenca, ascensao saude) — PDF-2
const CURVAS_D21 = {
  doenca: [
    { indicador: "Vitamina D 25(OH) abaixo da meta", valor: 55, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "B12 serica baixa (re-check D21)", valor: 32, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "Homocisteina elevada", valor: 40, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "Cortisol noturno elevado", valor: 50, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "GGT limitrofe", valor: 42, unidade: "%", data_registro: "2026-05-19" },
  ],
  saude: [
    { indicador: "Energia matinal subjetiva", valor: 65, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "Qualidade sono profundo", valor: 70, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "Capacidade cognitiva funcional", valor: 62, unidade: "%", data_registro: "2026-05-19" },
    { indicador: "Densidade ossea estimada", valor: 64, unidade: "%", data_registro: "2026-05-19" },
  ],
};

const PROXIMAS_ETAPAS = [
  { tipo: "exame", descricao: "Re-checagem Vit D 25(OH) + B12 + Homocisteina + Cortisol salivar 4x (apos 8 semanas)", prioridade: "alta", concluido: false, dataPrevista: "2026-06-15T00:00:00Z" },
  { tipo: "procedimento", descricao: "Densitometria ossea (rastreio osteopenia precoce)", prioridade: "media", concluido: false, dataPrevista: "2026-06-30T00:00:00Z" },
  { tipo: "consulta", descricao: "Retorno medico Dr Caio Padua — reavaliacao protocolo (sessao 4/8)", prioridade: "media", concluido: false, dataPrevista: "2026-05-26T00:00:00Z" },
  { tipo: "procedimento", descricao: "Aplicacao IM agendada Vit D 3/5 + B12 4/8 — proxima quinta", prioridade: "alta", concluido: false, dataPrevista: "2026-05-22T00:00:00Z" },
];

// ============================================================================
async function main() {
  console.log("=== Wave V485 — Dupla RAS Premium Craniotomia ===");

  const pac = ((await db.execute(sql`SELECT id,nome,cpf,codigo_semantico,whatsapp,telefone,email,data_nascimento,genero FROM pacientes WHERE id=${PACIENTE_ID}`)) as unknown as { rows: PacRow[] }).rows[0]!;
  const uni = ((await db.execute(sql`SELECT id,nome,endereco,bairro,cep,cidade,estado FROM unidades WHERE id=${UNIDADE_ID}`)) as unknown as { rows: UniRow[] }).rows[0]!;
  const med = ((await db.execute(sql`SELECT id,nome,crm FROM usuarios WHERE id=${PROFISSIONAL_ID}`)) as unknown as { rows: MedRow[] }).rows[0]!;
  const pats = ((await db.execute(sql`SELECT * FROM revo_patologias WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;
  const orgaos = ((await db.execute(sql`SELECT * FROM revo_orgaos WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;
  const snaps = ((await db.execute(sql`SELECT * FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID} ORDER BY data_snapshot ASC`)) as unknown as { rows: Record<string, unknown>[] }).rows;

  const enderecoCompleto = `${uni.endereco ?? ""} - ${uni.bairro ?? ""} - ${uni.cidade ?? ""}/${uni.estado ?? ""} - CEP ${uni.cep ?? ""}`;
  const enderecoCurto = `${uni.nome} - ${uni.cidade ?? ""}/${uni.estado ?? ""}`;

  // ====================================================================
  // PDF-1 — APRESENTACAO INICIAL (D0)
  // ====================================================================
  const upload1 = await etapa<UploadResultado>("1.ras_apresentacao_inicial", async () => {
    const tokenHash = `v485-d0-${sha12(Buffer.from(`${PACIENTE_ID}-d0`))}`;
    const pdfData = {
      paciente: {
        nome: pac.nome,
        cpf: pac.cpf,
        dataNascimento: pac.data_nascimento ?? undefined,
        telefone: pac.whatsapp ?? pac.telefone ?? undefined,
        email: pac.email ?? undefined,
        sexo: pac.genero,
        enderecoCompleto: enderecoCurto,
        plano: "Particular Pádua",
      },
      medico: "Dr. Caio Henrique Fernandes Pádua",
      unidade: uni.nome,
      dataBase: "28/04/2026 (D0 — inicio protocolo)",
      tituloRelatorio: "RAS Apresentacao Inicial — D0",
      subtituloRelatorio: "Snapshot pre-tratamento · plano definido · 0 aplicacoes",
      codigoSemantico: pac.codigo_semantico,
      tokenHash,
      kpis: [
        { label: "Vit D 25(OH)", valor: "18", unidade: "ng/mL", cor: "#B83227", delta: "abaixo meta 30" },
        { label: "B12 serica", valor: "240", unidade: "pg/mL", cor: "#C28920", delta: "funcional baixa" },
        { label: "Homocisteina", valor: "14", unidade: "umol/L", cor: "#C28920", delta: "limitrofe" },
        { label: "Cortisol noturno", valor: "12", unidade: "mcg/dL", cor: "#B83227", delta: "ref < 7" },
        { label: "Aplicacoes", valor: "0/13", unidade: "previstas", cor: "#0E7C8C", delta: "5 D3 + 8 B12" },
      ],
      snapshotInicial: snaps[0] || null,
      snapshotAtual: snaps[0] || null,
      patologias: {
        diagnosticadas: pats.filter(p => p["tipo"] === "diagnosticada"),
        potenciais: pats.filter(p => p["tipo"] === "potencial"),
      },
      orgaos,
      medicamentos: MEDICAMENTOS_BASE,
      eventosMedicacao: [], // D0 — nada aplicado ainda
      curvas: CURVAS_D0,
      proximasEtapas: PROXIMAS_ETAPAS.filter(e => e.tipo !== "consulta"),
    };
    const stream = rasxMod.gerarRasxPdf(pdfData, "COMPLETO");
    const buffer = await streamToBuffer(stream);
    console.log(`     PDF-1 (APRESENTACAO INICIAL D0): ${buffer.byteLength} bytes`);
    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RAS",
      data: new Date("2026-04-28T00:00:00"),
      identificador: `v485-apresentacao-inicial-d0`,
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: SESSAO_ID,
      referenciaTabela: "sessoes",
      metadataExtra: { wave: "V485", momento: "D0_APRESENTACAO_INICIAL", estetica: "Craniotomia V4" },
    });
    return { detalhe: `${buffer.byteLength}b -> ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // PDF-2 — EVOLUCAO 3a SEMANA (D21)
  // ====================================================================
  const upload2 = await etapa<UploadResultado>("2.ras_evolucao_3a_semana", async () => {
    const tokenHash = `v485-d21-${sha12(Buffer.from(`${PACIENTE_ID}-d21`))}`;
    // Patologias com evolucao % (Craniotomia HEVO usa isso)
    const patsComEvolucao = pats.map(p => {
      const tipo = p["tipo"];
      if (tipo === "diagnosticada") {
        return {
          ...p,
          intensidadeInicial: p["intensidade_inicial"] || "severa",
          intensidadeAtual: p["intensidade_atual"] || "leve",
          orgaoSistema: p["orgao_sistema"],
          statusSemaforo: p["status_semaforo"],
          leituraClinica: p["leitura_clinica"],
          evolucaoPercentual: -35, // melhora media 35%
          medicacaoOriginal: "Polifarmacia oral",
          substituicaoNatural: "Formula magistral integrativa",
        };
      }
      return { ...p, orgaoSistema: p["orgao_sistema"], statusSemaforo: p["status_semaforo"], leituraClinica: p["leitura_clinica"] };
    });
    const pdfData = {
      paciente: {
        nome: pac.nome,
        cpf: pac.cpf,
        dataNascimento: pac.data_nascimento ?? undefined,
        telefone: pac.whatsapp ?? pac.telefone ?? undefined,
        email: pac.email ?? undefined,
        sexo: pac.genero,
        enderecoCompleto: enderecoCurto,
        plano: "Particular Pádua",
      },
      medico: "Dr. Caio Henrique Fernandes Pádua",
      unidade: uni.nome,
      dataBase: `${DATA_DEMO.split("-").reverse().join("/")} (D21 — 3a semana do protocolo)`,
      tituloRelatorio: "RAS Evolucao 3a Semana — D21",
      subtituloRelatorio: "Comparativo D0 → D21 · 7 aplicacoes feitas · adesao 92%",
      codigoSemantico: pac.codigo_semantico,
      tokenHash,
      kpis: [
        { label: "Vit D 25(OH) est.", valor: "28", unidade: "ng/mL", cor: "#1F7A3D", delta: "↑ 10 ng/mL (+56%)" },
        { label: "B12 est.", valor: "380", unidade: "pg/mL", cor: "#1F7A3D", delta: "↑ 140 (+58%)" },
        { label: "Energia matinal", valor: "65", unidade: "%", cor: "#1F7A3D", delta: "↑ 35pp (D0=30%)" },
        { label: "Sono profundo", valor: "70", unidade: "%", cor: "#1F7A3D", delta: "↑ 35pp (D0=35%)" },
        { label: "Aplicacoes", valor: "7/13", unidade: "feitas", cor: "#0E7C8C", delta: "2/5 D3 + 3/8 B12 + Form" },
      ],
      snapshotInicial: snaps[0] || null,
      snapshotAtual: snaps[snaps.length - 1] || snaps[0] || null,
      patologias: {
        diagnosticadas: patsComEvolucao.filter(p => p["tipo"] === "diagnosticada"),
        potenciais: patsComEvolucao.filter(p => p["tipo"] === "potencial"),
      },
      orgaos,
      medicamentos: MEDICAMENTOS_BASE,
      eventosMedicacao: EVENTOS_MED_D21,
      curvas: CURVAS_D21,
      proximasEtapas: PROXIMAS_ETAPAS,
    };
    const stream = rasxMod.gerarRasxPdf(pdfData, "COMPLETO");
    const buffer = await streamToBuffer(stream);
    console.log(`     PDF-2 (EVOLUCAO 3a SEMANA D21): ${buffer.byteLength} bytes`);
    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RAS",
      data: new Date(DATA_DEMO + "T00:00:00"),
      identificador: `v485-evolucao-3a-semana-d21`,
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: SESSAO_ID,
      referenciaTabela: "sessoes",
      metadataExtra: { wave: "V485", momento: "D21_EVOLUCAO_3A_SEMANA", estetica: "Craniotomia V4" },
    });
    return { detalhe: `${buffer.byteLength}b -> ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // WhatsApp Carlucia (ambos PDFs)
  // ====================================================================
  const tel = pac.whatsapp || pac.telefone;
  if (tel && upload1 && upload2) {
    await etapa("3.wpp_carlucia_dupla", async () => {
      const primeiro = pac.nome.split(" ")[0] || pac.nome;
      const corpo = [
        `Ola ${primeiro},`,
        "",
        "Segue a *dupla apresentacao clinica Pawards* para sua sessao de amanha (19/mai 07:30):",
        "",
        "*1. RAS Apresentacao Inicial (D0)* — snapshot do ponto de partida, plano terapeutico definido:",
        upload1.driveUrl,
        "",
        "*2. RAS Evolucao 3a Semana (D21)* — comparativo de progresso, ja na 3a semana com 7/13 aplicacoes feitas:",
        upload2.driveUrl,
        "",
        "*Protocolo em curso:*",
        "- Vitamina D3 megadose 600.000 UI IM (2/5 aplicadas, 15/15 dias)",
        "- Vitamina B12 Metilcobalamina 2.500 mcg IM (3/8 aplicadas, 7/7 dias)",
        "- Formula magistral Composto Equilibrio Manha-Noite (1 dose VO antes cafe + 1 dose VO antes jantar)",
        "",
        `Verificacao SHA-256: ${(upload1.sha256 || "").slice(0, 12)} | ${(upload2.sha256 || "").slice(0, 12)}`,
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
  // Telegram CEO
  // ====================================================================
  const linhas = [
    "*Wave V485 — Dupla RAS Premium Craniotomia*",
    "",
    "Carlucia (sessao 39 — 19/mai 07:30 Padua) — demo investidora",
    "",
    "Etapas:",
  ];
  for (const [nome, r] of Object.entries(resultados)) {
    linhas.push(`[${r.ok ? "OK" : "FAIL"}] ${nome}: ${r.detalhe}${r.erro ? " | " + r.erro.slice(0, 80) : ""}`);
  }
  linhas.push("");
  if (upload1) linhas.push(`RAS-1 APRESENTACAO INICIAL (D0): ${upload1.driveUrl}`);
  if (upload2) linhas.push(`RAS-2 EVOLUCAO 3a SEMANA (D21): ${upload2.driveUrl}`);
  linhas.push("");
  linhas.push("Cenario ficticio (Caio): Vit D 600.000 UI 5x 15/15 + B12 2.500 mcg 8x 7/7 + Formula Composto Equilibrio Manha-Noite.");
  linhas.push("Estetica = Craniotomia V4 (KPI pills, matriz densa, fonte 6-8pt, padding 3px).");
  await tg.enviarTelegramCEO(linhas.join("\n"));

  console.log("\n=== RESUMO ===");
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`[${r.ok ? "OK  " : "FAIL"}] ${nome}: ${r.detalhe}`);
  }
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
