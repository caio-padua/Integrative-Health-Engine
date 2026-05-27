import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * KAIZEN 3 · FRESHNESS · timestamp "última atualização" em cada bloco
 *
 * Sobre base PENUMBRA. Cada header de BlocoCockpit ganha micro-tag à direita
 * antes do botão FECHAR mostrando quando o dado foi atualizado pela última vez.
 *
 * Como funciona: usa CSS ::after pra injetar via attr() — mas como não temos
 * data-atributo no header existente, simulo via overlay absoluto posicionado
 * dentro de cada .pwd-bloco no canto superior direito, antes do botão FECHAR.
 *
 * Hipótese: clínica não decide com dado velho achando que é fresco. Risco real.
 */
export function DashKai3_Freshness() {
  return (
    <div className="tema-kai-3" style={{ filter: "brightness(0.93) saturate(0.92) contrast(1.08)" }}>
      <style>{`
        .tema-kai-3 *, .tema-kai-3 *::before, .tema-kai-3 *::after { animation: none !important; }
        .tema-kai-3 .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.02), 0 0 3px currentColor !important;
        }
        /* contraste Penumbra */
        .tema-kai-3 .pwd-menu-item p.ink { opacity: 0.92 !important; }
        .tema-kai-3 [style*="color: rgb(157, 163, 174)"],
        .tema-kai-3 [style*="color: #9DA3AE"] { color: #BFC5CF !important; }
        .tema-kai-3 .pwd-crumb { color: #ECEFF4 !important; }
        .tema-kai-3 .pwd-menu-icone { text-shadow: none !important; }

        /* FRESHNESS BADGES · posicionados via ::before nos headers dos blocos */
        .tema-kai-3 .pwd-bloco { position: relative; }
        .tema-kai-3 .pwd-bloco:nth-of-type(1)::before {
          content: "atualiz. 11:14 · agora";
          color: #5FE6CC;
        }
        .tema-kai-3 .pwd-bloco:nth-of-type(2)::before {
          content: "atualiz. 10:47 · há 27min";
          color: #BFC5CF;
        }
        .tema-kai-3 .pwd-bloco:nth-of-type(3)::before {
          content: "atualiz. 09:30 · há 1h 44min";
          color: #BFC5CF;
        }
        .tema-kai-3 .pwd-bloco:nth-of-type(4)::before {
          content: "atualiz. 11:14 · agora";
          color: #5FE6CC;
        }
        .tema-kai-3 .pwd-bloco::before {
          position: absolute;
          top: 14px;
          right: 130px;
          font: 10px/1 "JetBrains Mono", ui-monospace, monospace;
          letter-spacing: 0.14em;
          padding: 4px 8px;
          border: 1px solid currentColor;
          opacity: 0.85;
          z-index: 2;
        }
      `}</style>
      <DashModelo1_Sanfona />
    </div>
  );
}
