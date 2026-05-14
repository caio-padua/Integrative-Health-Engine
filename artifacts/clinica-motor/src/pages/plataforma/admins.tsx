import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import { UserCheck, ArrowUpCircle, ArrowDownCircle, RefreshCw, ShieldAlert, Crown, LogOut } from "lucide-react";

type Admin = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  perfil_plataforma: "platform_owner" | "tenant_admin" | "tenant_user";
  ativo: boolean;
  unidade_id: number | null;
  unidade_nome: string | null;
};

const PERFIL_COR: Record<string, string> = {
  platform_owner: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  tenant_admin:   "bg-blue-500/20 text-blue-300 border-blue-500/40",
  tenant_user:    "bg-zinc-700/40 text-zinc-300 border-zinc-600",
};

export default function PlataformaAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await runWithStepUp(() =>
      apiFetch("/api/plataforma/admins", { credentials: "include" }),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    setAdmins(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function executar(u: Admin, acao: "promover" | "rebaixar") {
    const verbo = acao === "promover" ? "PROMOVER A tenant_admin" : "REBAIXAR A tenant_user";
    const motivo = window.prompt(
      `Motivo para ${verbo} o usuario "${u.nome}" (${u.email}).\nMinimo 8 caracteres. Sera registrado em auditoria_kill_switch.metadata.`,
    );
    if (!motivo || motivo.trim().length < 8) {
      if (motivo !== null) alert("Motivo precisa ter pelo menos 8 caracteres.");
      return;
    }
    setAcaoId(u.id);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/admins/${u.id}/${acao}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }),
    );
    setAcaoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    await carregar();
  }

  // Task #154 — forca logout imediato (invalida TODAS as sessoes JWT do
  // alvo via bump em usuarios.tokens_invalidos_apos). Acao destrutiva mas
  // nao desativa a conta — usuario legitimo pode logar de novo. Funciona
  // pra QUALQUER alvo, inclusive platform_owner (cenario critico de hijack
  // do proprio owner) — backend exige executor com platform_owner+2FA.
  const forcarLogout = useCallback(async (u: Admin) => {
    const aviso = u.perfil_plataforma === "platform_owner"
      ? `\n\n⚠ ALVO E platform_owner. Voce sera deslogado e tera que refazer login + 2FA.`
      : "";
    const motivo = window.prompt(
      `FORCAR LOGOUT de "${u.nome}" (${u.email}).\n\nIsso invalida TODAS as sessoes ativas (JWTs) do usuario imediatamente. A conta NAO e desativada — o usuario legitimo pode logar de novo.${aviso}\n\nMotivo (>= 8 chars, registrado em auditoria_kill_switch):`,
    );
    if (!motivo || motivo.trim().length < 8) {
      if (motivo !== null) alert("Motivo precisa ter pelo menos 8 caracteres.");
      return;
    }
    setAcaoId(u.id);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/usuarios/${u.id}/forcar-logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }),
    );
    setAcaoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json().catch(() => ({}));
    alert(`Sessoes invalidadas em ${j.tokens_invalidos_apos ?? "now"}.`);
    await carregar();
  }, [runWithStepUp, carregar]);

  // Task #154 — deep-link do email de alerta brute-force 2FA (Task #143).
  // URL: /plataforma/admins?usuario_id=X&acao=forcar-logout abre o prompt
  // de motivo automaticamente assim que a lista carrega. Ref guard pra
  // nao re-disparar em re-renders / re-fetches.
  const deepLinkRef = useRef(false);
  useEffect(() => {
    if (deepLinkRef.current) return;
    if (loading || admins.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const usuarioId = Number(params.get("usuario_id"));
    const acao = params.get("acao");
    if (acao !== "forcar-logout" || !Number.isInteger(usuarioId) || usuarioId <= 0) return;
    const alvo = admins.find(a => a.id === usuarioId);
    if (!alvo) return;
    deepLinkRef.current = true;
    void forcarLogout(alvo);
  }, [admins, loading, forcarLogout]);

  const filtroLower = filtro.trim().toLowerCase();
  const visiveis = filtroLower
    ? admins.filter(a =>
        a.nome.toLowerCase().includes(filtroLower) ||
        a.email.toLowerCase().includes(filtroLower) ||
        (a.unidade_nome ?? "").toLowerCase().includes(filtroLower))
    : admins;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <UserCheck size={28} /> Plataforma · Administradores
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Promove ou rebaixa <code>perfil_plataforma</code>. <code>platform_owner</code> nao
              pode ser alterado por aqui (defesa do unique parcial Wave 13).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="filtrar por nome, email, clinica..."
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-64"
            />
            <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
              <RefreshCw size={16} /> Recarregar
            </button>
          </div>
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
                <th className="text-left px-4 py-3">Usuario</th>
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Perfil Plataforma</th>
                <th className="text-center px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && visiveis.length === 0 && !erro && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Nenhum usuario.</td></tr>
              )}
              {!loading && visiveis.map(u => {
                const cor = PERFIL_COR[u.perfil_plataforma] ?? PERFIL_COR.tenant_user;
                const isOwner = u.perfil_plataforma === "platform_owner";
                const isAdmin = u.perfil_plataforma === "tenant_admin";
                return (
                  <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        {isOwner && <Crown size={14} className="text-amber-400" />}
                        {u.nome}
                      </div>
                      <div className="text-xs text-zinc-500">{u.email} · {u.perfil}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {u.unidade_nome ?? <span className="text-zinc-600 italic">sem unidade</span>}
                      {u.unidade_id && <div className="text-xs text-zinc-500">id {u.unidade_id}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono border ${cor}`}>
                        {u.perfil_plataforma}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2 justify-center">
                        {isOwner ? (
                          <span className="text-xs text-amber-400 italic">promove/rebaixa: protegido</span>
                        ) : isAdmin ? (
                          <button
                            disabled={acaoId === u.id}
                            onClick={() => void executar(u, "rebaixar")}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-zinc-700/50 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                          >
                            <ArrowDownCircle size={12} /> Rebaixar
                          </button>
                        ) : (
                          <button
                            disabled={acaoId === u.id}
                            onClick={() => void executar(u, "promover")}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            <ArrowUpCircle size={12} /> Promover a admin
                          </button>
                        )}
                        {/* Task #154: forcar-logout funciona pra qualquer alvo,
                            inclusive platform_owner (cenario critico de hijack
                            do proprio owner). */}
                        <button
                          disabled={acaoId === u.id}
                          onClick={() => void forcarLogout(u)}
                          title="Invalida TODAS as sessoes JWT ativas do usuario (kill-switch session-hijack)"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 disabled:opacity-50"
                        >
                          <LogOut size={12} /> Forcar logout
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
