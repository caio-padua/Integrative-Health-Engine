// Hook + modal reutilizavel pra Task #125: 2FA step-up no painel
// /plataforma/*. Quando o backend devolve 403 com `codigo: '2FA_EXPIRADO'`,
// abre um modal pedindo o codigo TOTP de 6 digitos, chama
// POST /api/plataforma/2fa/step-up pra renovar `ultimo_login_2fa_em` e
// re-executa a request original — sem precisar deslogar/relogar.
import { useCallback, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { ShieldAlert } from "lucide-react";

type Pendente = {
  resolve: (r: Response) => void;
  retry: () => Promise<Response>;
  original: Response;
};

export function usePlatformStepUp(): {
  runWithStepUp: (makeRequest: () => Promise<Response>) => Promise<Response>;
  modal: ReactNode;
} {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const runWithStepUp = useCallback(
    async (makeRequest: () => Promise<Response>): Promise<Response> => {
      const r = await makeRequest();
      if (r.status !== 403) return r;
      const body = await r.clone().json().catch(() => ({} as { codigo?: string }));
      if (body?.codigo !== "2FA_EXPIRADO") return r;
      return await new Promise<Response>((resolve) => {
        setCodigo("");
        setErro(null);
        setEnviando(false);
        setPendente({
          resolve,
          retry: makeRequest,
          original: r,
        });
      });
    },
    [],
  );

  async function confirmar(): Promise<void> {
    if (!pendente) return;
    const codigoLimpo = codigo.trim();
    if (codigoLimpo.length < 6) {
      setErro("Digite os 6 digitos do app autenticador.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const stepRes = await apiFetch("/api/plataforma/2fa/step-up", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: codigoLimpo }),
    });
    if (!stepRes.ok) {
      const j = await stepRes.json().catch(() => ({} as { error?: string }));
      setErro(j.error ?? `Falha ao validar codigo (${stepRes.status})`);
      setEnviando(false);
      return;
    }
    // 2FA renovado — refaz a request original e devolve a nova resposta
    // pro caller, que segue o fluxo como se nao tivesse passado por aqui.
    const retried = await pendente.retry();
    pendente.resolve(retried);
    setPendente(null);
    setEnviando(false);
  }

  function cancelar(): void {
    if (!pendente) return;
    // Cancelado: devolve o 403 original pro caller exibir como erro normal.
    pendente.resolve(pendente.original);
    setPendente(null);
  }

  const modal = pendente ? (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelar();
      }}
    >
      <div className="bg-zinc-900 border border-amber-500/40 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-2">
          <ShieldAlert size={20} /> 2FA expirou — confirme novamente
        </h2>
        <p className="text-sm text-zinc-300 mb-4">
          A janela de 8h do seu 2FA expirou no meio do uso. Digite o codigo
          atual de 6 digitos do seu app autenticador (Google Authenticator /
          Authy / 1Password) pra refazer essa acao sem precisar deslogar.
        </p>
        <input
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void confirmar();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          disabled={enviando}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono mb-2 disabled:opacity-50"
        />
        {erro && (
          <div className="text-red-400 text-sm mb-2 border border-red-500/40 bg-red-500/10 rounded px-3 py-2">
            {erro}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={cancelar}
            disabled={enviando}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void confirmar()}
            disabled={enviando || codigo.trim().length < 6}
            className="px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded text-sm font-semibold disabled:opacity-50"
          >
            {enviando ? "Validando..." : "Confirmar e refazer"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { runWithStepUp, modal };
}
