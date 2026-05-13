import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { Building2, Power, PowerOff, RefreshCw, ShieldAlert } from "lucide-react";

type Clinica = {
  id: number;
  nome: string;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  tipo: string;
  ativa: boolean;
  status: "ATIVO" | "SUSPENSO" | "EXCLUIDO_PENDENTE" | "EXCLUIDO";
  suspenso_em: string | null;
  suspenso_por_usuario_id: number | null;
  suspensao_motivo: string | null;
  suspenso_por_nome: string | null;
};

const STATUS_COR: Record<string, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  SUSPENSO: "bg-red-500/20 text-red-300 border-red-500/40",
  EXCLUIDO_PENDENTE: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  EXCLUIDO: "bg-zinc-700/50 text-zinc-400 border-zinc-600",
};

export default function PlataformaClinicas() {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await apiFetch("/api/plataforma/clinicas", { credentials: "include" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    setClinicas(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function executar(c: Clinica, acao: "suspender" | "reativar") {
    const verbo = acao === "suspender" ? "SUSPENDER" : "REATIVAR";
    const motivo = window.prompt(
      `Motivo para ${verbo} a clinica "${c.nome}" (id ${c.id}).\nMinimo 8 caracteres. Sera registrado em auditoria_kill_switch.`,
    );
    if (!motivo || motivo.trim().length < 8) {
      if (motivo !== null) alert("Motivo precisa ter pelo menos 8 caracteres.");
      return;
    }
    setAcaoId(c.id);
    const r = await apiFetch(`/api/plataforma/clinicas/${c.id}/${acao}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    setAcaoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    await carregar();
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <Building2 size={28} /> Plataforma · Clinicas
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Suspende ou reativa o acesso de uma clinica inteira. Acao kill-switch
              registrada com IP/UA em <code>auditoria_kill_switch</code>.
            </p>
          </div>
          <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
            <RefreshCw size={16} /> Recarregar
          </button>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Acesso negado / falha</div>
              <div className="text-sm">{erro}</div>
              <div className="text-xs text-red-400/80 mt-1">
                Esta tela exige perfil <code>platform_owner</code> e 2FA recente (&lt;8h).
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Suspensao</th>
                <th className="text-center px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && clinicas.length === 0 && !erro && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Nenhuma clinica encontrada.</td></tr>
              )}
              {!loading && clinicas.map(c => {
                const cor = STATUS_COR[c.status] ?? STATUS_COR.ATIVO;
                const suspendido = c.status === "SUSPENSO";
                const podeAlterar = c.tipo !== "genesis_seed";
                return (
                  <tr key={c.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{c.nome}</div>
                      <div className="text-xs text-zinc-500">
                        id {c.id} · {c.cidade ?? "—"}/{c.estado ?? "—"} · {c.tipo}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono border ${cor}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {suspendido ? (
                        <>
                          <div>em {c.suspenso_em ? new Date(c.suspenso_em).toLocaleString("pt-BR") : "—"}</div>
                          <div>por {c.suspenso_por_nome ?? `usuario ${c.suspenso_por_usuario_id ?? "?"}`}</div>
                          <div className="italic mt-1">"{c.suspensao_motivo ?? "—"}"</div>
                        </>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!podeAlterar ? (
                        <span className="text-xs text-zinc-500 italic">Genesis (protegido)</span>
                      ) : suspendido ? (
                        <button
                          disabled={acaoId === c.id}
                          onClick={() => void executar(c, "reativar")}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          <Power size={12} /> Reativar
                        </button>
                      ) : (
                        <button
                          disabled={acaoId === c.id}
                          onClick={() => void executar(c, "suspender")}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          <PowerOff size={12} /> Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
