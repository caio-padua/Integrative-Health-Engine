import { useMemo, useState } from "react";

type Face = "claro" | "escuro";

type Tema = {
  bg: string; bg2: string; bg3: string; bg4: string;
  border: string; borderAccent: string;
  t1: string; t2: string; t3: string;
  accent: string; accent2: string; glow: string;
  ok: string; warn: string; danger: string;
  presc: string; prescGlow: string;
  fatur: string; faturGlow: string;
  neon: string;
};

const TEMA: Record<Face, Tema> = {
  claro: {
    bg: "#EEF2F4", bg2: "#F8FBFC", bg3: "#E2E8EC", bg4: "#D2DCE0",
    border: "#B8C4CA", borderAccent: "#2A8A7C77",
    t1: "#0F1A1F", t2: "#3F5258", t3: "#6E8088",
    accent: "#1E7A6E", accent2: "#2A9D8F", glow: "rgba(30,122,110,0.45)",
    ok: "#1E7A6E", warn: "#9C6E16", danger: "#8A2A2A",
    presc: "#5A4A82", prescGlow: "rgba(90,74,130,0.40)",
    fatur: "#2A9D8F", faturGlow: "rgba(42,157,143,0.40)",
    neon: "#2A9D8F",
  },
  escuro: {
    bg: "#020A14", bg2: "#061824", bg3: "#0A2030", bg4: "#0E2838",
    border: "#1A3848", borderAccent: "#5FE6CC66",
    t1: "#D8EEEE", t2: "#88B8BE", t3: "#557A82",
    accent: "#5FE6CC", accent2: "#5EE6E6", glow: "rgba(95,230,204,0.55)",
    ok: "#5FE6CC", warn: "#FFD27A", danger: "#D08A8A",
    presc: "#A89DFF", prescGlow: "rgba(168,157,255,0.45)",
    fatur: "#5EE6E6", faturGlow: "rgba(94,230,230,0.45)",
    neon: "#5EE6E6",
  },
};

type RasModo = "PREMIUM" | "SIMPLES";

type Item = {
  nome: string; dose: string; via: string;
  sessoes: number; freq: string; justificativa: string; valorUnit: number;
};

type Grupo = { protocolo: string; itens: Item[] };

const PACIENTES = [
  { id: "p1", nome: "Exemplo · Ana Beatriz Moraes", codigo: "PAD-0142" },
  { id: "p2", nome: "Exemplo · Carlos Eduardo Lima", codigo: "PAD-0098" },
  { id: "p3", nome: "Exemplo · Daniela Souza Rocha", codigo: "PAD-0211" },
];

const RAS: Grupo[] = [
  {
    protocolo: "PROTOCOLO 03 — DETOX ENDOVENOSO",
    itens: [
      { nome: "Glutationa 600 mg", dose: "600 mg", via: "Endovenosa", sessoes: 8, freq: "1x por semana", justificativa: "Suporte antioxidante hepático.", valorUnit: 250 },
      { nome: "Complexo B 2 mL", dose: "2 mL", via: "Intramuscular", sessoes: 8, freq: "1x por semana", justificativa: "Reposição de vitaminas do complexo B.", valorUnit: 90 },
      { nome: "Vitamina C 5 g", dose: "5 g", via: "Endovenosa", sessoes: 8, freq: "1x por semana", justificativa: "Modulação imunológica.", valorUnit: 110 },
    ],
  },
  {
    protocolo: "IMPLANTE HORMONAL",
    itens: [
      { nome: "Implante de Gestrinona", dose: "1 unidade", via: "Subcutânea", sessoes: 1, freq: "Dose única (6 meses)", justificativa: "Implante de liberação prolongada.", valorUnit: 2400 },
    ],
  },
];

const HONORARIOS = 600;

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const css = `
.ras-scope, .ras-scope * {
  box-sizing: border-box;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
}
.ras-num { font-variant-numeric: tabular-nums; }
@keyframes ras-respira {
  0%, 100% { box-shadow: inset 0 0 0 1px var(--neon), 0 0 5px var(--glow); }
  50%      { box-shadow: inset 0 0 0 1px var(--neon), 0 0 16px var(--glow); }
}
.ras-respira { animation: ras-respira 4s ease-in-out infinite; }
.ras-item { position: relative; isolation: isolate; transition: color .15s ease; }
.ras-item::before { content:""; position:absolute; inset:0; z-index:-1; box-shadow:0 0 0 0 transparent; transition: box-shadow .18s ease; }
.ras-item:hover::before { box-shadow: 0 0 14px 2px var(--glow); }
.ras-btn { position: relative; isolation: isolate; cursor: pointer; transition: color .15s ease; }
.ras-btn::before { content:""; position:absolute; inset:0; z-index:-1; transition: box-shadow .18s ease; }
.ras-btn:hover::before { box-shadow: 0 0 16px 2px var(--glow); }
`;

export function RasOrcamento() {
  const [face, setFace] = useState<Face>("claro");
  const [ras, setRas] = useState<RasModo>("PREMIUM");
  const [selId, setSelId] = useState<string>(PACIENTES[0].id);
  const [cenario, setCenario] = useState<number>(2);
  const t = TEMA[face];

  const sel = PACIENTES.find((p) => p.id === selId) ?? PACIENTES[0];

  const totalItens = useMemo(
    () => RAS.reduce((acc, g) => acc + g.itens.reduce((a, it) => a + it.valorUnit * it.sessoes, 0), 0),
    [],
  );
  const totalGeral = totalItens + HONORARIOS;

  const cenarios = useMemo(
    () => [
      { label: "À VISTA", detalhe: "7% de desconto", parcela: "1x", valor: totalGeral * 0.93, recomendado: false },
      { label: "3x SEM JUROS", detalhe: "sem acréscimo", parcela: "3x", valor: totalGeral, recomendado: false },
      { label: "6x SEM JUROS", detalhe: "melhor equilíbrio", parcela: "6x", valor: totalGeral, recomendado: true },
      { label: "12x COM JUROS", detalhe: "1,99% ao mês", parcela: "12x", valor: totalGeral * 1.13, recomendado: false },
    ],
    [totalGeral],
  );

  const LABEL: React.CSSProperties = { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.t3 };
  const premium = ras === "PREMIUM";

  return (
    <div
      className="ras-scope"
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
            <button key={f} onClick={() => setFace(f)} className="ras-btn"
              style={{ background: face === f ? t.accent : "transparent", color: face === f ? t.bg2 : t.t3, border: "none", padding: "5px 12px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
        </div>
        <span style={{ width: 1, height: 18, background: t.border }} />
        <span style={{ fontSize: 10, letterSpacing: "0.10em", color: t.t2 }}>CLÍNICO RESPONSÁVEL</span>
        <button className="ras-btn" style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.t3, padding: "4px 10px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>SAIR</button>
      </div>

      {/* FAIXA 2 — breadcrumb */}
      <div style={{ height: 32, background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
        <span style={LABEL}>PACTOR</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={LABEL}>INSTITUTO PÁDUA</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={{ ...LABEL, color: t.accent }}>GERADOR DE RAS + ORÇAMENTO</span>
      </div>

      {/* CORPO */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 360px", minHeight: 0 }}>

        {/* RAIL — pacientes */}
        <div style={{ borderRight: `1px solid ${t.border}`, background: t.bg, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${t.border}`, ...LABEL }}>PACIENTE</div>
          <div style={{ overflowY: "auto", minHeight: 0 }}>
            {PACIENTES.map((p) => {
              const ativo = p.id === selId;
              return (
                <button key={p.id} onClick={() => setSelId(p.id)} className="ras-item"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", background: ativo ? t.bg3 : "transparent", borderBottom: `1px solid ${t.border}`, borderLeft: `3px solid ${ativo ? t.accent : "transparent"}`, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: t.t1, fontWeight: ativo ? 700 : 400 }}>{p.nome}</span>
                  <span className="ras-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>{p.codigo}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTRO — RAS */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: `1px solid ${t.border}` }}>
          {/* cabeçalho RAS + toggle modo */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 4, height: 18, background: t.presc }} />
            <span style={{ fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>RELATÓRIO DE ATENDIMENTO E SUGESTÃO</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
              {(["PREMIUM", "SIMPLES"] as RasModo[]).map((m) => (
                <button key={m} onClick={() => setRas(m)} className="ras-btn"
                  style={{ background: ras === m ? t.presc : "transparent", color: ras === m ? t.bg2 : t.t3, border: "none", padding: "5px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  RAS {m}
                </button>
              ))}
            </div>
          </div>

          {/* paciente alvo */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.t1 }}>{sel.nome}</span>
            <span className="ras-num" style={{ fontSize: 10, letterSpacing: "0.10em", color: t.t3 }}>{sel.codigo}</span>
          </div>

          {/* tabela RAS */}
          <div style={{ overflowY: "auto", minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {RAS.map((g) => (
              <div key={g.protocolo} style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: t.presc }}>
                  {g.protocolo}
                </div>
                {/* cabeçalho de colunas */}
                <div style={{ display: "grid", gridTemplateColumns: premium ? "1.6fr 0.7fr 1fr 0.7fr 1fr 0.9fr" : "2fr 1fr 0.7fr 1fr", gap: 8, padding: "6px 12px", borderBottom: `1px solid ${t.border}`, ...LABEL }}>
                  <span>ITEM</span>
                  {premium && <span>DOSE</span>}
                  <span>VIA</span>
                  <span>SESSÕES</span>
                  {premium && <span>FREQUÊNCIA</span>}
                  <span style={{ textAlign: "right" }}>VALOR</span>
                </div>
                {g.itens.map((it, i) => (
                  <div key={i} className="ras-item" style={{ borderBottom: i < g.itens.length - 1 ? `1px solid ${t.border}` : "none" }}>
                    <div style={{ display: "grid", gridTemplateColumns: premium ? "1.6fr 0.7fr 1fr 0.7fr 1fr 0.9fr" : "2fr 1fr 0.7fr 1fr", gap: 8, padding: "8px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: t.t1 }}>{it.nome}</span>
                      {premium && <span className="ras-num" style={{ fontSize: 11, color: t.t2 }}>{it.dose}</span>}
                      <span style={{ fontSize: 10, color: t.t2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{it.via}</span>
                      <span className="ras-num" style={{ fontSize: 11, color: t.t2 }}>{it.sessoes}</span>
                      {premium && <span style={{ fontSize: 10, color: t.t2 }}>{it.freq}</span>}
                      <span className="ras-num" style={{ fontSize: 12, color: t.t1, textAlign: "right" }}>{formatBRL(it.valorUnit * it.sessoes)}</span>
                    </div>
                    {premium && (
                      <div style={{ padding: "0 12px 8px 12px", fontSize: 10, color: t.t3, letterSpacing: "0.04em" }}>
                        JUSTIFICATIVA: {it.justificativa}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* DIREITA — ORÇAMENTO */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: t.bg }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 4, height: 18, background: t.fatur }} />
            <span style={{ fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>ORÇAMENTO</span>
          </div>

          <div style={{ overflowY: "auto", minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* totais */}
            <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
              {[
                { k: "ITENS DO TRATAMENTO", v: formatBRL(totalItens), forte: false },
                { k: "HONORÁRIOS / APLICAÇÕES", v: formatBRL(HONORARIOS), forte: false },
                { k: "TOTAL GERAL", v: formatBRL(totalGeral), forte: true },
              ].map((l, i) => (
                <div key={l.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: i ? `1px solid ${t.border}` : "none", background: l.forte ? t.bg3 : "transparent" }}>
                  <span style={{ ...LABEL, color: l.forte ? t.t2 : t.t3 }}>{l.k}</span>
                  <span className="ras-num" style={{ fontSize: l.forte ? 18 : 13, fontWeight: l.forte ? 700 : 400, color: l.forte ? t.fatur : t.t1 }}>{l.v}</span>
                </div>
              ))}
            </div>

            {/* cenários de pagamento */}
            <div>
              <div style={{ ...LABEL, marginBottom: 8 }}>CENÁRIOS DE PAGAMENTO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cenarios.map((c, i) => {
                  const ativo = i === cenario;
                  const parcelaValor = c.parcela === "1x" ? c.valor : c.valor / Number(c.parcela.replace("x", ""));
                  return (
                    <button
                      key={c.label}
                      onClick={() => setCenario(i)}
                      className={`ras-item${c.recomendado ? " ras-respira" : ""}`}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        border: `1px solid ${ativo ? t.fatur : c.recomendado ? t.fatur : t.border}`,
                        background: ativo ? t.bg3 : t.bg2,
                        padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: ativo || c.recomendado ? t.fatur : t.t1 }}>{c.label}</span>
                        {c.recomendado && <span style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: t.fatur, border: `1px solid ${t.fatur}`, padding: "1px 5px" }}>RECOMENDADO</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 9, letterSpacing: "0.06em", color: t.t3, textTransform: "uppercase" }}>{c.detalhe}</span>
                        <span className="ras-num" style={{ fontSize: 13, color: t.t1 }}>
                          {c.parcela === "1x" ? formatBRL(c.valor) : `${c.parcela} ${formatBRL(parcelaValor)}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ações */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button className="ras-btn" style={{ background: t.accent, color: t.bg2, border: `1px solid ${t.accent}`, padding: "11px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                GERAR RAS (PDF)
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="ras-btn" style={{ background: "transparent", color: t.fatur, border: `1px solid ${t.fatur}`, padding: "9px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                  GERAR ORÇAMENTO
                </button>
                <button className="ras-btn" style={{ background: "transparent", color: t.accent, border: `1px solid ${t.border}`, padding: "9px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                  LANÇAR NA AGENDA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ height: 28, background: t.bg2, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3, textTransform: "uppercase" }}>PACTOR · GERADOR DE RAS + ORÇAMENTO · DADOS DE EXEMPLO</span>
        <span style={{ flex: 1 }} />
        <span className="ras-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>VERDADE ÚNICA · LÊ DO SISTEMA ATUAL</span>
      </div>
    </div>
  );
}
