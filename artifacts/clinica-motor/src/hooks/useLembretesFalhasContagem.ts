import { useEffect, useRef, useState } from "react";

interface ContagemFalhasResponse {
  unidadeId: number | null;
  janelaHoras: number;
  desde: string;
  total: number;
}

const POLL_INTERVAL_MS = 60_000;

function buildApiBase(): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  return `${window.location.origin}${baseUrl}api`
    .replace(/\/+/g, "/")
    .replace(":/", "://");
}

export function useLembretesFalhasContagem(unidadeId: number | null) {
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (unidadeId == null) {
      setTotal(0);
      setErro(null);
      return;
    }

    let cancelled = false;
    const apiBase = buildApiBase();

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const qs = new URLSearchParams();
        qs.set("unidadeId", String(unidadeId));
        qs.set("janelaHoras", "24");
        const res = await fetch(
          `${apiBase}/prescricoes-lembrete/falhas/contagem?${qs.toString()}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          if (!cancelled) {
            setErro(`HTTP ${res.status}`);
            setTotal(0);
          }
          return;
        }
        const data: ContagemFalhasResponse = await res.json();
        if (!cancelled) {
          setTotal(typeof data.total === "number" ? data.total : 0);
          setErro(null);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (!cancelled) {
          setErro((e as Error).message);
        }
      }
    };

    fetchOnce();
    const interval = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [unidadeId]);

  return { total, erro };
}
