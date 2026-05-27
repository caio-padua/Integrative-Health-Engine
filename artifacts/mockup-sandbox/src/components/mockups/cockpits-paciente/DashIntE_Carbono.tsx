import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * VARIANTE E · CARBONO · monocromia funcional · "modo missão noturna"
 *
 * Tudo dessaturado pra ~40% — cores ainda dão pista de domínio, mas a tela
 * parece carvão+grafite com leves tons. ZERO pulso, ZERO glow externo.
 * Sensação: terminal Unix de NASA · você fica horas sem cansar a vista.
 *
 * Mudanças versus A:
 *  · saturate 0.42 · brightness 0.78 (tudo cinza-com-pista-de-cor)
 *  · contrast 1.05 (compensa a saturação pra texto não ficar lavado)
 *  · zero glow em qualquer lugar
 *  · zero animação (sem respiração, sem pulso)
 */
export function DashIntE_Carbono() {
  return (
    <div className="tema-int-e" style={{ filter: "brightness(0.78) saturate(0.42) contrast(1.05)" }}>
      <style>{`
        .tema-int-e * { animation: none !important; }
        .tema-int-e .pwd-menu-icone { text-shadow: none !important; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important; }
        .tema-int-e .pwd-menu-item-ativo {
          box-shadow: inset 0 0 0 1px currentColor !important;
          text-shadow: none !important;
        }
        .tema-int-e .pwd-menu-item:hover { text-shadow: none !important; }
        .tema-int-e .pwd-vis-on, .tema-int-e .pwd-vis:hover { text-shadow: none !important; }
        .tema-int-e [class*="pwd-crumb-on"] { text-shadow: none !important; }
        .tema-int-e .pwd-olho:hover { box-shadow: none !important; }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
