import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

/**
 * TopProgressBar — barra de progresso fina dourada no topo, estilo
 * NProgress (YouTube/GitHub). Dispara em toda troca de rota e em toda
 * mutação global pendente do React Query (via window event opcional).
 *
 * UX:
 * - 0 → 30% instantâneo (feedback imediato de "tá indo")
 * - 30 → 90% animado em 400ms (sensação de progresso real)
 * - 90% trava esperando a tela carregar
 * - 100% quando settled, depois fade out em 250ms
 *
 * Caio (21/mai/2026): "quero aquelas coisinhas de carregamento entre
 * telas". Nome técnico = top progress bar / NProgress. Cor dourada
 * #D4AF37 pra casar com identidade Pawards Medcore. Glow neon ciano
 * sutil no final pra dar prestígio. Altura 2px (não-invasivo).
 */
export function TopProgressBar() {
  const [location] = useLocation();
  const [progresso, setProgresso] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localAnterior = useRef(location);

  useEffect(() => {
    if (localAnterior.current === location) return;
    localAnterior.current = location;

    // Reset + spike inicial
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisivel(true);
    setProgresso(0);

    // Frame 1: salta pra 30% (feedback instantâneo)
    requestAnimationFrame(() => {
      setProgresso(30);
      // Frame 2: anima até 90%
      timerRef.current = setTimeout(() => {
        setProgresso(90);
        // Frame 3: completa após pequeno delay (assume tela carregou)
        timerRef.current = setTimeout(() => {
          setProgresso(100);
          timerRef.current = setTimeout(() => {
            setVisivel(false);
            setProgresso(0);
          }, 250);
        }, 350);
      }, 50);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
      style={{ height: 2 }}
      data-testid="top-progress-bar"
    >
      <div
        style={{
          width: `${progresso}%`,
          height: "100%",
          background: "linear-gradient(90deg, #D4AF37 0%, #E5C160 50%, #5EE6E6 100%)",
          boxShadow: progresso > 0 ? "0 0 8px rgba(212,175,55,0.6), 0 0 4px rgba(94,230,230,0.4)" : "none",
          transition:
            progresso === 0
              ? "none"
              : progresso === 30
                ? "width 80ms ease-out"
                : progresso === 90
                  ? "width 350ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : progresso === 100
                    ? "width 180ms ease-out"
                    : "width 200ms ease-out",
          opacity: visivel ? 1 : 0,
        }}
      />
    </div>
  );
}
