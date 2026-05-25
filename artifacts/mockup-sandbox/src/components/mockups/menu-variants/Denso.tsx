import { GROUPS, PINS } from "./_data";

export function Denso() {
  const ativo = "Pulso Diário";
  return (
    <div className="min-h-screen flex justify-center bg-neutral-900 p-2 font-['JetBrains_Mono',monospace]">
      <aside
        className="w-[280px] h-[980px] flex flex-col text-[#E5E7EB] border border-[#1F2937]"
        style={{ background: "#0B1220" }}
      >
        {/* Header clínica */}
        <div className="px-3 py-2 border-b border-[#1F2937]">
          <div className="text-[10px] tracking-[0.2em] text-[#D4AF37]">PAWARDS</div>
          <div className="text-[9px] text-[#94A3B8] tracking-wider">DR CAIO H F PADUA</div>
          <div className="text-[8px] text-[#5EE6E6] mt-0.5 tracking-wider">MASTER · INST. PÁDUA</div>
        </div>

        {/* Switch clínica */}
        <div className="px-2 py-1.5 border-b border-[#1F2937] flex gap-1">
          <button className="flex-1 text-[8px] tracking-wider py-1 bg-[#5EE6E6] text-[#0B1220] font-bold">
            GLOBAL
          </button>
          <button className="flex-1 text-[8px] tracking-wider py-1 border border-[#1F2937] text-[#94A3B8]">
            LOCAL
          </button>
        </div>

        {/* PINS */}
        <div className="px-2 py-1.5 border-b border-[#1F2937] grid grid-cols-4 gap-1">
          {PINS.map((p) => (
            <button
              key={p.label}
              className="flex flex-col items-center py-1 border border-[#1F2937] hover:border-[#D4AF37]"
            >
              <span className="text-[10px] text-[#D4AF37]">{p.icon}</span>
              <span className="text-[7px] text-[#94A3B8] tracking-wider mt-0.5">
                {p.label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>

        {/* Cockpit */}
        <div className="mx-2 my-1.5 px-2 py-1.5 border border-[#D4AF37] bg-[#D4AF37]/10">
          <div className="text-[8px] text-[#D4AF37] tracking-wider font-bold">PAINEL TÁTICO</div>
          <div className="text-[8px] text-[#E5E7EB] tracking-wider">COCKPIT PACIENTE →</div>
        </div>

        {/* GRUPOS — DENSOS, ZERO SCROLL */}
        <nav className="flex-1 overflow-hidden">
          {GROUPS.map((g) => (
            <div key={g.title} className="border-l-2 mb-0.5" style={{ borderColor: g.color }}>
              <div
                className="px-2 pt-1 pb-0.5 text-[7.5px] tracking-[0.18em] font-bold"
                style={{ color: g.color }}
              >
                {g.title}
              </div>
              <ul>
                {g.items.map((it) => {
                  const isAtivo = it.label === ativo;
                  return (
                    <li key={it.label}>
                      <a
                        className={`block px-2.5 py-[2px] text-[9.5px] leading-tight tracking-wide ${
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
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
