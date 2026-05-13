// Helper centralizado de fetch para chamadas internas autenticadas.
//
// Por que existe: cada tela do clinica-motor estava repetindo o mesmo
// boilerplate `localStorage.getItem("pawards.auth.token")` + montar o
// header `Authorization: Bearer ...`. Quando alguem esquecia de copiar
// esse trecho, a tela quebrava com 401 (caso real: /assinaturas/timeline
// na Task #101). Este helper centraliza a injecao do JWT pra qualquer
// fetch interno.
//
// Use `apiFetch(input, init?)` exatamente como `fetch`. O Authorization
// Bearer e o `credentials: "include"` sao adicionados automaticamente
// quando ha token salvo. Headers explicitos passados em `init.headers`
// tem prioridade (incluindo a possibilidade de sobrescrever Authorization
// para casos especiais).

export const PAWARDS_TOKEN_KEY = "pawards.auth.token";

export function getPawardsToken(): string | null {
  try {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(PAWARDS_TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
}

export function clearPawardsToken(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(PAWARDS_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

// Cadastro do usuario logado (subset do payload do JWT) persistido pra o
// dashboard global mostrar nome/email/perfil sem refazer /perfil-atual a
// cada navegacao. Mesma motivacao do helper do token (Task #107): centralizar
// pra ninguem mais ler/gravar `pawards.auth.user` direto via localStorage.

export const PAWARDS_USER_KEY = "pawards.auth.user";

export interface PawardsSessionUser {
  email?: string | null;
  nome?: string | null;
  perfil?: string | null;
}

export function getPawardsUser(): PawardsSessionUser | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(PAWARDS_USER_KEY);
    return raw ? (JSON.parse(raw) as PawardsSessionUser) : null;
  } catch {
    return null;
  }
}

export function setPawardsUser(user: PawardsSessionUser): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PAWARDS_USER_KEY, JSON.stringify(user));
    }
  } catch {
    /* ignore */
  }
}

export function clearPawardsUser(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(PAWARDS_USER_KEY);
    }
  } catch {
    /* ignore */
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const jwt = getPawardsToken();
  const incoming = new Headers(init.headers ?? undefined);
  if (jwt && !incoming.has("Authorization")) {
    incoming.set("Authorization", `Bearer ${jwt}`);
  }
  const credentials: RequestCredentials = init.credentials ?? "include";
  return fetch(input, { ...init, headers: incoming, credentials });
}
