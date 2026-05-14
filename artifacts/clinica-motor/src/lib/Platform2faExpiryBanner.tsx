// Task #130: banner discreto que avisa o platform_owner com antecedencia
// quando a janela de 8h do 2FA esta prestes a expirar (<15min) — em vez
// de so descobrir via 403 no meio de uma acao destrutiva.
//
// Le `ultimoLogin2faEm` do AuthContext (vem de /usuarios/perfil-atual,
// extendido nessa task), calcula tempo restante por tick de 30s e mostra
// o aviso com botao "Renovar agora" que abre o mesmo modal TOTP da
// Task #125 via `usePlatformStepUp.openStepUp()`.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, X } from "lucide-react";
import { useSound } from "@/hooks/useSound";

const JANELA_2FA_MS = 8 * 60 * 60 * 1000;
const AVISO_ANTECEDENCIA_MS = 15 * 60 * 1000;
const TICK_MS = 30 * 1000;

function formatarRestante(ms: number): string {
  if (ms <= 0) return "expirando agora";
  const totalSeg = Math.floor(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  if (min <= 0) return `${seg}s`;
  return `${min}min`;
}

export function Platform2faExpiryBanner({
  onRenovar,
}: {
  onRenovar: (onSucesso: () => void) => void;
}): ReactElement | null {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sound = useSound();
  const [agora, setAgora] = useState<number>(() => Date.now());
  const [dispensadoAte, setDispensadoAte] = useState<number | null>(null);
  // Marca o `ultimoLogin2faEm` pra qual ja tocamos o aviso sonoro — assim
  // tocamos exatamente uma vez por janela 2FA. Quando o CEO renova, o
  // valor muda e a ref reseta naturalmente.
  const ultimoAvisadoRef = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Aceita ambos camelCase (gerado do OpenAPI) e snake_case (defensivo
  // caso o tipo nao esteja regenerado em algum momento). Se nao tem
  // ultimo 2fa o banner some.
  const ultimoIso =
    (user as unknown as { ultimoLogin2faEm?: string | null })?.ultimoLogin2faEm ??
    (user as unknown as { ultimo_login_2fa_em?: string | null })?.ultimo_login_2fa_em ??
    null;

  const ultimoMs = ultimoIso ? new Date(ultimoIso).getTime() : NaN;
  const temUltimo = ultimoIso !== null && Number.isFinite(ultimoMs);
  const expiraEm = temUltimo ? ultimoMs + JANELA_2FA_MS : 0;
  const restante = temUltimo ? expiraEm - agora : Number.POSITIVE_INFINITY;
  const dentroDaJanelaAviso =
    temUltimo && restante > 0 && restante <= AVISO_ANTECEDENCIA_MS;

  // Toca um `sound.tap()` discreto UMA unica vez por janela 2FA assim
  // que o restante cruza pra dentro de <15min — respeita o toggle
  // "Som silenciado" via useSound (sound.tap ja checa enabled internamente).
  // A ref guarda o ultimoIso pra qual ja avisamos, entao renovar o 2FA
  // (que muda ultimoLogin2faEm) reseta naturalmente.
  useEffect(() => {
    if (!dentroDaJanelaAviso || !ultimoIso) return;
    if (ultimoAvisadoRef.current === ultimoIso) return;
    ultimoAvisadoRef.current = ultimoIso;
    sound.tap();
  }, [dentroDaJanelaAviso, ultimoIso, sound]);

  if (!temUltimo) return null;

  // Mostra so quando faltam <15min e ainda nao expirou (>0). Apos
  // expirar, o fluxo reativo (usePlatformStepUp) ja toma conta via 403.
  if (!dentroDaJanelaAviso) return null;
  if (dispensadoAte && dispensadoAte > agora) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 max-w-sm bg-zinc-900 border border-amber-500/40 rounded-lg shadow-lg p-3 flex items-start gap-2"
    >
      <ShieldAlert size={18} className="text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-amber-300">
          Seu 2FA expira em {formatarRestante(restante)}
        </div>
        <div className="text-zinc-400 text-xs mt-0.5">
          Renove agora pra nao ser interrompido no meio de uma acao
          sensivel (suspensao, exclusao, promocao de admin).
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() =>
              onRenovar(() => {
                // Sucesso: re-fetch /usuarios/perfil-atual pra pegar o
                // novo `ultimoLogin2faEm` e o banner some sozinho.
                void queryClient.invalidateQueries({
                  queryKey: ["/usuarios/perfil-atual"],
                });
                setDispensadoAte(null);
              })
            }
            className="px-3 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded text-xs font-semibold"
          >
            Renovar agora
          </button>
          <button
            onClick={() => setDispensadoAte(Date.now() + 5 * 60 * 1000)}
            className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            title="Adiar 5 minutos"
          >
            Depois
          </button>
        </div>
      </div>
      <button
        onClick={() => setDispensadoAte(expiraEm)}
        className="text-zinc-500 hover:text-zinc-300"
        title="Dispensar ate expirar"
        aria-label="Dispensar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}
