import { useState } from "react";
import { GROUPS, PINS } from "./_data";

const ICONS = ["◐", "❤", "▦", "✚", "≡", "♟"];

export function DualPane() {
  const [sel, setSel] = useState(3); // CLÍNICA & PACIENTES
  const ativo = "Cockpit Paciente";
  const g = GROUPS[sel];

  return (
    <div className="min-h-screen flex justify-center bg-neutral-900 p-2 font-['JetBrains_Mono',monospace]">
      <div className="flex border border-[#1F2937]" style={{ background: "#0B1220" }}>
        {/* Coluna 1 — RAIL grupos */}
        <aside className="w-[56px] h-[980px] flex flex-col items-center text-[#E5E7EB] border-r border-[#1F2937] py-2">
          <div className="text-[8px] tracking-[0.15em] text-[#D4AF37] mb-2">PAW</div>
          {GROUPS.map((grp, i) => {
            const ativoGrupo = sel === i;
            return (
              <button
                key={grp.title}
                onClick={() => setSel(i)}
                className="w-10 h-10 mb-1.5 flex items-center justify-center border-l-2 text-[15px]"
                style={{
                  borderColor: grp.color,
                  background: ativoGrupo ? grp.color : "transparent",
                  color: ativoGrupo ? "#0B1220" : grp.color,
                }}
                title={grp.title}
              >
                {ICONS[i]}
              </button>
            );
          })}
        </aside>

        {/* Coluna 2 — conteúdo do grupo */}
        <div className="w-[240px] flex flex-col text-[#E5E7EB]">
          {/* Header clínica */}
          <div className="px-3 py-2 border-b border-[#1F2937]">
            <div className="text-[10px] tracking-[0.2em] text-[#D4AF37]">PAWARDS</div>
            <div className="text-[9px] text-[#94A3B8] tracking-wider">DR CAIO H F PADUA</div>
            <div className="text-[8px] text-[#5EE6E6] mt-0.5 tracking-wider">MASTER · PÁDUA</div>
          </div>

          {/* Switch */}
          <div className="px-2 py-1.5 border-b border-[#1F2937] flex gap-1">
            <button className="flex-1 text-[8px] tracking-wider py-1 bg-[#5EE6E6] text-[#0B1220] font-bold">
              GLOBAL
            </button>
            <button className="flex-1 text-[8px] tracking-wider py-1 border border-[#1F2937] text-[#94A3B8]">
              LOCAL
            </button>
          </div>

          {/* PINS */}
          <div className="px-2 py-2 border-b border-[#1F2937] grid grid-cols-4 gap-1">
            {PINS.map((p) => (
              <button
                key={p.label}
                className="flex flex-col items-center py-1 border border-[#1F2937] hover:border-[#D4AF37]"
              >
                <span className="text-[11px] text-[#D4AF37]">{p.icon}</span>
                <span className="text-[6.5px] text-[#94A3B8] tracking-wider mt-0.5">
                  {p.label.toUpperCase().slice(0, 6)}
                </span>
              </button>
            ))}
          </div>

          {/* Cockpit */}
          <div className="mx-2 my-1.5 px-2 py-1.5 border border-[#D4AF37] bg-[#D4AF37]/10">
            <div className="text-[8px] text-[#D4AF37] tracking-wider font-bold">PAINEL TÁTICO</div>
            <div className="text-[8.5px] text-[#E5E7EB] tracking-wider">COCKPIT PACIENTE →</div>
          </div>

          {/* Header do grupo */}
          <div
            className="px-3 py-2 text-[10px] tracking-[0.2em] font-bold border-l-2 border-b border-[#1F2937]"
            style={{ color: g.color, borderLeftColor: g.color }}
          >
            {g.title}
          </div>

          {/* Items do grupo selecionado */}
          <nav className="flex-1 overflow-hidden border-l-2" style={{ borderLeftColor: g.color }}>
            <ul className="py-1">
              {g.items.map((it) => {
                const isAtivo = it.label === ativo;
                return (
                  <li key={it.label}>
                    <a
                      className={`block px-3 py-1.5 text-[11px] tracking-wide ${
                        isAtivo ? "font-bold" : "text-[#CBD5E1] hover:bg-[#1F2937]"
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
          </nav>
        </div>
      </div>
    </div>
  );
}
