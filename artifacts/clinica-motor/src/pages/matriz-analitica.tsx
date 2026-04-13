import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Grid3X3, Download, Filter, Search, X, FlaskConical, Activity, Users
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function FacetFilter({ label, facets, selected, onToggle }: {
  label: string;
  facets: { value: string; count: number }[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  if (!facets || facets.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {facets.map(f => (
          <button
            key={f.value}
            onClick={() => onToggle(f.value)}
            className={`w-full flex items-center justify-between px-2 py-1 text-xs transition-colors ${
              selected.includes(f.value)
                ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                : "text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent"
            }`}
          >
            <span className="truncate">{f.value}</span>
            <span className="text-[10px] ml-2 shrink-0">{f.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MatrizAnaliticaPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada } = useClinic();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filterVias, setFilterVias] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterSubstancias, setFilterSubstancias] = useState<string[]>([]);
  const [filterUnidades, setFilterUnidades] = useState<string[]>([]);
  const [searchNome, setSearchNome] = useState("");
  const [semRetornoDiasMin, setSemRetornoDiasMin] = useState("");
  const [faltasMin, setFaltasMin] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (unidadeSelecionada) params.set("unidadeId", String(unidadeSelecionada));
    if (filterVias.length) params.set("via", filterVias.join(","));
    if (filterStatus.length) params.set("statusTratamento", filterStatus.join(","));
    if (filterSubstancias.length) params.set("substanciaNome", filterSubstancias.join(","));
    if (semRetornoDiasMin) params.set("semRetornoDiasMin", semRetornoDiasMin);
    if (faltasMin) params.set("faltasMin", faltasMin);
    params.set("page", String(page));
    params.set("limit", "50");
    return params;
  }, [unidadeSelecionada, filterVias, filterStatus, filterSubstancias, semRetornoDiasMin, faltasMin, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const res = await fetch(`${API_BASE}/matrix/therapy-facts?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = buildParams();
      const res = await fetch(`${API_BASE}/matrix/export?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matriz_analitica_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const toggleFilter = (val: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    setPage(1);
  };

  const clearAllFilters = () => {
    setFilterVias([]);
    setFilterStatus([]);
    setFilterSubstancias([]);
    setFilterUnidades([]);
    setSearchNome("");
    setSemRetornoDiasMin("");
    setFaltasMin("");
    setPage(1);
  };

  const hasFilters = filterVias.length || filterStatus.length || filterSubstancias.length || filterUnidades.length || searchNome || semRetornoDiasMin || faltasMin;

  const filteredRows = (data?.rows || []).filter((r: any) => {
    if (searchNome && !r.pacienteNome?.toLowerCase().includes(searchNome.toLowerCase())) return false;
    if (filterUnidades.length && !filterUnidades.includes(r.unidadeNome)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" /> Matriz Analitica
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Cross-filter: substancia x via x status x faltas x dias sem retorno
              {nomeUnidadeSelecionada && nomeUnidadeSelecionada !== "Todas as Clinicas" && (
                <span className="ml-2 text-primary font-semibold">| {nomeUnidadeSelecionada}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {hasFilters && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={clearAllFilters}>
                <X className="w-3 h-3" /> Limpar Filtros
              </Button>
            )}
            <Button size="sm" className="text-xs gap-1" onClick={handleExport} disabled={exporting || !data?.rows?.length}>
              <Download className="w-3 h-3" /> {exporting ? "Exportando..." : "Export CSV"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Buscar paciente</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchNome}
                      onChange={e => { setSearchNome(e.target.value); setPage(1); }}
                      className="w-full bg-background border border-border pl-7 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                      placeholder="Nome do paciente..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Dias sem retorno (min)</label>
                  <input
                    type="number"
                    value={semRetornoDiasMin}
                    onChange={e => { setSemRetornoDiasMin(e.target.value); setPage(1); }}
                    className="w-full bg-background border border-border px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    placeholder="Ex: 14"
                    min={0}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Faltas minimo</label>
                  <input
                    type="number"
                    value={faltasMin}
                    onChange={e => { setFaltasMin(e.target.value); setPage(1); }}
                    className="w-full bg-background border border-border px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    placeholder="Ex: 2"
                    min={0}
                  />
                </div>

                <div className="border-t border-border pt-3">
                  <FacetFilter
                    label="Via"
                    facets={data?.facets?.vias || []}
                    selected={filterVias}
                    onToggle={val => toggleFilter(val, setFilterVias)}
                  />
                </div>

                <FacetFilter
                  label="Status Tratamento"
                  facets={data?.facets?.statusTratamento || []}
                  selected={filterStatus}
                  onToggle={val => toggleFilter(val, setFilterStatus)}
                />

                <FacetFilter
                  label="Substancias"
                  facets={data?.facets?.substancias || []}
                  selected={filterSubstancias}
                  onToggle={val => toggleFilter(val, setFilterSubstancias)}
                />

                <FacetFilter
                  label="Unidades"
                  facets={data?.facets?.unidades || []}
                  selected={filterUnidades}
                  onToggle={val => toggleFilter(val, setFilterUnidades)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="col-span-9 space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {data?.pagination?.total || 0} registros</span>
              <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3" /> {data?.facets?.substancias?.length || 0} substancias</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {data?.facets?.vias?.length || 0} vias</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : filteredRows.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Grid3X3 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum dado encontrado com os filtros atuais</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou adicionar tratamentos com substancias</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Paciente</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Substancia</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Via</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                          <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Sessoes</th>
                          <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Faltas</th>
                          <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Dias s/ Retorno</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Unidade</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Combo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRows.map((row: any, idx: number) => {
                          const diasClass = row.semRetornoDias > 30 ? "text-red-400 font-bold" : row.semRetornoDias > 14 ? "text-amber-400" : "text-emerald-400";
                          const faltasClass = row.faltas > 3 ? "text-red-400 font-bold" : row.faltas > 1 ? "text-amber-400" : "text-muted-foreground";
                          return (
                            <tr key={idx} className="hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2">
                                <div className="font-semibold text-foreground truncate max-w-[150px]">{row.pacienteNome}</div>
                                <div className="text-[10px] text-muted-foreground">{row.pacienteTelefone}</div>
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-semibold text-primary">{row.substanciaNome || "—"}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold">
                                  {row.viaEfetiva}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] uppercase font-bold ${
                                  row.tratamentoStatus === "ativo" ? "text-emerald-400" :
                                  row.tratamentoStatus === "suspenso" ? "text-amber-400" :
                                  row.tratamentoStatus === "cancelado" ? "text-red-400" : "text-muted-foreground"
                                }`}>
                                  {row.tratamentoStatus}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">{row.totalSessoes}</td>
                              <td className={`px-3 py-2 text-center ${faltasClass}`}>{row.faltas}</td>
                              <td className={`px-3 py-2 text-center ${diasClass}`}>{row.semRetornoDias}d</td>
                              <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{row.unidadeNome || "—"}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-0.5 max-w-[200px]">
                                  {(row.substanciasCombo || []).slice(0, 3).map((s: string) => (
                                    <span key={s} className="px-1 py-0.5 bg-muted text-[9px] text-muted-foreground truncate max-w-[80px]">{s}</span>
                                  ))}
                                  {(row.substanciasCombo || []).length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{row.substanciasCombo.length - 3}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {data?.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Pagina {data.pagination.page} de {data.pagination.pages} ({data.pagination.total} total)
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs h-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Proxima</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
