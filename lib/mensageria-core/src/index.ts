// ═══════════════════════════════════════════════════════════════════════
// 🧬 @workspace/mensageria-core · barrel export
//
// "RNA mensageiro" do PAWARDS: o mesmo DNA de mensageria viaja entre
//   • mockup-sandbox (canvas / Teatro Mensageria)
//   • api-server (rotas REST /api/mensageria/*)
//   • clinica-motor (UI real de prescrição/lembretes)
//
// Não duplique gramática nem matriz de capacidades em outros lugares.
// Adicione novos canais ou placeholders SOMENTE aqui.
// ═══════════════════════════════════════════════════════════════════════

export * from "./types.js";
export { CANAIS } from "./canais.js";
export { parseInline } from "./parser.js";
export { adaptarParaCanal, tokenParaCanal } from "./adapter.js";
export { ORIGEM_DB_PLACEHOLDER, tracarProveniencia } from "./proveniencia.js";
