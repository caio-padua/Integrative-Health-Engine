import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/contexts/ClinicContext";
import { Bot, Brain, User, CheckCircle2, MessageCircle, Phone } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const RESOLVEDORES = [
  { tipo: "robo", nome: "🤖 Robô", icon: Bot, cor: "#5C7C8A" },
  { tipo: "ia", nome: "🧠 IA", icon: Brain, cor: "#7B6450" },
  { tipo: "humano", nome: "🙋 Humano", icon: User, cor: "#B8941F" },
];

export default function DemandasResolucaoPage() {
  const { unidadeSelecionada, isTodasClinicas } = useClinic();
  const qc = useQueryClient();
  const [demandaAberta, setDemandaAberta] = useState<number | null>(null);

  const { data: demandas = [] } = useQuery<any[]>({
    queryKey: ["demandas-resolucao", unidadeSelecionada],
    queryFn: () =>
      fetch(`/api/demandas-resolucao${!isTodasClinicas ? `?unidadeId=${unidadeSelecionada}` : ""}`).then((r) => r.json()),
  });

  const concluir = useMutation({
    mutationFn: ({ id, resolvidoPor }: any) =>
      fetch(`/api/demandas-resolucao/${id}/concluir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvidoPor, caminhoResolucao: `concluido-via-${resolvidoPor}` }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  const criarSeed = useMutation({
    mutationFn: () =>
      fetch(`/api/demandas-resolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeId: unidadeSelecionada || 15,
          canalOrigem: "whatsapp",
          assunto: "Confirmação de retorno - paciente teste",
        }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">🏷️ Demandas de Resolução</h1>
          <p className="text-xs text-muted-foreground">Pingue-pongue até a conclusão · Robô / IA / Humano</p>
        </div>
        <Button onClick={() => criarSeed.mutate()} variant="outline" data-testid="btn-criar-demanda-teste">
          + Demanda de teste
        </Button>
      </header>

      <Card className="p-4">
        {demandas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma demanda registrada ainda. Clique em "+ Demanda de teste".</p>
        ) : (
          <div className="space-y-2">
            {demandas.map((d: any) => (
              <div key={d.id} className="border border-border/50 rounded p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">#{d.id}</Badge>
                      <span className="text-xs text-muted-foreground">{d.unidade_nome}</span>
                      {d.resolvido && (
                        <Badge className="bg-green-600 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1">{d.assunto || "(sem assunto)"}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        {d.canal_origem === "whatsapp" ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {d.canal_origem}
                      </span>
                      <span>🔁 {d.turnos_pingue_pongue} turnos</span>
                      <span className="font-mono font-semibold text-[#B8941F]">{fmt(d.valor_total_cobrado)}</span>
                      {d.resolvido_por && <span>Resolvido por: <strong>{d.resolvido_por}</strong></span>}
                    </div>
                  </div>
                  {!d.resolvido && (
                    <div className="flex gap-1">
                      {RESOLVEDORES.map((r) => {
                        const Icon = r.icon;
                        return (
                          <Button
                            key={r.tipo}
                            size="sm"
                            variant="outline"
                            onClick={() => concluir.mutate({ id: d.id, resolvidoPor: r.tipo })}
                            data-testid={`btn-concluir-${d.id}-${r.tipo}`}
                            style={{ borderColor: r.cor, color: r.cor }}
                            className="text-[10px] h-7"
                          >
                            <Icon className="w-3 h-3 mr-1" /> {r.nome}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
