import { useState } from "react";
import { GROUPS, PINS } from "./_data";

const ICONS = ["◐", "❤", "▦", "✚", "≡", "♟"];

export function RailPopover() {
  const [hover, setHover] = useState<number | null>(3);
  const ativo = "Prescrição";
  const grupoAberto = hover === null ? null : GROUPS[hover];

  return (
    <div className="min-h-screen flex justify-center bg-neutral-900 p-2 font-['JetBrains_Mono',monospace]">
      <div className="relative flex">
        {/* RAIL — só ícones */}
        <aside
          className="w-[64px] h-[980px] flex flex-col items-center text-[#E5E7EB] border border-[#1F2937]"
          style={{ background: "#0B1220" }}
        >
          <div className="py-2 border-b border-[#1F2937] w-full text-center">
            <div className="text-[8px] tracking-[0.15em] text-[#D4AF37]">PAW</div>
          </div>

          {/* Switch GLOBAL/LOCAL minúsculo */}
          <div className="py-1.5 border-b border-[#1F2937] w-full flex flex-col items-center gap-1 px-1">
            <button className="w-full text-[7px] py-1 bg-[#5EE6E6] text-[#0B1220] font-bold tracking-wider">
              GLOB
            </button>
            <button className="w-full text-[7px] py-1 border border-[#1F2937] text-[#94A3B8] tracking-wider">
              LOCAL
            </button>
          </div>

          {/* PINS verticais */}
          <div className="py-2 border-b border-[#1F2937] w-full flex flex-col items-center gap-1.5">
            {PINS.map((p) => (
              <button
                key={p.label}
                className="w-9 h-9 flex items-center justify-center border border-[#1F2937] hover:border-[#D4AF37] text-[14px] text-[#D4AF37]"
                title={p.label}
              >
                {p.icon}
              </button>
            ))}
          </div>

          {/* Cockpit pin */}
          <button className="w-9 h-9 mt-2 flex items-center justify-center border border-[#D4AF37] bg-[#D4AF37]/10 text-[12px] text-[#D4AF37]">
            ★
          </button>

          {/* GRUPOS — só ícones coloridos */}
          <nav className="flex-1 w-full flex flex-col items-center pt-3 gap-2">
            {GROUPS.map((g, i) => {
              const ativoGrupo = hover === i;
              return (
                <button
                  key={g.title}
                  onMouseEnter={() => setHover(i)}
                  className="w-10 h-10 flex items-center justify-center border-l-2 text-[16px] transition"
                  style={{
                    borderColor: g.color,
                    background: ativoGrupo ? g.color : "transparent",
                    color: ativoGrupo ? "#0B1220" : g.color,
                  }}
                  title={g.title}
                >
                  {ICONS[i]}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* POPOVER painel */}
        {grupoAberto && (
          <div
            onMouseLeave={() => setHover(null)}
            className="ml-1 w-[220px] text-[#E5E7EB] border border-[#1F2937] shadow-2xl"
            style={{ background: "#0B1220", height: "fit-content" }}
          >
            <div
              className="px-3 py-2 border-b border-[#1F2937] text-[9px] tracking-[0.2em] font-bold border-l-2"
              style={{ color: grupoAberto.color, borderLeftColor: grupoAberto.color }}
            >
              {grupoAberto.title}
            </div>
            <ul className="py-1">
              {grupoAberto.items.map((it) => {
                const isAtivo = it.label === ativo;
                return (
                  <li key={it.label}>
                    <a
                      className={`block px-3 py-1.5 text-[10.5px] tracking-wide ${
                        isAtivo ? "font-bold" : "text-[#CBD5E1] hover:bg-[#1F2937]"
                      }`}
                      style={
                        isAtivo
                          ? { background: grupoAberto.color, color: "#0B1220" }
                          : undefined
                      }
                    >
                      {it.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
