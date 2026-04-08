import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Hash, FileText, Syringe, FlaskConical,
  Pill, TestTube, Stethoscope, ClipboardList,
  ChevronDown, ChevronRight, Tag
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface CodigoSemantico {
  id: number;
  codigo: string;
  tipo: string;
  procedimentoOuSignificado: string;
  origemLida: string | null;
  grupoObs: string | null;
  prescricaoFormula: string | null;
  injetavelIM: string | null;
  injetavelEV: string | null;
  implante: string | null;
  exame: string | null;
  protocolo: string | null;
  dieta: string | null;
  ativo: boolean;
}

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "exame/procedimento": { label: "Exame", color: "bg-blue-100 text-blue-800 border-blue-300", icon: Stethoscope },
  "injetavel": { label: "Injetavel", color: "bg-green-100 text-green-800 border-green-300", icon: Syringe },
  "formula": { label: "Formula", color: "bg-purple-100 text-purple-800 border-purple-300", icon: FlaskConical },
  "protocolo": { label: "Protocolo", color: "bg-amber-100 text-amber-800 border-amber-300", icon: ClipboardList },
  "doenca": { label: "Doenca", color: "bg-red-100 text-red-800 border-red-300", icon: FileText },
  "doenca/procedimento": { label: "Doenca/Proc", color: "bg-red-100 text-red-800 border-red-300", icon: FileText },
  "sintoma": { label: "Sintoma", color: "bg-orange-100 text-orange-800 border-orange-300", icon: FileText },
  "cirurgia": { label: "Cirurgia", color: "bg-rose-100 text-rose-800 border-rose-300", icon: FileText },
  "pergunta anamnese": { label: "Anamnese", color: "bg-cyan-100 text-cyan-800 border-cyan-300", icon: ClipboardList },
  "juridico": { label: "Juridico", color: "bg-gray-100 text-gray-800 border-gray-300", icon: FileText },
  "dieta": { label: "Dieta", color: "bg-lime-100 text-lime-800 border-lime-300", icon: FileText },
  "psicologia": { label: "Psicologia", color: "bg-violet-100 text-violet-800 border-violet-300", icon: FileText },
  "recorrencia": { label: "Recorrencia", color: "bg-teal-100 text-teal-800 border-teal-300", icon: FileText },
  "pagamento": { label: "Pagamento", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: FileText },
  "fiscal/documento": { label: "Fiscal", color: "bg-slate-100 text-slate-800 border-slate-300", icon: FileText },
};

function ProcedimentoTag({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${color}`}>
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function CodigoRow({ item }: { item: CodigoSemantico }) {
  const [expanded, setExpanded] = useState(false);
  const config = TIPO_CONFIG[item.tipo] || { label: item.tipo, color: "bg-gray-100 text-gray-800 border-gray-300", icon: Tag };
  const Icon = config.icon;

  const hasProcedimentos = item.prescricaoFormula || item.injetavelIM || item.injetavelEV || item.implante || item.exame || item.protocolo || item.dieta;

  return (
    <div className="border-b border-border/50 last:border-0">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 flex justify-center">
          {hasProcedimentos ? (
            expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
        </div>
        <div className="font-mono text-xs bg-muted px-2 py-1 rounded min-w-[220px] text-foreground">
          {item.codigo}
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 min-w-[80px] justify-center ${config.color}`}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        <div className="flex-1 text-sm truncate">{item.procedimentoOuSignificado}</div>
        {item.grupoObs && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            {item.grupoObs}
          </Badge>
        )}
        <div className="flex gap-1 flex-shrink-0">
          {item.exame && <div className="w-2 h-2 rounded-full bg-blue-500" title="Exame" />}
          {item.prescricaoFormula && <div className="w-2 h-2 rounded-full bg-purple-500" title="Formula" />}
          {item.injetavelIM && <div className="w-2 h-2 rounded-full bg-green-500" title="IM" />}
          {item.injetavelEV && <div className="w-2 h-2 rounded-full bg-sky-500" title="EV" />}
          {item.implante && <div className="w-2 h-2 rounded-full bg-amber-500" title="Implante" />}
          {item.protocolo && <div className="w-2 h-2 rounded-full bg-orange-500" title="Protocolo" />}
          {item.dieta && <div className="w-2 h-2 rounded-full bg-lime-500" title="Dieta" />}
        </div>
      </div>

      {expanded && hasProcedimentos && (
        <div className="pl-14 pr-4 pb-3 flex flex-wrap gap-2">
          {item.exame && <ProcedimentoTag label="Exame" value={item.exame} color="bg-blue-50 text-blue-700 border-blue-200" />}
          {item.prescricaoFormula && <ProcedimentoTag label="Prescricao/Formula" value={item.prescricaoFormula} color="bg-purple-50 text-purple-700 border-purple-200" />}
          {item.injetavelIM && <ProcedimentoTag label="Injetavel IM" value={item.injetavelIM} color="bg-green-50 text-green-700 border-green-200" />}
          {item.injetavelEV && <ProcedimentoTag label="Injetavel EV" value={item.injetavelEV} color="bg-sky-50 text-sky-700 border-sky-200" />}
          {item.implante && <ProcedimentoTag label="Implante" value={item.implante} color="bg-amber-50 text-amber-700 border-amber-200" />}
          {item.protocolo && <ProcedimentoTag label="Protocolo" value={item.protocolo} color="bg-orange-50 text-orange-700 border-orange-200" />}
          {item.dieta && <ProcedimentoTag label="Dieta" value={item.dieta} color="bg-lime-50 text-lime-700 border-lime-200" />}
          {item.origemLida && (
            <span className="text-[10px] text-muted-foreground ml-auto self-end">
              Origem: {item.origemLida}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CodigosSemanticos() {
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [grupoFiltro, setGrupoFiltro] = useState("Todos");

  const { data: metaData } = useQuery<{ tipos: string[]; grupos: string[] }>({
    queryKey: ["codigos-semanticos-tipos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/codigos-semanticos/tipos`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: codigos = [], isLoading } = useQuery<CodigoSemantico[]>({
    queryKey: ["codigos-semanticos", search, tipoFiltro, grupoFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tipoFiltro !== "Todos") params.set("tipo", tipoFiltro);
      if (grupoFiltro !== "Todos") params.set("grupo", grupoFiltro);
      const res = await fetch(`${BASE_URL}api/codigos-semanticos?${params}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const tipoCount = codigos.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const comProcedimentos = codigos.filter(
    c => c.exame || c.prescricaoFormula || c.injetavelIM || c.injetavelEV || c.implante || c.protocolo || c.dieta
  ).length;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Codigos Semanticos PADCOM</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nomenclatura padronizada - Padrao: TIPO SISTEMA SUBTIPO SEQUENCIA
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Hash className="h-4 w-4" />
              {codigos.length} codigos
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TestTube className="h-4 w-4" />
              {comProcedimentos} com procedimentos
            </span>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por codigo ou descricao..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {metaData?.grupos && (
                  <select
                    value={grupoFiltro}
                    onChange={(e) => setGrupoFiltro(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="Todos">Todos os Grupos</option>
                    {metaData.grupos.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={tipoFiltro === "Todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoFiltro("Todos")}
                  className="text-xs h-7"
                >
                  Todos ({codigos.length})
                </Button>
                {metaData?.tipos?.map(tipo => {
                  const cfg = TIPO_CONFIG[tipo];
                  return (
                    <Button
                      key={tipo}
                      variant={tipoFiltro === tipo ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTipoFiltro(tipo)}
                      className="text-xs h-7"
                    >
                      {cfg?.label || tipo} {tipoCount[tipo] ? `(${tipoCount[tipo]})` : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mb-4 text-xs text-muted-foreground items-center">
          <span className="font-medium">Legenda procedimentos:</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Exame</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Formula/Receita</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Injetavel IM</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500" /> Injetavel EV</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Implante</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Protocolo</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-lime-500" /> Dieta</span>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : codigos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Hash className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-lg mb-1">Nenhum codigo encontrado</h3>
              <p className="text-sm text-muted-foreground">Ajuste os filtros de busca</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border/30">
              <div className="flex items-center gap-3 p-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="w-8" />
                <div className="min-w-[220px]">Codigo</div>
                <div className="min-w-[80px] text-center">Tipo</div>
                <div className="flex-1">Descricao/Significado</div>
                <div>Grupo</div>
                <div className="w-[70px] text-center">Proc.</div>
              </div>
              {codigos.map(item => (
                <CodigoRow key={item.id} item={item} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
