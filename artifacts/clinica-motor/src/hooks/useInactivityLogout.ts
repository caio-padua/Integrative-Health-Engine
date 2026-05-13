// Auto-logout por inatividade. Reseta o timer a cada mousemove/keydown/click/touch.
// Centraliza o tempo de inatividade usado pelas telas administrativas.
//
// Uso simples (sem aviso prévio):
//   useInactivityLogout(handleLogout);
//
// Uso com modal de aviso (countdown nos últimos N segundos):
//   const { warningSecondsLeft, resetTimer } = useInactivityLogout(handleLogout, {
//     warningSeconds: 60,
//   });
//   return <InactivityWarningModal secondsLeft={warningSecondsLeft} onStay={resetTimer} />;

import { useCallback, useEffect, useRef, useState } from "react";

// Tempo padrão (em minutos) sem interação até deslogar automaticamente
// painéis administrativos. Único ponto de configuração.
export const INACTIVITY_TIMEOUT_MINUTES = 30;

interface Options {
  enabled?: boolean;
  timeoutMinutes?: number;
  // Quando definido, ativa o modo "aviso prévio": exibe contagem regressiva
  // nos últimos `warningSeconds` segundos antes do logout. Enquanto o aviso
  // estiver visível, interações implícitas (mouse/teclado) NÃO resetam o
  // timer — o usuário precisa chamar `resetTimer` explicitamente
  // (clicar em "Continuar logado").
  warningSeconds?: number;
}

interface Result {
  // Segundos restantes até o logout enquanto o aviso está visível.
  // `null` quando o aviso não está sendo exibido.
  warningSecondsLeft: number | null;
  // Reseta o timer de inatividade e fecha o aviso (se estiver aberto).
  resetTimer: () => void;
}

export function useInactivityLogout(
  onLogout: () => void,
  {
    enabled = true,
    timeoutMinutes = INACTIVITY_TIMEOUT_MINUTES,
    warningSeconds,
  }: Options = {},
): Result {
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number | null>(null);
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const timeoutMs = timeoutMinutes * 60_000;
    const warningMs = warningSeconds ? warningSeconds * 1000 : 0;
    let warningTimer: ReturnType<typeof setTimeout> | null = null;
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    const clearAll = () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    const showWarning = () => {
      if (!warningSeconds) return;
      setWarningSecondsLeft(warningSeconds);
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        setWarningSecondsLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const reset = () => {
      clearAll();
      setWarningSecondsLeft(null);
      if (warningSeconds) {
        warningTimer = setTimeout(showWarning, Math.max(0, timeoutMs - warningMs));
      }
      logoutTimer = setTimeout(onLogout, timeoutMs);
    };

    resetRef.current = reset;

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "touchstart",
      "scroll",
    ];

    const handleActivity = () => {
      if (warningSeconds) {
        // Enquanto o aviso estiver aberto, ignoramos a interação implícita —
        // o usuário precisa chamar `resetTimer` explicitamente.
        setWarningSecondsLeft((current) => {
          if (current === null) reset();
          return current;
        });
      } else {
        reset();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    reset();

    return () => {
      clearAll();
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      resetRef.current = () => {};
    };
  }, [onLogout, enabled, timeoutMinutes, warningSeconds]);

  const resetTimer = useCallback(() => {
    resetRef.current();
  }, []);

  return { warningSecondsLeft, resetTimer };
}
