/**
 * EMISSÃO DE PRESCRIÇÃO PADCON UNIVERSAL
 * Pipeline ponta-a-ponta: lê banco → motor → gera PDFs → grava log SNCR.
 */
import { pool } from "@workspace/db";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  processarPrescricao,
  type AtivoEntrada,
  type BlocoEntrada,
  type CodigoReceitaAnvisa,
} from "./prescricaoEngine";
import {
  gerarPrescricaoPdf,
  streamParaBuffer,
  type DadosPrescricaoPdf,
} from "../pdf/prescricaoPdf";

/** Pasta onde os PDFs são salvos */
const PDF_DIR = path.join(process.cwd(), "tmp", "prescricoes");

export interface EmitirPrescricaoInput {
  prescricao_id: number;
}

export interface PdfEmitidoOut {
  id: number;
  ordem: number;
  cor: string;
  tipo_receita: string;
  destino: string;
  arquivo: string;
  qr_token: string;
  numero_sncr: string | null;
}

export interface EmitirPrescricaoResult {
  prescricao_id: number;
  pdfs: PdfEmitidoOut[];
  cota_sncr_consumida: { tipo: string; numero: string }[];
  alertas: string[];
}

/**
 * Emite a prescrição: aplica REGRA 14, gera N PDFs, salva no banco.
 */
export async function emitirPrescricao(
  input: EmitirPrescricaoInput
): Promise<EmitirPrescricaoResult> {
  await fs.mkdir(PDF_DIR, { recursive: true });

  // ===== 1. CARREGA PRESCRIÇÃO + BLOCOS + ATIVOS DO BANCO =====
  const r = await pool.query(
    `SELECT p.*, pac.nome as paciente_nome, pac.cpf as paciente_cpf,
            pac.data_nascimento as paciente_data_nascimento,
            u.nome as medico_nome, u.crm as medico_crm,
            u.uf_atuacao_principal as medico_uf,
            u.numero_certificado_icp_brasil as medico_icp,
            u.cota_sncr_b1, u.cota_sncr_b2, u.cota_sncr_a1,
            u.cota_sncr_a2, u.cota_sncr_a3
     FROM prescricoes p
     JOIN pacientes pac ON pac.id = p.paciente_id
     JOIN usuarios u    ON u.id   = p.medico_id
     WHERE p.id = $1`,
    [input.prescricao_id]
  );
  if (r.rowCount === 0) throw new Error(`Prescrição ${input.prescricao_id} não existe`);
  const prescricao = r.rows[0];

  // Unidade (best-effort — pode ser null)
  let unidadeRow: any = { razao_social: "Instituto Pádua", cnpj: null, endereco: null };
  if (prescricao.unidade_id) {
    const u = await pool.query(`SELECT * FROM unidades WHERE id = $1`, [prescricao.unidade_id]);
    if (u.rowCount && u.rows[0]) {
      unidadeRow = {
        razao_social: u.rows[0].razao_social ?? u.rows[0].nome ?? "Instituto Pádua",
        cnpj: u.rows[0].cnpj,
        endereco: u.rows[0].endereco,
      };
    }
  }

  // Blocos
  const blocosDb = await pool.query(
    `SELECT * FROM prescricao_blocos
     WHERE prescricao_id = $1 AND bloco_pai_id IS NULL
     ORDER BY ordem`,
    [input.prescricao_id]
  );

  // Para cada bloco, ativos
  const blocosEntrada: BlocoEntrada[] = [];
  for (const b of blocosDb.rows) {
    const ativosDb = await pool.query(
      `SELECT * FROM prescricao_bloco_ativos WHERE bloco_id = $1 ORDER BY ordem`,
      [b.id]
    );
    const ativos: AtivoEntrada[] = ativosDb.rows.map((a: any) => ({
      nome: a.nome_ativo,
      dose_valor: parseFloat(a.dose_valor),
      dose_unidade: a.dose_unidade,
      tipo_receita_anvisa_codigo:
        (a.tipo_receita_anvisa_codigo as CodigoReceitaAnvisa) ?? "BRANCA_SIMPLES",
      controlado: !!a.controlado,
      farmacia_padrao: a.farmacia_padrao ?? undefined,
      observacao: a.observacao ?? undefined,
    }));
    blocosEntrada.push({
      apelido: b.titulo_apelido,
      via_administracao: b.via_administracao,
      forma_farmaceutica_sugestao: b.forma_farmaceutica_sugestao ?? undefined,
      ativos,
      observacoes: b.observacoes ?? undefined,
    });
  }

  // ===== 2. APLICA MOTOR (REGRA 14 + agrupamento por PDF) =====
  const { pdfs } = processarPrescricao(blocosEntrada);

  // ===== 3. CONSUMO SNCR (decrementa cota, registra log) =====
  const cotaConsumida: { tipo: string; numero: string }[] = [];
  const alertas: string[] = [];

  const cotaCampo: Record<string, string> = {
    B1: "cota_sncr_b1",
    B2: "cota_sncr_b2",
    A1: "cota_sncr_a1",
    A2: "cota_sncr_a2",
    A3: "cota_sncr_a3",
  };

  for (const pdf of pdfs) {
    if (!pdf.exige_sncr) continue;
    const tipo = pdf.tipo_receita_anvisa_codigo;
    const campo = cotaCampo[tipo];
    if (!campo) continue;
    // DECREMENTO ATÔMICO — evita race "lost update":
    // só faz UPDATE se cota > 0; saldo final calculado pelo banco e devolvido
    // por RETURNING. Concorrência segura sem precisar de SERIALIZABLE.
    const upd = await pool.query(
      `UPDATE usuarios
         SET ${campo} = ${campo} - 1,
             data_ultima_atualizacao_cota = now()
       WHERE id = $1 AND ${campo} > 0
       RETURNING ${campo} AS saldo`,
      [prescricao.medico_id]
    );
    if (upd.rowCount === 0) {
      alertas.push(
        `Cota SNCR ${tipo} esgotada. PDF ${tipo} emitido SEM numeração legal — preencher manualmente.`
      );
      continue;
    }
    const novoSaldo = Number(upd.rows[0].saldo);
    const numeroEmitido = `WL-${tipo}-${Date.now()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")}`;
    await pool.query(
      `INSERT INTO sncr_consumo_log
        (medico_id, prescricao_id, tipo_receita_codigo, numero_consumido, cota_restante_apos)
       VALUES ($1, $2, $3, $4, $5)`,
      [prescricao.medico_id, input.prescricao_id, tipo, numeroEmitido, novoSaldo]
    );
    (pdf as any)._numero_sncr = numeroEmitido;
    cotaConsumida.push({ tipo, numero: numeroEmitido });
    if (novoSaldo < 5) {
      alertas.push(`Cota SNCR ${tipo} baixa: ${novoSaldo} restantes — repor no Portal SNCR.`);
    }
  }

  // ===== 4. GERA PDFs E SALVA EM DISCO + BANCO =====
  const out: PdfEmitidoOut[] = [];
  const dataEmissaoFmt = formatarData(prescricao.data_emissao);

  for (const pdf of pdfs) {
    const qrToken = crypto.randomBytes(8).toString("hex");
    const numeroSncr = (pdf as any)._numero_sncr ?? null;
    const dados: DadosPrescricaoPdf = {
      pdf,
      paciente: {
        nome: prescricao.paciente_nome,
        cpf: prescricao.paciente_cpf,
        data_nascimento: prescricao.paciente_data_nascimento,
      },
      medico: {
        nome: prescricao.medico_nome ?? "Médico",
        crm: prescricao.medico_crm ?? "—",
        uf_crm: prescricao.medico_uf ?? "SP",
        icp_brasil_certificado: prescricao.medico_icp ?? undefined,
      },
      unidade: unidadeRow,
      prescricao_id: input.prescricao_id,
      pdf_index: pdf.ordem,
      pdf_total: pdfs.length,
      data_emissao: dataEmissaoFmt,
      numero_sncr: numeroSncr ?? undefined,
      qr_code_token: qrToken,
    };

    const stream = gerarPrescricaoPdf(dados);
    const buf = await streamParaBuffer(stream);

    const filename = `prescricao_${input.prescricao_id}_pdf_${pdf.ordem}_${pdf.cor_visual}_${qrToken}.pdf`;
    const filepath = path.join(PDF_DIR, filename);
    await fs.writeFile(filepath, buf);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");

    const ins = await pool.query(
      `INSERT INTO prescricao_pdfs_emitidos
         (prescricao_id, ordem, cor_visual, destino_dispensacao,
          arquivo_path, qr_code_token, numero_sncr,
          marcacao_manipular_junto, hash_documento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        input.prescricao_id,
        pdf.ordem,
        pdf.cor_visual,
        pdf.destino_dispensacao,
        filepath,
        qrToken,
        numeroSncr,
        pdf.marcacao_manipular_junto ?? null,
        hash,
      ]
    );

    out.push({
      id: ins.rows[0].id,
      ordem: pdf.ordem,
      cor: pdf.cor_visual,
      tipo_receita: pdf.tipo_receita_anvisa_codigo,
      destino: pdf.destino_dispensacao,
      arquivo: filename,
      qr_token: qrToken,
      numero_sncr: numeroSncr,
    });
  }

  // ===== 5. ATUALIZA STATUS DA PRESCRIÇÃO =====
  await pool.query(
    `UPDATE prescricoes SET status='emitida', emitida_em=now() WHERE id=$1`,
    [input.prescricao_id]
  );

  return {
    prescricao_id: input.prescricao_id,
    pdfs: out,
    cota_sncr_consumida: cotaConsumida,
    alertas,
  };
}

function formatarData(d: any): string {
  if (!d) return new Date().toLocaleDateString("pt-BR");
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

/**
 * PREVIEW LIVE — não persiste, só roda o motor pra UI mostrar quantos PDFs.
 */
export function preverEmissao(blocos: BlocoEntrada[]) {
  const { pdfs, blocosProcessados } = processarPrescricao(blocos);
  return {
    total_pdfs: pdfs.length,
    pdfs: pdfs.map((p) => ({
      ordem: p.ordem,
      cor: p.cor_visual,
      tipo: p.tipo_receita_anvisa_codigo,
      destino: p.destino_dispensacao,
      exige_sncr: p.exige_sncr,
      qtd_blocos: p.blocos.length,
      ativos: p.blocos.flatMap((b) => b.ativos.map((a) => a.nome)),
      marcacao_manipular_junto: p.marcacao_manipular_junto,
    })),
    blocos_processados: blocosProcessados.length,
  };
}
