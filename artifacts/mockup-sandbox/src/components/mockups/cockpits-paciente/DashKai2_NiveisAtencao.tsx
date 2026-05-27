import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * KAIZEN 2 · 3 NÍVEIS DE ATENÇÃO · urgência ≠ domínio
 *
 * Sobre base PENUMBRA. Separa "cor de identidade" de "intensidade de urgência":
 *  · N1 AGORA (.pwd-card-alerta com tag CRÍTICO): borda 2px sólida + respiração única
 *  · N2 HOJE  (.pwd-card-alerta com tag URGENTE): borda 1px sólida, sem respiração
 *  · N3 INFORMA: borda tracejada 1px + opacity 0.85
 *
 * Hipótese: cérebro distingue "ação agora" vs "ação no turno" sem ler texto.
 * O que muda visualmente: o card CRÍTICO Graco Souza Pádua ganha presença
 * notavelmente maior que os 2 URGENTE adjacentes.
 */
export function DashKai2_NiveisAtencao() {
  return (
    <div className="tema-kai-2" style={{ filter: "brightness(0.93) saturate(0.92) contrast(1.08)" }}>
      <style>{`
        .tema-kai-2 *, .tema-kai-2 *::before, .tema-kai-2 *::after { animation: none !important; }
        .tema-kai-2 .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.02), 0 0 3px currentColor !important;
        }
        /* N1 AGORA: card que contém tag CRÍTICO ganha borda 2px + respiração única */
        .tema-kai-2 .pwd-card-alerta:has(.pwd-tag:where([style*="rgb(255, 154, 154)"], [style*="#FF9A9A"])) {
          border-width: 2px !important;
          box-shadow: inset 0 0 8px rgba(255,154,154,0.06), 0 0 6px rgba(255,154,154,0.5) !important;
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
        }
        /* N2 HOJE: cards URGENTE (cor dourada) — borda 1px sólida, sem respiração, sem glow extra */
        .tema-kai-2 .pwd-card-alerta:has(.pwd-tag:where([style*="rgb(245, 201, 122)"], [style*="#F5C97A"])) {
          border-width: 1px !important;
          box-shadow: none !important;
        }
        /* N3 INFORMA: bloco DEMANDAS OPERACIONAIS e itens demais → opacity calma */
        .tema-kai-2 .pwd-bloco:nth-of-type(n+3) {
          opacity: 0.85;
        }
        /* contraste Penumbra */
        .tema-kai-2 .pwd-menu-item p.ink { opacity: 0.92 !important; }
        .tema-kai-2 [style*="color: rgb(157, 163, 174)"],
        .tema-kai-2 [style*="color: #9DA3AE"] { color: #BFC5CF !important; }
        .tema-kai-2 .pwd-crumb { color: #ECEFF4 !important; }
        .tema-kai-2 .pwd-menu-icone { text-shadow: none !important; }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
