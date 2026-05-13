// Task #149 — Painel CEO: historico de alertas de email travado
// (worker alertaKillSwitchEmailsCEO, Task #141). Consome
// GET /api/plataforma/alertas-killswitch-emails. Lista as ultimas N
// linhas com unidade, acao (SUSPENDER/REASSUMIR), motivo, % falha, status
// email/wpp e data. Filtros por unidade e por motivo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import {
  MailWarning,
  RefreshCw,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type Alerta = {
  id: number;
  evento_id: number;
  tentativa_idx: number;
  unidade_id: number;
  acao: string;
  tipo_aviso: string;
  destinatarios: number;
  enviados: number;
  falhas: number;
  erro: string | null;
  motivo_alerta: "ERRO_NO_ENVIO" | "SEM_DESTINATARIO" | "FALHA_ACIMA_DO_THRESHOLD" | string;
  pct_falha: string | number | null;
  notif_email_ok: boolean;
  notif_wpp_ok: boolean;
  visualizado_em: string | null;
  criado_em: string;
  unidade_nome: string | null;
};

const MOTIVO_LABEL: Record<string, string> = {
  ERRO_NO_ENVIO: "Erro no envio",
  SEM_DESTINATARIO: "Sem destinatario",
  FALHA_ACIMA_DO_THRESHOLD: "Falha acima do threshold",
};

const MOTIVO_COR: Record<string, string> = {
  ERRO_NO_ENVIO: "bg-red-500/15 text-red-300 border-red-500/40",
  SEM_DESTINATARIO: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  FALHA_ACIMA_DO_THRESHOLD: "bg-orange-500/15 text-orange-300 border-orange-500/40",
};

const ACAO_LABEL: Record<string, string> = {
  SUSPENDER: "Suspender",
  REASSUMIR: "Reassumir",
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

function formatarPct(v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export default function PlataformaAlertasKillswitchEmails() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todas");
  const [filtroMotivo, setFiltroMotivo] = useState<string>("todos");
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const params = new URLSearchParams({ limite: "200" });
    if (filtroMotivo !== "todos") params.set("motivo", filtroMotivo);
    if (filtroUnidade !== "todas") params.set("unidade_id", filtroUnidade);
    const url = `/api/plataforma/alertas-killswitch-emails?${params.toString()}`;
    const r = await runWithStepUp(() => apiFetch(url, { credentials: "include" }));
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setAlertas(Array.isArray(j.alertas) ? j.alertas : []);
    setLoading(false);
  }, [filtroMotivo, filtroUnidade, runWithStepUp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Agrega lista de unidades a partir dos alertas carregados (sem precisar
  // chamar /unidades). Se filtro de unidade ja esta aplicado a lista pode
  // ficar curta — por isso ofecemos sempre a opcao "todas" pra resetar.
  const unidadesNoLote = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of alertas) {
      if (!map.has(a.unidade_id)) {
        map.set(a.unidade_id, a.unidade_nome ?? `unidade ${a.unidade_id}`);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [alertas]);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <MailWarning size={28} /> Plataforma · Alertas de email travado
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Historico do worker que dispara aviso ao CEO quando os emails
              de SUSPENDER / REASSUMIR uma clinica falham (Task #141). Use o
              filtro pra detectar tendencia (ex: Gmail caindo varias vezes
              na semana → trocar credencial).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filtroMotivo}
              onChange={(e) => setFiltroMotivo(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-motivo-killswitch"
            >
              <option value="todos">Todos os motivos</option>
              <option value="ERRO_NO_ENVIO">Erro no envio</option>
              <option value="SEM_DESTINATARIO">Sem destinatario</option>
              <option value="FALHA_ACIMA_DO_THRESHOLD">Falha acima do threshold</option>
            </select>
            <select
              value={filtroUnidade}
              onChange={(e) => setFiltroUnidade(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-unidade-killswitch"
            >
              <option value="todas">Todas as clinicas</option>
              {unidadesNoLote.map(([id, nome]) => (
                <option key={id} value={String(id)}>
                  {nome} (#{id})
                </option>
              ))}
            </select>
            <button
              onClick={() => void carregar()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              data-testid="button-recarregar-killswitch"
            >
              <RefreshCw size={16} /> Recarregar
            </button>
          </div>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
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
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Acao</th>
                <th className="text-left px-4 py-3">Motivo</th>
                <th className="text-left px-4 py-3">% falha</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && alertas.length === 0 && !erro && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum alerta encontrado pros filtros atuais.
                  </td>
                </tr>
              )}
              {!loading &&
                alertas.map((a) => {
                  const motivoCls =
                    MOTIVO_COR[a.motivo_alerta] ??
                    "bg-zinc-700/40 text-zinc-300 border-zinc-600";
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-zinc-800 align-top"
                      data-testid={`row-alerta-killswitch-${a.id}`}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        <div>{formatarData(a.criado_em)}</div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          evento #{a.evento_id} · tent. {a.tentativa_idx}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <div className="font-semibold">
                          {a.unidade_nome ?? `unidade ${a.unidade_id}`}
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          id #{a.unidade_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 font-mono">
                          {ACAO_LABEL[a.acao] ?? a.acao}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {a.tipo_aviso}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${motivoCls}`}
                        >
                          {MOTIVO_LABEL[a.motivo_alerta] ?? a.motivo_alerta}
                        </span>
                        {a.erro && (
                          <div
                            className="text-[10px] text-red-300/80 mt-1 break-all"
                            title={a.erro}
                          >
                            {a.erro.length > 80
                              ? `${a.erro.slice(0, 80)}…`
                              : a.erro}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-300 whitespace-nowrap">
                        <div>{formatarPct(a.pct_falha)}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {a.falhas}/{a.destinatarios} falhas
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {a.enviados} enviados
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {a.notif_email_ok ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                            <Mail size={11} /> <CheckCircle2 size={11} /> ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/40">
                            <Mail size={11} /> <XCircle size={11} /> falhou
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {a.notif_wpp_ok ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                            <MessageSquare size={11} /> <CheckCircle2 size={11} /> ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-700/40 text-zinc-400 border border-zinc-600">
                            <MessageSquare size={11} /> <XCircle size={11} /> —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Mostrando {alertas.length} alertas (limite servidor: 200). Filtros:
          motivo = <code>{filtroMotivo}</code>, unidade ={" "}
          <code>{filtroUnidade}</code>.
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
