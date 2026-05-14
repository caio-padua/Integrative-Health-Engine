/**
 * Task #128 — Endurecer webhook ZapSign pra producao.
 * Task #220 — Suportar rotacao do segredo sem downtime (--rotate).
 *
 * Configura o header secreto `x-pawards-secret: <ZAPSIGN_WEBHOOK_SECRET>`
 * em todos os webhooks cadastrados no painel ZapSign, via API:
 *
 *   GET  /api/v1/user/company/webhooks/   -> lista webhooks
 *   PUT  /api/v1/webhooks/{id}/           -> atualiza header_key/header_value
 *
 * O painel ZapSign (modal "Criar webhook") NAO expoe campo pra header
 * customizado, entao a unica forma de blindar contra POST forjado em
 * `/api/webhooks/assinatura/zapsign` eh setar o header via API.
 *
 * Uso (modo padrao — sincroniza painel com ZAPSIGN_WEBHOOK_SECRET):
 *   ZAPSIGN_API_TOKEN=<token>            # token de PRODUCAO
 *   ZAPSIGN_WEBHOOK_SECRET=<secret>      # ja existe no Replit Secrets
 *   ZAPSIGN_BASE_URL=https://api.zapsign.com.br   # opcional, default producao
 *   DRY_RUN=true                         # opcional, so lista (nao escreve)
 *   pnpm --filter @workspace/scripts run zapsign-configurar-webhooks-prod
 *
 * Idempotente: re-rodar com mesmo secret eh no-op no painel ZapSign.
 *
 * ===========================================================================
 * PLAYBOOK DE ROTACAO ANUAL (3 PASSOS, ZERO DOWNTIME) — Task #220
 * ===========================================================================
 *
 * O adapter (`artifacts/api-server/src/lib/assinatura/adapters.ts`) aceita
 * DOIS segredos validos simultaneamente: ZAPSIGN_WEBHOOK_SECRET (atual)
 * e ZAPSIGN_WEBHOOK_SECRET_NEXT (proximo). Isso destrava a rotacao em
 * janela larga sem precisar atualizar painel + Replit Secret no mesmo
 * milissegundo.
 *
 * 1) Gere o novo segredo e salve como ZAPSIGN_WEBHOOK_SECRET_NEXT no
 *    Replit Secrets (NAO mexa no atual). Reinicie o api-server. A partir
 *    daqui o servidor aceita os 2 segredos.
 *
 * 2) Rode com --rotate. O script escreve o NEXT no painel ZapSign,
 *    SEM mexer no segredo atual do Replit:
 *
 *      pnpm --filter @workspace/scripts run zapsign-configurar-webhooks-prod -- --rotate
 *
 *    Pode haver alguns segundos onde alguns POSTs do ZapSign chegam com
 *    o segredo antigo e outros com o novo — os dois sao aceitos.
 *
 * 3) Promova o NEXT pra atual: copie ZAPSIGN_WEBHOOK_SECRET_NEXT pra
 *    ZAPSIGN_WEBHOOK_SECRET, REMOVA ZAPSIGN_WEBHOOK_SECRET_NEXT do
 *    Replit Secrets, reinicie. Rode o script no modo padrao (sem flag)
 *    pra confirmar que painel e Replit batem novamente.
 * ===========================================================================
 */

interface ZapsignWebhook {
  id?: number;
  url: string;
  event_type?: string;
  header_key?: string | null;
  header_value?: string | null;
}

const HEADER_KEY = "x-pawards-secret";

async function main() {
  const token = process.env["ZAPSIGN_API_TOKEN"] || process.env["ZAPSIGN_TOKEN"];
  const baseUrl = process.env["ZAPSIGN_BASE_URL"] || "https://api.zapsign.com.br";
  const dryRun = process.env["DRY_RUN"] === "true";
  // Modo rotacao: escreve ZAPSIGN_WEBHOOK_SECRET_NEXT no painel SEM mexer
  // no segredo atual do Replit. Veja playbook no cabecalho do arquivo.
  const rotateMode = process.argv.includes("--rotate");

  const secretAtual = process.env["ZAPSIGN_WEBHOOK_SECRET"];
  const secretNext = process.env["ZAPSIGN_WEBHOOK_SECRET_NEXT"];
  const secret = rotateMode ? secretNext : secretAtual;

  if (!token) {
    console.error("[zapsign-configurar-webhooks] ERRO: ZAPSIGN_API_TOKEN ausente.");
    process.exit(1);
  }
  if (rotateMode && !secretNext) {
    console.error(
      "[zapsign-configurar-webhooks] ERRO: --rotate requer ZAPSIGN_WEBHOOK_SECRET_NEXT no Replit Secrets.",
    );
    process.exit(1);
  }
  if (!secret) {
    console.error(
      `[zapsign-configurar-webhooks] ERRO: ${rotateMode ? "ZAPSIGN_WEBHOOK_SECRET_NEXT" : "ZAPSIGN_WEBHOOK_SECRET"} ausente.`,
    );
    process.exit(1);
  }

  console.log(
    `[zapsign-configurar-webhooks] base=${baseUrl} dryRun=${dryRun} mode=${rotateMode ? "ROTATE (escrevendo SECRET_NEXT)" : "padrao (SECRET atual)"}`,
  );
  if (rotateMode) {
    console.log(
      "[zapsign-configurar-webhooks] LEMBRE: o adapter aceita ATUAL + NEXT em paralelo. " +
        "Apos rodar, promova SECRET_NEXT -> SECRET no Replit e re-rode SEM --rotate pra confirmar.",
    );
  }

  const listResp = await fetch(`${baseUrl}/api/v1/user/company/webhooks/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listResp.ok) {
    console.error(
      `[zapsign-configurar-webhooks] GET webhooks falhou ${listResp.status}: ${await listResp.text()}`,
    );
    process.exit(2);
  }
  const raw = (await listResp.json()) as ZapsignWebhook[] | { results?: ZapsignWebhook[] };
  const webhooks: ZapsignWebhook[] = Array.isArray(raw) ? raw : raw.results || [];

  if (webhooks.length === 0) {
    console.warn("[zapsign-configurar-webhooks] Nenhum webhook cadastrado no painel.");
    return;
  }

  console.log(`[zapsign-configurar-webhooks] ${webhooks.length} webhook(s) encontrados:`);
  for (const w of webhooks) {
    const status =
      w.header_key === HEADER_KEY && w.header_value === secret
        ? "OK (ja blindado)"
        : "PENDENTE";
    console.log(
      `  - id=${w.id} event=${w.event_type ?? "?"} url=${w.url} status=${status}`,
    );
  }

  if (dryRun) {
    console.log("[zapsign-configurar-webhooks] DRY_RUN=true — nao escrevendo.");
    return;
  }

  let atualizados = 0;
  let pulados = 0;
  let falharam = 0;

  for (const w of webhooks) {
    if (!w.id) {
      console.warn(`[zapsign-configurar-webhooks] webhook sem id pulado: ${w.url}`);
      pulados++;
      continue;
    }
    if (w.header_key === HEADER_KEY && w.header_value === secret) {
      console.log(`[zapsign-configurar-webhooks] webhook ${w.id} ja blindado, no-op.`);
      pulados++;
      continue;
    }
    const putResp = await fetch(`${baseUrl}/api/v1/webhooks/${w.id}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // ZapSign Webhook (PUT /api/v1/webhooks/{id}/) usa header_key /
      // header_value em campos TOP-LEVEL, mesma forma serializada no GET.
      // Mantemos url + event_type pra preservar a config existente.
      body: JSON.stringify({
        url: w.url,
        event_type: w.event_type,
        header_key: HEADER_KEY,
        header_value: secret,
      }),
    });
    if (!putResp.ok) {
      console.error(
        `[zapsign-configurar-webhooks] PUT webhook ${w.id} falhou ${putResp.status}: ${await putResp.text()}`,
      );
      falharam++;
      continue;
    }
    console.log(`[zapsign-configurar-webhooks] webhook ${w.id} PUT ok, validando...`);
    atualizados++;
  }

  // Re-fetch obrigatorio: 200 do PUT NAO garante que o painel ZapSign
  // realmente persistiu o header (poderia ter ignorado campo desconhecido).
  // Re-leitura confirma estado final, evitando "false confidence".
  console.log("[zapsign-configurar-webhooks] re-fetch pra validar estado final...");
  const verifyResp = await fetch(`${baseUrl}/api/v1/user/company/webhooks/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!verifyResp.ok) {
    console.error(
      `[zapsign-configurar-webhooks] GET de validacao falhou ${verifyResp.status}: ${await verifyResp.text()}`,
    );
    process.exit(4);
  }
  const verifyRaw = (await verifyResp.json()) as ZapsignWebhook[] | { results?: ZapsignWebhook[] };
  const verifyWebhooks: ZapsignWebhook[] = Array.isArray(verifyRaw)
    ? verifyRaw
    : verifyRaw.results || [];

  const naoBlindados = verifyWebhooks.filter(
    (w) => w.header_key !== HEADER_KEY || w.header_value !== secret,
  );

  console.log(
    `[zapsign-configurar-webhooks] resumo: atualizados=${atualizados} pulados=${pulados} falharam=${falharam} ainda_sem_header=${naoBlindados.length}`,
  );

  if (naoBlindados.length > 0) {
    console.error("[zapsign-configurar-webhooks] FALHA: webhooks sem header secreto:");
    for (const w of naoBlindados) {
      console.error(
        `  - id=${w.id} event=${w.event_type ?? "?"} url=${w.url} header_key=${w.header_key ?? "<null>"}`,
      );
    }
    process.exit(5);
  }
  if (falharam > 0) process.exit(3);
  console.log("[zapsign-configurar-webhooks] OK: 100% dos webhooks blindados com x-pawards-secret.");
}

main().catch((e) => {
  console.error("[zapsign-configurar-webhooks] FALHOU:", (e as Error)?.message || e);
  console.error((e as Error)?.stack);
  process.exit(1);
});
