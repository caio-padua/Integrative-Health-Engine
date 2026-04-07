import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, CheckCircle2, AlertCircle, Lock, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface Etapa {
  id: number;
  codigoFluxo: string;
  tipoProcedimento: string;
  etapaOrdem: number;
  etapaNome: string;
  perfilResponsavel: string;
  requerido: boolean;
  condicional: boolean;
  regraCondicional: string | null;
  podeBypass: boolean;
  exigeJustificativa: boolean;
  bloqueiaSeoPendente: boolean;
  observacao: string | null;
}

const TIPO_CORES: Record<string, string> = {
  CONSULTA: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  INFUSAO: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  IMPLANTE: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Consulta",
  INFUSAO: "Infusao",
  IMPLANTE: "Implante",
};

export default function FluxosPage() {
  const { data, isLoading, isError } = useQuery<{ fluxos: Record<string, Etapa[]>; total: number }>({
    queryKey: ["fluxos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/fluxos`);
      if (!res.ok) throw new Error("Erro ao carregar fluxos");
      return res.json();
    },
  });

  const tipos = data ? Object.keys(data.fluxos) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitBranch className="h-8 w-8 text-primary" />
            Fluxos de Aprovacao
          </h1>
          <p className="text-muted-foreground mt-1">
            Etapas e responsaveis em cada fluxo de procedimento do PADCOM V15.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Erro ao carregar fluxos de aprovacao.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && tipos.map((tipo) => {
          const etapas = data!.fluxos[tipo];
          return (
            <Card key={tipo} className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-md border ${TIPO_CORES[tipo] || "bg-muted text-muted-foreground"}`}>
                    {TIPO_LABELS[tipo] || tipo}
                  </span>
                  <span className="text-lg font-semibold">{etapas[0]?.codigoFluxo}</span>
                  <span className="text-sm text-muted-foreground font-normal ml-auto">
                    {etapas.length} etapas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {etapas.map((etapa, idx) => (
                    <div key={etapa.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {etapa.etapaOrdem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{etapa.etapaNome}</span>
                            {etapa.condicional && (
                              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">
                                Condicional
                              </Badge>
                            )}
                            {!etapa.requerido && (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Opcional
                              </Badge>
                            )}
                            {etapa.podeBypass && (
                              <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">
                                Pode Bypass
                              </Badge>
                            )}
                            {etapa.exigeJustificativa && (
                              <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">
                                Exige Justificativa
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              Responsavel: <span className="text-foreground font-medium">{etapa.perfilResponsavel}</span>
                            </span>
                            {etapa.regraCondicional && (
                              <span className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2 py-0.5 rounded">
                                {etapa.regraCondicional}
                              </span>
                            )}
                          </div>
                          {etapa.observacao && (
                            <p className="text-xs text-muted-foreground mt-0.5">{etapa.observacao}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {etapa.requerido ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-muted-foreground/50" />
                          )}
                          {etapa.bloqueiaSeoPendente && (
                            <Lock className="w-4 h-4 text-orange-400/70" title="Bloqueia se pendente" />
                          )}
                        </div>
                      </div>
                      {idx < etapas.length - 1 && (
                        <div className="flex items-center ml-4 my-1">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 rotate-90" />
                        </div>
                      )}
                      {idx < etapas.length - 1 && <Separator className="mt-2 opacity-20" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
