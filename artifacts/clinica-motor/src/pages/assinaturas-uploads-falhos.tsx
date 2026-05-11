// PAWARDS MEDCORE · Wave 10.5 task #49 · /assinaturas/uploads-falhos
// Lista eventos de webhook em que o upload do PDF assinado pro bucket falhou.
// Master-only; backend bloqueia via guardMaster (validador_mestre + estrito).
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Clock,
  XCircle,
  CloudOff,
  ExternalLink,
  PlayCircle,
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
  sol_id: number | null;
  sol_status: string | null;
  paciente_id: number | null;
  paciente_nome: string | null;
  template_codigo: string | null;
  template_nome: string | null;
  status_retry: "em_retry" | "esgotado" | "fora_janela" | "aguardando_webhook";
};

type Resposta = {
  gerado_em: string;
  total: number;
  contagem: {
    em_retry: number;
    esgotado: number;
    fora_janela: number;
    aguardando_webhook: number;
  };
  grupos: {
    em_retry: EventoFalho[];
    esgotado: EventoFalho[];
    fora_janela: EventoFalho[];
    aguardando_webhook: EventoFalho[];
  };
};

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

export default function AssinaturasUploadsFalhos() {
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [retentando, setRetentando] = useState(false);
  const [ultimoRetry, setUltimoRetry] = useState<{
    tentados: number;
    sucesso: number;
    falhou: number;
    bloqueados: number;
  } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/assinaturas/uploads-falhos", {
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
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function retentarAgora() {
    setRetentando(true);
    setErro(null);
    try {
      const r = await fetch("/api/assinaturas/uploads-falhos/retentar", {
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
  };
  const todasLinhas: EventoFalho[] = data
    ? [
        ...data.grupos.esgotado,
        ...data.grupos.em_retry,
        ...data.grupos.aguardando_webhook,
        ...data.grupos.fora_janela,
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
          </div>
          <div className="flex flex-col gap-2 nao-imprimir">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
        {todasLinhas.length > 0 && (
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#F9FAFB", color: NAVY }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">#</th>
                  <th className="text-left px-3 py-2 font-semibold">Recebido</th>
                  <th className="text-left px-3 py-2 font-semibold">Paciente</th>
                  <th className="text-left px-3 py-2 font-semibold">Template</th>
                  <th className="text-left px-3 py-2 font-semibold">Envelope</th>
                  <th className="text-center px-3 py-2 font-semibold">Tentativas</th>
                  <th className="text-left px-3 py-2 font-semibold">Ultima tentativa</th>
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Ultimo erro</th>
                  <th className="text-center px-3 py-2 font-semibold nao-imprimir">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody>
                {todasLinhas.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-zinc-50 align-top">
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
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
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={r.status_retry} />
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
                    </td>
                  </tr>
                ))}
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
    </Layout>
  );
}
