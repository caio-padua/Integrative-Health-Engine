// PAWARDS MEDCORE · Wave 9 PARQ · /admin/parq — master-only
// 3 abas: Status das Parcerias / Wizard Emissão / Histórico Status
// Substitui "comissão" por contraprestação técnica de auditoria Kaizen.
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  ShieldCheck,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Wand2,
  Download,
  RefreshCw,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GOLD_LT = "#E8C268";
const RED = "#dc2626";
const GREEN = "#16a34a";
const AMBER = "#d97706";

type Farmacia = {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
};

type Acordo = {
  id: number;
  numero_serie: string;
  status: string;
  emitido_em: string;
  validacao_simplificada: boolean;
  toggle_obrigatoriedade_farmacia: boolean;
  assinatura_farmacia_data: string | null;
  certificado_clinica_data: string | null;
};

type StatusFarmacia = {
  farmacia_id: number;
  status_atual: { status: string; media_qualidade: number | null } | null;
  acordos_vigentes: Acordo[];
  ultimas_visitas: any[];
  planos_abertos: any[];
  historico_status: any[];
};

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; fg: string; icon: any }
> = {
  gold: { label: "GOLD", bg: "#FAF6EC", fg: "#A97822", icon: Award },
  silver: { label: "SILVER", bg: "#F3F4F6", fg: "#4B5563", icon: Award },
  bronze: { label: "BRONZE", bg: "#FEF3E8", fg: "#9A3412", icon: Award },
  em_correcao: {
    label: "EM CORREÇÃO",
    bg: "#FEF9E7",
    fg: "#A16207",
    icon: AlertTriangle,
  },
  suspensa: { label: "SUSPENSA", bg: "#FEE2E2", fg: "#B91C1C", icon: XCircle },
  denunciada: {
    label: "DENUNCIADA",
    bg: "#1F2937",
    fg: "#F9FAFB",
    icon: XCircle,
  },
  vigente: {
    label: "VIGENTE",
    bg: "#DCFCE7",
    fg: "#166534",
    icon: CheckCircle2,
  },
  pendente_assinatura: {
    label: "AGUARDANDO ASSINATURA",
    bg: "#FEF3C7",
    fg: "#92400E",
    icon: Clock,
  },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_BADGES[status] || STATUS_BADGES.bronze;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function fmtData(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function AdminParq() {
  const [aba, setAba] = useState<"status" | "wizard" | "historico">("status");

  // Status / lista farmácias
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, StatusFarmacia>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Wizard
  const [wzPasso, setWzPasso] = useState<1 | 2 | 3 | 4>(1);
  const [wzFarmacia, setWzFarmacia] = useState<number | null>(null);
  const [wzValidSimp, setWzValidSimp] = useState(true);
  const [wzToggle, setWzToggle] = useState(false);
  const [wzCpf, setWzCpf] = useState("");
  const [wzSerial, setWzSerial] = useState("");
  const [wzEmitido, setWzEmitido] = useState<{
    id: number;
    numero_serie: string;
    sha256_hash: string;
  } | null>(null);
  const [wzWorking, setWzWorking] = useState(false);

  const carregarFarmacias = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/farmacias", { credentials: "include" });
      const j = await r.json();
      const lista = j.farmacias ?? j ?? [];
      setFarmacias(Array.isArray(lista) ? lista : []);
      // Status em paralelo
      const promessas = (Array.isArray(lista) ? lista : []).map(
        async (f: Farmacia) => {
          try {
            const rr = await fetch(`/api/parq/status-farmacia/${f.id}`, {
              credentials: "include",
            });
            const jj = await rr.json();
            return [f.id, jj as StatusFarmacia] as const;
          } catch {
            return [f.id, null] as const;
          }
        },
      );
      const results = await Promise.all(promessas);
      const m: Record<number, StatusFarmacia> = {};
      for (const [id, s] of results) if (s) m[id] = s;
      setStatusMap(m);
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarFarmacias();
  }, [carregarFarmacias]);

  async function emitirAcordo() {
    if (!wzFarmacia) return;
    setWzWorking(true);
    setMsg("");
    try {
      const r = await fetch("/api/parq/emitir", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmacia_id: wzFarmacia,
          validacao_simplificada: wzValidSimp,
          toggle_obrigatoriedade_farmacia: wzToggle,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "erro emitir");
      setWzEmitido({
        id: j.id,
        numero_serie: j.numero_serie,
        sha256_hash: j.sha256_hash,
      });
      setWzSerial(j.numero_serie);
      setWzPasso(4);
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setWzWorking(false);
    }
  }

  async function assinarClinicaIcp() {
    if (!wzEmitido || !wzCpf) return;
    setWzWorking(true);
    setMsg("");
    try {
      const r = await fetch("/api/parq/assinar-clinica-icp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acordo_id: wzEmitido.id,
          cpf_cnpj: wzCpf,
          serial_certificado: "ICP-WIZARD",
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "erro assinar");
      setMsg("✓ Assinatura ICP-Brasil registrada. Aguardando farmácia assinar.");
      await carregarFarmacias();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setWzWorking(false);
    }
  }

  function resetWizard() {
    setWzPasso(1);
    setWzFarmacia(null);
    setWzValidSimp(true);
    setWzToggle(false);
    setWzCpf("");
    setWzSerial("");
    setWzEmitido(null);
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto" data-testid="page-admin-parq">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" style={{ color: GOLD }} />
              <h1
                className="text-3xl font-bold"
                style={{ color: NAVY, fontFamily: "Times New Roman, serif" }}
              >
                Parceria de Qualidade Técnica · PARQ
              </h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Auditoria Kaizen bimestral · Substitui acordos de comissão (CFM
              2.386/2024 + CC 593-609 + STJ REsp 2.159.442/PR)
            </p>
          </div>
          <button
            onClick={() => void carregarFarmacias()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: GOLD, color: NAVY }}
            data-testid="btn-recarregar-parq"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </button>
        </div>

        {msg && (
          <div
            className="mb-4 p-3 rounded-lg text-sm border"
            style={{
              borderColor: msg.startsWith("✓") ? GREEN : RED,
              color: msg.startsWith("✓") ? GREEN : RED,
              background: msg.startsWith("✓") ? "#F0FDF4" : "#FEF2F2",
            }}
            data-testid="msg-parq"
          >
            {msg}
          </div>
        )}

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 mb-4 border-b" style={{ borderColor: GOLD }}>
          {[
            { id: "status", label: "Status das Parcerias", Icon: Award },
            { id: "wizard", label: "Emitir novo PARQ", Icon: Wand2 },
            { id: "historico", label: "Histórico", Icon: History },
          ].map((t) => {
            const Icon = t.Icon;
            const ativa = aba === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setAba(t.id as any)}
                className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors"
                style={{
                  borderColor: ativa ? GOLD : "transparent",
                  color: ativa ? NAVY : "#6b7280",
                }}
                data-testid={`tab-${t.id}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── ABA STATUS ─── */}
        {aba === "status" && (
          <div data-testid="aba-status">
            {farmacias.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500 border rounded-lg">
                Nenhuma farmácia cadastrada.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmacias.map((f) => {
                const s = statusMap[f.id];
                const statusKey = s?.status_atual?.status || "bronze";
                const acordos = s?.acordos_vigentes || [];
                const planos = s?.planos_abertos || [];
                return (
                  <div
                    key={f.id}
                    className="border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderColor: "#e5e7eb" }}
                    data-testid={`card-farmacia-${f.id}`}
                  >
                    <div
                      className="p-4 border-b"
                      style={{ borderColor: "#e5e7eb" }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3
                          className="font-bold text-base"
                          style={{ color: NAVY }}
                        >
                          {f.nome_fantasia}
                        </h3>
                        <StatusPill status={statusKey} />
                      </div>
                      <p className="text-xs text-gray-500">
                        CNPJ {f.cnpj || "—"} ·{" "}
                        {[f.cidade, f.estado].filter(Boolean).join("/") || "—"}
                      </p>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">PARQ vigentes:</span>
                        <span className="font-semibold" style={{ color: NAVY }}>
                          {acordos.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Planos Kaizen abertos:
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: planos.length > 0 ? AMBER : GREEN }}
                        >
                          {planos.length}
                        </span>
                      </div>
                      {acordos[0] && (
                        <div className="pt-2 border-t mt-2 text-xs space-y-1">
                          <div className="font-mono text-gray-600">
                            {acordos[0].numero_serie}
                          </div>
                          <div className="text-gray-500">
                            Emitido: {fmtData(acordos[0].emitido_em)}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <a
                              href={`/api/parq/${acordos[0].id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded border text-xs"
                              style={{ borderColor: GOLD, color: NAVY }}
                              data-testid={`btn-pdf-${acordos[0].id}`}
                            >
                              <Download className="w-3 h-3" /> Termo PDF
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ABA WIZARD ─── */}
        {aba === "wizard" && (
          <div data-testid="aba-wizard" className="max-w-2xl">
            {/* Passos breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4].map((p) => (
                <div key={p} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: wzPasso >= p ? GOLD : "#e5e7eb",
                      color: wzPasso >= p ? NAVY : "#9ca3af",
                    }}
                  >
                    {p}
                  </div>
                  {p < 4 && (
                    <div
                      className="flex-1 h-0.5"
                      style={{ background: wzPasso > p ? GOLD : "#e5e7eb" }}
                    />
                  )}
                </div>
              ))}
            </div>

            {wzPasso === 1 && (
              <div className="border rounded-xl p-6 bg-white">
                <h3
                  className="text-lg font-bold mb-3"
                  style={{ color: NAVY }}
                >
                  Passo 1 · Selecione a farmácia parceira
                </h3>
                <select
                  value={wzFarmacia ?? ""}
                  onChange={(e) => setWzFarmacia(Number(e.target.value) || null)}
                  className="w-full p-3 border rounded-lg text-sm"
                  data-testid="select-farmacia-wizard"
                >
                  <option value="">— escolher —</option>
                  {farmacias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome_fantasia} ({f.cnpj || "sem CNPJ"})
                    </option>
                  ))}
                </select>
                <div className="mt-4 flex justify-end">
                  <button
                    disabled={!wzFarmacia}
                    onClick={() => setWzPasso(2)}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: NAVY }}
                    data-testid="btn-next-1"
                  >
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {wzPasso === 2 && (
              <div className="border rounded-xl p-6 bg-white space-y-4">
                <h3 className="text-lg font-bold mb-3" style={{ color: NAVY }}>
                  Passo 2 · Configurações do PARQ
                </h3>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={wzValidSimp}
                    onChange={(e) => setWzValidSimp(e.target.checked)}
                    className="mt-1"
                    data-testid="chk-valid-simplif"
                  />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: NAVY }}>
                      Validação Simplificada
                    </div>
                    <div className="text-xs text-gray-600">
                      Aceita 5 modalidades de assinatura para a farmácia (Lei
                      14.063/2020 art. 5º I — até R$ 5.000/mês de
                      contraprestação agregada).
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={wzToggle}
                    onChange={(e) => setWzToggle(e.target.checked)}
                    className="mt-1"
                    data-testid="chk-toggle-obrig"
                  />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: NAVY }}>
                      Permitir indicação preferencial não-obrigatória
                    </div>
                    <div className="text-xs text-gray-600">
                      Mantém autonomia total do paciente para escolher outra
                      farmácia. (Recomendado pelo CFM 2.386/2024.)
                    </div>
                  </div>
                </label>
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setWzPasso(1)}
                    className="px-5 py-2 rounded-lg text-sm border"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => setWzPasso(3)}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: NAVY }}
                    data-testid="btn-next-2"
                  >
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {wzPasso === 3 && (
              <div className="border rounded-xl p-6 bg-white space-y-4">
                <h3 className="text-lg font-bold" style={{ color: NAVY }}>
                  Passo 3 · Confirmação e emissão
                </h3>
                <div
                  className="p-3 rounded-lg text-xs space-y-1"
                  style={{ background: "#FAF6EC", color: NAVY }}
                >
                  <div>
                    <strong>Farmácia:</strong>{" "}
                    {farmacias.find((f) => f.id === wzFarmacia)?.nome_fantasia ||
                      "—"}
                  </div>
                  <div>
                    <strong>Validação simplificada:</strong>{" "}
                    {wzValidSimp ? "Sim" : "Não"}
                  </div>
                  <div>
                    <strong>Indicação preferencial:</strong>{" "}
                    {wzToggle ? "Habilitada (não obrigatória)" : "Desabilitada"}
                  </div>
                </div>
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setWzPasso(2)}
                    className="px-5 py-2 rounded-lg text-sm border"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    ← Voltar
                  </button>
                  <button
                    disabled={wzWorking}
                    onClick={() => void emitirAcordo()}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: GOLD, color: NAVY }}
                    data-testid="btn-emitir-parq"
                  >
                    {wzWorking ? "Emitindo..." : "Emitir PARQ"}
                  </button>
                </div>
              </div>
            )}

            {wzPasso === 4 && wzEmitido && (
              <div className="border rounded-xl p-6 bg-white space-y-4">
                <div
                  className="flex items-center gap-2 text-base font-semibold"
                  style={{ color: GREEN }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  PARQ emitido com sucesso
                </div>
                <div
                  className="p-3 rounded-lg text-xs space-y-1 font-mono"
                  style={{ background: "#F9FAFB", color: NAVY }}
                  data-testid="div-emitido-info"
                >
                  <div>Nº Série: {wzEmitido.numero_serie}</div>
                  <div className="break-all">SHA-256: {wzEmitido.sha256_hash}</div>
                </div>
                <h3 className="text-lg font-bold" style={{ color: NAVY }}>
                  Passo 4 · Assinatura ICP-Brasil da Clínica
                </h3>
                <input
                  type="text"
                  placeholder="CPF/CNPJ do certificado ICP-Brasil"
                  value={wzCpf}
                  onChange={(e) => setWzCpf(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  data-testid="input-cpf-icp"
                />
                <div className="flex justify-between gap-2">
                  <a
                    href={`/api/parq/${wzEmitido.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-sm border flex items-center gap-2"
                    style={{ borderColor: GOLD, color: NAVY }}
                    data-testid="btn-pdf-emitido"
                  >
                    <Download className="w-4 h-4" /> Baixar PDF do Termo
                  </a>
                  <div className="flex gap-2">
                    <button
                      onClick={resetWizard}
                      className="px-5 py-2 rounded-lg text-sm border"
                      style={{ borderColor: NAVY, color: NAVY }}
                    >
                      Novo PARQ
                    </button>
                    <button
                      disabled={wzWorking || !wzCpf}
                      onClick={() => void assinarClinicaIcp()}
                      className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: NAVY }}
                      data-testid="btn-assinar-icp-final"
                    >
                      {wzWorking ? "Assinando..." : "Assinar ICP-Brasil"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ABA HISTÓRICO ─── */}
        {aba === "historico" && (
          <div data-testid="aba-historico">
            <div className="border rounded-xl bg-white p-4">
              <h3 className="font-bold mb-3" style={{ color: NAVY }}>
                Linha do tempo · mudanças de status
              </h3>
              {Object.values(statusMap).every(
                (s) => (s.historico_status || []).length === 0,
              ) && (
                <div className="text-sm text-gray-500 italic">
                  Nenhuma mudança de status registrada ainda.
                </div>
              )}
              <div className="space-y-2">
                {Object.entries(statusMap).map(([fid, s]) => {
                  const farm = farmacias.find((x) => x.id === Number(fid));
                  if (!s.historico_status?.length) return null;
                  return (
                    <div
                      key={fid}
                      className="border-l-4 pl-3 py-2"
                      style={{ borderColor: GOLD }}
                    >
                      <div
                        className="text-sm font-semibold"
                        style={{ color: NAVY }}
                      >
                        {farm?.nome_fantasia || `Farmácia #${fid}`}
                      </div>
                      {s.historico_status.map((h: any, i: number) => (
                        <div
                          key={i}
                          className="text-xs text-gray-600 flex gap-2 items-center mt-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{fmtData(h.mudado_em)}</span>
                          <span>·</span>
                          <span>
                            {h.status_anterior || "—"} →{" "}
                            <strong>{h.status_novo}</strong>
                          </span>
                          {h.motivo && (
                            <span className="text-gray-400 italic">
                              ({h.motivo})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Banner rodapé legal */}
        <div
          className="mt-8 p-4 rounded-lg text-xs flex items-start gap-3"
          style={{ background: "#FAF6EC", color: NAVY }}
        >
          <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
          <div>
            <div className="font-semibold mb-1">
              Autonomia prescritiva preservada
            </div>
            Esta tela administra Termos de Parceria de Qualidade Técnica (PARQ).
            O PARQ não constitui acordo de comissão por indicação de farmácia
            (vedado pelo art. 27 da Resolução CFM 2.386/2024). A
            contraprestação é vinculada exclusivamente ao serviço técnico de
            auditoria Kaizen bimestral, com entregáveis verificáveis. A
            transparência ao paciente é mantida em /sobre-parcerias-tecnicas.
          </div>
        </div>
      </div>
    </Layout>
  );
}
