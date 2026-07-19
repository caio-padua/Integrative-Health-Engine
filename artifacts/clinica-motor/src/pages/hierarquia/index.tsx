import { useState } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { useClinic } from "@/contexts/ClinicContext";
import { ChevronDown, ChevronRight, Users, Building2, User } from "lucide-react";
import { PW, MONO } from "../penumbra-claro";

interface Colaborador {
  id: number;
  nomeCompleto: string;
  emailFuncional: string | null;
  telefone: string | null;
  statusAtivo: boolean | null;
  fotoUrl: string | null;
}

interface CargoComFilhos {
  id: number;
  cargo: string;
  indice: string;
  codigoCompleto: string;
  modalidade: string;
  slaDefault: string | null;
  reportaA: string | null;
  descricaoFuncao: string | null;
  colaboradores: Colaborador[];
  filhos: CargoComFilhos[];
}

interface HierarquiaData {
  arvore: CargoComFilhos[];
  totalCargos: number;
  totalColaboradores: number;
}

// Paleta de cores por nível na hierarquia
const NIVEL_CORES = [
  "#00B5D8", // ciano (raiz)
  "#4A90D9", // azul
  "#7B68EE", // roxo
  "#48BB78", // verde
  "#ED8936", // laranja
  "#E53E3E", // vermelho
];

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

interface NodoProps {
  nodo: CargoComFilhos;
  nivel: number;
  expandidosInicialmente?: boolean;
}

function HierarquiaNodo({ nodo, nivel, expandidosInicialmente = true }: NodoProps) {
  const [expandido, setExpandido] = useState(expandidosInicialmente);
  const [mostrarColaboradores, setMostrarColaboradores] = useState(false);
  const cor = NIVEL_CORES[Math.min(nivel, NIVEL_CORES.length - 1)];
  const temFilhos = nodo.filhos.length > 0;
  const temColaboradores = nodo.colaboradores.length > 0;

  return (
    <div style={{ marginLeft: nivel === 0 ? 0 : 28 }}>
      {/* Linha de conexão vertical */}
      <div
        style={{
          position: "relative",
          borderLeft: nivel > 0 ? `1px solid ${cor}30` : "none",
          paddingLeft: nivel > 0 ? 16 : 0,
          marginBottom: 4,
        }}
      >
        {/* Card do cargo */}
        <div
          style={{
            border: `1px solid ${cor}40`,
            borderLeft: `3px solid ${cor}`,
            background: `${cor}08`,
            padding: "8px 12px",
            marginBottom: 4,
          }}
        >
          {/* Cabeçalho do cargo */}
          <div className="flex items-center gap-2">
            {temFilhos && (
              <button
                onClick={() => setExpandido((p) => !p)}
                style={{ color: cor, padding: 0, background: "none", border: "none", cursor: "pointer" }}
              >
                {expandido ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
            {!temFilhos && <div className="w-3" />}

            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: cor, fontFamily: MONO }}
              >
                {nodo.cargo}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[9px] text-muted-foreground font-medium">
                  [{nodo.indice}] — {nodo.modalidade}
                </span>
                {nodo.slaDefault && (
                  <span
                    className="text-[9px] px-1.5 py-0.5"
                    style={{
                      background: `${cor}15`,
                      color: cor,
                      border: `1px solid ${cor}30`,
                      fontFamily: MONO,
                    }}
                  >
                    SLA {nodo.slaDefault}
                  </span>
                )}
                {nodo.reportaA && (
                  <span className="text-[9px] text-muted-foreground">
                    reporta → {nodo.reportaA}
                  </span>
                )}
              </div>
              {nodo.descricaoFuncao && (
                <div className="text-[10px] text-foreground/70 mt-1 leading-relaxed">
                  {nodo.descricaoFuncao}
                </div>
              )}
            </div>

            {/* Contador de colaboradores */}
            {temColaboradores && (
              <button
                onClick={() => setMostrarColaboradores((p) => !p)}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium"
                style={{
                  background: mostrarColaboradores ? `${cor}20` : `${cor}10`,
                  color: cor,
                  border: `1px solid ${cor}40`,
                  cursor: "pointer",
                  fontFamily: MONO,
                }}
              >
                <Users className="w-3 h-3" />
                {nodo.colaboradores.length}
              </button>
            )}
            {!temColaboradores && (
              <div
                className="flex items-center gap-1 px-2 py-1 text-[10px]"
                style={{ color: "#ffffff30", fontFamily: MONO }}
              >
                <User className="w-3 h-3" />
                0
              </div>
            )}
          </div>

          {/* Lista de colaboradores expandível */}
          {mostrarColaboradores && temColaboradores && (
            <div
              className="mt-3 pt-3 space-y-2"
              style={{ borderTop: `1px solid ${cor}20` }}
            >
              {nodo.colaboradores.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  {/* Avatar com iniciais */}
                  <div
                    className="w-6 h-6 flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{ background: cor, color: "#fff" }}
                  >
                    {iniciais(c.nomeCompleto)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-foreground leading-tight truncate">
                      {c.nomeCompleto}
                    </div>
                    {c.emailFuncional && (
                      <div className="text-[9px] text-muted-foreground truncate">
                        {c.emailFuncional}
                      </div>
                    )}
                  </div>
                  <div
                    className="ml-auto text-[9px] px-1.5 py-0.5 flex-shrink-0"
                    style={{
                      background: c.statusAtivo ? "#48BB7820" : "#E53E3E20",
                      color: c.statusAtivo ? "#48BB78" : "#E53E3E",
                      border: `1px solid ${c.statusAtivo ? "#48BB7840" : "#E53E3E40"}`,
                      fontFamily: MONO,
                    }}
                  >
                    {c.statusAtivo ? "ATIVO" : "INATIVO"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filhos recursivos */}
        {expandido && temFilhos && (
          <div>
            {nodo.filhos.map((filho) => (
              <HierarquiaNodo
                key={filho.id}
                nodo={filho}
                nivel={nivel + 1}
                expandidosInicialmente={nivel < 2}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HierarquiaPage() {
  const { unidadeSelecionada } = useClinic();
  const params = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";

  const { data, isLoading, error } = useQuery<HierarquiaData>({
    queryKey: ["hierarquia", unidadeSelecionada],
    queryFn: async () => {
      const res = await apiFetch(`/api/hierarquia${params}`);
      if (!res.ok) throw new Error("Erro ao carregar hierarquia");
      return res.json();
    },
  });

  return (
    <Layout>
      <div className="space-y-4 p-4">
        {/* Cabeçalho */}
        <div
          className="p-4"
          style={{ border: `1px solid ${PW.ciano}30`, borderLeft: `3px solid ${PW.ciano}` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-sm font-black uppercase tracking-widest"
                style={{ color: PW.ciano, fontFamily: MONO }}
              >
                HIERARQUIA VISUAL — PADTEAM
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Estrutura de cargos e colaboradores com vínculos de reportabilidade
              </div>
            </div>
            {data && (
              <div className="flex items-center gap-4 text-[10px]" style={{ fontFamily: MONO }}>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" style={{ color: PW.ciano }} />
                  <span className="text-muted-foreground">CARGOS</span>
                  <span className="font-black" style={{ color: PW.ciano }}>
                    {data.totalCargos}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" style={{ color: PW.ciano }} />
                  <span className="text-muted-foreground">COLABORADORES</span>
                  <span className="font-black" style={{ color: PW.ciano }}>
                    {data.totalColaboradores}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legenda de cores */}
        <div className="flex items-center gap-3 flex-wrap">
          {NIVEL_CORES.slice(0, 4).map((cor, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-1" style={{ background: cor }} />
              <span className="text-[9px] text-muted-foreground" style={{ fontFamily: MONO }}>
                NÍVEL {i + 1}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground ml-4">
            <Users className="w-3 h-3" />
            clique no contador para ver colaboradores
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <ChevronDown className="w-3 h-3" />
            clique na seta para expandir/recolher
          </div>
        </div>

        {/* Conteúdo principal */}
        {isLoading && (
          <div
            className="p-8 text-center text-[11px]"
            style={{ color: PW.muted, fontFamily: MONO }}
          >
            CARREGANDO HIERARQUIA...
          </div>
        )}

        {error && (
          <div
            className="p-4 text-[11px]"
            style={{
              border: `1px solid ${PW.danger}40`,
              borderLeft: `3px solid ${PW.danger}`,
              color: PW.danger,
              fontFamily: MONO,
            }}
          >
            ERRO: {(error as Error).message}
          </div>
        )}

        {data && data.arvore.length === 0 && (
          <div
            className="p-8 text-center text-[11px]"
            style={{ color: PW.muted, fontFamily: MONO, border: `1px solid ${PW.muted}20` }}
          >
            NENHUM CARGO CADASTRADO PARA ESTA UNIDADE
            <div className="mt-2 text-[10px]">
              Acesse /plataforma/colaboradores para cadastrar cargos e membros.
            </div>
          </div>
        )}

        {data && data.arvore.length > 0 && (
          <div className="space-y-2">
            {data.arvore.map((raiz) => (
              <HierarquiaNodo key={raiz.id} nodo={raiz} nivel={0} expandidosInicialmente />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
