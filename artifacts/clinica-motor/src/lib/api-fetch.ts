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

// Task #217: interceptor global pra 403 com `codigo: "2FA_EXPIRADO"`.
// Quando o backend devolve esse codigo (middleware require2faRecente,
// ver artifacts/api-server/src/middlewares/require2faRecente.ts), o
// frontend precisa abrir um modal pedindo o codigo de 6 digitos do
// app autenticador, chamar POST /api/usuarios/2fa/reverificar e
// refazer a request original automaticamente — sem o usuario perceber
// e sem cada pagina ter que tratar 403 manualmente.
//
// O handler e registrado pelo <Reverificacao2faProvider/> montado no
// topo do App. Se nao houver provider montado (ex: tela de login), o
// 403 passa sem interceptacao e o caller recebe a resposta original.
export type Reverificacao2faHandler = () => Promise<{ success: boolean }>;

let reverificacao2faHandler: Reverificacao2faHandler | null = null;

export function setReverificacao2faHandler(
  handler: Reverificacao2faHandler | null,
): void {
  reverificacao2faHandler = handler;
}

async function executarFetchInterno(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const jwt = getPawardsToken();
  const incoming = new Headers(init.headers ?? undefined);
  if (jwt && !incoming.has("Authorization")) {
    incoming.set("Authorization", `Bearer ${jwt}`);
  }
  const credentials: RequestCredentials = init.credentials ?? "include";
  return fetch(input, { ...init, headers: incoming, credentials });
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const r = await executarFetchInterno(input, init);
  if (r.status !== 403 || !reverificacao2faHandler) return r;
  // Clona pra nao consumir o body — o caller pode precisar ler depois.
  const body = (await r
    .clone()
    .json()
    .catch(() => null)) as { codigo?: string } | null;
  if (!body || body.codigo !== "2FA_EXPIRADO") return r;
  const resultado = await reverificacao2faHandler();
  if (!resultado.success) return r;
  // Janela de 8h renovada — refaz a request original e devolve a nova
  // resposta, como se o 403 nunca tivesse acontecido.
  return await executarFetchInterno(input, init);
}

// Wave Cockpit — abre PDF protegido por JWT numa aba nova.
// Como <a target="_blank"> nao injeta header Authorization, baixamos o
// blob via apiFetch (JWT vai no header) e abrimos via URL.createObjectURL.
export async function abrirPdfAutenticado(url: string): Promise<void> {
  try {
    const r = await apiFetch(url);
    if (!r.ok) {
      throw new Error(`Falha ao abrir PDF (HTTP ${r.status})`);
    }
    const blob = await r.blob();
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (!w) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "documento.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    console.error("[abrirPdfAutenticado] erro", e);
    throw e;
  }
}
