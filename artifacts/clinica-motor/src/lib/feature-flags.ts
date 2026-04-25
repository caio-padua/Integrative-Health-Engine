// PAWARDS MEDCORE · Feature flags client-side
// Lidos via env vars VITE_FEATURE_* (default ON quando não configurado).

function read(key: string, defaultOn = true): boolean {
  const raw = (import.meta as any).env?.[`VITE_FEATURE_${key}`];
  if (raw === undefined || raw === null || raw === "") return defaultOn;
  return String(raw).toLowerCase() !== "false" && raw !== "0";
}

export const FEATURE_TRANSPARENCIA_PRESCRITIVA = read(
  "TRANSPARENCIA_PRESCRITIVA",
  true,
);
export const FEATURE_PARQ_BANNER_CEO = read("PARQ_BANNER_CEO", true);
