import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Bell, Mail, MessageCircle, Save, ShieldAlert, UserCog } from "lucide-react";

// Task #159 — pagina de perfil do platform_owner pra escolher por quais
// canais quer receber o aviso de expiracao do 2FA (worker da Task #146).
// Default DB ['email','whatsapp']. Array vazio = mudo (so o banner in-app
// da Task #130 avisa). Esta tela nao exige 2FA recente — e leitura/edit
// da propria preferencia, nao acao destrutiva no kill-switch.

type CanalAviso = "email" | "whatsapp";

interface PerfilAtual {
  id: number;
  nome: string;
  email: string;
  perfilPlataforma: "platform_owner" | "tenant_admin" | "tenant_user";
  canaisAviso2fa?: string[] | null;
}

export default function PlataformaPerfil() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(null);
  const [canais, setCanais] = useState<Set<CanalAviso>>(new Set());
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const { openStepUp, modal: stepUpModal } = usePlatformStepUp();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/usuarios/perfil-atual", { credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j.error ?? `Falha ao carregar (${r.status})`);
        setLoading(false);
        return;
      }
      const data: PerfilAtual = await r.json();
      setPerfil(data);
      const atuais = Array.isArray(data.canaisAviso2fa) ? data.canaisAviso2fa : ["email", "whatsapp"];
      setCanais(new Set(atuais.filter((c): c is CanalAviso => c === "email" || c === "whatsapp")));
    } catch (e: any) {
      setErro(e?.message ?? "Erro inesperado");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function toggleCanal(canal: CanalAviso) {
    setMsgOk(null);
    setCanais((prev) => {
      const next = new Set(prev);
      if (next.has(canal)) next.delete(canal); else next.add(canal);
      return next;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setMsgOk(null);
    try {
      const r = await apiFetch("/api/usuarios/me/canais-aviso-2fa", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canaisAviso2fa: Array.from(canais) }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j.error ?? `Falha ao salvar (${r.status})`);
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (Array.isArray(data?.canaisAviso2fa)) {
        setCanais(new Set(data.canaisAviso2fa.filter((c: string) => c === "email" || c === "whatsapp")));
      }
      setMsgOk("Preferencias salvas. O proximo aviso ja respeita a sua escolha.");
    } catch (e: any) {
      setErro(e?.message ?? "Sem conexao com o servidor. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const isOwner = perfil?.perfilPlataforma === "platform_owner";
  const nenhumCanal = canais.size === 0;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <UserCog size={28} /> Plataforma · Meu perfil
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure como voce quer ser avisado sobre eventos da plataforma.
          </p>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Falha</div>
              <div className="text-sm">{erro}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-zinc-500 text-sm">Carregando...</div>
        )}

        {!loading && perfil && (
          <div className="space-y-6">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Identidade</div>
              <div className="font-semibold text-zinc-100">{perfil.nome}</div>
              <div className="text-sm text-zinc-400">{perfil.email}</div>
              <div className="text-xs font-mono mt-2 inline-block px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                {perfil.perfilPlataforma}
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-4">
                <Bell size={20} className="text-amber-400 mt-1" />
                <div>
                  <h2 className="font-semibold text-zinc-100">Aviso de expiracao do 2FA</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    A janela de 8h do 2FA do painel <code>/plataforma</code> expira ~15min antes
                    o sistema te avisa. Escolha por onde quer receber.
                    {!isOwner && (
                      <span className="block mt-2 text-xs text-zinc-500 italic">
                        Esta preferencia so afeta o aviso quando voce e <code>platform_owner</code>.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer bg-zinc-950/50">
                  <input
                    type="checkbox"
                    checked={canais.has("email")}
                    onChange={() => toggleCanal("email")}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <Mail size={18} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-zinc-100 text-sm font-semibold">E-mail</div>
                    <div className="text-xs text-zinc-500">
                      Enviado pra {perfil.email} via Gmail oficial da plataforma.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer bg-zinc-950/50">
                  <input
                    type="checkbox"
                    checked={canais.has("whatsapp")}
                    onChange={() => toggleCanal("whatsapp")}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <MessageCircle size={18} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-zinc-100 text-sm font-semibold">WhatsApp</div>
                    <div className="text-xs text-zinc-500">
                      Enviado pro numero CEO_WHATSAPP cadastrado nas variaveis da plataforma.
                    </div>
                  </div>
                </label>
              </div>

              {nenhumCanal && (
                <div className="mt-3 p-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded">
                  Com nenhum canal marcado, voce so vera o banner discreto dentro
                  do painel <code>/plataforma</code>. Se sair do navegador, nao
                  recebera nenhum aviso externo.
                </div>
              )}

              {msgOk && (
                <div className="mt-3 p-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded">
                  {msgOk}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void salvar()}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded text-sm disabled:opacity-50"
                >
                  <Save size={16} /> {salvando ? "Salvando..." : "Salvar preferencias"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
