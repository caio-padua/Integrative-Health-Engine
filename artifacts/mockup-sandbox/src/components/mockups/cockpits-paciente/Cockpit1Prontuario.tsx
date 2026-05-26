import { CockpitShell, HeaderPaciente, BlocoCockpit, KpiMini, Sparkline, Gantt, ChipStatus, corBloco, p, ls, fonte } from "./_pecasCockpit";

/**
 * COCKPIT 1 · PRONTUÁRIO LONGO
 * Fiel ao anexo 3. Blocos empilhados verticalmente. Cada um se "valida" sobre o anterior.
 * Linguagens: KPIs coloridos por terço · Gantt de protocolo · Tabela densa de sessões.
 */
export function Cockpit1Prontuario() {
  return (
    <CockpitShell>
      <HeaderPaciente />

      {/* ═══ BLOCO 1: IDENTIDADE & VÍNCULO ═══ */}
      <BlocoCockpit sigla="IDV" titulo="IDENTIDADE & VÍNCULO" cor={corBloco.identidade} status="COMPLETA · 17/MAI/1982">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
          <CampoTexto label="NOME" valor="Graco Souza Pádua" />
          <CampoTexto label="NASCIMENTO" valor="17/MAI/1982 · 43A" />
          <CampoTexto label="SEXO" valor="Masculino" />
          <CampoTexto label="ESTADO CIVIL" valor="Casado" />
          <CampoTexto label="CPF" valor="127.395.408-12" />
          <CampoTexto label="TELEFONE" valor="(11) 97443-4554" />
          <CampoTexto label="EMAIL" valor="graco.padua@email.com" />
          <CampoTexto label="PROFISSÃO" valor="Empresário" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <ListaTags titulo="ALERGIAS" tags={["Penicilina"]} cor="#FF9A9A" />
          <ListaTags titulo="MEDICAMENTOS EM USO" tags={["Atorvastatina"]} cor={p.gold} />
          <ListaTags titulo="COMORBIDADES" tags={["Hipertensão", "Diabetes Tipo 2", "Dislipidemia"]} cor="#FFA3C8" />
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 2: ANAMNESE & SINAIS ═══ */}
      <BlocoCockpit sigla="ANS" titulo="ANAMNESE & SINAIS" cor={corBloco.anamnese} status="ATUALIZADA · HOJE" statusCor="#FFA3C8">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div>
            <CampoBloco titulo="QUEIXA PRINCIPAL"
              texto="Cansaço crônico há 6 meses · libido reduzida · insônia de manutenção." />
            <CampoBloco titulo="HISTÓRIA DA DOENÇA ATUAL"
              texto="Quadro insidioso, progressivo. Estresse laboral alto (CEO). Sono não-reparador. Apetite preservado, peso estável." />
            <CampoBloco titulo="HÁBITOS"
              texto="Atividade física 3×/sem (musculação). Álcool social. Não fuma. 6-7h sono/noite." />
            <CampoBloco titulo="EXAMES RECENTES"
              texto="Vit D 18 ng (baixa) · B12 520 pg (ok) · Cortisol 8h 12 mcg (baixo) · Testosterona total 380 ng (limite inferior)." />
          </div>
          <div>
            <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 8 }}>SINAIS QUANTIFICADOS</div>
            {[
              { lab: "FADIGA",        v: 7, cor: "#FF9A9A" },
              { lab: "SONO",          v: 4, cor: "#F5C97A" },
              { lab: "LIBIDO",        v: 3, cor: "#FF9A9A" },
              { lab: "HUMOR",         v: 6, cor: "#F5C97A" },
              { lab: "DISPOSIÇÃO AM", v: 4, cor: "#F5C97A" },
              { lab: "FOCO COGNITIVO",v: 5, cor: "#F5C97A" },
            ].map((s) => (
              <div key={s.lab} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: p.inkDim, letterSpacing: ls.forte, width: 110 }}>{s.lab}</span>
                <div style={{ flex: 1, height: 8, background: p.borderSoft, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${s.v * 10}%`, background: s.cor, boxShadow: `0 0 6px ${s.cor}` }} />
                </div>
                <span style={{ fontSize: 10, color: s.cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 32, textAlign: "right" }}>{s.v}/10</span>
              </div>
            ))}
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 3: PRESCRIÇÃO & PROTOCOLO ═══ */}
      <BlocoCockpit sigla="RX" titulo="PRESCRIÇÃO & PROTOCOLO" cor={corBloco.prescricao} status="SUGESTÃO MOTOR · 6 ITENS" statusCor={corBloco.prescricao}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["FICHA", "TIMELINE", "RX"].map((t, i) => (
            <button key={t} style={{
              background: i === 2 ? corBloco.prescricao : "transparent",
              color: i === 2 ? p.navyDeep : p.inkDim,
              border: `1px solid ${i === 2 ? corBloco.prescricao : p.border}`,
              padding: "5px 14px", fontSize: 9, letterSpacing: ls.forte, fontWeight: 700,
              fontFamily: fonte.familia, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          <CardItem nome="NAD+ Endovenoso" via="EV · ENDOVENOSO" dose="1× sem · 8h · Sb âncora" cor="#5FE6CC" valor="R$ 2.700,00" />
          <CardItem nome="CoQ10 Ubiquinol + PQQ" via="IM · INTRAMUSCULAR" dose="1× sem · 8h · Sb âncora" cor={p.gold} valor="R$ 1.450,00" />
          <CardItem nome="Subcutâneo Vit C" via="SC · SUBCUTÂNEO" dose="3× sem · 8h · Sb âncora" cor="#FF9A9A" valor="R$ 850,00" />
          <CardItem nome="Fórmula Bland Menopausa" via="VO · VIA ORAL" dose="2× dia · Sb âncora" cor="#FFA3C8" valor="R$ 13.460,00" />
        </div>

        <div style={{ background: p.navyDeep, padding: 14, border: `1px solid ${p.border}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: corBloco.prescricao, letterSpacing: ls.forte, fontWeight: 700 }}>RX EDITOR · Fórmula Bland Menopausa</span>
            <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.suave }}>magistral · 30 dias</span>
          </div>
          <table style={{ width: "100%", fontSize: 10, color: p.inkDim, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${p.border}`, color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>SUBSTÂNCIA</th>
                <th style={{ textAlign: "right", padding: "4px 6px" }}>DOSE</th>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>VIA</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["DHEA Micronizado", "25 mg", "VO"],
                ["Pregnenolona", "30 mg", "VO"],
                ["Resveratrol Trans-puro", "150 mg", "VO"],
                ["Vitex Agnus-Castus EP", "100 mg", "VO"],
                ["Magnésio Bisglicinato", "300 mg", "VO"],
              ].map(([s, d, v]) => (
                <tr key={s} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                  <td style={{ padding: "5px 6px", color: p.ink }}>{s}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: corBloco.prescricao, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d}</td>
                  <td style={{ padding: "5px 6px" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 4: TIMELINE GANTT 8 SEMANAS ═══ */}
      <BlocoCockpit sigla="TML" titulo="TIMELINE · CICLO 1 · 8 SEMANAS" cor={corBloco.timeline} status="EM CURSO · SEM 3 DE 8" statusCor={corBloco.timeline}>
        <div style={{ overflow: "auto" }}>
          <Gantt linhas={[
            { nome: "NAD+ ENDOVENOSO",         cor: "#5FE6CC", faixas: [{ de: 0, ate: 8 }], valor: "R$ 2.700,00" },
            { nome: "CoQ10 + PQQ INTRAMUSC.",  cor: p.gold,    faixas: [{ de: 0, ate: 8 }], valor: "R$ 1.450,00" },
            { nome: "FÓRMULA BLAND MENOPAUSA", cor: "#FFA3C8", faixas: [{ de: 0, ate: 4 }, { de: 5, ate: 8 }], valor: "R$ 13.460,00" },
            { nome: "CONSULTA DR. PÁDUA",      cor: "#9CC2EA", faixas: [{ de: 3, ate: 4 }], valor: "" },
            { nome: "ENCAMINHAMENTO LABORAT.", cor: "#A89DFF", faixas: [{ de: 6, ate: 7 }], valor: "" },
          ]} semanas={8} />
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: p.navyDeep, border: `1px solid ${p.gold}` }}>
          <span style={{ fontSize: 11, color: p.inkMute, letterSpacing: ls.forte }}>TOTAL CICLO</span>
          <span style={{ fontSize: 22, color: p.gold, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>R$ 16.510,00</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btnOutline(p.danger)}>CANCELAR</button>
            <button style={btnOutline("#5FE6CC")}>SALVAR RASCUNHO</button>
            <button style={btnOutline(p.gold)}>VALIDAR MÉDICO</button>
            <button style={btnSolid(corBloco.prescricao)}>EMITIR PROTOCOLO ▸</button>
          </div>
        </div>
      </BlocoCockpit>

      {/* ═══ BLOCO 5: HISTÓRICO DE SESSÕES ═══ */}
      <BlocoCockpit sigla="HST" titulo="HISTÓRICO DE SESSÕES" cor={corBloco.historico} status="48 SESSÕES · 12M" statusCor={corBloco.historico}>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${p.gold}`, color: p.inkMute, letterSpacing: ls.forte, fontSize: 9 }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>SESSÃO</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>DATA</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>STATUS</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>VALOR</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>OBSERVAÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["S03", "12/JAN/2026", "OK",      "R$ 3.200", "Sem intercorrências · acessos EV bom",     "#5FE6CC"],
              ["S02", "26/JAN/2026", "OK",      "R$ 3.200", "Paciente relatou melhora libido +2pt",      "#5FE6CC"],
              ["S01", "09/FEV/2026", "ATIVA",   "R$ 3.200", "Hoje · adicionado CoQ10 IM (cansaço)",     p.gold],
            ].map(([id, data, st, val, obs, cor]) => (
              <tr key={id} style={{ borderBottom: `1px solid ${p.borderSoft}` }}>
                <td style={{ padding: "8px", color: p.gold, letterSpacing: ls.forte, fontWeight: 700 }}>{id}</td>
                <td style={{ padding: "8px", color: p.inkDim, fontVariantNumeric: "tabular-nums" }}>{data}</td>
                <td style={{ padding: "8px" }}><ChipStatus texto={st as string} cor={cor as string} /></td>
                <td style={{ padding: "8px", color: p.ok, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{val}</td>
                <td style={{ padding: "8px", color: p.ink, fontStyle: "italic" }}>{obs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BlocoCockpit>
    </CockpitShell>
  );
}

function CampoTexto({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: p.ink, padding: "8px 10px", background: p.navyDeep, border: `1px solid ${p.border}`, letterSpacing: ls.suave }}>{valor}</div>
    </div>
  );
}
function ListaTags({ titulo, tags, cor }: { titulo: string; tags: string[]; cor: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 6 }}>{titulo}</div>
      <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: "8px 10px", minHeight: 60, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map((t) => (
          <span key={t} style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}55`, padding: "3px 9px", fontSize: 9, letterSpacing: ls.forte, fontWeight: 700 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
function CampoBloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 11, color: p.ink, padding: "8px 10px", background: p.navyDeep, border: `1px solid ${p.border}`, letterSpacing: ls.suave, lineHeight: 1.5 }}>{texto}</div>
    </div>
  );
}
function CardItem({ nome, via, dose, cor, valor }: { nome: string; via: string; dose: string; cor: string; valor: string }) {
  return (
    <div style={{ background: p.navyDeep, borderTop: `3px solid ${cor}`, padding: "10px 12px" }}>
      <div style={{ fontSize: 8, color: cor, letterSpacing: ls.forte, marginBottom: 4 }}>{via}</div>
      <div style={{ fontSize: 12, color: p.ink, fontWeight: 700, letterSpacing: ls.suave, marginBottom: 4 }}>{nome}</div>
      <div style={{ fontSize: 9, color: p.inkDim, letterSpacing: ls.suave, marginBottom: 8 }}>{dose}</div>
      <div style={{ fontSize: 13, color: cor, letterSpacing: ls.forte, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
    </div>
  );
}
function btnOutline(cor: string) {
  return { background: "transparent", color: cor, border: `1px solid ${cor}`, padding: "6px 14px", fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, cursor: "pointer" };
}
function btnSolid(cor: string) {
  return { background: cor, color: p.navyDeep, border: "none", padding: "6px 14px", fontSize: 9, letterSpacing: ls.forte, fontWeight: 700, fontFamily: fonte.familia, cursor: "pointer" };
}
