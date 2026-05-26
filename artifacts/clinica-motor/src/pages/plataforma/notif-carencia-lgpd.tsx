// Task #257 — Painel CEO: historico de avisos de vencimento da carencia
// LGPD de exclusao de clinica. Worker `avisoVencimentoCarenciaLgpd`
// (Task #135) grava cada envio em `notif_carencia_lgpd_clinica_envios`.
// Consome GET /api/plataforma/notif-carencia-lgpd-clinicas e mostra:
//   - tabela: unidade · tipo (7D/3D/1D/VENCIDO_SEM_EXPORT) · dia · enviados/falhas · status · erro
//   - destaque vermelho pra linhas VENCIDO_SEM_EXPORT e status='ERRO'
//   - secao com clinicas EXCLUIDO_PENDENTE que ainda nao receberam aviso
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

type Envio = {
  id: number;
  unidade_id: number;
  dia_brt: string;
  tipo_aviso: "AVISO_7D" | "AVISO_3D" | "AVISO_1D" | "VENCIDO_SEM_EXPORT" | string;
  dias_restantes: number;
  destinatarios: string[];
  total_destinatarios: number;
  enviados: number;
  falhas: number;
  status: "OK" | "ERRO" | "PARCIAL" | string;
  erro: string | null;
  enviado_em: string;
  unidade_nome: string | null;
};

type PendenteSemAviso = {
  id: number;
  nome: string;
  exclusao_carencia_ate: string;
  lgpd_export_url: string | null;
  dias_restantes: number;
};

const TIPO_LABEL: Record<string, string> = {
  AVISO_7D: "7 dias",
  AVISO_3D: "3 dias",
  AVISO_1D: "1 dia",
  VENCIDO_SEM_EXPORT: "Vencido s/ export",
};

const TIPO_COR: Record<string, string> = {
  AVISO_7D: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  AVISO_3D: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  AVISO_1D: "bg-red-500/15 text-red-300 border-red-500/40",
  VENCIDO_SEM_EXPORT: "bg-red-700/30 text-red-200 border-red-700/60",
};

const STATUS_COR: Record<string, { cls: string; icon: React.ReactNode }> = {
  OK: {
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    icon: <CheckCircle2 size={12} />,
  },
  PARCIAL: {
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    icon: <AlertTriangle size={12} />,
  },
  ERRO: {
    cls: "bg-red-500/15 text-red-300 border-red-500/40",
    icon: <XCircle size={12} />,
  },
};

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDia(dia: string | null): string {
  if (!dia) return "—";
  // dia vem como YYYY-MM-DD do backend (date), formata pt-BR sem hora.
  const [y, m, d] = dia.slice(0, 10).split("-");
  if (!y || !m || !d) return dia;
  return `${d}/${m}/${y.slice(2)}`;
}

export default function PlataformaNotifCarenciaLgpd() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [pendentesSemAviso, setPendentesSemAviso] = useState<PendenteSemAviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const params = new URLSearchParams({ limite: "200" });
    if (filtroStatus !== "todos") params.set("status", filtroStatus);
    if (filtroTipo !== "todos") params.set("tipo_aviso", filtroTipo);
    if (filtroUnidade !== "todas") params.set("unidade_id", filtroUnidade);
    const url = `/api/plataforma/notif-carencia-lgpd-clinicas?${params.toString()}`;
    const r = await runWithStepUp(() => apiFetch(url, { credentials: "include" }));
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setEnvios(Array.isArray(j.envios) ? j.envios : []);
    setPendentesSemAviso(
      Array.isArray(j.pendentes_sem_aviso) ? j.pendentes_sem_aviso : [],
    );
    setLoading(false);
  }, [filtroStatus, filtroTipo, filtroUnidade, runWithStepUp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const unidadesNoLote = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of envios) {
      if (!map.has(e.unidade_id)) {
        map.set(e.unidade_id, e.unidade_nome ?? `unidade ${e.unidade_id}`);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [envios]);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <ShieldAlert size={28} /> Plataforma · Avisos de carencia LGPD
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Historico do worker que dispara emails diarios pras clinicas
              em <code>EXCLUIDO_PENDENTE</code> nas janelas criticas (7d,
              3d, 1d, vencido sem export). Cada linha = 1 envio (idempotente
              por unidade · tipo · dia BRT).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-tipo-carencia-lgpd"
            >
              <option value="todos">Todos os tipos</option>
              <option value="AVISO_7D">7 dias</option>
              <option value="AVISO_3D">3 dias</option>
              <option value="AVISO_1D">1 dia</option>
              <option value="VENCIDO_SEM_EXPORT">Vencido s/ export</option>
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-status-carencia-lgpd"
            >
              <option value="todos">Todos os status</option>
              <option value="OK">OK</option>
              <option value="PARCIAL">Parcial</option>
              <option value="ERRO">Erro</option>
            </select>
            <select
              value={filtroUnidade}
              onChange={(e) => setFiltroUnidade(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-filtro-unidade-carencia-lgpd"
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
              data-testid="button-recarregar-carencia-lgpd"
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

        {pendentesSemAviso.length > 0 && (
          <div
            className="mb-6 p-4 bg-amber-500/10 border border-amber-500/40 rounded"
            data-testid="bloco-pendentes-sem-aviso"
          >
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-2">
              <Clock size={18} />
              Clinicas em EXCLUIDO_PENDENTE sem nenhum aviso registrado
              ({pendentesSemAviso.length})
            </div>
            <div className="text-xs text-amber-200/80 mb-3">
              O worker so dispara nas janelas 7d/3d/1d/vencido — fora dessas
              janelas a clinica fica aqui esperando. Se algo continua aqui
              dentro de uma janela critica, suspeite de gap (worker parado,
              sem destinatarios resolvidos, etc).
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-amber-200/80">
                  <tr>
                    <th className="text-left px-2 py-1">Clinica</th>
                    <th className="text-left px-2 py-1">Carencia ate</th>
                    <th className="text-left px-2 py-1">Dias restantes</th>
                    <th className="text-left px-2 py-1">Export LGPD</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentesSemAviso.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-amber-500/20"
                      data-testid={`row-pendente-sem-aviso-${p.id}`}
                    >
                      <td className="px-2 py-1 text-zinc-200">
                        {p.nome} <span className="text-zinc-500">#{p.id}</span>
                      </td>
                      <td className="px-2 py-1 text-zinc-300 font-mono">
                        {formatarDataHora(p.exclusao_carencia_ate)}
                      </td>
                      <td className="px-2 py-1 text-zinc-300 font-mono">
                        {p.dias_restantes}d
                      </td>
                      <td className="px-2 py-1">
                        {p.lgpd_export_url ? (
                          <span className="text-emerald-300">gerado</span>
                        ) : (
                          <span className="text-red-300">vazio</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Quando</th>
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Dia BRT</th>
                <th className="text-left px-4 py-3">Enviados / Falhas</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Erro</th>
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
              {!loading && envios.length === 0 && !erro && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum envio encontrado pros filtros atuais.
                  </td>
                </tr>
              )}
              {!loading &&
                envios.map((e) => {
                  const tipoCls =
                    TIPO_COR[e.tipo_aviso] ??
                    "bg-zinc-700/40 text-zinc-300 border-zinc-600";
                  const statusInfo = STATUS_COR[e.status] ?? {
                    cls: "bg-zinc-700/40 text-zinc-300 border-zinc-600",
                    icon: null,
                  };
                  // Destaque por linha: VENCIDO_SEM_EXPORT OU status=ERRO
                  // pintam o fundo da linha em vermelho discreto pra puxar
                  // o olho do CEO no scan rapido da tabela.
                  const destaque =
                    e.tipo_aviso === "VENCIDO_SEM_EXPORT" || e.status === "ERRO"
                      ? "bg-red-500/5"
                      : "";
                  return (
                    <tr
                      key={e.id}
                      className={`border-t border-zinc-800 align-top ${destaque}`}
                      data-testid={`row-envio-carencia-lgpd-${e.id}`}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {formatarDataHora(e.enviado_em)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <div className="font-semibold">
                          {e.unidade_nome ?? `unidade ${e.unidade_id}`}
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          id #{e.unidade_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${tipoCls}`}
                        >
                          {TIPO_LABEL[e.tipo_aviso] ?? e.tipo_aviso}
                        </span>
                        <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                          {e.dias_restantes}d restantes
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300 font-mono whitespace-nowrap">
                        {formatarDia(e.dia_brt)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-300 whitespace-nowrap">
                        <div>
                          <span className="text-emerald-300">{e.enviados}</span>
                          {" / "}
                          <span className={e.falhas > 0 ? "text-red-300" : "text-zinc-500"}>
                            {e.falhas}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {e.total_destinatarios} destinatarios
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${statusInfo.cls}`}
                        >
                          {statusInfo.icon} {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {e.erro ? (
                          <div
                            className="text-red-300/80 break-all"
                            title={e.erro}
                          >
                            {e.erro.length > 80
                              ? `${e.erro.slice(0, 80)}…`
                              : e.erro}
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Mostrando {envios.length} envios (limite servidor: 200). Filtros:
          tipo = <code>{filtroTipo}</code>, status = <code>{filtroStatus}</code>,
          unidade = <code>{filtroUnidade}</code>.
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
