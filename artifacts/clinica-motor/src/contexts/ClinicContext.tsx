import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface UnidadeVinculada {
  unidadeId: number;
  unidadeNome: string;
  unidadeCor: string;
}

type ModoVisao = "arquiteto_mestre" | "dono_clinica" | "consultor" | "operacional";

interface ClinicContextType {
  unidadeSelecionada: number | null;
  setUnidadeSelecionada: (id: number | null) => void;
  unidadesDisponiveis: UnidadeVinculada[];
  nomeUnidadeSelecionada: string;
  corUnidadeSelecionada: string | null;
  isTodasClinicas: boolean;
  escopo: string;
  modoVisao: ModoVisao;
  modoLabel: string;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

// MODO CLÍNICO — Instituto Pádua é a unidade real do CEO (dados reais, ID 15).
// Ao logar, o sistema entra DIRETO nesta unidade em vez de cair na "Visão
// Global", que confundia o usuário ("não sabia onde estava"). A escolha de
// unidade fica salva no navegador e pode ser trocada a qualquer momento pelo
// seletor de unidade; quem escolher "Todas as Clínicas" tem essa preferência
// respeitada nos próximos acessos.
const INSTITUTO_PADUA_ID = 15;
const STORAGE_KEY = "pawards.unidade.selecionada.v1";

function lerUnidadePersistida(): number | "global" | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const valor = localStorage.getItem(STORAGE_KEY);
    if (valor === null) return null;
    if (valor === "global") return "global";
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  } catch {
    return null;
  }
}

function gravarUnidadePersistida(id: number | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, id === null ? "global" : String(id));
  } catch {
    /* ignore */
  }
}

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidadeSelecionada, setUnidadeSelecionadaState] = useState<number | null>(null);

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

  // Setter público que PERSISTE a escolha (inclui "Visão Global" = null), pra
  // que a unidade escolhida pelo usuário sobreviva ao recarregar a página.
  const setUnidadeSelecionada = useCallback((id: number | null) => {
    gravarUnidadePersistida(id);
    setUnidadeSelecionadaState(id);
  }, []);

  useEffect(() => {
    if (escopo === "consultoria_master") {
      // Respeita a última escolha salva. Na primeira vez (sem escolha salva),
      // entra direto no Instituto Pádua (15) se disponível — Modo Clínico.
      // Só cai em Visão Global se o usuário tiver escolhido isso antes.
      const persistida = lerUnidadePersistida();
      if (persistida === "global") {
        setUnidadeSelecionadaState(null);
      } else if (
        typeof persistida === "number" &&
        unidadesDisponiveis.some((u) => u.unidadeId === persistida)
      ) {
        setUnidadeSelecionadaState(persistida);
      } else if (unidadesDisponiveis.some((u) => u.unidadeId === INSTITUTO_PADUA_ID)) {
        setUnidadeSelecionadaState(INSTITUTO_PADUA_ID);
      } else if (unidadesDisponiveis.length > 0) {
        setUnidadeSelecionadaState(unidadesDisponiveis[0].unidadeId);
      } else {
        setUnidadeSelecionadaState(null);
      }
    } else if (escopo === "consultor_campo") {
      setUnidadeSelecionadaState(null);
    } else if (unidadesDisponiveis.length === 1) {
      setUnidadeSelecionadaState(unidadesDisponiveis[0].unidadeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo, user]);

  const selecionada = unidadesDisponiveis.find(u => u.unidadeId === unidadeSelecionada);
  const nomeUnidadeSelecionada = selecionada?.unidadeNome || "Todas as Clínicas";
  const corUnidadeSelecionada = selecionada?.unidadeCor || null;
  const isTodasClinicas = unidadeSelecionada === null;

  const modoVisao: ModoVisao = (() => {
    if (escopo === "consultoria_master" && isTodasClinicas) return "arquiteto_mestre";
    if (escopo === "consultoria_master" && !isTodasClinicas) return "dono_clinica";
    if (escopo === "consultor_campo") return "consultor";
    return "operacional";
  })();

  const modoLabel = (() => {
    switch (modoVisao) {
      case "arquiteto_mestre": return "Visao Global";
      case "dono_clinica": return "Visao Local";
      case "consultor": return "Consultor";
      case "operacional": return "Operacional";
    }
  })();

  return (
    <ClinicContext.Provider value={{
      unidadeSelecionada,
      setUnidadeSelecionada,
      unidadesDisponiveis,
      nomeUnidadeSelecionada,
      corUnidadeSelecionada,
      isTodasClinicas,
      escopo,
      modoVisao,
      modoLabel,
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
