/**
 * WHATSAPP CARLÚCIA — 7 RAS V8 já no Drive
 *
 * Caio (CEO) aprovou layout V8 (rodada V481). Manda os links pra ela.
 *
 * Roda: tsx artifacts/api-server/src/scripts/whatsappCarluciaTodosRas.ts
 */
import { pool } from "@workspace/db";
import { enviarWhatsapp } from "../services/whatsappService";

const PACIENTE_ID = 3497;
const UNIDADE_ID = 15;
const TELEFONE = "5562982696656";

const LINKS = [
  { rotulo: "RAS COMPLETO (11 cadernos)",                url: "https://drive.google.com/file/d/1yHGPPxsIfeuM547Q3BGWFgleGkBIB7aT/view?usp=drivesdk" },
  { rotulo: "RAS Clínico",                                url: "https://drive.google.com/file/d/1UDMenW4ygMzRz4EuC2_SgiIRL9DinYJu/view?usp=drivesdk" },
  { rotulo: "RAS Evolutivo",                              url: "https://drive.google.com/file/d/1251KSJ_BnouTZrBfn9olR91IpIPFJ7Cn/view?usp=drivesdk" },
  { rotulo: "RAS Estado de Saúde",                        url: "https://drive.google.com/file/d/1JM5SQbQ0ITERbXnwpTMHefX20v6bLjXT/view?usp=drivesdk" },
  { rotulo: "Registro Clínico Consolidado (Motor CLIN)",  url: "https://drive.google.com/file/d/1T91-yZE0v_tOjkQWxtzSL6zE-FV-KHAG/view?usp=drivesdk" },
  { rotulo: "Termos Jurídicos Consolidados (Motor JURI)", url: "https://drive.google.com/file/d/1lpr_CtxvuirUSsuCAkxUqgcY2LBdZPeH/view?usp=drivesdk" },
  { rotulo: "Acompanhamento Evolutivo (Motor ACOM)",      url: "https://drive.google.com/file/d/1lxa0SN6WuLF2MxloQT_SHsQF_0lR404B/view?usp=drivesdk" },
];

async function main() {
  const lista = LINKS.map((l, i) => `${i + 1}. ${l.rotulo}\n   ${l.url}`).join("\n\n");
  const msg =
    `Olá, Carlúcia! Aqui é do Instituto Pádua.\n\n` +
    `Disponibilizamos no seu Drive o Relatório Analítico de Saúde (RAS) completo, ` +
    `com ${LINKS.length} documentos clínicos do seu protocolo:\n\n` +
    `${lista}\n\n` +
    `Você recebeu também acesso de leitura à sua pasta completa por email. ` +
    `Qualquer dúvida, retornamos por aqui.\n\n` +
    `Equipe PAWARDS · Instituto Pádua`;

  console.log("[whatsapp-carlucia-ras] Enviando pra", TELEFONE);
  const r = await enviarWhatsapp(TELEFONE, msg, { unidadeId: UNIDADE_ID });
  console.log(`    → WhatsApp: ${r.sucesso ? "ENVIADO" : "FALHOU"}${r.erro ? ` (${r.erro})` : ""}`);
  await pool.end();
  process.exit(r.sucesso ? 0 : 1);
}

main().catch(async (err) => {
  console.error("[whatsapp-carlucia-ras] ERRO:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});

void PACIENTE_ID;
