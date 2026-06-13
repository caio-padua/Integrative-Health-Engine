import { useMemo, useState } from "react";

type Face = "claro" | "escuro";

type Tema = {
  bg: string; bg2: string; bg3: string; bg4: string;
  border: string; borderAccent: string;
  t1: string; t2: string; t3: string;
  accent: string; accent2: string; glow: string;
  ok: string; warn: string; danger: string;
  neon: string;
};

const TEMA: Record<Face, Tema> = {
  claro: {
    bg: "#EEF2F4", bg2: "#F8FBFC", bg3: "#E2E8EC", bg4: "#D2DCE0",
    border: "#B8C4CA", borderAccent: "#2A8A7C77",
    t1: "#0F1A1F", t2: "#3F5258", t3: "#6E8088",
    accent: "#1E7A6E", accent2: "#2A9D8F", glow: "rgba(30,122,110,0.45)",
    ok: "#1E7A6E", warn: "#9C6E16", danger: "#8A2A2A",
    neon: "#1E7A6E",
  },
  escuro: {
    bg: "#020A14", bg2: "#061824", bg3: "#0A2030", bg4: "#0E2838",
    border: "#1A3848", borderAccent: "#5FE6CC66",
    t1: "#D8EEEE", t2: "#88B8BE", t3: "#557A82",
    accent: "#5FE6CC", accent2: "#5EE6E6", glow: "rgba(95,230,204,0.55)",
    ok: "#5FE6CC", warn: "#FFD27A", danger: "#D08A8A",
    neon: "#5FE6CC",
  },
};

type StatusSessao = "HOJE" | "PENDENTE" | "APLICADA";

type Sessao = {
  protocolo: string;
  substancia: string;
  via: string;
  atual: number;
  total: number;
  status: StatusSessao;
};

type Paciente = {
  id: string;
  nome: string;
  codigo: string;
  pago: number;
  pendente: number;
  sessoes: Sessao[];
};

const PACIENTES: Paciente[] = [
  {
    id: "p1", nome: "Exemplo · Ana Beatriz Moraes", codigo: "PAD-0142",
    pago: 4800, pendente: 1200,
    sessoes: [
      { protocolo: "PROTOCOLO 03", substancia: "Glutationa 600 mg", via: "Endovenosa", atual: 4, total: 8, status: "HOJE" },
      { protocolo: "PROTOCOLO 03", substancia: "Complexo B 2 mL", via: "Intramuscular", atual: 4, total: 8, status: "PENDENTE" },
      { protocolo: "PROTOCOLO 01", substancia: "Vitamina C 5 g", via: "Endovenosa", atual: 8, total: 8, status: "APLICADA" },
    ],
  },
  {
    id: "p2", nome: "Exemplo · Carlos Eduardo Lima", codigo: "PAD-0098",
    pago: 3200, pendente: 0,
    sessoes: [
      { protocolo: "PROTOCOLO 02", substancia: "Taurina 1 g", via: "Endovenosa", atual: 2, total: 6, status: "PENDENTE" },
      { protocolo: "PROTOCOLO 02", substancia: "Magnesio 1,5 g", via: "Endovenosa", atual: 2, total: 6, status: "PENDENTE" },
    ],
  },
  {
    id: "p3", nome: "Exemplo · Daniela Souza Rocha", codigo: "PAD-0211",
    pago: 6000, pendente: 2400,
    sessoes: [
      { protocolo: "PROTOCOLO 05", substancia: "NAD+ 250 mg", via: "Endovenosa", atual: 1, total: 10, status: "PENDENTE" },
    ],
  },
  {
    id: "p4", nome: "Exemplo · Fernando Alves Pinto", codigo: "PAD-0307",
    pago: 1800, pendente: 600,
    sessoes: [
      { protocolo: "PROTOCOLO 04", substancia: "Zinco 5 mg", via: "Intramuscular", atual: 3, total: 4, status: "PENDENTE" },
    ],
  },
];

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const css = `
.pactor-scope, .pactor-scope * {
  box-sizing: border-box;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
}
.pactor-num { font-variant-numeric: tabular-nums; }
@keyframes pactor-respira {
  0%, 100% { box-shadow: inset 0 0 0 1px var(--neon), 0 0 5px var(--glow); }
  50%      { box-shadow: inset 0 0 0 1px var(--neon), 0 0 16px var(--glow); }
}
.pactor-respira { animation: pactor-respira 4s ease-in-out infinite; }
.pac-item { position: relative; isolation: isolate; transition: color .15s ease; }
.pac-item::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  box-shadow: 0 0 0 0 transparent; transition: box-shadow .18s ease;
}
.pac-item:hover::before { box-shadow: 0 0 14px 2px var(--glow); }
.pac-btn { position: relative; isolation: isolate; cursor: pointer; transition: color .15s ease; }
.pac-btn::before {
  content: ""; position: absolute; inset: 0; z-index: -1; transition: box-shadow .18s ease;
}
.pac-btn:hover::before { box-shadow: 0 0 16px 2px var(--glow); }
`;

export function AppEnfermagem() {
  const [face, setFace] = useState<Face>("claro");
  const [selId, setSelId] = useState<string>(PACIENTES[0].id);
  const [pin, setPin] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const t = TEMA[face];

  const lista = useMemo(
    () =>
      PACIENTES.filter((p) =>
        (p.nome + p.codigo).toLowerCase().includes(busca.toLowerCase()),
      ),
    [busca],
  );
  const sel = PACIENTES.find((p) => p.id === selId) ?? PACIENTES[0];
  const pendentesDoSel = sel.sessoes.filter((s) => s.status !== "APLICADA").length;

  const corStatus = (s: StatusSessao) =>
    s === "HOJE" ? t.accent : s === "APLICADA" ? t.t3 : t.warn;

  const LABEL: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.t3,
  };

  return (
    <div
      className="pactor-scope"
      style={{
        // @ts-expect-error css var
        "--neon": t.neon, "--glow": t.glow,
        minHeight: "100vh", background: t.bg, color: t.t1,
        filter: "brightness(0.99) saturate(0.97) contrast(1.16)",
        display: "flex", flexDirection: "column",
      }}
    >
      <style>{css}</style>

      {/* FAIXA 1 — identidade + clinica + face + operador */}
      <div style={{
        height: 40, background: t.bg2, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 16, padding: "0 16px",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: t.accent }}>
          PACTOR
        </span>
        <span style={{ width: 1, height: 18, background: t.border }} />
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: t.t2 }}>
          INSTITUTO PADUA
        </span>

        <div style={{ flex: 1 }} />

        {/* toggle de face */}
        <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
          {(["claro", "escuro"] as Face[]).map((f) => (
            <button
              key={f}
              onClick={() => setFace(f)}
              className="pac-btn"
              style={{
                background: face === f ? t.accent : "transparent",
                color: face === f ? t.bg2 : t.t3,
                border: "none", padding: "5px 12px",
                fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <span style={{ width: 1, height: 18, background: t.border }} />
        <span style={{ fontSize: 10, letterSpacing: "0.10em", color: t.t2 }}>
          ENF. L. SANTOS
        </span>
        <button className="pac-btn" style={{
          background: "transparent", border: `1px solid ${t.border}`, color: t.t3,
          padding: "4px 10px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          SAIR
        </button>
      </div>

      {/* FAIXA 2 — breadcrumb */}
      <div style={{
        height: 32, background: t.bg, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
      }}>
        <span style={{ ...LABEL, color: t.t3 }}>PACTOR</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={{ ...LABEL, color: t.t3 }}>INSTITUTO PADUA</span>
        <span style={{ color: t.t3, fontSize: 10 }}>&rsaquo;</span>
        <span style={{ ...LABEL, color: t.accent }}>ENFERMAGEM</span>
      </div>

      {/* CORPO — lista de pacientes + detalhe */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "340px 1fr", minHeight: 0 }}>

        {/* LISTA */}
        <div style={{ borderRight: `1px solid ${t.border}`, background: t.bg, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
            <div style={{ ...LABEL, marginBottom: 6 }}>BUSCAR PACIENTE</div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="NOME OU CODIGO"
              style={{
                width: "100%", background: t.bg2, border: `1px solid ${t.border}`,
                color: t.t1, padding: "7px 10px", fontSize: 11, letterSpacing: "0.06em",
                outline: "none",
              }}
            />
          </div>

          <div style={{ overflowY: "auto", minHeight: 0 }}>
            {lista.map((p) => {
              const ativo = p.id === selId;
              const pend = p.sessoes.filter((s) => s.status !== "APLICADA").length;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelId(p.id); setPin(""); }}
                  className="pac-item"
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: ativo ? t.bg3 : "transparent",
                    borderBottom: `1px solid ${t.border}`,
                    borderLeft: `3px solid ${ativo ? t.accent : "transparent"}`,
                    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12, color: t.t1, fontWeight: ativo ? 700 : 400 }}>
                    {p.nome}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="pactor-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>
                      {p.codigo}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span
                      className="pactor-num"
                      style={{
                        fontSize: 9, letterSpacing: "0.06em", padding: "1px 6px",
                        border: `1px solid ${pend ? t.warn : t.border}`,
                        color: pend ? t.warn : t.t3,
                      }}
                    >
                      {pend} A APLICAR
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETALHE */}
        <div style={{ padding: 16, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ficha resumo */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.t1 }}>{sel.nome}</span>
              <span className="pactor-num" style={{ fontSize: 10, letterSpacing: "0.10em", color: t.t3 }}>{sel.codigo}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {[
                { k: "SESSOES A APLICAR", v: String(pendentesDoSel), cor: t.accent },
                { k: "PAGO", v: formatBRL(sel.pago), cor: t.ok },
                { k: "PENDENTE", v: formatBRL(sel.pendente), cor: sel.pendente ? t.warn : t.t3 },
              ].map((kpi, i) => (
                <div key={kpi.k} style={{ padding: "12px 14px", borderLeft: i ? `1px solid ${t.border}` : "none" }}>
                  <div style={LABEL}>{kpi.k}</div>
                  <div className="pactor-num" style={{ fontSize: 20, fontWeight: 600, color: kpi.cor, marginTop: 4 }}>
                    {kpi.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* sessoes a aplicar */}
          <div style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
            <div style={{ padding: "8px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>
              SESSOES DO PACIENTE
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sel.sessoes.map((s, i) => (
                <div
                  key={i}
                  className={s.status === "HOJE" ? "pactor-respira" : undefined}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 130px 90px 110px",
                    alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    borderBottom: i < sel.sessoes.length - 1 ? `1px solid ${t.border}` : "none",
                    background: s.status === "HOJE" ? t.bg3 : "transparent",
                  }}
                >
                  <span style={{ fontSize: 10, letterSpacing: "0.08em", color: t.t3 }}>{s.protocolo}</span>
                  <span style={{ fontSize: 12, color: t.t1 }}>{s.substancia}</span>
                  <span style={{ fontSize: 10, letterSpacing: "0.06em", color: t.t2, textTransform: "uppercase" }}>{s.via}</span>
                  <span className="pactor-num" style={{ fontSize: 11, color: t.t2 }}>
                    {s.atual}/{s.total}
                  </span>
                  <span style={{
                    fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
                    border: `1px solid ${corStatus(s.status)}`, color: corStatus(s.status),
                    padding: "2px 8px", textAlign: "center",
                  }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* registrar aplicacao com PIN */}
          <div style={{ border: `1px solid ${t.borderAccent}`, background: t.bg2 }}>
            <div style={{ padding: "8px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: t.accent }}>
              REGISTRAR APLICACAO
            </div>
            <div style={{ padding: 14, display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={LABEL}>SESSAO SELECIONADA</div>
                <div style={{ fontSize: 12, color: t.t1, marginTop: 6 }}>
                  {sel.sessoes[0].substancia} · {sel.sessoes[0].via}
                </div>
              </div>
              <div>
                <div style={{ ...LABEL, marginBottom: 6 }}>PIN DO PACIENTE</div>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  placeholder="0000"
                  className="pactor-num"
                  style={{
                    width: 110, background: t.bg, border: `1px solid ${t.border}`,
                    color: t.t1, padding: "8px 10px", fontSize: 16, letterSpacing: "0.4em",
                    textAlign: "center", outline: "none",
                  }}
                />
              </div>
              <button
                className="pac-btn"
                disabled={pin.length < 4}
                style={{
                  background: pin.length < 4 ? t.bg3 : t.accent,
                  color: pin.length < 4 ? t.t3 : t.bg2,
                  border: `1px solid ${pin.length < 4 ? t.border : t.accent}`,
                  padding: "9px 18px", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  cursor: pin.length < 4 ? "not-allowed" : "pointer",
                }}
              >
                CONFIRMAR APLICACAO
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* RODAPE */}
      <div style={{
        height: 28, background: t.bg2, borderTop: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
      }}>
        <span style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3, textTransform: "uppercase" }}>
          PACTOR · APP DE ENFERMAGEM · DADOS DE EXEMPLO
        </span>
        <span style={{ flex: 1 }} />
        <span className="pactor-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>
          VERDADE UNICA · LE DO SISTEMA ATUAL
        </span>
      </div>
    </div>
  );
}
