// PAWARDS MEDCORE · Task #52 · /assinaturas/alertas-ceo
// Fila historica dos alertas proativos disparados pelo worker
// `alertaAssinaturasCEO` (Wave 10.6). Master-only no backend (guardMaster).
//
// Mesma estetica navy/gold das telas Wave 10 F5 (timeline + detalhe).
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  RefreshCw,
  Mail,
  MessageSquare,
  ShieldCheck,
  Undo2,
} from "lucide-react";

const UNDO_JANELA_MS = 8000;

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const AMBER = "#d97706";
const GREEN = "#16a34a";
const BLUE = "#2563eb";
const ZINC = "#71717a";

type Cor = "excelente" | "bom" | "atencao" | "critico" | null;

type Alerta = {
  id: number;
  dia_brt: string;
  metrica: string;
  cor_anterior: Cor;
  cor_atual: Cor;
  variacao_pct: number | null;
  conversao_pp: number | null;
  totais_atual: Record<string, unknown> | null;
  totais_prev: Record<string, unknown> | null;
  notif_email_id: number | null;
  notif_wpp_id: number | null;
  visualizado_em: string | null;
  criado_em: string;
};

const COR_HEX: Record<NonNullable<Cor>, string> = {
  excelente: "#16a34a",
  bom: "#2563eb",
  atencao: "#d97706",
  critico: "#dc2626",
};

const METRICA_LABEL: Record<string, string> = {
  rejeitadas_24h: "Rejeições em 24h",
  conversao_7d: "Conversão 7 dias",
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

function formatarDia(iso: string): string {
  // dia_brt vem como "YYYY-MM-DD"
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y?.slice(2)}`;
}

function CorBadge({ cor, label }: { cor: Cor; label: string }) {
  const hex = cor ? COR_HEX[cor] : ZINC;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${hex}1A`, color: hex }}
    >
      {label}: {cor ?? "—"}
    </span>
  );
}

function IconeMetrica({ metrica }: { metrica: string }) {
  if (metrica === "rejeitadas_24h") return <Flame size={16} style={{ color: RED }} />;
  if (metrica === "conversao_7d") return <AlertTriangle size={16} style={{ color: AMBER }} />;
  return <Bell size={16} style={{ color: ZINC }} />;
}

type Filtro = "todos" | "pendentes" | "vistos";

function lerFiltroDaURL(): Filtro {
  if (typeof window === "undefined") return "todos";
  const v = new URLSearchParams(window.location.search).get("filtro");
  if (v === "pendentes" || v === "vistos") return v;
  return "todos";
}

export default function AssinaturasAlertasCEO() {
  const [rows, setRows] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [marcandoTodos, setMarcandoTodos] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [filtro, setFiltro] = useState<Filtro>(lerFiltroDaURL);
  const [undoToast, setUndoToast] = useState<{ ids: number[]; expiraEm: number } | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  // Auto-fechar o toast de undo quando a janela expira (8s).
  useEffect(() => {
    if (!undoToast) return;
    const restante = undoToast.expiraEm - Date.now();
    if (restante <= 0) { setUndoToast(null); return; }
    const t = setTimeout(() => setUndoToast(null), restante);
    return () => clearTimeout(t);
  }, [undoToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (filtro === "todos") {
      url.searchParams.delete("filtro");
    } else {
      url.searchParams.set("filtro", filtro);
    }
    window.history.replaceState({}, "", url.toString());
  }, [filtro]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/assinaturas/alertas-ceo?limit=200", {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRows(data.alertas || []);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const marcarVisto = async (id: number) => {
    setMarcando(id);
    try {
      const r = await fetch(`/api/assinaturas/alertas-ceo/${id}/visualizar`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const agora = new Date().toISOString();
      setRows((prev) =>
        prev.map((a) => (a.id === id ? { ...a, visualizado_em: a.visualizado_em ?? agora } : a)),
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setMarcando(null);
    }
  };

  const marcarTodosVistos = async () => {
    setMarcandoTodos(true);
    setErro(null);
    try {
      const r = await fetch("/api/assinaturas/alertas-ceo/marcar-todos-vistos", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json().catch(() => ({} as { ids?: number[] }));
      const ids: number[] = Array.isArray(data?.ids)
        ? data.ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      const agora = new Date().toISOString();
      // Atualizacao otimista: marca tudo que estava pendente como visto agora.
      setRows((prev) =>
        prev.map((a) => (a.visualizado_em ? a : { ...a, visualizado_em: agora })),
      );
      // Sinaliza pra outras telas (painel CEO) atualizarem o badge na hora,
      // sem esperar o tick de polling de 60s. localStorage event dispara em
      // outras abas; CustomEvent cobre a mesma aba.
      try {
        localStorage.setItem("alertas_ceo_marcados_em", agora);
        window.dispatchEvent(new CustomEvent("alertas_ceo_marcados", { detail: { quando: agora } }));
      } catch { /* silencioso */ }
      // Task #69: oferece undo durante 8s.
      if (ids.length > 0) {
        setUndoToast({ ids, expiraEm: Date.now() + UNDO_JANELA_MS });
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setMarcandoTodos(false);
    }
  };

  const desfazerMarcarTodos = async () => {
    if (!undoToast || desfazendo) return;
    const ids = undoToast.ids;
    setDesfazendo(true);
    try {
      const r = await fetch("/api/assinaturas/alertas-ceo/desfazer-vistos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Reverte estado local: zera visualizado_em dos ids revertidos.
      const setIds = new Set(ids);
      setRows((prev) =>
        prev.map((a) => (setIds.has(a.id) ? { ...a, visualizado_em: null } : a)),
      );
      // Notifica painel CEO/badge pra recontar.
      try {
        const agora = new Date().toISOString();
        localStorage.setItem("alertas_ceo_marcados_em", agora);
        window.dispatchEvent(new CustomEvent("alertas_ceo_marcados", { detail: { quando: agora } }));
      } catch { /* silencioso */ }
      setUndoToast(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setDesfazendo(false);
    }
  };

  const totalNaoVistos = rows.filter((a) => !a.visualizado_em).length;
  const totalVistos = rows.length - totalNaoVistos;
  const totalCriticos = rows.filter((a) => a.cor_atual === "critico").length;
  const totalAtencao = rows.filter((a) => a.cor_atual === "atencao").length;

  const rowsFiltradas = rows.filter((a) => {
    if (filtro === "pendentes") return !a.visualizado_em;
    if (filtro === "vistos") return !!a.visualizado_em;
    return true;
  });

  const ABAS: { id: Filtro; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: rows.length },
    { id: "pendentes", label: "Pendentes", count: totalNaoVistos },
    { id: "vistos", label: "Vistos", count: totalVistos },
  ];

  return (
    <Layout>
      {/* Task #69: toast de undo (8s) apos marcar todos como vistos */}
      {undoToast && (
        <div
          className="nao-imprimir fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
          style={{ background: NAVY, color: "#F9FAFB", border: `1px solid ${GOLD}` }}
          data-testid="toast-undo-marcar-todos"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={16} style={{ color: GOLD }} />
          <span className="text-sm">
            {undoToast.ids.length} alerta{undoToast.ids.length === 1 ? "" : "s"} marcado{undoToast.ids.length === 1 ? "" : "s"} como visto{undoToast.ids.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={desfazerMarcarTodos}
            disabled={desfazendo}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition disabled:opacity-60"
            style={{ background: GOLD, color: NAVY }}
            data-testid="botao-desfazer-marcar-todos"
            title="Reverter: alertas voltam a ficar pendentes"
          >
            <Undo2 size={12} />
            {desfazendo ? "Desfazendo..." : "Desfazer"}
          </button>
        </div>
      )}
      <div data-pdf-titulo="Fila de Alertas do CEO" className="p-6 space-y-6">
        {/* Header */}
        <div
          className="rounded-lg p-5 flex items-start justify-between"
          style={{ background: NAVY, color: "#F9FAFB" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={20} style={{ color: GOLD }} />
              <h1 className="text-xl font-bold tracking-tight">
                Alertas do CEO — Assinaturas
              </h1>
            </div>
            <p className="text-sm opacity-80">
              Wave 10.6 · histórico dos alertas proativos disparados por e-mail
              e WhatsApp quando rejeições ou conversão de assinaturas mudam de
              patamar.
            </p>
          </div>
          <div className="nao-imprimir flex items-center gap-2">
            {totalNaoVistos >= 2 && (
              <button
                onClick={marcarTodosVistos}
                disabled={marcandoTodos || loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition disabled:opacity-60"
                style={{ background: "white", color: NAVY, border: `1px solid ${GOLD}` }}
                data-testid="botao-marcar-todos-vistos"
                title="Marca como visualizados todos os alertas pendentes"
              >
                <CheckCircle2 size={14} />
                {marcandoTodos
                  ? "Marcando..."
                  : `Marcar todos como vistos (${totalNaoVistos})`}
              </button>
            )}
            <button
              onClick={carregar}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
              style={{ background: GOLD, color: NAVY }}
              disabled={loading}
              data-testid="botao-atualizar-alertas"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Total registrado
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: NAVY }}>
              {rows.length}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Não visualizados
            </div>
            <div
              className="text-2xl font-bold mt-1"
              style={{ color: totalNaoVistos > 0 ? AMBER : ZINC }}
              data-testid="resumo-nao-visualizados"
            >
              {totalNaoVistos}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Cor atual: crítico
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: RED }}>
              {totalCriticos}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Cor atual: atenção
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: AMBER }}>
              {totalAtencao}
            </div>
          </div>
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

        {/* Abas de filtro por status */}
        {rows.length > 0 && (
          <div
            className="nao-imprimir flex items-center gap-1 border-b"
            data-testid="abas-filtro-status"
            role="tablist"
          >
            {ABAS.map((aba) => {
              const ativa = filtro === aba.id;
              return (
                <button
                  key={aba.id}
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => setFiltro(aba.id)}
                  data-testid={`aba-filtro-${aba.id}`}
                  className="px-4 py-2 text-sm font-semibold transition border-b-2 -mb-px"
                  style={{
                    color: ativa ? NAVY : ZINC,
                    borderColor: ativa ? GOLD : "transparent",
                  }}
                >
                  {aba.label}
                  <span
                    className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: ativa ? GOLD : "#F4F4F5",
                      color: ativa ? NAVY : ZINC,
                    }}
                  >
                    {aba.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!erro && !loading && rows.length === 0 && (
          <div
            className="rounded p-6 text-center text-sm"
            style={{ background: "#F4F4F5", color: ZINC }}
            data-testid="vazio-alertas"
          >
            Nenhum alerta disparado ainda. Tudo dentro do esperado.
          </div>
        )}

        {!erro && !loading && rows.length > 0 && rowsFiltradas.length === 0 && (
          <div
            className="rounded p-6 text-center text-sm"
            style={{ background: "#F4F4F5", color: ZINC }}
            data-testid="vazio-filtro"
          >
            {filtro === "pendentes"
              ? "Nenhum alerta pendente. Tudo já foi revisado."
              : "Nenhum alerta visualizado ainda nessa janela."}
          </div>
        )}

        {/* Lista cronológica */}
        {rowsFiltradas.length > 0 && (
          <div className="space-y-2" data-testid="lista-alertas">
            {rowsFiltradas.map((a) => {
              const naoVisto = !a.visualizado_em;
              const corAtualHex = a.cor_atual ? COR_HEX[a.cor_atual] : ZINC;
              return (
                <div
                  key={a.id}
                  className="bg-white border rounded p-4 flex items-start gap-4"
                  style={{
                    borderLeft: `4px solid ${corAtualHex}`,
                    background: naoVisto ? "#FFFBEB" : "white",
                  }}
                  data-testid={`alerta-${a.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <IconeMetrica metrica={a.metrica} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>
                        {METRICA_LABEL[a.metrica] ?? a.metrica}
                      </span>
                      <span className="text-xs font-mono" style={{ color: ZINC }}>
                        #{a.id}
                      </span>
                      {naoVisto && (
                        <span
                          className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                          style={{ background: AMBER, color: "white" }}
                        >
                          NOVO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <CorBadge cor={a.cor_anterior} label="antes" />
                      <span style={{ color: ZINC }}>→</span>
                      <CorBadge cor={a.cor_atual} label="agora" />
                      {a.variacao_pct !== null && (
                        <span
                          className="px-2 py-0.5 rounded-full font-mono font-semibold"
                          style={{
                            background: "#F4F4F5",
                            color: a.variacao_pct > 0 ? RED : GREEN,
                          }}
                        >
                          {a.variacao_pct > 0 ? "+" : ""}
                          {a.variacao_pct.toFixed(1)}%
                        </span>
                      )}
                      {a.conversao_pp !== null && (
                        <span
                          className="px-2 py-0.5 rounded-full font-mono font-semibold"
                          style={{
                            background: "#F4F4F5",
                            color: a.conversao_pp < 0 ? RED : GREEN,
                          }}
                        >
                          {a.conversao_pp > 0 ? "+" : ""}
                          {a.conversao_pp.toFixed(1)}pp
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: ZINC }}>
                      <span>
                        Dia: <strong>{formatarDia(a.dia_brt)}</strong>
                      </span>
                      <span>Disparado em: {formatarData(a.criado_em)}</span>
                      {a.notif_email_id ? (
                        <span className="inline-flex items-center gap-1" style={{ color: BLUE }}>
                          <Mail size={11} /> e-mail enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1" style={{ color: ZINC }}>
                          <Mail size={11} /> e-mail não enviado
                        </span>
                      )}
                      {a.notif_wpp_id ? (
                        <span className="inline-flex items-center gap-1" style={{ color: GREEN }}>
                          <MessageSquare size={11} /> WhatsApp enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1" style={{ color: ZINC }}>
                          <MessageSquare size={11} /> WhatsApp não enviado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2 nao-imprimir">
                    {naoVisto ? (
                      <button
                        onClick={() => marcarVisto(a.id)}
                        disabled={marcando === a.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded border transition disabled:opacity-60"
                        style={{ borderColor: GOLD, color: NAVY, background: "white" }}
                        data-testid={`marcar-visto-${a.id}`}
                      >
                        {marcando === a.id ? "Marcando..." : "Marcar como visto"}
                      </button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ background: "#DCFCE7", color: GREEN }}
                        title={`Visto em ${formatarData(a.visualizado_em)}`}
                      >
                        <CheckCircle2 size={12} /> visto
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ultimaAtualizacao && (
          <div className="text-xs text-right flex items-center justify-end gap-1" style={{ color: ZINC }}>
            <ShieldCheck size={11} />
            Atualizado em {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
          </div>
        )}
      </div>
    </Layout>
  );
}
