import { useMemo, useState } from "react";

type Face = "claro" | "escuro";

type Tema = {
  bg: string; bg2: string; bg3: string; bg4: string;
  border: string;
  t1: string; t2: string; t3: string;
  accent: string; glow: string;
  ok: string; warn: string; danger: string;
  presc: string; fatur: string; juri: string;
  neon: string;
};

const TEMA: Record<Face, Tema> = {
  claro: {
    bg: "#EEF2F4", bg2: "#F8FBFC", bg3: "#E2E8EC", bg4: "#D2DCE0",
    border: "#B8C4CA",
    t1: "#0F1A1F", t2: "#3F5258", t3: "#6E8088",
    accent: "#1E7A6E", glow: "rgba(30,122,110,0.45)",
    ok: "#1E7A6E", warn: "#9C6E16", danger: "#8A2A2A",
    presc: "#5A4A82", fatur: "#2A9D8F", juri: "#7A5A2A",
    neon: "#2A9D8F",
  },
  escuro: {
    bg: "#020A14", bg2: "#061824", bg3: "#0A2030", bg4: "#0E2838",
    border: "#1A3848",
    t1: "#D8EEEE", t2: "#88B8BE", t3: "#557A82",
    accent: "#5FE6CC", glow: "rgba(95,230,204,0.55)",
    ok: "#5FE6CC", warn: "#FFD27A", danger: "#D08A8A",
    presc: "#A89DFF", fatur: "#5EE6E6", juri: "#FFD27A",
    neon: "#5EE6E6",
  },
};

type Modo = "PREMIUM" | "SIMPLES" | "JURIDICO";
type Classe = "INJETAVEL" | "MANIPULADO";

type Ativo = {
  id: string;
  nome: string;
  dose: string;
  via: string;
  classe: Classe;
  sessoesDefault: number;
  freq: string;
  justificativa: string;
  valorUnit: number;
};

const CATALOGO: Ativo[] = [
  { id: "a1", nome: "Glutationa", dose: "600 mg", via: "Endovenosa", classe: "INJETAVEL", sessoesDefault: 8, freq: "1x por semana", justificativa: "Suporte antioxidante hepático.", valorUnit: 250 },
  { id: "a2", nome: "Vitamina C", dose: "5 g", via: "Endovenosa", classe: "INJETAVEL", sessoesDefault: 8, freq: "1x por semana", justificativa: "Modulação imunológica.", valorUnit: 110 },
  { id: "a3", nome: "Ácido Tióctico (Alfa-lipóico)", dose: "600 mg", via: "Endovenosa", classe: "INJETAVEL", sessoesDefault: 6, freq: "1x por semana", justificativa: "Antioxidante e suporte metabólico.", valorUnit: 180 },
  { id: "a4", nome: "Complexo B", dose: "2 mL", via: "Intramuscular", classe: "INJETAVEL", sessoesDefault: 8, freq: "1x por semana", justificativa: "Reposição de vitaminas do complexo B.", valorUnit: 90 },
  { id: "a5", nome: "Implante de Gestrinona", dose: "1 unidade", via: "Subcutânea", classe: "INJETAVEL", sessoesDefault: 1, freq: "Dose única (6 meses)", justificativa: "Implante de liberação prolongada.", valorUnit: 2400 },
  { id: "m1", nome: "Silimarina", dose: "300 mg", via: "Oral", classe: "MANIPULADO", sessoesDefault: 60, freq: "1x ao dia (manhã)", justificativa: "Hepatoprotetor.", valorUnit: 2 },
  { id: "m2", nome: "Berberina", dose: "500 mg", via: "Oral", classe: "MANIPULADO", sessoesDefault: 60, freq: "2x ao dia (refeições)", justificativa: "Suporte glicêmico.", valorUnit: 3 },
  { id: "m3", nome: "Melatonina", dose: "3 mg", via: "Sublingual", classe: "MANIPULADO", sessoesDefault: 30, freq: "1x ao dia (ao deitar)", justificativa: "Regulação do sono.", valorUnit: 2 },
  { id: "m4", nome: "Ácido Clorídrico (Betaína HCl)", dose: "10 gotas", via: "Oral", classe: "MANIPULADO", sessoesDefault: 30, freq: "Antes das refeições", justificativa: "Suporte digestivo.", valorUnit: 1 },
];

const PACIENTES = [
  { id: "p1", nome: "Exemplo · Ana Beatriz Moraes", codigo: "PAD-0142" },
  { id: "p2", nome: "Exemplo · Carlos Eduardo Lima", codigo: "PAD-0098" },
  { id: "p3", nome: "Exemplo · Daniela Souza Rocha", codigo: "PAD-0211" },
];

const HONORARIOS = 600;

/** Casamento via -> consentimento específico (espelha consentimento_especifico do motor). */
type Consentimento = { codigo: string; titulo: string; base: string; texto: string };

function consentimentoDaVia(via: string): Consentimento | null {
  const v = via.toLowerCase();
  if (v.includes("endoven")) {
    return { codigo: "CEND", titulo: "CONSENTIMENTO — APLICAÇÕES ENDOVENOSAS", base: "Resolução CFM 2.217/2018 (Código de Ética Médica)",
      texto: "Declaro estar ciente de que a aplicação endovenosa pode causar reações locais (dor, hematoma, flebite) e, raramente, reações sistêmicas. Consinto com o procedimento descrito neste documento." };
  }
  if (v.includes("intramus")) {
    return { codigo: "CIMU", titulo: "CONSENTIMENTO — APLICAÇÕES INTRAMUSCULARES", base: "Resolução CFM 2.217/2018 (Código de Ética Médica)",
      texto: "Declaro estar ciente de que a aplicação intramuscular pode causar dor, hematoma ou reação local, e consinto com o procedimento descrito neste documento." };
  }
  if (v.includes("subcut")) {
    return { codigo: "CSUB", titulo: "CONSENTIMENTO — IMPLANTE SUBCUTÂNEO DE LIBERAÇÃO PROLONGADA", base: "Resolução CFM 2.217/2018 + bula do composto",
      texto: "Declaro estar ciente de que o implante subcutâneo libera a substância de forma prolongada, que pode haver reação no local de inserção e que a remoção precoce nem sempre é possível. Consinto com o procedimento." };
  }
  if (v.includes("oral") || v.includes("sublin")) {
    return { codigo: "CFOR", titulo: "CONSENTIMENTO — FÓRMULAS MANIPULADAS", base: "RDC 67/2007 ANVISA + Resolução CFM 1.974/2011",
      texto: "Declaro estar ciente de que a fórmula manipulada é preparada individualmente para mim, deve ser usada conforme a posologia prescrita, e que efeitos podem variar entre pessoas. Consinto com o uso descrito neste documento." };
  }
  return null;
}

/** Blocos jurídicos fixos do RAS_JURIDICO (espelha CATEGORIAS_RAS_JURIDICO do motor). */
const BLOCO_TCLE = {
  codigo: "TCLE",
  titulo: "TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (GLOBAL)",
  texto: "Declaro que fui esclarecido(a) sobre os objetivos, a natureza e as alternativas do tratamento proposto, tive oportunidade de tirar dúvidas e consinto de forma livre com a sua realização.",
};
const BLOCO_NAO_GARANTIA = {
  codigo: "NGAR",
  titulo: "CLÁUSULA DE NÃO-GARANTIA DE RESULTADO",
  texto: "Estou ciente de que a medicina é uma obrigação de meio e não de resultado, e que nenhum resultado específico foi prometido ou garantido.",
};
const BLOCO_FINANCEIRO = {
  codigo: "CFIN",
  titulo: "CIÊNCIA FINANCEIRA",
  texto: "Declaro estar ciente dos valores do tratamento, da condição de pagamento contratada e de que itens adicionais podem gerar custos não incluídos neste documento.",
};

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const css = `
.rc-scope, .rc-scope * {
  box-sizing: border-box;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
}
.rc-num { font-variant-numeric: tabular-nums; }
@keyframes rc-respira {
  0%, 100% { box-shadow: inset 0 0 0 1px var(--neon), 0 0 5px var(--glow); }
  50%      { box-shadow: inset 0 0 0 1px var(--neon), 0 0 16px var(--glow); }
}
.rc-respira { animation: rc-respira 4s ease-in-out infinite; }
.rc-item { position: relative; isolation: isolate; transition: color .15s ease; }
.rc-item::before { content:""; position:absolute; inset:0; z-index:-1; box-shadow:0 0 0 0 transparent; transition: box-shadow .18s ease; }
.rc-item:hover::before { box-shadow: 0 0 14px 2px var(--glow); }
.rc-btn { position: relative; isolation: isolate; cursor: pointer; transition: color .15s ease; }
.rc-btn::before { content:""; position:absolute; inset:0; z-index:-1; transition: box-shadow .18s ease; }
.rc-btn:hover::before { box-shadow: 0 0 16px 2px var(--glow); }
.rc-scope input:focus-visible, .rc-btn:focus-visible { outline: 2px solid var(--neon); outline-offset: 1px; }
`;

type ItemProtocolo = Ativo & { sessoes: number };

export function RasCockpit() {
  const [face, setFace] = useState<Face>("claro");
  const [modo, setModo] = useState<Modo>("JURIDICO");
  const [selId, setSelId] = useState<string>(PACIENTES[0].id);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"TODOS" | Classe>("TODOS");
  const [protocolo, setProtocolo] = useState<ItemProtocolo[]>([
    { ...CATALOGO[0], sessoes: CATALOGO[0].sessoesDefault },
    { ...CATALOGO[3], sessoes: CATALOGO[3].sessoesDefault },
    { ...CATALOGO[5], sessoes: CATALOGO[5].sessoesDefault },
  ]);
  const t = TEMA[face];

  const sel = PACIENTES.find((p) => p.id === selId) ?? PACIENTES[0];

  const catalogoFiltrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return CATALOGO.filter((a) => {
      if (filtro !== "TODOS" && a.classe !== filtro) return false;
      if (!q) return true;
      return (a.nome + " " + a.via + " " + a.dose).toLowerCase().includes(q);
    });
  }, [busca, filtro]);

  const totalItens = useMemo(
    () => protocolo.reduce((a, it) => a + it.valorUnit * it.sessoes, 0),
    [protocolo],
  );
  const totalGeral = totalItens + HONORARIOS;

  const viasUsadas = useMemo(() => {
    const set: string[] = [];
    for (const it of protocolo) if (set.indexOf(it.via) === -1) set.push(it.via);
    return set;
  }, [protocolo]);

  const consentimentos = useMemo(() => {
    return viasUsadas.map((v) => ({ via: v, c: consentimentoDaVia(v) }));
  }, [viasUsadas]);

  const naoResolvidos = consentimentos.filter((x) => x.c === null).map((x) => x.via);

  function adicionar(a: Ativo) {
    setProtocolo((p) => (p.some((x) => x.id === a.id) ? p : [...p, { ...a, sessoes: a.sessoesDefault }]));
  }
  function remover(id: string) {
    setProtocolo((p) => p.filter((x) => x.id !== id));
  }
  function setSessoes(id: string, n: number) {
    setProtocolo((p) => p.map((x) => (x.id === id ? { ...x, sessoes: Math.max(1, n) } : x)));
  }

  const LABEL: React.CSSProperties = { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.t3 };
  const premium = modo === "PREMIUM";
  const juridico = modo === "JURIDICO";

  return (
    <div
      className="rc-scope"
      style={{
        // @ts-expect-error css var
        "--neon": t.neon, "--glow": t.glow,
        minHeight: "100vh", background: t.bg, color: t.t1,
        filter: "brightness(0.99) saturate(0.97) contrast(1.16)",
        display: "flex", flexDirection: "column",
      }}
    >
      <style>{css}</style>

      {/* FAIXA 1 */}
      <div style={{ height: 40, background: t.bg2, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 16, padding: "0 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: t.accent }}>PACTOR</span>
        <span style={{ width: 1, height: 18, background: t.border }} />
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: t.t2 }}>INSTITUTO PÁDUA</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
          {(["claro", "escuro"] as Face[]).map((f) => (
            <button key={f} onClick={() => setFace(f)} className="rc-btn"
              style={{ background: face === f ? t.accent : "transparent", color: face === f ? t.bg2 : t.t3, border: "none", padding: "5px 12px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
        </div>
        <span style={{ width: 1, height: 18, background: t.border }} />
        <span style={{ fontSize: 10, letterSpacing: "0.10em", color: t.t2 }}>CLÍNICO RESPONSÁVEL</span>
      </div>

      {/* FAIXA 2 — breadcrumb */}
      <div style={{ height: 32, background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
        <span style={LABEL}>PACTOR</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={LABEL}>INSTITUTO PÁDUA</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={{ ...LABEL, color: t.accent }}>COCKPIT · PACIENTE → PROTOCOLO → RAS</span>
      </div>

      {/* CORPO */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "240px 1fr 420px", minHeight: 0 }}>

        {/* RAIL — pacientes */}
        <div style={{ borderRight: `1px solid ${t.border}`, background: t.bg, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${t.border}`, ...LABEL }}>PACIENTE</div>
          <div style={{ overflowY: "auto", minHeight: 0 }}>
            {PACIENTES.map((p) => {
              const ativo = p.id === selId;
              return (
                <button key={p.id} onClick={() => setSelId(p.id)} className="rc-item"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", background: ativo ? t.bg3 : "transparent", borderBottom: `1px solid ${t.border}`, borderLeft: `3px solid ${ativo ? t.accent : "transparent"}`, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: t.t1, fontWeight: ativo ? 700 : 400 }}>{p.nome}</span>
                  <span className="rc-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>{p.codigo}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTRO — catálogo + protocolo */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: `1px solid ${t.border}` }}>
          {/* busca */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 4, height: 18, background: t.presc }} />
            <span style={{ fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>CATÁLOGO DE ATIVOS</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", border: `1px solid ${t.border}`, background: t.bg2, padding: "0 8px", width: 220 }}>
              <span style={{ color: t.t3, fontSize: 12 }}>⌕</span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar ativo, via, dose..." aria-label="Buscar ativo no catálogo"
                style={{ flex: 1, border: "none", background: "transparent", color: t.t1, fontSize: 11, padding: "6px 6px" }} />
            </div>
          </div>

          {/* filtros classe */}
          <div style={{ padding: "8px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 6 }}>
            {(["TODOS", "INJETAVEL", "MANIPULADO"] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)} className="rc-btn"
                style={{ background: filtro === f ? t.bg3 : "transparent", color: filtro === f ? t.accent : t.t3, border: `1px solid ${filtro === f ? t.accent : t.border}`, padding: "4px 10px", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {f === "INJETAVEL" ? "INJETÁVEIS" : f === "MANIPULADO" ? "MANIPULADOS" : "TODOS"}
              </button>
            ))}
          </div>

          {/* lista catálogo */}
          <div style={{ maxHeight: 220, overflowY: "auto", borderBottom: `1px solid ${t.border}` }}>
            {catalogoFiltrado.map((a) => {
              const jaTem = protocolo.some((x) => x.id === a.id);
              return (
                <div key={a.id} className="rc-item" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 1fr 0.6fr 0.8fr", gap: 8, alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: 12, color: t.t1 }}>{a.nome}</span>
                  <span className="rc-num" style={{ fontSize: 11, color: t.t2 }}>{a.dose}</span>
                  <span style={{ fontSize: 10, color: t.t2, textTransform: "uppercase" }}>{a.via}</span>
                  <span className="rc-num" style={{ fontSize: 11, color: t.t3, textAlign: "right" }}>{formatBRL(a.valorUnit)}</span>
                  <button onClick={() => adicionar(a)} disabled={jaTem} className="rc-btn"
                    style={{ background: jaTem ? "transparent" : t.accent, color: jaTem ? t.t3 : t.bg2, border: `1px solid ${jaTem ? t.border : t.accent}`, padding: "4px 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", cursor: jaTem ? "default" : "pointer" }}>
                    {jaTem ? "NO PROTOCOLO" : "+ ADICIONAR"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* protocolo montado + toggle modo */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 4, height: 18, background: t.accent }} />
            <span style={{ fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>PROTOCOLO DE {sel.nome.replace("Exemplo · ", "").toUpperCase()}</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
              {(["PREMIUM", "SIMPLES", "JURIDICO"] as Modo[]).map((m) => (
                <button key={m} onClick={() => setModo(m)} className="rc-btn"
                  style={{ background: modo === m ? (m === "JURIDICO" ? t.juri : t.presc) : "transparent", color: modo === m ? t.bg2 : t.t3, border: "none", padding: "5px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                  {m === "JURIDICO" ? "RAS JURÍDICO" : "RAS " + m}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {protocolo.length === 0 && (
              <div style={{ border: `1px dashed ${t.border}`, padding: "20px 16px", textAlign: "center", color: t.t3, fontSize: 11 }}>
                NENHUM ATIVO NO PROTOCOLO — ADICIONE PELO CATÁLOGO ACIMA
              </div>
            )}
            {protocolo.map((it) => {
              const c = consentimentoDaVia(it.via);
              return (
                <div key={it.id} className="rc-item" style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, borderLeft: `3px solid ${it.classe === "INJETAVEL" ? t.fatur : t.presc}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.t1 }}>{it.nome}</span>
                    <span className="rc-num" style={{ fontSize: 11, color: t.t2 }}>{it.dose}</span>
                    <span style={{ fontSize: 9, color: t.t2, textTransform: "uppercase", border: `1px solid ${t.border}`, padding: "1px 6px" }}>{it.via}</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => remover(it.id)} className="rc-btn" style={{ background: "transparent", color: t.danger, border: `1px solid ${t.border}`, padding: "3px 8px", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase" }}>REMOVER</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={LABEL}>SESSÕES</span>
                      <button onClick={() => setSessoes(it.id, it.sessoes - 1)} className="rc-btn" style={{ background: t.bg3, color: t.t1, border: `1px solid ${t.border}`, width: 22, height: 22, fontSize: 13 }}>−</button>
                      <span className="rc-num" style={{ fontSize: 13, color: t.t1, minWidth: 28, textAlign: "center" }}>{it.sessoes}</span>
                      <button onClick={() => setSessoes(it.id, it.sessoes + 1)} className="rc-btn" style={{ background: t.bg3, color: t.t1, border: `1px solid ${t.border}`, width: 22, height: 22, fontSize: 13 }}>+</button>
                    </div>
                    <span style={{ fontSize: 10, color: t.t3 }}>{it.freq}</span>
                    <div style={{ flex: 1 }} />
                    <span className="rc-num" style={{ fontSize: 13, color: t.t1 }}>{formatBRL(it.valorUnit * it.sessoes)}</span>
                  </div>
                  {juridico && (
                    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, color: t.juri, letterSpacing: "0.10em" }}>JURÍDICO CASADO →</span>
                      {c ? (
                        <span style={{ fontSize: 10, color: t.t2 }}>
                          <span style={{ color: t.juri, fontWeight: 700 }}>{c.codigo}</span> · {c.titulo}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: t.danger, fontWeight: 700 }}>[FALTA: consentimento para via "{it.via}"]</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DIREITA — PREVIEW DOCUMENTO */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: t.bg }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 4, height: 18, background: juridico ? t.juri : t.fatur }} />
            <span style={{ fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>
              PRÉVIA · {juridico ? "RAS JURÍDICO" : "RAS " + modo}
            </span>
          </div>

          <div style={{ overflowY: "auto", minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* cabeçalho documento */}
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "10px 12px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.t1 }}>{sel.nome}</div>
              <div className="rc-num" style={{ fontSize: 10, color: t.t3, letterSpacing: "0.08em" }}>{sel.codigo} · EMISSÃO 13/06/2026 · INSTITUTO PÁDUA</div>
            </div>

            {/* tabela de ativos (todos os modos) */}
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
              <div style={{ padding: "6px 12px", borderBottom: `1px solid ${t.border}`, ...LABEL, color: t.presc }}>ITENS DO TRATAMENTO</div>
              {protocolo.map((it, i) => (
                <div key={it.id} className="rc-item" style={{ padding: "8px 12px", borderBottom: i < protocolo.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: t.t1 }}>{it.nome} {premium && <span style={{ color: t.t3 }}>· {it.dose}</span>}</span>
                    <span className="rc-num" style={{ fontSize: 12, color: t.t1 }}>{formatBRL(it.valorUnit * it.sessoes)}</span>
                  </div>
                  <div style={{ fontSize: 9, color: t.t3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {it.via} · {it.sessoes} {it.sessoes > 1 ? "sessões/doses" : "dose"}{premium ? " · " + it.freq : ""}
                  </div>
                  {premium && <div style={{ fontSize: 9, color: t.t3, marginTop: 2 }}>JUSTIFICATIVA: {it.justificativa}</div>}
                </div>
              ))}
            </div>

            {/* financeiro */}
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
              {[
                { k: "ITENS", v: formatBRL(totalItens), forte: false },
                { k: "HONORÁRIOS", v: formatBRL(HONORARIOS), forte: false },
                { k: "TOTAL GERAL", v: formatBRL(totalGeral), forte: true },
              ].map((l, i) => (
                <div key={l.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: i ? `1px solid ${t.border}` : "none", background: l.forte ? t.bg3 : "transparent" }}>
                  <span style={{ ...LABEL, color: l.forte ? t.t2 : t.t3 }}>{l.k}</span>
                  <span className="rc-num" style={{ fontSize: l.forte ? 16 : 12, fontWeight: l.forte ? 700 : 400, color: l.forte ? t.fatur : t.t1 }}>{l.v}</span>
                </div>
              ))}
            </div>

            {/* BLOCOS JURÍDICOS — só no modo jurídico */}
            {juridico && (
              <>
                {naoResolvidos.length > 0 && (
                  <div style={{ border: `1px solid ${t.danger}`, background: t.bg2, padding: "8px 12px", color: t.danger, fontSize: 10, letterSpacing: "0.04em" }}>
                    FAIL-CLOSED · {naoResolvidos.length} VIA(S) SEM CONSENTIMENTO CADASTRADO: {naoResolvidos.join(", ")}. O DOCUMENTO NÃO É EMITIDO ATÉ RESOLVER.
                  </div>
                )}

                {/* TCLE global */}
                <BlocoJuridico t={t} codigo={BLOCO_TCLE.codigo} titulo={BLOCO_TCLE.titulo} texto={BLOCO_TCLE.texto} />

                {/* consentimentos específicos casados às vias */}
                {consentimentos.map(({ via, c }) =>
                  c ? (
                    <BlocoJuridico key={via} t={t} codigo={c.codigo} titulo={c.titulo} texto={c.texto} base={c.base} aplicaA={via} itens={protocolo.filter((it) => it.via === via).map((it) => it.nome)} />
                  ) : (
                    <div key={via} style={{ border: `1px solid ${t.danger}`, background: t.bg2, padding: "8px 12px", color: t.danger, fontSize: 11, fontWeight: 700 }}>
                      [FALTA: consentimento específico para via "{via}"]
                    </div>
                  ),
                )}

                <BlocoJuridico t={t} codigo={BLOCO_NAO_GARANTIA.codigo} titulo={BLOCO_NAO_GARANTIA.titulo} texto={BLOCO_NAO_GARANTIA.texto} />
                <BlocoJuridico t={t} codigo={BLOCO_FINANCEIRO.codigo} titulo={BLOCO_FINANCEIRO.titulo} texto={BLOCO_FINANCEIRO.texto} />

                {/* assinatura */}
                <div style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "12px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ ...LABEL }}>ACEITE DIGITAL (ZAPSIGN · ICP-BRASIL)</div>
                  <div style={{ borderTop: `1px solid ${t.t3}`, paddingTop: 4, fontSize: 10, color: t.t3 }}>{sel.nome} · {sel.codigo}</div>
                </div>
              </>
            )}
          </div>

          {/* ações */}
          <div style={{ borderTop: `1px solid ${t.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button className={`rc-btn${juridico && naoResolvidos.length === 0 ? " rc-respira" : ""}`}
              disabled={juridico && naoResolvidos.length > 0}
              style={{ background: juridico && naoResolvidos.length > 0 ? t.bg3 : (juridico ? t.juri : t.accent), color: juridico && naoResolvidos.length > 0 ? t.t3 : t.bg2, border: `1px solid ${juridico ? t.juri : t.accent}`, padding: "11px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: juridico && naoResolvidos.length > 0 ? "not-allowed" : "pointer" }}>
              {juridico ? (naoResolvidos.length > 0 ? "BLOQUEADO — RESOLVA OS CONSENTIMENTOS" : "EMITIR RAS JURÍDICO + ENVIAR PARA ASSINATURA") : "GERAR RAS " + modo + " (PDF)"}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="rc-btn" style={{ background: "transparent", color: t.fatur, border: `1px solid ${t.fatur}`, padding: "9px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>GERAR ORÇAMENTO</button>
              <button className="rc-btn" style={{ background: "transparent", color: t.accent, border: `1px solid ${t.border}`, padding: "9px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>LANÇAR NA AGENDA</button>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ height: 28, background: t.bg2, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3, textTransform: "uppercase" }}>PACTOR · COCKPIT RAS · DADOS DE EXEMPLO · MOTOR JURÍDICO REAL (LIB) FAIL-CLOSED</span>
        <span style={{ flex: 1 }} />
        <span className="rc-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>{protocolo.length} ATIVOS · {viasUsadas.length} VIAS · {consentimentos.filter((x) => x.c).length} CONSENTIMENTOS CASADOS</span>
      </div>
    </div>
  );
}

function BlocoJuridico({ t, codigo, titulo, texto, base, aplicaA, itens }: {
  t: Tema; codigo: string; titulo: string; texto: string; base?: string; aplicaA?: string; itens?: string[];
}) {
  return (
    <div className="rc-item" style={{ border: `1px solid ${t.border}`, background: t.bg2, borderLeft: `3px solid ${t.juri}` }}>
      <div style={{ padding: "7px 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: t.juri, letterSpacing: "0.10em" }}>{codigo}</span>
        <span style={{ fontSize: 10, color: t.t2, letterSpacing: "0.04em" }}>{titulo}</span>
      </div>
      <div style={{ padding: "8px 12px", fontSize: 10, color: t.t2, lineHeight: 1.5 }}>{texto}</div>
      {(base || (itens && itens.length > 0)) && (
        <div style={{ padding: "0 12px 8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {aplicaA && itens && itens.length > 0 && (
            <span style={{ fontSize: 9, color: t.t3, letterSpacing: "0.04em" }}>APLICA-SE A ({aplicaA}): {itens.join(", ")}</span>
          )}
          {base && <span style={{ fontSize: 9, color: t.t3, letterSpacing: "0.04em" }}>BASE LEGAL: {base}</span>}
        </div>
      )}
    </div>
  );
}
