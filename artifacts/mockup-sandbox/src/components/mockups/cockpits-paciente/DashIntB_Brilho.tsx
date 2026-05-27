import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * VARIANTE B · BRILHO MÉDIO · glows -40%
 *
 * Mantém TODAS as cores de identidade, retângulos embordados, pulso 2.8s.
 * Reduz só a intensidade do glow externo (box-shadow) e text-shadow.
 * Sensação: mesmo cockpit, mas a 18h em vez de 13h — luz mais amena.
 *
 * Mudanças versus A:
 *  · text-shadow de currentColor → 2px → 0.5px
 *  · box-shadow glows externos cortados pela metade (filter brightness 0.94 + saturate 0.92)
 *  · pulse breathing mantido (2.8s · idêntico)
 */
export function DashIntB_Brilho() {
  return (
    <div className="tema-int-b" style={{ filter: "brightness(0.94) saturate(0.92)" }}>
      <style>{`
        .tema-int-b .pwd-menu-icone { text-shadow: 0 0 1px currentColor !important; }
        .tema-int-b .pwd-menu-item-ativo {
          box-shadow:
            inset 0 0 8px rgba(255,255,255,0.03),
            0 0 4px currentColor,
            0 0 8px currentColor !important;
        }
        .tema-int-b .pwd-vis-on { text-shadow: 0 0 3px rgba(255,230,0,0.6) !important; }
        .tema-int-b .pwd-vis:hover { text-shadow: 0 0 3px rgba(255,230,0,0.55) !important; }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
