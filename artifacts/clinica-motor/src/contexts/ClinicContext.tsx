import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface UnidadeVinculada {
  unidadeId: number;
  unidadeNome: string;
  unidadeCor: string;
}

interface ClinicContextType {
  unidadeSelecionada: number | null;
  setUnidadeSelecionada: (id: number | null) => void;
  unidadesDisponiveis: UnidadeVinculada[];
  nomeUnidadeSelecionada: string;
  corUnidadeSelecionada: string | null;
  isTodasClinicas: boolean;
  escopo: string;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null);

  const escopo = (user as any)?.escopo || "consultoria_master";
  const unidadesVinculadas: UnidadeVinculada[] = (user as any)?.unidadesVinculadas || [];

  const unidadesDisponiveis: UnidadeVinculada[] = (() => {
    if (escopo === "consultoria_master") {
      return unidadesVinculadas;
    }
    if (escopo === "consultor_campo") {
      return unidadesVinculadas;
    }
    if ((user as any)?.unidadeId) {
      return [{
        unidadeId: (user as any).unidadeId,
        unidadeNome: (user as any).unidadeNome || "Minha Clínica",
        unidadeCor: "#6B7280",
      }];
    }
    return [];
  })();

  useEffect(() => {
    if (escopo === "consultoria_master") {
      setUnidadeSelecionada(null);
    } else if (escopo === "consultor_campo") {
      setUnidadeSelecionada(null);
    } else if (unidadesDisponiveis.length === 1) {
      setUnidadeSelecionada(unidadesDisponiveis[0].unidadeId);
    }
  }, [escopo, user]);

  const selecionada = unidadesDisponiveis.find(u => u.unidadeId === unidadeSelecionada);
  const nomeUnidadeSelecionada = selecionada?.unidadeNome || "Todas as Clínicas";
  const corUnidadeSelecionada = selecionada?.unidadeCor || null;
  const isTodasClinicas = unidadeSelecionada === null;

  return (
    <ClinicContext.Provider value={{
      unidadeSelecionada,
      setUnidadeSelecionada,
      unidadesDisponiveis,
      nomeUnidadeSelecionada,
      corUnidadeSelecionada,
      isTodasClinicas,
      escopo,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
