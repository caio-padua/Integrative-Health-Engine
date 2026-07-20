import { useState, useEffect, useCallback } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

// ─── GOOGLE FONTS ─────────────────────────────────────────────────────────────
function useGoogleFonts() {
  useEffect(() => {
    const id = "cmpadcom-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ─── PALETA PAPER CIANO (PENUMBRA FACE CLARA) ─────────────────────────────────
// Exatamente a paleta do layout branco aprovado (penumbra-claro.ts).
// Fundo = #EEF2F4 (cinza-azul clarinho = "bege" que o CEO reconhece).
// Painéis = progressivamente mais claros → branco limpo.
// Acento = ciano #1E7A6E (cor oficial Penumbra Paper Ciano).
const N = {
  bg:   "#EEF2F4",   // fundo — paper ciano base

  // Painéis — escala do ligeiramente cinza ao quase branco
  d6:   "#E4EBF0",
  d5:   "#E8EEF2",
  d4:   "#ECF1F4",
  d3:   "#F0F4F7",
  d2:   "#F3F6F9",
  d1:   "#F6F9FB",
  sur:  "#F8FBFC",
  hi:   "#FBFCFD",

  // Acento — ciano oficial Penumbra Clara
  ax:   "#1E7A6E",
  axL:  "#2A9A8C",
  axX:  "#3ABAB0",

  // Texto — escuro sobre fundo claro
  t1:   "#0F1A1F",
  t2:   "#3F5258",
  t3:   "#6E8088",

  // Borda
  b1:   "#D2DCE0",
  b2:   "#B8C4CA",
  b3:   "#A4B4BC",
  bHi:  "#1E7A6E",

  // ── SOMBRAS 3D — APENAS EDGE SHARP, ZERO BLUR ────────────────────────────
  // Blurs grandes (0 26px 50px etc.) se propagavam além da borda do painel
  // e "manchavam" o painel adjacente, criando sobreposição visual indesejada.
  // Fix: apenas linhas de offset fixo com blur=0 → espessura física limpa.
  // Quina superior = linha branca inset (iluminação de cima).
  // Face lateral = linha de sombra escura discreta.
  e1: [
    "0 1px 0 0 rgba(255,255,255,0.90) inset",
    "0 6px 0 0 #8A9CA8",
    "0 7px 0 0 #7A8E9A",
  ].join(", "),

  e2: [
    "0 1px 0 0 rgba(255,255,255,0.90) inset",
    "0 10px 0 0 #8A9CA8",
    "0 11px 0 0 #7A8E9A",
    "0 12px 0 0 #6E8490",
  ].join(", "),

  e3: [
    "0 1px 0 0 rgba(255,255,255,0.90) inset",
    "0 16px 0 0 #8A9CA8",
    "0 17px 0 0 #7A8E9A",
    "0 18px 0 0 #6E8490",
    "0 19px 0 0 #607880",
  ].join(", "),

  r: "2px",
};

// Fontes
const SERIF: React.CSSProperties = { fontFamily:"'Cormorant Garamond', Georgia, serif" };
const SANS:  React.CSSProperties = { fontFamily:"'Inter', system-ui, sans-serif" };
const MONO:  React.CSSProperties = { fontFamily:"'JetBrains Mono', ui-monospace, monospace" };

// ─── TIPOGRAFIA ────────────────────────────────────────────────────────────────
interface TL { family:string; size:number; weight:number; italic:boolean }
interface TC { display:TL; heading:TL; subhead:TL; body:TL; label:TL; number:TL; caption:TL }

const TD: TC = {
  display: { family:"Cormorant Garamond", size:42, weight:600, italic:false },
  heading: { family:"Cormorant Garamond", size:24, weight:600, italic:false },
  subhead: { family:"Cormorant Garamond", size:17, weight:400, italic:true  },
  body:    { family:"Inter",              size:15, weight:400, italic:false },
  label:   { family:"Inter",             size:12, weight:600, italic:false },
  number:  { family:"JetBrains Mono",    size:18, weight:700, italic:false },
  caption: { family:"Inter",             size:11, weight:400, italic:false },
};

const LEVELS: Array<{k:keyof TC; l:string; d:string}> = [
  { k:"display", l:"Título Principal",  d:"Grande destaque — masthead, abertura de seção" },
  { k:"heading", l:"Título de Seção",   d:"Cabeçalho de painel, cargo, capítulo" },
  { k:"subhead", l:"Subtítulo",         d:"Segunda linha, tagline, ementa" },
  { k:"body",    l:"Corpo de Texto",    d:"Descrição, narrativa, orientação ao usuário" },
  { k:"label",   l:"Rótulo de Campo",   d:"Label de formulário, badge (geralmente MAIÚSCULO)" },
  { k:"number",  l:"Número / KPI",      d:"Valor métrico grande, SLA, contador" },
  { k:"caption", l:"Legenda / Nota",    d:"Metadados, SHA, timestamps, rodapé técnico" },
];

const FAMÍLIAS = [
  "Cormorant Garamond","Inter","JetBrains Mono",
  "Georgia","Palatino Linotype","Times New Roman",
  "Trebuchet MS","Verdana","Arial","Courier New",
];

function tCSS(t:TL): React.CSSProperties {
  const isMono  = t.family.toLowerCase().includes("mono") || t.family.toLowerCase().includes("courier");
  const isSerif = ["Garamond","Georgia","Palatino","Times","Baskerville"].some(s => t.family.includes(s));
  return {
    fontFamily:`'${t.family}', ${isMono?"ui-monospace,monospace":isSerif?"Georgia,serif":"system-ui,sans-serif"}`,
    fontSize:t.size, fontWeight:t.weight, fontStyle:t.italic?"italic":"normal",
  };
}

// ─── PAINEL 3D ─────────────────────────────────────────────────────────────────
// Efeito central: borda superior iluminada (quina reta) + face lateral dura +
// sombra longa projetada sobre o plano abaixo.
// nivel 1 = 6px · nivel 2 = 10px · nivel 3 = 16px de espessura
function P3D({
  children, nv=1, style, bg, head,
}: {
  children?:React.ReactNode; nv?:1|2|3;
  style?:React.CSSProperties; bg?:string; head?:React.ReactNode;
}) {
  const bgMap  = [N.d2, N.d1, N.sur]  as const;
  const sMap   = [N.e1, N.e2, N.e3]   as const;
  const bdrMap = [N.b2, N.b3, N.bHi]  as const;

  // Gradiente: branco no topo → cor base do nível → sensação de superfície iluminada
  const gradientes = [
    `linear-gradient(180deg, #FFFFFF 0%, ${N.d2} 100%)`,
    `linear-gradient(180deg, #FFFFFF 0%, ${N.d1} 100%)`,
    `linear-gradient(180deg, #FFFFFF 0%, ${N.sur} 100%)`,
  ] as const;

  return (
    <div style={{
      position:"relative",
      background: bg ?? gradientes[nv-1],
      borderRadius: N.r,
      border: `1px solid ${bdrMap[nv-1]}`,
      // Quina superior branca = luz vindo de cima (fundo claro)
      borderTop: `1px solid rgba(255,255,255,0.95)`,
      boxShadow: sMap[nv-1],
      overflow:"hidden",
      ...style,
    }}>
      {head && (
        <div style={{
          background:`linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)`,
          borderBottom:`1px solid ${bdrMap[nv-1]}`,
          padding:"16px 24px",
        }}>{head}</div>
      )}
      {children}
    </div>
  );
}

// ─── SEED ─────────────────────────────────────────────────────────────────────
const CAT = [
  { id:1,  cod:"agente_administrativo_01", nome:"Agente Administrativo Presencial", fn:"Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente.",                  cargo:"ADMINISTRATIVO", mod:"presencial", sla:2,  veto:["Dúvidas clínicas","Valores de fórmulas","Decisões de desconto","Cancelamento de protocolos"] },
  { id:2,  cod:"agente_administrativo_02", nome:"Agente Administrativo Remoto",     fn:"Confirmação de consultas D-1, reagendamentos e suporte pré-atendimento.",                                        cargo:"ADMINISTRATIVO", mod:"remoto",     sla:2,  veto:["Agendamentos novos","Dúvidas clínicas","Cancelamento definitivo sem aprovação"] },
  { id:3,  cod:"agente_enfermagem_01",     nome:"Agente Enfermagem Presencial",     fn:"Comunicação pós-sessão presencial, orientações de cuidado, envio do código de validação.",                       cargo:"ENFERMAGEM",     mod:"presencial", sla:36, veto:["Alterar protocolo","Dar prazo para sintomas sem avaliar","Decidir condutas novas"] },
  { id:4,  cod:"agente_enfermagem_02",     nome:"Agente Enfermagem Auditoria",      fn:"Auditoria oculta do pós-sessão. Verifica se o paciente recebeu cuidado adequado.",                               cargo:"ENFERMAGEM",     mod:"remoto",     sla:36, veto:["Revelar que é auditoria","Orientar condutas clínicas","Tomar decisões"] },
  { id:5,  cod:"agente_consultor_01",      nome:"Agente Consultor Presencial",      fn:"Suporte técnico clínico presencial — orienta sobre fórmulas, exames, avaliação clínica.",                        cargo:"CONSULTOR",      mod:"presencial", sla:36, veto:["Prescrever","Alterar protocolo","Decidir condutas novas"] },
  { id:6,  cod:"agente_consultor_02",      nome:"Agente Consultor Remoto",          fn:"Follow-up semanal de evolução, reativação de pacientes parados.",                                                 cargo:"CONSULTOR",      mod:"remoto",     sla:36, veto:["Orientar condutas clínicas","Decidir sobre protocolo","Alterar prescrição"] },
  { id:7,  cod:"agente_supervisor_01",     nome:"Agente Supervisor Operacional",    fn:"Controle operacional interno — cobra SLA (Acordo de Nível de Serviço), registra advertências, escalona.",        cargo:"SUPERVISOR",     mod:"remoto",     sla:24, veto:["Falar com paciente","Decidir questões clínicas","Aprovar descontos"] },
  { id:8,  cod:"agente_supervisor_02",     nome:"Agente Supervisor Auditor",        fn:"Auditoria oculta da qualidade dos atendimentos. Pesquisa de satisfação disfarçada.",                             cargo:"SUPERVISOR",     mod:"remoto",     sla:24, veto:["Revelar que é auditoria","Fazer pressão","Influenciar respostas"] },
  { id:9,  cod:"agente_financeiro_01",     nome:"Agente Financeiro",                fn:"Cobranças, acordos, nota fiscal, inadimplência e renovações financeiras.",                                       cargo:"FINANCEIRO",     mod:"remoto",     sla:24, veto:["Decidir descontos acima de 15%","Cancelar protocolos","Emitir boletos sem aprovação"] },
  { id:10, cod:"agente_ouvidoria_01",      nome:"Agente Ouvidoria",                 fn:"Canal confidencial para reclamações, sugestões e insatisfações. Protege a identidade.",                          cargo:"OUVIDORIA",      mod:"remoto",     sla:24, veto:["Revelar identidade do reclamante","Tomar decisão punitiva","Minimizar reclamação"] },
];

const NARRAÇÕES = [
  { id:1, cod:"agente_administrativo_01", tit:"Novo paciente quer agendar consulta",   tag:"Novo Lead",   msgs:[{l:"pac",t:"Quero marcar uma consulta com o Dr. Caio"},{l:"ag",t:"Será um prazer organizar o seu agendamento.\n\nQual unidade fica melhor?\n  Tatuapé · Alphaville · Guaxupé\n\nQual o seu nome completo?"}] },
  { id:2, cod:"agente_administrativo_01", tit:"Paciente pergunta sobre plano de saúde",tag:"Dúvida",      msgs:[{l:"pac",t:"Aceita plano de saúde?"},{l:"ag",t:"A clínica atende exclusivamente de forma particular.\n\nIsso permite consultas sem limite de tempo e protocolos completamente personalizados.\n\nPosso ajudar a agendar?"}] },
  { id:3, cod:"agente_administrativo_02", tit:"Confirmação de consulta D-1",           tag:"Confirmação", msgs:[{l:"ag",t:"Confirmo seu atendimento de amanhã:\nUnidade: Tatuapé · 09h00\n\n1 — Confirmo\n2 — Preciso reagendar"},{l:"pac",t:"1"},{l:"ag",t:"Perfeito. Te esperamos amanhã às 09h00."}] },
  { id:4, cod:"agente_enfermagem_01",     tit:"Orientações pós-aplicação",             tag:"Pós-sessão",  msgs:[{l:"ag",t:"João, seu procedimento foi realizado conforme protocolo.\n\n· Hidratação — ao menos 2L de água hoje\n· Esforço físico — evite por 24 horas\n· Alimentação — refeições leves, sem álcool\n\nQualquer desconforto, me avise imediatamente."}] },
  { id:5, cod:"agente_enfermagem_02",     tit:"Auditoria — tontura relatada",          tag:"Auditoria",   msgs:[{l:"ag",t:"Bom dia. Sou da equipe de acompanhamento.\nComo você está após a sessão de ontem?"},{l:"pac",t:"Fiquei com um pouco de tontura logo depois"},{l:"ag",t:"Obrigado por me contar. Encaminharei para a equipe clínica avaliar. Alguém entrará em contato em breve."}] },
  { id:6, cod:"agente_consultor_01",      tit:"Dúvida sobre exame G6PD",               tag:"Técnica",     msgs:[{l:"pac",t:"Preciso fazer o exame G6PD antes do IV?"},{l:"ag",t:"Sim, o G6PD (Glicose-6-Fosfato Desidrogenase) é necessário antes da Vitamina C intravenosa. Qualquer laboratório realiza. Posso orientar sobre onde?"}] },
  { id:7, cod:"agente_consultor_02",      tit:"Follow-up semanal — semana 4",          tag:"Follow-up",   msgs:[{l:"ag",t:"Acompanhamento da 4ª semana de tratamento.\n\nComo tem se sentido?\n· Energia · Sono · Disposição geral"},{l:"pac",t:"Muito melhor, dormindo bem"},{l:"ag",t:"Exatamente o esperado nesta fase. Próximo retorno em 2 semanas."}] },
  { id:8, cod:"agente_financeiro_01",     tit:"Cobrança de parcela vencida",           tag:"Financeiro",  msgs:[{l:"ag",t:"Parcela do protocolo venceu em 10/04.\nValor: R$ 450,00\n\n· Pix · Cartão · Boleto\n\nQual opção fica melhor?"},{l:"pac",t:"Estou com problema no cartão"},{l:"ag",t:"Posso gerar Pix com QR Code agora. Deseja?"}] },
  { id:9, cod:"agente_ouvidoria_01",      tit:"Reclamação de atendimento",             tag:"Ouvidoria",   msgs:[{l:"pac",t:"Fui mal atendida. A enfermeira foi grossa."},{l:"ag",t:"Obrigado por trazer isso. Levamos cada relato a sério.\n\nEm qual unidade? Data aproximada?"},{l:"pac",t:"Hoje, Tatuapé"},{l:"ag",t:"Registrado com total sigilo. Retorno da direção em até 48 horas."}] },
];

const CARGO_ORD = ["ADMINISTRATIVO","ENFERMAGEM","CONSULTOR","SUPERVISOR","FINANCEIRO","OUVIDORIA"];

const FLUXO = [
  { n:"01", t:"Gatilho",              d:"Consulta confirmada · Sessão realizada · SLA vencido · Auditoria programada" },
  { n:"02", t:"Motor de Eventos",     d:"Avalia qual agente atua com base no tipo de evento e cargo responsável" },
  { n:"03", t:"Busca de Contexto",    d:"Dados do paciente + sessão + histórico de conversas + memórias contextuais" },
  { n:"04", t:"Motor de Escrita",     d:"Template + contexto + ação + regras (máx. 2 frases/bloco, quebra obrigatória)" },
  { n:"05", t:"Validação Humana",     d:"Se requerValidacaoHumana=true → fila de aprovação → aprovador libera → disparo", x:"Condicional" },
  { n:"06", t:"Disparo",              d:"WhatsApp via Twilio/Gupshup · E-mail via Gmail API · SLA (Acordo Nível Serviço) iniciado" },
  { n:"07", t:"Resposta do Paciente", d:"Motor analisa resposta → narrativa correta → ou escalada para supervisor" },
  { n:"08", t:"Log e Memória",        d:"Grava em execucoes_agente + memorias_contextuais_agente + estado de prontidão" },
];

const GAPS = [
  { s:"Crítico", t:"Motor de Disparo",         d:"Nenhum agente dispara WhatsApp real — campo podeEnviarWhatsapp=true existe mas não tem executor" },
  { s:"Crítico", t:"Worker de Execução",       d:"Tabela execucoes_agente existe mas o consumer (listener de eventos) não foi construído" },
  { s:"Alta",    t:"Fila de Validação Humana", d:"validacoes_humanas_agente existe sem interface de aprovação no frontend" },
  { s:"Alta",    t:"Motor de Memórias",        d:"memorias_contextuais_agente existe sem lógica de gravação e recuperação por paciente" },
  { s:"Média",   t:"Consumer de Eventos",      d:"eventos_saida_operacionais existe sem consumer que processa os eventos disparados" },
];

const ABAS = ["Catálogo de Agentes","Narrativas","Capacidades","Personalidade","Fluxo Operacional"];

// ─── SELETOR DE TIPOGRAFIA ────────────────────────────────────────────────────
function TypoSelector({ tc, set }: { tc:TC; set:(t:TC)=>void }) {
  const upd = useCallback((k:keyof TC, f:string, v:unknown) => set({ ...tc, [k]: { ...tc[k], [f]:v } }), [tc, set]);

  const baixar = () => {
    const md = [
      "# Tipografia PAWARDS — Escolha Validada",
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      "",
      "| Nível | Família | Tamanho | Peso | Itálico |",
      "|-------|---------|---------|------|---------|",
      ...LEVELS.map(({ k, l }) => { const t=tc[k]; return `| ${l} | ${t.family} | ${t.size}px | ${t.weight} | ${t.italic?"Sim":"Não"} |`; }),
      "",
      "```typescript",
      "const TYPO = {",
      ...LEVELS.map(({ k }) => { const t=tc[k]; return `  ${k}: { family:"${t.family}", size:${t.size}, weight:${t.weight}, italic:${t.italic} },`; }),
      "};",
      "```",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md],{type:"text/markdown"}));
    a.download = `TIPOGRAFIA_PAWARDS_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.md`;
    a.click();
  };

  return (
    <P3D nv={3} style={{ marginBottom:28 }}
      head={
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <div style={{ ...SERIF, fontSize:26, fontWeight:600, color:N.t1 }}>Seleção Tipográfica ao Vivo</div>
          <div style={{ ...SANS, fontSize:11, color:N.t3, letterSpacing:"0.10em" }}>PAINEL DE CONFIGURAÇÃO</div>
        </div>
      }
    >
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        {/* Controles */}
        <div style={{ padding:"22px 26px", borderRight:`1px solid ${N.b2}` }}>
          {LEVELS.map(({ k, l, d }) => {
            const t = tc[k];
            return (
              <div key={k} style={{ marginBottom:20, paddingBottom:20, borderBottom:`1px solid ${N.b1}` }}>
                <div style={{ ...SANS, fontSize:12, fontWeight:700, color:N.axL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{l}</div>
                <div style={{ ...SANS, fontSize:11, color:N.t3, marginBottom:10 }}>{d}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 72px 42px", gap:6 }}>
                  <select value={t.family} onChange={e=>upd(k,"family",e.target.value)} style={{ ...SANS, fontSize:12, padding:"6px 8px", borderRadius:N.r, background:N.d4, color:N.t1, border:`1px solid ${N.b2}`, cursor:"pointer" }}>
                    {FAMÍLIAS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  <input type="number" min={8} max={72} value={t.size} onChange={e=>upd(k,"size",Number(e.target.value))} style={{ ...MONO, fontSize:12, padding:"6px", textAlign:"center", borderRadius:N.r, background:N.d4, color:N.axL, border:`1px solid ${N.b2}` }} />
                  <select value={t.weight} onChange={e=>upd(k,"weight",Number(e.target.value))} style={{ ...SANS, fontSize:12, padding:"6px 8px", borderRadius:N.r, background:N.d4, color:N.t1, border:`1px solid ${N.b2}`, cursor:"pointer" }}>
                    {[300,400,500,600,700].map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                  <button onClick={()=>upd(k,"italic",!t.italic)} style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:14, fontWeight:700, background:t.italic?N.ax:N.d4, color:t.italic?"#FFF":N.t3, border:`1px solid ${t.italic?N.ax:N.b2}`, borderRadius:N.r, cursor:"pointer" }}>I</button>
                </div>
              </div>
            );
          })}
          <button onClick={baixar} style={{ ...SANS, fontSize:12, fontWeight:700, width:"100%", padding:"13px", background:N.ax, color:"#FFF", border:"none", borderRadius:N.r, cursor:"pointer", letterSpacing:"0.06em", boxShadow:N.e1 }}>
            Baixar como .md — Documentar Tipografia
          </button>
        </div>
        {/* Prévia ao vivo */}
        <div style={{ padding:"30px 26px", background:N.d5, display:"flex", flexDirection:"column", gap:22 }}>
          <div style={{ borderBottom:`1px solid ${N.b1}`, paddingBottom:22 }}>
            <div style={{ ...tCSS(tc.display), color:N.t1, lineHeight:1.1, marginBottom:10 }}>Constituição dos Agentes Virtuais</div>
            <div style={{ ...tCSS(tc.subhead), color:N.t2 }}>Carta Magna PADCOM · Edição 001 · 19/07/2026</div>
          </div>
          <div style={{ borderBottom:`1px solid ${N.b1}`, paddingBottom:22 }}>
            <div style={{ ...tCSS(tc.heading), color:N.axL, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>Administrativo — 2 Agentes</div>
            <div style={{ ...tCSS(tc.body), color:N.t2, lineHeight:1.80 }}>Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente com a estrutura de atendimento.</div>
          </div>
          <div style={{ borderBottom:`1px solid ${N.b1}`, paddingBottom:22 }}>
            <div style={{ ...tCSS(tc.label), color:N.t3, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>SLA Padrão por Cargo</div>
            <div style={{ ...tCSS(tc.number), color:N.ax, fontVariantNumeric:"tabular-nums" }}>2h · 36h · 24h</div>
          </div>
          <div style={{ ...tCSS(tc.caption), color:N.t3, letterSpacing:"0.06em" }}>SHA: 43d2765d · Documento: TSUNAMI 26.07.19 · Classificação: Restrito</div>
        </div>
      </div>
    </P3D>
  );
}

// ─── ABA 1 — CATÁLOGO ─────────────────────────────────────────────────────────
// Grupos sobrepostos: marginTop negativo + z-index decrescente.
// A sombra e3 de cada painel cai sobre o painel abaixo.
function TabCatalogo({ lista, tc }: { lista:typeof CAT; tc:TC }) {
  const [exp, setExp] = useState<number|null>(null);
  const gp = CARGO_ORD.filter(c => lista.some(a => a.cargo === c));
  const n  = gp.length;
  return (
    <div style={{ position:"relative" }}>
      {gp.map((cargo, gi) => {
        const ags = lista.filter(a => a.cargo === cargo);
        return (
          <div key={cargo} style={{ position:"relative", zIndex: n - gi + 1, marginTop: gi === 0 ? 0 : -14 }}>
            <P3D nv={2}
              head={
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                    <div style={{
                      ...MONO, fontSize:14, fontWeight:900, color:"#FFF",
                      background:N.ax, width:44, height:44, borderRadius:N.r,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:N.e1, fontVariantNumeric:"tabular-nums", flexShrink:0,
                    }}>{String(gi+1).padStart(2,"0")}</div>
                    <div>
                      <div style={{ ...tCSS(tc.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.08em" }}>{cargo}</div>
                      <div style={{ ...tCSS(tc.caption), color:N.t3, marginTop:3 }}>{ags.length} agente{ags.length>1?"s":""}</div>
                    </div>
                  </div>
                  <div style={{ ...MONO, fontSize:16, fontWeight:700, color:N.ax, fontVariantNumeric:"tabular-nums" }}>SLA {ags[0]?.sla}h</div>
                </div>
              }
            >
              <div style={{ padding:"18px 24px", display:"flex", flexDirection:"column", gap:12 }}>
                {ags.map((ag, ai) => {
                  const isExp = exp === ag.id;
                  return (
                    <P3D key={ag.id} nv={1} style={{ cursor:"pointer", outline:isExp?`2px solid ${N.ax}`:"none", outlineOffset:"-2px" }}>
                      <div onClick={()=>setExp(isExp?null:ag.id)} style={{ padding:"15px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <div style={{
                            ...MONO, fontSize:12, fontWeight:900, color:N.axL,
                            background:N.d4, border:`1px solid ${N.b3}`,
                            padding:"5px 12px", borderRadius:N.r, letterSpacing:"0.06em",
                            flexShrink:0, fontVariantNumeric:"tabular-nums",
                          }}>{`${String(gi+1).padStart(2,"0")}.${String(ai+1).padStart(2,"0")}`}</div>
                          <div>
                            <div style={{ ...tCSS(tc.body), color:N.t1, fontWeight:600 }}>{ag.nome}</div>
                            <div style={{ ...tCSS(tc.caption), color:N.t3, marginTop:4 }}>{ag.cod}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <span style={{ ...MONO, fontSize:12, color:N.t3 }}>{ag.mod==="presencial"?"▶":"◀"} {ag.mod}</span>
                          <span style={{ ...MONO, fontSize:14, color:N.t3 }}>{isExp?"▾":"▸"}</span>
                        </div>
                      </div>
                      {isExp && (
                        <div style={{ borderTop:`1px solid ${N.b1}`, padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                          <P3D nv={1} style={{ padding:"14px 18px" }}>
                            <div style={{ ...tCSS(tc.label), color:N.t3, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Função Principal</div>
                            <div style={{ ...tCSS(tc.body), color:N.t1, lineHeight:1.85 }}>{ag.fn}</div>
                          </P3D>
                          <P3D nv={1} style={{ padding:"14px 18px", borderLeft:`4px solid ${N.ax}55` }}>
                            <div style={{ ...tCSS(tc.label), color:N.axL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Vedações — Não Pode Fazer</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px" }}>
                              {ag.veto.map((v,j)=>(
                                <span key={j} style={{ ...tCSS(tc.caption), color:N.t2, background:N.d4, border:`1px solid ${N.b2}`, padding:"5px 14px", borderRadius:N.r }}>✕ {v}</span>
                              ))}
                            </div>
                          </P3D>
                        </div>
                      )}
                    </P3D>
                  );
                })}
              </div>
            </P3D>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABA 2 — NARRATIVAS ──────────────────────────────────────────────────────
function TabNarrativas({ tc }: { tc:TC }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(460px,1fr))", gap:22 }}>
      {NARRAÇÕES.map((n, idx) => {
        const ag = CAT.find(a => a.cod === n.cod);
        return (
          <P3D key={n.id} nv={2}
            head={
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ ...MONO, fontSize:11, color:N.t3, letterSpacing:"0.08em", marginBottom:5 }}>{String(idx+1).padStart(3,"0")} · {ag?.cargo} · {ag?.nome}</div>
                  <div style={{ ...tCSS(tc.heading), color:N.t1 }}>{n.tit}</div>
                </div>
                <span style={{ ...MONO, fontSize:11, color:N.ax, background:N.d4, border:`1px solid ${N.b3}`, padding:"4px 12px", borderRadius:N.r, whiteSpace:"nowrap", marginTop:2 }}>{n.tag}</span>
              </div>
            }
          >
            <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
              {n.msgs.map((m, mi) => {
                const isPac = m.l === "pac";
                return (
                  <div key={mi} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ ...MONO, fontSize:11, fontWeight:700, minWidth:66, paddingTop:10, color:isPac?N.t3:N.axL, letterSpacing:"0.04em" }}>{isPac?"Paciente":"Agente"}</div>
                    <P3D nv={1} style={{ flex:1, padding:"10px 16px" }}>
                      <div style={{ ...tCSS(tc.body), color:isPac?N.t2:N.t1, lineHeight:1.80, whiteSpace:"pre-wrap" }}>{m.t}</div>
                    </P3D>
                  </div>
                );
              })}
            </div>
          </P3D>
        );
      })}
    </div>
  );
}

// ─── ABA 3 — CAPACIDADES ─────────────────────────────────────────────────────
function TabCapacidades({ tc }: { tc:TC }) {
  const CL = ["WhatsApp","E-mail","Criar Tarefa","Atualizar Tarefa","Ler Agenda","Ler Acomp.","Escalar","Req. Validação","Nunca Caso Vermelho","Prontuário","Agendar","Cód. Validação","Memória"];
  const CD: Record<string,boolean[]> = {
    agente_administrativo_01:[true,true,true,false,true,false,true,false,true,false,true,false,true],
    agente_administrativo_02:[true,false,false,true,true,false,true,false,true,false,false,false,true],
    agente_enfermagem_01:[true,false,true,false,false,true,true,true,true,false,false,true,true],
    agente_enfermagem_02:[true,false,false,true,false,true,true,true,true,false,false,false,true],
    agente_consultor_01:[true,false,true,false,false,true,true,true,true,true,false,false,true],
    agente_consultor_02:[true,false,true,false,false,true,true,false,true,false,false,false,true],
    agente_supervisor_01:[true,true,true,true,true,true,true,false,false,false,false,false,true],
    agente_supervisor_02:[true,false,false,true,true,false,true,false,true,false,false,false,true],
    agente_financeiro_01:[true,true,true,false,false,false,true,true,true,false,false,false,true],
    agente_ouvidoria_01:[true,true,true,false,false,false,true,true,true,false,false,false,true],
  };
  return (
    <P3D nv={2} head={<div style={{ ...tCSS(tc.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.06em" }}>Matriz de Capacidades — 10 Agentes × 13 Dimensões</div>}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"separate", borderSpacing:0, width:"100%" }}>
          <thead>
            <tr>
              <th style={{ ...SANS, fontSize:13, fontWeight:700, color:N.t2, padding:"12px 22px", background:N.d4, textAlign:"left", minWidth:230, borderBottom:`1px solid ${N.b2}` }}>Agente</th>
              {CL.map((l,i)=><th key={i} style={{ ...SANS, fontSize:10, fontWeight:400, color:N.t3, padding:"10px 8px", background:N.d4, writingMode:"vertical-rl", height:130, minWidth:38, borderBottom:`1px solid ${N.b2}` }}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {CAT.map((ag, ri)=>{
              const c = CD[ag.cod]??[];
              return (
                <tr key={ag.cod} style={{ background:ri%2===0?N.d3:N.d4 }}>
                  <td style={{ ...SANS, padding:"12px 22px", borderBottom:`1px solid ${N.b1}`, borderLeft:`4px solid ${N.ax}` }}>
                    <div style={{ fontSize:14, fontWeight:600, color:N.t1 }}>{ag.nome}</div>
                    <div style={{ fontSize:11, color:N.t3, marginTop:3 }}>{ag.cargo}</div>
                  </td>
                  {CL.map((_,ci)=>(
                    <td key={ci} style={{ padding:"12px 8px", textAlign:"center", borderBottom:`1px solid ${N.b1}` }}>
                      {c[ci]?<span style={{ color:N.axL, fontSize:17, fontWeight:900 }}>✓</span>:<span style={{ color:N.b2, fontSize:14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </P3D>
  );
}

// ─── ABA 4 — PERSONALIDADE ───────────────────────────────────────────────────
function TabPersonalidade({ tc }: { tc:TC }) {
  const PERS: Record<string,{v:number[];tom:string;voz:string;frase:string}> = {
    agente_administrativo_01:{v:[10,6,3,8,7,8,7,4,6,7,5],tom:"Acolhedor, organizado, preciso",      voz:"Feminino", frase:"Será um prazer organizar o seu atendimento."},
    agente_administrativo_02:{v:[7,5,3,9,5,7,6,5,7,5,4], tom:"Gentil, direto, funcional",           voz:"Neutro",   frase:"Estou entrando em contato para confirmar."},
    agente_enfermagem_01:    {v:[5,9,4,7,9,7,9,3,7,9,8], tom:"Técnico mas acolhedor, maternal",     voz:"Feminino", frase:"Estou enviando as orientações do procedimento."},
    agente_enfermagem_02:    {v:[5,8,3,8,7,6,8,3,6,8,9], tom:"Cuidadoso, detalhado, investigativo", voz:"Feminino", frase:"Gostaria de entender como o senhor se sentiu."},
    agente_consultor_01:     {v:[7,6,7,9,5,6,7,6,9,5,4], tom:"Científico mas acessível",            voz:"Neutro",   frase:"Boa pergunta! Vou explicar com clareza."},
    agente_consultor_02:     {v:[5,8,4,6,8,9,8,4,8,7,6], tom:"Próximo, interessado, motivador",     voz:"Neutro",   frase:"Estou fazendo o acompanhamento da sua evolução."},
    agente_supervisor_01:    {v:[9,2,9,10,1,9,3,9,5,2,1],tom:"Direto, sem rodeios, factual",        voz:"Masculino",frase:"ALERTA DE SLA — AÇÃO NECESSÁRIA."},
    agente_supervisor_02:    {v:[4,7,3,7,6,5,8,7,6,4,3], tom:"Natural, curioso, casual",            voz:"Neutro",   frase:"Sou da equipe de qualidade da clínica."},
    agente_financeiro_01:    {v:[8,5,6,10,4,7,6,6,7,3,3],tom:"Cordial mas firme, factual",          voz:"Neutro",   frase:"Sou do setor financeiro da clínica."},
    agente_ouvidoria_01:     {v:[7,10,2,7,9,5,10,2,6,9,10],tom:"Sereno, acolhedor, neutro",         voz:"Neutro",   frase:"Obrigado por trazer isso para nós."},
  };
  const DIMS = ["Formalidade","Empatia","Autoridade","Objetividade","Calor Humano","Proatividade","Paciência","Firmeza","Didatismo","Acolhimento","Sensibilidade"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px,1fr))", gap:22 }}>
      {CAT.map(ag=>{
        const p = PERS[ag.cod]; if(!p) return null;
        return (
          <P3D key={ag.id} nv={2}
            head={
              <div>
                <div style={{ ...MONO, fontSize:11, color:N.t3, letterSpacing:"0.08em", marginBottom:5 }}>{ag.cargo} · {p.voz}</div>
                <div style={{ ...tCSS(tc.heading), color:N.t1 }}>{ag.nome}</div>
                <div style={{ ...SERIF, fontSize:16, fontStyle:"italic", color:N.ax, marginTop:5 }}>"{p.tom}"</div>
              </div>
            }
          >
            <div style={{ padding:"18px 24px" }}>
              {DIMS.map((dim,di)=>(
                <div key={dim} style={{ display:"grid", gridTemplateColumns:"116px 1fr", gap:10, alignItems:"center", marginBottom:9 }}>
                  <div style={{ ...SANS, fontSize:12, color:N.t3 }}>{dim}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:7, background:N.d5, borderRadius:1, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p.v[di]*10}%`, background:`linear-gradient(90deg, ${N.ax}, ${N.axL})`, borderRadius:1 }} />
                    </div>
                    <span style={{ ...MONO, fontSize:12, color:N.t2, minWidth:18, fontVariantNumeric:"tabular-nums" }}>{p.v[di]}</span>
                  </div>
                </div>
              ))}
              <P3D nv={1} style={{ padding:"12px 16px", marginTop:12, borderLeft:`3px solid ${N.ax}66` }}>
                <div style={{ ...tCSS(tc.body), fontStyle:"italic", color:N.t2, lineHeight:1.75 }}>"{p.frase}"</div>
              </P3D>
            </div>
          </P3D>
        );
      })}
    </div>
  );
}

// ─── ABA 5 — FLUXO ───────────────────────────────────────────────────────────
// Os dois painéis (fluxo + gaps) se sobrepõem — gaps "sobe" sobre o fluxo.
function TabFluxo({ tc }: { tc:TC }) {
  return (
    <div style={{ position:"relative" }}>
      {/* Painel Fluxo */}
      <P3D nv={2} style={{ position:"relative", zIndex:2 }}
        head={<div style={{ ...tCSS(tc.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.06em" }}>Arquitetura de Disparo — Do Gatilho ao Log</div>}
      >
        <div style={{ padding:"26px 30px" }}>
          {FLUXO.map((s,i)=>{
            const isLast = i===FLUXO.length-1;
            return (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
                <P3D nv={1} style={{ display:"flex", alignItems:"flex-start", gap:18, padding:"16px 20px", width:"100%", borderLeft:`5px solid ${N.ax}` }}>
                  <div style={{
                    ...MONO, fontSize:14, fontWeight:900, color:"#FFF",
                    background:N.ax, width:44, height:44, borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, fontVariantNumeric:"tabular-nums", boxShadow:N.e1,
                  }}>{s.n}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <div style={{ ...tCSS(tc.heading), color:N.t1 }}>{s.t}</div>
                      {s.x && <span style={{ ...MONO, fontSize:11, color:N.axL, background:N.d4, border:`1px solid ${N.b3}`, padding:"3px 10px", borderRadius:N.r }}>{s.x}</span>}
                    </div>
                    <div style={{ ...tCSS(tc.body), color:N.t2, lineHeight:1.80 }}>{s.d}</div>
                  </div>
                </P3D>
                {!isLast && (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"5px 0" }}>
                    <div style={{ width:2, height:16, background:N.b3 }} />
                    <span style={{ color:N.t3, fontSize:16 }}>▼</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </P3D>

      {/* Painel GAPS — sobreposição real, z mais alto */}
      <div style={{ position:"relative", zIndex:3, marginTop:-18 }}>
        <P3D nv={3}
          head={<div style={{ ...tCSS(tc.heading), color:N.axX, textTransform:"uppercase", letterSpacing:"0.06em" }}>Gaps Críticos — O que ainda não existe</div>}
        >
          <div style={{ padding:"18px 26px", display:"flex", flexDirection:"column", gap:12 }}>
            {GAPS.map((g,i)=>(
              <P3D key={i} nv={1} style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"14px 18px", borderLeft:`4px solid ${N.ax}` }}>
                <span style={{ ...MONO, fontSize:11, fontWeight:900, color:"#FFF", background:N.ax, padding:"5px 12px", borderRadius:N.r, whiteSpace:"nowrap", flexShrink:0, marginTop:2 }}>{g.s}</span>
                <div>
                  <div style={{ ...tCSS(tc.heading), color:N.t1, marginBottom:5 }}>{g.t}</div>
                  <div style={{ ...tCSS(tc.body), color:N.t2, lineHeight:1.80 }}>{g.d}</div>
                </div>
              </P3D>
            ))}
          </div>
        </P3D>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function CartaMagnaPadcomPage() {
  useGoogleFonts();
  const [aba,   setAba  ] = useState(0);
  const [tc,    setTc   ] = useState<TC>(TD);
  const [showT, setShowT] = useState(false);
  const [cat,   setCat  ] = useState<typeof CAT>([]);
  const [stats, setStats] = useState<{catalogoTotal:number;provisionadosTotal:number;narrativasTotal:number;execucoesTotal:number}|null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/agentes-virtuais/catalogo").then(r=>r.json()).catch(()=>null),
      apiFetch("/api/agentes-virtuais/stats").then(r=>r.json()).catch(()=>null),
    ]).then(([c,s])=>{
      if(c&&Array.isArray(ensureArray(c))) setCat(ensureArray(c));
      if(s&&typeof s.catalogoTotal==="number") setStats(s);
    });
  },[]);

  const s = stats ?? { catalogoTotal:20, provisionadosTotal:100, narrativasTotal:22, execucoesTotal:0 };
  const lista = cat.length > 0 ? cat : CAT;

  return (
    <div style={{
      background:N.bg, minHeight:"100vh", fontFamily:"Inter, sans-serif",
      // Nitidez máxima de fonte em todos os elementos filhos
      WebkitFontSmoothing:"antialiased",
      MozOsxFontSmoothing:"grayscale",
    }}>

      {/* ── HEADER 3D — elevação máxima ─────────────────────────────────── */}
      <div style={{
        background:`linear-gradient(180deg, ${N.hi} 0%, ${N.d1} 100%)`,
        // Borda superior branca = quina reta em fundo claro
        borderTop:`2px solid rgba(255,255,255,0.95)`,
        boxShadow: N.e3,
        position:"relative", zIndex:100,
      }}>
        <div style={{ padding:"24px 38px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ ...SANS, fontSize:12, color:N.t3, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:10 }}>
              Sistema Pawards · Padcom · Módulo de Agentes Virtuais
            </div>
            <div style={{
              ...tCSS(tc.display), color:N.t1, lineHeight:1.1,
            }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ ...tCSS(tc.subhead), color:N.t2, marginTop:10 }}>
              Carta Magna PADCOM · Edição 001 · Publicado em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>

          {/* KPIs — cada um é um mini painel 3D */}
          <div style={{ display:"flex", gap:6, alignItems:"stretch" }}>
            {[
              { l:"Agentes",    v:s.catalogoTotal        },
              { l:"Instâncias", v:s.provisionadosTotal   },
              { l:"Narrativas", v:s.narrativasTotal      },
              { l:"Execuções",  v:s.execucoesTotal       },
            ].map((k,i)=>(
              <div key={i} style={{
                background:`linear-gradient(180deg, ${N.sur} 0%, ${N.d2} 100%)`,
                border:`1px solid ${N.b3}`,
                borderTop:`1px solid rgba(255,255,255,0.95)`,
                borderRadius:N.r,
                padding:"12px 22px", textAlign:"center",
                boxShadow:N.e1,
                display:"flex", flexDirection:"column", gap:6,
              }}>
                <div style={{ ...SANS, fontSize:12, color:N.t2, letterSpacing:"0.12em", textTransform:"uppercase" }}>{k.l}</div>
                <div style={{ ...MONO, fontSize:32, fontWeight:700, color:N.t1, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.v}</div>
              </div>
            ))}
            <button onClick={()=>setShowT(v=>!v)} style={{
              ...SANS, fontSize:13, fontWeight:600,
              background:showT?N.ax:`linear-gradient(180deg, ${N.sur} 0%, ${N.d2} 100%)`,
              color:showT?"#FFF":N.t1,
              border:`1px solid ${showT?N.ax:N.b3}`,
              borderTop:`1px solid rgba(255,255,255,0.95)`,
              borderRadius:N.r, padding:"12px 18px", cursor:"pointer",
              boxShadow:N.e1, letterSpacing:"0.04em", transition:"all 0.2s",
            }}>{showT?"✕ Tipografia":"Aa Tipografia"}</button>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ margin:"16px 38px 0", height:1, background:`linear-gradient(90deg, transparent, ${N.b3} 20%, ${N.b3} 80%, transparent)` }} />

        {/* Abas — aba ativa é painel 3D levantado */}
        <div style={{ display:"flex", gap:3, padding:"10px 30px 0", overflowX:"auto" }}>
          {ABAS.map((a,i)=>{
            const isAti = aba===i;
            return (
              <button key={i} onClick={()=>setAba(i)} style={{
                ...SERIF,
                fontSize: isAti ? 17 : 16,
                fontWeight: isAti ? 700 : 500,
                fontStyle: "normal",       // sem itálico em nenhuma aba — todas retas e legíveis
                padding:"11px 26px",
                background:isAti ? N.bg : "transparent",
                color: isAti ? N.ax : N.t2,
                border:"none",
                borderTop:isAti ? `1px solid rgba(255,255,255,0.95)` : "none",
                borderRadius:`${N.r} ${N.r} 0 0`,
                cursor:"pointer", whiteSpace:"nowrap",
                boxShadow: isAti ? N.e2 : "none",
                textShadow: "none",
                letterSpacing:"0.02em",
                position:"relative", zIndex:isAti?2:1, transition:"all 0.15s",
              }}>{a}</button>
            );
          })}
        </div>
      </div>

      {/* ── CONTEÚDO ─────────────────────────────────────────────────────── */}
      <div style={{ padding:"30px 38px 60px", maxWidth:1500, margin:"0 auto" }}>
        {showT && <TypoSelector tc={tc} set={setTc} />}
        {aba===0 && <TabCatalogo   lista={lista} tc={tc} />}
        {aba===1 && <TabNarrativas tc={tc} />}
        {aba===2 && <TabCapacidades tc={tc} />}
        {aba===3 && <TabPersonalidade tc={tc} />}
        {aba===4 && <TabFluxo tc={tc} />}

        {/* Rodapé */}
        <div style={{ textAlign:"center", marginTop:60, paddingTop:26, borderTop:`1px solid ${N.b1}` }}>
          <div style={{ ...SERIF, fontSize:16, fontStyle:"italic", color:N.t3 }}>
            Constituição dos Agentes Virtuais · Carta Magna PADCOM · Edição 001
          </div>
          <div style={{ ...MONO, fontSize:11, color:N.b2, marginTop:8, letterSpacing:"0.08em" }}>
            SHA: 43d2765d · TSUNAMI_AGENTES_VIRTUAIS_26.07.19 · Classificação: Restrito
          </div>
        </div>
      </div>
    </div>
  );
}
