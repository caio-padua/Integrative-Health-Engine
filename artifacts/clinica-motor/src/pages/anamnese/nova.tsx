import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useCriarAnamnese } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, CheckCircle, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia / Governanca). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO } from "../craniotomia-shared";

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

const PENUMBRA_CSS = `
.na-painel { transition: border-color .25s, box-shadow .25s; }
.na-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.na-input { transition: border-color .2s, box-shadow .2s; }
.na-input:focus { border-color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.na-row { transition: background .15s, border-color .15s; }
.na-row:hover { background: ${PW.bg3}; }
.na-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.na-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.na-btn:disabled { opacity: .45; cursor: not-allowed; }
.na-cta { transition: border-color .2s, box-shadow .2s, background .2s; cursor: pointer; }
.na-cta:hover:not(:disabled) { box-shadow: 0 0 26px -8px ${PW.cianoGlow}; background: ${PW.bg4}; }
.na-cta:disabled { opacity: .45; cursor: not-allowed; }
.na-iconbtn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.na-iconbtn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.na-clear { transition: color .2s; cursor: pointer; }
.na-clear:hover { color: ${PW.text}; }
`;

const btnPag: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 12px",
  background: PW.bg2,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};

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
      <style>{PENUMBRA_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: MONO, color: PW.text }}>
        {/* Cabecalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/anamnese">
            <button
              className="na-iconbtn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                background: PW.bg2,
                border: `1px solid ${PW.border}`,
                borderRadius: 0,
                color: PW.t2,
              }}
              title="Voltar"
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </button>
          </Link>
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: PW.text,
                margin: 0,
              }}
            >
              Nova Anamnese
            </h1>
            <p style={{ fontSize: 13, color: PW.muted, marginTop: 4, margin: 0 }}>
              Inicie uma nova avaliação para um paciente.
            </p>
          </div>
        </div>

        {/* Painel selecionar paciente */}
        <section
          className="na-painel"
          style={{
            maxWidth: 768,
            background: PW.bg2,
            border: `1px solid ${PW.border}`,
            borderLeft: `3px solid ${PW.ciano}`,
            borderRadius: 0,
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderBottom: `1px solid ${PW.border}`,
            }}
          >
            <Search style={{ width: 16, height: 16, color: PW.ciano }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: PW.t2,
              }}
            >
              Selecionar Paciente
            </span>
          </header>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Selecionado */}
            {selecionado && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderLeft: `3px solid ${PW.ciano}`,
                  background: PW.bg3,
                  border: `1px solid ${PW.border}`,
                  borderRadius: 0,
                  padding: "8px 12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: PW.text, fontSize: 14 }}>{selecionado.nome}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>
                    ID={selecionado.id}
                    {selecionado.cpf ? ` · CPF=${selecionado.cpf}` : ""}
                    {selecionado.telefone ? ` · ${selecionado.telefone}` : ""}
                  </div>
                </div>
                <button
                  className="na-btn"
                  onClick={() => setSelecionado(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 10px",
                    background: "transparent",
                    border: `1px solid ${PW.border}`,
                    borderRadius: 0,
                    color: PW.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontFamily: MONO,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} /> trocar
                </button>
              </div>
            )}

            {/* Busca + paginação */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                  <Search
                    style={{
                      pointerEvents: "none",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      color: PW.muted,
                    }}
                  />
                  <input
                    className="na-input"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite parte do nome, CPF ou telefone..."
                    style={{
                      width: "100%",
                      background: PW.bg3,
                      border: `1px solid ${PW.border}`,
                      borderRadius: 0,
                      color: PW.text,
                      padding: "9px 36px",
                      fontSize: 13,
                      fontFamily: MONO,
                      outline: "none",
                    }}
                  />
                  {busca && (
                    <button
                      className="na-clear"
                      onClick={() => setBusca("")}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: PW.muted,
                        display: "inline-flex",
                      }}
                      title="Limpar"
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  )}
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: PW.muted,
                  }}
                >
                  POR PÁGINA
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPagina(0); }}
                    style={{
                      background: PW.bg3,
                      border: `1px solid ${PW.border}`,
                      borderRadius: 0,
                      color: PW.text,
                      padding: "4px 8px",
                      fontSize: 12,
                      fontFamily: MONO,
                      outline: "none",
                    }}
                  >
                    {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Status */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: PW.muted,
              }}
            >
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
              {erroBusca && <span style={{ marginLeft: 8, color: PW.danger }}>· ERRO: {erroBusca}</span>}
            </div>

            {/* Lista */}
            <div
              style={{
                maxHeight: 420,
                overflow: "auto",
                background: PW.bg,
                border: `1px solid ${PW.border}`,
                borderRadius: 0,
              }}
            >
              {fatia.length === 0 && !buscando && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: PW.muted }}>
                  {busca.trim().length > 0 ? "Nenhum paciente encontrado." : "Carregando..."}
                </div>
              )}
              {fatia.map((p) => {
                const sel = selecionado?.id === p.id;
                return (
                  <button
                    key={p.id}
                    className="na-row"
                    onClick={() => setSelecionado(p)}
                    style={{
                      width: "100%",
                      display: "block",
                      textAlign: "left",
                      borderBottom: `1px solid ${PW.border}`,
                      borderLeft: sel ? `3px solid ${PW.ciano}` : "3px solid transparent",
                      background: sel ? PW.bg3 : "transparent",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: PW.text }}>{p.nome}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: MONO,
                  fontSize: 12,
                }}
              >
                <button
                  className="na-btn"
                  disabled={pagina === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  style={btnPag}
                >
                  ← ANTERIOR
                </button>
                <span style={{ color: PW.muted }}>
                  {pagina * pageSize + 1}–{Math.min((pagina + 1) * pageSize, resultados.length)} de {resultados.length}
                </span>
                <button
                  className="na-btn"
                  disabled={pagina + 1 >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  style={btnPag}
                >
                  PRÓXIMA →
                </button>
              </div>
            )}

            <button
              type="button"
              className="na-cta"
              disabled={!selecionado || criarAnamnese.isPending}
              onClick={iniciar}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 16px",
                background: PW.bg3,
                border: `1px solid ${PW.ciano}`,
                borderRadius: 0,
                color: PW.ciano,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: MONO,
              }}
            >
              <CheckCircle style={{ width: 16, height: 16 }} />
              {criarAnamnese.isPending ? "Iniciando..." : "Iniciar Avaliação"}
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
