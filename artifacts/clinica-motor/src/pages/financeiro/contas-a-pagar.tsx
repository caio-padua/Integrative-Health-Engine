import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Save, RefreshCw, Wallet, Plus, Filter, CheckCircle2, X } from "lucide-react";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import { apiFetch } from "@/lib/api-fetch";

// Task #226 — Tela pro Caio cadastrar contas a pagar.
// Lista + cria + edita + marca como paga. Apos marcar paga, o card
// "Fluxo de Caixa 30d" no dashboard global ja le dessa tabela e
// passa a mostrar o numero real (substitui a heuristica antiga 0.58 *
// entradas, removida na migration 050).

type Conta = {
  id: number;
  unidade_id: number | null;
  unidade_nome: string | null;
  categoria: "folha" | "magistral" | "operacional" | "outros";
  descricao: string;
  fornecedor: string | null;
  valor_brl: string | number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: "aberto" | "pago" | "cancelado";
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type Resumo = {
  status: string;
  categoria: string;
  quantidade: number;
  total_brl: string | number;
};

type Unidade = { id: number; nome: string };

const CATEGORIAS = [
  { value: "folha", label: "Folha (salarios, encargos)" },
  { value: "magistral", label: "Magistral (custo manipuladora)" },
  { value: "operacional", label: "Operacional (aluguel, energia, marketing)" },
  { value: "outros", label: "Outros" },
] as const;

const STATUS_COR: Record<string, string> = {
  aberto: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  pago: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  cancelado: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

const CATEGORIA_COR: Record<string, string> = {
  folha: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  magistral: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  operacional: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  outros: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function fmtBRL(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(d: string | null | undefined): string {
  if (!d) return "—";
  const ymd = String(d).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

const NOVO_VAZIO = {
  unidade_id: "",
  categoria: "operacional",
  descricao: "",
  fornecedor: "",
  valor_brl: "",
  data_vencimento: "",
  data_pagamento: "",
  observacao: "",
};

export default function ContasAPagarPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [novo, setNovo] = useState({ ...NOVO_VAZIO });
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroUnidade) params.set("unidade_id", filtroUnidade);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (filtroStatus) params.set("status", filtroStatus);
    const r = await apiFetch(`/api/contas-a-pagar?${params.toString()}`, { credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setContas(data.contas ?? []);
      setResumo(data.resumo ?? []);
    }
    setLoading(false);
  }, [filtroUnidade, filtroCategoria, filtroStatus]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    apiFetch("/api/unidades", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: any[]) => setUnidades((arr ?? []).map((u) => ({ id: u.id, nome: u.nome }))));
  }, []);

  async function criar() {
    if (!novo.descricao.trim() || !novo.valor_brl) {
      alert("Preencha descricao e valor");
      return;
    }
    setCriando(true);
    const body: any = {
      categoria: novo.categoria,
      descricao: novo.descricao.trim(),
      valor_brl: Number(novo.valor_brl),
    };
    if (novo.unidade_id) body.unidade_id = Number(novo.unidade_id);
    if (novo.fornecedor.trim()) body.fornecedor = novo.fornecedor.trim();
    if (novo.data_vencimento) body.data_vencimento = novo.data_vencimento;
    if (novo.data_pagamento) body.data_pagamento = novo.data_pagamento;
    if (novo.observacao.trim()) body.observacao = novo.observacao.trim();

    const r = await apiFetch("/api/contas-a-pagar", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setCriando(false);
    if (r.ok) {
      setNovo({ ...NOVO_VAZIO });
      void carregar();
    } else {
      alert("Erro: " + (await r.text()));
    }
  }

  async function marcarPaga(id: number) {
    const r = await apiFetch(`/api/contas-a-pagar/${id}/marcar-paga`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (r.ok) void carregar();
    else alert("Erro: " + (await r.text()));
  }

  async function mudarStatus(id: number, status: Conta["status"]) {
    const r = await apiFetch(`/api/contas-a-pagar/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) void carregar();
    else alert("Erro: " + (await r.text()));
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvandoEdicao(true);
    const body: any = {
      unidade_id: editando.unidade_id,
      categoria: editando.categoria,
      descricao: editando.descricao,
      fornecedor: editando.fornecedor,
      valor_brl: Number(editando.valor_brl),
      data_vencimento: editando.data_vencimento,
      data_pagamento: editando.data_pagamento,
      status: editando.status,
      observacao: editando.observacao,
    };
    const r = await apiFetch(`/api/contas-a-pagar/${editando.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSalvandoEdicao(false);
    if (r.ok) {
      setEditando(null);
      void carregar();
    } else {
      alert("Erro: " + (await r.text()));
    }
  }

  // Resumo de saidas reais (status='pago') por categoria — espelha a
  // logica do card Fluxo de Caixa 30d (somente pago entra no grafico).
  const totalPago = resumo
    .filter((r) => r.status === "pago")
    .reduce((acc, r) => acc + Number(r.total_brl ?? 0), 0);
  const totalAberto = resumo
    .filter((r) => r.status === "aberto")
    .reduce((acc, r) => acc + Number(r.total_brl ?? 0), 0);
  const breakdown: Record<string, number> = { folha: 0, magistral: 0, operacional: 0, outros: 0 };
  for (const r of resumo) {
    if (r.status === "pago") {
      breakdown[r.categoria] = (breakdown[r.categoria] ?? 0) + Number(r.total_brl ?? 0);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <BotaoImprimirFlutuante titulo="Financeiro · Contas a Pagar" />
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Wallet size={28} /> Contas a Pagar
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Folha, custos magistrais pagos a manipuladora e despesas operacionais.
            Lancamentos com <span className="text-emerald-300">status = pago</span> e{" "}
            <span className="text-emerald-300">data de pagamento preenchida</span> alimentam o
            card &ldquo;Fluxo de Caixa 30d&rdquo; no dashboard global.
          </p>
        </header>

        {/* RESUMO PAGO POR CATEGORIA */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {(["folha", "magistral", "operacional", "outros"] as const).map((cat) => (
            <div key={cat} className={`p-3 rounded border ${CATEGORIA_COR[cat]}`}>
              <div className="text-xs uppercase font-mono opacity-80">{cat} pago</div>
              <div className="text-lg font-bold mt-1 font-mono">R$ {fmtBRL(breakdown[cat])}</div>
            </div>
          ))}
          <div className="p-3 rounded border border-emerald-500/60 bg-emerald-500/10">
            <div className="text-xs uppercase font-mono text-emerald-300">total pago</div>
            <div className="text-lg font-bold mt-1 text-emerald-300 font-mono">R$ {fmtBRL(totalPago)}</div>
          </div>
          <div className="p-3 rounded border border-amber-500/60 bg-amber-500/10">
            <div className="text-xs uppercase font-mono text-amber-300">total em aberto</div>
            <div className="text-lg font-bold mt-1 text-amber-300 font-mono">R$ {fmtBRL(totalAberto)}</div>
          </div>
        </div>

        {/* NOVO LANÇAMENTO */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-300 font-semibold mb-3">
            <Plus size={16} /> Novo lancamento
            <span className="text-xs text-amber-400/60">
              (preencha &ldquo;data de pagamento&rdquo; pra ja entrar no fluxo de caixa)
            </span>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <select
              value={novo.unidade_id}
              onChange={(e) => setNovo((n) => ({ ...n, unidade_id: e.target.value }))}
              className="col-span-3 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            >
              <option value="">Sem unidade (geral)</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select
              value={novo.categoria}
              onChange={(e) => setNovo((n) => ({ ...n, categoria: e.target.value }))}
              className="col-span-3 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            >
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              value={novo.descricao}
              onChange={(e) => setNovo((n) => ({ ...n, descricao: e.target.value }))}
              placeholder="Descricao (ex: Folha enfermagem maio/2026)"
              className="col-span-4 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            />
            <div className="col-span-2 flex items-center gap-1">
              <span className="text-xs text-zinc-500">R$</span>
              <input
                type="number" step="0.01" min="0"
                value={novo.valor_brl}
                onChange={(e) => setNovo((n) => ({ ...n, valor_brl: e.target.value }))}
                placeholder="0,00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-right font-mono text-sm"
              />
            </div>
            <input
              value={novo.fornecedor}
              onChange={(e) => setNovo((n) => ({ ...n, fornecedor: e.target.value }))}
              placeholder="Fornecedor (opcional)"
              className="col-span-3 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            />
            <label className="col-span-2 flex flex-col text-xs text-zinc-500">
              Vencimento
              <input
                type="date"
                value={novo.data_vencimento}
                onChange={(e) => setNovo((n) => ({ ...n, data_vencimento: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
              />
            </label>
            <label className="col-span-2 flex flex-col text-xs text-zinc-500">
              Pagamento
              <input
                type="date"
                value={novo.data_pagamento}
                onChange={(e) => setNovo((n) => ({ ...n, data_pagamento: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
              />
            </label>
            <input
              value={novo.observacao}
              onChange={(e) => setNovo((n) => ({ ...n, observacao: e.target.value }))}
              placeholder="Observacao (opcional)"
              className="col-span-4 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
            />
            <button
              disabled={criando}
              onClick={() => void criar()}
              className="col-span-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded px-3 py-2 text-sm font-semibold flex items-center justify-center gap-1"
            >
              <Save size={14} />{criando ? "..." : "Criar"}
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={filtroUnidade}
            onChange={(e) => setFiltroUnidade(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
          >
            <option value="">Todas as unidades</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
          >
            <option value="">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button
            onClick={() => void carregar()}
            className="ml-auto px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-2"
          >
            <RefreshCw size={14} />Recarregar
          </button>
        </div>

        {/* TABELA */}
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-3 py-2">Vencimento</th>
                <th className="text-left px-3 py-2">Pagamento</th>
                <th className="text-left px-3 py-2">Unidade</th>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Descricao</th>
                <th className="text-left px-3 py-2">Fornecedor</th>
                <th className="text-right px-3 py-2">Valor R$</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-center px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>
              )}
              {!loading && contas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    Nenhuma conta cadastrada com esse filtro. Use o formulario acima pra registrar
                    folha, custo magistral pago ou despesa operacional.
                  </td>
                </tr>
              )}
              {!loading && contas.map((c) => (
                <tr key={c.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                  <td className="px-3 py-2 font-mono text-xs">{fmtData(c.data_vencimento)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-emerald-300">{fmtData(c.data_pagamento)}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.unidade_nome ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${CATEGORIA_COR[c.categoria]}`}>
                      {c.categoria}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-200">{c.descricao}</td>
                  <td className="px-3 py-2 text-zinc-400">{c.fornecedor ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtBRL(c.valor_brl)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COR[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {c.status !== "pago" && (
                      <button
                        onClick={() => void marcarPaga(c.id)}
                        title="Marcar como paga (entra no fluxo de caixa)"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 mr-1"
                      >
                        <CheckCircle2 size={12} /> Pagar
                      </button>
                    )}
                    <button
                      onClick={() => setEditando(c)}
                      className="inline-flex items-center px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 mr-1"
                    >
                      Editar
                    </button>
                    {c.status !== "cancelado" && (
                      <button
                        onClick={() => void mudarStatus(c.id, "cancelado")}
                        className="inline-flex items-center px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL EDIÇÃO */}
        {editando && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full p-6 relative">
              <button
                onClick={() => setEditando(null)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
              <h2 className="text-lg font-bold text-amber-400 mb-4">Editar conta #{editando.id}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1 col-span-2">
                  <span className="text-xs text-zinc-400">Descricao</span>
                  <input
                    value={editando.descricao}
                    onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Unidade</span>
                  <select
                    value={editando.unidade_id ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        unidade_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  >
                    <option value="">Sem unidade (geral)</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Categoria</span>
                  <select
                    value={editando.categoria}
                    onChange={(e) => setEditando({ ...editando, categoria: e.target.value as Conta["categoria"] })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  >
                    {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Fornecedor</span>
                  <input
                    value={editando.fornecedor ?? ""}
                    onChange={(e) => setEditando({ ...editando, fornecedor: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Valor R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={String(editando.valor_brl ?? "")}
                    onChange={(e) => setEditando({ ...editando, valor_brl: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-right font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Vencimento</span>
                  <input
                    type="date"
                    value={editando.data_vencimento ? String(editando.data_vencimento).slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditando({ ...editando, data_vencimento: e.target.value || null })
                    }
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Data de pagamento</span>
                  <input
                    type="date"
                    value={editando.data_pagamento ? String(editando.data_pagamento).slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditando({ ...editando, data_pagamento: e.target.value || null })
                    }
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Status</span>
                  <select
                    value={editando.status}
                    onChange={(e) =>
                      setEditando({ ...editando, status: e.target.value as Conta["status"] })
                    }
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2"
                  >
                    <option value="aberto">Aberto</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 col-span-2">
                  <span className="text-xs text-zinc-400">Observacao</span>
                  <textarea
                    value={editando.observacao ?? ""}
                    onChange={(e) => setEditando({ ...editando, observacao: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 min-h-[60px]"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setEditando(null)}
                  className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
                >
                  Fechar
                </button>
                <button
                  disabled={salvandoEdicao}
                  onClick={() => void salvarEdicao()}
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold flex items-center gap-2"
                >
                  <Save size={14} />{salvandoEdicao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
