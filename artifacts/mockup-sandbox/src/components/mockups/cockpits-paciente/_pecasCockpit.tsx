import { useState, type ReactNode } from "react";
import { palette as p, pasteis, pulseCss, fontes } from "../chromes-navegacionais/refinados/_design";

export const fonte = fontes.jetbrains;
export const ls = { forte: 2, suave: 1.2 };

/* ──────────────────────────────────────────────────────────────────
   HEADER FIXO DO PACIENTE (fiel ao anexo 3)
   ──────────────────────────────────────────────────────────────── */
export function HeaderPaciente({
  nome = "GRACO SOUZA PÁDUA",
  iniciais = "GS",
  protocolo = "5.4",
  status = "ATIVO",
  saldo = "R$ 16.420",
  pills = ["RAC", "ANAMNESE", "PRESCRIÇÃO", "HISTÓRICO", "PDF FOLLOW-UP", "ACESSOS"],
}: {
  nome?: string; iniciais?: string; protocolo?: string; status?: string; saldo?: string; pills?: string[];
}) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, background: p.navyDeep,
      borderBottom: `2px solid ${p.gold}`, padding: "12px 20px",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
      fontFamily: fonte.familia,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 56, height: 56, background: p.navyPanel, border: `2px solid ${p.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: p.gold, letterSpacing: ls.forte, fontWeight: 700,
        }}>{iniciais}</div>
        <div>
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 2 }}>PACIENTE</div>
          <div style={{ fontSize: 16, color: p.ink, letterSpacing: ls.forte, fontWeight: 700 }}>{nome}</div>
          <div style={{ fontSize: 9, color: p.inkDim, letterSpacing: ls.suave, marginTop: 2 }}>
            ID 14112 · RGA 16/MAI/2026 · (11) 97443-4554
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {pills.map((t, i) => (
          <button key={i} style={{
            background: i === 2 ? p.gold : "transparent", color: i === 2 ? p.navyDeep : p.inkDim,
            border: `1px solid ${i === 2 ? p.gold : p.border}`, padding: "6px 12px",
            fontFamily: fonte.familia, fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Stat label="PROTOCOLO" val={protocolo} cor={p.cyan} />
        <Stat label="STATUS"    val={status}    cor={p.ok} />
        <Stat label="SALDO"     val={saldo}     cor={p.gold} />
      </div>
    </header>
  );
}

function Stat({ label, val, cor }: { label: string; val: string; cor: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte }}>{label}</div>
      <div style={{ fontSize: 14, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{val}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   BLOCO COCKPIT — colapsável, com cor de identidade na borda esquerda
   Mantém a estética dos 2 anexos: header denso + minimize + status
   ──────────────────────────────────────────────────────────────── */
export function BlocoCockpit({
  sigla, titulo, cor, status = "ATIVO", statusCor = p.ok,
  defaultAberto = true, children,
}: {
  sigla: string; titulo: string; cor: string;
  status?: string; statusCor?: string; defaultAberto?: boolean; children: ReactNode;
}) {
  const [aberto, setAberto] = useState(defaultAberto);
  /* corAmena · versão mais dessaturada da cor de identidade pra fundo da faixinha sigla + bordas */
  const corAmena = `${cor}66`;
  return (
    <section style={{
      borderLeft: `3px solid ${cor}`, background: p.navyPanel,
      marginBottom: 8, boxShadow: `0 0 0 1px ${p.border}`,
    }}>
      <header
        onClick={() => setAberto(!aberto)}
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 200px 100px",
          alignItems: "center", gap: 12, padding: "8px 16px",
          background: p.navyPanelAlt, cursor: "pointer", userSelect: "none",
          /* RETÂNGULO EMBORDADO em VOLTA INTEIRA da faixa do header — ativo quando aberto
             cor de identidade do bloco · espelha o print do CEO ("retângulo ciano fechado") */
          border: aberto ? `1px solid ${cor}` : "1px solid transparent",
          boxShadow: aberto
            ? `inset 0 0 12px ${cor}11, 0 0 8px ${cor}55, 0 0 16px ${cor}33`
            : "none",
          fontFamily: fonte.familia,
          transition: "border-color 200ms ease-out, box-shadow 200ms ease-out",
        }}>
        {/* TÍTULO EMBORDADO · sigla + texto dentro de um retângulo só, borda amena, esquerda mais grossa */}
        <div style={{
          display: "inline-flex", alignItems: "stretch",
          border: `1px solid ${corAmena}`,
          borderLeftWidth: 3,
          borderLeftColor: cor,
        }}>
          <span style={{
            background: corAmena, color: p.ink,
            padding: "4px 12px",
            fontSize: 10, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia,
            display: "inline-flex", alignItems: "center",
          }}>{sigla}</span>
          <span style={{
            fontSize: 12, color: p.ink, letterSpacing: ls.forte, fontWeight: 700,
            fontFamily: fonte.familia,
            padding: "4px 14px",
            display: "inline-flex", alignItems: "center",
          }}>{titulo}</span>
        </div>
        <span />{/* espaçador (1fr) pra empurrar chip+botao pro mesmo X em todos os blocos */}
        <ChipStatus texto={status} cor={statusCor} />
        <button className="pwd-bloco-toggle" type="button"
          onClick={(e) => { e.stopPropagation(); setAberto(!aberto); }}
          style={{
            fontSize: 10, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia,
            padding: "5px 10px",
            background: p.navyDeep, color: p.inkDim,
            border: `1px solid ${p.border}`,
            cursor: "pointer", transition: "all 160ms ease-out",
            whiteSpace: "nowrap",
          }}>
          {aberto ? "▾ FECHAR" : "▸ EXPANDIR"}
        </button>
      </header>
      {aberto && <div style={{ padding: 16, fontFamily: fonte.familia }}>{children}</div>}
    </section>
  );
}

export function ChipStatus({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span style={{
      padding: "4px 10px", background: `${cor}15`, color: cor, border: `1px solid ${cor}55`,
      fontSize: 10, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia,
      textAlign: "center",
      minWidth: 180,
      display: "inline-block",
      whiteSpace: "nowrap",
    }}>{texto}</span>
  );
}

/* ──────────────────────────────────────────────────────────────────
   KPI MINI — cartão denso para grids 3×N
   ──────────────────────────────────────────────────────────────── */
export function KpiMini({ label, valor, sub, cor, barra }: {
  label: string; valor: string; sub?: string; cor: string; barra?: number;
}) {
  return (
    <div style={{ background: p.navyDeep, borderTop: `2px solid ${cor}`, padding: "10px 12px" }}>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, color: p.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 9, color: p.inkDim, marginTop: 4, letterSpacing: ls.suave }}>{sub}</div>}
      {typeof barra === "number" && (
        <div style={{ marginTop: 6, height: 4, background: p.borderSoft, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, width: `${barra}%`, background: cor, boxShadow: `0 0 6px ${cor}` }} />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   MINI-VIZ SVG
   ──────────────────────────────────────────────────────────────── */
export function Sparkline({ data, cor, w = 100, h = 28 }: { data: number[]; cor: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((v - min) / range) * (h - 8)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill={cor} fillOpacity={0.12} stroke="none" points={`0,${h} ${pts} ${w},${h}`} />
      <polyline fill="none" stroke={cor} strokeWidth={1.5} points={pts} />
    </svg>
  );
}

export function Donut({ pct, cor, label, sub }: { pct: number; cor: string; label?: string; sub?: string }) {
  const r = 36, c = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={90} height={90}>
        <circle cx={45} cy={45} r={r} stroke={p.borderSoft} strokeWidth={6} fill="none" />
        <circle cx={45} cy={45} r={r} stroke={cor} strokeWidth={6} fill="none"
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="butt"
          transform="rotate(-90 45 45)" style={{ filter: `drop-shadow(0 0 5px ${cor})` }} />
        <text x={45} y={49} textAnchor="middle" fontSize={18} fontWeight={700} fill={cor}
          fontFamily={fonte.familia} style={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</text>
      </svg>
      {label && <div style={{ fontSize: 9, color: p.ink, letterSpacing: ls.forte, fontWeight: 700 }}>{label}</div>}
      {sub && <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.suave }}>{sub}</div>}
    </div>
  );
}

export function Radar({ valores, labels, cor }: { valores: number[]; labels: string[]; cor: string }) {
  const cx = 110, cy = 110, R = 80, n = valores.length;
  const pts = valores.map((v, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / 100) * R;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <svg width={220} height={220} style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} fill="none" stroke={p.borderSoft} strokeWidth={1} points={
          Array.from({ length: n }, (_, i) => {
            const a = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}`;
          }).join(" ")
        } />
      ))}
      {labels.map((lab, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <text key={i} x={cx + Math.cos(a) * (R + 14)} y={cy + Math.sin(a) * (R + 14)}
            textAnchor="middle" dominantBaseline="middle" fontSize={9}
            fill={p.inkDim} fontFamily={fonte.familia} letterSpacing={ls.forte}>
            {lab}
          </text>
        );
      })}
      <polygon points={pts} fill={cor} fillOpacity={0.20} stroke={cor} strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 6px ${cor})` }} />
    </svg>
  );
}

export function Heatmap24x7({ matriz, cor }: { matriz: number[][]; cor: string }) {
  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const cell = 22;
  return (
    <svg width={24 * cell + 40} height={7 * cell + 24} style={{ display: "block" }}>
      {matriz.map((row, d) => row.map((v, h) => (
        <rect key={`${d}-${h}`} x={40 + h * cell} y={d * cell} width={cell - 1} height={cell - 1}
          fill={cor} fillOpacity={Math.max(0.05, v / 10)} stroke={p.navyDeep} />
      )))}
      {dias.map((dia, d) => (
        <text key={dia} x={0} y={d * cell + 15} fontSize={8} fill={p.inkMute}
          fontFamily={fonte.familia} letterSpacing={ls.forte}>{dia}</text>
      ))}
      {[0, 6, 12, 18].map((h) => (
        <text key={h} x={40 + h * cell} y={7 * cell + 14} fontSize={8} fill={p.inkMute}
          fontFamily={fonte.familia} letterSpacing={ls.forte}>{String(h).padStart(2, "0")}H</text>
      ))}
    </svg>
  );
}

/** Gantt horizontal — barras coloridas em trilha de tempo (fiel ao anexo 3) */
export function Gantt({ linhas, semanas = 8 }: {
  linhas: { nome: string; cor: string; faixas: { de: number; ate: number }[]; valor?: string }[];
  semanas?: number;
}) {
  const colW = 80, rowH = 32, labW = 220, valW = 100;
  const W = labW + semanas * colW + valW;
  return (
    <svg width={W} height={linhas.length * rowH + 28} style={{ display: "block" }}>
      {Array.from({ length: semanas }, (_, i) => (
        <g key={i}>
          <text x={labW + i * colW + colW / 2} y={14} textAnchor="middle" fontSize={8} fill={p.inkMute}
            fontFamily={fonte.familia} letterSpacing={ls.forte}>S{i + 1}</text>
          <line x1={labW + i * colW} y1={20} x2={labW + i * colW} y2={20 + linhas.length * rowH}
            stroke={p.borderSoft} strokeWidth={1} />
        </g>
      ))}
      {linhas.map((ln, i) => (
        <g key={i}>
          <text x={0} y={20 + i * rowH + 18} fontSize={10} fill={p.ink} fontFamily={fonte.familia}
            letterSpacing={ls.suave} fontWeight={600}>{ln.nome}</text>
          {ln.faixas.map((fx, k) => (
            <rect key={k} x={labW + fx.de * colW} y={20 + i * rowH + 6} width={(fx.ate - fx.de) * colW - 2} height={rowH - 12}
              fill={ln.cor} fillOpacity={0.85} style={{ filter: `drop-shadow(0 0 4px ${ln.cor})` }} />
          ))}
          {ln.valor && (
            <text x={W - 6} y={20 + i * rowH + 18} textAnchor="end" fontSize={10} fill={ln.cor}
              fontFamily={fonte.familia} letterSpacing={ls.forte} fontWeight={700}
              style={{ fontVariantNumeric: "tabular-nums" }}>{ln.valor}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Sankey curvas senoidais — fiel ao anexo 1+2 */
export function Sankey({ esquerda, direita, cores, w = 900, h = 360 }: {
  esquerda: { label: string; n: number }[];
  direita:  { label: string; n: number }[];
  cores: string[];
  w?: number; h?: number;
}) {
  const padY = 14;
  const colHE = (h - padY * (esquerda.length + 1)) / esquerda.length;
  const colHD = (h - padY * (direita.length + 1)) / direita.length;
  const xL = 120, xR = w - 220;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {/* curvas: cada item esquerda conecta a cada direita */}
      {esquerda.map((e, i) => direita.map((d, j) => {
        const y1 = padY + i * (colHE + padY) + colHE / 2;
        const y2 = padY + j * (colHD + padY) + colHD / 2;
        const cor = cores[(i + j) % cores.length];
        const path = `M${xL},${y1} C${(xL + xR) / 2},${y1} ${(xL + xR) / 2},${y2} ${xR},${y2}`;
        return <path key={`${i}-${j}`} d={path} stroke={cor} strokeWidth={1.2} fill="none" opacity={0.45}
          style={{ filter: `drop-shadow(0 0 3px ${cor})` }} />;
      }))}
      {/* labels esquerda */}
      {esquerda.map((e, i) => {
        const y = padY + i * (colHE + padY) + colHE / 2;
        const cor = cores[i % cores.length];
        return (
          <g key={i}>
            <rect x={xL - 100} y={y - colHE / 2} width={92} height={colHE} fill={cor} fillOpacity={0.18}
              stroke={cor} strokeWidth={1} />
            <text x={xL - 54} y={y + 4} textAnchor="middle" fontSize={9} fill={cor}
              fontFamily={fonte.familia} letterSpacing={ls.forte} fontWeight={700}>{e.label}</text>
            <circle cx={xL} cy={y} r={4} fill={cor} style={{ filter: `drop-shadow(0 0 4px ${cor})` }} />
          </g>
        );
      })}
      {/* labels direita */}
      {direita.map((d, j) => {
        const y = padY + j * (colHD + padY) + colHD / 2;
        const cor = cores[(j + 2) % cores.length];
        return (
          <g key={j}>
            <circle cx={xR} cy={y} r={4} fill={cor} style={{ filter: `drop-shadow(0 0 4px ${cor})` }} />
            <text x={xR + 12} y={y + 4} fontSize={10} fill={p.ink}
              fontFamily={fonte.familia} letterSpacing={ls.suave}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   CONTAINER COCKPIT — wrapper de tela longa
   ──────────────────────────────────────────────────────────────── */
export function CockpitShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: fonte.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      {children}
    </div>
  );
}

export const corBloco = {
  identidade: pasteis.sistema.neon,
  anamnese:   "#FF9A9A",
  prescricao: pasteis.admin.neon,
  timeline:   "#9CC2EA",
  historico:  pasteis.clinica.neon,
  financeiro: p.gold,
  motor:      "#FFA3C8",
  evidencia:  p.cyan,
};

export { p, pasteis };
