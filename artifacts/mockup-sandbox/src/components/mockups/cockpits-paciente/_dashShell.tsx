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

export const VERDE_DOS = "#33FF66";
export const AZUL_GLB  = "#5BB6FF";

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
  .pwd-btn:hover {
    color: ${VERDE_DOS};
    border-color: ${VERDE_DOS};
    background: linear-gradient(180deg, rgba(51,255,102,0.18) 0%, rgba(51,255,102,0.08) 100%);
    transform: translateY(-1px);
    text-shadow: 0 0 8px rgba(51,255,102,0.7);
    animation: pwd-breathe 1.6s ease-in-out infinite;
  }
  .pwd-btn:active { transform: translateY(1px); animation: none; }

  .pwd-btn-ativo {
    color: ${p.navyDeep};
    background: linear-gradient(180deg, #FFE699 0%, ${p.gold} 100%);
    border-color: ${p.gold};
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.45),
      inset 0 -1px 0 rgba(0,0,0,0.3),
      0 2px 0 rgba(0,0,0,0.5),
      0 3px 10px rgba(245,201,122,0.4);
    text-shadow: none;
  }
  .pwd-btn-ativo:hover { animation: none; color: ${p.navyDeep}; border-color: ${p.gold}; }

  .pwd-btn-danger { color: #FF9A9A; border-color: #FF9A9A55; }
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
    box-shadow: inset 0 0 6px rgba(51,255,102,0.3), 0 0 8px rgba(51,255,102,0.5);
  }
  .pwd-vis-on {
    color: ${p.navyDeep};
    background: linear-gradient(180deg, #FFE699 0%, ${p.gold} 100%);
    border-color: ${p.gold};
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 8px ${p.gold}88;
    text-shadow: none;
  }
  .pwd-vis-on:hover { color: ${p.navyDeep}; border-color: ${p.gold}; text-shadow: none; }

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
  .pwd-menu-item:hover {
    color: ${VERDE_DOS};
    background: linear-gradient(90deg, rgba(51,255,102,0.14) 0%, rgba(51,255,102,0.02) 100%);
    border-left-color: ${VERDE_DOS};
    text-shadow: 0 0 6px rgba(51,255,102,0.6);
  }
  .pwd-menu-item-ativo {
    color: ${p.gold};
    background: linear-gradient(90deg, rgba(245,201,122,0.18) 0%, rgba(245,201,122,0.02) 100%);
    border-left-color: ${p.gold};
    text-shadow: 0 0 8px ${p.gold}66;
  }
  .pwd-menu-item-ativo:hover {
    color: ${p.gold}; border-left-color: ${p.gold}; text-shadow: 0 0 8px ${p.gold}66;
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

  .pwd-crumb-on {
    padding: 4px 11px;
    border: 1px solid;
    background: rgba(255,255,255,0.04);
    box-shadow:
      inset 0 0 8px currentColor,
      0 0 10px currentColor,
      0 0 20px currentColor;
    filter: brightness(1.15);
    text-shadow: 0 0 6px currentColor;
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
  const colWidth = nivelMenu === 1 ? "0" : nivelMenu === 2 ? "58px" : "220px";
  return (
    <CockpitShell>
      <style>{ESTILOS}</style>
      <BarraBreadcrumb modeloNome={modeloNome} nivelMenu={nivelMenu} setNivelMenu={setNivelMenu} />
      <HeaderClinica />
      <div style={{
        display: "grid",
        gridTemplateColumns: `${colWidth} 1fr`,
        transition: "grid-template-columns 240ms cubic-bezier(0.4,0,0.2,1)",
        minHeight: "calc(100vh - 180px)",
      }}>
        <MenuLateral nivel={nivelMenu} />
        <main style={{ minWidth: 0, overflow: "hidden" }}>{children}</main>
      </div>
    </CockpitShell>
  );
}

function BarraBreadcrumb({ modeloNome, nivelMenu, setNivelMenu }: { modeloNome: string; nivelMenu: NivelMenu; setNivelMenu: (n: NivelMenu) => void }) {
  const crumbs = [
    { lab: "PAWARDS",          cor: p.gold,             ativo: false },
    { lab: "PÁDUA MATRIZ",     cor: p.cyan,             ativo: false },
    { lab: "DASHBOARD GLOBAL", cor: pasteis.admin.neon, ativo: false },
    { lab: modeloNome,         cor: p.gold,             ativo: true  },
  ];
  return (
    <div style={{
      background: "#06090F", borderBottom: `1px solid ${p.border}`,
      padding: "9px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      fontFamily: fonte.familia, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 0 }}>
            <button className="pwd-escopo pwd-escopo-local-on">LOCAL · PÁDUA MATRIZ</button>
            <button className="pwd-escopo pwd-escopo-global-off" style={{ marginLeft: -1 }}>GLOBAL · 15 UN</button>
          </div>
          {/* 3 BOTÕEZINHOS · NÍVEL DE VISIBILIDADE DO MENU LATERAL */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia, fontWeight: 700, marginRight: 2 }}>VIS</span>
            {([1, 2, 3] as NivelMenu[]).map(n => (
              <button
                key={n}
                onClick={() => setNivelMenu(n)}
                className={`pwd-vis ${nivelMenu === n ? "pwd-vis-on" : ""}`}
                title={n === 1 ? "Sem menu lateral" : n === 2 ? "Só ícones quadrados" : "Menu completo (ícone + label + faixa)"}
              >{n}</button>
            ))}
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: p.border, margin: "0 4px" }} />
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
        <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, paddingLeft: 12, borderLeft: `1px solid ${p.border}`, marginLeft: 4 }}>
          SESSÃO INICIADA 08:42 · ATIVA 2H 32MIN · ÚLT. AÇÃO 11:11 · REGISTRO SESSÃO S03
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <OperadorTag nome="DR. CAIO REGISTER" cargo="MÉDICO" extra="CEO · CRM-SP 142.308" />
        <button className="pwd-btn" style={{ fontSize: 10, padding: "8px 14px" }}>CONFIGURAÇÕES</button>
        <button className="pwd-btn pwd-btn-danger" style={{ fontSize: 10, padding: "8px 14px" }}>SAIR</button>
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
const ITENS_MENU: Array<{ sigla: string; label: string; sub: string; cor: string; ativo?: boolean }> = [
  { sigla: "DSH", label: "DASHBOARD",   sub: "operação hoje",     cor: "#F5C97A", ativo: true },
  { sigla: "PAC", label: "PACIENTES",   sub: "87 ativos",         cor: "#5BB6FF" },
  { sigla: "AGD", label: "AGENDA",      sub: "5 hoje · 11:14",    cor: "#5FE6CC" },
  { sigla: "PRX", label: "PRESCRIÇÃO",  sub: "6 rascunho",        cor: "#B5A0F0" },
  { sigla: "FAT", label: "FATURAMENTO", sub: "R$ 41.8K dia",      cor: "#85E0A3" },
  { sigla: "MOT", label: "MOTOR V4",    sub: "142 regras hoje",   cor: "#FFA3C8" },
  { sigla: "EQP", label: "EQUIPE",      sub: "4 ativos",          cor: "#C8B6FF" },
  { sigla: "AUD", label: "AUDITORIA",   sub: "23 eventos 7d",     cor: "#FF9A9A" },
];

function MenuLateral({ nivel }: { nivel: NivelMenu }) {
  if (nivel === 1) return null;
  const compacto = nivel === 2;
  return (
    <aside className="pwd-menu-aside" style={{ padding: compacto ? "10px 6px" : "12px 0" }}>
      {ITENS_MENU.map(it => (
        <div
          key={it.sigla}
          className={`pwd-menu-item ${it.ativo ? "pwd-menu-item-ativo" : ""}`}
          style={{
            justifyContent: compacto ? "center" : "flex-start",
            padding: compacto ? "8px 0" : "9px 10px",
            borderLeft: compacto ? "none" : (it.ativo ? `3px solid ${it.cor}` : "3px solid transparent"),
          }}
          title={`${it.label} · ${it.sub}`}
        >
          <span className="pwd-menu-icone" style={{ color: it.cor }}>{it.sigla}</span>
          {!compacto && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span className="pwd-menu-label" style={{ color: it.ativo ? p.gold : p.ink }}>{it.label}</span>
              <span className="pwd-menu-sub">{it.sub}</span>
            </div>
          )}
        </div>
      ))}
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
      className="pwd-op-externo"
      style={{
        display: "inline-flex", alignItems: "center", gap: 14,
        padding: "6px 14px 6px 6px",
        border: `1.5px solid ${p.gold}`,
        background: `linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 0 rgba(0,0,0,0.5), 0 0 14px ${p.gold}22`,
        cursor: "pointer", transition: "all 120ms ease-out",
        fontFamily: fonte.familia,
      }}
    >
      {/* RETÂNGULO INTERNO · nome */}
      <div style={{
        padding: "8px 14px",
        border: `1px solid ${p.gold}`,
        background: p.navyDeep,
        boxShadow: `inset 0 0 8px ${p.gold}33, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        <div style={{
          fontSize: 12, color: p.gold, letterSpacing: ls.forte, fontWeight: 700,
          textShadow: `0 0 6px ${p.gold}66`, lineHeight: 1.1,
        }}>{nome}</div>
        {extra && (
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginTop: 3, lineHeight: 1.1 }}>
            {extra}
          </div>
        )}
      </div>
      {/* CARGO · texto no espaço do externo (à direita do interno) */}
      <div style={{
        fontSize: 13, color: p.ink, letterSpacing: ls.forte, fontWeight: 700,
        textShadow: "0 0 4px rgba(228,233,243,0.3)", paddingRight: 4,
      }}>{cargo}</div>
    </div>
  );
}

function HeaderClinica() {
  const navs = ["DASHBOARD", "PACIENTES", "AGENDA", "PRESCRIÇÃO", "FATURAMENTO", "MOTOR", "EQUIPE", "AUDITORIA"];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, background: p.navyDeep,
      borderBottom: `2px solid ${p.gold}`, padding: "14px 22px",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center",
      fontFamily: fonte.familia,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${p.gold}11`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 62, height: 62, background: p.navyPanel, border: `2px solid ${p.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: p.gold, letterSpacing: ls.forte, fontWeight: 700,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 14px ${p.gold}44, 0 4px 8px rgba(0,0,0,0.5)`,
        }}>PD</div>
        <div>
          <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 3 }}>UNIDADE EM OPERAÇÃO</div>
          <div style={{ fontSize: 18, color: p.ink, letterSpacing: ls.forte, fontWeight: 700, lineHeight: 1.2 }}>PÁDUA MATRIZ · DASHBOARD GLOBAL</div>
          <div style={{ fontSize: 11, color: p.inkDim, letterSpacing: ls.suave, marginTop: 4 }}>
            UNI 1/15 · QUI 27/MAI/2026 · 11:14 BRT · 87 PACIENTES ATIVOS · CICLO COMERCIAL #14
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {navs.map((t, i) => (
          <button key={t} className={`pwd-btn ${i === 0 ? "pwd-btn-ativo" : ""}`} style={{ fontSize: 10, padding: "9px 14px" }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
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
