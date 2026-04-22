import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, Clock, User, BarChart3 } from "lucide-react";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const ADERENCIA_CONFIG: Record<string, { color: string; label: string }> = {
  excelente: { color: "text-green-400 bg-green-500/10", label: "Excelente" },
  bom: { color: "text-blue-400 bg-blue-500/10", label: "Bom" },
  regular: { color: "text-yellow-400 bg-yellow-500/10", label: "Regular" },
  baixo: { color: "text-red-400 bg-red-500/10", label: "Baixo" },
};

export default function RasEvolutivoPage() {
  const { data: evolutivos = [], isLoading } = useQuery<any[]>({
    queryKey: ["ras-evolutivo"],
    queryFn: async () => {
      const res = await fetch(`/api/ras-evolutivo`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  return (
    <Layout>
      <BotaoImprimirFlutuante titulo="RAS Evolutivo · Aderência e Tolerância Longitudinal" />
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">RAS Evolutivo</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento longitudinal de sessoes — progresso, aderencia e tolerancia</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted/30" />)}
          </div>
        ) : evolutivos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum RAS Evolutivo registrado</p>
            <p className="text-xs mt-1">Os registros sao gerados automaticamente quando uma sessao e concluida</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {evolutivos.map((ev: any) => {
              const aderencia = ADERENCIA_CONFIG[ev.nivelAderencia || "bom"] || ADERENCIA_CONFIG.bom;
              return (
                <Card key={ev.id} className={`border-l-[3px] ${
                  ev.isUltima ? "border-l-green-500 bg-green-500/5" :
                  ev.isAntepenultima ? "border-l-amber-500 bg-amber-500/5" :
                  "border-l-primary"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="font-bold text-sm">Sessao #{ev.sessaoId || "-"}</span>
                          {ev.protocoloId && <span className="text-[10px] text-muted-foreground">Protocolo #{ev.protocoloId}</span>}
                          {ev.isUltima && <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-400/30">ULTIMA SESSAO</Badge>}
                          {ev.isAntepenultima && <Badge className="text-[8px] bg-amber-500/20 text-amber-400 border-amber-400/30">PENULTIMA</Badge>}
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <div className="w-24 h-2 bg-muted/50 overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${ev.percentualProgresso || 0}%` }} />
                            </div>
                            <span className="text-xs font-mono font-bold text-primary">{ev.percentualProgresso || 0}%</span>
                          </div>

                          <Badge className={`text-[9px] ${aderencia.color} border-current`}>
                            Aderencia: {aderencia.label}
                          </Badge>

                          {ev.tolerancia && (
                            <span className="text-[10px] text-muted-foreground">Tolerancia: {ev.tolerancia}</span>
                          )}
                        </div>

                        {ev.observacaoSemanal && (
                          <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">
                            "{ev.observacaoSemanal}"
                          </p>
                        )}

                        {ev.historicoSessoes && Array.isArray(ev.historicoSessoes) && ev.historicoSessoes.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {ev.historicoSessoes.map((h: any, i: number) => (
                              <span key={i} className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5">
                                S#{h.sessaoId}: {h.progresso}% ({h.aderencia})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />Paciente #{ev.pacienteId}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />{new Date(ev.criadoEm).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
