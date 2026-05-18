/**
 * FECHAMENTO DE PROTOCOLO · Carlúcia (3497) — 18/mai/2026
 *
 * Quadro clínico (Caio CEO): Hipertensão · Cansaço/fadiga · Deficiências
 * vitamínicas/minerais · Menopausa.
 *
 * Entrega:
 *   1. Prescrição NAD+ EV (V8)
 *   2. Prescrição CoQ10 + PQQ IM (V8)
 *   3. Prescrição Fórmula Magistral Oral — Blend Menopausa+Energia (V8)
 *   4. Pedido de Exames (hormonal + tireoide + cardiometabólico + nutricional)
 *   5. RAS — Registro Administração Substâncias (layout horizontal atual)
 *   6. RACJ — Consentimento LGPD + TCLE (layout atual)
 *   → Tudo no Drive da paciente
 *   → WhatsApp pra Carlúcia + Telegram pro CEO com TODOS os links
 *
 * Rodar: tsx artifacts/api-server/src/scripts/demoCarluciaFechamento.ts
 */
import { pool } from "@workspace/db";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PassThrough } from "node:stream";
import { emitirPrescricao } from "../services/emitirPrescricaoService";
import {
  uploadArquivoPaciente,
  garantirAcessoLeituraPaciente,
} from "../lib/arquivos/drive";
import { enviarWhatsapp } from "../services/whatsappService";
import { enviarTelegramCEO } from "../services/telegramService";
import { gerarPdfRAS } from "../pdf/gerarRAS";
import { gerarPdfSolicitacao } from "../pdf/gerarPedidoExame";
import { gerarRacjPdf } from "../pdf/rasxPdf";

const PACIENTE_ID = 3497;
const MEDICO_ID = 6;     // Dr Kleber Clara Lemos · CRM-SP 164027
const UNIDADE_ID = 15;   // Pádua

// =========================================================================
// Helpers
// =========================================================================
function streamToBuffer(s: PassThrough): Promise<Buffer> {
  return new Promise((res, rej) => {
    const chunks: Buffer[] = [];
    s.on("data", (c) => chunks.push(c));
    s.on("end", () => res(Buffer.concat(chunks)));
    s.on("error", rej);
  });
}

async function inserirSubstanciaSeFalta(s: {
  nome: string; abreviacao: string; codigo: string;
  categoria: string; via: string; dose: string; unidade: string;
}) {
  await pool.query(
    `INSERT INTO substancias (nome, abreviacao, codigo_semantico, categoria, via,
        dose_padrao, unidade_dose, tipo_receita_anvisa_codigo, controlado)
     SELECT $1, $2, $3, $4, $5, $6, $7, 'BRANCA_SIMPLES', false
     WHERE NOT EXISTS (SELECT 1 FROM substancias WHERE codigo_semantico = $3)`,
    [s.nome, s.abreviacao, s.codigo, s.categoria, s.via, s.dose, s.unidade],
  );
}

interface PrescricaoConfig {
  apelido: string;
  categoria: string;
  abrev: string;
  via: string;
  formaFarmaceutica: string;
  destino: "INJE" | "FAMA";
  corVisual: string;
  formaFarmaceuticaSugestao: string;
  observacoes: string;
  observacaoBloco: string;
  ativos: { nome: string; dose: number; unidade: string; obs?: string }[];
}

async function criarPrescricaoCompleta(cfg: PrescricaoConfig): Promise<number> {
  const presc = await pool.query(
    `INSERT INTO prescricoes
       (paciente_id, medico_id, unidade_id, data_emissao, duracao_dias,
        status, observacoes_gerais, origem, versao)
     VALUES ($1, $2, $3, current_date, 42, 'rascunho', $4, 'demo_fechamento_carlucia', 1)
     RETURNING id`,
    [PACIENTE_ID, MEDICO_ID, UNIDADE_ID, cfg.observacoes],
  );
  const prescricaoId: number = presc.rows[0].id;

  const bloco = await pool.query(
    `INSERT INTO prescricao_blocos
       (prescricao_id, ordem, titulo_apelido, titulo_categoria, titulo_abrev_principal,
        tipo_bloco, via_administracao, forma_farmaceutica, qtd_doses, duracao_dias,
        observacoes, destino_dispensacao, cor_visual, forma_farmaceutica_sugestao)
     VALUES ($1, 1, $2, $3, $4, 'injetavel', $5, $6, 6, 42, $7, $8, $9, $10)
     RETURNING id`,
    [
      prescricaoId, cfg.apelido, cfg.categoria, cfg.abrev,
      cfg.via, cfg.formaFarmaceutica, cfg.observacaoBloco,
      cfg.destino, cfg.corVisual, cfg.formaFarmaceuticaSugestao,
    ],
  );
  const blocoId: number = bloco.rows[0].id;

  for (let i = 0; i < cfg.ativos.length; i++) {
    const a = cfg.ativos[i];
    await pool.query(
      `INSERT INTO prescricao_bloco_ativos
         (bloco_id, ordem, nome_ativo, dose_valor, dose_unidade,
          observacao, tipo_receita_anvisa_codigo, controlado)
       VALUES ($1, $2, $3, $4, $5, $6, 'BRANCA_SIMPLES', false)`,
      [blocoId, i + 1, a.nome, a.dose, a.unidade, a.obs || null],
    );
  }
  return prescricaoId;
}

// =========================================================================
async function main() {
  console.log("[fechamento-carlucia] INICIANDO — protocolo completo");

  // ===== 0. Carrega dados da paciente + unidade
  const pacR = await pool.query(
    `SELECT nome, cpf, telefone, email, codigo_semantico, data_nascimento, endereco
     FROM pacientes WHERE id = $1`, [PACIENTE_ID],
  );
  const pac = pacR.rows[0];

  const uniR = await pool.query(
    `SELECT nome, cnpj, endereco, telefone FROM unidades WHERE id = $1`, [UNIDADE_ID],
  );
  const uni = uniR.rows[0] || {};

  const medR = await pool.query(
    `SELECT nome, crm, uf_atuacao_principal FROM usuarios WHERE id = $1`, [MEDICO_ID],
  );
  const med = medR.rows[0];

  // ===== 1. Substâncias faltantes (idempotente)
  console.log("[1] Garantindo substâncias faltantes no catálogo...");
  await inserirSubstanciaSeFalta({
    nome: "Coenzima Q10 (Ubiquinol) IM", abreviacao: "CoQ10", codigo: "ANTX.MITO.CARD.COQ.01",
    categoria: "ANTIOXIDANTE", via: "im", dose: "100 mg", unidade: "mg",
  });
  await inserirSubstanciaSeFalta({
    nome: "PQQ (Pirroloquinolina Quinona) IM", abreviacao: "PQQ", codigo: "ANTX.MITO.NEUR.PQQ.01",
    categoria: "MITOCONDRIAL", via: "im", dose: "20 mg", unidade: "mg",
  });
  await inserirSubstanciaSeFalta({
    nome: "Magnésio Dimalato (oral)", abreviacao: "MgD", codigo: "MIN.NEUR.RELX.MGD.ORAL.01",
    categoria: "MINERAL", via: "oral", dose: "400 mg", unidade: "mg",
  });
  await inserirSubstanciaSeFalta({
    nome: "Vitamina D3 (oral)", abreviacao: "D3", codigo: "VITA.IMUN.ANTI.VD3.ORAL.01",
    categoria: "VITAMINA", via: "oral", dose: "10000 UI", unidade: "UI",
  });
  await inserirSubstanciaSeFalta({
    nome: "Metilcobalamina (B12 oral sublingual)", abreviacao: "B12sl", codigo: "VITA.NEUR.ENRG.B12.ORAL.01",
    categoria: "VITAMINA", via: "oral", dose: "1000 mcg", unidade: "mcg",
  });
  await inserirSubstanciaSeFalta({
    nome: "Resveratrol (oral)", abreviacao: "Resv", codigo: "POLI.ANTX.LONG.RES.ORAL.01",
    categoria: "POLIFENOL", via: "oral", dose: "250 mg", unidade: "mg",
  });

  // ===== 2. PRESCRIÇÕES (3 PDFs V8)
  console.log("[2] Criando e emitindo 3 prescrições...");

  const presc1 = await criarPrescricaoCompleta({
    apelido: "NAD+ Endovenoso · Restaurador Bioenergético",
    categoria: "INJETÁVEL EV", abrev: "NADE",
    via: "Endovenosa lenta (2-4h)", formaFarmaceutica: "solução EV",
    destino: "INJE", corVisual: "magistral",
    formaFarmaceuticaSugestao: "Ampola pré-diluída para infusão lenta",
    observacoes: "NAD+ EV · Restaurador bioenergético mitocondrial · 6 sessões semanais",
    observacaoBloco: "Diluir em 250 mL de SF 0,9%. Infusão em 2-4 horas, aplicação clínica.",
    ativos: [{ nome: "NAD+", dose: 500, unidade: "mg",
      obs: "Cofator mitocondrial · 100% biodisponibilidade EV" }],
  });

  const presc2 = await criarPrescricaoCompleta({
    apelido: "Suporte Mitocondrial · CoQ10 + PQQ IM",
    categoria: "INJETÁVEL IM", abrev: "MITO",
    via: "Intramuscular profunda (deltoide ou glúteo)", formaFarmaceutica: "solução IM",
    destino: "INJE", corVisual: "magistral",
    formaFarmaceuticaSugestao: "Ampola 2mL pronta para uso IM",
    observacoes: "Protocolo Suporte Mitocondrial · CoQ10 + PQQ via IM · 1x/semana × 6 sessões",
    observacaoBloco: "Aplicação IM profunda. Alternar lateralidade entre sessões.",
    ativos: [
      { nome: "Coenzima Q10 (Ubiquinol)", dose: 100, unidade: "mg",
        obs: "Antioxidante mitocondrial · suporte cardiovascular e fadiga" },
      { nome: "PQQ (Pirroloquinolina Quinona)", dose: 20, unidade: "mg",
        obs: "Biogênese mitocondrial · neuroproteção · clareza mental" },
    ],
  });

  const presc3 = await criarPrescricaoCompleta({
    apelido: "Fórmula Oral Blend · Menopausa + Energia",
    categoria: "FÓRMULA MAGISTRAL ORAL", abrev: "FORM",
    via: "Oral · 1x ao dia pela manhã com alimento",
    formaFarmaceutica: "cápsula composta",
    destino: "FAMA", corVisual: "magistral",
    formaFarmaceuticaSugestao: "Cápsula gelatinosa dura · todos ativos juntos · 60 cápsulas",
    observacoes: "Blend oral manipulado · suporte menopausa + reposição vitamínica/mineral + antioxidação",
    observacaoBloco: "Manipular junto em cápsula única. Tomar 1x ao dia pela manhã com refeição.",
    ativos: [
      { nome: "Vitamina D3", dose: 5000, unidade: "UI",
        obs: "Reposição hormonal/imunológica · alvo 25-OH >50 ng/mL" },
      { nome: "Metilcobalamina (B12)", dose: 1000, unidade: "mcg",
        obs: "Energia · neuroproteção · suporte fadiga" },
      { nome: "Magnésio Dimalato", dose: 400, unidade: "mg",
        obs: "Cofator mitocondrial · suporte hipertensão · fadiga muscular" },
      { nome: "Coenzima Q10 (oral)", dose: 100, unidade: "mg",
        obs: "Antioxidante · suporte cardiovascular" },
      { nome: "Resveratrol", dose: 250, unidade: "mg",
        obs: "Polifenol · longevidade · suporte estrogênico moderado" },
    ],
  });

  const prescricoesIds = [presc1, presc2, presc3];
  const pdfsEmitidos: { prescricaoId: number; arquivo: string; rotulo: string }[] = [];
  const pdfDir = path.join(process.cwd(), "tmp", "prescricoes");

  for (const [idx, pid] of prescricoesIds.entries()) {
    const r = await emitirPrescricao({ prescricao_id: pid });
    const rotulos = [
      "Prescrição 1 · NAD+ EV",
      "Prescrição 2 · CoQ10 + PQQ IM",
      "Prescrição 3 · Fórmula Oral Blend Menopausa",
    ];
    for (const p of r.pdfs) {
      pdfsEmitidos.push({ prescricaoId: pid, arquivo: p.arquivo, rotulo: rotulos[idx] });
    }
    console.log(`    ✓ Prescrição #${pid}: ${r.pdfs.length} PDF(s)`);
  }

  // ===== 3. PEDIDO DE EXAMES — quadro Carlúcia
  console.log("[3] Gerando Pedido de Exames (quadro clínico)...");
  const examesAlvo = [
    // Hormonal / menopausa
    129, 153, 117, 174, 109, 200, 176,
    // Tireoide
    281, 282, 283,
    // Cardiometabólico / hipertensão
    92, 171, 148, 135, 151, 287, 288,
    // Nutricional / def vits e minerais
    249, 251, 122, 157, 254, 286, 285,
    // Geral
    139, 244, 100,
    // Adrenal / fadiga
    95,
  ];
  const exR = await pool.query(
    `SELECT id, nome_exame, corpo_pedido, preparo, hd_1, cid_1
     FROM exames_base WHERE id = ANY($1::int[]) AND ativo=true
     ORDER BY grupo_principal, subgrupo, nome_exame`,
    [examesAlvo],
  );
  const examesPedido = exR.rows.map((e: any) => ({
    nomeExame: e.nome_exame as string,
    corpoPedido: (e.corpo_pedido as string) || `SOLICITO ${e.nome_exame}`,
    preparo: (e.preparo as string) || null,
    hd: (e.hd_1 as string) || null,
    cid: (e.cid_1 as string) || null,
  }));
  console.log(`    → ${examesPedido.length} exames selecionados`);

  const dataHoje = new Date().toLocaleDateString("pt-BR");
  const pedidoBuf = await gerarPdfSolicitacao({
    nomeEmpresa: uni.nome || "Instituto Pádua",
    enderecoEmpresa: uni.endereco || "Av. Higienópolis 950, Higienópolis, São Paulo SP",
    cepEmpresa: "01238-001",
    cnpjEmpresa: uni.cnpj || "—",
    telefoneEmpresa: uni.telefone || "—",
    nomeMedico: med.nome,
    crm: med.crm || "CRM-SP 164027",
    cpfMedico: "—",
    cnsMedico: "—",
    especialidade: "Medicina Integrativa",
    nomePaciente: pac.nome,
    cpfPaciente: pac.cpf || "—",
    enderecoPaciente: pac.endereco || "—",
    telefonePaciente: pac.telefone || "—",
    exames: examesPedido,
    hipoteseDiagnostica: "Hipertensão arterial · Síndrome de fadiga · Deficiências vitamínicas e minerais · Perimenopausa / menopausa",
    cidPrincipal: "I10 / R53 / E55.9 / N95.1",
    observacao: "Avaliação cardiometabólica + hormonal completa para fechamento de protocolo integrativo. Coleta em jejum de 8-12h conforme orientação por exame.",
    data: dataHoje,
  });
  console.log(`    ✓ PDF pedido de exames: ${pedidoBuf.length} bytes`);

  // ===== 4. RAS (Registro Administração Substâncias)
  console.log("[4] Gerando RAS (Registro Administração Substâncias)...");
  const sub = await pool.query(
    `SELECT id, nome, abreviacao, via, cor, dose_padrao, categoria, descricao,
            funcao_principal, efeitos_percebidos, tempo_para_efeito,
            beneficio_longevidade, impacto_qualidade_vida, beneficio_sono,
            beneficio_energia, beneficio_libido, performance_fisica,
            forca_muscular, clareza_mental, pele_cabelo_unhas,
            suporte_imunologico, contraindicacoes, evidencia_cientifica,
            efeitos_sistemas_corporais
     FROM substancias
     WHERE codigo_semantico IN (
       'ANTX.ENRG.META.NAD.01',
       'ANTX.MITO.CARD.COQ.01',
       'ANTX.MITO.NEUR.PQQ.01'
     ) ORDER BY id`,
  );
  const substanciasRas = sub.rows.map((s: any) => ({
    nome: s.nome,
    abreviacao: s.abreviacao || s.nome.slice(0, 6),
    qtde: 6, frequenciaDias: 7,
    dataInicio: dataHoje,
    via: (s.via || "IV").toUpperCase(),
    cor: s.cor || "#1F3A5F",
    dosePadrao: s.dose_padrao || "",
    categoria: s.categoria || "",
    descricao: s.descricao || "",
    funcaoPrincipal: s.funcao_principal || "",
    efeitosPercebidos: s.efeitos_percebidos || "",
    tempoParaEfeito: s.tempo_para_efeito || "",
    beneficioLongevidade: s.beneficio_longevidade || "",
    impactoQualidadeVida: s.impacto_qualidade_vida || "",
    beneficioSono: s.beneficio_sono || "",
    beneficioEnergia: s.beneficio_energia || "",
    beneficioLibido: s.beneficio_libido || "",
    performanceFisica: s.performance_fisica || "",
    forcaMuscular: s.forca_muscular || "",
    clarezaMental: s.clareza_mental || "",
    peleCabeloUnhas: s.pele_cabelo_unhas || "",
    suporteImunologico: s.suporte_imunologico || "",
    contraindicacoes: s.contraindicacoes || "",
    evidenciaCientifica: s.evidencia_cientifica || "",
    efeitosSistemasCorporais: (s.efeitos_sistemas_corporais as any) || {},
  }));

  // 6 marcações semanais
  const marcacoes = Array.from({ length: 6 }, (_, i) => ({
    numero: i + 1,
    dataPrevista: new Date(Date.now() + i * 7 * 24 * 3600 * 1000)
      .toLocaleDateString("pt-BR"),
    dataEfetiva: "",
    statusPorSubstancia: substanciasRas.map((_, sIdx) => ({
      substanciaIndex: sIdx, numeroSessao: i + 1, totalSessoes: 6,
      status: "PENDENTE",
    })),
  }));

  const idade = pac.data_nascimento
    ? new Date().getFullYear() - new Date(pac.data_nascimento).getFullYear()
    : null;

  const rasBuf = await gerarPdfRAS({
    nomePaciente: pac.nome,
    cpfPaciente: pac.cpf || "",
    celularPaciente: pac.telefone || "",
    idadePaciente: idade,
    medicoResponsavel: med.nome,
    crmMedico: med.crm || "CRM-SP 164027",
    enfermeira: "Equipe de enfermagem Pádua",
    agenda: uni.nome || "Instituto Pádua",
    unidadeEndereco: uni.endereco || "Higienópolis, São Paulo SP",
    dataAtendimento: new Date().toISOString().slice(0, 10),
    substancias: substanciasRas as any,
    marcacoes: marcacoes as any,
    nomeProtocolo: "Protocolo Restaurador Mitocondrial · Carlúcia · 6 sessões",
  });
  console.log(`    ✓ PDF RAS: ${rasBuf.length} bytes`);

  // ===== 5. RACJ — Consentimento LGPD + TCLE
  console.log("[5] Gerando RACJ (LGPD + TCLE)...");
  const racjStream = gerarRacjPdf({
    paciente: {
      nome: pac.nome, cpf: pac.cpf || undefined,
      dataNascimento: pac.data_nascimento
        ? new Date(pac.data_nascimento).toLocaleDateString("pt-BR") : undefined,
      telefone: pac.telefone || undefined, email: pac.email || undefined,
      sexo: "F", enderecoCompleto: pac.endereco || undefined,
    },
    medico: med.nome,
    unidade: uni.nome || "Instituto Pádua",
    dataBase: dataHoje,
    patologias: [
      "Hipertensão arterial sistêmica (I10)",
      "Síndrome de fadiga crônica (R53)",
      "Deficiência de vitaminas e minerais (E55.9 / E61)",
      "Perimenopausa / menopausa (N95.1)",
    ],
    medicamentos: [
      "NAD+ Endovenoso 500 mg (6 sessões semanais)",
      "Coenzima Q10 100 mg + PQQ 20 mg IM (6 sessões semanais)",
      "Fórmula Magistral Oral (D3 + B12 + Magnésio + CoQ10 + Resveratrol) · 1x/dia",
    ],
  });
  const racjBuf = await streamToBuffer(racjStream);
  console.log(`    ✓ PDF RACJ: ${racjBuf.length} bytes`);

  // ===== 6. UPLOAD TUDO NO DRIVE DA PACIENTE
  console.log("[6] Subindo TODOS os documentos no Drive da Carlúcia...");
  const linksDrive: { rotulo: string; url: string }[] = [];

  // Prescrições V8
  for (const p of pdfsEmitidos) {
    const buf = await fs.readFile(path.join(pdfDir, p.arquivo));
    const up = await uploadArquivoPaciente({
      pacienteId: PACIENTE_ID, unidadeId: UNIDADE_ID,
      pacienteNome: pac.nome, codigoSemantico: pac.codigo_semantico,
      tipo: "RECEITA_SIMPLES",
      identificador: `P${p.prescricaoId}`,
      data: new Date(), mimeType: "application/pdf", conteudo: buf,
      referenciaId: p.prescricaoId, referenciaTabela: "prescricoes",
      metadataExtra: { template: "V8", demo: "fechamento_carlucia_18mai2026" },
    });
    console.log(`    ✓ ${p.rotulo}`);
    console.log(`      → ${up.driveUrl}`);
    linksDrive.push({ rotulo: p.rotulo, url: up.driveUrl });
  }

  // Pedido Exames
  const upExames = await uploadArquivoPaciente({
    pacienteId: PACIENTE_ID, unidadeId: UNIDADE_ID,
    pacienteNome: pac.nome, codigoSemantico: pac.codigo_semantico,
    tipo: "LAUDO", identificador: "PEDEXAMES",
    data: new Date(), mimeType: "application/pdf", conteudo: pedidoBuf,
    metadataExtra: { tipo_documento: "pedido_exames", demo: "fechamento_carlucia" },
  });
  console.log(`    ✓ Pedido de Exames\n      → ${upExames.driveUrl}`);
  linksDrive.push({ rotulo: "Pedido de Exames (28 exames)", url: upExames.driveUrl });

  // RAS
  const upRas = await uploadArquivoPaciente({
    pacienteId: PACIENTE_ID, unidadeId: UNIDADE_ID,
    pacienteNome: pac.nome, codigoSemantico: pac.codigo_semantico,
    tipo: "PROTOCOLO", identificador: "RAS",
    data: new Date(), mimeType: "application/pdf", conteudo: rasBuf,
    metadataExtra: { tipo_documento: "ras", demo: "fechamento_carlucia" },
  });
  console.log(`    ✓ RAS\n      → ${upRas.driveUrl}`);
  linksDrive.push({ rotulo: "RAS — Registro Administração Substâncias", url: upRas.driveUrl });

  // RACJ
  const upRacj = await uploadArquivoPaciente({
    pacienteId: PACIENTE_ID, unidadeId: UNIDADE_ID,
    pacienteNome: pac.nome, codigoSemantico: pac.codigo_semantico,
    tipo: "PROTOCOLO", identificador: "RACJ",
    data: new Date(), mimeType: "application/pdf", conteudo: racjBuf,
    metadataExtra: { tipo_documento: "racj", demo: "fechamento_carlucia" },
  });
  console.log(`    ✓ RACJ (LGPD + TCLE)\n      → ${upRacj.driveUrl}`);
  linksDrive.push({ rotulo: "RACJ — Consentimento LGPD + TCLE", url: upRacj.driveUrl });

  // ===== 7. Permission reader (idempotente)
  console.log("[7] Garantindo acesso de leitura no Drive...");
  const acesso = await garantirAcessoLeituraPaciente(PACIENTE_ID);
  console.log(`    → ${acesso.concedido ? "OK" : "FALHOU"}${acesso.motivo ? ` (${acesso.motivo})` : ""}`);

  // ===== 8. WhatsApp pra Carlúcia
  console.log("[8] Enviando WhatsApp pra Carlúcia (todos os links)...");
  const listaLinks = linksDrive.map((l, i) => `${i + 1}. ${l.rotulo}\n   ${l.url}`).join("\n\n");
  const msgPac =
    `Olá, Carlúcia! Aqui é do Instituto Pádua.\n\n` +
    `Seu fechamento de protocolo está pronto. Disponibilizamos no seu Drive ${linksDrive.length} documentos:\n\n` +
    `${listaLinks}\n\n` +
    `Você recebeu também acesso de leitura à sua pasta completa por email. Qualquer dúvida, retornamos por aqui.\n\n` +
    `Equipe PAWARDS · Instituto Pádua`;

  const wppPac = await enviarWhatsapp(pac.telefone, msgPac, { unidadeId: UNIDADE_ID });
  console.log(`    → WhatsApp paciente: ${wppPac.sucesso ? "ENVIADO" : "FALHOU"}${wppPac.erro ? ` (${wppPac.erro})` : ""}`);

  // ===== 9. Telegram pro CEO
  console.log("[9] Notificando CEO via Telegram...");
  const msgCeo =
    `FECHAMENTO DE PROTOCOLO · Carlúcia (id 3497)\n\n` +
    `Quadro: Hipertensão · Fadiga · Def. vitamínicas/minerais · Menopausa\n\n` +
    `Médico: Dr Kleber Clara Lemos (CRM-SP 164027)\n` +
    `Unidade: Instituto Pádua\n\n` +
    `Documentos emitidos e enviados pra paciente:\n\n${listaLinks}\n\n` +
    `Permission reader Drive: ${acesso.concedido ? "OK" : "FALHOU"}\n` +
    `WhatsApp Carlúcia: ${wppPac.sucesso ? "ENVIADO" : "FALHOU"}`;
  const tg = await enviarTelegramCEO(msgCeo);
  console.log(`    → Telegram CEO: ${tg.sucesso ? "ENVIADO" : "FALHOU"}${tg.erro ? ` (${tg.erro})` : ""}`);

  // ===== RESUMO
  console.log("\n========= RESUMO FECHAMENTO PROTOCOLO =========");
  console.log(`Paciente: ${pac.nome} (id ${PACIENTE_ID})`);
  console.log(`Documentos no Drive da paciente: ${linksDrive.length}`);
  for (const l of linksDrive) console.log(`  · ${l.rotulo}\n    ${l.url}`);
  console.log("===============================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("[fechamento-carlucia] ERRO:", err);
  process.exit(1);
});
