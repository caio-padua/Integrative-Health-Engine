import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Heart, Brain, Beaker, Stethoscope, Baby, Dumbbell,
  Flame, Pill, Eye, AlertTriangle, Filter, ChevronDown, ChevronRight
} from "lucide-react";

export type DoencaStatus = "DIAGNOSTICADA" | "POTENCIAL";

export interface DoencaSelecionada {
  nome: string;
  status: DoencaStatus;
}

interface DoencaGrupo {
  grupo: string;
  icon: React.ElementType;
  cor: string;
  corBg: string;
  doencas: string[];
}

const DOENCAS_POR_GRUPO: DoencaGrupo[] = [
  {
    grupo: "CARDIOLOGICAS",
    icon: Heart,
    cor: "text-red-400",
    corBg: "bg-red-500/10 border-red-500/20",
    doencas: ["HIPERTENSAO", "PALPITACAO", "INSUFICIENCIA CARDIACA", "ARRITMIA CARDIACA", "DOENCA ARTERIAL CORONARIANA"]
  },
  {
    grupo: "METABOLICAS",
    icon: Beaker,
    cor: "text-amber-400",
    corBg: "bg-amber-500/10 border-amber-500/20",
    doencas: ["OBESIDADE", "DIABETES TIPO 2", "PREDIABETES", "RESISTENCIA INSULINICA", "SINDROME METABOLICA", "DISLIPIDEMIA", "COLESTEROL ALTO"]
  },
  {
    grupo: "TIREOIDE",
    icon: Stethoscope,
    cor: "text-violet-400",
    corBg: "bg-violet-500/10 border-violet-500/20",
    doencas: ["HIPOTIREOIDISMO", "HIPERTIREOIDISMO", "HASHIMOTO", "TIREOIDITE DE HASHIMOTO"]
  },
  {
    grupo: "GINECOLOGICAS",
    icon: Baby,
    cor: "text-pink-400",
    corBg: "bg-pink-500/10 border-pink-500/20",
    doencas: ["ENDOMETRIOSE", "SINDROME DO OVARIO POLICISTICO", "ADENOMIOSE", "MENOPAUSA", "TPM IMPORTANTE"]
  },
  {
    grupo: "NEUROCOGNITIVAS",
    icon: Brain,
    cor: "text-blue-400",
    corBg: "bg-blue-500/10 border-blue-500/20",
    doencas: ["TDAH", "DEPRESSAO", "ANSIEDADE GENERALIZADA", "INSONIA", "ENXAQUECA"]
  },
  {
    grupo: "ANDROLOGICAS",
    icon: Dumbbell,
    cor: "text-sky-400",
    corBg: "bg-sky-500/10 border-sky-500/20",
    doencas: ["HIPOGONADISMO MASCULINO", "DISFUNCAO ERETIL"]
  },
  {
    grupo: "INFLAMATORIAS",
    icon: Flame,
    cor: "text-orange-400",
    corBg: "bg-orange-500/10 border-orange-500/20",
    doencas: ["FIBROMIALGIA", "LUPUS", "ARTRITE REUMATOIDE", "ARTRALGIA", "DOR CRONICA"]
  },
  {
    grupo: "INTESTINAIS",
    icon: Pill,
    cor: "text-green-400",
    corBg: "bg-green-500/10 border-green-500/20",
    doencas: ["REFLUXO", "DISBIOSE", "CONSTIPACAO", "DISTENSAO ABDOMINAL"]
  },
  {
    grupo: "NUTRICIONAIS",
    icon: Beaker,
    cor: "text-emerald-400",
    corBg: "bg-emerald-500/10 border-emerald-500/20",
    doencas: ["DEFICIENCIA DE VITAMINA D", "DEFICIENCIA DE FERRO", "DEFICIENCIA DE B12"]
  },
  {
    grupo: "ESTETICAS / DERMA",
    icon: Eye,
    cor: "text-fuchsia-400",
    corBg: "bg-fuchsia-500/10 border-fuchsia-500/20",
    doencas: ["LIPEDEMA", "LIPOEDEMA", "ALOPECIA", "MELASMA"]
  },
  {
    grupo: "MITOCONDRIAIS",
    icon: Flame,
    cor: "text-cyan-400",
    corBg: "bg-cyan-500/10 border-cyan-500/20",
    doencas: ["FADIGA", "BAIXA ENERGIA"]
  },
  {
    grupo: "OUTRAS",
    icon: AlertTriangle,
    cor: "text-zinc-400",
    corBg: "bg-zinc-500/10 border-zinc-500/20",
    doencas: ["DOENCA HEPATICA", "DOENCA RENAL"]
  },
];

interface DoencaSelectorProps {
  selecionados: DoencaSelecionada[];
  onChange: (val: DoencaSelecionada[]) => void;
  legacySelecionados?: string[];
}

export function DoencaSelector({ selecionados, onChange, legacySelecionados }: DoencaSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(DOENCAS_POR_GRUPO.map(g => g.grupo)));
  const [filtroFunil, setFiltroFunil] = useState<"TODOS" | "DIAGNOSTICADA" | "POTENCIAL">("TODOS");

  const effectiveSelecionados = useMemo(() => {
    if (selecionados.length > 0) return selecionados;
    if (legacySelecionados && legacySelecionados.length > 0) {
      return legacySelecionados.map(nome => ({ nome, status: "DIAGNOSTICADA" as DoencaStatus }));
    }
    return [];
  }, [selecionados, legacySelecionados]);

  const selMap = useMemo(() => {
    const m = new Map<string, DoencaStatus>();
    for (const s of effectiveSelecionados) m.set(s.nome, s.status);
    return m;
  }, [effectiveSelecionados]);

  const toggleDoenca = (nome: string) => {
    if (selMap.has(nome)) {
      onChange(effectiveSelecionados.filter(s => s.nome !== nome));
    } else {
      onChange([...effectiveSelecionados, { nome, status: "DIAGNOSTICADA" }]);
    }
  };

  const cycleStatus = (nome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = selMap.get(nome);
    if (!current) return;
    const next: DoencaStatus = current === "DIAGNOSTICADA" ? "POTENCIAL" : "DIAGNOSTICADA";
    onChange(effectiveSelecionados.map(s => s.nome === nome ? { ...s, status: next } : s));
  };

  const toggleGroup = (grupo: string) => {
    const next = new Set(expandedGroups);
    if (next.has(grupo)) next.delete(grupo); else next.add(grupo);
    setExpandedGroups(next);
  };

  const diagnosticadas = effectiveSelecionados.filter(s => s.status === "DIAGNOSTICADA");
  const potenciais = effectiveSelecionados.filter(s => s.status === "POTENCIAL");

  const filteredFunil = filtroFunil === "TODOS"
    ? effectiveSelecionados
    : effectiveSelecionados.filter(s => s.status === filtroFunil);

  const grupoDaSelecionada = (nome: string) => {
    return DOENCAS_POR_GRUPO.find(g => g.doencas.includes(nome));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span>{effectiveSelecionados.length} selecionada{effectiveSelecionados.length !== 1 ? 's' : ''}</span>
        <span className="w-px h-3 bg-border" />
        <span className="text-emerald-400">{diagnosticadas.length} diagnosticada{diagnosticadas.length !== 1 ? 's' : ''}</span>
        <span className="w-px h-3 bg-border" />
        <span className="text-amber-400">{potenciais.length} potencial{potenciais.length !== 1 ? '' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {DOENCAS_POR_GRUPO.map(grupo => {
            const Icon = grupo.icon;
            const expanded = expandedGroups.has(grupo.grupo);
            const selecionadasNoGrupo = grupo.doencas.filter(d => selMap.has(d));

            return (
              <div key={grupo.grupo} className={`border ${grupo.corBg}`}>
                <button
                  type="button"
                  onClick={() => toggleGroup(grupo.grupo)}
                  className="w-full flex items-center justify-between p-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${grupo.cor}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">{grupo.grupo}</span>
                    {selecionadasNoGrupo.length > 0 && (
                      <Badge className="bg-primary/20 text-primary text-[9px] px-1.5 py-0 border-none">
                        {selecionadasNoGrupo.length}
                      </Badge>
                    )}
                  </div>
                  {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>

                {expanded && (
                  <div className="px-2.5 pb-2.5 space-y-1">
                    {grupo.doencas.map(doenca => {
                      const status = selMap.get(doenca);
                      const selected = !!status;

                      return (
                        <div
                          key={doenca}
                          onClick={() => toggleDoenca(doenca)}
                          className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-all text-xs border ${
                            selected
                              ? status === "DIAGNOSTICADA"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border flex items-center justify-center ${
                              selected
                                ? status === "DIAGNOSTICADA"
                                  ? "border-emerald-400 bg-emerald-500"
                                  : "border-amber-400 bg-amber-500"
                                : "border-muted-foreground/40"
                            }`}>
                              {selected && <span className="text-[8px] text-white font-bold">✓</span>}
                            </div>
                            <span className="font-medium">{doenca}</span>
                          </div>

                          {selected && (
                            <button
                              type="button"
                              onClick={(e) => cycleStatus(doenca, e)}
                              className={`text-[9px] font-bold px-2 py-0.5 border uppercase tracking-wider transition-all ${
                                status === "DIAGNOSTICADA"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30"
                              }`}
                              title={status === "DIAGNOSTICADA" ? "Clique para mudar para POTENCIAL" : "Clique para mudar para DIAGNOSTICADA"}
                            >
                              {status === "DIAGNOSTICADA" ? "DX" : "POT"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 border border-primary/20 bg-primary/5">
          <div className="p-3 border-b border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">Funil do Paciente</span>
            </div>
            <span className="text-[10px] text-primary font-bold">{filteredFunil.length} itens</span>
          </div>

          <div className="px-3 py-2 flex gap-1 border-b border-primary/10">
            {(["TODOS", "DIAGNOSTICADA", "POTENCIAL"] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltroFunil(f)}
                className={`text-[9px] font-bold px-2 py-1 uppercase tracking-wider transition-all ${
                  filtroFunil === f
                    ? f === "DIAGNOSTICADA" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : f === "POTENCIAL" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/20 text-muted-foreground border border-transparent hover:text-foreground"
                }`}
              >
                {f === "TODOS" ? "Todos" : f === "DIAGNOSTICADA" ? "Diagnosticadas" : "Potenciais"}
              </button>
            ))}
          </div>

          <div className="p-2 space-y-1 max-h-[440px] overflow-y-auto">
            {filteredFunil.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Nenhuma doenca selecionada</p>
                <p className="text-[10px] mt-1 text-muted-foreground/60">Selecione na lista ao lado</p>
              </div>
            ) : (
              filteredFunil.map(sel => {
                const grupoInfo = grupoDaSelecionada(sel.nome);
                const Icon = grupoInfo?.icon || AlertTriangle;
                const cor = grupoInfo?.cor || "text-zinc-400";

                return (
                  <div
                    key={sel.nome}
                    className={`flex items-center gap-2 px-3 py-2 border transition-all ${
                      sel.status === "DIAGNOSTICADA"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${cor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">{sel.nome}</span>
                      <span className="text-[9px] text-muted-foreground">{grupoInfo?.grupo || "—"}</span>
                    </div>
                    <Badge className={`text-[8px] px-1.5 py-0 border flex-shrink-0 ${
                      sel.status === "DIAGNOSTICADA"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}>
                      {sel.status === "DIAGNOSTICADA" ? "DX" : "POTENCIAL"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {effectiveSelecionados.length > 0 && (
            <div className="p-3 border-t border-primary/20 space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                <span>Resumo Clinico</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-lg font-bold text-emerald-400">{diagnosticadas.length}</div>
                  <div className="text-[9px] text-emerald-400/70 uppercase">Diagnosticadas</div>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-lg font-bold text-amber-400">{potenciais.length}</div>
                  <div className="text-[9px] text-amber-400/70 uppercase">Potenciais</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function doencasSelecionadasToLegacy(selecionados: DoencaSelecionada[]): string[] {
  return selecionados.map(s => s.nome);
}

export function legacyToDoencasSelecionadas(legacy: string[]): DoencaSelecionada[] {
  return legacy.map(nome => ({ nome, status: "DIAGNOSTICADA" as DoencaStatus }));
}