import { CockpitShell, BlocoCockpit, KpiMini, Sparkline, ChipStatus, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";

/**
 * DASHBOARD PRINCIPAL DO SISTEMA · TELA INICIAL DA CLÍNICA
 *
 * DNA visual herdado do print que o CEO mandou (cockpit-paciente):
 *  · Header denso fixo no topo (mas agora da CLÍNICA, não do paciente)
 *  · Blocos empilhados verticalmente, cada um com cor neon na borda esquerda
 *  · Cada bloco colapsável + chip de status + sigla 3-letras
 *  · Follow-up & Aderência: tabela CHECKPOINT TEMPORAL × CANAL × AÇÃO × RESPONSÁVEL + RÉGUA de barras 30d
 *  · Agenda & Próximas: tabela DATA/HORA · SESSÃO · UNIDADE/SALA · RESPONSÁVEL
 */
export function DashboardPrincipal() {
  return (
    <CockpitShell>
      <HeaderClinica />

      {/* ═══════════════════════════════════════════════════
          BLOCO 1 · OPERAÇÃO HOJE · KPIs DO DIA
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="OPE" titulo="OPERAÇÃO HOJE · 27/MAI/2026 · QUINTA" cor={corBloco.identidade} status="EM CURSO · 11:14">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { lab: "SESSÕES HOJE",   v: "18",          sub: "12 ok · 4 em curso · 2 falta",  cor: p.cyan,     barra: 75, spark: [12, 15, 14, 16, 17, 18, 18] },
            { lab: "RECEITA DIA",    v: "R$ 41.820",   sub: "meta R$ 38.000 (+10%)",         cor: p.gold,     barra: 110, spark: [22, 28, 31, 36, 33, 38, 42] },
            { lab: "ADERÊNCIA MÉD.", v: "87%",         sub: "objetivo 80% · ↑ +5pt 7d",      cor: "#5FE6CC",  barra: 87,  spark: [78, 80, 82, 83, 85, 86, 87] },
            { lab: "FILA OPERAC.",   v: "23 ITENS",    sub: "5 críticos · ver detalhe ↓",    cor: "#F5C97A",  barra: 60,  spark: [15, 18, 20, 22, 23, 25, 23] },
            { lab: "MOTOR V4",       v: "142 INFER.",  sub: "regras aplicadas hoje",         cor: "#FFA3C8",  barra: 90,  spark: [110, 125, 130, 135, 138, 140, 142] },
            { lab: "FALTAS",         v: "2",           sub: "Maria S. · João P. · re-agendar", cor: "#FF9A9A", barra: 22,  spark: [3, 2, 4, 2, 1, 2, 2] },
          ].map((k) => (
            <div key={k.lab} style={{ background: p.navyDeep, borderTop: `2px solid ${k.cor}`, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{k.lab}</div>
              <div style={{ fontSize: 20, color: k.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: ls.forte, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 9, color: p.inkDim, marginTop: 4, letterSpacing: ls.suave }}>{k.sub}</div>
              <div style={{ marginTop: 6 }}><Sparkline data={k.spark} cor={k.cor} w={170} h={22} /></div>
            </div>
          ))}
        </div>
      </BlocoCockpit>

      {/* ═══════════════════════════════════════════════════
          BLOCO 2 · FOLLOW-UP & ADERÊNCIA GLOBAL
          (fiel ao print: tabela checkpoints + RÉGUA 30d)
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="FUP" titulo="FOLLOW-UP & ADERÊNCIA · 87 PACIENTES ATIVOS" cor="#FFA3C8" status="3 PENDÊNCIAS HOJE" statusCor="#F5C97A">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          {/* Tabela de checkpoints temporais (DNA fiel ao print) */}
          <div style={{ background: p.navyDeep, border: `1px solid ${p.border}` }}>
            <div style={{ padding: "8px 12px", background: p.navyPanelAlt, fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, borderBottom: `1px solid ${p.border}` }}>
              CHECKPOINTS PRÓX. 30 DIAS · 142 DISPAROS PROGRAMADOS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <tbody>
                {[
                  { quando: "+ 24h",  canal: "WhatsApp", ic: "💬", acao: "Confirmar reação ao NAD+ EV",        resp: "Beatriz",  cor: "#5FE6CC" },
                  { quando: "+ 7d",   canal: "WhatsApp", ic: "💬", acao: "Score libido/disposição (form A)",    resp: "Sistema",  cor: "#5FE6CC" },
                  { quando: "+ 14d",  canal: "Email",    ic: "✉",  acao: "Envio de relatório semanal RAS",      resp: "Sistema",  cor: p.cyan },
                  { quando: "+ 30d",  canal: "Telefone", ic: "📞", acao: "Reavaliação clínica (15min)",         resp: "Dr. Caio", cor: "#FFA3C8" },
                  { quando: "+ 45d",  canal: "WhatsApp", ic: "💬", acao: "Pulso diário · adesão fórmula",       resp: "Beatriz",  cor: "#5FE6CC" },
                  { quando: "+ 60d",  canal: "Presencial", ic: "🏥", acao: "Sessão NAD+ · ciclo 4 abertura",   resp: "Pádua Mat.", cor: p.gold },
                  { quando: "+ 90d",  canal: "Email",    ic: "✉",  acao: "RAS consolidado + exames lab",        resp: "Sistema",  cor: p.cyan },
                ].map((c, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? "none" : `1px solid ${p.borderSoft}` }}>
                    <td style={{ padding: "8px 10px", width: 70 }}>
                      <span style={{ color: "#F5C97A", letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, fontVariantNumeric: "tabular-nums", fontSize: 10 }}>{c.quando}</span>
                    </td>
                    <td style={{ padding: "8px 10px", width: 110 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", border: `1px solid ${c.cor}55`, background: `${c.cor}10`, color: c.cor, fontSize: 9, letterSpacing: ls.forte, fontWeight: 700 }}>
                        <span style={{ fontSize: 11 }}>{c.ic}</span> {c.canal}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", color: p.ink, letterSpacing: ls.suave }}>{c.acao}</td>
                    <td style={{ padding: "8px 10px", width: 110, textAlign: "right" }}>
                      <span style={{ color: p.gold, letterSpacing: ls.forte, fontSize: 9, fontWeight: 700, fontFamily: fonte.familia }}>{c.resp}</span>
                    </td>
                    <td style={{ padding: "8px 10px", width: 36, textAlign: "right" }}>
                      <span style={{ color: p.inkMute, fontSize: 14 }}>▾</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RÉGUA ADERÊNCIA 30d (DNA fiel ao print) */}
          <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>RÉGUA ADERÊNCIA</span>
              <span style={{ fontSize: 9, color: p.gold, letterSpacing: ls.forte, fontWeight: 700 }}>ÚLT. 30D</span>
            </div>
            <RegruaAderencia />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>
              <span>-30D</span>
              <span style={{ color: "#5FE6CC", fontWeight: 700 }}>92% · 28/30</span>
              <span>HOJE</span>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${p.borderSoft}` }}>
              <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6 }}>TOP 3 PACIENTES EM RISCO</div>
              {[
                { nome: "MARIA SOUZA · ID 14092",     pct: 42, cor: "#FF9A9A" },
                { nome: "JOÃO PEREIRA · ID 14108",    pct: 58, cor: "#F5C97A" },
                { nome: "LÚCIA DRUMOND · ID 14116",   pct: 67, cor: "#F5C97A" },
              ].map((r) => (
                <div key={r.nome} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 9, color: p.inkDim, letterSpacing: ls.suave }}>{r.nome}</span>
                  <div style={{ width: 60, height: 5, background: p.borderSoft }}>
                    <div style={{ width: `${r.pct}%`, height: "100%", background: r.cor, boxShadow: `0 0 4px ${r.cor}` }} />
                  </div>
                  <span style={{ fontSize: 9, color: r.cor, fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 30, textAlign: "right" }}>{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══════════════════════════════════════════════════
          BLOCO 3 · AGENDA & PRÓXIMAS (fiel ao print)
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="AGD" titulo="AGENDA & PRÓXIMAS · 18 SESSÕES HOJE · 24 AMANHÃ" cor={corBloco.timeline} status="11:14 AGORA" statusCor={p.gold}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: fonte.familia }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${p.gold}`, color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>
              <th style={{ textAlign: "left", padding: "8px 10px", width: 130 }}>DATA · HORA</th>
              <th style={{ textAlign: "left", padding: "8px 10px", width: 110 }}>SESSÃO</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>PACIENTE · UNIDADE/SALA</th>
              <th style={{ textAlign: "left", padding: "8px 10px", width: 130 }}>TIPO</th>
              <th style={{ textAlign: "left", padding: "8px 10px", width: 140 }}>RESPONSÁVEL</th>
              <th style={{ textAlign: "right", padding: "8px 10px", width: 70 }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {[
              { dh: "HOJE · 11:30",   sn: "S04", pac: "Graco Souza Pádua · Pádua Matriz · Sala 2",   tipo: "NAD+ EV",        resp: "Beatriz",     st: "EM CURSO", co: p.gold },
              { dh: "HOJE · 13:00",   sn: "S05", pac: "Camila Toledo · Pádua Matriz · Sala 1",       tipo: "CoQ10 IM",       resp: "Beatriz",     st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 14:30",   sn: "S03", pac: "Lucas Vargas · Pádua Matriz · Sala 3",        tipo: "Subc. Vit C",    resp: "Beatriz",     st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 16:00",   sn: "S12", pac: "Maria Andrade · Pádua Matriz · Sala 2",       tipo: "REAVALIAÇÃO",    resp: "Dr. Caio",    st: "PRONTO",   co: "#5FE6CC" },
              { dh: "HOJE · 17:30",   sn: "S06", pac: "Renato Carvalho · Pádua Matriz · Sala Dr. Caio", tipo: "NAD+ EV",     resp: "Dr. Caio",    st: "PRONTO",   co: "#5FE6CC" },
              { dh: "AMANHÃ · 09:00", sn: "S07", pac: "Patrícia Lima · Pádua Matriz · Sala 1",       tipo: "Anamnese",       resp: "Dr. Caio",    st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 10:30", sn: "S01", pac: "Felipe Goulart · Pádua Matriz · Sala 3",      tipo: "1ª Consulta",    resp: "Dr. Caio",    st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 14:00", sn: "S08", pac: "Roberta Mendes · Pádua Matriz · Sala 2",      tipo: "Fórmula Bland",  resp: "Beatriz",     st: "AGENDADO", co: p.cyan },
              { dh: "AMANHÃ · 16:00", sn: "S04", pac: "Carlos Eduardo · Pádua Matriz · Sala Dr. Caio", tipo: "REAVALIAÇÃO",  resp: "Dr. Caio",    st: "RISCO",    co: "#F5C97A" },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                <td style={{ padding: "9px 10px", color: r.dh.startsWith("HOJE") ? p.gold : p.inkDim, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.dh}</td>
                <td style={{ padding: "9px 10px" }}>
                  <span style={{ background: p.navyDeep, padding: "3px 8px", color: p.gold, border: `1px solid ${p.gold}55`, fontSize: 9, letterSpacing: ls.forte, fontWeight: 700 }}>{r.sn}</span>
                </td>
                <td style={{ padding: "9px 10px", color: p.ink, letterSpacing: ls.suave }}>{r.pac}</td>
                <td style={{ padding: "9px 10px", color: pasteis.admin.neon, letterSpacing: ls.forte, fontSize: 9, fontWeight: 700 }}>{r.tipo}</td>
                <td style={{ padding: "9px 10px", color: p.inkDim, letterSpacing: ls.suave }}>{r.resp}</td>
                <td style={{ padding: "9px 10px", textAlign: "right" }}><ChipStatus texto={r.st} cor={r.co} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </BlocoCockpit>

      {/* ═══════════════════════════════════════════════════
          BLOCO 4 · FILA OPERACIONAL (4 queues lado a lado)
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="FLA" titulo="FILA OPERACIONAL · 23 ITENS · 5 CRÍTICOS" cor="#F5C97A" status="SLA OK" statusCor="#5FE6CC">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <FilaCard titulo="ANAMNESE PENDENTE" cor="#FF9A9A" n={4} itens={[
            "Felipe Goulart · 1ª Consulta · há 2h",
            "Patrícia Lima · Anamnese · há 4h",
            "Sandra Vianna · 1ª Consulta · há 6h",
            "Eduardo Lobo · 1ª Consulta · há 1d ⚠",
          ]} />
          <FilaCard titulo="VALIDAÇÃO MÉDICA" cor="#FFA3C8" n={7} itens={[
            "RX Camila Toledo · 12 itens · há 45min",
            "RX Lucas Vargas · 8 itens · há 1h",
            "RX Maria Andrade · 6 itens · há 1h",
            "RX Roberta Mendes · 10 itens · há 2h ⚠",
            "+ 3 protocolos em fila",
          ]} />
          <FilaCard titulo="PRESCRIÇÃO RASCUNHO" cor={pasteis.admin.neon} n={6} itens={[
            "Graco Pádua · Ciclo 3 · pronto p/ emitir",
            "Renato Carvalho · Ciclo 2 · falta consentir",
            "Carlos Eduardo · Reavaliação · pronto",
            "Júlia Castro · 1º Ciclo · falta exame ⚠",
            "+ 2 rascunhos",
          ]} />
          <FilaCard titulo="PAGAMENTO PENDENTE" cor={p.gold} n={6} itens={[
            "Maria Souza · R$ 4.200 · há 3d ⚠⚠",
            "João Pereira · R$ 2.800 · há 5d ⚠⚠",
            "Lúcia Drumond · R$ 6.420 · há 2d ⚠",
            "Beatriz Lima · R$ 3.100 · há 1d",
            "+ 2 cobranças",
          ]} />
        </div>
      </BlocoCockpit>

      {/* ═══════════════════════════════════════════════════
          BLOCO 5 · MOTOR & ALERTAS
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="MTR" titulo="MOTOR CLÍNICO V4 · INFERÊNCIAS HOJE" cor={corBloco.evidencia} status="142 INFERÊNCIAS · 3 ALERTAS">
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <KpiMini label="REGRAS APLICADAS" valor="142" sub="hoje · ↑ +18" cor={p.cyan} />
            <KpiMini label="EVIDÊNCIA A" valor="68" sub="48%" cor="#5FE6CC" barra={48} />
            <KpiMini label="EVIDÊNCIA B" valor="52" sub="37%" cor="#F5C97A" barra={37} />
            <KpiMini label="EVIDÊNCIA C" valor="22" sub="15%" cor="#FF9A9A" barra={15} />
          </div>
          <div style={{ background: p.navyDeep, border: `1px solid ${p.danger}55`, padding: 12 }}>
            <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 8 }}>ALERTAS CRÍTICOS DO MOTOR · AÇÃO REQUERIDA</div>
            {[
              { sev: "CRÍTICO", co: "#FF9A9A", t: "Interação NAD+ × Atorvastatina · paciente Graco Pádua · revisar antes de 11:30" },
              { sev: "ATENÇÃO", co: "#F5C97A", t: "Cortisol 8h baixo · Camila Toledo · sugere reavaliar dose DHEA" },
              { sev: "ATENÇÃO", co: "#F5C97A", t: "TSH limítrofe · Lucas Vargas · agendar tireoide laboratorial" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderTop: i === 0 ? "none" : `1px solid ${p.borderSoft}` }}>
                <ChipStatus texto={a.sev} cor={a.co} />
                <span style={{ flex: 1, fontSize: 10, color: p.ink, letterSpacing: ls.suave }}>{a.t}</span>
                <span style={{ color: a.co, fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, cursor: "pointer" }}>ABRIR ▸</span>
              </div>
            ))}
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══════════════════════════════════════════════════
          BLOCO 6 · FATURAMENTO MÊS
          ═══════════════════════════════════════════════════ */}
      <BlocoCockpit sigla="FNN" titulo="FATURAMENTO · MAIO 2026 · DIA A DIA" cor={p.gold} status="R$ 642K · 117% META" statusCor="#5FE6CC">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          <KpiMini label="REC. ACUMULADA" valor="R$ 642.180" sub="meta R$ 550K · ↑ +17%"  cor={p.gold}    barra={117} />
          <KpiMini label="TICKET MÉDIO"   valor="R$ 3.842"   sub="↑ +R$ 320 vs Abr"        cor="#5FE6CC"  barra={88} />
          <KpiMini label="PACIENTES ATIVOS" valor="87"       sub="↑ +12 novos · 0 churn"   cor={p.cyan}   barra={92} />
          <KpiMini label="MARGEM EST."    valor="58%"        sub="R$ 372K líquido"          cor="#FFA3C8"  barra={58} />
        </div>
        <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: 14 }}>
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 10 }}>RECEITA DIA-A-DIA · MAIO/2026 · BARRAS DOURADAS = META BATIDA</div>
          <BarrasFat />
          <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, fontFamily: fonte.familia }}>
            <span>01/MAI</span><span>08</span><span>15</span><span>22</span><span style={{ color: p.gold, fontWeight: 700 }}>HOJE · 27</span><span>31</span>
          </div>
        </div>
      </BlocoCockpit>
    </CockpitShell>
  );
}

/* ──────────────────────────────────────────────────────────
   HEADER CLÍNICA — adaptado do HeaderPaciente (DNA fiel)
   ──────────────────────────────────────────────────────── */
function HeaderClinica() {
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
        }}>PD</div>
        <div>
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 2 }}>UNIDADE EM OPERAÇÃO</div>
          <div style={{ fontSize: 16, color: p.ink, letterSpacing: ls.forte, fontWeight: 700 }}>PÁDUA MATRIZ · DASHBOARD GLOBAL</div>
          <div style={{ fontSize: 9, color: p.inkDim, letterSpacing: ls.suave, marginTop: 2 }}>
            UNI 1/15 · QUI 27/MAI/2026 · 11:14 BRT · Dr. Caio · CEO
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {["DASHBOARD", "PACIENTES", "AGENDA", "PRESCRIÇÃO", "FATURAMENTO", "MOTOR", "EQUIPE", "AUDITORIA"].map((t, i) => (
          <button key={t} style={{
            background: i === 0 ? p.gold : "transparent",
            color: i === 0 ? p.navyDeep : p.inkDim,
            border: `1px solid ${i === 0 ? p.gold : p.border}`,
            padding: "6px 12px", fontFamily: fonte.familia, fontSize: 9,
            letterSpacing: ls.forte, fontWeight: 700, cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <StatH label="HOJE"      val="18 SESS." cor={p.cyan} />
        <StatH label="ADERÊNCIA" val="87%"      cor="#5FE6CC" />
        <StatH label="RECEITA"   val="R$ 41.8K" cor={p.gold} />
      </div>
    </header>
  );
}

function StatH({ label, val, cor }: { label: string; val: string; cor: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte }}>{label}</div>
      <div style={{ fontSize: 14, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{val}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   RÉGUA DE ADERÊNCIA · barras coloridas 30d (DNA do print)
   ──────────────────────────────────────────────────────── */
function RegruaAderencia() {
  // 30 dias · alturas variando, cores: <70 vermelho, 70-85 amarelo, >85 verde
  const dias = [78, 82, 85, 90, 88, 92, 94, 91, 87, 89, 93, 95, 91, 88, 84, 86, 90, 92, 94, 91, 89, 87, 90, 93, 95, 92, 88, 91, 94, 92];
  const W = 270, gap = 1, barW = (W - 29 * gap) / 30, H = 70;
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
      <line x1={W * 0.92 / 100 * 100} y1={0} x2={W * 0.92 / 100 * 100} y2={H} stroke={p.gold} strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────
   FILA CARD · queue lateral colorido
   ──────────────────────────────────────────────────────── */
function FilaCard({ titulo, cor, n, itens }: { titulo: string; cor: string; n: number; itens: string[] }) {
  return (
    <div style={{ background: p.navyDeep, borderTop: `3px solid ${cor}`, padding: "10px 12px", minHeight: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>{titulo}</span>
        <span style={{ fontSize: 18, color: cor, fontWeight: 700, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums" }}>{n}</span>
      </div>
      {itens.map((it, i) => (
        <div key={i} style={{
          fontSize: 10, color: p.ink, padding: "6px 8px",
          borderLeft: `2px solid ${cor}55`, marginBottom: 4,
          letterSpacing: ls.suave, background: it.includes("⚠") ? "rgba(255,154,154,0.06)" : "transparent",
        }}>{it}</div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   BARRAS FATURAMENTO · 31 dias (alturas + meta diária)
   ──────────────────────────────────────────────────────── */
function BarrasFat() {
  const dias = [18, 22, 24, 19, 26, 12, 8, 28, 32, 30, 28, 34, 14, 10, 36, 38, 35, 32, 40, 18, 12, 38, 42, 39, 41, 36, 42, 0, 0, 0, 0];
  const W = 1240, gap = 4, barW = (W - 30 * gap) / 31, H = 110, meta = 28;
  return (
    <svg width={W} height={H + 20} style={{ display: "block" }}>
      <line x1={0} x2={W} y1={H - (meta / 50) * H} y2={H - (meta / 50) * H}
        stroke={p.gold} strokeDasharray="3,3" strokeWidth={0.8} opacity={0.5} />
      <text x={W - 4} y={H - (meta / 50) * H - 4} textAnchor="end" fontSize={8} fill={p.gold}
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
                <text x={i * (barW + gap) + barW / 2} y={H + 14} textAnchor="middle" fontSize={9}
                  fill={p.gold} fontFamily={fonte.familia} letterSpacing={ls.forte} fontWeight={700}>HOJE</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
