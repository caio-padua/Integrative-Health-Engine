import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * KAIZEN 5 · MODO FOCO · menu lateral colapsado, área central full-width
 *
 * Sobre base PENUMBRA. Esconde texto do menu lateral (só siglas DASHB/PACTS…),
 * esconde subtítulos, esconde breadcrumbs secundários. Bloco central usa o
 * espaço liberado. Toggle conceitual via classe — em produção seria tecla F ou Esc.
 *
 * Hipótese: pra sessão de 30min só em "Alertas Críticos", reduzir periferia
 * visual aumenta tempo de foco em ação clínica.
 */
export function DashKai5_ModoFoco() {
  return (
    <div className="tema-kai-5" style={{ filter: "brightness(0.93) saturate(0.92) contrast(1.08)" }}>
      <style>{`
        .tema-kai-5 *, .tema-kai-5 *::before, .tema-kai-5 *::after { animation: none !important; }
        .tema-kai-5 .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.02), 0 0 3px currentColor !important;
        }
        .tema-kai-5 .pwd-menu-item p.ink { opacity: 0.92 !important; }
        .tema-kai-5 [style*="color: rgb(157, 163, 174)"],
        .tema-kai-5 [style*="color: #9DA3AE"] { color: #BFC5CF !important; }
        .tema-kai-5 .pwd-crumb { color: #ECEFF4 !important; }
        .tema-kai-5 .pwd-menu-icone { text-shadow: none !important; }

        /* === MODO FOCO === */
        /* esconde texto do menu lateral, só sigla fica */
        .tema-kai-5 .pwd-menu-item > div:last-child,
        .tema-kai-5 .pwd-menu-item p.ink {
          display: none !important;
        }
        /* esconde sub-itens dos menus expandidos */
        .tema-kai-5 .pwd-menu-sub-item { display: none !important; }
        /* menu lateral encolhe pra largura mínima das siglas */
        .tema-kai-5 aside {
          flex: 0 0 70px !important;
          width: 70px !important;
          min-width: 70px !important;
        }
        /* esconde menu superior horizontal (redundância em modo foco) */
        .tema-kai-5 nav[role="navigation"] { display: none !important; }
        /* esconde breadcrumbs secundários */
        .tema-kai-5 .pwd-crumb:not(:last-child),
        .tema-kai-5 .pwd-crumb-sep { display: none !important; }
        /* faixa indicando modo foco ativo */
      `}</style>

      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#0A0E16",
        borderBottom: "1px solid #F5C97A",
        padding: "8px 24px",
        fontSize: 10,
        letterSpacing: "0.18em",
        color: "#F5C97A",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        textAlign: "center",
      }}>
        MODO FOCO ATIVO · pressione [F] ou [ESC] pra sair · menu reduzido, periferia oculta
      </div>

      <DashModelo1_Sanfona />
    </div>
  );
}
