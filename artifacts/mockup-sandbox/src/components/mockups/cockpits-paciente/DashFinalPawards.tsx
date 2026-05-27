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

    function marcarBreadcrumbsClicaveis() {
      if (!root) return;
      // FAIXA 2: encontra crumbs NÃO-ativos (são spans irmãos do .pwd-crumb-on dentro de um <span> wrapper)
      const crumbsAtivos = root.querySelectorAll(".pwd-crumb-on");
      crumbsAtivos.forEach((ativo) => {
        // sobe até o wrapper que contém os spans irmãos da faixa 2
        const linhaCrumbs = ativo.parentElement?.parentElement;
        if (!linhaCrumbs) return;
        // varre todos os wrappers de crumb (irmãos do que contém .pwd-crumb-on)
        linhaCrumbs.querySelectorAll(":scope > span").forEach((wrapper) => {
          // dentro do wrapper, encontra spans que NÃO são .pwd-crumb-on e NÃO são separadores ›
          wrapper.querySelectorAll(":scope > span").forEach((sp) => {
            if (sp.classList.contains("pwd-crumb-on")) return;
            const txt = (sp.textContent || "").trim();
            if (txt === "›" || txt.length < 2) return;
            sp.classList.add("pwd-final-crumb-clicavel");
          });
        });
      });
    }

    function aplicar() {
      montarLupa();
      marcarBreadcrumbsClicaveis();
    }

    // tenta logo + retry curto pra cobrir render assíncrono
    aplicar();
    const t1 = setTimeout(aplicar, 100);
    const t2 = setTimeout(aplicar, 400);
    const t3 = setTimeout(aplicar, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
        /* ═══════════════ K1 · PULSO ÚNICO ═══════════════
           Zera animação SÓ nos elementos que costumam pulsar fora do "âncora-vivo".
           NÃO toca em .pwd-menu-item / .pwd-menu-item:hover / .pwd-menu-item-ativo
           pra preservar a respiração nativa do _dashShell (linhas 285-310). */
        .tema-final-pawards .pwd-card-alerta,
        .tema-final-pawards .pwd-card-alerta *,
        .tema-final-pawards .pwd-tag,
        .tema-final-pawards .pwd-bloco-tag,
        .tema-final-pawards .pwd-status,
        .tema-final-pawards .pwd-badge,
        .tema-final-pawards .pwd-pulse,
        .tema-final-pawards .pwd-vis,
        .tema-final-pawards .pwd-escopo { animation: none !important; }
        /* MENU ATIVO já respira 2.8s via _dashShell · só forço quina 0px */
        .tema-final-pawards .pwd-menu-item-ativo { border-radius: 0 !important; }
        /* Nível 2 (só ícone sigla): respiração lenta 6.5s no ícone do ativo · quina 90° */
        .tema-final-pawards .pwd-menu-item-ativo .pwd-menu-icone {
          animation: pwd-breathe-cor 6.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 0 1px currentColor, 0 0 3px currentColor !important;
          border-radius: 0 !important;
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
        .tema-final-pawards [style*="color: #9DA3AE"] { color: #F2F4F7 !important; }
        .tema-final-pawards .pwd-crumb { color: #F4F6F9 !important; }
        .tema-final-pawards .pwd-menu-icone { text-shadow: none !important; }
        /* LABELS DOS KPIs (SESSÕES HOJE, RECEITA DIA, ADERÊNCIA MÉD., FILA OPERAC.,
           MOTOR V4, FALTAS) · CEO 27/mai: "branco muito ruim, não consigo ler".
           Os KPIs reais usam classe .pwd-kpi (NÃO .pwd-bloco). Todo span/div
           interno do .pwd-kpi recebe contraste alto e opacity 1. */
        .tema-final-pawards .pwd-kpi * {
          opacity: 1 !important;
        }
        .tema-final-pawards .pwd-kpi [style*="opacity"] {
          opacity: 1 !important;
        }
        /* Forço TODOS os textos dentro do KPI a usarem branco firme.
           Label (8-10px), valor (20px) e sub-info (9px) ganham contraste alto. */
        .tema-final-pawards .pwd-kpi [style*="color: rgb(107"], /* inkMute */
        .tema-final-pawards .pwd-kpi [style*="color: rgb(159"], /* inkDim variante */
        .tema-final-pawards .pwd-kpi [style*="color: rgb(157"],
        .tema-final-pawards .pwd-kpi [style*="color:#6B7388"],
        .tema-final-pawards .pwd-kpi [style*="color: #6B7388"],
        .tema-final-pawards .pwd-kpi [style*="color:#9FB0C9"],
        .tema-final-pawards .pwd-kpi [style*="color: #9FB0C9"],
        .tema-final-pawards .pwd-kpi [style*="color:#9DA3AE"],
        .tema-final-pawards .pwd-kpi [style*="color: #9DA3AE"] {
          color: #F4F6F9 !important;
        }

        /* ═══════════════ FAIXAS 2 e 3 · MESMA INTENSIDADE · altura letra +2% ═══════════════ */
        /* faixa 2 (breadcrumbs PAWARDS · PÁDUA MATRIZ · DASHBOARD GLOBAL · MODELO 1)
           e faixa 3 (UNIDADE EM OPERAÇÃO · PÁDUA MATRIZ · DASHBOARD GLOBAL)
           devem ter a MESMA cor de texto e MESMO line-height */
        .tema-final-pawards span[style*="letter-spacing"][style*="font-size: 11"],
        .tema-final-pawards span[style*="letter-spacing"][style*="font-size:11"] {
          color: #F4F6F9 !important;
          line-height: 1.24 !important;
        }
        /* faixa 3 "UNIDADE EM OPERAÇÃO" · "PÁDUA MATRIZ · DASHBOARD GLOBAL" ganham
           mesma altura e cor que a faixa 2 */
        .tema-final-pawards div[style*="line-height: 1.2"][style*="white-space: nowrap"],
        .tema-final-pawards div[style*="line-height:1.2"][style*="white-space:nowrap"] {
          line-height: 1.24 !important;
          color: #F4F6F9 !important;
        }

        /* ═══════════════ HOVER NEON · MENU LATERAL ═══════════════
           CEO 27/mai: "luz não deve dar a volta na quina, deve sair POR TRÁS do botão".
           Solução Safari-safe: pseudo ::before com z-index 0 (não -1, que falha em
           combinação com filter no ancestor .tema-final-pawards), pai com isolation
           isolate cria stacking context próprio, filhos sobem pra z-index 1+.
           Background = cor de identidade + blur — vaza pelos 4 lados respeitando
           o retângulo 90°, sem halo circular. */
        /* CEO 27/mai #2: a luz NÃO PODE invadir o interior do botão.
           Solução definitiva: box-shadow externo (spread + blur). Por definição
           box-shadow sem inset projeta SÓ pra fora do retângulo, respeitando
           a quina 90° e nunca vazando pro interior. O botão recebe background
           navyPanel sólido pra blindar o miolo. */
        .tema-final-pawards .pwd-menu-item:not(.pwd-menu-item-ativo) {
          position: relative !important;
          background: #0A1628 !important;
          transition: box-shadow 200ms ease-out !important;
        }
        .tema-final-pawards .pwd-menu-aside {
          overflow: visible !important;
        }
        .tema-final-pawards .pwd-menu-item:not(.pwd-menu-item-ativo):hover {
          animation: pwd-final-hover-pulso 2.0s ease-in-out infinite !important;
          border-left: 3px solid currentColor !important;
        }
        /* RESPIRAÇÃO · pulso de texto + box-shadow externo (luz POR FORA do botão) */
        @keyframes pwd-final-hover-pulso {
          0%, 100% {
            text-shadow: 0 0 2px currentColor;
            filter: brightness(0.95);
            box-shadow:
              0 0 6px 0 currentColor,
              0 0 2px 0 currentColor;
          }
          50% {
            text-shadow: 0 0 12px currentColor, 0 0 4px currentColor;
            filter: brightness(1.35);
            box-shadow:
              0 0 28px 4px currentColor,
              0 0 12px 2px currentColor;
          }
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

        /* ═══════════════ NAVEGAÇÃO REVERSA · breadcrumbs clicáveis (faixa 2) ═══════════════
           Classe injetada via useEffect (.pwd-final-crumb-clicavel) — seletores por
           atributo style não funcionam mais porque a cor agora vem da variável p.inkDim */
        .tema-final-pawards .pwd-final-crumb-clicavel {
          cursor: pointer !important;
          color: #F4F6F9 !important;
          transition: color 120ms, background 120ms, border-color 120ms, box-shadow 160ms !important;
          border: 1px solid transparent !important;
          border-radius: 0 !important;
          padding: 3px 8px !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        .tema-final-pawards .pwd-final-crumb-clicavel:hover {
          color: #5FE6CC !important;
          border-color: #5FE6CC !important;
          background: rgba(95,230,204,0.10) !important;
          box-shadow: 0 0 6px rgba(95,230,204,0.55) !important;
        }
        .tema-final-pawards .pwd-final-crumb-clicavel::after {
          content: " ◂ voltar";
          font-size: 8px; letter-spacing: 0.18em;
          color: #5FE6CC; opacity: 0;
          transition: opacity 120ms;
          margin-left: 6px; font-weight: 700;
        }
        .tema-final-pawards .pwd-final-crumb-clicavel:hover::after { opacity: 1; }

        /* ═══════════════ LUPA · 4º retângulo da FAIXA 1 · maior horizontal · borda 2px ═══════════════ */
        .tema-final-pawards .pwd-final-lupa {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 30px;
          padding: 0 16px 0 14px;
          margin-right: 6px;
          min-width: 160px;
          background: transparent;
          border: 2px solid #5FE6CC;
          color: #5FE6CC;
          font: 700 10px/1.24 "JetBrains Mono", ui-monospace, monospace;
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
