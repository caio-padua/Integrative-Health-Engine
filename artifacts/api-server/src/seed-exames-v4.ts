import { db } from "@workspace/db";
import {
  examesBaseTable, matrizRastreioTable, regrasTriagemTable,
  recorrenciaTable, dicionarioGrausTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const SHEET_V4 = "1WT_KWftbpZY8DvQYPoj9J6u3MbTarqd_pBKObBDE-4M";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(1).map(parseCSVLine);
}

async function fetchSheet(sheetName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_V4}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch ${sheetName}: ${res.status}`);
  const text = await res.text();
  if (text.includes("<!DOCTYPE")) throw new Error(`Got HTML instead of CSV for ${sheetName}`);
  return text;
}

function val(v: string | undefined): string | null {
  if (!v || v.trim() === "") return null;
  return v.trim();
}

function intVal(v: string | undefined): number | null {
  const n = parseInt(v || "", 10);
  return isNaN(n) ? null : n;
}

async function seedExamesBase() {
  console.log("Importando BASE EXAMES MOTOR V1...");
  const csv = await fetchSheet("BASE EXAMES MOTOR V1");
  const rows = parseCSV(csv);
  console.log(`  ${rows.length} linhas encontradas`);

  await db.delete(examesBaseTable);

  const batch = rows.map(r => ({
    codigoExame: r[0] || `EX_${Date.now()}`,
    ativo: r[1] !== "NAO",
    grupoPrincipal: r[2] || "GERAL",
    subgrupo: val(r[3]),
    nomeExame: r[4] || r[0],
    modalidade: val(r[5]),
    materialOuSetor: val(r[6]),
    agrupamentoPdf: val(r[7]),
    preparo: val(r[8]),
    recomendacoes: val(r[9]),
    corpoPedido: val(r[10]),
    hd1: val(r[11]),
    cid1: val(r[12]),
    hd2: val(r[13]),
    cid2: val(r[14]),
    hd3: val(r[15]),
    cid3: val(r[16]),
    justificativaObjetiva: val(r[17]),
    justificativaNarrativa: val(r[18]),
    justificativaRobusta: val(r[19]),
    sexoAplicavel: val(r[20]),
    idadeInicialDiretriz: val(r[21]),
    idadeInicialAltoRisco: val(r[22]),
    frequenciaDiretriz: val(r[23]),
    frequenciaProtocoloPadua: val(r[24]),
    tipoIndicacao: val(r[25]),
    gatilhoPorSintoma: val(r[26]),
    gatilhoPorDoenca: val(r[27]),
    gatilhoPorHistoricoFamiliar: val(r[28]),
    gatilhoPorCheckUp: val(r[29]),
    exigeValidacaoHumana: val(r[30]),
    prioridade: val(r[31]),
    exameDeRastreio: val(r[32]),
    exameDeSeguimento: val(r[33]),
    permiteRecorrenciaAutomatica: val(r[34]),
    intervaloRecorrenciaDias: val(r[35]),
    perfilDeRisco: val(r[36]),
    fonteDaRegra: val(r[37]),
    fonteUrl: val(r[38]),
    observacaoClinica: val(r[39]),
    blocoOficial: val(r[40]),
    grauDoBloco: val(r[41]),
    usaGrade: val(r[42]),
    ordemNoBloco: intVal(r[43]),
    finalidadePrincipal: val(r[44]),
    finalidadeSecundaria: val(r[45]),
    objetivoPratico: val(r[46]),
    objetivoTecnico: val(r[47]),
    interpretacaoPratica: val(r[48]),
    quandoPensarNesteExame: val(r[49]),
    limitacaoDoExame: val(r[50]),
    correlacaoClinica: val(r[51]),
    legendaRapida: val(r[52]),
    inflamacaoVisual: val(r[53]),
    oxidacaoVisual: val(r[54]),
    riscoCardiometabolicoVisual: val(r[55]),
    valorClinicoVisual: val(r[56]),
    complexidadeInterpretativaVisual: val(r[57]),
  }));

  const seen = new Set<string>();
  const deduped = batch.filter(b => {
    if (seen.has(b.codigoExame)) return false;
    seen.add(b.codigoExame);
    return true;
  });

  for (let i = 0; i < deduped.length; i += 30) {
    await db.insert(examesBaseTable).values(deduped.slice(i, i + 30)).onConflictDoNothing();
  }
  console.log(`  ${deduped.length} exames importados (${batch.length - deduped.length} duplicados removidos)`);
}

async function seedMatrizRastreio() {
  console.log("Importando MATRIZ RASTREIO V2...");
  const csv = await fetchSheet("MATRIZ RASTREIO V2");
  const rows = parseCSV(csv);
  console.log(`  ${rows.length} linhas encontradas`);

  await db.delete(matrizRastreioTable);

  const batch = rows.map(r => ({
    codigoExame: r[0] || "",
    nomeExame: r[1] || "",
    blocoOficial: val(r[2]),
    grauDoBloco: val(r[3]),
    sexoAplicavel: val(r[4]),
    idadeInicialDiretriz: val(r[5]),
    idadeInicialAltoRisco: val(r[6]),
    frequenciaDiretriz: val(r[7]),
    frequenciaProtocoloPadua: val(r[8]),
    tipoIndicacao: val(r[9]),
    gatilhoPorSintoma: val(r[10]),
    prioridade: val(r[11]),
    exameDeRastreio: val(r[12]),
    perfilDeRisco: val(r[13]),
  }));

  for (let i = 0; i < batch.length; i += 50) {
    await db.insert(matrizRastreioTable).values(batch.slice(i, i + 50));
  }
  console.log(`  ${batch.length} registros de rastreio importados`);
}

async function seedRegrasTriagem() {
  console.log("Importando REGRAS TRIAGEM V2...");
  const csv = await fetchSheet("REGRAS TRIAGEM V2");
  const rows = parseCSV(csv);
  console.log(`  ${rows.length} linhas encontradas`);

  await db.delete(regrasTriagemTable);

  const batch = rows.map(r => ({
    regraId: r[0] || `REG_${Date.now()}`,
    pergunta: r[1] || "",
    respostaGatilho: r[2] || "",
    tipoCondicao: val(r[3]),
    blocoSugerido: val(r[4]),
    exameSugerido: val(r[5]),
    prioridade: val(r[6]),
    tipoAcao: val(r[7]),
    validacaoHumana: val(r[8]),
    observacao: val(r[9]),
  }));

  await db.insert(regrasTriagemTable).values(batch);
  console.log(`  ${batch.length} regras importadas`);
}

async function seedRecorrencia() {
  console.log("Importando RECORRENCIA V2...");
  const csv = await fetchSheet("RECORRENCIA V2");
  const rows = parseCSV(csv);
  console.log(`  ${rows.length} linhas encontradas`);

  await db.delete(recorrenciaTable);

  const batch = rows.map(r => ({
    regraId: r[0] || `REC_${Date.now()}`,
    exameOuPainel: r[1] || "",
    intervaloDias: intVal(r[2]),
    acaoDisparada: val(r[3]),
    geraNovoPagamento: val(r[4]),
    exigeNovaValidacao: val(r[5]),
    permiteNovaEmissao: val(r[6]),
    prioridade: val(r[7]),
    observacao: val(r[8]),
  }));

  await db.insert(recorrenciaTable).values(batch);
  console.log(`  ${batch.length} regras de recorrencia importadas`);
}

async function seedDicionarioGraus() {
  console.log("Importando DICIONARIO GRAUS V1...");
  const csv = await fetchSheet("DICIONARIO GRAUS V1");
  const rows = parseCSV(csv);
  console.log(`  ${rows.length} linhas encontradas`);

  await db.delete(dicionarioGrausTable);

  const batch = rows.map(r => ({
    grau: r[0] || "",
    descricao: val(r[1]),
    quandoUsar: val(r[2]),
    observacao: val(r[3]),
  }));

  await db.insert(dicionarioGrausTable).values(batch);
  console.log(`  ${batch.length} graus importados`);
}

async function padronizarNomesMapa() {
  console.log("Padronizando nomes no mapa_bloco_exame...");
  const renames: [string, string][] = [
    ["ANGIOTOMOGRAFIA CORONARIANA", "ANGIOTOMOGRAFIA DE CORONARIAS"],
    ["CALCIO CORONARIANO", "ESCORE DE CALCIO CORONARIANO"],
    ["ECOCARDIOGRAMA COM STRESS", "ECOCARDIOGRAMA"],
    ["MAMOGRAFIA COM TOMOSSINTESE", "MAMOGRAFIA DIGITAL"],
    ["RAIO X DE ABDOME", "RX DE ABDOME"],
    ["RAIO X DE ARTICULACOES", "RX DE MEMBROS"],
    ["RAIO X DE COLUNA", "RX DE COLUNA"],
    ["RAIO X DE TORAX", "RX DE TORAX"],
    ["RESSONANCIA MAGNETICA DE SELA TURCA", "RESSONANCIA MAGNETICA DE SELA TURCICA"],
    ["RESSONANCIA MAGNETICA DE ABDOME SUPERIOR", "RESSONANCIA MAGNETICA DE ABDOME"],
  ];

  for (const [oldName, newName] of renames) {
    const result = await db.execute(
      sql`UPDATE mapa_bloco_exame SET nome_exame = ${newName} WHERE nome_exame = ${oldName}`
    );
    console.log(`  ${oldName} -> ${newName}`);
  }

  const newExams: [string, string][] = [
    ["ECOCARDIOGRAMA TRANSTORACICO", "ECOCARDIOGRAMA TRANSTORACICO"],
    ["ANUSCOPIA", "ANUSCOPIA"],
    ["CAPSULA ENDOSCOPICA", "CAPSULA ENDOSCOPICA"],
    ["DOPPLER DE CAROTIDAS", "DOPPLER DE CAROTIDAS"],
    ["NASOFIBROSCOPIA", "NASOFIBROSCOPIA"],
    ["RESSONANCIA MAGNETICA DE JOELHO", "RESSONANCIA MAGNETICA DE JOELHO"],
    ["RESSONANCIA MAGNETICA DE OMBRO", "RESSONANCIA MAGNETICA DE OMBRO"],
  ];
  console.log("  7 exames mantidos no banco (existem so no banco, nao na V4)");

  const v4Only = [
    "BRONCOSCOPIA", "CINTILOGRAFIA MIOCARDICA", "CISTOSCOPIA",
    "HISTEROSCOPIA", "RESSONANCIA MAGNETICA DE PROSTATA",
    "RESSONANCIA MAGNETICA DE TORAX", "RESSONANCIA MAGNETICA DE PESCOCO",
  ];
  console.log(`  7 exames novos da V4 serao adicionados via exames_base`);
}

export async function seedExamesV4() {
  console.log("\n=== SEED EXAMES V4 ===\n");

  await seedExamesBase();
  await seedMatrizRastreio();
  await seedRegrasTriagem();
  await seedRecorrencia();
  await seedDicionarioGraus();
  await padronizarNomesMapa();

  const examesCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM exames_base`);
  const rastreioCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM matriz_rastreio`);
  const triageCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM regras_triagem`);
  const recCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM recorrencia`);
  const grausCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM dicionario_graus`);

  console.log("\n=== RESUMO FINAL ===");
  console.log(`Exames base: ${(examesCount as any).rows?.[0]?.cnt ?? '?'}`);
  console.log(`Matriz rastreio: ${(rastreioCount as any).rows?.[0]?.cnt ?? '?'}`);
  console.log(`Regras triagem: ${(triageCount as any).rows?.[0]?.cnt ?? '?'}`);
  console.log(`Recorrencia: ${(recCount as any).rows?.[0]?.cnt ?? '?'}`);
  console.log(`Dicionario graus: ${(grausCount as any).rows?.[0]?.cnt ?? '?'}`);
  console.log("\n=== SEED V4 COMPLETO ===\n");
}

seedExamesV4().catch(e => {
  console.error("Erro no seed V4:", e);
  process.exit(1);
});
