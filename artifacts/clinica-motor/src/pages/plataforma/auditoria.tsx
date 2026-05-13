import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import { Scale, RefreshCw, ShieldAlert, Mail, Send, ChevronDown, ChevronRight } from "lucide-react";

type RegistroAviso = {
  tipo: "SUSPENSAO" | "REATIVACAO" | "REENVIO_SUSPENSAO" | "REENVIO_REATIVACAO";
  destinatarios: string[];
  enviados: number;
  falhas: number;
  erro: string | null;
  em: string;
  executado_por_usuario_id: number;
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
  const [expandidoEventoId, setExpandidoEventoId] = useState<number | null>(null);
  const [reenviandoEventoId, setReenviandoEventoId] = useState<number | null>(null);
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

  async function reenviarAvisos(eventoId: number) {
    if (!window.confirm(
      "Reenviar emails de aviso pra todos os destinatarios deste evento?\n" +
      "O resultado ficara registrado no historico (auditoria_kill_switch).",
    )) return;
    setReenviandoEventoId(eventoId);
    const r = await runWithStepUp(() =>
      apiFetch(
        `/api/plataforma/auditoria/${eventoId}/reenviar-avisos`,
        { method: "POST", credentials: "include" },
      ),
    );
    setReenviandoEventoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json();
    alert(
      `Reenvio concluido.\n\n` +
      `Destinatarios: ${j.email?.destinatarios?.length ?? 0}\n` +
      `Enviados: ${j.email?.enviados ?? 0}\n` +
      `Falhas: ${j.email?.falhas ?? 0}` +
      (j.erro ? `\n\nErro geral: ${j.erro}` : ""),
    );
    await carregar();
  }

  const acoes = Array.from(new Set(eventos.map(e => e.acao))).sort();
  const visiveis = filtroAcao ? eventos.filter(e => e.acao === filtroAcao) : eventos;

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
          <div className="flex items-center gap-2">
            <select
              value={filtroAcao}
              onChange={e => setFiltroAcao(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Todas as acoes</option>
              {acoes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
              <RefreshCw size={16} /> Recarregar
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
                              <button
                                disabled={reenviandoEventoId === e.id}
                                onClick={() => void reenviarAvisos(e.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                                title="Reenviar emails de aviso pra todos os destinatarios"
                              >
                                <Send size={11} />
                                {reenviandoEventoId === e.id ? "reenviando..." : "Reenviar avisos"}
                              </button>
                            )}
                          </div>
                          {expandido && temAvisos && (
                            <div className="mt-2 space-y-1">
                              {avisos.map((av, i) => (
                                <div key={i} className="border-l-2 border-zinc-700 pl-2 text-[11px]">
                                  <div className="flex flex-wrap gap-2 items-center">
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
                                  </div>
                                  {av.destinatarios.length > 0 && (
                                    <div className="text-zinc-500 mt-0.5 break-all">
                                      {av.destinatarios.join(", ")}
                                    </div>
                                  )}
                                  {av.erro && (
                                    <div className="text-red-400 mt-0.5">erro: {av.erro}</div>
                                  )}
                                </div>
                              ))}
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
