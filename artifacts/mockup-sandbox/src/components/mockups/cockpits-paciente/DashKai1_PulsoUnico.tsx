import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * KAIZEN 1 · PULSO ÚNICO · só UMA âncora respira
 *
 * Sobre base PENUMBRA (brightness 0.93 · contrast 1.08).
 * REMOVE respiração de TUDO exceto o item ativo do menu principal vertical.
 * Hipótese: cérebro TDAH para de "caçar" qual item está vivo — sabe instantâneo.
 *
 * Mudanças versus Penumbra:
 *  · breadcrumb ativo: pulso → estático colorido
 *  · menu superior horizontal ativo: pulso → estático colorido
 *  · olho visibilidade ativo: pulso → estático
 *  · MANTÉM pulso APENAS em .pwd-menu-item-ativo (uma única âncora)
 */
export function DashKai1_PulsoUnico() {
  return (
    <div className="tema-kai-1" style={{ filter: "brightness(0.93) saturate(0.92) contrast(1.08)" }}>
      <style>{`
        /* mata respiração em tudo */
        .tema-kai-1 *, .tema-kai-1 *::before, .tema-kai-1 *::after { animation: none !important; }
        /* devolve respiração APENAS no item ativo do menu lateral principal */
        .tema-kai-1 .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.02), 0 0 3px currentColor !important;
        }
        /* contraste Penumbra */
        .tema-kai-1 .pwd-menu-item p.ink,
        .tema-kai-1 .pwd-menu-item [style*="opacity: 0.75"],
        .tema-kai-1 .pwd-menu-item [style*="opacity:0.75"] { opacity: 0.92 !important; }
        .tema-kai-1 [style*="color: rgb(157, 163, 174)"],
        .tema-kai-1 [style*="color: #9DA3AE"] { color: #BFC5CF !important; }
        .tema-kai-1 .pwd-crumb { color: #ECEFF4 !important; }
        .tema-kai-1 .pwd-menu-icone { text-shadow: none !important; }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
