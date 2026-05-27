import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * VARIANTE D · TINTA SECA · ZERO glow · documento jurídico noturno
 *
 * Estética "papel preto + tinta colorida" — bordas e cores ficam, glow some.
 * Pulso preservado apenas no ITEM ATIVO (uma única âncora respirando, não vários).
 * Sensação: peça processual impressa em papel preto com canetas neon.
 *
 * Mudanças versus A:
 *  · ELIMINA text-shadow e box-shadow EXTERNOS (mantém só inset/borda)
 *  · pulso 2.8s removido de tudo exceto .pwd-menu-item-ativo
 *  · brightness 0.80 · saturate 0.75
 */
export function DashIntD_Tinta() {
  return (
    <div className="tema-int-d" style={{ filter: "brightness(0.80) saturate(0.75)" }}>
      <style>{`
        .tema-int-d .pwd-menu-icone { text-shadow: none !important; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04) !important; }
        .tema-int-d .pwd-menu-item-ativo {
          box-shadow: inset 0 0 4px rgba(255,255,255,0.03) !important;
          text-shadow: 0 0 4px currentColor !important;
        }
        .tema-int-d .pwd-menu-item:hover { animation: none !important; text-shadow: none !important; }
        .tema-int-d .pwd-vis-on, .tema-int-d .pwd-vis:hover {
          text-shadow: none !important;
          animation: none !important;
        }
        .tema-int-d [class*="pwd-crumb-on"] {
          text-shadow: none !important;
          animation: none !important;
        }
        .tema-int-d .pwd-olho:hover { box-shadow: none !important; }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
