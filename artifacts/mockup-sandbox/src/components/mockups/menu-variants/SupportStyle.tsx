import { useState } from "react";
import { GROUPS, PINS } from "./_data";

const GROUP_ICONS = ["◐", "❤", "▦", "✚", "≡", "♟"];
const PIN_CORES = ["#5B8DEF", "#7BC79E", "#F5B946", "#E07A5F"];

export function SupportStyle() {
  const [grupoIdx, setGrupoIdx] = useState(3);
  const [itemAtivo, setItemAtivo] = useState("Pacientes");
  const grupo = GROUPS[grupoIdx];

  return (
    <div className="min-h-screen bg-neutral-900 p-3 font-['JetBrains_Mono',monospace]">
      <div
        className="w-full h-[820px] flex border border-[#1F2937] overflow-hidden"
        style={{ background: "#0B1220" }}
      >
        {/* ═══════════════════════════════════════════════════════════════
            SIDEBAR ESQUERDA — full height (teto ao chão), com scroll próprio
            ═══════════════════════════════════════════════════════════════ */}
        <aside
          className="w-[220px] flex-shrink-0 border-r border-[#1F2937] flex flex-col"
          style={{ background: "#0B1220" }}
        >
          {/* ┌─────────────────────────────────────────┐
              │ QUADRADO TOPO — 4 PINS neon (atalhos)   │
              │ Altura 92px (alinhado com topbar 58 +   │
              │ uma faixa extra pra grid 2x2 dos PINS)  │
              └─────────────────────────────────────────┘ */}
          <div
            className="grid grid-cols-2 border-b-[2px] border-[#1F2937] flex-shrink-0"
            style={{ background: "#0F172A" }}
          >
            {PINS.map((p, i) => (
              <button
                key={p.label}
                className="h-[46px] flex flex-col items-center justify-center gap-0.5 border-l-[2px] border-b border-b-[#1F2937] transition-all hover:bg-white/5"
                style={{ borderLeftColor: PIN_CORES[i] }}
                title={p.label}
              >
                <span
                  className="text-[14px] leading-none"
                  style={{ color: PIN_CORES[i] }}
                >
                  {p.icon}
                </span>
                <span
                  className="text-[6.5px] tracking-widest font-bold uppercase leading-none"
                  style={{ color: PIN_CORES[i] }}
                >
                  {p.label.slice(0, 6)}
                </span>
              </button>
            ))}
          </div>

          {/* Header do grupo ativo (cor neon do grupo) */}
          <div
            className="px-3 py-2 border-b border-[#1F2937] border-l-[3px] flex-shrink-0"
            style={{ borderLeftColor: grupo.color }}
          >
            <div
              className="text-[7.5px] tracking-[0.2em] uppercase font-bold mb-0.5"
              style={{ color: grupo.color }}
            >
              MÓDULO ATIVO
            </div>
            <div className="text-[10px] tracking-[0.1em] font-bold text-[#E5E7EB] uppercase">
              {grupo.title}
            </div>
          </div>

          {/* Pesquisa */}
          <div className="px-3 py-2 border-b border-[#1F2937] flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-[#1F2937] bg-[#0F172A]">
              <span className="text-[10px] text-[#475569]">🔍</span>
              <span className="text-[9px] text-[#475569] tracking-wide">
                Pesquisar
              </span>
            </div>
          </div>

          {/* ▼▼▼ LISTA DE ITEMS — única região com scroll, teto ao chão ▼▼▼ */}
          <nav className="flex-1 overflow-y-auto py-1.5">
            {grupo.items.map((it) => {
              const ativo = it.label === itemAtivo;
              return (
                <button
                  key={it.label}
                  onClick={() => setItemAtivo(it.label)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 border-l-[2px] transition-all text-left"
                  style={
                    ativo
                      ? {
                          borderLeftColor: grupo.color,
                          background: `color-mix(in oklab, ${grupo.color} 18%, transparent)`,
                          boxShadow: `inset 0 0 0 1.5px ${grupo.color}, 0 0 14px -2px ${grupo.color}`,
                          color: "#FFFFFF",
                        }
                      : { borderLeftColor: "transparent" }
                  }
                  onMouseEnter={(e) => {
                    if (!ativo) {
                      e.currentTarget.style.borderLeftColor = grupo.color;
                      e.currentTarget.style.background = `color-mix(in oklab, ${grupo.color} 10%, transparent)`;
                      e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${grupo.color}, 0 0 10px -2px ${grupo.color}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!ativo) {
                      e.currentTarget.style.borderLeftColor = "transparent";
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <span
                    className="text-[12px] flex-shrink-0"
                    style={{ color: ativo ? "#FFFFFF" : grupo.color }}
                  >
                    ◆
                  </span>
                  <span
                    className="text-[10.5px] tracking-wide flex-1"
                    style={{
                      color: ativo ? "#FFFFFF" : "#CBD5E1",
                      fontWeight: ativo ? 700 : 400,
                    }}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer da sidebar — som + sair */}
          <div className="px-3 py-2 border-t border-[#1F2937] flex items-center gap-2 flex-shrink-0">
            <button className="flex-1 text-[7.5px] tracking-widest text-[#94A3B8] hover:text-[#E5E7EB] py-1.5 border border-[#1F2937] uppercase font-bold">
              ♪ SOM
            </button>
            <button className="flex-1 text-[7.5px] tracking-widest text-[#94A3B8] hover:text-[#E5E7EB] py-1.5 border border-[#1F2937] uppercase font-bold">
              ⏻ SAIR
            </button>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════════
            COLUNA DIREITA — topbar + main (começa DEPOIS da sidebar)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TOPBAR — grupos macro + COCKPIT + busca/alertas/clínica */}
          <div
            className="h-[58px] flex items-stretch border-b border-[#1F2937] flex-shrink-0"
            style={{ background: "#0F172A" }}
          >
            {/* Logo PAWARDS */}
            <div className="px-4 flex items-center gap-2 border-r border-[#1F2937]">
              <div
                className="w-7 h-8"
                style={{
                  background: "#D4AF37",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  filter: "drop-shadow(0 0 6px rgba(212,175,55,0.5))",
                }}
              />
              <div className="leading-tight">
                <div className="text-[11px] tracking-[0.2em] font-bold text-[#D4AF37]">
                  PAWARDS
                </div>
                <div className="text-[6.5px] tracking-[0.25em] text-[#94A3B8] uppercase">
                  Clinical Intelligence
                </div>
              </div>
            </div>

            {/* 6 grupos macro horizontais — cada um na sua cor */}
            <nav className="flex-1 flex items-stretch px-2 gap-1 overflow-x-auto">
              {GROUPS.map((g, i) => {
                const ativo = i === grupoIdx;
                return (
                  <button
                    key={g.title}
                    onClick={() => setGrupoIdx(i)}
                    className="px-3 flex items-center gap-1.5 border-b-[3px] transition-all whitespace-nowrap"
                    style={{
                      borderBottomColor: ativo ? g.color : "transparent",
                      background: ativo
                        ? `color-mix(in oklab, ${g.color} 15%, transparent)`
                        : "transparent",
                      boxShadow: ativo
                        ? `inset 0 -1px 0 ${g.color}, 0 4px 12px -4px ${g.color}`
                        : undefined,
                    }}
                    title={g.title}
                  >
                    <span className="text-[13px]" style={{ color: g.color }}>
                      {GROUP_ICONS[i]}
                    </span>
                    <span
                      className="text-[9.5px] tracking-[0.15em] font-bold uppercase"
                      style={{ color: ativo ? g.color : "#94A3B8" }}
                    >
                      {g.title.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* COCKPIT destacado */}
            <button
              className="px-3 flex items-center gap-1.5 border-l-[3px] border-l-[#5EE6E6] hover:bg-[#5EE6E6]/10 transition-all"
              style={{
                boxShadow: "inset 0 0 0 1px rgba(94,230,230,0.3)",
                background: "rgba(94,230,230,0.06)",
              }}
              title="Painel Tático — Cockpit"
            >
              <span className="text-[14px] text-[#5EE6E6]">⚕</span>
              <span className="text-[9px] tracking-[0.15em] font-bold uppercase text-[#5EE6E6]">
                Cockpit
              </span>
            </button>

            {/* Direita: busca + alertas + clínica + avatar */}
            <div className="flex items-center gap-2 px-3 border-l border-[#1F2937]">
              <button
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#94A3B8]"
                title="Buscar (⌘K)"
              >
                <span className="text-[14px]">⌘</span>
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#94A3B8] relative"
                title="Alertas"
              >
                <span className="text-[14px]">🔔</span>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              </button>
              <div
                className="px-2 py-1 border-l-[2px] border-l-[#5B8DEF] flex flex-col leading-tight"
                title="Visão Global"
              >
                <span className="text-[7px] tracking-widest text-[#5B8DEF] font-bold uppercase">
                  GLOBAL
                </span>
                <span className="text-[9px] text-[#E5E7EB] tracking-wide">
                  Todas Clínicas
                </span>
              </div>
              <div className="w-8 h-8 flex items-center justify-center bg-[#1F2937] border border-[#374151]">
                <span className="text-[10px] font-bold tracking-wider text-[#D4AF37]">
                  CP
                </span>
              </div>
            </div>
          </div>

          {/* MAIN — área de conteúdo */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <div
              className="h-10 flex items-center px-4 border-b border-[#1F2937]"
              style={{ background: "#0F172A" }}
            >
              <button className="flex items-center gap-1.5 px-2 py-1 border-l-[3px] border-l-[#5EE6E6] hover:bg-white/5">
                <span className="text-[11px] text-[#5EE6E6]">←</span>
                <span className="text-[8px] tracking-[0.2em] font-bold text-[#5EE6E6] uppercase">
                  Voltar
                </span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-[10px] tracking-[0.25em] font-bold text-[#E5E7EB] uppercase">
                  {itemAtivo}
                </span>
              </div>
              <div className="text-[9px] tracking-[0.2em] text-[#D4AF37] uppercase font-bold">
                {grupo.title.split(" ")[0]}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Pacientes Ativos", v: "30", cor: "#D4AF37" },
                  { label: "Atrasados", v: "07", cor: "#F87171" },
                  { label: "Concluídos Hoje", v: "12", cor: "#22D3A6" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="p-3 border-l-[3px]"
                    style={{
                      borderLeftColor: kpi.cor,
                      background: "#0F172A",
                      boxShadow: `inset 0 0 0 1px ${kpi.cor}33`,
                    }}
                  >
                    <div
                      className="text-[8px] tracking-[0.2em] font-bold uppercase mb-1"
                      style={{ color: kpi.cor }}
                    >
                      {kpi.label}
                    </div>
                    <div
                      className="text-[22px] font-bold tracking-wider"
                      style={{ color: "#E5E7EB" }}
                    >
                      {kpi.v}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="border border-[#1F2937] p-4"
                style={{ background: "#0F172A" }}
              >
                <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#94A3B8] mb-2">
                  ← Conteúdo principal da tela "{itemAtivo}"
                </div>
                <div className="text-[10px] text-[#64748B] leading-relaxed tracking-wide">
                  Sidebar agora vai do TETO AO CHÃO (220px de largura, coluna
                  inteira). No canto superior esquerdo, um quadrado 2×2 com os
                  4 PINS neon (Prescrição/Anamnese/Pacientes/Agenda) sempre
                  visíveis. Lista de items rola sozinha sem mexer no topo
                  nem no rodapé. Topbar com grupos macro fica acima do
                  conteúdo principal, mas começa só depois da sidebar.
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
