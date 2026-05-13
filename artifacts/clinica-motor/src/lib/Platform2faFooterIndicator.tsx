// Task #145: indicador permanente no rodape do Layout mostrando, pro
// platform_owner navegando em /plataforma/*, o horario do ultimo 2FA
// confirmado e a hora prevista de expiracao da janela de 8h. Complementa
// o Platform2faExpiryBanner (Task #130) que so aparece quando faltam
// <15min — aqui o Caio sempre sabe quanto tempo ainda tem.
//
// Task #156: estendido tambem pra perfil_plataforma === 'tenant_admin',
// que tambem faz acoes sensiveis (suspender usuarios, validar pagamentos)
// e merece o mesmo conforto de saber quanto tempo resta da janela 2FA.
//
// Mesma fonte de verdade do banner: AuthContext.user.ultimoLogin2faEm.
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

// Task #157: aceita callback `onRenovar` pra abrir o modal TOTP de
// step-up direto do indicador (botao "Renovar" inline) — antes o
// platform_owner so renovava reativamente via banner <15min ou via
// 403 numa acao destrutiva. Layout passa a callback que invalida
// /usuarios/perfil-atual no sucesso, igual ao Platform2faExpiryBanner.
export function Platform2faFooterIndicator({
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

  // Task #156: aparece pra platform_owner E tenant_admin (ambos fazem
  // acoes sensiveis cobertas pela janela 2FA recente). Aceita camelCase
  // (gerado do OpenAPI) e snake_case (defensivo se o tipo nao tiver
  // regenerado em algum momento) — mesmo padrao do Platform2faExpiryBanner.
  const perfilPlataforma =
    (user as unknown as { perfilPlataforma?: string | null })?.perfilPlataforma ??
    (user as unknown as { perfil_plataforma?: string | null })?.perfil_plataforma ??
    null;
  if (perfilPlataforma !== "platform_owner" && perfilPlataforma !== "tenant_admin") {
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

  return (
    <div
      className="px-3 py-2 border border-sidebar-border bg-sidebar-accent/30 text-[10px] leading-tight font-mono"
      data-testid="platform-2fa-footer-indicator"
      title={
        expirado
          ? "Janela de 2FA expirou — proxima acao sensivel vai pedir TOTP"
          : `2FA confirmado em ${new Date(ultimoMs).toLocaleString()} — expira em ${new Date(expiraEm).toLocaleString()}`
      }
    >
      <div className="flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground">
        <ShieldCheck className={`w-3 h-3 ${corTexto}`} />
        <span>2FA Plataforma</span>
      </div>
      <div className={`mt-1 flex items-center justify-between gap-2 ${corTexto}`}>
        <div className="min-w-0 truncate">
          {expirado ? (
            <span data-testid="platform-2fa-footer-expirado">Expirado — renove agora</span>
          ) : (
            <>
              <span data-testid="platform-2fa-footer-confirmado">
                Confirmado as {formatarHora(ultimoMs)}
              </span>
              <span className="text-muted-foreground"> — expira </span>
              <span data-testid="platform-2fa-footer-expira">{formatarHora(expiraEm)}</span>
            </>
          )}
        </div>
        {onRenovar && (
          <button
            type="button"
            onClick={onRenovar}
            data-testid="platform-2fa-footer-renovar"
            className="shrink-0 px-1.5 py-0.5 border border-current/40 text-[10px] uppercase tracking-widest hover:bg-current/10"
            title="Renovar a janela de 8h do 2FA agora"
          >
            Renovar
          </button>
        )}
      </div>
    </div>
  );
}
