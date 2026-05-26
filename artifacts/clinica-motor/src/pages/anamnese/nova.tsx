import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCriarAnamnese } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

// Caio (CEO) reportou freeze ao abrir o select: o componente original
// renderizava os ~3.877 pacientes em DOM nodes nativos do shadcn Select,
// o que travava o mouse. Substituído por busca server-side (/api/pacientes
// ?busca=) com debounce 250ms — mesma técnica usada em /prescricao-rapida.

type Paciente = {
  id: number;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
};

const PAGE_SIZE_DEFAULT = 25;

export default function NovaAnamnese() {
  const [, setLocation] = useLocation();
  const criarAnamnese = useCriarAnamnese();

  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Paciente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Paciente | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [pagina, setPagina] = useState(0);

  // Debounce 250ms. Se busca tem >=2 chars chama API; se vazio mostra
  // primeiros N pacientes (paginação alfabética padrão do backend).
  useEffect(() => {
    const ctrl = new AbortController();
    const termo = busca.trim();
    setPagina(0);
    setErroBusca(null);
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const qs = termo.length >= 2 ? `?busca=${encodeURIComponent(termo)}` : "";
        const r = await apiFetch(`/api/pacientes${qs}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as Paciente[];
        // ordena alfabético pra ficar previsível (Caio pediu por ordem)
        const ord = [...data].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"));
        setResultados(ord);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErroBusca(String(e?.message ?? e));
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [busca]);

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / pageSize));
  const fatia = useMemo(
    () => resultados.slice(pagina * pageSize, (pagina + 1) * pageSize),
    [resultados, pagina, pageSize],
  );

  function iniciar() {
    if (!selecionado) return;
    criarAnamnese.mutate(
      { data: { pacienteId: selecionado.id } },
      { onSuccess: (data) => setLocation(`/anamnese/${data.id}`) },
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/anamnese">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nova Anamnese</h1>
            <p className="text-muted-foreground mt-1">Inicie uma nova avaliação para um paciente.</p>
          </div>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Selecionar Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selecionado */}
            {selecionado && (
              <div className="flex items-center justify-between gap-3 border-l-[3px] border-primary bg-muted/30 px-3 py-2">
                <div>
                  <div className="font-semibold text-foreground">{selecionado.nome}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    ID={selecionado.id}
                    {selecionado.cpf ? ` · CPF=${selecionado.cpf}` : ""}
                    {selecionado.telefone ? ` · ${selecionado.telefone}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelecionado(null)}>
                  <X className="w-4 h-4" /> trocar
                </Button>
              </div>
            )}

            {/* Busca + paginação */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite parte do nome, CPF ou telefone..."
                  className="w-full border border-input bg-background px-9 py-2 text-sm outline-none focus:border-ring"
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Limpar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                POR PÁGINA
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPagina(0); }}
                  className="border border-input bg-background px-2 py-1 text-xs"
                >
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            {/* Status */}
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {buscando ? "BUSCANDO..." : (
                <>
                  {resultados.length} RESULTADO(S)
                  {resultados.length > pageSize && (
                    <> · PÁGINA {pagina + 1}/{totalPaginas}</>
                  )}
                  {busca.trim().length === 0 && resultados.length > 0 && (
                    <> · TODOS (ordem alfabética) — digite pra filtrar</>
                  )}
                </>
              )}
              {erroBusca && <span className="ml-2 text-destructive">· ERRO: {erroBusca}</span>}
            </div>

            {/* Lista */}
            <div className="max-h-[420px] overflow-auto border border-border">
              {fatia.length === 0 && !buscando && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {busca.trim().length > 0 ? "Nenhum paciente encontrado." : "Carregando..."}
                </div>
              )}
              {fatia.map((p) => {
                const sel = selecionado?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelecionado(p)}
                    className={`w-full border-b border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${sel ? "bg-primary/10 border-l-[3px] border-l-primary" : ""}`}
                  >
                    <div className="font-medium text-foreground">{p.nome}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      ID={p.id}
                      {p.cpf ? ` · CPF=${p.cpf}` : ""}
                      {p.telefone ? ` · ${p.telefone}` : " · sem telefone"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Paginação */}
            {resultados.length > pageSize && (
              <div className="flex items-center justify-between font-mono text-xs">
                <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => Math.max(0, p - 1))}>
                  ← ANTERIOR
                </Button>
                <span className="text-muted-foreground">
                  {pagina * pageSize + 1}–{Math.min((pagina + 1) * pageSize, resultados.length)} de {resultados.length}
                </span>
                <Button variant="outline" size="sm" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}>
                  PRÓXIMA →
                </Button>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={!selecionado || criarAnamnese.isPending}
              onClick={iniciar}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {criarAnamnese.isPending ? "Iniciando..." : "Iniciar Avaliação"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
