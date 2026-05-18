// Wave V483 — Disparar envelope ZapSign real pra Carlucia usando
// AssinaturaService.enviar (template TCLE_PADRAO_V1, provedor zapsign).
// Caio liberou ("faz o que tem que fazer e nao me peca pra validar").

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface SrvMod {
  assinaturaService: {
    enviar: (p: {
      pacienteId: number;
      templateCodigo: string;
      procedimento?: string;
      valorOrcamento?: string;
      riscos?: string;
      forcarProvedor?: "zapsign" | "clicksign" | "d4sign" | "autentique" | "icp_a1_local";
      metadataExtra?: Record<string, unknown>;
    }) => Promise<{
      solicitacaoId: number;
      envelopeId: string;
      provedorUsado: string;
      failoverAcionado: boolean;
      signatarios: Array<{ papel: string; nome: string; link?: string }>;
      pdfNomePadrao: string;
    }>;
  };
}
const srv = (await import("../../artifacts/api-server/src/lib/assinatura/service.js" as string)) as SrvMod;
const tg = (await import("../../artifacts/api-server/src/services/telegramService.js" as string)) as {
  enviarTelegramCEO: (msg: string) => Promise<{ sucesso: boolean; erro?: string }>;
};

const PACIENTE_ID = 3497;

async function main() {
  console.log("=== Wave V483 — Envelope ZapSign Carlucia (TCLE) ===");

  // Confere se ZAPSIGN_API_TOKEN existe (sem imprimir o valor)
  if (!process.env["ZAPSIGN_API_TOKEN"]) {
    console.warn("[aviso] ZAPSIGN_API_TOKEN ausente — adapter vai operar em MODO_MOCK (envelope sintetico).");
  } else {
    console.log("[info] ZAPSIGN_API_TOKEN presente — envelope sera real.");
  }

  try {
    const r = await srv.assinaturaService.enviar({
      pacienteId: PACIENTE_ID,
      templateCodigo: "TCLE_PADRAO_V1",
      procedimento: "Sessao 39 - Protocolo PADCON integrativo (formula manipulada + IM Vit D3/B12/CompB/Zn-Se + EV Glutationa)",
      valorOrcamento: "0,00",
      riscos: "Conforme bula e protocolo institucional. Aplicacoes acompanhadas por equipe medica.",
      forcarProvedor: "zapsign",
      metadataExtra: { wave: "V483", sessao_id: 39, origem: "demo_investidora_19_mai" },
    });

    console.log("=== RESULTADO ===");
    console.log(JSON.stringify(r, null, 2));

    // Atualiza assinatura_solicitacoes com referencia ao paciente + sessao
    await db.execute(sql`UPDATE assinatura_solicitacoes SET metadata = metadata || ${JSON.stringify({ sessao_id: 39, wave: "V483" })}::jsonb WHERE id=${r.solicitacaoId}`);

    const linhas = [
      "*Wave V483 — Envelope ZapSign Carlucia disparado*",
      "",
      `Solicitacao id: ${r.solicitacaoId}`,
      `Envelope id: ${r.envelopeId}`,
      `Provedor: ${r.provedorUsado}${r.failoverAcionado ? " (FAILOVER)" : ""}`,
      `Template: TCLE_PADRAO_V1`,
      `PDF nome padrao: ${r.pdfNomePadrao}`,
      "",
      "Signatarios:",
      ...r.signatarios.map(s => `- [${s.papel}] ${s.nome}${s.link ? " " + s.link : ""}`),
      "",
      "Webhook ZapSign ja monitora — quando paciente assinar, doc_signed dispara",
      "notificacao automatica pro CEO (via lib/assinatura/service.ts).",
    ];
    await tg.enviarTelegramCEO(linhas.join("\n"));
    console.log("[telegram] CEO notificado.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ERRO] envelope falhou:", msg);
    await tg.enviarTelegramCEO(`*Wave V483 — Envelope ZapSign FALHOU*\n\nMotivo: ${msg.slice(0, 300)}\n\nCarlucia continua coberta pelo RACJ presencial (Wave V482, 9 termos em termos_assinados).`);
    process.exit(1);
  }
}

void main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e); process.exit(1); });
