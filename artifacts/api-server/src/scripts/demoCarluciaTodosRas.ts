/**
 * GERAR TODOS OS RAS DA CARLÚCIA — Layout V8 cravado
 *
 * Decisão Caio (CEO) 18/mai/2026:
 *  - Quer ver TODOS os RAS no padrão V8 (capa premium, KPIs, 11 cadernos)
 *  - SEM Termo PARQ (regra: não mexer com farmácia agora)
 *  - SEM bloco FINA do Motor (envolve comissão farmácia)
 *  - Motor CLIN + JURI + ACOM (esses podem)
 *  - Não vai pré-validar — dá feedback ao ver no Telegram
 *
 * O que dispara:
 *   1. RASX-MATRIZ V6 COMPLETO       (11 cadernos)
 *   2. RASX-MATRIZ V6 CLÍNICO        (HEST HPOT HORG HMED)
 *   3. RASX-MATRIZ V6 EVOLUTIVO      (HLIN HTRN HEVO HPLA)
 *   4. RASX-MATRIZ V6 ESTADO SAÚDE   (HATU HCUR HPLA)
 *   5. Motor CLIN                     (registro clínico consolidado)
 *   6. Motor JURI                     (termos jurídicos consolidados)
 *   7. Motor ACOM                     (acompanhamento evolutivo)
 *
 *   → Sobe TUDO no Drive da paciente
 *   → Telegram pro CEO com TODOS os links (sem WhatsApp pra paciente
 *     nessa rodada — Caio quer ver antes pra dar feedback)
 *
 * Rodar: tsx artifacts/api-server/src/scripts/demoCarluciaTodosRas.ts
 */
import { pool } from "@workspace/db";
import { PassThrough } from "node:stream";
import { collectPdfData } from "../routes/rasxArqu";
import { gerarRasxPdf, type RasCategoria } from "../pdf/rasxPdf";
import { gerarMotorPdf } from "../pdf/rasxMotorPdf";
import { BlocoRAS, EventoRAS, montarPayloadRAS } from "../lib/rasxEngine";
import { uploadArquivoPaciente } from "../lib/arquivos/drive";
import { enviarTelegramCEO } from "../services/telegramService";

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;

function streamToBuffer(s: PassThrough | NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((res, rej) => {
    const chunks: Buffer[] = [];
    s.on("data", (c: Buffer) => chunks.push(c));
    s.on("end", () => res(Buffer.concat(chunks)));
    s.on("error", rej);
  });
}

async function main() {
  console.log("\n========= TODOS OS RAS — CARLÚCIA (3497) =========");
  console.log("Layout V8 · capa premium · 11 cadernos · sem PARQ/FINA\n");

  // 1. Colher dados (snapshots + REVO populadas)
  console.log("[1] Coletando dados clínicos do banco...");
  const collected = await collectPdfData(PACIENTE_ID);
  if (!collected) throw new Error("Paciente 3497 não encontrado");
  console.log(`    ✓ ${collected.patologias.length} patologias`);
  console.log(`    ✓ ${collected.medicamentos.length} medicamentos`);
  console.log(`    ✓ snapshot inicial: ${collected.pdfData.snapshotInicial ? "OK" : "AUSENTE"}`);
  console.log(`    ✓ snapshot atual:   ${collected.pdfData.snapshotAtual ? "OK" : "AUSENTE"}`);

  const pac = collected.paciente;
  const codigoSem = (pac as any).codigoSemantico || (pac as any).codigo_semantico || `PAC${PACIENTE_ID}`;

  // 2. Gerar e subir cada RAS
  const linksDrive: { rotulo: string; url: string; tamanho: string }[] = [];

  const subirPdf = async (rotulo: string, identificador: string, buf: Buffer) => {
    const up = await uploadArquivoPaciente({
      pacienteId: PACIENTE_ID,
      unidadeId: UNIDADE_ID,
      pacienteNome: pac.nome,
      codigoSemantico: codigoSem,
      tipo: "PROTOCOLO",
      identificador,
      data: new Date(),
      mimeType: "application/pdf",
      conteudo: buf,
      metadataExtra: { demo: "todos_ras_carlucia_18mai2026", layout: "V8" },
    });
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`    ✓ ${rotulo}  (${kb} KB)`);
    console.log(`      → ${up.driveUrl}`);
    linksDrive.push({ rotulo, url: up.driveUrl, tamanho: `${kb} KB` });
  };

  // ===== RASX-MATRIZ V6 (4 categorias)
  const categorias: { cat: RasCategoria; rotulo: string; ident: string }[] = [
    { cat: "COMPLETO",     rotulo: "RAS COMPLETO (11 cadernos)",       ident: "RASX-COMPLETO" },
    { cat: "CLINICO",      rotulo: "RAS CLÍNICO (HEST HPOT HORG HMED)", ident: "RASX-CLINICO" },
    { cat: "EVOLUTIVO",    rotulo: "RAS EVOLUTIVO (HLIN HTRN HEVO HPLA)", ident: "RASX-EVOLUTIVO" },
    { cat: "ESTADO_SAUDE", rotulo: "RAS ESTADO DE SAÚDE (HATU HCUR HPLA)", ident: "RASX-ESTADO" },
  ];

  console.log("\n[2] Gerando RASX-MATRIZ V6 (4 categorias)...");
  for (const c of categorias) {
    const buf = await streamToBuffer(gerarRasxPdf(collected.pdfData, c.cat));
    await subirPdf(c.rotulo, c.ident, buf);
  }

  // ===== Motor Consolidado (CLIN, JURI, ACOM — pula FINA por farmácia/comissão)
  console.log("\n[3] Gerando Motor Consolidado (CLIN, JURI, ACOM)...");
  const idade = (pac as any).dataNascimento
    ? Math.floor((Date.now() - new Date((pac as any).dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : undefined;

  const blocosMotor: { bloco: BlocoRAS; rotulo: string; ident: string }[] = [
    { bloco: BlocoRAS.CLIN, rotulo: "MOTOR CLIN — Registro Clínico Consolidado", ident: "MOTOR-CLIN" },
    { bloco: BlocoRAS.JURI, rotulo: "MOTOR JURI — Termos Jurídicos Consolidados", ident: "MOTOR-JURI" },
    { bloco: BlocoRAS.ACOM, rotulo: "MOTOR ACOM — Acompanhamento Evolutivo",     ident: "MOTOR-ACOM" },
  ];

  for (const b of blocosMotor) {
    const payload = montarPayloadRAS({
      pacienteId: PACIENTE_ID,
      nomePaciente: pac.nome,
      cpf: pac.cpf || undefined,
      idade,
      evento: EventoRAS.START,
      bloco: b.bloco,
      medicamentos: collected.medicamentos,
      patologias: collected.patologias,
      profissionalResponsavel: "Dr. Caio Henrique Fernandes Padua",
      crmProfissional: "CRM-SP 164027",
      nick: "INSTITUTO PADUA",
      unidade: "Instituto Padua",
      endereco: "Rua Guaxupé, 327 — Vila Formosa — São Paulo/SP",
    });
    const buf = await streamToBuffer(gerarMotorPdf(payload));
    await subirPdf(b.rotulo, b.ident, buf);
  }

  // ===== Telegram pro CEO
  console.log("\n[4] Enviando Telegram pro CEO com TODOS os links...");
  const listaLinks = linksDrive
    .map((l, i) => `${i + 1}. ${l.rotulo}  (${l.tamanho})\n   ${l.url}`)
    .join("\n\n");

  const msgCeo =
    `RAS COMPLETO · Carlúcia (id 3497) · Layout V8\n\n` +
    `7 documentos gerados e gravados no Drive da paciente:\n\n` +
    `${listaLinks}\n\n` +
    `Confere no celular e me avisa se algo precisa ajustar.\n` +
    `(Sem Termo PARQ · sem bloco FINA — por sua orientação.)`;

  const tg = await enviarTelegramCEO(msgCeo);
  console.log(`    → Telegram CEO: ${tg.sucesso ? "ENVIADO" : "FALHOU"}${tg.erro ? ` (${tg.erro})` : ""}`);

  console.log("\n========= RESUMO =========");
  console.log(`Paciente: ${pac.nome} (id ${PACIENTE_ID})`);
  console.log(`RAS gerados: ${linksDrive.length}`);
  for (const l of linksDrive) console.log(`  · ${l.rotulo}\n    ${l.url}`);
  console.log("==========================\n");

  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("[todos-ras-carlucia] ERRO:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
