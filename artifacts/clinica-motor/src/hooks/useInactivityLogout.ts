// Auto-logout por inatividade. Reseta o timer a cada mousemove/keydown/click/touch.
// Centraliza o tempo de inatividade usado pelas telas administrativas.

import { useEffect } from "react";

// Tempo padrão (em minutos) sem interação até deslogar automaticamente
// painéis administrativos. Único ponto de configuração.
export const INACTIVITY_TIMEOUT_MINUTES = 30;

interface Options {
  enabled?: boolean;
  timeoutMinutes?: number;
}

export function useInactivityLogout(
  onLogout: () => void,
  { enabled = true, timeoutMinutes = INACTIVITY_TIMEOUT_MINUTES }: Options = {}
): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const timeoutMs = timeoutMinutes * 60_000;
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onLogout, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "touchstart",
      "scroll",
    ];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [onLogout, enabled, timeoutMinutes]);
}
