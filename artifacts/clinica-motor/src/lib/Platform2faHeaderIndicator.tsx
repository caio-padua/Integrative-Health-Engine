// Task #269: indicador compacto no TOPO das telas /plataforma/* mostrando
// pro platform_owner/tenant_admin a hora de expiracao da janela 2FA.
// Complementa o Platform2faFooterIndicator (Task #145/#156/#157) que vive
// no rodape do sidebar — em telas densas (auditoria, alertas) o operador
// pode nao olhar pro canto inferior e perder a hora pra renovar.
//
// Mesma fonte de verdade (AuthContext.user.ultimoLogin2faEm), mesma
// paleta de cores (emerald/amber/red), mesmo gating (platform_owner ou
// tenant_admin). Click abre o mesmo modal de step-up via callback
// `onRenovar` (usePlatformStepUp.openStepUp), igual ao botao "Renovar"
// do rodape — sem duplicar logica de hook/modal aqui.
import { useEffect, useState, type ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck } from "lucide-react";

const JANELA_2FA_MS = 8 * 60 * 60 * 1000;
const TICK_MS = 30 * 1000;

function formatarHora(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function Platform2faHeaderIndicator({
  onRenovar,
}: {
  onRenovar?: () => void;
} = {}): ReactElement | null {
  const { user } = useAuth();
  const [agora, setAgora] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Task #269: restrito a platform_owner (acceptance da task). O rodape
  // (Task #156) tambem mostra pra tenant_admin, mas o indicador de topo
  // por enquanto fica so pro CEO. Aceita camelCase (gerado do OpenAPI)
  // e snake_case (defensivo).
  const perfilPlataforma =
    (user as unknown as { perfilPlataforma?: string | null })?.perfilPlataforma ??
    (user as unknown as { perfil_plataforma?: string | null })?.perfil_plataforma ??
    null;
  if (perfilPlataforma !== "platform_owner") {
    return null;
  }

  const ultimoIso =
    (user as unknown as { ultimoLogin2faEm?: string | null })?.ultimoLogin2faEm ??
    (user as unknown as { ultimo_login_2fa_em?: string | null })?.ultimo_login_2fa_em ??
    null;
  if (!ultimoIso) return null;

  const ultimoMs = new Date(ultimoIso).getTime();
  if (!Number.isFinite(ultimoMs)) return null;

  const expiraEm = ultimoMs + JANELA_2FA_MS;
  const restanteMs = expiraEm - agora;
  const expirado = restanteMs <= 0;

  const corTexto = expirado
    ? "text-red-400"
    : restanteMs <= 15 * 60 * 1000
      ? "text-amber-300"
      : "text-emerald-400";

  const titulo = expirado
    ? "Janela de 2FA expirou — clique pra renovar"
    : `2FA expira ${new Date(expiraEm).toLocaleString()} — clique pra renovar agora`;

  const conteudo = (
    <>
      <ShieldCheck className={`w-3.5 h-3.5 ${corTexto}`} />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">2FA</span>
      <span className={`text-[11px] font-mono ${corTexto}`}>
        {expirado ? (
          <span data-testid="platform-2fa-header-expirado">Expirado</span>
        ) : (
          <span data-testid="platform-2fa-header-expira">expira {formatarHora(expiraEm)}</span>
        )}
      </span>
    </>
  );

  if (onRenovar) {
    return (
      <button
        type="button"
        onClick={onRenovar}
        data-testid="platform-2fa-header-indicator"
        className="inline-flex items-center gap-1.5 px-2 py-1 border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent/60 transition-colors"
        title={titulo}
      >
        {conteudo}
      </button>
    );
  }
  return (
    <div
      data-testid="platform-2fa-header-indicator"
      className="inline-flex items-center gap-1.5 px-2 py-1 border border-sidebar-border bg-sidebar-accent/30"
      title={titulo}
    >
      {conteudo}
    </div>
  );
}
