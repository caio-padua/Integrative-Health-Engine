import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Clock, CheckCircle2, ChevronUp,
  MessageSquare, ArrowUpRight, Filter, RefreshCw
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const MOTIVOS = [
  { value: "SEM_CONTATO", label: "Sem contato (paciente nao atendeu)" },
  { value: "PACIENTE_PEDIU_ADIAR", label: "Paciente pediu para ligar depois" },
  { value: "AGUARDANDO_RETORNO", label: "Aguardando retorno do paciente" },
  { value: "ERRO_ATRIBUICAO", label: "Erro de atribuicao (nao era minha)" },
  { value: "SOBRECARGA", label: "Sobrecarga (muitas tasks simultaneas)" },
  { value: "INSUMO_INDISPONIVEL", label: "Insumo indisponivel" },
  { value: "PACIENTE_FALTOU", label: "Paciente faltou" },
  { value: "OUTRO", label: "Outro" },
];

const NIVEIS_ESCALACAO = [
  { value: "SUPERVISOR", label: "Supervisor (Graco)" },
  { value: "DIRETOR", label: "Diretor (Dr. Caio)" },
  { value: "FILA_PRECEPTOR", label: "Fila Preceptor (decisao clinica)" },
];

function SemaforoBadge({ semaforo }: { semaforo: string }) {
  const colors: Record<string, string> = {
    VERMELHO: "bg-red-500/20 text-red-400 border-red-500/30",
    AMARELO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    VERDE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const labels: Record<string, string> = {
    VERMELHO: "VENCIDO",
    AMARELO: "VENCE EM BREVE",
    VERDE: "NO PRAZO",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${colors[semaforo] || colors.VERDE}`}>
      {labels[semaforo] || semaforo}
    </span>
  );
}

function JustifyModal({ item, onClose, onSubmitted }: { item: any; onClose: () => void; onSubmitted: () => void }) {
  const [motivoPadrao, setMotivoPadrao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!motivoPadrao || !justificativa) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/sla/justify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: item.type,
          entityId: item.id,
          motivoPadrao,
          justificativa,
          proximaAcaoEm: proximaAcao || null,
        }),
      });
      onSubmitted();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Justificativa Obrigatoria</h3>
          <SemaforoBadge semaforo={item.sla.semaforo} />
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{item.type} #{item.id}</span> — {item.titulo}
          {item.pacienteNome && <span className="ml-2 text-primary">({item.pacienteNome})</span>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Motivo</label>
          <div className="grid grid-cols-1 gap-1">
            {MOTIVOS.map(m => (
              <button
                key={m.value}
                onClick={() => setMotivoPadrao(m.value)}
                className={`text-left px-3 py-2 text-xs border transition-colors ${
                  motivoPadrao === m.value
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Justificativa (obrigatorio)</label>
          <textarea
            value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            rows={3}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="Descreva o que aconteceu e o que foi feito..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Proxima acao em (opcional)</label>
          <input
            type="datetime-local"
            value={proximaAcao}
            onChange={e => setProximaAcao(e.target.value)}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 text-xs h-9" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 text-xs h-9"
            disabled={!motivoPadrao || !justificativa || loading}
            onClick={handleSubmit}
          >
            {loading ? "Registrando..." : "Registrar Justificativa"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EscalateModal({ item, onClose, onSubmitted }: { item: any; onClose: () => void; onSubmitted: () => void }) {
  const [nivel, setNivel] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nivel || !motivo) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/sla/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: item.type,
          entityId: item.id,
          nivel,
          motivo,
          observacao: observacao || null,
        }),
      });
      onSubmitted();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-red-400" /> Escalonamento
        </h3>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{item.type} #{item.id}</span> — {item.titulo}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Escalar para</label>
          <div className="grid grid-cols-1 gap-1">
            {NIVEIS_ESCALACAO.map(n => (
              <button
                key={n.value}
                onClick={() => setNivel(n.value)}
                className={`text-left px-3 py-2 text-xs border transition-colors ${
                  nivel === n.value
                    ? "border-red-500 bg-red-500/10 text-red-400 font-semibold"
                    : "border-border hover:border-red-500/40 text-muted-foreground"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Motivo do escalonamento</label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="Ex: Paciente sumido + tratamento IM ativo, risco de abandono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Observacao (opcional)</label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 text-xs h-9" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            className="flex-1 text-xs h-9"
            disabled={!nivel || !motivo || loading}
            onClick={handleSubmit}
          >
            {loading ? "Escalando..." : "Escalar Agora"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JustificativasPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada } = useClinic();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSemaforo, setFilterSemaforo] = useState<string | null>(null);
  const [justifyItem, setJustifyItem] = useState<any>(null);
  const [escalateItem, setEscalateItem] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unidadeSelecionada) params.set("unidadeId", String(unidadeSelecionada));
      const res = await fetch(`${API_BASE}/sla/queue?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unidadeSelecionada]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredItems = data?.items?.filter((item: any) => {
    if (filterSemaforo && item.sla.semaforo !== filterSemaforo) return false;
    return true;
  }) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight text-foreground">SLA & Justificativas</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Fila unificada de SLA — Graco cobra, sistema registra
              {nomeUnidadeSelecionada && nomeUnidadeSelecionada !== "Todas as Clinicas" && (
                <span className="ml-2 text-primary font-semibold">| {nomeUnidadeSelecionada}</span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : data?.summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button onClick={() => setFilterSemaforo(filterSemaforo === "VERMELHO" ? null : "VERMELHO")} className="text-left">
              <Card className={`border-red-500/30 transition-all ${filterSemaforo === "VERMELHO" ? "ring-2 ring-red-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-400">Vencidos</span>
                  </div>
                  <div className="text-2xl font-black text-red-400 mt-1">{data.summary.vermelho}</div>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setFilterSemaforo(filterSemaforo === "AMARELO" ? null : "AMARELO")} className="text-left">
              <Card className={`border-amber-500/30 transition-all ${filterSemaforo === "AMARELO" ? "ring-2 ring-amber-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Vence em breve</span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{data.summary.amarelo}</div>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setFilterSemaforo(filterSemaforo === "VERDE" ? null : "VERDE")} className="text-left">
              <Card className={`border-emerald-500/30 transition-all ${filterSemaforo === "VERDE" ? "ring-2 ring-emerald-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">No prazo</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{data.summary.verde}</div>
                </CardContent>
              </Card>
            </button>
            <Card className="border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-red-400">Sem Justificativa</span>
                </div>
                <div className="text-2xl font-black text-red-400 mt-1">{data.summary.semJustificativa}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fila SLA ({filteredItems.length} itens)
              {filterSemaforo && (
                <button onClick={() => setFilterSemaforo(null)} className="text-[10px] text-primary hover:underline ml-2">
                  Limpar filtro
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {filterSemaforo ? "Nenhum item com este status" : "Nenhum item pendente na fila"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredItems.map((item: any) => (
                  <div key={`${item.type}_${item.id}`} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SemaforoBadge semaforo={item.sla.semaforo} />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.type}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">#{item.id}</span>
                          {item.assignedRole && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                              {item.assignedRole}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-1 truncate">{item.titulo}</div>
                        {item.descricao && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.descricao}</div>
                        )}
                        {item.pacienteNome && (
                          <div className="text-xs text-primary/80 mt-0.5">Paciente: {item.pacienteNome}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span>Vence: {item.sla.dueAt ? new Date(item.sla.dueAt).toLocaleString("pt-BR") : "—"}</span>
                          <span className={item.sla.restanteHoras < 0 ? "text-red-400 font-bold" : ""}>
                            {item.sla.restanteHoras < 0 ? `${Math.abs(item.sla.restanteHoras)}h atrasado` : `${item.sla.restanteHoras}h restante`}
                          </span>
                        </div>
                        {item.temJustificativa && item.justificativas?.length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 border border-border text-xs space-y-1">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Justificativa registrada
                            </div>
                            {item.justificativas.map((j: any) => (
                              <div key={j.id} className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{MOTIVOS.find(m => m.value === j.motivoPadrao)?.label || j.motivoPadrao}</span>
                                <span className="ml-2">{j.justificativa}</span>
                                {j.proximaAcaoEm && (
                                  <span className="ml-2 text-primary">Proxima acao: {new Date(j.proximaAcaoEm).toLocaleString("pt-BR")}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.escalada && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-xs">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-red-400 flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" /> Escalado para {item.escalada.nivel}
                            </div>
                            <div className="text-muted-foreground mt-0.5">{item.escalada.motivo}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {item.sla.semaforo === "VERMELHO" && !item.temJustificativa && (
                          <Button
                            size="sm"
                            className="text-[10px] h-7 gap-1 uppercase tracking-wider"
                            onClick={() => setJustifyItem(item)}
                          >
                            <MessageSquare className="w-3 h-3" /> Justificar
                          </Button>
                        )}
                        {item.temJustificativa && (
                          <Button
                            size="sm"
                            className="text-[10px] h-7 gap-1 uppercase tracking-wider"
                            onClick={() => setJustifyItem(item)}
                          >
                            <MessageSquare className="w-3 h-3" /> + Justificar
                          </Button>
                        )}
                        {!item.escalada && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-[10px] h-7 gap-1 uppercase tracking-wider"
                            onClick={() => setEscalateItem(item)}
                          >
                            <ChevronUp className="w-3 h-3" /> Escalar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {justifyItem && (
        <JustifyModal
          item={justifyItem}
          onClose={() => setJustifyItem(null)}
          onSubmitted={() => { setJustifyItem(null); fetchData(); }}
        />
      )}
      {escalateItem && (
        <EscalateModal
          item={escalateItem}
          onClose={() => setEscalateItem(null)}
          onSubmitted={() => { setEscalateItem(null); fetchData(); }}
        />
      )}
    </Layout>
  );
}
