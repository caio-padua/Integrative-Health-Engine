// ═══════════════════════════════════════════════════════════════════════
// 📡 CANAIS · matriz de capacidades por destino
// ═══════════════════════════════════════════════════════════════════════
import type { Canal, CanalConfig } from "./types.js";

export const CANAIS: Record<Canal, CanalConfig> = {
  whatsapp: {
    id: "whatsapp", rotulo: "WhatsApp", curto: "WA", icone: "💬", cor: "#25D366",
    formato: "*negrito*  _itálico_  ~tachado~  ```mono```",
    suporta: { negrito: true, italico: true, sublinhado: false, tachado: true, mono: true, spoiler: false, link_inline: false, precisa_escape: false },
    obs: "marcadores precisam de espaço/pontuação ao redor pra serem reconhecidos",
  },
  telegram_mv2: {
    id: "telegram_mv2", rotulo: "Telegram MV2", curto: "TG-MV2", icone: "✈️", cor: "#54A9EB",
    formato: "*negrito*  _itálico_  __sublinhado__  ~tachado~  `mono`  ||spoiler||",
    suporta: { negrito: true, italico: true, sublinhado: true, tachado: true, mono: true, spoiler: true, link_inline: true, precisa_escape: true },
    obs: "escapa _*[]()~`>#+-=|{}.! com \\ — bots quebram com erro 400 sem isso",
  },
  telegram_html: {
    id: "telegram_html", rotulo: "Telegram HTML", curto: "TG-HTML", icone: "✈️", cor: "#88BEEC",
    formato: "<b>x</b>  <i>x</i>  <u>x</u>  <s>x</s>  <code>x</code>",
    suporta: { negrito: true, italico: true, sublinhado: true, tachado: true, mono: true, spoiler: true, link_inline: true, precisa_escape: false },
    obs: "verboso porém robusto · sem labirinto de escape · ideal pra mensagens com pontuação livre",
  },
};
