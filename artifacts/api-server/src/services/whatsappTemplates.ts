export interface TemplateDados {
  pacienteNome: string;
  data?: string;
  hora?: string;
  unidade?: string;
  codigo?: string;
  procedimento?: string;
  exame?: string;
  valor?: string;
  referencia?: string;
  tipoCard?: string;
  mesAno?: string;
  tipoAlerta?: string;
  descricao?: string;
  gravidade?: string;
}

function primeiroNome(nome: string): string {
  return (nome || "").split(" ")[0];
}

export function templateLembreteSessao(dados: TemplateDados): string {
  return [
    `Ola ${primeiroNome(dados.pacienteNome)}! 👋`,
    "",
    "Lembramos que voce tem uma sessao agendada:",
    "",
    `📅 *${dados.data || ""}* as *${dados.hora || ""}*`,
    `📍 ${dados.unidade || ""}`,
    "",
    "Qualquer duvida, estamos a disposicao.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export function templateCodigoValidacao(dados: TemplateDados): string {
  return [
    `PAWARDS - Instituto Padua | ${dados.procedimento || ""} | ${dados.codigo || ""}`,
    "",
    `Ola ${primeiroNome(dados.pacienteNome)}!`,
    "",
    `Seu codigo de validacao para a sessao de ${dados.data || ""} e:`,
    "",
    `🔑 *${dados.codigo || ""}*`,
    "",
    "Apresente este codigo a enfermeira no momento da aplicacao.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export function templateAlertaExameCritico(dados: TemplateDados): string {
  return [
    `⚠️ *ALERTA CLINICO* — Exame Fora do Padrao`,
    "",
    `Paciente: *${dados.pacienteNome}*`,
    `Exame: *${dados.exame || ""}*`,
    `Valor: *${dados.valor || ""}*`,
    `Referencia: ${dados.referencia || ""}`,
    "",
    "Favor verificar e tomar as providencias necessarias.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export function templateCardMensalPendente(dados: TemplateDados): string {
  return [
    `📋 *Card Mensal Pendente*`,
    "",
    `Paciente: *${dados.pacienteNome}*`,
    `Tipo: ${dados.tipoCard || ""}`,
    `Periodo: ${dados.mesAno || ""}`,
    "",
    "Ha um card de acompanhamento pendente de resposta.",
    "Acesse o sistema para responder.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export function templateAlertaClinicoUrgente(dados: TemplateDados): string {
  const icone = dados.gravidade === "GRAVE" ? "🔴" : dados.gravidade === "MODERADO" ? "🟡" : "🟢";
  return [
    `${icone} *ALERTA CLINICO ${dados.gravidade || ""}*`,
    "",
    `Paciente: *${dados.pacienteNome}*`,
    `Tipo: ${dados.tipoAlerta || ""}`,
    `Descricao: ${dados.descricao || ""}`,
    "",
    "Verifique o sistema para mais detalhes.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export function templateConfirmacaoAgendamento(dados: TemplateDados): string {
  return [
    `✅ *Agendamento Confirmado*`,
    "",
    `Ola ${primeiroNome(dados.pacienteNome)}!`,
    "",
    "Seu agendamento foi confirmado:",
    "",
    `📅 *${dados.data || ""}* as *${dados.hora || ""}*`,
    `💊 ${dados.procedimento || ""}`,
    `📍 ${dados.unidade || ""}`,
    "",
    "Caso precise remarcar, entre em contato conosco.",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");
}

export const TEMPLATES_DISPONIVEIS = [
  { nome: "LEMBRETE_SESSAO", descricao: "Lembrete de sessao agendada", fn: templateLembreteSessao },
  { nome: "CODIGO_VALIDACAO", descricao: "Codigo de validacao para enfermeira", fn: templateCodigoValidacao },
  { nome: "ALERTA_EXAME_CRITICO", descricao: "Alerta de exame fora do padrao", fn: templateAlertaExameCritico },
  { nome: "CARD_MENSAL_PENDENTE", descricao: "Card mensal pendente de resposta", fn: templateCardMensalPendente },
  { nome: "ALERTA_CLINICO_URGENTE", descricao: "Alerta clinico urgente", fn: templateAlertaClinicoUrgente },
  { nome: "CONFIRMACAO_AGENDAMENTO", descricao: "Confirmacao de agendamento", fn: templateConfirmacaoAgendamento },
] as const;
