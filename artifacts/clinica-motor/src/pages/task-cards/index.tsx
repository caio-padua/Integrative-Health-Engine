import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Clock, User, Filter, Trash2
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const COR_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  red: { bg: "bg-red-500/10", border: "border-l-red-500", text: "text-red-400", label: "URGENTE" },
  yellow: { bg: "bg-yellow-500/10", border: "border-l-yellow-500", text: "text-yellow-400", label: "ATENCAO" },
  green: { bg: "bg-green-500/10", border: "border-l-green-500", text: "text-green-400", label: "NORMAL" },
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

export default function TaskCardsPage() {
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("pendente");
  const [filterCor, setFilterCor] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = new URLSearchParams();
  if (filterRole) params.set("assignedRole", filterRole);
  if (filterStatus) params.set("status", filterStatus);
  if (filterCor) params.set("corAlerta", filterCor);

  const { data: cards = [], isLoading } = useQuery<any[]>({
    queryKey: ["task-cards", filterRole, filterStatus, filterCor],
    queryFn: async () => {
      const res = await fetch(`/api/task-cards?${params.toString()}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/task-cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-cards"] });
      toast({ title: "Task card atualizado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/task-cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-cards"] });
      toast({ title: "Task card removido" });
    },
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Task Cards</h1>
          <p className="text-sm text-muted-foreground">Alertas e tarefas gerados automaticamente pelas avaliacoes de enfermagem</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select className="bg-card border border-border text-sm px-2 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluido</option>
          </select>
          <select className="bg-card border border-border text-sm px-2 py-1" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Todas Roles</option>
            <option value="enfermeira_02">Enfermeira 02</option>
            <option value="medico_02">Medico 02</option>
          </select>
          <select className="bg-card border border-border text-sm px-2 py-1" value={filterCor} onChange={e => setFilterCor(e.target.value)}>
            <option value="">Todas Cores</option>
            <option value="red">Vermelho (Urgente)</option>
            <option value="yellow">Amarelo (Atencao)</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted/30" />)}
          </div>
        ) : cards.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400/50" />
            <p className="text-sm">Nenhum task card encontrado</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {cards.map((item: any) => {
              const card = item.taskCard || item;
              const cor = COR_CONFIG[card.corAlerta || "green"] || COR_CONFIG.green;
              return (
                <Card key={card.id} className={`border-l-[3px] ${cor.border} ${cor.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {card.corAlerta === "red" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                          {card.corAlerta === "yellow" && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                          <span className="font-bold text-sm">{card.titulo}</span>
                          <Badge className={`text-[9px] ${cor.text} border-current bg-transparent`}>{cor.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{card.descricao}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{card.assignedRole?.replace("_", " ")}
                          </span>
                          {card.prazoHoras !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {card.prazoHoras === 0 ? "IMEDIATO" : `${card.prazoHoras}h`}
                            </span>
                          )}
                          {item.pacienteNome && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />{item.pacienteNome}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[9px]">
                            {STATUS_LABELS[card.status] || card.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {card.status === "pendente" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateMutation.mutate({ id: card.id, status: "em_andamento" })}>
                              Iniciar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-400/30" onClick={() => updateMutation.mutate({ id: card.id, status: "concluido" })}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {card.status === "em_andamento" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-400/30" onClick={() => updateMutation.mutate({ id: card.id, status: "concluido" })}>
                            Concluir
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => deleteMutation.mutate(card.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
