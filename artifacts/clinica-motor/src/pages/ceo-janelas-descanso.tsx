// Task #45 — Janelas de descanso proprias do CEO (validador_mestre).
//
// Permite ao Dr. Caio configurar quiet hours por canal (e-mail/WhatsApp)
// pros alertas operacionais de ASSINATURA. Recusas (doc_refused) sempre
// passam, independente do horario — invariante hard-locked no worker, nao
// configuravel por design (requisito Task #45).
//
// Sem configurar nada, o comportamento Wave 10 eh preservado: alertas CEO
// chegam 24/7. Liga "habilitar janela" pra silenciar ASSINADOS no horario
// configurado.
import { useEffect, useState, useCallback } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { Clock, Save, ShieldAlert, Mail, MessageSquare, CheckCircle2, BellOff, Zap, RefreshCw, Inbox } from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const ZINC = "#71717a";

type Pref = {
  canal: "EMAIL" | "WHATSAPP";
  quiet_inicio: string;
  quiet_fim: string;
  tz: string;
  habilitar_quiet_hours: boolean;
  nunca_silenciar_recusa: boolean; // hard-locked true no backend; nao editavel.
  // Task #250 — opt-in por canal: agrupa recusas que cairem dentro da
  // janela num unico digest matinal disparado ao fim da janela.
  agrupar_recusas: boolean;
  atualizado_em: string | null;
};

// TZ_BRASIL: lista IANA constrita pra evitar entrada invalida no worker.
// Backend tambem valida via Intl.DateTimeFormat probe (defesa em camadas).
const TZ_BRASIL = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Boa_Vista",
  "America/Noronha",
];

const CANAL_LABEL: Record<Pref["canal"], string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
};

function CanalIcone({ canal }: { canal: Pref["canal"] }) {
  if (canal === "EMAIL") return <Mail size={16} />;
  return <MessageSquare size={16} />;
}

function recortarHHMM(s: string): string {
  // backend devolve HH:MM:SS, input type=time aceita HH:MM
  return (s ?? "").slice(0, 5);
}

// Task #249 — alertas silenciados pela janela do CEO.
type Silenciado = {
  id: number;
  canal: "EMAIL" | "WHATSAPP";
  momento: string | null;
  destinatario: string;
  evento_ceo: string | null;
  criado_em: string;
  proxima_tentativa_em: string | null;
  erro: string | null;
  tentativas: number | null;
  assunto: string | null;
  paciente_id: number | null;
  paciente_nome: string | null;
  unidade_nick: string | null;
};

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function rotuloEvento(evento: string | null): string {
  const e = (evento || "").toUpperCase();
  if (e === "ASSINADO") return "Assinado";
  if (e === "REJEITADO") return "Recusado";
  return evento || "—";
}

export default function CeoJanelasDescanso() {
  const [prefs, setPrefs] = useState<Pref[] | null>(null);
  const [salvandoCanal, setSalvandoCanal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [silenciados, setSilenciados] = useState<Silenciado[] | null>(null);
  const [silenciadosCarregando, setSilenciadosCarregando] = useState(false);
  const [liberandoId, setLiberandoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await apiFetch("/api/admin/ceo-notif-preferencias", { credentials: "include" });
      if (!r.ok) {
        setErro(`Falha ao carregar (HTTP ${r.status})`);
        return;
      }
      const j = await r.json();
      setPrefs(j.preferencias ?? []);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  const carregarSilenciados = useCallback(async () => {
    setSilenciadosCarregando(true);
    try {
      const r = await apiFetch("/api/admin/ceo-notif-preferencias/silenciados", { credentials: "include" });
      if (!r.ok) {
        setErro(`Falha ao carregar silenciados (HTTP ${r.status})`);
        return;
      }
      const j = await r.json();
      setSilenciados(j.rows ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSilenciadosCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarSilenciados();
  }, [carregar, carregarSilenciados]);

  const liberarAgora = async (id: number) => {
    setLiberandoId(id);
    setErro(null);
    setOkMsg(null);
    try {
      const r = await apiFetch(`/api/admin/ceo-notif-preferencias/silenciados/${id}/liberar`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErro(j.error || `HTTP ${r.status}`);
        return;
      }
      setOkMsg(`Alerta #${id} liberado — sera reenviado no proximo tick.`);
      await carregarSilenciados();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLiberandoId(null);
    }
  };

  const atualizarLocal = (canal: Pref["canal"], patch: Partial<Pref>) => {
    setPrefs((cur) =>
      (cur ?? []).map((p) => (p.canal === canal ? { ...p, ...patch } : p)),
    );
  };

  const salvar = async (pref: Pref) => {
    setSalvandoCanal(pref.canal);
    setErro(null);
    setOkMsg(null);
    try {
      const r = await apiFetch("/api/admin/ceo-notif-preferencias", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          canal: pref.canal,
          quiet_inicio: pref.quiet_inicio.length === 5 ? `${pref.quiet_inicio}:00` : pref.quiet_inicio,
          quiet_fim: pref.quiet_fim.length === 5 ? `${pref.quiet_fim}:00` : pref.quiet_fim,
          tz: pref.tz,
          habilitar_quiet_hours: pref.habilitar_quiet_hours,
          agrupar_recusas: pref.agrupar_recusas,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErro(j.error || `HTTP ${r.status}`);
        return;
      }
      setOkMsg(`Janela de ${CANAL_LABEL[pref.canal]} salva.`);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoCanal(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6" data-testid="ceo-janelas-descanso-page">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: NAVY }}>
            <Clock size={20} style={{ color: GOLD }} />
            Janelas de descanso do CEO
          </h1>
          <p className="text-sm" style={{ color: ZINC }}>
            Silencia avisos operacionais de assinatura por canal. Recusas
            (doc_refused) sempre passam quando &quot;nunca silenciar recusa&quot; estiver
            ligado &mdash; recusa eh urgente.
          </p>
        </header>

        {erro && (
          <div className="p-3 rounded border" style={{ borderColor: "#dc2626", background: "#fee2e2", color: "#7f1d1d" }} role="alert">
            <ShieldAlert size={14} className="inline mr-1" /> {erro}
          </div>
        )}
        {okMsg && (
          <div className="p-3 rounded border" style={{ borderColor: "#16a34a", background: "#dcfce7", color: "#14532d" }} role="status">
            <CheckCircle2 size={14} className="inline mr-1" /> {okMsg}
          </div>
        )}

        {!prefs && <div style={{ color: ZINC }}>Carregando...</div>}

        {prefs?.map((pref) => (
          <section
            key={pref.canal}
            className="border rounded-lg p-5 space-y-4"
            style={{ borderColor: GOLD, background: "white" }}
            data-testid={`ceo-janela-${pref.canal.toLowerCase()}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                <CanalIcone canal={pref.canal} />
                {CANAL_LABEL[pref.canal]}
              </h2>
              {pref.atualizado_em && (
                <span className="text-xs" style={{ color: ZINC }}>
                  Atualizado em {new Date(pref.atualizado_em).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={pref.habilitar_quiet_hours}
                onChange={(e) => atualizarLocal(pref.canal, { habilitar_quiet_hours: e.target.checked })}
                data-testid={`habilitar-${pref.canal.toLowerCase()}`}
              />
              <span>Habilitar janela de descanso para este canal</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="block mb-1 font-medium" style={{ color: NAVY }}>Inicio (silencio)</span>
                <input
                  type="time"
                  value={recortarHHMM(pref.quiet_inicio)}
                  onChange={(e) => atualizarLocal(pref.canal, { quiet_inicio: e.target.value })}
                  className="w-full border rounded px-2 py-1.5"
                  disabled={!pref.habilitar_quiet_hours}
                  data-testid={`inicio-${pref.canal.toLowerCase()}`}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 font-medium" style={{ color: NAVY }}>Fim (volta a tocar)</span>
                <input
                  type="time"
                  value={recortarHHMM(pref.quiet_fim)}
                  onChange={(e) => atualizarLocal(pref.canal, { quiet_fim: e.target.value })}
                  className="w-full border rounded px-2 py-1.5"
                  disabled={!pref.habilitar_quiet_hours}
                  data-testid={`fim-${pref.canal.toLowerCase()}`}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 font-medium" style={{ color: NAVY }}>Fuso horario</span>
                <select
                  value={pref.tz}
                  onChange={(e) => atualizarLocal(pref.canal, { tz: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 bg-white"
                  disabled={!pref.habilitar_quiet_hours}
                  data-testid={`tz-${pref.canal.toLowerCase()}`}
                >
                  {TZ_BRASIL.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className="text-xs px-3 py-2 rounded border"
              style={{ borderColor: GOLD, background: "#fffbea", color: NAVY }}
              data-testid={`recusa-sempre-passa-${pref.canal.toLowerCase()}`}
            >
              <ShieldAlert size={12} className="inline mr-1" />
              Recusas (doc_refused) sempre passam, independente do horario.
              Esta regra eh fixa por design e nao pode ser desligada.
            </div>

            <div
              className="border rounded p-3 space-y-2"
              style={{ borderColor: GOLD, background: pref.habilitar_quiet_hours ? "white" : "#f4f4f5" }}
            >
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pref.agrupar_recusas}
                  onChange={(e) => atualizarLocal(pref.canal, { agrupar_recusas: e.target.checked })}
                  disabled={!pref.habilitar_quiet_hours}
                  className="mt-0.5"
                  data-testid={`agrupar-recusas-${pref.canal.toLowerCase()}`}
                />
                <span className="flex-1">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: NAVY }}>
                    <Inbox size={14} style={{ color: GOLD }} />
                    Agrupar recusas em digest matinal (quando dentro da janela)
                  </span>
                  <span className="block mt-1 text-xs" style={{ color: ZINC }}>
                    Quando ligado, recusas que chegarem dentro da janela de descanso
                    NAO pingam imediato — sao consolidadas num unico aviso disparado
                    assim que a janela fecha. Recusas FORA da janela continuam imediatas.
                    Pode ligar so no e-mail e manter WhatsApp imediato (urgencia clinica).
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => salvar(pref)}
                disabled={salvandoCanal === pref.canal}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded transition disabled:opacity-60"
                style={{ background: NAVY, color: "white", border: `1px solid ${GOLD}` }}
                data-testid={`salvar-${pref.canal.toLowerCase()}`}
              >
                <Save size={14} />
                {salvandoCanal === pref.canal ? "Salvando..." : `Salvar ${CANAL_LABEL[pref.canal]}`}
              </button>
            </div>
          </section>
        ))}

        <section
          className="border rounded-lg p-5 space-y-4"
          style={{ borderColor: GOLD, background: "white" }}
          data-testid="ceo-silenciados-section"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: NAVY }}>
              <BellOff size={18} style={{ color: GOLD }} />
              Alertas silenciados pela janela de descanso
            </h2>
            <button
              onClick={() => carregarSilenciados()}
              disabled={silenciadosCarregando}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border disabled:opacity-60"
              style={{ borderColor: GOLD, color: NAVY, background: "white" }}
              data-testid="ceo-silenciados-refresh"
            >
              <RefreshCw size={12} />
              {silenciadosCarregando ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <p className="text-sm" style={{ color: ZINC }}>
            Avisos de assinatura que cairam dentro da janela de descanso configurada
            acima. Eles serao reenviados automaticamente quando a janela terminar.
            Use &quot;Liberar agora&quot; pra forcar reenvio imediato.
          </p>

          {silenciados === null && (
            <div style={{ color: ZINC }}>Carregando alertas silenciados...</div>
          )}

          {silenciados !== null && silenciados.length === 0 && (
            <div
              className="text-sm px-3 py-4 rounded border text-center"
              style={{ borderColor: GOLD, background: "#fffbea", color: NAVY }}
              data-testid="ceo-silenciados-vazio"
            >
              Nenhum alerta foi silenciado pela sua janela de descanso ate agora.
            </div>
          )}

          {silenciados !== null && silenciados.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="ceo-silenciados-tabela">
                <thead>
                  <tr style={{ background: "#f5f5f4", color: NAVY }}>
                    <th className="text-left px-2 py-2 font-semibold">Canal</th>
                    <th className="text-left px-2 py-2 font-semibold">Evento</th>
                    <th className="text-left px-2 py-2 font-semibold">Paciente / Unidade</th>
                    <th className="text-left px-2 py-2 font-semibold">Destinatario</th>
                    <th className="text-left px-2 py-2 font-semibold">Silenciado em</th>
                    <th className="text-left px-2 py-2 font-semibold">Volta a tocar em</th>
                    <th className="text-right px-2 py-2 font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {silenciados.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t"
                      style={{ borderColor: "#e7e5e4" }}
                      data-testid={`ceo-silenciado-${s.id}`}
                    >
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          <CanalIcone canal={s.canal} />
                          {CANAL_LABEL[s.canal]}
                        </span>
                      </td>
                      <td className="px-2 py-2">{rotuloEvento(s.evento_ceo)}</td>
                      <td className="px-2 py-2">
                        <div style={{ color: NAVY }}>{s.paciente_nome || "—"}</div>
                        {s.unidade_nick && (
                          <div className="text-xs" style={{ color: ZINC }}>{s.unidade_nick}</div>
                        )}
                      </td>
                      <td className="px-2 py-2 break-all">{s.destinatario}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{formatarDataHora(s.criado_em)}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{formatarDataHora(s.proxima_tentativa_em)}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => liberarAgora(s.id)}
                          disabled={liberandoId === s.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded transition disabled:opacity-60"
                          style={{ background: NAVY, color: "white", border: `1px solid ${GOLD}` }}
                          data-testid={`liberar-${s.id}`}
                        >
                          <Zap size={12} />
                          {liberandoId === s.id ? "Liberando..." : "Liberar agora"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
