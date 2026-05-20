// TEATRO DE CENÁRIOS DA MENSAGERIA — desenho confirmado por Caio em 19/05/2026.
// 4 cenários compartilham o MESMO motor (periodos_dia + mensagens_catalogo + whatsapp_mensagens_log)
// mas cada um tem seu próprio TEMPLATE com placeholders próprios + gatilho próprio + destinatário próprio.

import type { PeriodoDia } from "./_mensageria";
import { PERIODOS_DIA } from "./_mensageria";

export type CenarioId =
  | "receita_manipulada"
  | "receita_industrializada"
  | "injetavel_implante"
  | "followup_estetico";

export type Cenario = {
  id: CenarioId;
  emoji: string;
  nome: string;
  subtitulo: string;
  cor_primary: string;
  cor_bg: string;
  gatilho: string;          // "período cronobiológico" / "data agendada" / "vencimento"
  destinatario: string;     // "paciente" / "paciente + card Trello" / "agente interno"
  canal: string;            // "WhatsApp Beatriz" / "WhatsApp Beatriz + Trello"
  exemploTrigger: string;
  usaPeriodos: boolean;     // true só pra cenários cronobiológicos (receitas)
};

export const CENARIOS: Cenario[] = [
  {
    id: "receita_manipulada",
    emoji: "🧪",
    nome: "Receita Manipulada",
    subtitulo: "fórmulas Pádua via Galena / FAMA",
    cor_primary: "#C9A5F5",
    cor_bg: "rgba(201,165,245,0.10)",
    gatilho: "período cronobiológico (JE/IM/MM/AL/IT/MT/NO/FN/CE)",
    destinatario: "paciente",
    canal: "WhatsApp Beatriz Romanov",
    exemploTrigger: "07:00 → IM · Início da Manhã",
    usaPeriodos: true,
  },
  {
    id: "receita_industrializada",
    emoji: "💊",
    nome: "Receita Industrializada",
    subtitulo: "drogaria comum / controlados azul-amarelo",
    cor_primary: "#A8C7FA",
    cor_bg: "rgba(168,199,250,0.10)",
    gatilho: "período cronobiológico + alerta de recompra (estoque)",
    destinatario: "paciente",
    canal: "WhatsApp Beatriz Romanov",
    exemploTrigger: "07:00 → IM · faltam 5 cápsulas do Losartana",
    usaPeriodos: true,
  },
  {
    id: "injetavel_implante",
    emoji: "💉",
    nome: "Injetável / Implante",
    subtitulo: "EV · IM · SC · IMP — agendado na clínica",
    cor_primary: "#F5C26B",
    cor_bg: "rgba(245,194,107,0.10)",
    gatilho: "data agendada (24h antes + 2h antes)",
    destinatario: "paciente",
    canal: "WhatsApp Beatriz Romanov",
    exemploTrigger: "amanhã 14:00 · NAD+ Endovenoso · Sala 02",
    usaPeriodos: false,
  },
  {
    id: "followup_estetico",
    emoji: "🌸",
    nome: "Follow-up Estético",
    subtitulo: "vencimento botox 6m · preenchimento 12m · IPL 30d",
    cor_primary: "#E8A5D8",
    cor_bg: "rgba(232,165,216,0.10)",
    gatilho: "vencimento (data_aplicacao + duracao_meses - 30 dias)",
    destinatario: "paciente + card Trello pra fechadora de venda",
    canal: "WhatsApp Beatriz + task_cards (sync Trello)",
    exemploTrigger: "Botox aplicado 20/11/2025 + 6m = vence 20/05/2026",
    usaPeriodos: false,
  },
];

// ───────────────────────────────────────────────────────────────────────
// CATÁLOGO DE PLACEHOLDERS · disponíveis por cenário
// ───────────────────────────────────────────────────────────────────────
export type Placeholder = {
  chave: string;             // ex: "{NOME_PACIENTE}"
  rotulo: string;            // pra UI
  exemplo: string;           // valor que aparece no preview
  obrigatorio: boolean;
  cenarios: CenarioId[];     // em quais cenários esse placeholder existe
  grupo: "paciente" | "clinica" | "cronobio" | "agendamento" | "vencimento" | "encantamento" | "assinatura";
};

export const PLACEHOLDERS: Placeholder[] = [
  // grupo paciente
  { chave: "{NOME_PACIENTE}",      rotulo: "Nome do paciente",      exemplo: "Sr. Graco",         obrigatorio: true,  grupo: "paciente",      cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante","followup_estetico"] },
  { chave: "{PRONOME_TRATAMENTO}", rotulo: "Sr./Sra./Você",         exemplo: "Sr.",               obrigatorio: false, grupo: "paciente",      cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante","followup_estetico"] },

  // grupo cronobio (só receitas)
  { chave: "{SAUDACAO}",           rotulo: "Bom dia/Boa tarde…",    exemplo: "Bom dia",           obrigatorio: true,  grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{NOME_PERIODO}",       rotulo: "Início da Manhã, FN…", exemplo: "Início da Manhã",   obrigatorio: true,  grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{EMOJI_PERIODO}",      rotulo: "🌅 / 🌙 / ☀️ …",        exemplo: "🌅",                obrigatorio: false, grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{JANELA_PERIODO}",     rotulo: "07:00–08:59",           exemplo: "07:00–08:59",       obrigatorio: false, grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{ABERTURA_PERIODO}",   rotulo: "Frase de abertura",     exemplo: "Neste despertar da manhã…", obrigatorio: false, grupo: "cronobio", cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{DIA_SEMANA}",         rotulo: "Segunda · Terça…",      exemplo: "quarta-feira",      obrigatorio: false, grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{SEMANA_DO_MES}",      rotulo: "1ª/2ª/3ª/4ª semana",    exemplo: "terceira semana",   obrigatorio: false, grupo: "cronobio",      cenarios: ["receita_manipulada","receita_industrializada"] },

  // grupo receita
  { chave: "{LISTA_FORMULAS}",     rotulo: "Todas as fórmulas do período (loop)", exemplo: "*Fórmula 01* — Blend Energia AM…\n*Fórmula 02* — Blend Menopausa…", obrigatorio: true, grupo: "cronobio", cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{POSOLOGIA}",          rotulo: "Tomar X cáps via Y",    exemplo: "Tomar 1 dose via oral",     obrigatorio: true,  grupo: "cronobio",  cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{VIA}",                rotulo: "VO / EV / IM / SC / IMP", exemplo: "VO",                       obrigatorio: false, grupo: "cronobio",  cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante"] },
  { chave: "{HORARIO_DOSE}",       rotulo: "Horário individual",    exemplo: "07h + 08h",                 obrigatorio: false, grupo: "cronobio",  cenarios: ["receita_manipulada","receita_industrializada"] },

  // grupo agendamento (injetável)
  { chave: "{DATA_AGENDAMENTO}",   rotulo: "Data da aplicação",     exemplo: "amanhã, 21/05/2026", obrigatorio: true,  grupo: "agendamento",   cenarios: ["injetavel_implante"] },
  { chave: "{HORA_AGENDAMENTO}",   rotulo: "Horário da aplicação",  exemplo: "14:00",              obrigatorio: true,  grupo: "agendamento",   cenarios: ["injetavel_implante"] },
  { chave: "{NOME_PROCEDIMENTO}",  rotulo: "Nome do procedimento",  exemplo: "NAD+ Endovenoso 500mg", obrigatorio: true, grupo: "agendamento", cenarios: ["injetavel_implante","followup_estetico"] },
  { chave: "{SALA}",               rotulo: "Sala da clínica",       exemplo: "Sala 02",            obrigatorio: false, grupo: "agendamento",   cenarios: ["injetavel_implante"] },
  { chave: "{ENFERMEIRA}",         rotulo: "Enfermeira atribuída",  exemplo: "Enf. Carla",         obrigatorio: false, grupo: "agendamento",   cenarios: ["injetavel_implante"] },

  // grupo vencimento (follow-up estético)
  { chave: "{DATA_ULTIMA_APLICACAO}", rotulo: "Última aplicação",   exemplo: "20/11/2025",         obrigatorio: true,  grupo: "vencimento",   cenarios: ["followup_estetico"] },
  { chave: "{DATA_VENCIMENTO}",       rotulo: "Vence em",            exemplo: "20/05/2026",         obrigatorio: true,  grupo: "vencimento",   cenarios: ["followup_estetico"] },
  { chave: "{DIAS_RESTANTES}",        rotulo: "Faltam X dias",       exemplo: "30 dias",            obrigatorio: true,  grupo: "vencimento",   cenarios: ["followup_estetico"] },
  { chave: "{NOME_FECHADORA}",        rotulo: "SDR / fechadora",     exemplo: "Pri (fechadora)",    obrigatorio: false, grupo: "vencimento",   cenarios: ["followup_estetico"] },

  // grupo encantamento (carta personalizada — controlada por matriz no GPS)
  { chave: "{CARTA_ENCANTAMENTO}",    rotulo: "Carta personalizada (toggles no GPS)", exemplo: "✨ _o dia da grande bênção está chegando_ 👶", obrigatorio: false, grupo: "encantamento", cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante","followup_estetico"] },

  // grupo clínica (Dr. Caio + obs)
  { chave: "{STATUS_DR_CAIO}",     rotulo: "Status do Dr. Caio",    exemplo: "O Dr. Caio está contente com sua evolução…", obrigatorio: false, grupo: "clinica", cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante","followup_estetico"] },
  { chave: "{FALA_DR_CAIO}",       rotulo: "Fala do Dr. Caio",      exemplo: "💬 *O Dr. Caio sempre reforça*…",            obrigatorio: false, grupo: "clinica", cenarios: ["receita_manipulada","receita_industrializada"] },
  { chave: "{OBS_DOSE}",           rotulo: "⚠️ dose ≠ 1 cápsula",   exemplo: "⚠️ *dose* não é sempre igual a *1 cápsula*", obrigatorio: false, grupo: "clinica", cenarios: ["receita_manipulada","receita_industrializada"] },

  // grupo assinatura
  { chave: "{ASSINATURA_BEATRIZ}", rotulo: "Beatriz + rodapé",      exemplo: "Com atenção clínica,\n*Beatriz Romanov*\n_Assistente Farmacêutica_", obrigatorio: true, grupo: "assinatura", cenarios: ["receita_manipulada","receita_industrializada","injetavel_implante","followup_estetico"] },
];

// ───────────────────────────────────────────────────────────────────────
// TEMPLATES INICIAIS · 1 por cenário (Caio edita ao vivo no painel)
// ───────────────────────────────────────────────────────────────────────
export const TEMPLATES_INICIAIS: Record<CenarioId, string> = {
  receita_manipulada:
`{SAUDACAO}!

{PRONOME_TRATAMENTO} {NOME_PACIENTE}, tudo bem?

{SLOT_TOPO}

{STATUS_DR_CAIO}

{ABERTURA_PERIODO}

*Período: {NOME_PERIODO}* {EMOJI_PERIODO} _{JANELA_PERIODO}_
*Programado* para administrar:

{LISTA_FORMULAS}

{SLOT_MEIO}

{FALA_DR_CAIO}

{OBS_DOSE}

{CARTA_ENCANTAMENTO}

{SLOT_RODAPE}

{ASSINATURA_BEATRIZ}`,

  receita_industrializada:
`{SAUDACAO}!

{PRONOME_TRATAMENTO} {NOME_PACIENTE}, lembrete dos medicamentos de farmácia comum:

{SLOT_TOPO}

*Período: {NOME_PERIODO}* {EMOJI_PERIODO}
{LISTA_FORMULAS}

{POSOLOGIA}

{SLOT_MEIO}

⚠️ Se faltar caixa nova, avise a equipe pra reposição.

{CARTA_ENCANTAMENTO}

{SLOT_RODAPE}

{ASSINATURA_BEATRIZ}`,

  injetavel_implante:
`{PRONOME_TRATAMENTO} {NOME_PACIENTE}, lembrete do seu procedimento:

{SLOT_TOPO}

💉 *{NOME_PROCEDIMENTO}*
📅 *{DATA_AGENDAMENTO}* às *{HORA_AGENDAMENTO}*
📍 {SALA} · com {ENFERMEIRA}

{SLOT_MEIO}

Chegar 10 min antes pra acomodação.
Manter hidratação na véspera.

{CARTA_ENCANTAMENTO}

{SLOT_RODAPE}

{ASSINATURA_BEATRIZ}`,

  followup_estetico:
`{PRONOME_TRATAMENTO} {NOME_PACIENTE}, seu *{NOME_PROCEDIMENTO}* está prestes a vencer:

{SLOT_TOPO}

📅 Última aplicação: *{DATA_ULTIMA_APLICACAO}*
⏳ Vence em: *{DATA_VENCIMENTO}* (faltam *{DIAS_RESTANTES}*)

{SLOT_MEIO}

Quer agendar a renovação?
{NOME_FECHADORA} já recebeu seu card e vai te procurar.

{CARTA_ENCANTAMENTO}

{SLOT_RODAPE}

{ASSINATURA_BEATRIZ}`,
};

// ───────────────────────────────────────────────────────────────────────
// VERSÍCULOS BÍBLICOS · catálogo (Caio escolhe ao vivo no teatro)
// ───────────────────────────────────────────────────────────────────────
export const VERSICULOS_BIBLICOS = [
  { ref: "Provérbios 17:22", texto: "O coração alegre é bom remédio, mas o espírito abatido seca os ossos." },
  { ref: "Jeremias 30:17",   texto: "Restaurarei a tua saúde e curarei as tuas feridas, diz o Senhor." },
  { ref: "Salmos 103:2-3",   texto: "Bendize, ó minha alma, ao Senhor — Ele é quem perdoa todas as tuas iniquidades e sara todas as tuas enfermidades." },
  { ref: "Isaías 40:31",     texto: "Os que esperam no Senhor renovam as suas forças — correm e não se cansam, caminham e não se fatigam." },
  { ref: "3 João 1:2",       texto: "Amado, desejo que te vá bem em todas as coisas, e que tenhas saúde, assim como bem vai a tua alma." },
  { ref: "Filipenses 4:13",  texto: "Posso todas as coisas naquele que me fortalece." },
];

// ───────────────────────────────────────────────────────────────────────
// ADD-ONS OPCIONAIS · 4 mensagens editáveis com posição configurável
// Caio decide ao vivo: marca toggle ON/OFF, edita o texto e escolhe onde
// vai aparecer no template (topo · meio · rodapé). Renderização substitui
// os marcadores {SLOT_TOPO} / {SLOT_MEIO} / {SLOT_RODAPE} no template.
// ───────────────────────────────────────────────────────────────────────
export type SlotPosicao = "topo" | "meio" | "rodape";

export type AddOnId =
  | "versiculo" | "dia_semana" | "semana_mes" | "custom"
  | "aniversario" | "marco_constancia" | "hidratacao"
  | "respiracao" | "carinho_familiar" | "checkin_sintomas";

export type AddOnGrupo = "essencial" | "kaizen";

export type AddOn = {
  id: AddOnId;
  grupo: AddOnGrupo;
  emoji: string;
  rotulo: string;
  ativo: boolean;
  posicao: SlotPosicao;
  texto: string;     // texto que será injetado
  meta?: string;     // ex: referência bíblica, dia escolhido, etc
  gatilho?: string;  // condição opcional (data, marco)
};

export type AddOnsConfig = Record<AddOnId, AddOn>;

export function addOnsPadrao(): AddOnsConfig {
  return {
    // ──── ESSENCIAIS (4) — sempre disponíveis, alguns ligados por padrão ────
    versiculo: {
      id: "versiculo", grupo: "essencial", emoji: "📖", rotulo: "Versículo bíblico",
      ativo: true, posicao: "rodape",
      texto: `_"${VERSICULOS_BIBLICOS[1].texto}"_`,
      meta: VERSICULOS_BIBLICOS[1].ref,
    },
    dia_semana: {
      id: "dia_semana", grupo: "essencial", emoji: "📅", rotulo: "Frase do dia da semana",
      ativo: true, posicao: "topo",
      texto: "Hoje é *quarta-feira* — no meio da semana, consistência é o que faz a diferença.",
      meta: "quarta",
    },
    semana_mes: {
      id: "semana_mes", grupo: "essencial", emoji: "🗓️", rotulo: "Frase da semana do mês",
      ativo: false, posicao: "topo",
      texto: "Estamos na *terceira semana* — já na segunda metade do mês.",
      meta: "3",
    },
    custom: {
      id: "custom", grupo: "essencial", emoji: "✍️", rotulo: "Mensagem custom",
      ativo: false, posicao: "meio",
      texto: "",
    },

    // ──── KAIZEN (6) — melhorias contínuas, OFF por padrão ────
    aniversario: {
      id: "aniversario", grupo: "kaizen", emoji: "🎂", rotulo: "Aniversário do paciente",
      ativo: false, posicao: "topo",
      texto: "🎂 *Feliz aniversário, {NOME_PACIENTE}!* Que este novo ciclo venha com ainda mais saúde, vitalidade e bençãos. A equipe PADCOM celebra com o senhor.",
      gatilho: "data_nascimento = hoje (pacientes.data_nascimento)",
    },
    marco_constancia: {
      id: "marco_constancia", grupo: "kaizen", emoji: "🏆", rotulo: "Marco de constância",
      ativo: false, posicao: "meio",
      texto: "🏆 *Marco alcançado:* o senhor já completou *90 dias* de protocolo sem falhar. Isso é raro — e é exatamente o que separa quem trata do sintoma de quem trata da raiz.",
      gatilho: "doses_consecutivas IN (30, 60, 90, 180, 365)",
    },
    hidratacao: {
      id: "hidratacao", grupo: "kaizen", emoji: "💧", rotulo: "Lembrete de hidratação",
      ativo: false, posicao: "meio",
      texto: "💧 *Antes de tomar*, beba um copo grande de água em temperatura ambiente. A absorção das fórmulas depende de hidratação adequada — não pule esse passo.",
      gatilho: "periodos_dia.sigla IN ('JE','IM') — só jejum e início manhã",
    },
    respiracao: {
      id: "respiracao", grupo: "kaizen", emoji: "🌬️", rotulo: "Pausa de respiração (1 min)",
      ativo: false, posicao: "topo",
      texto: "🌬️ *Pausa de 1 minuto:* inspire por 4s, segure por 4s, expire por 6s. Repita 5x. Reduz cortisol, melhora foco e prepara o corpo pra absorver melhor.",
      gatilho: "manhã ou pré-procedimento (IM, MM, ou injetavel_implante)",
    },
    carinho_familiar: {
      id: "carinho_familiar", grupo: "kaizen", emoji: "❤️", rotulo: "Carinho familiar",
      ativo: false, posicao: "rodape",
      texto: "❤️ A *Bia* pediu pra reforçar: ela está acompanhando seu protocolo de longe e tem muito orgulho da disciplina que o senhor vem mantendo.",
      gatilho: "manual — equipe ativa quando familiar autoriza",
    },
    checkin_sintomas: {
      id: "checkin_sintomas", grupo: "kaizen", emoji: "📊", rotulo: "Check-in de sintomas",
      ativo: false, posicao: "rodape",
      texto: "📊 *Check-in semanal:* como o senhor avaliaria sua energia hoje, de 0 a 10? E o sono da semana? Responda essa mensagem com 2 números — eu registro pro Dr. Caio.",
      gatilho: "1x/semana — sexta-feira no FN (Fim de Noite)",
    },
  };
}

export function renderSlot(addons: AddOnsConfig, slot: SlotPosicao): string {
  return Object.values(addons)
    .filter(a => a.ativo && a.posicao === slot && a.texto.trim().length > 0)
    .map(a => `${a.emoji} ${a.texto}${a.meta && a.id === "versiculo" ? `\n— *${a.meta}*` : ""}`)
    .join("\n\n");
}

// ───────────────────────────────────────────────────────────────────────
// CARTA DE ENCANTAMENTO · matriz períodos × cenários (controle no GPS)
// ───────────────────────────────────────────────────────────────────────
// Conceito Caio: a carta é UM placeholder ({CARTA_ENCANTAMENTO}) embutido no template
// genérico. Quando você monta o protocolo de UM paciente, define:
//   - texto da frase
//   - janela de validade (data inicial → data final)
//   - matriz BOOLEAN: aparece em QUAL período × QUAL cenário?
// Isso evita "pesadelo de repetição" — encantar sem cansar.

export type MatrizCartaEncantamento = {
  ativo: boolean;
  texto: string;
  dataInicio: string;       // ISO yyyy-mm-dd
  dataFim: string;          // ISO yyyy-mm-dd
  matriz: Record<string, Record<CenarioId, boolean>>;  // [periodoSigla][cenarioId] = boolean
};

export function matrizPadraoDesligada(): MatrizCartaEncantamento["matriz"] {
  const m: MatrizCartaEncantamento["matriz"] = {};
  for (const p of PERIODOS_DIA) {
    m[p.sigla] = {
      receita_manipulada: false,
      receita_industrializada: false,
      injetavel_implante: false,
      followup_estetico: false,
    };
  }
  return m;
}

export function exemploCartaFuturoPapai(): MatrizCartaEncantamento {
  const matriz = matrizPadraoDesligada();
  // exemplo: só receita manipulada, só IM e FN (não diluir nas 9 janelas)
  matriz["IM"].receita_manipulada = true;
  matriz["FN"].receita_manipulada = true;
  return {
    ativo: true,
    texto: "✨ _o dia da grande bênção está chegando_ 👶",
    dataInicio: "2026-05-15",
    dataFim: "2026-07-15",
    matriz,
  };
}

// resolve se a carta deve aparecer numa mensagem específica
export function cartaAtivaPara(
  carta: MatrizCartaEncantamento | null,
  periodoSigla: string,
  cenario: CenarioId,
  hoje: Date = new Date(),
): boolean {
  if (!carta || !carta.ativo) return false;
  const ini = new Date(carta.dataInicio);
  const fim = new Date(carta.dataFim);
  if (hoje < ini || hoje > fim) return false;
  return !!carta.matriz[periodoSigla]?.[cenario];
}

export function resolverPlaceholder(
  chave: string,
  ctx: {
    periodo?: PeriodoDia;
    carta?: MatrizCartaEncantamento | null;
    cenario: CenarioId;
    listaFormulasRendered?: string;
    diaSemana?: string;
    semanaMes?: string;
    statusDrCaio?: string;
    falaDrCaio?: string;
    assinatura?: string;
    obsDose?: string;
    slotTopo?: string;
    slotMeio?: string;
    slotRodape?: string;
  },
): string {
  if (chave === "{SLOT_TOPO}")   return ctx.slotTopo   ?? "";
  if (chave === "{SLOT_MEIO}")   return ctx.slotMeio   ?? "";
  if (chave === "{SLOT_RODAPE}") return ctx.slotRodape ?? "";
  const ph = PLACEHOLDERS.find(p => p.chave === chave);
  switch (chave) {
    case "{NOME_PACIENTE}":      return "Graco";
    case "{PRONOME_TRATAMENTO}": return "Sr.";
    case "{SAUDACAO}":           return ctx.periodo?.saudacao ?? "Olá";
    case "{NOME_PERIODO}":       return ctx.periodo?.nome ?? "—";
    case "{EMOJI_PERIODO}":      return ctx.periodo?.emoji ?? "";
    case "{JANELA_PERIODO}":     return ctx.periodo ? `${ctx.periodo.janela_inicio}–${ctx.periodo.janela_fim}` : "";
    case "{ABERTURA_PERIODO}":   return ctx.periodo?.abertura ?? "";
    case "{DIA_SEMANA}":         return ctx.diaSemana ?? "quarta-feira";
    case "{SEMANA_DO_MES}":      return ctx.semanaMes ?? "terceira semana";
    case "{LISTA_FORMULAS}":     return ctx.listaFormulasRendered ?? "_(fórmulas do período)_";
    case "{POSOLOGIA}":          return "Tomar 1 dose via oral";
    case "{VIA}":                return "VO";
    case "{HORARIO_DOSE}":       return "07h";
    case "{DATA_AGENDAMENTO}":   return "amanhã, 21/05/2026";
    case "{HORA_AGENDAMENTO}":   return "14:00";
    case "{NOME_PROCEDIMENTO}":  return ctx.cenario === "followup_estetico" ? "Botox Toxina Botulínica" : "NAD+ Endovenoso 500mg";
    case "{SALA}":               return "Sala 02";
    case "{ENFERMEIRA}":         return "Enf. Carla";
    case "{DATA_ULTIMA_APLICACAO}": return "20/11/2025";
    case "{DATA_VENCIMENTO}":    return "20/05/2026";
    case "{DIAS_RESTANTES}":     return "30 dias";
    case "{NOME_FECHADORA}":     return "Pri (fechadora)";
    case "{STATUS_DR_CAIO}":     return ctx.statusDrCaio ?? "";
    case "{FALA_DR_CAIO}":       return ctx.falaDrCaio ?? "";
    case "{OBS_DOSE}":           return ctx.obsDose ?? "";
    case "{ASSINATURA_BEATRIZ}": return ctx.assinatura ?? "Beatriz Romanov";
    case "{CARTA_ENCANTAMENTO}":
      if (cartaAtivaPara(ctx.carta ?? null, ctx.periodo?.sigla ?? "—", ctx.cenario)) {
        return ctx.carta!.texto;
      }
      return "";
    default:
      return ph?.exemplo ?? chave;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 📡 CANAIS · matriz de capacidades de formatação por canal
// ═══════════════════════════════════════════════════════════════════════
export type Canal = "whatsapp" | "telegram_mv2" | "telegram_html";

export type CapacidadesCanal = {
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  tachado: boolean;
  mono: boolean;
  spoiler: boolean;
  link_inline: boolean;
  precisa_escape: boolean;
};

export const CANAIS: Record<Canal, {
  id: Canal;
  rotulo: string;
  curto: string;
  icone: string;
  cor: string;
  formato: string;
  suporta: CapacidadesCanal;
  obs: string;
}> = {
  whatsapp: {
    id: "whatsapp", rotulo: "WhatsApp", curto: "WA", icone: "💬", cor: "#25D366",
    formato: "*negrito*  _itálico_  ~tachado~  ```mono```",
    suporta: { negrito: true, italico: true, sublinhado: false, tachado: true, mono: true, spoiler: false, link_inline: false, precisa_escape: false },
    obs: "marcadores precisam de espaço/pontuação ao redor pra serem reconhecidos",
  },
  telegram_mv2: {
    id: "telegram_mv2", rotulo: "Telegram MV2", curto: "TG-MV2", icone: "✈️", cor: "#54A9EB",
    formato: "*negrito*  _itálico_  __sublinhado__  ~tachado~  `mono`  ||spoiler||",
    suporta: { negrito: true, italico: true, sublinhado: true, tachado: true, mono: true, spoiler: true, link_inline: true, precisa_escape: true },
    obs: "escapa _*[]()~`>#+-=|{}.! com \\ — bots quebram com erro 400 sem isso",
  },
  telegram_html: {
    id: "telegram_html", rotulo: "Telegram HTML", curto: "TG-HTML", icone: "✈️", cor: "#88BEEC",
    formato: "<b>x</b>  <i>x</i>  <u>x</u>  <s>x</s>  <code>x</code>",
    suporta: { negrito: true, italico: true, sublinhado: true, tachado: true, mono: true, spoiler: true, link_inline: true, precisa_escape: false },
    obs: "verboso porém robusto · sem labirinto de escape · ideal pra mensagens com pontuação livre",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// 🗺️ ORIGEM_DB · cada placeholder → tabela.coluna + jornada do dado
// (a "fossa abissal" — pra mostrar de ONDE o dado veio)
// ═══════════════════════════════════════════════════════════════════════
export const ORIGEM_DB_PLACEHOLDER: Record<string, { tabela: string; coluna: string; jornada: string }> = {
  "{NOME_PACIENTE}":          { tabela: "pacientes",                                coluna: "nome_completo",                  jornada: "Cadastro Pádua 13/mai → unidade_id=15 → SELECT WHERE id=$1" },
  "{PRONOME_TRATAMENTO}":     { tabela: "pacientes",                                coluna: "pronome_tratamento",             jornada: "Preenchido pela enfermeira na anamnese inicial" },
  "{SAUDACAO}":               { tabela: "periodos_dia",                             coluna: "saudacao",                       jornada: "now()::time → match (janela_inicio,fim) → busca saudacao" },
  "{NOME_PERIODO}":           { tabela: "periodos_dia",                             coluna: "nome",                           jornada: "periodos_dia.sigla → nome (ex: IM → Início da Manhã)" },
  "{EMOJI_PERIODO}":          { tabela: "periodos_dia",                             coluna: "emoji",                          jornada: "periodos_dia.emoji por sigla" },
  "{JANELA_PERIODO}":         { tabela: "periodos_dia",                             coluna: "janela_inicio + janela_fim",     jornada: "concat das 2 colunas (TIME → string)" },
  "{ABERTURA_PERIODO}":       { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave=concat('abertura.', sigla)" },
  "{DIA_SEMANA}":             { tabela: "(runtime)",                                coluna: "—",                              jornada: "Date.getDay() → DIAS_SEMANA[i].label · TZ America/Sao_Paulo" },
  "{SEMANA_DO_MES}":          { tabela: "(runtime)",                                coluna: "—",                              jornada: "Math.ceil(dia/7) → SEMANAS_MES[i].frase" },
  "{LISTA_FORMULAS}":         { tabela: "itens_terapeuticos ⋈ revo_medicamentos",   coluna: "(loop)",                         jornada: "WHERE prescricao_id=$1 AND periodo=$2 → render por fórmula" },
  "{POSOLOGIA}":              { tabela: "itens_terapeuticos",                       coluna: "posologia_estruturada",          jornada: "Backfill Task #40 100% (13/mai) · 259/259 interpretados" },
  "{VIA}":                    { tabela: "itens_terapeuticos",                       coluna: "via_administracao",              jornada: "VO/EV/IM/SC/IMP" },
  "{HORARIO_DOSE}":           { tabela: "itens_terapeuticos",                       coluna: "horarios[]",                     jornada: "array TIME[] por dose individual" },
  "{DATA_AGENDAMENTO}":       { tabela: "agendamentos",                             coluna: "data_inicio::date",              jornada: "Agenda Motor → slot reservado (sync Google Calendar)" },
  "{HORA_AGENDAMENTO}":       { tabela: "agendamentos",                             coluna: "data_inicio::time",              jornada: "Agenda Motor → slot reservado" },
  "{NOME_PROCEDIMENTO}":      { tabela: "catalogo_procedimentos",                   coluna: "nome",                           jornada: "JOIN agendamentos.procedimento_id" },
  "{SALA}":                   { tabela: "salas",                                    coluna: "nome",                           jornada: "agendamentos.sala_id → salas.nome" },
  "{ENFERMEIRA}":             { tabela: "usuarios (perfil='enfermeira')",           coluna: "nome",                           jornada: "agendamentos.executor_id → usuarios" },
  "{DATA_ULTIMA_APLICACAO}":  { tabela: "procedimentos_executados",                 coluna: "data_execucao",                  jornada: "MAX(data_execucao) do paciente p/ este procedimento" },
  "{DATA_VENCIMENTO}":        { tabela: "procedimentos_executados + catalogo_procedimentos", coluna: "data_execucao + duracao_meses", jornada: "(data + duracao_meses) — 30 dias = data alerta" },
  "{DIAS_RESTANTES}":         { tabela: "(calc runtime)",                           coluna: "—",                              jornada: "vencimento - now() em dias (cron diário)" },
  "{NOME_FECHADORA}":         { tabela: "usuarios (perfil='fechadora')",            coluna: "nome",                           jornada: "task_cards.responsavel_id → usuarios" },
  "{STATUS_DR_CAIO}":         { tabela: "usuarios_status",                          coluna: "frase_atual",                    jornada: "Dr. Caio edita ao vivo no painel CEO — TTL 24h" },
  "{FALA_DR_CAIO}":           { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave LIKE 'fala_caio.%' ORDER BY RANDOM() LIMIT 1" },
  "{OBS_DOSE}":               { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave='obs.dose'" },
  "{ASSINATURA_BEATRIZ}":     { tabela: "catalogo_agentes",                         coluna: "assinatura_jsonb",               jornada: "agente='Beatriz Romanov' → assinatura completa (5 linhas)" },
  "{CARTA_ENCANTAMENTO}":     { tabela: "cartas_encantamento + cartas_encantamento_matriz", coluna: "texto + matriz[periodo][cenario]", jornada: "Ativa SE now()::date ∈ (data_inicio, data_fim) E matriz[sigla][cenario]=true" },
  "{SLOT_TOPO}":              { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='topo')",   jornada: "Agrega add-ons WHERE ativo=true AND posicao='topo' ORDER BY prioridade" },
  "{SLOT_MEIO}":              { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='meio')",   jornada: "Agrega add-ons WHERE ativo=true AND posicao='meio' ORDER BY prioridade" },
  "{SLOT_RODAPE}":            { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='rodape')", jornada: "Agrega add-ons WHERE ativo=true AND posicao='rodape' ORDER BY prioridade" },
};

// ═══════════════════════════════════════════════════════════════════════
// 🔤 PARSER INLINE · texto markdown → tokens p/ render JSX
// ═══════════════════════════════════════════════════════════════════════
export type InlineTokenTipo = "text" | "bold" | "italic" | "underline" | "strike" | "mono";
export type InlineToken = { tipo: InlineTokenTipo; texto: string };

export function parseInline(s: string): InlineToken[] {
  const out: InlineToken[] = [];
  let i = 0;
  const len = s.length;
  while (i < len) {
    if (s.startsWith("```", i)) {
      const end = s.indexOf("```", i + 3);
      if (end !== -1) { out.push({ tipo: "mono", texto: s.slice(i + 3, end) }); i = end + 3; continue; }
    }
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end !== -1 && end - i > 1) { out.push({ tipo: "mono", texto: s.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if (s.startsWith("__", i)) {
      const end = s.indexOf("__", i + 2);
      if (end !== -1) { out.push({ tipo: "underline", texto: s.slice(i + 2, end) }); i = end + 2; continue; }
    }
    if (s[i] === "*") {
      const end = s.indexOf("*", i + 1);
      if (end !== -1 && end - i > 1 && s[i + 1] !== " " && s[i + 1] !== "\n") {
        out.push({ tipo: "bold", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    if (s[i] === "_") {
      const end = s.indexOf("_", i + 1);
      if (end !== -1 && end - i > 1 && s[i + 1] !== " " && s[i + 1] !== "\n") {
        out.push({ tipo: "italic", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    if (s[i] === "~") {
      const end = s.indexOf("~", i + 1);
      if (end !== -1 && end - i > 1) {
        out.push({ tipo: "strike", texto: s.slice(i + 1, end) }); i = end + 1; continue;
      }
    }
    let j = i + 1;
    while (j < len && !"*_~`".includes(s[j])) j++;
    out.push({ tipo: "text", texto: s.slice(i, j) });
    i = j;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// 🔄 ADAPTADOR · texto canônico (WA) → formato do canal alvo
// Token-aware: walk parseInline output e renderiza por canal, escapando
// caracteres reservados APENAS dentro de segmentos de texto (não nos
// marcadores), evitando MarkdownV2 400-error em produção.
// ═══════════════════════════════════════════════════════════════════════

// MarkdownV2 — todos os reservados que devem ser escapados em TEXTO fora de marcadores
// ref: https://core.telegram.org/bots/api#markdownv2-style
const MV2_RESERVADOS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
function escMv2Texto(s: string): string { return s.replace(MV2_RESERVADOS, "\\$1"); }
// dentro de code/pre só `\` e `` ` `` precisam escape
function escMv2Code(s: string): string { return s.replace(/([`\\])/g, "\\$1"); }
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTokenWa(t: InlineToken): string {
  if (t.tipo === "underline") return t.texto; // WA não suporta
  return t.texto; // formato canônico já é WA
}
function renderTokenWaWrap(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return t.texto;
    case "bold":      return `*${t.texto}*`;
    case "italic":    return `_${t.texto}_`;
    case "strike":    return `~${t.texto}~`;
    case "mono":      return `\`${t.texto}\``;
    case "underline": return t.texto; // degrade
  }
}
function renderTokenMv2(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return escMv2Texto(t.texto);
    case "bold":      return `*${escMv2Texto(t.texto)}*`;
    case "italic":    return `_${escMv2Texto(t.texto)}_`;
    case "underline": return `__${escMv2Texto(t.texto)}__`;
    case "strike":    return `~${escMv2Texto(t.texto)}~`;
    case "mono":      return `\`${escMv2Code(t.texto)}\``;
  }
}
function renderTokenHtml(t: InlineToken): string {
  switch (t.tipo) {
    case "text":      return escHtml(t.texto);
    case "bold":      return `<b>${escHtml(t.texto)}</b>`;
    case "italic":    return `<i>${escHtml(t.texto)}</i>`;
    case "underline": return `<u>${escHtml(t.texto)}</u>`;
    case "strike":    return `<s>${escHtml(t.texto)}</s>`;
    case "mono":      return `<code>${escHtml(t.texto)}</code>`;
  }
}

export function adaptarParaCanal(texto: string, canal: Canal): string {
  const linhas = texto.split("\n");
  const render = canal === "telegram_mv2" ? renderTokenMv2
              : canal === "telegram_html" ? renderTokenHtml
              : renderTokenWaWrap;
  return linhas.map(l => parseInline(l).map(render).join("")).join("\n");
}

// Token degradado pra render JSX por canal: se o canal não suporta a
// formatação, vira "text" puro pra refletir a aparência REAL no destino.
export function tokenParaCanal(t: InlineToken, canal: Canal): InlineToken {
  const cap = CANAIS[canal].suporta;
  if (t.tipo === "bold"      && !cap.negrito)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "italic"    && !cap.italico)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "underline" && !cap.sublinhado) return { tipo: "text", texto: t.texto };
  if (t.tipo === "strike"    && !cap.tachado)    return { tipo: "text", texto: t.texto };
  if (t.tipo === "mono"      && !cap.mono)       return { tipo: "text", texto: t.texto };
  // suprimir variável não usada
  void renderTokenWa;
  return t;
}

// ═══════════════════════════════════════════════════════════════════════
// 🔬 MATRIZ DE PROVENIÊNCIA · cada placeholder/slot do template → fonte
// ═══════════════════════════════════════════════════════════════════════
export type LinhaProveniencia = {
  ordem: number;
  chave: string;
  resolvido: string;
  tabela: string;
  coluna: string;
  jornada: string;
  vazio: boolean;
  fonte_tipo: "placeholder" | "slot";
};

export function tracarProveniencia(
  template: string,
  resolver: (chave: string) => string,
): LinhaProveniencia[] {
  const matches = Array.from(template.matchAll(/\{[A-Z_]+\}/g));
  const seen = new Set<string>();
  const rows: LinhaProveniencia[] = [];
  let ord = 0;
  for (const m of matches) {
    const k = m[0];
    if (seen.has(k)) continue;
    seen.add(k);
    ord += 1;
    const meta = ORIGEM_DB_PLACEHOLDER[k];
    const val = resolver(k);
    rows.push({
      ordem: ord, chave: k,
      resolvido: (val || "").replace(/\n/g, " ⏎ ").slice(0, 80),
      tabela: meta?.tabela ?? "(sem mapeamento)",
      coluna: meta?.coluna ?? "—",
      jornada: meta?.jornada ?? "—",
      vazio: !val,
      fonte_tipo: k.startsWith("{SLOT_") ? "slot" : "placeholder",
    });
  }
  return rows;
}
