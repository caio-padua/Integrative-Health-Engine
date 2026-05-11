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
  Download,
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

// Task #73 — paginacao explicita. Pagina de 50 mantem o comportamento original
// e bate com o LIMIT default do backend; "Carregar mais" appendiza paginas
// adicionais sem perder filtros (paciente nao perde scroll).
const LIMITE_PAGINA = 50;

export default function AssinaturasTimeline() {
  const [rows, setRows] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [totalReal, setTotalReal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

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
  // Task #59 — persistir o chip ativo na URL via `?status=` (em_andamento|
  // concluido|rejeitado) pra deixar o link compartilhavel ja filtrado. "Todos"
  // remove o param. Co-existe com `?unidade_id=` (Task #51).
  type FiltroStatus = "TODOS" | "EM_ANDAMENTO" | "CONCLUIDO" | "REJEITADO";
  const STATUS_QUERY: Record<FiltroStatus, string[]> = {
    TODOS: [],
    EM_ANDAMENTO: ["ENVIADO", "PARCIAL"],
    CONCLUIDO: ["CONCLUIDO"],
    REJEITADO: ["REJEITADO", "EXPIRADO"],
  };
  const STATUS_URL: Record<FiltroStatus, string> = {
    TODOS: "",
    EM_ANDAMENTO: "em_andamento",
    CONCLUIDO: "concluido",
    REJEITADO: "rejeitado",
  };
  function parseStatusFromUrl(): FiltroStatus {
    if (typeof window === "undefined") return "TODOS";
    const v = (new URLSearchParams(window.location.search).get("status") || "")
      .toLowerCase();
    if (v === "em_andamento") return "EM_ANDAMENTO";
    if (v === "concluido") return "CONCLUIDO";
    if (v === "rejeitado") return "REJEITADO";
    return "TODOS";
  }
  const [filtroStatus, setFiltroStatusState] = useState<FiltroStatus>(parseStatusFromUrl);
  const setFiltroStatus = useCallback((novo: FiltroStatus) => {
    setFiltroStatusState(novo);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const valor = STATUS_URL[novo];
    if (valor) url.searchParams.set("status", valor);
    else url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Task #64 — filtro por intervalo de datas (criado_em). Persistido na URL
  // via `?desde=YYYY-MM-DD&ate=YYYY-MM-DD` pra link compartilhavel. Chips
  // rapidos: Hoje, 7 dias, 30 dias. "Personalizado" libera os 2 inputs de
  // data; "Tudo" limpa o recorte. O calculo de janela e feito no fuso local
  // do navegador (Caio opera em Sao Paulo) — backend trata como `::date`.
  type FiltroData = "TUDO" | "HOJE" | "7D" | "30D" | "PERSONALIZADO";
  function isoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function parseDatasFromUrl(): { desde: string; ate: string } {
    if (typeof window === "undefined") return { desde: "", ate: "" };
    const sp = new URLSearchParams(window.location.search);
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const desde = sp.get("desde") || "";
    const ate = sp.get("ate") || "";
    return {
      desde: re.test(desde) ? desde : "",
      ate: re.test(ate) ? ate : "",
    };
  }
  function detectarPresetInicial(desde: string, ate: string): FiltroData {
    if (!desde && !ate) return "TUDO";
    const hoje = isoLocal(new Date());
    if (desde === hoje && ate === hoje) return "HOJE";
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    if (desde === isoLocal(d7) && ate === hoje) return "7D";
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    if (desde === isoLocal(d30) && ate === hoje) return "30D";
    return "PERSONALIZADO";
  }
  const datasUrlInicial = parseDatasFromUrl();
  const [filtroData, setFiltroDataState] = useState<FiltroData>(
    detectarPresetInicial(datasUrlInicial.desde, datasUrlInicial.ate),
  );
  const [desdeInput, setDesdeInput] = useState<string>(datasUrlInicial.desde);
  const [ateInput, setAteInput] = useState<string>(datasUrlInicial.ate);

  const sincronizarDatasUrl = useCallback((desde: string, ate: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (desde) url.searchParams.set("desde", desde);
    else url.searchParams.delete("desde");
    if (ate) url.searchParams.set("ate", ate);
    else url.searchParams.delete("ate");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const aplicarPresetData = useCallback((preset: FiltroData) => {
    setFiltroDataState(preset);
    const hoje = isoLocal(new Date());
    let desde = "", ate = "";
    if (preset === "HOJE") { desde = hoje; ate = hoje; }
    else if (preset === "7D") {
      const d = new Date(); d.setDate(d.getDate() - 6);
      desde = isoLocal(d); ate = hoje;
    } else if (preset === "30D") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      desde = isoLocal(d); ate = hoje;
    } else if (preset === "PERSONALIZADO") {
      // mantem o que estiver nos inputs (pode ser vazio — usuario preenche)
      desde = desdeInput;
      ate = ateInput;
    }
    setDesdeInput(desde);
    setAteInput(ate);
    sincronizarDatasUrl(desde, ate);
  }, [desdeInput, ateInput, sincronizarDatasUrl]);

  const aplicarPersonalizado = useCallback((novoDesde: string, novoAte: string) => {
    setFiltroDataState("PERSONALIZADO");
    setDesdeInput(novoDesde);
    setAteInput(novoAte);
    sincronizarDatasUrl(novoDesde, novoAte);
  }, [sincronizarDatasUrl]);

  // Task #73 — `carregar({ append })`: append=false reseta a tabela (1a pagina);
  // append=true appendiza usando offset = rows.length pra paginar sem perder
  // os registros ja exibidos. Filtros entram nos 2 modos pra a contagem
  // server-side (`total`) bater com a query da UI.
  const carregar = useCallback(async (opts?: { append?: boolean }) => {
    const append = opts?.append === true;
    if (append) setCarregandoMais(true);
    else setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
      const statusList = STATUS_QUERY[filtroStatus];
      if (statusList.length > 0) params.set("status", statusList.join(","));
      if (desdeInput) params.set("desde", desdeInput);
      if (ateInput) params.set("ate", ateInput);
      params.set("limit", String(LIMITE_PAGINA));
      const offset = append ? rows.length : 0;
      params.set("offset", String(offset));
      const qs = `?${params.toString()}`;
      const r = await fetch(`/api/assinaturas/timeline${qs}`, {
        credentials: "include",
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      const novos: Solicitacao[] = data.solicitacoes || [];
      if (append) {
        // De-dup defensivo por id pra cobrir caso de novas linhas inseridas
        // entre a pagina 1 e a pagina 2 (deslocariam o offset e duplicariam
        // a borda). Mantem ordem do servidor (ORDER BY id DESC).
        setRows((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...novos.filter((n) => !ids.has(n.id))];
        });
      } else {
        setRows(novos);
      }
      setTotalReal(Number(data.total ?? novos.length));
      setHasMore(Boolean(data.has_more));
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
      setCarregandoMais(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidadeId, filtroStatus, desdeInput, ateInput, rows.length]);

  // Recarrega 1a pagina sempre que qualquer filtro muda. Nao depende de
  // `carregar` direto pra evitar loop com `rows.length` na dep list.
  useEffect(() => {
    void carregar({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidadeId, filtroStatus, desdeInput, ateInput]);

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
          <div className="nao-imprimir flex items-center gap-2">
            {/* Task #60 — baixar CSV respeitando os mesmos filtros (unidade + status).
                Task #66 — inclui tambem desde/ate pra exportar exatamente o recorte da tela.
                Task #65 — botao paralelo XLSX (Excel) com datas tipadas + header em negrito.
                Task #73 — Atualizar agora recarrega a 1a pagina (append:false). */}
            {(() => {
              const params = new URLSearchParams();
              if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
              const statusList = STATUS_QUERY[filtroStatus];
              if (statusList.length > 0) params.set("status", statusList.join(","));
              if (desdeInput) params.set("desde", desdeInput);
              if (ateInput) params.set("ate", ateInput);
              const qs = params.toString() ? `?${params.toString()}` : "";
              return (
                <>
                  <a
                    href={`/api/assinaturas/timeline.csv${qs}`}
                    data-testid="botao-baixar-csv"
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                    style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
                  >
                    <Download size={14} />
                    Baixar CSV
                  </a>
                  <a
                    href={`/api/assinaturas/timeline.xlsx${qs}`}
                    data-testid="botao-baixar-xlsx"
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                    style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
                  >
                    <Download size={14} />
                    Baixar XLSX
                  </a>
                </>
              );
            })()}
            <button
              onClick={() => carregar({ append: false })}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
              style={{ background: GOLD, color: NAVY }}
              disabled={loading}
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
              Total em janela
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: NAVY }}>
              {totalReal}
            </div>
            {totalReal > rows.length && (
              <div className="text-[11px] mt-1" style={{ color: ZINC }}>
                exibindo {rows.length}
              </div>
            )}
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

        {/* Task #64 — chips de filtro por intervalo de datas (criado_em) */}
        <div className="nao-imprimir flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
            Filtrar por período:
          </span>
          {([
            { key: "TUDO", label: "Tudo" },
            { key: "HOJE", label: "Hoje" },
            { key: "7D", label: "7 dias" },
            { key: "30D", label: "30 dias" },
            { key: "PERSONALIZADO", label: "Personalizado" },
          ] as { key: FiltroData; label: string }[]).map((opt) => {
            const ativo = filtroData === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => aplicarPresetData(opt.key)}
                data-testid={`filtro-data-${opt.key.toLowerCase()}`}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{
                  background: ativo ? NAVY : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : NAVY,
                  borderColor: NAVY,
                }}
              >
                {opt.label}
              </button>
            );
          })}
          {filtroData === "PERSONALIZADO" && (
            <span className="inline-flex items-center gap-2 ml-2">
              <label className="text-xs" style={{ color: ZINC }}>De</label>
              <input
                type="date"
                value={desdeInput}
                onChange={(e) => aplicarPersonalizado(e.target.value, ateInput)}
                data-testid="filtro-data-desde"
                className="border rounded px-2 py-1 text-xs"
                style={{ borderColor: NAVY, color: NAVY }}
              />
              <label className="text-xs" style={{ color: ZINC }}>até</label>
              <input
                type="date"
                value={ateInput}
                onChange={(e) => aplicarPersonalizado(desdeInput, e.target.value)}
                data-testid="filtro-data-ate"
                className="border rounded px-2 py-1 text-xs"
                style={{ borderColor: NAVY, color: NAVY }}
              />
            </span>
          )}
          {(desdeInput || ateInput) && filtroData !== "PERSONALIZADO" && (
            <span className="text-xs" style={{ color: ZINC }}>
              {desdeInput || "—"} → {ateInput || "—"}
            </span>
          )}
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

        {/* Task #73 — banner de paginacao + botao "Carregar mais".
            Aparece quando o backend sinaliza has_more=true (geralmente filtros
            largos como "30 dias" em fase movimentada). Sem isso, o LIMIT
            silencioso esconde resultados e o Caio nao percebe. */}
        {rows.length > 0 && hasMore && (
          <div
            className="nao-imprimir flex items-center justify-between gap-3 rounded p-3 text-sm border"
            style={{ background: "#FEF9E7", borderColor: GOLD, color: NAVY }}
            data-testid="banner-paginacao"
          >
            <div>
              Mostrando <strong>{rows.length}</strong> de{" "}
              <strong>{totalReal}</strong> assinaturas. Refine os filtros (data,
              status ou unidade) ou carregue a próxima página.
            </div>
            <button
              type="button"
              onClick={() => carregar({ append: true })}
              disabled={carregandoMais}
              data-testid="btn-carregar-mais"
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-60"
              style={{ background: NAVY, color: "#FFFFFF" }}
            >
              <RefreshCw
                size={12}
                className={carregandoMais ? "animate-spin" : ""}
              />
              {carregandoMais ? "Carregando..." : "Carregar mais 50"}
            </button>
          </div>
        )}

        {rows.length > 0 && !hasMore && totalReal > LIMITE_PAGINA && (
          <div
            className="nao-imprimir text-xs text-center"
            style={{ color: ZINC }}
            data-testid="banner-fim-lista"
          >
            Fim da lista — {totalReal} assinaturas exibidas.
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
