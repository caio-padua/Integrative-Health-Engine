// Espelho dos dados de produção (periodos_dia + mensagens_catalogo / seed Opus v3)
// para o canvas renderizar 1:1 a tela validada da Beatriz sem precisar do API server.

export type PeriodoDia = {
  sigla: "JE" | "IM" | "MM" | "AL" | "IT" | "MT" | "NO" | "FN" | "CE";
  chave: string;
  nome: string;
  emoji: string;
  cor_primary: string;
  cor_bg: string;
  cor_accent: string;
  janela_inicio: string;
  janela_fim: string;
  saudacao: string;
  abertura: string;
  desejo: string;
};

export const PERIODOS_DIA: PeriodoDia[] = [
  { sigla: "JE", chave: "jejum",        nome: "Jejum",            emoji: "🌑", cor_primary: "#d4a574", cor_bg: "#1f1810", cor_accent: "#f0c794", janela_inicio: "05:00", janela_fim: "06:59", saudacao: "Bom dia",   abertura: "Neste jejum matinal, seu organismo está no momento de maior biodisponibilidade — é quando cada ativo é absorvido com eficiência máxima.", desejo: "Quero lembrá-lo das fórmulas em *jejum* — o primeiro passo de um dia de alta performance clínica:" },
  { sigla: "IM", chave: "inicioManha",  nome: "Início da Manhã",  emoji: "🌅", cor_primary: "#f5b947", cor_bg: "#1f1a0a", cor_accent: "#ffd179", janela_inicio: "07:00", janela_fim: "08:59", saudacao: "Bom dia",   abertura: "Neste despertar da manhã, seu café e as fórmulas certas vão em sintonia — o começo do dia define o ritmo dos próximos.", desejo: "Quero lembrá-lo das fórmulas do *início da manhã*, para que sua disposição e seu metabolismo comecem fortes:" },
  { sigla: "MM", chave: "meioManha",    nome: "Meio da Manhã",    emoji: "☀️", cor_primary: "#f5d547", cor_bg: "#1f1d0a", cor_accent: "#ffe879", janela_inicio: "09:00", janela_fim: "10:59", saudacao: "Bom dia",   abertura: "Neste meio de manhã, quando o metabolismo já está ativo, é hora de entregar ao corpo os nutrientes certos.", desejo: "Quero lembrá-lo das fórmulas do *meio da manhã*, para manter foco e energia até o almoço:" },
  { sigla: "AL", chave: "almoco",       nome: "Almoço",           emoji: "🍽️", cor_primary: "#f57a47", cor_bg: "#1f1308", cor_accent: "#ff9a6b", janela_inicio: "11:00", janela_fim: "13:29", saudacao: "Boa tarde", abertura: "Neste momento do almoço, a refeição alimenta e as fórmulas somam — fecham a sinergia entre nutrição e protocolo.", desejo: "Quero lembrá-lo das fórmulas do *almoço*, para que absorção e digestão trabalhem juntas:" },
  { sigla: "IT", chave: "inicioTarde",  nome: "Início da Tarde",  emoji: "🌤️", cor_primary: "#e87a47", cor_bg: "#1e130a", cor_accent: "#ff9a68", janela_inicio: "13:30", janela_fim: "15:59", saudacao: "Boa tarde", abertura: "Neste início de tarde, quando a energia precisa se manter estável, as fórmulas deste horário são suporte essencial.", desejo: "Quero lembrá-lo das fórmulas do *início da tarde*, para sustentar seu rendimento:" },
  { sigla: "MT", chave: "meioTarde",    nome: "Meio da Tarde",    emoji: "🌆", cor_primary: "#d9663d", cor_bg: "#1d110a", cor_accent: "#f0855f", janela_inicio: "16:00", janela_fim: "17:59", saudacao: "Boa tarde", abertura: "Neste meio de tarde, momento estratégico para manter clareza mental — o senhor sustenta o ritmo com as fórmulas certas.", desejo: "Quero lembrá-lo das fórmulas do *meio da tarde*, para que a energia vá firme até o final do expediente:" },
  { sigla: "NO", chave: "inicioNoite",  nome: "Início da Noite",  emoji: "🌃", cor_primary: "#7a6bd9", cor_bg: "#14121e", cor_accent: "#9d8ff0", janela_inicio: "18:00", janela_fim: "19:59", saudacao: "Boa noite", abertura: "Neste início de noite, quando o corpo desacelera e prepara o descanso, as fórmulas auxiliam na transição metabólica.", desejo: "Quero lembrá-lo das fórmulas do *início da noite*, para uma transição suave para o repouso:" },
  { sigla: "FN", chave: "finalNoite",   nome: "Final da Noite",   emoji: "🌙", cor_primary: "#6b5fb0", cor_bg: "#11101c", cor_accent: "#8d82d9", janela_inicio: "20:00", janela_fim: "22:29", saudacao: "Boa noite", abertura: "Neste final de noite, momento precioso de preparação para o sono — quando o corpo entra em modo de reparação profunda.", desejo: "Quero lembrá-lo das fórmulas deste período, para uma noite de recuperação plena:" },
  { sigla: "CE", chave: "ceia",         nome: "Ceia",             emoji: "🦉", cor_primary: "#5b4e9b", cor_bg: "#0f0e1a", cor_accent: "#7d70bd", janela_inicio: "22:30", janela_fim: "23:59", saudacao: "Boa noite", abertura: "Nesta ceia do seu dia, última refeição antes do descanso — o corpo se prepara para horas de regeneração silenciosa.", desejo: "Quero lembrá-lo das fórmulas da *ceia*, para que o sono seja aliado da recuperação:" },
];

// Mapeia "07h" → "IM" pelo janela_inicio/janela_fim
export function horarioParaPeriodo(hh: string): PeriodoDia | null {
  // aceita "07h", "07h30", "08:00", "23h"
  const m = hh.match(/(\d{1,2})[h:]?(\d{2})?/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2] || "0", 10);
  const minutos = h * 60 + mn;
  for (const p of PERIODOS_DIA) {
    const [hi, mi] = p.janela_inicio.split(":").map(Number);
    const [hf, mf] = p.janela_fim.split(":").map(Number);
    const ini = hi * 60 + mi;
    const fim = hf * 60 + mf;
    if (minutos >= ini && minutos <= fim) return p;
  }
  return null;
}

// Frases do Dr. Caio + assinatura Beatriz + sábado, do seed Opus
export const DIAS_SEMANA = [
  { chave: "segunda", label: "Segunda-feira", frase: "Comece a semana com o pé direito — e com as fórmulas no horário certo." },
  { chave: "terca",   label: "Terça-feira",   frase: "Que sua terça-feira seja de alta performance — seu protocolo está desenhado para isso." },
  { chave: "quarta",  label: "Quarta-feira",  frase: "No meio da semana, consistência é o que faz a diferença." },
  { chave: "quinta",  label: "Quinta-feira",  frase: "Quinta-feira é dia de manter firme — falta pouco para fechar mais uma semana de conquistas." },
  { chave: "sexta",   label: "Sexta-feira",   frase: "Encerre a semana bem — desacelerar também faz parte do cuidado." },
  { chave: "sabado",  label: "Sábado",        frase: "Que este sábado santo traga descanso verdadeiro — corpo, mente e espírito em paz." },
  { chave: "domingo", label: "Domingo",       frase: "Um domingo bem cuidado é meia semana ganha." },
];

export const SEMANAS_MES = [
  { chave: "1", frase: "primeira semana do mês — o começo de um novo ciclo" },
  { chave: "2", frase: "segunda semana do mês — o ritmo já está construído" },
  { chave: "3", frase: "terceira semana — já na segunda metade do mês" },
  { chave: "4", frase: "última semana do mês — reta final de mais um ciclo bem conduzido" },
];

export const DR_CAIO_STATUS = [
  "O Dr. Caio está contente com sua evolução e acompanha cada passo do seu progresso.",
  "O Dr. Caio recebeu seus últimos relatórios com muita satisfação.",
  "O Dr. Caio valoriza muito a sua constância e acompanha seus resultados de perto.",
  "O Dr. Caio permanece muito satisfeito com a evolução do seu tratamento.",
];

export const DR_CAIO_FALAS = [
  {
    label: "Absorção & Idade",
    texto: "💬 *O Dr. Caio sempre reforça:* a gente não é o que come — a gente é o que *absorve*.\n\nCom o passar dos anos, o intestino perde eficiência, o estômago reduz a acidez e a absorção de nutrientes cai drasticamente. É por isso que a suplementação personalizada, nas doses certas e nos horários certos, é o que separa quem envelhece doente de quem envelhece bem.\n\nNa medicina convencional, só se trata o sintoma. Na medicina integrativa, a gente cuida da raiz — e o senhor já entendeu isso. Continue firme.",
  },
  {
    label: "Equilíbrio & Cura",
    texto: "💬 *O Dr. Caio sempre diz:* o corpo não adoece porque quer — ele adoece quando falta equilíbrio. E cura quando o equilíbrio volta.\n\nA medicina convencional espera o sintoma aparecer para agir. A medicina integrativa age todo dia para o sintoma *não aparecer*. Essa é a diferença.\n\nOs suplementos do seu protocolo não são opção — são estrutura. Cada fórmula no horário certo é um tijolo na casa da sua saúde.",
  },
  {
    label: "Constância & Protocolo",
    texto: "💬 *O Dr. Caio costuma dizer:* o melhor remédio da medicina integrativa é *constância + equilíbrio nutricional*.\n\nEnquanto a medicina convencional trata doença, a gente cultiva saúde. E saúde não se compra numa consulta — se constrói todo dia, dose por dose, horário por horário.",
  },
  {
    label: "Longevidade & Prevenção",
    texto: "💬 *O Dr. Caio sempre reforça:* envelhecer bem não é sorte — é projeto.\n\nNa medicina convencional, o paciente espera a doença para ir ao médico. Na medicina integrativa, o paciente cuida do corpo para nunca precisar.",
  },
];

export const OBS_DOSE = "⚠️ *Importante:* *dose* não é sempre igual a *1 cápsula*. Algumas fórmulas têm 2, 3 ou mais cápsulas por dose.\n\n🔎 *Confira sempre o rótulo* antes de tomar — ali está a quantidade certa.";

export const ASSINATURA_BEATRIZ = {
  saudacao_fechamento: "Com atenção clínica,",
  nome: "Beatriz Romanov",
  papel: "Assistente Farmacêutica",
  rodape_linha1: "PAWARDS MedCore®",
  rodape_subtitulo1: "Clinical Intelligence System",
  rodape_linha2: "PADCON Platform®",
  rodape_subtitulo2: "Advanced Systems Architecture",
};
