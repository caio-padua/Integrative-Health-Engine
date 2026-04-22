import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Save, RefreshCw, Building2, Power, PowerOff, Target } from "lucide-react";

type Unidade = {
  id: number;
  nome: string;
  tipo_unidade: "LABORATORIO_MESTRE" | "CLINICA_OPERACIONAL" | "CLINICA_PARCEIRA";
  ativa: boolean;
  fat_meta_mensal: string | number | null;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
};

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  LABORATORIO_MESTRE:  { label: "LABORATÓRIO MESTRE",  color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  CLINICA_OPERACIONAL: { label: "CLÍNICA OPERACIONAL", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  CLINICA_PARCEIRA:    { label: "CLÍNICA PARCEIRA",    color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" },
};

export default function AdminClinicas() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, Partial<Unidade>>>({});
  const [incluirArquivadas, setIncluirArquivadas] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const url = `/api/unidades${incluirArquivadas ? "?incluirArquivadas=true" : ""}`;
    const r = await fetch(url, { credentials: "include" });
    if (r.ok) setUnidades(await r.json());
    setLoading(false);
  }, [incluirArquivadas]);

  useEffect(() => { void carregar(); }, [carregar]);

  function patch(id: number, patch: Partial<Unidade>) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function salvar(u: Unidade) {
    const e = edits[u.id];
    if (!e) return;
    setSavingId(u.id);
    const r = await fetch(`/api/unidades/${u.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, ...e }),
    });
    setSavingId(null);
    if (r.ok) {
      setEdits(prev => { const n = { ...prev }; delete n[u.id]; return n; });
      void carregar();
    } else {
      alert("Erro ao salvar: " + (await r.text()));
    }
  }

  const totalMeta = unidades
    .filter(u => u.ativa && u.tipo_unidade === "CLINICA_PARCEIRA")
    .reduce((acc, u) => {
      const v = Number(edits[u.id]?.fat_meta_mensal ?? u.fat_meta_mensal ?? 0);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <Building2 size={28} /> Gestão de Clínicas
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Liga/desliga acesso · define meta mensal de faturamento (CAMPO COBRANÇA #1)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              <input type="checkbox" checked={incluirArquivadas} onChange={e => setIncluirArquivadas(e.target.checked)} />
              incluir arquivadas
            </label>
            <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
              <RefreshCw size={16} /> Recarregar
            </button>
          </div>
        </header>

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Clínica</th>
                <th className="text-left px-4 py-3">Tipo na Hierarquia</th>
                <th className="text-center px-4 py-3">Acesso</th>
                <th className="text-right px-4 py-3 flex items-center justify-end gap-1"><Target size={14}/> Meta R$/mês</th>
                <th className="text-center px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && unidades.map(u => {
                const e = edits[u.id] ?? {};
                const ativaAtual = e.ativa ?? u.ativa;
                const metaAtual = e.fat_meta_mensal ?? u.fat_meta_mensal ?? 0;
                const dirty = Object.keys(e).length > 0;
                const tipo = TIPO_LABEL[u.tipo_unidade] ?? TIPO_LABEL.CLINICA_PARCEIRA;
                return (
                  <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{u.nome}</div>
                      <div className="text-xs text-zinc-500">id {u.id} · {u.cidade ?? "—"}/{u.estado ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono border ${tipo.color}`}>
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => patch(u.id, { ativa: !ativaAtual })}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-mono ${
                          ativaAtual ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {ativaAtual ? <><Power size={12}/> ATIVA</> : <><PowerOff size={12}/> PAUSADA</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number" step="0.01" min="0"
                        value={String(metaAtual ?? "")}
                        onChange={ev => patch(u.id, { fat_meta_mensal: ev.target.value as any })}
                        className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-right font-mono"
                        placeholder="0,00"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={!dirty || savingId === u.id}
                        onClick={() => void salvar(u)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs ${
                          dirty ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        <Save size={12}/> {savingId === u.id ? "Salvando..." : "Salvar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-zinc-800/30 border-t-2 border-amber-500/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-zinc-400 font-semibold">
                  Total de meta mensal das clínicas parceiras ativas:
                </td>
                <td className="px-4 py-3 text-right text-amber-400 font-mono font-bold text-base">
                  R$ {totalMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 text-xs text-zinc-500 space-y-1">
          <div>• <b className="text-amber-400">CAMPO COBRANÇA #1:</b> coluna "Meta R$/mês" é onde Dr. Caio define quanto cada clínica deve faturar/mês (base do contrato).</div>
          <div>• Toggle ATIVA/PAUSADA bloqueia acesso sem apagar dados (regra: dados sagrados, nunca se perde nada).</div>
          <div>• Para LIGAR autonomias (PARMAVAULT, incluir substância etc) e cobrar mensal a mais, vá em <b>/admin/permissoes-delegadas</b>.</div>
          <div>• Para lançar cobrança avulsa (ex: consultoria estratégica abril R$ 2.500), vá em <b>/admin/cobrancas-adicionais</b>.</div>
        </div>
      </div>
    </Layout>
  );
}
