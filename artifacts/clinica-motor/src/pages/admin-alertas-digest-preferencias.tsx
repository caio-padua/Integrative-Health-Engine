/**
 * Task #239 — Tela admin pro Caio configurar quais blocos do digest
 * diario cada gestor recebe (clinicas / KPIs / pendencias).
 *
 * GET  /api/admin/alertas-digest-preferencias  → uniao envs + persistidas
 * PUT  /api/admin/alertas-digest-preferencias  → upsert por email
 * DELETE /api/admin/alertas-digest-preferencias/:email → volta ao default "tudo"
 */

import { useCallback, useEffect, useState } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { Mail, RefreshCw, Save, Trash2, Plus } from "lucide-react";

interface PreferenciaRow {
  destinatarioEmail: string;
  nome: string | null;
  recebeClinicas: boolean;
  recebeKpis: boolean;
  recebePendencias: boolean;
  observacao: string | null;
  atualizadoEm: string | null;
  configuradoEnv: boolean;
  persistido: boolean;
}

export default function AdminAlertasDigestPreferencias() {
  const [rows, setRows] = useState<PreferenciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [novoEmail, setNovoEmail] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/admin/alertas-digest-preferencias", {
        credentials: "include",
      });
      if (r.ok) {
        const j = await r.json();
        setRows(j.preferencias || []);
      } else {
        alert("Erro ao carregar: " + (await r.text()));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function setRow(email: string, patch: Partial<PreferenciaRow>) {
    setRows((prev) => prev.map((r) =>
      r.destinatarioEmail === email ? { ...r, ...patch } : r,
    ));
  }

  async function salvar(row: PreferenciaRow) {
    if (!row.recebeClinicas && !row.recebeKpis && !row.recebePendencias) {
      alert("Pelo menos um bloco precisa estar ativo.");
      return;
    }
    setSavingEmail(row.destinatarioEmail);
    try {
      const r = await apiFetch("/api/admin/alertas-digest-preferencias", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatarioEmail: row.destinatarioEmail,
          nome: row.nome,
          recebeClinicas: row.recebeClinicas,
          recebeKpis: row.recebeKpis,
          recebePendencias: row.recebePendencias,
          observacao: row.observacao,
        }),
      });
      if (r.ok) {
        await carregar();
      } else {
        alert("Erro ao salvar: " + (await r.text()));
      }
    } finally {
      setSavingEmail(null);
    }
  }

  async function remover(email: string) {
    if (!confirm(`Remover preferencia de ${email}? Volta ao default (recebe tudo).`)) return;
    setSavingEmail(email);
    try {
      const r = await apiFetch(
        `/api/admin/alertas-digest-preferencias/${encodeURIComponent(email)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (r.ok) {
        await carregar();
      } else {
        alert("Erro: " + (await r.text()));
      }
    } finally {
      setSavingEmail(null);
    }
  }

  function adicionar() {
    const email = novoEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Email invalido.");
      return;
    }
    if (rows.some((r) => r.destinatarioEmail === email)) {
      alert("Esse email ja esta na lista.");
      return;
    }
    setRows((prev) => [...prev, {
      destinatarioEmail: email,
      nome: "",
      recebeClinicas: true,
      recebeKpis: true,
      recebePendencias: true,
      observacao: "",
      atualizadoEm: null,
      configuradoEnv: false,
      persistido: false,
    }]);
    setNovoEmail("");
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-200">
              <Mail className="w-6 h-6" /> Preferencias do Digest Diario
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Task #239 — escolha por gestor quais blocos do email de alertas
              ele recebe (clinicas abaixo do minimo, KPIs fora da faixa,
              pendencias abertas). Sem preferencia salva = recebe tudo.
            </p>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-700 rounded p-4 flex gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm flex-1">
            <span className="text-zinc-400">Adicionar destinatario novo</span>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
              placeholder="gerente@clinica.com.br"
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </label>
          <button
            onClick={adicionar}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-700 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-center">Clinicas</th>
                  <th className="px-3 py-2 text-center">KPIs</th>
                  <th className="px-3 py-2 text-center">Pendencias</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Carregando...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Nenhum destinatario configurado.</td></tr>
                )}
                {rows.map((row) => (
                  <tr key={row.destinatarioEmail} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-zinc-200">{row.destinatarioEmail}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.nome ?? ""}
                        onChange={(e) => setRow(row.destinatarioEmail, { nome: e.target.value })}
                        placeholder="—"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.recebeClinicas}
                        onChange={(e) => setRow(row.destinatarioEmail, { recebeClinicas: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.recebeKpis}
                        onChange={(e) => setRow(row.destinatarioEmail, { recebeKpis: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.recebePendencias}
                        onChange={(e) => setRow(row.destinatarioEmail, { recebePendencias: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex flex-col gap-0.5">
                        {row.configuradoEnv && (
                          <span className="text-amber-400/80">env</span>
                        )}
                        {row.persistido ? (
                          <span className="text-emerald-400/80">salvo</span>
                        ) : (
                          <span className="text-zinc-500">default (tudo)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => salvar(row)}
                          disabled={savingEmail === row.destinatarioEmail}
                          title="Salvar preferencia"
                          className="p-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded"
                        ><Save className="w-4 h-4" /></button>
                        {row.persistido && (
                          <button
                            onClick={() => remover(row.destinatarioEmail)}
                            disabled={savingEmail === row.destinatarioEmail}
                            title="Remover (volta ao default)"
                            className="p-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded"
                          ><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-zinc-500 leading-relaxed">
          <p><strong className="text-zinc-400">Como funciona:</strong> o digest diario (Task #26)
          calcula 3 blocos a cada manha. Pra cada destinatario, sao filtrados
          os blocos marcados aqui antes de gerar o email. Se um destinatario
          ficar sem nenhum bloco aplicavel num dia, ele nao recebe email
          naquele dia. Destinatarios sem linha persistida recebem os 3
          blocos (comportamento legado preservado).</p>
        </div>
      </div>
    </Layout>
  );
}
