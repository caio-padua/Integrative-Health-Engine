/**
 * Cria UMA prescrição real no banco usando os 5 blends mestres já cadastrados
 * em formula_blend (SONO, FOCO, METABOLICO, HEPATICO, ANTIOX), expande seus
 * ativos, roda o motor PADCON UNIVERSAL e sobe os PDFs no Drive.
 *
 *  - Paciente: Joao da Silva (id=3)
 *  - Médico: Dr Caio Padua (id=1)
 *  - 5 blocos manipulados → 5 PDFs marfim (MAGISTRAL/FAMA)
 *  - Pasta destino: PAWARDS > GESTAO CLINICA > PRESCRICOES
 */
import { pool } from "@workspace/db";
import { emitirPrescricao } from "../services/emitirPrescricaoService";
import { uploadFileToDrive } from "../lib/google-drive";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const PACIENTE_ID = 3;
const MEDICO_ID = 1;
const UNIDADE_ID = 2;
const PASTA_DESTINO = "1uIcen1cvfvrNuvUkN2eWI4RoQ_eBHT-e"; // GESTAO CLINICA
const SUBPASTA_PRESCRICOES = "158gF3eS2p1-Dmq_k3af2mecc9ZsINM5P"; // PRESCRICOES

const BLEND_IDS = [1, 2, 3, 4, 5];

async function main() {
  console.log("[blends] carregando 5 blends mestres...");
  const bRes = await pool.query(
    `SELECT id, codigo_blend, nome_blend, funcao, via, forma, posologia, duracao,
            valor_min, valor_brl AS valor_medio, valor_max
       FROM formula_blend
      WHERE id = ANY($1::int[])
      ORDER BY id`,
    [BLEND_IDS]
  );
  const blends = bRes.rows;
  if (blends.length !== 5) throw new Error(`Esperava 5 blends, achei ${blends.length}`);

  const aRes = await pool.query(
    `SELECT blend_id, ordem, componente, dosagem, unidade
       FROM formula_blend_ativo
      WHERE blend_id = ANY($1::int[])
      ORDER BY blend_id, ordem`,
    [BLEND_IDS]
  );
  const ativosByBlend = new Map<number, any[]>();
  for (const a of aRes.rows) {
    const arr = ativosByBlend.get(a.blend_id) ?? [];
    arr.push(a);
    ativosByBlend.set(a.blend_id, arr);
  }

  console.log("[prescricao] criando prescrição...");
  const pRes = await pool.query(
    `INSERT INTO prescricoes (paciente_id, medico_id, unidade_id, data_emissao, status, origem, observacoes_gerais, cids)
     VALUES ($1, $2, $3, CURRENT_DATE, 'rascunho', 'CONSULTA', $4, $5)
     RETURNING id`,
    [
      PACIENTE_ID,
      MEDICO_ID,
      UNIDADE_ID,
      "Protocolo PADUA Integrativo — restauração circadiana, performance cognitiva, suporte metabólico e detox antioxidante. Reavaliar em 30 dias.",
      ["Z00.0", "G47.0", "E66.9"],
    ]
  );
  const prescricaoId = pRes.rows[0].id;
  console.log(`[prescricao] criada id=${prescricaoId}`);

  let ordemBloco = 1;
  let totalAtivos = 0;
  for (const b of blends) {
    const ativos = ativosByBlend.get(b.id) ?? [];
    const insertBloco = await pool.query(
      `INSERT INTO prescricao_blocos
        (prescricao_id, ordem, titulo_apelido, titulo_categoria, tipo_bloco,
         via_administracao, forma_farmaceutica_sugestao,
         destino_dispensacao, formula_composta_apelido, observacoes)
       VALUES ($1,$2,$3,'FÓRMULA','MANIPULADO_FARMACIA',$4,$5,'FAMA',$3,$6)
       RETURNING id`,
      [
        prescricaoId,
        ordemBloco,
        b.nome_blend,
        b.via,
        b.forma,
        `${b.posologia} | ${b.duracao} | Valor de referência: R$ ${b.valor_min} (mín) – R$ ${b.valor_medio} (médio) – R$ ${b.valor_max} (máx).`,
      ]
    );
    const blocoId = insertBloco.rows[0].id;

    for (const a of ativos) {
      await pool.query(
        `INSERT INTO prescricao_bloco_ativos
           (bloco_id, ordem, nome_ativo, dose_valor, dose_unidade,
            tipo_receita_anvisa_codigo, controlado, farmacia_padrao)
         VALUES ($1,$2,$3,$4,$5,'MAGISTRAL',false,'FAMA')`,
        [blocoId, a.ordem, a.componente, a.dosagem, a.unidade]
      );
      totalAtivos++;
    }
    console.log(`  bloco ${ordemBloco}: ${b.nome_blend} (${ativos.length} ativos)`);
    ordemBloco++;
  }
  console.log(`[prescricao] ${blends.length} blocos · ${totalAtivos} ativos · prescricao_id=${prescricaoId}`);

  console.log("[motor] rodando emissão (REGRA 14)...");
  const result = await emitirPrescricao({ prescricao_id: prescricaoId });
  console.log(`[motor] ${result.pdfs.length} PDF(s) gerado(s):`);
  for (const p of result.pdfs) {
    console.log(`  - PDF ${p.ordem} (${p.cor}/${p.tipo_receita}/${p.destino}) → ${p.arquivo}`);
  }

  console.log(`[drive] upload em PRESCRICOES (id=${SUBPASTA_PRESCRICOES})...`);
  const pdfDir = path.join(process.cwd(), "tmp", "prescricoes");
  const uploads: { name: string; url: string }[] = [];
  const dataTag = new Date().toISOString().slice(0, 10).replace(/-/g, ".").slice(2);
  for (const p of result.pdfs) {
    const buf = await fs.readFile(path.join(pdfDir, p.arquivo));
    const nomeAmigavel = `${dataTag} PRESCRICAO ${prescricaoId} BLOCO ${p.ordem} ${p.cor.toUpperCase()} ${p.tipo_receita} JOAO DA SILVA.pdf`;
    const up = await uploadFileToDrive(SUBPASTA_PRESCRICOES, nomeAmigavel, "application/pdf", buf);
    console.log(`  ✓ ${nomeAmigavel}\n    → ${up.fileUrl}`);
    uploads.push({ name: nomeAmigavel, url: up.fileUrl });
  }

  console.log("\n=========== RESUMO ===========");
  console.log(`Prescrição #${prescricaoId} | Paciente: Joao da Silva | Médico: Dr Caio Padua | ${result.pdfs.length} PDFs`);
  console.log(`Pasta: https://drive.google.com/drive/folders/${SUBPASTA_PRESCRICOES}`);
  for (const u of uploads) console.log(`  ${u.name}\n    ${u.url}`);
  process.exit(0);
}

main().catch(e => { console.error("ERRO:", e); process.exit(1); });
