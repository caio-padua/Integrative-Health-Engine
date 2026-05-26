import { CockpitShell, BlocoCockpit, Sparkline, ChipStatus, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";
import { OperadorTag } from "./_dashShell";

/**
 * DASHBOARD PRINCIPAL · v3
 *
 * Mudanças solicitadas pelo CEO:
 *  · Hover dos botões = VERDE MS-DOS (#33FF66) com borda neon intensa + corpo assumindo a cor
 *  · Auto-relevo 3D: inset highlight no topo + drop shadow no fundo · hover "afunda"
 *  · Faixa superior esquerda: toggle [LOCAL · PÁDUA MATRIZ] (ativo verde) × [GLOBAL · 15 UN] (azul)
 *  · ZERO emojis: tudo retangular, texto puro (sem ⚙ ↩ 💬 ✉ 📞 🏥)
 *  · Pills de breadcrumb com glow neon ampliado
 *  · Mantido (inegociável): quadros empilhados + faixa superior com breadcrumb + operador na direita
 */

const VERDE_DOS = "#33FF66";
const AZUL_GLB  = "#5BB6FF";

/* ──────────────────────────────────────────────────────────
   ESTILOS GLOBAIS · hover + relevo 3D (injetado via <style>)
   ──────────────────────────────────────────────────────── */
const ESTILOS = `
  /* ===== BOTÃO COM RELEVO 3D + HOVER VERDE MS-DOS ===== */
  .pwd-btn {
    position: relative;
    background: linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%);
    color: ${p.inkDim};
    border: 1px solid ${p.border};
    padding: 9px 16px;
    font-family: ${fonte.familia};
    font-size: 11px;
    letter-spacing: 0.10em;
    font-weight: 700;
    cursor: pointer;
    transition: all 90ms ease-out;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      inset 0 -1px 0 rgba(0,0,0,0.45),
      0 2px 0 rgba(0,0,0,0.6),
      0 3px 6px rgba(0,0,0,0.4);
    text-transform: uppercase;
  }
  .pwd-btn:hover {
    color: ${VERDE_DOS};
    border-color: ${VERDE_DOS};
    background: linear-gradient(180deg, rgba(51,255,102,0.18) 0%, rgba(51,255,102,0.08) 100%);
    box-shadow:
      inset 0 0 14px rgba(51,255,102,0.30),
      inset 0 1px 0 rgba(255,255,255,0.10),
      0 0 18px rgba(51,255,102,0.55),
      0 0 32px rgba(51,255,102,0.25);
    transform: translateY(-1px);
    text-shadow: 0 0 8px rgba(51,255,102,0.6);
  }
  .pwd-btn:active {
    transform: translateY(1px);
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.6),
      inset 0 0 10px rgba(51,255,102,0.25),
      0 0 8px rgba(51,255,102,0.4);
  }

  /* ===== BOTÃO ATIVO (estado persistente, sem hover) ===== */
  .pwd-btn-ativo {
    color: ${p.navyDeep};
    background: linear-gradient(180deg, #FFE699 0%, ${p.gold} 100%);
    border-color: ${p.gold};
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.45),
      inset 0 -1px 0 rgba(0,0,0,0.3),
      0 2px 0 rgba(0,0,0,0.5),
      0 3px 10px rgba(245,201,122,0.4);
    text-shadow: none;
  }

  /* ===== BOTÃO DESTRUTIVO (SAIR) — vermelho-pastel ===== */
  .pwd-btn-danger { color: #FF9A9A; border-color: #FF9A9A55; }
  .pwd-btn-danger:hover {
    color: #FFB8B8; border-color: #FF7070;
    background: linear-gradient(180deg, rgba(255,154,154,0.22) 0%, rgba(255,154,154,0.10) 100%);
    box-shadow:
      inset 0 0 14px rgba(255,154,154,0.30),
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 0 18px rgba(255,154,154,0.55),
      0 0 32px rgba(255,154,154,0.25);
    text-shadow: 0 0 8px rgba(255,154,154,0.7);
  }

  /* ===== ESCOPO TOGGLE (LOCAL / GLOBAL) ===== */
  .pwd-escopo {
    padding: 5px 13px;
    font-family: ${fonte.familia}; font-size: 10px; letter-spacing: 0.12em; font-weight: 700;
    cursor: pointer; transition: all 90ms ease-out; text-transform: uppercase;
    border: 1px solid; background: ${p.navyPanel};
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.5);
  }
  .pwd-escopo-local-on {
    color: ${VERDE_DOS}; border-color: ${VERDE_DOS};
    background: linear-gradient(180deg, rgba(51,255,102,0.18) 0%, rgba(51,255,102,0.06) 100%);
    box-shadow: inset 0 0 10px rgba(51,255,102,0.25), 0 0 12px rgba(51,255,102,0.45);
    text-shadow: 0 0 6px rgba(51,255,102,0.55);
  }
  .pwd-escopo-global-off { color: ${AZUL_GLB}99; border-color: ${AZUL_GLB}44; }
  .pwd-escopo-global-off:hover {
    color: ${AZUL_GLB}; border-color: ${AZUL_GLB};
    background: linear-gradient(180deg, rgba(91,182,255,0.16) 0%, rgba(91,182,255,0.05) 100%);
    box-shadow: inset 0 0 10px rgba(91,182,255,0.22), 0 0 14px rgba(91,182,255,0.45);
    text-shadow: 0 0 6px rgba(91,182,255,0.55);
  }

  /* ===== KPI CARD COM RELEVO ===== */
  .pwd-kpi {
    background: linear-gradient(180deg, ${p.navyPanel} 0%, ${p.navyDeep} 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      inset 0 -1px 0 rgba(0,0,0,0.4),
      0 2px 0 rgba(0,0,0,0.5),
      0 4px 10px rgba(0,0,0,0.35);
    transition: transform 120ms ease-out, box-shadow 120ms ease-out;
  }
  .pwd-kpi:hover {
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.10),
      0 4px 0 rgba(0,0,0,0.5),
      0 6px 18px rgba(0,0,0,0.5);
  }

  /* ===== BREADCRUMB PILL ATIVO (glow mais brilhante) ===== */
  .pwd-crumb-on {
    padding: 4px 11px;
    border: 1px solid;
    background: rgba(255,255,255,0.04);
    box-shadow:
      inset 0 0 8px currentColor,
      0 0 10px currentColor,
      0 0 20px currentColor;
    filter: brightness(1.15);
    text-shadow: 0 0 6px currentColor;
  }
`;

export function DashboardPrincipal() {
  return (
    <CockpitShell>
      <style>{ESTILOS}</style>

      <BarraBreadcrumb />
      <HeaderClinica />

      {/* ═══════════ BLOCO 1 · OPERAÇÃO HOJE ═══════════ */}
      <BlocoCockpit sigla="OPE" titulo="OPERAÇÃO HOJE · 27/MAI/2026 · QUINTA" cor={corBloco.identidade} status="EM CURSO · 11:14">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { lab: "SESSÕES HOJE",   v: "18",         sub: "12 ok · 4 em curso · 2 falta",      cor: p.cyan,    spark: [12, 15, 14, 16, 17, 18, 18] },
            { lab: "RECEITA DIA",    v: "R$ 41.820",  sub: "meta R$ 38.000 (+10%)",             cor: p.gold,    spark: [22, 28, 31, 36, 33, 38, 42] },
            { lab: "ADERÊNCIA MÉD.", v: "87%",        sub: "objetivo 80% · ↑ +5pt 7d",          cor: "#5FE6CC", spark: [78, 80, 82, 83, 85, 86, 87] },
            { lab: "FILA OPERAC.",   v: "23 ITENS",   sub: "5 críticos · ver detalhe abaixo",   cor: "#F5C97A", spark: [15, 18, 20, 22, 23, 25, 23] },
            { lab: "MOTOR V4",       v: "142 INFER.", sub: "regras aplicadas hoje",             cor: "#FFA3C8", spark: [110, 125, 130, 135, 138, 140, 142] },
            { lab: "FALTAS",         v: "2",          sub: "Maria S. · João P. · re-agendar",   cor: "#FF9A9A", spark: [3, 2, 4, 2, 1, 2, 2] },
          ].map((k) => (
            <div key={k.lab} className="pwd-kpi" style={{ borderTop: `2px solid ${k.cor}`, padding: "14px 14px 12px" }}>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6, lineHeight: 1.4 }}>{k.lab}</div>
              <div style={{ fontSize: 26, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte, lineHeight: 1.1, textShadow: `0 0 12px ${k.cor}55` }}>{k.v}</div>
              <div style={{ fontSize: 11, color: p.inkDim, marginTop: 6, letterSpacing: ls.suave, lineHeight: 1.5 }}>{k.sub}</div>
              <div style={{ marginTop: 8 }}><Sparkline data={k.spark} cor={k.cor} w={180} h={26} /></div>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 2 · FOLLOW-UP & ADERÊNCIA ═══════════ */}
      <BlocoCockpit sigla="FUP" titulo="FOLLOW-UP & ADERÊNCIA · 87 PACIENTES ATIVOS" cor="#FFA3C8" status="3 PENDÊNCIAS HOJE" statusCor="#F5C97A">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
          <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "11px 14px", background: p.navyPanelAlt, fontSize: 11, color: p.inkMute, letterSpacing: ls.forte, borderBottom: `1px solid ${p.border}` }}>
              CHECKPOINTS PRÓX. 30 DIAS · 142 DISPAROS PROGRAMADOS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {[
                  { quando: "+ 24h",  canal: "WHATSAPP",   acao: "Confirmar reação ao NAD+ EV",        resp: "Beatriz",     cor: "#5FE6CC" },
                  { quando: "+ 7d",   canal: "WHATSAPP",   acao: "Score libido/disposição (form A)",   resp: "Sistema",     cor: "#5FE6CC" },
                  { quando: "+ 14d",  canal: "EMAIL",      acao: "Envio de relatório semanal RAS",     resp: "Sistema",     cor: p.cyan },
                  { quando: "+ 30d",  canal: "TELEFONE",   acao: "Reavaliação clínica (15min)",        resp: "Dr. Caio",    cor: "#FFA3C8" },
                  { quando: "+ 45d",  canal: "WHATSAPP",   acao: "Pulso diário · adesão fórmula",      resp: "Beatriz",     cor: "#5FE6CC" },
                  { quando: "+ 60d",  canal: "PRESENCIAL", acao: "Sessão NAD+ · ciclo 4 abertura",     resp: "Pádua Mat.",  cor: p.gold },
                  { quando: "+ 90d",  canal: "EMAIL",      acao: "RAS consolidado + exames lab",       resp: "Sistema",     cor: p.cyan },
                ].map((c, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? "none" : `1px solid ${p.borderSoft}` }}>
                    <td style={{ padding: "11px 14px", width: 80 }}>
                      <span style={{ color: "#F5C97A", letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{c.quando}</span>
                    </td>
                    <td style={{ padding: "11px 14px", width: 130 }}>
                      <span style={{
                        display: "inline-block", padding: "4px 11px",
                        border: `1px solid ${c.cor}`, background: `${c.cor}12`, color: c.cor,
                        fontSize: 10, letterSpacing: ls.forte, fontWeight: 700,
                        boxShadow: `inset 0 0 6px ${c.cor}40, 0 0 8px ${c.cor}40`,
                        textShadow: `0 0 4px ${c.cor}80`,
                      }}>{c.canal}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: p.ink, letterSpacing: ls.suave, lineHeight: 1.5 }}>{c.acao}</td>
                    <td style={{ padding: "11px 14px", width: 130, textAlign: "right" }}>
                      <span style={{ color: p.gold, letterSpacing: ls.forte, fontSize: 11, fontWeight: 700, fontFamily: fonte.familia }}>{c.resp}</span>
                    </td>
                    <td style={{ padding: "11px 14px", width: 36, textAlign: "right" }}>
                      <span style={{ color: p.inkMute, fontSize: 16 }}>▾</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: p.inkMute, letterSpacing: ls.forte }}>RÉGUA ADERÊNCIA</span>
              <span style={{ fontSize: 11, color: p.gold, letterSpacing: ls.forte, fontWeight: 700 }}>ÚLT. 30D</span>
            </div>
            <RegruaAderencia />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>
              <span>-30D</span>
              <span style={{ color: "#5FE6CC", fontWeight: 700 }}>92% · 28/30</span>
              <span>HOJE</span>
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${p.borderSoft}` }}>
              <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 9 }}>TOP 3 PACIENTES EM RISCO</div>
              {[
                { nome: "MARIA SOUZA · ID 14092",   pct: 42, cor: "#FF9A9A" },
                { nome: "JOÃO PEREIRA · ID 14108",  pct: 58, cor: "#F5C97A" },
                { nome: "LÚCIA DRUMOND · ID 14116", pct: 67, cor: "#F5C97A" },
              ].map((r) => (
                <div key={r.nome} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                  <span style={{ flex: 1, fontSize: 11, color: p.inkDim, letterSpacing: ls.suave }}>{r.nome}</span>
                  <div style={{ width: 70, height: 6, background: p.borderSoft, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }}>
                    <div style={{ width: `${r.pct}%`, height: "100%", background: r.cor, boxShadow: `0 0 6px ${r.cor}` }} />
                  </div>
                  <span style={{ fontSize: 11, color: r.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 36, textAlign: "right" }}>{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 3 · AGENDA & PRÓXIMAS ═══════════ */}
      <BlocoCockpit sigla="AGD" titulo="AGENDA & PRÓXIMAS · 18 SESSÕES HOJE · 24 AMANHÃ" cor={corBloco.timeline} status="11:14 AGORA" statusCor={p.gold}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: fonte.familia }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${p.gold}`, color: p.inkMute, letterSpacing: ls.forte, fontSize: 11 }}>
              <th style={{ textAlign: "left", padding: "10px 12px", width: 150 }}>DATA · HORA</th>
              <th style={{ textAlign: "left", padding: "10px 12px", width: 120 }}>SESSÃO</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>PACIENTE · UNIDADE/SALA</th>
              <th style={{ textAlign: "left", padding: "10px 12px", width: 150 }}>TIPO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", width: 150 }}>RESPONSÁVEL</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 110 }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {[
              { dh: "HOJE · 11:30",   sn: "S04", pac: "Graco Souza Pádua · Pádua Matriz · Sala 2",   tipo: "NAD+ EV",       resp: "Beatriz",  st: "EM CURSO", co: p.gold },
              { dh: "HOJE · 13:00",   sn: "S05", pac: "Camila Toledo · Pádua Matriz · Sala 1",       tipo: "CoQ10 IM",      resp: "Beatriz",  st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 14:30",   sn: "S03", pac: "Lucas Vargas · Pádua Matriz · Sala 3",        tipo: "Subc. Vit C",   resp: "Beatriz",  st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 16:00",   sn: "S12", pac: "Maria Andrade · Pádua Matriz · Sala 2",       tipo: "REAVALIAÇÃO",   resp: "Dr. Caio", st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 17:30",   sn: "S06", pac: "Renato Carvalho · Pádua Matriz · Sala Dr. Caio", tipo: "NAD+ EV",    resp: "Dr. Caio", st: "PRONTO",   co: "#5FE6CC" },
              { dh: "AMANHÃ · 09:00", sn: "S07", pac: "Patrícia Lima · Pádua Matriz · Sala 1",       tipo: "Anamnese",      resp: "Dr. Caio", st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 10:30", sn: "S01", pac: "Felipe Goulart · Pádua Matriz · Sala 3",      tipo: "1ª Consulta",   resp: "Dr. Caio", st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 14:00", sn: "S08", pac: "Roberta Mendes · Pádua Matriz · Sala 2",      tipo: "Fórmula Bland", resp: "Beatriz",  st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 16:00", sn: "S04", pac: "Carlos Eduardo · Pádua Matriz · Sala Dr. Caio", tipo: "REAVALIAÇÃO", resp: "Dr. Caio", st: "RISCO",    co: "#F5C97A" },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                <td style={{ padding: "12px", color: r.dh.startsWith("HOJE") ? p.gold : p.inkDim, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.dh}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: p.navyDeep, padding: "4px 10px", color: p.gold, border: `1px solid ${p.gold}55`, fontSize: 11, letterSpacing: ls.forte, fontWeight: 700, boxShadow: `inset 0 0 4px ${p.gold}30` }}>{r.sn}</span>
                </td>
                <td style={{ padding: "12px", color: p.ink, letterSpacing: ls.suave, lineHeight: 1.5 }}>{r.pac}</td>
                <td style={{ padding: "12px", color: pasteis.admin.neon, letterSpacing: ls.forte, fontSize: 11, fontWeight: 700 }}>{r.tipo}</td>
                <td style={{ padding: "12px", color: p.inkDim, letterSpacing: ls.suave }}>{r.resp}</td>
                <td style={{ padding: "12px", textAlign: "right" }}><ChipStatus texto={r.st} cor={r.co} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 4 · FILA OPERACIONAL ═══════════ */}
      <BlocoCockpit sigla="FLA" titulo="FILA OPERACIONAL · 23 ITENS · 5 CRÍTICOS" cor="#F5C97A" status="SLA OK" statusCor="#5FE6CC">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <FilaCard titulo="ANAMNESE PENDENTE" cor="#FF9A9A" n={4} itens={[
            "Felipe Goulart · 1ª Consulta · há 2h",
            "Patrícia Lima · Anamnese · há 4h",
            "Sandra Vianna · 1ª Consulta · há 6h",
            "Eduardo Lobo · 1ª Consulta · há 1d · ATRASADO",
          ]} />
          <FilaCard titulo="VALIDAÇÃO MÉDICA" cor="#FFA3C8" n={7} itens={[
            "RX Camila Toledo · 12 itens · há 45min",
            "RX Lucas Vargas · 8 itens · há 1h",
            "RX Maria Andrade · 6 itens · há 1h",
            "RX Roberta Mendes · 10 itens · há 2h · ATRASADO",
            "+ 3 protocolos em fila",
          ]} />
          <FilaCard titulo="PRESCRIÇÃO RASCUNHO" cor={pasteis.admin.neon} n={6} itens={[
            "Graco Pádua · Ciclo 3 · pronto p/ emitir",
            "Renato Carvalho · Ciclo 2 · falta consentir",
            "Carlos Eduardo · Reavaliação · pronto",
            "Júlia Castro · 1º Ciclo · falta exame · ATRASADO",
            "+ 2 rascunhos",
          ]} />
          <FilaCard titulo="PAGAMENTO PENDENTE" cor={p.gold} n={6} itens={[
            "Maria Souza · R$ 4.200 · há 3d · COBRAR",
            "João Pereira · R$ 2.800 · há 5d · COBRAR",
            "Lúcia Drumond · R$ 6.420 · há 2d · ATRASADO",
            "Beatriz Lima · R$ 3.100 · há 1d",
            "+ 2 cobranças",
          ]} />
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 5 · MOTOR & ALERTAS ═══════════ */}
      <BlocoCockpit sigla="MTR" titulo="MOTOR CLÍNICO V4 · INFERÊNCIAS HOJE" cor={corBloco.evidencia} status="142 INFERÊNCIAS · 3 ALERTAS">
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <KpiBox label="REGRAS APLICADAS" valor="142" sub="hoje · ↑ +18"   cor={p.cyan} />
            <KpiBox label="EVIDÊNCIA A"      valor="68"  sub="48%"           cor="#5FE6CC" barra={48} />
            <KpiBox label="EVIDÊNCIA B"      valor="52"  sub="37%"           cor="#F5C97A" barra={37} />
            <KpiBox label="EVIDÊNCIA C"      valor="22"  sub="15%"           cor="#FF9A9A" barra={15} />
          </div>
          <div style={{ background: p.navyDeep, border: `1px solid ${p.danger}55`, padding: 14, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 14px ${p.danger}22` }}>
            <div style={{ fontSize: 11, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 10 }}>ALERTAS CRÍTICOS DO MOTOR · AÇÃO REQUERIDA</div>
            {[
              { sev: "CRÍTICO", co: "#FF9A9A", t: "Interação NAD+ × Atorvastatina · paciente Graco Pádua · revisar antes de 11:30" },
              { sev: "ATENÇÃO", co: "#F5C97A", t: "Cortisol 8h baixo · Camila Toledo · sugere reavaliar dose DHEA" },
              { sev: "ATENÇÃO", co: "#F5C97A", t: "TSH limítrofe · Lucas Vargas · agendar tireoide laboratorial" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 6px", borderTop: i === 0 ? "none" : `1px solid ${p.borderSoft}` }}>
                <ChipStatus texto={a.sev} cor={a.co} />
                <span style={{ flex: 1, fontSize: 12, color: p.ink, letterSpacing: ls.suave, lineHeight: 1.5 }}>{a.t}</span>
                <button className="pwd-btn" style={{ padding: "6px 12px", fontSize: 10 }}>ABRIR</button>
              </div>
            ))}
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══════════ BLOCO 6 · FATURAMENTO MÊS ═══════════ */}
      <BlocoCockpit sigla="FNN" titulo="FATURAMENTO · MAIO 2026 · DIA A DIA" cor={p.gold} status="R$ 642K · 117% META" statusCor="#5FE6CC">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <KpiBox label="REC. ACUMULADA"   valor="R$ 642.180" sub="meta R$ 550K · ↑ +17%" cor={p.gold}    barra={117} />
          <KpiBox label="TICKET MÉDIO"     valor="R$ 3.842"   sub="↑ +R$ 320 vs Abr"      cor="#5FE6CC"   barra={88} />
          <KpiBox label="PACIENTES ATIVOS" valor="87"         sub="↑ +12 novos · 0 churn" cor={p.cyan}    barra={92} />
          <KpiBox label="MARGEM EST."      valor="58%"        sub="R$ 372K líquido"        cor="#FFA3C8"  barra={58} />
        </div>
        <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.4)" }}>
          <div style={{ fontSize: 11, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 12 }}>RECEITA DIA-A-DIA · MAIO/2026 · BARRAS DOURADAS = META BATIDA</div>
          <BarrasFat />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>
            <span>01/MAI</span><span>08</span><span>15</span><span>22</span><span style={{ color: p.gold, fontWeight: 700 }}>HOJE · 27</span><span>31</span>
          </div>
        </div>
      </BlocoCockpit>
    </CockpitShell>
  );
}

/* ──────────────────────────────────────────────────────────
   FAIXA SUPERIOR · ESCOPO LOCAL/GLOBAL + BREADCRUMB + OPERADOR
   ──────────────────────────────────────────────────────── */
function BarraBreadcrumb() {
  const crumbs = [
    { lab: "PAWARDS",          cor: p.gold,             ativo: false },
    { lab: "PÁDUA MATRIZ",     cor: p.cyan,             ativo: false },
    { lab: "DASHBOARD GLOBAL", cor: pasteis.admin.neon, ativo: false },
    { lab: "MODO OPERAÇÃO",    cor: p.gold,             ativo: true  },
  ];
  return (
    <div style={{
      background: "#06090F",
      borderBottom: `1px solid ${p.border}`,
      padding: "9px 22px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      fontFamily: fonte.familia,
      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)",
    }}>
      {/* ESQUERDA · ESCOPO + BREADCRUMB */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Toggle ESCOPO */}
        <div style={{ display: "flex", gap: 0 }}>
          <button className="pwd-escopo pwd-escopo-local-on">LOCAL · PÁDUA MATRIZ</button>
          <button className="pwd-escopo pwd-escopo-global-off" style={{ marginLeft: -1 }}>GLOBAL · 15 UN</button>
        </div>

        <div style={{ width: 1, height: 26, background: p.border, margin: "0 4px" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {crumbs.map((c, i) => (
            <span key={c.lab} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {c.ativo ? (
                <span className="pwd-crumb-on" style={{
                  color: c.cor, borderColor: c.cor,
                  fontSize: 11, letterSpacing: ls.forte, fontWeight: 700,
                }}>{c.lab}</span>
              ) : (
                <span style={{
                  color: p.inkDim, fontSize: 11, letterSpacing: ls.forte, fontWeight: 500,
                  padding: "4px 4px",
                }}>{c.lab}</span>
              )}
              {i < crumbs.length - 1 && <span style={{ color: p.inkMute, fontSize: 11 }}>›</span>}
            </span>
          ))}
        </div>

        <span style={{
          fontSize: 10, color: p.inkMute, letterSpacing: ls.forte,
          paddingLeft: 12, borderLeft: `1px solid ${p.border}`, marginLeft: 4,
        }}>
          SESSÃO INICIADA 08:42 · ATIVA 2H 32MIN · ÚLT. AÇÃO 11:11 · REGISTRO SESSÃO S03
        </span>
      </div>

      {/* DIREITA · OPERADOR (retângulo dentro de retângulo) + 2 BOTÕES */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <OperadorTag nome="DR. CAIO REGISTER" cargo="MÉDICO" extra="CEO · CRM-SP 142.308" />
        <button className="pwd-btn" style={{ fontSize: 10, padding: "8px 14px" }}>CONFIGURAÇÕES</button>
        <button className="pwd-btn pwd-btn-danger" style={{ fontSize: 10, padding: "8px 14px" }}>SAIR</button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   HEADER · IDENTIDADE DA UNIDADE + NAV PILLS COM HOVER MS-DOS
   ──────────────────────────────────────────────────────── */
function HeaderClinica() {
  const navs = ["DASHBOARD", "PACIENTES", "AGENDA", "PRESCRIÇÃO", "FATURAMENTO", "MOTOR", "EQUIPE", "AUDITORIA"];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, background: p.navyDeep,
      borderBottom: `2px solid ${p.gold}`, padding: "14px 22px",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center",
      fontFamily: fonte.familia,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px ${p.gold}11`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 62, height: 62, background: p.navyPanel, border: `2px solid ${p.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: p.gold, letterSpacing: ls.forte, fontWeight: 700,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 14px ${p.gold}44, 0 4px 8px rgba(0,0,0,0.5)`,
        }}>PD</div>
        <div>
          <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 3 }}>UNIDADE EM OPERAÇÃO</div>
          <div style={{ fontSize: 18, color: p.ink, letterSpacing: ls.forte, fontWeight: 700, lineHeight: 1.2 }}>PÁDUA MATRIZ · DASHBOARD GLOBAL</div>
          <div style={{ fontSize: 11, color: p.inkDim, letterSpacing: ls.suave, marginTop: 4 }}>
            UNI 1/15 · QUI 27/MAI/2026 · 11:14 BRT · 87 PACIENTES ATIVOS · CICLO COMERCIAL #14
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {navs.map((t, i) => (
          <button key={t} className={`pwd-btn ${i === 0 ? "pwd-btn-ativo" : ""}`} style={{ fontSize: 10, padding: "9px 14px" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <StatH label="HOJE"      val="18 SESS."  cor={p.cyan} />
        <StatH label="ADERÊNCIA" val="87%"       cor="#5FE6CC" />
        <StatH label="RECEITA"   val="R$ 41.8K"  cor={p.gold} />
      </div>
    </header>
  );
}

function StatH({ label, val, cor }: { label: string; val: string; cor: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${cor}55` }}>{val}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   KPI BOX com relevo 3D
   ──────────────────────────────────────────────────────── */
function KpiBox({ label, valor, sub, cor, barra }: { label: string; valor: string; sub?: string; cor: string; barra?: number }) {
  return (
    <div className="pwd-kpi" style={{ borderTop: `2px solid ${cor}`, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, color: p.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, letterSpacing: ls.forte, textShadow: `0 0 10px ${cor}44` }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: p.inkDim, marginTop: 6, letterSpacing: ls.suave, lineHeight: 1.5 }}>{sub}</div>}
      {typeof barra === "number" && (
        <div style={{ marginTop: 8, height: 5, background: p.borderSoft, position: "relative", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 0, width: `${barra}%`, background: cor, boxShadow: `0 0 6px ${cor}` }} />
        </div>
      )}
    </div>
  );
}

function RegruaAderencia() {
  const dias = [78, 82, 85, 90, 88, 92, 94, 91, 87, 89, 93, 95, 91, 88, 84, 86, 90, 92, 94, 91, 89, 87, 90, 93, 95, 92, 88, 91, 94, 92];
  const W = 300, gap = 2, barW = (W - 29 * gap) / 30, H = 78;
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {dias.map((v, i) => {
        const cor = v < 70 ? "#FF9A9A" : v < 85 ? "#F5C97A" : "#5FE6CC";
        const h = (v / 100) * H;
        return (
          <rect key={i} x={i * (barW + gap)} y={H - h} width={barW} height={h}
            fill={cor} style={{ filter: `drop-shadow(0 0 3px ${cor})` }} />
        );
      })}
    </svg>
  );
}

function FilaCard({ titulo, cor, n, itens }: { titulo: string; cor: string; n: number; itens: string[] }) {
  return (
    <div className="pwd-kpi" style={{ borderTop: `3px solid ${cor}`, padding: "12px 14px", minHeight: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: p.inkMute, letterSpacing: ls.forte }}>{titulo}</span>
        <span style={{ fontSize: 22, color: cor, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", textShadow: `0 0 10px ${cor}88` }}>{n}</span>
      </div>
      {itens.map((it, i) => {
        const alerta = it.includes("ATRASADO") || it.includes("COBRAR");
        return (
          <div key={i} style={{
            fontSize: 11, color: p.ink, padding: "8px 10px",
            borderLeft: `2px solid ${cor}55`, marginBottom: 5,
            letterSpacing: ls.suave, lineHeight: 1.5,
            background: alerta ? "rgba(255,154,154,0.06)" : "transparent",
          }}>{it}</div>
        );
      })}
    </div>
  );
}

function BarrasFat() {
  const dias = [18, 22, 24, 19, 26, 12, 8, 28, 32, 30, 28, 34, 14, 10, 36, 38, 35, 32, 40, 18, 12, 38, 42, 39, 41, 36, 42, 0, 0, 0, 0];
  const W = 1240, gap = 5, barW = (W - 30 * gap) / 31, H = 120, meta = 28;
  return (
    <svg width={W} height={H + 22} style={{ display: "block" }}>
      <line x1={0} x2={W} y1={H - (meta / 50) * H} y2={H - (meta / 50) * H}
        stroke={p.gold} strokeDasharray="3,3" strokeWidth={0.9} opacity={0.5} />
      <text x={W - 4} y={H - (meta / 50) * H - 5} textAnchor="end" fontSize={10} fill={p.gold}
        fontFamily={fonte.familia} letterSpacing={ls.forte}>META R$ 28K/DIA</text>
      {dias.map((v, i) => {
        const cor = v === 0 ? p.borderSoft : v >= meta ? p.gold : v >= meta * 0.6 ? "#F5C97A" : "#FF9A9A";
        const h = (v / 50) * H;
        const isHoje = i === 26;
        return (
          <g key={i}>
            <rect x={i * (barW + gap)} y={H - h} width={barW} height={h}
              fill={cor} fillOpacity={v === 0 ? 0.4 : 1}
              style={{ filter: v === 0 ? "none" : `drop-shadow(0 0 4px ${cor})` }} />
            {isHoje && (
              <>
                <rect x={i * (barW + gap) - 2} y={0} width={barW + 4} height={H} fill="none" stroke={p.gold} strokeWidth={1.5} />
                <text x={i * (barW + gap) + barW / 2} y={H + 15} textAnchor="middle" fontSize={10}
                  fill={p.gold} fontFamily={fonte.familia} letterSpacing={ls.forte} fontWeight={700}>HOJE</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
