import { useEffect, useRef } from "react";
import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * ════════════════════════════════════════════════════════════════════════
 * MODELO DEFINITIVO PAWARDS · iteração 2 · CEO 27/MAI/2026
 * ════════════════════════════════════════════════════════════════════════
 *
 * Mudanças vs iteração 1:
 *  · LUPA passa de overlay fixed → 4º retângulo na FAIXA 1, antes do operador CAIO
 *  · cor da lupa: ciano #5FE6CC (verde água do modelo Sanfona · "verde-água sanfona")
 *  · contraste +1 ponto: brightness 0.97→0.99 · contrast 1.12→1.16
 *  · hover discreto (neon contido) em LOCAL/GLOBAL e itens do menu lateral
 *  · quando nível 3 visualização está ativo: marca neon na borda esquerda (já existe, reforçada)
 *
 * Restam: K1·K2·K3 essenciais já aprovados, breadcrumbs clicáveis, Penumbra+
 */
export function DashFinalPawards() {
  const rootRef = useRef<HTMLDivElement>(null);

  // ═══ Injeção da LUPA na FAIXA 1 · antes do OperadorTag CAIO REGISTER ═══
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function montarLupa() {
      if (!root) return;
      // já injetada?
      if (root.querySelector(".pwd-final-lupa")) return;

      // localiza o botão CONFIGURAÇÕES pra subir até o container da direita da faixa 1
      const btnConfig = root.querySelector(".pwd-btn-config");
      if (!btnConfig) return;
      const containerDireita = btnConfig.parentElement;
      if (!containerDireita) return;
      // primeiro filho do container direita = OperadorTag (CAIO)
      const operador = containerDireita.firstElementChild;
      if (!operador) return;

      const lupa = document.createElement("button");
      lupa.className = "pwd-final-lupa";
      lupa.title = "Buscar menus, quadros, pacientes, regras... (Cmd+K)";
      lupa.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="pwd-final-lupa-txt">buscar</span>
        <span class="pwd-final-lupa-kbd">⌘K</span>
      `;
      containerDireita.insertBefore(lupa, operador);
    }

    // tenta logo + retry curto pra cobrir render assíncrono
    montarLupa();
    const t1 = setTimeout(montarLupa, 100);
    const t2 = setTimeout(montarLupa, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      ref={rootRef}
      className="tema-final-pawards"
      style={{
        position: "relative",
        // PENUMBRA++ · contraste +1 ponto (CEO 27/mai · "tá meio apagado ainda")
        filter: "brightness(0.99) saturate(0.97) contrast(1.16)",
      }}
    >
      <style>{`
        /* ═══════════════ K1 · PULSO ÚNICO ═══════════════ */
        .tema-final-pawards *,
        .tema-final-pawards *::before,
        .tema-final-pawards *::after { animation: none !important; }
        .tema-final-pawards .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.03), 0 0 4px currentColor !important;
        }

        /* ═══════════════ K2 · 3 NÍVEIS DE ATENÇÃO ═══════════════ */
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="rgb(255, 154, 154)"]),
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="#FF9A9A"]) {
          border-width: 2px !important;
          box-shadow: inset 0 0 8px rgba(255,154,154,0.08), 0 0 8px rgba(255,154,154,0.55) !important;
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
        }
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="rgb(245, 201, 122)"]),
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="#F5C97A"]) {
          border-width: 1px !important;
          box-shadow: none !important;
        }
        .tema-final-pawards .pwd-bloco:nth-of-type(n+3) { opacity: 0.90; }

        /* ═══════════════ K3 · FRESHNESS BADGES ═══════════════ */
        .tema-final-pawards .pwd-bloco { position: relative; }
        .tema-final-pawards .pwd-bloco:nth-of-type(1)::before { content: "atualiz. 11:14 · agora";       color: #5FE6CC; }
        .tema-final-pawards .pwd-bloco:nth-of-type(2)::before { content: "atualiz. 11:12 · há 2min";     color: #5FE6CC; }
        .tema-final-pawards .pwd-bloco:nth-of-type(3)::before { content: "atualiz. 10:47 · há 27min";    color: #D2D7DF; }
        .tema-final-pawards .pwd-bloco:nth-of-type(4)::before { content: "atualiz. 09:30 · há 1h 44min"; color: #D2D7DF; }
        .tema-final-pawards .pwd-bloco::before {
          position: absolute;
          top: 14px; right: 132px;
          font: 10px/1 "JetBrains Mono", ui-monospace, monospace;
          letter-spacing: 0.14em;
          padding: 4px 8px;
          border: 1px solid currentColor;
          opacity: 0.95;
          z-index: 3;
          pointer-events: none;
        }

        /* ═══════════════ CONTRASTE TEXTO · Penumbra++ ═══════════════ */
        .tema-final-pawards .pwd-menu-item p.ink,
        .tema-final-pawards .pwd-menu-item [style*="opacity: 0.75"],
        .tema-final-pawards .pwd-menu-item [style*="opacity:0.75"] { opacity: 1 !important; color: #ECEFF4 !important; }
        .tema-final-pawards [style*="color: rgb(157, 163, 174)"],
        .tema-final-pawards [style*="color: #9DA3AE"] { color: #DCE1E9 !important; }
        .tema-final-pawards .pwd-crumb { color: #F4F6F9 !important; }
        .tema-final-pawards .pwd-menu-icone { text-shadow: none !important; }

        /* ═══════════════ HOVER NEON DISCRETO ═══════════════ */
        /* MENU LATERAL · cada item ganha halo neon na cor da própria identidade no hover */
        .tema-final-pawards .pwd-menu-item:not(.pwd-menu-item-ativo) {
          transition: box-shadow 160ms, background 160ms !important;
        }
        .tema-final-pawards .pwd-menu-item:not(.pwd-menu-item-ativo):hover {
          box-shadow: inset 0 0 6px rgba(255,255,255,0.04), 0 0 5px currentColor !important;
          background: rgba(255,255,255,0.02) !important;
        }
        /* LOCAL/GLOBAL · halo verde-água sutil quando hover, halo verde NEON quando "on" (já existe) */
        .tema-final-pawards .pwd-escopo {
          transition: box-shadow 160ms !important;
        }
        .tema-final-pawards .pwd-escopo:hover {
          box-shadow: 0 0 5px #5FE6CC !important;
        }
        /* 3 BOTÕEZINHOS visibilidade · quando o "3" estiver ativo (.pwd-vis-on com texto "3"),
           reforça halo na borda esquerda do contêiner pai (faixa de visibilidade) */
        .tema-final-pawards .pwd-vis {
          transition: box-shadow 160ms !important;
        }
        .tema-final-pawards .pwd-vis:hover:not(.pwd-vis-on) {
          box-shadow: inset 0 0 3px rgba(255,230,0,0.5) !important;
        }
        /* Quando NÍVEL 3 está ativo, reforça neon amarelo na borda esquerda do grupo de visibilidade */
        .tema-final-pawards .pwd-vis-on {
          box-shadow:
            inset 2px 0 0 0 #FFE600,
            0 0 6px rgba(255,230,0,0.6) !important;
        }

        /* ═══════════════ NAVEGAÇÃO REVERSA · breadcrumbs clicáveis ═══════════════ */
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"],
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"] {
          cursor: pointer !important;
          color: #DCE1E9 !important;
          transition: color 120ms, background 120ms, border-color 120ms !important;
          border-bottom: 1px dotted transparent !important;
        }
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]:hover,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]:hover {
          color: #5FE6CC !important;
          border-bottom: 1px dotted #5FE6CC !important;
          background: rgba(95,230,204,0.08) !important;
        }
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]::after,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]::after {
          content: " ◂ voltar";
          font-size: 8px; letter-spacing: 0.18em;
          color: #5FE6CC; opacity: 0;
          transition: opacity 120ms;
          margin-left: 6px; font-weight: 700;
        }
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]:hover::after,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]:hover::after { opacity: 1; }

        /* ═══════════════ LUPA · 4º retângulo da FAIXA 1 ═══════════════ */
        .tema-final-pawards .pwd-final-lupa {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 30px;
          padding: 0 12px 0 10px;
          margin-right: 6px;
          background: transparent;
          border: 1px solid #5FE6CC;
          color: #5FE6CC;
          font: 700 10px/1 "JetBrains Mono", ui-monospace, monospace;
          letter-spacing: 0.16em;
          cursor: pointer;
          border-radius: 0;
          transition: box-shadow 160ms, background 160ms;
          white-space: nowrap;
        }
        .tema-final-pawards .pwd-final-lupa:hover {
          background: rgba(95,230,204,0.08);
          box-shadow: 0 0 6px rgba(95,230,204,0.6);
        }
        .tema-final-pawards .pwd-final-lupa .pwd-final-lupa-txt {
          color: #DCE1E9;
          font-weight: 500;
        }
        .tema-final-pawards .pwd-final-lupa .pwd-final-lupa-kbd {
          color: #5FE6CC;
          border: 1px solid #5FE6CC;
          padding: 2px 5px;
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 700;
        }
      `}</style>

      <DashModelo1_Sanfona />
    </div>
  );
}
