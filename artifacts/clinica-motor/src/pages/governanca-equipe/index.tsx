import { useState } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, AlertTriangle, CheckCircle2, XCircle,
  Scale, TrendingUp, AlertOctagon, ShieldAlert
} from "lucide-react";
import { PW, MONO } from "../penumbra-claro";

const API = "/api/padteam-governo";

const ABAS = [
  { id: "sla", label: "SLA ATIVO", icon: Clock },
  { id: "justificativas", label: "JUSTIFICATIVAS PENDENTES", icon: Scale },
  { id: "escalamentos", label: "ESCALONAMENTOS", icon: TrendingUp },
  { id: "disciplinar", label: "DISCIPLINAR", icon: ShieldAlert },
] as const;

type AbaId = typeof ABAS[number]["id"];

const SEMAFORO_COR: Record<string, string> = {
  verde: "#48BB78",
  amarelo: "#ED8936",
  vermelho: "#E53E3E",
};

const NIVEL_LABEL: Record<string, string> = {
  urgente: "URGENTE",
  alta: "ALTA",
  media: "MÉDIA",
  baixa: "BAIXA",
};

const NIVEL_DISC_COR: Record<string, string> = {
  advertencia: "#ED8936",
  demissao: "#E53E3E",
  justa_causa: "#9B2335",
};

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ABA 1 — SLA Ativo
function AbaSlaAtivo({ unidadeId }: { unidadeId?: number }) {
  const params = unidadeId ? `?unidadeId=${unidadeId}` : "";
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["sla-ativos", unidadeId],
    queryFn: async () => {
      const res = await apiFetch(`${API}/sla-ativos${params}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        CARREGANDO SLA...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        NENHUM SLA (SERVICE LEVEL AGREEMENT) ATIVO NO MOMENTO
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={{ borderCollapse: "collapse", fontFamily: MONO }}>
        <thead>
          <tr style={{ background: `${PW.ciano}12`, borderBottom: `1px solid ${PW.ciano}25` }}>
            {["#", "PROCESSO", "RESPONSÁVEL", "PRAZO (H)", "VENCE EM", "CONSUMIDO", "SITUAÇÃO"].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-black uppercase tracking-wider text-[9px]"
                style={{ color: PW.ciano }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((s, i) => {
            const cor = SEMAFORO_COR[s.semaforo] || PW.muted;
            return (
              <tr key={s.id} style={{ borderBottom: `1px solid ${PW.ciano}10` }}
                className={i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}>
                <td className="px-3 py-2 text-muted-foreground">{s.id}</td>
                <td className="px-3 py-2 font-medium">{s.tipoSla}</td>
                <td className="px-3 py-2">{s.membroNome}</td>
                <td className="px-3 py-2 text-right">{s.prazoHoras}h</td>
                <td className="px-3 py-2"
                  style={{ color: s.vencido ? PW.danger : "inherit" }}>
                  {formatarData(s.venceEm)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10">
                      <div className="h-full" style={{
                        width: `${Math.min(s.percentualConsumido, 100)}%`,
                        background: cor,
                      }} />
                    </div>
                    <span style={{ color: cor }}>{s.percentualConsumido}%</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 text-[9px] font-black"
                    style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}40` }}>
                    {s.semaforo.toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ABA 2 — Justificativas Pendentes
function AbaJustificativas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["justificativas-pendentes"],
    queryFn: async () => {
      const res = await apiFetch(`${API}/justificativas-pendentes`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const avaliarMutation = useMutation({
    mutationFn: async ({ id, aceita }: { id: number; aceita: "aceita" | "recusada" }) => {
      const res = await apiFetch(`${API}/justificativas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceita }),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: (_, { aceita }) => {
      queryClient.invalidateQueries({ queryKey: ["justificativas-pendentes"] });
      toast({ title: aceita === "aceita" ? "Justificativa aceita." : "Justificativa recusada." });
    },
  });

  const MOTIVO_LABEL: Record<string, string> = {
    SEM_CONTATO: "SEM CONTATO",
    PACIENTE_PEDIU_ADIAR: "PACIENTE PEDIU ADIAR",
    AGUARDANDO_RETORNO: "AGUARDANDO RETORNO",
    ERRO_ATRIBUICAO: "ERRO DE ATRIBUIÇÃO",
    SOBRECARGA: "SOBRECARGA",
    INSUMO_INDISPONIVEL: "INSUMO INDISPONÍVEL",
    PACIENTE_FALTOU: "PACIENTE FALTOU",
    OUTRO: "OUTRO",
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        CARREGANDO JUSTIFICATIVAS...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        NENHUMA JUSTIFICATIVA PENDENTE DE AVALIAÇÃO
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((j) => (
        <div key={j.id} className="p-3"
          style={{ border: `1px solid ${PW.warn}30`, borderLeft: `3px solid ${PW.warn}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] px-1.5 py-0.5 font-black"
                  style={{ background: `${PW.warn}20`, color: PW.warn, border: `1px solid ${PW.warn}40`, fontFamily: MONO }}>
                  {MOTIVO_LABEL[j.motivoPadrao] || j.motivoPadrao}
                </span>
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: MONO }}>
                  Card #{j.taskCardId} — {j.cardRole}
                </span>
              </div>
              <div className="text-[11px] font-bold text-foreground leading-tight mb-1">
                {j.cardTitulo}
              </div>
              <div className="text-[10px] text-foreground/70 leading-relaxed">
                {j.justificativa}
              </div>
              {j.proximaAcaoEm && (
                <div className="text-[9px] text-muted-foreground mt-1" style={{ fontFamily: MONO }}>
                  PRÓXIMA AÇÃO: {formatarData(j.proximaAcaoEm)}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => avaliarMutation.mutate({ id: j.id, aceita: "aceita" })}
                disabled={avaliarMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black"
                style={{
                  background: "#48BB7820", color: "#48BB78",
                  border: "1px solid #48BB7840", cursor: "pointer", fontFamily: MONO,
                }}>
                <CheckCircle2 className="w-3 h-3" /> ACEITAR
              </button>
              <button
                onClick={() => avaliarMutation.mutate({ id: j.id, aceita: "recusada" })}
                disabled={avaliarMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black"
                style={{
                  background: `${PW.danger}20`, color: PW.danger,
                  border: `1px solid ${PW.danger}40`, cursor: "pointer", fontFamily: MONO,
                }}>
                <XCircle className="w-3 h-3" /> RECUSAR
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ABA 3 — Escalonamentos
function AbaEscalonamentos() {
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "aberto" | "resolvido">("aberto");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = filtroStatus !== "todos" ? `?status=${filtroStatus}` : "";
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["escalamentos", filtroStatus],
    queryFn: async () => {
      const res = await apiFetch(`${API}/escalamentos${params}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const resolverMutation = useMutation({
    mutationFn: async ({ id, resolucao }: { id: number; resolucao: string }) => {
      const res = await apiFetch(`${API}/escalamentos/${id}/resolver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolucao }),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalamentos"] });
      toast({ title: "Escalamento marcado como resolvido." });
    },
  });

  const NIVEL_COR: Record<string, string> = {
    SUPERVISOR: PW.warn,
    DIRETOR: PW.danger,
    FILA_PRECEPTOR: "#9B2335",
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        CARREGANDO ESCALONAMENTOS...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtro de status */}
      <div className="flex gap-2">
        {(["aberto", "resolvido", "todos"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className="px-3 py-1.5 text-[10px] font-black uppercase"
            style={{
              background: filtroStatus === s ? `${PW.ciano}25` : "transparent",
              color: filtroStatus === s ? PW.ciano : PW.muted,
              border: `1px solid ${filtroStatus === s ? PW.ciano + "60" : PW.ciano + "20"}`,
              cursor: "pointer",
              fontFamily: MONO,
            }}>
            {s}
          </button>
        ))}
      </div>

      {data.length === 0 && (
        <div className="p-6 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
          NENHUM ESCALAMENTO {filtroStatus !== "todos" ? filtroStatus.toUpperCase() : ""}
        </div>
      )}

      {data.map((e) => {
        const cor = NIVEL_COR[e.nivel] || PW.danger;
        const resolvido = !!e.resolvidoEm;
        return (
          <div key={e.id} className="p-3"
            style={{ border: `1px solid ${cor}30`, borderLeft: `3px solid ${cor}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] px-1.5 py-0.5 font-black"
                    style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}40`, fontFamily: MONO }}>
                    {e.nivel}
                  </span>
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: MONO }}>
                    {e.entityType} #{e.entityId}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5"
                    style={{
                      background: resolvido ? "#48BB7815" : `${PW.warn}15`,
                      color: resolvido ? "#48BB78" : PW.warn,
                      fontFamily: MONO,
                    }}>
                    {resolvido ? "RESOLVIDO" : "ABERTO"}
                  </span>
                </div>
                <div className="text-[11px] font-bold mb-1">{e.motivo}</div>
                {e.observacao && (
                  <div className="text-[10px] text-foreground/70">{e.observacao}</div>
                )}
                <div className="text-[9px] text-muted-foreground mt-1" style={{ fontFamily: MONO }}>
                  ESCALADO EM: {formatarData(e.criadoEm)}
                  {e.resolvidoEm && ` · RESOLVIDO EM: ${formatarData(e.resolvidoEm)}`}
                </div>
                {e.resolucao && (
                  <div className="text-[10px] mt-1" style={{ color: "#48BB78" }}>
                    Resolução: {e.resolucao}
                  </div>
                )}
              </div>
              {!resolvido && (
                <button
                  onClick={() => resolverMutation.mutate({ id: e.id, resolucao: "Resolvido pelo gestor" })}
                  disabled={resolverMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black flex-shrink-0"
                  style={{
                    background: "#48BB7820", color: "#48BB78",
                    border: "1px solid #48BB7840", cursor: "pointer", fontFamily: MONO,
                  }}>
                  <CheckCircle2 className="w-3 h-3" /> RESOLVER
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ABA 4 — Disciplinar
function AbaDisciplinar({ unidadeId }: { unidadeId?: number }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ membroId: "", nivel: "advertencia", motivo: "", validadeDias: "90" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = unidadeId ? `?unidadeId=${unidadeId}` : "";
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["disciplinar", unidadeId],
    queryFn: async () => {
      const res = await apiFetch(`${API}/disciplinar${params}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const registrarMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiFetch(`${API}/disciplinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, unidadeId }),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinar"] });
      setMostrarForm(false);
      setForm({ membroId: "", nivel: "advertencia", motivo: "", validadeDias: "90" });
      toast({ title: "Evento disciplinar registrado." });
    },
  });

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: `1px solid ${PW.ciano}30`,
    color: "inherit",
    padding: "6px 10px",
    fontSize: 11,
    fontFamily: MONO,
    width: "100%",
    outline: "none",
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
        CARREGANDO EVENTOS DISCIPLINARES...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botão novo registro */}
      <div className="flex justify-end">
        <button
          onClick={() => setMostrarForm((p) => !p)}
          className="px-3 py-1.5 text-[10px] font-black"
          style={{
            background: `${PW.danger}20`, color: PW.danger,
            border: `1px solid ${PW.danger}40`, cursor: "pointer", fontFamily: MONO,
          }}>
          {mostrarForm ? "CANCELAR" : "+ REGISTRAR OCORRÊNCIA"}
        </button>
      </div>

      {/* Formulário inline */}
      {mostrarForm && (
        <div className="p-4 space-y-3"
          style={{ border: `1px solid ${PW.danger}30`, borderLeft: `3px solid ${PW.danger}` }}>
          <div className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: PW.danger, fontFamily: MONO }}>
            NOVO EVENTO DISCIPLINAR
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-black uppercase mb-1" style={{ color: PW.muted, fontFamily: MONO }}>
                ID DO COLABORADOR
              </div>
              <input style={inputStyle} type="number"
                value={form.membroId}
                onChange={(e) => setForm((p) => ({ ...p, membroId: e.target.value }))}
                placeholder="ex: 42" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase mb-1" style={{ color: PW.muted, fontFamily: MONO }}>
                NÍVEL
              </div>
              <select style={{ ...inputStyle }}
                value={form.nivel}
                onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))}>
                <option value="advertencia">ADVERTÊNCIA</option>
                <option value="demissao">DEMISSÃO</option>
                <option value="justa_causa">JUSTA CAUSA</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="text-[9px] font-black uppercase mb-1" style={{ color: PW.muted, fontFamily: MONO }}>
                MOTIVO COMPLETO
              </div>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                value={form.motivo}
                onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
                placeholder="Descreva o motivo da ocorrência com detalhes..." />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase mb-1" style={{ color: PW.muted, fontFamily: MONO }}>
                VALIDADE (DIAS)
              </div>
              <input style={inputStyle} type="number"
                value={form.validadeDias}
                onChange={(e) => setForm((p) => ({ ...p, validadeDias: e.target.value }))}
                placeholder="90" />
            </div>
          </div>
          <button
            onClick={() => registrarMutation.mutate({
              membroId: parseInt(form.membroId, 10),
              nivel: form.nivel,
              motivo: form.motivo,
              validadeDias: parseInt(form.validadeDias, 10),
            })}
            disabled={!form.membroId || !form.motivo || registrarMutation.isPending}
            className="px-4 py-2 text-[10px] font-black w-full"
            style={{
              background: `${PW.danger}30`, color: PW.danger,
              border: `1px solid ${PW.danger}60`, cursor: "pointer", fontFamily: MONO,
              opacity: !form.membroId || !form.motivo ? 0.5 : 1,
            }}>
            GRAVAR OCORRÊNCIA
          </button>
        </div>
      )}

      {/* Lista de eventos */}
      {data.length === 0 && (
        <div className="p-6 text-center text-[11px]" style={{ color: PW.muted, fontFamily: MONO }}>
          NENHUM EVENTO DISCIPLINAR REGISTRADO
        </div>
      )}

      {data.map((e) => {
        const cor = NIVEL_DISC_COR[e.nivel] || PW.danger;
        return (
          <div key={e.id} className="p-3"
            style={{ border: `1px solid ${cor}30`, borderLeft: `3px solid ${cor}` }}>
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black" style={{ color: cor }}>
                    {e.membroNome}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 font-black"
                    style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}40`, fontFamily: MONO }}>
                    {e.nivel.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5"
                    style={{
                      background: e.status === "ativa" ? `${PW.danger}15` : "#48BB7815",
                      color: e.status === "ativa" ? PW.danger : "#48BB78",
                      fontFamily: MONO,
                    }}>
                    {e.status?.toUpperCase() || "ATIVA"}
                  </span>
                </div>
                <div className="text-[10px] text-foreground/80 leading-relaxed">{e.motivo}</div>
                <div className="text-[9px] text-muted-foreground mt-1 flex gap-4" style={{ fontFamily: MONO }}>
                  <span>REGISTRADO: {formatarData(e.criadoEm)}</span>
                  {e.validadeDias && <span>VALIDADE: {e.validadeDias} DIAS</span>}
                  {e.dataExpiracao && <span>EXPIRA: {e.dataExpiracao}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Componente principal
export default function GovernancaEquipePage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("sla");
  const { unidadeSelecionada } = useClinic();

  return (
    <Layout>
      <div className="space-y-4 p-4">
        {/* Cabeçalho */}
        <div
          className="p-4"
          style={{ border: `1px solid ${PW.ciano}30`, borderLeft: `3px solid ${PW.ciano}` }}
        >
          <div className="text-sm font-black uppercase tracking-widest"
            style={{ color: PW.ciano, fontFamily: MONO }}>
            GOVERNANÇA DE PROCESSOS — PADTEAM
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            SLA (Service Level Agreement) · Justificativas · Escalonamentos · Disciplinar
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b" style={{ borderColor: `${PW.ciano}20` }}>
          {ABAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-wider"
              style={{
                color: abaAtiva === id ? PW.ciano : PW.muted,
                background: "none",
                border: "none",
                borderBottom: abaAtiva === id ? `2px solid ${PW.ciano}` : "2px solid transparent",
                cursor: "pointer",
                fontFamily: MONO,
                marginBottom: -1,
              }}>
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        <div>
          {abaAtiva === "sla" && <AbaSlaAtivo unidadeId={unidadeSelecionada ?? undefined} />}
          {abaAtiva === "justificativas" && <AbaJustificativas />}
          {abaAtiva === "escalamentos" && <AbaEscalonamentos />}
          {abaAtiva === "disciplinar" && <AbaDisciplinar unidadeId={unidadeSelecionada ?? undefined} />}
        </div>
      </div>
    </Layout>
  );
}
