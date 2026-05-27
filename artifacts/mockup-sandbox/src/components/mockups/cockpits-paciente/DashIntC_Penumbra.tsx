import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * VARIANTE C · PENUMBRA · glows -70% · pulso lento
 *
 * Cores preservadas (azul é azul, ciano é ciano), mas tudo respira em câmera lenta.
 * Sensação: cockpit de submarino — você confia no instrumento, ele não te grita.
 *
 * Mudanças versus A:
 *  · glow externo ~30% do original
 *  · pulso unificado 2.8s → 4.5s (cardio em descanso)
 *  · brightness 0.86 · saturate 0.85 (1 passo mais escuro que B)
 *  · retângulos embordados mantêm 1.5px borda mas sem glow externo forte
 */
export function DashIntC_Penumbra() {
  return (
    <div
      className="tema-int-c"
      style={{
        // brightness sobe 0.86→0.93 · contrast 1.08 devolve nitidez do texto
        // saturate 0.85→0.92 deixa as cores de identidade um pouco mais firmes
        filter: "brightness(0.93) saturate(0.92) contrast(1.08)",
      }}
    >
      <style>{`
        /* === GLOWS contidos (essência da Penumbra) === */
        .tema-int-c .pwd-menu-icone { text-shadow: none !important; }
        .tema-int-c .pwd-menu-item-ativo {
          box-shadow:
            inset 0 0 6px rgba(255,255,255,0.02),
            0 0 3px currentColor !important;
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
        }
        .tema-int-c .pwd-menu-item:hover { animation: pwd-breathe-cor 4.5s ease-in-out infinite !important; }
        .tema-int-c .pwd-vis-on, .tema-int-c .pwd-vis:hover {
          text-shadow: 0 0 2px rgba(255,230,0,0.4) !important;
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
        }
        .tema-int-c [class*="pwd-crumb-on"] { animation: pwd-breathe-cor 4.5s ease-in-out infinite !important; }

        /* === CONTRASTE DE TEXTO devolvido (+~10%) === */
        /* subtítulos branco-mute do menu: 0.75 → 0.92 */
        .tema-int-c .pwd-menu-item p.ink,
        .tema-int-c .pwd-menu-item [style*="opacity: 0.75"],
        .tema-int-c .pwd-menu-item [style*="opacity:0.75"] {
          opacity: 0.92 !important;
        }
        /* corpo de bloco: títulos e labels secundárias ganham tom mais branco */
        .tema-int-c .pwd-card-alerta,
        .tema-int-c .pwd-kpi,
        .tema-int-c .pwd-bloco {
          color: #F2F4F7;
        }
        /* labels pequenos cinza muito apagados → cinza-claro firme */
        .tema-int-c [style*="color: rgb(157, 163, 174)"],
        .tema-int-c [style*="color:#9DA3AE"],
        .tema-int-c [style*="color: #9DA3AE"] {
          color: #BFC5CF !important;
        }
        /* breadcrumbs neutros: branco mais cheio */
        .tema-int-c .pwd-crumb {
          color: #ECEFF4 !important;
        }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
