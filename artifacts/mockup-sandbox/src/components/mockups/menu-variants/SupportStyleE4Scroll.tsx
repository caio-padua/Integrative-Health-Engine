import { useState } from "react";
import { GROUPS, PINS } from "./_data";

const GROUP_ICONS = ["◐", "❤", "▦", "✚", "≡", "♟"];
const PIN_CORES = ["#5B8DEF", "#7BC79E", "#F5B946", "#E07A5F"];

export function SupportStyleE4Scroll() {
  const [grupoIdx, setGrupoIdx] = useState(3);
  const [itemAtivo, setItemAtivo] = useState("Pacientes");
  const grupo = GROUPS[grupoIdx];

  // Demonstração: lista expandida pra forçar overflow e mostrar a scrollbar
  // viva (numa clínica real cada módulo tem 20-40 atalhos)
  const extras = [
    "Importar Planilha", "Exportar CSV", "Filtros Avançados", "Tags & Marcadores",
    "Histórico de Alterações", "Backup Automático", "Notificações Push",
    "Integrações", "Webhooks", "Auditoria de Acesso", "Permissões Granulares",
    "Atalhos de Teclado", "Modo Foco", "Modo Escuro", "Acessibilidade",
  ].map((label) => ({ label }));

  const secoes = [
    { titulo: "OPERACIONAL", cor: grupo.color, items: grupo.items },
    { titulo: "CONFIGURAÇÃO", cor: "#94A3B8", items: extras.slice(0, 8) },
    { titulo: "AVANÇADO", cor: "#A78BFA", items: extras.slice(8) },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 p-3 font-['JetBrains_Mono',monospace]">
      <div className="max-w-[1100px] mx-auto mb-2 px-2 flex items-center gap-3">
        <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#D4AF37]">
          MODELO E4-SCROLL — Sidebar com rolagem LITERAL teto-ao-chão (tudo rola junto)
        </span>
        <div className="flex-1 h-px bg-[#D4AF37]/30" />
        <span className="text-[8px] tracking-widest uppercase text-[#F87171]">
          ⚠ PINS + COCKPIT somem ao rolar
        </span>
      </div>

      <div
        className="w-full h-[820px] flex border border-[#1F2937] overflow-hidden"
        style={{ background: "#0B1220" }}
      >
        {/* ═══════════════════════════════════════════════════════════════
            SIDEBAR — UM ÚNICO SCROLL teto-ao-chão (NENHUMA região fixa)
            Scrollbar custom SEMPRE visível (igual Support Clinic)
            ═══════════════════════════════════════════════════════════════ */}
        <style>{`
          .sidebar-scroll-literal {
            scrollbar-gutter: stable;
          }
          .sidebar-scroll-literal::-webkit-scrollbar {
            width: 10px;
          }
          .sidebar-scroll-literal::-webkit-scrollbar-track {
            background: #0F172A;
            border-left: 1px solid #1F2937;
          }
          .sidebar-scroll-literal::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #5EE6E6 0%, #3B82C4 100%);
            border-radius: 0;
            box-shadow: inset 0 0 0 1px rgba(94,230,230,0.5),
                        0 0 8px rgba(94,230,230,0.4);
          }
          .sidebar-scroll-literal::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #7BF0F0 0%, #5BA0E0 100%);
          }
        `}</style>
        <aside
          className="sidebar-scroll-literal w-[240px] flex-shrink-0 border-r border-[#1F2937]"
          style={{ background: "#0B1220", overflowY: "scroll" }}
        >
          {/* PINS — agora ROLAM junto */}
          <div
            className="grid grid-cols-2 border-b-[2px] border-[#1F2937]"
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

          {/* COCKPIT mega-header — ROLA junto */}
          <div className="p-2 border-b-[2px] border-[#5EE6E6]/30">
            <button
              className="w-full flex items-center justify-center gap-2 border-l-[3px] border-l-[#5EE6E6] transition-all hover:brightness-125"
              style={{
                height: 64,
                background:
                  "linear-gradient(90deg, rgba(94,230,230,0.18) 0%, rgba(94,230,230,0.06) 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(94,230,230,0.45), 0 0 18px -4px rgba(94,230,230,0.6)",
              }}
              title="Painel Tático — Cockpit"
            >
              <span
                className="text-[18px] leading-none"
                style={{
                  color: "#5EE6E6",
                  textShadow: "0 0 8px rgba(94,230,230,0.8)",
                }}
              >
                ⚕
              </span>
              <span
                className="text-[11px] tracking-[0.25em] font-bold uppercase"
                style={{
                  color: "#5EE6E6",
                  textShadow: "0 0 6px rgba(94,230,230,0.5)",
                }}
              >
                Cockpit
              </span>
              <span className="text-[7.5px] tracking-[0.2em] text-[#5EE6E6]/70 uppercase ml-1">
                Painel Tático
              </span>
            </button>
          </div>

          {/* Pesquisa — ROLA junto */}
          <div className="px-3 py-2 border-b border-[#1F2937]">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-[#1F2937] bg-[#0F172A]">
              <span className="text-[10px] text-[#475569]">🔍</span>
              <span className="text-[9px] text-[#475569] tracking-wide">
                Pesquisar
              </span>
            </div>
          </div>

          {/* Seções agrupadas + items — ROLAM junto */}
          <div className="py-1">
            {secoes.map((sec) => (
              <div key={sec.titulo}>
                <div
                  className="px-3 pt-2 pb-1 flex items-center gap-2"
                  style={{
                    background: `linear-gradient(90deg, ${sec.cor}22, transparent)`,
                    borderLeft: `3px solid ${sec.cor}`,
                  }}
                >
                  <span
                    className="text-[7.5px] tracking-[0.25em] font-bold uppercase"
                    style={{ color: sec.cor }}
                  >
                    ┃ {sec.titulo}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `${sec.cor}33` }}
                  />
                </div>
                {sec.items.map((it) => {
                  const ativo = it.label === itemAtivo;
                  return (
                    <button
                      key={`${sec.titulo}-${it.label}`}
                      onClick={() => setItemAtivo(it.label)}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 border-l-[2px] transition-all text-left"
                      style={
                        ativo
                          ? {
                              borderLeftColor: grupo.color,
                              background: `color-mix(in oklab, ${grupo.color} 18%, transparent)`,
                              boxShadow: `inset 0 0 0 1.5px ${grupo.color}, 0 0 12px -2px ${grupo.color}`,
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
                        className="text-[11px] flex-shrink-0"
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
              </div>
            ))}
          </div>

          {/* Som/Sair — ROLA junto (não fica fixo no fundo) */}
          <div className="px-3 py-2 border-t border-[#1F2937] flex items-center gap-2">
            <button className="flex-1 text-[7.5px] tracking-widest text-[#94A3B8] hover:text-[#E5E7EB] py-1.5 border border-[#1F2937] uppercase font-bold">
              ♪ SOM
            </button>
            <button className="flex-1 text-[7.5px] tracking-widest text-[#94A3B8] hover:text-[#E5E7EB] py-1.5 border border-[#1F2937] uppercase font-bold">
              ⏻ SAIR
            </button>
          </div>
        </aside>

        {/* COLUNA DIREITA — topbar + main (igual ao E4) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="h-[58px] flex items-stretch border-b border-[#1F2937] flex-shrink-0"
            style={{ background: "#0F172A" }}
          >
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

            <div className="flex items-center gap-2 px-3 border-l border-[#1F2937]">
              <button className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#94A3B8]">
                <span className="text-[14px]">⌘</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#94A3B8] relative">
                <span className="text-[14px]">🔔</span>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              </button>
              <div className="px-2 py-1 border-l-[2px] border-l-[#5B8DEF] flex flex-col leading-tight">
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

          <main className="flex-1 overflow-hidden flex flex-col">
            <div
              className="h-10 flex items-center px-4 border-b border-[#1F2937]"
              style={{ background: "#0F172A" }}
            >
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
              <div
                className="border border-[#F87171]/40 p-4"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(248,113,113,0.08), transparent)",
                  borderLeft: "3px solid #F87171",
                }}
              >
                <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#F87171] mb-2">
                  ⚠ Atenção — versão SCROLL LITERAL
                </div>
                <div className="text-[10px] text-[#CBD5E1] leading-relaxed tracking-wide">
                  Role a sidebar à esquerda pra ver o efeito: PINS, COCKPIT,
                  pesquisa, items e Som/Sair RODAM JUNTOS num único scroll
                  teto-ao-chão. Não tem nada "âncora". Quando você desce,
                  perde os atalhos visuais — o COCKPIT some, os PINS somem.
                  Pra TDAH/TOC isso quebra a memória espacial. Recomendação
                  segue sendo o E4 normal (PINS + COCKPIT mega-header fixos
                  no topo, só a lista rola).
                </div>
              </div>

              <div
                className="mt-4 border border-[#1F2937] p-4"
                style={{ background: "#0F172A" }}
              >
                <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#94A3B8] mb-2">
                  Comparação rápida
                </div>
                <div className="text-[10px] text-[#64748B] leading-relaxed tracking-wide">
                  • E4 normal: PINS + COCKPIT fixos = 1 clique sempre, em
                  qualquer scroll position.
                  <br />• E4-Scroll (este): tudo rola = lista pode ter 200
                  items sem aperto, mas COCKPIT vira "achar onde tá".
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
