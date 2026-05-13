/**
 * Task #172 · Cliente minimalista do Telegram Bot API pra disparar
 * mensagens pessoais ao platform_owner (CEO) como terceiro canal de
 * aviso ao lado de email e WhatsApp.
 *
 * Por que Telegram:
 *   WhatsApp via Twilio/Gupshup tem rate-limit, janela de 24h e exige
 *   templates aprovados. Telegram Bot API e gratuito, sem rate-limit
 *   relevante pra alertas pessoais (1 owner) e usa um bot proprio
 *   controlado pela plataforma. Funciona bem em contextos onde o
 *   WhatsApp falha (numero novo, reset de sessao, etc).
 *
 * Configuracao:
 *   - TELEGRAM_BOT_TOKEN — token do bot criado via @BotFather.
 *   - CEO_TELEGRAM_CHAT_ID — chat_id pessoal do owner (descobre-se
 *     mandando uma msg pro bot e consultando getUpdates uma vez).
 *
 * Defensivo: nunca lanca. Retorna { sucesso, erro } igual o whatsapp
 * service pra simetria com o worker.
 */
import { logger } from "../lib/logger";

export interface TelegramEnvioResult {
  sucesso: boolean;
  erro?: string;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function temConfigTelegram(): boolean {
  return Boolean(
    process.env["TELEGRAM_BOT_TOKEN"] && process.env["CEO_TELEGRAM_CHAT_ID"],
  );
}

export async function enviarTelegramCEO(
  mensagem: string,
): Promise<TelegramEnvioResult> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["CEO_TELEGRAM_CHAT_ID"];
  if (!token || !chatId) {
    return {
      sucesso: false,
      erro: "TELEGRAM_BOT_TOKEN ou CEO_TELEGRAM_CHAT_ID nao configurado",
    };
  }
  try {
    const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensagem,
        disable_web_page_preview: false,
      }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      logger.warn(
        { status: resp.status, corpo: corpo.slice(0, 300) },
        "[telegram] envio retornou status nao-ok",
      );
      return { sucesso: false, erro: `HTTP ${resp.status}` };
    }
    const data: any = await resp.json().catch(() => ({}));
    if (!data?.ok) {
      return {
        sucesso: false,
        erro: data?.description ?? "resposta sem ok=true",
      };
    }
    return { sucesso: true };
  } catch (e: any) {
    logger.warn({ err: e?.message ?? String(e) }, "[telegram] erro envio");
    return { sucesso: false, erro: e?.message ?? String(e) };
  }
}
