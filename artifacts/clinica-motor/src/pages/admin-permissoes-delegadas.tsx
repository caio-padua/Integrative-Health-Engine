import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Save, RefreshCw, Shield, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";

type Toggle = {
  permissao: string;
  ativo: boolean;
  preco_mensal_brl: string | number;
  preco_inclusao_substancia_brl: string | number;
};

type LinhaClinica = {
  unidade_id: number;
  nome: string;
  tipo_unidade: string;
  ativa: boolean;
  fat_meta_mensal: string | number | null;
  toggles: Toggle[];
};

const PERMISSOES = [
  { key: "editar_catalogo_substancias", label: "Editar catálogo de substâncias",  default_mensal: 297 },
  { key: "editar_bloco_template",       label: "Editar blocos-template",         default_mensal: 297 },
  { key: "editar_parametros_exames",    label: "Editar parâmetros de exames",    default_mensal: 197 },
  { key: "incluir_substancia_nova",     label: "Incluir substância nova",        default_mensal: 0 },
];

export default function AdminPermissoesDelegadas() {
  const [linhas, setLinhas] = useState<LinhaClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvandoKey, setSalvandoKey] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/permissoes-delegadas", { credentials: "include" });
    if (r.ok) setLinhas(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function getToggle(linha: LinhaClinica, permissao: string): Toggle {
    const t = linha.toggles.find(t => t.permissao === permissao);
    if (t) return t;
    const defPerm = PERMISSOES.find(p => p.key === permissao)!;
    return { permissao, ativo: false, preco_mensal_brl: defPerm.default_mensal, preco_inclusao_substancia_brl: 150 };
  }

  async function salvar(linha: LinhaClinica, permissao: string, patch: Partial<Toggle>) {
    const atual = getToggle(linha, permissao);
    const novo = { ...atual, ...patch };
    const key = `${linha.unidade_id}-${permissao}`;
    setSalvandoKey(key);
    const r = await fetch(`/api/admin/permissoes-delegadas/${linha.unidade_id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissao,
        ativo: novo.ativo,
        preco_mensal_brl: Number(novo.preco_mensal_brl),
        preco_inclusao_substancia_brl: Number(novo.preco_inclusao_substancia_brl),
      }),
    });
    setSalvandoKey(null);
    if (r.ok) void carregar();
    else alert("Erro: " + (await r.text()));
  }

  const filtradas = linhas.filter(l => l.nome.toLowerCase().includes(busca.toLowerCase()));

  // Total mensal RECORRENTE: soma de preco_mensal_brl de toggles ATIVOS em todas as clinicas
  const totalRecorrente = filtradas.reduce((acc, l) => {
    return acc + l.toggles.filter(t => t.ativo).reduce((s, t) => s + Number(t.preco_mensal_brl ?? 0), 0);
  }, 0);

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Shield size={28} /> Permissões Delegadas — Toggle de Autonomia + Preço Mensal
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Liga/desliga autonomia da clínica · define quanto cobrar mensal por módulo (CAMPO COBRANÇA #2)
            e por inclusão avulsa de substância (CAMPO COBRANÇA #3).
          </p>
        </header>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Filtrar clínica..."
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-64"
          />
          <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
            <RefreshCw size={16} /> Recarregar
          </button>
          <div className="ml-auto text-sm bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded font-mono">
            Receita recorrente ATIVA: <b className="text-base">R$ {totalRecorrente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>/mês
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-3 py-3 sticky left-0 bg-zinc-800/80">Clínica</th>
                {PERMISSOES.map(p => (
                  <th key={p.key} className="text-center px-3 py-3 min-w-[180px] border-l border-zinc-700">
                    {p.label}
                  </th>
                ))}
                <th className="text-center px-3 py-3 border-l border-amber-500/40 min-w-[140px] bg-amber-500/10">
                  <DollarSign size={12} className="inline"/> Inclusão avulsa<br/>
                  <span className="text-xs text-zinc-500">(R$ por substância)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && filtradas.map(l => {
                const inclusaoToggle = getToggle(l, "incluir_substancia_nova");
                return (
                  <tr key={l.unidade_id} className="border-t border-zinc-800">
                    <td className="px-3 py-3 sticky left-0 bg-zinc-900/95">
                      <div className="font-semibold text-zinc-100">{l.nome}</div>
                      <div className="text-xs text-zinc-500">{l.tipo_unidade}</div>
                    </td>
                    {PERMISSOES.map(p => {
                      const t = getToggle(l, p.key);
                      const key = `${l.unidade_id}-${p.key}`;
                      const salvando = salvandoKey === key;
                      return (
                        <td key={p.key} className="px-3 py-3 border-l border-zinc-800">
                          <div className="flex flex-col gap-2">
                            <button
                              disabled={salvando}
                              onClick={() => void salvar(l, p.key, { ativo: !t.ativo })}
                              className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                                t.ativo ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700/50 text-zinc-400"
                              }`}
                            >
                              {t.ativo ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                              {t.ativo ? "ATIVO" : "OFF"}
                            </button>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">R$</span>
                              <input
                                type="number" step="0.01" min="0"
                                defaultValue={String(t.preco_mensal_brl ?? 0)}
                                onBlur={e => {
                                  const v = Number(e.target.value);
                                  if (v !== Number(t.preco_mensal_brl)) void salvar(l, p.key, { preco_mensal_brl: v });
                                }}
                                className="w-20 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-right font-mono text-xs"
                              />
                              <span className="text-xs text-zinc-500">/mês</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 border-l border-amber-500/40 bg-amber-500/5">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-zinc-500">R$</span>
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={String(inclusaoToggle.preco_inclusao_substancia_brl ?? 150)}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (v !== Number(inclusaoToggle.preco_inclusao_substancia_brl)) {
                              void salvar(l, "incluir_substancia_nova", { preco_inclusao_substancia_brl: v });
                            }
                          }}
                          className="w-20 bg-zinc-800 border border-amber-500/40 rounded px-1 py-1 text-right font-mono text-sm text-amber-300"
                        />
                      </div>
                      <div className="text-center text-[10px] text-amber-300/60 mt-1">por inclusão</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-xs text-zinc-500 space-y-1">
          <div>• <b className="text-amber-400">CAMPO COBRANÇA #2:</b> input "R$ /mês" abaixo de cada toggle = quanto Dr. Caio cobra mensalmente quando a clínica tem aquela autonomia ATIVA.</div>
          <div>• <b className="text-amber-400">CAMPO COBRANÇA #3:</b> coluna dourada "Inclusão avulsa" = quanto cobra POR cada substância nova que a clínica inclui. Default R$ 150.</div>
          <div>• Toggle OFF = o gestor da clínica vê o botão mas recebe mensagem "Solicite ao Dr. Caio a ativação".</div>
          <div>• Toggle ON = a clínica usa o módulo livremente, e CADA inclusão dispara automaticamente uma linha em <b>/admin/cobrancas-adicionais</b>.</div>
        </div>
      </div>
    </Layout>
  );
}
