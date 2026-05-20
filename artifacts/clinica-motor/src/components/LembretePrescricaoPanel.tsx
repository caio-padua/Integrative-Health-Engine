import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ExternalLink, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api-fetch";

interface PrescricaoLembrete {
  id: number;
  pacienteId: number;
  unidadeId: number | null;
  ativo: boolean;
  horariosEnvio: string[];
  periodos: unknown[];
  observacao: string | null;
}

interface Envio {
  id: number;
  prescricaoLembreteId: number;
  janela: string;
  status: "PENDENTE" | "ENVIADO" | "FALHOU";
  erro: string | null;
  enviadoEm: string;
}

interface Unidade {
  id: number;
  nome: string;
  lembreteHorariosPadrao: string[] | null;
  lembreteToleranciaMinutos: number | null;
}

const PAGE_SIZE = 10;

/**
 * Task #11 — Painel de lembrete de prescricao na pagina do paciente.
 * Mostra a prescricao ativa (se houver) + paginacao simples dos envios
 * mais recentes consumindo o endpoint /prescricoes-lembrete/:id/envios.
 */
export default function LembretePrescricaoPanel({ pacienteId, unidadeId }: { pacienteId: number; unidadeId: number | null }) {
  const [pagina, setPagina] = useState(0);
  const queryClient = useQueryClient();

  const { data: todasPrescricoes = [], isLoading } = useQuery<PrescricaoLembrete[]>({
    queryKey: ["prescricoes-lembrete"],
    queryFn: async () => {
      const r = await apiFetch("/api/prescricoes-lembrete");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  // Prefere prescricao ativa; entre ativas, mantem a primeira retornada pelo
  // backend (ordenada por id). Cai pra qualquer (incluindo inativa) so se
  // nao houver nenhuma ativa.
  const prescricoesDoPaciente = todasPrescricoes.filter(p => p.pacienteId === pacienteId);
  const prescricao =
    prescricoesDoPaciente.find(p => p.ativo) ?? prescricoesDoPaciente[0] ?? null;

  const { data: unidades = [] } = useQuery<Unidade[]>({
    queryKey: ["unidades"],
    queryFn: async () => {
      const r = await apiFetch("/api/unidades");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    enabled: !!prescricao,
  });

  const { data: envios = [], isLoading: loadingEnvios } = useQuery<Envio[]>({
    queryKey: ["prescricao-lembrete-envios", prescricao?.id ?? 0],
    queryFn: async () => {
      const r = await apiFetch(`/api/prescricoes-lembrete/${prescricao!.id}/envios`);
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    enabled: !!prescricao,
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Lembretes de Prescricao</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  const unidadeAlvo = prescricao
    ? (prescricao.unidadeId ?? unidadeId)
    : unidadeId;
  const unidade = unidades.find(u => u.id === unidadeAlvo) ?? null;
  const usaPadrao = !!prescricao && (prescricao.horariosEnvio?.length ?? 0) === 0;
  const horariosEfetivos = prescricao
    ? ((prescricao.horariosEnvio?.length ?? 0) > 0
        ? prescricao.horariosEnvio
        : (unidade?.lembreteHorariosPadrao ?? []))
    : [];
  // Tarefa #228 — tolerancia em minutos vem sempre da unidade (nao ha
  // override por prescricao no schema atual). Fallback 5 min replica o
  // default do worker quando a unidade nao tem o campo configurado.
  const toleranciaEfetiva = unidade?.lembreteToleranciaMinutos ?? 5;

  // Tarefa #228 — botao "voltar pro padrao da unidade" reseta
  // horariosEnvio = [] na prescricao, fazendo o worker herdar
  // novamente a janela configurada na unidade.
  const voltarParaPadraoMutation = useMutation({
    mutationFn: async () => {
      if (!prescricao) throw new Error("sem prescricao");
      const r = await apiFetch(`/api/prescricoes-lembrete/${prescricao.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horariosEnvio: [] }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(txt || "Erro ao voltar pro padrao");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescricoes-lembrete"] });
    },
  });

  const totalPaginas = Math.max(1, Math.ceil(envios.length / PAGE_SIZE));
  const enviosPagina = envios.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Bell className="h-5 w-5" /> Lembretes de Prescricao</span>
          <Link href="/prescricoes-lembrete">
            <Button variant="ghost" size="sm" className="text-xs">
              Gerenciar <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!prescricao ? (
          <div className="p-6 text-center text-sm text-muted-foreground bg-muted/10 rounded-md border border-dashed">
            Nenhuma prescricao de lembrete cadastrada para este paciente.{" "}
            <Link href="/prescricoes-lembrete" className="text-primary underline">Criar agora</Link>.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant={prescricao.ativo ? "default" : "outline"} className="text-[10px]">
                  {prescricao.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Horarios efetivos:</span>
                {horariosEfetivos.length === 0 ? (
                  <span className="text-amber-500 italic">nenhum (sem proprio nem padrao da unidade)</span>
                ) : (
                  <span className="font-mono text-foreground">{horariosEfetivos.join(", ")}</span>
                )}
                {horariosEfetivos.length > 0 && (
                  usaPadrao ? (
                    <Badge variant="outline" className="text-[10px]" title="Herdado da unidade">
                      padrao da unidade
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]" title="Sobrescrito nesta prescricao">
                      personalizado
                    </Badge>
                  )
                )}
                {!usaPadrao && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] gap-1"
                    disabled={voltarParaPadraoMutation.isPending}
                    onClick={() => voltarParaPadraoMutation.mutate()}
                    title="Limpa os horarios proprios e volta a herdar os padroes da unidade"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {voltarParaPadraoMutation.isPending ? "Salvando..." : "Voltar pro padrao da unidade"}
                  </Button>
                )}
              </div>
              {voltarParaPadraoMutation.isError && (
                <div className="text-[10px] text-red-400">
                  Erro ao voltar pro padrao: {(voltarParaPadraoMutation.error as Error).message}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Tolerancia:</span>
                <span className="font-mono text-foreground">{toleranciaEfetiva} min</span>
                <Badge variant="outline" className="text-[10px]" title="Configurada na unidade">
                  padrao da unidade
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold mb-2 text-muted-foreground">Ultimos envios</div>
              {loadingEnvios ? (
                <Skeleton className="h-20 w-full" />
              ) : envios.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                <>
                  <div className="border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-2">Data/Hora</th>
                          <th className="text-left p-2">Janela</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enviosPagina.map(e => (
                          <tr key={e.id} className="border-t">
                            <td className="p-2 font-mono">{new Date(e.enviadoEm).toLocaleString("pt-BR")}</td>
                            <td className="p-2 font-mono">{e.janela}</td>
                            <td className="p-2">
                              <Badge
                                variant={e.status === "ENVIADO" ? "default" : e.status === "FALHOU" ? "destructive" : "outline"}
                                className="text-[10px]"
                              >
                                {e.status === "ENVIADO" ? "entregue" : e.status === "FALHOU" ? "falhou" : "pendente"}
                              </Badge>
                            </td>
                            <td className="p-2 text-red-400">{e.erro ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        Pagina {pagina + 1} de {totalPaginas} ({envios.length} envios)
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={pagina === 0} onClick={() => setPagina(p => Math.max(0, p - 1))} className="h-7 text-xs">
                          Anterior
                        </Button>
                        <Button size="sm" variant="outline" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} className="h-7 text-xs">
                          Proxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
