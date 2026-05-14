// PAWARDS MEDCORE · Wave 10 F5 · /assinaturas/timeline
// Lista as últimas 50 solicitações de assinatura digital (PARQ + TCLE + Orçamento).
// Master-only no router; backend filtra via cookie pawards.auth.token.
import { useEffect, useRef, useState, useCallback, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
// Task #98 — extraido pra lib reutilizavel (ver artifacts/clinica-motor/src/lib/ordenacao-multi.ts).
// Pacientes (Task #98) usa o mesmo padrao Excel-like de ordenacao multi-coluna.
import {
  ColunaOrdenavel,
  type Ordenacao as OrdenacaoLib,
  chaveDeOrdenacao as chaveDeOrdenacaoLib,
  dedupePorColuna as dedupePorColunaLib,
  parseOrdenacoesFromString as parseOrdenacoesFromStringLib,
  serializarOrdenacoes as serializarOrdenacoesLib,
  alternarOrdenacao as alternarOrdenacaoLib,
} from "@/lib/ordenacao-multi";
// Task #216 — hook generico de "memoria de filtros por usuario com URL
// ganhando do storage". Antes a logica vivia inline aqui (Task #88 +
// Task #90); agora vive em `lib/useFiltroPersistido.ts` e e reaproveitada
// em outras telas (pacientes/RAS).
import { useFiltroPersistido } from "@/lib/useFiltroPersistido";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const BLUE = "#2563eb";
const ZINC = "#71717a";

type Solicitacao = {
  id: number;
  status: string;
  provedor_codigo: string;
  provedor_envelope_id: string | null;
  zapsign_external_id: string | null;
  criado_em: string;
  enviado_em: string | null;
  concluido_em: string | null;
  expira_em: string | null;
  template_codigo: string;
  template_nome: string;
  template_tipo: string;
  paciente_id: number | null;
  paciente_nome: string | null;
  paciente_unidade_id: number | null;
  paciente_unidade_nome: string | null;
  signatarios_total: number;
  signatarios_assinados: number;
  auditoria_eventos: number;
  // Task #79 — campos novos vindos do JOIN (mesmas regras do export Task #77).
  // null quando o template nao tem essa dimensao (ex: TCLE = sem farmacia).
  valor_brl: number | null;
  farmacia: string | null;
  medico: string | null;
};

// Task #79 — formata BRL pra celula de tabela e linha de soma do rodape.
// Usa Intl pra moeda nativa pt-BR (R$ 1.234,56), sem dependencia extra.
function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; fg: string; icon: any }
> = {
  RASCUNHO: { label: "RASCUNHO", bg: "#F4F4F5", fg: ZINC, icon: Clock },
  ENVIADO: { label: "ENVIADO", bg: "#DBEAFE", fg: BLUE, icon: FileSignature },
  PARCIAL: { label: "PARCIAL", bg: "#FEF9E7", fg: AMBER, icon: AlertTriangle },
  CONCLUIDO: { label: "CONCLUÍDO", bg: "#DCFCE7", fg: GREEN, icon: CheckCircle2 },
  REJEITADO: { label: "REJEITADO", bg: "#FEE2E2", fg: RED, icon: XCircle },
  EXPIRADO: { label: "EXPIRADO", bg: "#F4F4F5", fg: ZINC, icon: XCircle },
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGES[status] || {
    label: status,
    bg: "#F4F4F5",
    fg: ZINC,
    icon: AlertTriangle,
  };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// Task #73 — paginacao explicita. Pagina de 50 mantem o comportamento original
// e bate com o LIMIT default do backend; "Carregar mais" appendiza paginas
// adicionais sem perder filtros (paciente nao perde scroll).
const LIMITE_PAGINA = 50;

// Task #198 — espelha o cap server-side do CSV (`limiteCsv = 5000` em
// `artifacts/api-server/src/routes/assinaturas.ts`). Usado pra avisar na
// propria tela, ANTES do clique, quando o filtro atual vai ser truncado:
// "Baixar CSV (5000 de 7.300)" + cor de alerta + tooltip explicando como
// refinar. Sem esse aviso, o Caio so descobria o truncamento depois de
// abrir o CSV no Excel (linha de rodape).
const LIMITE_EXPORT_CSV = 5000;

// Task #84/#96/#98 — `ColunaOrdenavel` extraido pra lib compartilhada
// (`@/lib/ordenacao-multi`). Mantido aqui apenas o re-export local pra nao
// quebrar referencias se algum teste importar deste modulo.

// Task #208 — Layout (ordem + largura) das colunas da tabela, persistido
// por usuario em localStorage. Mesma estrategia da Task #88 (ordenacao):
// chave `pawards.timeline.colunas_layout.${uid}`. Sem URL — preferencia
// puramente local, nao e link compartilhavel (Caio usa recorte financeiro,
// Contador usa recorte clinico; cada conta reabre no proprio layout).
type ColunaId =
  | "ID" | "TEMPLATE" | "PACIENTE" | "CLINICA" | "STATUS" | "VALOR"
  | "FARMACIA" | "MEDICO" | "SIGNATARIOS" | "AUDITORIA"
  | "CRIADO" | "CONCLUIDO" | "DETALHE";

const ORDEM_PADRAO_COLUNAS: ColunaId[] = [
  "ID", "TEMPLATE", "PACIENTE", "CLINICA", "STATUS", "VALOR",
  "FARMACIA", "MEDICO", "SIGNATARIOS", "AUDITORIA",
  "CRIADO", "CONCLUIDO", "DETALHE",
];

const LARGURAS_PADRAO_COLUNAS: Record<ColunaId, number> = {
  ID: 60, TEMPLATE: 200, PACIENTE: 220, CLINICA: 160, STATUS: 130,
  VALOR: 120, FARMACIA: 150, MEDICO: 170, SIGNATARIOS: 110,
  AUDITORIA: 110, CRIADO: 140, CONCLUIDO: 140, DETALHE: 90,
};

const COLUNA_IDS_VALIDOS = new Set<ColunaId>(ORDEM_PADRAO_COLUNAS);
const LARGURA_MIN_COLUNA = 60;
const LARGURA_MAX_COLUNA = 800;

type LayoutColunas = { ordem: ColunaId[]; larguras: Record<ColunaId, number> };

function chaveStorageLayoutColunas(uid: number | string | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.timeline.colunas_layout.${uid}`;
}

function lerLayoutColunasSalvo(uid: number | string | undefined): LayoutColunas | null {
  if (typeof window === "undefined") return null;
  const k = chaveStorageLayoutColunas(uid);
  if (!k) return null;
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ordemBruta: unknown = parsed?.ordem;
    const largurasBrutas: unknown = parsed?.larguras;
    if (!Array.isArray(ordemBruta)) return null;
    // Sanitiza: mantem so IDs validos preservando ordem do usuario, e
    // appendiza qualquer coluna nova introduzida pelo app entre uma sessao
    // e outra (cobre upgrade sem perder a customizacao).
    const ordemFiltrada: ColunaId[] = [];
    const vistos = new Set<ColunaId>();
    for (const id of ordemBruta) {
      if (typeof id === "string" && COLUNA_IDS_VALIDOS.has(id as ColunaId) && !vistos.has(id as ColunaId)) {
        ordemFiltrada.push(id as ColunaId);
        vistos.add(id as ColunaId);
      }
    }
    for (const id of ORDEM_PADRAO_COLUNAS) {
      if (!vistos.has(id)) ordemFiltrada.push(id);
    }
    const larguras: Record<ColunaId, number> = { ...LARGURAS_PADRAO_COLUNAS };
    if (largurasBrutas && typeof largurasBrutas === "object") {
      for (const id of ORDEM_PADRAO_COLUNAS) {
        const v = (largurasBrutas as Record<string, unknown>)[id];
        if (typeof v === "number" && Number.isFinite(v)) {
          larguras[id] = Math.min(LARGURA_MAX_COLUNA, Math.max(LARGURA_MIN_COLUNA, Math.round(v)));
        }
      }
    }
    return { ordem: ordemFiltrada, larguras };
  } catch { return null; }
}

function salvarLayoutColunas(uid: number | string | undefined, layout: LayoutColunas) {
  if (typeof window === "undefined") return;
  const k = chaveStorageLayoutColunas(uid);
  if (!k) return;
  try { window.localStorage.setItem(k, JSON.stringify(layout)); } catch { /* ignore */ }
}

function limparLayoutColunasSalvo(uid: number | string | undefined) {
  if (typeof window === "undefined") return;
  const k = chaveStorageLayoutColunas(uid);
  if (!k) return;
  try { window.localStorage.removeItem(k); } catch { /* ignore */ }
}

function layoutColunasIgualAoPadrao(ordem: ColunaId[], larguras: Record<ColunaId, number>): boolean {
  if (ordem.length !== ORDEM_PADRAO_COLUNAS.length) return false;
  for (let i = 0; i < ordem.length; i += 1) {
    if (ordem[i] !== ORDEM_PADRAO_COLUNAS[i]) return false;
  }
  for (const id of ORDEM_PADRAO_COLUNAS) {
    if (larguras[id] !== LARGURAS_PADRAO_COLUNAS[id]) return false;
  }
  return true;
}

export default function AssinaturasTimeline() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [totalReal, setTotalReal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Task #90 — helpers genericos pra persistir filtros por-usuario em
  // localStorage. Mesma estrategia da Task #88 (que ja salvava `ordenar_por`):
  // chave dedicada por filtro + por user.id, hidratacao so quando a URL nao
  // traz o param (link compartilhavel sempre vence). String vazia = "limpo
  // explicitamente" pra a hidratacao saber que nao deve restaurar valor antigo.
  function chaveStorageFiltro(nome: string, uid: number | string | undefined): string | null {
    if (uid === undefined || uid === null) return null;
    return `pawards.timeline.${nome}.${uid}`;
  }
  function lerStorageFiltro(nome: string, uid: number | string | undefined): string | null {
    if (typeof window === "undefined") return null;
    const k = chaveStorageFiltro(nome, uid);
    if (!k) return null;
    try { return window.localStorage.getItem(k); } catch { return null; }
  }
  function salvarStorageFiltro(nome: string, uid: number | string | undefined, valor: string) {
    if (typeof window === "undefined") return;
    const k = chaveStorageFiltro(nome, uid);
    if (!k) return;
    try { window.localStorage.setItem(k, valor); } catch { /* ignore */ }
  }

  // Task #51 — leitura do filtro `?unidade_id=` na URL pra abrir a timeline
  // ja escopada numa clinica especifica (clique vindo do banner CEO).
  // Task #90 — state + persistencia por-usuario; URL continua tendo prioridade.
  // Task #216 — agora via hook generico `useFiltroPersistido`; comportamento
  // identico (mesma chave de storage `pawards.timeline.filtro_unidade_id.<uid>`,
  // mesmo paramUrl `unidade_id`, default `null`).
  const [filtroUnidadeId, setFiltroUnidadeId] = useFiltroPersistido<number | null>({
    scope: "timeline",
    nome: "filtro_unidade_id",
    uid: user?.id,
    paramUrl: "unidade_id",
    defaultValue: null,
    parse: (raw) => {
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    },
    serialize: (v) => (v === null ? "" : String(v)),
  });

  // Task #55 — chips de filtro por status no topo da tabela. Cada chip mapeia
  // pra 1+ status crus (ex.: "Em andamento" agrupa ENVIADO+PARCIAL, "Rejeitada"
  // agrupa REJEITADO+EXPIRADO) — bate com a leitura humana dos cards de resumo.
  // Task #59 — persistir o chip ativo na URL via `?status=` (em_andamento|
  // concluido|rejeitado) pra deixar o link compartilhavel ja filtrado. "Todos"
  // remove o param. Co-existe com `?unidade_id=` (Task #51).
  type FiltroStatus = "TODOS" | "EM_ANDAMENTO" | "CONCLUIDO" | "REJEITADO";
  const STATUS_QUERY: Record<FiltroStatus, string[]> = {
    TODOS: [],
    EM_ANDAMENTO: ["ENVIADO", "PARCIAL"],
    CONCLUIDO: ["CONCLUIDO"],
    REJEITADO: ["REJEITADO", "EXPIRADO"],
  };
  const STATUS_URL: Record<FiltroStatus, string> = {
    TODOS: "",
    EM_ANDAMENTO: "em_andamento",
    CONCLUIDO: "concluido",
    REJEITADO: "rejeitado",
  };
  function parseStatusFromUrl(): FiltroStatus {
    if (typeof window === "undefined") return "TODOS";
    const v = (new URLSearchParams(window.location.search).get("status") || "")
      .toLowerCase();
    if (v === "em_andamento") return "EM_ANDAMENTO";
    if (v === "concluido") return "CONCLUIDO";
    if (v === "rejeitado") return "REJEITADO";
    return "TODOS";
  }
  // Task #216 — filtroStatus permanece inline (NAO migrou pro hook)
  // porque a Task #212 dispara um toast "Filtrando por X — sua ultima
  // escolha" no momento exato da hidratacao, com botao "ver tudo" pra
  // resetar. Esse efeito colateral nao tem como ser expressado pelo hook
  // generico sem vazar abstracao. filtroUnidadeId migrou; pacientes/index.tsx
  // tambem migrou — ja temos prova de reuso.
  const [filtroStatus, setFiltroStatusState] = useState<FiltroStatus>(parseStatusFromUrl);
  const setFiltroStatus = useCallback((novo: FiltroStatus) => {
    setFiltroStatusState(novo);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const valor = STATUS_URL[novo];
    if (valor) url.searchParams.set("status", valor);
    else url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());
    salvarStorageFiltro("filtro_status", user?.id, valor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Task #64 — filtro por intervalo de datas (criado_em). Persistido na URL
  // via `?desde=YYYY-MM-DD&ate=YYYY-MM-DD` pra link compartilhavel. Chips
  // rapidos: Hoje, 7 dias, 30 dias. "Personalizado" libera os 2 inputs de
  // data; "Tudo" limpa o recorte. O calculo de janela e feito no fuso local
  // do navegador (Caio opera em Sao Paulo) — backend trata como `::date`.
  type FiltroData = "TUDO" | "HOJE" | "7D" | "30D" | "PERSONALIZADO";
  function isoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function parseDatasFromUrl(): { desde: string; ate: string } {
    if (typeof window === "undefined") return { desde: "", ate: "" };
    const sp = new URLSearchParams(window.location.search);
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const desde = sp.get("desde") || "";
    const ate = sp.get("ate") || "";
    return {
      desde: re.test(desde) ? desde : "",
      ate: re.test(ate) ? ate : "",
    };
  }
  function detectarPresetInicial(desde: string, ate: string): FiltroData {
    if (!desde && !ate) return "TUDO";
    const hoje = isoLocal(new Date());
    if (desde === hoje && ate === hoje) return "HOJE";
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    if (desde === isoLocal(d7) && ate === hoje) return "7D";
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    if (desde === isoLocal(d30) && ate === hoje) return "30D";
    return "PERSONALIZADO";
  }
  // Task #80 + Task #84 + Task #96 — ordenacao da tabela. Estado agora e
  // LISTA de colunas (Task #96): clique simples substitui a ordenacao;
  // Shift+clique adiciona a coluna como criterio secundario/terciario.
  // Ex: clicar Template + Shift-clicar Criado = "todos os PARQ juntos, e
  // dentro de cada bloco, os mais recentes primeiro". Persistido na URL via
  // `?ordenar_por=template_asc,criado_desc` (lista) e em localStorage por-
  // usuario (mesma chave da Task #88, agora guarda lista). Backend revalida
  // server-side com whitelist + dedupe + cap de 4.
  type ChaveOrdenacao =
    | "VALOR" | "CRIADO" | "CONCLUIDO" | "STATUS"
    | "PACIENTE" | "MEDICO" | "FARMACIA" | "CLINICA" | "TEMPLATE";
  type Ordenacao = OrdenacaoLib<ChaveOrdenacao>;
  const MAX_ORDENACOES = 4;
  const ORDENACAO_URL: Record<Ordenacao, string> = {
    VALOR_DESC: "valor_desc",     VALOR_ASC: "valor_asc",
    CRIADO_DESC: "criado_desc",   CRIADO_ASC: "criado_asc",
    CONCLUIDO_DESC: "concluido_desc", CONCLUIDO_ASC: "concluido_asc",
    STATUS_DESC: "status_desc",   STATUS_ASC: "status_asc",
    PACIENTE_DESC: "paciente_desc", PACIENTE_ASC: "paciente_asc",
    MEDICO_DESC: "medico_desc",     MEDICO_ASC: "medico_asc",
    FARMACIA_DESC: "farmacia_desc", FARMACIA_ASC: "farmacia_asc",
    CLINICA_DESC: "clinica_desc",   CLINICA_ASC: "clinica_asc",
    TEMPLATE_DESC: "template_desc", TEMPLATE_ASC: "template_asc",
  };
  const URL_TO_ORDENACAO: Record<string, Ordenacao> = (() => {
    const m: Record<string, Ordenacao> = {};
    (Object.keys(ORDENACAO_URL) as Ordenacao[]).forEach((k) => {
      m[ORDENACAO_URL[k]] = k;
    });
    return m;
  })();
  const chaveDeOrdenacao = (o: Ordenacao): ChaveOrdenacao =>
    chaveDeOrdenacaoLib<ChaveOrdenacao>(o);
  const dedupePorColuna = (lista: Ordenacao[]): Ordenacao[] =>
    dedupePorColunaLib<ChaveOrdenacao>(lista, MAX_ORDENACOES);
  const parseOrdenacoesFromString = (raw: string): Ordenacao[] =>
    parseOrdenacoesFromStringLib<ChaveOrdenacao>(raw, URL_TO_ORDENACAO, MAX_ORDENACOES);
  function parseOrdenacoesFromUrl(): Ordenacao[] {
    if (typeof window === "undefined") return [];
    const v = new URLSearchParams(window.location.search).get("ordenar_por") || "";
    return parseOrdenacoesFromString(v);
  }
  const serializarOrdenacoes = (lista: Ordenacao[]): string =>
    serializarOrdenacoesLib<ChaveOrdenacao>(lista, ORDENACAO_URL);
  // Task #88 — chave por-usuario pra "lembrar" a ultima ordenacao escolhida
  // entre navegacoes. Se a URL tem `?ordenar_por=`, ele tem prioridade (link
  // compartilhavel continua mandando); caso contrario aplicamos a salva.
  function chaveStorageOrdenacao(uid: number | string | undefined): string | null {
    if (uid === undefined || uid === null) return null;
    return `pawards.timeline.ordenar_por.${uid}`;
  }
  function lerOrdenacoesSalvas(uid: number | string | undefined): Ordenacao[] | null {
    if (typeof window === "undefined") return null;
    const k = chaveStorageOrdenacao(uid);
    if (!k) return null;
    try {
      const v = window.localStorage.getItem(k);
      if (v === null) return null;
      // String vazia = "padrao explicito" (lista vazia / ID_DESC default).
      return parseOrdenacoesFromString(v);
    } catch { return null; }
  }
  const [ordenacoes, setOrdenacoesState] = useState<Ordenacao[]>(parseOrdenacoesFromUrl);
  const setOrdenacoes = useCallback((novas: Ordenacao[]) => {
    const dedupe = dedupePorColuna(novas);
    setOrdenacoesState(dedupe);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const valor = serializarOrdenacoes(dedupe);
    if (valor) url.searchParams.set("ordenar_por", valor);
    else url.searchParams.delete("ordenar_por");
    window.history.replaceState({}, "", url.toString());
    // Persiste a escolha por-usuario (Task #88 + Task #96 = lista). Salvamos
    // string vazia pra "padrao" tambem, pra reabrir a timeline lembrando que
    // o usuario voltou explicitamente pro default (sem `?ordenar_por=`).
    const k = chaveStorageOrdenacao(user?.id);
    if (k) {
      try { window.localStorage.setItem(k, valor); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Task #91 — labels humanos pra montar o aviso "Ordenando por X (Y) — sua
  // ultima escolha" quando a ordenacao salva e aplicada automaticamente.
  const LABEL_COLUNA: Record<ChaveOrdenacao, string> = {
    VALOR: "Valor", CRIADO: "Criado em", CONCLUIDO: "Concluído em",
    STATUS: "Status", PACIENTE: "Paciente", MEDICO: "Médico",
    FARMACIA: "Farmácia", CLINICA: "Clínica", TEMPLATE: "Template",
  };
  function descreverOrdenacao(o: Ordenacao): string {
    const k = chaveDeOrdenacao(o);
    const desc = o.endsWith("_DESC");
    let direcao: string;
    if (k === "VALOR") direcao = desc ? "maior primeiro" : "menor primeiro";
    else if (k === "CRIADO" || k === "CONCLUIDO") direcao = desc ? "mais recente primeiro" : "mais antigo primeiro";
    else direcao = desc ? "Z→A" : "A→Z";
    return `${LABEL_COLUNA[k]} (${direcao})`;
  }

  const { toast } = useToast();
  const avisoOrdenacaoMostradoRef = useRef(false);
  const avisoStatusMostradoRef = useRef(false);
  const ultimoUserIdAvisoRef = useRef<number | string | null>(null);

  // Task #212 — labels humanos pra montar o aviso "Filtrando por X — sua
  // ultima escolha" quando o chip de status salvo e aplicado automaticamente.
  // Mesmo padrao da Task #91 (aviso de ordenacao).
  const LABEL_STATUS: Record<FiltroStatus, string> = {
    TODOS: "Todos",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDO: "Concluídas",
    REJEITADO: "Rejeitadas/Expiradas",
  };

  // Task #88 + Task #96 — hidrata a lista salva quando o usuario fica
  // disponivel, SOMENTE se a URL atual nao traz `?ordenar_por=` (link
  // compartilhavel continua tendo prioridade absoluta).
  // Task #91 — quando a hidratacao realmente aplica uma ordenacao salva
  // diferente do padrao, dispara um toast discreto de 3s explicando que a
  // tela respeitou a preferencia salva, com acao "voltar pro padrao" que
  // reseta pra ID_DESC (lista vazia).
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    // Reset do ref de "ja avisou" quando troca de conta na mesma sessao
    // (evita engolir o aviso pra outro usuario sem remount).
    if (ultimoUserIdAvisoRef.current !== user.id) {
      ultimoUserIdAvisoRef.current = user.id;
      avisoOrdenacaoMostradoRef.current = false;
      avisoStatusMostradoRef.current = false;
    }
    const urlTem = new URLSearchParams(window.location.search).get("ordenar_por");
    if (urlTem) return;
    const salvas = lerOrdenacoesSalvas(user.id);
    if (salvas === null) return;
    const atual = serializarOrdenacoes(ordenacoes);
    const proxima = serializarOrdenacoes(salvas);
    if (proxima !== atual) {
      setOrdenacoes(salvas);
      if (!avisoOrdenacaoMostradoRef.current && salvas.length > 0) {
        avisoOrdenacaoMostradoRef.current = true;
        const descricao = salvas.map(descreverOrdenacao).join(" · ");
        const t = toast({
          title: `Ordenando por ${descricao}`,
          description: "Aplicamos sua última escolha de ordenação.",
          duration: 3000,
          action: (
            <ToastAction
              altText="Voltar para a ordenação padrão"
              onClick={() => {
                // Reseta pra ID_DESC (lista vazia) E remove a chave do
                // localStorage literalmente — proxima visita re-mostra o
                // toast se o usuario configurar uma nova ordenacao.
                setOrdenacoes([]);
                const k = chaveStorageOrdenacao(user?.id);
                if (k && typeof window !== "undefined") {
                  try { window.localStorage.removeItem(k); } catch { /* ignore */ }
                }
                t.dismiss();
              }}
            >
              voltar pro padrão
            </ToastAction>
          ),
        });
      }
    }
    // Roda so quando o user.id muda (login/troca de conta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Task #215 — chip discreto que avisa quando filtros foram restaurados
  // automaticamente do localStorage (e nao da URL). Aparece logo apos a
  // hidratacao da Task #90, some sozinho em ~6s, ou quando o usuario mexe
  // em qualquer filtro, ou quando clica em "limpar". Sem o aviso, o Caio
  // podia abrir a timeline e estranhar "porque so estou vendo a clinica X?"
  // sem perceber que era preferencia da ultima visita.
  const [filtrosRestaurados, setFiltrosRestaurados] = useState<string[] | null>(null);
  const filtrosRestauradosTimerRef = useRef<number | null>(null);
  const filtrosRestauradosSnapshotRef = useRef<string | null>(null);
  const dispensarFiltrosRestaurados = useCallback(() => {
    setFiltrosRestaurados(null);
    filtrosRestauradosSnapshotRef.current = null;
    if (filtrosRestauradosTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(filtrosRestauradosTimerRef.current);
      filtrosRestauradosTimerRef.current = null;
    }
  }, []);

  // Task #90 — hidrata filtros de status e datas por-usuario quando o
  // user.id fica disponivel. URL tem prioridade granular (link compartilhavel
  // preserva exatamente o que ele traz). Unidade migrou pro hook
  // `useFiltroPersistido` (Task #216) — a hidratacao dela agora roda dentro
  // do proprio hook. Status e datas permanecem inline porque precisam
  // alimentar o chip "Filtros restaurados" (Task #215) com seus labels e,
  // no caso das datas, recomputar "hoje" no momento da hidratacao
  // (HOJE/7D/30D nao sao snapshot, sao janela viva).
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    // Task #215 — coleta os labels do que foi efetivamente restaurado pra
    // alimentar o chip de aviso no fim do effect.
    const restauradosLabels: string[] = [];

    // Status — Task #215 substitui o toast individual da Task #212 pelo chip
    // unificado: quando o status salvo e restaurado, registra o label
    // "status" na lista de filtros restaurados (clinica + status + periodo)
    // e o chip aparece uma unica vez com acao "limpar" que reseta tudo.
    if (!sp.get("status")) {
      const salvo = lerStorageFiltro("filtro_status", user.id);
      if (salvo !== null && salvo !== "") {
        const proximo: FiltroStatus | null =
          salvo === "em_andamento" ? "EM_ANDAMENTO" :
          salvo === "concluido"    ? "CONCLUIDO"    :
          salvo === "rejeitado"    ? "REJEITADO"    : null;
        if (proximo && proximo !== filtroStatus) {
          setFiltroStatus(proximo);
          // Task #215 — substitui o toast individual da Task #212 pelo chip
          // unificado que cobre todos os filtros restaurados (clinica, status,
          // periodo). Evita double-notify quando varios filtros voltam juntos
          // e da uma acao "limpar" que reseta tudo de uma vez.
          restauradosLabels.push("status");
        }
      }
    }


    // Datas (preset + desde + ate). Hidrata so se nem `desde` nem `ate`
    // estao na URL — se um dos dois veio do link, respeitamos o link inteiro.
    if (!sp.get("desde") && !sp.get("ate")) {
      const presetSalvo = lerStorageFiltro("filtro_data_preset", user.id);
      const desdeSalvo = lerStorageFiltro("filtro_data_desde", user.id) || "";
      const ateSalvo = lerStorageFiltro("filtro_data_ate", user.id) || "";
      const reData = /^\d{4}-\d{2}-\d{2}$/;
      const desdeOk = reData.test(desdeSalvo) ? desdeSalvo : "";
      const ateOk = reData.test(ateSalvo) ? ateSalvo : "";
      if (presetSalvo && presetSalvo !== "" && presetSalvo !== "TUDO") {
        // Preset com datas calculadas (HOJE/7D/30D recomputam pra "hoje" da
        // sessao atual; PERSONALIZADO usa o que foi salvo).
        if (presetSalvo === "PERSONALIZADO") {
          if (desdeOk || ateOk) {
            aplicarPersonalizado(desdeOk, ateOk);
            restauradosLabels.push("período");
          }
        } else if (
          presetSalvo === "HOJE" || presetSalvo === "7D" || presetSalvo === "30D"
        ) {
          aplicarPresetData(presetSalvo as FiltroData);
          restauradosLabels.push("período");
        }
      }
    }

    // Task #215 — dispara o chip de aviso uma unica vez por hidratacao,
    // com timer de 6s pra auto-dismiss. O snapshot dos filtros e capturado
    // num useEffect separado (logo abaixo) pra detectar interacao do usuario.
    if (restauradosLabels.length > 0) {
      setFiltrosRestaurados(restauradosLabels);
      if (typeof window !== "undefined") {
        if (filtrosRestauradosTimerRef.current !== null) {
          window.clearTimeout(filtrosRestauradosTimerRef.current);
        }
        filtrosRestauradosTimerRef.current = window.setTimeout(() => {
          setFiltrosRestaurados(null);
          filtrosRestauradosSnapshotRef.current = null;
          filtrosRestauradosTimerRef.current = null;
        }, 6000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Task #215 — dispensa o chip quando o usuario mexe em qualquer filtro
  // (unidade / status / datas). Usa snapshot tirado no primeiro render apos
  // o chip aparecer; qualquer divergencia subsequente = interacao = some.
  useEffect(() => {
    if (filtrosRestaurados === null) return;
    const snapshot = `${filtroUnidadeId ?? ""}|${filtroStatus}|${desdeInput}|${ateInput}`;
    if (filtrosRestauradosSnapshotRef.current === null) {
      filtrosRestauradosSnapshotRef.current = snapshot;
      return;
    }
    if (filtrosRestauradosSnapshotRef.current !== snapshot) {
      dispensarFiltrosRestaurados();
    }
  }, [filtrosRestaurados, filtroUnidadeId, filtroStatus, desdeInput, ateInput, dispensarFiltrosRestaurados]);

  // Task #215 — limpeza do timer no unmount pra evitar setState apos unmount.
  useEffect(() => {
    return () => {
      if (filtrosRestauradosTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(filtrosRestauradosTimerRef.current);
      }
    };
  }, []);
  // Task #96 — clique simples substitui a ordenacao (mantem comportamento
  // anterior); Shift+clique adiciona a coluna como criterio secundario.
  // Regras:
  //   clique simples (shift=false):
  //     - se a unica coluna ativa ja e essa em DESC -> vira ASC
  //     - se a unica coluna ativa ja e essa em ASC -> volta pro padrao (lista vazia)
  //     - caso contrario -> substitui a lista por [chave_DESC]
  //   Shift+clique (shift=true):
  //     - se a coluna nao esta na lista -> appendiza como _DESC
  //     - se ja esta como _DESC -> inverte pra _ASC
  //     - se ja esta como _ASC -> remove da lista
  const alternarOrdenacao = useCallback((chave: ChaveOrdenacao, shift: boolean) => {
    setOrdenacoes(alternarOrdenacaoLib<ChaveOrdenacao>(chave, shift, ordenacoes));
  }, [ordenacoes, setOrdenacoes]);

  // Helpers de leitura usados pelo render do header da tabela.
  const colunaAtivaDesc = useCallback(
    (k: ChaveOrdenacao) => ordenacoes.includes(`${k}_DESC` as Ordenacao),
    [ordenacoes],
  );
  const colunaAtivaAsc = useCallback(
    (k: ChaveOrdenacao) => ordenacoes.includes(`${k}_ASC` as Ordenacao),
    [ordenacoes],
  );
  const posicaoOrdenacao = useCallback(
    (k: ChaveOrdenacao): number | undefined => {
      if (ordenacoes.length < 2) return undefined;
      const i = ordenacoes.findIndex((o) => chaveDeOrdenacao(o) === k);
      return i === -1 ? undefined : i + 1;
    },
    [ordenacoes],
  );
  // String estavel pra dependencia do useEffect/useCallback (evitar laco
  // infinito por mudanca de referencia do array a cada render).
  const ordenacoesKey = serializarOrdenacoes(ordenacoes);

  const datasUrlInicial = parseDatasFromUrl();
  const [filtroData, setFiltroDataState] = useState<FiltroData>(
    detectarPresetInicial(datasUrlInicial.desde, datasUrlInicial.ate),
  );
  const [desdeInput, setDesdeInput] = useState<string>(datasUrlInicial.desde);
  const [ateInput, setAteInput] = useState<string>(datasUrlInicial.ate);

  const sincronizarDatasUrl = useCallback((desde: string, ate: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (desde) url.searchParams.set("desde", desde);
    else url.searchParams.delete("desde");
    if (ate) url.searchParams.set("ate", ate);
    else url.searchParams.delete("ate");
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Task #90 — persiste preset + datas por-usuario. Salvamos preset, desde
  // e ate em chaves separadas pra cada um seguir o mesmo contrato (URL vence,
  // string vazia = "limpo explicitamente").
  const persistirDatas = useCallback((preset: FiltroData, desde: string, ate: string) => {
    salvarStorageFiltro("filtro_data_preset", user?.id, preset === "TUDO" ? "" : preset);
    salvarStorageFiltro("filtro_data_desde", user?.id, desde);
    salvarStorageFiltro("filtro_data_ate", user?.id, ate);
  }, [user?.id]);

  const aplicarPresetData = useCallback((preset: FiltroData) => {
    setFiltroDataState(preset);
    const hoje = isoLocal(new Date());
    let desde = "", ate = "";
    if (preset === "HOJE") { desde = hoje; ate = hoje; }
    else if (preset === "7D") {
      const d = new Date(); d.setDate(d.getDate() - 6);
      desde = isoLocal(d); ate = hoje;
    } else if (preset === "30D") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      desde = isoLocal(d); ate = hoje;
    } else if (preset === "PERSONALIZADO") {
      // mantem o que estiver nos inputs (pode ser vazio — usuario preenche)
      desde = desdeInput;
      ate = ateInput;
    }
    setDesdeInput(desde);
    setAteInput(ate);
    sincronizarDatasUrl(desde, ate);
    persistirDatas(preset, desde, ate);
  }, [desdeInput, ateInput, sincronizarDatasUrl, persistirDatas]);

  const aplicarPersonalizado = useCallback((novoDesde: string, novoAte: string) => {
    setFiltroDataState("PERSONALIZADO");
    setDesdeInput(novoDesde);
    setAteInput(novoAte);
    sincronizarDatasUrl(novoDesde, novoAte);
    persistirDatas("PERSONALIZADO", novoDesde, novoAte);
  }, [sincronizarDatasUrl, persistirDatas]);

  // Task #73 — `carregar({ append })`: append=false reseta a tabela (1a pagina);
  // append=true appendiza usando offset = rows.length pra paginar sem perder
  // os registros ja exibidos. Filtros entram nos 2 modos pra a contagem
  // server-side (`total`) bater com a query da UI.
  const carregar = useCallback(async (opts?: { append?: boolean }) => {
    const append = opts?.append === true;
    if (append) setCarregandoMais(true);
    else setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
      const statusList = STATUS_QUERY[filtroStatus];
      if (statusList.length > 0) params.set("status", statusList.join(","));
      if (desdeInput) params.set("desde", desdeInput);
      if (ateInput) params.set("ate", ateInput);
      const valorOrdenacao = serializarOrdenacoes(ordenacoes);
      if (valorOrdenacao) params.set("ordenar_por", valorOrdenacao);
      params.set("limit", String(LIMITE_PAGINA));
      const offset = append ? rows.length : 0;
      params.set("offset", String(offset));
      const qs = `?${params.toString()}`;
      // Task #105 — apiFetch injeta Authorization Bearer automaticamente
      // (helper centralizado em src/lib/api-fetch.ts).
      const r = await apiFetch(`/api/assinaturas/timeline${qs}`);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      const novos: Solicitacao[] = data.solicitacoes || [];
      if (append) {
        // De-dup defensivo por id pra cobrir caso de novas linhas inseridas
        // entre a pagina 1 e a pagina 2 (deslocariam o offset e duplicariam
        // a borda). Mantem ordem do servidor (ORDER BY id DESC).
        setRows((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...novos.filter((n) => !ids.has(n.id))];
        });
      } else {
        setRows(novos);
      }
      setTotalReal(Number(data.total ?? novos.length));
      setHasMore(Boolean(data.has_more));
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
      setCarregandoMais(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidadeId, filtroStatus, desdeInput, ateInput, ordenacoesKey, rows.length]);

  // Recarrega 1a pagina sempre que qualquer filtro muda. Nao depende de
  // `carregar` direto pra evitar loop com `rows.length` na dep list.
  // Task #96 — depende de `ordenacoesKey` (string serializada) ao inves do
  // array em si pra evitar loop por mudanca de referencia a cada render.
  useEffect(() => {
    void carregar({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidadeId, filtroStatus, desdeInput, ateInput, ordenacoesKey]);

  // Task #209 — concentracao por medico do conjunto FILTRADO COMPLETO.
  // Calculado server-side (`/timeline/concentracao-medico`) pra refletir
  // o universo inteiro (paginado), nao so as linhas carregadas. So dispara
  // a chamada quando o primeiro criterio de ordenacao e MEDICO — fora
  // disso o card nao e renderizado, entao nao paga o custo da query.
  type ConcentracaoMedicoItem = { medico: string | null; n: number; soma_brl: number; pct: number };
  type ConcentracaoMedico = { total_receitas: number; total_medicos: number; top: ConcentracaoMedicoItem[] };
  const [concentracaoMedico, setConcentracaoMedico] = useState<ConcentracaoMedico | null>(null);
  const ordenarPorMedico = ordenacoes.length > 0 && chaveDeOrdenacao(ordenacoes[0]!) === "MEDICO";
  useEffect(() => {
    if (!ordenarPorMedico) { setConcentracaoMedico(null); return; }
    const params = new URLSearchParams();
    if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
    const statusList = STATUS_QUERY[filtroStatus];
    if (statusList.length > 0) params.set("status", statusList.join(","));
    if (desdeInput) params.set("desde", desdeInput);
    if (ateInput) params.set("ate", ateInput);
    const qs = params.toString() ? `?${params.toString()}` : "";
    let cancelado = false;
    (async () => {
      try {
        const r = await apiFetch(`/api/assinaturas/timeline/concentracao-medico${qs}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json() as ConcentracaoMedico;
        if (!cancelado) setConcentracaoMedico(data);
      } catch {
        if (!cancelado) setConcentracaoMedico(null);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenarPorMedico, filtroUnidadeId, filtroStatus, desdeInput, ateInput]);

  const totais = {
    enviado: rows.filter((r) => r.status === "ENVIADO" || r.status === "PARCIAL").length,
    concluido: rows.filter((r) => r.status === "CONCLUIDO").length,
    rejeitado: rows.filter((r) => r.status === "REJEITADO" || r.status === "EXPIRADO").length,
  };

  // Task #208 — estado de ordem + largura das colunas, hidratado de
  // localStorage por-usuario. Default = ORDEM_PADRAO_COLUNAS / LARGURAS_PADRAO_COLUNAS.
  const [ordemColunas, setOrdemColunas] = useState<ColunaId[]>(ORDEM_PADRAO_COLUNAS);
  const [largurasColunas, setLargurasColunas] = useState<Record<ColunaId, number>>(LARGURAS_PADRAO_COLUNAS);
  const [colunaArrastando, setColunaArrastando] = useState<ColunaId | null>(null);
  const [colunaAlvoArrasto, setColunaAlvoArrasto] = useState<ColunaId | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const salvo = lerLayoutColunasSalvo(user.id);
    if (salvo) {
      setOrdemColunas(salvo.ordem);
      setLargurasColunas(salvo.larguras);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const persistirLayoutColunas = useCallback((ordem: ColunaId[], larguras: Record<ColunaId, number>) => {
    salvarLayoutColunas(user?.id, { ordem, larguras });
  }, [user?.id]);

  const moverColuna = useCallback((origem: ColunaId, destino: ColunaId) => {
    if (origem === destino) return;
    setOrdemColunas((prev) => {
      const idxOrig = prev.indexOf(origem);
      const idxDest = prev.indexOf(destino);
      if (idxOrig === -1 || idxDest === -1) return prev;
      const nova = [...prev];
      nova.splice(idxOrig, 1);
      nova.splice(idxDest, 0, origem);
      persistirLayoutColunas(nova, largurasColunas);
      return nova;
    });
  }, [largurasColunas, persistirLayoutColunas]);

  // Resize: durante mousemove atualiza visualmente; persiste ao mouseup
  // pra evitar gravacoes excessivas no localStorage. Usa listeners no
  // window pra continuar funcionando se o cursor sair do thumb.
  const iniciarRedimensionamento = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>, id: ColunaId) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = largurasColunas[id] ?? LARGURAS_PADRAO_COLUNAS[id];
      let larguraFinal = startWidth;
      const onMove = (ev: MouseEvent) => {
        larguraFinal = Math.max(
          LARGURA_MIN_COLUNA,
          Math.min(LARGURA_MAX_COLUNA, Math.round(startWidth + (ev.clientX - startX))),
        );
        setLargurasColunas((prev) => ({ ...prev, [id]: larguraFinal }));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setLargurasColunas((prev) => {
          const novas = { ...prev, [id]: larguraFinal };
          persistirLayoutColunas(ordemColunas, novas);
          return novas;
        });
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [largurasColunas, ordemColunas, persistirLayoutColunas],
  );

  const restaurarLayoutColunasPadrao = useCallback(() => {
    setOrdemColunas(ORDEM_PADRAO_COLUNAS);
    setLargurasColunas(LARGURAS_PADRAO_COLUNAS);
    limparLayoutColunasSalvo(user?.id);
  }, [user?.id]);

  const layoutColunasNoPadrao = layoutColunasIgualAoPadrao(ordemColunas, largurasColunas);

  // Config de cada coluna: header (com botao de ordenacao quando aplicavel),
  // celula, alinhamento e visibilidade condicional. Mantido dentro do
  // componente porque o header usa callbacks/estado de ordenacao.
  const LABEL_COLUNA_PT: Record<ColunaId, string> = {
    ID: "#", TEMPLATE: "Template", PACIENTE: "Paciente", CLINICA: "Clínica",
    STATUS: "Status", VALOR: "Valor", FARMACIA: "Farmácia", MEDICO: "Médico",
    SIGNATARIOS: "Signatários", AUDITORIA: "Auditoria", CRIADO: "Criado",
    CONCLUIDO: "Concluído", DETALHE: "Detalhe",
  };
  const colunasConfig: Record<ColunaId, {
    header: ReactNode;
    cell: (r: Solicitacao) => ReactNode;
    align: "left" | "center" | "right";
    naoImprimir?: boolean;
    visivel?: () => boolean;
  }> = {
    ID: {
      align: "left",
      header: <span>#</span>,
      cell: (r) => <span className="font-mono text-xs">{r.id}</span>,
    },
    TEMPLATE: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Template"
          ativaDesc={colunaAtivaDesc("TEMPLATE")}
          ativaAsc={colunaAtivaAsc("TEMPLATE")}
          posicao={posicaoOrdenacao("TEMPLATE")}
          onClick={(shift) => alternarOrdenacao("TEMPLATE", shift)}
          testId="ordenar-por-template"
        />
      ),
      cell: (r) => (
        <>
          <div className="font-semibold" style={{ color: NAVY }}>{r.template_codigo}</div>
          <div className="text-xs" style={{ color: ZINC }}>{r.template_nome}</div>
        </>
      ),
    },
    PACIENTE: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Paciente"
          ativaDesc={colunaAtivaDesc("PACIENTE")}
          ativaAsc={colunaAtivaAsc("PACIENTE")}
          posicao={posicaoOrdenacao("PACIENTE")}
          onClick={(shift) => alternarOrdenacao("PACIENTE", shift)}
          testId="ordenar-por-paciente"
        />
      ),
      cell: (r) => r.paciente_nome
        ? <span>{r.paciente_nome}</span>
        : <span className="italic text-zinc-400">— sem vínculo —</span>,
    },
    CLINICA: {
      align: "left",
      visivel: () => filtroUnidadeId === null,
      header: (
        <ColunaOrdenavel
          label="Clínica"
          ativaDesc={colunaAtivaDesc("CLINICA")}
          ativaAsc={colunaAtivaAsc("CLINICA")}
          posicao={posicaoOrdenacao("CLINICA")}
          onClick={(shift) => alternarOrdenacao("CLINICA", shift)}
          testId="ordenar-por-clinica"
        />
      ),
      cell: (r) => (
        <span className="text-xs" style={{ color: NAVY }}>
          {r.paciente_unidade_nome
            ? <span>{r.paciente_unidade_nome}</span>
            : <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    STATUS: {
      align: "center",
      header: (
        <ColunaOrdenavel
          label="Status" align="center"
          ativaDesc={colunaAtivaDesc("STATUS")}
          ativaAsc={colunaAtivaAsc("STATUS")}
          posicao={posicaoOrdenacao("STATUS")}
          onClick={(shift) => alternarOrdenacao("STATUS", shift)}
          testId="ordenar-por-status"
        />
      ),
      cell: (r) => <StatusBadge status={r.status} />,
    },
    VALOR: {
      align: "right",
      header: (
        <ColunaOrdenavel
          label="Valor" align="right"
          ativaDesc={colunaAtivaDesc("VALOR")}
          ativaAsc={colunaAtivaAsc("VALOR")}
          posicao={posicaoOrdenacao("VALOR")}
          onClick={(shift) => alternarOrdenacao("VALOR", shift)}
          testId="ordenar-por-valor"
        />
      ),
      cell: (r) => (
        <span className="font-mono text-xs" style={{ color: NAVY }}>
          {r.valor_brl !== null
            ? formatarBRL(r.valor_brl)
            : <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    FARMACIA: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Farmácia"
          ativaDesc={colunaAtivaDesc("FARMACIA")}
          ativaAsc={colunaAtivaAsc("FARMACIA")}
          posicao={posicaoOrdenacao("FARMACIA")}
          onClick={(shift) => alternarOrdenacao("FARMACIA", shift)}
          testId="ordenar-por-farmacia"
        />
      ),
      cell: (r) => (
        <span className="text-xs" style={{ color: NAVY }}>
          {r.farmacia
            ? <span>{r.farmacia}</span>
            : <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    MEDICO: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Médico"
          ativaDesc={colunaAtivaDesc("MEDICO")}
          ativaAsc={colunaAtivaAsc("MEDICO")}
          posicao={posicaoOrdenacao("MEDICO")}
          onClick={(shift) => alternarOrdenacao("MEDICO", shift)}
          testId="ordenar-por-medico"
        />
      ),
      cell: (r) => (
        <span className="text-xs" style={{ color: NAVY }}>
          {r.medico
            ? <span>{r.medico}</span>
            : <span className="italic text-zinc-400">—</span>}
        </span>
      ),
    },
    SIGNATARIOS: {
      align: "center",
      header: <span>Signatários</span>,
      cell: (r) => (
        <span className="font-mono text-xs">
          <span style={{ color: GREEN, fontWeight: 700 }}>{r.signatarios_assinados}</span>
          <span style={{ color: ZINC }}> / {r.signatarios_total}</span>
        </span>
      ),
    },
    AUDITORIA: {
      align: "center",
      header: <span>Auditoria</span>,
      cell: (r) => r.auditoria_eventos > 0 ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-xs"
          style={{ background: "#FEF3E8", color: GOLD }}
          title="Manifesto SHA-256 gravado"
        >
          <ShieldCheck size={10} />
          {r.auditoria_eventos}
        </span>
      ) : <span className="font-mono text-xs" style={{ color: ZINC }}>—</span>,
    },
    CRIADO: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Criado"
          ativaDesc={colunaAtivaDesc("CRIADO")}
          ativaAsc={colunaAtivaAsc("CRIADO")}
          posicao={posicaoOrdenacao("CRIADO")}
          onClick={(shift) => alternarOrdenacao("CRIADO", shift)}
          testId="ordenar-por-criado"
        />
      ),
      cell: (r) => <span className="text-xs" style={{ color: ZINC }}>{formatarData(r.criado_em)}</span>,
    },
    CONCLUIDO: {
      align: "left",
      header: (
        <ColunaOrdenavel
          label="Concluído"
          ativaDesc={colunaAtivaDesc("CONCLUIDO")}
          ativaAsc={colunaAtivaAsc("CONCLUIDO")}
          posicao={posicaoOrdenacao("CONCLUIDO")}
          onClick={(shift) => alternarOrdenacao("CONCLUIDO", shift)}
          testId="ordenar-por-concluido"
        />
      ),
      cell: (r) => <span className="text-xs" style={{ color: ZINC }}>{formatarData(r.concluido_em)}</span>,
    },
    DETALHE: {
      align: "center",
      naoImprimir: true,
      header: <span>Detalhe</span>,
      cell: (r) => (
        <Link
          href={`/assinaturas/${r.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: BLUE }}
        >
          Abrir <ExternalLink size={10} />
        </Link>
      ),
    },
  };

  const colunasVisiveis: ColunaId[] = ordemColunas.filter((id) => {
    const cfg = colunasConfig[id];
    return cfg.visivel ? cfg.visivel() : true;
  });

  return (
    <Layout>
      <div
        data-pdf-titulo="Timeline de Assinaturas Digitais"
        className="p-6 space-y-6"
      >
        {/* Header */}
        <div
          className="rounded-lg p-5 flex items-start justify-between"
          style={{ background: NAVY, color: "#F9FAFB" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={20} style={{ color: GOLD }} />
              <h1 className="text-xl font-bold tracking-tight">
                Assinaturas Digitais — Timeline
              </h1>
            </div>
            <p className="text-sm opacity-80">
              Wave 10 ZapSign + ICP-Brasil · últimas 50 solicitações ·
              defensibilidade jurídica CFM 2.386/2024 + CC 593-609 + LGPD art. 11 §4º
            </p>
            {filtroUnidadeId !== null && (
              <div
                className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold"
                style={{ background: GOLD, color: NAVY }}
                data-testid="filtro-unidade-ativo"
              >
                Filtrado por unidade #{filtroUnidadeId}
                {/* Task #90 — antes era um <a href> que recarregava a pagina,
                    o que disparava a hidratacao do localStorage e trazia o
                    filtro de volta. Agora usa o setter pra limpar estado +
                    URL + storage de uma vez (string vazia salva = "limpo
                    explicitamente"). */}
                <button
                  type="button"
                  onClick={() => setFiltroUnidadeId(null)}
                  data-testid="limpar-filtro-unidade"
                  className="underline opacity-80 hover:opacity-100"
                  style={{ color: NAVY, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
                >
                  limpar
                </button>
              </div>
            )}
          </div>
          <div className="nao-imprimir flex items-center gap-2">
            {/* Task #60 — baixar CSV respeitando os mesmos filtros (unidade + status).
                Task #66 — inclui tambem desde/ate pra exportar exatamente o recorte da tela.
                Task #65 — botao paralelo XLSX (Excel) com datas tipadas + header em negrito.
                Task #73 — Atualizar agora recarrega a 1a pagina (append:false). */}
            {(() => {
              const params = new URLSearchParams();
              if (filtroUnidadeId !== null) params.set("unidade_id", String(filtroUnidadeId));
              const statusList = STATUS_QUERY[filtroStatus];
              if (statusList.length > 0) params.set("status", statusList.join(","));
              if (desdeInput) params.set("desde", desdeInput);
              if (ateInput) params.set("ate", ateInput);
              // Task #83 — repassa a ordenacao atual da tabela pros endpoints
              // de export, pra que CSV/XLSX baixem na MESMA ordem visivel na
              // tela. Task #93 — agora repassa qualquer valor da whitelist
              // (status/criado/concluido/paciente/medico/farmacia + valor),
              // nao so valor_*. ID_DESC e o default do servidor → omitido.
              // Task #96 — agora pode ser lista (ex: `template_asc,criado_desc`).
              const ordenarParam = serializarOrdenacoes(ordenacoes);
              if (ordenarParam) params.set("ordenar_por", ordenarParam);
              const qs = params.toString() ? `?${params.toString()}` : "";
              return (
                <>
                  {/* Task #97 — botao "Limpar ordenacao" aparece so quando
                      ha 2+ criterios ativos (Shift+clique acumulou colunas).
                      Volta pro padrao ID_DESC com 1 clique, limpando estado,
                      URL (`?ordenar_por=`) e localStorage (via setOrdenacoes
                      com lista vazia, que ja faz os 3). */}
                  {ordenacoes.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setOrdenacoes([])}
                      data-testid="botao-limpar-ordenacao"
                      title="Voltar à ordenação padrão (mais recente primeiro)"
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                      style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
                    >
                      <X size={14} />
                      Limpar ordenação
                    </button>
                  )}
                  {/* Task #208 — botao "Voltar pro padrao" do layout de
                      colunas (ordem + largura). So aparece quando o usuario
                      ja personalizou algo (arrastou ou redimensionou); senao
                      polui a barra de acoes pra quem nunca mexeu. Reseta
                      estado e apaga a chave de localStorage da conta atual. */}
                  {!layoutColunasNoPadrao && (
                    <button
                      type="button"
                      onClick={restaurarLayoutColunasPadrao}
                      data-testid="botao-restaurar-layout-colunas"
                      title="Voltar largura e ordem das colunas ao padrão"
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                      style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
                    >
                      <X size={14} />
                      Voltar pro padrão
                    </button>
                  )}
                  {/* Task #198 — aviso de truncamento ANTES do clique. O backend
                      ja envia `total` (COUNT real) na resposta do /timeline JSON,
                      entao da pra calcular sem request extra. Quando o filtro
                      atual casa com mais que `LIMITE_EXPORT_CSV` (5000), pinta
                      em laranja, mostra "(5000 de N)" e a tooltip sugere refinar.
                      Caso contrario, mostra so a contagem ("(N)") em estilo
                      neutro pra confirmar o tamanho do recorte. Quando ainda
                      esta carregando (`totalReal=0` durante 1o fetch), nao
                      enfeita o botao. */}
                  {(() => {
                    const vaiTruncar = totalReal > LIMITE_EXPORT_CSV;
                    const exportados = vaiTruncar ? LIMITE_EXPORT_CSV : totalReal;
                    const sufixo = totalReal > 0
                      ? vaiTruncar
                        ? ` (${exportados.toLocaleString("pt-BR")} de ${totalReal.toLocaleString("pt-BR")})`
                        : ` (${totalReal.toLocaleString("pt-BR")})`
                      : "";
                    const tituloTooltip = vaiTruncar
                      ? `Seu filtro casa com ${totalReal.toLocaleString("pt-BR")} registros, mas o CSV exporta no maximo ${LIMITE_EXPORT_CSV.toLocaleString("pt-BR")} (mais recentes primeiro). Refine o periodo (ex: meses menores) ou aplique status/unidade pra trazer o restante.`
                      : `Exporta ${totalReal.toLocaleString("pt-BR")} registros do recorte atual.`;
                    return (
                      <a
                        href={`/api/assinaturas/timeline.csv${qs}`}
                        data-testid="botao-baixar-csv"
                        data-truncado={vaiTruncar ? "1" : "0"}
                        title={tituloTooltip}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                        style={{
                          background: vaiTruncar ? "#FFF7ED" : "#FFFFFF",
                          color: vaiTruncar ? AMBER : NAVY,
                          borderColor: vaiTruncar ? AMBER : NAVY,
                        }}
                      >
                        {vaiTruncar ? <AlertTriangle size={14} /> : <Download size={14} />}
                        Baixar CSV{sufixo}
                      </a>
                    );
                  })()}
                  <a
                    href={`/api/assinaturas/timeline.xlsx${qs}`}
                    data-testid="botao-baixar-xlsx"
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition border"
                    style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
                  >
                    <Download size={14} />
                    Baixar XLSX
                  </a>
                </>
              );
            })()}
            <button
              onClick={() => carregar({ append: false })}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition"
              style={{ background: GOLD, color: NAVY }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Total em janela
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: NAVY }}>
              {totalReal}
            </div>
            {totalReal > rows.length && (
              <div className="text-[11px] mt-1" style={{ color: ZINC }}>
                exibindo {rows.length}
              </div>
            )}
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Em andamento
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: BLUE }}>
              {totais.enviado}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Concluídas
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: GREEN }}>
              {totais.concluido}
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
              Rejeitadas/Expiradas
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: RED }}>
              {totais.rejeitado}
            </div>
          </div>
        </div>

        {/* Task #215 — aviso discreto quando filtros foram restaurados do
            localStorage (preferencia da ultima visita). Some sozinho em 6s,
            ou quando o usuario mexe em qualquer filtro, ou quando clica
            "limpar". Nao aparece quando filtros vieram da URL (link
            compartilhavel). */}
        {filtrosRestaurados !== null && filtrosRestaurados.length > 0 && (
          <div
            className="nao-imprimir flex items-center gap-2"
            data-testid="aviso-filtros-restaurados"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border"
              style={{ background: "#FEF9E7", color: NAVY, borderColor: AMBER }}
            >
              <RefreshCw size={12} style={{ color: AMBER }} />
              <span>
                Filtros restaurados da sua última visita ({filtrosRestaurados.join(", ")})
              </span>
              <button
                type="button"
                onClick={() => {
                  setFiltroUnidadeId(null);
                  setFiltroStatus("TODOS");
                  aplicarPresetData("TUDO");
                  dispensarFiltrosRestaurados();
                }}
                data-testid="aviso-filtros-restaurados-limpar"
                className="underline font-semibold"
                style={{ color: NAVY }}
              >
                limpar
              </button>
              <button
                type="button"
                onClick={dispensarFiltrosRestaurados}
                data-testid="aviso-filtros-restaurados-fechar"
                aria-label="Fechar aviso"
                className="ml-1"
                style={{ color: ZINC }}
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* Task #64 — chips de filtro por intervalo de datas (criado_em) */}
        <div className="nao-imprimir flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
            Filtrar por período:
          </span>
          {([
            { key: "TUDO", label: "Tudo" },
            { key: "HOJE", label: "Hoje" },
            { key: "7D", label: "7 dias" },
            { key: "30D", label: "30 dias" },
            { key: "PERSONALIZADO", label: "Personalizado" },
          ] as { key: FiltroData; label: string }[]).map((opt) => {
            const ativo = filtroData === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => aplicarPresetData(opt.key)}
                data-testid={`filtro-data-${opt.key.toLowerCase()}`}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{
                  background: ativo ? NAVY : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : NAVY,
                  borderColor: NAVY,
                }}
              >
                {opt.label}
              </button>
            );
          })}
          {filtroData === "PERSONALIZADO" && (
            <span className="inline-flex items-center gap-2 ml-2">
              <label className="text-xs" style={{ color: ZINC }}>De</label>
              <input
                type="date"
                value={desdeInput}
                onChange={(e) => aplicarPersonalizado(e.target.value, ateInput)}
                data-testid="filtro-data-desde"
                className="border rounded px-2 py-1 text-xs"
                style={{ borderColor: NAVY, color: NAVY }}
              />
              <label className="text-xs" style={{ color: ZINC }}>até</label>
              <input
                type="date"
                value={ateInput}
                onChange={(e) => aplicarPersonalizado(desdeInput, e.target.value)}
                data-testid="filtro-data-ate"
                className="border rounded px-2 py-1 text-xs"
                style={{ borderColor: NAVY, color: NAVY }}
              />
            </span>
          )}
          {(desdeInput || ateInput) && filtroData !== "PERSONALIZADO" && (
            <span className="text-xs" style={{ color: ZINC }}>
              {desdeInput || "—"} → {ateInput || "—"}
            </span>
          )}
        </div>

        {/* Task #55 — chips de filtro por status */}
        <div className="nao-imprimir flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: ZINC }}>
            Filtrar por status:
          </span>
          {([
            { key: "TODOS", label: "Todos", cor: NAVY },
            { key: "EM_ANDAMENTO", label: "Em andamento", cor: BLUE },
            { key: "CONCLUIDO", label: "Concluídas", cor: GREEN },
            { key: "REJEITADO", label: "Rejeitadas/Expiradas", cor: RED },
          ] as { key: FiltroStatus; label: string; cor: string }[]).map((opt) => {
            const ativo = filtroStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFiltroStatus(opt.key)}
                data-testid={`filtro-status-${opt.key.toLowerCase()}`}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{
                  background: ativo ? opt.cor : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : opt.cor,
                  borderColor: opt.cor,
                }}
              >
                {opt.label}
              </button>
            );
          })}
          {/* Task #90 — botao "Limpar filtros" aparece quando ha qualquer
              filtro ativo (unidade / status / datas). Resetando estado +
              URL + localStorage de uma vez, pra reabrir a timeline crua na
              proxima visita. Nao mexe na ordenacao (tem botao proprio:
              "Limpar ordenacao", Task #97). */}
          {(filtroUnidadeId !== null
            || filtroStatus !== "TODOS"
            || filtroData !== "TUDO"
            || desdeInput !== ""
            || ateInput !== "") && (
            <button
              type="button"
              onClick={() => {
                setFiltroUnidadeId(null);
                setFiltroStatus("TODOS");
                aplicarPresetData("TUDO");
              }}
              data-testid="botao-limpar-filtros"
              title="Limpar todos os filtros (unidade, status, datas) e esquecer a preferencia salva"
              className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition"
              style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Erros / vazio */}
        {erro && (
          <div
            className="rounded p-3 text-sm"
            style={{ background: "#FEE2E2", color: RED }}
          >
            <strong>Erro:</strong> {erro}. Verifique se sua sessão é{" "}
            <code>validador_mestre</code> ou admin.
          </div>
        )}

        {!erro && !loading && rows.length === 0 && (
          <div
            className="rounded p-6 text-center text-sm"
            style={{ background: "#F4F4F5", color: ZINC }}
          >
            Nenhuma solicitação registrada ainda. Aguardando primeiro disparo
            ZapSign.
          </div>
        )}

        {/* Task #209 — card "Concentração por médico" no TOPO da tabela.
            Aparece quando o primeiro criterio de ordenacao e MEDICO (asc ou
            desc). Dados vem do endpoint server-side
            `/timeline/concentracao-medico` (mesmos filtros do GET timeline),
            entao ranking e % refletem o conjunto FILTRADO COMPLETO — nao so
            a pagina carregada. Sem isso, com paginacao ativa o top 5 ficaria
            errado. */}
        {ordenarPorMedico && concentracaoMedico !== null && concentracaoMedico.total_receitas > 0 && (
          <div
            className="bg-white border rounded p-3"
            style={{ borderColor: GOLD }}
            data-testid="concentracao-por-medico"
          >
            <div
              className="text-xs uppercase tracking-wide mb-2 font-semibold flex items-center justify-between"
              style={{ color: NAVY }}
            >
              <span>Concentração por médico — top 5 (todos os filtros)</span>
              <span style={{ color: ZINC }}>
                {concentracaoMedico.total_medicos} médico
                {concentracaoMedico.total_medicos === 1 ? "" : "s"} ·{" "}
                {concentracaoMedico.total_receitas} receita
                {concentracaoMedico.total_receitas === 1 ? "" : "s"} no total
              </span>
            </div>
            <table className="w-full text-xs">
              <thead style={{ color: ZINC }}>
                <tr>
                  <th className="text-left px-2 py-1 font-semibold">#</th>
                  <th className="text-left px-2 py-1 font-semibold">Médico</th>
                  <th className="text-right px-2 py-1 font-semibold">Receitas</th>
                  <th className="text-right px-2 py-1 font-semibold">Soma (BRL)</th>
                  <th className="text-right px-2 py-1 font-semibold">% do total</th>
                </tr>
              </thead>
              <tbody>
                {concentracaoMedico.top.map((it, idx) => {
                  const nome = it.medico ?? "— sem médico —";
                  const sem = it.medico === null;
                  const slug = sem ? "sem-medico" : nome;
                  return (
                    <tr
                      key={`${idx}-${slug}`}
                      className="border-t"
                      data-testid={`concentracao-medico-linha-${slug}`}
                    >
                      <td className="px-2 py-1 font-mono" style={{ color: ZINC }}>
                        {idx + 1}
                      </td>
                      <td
                        className="px-2 py-1"
                        style={{
                          color: sem ? ZINC : NAVY,
                          fontStyle: sem ? "italic" : "normal",
                        }}
                      >
                        {nome}
                      </td>
                      <td className="px-2 py-1 text-right font-mono" style={{ color: NAVY }}>
                        {it.n}
                      </td>
                      <td className="px-2 py-1 text-right font-mono font-bold" style={{ color: GOLD }}>
                        {formatarBRL(it.soma_brl)}
                      </td>
                      <td
                        className="px-2 py-1 text-right font-mono"
                        style={{ color: NAVY }}
                        data-testid={`concentracao-medico-pct-${slug}`}
                      >
                        {it.pct.toFixed(1).replace(".", ",")}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela */}
        {rows.length > 0 && (
          <div className="bg-white border rounded overflow-hidden">
            {/* Task #208 — tabela renderizada a partir de `colunasVisiveis`
                (lista de IDs ordenada conforme estado persistido). Cada th
                expoe um drag handle (⋮⋮) pra reordenar via HTML5 drag &
                drop, e um separador de 4px na borda direita pra
                redimensionar via mousedown. Largura aplicada via inline
                `width` + `minWidth` (table-layout fixed pra browser
                respeitar exatamente). Body mapeia `colunasVisiveis` na
                mesma ordem; tfoot recalcula colSpan dinamicamente em torno
                da posicao atual de VALOR. */}
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <thead style={{ background: "#F9FAFB", color: NAVY }}>
                <tr>
                  {colunasVisiveis.map((id) => {
                    const cfg = colunasConfig[id];
                    const sendoArrastada = colunaArrastando === id;
                    const alvoArrasto = colunaAlvoArrasto === id && colunaArrastando !== null && colunaArrastando !== id;
                    const alignClass =
                      cfg.align === "right" ? "text-right" :
                      cfg.align === "center" ? "text-center" : "text-left";
                    const justifyClass =
                      cfg.align === "right" ? "justify-end" :
                      cfg.align === "center" ? "justify-center" : "justify-start";
                    return (
                      <th
                        key={id}
                        data-coluna-id={id}
                        data-testid={`coluna-cabecalho-${id.toLowerCase()}`}
                        className={`px-3 py-2 font-semibold ${alignClass} ${cfg.naoImprimir ? "nao-imprimir" : ""}`}
                        style={{
                          width: `${largurasColunas[id]}px`,
                          minWidth: `${largurasColunas[id]}px`,
                          position: "relative",
                          opacity: sendoArrastada ? 0.4 : 1,
                          background: alvoArrasto ? "#FEF3C7" : undefined,
                          transition: "background 120ms",
                        }}
                        onDragOver={(e) => {
                          if (!colunaArrastando || colunaArrastando === id) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (colunaAlvoArrasto !== id) setColunaAlvoArrasto(id);
                        }}
                        onDragLeave={() => {
                          if (colunaAlvoArrasto === id) setColunaAlvoArrasto(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (colunaArrastando && colunaArrastando !== id) {
                            moverColuna(colunaArrastando, id);
                          }
                          setColunaArrastando(null);
                          setColunaAlvoArrasto(null);
                        }}
                      >
                        <div className={`flex items-center gap-1 ${justifyClass}`}>
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", id);
                              setColunaArrastando(id);
                            }}
                            onDragEnd={() => {
                              setColunaArrastando(null);
                              setColunaAlvoArrasto(null);
                            }}
                            title={`Arraste para reordenar a coluna "${LABEL_COLUNA_PT[id]}"`}
                            aria-label={`Arrastar coluna ${LABEL_COLUNA_PT[id]}`}
                            data-testid={`arrastar-coluna-${id.toLowerCase()}`}
                            className="cursor-grab select-none text-zinc-400 hover:text-zinc-700 px-0.5 leading-none"
                            style={{ fontSize: "11px" }}
                          >
                            ⋮⋮
                          </span>
                          <span className="flex-1 min-w-0 truncate">{cfg.header}</span>
                        </div>
                        <div
                          onMouseDown={(e) => iniciarRedimensionamento(e, id)}
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Redimensionar coluna ${LABEL_COLUNA_PT[id]}`}
                          title={`Arraste para redimensionar a coluna "${LABEL_COLUNA_PT[id]}"`}
                          data-testid={`redimensionar-coluna-${id.toLowerCase()}`}
                          className="absolute top-0 right-0 h-full cursor-col-resize hover:bg-zinc-400"
                          style={{ width: "4px", userSelect: "none" }}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-zinc-50">
                    {colunasVisiveis.map((id) => {
                      const cfg = colunasConfig[id];
                      const alignClass =
                        cfg.align === "right" ? "text-right" :
                        cfg.align === "center" ? "text-center" : "";
                      return (
                        <td
                          key={id}
                          className={`px-3 py-2 ${alignClass} ${cfg.naoImprimir ? "nao-imprimir" : ""}`}
                          style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                        >
                          {cfg.cell(r)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Task #79 — soma de "Valor" das linhas atualmente visiveis
                  (apos filtros + paginacao). Usa `colSpan` pra alinhar a celula
                  numerica embaixo da coluna Valor, deixando as outras vazias.
                  Mostra contagem de quantas linhas entraram na soma vs total
                  visivel pra o contador conferir (TCLE nao tem valor, fica de
                  fora). Task #208 — colSpan agora derivado da posicao atual
                  de VALOR em `colunasVisiveis` (reordenacao + ocultacao da
                  Clinica continuam funcionando). */}
              {(() => {
                const linhasComValor = rows.filter((r) => r.valor_brl !== null);
                const somaValor = linhasComValor.reduce(
                  (acc, r) => acc + (r.valor_brl || 0),
                  0,
                );
                const idxValor = colunasVisiveis.indexOf("VALOR");
                if (idxValor === -1) return null;
                const colsAntesValor = idxValor;
                const colsDepoisValor = colunasVisiveis.length - idxValor - 1;
                return (
                  <tfoot style={{ background: "#F9FAFB", color: NAVY }}>
                    <tr className="border-t-2" style={{ borderColor: GOLD }}>
                      {colsAntesValor > 0 && (
                        <td
                          colSpan={colsAntesValor}
                          className="px-3 py-2 text-right text-xs font-semibold"
                        >
                          Soma do valor visível ({linhasComValor.length} de{" "}
                          {rows.length} linhas):
                        </td>
                      )}
                      <td
                        className="px-3 py-2 text-right font-mono text-sm font-bold"
                        style={{ color: GOLD }}
                        data-testid="soma-valor-visivel"
                      >
                        {formatarBRL(somaValor)}
                      </td>
                      {colsDepoisValor > 0 && <td colSpan={colsDepoisValor} />}
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
            {/* Task #81 — quebra do valor visivel por farmacia parceira.
                Caio usa em reuniao com FAMA/AMERIPHARMA pra justificar
                comissao PARQ sem precisar abrir o CSV no Excel. Calculo
                100% client-side a partir do payload ja carregado (sem
                novo endpoint). Linhas sem farmacia (ex: TCLE) entram em
                "— sem farmacia —" so pra fechar a conta — assim a soma
                bate com o tfoot acima. Ordenado por soma desc. */}
            {(() => {
              const SEM_FARMACIA = "— sem farmácia —";
              const linhasComValor = rows.filter((r) => r.valor_brl !== null);
              if (linhasComValor.length === 0) return null;
              const agrupado = new Map<string, { n: number; soma: number }>();
              for (const r of linhasComValor) {
                // Normaliza com trim pra "FAMA" e "FAMA " caírem na mesma chave
                // (evita duplicar parceira se vier whitespace lateral do payload).
                const nome = r.farmacia?.trim() || "";
                const chave = nome !== "" ? nome : SEM_FARMACIA;
                const atual = agrupado.get(chave) || { n: 0, soma: 0 };
                atual.n += 1;
                atual.soma += r.valor_brl || 0;
                agrupado.set(chave, atual);
              }
              const itens = Array.from(agrupado.entries())
                .map(([farmacia, v]) => ({ farmacia, ...v }))
                .sort((a, b) => b.soma - a.soma);
              return (
                <div
                  className="border-t px-3 py-3"
                  style={{ background: "#FFFDF5", borderColor: GOLD }}
                  data-testid="resumo-por-farmacia"
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-2 font-semibold"
                    style={{ color: NAVY }}
                  >
                    Soma por farmácia parceira (linhas visíveis)
                  </div>
                  <table className="w-full text-xs">
                    <thead style={{ color: ZINC }}>
                      <tr>
                        <th className="text-left px-2 py-1 font-semibold">Farmácia</th>
                        <th className="text-right px-2 py-1 font-semibold">Orçamentos</th>
                        <th className="text-right px-2 py-1 font-semibold">Soma (BRL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => (
                        <tr
                          key={it.farmacia}
                          className="border-t"
                          data-testid={`resumo-farmacia-linha-${it.farmacia === SEM_FARMACIA ? "sem-farmacia" : it.farmacia}`}
                        >
                          <td
                            className="px-2 py-1"
                            style={{
                              color: it.farmacia === SEM_FARMACIA ? ZINC : NAVY,
                              fontStyle: it.farmacia === SEM_FARMACIA ? "italic" : "normal",
                            }}
                          >
                            {it.farmacia}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono"
                            style={{ color: NAVY }}
                          >
                            {it.n}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono font-bold"
                            style={{ color: GOLD }}
                          >
                            {formatarBRL(it.soma)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            {/* Task #82 — quebra do valor visivel por medico responsavel.
                Mesma logica do bloco "por farmacia" (Task #81), mas pra
                reuniao com medicos: justifica comissao medica e mostra
                ranking de produtividade clinica. Calculo client-side a
                partir do payload ja carregado. Linhas sem medico entram
                em "— sem medico —" pra fechar a conta com o tfoot. */}
            {(() => {
              const SEM_MEDICO = "— sem médico —";
              const linhasComValor = rows.filter((r) => r.valor_brl !== null);
              if (linhasComValor.length === 0) return null;
              const agrupado = new Map<string, { n: number; soma: number }>();
              for (const r of linhasComValor) {
                const nome = r.medico?.trim() || "";
                const chave = nome !== "" ? nome : SEM_MEDICO;
                const atual = agrupado.get(chave) || { n: 0, soma: 0 };
                atual.n += 1;
                atual.soma += r.valor_brl || 0;
                agrupado.set(chave, atual);
              }
              const itens = Array.from(agrupado.entries())
                .map(([medico, v]) => ({ medico, ...v }))
                .sort((a, b) => b.soma - a.soma);
              return (
                <div
                  className="border-t px-3 py-3"
                  style={{ background: "#FFFDF5", borderColor: GOLD }}
                  data-testid="resumo-por-medico"
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-2 font-semibold"
                    style={{ color: NAVY }}
                  >
                    Soma por médico (linhas visíveis)
                  </div>
                  <table className="w-full text-xs">
                    <thead style={{ color: ZINC }}>
                      <tr>
                        <th className="text-left px-2 py-1 font-semibold">Médico</th>
                        <th className="text-right px-2 py-1 font-semibold">Orçamentos</th>
                        <th className="text-right px-2 py-1 font-semibold">Soma (BRL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => (
                        <tr
                          key={it.medico}
                          className="border-t"
                          data-testid={`resumo-medico-linha-${it.medico === SEM_MEDICO ? "sem-medico" : it.medico}`}
                        >
                          <td
                            className="px-2 py-1"
                            style={{
                              color: it.medico === SEM_MEDICO ? ZINC : NAVY,
                              fontStyle: it.medico === SEM_MEDICO ? "italic" : "normal",
                            }}
                          >
                            {it.medico}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono"
                            style={{ color: NAVY }}
                          >
                            {it.n}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono font-bold"
                            style={{ color: GOLD }}
                          >
                            {formatarBRL(it.soma)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            {/* Task #85 — quebra do valor visivel por unidade (clinica).
                Fecha o trio com farmacia (Task #81) e medico (Task #82):
                ranking entre clinicas multi-unidade pra Caio identificar
                quais unidades puxam o faturamento. Mesmo padrao visual,
                calculo client-side a partir do payload ja carregado. */}
            {(() => {
              const SEM_UNIDADE = "— sem unidade —";
              const linhasComValor = rows.filter((r) => r.valor_brl !== null);
              if (linhasComValor.length === 0) return null;
              const agrupado = new Map<string, { n: number; soma: number }>();
              for (const r of linhasComValor) {
                const nome = r.paciente_unidade_nome?.trim() || "";
                const chave = nome !== "" ? nome : SEM_UNIDADE;
                const atual = agrupado.get(chave) || { n: 0, soma: 0 };
                atual.n += 1;
                atual.soma += r.valor_brl || 0;
                agrupado.set(chave, atual);
              }
              const itens = Array.from(agrupado.entries())
                .map(([unidade, v]) => ({ unidade, ...v }))
                .sort((a, b) => b.soma - a.soma);
              return (
                <div
                  className="border-t px-3 py-3"
                  style={{ background: "#FFFDF5", borderColor: GOLD }}
                  data-testid="resumo-por-unidade"
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-2 font-semibold"
                    style={{ color: NAVY }}
                  >
                    Soma por unidade (linhas visíveis)
                  </div>
                  <table className="w-full text-xs">
                    <thead style={{ color: ZINC }}>
                      <tr>
                        <th className="text-left px-2 py-1 font-semibold">Unidade</th>
                        <th className="text-right px-2 py-1 font-semibold">Orçamentos</th>
                        <th className="text-right px-2 py-1 font-semibold">Soma (BRL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => (
                        <tr
                          key={it.unidade}
                          className="border-t"
                          data-testid={`resumo-unidade-linha-${it.unidade === SEM_UNIDADE ? "sem-unidade" : it.unidade}`}
                        >
                          <td
                            className="px-2 py-1"
                            style={{
                              color: it.unidade === SEM_UNIDADE ? ZINC : NAVY,
                              fontStyle: it.unidade === SEM_UNIDADE ? "italic" : "normal",
                            }}
                          >
                            {it.unidade}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono"
                            style={{ color: NAVY }}
                          >
                            {it.n}
                          </td>
                          <td
                            className="px-2 py-1 text-right font-mono font-bold"
                            style={{ color: GOLD }}
                          >
                            {formatarBRL(it.soma)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Task #73 — banner de paginacao + botao "Carregar mais".
            Aparece quando o backend sinaliza has_more=true (geralmente filtros
            largos como "30 dias" em fase movimentada). Sem isso, o LIMIT
            silencioso esconde resultados e o Caio nao percebe. */}
        {rows.length > 0 && hasMore && (
          <div
            className="nao-imprimir flex items-center justify-between gap-3 rounded p-3 text-sm border"
            style={{ background: "#FEF9E7", borderColor: GOLD, color: NAVY }}
            data-testid="banner-paginacao"
          >
            <div>
              Mostrando <strong>{rows.length}</strong> de{" "}
              <strong>{totalReal}</strong> assinaturas. Refine os filtros (data,
              status ou unidade) ou carregue a próxima página.
            </div>
            <button
              type="button"
              onClick={() => carregar({ append: true })}
              disabled={carregandoMais}
              data-testid="btn-carregar-mais"
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-60"
              style={{ background: NAVY, color: "#FFFFFF" }}
            >
              <RefreshCw
                size={12}
                className={carregandoMais ? "animate-spin" : ""}
              />
              {carregandoMais ? "Carregando..." : "Carregar mais 50"}
            </button>
          </div>
        )}

        {rows.length > 0 && !hasMore && totalReal > LIMITE_PAGINA && (
          <div
            className="nao-imprimir text-xs text-center"
            style={{ color: ZINC }}
            data-testid="banner-fim-lista"
          >
            Fim da lista — {totalReal} assinaturas exibidas.
          </div>
        )}

        {ultimaAtualizacao && (
          <div className="text-xs text-right" style={{ color: ZINC }}>
            Atualizado em {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
          </div>
        )}

        {/* Task #206 — auditoria server-side dos downloads do extrato.
            Lista os ultimos 50 downloads de CSV/XLSX com quem baixou,
            quando, filtros aplicados e formato. Fecha o ciclo de
            rastreabilidade quando o anexo chega em contador/advogado
            externo: o cabecalho do arquivo (Task #86) ja diz "ordenado
            por X com filtros Y", mas nao diz QUEM da equipe gerou. */}
        <DownloadsExtratoPanel />
      </div>
    </Layout>
  );
}

// Task #206 — painel separado pra nao re-renderizar com cada filtro/scroll
// da timeline principal. Carrega 1 vez ao montar + botao "Atualizar".
type DownloadExport = {
  id: number;
  usuario_id: number | null;
  operador: string;
  operador_email: string | null;
  filtros: Record<string, unknown> | null;
  ordenacao: string;
  total_linhas: number;
  formato: "csv" | "xlsx";
  truncado: boolean;
  criado_em: string;
  usuario_nome_atual: string | null;
  usuario_email_atual: string | null;
};

function DownloadsExtratoPanel() {
  const [exports, setExports] = useState<DownloadExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/assinaturas/timeline/exports");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setExports(Array.isArray(j.exports) ? j.exports : []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aberto && exports.length === 0 && !loading && !erro) {
      void carregar();
    }
  }, [aberto, exports.length, loading, erro, carregar]);

  function descreverFiltros(f: Record<string, unknown> | null): string {
    if (!f) return "—";
    const partes: string[] = [];
    const u = f["unidade_id"];
    partes.push(`unidade=${u !== null && u !== undefined && u !== "" ? String(u) : "todas"}`);
    const s = f["status"];
    if (Array.isArray(s) && s.length > 0) {
      partes.push(`status=${s.join("|")}`);
    } else {
      partes.push("status=todos");
    }
    const desde = f["desde"];
    const ate = f["ate"];
    if (desde || ate) {
      partes.push(`${desde ?? "—"}→${ate ?? "—"}`);
    }
    return partes.join(" · ");
  }

  return (
    <div
      className="nao-imprimir bg-white border rounded"
      style={{ borderColor: NAVY }}
      data-testid="painel-downloads-extrato"
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: aberto ? "#FFFDF5" : "#FFFFFF" }}
        data-testid="botao-toggle-downloads-extrato"
      >
        <div className="flex items-center gap-2">
          <Download size={14} style={{ color: NAVY }} />
          <span className="text-sm font-semibold" style={{ color: NAVY }}>
            Auditoria de downloads do extrato
          </span>
          <span className="text-xs" style={{ color: ZINC }}>
            (últimos 50 — quem baixou, quando, filtros)
          </span>
        </div>
        <span className="text-xs" style={{ color: ZINC }}>
          {aberto ? "fechar ▴" : "abrir ▾"}
        </span>
      </button>
      {aberto && (
        <div className="border-t" style={{ borderColor: NAVY }}>
          <div className="flex items-center justify-between px-4 py-2 text-xs"
               style={{ background: "#FAFAFA", color: ZINC }}>
            <span>
              {loading
                ? "Carregando..."
                : erro
                ? `Erro: ${erro}`
                : `${exports.length} download(s) registrado(s)`}
            </span>
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border disabled:opacity-60"
              style={{ background: "#FFFFFF", color: NAVY, borderColor: NAVY }}
              data-testid="botao-atualizar-downloads-extrato"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
          {!loading && !erro && exports.length === 0 && (
            <div className="px-4 py-6 text-center text-xs" style={{ color: ZINC }}>
              Nenhum download registrado ainda. Baixe um CSV ou XLSX acima
              pra ver a auditoria aqui.
            </div>
          )}
          {!loading && exports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ background: NAVY, color: GOLD }}>
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Quando</th>
                    <th className="text-left px-3 py-2 font-semibold">Quem</th>
                    <th className="text-left px-3 py-2 font-semibold">Formato</th>
                    <th className="text-right px-3 py-2 font-semibold">Linhas</th>
                    <th className="text-left px-3 py-2 font-semibold">Filtros</th>
                    <th className="text-left px-3 py-2 font-semibold">Ordenação</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((e) => (
                    <tr
                      key={e.id}
                      className="border-t"
                      data-testid={`download-extrato-linha-${e.id}`}
                    >
                      <td className="px-3 py-2 font-mono" style={{ color: NAVY }}>
                        {formatarData(e.criado_em)}
                      </td>
                      <td className="px-3 py-2" style={{ color: NAVY }}>
                        <div className="font-semibold">
                          {e.usuario_nome_atual || e.operador}
                        </div>
                        {(e.usuario_email_atual || e.operador_email) && (
                          <div className="text-[10px]" style={{ color: ZINC }}>
                            {e.usuario_email_atual || e.operador_email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{
                            background: e.formato === "xlsx" ? "#DCFCE7" : "#DBEAFE",
                            color: e.formato === "xlsx" ? GREEN : BLUE,
                          }}
                        >
                          {e.formato}
                        </span>
                        {e.truncado && (
                          <span
                            className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: "#FEF9E7", color: AMBER }}
                            title="Export truncado em 5000 linhas"
                          >
                            truncado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: NAVY }}>
                        {e.total_linhas.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: ZINC }}>
                        {descreverFiltros(e.filtros)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: ZINC }}>
                        {e.ordenacao || "padrão (id desc)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
