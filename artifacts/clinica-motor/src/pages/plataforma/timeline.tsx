// Task #171 — Timeline unificada cross-source: junta auditoria kill-switch
// + alertas de seguranca (2FA brute-force) + avisos de expiracao 2FA numa
// unica visao cronologica. Reusa endpoints existentes via fetch paralelo
// (Promise.all) — nao cria endpoint novo. Filtro por tipo permite isolar
// uma fonte. Objetivo: facilitar correlacao temporal ("antes do
// brute-force comecar, eu tinha 2FA expirado?") sem abrir 3 telas.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import {
  Activity,
  RefreshCw,
  ShieldAlert,
  Scale,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

type TipoEvento = "auditoria" | "alerta" | "aviso-2fa";

type EventoUnificado = {
  chave: string;
  tipo: TipoEvento;
  em: string;
  titulo: string;
  resumo: string;
  detalhe: string | null;
  link: { href: string; label: string };
  destaque: boolean;
  // Task #277 — campos pra filtro client-side por usuario alvo. Auditoria
  // nao tem usuario_id direto (e' executor + unidade), entao usuarioId
  // fica null e o filtro numerico de alvo necessariamente oculta linhas
  // de auditoria; o filtro textual usa executor_email quando disponivel.
  usuarioId: number | null;
  usuarioEmail: string | null;
  correlacao: { motivo: string; cor: string } | null;
};

type AuditoriaItem = {
  id: number;
  acao: string;
  unidade_id: number;
  motivo: string | null;
  criado_em: string;
  unidade_nome: string | null;
  executor_nome: string | null;
  executor_email: string | null;
};

type AlertaItem = {
  id: number;
  tipo: string;
  usuario_id: number;
  ip: string | null;
  contexto: string | null;
  payload: Record<string, unknown> | null;
  visualizado_em: string | null;
  criado_em: string;
  usuario_nome: string | null;
  usuario_email: string | null;
};

type AvisoItem = {
  id: number;
  usuario_id: number;
  aviso_em: string;
  expira_em: string;
  renovado_em: string | null;
  status: "renovado" | "expirou" | "em_andamento";
  usuario_nome: string | null;
  usuario_email: string | null;
};

const TIPO_META: Record<
  TipoEvento,
  { label: string; cor: string; icone: React.ReactNode }
> = {
  auditoria: {
    label: "Auditoria",
    cor: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    icone: <Scale size={14} />,
  },
  alerta: {
    label: "Alerta seguranca",
    cor: "bg-red-500/15 text-red-300 border-red-500/40",
    icone: <ShieldAlert size={14} />,
  },
  "aviso-2fa": {
    label: "Aviso 2FA",
    cor: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    icone: <ShieldCheck size={14} />,
  },
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusAvisoIcone(status: AvisoItem["status"]): React.ReactNode {
  if (status === "renovado")
    return <CheckCircle2 size={12} className="text-emerald-400" />;
  if (status === "expirou")
    return <XCircle size={12} className="text-red-400" />;
  return <Clock size={12} className="text-amber-300" />;
}

export default function PlataformaTimeline() {
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Record<TipoEvento, boolean>>({
    auditoria: true,
    alerta: true,
    "aviso-2fa": true,
  });
  // Task #277 — filtros adicionais (client-side, sem mexer nos endpoints).
  // Datas em formato `YYYY-MM-DDTHH:MM` (input datetime-local). Alvo aceita
  // numero (usuario_id) ou substring de email.
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");
  const [alvo, setAlvo] = useState<string>("");
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    // Importante: usePlatformStepUp mantem apenas UM `pendente` por vez. Se
    // chamarmos `runWithStepUp` 3x em paralelo e a sessao 2FA estiver
    // expirada, os 403 simultaneos sobrescrevem o pendente e a tela trava
    // (Promise.all nunca resolve). Solucao: 1 call "porta da frente" via
    // runWithStepUp pra disparar o modal de step-up se precisar; uma vez
    // renovada a janela, as outras 2 vao por apiFetch normal em paralelo.
    const rAud = await runWithStepUp(() =>
      apiFetch("/api/plataforma/auditoria?limite=200", {
        credentials: "include",
      }),
    );
    if (!rAud.ok) {
      const j = await rAud.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar auditoria (${rAud.status})`);
      setLoading(false);
      return;
    }
    const [rAlt, rAvi] = await Promise.all([
      apiFetch("/api/plataforma/alertas-seguranca?limite=200", {
        credentials: "include",
      }),
      apiFetch(
        "/api/plataforma/seguranca/avisos-2fa?dias=30&limite=200",
        { credentials: "include" },
      ),
    ]);
    if (!rAlt.ok || !rAvi.ok) {
      const r = !rAlt.ok ? rAlt : rAvi;
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    try {
      const audJson = await rAud.json();
      const altJson = await rAlt.json();
      const aviJson = await rAvi.json();
      setAuditorias(Array.isArray(audJson) ? audJson : []);
      setAlertas(Array.isArray(altJson.alertas) ? altJson.alertas : []);
      setAvisos(Array.isArray(aviJson.avisos) ? aviJson.avisos : []);
    } catch (e) {
      setErro(`Resposta invalida do servidor: ${(e as Error).message}`);
    }
    setLoading(false);
  }, [runWithStepUp]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const eventos = useMemo<EventoUnificado[]>(() => {
    const lista: EventoUnificado[] = [];
    for (const a of auditorias) {
      lista.push({
        chave: `aud-${a.id}`,
        tipo: "auditoria",
        em: a.criado_em,
        titulo: a.acao,
        resumo: `${a.unidade_nome ?? `clinica id ${a.unidade_id}`} · ${
          a.executor_nome ?? "executor desconhecido"
        }`,
        detalhe: a.motivo,
        link: {
          href: "/plataforma/auditoria",
          label: "Abrir auditoria",
        },
        destaque: false,
        usuarioId: null,
        usuarioEmail: a.executor_email,
        correlacao: null,
      });
    }
    for (const a of alertas) {
      const tentativas =
        typeof a.payload?.["tentativas"] === "number"
          ? (a.payload["tentativas"] as number)
          : null;
      const partes: string[] = [];
      if (a.contexto) partes.push(a.contexto);
      if (tentativas != null) partes.push(`${tentativas} tentativas`);
      if (a.ip) partes.push(`ip ${a.ip}`);
      lista.push({
        chave: `alt-${a.id}`,
        tipo: "alerta",
        em: a.criado_em,
        titulo: a.tipo,
        resumo: `${a.usuario_nome ?? `usuario ${a.usuario_id}`}${
          a.usuario_email ? ` · ${a.usuario_email}` : ""
        }`,
        detalhe: partes.length > 0 ? partes.join(" · ") : null,
        link: {
          href: "/plataforma/alertas-seguranca",
          label: "Abrir alertas",
        },
        destaque: !a.visualizado_em,
        usuarioId: a.usuario_id,
        usuarioEmail: a.usuario_email,
        correlacao: null,
      });
    }
    for (const a of avisos) {
      lista.push({
        chave: `avi-${a.id}`,
        tipo: "aviso-2fa",
        em: a.aviso_em,
        titulo: `Aviso 2FA · ${a.status}`,
        resumo: `${a.usuario_nome ?? `usuario ${a.usuario_id}`}${
          a.usuario_email ? ` · ${a.usuario_email}` : ""
        }`,
        detalhe: `expira ${formatarData(a.expira_em)}${
          a.renovado_em ? ` · renovou ${formatarData(a.renovado_em)}` : ""
        }`,
        link: {
          href: "/plataforma/avisos-2fa",
          label: "Abrir avisos 2FA",
        },
        destaque: a.status === "expirou",
        usuarioId: a.usuario_id,
        usuarioEmail: a.usuario_email,
        correlacao: null,
      });
    }
    // Correlacao: aviso 2FA "expirou" + alerta brute-force (tipo
    // 2FA_BRUTE_FORCE) <2h depois pro mesmo usuario_id. Marca os DOIS
    // eventos com faixa lateral colorida e tooltip cruzado.
    const JANELA_MS = 2 * 60 * 60 * 1000;
    const expiracoes = avisos
      .filter((v) => v.status === "expirou")
      .map((v) => ({
        usuarioId: v.usuario_id,
        em: new Date(v.expira_em).getTime(),
        chave: `avi-${v.id}`,
      }));
    const brutes = alertas
      .filter((a) => a.tipo === "2FA_BRUTE_FORCE")
      .map((a) => ({
        usuarioId: a.usuario_id,
        em: new Date(a.criado_em).getTime(),
        chave: `alt-${a.id}`,
        emIso: a.criado_em,
      }));
    const correlacionados = new Map<string, { motivo: string; cor: string }>();
    for (const b of brutes) {
      const match = expiracoes.find(
        (e) =>
          e.usuarioId === b.usuarioId &&
          b.em - e.em >= 0 &&
          b.em - e.em <= JANELA_MS,
      );
      if (!match) continue;
      const minutos = Math.round((b.em - match.em) / 60000);
      const cor = "border-l-4 border-l-fuchsia-500";
      correlacionados.set(b.chave, {
        motivo: `Brute-force ${minutos}min depois do aviso 2FA expirar (mesmo usuario)`,
        cor,
      });
      correlacionados.set(match.chave, {
        motivo: `Aviso 2FA expirou e ${minutos}min depois veio brute-force (mesmo usuario)`,
        cor,
      });
    }
    for (const ev of lista) {
      const c = correlacionados.get(ev.chave);
      if (c) ev.correlacao = c;
    }
    lista.sort((x, y) => (x.em < y.em ? 1 : x.em > y.em ? -1 : 0));
    return lista;
  }, [auditorias, alertas, avisos]);

  // Task #277 — filtros client-side compostos: tipo + janela temporal + alvo.
  // Janela usa Date.parse no formato `YYYY-MM-DDTHH:MM` (datetime-local
  // entrega no fuso local). Alvo numerico casa por usuario_id exato; alvo
  // textual casa por substring case-insensitive em email. Auditoria nao
  // tem usuario_id, entao filtro numerico de alvo oculta auditoria — o
  // alvo textual usa o email do executor quando disponivel.
  const visiveis = useMemo(() => {
    const tsInicial = dataInicial ? Date.parse(dataInicial) : null;
    const tsFinal = dataFinal ? Date.parse(dataFinal) : null;
    const alvoTrim = alvo.trim();
    const alvoNumerico = alvoTrim !== "" && /^\d+$/.test(alvoTrim)
      ? Number(alvoTrim)
      : null;
    const alvoTexto = alvoTrim !== "" && alvoNumerico === null
      ? alvoTrim.toLowerCase()
      : null;
    return eventos.filter((e) => {
      if (!filtros[e.tipo]) return false;
      const ts = Date.parse(e.em);
      if (tsInicial != null && !Number.isNaN(tsInicial) && ts < tsInicial)
        return false;
      if (tsFinal != null && !Number.isNaN(tsFinal) && ts > tsFinal)
        return false;
      if (alvoNumerico != null) {
        if (e.usuarioId !== alvoNumerico) return false;
      } else if (alvoTexto != null) {
        const email = (e.usuarioEmail ?? "").toLowerCase();
        if (!email.includes(alvoTexto)) return false;
      }
      return true;
    });
  }, [eventos, filtros, dataInicial, dataFinal, alvo]);

  // Mantido do HEAD (correlacoes brute-force x aviso 2FA expirado): conta
  // apenas o que sobrou apos os filtros da Task #277.
  const correlacoesVisiveis = visiveis.filter((e) => e.correlacao !== null).length;
  const paresCorrelacionados = Math.floor(correlacoesVisiveis / 2);

  // Task #277 — "Limpar filtros" deve ficar habilitado sempre que o estado
  // dos filtros divergir do default (todos os tipos ON, datas/alvo vazios),
  // inclusive quando so' o toggle de tipo foi alterado.
  const filtrosAtivos =
    dataInicial !== "" ||
    dataFinal !== "" ||
    alvo.trim() !== "" ||
    !filtros.auditoria ||
    !filtros.alerta ||
    !filtros["aviso-2fa"];

  function alternarFiltro(t: TipoEvento) {
    setFiltros((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  function limparFiltros() {
    setDataInicial("");
    setDataFinal("");
    setAlvo("");
    setFiltros({ auditoria: true, alerta: true, "aviso-2fa": true });
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <Activity size={28} /> Plataforma · Timeline unificada
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Merge cronologico de auditoria kill-switch, alertas de
              seguranca (brute-force 2FA) e avisos de expiracao 2FA.
              Facilita correlacao temporal sem abrir 3 telas.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(TIPO_META) as TipoEvento[]).map((t) => {
              const meta = TIPO_META[t];
              const ativo = filtros[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => alternarFiltro(t)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border ${
                    ativo
                      ? meta.cor
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                  data-testid={`filtro-tipo-${t}`}
                  title={ativo ? `Ocultar ${meta.label}` : `Mostrar ${meta.label}`}
                >
                  {meta.icone}
                  {meta.label}
                </button>
              );
            })}
            <button
              onClick={() => void carregar()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              data-testid="button-recarregar-timeline"
            >
              <RefreshCw size={16} /> Recarregar
            </button>
          </div>
        </header>

        {/* Task #277 — filtros temporais e de alvo (client-side). */}
        <div className="mb-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-zinc-400 uppercase">De</span>
            <input
              type="datetime-local"
              value={dataInicial}
              onChange={(ev) => setDataInicial(ev.target.value)}
              className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
              data-testid="input-data-inicial"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-400 uppercase">Ate</span>
            <input
              type="datetime-local"
              value={dataFinal}
              onChange={(ev) => setDataFinal(ev.target.value)}
              className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
              data-testid="input-data-final"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-400 uppercase">Alvo (id ou email)</span>
            <input
              type="text"
              value={alvo}
              onChange={(ev) => setAlvo(ev.target.value)}
              placeholder="ex: 42 ou caio@"
              className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
              data-testid="input-alvo"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={limparFiltros}
              disabled={!filtrosAtivos}
              className="w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-zinc-200 border border-zinc-700"
              data-testid="button-limpar-filtros"
            >
              Limpar filtros
            </button>
          </div>
        </div>

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

        <div
          className={`mb-4 p-3 border rounded text-xs flex items-center gap-2 ${
            paresCorrelacionados > 0
              ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-200"
              : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}
          data-testid="contador-correlacoes"
          title="Regra: aviso 2FA expirou + alerta brute-force <2h depois pro mesmo usuario."
        >
          <ShieldAlert size={14} />
          <span>
            <strong>{paresCorrelacionados}</strong> correlacao(es) suspeita(s)
            detectada(s) no recorte atual
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
          <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded">
            <div className="text-amber-400 uppercase">Auditoria</div>
            <div className="text-xl font-bold text-amber-200 mt-1" data-testid="kpi-auditoria-total">
              {auditorias.length}
            </div>
          </div>
          <div className="p-3 bg-red-500/5 border border-red-500/30 rounded">
            <div className="text-red-400 uppercase">Alertas seguranca</div>
            <div className="text-xl font-bold text-red-200 mt-1" data-testid="kpi-alerta-total">
              {alertas.length}
            </div>
          </div>
          <div className="p-3 bg-sky-500/5 border border-sky-500/30 rounded">
            <div className="text-sky-400 uppercase">Avisos 2FA</div>
            <div className="text-xl font-bold text-sky-200 mt-1" data-testid="kpi-aviso-total">
              {avisos.length}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3 w-44">Quando</th>
                <th className="text-left px-4 py-3 w-40">Tipo</th>
                <th className="text-left px-4 py-3">Evento</th>
                <th className="text-right px-4 py-3 w-44">Origem</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && visiveis.length === 0 && !erro && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum evento no recorte atual.
                  </td>
                </tr>
              )}
              {!loading &&
                visiveis.map((e) => {
                  const meta = TIPO_META[e.tipo];
                  return (
                    <tr
                      key={e.chave}
                      className={`border-t border-zinc-800 align-top ${
                        e.destaque ? "bg-amber-500/5" : ""
                      } ${
                        e.correlacao
                          ? `${e.correlacao.cor} bg-fuchsia-500/5`
                          : ""
                      }`}
                      data-testid={`row-timeline-${e.chave}`}
                      data-correlacionado={e.correlacao ? "true" : "false"}
                      title={e.correlacao?.motivo}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap font-mono">
                        {formatarData(e.em)}
                        {e.correlacao && (
                          <div
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40"
                            title={e.correlacao.motivo}
                            data-testid={`badge-correlacao-${e.chave}`}
                          >
                            <ShieldAlert size={10} /> correlacao
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${meta.cor}`}
                        >
                          {meta.icone}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-200">
                        <div className="font-semibold flex items-center gap-2">
                          {e.tipo === "aviso-2fa" && (
                            <span title={e.titulo}>
                              {statusAvisoIcone(
                                (e.titulo.split(" · ")[1] ?? "em_andamento") as AvisoItem["status"],
                              )}
                            </span>
                          )}
                          <span className="font-mono text-xs">{e.titulo}</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {e.resumo}
                        </div>
                        {e.detalhe && (
                          <div className="text-[11px] text-zinc-500 mt-1 italic">
                            {e.detalhe}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={e.link.href}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                        >
                          <ExternalLink size={11} /> {e.link.label}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Mostrando {visiveis.length} de {eventos.length} eventos. Recorte:
          auditoria (limite 200), alertas (limite 200), avisos 2FA (ultimos
          30d, limite 200).
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
