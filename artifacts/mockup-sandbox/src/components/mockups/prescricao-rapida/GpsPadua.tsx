import { useMemo, useState } from "react";
import {
  tk, CATALOGO, CATEGORIAS, SELECIONADAS_INICIAIS, PACIENTE, VITAIS, PATOLOGIAS,
  VIA_META, FREQUENCIAS, FREQUENCIAS_INJETAVEL, DURACOES, ACOES_ANCORA,
} from "./_tokens";
import { horarioParaPeriodo, PERIODOS_DIA } from "./_mensageria";
import { CENARIOS, exemploCartaFuturoPapai, type CenarioId, type MatrizCartaEncantamento } from "./_teatro";
import {
  type Substancia, type Via, type Categoria, type Frequencia, type Ancora, type AcaoAncora, type ComponenteBlend, type Tomada,
} from "./_tokens";

type Modo = "PILHA" | "TIMELINE" | "GPS";

const VIAS_ORDEM: Via[] = ["EV", "IM", "SC", "VO", "IMP", "PRC"];
const TOTAL_SESSOES = 8;
const SESSAO_ATUAL = 3;

const ANCORAS: { v: Ancora; lbl: string }[] = [
  { v: "sem-ancora", lbl: "—" },
  { v: "primeira",   lbl: "1ª sessão" },
  { v: "segunda",    lbl: "2ª sessão" },
  { v: "S01", lbl: "S01" }, { v: "S02", lbl: "S02" }, { v: "S03", lbl: "S03" },
  { v: "S04", lbl: "S04" }, { v: "S05", lbl: "S05" }, { v: "S06", lbl: "S06" },
  { v: "S07", lbl: "S07" }, { v: "S08", lbl: "S08" },
  { v: "antepenultima", lbl: "antepenúltima" },
  { v: "penultima", lbl: "penúltima" }, { v: "ultima", lbl: "última" },
];

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Injetaveis usam SESSOES + FREQUENCIA ("a cada N dias"); VO usa DURACAO + DOSES/DIA.
function ehInjetavel(via: Via): boolean {
  return via === "EV" || via === "IM" || via === "SC";
}

// "30 dias" -> 30 · "6 meses" -> 180 · "continuo" -> null
function diasDeDuracao(d?: string): number | null {
  if (!d) return null;
  const md = d.match(/(\d+)\s*dia/);
  if (md) return parseInt(md[1], 10);
  const mm = d.match(/(\d+)\s*m[eê]s/);
  if (mm) return parseInt(mm[1], 10) * 30;
  return null;
}

// Tomadas = doses por período no dia. Se a substância já tem tomadas, usa-as;
// senão sintetiza UMA tomada a partir do par único periodo/horario + dosesDia.
function tomadasDe(s: Substancia): Tomada[] {
  if (s.tomadas && s.tomadas.length) return s.tomadas;
  return [{ id: "t0", periodo: s.periodo, horario: s.horario, doses: s.dosesDia ?? 1 }];
}

// Doses por dia: VO com tomadas -> SOMA das doses de cada período (ex: 2 manhã + 1 noite = 3).
// Senão usa dosesDia explicito; senao deriva da frequencia legada (2×/dia, 3×/dia).
function dosesPorDia(s: Substancia): number {
  if (s.tomadas && s.tomadas.length) {
    return s.tomadas.reduce((acc, t) => acc + (t.doses || 0), 0);
  }
  if (s.dosesDia != null) return s.dosesDia;
  if (s.frequencia === "2×/dia") return 2;
  if (s.frequencia === "3×/dia") return 3;
  return 1;
}

// Linha "QUANTIDADE: N DOSES" embaixo da posologia (pedido Caio 31/05).
// VO: doses/dia x dias de duracao. Injetaveis: nº de aplicacoes (= sessoes).
function quantidadeResumo(s: Substancia): string | null {
  if (s.via === "VO") {
    const dpd = dosesPorDia(s);
    const dias = diasDeDuracao(s.duracao);
    if (dias) return `${dpd * dias} DOSES`;
    return `${dpd} ${dpd > 1 ? "DOSES" : "DOSE"}/DIA · CONTÍNUO`;
  }
  if (ehInjetavel(s.via)) {
    return `${s.sessoes} ${s.sessoes > 1 ? "APLICAÇÕES" : "APLICAÇÃO"}`;
  }
  return null;
}

// "20:00" → "20h" · "20:30" → "20h30" · aceita "20h" já pronto.
function horaCurta(hhmm?: string): string | null {
  if (!hhmm) return null;
  const m = hhmm.match(/(\d{1,2})[h:]?(\d{2})?/);
  if (!m) return null;
  const h = m[1].padStart(2, "0");
  const mn = m[2] && m[2] !== "00" ? m[2] : "";
  return `${h}h${mn}`;
}

// Período resolvido de uma tomada: se tem horário, deriva (AUTO); senão usa o sigla manual.
function periodoResolvido(t: Tomada): typeof PERIODOS_DIA[number] | null {
  if (t.horario) return horarioParaPeriodo(t.horario);
  if (t.periodo) return PERIODOS_DIA.find(p => p.sigla === t.periodo) ?? null;
  return null;
}

// Horários efetivos de todas as tomadas — alimenta a mensageria e a carta.
// Tomada com hora usa a própria hora; tomada só com período (R5) usa o início da
// janela daquele período, pra que horarioParaPeriodo() resolva o MESMO período.
function horariosDeTomadas(s: Substancia): string[] {
  return tomadasDe(s)
    .map(t => {
      if (t.horario) return t.horario;
      if (t.periodo) return PERIODOS_DIA.find(p => p.sigla === t.periodo)?.janela_inicio ?? null;
      return null;
    })
    .filter((h): h is string => !!h);
}

// Formato de saída da prescrição (regra Caio 31/05): 1 linha por tomada, Obs. embaixo
// só quando preenchida, e "Quantidade: N Doses" no rodapé. Singular/plural automático.
// Unidade do injetável lida do campo QTD por aplicação ("1 ampola" → "ampola").
const UNIDADES_INJETAVEL = ["ampola", "frasco", "seringa", "flaconete", "aplicação", "aplicacao", "dose"];
function unidadeInjetavel(quantidade?: string): string {
  const low = (quantidade ?? "").toLowerCase();
  const hit = UNIDADES_INJETAVEL.find(u => low.includes(u));
  if (!hit) return "aplicação";
  return hit === "aplicacao" ? "aplicação" : hit;
}
function pluralUnidade(u: string): string {
  if (u.endsWith("ão")) return u.slice(0, -2) + "ões"; // aplicação → aplicações
  return u + "s";
}
// Traduz a frequência em cadência natural ("1×/sem" → "1 ampola a cada 7 dias").
function cadenciaInjetavel(freq: string | undefined, unidade: string): string | null {
  if (!freq) return null;
  const f = freq.toLowerCase().trim();
  if (f.includes("única") || f.includes("unica")) return "dose única";
  if (f.includes("diár") || f.includes("diar")) return `1 ${unidade} por dia`;
  if (f.includes("quinzenal")) return `1 ${unidade} a cada 15 dias`;
  if (f.includes("mensal")) return `1 ${unidade} a cada 30 dias`;
  if (f === "semanal") return `1 ${unidade} a cada 7 dias`;
  const semMatch = f.match(/^(\d+)\s*[x×]\s*\/?\s*sem/);
  if (semMatch) {
    const n = parseInt(semMatch[1], 10);
    if (n === 1) return `1 ${unidade} a cada 7 dias`;
    return `${n} ${pluralUnidade(unidade)} por semana`;
  }
  return null;
}

function linhasPrescricao(s: Substancia): { tomadas: { dose: string; obs?: string }[]; quantidade: string } {
  const ts = tomadasDe(s);
  const inj = ehInjetavel(s.via);
  const tomadas = ts.map(t => {
    const n = t.doses || 1;
    const p = periodoResolvido(t);
    const hora = horaCurta(t.horario);
    let dose: string;
    if (inj) {
      // Formato pedido Caio 31/05: "Aplicar 1 Ampola IM — Antes do Café da Manhã"
      const qtd = s.quantidade && s.quantidade.trim()
        ? s.quantidade.trim()
        : `${n} ${n > 1 ? "doses" : "dose"}`;
      dose = `Aplicar ${qtd} ${s.via}`;
      if (p) dose += ` — ${p.nome}`;
      // Relógio sai do texto da receita do injetável (pedido Caio 31/05: "Aplicar 1 Ampola
      // IM - Antes do Café da Manhã"). O horário continua vivo no campo + mensageria.
    } else {
      dose = `${n} ${n > 1 ? "Doses" : "Dose"} ${s.via}`;
      if (p) dose += ` — ${p.nome}`;
      if (hora) dose += ` — Sugestão às ${hora}`;
    }
    const obs = t.obs && t.obs.trim() ? t.obs.trim() : undefined;
    return { dose, obs };
  });
  if (inj) {
    const ap = s.sessoes;
    const unidade = unidadeInjetavel(s.quantidade);
    const totalUnid = ap > 1 ? pluralUnidade(unidade) : unidade;
    const cad = cadenciaInjetavel(s.frequencia, unidade);
    // "Quantidade: 6 ampolas ( 1 ampola a cada 7 dias )" — total + cadência numa frase
    // só, deixando sessões e frequência implícitas (pedido Caio 31/05).
    const detalhe = cad ? ` ( ${cad} )` : (s.frequencia ? ` · ${s.frequencia}` : "");
    return { tomadas, quantidade: `Quantidade: ${ap} ${totalUnid}${detalhe}` };
  }
  const dpd = dosesPorDia(s);
  const dias = diasDeDuracao(s.duracao);
  const total = dias ? dpd * dias : null;
  const quantidade = total != null
    ? `Quantidade: ${total} ${total > 1 ? "Doses" : "Dose"}`
    : `Quantidade: ${dpd} ${dpd > 1 ? "Doses" : "Dose"}/dia · contínuo`;
  return { tomadas, quantidade };
}

function sessoesAtivas(s: Substancia): boolean[] {
  const arr = new Array(TOTAL_SESSOES).fill(false);
  if (s.ancora === "primeira")  { arr[0] = true; return arr; }
  if (s.ancora === "segunda")   { arr[1] = true; return arr; }
  if (s.ancora === "ultima")    { arr[TOTAL_SESSOES - 1] = true; return arr; }
  if (s.ancora === "penultima") { arr[TOTAL_SESSOES - 2] = true; return arr; }
  if (s.ancora === "antepenultima") { arr[TOTAL_SESSOES - 3] = true; return arr; }
  if (s.ancora && s.ancora.startsWith("S")) {
    const idx = parseInt(s.ancora.slice(1), 10) - 1;
    if (idx >= 0 && idx < TOTAL_SESSOES) arr[idx] = true;
    return arr;
  }
  if (s.via === "VO" || s.via === "IMP" || s.frequencia === "diária" || s.frequencia === "2×/dia") {
    for (let i = 0; i < TOTAL_SESSOES; i++) arr[i] = true;
    return arr;
  }
  if (s.frequencia === "única") { arr[0] = true; return arr; }
  if (s.frequencia === "mensal") { arr[0] = true; arr[4] = true; return arr; }
  if (s.frequencia === "quinzenal") { arr[0] = true; arr[2] = true; arr[4] = true; arr[6] = true; return arr; }
  const cap = Math.min(s.sessoes, TOTAL_SESSOES);
  for (let i = 0; i < cap; i++) arr[i] = true;
  return arr;
}

// ───────────────────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────────────────

export function GpsPadua({ embutido = false }: { embutido?: boolean } = {}) {
  const [modo, setModo] = useState<Modo>("GPS");
  const [sel, setSel] = useState<Substancia[]>(SELECIONADAS_INICIAIS);
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const [colMin, setColMin] = useState<Record<Via, boolean>>({
    EV: false, IM: false, SC: false, VO: false, IMP: true, PRC: true,
  });
  const [editandoFormula, setEditandoFormula] = useState<string | null>("blend-vo");
  // Lifted: carta de encantamento persiste mesmo ao fechar/abrir o EditorBlend
  const [carta, setCarta] = useState<MatrizCartaEncantamento>(exemploCartaFuturoPapai());

  const porVia = useMemo(() => {
    const m: Record<Via, Substancia[]> = { EV: [], IM: [], SC: [], VO: [], IMP: [], PRC: [] };
    sel.forEach(s => m[s.via].push(s));
    return m;
  }, [sel]);

  const total = sel.reduce((a, s) => a + s.preco * s.sessoes, 0);

  const update = (id: string, patch: Partial<Substancia>) =>
    setSel(sel.map(s => s.id === id ? { ...s, ...patch } : s));
  const remove = (id: string) => setSel(sel.filter(s => s.id !== id));
  const toggleCol = (v: Via) => setColMin({ ...colMin, [v]: !colMin[v] });

  const formulaAberta = editandoFormula ? sel.find(s => s.id === editandoFormula) : null;

  return (
    <div style={{
      minHeight: embutido ? undefined : "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: embutido ? 0 : 16, display: "flex", flexDirection: "column", gap: 12,
      fontSize: 11,
    }}>
      {!embutido && <Topo modo={modo} setModo={setModo} totalSubs={sel.length} totalGeral={total} />}
      {embutido && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", border: `1px solid ${tk.border}` }}>
            {(["PILHA", "TIMELINE", "GPS"] as Modo[]).map(m => {
              const ativo = modo === m;
              return (
                <button key={m} onClick={() => setModo(m)} style={{
                  fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  padding: "6px 12px", cursor: "pointer",
                  background: ativo ? tk.accent : tk.bg, color: ativo ? tk.bg : tk.inkMuted,
                  border: "none", borderRight: m !== "GPS" ? `1px solid ${tk.border}` : "none",
                }}>{m}</button>
              );
            })}
          </div>
        </div>
      )}

      {(modo === "PILHA" || modo === "GPS") && (
        <Pilha porVia={porVia} update={update} remove={remove}
          hoverItem={hoverItem} setHoverItem={setHoverItem}
          addItem={(s) => setSel([...sel, { ...s }])} sel={sel}
          colMin={colMin} toggleCol={toggleCol}
          editandoFormula={editandoFormula} setEditandoFormula={setEditandoFormula} />
      )}

      {(modo === "PILHA" || modo === "GPS") && formulaAberta && (
        <EditorBlend
          formula={formulaAberta}
          update={(patch) => update(formulaAberta.id, patch)}
          onClose={() => setEditandoFormula(null)}
          selecionarFormula={(id) => setEditandoFormula(id)}
          carta={carta} setCarta={setCarta} todasFormulas={sel} />
      )}

      {(modo === "TIMELINE" || modo === "GPS") && (
        <Timeline sel={sel} hoverItem={hoverItem} setHoverItem={setHoverItem} update={update} />
      )}

      <ActionBar total={total} sel={sel} porVia={porVia} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Topo: paciente compacto + KPIs + toggle de modo
// ───────────────────────────────────────────────────────────────────────

function Topo({ modo, setModo, totalSubs, totalGeral }: {
  modo: Modo; setModo: (m: Modo) => void; totalSubs: number; totalGeral: number;
}) {
  return (
    <header style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 20, alignItems: "center",
      background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: "10px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, background: tk.bg, color: tk.accent,
          fontFamily: tk.mono, fontSize: 13, fontWeight: 700,
          display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`,
        }}>{PACIENTE.iniciais}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{PACIENTE.nome}</div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
            ID {PACIENTE.id} · {PACIENTE.idade}a · CPF {PACIENTE.cpf}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginLeft: 8 }}>
          <span style={{
            fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1,
            padding: "2px 6px", color: tk.warn, background: tk.via.IM.soft, border: `1px solid ${tk.via.IM.line}`,
            textAlign: "center",
          }}>PLANO {PACIENTE.plano}</span>
          <span style={{
            fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1,
            padding: "2px 6px", color: tk.ok, background: tk.via.EV.soft, border: `1px solid ${tk.via.EV.line}`,
            textAlign: "center",
          }}>SESSÃO {PACIENTE.sessao}</span>
        </div>
      </div>

      {/* Vitais + Patologias inline */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {VITAIS.map(v => (
          <div key={v.label} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
            background: tk.bg, borderLeft: `2px solid ${v.status === "alerta" ? tk.warn : tk.ok}`,
          }}>
            <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>{v.label}</span>
            <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: v.status === "alerta" ? tk.warn : tk.ink }}>{v.valor}</span>
          </div>
        ))}
        <span style={{ width: 1, height: 24, background: tk.border }} />
        {PATOLOGIAS.map(p => (
          <div key={p.nome} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.status === "alerta" ? tk.warn : tk.ok }} />
            <span style={{ fontSize: 10, color: tk.ink }}>{p.nome}</span>
          </div>
        ))}
      </div>

      {/* KPI compacto */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Kpi lbl="ITENS"     val={String(totalSubs).padStart(2, "0")} cor={tk.accent} />
        <Kpi lbl="PROTOCOLO" val={brl(totalGeral)}                    cor={tk.accent} />
      </div>

      {/* Título do painel (não-pessoal) + toggle de modo Motor-Clínico style */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <span style={{
          fontFamily: tk.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tk.accent,
        }}>GPS CLÍNICO</span>
        <div style={{ display: "flex", border: `1px solid ${tk.border}` }}>
          {(["PILHA", "TIMELINE", "GPS"] as Modo[]).map(m => {
            const ativo = modo === m;
            return (
              <button key={m}
                onClick={() => setModo(m)}
                style={{
                  fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  padding: "8px 14px", cursor: "pointer",
                  background: ativo ? tk.accent : tk.bg,
                  color: ativo ? tk.bg : tk.inkMuted,
                  border: "none", borderRight: m !== "GPS" ? `1px solid ${tk.border}` : "none",
                  ...(ativo ? { boxShadow: `0 0 12px ${tk.accentGlow}` } : {}),
                }}>{m}</button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function Kpi({ lbl, val, cor }: { lbl: string; val: string; cor: string }) {
  return (
    <div style={{ background: tk.bg, padding: "6px 10px", borderLeft: `3px solid ${cor}` }}>
      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>{lbl}</div>
      <div style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: cor, marginTop: 1 }}>{val}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Modo PILHA: 6 colunas por via
// ───────────────────────────────────────────────────────────────────────

function Pilha({ porVia, update, remove, hoverItem, setHoverItem, addItem, sel,
  colMin, toggleCol, editandoFormula, setEditandoFormula }: {
  porVia: Record<Via, Substancia[]>;
  update: (id: string, patch: Partial<Substancia>) => void;
  remove: (id: string) => void;
  hoverItem: string | null;
  setHoverItem: (id: string | null) => void;
  addItem: (s: Substancia) => void;
  sel: Substancia[];
  colMin: Record<Via, boolean>;
  toggleCol: (v: Via) => void;
  editandoFormula: string | null;
  setEditandoFormula: (id: string | null) => void;
}) {
  // Grid dinâmico: colunas min ocupam 60px, colunas max ocupam fração
  const cols = VIAS_ORDEM.map(v => colMin[v] ? "60px" : "1fr").join(" ");

  return (
    <section style={{ display: "grid", gridTemplateColumns: cols, gap: 8, transition: "all 0.2s" }}>
      {VIAS_ORDEM.map(v => {
        const c = tk.via[v];
        const meta = VIA_META[v];
        const itens = porVia[v];
        const minimizada = colMin[v];

        if (minimizada) {
          // Coluna colapsada: sigla vertical + contador + botão ↕
          return (
            <div key={v}
              onClick={() => toggleCol(v)}
              style={{
                background: tk.bgAlt, border: `1px solid ${tk.border}`,
                borderTop: `3px solid ${c.dot}`, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", minHeight: 360, transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.soft; e.currentTarget.style.boxShadow = `0 0 8px ${c.line}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tk.bgAlt; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ fontFamily: tk.mono, fontSize: 12, color: c.dot }}>↕</div>
              <div style={{
                writingMode: "vertical-rl", transform: "rotate(180deg)",
                fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: c.dot, letterSpacing: 3,
              }}>{v} · {meta.titulo}</div>
              <div style={{
                fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot,
                padding: "3px 6px", background: c.soft, border: `1px solid ${c.line}`,
              }}>{itens.length}</div>
            </div>
          );
        }

        const cands = CATALOGO.filter(s => s.via === v && !sel.find(x => x.id === s.id));
        const subtotal = itens.reduce((a, s) => a + s.preco * s.sessoes, 0);

        return (
          <div key={v} style={{
            background: tk.bgAlt, border: `1px solid ${tk.border}`,
            borderTop: `3px solid ${c.dot}`,
            display: "flex", flexDirection: "column", minHeight: 360,
          }}>
            {/* Header coluna com botão min */}
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.border}`, background: c.soft }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: c.dot, letterSpacing: 1.5 }}>{v}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{itens.length} ITENS</span>
                  <button onClick={() => toggleCol(v)}
                    title="Minimizar coluna"
                    style={{
                      background: "transparent", border: `1px solid ${c.line}`, color: c.dot,
                      fontFamily: tk.mono, fontSize: 10, cursor: "pointer", padding: "1px 5px", lineHeight: 1,
                    }}>↕</button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: tk.ink, marginTop: 1 }}>{meta.titulo}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 1 }}>{meta.sub}</div>
            </div>

            {/* Selecionadas com CONTROLES INLINE */}
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {itens.map(s => {
                const h = hoverItem === s.id;
                const ehFormula = !!s.componentes;
                const aberta = editandoFormula === s.id;
                return (
                  <div key={s.id}
                    onMouseEnter={() => setHoverItem(s.id)}
                    onMouseLeave={() => setHoverItem(null)}
                    style={{
                      background: tk.bg, padding: 8,
                      border: `1px solid ${aberta ? c.dot : tk.border}`, borderLeft: `3px solid ${c.dot}`,
                      transition: "all 0.12s",
                      ...(h || aberta ? { outline: `1px solid ${c.dot}`, outlineOffset: "-1px", boxShadow: `0 0 10px ${c.line}` } : {}),
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25 }}>{s.nome}</div>
                        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
                          {s.dose}{ehFormula ? ` · ${s.componentes!.length} subst.` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {ehFormula && (
                          <button
                            onClick={() => setEditandoFormula(aberta ? null : s.id)}
                            title={aberta ? "Fechar editor de blend" : "Abrir editor de blend (3º andar)"}
                            style={{
                              background: aberta ? c.dot : "transparent", color: aberta ? tk.bg : c.dot,
                              border: `1px solid ${c.dot}`, fontFamily: tk.mono, fontSize: 8, fontWeight: 700,
                              cursor: "pointer", padding: "1px 5px", letterSpacing: 1, lineHeight: 1.4,
                            }}>⚙ BLEND</button>
                        )}
                        <button onClick={() => remove(s.id)} style={{
                          background: "transparent", color: tk.inkSubtle, border: "none",
                          fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1,
                        }}>×</button>
                      </div>
                    </div>

                    {/* Posologia campo-a-campo · clusters por sentido · linha imaginária à esquerda · neon ao focar/hover */}
                    <div data-campos="sim" style={{
                      marginTop: 8, display: "flex", flexDirection: "column", gap: 7,
                      paddingLeft: 8, borderLeft: `1px solid ${c.line}`,
                    }}>
                      {/* QUANTO · dose + quantidade (mesmo sentido → lado a lado).
                          Injetáveis: MG é FIXO da fórmula (read-only) + QTD/APLICAÇÃO editável (pedido Caio 31/05). */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <MiniCampo label={ehInjetavel(s.via) ? "MG · FIXO DA FÓRMULA" : "DOSE"}>
                          {ehInjetavel(s.via) ? (
                            <div title="Definido no cadastro da fórmula · não editável no cockpit"
                              style={{
                                background: tk.bgAlt, color: tk.inkMuted, border: `1px dashed ${tk.border}`,
                                padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, fontWeight: 700,
                                boxSizing: "border-box", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>{s.dose}</div>
                          ) : (
                            <NeonInput cor={c.dot} value={s.dose}
                              onChange={(e) => update(s.id, { dose: e.target.value })} />
                          )}
                        </MiniCampo>
                        <MiniCampo label={ehInjetavel(s.via) ? "QTD · POR APLICAÇÃO" : "QUANTIDADE"}>
                          <NeonInput cor={c.dot} value={s.quantidade ?? ""}
                            placeholder={ehInjetavel(s.via) ? "ex: 1 ampola · 2 ampolas" : "ex: 2 cáps"}
                            onChange={(e) => update(s.id, { quantidade: e.target.value })} />
                        </MiniCampo>
                      </div>

                      {/* VIA · rota (sentido próprio → sozinho) */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <MiniCampo label="VIA">
                          <NeonSelect cor={c.dot} value={s.via}
                            onChange={(e) => update(s.id, { via: e.target.value as Via })}>
                            {(Object.keys(VIA_META) as Via[]).map(vv => (
                              <option key={vv} value={vv}>{vv} · {VIA_META[vv].titulo}</option>
                            ))}
                          </NeonSelect>
                        </MiniCampo>
                      </div>

                      {/* QUANDO NO DIA · dose POR PERÍODO. VO + injetáveis (EV/IM/SC) usam o MESMO
                          editor de tomadas da prescrição de fórmulas (pedido Caio 31/05). IMP/PRC: linha única. */}
                      {(s.via === "VO" || ehInjetavel(s.via)) ? (
                        <TomadasEditor
                          tomadas={tomadasDe(s)}
                          setTomadas={(arr) => update(s.id, { tomadas: arr })}
                          cor={c.dot} line={c.line} />
                      ) : (
                        <div style={{ display: "flex", gap: 6 }}>
                          <MiniCampo label="PERÍODO">
                            <NeonSelect cor={c.dot} value={s.periodo || ""}
                              onChange={(e) => update(s.id, { periodo: e.target.value || undefined })}>
                              {/* REGRA 1: em AUTO, depois de digitar o HORÁRIO o período derivado aparece aqui */}
                              <option value="">
                                {(() => {
                                  const p = s.horario ? horarioParaPeriodo(s.horario) : null;
                                  return p ? `AUTO → ${p.sigla} · ${p.nome}` : "AUTO · pelo horário";
                                })()}
                              </option>
                              {PERIODOS_DIA.map(p => (
                                <option key={p.sigla} value={p.sigla}>{p.sigla} · {p.nome}</option>
                              ))}
                            </NeonSelect>
                          </MiniCampo>
                          <MiniCampo label="HORÁRIO">
                            <div style={{ display: "flex", gap: 3 }}>
                              <NeonInput cor={c.dot} type="time" value={s.horario ?? ""} style={{ flex: 1 }}
                                onChange={(e) => update(s.id, { horario: e.target.value || undefined })} />
                              {s.horario && (
                                <button type="button" title="Zerar horário"
                                  onClick={() => update(s.id, { horario: undefined })}
                                  style={{
                                    background: "transparent", color: tk.inkSubtle, border: `1px solid ${tk.border}`,
                                    fontFamily: tk.mono, fontSize: 11, lineHeight: 1, cursor: "pointer", padding: "0 6px",
                                  }}>×</button>
                              )}
                            </div>
                          </MiniCampo>
                        </div>
                      )}

                      {/* EXTENSÃO · injetáveis: SESSÕES + FREQUÊNCIA · VO: DURAÇÃO + DOSES/DIA · demais: DURAÇÃO + SESSÕES */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {s.via === "VO" ? (
                          <>
                            {/* VO: doses agora vêm das TOMADAS por período · aqui só a extensão do tratamento */}
                            <MiniCampo label="DURAÇÃO">
                              <NeonSelect cor={c.dot} value={s.duracao ?? ""}
                                onChange={(e) => update(s.id, { duracao: e.target.value || undefined })}>
                                <option value="">—</option>
                                {DURACOES.map(d => <option key={d} value={d}>{d}</option>)}
                              </NeonSelect>
                            </MiniCampo>
                            {/* TOTAL/DIA derivado da soma das tomadas (somente leitura) */}
                            <MiniCampo label="TOTAL/DIA">
                              <div style={{
                                background: tk.bg, border: `1px solid ${tk.border}`,
                                padding: "4px 6px", fontFamily: tk.mono, fontSize: 10,
                                color: c.dot, fontWeight: 700, boxSizing: "border-box",
                              }}>{dosesPorDia(s)} {dosesPorDia(s) > 1 ? "doses" : "dose"}</div>
                            </MiniCampo>
                          </>
                        ) : ehInjetavel(s.via) ? (
                          <>
                            {/* SESSÕES antes · DURAÇÃO virou FREQUÊNCIA nos injetáveis (pedido Caio 31/05) */}
                            <MiniCampo label="SESSÕES">
                              <NeonInput cor={c.dot} type="number" min={1} max={30} value={s.sessoes}
                                onChange={(e) => update(s.id, { sessoes: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
                            </MiniCampo>
                            {/* FREQUÊNCIA · SC mantém sugestões em dropdown · IM/EV texto livre puro (pedido Caio 31/05) */}
                            <MiniCampo label="FREQUÊNCIA">
                              <NeonInput cor={c.dot} value={s.frequencia}
                                list={s.via === "SC" ? "freq-injetavel-presets" : undefined}
                                placeholder="escreva à vontade · ex: a cada 10 dias"
                                onChange={(e) => update(s.id, { frequencia: e.target.value as Frequencia })} />
                              {s.via === "SC" && (
                                <datalist id="freq-injetavel-presets">
                                  {FREQUENCIAS_INJETAVEL.map(f => <option key={f} value={f} />)}
                                </datalist>
                              )}
                            </MiniCampo>
                          </>
                        ) : (
                          <>
                            <MiniCampo label="DURAÇÃO">
                              <NeonSelect cor={c.dot} value={s.duracao ?? ""}
                                onChange={(e) => update(s.id, { duracao: e.target.value || undefined })}>
                                <option value="">—</option>
                                {DURACOES.map(d => <option key={d} value={d}>{d}</option>)}
                              </NeonSelect>
                            </MiniCampo>
                            <MiniCampo label="SESSÕES">
                              <NeonInput cor={c.dot} type="number" min={1} max={30} value={s.sessoes}
                                onChange={(e) => update(s.id, { sessoes: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
                            </MiniCampo>
                          </>
                        )}
                      </div>

                      {/* PRESCRIÇÃO formatada (1 linha por tomada + Obs. + Quantidade) na VO E nos
                          injetáveis — mesmo formato da prescrição de fórmulas (pedido Caio 31/05).
                          IMP/PRC mantêm o resumo curto QUANTIDADE. */}
                      {(s.via === "VO" || ehInjetavel(s.via)) ? (
                        <PrescricaoPreview s={s} cor={c.dot} comTitulo={ehInjetavel(s.via)} />
                      ) : quantidadeResumo(s) && (
                        <div style={{
                          marginTop: 2, padding: "3px 7px", background: tk.bgAlt,
                          borderLeft: `3px solid ${c.dot}`,
                          fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: c.dot, letterSpacing: 1,
                        }}>
                          QUANTIDADE: {quantidadeResumo(s)}
                        </div>
                      )}

                      {/* MENSAGEM · instrução livre (sentido próprio → sozinho) */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <MiniCampo label="MENSAGEM">
                          <NeonInput cor={c.dot} value={s.mensagem ?? ""}
                            placeholder="ex: antes do café da tarde · com suco de limão"
                            onChange={(e) => update(s.id, { mensagem: e.target.value })} />
                        </MiniCampo>
                      </div>

                      {/* ÂNCORA · marco da jornada + ação vinculada (mesmo sentido → lado a lado) */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <MiniCampo label="ÂNCORA · MARCO">
                          <NeonSelect cor={c.dot} value={s.ancora || "sem-ancora"}
                            onChange={(e) => update(s.id, { ancora: e.target.value as Ancora })}>
                            {ANCORAS.map(a => <option key={a.v} value={a.v}>{a.lbl === "—" ? "sem vínculo" : a.lbl}</option>)}
                          </NeonSelect>
                        </MiniCampo>
                        <MiniCampo label="AÇÃO">
                          <NeonSelect cor={c.dot} value={s.ancoraAcao ?? "—"}
                            onChange={(e) => update(s.id, { ancoraAcao: e.target.value === "—" ? undefined : (e.target.value as AcaoAncora) })}>
                            {ACOES_ANCORA.map(a => <option key={a} value={a}>{a === "—" ? "sem ação" : a}</option>)}
                          </NeonSelect>
                        </MiniCampo>
                      </div>

                      {/* NOTA DA ÂNCORA · frase livre (lembrete do paciente ou da fórmula) */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <MiniCampo label="NOTA DA ÂNCORA">
                          <NeonInput cor={c.dot} value={s.ancoraNota ?? ""}
                            placeholder="ex: esposa grávida, parabenizar · solicitar TSH na próxima"
                            onChange={(e) => update(s.id, { ancoraNota: e.target.value })} />
                        </MiniCampo>
                      </div>
                    </div>

                    {/* Mini-timeline da própria substância */}
                    <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
                      {sessoesAtivas(s).map((on, i) => {
                        const passada = i + 1 < SESSAO_ATUAL;
                        return (
                          <span key={i} title={`S${String(i + 1).padStart(2, "0")}`}
                            style={{
                              flex: 1, height: 6,
                              background: on ? (passada ? c.line : c.dot) : tk.bgSoft,
                            }} />
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
                        {s.sessoes}× {brl(s.preco)}
                      </span>
                      <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot }}>
                        {brl(s.preco * s.sessoes)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {itens.length === 0 && (
                <div style={{
                  border: `1px dashed ${tk.borderStrong}`, padding: 12, textAlign: "center",
                  fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1,
                }}>SEM ITENS</div>
              )}
            </div>

            {/* Funil VIA → CATEGORIA → ATIVO · lista completa + busca */}
            <PainelAdicionar cor={c.dot} corLine={c.line} cands={cands} addItem={addItem} />

            <div style={{
              padding: "6px 10px", borderTop: `1px solid ${tk.border}`,
              background: tk.bgSoft, display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>SUBTOTAL</span>
              <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: c.dot }}>{brl(subtotal)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

const inpBase: React.CSSProperties = {
  background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`,
  padding: "3px 6px", fontFamily: tk.mono, fontSize: 10, outline: "none",
  width: "100%", boxSizing: "border-box",
};

// Navegação por teclado (pedido Caio 31/05): Enter pula pro próximo campo,
// Shift+Enter volta pro anterior. Tab continua nativo. Setas NÃO são sequestradas
// pra não quebrar o stepper do campo número, o seletor de hora nem a troca de
// opção do dropdown (decisão A da proposta). Escopo = card com [data-campos].
function navPorEnter(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;
  const escopo = (e.currentTarget as HTMLElement).closest("[data-campos]");
  if (!escopo) return;
  const campos = Array.from(
    escopo.querySelectorAll<HTMLElement>("input, select, textarea"),
  ).filter(el => !(el as HTMLInputElement).disabled && el.tabIndex !== -1);
  const i = campos.indexOf(e.currentTarget as HTMLElement);
  if (i === -1) return;
  const alvo = campos[i + (e.shiftKey ? -1 : 1)];
  if (alvo) { e.preventDefault(); alvo.focus(); }
}

// Posologia campo-a-campo · cada campo é um quadradinho VISÍVEL com titulozinho em cima,
// alinhado à esquerda; neon na cor da via ao focar/passar o mouse.
function MiniCampo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
      <span style={{
        fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1,
        textTransform: "uppercase", whiteSpace: "nowrap",
      }}>{label}</span>
      {children}
    </label>
  );
}

function neonStyle(cor: string, ativo: boolean): React.CSSProperties {
  return {
    background: tk.bg, color: tk.ink,
    border: `1px solid ${ativo ? cor : tk.borderStrong}`,
    padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, outline: "none",
    width: "100%", boxSizing: "border-box",
    boxShadow: ativo ? `0 0 8px ${cor}, inset 0 0 6px ${cor}22` : "none",
    transition: "border-color 0.12s, box-shadow 0.12s",
  };
}

function NeonInput({ cor, ...props }: { cor: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [ativo, setAtivo] = useState(false);
  return (
    <input {...props}
      onFocus={(e) => { setAtivo(true); props.onFocus?.(e); }}
      onBlur={(e) => { setAtivo(false); props.onBlur?.(e); }}
      onKeyDown={(e) => { navPorEnter(e); props.onKeyDown?.(e); }}
      onMouseEnter={(e) => { setAtivo(true); props.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) setAtivo(false); props.onMouseLeave?.(e); }}
      style={{ ...neonStyle(cor, ativo), ...props.style }} />
  );
}

function NeonSelect({ cor, children, ...props }: { cor: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [ativo, setAtivo] = useState(false);
  return (
    <select {...props}
      onFocus={(e) => { setAtivo(true); props.onFocus?.(e); }}
      onBlur={(e) => { setAtivo(false); props.onBlur?.(e); }}
      onKeyDown={(e) => { navPorEnter(e); props.onKeyDown?.(e); }}
      onMouseEnter={(e) => { setAtivo(true); props.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) setAtivo(false); props.onMouseLeave?.(e); }}
      style={{ ...neonStyle(cor, ativo), ...props.style }}>
      {children}
    </select>
  );
}

// ───────────────────────────────────────────────────────────────────────
// TomadasEditor · dose individualizada por período (compartilhado card GPS + 3º andar)
// Regras Caio 31/05: R3 horário primeiro / período à direita · R4 período AUTO pelo
// horário · R5 sem hora → período selecionável · R6 Obs. por tomada (vazia some).
// ───────────────────────────────────────────────────────────────────────
function TomadasEditor({ tomadas, setTomadas, cor, line }: {
  tomadas: Tomada[]; setTomadas: (arr: Tomada[]) => void; cor: string; line: string;
}) {
  const patch = (id: string, p: Partial<Tomada>) =>
    setTomadas(tomadas.map(x => x.id === id ? { ...x, ...p } : x));
  const remove = (id: string) => { if (tomadas.length > 1) setTomadas(tomadas.filter(x => x.id !== id)); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle,
        letterSpacing: 1, textTransform: "uppercase",
      }}>QUANDO NO DIA · DOSE POR PERÍODO</span>
      {tomadas.map(t => {
        const pAuto = t.horario ? horarioParaPeriodo(t.horario) : null;
        return (
          <div key={t.id} style={{
            display: "flex", flexDirection: "column", gap: 4,
            paddingBottom: 6, borderBottom: `1px dashed ${tk.border}`,
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              {/* R3 · HORÁRIO primeiro · com botão zerar (pedido Caio 31/05) */}
              <MiniCampo label="HORÁRIO">
                <div style={{ display: "flex", gap: 3 }}>
                  <NeonInput cor={cor} type="time" value={t.horario ?? ""} style={{ flex: 1 }}
                    onChange={(e) => patch(t.id, { horario: e.target.value || undefined })} />
                  {t.horario && (
                    <button type="button" title="Zerar horário"
                      onClick={() => patch(t.id, { horario: undefined })}
                      style={{
                        background: "transparent", color: tk.inkSubtle, border: `1px solid ${tk.border}`,
                        fontFamily: tk.mono, fontSize: 11, lineHeight: 1, cursor: "pointer", padding: "0 6px",
                      }}>×</button>
                  )}
                </div>
              </MiniCampo>
              {/* R4/R5 · PERÍODO à direita: AUTO se tem hora, selecionável se não */}
              <MiniCampo label="PERÍODO">
                {t.horario ? (
                  <div style={{
                    background: tk.bg, border: `1px solid ${tk.border}`, padding: "4px 6px",
                    fontFamily: tk.mono, fontSize: 10, color: cor, fontWeight: 700,
                    boxSizing: "border-box", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }} title={pAuto ? `${pAuto.sigla} · ${pAuto.nome}` : "fora das janelas"}>
                    {pAuto ? `AUTO → ${pAuto.sigla} · ${pAuto.nome}` : "AUTO → —"}
                  </div>
                ) : (
                  <NeonSelect cor={cor} value={t.periodo || ""}
                    onChange={(e) => patch(t.id, { periodo: e.target.value || undefined })}>
                    <option value="">selecione…</option>
                    {PERIODOS_DIA.map(p => (
                      <option key={p.sigla} value={p.sigla}>{p.sigla} · {p.nome}</option>
                    ))}
                  </NeonSelect>
                )}
              </MiniCampo>
              <div style={{ flex: "0 0 52px" }}>
                <MiniCampo label="DOSES">
                  <NeonInput cor={cor} type="number" min={1} max={12} value={t.doses}
                    onChange={(e) => patch(t.id, { doses: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
                </MiniCampo>
              </div>
              <button onClick={() => remove(t.id)} disabled={tomadas.length <= 1} title="Remover esta tomada"
                style={{
                  background: "transparent", color: tomadas.length > 1 ? tk.inkSubtle : tk.border,
                  border: `1px solid ${tk.border}`, fontFamily: tk.mono, fontSize: 11,
                  lineHeight: 1, cursor: tomadas.length > 1 ? "pointer" : "default", padding: "5px 7px",
                }}>×</button>
            </div>
            {/* R6 · Obs. desta tomada (vazia = não aparece na prescrição) */}
            <MiniCampo label="OBS. DESTA TOMADA">
              <NeonInput cor={cor} value={t.obs ?? ""}
                placeholder="vazio = não aparece · ex: com suco de limão"
                onChange={(e) => patch(t.id, { obs: e.target.value })} />
            </MiniCampo>
          </div>
        );
      })}
      <button
        onClick={() => setTomadas([...tomadas, { id: "t" + Date.now(), periodo: "", horario: "", doses: 1 }])}
        style={{
          alignSelf: "flex-start", background: "transparent", color: cor,
          border: `1px dashed ${line}`, fontFamily: tk.mono, fontSize: 8,
          fontWeight: 700, letterSpacing: 1, cursor: "pointer", padding: "3px 8px",
        }}>+ TOMADA</button>
    </div>
  );
}

// Bloco de saída da prescrição (R7) · 1 linha por tomada + Obs. + Quantidade.
function PrescricaoPreview({ s, cor, comTitulo = false }: { s: Substancia; cor: string; comTitulo?: boolean }) {
  const { tomadas, quantidade } = linhasPrescricao(s);
  return (
    <div style={{
      marginTop: 2, padding: "6px 8px", background: tk.bgAlt,
      border: `1px solid ${tk.border}`, borderLeft: `3px solid ${cor}`,
    }}>
      <div style={{
        fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle,
        letterSpacing: 1.5, marginBottom: 4,
      }}>PRESCRIÇÃO · COMO SAI NA RECEITA</div>
      {comTitulo && (
        <div style={{
          fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: tk.ink, marginBottom: 4,
        }}>{s.nome}{s.dose ? ` ${s.dose}` : ""}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {tomadas.map((t, i) => (
          <div key={i}>
            <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ink, fontWeight: 700 }}>{t.dose}</div>
            {t.obs && (
              <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, paddingLeft: 8 }}>Obs.: {t.obs}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{
        fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: cor,
        letterSpacing: 0.5, marginTop: 4,
      }}>{quantidade}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// FOLHA · receita consolidada · todas as fórmulas (ativos + posologia) como sai no papel
// ───────────────────────────────────────────────────────────────────────
function FolhaConsolidada({ todasFormulas }: { todasFormulas: Substancia[] }) {
  const ordemVias: Via[] = ["EV", "IM", "SC", "VO", "IMP", "PRC"];
  const ordenadas = [...todasFormulas].sort(
    (a, b) => ordemVias.indexOf(a.via) - ordemVias.indexOf(b.via),
  );
  return (
    <div style={{ padding: 14 }}>
      <div style={{ background: tk.bg, border: `1px solid ${tk.border}`, padding: 14 }}>
        {/* Cabeçalho da folha */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `1px solid ${tk.border}`, paddingBottom: 8, marginBottom: 10,
        }}>
          <div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 2 }}>
              PRESCRIÇÃO · COMO SAI NA FOLHA
            </div>
            <div style={{ fontFamily: tk.sans, fontSize: 13, fontWeight: 700, color: tk.ink, marginTop: 3 }}>
              {PACIENTE.nome}
            </div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
              ID {PACIENTE.id} · {PACIENTE.idade}a · CPF {PACIENTE.cpf}
            </div>
          </div>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1 }}>
            {ordenadas.length} {ordenadas.length === 1 ? "ITEM" : "ITENS"}
          </span>
        </div>

        {/* Cada fórmula: ativos + posologia */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ordenadas.map((f, idx) => {
            const cf = tk.via[f.via];
            const comps = f.componentes || [];
            return (
              <div key={f.id} style={{
                borderLeft: `3px solid ${cf.dot}`, paddingLeft: 10,
                display: "flex", flexDirection: "column", gap: 5,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span style={{
                    fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: cf.dot,
                    padding: "1px 6px", border: `1px solid ${cf.line}`, letterSpacing: 1,
                  }}>{f.via}</span>
                  <span style={{ fontFamily: tk.sans, fontSize: 12, fontWeight: 700, color: tk.ink }}>{f.nome}{ehInjetavel(f.via) && f.dose ? ` ${f.dose}` : ""}</span>
                </div>

                {/* Ativos (componentes do blend) */}
                {comps.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 4 }}>
                    {comps.map((cp, i) => (
                      <div key={cp.id} style={{
                        display: "flex", justifyContent: "space-between", gap: 8,
                        fontFamily: tk.mono, fontSize: 10, color: tk.ink,
                      }}>
                        <span>{String(i + 1).padStart(2, "0")} · {cp.nome || "—"}</span>
                        <span style={{ color: tk.inkMuted }}>{cp.dose}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Posologia · injetáveis agora no mesmo formato da VO (pedido Caio 31/05) */}
                {(f.via === "VO" || ehInjetavel(f.via)) ? (
                  <PrescricaoPreview s={f} cor={cf.dot} />
                ) : (
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, paddingLeft: 4 }}>
                    {f.dose} · {quantidadeResumo(f) ?? `${f.sessoes} ${f.sessoes > 1 ? "aplicações" : "aplicação"}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Painel + ADICIONAR · funil VIA → CATEGORIA → ATIVO (lista completa + busca)
// ───────────────────────────────────────────────────────────────────────
function PainelAdicionar({ cor, corLine, cands, addItem }: {
  cor: string; corLine: string; cands: Substancia[]; addItem: (s: Substancia) => void;
}) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<Categoria | null>(null);

  const categorias = useMemo(
    () => CATEGORIAS.filter(k => cands.some(s => s.categoria === k)),
    [cands],
  );
  const q = busca.trim().toLowerCase();
  const filtrados = cands.filter(s =>
    (!cat || s.categoria === cat) &&
    (!q || s.nome.toLowerCase().includes(q) || (s.detalhe || "").toLowerCase().includes(q)),
  );

  if (cands.length === 0) return null;

  const chip = (ativo: boolean): React.CSSProperties => ({
    fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
    padding: "3px 7px", cursor: "pointer", whiteSpace: "nowrap",
    background: ativo ? cor : tk.bg, color: ativo ? tk.bg : tk.inkMuted,
    border: `1px solid ${ativo ? cor : tk.border}`, transition: "all 0.12s",
  });

  return (
    <div style={{ padding: 8, borderTop: `1px solid ${tk.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>+ ADICIONAR</span>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>{filtrados.length}/{cands.length}</span>
      </div>

      {/* busca textual */}
      <input value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="buscar ativo…"
        style={{ ...inpBase, fontSize: 10, padding: "4px 7px", marginBottom: 6 }} />

      {/* nível 2 · categorias terapêuticas */}
      {categorias.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          <button onClick={() => setCat(null)} style={chip(cat === null)}>TODAS</button>
          {categorias.map(k => (
            <button key={k} onClick={() => setCat(cat === k ? null : k)} style={chip(cat === k)}>{k}</button>
          ))}
        </div>
      )}

      {/* nível 3 · lista completa rolável (sem teto) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 168, overflowY: "auto" }}>
        {filtrados.map(s => (
          <button key={s.id}
            onClick={() => addItem(s)}
            onMouseEnter={(e) => { e.currentTarget.style.outline = `1px solid ${cor}`; e.currentTarget.style.boxShadow = `0 0 6px ${corLine}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.outline = `1px solid ${tk.border}`; e.currentTarget.style.boxShadow = "none"; }}
            style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 4, alignItems: "center",
              padding: "4px 6px", background: tk.bg, color: tk.ink, border: "none",
              outline: `1px solid ${tk.border}`, outlineOffset: "-1px",
              cursor: "pointer", textAlign: "left", transition: "all 0.12s",
            }}>
            <span style={{ overflow: "hidden" }}>
              <span style={{ display: "block", fontSize: 10, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</span>
              <span style={{ display: "block", fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>{s.categoria || "—"} · {s.dose}</span>
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: cor, flexShrink: 0 }}>+</span>
          </button>
        ))}
        {filtrados.length === 0 && (
          <div style={{
            border: `1px dashed ${tk.borderStrong}`, padding: 8, textAlign: "center",
            fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1,
          }}>NADA ENCONTRADO</div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Modo TIMELINE: grid linha × coluna
// ───────────────────────────────────────────────────────────────────────

function Timeline({ sel, hoverItem, setHoverItem, update }: {
  sel: Substancia[];
  hoverItem: string | null;
  setHoverItem: (id: string | null) => void;
  update: (id: string, patch: Partial<Substancia>) => void;
}) {
  return (
    <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
          TIMELINE · CICLO 1 · {TOTAL_SESSOES} SESSÕES · SESSÃO ATUAL = S0{SESSAO_ATUAL}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {VIAS_ORDEM.map(v => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, background: tk.via[v].dot }} />
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Régua */}
      <div style={{
        display: "grid", gridTemplateColumns: `220px repeat(${TOTAL_SESSOES}, 1fr) 90px 80px`,
        gap: 3, marginBottom: 6,
      }}>
        <div />
        {Array.from({ length: TOTAL_SESSOES }).map((_, i) => {
          const n = i + 1;
          const atual = n === SESSAO_ATUAL;
          const passada = n < SESSAO_ATUAL;
          return (
            <div key={n} style={{
              textAlign: "center", fontFamily: tk.mono, fontSize: 9, padding: "4px 0",
              fontWeight: atual ? 700 : 500,
              color: atual ? tk.bg : passada ? tk.inkSubtle : tk.inkMuted,
              background: atual ? tk.accent : passada ? tk.bgSoft : tk.bg,
              border: `1px solid ${atual ? tk.accent : tk.border}`, letterSpacing: 1,
            }}>S{String(n).padStart(2, "0")}</div>
          );
        })}
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1, textAlign: "right", padding: "4px 0" }}>ÂNCORA</div>
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1, textAlign: "right", padding: "4px 0" }}>SUBTOTAL</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {sel.map(s => {
          const c = tk.via[s.via];
          const ocup = sessoesAtivas(s);
          const h = hoverItem === s.id;
          return (
            <div key={s.id}
              onMouseEnter={() => setHoverItem(s.id)}
              onMouseLeave={() => setHoverItem(null)}
              style={{
                display: "grid", gridTemplateColumns: `220px repeat(${TOTAL_SESSOES}, 1fr) 90px 80px`,
                gap: 3, alignItems: "center",
                background: h ? tk.bgSoft : tk.bg,
                padding: "4px 6px", border: `1px solid ${h ? c.dot : tk.border}`,
                borderLeft: `3px solid ${c.dot}`, transition: "all 0.12s",
                ...(h ? { boxShadow: `0 0 10px ${c.line}` } : {}),
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                <span style={{
                  fontFamily: tk.mono, fontSize: 8, fontWeight: 700, color: c.dot,
                  background: c.soft, padding: "2px 4px", border: `1px solid ${c.line}`,
                  minWidth: 26, textAlign: "center", flexShrink: 0,
                }}>{s.via}</span>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nome}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted }}>{s.dose} · {s.frequencia}</div>
                </div>
              </div>
              {ocup.map((on, i) => {
                const n = i + 1;
                const passada = n < SESSAO_ATUAL;
                return (
                  <div key={i} style={{
                    height: 22, position: "relative",
                    background: on ? (passada ? c.line : c.dot) : tk.bgAlt,
                    border: `1px solid ${tk.border}`,
                  }}>
                    {on && passada && (
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: tk.mono, fontSize: 9, color: tk.bg, fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                );
              })}
              <select
                value={s.ancora || "sem-ancora"}
                onChange={(e) => update(s.id, { ancora: e.target.value as Ancora })}
                style={{ ...inpBase, padding: "3px 4px", fontSize: 9 }}>
                {ANCORAS.map(a => <option key={a.v} value={a.v}>{a.lbl === "—" ? "sem âncora" : a.lbl}</option>)}
              </select>
              <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: c.dot, textAlign: "right" }}>
                {brl(s.preco * s.sessoes)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Action bar fixa rodapé
// ───────────────────────────────────────────────────────────────────────

function ActionBar({ total, sel, porVia }: {
  total: number; sel: Substancia[]; porVia: Record<Via, Substancia[]>;
}) {
  return (
    <footer style={{
      marginTop: "auto", background: tk.bgAlt, border: `1px solid ${tk.border}`,
      padding: "10px 16px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center",
    }}>
      <div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>TOTAL CONSOLIDADO</div>
        <div style={{ fontFamily: tk.mono, fontSize: 22, fontWeight: 700, color: tk.accent, lineHeight: 1.1 }}>{brl(total)}</div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
          {sel.length} substâncias · ciclo 1 de 8 sessões
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {VIAS_ORDEM.map(v => {
          const c = tk.via[v];
          const n = porVia[v].length;
          const sub = porVia[v].reduce((a, s) => a + s.preco * s.sessoes, 0);
          return (
            <div key={v} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 10px",
              background: tk.bg, borderLeft: `2px solid ${c.dot}`, opacity: n === 0 ? 0.4 : 1,
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: c.dot, letterSpacing: 1 }}>{v}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>{n}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ink }}>{brl(sub)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { lbl: "Cancelar",          cor: tk.inkSubtle, primary: false },
          { lbl: "Salvar Rascunho",   cor: tk.ink,       primary: false },
          { lbl: "Validar Médico →",  cor: tk.warn,      primary: false },
          { lbl: "Emitir Protocolo →", cor: tk.accent,    primary: true },
        ].map(b => (
          <button key={b.lbl} style={{
            fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            padding: "9px 14px", cursor: "pointer", color: b.primary ? tk.bg : b.cor,
            background: b.primary ? b.cor : "transparent",
            border: `1px solid ${b.cor}`, textTransform: "uppercase" as const,
            ...(b.primary ? { boxShadow: `0 0 12px ${tk.accentGlow}` } : {}),
          }}>{b.lbl}</button>
        ))}
      </div>
    </footer>
  );
}

// ───────────────────────────────────────────────────────────────────────
// 3º ANDAR · Editor de Blend (fórmula magistral expandida)
// ───────────────────────────────────────────────────────────────────────

function EditorBlend({ formula, update, onClose, selecionarFormula, carta, setCarta, todasFormulas }: {
  formula: Substancia;
  update: (patch: Partial<Substancia>) => void;
  onClose: () => void;
  selecionarFormula: (id: string) => void;
  carta: MatrizCartaEncantamento;
  setCarta: (c: MatrizCartaEncantamento) => void;
  todasFormulas: Substancia[];
}) {
  const c = tk.via[formula.via];
  const componentes = formula.componentes || [];
  // R2 · três modos: a fórmula SELECIONADA, VER TODAS (clicável) ou FOLHA (receita consolidada).
  const [modoVis, setModoVis] = useState<"SELECIONADA" | "TODAS" | "FOLHA">("SELECIONADA");

  const setComp = (idx: number, patch: Partial<ComponenteBlend>) => {
    const novo = componentes.map((c, i) => i === idx ? { ...c, ...patch } : c);
    update({ componentes: novo });
  };
  const addComp = () => {
    const novo = [...componentes, { id: `c${Date.now()}`, nome: "", dose: "" }];
    update({ componentes: novo });
  };
  const removeComp = (idx: number) => {
    update({ componentes: componentes.filter((_, i) => i !== idx) });
  };

  // R1 · tomadas (dose individualizada por período) também no 3º andar.
  const tomadas = tomadasDe(formula);
  const setTomadas = (arr: Tomada[]) => update({ tomadas: arr });
  const horariosTomadas = horariosDeTomadas(formula);
  const dosesDia = tomadas.reduce((a, t) => a + (t.doses || 0), 0);
  const dosesPeriodo = dosesDia * formula.sessoes;

  return (
    <section style={{
      background: tk.bgAlt, border: `1px solid ${c.dot}`,
      borderLeft: `4px solid ${c.dot}`, padding: 0,
      boxShadow: `0 0 16px ${c.line}`,
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", background: c.soft, borderBottom: `1px solid ${tk.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 2 }}>3º ANDAR · EDITOR DE BLEND</span>
          <span style={{
            fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: c.dot,
            padding: "2px 6px", background: tk.bg, border: `1px solid ${c.line}`, letterSpacing: 1,
          }}>{formula.via} · {formula.nome}</span>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
            {formula.detalhe} · {formula.sessoes} {formula.frequencia === "diária" ? "dias" : "ciclos"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* R2 · toggle de visualização · SELECIONADA / VER TODAS / FOLHA */}
          <div style={{ display: "flex", border: `1px solid ${tk.border}` }}>
            {(["SELECIONADA", "TODAS", "FOLHA"] as const).map((m, i, arr) => {
              const ativo = modoVis === m;
              const rotulo = m === "SELECIONADA" ? "SELECIONADA" : m === "TODAS" ? "VER TODAS" : "FOLHA";
              return (
                <button key={m} onClick={() => setModoVis(m)} style={{
                  fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1,
                  padding: "4px 8px", cursor: "pointer",
                  background: ativo ? c.dot : tk.bg, color: ativo ? tk.bg : tk.inkMuted,
                  border: "none", borderRight: i < arr.length - 1 ? `1px solid ${tk.border}` : "none",
                }}>{rotulo}</button>
              );
            })}
          </div>
          <button onClick={onClose} style={{
            background: "transparent", color: tk.inkMuted, border: `1px solid ${tk.border}`,
            fontFamily: tk.mono, fontSize: 9, cursor: "pointer", padding: "3px 8px", letterSpacing: 1,
          }}>FECHAR ×</button>
        </div>
      </div>

      {/* R2 · MODO VER TODAS · cada fórmula é clicável: emoldura + abre pra edição */}
      {modoVis === "TODAS" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
            TODAS AS FÓRMULAS A PRESCREVER · {todasFormulas.length} · clique pra editar
          </span>
          {todasFormulas.map(f => {
            const cf = tk.via[f.via];
            const atual = f.id === formula.id;
            return (
              <button key={f.id}
                onClick={() => { selecionarFormula(f.id); setModoVis("SELECIONADA"); }}
                aria-current={atual}
                title="Clique pra emoldurar e editar esta fórmula"
                style={{
                  textAlign: "left", cursor: "pointer", width: "100%",
                  background: atual ? cf.soft : tk.bg,
                  border: atual ? `1px solid ${cf.dot}` : `1px solid ${tk.border}`,
                  borderLeft: `3px solid ${cf.dot}`,
                  boxShadow: atual ? `0 0 10px ${cf.line}` : "none",
                  padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5,
                }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{
                    fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: cf.dot,
                    padding: "1px 6px", border: `1px solid ${cf.line}`, letterSpacing: 1,
                  }}>{f.via}</span>
                  <span style={{ fontFamily: tk.sans, fontSize: 12, fontWeight: 700, color: tk.ink }}>{f.nome}{ehInjetavel(f.via) && f.dose ? ` ${f.dose}` : ""}</span>
                  {atual && (
                    <span style={{ fontFamily: tk.mono, fontSize: 8, fontWeight: 700, color: cf.dot, letterSpacing: 1, marginLeft: "auto" }}>
                      EM EDIÇÃO
                    </span>
                  )}
                </div>
                {(f.via === "VO" || ehInjetavel(f.via)) ? (
                  <PrescricaoPreview s={f} cor={cf.dot} />
                ) : (
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted }}>
                    {f.dose} · {quantidadeResumo(f) ?? `${f.sessoes} ${f.sessoes > 1 ? "aplicações" : "aplicação"}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : modoVis === "FOLHA" ? (
        <FolhaConsolidada todasFormulas={todasFormulas} />
      ) : (
      /* MODO SELECIONADA · 2 colunas: substâncias do blend + tomadas */
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, padding: 14 }}>

        {/* COLUNA 1 · substâncias do blend (linhas editáveis) */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              SUBSTÂNCIAS DO BLEND · {componentes.length} linhas
            </span>
            <button onClick={addComp} style={{
              background: "transparent", color: c.dot, border: `1px solid ${c.line}`,
              fontFamily: tk.mono, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "3px 8px", letterSpacing: 1,
            }}>+ LINHA</button>
          </div>

          {/* Cabeçalho da tabela de componentes */}
          <div style={{
            display: "grid", gridTemplateColumns: "28px 1fr 100px 22px", gap: 6,
            padding: "4px 0", borderBottom: `1px solid ${tk.border}`,
            fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5,
          }}>
            <span>#</span><span>SUBSTÂNCIA</span><span>DOSE</span><span></span>
          </div>

          {/* Linhas editáveis */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {componentes.map((comp, i) => (
              <div key={comp.id} style={{
                display: "grid", gridTemplateColumns: "28px 1fr 100px 22px", gap: 6,
                padding: "4px 0", borderBottom: `1px dashed ${tk.border}`, alignItems: "center",
              }}>
                <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, textAlign: "center" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input value={comp.nome}
                  onChange={(e) => setComp(i, { nome: e.target.value })}
                  placeholder="Nome da substância"
                  style={{ ...inpBase, fontSize: 11, fontFamily: tk.sans }} />
                <input value={comp.dose}
                  onChange={(e) => setComp(i, { dose: e.target.value })}
                  placeholder="ex: 25 mg"
                  style={{ ...inpBase, textAlign: "right" }} />
                <button onClick={() => removeComp(i)} style={{
                  background: "transparent", color: tk.inkSubtle, border: "none",
                  fontFamily: tk.mono, fontSize: 12, cursor: "pointer", padding: 0,
                }}>×</button>
              </div>
            ))}
            {componentes.length === 0 && (
              <div style={{
                border: `1px dashed ${tk.borderStrong}`, padding: 14, textAlign: "center",
                fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1, marginTop: 6,
              }}>NENHUMA SUBSTÂNCIA · CLIQUE EM “+ LINHA”</div>
            )}
          </div>

          {/* Última linha fixa: VIA DE ADMINISTRAÇÃO */}
          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: tk.bg, border: `1px solid ${c.dot}`, borderLeft: `3px solid ${c.dot}`,
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
          }}>
            <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              VIA DE ADMINISTRAÇÃO
            </span>
            <select value={formula.via}
              onChange={(e) => update({ via: e.target.value as Via })}
              style={{ ...inpBase, fontSize: 11, fontWeight: 700, color: c.dot }}>
              {(Object.keys(VIA_META) as Via[]).map(v => (
                <option key={v} value={v}>{v} · {VIA_META[v].titulo}</option>
              ))}
            </select>
            <span style={{
              fontFamily: tk.mono, fontSize: 9, color: c.dot,
              padding: "3px 8px", background: c.soft, border: `1px solid ${c.line}`, letterSpacing: 1,
            }}>{VIA_META[formula.via].sub}</span>
          </div>
        </div>

        {/* COLUNA 2 · horários TDAH/TOC-friendly */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              TOMADAS · dose por período
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: c.dot }}>
              {dosesDia} dose{dosesDia !== 1 ? "s" : ""}/dia
            </span>
          </div>

          {/* R1 · TomadasEditor (horário primeiro · período AUTO · dose por período · obs por tomada) */}
          <div style={{ marginBottom: 10 }}>
            <TomadasEditor tomadas={tomadas} setTomadas={setTomadas} cor={c.dot} line={c.line} />
          </div>

          {/* Resumo do esquema */}
          <div style={{
            padding: 10, background: tk.bg, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${c.dot}`,
          }}>
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>
              ESQUEMA RESULTANTE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>DOSES/DIA</div>
                <div style={{ fontFamily: tk.mono, fontSize: 16, fontWeight: 700, color: c.dot }}>{dosesDia}</div>
              </div>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>TOTAL NO PERÍODO</div>
                <div style={{ fontFamily: tk.mono, fontSize: 16, fontWeight: 700, color: c.dot }}>{dosesPeriodo}</div>
              </div>
            </div>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 8, lineHeight: 1.5 }}>
              <span style={{ color: c.dot }}>→</span> {dosesDia === 0 ? "(adicione ao menos 1 tomada)" :
                `${tomadas.map(t => {
                  const p = periodoResolvido(t);
                  const h = horaCurta(t.horario);
                  return p ? `${p.sigla}${h ? ` ${h}` : ""}` : (h ?? "—");
                }).join(" · ")} durante ${formula.sessoes} ${formula.frequencia === "diária" ? "dias" : "ciclos"}`}
            </div>
          </div>

          {/* MOTOR DE MENSAGERIA · 1 disparo por período (derivado das tomadas) */}
          <MapeamentoMensageria horarios={horariosTomadas} corVia={c.dot} />

          {/* CARTA DE ENCANTAMENTO · matriz períodos × cenários (estado lifted no GpsPadua) */}
          <CartaEncantamentoMatriz horarios={horariosTomadas} carta={carta} setCarta={setCarta} />
        </div>
      </div>
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Mapeamento horários → períodos cronobiológicos (Beatriz · WhatsApp)
// ───────────────────────────────────────────────────────────────────────
function MapeamentoMensageria({ horarios, corVia }: { horarios: string[]; corVia: string }) {
  const grupos = new Map<string, { p: typeof PERIODOS_DIA[number]; horarios: string[] }>();
  for (const h of horarios) {
    const p = horarioParaPeriodo(h);
    if (!p) continue;
    if (!grupos.has(p.sigla)) grupos.set(p.sigla, { p, horarios: [] });
    grupos.get(p.sigla)!.horarios.push(h);
  }
  const lista = Array.from(grupos.values()).sort((a, b) => a.p.janela_inicio.localeCompare(b.p.janela_inicio));

  return (
    <div style={{ marginTop: 8, padding: 10, background: tk.bg, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>
          ▶ MOTOR DE MENSAGERIA · whatsapp via Beatriz Romanov
        </span>
        <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.accent }}>
          {lista.length} mensagem{lista.length !== 1 ? "s" : ""}/dia
        </span>
      </div>
      {lista.length === 0 ? (
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
          (selecione horários pra ver quais períodos disparam)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {lista.map(g => (
            <div key={g.p.sigla} style={{
              display: "grid", gridTemplateColumns: "auto 28px auto 1fr auto", gap: 6,
              alignItems: "center", padding: "3px 6px",
              background: tk.bgAlt, borderLeft: `2px solid ${g.p.cor_primary}`,
            }}>
              <span style={{ fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: g.p.cor_primary, letterSpacing: 1 }}>{g.p.sigla}</span>
              <span style={{ fontSize: 12 }}>{g.p.emoji}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>{g.p.nome}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.ink }}>{g.horarios.join(" + ")}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: g.p.cor_primary, padding: "1px 5px", border: `1px solid ${g.p.cor_primary}55`, letterSpacing: 1 }}>1 PING</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 6, lineHeight: 1.4 }}>
        regra: múltiplos horários no mesmo período = <span style={{ color: corVia }}>1 única mensagem</span> listando todas as fórmulas. paciente empresário não é incomodado a toda hora.
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// CARTA DE ENCANTAMENTO · matriz períodos × cenários (toggle por paciente)
// Conceito Caio 19/05: 1 placeholder {CARTA_ENCANTAMENTO} no template do teatro,
// mas controlado AQUI no GPS por matriz pra evitar "pesadelo de repetição".
// ───────────────────────────────────────────────────────────────────────
function CartaEncantamentoMatriz({ horarios, carta, setCarta }: {
  horarios: string[];
  carta: MatrizCartaEncantamento;
  setCarta: (c: MatrizCartaEncantamento) => void;
}) {
  const { ativo, texto, dataInicio, dataFim, matriz } = carta;
  const setAtivo = (v: boolean) => setCarta({ ...carta, ativo: v });
  const setTexto = (v: string) => setCarta({ ...carta, texto: v });
  const setDataInicio = (v: string) => setCarta({ ...carta, dataInicio: v });
  const setDataFim = (v: string) => setCarta({ ...carta, dataFim: v });

  // só mostra períodos que têm dose marcada (foco TDAH)
  const periodosUtilizados = useMemo(() => {
    const set = new Set<string>();
    for (const h of horarios) { const p = horarioParaPeriodo(h); if (p) set.add(p.sigla); }
    return PERIODOS_DIA.filter(p => set.has(p.sigla));
  }, [horarios]);

  function toggle(sigla: string, cen: CenarioId) {
    setCarta({
      ...carta,
      matriz: { ...matriz, [sigla]: { ...matriz[sigla], [cen]: !matriz[sigla][cen] } },
    });
  }

  const totalDisparos = useMemo(() => {
    let n = 0;
    for (const p of Object.values(matriz)) for (const v of Object.values(p)) if (v) n++;
    return n;
  }, [matriz]);

  return (
    <div style={{ marginTop: 8, padding: 10, background: tk.bg, border: `1px solid #E8A5D855`, borderLeft: `3px solid #E8A5D8` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#E8A5D8", letterSpacing: 1.5 }}>
          ✨ CARTA DE ENCANTAMENTO · placeholder {`{CARTA_ENCANTAMENTO}`} injetado por matriz
        </span>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: tk.mono, fontSize: 9, color: tk.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} style={{ accentColor: "#E8A5D8" }} />
          {ativo ? "ATIVA" : "DESLIGADA"}
        </label>
      </div>

      <textarea value={texto} onChange={e => setTexto(e.target.value)} disabled={!ativo} placeholder='ex: "o dia da grande bênção está chegando 👶"'
        style={{
          width: "100%", minHeight: 50, background: tk.bgAlt, color: tk.ink,
          border: `1px solid ${ativo ? "#E8A5D855" : tk.border}`, padding: 8,
          fontFamily: "Georgia, serif", fontSize: 11, fontStyle: "italic", resize: "vertical",
          opacity: ativo ? 1 : 0.4, outline: "none",
        }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>JANELA · DATA INÍCIO</span>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={!ativo}
            style={{ background: tk.bgAlt, color: tk.ink, border: `1px solid ${tk.border}`, padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, opacity: ativo ? 1 : 0.4 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1 }}>JANELA · DATA FIM</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} disabled={!ativo}
            style={{ background: tk.bgAlt, color: tk.ink, border: `1px solid ${tk.border}`, padding: "4px 6px", fontFamily: tk.mono, fontSize: 10, opacity: ativo ? 1 : 0.4 }} />
        </label>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>
          ▶ MATRIZ DE INJEÇÃO · marque ONDE a frase deve aparecer (períodos × cenários). Total: <strong style={{ color: "#E8A5D8" }}>{totalDisparos}</strong> injeções/dia
        </div>
        {periodosUtilizados.length === 0 ? (
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, padding: 6 }}>
            (marque horários acima pra liberar a matriz)
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: tk.mono, fontSize: 8, opacity: ativo ? 1 : 0.4 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px", color: tk.inkSubtle, borderBottom: `1px solid ${tk.border}`, letterSpacing: 1 }}>PERÍODO</th>
                  {CENARIOS.map(c => (
                    <th key={c.id} style={{ textAlign: "center", padding: "4px 6px", color: c.cor_primary, borderBottom: `1px solid ${tk.border}`, fontSize: 8, letterSpacing: 1 }}>
                      {c.emoji}<br />{c.nome.split(" ")[0].toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodosUtilizados.map(p => (
                  <tr key={p.sigla}>
                    <td style={{ padding: "5px 6px", color: tk.ink, borderBottom: `1px solid ${tk.border}`, borderLeft: `2px solid ${p.cor_primary}` }}>
                      <strong style={{ color: p.cor_primary }}>{p.sigla}</strong> {p.emoji} {p.nome} <span style={{ color: tk.inkSubtle }}>{p.janela_inicio}</span>
                    </td>
                    {CENARIOS.map(c => (
                      <td key={c.id} style={{ padding: "5px 6px", textAlign: "center", borderBottom: `1px solid ${tk.border}` }}>
                        <input type="checkbox" checked={matriz[p.sigla]?.[c.id] ?? false}
                          onChange={() => ativo && toggle(p.sigla, c.id)} disabled={!ativo}
                          aria-label={`Injetar carta de encantamento no período ${p.sigla} (${p.nome}) para cenário ${c.nome}`}
                          style={{ accentColor: c.cor_primary, cursor: ativo ? "pointer" : "not-allowed" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 8, lineHeight: 1.4 }}>
        <span style={{ color: "#E8A5D8" }}>regra Caio (19/05):</span> a carta encanta sem cansar. marque só os cruzamentos
        certos pra evitar repetir a mesma frase 9× ao dia. salvo em <code style={{ color: tk.accent }}>pacientes.carta_encantamento</code> (jsonb).
      </div>
    </div>
  );
}
