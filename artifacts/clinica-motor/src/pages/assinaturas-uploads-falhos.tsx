// PAWARDS MEDCORE · Wave 10.5 task #49 · /assinaturas/uploads-falhos
// Lista eventos de webhook em que o upload do PDF assinado pro bucket falhou.
// Master-only; backend bloqueia via guardMaster (validador_mestre + estrito).
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { useClinic } from "@/contexts/ClinicContext";
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Clock,
  XCircle,
  CloudOff,
  ExternalLink,
  PlayCircle,
  RotateCcw,
  X,
  Flame,
  Send,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const AMBER = "#d97706";
const BLUE = "#2563eb";
const ZINC = "#71717a";
const GREEN = "#16a34a";

type EventoFalho = {
  id: number;
  provedor_codigo: string;
  envelope_id: string | null;
  event_type: string;
  solicitacao_id: number | null;
  tentativas_retry: number;
  ultima_tentativa_em: string | null;
  recebido_em: string;
  erro_processamento: string | null;
  resets_manuais_count: number | null;
  ultimo_reset_em: string | null;
  ultimo_reset_por: string | null;
  ultimo_reset_motivo: string | null;
  // Task #248 — cache do ultimo pedido manual de reentrega de webhook
  // (botao "Pedir reentrega ao ZapSign" so disponivel no grupo
  // aguardando_webhook). UI esconde/desabilita o botao por 5min apos o
  // ultimo pedido pra evitar spam contra a API ZapSign.
  ultima_reentrega_solicitada_em: string | null;
  ultima_reentrega_solicitada_por: string | null;
  ultima_reentrega_resultado: string | null;
  sol_id: number | null;
  sol_status: string | null;
  paciente_id: number | null;
  paciente_nome: string | null;
  unidade_id: number | null;
  unidade_nome: string | null;
  template_codigo: string | null;
  template_nome: string | null;
  status_retry: "em_retry" | "esgotado" | "fora_janela" | "aguardando_webhook";
  // Task #247 — tempo (em horas decimais) que o evento esta preso, calculado
  // pelo backend via `COALESCE(ultima_tentativa_em, recebido_em)` (mesma
  // formula do worker pdfRetryUpload).
  preso_ha_horas: number | null;
  // Task #247 — true quando o evento aguardando_webhook ja passou do limite
  // de AGUARDANDO_WEBHOOK_LIMITE_HORAS (= alerta CEO ja foi disparado).
  passou_limite_alerta?: boolean;
};

type Resposta = {
  gerado_em: string;
  filtro_unidade_id: number | null;
  // Task #247 — limite (em horas) usado pelo worker pra disparar alerta CEO.
  aguardando_webhook_limite_horas: number;
  total: number;
  contagem: {
    em_retry: number;
    esgotado: number;
    fora_janela: number;
    aguardando_webhook: number;
    teimosos: number;
  };
  grupos: {
    em_retry: EventoFalho[];
    esgotado: EventoFalho[];
    fora_janela: EventoFalho[];
    aguardando_webhook: EventoFalho[];
    teimosos: EventoFalho[];
  };
};

const RESETS_TEIMOSO_LIMITE = 3;

const STATUS_CFG: Record<
  EventoFalho["status_retry"],
  { label: string; descricao: string; bg: string; fg: string; icon: any }
> = {
  em_retry: {
    label: "Em retry",
    descricao: "Worker ainda vai retentar (tick 5min, max 5 tentativas).",
    bg: "#DBEAFE",
    fg: BLUE,
    icon: Clock,
  },
  esgotado: {
    label: "Esgotado",
    descricao: "5 tentativas falharam. Precisa baixar do ZapSign na unha.",
    bg: "#FEE2E2",
    fg: RED,
    icon: ShieldAlert,
  },
  fora_janela: {
    label: "Fora da janela",
    descricao: "Recebido ha mais de 7 dias. Worker nao varre mais.",
    bg: "#F4F4F5",
    fg: ZINC,
    icon: XCircle,
  },
  aguardando_webhook: {
    label: "Aguardando webhook",
    descricao: "Upload OK mas manifesto pendente. ZapSign vai reentregar.",
    bg: "#FEF9E7",
    fg: AMBER,
    icon: CloudOff,
  },
};

// Task #247 — formata tempo preso (em horas decimais) numa string compacta
// pro Caio bater o olho: "12 min", "3h", "2d 4h". Negativos/null caem em "—".
function formatarPresoHa(horas: number | null | undefined): string {
  if (horas == null || !Number.isFinite(horas) || horas < 0) return "—";
  if (horas < 1) {
    const min = Math.max(1, Math.round(horas * 60));
    return `${min} min`;
  }
  if (horas < 24) {
    return `${Math.floor(horas)}h`;
  }
  const dias = Math.floor(horas / 24);
  const restoH = Math.floor(horas - dias * 24);
  return restoH > 0 ? `${dias}d ${restoH}h` : `${dias}d`;
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: EventoFalho["status_retry"] }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

type ResetHistorico = {
  id: number;
  evento_id: number;
  resetado_em: string;
  operador: string;
  operador_id: number | null;
  motivo: string | null;
  tentativas_antes: number;
  operador_nome: string | null;
  operador_email: string | null;
};

type TimelineResposta = {
  gerado_em: string;
  evento_id: number;
  total: number;
  resets: ResetHistorico[];
};

export default function AssinaturasUploadsFalhos() {
  // Task #197 + Task #200 — filtro por unidade clinica (igual ao restante do
  // dashboard CEO). Mantemos `unidadesDisponiveis` + `setUnidadeSelecionada`
  // pra renderizar o seletor local no header, e usamos `isTodasClinicas` +
  // `nomeUnidadeSelecionada` pra montar a query string e o chip de filtro.
  const {
    unidadeSelecionada,
    setUnidadeSelecionada,
    unidadesDisponiveis,
    nomeUnidadeSelecionada,
    isTodasClinicas,
  } = useClinic();
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [retentando, setRetentando] = useState(false);
  const [resetandoId, setResetandoId] = useState<number | null>(null);
  // Task #248 — controla qual evento esta com pedido de reentrega em voo
  // (desabilita o botao + mostra spinner). Reentregas posteriores sao
  // bloqueadas server-side por 5min (anti-spam ZapSign).
  const [reentregandoId, setReentregandoId] = useState<number | null>(null);
  const [reentregaMsg, setReentregaMsg] = useState<{
    eventoId: number;
    ok: boolean;
    texto: string;
  } | null>(null);
  const [ultimoRetry, setUltimoRetry] = useState<{
    tentados: number;
    sucesso: number;
    falhou: number;
    bloqueados: number;
  } | null>(null);
  // task #196 — painel lateral com timeline completa de resets manuais
  const [timelineEventoId, setTimelineEventoId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineResposta | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineErro, setTimelineErro] = useState<string | null>(null);

  async function abrirTimeline(eventoId: number) {
    setTimelineEventoId(eventoId);
    setTimelineData(null);
    setTimelineErro(null);
    setTimelineLoading(true);
    try {
      const r = await apiFetch(
        `/api/assinaturas/uploads-falhos/${eventoId}/resets`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as TimelineResposta;
      setTimelineData(j);
    } catch (e) {
      setTimelineErro((e as Error).message);
    } finally {
      setTimelineLoading(false);
    }
  }

  function fecharTimeline() {
    setTimelineEventoId(null);
    setTimelineData(null);
    setTimelineErro(null);
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      // Task #197 + Task #200 — propaga filtro de unidade selecionada (mesmo
      // padrao do /timeline). Quando "Todas as Clinicas", omite a query
      // string e o backend devolve a rede inteira. Backend aceita tanto
      // `unidadeId` (camelCase, padrao novo) quanto `unidade_id` (legacy);
      // mandamos o canonico camelCase.
      const qs =
        unidadeSelecionada && !isTodasClinicas
          ? `?unidadeId=${unidadeSelecionada}`
          : "";
      const r = await apiFetch(`/api/assinaturas/uploads-falhos${qs}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Resposta;
      setData(j);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [unidadeSelecionada, isTodasClinicas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function resetarEvento(eventoId: number) {
    const motivoRaw = window.prompt(
      "Motivo do reset (opcional, max 500 chars). Deixe vazio pra pular:",
      "",
    );
    if (motivoRaw === null) return; // cancelou
    setResetandoId(eventoId);
    setErro(null);
    try {
      const r = await apiFetch(
        `/api/assinaturas/uploads-falhos/${eventoId}/resetar`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivoRaw.trim() || undefined }),
        },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      if (j.stats) setUltimoRetry(j.stats);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setResetandoId(null);
    }
  }

  // Task #248 — pede ao ZapSign pra reentregar o webhook do envelope.
  // Endpoint server-side bloqueia spam (< 5min) e atualiza o cache no
  // proprio evento, entao basta recarregar pra refletir o novo estado.
  async function reentregarWebhook(eventoId: number) {
    setReentregandoId(eventoId);
    setReentregaMsg(null);
    setErro(null);
    try {
      const r = await apiFetch(
        `/api/assinaturas/uploads-falhos/${eventoId}/reentregar-webhook`,
        { method: "POST", credentials: "include" },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = j.error || `HTTP ${r.status}`;
        setReentregaMsg({ eventoId, ok: false, texto: msg });
      } else {
        const detalhe = j.detalhe || (j.mock ? "mock" : "ok");
        const canc = j.notificacoes_ceo_canceladas ?? 0;
        setReentregaMsg({
          eventoId,
          ok: true,
          texto: `Reentrega pedida ao ZapSign. ${detalhe}${
            canc > 0 ? ` · ${canc} alerta(s) CEO marcado(s) como tratado(s).` : ""
          }`,
        });
      }
      await carregar();
    } catch (e) {
      setReentregaMsg({ eventoId, ok: false, texto: (e as Error).message });
    } finally {
      setReentregandoId(null);
    }
  }

  async function retentarAgora() {
    setRetentando(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/assinaturas/uploads-falhos/retentar", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setUltimoRetry(j.stats || null);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setRetentando(false);
    }
  }

  const contagem = data?.contagem || {
    em_retry: 0,
    esgotado: 0,
    fora_janela: 0,
    aguardando_webhook: 0,
    teimosos: 0,
  };
  const todasLinhas: EventoFalho[] = data
    ? [
        ...data.grupos.esgotado,
        ...data.grupos.em_retry,
        ...data.grupos.aguardando_webhook,
        ...data.grupos.fora_janela,
      ]
    : [];
  // Task #200 — quando ha teimosos, lista comeca com eles em destaque
  // (sao prioridade clinica/juridica). Dedup pelo id.
  const teimosos = data?.grupos.teimosos ?? [];
  const idsTeimosos = new Set(teimosos.map((t) => t.id));
  const linhasOrdenadas: EventoFalho[] = data
    ? [
        ...teimosos,
        ...todasLinhas.filter((r) => !idsTeimosos.has(r.id)),
      ]
    : [];

  return (
    <Layout>
      <div
        data-pdf-titulo="Falhas de Upload de PDF Assinado"
        className="p-6 space-y-6"
      >
        {/* Header */}
        <div
          className="rounded-lg p-5 flex items-start justify-between"
          style={{ background: NAVY, color: "#F9FAFB" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={20} style={{ color: GOLD }} />
              <h1 className="text-xl font-bold tracking-tight">
                Uploads de PDF assinado — falhas
              </h1>
            </div>
            <p className="text-sm opacity-80">
              Wave 10.5 · eventos do webhook ZapSign em que o upload pro cofre
              falhou. Worker `pdfRetryUpload` retenta com backoff (1m / 5m /
              15m / 1h / 6h, max 5x, janela 7d).
            </p>
            {/* Task #200 — chip mostrando filtro de unidade ativo */}
            {unidadeSelecionada && !isTodasClinicas && (
              <div
                className="text-xs mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded"
                style={{ background: GOLD, color: NAVY, fontWeight: 600 }}
                title="Filtro de unidade clinica ativo (mude no seletor do topo)"
              >
                Filtrado por: {nomeUnidadeSelecionada || `unidade #${unidadeSelecionada}`}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 nao-imprimir items-end">
            {unidadesDisponiveis.length > 1 && (
              <select
                value={unidadeSelecionada ?? ""}
                onChange={(e) =>
                  setUnidadeSelecionada(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="px-3 py-1.5 rounded text-sm font-semibold border bg-white"
                style={{ color: NAVY, borderColor: GOLD, minWidth: 200 }}
                title="Filtra os eventos pela unidade clinica do paciente vinculado"
                disabled={loading || retentando}
              >
                <option value="">Todas as clinicas</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.unidadeId} value={u.unidadeId}>
                    {u.unidadeNome}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={carregar}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
              style={{ background: GOLD, color: NAVY }}
              disabled={loading || retentando}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <button
              onClick={retentarAgora}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
              style={{
                background: retentando ? ZINC : "#F9FAFB",
                color: NAVY,
                borderColor: GOLD,
              }}
              disabled={loading || retentando}
              title="Dispara um ciclo manual do worker (sem esperar tick de 5min)"
            >
              <PlayCircle size={14} className={retentando ? "animate-pulse" : ""} />
              Retentar agora
            </button>
          </div>
        </div>

        {/* Resumo grupos */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Task #200 — KPI agregado "Uploads teimosos" (resets >= 3). Eh
              transversal aos demais status, por isso vem primeiro e tem
              destaque visual (borda vermelha + icone Flame). */}
          <div
            className="bg-white border-2 rounded p-4"
            style={{ borderColor: contagem.teimosos > 0 ? RED : "#E5E7EB" }}
            data-testid="kpi-uploads-teimosos"
            title={`Uploads que ja foram resetados manualmente ${RESETS_TEIMOSO_LIMITE}+ vezes e voltaram a falhar. Cada um disparou alerta CEO via worker.`}
          >
            <div className="flex items-center justify-between mb-1">
              <div
                className="text-xs uppercase tracking-wide font-semibold"
                style={{ color: contagem.teimosos > 0 ? RED : ZINC }}
              >
                Teimosos ({RESETS_TEIMOSO_LIMITE}+ resets)
              </div>
              <Flame
                size={14}
                style={{ color: contagem.teimosos > 0 ? RED : ZINC }}
              />
            </div>
            <div className="text-2xl font-bold" style={{ color: NAVY }}>
              {contagem.teimosos}
            </div>
            <div className="text-xs mt-1" style={{ color: ZINC }}>
              Reset manual nao resolve. Baixe do ZapSign na unha.
            </div>
          </div>
          {(
            ["em_retry", "esgotado", "aguardando_webhook", "fora_janela"] as const
          ).map((k) => {
            const cfg = STATUS_CFG[k];
            return (
              <div key={k} className="bg-white border rounded p-4">
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="text-xs uppercase tracking-wide font-semibold"
                    style={{ color: cfg.fg }}
                  >
                    {cfg.label}
                  </div>
                  <cfg.icon size={14} style={{ color: cfg.fg }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: NAVY }}>
                  {contagem[k]}
                </div>
                <div className="text-xs mt-1" style={{ color: ZINC }}>
                  {cfg.descricao}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resultado retry manual */}
        {ultimoRetry && (
          <div
            className="rounded p-3 text-sm flex items-center gap-3"
            style={{ background: "#ECFDF5", color: GREEN }}
          >
            <RefreshCw size={16} />
            <span>
              <strong>Ultimo retry manual:</strong> tentados {ultimoRetry.tentados} ·
              sucesso {ultimoRetry.sucesso} · falhou {ultimoRetry.falhou} ·
              bloqueados {ultimoRetry.bloqueados}
            </span>
          </div>
        )}

        {/* Erros */}
        {erro && (
          <div
            className="rounded p-3 text-sm"
            style={{ background: "#FEE2E2", color: RED }}
          >
            <strong>Erro:</strong> {erro}. Verifique se sua sessao eh{" "}
            <code>validador_mestre</code> + master estrito.
          </div>
        )}

        {/* Vazio */}
        {!erro && !loading && data && data.total === 0 && (
          <div
            className="rounded p-6 text-center text-sm"
            style={{ background: "#ECFDF5", color: GREEN }}
          >
            <strong>Nenhuma falha de upload.</strong> Todos os PDFs assinados
            estao no cofre.
          </div>
        )}

        {/* Tabela */}
        {linhasOrdenadas.length > 0 && (
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#F9FAFB", color: NAVY }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">#</th>
                  <th className="text-left px-3 py-2 font-semibold">Recebido</th>
                  <th className="text-left px-3 py-2 font-semibold">Paciente</th>
                  <th className="text-left px-3 py-2 font-semibold">Clinica</th>
                  <th className="text-left px-3 py-2 font-semibold">Template</th>
                  <th className="text-left px-3 py-2 font-semibold">Envelope</th>
                  <th className="text-center px-3 py-2 font-semibold">Tentativas</th>
                  <th className="text-left px-3 py-2 font-semibold">Ultima tentativa</th>
                  <th
                    className="text-center px-3 py-2 font-semibold"
                    title={`Tempo decorrido desde a ultima tentativa (ou recebido_em quando nunca tentou). Eventos do grupo "Aguardando webhook" passando de ${data?.aguardando_webhook_limite_horas ?? 24}h ja dispararam alerta CEO.`}
                  >
                    Preso ha
                  </th>
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                  <th
                    className="text-center px-3 py-2 font-semibold"
                    title="Quantas vezes este evento ja foi resetado manualmente. Valores >= 2 indicam que o reset nao resolve sozinho — precisa baixar do ZapSign na unha. Clique no Nx pra abrir a timeline completa."
                  >
                    Resets
                  </th>
                  <th
                    className="text-left px-3 py-2 font-semibold"
                    title="Data + operador do ultimo reset manual (cache em assinatura_webhook_eventos.ultimo_reset_*). Clique no Nx pra ver a timeline completa de todos os resets."
                  >
                    Ultimo reset
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">Ultimo erro</th>
                  <th className="text-center px-3 py-2 font-semibold nao-imprimir">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((r) => {
                  const eTeimoso = (r.resets_manuais_count ?? 0) >= RESETS_TEIMOSO_LIMITE;
                  return (
                  <tr
                    key={r.id}
                    className="border-t hover:bg-zinc-50 align-top"
                    style={eTeimoso ? { background: "#FEF2F2" } : undefined}
                    data-testid={eTeimoso ? `linha-teimoso-${r.id}` : undefined}
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {eTeimoso && (
                        <Flame
                          size={10}
                          style={{ color: RED, display: "inline", marginRight: 4 }}
                        />
                      )}
                      {r.id}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: ZINC }}>
                      {formatarData(r.recebido_em)}
                    </td>
                    <td className="px-3 py-2">
                      {r.paciente_nome ? (
                        <span>{r.paciente_nome}</span>
                      ) : (
                        <span className="italic text-zinc-400">— sem vinculo —</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.unidade_nome ? (
                        <span style={{ color: NAVY }}>
                          {r.unidade_nome.replace(/^INSTITUTO\s+/i, "")}
                        </span>
                      ) : (
                        <span className="italic text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.template_codigo ? (
                        <>
                          <div className="font-semibold" style={{ color: NAVY }}>
                            {r.template_codigo}
                          </div>
                          <div className="text-xs" style={{ color: ZINC }}>
                            {r.template_nome}
                          </div>
                        </>
                      ) : (
                        <span className="italic text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs break-all max-w-[180px]">
                      <div>{r.envelope_id || "—"}</div>
                      <div style={{ color: ZINC }}>{r.provedor_codigo}</div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-xs">
                      <span
                        style={{
                          color: r.tentativas_retry >= 5 ? RED : NAVY,
                          fontWeight: 700,
                        }}
                      >
                        {r.tentativas_retry}
                      </span>
                      <span style={{ color: ZINC }}> / 5</span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: ZINC }}>
                      {formatarData(r.ultima_tentativa_em)}
                    </td>
                    {/* Task #247 — coluna "Preso ha" com tempo desde a
                        ultima tentativa (ou recebido_em). No grupo
                        aguardando_webhook, eventos que ja passaram do limite
                        ganham fundo vermelho + icone de chama indicando que o
                        alerta CEO ja foi disparado pelo worker. */}
                    <td className="px-3 py-2 text-center text-xs">
                      {(() => {
                        const horas = r.preso_ha_horas;
                        const passouLimite = r.passou_limite_alerta === true;
                        const limite = data?.aguardando_webhook_limite_horas ?? 24;
                        const eAguardando = r.status_retry === "aguardando_webhook";
                        const cor = passouLimite
                          ? RED
                          : eAguardando && horas != null && horas >= limite / 2
                            ? AMBER
                            : ZINC;
                        const label = formatarPresoHa(horas);
                        if (passouLimite) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold"
                              style={{ background: "#FEE2E2", color: RED }}
                              title={`Preso ha ${label} — ja passou do limite de ${limite}h. Alerta CEO ja foi disparado pelo worker (email/WhatsApp).`}
                              data-testid={`badge-passou-limite-${r.id}`}
                            >
                              <Flame size={10} />
                              {label}
                            </span>
                          );
                        }
                        return (
                          <span
                            className="font-mono"
                            style={{ color: cor, fontWeight: eAguardando ? 600 : 400 }}
                            title={
                              eAguardando
                                ? `Preso ha ${label}. Limite pra alerta CEO: ${limite}h.`
                                : `Tempo desde a ultima tentativa: ${label}.`
                            }
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={r.status_retry} />
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-xs">
                      {(() => {
                        const n = r.resets_manuais_count ?? 0;
                        const cor = n >= 2 ? RED : n >= 1 ? AMBER : ZINC;
                        const tip =
                          n === 0
                            ? "Nunca foi resetado manualmente"
                            : `Resetado ${n}x manualmente${
                                r.ultimo_reset_em
                                  ? ` · ultimo em ${formatarData(
                                      r.ultimo_reset_em,
                                    )}`
                                  : ""
                              }${
                                r.ultimo_reset_por
                                  ? ` por ${r.ultimo_reset_por}`
                                  : ""
                              }${
                                r.ultimo_reset_motivo
                                  ? ` — "${r.ultimo_reset_motivo}"`
                                  : ""
                              } — clique pra ver timeline completa`;
                        if (n === 0) {
                          return (
                            <span style={{ color: cor }} title={tip}>
                              0x
                            </span>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => abrirTimeline(r.id)}
                            className="underline decoration-dotted underline-offset-2 hover:no-underline nao-imprimir"
                            style={{
                              color: cor,
                              fontWeight: n >= 2 ? 700 : 500,
                              background: "transparent",
                              border: 0,
                              cursor: "pointer",
                              padding: 0,
                              fontFamily: "inherit",
                              fontSize: "inherit",
                            }}
                            title={tip}
                          >
                            {n}x
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.ultimo_reset_em ? (
                        <div>
                          <div style={{ color: NAVY, fontWeight: 500 }}>
                            {formatarData(r.ultimo_reset_em)}
                          </div>
                          <div style={{ color: ZINC }} className="break-all">
                            por {r.ultimo_reset_por || "(desconhecido)"}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-zinc-400">— nunca —</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[280px]">
                      <div
                        className="break-words"
                        style={{ color: r.status_retry === "esgotado" ? RED : ZINC }}
                        title={r.erro_processamento || ""}
                      >
                        {r.erro_processamento || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center nao-imprimir">
                      <div className="flex flex-col items-center gap-1">
                        {r.sol_id ? (
                          <Link
                            href={`/assinaturas/${r.sol_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold"
                            style={{ color: BLUE }}
                          >
                            Abrir <ExternalLink size={10} />
                          </Link>
                        ) : (
                          <span className="text-xs italic text-zinc-400">
                            sem solicitacao
                          </span>
                        )}
                        {/* Task #248 — botao de reentrega manual ZapSign no
                            grupo aguardando_webhook. Server bloqueia por
                            5min apos cada pedido (anti-spam). */}
                        {r.status_retry === "aguardando_webhook" && (() => {
                          const ultimaIso = r.ultima_reentrega_solicitada_em;
                          const desdeMs = ultimaIso
                            ? Date.now() - new Date(ultimaIso).getTime()
                            : null;
                          const bloqueado =
                            desdeMs != null && desdeMs >= 0 && desdeMs < 5 * 60 * 1000;
                          const restanteSeg = bloqueado
                            ? Math.ceil((5 * 60 * 1000 - (desdeMs ?? 0)) / 1000)
                            : 0;
                          const tip = bloqueado
                            ? `Reentrega ja foi pedida ha ${Math.round(
                                (desdeMs ?? 0) / 1000,
                              )}s${
                                r.ultima_reentrega_solicitada_por
                                  ? ` por ${r.ultima_reentrega_solicitada_por}`
                                  : ""
                              }. Aguarde ${restanteSeg}s. ZapSign reenvia em segundos.${
                                r.ultima_reentrega_resultado
                                  ? `\n${r.ultima_reentrega_resultado}`
                                  : ""
                              }`
                            : `Pede ao ZapSign pra reentregar o webhook deste envelope (POST resend-webhooks). Use quando o evento estiver preso aguardando manifesto.${
                                r.ultima_reentrega_resultado
                                  ? `\nUltimo resultado: ${r.ultima_reentrega_resultado}`
                                  : ""
                              }`;
                          return (
                            <button
                              onClick={() => reentregarWebhook(r.id)}
                              disabled={
                                reentregandoId === r.id ||
                                bloqueado ||
                                retentando
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition disabled:opacity-50"
                              style={{
                                background: "#FEF9E7",
                                color: NAVY,
                                borderColor: GOLD,
                              }}
                              title={tip}
                              data-testid={`btn-reentregar-webhook-${r.id}`}
                            >
                              <Send
                                size={10}
                                className={
                                  reentregandoId === r.id ? "animate-pulse" : ""
                                }
                              />
                              {reentregandoId === r.id
                                ? "Pedindo..."
                                : bloqueado
                                  ? `Aguarde ${restanteSeg}s`
                                  : "Pedir reentrega ao ZapSign"}
                            </button>
                          );
                        })()}
                        {/* Task #248 — feedback inline (sucesso ou erro) do
                            ultimo pedido de reentrega pra esta linha. */}
                        {reentregaMsg?.eventoId === r.id && (
                          <div
                            className="text-[10px] mt-1 text-left max-w-[200px] break-words"
                            style={{
                              color: reentregaMsg.ok ? GREEN : RED,
                            }}
                          >
                            {reentregaMsg.texto}
                          </div>
                        )}
                        {(r.status_retry === "esgotado" ||
                          r.status_retry === "fora_janela") && (
                          <button
                            onClick={() => resetarEvento(r.id)}
                            disabled={resetandoId === r.id || retentando}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition disabled:opacity-50"
                            style={{
                              background: "#FEF9E7",
                              color: NAVY,
                              borderColor: GOLD,
                            }}
                            title="Zera tentativas e re-elege o evento pro worker. Use depois de corrigir a causa raiz (rede, bucket, credencial)."
                          >
                            <RotateCcw
                              size={10}
                              className={
                                resetandoId === r.id ? "animate-spin" : ""
                              }
                            />
                            {resetandoId === r.id
                              ? "Resetando..."
                              : "Tentar enviar de novo"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodape com observacao operacional */}
        <div
          className="rounded p-3 text-xs flex items-start gap-2"
          style={{ background: "#F9FAFB", color: ZINC }}
        >
          <AlertTriangle size={14} style={{ color: AMBER }} className="mt-0.5" />
          <div>
            <strong>O que fazer com cada caso:</strong> "Em retry" — esperar o
            worker. "Esgotado" / "Fora da janela" — baixar PDF do painel ZapSign
            manualmente e anexar pelo modulo de assinaturas. "Aguardando webhook"
            — upload ja foi feito, ZapSign vai reentregar e o manifesto fecha
            sozinho.
          </div>
        </div>

        {data && (
          <div className="text-xs text-right" style={{ color: ZINC }}>
            Atualizado em {new Date(data.gerado_em).toLocaleTimeString("pt-BR")} ·{" "}
            {data.total} eventos com falha
          </div>
        )}
      </div>

      {/* task #196 — Painel lateral com timeline completa de resets */}
      {timelineEventoId !== null && (
        <div
          className="fixed inset-0 z-50 flex justify-end nao-imprimir"
          style={{ background: "rgba(2,4,6,0.45)" }}
          onClick={fecharTimeline}
        >
          <div
            className="w-full max-w-md h-full bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-4 flex items-start justify-between"
              style={{ background: NAVY, color: "#F9FAFB" }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={16} style={{ color: GOLD }} />
                  <h2 className="text-base font-bold">
                    Timeline de resets manuais
                  </h2>
                </div>
                <div className="text-xs opacity-80">
                  Evento #{timelineEventoId} ·{" "}
                  {timelineData ? `${timelineData.total} reset(s)` : "carregando..."}
                </div>
              </div>
              <button
                onClick={fecharTimeline}
                className="p-1 rounded hover:bg-white/10"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {timelineLoading && (
                <div className="text-sm text-center py-6" style={{ color: ZINC }}>
                  <RefreshCw
                    size={16}
                    className="animate-spin inline-block mr-2"
                  />
                  Carregando historico...
                </div>
              )}

              {timelineErro && (
                <div
                  className="rounded p-3 text-sm"
                  style={{ background: "#FEE2E2", color: RED }}
                >
                  <strong>Erro:</strong> {timelineErro}
                </div>
              )}

              {!timelineLoading &&
                !timelineErro &&
                timelineData &&
                timelineData.total === 0 && (
                  <div
                    className="rounded p-4 text-sm text-center"
                    style={{ background: "#F9FAFB", color: ZINC }}
                  >
                    Nenhum reset registrado neste evento ainda. (Resets feitos
                    antes da migration 053 ficam apenas no cache "Ultimo reset"
                    da tabela.)
                  </div>
                )}

              {!timelineLoading &&
                !timelineErro &&
                timelineData &&
                timelineData.resets.map((reset, idx) => {
                  const operadorDisplay =
                    reset.operador_nome ||
                    reset.operador_email ||
                    reset.operador ||
                    "(desconhecido)";
                  const ehMaisRecente = idx === 0;
                  return (
                    <div
                      key={reset.id}
                      className="border rounded p-3"
                      style={{
                        borderColor: ehMaisRecente ? GOLD : "#E4E4E7",
                        background: ehMaisRecente ? "#FEF9E7" : "#FFFFFF",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: ehMaisRecente ? NAVY : ZINC }}
                        >
                          {ehMaisRecente ? "MAIS RECENTE" : `Reset #${reset.id}`}
                        </div>
                        <div className="text-xs font-mono" style={{ color: ZINC }}>
                          {formatarData(reset.resetado_em)}
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: NAVY }}>
                        <strong>Operador:</strong> {operadorDisplay}
                        {reset.operador_email &&
                          reset.operador_email !== operadorDisplay && (
                            <span
                              className="ml-1 text-xs"
                              style={{ color: ZINC }}
                            >
                              ({reset.operador_email})
                            </span>
                          )}
                      </div>
                      <div className="text-xs mt-1" style={{ color: ZINC }}>
                        Tentativas antes do reset: {reset.tentativas_antes} / 5
                      </div>
                      {reset.motivo && (
                        <div
                          className="mt-2 text-xs italic px-2 py-1 rounded"
                          style={{ background: "#F4F4F5", color: NAVY }}
                        >
                          "{reset.motivo}"
                        </div>
                      )}
                      {!reset.motivo && (
                        <div
                          className="mt-2 text-xs italic"
                          style={{ color: ZINC }}
                        >
                          (sem motivo registrado)
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
