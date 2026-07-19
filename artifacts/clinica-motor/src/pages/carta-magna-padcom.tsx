import { useState, useEffect } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

// ─── TEMA CLARO "PAINEL CLÁSSICO" ─────────────────────────────────────────────
// Inspirado em Windows XP / Painel de Controle clássico: fundo azul-acinzentado,
// painéis brancos com sombra em camadas, cantos levemente arredondados.
const T = {
  desktop:     "#D8E5F0",
  panel:       "#FFFFFF",
  panel2:      "#F0F6FB",
  panel3:      "#E4EEF7",
  titlebar:    "linear-gradient(180deg, #6EB3EF 0%, #1E6FC8 100%)",
  titlebar2:   "linear-gradient(180deg, #4A8ACC 0%, #1A5FAD 100%)",
  sidebar:     "linear-gradient(180deg, #1D5CA8 0%, #0F3E7C 100%)",
  border:      "#BDD0E4",
  borderMid:   "#9AB8D4",
  borderDark:  "#7A9EC0",
  text1:       "#1A2B3C",
  text2:       "#3C5870",
  text3:       "#7890A8",
  accent:      "#1E6FC8",
  accentH:     "#1558A0",
  accentL:     "#EBF4FF",
  ok:          "#2A7A4E",
  okL:         "#E6F5EC",
  warn:        "#A86800",
  warnL:       "#FFF4DC",
  danger:      "#B03030",
  dangerL:     "#FDE8E8",
  s1: "0 2px 5px rgba(0,40,100,0.09), 0 1px 2px rgba(0,40,100,0.06)",
  s2: "0 4px 14px rgba(0,40,100,0.13), 0 2px 5px rgba(0,40,100,0.08)",
  s3: "0 8px 28px rgba(0,40,100,0.18), 0 3px 8px rgba(0,40,100,0.10)",
  inset: "inset 0 2px 4px rgba(0,40,100,0.08)",
  r:  "6px",
  rSm:"4px",
  rLg:"8px",
};

const CARGO_COR: Record<string, { bg: string; text: string; light: string; border: string }> = {
  ADMINISTRATIVO: { bg:"#1E6FC8", text:"#FFFFFF", light:"#EBF4FF", border:"#A8CCEC" },
  ENFERMAGEM:     { bg:"#2A7A4E", text:"#FFFFFF", light:"#E6F5EC", border:"#9ACFB0" },
  CONSULTOR:      { bg:"#5A3FA8", text:"#FFFFFF", light:"#EEE8FF", border:"#B8A8E8" },
  SUPERVISOR:     { bg:"#A86800", text:"#FFFFFF", light:"#FFF4DC", border:"#DFC080" },
  FINANCEIRO:     { bg:"#1A7A6E", text:"#FFFFFF", light:"#E4F5F2", border:"#88CCBF" },
  OUVIDORIA:      { bg:"#A83060", text:"#FFFFFF", light:"#FDE8F2", border:"#DFA8C0" },
};

const FONT: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
};

// ─── SEED ─────────────────────────────────────────────────────────────────────
const SEED_CATALOGO = [
  { id:1,  codigoAgente:"agente_administrativo_01", nomeAgente:"Agente Administrativo Presencial", descricao:"Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente.", funcaoAgente:"Agendamento, boas-vindas, onboarding e informações da clínica.", cargo:"ADMINISTRATIVO", modalidade:"presencial", slaDefaultHoras:2,  naoFaz:["Dúvidas clínicas","Valores de fórmulas","Decisões de desconto","Cancelamento de protocolos","Orientações pós-sessão"] },
  { id:2,  codigoAgente:"agente_administrativo_02", nomeAgente:"Agente Administrativo Remoto",     descricao:"Confirmação de consultas D-1, reagendamentos via portal.", funcaoAgente:"Confirmação de consultas D-1 e reagendamentos.", cargo:"ADMINISTRATIVO", modalidade:"remoto",     slaDefaultHoras:2,  naoFaz:["Agendamentos novos","Dúvidas clínicas","Cancelamento definitivo sem aprovação"] },
  { id:3,  codigoAgente:"agente_enfermagem_01",     nomeAgente:"Agente Enfermagem Presencial",     descricao:"Comunicação pós-sessão presencial, orientações de cuidado, envio do código de validação.", funcaoAgente:"Comunicação pós-sessão e código de validação.", cargo:"ENFERMAGEM", modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Alterar protocolo","Dar prazo para sintomas sem avaliar","Decidir condutas novas"] },
  { id:4,  codigoAgente:"agente_enfermagem_02",     nomeAgente:"Agente Enfermagem Auditoria",      descricao:"Auditoria oculta do pós-sessão. Verifica se o paciente recebeu cuidado adequado.", funcaoAgente:"Auditoria oculta de qualidade do atendimento.", cargo:"ENFERMAGEM", modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Revelar que é auditoria","Orientar condutas clínicas","Tomar decisões"] },
  { id:5,  codigoAgente:"agente_consultor_01",      nomeAgente:"Agente Consultor Presencial",      descricao:"Suporte técnico clínico presencial — orienta sobre fórmulas, exames, avaliação clínica.", funcaoAgente:"Suporte técnico clínico presencial.", cargo:"CONSULTOR", modalidade:"presencial", slaDefaultHoras:36, naoFaz:["Prescrever","Alterar protocolo","Decidir condutas novas"] },
  { id:6,  codigoAgente:"agente_consultor_02",      nomeAgente:"Agente Consultor Remoto",          descricao:"Follow-up semanal de evolução, reativação de pacientes parados.", funcaoAgente:"Follow-up semanal e reativação.", cargo:"CONSULTOR", modalidade:"remoto",     slaDefaultHoras:36, naoFaz:["Orientar condutas clínicas","Decidir sobre protocolo","Alterar prescrição"] },
  { id:7,  codigoAgente:"agente_supervisor_01",     nomeAgente:"Agente Supervisor Operacional",    descricao:"Controle operacional interno — cobra SLA, registra advertências, escalona para gerente.", funcaoAgente:"Controle de SLA e cobrança interna à equipe.", cargo:"SUPERVISOR", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Falar com paciente","Decidir questões clínicas","Aprovar descontos"] },
  { id:8,  codigoAgente:"agente_supervisor_02",     nomeAgente:"Agente Supervisor Auditor",        descricao:"Auditoria oculta da qualidade dos atendimentos. Pesquisa de satisfação disfarçada.", funcaoAgente:"Auditoria oculta da qualidade via pesquisa.", cargo:"SUPERVISOR", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar que é auditoria","Fazer pressão","Influenciar respostas"] },
  { id:9,  codigoAgente:"agente_financeiro_01",     nomeAgente:"Agente Financeiro",                descricao:"Cobranças, acordos, nota fiscal, inadimplência e renovações financeiras.", funcaoAgente:"Cobranças, acordos e nota fiscal.", cargo:"FINANCEIRO", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Decidir descontos acima de 15%","Cancelar protocolos","Emitir boletos sem aprovação"] },
  { id:10, codigoAgente:"agente_ouvidoria_01",      nomeAgente:"Agente Ouvidoria",                 descricao:"Canal confidencial para reclamações, sugestões e insatisfações. Protege a identidade.", funcaoAgente:"Canal confidencial de reclamações e sugestões.", cargo:"OUVIDORIA", modalidade:"remoto",     slaDefaultHoras:24, naoFaz:["Revelar identidade do reclamante","Tomar decisão punitiva","Minimizar reclamação"] },
];

const SEED_PERSONALIDADE: Record<string, {
  formalidade:number; empatia:number; autoridade:number; objetividade:number;
  calorHumano:number; proatividade:number; paciencia:number; nivelHumanizacao:number;
  firmeza:number; didatismo:number; acolhimento:number; sensibilidade:number;
  tomGeral:string; generoVoz:string; exemploFraseTipica:string;
}> = {
  agente_administrativo_01: { formalidade:10, empatia:6,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:8, paciencia:7, nivelHumanizacao:7, firmeza:4, didatismo:6,  acolhimento:7, sensibilidade:5,  tomGeral:"Acolhedor, organizado, preciso",      generoVoz:"Feminino", exemploFraseTipica:"Será um prazer organizar o seu atendimento." },
  agente_administrativo_02: { formalidade:7,  empatia:5,  autoridade:3,  objetividade:9,  calorHumano:5, proatividade:7, paciencia:6, nivelHumanizacao:5, firmeza:5, didatismo:7,  acolhimento:5, sensibilidade:4,  tomGeral:"Gentil, direto, funcional",          generoVoz:"Neutro",   exemploFraseTipica:"Estou entrando em contato para confirmar seu atendimento." },
  agente_enfermagem_01:     { formalidade:5,  empatia:9,  autoridade:4,  objetividade:7,  calorHumano:9, proatividade:7, paciencia:9, nivelHumanizacao:9, firmeza:3, didatismo:7,  acolhimento:9, sensibilidade:8,  tomGeral:"Técnico mas acolhedor, maternal",   generoVoz:"Feminino", exemploFraseTipica:"Estou te enviando as orientações do seu procedimento." },
  agente_enfermagem_02:     { formalidade:5,  empatia:8,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:6, paciencia:8, nivelHumanizacao:7, firmeza:3, didatismo:6,  acolhimento:8, sensibilidade:9,  tomGeral:"Cuidadoso, detalhado, investigativo",generoVoz:"Feminino", exemploFraseTipica:"Gostaria de entender melhor como o senhor se sentiu." },
  agente_consultor_01:      { formalidade:7,  empatia:6,  autoridade:7,  objetividade:9,  calorHumano:5, proatividade:6, paciencia:7, nivelHumanizacao:5, firmeza:6, didatismo:9,  acolhimento:5, sensibilidade:4,  tomGeral:"Científico mas acessível",           generoVoz:"Neutro",   exemploFraseTipica:"Boa pergunta! Vou te explicar com clareza." },
  agente_consultor_02:      { formalidade:5,  empatia:8,  autoridade:4,  objetividade:6,  calorHumano:8, proatividade:9, paciencia:8, nivelHumanizacao:8, firmeza:4, didatismo:8,  acolhimento:7, sensibilidade:6,  tomGeral:"Próximo, interessado, motivador",    generoVoz:"Neutro",   exemploFraseTipica:"Estou fazendo o acompanhamento da sua evolução." },
  agente_supervisor_01:     { formalidade:9,  empatia:2,  autoridade:9,  objetividade:10, calorHumano:1, proatividade:9, paciencia:3, nivelHumanizacao:1, firmeza:9, didatismo:5,  acolhimento:2, sensibilidade:1,  tomGeral:"Direto, sem rodeios, factual",       generoVoz:"Masculino",exemploFraseTipica:"ALERTA DE SLA — AÇÃO NECESSÁRIA." },
  agente_supervisor_02:     { formalidade:4,  empatia:7,  autoridade:3,  objetividade:7,  calorHumano:6, proatividade:5, paciencia:8, nivelHumanizacao:6, firmeza:7, didatismo:6,  acolhimento:4, sensibilidade:3,  tomGeral:"Natural, curioso, casual",           generoVoz:"Neutro",   exemploFraseTipica:"Sou da equipe de qualidade da clínica." },
  agente_financeiro_01:     { formalidade:8,  empatia:5,  autoridade:6,  objetividade:10, calorHumano:4, proatividade:7, paciencia:6, nivelHumanizacao:4, firmeza:6, didatismo:7,  acolhimento:3, sensibilidade:3,  tomGeral:"Cordial mas firme, factual",         generoVoz:"Neutro",   exemploFraseTipica:"Sou do setor financeiro da clínica." },
  agente_ouvidoria_01:      { formalidade:7,  empatia:10, autoridade:2,  objetividade:7,  calorHumano:9, proatividade:5, paciencia:10,nivelHumanizacao:9, firmeza:2, didatismo:6,  acolhimento:9, sensibilidade:10, tomGeral:"Sereno, acolhedor, neutro",          generoVoz:"Neutro",   exemploFraseTipica:"Obrigado por trazer isso para nós." },
};

const SEED_CAPACIDADES: Record<string, boolean[]> = {
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

const CAP_LABELS = ["WhatsApp","E-mail","Criar Tarefa","Atualizar Tarefa","Ler Agenda","Ler Acompan.","Escalar","Req. Validação","Nunca Caso Vermelho","Prontuário","Agendar","Cód. Validação","Registrar Memória"];

const SEED_NARRATIVAS = [
  { id:1,  codigoAgente:"agente_administrativo_01", titulo:"Novo paciente quer agendar consulta",    tag:"NOVO LEAD",       mensagens:[{lado:"paciente",texto:"Quero marcar uma consulta com o Dr. Caio"},{lado:"agente",texto:"Será um prazer organizar o seu agendamento!\n\nPara que eu encontre os melhores horários:\n\n• Qual unidade fica melhor para você?\n  — Tatuapé\n  — Alphaville\n  — Guaxupé\n\n• Qual o seu nome completo?"},{lado:"paciente",texto:"Tatuapé, me chamo João"},{lado:"agente",texto:"Perfeito, João! Para a unidade do Tatuapé:\n\nQui 17/04 — 09:00\nQui 17/04 — 10:00\nSex 18/04 — 14:00\n\nQual horário fica melhor?"}] },
  { id:2,  codigoAgente:"agente_administrativo_01", titulo:"Paciente pergunta sobre plano de saúde", tag:"DÚVIDA FINANCEIRA", mensagens:[{lado:"paciente",texto:"Aceita plano de saúde?"},{lado:"agente",texto:"A clínica atende exclusivamente de forma particular.\n\nIsso nos permite oferecer consultas sem limite de tempo e protocolos personalizados.\n\nPosso te ajudar a agendar uma consulta?"}] },
  { id:3,  codigoAgente:"agente_administrativo_02", titulo:"Confirmação de consulta D-1",            tag:"CONFIRMAÇÃO",      mensagens:[{lado:"agente",texto:"Estou entrando em contato para confirmar seu atendimento de amanhã:\n\nUnidade: Tatuapé · Data: Qui 17/04 às 09:00\n\nPor gentileza, confirme:\n1 — Confirmo\n2 — Preciso reagendar"},{lado:"paciente",texto:"1"},{lado:"agente",texto:"Perfeito! Confirmado. Te esperamos amanhã às 09:00."}] },
  { id:4,  codigoAgente:"agente_enfermagem_01",     titulo:"Orientações pós-aplicação",              tag:"PÓS-SESSÃO",       mensagens:[{lado:"agente",texto:"João, seu procedimento de hoje foi realizado conforme o protocolo.\n\nOrientações:\n• Hidratação — beba ao menos 2L de água hoje\n• Esforço físico — evite por 24h\n• Alimentação — refeições leves, evite álcool\n\nSe sentir qualquer desconforto, responda esta mensagem."}] },
  { id:5,  codigoAgente:"agente_enfermagem_02",     titulo:"Auditoria amarela — tontura relatada",   tag:"AUDITORIA",        mensagens:[{lado:"agente",texto:"Bom dia! Sou da equipe de acompanhamento da Clínica Pádua.\n\nComo você está após a sessão de ontem?\n• Como se sentiu durante o procedimento?\n• Teve algum desconforto depois?"},{lado:"paciente",texto:"Fiquei com um pouco de tontura logo depois"},{lado:"agente",texto:"Obrigado por me contar. Vou encaminhar esta informação para a equipe clínica avaliar. Alguém entrará em contato em breve."}] },
  { id:6,  codigoAgente:"agente_consultor_01",      titulo:"Dúvida sobre exame G6PD",               tag:"DÚVIDA CLÍNICA",   mensagens:[{lado:"paciente",texto:"Preciso fazer o exame G6PD antes do IV?"},{lado:"agente",texto:"Sim, o exame de G6PD é necessário antes da terapia com Vitamina C intravenosa.\n\nEsse exame verifica uma enzima que protege suas células — é rápido e pode ser feito em qualquer laboratório.\n\nPosso te orientar sobre onde realizar?"}] },
  { id:7,  codigoAgente:"agente_consultor_02",      titulo:"Follow-up semanal — semana 4",          tag:"FOLLOW-UP",        mensagens:[{lado:"agente",texto:"Estou fazendo o acompanhamento da sua 4ª semana de tratamento.\n\nComo tem se sentido?\n• Energia · Sono · Disposição geral"},{lado:"paciente",texto:"Estou dormindo muito melhor e com mais energia"},{lado:"agente",texto:"Essas são exatamente as melhorias esperadas nesta fase. Continue seguindo o protocolo. Seu próximo retorno está em 2 semanas."}] },
  { id:8,  codigoAgente:"agente_supervisor_01",     titulo:"Alerta de SLA vencido",                 tag:"SLA INTERNO",      mensagens:[{lado:"agente",texto:"ALERTA DE SLA — AÇÃO NECESSÁRIA\n\nenf02 · Tarefa #1024 · Paciente: Maria Silva\nSLA: 36h · Vencido há: 4h\n\nAção requerida:\n• Concluir tarefa imediatamente\n• Justificar atraso\n\nPrazo final: hoje às 18h"}] },
  { id:9,  codigoAgente:"agente_financeiro_01",     titulo:"Cobrança de parcela vencida",           tag:"COBRANÇA",         mensagens:[{lado:"agente",texto:"Sou do setor financeiro da Clínica Pádua.\n\nIdentifiquei que a parcela referente ao seu protocolo venceu em 10/04.\n\nValor: R$ 450,00\n\nPosso te ajudar a regularizar?\n• Pix · Cartão · Boleto atualizado"},{lado:"paciente",texto:"Estava com problema no cartão"},{lado:"agente",texto:"Posso te oferecer:\n1 — Pix com QR code\n2 — Boleto atualizado\n3 — Novo link de cartão\n\nQual opção fica melhor?"}] },
  { id:10, codigoAgente:"agente_ouvidoria_01",      titulo:"Reclamação de atendimento",             tag:"RECLAMAÇÃO",       mensagens:[{lado:"paciente",texto:"Fui mal atendida pela enfermeira. Ela foi grossa e não explicou nada."},{lado:"agente",texto:"Obrigado por trazer isso para nós. Levamos muito a sério a qualidade do atendimento.\n\nEm qual unidade ocorreu? Qual a data aproximada?"},{lado:"paciente",texto:"Foi hoje de manhã no Tatuapé"},{lado:"agente",texto:"Registrado. Sua manifestação foi encaminhada para a direção com total sigilo. Você receberá um retorno em até 48 horas."}] },
];

const FLUXO_STEPS = [
  { n:"01", titulo:"Gatilho",             desc:"Consulta confirmada · Sessão realizada · SLA vencido · Auditoria programada", cor:T.accent },
  { n:"02", titulo:"Motor de Eventos",    desc:"Avalia qual agente deve atuar com base no tipo de evento e cargo responsável", cor:"#5A3FA8" },
  { n:"03", titulo:"Busca de Contexto",   desc:"Agente busca: dados do paciente + sessão + histórico de conversas + memórias contextuais", cor:"#1A7A6E" },
  { n:"04", titulo:"Motor de Escrita",    desc:"Template + contexto + informação + orientação + ação + regras (máx. 2 frases/bloco, quebra de linha obrigatória)", cor:"#2A7A4E" },
  { n:"05", titulo:"Validação Humana",    desc:"Se requerValidacaoHumana=true — fila de aprovação → aprovador libera → disparo", cor:T.warn, extra:"CONDICIONAL" },
  { n:"06", titulo:"Disparo",             desc:"WhatsApp via Twilio/Gupshup · E-mail via Gmail API · SLA iniciado", cor:T.accent },
  { n:"07", titulo:"Resposta do Paciente",desc:"Motor analisa resposta → redireciona para narrativa correta → ou escalada para supervisor", cor:"#5A3FA8" },
  { n:"08", titulo:"Log e Memória",       desc:"Grava em execucoes_agente + memorias_contextuais_agente + atualiza estado de prontidão", cor:"#1A7A6E" },
];

const GAPS = [
  { sev:"CRÍTICO", titulo:"Motor de Disparo",         desc:"Nenhum agente dispara WhatsApp real — campo podeEnviarWhatsapp=true existe mas não tem executor", cor:T.danger, corL:T.dangerL },
  { sev:"CRÍTICO", titulo:"Worker de Execução",       desc:"Tabela execucoes_agente existe mas o consumer (listener de eventos) não foi construído", cor:T.danger, corL:T.dangerL },
  { sev:"ALTA",    titulo:"Fila de Validação Humana", desc:"validacoes_humanas_agente existe sem interface de aprovação no frontend", cor:T.warn, corL:T.warnL },
  { sev:"ALTA",    titulo:"Motor de Memórias",        desc:"memorias_contextuais_agente existe sem lógica de gravação e recuperação por paciente", cor:T.warn, corL:T.warnL },
  { sev:"MÉDIA",   titulo:"Consumer de Eventos",      desc:"eventos_saida_operacionais existe sem consumer que processa os eventos disparados", cor:T.accent, corL:T.accentL },
];

const ABAS = ["Catálogo de Agentes","Narrativas","Capacidades","Personalidade","Fluxo Operacional"];

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────

function Painel({ titulo, children, corTopo, nivel = 1, badge }: {
  titulo: React.ReactNode; children: React.ReactNode;
  corTopo?: string; nivel?: 1|2|3; badge?: React.ReactNode;
}) {
  const shadows = [T.s1, T.s2, T.s3] as const;
  const bgMap   = [T.panel, T.panel2, T.panel3] as const;
  return (
    <div style={{
      background: bgMap[nivel-1],
      borderRadius: T.r,
      boxShadow: shadows[nivel-1],
      border: `1px solid ${T.border}`,
      overflow: "hidden",
    }}>
      {/* Barra de título estilo XP */}
      <div style={{
        background: corTopo ?? T.titlebar,
        padding: "8px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ ...FONT, fontSize: 11, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.04em" }}>
          {titulo}
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div style={{ padding: 0 }}>{children}</div>
    </div>
  );
}

function BadgeCargo({ cargo }: { cargo: string }) {
  const c = CARGO_COR[cargo] ?? { bg:T.accent, text:"#fff", light:T.accentL, border:T.border };
  return (
    <span style={{
      ...FONT, fontSize: 9, fontWeight: 700,
      background: c.light, color: c.bg, border: `1px solid ${c.border}`,
      padding: "2px 8px", borderRadius: T.rSm, letterSpacing: "0.06em",
    }}>{cargo}</span>
  );
}

function Barra({ valor, max = 10, cor }: { valor: number; max?: number; cor: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:6, background:T.panel3, borderRadius:3, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${(valor/max)*100}%`, borderRadius:3,
          background: cor, transition:"width 0.5s ease",
        }} />
      </div>
      <span style={{ ...FONT, fontSize:10, color:T.text2, minWidth:16, fontVariantNumeric:"tabular-nums" }}>{valor}</span>
    </div>
  );
}

// ─── ABA 1: CATÁLOGO ─────────────────────────────────────────────────────────
function TabCatalogo({ catalogo }: { catalogo: typeof SEED_CATALOGO }) {
  const [exp, setExp] = useState<number | null>(null);
  const lista = catalogo.length > 0 ? catalogo : SEED_CATALOGO;
  const cargosOrdem = ["ADMINISTRATIVO","ENFERMAGEM","CONSULTOR","SUPERVISOR","FINANCEIRO","OUVIDORIA"];
  const cargosPresentes = [...new Set(lista.map(a => a.cargo))].sort(
    (a,b) => cargosOrdem.indexOf(a) - cargosOrdem.indexOf(b)
  );

  let idx = 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {cargosPresentes.map(cargo => {
        const c = CARGO_COR[cargo] ?? { bg:T.accent, text:"#fff", light:T.accentL, border:T.border };
        const agentes = lista.filter(a => a.cargo === cargo);
        return (
          <Painel
            key={cargo}
            titulo={<span style={{ display:"flex", alignItems:"center", gap:10 }}>{cargo}<span style={{ fontSize:9, fontWeight:400, opacity:0.8 }}>— {agentes.length} agente{agentes.length > 1 ? "s" : ""}</span></span>}
            corTopo={`linear-gradient(180deg, ${c.bg}DD 0%, ${c.bg} 100%)`}
            nivel={1}
          >
            <div style={{ padding: "12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
              {agentes.map(ag => {
                idx++;
                const n = idx;
                const isExp = exp === ag.id;
                return (
                  <div
                    key={ag.id}
                    style={{
                      background: isExp ? c.light : T.panel,
                      border: `1px solid ${isExp ? c.border : T.border}`,
                      borderRadius: T.rSm,
                      boxShadow: isExp ? T.s2 : T.s1,
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => setExp(isExp ? null : ag.id)}
                  >
                    {/* Linha principal */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        {/* Número */}
                        <div style={{
                          ...FONT, fontSize:10, fontWeight:900, color:c.bg,
                          background: c.light, border:`1px solid ${c.border}`,
                          width:28, height:28, borderRadius:T.rSm,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink:0, fontVariantNumeric:"tabular-nums",
                        }}>{String(n).padStart(2,"0")}</div>
                        <div>
                          <div style={{ ...FONT, fontSize:11, fontWeight:700, color:T.text1 }}>{ag.nomeAgente}</div>
                          <div style={{ ...FONT, fontSize:9, color:T.text3, marginTop:2 }}>{ag.codigoAgente}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ ...FONT, fontSize:9, color:T.text3 }}>SLA {ag.slaDefaultHoras}h</span>
                        <span style={{ ...FONT, fontSize:9, color:T.text3 }}>{ag.modalidade === "presencial" ? "▶" : "◀"} {ag.modalidade}</span>
                        <BadgeCargo cargo={ag.cargo} />
                        <span style={{ color:T.text3, fontSize:12 }}>{isExp ? "▾" : "▸"}</span>
                      </div>
                    </div>
                    {/* Expansão */}
                    {isExp && (
                      <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                        {/* Função */}
                        <Painel titulo="Função Principal" corTopo={`linear-gradient(180deg, ${c.bg}AA 0%, ${c.bg}99 100%)`} nivel={2}>
                          <div style={{ padding:"10px 14px", ...FONT, fontSize:10, color:T.text1, lineHeight:1.7 }}>
                            {ag.funcaoAgente}
                          </div>
                        </Painel>
                        {/* Vedações */}
                        {ag.naoFaz && ag.naoFaz.length > 0 && (
                          <Painel titulo="Vedações — Não Pode Fazer" corTopo={`linear-gradient(180deg, ${T.danger}CC, ${T.danger})`} nivel={2}>
                            <div style={{ padding:"10px 14px", display:"flex", flexWrap:"wrap", gap:"6px 16px" }}>
                              {ag.naoFaz.map((v,i) => (
                                <div key={i} style={{
                                  ...FONT, fontSize:9, color:T.danger,
                                  background:T.dangerL, border:`1px solid ${T.danger}44`,
                                  padding:"3px 10px", borderRadius:T.rSm,
                                }}>✕ {v}</div>
                              ))}
                            </div>
                          </Painel>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Painel>
        );
      })}
    </div>
  );
}

// ─── ABA 2: NARRATIVAS ───────────────────────────────────────────────────────
function TabNarrativas() {
  const [filtro, setFiltro] = useState("TODOS");
  const cargos = ["TODOS", ...new Set(SEED_NARRATIVAS.map(n => {
    const ag = SEED_CATALOGO.find(a => a.codigoAgente === n.codigoAgente);
    return ag?.cargo ?? "";
  }).filter(Boolean))];

  const lista = filtro === "TODOS"
    ? SEED_NARRATIVAS
    : SEED_NARRATIVAS.filter(n => {
        const ag = SEED_CATALOGO.find(a => a.codigoAgente === n.codigoAgente);
        return ag?.cargo === filtro;
      });

  return (
    <div>
      {/* Filtro */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {cargos.map(c => {
          const cor = CARGO_COR[c]?.bg ?? T.accent;
          const isAti = filtro === c;
          return (
            <button key={c} onClick={() => setFiltro(c)} style={{
              ...FONT, fontSize:9, fontWeight:700, cursor:"pointer",
              padding:"4px 12px", borderRadius:T.rSm,
              background: isAti ? cor : T.panel,
              color: isAti ? "#FFF" : T.text2,
              border: `1px solid ${isAti ? cor : T.border}`,
              boxShadow: isAti ? T.s1 : "none",
              transition:"all 0.15s",
            }}>{c}</button>
          );
        })}
      </div>
      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(420px,1fr))", gap:14 }}>
        {lista.map((narr, idx) => {
          const ag = SEED_CATALOGO.find(a => a.codigoAgente === narr.codigoAgente);
          const c = CARGO_COR[ag?.cargo ?? ""] ?? { bg:T.accent, text:"#fff", light:T.accentL, border:T.border };
          return (
            <Painel
              key={narr.id}
              nivel={1}
              corTopo={`linear-gradient(180deg, ${c.bg}DD, ${c.bg})`}
              titulo={
                <div style={{ display:"flex", justifyContent:"space-between", width:"100%", alignItems:"center" }}>
                  <span>{String(idx+1).padStart(3,"0")} · {narr.titulo}</span>
                  <span style={{ ...FONT, fontSize:8, fontWeight:400, background:"rgba(255,255,255,0.25)", padding:"2px 7px", borderRadius:T.rSm }}>{narr.tag}</span>
                </div>
              }
            >
              <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ ...FONT, fontSize:8, color:T.text3 }}>{ag?.nomeAgente ?? narr.codigoAgente}</div>
                {(narr.mensagens as Array<{lado:string;texto:string}>).map((m, mi) => {
                  const isPac = m.lado === "paciente";
                  return (
                    <div key={mi} style={{ display:"flex", gap:8 }}>
                      <div style={{
                        ...FONT, fontSize:8, fontWeight:700,
                        color: isPac ? T.text3 : c.bg,
                        minWidth:70, paddingTop:6, letterSpacing:"0.04em",
                      }}>{isPac ? "Paciente" : "Agente"}</div>
                      <div style={{
                        ...FONT, fontSize:9, lineHeight:1.7, flex:1,
                        color: isPac ? T.text2 : T.text1,
                        background: isPac ? T.panel2 : c.light,
                        border: `1px solid ${isPac ? T.border : c.border}`,
                        borderRadius: T.rSm,
                        padding:"6px 10px",
                        whiteSpace:"pre-wrap",
                      }}>{m.texto}</div>
                    </div>
                  );
                })}
              </div>
            </Painel>
          );
        })}
      </div>
    </div>
  );
}

// ─── ABA 3: CAPACIDADES ──────────────────────────────────────────────────────
function TabCapacidades() {
  return (
    <Painel titulo="Matriz de Capacidades — 10 Agentes × 13 Dimensões" corTopo={T.titlebar} nivel={1}>
      <div style={{ padding:"14px", overflowX:"auto" }}>
        <table style={{ ...FONT, borderCollapse:"separate", borderSpacing:0, width:"100%", fontSize:9 }}>
          <thead>
            <tr>
              <th style={{ ...thSt, textAlign:"left", minWidth:200, background:T.panel2, borderRadius:`${T.rSm} 0 0 0` }}>Agente</th>
              {CAP_LABELS.map((l,i) => (
                <th key={i} style={{ ...thSt, background:T.panel2, writingMode:"vertical-rl", height:110, minWidth:34, fontSize:8, fontWeight:400, color:T.text2 }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED_CATALOGO.map((ag, ri) => {
              const caps = SEED_CAPACIDADES[ag.codigoAgente] ?? [];
              const c = CARGO_COR[ag.cargo] ?? { bg:T.accent, text:"#fff", light:T.accentL, border:T.border };
              return (
                <tr key={ag.codigoAgente}>
                  <td style={{ ...tdSt, background: ri%2===0 ? T.panel : T.panel2, borderLeft:`4px solid ${c.bg}` }}>
                    <div style={{ fontWeight:700, color:T.text1 }}>{ag.nomeAgente}</div>
                    <div style={{ fontSize:8, color:T.text3, marginTop:1 }}>{ag.cargo}</div>
                  </td>
                  {CAP_LABELS.map((_, ci) => {
                    const val = caps[ci];
                    return (
                      <td key={ci} style={{ ...tdSt, background: ri%2===0 ? T.panel : T.panel2, textAlign:"center" }}>
                        {val
                          ? <span style={{ color:T.ok, fontWeight:900, fontSize:13 }}>✓</span>
                          : <span style={{ color:T.border, fontSize:11 }}>—</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Painel>
  );
}

const thSt: React.CSSProperties = { ...FONT, padding:"8px 10px", border:`1px solid ${T.border}`, color:T.text1, fontWeight:700 };
const tdSt: React.CSSProperties = { ...FONT, padding:"8px 10px", border:`1px solid ${T.border}`, verticalAlign:"middle" };

// ─── ABA 4: PERSONALIDADE ────────────────────────────────────────────────────
function TabPersonalidade() {
  const DIMS: Array<{ key: keyof typeof SEED_PERSONALIDADE[string]; label:string }> = [
    { key:"formalidade",      label:"Formalidade"    },
    { key:"empatia",          label:"Empatia"        },
    { key:"autoridade",       label:"Autoridade"     },
    { key:"objetividade",     label:"Objetividade"   },
    { key:"calorHumano",      label:"Calor Humano"   },
    { key:"proatividade",     label:"Proatividade"   },
    { key:"paciencia",        label:"Paciência"      },
    { key:"nivelHumanizacao", label:"Humanização"    },
    { key:"firmeza",          label:"Firmeza"        },
    { key:"didatismo",        label:"Didatismo"      },
    { key:"acolhimento",      label:"Acolhimento"    },
    { key:"sensibilidade",    label:"Sensibilidade"  },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px,1fr))", gap:14 }}>
      {SEED_CATALOGO.map(ag => {
        const pers = SEED_PERSONALIDADE[ag.codigoAgente];
        if (!pers) return null;
        const c = CARGO_COR[ag.cargo] ?? { bg:T.accent, text:"#fff", light:T.accentL, border:T.border };
        return (
          <Painel
            key={ag.codigoAgente}
            nivel={1}
            corTopo={`linear-gradient(180deg, ${c.bg}DD, ${c.bg})`}
            titulo={ag.nomeAgente}
            badge={
              <span style={{ ...FONT, fontSize:8, color:T.text2, background:"rgba(255,255,255,0.25)", padding:"2px 7px", borderRadius:T.rSm }}>
                {pers.generoVoz}
              </span>
            }
          >
            <div style={{ padding:"12px 14px" }}>
              {/* Tom geral */}
              <div style={{
                ...FONT, fontSize:9, fontStyle:"italic", color:c.bg,
                background:c.light, border:`1px solid ${c.border}`,
                padding:"6px 10px", borderRadius:T.rSm, marginBottom:10, lineHeight:1.5,
              }}>"{pers.tomGeral}"</div>
              {/* Dimensões */}
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {DIMS.map(({ key, label }) => {
                  const val = pers[key] as number;
                  return (
                    <div key={key} style={{ display:"grid", gridTemplateColumns:"110px 1fr", gap:8, alignItems:"center" }}>
                      <div style={{ ...FONT, fontSize:8, color:T.text3 }}>{label}</div>
                      <Barra valor={val} cor={c.bg} />
                    </div>
                  );
                })}
              </div>
              {/* Frase típica */}
              <div style={{
                ...FONT, fontSize:9, color:T.text2,
                background:T.panel2, border:`1px solid ${T.border}`,
                padding:"7px 10px", borderRadius:T.rSm, marginTop:10,
                fontStyle:"italic", lineHeight:1.6,
              }}>"{pers.exemploFraseTipica}"</div>
            </div>
          </Painel>
        );
      })}
    </div>
  );
}

// ─── ABA 5: FLUXO OPERACIONAL ─────────────────────────────────────────────────
function TabFluxo() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Diagrama de fluxo */}
      <Painel titulo="Arquitetura de Disparo — Do Gatilho ao Log" corTopo={T.titlebar} nivel={1}>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
            {FLUXO_STEPS.map((s, i) => {
              const isLast = i === FLUXO_STEPS.length - 1;
              return (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
                  <div style={{
                    display:"flex", alignItems:"flex-start", gap:14,
                    background:T.panel, border:`1px solid ${T.border}`,
                    borderLeft:`5px solid ${s.cor}`,
                    borderRadius:T.rSm, boxShadow:T.s1,
                    padding:"12px 16px", width:"100%",
                  }}>
                    {/* Número */}
                    <div style={{
                      ...FONT, fontSize:11, fontWeight:900, color:"#FFF",
                      background:s.cor, width:32, height:32, borderRadius:"50%",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, fontVariantNumeric:"tabular-nums",
                    }}>{s.n}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <div style={{ ...FONT, fontSize:11, fontWeight:700, color:T.text1 }}>{s.titulo}</div>
                        {s.extra && (
                          <span style={{ ...FONT, fontSize:8, color:T.warn, background:T.warnL, border:`1px solid ${T.warn}44`, padding:"2px 7px", borderRadius:T.rSm }}>{s.extra}</span>
                        )}
                      </div>
                      <div style={{ ...FONT, fontSize:9, color:T.text2, lineHeight:1.7 }}>{s.desc}</div>
                    </div>
                  </div>
                  {!isLast && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"4px 0" }}>
                      <div style={{ width:2, height:14, background:T.borderMid }} />
                      <div style={{ ...FONT, fontSize:14, color:T.text3, lineHeight:1 }}>▼</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Painel>

      {/* GAPS */}
      <Painel titulo="Gaps Críticos — O que ainda não existe no sistema" corTopo={`linear-gradient(180deg, ${T.danger}CC, ${T.danger})`} nivel={1}>
        <div style={{ padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
          {GAPS.map((g, i) => (
            <div key={i} style={{
              display:"flex", gap:12, alignItems:"flex-start",
              background:g.corL, border:`1px solid ${g.cor}44`,
              borderLeft:`4px solid ${g.cor}`, borderRadius:T.rSm, padding:"10px 14px",
            }}>
              <span style={{
                ...FONT, fontSize:8, fontWeight:900, color:"#FFF",
                background:g.cor, padding:"3px 8px", borderRadius:T.rSm, whiteSpace:"nowrap", flexShrink:0, marginTop:1,
              }}>{g.sev}</span>
              <div>
                <div style={{ ...FONT, fontSize:10, fontWeight:700, color:T.text1 }}>{g.titulo}</div>
                <div style={{ ...FONT, fontSize:9, color:T.text2, marginTop:3, lineHeight:1.6 }}>{g.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Painel>

      {/* Tabelas */}
      <Painel titulo="15 Tabelas do Banco de Dados" corTopo={`linear-gradient(180deg, ${T.ok}CC, ${T.ok})`} nivel={1}>
        <div style={{ padding:"14px", display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:6 }}>
          {["catalogo_agentes","agentes_clinica","capacidades_agente_clinica","execucoes_agente","acoes_agente","memorias_contextuais_agente","validacoes_humanas_agente","eventos_saida_operacionais","narrativas_agente","agentes_personalidade","agentes_motor_escrita","agentes_identidade","agentes_frases","agentes_regras","agentes_versionamento"].map((t,i) => (
            <div key={i} style={{
              ...FONT, fontSize:9, color:T.text2,
              background:T.panel, border:`1px solid ${T.border}`,
              borderRadius:T.rSm, padding:"6px 10px", boxShadow:T.s1,
            }}>{t}</div>
          ))}
        </div>
      </Painel>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function CartaMagnaPadcomPage() {
  const [aba, setAba] = useState(0);
  const [catalogo, setCatalogo] = useState<typeof SEED_CATALOGO>([]);
  const [stats, setStats] = useState<{catalogoTotal:number;provisionadosTotal:number;narrativasTotal:number;execucoesTotal:number}|null>(null);

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
    <div style={{ background:T.desktop, minHeight:"100vh", ...FONT }}>

      {/* ── HEADER PRINCIPAL ─────────────────────────────────────────────── */}
      <div style={{ background:T.titlebar2, boxShadow:"0 3px 12px rgba(0,40,100,0.28)", padding:"0 24px" }}>
        {/* Linha do título */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0 10px" }}>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", letterSpacing:"0.12em", marginBottom:3 }}>
              SISTEMA PAWARDS · PADCOM · MÓDULO DE AGENTES VIRTUAIS
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:"#FFFFFF", letterSpacing:"0.04em" }}>
              Constituição dos Agentes Virtuais
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
              Carta Magna PADCOM · Edição 001 · Publicado em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>
          {/* KPIs no header */}
          <div style={{ display:"flex", gap:3 }}>
            {[
              { label:"Agentes",    valor:s.catalogoTotal,        sub:"catálogo global" },
              { label:"Instâncias", valor:s.provisionadosTotal,   sub:"20 × 5 clínicas" },
              { label:"Narrativas", valor:s.narrativasTotal,      sub:"roteiros" },
              { label:"Execuções",  valor:s.execucoesTotal,       sub:"realizadas" },
            ].map((k, i) => (
              <div key={i} style={{
                background:"rgba(255,255,255,0.15)",
                border:"1px solid rgba(255,255,255,0.25)",
                borderRadius:T.rSm, padding:"8px 16px", textAlign:"center",
                backdropFilter:"blur(4px)",
              }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", letterSpacing:"0.08em", marginBottom:2 }}>{k.label}</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#FFFFFF", fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.valor}</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abas navegação */}
        <div style={{ display:"flex", gap:2, paddingBottom:0 }}>
          {ABAS.map((a, i) => {
            const isAti = aba === i;
            return (
              <button
                key={i}
                onClick={() => setAba(i)}
                style={{
                  ...FONT, fontSize:10, fontWeight:700, cursor:"pointer",
                  padding:"8px 18px",
                  background: isAti ? T.desktop : "rgba(255,255,255,0.12)",
                  color: isAti ? T.accent : "rgba(255,255,255,0.8)",
                  border:"none",
                  borderRadius:`${T.rSm} ${T.rSm} 0 0`,
                  borderBottom: isAti ? `2px solid ${T.desktop}` : "2px solid transparent",
                  boxShadow: isAti ? T.s1 : "none",
                  transition:"all 0.15s",
                  letterSpacing:"0.04em",
                  position:"relative", zIndex: isAti ? 2 : 1,
                }}
              >{a}</button>
            );
          })}
        </div>
      </div>

      {/* ── CONTEÚDO DAS ABAS ────────────────────────────────────────────── */}
      <div style={{ padding:"20px 24px", maxWidth:1400, margin:"0 auto" }}>
        {aba === 0 && <TabCatalogo catalogo={catalogo} />}
        {aba === 1 && <TabNarrativas />}
        {aba === 2 && <TabCapacidades />}
        {aba === 3 && <TabPersonalidade />}
        {aba === 4 && <TabFluxo />}
      </div>
    </div>
  );
}
