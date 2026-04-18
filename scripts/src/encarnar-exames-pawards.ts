/**
 * ENCARNACAO MOTOR DE EXAMES PAWARDS
 *
 * Reifica a "Planilha Geradora Exames Clinica V3" do Drive (TABELAS PLANILHAS EMPRESA)
 * em duas tabelas do banco:
 *   1. exames_base (UPSERT 34 exames com 3 HD/CID + 3 niveis de justificativa)
 *   2. cid10 (CRIA tabela + seed dos 66 CIDs unicos extraidos da planilha)
 *
 * Os 3 niveis de justificativa NAO sao aleatorios. Sao graus de robustez:
 *   - OBJETIVA  (~150c) — convenio nao briga
 *   - NARRATIVA (~250c) — convenio padrao
 *   - ROBUSTA   (~400c) — plano de saude exigente / auditoria
 *
 * O medico (ou o motor autonomo) escolhe o estilo em runtime ao gerar o pedido.
 *
 * Fonte: https://drive.google.com/drive/folders/1PFpUOQJe6R39VvtEbJj6nhRBs7_NxsQ7
 *        Planilha Geradora Exames Clinica V3 (id 1P2QSPsGsdUPegpfZnXAUBxOh1Ahz91f8asKmcHg9DU8)
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../data");

interface Exame {
  codigo: string;
  ativo: string;
  grupo: string;
  subgrupo: string;
  nome: string;
  modalidade: string;
  material: string;
  agrupamento_pdf: string;
  preparo: string;
  recomendacoes: string;
  corpo_pedido: string;
  hd1: string; cid1: string;
  hd2: string; cid2: string;
  hd3: string; cid3: string;
  just_objetiva: string;
  just_narrativa: string;
  just_robusta: string;
}

interface Cid {
  codigo: string;
  hd_associado: string;
}

async function main() {
  const exames: Exame[] = JSON.parse(fs.readFileSync(path.join(ROOT, "exames-pawards.json"), "utf8"));
  const cids: Cid[] = JSON.parse(fs.readFileSync(path.join(ROOT, "cid10-pawards.json"), "utf8"));

  console.log(`\n📋 Carregados ${exames.length} exames + ${cids.length} CIDs unicos\n`);

  // ──────────────────────────────────────────────────────────────────
  // FASE 1: Garantir tabela cid10
  // ──────────────────────────────────────────────────────────────────
  console.log("─── Criando tabela cid10 (se nao existir) ───");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cid10 (
      codigo TEXT PRIMARY KEY,
      capitulo TEXT NOT NULL DEFAULT 'NAO_CLASSIFICADO',
      hd_associado_principal TEXT,
      descricao_oficial TEXT,
      origem TEXT NOT NULL DEFAULT 'PLANILHA_PAWARDS_V3',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS cid10_capitulo_idx ON cid10 (capitulo)`);

  // Capitulo derivado do prefixo (A,B → infecciosas; C,D → neoplasias; E → endocrinas; etc.)
  const capituloDe = (cod: string): string => {
    const c = cod.charAt(0).toUpperCase();
    const map: Record<string, string> = {
      A: "I_INFECCIOSAS_PARASITARIAS", B: "I_INFECCIOSAS_PARASITARIAS",
      C: "II_NEOPLASIAS", D: "II_NEOPLASIAS_E_HEMATOLOGICAS",
      E: "IV_ENDOCRINAS_NUTRICIONAIS_METABOLICAS",
      F: "V_TRANSTORNOS_MENTAIS",
      G: "VI_DOENCAS_SISTEMA_NERVOSO",
      H: "VII_OLHO_OUVIDO",
      I: "IX_APARELHO_CIRCULATORIO",
      J: "X_APARELHO_RESPIRATORIO",
      K: "XI_APARELHO_DIGESTIVO",
      L: "XII_PELE_TECIDO_SUBCUTANEO",
      M: "XIII_OSTEOMUSCULAR_TECIDO_CONJUNTIVO",
      N: "XIV_GENITURINARIO",
      O: "XV_GRAVIDEZ_PARTO_PUERPERIO",
      P: "XVI_AFECCOES_PERIODO_PERINATAL",
      Q: "XVII_MALFORMACOES_CONGENITAS",
      R: "XVIII_SINTOMAS_SINAIS_ACHADOS_ANORMAIS",
      S: "XIX_LESOES_TRAUMATISMOS", T: "XIX_LESOES_TRAUMATISMOS",
      V: "XX_CAUSAS_EXTERNAS", W: "XX_CAUSAS_EXTERNAS",
      X: "XX_CAUSAS_EXTERNAS", Y: "XX_CAUSAS_EXTERNAS",
      Z: "XXI_FATORES_INFLUENCIAM_ESTADO_SAUDE",
    };
    return map[c] || "NAO_CLASSIFICADO";
  };

  let cidsInseridos = 0;
  for (const cid of cids) {
    const r: any = await db.execute(sql`
      INSERT INTO cid10 (codigo, capitulo, hd_associado_principal, origem)
      VALUES (${cid.codigo}, ${capituloDe(cid.codigo)}, ${cid.hd_associado}, 'PLANILHA_PAWARDS_V3')
      ON CONFLICT (codigo) DO UPDATE SET
        hd_associado_principal = COALESCE(cid10.hd_associado_principal, EXCLUDED.hd_associado_principal),
        atualizado_em = now()
      RETURNING (xmax = 0) AS inserted
    `);
    if (r.rows?.[0]?.inserted) cidsInseridos++;
  }
  const cidsTotal: any = await db.execute(sql`SELECT count(*)::int as c FROM cid10`);
  console.log(`  ✓ CIDs novos inseridos: ${cidsInseridos}`);
  console.log(`  ✓ CIDs total na tabela: ${cidsTotal.rows[0].c}`);

  // ──────────────────────────────────────────────────────────────────
  // FASE 2: UPSERT 34 exames em exames_base
  // ──────────────────────────────────────────────────────────────────
  console.log("\n─── UPSERT 34 exames em exames_base ───");

  let inseridos = 0, atualizados = 0;
  for (const ex of exames) {
    const r: any = await db.execute(sql`
      INSERT INTO exames_base (
        codigo_exame, ativo, grupo_principal, subgrupo, nome_exame, modalidade,
        material_ou_setor, agrupamento_pdf, preparo, recomendacoes, corpo_pedido,
        hd_1, cid_1, hd_2, cid_2, hd_3, cid_3,
        justificativa_objetiva, justificativa_narrativa, justificativa_robusta
      ) VALUES (
        ${ex.codigo}, ${ex.ativo === "SIM"}, ${ex.grupo}, ${ex.subgrupo}, ${ex.nome}, ${ex.modalidade},
        ${ex.material}, ${ex.agrupamento_pdf}, ${ex.preparo}, ${ex.recomendacoes}, ${ex.corpo_pedido},
        ${ex.hd1}, ${ex.cid1}, ${ex.hd2 || null}, ${ex.cid2 || null}, ${ex.hd3 || null}, ${ex.cid3 || null},
        ${ex.just_objetiva || null}, ${ex.just_narrativa || null}, ${ex.just_robusta || null}
      )
      ON CONFLICT (codigo_exame) DO UPDATE SET
        ativo = EXCLUDED.ativo,
        grupo_principal = EXCLUDED.grupo_principal,
        subgrupo = EXCLUDED.subgrupo,
        nome_exame = EXCLUDED.nome_exame,
        modalidade = EXCLUDED.modalidade,
        material_ou_setor = EXCLUDED.material_ou_setor,
        agrupamento_pdf = EXCLUDED.agrupamento_pdf,
        preparo = EXCLUDED.preparo,
        recomendacoes = EXCLUDED.recomendacoes,
        corpo_pedido = EXCLUDED.corpo_pedido,
        hd_1 = EXCLUDED.hd_1, cid_1 = EXCLUDED.cid_1,
        hd_2 = EXCLUDED.hd_2, cid_2 = EXCLUDED.cid_2,
        hd_3 = EXCLUDED.hd_3, cid_3 = EXCLUDED.cid_3,
        justificativa_objetiva = EXCLUDED.justificativa_objetiva,
        justificativa_narrativa = EXCLUDED.justificativa_narrativa,
        justificativa_robusta = EXCLUDED.justificativa_robusta
      RETURNING (xmax = 0) AS inserted
    `);
    if (r.rows?.[0]?.inserted) inseridos++; else atualizados++;
  }
  console.log(`  ✓ Inseridos: ${inseridos} | Atualizados: ${atualizados}`);

  // ──────────────────────────────────────────────────────────────────
  // FASE 3: Validacao + sumario
  // ──────────────────────────────────────────────────────────────────
  console.log("\n─── Validacao final ───");

  const stats: any = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM exames_base WHERE justificativa_robusta IS NOT NULL AND length(justificativa_robusta) > 0) AS com_robusta,
      (SELECT count(*)::int FROM exames_base WHERE hd_1 IS NOT NULL AND cid_1 IS NOT NULL) AS com_hd_cid_1,
      (SELECT count(*)::int FROM exames_base WHERE hd_3 IS NOT NULL AND cid_3 IS NOT NULL) AS com_3_hipoteses,
      (SELECT count(DISTINCT cid_1)::int FROM exames_base WHERE cid_1 IS NOT NULL) AS cids_unicos_em_uso,
      (SELECT count(*)::int FROM exames_base) AS total_exames
  `);
  console.log("  Stats exames_base:", stats.rows[0]);

  const grupos: any = await db.execute(sql`
    SELECT grupo_principal, count(*)::int as n
    FROM exames_base
    WHERE codigo_exame IN (${sql.join(exames.map(e => sql`${e.codigo}`), sql`, `)})
    GROUP BY grupo_principal ORDER BY n DESC
  `);
  console.log("\n  Distribuicao dos 34 exames PAWARDS:");
  for (const r of grupos.rows) console.log(`    ${r.grupo_principal.padEnd(20)} ${r.n}`);

  const cidStats: any = await db.execute(sql`
    SELECT capitulo, count(*)::int as n FROM cid10 GROUP BY capitulo ORDER BY n DESC
  `);
  console.log("\n  CIDs por capitulo:");
  for (const r of cidStats.rows) console.log(`    ${r.capitulo.padEnd(50)} ${r.n}`);

  // Atualizar mapeamento_documental: 2 docs (V3 + Google) -> ENCARNADO
  await db.execute(sql`
    UPDATE mapeamento_documental
       SET status = 'ENCARNADO',
           tabelas_destino = ARRAY['exames_base', 'cid10']::text[],
           atualizado_em = now()
     WHERE documento_origem ILIKE '%Planilha Geradora Exames Clinica%'
  `);

  console.log("\n✅ Encarnacao concluida.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
