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
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { Clock, Save, ShieldAlert, Mail, MessageSquare, CheckCircle2 } from "lucide-react";

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

export default function CeoJanelasDescanso() {
  const [prefs, setPrefs] = useState<Pref[] | null>(null);
  const [salvandoCanal, setSalvandoCanal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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

  useEffect(() => {
    carregar();
  }, [carregar]);

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
      </div>
    </Layout>
  );
}
