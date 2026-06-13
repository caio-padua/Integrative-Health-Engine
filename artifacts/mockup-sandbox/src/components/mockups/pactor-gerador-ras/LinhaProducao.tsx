import { useMemo, useState } from "react";

type Face = "claro" | "escuro";

type Tema = {
  bg: string; bg2: string; bg3: string; bg4: string;
  border: string;
  t1: string; t2: string; t3: string;
  accent: string; glow: string;
  ok: string; warn: string; danger: string;
  neon: string;
};

const TEMA: Record<Face, Tema> = {
  claro: {
    bg: "#EEF2F4", bg2: "#F8FBFC", bg3: "#E2E8EC", bg4: "#D2DCE0",
    border: "#B8C4CA",
    t1: "#0F1A1F", t2: "#3F5258", t3: "#6E8088",
    accent: "#1E7A6E", glow: "rgba(30,122,110,0.45)",
    ok: "#1E7A6E", warn: "#9C6E16", danger: "#8A2A2A",
    neon: "#2A9D8F",
  },
  escuro: {
    bg: "#020A14", bg2: "#061824", bg3: "#0A2030", bg4: "#0E2838",
    border: "#1A3848",
    t1: "#D8EEEE", t2: "#88B8BE", t3: "#557A82",
    accent: "#5FE6CC", glow: "rgba(95,230,204,0.55)",
    ok: "#5FE6CC", warn: "#FFD27A", danger: "#D08A8A",
    neon: "#5EE6E6",
  },
};

type Status = "CONCLUIDO" | "EM_CONSTRUCAO" | "PENDENTE";

type Estacao = {
  id: string;
  nome: string;
  pct: number;
  status: Status;
  nota: string;
};

type Lane = { titulo: string; cor: (t: Tema) => string; estacoes: Estacao[] };

const LANES: Lane[] = [
  {
    titulo: "ESTEIRA PRINCIPAL · DA SELEÇÃO DO PACIENTE AO DOCUMENTO ASSINADO",
    cor: (t) => t.accent,
    estacoes: [
      { id: "e1", nome: "01 · SELEÇÃO DO PACIENTE", pct: 100, status: "CONCLUIDO", nota: "Lista + busca + código semântico (exemplo no cockpit)." },
      { id: "e2", nome: "02 · CATÁLOGO DE ATIVOS", pct: 60, status: "EM_CONSTRUCAO", nota: "Injetáveis e manipulados com busca; falta puxar do banco real." },
      { id: "e3", nome: "03 · MONTAGEM DO PROTOCOLO", pct: 60, status: "EM_CONSTRUCAO", nota: "Adiciona/remove ativos, doses e sessões (operável no cockpit)." },
      { id: "e4", nome: "04 · RAS PREMIUM / SIMPLES", pct: 80, status: "EM_CONSTRUCAO", nota: "Dois modos prontos no mockup; falta gerar o PDF real." },
      { id: "e5", nome: "05 · MOTOR JURÍDICO (LIB)", pct: 100, status: "CONCLUIDO", nota: "5 documentos, fail-closed, 87 testes verdes." },
      { id: "e6", nome: "06 · RAS JURÍDICO (CASAMENTO)", pct: 70, status: "EM_CONSTRUCAO", nota: "Ativo → consentimento casado (tela viva no cockpit)." },
      { id: "e7", nome: "07 · ORÇAMENTO / CENÁRIOS", pct: 50, status: "EM_CONSTRUCAO", nota: "Totais e parcelas no mockup F0; falta gateway real." },
      { id: "e8", nome: "08 · ASSINATURA (ZAPSIGN)", pct: 20, status: "PENDENTE", nota: "Webhook e segredo existem; falta plugar no fluxo do Pactor." },
      { id: "e9", nome: "09 · AGENDA / LANÇAMENTO", pct: 10, status: "PENDENTE", nota: "Botão existe no F0; falta integrar ao motor de agenda." },
    ],
  },
  {
    titulo: "TRANSMUTAÇÃO PAWARDS · PRESCRIÇÃO TRAZIDA DO SISTEMA ATUAL",
    cor: (t) => t.warn,
    estacoes: [
      { id: "m1", nome: "10 · PRESCRIÇÃO MANIPULADOS", pct: 25, status: "EM_CONSTRUCAO", nota: "Transmutar GpsPadua: fórmulas, períodos e posologia estruturada." },
      { id: "m2", nome: "11 · PRESCRIÇÃO INJETÁVEIS", pct: 25, status: "EM_CONSTRUCAO", nota: "Transmutar editor de tomadas: EV / IM / SC com mg/mL calculado." },
      { id: "m3", nome: "12 · MENSAGERIA CRONOBIOLÓGICA", pct: 30, status: "PENDENTE", nota: "Disparo WhatsApp por período; validado no canvas, falta ligar." },
    ],
  },
];

const css = `
.lp-scope, .lp-scope * {
  box-sizing: border-box;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
}
.lp-num { font-variant-numeric: tabular-nums; }
@keyframes lp-respira {
  0%, 100% { box-shadow: inset 0 0 0 1px var(--neon), 0 0 5px var(--glow); }
  50%      { box-shadow: inset 0 0 0 1px var(--neon), 0 0 18px var(--glow); }
}
.lp-respira { animation: lp-respira 4s ease-in-out infinite; }
.lp-item { position: relative; isolation: isolate; transition: color .15s ease; }
.lp-item::before { content:""; position:absolute; inset:0; z-index:-1; box-shadow:0 0 0 0 transparent; transition: box-shadow .18s ease; }
.lp-item:hover::before { box-shadow: 0 0 14px 2px var(--glow); }
.lp-btn { position: relative; isolation: isolate; cursor: pointer; transition: color .15s ease; }
.lp-btn::before { content:""; position:absolute; inset:0; z-index:-1; transition: box-shadow .18s ease; }
.lp-btn:hover::before { box-shadow: 0 0 16px 2px var(--glow); }
.lp-btn:focus-visible { outline: 2px solid var(--neon); outline-offset: 1px; }
`;

const N_CELULAS = 10;

function corStatus(t: Tema, s: Status): string {
  if (s === "CONCLUIDO") return t.ok;
  if (s === "EM_CONSTRUCAO") return t.warn;
  return t.t3;
}
function rotuloStatus(s: Status): string {
  if (s === "CONCLUIDO") return "CONCLUÍDO";
  if (s === "EM_CONSTRUCAO") return "EM CONSTRUÇÃO";
  return "PENDENTE";
}

function Quadradinhos({ pct, cor, t }: { pct: number; cor: string; t: Tema }) {
  const cheios = Math.floor(pct / 10);
  const idxSemi = pct < 100 ? cheios : -1;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: N_CELULAS }).map((_, i) => {
        const cheio = i < cheios;
        const semi = i === idxSemi;
        return (
          <div
            key={i}
            title={cheio ? "100%" : semi ? pct + "%" : "0%"}
            style={{
              flex: 1, height: 22, position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${cheio || semi ? cor : t.border}`,
              background: cheio ? cor : semi ? `${cor}33` : t.bg,
            }}
          >
            {semi && (
              <span className="lp-num" style={{ fontSize: 9, fontWeight: 700, color: cor, letterSpacing: "0.02em" }}>{pct}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LinhaProducao() {
  const [face, setFace] = useState<Face>("claro");
  const t = TEMA[face];

  const todas = useMemo(() => LANES.flatMap((l) => l.estacoes), []);
  const geral = useMemo(
    () => Math.round(todas.reduce((a, e) => a + e.pct, 0) / todas.length),
    [todas],
  );
  const concluidas = todas.filter((e) => e.status === "CONCLUIDO").length;
  const emConstrucao = todas.filter((e) => e.status === "EM_CONSTRUCAO").length;
  const pendentes = todas.filter((e) => e.status === "PENDENTE").length;

  const LABEL: React.CSSProperties = { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.t3 };

  return (
    <div
      className="lp-scope"
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
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: t.t2 }}>LINHA DE PRODUÇÃO · BLUEPRINT</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
          {(["claro", "escuro"] as Face[]).map((f) => (
            <button key={f} onClick={() => setFace(f)} className="lp-btn"
              style={{ background: face === f ? t.accent : "transparent", color: face === f ? t.bg2 : t.t3, border: "none", padding: "5px 12px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* FAIXA 2 — semáforo geral */}
      <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, padding: 16, display: "flex", gap: 16, alignItems: "stretch" }}>
        <div className="lp-respira" style={{ border: `1px solid ${t.accent}`, background: t.bg2, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
          <span style={LABEL}>PROGRESSO GERAL DA LINHA</span>
          <span className="lp-num" style={{ fontSize: 40, fontWeight: 700, color: t.accent, lineHeight: 1 }}>{geral}%</span>
          <span style={{ fontSize: 9, letterSpacing: "0.08em", color: t.t3 }}>MÉDIA DAS {todas.length} ESTAÇÕES</span>
        </div>
        {[
          { k: "CONCLUÍDAS", v: concluidas, c: t.ok },
          { k: "EM CONSTRUÇÃO", v: emConstrucao, c: t.warn },
          { k: "PENDENTES", v: pendentes, c: t.t3 },
        ].map((b) => (
          <div key={b.k} className="lp-item" style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4, minWidth: 150, justifyContent: "center" }}>
            <span style={LABEL}>{b.k}</span>
            <span className="lp-num" style={{ fontSize: 30, fontWeight: 700, color: b.c, lineHeight: 1 }}>{b.v}</span>
          </div>
        ))}
        <div className="lp-item" style={{ flex: 1, border: `1px solid ${t.border}`, background: t.bg2, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          <span style={LABEL}>COMO LER ESTE QUADRO</span>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: t.t2 }}>
              <span style={{ width: 14, height: 14, background: t.accent, border: `1px solid ${t.accent}` }} /> QUADRADINHO CHEIO = 100% DAQUELA FRAÇÃO
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: t.t2 }}>
              <span style={{ width: 14, height: 14, background: `${t.accent}44`, border: `1px solid ${t.accent}` }} /> SEMI = FRAÇÃO PARCIAL (VEJA O "%")
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: t.t2 }}>
              <span style={{ width: 14, height: 14, background: t.bg, border: `1px solid ${t.border}` }} /> VAZIO = AINDA NÃO FEITO
            </span>
          </div>
        </div>
      </div>

      {/* CORPO — lanes */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        {LANES.map((lane) => (
          <div key={lane.titulo} style={{ border: `1px solid ${t.border}`, background: t.bg2 }}>
            <div style={{ padding: "8px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 4, height: 16, background: lane.cor(t) }} />
              <span style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: t.t2 }}>{lane.titulo}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: t.border }}>
              {lane.estacoes.map((e) => {
                const c = corStatus(t, e.status);
                return (
                  <div key={e.id} className="lp-item" style={{ background: t.bg2, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, borderLeft: `3px solid ${c}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.04em" }}>{e.nome}</span>
                      <span className="lp-num" style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{e.pct}%</span>
                    </div>
                    <Quadradinhos pct={e.pct} cor={c} t={t} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: c, border: `1px solid ${c}`, padding: "1px 6px" }}>{rotuloStatus(e.status)}</span>
                    </div>
                    <span style={{ fontSize: 10, color: t.t3, letterSpacing: "0.02em", lineHeight: 1.4 }}>{e.nota}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* RODAPÉ */}
      <div style={{ height: 28, background: t.bg2, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3, textTransform: "uppercase" }}>PACTOR · BLUEPRINT DA LINHA DE PRODUÇÃO · 13/06/2026 · % SÃO ESTIMATIVAS DE AVANÇO</span>
        <span style={{ flex: 1 }} />
        <span className="lp-num" style={{ fontSize: 9, letterSpacing: "0.10em", color: t.t3 }}>MOTOR JURÍDICO 100% · 87 TESTES VERDES</span>
      </div>
    </div>
  );
}
