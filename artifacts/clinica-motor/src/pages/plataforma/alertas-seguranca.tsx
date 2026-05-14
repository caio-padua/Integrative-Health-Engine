// Task #152 — Painel CEO: alertas de seguranca (2FA brute-force).
// Consome GET /api/plataforma/alertas-seguranca (Task #143). Mostra IP,
// user-agent, contexto (LOGIN_2FA vs STEP_UP_PAINEL), inicio da janela
// de bloqueio e quantas tentativas dispararam o lock. Permite marcar
// como visto (POST .../visualizar) e abrir a conta no painel de admins.
import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import {
  ShieldAlert,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  ExternalLink,
  Lock,
  Repeat,
  AlertOctagon,
} from "lucide-react";

type Alerta = {
  id: number;
  tipo: string;
  usuario_id: number;
  janela_inicio_em: string;
  ip: string | null;
  user_agent: string | null;
  contexto: string | null;
  payload: Record<string, unknown> | null;
  notif_email_enviados: number;
  notif_email_falhas: number;
  notif_destinatarios: string[] | null;
  // Task #167 / #193 — re-tentativas do worker alertaBruteForceRetryEnvio.
  notif_retry_tentativas: number | null;
  notif_ultimo_retry_em: string | null;
  visualizado_em: string | null;
  visualizado_por_usuario_id: number | null;
  criado_em: string;
  usuario_nome: string | null;
  usuario_email: string | null;
};

// Task #193 — `falha_persistente` filtra retry estourou cap (>= 3) AND
// ainda tem falha de envio: precisa acao manual do CEO (rever Gmail,
// destinatarios, etc).
type Filtro = "todos" | "pendentes" | "vistos" | "falha_persistente";

const CONTEXTO_LABEL: Record<string, string> = {
  LOGIN_2FA: "Login 2FA",
  STEP_UP_PAINEL: "Step-up painel",
};

const TIPO_LABEL: Record<string, string> = {
  "2FA_BRUTE_FORCE": "Brute-force 2FA",
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlataformaAlertasSeguranca() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  // Task #193 — cap de retries vem do servidor (env do worker). Default 3
  // pra renderizar enquanto a primeira resposta nao chega.
  const [retryCap, setRetryCap] = useState<number>(3);
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const url =
      filtro === "pendentes"
        ? "/api/plataforma/alertas-seguranca?apenas_nao_vistos=true&limite=200"
        : filtro === "falha_persistente"
          ? "/api/plataforma/alertas-seguranca?apenas_falha_persistente=true&limite=200"
          : "/api/plataforma/alertas-seguranca?limite=200";
    const r = await runWithStepUp(() =>
      apiFetch(url, { credentials: "include" }),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setAlertas(Array.isArray(j.alertas) ? j.alertas : []);
    if (typeof j.retry_tentativas_cap === "number" && j.retry_tentativas_cap > 0) {
      setRetryCap(j.retry_tentativas_cap);
    }
    setLoading(false);
  }, [filtro, runWithStepUp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarComoVisto(id: number) {
    setMarcandoId(id);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/alertas-seguranca/${id}/visualizar`, {
        method: "POST",
        credentials: "include",
      }),
    );
    setMarcandoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro ao marcar como visto: ${j.error ?? r.statusText}`);
      return;
    }
    // Task #165 — refresh imediato do badge no painel-comando (mesma aba via
    // CustomEvent + outras abas via storage event). Mesmo padrao do
    // "alertas_ceo_marcados" (Task #61).
    try {
      window.dispatchEvent(new CustomEvent("alertas_seguranca_marcados"));
      window.localStorage.setItem("alertas_seguranca_marcados_em", String(Date.now()));
    } catch { /* silencioso */ }
    await carregar();
  }

  const visiveis =
    filtro === "vistos"
      ? alertas.filter((a) => a.visualizado_em)
      : filtro === "pendentes"
        ? alertas.filter((a) => !a.visualizado_em)
        : filtro === "falha_persistente"
          ? alertas.filter(
              (a) =>
                (a.notif_retry_tentativas ?? 0) >= retryCap &&
                a.notif_email_falhas > 0,
            )
          : alertas;

  const totalPendentes = alertas.filter((a) => !a.visualizado_em).length;
  // Task #193 — contagem usada no dropdown pra triagem rapida sem precisar
  // trocar de filtro. Calculada sobre a lista atualmente carregada.
  const totalFalhaPersistente = alertas.filter(
    (a) =>
      (a.notif_retry_tentativas ?? 0) >= retryCap && a.notif_email_falhas > 0,
  ).length;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <ShieldAlert size={28} /> Plataforma · Alertas de Seguranca
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Bloqueios automaticos do rate-limit 2FA (5 tentativas erradas em
              5min). Idempotente: 1 alerta por janela de bloqueio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Filtro)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-alertas-seguranca"
            >
              <option value="pendentes">Pendentes ({totalPendentes})</option>
              <option value="todos">Todos</option>
              <option value="vistos">Ja vistos</option>
              <option value="falha_persistente">
                So com falha de envio persistente ({totalFalhaPersistente})
              </option>
            </select>
            <button
              onClick={() => void carregar()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              data-testid="button-recarregar-alertas-seguranca"
            >
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
                Esta tela exige perfil <code>platform_owner</code> e 2FA recente
                (&lt;8h).
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Quando</th>
                <th className="text-left px-4 py-3">Usuario alvo</th>
                <th className="text-left px-4 py-3">Contexto</th>
                <th className="text-left px-4 py-3">Origem</th>
                <th className="text-left px-4 py-3">Notificacao</th>
                <th className="text-left px-4 py-3">Re-envio</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && visiveis.length === 0 && !erro && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum alerta {filtro === "pendentes" ? "pendente" : ""} no
                    momento.
                  </td>
                </tr>
              )}
              {!loading &&
                visiveis.map((a) => {
                  const tentativas =
                    typeof a.payload?.["tentativas"] === "number"
                      ? (a.payload["tentativas"] as number)
                      : null;
                  const naoVisto = !a.visualizado_em;
                  return (
                    <tr
                      key={a.id}
                      className={`border-t border-zinc-800 align-top ${
                        naoVisto ? "bg-amber-500/5" : ""
                      }`}
                      data-testid={`row-alerta-seguranca-${a.id}`}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        <div>{formatarData(a.criado_em)}</div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          janela: {formatarData(a.janela_inicio_em)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <div className="font-semibold">
                          {a.usuario_nome ?? `usuario ${a.usuario_id}`}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {a.usuario_email ?? "—"}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          id #{a.usuario_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30 font-mono">
                          <Lock size={11} />
                          {TIPO_LABEL[a.tipo] ?? a.tipo}
                        </div>
                        {a.contexto && (
                          <div className="text-zinc-500 mt-1">
                            {CONTEXTO_LABEL[a.contexto] ?? a.contexto}
                          </div>
                        )}
                        {tentativas !== null && (
                          <div className="text-zinc-500">
                            {tentativas} tentativas
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-xs">
                        <div className="font-mono">
                          IP: {a.ip ?? "(nao registrado)"}
                        </div>
                        <div
                          className="text-[10px] text-zinc-500 mt-1 break-all"
                          title={a.user_agent ?? ""}
                        >
                          UA: {a.user_agent ?? "(nao registrado)"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1 text-zinc-300">
                          <Mail size={12} />
                          <span className="text-emerald-300">
                            {a.notif_email_enviados} enviados
                          </span>
                          {a.notif_email_falhas > 0 && (
                            <span className="text-red-300">
                              · {a.notif_email_falhas} falhas
                            </span>
                          )}
                        </div>
                        {Array.isArray(a.notif_destinatarios) &&
                          a.notif_destinatarios.length > 0 && (
                            <div className="text-[10px] text-zinc-500 mt-1 break-all">
                              {a.notif_destinatarios.join(", ")}
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {(() => {
                          const retries = a.notif_retry_tentativas ?? 0;
                          const falhouPersistente =
                            retries >= retryCap && a.notif_email_falhas > 0;
                          if (retries === 0) {
                            return (
                              <span className="text-zinc-600">
                                sem re-envio
                              </span>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                                  falhouPersistente
                                    ? "bg-red-500/15 text-red-300 border-red-500/40"
                                    : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                }`}
                                data-testid={`badge-retry-${a.id}`}
                              >
                                <Repeat size={11} /> {retries}/{retryCap}
                              </div>
                              {a.notif_ultimo_retry_em && (
                                <div className="text-[10px] text-zinc-500">
                                  ultimo: {formatarData(a.notif_ultimo_retry_em)}
                                </div>
                              )}
                              {falhouPersistente && (
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-500/50 text-[10px] font-semibold"
                                  data-testid={`badge-falha-persistente-${a.id}`}
                                  title="Worker estourou o cap de re-tentativas e ainda registra falha. Acao manual necessaria (rever Gmail/destinatarios)."
                                >
                                  <AlertOctagon size={11} /> Falha permanente
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {naoVisto ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <EyeOff size={11} /> Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-700/40 text-zinc-300 border border-zinc-600">
                            <Eye size={11} />
                            visto {formatarData(a.visualizado_em)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/plataforma/admins?usuario_id=${a.usuario_id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                            title="Abrir conta no painel de admins"
                          >
                            <ExternalLink size={11} /> Conta
                          </a>
                          {naoVisto && (
                            <button
                              disabled={marcandoId === a.id}
                              onClick={() => void marcarComoVisto(a.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 border border-emerald-500/40"
                              data-testid={`button-marcar-visto-${a.id}`}
                            >
                              <Eye size={11} />
                              {marcandoId === a.id
                                ? "marcando..."
                                : "Marcar visto"}
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

        <div className="mt-4 text-xs text-zinc-500">
          Mostrando {visiveis.length} de {alertas.length} alertas (limite
          servidor: 200). {totalPendentes} pendente(s) no total carregado.
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
