import { useState, useEffect } from "react";

/* ════════════════════════════════════════════════════════════════════
   LAYOUT PAWARDS PENUMBRA · V2
   ────────────────────────────────────────────────────────────────────
   Ajustes da rodada (Caio · PaperCiano como base aprovada):

   1. Neon respira só quando SELECIONADO (estado React), não no hover.
      Hover continua marcando borda mas sem pulso.
   2. Cor do bloco ativo (OPE/ALT/DMD) TINGE a faixa horizontal inteira
      e ACENDE o item correspondente no menu lateral · "dá a volta por
      cima de tudo".
   3. Borda esquerda dos blocos 5px (era 3px tênue).
   4. Alto-relevo 3D · box-shadow duplo dando profundidade tipo Windows
      clássico (monoblocos um sobre outro).
   5. LEDs de vidro · bolinhas semáforo com radial-gradient nos cantos.
   6. Botões 1/2/3 = NÍVEIS de visualização. Nível 2 adiciona linha de
      contexto na faixa breadcrumb. Nível 3 adiciona linha de paciente
      detalhada. Tudo alinhado pela LINHA IMAGINÁRIA ESQUERDA em 16px.
   7. Alinhamento 16px unificado: breadcrumb, ATIVO, blocos.
   ════════════════════════════════════════════════════════════════════ */

const font = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const LINHA_ESQ = 16; // linha imaginária esquerda · TUDO alinha aqui

export type PerfilPenumbra = {
  id: string;
  nome: string;
  desc: string;
  modoClaro: boolean;
  bg: string;
  bg2: string;
  bg3: string;
  bg4: string;
  border: string;
  borderAccent: string;
  t1: string;
  t2: string;
  t3: string;
  accent: string;
  accent2: string;
  accentGlow: string;
  ok: string;
  warn: string;
  danger: string;
  doms: string[];
};

const DOMINIOS = [
  { k: "DASHB", l: "DASHBOARD",    sub: "operação", subs: ["Hoje", "Semana", "Mês"] },
  { k: "PACTS", l: "PACIENTES",    sub: "87",       subs: ["Ativos", "Inativos", "Importar"] },
  { k: "AGEND", l: "AGENDA",       sub: "5",        subs: ["Hoje", "Amanhã", "Bloqueios"] },
  { k: "PRESC", l: "PRESCRIÇÃO",   sub: "6",        subs: ["A assinar", "Assinadas", "Modelos"] },
  { k: "FATUR", l: "FATURAMENTO",  sub: "41K",      subs: ["NF", "Cobranças", "Conciliação"] },
  { k: "MOTOR", l: "MOTOR V4",     sub: "142",      subs: ["Sugestões", "Regras", "Histórico"] },
  { k: "EQUIP", l: "EQUIPE",       sub: "4",        subs: ["Médicos", "Enfermagem", "Comissões"] },
  { k: "AUDIT", l: "AUDITORIA",    sub: "3",        subs: ["LGPD", "Acessos", "Logs"] },
];

const PULSO_ITENS = [
  { ic: "MSG", t: "WhatsApp respondido", q: "ok protocolo", h: "09:47", cor: "ok" },
  { ic: "EXM", t: "Cortisol 8h",         q: "8.2 µg/dL",   h: "ontem", cor: "warn" },
  { ic: "AGD", t: "Próxima sessão",      q: "30/mai 14h",  h: "+3d",    cor: "accent" },
  { ic: "RXC", t: "Receita NAD+",        q: "assinada",    h: "2d",     cor: "ok" },
  { ic: "FIN", t: "Boleto pago",         q: "R$ 1.840",    h: "5d",     cor: "ok" },
];

const KPIS = [
  { l: "SESSÕES", v: "18", sub: "12 ok · 4 curso · 2 falta" },
  { l: "RECEITA", v: "R$ 41.820", sub: "meta 38K · +10%" },
  { l: "ADERÊNCIA", v: "87%", sub: "obj 80% · +5pt" },
  { l: "FILA", v: "23", sub: "5 críticos" },
  { l: "MOTOR", v: "142", sub: "3 alertas" },
  { l: "FALTAS", v: "2", sub: "re-agendar" },
];

const ALERTAS = [
  { sev: "CRÍTICO", t: "INTERAÇÃO NAD+ × ATORVASTATINA", pac: "Graco Souza Pádua", cta: "REVISAR PROTOCOLO", ctx: "11:30 · 16min" },
  { sev: "URGENTE", t: "CORTISOL 8H BAIXO", pac: "Camila Toledo", cta: "REAVALIAR DHEA", ctx: "Lab 2d" },
  { sev: "URGENTE", t: "TSH LIMÍTROFE 4.8", pac: "Lucas Vargas", cta: "AGENDAR T4L", ctx: "Reflex pend." },
];

const DMD_ITENS = [
  { dom: 1, tt: "CADASTRO INCOMPLETO", n: 3, s: "PENDENTE" },
  { dom: 2, tt: "CONFIRMAÇÕES HOJE", n: 12, s: "EM CURSO" },
  { dom: 3, tt: "RECEITAS A ASSINAR", n: 2, s: "PENDENTE" },
  { dom: 4, tt: "NF PENDENTES", n: 5, s: "ATRASADO" },
];

/* Mapa bloco → índice do menu lateral que acende junto */
const BLOCO_PARA_MENU: Record<string, number> = {
  OPE: 0, // DASHB
  ALT: 5, // MOTOR
  DMD: 1, // PACTS
};

/* LED de vidro · bolinha semáforo com radial-gradient */
function LED({ cor, size = 9 }: { cor: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, #FFFFFF, ${cor} 55%, ${cor} 100%)`,
      boxShadow: `0 0 4px ${cor}, inset 0 -1px 1px rgba(0,0,0,0.3)`,
      border: `1px solid ${cor}aa`,
      flexShrink: 0,
    }} />
  );
}

function Gauge({ valor, max, label, cor, t, size = 68 }: { valor: number; max: number; label: string; cor: string; t: PerfilPenumbra; size?: number }) {
  const pct = Math.round((valor / max) * 100);
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const sweep = circ * 0.75;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border} strokeWidth="4"
          strokeDasharray={`${sweep} ${circ - sweep}`} transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth="4"
          strokeDasharray={`${(sweep * pct) / 100} ${circ}`} transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${cor}aa)`, transition: "all 0.6s" }} />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: t.t1, fontSize: size * 0.24, fontWeight: 700, fontFamily: font }}>{pct}%</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: -4 }}>
        <span style={{ fontSize: 8, color: t.t3, fontFamily: font }}>{valor}/{max}</span>
        <span style={{ fontSize: 8, color: cor, fontWeight: 700, fontFamily: font }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 8, color: t.t3, fontFamily: font, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Spark({ data, cor, w = 88, h = 22 }: { data: number[]; cor: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${cor}aa)` }} />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.4" fill={cor}
        style={{ filter: `drop-shadow(0 0 4px ${cor})` }} />
    </svg>
  );
}

export function LayoutPawardsPenumbra({ perfil: t }: { perfil: PerfilPenumbra }) {
  const [actDom, setActDom] = useState(0);
  const [menuOpen, setMenuOpen] = useState(true);
  const [ctxOpen, setCtxOpen] = useState(true);
  const [pulsoOpen, setPulsoOpen] = useState(true);
  const [blocoAtivo, setBlocoAtivo] = useState<"OPE" | "ALT" | "DMD">("OPE");
  const [nivelViz, setNivelViz] = useState<1 | 2 | 3>(3);
  const [local, setLocal] = useState(true);

  const kpiC = [t.accent, t.doms[0], t.ok, t.warn, t.doms[5], t.danger];
  const SID = `ppen-${t.id}`;
  const menuAceso = BLOCO_PARA_MENU[blocoAtivo] ?? 0;
  const corBlocoAtivo = blocoAtivo === "OPE" ? t.doms[0] : blocoAtivo === "ALT" ? t.danger : t.doms[6];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "[") { e.preventDefault(); setMenuOpen((p) => !p); }
      if (e.key === "]") { e.preventDefault(); setCtxOpen((p) => !p); }
      if (e.key === "1") { setNivelViz(1); }
      if (e.key === "2") { setNivelViz(2); }
      if (e.key === "3") { setNivelViz(3); }
      if (e.key.toLowerCase() === "q") { setBlocoAtivo("OPE"); }
      if (e.key.toLowerCase() === "w") { setBlocoAtivo("ALT"); }
      if (e.key.toLowerCase() === "e") { setBlocoAtivo("DMD"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ────────── CSS · respiração SÓ em .selecionado · hover sutil ────────── */
  const css = `
    @keyframes ${SID}-respira {
      0%   { box-shadow:
        0 1px 0 var(--ppen-cor-borda-min),
        0 2px 4px rgba(0,0,0,0.06),
        0 0 6px 0 var(--ppen-cor),
        0 0 14px 1px var(--ppen-cor-soft); }
      50%  { box-shadow:
        0 1px 0 var(--ppen-cor-borda-min),
        0 2px 4px rgba(0,0,0,0.06),
        0 0 18px 3px var(--ppen-cor),
        0 0 36px 6px var(--ppen-cor-soft); }
      100% { box-shadow:
        0 1px 0 var(--ppen-cor-borda-min),
        0 2px 4px rgba(0,0,0,0.06),
        0 0 6px 0 var(--ppen-cor),
        0 0 14px 1px var(--ppen-cor-soft); }
    }
    @keyframes ${SID}-respira-borda {
      0%, 100% { border-color: var(--ppen-cor-borda-min); }
      50%      { border-color: var(--ppen-cor); }
    }
    .${SID}-elem {
      transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
      position: relative;
      box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
    }
    .${SID}-elem:hover {
      border-color: var(--ppen-cor) !important;
      box-shadow:
        0 1px 0 rgba(0,0,0,0.06),
        0 2px 4px rgba(0,0,0,0.10),
        inset 0 0 0 1px var(--ppen-cor-soft);
    }
    .${SID}-selecionado {
      animation: ${SID}-respira 4.5s ease-in-out infinite, ${SID}-respira-borda 4.5s ease-in-out infinite !important;
    }
    /* ALTO-RELEVO 3D · blocos OPE/ALT/DMD com sombra dupla tipo Windows clássico */
    .${SID}-bloco-3d {
      box-shadow:
        0 1px 0 rgba(255,255,255,0.5) inset,
        0 -1px 0 rgba(0,0,0,0.05) inset,
        0 2px 0 rgba(0,0,0,0.04),
        0 4px 10px rgba(0,0,0,0.06);
    }
  `;

  const hoverVars = (cor: string): React.CSSProperties => ({
    ["--ppen-cor" as string]: cor,
    ["--ppen-cor-soft" as string]: `${cor}55`,
    ["--ppen-cor-borda-min" as string]: t.border,
  } as React.CSSProperties);

  /* tom tonal de fundo · cor do bloco ativo diluída */
  const tomFaixaAtiva = `${corBlocoAtivo}10`;

  return (
    <div style={{ background: t.bg, minHeight: 720, fontFamily: font, color: t.t1, display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      {/* ═══════ FAIXA 1 · TOPO · alinhada em LINHA_ESQ ═══════ */}
      <div style={{ height: 48, background: t.bg, display: "flex", alignItems: "center", padding: `0 ${LINHA_ESQ}px`, gap: 8, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <button
          onClick={() => setLocal(true)}
          className={`${SID}-elem ${local ? `${SID}-selecionado` : ""}`}
          style={{
            padding: "4px 12px", border: `1px solid ${local ? t.ok : t.border}`,
            background: local ? `${t.ok}1f` : "transparent", color: local ? t.ok : t.t3,
            fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            ...hoverVars(t.ok),
          }}>
          {local && <LED cor={t.ok} size={7} />}
          LOCAL
        </button>
        <button
          onClick={() => setLocal(false)}
          className={`${SID}-elem ${!local ? `${SID}-selecionado` : ""}`}
          style={{
            padding: "4px 12px", border: `1px solid ${!local ? t.doms[1] : t.border}`,
            background: !local ? `${t.doms[1]}1f` : "transparent", color: !local ? t.doms[1] : t.t3,
            fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            ...hoverVars(t.doms[1]),
          }}>
          {!local && <LED cor={t.doms[1]} size={7} />}
          GLOBAL
        </button>

        {/* NÍVEIS DE VISUALIZAÇÃO · 1/2/3 */}
        <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
          {([1, 2, 3] as const).map((n) => {
            const act = nivelViz === n;
            return (
              <button key={n}
                onClick={() => setNivelViz(n)}
                className={`${SID}-elem ${act ? `${SID}-selecionado` : ""}`}
                title={n === 1 ? "Nível 1 · básico" : n === 2 ? "Nível 2 · + contexto" : "Nível 3 · detalhe completo"}
                style={{
                  width: 26, height: 26, border: `1px solid ${act ? t.warn : t.border}`,
                  background: act ? `${t.warn}22` : "transparent", color: act ? t.warn : t.t3,
                  fontFamily: font, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                  ...hoverVars(t.warn),
                }}>
                {act && <LED cor={t.warn} size={6} />}
                {n}
              </button>
            );
          })}
        </div>

        <div className={`${SID}-elem`} style={{ flex: 1, maxWidth: 220, marginLeft: 8, padding: "4px 10px", background: t.bg2, border: `1px solid ${t.border}`, display: "flex", gap: 6, alignItems: "center", ...hoverVars(t.accent) }}>
          <span style={{ color: t.accent, fontSize: 10 }}>⌕</span>
          <span style={{ color: t.t3, fontSize: 10 }}>buscar</span>
          <span style={{ marginLeft: "auto", color: t.t3, fontSize: 8, padding: "0 4px", border: `1px solid ${t.border}` }}>⌘K</span>
        </div>
        <span className={`${SID}-elem`} style={{ marginLeft: "auto", color: t.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "4px 10px", border: `1px solid ${t.accent}66`, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...hoverVars(t.accent) }}>
          <LED cor={t.ok} size={7} />
          CAIO REGISTER
        </span>
        <span style={{ fontSize: 9, color: t.t2, padding: "3px 7px", border: `1px solid ${t.border}` }}>MÉDICO</span>
        <span className={`${SID}-elem`} style={{ fontSize: 9, color: t.warn, padding: "3px 7px", border: `1px solid ${t.warn}55`, cursor: "pointer", ...hoverVars(t.warn) }}>CONFIG</span>
        <span className={`${SID}-elem`} style={{ fontSize: 9, color: t.danger, padding: "3px 7px", border: `1px solid ${t.danger}55`, cursor: "pointer", ...hoverVars(t.danger) }}>SAIR</span>
      </div>

      {/* ═══════ FAIXA 2 · BREADCRUMB · tinge com cor do bloco ativo ═══════ */}
      <div style={{
        minHeight: 30, background: tomFaixaAtiva,
        display: "flex", alignItems: "center", padding: `0 ${LINHA_ESQ}px`,
        borderBottom: `1px solid ${corBlocoAtivo}55`, fontSize: 9, letterSpacing: "0.12em", color: t.t1, flexShrink: 0,
        borderLeft: `5px solid ${corBlocoAtivo}`,
      }}>
        <LED cor={corBlocoAtivo} size={8} />
        <div style={{ width: 8 }} />
        {["PAWARDS", "PÁDUA MATRIZ", "DASHBOARD GLOBAL"].map((x, i, a) => (
          <span key={i}>
            <span className={`${SID}-elem`} style={{ padding: "2px 6px", cursor: "pointer", ...hoverVars(t.accent) }}>{x}</span>
            {i < a.length - 1 && <span style={{ color: t.t3, margin: "0 3px" }}>▸</span>}
          </span>
        ))}
        <span className={`${SID}-selecionado`} style={{
          background: corBlocoAtivo, color: t.modoClaro ? "#FFFFFF" : t.bg,
          padding: "2px 8px", fontWeight: 700, marginLeft: 6, fontSize: 9, letterSpacing: 1,
          ...hoverVars(corBlocoAtivo),
        }}>{blocoAtivo}</span>
      </div>

      {/* ═══════ FAIXA 3 · PACIENTE ATIVO · tinge com cor do bloco ativo ═══════ */}
      <div style={{
        minHeight: 32, background: tomFaixaAtiva,
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: `0 ${LINHA_ESQ}px`, gap: 10, flexShrink: 0,
        borderLeft: `5px solid ${corBlocoAtivo}`,
      }}>
        <LED cor={t.ok} size={8} />
        <span style={{ fontSize: 8, color: t.ok, fontWeight: 700, letterSpacing: 1, padding: "2px 5px", border: `1px solid ${t.ok}66` }}>ATIVO</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: 1 }}>GRACO SOUZA PÁDUA</span>
        <span style={{ fontSize: 9, color: t.t2 }}>34A · M</span>
        <span style={{ fontSize: 9, color: t.t3 }}>HAS · DM2</span>
        <span style={{ fontSize: 9, color: t.warn, marginLeft: "auto" }}>SESSÃO 11:30 · 16MIN</span>
      </div>

      {/* CORPO */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ═════════ MENU LATERAL ═════════
            NÍVEL 1 · SOME · só uma barrinha clicável de 18px com label vertical pra reabrir
            NÍVEL 2 · RESUMIDO · só códigos DASHB PACTS... com faixinha de cor (66px)
            NÍVEL 3 · COMPLETO · código + rótulo + sub + submenus indentados (172px)
        */}
        {nivelViz === 1 ? (
          <div onClick={() => setNivelViz(2)} className={`${SID}-elem`}
            style={{
              width: 18, background: t.bg, borderRight: `1px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", writingMode: "vertical-rl",
              fontSize: 9, color: t.accent, letterSpacing: 3, fontWeight: 700,
              flexShrink: 0, ...hoverVars(t.accent),
            }}>
            MENU ▸
          </div>
        ) : (
          <div style={{
            width: nivelViz === 2 ? 66 : 172,
            background: t.bg, borderRight: `1px solid ${t.border}`,
            padding: "6px 0", transition: "width 0.2s",
            flexShrink: 0, overflowY: "auto",
          }}>
            {DOMINIOS.map((d, i) => {
              const cor = t.doms[i];
              const userAct = i === actDom;
              const blocoAct = i === menuAceso;
              const act = userAct || blocoAct;
              return (
                <div key={d.k}>
                  <div onClick={() => setActDom(i)}
                    className={`${SID}-elem ${act ? `${SID}-selecionado` : ""}`}
                    style={{
                      padding: nivelViz === 2 ? "8px 6px" : "7px 10px",
                      display: "flex", alignItems: "center", gap: 6,
                      borderLeft: `5px solid ${act ? cor : "transparent"}`,
                      background: act ? `${cor}18` : t.bg,
                      cursor: "pointer",
                      ...hoverVars(cor),
                    }}>
                    {act && <LED cor={cor} size={7} />}
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: act ? cor : t.t2,
                      letterSpacing: 1,
                      minWidth: nivelViz === 2 ? "auto" : 38,
                    }}>{d.k}</span>
                    {nivelViz === 3 && (
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", lineHeight: 1.35 }}>
                        <span style={{ fontSize: 9, color: act ? t.t1 : t.t2, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{d.l}</span>
                        <span style={{ fontSize: 8, color: t.t3, whiteSpace: "nowrap" }}>{d.sub}</span>
                      </div>
                    )}
                  </div>
                  {/* NÍVEL 3 · submenus indentados com a cor ancorada à esquerda */}
                  {nivelViz === 3 && act && d.subs.map((s, j) => (
                    <div key={j} className={`${SID}-elem`}
                      style={{
                        padding: "4px 10px 4px 32px",
                        borderLeft: `5px solid ${cor}66`,
                        background: t.bg,
                        cursor: "pointer",
                        fontSize: 9, color: t.t2, letterSpacing: 0.5,
                        ...hoverVars(cor),
                      }}>
                      <span style={{ color: t.t3, marginRight: 5 }}>›</span>{s}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* CONTEÚDO CENTRAL · padding alinhado à LINHA_ESQ visual */}
        <div style={{ flex: 1, padding: `8px ${LINHA_ESQ - 4}px`, overflowY: "auto" }}>

          {/* ───── BLOCO OPE ───── */}
          {(() => {
            const corB = t.doms[0];
            const ativo = blocoAtivo === "OPE";
            return (
              <div className={`${SID}-bloco-3d`} style={{
                border: `1px solid ${ativo ? corB : t.border}`,
                borderLeft: `5px solid ${corB}`,
                background: ativo ? `${corB}08` : t.bg2,
                marginBottom: 10,
              }}>
                <div onClick={() => setBlocoAtivo("OPE")}
                  className={`${SID}-elem ${ativo ? `${SID}-selecionado` : ""}`}
                  style={{
                    padding: "8px 14px", background: ativo ? `${corB}14` : t.bg3,
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    lineHeight: 1.4,
                    ...hoverVars(corB),
                  }}>
                  <LED cor={corB} size={9} />
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, padding: "2px 7px", background: `${corB}22`, color: corB, letterSpacing: 1 }}>OPE</span>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.08em", flex: 1 }}>OPERAÇÃO HOJE · 27/MAI/2026 · QUI · 11:14</span>
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: corB }}>EM CURSO</span>
                </div>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: t.border, padding: 1 }}>
                    {KPIS.map((k, i) => (
                      <div key={i} className={`${SID}-elem`}
                        style={{
                          background: t.bg2, padding: "11px 8px", textAlign: "center", cursor: "default",
                          lineHeight: 1.5,
                          ...hoverVars(kpiC[i]),
                        }}>
                        <div style={{ fontSize: 9, color: t.t1, letterSpacing: "0.14em", fontWeight: 700 }}>{k.l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: kpiC[i], fontVariantNumeric: "tabular-nums", marginTop: 4, textShadow: `0 0 8px ${kpiC[i]}55`, lineHeight: 1.2 }}>{k.v}</div>
                        <div style={{ fontSize: 9, color: t.t2, marginTop: 4 }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 14px", borderTop: `1px solid ${t.border}`, flexWrap: "wrap", gap: 6 }}>
                    <Gauge valor={18} max={24} label="SESSÕES" cor={t.accent} t={t} />
                    <Gauge valor={87} max={100} label="ADERÊNCIA" cor={t.ok} t={t} />
                    <Gauge valor={41820} max={50000} label="RECEITA" cor={t.doms[0]} t={t} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>SONO 7d</span>
                        <Spark data={[6, 7, 7, 8, 7, 8, 9]} cor={t.accent} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, width: 16, textAlign: "right" }}>9</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>ENERGIA</span>
                        <Spark data={[5, 6, 7, 7, 8, 8, 8]} cor={t.ok} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, width: 16, textAlign: "right" }}>8</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 8, color: t.t3, width: 48, textAlign: "right" }}>FOCO</span>
                        <Spark data={[7, 7, 8, 8, 7, 9, 8]} cor={t.accent2} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.accent2, width: 16, textAlign: "right" }}>8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ───── BLOCO ALT ───── */}
          {(() => {
            const corB = t.danger;
            const ativo = blocoAtivo === "ALT";
            return (
              <div className={`${SID}-bloco-3d`} style={{
                border: `1px solid ${ativo ? corB : t.border}`,
                borderLeft: `5px solid ${corB}`,
                background: ativo ? `${corB}08` : t.bg2,
                marginBottom: 10,
              }}>
                <div onClick={() => setBlocoAtivo("ALT")}
                  className={`${SID}-elem ${ativo ? `${SID}-selecionado` : ""}`}
                  style={{
                    padding: "8px 14px", background: ativo ? `${corB}14` : t.bg3,
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    lineHeight: 1.4,
                    ...hoverVars(corB),
                  }}>
                  <LED cor={corB} size={9} />
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, padding: "2px 7px", background: `${corB}22`, color: corB, letterSpacing: 1 }}>ALT</span>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.08em", flex: 1 }}>ALERTAS CRÍTICOS DO MOTOR</span>
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: corB }}>3 AGORA</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 12px" }}>
                  {ALERTAS.map((a, i) => {
                    const sc = a.sev === "CRÍTICO" ? t.danger : t.warn;
                    return (
                      <div key={i} className={`${SID}-elem`}
                        style={{
                          border: `1px solid ${sc}66`, background: t.bg2,
                          padding: "11px 12px", cursor: "pointer",
                          lineHeight: 1.45,
                          ...hoverVars(sc),
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <LED cor={sc} size={7} />
                            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", border: `1px solid ${sc}77`, color: sc, letterSpacing: 1 }}>{a.sev}</span>
                          </div>
                          <span style={{ fontSize: 8, color: t.t3 }}>{a.ctx}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.04em", marginBottom: 4 }}>{a.t}</div>
                        <div style={{ fontSize: 10, color: sc, marginBottom: 8 }}>{a.pac}</div>
                        <div style={{
                          fontSize: 9, fontWeight: 700, color: sc, padding: "6px 0",
                          borderTop: `1px solid ${sc}44`, textAlign: "center", letterSpacing: 1,
                        }}>{a.cta}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ───── BLOCO DMD ───── */}
          {(() => {
            const corB = t.doms[6];
            const ativo = blocoAtivo === "DMD";
            return (
              <div className={`${SID}-bloco-3d`} style={{
                border: `1px solid ${ativo ? corB : t.border}`,
                borderLeft: `5px solid ${corB}`,
                background: ativo ? `${corB}08` : t.bg2,
              }}>
                <div onClick={() => setBlocoAtivo("DMD")}
                  className={`${SID}-elem ${ativo ? `${SID}-selecionado` : ""}`}
                  style={{
                    padding: "8px 14px", background: ativo ? `${corB}14` : t.bg3,
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    lineHeight: 1.4,
                    ...hoverVars(corB),
                  }}>
                  <LED cor={corB} size={9} />
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, padding: "2px 7px", background: `${corB}22`, color: corB, letterSpacing: 1 }}>DMD</span>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: "0.08em", flex: 1 }}>DEMANDAS OPERACIONAIS · POR DOMÍNIO</span>
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: corB }}>23 ITENS</span>
                </div>
                {DMD_ITENS.map((d, i) => {
                  const dc = t.doms[d.dom];
                  const ledS = d.s === "ATRASADO" ? t.danger : d.s === "PENDENTE" ? t.warn : t.ok;
                  return (
                    <div key={i} className={`${SID}-elem`}
                      style={{
                        padding: "9px 12px", borderBottom: `1px solid ${t.border}55`,
                        display: "flex", alignItems: "center", gap: 8,
                        borderLeft: `4px solid ${dc}88`,
                        background: t.bg2, cursor: "pointer",
                        lineHeight: 1.4,
                        ...hoverVars(dc),
                      }}>
                      <LED cor={dc} size={8} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: dc, width: 50, letterSpacing: 1 }}>{DOMINIOS[d.dom]?.k}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.t1, letterSpacing: "0.04em", flex: 1 }}>{d.tt}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: dc, fontVariantNumeric: "tabular-nums", textShadow: `0 0 6px ${dc}55` }}>{d.n}</span>
                      <LED cor={ledS} size={7} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: ledS, letterSpacing: 1, padding: "2px 6px", border: `1px solid ${ledS}55` }}>{d.s}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* PAINEL CONTEXTO */}
        {ctxOpen ? (
          <div style={{ width: 200, background: t.bg, borderLeft: `1px solid ${t.border}`, padding: "8px 10px", flexShrink: 0, overflowY: "auto" }}>
            <div onClick={() => setCtxOpen(false)} className={`${SID}-elem`} style={{ fontSize: 8, color: t.accent, letterSpacing: 2, fontWeight: 700, marginBottom: 10, borderLeft: `3px solid ${t.accent}`, paddingLeft: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", ...hoverVars(t.accent) }}>
              <span>CONTEXTO</span><span style={{ color: t.t3 }}>]</span>
            </div>
            <div className={`${SID}-bloco-3d`} style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 6 }}>AGENDA RESTANTE</div>
              {["14:00 · Camila T.", "15:30 · Lucas V.", "17:00 · Ana B."].map((x, i) => (
                <div key={i} className={`${SID}-elem`} style={{ fontSize: 10, color: t.t1, marginBottom: 4, padding: "3px 6px", borderLeft: "2px solid transparent", cursor: "pointer", lineHeight: 1.4, ...hoverVars(t.accent) }}>{x}</div>
              ))}
            </div>
            <div className={`${SID}-bloco-3d`} style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 6 }}>ATALHOS</div>
              {["+ RECEITA", "+ EXAME", "+ MENSAGEM"].map((x, i) => (
                <div key={i} className={`${SID}-elem`} style={{ fontSize: 9, color: t.accent2, padding: "4px 6px", cursor: "pointer", borderLeft: "2px solid transparent", marginBottom: 2, lineHeight: 1.4, ...hoverVars(t.accent2) }}>{x}</div>
              ))}
            </div>
            <div className={`${SID}-bloco-3d`} style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 4 }}>TECLADO</div>
              {[["1", "menu some"], ["2", "menu resumo"], ["3", "menu full"], ["q/w/e", "bloco OPE/ALT/DMD"], ["]", "contexto"]].map(([k, v], i) => (
                <div key={i} style={{ fontSize: 8, color: t.t3, marginBottom: 3, display: "flex", gap: 6, lineHeight: 1.4 }}>
                  <span style={{ color: t.accent, fontWeight: 700, width: 12 }}>{k}</span>{v}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div onClick={() => setCtxOpen(true)} style={{ width: 20, background: t.bg, borderLeft: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", writingMode: "vertical-rl", fontSize: 8, color: t.t3, letterSpacing: 2 }}>]</div>
        )}

        {/* ═════════ PAINEL PULSO ═════════
            Coluna fininha clicável na EXTREMA DIREITA · expande pra
            timeline resumida do paciente (msg, exame, agenda, recibo).
            Default colapsada · não rouba espaço do conteúdo. */}
        {pulsoOpen ? (
          <div style={{ width: 200, background: t.bg, borderLeft: `1px solid ${t.border}`, padding: "8px 10px", flexShrink: 0, overflowY: "auto" }}>
            <div onClick={() => setPulsoOpen(false)} className={`${SID}-elem`}
              style={{
                fontSize: 8, color: t.accent2, letterSpacing: 2, fontWeight: 700,
                marginBottom: 10, borderLeft: `3px solid ${t.accent2}`, paddingLeft: 8,
                cursor: "pointer", display: "flex", justifyContent: "space-between",
                ...hoverVars(t.accent2),
              }}>
              <span>PULSO ◂</span><span style={{ color: t.t3 }}>◂</span>
            </div>
            <div className={`${SID}-bloco-3d`}
              style={{ border: `1px solid ${t.border}`, background: t.bg2, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: t.t3, letterSpacing: 1, marginBottom: 8 }}>TIMELINE PACIENTE</div>
              {PULSO_ITENS.map((p, i) => {
                const cor = p.cor === "ok" ? t.ok : p.cor === "warn" ? t.warn : t.accent;
                return (
                  <div key={i} className={`${SID}-elem`}
                    style={{
                      padding: "6px 8px",
                      borderLeft: `4px solid ${cor}`,
                      background: t.bg2,
                      marginBottom: 5,
                      cursor: "pointer",
                      lineHeight: 1.4,
                      ...hoverVars(cor),
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <LED cor={cor} size={6} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: cor, letterSpacing: 1 }}>{p.ic}</span>
                      <span style={{ fontSize: 7, color: t.t3, marginLeft: "auto" }}>{p.h}</span>
                    </div>
                    <div style={{ fontSize: 9, color: t.t1, lineHeight: 1.3 }}>{p.t}</div>
                    <div style={{ fontSize: 8, color: t.t2 }}>{p.q}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div onClick={() => setPulsoOpen(true)}
            className={`${SID}-elem`}
            style={{
              width: 18, background: t.bg, borderLeft: `1px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", writingMode: "vertical-rl",
              fontSize: 9, color: t.accent2, letterSpacing: 3, fontWeight: 700,
              flexShrink: 0, ...hoverVars(t.accent2),
            }}>
            ◂ PULSO
          </div>
        )}
      </div>
    </div>
  );
}
