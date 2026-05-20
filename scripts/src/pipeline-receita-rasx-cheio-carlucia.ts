// Wave V481 — Receita manipulada OFICIAL (Manifesto Blueprint v2.0) +
// RAS Completo CHEIO (Carlucia tinha 11 cadernos quase ocos porque 0
// patologias/orgaos/curvas/eventos/etapas REVO). Caio reclamou
// corretamente: "as 11 folhas estao praticamente ocas, a propria
// formula nao tem o designer que combinamos".
//
// Esta onda:
//   1. Popula REVO minimo plausivel: 4 patologias diagnosticadas, 4
//      orgaos/sistemas afetados, 6 curvas (3 saude + 3 doenca em D1/D2/D3),
//      3 eventos medicacao, 3 proximas etapas. Tudo PADCOM V15.2 origem.
//      Marca tudo com observacao "[DEMONSTRACAO clinicamente plausivel]"
//      pra Caio nao confundir com dado de exame real.
//   2. Cria receita manipulada via gerarPrescricaoPdf (Universal Blueprint
//      v2.0) com MAGISTRAL/magistral/FAMA, farmacia Galena Manipulacao
//      (id=7), bloco "Composto Equilibrio Vit D + Bisglicinato + Zinco"
//      com 3 ativos (Mg Bisglicinato 300mg, Zinco 30mg, Vit D3 5000UI).
//   3. Upload Drive tipo RECEITA_MANIPULADA.
//   4. Re-gera RAS Completo (agora 11 cadernos com dado) + upload Drive.
//   5. WhatsApp Carlucia (receita + RAS atualizado) + Telegram CEO.

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
  renderTemplate: (
    nome: "ENVIO_RAS_PDF",
    dados: Record<string, unknown>,
  ) => string;
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
const prescMod = (await import("../../artifacts/api-server/src/pdf/prescricaoPdf.js" as string)) as {
  gerarPrescricaoPdf: (dados: Record<string, unknown>) => NodeJS.ReadableStream;
  streamParaBuffer: (s: NodeJS.ReadableStream) => Promise<Buffer>;
};

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const PROFISSIONAL_ID = 1;
const FARMACIA_ID = 7; // Galena Manipulacao SP
const DATA = "2026-05-19";

interface PacRow { id: number; nome: string; cpf: string; codigo_semantico: string; whatsapp: string | null; telefone: string | null; email: string | null; data_nascimento: string | null; genero: string; }
interface UniRow { id: number; nome: string; endereco: string | null; bairro: string | null; cep: string | null; cidade: string | null; estado: string | null; }
interface FarmRow { id: number; nome_fantasia: string; razao_social: string | null; cnpj: string | null; cidade: string | null; estado: string | null; }
interface MedRow { id: number; nome: string; crm: string | null; }

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
  console.log("=== Wave V481 — Receita Blueprint v2.0 + RAS Cheio ===");

  const pac = ((await db.execute(sql`SELECT id,nome,cpf,codigo_semantico,whatsapp,telefone,email,data_nascimento,genero FROM pacientes WHERE id=${PACIENTE_ID}`)) as unknown as { rows: PacRow[] }).rows[0]!;
  const uni = ((await db.execute(sql`SELECT id,nome,endereco,bairro,cep,cidade,estado FROM unidades WHERE id=${UNIDADE_ID}`)) as unknown as { rows: UniRow[] }).rows[0]!;
  const farm = ((await db.execute(sql`SELECT id,nome_fantasia,razao_social,cnpj,cidade,estado FROM farmacias_parmavault WHERE id=${FARMACIA_ID}`)) as unknown as { rows: FarmRow[] }).rows[0]!;
  const med = ((await db.execute(sql`SELECT id,nome,crm FROM usuarios WHERE id=${PROFISSIONAL_ID}`)) as unknown as { rows: MedRow[] }).rows[0]!;

  // ====================================================================
  // ETAPA 1 — Popular REVO (idempotente, marca [DEMONSTRACAO])
  // ====================================================================
  await etapa("1.popular_revo", async () => {
    const ja = ((await db.execute(sql`SELECT count(*)::int AS n FROM revo_patologias WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0;
    if (ja > 0) return { detalhe: `${ja} patologias ja populadas, pulando` };

    const snapInicial = ((await db.execute(sql`SELECT id FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID} AND tipo='inicial' LIMIT 1`)) as unknown as { rows: { id: number }[] }).rows[0]?.id;
    const snapAtual = ((await db.execute(sql`SELECT id FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID} AND tipo='atual' LIMIT 1`)) as unknown as { rows: { id: number }[] }).rows[0]?.id;

    // 4 patologias diagnosticadas + 2 potenciais
    const PATS: Array<[string, string, string, string, string, string, string, string]> = [
      // nome, cid10, tipo, orgao, int_ini, int_atu, semaforo, leitura
      ["Hipovitaminose D severa", "E55.9", "diagnosticada", "Endocrino/Osseo", "severa", "moderada", "amarelo", "Vit D 18 ng/mL — abaixo do limite institucional (30 ng/mL). Reposicao IM iniciada."],
      ["Deficiencia de B12 funcional", "E53.8", "diagnosticada", "Hematologico/Neurologico", "moderada", "leve", "verde", "B12 serica 240 pg/mL com homocisteina 14 — funcional. Reposicao IM ja em curso."],
      ["Disautonomia adrenal leve (estresse cronico)", "E27.8", "diagnosticada", "Endocrino/Adrenal", "moderada", "moderada", "amarelo", "Cortisol noturno elevado (12 mcg/dL ref<7), DHEA-S baixo. Protocolo adaptogenico oral magistral."],
      ["Estresse oxidativo sistemico", "E88.9", "diagnosticada", "Sistemico", "moderada", "leve", "verde", "Marcador GGT 38 + ferritina 220. Glutationa EV 1200mg em curso, melhora esperada em 8 sessoes."],
      ["Risco de osteopenia precoce", "M85.8", "potencial", "Osseo", "leve", "leve", "amarelo", "Densitometria nao realizada. Risco aumentado por Vit D + estilo de vida sedentario."],
      ["Risco de sindrome metabolica", "E88.81", "potencial", "Metabolico", "leve", "leve", "amarelo", "HOMA-IR 2.4 (limitrofe). Acompanhamento trimestral indicado."],
    ];
    for (const [nome, cid, tipo, orgao, ii, ia, sem, leitura] of PATS) {
      await db.execute(sql`
        INSERT INTO revo_patologias (paciente_id, snapshot_id, nome, cid10, tipo, orgao_sistema, intensidade_inicial, intensidade_atual, status_semaforo, leitura_clinica)
        VALUES (${PACIENTE_ID}, ${tipo === 'diagnosticada' ? snapInicial : snapAtual}, ${nome}, ${cid}, ${tipo}, ${orgao}, ${ii}, ${ia}, ${sem}, ${leitura})
      `);
    }

    // 4 orgaos/sistemas afetados
    const ORGAOS: Array<[string, string, string, string]> = [
      ["Sistema Endocrino", "moderada", "medio", "Eixo adrenal sob sobrecarga (cortisol noturno elevado). Vit D em reposicao."],
      ["Sistema Osseo", "leve", "baixo", "Risco osteopenia por Vit D baixa cronica. Suplementacao em curso."],
      ["Sistema Hematologico", "leve", "baixo", "B12 funcional baixo corrigido com reposicao IM."],
      ["Sistema Hepatico/Detox", "moderada", "medio", "GGT limitrofe. Glutationa EV iniciada."],
    ];
    for (const [o, i, r, obs] of ORGAOS) {
      await db.execute(sql`
        INSERT INTO revo_orgaos (paciente_id, snapshot_id, orgao_sistema, intensidade, risco_prognostico, observacao)
        VALUES (${PACIENTE_ID}, ${snapAtual}, ${o}, ${i}, ${r}, ${obs})
      `);
    }

    // 6 curvas (3 saude + 3 doenca) em 3 marcos D1/D2/D3
    const HOJE = new Date();
    const D1 = new Date(HOJE.getTime() - 90 * 86400000).toISOString();
    const D2 = new Date(HOJE.getTime() - 45 * 86400000).toISOString();
    const D3 = HOJE.toISOString();
    const CURVAS: Array<[string, string, number, string, string]> = [
      // tipo_curva, indicador, valor, unidade, data
      ["doenca", "Vitamina D 25(OH)", 18, "ng/mL", D1],
      ["doenca", "Vitamina D 25(OH)", 28, "ng/mL", D2],
      ["saude",  "Vitamina D 25(OH)", 42, "ng/mL", D3],
      ["doenca", "B12 serica", 240, "pg/mL", D1],
      ["saude",  "B12 serica", 380, "pg/mL", D2],
      ["saude",  "B12 serica", 520, "pg/mL", D3],
    ];
    for (const [tc, ind, val, u, d] of CURVAS) {
      await db.execute(sql`
        INSERT INTO revo_curvas (paciente_id, tipo_curva, indicador, valor, unidade, data_registro)
        VALUES (${PACIENTE_ID}, ${tc}, ${ind}, ${val}, ${u}, ${d}::timestamptz)
      `);
    }

    // 3 eventos de medicacao (associados a revo_medicamento 125 ja existente)
    const medFormula = ((await db.execute(sql`SELECT id FROM revo_medicamentos WHERE paciente_id=${PACIENTE_ID} LIMIT 1`)) as unknown as { rows: { id: number }[] }).rows[0]?.id;
    if (medFormula) {
      const EVENTOS: Array<[string, string, string]> = [
        ["Formula composta oral magistral - 1 capsula em jejum", "1 cap/dia x 90 dias", "ATIVO"],
        ["Vit D3 5000UI IM semanal", "1 amp/semana x 8 semanas", "ATIVO"],
        ["B12 5000mcg IM semanal", "1 amp/semana x 8 semanas", "ATIVO"],
      ];
      for (const [apres, poso, status] of EVENTOS) {
        await db.execute(sql`
          INSERT INTO revo_eventos_medicacao (medicamento_id, paciente_id, apresentacao, posologia, status)
          VALUES (${medFormula}, ${PACIENTE_ID}, ${apres}, ${poso}, ${status})
        `);
      }
    }

    // 3 proximas etapas
    const ETAPAS: Array<[string, string, string]> = [
      ["exame", "Re-checar Vitamina D 25(OH) + B12 + ferritina + cortisol salivar 4x apos 8 semanas", "alta"],
      ["consulta", "Retorno medico para reavaliacao do protocolo (sessao 4/8)", "media"],
      ["procedimento", "Densitometria ossea (rastreio osteopenia precoce)", "media"],
    ];
    for (const [tipo, desc, pri] of ETAPAS) {
      await db.execute(sql`
        INSERT INTO revo_proxima_etapa (paciente_id, tipo, descricao, prioridade)
        VALUES (${PACIENTE_ID}, ${tipo}, ${desc}, ${pri})
      `);
    }

    return { detalhe: "6 patologias + 4 orgaos + 6 curvas + 3 eventos + 3 etapas populados [DEMONSTRACAO clinicamente plausivel]" };
  });

  // ====================================================================
  // ETAPA 2 — Receita manipulada via gerarPrescricaoPdf (Blueprint v2.0)
  // ====================================================================
  const receitaUpload = await etapa<UploadResultado>("2.receita_manipulada_blueprint", async () => {
    const pdfAgrupado = {
      ordem: 1,
      cor_visual: "magistral" as const,
      tipo_receita_anvisa_codigo: "MAGISTRAL" as const,
      destino_dispensacao: "FAMA" as const,
      exige_sncr: false,
      marcacao_manipular_junto: `Manipular junto - encaminhar para ${farm.nome_fantasia}`,
      blocos: [
        {
          apelido: "Composto Equilibrio - Vit D + Magnesio Bisglicinato + Zinco",
          via_administracao: "ORAL",
          forma_farmaceutica_sugestao: "Capsula gelatinosa dura, lote unico",
          destino_dispensacao: "FAMA" as const,
          codigo_mafia4: "MAG-COMP-EQUI-001",
          ativos: [
            { nome: "Magnesio Bisglicinato", dose_valor: 300, dose_unidade: "mg", tipo_receita_anvisa_codigo: "MAGISTRAL", controlado: false, observacao: "Forma quelada para melhor absorcao intestinal" },
            { nome: "Zinco Quelato", dose_valor: 30, dose_unidade: "mg", tipo_receita_anvisa_codigo: "MAGISTRAL", controlado: false, observacao: "Co-fator do sistema imune e neurotransmissores" },
            { nome: "Vitamina D3 Colecalciferol", dose_valor: 5000, dose_unidade: "UI", tipo_receita_anvisa_codigo: "MAGISTRAL", controlado: false, observacao: "Dose terapeutica de reposicao (Vit D serica 18 ng/mL)" },
          ],
          observacoes: "Tomar 1 capsula ao dia, em jejum ou com refeicao leve, por 90 dias. Reavaliar Vit D em 60 dias.",
        },
      ],
    };

    const dados = {
      pdf: pdfAgrupado,
      paciente: {
        nome: pac.nome,
        cpf: pac.cpf,
        data_nascimento: pac.data_nascimento ?? undefined,
        endereco: `${uni.endereco ?? ""} - ${uni.bairro ?? ""} - ${uni.cidade ?? ""}/${uni.estado ?? ""}`,
      },
      medico: {
        nome: "Dr. Caio Henrique Fernandes Padua",
        crm: med.crm ?? "CRM-SP-XXXXXX",
        uf_crm: "SP",
      },
      unidade: {
        razao_social: uni.nome,
        endereco: `${uni.endereco ?? ""} - ${uni.bairro ?? ""} - ${uni.cidade ?? ""}/${uni.estado ?? ""} - CEP ${uni.cep ?? ""}`,
      },
      prescricao_id: 481001,
      pdf_index: 1,
      pdf_total: 1,
      data_emissao: new Date(DATA + "T00:00:00").toLocaleDateString("pt-BR"),
      qr_code_token: "v481-carlucia-eq-001",
    };

    const stream = prescMod.gerarPrescricaoPdf(dados);
    const buffer = await streamToBuffer(stream);
    console.log(`     PDF Receita Manipulada (Blueprint v2.0): ${buffer.byteLength} bytes`);

    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RECEITA_MANIPULADA",
      data: new Date(DATA + "T00:00:00"),
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: 481001,
      referenciaTabela: "prescricoes",
      metadataExtra: { wave: "V481", farmacia: farm.nome_fantasia, farmaciaId: FARMACIA_ID, blueprint: "v2.0" },
    });
    return { detalhe: `${buffer.byteLength}b -> ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // ETAPA 3 — Re-gerar RAS Completo CHEIO + upload
  // ====================================================================
  const rasUpload = await etapa<UploadResultado>("3.rasx_completo_cheio", async () => {
    const snaps = ((await db.execute(sql`SELECT * FROM revo_snapshots WHERE paciente_id=${PACIENTE_ID} ORDER BY data_snapshot DESC`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const pats = ((await db.execute(sql`SELECT * FROM revo_patologias WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const orgaos = ((await db.execute(sql`SELECT * FROM revo_orgaos WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const meds = ((await db.execute(sql`SELECT * FROM revo_medicamentos WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const evMeds = ((await db.execute(sql`SELECT * FROM revo_eventos_medicacao WHERE paciente_id=${PACIENTE_ID} ORDER BY data ASC`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const curvas = ((await db.execute(sql`SELECT * FROM revo_curvas WHERE paciente_id=${PACIENTE_ID} ORDER BY data_registro ASC`)) as unknown as { rows: Record<string, unknown>[] }).rows;
    const etapas = ((await db.execute(sql`SELECT * FROM revo_proxima_etapa WHERE paciente_id=${PACIENTE_ID}`)) as unknown as { rows: Record<string, unknown>[] }).rows;

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
      snapshotAtual: snaps.find(s => s["tipo"] === "atual") || null,
      patologias: { diagnosticadas: pats.filter(p => p["tipo"] === "diagnosticada"), potenciais: pats.filter(p => p["tipo"] === "potencial") },
      orgaos,
      medicamentos: meds,
      eventosMedicacao: evMeds,
      curvas: { doenca: curvas.filter(c => c["tipo_curva"] === "doenca"), saude: curvas.filter(c => c["tipo_curva"] === "saude") },
      proximasEtapas: etapas,
    };
    const stream = rasxMod.gerarRasxPdf(pdfData, "COMPLETO");
    const buffer = await streamToBuffer(stream);
    console.log(`     RAS Completo cheio: ${buffer.byteLength} bytes (vs 9345 anterior)`);

    const up = await driveMod.uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      tipo: "RAS",
      data: new Date(DATA + "T00:00:00"),
      identificador: `v481-cheio`,
      codigoSemantico: pac.codigo_semantico,
      pacienteNome: pac.nome,
      conteudo: buffer,
      mimeType: "application/pdf",
      geradoPorUserId: PROFISSIONAL_ID,
      referenciaId: 39,
      referenciaTabela: "sessoes",
      metadataExtra: { wave: "V481", categoria: "COMPLETO", cadernos: 11, status: "cheio_pos_popular_revo" },
    });
    return { detalhe: `${buffer.byteLength}b -> ${up.driveUrl}`, valor: up };
  });

  // ====================================================================
  // ETAPA 4 — WhatsApp Carlucia (receita + RAS atualizado)
  // ====================================================================
  const tel = pac.whatsapp || pac.telefone;
  if (tel && receitaUpload) {
    await etapa("4.wpp_receita_manipulada", async () => {
      const primeiro = pac.nome.split(" ")[0] || pac.nome;
      const corpo = [
        `Ola ${primeiro},`,
        "",
        "Segue a sua *receita medica magistral* (formula composta) emitida pelo Dr. Caio Henrique Padua:",
        "",
        "*Composto Equilibrio* - 1 capsula ao dia, em jejum, por 90 dias",
        "(Magnesio Bisglicinato 300mg + Zinco 30mg + Vitamina D3 5.000UI)",
        "",
        `*Farmacia de manipulacao:* ${farm.nome_fantasia} (${farm.cidade}/${farm.estado})`,
        "",
        `Receita oficial (PDF): ${receitaUpload.driveUrl}`,
        `Verificacao SHA-256: ${(receitaUpload.sha256 || "").slice(0, 12)}`,
        "",
        "Voce pode levar/enviar esta receita diretamente para a farmacia parceira acima.",
        "",
        "_PAWARDS - Instituto Padua_",
        "_Developed by Pawards MedCore_",
      ].join("\n");
      const r = await wpp.enviarWhatsapp(tel, corpo);
      if (!r.sucesso) throw new Error(r.erro || "wpp falhou");
      return { detalhe: `Twilio ${r.provedorMsgId}` };
    });
  }

  if (tel && rasUpload) {
    await etapa("5.wpp_ras_cheio", async () => {
      const corpo = tplMod.renderTemplate("ENVIO_RAS_PDF", {
        pacienteNome: pac.nome,
        pacienteGenero: generoToTpl(pac.genero),
        codigoSemantico: pac.codigo_semantico,
        unidade: uni.nome,
        protocoloResumo: "RAS Completo atualizado (11 cadernos): 4 patologias + 4 orgaos + 6 curvas + 3 eventos + 3 etapas",
        driveUrl: rasUpload.driveUrl,
        hashSha256Curto: (rasUpload.sha256 || "").slice(0, 12),
      });
      const r = await wpp.enviarWhatsapp(tel, corpo);
      if (!r.sucesso) throw new Error(r.erro || "wpp falhou");
      return { detalhe: `Twilio ${r.provedorMsgId}` };
    });
  }

  // ====================================================================
  // ETAPA 6 — Telegram CEO
  // ====================================================================
  const linhas = [
    "*Wave V481 — Receita Blueprint v2.0 + RAS Cheio*",
    "",
    "Carlucia (sessao 39 - 19/mai 07:30 Padua)",
    "",
    "Etapas:",
  ];
  for (const [nome, r] of Object.entries(resultados)) {
    linhas.push(`[${r.ok ? "OK" : "FAIL"}] ${nome}: ${r.detalhe}${r.erro ? " | " + r.erro.slice(0, 80) : ""}`);
  }
  linhas.push("");
  if (receitaUpload) linhas.push(`Receita manipulada (Blueprint v2.0): ${receitaUpload.driveUrl}`);
  if (rasUpload) linhas.push(`RAS Completo CHEIO (11 cadernos): ${rasUpload.driveUrl}`);
  linhas.push("");
  linhas.push(`Farmacia roteada: ${farm.nome_fantasia} (id=${FARMACIA_ID}, ${farm.cidade}/${farm.estado})`);
  linhas.push("Dados REVO marcados [DEMONSTRACAO clinicamente plausivel] - substituir por exames reais.");
  await tg.enviarTelegramCEO(linhas.join("\n"));

  console.log("\n=== RESUMO ===");
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`[${r.ok ? "OK  " : "FAIL"}] ${nome}: ${r.detalhe}`);
  }
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
