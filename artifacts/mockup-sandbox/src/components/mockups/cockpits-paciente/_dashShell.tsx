import { useState, type ReactNode } from "react";
import { CockpitShell, p, pasteis, ls, fonte } from "./_pecasCockpit";

type NivelMenu = 1 | 2 | 3;

/**
 * SHELL COMPARTILHADO dos 5 DASHBOARD MODELOS
 *
 * Contém:
 *  · Faixa superior APROVADA (LOCAL/GLOBAL + breadcrumb + operador + CONFIG/SAIR)
 *  · Header da clínica com nav APROVADA (8 botões, MS-DOS hover)
 *  · ESTILOS globais aprovados + animação `pwd-breathe` (respiração no hover)
 *
 * Cada modelo só preenche o "miolo" (children) com seu próprio padrão de blocos.
 */

export const VERDE_DOS    = "#33FF66";
export const AZUL_GLB     = "#5BB6FF";
export const AMARELO_NEON = "#FFE600";
export const ROSA_NEON    = "#FF4FCF";
export const VERM_NEON    = "#FF3344";
export const AZUL_NEON    = "#33B6FF";

const ESTILOS = `
  @keyframes pwd-breathe {
    0%, 100% {
      box-shadow:
        inset 0 0 10px rgba(51,255,102,0.22),
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 0 12px rgba(51,255,102,0.42),
        0 0 20px rgba(51,255,102,0.18);
      filter: brightness(0.95);
    }
    50% {
      box-shadow:
        inset 0 0 18px rgba(51,255,102,0.40),
        inset 0 1px 0 rgba(255,255,255,0.14),
        0 0 26px rgba(51,255,102,0.85),
        0 0 44px rgba(51,255,102,0.45);
      filter: brightness(1.20);
    }
  }
  @keyframes pwd-breathe-red {
    0%, 100% {
      box-shadow: inset 0 0 10px rgba(255,154,154,0.22), 0 0 12px rgba(255,154,154,0.42);
      filter: brightness(0.95);
    }
    50% {
      box-shadow: inset 0 0 18px rgba(255,154,154,0.40), 0 0 26px rgba(255,154,154,0.85), 0 0 44px rgba(255,154,154,0.45);
      filter: brightness(1.20);
    }
  }
  /* PULSO UNIFICADO · usa currentColor → mesmo BPM (2.8s) pra todos os ativos */
  @keyframes pwd-breathe-cor {
    0%, 100% {
      box-shadow:
        inset 0 0 10px currentColor,
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 0 12px currentColor,
        0 0 20px currentColor;
      filter: brightness(0.95);
    }
    50% {
      box-shadow:
        inset 0 0 18px currentColor,
        inset 0 1px 0 rgba(255,255,255,0.14),
        0 0 26px currentColor,
        0 0 44px currentColor;
      filter: brightness(1.20);
    }
  }
  @keyframes pwd-pulse-glow {
    0%, 100% { box-shadow: 0 0 6px currentColor, 0 0 12px currentColor; filter: brightness(1); }
    50%      { box-shadow: 0 0 14px currentColor, 0 0 28px currentColor; filter: brightness(1.3); }
  }

  /* ===== BOTÃO PADRÃO ===== */
  .pwd-btn {
    position: relative;
    background: linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%);
    color: ${p.inkDim};
    border: 1px solid ${p.border};
    padding: 9px 16px;
    font-family: ${fonte.familia};
    font-size: 11px;
    letter-spacing: 0.10em;
    font-weight: 700;
    cursor: pointer;
    transition: color 120ms, border-color 120ms, background 120ms, transform 120ms;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      inset 0 -1px 0 rgba(0,0,0,0.45),
      0 2px 0 rgba(0,0,0,0.6),
      0 3px 6px rgba(0,0,0,0.4);
    text-transform: uppercase;
  }
  /* HOVER do botão → assume COR DE IDENTIDADE via CSS var --ident · BPM unificado 2.8s */
  .pwd-btn:hover {
    color: var(--ident, ${VERDE_DOS});
    border-color: var(--ident, ${VERDE_DOS});
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    transform: translateY(-1px);
    text-shadow: 0 0 8px var(--ident, ${VERDE_DOS});
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  .pwd-btn:active { transform: translateY(1px); animation: none; }

  /* NAV ATIVO (header navs) → assume COR DE IDENTIDADE inline (currentColor), respirando */
  .pwd-btn-ativo {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    border-color: currentColor;
    text-shadow: 0 0 8px currentColor;
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  .pwd-btn-ativo:hover {
    border-color: currentColor;
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }

  /* SAIR · VERMELHO neon ACESO (sem respirar) */
  .pwd-btn-danger {
    color: ${VERM_NEON};
    border-color: ${VERM_NEON};
    background: linear-gradient(180deg, rgba(255,51,68,0.18) 0%, rgba(255,51,68,0.06) 100%);
    text-shadow: 0 0 8px rgba(255,51,68,0.7);
    box-shadow:
      inset 0 0 10px rgba(255,51,68,0.30),
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 0 14px rgba(255,51,68,0.55),
      0 0 24px rgba(255,51,68,0.25);
    animation: none;
  }
  .pwd-btn-danger:hover {
    color: #FFB8B8; border-color: #FF7070;
    background: linear-gradient(180deg, rgba(255,154,154,0.22) 0%, rgba(255,154,154,0.10) 100%);
    text-shadow: 0 0 8px rgba(255,154,154,0.7);
    animation: pwd-breathe-red 1.6s ease-in-out infinite;
  }

  .pwd-escopo {
    padding: 5px 13px;
    font-family: ${fonte.familia}; font-size: 10px; letter-spacing: 0.12em; font-weight: 700;
    cursor: pointer; transition: all 120ms ease-out; text-transform: uppercase;
    border: 1px solid; background: ${p.navyPanel};
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.5);
  }
  .pwd-escopo-local-on {
    color: ${VERDE_DOS}; border-color: ${VERDE_DOS};
    background: linear-gradient(180deg, rgba(51,255,102,0.18) 0%, rgba(51,255,102,0.06) 100%);
    box-shadow: inset 0 0 10px rgba(51,255,102,0.25), 0 0 12px rgba(51,255,102,0.45);
    text-shadow: 0 0 6px rgba(51,255,102,0.55);
    animation: pwd-breathe 2.8s ease-in-out infinite;
  }
  .pwd-escopo-global-off { color: ${AZUL_GLB}99; border-color: ${AZUL_GLB}44; }
  .pwd-escopo-global-off:hover {
    color: ${AZUL_GLB}; border-color: ${AZUL_GLB};
    background: linear-gradient(180deg, rgba(91,182,255,0.16) 0%, rgba(91,182,255,0.05) 100%);
    box-shadow: inset 0 0 10px rgba(91,182,255,0.22), 0 0 14px rgba(91,182,255,0.45);
    text-shadow: 0 0 6px rgba(91,182,255,0.55);
  }

  .pwd-kpi {
    background: linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      inset 0 -1px 0 rgba(0,0,0,0.4),
      0 2px 0 rgba(0,0,0,0.5),
      0 4px 10px rgba(0,0,0,0.35);
    transition: transform 120ms ease-out, box-shadow 120ms ease-out;
    cursor: pointer;
  }
  .pwd-kpi:hover {
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.10),
      0 4px 0 rgba(0,0,0,0.5),
      0 6px 18px rgba(0,0,0,0.5),
      0 0 14px rgba(51,255,102,0.20);
    border-color: ${VERDE_DOS}66 !important;
  }

  /* ===== ÍCONE OLHO · toggle detalhes (SESSÃO INICIADA + UNI/data) ===== */
  .pwd-olho {
    background: ${p.navyPanel};
    border: 1px solid ${p.borderSoft};
    color: ${p.inkMute};
    width: 26px; height: 22px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 120ms ease-out;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.5);
    padding: 0;
    flex-shrink: 0;
  }
  .pwd-olho:hover {
    color: ${VERDE_DOS}; border-color: ${VERDE_DOS};
    box-shadow: inset 0 0 6px rgba(51,255,102,0.3), 0 0 8px rgba(51,255,102,0.5);
  }

  /* ===== BOTÕEZINHOS DE VISIBILIDADE DO MENU LATERAL ===== */
  .pwd-vis {
    width: 22px; height: 20px;
    background: ${p.navyPanel};
    border: 1px solid ${p.borderSoft};
    color: ${p.inkMute};
    font-family: ${fonte.familia};
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 120ms ease-out;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.5);
    display: inline-flex; align-items: center; justify-content: center;
  }
  .pwd-vis:hover {
    color: ${VERDE_DOS}; border-color: ${VERDE_DOS};
    text-shadow: 0 0 6px rgba(51,255,102,0.7);
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  /* VIS [1][2][3] ATIVO · AMARELO NEON respirando (mesmo pulso 2.8s) */
  .pwd-vis-on {
    color: ${AMARELO_NEON};
    background: linear-gradient(180deg, rgba(255,230,0,0.22) 0%, rgba(255,230,0,0.06) 100%);
    border-color: ${AMARELO_NEON};
    text-shadow: 0 0 6px rgba(255,230,0,0.85);
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  .pwd-vis-on:hover { color: ${AMARELO_NEON}; border-color: ${AMARELO_NEON}; }

  /* ===== MENU LATERAL · 3 níveis de visibilidade ===== */
  .pwd-menu-aside {
    background: linear-gradient(180deg, ${p.navyDeep} 0%, #050810 100%);
    border-right: 1px solid ${p.border};
    box-shadow: inset -1px 0 0 rgba(255,255,255,0.03), 4px 0 12px rgba(0,0,0,0.4);
    padding: 10px 0;
    display: flex; flex-direction: column; gap: 4px;
    overflow: hidden;
    font-family: ${fonte.familia};
  }
  .pwd-menu-item {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px;
    color: ${p.inkDim};
    cursor: pointer;
    transition: all 120ms ease-out;
    border-left: 3px solid transparent;
  }
  /* HOVER menu lateral → assume COR DE IDENTIDADE via --ident · BPM 2.8s */
  .pwd-menu-item:hover {
    color: var(--ident, ${VERDE_DOS});
    background: linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%);
    border-left-color: var(--ident, ${VERDE_DOS});
    text-shadow: 0 0 6px var(--ident, ${VERDE_DOS});
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  /* MENU ATIVO → assume COR DE IDENTIDADE (currentColor inline) + respiração unificada 2.8s */
  .pwd-menu-item-ativo {
    background: linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%);
    border-left-color: currentColor;
    text-shadow: 0 0 8px currentColor;
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  .pwd-menu-item-ativo:hover {
    border-left-color: currentColor; text-shadow: 0 0 8px currentColor;
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
  }
  .pwd-menu-icone {
    flex-shrink: 0;
    width: 34px; height: 34px;
    border: 1px solid currentColor;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; letter-spacing: 0.10em;
    background: rgba(0,0,0,0.3);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 6px currentColor;
  }
  .pwd-menu-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; white-space: nowrap;
  }
  .pwd-menu-sub {
    font-size: 9px; color: ${p.inkMute}; letter-spacing: 0.12em;
    margin-top: 2px; white-space: nowrap;
  }

  /* ===== OPERADOR · retângulo dentro de retângulo (tsunami v4) ===== */
  .pwd-op-externo:hover {
    border-color: ${VERDE_DOS} !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 2px 0 rgba(0,0,0,0.5),
      0 0 16px rgba(51,255,102,0.5),
      0 0 32px rgba(51,255,102,0.22) !important;
    transform: translateY(-1px);
  }
  .pwd-op-externo:hover > div:first-child {
    border-color: ${VERDE_DOS};
    box-shadow: inset 0 0 10px rgba(51,255,102,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .pwd-op-externo:hover > div:first-child > div:first-child {
    color: ${VERDE_DOS};
    text-shadow: 0 0 8px rgba(51,255,102,0.7);
  }

  /* CRUMB ATIVO (MODELO 1 · SANFONA) · AMARELO NEON respirando (mesmo pulso 2.8s) */
  .pwd-crumb-on {
    padding: 4px 11px;
    border: 1px solid;
    background: rgba(255,230,0,0.06);
    text-shadow: 0 0 6px currentColor;
    animation: pwd-breathe-cor 2.8s ease-in-out infinite;
    cursor: pointer;
    transition: color 120ms, border-color 120ms;
  }
  /* HOVER do crumb ativo → CIANO neon (cor exclusiva da linha 2 · BPM 2.8s) */
  .pwd-crumb-on:hover {
    color: #5FE6CC !important;
    border-color: #5FE6CC !important;
    text-shadow: 0 0 6px #5FE6CC;
  }

  /* CONFIGURAÇÕES · ROSA neon ACESO (sem respirar) */
  .pwd-btn-config {
    color: ${ROSA_NEON};
    border-color: ${ROSA_NEON};
    background: linear-gradient(180deg, rgba(255,79,207,0.18) 0%, rgba(255,79,207,0.06) 100%);
    text-shadow: 0 0 8px rgba(255,79,207,0.7);
    box-shadow:
      inset 0 0 10px rgba(255,79,207,0.30),
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 0 14px rgba(255,79,207,0.55),
      0 0 24px rgba(255,79,207,0.25);
    animation: none;
  }
  .pwd-btn-config:hover {
    color: #FFB8E8; border-color: ${ROSA_NEON}; animation: none;
    background: linear-gradient(180deg, rgba(255,79,207,0.26) 0%, rgba(255,79,207,0.10) 100%);
  }

  /* OPERADOR · AZUL neon ACESO (sem respirar) — sobrescreve dourado */
  .pwd-op-externo.pwd-op-azul {
    border-color: ${AZUL_NEON} !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 2px 0 rgba(0,0,0,0.5),
      0 0 14px rgba(51,182,255,0.55),
      0 0 24px rgba(51,182,255,0.25) !important;
  }
  .pwd-op-externo.pwd-op-azul > div:first-child {
    border-color: ${AZUL_NEON} !important;
    box-shadow: inset 0 0 8px rgba(51,182,255,0.35), inset 0 1px 0 rgba(255,255,255,0.05) !important;
  }
  .pwd-op-externo.pwd-op-azul > div:first-child > span {
    color: ${AZUL_NEON} !important;
    text-shadow: 0 0 8px rgba(51,182,255,0.7) !important;
  }
  .pwd-op-externo.pwd-op-azul:hover {
    border-color: ${VERDE_DOS} !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 0 16px rgba(51,255,102,0.5),
      0 0 28px rgba(51,255,102,0.22) !important;
  }
  .pwd-op-externo.pwd-op-azul:hover > div:first-child {
    border-color: ${VERDE_DOS} !important;
    box-shadow: inset 0 0 10px rgba(51,255,102,0.35) !important;
  }
  .pwd-op-externo.pwd-op-azul:hover > div:first-child > span {
    color: ${VERDE_DOS} !important;
    text-shadow: 0 0 8px rgba(51,255,102,0.7) !important;
  }

  /* ===== CHIP / TAG colorida (usado em colunas) ===== */
  .pwd-tag {
    display: inline-block; padding: 3px 9px;
    border: 1px solid; font-size: 10px; letter-spacing: 0.12em;
    font-family: ${fonte.familia}; font-weight: 700; text-transform: uppercase;
    box-shadow: inset 0 0 4px currentColor, 0 0 6px currentColor;
  }

  /* ===== CARTÃO ALERTA (estilo Trello/kanban) ===== */
  .pwd-card-alerta {
    background: linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%);
    border: 1px solid ${p.border};
    border-left: 4px solid currentColor;
    padding: 12px 14px;
    cursor: pointer;
    transition: all 120ms ease-out;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 2px 6px rgba(0,0,0,0.4);
    margin-bottom: 8px;
  }
  .pwd-card-alerta:hover {
    transform: translateX(2px);
    border-color: currentColor;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.10),
      0 0 14px currentColor,
      0 4px 10px rgba(0,0,0,0.5);
    filter: brightness(1.1);
  }

  /* ===== BOLHA (modelo 4) ===== */
  .pwd-bolha {
    aspect-ratio: 1.4 / 1;
    background: radial-gradient(circle at 30% 25%, ${p.navyPanel} 0%, ${p.navyDeep} 80%);
    border: 1px solid currentColor;
    padding: 16px;
    cursor: pointer;
    transition: all 150ms ease-out;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      inset 0 -2px 0 rgba(0,0,0,0.5),
      0 4px 12px rgba(0,0,0,0.5),
      0 0 8px currentColor;
  }
  .pwd-bolha:hover {
    transform: scale(1.03);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.14),
      0 6px 18px rgba(0,0,0,0.6),
      0 0 22px currentColor,
      0 0 40px currentColor;
    animation: pwd-pulse-glow 1.4s ease-in-out infinite;
  }
`;

export function DashShell({ children, modeloNome }: { children: ReactNode; modeloNome: string }) {
  const [nivelMenu, setNivelMenu] = useState<NivelMenu>(3);
  const [paginaAtiva, setPaginaAtiva] = useState<string>("DASHBOARD");
  // SUBTÍTULOS visíveis quando VIS=1 (menu lateral colapsado → sobra espaço pros detalhes)
  const mostrarDetalhes = nivelMenu === 1;
  const colWidth = nivelMenu === 1 ? "0" : nivelMenu === 2 ? "58px" : "220px";
  return (
    <CockpitShell>
      <style>{ESTILOS}</style>
      <BarraBreadcrumb
        modeloNome={modeloNome}
        nivelMenu={nivelMenu} setNivelMenu={setNivelMenu}
        mostrarDetalhes={mostrarDetalhes}
      />
      <HeaderClinica
        paginaAtiva={paginaAtiva} setPaginaAtiva={setPaginaAtiva}
        mostrarDetalhes={mostrarDetalhes}
      />
      <div style={{
        display: "grid",
        gridTemplateColumns: `${colWidth} 1fr`,
        transition: "grid-template-columns 240ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        <MenuLateral nivel={nivelMenu} paginaAtiva={paginaAtiva} setPaginaAtiva={setPaginaAtiva} />
        <main style={{ minWidth: 0, width: "100%" }}>{children}</main>
      </div>
    </CockpitShell>
  );
}

/** Ícone de olho SVG (aberto = mostrando · fechado = ocultando) */
function OlhoIcone({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pwd-olho" title={aberto ? "Ocultar detalhes" : "Mostrar detalhes"}>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
        {aberto ? (
          <>
            <path d="M1 5.5 C 3 1.5, 13 1.5, 15 5.5 C 13 9.5, 3 9.5, 1 5.5 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="8" cy="5.5" r="2.2" fill="currentColor" />
          </>
        ) : (
          <>
            <path d="M1 7 C 3 4, 13 4, 15 7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M3 4 L 4.5 5.5 M 13 4 L 11.5 5.5 M 8 5 L 8 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}

function BarraBreadcrumb({ modeloNome, nivelMenu, setNivelMenu, mostrarDetalhes }: { modeloNome: string; nivelMenu: NivelMenu; setNivelMenu: (n: NivelMenu) => void; mostrarDetalhes: boolean }) {
  const crumbs = [
    { lab: "PAWARDS",          cor: p.gold,             ativo: false },
    { lab: "PÁDUA MATRIZ",     cor: p.cyan,             ativo: false },
    { lab: "DASHBOARD GLOBAL", cor: pasteis.admin.neon, ativo: false },
    { lab: modeloNome,         cor: AMARELO_NEON,       ativo: true  },
  ];
  return (
    <div style={{
      background: "#06090F",
      borderBottom: `2px solid ${p.gold}55`,
      padding: "10px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      fontFamily: fonte.familia,
      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* CLUSTER ESCOPO + VIS · largura fixa pra garantir alinhamento perfeito */}
        <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <button className="pwd-escopo pwd-escopo-local-on" style={{ width: "100%" }}>LOCAL</button>
            <button className="pwd-escopo pwd-escopo-global-off" style={{ width: "100%", marginLeft: -1 }}>GLOBAL</button>
          </div>
          {/* 3 BOTÕEZINHOS · NÍVEL DE VISIBILIDADE · alinhados c/ LOCAL/GLOBAL acima */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {([1, 2, 3] as NivelMenu[]).map(n => (
              <button
                key={n}
                onClick={() => setNivelMenu(n)}
                className={`pwd-vis ${nivelMenu === n ? "pwd-vis-on" : ""}`}
                style={{ width: "100%", marginLeft: n > 1 ? -1 : 0 }}
                title={n === 1 ? "Sem menu lateral (subtítulos visíveis)" : n === 2 ? "Só ícones quadrados" : "Menu completo"}
              >{n}</button>
            ))}
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: p.border, margin: "0 4px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {crumbs.map((c, i) => (
              <span key={c.lab} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {c.ativo
                  ? <span className="pwd-crumb-on" style={{ color: c.cor, borderColor: c.cor, fontSize: 11, letterSpacing: ls.forte, fontWeight: 700 }}>{c.lab}</span>
                  : <span style={{ color: p.inkDim, fontSize: 11, letterSpacing: ls.forte, fontWeight: 500, padding: "4px 4px" }}>{c.lab}</span>}
                {i < crumbs.length - 1 && <span style={{ color: p.inkMute, fontSize: 11 }}>›</span>}
              </span>
            ))}
          </div>
          {mostrarDetalhes && (
            <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, paddingLeft: 4 }}>
              SESSÃO INICIADA 08:42 · ATIVA 2H 32MIN · ÚLT. AÇÃO 11:11 · REGISTRO SESSÃO S03
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <OperadorTag nome="CAIO REGISTER" cargo="MÉDICO" extra="CEO · DR. · CRM-SP 142.308" />
        <button className="pwd-btn pwd-btn-config" style={{ fontSize: 10, padding: 0, height: 34, minWidth: 110 }}>CONFIGURAÇÕES</button>
        <button className="pwd-btn pwd-btn-danger" style={{ fontSize: 10, padding: 0, height: 34, minWidth: 64 }}>SAIR</button>
      </div>
    </div>
  );
}

/**
 * MENU LATERAL · 3 níveis de visibilidade
 *  · Nível 1 → não renderiza (column collapsada via grid)
 *  · Nível 2 → só ícone quadradinho colorido (58px)
 *  · Nível 3 → ícone + label + faixa de pertencimento lateral (220px)
 */
/**
 * ITENS_MENU · fonte ÚNICA da verdade pro menu lateral E pra nav horizontal do header.
 * Ambos consomem essa lista — garante correspondência 1:1.
 */
const ITENS_MENU: Array<{ sigla: string; label: string; sub: string; cor: string }> = [
  { sigla: "DSH", label: "DASHBOARD",   sub: "operação hoje",     cor: "#F5C97A" },
  { sigla: "PAC", label: "PACIENTES",   sub: "87 ativos",         cor: "#5BB6FF" },
  { sigla: "AGD", label: "AGENDA",      sub: "5 hoje · 11:14",    cor: "#5FE6CC" },
  { sigla: "PRX", label: "PRESCRIÇÃO",  sub: "6 rascunho",        cor: "#B5A0F0" },
  { sigla: "FAT", label: "FATURAMENTO", sub: "R$ 41.8K dia",      cor: "#85E0A3" },
  { sigla: "MOT", label: "MOTOR V4",    sub: "142 regras hoje",   cor: "#FFA3C8" },
  { sigla: "EQP", label: "EQUIPE",      sub: "4 ativos",          cor: "#C8B6FF" },
  { sigla: "AUD", label: "AUDITORIA",   sub: "23 eventos 7d",     cor: "#FF9A9A" },
];

function MenuLateral({ nivel, paginaAtiva, setPaginaAtiva }: { nivel: NivelMenu; paginaAtiva: string; setPaginaAtiva: (s: string) => void }) {
  if (nivel === 1) return null;
  const compacto = nivel === 2;
  return (
    <aside className="pwd-menu-aside" style={{ padding: compacto ? "10px 6px" : "12px 0" }}>
      {ITENS_MENU.map(it => {
        const ativo = paginaAtiva === it.label;
        return (
          <div
            key={it.sigla}
            onClick={() => setPaginaAtiva(it.label)}
            className={`pwd-menu-item ${ativo ? "pwd-menu-item-ativo" : ""}`}
            style={{
              justifyContent: compacto ? "center" : "flex-start",
              padding: compacto ? "8px 0" : "9px 10px",
              borderLeft: compacto ? "none" : (ativo ? `3px solid ${it.cor}` : "3px solid transparent"),
              color: ativo ? it.cor : p.inkDim,
              ["--ident" as never]: it.cor,
            }}
            title={`${it.label} · ${it.sub}`}
          >
            <span className="pwd-menu-icone" style={{ color: it.cor }}>{it.sigla}</span>
            {!compacto && (
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span className="pwd-menu-label">{it.label}</span>
                <span className="pwd-menu-sub" style={{ color: ativo ? `${it.cor}cc` : p.inkMute }}>{it.sub}</span>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

/**
 * OPERADOR · padrão "retângulo dentro de retângulo" (PADRÃO TSUNAMI v4)
 *
 * Layout (do print do CEO):
 *  ┌─ EXTERNO (navy panel + borda dourada) ──────────────┐
 *  │ ┌─ INTERNO (navy deep + borda dourada glow) ─┐      │
 *  │ │  DR. CAIO REGISTER                          │  MÉDICO
 *  │ └─────────────────────────────────────────────┘      │
 *  │  CEO · CRM-SP 142.308                                │
 *  └──────────────────────────────────────────────────────┘
 */
export function OperadorTag({ nome, cargo, extra }: { nome: string; cargo: string; extra?: string }) {
  return (
    <div
      className="pwd-op-externo pwd-op-azul"
      title={extra}
      style={{
        height: 34, boxSizing: "border-box",
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "0 12px 0 4px",
        border: `1.5px solid ${AZUL_NEON}`,
        background: `linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%)`,
        cursor: "pointer", transition: "all 120ms ease-out",
        fontFamily: fonte.familia,
      }}
    >
      {/* RETÂNGULO INTERNO · nome (azul neon ACESO) */}
      <div style={{
        height: 26, display: "inline-flex", alignItems: "center",
        padding: "0 10px",
        border: `1px solid ${AZUL_NEON}`,
        background: p.navyDeep,
      }}>
        <span style={{
          fontSize: 11, letterSpacing: ls.forte, fontWeight: 700, lineHeight: 1,
          color: AZUL_NEON, textShadow: `0 0 6px ${AZUL_NEON}99`,
        }}>{nome}</span>
      </div>
      {/* CARGO · texto no espaço do externo (à direita do interno) */}
      <span style={{
        fontSize: 11, color: p.ink, letterSpacing: ls.forte, fontWeight: 700,
        textShadow: "0 0 4px rgba(228,233,243,0.3)", lineHeight: 1,
      }}>{cargo}</span>
    </div>
  );
}

function HeaderClinica({ paginaAtiva, setPaginaAtiva, mostrarDetalhes }: { paginaAtiva: string; setPaginaAtiva: (s: string) => void; mostrarDetalhes: boolean }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, background: p.navyDeep,
      borderTop: `1px solid ${p.border}`,
      borderBottom: `2px solid ${p.gold}`,
      padding: "10px 22px",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
      fontFamily: fonte.familia,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${p.gold}11`,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>UNIDADE EM OPERAÇÃO</div>
        <div style={{ fontSize: 11, color: p.ink, letterSpacing: ls.forte, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }}>PÁDUA MATRIZ · DASHBOARD GLOBAL</div>
        {mostrarDetalhes && (
          <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, whiteSpace: "nowrap" }}>
            UNI 1/15 · QUI 27/MAI/2026 · 11:14 BRT · 87 ATIVOS · CICLO #14
          </div>
        )}
      </div>
      {/* NAVS · sempre uma linha horizontal (nowrap) — cor de identidade quando ativo */}
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 4, justifyContent: "center", minWidth: 0 }}>
        {ITENS_MENU.map(it => {
          const ativo = paginaAtiva === it.label;
          return (
          <button
            key={it.label}
            onClick={() => setPaginaAtiva(it.label)}
            className={`pwd-btn ${ativo ? "pwd-btn-ativo" : ""}`}
            style={{ fontSize: 9, padding: "7px 9px", letterSpacing: "0.10em", flexShrink: 0, whiteSpace: "nowrap", color: ativo ? it.cor : undefined, ["--ident" as never]: it.cor }}
            title={it.sub}
          >{it.label}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <StatH label="HOJE"      val="18 SESS."  cor={p.cyan} />
        <StatH label="ADERÊNCIA" val="87%"       cor="#5FE6CC" />
        <StatH label="RECEITA"   val="R$ 41.8K"  cor={p.gold} />
      </div>
    </header>
  );
}

function StatH({ label, val, cor }: { label: string; val: string; cor: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${cor}55` }}>{val}</div>
    </div>
  );
}

/* Dados compartilhados (mesma realidade Pádua Matriz · 27/MAI/2026 · 11:14) */
export const DADOS = {
  ALERTAS_CRITICOS: [
    { sev: "CRÍTICO",  cor: "#FF9A9A", titulo: "INTERAÇÃO NAD+ × ATORVASTATINA", paciente: "Graco Souza Pádua", contexto: "Sessão 11:30 · 16min", acao: "REVISAR PROTOCOLO" },
    { sev: "URGENTE",  cor: "#F5C97A", titulo: "CORTISOL 8h BAIXO",              paciente: "Camila Toledo",     contexto: "Lab há 2d · DHEA atual 25mg", acao: "REAVALIAR DOSE DHEA" },
    { sev: "URGENTE",  cor: "#F5C97A", titulo: "TSH LIMÍTROFE 4.8",              paciente: "Lucas Vargas",      contexto: "Reflex T4L pendente",         acao: "AGENDAR TIREOIDE LAB" },
  ],
  CHECKPOINTS: [
    { tempo: "+ 24h",  canal: "WHATSAPP",   acao: "Confirmar reação ao NAD+ EV",        resp: "Beatriz",    sev: "alta" },
    { tempo: "+ 7d",   canal: "WHATSAPP",   acao: "Score libido/disposição (form A)",   resp: "Sistema",    sev: "media" },
    { tempo: "+ 14d",  canal: "EMAIL",      acao: "Envio de relatório semanal RAS",     resp: "Sistema",    sev: "baixa" },
    { tempo: "+ 30d",  canal: "TELEFONE",   acao: "Reavaliação clínica (15min)",        resp: "Dr. Caio",   sev: "alta" },
    { tempo: "+ 45d",  canal: "WHATSAPP",   acao: "Pulso diário · adesão fórmula",      resp: "Beatriz",    sev: "media" },
    { tempo: "+ 60d",  canal: "PRESENCIAL", acao: "Sessão NAD+ · ciclo 4 abertura",     resp: "Pádua Mat.", sev: "alta" },
    { tempo: "+ 90d",  canal: "EMAIL",      acao: "RAS consolidado + exames lab",       resp: "Sistema",    sev: "baixa" },
  ],
  FILAS: [
    { titulo: "ANAMNESE PENDENTE",    cor: "#FF9A9A",         n: 4,  acaoMax: "+2h"  },
    { titulo: "VALIDAÇÃO MÉDICA",     cor: "#FFA3C8",         n: 7,  acaoMax: "+2h"  },
    { titulo: "PRESCRIÇÃO RASCUNHO",  cor: pasteis.admin.neon,n: 6,  acaoMax: "+1d"  },
    { titulo: "PAGAMENTO PENDENTE",   cor: p.gold,            n: 6,  acaoMax: "+5d"  },
  ],
  KPIS: [
    { lab: "SESSÕES HOJE",   v: "18",         sub: "12 ok · 4 curso · 2 falta", cor: p.cyan    },
    { lab: "RECEITA DIA",    v: "R$ 41.820",  sub: "meta R$ 38K · +10%",        cor: p.gold    },
    { lab: "ADERÊNCIA MÉD.", v: "87%",        sub: "objetivo 80% · +5pt 7d",    cor: "#5FE6CC" },
    { lab: "FILA OPERAC.",   v: "23",         sub: "5 críticos",                cor: "#F5C97A" },
    { lab: "MOTOR V4",       v: "142",        sub: "regras hoje · 3 alertas",   cor: "#FFA3C8" },
    { lab: "FALTAS",         v: "2",          sub: "re-agendar",                cor: "#FF9A9A" },
  ],
  AGENDA: [
    { dh: "HOJE · 11:30", sn: "S04", pac: "Graco S. Pádua",   sala: "Sala 2",        tipo: "NAD+ EV",       resp: "Beatriz",  st: "EM CURSO" },
    { dh: "HOJE · 13:00", sn: "S05", pac: "Camila Toledo",     sala: "Sala 1",        tipo: "CoQ10 IM",      resp: "Beatriz",  st: "PRONTO"   },
    { dh: "HOJE · 14:30", sn: "S03", pac: "Lucas Vargas",      sala: "Sala 3",        tipo: "Subc. Vit C",   resp: "Beatriz",  st: "PRONTO"   },
    { dh: "HOJE · 16:00", sn: "S12", pac: "Maria Andrade",     sala: "Sala 2",        tipo: "REAVALIAÇÃO",   resp: "Dr. Caio", st: "PRONTO"   },
    { dh: "HOJE · 17:30", sn: "S06", pac: "Renato Carvalho",   sala: "Sala Dr. Caio", tipo: "NAD+ EV",       resp: "Dr. Caio", st: "PRONTO"   },
  ],
};
