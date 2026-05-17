import React, { useState, useMemo } from "react";
import "./_group.css";
import {
  SINAPSES,
  B1_LABEL,
  B1_COR,
  TIPO_LABEL,
  TIPO_COR,
  ESTADO_COR,
  RESUMO,
  type Sinapse,
  type B1,
  type TipoFenotipo,
  type Estado,
} from "./_mockData";
import {
  Filter,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Pause,
  Play,
  Pencil,
  Trash2,
  ChevronRight,
  Activity,
  GitBranch,
  Copy,
  Info
} from "lucide-react";

export function GrafoSinapses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [hoveredLeft, setHoveredLeft] = useState<string | null>(null);
  const [hoveredRight, setHoveredRight] = useState<string | null>(null);
  const [selectedSinapse, setSelectedSinapse] = useState<Sinapse | null>(null);

  // Filtered synapses
  const filteredSinapses = useMemo(() => {
    return SINAPSES.filter((s) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          s.b2.toLowerCase().includes(term) ||
          s.fenotipo.toLowerCase().includes(term) ||
          s.codigoV4.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [searchTerm]);

  // Nodes extraction
  const leftNodes = useMemo(() => {
    const unique = Array.from(new Set(filteredSinapses.map((s) => s.b1 + "|" + s.b2)));
    const nodes = unique.map((key) => {
      const group = filteredSinapses.filter((s) => s.b1 + "|" + s.b2 === key);
      return {
        id: key,
        b1: group[0].b1,
        b2: group[0].b2,
        count: group.length,
      };
    });
    // Sort by B1 then B2
    nodes.sort((a, b) => a.b1.localeCompare(b.b1) || a.b2.localeCompare(b.b2));
    return nodes;
  }, [filteredSinapses]);

  const rightNodes = useMemo(() => {
    const unique = Array.from(new Set(filteredSinapses.map((s) => s.tipo + "|" + s.fenotipo)));
    const nodes = unique.map((key) => {
      const group = filteredSinapses.filter((s) => s.tipo + "|" + s.fenotipo === key);
      return {
        id: key,
        tipo: group[0].tipo,
        fenotipo: group[0].fenotipo,
        count: group.length,
      };
    });
    // Sort by Tipo then Fenotipo
    nodes.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.fenotipo.localeCompare(b.fenotipo));
    return nodes;
  }, [filteredSinapses]);

  // Icons for Types
  const getTipoIcon = (tipo: TipoFenotipo) => {
    switch (tipo) {
      case "FORM": return <Activity className="w-3 h-3" />;
      case "INJE": return <GitBranch className="w-3 h-3" />;
      case "IMPL": return <ShieldCheck className="w-3 h-3" />;
      case "EXAM": return <Search className="w-3 h-3" />;
      case "PROT": return <AlertTriangle className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="craniotomia-root min-h-screen w-full flex flex-col text-[11px] leading-tight overflow-hidden">
      {/* HEADER */}
      <header className="flex-none h-14 border-b border-[var(--crn-border)] flex items-center justify-between px-4 bg-[var(--crn-bg-panel)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--crn-accent-strong)]" />
            <h1 className="craniotomia-serif text-sm font-semibold tracking-wide text-white">
              CRANIOTOMIA <span className="text-[var(--crn-fg-muted)] font-normal">— Editor de Sinapses</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <div className="px-2 py-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-fg)] flex items-center gap-1">
              <span className="text-[var(--crn-fg-dim)]">Total:</span> {RESUMO.total}
            </div>
            <div className="px-2 py-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-estado-ativo)] flex items-center gap-1">
              Ativas: {RESUMO.ativas}
            </div>
            <div className="px-2 py-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-estado-bloqueado)] flex items-center gap-1">
              Bloq: {RESUMO.bloqueadas}
            </div>
            <div className="px-2 py-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-estado-validacao)] flex items-center gap-1">
              Valid: {RESUMO.aguardando}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[var(--crn-border)] bg-[var(--crn-bg)] px-2 h-7 w-64">
            <Search className="w-3 h-3 text-[var(--crn-fg-dim)] mr-2" />
            <input
              type="text"
              placeholder="Buscar sinapses..."
              className="bg-transparent border-none outline-none w-full text-[var(--crn-fg)] placeholder:text-[var(--crn-fg-dim)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="h-7 px-3 flex items-center gap-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg)] transition-colors">
            <Filter className="w-3 h-3" />
            <span>Filtros</span>
          </button>
          <button className="h-7 px-3 flex items-center gap-1 bg-[var(--crn-accent-strong)] text-white hover:opacity-90 transition-opacity">
            <Plus className="w-3 h-3" />
            <span className="font-medium">Nova Sinapse</span>
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* DIAGRAM AREA */}
        <div className="flex-1 relative bg-[var(--crn-bg)] overflow-hidden">
          
          {/* SVG Canvas for Edges */}
          <div className="absolute inset-0 left-[260px] right-[280px]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {filteredSinapses.map((s) => {
                const lIdx = leftNodes.findIndex((n) => n.id === s.b1 + "|" + s.b2);
                const rIdx = rightNodes.findIndex((n) => n.id === s.tipo + "|" + s.fenotipo);
                
                if (lIdx === -1 || rIdx === -1) return null;

                const y1 = ((lIdx + 0.5) / leftNodes.length) * 100;
                const y2 = ((rIdx + 0.5) / rightNodes.length) * 100;

                const isHovered = hoveredLine === s.id || hoveredLeft === s.b1 + "|" + s.b2 || hoveredRight === s.tipo + "|" + s.fenotipo;
                const isSelected = selectedSinapse?.id === s.id;
                
                let strokeColor = B1_COR[s.b1];
                let strokeDash = "none";
                let opacity = isHovered || isSelected ? 1 : 0.3;
                let zIndex = isHovered || isSelected ? 10 : 1;

                if (s.estado === "BLOQUEADO") {
                  strokeColor = "var(--crn-estado-bloqueado)";
                  strokeDash = "4 4";
                } else if (s.estado === "AGUARDA_VALIDACAO") {
                  strokeColor = "var(--crn-estado-validacao)";
                  strokeDash = "2 2";
                } else if (s.estado === "PAUSADO") {
                  strokeColor = "var(--crn-estado-pausado)";
                }

                return (
                  <path
                    key={s.id}
                    d={`M 0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isHovered || isSelected ? 2.5 : s.peso * 2}
                    strokeDasharray={strokeDash}
                    vectorEffect="non-scaling-stroke"
                    style={{ opacity, cursor: "pointer", zIndex }}
                    onMouseEnter={() => setHoveredLine(s.id)}
                    onMouseLeave={() => setHoveredLine(null)}
                    onClick={() => setSelectedSinapse(s)}
                  />
                );
              })}
            </svg>
          </div>

          {/* LEFT COLUMN: Genótipo */}
          <div className="absolute top-0 bottom-0 left-0 w-[260px] border-r border-[var(--crn-border)] bg-[var(--crn-bg-panel)]/50 backdrop-blur-sm z-10 p-2">
            <div className="h-full relative">
              {leftNodes.map((node, i) => {
                const topPercent = ((i + 0.5) / leftNodes.length) * 100;
                const isActive = hoveredLeft === node.id || filteredSinapses.some(s => s.id === hoveredLine && s.b1 + "|" + s.b2 === node.id);
                return (
                  <div
                    key={node.id}
                    className="absolute w-full flex items-center pr-2 transition-transform"
                    style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
                    onMouseEnter={() => setHoveredLeft(node.id)}
                    onMouseLeave={() => setHoveredLeft(null)}
                  >
                    <div 
                      className={`flex-1 border border-[var(--crn-border)] bg-[var(--crn-bg)] flex items-stretch h-8 cursor-default hover:border-[var(--crn-fg-dim)] ${isActive ? 'ring-1 ring-[var(--crn-accent)]' : ''}`}
                    >
                      <div className="w-2 h-full flex-none" style={{ backgroundColor: B1_COR[node.b1] }} />
                      <div className="px-2 py-1 flex-1 flex items-center justify-between truncate">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold">{node.b1}</span>
                          <span className="text-[var(--crn-fg)] truncate font-medium">{node.b2}</span>
                        </div>
                        <span className="text-[10px] text-[var(--crn-fg-dim)] bg-[var(--crn-bg-row)] px-1 border border-[var(--crn-border)]">{node.count}</span>
                      </div>
                    </div>
                    {/* Anchor dot */}
                    <div className="w-1.5 h-1.5 rounded-full ml-1" style={{ backgroundColor: B1_COR[node.b1] }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Fenótipo */}
          <div className="absolute top-0 bottom-0 right-0 w-[280px] border-l border-[var(--crn-border)] bg-[var(--crn-bg-panel)]/50 backdrop-blur-sm z-10 p-2">
            <div className="h-full relative">
              {rightNodes.map((node, i) => {
                const topPercent = ((i + 0.5) / rightNodes.length) * 100;
                const isActive = hoveredRight === node.id || filteredSinapses.some(s => s.id === hoveredLine && s.tipo + "|" + s.fenotipo === node.id);
                return (
                  <div
                    key={node.id}
                    className="absolute w-full flex items-center pl-2 transition-transform"
                    style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
                    onMouseEnter={() => setHoveredRight(node.id)}
                    onMouseLeave={() => setHoveredRight(null)}
                  >
                    {/* Anchor dot */}
                    <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: TIPO_COR[node.tipo] }} />
                    <div 
                      className={`flex-1 border border-[var(--crn-border)] bg-[var(--crn-bg)] flex items-stretch h-8 cursor-default hover:border-[var(--crn-fg-dim)] ${isActive ? 'ring-1 ring-[var(--crn-accent)]' : ''}`}
                    >
                      <div className="w-6 h-full flex items-center justify-center border-r border-[var(--crn-border)] flex-none" style={{ color: TIPO_COR[node.tipo], backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        {getTipoIcon(node.tipo)}
                      </div>
                      <div className="px-2 py-1 flex-1 flex items-center justify-between truncate">
                        <div className="flex flex-col truncate">
                          <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold">{node.tipo}</span>
                          <span className="text-[var(--crn-fg)] truncate font-medium">{node.fenotipo}</span>
                        </div>
                        <span className="text-[10px] text-[var(--crn-fg-dim)] bg-[var(--crn-bg-row)] px-1 border border-[var(--crn-border)] ml-1">{node.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (Details) */}
        <div className="w-[320px] bg-[var(--crn-bg-panel)] border-l border-[var(--crn-border)] flex flex-col z-20">
          <div className="h-10 border-b border-[var(--crn-border)] flex items-center px-4">
            <h2 className="font-semibold text-[var(--crn-fg)]">Inspetor de Sinapse</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {selectedSinapse ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--crn-fg-dim)]">CÓDIGO V4</span>
                    <span className="font-bold text-[13px] tracking-wider text-[var(--crn-accent)]">{selectedSinapse.codigoV4}</span>
                  </div>
                  <div className="px-2 py-1 text-[10px] font-bold border" style={{ 
                    borderColor: ESTADO_COR[selectedSinapse.estado], 
                    color: ESTADO_COR[selectedSinapse.estado],
                    backgroundColor: `color-mix(in srgb, ${ESTADO_COR[selectedSinapse.estado]} 10%, transparent)`
                  }}>
                    {selectedSinapse.estado}
                  </div>
                </div>

                <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-3 flex flex-col gap-3">
                  <div>
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold mb-1 block uppercase">Sinal (Genótipo)</span>
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 text-[10px] font-bold border border-[var(--crn-border)] text-white" style={{ backgroundColor: B1_COR[selectedSinapse.b1] }}>
                        {selectedSinapse.b1}
                      </div>
                      <span className="text-[var(--crn-fg)]">{selectedSinapse.sinal}</span>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-[var(--crn-border)]" />
                  
                  <div>
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold mb-1 block uppercase">Ação (Fenótipo)</span>
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 text-[10px] font-bold border border-[var(--crn-border)] flex items-center gap-1" style={{ color: TIPO_COR[selectedSinapse.tipo] }}>
                        {getTipoIcon(selectedSinapse.tipo)}
                        {selectedSinapse.tipo}
                      </div>
                      <span className="text-[var(--crn-fg)] font-medium text-[12px]">{selectedSinapse.fenotipo}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-2">
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold block mb-1">PESO (0-1)</span>
                    <span className="text-[13px] text-[var(--crn-fg)] font-medium">{selectedSinapse.peso.toFixed(2)}</span>
                  </div>
                  <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-2">
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold block mb-1">GOVERNANÇA</span>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className={`w-3 h-3 ${selectedSinapse.governanca === 'AUTO' ? 'text-[var(--crn-fg-dim)]' : 'text-[var(--crn-accent-strong)]'}`} />
                      <span className="text-[11px] text-[var(--crn-fg)]">{selectedSinapse.governanca}</span>
                    </div>
                  </div>
                  <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-2">
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold block mb-1">HITS 30D</span>
                    <span className="text-[13px] text-[var(--crn-fg)] font-medium">{selectedSinapse.hits30d}</span>
                  </div>
                  <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-2">
                    <span className="text-[9px] text-[var(--crn-fg-dim)] font-bold block mb-1">ATUALIZAÇÃO</span>
                    <span className="text-[11px] text-[var(--crn-fg)] font-medium">{selectedSinapse.ultimaEdicao}</span>
                  </div>
                </div>

                {selectedSinapse.requerValidacao && (
                  <div className="border border-[var(--crn-estado-validacao)] bg-[var(--crn-estado-validacao)]/10 p-2 flex items-start gap-2 text-[var(--crn-estado-validacao)]">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
                    <div>
                      <span className="font-bold block mb-0.5">Requer Validação Humana</span>
                      <span className="text-[10px] opacity-80">Esta regra não é executada automaticamente sem aprovação do médico titular.</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <button className="w-full h-8 flex items-center justify-center gap-2 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg)]">
                    <Pencil className="w-3 h-3" /> Editar Sinapse
                  </button>
                  <div className="flex gap-2">
                    <button className="flex-1 h-8 flex items-center justify-center gap-2 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg)]">
                      {selectedSinapse.estado === 'PAUSADO' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {selectedSinapse.estado === 'PAUSADO' ? 'Retomar' : 'Pausar'}
                    </button>
                    <button className="flex-1 h-8 flex items-center justify-center gap-2 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-red-900/30 hover:text-red-400 hover:border-red-900 text-[var(--crn-fg)]">
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                  <button className="w-full h-8 flex items-center justify-center gap-2 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg-dim)]">
                    <Copy className="w-3 h-3" /> Duplicar Regra
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--crn-fg-dim)] gap-3 text-center">
                <Info className="w-8 h-8 opacity-50" />
                <p>Clique em uma linha do grafo ou no ícone para inspecionar os detalhes da sinapse.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="flex-none h-8 border-t border-[var(--crn-border)] bg-[var(--crn-bg-panel)] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[var(--crn-fg-dim)] font-medium">LEGENDA B1:</span>
          <div className="flex items-center gap-3">
            {(Object.keys(B1_COR) as B1[]).slice(0, 5).map(b1 => (
              <div key={b1} className="flex items-center gap-1">
                <div className="w-2 h-2" style={{ backgroundColor: B1_COR[b1] }} />
                <span className="text-[10px] text-[var(--crn-fg)]">{b1}</span>
              </div>
            ))}
            <span className="text-[var(--crn-fg-dim)]">...</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-[2px] bg-[var(--crn-estado-bloqueado)] border-t border-dashed border-[var(--crn-bg)]"></span>
            <span className="text-[var(--crn-estado-bloqueado)] text-[10px]">Bloqueado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-[2px] bg-[var(--crn-estado-validacao)] border-t border-dotted border-[var(--crn-bg)]"></span>
            <span className="text-[var(--crn-estado-validacao)] text-[10px]">Validação</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default GrafoSinapses;
