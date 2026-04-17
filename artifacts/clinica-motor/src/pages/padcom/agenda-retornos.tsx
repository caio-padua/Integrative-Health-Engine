import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/contexts/ClinicContext";

type Agendamento = {
  id: string;
  sessaoId: string;
  pacienteId: string;
  tipo: string;
  status: string;
  agendadoPara: string;
  bandaOrigem: string | null;
  observacao: string | null;
};

type Notificacao = {
  id: string;
  destinatarioPapel: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
};

const bandaColor: Record<string, string> = {
  verde: "bg-green-500",
  amarela: "bg-yellow-500",
  laranja: "bg-orange-500",
  vermelha: "bg-red-500",
};

const sevColor: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  aviso: "bg-yellow-100 text-yellow-800",
  critico: "bg-red-100 text-red-800",
};

export default function PadcomAgendaRetornos() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { unidadeSelecionada, isTodasClinicas } = useClinic();
  // Endpoints da Onda 3 exigem clinicaId. Se "Todas as Clínicas" estiver selecionado, mostramos banner.
  const clinicaId = unidadeSelecionada != null ? String(unidadeSelecionada) : null;
  const headers = clinicaId ? { "x-clinica-id": clinicaId } : undefined;

  // queryFn lança em !ok, então React Query expõe via isError — evita falso "Tudo em dia"
  const { data: agendamentos = [], isLoading: lA, isError: errA, error: errAObj } = useQuery<Agendamento[]>({
    queryKey: ["padcom-agendamentos", clinicaId],
    enabled: clinicaId != null,
    queryFn: async () => {
      const r = await fetch("/api/padcom-agendamentos", { headers });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `Erro HTTP ${r.status}`);
      }
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Resposta inválida do servidor (não-lista)");
      return data;
    },
  });
  const { data: notificacoes = [], isLoading: lN, isError: errN, error: errNObj } = useQuery<Notificacao[]>({
    queryKey: ["padcom-notificacoes", "nao-lidas", clinicaId],
    enabled: clinicaId != null,
    queryFn: async () => {
      const r = await fetch("/api/padcom-notificacoes?lida=false", { headers });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `Erro HTTP ${r.status}`);
      }
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Resposta inválida do servidor (não-lista)");
      return data;
    },
  });

  const patchAgenda = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/padcom-agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(headers ?? {}) },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("falha ao atualizar");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["padcom-agendamentos"] });
      toast({ title: "Agendamento atualizado" });
    },
  });

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/padcom-notificacoes/${id}/marcar-lida`, {
        method: "PATCH",
        headers,
      });
      if (!r.ok) throw new Error("falha");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["padcom-notificacoes", "nao-lidas"] }),
  });

  if (isTodasClinicas || !clinicaId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">PADCOM — Agenda de Retornos & Notificações</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground" data-testid="banner-selecione-clinica">
              Selecione uma clínica específica no seletor superior para ver os agendamentos e notificações.
              A visão "Todas as Clínicas" não é suportada nesta tela por questões de isolamento de dados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">PADCOM — Agenda de Retornos & Notificações</h1>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `/api/padcom-export-xlsx?clinicaId=${encodeURIComponent(clinicaId)}`;
          }}
          data-testid="btn-export-xlsx"
        >
          📥 Exportar XLSX completo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Próximos retornos ({agendamentos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {lA ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : errA ? (
              <p className="text-sm text-red-600" data-testid="erro-agendamentos">
                ⚠️ Falha ao carregar agendamentos: {(errAObj as Error)?.message ?? "erro desconhecido"}
              </p>
            ) : agendamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum retorno agendado. Use POST /padcom-sessoes/:id/agendar-retorno para criar.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[600px] overflow-y-auto">
                {agendamentos.map((a) => (
                  <li
                    key={a.id}
                    className="border rounded p-3 flex items-center justify-between gap-2"
                    data-testid={`agendamento-${a.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.bandaOrigem && (
                          <span
                            className={`inline-block w-3 h-3 rounded-full ${bandaColor[a.bandaOrigem] ?? "bg-gray-400"}`}
                          />
                        )}
                        <span className="font-medium">{new Date(a.agendadoPara).toLocaleDateString("pt-BR")}</span>
                        <Badge variant="outline">{a.tipo}</Badge>
                        <Badge>{a.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        sessão {a.sessaoId.slice(0, 8)} • paciente {a.pacienteId.slice(0, 8)}
                      </div>
                      {a.observacao && <div className="text-xs mt-1">{a.observacao}</div>}
                    </div>
                    {a.status === "pendente" && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchAgenda.mutate({ id: a.id, status: "confirmado" })}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchAgenda.mutate({ id: a.id, status: "cancelado" })}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações não lidas ({notificacoes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {lN ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : errN ? (
              <p className="text-sm text-red-600" data-testid="erro-notificacoes">
                ⚠️ Falha ao carregar notificações: {(errNObj as Error)?.message ?? "erro desconhecido"}
              </p>
            ) : notificacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo em dia ✓</p>
            ) : (
              <ul className="space-y-2 max-h-[600px] overflow-y-auto">
                {notificacoes.map((n) => (
                  <li
                    key={n.id}
                    className="border rounded p-3"
                    data-testid={`notificacao-${n.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${sevColor[n.severidade] ?? ""}`}>
                        {n.severidade}
                      </span>
                      <Badge variant="outline">{n.destinatarioPapel}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(n.criadoEm).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="font-medium">{n.titulo}</div>
                    <div className="text-sm text-muted-foreground">{n.mensagem}</div>
                    <Button
                      size="sm"
                      variant="link"
                      className="px-0 h-auto mt-1"
                      onClick={() => marcarLida.mutate(n.id)}
                    >
                      Marcar como lida
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
