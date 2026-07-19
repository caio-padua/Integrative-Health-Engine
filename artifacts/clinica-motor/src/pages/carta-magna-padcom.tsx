import { useState, useEffect } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

// ─── PENUMBRA ESCURO · Navy Ciano ────────────────────────────────────────────
const P = {
  bg:           "#020A14",
  bg2:          "#061824",
  bg3:          "#0A2030",
  bg4:          "#0E2838",
  border:       "#1A3848",
  borderAccent: "#5FE6CC44",
  t1:           "#D8EEEE",
  t2:           "#88B8BE",
  t3:           "#557A82",
  accent:       "#5FE6CC",
  accent2:      "#5EE6E6",
  warn:         "#FFD27A",
  danger:       "#D08A8A",
  ok:           "#5FE6CC",
  gold:         "#FFD27A",
  // Domínios por CARGO (ESCURO)
  cargo: {
    ADMINISTRATIVO: "#9CC2EA",
    ENFERMAGEM:     "#5FE6CC",
    CONSULTOR:      "#5EE6E6",
    SUPERVISOR:     "#FFD27A",
    FINANCEIRO:     "#7CC4A0",
    OUVIDORIA:      "#FFA3C8",
    Administrativo: "#9CC2EA",
    Enfermagem:     "#5FE6CC",
    Consultor:      "#5EE6E6",
    Supervisor:     "#FFD27A",
    Financeiro:     "#7CC4A0",
    Ouvidoria:      "#FFA3C8",
  } as Record<string, string>,
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
};

// ─── SEED (fallback quando API retorna 401) ──────────────────────────────────
const SEED_CATALOGO = [
  { id: 1,  codigoAgente: "agente_administrativo_01", nomeAgente: "Agente Administrativo Presencial", descricao: "Agendamento, boas-vindas, onboarding e informações da clínica. Primeiro contato do paciente.", funcaoAgente: "Agendamento, boas-vindas, onboarding e informações da clínica.", cargo: "ADMINISTRATIVO", indice: "01", modalidade: "presencial", slaDefaultHoras: 2,  naoFaz: ["Dúvidas clínicas","Valores de fórmulas","Decisões de desconto","Cancelamento de protocolos","Orientações pós-sessão"] },
  { id: 2,  codigoAgente: "agente_administrativo_02", nomeAgente: "Agente Administrativo Remoto",     descricao: "Confirmação de consultas D-1, reagendamentos via portal, segundo contato para não-comparecimento.", funcaoAgente: "Confirmação de consultas D-1 e reagendamentos.", cargo: "ADMINISTRATIVO", indice: "02", modalidade: "remoto",     slaDefaultHoras: 2,  naoFaz: ["Agendamentos novos","Dúvidas clínicas","Cancelamento definitivo sem aprovação"] },
  { id: 3,  codigoAgente: "agente_enfermagem_01",     nomeAgente: "Agente Enfermagem Presencial",     descricao: "Comunicação pós-sessão presencial, orientações de cuidado, envio do código de validação.", funcaoAgente: "Comunicação pós-sessão e código de validação.", cargo: "ENFERMAGEM", indice: "01", modalidade: "presencial", slaDefaultHoras: 36, naoFaz: ["Alterar protocolo","Dar prazo para sintomas sem avaliar","Decidir condutas novas"] },
  { id: 4,  codigoAgente: "agente_enfermagem_02",     nomeAgente: "Agente Enfermagem Auditoria",      descricao: "Auditoria oculta do pós-sessão. Verifica se o paciente recebeu cuidado adequado.", funcaoAgente: "Auditoria oculta de qualidade do atendimento.", cargo: "ENFERMAGEM", indice: "02", modalidade: "remoto",     slaDefaultHoras: 36, naoFaz: ["Revelar que é auditoria","Orientar condutas clínicas","Tomar decisões"] },
  { id: 5,  codigoAgente: "agente_consultor_01",      nomeAgente: "Agente Consultor Presencial",      descricao: "Suporte técnico clínico presencial — orienta sobre fórmulas, exames, avaliação clínica.", funcaoAgente: "Suporte técnico clínico presencial.", cargo: "CONSULTOR", indice: "01", modalidade: "presencial", slaDefaultHoras: 36, naoFaz: ["Prescrever","Alterar protocolo","Decidir condutas novas"] },
  { id: 6,  codigoAgente: "agente_consultor_02",      nomeAgente: "Agente Consultor Remoto",          descricao: "Follow-up semanal de evolução, reativação de pacientes parados.", funcaoAgente: "Follow-up semanal e reativação.", cargo: "CONSULTOR", indice: "02", modalidade: "remoto",     slaDefaultHoras: 36, naoFaz: ["Orientar condutas clínicas","Decidir sobre protocolo","Alterar prescrição"] },
  { id: 7,  codigoAgente: "agente_supervisor_01",     nomeAgente: "Agente Supervisor Operacional",    descricao: "Controle operacional interno — cobra SLA, registra advertências, escalona para gerente.", funcaoAgente: "Controle de SLA e cobrança interna à equipe.", cargo: "SUPERVISOR", indice: "01", modalidade: "remoto",     slaDefaultHoras: 24, naoFaz: ["Falar com paciente","Decidir questões clínicas","Aprovar descontos"] },
  { id: 8,  codigoAgente: "agente_supervisor_02",     nomeAgente: "Agente Supervisor Auditor",        descricao: "Auditoria oculta da qualidade dos atendimentos. Pesquisa de satisfação disfarçada.", funcaoAgente: "Auditoria oculta da qualidade via pesquisa.", cargo: "SUPERVISOR", indice: "02", modalidade: "remoto",     slaDefaultHoras: 24, naoFaz: ["Revelar que é auditoria","Fazer pressão","Influenciar respostas"] },
  { id: 9,  codigoAgente: "agente_financeiro_01",     nomeAgente: "Agente Financeiro",                descricao: "Cobranças, acordos, nota fiscal, inadimplência e renovações financeiras.", funcaoAgente: "Cobranças, acordos e nota fiscal.", cargo: "FINANCEIRO", indice: "01", modalidade: "remoto",     slaDefaultHoras: 24, naoFaz: ["Decidir descontos acima de 15%","Cancelar protocolos","Emitir boletos sem aprovação"] },
  { id: 10, codigoAgente: "agente_ouvidoria_01",      nomeAgente: "Agente Ouvidoria",                 descricao: "Canal confidencial para reclamações, sugestões e insatisfações. Protege a identidade.", funcaoAgente: "Canal confidencial de reclamações e sugestões.", cargo: "OUVIDORIA", indice: "01", modalidade: "remoto",     slaDefaultHoras: 24, naoFaz: ["Revelar identidade do reclamante","Tomar decisão punitiva","Minimizar reclamação"] },
];

const SEED_PERSONALIDADE: Record<string, {
  formalidade: number; empatia: number; autoridade: number; objetividade: number;
  calorHumano: number; proatividade: number; paciencia: number; nivelHumanizacao: number;
  firmeza: number; didatismo: number; acolhimento: number; sensibilidade: number;
  tomGeral: string; generoVoz: string; exemploFraseTipica: string;
}> = {
  agente_administrativo_01: { formalidade:10, empatia:6,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:8, paciencia:7, nivelHumanizacao:7, firmeza:4, didatismo:6,  acolhimento:7, sensibilidade:5,  tomGeral:"Acolhedor, organizado, preciso",      generoVoz:"feminino", exemploFraseTipica:"Sera um prazer organizar o seu atendimento." },
  agente_administrativo_02: { formalidade:7,  empatia:5,  autoridade:3,  objetividade:9,  calorHumano:5, proatividade:7, paciencia:6, nivelHumanizacao:5, firmeza:5, didatismo:7,  acolhimento:5, sensibilidade:4,  tomGeral:"Gentil, direto, funcional",          generoVoz:"neutro",   exemploFraseTipica:"Estou entrando em contato para confirmar seu atendimento." },
  agente_enfermagem_01:     { formalidade:5,  empatia:9,  autoridade:4,  objetividade:7,  calorHumano:9, proatividade:7, paciencia:9, nivelHumanizacao:9, firmeza:3, didatismo:7,  acolhimento:9, sensibilidade:8,  tomGeral:"Tecnico mas acolhedor, maternal",   generoVoz:"feminino", exemploFraseTipica:"Estou te enviando as orientacoes do seu procedimento." },
  agente_enfermagem_02:     { formalidade:5,  empatia:8,  autoridade:3,  objetividade:8,  calorHumano:7, proatividade:6, paciencia:8, nivelHumanizacao:7, firmeza:3, didatismo:6,  acolhimento:8, sensibilidade:9,  tomGeral:"Cuidadoso, detalhado, investigativo",generoVoz:"feminino", exemploFraseTipica:"Gostaria de entender melhor como o senhor se sentiu." },
  agente_consultor_01:      { formalidade:7,  empatia:6,  autoridade:7,  objetividade:9,  calorHumano:5, proatividade:6, paciencia:7, nivelHumanizacao:5, firmeza:6, didatismo:9,  acolhimento:5, sensibilidade:4,  tomGeral:"Cientifico mas acessivel",           generoVoz:"neutro",   exemploFraseTipica:"Boa pergunta! Vou te explicar com clareza." },
  agente_consultor_02:      { formalidade:5,  empatia:8,  autoridade:4,  objetividade:6,  calorHumano:8, proatividade:9, paciencia:8, nivelHumanizacao:8, firmeza:4, didatismo:8,  acolhimento:7, sensibilidade:6,  tomGeral:"Proximo, interessado, motivador",    generoVoz:"neutro",   exemploFraseTipica:"Estou fazendo o acompanhamento da sua evolucao." },
  agente_supervisor_01:     { formalidade:9,  empatia:2,  autoridade:9,  objetividade:10, calorHumano:1, proatividade:9, paciencia:3, nivelHumanizacao:1, firmeza:9, didatismo:5,  acolhimento:2, sensibilidade:1,  tomGeral:"Direto, sem rodeios, factual",       generoVoz:"masculino",exemploFraseTipica:"ALERTA DE SLA — ACAO NECESSARIA." },
  agente_supervisor_02:     { formalidade:4,  empatia:7,  autoridade:3,  objetividade:7,  calorHumano:6, proatividade:5, paciencia:8, nivelHumanizacao:6, firmeza:7, didatismo:6,  acolhimento:4, sensibilidade:3,  tomGeral:"Natural, curioso, casual",           generoVoz:"neutro",   exemploFraseTipica:"Sou da equipe de qualidade da clinica." },
  agente_financeiro_01:     { formalidade:8,  empatia:5,  autoridade:6,  objetividade:10, calorHumano:4, proatividade:7, paciencia:6, nivelHumanizacao:4, firmeza:6, didatismo:7,  acolhimento:3, sensibilidade:3,  tomGeral:"Cordial mas firme, factual",         generoVoz:"neutro",   exemploFraseTipica:"Sou do setor financeiro da clinica." },
  agente_ouvidoria_01:      { formalidade:7,  empatia:10, autoridade:2,  objetividade:7,  calorHumano:9, proatividade:5, paciencia:10,nivelHumanizacao:9, firmeza:2, didatismo:6,  acolhimento:9, sensibilidade:10, tomGeral:"Sereno, acolhedor, neutro",          generoVoz:"neutro",   exemploFraseTipica:"Obrigado por trazer isso para nos." },
};

const SEED_CAPACIDADES: Record<string, boolean[]> = {
  // ordem: WApp Email CriarTask AtualizTask LerAgenda LerAcomp Escalar ReqHum Vermelho Prontuario Agendar CodValid Memoria
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

const CAP_LABELS = [
  "WhatsApp","E-mail","Criar Tarefa","Atualizar Tarefa","Ler Agenda",
  "Ler Acompanham.","Escalar Supervisor","Req. Validação Humana",
  "Nunca Resp. Caso Vermelho","Consultar Prontuário","Criar Agendamento",
  "Enviar Cód. Validação","Registrar Memória",
];

const SEED_NARRATIVAS = [
  { id:1,  codigoAgente:"agente_administrativo_01", titulo:"Novo paciente quer agendar consulta",    tag:"NOVO LEAD",       mensagens:[{lado:"paciente",texto:"Quero marcar uma consulta com o Dr. Caio"},{lado:"agente",texto:"Sera um prazer organizar o seu agendamento com o Dr. Caio!\n\nPara que eu encontre os melhores horarios:\n\n• Qual unidade fica melhor para voce?\n  — Tatuape\n  — Alphaville\n  — Guaxupe\n\n• Qual o seu nome completo?"},{lado:"paciente",texto:"Tatuape, me chamo Joao"},{lado:"agente",texto:"Perfeito, Joao!\n\nPara a unidade do Tatuape, os proximos horarios:\n\nQui 17/04 — 09:00\nQui 17/04 — 10:00\nSex 18/04 — 14:00\n\nQual horario fica melhor?"},{lado:"paciente",texto:"Quinta as 9h"},{lado:"agente",texto:"Excelente, Joao!\n\nEstou reservando sua consulta:\n\nUnidade: Clinica Padua — Tatuape\nData: Qui 17/04 as 09:00\nMedico: Dr. Caio Henrique Fernandes\n\nVoce recebera confirmacao por WhatsApp no dia anterior."}] },
  { id:2,  codigoAgente:"agente_administrativo_01", titulo:"Paciente pergunta sobre plano de saude", tag:"DUVIDA FINANCEIRA", mensagens:[{lado:"paciente",texto:"Aceita plano de saude?"},{lado:"agente",texto:"A clinica atende exclusivamente de forma particular.\n\nIsso nos permite oferecer:\n\n• Consultas sem limite de tempo\n• Protocolos personalizados\n• Acompanhamento continuo\n\nPosso te ajudar a agendar uma consulta?"}] },
  { id:3,  codigoAgente:"agente_administrativo_02", titulo:"Confirmacao de consulta D-1",            tag:"CONFIRMACAO",      mensagens:[{lado:"agente",texto:"Estou entrando em contato para confirmar seu atendimento de amanha:\n\nUnidade: Clinica Padua — Tatuape\nData: Qui 17/04 as 09:00\nMedico: Dr. Caio Henrique Fernandes\n\nPor gentileza, confirme:\n\n1 — Confirmo\n2 — Preciso reagendar"},{lado:"paciente",texto:"1"},{lado:"agente",texto:"Perfeito, Joao! Confirmado.\n\nTe esperamos amanha as 09:00 na unidade Tatuape."}] },
  { id:4,  codigoAgente:"agente_administrativo_02", titulo:"Paciente solicita reagendamento",        tag:"REAGENDAMENTO",    mensagens:[{lado:"paciente",texto:"2"},{lado:"agente",texto:"Sem problemas. Vou verificar as proximas datas disponiveis.\n\nTem preferencia de dia ou periodo?"},{lado:"paciente",texto:"Semana que vem"},{lado:"agente",texto:"Para a semana de 21 a 25 de abril:\n\nSeg 21/04 — 10:00\nQua 23/04 — 09:00\nSex 25/04 — 14:00\n\nQual fica melhor?"}] },
  { id:5,  codigoAgente:"agente_enfermagem_01",     titulo:"Envio do codigo de validacao",           tag:"PRE-SESSAO",       mensagens:[{lado:"agente",texto:"Bom dia, Joao!\n\nEstou te enviando seu codigo de validacao para a sessao de hoje:\n\nCodigo: 4829\n\nApresente este codigo a enfermeira no momento do atendimento.\n\nBom tratamento!"}] },
  { id:6,  codigoAgente:"agente_enfermagem_01",     titulo:"Orientacoes pos-aplicacao",              tag:"POS-SESSAO",       mensagens:[{lado:"agente",texto:"Joao, seu procedimento de hoje foi realizado conforme o protocolo.\n\nOrientacoes para as proximas horas:\n\nHidratacao — beba ao menos 2L de agua hoje\nEsforco fisico — evite atividade intensa por 24h\nAlimentacao — refeicoes leves, evite alcool\n\nSe sentir qualquer desconforto, responda esta mensagem.\n\nEstamos acompanhando!"}] },
  { id:7,  codigoAgente:"agente_enfermagem_02",     titulo:"Auditoria amarela — tontura relatada",   tag:"AUDITORIA AMARELA",mensagens:[{lado:"agente",texto:"Bom dia! Sou da equipe de acompanhamento da Clinica Padua.\n\nGostaria de saber como voce esta apos a sessao de ontem.\n\n• Como se sentiu durante o procedimento?\n• Teve algum desconforto depois?"},{lado:"paciente",texto:"Fiquei com um pouco de tontura logo depois"},{lado:"agente",texto:"Obrigado por me contar. Isso e importante para o seu cuidado.\n\nVou encaminhar esta informacao para a equipe clinica avaliar.\n\nAlguem entrara em contato em breve."}] },
  { id:8,  codigoAgente:"agente_enfermagem_02",     titulo:"Auditoria verde — paciente sem queixas", tag:"AUDITORIA VERDE",  mensagens:[{lado:"agente",texto:"Estou fazendo o acompanhamento da sua sessao de ontem.\n\nComo voce esta se sentindo?"},{lado:"paciente",texto:"Otimo, sem nenhum problema"},{lado:"agente",texto:"Fico feliz em saber.\n\nVou registrar que esta tudo bem.\n\nSeu proximo procedimento esta agendado para semana que vem."}] },
  { id:9,  codigoAgente:"agente_consultor_01",      titulo:"Duvida sobre exame G6PD",               tag:"DUVIDA CLINICA",   mensagens:[{lado:"paciente",texto:"Preciso fazer o exame G6PD antes do IV?"},{lado:"agente",texto:"Sim, o exame de G6PD e necessario antes da terapia com Vitamina C intravenosa.\n\nMotivo:\n• Esse exame verifica uma enzima que protege suas celulas\n• Em casos raros, a deficiencia pode causar reacao\n\nE rapido e pode ser feito em qualquer laboratorio.\n\nPosso te orientar sobre onde realizar?"}] },
  { id:10, codigoAgente:"agente_consultor_02",      titulo:"Follow-up semanal — semana 4",          tag:"FOLLOW-UP",        mensagens:[{lado:"agente",texto:"Estou fazendo o acompanhamento da sua 4a semana de tratamento.\n\nComo tem se sentido?\n\n• Energia\n• Sono\n• Disposicao geral"},{lado:"paciente",texto:"Estou dormindo muito melhor e com mais energia"},{lado:"agente",texto:"Essas sao exatamente as melhorias esperadas nesta fase.\n\n• Sono regulado\n• Energia melhorando\n\nContinue seguindo o protocolo.\n\nSeu proximo retorno esta em 2 semanas."}] },
  { id:11, codigoAgente:"agente_consultor_02",      titulo:"Reativacao — 14 dias sem sessao",       tag:"REATIVACAO",       mensagens:[{lado:"agente",texto:"Faz 14 dias desde sua ultima sessao e gostariamos de saber como voce esta.\n\nSeu tratamento esta em uma fase importante.\n\nPosso verificar os proximos horarios disponiveis para voce?"}] },
  { id:12, codigoAgente:"agente_supervisor_01",     titulo:"Alerta de SLA vencido",                 tag:"SLA INTERNO",      mensagens:[{lado:"agente",texto:"ALERTA DE SLA — ACAO NECESSARIA\n\nenf02 · Tarefa #1024\nPaciente: Maria Silva — Tatuape\n\nSLA: 36h\nVencido ha: 4h\n\nStatus atual: sem resposta registrada\n\nAcao requerida:\n• Concluir tarefa imediatamente\n• Justificar atraso\n\nPrazo final: hoje as 18h\n\nCaso nao resolvido, sera escalonado para gerencia."}] },
  { id:13, codigoAgente:"agente_supervisor_01",     titulo:"Relatorio diario para o CEO",           tag:"RELATORIO CEO",    mensagens:[{lado:"agente",texto:"RESUMO OPERACIONAL · 14/04/2026 · 07:30\n\nDr. Caio, bom dia.\n\nTarefas concluidas: 12\nTarefas pendentes: 3\nSLAs vencidos: 1 (enf02 — Tatuape)\nTaxa de resolucao: 80%\n\nDestaques:\n• Administrativo: 100% confirmacoes D-1\n• Enfermagem: 1 auditoria amarela (tontura)\n• Consultor: 2 reativacoes enviadas\n\nAcao necessaria:\n• Cobrar enf02 sobre tarefa #1024"}] },
  { id:14, codigoAgente:"agente_supervisor_02",     titulo:"Auditoria oculta de atendimento",       tag:"AUDITORIA OCULTA", mensagens:[{lado:"agente",texto:"Sou da equipe de qualidade da Clinica Padua.\n\nEstou verificando como foi o seu acompanhamento pos-sessao.\n\nVoce recebeu algum contato da nossa equipe apos o procedimento?"},{lado:"paciente",texto:"Sim, recebi uma mensagem ontem a tarde"},{lado:"agente",texto:"Pode me dizer como foi essa interacao? A pessoa foi atenciosa, explicou tudo direito?\n\nSeu retorno nos ajuda muito a manter a qualidade."}] },
  { id:15, codigoAgente:"agente_financeiro_01",     titulo:"Cobranca de parcela vencida",           tag:"COBRANCA",         mensagens:[{lado:"agente",texto:"Sou do setor financeiro da Clinica Padua.\n\nIdentifiquei que a parcela referente ao seu protocolo venceu em 10/04.\n\nValor: R$ 450,00\nVencimento: 10/04/2026\n\nPosso te ajudar a regularizar?\n\n• Pix\n• Cartao de credito\n• Boleto atualizado"},{lado:"paciente",texto:"Estava com problema no cartao"},{lado:"agente",texto:"Posso te oferecer:\n\n1 — Pix com QR code — baixa imediata\n2 — Boleto atualizado — vencimento em 3 dias uteis\n3 — Novo link de cartao\n\nQual opcao fica melhor?"}] },
  { id:16, codigoAgente:"agente_financeiro_01",     titulo:"Solicitacao de nota fiscal",            tag:"NOTA FISCAL",      mensagens:[{lado:"paciente",texto:"Posso pedir nota fiscal da minha consulta?"},{lado:"agente",texto:"Emitimos Nota Fiscal com descritivo de servico medico.\n\n• Prazo: ate 48h uteis\n• Formato: PDF por e-mail\n\nMe confirme seu e-mail e o mes de referencia."}] },
  { id:17, codigoAgente:"agente_ouvidoria_01",      titulo:"Reclamacao de atendimento",             tag:"RECLAMACAO",       mensagens:[{lado:"paciente",texto:"Fui mal atendida pela enfermeira. Ela foi grossa e nao explicou nada do procedimento."},{lado:"agente",texto:"Obrigado por trazer isso para nos.\n\nLevamos muito a serio a qualidade do atendimento.\n\nPara registrar sua manifestacao com precisao:\n\n• Em qual unidade ocorreu?\n• Qual a data aproximada?"},{lado:"paciente",texto:"Foi hoje de manha no Tatuape"},{lado:"agente",texto:"Registrado.\n\nSua manifestacao foi encaminhada para a direcao com total sigilo.\n\nVoce recebera um retorno em ate 48 horas.\n\nSua identidade sera preservada."}] },
  { id:18, codigoAgente:"agente_ouvidoria_01",      titulo:"Sugestao de melhoria de infraestrutura", tag:"SUGESTAO",        mensagens:[{lado:"paciente",texto:"Acho que o estacionamento deveria ter mais vagas"},{lado:"agente",texto:"Obrigado pela sugestao!\n\nTodo retorno e valioso para nos.\n\nSua sugestao sobre o estacionamento foi registrada e sera encaminhada a direcao."}] },
];

const FLUXO_STEPS = [
  { n:"01", titulo:"GATILHO",           desc:"Consulta confirmada · Sessao realizada · SLA vencido · Auditoria programada" },
  { n:"02", titulo:"MOTOR DE EVENTOS",  desc:"Avalia qual agente deve atuar com base no tipo de evento e cargo responsavel" },
  { n:"03", titulo:"CONTEXTO",          desc:"Agente busca: dados do paciente + sessao + historico de conversas + memorias contextuais" },
  { n:"04", titulo:"MOTOR DE ESCRITA",  desc:"Template de abertura + contexto + informacao + orientacao + acao + regras TDAH/TOC (max 2 frases/bloco, emojis semanticos, quebra de linha obrigatoria)" },
  { n:"05", titulo:"VALIDACAO HUMANA",  desc:"Se requerValidacaoHumana=true — fila de aprovacao → aprovador humano libera → disparo", extra:"CONDICIONAL" },
  { n:"06", titulo:"DISPARO",           desc:"WhatsApp via Twilio/Gupshup · E-mail via Gmail API · SLA startado" },
  { n:"07", titulo:"RESPOSTA DO PACIENTE", desc:"Motor analisa resposta + redireciona para narrativa correta → ou escalada para supervisor" },
  { n:"08", titulo:"LOG E MEMORIA",     desc:"Grava em execucoes_agente + memorias_contextuais_agente + atualiza estado de prontidao" },
];

const GAPS = [
  { sev:"CRITICO", titulo:"Motor de disparo",         desc:"Nenhum agente dispara WhatsApp real — o campo podeEnviarWhatsapp=true existe mas nao tem executor" },
  { sev:"CRITICO", titulo:"Worker de execucao",       desc:"Tabela execucoes_agente existe mas o consumer (listener de eventos) nao foi construido" },
  { sev:"ALTA",    titulo:"Fila de validacao humana", desc:"validacoes_humanas_agente existe sem interface de aprovacao no frontend" },
  { sev:"ALTA",    titulo:"Motor de memorias",        desc:"memorias_contextuais_agente existe sem logica de gravacao e recuperacao por paciente" },
  { sev:"MEDIA",   titulo:"Consumer de eventos",      desc:"eventos_saida_operacionais existe sem consumer que processa os eventos disparados" },
];

const CAPITULOS = ["I — CONSTITUICAO","II — NARRATIVAS","III — CAPACIDADES","IV — PERSONALIDADE","V — FLUXO OPERACIONAL"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function hoverStyle(cor: string): React.CSSProperties {
  return {
    boxShadow: `0 0 0 1px ${cor}44, 0 0 10px 2px ${cor}22`,
    transition: "box-shadow 0.2s ease",
  };
}

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, height:14 }}>
      <div style={{ flex:1, height:3, background:P.bg4, position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${valor * 10}%`, background:cor, transition:"width 0.6s ease" }} />
      </div>
      <span style={{ ...MONO, fontSize:10, color:P.t3, fontVariantNumeric:"tabular-nums", minWidth:16 }}>{valor}</span>
    </div>
  );
}

// ─── MASTERHEAD ──────────────────────────────────────────────────────────────
function Masthead({ stats }: { stats: { catalogoTotal:number; provisionadosTotal:number; narrativasTotal:number; execucoesTotal:number } | null }) {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const s = stats ?? { catalogoTotal:20, provisionadosTotal:100, narrativasTotal:22, execucoesTotal:0 };
  return (
    <div style={{ background:P.bg2, border:`1px solid ${P.border}`, borderTop:`3px solid ${P.accent}`, marginBottom:0 }}>
      {/* Topo do boletim */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"16px 24px 12px", borderBottom:`1px solid ${P.border}` }}>
        <div>
          <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.14em", textTransform:"uppercase" }}>Sistema Pawards · Padcom</div>
          <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.1em" }}>Instituto de Saude Integrada · Sigiloso</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ ...MONO, fontSize:13, fontWeight:900, color:P.t1, letterSpacing:"0.12em", textTransform:"uppercase" }}>Constituicao dos Agentes Virtuais</div>
          <div style={{ ...MONO, fontSize:9, color:P.accent, letterSpacing:"0.1em", marginTop:2 }}>Carta Magna Padcom · Edicao 001</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.1em" }}>Publicado em {hoje}</div>
          <div style={{ ...MONO, fontSize:9, color:P.t3 }}>Classificacao: Restrito</div>
        </div>
      </div>
      {/* Linha dupla ornamental */}
      <div style={{ height:1, background:P.border, margin:"0 24px" }} />
      <div style={{ height:1, background:P.bg4, margin:"2px 24px" }} />
      {/* KPIs em linha */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderBottom:`1px solid ${P.border}` }}>
        {[
          { label:"Agentes", valor:s.catalogoTotal,     cor:P.accent,  sub:"catalogo global" },
          { label:"Instancias", valor:s.provisionadosTotal, cor:"#9CC2EA", sub:"20 x 5 clinicas"  },
          { label:"Narrativas", valor:s.narrativasTotal,  cor:"#A89DFF", sub:"roteiros de conversa" },
          { label:"Execucoes", valor:s.execucoesTotal,   cor:P.warn,    sub:"disparos realizados" },
        ].map((k, i) => (
          <div key={i} style={{ padding:"10px 24px", borderRight: i < 3 ? `1px solid ${P.border}` : "none", display:"flex", flexDirection:"column", gap:2 }}>
            <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.12em", textTransform:"uppercase" }}>{k.label}</div>
            <div style={{ ...MONO, fontSize:26, fontWeight:900, color:k.cor, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.valor}</div>
            <div style={{ ...MONO, fontSize:9, color:P.t3 }}>{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUMARIO LATERAL ─────────────────────────────────────────────────────────
function Sumario({ ativo, onChange }: { ativo: number; onChange: (i:number) => void }) {
  return (
    <div style={{ width:220, minWidth:220, background:P.bg2, border:`1px solid ${P.border}`, borderTop:"none", position:"sticky", top:0, alignSelf:"flex-start", maxHeight:"calc(100vh - 160px)", overflowY:"auto" }}>
      <div style={{ padding:"12px 16px 8px", borderBottom:`1px solid ${P.border}` }}>
        <div style={{ ...MONO, fontSize:9, fontWeight:900, color:P.t3, letterSpacing:"0.14em" }}>SUMARIO</div>
      </div>
      <div style={{ padding:"8px 0" }}>
        {CAPITULOS.map((cap, i) => {
          const isAtivo = ativo === i;
          return (
            <button
              key={i}
              onClick={() => onChange(i)}
              style={{
                ...MONO, display:"block", width:"100%", textAlign:"left",
                background: isAtivo ? P.bg3 : "transparent",
                border:"none", borderLeft: isAtivo ? `3px solid ${P.accent}` : "3px solid transparent",
                color: isAtivo ? P.accent : P.t2,
                padding:"10px 16px", cursor:"pointer", fontSize:10,
                fontWeight: isAtivo ? 900 : 400, letterSpacing:"0.06em",
                transition:"all 0.15s ease",
              }}
            >
              {cap}
            </button>
          );
        })}
      </div>
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${P.border}`, marginTop:8 }}>
        <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.1em", lineHeight:1.6 }}>
          Base legal: Carta Magna Padcom<br />
          Documento: TSUNAMI 26.07.19<br />
          SHA: 43d2765d
        </div>
      </div>
    </div>
  );
}

// ─── CAP I: CONSTITUICAO ─────────────────────────────────────────────────────
function CapConstituicao({ catalogo }: { catalogo: typeof SEED_CATALOGO }) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const agentList = catalogo.length > 0 ? catalogo : SEED_CATALOGO;
  const cargosOrdem = ["ADMINISTRATIVO","ENFERMAGEM","CONSULTOR","SUPERVISOR","FINANCEIRO","OUVIDORIA"];
  const cargosPresentes = [...new Set(agentList.map(a => a.cargo))].sort(
    (a,b) => cargosOrdem.indexOf(a) - cargosOrdem.indexOf(b)
  );

  let artIdx = 0;
  return (
    <div>
      <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.12em", marginBottom:20, textTransform:"uppercase" }}>
        Capitulo I · Artigos 01 a {agentList.length.toString().padStart(2,"0")} · Clique em um artigo para expandir
      </div>
      {cargosPresentes.map(cargo => {
        const cor = P.cargo[cargo] || P.t2;
        const agentes = agentList.filter(a => a.cargo === cargo);
        return (
          <div key={cargo} style={{ marginBottom:32 }}>
            {/* Header do cargo */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${P.border}` }}>
              <div style={{ width:4, height:20, background:cor }} />
              <div style={{ ...MONO, fontSize:10, fontWeight:900, color:cor, letterSpacing:"0.14em" }}>{cargo}</div>
              <div style={{ ...MONO, fontSize:9, color:P.t3 }}>{agentes.length} agente{agentes.length > 1 ? "s" : ""}</div>
            </div>
            {/* Artigos */}
            {agentes.map(agente => {
              artIdx++;
              const n = artIdx.toString().padStart(2,"0");
              const isExp = expandido === agente.codigoAgente;
              const modalIcon = agente.modalidade === "presencial" ? "▶" : "◀";
              return (
                <div
                  key={agente.codigoAgente}
                  style={{
                    border:`1px solid ${isExp ? cor + "66" : P.border}`,
                    borderLeft:`4px solid ${isExp ? cor : P.border}`,
                    marginBottom:8,
                    background: isExp ? P.bg3 : P.bg2,
                    cursor:"pointer",
                    transition:"all 0.2s ease",
                    ...(isExp ? {} : {}),
                  }}
                  onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.borderLeftColor = cor; }}
                  onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.borderLeftColor = P.border; }}
                  onClick={() => setExpandido(isExp ? null : agente.codigoAgente)}
                >
                  {/* Header do artigo */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                      <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.1em", minWidth:50 }}>Art. {n}</div>
                      <div style={{ ...MONO, fontSize:11, fontWeight:900, color: isExp ? cor : P.t1, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                        {agente.nomeAgente}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.08em" }}>SLA {agente.slaDefaultHoras}h</div>
                      <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.08em" }}>{modalIcon} {agente.modalidade}</div>
                      <div style={{ ...MONO, fontSize:9, color: isExp ? P.bg : cor, background: isExp ? cor : "transparent", padding:"2px 8px", letterSpacing:"0.1em", border:`1px solid ${cor}` }}>
                        {cargo}
                      </div>
                      <div style={{ ...MONO, fontSize:10, color:P.t3 }}>{isExp ? "▾" : "▸"}</div>
                    </div>
                  </div>
                  {/* Expansao */}
                  {isExp && (
                    <div style={{ padding:"0 16px 14px", borderTop:`1px solid ${P.border}` }}>
                      {/* Ementa */}
                      <div style={{ marginTop:12, marginBottom:10 }}>
                        <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.14em", marginBottom:4 }}>EMENTA</div>
                        <div style={{ ...MONO, fontSize:10, color:P.t2, lineHeight:1.6 }}>{agente.funcaoAgente}</div>
                      </div>
                      {/* Codigo */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.14em", marginBottom:4 }}>IDENTIFICADOR</div>
                        <div style={{ ...MONO, fontSize:10, color:P.accent }}>{agente.codigoAgente}</div>
                      </div>
                      {/* Vedacoes */}
                      {agente.naoFaz && agente.naoFaz.length > 0 && (
                        <div style={{ background:P.bg4, border:`1px solid ${P.danger}22`, borderLeft:`3px solid ${P.danger}`, padding:"8px 12px" }}>
                          <div style={{ ...MONO, fontSize:8, color:P.danger, letterSpacing:"0.14em", marginBottom:6 }}>VEDACOES — NAO PODE</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px" }}>
                            {agente.naoFaz.map((v,i) => (
                              <div key={i} style={{ ...MONO, fontSize:9, color:P.t3 }}>&#9656; {v}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── CAP II: NARRATIVAS ──────────────────────────────────────────────────────
function CapNarrativas() {
  const [filtro, setFiltro] = useState<string>("TODOS");
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
      <div style={{ display:"flex", gap:4, marginBottom:20, flexWrap:"wrap" }}>
        {cargos.map(c => {
          const cor = P.cargo[c] || P.accent;
          const isAtivo = filtro === c;
          return (
            <button key={c} onClick={() => setFiltro(c)} style={{
              ...MONO, border:`1px solid ${isAtivo ? cor : P.border}`,
              background: isAtivo ? cor + "22" : "transparent",
              color: isAtivo ? cor : P.t3,
              padding:"4px 12px", cursor:"pointer", fontSize:9,
              letterSpacing:"0.1em", textTransform:"uppercase" as const,
            }}>{c}</button>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(400px,1fr))", gap:12 }}>
        {lista.map((narr, idx) => {
          const ag = SEED_CATALOGO.find(a => a.codigoAgente === narr.codigoAgente);
          const cor = P.cargo[ag?.cargo ?? ""] || P.t2;
          return (
            <div key={narr.id} style={{ border:`1px solid ${P.border}`, borderTop:`3px solid ${cor}`, background:P.bg2 }}>
              {/* Header */}
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${P.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.1em" }}>
                    TRANS. {String(idx+1).padStart(3,"0")} · {ag?.cargo ?? ""}
                  </div>
                  <div style={{ ...MONO, fontSize:10, fontWeight:900, color:P.t1, marginTop:2, letterSpacing:"0.04em" }}>{narr.titulo}</div>
                </div>
                <div style={{ ...MONO, fontSize:8, color:P.bg, background:cor, padding:"2px 8px", letterSpacing:"0.1em", whiteSpace:"nowrap" as const }}>
                  {narr.tag}
                </div>
              </div>
              {/* Transcript */}
              <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                {(narr.mensagens as Array<{lado:string;texto:string}>).map((m, mi) => {
                  const isPaciente = m.lado === "paciente";
                  return (
                    <div key={mi} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                      <div style={{
                        ...MONO, fontSize:8, color: isPaciente ? P.t3 : cor,
                        minWidth:64, letterSpacing:"0.08em", paddingTop:1,
                        textTransform:"uppercase" as const, fontWeight:900,
                      }}>
                        {isPaciente ? "[PACIENTE]" : "[AGENTE]"}
                      </div>
                      <div style={{
                        ...MONO, fontSize:9, color: isPaciente ? P.t2 : P.t1,
                        lineHeight:1.7, flex:1, whiteSpace:"pre-wrap" as const,
                        background: isPaciente ? P.bg3 : P.bg4,
                        padding:"6px 10px",
                        borderLeft: `2px solid ${isPaciente ? P.border : cor}`,
                      }}>
                        {m.texto}
                      </div>
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

// ─── CAP III: CAPACIDADES ────────────────────────────────────────────────────
function CapCapacidades() {
  return (
    <div>
      <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.12em", marginBottom:16, textTransform:"uppercase" }}>
        Capitulo III · Matriz de Competencias · 13 dimensoes x 10 agentes
      </div>
      <div style={{ overflowX:"auto" as const }}>
        <table style={{ ...MONO, borderCollapse:"collapse" as const, width:"100%", fontSize:9 }}>
          <thead>
            <tr style={{ background:P.bg3 }}>
              <th style={{ ...tdStyle, color:P.t3, textAlign:"left" as const, minWidth:180, padding:"8px 12px" }}>AGENTE</th>
              {CAP_LABELS.map((l,i) => (
                <th key={i} style={{ ...tdStyle, color:P.t3, writingMode:"vertical-rl" as const, textAlign:"left" as const, padding:"8px 6px", minWidth:32, height:120, fontWeight:400 }}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED_CATALOGO.map((ag, ri) => {
              const caps = SEED_CAPACIDADES[ag.codigoAgente] ?? [];
              const cor = P.cargo[ag.cargo] || P.t2;
              return (
                <tr key={ag.codigoAgente} style={{ background: ri % 2 === 0 ? P.bg2 : P.bg3 }}>
                  <td style={{ ...tdStyle, padding:"8px 12px", borderLeft:`3px solid ${cor}` }}>
                    <div style={{ color:P.t1, fontWeight:700, fontSize:9, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>{ag.nomeAgente}</div>
                    <div style={{ color:P.t3, fontSize:8, marginTop:1 }}>{ag.codigoAgente}</div>
                  </td>
                  {CAP_LABELS.map((_, ci) => {
                    const val = caps[ci];
                    return (
                      <td key={ci} style={{ ...tdStyle, textAlign:"center" as const, padding:"8px 4px" }}>
                        {val
                          ? <span style={{ color:P.ok, fontWeight:900, fontSize:11 }}>&#10003;</span>
                          : <span style={{ color:P.bg4, fontSize:11 }}>&#8212;</span>
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
    </div>
  );
}

const tdStyle: React.CSSProperties = { border:`1px solid ${P.border}`, verticalAlign:"middle" };

// ─── CAP IV: PERSONALIDADE ───────────────────────────────────────────────────
function CapPersonalidade() {
  const DIMS: Array<{ key: keyof typeof SEED_PERSONALIDADE[string]; label: string }> = [
    { key:"formalidade",       label:"Formalidade"          },
    { key:"empatia",           label:"Empatia"              },
    { key:"autoridade",        label:"Autoridade"           },
    { key:"objetividade",      label:"Objetividade"         },
    { key:"calorHumano",       label:"Calor Humano"         },
    { key:"proatividade",      label:"Proatividade"         },
    { key:"paciencia",         label:"Paciencia"            },
    { key:"nivelHumanizacao",  label:"Humanizacao"          },
    { key:"firmeza",           label:"Firmeza"              },
    { key:"didatismo",         label:"Didatismo"            },
    { key:"acolhimento",       label:"Acolhimento"          },
    { key:"sensibilidade",     label:"Sensibilidade"        },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(380px,1fr))", gap:12 }}>
      {SEED_CATALOGO.map(ag => {
        const pers = SEED_PERSONALIDADE[ag.codigoAgente];
        if (!pers) return null;
        const cor = P.cargo[ag.cargo] || P.t2;
        return (
          <div key={ag.codigoAgente} style={{ border:`1px solid ${P.border}`, background:P.bg2 }}>
            {/* Header */}
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${P.border}`, borderLeft:`4px solid ${cor}` }}>
              <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.12em", textTransform:"uppercase" as const }}>{ag.cargo} · {pers.generoVoz}</div>
              <div style={{ ...MONO, fontSize:10, fontWeight:900, color:P.t1, marginTop:2, textTransform:"uppercase" as const, letterSpacing:"0.06em" }}>{ag.nomeAgente}</div>
              <div style={{ ...MONO, fontSize:9, color:cor, marginTop:4, fontStyle:"italic" }}>"{pers.tomGeral}"</div>
            </div>
            {/* Dimensoes */}
            <div style={{ padding:"12px 14px" }}>
              {DIMS.map(({ key, label }) => {
                const val = pers[key] as number;
                return (
                  <div key={key} style={{ display:"grid", gridTemplateColumns:"110px 1fr", gap:8, alignItems:"center", marginBottom:6 }}>
                    <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.08em", textTransform:"uppercase" as const }}>{label}</div>
                    <Barra valor={val} cor={cor} />
                  </div>
                );
              })}
              {/* Frase tipica */}
              <div style={{ marginTop:10, background:P.bg4, borderLeft:`2px solid ${cor}`, padding:"6px 10px" }}>
                <div style={{ ...MONO, fontSize:8, color:P.t3, letterSpacing:"0.1em", marginBottom:3 }}>FRASE TIPICA</div>
                <div style={{ ...MONO, fontSize:9, color:P.t2, fontStyle:"italic" }}>"{pers.exemploFraseTipica}"</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CAP V: FLUXO OPERACIONAL ────────────────────────────────────────────────
function CapFluxo() {
  const SEV_COR: Record<string, string> = { CRITICO:P.danger, ALTA:P.warn, MEDIA:P.accent2 };
  return (
    <div>
      {/* Fluxo */}
      <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.12em", marginBottom:16, textTransform:"uppercase" }}>
        Arquitetura de Disparo — Do Gatilho ao Log
      </div>
      <div style={{ position:"relative", paddingLeft:48, marginBottom:32 }}>
        {/* Linha vertical */}
        <div style={{ position:"absolute", left:20, top:20, bottom:20, width:2, background:P.border }} />
        {FLUXO_STEPS.map((s, i) => {
          const isLast = i === FLUXO_STEPS.length - 1;
          const cor = s.n === "05" ? P.warn : (i % 2 === 0 ? P.accent : P.accent2);
          return (
            <div key={i} style={{ position:"relative", marginBottom: isLast ? 0 : 20 }}>
              {/* Circulo */}
              <div style={{
                position:"absolute", left:-36, top:8, width:20, height:20,
                border:`2px solid ${cor}`, background:P.bg2,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <div style={{ ...MONO, fontSize:8, color:cor, fontWeight:900 }}>{s.n}</div>
              </div>
              <div style={{ border:`1px solid ${P.border}`, background:P.bg2, borderLeft:`3px solid ${cor}`, padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ ...MONO, fontSize:10, fontWeight:900, color:P.t1, letterSpacing:"0.08em", textTransform:"uppercase" as const }}>{s.titulo}</div>
                  {s.extra && (
                    <div style={{ ...MONO, fontSize:8, color:P.warn, border:`1px solid ${P.warn}`, padding:"1px 6px", letterSpacing:"0.1em" }}>{s.extra}</div>
                  )}
                </div>
                <div style={{ ...MONO, fontSize:9, color:P.t2, marginTop:6, lineHeight:1.6 }}>{s.desc}</div>
              </div>
              {!isLast && (
                <div style={{ ...MONO, fontSize:14, color:P.t3, textAlign:"center" as const, margin:"2px 0 2px -36px" }}>&#8595;</div>
              )}
            </div>
          );
        })}
      </div>
      {/* GAPS */}
      <div style={{ borderTop:`1px solid ${P.border}`, paddingTop:24 }}>
        <div style={{ ...MONO, fontSize:9, color:P.danger, letterSpacing:"0.12em", marginBottom:14, textTransform:"uppercase" }}>
          Gaps — O que ainda nao existe
        </div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {GAPS.map((g, i) => {
            const cor = SEV_COR[g.sev] ?? P.t3;
            return (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", border:`1px solid ${P.border}`, padding:"10px 14px", background:P.bg2 }}>
                <div style={{ ...MONO, fontSize:8, color:P.bg, background:cor, padding:"2px 8px", letterSpacing:"0.1em", whiteSpace:"nowrap" as const, marginTop:1 }}>{g.sev}</div>
                <div>
                  <div style={{ ...MONO, fontSize:10, fontWeight:900, color:P.t1, letterSpacing:"0.06em" }}>{g.titulo}</div>
                  <div style={{ ...MONO, fontSize:9, color:P.t2, marginTop:3, lineHeight:1.5 }}>{g.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Tabelas do banco */}
      <div style={{ borderTop:`1px solid ${P.border}`, paddingTop:24, marginTop:24 }}>
        <div style={{ ...MONO, fontSize:9, color:P.t3, letterSpacing:"0.12em", marginBottom:12, textTransform:"uppercase" }}>
          Tabelas do Banco — 15 tabelas no sistema
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:6 }}>
          {[
            "catalogo_agentes","agentes_clinica","capacidades_agente_clinica",
            "execucoes_agente","acoes_agente","memorias_contextuais_agente",
            "validacoes_humanas_agente","eventos_saida_operacionais",
            "narrativas_agente","agentes_personalidade","agentes_motor_escrita",
            "agentes_identidade","agentes_frases","agentes_regras","agentes_versionamento",
          ].map((t, i) => (
            <div key={i} style={{ ...MONO, fontSize:9, color:P.t2, background:P.bg3, border:`1px solid ${P.border}`, padding:"6px 10px" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
export default function CartaMagnaPadcomPage() {
  const [cap, setCap] = useState(0);
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

  return (
    <div style={{ ...MONO, background:P.bg, minHeight:"100vh", color:P.t1, filter:"brightness(0.99) saturate(0.97) contrast(1.16)" }}>
      {/* MASTHEAD */}
      <Masthead stats={stats} />
      {/* CORPO: SUMARIO + CONTEUDO */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:0 }}>
        <Sumario ativo={cap} onChange={setCap} />
        <div style={{ flex:1, padding:"24px 28px", minWidth:0, borderLeft:`1px solid ${P.border}`, borderTop:"none" }}>
          {/* Titulo do capitulo ativo */}
          <div style={{ marginBottom:20, paddingBottom:12, borderBottom:`1px solid ${P.border}` }}>
            <div style={{ fontSize:8, color:P.t3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>Capitulo</div>
            <div style={{ fontSize:13, fontWeight:900, color:P.t1, letterSpacing:"0.08em", textTransform:"uppercase" }}>{CAPITULOS[cap]}</div>
          </div>
          {cap === 0 && <CapConstituicao catalogo={catalogo} />}
          {cap === 1 && <CapNarrativas />}
          {cap === 2 && <CapCapacidades />}
          {cap === 3 && <CapPersonalidade />}
          {cap === 4 && <CapFluxo />}
        </div>
      </div>
    </div>
  );
}
