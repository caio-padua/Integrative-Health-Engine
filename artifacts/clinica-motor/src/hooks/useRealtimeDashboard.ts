import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "/api";
const TOKEN_KEY = "pawards.auth.token";

export function useRealtimeDashboard<T>(
  endpoint: string,
  intervalMs = 60_000,
  options?: { enabled?: boolean }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = endpoint.startsWith("http") || endpoint.startsWith("/api")
        ? endpoint
        : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      const jwt = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      const headers: Record<string, string> = {};
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
      const res = await fetch(url, { credentials: "include", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T;
      setData(json);
      setError(null);
      setLastUpdate(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options?.enabled === false) return;
    fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, intervalMs, options?.enabled]);

  return { data, loading, error, lastUpdate, refresh: fetchData };
}
