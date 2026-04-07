import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useObterPerfilAtual, useLoginUsuario, Usuario, LoginBody } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  login: (data: LoginBody) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: perfilAtual, isLoading: isLoadingPerfil, error } = useObterPerfilAtual({
    query: {
      retry: false,
    }
  });

  const [user, setUser] = useState<Usuario | null>(null);
  const { toast } = useToast();

  const loginMutation = useLoginUsuario();

  useEffect(() => {
    if (perfilAtual) {
      setUser(perfilAtual);
    }
  }, [perfilAtual]);

  const login = (data: LoginBody) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setUser(res.usuario);
        toast({ title: "Login realizado com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro no login", variant: "destructive" });
      }
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoadingPerfil, login, logout }}>
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
