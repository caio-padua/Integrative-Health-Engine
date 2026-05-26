// PAWARDS MEDCORE · Task #70 · /admin/uploads-pdf-resumo
// Historico (30d) dos resumos diarios de uploads de PDF esgotados gravados
// pelo worker `pdfRetryUploadResumoDiario` (task #58). 1 linha por dia BRT.
// Master-only no backend (guardMaster).
//
// O que o Caio ve:
//   - Card de previa de hoje (se ainda nao disparou): "se rodasse agora,
//     iriam X eventos no resumo".
//   - Tabela com data BRT, total de esgotados, badge cor semantica,
//     variacao vs dia anterior, link pra ver os eventos detalhadamente
//     na tela /assinaturas/uploads-falhos.
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import {
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Flame,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const AMBER = "#d97706";
const GREEN = "#16a34a";
const ZINC = "#71717a";
const BLUE = "#2563eb";

// LIMIAR do worker (>= 3 esgotados na janela 24h consolida e dispara). Fonte:
// `pdfRetryUploadResumoDiario.ts` constante `LIMIAR_ESGOTADOS`.
const LIMIAR_DISPATCH = 3;

// Task #393 — detalhe por evento com tempo preso, mesma convencao do
// /api/assinaturas/uploads-falhos (task #247).
type EventoDetalhe = {
  evento_id: number;
  preso_ha_horas: number | null;
  passou_limite_alerta: boolean;
};

type DiaResumo = {
  dia_brt: string;            // YYYY-MM-DD
  total_esgotados: number;
  qtd_eventos: number;
  evento_ids: number[];
  eventos_detalhe?: EventoDetalhe[]; // task #393
  notificado_em: string | null;
  dispatched: boolean;        // false = dia sem dispatch (preenchido pela serie densa)
  variacao_vs_anterior: number;
};

type Resposta = {
  gerado_em: string;
  janela_dias: number;
  dias: DiaResumo[];
  previa_hoje: {
    dia_brt: string;
    ja_disparado: boolean;
    total_esgotados_janela_24h: number;
  };
  aguardando_webhook_limite_horas?: number; // task #393
};

// Task #393 — formata "preso ha Xh" igual ao helper de
// /assinaturas/uploads-falhos (task #247): "12 min", "3h", "2d 4h".
function formatarPresoHa(horas: number | null | undefined): string {
  if (horas == null || !Number.isFinite(horas) || horas < 0) return "—";
  if (horas < 1) {
    const min = Math.max(1, Math.round(horas * 60));
    return `${min} min`;
  }
  if (horas < 24) {
    return `${Math.floor(horas)}h`;
  }
  const dias = Math.floor(horas / 24);
  const restoH = Math.floor(horas - dias * 24);
  return restoH > 0 ? `${dias}d ${restoH}h` : `${dias}d`;
}

type DispararResultado = {
  executou: boolean;
  motivo_skip?:
    | "fora_da_janela"
    | "abaixo_do_limiar"
    | "ja_disparado_hoje"
    | "sem_texto_institucional"
    | "sem_destinatarios";
  total_esgotados: number;
  notificacoes_email: number;
  notificacoes_whatsapp: number;
  dia_brt: string;
};

function descreverSkip(motivo: DispararResultado["motivo_skip"]): string {
  switch (motivo) {
    case "abaixo_do_limiar":
      return "abaixo do limiar (<3 esgotados nas ultimas 24h) — nada a consolidar.";
    case "ja_disparado_hoje":
      return "ja foi disparado hoje (idempotente).";
    case "sem_texto_institucional":
      return "texto institucional UPLOAD_PDF_RESUMO_DIARIO ausente.";
    case "sem_destinatarios":
      return "nenhum validador_mestre ativo pra receber.";
    case "fora_da_janela":
      return "fora da janela horaria (nao deveria acontecer no disparo manual).";
    default:
      return "skip sem motivo declarado.";
  }
}

function corDoTotal(total: number): { bg: string; fg: string; label: string } {
  if (total === 0) return { bg: "#ECFDF5", fg: GREEN, label: "Nenhum esgotado" };
  if (total < LIMIAR_DISPATCH) return { bg: "#FEF9E7", fg: AMBER, label: "Abaixo do limiar" };
  if (total < 10) return { bg: "#FEF3C7", fg: AMBER, label: "Resumo disparado" };
  return { bg: "#FEE2E2", fg: RED, label: "Anomalia (>=10)" };
}

function formatarDia(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y?.slice(2)}`;
}

function formatarHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VariacaoBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: ZINC }}>
        <Minus size={12} /> 0
      </span>
    );
  }
  const cor = delta > 0 ? RED : GREEN;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  const sinal = delta > 0 ? "+" : "";
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color: cor }}
      title={delta > 0 ? "Subiu vs dia anterior" : "Caiu vs dia anterior"}
    >
      <Icon size={12} /> {sinal}{delta}
    </span>
  );
}

export default function AdminUploadsPdfResumo() {
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState<DispararResultado | null>(null);
  const [erroDisparo, setErroDisparo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/admin/uploads-pdf-resumo-diario", {
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

  const dispararAgora = useCallback(async () => {
    const confirmado = window.confirm(
      "Disparar o resumo diario AGORA?\n\n" +
      "Vai consolidar os esgotados das ultimas 24h e enfileirar email/WhatsApp " +
      "pros validador_mestre ativos. Idempotente: rodar de novo no mesmo dia nao " +
      "duplica notificacao.",
    );
    if (!confirmado) return;
    setDisparando(true);
    setErroDisparo(null);
    setResultadoDisparo(null);
    try {
      const r = await apiFetch("/api/admin/uploads-pdf-resumo-diario/disparar", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as DispararResultado;
      setResultadoDisparo(j);
      // Recarrega historico/previa pra refletir o novo dispatch.
      await carregar();
    } catch (e) {
      setErroDisparo((e as Error).message);
    } finally {
      setDisparando(false);
    }
  }, [carregar]);

  const previa = data?.previa_hoje;
  const previaCor = previa ? corDoTotal(previa.total_esgotados_janela_24h) : null;

  return (
    <Layout>
      <div
        data-pdf-titulo="Historico de resumos diarios de uploads de PDF esgotados"
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
                Resumo diario · uploads de PDF esgotados
              </h1>
            </div>
            <p className="text-sm opacity-80">
              Task #70 · historico dos {data?.janela_dias ?? 30} dias do worker{" "}
              <code>pdfRetryUploadResumoDiario</code> (consolida em 1 alerta
              quando &ge; {LIMIAR_DISPATCH} contratos esgotam upload nas 24h).
            </p>
          </div>
          <div className="flex flex-col gap-2 nao-imprimir">
            <button
              onClick={carregar}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
              style={{ background: GOLD, color: NAVY }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <Link
              href="/assinaturas/uploads-falhos"
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
              style={{ background: "#F9FAFB", color: NAVY, borderColor: GOLD }}
            >
              <ExternalLink size={14} /> Ver eventos
            </Link>
          </div>
        </div>

        {/* Previa de hoje */}
        {previa && previaCor && (
          <div
            className="rounded-lg p-4 border"
            style={{
              background: previa.ja_disparado ? "#F9FAFB" : previaCor.bg,
              borderColor: previa.ja_disparado ? "#E4E4E7" : previaCor.fg,
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={18} style={{ color: previa.ja_disparado ? ZINC : previaCor.fg }} className="mt-0.5" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: previa.ja_disparado ? ZINC : previaCor.fg }}>
                  Previa de hoje · {formatarDia(previa.dia_brt)}
                </div>
                {previa.ja_disparado ? (
                  <div className="text-sm mt-1" style={{ color: NAVY }}>
                    <CheckCircle2 size={14} className="inline mr-1" style={{ color: GREEN }} />
                    Resumo de hoje <strong>ja foi disparado</strong>. Veja os detalhes na linha de hoje na tabela abaixo.
                  </div>
                ) : (
                  <div className="text-sm mt-1" style={{ color: NAVY }}>
                    Se o worker rodasse agora, encontraria{" "}
                    <strong style={{ color: previaCor.fg, fontSize: "1.1em" }}>
                      {previa.total_esgotados_janela_24h}
                    </strong>{" "}
                    contratos esgotados na janela de 24h.
                    {previa.total_esgotados_janela_24h < LIMIAR_DISPATCH ? (
                      <span style={{ color: ZINC }}> Abaixo do limiar (&ge; {LIMIAR_DISPATCH}) — nao dispararia consolidado.</span>
                    ) : (
                      <span style={{ color: previaCor.fg, fontWeight: 600 }}> Atingiria o limiar — dispararia o resumo as 08:00 BRT.</span>
                    )}
                  </div>
                )}
                {/* Task #253: botao de disparo manual — visivel so quando ainda
                    nao disparou hoje. Usa rodarResumoDiarioAgora() (forcar=true)
                    com idempotencia garantida no server (segunda chamada =
                    motivo_skip='ja_disparado_hoje'). */}
                {!previa.ja_disparado && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 nao-imprimir">
                    <button
                      onClick={dispararAgora}
                      disabled={disparando}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition disabled:opacity-50"
                      style={{ background: NAVY, color: GOLD }}
                      title="Forca o worker a rodar agora, sem esperar o tick das 08:00 BRT"
                    >
                      <Send size={14} className={disparando ? "animate-pulse" : ""} />
                      {disparando ? "Disparando..." : "Disparar resumo agora"}
                    </button>
                    {resultadoDisparo && (
                      <span className="text-xs" style={{ color: NAVY }}>
                        {resultadoDisparo.executou ? (
                          <>
                            <CheckCircle2 size={12} className="inline mr-1" style={{ color: GREEN }} />
                            Disparado: <strong>{resultadoDisparo.total_esgotados}</strong> esgotados ·{" "}
                            {resultadoDisparo.notificacoes_email} email + {resultadoDisparo.notificacoes_whatsapp} WhatsApp enfileirados.
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} className="inline mr-1" style={{ color: AMBER }} />
                            Nao executou: {descreverSkip(resultadoDisparo.motivo_skip)}
                          </>
                        )}
                      </span>
                    )}
                    {erroDisparo && (
                      <span className="text-xs" style={{ color: RED }}>
                        Falha ao disparar: {erroDisparo}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Erros */}
        {erro && (
          <div className="rounded p-3 text-sm" style={{ background: "#FEE2E2", color: RED }}>
            <strong>Erro:</strong> {erro}. Verifique se sua sessao eh{" "}
            <code>validador_mestre</code> + master estrito.
          </div>
        )}

        {/* Vazio */}
        {!erro && !loading && data && data.dias.length === 0 && (
          <div className="rounded p-6 text-center text-sm" style={{ background: "#ECFDF5", color: GREEN }}>
            <strong>Nenhum resumo diario disparado nos ultimos {data.janela_dias} dias.</strong>{" "}
            Sinal de que o worker nao encontrou &ge; {LIMIAR_DISPATCH} contratos esgotados em nenhuma janela 24h — bucket saudavel.
          </div>
        )}

        {/* Tabela historico */}
        {data && data.dias.length > 0 && (
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#F9FAFB", color: NAVY }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Dia (BRT)</th>
                  <th className="text-center px-3 py-2 font-semibold">Total esgotados</th>
                  <th className="text-center px-3 py-2 font-semibold">Variacao</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Notificado em</th>
                  <th className="text-center px-3 py-2 font-semibold nao-imprimir">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {data.dias.map((d) => {
                  const cor = corDoTotal(d.total_esgotados);
                  return (
                    <tr key={d.dia_brt} className="border-t hover:bg-zinc-50">
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: NAVY }}>
                        {formatarDia(d.dia_brt)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                          style={{ background: cor.bg, color: cor.fg }}
                          title={cor.label}
                        >
                          {d.total_esgotados}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <VariacaoBadge delta={d.variacao_vs_anterior} />
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: cor.fg }}>
                        {cor.label}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: ZINC }}>
                        {formatarHora(d.notificado_em)}
                      </td>
                      <td className="px-3 py-2 text-center nao-imprimir">
                        {!d.dispatched ? (
                          <span className="text-xs italic" style={{ color: ZINC }}>
                            sem dispatch
                          </span>
                        ) : (
                        <details className="inline-block text-left">
                          <summary
                            className="cursor-pointer text-xs font-semibold"
                            style={{ color: BLUE }}
                            title="Mostrar IDs dos eventos consolidados neste resumo"
                          >
                            {d.qtd_eventos} eventos
                          </summary>
                          <div
                            className="mt-2 p-2 rounded text-[11px] font-mono break-all max-w-[320px] max-h-[200px] overflow-auto"
                            style={{ background: "#F9FAFB", color: ZINC }}
                          >
                            {/* Task #393 — lista enriquecida com "Preso ha Xh"
                                + badge vermelho com Flame quando passou do
                                limite (mesmo padrao da tela #247). Fallback
                                pra evento_ids puros se backend antigo nao
                                devolver eventos_detalhe (defesa em camadas). */}
                            {d.eventos_detalhe && d.eventos_detalhe.length > 0 ? (
                              <ul className="space-y-1 list-none">
                                {d.eventos_detalhe.map((ev) => {
                                  const label = formatarPresoHa(ev.preso_ha_horas);
                                  if (ev.passou_limite_alerta) {
                                    return (
                                      <li
                                        key={ev.evento_id}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <span style={{ color: NAVY }}>#{ev.evento_id}</span>
                                        <span
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
                                          style={{ background: "#FEE2E2", color: RED }}
                                          title={`Preso ha ${label} — ja passou do limite de ${
                                            data?.aguardando_webhook_limite_horas ?? 24
                                          }h. Alerta CEO ja foi disparado pelo worker.`}
                                          data-testid={`badge-passou-limite-${ev.evento_id}`}
                                        >
                                          <Flame size={9} />
                                          {label}
                                        </span>
                                      </li>
                                    );
                                  }
                                  return (
                                    <li
                                      key={ev.evento_id}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <span style={{ color: NAVY }}>#{ev.evento_id}</span>
                                      <span
                                        className="font-mono"
                                        style={{ color: ZINC }}
                                        title={`Tempo desde a ultima tentativa: ${label}.`}
                                      >
                                        {label}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : d.evento_ids.length > 0 ? (
                              d.evento_ids.map((id) => `#${id}`).join(", ")
                            ) : (
                              "—"
                            )}
                            <div className="mt-2 nao-imprimir">
                              <Link
                                href="/assinaturas/uploads-falhos"
                                className="inline-flex items-center gap-1 text-xs font-semibold"
                                style={{ color: BLUE }}
                              >
                                Abrir tela de eventos <ExternalLink size={10} />
                              </Link>
                            </div>
                          </div>
                        </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodape */}
        <div
          className="rounded p-3 text-xs flex items-start gap-2"
          style={{ background: "#F9FAFB", color: ZINC }}
        >
          <AlertTriangle size={14} style={{ color: AMBER }} className="mt-0.5" />
          <div>
            <strong>Como ler:</strong> cada linha representa 1 dispatch do
            resumo diario (worker so consolida quando &ge; {LIMIAR_DISPATCH}{" "}
            contratos esgotam as 5 tentativas de upload nas ultimas 24h). Dias
            sem linha = nao houve esgotamento suficiente, alertas individuais
            ja foram suficientes. Variacao &ldquo;0 ontem, 12 hoje&rdquo; em
            vermelho = anomalia clara que merece inspecao do bucket.
          </div>
        </div>

        {data && (
          <div className="text-xs text-right" style={{ color: ZINC }}>
            Atualizado em {new Date(data.gerado_em).toLocaleTimeString("pt-BR")} ·{" "}
            {data.dias.filter((d) => d.dispatched).length} dispatches em {data.dias.length} dias
          </div>
        )}
      </div>
    </Layout>
  );
}
