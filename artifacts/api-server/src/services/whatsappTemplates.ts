export type Genero = "masculino" | "feminino" | "outro" | "nao_informado";

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

export interface FormulaLembrete {
  nome: string;
  ativoPrincipal?: string;
  dose?: string;
  horario?: string;
  observacaoRefeicao?: string;
  posologia?: string;
}

export interface PeriodoLembrete {
  nome: string;
  tipo: "tomar" | "nao_tomar";
  formulas: FormulaLembrete[];
}

export interface LembretePrescricaoDados {
  pacienteNome: string;
  pacienteGenero?: Genero;
  /** Data/hora do envio (timezone ja aplicada). Default: agora. */
  agora?: Date;
  /** Saudacao opcional pre-calculada. Se nao informado, e calculada por `agora`. */
  saudacao?: string;
  periodos: PeriodoLembrete[];
}

function primeiroNome(nome: string): string {
  return (nome || "").trim().split(/\s+/)[0] || "";
}

export function cumprimentoPorHora(hora: number): string {
  if (hora >= 5 && hora < 12) return "Bom dia!";
  if (hora >= 12 && hora < 18) return "Boa tarde!";
  return "Boa noite!";
}

export function tratamentoPorGenero(genero: Genero | undefined, nome: string): string {
  const primeiro = primeiroNome(nome);
  switch (genero) {
    case "masculino":
      return `Sr. ${primeiro}`;
    case "feminino":
      return `Sra. ${primeiro}`;
    default:
      return primeiro;
  }
}

export function montarSaudacao(
  nome: string,
  genero: Genero | undefined,
  agora: Date = new Date(),
): string {
  const cumprimento = cumprimentoPorHora(agora.getHours());
  const tratamento = tratamentoPorGenero(genero, nome);
  return `${cumprimento}\n\n${tratamento}, tudo bem?`;
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

export function templateLembretePrescricaoRevo(dados: LembretePrescricaoDados): string {
  const saudacao = dados.saudacao
    ?? montarSaudacao(dados.pacienteNome, dados.pacienteGenero, dados.agora ?? new Date());

  const linhas: string[] = [];
  linhas.push(saudacao);
  linhas.push("");
  linhas.push("Segue o lembrete da sua prescricao personalizada:");

  for (const periodo of dados.periodos) {
    linhas.push("");
    linhas.push(`⬛ *Período:* _${periodo.nome}_`);

    const cor = periodo.tipo === "tomar" ? "🟩" : "🟨";
    if (periodo.tipo === "tomar") {
      linhas.push(`${cor} *Programado* para administrar:`);
    } else {
      linhas.push(`${cor} *NÃO TOMAR* as fórmulas abaixo:`);
    }

    for (const formula of periodo.formulas) {
      linhas.push("");
      linhas.push(`${cor} *${formula.nome}*`);
      if (formula.ativoPrincipal) {
        const dose = formula.dose ? ` — ${formula.dose}` : "";
        linhas.push(`   ${formula.ativoPrincipal}${dose}`);
      }
      if (formula.horario) {
        linhas.push(`   Horário: ${formula.horario}`);
      }
      if (formula.observacaoRefeicao) {
        linhas.push(`   ${formula.observacaoRefeicao}`);
      }
      if (formula.posologia) {
        linhas.push(`   Posologia: ${formula.posologia}`);
      }
    }
  }

  linhas.push("");
  linhas.push("PAWARDS - Instituto Padua");
  linhas.push("");
  linhas.push("_Developed by Pawards MedCore_");

  return linhas.join("\n");
}

export interface TemplateDadosMap {
  LEMBRETE_SESSAO: TemplateDados;
  CODIGO_VALIDACAO: TemplateDados;
  ALERTA_EXAME_CRITICO: TemplateDados;
  CARD_MENSAL_PENDENTE: TemplateDados;
  ALERTA_CLINICO_URGENTE: TemplateDados;
  CONFIRMACAO_AGENDAMENTO: TemplateDados;
  LEMBRETE_PRESCRICAO_REVO: LembretePrescricaoDados;
}

export type TemplateNome = keyof TemplateDadosMap;
export type TemplateDadosUnion = TemplateDadosMap[TemplateNome];

export interface TemplateDefinition<N extends TemplateNome = TemplateNome> {
  nome: N;
  descricao: string;
  fn: (dados: TemplateDadosMap[N]) => string;
}

function defineTemplate<N extends TemplateNome>(
  nome: N,
  descricao: string,
  fn: (dados: TemplateDadosMap[N]) => string,
): TemplateDefinition<N> {
  return { nome, descricao, fn };
}

export const TEMPLATES_DISPONIVEIS = [
  defineTemplate("LEMBRETE_SESSAO", "Lembrete de sessao agendada", templateLembreteSessao),
  defineTemplate("CODIGO_VALIDACAO", "Codigo de validacao para enfermeira", templateCodigoValidacao),
  defineTemplate("ALERTA_EXAME_CRITICO", "Alerta de exame fora do padrao", templateAlertaExameCritico),
  defineTemplate("CARD_MENSAL_PENDENTE", "Card mensal pendente de resposta", templateCardMensalPendente),
  defineTemplate("ALERTA_CLINICO_URGENTE", "Alerta clinico urgente", templateAlertaClinicoUrgente),
  defineTemplate("CONFIRMACAO_AGENDAMENTO", "Confirmacao de agendamento", templateConfirmacaoAgendamento),
  defineTemplate("LEMBRETE_PRESCRICAO_REVO", "Lembrete de prescrição personalizada", templateLembretePrescricaoRevo),
] as const;

export function renderTemplate<N extends TemplateNome>(
  nome: N,
  dados: TemplateDadosMap[N],
): string {
  const tpl = TEMPLATES_DISPONIVEIS.find((t) => t.nome === nome) as
    | TemplateDefinition<N>
    | undefined;
  if (!tpl) throw new Error(`Template '${nome}' nao encontrado`);
  return tpl.fn(dados);
}
