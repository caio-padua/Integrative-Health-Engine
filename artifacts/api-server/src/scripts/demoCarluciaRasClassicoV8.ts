/**
 * RAS CLÁSSICO V8 — Carlúcia (3497) · 18/mai/2026
 *
 * Caio (CEO) pediu portar o RAS Clássico paisagem pro padrão V8 (paleta
 * navy/dourado/creme + faixa dourada superior + assinatura institucional
 * PAWARDS®/PADCON® no rodapé). Layout mantido (5 páginas paisagem A4).
 *
 * Roda: tsx artifacts/api-server/src/scripts/demoCarluciaRasClassicoV8.ts
 */
import { pool } from "@workspace/db";
import { gerarPdfRAS } from "../pdf/gerarRAS";
import { uploadArquivoPaciente } from "../lib/arquivos/drive";
import { enviarTelegramCEO } from "../services/telegramService";

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const MEDICO_ID = 6;

async function main() {
  console.log("\n========= RAS CLÁSSICO V8 — CARLÚCIA (3497) =========");
  console.log("Repaleta navy/dourado/creme · faixa V8 · footer institucional\n");

  const pac = (await pool.query(
    `SELECT id, nome, cpf, telefone, data_nascimento, endereco, codigo_semantico
     FROM pacientes WHERE id=$1`, [PACIENTE_ID])).rows[0];
  const med = (await pool.query(
    `SELECT nome, crm FROM usuarios WHERE id=$1`, [MEDICO_ID])).rows[0];
  const uni = (await pool.query(
    `SELECT nome, endereco FROM unidades WHERE id=$1`, [UNIDADE_ID])).rows[0];

  const sub = await pool.query(
    `SELECT nome, abreviacao, via, cor, dose_padrao, categoria, descricao,
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
     ) ORDER BY id`);

  const dataHoje = new Date().toLocaleDateString("pt-BR");
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

  console.log("[1] Gerando RAS Clássico V8 (paisagem · 4 páginas)...");
  const buf = await gerarPdfRAS({
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
  console.log(`    ✓ ${(buf.length / 1024).toFixed(1)} KB`);

  console.log("[2] Subindo no Drive da paciente...");
  const up = await uploadArquivoPaciente({
    pacienteId: PACIENTE_ID,
    unidadeId: UNIDADE_ID,
    pacienteNome: pac.nome,
    codigoSemantico: pac.codigo_semantico,
    tipo: "RAS",
    identificador: "CLASSICO-V8",
    data: new Date(),
    mimeType: "application/pdf",
    conteudo: buf,
    metadataExtra: { demo: "ras_classico_v8_carlucia_18mai2026", layout: "V8_repaleta" },
  });
  console.log(`    → ${up.driveUrl}`);

  console.log("[3] Enviando Telegram pro CEO...");
  const msg =
    "🎨 *RAS CLÁSSICO V8 — Carlúcia*\n\n" +
    "Portado pro padrão V8 institucional:\n" +
    "• Paleta navy/dourado/creme (igual RAS V8)\n" +
    "• Faixa dourada 4px no topo de cada página\n" +
    "• Assinatura PAWARDS®/PADCON® no rodapé\n" +
    "• Layout paisagem 4 páginas mantido\n\n" +
    `📄 ${up.driveUrl}\n\n` +
    "_Pra comparar lado a lado com o RAS V8 vertical, abre os 2 e me fala o feedback._";
  await enviarTelegramCEO(msg);
  console.log("    → Telegram CEO: ENVIADO");

  console.log("\n========= PRONTO =========");
  console.log(up.driveUrl);
  console.log("==========================\n");
  await pool.end();
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
