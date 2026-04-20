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

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  login: (data: LoginBody) => void;
  logout: () => void;
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

  const login = (data: LoginBody) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        if (res?.token) {
          writeToken(res.token);
          setHasToken(true);
        }
        setUser(res.usuario);
        queryClient.invalidateQueries({ queryKey: ["/usuarios/perfil-atual"] });
        toast({ title: "Login realizado com sucesso." });
      },
      onError: () => {
        toast({ title: "Credenciais invalidas", variant: "destructive" });
      },
    });
  };

  const logout = () => {
    writeToken(null);
    setHasToken(false);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: hasToken && isLoadingPerfil, login, logout }}>
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
