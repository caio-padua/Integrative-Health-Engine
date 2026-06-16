// ══════════════════════════════════════════════════════════════════════
// CRANIOTOMIA · PRANCHETA DE LOTEAMENTO
//
// Visao do CEO (16/06/2026): cada coluna e um "loteamento"; cada item real
// e uma "casa"; ele habita casas e ve as sinapses se ligando. NUNCA digita
// codigo — clica na casa real e o codigo_padcom vira o codigo_referencia da
// sinapse (regras_motor). Macro = todas as linhas; micro = no selecionado
// acende suas linhas + inspector. Dados 100% reais (GET /motor-clinico/*).
// ══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  PW, MONO, SEGMENTOS, SEGMENTO_LABEL, SEGMENTO_COR, PRIORIDADE_COR,
  PRIORIDADE_LABEL, chaveSe, chaveEntao, inputStyle, labelStyle,
  type Regra, type Pergunta, type ItemLote, type Segmento,
} from "./craniotomia-shared";
import { Plus, Power, PowerOff, Pencil, Search, X, Zap, ArrowRight } from "lucide-react";

interface Props {
  regras: Regra[];
  perguntas: Pergunta[];
  itens: ItemLote[];
  criando?: boolean;
  onEditar: (r: Regra) => void;
  onToggle: (r: Regra) => void;
  onCriarRapido: (p: {
    perguntaId: string;
    palavraChave: string;
    segmento: Segmento;
    codigoReferencia: string;
    itemNome: string;
  }) => void;
}

interface Linha {
  id: string;
  d: string;
  cor: string;
  ativo: boolean;
}

type Selecao =
  | { tipo: "se"; chave: string }
  | { tipo: "entao"; chave: string }
  | null;

const CARD_LARGURA = 236;

export default function PranchetaLoteamento({
  regras, perguntas, itens, criando = false, onEditar, onToggle, onCriarRapido,
}: Props) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [selecao, setSelecao] = useState<Selecao>(null);
  const [gatilho, setGatilho] = useState<{ perguntaId: string; pergunta: string; palavraChave: string } | null>(null);
  const [novoGatilhoAberto, setNovoGatilhoAberto] = useState(false);
  const [ngPergunta, setNgPergunta] = useState("");
  const [ngPalavra, setNgPalavra] = useState("");
  const [busca, setBusca] = useState<Record<string, string>>({});
  const [linhas, setLinhas] = useState<Linha[]>([]);

  // Mapa rapido perguntaId -> texto da pergunta.
  const perguntaTexto = useMemo(() => {
    const m = new Map<string, Pergunta>();
    perguntas.forEach((p) => m.set(p.perguntaId.toUpperCase(), p));
    return m;
  }, [perguntas]);

  // Nos SE distintos (perguntaId + palavraChave) a partir das sinapses reais.
  const nosSe = useMemo(() => {
    const m = new Map<string, { perguntaId: string; palavraChave: string; regras: Regra[] }>();
    regras.forEach((r) => {
      const k = chaveSe(r.perguntaId, r.palavraChave);
      if (!m.has(k)) m.set(k, { perguntaId: r.perguntaId, palavraChave: r.palavraChave, regras: [] });
      m.get(k)!.regras.push(r);
    });
    // gatilho recem-armado que ainda nao tem sinapse aparece como no novo.
    if (gatilho) {
      const k = chaveSe(gatilho.perguntaId, gatilho.palavraChave);
      if (!m.has(k)) m.set(k, { perguntaId: gatilho.perguntaId, palavraChave: gatilho.palavraChave, regras: [] });
    }
    return Array.from(m.entries())
      .map(([k, v]) => ({ k, ...v }))
      .sort((a, b) => b.regras.length - a.regras.length);
  }, [regras, gatilho]);

  // Itens por segmento + indice por codigo.
  const itensPorSegmento = useMemo(() => {
    const m: Record<string, ItemLote[]> = {};
    SEGMENTOS.forEach((s) => (m[s] = []));
    itens.forEach((i) => {
      if (m[i.segmento]) m[i.segmento].push(i);
    });
    return m;
  }, [itens]);

  // Codigos habitados (referenciados por alguma sinapse) por segmento.
  const habitadosPorSeg = useMemo(() => {
    const m: Record<string, Map<string, Regra[]>> = {};
    SEGMENTOS.forEach((s) => (m[s] = new Map()));
    regras.forEach((r) => {
      if (!r.codigoReferencia) return;
      const seg = r.segmento;
      if (!m[seg]) return;
      const cod = r.codigoReferencia.toUpperCase();
      if (!m[seg].has(cod)) m[seg].set(cod, []);
      m[seg].get(cod)!.push(r);
    });
    return m;
  }, [regras]);

  const registrarNo = (chave: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(chave, el);
    else nodeRefs.current.delete(chave);
  };

  // ── Geometria das sinapses (camada SVG) ────────────────────────────
  // Ref estavel + logica sempre fresca (evita re-bind de listeners).
  const medirRef = useRef<() => void>(() => {});
  medirRef.current = () => {
    const content = contentRef.current;
    if (!content) return;
    const base = content.getBoundingClientRect();
    const novas: Linha[] = [];
    const ativoChave = selecao?.chave ?? (gatilho ? chaveSe(gatilho.perguntaId, gatilho.palavraChave) : null);

    regras.forEach((r) => {
      if (!r.codigoReferencia) return;
      const seK = chaveSe(r.perguntaId, r.palavraChave);
      const enK = chaveEntao(r.segmento, r.codigoReferencia);
      const seEl = nodeRefs.current.get(seK);
      const enEl = nodeRefs.current.get(enK);
      if (!seEl || !enEl) return;
      const a = seEl.getBoundingClientRect();
      const b = enEl.getBoundingClientRect();
      const x1 = a.right - base.left;
      const y1 = a.top - base.top + a.height / 2;
      const x2 = b.left - base.left;
      const y2 = b.top - base.top + b.height / 2;
      const dx = Math.max(40, (x2 - x1) / 2);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      const ativo = ativoChave === seK || ativoChave === enK;
      novas.push({ id: `${r.id}`, d, cor: SEGMENTO_COR[r.segmento], ativo });
    });
    // ativas por ultimo (desenham por cima).
    novas.sort((a, b) => Number(a.ativo) - Number(b.ativo));
    setLinhas(novas);
  };
  const medir = useCallback(() => medirRef.current(), []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => medir());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regras, perguntas, itens, selecao, gatilho, busca, novoGatilhoAberto]);

  useEffect(() => {
    const board = boardRef.current;
    const onScrollResize = () => requestAnimationFrame(() => medir());
    board?.addEventListener("scroll", onScrollResize, { passive: true });
    window.addEventListener("resize", onScrollResize);
    return () => {
      board?.removeEventListener("scroll", onScrollResize);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [medir]);

  // ── Interacoes ─────────────────────────────────────────────────────
  const clicarSe = (perguntaId: string, palavraChave: string) => {
    const k = chaveSe(perguntaId, palavraChave);
    setSelecao({ tipo: "se", chave: k });
    setGatilho({ perguntaId, palavraChave, pergunta: perguntaTexto.get(perguntaId.toUpperCase())?.pergunta ?? perguntaId });
  };

  const clicarEntao = (item: ItemLote) => {
    if (!item.codigoPadcom) return;
    if (gatilho) {
      // Trava: enquanto uma criacao esta em voo, ignora cliques (anti duplo-clique).
      if (criando) return;
      const cod = item.codigoPadcom.toUpperCase();
      // Dedupe semantico: se a sinapse ja existe, apenas seleciona (nao recria).
      const jaExiste = regras.some(
        (r) =>
          r.perguntaId.toUpperCase() === gatilho.perguntaId.toUpperCase() &&
          r.palavraChave.toUpperCase() === gatilho.palavraChave.toUpperCase() &&
          r.segmento === item.segmento &&
          (r.codigoReferencia ?? "").toUpperCase() === cod,
      );
      if (jaExiste) {
        setSelecao({ tipo: "entao", chave: chaveEntao(item.segmento, item.codigoPadcom) });
        return;
      }
      onCriarRapido({
        perguntaId: gatilho.perguntaId,
        palavraChave: gatilho.palavraChave,
        segmento: item.segmento,
        codigoReferencia: item.codigoPadcom,
        itemNome: item.nome,
      });
      return;
    }
    setSelecao({ tipo: "entao", chave: chaveEntao(item.segmento, item.codigoPadcom) });
  };

  const desarmar = () => {
    setGatilho(null);
    setSelecao(null);
  };

  const armarNovoGatilho = () => {
    const p = perguntas.find((x) => x.perguntaId === ngPergunta);
    if (!p || !ngPalavra.trim()) return;
    setGatilho({ perguntaId: p.perguntaId, pergunta: p.pergunta, palavraChave: ngPalavra.trim().toUpperCase() });
    setSelecao({ tipo: "se", chave: chaveSe(p.perguntaId, ngPalavra.trim()) });
    setNovoGatilhoAberto(false);
    setNgPergunta("");
    setNgPalavra("");
  };

  const chaveAtiva = selecao?.chave ?? (gatilho ? chaveSe(gatilho.perguntaId, gatilho.palavraChave) : null);

  // Regras conectadas ao no selecionado (para o inspector).
  const regrasDoSelecionado = useMemo(() => {
    if (!selecao) return [];
    return regras.filter((r) => {
      if (selecao.tipo === "se") return chaveSe(r.perguntaId, r.palavraChave) === selecao.chave;
      return r.codigoReferencia ? chaveEntao(r.segmento, r.codigoReferencia) === selecao.chave : false;
    });
  }, [regras, selecao]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, alignItems: "start" }}>
      {/* PRANCHETA */}
      <div>
        {/* Banner de gatilho armado (K1: unico vivo) */}
        {gatilho ? (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
              border: `1px solid ${PW.ciano}`, borderLeft: `3px solid ${PW.ciano}`,
              background: "rgba(95,230,204,0.10)", padding: "8px 12px",
              boxShadow: `0 0 18px -6px ${PW.cianoGlow}`,
            }}
            data-testid="banner-gatilho"
          >
            <Zap style={{ width: 16, height: 16, color: PW.ciano }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 10, color: PW.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Gatilho armado — clique numa casa para ligar (sem digitar codigo)
              </div>
              <div style={{ fontSize: 13, color: PW.text, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {gatilho.palavraChave} <span style={{ color: PW.muted, fontWeight: 400 }}>· {gatilho.pergunta}</span>
              </div>
            </div>
            <button onClick={desarmar} style={btnGhost} data-testid="btn-desarmar">
              <X style={{ width: 13, height: 13 }} /> Desarmar
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: PW.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Clique num gatilho (coluna ANAMNESE) e depois numa casa para criar a sinapse · linhas acesas = no selecionado
          </div>
        )}

        <div
          ref={boardRef}
          style={{
            position: "relative", overflow: "auto", border: `1px solid ${PW.border}`,
            background: PW.bg2, height: "62vh", minHeight: 420,
          }}
          data-testid="prancheta"
        >
          <div ref={contentRef} style={{ position: "relative", display: "flex", gap: 0, minWidth: "max-content", minHeight: "100%" }}>
            {/* camada SVG das sinapses */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
              {linhas.map((l) => (
                <path
                  key={l.id}
                  d={l.d}
                  fill="none"
                  stroke={l.cor}
                  strokeWidth={l.ativo ? 2.2 : 1}
                  strokeOpacity={l.ativo ? 0.95 : 0.18}
                  style={l.ativo ? { filter: `drop-shadow(0 0 4px ${l.cor})` } : undefined}
                />
              ))}
            </svg>

            {/* LANE ANAMNESE (SE) */}
            <Lane
              titulo="ANAMNESE · GATILHO (SE)"
              cor={PW.ciano}
              contador={nosSe.length}
              acao={
                <button onClick={() => setNovoGatilhoAberto((v) => !v)} style={btnMini(PW.ciano)} data-testid="btn-novo-gatilho">
                  <Plus style={{ width: 12, height: 12 }} /> Gatilho
                </button>
              }
            >
              {novoGatilhoAberto && (
                <div style={{ border: `1px solid ${PW.borderNeon}`, background: PW.bg3, padding: 8, marginBottom: 8 }}>
                  <label style={labelStyle}>Pergunta da anamnese</label>
                  <select style={{ ...inputStyle, marginBottom: 6 }} value={ngPergunta} onChange={(e) => setNgPergunta(e.target.value)} data-testid="select-ng-pergunta">
                    <option value="">— escolher —</option>
                    {perguntas.map((p) => (
                      <option key={p.id} value={p.perguntaId} style={{ background: PW.bg3 }}>
                        [{p.bloco}] {p.pergunta.slice(0, 48)}
                      </option>
                    ))}
                  </select>
                  <label style={labelStyle}>Palavra-chave do gatilho</label>
                  <input style={{ ...inputStyle, marginBottom: 8 }} value={ngPalavra} placeholder="ex: FADIGA" onChange={(e) => setNgPalavra(e.target.value)} data-testid="input-ng-palavra" />
                  <button onClick={armarNovoGatilho} disabled={!ngPergunta || !ngPalavra.trim()} style={{ ...btnMini(PW.ciano), width: "100%", justifyContent: "center", opacity: !ngPergunta || !ngPalavra.trim() ? 0.5 : 1 }} data-testid="btn-armar-gatilho">
                    Armar gatilho
                  </button>
                </div>
              )}
              {nosSe.length === 0 && <Vazio texto="Nenhum gatilho ainda." />}
              {nosSe.map((n) => {
                const p = perguntaTexto.get(n.perguntaId.toUpperCase());
                const ativo = chaveAtiva === n.k;
                return (
                  <NoCard
                    key={n.k}
                    refCb={registrarNo(n.k)}
                    cor={PW.ciano}
                    ativo={ativo}
                    habitada
                    onClick={() => clicarSe(n.perguntaId, n.palavraChave)}
                    testid={`no-se-${n.perguntaId}-${n.palavraChave}`}
                    topo={`${n.perguntaId}${p ? ` · ${p.bloco}` : ""}`}
                    titulo={n.palavraChave}
                    sub={p?.pergunta ?? "—"}
                    badge={n.regras.length}
                  />
                );
              })}
            </Lane>

            {/* LANES ENTAO (segmentos) */}
            {SEGMENTOS.map((seg) => {
              const habit = habitadosPorSeg[seg];
              const todos = itensPorSegmento[seg] ?? [];
              const habitados = todos.filter((i) => i.codigoPadcom && habit.has(i.codigoPadcom.toUpperCase()));
              const termo = (busca[seg] ?? "").trim().toLowerCase();
              const disponiveis = termo
                ? todos
                    .filter((i) => i.codigoPadcom && !habit.has(i.codigoPadcom.toUpperCase()))
                    .filter((i) => i.nome.toLowerCase().includes(termo) || (i.codigoPadcom ?? "").toLowerCase().includes(termo))
                    .slice(0, 30)
                : [];
              const cor = SEGMENTO_COR[seg];
              return (
                <Lane
                  key={seg}
                  titulo={SEGMENTO_LABEL[seg]}
                  cor={cor}
                  contador={habitados.length}
                  total={todos.length}
                  acao={
                    <div style={{ position: "relative", width: 120 }}>
                      <Search style={{ width: 12, height: 12, color: PW.muted, position: "absolute", left: 6, top: 7 }} />
                      <input
                        style={{ ...inputStyle, height: 26, paddingLeft: 22, fontSize: 11 }}
                        placeholder="+ casa..."
                        value={busca[seg] ?? ""}
                        onChange={(e) => setBusca((b) => ({ ...b, [seg]: e.target.value }))}
                        data-testid={`busca-${seg}`}
                      />
                    </div>
                  }
                >
                  {habitados.length === 0 && disponiveis.length === 0 && (
                    <Vazio texto={termo ? "Nenhuma casa encontrada." : "Loteamento sem casas habitadas."} />
                  )}
                  {habitados.map((i) => {
                    const cod = (i.codigoPadcom ?? "").toUpperCase();
                    const k = chaveEntao(seg, i.codigoPadcom ?? "");
                    const ativo = chaveAtiva === k;
                    return (
                      <NoCard
                        key={i.id}
                        refCb={registrarNo(k)}
                        cor={cor}
                        ativo={ativo}
                        habitada
                        armavel={!!gatilho}
                        disabled={!!gatilho && criando}
                        onClick={() => clicarEntao(i)}
                        testid={`no-entao-${i.id}`}
                        topo={i.codigoPadcom ?? "—"}
                        titulo={i.nome}
                        badge={habit.get(cod)?.length ?? 0}
                      />
                    );
                  })}
                  {disponiveis.length > 0 && (
                    <div style={{ fontSize: 9, color: PW.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "6px 0 4px" }}>
                      Casas disponiveis
                    </div>
                  )}
                  {disponiveis.map((i) => {
                    const k = chaveEntao(seg, i.codigoPadcom ?? "");
                    return (
                      <NoCard
                        key={`disp-${i.id}`}
                        refCb={registrarNo(k)}
                        cor={cor}
                        ativo={false}
                        habitada={false}
                        armavel={!!gatilho}
                        disabled={!!gatilho && criando}
                        onClick={() => clicarEntao(i)}
                        testid={`no-disp-${i.id}`}
                        topo={i.codigoPadcom ?? "—"}
                        titulo={i.nome}
                        badge={0}
                      />
                    );
                  })}
                </Lane>
              );
            })}
          </div>
        </div>
      </div>

      {/* INSPECTOR (micro) */}
      <Inspector
        selecao={selecao}
        gatilho={gatilho}
        regras={regrasDoSelecionado}
        perguntaTexto={perguntaTexto}
        onEditar={onEditar}
        onToggle={onToggle}
        onLimpar={() => setSelecao(null)}
      />
    </div>
  );
}

// ── Coluna (loteamento) ───────────────────────────────────────────────
function Lane({
  titulo, cor, contador, total, acao, children,
}: {
  titulo: string; cor: string; contador: number; total?: number;
  acao?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ width: CARD_LARGURA, flex: "0 0 auto", borderRight: `1px solid ${PW.border}`, display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 3, background: PW.bg3,
          borderBottom: `1px solid ${PW.border}`, borderTop: `3px solid ${cor}`,
          padding: "8px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {titulo}
          </span>
          <span style={{ fontSize: 10, color: PW.muted, fontFamily: MONO, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {contador}{total !== undefined ? `/${total}` : ""}
          </span>
        </div>
        {acao && <div style={{ marginTop: 6 }}>{acao}</div>}
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

// ── Card de no (casa / gatilho) ───────────────────────────────────────
function NoCard({
  refCb, cor, ativo, habitada, armavel, disabled, onClick, testid, topo, titulo, sub, badge,
}: {
  refCb: (el: HTMLElement | null) => void;
  cor: string; ativo: boolean; habitada: boolean; armavel?: boolean; disabled?: boolean;
  onClick: () => void; testid: string;
  topo: string; titulo: string; sub?: string; badge: number;
}) {
  return (
    <button
      ref={refCb as React.Ref<HTMLButtonElement>}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      style={{
        position: "relative", textAlign: "left", width: "100%",
        cursor: disabled ? "wait" : "pointer",
        background: ativo ? "rgba(95,230,204,0.06)" : PW.bg2,
        border: `1px ${habitada ? "solid" : "dashed"} ${ativo ? cor : habitada ? `${cor}55` : PW.border}`,
        borderLeft: `3px solid ${habitada ? cor : PW.border}`,
        borderRadius: 0, padding: "7px 9px", color: PW.text, fontFamily: MONO,
        boxShadow: ativo ? `0 0 16px -6px ${cor}` : "none",
        opacity: disabled ? 0.5 : habitada ? 1 : 0.74,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 9, color: PW.muted, letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{topo}</span>
        {badge > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: cor, fontVariantNumeric: "tabular-nums", border: `1px solid ${cor}55`, padding: "0 4px", whiteSpace: "nowrap" }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25, marginTop: 2, color: ativo ? cor : PW.text, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
        {titulo}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: PW.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {sub}
        </div>
      )}
      {armavel && (
        <div style={{ fontSize: 9, color: cor, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 3 }}>
          <ArrowRight style={{ width: 10, height: 10 }} /> ligar
        </div>
      )}
    </button>
  );
}

// ── Inspector (micro) ─────────────────────────────────────────────────
function Inspector({
  selecao, gatilho, regras, perguntaTexto, onEditar, onToggle, onLimpar,
}: {
  selecao: Selecao;
  gatilho: { perguntaId: string; pergunta: string; palavraChave: string } | null;
  regras: Regra[];
  perguntaTexto: Map<string, Pergunta>;
  onEditar: (r: Regra) => void;
  onToggle: (r: Regra) => void;
  onLimpar: () => void;
}) {
  return (
    <div style={{ position: "sticky", top: 12, border: `1px solid ${PW.border}`, background: PW.bg2 }}>
      <div style={{ borderTop: `3px solid ${PW.gold}`, borderBottom: `1px solid ${PW.border}`, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: PW.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>Inspector</span>
        {selecao && (
          <button onClick={onLimpar} style={btnGhost} data-testid="btn-limpar-selecao">
            <X style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>
      <div style={{ padding: 10 }}>
        {!selecao && !gatilho && (
          <div style={{ fontSize: 11, color: PW.muted, lineHeight: 1.6 }}>
            Selecione um gatilho ou uma casa para ver e editar as sinapses.
            <br /><br />
            <strong style={{ color: PW.t2 }}>Macro:</strong> todas as linhas finas.
            <br />
            <strong style={{ color: PW.t2 }}>Micro:</strong> o no clicado acende suas linhas.
          </div>
        )}
        {gatilho && regras.length === 0 && (
          <div style={{ fontSize: 11, color: PW.ciano, lineHeight: 1.6 }}>
            Gatilho <strong>{gatilho.palavraChave}</strong> armado.
            <br />Clique numa casa (coluna a direita) para criar a primeira sinapse.
          </div>
        )}
        {regras.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${PW.border}`, borderLeft: `3px solid ${SEGMENTO_COR[r.segmento]}`, padding: 8, marginBottom: 8, background: PW.bg3 }} data-testid={`insp-regra-${r.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: PW.muted }}>{r.regraId}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: PRIORIDADE_COR[r.prioridade], border: `1px solid ${PRIORIDADE_COR[r.prioridade]}55`, padding: "0 4px" }}>
                {PRIORIDADE_LABEL[r.prioridade]}
              </span>
            </div>
            <div style={{ fontSize: 11, color: PW.text, marginTop: 4, lineHeight: 1.4 }}>
              <span style={{ color: PW.ciano }}>{r.palavraChave}</span>
              <ArrowRight style={{ width: 11, height: 11, margin: "0 4px", verticalAlign: "middle", color: PW.muted }} />
              <span style={{ color: SEGMENTO_COR[r.segmento] }}>{r.itemNome ?? r.codigoReferencia ?? "—"}</span>
            </div>
            <div style={{ fontSize: 9, color: PW.muted, marginTop: 3 }}>
              {(perguntaTexto.get(r.perguntaId.toUpperCase())?.pergunta ?? r.perguntaId).slice(0, 60)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={() => onEditar(r)} style={btnMini(PW.gold)} data-testid={`insp-editar-${r.id}`}>
                <Pencil style={{ width: 11, height: 11 }} /> Editar
              </button>
              <button onClick={() => onToggle(r)} style={btnMini(r.ativo === "SIM" ? PW.muted : PW.ok)} data-testid={`insp-toggle-${r.id}`}>
                {r.ativo === "SIM" ? <PowerOff style={{ width: 11, height: 11 }} /> : <Power style={{ width: 11, height: 11 }} />}
                {r.ativo === "SIM" ? "Pausar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div style={{ fontSize: 10, color: PW.muted, padding: "10px 4px", textAlign: "center", border: `1px dashed ${PW.border}` }}>{texto}</div>;
}

const btnMini = (cor: string): React.CSSProperties => ({
  height: 26, padding: "0 8px", display: "inline-flex", alignItems: "center", gap: 4,
  border: `1px solid ${cor}66`, background: "transparent", color: cor, borderRadius: 0,
  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700,
  cursor: "pointer", fontFamily: MONO,
});

const btnGhost: React.CSSProperties = {
  height: 24, padding: "0 6px", display: "inline-flex", alignItems: "center", gap: 4,
  border: `1px solid ${PW.border}`, background: "transparent", color: PW.muted,
  borderRadius: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
  fontWeight: 700, cursor: "pointer", fontFamily: MONO,
};
