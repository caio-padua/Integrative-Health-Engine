// PAWARDS MEDCORE · Wave 10 F5 · /assinaturas/timeline
// Lista as últimas 50 solicitações de assinatura digital (PARQ + TCLE + Orçamento).
// Master-only no router; backend filtra via cookie pawards.auth.token.
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const BLUE = "#2563eb";
const ZINC = "#71717a";

type Solicitacao = {
  id: number;
  status: string;
  provedor_codigo: string;
  provedor_envelope_id: string | null;
  zapsign_external_id: string | null;
  criado_em: string;
  enviado_em: string | null;
  concluido_em: string | null;
  expira_em: string | null;
  template_codigo: string;
  template_nome: string;
  template_tipo: string;
  paciente_id: number | null;
  paciente_nome: string | null;
  paciente_unidade_id: number | null;
  paciente_unidade_nome: string | null;
  signatarios_total: number;
  signatarios_assinados: number;
  auditoria_eventos: number;
};

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; fg: string; icon: any }
> = {
  RASCUNHO: { label: "RASCUNHO", bg: "#F4F4F5", fg: ZINC, icon: Clock },
  ENVIADO: { label: "ENVIADO", bg: "#DBEAFE", fg: BLUE, icon: FileSignature },
  PARCIAL: { label: "PARCIAL", bg: "#FEF9E7", fg: AMBER, icon: AlertTriangle },
  CONCLUIDO: { label: "CONCLUÍDO", bg: "#DCFCE7", fg: GREEN, icon: CheckCircle2 },
  REJEITADO: { label: "REJEITADO", bg: "#FEE2E2", fg: RED, icon: XCircle },
  EXPIRADO: { label: "EXPIRADO", bg: "#F4F4F5", fg: ZINC, icon: XCircle },
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGES[status] || {
    label: status,
    bg: "#F4F4F5",
    fg: ZINC,
    icon: AlertTriangle,
  };
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

export default function AssinaturasTimeline() {
  const [rows, setRows] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  // Task #51 — leitura do filtro `?unidade_id=` na URL pra abrir a timeline
  // ja escopada numa clinica especifica (clique vindo do banner CEO).
  // Usamos window.location direto pra nao depender de hook de router.
  const filtroUnidadeId = (() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("unidade_id");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  // Task #55 — chips de filtro por status no topo da tabela. Cada chip mapeia
  // pra 1+ status crus (ex.: "Em andamento" agrupa ENVIADO+PARCIAL, "Rejeitada"
  // agrupa REJEITADO+EXPIRADO) — bate com a leitura humana dos cards de resumo.
  // Estado local (nao na URL) pra nao poluir links compartilhados; o filtro de
  // unidade ja vem na URL via banner CEO.
  type FiltroStatus = "TODOS" | "EM_ANDAMENTO" | "CONCLUIDO" | "REJEITADO";
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("TODOS");
  const STATUS_QUERY: Record<FiltroStatus, string[]> = {
    TODOS: [],
    EM_ANDAMENTO: ["ENVIADO", "PARCIAL"],
    CONCLUIDO: ["CONCLUIDO"],
    REJEITADO: ["REJEITADO", "EXPIRADO"],
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
      const statusList = STATUS_QUERY[filtroStatus];
      if (statusList.length > 0) params.set("status", statusList.join(","));
      const qs = params.toString() ? `?${params.toString()}` : "";
      const r = await fetch(`/api/assinaturas/timeline${qs}`, {
        credentials: "include",
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      setRows(data.solicitacoes || []);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidadeId, filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totais = {
    enviado: rows.filter((r) => r.status === "ENVIADO" || r.status === "PARCIAL").length,
    concluido: rows.filter((r) => r.status === "CONCLUIDO").length,
    rejeitado: rows.filter((r) => r.status === "REJEITADO" || r.status === "EXPIRADO").length,
  };

  return (
    <Layout>
      <div
        data-pdf-titulo="Timeline de Assinaturas Digitais"
        className="p-6 space-y-6"
      >
        {/* Header */}
        <div
          className="rounded-lg p-5 flex items-start justify-between"
          style={{ background: NAVY, color: "#F9FAFB" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={20} style={{ color: GOLD }} />
              <h1 className="text-xl font-bold tracking-tight">
                Assinaturas Digitais — Timeline
              </h1>
            </div>
            <p className="text-sm opacity-80">
              Wave 10 ZapSign + ICP-Brasil · últimas 50 solicitações ·
              defensibilidade jurídica CFM 2.386/2024 + CC 593-609 + LGPD art. 11 §4º
            </p>
            {filtroUnidadeId !== null && (
              <div
                className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold"
                style={{ background: GOLD, color: NAVY }}
                data-testid="filtro-unidade-ativo"
              >
                Filtrado por unidade #{filtroUnidadeId}
                <a
                  href="/assinaturas/timeline"
                  className="underline opacity-80 hover:opacity-100"
                  style={{ color: NAVY }}
                >
                  limpar
                </a>
              </div>
            )}
          </div>
          <button
            onClick={carregar}
            className="nao-imprimir flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
            style={{ background: GOLD, color: NAVY }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Total em janela
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: NAVY }}>
              {rows.length}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Em andamento
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: BLUE }}>
              {totais.enviado}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Concluídas
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: GREEN }}>
              {totais.concluido}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Rejeitadas/Expiradas
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: RED }}>
              {totais.rejeitado}
            </div>
          </div>
        </div>

        {/* Task #55 — chips de filtro por status */}
        <div className="nao-imprimir flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
            Filtrar por status:
          </span>
          {([
            { key: "TODOS", label: "Todos", cor: NAVY },
            { key: "EM_ANDAMENTO", label: "Em andamento", cor: BLUE },
            { key: "CONCLUIDO", label: "Concluídas", cor: GREEN },
            { key: "REJEITADO", label: "Rejeitadas/Expiradas", cor: RED },
          ] as { key: FiltroStatus; label: string; cor: string }[]).map((opt) => {
            const ativo = filtroStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFiltroStatus(opt.key)}
                data-testid={`filtro-status-${opt.key.toLowerCase()}`}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{
                  background: ativo ? opt.cor : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : opt.cor,
                  borderColor: opt.cor,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Erros / vazio */}
        {erro && (
          <div
            className="rounded p-3 text-sm"
            style={{ background: "#FEE2E2", color: RED }}
          >
            <strong>Erro:</strong> {erro}. Verifique se sua sessão é{" "}
            <code>validador_mestre</code> ou admin.
          </div>
        )}

        {!erro && !loading && rows.length === 0 && (
          <div
            className="rounded p-6 text-center text-sm"
            style={{ background: "#F4F4F5", color: ZINC }}
          >
            Nenhuma solicitação registrada ainda. Aguardando primeiro disparo
            ZapSign.
          </div>
        )}

        {/* Tabela */}
        {rows.length > 0 && (
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#F9FAFB", color: NAVY }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">#</th>
                  <th className="text-left px-3 py-2 font-semibold">Template</th>
                  <th className="text-left px-3 py-2 font-semibold">Paciente</th>
                  {filtroUnidadeId === null && (
                    <th className="text-left px-3 py-2 font-semibold">Clínica</th>
                  )}
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                  <th className="text-center px-3 py-2 font-semibold">Signatários</th>
                  <th className="text-center px-3 py-2 font-semibold">Auditoria</th>
                  <th className="text-left px-3 py-2 font-semibold">Criado</th>
                  <th className="text-left px-3 py-2 font-semibold">Concluído</th>
                  <th className="text-center px-3 py-2 font-semibold nao-imprimir">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-zinc-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold" style={{ color: NAVY }}>
                        {r.template_codigo}
                      </div>
                      <div className="text-xs" style={{ color: ZINC }}>
                        {r.template_nome}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.paciente_nome ? (
                        <span>{r.paciente_nome}</span>
                      ) : (
                        <span className="italic text-zinc-400">— sem vínculo —</span>
                      )}
                    </td>
                    {filtroUnidadeId === null && (
                      <td className="px-3 py-2 text-xs" style={{ color: NAVY }}>
                        {r.paciente_unidade_nome ? (
                          <span>{r.paciente_unidade_nome}</span>
                        ) : (
                          <span className="italic text-zinc-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-xs">
                      <span style={{ color: GREEN, fontWeight: 700 }}>
                        {r.signatarios_assinados}
                      </span>
                      <span style={{ color: ZINC }}> / {r.signatarios_total}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-xs">
                      {r.auditoria_eventos > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: "#FEF3E8", color: GOLD }}
                          title="Manifesto SHA-256 gravado"
                        >
                          <ShieldCheck size={10} />
                          {r.auditoria_eventos}
                        </span>
                      ) : (
                        <span style={{ color: ZINC }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: ZINC }}>
                      {formatarData(r.criado_em)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: ZINC }}>
                      {formatarData(r.concluido_em)}
                    </td>
                    <td className="px-3 py-2 text-center nao-imprimir">
                      <Link
                        href={`/assinaturas/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: BLUE }}
                      >
                        Abrir <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ultimaAtualizacao && (
          <div className="text-xs text-right" style={{ color: ZINC }}>
            Atualizado em {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
          </div>
        )}
      </div>
    </Layout>
  );
}
