/**
 * DEMO END-TO-END V8 · Carlúcia (18/mai/2026)
 *
 * Prova ponta-a-ponta que o template V8 está cravado no sistema real:
 *   1. Cria prescrição NAD+ EV pra Carlúcia (id=3497, Pádua/unidade=15)
 *   2. Emite via emitirPrescricao() → PDF V8 em tmp/prescricoes/
 *   3. Sobe pelo uploadArquivoPaciente (Drive paciente, hierárquico)
 *   4. garantirAcessoLeituraPaciente → permission reader no email dela
 *   5. WhatsApp pra Carlúcia com link Drive
 *   6. Telegram pro CEO (Caio) com link Drive — pra ele ver na hora
 *
 * Rodar: tsx artifacts/api-server/src/scripts/demoCarluciaV8.ts
 */
import { pool } from "@workspace/db";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { emitirPrescricao } from "../services/emitirPrescricaoService";
import {
  uploadArquivoPaciente,
  garantirAcessoLeituraPaciente,
} from "../lib/arquivos/drive";
import { enviarWhatsapp } from "../services/whatsappService";
import { enviarTelegramCEO } from "../services/telegramService";

const PACIENTE_ID = 3497; // Carlúcia
const MEDICO_ID = 6;      // Dr Kleber Clara Lemos (CRM-SP 164027)
const UNIDADE_ID = 15;    // Pádua
const NAD_NOME = "NAD+";
const NAD_DOSE_VALOR = 500;
const NAD_DOSE_UNIDADE = "mg";
const NAD_VIA = "Endovenosa lenta (2-4h)";

async function main() {
  console.log("[demo-carlucia-v8] Iniciando demo end-to-end V8...");

  // ===== 1. CRIA PRESCRIÇÃO =====
  console.log("[1] Criando prescrição NAD+ EV...");
  const presc = await pool.query(
    `INSERT INTO prescricoes
       (paciente_id, medico_id, unidade_id, data_emissao, duracao_dias,
        status, observacoes_gerais, origem, versao)
     VALUES ($1, $2, $3, current_date, 42,
        'rascunho', 'NAD+ Endovenoso · Restaurador Bioenergético · Protocolo de 6 sessões semanais', 'demo_v8_carlucia', 1)
     RETURNING id`,
    [PACIENTE_ID, MEDICO_ID, UNIDADE_ID],
  );
  const prescricaoId: number = presc.rows[0].id;
  console.log(`    → prescrição #${prescricaoId} criada`);

  // ===== 2. CRIA BLOCO + ATIVO =====
  console.log("[2] Inserindo bloco + ativo NAD+...");
  const bloco = await pool.query(
    `INSERT INTO prescricao_blocos
       (prescricao_id, ordem, titulo_apelido, titulo_categoria, titulo_abrev_principal,
        tipo_bloco, via_administracao, forma_farmaceutica, qtd_doses, duracao_dias,
        observacoes, destino_dispensacao, cor_visual, forma_farmaceutica_sugestao)
     VALUES ($1, 1, $2, 'INJETÁVEL EV', 'NADE',
        'injetavel', $3, 'solução EV', 6, 42,
        'Aplicação em ambiente clínico controlado. Diluir em 250 mL de SF 0,9%. Infusão em 2-4 horas.',
        'INJE', 'magistral', 'Ampola pré-diluída para infusão lenta')
     RETURNING id`,
    [prescricaoId, "NAD+ Endovenoso · Restaurador Bioenergético", NAD_VIA],
  );
  const blocoId: number = bloco.rows[0].id;

  await pool.query(
    `INSERT INTO prescricao_bloco_ativos
       (bloco_id, ordem, nome_ativo, dose_valor, dose_unidade,
        observacao, tipo_receita_anvisa_codigo, controlado)
     VALUES ($1, 1, $2, $3, $4,
        'Cofator mitocondrial NAD+ · 100% biodisponibilidade EV',
        'BRANCA_SIMPLES', false)`,
    [blocoId, NAD_NOME, NAD_DOSE_VALOR, NAD_DOSE_UNIDADE],
  );
  console.log(`    → bloco #${blocoId} + ativo NAD+ ${NAD_DOSE_VALOR}${NAD_DOSE_UNIDADE} inseridos`);

  // ===== 3. EMITIR (gera PDF V8 em tmp/) =====
  console.log("[3] Emitindo prescrição → PDF V8...");
  const resultado = await emitirPrescricao({ prescricao_id: prescricaoId });
  console.log(`    → ${resultado.pdfs.length} PDF(s) gerado(s)`);
  if (resultado.alertas.length) console.log("    alertas:", resultado.alertas);

  // ===== 4. UPLOAD NO DRIVE DA PACIENTE =====
  console.log("[4] Subindo PDF na pasta Drive da Carlúcia...");
  const pacRow = await pool.query(
    `SELECT nome, codigo_semantico FROM pacientes WHERE id = $1`,
    [PACIENTE_ID],
  );
  const pacNome = pacRow.rows[0].nome as string;
  const pacCodigo = pacRow.rows[0].codigo_semantico as string;

  const pdfDir = path.join(process.cwd(), "tmp", "prescricoes");
  const linksDrive: { arquivo: string; url: string }[] = [];

  for (const pdf of resultado.pdfs) {
    const fp = path.join(pdfDir, pdf.arquivo);
    const buf = await fs.readFile(fp);
    const up = await uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      pacienteNome: pacNome,
      codigoSemantico: pacCodigo,
      tipo: "RECEITA_SIMPLES",
      identificador: `NAD+_S${pdf.ordem}`,
      data: new Date(),
      mimeType: "application/pdf",
      conteudo: buf,
      referenciaId: prescricaoId,
      referenciaTabela: "prescricoes",
      metadataExtra: {
        template: "V8",
        substancia: "NAD+",
        protocolo: "6 sessões semanais",
        demo: "carlucia_18mai2026",
      },
    });
    console.log(`    ✓ ${up.nomeArquivo}\n      → ${up.driveUrl}`);
    linksDrive.push({ arquivo: up.nomeArquivo, url: up.driveUrl });
  }

  // ===== 5. PERMISSION READER PRO EMAIL DA CARLÚCIA =====
  console.log("[5] Garantindo acesso leitura no Drive (permission reader)...");
  const acesso = await garantirAcessoLeituraPaciente(PACIENTE_ID);
  if (acesso.concedido) {
    console.log(`    ✓ Acesso concedido a ${acesso.email}${acesso.motivo ? ` (${acesso.motivo})` : ""}`);
  } else {
    console.log(`    ✗ Falhou: ${acesso.motivo}`);
  }

  // ===== 6. WHATSAPP PRA CARLÚCIA =====
  console.log("[6] Enviando WhatsApp pra Carlúcia...");
  const tel = await pool.query(`SELECT telefone FROM pacientes WHERE id = $1`, [PACIENTE_ID]);
  const telPac = tel.rows[0]?.telefone as string | null;
  const linkPrincipal = linksDrive[0]?.url ?? "—";

  if (telPac) {
    const msgPac =
      `Olá, Carlúcia! Aqui é do Instituto Pádua.\n\n` +
      `Sua prescrição médica do protocolo NAD+ Endovenoso está pronta e disponível no seu acesso Drive:\n\n` +
      `${linkPrincipal}\n\n` +
      `Você também recebeu acesso de leitura à sua pasta completa de documentos. Qualquer dúvida, retornamos aqui mesmo.\n\n` +
      `Equipe PAWARDS · Instituto Pádua`;
    const wppRes = await enviarWhatsapp(telPac, msgPac, { unidadeId: UNIDADE_ID });
    console.log(`    → WhatsApp paciente: ${wppRes.sucesso ? "ENVIADO" : "FALHOU"}${wppRes.erro ? ` (${wppRes.erro})` : ""}`);
  } else {
    console.log("    ✗ Carlúcia sem telefone cadastrado");
  }

  // ===== 7. TELEGRAM PRO CEO (CAIO) =====
  console.log("[7] Notificando CEO via Telegram...");
  const msgCeo =
    `DEMO V8 EXECUTADA · Carlúcia\n\n` +
    `Prescrição #${prescricaoId} emitida e enviada.\n` +
    `Template V8 cravado no sistema real (não é mais mockup).\n\n` +
    `PDF Drive: ${linkPrincipal}\n\n` +
    `Permission reader: ${acesso.concedido ? "OK" : "FALHOU"}\n` +
    `WhatsApp Carlúcia: ${telPac ? "tentado" : "sem telefone"}\n\n` +
    `Clica no link acima pra ver o PDF V8 igual a Carlúcia vai receber.`;
  const tgRes = await enviarTelegramCEO(msgCeo);
  console.log(`    → Telegram CEO: ${tgRes.sucesso ? "ENVIADO" : "FALHOU"}${tgRes.erro ? ` (${tgRes.erro})` : ""}`);

  // ===== RESUMO =====
  console.log("\n=================== RESUMO DEMO V8 ===================");
  console.log(`Prescrição #${prescricaoId} (Carlúcia, NAD+ EV, 6 sessões)`);
  console.log(`PDFs no Drive da paciente: ${linksDrive.length}`);
  for (const l of linksDrive) console.log(`  - ${l.url}`);
  console.log(`Permission leitura Carlúcia: ${acesso.concedido ? "✓" : "✗"}`);
  console.log("======================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("[demo-carlucia-v8] ERRO:", err);
  process.exit(1);
});
