import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ChevronDown, ChevronRight, FlaskConical,
  Star, Clock, DollarSign, Syringe, Package, Activity,
  Brain, Heart, Zap, Moon, Flame, Shield, Sparkles
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface Substancia {
  id: number;
  nome: string;
  abreviacao: string | null;
  codigoSemantico: string | null;
  categoria: string;
  categoriaDetalhada: string | null;
  cor: string;
  dosePadrao: string | null;
  unidadeDose: string | null;
  via: string;
  duracaoMinutos: number;
  precoReferencia: number | null;
  maxSessoesPorSemana: number | null;
  intervaloDias: number | null;
  estoqueQuantidade: number;
  estoqueUnidade: string | null;
  descricao: string | null;
  funcaoPrincipal: string | null;
  efeitosPercebidos: string | null;
  tempoParaEfeito: string | null;
  classificacaoEstrelas: number;
  efeitosSistemasCorporais: Record<string, any> | null;
  beneficioLongevidade: string | null;
  impactoQualidadeVida: string | null;
  beneficioSono: string | null;
  beneficioEnergia: string | null;
  beneficioLibido: string | null;
  performanceFisica: string | null;
  forcaMuscular: string | null;
  clarezaMental: string | null;
  peleCabeloUnhas: string | null;
  suporteImunologico: string | null;
  contraindicacoes: string | null;
  evidenciaCientifica: string | null;
  notas: string | null;
}

const VIA_LABELS: Record<string, string> = {
  iv: "Endovenoso",
  im: "Intramuscular",
  implant: "Implante",
  oral: "Oral",
  topico: "Topico",
};

const VIA_COLORS: Record<string, string> = {
  iv: "bg-blue-100 text-blue-800 border-blue-300",
  im: "bg-green-100 text-green-800 border-green-300",
  implant: "bg-purple-100 text-purple-800 border-purple-300",
  oral: "bg-amber-100 text-amber-800 border-amber-300",
  topico: "bg-rose-100 text-rose-800 border-rose-300",
};

const CATEGORIA_FILTERS = ["Todos", "antioxidante", "vitamina", "lipolitico", "coenzima", "terapia", "mineral", "complexo"];

function BeneficioItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SubstanciaCard({ sub }: { sub: Substancia }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border transition-all hover:shadow-md">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: sub.cor }}
        >
          {sub.abreviacao || sub.nome.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{sub.nome}</h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${VIA_COLORS[sub.via] || ""}`}>
              {VIA_LABELS[sub.via] || sub.via}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {sub.codigoSemantico && (
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{sub.codigoSemantico}</span>
            )}
            {sub.dosePadrao && (
              <span className="flex items-center gap-1">
                <Syringe className="h-3 w-3" />
                {sub.dosePadrao}{sub.unidadeDose ? ` ${sub.unidadeDose}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {sub.duracaoMinutos}min
            </span>
            {sub.precoReferencia && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                R$ {sub.precoReferencia.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < sub.classificacaoEstrelas ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
              />
            ))}
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              {sub.funcaoPrincipal && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Funcao Principal</h4>
                  <p className="text-sm">{sub.funcaoPrincipal}</p>
                </div>
              )}
              {sub.descricao && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Descricao</h4>
                  <p className="text-sm">{sub.descricao}</p>
                </div>
              )}
              {sub.efeitosPercebidos && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Efeitos Percebidos</h4>
                  <p className="text-sm">{sub.efeitosPercebidos}</p>
                </div>
              )}
              {sub.contraindicacoes && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">Contraindicacoes</h4>
                  <p className="text-sm text-red-800">{sub.contraindicacoes}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Beneficios</h4>
              <BeneficioItem icon={Heart} label="Longevidade" value={sub.beneficioLongevidade} />
              <BeneficioItem icon={Activity} label="Qualidade de Vida" value={sub.impactoQualidadeVida} />
              <BeneficioItem icon={Moon} label="Sono" value={sub.beneficioSono} />
              <BeneficioItem icon={Zap} label="Energia" value={sub.beneficioEnergia} />
              <BeneficioItem icon={Flame} label="Libido" value={sub.beneficioLibido} />
              <BeneficioItem icon={Activity} label="Performance Fisica" value={sub.performanceFisica} />
              <BeneficioItem icon={Sparkles} label="Forca Muscular" value={sub.forcaMuscular} />
              <BeneficioItem icon={Brain} label="Clareza Mental" value={sub.clarezaMental} />
              <BeneficioItem icon={Sparkles} label="Pele/Cabelo/Unhas" value={sub.peleCabeloUnhas} />
              <BeneficioItem icon={Shield} label="Suporte Imunologico" value={sub.suporteImunologico} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
            {sub.tempoParaEfeito && <span>Efeito em: {sub.tempoParaEfeito}</span>}
            {sub.maxSessoesPorSemana && <span>Max {sub.maxSessoesPorSemana}x/semana</span>}
            {sub.intervaloDias && <span>Intervalo: {sub.intervaloDias} dias</span>}
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Estoque: {sub.estoqueQuantidade} {sub.estoqueUnidade || "un"}
            </span>
            {sub.evidenciaCientifica && <span>Evidencia: {sub.evidenciaCientifica}</span>}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Substancias() {
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [viaFiltro, setViaFiltro] = useState("Todos");

  const { data: substancias = [], isLoading } = useQuery<Substancia[]>({
    queryKey: ["substancias", search, categoriaFiltro, viaFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoriaFiltro !== "Todos") params.set("categoria", categoriaFiltro);
      if (viaFiltro !== "Todos") params.set("via", viaFiltro);
      const res = await fetch(`${BASE_URL}api/substancias?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar substancias");
      return res.json();
    },
  });

  const viaCount = substancias.reduce((acc, s) => {
    acc[s.via] = (acc[s.via] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Substancias PADCOM</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Catalogo unificado de substancias para sessoes (IV, IM, Implantes)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{substancias.length} substancias</span>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIA_FILTERS.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoriaFiltro === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoriaFiltro(cat)}
                    className="text-xs"
                  >
                    {cat === "Todos" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                variant={viaFiltro === "Todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setViaFiltro("Todos")}
                className="text-xs"
              >
                Todas Vias
              </Button>
              {Object.entries(VIA_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={viaFiltro === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViaFiltro(key)}
                  className="text-xs"
                >
                  {label} {viaCount[key] ? `(${viaCount[key]})` : ""}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : substancias.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-lg mb-1">Nenhuma substancia encontrada</h3>
              <p className="text-sm text-muted-foreground">Ajuste os filtros ou adicione novas substancias</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {substancias.map((sub) => (
              <SubstanciaCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
