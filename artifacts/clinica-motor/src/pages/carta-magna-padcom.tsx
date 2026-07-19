import { useState, useEffect, useCallback } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

// ─── GOOGLE FONTS ─────────────────────────────────────────────────────────────
function useGoogleFonts() {
  useEffect(() => {
    const id = "cmpadcom-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id   = id;
    link.rel  = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ─── PALETA NAVAL — UMA ÚNICA FAMÍLIA DE AZUL ─────────────────────────────────
// Fundo mais escuro → painéis progressivamente mais claros.
// Zero mistura de famílias cromáticas.
const N = {
  /* ── fundos em camadas ── */
  bg:     "#04060F",   // camada 0 — page background (quase preto-azul)
  l1:     "#080D1E",   // camada 1 — painel profundo
  l2:     "#0C1430",   // camada 2 — painel médio
  l3:     "#111E48",   // camada 3 — painel levantado
  l4:     "#172560",   // camada 4 — superfície mais clara
  l5:     "#1E2E72",   // camada 5 — destaque / header de card

  /* ── azul brilhante (acento único) ── */
  glow:   "#4898F8",   // azul vivo — bordas, botão ativo
  glowL:  "#80C4FF",   // azul claro — números, highlights
  glowD:  "#1A50B0",   // azul escuro — detalhe border

  /* ── texto ── */
  t1:     "#EEF4FF",   // texto principal — quase branco
  t2:     "#8AAEDD",   // texto secundário — azul médio
  t3:     "#4A6899",   // texto terciário — azul cinza

  /* ── bordas e divisores ── */
  brd:    "#1C2E60",   // borda padrão
  brdL:   "#263878",   // borda clara
  brdX:   "#344a90",   // borda destaque

  /* ── sombras 3D — o núcleo do efeito ── */
  // Nível 1 — painel raso (base)
  s3d1: [
    "0 1px 0px rgba(100,160,255,0.12) inset",    // highlight topo
    "0 -1px 0px rgba(0,0,20,0.70) inset",         // sombra base
    "0 5px 0 #020410",                             // espessura (borda inferior)
    "0 8px 18px rgba(2,4,16,0.85)",               // sombra cast próxima
    "0 20px 40px rgba(2,4,16,0.55)",              // sombra cast distante
  ].join(", "),

  // Nível 2 — painel médio
  s3d2: [
    "0 1px 0px rgba(120,180,255,0.18) inset",
    "0 -1px 0px rgba(0,0,20,0.80) inset",
    "0 8px 0 #020410",
    "0 12px 28px rgba(2,4,16,0.90)",
    "0 32px 64px rgba(2,4,16,0.65)",
    "0 60px 90px rgba(2,4,16,0.35)",
  ].join(", "),

  // Nível 3 — painel mais elevado
  s3d3: [
    "0 2px 0px rgba(140,200,255,0.22) inset",
    "0 -1px 0px rgba(0,0,20,0.85) inset",
    "0 12px 0 #010308",
    "0 16px 40px rgba(2,4,16,0.95)",
    "0 40px 80px rgba(2,4,16,0.75)",
    "0 80px 120px rgba(2,4,16,0.50)",
  ].join(", "),

  r:   "6px",
  rLg: "8px",
};

/* Fontes tipográficas fixas */
const SERIF: React.CSSProperties = { fontFamily: "'Cormorant Garamond', 'Georgia', serif" };
const SANS:  React.CSSProperties = { fontFamily: "'Inter', 'system-ui', sans-serif" };
const MONO:  React.CSSProperties = { fontFamily: "'JetBrains Mono', 'ui-monospace', monospace" };

/* ── SEED ─────────────────────────────────────────────────────────────────── */
const SEED_CATALOGO = [
  { id:1,  codigoAgente:"agente_administrativo_01", nomeAgente:"Agente Administrativo Presencial", funcaoAgente:"Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente.", cargo:"ADMINISTRATIVO", modalidade:"presencial", slaDefaultHoras:2,  naoFaz:["Dúvidas clínicas","Valores de fórmulas","Decisões de desconto","Cancelamento de protocolos"] },
  { id:2,  codigoAgente:"agente_administrativo_02", nomeAgente:"Agente Administrativo Remoto",     funcaoAgente:"Confirmação de consultas D-1, reagendamentos e suporte pré-atendimento.",                  cargo:"ADMINISTRATIVO", modalidade:"remoto",     slaDefaultHoras:2,  naoFaz:["Agendamentos novos","Dúvidas clínicas","Cancelamento definitivo sem aprovação"] },
  { id:3,  codigoAgente:"agente_enfermagem_01",     nomeAgente:"Agente Enfermagem Presencial",     funcaoAgente:"Comunicação pós-sessão presencial, orientações de cuidado, envio do código de validação.", cargo:"ENFERMAGEM",     modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Alterar protocolo","Dar prazo para sintomas sem avaliar","Decidir condutas novas"] },
  { id:4,  codigoAgente:"agente_enfermagem_02",     nomeAgente:"Agente Enfermagem Auditoria",      funcaoAgente:"Auditoria oculta do pós-sessão. Verifica se o paciente recebeu cuidado adequado.",         cargo:"ENFERMAGEM",     modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Revelar que é auditoria","Orientar condutas clínicas","Tomar decisões"] },
  { id:5,  codigoAgente:"agente_consultor_01",      nomeAgente:"Agente Consultor Presencial",      funcaoAgente:"Suporte técnico clínico presencial — orienta sobre fórmulas, exames, avaliação clínica.",  cargo:"CONSULTOR",      modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Prescrever","Alterar protocolo","Decidir condutas novas"] },
  { id:6,  codigoAgente:"agente_consultor_02",      nomeAgente:"Agente Consultor Remoto",          funcaoAgente:"Follow-up semanal de evolução, reativação de pacientes parados.",                          cargo:"CONSULTOR",      modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Orientar condutas clínicas","Decidir sobre protocolo","Alterar prescrição"] },
  { id:7,  codigoAgente:"agente_supervisor_01",     nomeAgente:"Agente Supervisor Operacional",    funcaoAgente:"Controle operacional interno — cobra SLA, registra advertências, escalona para gerente.",  cargo:"SUPERVISOR",     modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Falar com paciente","Decidir questões clínicas","Aprovar descontos"] },
  { id:8,  codigoAgente:"agente_supervisor_02",     nomeAgente:"Agente Supervisor Auditor",        funcaoAgente:"Auditoria oculta da qualidade dos atendimentos. Pesquisa de satisfação disfarçada.",       cargo:"SUPERVISOR",     modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar que é auditoria","Fazer pressão","Influenciar respostas"] },
  { id:9,  codigoAgente:"agente_financeiro_01",     nomeAgente:"Agente Financeiro",                funcaoAgente:"Cobranças, acordos, nota fiscal, inadimplência e renovações financeiras.",                 cargo:"FINANCEIRO",     modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Decidir descontos acima de 15%","Cancelar protocolos","Emitir boletos sem aprovação"] },
  { id:10, codigoAgente:"agente_ouvidoria_01",      nomeAgente:"Agente Ouvidoria",                 funcaoAgente:"Canal confidencial para reclamações, sugestões e insatisfações. Protege a identidade.",    cargo:"OUVIDORIA",      modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar identidade do reclamante","Tomar decisão punitiva","Minimizar reclamação"] },
];

const SEED_NARRATIVAS = [
  { id:1, codigoAgente:"agente_administrativo_01", titulo:"Novo paciente quer agendar consulta",   tag:"Novo Lead",   mensagens:[{lado:"paciente",texto:"Quero marcar uma consulta com o Dr. Caio"},{lado:"agente",texto:"Será um prazer organizar o seu agendamento.\n\nQual unidade fica melhor?\n  Tatuapé · Alphaville · Guaxupé\n\nQual o seu nome completo?"}] },
  { id:2, codigoAgente:"agente_administrativo_01", titulo:"Paciente pergunta sobre plano de saúde",tag:"Dúvida",      mensagens:[{lado:"paciente",texto:"Aceita plano de saúde?"},{lado:"agente",texto:"A clínica atende exclusivamente de forma particular.\n\nIsso permite consultas sem limite de tempo e protocolos completamente personalizados.\n\nPosso ajudar a agendar?"}] },
  { id:3, codigoAgente:"agente_administrativo_02", titulo:"Confirmação de consulta D-1",          tag:"Confirmação", mensagens:[{lado:"agente",texto:"Confirmo seu atendimento de amanhã:\n\nUnidade: Tatuapé · 09h00\n\n1 — Confirmo\n2 — Preciso reagendar"},{lado:"paciente",texto:"1"},{lado:"agente",texto:"Perfeito. Te esperamos amanhã às 09h00."}] },
  { id:4, codigoAgente:"agente_enfermagem_01",     titulo:"Orientações pós-aplicação",            tag:"Pós-sessão",  mensagens:[{lado:"agente",texto:"João, seu procedimento foi realizado conforme protocolo.\n\n· Hidratação — ao menos 2L de água hoje\n· Esforço físico — evite por 24 horas\n· Alimentação — refeições leves, sem álcool\n\nQualquer desconforto, me avise imediatamente."}] },
  { id:5, codigoAgente:"agente_enfermagem_02",     titulo:"Auditoria — tontura relatada",         tag:"Auditoria",   mensagens:[{lado:"agente",texto:"Bom dia. Sou da equipe de acompanhamento.\nComo você está após a sessão de ontem?"},{lado:"paciente",texto:"Fiquei com um pouco de tontura logo depois"},{lado:"agente",texto:"Obrigado por me contar. Vou encaminhar para a equipe clínica avaliar. Alguém entrará em contato em breve."}] },
  { id:6, codigoAgente:"agente_consultor_01",      titulo:"Dúvida sobre exame G6PD",              tag:"Técnica",     mensagens:[{lado:"paciente",texto:"Preciso fazer o exame G6PD antes do IV?"},{lado:"agente",texto:"Sim, o G6PD é necessário antes da Vitamina C intravenosa — verifica uma enzima protetora. Qualquer laboratório realiza. Posso te orientar sobre onde?"}] },
  { id:7, codigoAgente:"agente_consultor_02",      titulo:"Follow-up semanal — semana 4",         tag:"Follow-up",   mensagens:[{lado:"agente",texto:"Acompanhamento da 4ª semana de tratamento.\n\nComo tem se sentido?\n· Energia · Sono · Disposição geral"},{lado:"paciente",texto:"Muito melhor, dormindo bem"},{lado:"agente",texto:"Exatamente o esperado. Próximo retorno em 2 semanas."}] },
  { id:8, codigoAgente:"agente_financeiro_01",     titulo:"Cobrança de parcela vencida",          tag:"Financeiro",  mensagens:[{lado:"agente",texto:"Parcela do protocolo venceu em 10/04.\nValor: R$ 450,00\n\n· Pix · Cartão · Boleto\n\nQual opção fica melhor?"},{lado:"paciente",texto:"Estou com problema no cartão"},{lado:"agente",texto:"Posso gerar Pix com QR Code agora. Deseja?"}] },
  { id:9, codigoAgente:"agente_ouvidoria_01",      titulo:"Reclamação de atendimento",            tag:"Ouvidoria",   mensagens:[{lado:"paciente",texto:"Fui mal atendida. A enfermeira foi grossa."},{lado:"agente",texto:"Obrigado por trazer isso. Levamos a sério cada relato.\n\nEm qual unidade? Data aproximada?"},{lado:"paciente",texto:"Hoje, Tatuapé"},{lado:"agente",texto:"Registrado com total sigilo. Retorno da direção em até 48 horas."}] },
];

const CARGO_ORDEM = ["ADMINISTRATIVO","ENFERMAGEM","CONSULTOR","SUPERVISOR","FINANCEIRO","OUVIDORIA"];

const FLUXO = [
  { n:"01", titulo:"Gatilho",              desc:"Consulta confirmada · Sessão realizada · SLA vencido · Auditoria programada" },
  { n:"02", titulo:"Motor de Eventos",     desc:"Avalia qual agente atua com base no tipo de evento e cargo responsável" },
  { n:"03", titulo:"Busca de Contexto",    desc:"Dados do paciente + sessão + histórico de conversas + memórias contextuais" },
  { n:"04", titulo:"Motor de Escrita",     desc:"Template + contexto + ação + regras (máx. 2 frases/bloco, quebra obrigatória)" },
  { n:"05", titulo:"Validação Humana",     desc:"Se requerValidacaoHumana=true → fila de aprovação → aprovador libera → disparo", extra:"Condicional" },
  { n:"06", titulo:"Disparo",              desc:"WhatsApp via Twilio/Gupshup · E-mail via Gmail API · SLA iniciado" },
  { n:"07", titulo:"Resposta do Paciente", desc:"Motor analisa resposta → narrativa correta → ou escalada para supervisor" },
  { n:"08", titulo:"Log e Memória",        desc:"Grava em execucoes_agente + memorias_contextuais_agente + estado de prontidão" },
];

const GAPS = [
  { sev:"Crítico", titulo:"Motor de Disparo",         desc:"Nenhum agente dispara WhatsApp real — campo podeEnviarWhatsapp=true existe mas não tem executor" },
  { sev:"Crítico", titulo:"Worker de Execução",       desc:"Tabela execucoes_agente existe mas o consumer (listener de eventos) não foi construído" },
  { sev:"Alta",    titulo:"Fila de Validação Humana", desc:"validacoes_humanas_agente existe sem interface de aprovação no frontend" },
  { sev:"Alta",    titulo:"Motor de Memórias",        desc:"memorias_contextuais_agente existe sem lógica de gravação e recuperação por paciente" },
  { sev:"Média",   titulo:"Consumer de Eventos",      desc:"eventos_saida_operacionais existe sem consumer que processa os eventos disparados" },
];

const ABAS = ["Catálogo de Agentes","Narrativas","Capacidades","Personalidade","Fluxo Operacional"];

// ─── PAINEL 3D ─────────────────────────────────────────────────────────────────
// Componente base de painel com efeito 3D escalonado por nível.
// Nível 1 = raso · Nível 2 = médio · Nível 3 = muito elevado
function Painel3D({
  children, nivel = 1, style,
  cabecalho,
}: {
  children: React.ReactNode;
  nivel?: 1 | 2 | 3;
  style?: React.CSSProperties;
  cabecalho?: React.ReactNode;
}) {
  const bg    = [N.l2, N.l3, N.l4] as const;
  const somb  = [N.s3d1, N.s3d2, N.s3d3] as const;
  const bord  = [N.brd, N.brdL, N.brdX] as const;
  return (
    <div style={{
      position:"relative",
      background: bg[nivel - 1],
      borderRadius: N.rLg,
      border: `1px solid ${bord[nivel - 1]}`,
      borderTop: `1px solid rgba(120,180,255,${nivel * 0.08 + 0.05})`, // highlight topo
      boxShadow: somb[nivel - 1],
      overflow:"hidden",
      ...style,
    }}>
      {cabecalho && (
        <div style={{
          background: `linear-gradient(180deg, ${N.l5} 0%, ${N.l4} 100%)`,
          borderBottom: `1px solid ${N.brdL}`,
          padding:"14px 22px",
          boxShadow:"0 1px 0 rgba(120,180,255,0.1) inset",
        }}>
          {cabecalho}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── SELETOR DE TIPOGRAFIA ────────────────────────────────────────────────────
interface TypoLevel { family:string; size:number; weight:number; italic:boolean }
interface TypoConfig {
  display: TypoLevel; heading: TypoLevel; subhead: TypoLevel;
  body: TypoLevel; label: TypoLevel; number: TypoLevel; caption: TypoLevel;
}
const TYPO_DEFAULT: TypoConfig = {
  display: { family:"Cormorant Garamond", size:36, weight:600, italic:false },
  heading: { family:"Cormorant Garamond", size:22, weight:600, italic:false },
  subhead: { family:"Cormorant Garamond", size:16, weight:400, italic:true  },
  body:    { family:"Inter",              size:14, weight:400, italic:false },
  label:   { family:"Inter",             size:11, weight:600, italic:false },
  number:  { family:"JetBrains Mono",    size:16, weight:700, italic:false },
  caption: { family:"Inter",             size:10, weight:400, italic:false },
};
const TYPO_LEVELS: Array<{key:keyof TypoConfig; label:string; desc:string}> = [
  { key:"display", label:"Título Principal",   desc:"Grande destaque — masthead ou abertura de seção" },
  { key:"heading", label:"Título de Seção",    desc:"Cabeçalho de painel, cargo, capítulo" },
  { key:"subhead", label:"Subtítulo",          desc:"Segunda linha, tagline, ementa" },
  { key:"body",    label:"Corpo de Texto",     desc:"Descrição, narrativa, orientação" },
  { key:"label",   label:"Rótulo de Campo",    desc:"Label de formulário, badge (geralmente MAIÚSCULO)" },
  { key:"number",  label:"Número / KPI",       desc:"Valor métrico grande, SLA, contador" },
  { key:"caption", label:"Legenda / Nota",     desc:"Metadados, SHA, timestamps, rodapé técnico" },
];
const FONT_FAMILIES = [
  "Cormorant Garamond","Inter","JetBrains Mono",
  "Georgia","Palatino Linotype","Times New Roman",
  "Trebuchet MS","Arial","Verdana","Courier New",
];
function typoCSS(t:TypoLevel): React.CSSProperties {
  const isMono = t.family.toLowerCase().includes("mono") || t.family.toLowerCase().includes("courier");
  const isSerif = ["Garamond","Georgia","Palatino","Times","Baskerville"].some(s => t.family.includes(s));
  return {
    fontFamily: `'${t.family}', ${isMono ? "ui-monospace, monospace" : isSerif ? "Georgia, serif" : "system-ui, sans-serif"}`,
    fontSize: t.size, fontWeight: t.weight, fontStyle: t.italic ? "italic" : "normal",
  };
}

function TypoSelector({ typo, onChange }: { typo:TypoConfig; onChange:(t:TypoConfig)=>void }) {
  const upd = useCallback((key:keyof TypoConfig, field:string, val:unknown) => {
    onChange({ ...typo, [key]: { ...typo[key], [field]: val } });
  }, [typo, onChange]);

  const baixar = () => {
    const md = [
      "# Tipografia PAWARDS — Escolha Validada",
      `\nData: ${new Date().toLocaleDateString("pt-BR")}`,
      "\n## Tabela de Níveis",
      "\n| Nível | Família | Tamanho | Peso | Itálico |",
      "|-------|---------|---------|------|---------|",
      ...TYPO_LEVELS.map(l => {
        const t = typo[l.key];
        return `| ${l.label} | ${t.family} | ${t.size}px | ${t.weight} | ${t.italic?"Sim":"Não"} |`;
      }),
      "\n## Objeto TypeScript",
      "\n```typescript",
      "const TYPO = {",
      ...TYPO_LEVELS.map(l => {
        const t = typo[l.key];
        return `  ${l.key}: { family:"${t.family}", size:${t.size}, weight:${t.weight}, italic:${t.italic} },`;
      }),
      "};",
      "```",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md],{type:"text/markdown"}));
    a.download = `TIPOGRAFIA_PAWARDS_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.md`;
    a.click();
  };

  return (
    <Painel3D nivel={3} style={{ marginBottom:28 }}
      cabecalho={
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <div style={{ ...SERIF, fontSize:22, fontWeight:600, color:N.t1 }}>Seleção Tipográfica ao Vivo</div>
          <div style={{ ...SANS, fontSize:11, color:N.t3, letterSpacing:"0.08em" }}>PAINEL DE CONFIGURAÇÃO</div>
        </div>
      }
    >
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        {/* Controles */}
        <div style={{ padding:"20px 24px", borderRight:`1px solid ${N.brd}` }}>
          {TYPO_LEVELS.map(({ key, label, desc }) => {
            const t = typo[key];
            return (
              <div key={key} style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${N.brd}` }}>
                <div style={{ ...SANS, fontSize:11, fontWeight:700, color:N.glowL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                <div style={{ ...SANS, fontSize:11, color:N.t3, marginBottom:8 }}>{desc}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 56px 70px 40px", gap:6, alignItems:"center" }}>
                  <select value={t.family} onChange={e=>upd(key,"family",e.target.value)} style={{
                    ...SANS, fontSize:12, padding:"5px 8px", borderRadius:N.r,
                    background:N.l2, color:N.t1, border:`1px solid ${N.brd}`, cursor:"pointer",
                  }}>
                    {FONT_FAMILIES.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  <input type="number" min={8} max={60} value={t.size} onChange={e=>upd(key,"size",Number(e.target.value))} style={{
                    ...MONO, fontSize:12, padding:"5px 6px", textAlign:"center",
                    borderRadius:N.r, background:N.l2, color:N.glowL, border:`1px solid ${N.brd}`,
                  }}/>
                  <select value={t.weight} onChange={e=>upd(key,"weight",Number(e.target.value))} style={{
                    ...SANS, fontSize:12, padding:"5px 8px", borderRadius:N.r,
                    background:N.l2, color:N.t1, border:`1px solid ${N.brd}`, cursor:"pointer",
                  }}>
                    {[300,400,500,600,700].map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                  <button onClick={()=>upd(key,"italic",!t.italic)} style={{
                    fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:14, fontWeight:700,
                    background:t.italic?N.glow:N.l3, color:t.italic?"#FFF":N.t3,
                    border:`1px solid ${t.italic?N.glow:N.brd}`, borderRadius:N.r, cursor:"pointer",
                  }}>I</button>
                </div>
              </div>
            );
          })}
          <button onClick={baixar} style={{
            ...SANS, fontSize:12, fontWeight:700, width:"100%", padding:"12px",
            background:`linear-gradient(135deg, ${N.glow}, ${N.l5})`,
            color:"#FFF", border:`1px solid ${N.brdX}`, borderRadius:N.r,
            cursor:"pointer", letterSpacing:"0.06em", boxShadow:N.s3d1,
          }}>Baixar como .md — Documentar Tipografia</button>
        </div>
        {/* Prévia */}
        <div style={{ padding:"28px 24px", background:N.l1, display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ borderBottom:`1px solid ${N.brd}`, paddingBottom:20 }}>
            <div style={{ ...typoCSS(typo.display), color:N.t1, lineHeight:1.15, marginBottom:8 }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ ...typoCSS(typo.subhead), color:N.t2 }}>
              Carta Magna PADCOM · Edição 001 · 19/07/2026
            </div>
          </div>
          <div style={{ borderBottom:`1px solid ${N.brd}`, paddingBottom:20 }}>
            <div style={{ ...typoCSS(typo.heading), color:N.glowL, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:10 }}>
              Administrativo — 2 Agentes
            </div>
            <div style={{ ...typoCSS(typo.body), color:N.t2, lineHeight:1.8 }}>
              Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente com a estrutura de atendimento.
            </div>
          </div>
          <div style={{ borderBottom:`1px solid ${N.brd}`, paddingBottom:20 }}>
            <div style={{ ...typoCSS(typo.label), color:N.t3, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>SLA Padrão por Cargo</div>
            <div style={{ ...typoCSS(typo.number), color:N.glow, fontVariantNumeric:"tabular-nums" }}>2h · 36h · 24h</div>
          </div>
          <div>
            <div style={{ ...typoCSS(typo.caption), color:N.t3, letterSpacing:"0.06em" }}>
              SHA: 43d2765d · Documento: TSUNAMI 26.07.19 · Classificação: Restrito
            </div>
          </div>
        </div>
      </div>
    </Painel3D>
  );
}

// ─── ABA 1 — CATÁLOGO ─────────────────────────────────────────────────────────
// Os grupos de cargo são sobrepostos com z-index decrescente —
// cada painel lança sombra 3D sobre o painel abaixo.
function TabCatalogo({ catalogo, typo }: { catalogo:typeof SEED_CATALOGO; typo:TypoConfig }) {
  const [exp, setExp] = useState<number|null>(null);
  const lista = catalogo.length > 0 ? catalogo : SEED_CATALOGO;
  const grupos = CARGO_ORDEM.filter(c => lista.some(a => a.cargo === c));
  const totalGrupos = grupos.length;

  return (
    <div style={{ position:"relative" }}>
      {grupos.map((cargo, gi) => {
        const agentes = lista.filter(a => a.cargo === cargo);
        const zIndex = totalGrupos - gi + 1; // grupo 0 tem z mais alto

        return (
          <div
            key={cargo}
            style={{
              position:"relative",
              zIndex,
              // SOBREPOSIÇÃO: a partir do 2º grupo, sobe sobre o anterior
              marginTop: gi === 0 ? 0 : -12,
            }}
          >
            <Painel3D nivel={2}
              cabecalho={
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    {/* Número do grupo */}
                    <div style={{
                      ...MONO, fontSize:13, fontWeight:900, color:"#FFF",
                      background: N.glow, width:40, height:40, borderRadius:N.r,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow: N.s3d1, fontVariantNumeric:"tabular-nums",
                      flexShrink:0,
                    }}>
                      {String(gi+1).padStart(2,"0")}
                    </div>
                    <div>
                      <div style={{ ...typoCSS(typo.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        {cargo}
                      </div>
                      <div style={{ ...typoCSS(typo.caption), color:N.t3, marginTop:3 }}>
                        {agentes.length} agente{agentes.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...MONO, fontSize:14, fontWeight:700, color:N.glow, fontVariantNumeric:"tabular-nums" }}>
                    SLA {agentes[0]?.slaDefaultHoras}h
                  </div>
                </div>
              }
            >
              <div style={{ padding:"16px 22px", display:"flex", flexDirection:"column", gap:10 }}>
                {agentes.map((ag, ai) => {
                  const isExp = exp === ag.id;
                  return (
                    <Painel3D
                      key={ag.id}
                      nivel={1}
                      style={{
                        cursor:"pointer",
                        outline: isExp ? `2px solid ${N.glow}` : "none",
                        transition:"box-shadow 0.2s, outline 0.15s",
                      }}
                    >
                      <div
                        onClick={() => setExp(isExp ? null : ag.id)}
                        style={{ padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}
                      >
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          {/* Badge artigo */}
                          <div style={{
                            ...MONO, fontSize:11, fontWeight:900, color:N.glowL,
                            background:N.l5, border:`1px solid ${N.brdX}`,
                            padding:"4px 10px", borderRadius:N.r, letterSpacing:"0.06em",
                            flexShrink:0, fontVariantNumeric:"tabular-nums",
                          }}>
                            {`${String(gi+1).padStart(2,"0")}.${String(ai+1).padStart(2,"0")}`}
                          </div>
                          <div>
                            <div style={{ ...typoCSS(typo.body), color:N.t1, fontWeight:600 }}>
                              {ag.nomeAgente}
                            </div>
                            <div style={{ ...typoCSS(typo.caption), color:N.t3, marginTop:3 }}>
                              {ag.codigoAgente}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <span style={{
                            ...MONO, fontSize:11, color:N.t3, letterSpacing:"0.04em",
                          }}>
                            {ag.modalidade === "presencial" ? "▶" : "◀"} {ag.modalidade}
                          </span>
                          <span style={{ ...MONO, fontSize:13, color:N.t3 }}>{isExp ? "▾" : "▸"}</span>
                        </div>
                      </div>
                      {isExp && (
                        <div style={{ borderTop:`1px solid ${N.brd}`, padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
                          <Painel3D nivel={1} style={{ padding:"14px 18px" }}>
                            <div style={{ ...typoCSS(typo.label), color:N.t3, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
                              Função Principal
                            </div>
                            <div style={{ ...typoCSS(typo.body), color:N.t1, lineHeight:1.8 }}>
                              {ag.funcaoAgente}
                            </div>
                          </Painel3D>
                          {ag.naoFaz && ag.naoFaz.length > 0 && (
                            <Painel3D nivel={1} style={{ padding:"14px 18px", borderLeft:`4px solid ${N.glow}44` }}>
                              <div style={{ ...typoCSS(typo.label), color:N.glowL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
                                Vedações — Não Pode Fazer
                              </div>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px" }}>
                                {ag.naoFaz.map((v,j) => (
                                  <span key={j} style={{
                                    ...typoCSS(typo.caption), color:N.t2,
                                    background:N.l2, border:`1px solid ${N.brd}`,
                                    padding:"4px 12px", borderRadius:N.r,
                                  }}>✕ {v}</span>
                                ))}
                              </div>
                            </Painel3D>
                          )}
                        </div>
                      )}
                    </Painel3D>
                  );
                })}
              </div>
            </Painel3D>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABA 2 — NARRATIVAS ──────────────────────────────────────────────────────
function TabNarrativas({ typo }: { typo:TypoConfig }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(440px,1fr))", gap:20 }}>
      {SEED_NARRATIVAS.map((narr, idx) => {
        const ag = SEED_CATALOGO.find(a => a.codigoAgente === narr.codigoAgente);
        return (
          <Painel3D key={narr.id} nivel={2}
            cabecalho={
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ ...MONO, fontSize:11, color:N.t3, letterSpacing:"0.08em", marginBottom:4 }}>
                    {String(idx+1).padStart(3,"0")} · {ag?.cargo ?? ""} · {ag?.nomeAgente}
                  </div>
                  <div style={{ ...typoCSS(typo.heading), color:N.t1 }}>{narr.titulo}</div>
                </div>
                <span style={{
                  ...MONO, fontSize:10, color:N.glow, background:N.l5,
                  border:`1px solid ${N.brdX}`, padding:"3px 10px", borderRadius:N.r,
                  whiteSpace:"nowrap", marginTop:2,
                }}>{narr.tag}</span>
              </div>
            }
          >
            <div style={{ padding:"14px 22px", display:"flex", flexDirection:"column", gap:10 }}>
              {(narr.mensagens as Array<{lado:string;texto:string}>).map((m, mi) => {
                const isPac = m.lado === "paciente";
                return (
                  <div key={mi} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{
                      ...MONO, fontSize:10, fontWeight:700, minWidth:64, paddingTop:8,
                      color:isPac ? N.t3 : N.glowL, letterSpacing:"0.04em",
                    }}>{isPac ? "Paciente" : "Agente"}</div>
                    <Painel3D nivel={1} style={{ flex:1, padding:"8px 14px" }}>
                      <div style={{ ...typoCSS(typo.body), color:isPac ? N.t2 : N.t1, lineHeight:1.75, whiteSpace:"pre-wrap" }}>
                        {m.texto}
                      </div>
                    </Painel3D>
                  </div>
                );
              })}
            </div>
          </Painel3D>
        );
      })}
    </div>
  );
}

// ─── ABA 3 — CAPACIDADES ─────────────────────────────────────────────────────
function TabCapacidades({ typo }: { typo:TypoConfig }) {
  const CAPS_LABELS = ["WhatsApp","E-mail","Criar Tarefa","Atualizar Tarefa","Ler Agenda","Ler Acomp.","Escalar","Req. Validação","Nunca Caso Vermelho","Prontuário","Agendar","Cód. Validação","Memória"];
  const CAPS_DATA: Record<string, boolean[]> = {
    agente_administrativo_01: [true,  true,  true,  false, true,  false, true,  false, true,  false, true,  false, true ],
    agente_administrativo_02: [true,  false, false, true,  true,  false, true,  false, true,  false, false, false, true ],
    agente_enfermagem_01:     [true,  false, true,  false, false, true,  true,  true,  true,  false, false, true,  true ],
    agente_enfermagem_02:     [true,  false, false, true,  false, true,  true,  true,  true,  false, false, false, true ],
    agente_consultor_01:      [true,  false, true,  false, false, true,  true,  true,  true,  true,  false, false, true ],
    agente_consultor_02:      [true,  false, true,  false, false, true,  true,  false, true,  false, false, false, true ],
    agente_supervisor_01:     [true,  true,  true,  true,  true,  true,  true,  false, false, false, false, false, true ],
    agente_supervisor_02:     [true,  false, false, true,  true,  false, true,  false, true,  false, false, false, true ],
    agente_financeiro_01:     [true,  true,  true,  false, false, false, true,  true,  true,  false, false, false, true ],
    agente_ouvidoria_01:      [true,  true,  true,  false, false, false, true,  true,  true,  false, false, false, true ],
  };
  return (
    <Painel3D nivel={2}
      cabecalho={
        <div style={{ ...typoCSS(typo.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Matriz de Capacidades — 10 Agentes × 13 Dimensões
        </div>
      }
    >
      <div style={{ overflowX:"auto", padding:"0 0 4px" }}>
        <table style={{ borderCollapse:"separate", borderSpacing:0, width:"100%", fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ ...SANS, fontSize:12, fontWeight:700, color:N.t2, padding:"10px 18px", background:N.l3, textAlign:"left", minWidth:220, borderBottom:`1px solid ${N.brd}` }}>Agente</th>
              {CAPS_LABELS.map((l,i)=>(
                <th key={i} style={{ ...SANS, fontSize:10, fontWeight:400, color:N.t3, padding:"10px 8px", background:N.l3, writingMode:"vertical-rl", height:120, minWidth:36, borderBottom:`1px solid ${N.brd}` }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED_CATALOGO.map((ag, ri) => {
              const caps = CAPS_DATA[ag.codigoAgente] ?? [];
              return (
                <tr key={ag.codigoAgente} style={{ background:ri%2===0?N.l2:N.l1 }}>
                  <td style={{ ...SANS, padding:"10px 18px", borderBottom:`1px solid ${N.brd}`, borderLeft:`4px solid ${N.glow}88` }}>
                    <div style={{ fontSize:13, fontWeight:600, color:N.t1 }}>{ag.nomeAgente}</div>
                    <div style={{ fontSize:11, color:N.t3, marginTop:2 }}>{ag.cargo}</div>
                  </td>
                  {CAPS_LABELS.map((_,ci)=>(
                    <td key={ci} style={{ padding:"10px 8px", textAlign:"center", borderBottom:`1px solid ${N.brd}` }}>
                      {caps[ci]
                        ? <span style={{ color:N.glowL, fontSize:16, fontWeight:900 }}>✓</span>
                        : <span style={{ color:N.brd, fontSize:14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Painel3D>
  );
}

// ─── ABA 4 — PERSONALIDADE ───────────────────────────────────────────────────
function TabPersonalidade({ typo }: { typo:TypoConfig }) {
  const PERS: Record<string, {vals:number[]; tom:string; voz:string; frase:string}> = {
    agente_administrativo_01: { vals:[10,6,3,8,7,8,7,4,6,7,5], tom:"Acolhedor, organizado, preciso",      voz:"Feminino",  frase:"Será um prazer organizar o seu atendimento." },
    agente_administrativo_02: { vals:[7,5,3,9,5,7,6,5,7,5,4],  tom:"Gentil, direto, funcional",           voz:"Neutro",    frase:"Estou entrando em contato para confirmar." },
    agente_enfermagem_01:     { vals:[5,9,4,7,9,7,9,3,7,9,8],  tom:"Técnico mas acolhedor, maternal",     voz:"Feminino",  frase:"Estou enviando as orientações do procedimento." },
    agente_enfermagem_02:     { vals:[5,8,3,8,7,6,8,3,6,8,9],  tom:"Cuidadoso, detalhado, investigativo", voz:"Feminino",  frase:"Gostaria de entender como o senhor se sentiu." },
    agente_consultor_01:      { vals:[7,6,7,9,5,6,7,6,9,5,4],  tom:"Científico mas acessível",            voz:"Neutro",    frase:"Boa pergunta! Vou explicar com clareza." },
    agente_consultor_02:      { vals:[5,8,4,6,8,9,8,4,8,7,6],  tom:"Próximo, interessado, motivador",     voz:"Neutro",    frase:"Estou fazendo o acompanhamento da sua evolução." },
    agente_supervisor_01:     { vals:[9,2,9,10,1,9,3,9,5,2,1], tom:"Direto, sem rodeios, factual",        voz:"Masculino", frase:"ALERTA DE SLA — AÇÃO NECESSÁRIA." },
    agente_supervisor_02:     { vals:[4,7,3,7,6,5,8,7,6,4,3],  tom:"Natural, curioso, casual",            voz:"Neutro",    frase:"Sou da equipe de qualidade da clínica." },
    agente_financeiro_01:     { vals:[8,5,6,10,4,7,6,6,7,3,3], tom:"Cordial mas firme, factual",          voz:"Neutro",    frase:"Sou do setor financeiro da clínica." },
    agente_ouvidoria_01:      { vals:[7,10,2,7,9,5,10,2,6,9,10],tom:"Sereno, acolhedor, neutro",          voz:"Neutro",    frase:"Obrigado por trazer isso para nós." },
  };
  const DIMS = ["Formalidade","Empatia","Autoridade","Objetividade","Calor Humano","Proatividade","Paciência","Firmeza","Didatismo","Acolhimento","Sensibilidade"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px,1fr))", gap:20 }}>
      {SEED_CATALOGO.map((ag, ai) => {
        const p = PERS[ag.codigoAgente];
        if (!p) return null;
        return (
          <Painel3D key={ag.id} nivel={2}
            cabecalho={
              <div>
                <div style={{ ...MONO, fontSize:11, color:N.t3, letterSpacing:"0.08em", marginBottom:4 }}>
                  {ag.cargo} · {p.voz}
                </div>
                <div style={{ ...typoCSS(typo.heading), color:N.t1 }}>{ag.nomeAgente}</div>
                <div style={{ ...SERIF, fontSize:15, fontStyle:"italic", color:N.glow, marginTop:4 }}>"{p.tom}"</div>
              </div>
            }
          >
            <div style={{ padding:"16px 22px" }}>
              {DIMS.map((dim, di) => (
                <div key={dim} style={{ display:"grid", gridTemplateColumns:"110px 1fr", gap:10, alignItems:"center", marginBottom:8 }}>
                  <div style={{ ...SANS, fontSize:11, color:N.t3 }}>{dim}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:6, background:N.l1, borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p.vals[di]*10}%`, background:`linear-gradient(90deg, ${N.glow}, ${N.glowL})`, borderRadius:3 }} />
                    </div>
                    <span style={{ ...MONO, fontSize:11, color:N.t2, minWidth:16, fontVariantNumeric:"tabular-nums" }}>{p.vals[di]}</span>
                  </div>
                </div>
              ))}
              <Painel3D nivel={1} style={{ padding:"10px 14px", marginTop:10, borderLeft:`3px solid ${N.glow}66` }}>
                <div style={{ ...typoCSS(typo.body), fontStyle:"italic", color:N.t2, lineHeight:1.7 }}>"{p.frase}"</div>
              </Painel3D>
            </div>
          </Painel3D>
        );
      })}
    </div>
  );
}

// ─── ABA 5 — FLUXO ───────────────────────────────────────────────────────────
function TabFluxo({ typo }: { typo:TypoConfig }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Painel3D nivel={3}
        cabecalho={
          <div style={{ ...typoCSS(typo.heading), color:N.t1, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Arquitetura de Disparo — Do Gatilho ao Log
          </div>
        }
      >
        <div style={{ padding:"24px 28px" }}>
          {FLUXO.map((s, i) => {
            const isLast = i === FLUXO.length - 1;
            return (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
                <Painel3D nivel={1} style={{
                  display:"flex", alignItems:"flex-start", gap:16,
                  padding:"14px 18px", width:"100%",
                  borderLeft:`5px solid ${N.glow}`,
                }}>
                  <div style={{
                    ...MONO, fontSize:13, fontWeight:900, color:"#FFF",
                    background: N.glow, width:40, height:40, borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, fontVariantNumeric:"tabular-nums",
                    boxShadow: N.s3d1,
                  }}>{s.n}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <div style={{ ...typoCSS(typo.heading), color:N.t1 }}>{s.titulo}</div>
                      {s.extra && (
                        <span style={{ ...MONO, fontSize:10, color:N.glowL, background:N.l5, border:`1px solid ${N.brdX}`, padding:"2px 8px", borderRadius:N.r }}>{s.extra}</span>
                      )}
                    </div>
                    <div style={{ ...typoCSS(typo.body), color:N.t2, lineHeight:1.75 }}>{s.desc}</div>
                  </div>
                </Painel3D>
                {!isLast && (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"4px 0" }}>
                    <div style={{ width:2, height:14, background:N.brdL }} />
                    <span style={{ color:N.t3, fontSize:14 }}>▼</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Painel3D>

      {/* GAPS — painel 3 sobreposto ao fluxo */}
      <Painel3D nivel={3} style={{ marginTop:-16, position:"relative", zIndex:2 }}
        cabecalho={
          <div style={{ ...typoCSS(typo.heading), color:N.glowL, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Gaps Críticos — O que ainda não existe no sistema
          </div>
        }
      >
        <div style={{ padding:"16px 22px", display:"flex", flexDirection:"column", gap:10 }}>
          {GAPS.map((g, i) => (
            <Painel3D key={i} nivel={1} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"12px 16px", borderLeft:`4px solid ${N.glow}` }}>
              <span style={{
                ...MONO, fontSize:10, fontWeight:900, color:"#FFF",
                background:N.glow, padding:"4px 10px", borderRadius:N.r,
                whiteSpace:"nowrap", flexShrink:0, marginTop:2,
              }}>{g.sev}</span>
              <div>
                <div style={{ ...typoCSS(typo.heading), color:N.t1, marginBottom:4 }}>{g.titulo}</div>
                <div style={{ ...typoCSS(typo.body), color:N.t2, lineHeight:1.7 }}>{g.desc}</div>
              </div>
            </Painel3D>
          ))}
        </div>
      </Painel3D>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function CartaMagnaPadcomPage() {
  useGoogleFonts();

  const [aba,        setAba       ] = useState(0);
  const [typo,       setTypo      ] = useState<TypoConfig>(TYPO_DEFAULT);
  const [mostraTypo, setMostraTypo] = useState(false);
  const [catalogo,   setCatalogo  ] = useState<typeof SEED_CATALOGO>([]);
  const [stats,      setStats     ] = useState<{catalogoTotal:number;provisionadosTotal:number;narrativasTotal:number;execucoesTotal:number}|null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/agentes-virtuais/catalogo").then(r=>r.json()).catch(()=>null),
      apiFetch("/api/agentes-virtuais/stats").then(r=>r.json()).catch(()=>null),
    ]).then(([cat, st]) => {
      if (cat && Array.isArray(ensureArray(cat))) setCatalogo(ensureArray(cat));
      if (st && typeof st.catalogoTotal==="number") setStats(st);
    });
  }, []);

  const s = stats ?? { catalogoTotal:20, provisionadosTotal:100, narrativasTotal:22, execucoesTotal:0 };

  return (
    <div style={{ background:N.bg, minHeight:"100vh" }}>

      {/* ── HEADER PRINCIPAL 3D ─────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, ${N.l5} 0%, ${N.l3} 100%)`,
        boxShadow: [
          "0 1px 0 rgba(100,160,255,0.15) inset",
          "0 -1px 0 rgba(0,0,20,0.6) inset",
          "0 8px 0 #03050F",
          "0 12px 32px rgba(2,4,16,0.85)",
          "0 32px 64px rgba(2,4,16,0.5)",
        ].join(", "),
        position:"relative", zIndex:50,
      }}>
        {/* Barra topo */}
        <div style={{ padding:"22px 36px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ ...SANS, fontSize:11, color:N.t3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>
              Sistema Pawards · Padcom · Módulo de Agentes Virtuais
            </div>
            <div style={{ ...typoCSS(typo.display), color:N.t1, lineHeight:1.1, letterSpacing:"0.01em" }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ ...typoCSS(typo.subhead), color:N.t3, marginTop:8 }}>
              Carta Magna PADCOM · Edição 001 · Publicado em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>

          {/* KPIs 3D */}
          <div style={{ display:"flex", gap:6, alignItems:"stretch" }}>
            {[
              { label:"Agentes",    val:s.catalogoTotal        },
              { label:"Instâncias", val:s.provisionadosTotal   },
              { label:"Narrativas", val:s.narrativasTotal      },
              { label:"Execuções",  val:s.execucoesTotal       },
            ].map((k,i) => (
              <div key={i} style={{
                background:N.l2,
                border:`1px solid ${N.brdL}`,
                borderTop:`1px solid rgba(120,180,255,0.2)`,
                borderRadius:N.r,
                padding:"12px 20px", textAlign:"center",
                boxShadow: N.s3d1,
                display:"flex", flexDirection:"column", gap:6,
              }}>
                <div style={{ ...SANS, fontSize:11, color:N.t3, letterSpacing:"0.1em", textTransform:"uppercase" }}>{k.label}</div>
                <div style={{ ...MONO, fontSize:28, fontWeight:700, color:N.t1, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.val}</div>
              </div>
            ))}
            {/* Botão tipografia */}
            <button onClick={()=>setMostraTypo(v=>!v)} style={{
              ...SANS, fontSize:12, fontWeight:600,
              background:mostraTypo ? N.glow : N.l2,
              color:"#FFF", border:`1px solid ${mostraTypo?N.glow:N.brdL}`,
              borderRadius:N.r, padding:"12px 16px", cursor:"pointer",
              boxShadow:N.s3d1, letterSpacing:"0.04em",
              transition:"all 0.2s",
            }}>{mostraTypo ? "✕ Tipografia" : "Aa Tipografia"}</button>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ margin:"14px 36px 0", height:1, background:`linear-gradient(90deg, transparent, ${N.brdX}, transparent)` }} />

        {/* Abas */}
        <div style={{ display:"flex", gap:2, padding:"8px 28px 0", overflowX:"auto" }}>
          {ABAS.map((a, i) => {
            const isAti = aba === i;
            return (
              <button key={i} onClick={()=>setAba(i)} style={{
                ...SERIF, fontSize:15, fontWeight:isAti?600:400, fontStyle:isAti?"normal":"italic",
                padding:"10px 24px",
                background:isAti ? N.bg : "transparent",
                color:isAti ? N.glowL : N.t3,
                border:"none", borderRadius:`${N.r} ${N.r} 0 0`,
                cursor:"pointer", whiteSpace:"nowrap",
                boxShadow:isAti ? N.s3d2 : "none",
                position:"relative", zIndex:isAti?2:1, transition:"all 0.15s",
              }}>{a}</button>
            );
          })}
        </div>
      </div>

      {/* ── CONTEÚDO ─────────────────────────────────────────────────────── */}
      <div style={{ padding:"28px 36px 48px", maxWidth:1440, margin:"0 auto" }}>

        {/* Painel tipografia — 3D elevado */}
        {mostraTypo && <TypoSelector typo={typo} onChange={setTypo} />}

        {/* Abas */}
        {aba === 0 && <TabCatalogo   catalogo={catalogo} typo={typo} />}
        {aba === 1 && <TabNarrativas typo={typo} />}
        {aba === 2 && <TabCapacidades typo={typo} />}
        {aba === 3 && <TabPersonalidade typo={typo} />}
        {aba === 4 && <TabFluxo typo={typo} />}

        {/* Rodapé */}
        <div style={{ textAlign:"center", marginTop:48, paddingTop:24, borderTop:`1px solid ${N.brd}` }}>
          <div style={{ ...SERIF, fontSize:14, fontStyle:"italic", color:N.t3 }}>
            Constituição dos Agentes Virtuais · Carta Magna PADCOM · Edição 001
          </div>
          <div style={{ ...MONO, fontSize:10, color:N.brd, marginTop:6, letterSpacing:"0.08em" }}>
            SHA: 43d2765d · TSUNAMI_AGENTES_VIRTUAIS_26.07.19 · Classificação: Restrito
          </div>
        </div>
      </div>
    </div>
  );
}
