import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * ════════════════════════════════════════════════════════════════════════
 * MODELO DEFINITIVO PAWARDS · APROVADO CEO 27/MAI/2026
 * ════════════════════════════════════════════════════════════════════════
 *
 * COMBINA:
 *  · BASE PENUMBRA+ · intermediário entre Brilho e Penumbra
 *    brightness 0.97 · saturate 0.96 · contrast 1.12 (visual sem cansar)
 *  · K1 PULSO ÚNICO · só item ativo do menu lateral respira (4.5s)
 *  · K2 3 NÍVEIS DE ATENÇÃO · AGORA (borda 2px+pulso) · HOJE (sólido) · INFORMA (opacity 0.85)
 *  · K3 FRESHNESS · timestamp 'atualiz. HH:MM' em cada header de bloco
 *  · NAVEGAÇÃO REVERSA · breadcrumbs com hint visual clicável (sublinhado no hover + tooltip)
 *  · LUPA GLOBAL · busca de menus/quadros sticky no canto superior direito (Cmd+K)
 *
 * Essas regras viram o SKILL pawards-cockpit-design depois da aprovação final.
 */
export function DashFinalPawards() {
  return (
    <div
      className="tema-final-pawards"
      style={{
        position: "relative",
        // PENUMBRA+ · mais brilho e contraste que a Penumbra original,
        // mas ainda contido versus o Neon. CEO 27/mai pediu "bem visual sem apagado"
        filter: "brightness(0.97) saturate(0.96) contrast(1.12)",
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
        /* N1 AGORA · cards CRÍTICO (coral #FF9A9A): borda 2px + respiração exclusiva */
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="rgb(255, 154, 154)"]),
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="#FF9A9A"]) {
          border-width: 2px !important;
          box-shadow: inset 0 0 8px rgba(255,154,154,0.08), 0 0 8px rgba(255,154,154,0.55) !important;
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
        }
        /* N2 HOJE · cards URGENTE (dourado #F5C97A): borda 1px sólida, sem extras */
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="rgb(245, 201, 122)"]),
        .tema-final-pawards .pwd-card-alerta:has(.pwd-tag[style*="#F5C97A"]) {
          border-width: 1px !important;
          box-shadow: none !important;
        }
        /* N3 INFORMA · blocos do 3º em diante recebem opacity calma */
        .tema-final-pawards .pwd-bloco:nth-of-type(n+3) { opacity: 0.88; }

        /* ═══════════════ K3 · FRESHNESS BADGES ═══════════════ */
        .tema-final-pawards .pwd-bloco { position: relative; }
        .tema-final-pawards .pwd-bloco:nth-of-type(1)::before {
          content: "atualiz. 11:14 · agora"; color: #5FE6CC;
        }
        .tema-final-pawards .pwd-bloco:nth-of-type(2)::before {
          content: "atualiz. 11:12 · há 2min"; color: #5FE6CC;
        }
        .tema-final-pawards .pwd-bloco:nth-of-type(3)::before {
          content: "atualiz. 10:47 · há 27min"; color: #BFC5CF;
        }
        .tema-final-pawards .pwd-bloco:nth-of-type(4)::before {
          content: "atualiz. 09:30 · há 1h 44min"; color: #BFC5CF;
        }
        .tema-final-pawards .pwd-bloco::before {
          position: absolute;
          top: 14px; right: 132px;
          font: 10px/1 "JetBrains Mono", ui-monospace, monospace;
          letter-spacing: 0.14em;
          padding: 4px 8px;
          border: 1px solid currentColor;
          opacity: 0.92;
          z-index: 3;
          pointer-events: none;
        }

        /* ═══════════════ CONTRASTE TEXTO (Penumbra+ · mais firme) ═══════════════ */
        .tema-final-pawards .pwd-menu-item p.ink,
        .tema-final-pawards .pwd-menu-item [style*="opacity: 0.75"],
        .tema-final-pawards .pwd-menu-item [style*="opacity:0.75"] { opacity: 0.96 !important; }
        .tema-final-pawards [style*="color: rgb(157, 163, 174)"],
        .tema-final-pawards [style*="color: #9DA3AE"] { color: #D2D7DF !important; }
        .tema-final-pawards .pwd-crumb { color: #F2F4F7 !important; }
        .tema-final-pawards .pwd-menu-icone { text-shadow: none !important; }

        /* ═══════════════ NAVEGAÇÃO REVERSA · breadcrumbs clicáveis ═══════════════ */
        /* Crumbs anteriores ao ativo: hint visual de "clique pra voltar pra cá" */
        .tema-final-pawards .pwd-crumb-on ~ * ,
        .tema-final-pawards [class*="pwd-crumb"]:not(.pwd-crumb-on) {
          /* não consigo selecionar facilmente — uso a estrutura abaixo via span genérico */
        }
        /* span genérico dentro da faixa de breadcrumb (PAWARDS, PÁDUA MATRIZ, DASHBOARD GLOBAL) */
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"],
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"] {
          cursor: pointer !important;
          color: #D2D7DF !important;
          transition: color 120ms, background 120ms, border-color 120ms !important;
          border-bottom: 1px dotted transparent !important;
        }
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]:hover,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]:hover {
          color: #5FE6CC !important;
          border-bottom: 1px dotted #5FE6CC !important;
          background: rgba(95,230,204,0.08) !important;
        }
        /* tooltip "voltar a X" no hover do crumb */
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]::after,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]::after {
          content: " ◂ voltar";
          font-size: 8px;
          letter-spacing: 0.18em;
          color: #5FE6CC;
          opacity: 0;
          transition: opacity 120ms;
          margin-left: 6px;
          font-weight: 700;
        }
        .tema-final-pawards span[style*="color: rgb(157, 163, 174)"][style*="letter-spacing"]:hover::after,
        .tema-final-pawards span[style*="color:#9DA3AE"][style*="letter-spacing"]:hover::after {
          opacity: 1;
        }
      `}</style>

      {/* ═══════════════ LUPA GLOBAL · sticky no canto superior direito ═══════════════ */}
      <div
        title="Buscar menus, quadros, pacientes, regras... (Cmd+K)"
        style={{
          position: "fixed",
          top: 12,
          right: 16,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#0A0E16",
          border: "1px solid #5FE6CC",
          boxShadow: "0 0 6px rgba(95,230,204,0.4)",
          padding: "7px 12px 7px 10px",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 11,
          color: "#5FE6CC",
          cursor: "pointer",
          letterSpacing: "0.14em",
          minWidth: 280,
          userSelect: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ flex: 1, color: "#D2D7DF" }}>buscar menus e quadros</span>
        <span style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "#5FE6CC",
          border: "1px solid #5FE6CC",
          padding: "2px 6px",
          fontWeight: 700,
        }}>⌘K</span>
      </div>

      <DashModelo1_Sanfona />
    </div>
  );
}
