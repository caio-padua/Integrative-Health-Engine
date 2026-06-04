// Seed RASCUNHO de materias-primas/ativos (decisao D001=A).
// Doses de FONTES PUBLICAS — exigem validacao medica do Caio antes de virarem
// verdade clinica. Por isso origem_dado='SEED_RASCUNHO' e a UI mostra badge.
//
// Idempotente e NAO-DESTRUTIVO:
//  - se nao existir (por nome): INSERE como rascunho;
//  - se existir JA como SEED_RASCUNHO: ATUALIZA a classificacao (re-seed seguro);
//  - se existir com qualquer outra origem (OPERADOR/VALIDADO_MEDICO/...): PULA,
//    nunca sobrescreve dado humano.
//
// Rodar: pnpm --filter @workspace/api-server exec tsx src/scripts/seed-substancias-rascunho.ts

import { db } from "@workspace/db";
import { substanciasTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

// Cor pela Natureza (D002=Sim) — face CLARA/saturada (texto branco no swatch).
// Espelha lib clinica-motor src/lib/naturezaAtivo.ts (corClaro).
const COR_NATUREZA: Record<string, string> = {
  Fitoterapico: "#3F6E3F",
  Hormonio: "#5A4A82",
  Sintetico: "#2E5C92",
  Nutraceutico: "#9C6E16",
  "Mineral/Aminoacido": "#1E7A6E",
};

interface AtivoRascunho {
  nome: string;
  natureza: keyof typeof COR_NATUREZA;
  funcoes: string[];
  finalidades: string[];
  doseMin: string;
  doseMax: string;
  dosePadrao: string;
  unidade: string;
  via: string;
  potencia: number; // 1-5
  eficacia: number; // 1-5 (reusa classificacaoEstrelas, D003=A)
}

const ATIVOS: AtivoRascunho[] = [
  // ── Fitoterapicos ──────────────────────────────────────────────
  { nome: "Maca Peruana", natureza: "Fitoterapico", funcoes: ["Modulador Hormonal", "Adaptogeno"], finalidades: ["Preventiva/Profilatica"], doseMin: "1500", doseMax: "3000", dosePadrao: "2000", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Panax Ginseng", natureza: "Fitoterapico", funcoes: ["Adaptogeno", "Neurotransmissor/Precursor"], finalidades: ["Preventiva/Profilatica"], doseMin: "200", doseMax: "400", dosePadrao: "300", unidade: "mg", via: "oral", potencia: 4, eficacia: 4 },
  { nome: "Ashwagandha", natureza: "Fitoterapico", funcoes: ["Adaptogeno", "Modulador Hormonal"], finalidades: ["Preventiva/Profilatica", "Curativa"], doseMin: "300", doseMax: "600", dosePadrao: "450", unidade: "mg", via: "oral", potencia: 4, eficacia: 5 },
  { nome: "Rhodiola Rosea", natureza: "Fitoterapico", funcoes: ["Adaptogeno"], finalidades: ["Preventiva/Profilatica"], doseMin: "200", doseMax: "600", dosePadrao: "400", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Tribulus Terrestris", natureza: "Fitoterapico", funcoes: ["Modulador Hormonal"], finalidades: ["Preventiva/Profilatica"], doseMin: "250", doseMax: "750", dosePadrao: "500", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },
  { nome: "Cha Verde (EGCG)", natureza: "Fitoterapico", funcoes: ["Termogenico/Lipolitico"], finalidades: ["Estetica"], doseMin: "250", doseMax: "500", dosePadrao: "400", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },
  { nome: "Curcuma (Curcumina)", natureza: "Fitoterapico", funcoes: [], finalidades: ["Curativa", "Paliativa/Suporte"], doseMin: "500", doseMax: "1000", dosePadrao: "750", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Garcinia Cambogia", natureza: "Fitoterapico", funcoes: ["Termogenico/Lipolitico"], finalidades: ["Estetica"], doseMin: "500", doseMax: "1500", dosePadrao: "1000", unidade: "mg", via: "oral", potencia: 2, eficacia: 2 },
  { nome: "Cafeina Anidra", natureza: "Fitoterapico", funcoes: ["Termogenico/Lipolitico"], finalidades: ["Estetica"], doseMin: "100", doseMax: "300", dosePadrao: "200", unidade: "mg", via: "oral", potencia: 4, eficacia: 3 },
  { nome: "Ginkgo Biloba", natureza: "Fitoterapico", funcoes: ["Neurotransmissor/Precursor"], finalidades: ["Preventiva/Profilatica"], doseMin: "120", doseMax: "240", dosePadrao: "180", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },

  // ── Hormonios ──────────────────────────────────────────────────
  { nome: "Testosterona", natureza: "Hormonio", funcoes: ["Modulador Hormonal"], finalidades: ["Curativa"], doseMin: "100", doseMax: "250", dosePadrao: "200", unidade: "mg", via: "im", potencia: 5, eficacia: 5 },
  { nome: "Melatonina", natureza: "Hormonio", funcoes: ["Modulador Hormonal"], finalidades: ["Preventiva/Profilatica"], doseMin: "1", doseMax: "5", dosePadrao: "3", unidade: "mg", via: "oral", potencia: 4, eficacia: 4 },
  { nome: "DHEA", natureza: "Hormonio", funcoes: ["Modulador Hormonal"], finalidades: ["Preventiva/Profilatica"], doseMin: "25", doseMax: "50", dosePadrao: "25", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },
  { nome: "Progesterona", natureza: "Hormonio", funcoes: ["Modulador Hormonal"], finalidades: ["Curativa"], doseMin: "100", doseMax: "200", dosePadrao: "100", unidade: "mg", via: "oral", potencia: 4, eficacia: 4 },
  { nome: "Estradiol", natureza: "Hormonio", funcoes: ["Modulador Hormonal"], finalidades: ["Curativa"], doseMin: "1", doseMax: "2", dosePadrao: "1", unidade: "mg", via: "oral", potencia: 5, eficacia: 4 },
  { nome: "Pregnenolona", natureza: "Hormonio", funcoes: ["Modulador Hormonal", "Neurotransmissor/Precursor"], finalidades: ["Preventiva/Profilatica"], doseMin: "25", doseMax: "50", dosePadrao: "30", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },

  // ── Sinteticos ─────────────────────────────────────────────────
  { nome: "Sildenafila", natureza: "Sintetico", funcoes: [], finalidades: ["Curativa"], doseMin: "25", doseMax: "100", dosePadrao: "50", unidade: "mg", via: "oral", potencia: 5, eficacia: 5 },
  { nome: "Tadalafila", natureza: "Sintetico", funcoes: [], finalidades: ["Curativa"], doseMin: "5", doseMax: "20", dosePadrao: "10", unidade: "mg", via: "oral", potencia: 5, eficacia: 5 },
  { nome: "Minoxidil", natureza: "Sintetico", funcoes: [], finalidades: ["Estetica"], doseMin: "2", doseMax: "5", dosePadrao: "5", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Finasterida", natureza: "Sintetico", funcoes: ["Modulador Hormonal"], finalidades: ["Curativa", "Estetica"], doseMin: "1", doseMax: "1", dosePadrao: "1", unidade: "mg", via: "oral", potencia: 4, eficacia: 4 },

  // ── Nutraceuticos ──────────────────────────────────────────────
  { nome: "Coenzima Q10", natureza: "Nutraceutico", funcoes: [], finalidades: ["Preventiva/Profilatica", "Paliativa/Suporte"], doseMin: "100", doseMax: "300", dosePadrao: "200", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Omega 3 (EPA/DHA)", natureza: "Nutraceutico", funcoes: [], finalidades: ["Preventiva/Profilatica"], doseMin: "1000", doseMax: "3000", dosePadrao: "2000", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Resveratrol", natureza: "Nutraceutico", funcoes: [], finalidades: ["Preventiva/Profilatica"], doseMin: "150", doseMax: "500", dosePadrao: "250", unidade: "mg", via: "oral", potencia: 2, eficacia: 3 },
  { nome: "Vitamina D3", natureza: "Nutraceutico", funcoes: [], finalidades: ["Preventiva/Profilatica"], doseMin: "2000", doseMax: "5000", dosePadrao: "4000", unidade: "UI", via: "oral", potencia: 3, eficacia: 4 },

  // ── Minerais / Aminoacidos ─────────────────────────────────────
  { nome: "Magnesio (Glicinato)", natureza: "Mineral/Aminoacido", funcoes: [], finalidades: ["Preventiva/Profilatica", "Paliativa/Suporte"], doseMin: "200", doseMax: "400", dosePadrao: "300", unidade: "mg", via: "oral", potencia: 3, eficacia: 4 },
  { nome: "Zinco Quelato", natureza: "Mineral/Aminoacido", funcoes: ["Modulador Hormonal"], finalidades: ["Preventiva/Profilatica"], doseMin: "15", doseMax: "30", dosePadrao: "20", unidade: "mg", via: "oral", potencia: 2, eficacia: 3 },
  { nome: "L-Arginina", natureza: "Mineral/Aminoacido", funcoes: [], finalidades: ["Preventiva/Profilatica"], doseMin: "3000", doseMax: "6000", dosePadrao: "5000", unidade: "mg", via: "oral", potencia: 2, eficacia: 3 },
  { nome: "Creatina Monohidratada", natureza: "Mineral/Aminoacido", funcoes: [], finalidades: ["Preventiva/Profilatica"], doseMin: "3000", doseMax: "5000", dosePadrao: "5000", unidade: "mg", via: "oral", potencia: 4, eficacia: 5 },
  { nome: "L-Teanina", natureza: "Mineral/Aminoacido", funcoes: ["Neurotransmissor/Precursor"], finalidades: ["Preventiva/Profilatica"], doseMin: "100", doseMax: "200", dosePadrao: "200", unidade: "mg", via: "oral", potencia: 2, eficacia: 3 },
  { nome: "5-HTP", natureza: "Mineral/Aminoacido", funcoes: ["Neurotransmissor/Precursor"], finalidades: ["Curativa", "Preventiva/Profilatica"], doseMin: "50", doseMax: "200", dosePadrao: "100", unidade: "mg", via: "oral", potencia: 3, eficacia: 3 },
];

async function seed() {
  console.log("=".repeat(60));
  console.log(`Seed RASCUNHO de ativos — ${ATIVOS.length} candidatos (origem SEED_RASCUNHO)`);
  console.log("=".repeat(60));

  let inseridos = 0;
  let atualizados = 0;
  let pulados = 0;

  for (const a of ATIVOS) {
    const existentes = await db
      .select({ id: substanciasTable.id, origemDado: substanciasTable.origemDado })
      .from(substanciasTable)
      .where(sql`lower(${substanciasTable.nome}) = lower(${a.nome})`)
      .orderBy(substanciasTable.id);

    const valores = {
      naturezaAtivo: a.natureza,
      funcoesObjetivo: a.funcoes.length ? a.funcoes : null,
      finalidades: a.finalidades.length ? a.finalidades : null,
      doseMinima: a.doseMin,
      doseMaxima: a.doseMax,
      potencia: a.potencia,
      classificacaoEstrelas: a.eficacia,
      cor: COR_NATUREZA[a.natureza],
    };

    if (existentes.length === 0) {
      await db.insert(substanciasTable).values({
        nome: a.nome,
        categoria: a.natureza,
        via: a.via,
        dosePadrao: a.dosePadrao,
        unidadeDose: a.unidade,
        origemDado: "SEED_RASCUNHO",
        ...valores,
      });
      inseridos++;
      console.log(`  + ${a.nome} (${a.natureza}) — INSERIDO rascunho`);
      continue;
    }

    const reg = existentes[0];
    if (reg.origemDado === "SEED_RASCUNHO") {
      await db
        .update(substanciasTable)
        .set(valores)
        .where(sql`${substanciasTable.id} = ${reg.id}`);
      atualizados++;
      console.log(`  ~ ${a.nome} — ATUALIZADO (ja era rascunho)`);
    } else {
      pulados++;
      console.log(`  . ${a.nome} — PULADO (origem=${reg.origemDado}, dado humano preservado)`);
    }
  }

  console.log("=".repeat(60));
  console.log(`OK: ${inseridos} inseridos, ${atualizados} atualizados, ${pulados} pulados.`);
  console.log("ATENCAO: doses sao RASCUNHO de fontes publicas — exigem validacao medica do Caio.");
  console.log("=".repeat(60));
  process.exit(0);
}

seed().catch((err) => {
  console.error("Falha no seed de ativos rascunho:", err);
  process.exit(1);
});
