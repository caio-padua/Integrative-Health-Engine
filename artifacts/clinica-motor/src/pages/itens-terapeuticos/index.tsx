import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Filter, ChevronDown, ChevronRight, FlaskConical, Beaker, TestTube, Pill } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface ExameDetalhe {
  nome: string;
  codigo: string | null;
  modalidade: string | null;
  materialOuSetor: string | null;
  justificativaObjetiva: string | null;
  prioridade: string | null;
  sexoAplicavel: string | null;
  legendaRapida: string | null;
  finalidadePrincipal: string | null;
  enriquecido: boolean;
}

interface ItemUnificado {
  id: string;
  tipo: string;
  codigo: string;
  nome: string;
  eixo?: string | null;
  via?: string | null;
  dosagem?: string | null;
  valor?: string | null;
  status?: string;
  blocoId?: string | null;
  grau?: string | null;
  composicao?: string | null;
  area?: string | null;
  frequencia?: string | null;
  classificacao?: string | null;
  palavraChave?: string | null;
  indicacao?: string | null;
  objetivo?: string | null;
  examesDetalhe?: ExameDetalhe[];
  totalExames?: number;
  totalEnriquecidos?: number;
}

interface ItensUnificadosResponse {
  items: ItemUnificado[];
  contagens: Record<string, number>;
  total: number;
}

const tipoCores: Record<string, string> = {
  EXAME: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  FORMULA: "bg-green-500/10 text-green-400 border-green-500/30",
  BLEND: "bg-amber-500/10 text-amber-400 border-amber-500/40",
  INJETAVEL_IM: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  INJETAVEL_EV: "bg-red-500/10 text-red-400 border-red-500/30",
  IMPLANTE: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  PROTOCOLO: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

const tipoLabels: Record<string, string> = {
  INJETAVEL_IM: "INJETAVEL IM",
  INJETAVEL_EV: "INJETAVEL EV",
  FORMULA: "FORMULA",
  BLEND: "BLEND",
  IMPLANTE: "IMPLANTE",
  EXAME: "EXAME",
  PROTOCOLO: "PROTOCOLO",
};

const tipoOrdem = ["INJETAVEL_IM", "INJETAVEL_EV", "FORMULA", "BLEND", "IMPLANTE", "EXAME", "PROTOCOLO"];

function formatValor(v?: string | null): string {
  if (!v) return "";
  const num = parseFloat(v.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return v;
  return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function PrioridadeBadge({ p }: { p: string | null }) {
  if (!p) return null;
  const cor = p === "ALTA" ? "text-red-400 bg-red-500/10" : p === "MEDIA" ? "text-yellow-400 bg-yellow-500/10" : "text-gray-400 bg-gray-500/10";
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cor}`}>{p}</span>;
}

function ItemRow({ item, expandido, onToggle }: { item: ItemUnificado; expandido: boolean; onToggle: () => void }) {
  const temDetalhes = item.composicao || item.indicacao || item.objetivo || item.palavraChave || item.classificacao || item.examesDetalhe || item.tipo === "FORMULA" || item.tipo === "PROTOCOLO" || item.tipo === "BLEND" || item.tipo === "INJETAVEL_IM" || item.tipo === "INJETAVEL_EV";

  return (
    <>
      <div
        className={`grid grid-cols-[40px_160px_1fr_100px_100px_100px_80px] items-center px-4 py-2.5 border-b border-border/30 hover:bg-muted/5 transition-colors cursor-pointer ${expandido ? "bg-muted/10" : ""}`}
        onClick={temDetalhes ? onToggle : undefined}
      >
        <div className="flex items-center justify-center">
          {temDetalhes ? (
            expandido ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
        </div>

        <div>
          <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded font-mono text-primary/80">
            {item.codigo}
          </code>
        </div>

        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{item.nome}</p>
          {item.tipo === "EXAME" && item.totalExames && (
            <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {item.totalExames} exames ({item.totalEnriquecidos} V4)
            </span>
          )}
        </div>

        <div>
          <Badge variant="outline" className={`text-[10px] ${tipoCores[item.tipo] || ""}`}>
            {tipoLabels[item.tipo] || item.tipo}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          {item.eixo && <span className="font-mono">{item.eixo}</span>}
          {item.area && <span className="font-mono">{item.area}</span>}
          {item.blocoId && <span className="font-mono">{item.blocoId}</span>}
        </div>

        <div className="text-xs text-muted-foreground">
          {item.via && <span>{item.via}</span>}
          {item.frequencia && <span className="block text-[10px] opacity-60">{item.frequencia}</span>}
          {item.grau && <span className="text-[10px] opacity-60">{item.grau}</span>}
        </div>

        <div className="text-right text-xs font-medium">
          <span className={item.status === "ATIVO" ? "text-green-500" : "text-muted-foreground"}>
            {item.status || "\u2014"}
          </span>
        </div>
      </div>

      {expandido && temDetalhes && (
        <div className="px-4 py-3 bg-muted/5 border-b border-border/30 ml-10">
          {item.tipo === "EXAME" && item.examesDetalhe && item.examesDetalhe.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs uppercase text-muted-foreground tracking-wider font-medium">
                  Exames da Grade
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.totalEnriquecidos}/{item.totalExames} com dados V4
                </span>
              </div>
              <div className="space-y-1">
                {item.examesDetalhe.map((ex, i) => (
                  <div key={i} className={`rounded-md px-3 py-2 border ${ex.enriquecido ? 'border-border/40 bg-muted/10' : 'border-border/20 bg-muted/5 opacity-70'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground min-w-[200px]">{ex.nome}</span>
                      {ex.codigo && <code className="text-[10px] text-muted-foreground font-mono">{ex.codigo}</code>}
                      {ex.modalidade && (
                        <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{ex.modalidade}</span>
                      )}
                      {ex.materialOuSetor && (
                        <span className="text-[10px] text-muted-foreground">{ex.materialOuSetor}</span>
                      )}
                      <PrioridadeBadge p={ex.prioridade} />
                      {ex.sexoAplicavel && ex.sexoAplicavel !== "AMBOS" && (
                        <span className="text-[10px] text-violet-400">{ex.sexoAplicavel}</span>
                      )}
                    </div>
                    {ex.enriquecido && (ex.legendaRapida || ex.finalidadePrincipal) && (
                      <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        {ex.legendaRapida && <span>{ex.legendaRapida}</span>}
                        {ex.finalidadePrincipal && !ex.legendaRapida && <span>{ex.finalidadePrincipal}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {item.composicao ? (
                <div className="mb-2">
                  <span className="text-xs uppercase text-muted-foreground tracking-wider">
                    {item.tipo === "BLEND" ? "Ativos do Blend" : "Composição"}
                  </span>
                  <div className="text-sm mt-1 leading-relaxed border-l-2 border-amber-500/40 pl-3">
                    {item.composicao.split(/\n/).map((c, i) => (
                      <span key={i} className="block text-sm">{c.trim()}</span>
                    ))}
                  </div>
                </div>
              ) : (item.tipo === "FORMULA" || item.tipo === "PROTOCOLO" || item.tipo === "BLEND") ? (
                <div className="mb-2 rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                  <span className="text-[11px] text-amber-400 italic">
                    Composição detalhada pendente — cadastrar via /catalogo (planilha V4 / formula_blend_ativo).
                  </span>
                </div>
              ) : (item.tipo === "INJETAVEL_IM" || item.tipo === "INJETAVEL_EV") && item.nome.toUpperCase().includes("BLEND") ? (
                <div className="mb-2 rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                  <span className="text-[11px] text-amber-400 italic">
                    Este BLEND injetável ainda não tem ativos cadastrados na tabela <code>formula_blend_ativo</code>.
                    Use o catálogo de blends para vincular os componentes.
                  </span>
                </div>
              ) : null}
            </>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
            {item.dosagem && <div><span className="font-medium">Dosagem:</span> {item.dosagem}</div>}
            {item.via && <div><span className="font-medium">Via:</span> {item.via}</div>}
            {item.frequencia && <div><span className="font-medium">Frequencia:</span> {item.frequencia}</div>}
            {item.valor && <div><span className="font-medium">Valor:</span> {formatValor(item.valor)}</div>}
            {item.classificacao && <div><span className="font-medium">Classificacao:</span> {item.classificacao}</div>}
            {item.palavraChave && <div><span className="font-medium">Palavra-chave Motor:</span> {item.palavraChave}</div>}
            {item.indicacao && <div><span className="font-medium">Indicacao:</span> {item.indicacao}</div>}
            {item.objetivo && <div><span className="font-medium">Objetivo:</span> {item.objetivo}</div>}
            {item.grau && <div><span className="font-medium">Grade:</span> {item.grau}</div>}
          </div>
        </div>
      )}
    </>
  );
}

export default function ItensTerapeuticos() {
  const { data, isLoading } = useQuery<ItensUnificadosResponse>({
    queryKey: ["catalogo", "itens-unificados"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/itens-unificados`);
      return res.json();
    },
  });

  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const items = data?.items || [];
  const contagens = data?.contagens || {};

  const itensFiltrados = items.filter(item => {
    const matchTipo = filtroTipo === "todos" || item.tipo === filtroTipo;
    const matchTexto = !filtroTexto ||
      item.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      item.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.eixo || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.area || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.composicao || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.palavraChave || "").toLowerCase().includes(filtroTexto.toLowerCase());
    return matchTipo && matchTexto;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Itens Terapeuticos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Catalogo Pawards V13+V4 — {data?.total || 0} itens: Injetaveis IM/EV, Formulas, Implantes, Exames/Blocos (V4 enriquecido), Protocolos
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {tipoOrdem.map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? "todos" : tipo)}
              className={`p-3 rounded-lg border text-center transition-all ${
                filtroTipo === tipo
                  ? `${tipoCores[tipo]} shadow-sm`
                  : "border-border bg-muted/10 hover:bg-muted/20"
              }`}
            >
              <p className="text-lg font-bold">{contagens[tipo] || 0}</p>
              <p className="text-xs font-medium">{tipoLabels[tipo]}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-muted/30"
              placeholder="Buscar por nome, codigo Pawards, eixo, composicao..."
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
          {filtroTipo !== "todos" && (
            <Button variant="outline" size="sm" onClick={() => setFiltroTipo("todos")}>
              <Filter className="w-3 h-3 mr-1" />
              Limpar filtro
            </Button>
          )}
        </div>

        <Card className="bg-card">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {itensFiltrados.length} itens {filtroTipo !== "todos" ? `em ${tipoLabels[filtroTipo]}` : "no total"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[40px_160px_1fr_100px_100px_100px_80px] items-center px-4 py-2 border-b border-border/50 bg-muted/20 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <div />
                  <div>Codigo Pawards</div>
                  <div>Nome</div>
                  <div>Tipo</div>
                  <div>Eixo / Area</div>
                  <div>Via / Freq.</div>
                  <div className="text-right">Status</div>
                </div>
                {itensFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum item encontrado.
                  </div>
                ) : (
                  itensFiltrados.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      expandido={expandidos.has(item.id)}
                      onToggle={() => toggleExpand(item.id)}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
