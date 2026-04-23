import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { RefreshCw, AlertTriangle, Send, Filter } from "lucide-react";

type Linha = {
  pagamento_id: number;
  paciente_id: number;
  paciente_nome: string;
  unidade_nome: string;
  tratamento_nome: string;
  total_tratamento: number;
  valor_devido: number;
  parcela: number | null;
  total_parcelas: number | null;
  criado_em: string;
  dias_atraso: number;
  ultima_tentativa_em: string | null;
  gateway_name: string | null;
};

type Resp = {
  ok: boolean;
  total: number;
  total_devido_brl: number;
  buckets: { ate_7: number; de_8_30: number; de_31_60: number; acima_60: number };
  linhas: Linha[];
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const corDias = (d: number) =>
  d <= 7
    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
    : d <= 30
    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
    : d <= 60
    ? "bg-red-500/20 text-red-300 border-red-500/40"
    : "bg-rose-700/30 text-rose-200 border-rose-600/50";

export default function AdminInadimplencia() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasMin, setDiasMin] = useState<string>("0");
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/inadimplencia?dias_min=${diasMin || 0}`, {
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setData(j as Resp);
    } catch (e) {
      setMsg(`Erro ao carregar: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [diasMin]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function reenviar(cobrancaId: number) {
    setReenviandoId(cobrancaId);
    setMsg("");
    try {
      const r = await fetch(
        `/api/admin/inadimplencia/${cobrancaId}/reenviar`,
        { method: "POST", credentials: "include" }
      );
      const j = await r.json();
      if (j.ok) {
        setMsg(`Email reenviado com sucesso (cobrança #${cobrancaId}).`);
      } else {
        setMsg(`Falha ao reenviar #${cobrancaId}: ${j.motivo || j.error}`);
      }
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setReenviandoId(null);
    }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-[#C89B3C]" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Inadimplência</h1>
            <p className="text-sm text-zinc-400">
              Pagamentos pendentes ordenados por dias de atraso. Reenvie cobranças
              direto pra o paciente via email branded MEDCORE.
            </p>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card titulo="Total devido" valor={fmtBRL(data.total_devido_brl)} destaque />
            <Card titulo="≤ 7 dias"     valor={String(data.buckets.ate_7)} />
            <Card titulo="8 a 30"      valor={String(data.buckets.de_8_30)} />
            <Card titulo="31 a 60"     valor={String(data.buckets.de_31_60)} />
            <Card titulo="> 60 dias"   valor={String(data.buckets.acima_60)} alerta />
          </div>
        )}

        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <Filter size={16} className="text-zinc-400" />
          <label className="text-sm text-zinc-300">Dias mínimos de atraso:</label>
          <input
            type="number"
            min={0}
            value={diasMin}
            onChange={(e) => setDiasMin(e.target.value)}
            className="w-24 bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded"
          />
          <button
            onClick={() => void carregar()}
            className="ml-auto flex items-center gap-2 bg-[#C89B3C] hover:bg-[#B08A30] text-[#020406] font-semibold px-4 py-2 rounded"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {msg && (
          <div className="bg-zinc-900 border border-[#C89B3C]/40 text-[#C89B3C] px-4 py-2 rounded">
            {msg}
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Unidade</th>
                <th className="text-left px-4 py-3">Tratamento</th>
                <th className="text-right px-4 py-3">Valor devido</th>
                <th className="text-center px-4 py-3">Dias atraso</th>
                <th className="text-left px-4 py-3">Última tentativa</th>
                <th className="text-center px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Carregando…</td></tr>
              ) : !data || data.linhas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Nenhuma pendência encontrada.</td></tr>
              ) : (
                data.linhas.map((l) => (
                  <tr key={l.pagamento_id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white">{l.paciente_nome}</td>
                    <td className="px-4 py-3 text-zinc-300">{l.unidade_nome}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {l.tratamento_nome}
                      {l.parcela && l.total_parcelas ? (
                        <span className="text-xs text-zinc-500 ml-1">
                          ({l.parcela}/{l.total_parcelas})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{fmtBRL(l.valor_devido)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded border text-xs ${corDias(l.dias_atraso)}`}>
                        {l.dias_atraso}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {l.ultima_tentativa_em
                        ? new Date(l.ultima_tentativa_em).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => void reenviar(l.pagamento_id)}
                        disabled={reenviandoId === l.pagamento_id}
                        className="inline-flex items-center gap-1 bg-[#C89B3C]/20 hover:bg-[#C89B3C]/40 border border-[#C89B3C]/50 text-[#C89B3C] px-3 py-1 rounded text-xs"
                        title="Reenviar email cobrança branded MEDCORE"
                      >
                        <Send size={12} />
                        {reenviandoId === l.pagamento_id ? "Enviando…" : "Reenviar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function Card({ titulo, valor, destaque, alerta }: { titulo: string; valor: string; destaque?: boolean; alerta?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        destaque
          ? "bg-[#C89B3C]/10 border-[#C89B3C]/40"
          : alerta
          ? "bg-rose-900/20 border-rose-700/40"
          : "bg-zinc-900/50 border-zinc-800"
      }`}
    >
      <div className="text-xs uppercase text-zinc-400">{titulo}</div>
      <div className={`text-2xl font-bold mt-1 ${destaque ? "text-[#C89B3C]" : "text-white"}`}>{valor}</div>
    </div>
  );
}
