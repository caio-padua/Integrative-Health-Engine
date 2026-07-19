import { useState, useEffect, useCallback } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

// ─── CARREGAR FONTES DO GOOGLE FONTS ─────────────────────────────────────────
function useGoogleFonts() {
  useEffect(() => {
    const id = "hermes-fonts-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ─── PALETA HERMÈS ────────────────────────────────────────────────────────────
const H = {
  // Fundos em camadas — creme aquecido
  cream:   "#FAF7F0",  // nível 0 — desktop
  ivory:   "#F5EDE0",  // nível 1 — painel
  paper:   "#FFFDF8",  // nível 2 — card
  white:   "#FFFFFF",  // nível 3 — superfície elevada

  // Identidade Hermès
  orange:  "#C85A10",  // laranja assinatura (mais rico que web-orange)
  orangeM: "#E07030",  // laranja médio (hover, destaques)
  orangeL: "#FCF0E4",  // laranja muito claro (fundo de badge)
  orangeB: "#FBE8D4",  // laranja claro para bordas

  // Dourado
  gold:    "#9A7020",  // dourado escuro
  goldM:   "#C49030",  // dourado médio
  goldL:   "#FBF5DC",  // dourado claro

  // Marrons — couro de sela
  brown:   "#3C1E08",  // escuro quase preto
  brownM:  "#5C3018",  // texto principal
  brownS:  "#8A5C38",  // texto secundário
  brownL:  "#B08060",  // texto terciário

  // Borda e sombra aquecidos
  border:  "#D8C8A8",
  borderL: "#EAE0CC",
  borderD: "#BCA888",

  // Estados
  ok:     "#2A6E4A",
  okL:    "#E4F2EB",
  warn:   "#A06010",
  warnL:  "#FBF3DC",
  danger: "#8A2020",
  dangerL:"#FCEAEA",

  // Sombras aquecidas — 3 níveis
  s1: "0 2px 8px rgba(60,24,8,0.08), 0 1px 3px rgba(60,24,8,0.05)",
  s2: "0 6px 22px rgba(60,24,8,0.12), 0 2px 8px rgba(60,24,8,0.07)",
  s3: "0 14px 44px rgba(60,24,8,0.18), 0 4px 14px rgba(60,24,8,0.10)",

  r:  "4px",
  rLg:"6px",
};

// Cores por cargo — família Hermès
const CARGO: Record<string, { bg:string; text:string; light:string; border:string }> = {
  ADMINISTRATIVO: { bg:H.orange,  text:"#FFF", light:H.orangeL, border:H.orangeB },
  ENFERMAGEM:     { bg:"#2A6E4A", text:"#FFF", light:"#E4F2EB", border:"#96C8AA" },
  CONSULTOR:      { bg:"#4A3880", text:"#FFF", light:"#EDE8F8", border:"#B4A8D8" },
  SUPERVISOR:     { bg:H.gold,    text:"#FFF", light:H.goldL,   border:"#D8C080" },
  FINANCEIRO:     { bg:"#1A6868", text:"#FFF", light:"#E0F2F2", border:"#80C0C0" },
  OUVIDORIA:      { bg:"#88204A", text:"#FFF", light:"#F8E4EE", border:"#D090B0" },
};

// ─── TIPOGRAFIA — ESTADO GLOBAL ───────────────────────────────────────────────
export interface TypoConfig {
  display:  { family:string; size:number; weight:number; italic:boolean };
  heading:  { family:string; size:number; weight:number; italic:boolean };
  subhead:  { family:string; size:number; weight:number; italic:boolean };
  body:     { family:string; size:number; weight:number; italic:boolean };
  label:    { family:string; size:number; weight:number; italic:boolean };
  number:   { family:string; size:number; weight:number; italic:boolean };
  caption:  { family:string; size:number; weight:number; italic:boolean };
}

const TYPO_DEFAULT: TypoConfig = {
  display: { family:"Cormorant Garamond", size:28, weight:600, italic:false },
  heading: { family:"Cormorant Garamond", size:16, weight:600, italic:false },
  subhead: { family:"Cormorant Garamond", size:13, weight:400, italic:true  },
  body:    { family:"Libre Baskerville",  size:11, weight:400, italic:false },
  label:   { family:"Inter",             size:9,  weight:600, italic:false },
  number:  { family:"JetBrains Mono",    size:13, weight:700, italic:false },
  caption: { family:"Inter",             size:8,  weight:400, italic:false },
};

const FONT_FAMILIES = [
  "Cormorant Garamond",
  "Playfair Display",
  "Libre Baskerville",
  "Inter",
  "Montserrat",
  "Lato",
  "JetBrains Mono",
  "Georgia",
  "Palatino Linotype",
];

const TYPO_LEVELS: Array<{ key:keyof TypoConfig; label:string; desc:string }> = [
  { key:"display", label:"Título Principal",   desc:"Grande destaque — topo de seção ou masthead" },
  { key:"heading", label:"Título de Seção",    desc:"Cabeçalho de painel, cargo, capítulo" },
  { key:"subhead", label:"Subtítulo / Ementa", desc:"Segunda linha de título, tagline, identificador" },
  { key:"body",    label:"Corpo de Texto",     desc:"Descrição, narrativa, orientação ao usuário" },
  { key:"label",   label:"Rótulo de Campo",    desc:"Label de formulário, badge, métrica (UPPERCASE)" },
  { key:"number",  label:"Número / KPI",       desc:"Valor métrico grande, SLA, contador" },
  { key:"caption", label:"Legenda / Nota",     desc:"Metadados, SHA, datas, rodapé técnico" },
];

function typoStyle(t: TypoConfig[keyof TypoConfig]): React.CSSProperties {
  return {
    fontFamily: `'${t.family}', ${t.family.includes("Mono") ? "ui-monospace, monospace" : t.family.includes("Inter") || t.family.includes("Montserrat") || t.family.includes("Lato") ? "sans-serif" : "Georgia, serif"}`,
    fontSize: t.size,
    fontWeight: t.weight,
    fontStyle: t.italic ? "italic" : "normal",
  };
}

// ─── SEED ─────────────────────────────────────────────────────────────────────
const SEED_CATALOGO = [
  { id:1,  codigoAgente:"agente_administrativo_01", nomeAgente:"Agente Administrativo Presencial", funcaoAgente:"Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente.", cargo:"ADMINISTRATIVO", modalidade:"presencial", slaDefaultHoras:2,  naoFaz:["Dúvidas clínicas","Valores de fórmulas","Decisões de desconto","Cancelamento de protocolos","Orientações pós-sessão"] },
  { id:2,  codigoAgente:"agente_administrativo_02", nomeAgente:"Agente Administrativo Remoto",     funcaoAgente:"Confirmação de consultas D-1, reagendamentos via portal.", cargo:"ADMINISTRATIVO", modalidade:"remoto",     slaDefaultHoras:2,  naoFaz:["Agendamentos novos","Dúvidas clínicas","Cancelamento definitivo sem aprovação"] },
  { id:3,  codigoAgente:"agente_enfermagem_01",     nomeAgente:"Agente Enfermagem Presencial",     funcaoAgente:"Comunicação pós-sessão presencial, orientações de cuidado, envio do código de validação.", cargo:"ENFERMAGEM", modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Alterar protocolo","Dar prazo para sintomas sem avaliar","Decidir condutas novas"] },
  { id:4,  codigoAgente:"agente_enfermagem_02",     nomeAgente:"Agente Enfermagem Auditoria",      funcaoAgente:"Auditoria oculta do pós-sessão. Verifica se o paciente recebeu cuidado adequado.", cargo:"ENFERMAGEM", modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Revelar que é auditoria","Orientar condutas clínicas","Tomar decisões"] },
  { id:5,  codigoAgente:"agente_consultor_01",      nomeAgente:"Agente Consultor Presencial",      funcaoAgente:"Suporte técnico clínico presencial — orienta sobre fórmulas, exames, avaliação clínica.", cargo:"CONSULTOR", modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Prescrever","Alterar protocolo","Decidir condutas novas"] },
  { id:6,  codigoAgente:"agente_consultor_02",      nomeAgente:"Agente Consultor Remoto",          funcaoAgente:"Follow-up semanal de evolução, reativação de pacientes parados.", cargo:"CONSULTOR", modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Orientar condutas clínicas","Decidir sobre protocolo","Alterar prescrição"] },
  { id:7,  codigoAgente:"agente_supervisor_01",     nomeAgente:"Agente Supervisor Operacional",    funcaoAgente:"Controle operacional interno — cobra SLA, registra advertências, escalona para gerente.", cargo:"SUPERVISOR", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Falar com paciente","Decidir questões clínicas","Aprovar descontos"] },
  { id:8,  codigoAgente:"agente_supervisor_02",     nomeAgente:"Agente Supervisor Auditor",        funcaoAgente:"Auditoria oculta da qualidade dos atendimentos. Pesquisa de satisfação disfarçada.", cargo:"SUPERVISOR", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar que é auditoria","Fazer pressão","Influenciar respostas"] },
  { id:9,  codigoAgente:"agente_financeiro_01",     nomeAgente:"Agente Financeiro",                funcaoAgente:"Cobranças, acordos, nota fiscal, inadimplência e renovações financeiras.", cargo:"FINANCEIRO", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Decidir descontos acima de 15%","Cancelar protocolos","Emitir boletos sem aprovação"] },
  { id:10, codigoAgente:"agente_ouvidoria_01",      nomeAgente:"Agente Ouvidoria",                 funcaoAgente:"Canal confidencial para reclamações, sugestões e insatisfações. Protege a identidade.", cargo:"OUVIDORIA", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar identidade do reclamante","Tomar decisão punitiva","Minimizar reclamação"] },
];

const SEED_NARRATIVAS = [
  { id:1, codigoAgente:"agente_administrativo_01", titulo:"Novo paciente quer agendar consulta",   tag:"Novo Lead",     mensagens:[{lado:"paciente",texto:"Quero marcar uma consulta com o Dr. Caio"},{lado:"agente",texto:"Será um prazer organizar o seu agendamento.\n\nPara que eu encontre os melhores horários:\n\n· Qual unidade fica melhor para você?\n  Tatuapé · Alphaville · Guaxupé\n\n· Qual o seu nome completo?"}] },
  { id:2, codigoAgente:"agente_administrativo_01", titulo:"Paciente pergunta sobre plano de saúde",tag:"Dúvida",        mensagens:[{lado:"paciente",texto:"Aceita plano de saúde?"},{lado:"agente",texto:"A clínica atende exclusivamente de forma particular.\n\nIsso nos permite oferecer consultas sem limite de tempo e protocolos completamente personalizados.\n\nPosso te ajudar a agendar uma consulta?"}] },
  { id:3, codigoAgente:"agente_administrativo_02", titulo:"Confirmação de consulta D-1",          tag:"Confirmação",   mensagens:[{lado:"agente",texto:"Estou entrando em contato para confirmar seu atendimento de amanhã:\n\nUnidade: Tatuapé · 09h00\n\n1 — Confirmo\n2 — Preciso reagendar"},{lado:"paciente",texto:"1"},{lado:"agente",texto:"Perfeito. Te esperamos amanhã às 09h00."}] },
  { id:4, codigoAgente:"agente_enfermagem_01",     titulo:"Orientações pós-aplicação",            tag:"Pós-sessão",    mensagens:[{lado:"agente",texto:"João, seu procedimento foi realizado conforme o protocolo.\n\n· Hidratação — ao menos 2L de água hoje\n· Esforço físico — evite por 24 horas\n· Alimentação — refeições leves, sem álcool\n\nQualquer desconforto, me avise imediatamente."}] },
  { id:5, codigoAgente:"agente_enfermagem_02",     titulo:"Auditoria — tontura relatada",        tag:"Auditoria",     mensagens:[{lado:"agente",texto:"Bom dia. Sou da equipe de acompanhamento.\n\nComo você está após a sessão de ontem?"},{lado:"paciente",texto:"Fiquei com um pouco de tontura logo depois"},{lado:"agente",texto:"Obrigado por me contar. Vou encaminhar esta informação para a equipe clínica avaliar. Alguém entrará em contato em breve."}] },
  { id:6, codigoAgente:"agente_consultor_01",      titulo:"Dúvida sobre exame G6PD",             tag:"Técnica",       mensagens:[{lado:"paciente",texto:"Preciso fazer o exame G6PD antes do IV?"},{lado:"agente",texto:"Sim, o G6PD é necessário antes da Vitamina C intravenosa — verifica uma enzima que protege suas células. É rápido, qualquer laboratório realiza.\n\nPosso te orientar sobre onde realizar?"}] },
  { id:7, codigoAgente:"agente_consultor_02",      titulo:"Follow-up semanal — semana 4",        tag:"Follow-up",     mensagens:[{lado:"agente",texto:"Estou fazendo o acompanhamento da sua 4ª semana.\n\nComo tem se sentido?\n· Energia · Sono · Disposição geral"},{lado:"paciente",texto:"Muito melhor, dormindo bem e com mais energia"},{lado:"agente",texto:"Exatamente o esperado nesta fase. Continue seguindo o protocolo. Próximo retorno em 2 semanas."}] },
  { id:8, codigoAgente:"agente_financeiro_01",     titulo:"Cobrança de parcela vencida",         tag:"Financeiro",    mensagens:[{lado:"agente",texto:"Sou do setor financeiro da Clínica Pádua.\n\nA parcela referente ao seu protocolo venceu em 10/04.\nValor: R$ 450,00\n\n· Pix · Cartão · Boleto atualizado\n\nQual opção fica melhor?"}] },
  { id:9, codigoAgente:"agente_ouvidoria_01",      titulo:"Reclamação de atendimento",           tag:"Ouvidoria",     mensagens:[{lado:"paciente",texto:"Fui mal atendida pela enfermeira. Ela foi grossa e não explicou nada."},{lado:"agente",texto:"Obrigado por trazer isso para nós. Levamos muito a sério a qualidade do atendimento.\n\nEm qual unidade ocorreu? Qual a data aproximada?"},{lado:"paciente",texto:"Hoje de manhã, Tatuapé"},{lado:"agente",texto:"Registrado com total sigilo. Você receberá um retorno da direção em até 48 horas."}] },
];

const FLUXO_STEPS = [
  { n:"01", titulo:"Gatilho",               desc:"Consulta confirmada · Sessão realizada · SLA vencido · Auditoria programada", cor:H.orange },
  { n:"02", titulo:"Motor de Eventos",      desc:"Avalia qual agente deve atuar com base no tipo de evento e cargo responsável",  cor:"#4A3880" },
  { n:"03", titulo:"Busca de Contexto",     desc:"Dados do paciente + sessão + histórico de conversas + memórias contextuais",    cor:"#1A6868" },
  { n:"04", titulo:"Motor de Escrita",      desc:"Template + contexto + ação + regras (máx. 2 frases/bloco, quebra obrigatória)", cor:"#2A6E4A" },
  { n:"05", titulo:"Validação Humana",      desc:"Se requerValidacaoHumana=true — fila de aprovação → aprovador libera → disparo",cor:H.warn, extra:"Condicional" },
  { n:"06", titulo:"Disparo",               desc:"WhatsApp via Twilio/Gupshup · E-mail via Gmail API · SLA iniciado",            cor:H.orange },
  { n:"07", titulo:"Resposta do Paciente",  desc:"Motor analisa resposta → narrativa correta → ou escalada para supervisor",      cor:"#4A3880" },
  { n:"08", titulo:"Log e Memória",         desc:"Grava em execucoes_agente + memorias_contextuais_agente + prontidão",           cor:"#1A6868" },
];

const GAPS = [
  { sev:"Crítico", titulo:"Motor de Disparo",         desc:"Nenhum agente dispara WhatsApp real — campo podeEnviarWhatsapp=true existe mas não tem executor", cor:H.danger, corL:H.dangerL },
  { sev:"Crítico", titulo:"Worker de Execução",       desc:"Tabela execucoes_agente existe mas o consumer (listener de eventos) não foi construído",          cor:H.danger, corL:H.dangerL },
  { sev:"Alta",    titulo:"Fila de Validação Humana", desc:"validacoes_humanas_agente existe sem interface de aprovação no frontend",                          cor:H.warn,   corL:H.warnL   },
  { sev:"Alta",    titulo:"Motor de Memórias",        desc:"memorias_contextuais_agente existe sem lógica de gravação e recuperação por paciente",              cor:H.warn,   corL:H.warnL   },
  { sev:"Média",   titulo:"Consumer de Eventos",      desc:"eventos_saida_operacionais existe sem consumer que processa os eventos disparados",                 cor:H.gold,   corL:H.goldL   },
];

const ABAS = ["Catálogo de Agentes","Narrativas","Capacidades","Personalidade","Fluxo Operacional"];

// ─── SELETOR DE TIPOGRAFIA ────────────────────────────────────────────────────
function TypoSelector({ typo, onChange }: { typo: TypoConfig; onChange: (t: TypoConfig) => void }) {
  const update = useCallback((key: keyof TypoConfig, field: string, value: unknown) => {
    onChange({ ...typo, [key]: { ...typo[key], [field]: value } });
  }, [typo, onChange]);

  const onDocumentar = () => {
    const linhas = [
      "# Tipografia PAWARDS — Escolha Validada",
      "",
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      "",
      "## Tabela de Níveis Tipográficos",
      "",
      "| Nível | Família | Tamanho | Peso | Itálico | Uso |",
      "|-------|---------|---------|------|---------|-----|",
      ...TYPO_LEVELS.map(l => {
        const t = typo[l.key];
        return `| ${l.label} | ${t.family} | ${t.size}px | ${t.weight} | ${t.italic ? "Sim" : "Não"} | ${l.desc} |`;
      }),
      "",
      "## Código TypeScript — Objeto de Configuração",
      "",
      "```typescript",
      "const TYPO: TypoConfig = {",
      ...TYPO_LEVELS.map(l => {
        const t = typo[l.key];
        return `  ${l.key}: { family: "${t.family}", size: ${t.size}, weight: ${t.weight}, italic: ${t.italic} },`;
      }),
      "};",
      "```",
      "",
      "## Regras de Uso",
      "",
      "1. Título Principal — apenas 1 por tela, espaçamento generoso",
      "2. Título de Seção — cabeçalho de cada painel/grupo",
      "3. Subtítulo/Ementa — segunda linha de título, itálico intencional",
      "4. Corpo de Texto — parágrafos, descrições, narrativas",
      "5. Rótulo de Campo — UPPERCASE, labels de métricas e formulários",
      "6. Número/KPI — tabular-nums, valor métrico grande",
      "7. Legenda/Nota — metadados, SHA, timestamps, rodapé técnico",
    ].join("\n");

    const blob = new Blob([linhas], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `TIPOGRAFIA_PAWARDS_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: H.ivory, border: `1px solid ${H.border}`,
      borderTop: `3px solid ${H.orange}`, borderRadius: H.rLg,
      boxShadow: H.s3, padding: 0, overflow: "hidden",
    }}>
      {/* Header do painel */}
      <div style={{
        background: `linear-gradient(135deg, ${H.brown} 0%, ${H.brownM} 100%)`,
        padding: "14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:18, fontWeight:600, color:"#FFF", letterSpacing:"0.02em" }}>
            Seleção Tipográfica
          </div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:9, color:"rgba(255,255,255,0.6)", marginTop:2, letterSpacing:"0.08em" }}>
            Escolha a fonte e o tamanho para cada nível — prévia ao vivo à direita
          </div>
        </div>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:9, color:"rgba(255,255,255,0.5)" }}>
          PAINEL DE CONFIGURAÇÃO TIPOGRÁFICA
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
        {/* Coluna esquerda — controles */}
        <div style={{ padding:"20px", borderRight:`1px solid ${H.border}` }}>
          {TYPO_LEVELS.map(({ key, label, desc }) => {
            const t = typo[key];
            return (
              <div key={key} style={{ marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${H.borderL}` }}>
                <div style={{
                  fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700,
                  color:H.orange, letterSpacing:"0.1em", textTransform:"uppercase",
                  marginBottom:2,
                }}>{label}</div>
                <div style={{ fontFamily:"Inter, sans-serif", fontSize:8, color:H.brownL, marginBottom:8 }}>{desc}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 70px 40px", gap:6, alignItems:"center" }}>
                  {/* Família */}
                  <select
                    value={t.family}
                    onChange={e => update(key, "family", e.target.value)}
                    style={{
                      fontFamily:`'${t.family}', serif`, fontSize:11, padding:"4px 6px",
                      border:`1px solid ${H.border}`, borderRadius:H.r,
                      background:H.paper, color:H.brownM, cursor:"pointer",
                    }}
                  >
                    {FONT_FAMILIES.map(f => (
                      <option key={f} value={f} style={{ fontFamily:`'${f}', serif` }}>{f}</option>
                    ))}
                  </select>
                  {/* Tamanho */}
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <input
                      type="number" min={7} max={48} value={t.size}
                      onChange={e => update(key, "size", Number(e.target.value))}
                      style={{
                        width:"100%", padding:"4px 6px", fontFamily:"'JetBrains Mono', monospace",
                        fontSize:11, border:`1px solid ${H.border}`, borderRadius:H.r,
                        background:H.paper, color:H.brownM, textAlign:"center",
                      }}
                    />
                  </div>
                  {/* Peso */}
                  <select
                    value={t.weight}
                    onChange={e => update(key, "weight", Number(e.target.value))}
                    style={{
                      fontSize:11, padding:"4px 6px", border:`1px solid ${H.border}`,
                      borderRadius:H.r, background:H.paper, color:H.brownM, cursor:"pointer",
                      fontFamily:"Inter, sans-serif",
                    }}
                  >
                    {[300,400,500,600,700].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {/* Itálico */}
                  <button
                    onClick={() => update(key, "italic", !t.italic)}
                    style={{
                      fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:12,
                      fontWeight:700, padding:"4px 0", border:`1px solid ${t.italic ? H.orange : H.border}`,
                      borderRadius:H.r, background:t.italic ? H.orangeL : H.paper,
                      color:t.italic ? H.orange : H.brownL, cursor:"pointer",
                    }}
                    title="Ativar/desativar itálico"
                  >I</button>
                </div>
              </div>
            );
          })}
          <button
            onClick={onDocumentar}
            style={{
              width:"100%", padding:"12px", marginTop:4,
              background:`linear-gradient(135deg, ${H.orange} 0%, ${H.orangeM} 100%)`,
              color:"#FFF", border:"none", borderRadius:H.r,
              fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700,
              letterSpacing:"0.06em", cursor:"pointer", boxShadow:H.s1,
            }}
          >
            Baixar como .md — Documentar Tipografia
          </button>
        </div>

        {/* Coluna direita — prévia */}
        <div style={{ padding:"28px 24px", background:H.paper, display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ borderBottom:`1px solid ${H.borderL}`, paddingBottom:20 }}>
            <div style={{ ...typoStyle(typo.display), color:H.brownM, lineHeight:1.2, marginBottom:6 }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ ...typoStyle(typo.subhead), color:H.brownL, lineHeight:1.5 }}>
              Carta Magna PADCOM · Edição 001 · 19/07/2026
            </div>
          </div>
          <div style={{ borderBottom:`1px solid ${H.borderL}`, paddingBottom:20 }}>
            <div style={{ ...typoStyle(typo.heading), color:H.orange, letterSpacing:"0.04em", marginBottom:8, textTransform:"uppercase" }}>
              Administrativo — 2 Agentes
            </div>
            <div style={{ ...typoStyle(typo.body), color:H.brownM, lineHeight:1.7 }}>
              Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente com a estrutura de atendimento.
            </div>
          </div>
          <div style={{ borderBottom:`1px solid ${H.borderL}`, paddingBottom:20 }}>
            <div style={{ ...typoStyle(typo.label), color:H.brownL, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>
              SLA Padrão
            </div>
            <div style={{ ...typoStyle(typo.number), color:H.orange, fontVariantNumeric:"tabular-nums" }}>
              2h — 36h — 24h
            </div>
          </div>
          <div>
            <div style={{ ...typoStyle(typo.caption), color:H.brownL, letterSpacing:"0.08em" }}>
              SHA: 43d2765d · Documento: TSUNAMI 26.07.19 · Classificação: Restrito
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTES HERMÈS ───────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0" }}>
      <div style={{ flex:1, height:1, background:H.borderL }} />
      <div style={{ width:6, height:6, background:H.gold, transform:"rotate(45deg)" }} />
      <div style={{ flex:1, height:1, background:H.borderL }} />
    </div>
  );
}

function CardCargo({ cargo, agentes, typo, num }: {
  cargo:string; agentes:typeof SEED_CATALOGO; typo:TypoConfig; num:number;
}) {
  const [exp, setExp] = useState<number|null>(null);
  const c = CARGO[cargo] ?? { bg:H.orange, text:"#FFF", light:H.orangeL, border:H.orangeB };
  return (
    <div style={{
      background:H.paper, border:`1px solid ${H.border}`, borderRadius:H.rLg,
      boxShadow:H.s2, overflow:"hidden", borderTop:`3px solid ${c.bg}`,
    }}>
      {/* Header do cargo */}
      <div style={{
        padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:`1px solid ${H.borderL}`,
        background:`linear-gradient(180deg, ${c.light}, ${H.paper})`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:H.r,
            background:c.bg, display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:H.s1,
          }}>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:900, color:"#FFF", fontVariantNumeric:"tabular-nums" }}>
              {String(num).padStart(2,"0")}
            </span>
          </div>
          <div>
            <div style={{ ...typoStyle(typo.heading), color:H.brownM, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              {cargo}
            </div>
            <div style={{ ...typoStyle(typo.caption), color:H.brownL, marginTop:2 }}>
              {agentes.length} agente{agentes.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:11, fontStyle:"italic",
          color:c.bg, opacity:0.7,
        }}>
          SLA {agentes[0]?.slaDefaultHoras}h
        </div>
      </div>
      {/* Lista de agentes */}
      <div style={{ padding:"12px 20px", display:"flex", flexDirection:"column", gap:8 }}>
        {agentes.map((ag, i) => {
          const isExp = exp === ag.id;
          return (
            <div
              key={ag.id}
              style={{
                border:`1px solid ${isExp ? c.bg + "66" : H.borderL}`,
                borderRadius:H.r,
                background:isExp ? c.light : H.white,
                boxShadow:isExp ? H.s2 : H.s1,
                transition:"all 0.2s ease",
                cursor:"pointer",
                overflow:"hidden",
              }}
              onClick={() => setExp(isExp ? null : ag.id)}
            >
              {/* Linha */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize:10, fontWeight:700,
                    color:c.bg, background:c.light, border:`1px solid ${c.border}`,
                    padding:"2px 7px", borderRadius:"3px", fontVariantNumeric:"tabular-nums",
                  }}>
                    {ag.modalidade === "presencial" ? "▶" : "◀"} {ag.modalidade}
                  </span>
                  <span style={{ ...typoStyle(typo.body), color:H.brownM, fontWeight:600 }}>
                    {ag.nomeAgente}
                  </span>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:H.brownL }}>
                  {isExp ? "▾" : "▸"}
                </span>
              </div>
              {/* Expansão */}
              {isExp && (
                <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{
                    background:H.ivory, border:`1px solid ${H.borderL}`,
                    borderLeft:`3px solid ${c.bg}`, borderRadius:H.r, padding:"10px 14px",
                  }}>
                    <div style={{ ...typoStyle(typo.label), color:H.brownL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>
                      Função Principal
                    </div>
                    <div style={{ ...typoStyle(typo.body), color:H.brownM, lineHeight:1.7 }}>
                      {ag.funcaoAgente}
                    </div>
                  </div>
                  {ag.naoFaz && ag.naoFaz.length > 0 && (
                    <div style={{
                      background:H.dangerL, border:`1px solid ${H.danger}33`,
                      borderLeft:`3px solid ${H.danger}`, borderRadius:H.r, padding:"10px 14px",
                    }}>
                      <div style={{ ...typoStyle(typo.label), color:H.danger, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
                        Vedações — Não Pode Fazer
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px" }}>
                        {ag.naoFaz.map((v,j) => (
                          <span key={j} style={{
                            ...typoStyle(typo.caption), color:H.danger,
                            background:"#FFF", border:`1px solid ${H.danger}44`,
                            padding:"3px 9px", borderRadius:H.r,
                          }}>✕ {v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ ...typoStyle(typo.caption), color:H.brownL, paddingTop:4 }}>
                    Identificador: {ag.codigoAgente}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabCatalogo({ typo, catalogo }: { typo:TypoConfig; catalogo:typeof SEED_CATALOGO }) {
  const lista = catalogo.length > 0 ? catalogo : SEED_CATALOGO;
  const cargosOrdem = ["ADMINISTRATIVO","ENFERMAGEM","CONSULTOR","SUPERVISOR","FINANCEIRO","OUVIDORIA"];
  const grupos = cargosOrdem.filter(c => lista.some(a => a.cargo === c));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {grupos.map((cargo, gi) => (
        <CardCargo
          key={cargo}
          cargo={cargo}
          agentes={lista.filter(a => a.cargo === cargo)}
          typo={typo}
          num={gi + 1}
        />
      ))}
    </div>
  );
}

function TabNarrativas({ typo }: { typo:TypoConfig }) {
  const [filtro, setFiltro] = useState("Todos");
  const cargos = ["Todos", ...new Set(SEED_NARRATIVAS.map(n => {
    const ag = SEED_CATALOGO.find(a => a.codigoAgente === n.codigoAgente);
    return ag?.cargo ?? "";
  }).filter(Boolean))];
  const lista = filtro === "Todos"
    ? SEED_NARRATIVAS
    : SEED_NARRATIVAS.filter(n => {
        const ag = SEED_CATALOGO.find(a => a.codigoAgente === n.codigoAgente);
        return ag?.cargo === filtro;
      });

  return (
    <div>
      {/* Filtros */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {cargos.map(c => {
          const cor = CARGO[c]?.bg ?? H.orange;
          const isAti = filtro === c;
          return (
            <button key={c} onClick={() => setFiltro(c)} style={{
              fontFamily:"Inter, sans-serif", fontSize:9, fontWeight:600,
              padding:"5px 14px", borderRadius:H.rLg, cursor:"pointer",
              background:isAti ? cor : H.paper,
              color:isAti ? "#FFF" : H.brownS,
              border:`1px solid ${isAti ? cor : H.border}`,
              boxShadow:isAti ? H.s1 : "none",
              letterSpacing:"0.04em", transition:"all 0.15s",
            }}>{c}</button>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(420px,1fr))", gap:14 }}>
        {lista.map((narr, idx) => {
          const ag = SEED_CATALOGO.find(a => a.codigoAgente === narr.codigoAgente);
          const c = CARGO[ag?.cargo ?? ""] ?? { bg:H.orange, text:"#FFF", light:H.orangeL, border:H.orangeB };
          return (
            <div key={narr.id} style={{
              background:H.paper, border:`1px solid ${H.border}`,
              borderRadius:H.rLg, boxShadow:H.s1, overflow:"hidden",
              borderTop:`3px solid ${c.bg}`,
            }}>
              {/* Header */}
              <div style={{
                padding:"10px 16px", background:c.light,
                borderBottom:`1px solid ${c.border}`,
                display:"flex", justifyContent:"space-between", alignItems:"flex-start",
              }}>
                <div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:8, color:c.bg, letterSpacing:"0.1em", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>
                    {String(idx+1).padStart(3,"0")} · {ag?.nomeAgente ?? narr.codigoAgente}
                  </div>
                  <div style={{ ...typoStyle(typo.heading), color:H.brownM }}>
                    {narr.titulo}
                  </div>
                </div>
                <span style={{
                  fontFamily:"Inter, sans-serif", fontSize:8, fontWeight:700,
                  color:c.bg, border:`1px solid ${c.border}`,
                  padding:"2px 8px", borderRadius:H.r, whiteSpace:"nowrap", marginTop:2,
                }}>{narr.tag}</span>
              </div>
              {/* Mensagens */}
              <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                {(narr.mensagens as Array<{lado:string;texto:string}>).map((m, mi) => {
                  const isPac = m.lado === "paciente";
                  return (
                    <div key={mi} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                      <div style={{
                        fontFamily:"Inter, sans-serif", fontSize:8, fontWeight:700,
                        color:isPac ? H.brownL : c.bg, minWidth:56, paddingTop:7,
                        letterSpacing:"0.04em",
                      }}>{isPac ? "Paciente" : "Agente"}</div>
                      <div style={{
                        ...typoStyle(typo.body), color:isPac ? H.brownS : H.brownM,
                        background:isPac ? H.ivory : c.light,
                        border:`1px solid ${isPac ? H.borderL : c.border}`,
                        borderRadius:H.r, padding:"7px 11px", flex:1,
                        lineHeight:1.7, whiteSpace:"pre-wrap",
                      }}>{m.texto}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabCapacidades({ typo }: { typo:TypoConfig }) {
  const CAP_LABELS = ["WhatsApp","E-mail","Criar Tarefa","Atualizar Tarefa","Ler Agenda","Ler Acomp.","Escalar","Req. Validação","Nunca Caso Vermelho","Prontuário","Agendar","Cód. Validação","Memória"];
  const CAPS: Record<string, boolean[]> = {
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
    <div style={{ background:H.paper, border:`1px solid ${H.border}`, borderRadius:H.rLg, boxShadow:H.s2, overflow:"hidden" }}>
      <div style={{
        padding:"14px 20px", borderBottom:`1px solid ${H.border}`,
        background:`linear-gradient(180deg, ${H.ivory}, ${H.paper})`,
        display:"flex", alignItems:"center", gap:12,
      }}>
        <div style={{ width:3, height:20, background:H.orange, borderRadius:2 }} />
        <div style={{ ...typoStyle(typo.heading), color:H.brownM, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Matriz de Capacidades
        </div>
        <div style={{ ...typoStyle(typo.caption), color:H.brownL }}>
          10 agentes × 13 dimensões
        </div>
      </div>
      <div style={{ overflowX:"auto", padding:"0 0 4px" }}>
        <table style={{ borderCollapse:"separate", borderSpacing:0, width:"100%", fontSize:9 }}>
          <thead>
            <tr>
              <th style={{ ...thSt(typo), textAlign:"left", minWidth:200, background:H.ivory, borderRadius:`${H.r} 0 0 0`, paddingLeft:20 }}>Agente</th>
              {CAP_LABELS.map((l,i) => (
                <th key={i} style={{ ...thSt(typo), background:H.ivory, writingMode:"vertical-rl", height:110, minWidth:34, fontSize:8, fontWeight:400, color:H.brownL }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED_CATALOGO.map((ag, ri) => {
              const caps = CAPS[ag.codigoAgente] ?? [];
              const c = CARGO[ag.cargo] ?? { bg:H.orange };
              return (
                <tr key={ag.codigoAgente}>
                  <td style={{ ...tdSt(typo), background:ri%2===0?H.paper:H.ivory, borderLeft:`4px solid ${c.bg}`, paddingLeft:16 }}>
                    <div style={{ fontWeight:700, color:H.brownM }}>{ag.nomeAgente}</div>
                    <div style={{ fontSize:8, color:H.brownL, marginTop:1 }}>{ag.cargo}</div>
                  </td>
                  {CAP_LABELS.map((_,ci) => {
                    const v = caps[ci];
                    return (
                      <td key={ci} style={{ ...tdSt(typo), background:ri%2===0?H.paper:H.ivory, textAlign:"center" }}>
                        {v ? <span style={{ color:H.ok, fontSize:13, fontWeight:900 }}>✓</span>
                           : <span style={{ color:H.borderL, fontSize:11 }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thSt = (typo: TypoConfig): React.CSSProperties => ({
  ...typoStyle(typo.label), padding:"8px 10px",
  border:`1px solid ${H.borderL}`, color:H.brownM, fontWeight:700,
  textTransform:"uppercase", letterSpacing:"0.08em",
});
const tdSt = (typo: TypoConfig): React.CSSProperties => ({
  ...typoStyle(typo.body), padding:"8px 10px",
  border:`1px solid ${H.borderL}`, verticalAlign:"middle",
});

function TabPersonalidade({ typo }: { typo:TypoConfig }) {
  const PERS: Record<string, {
    formalidade:number; empatia:number; autoridade:number; objetividade:number;
    calorHumano:number; proatividade:number; paciencia:number;
    firmeza:number; didatismo:number; acolhimento:number; sensibilidade:number;
    tomGeral:string; generoVoz:string; exemploFraseTipica:string;
  }> = {
    agente_administrativo_01: { formalidade:10, empatia:6,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:8, paciencia:7, firmeza:4, didatismo:6,  acolhimento:7, sensibilidade:5,  tomGeral:"Acolhedor, organizado, preciso",     generoVoz:"Feminino", exemploFraseTipica:"Será um prazer organizar o seu atendimento." },
    agente_administrativo_02: { formalidade:7,  empatia:5,  autoridade:3,  objetividade:9,  calorHumano:5, proatividade:7, paciencia:6, firmeza:5, didatismo:7,  acolhimento:5, sensibilidade:4,  tomGeral:"Gentil, direto, funcional",         generoVoz:"Neutro",   exemploFraseTipica:"Estou entrando em contato para confirmar seu atendimento." },
    agente_enfermagem_01:     { formalidade:5,  empatia:9,  autoridade:4,  objetividade:7,  calorHumano:9, proatividade:7, paciencia:9, firmeza:3, didatismo:7,  acolhimento:9, sensibilidade:8,  tomGeral:"Técnico mas acolhedor, maternal",   generoVoz:"Feminino", exemploFraseTipica:"Estou te enviando as orientações do seu procedimento." },
    agente_enfermagem_02:     { formalidade:5,  empatia:8,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:6, paciencia:8, firmeza:3, didatismo:6,  acolhimento:8, sensibilidade:9,  tomGeral:"Cuidadoso, detalhado, investigativo",generoVoz:"Feminino", exemploFraseTipica:"Gostaria de entender melhor como o senhor se sentiu." },
    agente_consultor_01:      { formalidade:7,  empatia:6,  autoridade:7,  objetividade:9,  calorHumano:5, proatividade:6, paciencia:7, firmeza:6, didatismo:9,  acolhimento:5, sensibilidade:4,  tomGeral:"Científico mas acessível",          generoVoz:"Neutro",   exemploFraseTipica:"Boa pergunta! Vou te explicar com clareza." },
    agente_consultor_02:      { formalidade:5,  empatia:8,  autoridade:4,  objetividade:6,  calorHumano:8, proatividade:9, paciencia:8, firmeza:4, didatismo:8,  acolhimento:7, sensibilidade:6,  tomGeral:"Próximo, interessado, motivador",   generoVoz:"Neutro",   exemploFraseTipica:"Estou fazendo o acompanhamento da sua evolução." },
    agente_supervisor_01:     { formalidade:9,  empatia:2,  autoridade:9,  objetividade:10, calorHumano:1, proatividade:9, paciencia:3, firmeza:9, didatismo:5,  acolhimento:2, sensibilidade:1,  tomGeral:"Direto, sem rodeios, factual",      generoVoz:"Masculino",exemploFraseTipica:"ALERTA DE SLA — AÇÃO NECESSÁRIA." },
    agente_supervisor_02:     { formalidade:4,  empatia:7,  autoridade:3,  objetividade:7,  calorHumano:6, proatividade:5, paciencia:8, firmeza:7, didatismo:6,  acolhimento:4, sensibilidade:3,  tomGeral:"Natural, curioso, casual",          generoVoz:"Neutro",   exemploFraseTipica:"Sou da equipe de qualidade da clínica." },
    agente_financeiro_01:     { formalidade:8,  empatia:5,  autoridade:6,  objetividade:10, calorHumano:4, proatividade:7, paciencia:6, firmeza:6, didatismo:7,  acolhimento:3, sensibilidade:3,  tomGeral:"Cordial mas firme, factual",        generoVoz:"Neutro",   exemploFraseTipica:"Sou do setor financeiro da clínica." },
    agente_ouvidoria_01:      { formalidade:7,  empatia:10, autoridade:2,  objetividade:7,  calorHumano:9, proatividade:5, paciencia:10,firmeza:2, didatismo:6,  acolhimento:9, sensibilidade:10, tomGeral:"Sereno, acolhedor, neutro",         generoVoz:"Neutro",   exemploFraseTipica:"Obrigado por trazer isso para nós." },
  };
  const DIMS = [
    { key:"formalidade",  label:"Formalidade"  },
    { key:"empatia",      label:"Empatia"       },
    { key:"autoridade",   label:"Autoridade"    },
    { key:"objetividade", label:"Objetividade"  },
    { key:"calorHumano",  label:"Calor Humano"  },
    { key:"proatividade", label:"Proatividade"  },
    { key:"paciencia",    label:"Paciência"     },
    { key:"firmeza",      label:"Firmeza"       },
    { key:"didatismo",    label:"Didatismo"     },
    { key:"acolhimento",  label:"Acolhimento"   },
    { key:"sensibilidade",label:"Sensibilidade" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px,1fr))", gap:14 }}>
      {SEED_CATALOGO.map(ag => {
        const p = PERS[ag.codigoAgente];
        if (!p) return null;
        const c = CARGO[ag.cargo] ?? { bg:H.orange, text:"#FFF", light:H.orangeL, border:H.orangeB };
        return (
          <div key={ag.id} style={{
            background:H.paper, border:`1px solid ${H.border}`,
            borderRadius:H.rLg, boxShadow:H.s1, overflow:"hidden",
            borderTop:`3px solid ${c.bg}`,
          }}>
            <div style={{ padding:"12px 16px", background:c.light, borderBottom:`1px solid ${c.border}` }}>
              <div style={{ ...typoStyle(typo.label), color:c.bg, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>
                {ag.cargo} · {p.generoVoz}
              </div>
              <div style={{ ...typoStyle(typo.heading), color:H.brownM }}>
                {ag.nomeAgente}
              </div>
              <div style={{ ...typoStyle(typo.subhead), color:c.bg, marginTop:4 }}>
                "{p.tomGeral}"
              </div>
            </div>
            <div style={{ padding:"12px 16px" }}>
              {DIMS.map(({ key, label }) => {
                const val = (p as Record<string, number|string>)[key] as number;
                return (
                  <div key={key} style={{ display:"grid", gridTemplateColumns:"100px 1fr", gap:8, alignItems:"center", marginBottom:6 }}>
                    <div style={{ ...typoStyle(typo.caption), color:H.brownL, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:5, background:H.ivory, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${val*10}%`, background:c.bg, borderRadius:3, transition:"width 0.5s" }} />
                      </div>
                      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:9, color:H.brownL, minWidth:14, fontVariantNumeric:"tabular-nums" }}>{val}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{
                ...typoStyle(typo.body), fontStyle:"italic", color:H.brownS,
                background:H.ivory, border:`1px solid ${H.borderL}`,
                borderLeft:`3px solid ${c.bg}`, borderRadius:H.r,
                padding:"7px 11px", marginTop:10, lineHeight:1.6,
              }}>
                "{p.exemploFraseTipica}"
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabFluxo({ typo }: { typo:TypoConfig }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Diagrama */}
      <div style={{ background:H.paper, border:`1px solid ${H.border}`, borderRadius:H.rLg, boxShadow:H.s2, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${H.border}`, background:`linear-gradient(180deg,${H.ivory},${H.paper})`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:3, height:20, background:H.orange, borderRadius:2 }} />
          <div style={{ ...typoStyle(typo.heading), color:H.brownM, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Arquitetura de Disparo — Do Gatilho ao Log
          </div>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          {FLUXO_STEPS.map((s, i) => {
            const isLast = i === FLUXO_STEPS.length - 1;
            return (
              <div key={i} style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{
                  display:"flex", alignItems:"flex-start", gap:14,
                  background:H.white, border:`1px solid ${H.borderL}`,
                  borderLeft:`5px solid ${s.cor}`, borderRadius:H.r,
                  boxShadow:H.s1, padding:"12px 16px", width:"100%",
                }}>
                  <div style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:900,
                    color:"#FFF", background:s.cor, width:34, height:34, borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, fontVariantNumeric:"tabular-nums",
                  }}>{s.n}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{ ...typoStyle(typo.heading), color:H.brownM }}>{s.titulo}</div>
                      {s.extra && (
                        <span style={{
                          fontFamily:"Inter, sans-serif", fontSize:8, fontWeight:700,
                          color:H.warn, background:H.warnL, border:`1px solid ${H.warn}44`,
                          padding:"2px 7px", borderRadius:H.r,
                        }}>{s.extra}</span>
                      )}
                    </div>
                    <div style={{ ...typoStyle(typo.body), color:H.brownS, lineHeight:1.7 }}>{s.desc}</div>
                  </div>
                </div>
                {!isLast && (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"3px 0" }}>
                    <div style={{ width:2, height:12, background:H.borderD }} />
                    <div style={{ color:H.brownL, fontSize:12 }}>▼</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* GAPS */}
      <div style={{ background:H.paper, border:`1px solid ${H.border}`, borderRadius:H.rLg, boxShadow:H.s1, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${H.border}`, background:`linear-gradient(180deg,${H.dangerL},${H.paper})`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:3, height:20, background:H.danger, borderRadius:2 }} />
          <div style={{ ...typoStyle(typo.heading), color:H.danger, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Gaps Críticos — O que ainda não existe
          </div>
        </div>
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:8 }}>
          {GAPS.map((g, i) => (
            <div key={i} style={{
              display:"flex", gap:12, alignItems:"flex-start",
              background:g.corL, border:`1px solid ${g.cor}33`,
              borderLeft:`4px solid ${g.cor}`, borderRadius:H.r, padding:"10px 14px",
            }}>
              <span style={{
                fontFamily:"Inter, sans-serif", fontSize:8, fontWeight:900,
                color:"#FFF", background:g.cor, padding:"3px 9px",
                borderRadius:H.r, whiteSpace:"nowrap", flexShrink:0, marginTop:1,
              }}>{g.sev}</span>
              <div>
                <div style={{ ...typoStyle(typo.heading), color:H.brownM }}>{g.titulo}</div>
                <div style={{ ...typoStyle(typo.body), color:H.brownS, marginTop:3, lineHeight:1.6 }}>{g.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function CartaMagnaPadcomPage() {
  useGoogleFonts();

  const [aba,      setAba     ] = useState(0);
  const [typo,     setTypo    ] = useState<TypoConfig>(TYPO_DEFAULT);
  const [mostraTypo, setMostraTypo] = useState(false);
  const [catalogo, setCatalogo] = useState<typeof SEED_CATALOGO>([]);
  const [stats,    setStats   ] = useState<{catalogoTotal:number;provisionadosTotal:number;narrativasTotal:number;execucoesTotal:number}|null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/agentes-virtuais/catalogo").then(r => r.json()).catch(() => null),
      apiFetch("/api/agentes-virtuais/stats").then(r => r.json()).catch(() => null),
    ]).then(([cat, st]) => {
      if (cat && Array.isArray(ensureArray(cat))) setCatalogo(ensureArray(cat));
      if (st && typeof st.catalogoTotal === "number") setStats(st);
    });
  }, []);

  const s = stats ?? { catalogoTotal:20, provisionadosTotal:100, narrativasTotal:22, execucoesTotal:0 };

  return (
    <div style={{ background:H.cream, minHeight:"100vh", fontFamily:"'Cormorant Garamond', Georgia, serif" }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        background:`linear-gradient(180deg, #5C3018 0%, #3C1E08 100%)`,
        boxShadow:`0 4px 20px rgba(60,24,8,0.35)`,
      }}>
        {/* Faixa superior — marca + KPIs */}
        <div style={{ padding:"20px 32px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Identidade */}
          <div>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:8, color:"rgba(255,255,255,0.5)", letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:6 }}>
              Sistema Pawards · Padcom · Módulo de Inteligência
            </div>
            <div style={{ ...typoStyle(typo.display), color:"#FFFFFF", lineHeight:1.1, letterSpacing:"0.02em" }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ ...typoStyle(typo.subhead), color:"rgba(255,255,255,0.55)", marginTop:6 }}>
              Carta Magna PADCOM · Edição 001 · Publicado em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:"flex", gap:4, alignItems:"stretch" }}>
            {[
              { label:"Agentes",    valor:s.catalogoTotal        },
              { label:"Instâncias", valor:s.provisionadosTotal   },
              { label:"Narrativas", valor:s.narrativasTotal      },
              { label:"Execuções",  valor:s.execucoesTotal       },
            ].map((k, i) => (
              <div key={i} style={{
                background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)",
                borderRadius:H.r, padding:"10px 20px", textAlign:"center",
                display:"flex", flexDirection:"column", gap:4,
              }}>
                <div style={{ fontFamily:"Inter, sans-serif", fontSize:8, color:"rgba(255,255,255,0.5)", letterSpacing:"0.12em", textTransform:"uppercase" }}>{k.label}</div>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:26, fontWeight:700, color:"#FFFFFF", fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.valor}</div>
              </div>
            ))}
            {/* Botão tipografia */}
            <button
              onClick={() => setMostraTypo(v => !v)}
              style={{
                fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:13, fontStyle:"italic",
                background: mostraTypo ? H.orange : "rgba(255,255,255,0.10)",
                border:`1px solid ${mostraTypo ? H.orange : "rgba(255,255,255,0.18)"}`,
                color:"#FFF", borderRadius:H.r, padding:"10px 16px", cursor:"pointer",
                transition:"all 0.2s", boxShadow:mostraTypo ? H.s2 : "none",
              }}
            >
              {mostraTypo ? "Fechar Tipografia" : "Tipografia"}
            </button>
          </div>
        </div>

        {/* Divisor ornamental */}
        <div style={{ margin:"12px 32px 0", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.12)" }} />
          <div style={{ width:5, height:5, background:H.goldM, transform:"rotate(45deg)" }} />
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.12)" }} />
        </div>

        {/* Abas */}
        <div style={{ display:"flex", gap:2, padding:"8px 24px 0", overflowX:"auto" }}>
          {ABAS.map((a, i) => {
            const isAti = aba === i;
            return (
              <button
                key={i}
                onClick={() => setAba(i)}
                style={{
                  fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:13, fontWeight: isAti ? 600 : 400,
                  fontStyle: isAti ? "normal" : "italic",
                  padding:"10px 22px",
                  background: isAti ? H.cream : "transparent",
                  color: isAti ? H.orange : "rgba(255,255,255,0.65)",
                  border:"none", borderRadius:`${H.r} ${H.r} 0 0`,
                  cursor:"pointer", transition:"all 0.15s",
                  letterSpacing:"0.02em", whiteSpace:"nowrap",
                  boxShadow: isAti ? `0 -2px 8px rgba(60,24,8,0.15)` : "none",
                  position:"relative", zIndex: isAti ? 2 : 1,
                }}
              >{a}</button>
            );
          })}
        </div>
      </div>

      {/* ── CONTEÚDO ─────────────────────────────────────────────────────── */}
      <div style={{ padding:"24px 32px", maxWidth:1400, margin:"0 auto" }}>

        {/* Painel de tipografia */}
        {mostraTypo && (
          <div style={{ marginBottom:24 }}>
            <TypoSelector typo={typo} onChange={setTypo} />
          </div>
        )}

        {/* Conteúdo das abas */}
        {aba === 0 && <TabCatalogo typo={typo} catalogo={catalogo} />}
        {aba === 1 && <TabNarrativas typo={typo} />}
        {aba === 2 && <TabCapacidades typo={typo} />}
        {aba === 3 && <TabPersonalidade typo={typo} />}
        {aba === 4 && <TabFluxo typo={typo} />}

        {/* Rodapé */}
        <Divider />
        <div style={{ textAlign:"center", paddingBottom:24 }}>
          <div style={{ fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:11, fontStyle:"italic", color:H.brownL }}>
            Constituição dos Agentes Virtuais · Carta Magna PADCOM · Edição 001 · 19/07/2026
          </div>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:8, color:H.borderD, marginTop:4, letterSpacing:"0.08em" }}>
            SHA: 43d2765d · TSUNAMI_AGENTES_VIRTUAIS_CARTA_MAGNA_PADCOM_26.07.19.md · Classificação: Restrito
          </div>
        </div>
      </div>
    </div>
  );
}
