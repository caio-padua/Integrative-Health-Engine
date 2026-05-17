import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Beaker,
  Syringe,
  Cpu,
  Activity,
  Layers,
  Zap,
  User,
  ShieldCheck,
  Pause,
  Play,
  Pencil,
  Trash2,
  ChevronDown,
  Download,
  TerminalSquare
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

const TipoIcon: Record<TipoFenotipo, React.ElementType> = {
  FORM: Beaker,
  INJE: Syringe,
  IMPL: Cpu,
  EXAM: Activity,
  PROT: Layers,
};

const GovIcon = {
  AUTO: Zap,
  MEDICO: User,
  MEDICO_CHEFE: ShieldCheck,
};

export function MatrizDensa() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [filtroB1, setFiltroB1] = useState<Set<B1>>(new Set());
  const [filtroTipo, setFiltroTipo] = useState<Set<TipoFenotipo>>(new Set());
  const [filtroEstado, setFiltroEstado] = useState<Set<Estado>>(new Set());

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === SINAPSES.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(SINAPSES.map((s) => s.id)));
    }
  };

  const toggleFiltroB1 = (b1: B1) => {
    const newSet = new Set(filtroB1);
    if (newSet.has(b1)) newSet.delete(b1);
    else newSet.add(b1);
    setFiltroB1(newSet);
  };

  // Filtragem basica (só pra mockup)
  const filteredSinapses = SINAPSES.filter((s) => {
    if (filtroB1.size > 0 && !filtroB1.has(s.b1)) return false;
    if (filtroTipo.size > 0 && !filtroTipo.has(s.tipo)) return false;
    if (filtroEstado.size > 0 && !filtroEstado.has(s.estado)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.codigoV4.toLowerCase().includes(q) ||
        s.sinal.toLowerCase().includes(q) ||
        s.fenotipo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="craniotomia-root min-h-screen w-full flex flex-col overflow-hidden text-[12px]">
      {/* HEADER / KPIs */}
      <div className="flex-none bg-[var(--crn-bg-panel)] border-b border-[var(--crn-border)] flex items-stretch px-4 py-3 gap-6 shrink-0">
        <div className="flex flex-col justify-center min-w-[200px]">
          <h1 className="craniotomia-serif text-[var(--crn-fg)] text-base font-semibold leading-tight tracking-wide">
            CRANIOTOMIA
          </h1>
          <span className="text-[10px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
            Editor de Sinapses do Motor
          </span>
        </div>

        <div className="flex gap-2">
          <KpiBox label="TOTAL" value={RESUMO.total} />
          <KpiBox label="ATIVAS" value={RESUMO.ativas} color="var(--crn-estado-ativo)" />
          <KpiBox label="PAUSADAS" value={RESUMO.pausadas} color="var(--crn-estado-pausado)" />
          <KpiBox label="BLOQUEADAS" value={RESUMO.bloqueadas} color="var(--crn-estado-bloqueado)" />
          <KpiBox label="AGUARDA VAL." value={RESUMO.aguardando} color="var(--crn-estado-validacao)" />
          <KpiBox label="HITS 30D" value={RESUMO.hitsTotal} color="var(--crn-accent)" />
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex-none bg-[var(--crn-bg)] border-b border-[var(--crn-border)] p-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--crn-fg-dim)]" />
            <input
              type="text"
              placeholder="Buscar por sinal, código ou fenótipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--crn-bg-panel)] border border-[var(--crn-border)] text-[var(--crn-fg)] px-7 py-1.5 outline-none focus:border-[var(--crn-accent)] placeholder:text-[var(--crn-fg-dim)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[var(--crn-fg-dim)] mr-1" />
            {Object.keys(B1_LABEL).map((k) => {
              const b1 = k as B1;
              const active = filtroB1.has(b1);
              return (
                <button
                  key={b1}
                  onClick={() => toggleFiltroB1(b1)}
                  className={`px-1.5 py-0.5 border text-[10px] font-medium transition-colors ${
                    active
                      ? "bg-[#1e2c47] border-[var(--crn-accent)] text-[var(--crn-fg)]"
                      : "bg-transparent border-[var(--crn-border)] text-[var(--crn-fg-muted)] hover:border-[var(--crn-fg-dim)]"
                  }`}
                  style={{ borderBottomWidth: active ? 2 : 1, borderBottomColor: active ? B1_COR[b1] : undefined }}
                >
                  {b1}
                </button>
              );
            })}
          </div>
        </div>

        <button className="flex items-center gap-1.5 bg-[var(--crn-accent)] text-[#000] px-3 py-1.5 font-bold hover:bg-[var(--crn-accent-strong)] transition-colors whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span>NOVA SINAPSE</span>
        </button>
      </div>

      {/* BODY / TABLE */}
      <div className="flex-1 overflow-auto bg-[var(--crn-bg)]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[var(--crn-bg-panel)] shadow-[0_1px_0_var(--crn-border)] text-[10px] text-[var(--crn-fg-dim)] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === SINAPSES.length && SINAPSES.length > 0}
                  onChange={toggleAll}
                  className="crn-checkbox"
                />
              </th>
              <th className="px-2 py-2 w-16">BLOCO</th>
              <th className="px-2 py-2 w-32">CÓDIGO V4</th>
              <th className="px-2 py-2 w-[220px]">SINAL DE ANAMNESE</th>
              <th className="px-2 py-2 w-28">TIPO</th>
              <th className="px-2 py-2 w-[220px]">AÇÃO / FENÓTIPO</th>
              <th className="px-2 py-2 w-20">PESO</th>
              <th className="px-2 py-2 w-28">ESTADO</th>
              <th className="px-2 py-2 w-12 text-center" title="Governança">GOV</th>
              <th className="px-2 py-2 w-16 text-right">HITS (30D)</th>
              <th className="px-2 py-2 w-24 text-right">ULT. ED.</th>
              <th className="px-3 py-2 w-24 text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {filteredSinapses.map((s, idx) => {
              const bgClass =
                s.estado === "BLOQUEADO"
                  ? "bg-[#1f0f15]"
                  : s.estado === "AGUARDA_VALIDACAO"
                  ? "bg-[#211d0e]"
                  : idx % 2 === 0
                  ? "bg-[var(--crn-bg-row)]"
                  : "bg-[var(--crn-bg-row-alt)]";

              const IconTipo = TipoIcon[s.tipo];
              const IconGov = GovIcon[s.governanca];

              return (
                <tr
                  key={s.id}
                  className={`group border-b border-[var(--crn-border)] hover:bg-[var(--crn-bg-row-hover)] cursor-default transition-colors ${bgClass}`}
                  style={{ borderLeft: `4px solid ${B1_COR[s.b1]}` }}
                >
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelection(s.id)}
                      className="crn-checkbox"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className="inline-flex px-1.5 py-0.5 font-bold tracking-widest text-[9px] border"
                      style={{
                        color: B1_COR[s.b1],
                        borderColor: `${B1_COR[s.b1]}40`,
                        backgroundColor: `${B1_COR[s.b1]}10`,
                      }}
                    >
                      {s.b1}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[var(--crn-fg-muted)]">
                    {s.codigoV4}
                  </td>
                  <td className="px-2 py-1.5 max-w-[220px] truncate" title={s.sinal}>
                    {s.sinal}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5" style={{ color: TIPO_COR[s.tipo] }}>
                      <IconTipo className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">{TIPO_LABEL[s.tipo]}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 max-w-[220px] truncate text-[var(--crn-accent)]" title={s.fenotipo}>
                    {s.fenotipo}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 text-[10px] text-[var(--crn-fg-muted)]">{s.peso.toFixed(2)}</span>
                      <div className="h-1.5 w-12 bg-[#1e2c47] overflow-hidden border border-[#2a3d63]">
                        <div
                          className="h-full bg-[var(--crn-accent)] opacity-80"
                          style={{ width: `${s.peso * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5" style={{ backgroundColor: ESTADO_COR[s.estado] }} />
                      <span className="text-[10px]" style={{ color: ESTADO_COR[s.estado] }}>
                        {s.estado.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span title={s.governanca} className="inline-block">
                      <IconGov
                        className="w-4 h-4 inline-block"
                        style={{
                          color:
                            s.governanca === "AUTO"
                              ? "var(--crn-fg-dim)"
                              : s.governanca === "MEDICO"
                              ? "var(--crn-accent)"
                              : "var(--crn-estado-validacao)",
                        }}
                      />
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[var(--crn-fg-muted)]">
                    {s.hits30d > 0 ? (
                      s.hits30d
                    ) : (
                      <span className="text-[var(--crn-fg-dim)] opacity-50">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[10px] text-[var(--crn-fg-dim)]">
                    {s.ultimaEdicao}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[var(--crn-fg-muted)] hover:text-[var(--crn-accent)] p-0.5" title="Editar (E)">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {s.estado === "ATIVO" ? (
                        <button className="text-[var(--crn-fg-muted)] hover:text-[var(--crn-estado-pausado)] p-0.5" title="Pausar">
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button className="text-[var(--crn-fg-muted)] hover:text-[var(--crn-estado-ativo)] p-0.5" title="Ativar">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="text-[var(--crn-fg-muted)] hover:text-[var(--crn-estado-bloqueado)] p-0.5" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex-none bg-[var(--crn-bg-panel)] border-t border-[var(--crn-border)] px-4 py-2 flex items-center justify-between text-[11px] text-[var(--crn-fg-muted)]">
        <div className="flex items-center gap-4">
          <span className="font-bold text-[var(--crn-fg)] bg-[var(--crn-border)] px-2 py-0.5">
            {selectedIds.size} SELECIONADAS
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <button className="hover:text-[var(--crn-fg)] flex items-center gap-1">
                <Pause className="w-3 h-3" /> PAUSAR LOTE
              </button>
              <button className="hover:text-[var(--crn-fg)] flex items-center gap-1">
                <Play className="w-3 h-3" /> ATIVAR LOTE
              </button>
              <button className="hover:text-[var(--crn-fg)] flex items-center gap-1">
                <Download className="w-3 h-3" /> EXPORTAR
              </button>
              <button className="hover:text-[var(--crn-estado-bloqueado)] flex items-center gap-1 text-[var(--crn-estado-bloqueado)] opacity-80">
                <Trash2 className="w-3 h-3" /> EXCLUIR LOTE
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5" title="Navegar">
            <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">J</kbd>
            <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">K</kbd>
            <span>NAVEGAR</span>
          </div>
          <div className="flex items-center gap-1.5" title="Selecionar">
            <kbd className="px-1.5 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">Space</kbd>
            <span>SELECIONAR</span>
          </div>
          <div className="flex items-center gap-1.5" title="Editar">
            <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">E</kbd>
            <span>EDITAR</span>
          </div>
          <div className="flex items-center gap-1.5" title="Nova">
            <kbd className="px-1 bg-[var(--crn-border)] border border-[var(--crn-border-strong)] text-[var(--crn-fg)] font-sans">⌘N</kbd>
            <span>NOVA</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-[var(--crn-border)]">
             <TerminalSquare className="w-3.5 h-3.5 text-[var(--crn-accent)]" />
             <span className="text-[var(--crn-accent)]">CLI MODE</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .crn-checkbox {
          appearance: none;
          background-color: transparent;
          margin: 0;
          font: inherit;
          color: currentColor;
          width: 14px;
          height: 14px;
          border: 1px solid var(--crn-border-strong);
          display: grid;
          place-content: center;
          cursor: pointer;
        }
        .crn-checkbox::before {
          content: "";
          width: 8px;
          height: 8px;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em var(--crn-accent);
          background-color: var(--crn-accent);
        }
        .crn-checkbox:checked::before {
          transform: scale(1);
        }
        .crn-checkbox:focus {
          outline: 1px solid var(--crn-accent);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function KpiBox({ label, value, color = "var(--crn-fg)" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[var(--crn-bg)] border border-[var(--crn-border)] px-3 py-1.5 flex flex-col justify-center min-w-[100px]">
      <span className="text-[10px] text-[var(--crn-fg-dim)] font-bold tracking-wider">{label}</span>
      <span className="text-xl font-light font-mono leading-none mt-1" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default MatrizDensa;
