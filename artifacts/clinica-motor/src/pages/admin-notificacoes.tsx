/**
 * MENSAGERIA-TSUNAMI Wave 2 · Console admin de notificações WD14.
 *
 * Lista paginada (filtros: status / canal / dia / busca por destinatário/paciente)
 * + ações de reenvio + preview do template branded + config de quiet hours.
 *
 * Cores oficiais: navy #020406 + gold #C89B3C (consistente com o template).
 */

import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { RefreshCw, Send, Eye, Bell, Clock, Save, Search } from "lucide-react";

type NotifRow = {
  id: number;
  canal: "EMAIL" | "WHATSAPP" | "DRIVE";
  momento: string;
  destinatario: string;
  assunto: string | null;
  status: string;
  tentativas: number;
  criado_em: string;
  enviado_em: string | null;
  proxima_tentativa_em: string | null;
  erro: string | null;
  paciente_id: number | null;
  paciente_nome: string | null;
  unidade_nick: string | null;
};

type NotifConfig = {
  id: number;
  quiet_inicio: string;
  quiet_fim: string;
  tz: string;
  habilitar_quiet_hours: boolean;
  atualizado_em: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDENTE:      "bg-amber-500/20 text-amber-300 border-amber-500/40",
  ENVIADO:       "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  FALHA:         "bg-red-500/20 text-red-300 border-red-500/40",
  PULADO_QUIET:  "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  PULADO_OPTOUT: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

const CANAL_BADGE: Record<string, string> = {
  EMAIL:    "bg-blue-500/20 text-blue-300 border-blue-500/40",
  WHATSAPP: "bg-green-500/20 text-green-300 border-green-500/40",
  DRIVE:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export default function AdminNotificacoes() {
  const [rows, setRows] = useState<NotifRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroQ, setFiltroQ] = useState("");
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [statusSummary, setStatusSummary] = useState<{ status: string; n: number }[]>([]);

  // Config quiet hours
  const [config, setConfig] = useState<NotifConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(filtroStatus && { status: filtroStatus }),
      ...(filtroCanal && { canal: filtroCanal }),
      ...(filtroDia && { dia: filtroDia }),
      ...(filtroQ && { q: filtroQ }),
    });
    try {
      const r = await fetch(`/api/admin/notif-assinatura/list?${qs}`, { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setRows(j.rows || []);
        setTotal(j.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtroStatus, filtroCanal, filtroDia, filtroQ]);

  const carregarStatus = useCallback(async () => {
    const r = await fetch("/api/admin/notif-assinatura/status", { credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      setStatusSummary(j.por_status || []);
    }
  }, []);

  const carregarConfig = useCallback(async () => {
    const r = await fetch("/api/admin/notif-config", { credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      setConfig(j.config);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { void carregarStatus(); void carregarConfig(); }, [carregarStatus, carregarConfig]);

  async function reenviar(id: number) {
    if (!confirm(`Reenfileirar notificação #${id}?`)) return;
    setReenviandoId(id);
    try {
      const r = await fetch(`/api/admin/notif-assinatura/${id}/reenviar`, {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) {
        void carregar();
        void carregarStatus();
      } else {
        alert("Erro: " + (await r.text()));
      }
    } finally {
      setReenviandoId(null);
    }
  }

  async function rodarTickAgora() {
    if (!confirm("Rodar 1 tick do worker agora? (processa até 50 PENDENTES)")) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/notif-assinatura/tick", {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json();
      alert(
        `Tick OK\n` +
        `Processadas: ${j.processadas}\n` +
        `Enviadas: ${j.enviadas}\n` +
        `Retry agendado: ${j.retry_agendado}\n` +
        `Falha permanente: ${j.falha_permanente}\n` +
        `Pulado quiet: ${j.pulado_quiet}\n` +
        `Pulado opt-out: ${j.pulado_optout}`
      );
      void carregar();
      void carregarStatus();
    } finally {
      setLoading(false);
    }
  }

  function preview(id: number) {
    window.open(`/api/admin/notif-assinatura/preview/${id}`, "_blank", "noopener");
  }

  async function salvarConfig() {
    if (!config) return;
    setSavingConfig(true);
    try {
      const r = await fetch("/api/admin/notif-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiet_inicio: config.quiet_inicio,
          quiet_fim: config.quiet_fim,
          tz: config.tz,
          habilitar_quiet_hours: config.habilitar_quiet_hours,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        setConfig(j.config);
        alert("Config salva.");
      } else {
        alert("Erro: " + (await r.text()));
      }
    } finally {
      setSavingConfig(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-200">
              <Bell className="w-6 h-6" /> Notificações WD14 — Mensageria
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Console admin do worker de assinatura (Wave 2 MENSAGERIA-TSUNAMI)
            </p>
          </div>
          <button
            onClick={rodarTickAgora}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Rodar Tick Agora
          </button>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["PENDENTE", "ENVIADO", "FALHA", "PULADO_QUIET", "PULADO_OPTOUT"].map((st) => {
            const found = statusSummary.find((s) => s.status === st);
            return (
              <div key={st} className={`px-4 py-3 rounded border ${STATUS_BADGE[st] || "bg-zinc-800 border-zinc-700"}`}>
                <div className="text-xs uppercase tracking-wider opacity-80">{st}</div>
                <div className="text-2xl font-bold">{found?.n ?? 0}</div>
              </div>
            );
          })}
        </div>

        {/* Quiet hours config */}
        {config && (
          <div className="bg-zinc-900/60 border border-amber-500/20 rounded p-4">
            <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Quiet Hours (não enviar emails/WhatsApp neste intervalo)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Início</span>
                <input
                  type="time"
                  value={config.quiet_inicio?.slice(0, 5) || ""}
                  onChange={(e) => setConfig({ ...config, quiet_inicio: e.target.value + ":00" })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Fim</span>
                <input
                  type="time"
                  value={config.quiet_fim?.slice(0, 5) || ""}
                  onChange={(e) => setConfig({ ...config, quiet_fim: e.target.value + ":00" })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Timezone</span>
                <input
                  type="text"
                  value={config.tz}
                  onChange={(e) => setConfig({ ...config, tz: e.target.value })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={config.habilitar_quiet_hours}
                  onChange={(e) => setConfig({ ...config, habilitar_quiet_hours: e.target.checked })}
                  className="w-4 h-4"
                />
                Quiet hours ativo
              </label>
              <button
                onClick={salvarConfig}
                disabled={savingConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> {savingConfig ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-zinc-900/60 border border-zinc-700 rounded p-4 flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Status</span>
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ENVIADO">Enviado</option>
              <option value="FALHA">Falha</option>
              <option value="PULADO_QUIET">Pulado Quiet</option>
              <option value="PULADO_OPTOUT">Pulado Opt-out</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Canal</span>
            <select
              value={filtroCanal}
              onChange={(e) => { setFiltroCanal(e.target.value); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="DRIVE">Drive</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Dia (criação)</span>
            <input
              type="date"
              value={filtroDia}
              onChange={(e) => { setFiltroDia(e.target.value); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-[200px]">
            <span className="text-zinc-400">Busca (destinatário, assunto, paciente)</span>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={filtroQ}
                onChange={(e) => setFiltroQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); void carregar(); } }}
                placeholder="email@... ou nome do paciente"
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-3 py-2 text-white"
              />
            </div>
          </label>
          <button
            onClick={() => { setPage(1); void carregar(); void carregarStatus(); }}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-zinc-900/60 border border-zinc-700 rounded overflow-hidden">
          <div className="px-4 py-2 border-b border-zinc-700 text-sm text-zinc-400 flex items-center justify-between">
            <span>{total} notificações · página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded"
              >‹ Anterior</button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded"
              >Próxima ›</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Canal</th>
                  <th className="px-3 py-2 text-left">Momento</th>
                  <th className="px-3 py-2 text-left">Destinatário</th>
                  <th className="px-3 py-2 text-left">Paciente / Unidade</th>
                  <th className="px-3 py-2 text-left">Tent.</th>
                  <th className="px-3 py-2 text-left">Criado</th>
                  <th className="px-3 py-2 text-left">Enviado</th>
                  <th className="px-3 py-2 text-left">Erro</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={11} className="text-center py-8 text-zinc-500">Carregando...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-8 text-zinc-500">Nenhuma notificação.</td></tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-zinc-500">{row.id}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs border ${STATUS_BADGE[row.status] || "bg-zinc-700 border-zinc-600 text-zinc-300"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs border ${CANAL_BADGE[row.canal] || "bg-zinc-700 border-zinc-600 text-zinc-300"}`}>
                        {row.canal}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-400 text-xs">{row.momento}</td>
                    <td className="px-3 py-2 text-zinc-200 max-w-[200px] truncate" title={row.destinatario}>{row.destinatario}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.paciente_nome || <span className="text-zinc-600">—</span>}
                      {row.unidade_nick && <div className="text-xs text-amber-400/70">{row.unidade_nick}</div>}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{row.tentativas}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(row.criado_em)}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(row.enviado_em)}</td>
                    <td className="px-3 py-2 text-red-400 text-xs max-w-[180px] truncate" title={row.erro || ""}>{row.erro || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {row.canal === "EMAIL" && (
                          <button
                            onClick={() => preview(row.id)}
                            title="Ver template branded"
                            className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-amber-300 rounded"
                          ><Eye className="w-4 h-4" /></button>
                        )}
                        <button
                          onClick={() => reenviar(row.id)}
                          disabled={reenviandoId === row.id}
                          title="Reenfileirar (status → PENDENTE, tentativas → 0)"
                          className="p-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded"
                        ><Send className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
