import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useObterPerfilAtual, useLoginUsuario, Usuario, LoginBody, setAuthTokenGetter } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const TOKEN_KEY = "pawards.auth.token";

function readToken(): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null; }
  catch { return null; }
}

function writeToken(token: string | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

setAuthTokenGetter(() => readToken());

// Task #122 — quando o backend devolve { requires2fa: true, challenge },
// o login precisa de uma segunda etapa: o usuario digita o codigo TOTP
// de 6 digitos e o frontend chama /usuarios/login/2fa-verificar pra
// trocar challenge+codigo pelo JWT real. Esse estado vive aqui pra
// sobreviver a re-render do form e pra que o Layout nao seja montado
// no meio do processo (ainda nao ha JWT).
export interface PendingTwoFactor {
  challenge: string;
  email: string;
}

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  login: (data: LoginBody) => void;
  logout: () => void;
  pendingTwoFactor: PendingTwoFactor | null;
  cancelTwoFactor: () => void;
  verifyTwoFactor: (codigo: string) => Promise<{
    ok: boolean;
    error?: string;
    usouCodigoRecuperacao?: boolean;
    codigosRecuperacao2faRestantes?: number;
    codigosRecuperacao2faTotal?: number;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean>(() => !!readToken());
  const queryClient = useQueryClient();

  const { data: perfilAtual, isLoading: isLoadingPerfil, error: perfilError } = useObterPerfilAtual({
    query: {
      retry: false,
      enabled: hasToken,
    },
  });

  const [user, setUser] = useState<Usuario | null>(null);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null);
  const { toast } = useToast();

  const loginMutation = useLoginUsuario();

  useEffect(() => {
    if (perfilAtual) setUser(perfilAtual);
  }, [perfilAtual]);

  // Auto-logout em 401 (token expirado/invalido)
  useEffect(() => {
    if (perfilError && (perfilError as any)?.status === 401 && hasToken) {
      writeToken(null);
      setHasToken(false);
      setUser(null);
      queryClient.clear();
    }
  }, [perfilError, hasToken, queryClient]);

  // Task #122 — o openapi.yaml ainda nao declara o branch requires2fa
  // do POST /usuarios/login (challenge curto de 5min em vez de JWT) nem
  // o POST /usuarios/login/2fa-verificar. Tipamos localmente pra evitar
  // `any` e narrowing por discriminante em runtime.
  type LoginRespostaSemSegundaEtapa = {
    token: string;
    usuario: Usuario;
    requires2fa?: false;
    // Task #222 — quando o login aceitou um codigo de recuperacao 2FA
    // (em vez do TOTP do app autenticador), o backend devolve esses
    // campos pra UI mostrar banner de aviso + a contagem restante.
    usouCodigoRecuperacao?: boolean;
    codigosRecuperacao2faRestantes?: number;
    codigosRecuperacao2faTotal?: number;
  };
  type LoginRespostaPedindoSegundaEtapa = {
    requires2fa: true;
    challenge: string;
  };
  type LoginResposta = LoginRespostaSemSegundaEtapa | LoginRespostaPedindoSegundaEtapa;
  type ErroJson = { error?: string };

  function isPedindoSegundaEtapa(
    r: LoginResposta,
  ): r is LoginRespostaPedindoSegundaEtapa {
    return r.requires2fa === true;
  }

  const login = (data: LoginBody) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        const resp = res as unknown as LoginResposta;
        // Task #122 — backend pode pedir segunda etapa antes de devolver
        // o JWT real. Guarda o challenge curto (5min) e deixa a tela de
        // login mostrar o input de 6 digitos.
        if (isPedindoSegundaEtapa(resp)) {
          setPendingTwoFactor({ challenge: resp.challenge, email: data.email ?? "" });
          toast({
            title: "Digite o codigo do app autenticador",
            description: "Sua conta tem 2FA ativo. Confirme o codigo de 6 digitos pra entrar.",
          });
          return;
        }
        if (resp.token) {
          writeToken(resp.token);
          setHasToken(true);
        }
        setUser(resp.usuario);
        setPendingTwoFactor(null);
        queryClient.invalidateQueries({ queryKey: ["/usuarios/perfil-atual"] });
        toast({ title: "Login realizado com sucesso." });
      },
      onError: () => {
        toast({ title: "Credenciais invalidas", variant: "destructive" });
      },
    });
  };

  // Task #122 — segunda etapa do login: troca challenge+codigo pelo JWT
  // chamando POST /api/usuarios/login/2fa-verificar (rota publica, nao
  // exige Authorization). Sucesso: persiste token, dispara perfil-atual.
  const verifyTwoFactor = async (codigo: string): Promise<{
    ok: boolean;
    error?: string;
    usouCodigoRecuperacao?: boolean;
    codigosRecuperacao2faRestantes?: number;
    codigosRecuperacao2faTotal?: number;
  }> => {
    if (!pendingTwoFactor) return { ok: false, error: "Sem login pendente" };
    try {
      const r = await fetch("/api/usuarios/login/2fa-verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challenge: pendingTwoFactor.challenge, codigo }),
      });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        return { ok: false, error: erro.error ?? `Falha (${r.status})` };
      }
      const j = (await r.json()) as LoginRespostaSemSegundaEtapa;
      if (j.token) {
        writeToken(j.token);
        setHasToken(true);
      }
      if (j.usuario) setUser(j.usuario);
      setPendingTwoFactor(null);
      queryClient.invalidateQueries({ queryKey: ["/usuarios/perfil-atual"] });
      // Task #222 — quando o login passou por codigo de recuperacao, NAO
      // mostramos o toast generico de "login com sucesso" pra nao competir
      // com o banner amarelo que a tela de login renderiza em seguida.
      if (!j.usouCodigoRecuperacao) {
        toast({ title: "Login realizado com sucesso." });
      }
      return {
        ok: true,
        usouCodigoRecuperacao: j.usouCodigoRecuperacao === true,
        codigosRecuperacao2faRestantes:
          typeof j.codigosRecuperacao2faRestantes === "number"
            ? j.codigosRecuperacao2faRestantes
            : undefined,
        codigosRecuperacao2faTotal:
          typeof j.codigosRecuperacao2faTotal === "number"
            ? j.codigosRecuperacao2faTotal
            : undefined,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sem conexao com o servidor";
      return { ok: false, error: msg };
    }
  };

  const cancelTwoFactor = () => {
    setPendingTwoFactor(null);
  };

  const logout = () => {
    writeToken(null);
    setHasToken(false);
    setUser(null);
    setPendingTwoFactor(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: hasToken && isLoadingPerfil,
        login,
        logout,
        pendingTwoFactor,
        cancelTwoFactor,
        verifyTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
