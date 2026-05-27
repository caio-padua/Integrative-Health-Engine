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
    <div className="tema-int-c" style={{ filter: "brightness(0.86) saturate(0.85)" }}>
      <style>{`
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
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
