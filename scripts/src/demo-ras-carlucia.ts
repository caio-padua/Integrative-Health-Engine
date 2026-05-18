// Demo: RAS PDF institucional pra Carlucia Santos Fernandes (id=3497).
// Pipeline real: HTML institucional -> htmlParaPdfBuffer -> uploadArquivoPaciente
// -> WhatsApp + Telegram pro CEO com link do Drive.
//
// "Demo" porque o conteudo clinico (Coenzima Q10 + Testosterona) e fixo no
// script, nao vem de uma sessao real no DB (motor nao rodou). Visualmente
// identico ao RAS oficial.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface WhatsappResult { sucesso: boolean; provedorMsgId?: string; erro?: string; }
interface TelegramResult { sucesso: boolean; erro?: string; }
interface UploadResultado { driveFileId: string; driveUrl: string; nomeArquivo: string; sha256: string | null; arquivoId: number; }

const wpp = (await import("../../artifacts/api-server/src/services/whatsappService.js" as string)) as {
  enviarWhatsapp: (telefone: string, mensagem: string) => Promise<WhatsappResult>;
};
const tg = (await import("../../artifacts/api-server/src/services/telegramService.js" as string)) as {
  enviarTelegramCEO: (mensagem: string) => Promise<TelegramResult>;
};
const pdfMod = (await import("../../artifacts/api-server/src/lib/assinatura/htmlParaPdf.js" as string)) as {
  htmlParaPdfBuffer: (html: string) => Promise<Buffer>;
};
const driveMod = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<UploadResultado>;
};

const HTML_RAS = (params: { nome: string; codigo: string; cpf: string; dataAtend: string }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10pt; color: #0e1c2c; line-height: 1.5; }
  .header { border-bottom: 2px solid #0e1c2c; padding-bottom: 8px; margin-bottom: 18px; }
  .header .marca { font-size: 18pt; font-weight: 700; letter-spacing: 4px; }
  .header .sub { font-size: 8pt; color: #5a6478; letter-spacing: 2px; }
  .titulo { text-align: center; font-size: 13pt; font-weight: 700; margin: 18px 0 4px; letter-spacing: 2px; }
  .subtitulo { text-align: center; font-size: 9pt; color: #5a6478; margin-bottom: 22px; }
  .bloco { margin-bottom: 16px; }
  .bloco h3 { font-size: 10pt; font-weight: 700; border-bottom: 1px solid #0e1c2c; padding-bottom: 3px; margin: 0 0 8px; letter-spacing: 1px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .lab { color: #5a6478; font-size: 9pt; }
  .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table th { text-align: left; background: #eef1f5; padding: 6px 8px; border-bottom: 1px solid #0e1c2c; font-weight: 700; }
  table td { padding: 6px 8px; border-bottom: 1px solid #d0d7e2; vertical-align: top; }
  .codigo { font-family: monospace; font-size: 8pt; color: #5a6478; }
  .footer { position: fixed; bottom: 12mm; left: 15mm; right: 15mm; border-top: 1px solid #0e1c2c; padding-top: 6px; font-size: 7.5pt; color: #5a6478; display: flex; justify-content: space-between; }
</style></head>
<body>
  <div class="header">
    <div class="marca">PAWARDS</div>
    <div class="sub">PADCON  &middot;  MEDCORE  &middot;  INSTITUTO PADUA</div>
  </div>

  <div class="titulo">RESUMO DE ATENDIMENTO INTEGRATIVO</div>
  <div class="subtitulo">RASX-MATRIZ V6 &middot; Bloco CLIN &middot; Subgrupos AVAL+CRES+PROC</div>

  <div class="bloco">
    <h3>1. IDENTIFICACAO DO PACIENTE</h3>
    <div class="grid">
      <div><span class="lab">Nome:</span> <span class="val">${params.nome}</span></div>
      <div><span class="lab">CPF:</span> <span class="val">${params.cpf}</span></div>
      <div><span class="lab">Codigo semantico:</span> <span class="val codigo">${params.codigo}</span></div>
      <div><span class="lab">Unidade:</span> <span class="val">INSTITUTO PADUA &middot; Rua Guaxupe</span></div>
      <div><span class="lab">Data do atendimento:</span> <span class="val">${params.dataAtend}</span></div>
      <div><span class="lab">Profissional responsavel:</span> <span class="val">Dr. Caio Henrique Fernandes Padua</span></div>
    </div>
  </div>

  <div class="bloco">
    <h3>2. QUEIXA PRINCIPAL E HIPOTESE CLINICA</h3>
    <p>Paciente em acompanhamento integrativo, demanda apoio para suporte energetico
    celular e equilibrio hormonal masculino. Hipotese: deficit de coenzima Q10
    mitocondrial associado a hipoandrogenismo subclinico, com correlato sintomatico
    de fadiga sustentada, queda de libido e desempenho cognitivo abaixo do habitual.</p>
  </div>

  <div class="bloco">
    <h3>3. PROCEDIMENTOS PRESCRITOS</h3>
    <table>
      <thead>
        <tr><th>Codigo</th><th>Procedimento</th><th>Posologia</th><th>Duracao</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="codigo">FORM AVAL CRES PROC 0001</td>
          <td><strong>Coenzima Q10 (Ubiquinol)</strong><br/>Formula manipulada 200mg</td>
          <td>1 capsula ao dia, em jejum, com gordura boa (azeite de oliva).</td>
          <td>90 dias</td>
        </tr>
        <tr>
          <td class="codigo">INJE AVAL HORM PROC 0002</td>
          <td><strong>Testosterona (cipionato 200mg/mL)</strong><br/>Injetavel IM</td>
          <td>1 ampola IM a cada 21 dias, em uso ambulatorial sob supervisao da equipe de enfermagem.</td>
          <td>180 dias (6 doses), reavaliacao laboratorial em D90 e D180.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="bloco">
    <h3>4. ORIENTACOES E PROXIMAS ETAPAS</h3>
    <ul>
      <li>Retorno presencial em 30 dias para avaliacao clinica intermediaria.</li>
      <li>Exames de controle em D90: testosterona total e livre, SHBG, hematocrito, PSA, perfil lipidico, hsCRP, homocisteina.</li>
      <li>Manter atividade fisica resistida 3-4x/semana e higiene do sono (deitar antes de 23h).</li>
      <li>Em caso de evento adverso, comunicar imediatamente via WhatsApp da clinica.</li>
    </ul>
  </div>

  <div class="bloco">
    <h3>5. CONSENTIMENTO E ACEITE</h3>
    <p>O paciente declara compreender os procedimentos prescritos, seus beneficios,
    riscos e alternativas. Concorda com a conducta proposta e autoriza a equipe
    multidisciplinar a executa-la. Documento juridico complementar (RACJ) sera
    encaminhado para assinatura eletronica via ZapSign (ICP-Brasil).</p>
  </div>

  <div class="footer">
    <div>PAWARDS &middot; PADCON &middot; MEDCORE</div>
    <div>Documento gerado pelo sistema &middot; Hash sera anexado apos finalizacao</div>
  </div>
</body></html>`;

async function main(): Promise<void> {
  const r = await db.execute(sql`SELECT id, nome, cpf, codigo_semantico, unidade_id FROM pacientes WHERE id=3497 LIMIT 1`);
  const pac = (r as { rows: Array<{ id: number; nome: string; cpf: string; codigo_semantico: string; unidade_id: number }> }).rows[0];
  if (!pac) throw new Error("Carlucia (id=3497) nao encontrada");

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1); amanha.setHours(8, 0, 0, 0);
  const dataAtendFmt = amanha.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  console.log("[1/4] Gerando HTML institucional...");
  const html = HTML_RAS({ nome: pac.nome, codigo: pac.codigo_semantico, cpf: pac.cpf, dataAtend: dataAtendFmt });

  console.log("[2/4] Renderizando PDF (htmlParaPdfBuffer)...");
  const buffer = await pdfMod.htmlParaPdfBuffer(html);
  console.log(`  PDF gerado: ${buffer.length} bytes`);

  console.log("[3/4] Subindo pro Google Drive (lazy create de pastas)...");
  const up = await driveMod.uploadArquivoPaciente({
    pacienteId: pac.id,
    unidadeId: pac.unidade_id,
    pacienteNome: pac.nome,
    codigoSemantico: pac.codigo_semantico,
    tipo: "RAS",
    data: new Date(),
    mimeType: "application/pdf",
    conteudo: buffer,
    geradoPorUserId: 1,
  });
  console.log(`  Drive OK: ${up.nomeArquivo}`);
  console.log(`  URL: ${up.driveUrl}`);
  console.log(`  SHA-256: ${up.sha256}`);

  console.log("[4/4] Notificando CEO (WhatsApp + Telegram)...");

  const msgCeo = `[PAWARDS] RAS PDF gerado e arquivado\n\n` +
    `Paciente: ${pac.nome}\n` +
    `Codigo: ${pac.codigo_semantico}\n` +
    `Atendimento: ${dataAtendFmt} - Instituto Padua, Rua Guaxupe\n` +
    `Protocolo: Coenzima Q10 200mg/dia (90d) + Testosterona cipionato 200mg IM/21d (180d)\n\n` +
    `Arquivo: ${up.nomeArquivo}\n` +
    `SHA-256: ${up.sha256?.slice(0, 16)}...\n` +
    `Drive: ${up.driveUrl}\n\n` +
    `Pendente: RACJ ZapSign (wave amanha) | Cobranca (Asaas pendente)`;

  const rWpp = await wpp.enviarWhatsapp("+5511977154000", msgCeo);
  console.log(`  WhatsApp: ${rWpp.sucesso ? "OK" : "FALHA"} (${rWpp.provedorMsgId ?? rWpp.erro})`);
  const rTg = await tg.enviarTelegramCEO(msgCeo);
  console.log(`  Telegram: ${rTg.sucesso ? "OK" : "FALHA"} (${rTg.erro ?? "-"})`);

  console.log("\n=== DEMO RAS CONCLUIDA ===");
  console.log(`PDF: ${up.driveUrl}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
