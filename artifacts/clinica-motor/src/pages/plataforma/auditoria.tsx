import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import { Scale, RefreshCw, ShieldAlert, Mail, MessageCircle, Send, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";

type DetalheEnvioWhatsapp = {
  destinatario: string;
  sucesso: boolean;
  viaHsm: boolean;
  viaTextoLivre: boolean;
  erro: string | null;
  // Task #204 — id da mensagem no provedor (Twilio SID / Gupshup messageId).
  provedorMsgId?: string | null;
  // Task #204 — status real de entrega vindo do webhook do provedor
  // (ENVIADO -> ENTREGUE -> LIDO ou FALHOU). Quando ausente, o webhook
  // ainda nao chegou (ou o envio falhou antes de receber id).
  statusEntrega?: "PENDENTE" | "ENVIADO" | "ENTREGUE" | "LIDO" | "FALHOU" | null;
  entregueEm?: string | null;
  lidoEm?: string | null;
  // Task #205 — snapshot da janela de 24h: true se o destinatario tinha
  // mandado mensagem pra clinica nas ultimas 24h ANTES do envio. Quando
  // todos os texto-livre estao dentro da janela, suprimimos o alerta
  // amarelo (entrega ja eh garantida pelo provedor).
  dentroJanela24h?: boolean;
};

// Task #148 — analogo a DetalheEnvioWhatsapp, mas pro canal EMAIL. So
// existe em registros gravados a partir desta task; registros antigos
// caem no fallback (lista de destinatarios sem icone individual).
type DetalheEnvioEmail = {
  destinatario: string;
  sucesso: boolean;
  erro: string | null;
};

type RegistroAviso = {
  tipo: "SUSPENSAO" | "REATIVACAO" | "REENVIO_SUSPENSAO" | "REENVIO_REATIVACAO";
  // Default "EMAIL" pra registros gravados antes da Task #176, que so
  // persistiam email; whatsapp era best-effort sem registrar canal.
  canal?: "EMAIL" | "WHATSAPP";
  destinatarios: string[];
  enviados: number;
  falhas: number;
  erro: string | null;
  em: string;
  executado_por_usuario_id: number;
  via_hsm?: number;
  via_texto_livre?: number;
  detalhes_whatsapp?: DetalheEnvioWhatsapp[];
  detalhes_email?: DetalheEnvioEmail[];
  apenas_falhas?: boolean;
};

type Evento = {
  id: number;
  acao: string;
  unidade_id: number;
  executado_por_usuario_id: number;
  motivo: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> & { avisos?: RegistroAviso[] };
  criado_em: string;
  unidade_nome: string | null;
  executor_nome: string | null;
  executor_email: string | null;
};

const ACAO_COR: Record<string, string> = {
  SUSPENDER: "bg-red-500/20 text-red-300 border-red-500/40",
  REASSUMIR: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  PROMOVER_ADMIN: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  REBAIXAR_ADMIN: "bg-zinc-600/40 text-zinc-200 border-zinc-500",
  EXPORTAR_LGPD: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  EXCLUIR_AGENDAR: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  EXCLUIR_EXECUTAR: "bg-red-700/40 text-red-200 border-red-700",
  EXCLUIR_CANCELAR: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  FORCAR_LOGOUT: "bg-orange-500/20 text-orange-300 border-orange-500/40",
};

function metadataSemAvisos(metadata: Record<string, unknown>): Record<string, unknown> {
  const { avisos: _avisos, ...resto } = metadata;
  return resto;
}

export default function PlataformaAuditoria() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroAcao, setFiltroAcao] = useState<string>("");
  const [filtroClinica, setFiltroClinica] = useState<string>("");
  const [filtroExecutor, setFiltroExecutor] = useState<string>("");
  // Task #254 — filtro de intervalo de datas (formato yyyy-mm-dd vindo do
  // <input type="date">). Comparamos contra o dia local do criado_em pra
  // bater com o que o usuario ve na coluna "Quando". Vazio = sem filtro.
  const [filtroDataDe, setFiltroDataDe] = useState<string>("");
  const [filtroDataAte, setFiltroDataAte] = useState<string>("");
  const [expandidoEventoId, setExpandidoEventoId] = useState<number | null>(null);
  const [reenviandoEventoId, setReenviandoEventoId] = useState<number | null>(null);
  const [reenviandoApenasFalhas, setReenviandoApenasFalhas] = useState(false);
  // Task #266 — controla qual canal esta no meio do reenvio pra desabilitar
  // o botao certo (email vs whatsapp) durante o request.
  const [reenviandoCanal, setReenviandoCanal] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await runWithStepUp(() =>
      apiFetch("/api/plataforma/auditoria?limite=500", { credentials: "include" }),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    setEventos(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function reenviarAvisos(
    eventoId: number,
    apenasFalhas: boolean,
    canal: "EMAIL" | "WHATSAPP" = "EMAIL",
  ) {
    // Task #266 — texto do confirm muda por canal pro CEO entender o que
    // vai sair (email vs whatsapp). Mantem o aviso de auditoria igual.
    const canalLabel = canal === "WHATSAPP" ? "mensagens de WhatsApp" : "emails";
    const msg = apenasFalhas
      ? `Reenviar ${canalLabel} de aviso APENAS pros destinatarios que falharam na ultima tentativa?\n` +
        "O resultado ficara registrado no historico (auditoria_kill_switch)."
      : `Reenviar ${canalLabel} de aviso pra todos os destinatarios deste evento?\n` +
        "O resultado ficara registrado no historico (auditoria_kill_switch).";
    if (!window.confirm(msg)) return;
    setReenviandoEventoId(eventoId);
    setReenviandoApenasFalhas(apenasFalhas);
    setReenviandoCanal(canal);
    const r = await runWithStepUp(() =>
      apiFetch(
        `/api/plataforma/auditoria/${eventoId}/reenviar-avisos`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apenasFalhas, canal }),
        },
      ),
    );
    setReenviandoEventoId(null);
    setReenviandoApenasFalhas(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json();
    const bloco = canal === "WHATSAPP" ? j.whatsapp : j.email;
    alert(
      `Reenvio concluido (${canal})${apenasFalhas ? " (apenas falhas)" : ""}.\n\n` +
      `Destinatarios: ${bloco?.destinatarios?.length ?? 0}\n` +
      `Enviados: ${bloco?.enviados ?? 0}\n` +
      `Falhas: ${bloco?.falhas ?? 0}` +
      (j.erro ? `\n\nErro geral: ${j.erro}` : ""),
    );
    await carregar();
  }

  const acoes = Array.from(new Set(eventos.map(e => e.acao))).sort();
  // Task #275 — filtros de clinica e executor agora armazenam o ID estavel
  // (string), nao o rotulo. Evita ambiguidade quando duas clinicas/executores
  // tem o mesmo nome (caso real: filiais homonimas, usuarios com nome igual)
  // — antes a UI agrupava todos sob o mesmo rotulo, mas o CSV exportava so
  // os de UM dos IDs. As opcoes do <select> exibem "nome (id)" pra deixar
  // visivel quando ha colisao de nome.
  const clinicasOpcoes = (() => {
    const map = new Map<string, string>();
    for (const e of eventos) {
      if (e.unidade_id == null) continue;
      const id = String(e.unidade_id);
      if (!map.has(id)) {
        map.set(id, e.unidade_nome ?? `id ${e.unidade_id}`);
      }
    }
    return Array.from(map, ([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();
  const executoresOpcoes = (() => {
    const map = new Map<string, string>();
    for (const e of eventos) {
      if (e.executado_por_usuario_id == null) continue;
      const id = String(e.executado_por_usuario_id);
      if (!map.has(id)) {
        map.set(id, e.executor_nome ?? `usuario ${e.executado_por_usuario_id}`);
      }
    }
    return Array.from(map, ([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();
  const visiveis = eventos.filter(e => {
    if (filtroAcao && e.acao !== filtroAcao) return false;
    if (filtroClinica) {
      if (e.unidade_id == null || String(e.unidade_id) !== filtroClinica) return false;
    }
    if (filtroExecutor) {
      if (
        e.executado_por_usuario_id == null
        || String(e.executado_por_usuario_id) !== filtroExecutor
      ) {
        return false;
      }
    }
    // Task #254 — janela [de 00:00, ate 23:59:59.999] interpretada no fuso
    // local do navegador, batendo com a coluna "Quando" (toLocaleString).
    if (filtroDataDe || filtroDataAte) {
      const quando = new Date(e.criado_em).getTime();
      if (filtroDataDe) {
        const de = new Date(`${filtroDataDe}T00:00:00`).getTime();
        if (Number.isFinite(de) && quando < de) return false;
      }
      if (filtroDataAte) {
        const ate = new Date(`${filtroDataAte}T23:59:59.999`).getTime();
        if (Number.isFinite(ate) && quando > ate) return false;
      }
    }
    return true;
  });

  // Task #275 — agora delega pro endpoint server-side
  // GET /api/plataforma/auditoria.csv. Repassa limite + intervalo de datas
  // (mesmos filtros suportados pela rota). Os filtros client-side de acao,
  // clinica e executor continuam afetando so o que aparece na tela; o CSV
  // traz todos os eventos da janela pra fechar o ciclo de evidencia LGPD.
  async function exportarCsv() {
    const params = new URLSearchParams();
    params.set("limite", "500");
    if (filtroDataDe) params.set("dataDe", filtroDataDe);
    if (filtroDataAte) params.set("dataAte", filtroDataAte);
    if (filtroAcao) params.set("acao", filtroAcao);
    // filtroClinica e filtroExecutor agora ja sao IDs estaveis (string)
    // — selecionados diretamente no <select>. Manda 1:1 pro server, sem
    // intermediar por rotulo (que poderia colidir entre registros).
    if (filtroClinica) params.set("unidadeId", filtroClinica);
    if (filtroExecutor) params.set("executorId", filtroExecutor);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/auditoria.csv?${params.toString()}`, {
        credentials: "include",
      }),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Falha ao exportar CSV: ${j.error ?? r.statusText}`);
      return;
    }
    const blob = await r.blob();
    // Tenta extrair o filename do Content-Disposition; cai num default
    // local se o header nao vier (proxy/intermediario filtrou, etc).
    const cd = r.headers.get("Content-Disposition") ?? "";
    const m = /filename="?([^";]+)"?/i.exec(cd);
    const agora = new Date();
    const yyyy = agora.getFullYear();
    const mm = String(agora.getMonth() + 1).padStart(2, "0");
    const dd = String(agora.getDate()).padStart(2, "0");
    const nome = m?.[1] ?? `auditoria-${yyyy}-${mm}-${dd}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <Scale size={28} /> Plataforma · Auditoria Kill-Switch
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Timeline cronologica de toda acao destrutiva do <code>platform_owner</code>.
              Imutavel — defesa juridica LGPD/CFM (Wave 13 Migration 044).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select
              value={filtroAcao}
              onChange={e => setFiltroAcao(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Todas as acoes</option>
              {acoes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={filtroClinica}
              onChange={e => setFiltroClinica(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Todas as clinicas</option>
              {clinicasOpcoes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} (id {c.id})
                </option>
              ))}
            </select>
            <select
              value={filtroExecutor}
              onChange={e => setFiltroExecutor(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Todos os executores</option>
              {executoresOpcoes.map(x => (
                <option key={x.id} value={x.id}>
                  {x.label} (id {x.id})
                </option>
              ))}
            </select>
            {/* Task #254 — intervalo de datas (de/ate). Vazios = sem filtro. */}
            <label className="flex items-center gap-1 text-xs text-zinc-400">
              de
              <input
                type="date"
                value={filtroDataDe}
                max={filtroDataAte || undefined}
                onChange={e => setFiltroDataDe(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-200"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">
              ate
              <input
                type="date"
                value={filtroDataAte}
                min={filtroDataDe || undefined}
                onChange={e => setFiltroDataAte(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-200"
              />
            </label>
            {(filtroDataDe || filtroDataAte) && (
              <button
                onClick={() => { setFiltroDataDe(""); setFiltroDataAte(""); }}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300"
                title="Limpar filtro de datas"
              >
                limpar datas
              </button>
            )}
            <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
              <RefreshCw size={16} /> Recarregar
            </button>
            {/* Task #255 — exporta a lista filtrada (mesma `visiveis`) como CSV. */}
            <button
              onClick={exportarCsv}
              disabled={visiveis.length === 0}
              className="px-3 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2 border border-amber-500/40"
              title={visiveis.length === 0 ? "Nada pra exportar com os filtros atuais" : `Exportar ${visiveis.length} evento(s) filtrado(s) como CSV`}
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Acesso negado / falha</div>
              <div className="text-sm">{erro}</div>
              <div className="text-xs text-red-400/80 mt-1">
                Esta tela exige perfil <code>platform_owner</code> e 2FA recente (&lt;8h).
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Quando</th>
                <th className="text-left px-4 py-3">Acao</th>
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Executor</th>
                <th className="text-left px-4 py-3">Motivo / Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && visiveis.length === 0 && !erro && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Sem eventos.</td></tr>
              )}
              {!loading && visiveis.map(e => {
                const cor = ACAO_COR[e.acao] ?? "bg-zinc-700/40 text-zinc-300 border-zinc-600";
                const avisos = Array.isArray(e.metadata?.avisos) ? e.metadata.avisos : [];
                const temAvisos = avisos.length > 0;
                const totalEnviados = avisos.reduce((a, av) => a + (av.enviados ?? 0), 0);
                const totalFalhas = avisos.reduce((a, av) => a + (av.falhas ?? 0), 0);
                const podeReenviar = e.acao === "SUSPENDER" || e.acao === "REASSUMIR";
                const expandido = expandidoEventoId === e.id;
                const restoMetadata = metadataSemAvisos(e.metadata ?? {});
                return (
                  <tr key={e.id} className="border-t border-zinc-800 align-top">
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(e.criado_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono border ${cor}`}>
                        {e.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {e.unidade_nome ?? `id ${e.unidade_id}`}
                      <div className="text-xs text-zinc-500">id {e.unidade_id}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {e.executor_nome ?? `usuario ${e.executado_por_usuario_id}`}
                      <div className="text-xs text-zinc-500">{e.executor_email ?? "—"}</div>
                      {e.ip && <div className="text-[10px] text-zinc-600 font-mono mt-1">ip {e.ip}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300 max-w-md">
                      {e.motivo && <div className="italic mb-2">"{e.motivo}"</div>}

                      {(temAvisos || podeReenviar) && (
                        <div className="mb-2 border border-zinc-800 rounded bg-zinc-950/40 p-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              onClick={() => setExpandidoEventoId(expandido ? null : e.id)}
                              className="inline-flex items-center gap-1 text-zinc-300 hover:text-amber-300"
                            >
                              {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              <Mail size={12} />
                              <span className="font-semibold">Avisos</span>
                              {temAvisos ? (
                                <>
                                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    {totalEnviados} enviados
                                  </span>
                                  {totalFalhas > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/40">
                                      {totalFalhas} falhas
                                    </span>
                                  )}
                                  <span className="text-zinc-500 text-[10px]">
                                    · {avisos.length} tentativa(s)
                                  </span>
                                </>
                              ) : (
                                <span className="ml-1 text-zinc-500 italic text-[10px]">
                                  nenhum aviso registrado
                                </span>
                              )}
                            </button>
                            {podeReenviar && (
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  disabled={reenviandoEventoId === e.id}
                                  onClick={() => void reenviarAvisos(e.id, false, "EMAIL")}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                                  title="Reenviar emails de aviso pra todos os destinatarios"
                                >
                                  <Mail size={11} />
                                  {reenviandoEventoId === e.id && !reenviandoApenasFalhas && reenviandoCanal === "EMAIL"
                                    ? "reenviando..."
                                    : "Reenviar avisos (email)"}
                                </button>
                                {/* Task #148 — botao extra so aparece quando ha
                                    pelo menos uma tentativa anterior de EMAIL com
                                    detalhes_email contendo falhas. Sem isso o
                                    backend devolve 400 (sem nada pra reenviar). */}
                                {(() => {
                                  const ultimoEmail = [...avisos]
                                    .reverse()
                                    .find((a) => (a.canal ?? "EMAIL") === "EMAIL");
                                  const falhadosEmail = (ultimoEmail?.detalhes_email ?? [])
                                    .filter((d) => !d.sucesso);
                                  if (falhadosEmail.length === 0) return null;
                                  return (
                                    <button
                                      disabled={reenviandoEventoId === e.id}
                                      onClick={() => void reenviarAvisos(e.id, true, "EMAIL")}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                                      title={`Reenviar so pros ${falhadosEmail.length} destinatario(s) de email que falharam na ultima tentativa`}
                                    >
                                      <Mail size={11} />
                                      {reenviandoEventoId === e.id && reenviandoApenasFalhas && reenviandoCanal === "EMAIL"
                                        ? "reenviando..."
                                        : `Reenviar so pros que falharam — email (${falhadosEmail.length})`}
                                    </button>
                                  );
                                })()}
                                {/* Task #266 — reenvio total por WhatsApp. Aparece sempre
                                    que o evento e SUSPENDER/REASSUMIR. A camada de envio
                                    coleta os telefones dos responsaveis na hora do POST. */}
                                <button
                                  disabled={reenviandoEventoId === e.id}
                                  onClick={() => void reenviarAvisos(e.id, false, "WHATSAPP")}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                                  title="Reenviar mensagens de WhatsApp de aviso pra todos os destinatarios"
                                >
                                  <MessageCircle size={11} />
                                  {reenviandoEventoId === e.id && !reenviandoApenasFalhas && reenviandoCanal === "WHATSAPP"
                                    ? "reenviando..."
                                    : "Reenviar avisos (WhatsApp)"}
                                </button>
                                {/* Task #266 — analogo ao botao de EMAIL parcial: so aparece
                                    quando ha pelo menos um detalhes_whatsapp[] com
                                    sucesso=false na ultima tentativa de WhatsApp. */}
                                {(() => {
                                  const ultimoWhatsapp = [...avisos]
                                    .reverse()
                                    .find((a) => a.canal === "WHATSAPP");
                                  const falhadosWhatsapp = (ultimoWhatsapp?.detalhes_whatsapp ?? [])
                                    .filter((d) => !d.sucesso);
                                  if (falhadosWhatsapp.length === 0) return null;
                                  return (
                                    <button
                                      disabled={reenviandoEventoId === e.id}
                                      onClick={() => void reenviarAvisos(e.id, true, "WHATSAPP")}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                                      title={`Reenviar so pros ${falhadosWhatsapp.length} numero(s) de WhatsApp que falharam na ultima tentativa`}
                                    >
                                      <MessageCircle size={11} />
                                      {reenviandoEventoId === e.id && reenviandoApenasFalhas && reenviandoCanal === "WHATSAPP"
                                        ? "reenviando..."
                                        : `Reenviar so pros que falharam — WhatsApp (${falhadosWhatsapp.length})`}
                                    </button>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          {expandido && temAvisos && (
                            <div className="mt-2 space-y-1">
                              {avisos.map((av, i) => {
                                const canal = av.canal ?? "EMAIL";
                                const isWhatsapp = canal === "WHATSAPP";
                                const detalhes = av.detalhes_whatsapp ?? [];
                                const viaHsm = av.via_hsm ?? 0;
                                const viaTextoLivre = av.via_texto_livre ?? 0;
                                // Task #176 + Task #204: alerta amarelo quando
                                // 100% dos envios sairam por texto livre E o
                                // webhook do provedor NAO confirmou entrega
                                // pra ninguem. Sem HSM, a mensagem so chega
                                // dentro da janela de 24h apos o destinatario
                                // falar com a clinica — fora dela, o provedor
                                // pode bloquear silenciosamente.
                                const algumEntreguOuLido = isWhatsapp &&
                                  detalhes.some(
                                    (d) =>
                                      d.statusEntrega === "ENTREGUE" ||
                                      d.statusEntrega === "LIDO",
                                  );
                                const tudoTextoLivreBruto =
                                  isWhatsapp &&
                                  av.enviados > 0 &&
                                  viaHsm === 0 &&
                                  viaTextoLivre === av.enviados;
                                // Task #205 — se a gente tem snapshot da janela
                                // de 24h pra todos os destinatarios e TODOS
                                // estavam dentro dela no envio, a entrega por
                                // texto livre eh garantida — nao precisa do
                                // alerta amarelo. Se faltar info (registros
                                // antigos), preserva o comportamento conservador.
                                // Task #204: se o webhook ja confirmou entrega,
                                // tambem suprimimos o alerta.
                                const todosDentroJanela =
                                  detalhes.length > 0 &&
                                  detalhes.every(
                                    (d) =>
                                      d.dentroJanela24h === true ||
                                      (d.viaHsm && d.sucesso),
                                  );
                                const tudoTextoLivre = tudoTextoLivreBruto && !todosDentroJanela && !algumEntreguOuLido;
                                // Task #204: alerta vermelho quando o webhook
                                // do provedor confirmou FALHOU (bloqueio /
                                // numero invalido / spam) em pelo menos um
                                // destinatario — mais forte que o amarelo
                                // "pode ter sido bloqueado".
                                const algumWebhookFalhou = isWhatsapp &&
                                  detalhes.some((d) => d.statusEntrega === "FALHOU");
                                const totalWebhookFalhou = detalhes.filter(
                                  (d) => d.statusEntrega === "FALHOU",
                                ).length;
                                return (
                                <div key={i} className="border-l-2 border-zinc-700 pl-2 text-[11px]">
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                                      isWhatsapp
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                                        : "bg-blue-500/10 text-blue-300 border-blue-500/40"
                                    }`}>
                                      {isWhatsapp ? <MessageCircle size={10} /> : <Mail size={10} />}
                                      {canal}
                                    </span>
                                    <span className="text-zinc-300 font-mono">{av.tipo}</span>
                                    <span className="text-zinc-500">
                                      {new Date(av.em).toLocaleString("pt-BR")}
                                    </span>
                                    <span className="text-emerald-300">{av.enviados} enviados</span>
                                    {av.falhas > 0 && (
                                      <span className="text-red-300">{av.falhas} falhas</span>
                                    )}
                                    <span className="text-zinc-500">
                                      · {av.destinatarios.length} destinatario(s)
                                    </span>
                                    {isWhatsapp && (viaHsm > 0 || viaTextoLivre > 0) && (
                                      <>
                                        {viaHsm > 0 && (
                                          <span
                                            className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                            title="Template HSM aprovado pelo Meta — entrega garantida fora da janela de 24h (porta da frente)"
                                          >
                                            HSM: {viaHsm}
                                          </span>
                                        )}
                                        {viaTextoLivre > 0 && (
                                          <span
                                            className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/40"
                                            title="Texto livre (fallback) — so entrega dentro da janela de 24h apos o destinatario falar com a clinica"
                                          >
                                            Texto livre: {viaTextoLivre}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {algumWebhookFalhou && (
                                    <div className="mt-1 px-2 py-1.5 bg-red-500/10 border border-red-500/40 rounded text-red-200 flex items-start gap-1.5">
                                      <XCircle size={12} className="shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-semibold">
                                          provedor confirmou bloqueio/falha em {totalWebhookFalhou} destinatario(s)
                                        </div>
                                        <div className="text-red-300/80 text-[10px]">
                                          Webhook do Twilio/Gupshup retornou status FALHOU
                                          (bloqueio, numero invalido, fora da janela de 24h
                                          ou marcado como spam). Confirme por outro canal.
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {tudoTextoLivre && !algumWebhookFalhou && (
                                    <div className="mt-1 px-2 py-1.5 bg-amber-500/10 border border-amber-500/40 rounded text-amber-200 flex items-start gap-1.5">
                                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-semibold">
                                          aviso pode ter sido bloqueado pelo provedor
                                        </div>
                                        <div className="text-amber-300/80 text-[10px]">
                                          100% dos envios sairam por texto livre (fallback) e
                                          o webhook ainda nao confirmou entrega. Se o
                                          destinatario nao falou com a clinica nas ultimas 24h,
                                          o Twilio/Gupshup pode ter bloqueado a entrega
                                          silenciosamente. Confirme por outro canal.
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {av.apenas_falhas && (
                                    <div className="mt-1 text-[10px] text-amber-300/80 italic">
                                      reenvio parcial — apenas destinatarios que falharam na tentativa anterior
                                    </div>
                                  )}
                                  {isWhatsapp && detalhes.length > 0 ? (
                                    <div className="text-zinc-500 mt-0.5 space-y-0.5">
                                      {detalhes.map((d, j) => (
                                        <div key={j} className="flex flex-wrap gap-1.5 items-center break-all">
                                          {d.sucesso ? (
                                            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                          ) : (
                                            <XCircle size={10} className="text-red-400 shrink-0" />
                                          )}
                                          <span className="font-mono text-zinc-400">{d.destinatario}</span>
                                          {d.sucesso ? (
                                            d.viaHsm ? (
                                              <span className="px-1 py-0 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                                                HSM
                                              </span>
                                            ) : d.viaTextoLivre ? (
                                              <span className="px-1 py-0 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/40">
                                                texto livre
                                              </span>
                                            ) : (
                                              <span className="px-1 py-0 rounded text-[9px] bg-zinc-700/40 text-zinc-300 border border-zinc-600">
                                                enviado
                                              </span>
                                            )
                                          ) : (
                                            <span className="px-1 py-0 rounded text-[9px] bg-red-500/15 text-red-300 border border-red-500/40">
                                              falhou
                                            </span>
                                          )}
                                          {/* Task #204 — status real de entrega vindo
                                              do webhook do provedor (Twilio/Gupshup).
                                              So aparece quando o envio teve sucesso e
                                              o webhook ja retornou pelo menos um
                                              status posterior a ENVIADO. */}
                                          {d.sucesso && d.statusEntrega && (
                                            d.statusEntrega === "LIDO" ? (
                                              <span
                                                className="px-1 py-0 rounded text-[9px] bg-emerald-500/25 text-emerald-200 border border-emerald-400"
                                                title={
                                                  d.lidoEm
                                                    ? `Lido em ${new Date(d.lidoEm).toLocaleString("pt-BR")}`
                                                    : "Webhook do provedor confirmou leitura"
                                                }
                                              >
                                                ✓✓✓ lido
                                              </span>
                                            ) : d.statusEntrega === "ENTREGUE" ? (
                                              <span
                                                className="px-1 py-0 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                                title={
                                                  d.entregueEm
                                                    ? `Entregue em ${new Date(d.entregueEm).toLocaleString("pt-BR")}`
                                                    : "Webhook do provedor confirmou entrega"
                                                }
                                              >
                                                ✓✓ entregue
                                              </span>
                                            ) : d.statusEntrega === "FALHOU" ? (
                                              <span
                                                className="px-1 py-0 rounded text-[9px] bg-red-500/25 text-red-200 border border-red-400"
                                                title="Webhook do provedor confirmou bloqueio/falha de entrega"
                                              >
                                                ✗ provedor falhou
                                              </span>
                                            ) : d.statusEntrega === "ENVIADO" ? (
                                              <span
                                                className="px-1 py-0 rounded text-[9px] bg-zinc-700/40 text-zinc-400 border border-zinc-600"
                                                title="Saiu pra rede, mas o webhook ainda nao confirmou entrega"
                                              >
                                                ✓ aguardando entrega
                                              </span>
                                            ) : null
                                          )}
                                          {d.erro && (
                                            <span className="text-red-400/80 text-[10px]">
                                              {d.erro}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : !isWhatsapp && (av.detalhes_email?.length ?? 0) > 0 ? (
                                    // Task #148 — render por-destinatario com icone
                                    // verde/vermelho pra deixar visivel quem recebeu
                                    // e quem nao. So aparece em registros gravados a
                                    // partir desta task; antigos caem no fallback
                                    // abaixo (lista plana sem icone individual).
                                    <div className="text-zinc-500 mt-0.5 space-y-0.5">
                                      {(av.detalhes_email ?? []).map((d, j) => (
                                        <div key={j} className="flex flex-wrap gap-1.5 items-center break-all">
                                          {d.sucesso ? (
                                            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                          ) : (
                                            <XCircle size={10} className="text-red-400 shrink-0" />
                                          )}
                                          <span className="font-mono text-zinc-400">{d.destinatario}</span>
                                          {d.sucesso ? (
                                            <span className="px-1 py-0 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                                              enviado
                                            </span>
                                          ) : (
                                            <span className="px-1 py-0 rounded text-[9px] bg-red-500/15 text-red-300 border border-red-500/40">
                                              falhou
                                            </span>
                                          )}
                                          {d.erro && (
                                            <span className="text-red-400/80 text-[10px]">
                                              {d.erro}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    av.destinatarios.length > 0 && (
                                      <div className="text-zinc-500 mt-0.5 break-all">
                                        {av.destinatarios.join(", ")}
                                        <span className="ml-1 text-zinc-600 italic text-[10px]">
                                          (registro antigo — sem detalhe por destinatario)
                                        </span>
                                      </div>
                                    )
                                  )}
                                  {av.erro && (
                                    <div className="text-red-400 mt-0.5">erro: {av.erro}</div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {Object.keys(restoMetadata).length > 0 && (
                        <pre className="text-[10px] bg-zinc-950/60 border border-zinc-800 rounded p-2 overflow-x-auto text-zinc-400">
{JSON.stringify(restoMetadata, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Mostrando {visiveis.length} de {eventos.length} eventos (limite servidor: 500).
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
