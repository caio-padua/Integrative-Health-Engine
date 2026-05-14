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
export const FEATURE_ASSINATURAS_RESUMO_CEO = read(
  "ASSINATURAS_RESUMO_CEO",
  true,
);

// Task #271 — gate dedicado pro mini-card de bloqueios 2FA expirados (30d)
// no Painel CEO. Independente do gate de assinaturas pra evitar que
// desligar resumo de assinaturas suprima visibilidade de seguranca.
export const FEATURE_SEGURANCA_2FA_EXPIRADOS_CEO = read(
  "SEGURANCA_2FA_EXPIRADOS_CEO",
  true,
);
