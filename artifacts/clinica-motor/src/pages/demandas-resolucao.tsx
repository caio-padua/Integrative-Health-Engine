import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/contexts/ClinicContext";
import { Bot, Brain, User, CheckCircle2, MessageCircle, Phone, Workflow } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const RESOLVEDORES = [
  { tipo: "robo", nome: "Robô", icon: Bot, varCor: "--pw-petroleo-claro" },
  { tipo: "ia", nome: "IA", icon: Brain, varCor: "--pw-eventos-pay" },
  { tipo: "humano", nome: "Humano", icon: User, varCor: "--pw-dourado" },
];

export default function DemandasResolucaoPage() {
  const { unidadeSelecionada, isTodasClinicas } = useClinic();
  const qc = useQueryClient();
  const [, setDemandaAberta] = useState<number | null>(null);

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
    <div className="p-6 space-y-6 bg-[var(--pw-pergaminho)] min-h-screen">
      {/* HEADER MANIFESTO 2.0 */}
      <div className="flex items-start justify-between gap-4 pw-borda-sagrada py-1">
        <div className="flex items-start gap-4">
          <Workflow className="w-7 h-7 text-[var(--pw-petroleo)] mt-1" />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="pw-titulo-manifesto text-2xl">Demandas de Resolução</h1>
              <span className="pw-selo-dourado px-2 py-1 text-[10px] tracking-[0.2em]">PADCON · PINGUE-PONGUE</span>
            </div>
            <p className="text-sm text-[var(--pw-tinta)] mt-1">
              Fluxo iterativo entre <strong>Robô / IA / Humano</strong> até a conclusão da demanda.
            </p>
          </div>
        </div>
        <Button
          onClick={() => criarSeed.mutate()}
          variant="outline"
          data-testid="btn-criar-demanda-teste"
          className="border-[var(--pw-marfim)] text-[var(--pw-petroleo)] hover:bg-[var(--pw-marfim)] rounded-none"
        >
          + Demanda de teste
        </Button>
      </div>

      {/* LISTA DE DEMANDAS */}
      <Card className="pw-card p-4 rounded-none">
        {demandas.length === 0 ? (
          <p className="text-sm text-[var(--pw-cinza-bruma)] text-center py-8 italic">
            Nenhuma demanda registrada ainda. Clique em <span className="text-[var(--pw-petroleo)] font-semibold">"+ Demanda de teste"</span> para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {demandas.map((d: any) => (
              <div
                key={d.id}
                className="border border-[var(--pw-marfim)] bg-white p-3 hover:bg-[var(--pw-pergaminho)] transition-colors"
                onClick={() => setDemandaAberta(d.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px] border-[var(--pw-marfim)] text-[var(--pw-tinta)] rounded-none">
                        #{d.id}
                      </Badge>
                      <span className="text-xs text-[var(--pw-cinza-bruma)]">{d.unidade_nome}</span>
                      {d.resolvido && (
                        <Badge className="bg-[var(--pw-saude)] text-white text-[10px] rounded-none">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1 text-[var(--pw-grafite)]">
                      {d.assunto || <span className="italic text-[var(--pw-cinza-bruma)]">(sem assunto)</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--pw-cinza-bruma)] mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        {d.canal_origem === "whatsapp" ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {d.canal_origem}
                      </span>
                      <span>🔁 {d.turnos_pingue_pongue} turnos</span>
                      <span className="pw-numero-display font-semibold text-[var(--pw-dourado)]">
                        {fmt(d.valor_total_cobrado)}
                      </span>
                      {d.resolvido_por && (
                        <span>
                          Resolvido por: <strong className="text-[var(--pw-petroleo)]">{d.resolvido_por}</strong>
                        </span>
                      )}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              concluir.mutate({ id: d.id, resolvidoPor: r.tipo });
                            }}
                            data-testid={`btn-concluir-${d.id}-${r.tipo}`}
                            style={{
                              borderColor: `var(${r.varCor})`,
                              color: `var(${r.varCor})`,
                            }}
                            className="text-[10px] h-7 rounded-none hover:bg-[var(--pw-pergaminho)]"
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
