// Task #158 · Painel CEO: historico de avisos de 2FA enviados pelo worker
// avisoExpiracao2faOwner (Task #146). Consome
// GET /api/plataforma/seguranca/avisos-2fa e mostra ultimas N janelas
// de 8h com timestamp do aviso, expiracao, status (renovado / expirou /
// em andamento) e KPI "% de avisos que renderam renovacao". Permite
// auditar "fui avisado quantas vezes essa semana? quantas deixei
// expirar mesmo assim?" sem abrir o banco.
import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Download,
} from "lucide-react";

type Aviso = {
  id: number;
  usuario_id: number;
  ultimo_login_2fa_em: string;
  aviso_em: string;
  expira_em: string;
  renovado_em: string | null;
  canal_email_ok: boolean;
  canal_whatsapp_ok: boolean;
  criado_em: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  renovado_em_segundos_apos_aviso: number | null;
  status: "renovado" | "expirou" | "em_andamento";
};

type Kpi = {
  total_avisos: number;
  total_renovados: number;
  total_expirados: number;
  total_em_andamento: number;
  percentual_renovacao: number | null;
  dias_janela: number;
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

function formatarSegundos(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min < 60) return `${min}min ${sec}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
}

const STATUS_BADGE: Record<
  Aviso["status"],
  { label: string; cls: string; icon: React.ReactNode }
> = {
  renovado: {
    label: "Renovado",
    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40",
    icon: <CheckCircle2 size={14} />,
  },
  expirou: {
    label: "Expirou",
    cls: "bg-red-500/10 text-red-400 border-red-500/40",
    icon: <XCircle size={14} />,
  },
  em_andamento: {
    label: "Em andamento",
    cls: "bg-amber-500/10 text-amber-300 border-amber-500/40",
    icon: <Clock size={14} />,
  },
};

export default function PlataformaAvisos2fa() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState(30);
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState<string | null>(null);
  const { runWithStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await runWithStepUp(() =>
      apiFetch(
        `/api/plataforma/seguranca/avisos-2fa?dias=${dias}&limite=200`,
        { credentials: "include" },
      ),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setAvisos(Array.isArray(j.avisos) ? j.avisos : []);
    setKpi(j.kpi ?? null);
    setLoading(false);
  }, [dias, runWithStepUp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Task #169 — exporta CSV com mesmos filtros (dias) da tela. Limite 500
  // (igual ao cap do endpoint) pra trazer mais que os 200 da UI quando
  // necessario pra correlacao externa (LGPD, auditoria, planilha).
  const exportarCsv = useCallback(async () => {
    setExportando(true);
    setErroExport(null);
    const r = await runWithStepUp(() =>
      apiFetch(
        `/api/plataforma/seguranca/avisos-2fa.csv?dias=${dias}&limite=500`,
        { credentials: "include" },
      ),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErroExport(j.error ?? `Falha ao exportar (${r.status})`);
      setExportando(false);
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const cd = r.headers.get("content-disposition") ?? "";
    const m = /filename="([^"]+)"/.exec(cd);
    const nome = m?.[1] ?? `avisos-2fa-${dias}d.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportando(false);
  }, [dias, runWithStepUp]);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {stepUpModal}
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-sky-300 flex items-center gap-2">
              <ShieldCheck size={28} /> Plataforma · Historico de avisos 2FA
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Avisos enviados pelo motor (Task #146) ~15min antes da janela
              de 8h expirar. 1 linha por janela. Audita "fui avisado quantas
              vezes essa semana? quantas deixei expirar?".
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="select-dias-avisos-2fa"
            >
              <option value={7}>Ultimos 7 dias</option>
              <option value={30}>Ultimos 30 dias</option>
              <option value={90}>Ultimos 90 dias</option>
            </select>
            <button
              onClick={() => void carregar()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              data-testid="button-recarregar-avisos-2fa"
            >
              <RefreshCw size={16} /> Recarregar
            </button>
            <button
              onClick={() => void exportarCsv()}
              disabled={exportando}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2"
              data-testid="button-exportar-csv-avisos-2fa"
              title={`Exportar CSV (ultimos ${dias} dias)`}
            >
              <Download size={16} />
              {exportando ? "Exportando..." : "Exportar CSV"}
            </button>
          </div>
        </header>

        {erroExport && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded text-red-300 text-sm">
            Falha ao exportar CSV: {erroExport}
          </div>
        )}

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300">
            <div className="font-semibold">Acesso negado / falha</div>
            <div className="text-sm">{erro}</div>
            <div className="text-xs text-red-400/80 mt-1">
              Esta tela exige perfil <code>platform_owner</code> e 2FA recente
              (&lt;8h).
            </div>
          </div>
        )}

        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded">
              <div className="text-xs text-zinc-500 uppercase">Total avisos</div>
              <div className="text-2xl font-bold text-zinc-100 mt-1" data-testid="kpi-total-avisos">
                {kpi.total_avisos}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                ultimos {kpi.dias_janela} dias
              </div>
            </div>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded">
              <div className="text-xs text-emerald-400 uppercase">Renovados</div>
              <div className="text-2xl font-bold text-emerald-300 mt-1" data-testid="kpi-renovados">
                {kpi.total_renovados}
              </div>
            </div>
            <div className="p-4 bg-red-500/5 border border-red-500/30 rounded">
              <div className="text-xs text-red-400 uppercase">Expiraram</div>
              <div className="text-2xl font-bold text-red-300 mt-1" data-testid="kpi-expirados">
                {kpi.total_expirados}
              </div>
            </div>
            <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded">
              <div className="text-xs text-amber-400 uppercase">Em andamento</div>
              <div className="text-2xl font-bold text-amber-300 mt-1" data-testid="kpi-em-andamento">
                {kpi.total_em_andamento}
              </div>
            </div>
            <div className="p-4 bg-sky-500/5 border border-sky-500/30 rounded">
              <div className="text-xs text-sky-400 uppercase">% que renovou</div>
              <div className="text-2xl font-bold text-sky-300 mt-1" data-testid="kpi-percentual-renovacao">
                {kpi.percentual_renovacao == null
                  ? "—"
                  : `${kpi.percentual_renovacao}%`}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                renovados / (renovados + expirados)
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Aviso enviado</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Login 2FA</th>
                <th className="text-left px-4 py-3">Janela expira</th>
                <th className="text-left px-4 py-3">Canais</th>
                <th className="text-left px-4 py-3">Renovou em</th>
                <th className="text-left px-4 py-3">Status</th>
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
              {!loading && avisos.length === 0 && !erro && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum aviso registrado nos ultimos {dias} dias.
                  </td>
                </tr>
              )}
              {!loading &&
                avisos.map((a) => {
                  const badge = STATUS_BADGE[a.status];
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-zinc-800/50 hover:bg-zinc-800/20"
                      data-testid={`row-aviso-${a.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatarData(a.aviso_em)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-200">
                          {a.usuario_nome ?? `#${a.usuario_id}`}
                        </div>
                        {a.usuario_email && (
                          <div className="text-xs text-zinc-500">
                            {a.usuario_email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {formatarData(a.ultimo_login_2fa_em)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {formatarData(a.expira_em)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            title="Email"
                            className={
                              a.canal_email_ok
                                ? "text-emerald-400"
                                : "text-zinc-600"
                            }
                          >
                            <Mail size={14} />
                          </span>
                          <span
                            title="WhatsApp"
                            className={
                              a.canal_whatsapp_ok
                                ? "text-emerald-400"
                                : "text-zinc-600"
                            }
                          >
                            <MessageSquare size={14} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatarSegundos(a.renovado_em_segundos_apos_aviso)}
                        {a.renovado_em && (
                          <div className="text-xs text-zinc-500 font-mono">
                            apos aviso
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 border rounded text-xs ${badge.cls}`}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
