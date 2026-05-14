import React from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, Eye, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
// Task #100 — ordenacao multi-coluna estilo Excel (clique substitui, Shift+clique
// adiciona criterio secundario, badge numerada mostra prioridade). Mesmo padrao
// aplicado em Pacientes (Task #98) e na timeline de assinaturas (Task #96).
// Backend revalida via whitelist em routes/rasRoute.ts ORDENACOES_RAS_FRAGMENT.
import {
  ColunaOrdenavel,
  type Ordenacao as OrdenacaoLib,
  chaveDeOrdenacao,
  dedupePorColuna,
  parseOrdenacoesFromString,
  serializarOrdenacoes,
  alternarOrdenacao,
} from "@/lib/ordenacao-multi";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";

import { apiFetch } from "@/lib/api-fetch";
const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface RasSubstancia {
  substanciaNome: string;
  dose: string;
  numeroSessao: number;
  totalSessoes: number;
  status: string;
}

interface Ras {
  id: number;
  sessaoId: number;
  protocoloId: number | null;
  pacienteId: number;
  nomePaciente: string;
  cpfPaciente: string;
  nomeProfissional: string;
  crmProfissional: string | null;
  unidade: string;
  dataServico: string;
  tipoServico: string;
  substancias: RasSubstancia[];
  observacoes: string | null;
  assinaturaPaciente: boolean;
  assinaturaProfissional: boolean;
  criadoEm: string;
}

// Task #100 — chaves de ordenacao da tabela de RAS. Espelha o whitelist
// server-side em routes/rasRoute.ts (ORDENACOES_RAS_FRAGMENT). Se uma chave
// for adicionada aqui, ADICIONAR tambem no fragment SQL — sem isso o backend
// silenciosamente ignora o token vindo da URL.
type ChaveOrdenacaoRas =
  | "ID" | "PACIENTE" | "PROFISSIONAL" | "UNIDADE" | "DATA" | "TIPO" | "CRIADO";
type OrdenacaoRas = OrdenacaoLib<ChaveOrdenacaoRas>;
const MAX_ORDENACOES_RAS = 4;
const ORDENACAO_URL_RAS: Record<OrdenacaoRas, string> = {
  ID_DESC: "id_desc",                     ID_ASC: "id_asc",
  PACIENTE_DESC: "paciente_desc",         PACIENTE_ASC: "paciente_asc",
  PROFISSIONAL_DESC: "profissional_desc", PROFISSIONAL_ASC: "profissional_asc",
  UNIDADE_DESC: "unidade_desc",           UNIDADE_ASC: "unidade_asc",
  DATA_DESC: "data_desc",                 DATA_ASC: "data_asc",
  TIPO_DESC: "tipo_desc",                 TIPO_ASC: "tipo_asc",
  CRIADO_DESC: "criado_desc",             CRIADO_ASC: "criado_asc",
};
const URL_TO_ORDENACAO_RAS: Record<string, OrdenacaoRas> = (() => {
  const m: Record<string, OrdenacaoRas> = {};
  (Object.keys(ORDENACAO_URL_RAS) as OrdenacaoRas[]).forEach((k) => {
    m[ORDENACAO_URL_RAS[k]] = k;
  });
  return m;
})();
function chaveStorageRas(uid: number | string | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.ras.ordenar_por.${uid}`;
}
// Task #213 — chave de localStorage por-usuario pra persistir filtros de
// unidade + janela de data entre visitas (mesmo padrao usado em
// `chaveStorageRas` pra ordenacao multi-coluna). URL tem prioridade quando
// presente — link compartilhavel reproduz visao exata.
function chaveStorageFiltrosRas(uid: number | string | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.ras.filtros.${uid}`;
}
interface FiltrosRasSalvos {
  unidadeId: number | null;
  dataInicio: string;
  dataFim: string;
}

export default function RasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { unidadesDisponiveis, unidadeSelecionada } = useClinic();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessaoIdInput, setSessaoIdInput] = useState("");
  const [obsInput, setObsInput] = useState("");

  // Task #104 — filtros de unidade + janela de data persistidos em
  // querystring (junto com ?ordenar_por=) pra link compartilhavel reproduzir
  // exatamente a mesma visao. unidadeId hidrata do useClinic() quando a URL
  // nao traz nada (consistencia com o seletor global).
  const lerQuery = (k: string): string => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(k) || "";
  };
  const [filtroUnidadeId, setFiltroUnidadeId] = useState<number | null>(() => {
    const v = lerQuery("unidadeId");
    if (v) {
      const n = Number(v);
      // Guard contra ?unidadeId=abc virar NaN no estado.
      if (Number.isInteger(n) && n > 0) return n;
    }
    return unidadeSelecionada;
  });
  // Quando o seletor global de clinica muda, refletir no filtro local —
  // mas SOMENTE se a URL nao traz unidadeId explicito (link compartilhavel
  // tem prioridade, mesmo padrao da hidratacao de ordenacao).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lerQuery("unidadeId")) return;
    setFiltroUnidadeId(unidadeSelecionada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeSelecionada]);
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>(() => lerQuery("dataInicio"));
  const [filtroDataFim, setFiltroDataFim] = useState<string>(() => lerQuery("dataFim"));

  const atualizarQuery = useCallback((chave: string, valor: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (valor) url.searchParams.set(chave, valor);
    else url.searchParams.delete(chave);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Task #213 — persistencia dos filtros (unidade + janela) em localStorage
  // por-usuario. Salva o snapshot completo a cada mudanca; limpa a chave
  // quando todos os filtros voltam ao default (nada selecionado).
  const salvarFiltrosStorage = useCallback((proximo: FiltrosRasSalvos) => {
    if (typeof window === "undefined") return;
    const k = chaveStorageFiltrosRas(user?.id);
    if (!k) return;
    try {
      const vazio = proximo.unidadeId === null && !proximo.dataInicio && !proximo.dataFim;
      if (vazio) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, JSON.stringify(proximo));
    } catch { /* ignore */ }
  }, [user?.id]);
  // Hidrata filtros salvos quando user fica disponivel, SOMENTE se nenhum
  // dos parametros relevantes esta na URL (link compartilhavel manda, mesmo
  // padrao da hidratacao de ordenacao). Espelha tambem na URL pra manter
  // a query consistente com o estado restaurado.
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("unidadeId") || params.get("dataInicio") || params.get("dataFim")) return;
    const k = chaveStorageFiltrosRas(user.id);
    if (!k) return;
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) return;
      const salvo = JSON.parse(raw) as Partial<FiltrosRasSalvos>;
      const uid = typeof salvo.unidadeId === "number" && Number.isInteger(salvo.unidadeId) && salvo.unidadeId > 0
        ? salvo.unidadeId
        : null;
      const di = typeof salvo.dataInicio === "string" ? salvo.dataInicio : "";
      const df = typeof salvo.dataFim === "string" ? salvo.dataFim : "";
      if (uid !== null) {
        setFiltroUnidadeId(uid);
        atualizarQuery("unidadeId", String(uid));
      }
      if (di) {
        setFiltroDataInicio(di);
        atualizarQuery("dataInicio", di);
      }
      if (df) {
        setFiltroDataFim(df);
        atualizarQuery("dataFim", df);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Task #100 — estado de ordenacao multi-coluna. Hidratado de `?ordenar_por=`
  // (link compartilhavel tem prioridade) ou de localStorage por-usuario.
  const parseOrdRasFromUrl = (): OrdenacaoRas[] => {
    if (typeof window === "undefined") return [];
    const v = new URLSearchParams(window.location.search).get("ordenar_por") || "";
    return parseOrdenacoesFromString<ChaveOrdenacaoRas>(v, URL_TO_ORDENACAO_RAS, MAX_ORDENACOES_RAS);
  };
  const [ordenacoesRas, setOrdenacoesRasState] = useState<OrdenacaoRas[]>(parseOrdRasFromUrl);
  const setOrdenacoesRas = useCallback((novas: OrdenacaoRas[]) => {
    const dedupe = dedupePorColuna<ChaveOrdenacaoRas>(novas, MAX_ORDENACOES_RAS);
    setOrdenacoesRasState(dedupe);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const valor = serializarOrdenacoes<ChaveOrdenacaoRas>(dedupe, ORDENACAO_URL_RAS);
    if (valor) url.searchParams.set("ordenar_por", valor);
    else url.searchParams.delete("ordenar_por");
    window.history.replaceState({}, "", url.toString());
    const k = chaveStorageRas(user?.id);
    if (k) {
      try { window.localStorage.setItem(k, valor); } catch { /* ignore */ }
    }
  }, [user?.id]);
  // Hidrata salva quando user fica disponivel, SOMENTE se a URL nao traz
  // `?ordenar_por=` (link compartilhavel manda).
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const urlTem = new URLSearchParams(window.location.search).get("ordenar_por");
    if (urlTem) return;
    const k = chaveStorageRas(user.id);
    if (!k) return;
    try {
      const v = window.localStorage.getItem(k);
      if (v === null) return;
      const salvas = parseOrdenacoesFromString<ChaveOrdenacaoRas>(v, URL_TO_ORDENACAO_RAS, MAX_ORDENACOES_RAS);
      const atual = serializarOrdenacoes<ChaveOrdenacaoRas>(ordenacoesRas, ORDENACAO_URL_RAS);
      const proxima = serializarOrdenacoes<ChaveOrdenacaoRas>(salvas, ORDENACAO_URL_RAS);
      if (proxima !== atual) setOrdenacoesRas(salvas);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const ordenarPorString = serializarOrdenacoes<ChaveOrdenacaoRas>(ordenacoesRas, ORDENACAO_URL_RAS);
  // Task #103 — descreve no cabecalho impresso/exportado qual ordenacao foi
  // aplicada. Quando nao ha criterio customizado, mostra o padrao do backend
  // (ORDER BY criado_em DESC em routes/rasRoute.ts). Renderizado num bloco
  // `apenas-impressao` que so aparece via window.print() / Ctrl+P.
  const LABELS_RAS_ORDENACAO: Record<ChaveOrdenacaoRas, string> = {
    ID: "ID",
    PACIENTE: "Paciente",
    PROFISSIONAL: "Profissional",
    UNIDADE: "Unidade",
    DATA: "Data Servico",
    TIPO: "Tipo",
    CRIADO: "Criado em",
  };
  const descricaoOrdenacaoImpressao = ordenacoesRas.length === 0
    ? "padrão (Criado em DESC)"
    : ordenacoesRas
        .map((o) => `${LABELS_RAS_ORDENACAO[chaveDeOrdenacao(o)]} ${o.endsWith("_DESC") ? "DESC" : "ASC"}`)
        .join(" > ");
  const onClickColuna = useCallback((chave: ChaveOrdenacaoRas, shift: boolean) => {
    setOrdenacoesRas(alternarOrdenacao<ChaveOrdenacaoRas>(chave, shift, ordenacoesRas));
  }, [ordenacoesRas, setOrdenacoesRas]);
  const colunaAtivaDesc = (k: ChaveOrdenacaoRas) =>
    ordenacoesRas.includes(`${k}_DESC` as OrdenacaoRas);
  const colunaAtivaAsc = (k: ChaveOrdenacaoRas) =>
    ordenacoesRas.includes(`${k}_ASC` as OrdenacaoRas);
  const posicaoOrd = (k: ChaveOrdenacaoRas): number | undefined => {
    if (ordenacoesRas.length < 2) return undefined;
    const i = ordenacoesRas.findIndex((o) => o.startsWith(`${k}_`));
    return i === -1 ? undefined : i + 1;
  };

  // Task #214 — `totalSemFiltro` vem do header `X-Ras-Total-Sem-Filtro`
  // (so quando ha filtro server-side ativo). Usado pra mostrar "X de Y" no
  // cabecalho. Quando nao ha filtro, header nao vem e usamos rasList.length.
  const { data: rasResponse, isLoading } = useQuery<{ data: Ras[]; totalSemFiltro: number | null }>({
    queryKey: ["ras", ordenarPorString, filtroUnidadeId, filtroDataInicio, filtroDataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ordenarPorString) params.set("ordenarPor", ordenarPorString);
      if (filtroUnidadeId !== null) params.set("unidadeId", String(filtroUnidadeId));
      if (filtroDataInicio) params.set("dataInicio", filtroDataInicio);
      if (filtroDataFim) params.set("dataFim", filtroDataFim);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/api/ras${qs}`);
      if (!res.ok) throw new Error("Erro");
      const data = (await res.json()) as Ras[];
      const headerVal = res.headers.get("X-Ras-Total-Sem-Filtro");
      const totalSemFiltro = headerVal !== null && headerVal !== "" ? Number(headerVal) : null;
      return { data, totalSemFiltro: Number.isFinite(totalSemFiltro as number) ? totalSemFiltro : null };
    },
  });
  const rasList: Ras[] = rasResponse?.data ?? [];
  const totalSemFiltro = rasResponse?.totalSemFiltro ?? null;
  const filtrosAtivos = filtroUnidadeId !== null || !!filtroDataInicio || !!filtroDataFim;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/ras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessaoId: Number(sessaoIdInput), observacoes: obsInput || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar RAS");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "RAS gerado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["ras"] });
      setCreateOpen(false);
      setSessaoIdInput("");
      setObsInput("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const formatDate = (d: string) => {
    try {
      const parts = d.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      return d;
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              RAS - Registro de Atendimento em Saude
            </h1>
            {/* Task #214 — quando ha filtros server-side ativos, rasList.length
                reflete so a janela filtrada. Mostra "X de Y" + chip "filtrado"
                pra operador entender escala da clinica vs recorte atual. */}
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2" data-testid="ras-contagem">
              {filtrosAtivos && totalSemFiltro !== null ? (
                <>
                  <span>
                    <span data-testid="ras-contagem-filtrada">{rasList.length}</span>
                    {" de "}
                    <span data-testid="ras-contagem-total">{totalSemFiltro}</span>
                    {" registros de atendimento"}
                  </span>
                  <Badge variant="outline" className="text-[10px]" data-testid="ras-chip-filtrado">
                    filtrado
                  </Badge>
                </>
              ) : (
                <span>
                  <span data-testid="ras-contagem-total">{rasList.length}</span>
                  {" registros de atendimento"}
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar RAS
          </Button>
        </div>

        {/* Task #103 — cabecalho de ordenacao no PDF/print (Ctrl+P).
            So aparece no modo impressao via classe `apenas-impressao`
            definida em styles/print-relatorio.css. */}
        <div className="apenas-impressao text-sm font-mono mb-2" data-testid="ras-ordenacao-impressao">
          Ordenado por: {descricaoOrdenacaoImpressao}
        </div>

        {/* Task #104 — barra de filtros server-side. Unidade vem do
            useClinic() (mesma fonte do seletor global) e a janela de data
            usa <input type="date">. Tudo persiste em querystring. */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Unidade</Label>
              <select
                data-testid="filtro-ras-unidade"
                className="h-9 border bg-background px-2 text-sm"
                value={filtroUnidadeId === null ? "" : String(filtroUnidadeId)}
                onChange={(e) => {
                  const v = e.target.value;
                  const novo = v === "" ? null : Number(v);
                  setFiltroUnidadeId(novo);
                  atualizarQuery("unidadeId", v);
                  salvarFiltrosStorage({ unidadeId: novo, dataInicio: filtroDataInicio, dataFim: filtroDataFim });
                }}
              >
                <option value="">Todas as Clínicas</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.unidadeId} value={u.unidadeId}>{u.unidadeNome}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Data inicio</Label>
              <Input
                data-testid="filtro-ras-data-inicio"
                type="date"
                className="h-9 w-[170px]"
                value={filtroDataInicio}
                onChange={(e) => {
                  setFiltroDataInicio(e.target.value);
                  atualizarQuery("dataInicio", e.target.value);
                  salvarFiltrosStorage({ unidadeId: filtroUnidadeId, dataInicio: e.target.value, dataFim: filtroDataFim });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Data fim</Label>
              <Input
                data-testid="filtro-ras-data-fim"
                type="date"
                className="h-9 w-[170px]"
                value={filtroDataFim}
                onChange={(e) => {
                  setFiltroDataFim(e.target.value);
                  atualizarQuery("dataFim", e.target.value);
                  salvarFiltrosStorage({ unidadeId: filtroUnidadeId, dataInicio: filtroDataInicio, dataFim: e.target.value });
                }}
              />
            </div>
            {(filtroUnidadeId !== null || filtroDataInicio || filtroDataFim) && (
              <Button
                variant="ghost"
                size="sm"
                data-testid="filtro-ras-limpar"
                onClick={() => {
                  setFiltroUnidadeId(null);
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                  atualizarQuery("unidadeId", "");
                  atualizarQuery("dataInicio", "");
                  atualizarQuery("dataFim", "");
                  // Task #213 — limpar tambem o snapshot persistido pra
                  // proxima visita comecar zerada (sem o "fantasma" do
                  // ultimo filtro voltando do localStorage).
                  salvarFiltrosStorage({ unidadeId: null, dataInicio: "", dataFim: "" });
                }}
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : rasList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <FileCheck className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg">Nenhum RAS registrado.</p>
                <p className="text-sm">Gere um RAS a partir de uma sessao concluida.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="ID"
                        ativaDesc={colunaAtivaDesc("ID")}
                        ativaAsc={colunaAtivaAsc("ID")}
                        posicao={posicaoOrd("ID")}
                        onClick={(shift) => onClickColuna("ID", shift)}
                        testId="ord-ras-id"
                      />
                    </TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Paciente"
                        ativaDesc={colunaAtivaDesc("PACIENTE")}
                        ativaAsc={colunaAtivaAsc("PACIENTE")}
                        posicao={posicaoOrd("PACIENTE")}
                        onClick={(shift) => onClickColuna("PACIENTE", shift)}
                        testId="ord-ras-paciente"
                      />
                    </TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Profissional"
                        ativaDesc={colunaAtivaDesc("PROFISSIONAL")}
                        ativaAsc={colunaAtivaAsc("PROFISSIONAL")}
                        posicao={posicaoOrd("PROFISSIONAL")}
                        onClick={(shift) => onClickColuna("PROFISSIONAL", shift)}
                        testId="ord-ras-profissional"
                      />
                    </TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Unidade"
                        ativaDesc={colunaAtivaDesc("UNIDADE")}
                        ativaAsc={colunaAtivaAsc("UNIDADE")}
                        posicao={posicaoOrd("UNIDADE")}
                        onClick={(shift) => onClickColuna("UNIDADE", shift)}
                        testId="ord-ras-unidade"
                      />
                    </TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Data Servico"
                        ativaDesc={colunaAtivaDesc("DATA")}
                        ativaAsc={colunaAtivaAsc("DATA")}
                        posicao={posicaoOrd("DATA")}
                        onClick={(shift) => onClickColuna("DATA", shift)}
                        testId="ord-ras-data"
                      />
                    </TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Tipo"
                        ativaDesc={colunaAtivaDesc("TIPO")}
                        ativaAsc={colunaAtivaAsc("TIPO")}
                        posicao={posicaoOrd("TIPO")}
                        onClick={(shift) => onClickColuna("TIPO", shift)}
                        testId="ord-ras-tipo"
                      />
                    </TableHead>
                    <TableHead>Substancias</TableHead>
                    <TableHead>Assinaturas</TableHead>
                    <TableHead>
                      <ColunaOrdenavel
                        label="Criado"
                        ativaDesc={colunaAtivaDesc("CRIADO")}
                        ativaAsc={colunaAtivaAsc("CRIADO")}
                        posicao={posicaoOrd("CRIADO")}
                        onClick={(shift) => onClickColuna("CRIADO", shift)}
                        testId="ord-ras-criado"
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rasList.map(ras => (
                    <React.Fragment key={ras.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === ras.id ? null : ras.id)}
                      >
                        <TableCell>
                          {expandedId === ras.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">RAS-{String(ras.id).padStart(4, "0")}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{ras.nomePaciente}</div>
                          <div className="text-xs text-muted-foreground font-mono">{ras.cpfPaciente}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{ras.nomeProfissional}</div>
                          {ras.crmProfissional && (
                            <div className="text-xs text-muted-foreground">CRM {ras.crmProfissional}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{ras.unidade}</TableCell>
                        <TableCell className="text-sm font-mono">{formatDate(ras.dataServico)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{ras.tipoServico}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/20 text-primary text-[10px]">
                            {Array.isArray(ras.substancias) ? ras.substancias.length : 0} itens
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {ras.assinaturaPaciente ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            {ras.assinaturaProfissional ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(ras.criadoEm).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                      {expandedId === ras.id && (
                        <TableRow key={`${ras.id}-detail`}>
                          <TableCell colSpan={10} className="bg-muted/20 p-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground block text-xs">Sessao ID</span>
                                  <span className="font-mono">{ras.sessaoId}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Protocolo ID</span>
                                  <span className="font-mono">{ras.protocoloId || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Criado Em</span>
                                  <span className="font-mono text-xs">{new Date(ras.criadoEm).toLocaleString("pt-BR")}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Assinaturas</span>
                                  <span>Paciente: {ras.assinaturaPaciente ? "Sim" : "Nao"} | Prof: {ras.assinaturaProfissional ? "Sim" : "Nao"}</span>
                                </div>
                              </div>

                              {ras.observacoes && (
                                <div className="p-3 bg-muted/30 rounded-md border text-sm">
                                  <span className="text-muted-foreground text-xs block mb-1">Observacoes</span>
                                  {ras.observacoes}
                                </div>
                              )}

                              {Array.isArray(ras.substancias) && ras.substancias.length > 0 && (
                                <div>
                                  <span className="text-xs text-muted-foreground block mb-2">Substancias Aplicadas</span>
                                  <div className="grid gap-2">
                                    {ras.substancias.map((s: RasSubstancia, i: number) => (
                                      <div key={i} className="flex items-center gap-3 bg-background border rounded-md p-2 text-sm">
                                        <span className="font-medium flex-1">{s.substanciaNome}</span>
                                        <Badge variant="outline" className="text-[10px] font-mono">{s.dose}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          Sessao {s.numeroSessao}/{s.totalSessoes}
                                        </span>
                                        <Badge className={`text-[10px] ${s.status === "aplicado" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                                          {s.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Gerar RAS a partir de Sessao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>ID da Sessao</Label>
                <Input
                  type="number"
                  value={sessaoIdInput}
                  onChange={e => setSessaoIdInput(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
              <div>
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  value={obsInput}
                  onChange={e => setObsInput(e.target.value)}
                  placeholder="Observacoes sobre o atendimento..."
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                className="w-full"
                disabled={createMutation.isPending || !sessaoIdInput}
              >
                {createMutation.isPending ? "Gerando..." : "Gerar RAS"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
