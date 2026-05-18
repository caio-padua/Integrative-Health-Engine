import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
} from "./_mockData";
import {
  Activity,
  Search,
  Plus,
  Eye,
  Pencil,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Pause,
  Play,
  Trash2,
  Copy,
  Beaker,
  Syringe,
  Cpu,
  Layers,
  Zap,
  User,
  Keyboard,
  Focus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  History,
  X,
  Clock,
  GitCommit,
  TrendingUp,
} from "lucide-react";

type Modo = "VISUALIZACAO" | "EDICAO" | "SIMULACAO";

const TipoIcon: Record<TipoFenotipo, React.ElementType> = {
  FORM: Beaker, INJE: Syringe, IMPL: Cpu, EXAM: Activity, PROT: Layers,
};
const GovIcon = { AUTO: Zap, MEDICO: User, MEDICO_CHEFE: ShieldCheck };

// ---------- localStorage hook ----------
function usePersisted<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });
  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

export function CraniotomiaV4() {
  // ---------- Estado persistido ----------
  const [modo, setModo] = usePersisted<Modo>("crn-v4-modo", "VISUALIZACAO");
  const [search, setSearch] = usePersisted<string>("crn-v4-search", "");
  const [filtroB1Arr, setFiltroB1Arr] = usePersisted<B1[]>("crn-v4-filtroB1", []);
  const [selectedId, setSelectedId] = usePersisted<number | null>("crn-v4-selected", null);
  const [splitPct, setSplitPct] = usePersisted<number>("crn-v4-split-pct", 50); // % do grafo
  const [inspectorW, setInspectorW] = usePersisted<number>("crn-v4-inspector-w", 320);
  const [legendCollapsed, setLegendCollapsed] = usePersisted<boolean>("crn-v4-legend-collapsed", false);
  const [inspectorCollapsed, setInspectorCollapsed] = usePersisted<boolean>("crn-v4-inspector-collapsed", false);

  // ---------- Estado efêmero ----------
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isolatedNode, setIsolatedNode] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; sinapseId: number } | null>(null);

  const filtroB1 = useMemo(() => new Set(filtroB1Arr), [filtroB1Arr]);
  const tableRowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  // ---------- Filtragem ----------
  const filteredSinapses = useMemo(() => {
    return SINAPSES.filter((s) => {
      if (filtroB1.size > 0 && !filtroB1.has(s.b1)) return false;
      if (isolatedNode) {
        const leftKey = s.b1 + "|" + s.b2;
        const rightKey = s.tipo + "|" + s.fenotipo;
        if (leftKey !== isolatedNode && rightKey !== isolatedNode) return false;
      }
      if (search) {
        const t = search.toLowerCase();
        return (
          s.b2.toLowerCase().includes(t) ||
          s.fenotipo.toLowerCase().includes(t) ||
          s.codigoV4.toLowerCase().includes(t) ||
          s.sinal.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [search, filtroB1, isolatedNode]);

  const leftNodes = useMemo(() => {
    const uniq = Array.from(new Set(filteredSinapses.map((s) => s.b1 + "|" + s.b2)));
    return uniq
      .map((key) => {
        const g = filteredSinapses.filter((s) => s.b1 + "|" + s.b2 === key);
        return { id: key, b1: g[0].b1, b2: g[0].b2, count: g.length };
      })
      .sort((a, b) => a.b1.localeCompare(b.b1) || a.b2.localeCompare(b.b2));
  }, [filteredSinapses]);

  const rightNodes = useMemo(() => {
    const uniq = Array.from(new Set(filteredSinapses.map((s) => s.tipo + "|" + s.fenotipo)));
    return uniq
      .map((key) => {
        const g = filteredSinapses.filter((s) => s.tipo + "|" + s.fenotipo === key);
        return { id: key, tipo: g[0].tipo, fenotipo: g[0].fenotipo, count: g.length };
      })
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.fenotipo.localeCompare(b.fenotipo));
  }, [filteredSinapses]);

  // ---------- Scroll sincronizado ----------
  useEffect(() => {
    if (selectedId !== null) {
      const row = tableRowRefs.current.get(selectedId);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  // ---------- Atalhos ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?") setShowShortcuts((v) => !v);
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowHistory(null);
        setCtxMenu(null);
        setIsolatedNode(null);
      }
      if (e.key === "v" || e.key === "V") setModo("VISUALIZACAO");
      if (e.key === "e" || e.key === "E") setModo("EDICAO");
      if (e.key === "s" || e.key === "S") setModo("SIMULACAO");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setModo]);

  // ---------- Fecha context menu ao clicar fora ----------
  useEffect(() => {
    if (!ctxMenu) return;
    const onClick = () => setCtxMenu(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [ctxMenu]);

  // ---------- Resize handlers ----------
  const dragSplitRef = useRef(false);
  const dragInspectorRef = useRef(false);

  const onSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragSplitRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onInspectorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragInspectorRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragSplitRef.current && splitContainerRef.current) {
        const rect = splitContainerRef.current.getBoundingClientRect();
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        setSplitPct(Math.max(15, Math.min(85, pct)));
      }
      if (dragInspectorRef.current && bodyContainerRef.current) {
        const rect = bodyContainerRef.current.getBoundingClientRect();
        const w = rect.right - e.clientX;
        setInspectorW(Math.max(220, Math.min(560, w)));
      }
    };
    const onUp = () => {
      if (dragSplitRef.current || dragInspectorRef.current) {
        dragSplitRef.current = false;
        dragInspectorRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setSplitPct, setInspectorW]);

  // ---------- Aresta ----------
  function arestaStroke(s: Sinapse) {
    if (s.estado === "BLOQUEADO") return { color: "var(--crn-estado-bloqueado)", dash: "6 4" };
    if (s.estado === "AGUARDA_VALIDACAO") return { color: "var(--crn-estado-validacao)", dash: "2 3" };
    if (s.estado === "PAUSADO") return { color: "var(--crn-estado-pausado)", dash: "none" };
    return { color: B1_COR[s.b1], dash: "none" };
  }
  function arestaLargura(s: Sinapse, ativa: boolean) {
    // V4.2 ELEGANTE (Caio aprovou): range [1.25, 3.75]px, escala pra 200+ sinapses
    // Hierarquia de peso 3× mantida (TOC), linhas finas não competem (TDAH), clássico Tufte
    const base = 1.25 + s.peso * 2.5;
    return ativa ? base + 2 : base;
  }

  const toggleFiltroB1 = (b1: B1) => {
    setFiltroB1Arr(filtroB1Arr.includes(b1) ? filtroB1Arr.filter((x) => x !== b1) : [...filtroB1Arr, b1]);
  };

  const expandirPainel = (qual: "GRAFO" | "MATRIZ" | "RESET") => {
    if (qual === "GRAFO") setSplitPct(splitPct >= 80 ? 50 : 80);
    else if (qual === "MATRIZ") setSplitPct(splitPct <= 20 ? 50 : 20);
    else setSplitPct(50);
  };

  const selectedSinapse = selectedId !== null ? SINAPSES.find((s) => s.id === selectedId) : null;
  const historySinapse = showHistory !== null ? SINAPSES.find((s) => s.id === showHistory) : null;

  const modoCorEdicao = "#0e7490"; // azul-petróleo (Dr. Claude)
  const modoCor = (m: Modo) =>
    m === "EDICAO" ? modoCorEdicao : m === "SIMULACAO" ? "var(--crn-accent)" : "var(--crn-fg-dim)";

  const onCtxMenu = (e: React.MouseEvent, sinapseId: number) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, sinapseId });
  };

  return (
    <div className="craniotomia-root min-h-screen w-full flex flex-col text-[11px] leading-tight overflow-hidden">
      {/* ============ HEADER ============ */}
      <header className="flex-none border-b border-[var(--crn-border)] bg-[var(--crn-bg-panel)] px-3 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[var(--crn-accent-strong)]" />
            <div className="flex flex-col">
              <h1 className="craniotomia-serif text-sm font-semibold tracking-wide text-white">
                CRANIOTOMIA <span className="text-[var(--crn-fg-muted)] font-normal">— Split-View V4</span>
              </h1>
              <span className="text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
                Grafo · matriz espelho · cérebro do motor clínico
              </span>
            </div>
          </div>

          <div className="flex border border-[var(--crn-border-strong)]">
            <ModoBtn icon={Eye} label="VISUALIZAÇÃO" hint="V" active={modo === "VISUALIZACAO"} onClick={() => setModo("VISUALIZACAO")} />
            <ModoBtn icon={Pencil} label="EDIÇÃO" hint="E" active={modo === "EDICAO"} onClick={() => setModo("EDICAO")} accent={modoCorEdicao} />
            <ModoBtn icon={FlaskConical} label="SIMULAÇÃO" hint="S" active={modo === "SIMULACAO"} onClick={() => setModo("SIMULACAO")} accent="var(--crn-accent-strong)" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-[var(--crn-border)] bg-[var(--crn-bg)] px-2 h-7 w-56">
              <Search className="w-3 h-3 text-[var(--crn-fg-dim)] mr-2" />
              <input
                type="text"
                placeholder="Buscar sinapse, código, sinal..."
                className="bg-transparent border-none outline-none w-full text-[var(--crn-fg)] placeholder:text-[var(--crn-fg-dim)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              className="h-7 px-2 flex items-center gap-1 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)]"
              title="Atalhos (?)"
            >
              <Keyboard className="w-3 h-3" />
              <span className="text-[10px]">?</span>
            </button>
            <button
              disabled={modo !== "EDICAO"}
              className="h-7 px-3 flex items-center gap-1 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: modoCorEdicao }}
            >
              <Plus className="w-3 h-3" />
              <span className="font-medium">NOVA SINAPSE</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 gap-3">
          <div className="flex gap-1">
            <KpiPill label="TOTAL" value={RESUMO.total} />
            <KpiPill label="ATIVAS" value={RESUMO.ativas} color="var(--crn-estado-ativo)" />
            <KpiPill label="PAUSADAS" value={RESUMO.pausadas} color="var(--crn-estado-pausado)" />
            <KpiPill label="BLOQ" value={RESUMO.bloqueadas} color="var(--crn-estado-bloqueado)" />
            <KpiPill label="VALID" value={RESUMO.aguardando} color="var(--crn-estado-validacao)" />
            <KpiPill label="HITS 30D" value={RESUMO.hitsTotal} color="var(--crn-accent)" />
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(B1_LABEL) as B1[]).map((b1) => {
              const active = filtroB1.has(b1);
              return (
                <button
                  key={b1}
                  onClick={() => toggleFiltroB1(b1)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold border ${active ? "text-white" : "text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)]"}`}
                  style={{ borderColor: active ? B1_COR[b1] : "var(--crn-border)", backgroundColor: active ? B1_COR[b1] : "transparent" }}
                  title={B1_LABEL[b1]}
                >
                  {b1}
                </button>
              );
            })}
            {(filtroB1.size > 0 || isolatedNode) && (
              <button
                onClick={() => { setFiltroB1Arr([]); setIsolatedNode(null); }}
                className="ml-1 px-1.5 py-0.5 text-[9px] border border-[var(--crn-border)] text-[var(--crn-fg-dim)] hover:text-[var(--crn-fg)]"
              >LIMPAR</button>
            )}
          </div>
        </div>

        {isolatedNode && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--crn-estado-validacao)] bg-[var(--crn-estado-validacao)]/10 border border-[var(--crn-estado-validacao)] px-2 py-1">
            <Focus className="w-3 h-3" />
            <span>Isolado: <strong>{isolatedNode.split("|")[1]}</strong> ({filteredSinapses.length} sinapses) — Esc pra sair</span>
          </div>
        )}
      </header>

      {/* ============ BODY ============ */}
      <div ref={bodyContainerRef} className="flex-1 flex overflow-hidden">
        {/* LEGEND FIXA (colapsável) */}
        <aside className={`flex-none border-r border-[var(--crn-border)] bg-[var(--crn-bg-panel)] flex flex-col items-stretch py-2 gap-1 transition-[width] duration-150 ${legendCollapsed ? "w-[24px]" : "w-[64px]"}`}>
          <button
            onClick={() => setLegendCollapsed(!legendCollapsed)}
            className="self-end mr-1 mb-1 text-[var(--crn-fg-dim)] hover:text-[var(--crn-fg)]"
            title={legendCollapsed ? "Expandir legenda" : "Colapsar legenda"}
          >
            {legendCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
          {!legendCollapsed && <div className="text-[8px] text-[var(--crn-fg-dim)] uppercase tracking-wider text-center mb-1">B1</div>}
          {(Object.keys(B1_LABEL) as B1[]).map((b1) => (
            <div key={b1} className="flex flex-col items-center gap-0.5" title={B1_LABEL[b1]}>
              <div className={`h-2 ${legendCollapsed ? "w-4" : "w-8"}`} style={{ backgroundColor: B1_COR[b1] }} />
              {!legendCollapsed && <span className="text-[8px] text-[var(--crn-fg-muted)] font-bold">{b1}</span>}
            </div>
          ))}
          {!legendCollapsed && (
            <>
              <div className="border-t border-[var(--crn-border)] my-2" />
              <div className="text-[8px] text-[var(--crn-fg-dim)] uppercase tracking-wider text-center mb-1">FENO</div>
              {(Object.keys(TIPO_LABEL) as TipoFenotipo[]).map((t) => {
                const Ic = TipoIcon[t];
                return (
                  <div key={t} className="flex flex-col items-center gap-0.5" title={TIPO_LABEL[t]}>
                    <Ic className="w-3 h-3" style={{ color: TIPO_COR[t] }} />
                    <span className="text-[8px] text-[var(--crn-fg-muted)] font-bold">{t}</span>
                  </div>
                );
              })}
            </>
          )}
        </aside>

        {/* CENTRO: GRAFO + MATRIZ EMPILHADOS */}
        <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* GRAFO */}
          <div className="relative bg-[var(--crn-bg)] overflow-hidden" style={{ height: `${splitPct}%` }}>
            <div className="absolute inset-0 left-[220px] right-[240px]">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {filteredSinapses.map((s) => {
                  const li = leftNodes.findIndex((n) => n.id === s.b1 + "|" + s.b2);
                  const ri = rightNodes.findIndex((n) => n.id === s.tipo + "|" + s.fenotipo);
                  if (li === -1 || ri === -1) return null;
                  const y1 = ((li + 0.5) / Math.max(1, leftNodes.length)) * 100;
                  const y2 = ((ri + 0.5) / Math.max(1, rightNodes.length)) * 100;
                  const ativa = hoveredId === s.id || selectedId === s.id;
                  const stroke = arestaStroke(s);
                  const w = arestaLargura(s, ativa);
                  const opacity = hoveredId === null && selectedId === null ? 0.85 : ativa ? 1 : 0.18;
                  // Linha eletrificada: glow sutil em idle, pulso rapido no hover (amperagem)
                  // Subida rapida (~70ms), descida rapida — volta ao padrao quase instantaneo
                  const glowPx = ativa ? 4 : 0.8;
                  const haloPx = ativa ? 9 : 0;
                  const filterStr = ativa
                    ? `drop-shadow(0 0 ${glowPx}px ${stroke.color}) drop-shadow(0 0 ${haloPx}px ${stroke.color})`
                    : `drop-shadow(0 0 ${glowPx}px ${stroke.color}aa)`;
                  return (
                    <g key={s.id}>
                      {/* Núcleo da linha (recebe interação) */}
                      <path
                        d={`M 0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                        fill="none"
                        stroke={stroke.color}
                        strokeWidth={w}
                        strokeDasharray={stroke.dash}
                        vectorEffect="non-scaling-stroke"
                        style={{
                          opacity,
                          cursor: "pointer",
                          filter: filterStr,
                          transition: "opacity 70ms ease-out, stroke-width 70ms ease-out, filter 70ms ease-out",
                        }}
                        onMouseEnter={() => setHoveredId(s.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedId(s.id)}
                        onContextMenu={(e) => onCtxMenu(e, s.id)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* COLUNA ESQUERDA */}
            <div className="absolute top-0 bottom-0 left-0 w-[220px] border-r border-[var(--crn-border)] bg-[var(--crn-bg-panel)]/60 backdrop-blur-sm z-10 p-2">
              <div className="h-full relative">
                {leftNodes.map((node, i) => {
                  const top = ((i + 0.5) / Math.max(1, leftNodes.length)) * 100;
                  const isHighlighted = filteredSinapses.some((s) => (s.id === hoveredId || s.id === selectedId) && s.b1 + "|" + s.b2 === node.id);
                  return (
                    <div
                      key={node.id}
                      className="absolute w-full flex items-center pr-2"
                      style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                      onDoubleClick={() => setIsolatedNode(node.id)}
                      title="Duplo-clique pra isolar vizinhança"
                    >
                      <div className={`flex-1 border flex items-stretch h-7 cursor-pointer transition-all ${isHighlighted ? "border-[var(--crn-accent)] bg-[var(--crn-bg-row-hover)]" : "border-[var(--crn-border)] bg-[var(--crn-bg)] hover:border-[var(--crn-fg-dim)]"}`}>
                        <div className="w-2 flex-none" style={{ backgroundColor: B1_COR[node.b1] }} />
                        <div className="px-1.5 py-0.5 flex-1 flex items-center justify-between truncate">
                          <div className="flex flex-col leading-tight">
                            <span className="text-[8px] text-[var(--crn-fg-dim)] font-bold">{node.b1}</span>
                            <span className="text-[10px] text-[var(--crn-fg)] truncate font-medium">{node.b2}</span>
                          </div>
                          <span className="text-[9px] text-[var(--crn-fg-dim)] bg-[var(--crn-bg-row)] px-1 border border-[var(--crn-border)]">{node.count}</span>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 ml-1" style={{ backgroundColor: B1_COR[node.b1] }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUNA DIREITA */}
            <div className="absolute top-0 bottom-0 right-0 w-[240px] border-l border-[var(--crn-border)] bg-[var(--crn-bg-panel)]/60 backdrop-blur-sm z-10 p-2">
              <div className="h-full relative">
                {rightNodes.map((node, i) => {
                  const top = ((i + 0.5) / Math.max(1, rightNodes.length)) * 100;
                  const Ic = TipoIcon[node.tipo];
                  const isHighlighted = filteredSinapses.some((s) => (s.id === hoveredId || s.id === selectedId) && s.tipo + "|" + s.fenotipo === node.id);
                  return (
                    <div
                      key={node.id}
                      className="absolute w-full flex items-center pl-2"
                      style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                      onDoubleClick={() => setIsolatedNode(node.id)}
                      title="Duplo-clique pra isolar vizinhança"
                    >
                      <div className="w-1.5 h-1.5 mr-1" style={{ backgroundColor: TIPO_COR[node.tipo] }} />
                      <div className={`flex-1 border flex items-stretch h-7 cursor-pointer transition-all ${isHighlighted ? "border-[var(--crn-accent)] bg-[var(--crn-bg-row-hover)]" : "border-[var(--crn-border)] bg-[var(--crn-bg)] hover:border-[var(--crn-fg-dim)]"}`}>
                        <div className="w-6 flex items-center justify-center border-r border-[var(--crn-border)] flex-none" style={{ color: TIPO_COR[node.tipo] }}>
                          <Ic className="w-3 h-3" />
                        </div>
                        <div className="px-1.5 py-0.5 flex-1 flex items-center justify-between truncate">
                          <div className="flex flex-col leading-tight">
                            <span className="text-[8px] text-[var(--crn-fg-dim)] font-bold">{node.tipo}</span>
                            <span className="text-[10px] text-[var(--crn-fg)] truncate font-medium">{node.fenotipo}</span>
                          </div>
                          <span className="text-[9px] text-[var(--crn-fg-dim)] bg-[var(--crn-bg-row)] px-1 border border-[var(--crn-border)] ml-1">{node.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] uppercase tracking-wider z-20 pointer-events-none"
              style={{ color: modoCor(modo), borderBottom: `1px solid ${modoCor(modo)}` }}
            >
              GRAFO · MODO {modo}
            </div>
          </div>

          {/* DIVISOR ARRASTÁVEL + TOGGLE EXPANDIR */}
          <div
            onMouseDown={onSplitMouseDown}
            className="flex-none h-[6px] bg-[var(--crn-border)] hover:bg-[var(--crn-accent-strong)] cursor-row-resize relative group flex items-center justify-center"
            title="Arraste pra ajustar a divisão"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--crn-accent-strong)] opacity-30 pointer-events-none" />
            <div
              className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-60 group-hover:opacity-100"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => expandirPainel("GRAFO")}
                className="px-1.5 h-[14px] bg-[var(--crn-bg-panel)] border border-[var(--crn-border-strong)] text-[8px] text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)] flex items-center gap-0.5"
                title="Expandir grafo (clique = 80% · novo clique = 50%)"
              >
                <Maximize2 className="w-2.5 h-2.5" /> GRAFO
              </button>
              <button
                onClick={() => expandirPainel("RESET")}
                className="px-1.5 h-[14px] bg-[var(--crn-bg-panel)] border border-[var(--crn-border-strong)] text-[8px] text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)]"
                title="50/50 neutro"
              >50/50</button>
              <button
                onClick={() => expandirPainel("MATRIZ")}
                className="px-1.5 h-[14px] bg-[var(--crn-bg-panel)] border border-[var(--crn-border-strong)] text-[8px] text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)] flex items-center gap-0.5"
                title="Expandir matriz (clique = 80% · novo clique = 50%)"
              >
                <Maximize2 className="w-2.5 h-2.5" /> MATRIZ
              </button>
            </div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-[var(--crn-fg-dim)] pointer-events-none font-mono">
              {Math.round(splitPct)}% / {Math.round(100 - splitPct)}%
            </div>
          </div>

          {/* MATRIZ-ESPELHO */}
          <div className="overflow-auto bg-[var(--crn-bg)] flex-1 min-h-0" style={{ height: `${100 - splitPct}%` }}>
            <div className="px-3 py-1.5 border-b border-[var(--crn-border)] bg-[var(--crn-bg-panel)] flex items-center justify-between sticky top-0 z-20">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crn-fg-dim)]">
                MATRIZ-ESPELHO · {filteredSinapses.length} sinapses · sincronizada com o grafo acima
              </span>
              <span className="text-[9px] text-[var(--crn-fg-dim)]">
                {selectedId !== null ? `linha #${selectedId} selecionada` : "clique numa aresta ou linha · clique direito = histórico"}
              </span>
            </div>
            <table className="w-full text-left whitespace-nowrap" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky top-[28px] z-10 bg-[var(--crn-bg-panel)] shadow-[0_1px_0_var(--crn-border)] text-[9px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-1.5 w-14">BLOCO</th>
                  <th className="px-2 py-1.5 w-32">CÓDIGO V4</th>
                  <th className="px-2 py-1.5 w-[200px]">SINAL DE ANAMNESE</th>
                  <th className="px-2 py-1.5 w-24">TIPO</th>
                  <th className="px-2 py-1.5 w-[200px]">AÇÃO / FENÓTIPO</th>
                  <th className="px-2 py-1.5 w-20">PESO</th>
                  <th className="px-2 py-1.5 w-24">ESTADO</th>
                  <th className="px-2 py-1.5 w-10 text-center">GOV</th>
                  <th className="px-2 py-1.5 w-14 text-right">HITS</th>
                  <th className="px-2 py-1.5 w-20 text-right">ÚLT. ED.</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {filteredSinapses.map((s, idx) => {
                  const bgClass =
                    s.estado === "BLOQUEADO" ? "bg-[#1f0f15]" :
                    s.estado === "AGUARDA_VALIDACAO" ? "bg-[#211d0e]" :
                    idx % 2 === 0 ? "bg-[var(--crn-bg-row)]" : "bg-[var(--crn-bg-row-alt)]";
                  const Ic = TipoIcon[s.tipo];
                  const GIc = GovIcon[s.governanca];
                  const isHovered = s.id === hoveredId;
                  const isSelected = s.id === selectedId;
                  return (
                    <tr
                      key={s.id}
                      ref={(el) => { if (el) tableRowRefs.current.set(s.id, el); }}
                      onMouseEnter={() => setHoveredId(s.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(s.id)}
                      onContextMenu={(e) => onCtxMenu(e, s.id)}
                      className={`group cursor-pointer ${bgClass} ${isSelected ? "bg-[var(--crn-bg-row-hover)]" : ""}`}
                      style={{
                        // Neon retangular ao redor da row INTEIRA na cor da sinapse — surge/some em 70ms.
                        // Como table usa border-separate, o boxShadow no <tr> renderiza por baixo das tds (que aplicam a borda visivel).
                        boxShadow: (isHovered || isSelected)
                          ? `0 0 0 1px ${B1_COR[s.b1]}, 0 0 8px ${B1_COR[s.b1]}cc, 0 0 18px ${B1_COR[s.b1]}55`
                          : "none",
                        transition: "box-shadow 70ms ease-out, background-color 70ms ease-out",
                      }}
                    >
                      <td className="px-2 py-1">
                        <span
                          className="inline-flex px-1.5 py-0.5 font-bold tracking-widest text-[8px] border"
                          style={{ color: B1_COR[s.b1], borderColor: `${B1_COR[s.b1]}60`, backgroundColor: `${B1_COR[s.b1]}15` }}
                        >{s.b1}</span>
                      </td>
                      <td className="px-2 py-1 font-mono text-[var(--crn-fg-muted)]">{s.codigoV4}</td>
                      <td className="px-2 py-1 max-w-[200px] truncate" title={s.sinal}>{s.sinal}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1" style={{ color: TIPO_COR[s.tipo] }}>
                          <Ic className="w-3 h-3" />
                          <span className="text-[9px] font-semibold">{TIPO_LABEL[s.tipo]}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1 max-w-[200px] truncate text-[var(--crn-accent)]" title={s.fenotipo}>{s.fenotipo}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <span className="w-7 text-[9px] text-[var(--crn-fg-muted)]">{s.peso.toFixed(2)}</span>
                          <div className="h-1.5 w-10 bg-[#1e2c47] overflow-hidden border border-[#2a3d63]">
                            <div className="h-full bg-[var(--crn-accent)] opacity-80" style={{ width: `${s.peso * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5" style={{ backgroundColor: ESTADO_COR[s.estado] }} />
                          <span className="text-[9px]" style={{ color: ESTADO_COR[s.estado] }}>{s.estado.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <GIc
                          className="w-3.5 h-3.5 inline-block"
                          style={{ color: s.governanca === "AUTO" ? "var(--crn-fg-dim)" : s.governanca === "MEDICO" ? "var(--crn-accent)" : "var(--crn-estado-validacao)" }}
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-[var(--crn-fg-muted)]">
                        {s.hits30d > 0 ? s.hits30d : <span className="opacity-40">-</span>}
                      </td>
                      <td className="px-2 py-1 text-right text-[9px] text-[var(--crn-fg-dim)]">{s.ultimaEdicao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* INSPETOR LATERAL ARRASTÁVEL + COLAPSÁVEL */}
        {!inspectorCollapsed && (
          <div
            onMouseDown={onInspectorMouseDown}
            className="flex-none w-[4px] cursor-col-resize bg-[var(--crn-border)] hover:bg-[var(--crn-accent-strong)]"
            title="Arraste pra redimensionar o inspetor"
          />
        )}
        <aside
          className="flex-none bg-[var(--crn-bg-panel)] border-l border-[var(--crn-border)] flex flex-col overflow-hidden transition-[width] duration-150"
          style={{ width: inspectorCollapsed ? 24 : inspectorW }}
        >
          <div className="h-9 border-b border-[var(--crn-border)] flex items-center px-2 justify-between">
            <button
              onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
              className="text-[var(--crn-fg-dim)] hover:text-[var(--crn-fg)]"
              title={inspectorCollapsed ? "Expandir inspetor" : "Colapsar inspetor"}
            >
              {inspectorCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {!inspectorCollapsed && (
              <>
                <h2 className="text-[11px] font-semibold text-[var(--crn-fg)]">INSPETOR</h2>
                {selectedSinapse && <span className="text-[9px] text-[var(--crn-fg-dim)]">#{selectedSinapse.id}</span>}
              </>
            )}
          </div>

          {!inspectorCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {selectedSinapse ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[8px] text-[var(--crn-fg-dim)] uppercase">Código V4</span>
                      <span className="font-bold text-[12px] tracking-wider text-[var(--crn-accent)] truncate" title={selectedSinapse.codigoV4}>{selectedSinapse.codigoV4}</span>
                    </div>
                    <div
                      className="px-1.5 py-0.5 text-[9px] font-bold border whitespace-nowrap"
                      style={{ borderColor: ESTADO_COR[selectedSinapse.estado], color: ESTADO_COR[selectedSinapse.estado], backgroundColor: `${ESTADO_COR[selectedSinapse.estado]}1a` }}
                    >{selectedSinapse.estado.replace("_", " ")}</div>
                  </div>

                  <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-2 flex flex-col gap-2">
                    <div>
                      <span className="text-[8px] text-[var(--crn-fg-dim)] uppercase font-bold mb-0.5 block">Genótipo</span>
                      <div className="flex items-center gap-2">
                        <div className="px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: B1_COR[selectedSinapse.b1] }}>{selectedSinapse.b1}</div>
                        <span className="text-[10px] text-[var(--crn-fg)] truncate">{selectedSinapse.sinal}</span>
                      </div>
                    </div>
                    <div className="h-px bg-[var(--crn-border)]" />
                    <div>
                      <span className="text-[8px] text-[var(--crn-fg-dim)] uppercase font-bold mb-0.5 block">Fenótipo</span>
                      <div className="flex items-center gap-2">
                        <div className="px-1.5 py-0.5 text-[9px] font-bold border flex items-center gap-1" style={{ color: TIPO_COR[selectedSinapse.tipo], borderColor: TIPO_COR[selectedSinapse.tipo] }}>
                          {React.createElement(TipoIcon[selectedSinapse.tipo], { className: "w-3 h-3" })}
                          {selectedSinapse.tipo}
                        </div>
                        <span className="text-[10px] text-[var(--crn-fg)] font-medium truncate">{selectedSinapse.fenotipo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Box label="PESO" value={selectedSinapse.peso.toFixed(2)} />
                    <Box label="GOV" value={selectedSinapse.governanca} />
                    <Box label="HITS 30D" value={String(selectedSinapse.hits30d)} />
                    <Box label="ÚLT. ED." value={selectedSinapse.ultimaEdicao} />
                  </div>

                  {selectedSinapse.requerValidacao && (
                    <div className="border border-[var(--crn-estado-validacao)] bg-[var(--crn-estado-validacao)]/10 p-2 flex items-start gap-2 text-[var(--crn-estado-validacao)]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-none" />
                      <div className="text-[9px]">
                        <span className="font-bold block mb-0.5">REQUER VALIDAÇÃO</span>
                        <span className="opacity-80">Não executa automaticamente sem aprovação do médico titular.</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowHistory(selectedSinapse.id)}
                    className="h-7 flex items-center justify-center gap-1.5 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[10px] text-[var(--crn-fg)]"
                  >
                    <History className="w-3 h-3" /> VER HISTÓRICO COMPLETO
                  </button>

                  <div className="mt-1 flex flex-col gap-1">
                    <button
                      disabled={modo !== "EDICAO"}
                      className="h-7 flex items-center justify-center gap-1.5 border text-[10px] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                      style={{ backgroundColor: modo === "EDICAO" ? modoCorEdicao : "var(--crn-bg-row)", borderColor: modo === "EDICAO" ? modoCorEdicao : "var(--crn-border)" }}
                    >
                      <Pencil className="w-3 h-3" /> {modo === "EDICAO" ? "EDITAR SINAPSE" : "ATIVE MODO EDIÇÃO"}
                    </button>
                    <div className="flex gap-1">
                      <button disabled={modo !== "EDICAO"} className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[10px] disabled:opacity-40">
                        {selectedSinapse.estado === "PAUSADO" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {selectedSinapse.estado === "PAUSADO" ? "RETOMAR" : "PAUSAR"}
                      </button>
                      <button disabled={modo !== "EDICAO"} className="flex-1 h-7 flex items-center justify-center gap-1.5 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-red-900/30 hover:text-red-400 text-[10px] text-[var(--crn-fg)] disabled:opacity-40">
                        <Trash2 className="w-3 h-3" /> EXCLUIR
                      </button>
                    </div>
                    <button disabled={modo !== "EDICAO"} className="h-7 flex items-center justify-center gap-1.5 bg-[var(--crn-bg-row)] border border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] text-[10px] text-[var(--crn-fg-dim)] disabled:opacity-40">
                      <Copy className="w-3 h-3" /> DUPLICAR
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--crn-fg-dim)] gap-2 text-center px-4">
                  <Activity className="w-6 h-6 opacity-40" />
                  <p className="text-[10px] leading-relaxed">
                    Clique numa aresta do grafo ou numa linha da matriz pra inspecionar.
                    <br /><span className="opacity-70">Duplo-clique num nó pra isolar.</span>
                    <br /><span className="opacity-70">Clique direito = histórico.</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="flex-none h-7 border-t border-[var(--crn-border)] bg-[var(--crn-bg-panel)] flex items-center px-3 justify-between text-[9px] text-[var(--crn-fg-dim)]">
        <div className="flex items-center gap-3">
          <span><strong className="text-[var(--crn-accent)]">●</strong> ativa</span>
          <span><strong style={{ color: "var(--crn-estado-bloqueado)" }}>━ ━</strong> bloqueada</span>
          <span><strong style={{ color: "var(--crn-estado-validacao)" }}>┄ ┄</strong> aguarda validação</span>
          <span><strong style={{ color: "var(--crn-estado-pausado)" }}>━</strong> pausada</span>
          <span className="ml-3">espessura = peso · cor = B1 origem</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">V</kbd>
          <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">E</kbd>
          <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">S</kbd>
          <span>modo</span>
          <span className="mx-1">·</span>
          <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">?</kbd>
          <span>atalhos</span>
          <span className="mx-1">·</span>
          <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">Esc</kbd>
          <span>limpar</span>
        </div>
      </footer>

      {/* CONTEXT MENU (clique direito) */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[var(--crn-bg-panel)] border border-[var(--crn-accent)] py-1 shadow-2xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowHistory(ctxMenu.sinapseId); setCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--crn-fg)] hover:bg-[var(--crn-bg-row-hover)] flex items-center gap-2"
          >
            <History className="w-3 h-3" /> Ver linha do tempo
          </button>
          <button
            onClick={() => { setSelectedId(ctxMenu.sinapseId); setCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--crn-fg)] hover:bg-[var(--crn-bg-row-hover)] flex items-center gap-2"
          >
            <Eye className="w-3 h-3" /> Selecionar no inspetor
          </button>
          <button
            disabled={modo !== "EDICAO"}
            className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--crn-fg)] hover:bg-[var(--crn-bg-row-hover)] flex items-center gap-2 disabled:opacity-40"
          >
            <Copy className="w-3 h-3" /> Duplicar sinapse
          </button>
        </div>
      )}

      {/* HISTÓRICO DA SINAPSE (Dr. Claude — melhoria 2) */}
      {historySinapse && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setShowHistory(null)}>
          <div
            className="bg-[var(--crn-bg-panel)] border border-[var(--crn-accent)] w-[640px] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-10 border-b border-[var(--crn-border)] flex items-center px-3 justify-between">
              <h3 className="craniotomia-serif text-sm text-[var(--crn-accent)] flex items-center gap-2">
                <History className="w-4 h-4" /> HISTÓRIA DA SINAPSE · {historySinapse.codigoV4}
              </h3>
              <button onClick={() => setShowHistory(null)} className="text-[var(--crn-fg-dim)] hover:text-[var(--crn-fg)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Sparkline taxa aceite */}
              <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--crn-fg-dim)] flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Taxa de aceite (últimos 30 dias)
                  </span>
                  <span className="text-[13px] font-mono text-[var(--crn-estado-ativo)]">78%</span>
                </div>
                <svg className="w-full h-12" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="var(--crn-accent)"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    points="0,22 5,20 10,18 15,19 20,16 25,15 30,17 35,14 40,12 45,13 50,11 55,10 60,8 65,10 70,9 75,7 80,8 85,6 90,7 95,5 100,4"
                  />
                </svg>
                <div className="flex justify-between text-[8px] text-[var(--crn-fg-dim)] mt-1">
                  <span>30d atrás</span><span>hoje</span>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--crn-fg-dim)] flex items-center gap-1 mb-2">
                  <Clock className="w-3 h-3" /> Linha do tempo
                </span>
                <ul className="space-y-2">
                  {[
                    { d: historySinapse.ultimaEdicao, who: "Caio (CEO)", action: "alterou peso", diff: `0.80 → ${historySinapse.peso.toFixed(2)}` },
                    { d: "02/mai/2026", who: "Sistema", action: `disparou ${historySinapse.hits30d}× em pacientes`, diff: "78% aceitação" },
                    { d: "20/abr/2026", who: "Dra. Manus", action: "validou governança", diff: `→ ${historySinapse.governanca}` },
                    { d: "12/abr/2026", who: "Caio (CEO)", action: "criou sinapse", diff: `estado inicial: ATIVO · peso 0.80` },
                  ].map((ev, i) => (
                    <li key={i} className="flex gap-2 items-start text-[10px]">
                      <GitCommit className="w-3 h-3 mt-0.5 text-[var(--crn-accent-strong)] flex-none" />
                      <div className="flex-1 border-l border-[var(--crn-border)] pl-2">
                        <div className="flex items-center gap-2 text-[var(--crn-fg)]">
                          <span className="text-[var(--crn-fg-dim)]">{ev.d}</span>
                          <span className="font-bold">{ev.who}</span>
                          <span>{ev.action}</span>
                        </div>
                        <div className="text-[var(--crn-fg-muted)] font-mono text-[9px] mt-0.5">{ev.diff}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pacientes anonimizados */}
              <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-3">
                <span className="text-[10px] uppercase tracking-wider text-[var(--crn-fg-dim)] block mb-2">
                  Pacientes onde disparou (últimos 30d · anonimizado LGPD)
                </span>
                <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-[var(--crn-fg-muted)]">
                  {Array.from({ length: Math.min(12, historySinapse.hits30d) }).map((_, i) => (
                    <div key={i} className="border border-[var(--crn-border)] bg-[var(--crn-bg-row)] px-1.5 py-0.5">
                      PAC-{String(1000 + i * 73).padStart(5, "0")}
                    </div>
                  ))}
                  {historySinapse.hits30d > 12 && (
                    <div className="px-1.5 py-0.5 text-[var(--crn-fg-dim)]">+ {historySinapse.hits30d - 12}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-9 border-t border-[var(--crn-border)] flex items-center justify-end px-3">
              <button onClick={() => setShowHistory(null)} className="px-3 h-6 text-[10px] bg-[var(--crn-bg-row)] border border-[var(--crn-border)] text-[var(--crn-fg)] hover:bg-[var(--crn-bg-row-hover)]">
                FECHAR (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHORTCUTS OVERLAY */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[var(--crn-bg-panel)] border border-[var(--crn-accent)] p-6 max-w-md text-[11px] text-[var(--crn-fg)]">
            <h3 className="craniotomia-serif text-base mb-4 text-[var(--crn-accent)]">ATALHOS DE TECLADO</h3>
            <table className="w-full">
              <tbody className="leading-relaxed">
                <ShortcutRow k="V" desc="Modo Visualização" />
                <ShortcutRow k="E" desc="Modo Edição (azul-petróleo)" />
                <ShortcutRow k="S" desc="Modo Simulação" />
                <ShortcutRow k="?" desc="Mostrar/esconder este painel" />
                <ShortcutRow k="Esc" desc="Sair de isolar, limpar seleção, fechar overlays" />
                <ShortcutRow k="Duplo-clique no nó" desc="Isolar vizinhança da sinapse" />
                <ShortcutRow k="Clique na aresta" desc="Selecionar (sincroniza com matriz)" />
                <ShortcutRow k="Clique na linha" desc="Selecionar (sincroniza com grafo)" />
                <ShortcutRow k="Clique direito" desc="Histórico + ações contextuais" />
                <ShortcutRow k="Arrastar divisor" desc="Ajustar Grafo/Matriz · botões = expandir" />
              </tbody>
            </table>
            <div className="mt-4 pt-3 border-t border-[var(--crn-border)] text-[9px] text-[var(--crn-fg-dim)]">
              <strong className="text-[var(--crn-accent)]">Persistência:</strong> modo, seleção, filtros, busca, tamanho dos painéis — tudo salvo automaticamente entre sessões.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModoBtn({ icon: Icon, label, hint, active, accent, onClick }: {
  icon: React.ElementType; label: string; hint: string; active: boolean; accent?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 flex items-center gap-1.5 text-[10px] font-semibold border-r border-[var(--crn-border-strong)] last:border-r-0 transition-colors ${active ? "text-white" : "text-[var(--crn-fg-muted)] hover:text-[var(--crn-fg)]"}`}
      style={{ backgroundColor: active ? (accent ?? "var(--crn-fg-dim)") : "transparent" }}
      title={`${label} (${hint})`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      <kbd className="text-[8px] opacity-60 font-sans">{hint}</kbd>
    </button>
  );
}

function KpiPill({ label, value, color = "var(--crn-fg)" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[var(--crn-bg)] border border-[var(--crn-border)] px-2 py-1 flex items-center gap-2">
      <span className="text-[8px] text-[var(--crn-fg-dim)] font-bold tracking-wider uppercase">{label}</span>
      <span className="text-[12px] font-mono font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--crn-border)] bg-[var(--crn-bg)] p-1.5">
      <span className="text-[8px] text-[var(--crn-fg-dim)] uppercase font-bold block mb-0.5">{label}</span>
      <span className="text-[10px] text-[var(--crn-fg)] font-medium truncate block">{value}</span>
    </div>
  );
}

function ShortcutRow({ k, desc }: { k: string; desc: string }) {
  return (
    <tr>
      <td className="py-0.5 pr-4">
        <kbd className="px-1.5 py-0.5 bg-[var(--crn-bg-row)] border border-[var(--crn-border-strong)] text-[var(--crn-accent)] font-sans text-[10px]">{k}</kbd>
      </td>
      <td className="py-0.5 text-[var(--crn-fg-muted)]">{desc}</td>
    </tr>
  );
}

// ============================================================
// (Componente SinapseWave removido — design final usa glow CSS puro no path,
//  sem animação JS, sem som, sem zigzag — clássico/sóbrio/austero.)
// ============================================================

export default CraniotomiaV4;
