/**
 * Wave V25 PADCOM Demo — gera planilha Google Sheets V25 PADCOM populada
 * para o paciente Luciano Carvalho Torraga Dos Santos (id=4587, masc, 38a,
 * unidade Pádua id=15, código semântico PADU SANT LUCI MASC 1988 6873).
 *
 * Dados clínicos SIMULADOS (paciente sem prontuário real). Narrativa:
 * "homem 38a entra com déficit Vit D + LDL alto + HOMA-IR alto, recupera
 * com protocolo PADCON ao longo de 3 datas avaliativas D1→D2→D3."
 *
 * Uso: pnpm --filter @workspace/scripts run gerar-v25-luciano
 */
import {
  criarFichaV25Padcom,
  type GrupoPatologico,
  type BlendItem,
  type FichaV25Input,
} from "../../artifacts/api-server/src/lib/sheets/fichaV25Padcom.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const PACIENTE_ID = Number(process.env["PACIENTE_ID"] || "4587");
const DRIVE_FOLDER_ID = process.env["DRIVE_FOLDER_ID"] || undefined;

const DATAS = {
  d1: "2026-01-15", // baseline
  d2: "2026-04-10", // controle 3 meses
  d3: "2026-05-12", // recente 4 meses
};

const GRUPOS: GrupoPatologico[] = [
  {
    codigo: "CARDIOVASCULAR",
    titulo: "Cardiovascular e Inflamação",
    exames: [
      { nome: "Colesterol Total",   unidade: "mg/dL",   refMin: 130, refMax: 200, tercoOtimo: "MEDIO",    d1: 235,  d2: 210,  d3: 185  },
      { nome: "LDL Colesterol",     unidade: "mg/dL",   refMin: 50,  refMax: 130, tercoOtimo: "INFERIOR", d1: 158,  d2: 132,  d3: 112  },
      { nome: "HDL Colesterol",     unidade: "mg/dL",   refMin: 40,  refMax: 80,  tercoOtimo: "SUPERIOR", d1: 38,   d2: 44,   d3: 52   },
      { nome: "Triglicerideos",     unidade: "mg/dL",   refMin: 50,  refMax: 150, tercoOtimo: "INFERIOR", d1: 220,  d2: 160,  d3: 128  },
      { nome: "hs-CRP",             unidade: "mg/L",    refMin: 0.1, refMax: 3.0, tercoOtimo: "INFERIOR", d1: 4.2,  d2: 2.1,  d3: 0.8  },
      { nome: "Homocisteina",       unidade: "umol/L",  refMin: 5,   refMax: 15,  tercoOtimo: "INFERIOR", d1: 13.5, d2: 10.2, d3: 7.8  },
    ],
  },
  {
    codigo: "METABOLICO",
    titulo: "Metabolismo e Eixo Endócrino",
    exames: [
      { nome: "Glicose Jejum",      unidade: "mg/dL",   refMin: 70,  refMax: 99,  tercoOtimo: "MEDIO",    d1: 104,  d2: 98,   d3: 92   },
      { nome: "Insulina Jejum",     unidade: "uUI/mL",  refMin: 3,   refMax: 15,  tercoOtimo: "INFERIOR", d1: 18,   d2: 12,   d3: 8.5  },
      { nome: "HOMA-IR",            unidade: "indice",  refMin: 0.5, refMax: 2.5, tercoOtimo: "INFERIOR", d1: 4.6,  d2: 2.9,  d3: 1.9  },
      { nome: "Hemoglobina A1c",    unidade: "%",       refMin: 4.0, refMax: 5.6, tercoOtimo: "INFERIOR", d1: 5.9,  d2: 5.6,  d3: 5.3  },
      { nome: "TSH",                unidade: "uUI/mL",  refMin: 0.4, refMax: 4.5, tercoOtimo: "MEDIO",    d1: 3.8,  d2: 2.4,  d3: 1.8  },
      { nome: "Cortisol Manha",     unidade: "ug/dL",   refMin: 6,   refMax: 19,  tercoOtimo: "MEDIO",    d1: 22,   d2: 16,   d3: 14   },
      { nome: "DHEA-S",             unidade: "ug/dL",   refMin: 80,  refMax: 560, tercoOtimo: "SUPERIOR", d1: 95,   d2: 210,  d3: 340  },
    ],
  },
  {
    codigo: "VITAMINAS_MINERAIS",
    titulo: "Vitaminas e Minerais",
    exames: [
      { nome: "Vit D 25-OH",        unidade: "ng/mL",   refMin: 30,  refMax: 100, tercoOtimo: "SUPERIOR", d1: 18,   d2: 34,   d3: 58   },
      { nome: "Vitamina B12",       unidade: "pg/mL",   refMin: 200, refMax: 900, tercoOtimo: "SUPERIOR", d1: 240,  d2: 480,  d3: 720  },
      { nome: "Acido Folico",       unidade: "ng/mL",   refMin: 3,   refMax: 17,  tercoOtimo: "SUPERIOR", d1: 4.2,  d2: 8.5,  d3: 13   },
      { nome: "Ferritina",          unidade: "ng/mL",   refMin: 30,  refMax: 400, tercoOtimo: "MEDIO",    d1: 38,   d2: 120,  d3: 210  },
      { nome: "Magnesio Eritrocit", unidade: "mg/dL",   refMin: 1.6, refMax: 2.6, tercoOtimo: "MEDIO",    d1: 1.7,  d2: 1.9,  d3: 2.1  },
      { nome: "Zinco",              unidade: "ug/dL",   refMin: 70,  refMax: 150, tercoOtimo: "SUPERIOR", d1: 75,   d2: 105,  d3: 128  },
    ],
  },
  {
    codigo: "AUTOIMUNE",
    titulo: "Marcadores Autoimunes",
    exames: [
      { nome: "FAN (titulacao)",    unidade: "1:x",     refMin: 0,   refMax: 80,  tercoOtimo: "INFERIOR", d1: 80,   d2: 80,   d3: 40   },
      { nome: "Fator Reumatoide",   unidade: "UI/mL",   refMin: 0,   refMax: 14,  tercoOtimo: "INFERIOR", d1: 12,   d2: 8,    d3: 5    },
      { nome: "PCR ultra-sensivel", unidade: "mg/L",    refMin: 0.1, refMax: 3.0, tercoOtimo: "INFERIOR", d1: 4.2,  d2: 2.1,  d3: 0.8  },
      { nome: "IgA Total",          unidade: "mg/dL",   refMin: 70,  refMax: 400, tercoOtimo: "MEDIO",    d1: 245,  d2: 230,  d3: 210  },
    ],
  },
  {
    codigo: "ONCOLOGICO",
    titulo: "Rastreio Oncologico (Masc)",
    exames: [
      { nome: "PSA Total",          unidade: "ng/mL",   refMin: 0.1, refMax: 2.5, tercoOtimo: "INFERIOR", d1: 0.8,  d2: 0.7,  d3: 0.6  },
      { nome: "PSA Livre",          unidade: "ng/mL",   refMin: 0.1, refMax: 1.0, tercoOtimo: "INFERIOR", d1: 0.3,  d2: 0.25, d3: 0.2  },
      { nome: "CEA",                unidade: "ng/mL",   refMin: 0.1, refMax: 3.0, tercoOtimo: "INFERIOR", d1: 1.2,  d2: 1.0,  d3: 0.9  },
    ],
  },
  {
    codigo: "NEURO_PSI",
    titulo: "Neuro-Psiquiatrico e Eixo Sono",
    exames: [
      { nome: "Cortisol Noturno",   unidade: "ug/dL",   refMin: 1.5, refMax: 7.5, tercoOtimo: "INFERIOR", d1: 9.2,  d2: 6.8,  d3: 3.4  },
      { nome: "Melatonina",         unidade: "pg/mL",   refMin: 50,  refMax: 200, tercoOtimo: "SUPERIOR", d1: 35,   d2: 90,   d3: 160  },
      { nome: "Serotonina",         unidade: "ng/mL",   refMin: 50,  refMax: 200, tercoOtimo: "SUPERIOR", d1: 65,   d2: 120,  d3: 175  },
      { nome: "Triptofano",         unidade: "umol/L",  refMin: 30,  refMax: 90,  tercoOtimo: "SUPERIOR", d1: 32,   d2: 55,   d3: 78   },
      { nome: "Vitamina B6 (P5P)",  unidade: "ng/mL",   refMin: 5,   refMax: 50,  tercoOtimo: "SUPERIOR", d1: 6,    d2: 18,   d3: 32   },
    ],
  },
  {
    codigo: "GASTRO_HEPATICO",
    titulo: "Gastro-Hepatico",
    exames: [
      { nome: "AST (TGO)",          unidade: "U/L",     refMin: 10,  refMax: 40,  tercoOtimo: "INFERIOR", d1: 48,   d2: 32,   d3: 22   },
      { nome: "ALT (TGP)",          unidade: "U/L",     refMin: 7,   refMax: 56,  tercoOtimo: "INFERIOR", d1: 62,   d2: 38,   d3: 24   },
      { nome: "Gama GT (GGT)",      unidade: "U/L",     refMin: 8,   refMax: 61,  tercoOtimo: "INFERIOR", d1: 75,   d2: 42,   d3: 28   },
      { nome: "Bilirrubina Total",  unidade: "mg/dL",   refMin: 0.3, refMax: 1.2, tercoOtimo: "MEDIO",    d1: 1.1,  d2: 0.9,  d3: 0.7  },
      { nome: "Albumina",           unidade: "g/dL",    refMin: 3.5, refMax: 5.0, tercoOtimo: "SUPERIOR", d1: 3.6,  d2: 4.1,  d3: 4.6  },
    ],
  },
  {
    codigo: "RENAL",
    titulo: "Funcao Renal e Eletrolitos",
    exames: [
      { nome: "Ureia",              unidade: "mg/dL",   refMin: 16,  refMax: 50,  tercoOtimo: "MEDIO",    d1: 42,   d2: 35,   d3: 30   },
      { nome: "Creatinina",         unidade: "mg/dL",   refMin: 0.7, refMax: 1.3, tercoOtimo: "MEDIO",    d1: 1.15, d2: 1.05, d3: 0.95 },
      { nome: "eGFR",               unidade: "mL/min",  refMin: 90,  refMax: 150, tercoOtimo: "SUPERIOR", d1: 78,   d2: 95,   d3: 115  },
      { nome: "Acido Urico",        unidade: "mg/dL",   refMin: 3.4, refMax: 7.0, tercoOtimo: "INFERIOR", d1: 7.4,  d2: 6.2,  d3: 5.0  },
      { nome: "Microalbuminuria",   unidade: "mg/g",    refMin: 0,   refMax: 30,  tercoOtimo: "INFERIOR", d1: 35,   d2: 18,   d3: 8    },
    ],
  },
  {
    codigo: "MUSCULO_ESQ",
    titulo: "Musculo-Esqueletico e Eixo Osseo",
    exames: [
      { nome: "CPK Total",          unidade: "U/L",     refMin: 30,  refMax: 200, tercoOtimo: "MEDIO",    d1: 245,  d2: 160,  d3: 110  },
      { nome: "Calcio Ionico",      unidade: "mg/dL",   refMin: 4.5, refMax: 5.6, tercoOtimo: "MEDIO",    d1: 4.4,  d2: 4.8,  d3: 5.1  },
      { nome: "Fosforo",            unidade: "mg/dL",   refMin: 2.5, refMax: 4.5, tercoOtimo: "MEDIO",    d1: 4.6,  d2: 3.8,  d3: 3.4  },
      { nome: "PTH",                unidade: "pg/mL",   refMin: 15,  refMax: 65,  tercoOtimo: "MEDIO",    d1: 78,   d2: 52,   d3: 38   },
      { nome: "Osteocalcina",       unidade: "ng/mL",   refMin: 11,  refMax: 43,  tercoOtimo: "SUPERIOR", d1: 12,   d2: 24,   d3: 36   },
    ],
  },
];

const BLENDS: BlendItem[] = [
  {
    numero: 1,
    nome: "Blend Metabolico Hepatico",
    ativos: ["Berberina 500mg", "NAC 600mg", "Silimarina 200mg", "Cromo Picolinato 200mcg", "Ac. Alfa Lipoico 300mg"],
    posologia: "1 capsula 12/12h apos refeicao",
    inicioEm: "2026-01-15",
    observacao: "Foco em sensibilizacao a insulina e protecao hepatica",
  },
  {
    numero: 2,
    nome: "Blend Vitamina D Potencializada",
    ativos: ["Vit D3 50.000 UI", "K2 MK7 200mcg", "Mg Glicinato 400mg", "Boro 3mg", "Vit A 5.000 UI"],
    posologia: "1 capsula 1x/semana (segunda-feira)",
    inicioEm: "2026-01-15",
    observacao: "Reposicao agressiva — paciente entrou com 18 ng/mL",
  },
  {
    numero: 3,
    nome: "Blend Anti-Inflamatorio Sistemico",
    ativos: ["Curcumina BCM-95 500mg", "Resveratrol 250mg", "Omega 3 EPA/DHA 1g", "Boswellia 300mg", "Quercetina 250mg"],
    posologia: "1 capsula 12/12h",
    inicioEm: "2026-01-22",
    observacao: "Reduz hs-CRP e dor articular subclinica",
  },
  {
    numero: 4,
    nome: "Blend Neuro Restaurador Sono",
    ativos: ["Mg L-Treonato 144mg", "L-Triptofano 500mg", "Melatonina 3mg", "L-Teanina 200mg", "B6 P5P 50mg"],
    posologia: "1 capsula 30min antes de dormir",
    inicioEm: "2026-02-05",
    observacao: "Restaura ciclo circadiano — cortisol noturno estava em 9.2",
  },
  {
    numero: 5,
    nome: "Blend Androgenico Adaptogenico",
    ativos: ["Tongkat Ali 400mg", "Ashwagandha KSM-66 600mg", "Maca Peruana 1g", "Zinco Quelato 30mg", "DHEA 25mg"],
    posologia: "1 capsula pela manha em jejum",
    inicioEm: "2026-02-22",
    observacao: "Eleva DHEA-S de 95 para 340 — ganho de vitalidade e libido",
  },
];

async function buscarPaciente() {
  const r = await db.execute(sql`
    SELECT id, nome, codigo_semantico, cpf, data_nascimento::text AS data_nascimento,
           genero AS sexo, telefone, email, google_drive_folder_id
    FROM pacientes WHERE id=${PACIENTE_ID}
  `);
  const rows = (r as any).rows ?? r;
  if (!rows || rows.length === 0) throw new Error(`paciente id=${PACIENTE_ID} nao encontrado`);
  return rows[0];
}

async function main() {
  console.log(`[gerar-v25-luciano] iniciando paciente_id=${PACIENTE_ID}`);
  const p = await buscarPaciente();
  console.log(`[gerar-v25-luciano] paciente: ${p.nome} (${p.codigo_semantico})`);

  const driveFolderId = DRIVE_FOLDER_ID || p.google_drive_folder_id || undefined;
  if (driveFolderId) {
    console.log(`[gerar-v25-luciano] destino Drive: ${driveFolderId}`);
  } else {
    console.log(`[gerar-v25-luciano] sem pasta Drive — fica na raiz "Meu Drive" da conta google-drive`);
  }

  const fileName = `V25_PADCOM_DEMO_${p.codigo_semantico ?? `id_${p.id}`}_${new Date().toISOString().substring(0, 10)}`;

  const input: FichaV25Input = {
    paciente: {
      id: p.id,
      nome: p.nome,
      codigoSemantico: p.codigo_semantico,
      cpf: p.cpf,
      dataNascimento: p.data_nascimento,
      sexo: p.sexo,
      telefone: p.telefone,
      email: p.email,
    },
    datasAvaliativas: DATAS,
    grupos: GRUPOS,
    blends: BLENDS,
    cirurgias: [],
    driveFolderId,
    fileName,
  };

  const out = await criarFichaV25Padcom(input);
  console.log(`[gerar-v25-luciano] OK`);
  console.log(`  spreadsheetId: ${out.spreadsheetId}`);
  console.log(`  url:           ${out.spreadsheetUrl}`);
  console.log(`  abas:          14 (CADASTRO + RESUMO EXECUTIVO + 9 grupos + BLENDS + CIRURGIAS + PARAMETROS)`);
  console.log(`  exames totais: ${GRUPOS.reduce((acc, g) => acc + g.exames.length, 0)}`);
  console.log(`  blends ativos: ${BLENDS.length}/20`);
}

main().catch((e) => {
  console.error("[gerar-v25-luciano] FALHOU:", e?.message || e);
  console.error(e?.stack);
  process.exit(1);
});
