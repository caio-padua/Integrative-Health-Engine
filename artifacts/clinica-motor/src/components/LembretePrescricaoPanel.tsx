import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
}

const PAGE_SIZE = 10;

/**
 * Task #11 — Painel de lembrete de prescricao na pagina do paciente.
 * Mostra a prescricao ativa (se houver) + paginacao simples dos envios
 * mais recentes consumindo o endpoint /prescricoes-lembrete/:id/envios.
 */
export default function LembretePrescricaoPanel({ pacienteId, unidadeId }: { pacienteId: number; unidadeId: number | null }) {
  const [pagina, setPagina] = useState(0);

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
            <div className="flex items-center gap-3 text-sm">
              <Badge variant={prescricao.ativo ? "default" : "outline"} className="text-[10px]">
                {prescricao.ativo ? "Ativa" : "Inativa"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Horarios:{" "}
                {horariosEfetivos.length === 0 ? (
                  <span className="text-amber-500 italic">nenhum (sem proprio nem padrao da unidade)</span>
                ) : (
                  <span className="font-mono">{horariosEfetivos.join(", ")}</span>
                )}
                {usaPadrao && <span className="ml-1 text-[10px]">(herdado da unidade)</span>}
              </span>
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
