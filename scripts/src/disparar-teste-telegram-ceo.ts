// Disparo de teste pro canal Telegram do CEO via bot @Paduaclinica_bot.
// Le TELEGRAM_BOT_TOKEN + CEO_TELEGRAM_CHAT_ID do env.

interface TelegramEnvioResult {
  sucesso: boolean;
  erro?: string;
}

const mod = (await import(
  "../../artifacts/api-server/src/services/telegramService.js" as string,
)) as {
  enviarTelegramCEO: (mensagem: string) => Promise<TelegramEnvioResult>;
  temConfigTelegram: () => boolean;
};

async function main(): Promise<void> {
  if (!mod.temConfigTelegram()) {
    console.error(
      "[ERRO] TELEGRAM_BOT_TOKEN ou CEO_TELEGRAM_CHAT_ID nao configurado.",
    );
    process.exit(1);
  }

  const agora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const msg =
    `[PAWARDS] Teste de canal Telegram CEO\n\n` +
    `Bot: @Paduaclinica_bot\n` +
    `Hora: ${agora}\n\n` +
    `Se voce esta lendo, o terceiro canal de aviso ao platform_owner ` +
    `esta funcional ao lado de e-mail e WhatsApp.\n\n` +
    `Casos de uso: alertas 2FA, expiracao TOTP, silencio webhook ZapSign, ` +
    `assinaturas concluidas/recusadas, eventos criticos do sistema.`;

  console.log("Disparando Telegram pro CEO...");
  const r = await mod.enviarTelegramCEO(msg);
  console.log("Resultado:", JSON.stringify(r, null, 2));
  process.exit(r.sucesso ? 0 : 1);
}

main().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
