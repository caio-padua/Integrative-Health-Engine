import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Save, RefreshCw, DollarSign, Plus, Filter } from "lucide-react";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";

type Cobranca = {
  id: number;
  unidade_id: number;
  unidade_nome: string;
  tipo_unidade: string;
  tipo: string;
  descricao: string;
  valor_brl: string | number;
  status: "pendente" | "cobrado" | "pago" | "cancelado";
  referencia_id: number | null;
  referencia_tipo: string | null;
  criado_em: string;
  cobrado_em: string | null;
  pago_em: string | null;
};

type Resumo = { status: string; quantidade: number; total_brl: string | number };

type Unidade = { id: number; nome: string };

const STATUS_COR: Record<string, string> = {
  pendente:  "bg-amber-500/20 text-amber-300 border-amber-500/40",
  cobrado:   "bg-blue-500/20 text-blue-300 border-blue-500/40",
  pago:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  cancelado: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

export default function AdminCobrancasAdicionais() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [filtroUnidade, setFiltroUnidade] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState({ unidade_id: "", tipo: "consultoria", descricao: "", valor_brl: "" });
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroUnidade) params.set("unidade_id", filtroUnidade);
    if (filtroStatus) params.set("status", filtroStatus);
    const r = await fetch(`/api/admin/cobrancas-adicionais?${params.toString()}`, { credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setCobrancas(data.cobrancas ?? []);
      setResumo(data.resumo_por_status ?? []);
    }
    setLoading(false);
  }, [filtroUnidade, filtroStatus]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    fetch("/api/unidades", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((arr: any[]) => setUnidades(arr.map(u => ({ id: u.id, nome: u.nome }))));
  }, []);

  async function criarCobranca() {
    if (!novo.unidade_id || !novo.descricao || !novo.valor_brl) {
      alert("Preencha unidade, descrição e valor");
      return;
    }
    setCriando(true);
    const r = await fetch("/api/admin/cobrancas-adicionais", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unidade_id: Number(novo.unidade_id),
        tipo: novo.tipo,
        descricao: novo.descricao,
        valor_brl: Number(novo.valor_brl),
      }),
    });
    setCriando(false);
    if (r.ok) {
      setNovo({ unidade_id: "", tipo: "consultoria", descricao: "", valor_brl: "" });
      void carregar();
    } else {
      alert("Erro: " + (await r.text()));
    }
  }

  async function mudarStatus(id: number, status: Cobranca["status"]) {
    const r = await fetch(`/api/admin/cobrancas-adicionais/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) void carregar();
  }

  const totalGeral = resumo.reduce((acc, r) => acc + Number(r.total_brl ?? 0), 0);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <BotaoImprimirFlutuante titulo="Admin · Extrato de Cobranças Adicionais" />
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <DollarSign size={28} /> Cobranças Adicionais — Extrato Cobrável
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tudo que Dr. Caio cobra a mais das clínicas: inclusão de substância, consultoria avulsa, módulos extras (CAMPO COBRANÇA #4).
          </p>
        </header>

        {/* RESUMO POR STATUS */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {["pendente","cobrado","pago","cancelado"].map(st => {
            const r = resumo.find(x => x.status === st);
            return (
              <div key={st} className={`p-3 rounded border ${STATUS_COR[st]}`}>
                <div className="text-xs uppercase font-mono opacity-80">{st}</div>
                <div className="text-xl font-bold mt-1">R$ {Number(r?.total_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <div className="text-xs opacity-70">{r?.quantidade ?? 0} lançamento(s)</div>
              </div>
            );
          })}
          <div className="p-3 rounded border border-amber-500/60 bg-amber-500/10">
            <div className="text-xs uppercase font-mono text-amber-300">TOTAL GERAL</div>
            <div className="text-xl font-bold mt-1 text-amber-300">R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-amber-300/60">{cobrancas.length} cobrança(s) listada(s)</div>
          </div>
        </div>

        {/* NOVA COBRANÇA AVULSA — CAMPO #4 */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-300 font-semibold mb-3">
            <Plus size={16}/> Nova cobrança avulsa <span className="text-xs text-amber-400/60">(ex: "consultoria estratégica abril R$ 2.500")</span>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <select
              value={novo.unidade_id}
              onChange={e => setNovo(n => ({ ...n, unidade_id: e.target.value }))}
              className="col-span-3 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            >
              <option value="">Selecione clínica...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select
              value={novo.tipo}
              onChange={e => setNovo(n => ({ ...n, tipo: e.target.value }))}
              className="col-span-2 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            >
              <option value="consultoria">Consultoria</option>
              <option value="modulo_extra">Módulo extra</option>
              <option value="treinamento">Treinamento</option>
              <option value="customizacao">Customização</option>
              <option value="inclusao_substancia">Inclusão de substância</option>
              <option value="outro">Outro</option>
            </select>
            <input
              value={novo.descricao}
              onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))}
              placeholder="Descrição (ex: consultoria estratégica abril)"
              className="col-span-4 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            />
            <div className="col-span-2 flex items-center gap-1">
              <span className="text-xs text-zinc-500">R$</span>
              <input
                type="number" step="0.01" min="0"
                value={novo.valor_brl}
                onChange={e => setNovo(n => ({ ...n, valor_brl: e.target.value }))}
                placeholder="0,00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-right font-mono text-sm"
              />
            </div>
            <button
              disabled={criando}
              onClick={() => void criarCobranca()}
              className="col-span-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded px-3 py-2 text-sm font-semibold flex items-center justify-center gap-1"
            >
              <Save size={14}/>{criando ? "..." : "Criar"}
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <Filter size={14} className="text-zinc-500"/>
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1">
            <option value="">Todas as clínicas</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="cobrado">Cobrado</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={() => void carregar()} className="ml-auto px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-2">
            <RefreshCw size={14}/>Recarregar
          </button>
        </div>

        {/* TABELA EXTRATO */}
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Clínica</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Descrição</th>
                <th className="text-right px-3 py-2">Valor R$</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-center px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && cobrancas.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma cobrança lançada ainda. Use o formulário acima pra criar a primeira (ou ative toggles em /admin/permissoes-delegadas pra geração automática).
                </td></tr>
              )}
              {!loading && cobrancas.map(c => (
                <tr key={c.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                  <td className="px-3 py-2 text-xs text-zinc-400 font-mono">{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-zinc-100">{c.unidade_nome}</div>
                    <div className="text-[10px] text-zinc-500">{c.tipo_unidade}</div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-zinc-400">{c.tipo}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.descricao}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-amber-300">
                    {Number(c.valor_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${STATUS_COR[c.status]}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {c.status === "pendente"  && <button onClick={() => void mudarStatus(c.id, "cobrado")}   className="text-blue-300 hover:underline">→ cobrar</button>}
                    {c.status === "cobrado"   && <button onClick={() => void mudarStatus(c.id, "pago")}      className="text-emerald-300 hover:underline">→ pago</button>}
                    {c.status !== "cancelado" && c.status !== "pago" && <button onClick={() => void mudarStatus(c.id, "cancelado")} className="text-zinc-500 hover:underline ml-2">cancelar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-xs text-zinc-500 space-y-1">
          <div>• <b className="text-amber-400">CAMPO COBRANÇA #4:</b> formulário acima ("+ Nova cobrança avulsa") é onde Dr. Caio lança manualmente cobranças não automáticas.</div>
          <div>• Cobranças automáticas (tipo "inclusao_substancia") nascem aqui sozinhas quando uma clínica com toggle ON inclui substância nova — preço pego de /admin/permissoes-delegadas.</div>
          <div>• Fluxo: PENDENTE → COBRADO (mandou pra clínica) → PAGO (recebeu) ou CANCELADO. Tudo auditado com timestamps.</div>
        </div>
      </div>
    </Layout>
  );
}
