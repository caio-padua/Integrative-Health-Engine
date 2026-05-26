import { useState, useMemo } from "react";
import { palette as p, pulseCss, fontes, pasteis } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, SeloFonte, trackMono } from "./_pecas";

/**
 * CHROME 16 · DUPLO PAINEL — VERSÃO INTERATIVA
 *
 * Padrões modernos de dashboard 2025 aplicados ao PAWARDS:
 *  • Linha-selecionada (gold border-left 3px) com painel-detalhe sincronizado
 *  • Hover row glow (sinaliza clicabilidade sem mudar layout)
 *  • Tabs no painel-detalhe (Detalhe / Evidências / Custódia / Carimbo Jurídico)
 *  • Pills de status com background-soft + border-neon (Linear/Vercel-style)
 *  • Sparklines SVG inline nos KPIs (Datadog/Grafana-style)
 *  • Botão ⌘K Buscar (Linear/Notion-style)
 *  • Density toggle apertado/respira (Notion-style)
 *  • Botão "COPIAR HASH" no SHA-256 (auditoria forense real)
 *  • Skeleton zero — tudo respira sincronizado no compasso 6s
 */

type AcaoTipo = "danger" | "ok" | "warn" | "info";

type Evento = {
  id: number;
  hora: string;
  acao: string;
  acaoTipo: AcaoTipo;
  clinica: string;
  executor: string;
  executorEmail: string;
  ip: string;
  motivo: string;
  hash: string;
  evidencias: string[];
  custodia: string[];
};

const EVENTOS: Evento[] = [
  {
    id: 1, hora: "26/MAI 09:14", acao: "SUSPENDER", acaoTipo: "danger",
    clinica: "PÁDUA", executor: "CAIO R. (CEO)", executorEmail: "caio@pawards.med", ip: "187.45.x.x",
    motivo: "Suspeita de uso indevido — auditoria interna",
    hash: "a7f3·c41b·19fe·d92e",
    evidencias: ["log_acesso.txt", "trilha_navegacao.json", "captura_tela.png"],
    custodia: ["09:14 evento gravado", "09:15 hash SHA-256 selado", "09:16 backup S3 (3 regiões)", "09:17 webhook ZapSign disparado"],
  },
  {
    id: 2, hora: "26/MAI 08:42", acao: "REASSUMIR", acaoTipo: "ok",
    clinica: "GENESIS", executor: "DR. MARCO ANDRADE", executorEmail: "marco@genesis.med", ip: "200.18.x.x",
    motivo: "Liberação após validação 2FA",
    hash: "8c12·b67a·de34·4b1a",
    evidencias: ["totp_validado.log", "ip_revisado.json"],
    custodia: ["08:42 evento gravado", "08:43 hash SHA-256 selado", "08:44 backup S3 (3 regiões)"],
  },
  {
    id: 3, hora: "25/MAI 22:11", acao: "PROMOVER_ADMIN", acaoTipo: "warn",
    clinica: "ATELIER NORTE", executor: "CAIO R. (CEO)", executorEmail: "caio@pawards.med", ip: "187.45.x.x",
    motivo: "Onboarding nova gerente — turno noturno",
    hash: "f491·9d2e·a008·22ec",
    evidencias: ["termo_onboarding.pdf", "contrato_assinado.pdf"],
    custodia: ["22:11 evento gravado", "22:12 hash SHA-256 selado", "22:13 backup S3 (3 regiões)", "22:14 webhook ZapSign disparado"],
  },
  {
    id: 4, hora: "25/MAI 18:30", acao: "EXPORTAR_LGPD", acaoTipo: "info",
    clinica: "PÁDUA", executor: "ANA B. (COMPLIANCE)", executorEmail: "ana@padua.med", ip: "189.22.x.x",
    motivo: "Pedido de portabilidade — paciente Luciano R.",
    hash: "1d3a·45f1·9c20·87cc",
    evidencias: ["pedido_portabilidade.pdf", "dados_paciente.zip", "consentimento.pdf"],
    custodia: ["18:30 pedido recebido", "18:31 dados consolidados", "18:32 hash SHA-256 selado", "18:33 entregue ao paciente"],
  },
  {
    id: 5, hora: "25/MAI 14:05", acao: "EXCLUIR_AGENDAR", acaoTipo: "danger",
    clinica: "ATELIER SUL", executor: "CAIO R. (CEO)", executorEmail: "caio@pawards.med", ip: "187.45.x.x",
    motivo: "Cancelamento de unidade — execução em 30 dias",
    hash: "5e8b·2c3a·77df·91fa",
    evidencias: ["plano_descontinuacao.pdf", "ata_decisao.pdf", "comunicado_equipe.pdf"],
    custodia: ["14:05 agendamento criado", "14:06 hash SHA-256 selado", "14:07 backup S3 (3 regiões)", "14:08 notificação equipe enviada"],
  },
  {
    id: 6, hora: "24/MAI 11:48", acao: "FORCAR_LOGOUT", acaoTipo: "warn",
    clinica: "GENESIS", executor: "SEC. TI", executorEmail: "ti@pawards.med", ip: "10.0.x.x",
    motivo: "Sessão suspeita em IP externo",
    hash: "9b22·6e8d·b145·3aa7",
    evidencias: ["sessao_terminada.log", "ip_origem.txt"],
    custodia: ["11:48 alerta disparado", "11:48 sessão encerrada", "11:49 hash SHA-256 selado"],
  },
];

const corPorTipo: Record<AcaoTipo, { txt: string; bg: string; border: string }> = {
  danger: { txt: "#FF9A9A", bg: "rgba(208,138,138,0.10)", border: "rgba(208,138,138,0.45)" },
  ok:     { txt: "#9EE8C2", bg: "rgba(124,196,160,0.10)", border: "rgba(124,196,160,0.45)" },
  warn:   { txt: "#F5C97A", bg: "rgba(224,176,98,0.10)",  border: "rgba(224,176,98,0.45)"  },
  info:   { txt: "#9CC2EA", bg: "rgba(156,194,234,0.10)", border: "rgba(156,194,234,0.45)" },
};

function Sparkline({ data, cor }: { data: number[]; cor: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 80},${22 - ((v - min) / range) * 18}`)
    .join(" ");
  return (
    <svg width={80} height={24} style={{ display: "block" }}>
      <polyline fill="none" stroke={cor} strokeWidth={1.5} points={pts} opacity={0.95} />
      <polyline fill={cor} fillOpacity={0.10} stroke="none" points={`0,22 ${pts} 80,22`} />
    </svg>
  );
}

const SPARK_EVENTOS  = [22,19,24,18,26,21,30,28,33,27,35,29,38,34,42,39,45,41,48,44,52,46,55,49,58,54,61,57,63,60];
const SPARK_SUSPEND  = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2, 3, 2, 1, 0, 2, 1, 1, 0, 2, 1, 0, 1, 2, 1, 0, 2, 1, 0, 1];
const SPARK_REASSUM  = [0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1];
const SPARK_LGPD     = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

export function Chrome16DuploPainel() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  const lsForte = trackMono(fonte, 2);
  const lsSuave = trackMono(fonte, 1.2);
  const [selId, setSelId] = useState(1);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [tab, setTab] = useState<"DETALHE" | "EVIDÊNCIAS" | "CUSTÓDIA" | "CARIMBO">("DETALHE");
  const [densidade, setDensidade] = useState<"compacto" | "respira">("respira");
  const [hashCopiado, setHashCopiado] = useState(false);
  const sel = useMemo(() => EVENTOS.find((e) => e.id === selId) ?? EVENTOS[0], [selId]);
  const corSel = corPorTipo[sel.acaoTipo];
  const linhaPad = densidade === "compacto" ? "6px 12px" : "12px 12px";

  function copiarHash() {
    navigator.clipboard?.writeText(sel.hash.replace(/·/g, ""));
    setHashCopiado(true);
    setTimeout(() => setHashCopiado(false), 1400);
  }

  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <style>{`
        .pwd-row { transition: background-color 140ms ease, box-shadow 140ms ease; cursor: pointer; }
        .pwd-row:hover { background-color: rgba(94,230,230,0.05); box-shadow: inset 3px 0 0 ${p.cyan}; }
        .pwd-row[data-sel="true"] { background-color: rgba(200,155,60,0.10); box-shadow: inset 3px 0 0 ${p.gold}; }
        .pwd-btn { transition: all 140ms ease; cursor: pointer; }
        .pwd-btn:hover { background-color: rgba(200,155,60,0.10); }
        .pwd-tab { transition: all 140ms ease; cursor: pointer; }
        .pwd-tab[data-on="true"] { color: ${p.gold}; border-bottom: 2px solid ${p.gold}; }
      `}</style>

      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />
      <FaixaOperador fonte={f.familia} fonteChave={fonte} />

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 380px" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} />

        {/* ════════ MIOLO ════════ */}
        <main style={{ background: p.navy }}>
          <HeaderPlaca fonte={f.familia} fonteChave={fonte} />

          {/* BARRA DE FERRAMENTAS estilo Linear/Vercel */}
          <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${p.border}` }}>
            <button className="pwd-btn" style={{
              background: p.navyDeep, border: `1px solid ${p.border}`, padding: "7px 14px",
              fontFamily: f.familia, fontSize: 11, letterSpacing: lsForte, color: p.inkDim,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span>⌘ K</span>
              <span style={{ color: p.inkMute }}>BUSCAR AÇÃO, CLÍNICA OU EXECUTOR…</span>
            </button>

            <div style={{ marginLeft: "auto", display: "flex", border: `1px solid ${p.border}`, fontFamily: f.familia, fontSize: 10, letterSpacing: lsSuave }}>
              <button onClick={() => setDensidade("compacto")} className="pwd-btn" style={{
                padding: "5px 12px", background: densidade === "compacto" ? p.gold : "transparent",
                color: densidade === "compacto" ? p.navyDeep : p.inkDim, border: "none", fontWeight: 700,
                fontFamily: f.familia, letterSpacing: lsSuave,
              }}>
                COMPACTO
              </button>
              <button onClick={() => setDensidade("respira")} className="pwd-btn" style={{
                padding: "5px 12px", background: densidade === "respira" ? p.gold : "transparent",
                color: densidade === "respira" ? p.navyDeep : p.inkDim, border: "none", fontWeight: 700,
                fontFamily: f.familia, letterSpacing: lsSuave,
              }}>
                RESPIRA
              </button>
            </div>

            <button className="pwd-btn" style={{
              background: "transparent", border: `1px solid ${p.gold}`, color: p.gold,
              padding: "5px 14px", fontFamily: f.familia, fontSize: 10, letterSpacing: lsForte, fontWeight: 700,
            }}>
              ▸ EXPORTAR CSV
            </button>
          </div>

          {/* KPIs com SPARKLINES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: p.border }}>
            {[
              { label: "EVENTOS (30D)",  val: "487", sub: "+12 hoje",    spark: SPARK_EVENTOS,  cor: p.cyan,    borda: p.gold     },
              { label: "SUSPENSÕES",     val: "14",  sub: "2 ainda ativas", spark: SPARK_SUSPEND, cor: p.danger,  borda: p.danger   },
              { label: "REASSUMIDAS",    val: "11",  sub: "média 4h21",  spark: SPARK_REASSUM,  cor: p.ok,      borda: p.ok       },
              { label: "EXPORT LGPD",    val: "6",   sub: "todas <72h",  spark: SPARK_LGPD,     cor: pasteis.admin.neon, borda: pasteis.admin.neon },
            ].map((k, i) => (
              <div key={i} style={{ background: p.navyPanelAlt, padding: "14px 18px", borderTop: `2px solid ${k.borda}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 28, color: p.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{k.val}</div>
                    <div style={{ fontSize: 9, color: p.inkDim, marginTop: 4, letterSpacing: lsSuave }}>{k.sub}</div>
                  </div>
                  <Sparkline data={k.spark} cor={k.cor} />
                </div>
              </div>
            ))}
          </div>

          {/* TABELA INTERATIVA */}
          <div style={{ padding: "0 0 24px 0", background: p.navy }}>
            <div style={{ padding: "16px 24px 10px", display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 18, color: p.ink, letterSpacing: lsForte, fontWeight: 600 }}>
                TIMELINE IMUTÁVEL
              </span>
              <span style={{ fontSize: 10, color: p.inkMute, letterSpacing: lsSuave }}>
                — DEFESA JURÍDICA LGPD/CFM · {EVENTOS.length} de 487 eventos
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: f.familia, fontSize: 11 }}>
              <thead>
                <tr style={{ background: p.navyPanel, borderTop: `1px solid ${p.gold}`, borderBottom: `1px solid ${p.gold}` }}>
                  {["QUANDO", "AÇÃO", "CLÍNICA", "EXECUTOR", "MOTIVO"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", color: p.inkMute, letterSpacing: lsForte, fontSize: 9, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENTOS.map((ev) => {
                  const cor = corPorTipo[ev.acaoTipo];
                  const isSel = ev.id === selId;
                  return (
                    <tr key={ev.id}
                      className="pwd-row"
                      data-sel={isSel}
                      onClick={() => setSelId(ev.id)}
                      onMouseEnter={() => setHoverId(ev.id)}
                      onMouseLeave={() => setHoverId(null)}
                      style={{ borderBottom: `1px solid ${p.borderSoft}` }}
                    >
                      <td style={{ padding: linhaPad, color: p.inkDim, fontVariantNumeric: "tabular-nums", letterSpacing: lsSuave }}>{ev.hora}</td>
                      <td style={{ padding: linhaPad }}>
                        <span style={{
                          display: "inline-block", padding: "3px 9px",
                          background: cor.bg, color: cor.txt,
                          border: `1px solid ${cor.border}`,
                          fontSize: 9, letterSpacing: lsForte, fontWeight: 700,
                        }}>
                          {ev.acao}
                        </span>
                      </td>
                      <td style={{ padding: linhaPad, color: p.cyan, letterSpacing: lsSuave, fontWeight: 600 }}>◆ {ev.clinica}</td>
                      <td style={{ padding: linhaPad, color: p.ink, letterSpacing: lsSuave }}>{ev.executor}</td>
                      <td style={{ padding: linhaPad, color: p.inkDim, fontStyle: "italic", letterSpacing: lsSuave }}>"{ev.motivo}"</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte }}>
                ░ CLICA QUALQUER LINHA — O PAINEL À DIREITA SINCRONIZA
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="pwd-btn" style={{ background: "transparent", border: `1px solid ${p.border}`, color: p.inkDim, padding: "5px 12px", fontSize: 10, letterSpacing: lsForte, fontFamily: f.familia, fontWeight: 700 }}>◂ ANT</button>
                <span style={{ padding: "5px 12px", fontSize: 10, color: p.inkMute, letterSpacing: lsForte }}>1 · 2 · 3 … 82</span>
                <button className="pwd-btn" style={{ background: "transparent", border: `1px solid ${p.border}`, color: p.inkDim, padding: "5px 12px", fontSize: 10, letterSpacing: lsForte, fontFamily: f.familia, fontWeight: 700 }}>PRÓX ▸</button>
              </div>
            </div>
          </div>
        </main>

        {/* ════════ PAINEL DETALHE INTERATIVO ════════ */}
        <aside style={{ background: p.navyPanel, borderLeft: `1px solid ${p.border}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* CABEÇALHO DO EVENTO SELECIONADO */}
          <div style={{
            padding: "16px 16px 12px", borderBottom: `2px solid ${corSel.txt}`,
            background: corSel.bg,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte }}>░ EVENTO #{sel.id}</span>
              <span className={hoverId === sel.id ? "pawards-piscar" : undefined}
                style={{ fontSize: 8, padding: "2px 8px", border: `1px solid ${p.ok}`, color: p.ok, letterSpacing: lsForte, fontWeight: 700 }}>
                ● AO VIVO
              </span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: lsForte, color: corSel.txt, fontWeight: 700, marginBottom: 4 }}>
              {sel.acao} · {sel.hora}
            </div>
            <div style={{ fontSize: 16, color: p.ink, letterSpacing: lsSuave, fontWeight: 600 }}>
              CLÍNICA <span style={{ color: p.cyan }}>{sel.clinica}</span>
            </div>
            <div style={{ fontSize: 11, color: p.inkDim, fontStyle: "italic", marginTop: 6, letterSpacing: lsSuave }}>
              "{sel.motivo}"
            </div>
          </div>

          {/* TABS estilo Linear */}
          <div style={{ display: "flex", borderBottom: `1px solid ${p.border}`, fontFamily: f.familia }}>
            {(["DETALHE", "EVIDÊNCIAS", "CUSTÓDIA", "CARIMBO"] as const).map((t) => (
              <button key={t} className="pwd-tab" data-on={t === tab}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  padding: "10px 6px", fontFamily: f.familia, fontSize: 9, letterSpacing: lsForte, fontWeight: 700,
                  color: p.inkMute, borderBottom: "2px solid transparent",
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* CONTEÚDO DA TAB */}
          <div style={{ padding: "14px 16px", flex: 1 }}>
            {tab === "DETALHE" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6 }}>EXECUTOR</div>
                  <div style={{ background: p.navyDeep, border: `1px solid ${p.goldSoft}`, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: p.goldSoft, letterSpacing: lsSuave, fontWeight: 700 }}>{sel.executor}</div>
                    <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, marginTop: 4 }}>
                      {sel.executorEmail} <span style={{ color: p.inkDim }}>·</span> IP {sel.ip}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>HASH SHA-256</span>
                    <button onClick={copiarHash} className="pwd-btn" style={{
                      background: "transparent", border: `1px solid ${hashCopiado ? p.ok : p.border}`,
                      color: hashCopiado ? p.ok : p.inkDim, padding: "1px 8px", fontFamily: f.familia,
                      fontSize: 8, letterSpacing: lsForte, fontWeight: 700,
                    }}>
                      {hashCopiado ? "✓ COPIADO" : "▸ COPIAR"}
                    </button>
                  </div>
                  <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: "8px 12px", fontFamily: f.familia, fontSize: 11, color: p.cyan, letterSpacing: lsForte, fontVariantNumeric: "tabular-nums" }}>
                    {sel.hash}
                  </div>
                </div>
              </>
            )}

            {tab === "EVIDÊNCIAS" && (
              <div>
                <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 8 }}>
                  ARQUIVOS ANEXADOS · {sel.evidencias.length}
                </div>
                {sel.evidencias.map((e) => (
                  <div key={e} className="pwd-btn" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", borderBottom: `1px solid ${p.borderSoft}`, fontSize: 10, letterSpacing: lsSuave,
                  }}>
                    <span style={{ color: p.ink }}>▸ {e}</span>
                    <span style={{ fontSize: 8, color: p.inkMute, letterSpacing: lsForte }}>▾ BAIXAR</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "CUSTÓDIA" && (
              <div>
                <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 8 }}>CADEIA DE CUSTÓDIA</div>
                <div style={{ position: "relative", paddingLeft: 14 }}>
                  <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 2, background: p.gold, opacity: 0.4 }} />
                  {sel.custodia.map((c, i) => (
                    <div key={i} style={{ position: "relative", padding: "6px 0", fontSize: 10, color: p.inkDim, letterSpacing: lsSuave }}>
                      <span style={{ position: "absolute", left: -14, top: 9, width: 10, height: 10, background: p.gold, boxShadow: `0 0 6px ${p.gold}` }} />
                      {i + 1}. {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "CARIMBO" && (
              <div>
                <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 8 }}>CARIMBO JURÍDICO</div>
                <div style={{ border: `2px solid ${p.gold}`, padding: "16px", textAlign: "center", background: "rgba(200,155,60,0.05)" }}>
                  <div style={{ fontSize: 9, letterSpacing: lsForte, color: p.gold, fontWeight: 700, marginBottom: 6 }}>
                    PAWARDS · IMUTÁVEL · LGPD ART.20
                  </div>
                  <div style={{ fontSize: 24, color: p.gold, letterSpacing: lsForte, fontWeight: 700, fontFamily: f.familia, margin: "10px 0" }}>
                    ✓ SELADO
                  </div>
                  <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave }}>
                    Hash registrado em blockchain<br />
                    via ZapSign ICP-Brasil
                  </div>
                  <div style={{ fontSize: 8, color: p.inkMute, marginTop: 10, letterSpacing: lsForte, fontVariantNumeric: "tabular-nums" }}>
                    PROTOCOLO #PWD-2026-{String(sel.id).padStart(6, "0")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AÇÕES OUTLINE */}
          <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderTop: `1px solid ${p.border}`, background: p.navyDeep }}>
            <button className="pwd-btn" style={{ flex: 1, background: "transparent", color: p.ok, border: `1px solid ${p.ok}`, padding: "10px", fontSize: 10, letterSpacing: lsForte, fontWeight: 700, fontFamily: f.familia }}>REASSUMIR</button>
            <button className="pwd-btn" style={{ flex: 1, background: "transparent", color: p.gold, border: `1px solid ${p.gold}`, padding: "10px", fontSize: 10, letterSpacing: lsForte, fontWeight: 700, fontFamily: f.familia }}>EXPORTAR LGPD</button>
          </div>
        </aside>
      </div>

      <SeloFonte fonte={fonte} />
    </div>
  );
}
