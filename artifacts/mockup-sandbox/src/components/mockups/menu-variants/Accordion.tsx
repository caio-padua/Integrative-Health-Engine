import { useState } from "react";
import { GROUPS, PINS } from "./_data";

export function Accordion() {
  const [aberto, setAberto] = useState("CLÍNICA & PACIENTES");
  const ativo = "Cockpit Paciente";

  return (
    <div className="min-h-screen flex justify-center bg-neutral-900 p-2 font-['JetBrains_Mono',monospace]">
      <aside
        className="w-[280px] h-[980px] flex flex-col text-[#E5E7EB] border border-[#1F2937]"
        style={{ background: "#0B1220" }}
      >
        {/* Header clínica */}
        <div className="px-3 py-2.5 border-b border-[#1F2937]">
          <div className="text-[10px] tracking-[0.2em] text-[#D4AF37]">PAWARDS</div>
          <div className="text-[9px] text-[#94A3B8] tracking-wider mt-0.5">DR CAIO H F PADUA</div>
          <div className="text-[8px] text-[#5EE6E6] mt-0.5 tracking-wider">MASTER · INST. PÁDUA</div>
        </div>

        {/* Switch clínica */}
        <div className="px-2 py-2 border-b border-[#1F2937] flex gap-1">
          <button className="flex-1 text-[9px] tracking-wider py-1.5 bg-[#5EE6E6] text-[#0B1220] font-bold">
            GLOBAL
          </button>
          <button className="flex-1 text-[9px] tracking-wider py-1.5 border border-[#1F2937] text-[#94A3B8]">
            LOCAL
          </button>
        </div>

        {/* PINS compactos */}
        <div className="px-2 py-2 border-b border-[#1F2937] grid grid-cols-4 gap-1">
          {PINS.map((p) => (
            <button
              key={p.label}
              className="flex flex-col items-center py-1.5 border border-[#1F2937] hover:border-[#D4AF37]"
            >
              <span className="text-[12px] text-[#D4AF37]">{p.icon}</span>
              <span className="text-[7px] text-[#94A3B8] tracking-wider mt-0.5">
                {p.label.toUpperCase().slice(0, 6)}
              </span>
            </button>
          ))}
        </div>

        {/* Cockpit pin */}
        <div className="mx-2 my-2 px-2 py-2 border border-[#D4AF37] bg-[#D4AF37]/10">
          <div className="text-[9px] text-[#D4AF37] tracking-wider font-bold">PAINEL TÁTICO</div>
          <div className="text-[9px] text-[#E5E7EB] tracking-wider">COCKPIT PACIENTE →</div>
        </div>

        {/* ACCORDION — só 1 grupo aberto */}
        <nav className="flex-1 overflow-hidden">
          {GROUPS.map((g) => {
            const open = aberto === g.title;
            return (
              <div key={g.title} className="border-l-2" style={{ borderColor: g.color }}>
                <button
                  onClick={() => setAberto(open ? "" : g.title)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] tracking-[0.18em] font-bold hover:bg-[#1F2937]/50"
                  style={{ color: g.color }}
                >
                  <span>{g.title}</span>
                  <span className="text-[10px]">{open ? "▾" : "▸"}</span>
                </button>
                {open && (
                  <ul className="pb-1">
                    {g.items.map((it) => {
                      const isAtivo = it.label === ativo;
                      return (
                        <li key={it.label}>
                          <a
                            className={`block px-4 py-1 text-[10.5px] leading-snug tracking-wide ${
                              isAtivo
                                ? "font-bold"
                                : "text-[#CBD5E1] hover:bg-[#1F2937]"
                            }`}
                            style={
                              isAtivo
                                ? { background: g.color, color: "#0B1220" }
                                : undefined
                            }
                          >
                            {it.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
