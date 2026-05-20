// ═══════════════════════════════════════════════════════════════════════
// 🧬 MENSAGERIA-CORE · TIPOS COMPARTILHADOS
// RNA mensageiro: mesmo DNA viaja entre mockup-sandbox (canvas),
// api-server (rotas REST) e clinica-motor (UI real).
// ═══════════════════════════════════════════════════════════════════════

export type Canal = "whatsapp" | "telegram_mv2" | "telegram_html";

export type CapacidadesCanal = {
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  tachado: boolean;
  mono: boolean;
  spoiler: boolean;
  link_inline: boolean;
  precisa_escape: boolean;
};

export type CanalConfig = {
  id: Canal;
  rotulo: string;
  curto: string;
  icone: string;
  cor: string;
  formato: string;
  suporta: CapacidadesCanal;
  obs: string;
};

export type InlineTokenTipo = "text" | "bold" | "italic" | "underline" | "strike" | "mono";
export type InlineToken = { tipo: InlineTokenTipo; texto: string };

export type OrigemPlaceholder = {
  tabela: string;
  coluna: string;
  jornada: string;
};

export type LinhaProveniencia = {
  ordem: number;
  chave: string;
  resolvido: string;
  tabela: string;
  coluna: string;
  jornada: string;
  vazio: boolean;
  fonte_tipo: "placeholder" | "slot";
};
