// Task #217: modal global de re-verificacao 2FA.
//
// Disparado pelo interceptor em `apiFetch` (lib/api-fetch.ts) quando o
// backend devolve 403 com `codigo: "2FA_EXPIRADO"` — middleware
// `require2faRecente` no api-server. Pede o codigo TOTP atual de 6
// digitos, chama POST /api/usuarios/2fa/reverificar pra renovar a
// janela de 8h e sinaliza pro interceptor refazer a request original.
//
// Mensagens cobertas:
// - 401 + TOTP_INVALIDO  -> "Codigo errado, tente de novo."
// - 429 + TOTP_RATE_LIMITED -> "Muitas tentativas, espere 5 minutos."
// - 409 + 2FA_NAO_ATIVO -> "Voce nao tem 2FA ativo, ative em /perfil."
// - outros -> mensagem do backend ou fallback.
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getPawardsToken } from "@/lib/api-fetch";

export function Modal2faReverificar({
  onClose,
}: {
  onClose: (success: boolean) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar(): Promise<void> {
    const codigoLimpo = codigo.trim();
    if (codigoLimpo.length !== 6) {
      setErro("Digite os 6 digitos do app autenticador.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      // Chamamos `fetch` direto (e nao `apiFetch`) pra evitar laco
      // infinito caso a propria rota /usuarios/2fa/reverificar venha a
      // devolver 403 com `2FA_EXPIRADO` no futuro.
      const jwt = getPawardsToken();
      const r = await fetch("/api/usuarios/2fa/reverificar", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ codigo: codigoLimpo }),
      });
      if (r.ok) {
        onClose(true);
        return;
      }
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        codigo?: string;
      };
      if (r.status === 429 || j.codigo === "TOTP_RATE_LIMITED") {
        setErro(
          "Muitas tentativas erradas. Aguarde 5 minutos e tente novamente.",
        );
      } else if (r.status === 401 || j.codigo === "TOTP_INVALIDO") {
        setErro("Codigo invalido. Confira no app e tente de novo.");
      } else if (r.status === 409 || j.codigo === "2FA_NAO_ATIVO") {
        setErro(
          "Voce nao tem 2FA ativo. Ative em /perfil/seguranca-2fa antes de continuar.",
        );
      } else {
        setErro(j.error ?? `Falha ao validar codigo (${r.status}).`);
      }
    } catch {
      setErro("Erro de rede. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function cancelar(): void {
    if (enviando) return;
    onClose(false);
  }

  // Mantemos o estilo coerente com `usePlatformStepUp` (Task #125): dark,
  // borda ambar, fonte mono no input pra reforcar codigo numerico.
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelar();
      }}
    >
      <div className="bg-zinc-900 border border-amber-500/40 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-2">
          <ShieldAlert size={20} />
          Confirme novamente o 2FA
        </h2>
        <p className="text-sm text-zinc-300 mb-4">
          A janela de seguranca do seu 2FA expirou. Pra continuar essa
          acao, digite o codigo atual de 6 digitos do seu app autenticador
          (Google Authenticator / Authy / 1Password). Vamos refazer a acao
          automaticamente em seguida.
        </p>
        <input
          autoFocus
          value={codigo}
          onChange={(e) =>
            setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
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
            type="button"
            onClick={cancelar}
            disabled={enviando}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={enviando || codigo.trim().length !== 6}
            className="px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded text-sm font-semibold disabled:opacity-50"
          >
            {enviando ? "Validando..." : "Confirmar e refazer"}
          </button>
        </div>
      </div>
    </div>
  );
}

