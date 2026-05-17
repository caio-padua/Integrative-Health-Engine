import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Pause,
  Trash2,
  Copy,
  GitBranch,
} from "lucide-react";
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

// Group data by B1 and B2
const buildTree = () => {
  const tree: Record<B1, Record<string, Sinapse[]>> = {} as any;
  Object.keys(B1_LABEL).forEach((b1) => {
    tree[b1 as B1] = {};
  });

  SINAPSES.forEach((s) => {
    if (!tree[s.b1]) tree[s.b1] = {};
    if (!tree[s.b1][s.b2]) tree[s.b1][s.b2] = [];
    tree[s.b1][s.b2].push(s);
  });

  return tree;
};

export function ArvoreDossier() {
  const tree = useMemo(() => buildTree(), []);
  const [expandedB1, setExpandedB1] = useState<Record<B1, boolean>>({
    QSNT: true,
  } as Record<B1, boolean>);
  const [selectedB1, setSelectedB1] = useState<B1 | null>("QSNT");
  const [selectedB2, setSelectedB2] = useState<string | null>(null);
  const [selectedSinapse, setSelectedSinapse] = useState<Sinapse | null>(
    SINAPSES[0]
  );
  const [search, setSearch] = useState("");

  const toggleB1 = (b1: B1) => {
    setExpandedB1((prev) => ({ ...prev, [b1]: !prev[b1] }));
  };

  const handleSelectB1 = (b1: B1) => {
    setSelectedB1(b1);
    setSelectedB2(null);
    setExpandedB1((prev) => ({ ...prev, [b1]: true }));
  };

  const handleSelectB2 = (b1: B1, b2: string) => {
    setSelectedB1(b1);
    setSelectedB2(b2);
  };

  const filteredSinapses = useMemo(() => {
    let list = SINAPSES;
    if (selectedB1 && selectedB2) {
      list = list.filter((s) => s.b1 === selectedB1 && s.b2 === selectedB2);
    } else if (selectedB1) {
      list = list.filter((s) => s.b1 === selectedB1);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.codigoV4.toLowerCase().includes(q) ||
          s.sinal.toLowerCase().includes(q) ||
          s.fenotipo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedB1, selectedB2, search]);

  const getTipoIcon = (tipo: TipoFenotipo) => {
    switch (tipo) {
      case "FORM":
        return <Activity className="w-3 h-3" style={{ color: TIPO_COR[tipo] }} />;
      case "INJE":
        return <GitBranch className="w-3 h-3" style={{ color: TIPO_COR[tipo] }} />;
      case "IMPL":
        return <Activity className="w-3 h-3" style={{ color: TIPO_COR[tipo] }} />;
      case "EXAM":
        return <Search className="w-3 h-3" style={{ color: TIPO_COR[tipo] }} />;
      case "PROT":
        return <GitBranch className="w-3 h-3" style={{ color: TIPO_COR[tipo] }} />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="craniotomia-root min-h-screen w-full flex flex-col text-[12px]">
      {/* HEADER */}
      <header
        className="h-12 flex items-center justify-between px-4 border-b"
        style={{ borderColor: "var(--crn-border)" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="craniotomia-serif font-semibold text-[14px] text-[var(--crn-fg)] tracking-wide uppercase">
            CRANIOTOMIA — Editor de Sinapses do Motor
          </h1>
          <div
            className="flex items-center gap-2 px-2 py-1 bg-[var(--crn-bg-panel)] border text-[11px]"
            style={{ borderColor: "var(--crn-border)" }}
          >
            <span className="text-[var(--crn-fg-muted)]">REGRAS:</span>
            <span className="font-bold text-[var(--crn-fg)]">{RESUMO.total}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--crn-fg-dim)]" />
            <input
              type="text"
              placeholder="Buscar sinapses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[var(--crn-bg-panel)] border pl-8 pr-3 py-1.5 w-64 text-[12px] focus:outline-none focus:border-[var(--crn-accent)] transition-colors placeholder:text-[var(--crn-fg-dim)]"
              style={{ borderColor: "var(--crn-border)", color: "var(--crn-fg)" }}
            />
          </div>
          <button
            className="flex items-center gap-2 px-3 py-1.5 border bg-[var(--crn-bg-panel)] hover:bg-[var(--crn-bg-row-hover)] transition-colors"
            style={{ borderColor: "var(--crn-border)" }}
          >
            <Filter className="w-3.5 h-3.5 text-[var(--crn-fg-muted)]" />
            <span>Filtros</span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1.5 border bg-[var(--crn-accent-strong)] text-[#0b1426] hover:opacity-90 font-medium transition-opacity"
            style={{ borderColor: "var(--crn-accent-strong)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Sinapse</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT 3 COLS */}
      <main className="flex-1 flex overflow-hidden">
        {/* ESQUERDA: Arvore */}
        <aside
          className="w-[260px] flex-shrink-0 border-r bg-[var(--crn-bg-panel)] flex flex-col"
          style={{ borderColor: "var(--crn-border)" }}
        >
          <div
            className="p-2 border-b text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-muted)]"
            style={{ borderColor: "var(--crn-border)" }}
          >
            Sumario Genotipico (B1/B2)
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.keys(B1_LABEL).map((b1Key) => {
              const b1 = b1Key as B1;
              const b2Keys = Object.keys(tree[b1] || {});
              const totalB1 = b2Keys.reduce(
                (acc, b2) => acc + tree[b1][b2].length,
                0
              );
              const isExpanded = expandedB1[b1];
              const isSelected = selectedB1 === b1 && !selectedB2;

              return (
                <div key={b1} className="flex flex-col">
                  {/* B1 Node */}
                  <div
                    className={`flex items-center justify-between p-1.5 cursor-pointer border-l-2 transition-colors ${
                      isSelected
                        ? "bg-[var(--crn-bg-row-hover)]"
                        : "hover:bg-[var(--crn-bg-row-hover)]"
                    }`}
                    style={{
                      borderLeftColor: B1_COR[b1],
                    }}
                    onClick={() => {
                      if (b2Keys.length === 0) return;
                      if (!isExpanded) toggleB1(b1);
                      handleSelectB1(b1);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleB1(b1);
                        }}
                        className="p-0.5 hover:bg-[var(--crn-bg)] text-[var(--crn-fg-dim)]"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </div>
                      <span
                        className="font-medium"
                        style={{ color: isSelected ? "var(--crn-fg)" : "var(--crn-fg-muted)" }}
                      >
                        {b1} - {B1_LABEL[b1]}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--crn-fg-dim)]">
                      {totalB1}
                    </span>
                  </div>

                  {/* B2 Nodes */}
                  {isExpanded &&
                    b2Keys.map((b2) => {
                      const count = tree[b1][b2].length;
                      const isSel = selectedB1 === b1 && selectedB2 === b2;
                      return (
                        <div
                          key={b2}
                          className={`flex items-center justify-between py-1 pr-1.5 pl-7 cursor-pointer border-l-2 border-transparent transition-colors ${
                            isSel
                              ? "bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg)]"
                              : "text-[var(--crn-fg-muted)] hover:bg-[var(--crn-bg-row)]"
                          }`}
                          onClick={() => handleSelectB2(b1, b2)}
                        >
                          <span className="text-[11px] truncate mr-2">↳ {b2}</span>
                          <span className="text-[10px] text-[var(--crn-fg-dim)]">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTRAL: Lista de Sinapses */}
        <section className="flex-1 flex flex-col min-w-0 bg-[var(--crn-bg)]">
          <div
            className="flex items-center px-4 py-2 border-b bg-[var(--crn-bg-panel)]"
            style={{ borderColor: "var(--crn-border)" }}
          >
            <h2 className="craniotomia-serif font-semibold text-[14px]">
              {selectedB1 ? (
                <>
                  <span style={{ color: B1_COR[selectedB1] }}>{selectedB1}</span> /{" "}
                  {B1_LABEL[selectedB1]}
                  {selectedB2 && ` / ${selectedB2}`}
                </>
              ) : (
                "Todas as Sinapses"
              )}
            </h2>
            <span className="ml-3 text-[11px] text-[var(--crn-fg-dim)]">
              {filteredSinapses.length} registro(s)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Tabela-like list */}
            <div className="flex flex-col">
              {/* Header row */}
              <div
                className="flex items-center px-4 py-1.5 border-b text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)]"
                style={{ borderColor: "var(--crn-border)" }}
              >
                <div className="w-[160px] flex-shrink-0">Codigo V4</div>
                <div className="flex-1 min-w-0">Termo de Anamnese / Fenotipo</div>
                <div className="w-[100px] flex-shrink-0 text-center">Status</div>
                <div className="w-[60px] flex-shrink-0 text-right">Peso</div>
                <div className="w-[80px] flex-shrink-0 text-right">Hits/30d</div>
              </div>

              {/* Rows */}
              {filteredSinapses.map((sinapse, i) => {
                const isSelected = selectedSinapse?.id === sinapse.id;
                const isAlt = i % 2 !== 0;
                return (
                  <div
                    key={sinapse.id}
                    onClick={() => setSelectedSinapse(sinapse)}
                    className={`flex items-start px-4 py-2.5 border-b border-transparent cursor-pointer transition-colors group ${
                      isSelected
                        ? "bg-[var(--crn-bg-row-hover)] border-l-[3px]"
                        : isAlt
                        ? "bg-[var(--crn-bg-row-alt)] border-l-[3px] border-l-transparent hover:bg-[var(--crn-bg-row-hover)]"
                        : "bg-[var(--crn-bg-row)] border-l-[3px] border-l-transparent hover:bg-[var(--crn-bg-row-hover)]"
                    }`}
                    style={{
                      borderBottomColor: "var(--crn-border)",
                      borderLeftColor: isSelected ? B1_COR[sinapse.b1] : "transparent",
                    }}
                  >
                    {/* Codigo */}
                    <div className="w-[160px] flex-shrink-0 pt-0.5">
                      <div
                        className="inline-block px-1.5 py-0.5 border text-[11px] tracking-tight bg-[var(--crn-bg)]"
                        style={{
                          borderColor: B1_COR[sinapse.b1],
                          color: "var(--crn-fg)",
                        }}
                      >
                        {sinapse.codigoV4}
                      </div>
                      {sinapse.requerValidacao && (
                        <div className="flex items-center gap-1 mt-1.5 text-[var(--crn-estado-validacao)]">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="text-[9px] uppercase tracking-wider">Validacao req.</span>
                        </div>
                      )}
                    </div>

                    {/* Descricao */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="craniotomia-serif italic text-[13px] text-[var(--crn-fg)] mb-1 leading-snug">
                        "{sinapse.sinal}"
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getTipoIcon(sinapse.tipo)}
                        <span
                          className="text-[10px] px-1 py-0.5 border"
                          style={{
                            borderColor: TIPO_COR[sinapse.tipo],
                            color: TIPO_COR[sinapse.tipo],
                          }}
                        >
                          {sinapse.tipo}
                        </span>
                        <span className="text-[11px] text-[var(--crn-fg-muted)] font-medium truncate">
                          {sinapse.fenotipo}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-[100px] flex-shrink-0 text-center pt-1">
                      <span
                        className="text-[10px] px-2 py-0.5 border inline-block"
                        style={{
                          borderColor: ESTADO_COR[sinapse.estado],
                          color: ESTADO_COR[sinapse.estado],
                        }}
                      >
                        {sinapse.estado.replace("_", " ")}
                      </span>
                    </div>

                    {/* Peso */}
                    <div className="w-[60px] flex-shrink-0 text-right pt-1 text-[var(--crn-fg-dim)]">
                      {(sinapse.peso).toFixed(2)}
                    </div>

                    {/* Hits */}
                    <div className="w-[80px] flex-shrink-0 text-right pt-1">
                      <div className="flex items-center justify-end gap-1.5 text-[var(--crn-fg-muted)]">
                        <Activity className="w-3 h-3" />
                        <span>{sinapse.hits30d}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSinapses.length === 0 && (
                <div className="p-8 text-center text-[var(--crn-fg-dim)] italic craniotomia-serif">
                  Nenhuma sinapse encontrada para os filtros atuais.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* DIREITA: Ficha Tecnica (Dossier) */}
        <aside
          className="w-[340px] flex-shrink-0 border-l bg-[var(--crn-bg-panel)] flex flex-col"
          style={{ borderColor: "var(--crn-border)" }}
        >
          {selectedSinapse ? (
            <>
              {/* Header Dossier */}
              <div
                className="p-4 border-b flex flex-col gap-3"
                style={{ borderColor: "var(--crn-border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)]">
                    Ficha Tecnica
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button className="p-1 hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg-muted)] transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg-muted)] transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-estado-pausado)] transition-colors">
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-b1-qdgn)] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className="px-2 py-1.5 border text-center font-bold text-[14px] tracking-wider"
                  style={{
                    borderColor: B1_COR[selectedSinapse.b1],
                    color: "var(--crn-fg)",
                    backgroundColor: "var(--crn-bg)",
                  }}
                >
                  {selectedSinapse.codigoV4}
                </div>

                <div
                  className="craniotomia-serif italic text-[15px] leading-relaxed"
                  style={{ color: "var(--crn-fg)" }}
                >
                  "{selectedSinapse.sinal}"
                </div>
              </div>

              {/* Body Dossier */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Acao Terapeutica */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)] mb-1">
                    Acao Terapeutica (Fenotipo)
                  </div>
                  <div
                    className="p-3 border flex flex-col gap-2 bg-[var(--crn-bg)]"
                    style={{ borderColor: "var(--crn-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      {getTipoIcon(selectedSinapse.tipo)}
                      <span
                        className="text-[11px] px-1.5 py-0.5 border"
                        style={{
                          borderColor: TIPO_COR[selectedSinapse.tipo],
                          color: TIPO_COR[selectedSinapse.tipo],
                        }}
                      >
                        {selectedSinapse.tipo}
                      </span>
                    </div>
                    <div className="font-medium text-[13px] leading-snug">
                      {selectedSinapse.fenotipo}
                    </div>
                  </div>
                </div>

                {/* Status & Metricas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)]">
                      Estado
                    </div>
                    <div
                      className="px-2 py-1 border inline-flex items-center gap-1.5 text-[11px]"
                      style={{
                        borderColor: ESTADO_COR[selectedSinapse.estado],
                        color: ESTADO_COR[selectedSinapse.estado],
                        backgroundColor: "var(--crn-bg)",
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-none"
                        style={{ backgroundColor: ESTADO_COR[selectedSinapse.estado] }}
                      ></div>
                      {selectedSinapse.estado.replace("_", " ")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)]">
                      Peso Relativo
                    </div>
                    <div className="px-2 py-1 border border-[var(--crn-border)] bg-[var(--crn-bg)] text-[12px]">
                      {selectedSinapse.peso.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Governanca */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--crn-fg-dim)] mb-1">
                    Governanca / Compliance
                  </div>
                  <div
                    className="p-3 border flex flex-col gap-2"
                    style={{
                      borderColor: selectedSinapse.requerValidacao
                        ? "var(--crn-estado-validacao)"
                        : "var(--crn-border)",
                      backgroundColor: "var(--crn-bg)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className="w-4 h-4"
                        style={{
                          color: selectedSinapse.requerValidacao
                            ? "var(--crn-estado-validacao)"
                            : "var(--crn-fg-muted)",
                        }}
                      />
                      <span
                        className="text-[12px] font-bold"
                        style={{
                          color: selectedSinapse.requerValidacao
                            ? "var(--crn-estado-validacao)"
                            : "var(--crn-fg)",
                        }}
                      >
                        Nivel: {selectedSinapse.governanca.replace("_", " ")}
                      </span>
                    </div>
                    <div className="craniotomia-serif text-[12px] text-[var(--crn-fg-muted)] leading-relaxed">
                      {selectedSinapse.requerValidacao
                        ? `Esta regra exige validacao humana mandatoria pelo papel ${selectedSinapse.governanca.replace("_", " ")} antes da liberacao ao paciente.`
                        : "Esta regra possui execucao automatica imediata pelo motor clinico (AUTO), dispensando validacao intermediaria."}
                    </div>
                  </div>
                </div>

                {/* Historico */}
                <div className="space-y-2 pt-2 border-t border-[var(--crn-border)]">
                  <div className="flex justify-between text-[11px] text-[var(--crn-fg-dim)]">
                    <span>Ultima edicao:</span>
                    <span>{selectedSinapse.ultimaEdicao}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--crn-fg-dim)]">
                    <span>Ocorrencias (30d):</span>
                    <span>{selectedSinapse.hits30d} pacientes</span>
                  </div>
                </div>
              </div>

              {/* Acoes Footer Dossier */}
              <div
                className="p-4 border-t bg-[var(--crn-bg)] flex flex-col gap-2"
                style={{ borderColor: "var(--crn-border)" }}
              >
                <button
                  className="w-full py-2 border bg-[var(--crn-bg-panel)] hover:bg-[var(--crn-bg-row-hover)] text-[var(--crn-fg)] flex items-center justify-center gap-2 transition-colors"
                  style={{ borderColor: "var(--crn-border)" }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Sinapse
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--crn-fg-dim)] craniotomia-serif italic p-6 text-center">
              Selecione uma sinapse na lista para inspecionar o dossier.
            </div>
          )}
        </aside>
      </main>

      {/* FOOTER */}
      <footer
        className="h-8 flex items-center justify-between px-4 border-t bg-[var(--crn-bg-panel)] text-[10px] text-[var(--crn-fg-dim)]"
        style={{ borderColor: "var(--crn-border)" }}
      >
        <div className="flex items-center gap-4">
          <span>
            B1 Selecionado:{" "}
            <span className="font-bold text-[var(--crn-fg)]">
              {selectedB1 || "Nenhum"}
            </span>
          </span>
          <span>
            Exibindo: <span className="text-[var(--crn-fg)]">{filteredSinapses.length}</span> / {RESUMO.total}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 bg-[var(--crn-estado-ativo)] inline-block"
            ></span>
            Ativas: {RESUMO.ativas}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 bg-[var(--crn-estado-validacao)] inline-block"
            ></span>
            Aguardando: {RESUMO.aguardando}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 bg-[var(--crn-estado-bloqueado)] inline-block"
            ></span>
            Bloqueadas: {RESUMO.bloqueadas}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default ArvoreDossier;
