import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Clock, CheckCircle, AlertTriangle, XCircle, ArrowRight,
  User, BarChart3, Star, TrendingUp, MessageSquare, Filter
} from "lucide-react";

interface Delegacao {
  id: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  prazo: string;
  status: string;
  categoria: string;
  delegadoPorNome: string;
  responsavelNome: string;
  responsavelId: number;
  dataLimite: string | null;
  concluidoEm: string | null;
  notaQualidade: number | null;
  criadoEm: string;
  unidadeNome: string | null;
  unidadeCor: string | null;
  unidadeId: number | null;
}

interface Scoring {
  id: number;
  nome: string;
  perfil: string;
  total: number;
  concluidas: number;
  atrasadas: number;
  emAndamento: number;
  pendentes: number;
  taxaResolucao: number;
  taxaNoPrazo: number;
  mediaQualidade: number | null;
}

interface FeedbackResumo {
  total: number;
  mediaGeral: number;
  distribuicao: number[];
  porCanal: Record<string, { total: number; media: number }>;
}

interface Feedback {
  id: number;
  pacienteId: number;
  nota: number;
  comentario: string | null;
  canal: string;
  criadoEm: string;
}

const API = "/api/delegacao";

const PRIORIDADE_COR: Record<string, string> = {
  urgente: "bg-red-500/20 text-red-300 border-red-500/30",
  alta: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  media: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  baixa: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; cor: string; colCor: string }> = {
  pendente: { label: "Pendente", icon: Clock, cor: "text-zinc-400", colCor: "border-zinc-500/30" },
  em_andamento: { label: "Em Andamento", icon: ArrowRight, cor: "text-blue-400", colCor: "border-blue-500/30" },
  concluido: { label: "Concluído", icon: CheckCircle, cor: "text-emerald-400", colCor: "border-emerald-500/30" },
  atrasado: { label: "Atrasado", icon: AlertTriangle, cor: "text-red-400", colCor: "border-red-500/30" },
};

const COLUNAS_BOARD = ["pendente", "em_andamento", "concluido", "atrasado"];

export default function DelegacaoPage() {
  const [tab, setTab] = useState<"board" | "scoring" | "feedback">("board");
  const [delegacoes, setDelegacoes] = useState<Delegacao[]>([]);
  const [scoring, setScoring] = useState<Scoring[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackResumo, setFeedbackResumo] = useState<FeedbackResumo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: number; nome: string; perfil: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: number; nome: string; cor: string }[]>([]);
  const [filtroUnidade, setFiltroUnidade] = useState<number | null>(null);
  const [form, setForm] = useState({
    titulo: "", descricao: "", prioridade: "media", prazo: "48h",
    categoria: "administrativo", responsavelId: 0, unidadeId: 0,
  });

  const fetchAll = useCallback(async () => {
    const [dRes, sRes, fRes, frRes, uRes, unRes] = await Promise.all([
      fetch(API), fetch(`${API}/scoring`), fetch(`${API}/feedback`),
      fetch(`${API}/feedback/resumo`), fetch("/api/usuarios"), fetch("/api/unidades"),
    ]);
    if (dRes.ok) setDelegacoes(await dRes.json());
    if (sRes.ok) setScoring(await sRes.json());
    if (fRes.ok) setFeedbacks(await fRes.json());
    if (frRes.ok) setFeedbackResumo(await frRes.json());
    if (uRes.ok) setUsuarios(await uRes.json());
    if (unRes.ok) setUnidades(await unRes.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const criarDelegacao = async () => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, delegadoPorId: 1, unidadeId: form.unidadeId || undefined }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ titulo: "", descricao: "", prioridade: "media", prazo: "48h", categoria: "administrativo", responsavelId: 0, unidadeId: 0 });
      fetchAll();
    }
  };

  const mudarStatus = async (id: number, novoStatus: string) => {
    await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    fetchAll();
  };

  const tempoRestante = (dataLimite: string | null) => {
    if (!dataLimite) return "";
    const diff = new Date(dataLimite).getTime() - Date.now();
    if (diff < 0) return "VENCIDO";
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h restantes`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Central de Delegacao</h1>
            <p className="text-xs text-muted-foreground mt-1">Gerencie tarefas, acompanhe resolutividade e feedback</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 hover:bg-primary/90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Delegacao
          </button>
        </div>

        <div className="flex gap-1 border-b border-border/30 pb-1">
          {([
            { key: "board", label: "Board Delegacao", icon: Filter },
            { key: "scoring", label: "Resolutividade", icon: TrendingUp },
            { key: "feedback", label: "Feedback Pacientes", icon: MessageSquare },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {(() => {
          const unidadesComDelegacao = unidades.filter(u => delegacoes.some(d => d.unidadeId === u.id));
          return unidadesComDelegacao.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Filtrar por Clinica:</span>
              <button
                onClick={() => setFiltroUnidade(null)}
                className={`text-[10px] font-bold px-3 py-1 border transition-all ${
                  filtroUnidade === null ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/10 text-muted-foreground border-border/30 hover:bg-muted/20"
                }`}
              >
                Todas
              </button>
              {unidadesComDelegacao.map(u => (
                <button
                  key={u.id}
                  onClick={() => setFiltroUnidade(u.id)}
                  className={`text-[10px] font-bold px-3 py-1 border transition-all flex items-center gap-1.5 ${
                    filtroUnidade === u.id ? "bg-primary/20 border-primary/40" : "bg-muted/10 border-border/30 hover:bg-muted/20"
                  }`}
                  style={{ color: filtroUnidade === u.id ? u.cor : undefined, borderColor: filtroUnidade === u.id ? u.cor : undefined }}
                >
                  <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: u.cor }} />
                  {u.nome}
                </button>
              ))}
            </div>
          );
        })()}

        {showForm && (
          <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
            <h3 className="text-sm font-bold">Nova Delegacao</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Titulo da tarefa..."
                className="col-span-2 bg-background border border-border/40 px-3 py-2 text-xs"
              />
              <textarea
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descricao detalhada..."
                className="col-span-2 bg-background border border-border/40 px-3 py-2 text-xs h-16 resize-none"
              />
              <select
                value={form.responsavelId}
                onChange={e => setForm({ ...form, responsavelId: Number(e.target.value) })}
                className="bg-background border border-border/40 px-3 py-2 text-xs"
              >
                <option value={0}>Responsavel...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>)}
              </select>
              <select
                value={form.unidadeId}
                onChange={e => setForm({ ...form, unidadeId: Number(e.target.value) })}
                className="bg-background border border-border/40 px-3 py-2 text-xs"
              >
                <option value={0}>Clinica destino...</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
              <select
                value={form.prazo}
                onChange={e => setForm({ ...form, prazo: e.target.value })}
                className="bg-background border border-border/40 px-3 py-2 text-xs"
              >
                <option value="24h">24 horas</option>
                <option value="36h">36 horas</option>
                <option value="48h">48 horas</option>
                <option value="72h">72 horas</option>
                <option value="1_semana">1 semana</option>
              </select>
              <select
                value={form.prioridade}
                onChange={e => setForm({ ...form, prioridade: e.target.value })}
                className="bg-background border border-border/40 px-3 py-2 text-xs"
              >
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baixa">Baixa</option>
              </select>
              <select
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="bg-background border border-border/40 px-3 py-2 text-xs"
              >
                <option value="clinico">Clinico</option>
                <option value="administrativo">Administrativo</option>
                <option value="financeiro">Financeiro</option>
                <option value="logistica">Logistica</option>
                <option value="atendimento">Atendimento</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground">Cancelar</button>
              <button
                onClick={criarDelegacao}
                disabled={!form.titulo || !form.responsavelId}
                className="text-xs font-bold px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-40"
              >
                Delegar
              </button>
            </div>
          </div>
        )}

        {tab === "board" && (
          <div className="grid grid-cols-4 gap-3">
            {COLUNAS_BOARD.map(col => {
              const config = STATUS_CONFIG[col];
              const Icon = config.icon;
              const itens = delegacoes.filter(d => d.status === col && (filtroUnidade === null || d.unidadeId === filtroUnidade));

              return (
                <div key={col} className={`border ${config.colCor} bg-muted/5`}>
                  <div className="p-3 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.cor}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">{config.label}</span>
                    </div>
                    <Badge className="bg-muted/20 text-muted-foreground text-[9px] px-1.5 py-0 border-none">{itens.length}</Badge>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                    {itens.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/40 text-xs">Vazio</div>
                    )}
                    {itens.map(d => (
                      <div
                        key={d.id}
                        className="border border-border/30 bg-background/50 p-3 space-y-2 hover:border-primary/30 transition-all"
                        style={{ borderLeftWidth: "4px", borderLeftColor: d.unidadeCor || "#666" }}
                      >
                        {d.unidadeNome && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="w-2 h-2 flex-shrink-0"
                              style={{ backgroundColor: d.unidadeCor || "#666", borderRadius: "0px" }}
                            />
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: d.unidadeCor || "#999" }}>
                              {d.unidadeNome}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold leading-tight">{d.titulo}</span>
                          <Badge className={`text-[8px] px-1.5 py-0 border ${PRIORIDADE_COR[d.prioridade]}`}>
                            {d.prioridade.toUpperCase()}
                          </Badge>
                        </div>
                        {d.descricao && <p className="text-[10px] text-muted-foreground line-clamp-2">{d.descricao}</p>}
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{d.responsavelNome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className={`${d.dataLimite && tempoRestante(d.dataLimite) === "VENCIDO" ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                            {d.prazo} — {tempoRestante(d.dataLimite)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <span className="bg-muted/30 px-1.5 py-0.5">{d.categoria}</span>
                        </div>
                        {col !== "concluido" && col !== "cancelado" && (
                          <div className="flex gap-1 pt-1">
                            {col === "pendente" && (
                              <button onClick={() => mudarStatus(d.id, "em_andamento")}
                                className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30">
                                Iniciar
                              </button>
                            )}
                            {(col === "em_andamento" || col === "atrasado") && (
                              <button onClick={() => mudarStatus(d.id, "concluido")}
                                className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30">
                                Concluir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "scoring" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider">Ranking de Resolutividade</h2>
            <div className="space-y-2">
              {scoring.map((s, i) => (
                <div key={s.id} className="border border-border/30 bg-muted/5 p-4 flex items-center gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${
                    i === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                    i === 1 ? "bg-zinc-400/20 text-zinc-300 border border-zinc-400/30" :
                    i === 2 ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" :
                    "bg-muted/20 text-muted-foreground border border-border/30"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold">{s.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{s.perfil}</div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-sm font-bold text-primary">{s.taxaResolucao}%</div>
                      <div className="text-[9px] text-muted-foreground">Resolucao</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">{s.concluidas}</div>
                      <div className="text-[9px] text-muted-foreground">Concluidas</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-400">{s.atrasadas}</div>
                      <div className="text-[9px] text-muted-foreground">Atrasadas</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-400">{s.taxaNoPrazo}%</div>
                      <div className="text-[9px] text-muted-foreground">No Prazo</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-yellow-400">{s.mediaQualidade ?? "—"}</div>
                      <div className="text-[9px] text-muted-foreground">Qualidade</div>
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="h-2 bg-muted/30 overflow-hidden">
                      <div
                        className={`h-full transition-all ${s.taxaResolucao >= 80 ? "bg-emerald-500" : s.taxaResolucao >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${s.taxaResolucao}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {scoring.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma delegacao registrada ainda</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Crie delegacoes para ver o ranking</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "feedback" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-primary/20 bg-primary/5 p-4 text-center">
                <div className="text-2xl font-bold text-primary">{feedbackResumo?.mediaGeral ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Media Geral</div>
              </div>
              <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{feedbackResumo?.total ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Total Respostas</div>
              </div>
              <div className="border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {feedbackResumo ? feedbackResumo.distribuicao.slice(4).reduce((a, b) => a + b, 0) : 0}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Notas 4-5</div>
              </div>
              <div className="border border-red-500/20 bg-red-500/5 p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {feedbackResumo ? feedbackResumo.distribuicao.slice(0, 3).reduce((a, b) => a + b, 0) : 0}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Notas 0-2</div>
              </div>
            </div>

            {feedbackResumo && feedbackResumo.total > 0 && (
              <div className="border border-border/30 bg-muted/5 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Distribuicao de Notas</h3>
                <div className="flex gap-2 items-end h-24">
                  {feedbackResumo.distribuicao.map((count, i) => {
                    const max = Math.max(...feedbackResumo.distribuicao, 1);
                    const pct = (count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground">{count}</span>
                        <div className="w-full bg-muted/20 relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                          <div className={`absolute inset-0 ${
                            i <= 1 ? "bg-red-500/60" : i === 2 ? "bg-orange-500/60" : i === 3 ? "bg-yellow-500/60" : "bg-emerald-500/60"
                          }`} />
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: i }, (_, j) => (
                            <Star key={j} className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                          ))}
                          {i === 0 && <span className="text-[8px] text-muted-foreground">0</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider">Ultimos Feedbacks</h3>
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum feedback recebido ainda</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Os pacientes enviarao via WhatsApp</p>
                </div>
              ) : (
                feedbacks.slice(0, 20).map(f => (
                  <div key={f.id} className="border border-border/30 bg-muted/5 p-3 flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < f.nota ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs">{f.comentario || "Sem comentario"}</span>
                    </div>
                    <Badge className="text-[8px] px-1.5 py-0 bg-muted/20 text-muted-foreground border-none">{f.canal}</Badge>
                    <span className="text-[9px] text-muted-foreground">{new Date(f.criadoEm).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
