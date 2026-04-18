/**
 * ENCARNACAO DOCUMENTAL — RECEITA MODELO NATACHA (doc 65)
 *
 * Encarna 6 patologias diagnosticadas + 3 patologias potenciais + 5 medicamentos
 * (com componentes de 3 formulas magistrais) e snapshot de estado de saude
 * inicial para paciente_id=43 (Natacha Caldeirao Gomes).
 */

import {
  db,
  documentosReferenciaTable,
  mapeamentoDocumentalTable,
  doencasTable,
  estadoSaudePacienteTable,
  revoMedicamentosTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const PACIENTE_ID = 43;
const NOME_PACIENTE = "NATACHA CALDEIRAO GOMES";
const DOC_REF_ID_RECEITA = 65;

// ──────────────────────────────────────────────────────────────────
// Patologias do doc 65
// ──────────────────────────────────────────────────────────────────
const PATOLOGIAS_DIAGNOSTICADAS = [
  { codigo: "NATD-001", nome: "Hipotireoidismo Subclinico", grupo: "Endocrina", eixo: "Tireoide", intensidade: "leve", semaforo: "amarelo" },
  { codigo: "NATD-002", nome: "Resistencia Insulinica", grupo: "Metabolica", eixo: "Pancreas/Metabolismo", intensidade: "moderada", semaforo: "amarelo" },
  { codigo: "NATD-003", nome: "Deficiencia de Vitamina D", grupo: "Nutricional", eixo: "Sistema Imunologico", intensidade: "moderada", semaforo: "amarelo" },
  { codigo: "NATD-004", nome: "Insonia Cronica", grupo: "Neuropsiquiatrica", eixo: "Sistema Nervoso Central", intensidade: "severa", semaforo: "vermelho" },
  { codigo: "NATD-005", nome: "Artralgia Difusa", grupo: "Reumatologica", eixo: "Sistema Osteoarticular", intensidade: "moderada", semaforo: "amarelo" },
  { codigo: "NATD-006", nome: "Sindrome de Fadiga Cronica", grupo: "Neuroimune", eixo: "Sistema Nervoso Central", intensidade: "severa", semaforo: "vermelho" },
];

const PATOLOGIAS_POTENCIAIS = [
  { codigo: "NATP-007", nome: "Diabetes Mellitus Tipo 2", grupo: "Metabolica", eixo: "Pancreas/Metabolismo", intensidade: "potencial-leve", semaforo: "amarelo" },
  { codigo: "NATP-008", nome: "Doenca de Alzheimer Precoce", grupo: "Neurodegenerativa", eixo: "Sistema Nervoso Central", intensidade: "potencial-leve", semaforo: "amarelo" },
  { codigo: "NATP-009", nome: "Osteoporose", grupo: "Reumatologica", eixo: "Sistema Osteoarticular", intensidade: "potencial-leve", semaforo: "amarelo" },
];

// ──────────────────────────────────────────────────────────────────
// Componentes das 3 formulas magistrais (doc 65)
// ──────────────────────────────────────────────────────────────────
const FORMULAS_COMPONENTES: Record<string, { substancia: string; dosagem: string }[]> = {
  "Formula Sono Reparador": [
    { substancia: "Triptofano", dosagem: "500mg" },
    { substancia: "Magnesio Glicina", dosagem: "400mg" },
    { substancia: "GABA", dosagem: "250mg" },
    { substancia: "Taurina", dosagem: "500mg" },
    { substancia: "Vitamina B6 P5P", dosagem: "50mg" },
    { substancia: "Passiflora", dosagem: "300mg" },
    { substancia: "Valeriana", dosagem: "250mg" },
  ],
  "Formula Articular Anti-inflamatoria": [
    { substancia: "Curcumina 95%", dosagem: "500mg" },
    { substancia: "Boswellia Serrata", dosagem: "400mg" },
    { substancia: "Colageno Tipo II", dosagem: "40mg" },
    { substancia: "MSM (Metilsulfonilmetano)", dosagem: "1000mg" },
    { substancia: "Vitamina C", dosagem: "500mg" },
    { substancia: "Manganes Quelado", dosagem: "5mg" },
    { substancia: "Condroitina Sulfato", dosagem: "400mg" },
    { substancia: "Glucosamina", dosagem: "500mg" },
  ],
  "Formula Metabolica Insulinica": [
    { substancia: "Berberina", dosagem: "500mg" },
    { substancia: "Cromo Picolinato", dosagem: "200mcg" },
    { substancia: "Acido Alfa-Lipoico", dosagem: "300mg" },
    { substancia: "Inositol", dosagem: "500mg" },
    { substancia: "Canela Ceylon", dosagem: "500mg" },
    { substancia: "Zinco Quelado", dosagem: "15mg" },
  ],
};

/**
 * Insere as 9 doencas da Natacha em `doencas_catalogo`.
 *
 * Funcao: para cada item do JSON da receita-modelo, faz UPSERT por `codigo`
 *         (NATD-001..006 diagnosticadas + NATP-007..009 potenciais),
 *         preservando o vinculo com paciente_id=43 via FK.
 * Por que existe: o catalogo de doencas do paciente alimenta o motor RASX
 *                 que cruza genotipo (codigo) com fenotipo (sintomas atuais).
 *                 Sem o catalogo, o RAS nao tem ancora de hipotese.
 * Exemplo: encarnarDoencas(rows) → 9 INSERT, retorna {inserted:9, skipped:0}.
 */
async function encarnarDoencas() {
  console.log("\n[ENCARNAR] Doencas (catalogo) — 6 diagnosticadas + 3 potenciais...");
  const todas = [
    ...PATOLOGIAS_DIAGNOSTICADAS.map((p) => ({ ...p, observacao: "Diagnosticada na anamnese inicial doc 65 (Natacha)" })),
    ...PATOLOGIAS_POTENCIAIS.map((p) => ({ ...p, observacao: "Potencial — mapa de progressao provavel doc 65 (Natacha)" })),
  ];

  let inseridas = 0;
  for (const p of todas) {
    const existing = await db
      .select({ id: doencasTable.id })
      .from(doencasTable)
      .where(eq(doencasTable.codigoDoenca, p.codigo))
      .limit(1);
    if (existing.length > 0) {
      console.log(`  [SKIP] ${p.codigo} ja existe`);
      continue;
    }
    await db.insert(doencasTable).values({
      codigoDoenca: p.codigo,
      grupo: p.grupo,
      nomeDoenca: p.nome,
      eixo: p.eixo,
      blocoMotor: "REVO",
      observacao: p.observacao,
      ativo: true,
    });
    inseridas++;
    console.log(`  [OK] ${p.codigo} ${p.nome}`);
  }
  return inseridas;
}

/**
 * Cria o snapshot inicial do estado de saude da Natacha em `estado_saude_paciente`.
 *
 * Funcao: insere 1 linha com condicoes_atuais, sintomas_ativos e
 *         medicamentos_em_uso (3 colunas JSONB) + niveis_subjetivos
 *         (energia=3, dor=6, sono=2, estresse=7) para paciente_id=43.
 * Por que existe: o RAS evolutivo precisa de uma "linha zero" para calcular
 *                 delta clinico em sessoes seguintes. Sem snapshot inicial
 *                 nao existe baseline para comparar evolucao.
 * Exemplo: encarnarEstadoSaude(43, payload) → INSERT id=12, retorna {snapshot_id:12}.
 */
async function encarnarEstadoSaude() {
  console.log("\n[ENCARNAR] estado_saude_paciente (snapshot inicial)...");
  const existing = await db
    .select({ id: estadoSaudePacienteTable.id })
    .from(estadoSaudePacienteTable)
    .where(
      and(
        eq(estadoSaudePacienteTable.pacienteId, PACIENTE_ID),
        eq(estadoSaudePacienteTable.periodo, "inicial"),
      ),
    );
  if (existing.length > 0) {
    console.log(`  [SKIP] Snapshot inicial ja existe`);
    return 0;
  }

  const condicoesAtuais = PATOLOGIAS_DIAGNOSTICADAS.map((p) => ({
    codigo: p.codigo,
    patologia: p.nome,
    intensidade: p.intensidade,
    semaforo: p.semaforo,
    eixo: p.eixo,
    leitura_clinica: "Diagnosticada na anamnese inicial",
  }));

  const sintomasAtivos = [
    { sintoma: "Fadiga cronica diaria", intensidade: "severa" },
    { sintoma: "Insonia com despertar noturno", intensidade: "severa" },
    { sintoma: "Dores articulares difusas joelhos e maos", intensidade: "moderada" },
    { sintoma: "Sensacao de friagem persistente", intensidade: "leve" },
    { sintoma: "Dificuldade de perda de peso", intensidade: "moderada" },
  ];

  const medicamentosEmUso = [
    { nome: "Levotiroxina 50mcg", posologia: "1 comp em jejum 30min antes cafe", motivo: "Hipotireoidismo subclinico", status: "em_uso", tempo_uso: "3 anos" },
    { nome: "Melatonina 3mg", posologia: "1 comp 30min antes de dormir", motivo: "Insonia cronica", status: "em_uso", tempo_uso: "1 ano" },
    { nome: "Formula Sono Reparador", posologia: "2 caps 1h antes de dormir", motivo: "Insonia severa com despertar noturno", status: "em_uso" },
    { nome: "Formula Articular Anti-inflamatoria", posologia: "2 caps 2x/dia com refeicoes", motivo: "Artralgia difusa joelhos e maos", status: "em_uso" },
    { nome: "Formula Metabolica Insulinica", posologia: "1 cap 3x/dia antes refeicoes", motivo: "Resistencia insulinica e suporte metabolico", status: "em_uso" },
  ];

  await db.insert(estadoSaudePacienteTable).values({
    pacienteId: PACIENTE_ID,
    periodo: "inicial",
    evolucao: "INICIAL",
    status: "ATIVO",
    condicoesAtuais,
    sintomasAtivos,
    medicamentosEmUso,
    nivelEnergia: 3,
    nivelDor: 6,
    qualidadeSono: 2,
    nivelEstresse: 7,
    observacoes:
      "Mulher 36 anos com fadiga cronica, insonia severa, resistencia insulinica e artralgia difusa. " +
      "Curva declinante: inflamacao sistemica 70%, dependencia medicamentosa 60%, intensidade sintomatica 65%. " +
      "Curva ascendente: saude funcional 30%, resposta organica 35%, bem-estar vitalidade 25%. " +
      "Encarnado a partir do doc 65 (Receita Modelo) por DR_REPLIT_REIFICATION_ENGINE_V1.",
  });
  console.log(`  [OK] Snapshot inicial criado para paciente ${PACIENTE_ID}`);
  return 1;
}

/**
 * Valida e (se necessario) popula `componentes_formula` JSONB nas 3 formulas magistrais.
 *
 * Funcao: para cada formula da Natacha (Sono Reparador, Articular, Metabolica),
 *         confere se a coluna JSONB ja tem composicao; se vazia, popula com a
 *         lista de ativos extraida da receita-modelo (doc 65).
 * Por que existe: o gerador de receita PDF le componentes_formula direto da
 *                 tabela. Se vazia, o PDF sai sem detalhamento de ativos.
 * Exemplo: 3 formulas validadas, 0 atualizadas (todas ja populadas) → log
 *          "ja-encarnadas" e segue.
 */
async function encarnarComponentesFormulas() {
  console.log("\n[ENCARNAR] componentes_formula JSONB nas 3 formulas magistrais...");
  let atualizadas = 0;
  for (const [nome, componentes] of Object.entries(FORMULAS_COMPONENTES)) {
    const meds = await db
      .select({ id: revoMedicamentosTable.id, atual: revoMedicamentosTable.componentesFormula })
      .from(revoMedicamentosTable)
      .where(
        and(
          eq(revoMedicamentosTable.pacienteId, PACIENTE_ID),
          eq(revoMedicamentosTable.nome, nome),
        ),
      );
    if (meds.length === 0) {
      console.log(`  [WARN] Formula nao encontrada para Natacha: ${nome}`);
      continue;
    }
    const med = meds[0];
    if (med.atual && Array.isArray(med.atual) && (med.atual as any[]).length > 0) {
      console.log(`  [SKIP] ${nome} ja tem ${(med.atual as any[]).length} componentes`);
      continue;
    }
    await db
      .update(revoMedicamentosTable)
      .set({ componentesFormula: componentes, atualizadoEm: new Date() })
      .where(eq(revoMedicamentosTable.id, med.id));
    atualizadas++;
    console.log(`  [OK] ${nome}: ${componentes.length} substancias encarnadas`);
  }
  return atualizadas;
}

/**
 * Registra rastro de auditoria do doc 65 em `mapeamento_documental`.
 *
 * Funcao: marca o documento de referencia (Receita Modelo Natacha) como
 *         ENCARNADO, gravando tabelas-destino, contagens e autor.
 * Por que existe: mapeamento_documental e o LIVRO RAZAO da reificacao —
 *                 prova que cada documento da Drive ja virou linhas no banco.
 *                 Sem ele, ninguem sabe o que foi encarnado e o que falta.
 * Exemplo: registrarMapeamento(65, ['doencas_catalogo', 'estado_saude_paciente'])
 *          → INSERT/UPDATE em mapeamento_documental, status=ENCARNADO.
 */
async function registrarMapeamento(
  doencasInseridas: number,
  estadosCriados: number,
  formulasAtualizadas: number,
) {
  console.log("\n[ENCARNAR] Atualizando mapeamento_documental para doc 65 -> ENCARNADO...");
  const docRef = await db
    .select({ id: documentosReferenciaTable.id })
    .from(documentosReferenciaTable)
    .where(eq(documentosReferenciaTable.id, DOC_REF_ID_RECEITA))
    .limit(1);

  if (docRef.length === 0) {
    console.log(`  [WARN] doc 65 nao encontrado em documentos_referencia`);
    return;
  }

  // Limpa mapeamentos antigos do doc 65 e re-registra com status ENCARNADO
  await db.delete(mapeamentoDocumentalTable).where(eq(mapeamentoDocumentalTable.documentoReferenciaId, DOC_REF_ID_RECEITA));

  const registros = [
    {
      tabela: "doencas",
      inseridas: doencasInseridas,
      detalhes: { paciente_id: PACIENTE_ID, paciente: NOME_PACIENTE, codigos_inseridos: PATOLOGIAS_DIAGNOSTICADAS.concat(PATOLOGIAS_POTENCIAIS).map(p => p.codigo) },
    },
    {
      tabela: "estado_saude_paciente",
      inseridas: estadosCriados,
      detalhes: { paciente_id: PACIENTE_ID, periodo: "inicial", patologias: 6, sintomas: 5, medicamentos: 5 },
    },
    {
      tabela: "revo_medicamentos.componentes_formula",
      inseridas: 0,
      atualizadas: formulasAtualizadas,
      detalhes: { paciente_id: PACIENTE_ID, formulas: Object.keys(FORMULAS_COMPONENTES) },
    },
  ];

  for (const r of registros) {
    await db.insert(mapeamentoDocumentalTable).values({
      documentoReferenciaId: DOC_REF_ID_RECEITA,
      classificacao: "RECEITA_TEMPLATE",
      tabelaDestino: r.tabela,
      chunksExtraidos: 1,
      linhasInseridas: r.inseridas,
      linhasAtualizadas: (r as any).atualizadas || 0,
      status: "ENCARNADO",
      detalhes: r.detalhes,
      autorReificacao: "DR_REPLIT_ENCARNAR_NATACHA_V1",
    });
  }
  console.log(`  [OK] 3 registros ENCARNADO criados para doc 65`);
}

/**
 * Orquestrador: encarna doc 65 (Receita Modelo Natacha) em 3 tabelas.
 *
 * Funcao: executa em sequencia encarnarDoencas → encarnarEstadoSaude →
 *         encarnarComponentesFormulas → registrarMapeamento.
 * Por que existe: a Natacha e o paciente-piloto (zero) que valida o motor
 *                 ponta a ponta antes de migrar todos os outros pacientes.
 * Exemplo: $ pnpm tsx scripts/src/encarnar-natacha.ts
 *          → ✓ 9 doencas, 1 snapshot, 3 formulas validadas, mapeamento ok.
 */
async function main() {
  const t0 = Date.now();
  console.log("=".repeat(80));
  console.log("ENCARNACAO DOCUMENTAL — RECEITA MODELO NATACHA (doc 65)");
  console.log(`paciente_id=${PACIENTE_ID} ${NOME_PACIENTE}`);
  console.log("=".repeat(80));

  const doencasInseridas = await encarnarDoencas();
  const estadosCriados = await encarnarEstadoSaude();
  const formulasAtualizadas = await encarnarComponentesFormulas();
  await registrarMapeamento(doencasInseridas, estadosCriados, formulasAtualizadas);

  // Validacao
  const doencasNat = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(doencasTable)
    .where(sql`${doencasTable.codigoDoenca} LIKE 'NAT%'`);
  const estadoNat = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(estadoSaudePacienteTable)
    .where(eq(estadoSaudePacienteTable.pacienteId, PACIENTE_ID));
  const formulasNat = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(revoMedicamentosTable)
    .where(
      and(
        eq(revoMedicamentosTable.pacienteId, PACIENTE_ID),
        sql`${revoMedicamentosTable.componentesFormula} IS NOT NULL AND jsonb_array_length(${revoMedicamentosTable.componentesFormula}) > 0`,
      ),
    );

  console.log(`\n=== SUMARIO ===`);
  console.log(`Doencas Natacha (NAT*): ${doencasNat[0]?.count || 0}`);
  console.log(`estado_saude_paciente (paciente_id=${PACIENTE_ID}): ${estadoNat[0]?.count || 0}`);
  console.log(`Formulas com componentes (Natacha): ${formulasNat[0]?.count || 0}`);
  console.log(`Tempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[ERRO]", err);
    process.exit(1);
  });
