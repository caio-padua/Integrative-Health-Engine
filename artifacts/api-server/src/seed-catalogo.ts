import { db } from "@workspace/db";
import {
  injetaveisTable, endovenososTable, implantesTable, formulasTable,
  doencasTable, regrasInjetaveisTable, regrasEndovenososTable, regrasImplantesTable,
  protocolosMasterTable, protocolosFasesTable, protocolosAcoesTable,
  mapaAnamneseMotorTable, motorDecisaoTable, dietasTable,
  questionarioMasterTable, psicologiaTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const SHEET_V13 = "1zcxWpG_8WAZXfnTVH4xG-wme6qCyT8feXwhL3J_6CP8";

function csvUrl(sheetId: string, gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

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

function parseCSV(text: string, skipHeader: number = 1): string[][] {
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(skipHeader).map(parseCSVLine);
}

async function fetchCSV(sheetId: string, gid: number): Promise<string> {
  const res = await fetch(csvUrl(sheetId, gid));
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.text();
}

async function seedCatalogo() {
  console.log("=== CARGA MASSIVA PADCOM V13/V15 — CATALOGO COMPLETO ===\n");

  await db.execute(sql`TRUNCATE TABLE injetaveis RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE endovenosos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE implantes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE formulas RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE doencas RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE regras_injetaveis RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE regras_endovenosos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE regras_implantes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE protocolos_master RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE protocolos_fases RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE protocolos_acoes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE mapa_anamnese_motor RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE motor_decisao_clinica RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE dietas RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE questionario_master RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE psicologia RESTART IDENTITY CASCADE`);
  console.log("Tabelas limpas.\n");

  // =====================================================================
  // 1. INJETAVEIS MASTER — GID 1191739572 (305 linhas)
  // Header: TIPO LINHA | CODIGO INJETAVEL | AMPOLA | ATIVO | DOSAGEM | VOLUME | VIA | VALOR UNIDADE | ORIGEM VALOR | STATUS CADASTRO | OBSERVACAO | CLASSIFICACAO | EIXO INTEGRATIVO | PALAVRA CHAVE MOTOR
  // =====================================================================
  console.log("1. Buscando INJETAVEIS MASTER...");
  const injeCSV = await fetchCSV(SHEET_V13, 1191739572);
  const injeRows = parseCSV(injeCSV, 1);
  const injeValues = injeRows
    .filter(r => r[1] && r[1].startsWith("INJE"))
    .map(r => ({
      tipoLinha: r[0] || "AMPOLA",
      codigoPadcom: r[1],
      nomeAmpola: r[2] || "",
      nomeExibicao: r[3] || r[2] || "",
      dosagem: r[4] || null,
      volume: r[5] || null,
      via: r[6] || null,
      valorUnidade: r[7] || null,
      origemValor: r[8] || null,
      statusCadastro: r[9] || "ATIVO",
      observacao: r[10] || null,
      classificacao: r[11] || null,
      eixoIntegrativo: r[12] || null,
      palavraChaveMotor: r[13] || null,
    }));
  if (injeValues.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < injeValues.length; i += batchSize) {
      await db.insert(injetaveisTable).values(injeValues.slice(i, i + batchSize));
    }
  }
  console.log(`   -> ${injeValues.length} injetaveis inseridos\n`);

  // =====================================================================
  // 2. ENDOVENOSOS MASTER — GID 123545966 (63 linhas)
  // Header: TIPO LINHA | CODIGO ENDOVENOSO | SORO ENDOVENOSO | ATIVO | DOSAGEM | VOLUME | VIA | VALOR UNIDADE | ORIGEM VALOR | STATUS CADASTRO | OBSERVACAO | CLASSIFICACAO | EIXO INTEGRATIVO | PALAVRA CHAVE MOTOR | FREQUENCIA PADRAO | COMPLEMENTAR
  // =====================================================================
  console.log("2. Buscando ENDOVENOSOS MASTER...");
  const endoCSV = await fetchCSV(SHEET_V13, 123545966);
  const endoRows = parseCSV(endoCSV, 1);
  const endoValues = endoRows
    .filter(r => r[1] && r[1].startsWith("ENDO"))
    .map(r => ({
      tipoLinha: r[0] || "SORO",
      codigoPadcom: r[1],
      nomeSoro: r[2] || "",
      nomeExibicao: r[3] || r[2] || "",
      dosagem: r[4] || null,
      volume: r[5] || null,
      via: r[6] || null,
      valorUnidade: r[7] || null,
      origemValor: r[8] || null,
      statusCadastro: r[9] || "ATIVO",
      observacao: r[10] || null,
      classificacao: r[11] || null,
      eixoIntegrativo: r[12] || null,
      palavraChaveMotor: r[13] || null,
      frequenciaPadrao: r[14] || null,
      complementar: r[15] || null,
    }));
  if (endoValues.length > 0) {
    await db.insert(endovenososTable).values(endoValues);
  }
  console.log(`   -> ${endoValues.length} endovenosos inseridos\n`);

  // =====================================================================
  // 3. IMPLANTES MASTER — GID 1752598106 (32 linhas)
  // Header: CODIGO IMPLANTE | NOME IMPLANTE | ATIVO | DOSAGEM | UNIDADE | TROCARTE | LIBERACAO DIARIA | DOSE RECOMENDADA | TEMPO ACAO | INDICACAO | VIA | VALOR UNIDADE | ORIGEM VALOR | STATUS CADASTRO | OBSERVACAO
  // =====================================================================
  console.log("3. Buscando IMPLANTES MASTER...");
  const implCSV = await fetchCSV(SHEET_V13, 1752598106);
  const implRows = parseCSV(implCSV, 1);
  const implValues = implRows
    .filter(r => r[0] && r[0].startsWith("IMPL"))
    .map(r => ({
      codigoPadcom: r[0],
      nomeImplante: r[1] || "",
      substanciaAtiva: r[2] || "",
      dosagem: r[3] || null,
      unidade: r[4] || null,
      trocarte: r[5] || null,
      liberacaoDiaria: r[6] || null,
      doseRecomendada: r[7] || null,
      tempoAcao: r[8] || null,
      indicacao: r[9] || null,
      via: r[10] || null,
      valorUnidade: r[11] || null,
      origemValor: r[12] || null,
      statusCadastro: r[13] || "ATIVO",
      observacao: r[14] || null,
    }));
  if (implValues.length > 0) {
    await db.insert(implantesTable).values(implValues);
  }
  console.log(`   -> ${implValues.length} implantes inseridos\n`);

  // =====================================================================
  // 4. FORMULAS MASTER — GID 214595637 (54 linhas)
  // Header: CODIGO FORMULA | IDENTIFICADOR | CONTEUDO | AREA | FUNCAO | STATUS | | | VALIDA PADRAO CODIGO | OBS PADRAO | TIPO LINHA | VALOR UNIDADE | ORIGEM VALOR
  // =====================================================================
  console.log("4. Buscando FORMULAS MASTER...");
  const formCSV = await fetchCSV(SHEET_V13, 214595637);
  const formRows = parseCSV(formCSV, 1);
  const formValues = formRows
    .filter(r => r[0] && r[0].startsWith("FORM"))
    .map(r => ({
      codigoPadcom: r[0],
      identificador: r[1] || "",
      conteudo: r[2] || "",
      area: r[3] || null,
      funcao: r[4] || null,
      status: r[5] || "ATIVO",
      tipoLinha: r[10] || "FORMULA",
      valorUnidade: r[11] || null,
      origemValor: r[12] || null,
    }));
  if (formValues.length > 0) {
    await db.insert(formulasTable).values(formValues);
  }
  console.log(`   -> ${formValues.length} formulas inseridas\n`);

  // =====================================================================
  // 5. DOENCAS — GID 897487003 (49 linhas)
  // Header: GRUPO | DOENCA ATUAL | CODIGO LEGADO | CODIGO DOENCA | EIXO | BLOCO MOTOR | OBSERVACAO | VALIDA PADRAO CODIGO
  // =====================================================================
  console.log("5. Buscando DICIONARIO DOENCAS...");
  const doenCSV = await fetchCSV(SHEET_V13, 897487003);
  const doenRows = parseCSV(doenCSV, 3);
  const doenValues = doenRows
    .filter(r => r[3] && r[3].startsWith("DOEN"))
    .map(r => ({
      grupo: r[0] || "",
      nomeDoenca: r[1] || "",
      codigoLegado: r[2] || null,
      codigoDoenca: r[3],
      eixo: r[4] || null,
      blocoMotor: r[5] || null,
      observacao: r[6] || null,
    }));
  if (doenValues.length > 0) {
    await db.insert(doencasTable).values(doenValues);
  }
  console.log(`   -> ${doenValues.length} doencas inseridas\n`);

  // =====================================================================
  // 6. REGRAS DE INJETAVEIS — GID 1374173684 (26 regras)
  // Header: REGRA ID | PALAVRA CHAVE | EIXO | CODIGO INJETAVEL | PRIORIDADE | NOME REF | JUSTIFICATIVA | STATUS
  // =====================================================================
  console.log("6. Buscando REGRAS INJETAVEIS...");
  const riCSV = await fetchCSV(SHEET_V13, 1374173684);
  const riRows = parseCSV(riCSV, 3);
  const riValues = riRows
    .filter(r => r[0] && r[0].startsWith("MRI"))
    .map(r => ({
      regraId: r[0],
      palavraChave: r[1] || "",
      eixo: r[2] || null,
      codigoInjetavel: r[3] || null,
      prioridade: r[4] || null,
      nomeReferencia: r[5] || null,
      justificativa: r[6] || null,
      status: r[7] || "ATIVO",
    }));
  if (riValues.length > 0) {
    await db.insert(regrasInjetaveisTable).values(riValues);
  }
  console.log(`   -> ${riValues.length} regras de injetaveis inseridas\n`);

  // =====================================================================
  // 7. REGRAS DE ENDOVENOSOS — GID 1082890072 (13 regras)
  // Header: REGRA ID | PALAVRA CHAVE | EIXO | CODIGO ENDOVENOSO | PRIORIDADE | NOME REF | JUSTIFICATIVA | FREQUENCIA | COMPLEMENTAR | STATUS
  // =====================================================================
  console.log("7. Buscando REGRAS ENDOVENOSOS...");
  const reCSV = await fetchCSV(SHEET_V13, 1082890072);
  const reRows = parseCSV(reCSV, 3);
  const reValues = reRows
    .filter(r => r[0] && r[0].startsWith("MRE"))
    .map(r => ({
      regraId: r[0],
      palavraChave: r[1] || "",
      eixo: r[2] || null,
      codigoEndovenoso: r[3] || null,
      prioridade: r[4] || null,
      nomeReferencia: r[5] || null,
      justificativa: r[6] || null,
      frequencia: r[7] || null,
      complementar: r[8] || null,
      status: r[9] || "ATIVO",
    }));
  if (reValues.length > 0) {
    await db.insert(regrasEndovenososTable).values(reValues);
  }
  console.log(`   -> ${reValues.length} regras de endovenosos inseridas\n`);

  // =====================================================================
  // 8. REGRAS DE IMPLANTES — GID 1938872012 (25 regras)
  // Header: CONDICAO | PERFIL | CODIGO IMPLANTE | PRIORIDADE | EIXO | OBSERVACAO
  // =====================================================================
  console.log("8. Buscando REGRAS IMPLANTES...");
  const rimpCSV = await fetchCSV(SHEET_V13, 1938872012);
  const rimpRows = parseCSV(rimpCSV, 3);
  const rimpValues = rimpRows
    .filter(r => r[0] && r[0].length > 3 && r[2] && r[2].startsWith("IMPL"))
    .map(r => ({
      condicao: r[0],
      perfil: r[1] || null,
      codigoImplante: r[2] || null,
      prioridade: r[3] || null,
      eixo: r[4] || null,
      observacao: r[5] || null,
    }));
  if (rimpValues.length > 0) {
    await db.insert(regrasImplantesTable).values(rimpValues);
  }
  console.log(`   -> ${rimpValues.length} regras de implantes inseridas\n`);

  // =====================================================================
  // 9. PROTOCOLOS MASTER — GID 1219836845 (11 protocolos)
  // Header: CODIGO PROTOCOLO | NOME | AREA | OBJETIVO | MODO DE OFERTA | STATUS | OBSERVACAO | ... valores
  // =====================================================================
  console.log("9. Buscando PROTOCOLOS MASTER...");
  const pmCSV = await fetchCSV(SHEET_V13, 1219836845);
  const pmRows = parseCSV(pmCSV, 1);
  const pmValues = pmRows
    .filter(r => r[0] && r[0].startsWith("PROC"))
    .map(r => ({
      codigoProtocolo: r[0],
      nome: r[1] || "",
      area: r[2] || null,
      objetivo: r[3] || null,
      modoOferta: r[4] || null,
      status: r[5] || "ATIVO",
      observacao: r[6] || null,
      valorExames: r[10] || null,
      valorFormulas: r[11] || null,
      valorInjetaveis: r[12] || null,
      valorImplantes: r[13] || null,
      valorTotal: r[14] || null,
    }));
  if (pmValues.length > 0) {
    await db.insert(protocolosMasterTable).values(pmValues);
  }
  console.log(`   -> ${pmValues.length} protocolos inseridos\n`);

  // =====================================================================
  // 10. PROTOCOLOS FASES — GID 694478539 (6 fases)
  // =====================================================================
  console.log("10. Buscando PROTOCOLOS FASES...");
  const pfCSV = await fetchCSV(SHEET_V13, 694478539);
  const pfRows = parseCSV(pfCSV, 1);
  const pfValues = pfRows
    .filter(r => r[0] && r[0].startsWith("PROC"))
    .map(r => ({
      codigoProtocolo: r[0],
      fase: r[1] || "",
      diaInicio: r[2] || null,
      diaFim: r[3] || null,
      marco: r[4] || null,
      observacao: r[5] || null,
    }));
  if (pfValues.length > 0) {
    await db.insert(protocolosFasesTable).values(pfValues);
  }
  console.log(`   -> ${pfValues.length} fases inseridas\n`);

  // =====================================================================
  // 11. PROTOCOLOS ACOES — GID 1383692551 (8 acoes)
  // =====================================================================
  console.log("11. Buscando PROTOCOLOS ACOES...");
  const paCSV = await fetchCSV(SHEET_V13, 1383692551);
  const paRows = parseCSV(paCSV, 1);
  const paValues = paRows
    .filter(r => r[0] && r[0].startsWith("PROC"))
    .map(r => ({
      codigoProtocolo: r[0],
      fase: r[1] || "",
      tipoAcao: r[2] || "",
      codigoReferencia: r[3] || null,
      ordem: parseInt(r[4]) || null,
      obrigatorio: r[5] || null,
      observacao: r[6] || null,
    }));
  if (paValues.length > 0) {
    await db.insert(protocolosAcoesTable).values(paValues);
  }
  console.log(`   -> ${paValues.length} acoes inseridas\n`);

  // =====================================================================
  // 12. MAPA ANAMNESE MOTOR — GID 443241460 (19 acoplamentos)
  // Header: PERGUNTA ID | PALAVRA CHAVE | CODIGO DOENCA | EIXO | CODIGO EXAME | CODIGO FORMULA | CODIGO INJETAVEL | CODIGO IMPLANTE | CODIGO PROTOCOLO | VALIDACAO HUMANA | nomes...
  // =====================================================================
  console.log("12. Buscando MAPA ANAMNESE MOTOR...");
  const maCSV = await fetchCSV(SHEET_V13, 443241460);
  const maRows = parseCSV(maCSV, 3);
  const maValues = maRows
    .filter(r => r[0] && r[0].startsWith("Q"))
    .map(r => ({
      perguntaId: r[0],
      palavraChave: r[1] || "",
      codigoDoenca: r[2] || null,
      eixo: r[3] || null,
      codigoExame: r[4] || null,
      codigoFormula: r[5] || null,
      codigoInjetavel: r[6] || null,
      codigoImplante: r[7] || null,
      codigoProtocolo: r[8] || null,
      validacaoHumana: r[9] || null,
      nomeExame: r[10] || null,
      nomeFormula: r[11] || null,
      nomeInjetavel: r[12] || null,
      nomeImplante: r[13] || null,
      nomeProtocolo: r[14] || null,
    }));
  if (maValues.length > 0) {
    await db.insert(mapaAnamneseMotorTable).values(maValues);
  }
  console.log(`   -> ${maValues.length} acoplamentos anamnese-motor inseridos\n`);

  // =====================================================================
  // 13. MOTOR DECISAO CLINICA — GID 336322824 (19 casos)
  // Header: CASO ID | PALAVRA CHAVE | CODIGO DOENCA | EIXO | CODIGO EXAME | NOME EXAME | CODIGO FORMULA | NOME FORMULA | CODIGO INJETAVEL | NOME INJETAVEL | CODIGO IMPLANTE | NOME IMPLANTE | CODIGO PROTOCOLO | NOME PROTOCOLO | VALOR EXAME | VALOR FORMULA | VALOR INJETAVEL | VALOR IMPLANTE | VALOR TOTAL
  // =====================================================================
  console.log("13. Buscando MOTOR DECISAO CLINICA...");
  const mdCSV = await fetchCSV(SHEET_V13, 336322824);
  const mdRows = parseCSV(mdCSV, 1);
  const mdValues = mdRows
    .filter(r => r[0] && r[0].startsWith("CASO"))
    .map(r => ({
      casoId: r[0],
      palavraChave: r[1] || "",
      codigoDoenca: r[2] || null,
      eixo: r[3] || null,
      codigoExame: r[4] || null,
      nomeExame: r[5] || null,
      codigoFormula: r[6] || null,
      nomeFormula: r[7] || null,
      codigoInjetavel: r[8] || null,
      nomeInjetavel: r[9] || null,
      codigoImplante: r[10] || null,
      nomeImplante: r[11] || null,
      codigoProtocolo: r[12] || null,
      nomeProtocolo: r[13] || null,
      valorExame: r[14] || null,
      valorFormula: r[15] || null,
      valorInjetavel: r[16] || null,
      valorImplante: r[17] || null,
      valorTotal: r[18] || null,
    }));
  if (mdValues.length > 0) {
    await db.insert(motorDecisaoTable).values(mdValues);
  }
  console.log(`   -> ${mdValues.length} casos de decisao inseridos\n`);

  // =====================================================================
  // 14. DIETAS — GID 1480484082 (48 opcoes)
  // Header: CODIGO DIETA | MODELO DIETA | FAIXA CALORICA | REFEICAO | OPCAO 1 | OPCAO 2 | OPCAO 3 | STATUS
  // =====================================================================
  console.log("14. Buscando DIETAS...");
  const diCSV = await fetchCSV(SHEET_V13, 1480484082);
  const diRows = parseCSV(diCSV, 3);
  const diValues = diRows
    .filter(r => r[0] && r[0].startsWith("DIET"))
    .map(r => ({
      codigoDieta: r[0],
      modeloDieta: r[1] || "",
      faixaCalorica: r[2] || null,
      refeicao: r[3] || "",
      opcao1: r[4] || null,
      opcao2: r[5] || null,
      opcao3: r[6] || null,
      status: r[7] || "ATIVO",
    }));
  if (diValues.length > 0) {
    await db.insert(dietasTable).values(diValues);
  }
  console.log(`   -> ${diValues.length} dietas inseridas\n`);

  // =====================================================================
  // 15. QUESTIONARIO MASTER — GID 1303767092 (20 perguntas)
  // Header: BLOCO | PERGUNTA ID | PERGUNTA | TIPO RESPOSTA | OBRIGATORIO | EXEMPLO | OBSERVACAO
  // =====================================================================
  console.log("15. Buscando QUESTIONARIO MASTER...");
  const qmCSV = await fetchCSV(SHEET_V13, 1303767092);
  const qmRows = parseCSV(qmCSV, 3);
  const qmValues = qmRows
    .filter(r => r[1] && r[1].startsWith("Q"))
    .map(r => ({
      bloco: r[0] || "",
      perguntaId: r[1],
      pergunta: r[2] || "",
      tipoResposta: r[3] || null,
      obrigatorio: r[4] || null,
      exemplo: r[5] || null,
      observacao: r[6] || null,
    }));
  if (qmValues.length > 0) {
    await db.insert(questionarioMasterTable).values(qmValues);
  }
  console.log(`   -> ${qmValues.length} perguntas inseridas\n`);

  // =====================================================================
  // 16. PSICOLOGIA — GID 752007901 (5 condicoes)
  // Header: CODIGO PSICOLOGIA | CONDICAO PRINCIPAL | SINAIS CHAVE | INDICACAO INICIAL | ENCAMINHAMENTO | STATUS
  // =====================================================================
  console.log("16. Buscando PSICOLOGIA...");
  const psCSV = await fetchCSV(SHEET_V13, 752007901);
  const psRows = parseCSV(psCSV, 3);
  const psValues = psRows
    .filter(r => r[0] && r[0].startsWith("PSIC"))
    .map(r => ({
      codigoPsicologia: r[0],
      condicaoPrincipal: r[1] || "",
      sinaisChave: r[2] || null,
      indicacaoInicial: r[3] || null,
      encaminhamento: r[4] || null,
      status: r[5] || "ATIVO",
    }));
  if (psValues.length > 0) {
    await db.insert(psicologiaTable).values(psValues);
  }
  console.log(`   -> ${psValues.length} condicoes psicologicas inseridas\n`);

  // =====================================================================
  // RESUMO
  // =====================================================================
  console.log("========================================");
  console.log("CARGA MASSIVA CONCLUIDA");
  console.log("========================================");
  console.log(`Injetaveis:         ${injeValues.length}`);
  console.log(`Endovenosos:        ${endoValues.length}`);
  console.log(`Implantes:          ${implValues.length}`);
  console.log(`Formulas:           ${formValues.length}`);
  console.log(`Doencas:            ${doenValues.length}`);
  console.log(`Regras injetaveis:  ${riValues.length}`);
  console.log(`Regras endovenosos: ${reValues.length}`);
  console.log(`Regras implantes:   ${rimpValues.length}`);
  console.log(`Protocolos:         ${pmValues.length}`);
  console.log(`Protocolos fases:   ${pfValues.length}`);
  console.log(`Protocolos acoes:   ${paValues.length}`);
  console.log(`Mapa anamnese:      ${maValues.length}`);
  console.log(`Motor decisao:      ${mdValues.length}`);
  console.log(`Dietas:             ${diValues.length}`);
  console.log(`Questionario:       ${qmValues.length}`);
  console.log(`Psicologia:         ${psValues.length}`);
  const total = injeValues.length + endoValues.length + implValues.length + formValues.length +
    doenValues.length + riValues.length + reValues.length + rimpValues.length +
    pmValues.length + pfValues.length + paValues.length + maValues.length +
    mdValues.length + diValues.length + qmValues.length + psValues.length;
  console.log(`\nTOTAL DE REGISTROS:  ${total}`);
}

seedCatalogo().then(() => {
  console.log("\nSeed catalogo COMPLETO.");
  process.exit(0);
}).catch((err) => {
  console.error("Erro no seed catalogo:", err);
  process.exit(1);
});
